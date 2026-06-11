import { Ratelimit } from "@upstash/ratelimit";
import { Redis } from "@upstash/redis";
import * as Sentry from "@sentry/nextjs";

import { logger } from "@/lib/logger";

/**
 * Rate limiting par IP (sliding window) via Upstash Redis.
 *
 * ⚠️ Fail-open : sans `UPSTASH_REDIS_REST_URL` / `UPSTASH_REDIS_REST_TOKEN`
 * (dev local), aucune limite n'est appliquée → rien n'est bloqué. En cas
 * d'erreur réseau Upstash, on laisse aussi passer (disponibilité > strictesse).
 */

const url = process.env.UPSTASH_REDIS_REST_URL;
const token = process.env.UPSTASH_REDIS_REST_TOKEN;
const redis = url && token ? new Redis({ url, token }) : null;

function make(limit: number, prefix: string): Ratelimit | null {
  if (!redis) return null;
  return new Ratelimit({
    redis,
    limiter: Ratelimit.slidingWindow(limit, "60 s"),
    prefix,
    analytics: false,
  });
}

// Limites par catégorie (par minute, par IP).
const limiters = {
  auth: make(5, "rl:auth"),
  search: make(20, "rl:search"),
  payments: make(10, "rl:payments"),
  general: make(60, "rl:general"),
} as const;

export type RateScope = keyof typeof limiters;

/** Associe un chemin `/api/*` à sa catégorie de limite. */
export function scopeForPath(pathname: string): RateScope {
  if (pathname.startsWith("/api/auth/")) return "auth";
  if (pathname.startsWith("/api/search")) return "search";
  if (pathname.startsWith("/api/payments/")) return "payments";
  return "general";
}

export async function checkRateLimit(
  scope: RateScope,
  identifier: string
): Promise<{ ok: boolean; retryAfter: number }> {
  const limiter = limiters[scope];
  if (!limiter) return { ok: true, retryAfter: 0 }; // fail-open (non configuré)

  try {
    const { success, reset } = await limiter.limit(identifier);
    if (!success) {
      const retryAfter = Math.max(1, Math.ceil((reset - Date.now()) / 1000));
      logger.warn("rate_limit_exceeded", { scope, identifier, retryAfter });
      // Événement Sentry tagué → permet l'alerte « pic de rate limit »
      // (no-op sans DSN). Voir alerte Sentry filtrée sur kind=rate_limit.
      Sentry.captureMessage("rate_limit_exceeded", {
        level: "warning",
        tags: { kind: "rate_limit", scope },
      });
      return { ok: false, retryAfter };
    }
    return { ok: true, retryAfter: 0 };
  } catch (err) {
    // Upstash indisponible → fail-open (ne pas couper le service).
    logger.error("rate_limit_error", {
      scope,
      err: err instanceof Error ? err.message : String(err),
    });
    return { ok: true, retryAfter: 0 };
  }
}
