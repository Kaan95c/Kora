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
// NB : la vraie protection brute-force du login vit chez Supabase (signIn/signUp
// vont directement à supabase.co, PAS par nos routes). Nos `/api/auth/*` ne sont
// que `me` (lecture) et `setup-company` (création de compte, idempotente) → un
// bucket à 5/min était trop strict et provoquait des 429 en prod.
const limiters = {
  auth: make(20, "rl:auth"),
  search: make(20, "rl:search"),
  payments: make(10, "rl:payments"),
  general: make(60, "rl:general"),
  // Landing publique `/` : 200/min/IP. Au-dessus de tout usage humain normal
  // (un visiteur ne recharge pas la home 200×/min), mais coupe les floods de
  // bots (cf. attaque ~671K requêtes sur `/` en quelques minutes).
  landing: make(200, "rl:landing"),
} as const;

export type RateScope = keyof typeof limiters;

/** Associe un chemin `/api/*` à sa catégorie de limite. */
export function scopeForPath(pathname: string): RateScope {
  // `/api/auth/me` est une simple lecture appelée par l'AuthProvider à chaque
  // chargement de page → bucket général (60/min), pas le bucket auth strict.
  if (pathname.startsWith("/api/auth/me")) return "general";
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

/* ----------------------------------------------------------------------------
 * Lockout progressif du login (anti brute-force).
 *
 * Suivi par IP ET par email (verrouillé si l'un OU l'autre l'est). Les échecs
 * s'accumulent sur une fenêtre de 24 h ; la durée du verrou croît par paliers.
 * Fail-open sans Upstash (dev local) — cohérent avec le reste du module.
 *
 * ⚠️ Enforcement coopératif côté client : le login Supabase se fait dans le
 * navigateur ; le client appelle /api/auth/login-guard autour de la tentative.
 * Le garde-fou contre l'abus direct de l'API Supabase reste le rate-limiting
 * natif de Supabase. Ce lockout couvre l'abus via notre UI + l'UX.
 * -------------------------------------------------------------------------- */

// Paliers (échecs cumulés → durée du verrou, en secondes), du plus haut au plus bas.
const LOGIN_LOCK_TIERS = [
  { attempts: 20, lockSec: 24 * 60 * 60 },
  { attempts: 10, lockSec: 30 * 60 },
  { attempts: 5, lockSec: 5 * 60 },
] as const;

// Fenêtre d'accumulation des échecs (assez longue pour atteindre le palier 20).
const LOGIN_FAIL_WINDOW_SEC = 24 * 60 * 60;

const failKey = (id: string) => `login:fail:${id}`;
const lockKey = (id: string) => `login:lock:${id}`;

/** Les deux identifiants suivis pour une tentative : par IP + par email normalisé. */
function loginIds(ip: string, email: string): string[] {
  return [`ip:${ip}`, `email:${email.trim().toLowerCase()}`];
}

export type LoginLockStatus = { locked: boolean; retryAfter: number };

/** Verrouillé si l'IP OU l'email a un verrou actif. `retryAfter` = secondes restantes (max). */
export async function checkLoginLock(
  ip: string,
  email: string
): Promise<LoginLockStatus> {
  if (!redis) return { locked: false, retryAfter: 0 }; // fail-open (non configuré)
  const r = redis;
  try {
    const ttls = await Promise.all(
      loginIds(ip, email).map((id) => r.ttl(lockKey(id)))
    );
    const retryAfter = Math.max(0, ...ttls.map((t) => (t > 0 ? t : 0)));
    return { locked: retryAfter > 0, retryAfter };
  } catch (err) {
    logger.error("login_lock_check_error", {
      err: err instanceof Error ? err.message : String(err),
    });
    return { locked: false, retryAfter: 0 }; // fail-open
  }
}

/**
 * Enregistre un échec de login (INCR par IP + email). Si un palier est franchi,
 * pose/rafraîchit le verrou correspondant. Renvoie l'état de verrou résultant.
 */
export async function recordLoginFailure(
  ip: string,
  email: string
): Promise<LoginLockStatus> {
  if (!redis) return { locked: false, retryAfter: 0 }; // fail-open
  const r = redis;
  try {
    let retryAfter = 0;
    for (const id of loginIds(ip, email)) {
      const count = await r.incr(failKey(id));
      if (count === 1) await r.expire(failKey(id), LOGIN_FAIL_WINDOW_SEC);
      const tier = LOGIN_LOCK_TIERS.find((t) => count >= t.attempts);
      if (tier) {
        await r.set(lockKey(id), "1", { ex: tier.lockSec });
        retryAfter = Math.max(retryAfter, tier.lockSec);
      }
    }
    if (retryAfter > 0) {
      logger.warn("login_locked", { ip, retryAfter });
      Sentry.captureMessage("login_locked", {
        level: "warning",
        tags: { kind: "login_lockout" },
      });
    }
    return { locked: retryAfter > 0, retryAfter };
  } catch (err) {
    logger.error("login_failure_record_error", {
      err: err instanceof Error ? err.message : String(err),
    });
    return { locked: false, retryAfter: 0 }; // fail-open
  }
}

/** Réinitialise compteurs + verrous (login réussi). */
export async function clearLoginFailures(
  ip: string,
  email: string
): Promise<void> {
  if (!redis) return;
  const r = redis;
  try {
    const keys = loginIds(ip, email).flatMap((id) => [
      failKey(id),
      lockKey(id),
    ]);
    await r.del(...keys);
  } catch (err) {
    logger.error("login_failure_clear_error", {
      err: err instanceof Error ? err.message : String(err),
    });
  }
}
