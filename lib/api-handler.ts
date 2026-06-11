import { NextResponse } from "next/server";
import { ZodError } from "zod";

import { logger } from "@/lib/logger";
import { corsHeaders } from "@/lib/cors";

/**
 * Erreur applicative typée → status HTTP maîtrisé (pas un 500).
 * Ex. `throw unauthorized()` dans un handler.
 */
export class AppError extends Error {
  status: number;
  code: string;
  constructor(message: string, status = 400, code = "BAD_REQUEST") {
    super(message);
    this.name = "AppError";
    this.status = status;
    this.code = code;
  }
}

export const unauthorized = (msg = "Non authentifié.") =>
  new AppError(msg, 401, "UNAUTHORIZED");
export const forbidden = (msg = "Accès refusé.") =>
  new AppError(msg, 403, "FORBIDDEN");
export const notFound = (msg = "Ressource introuvable.") =>
  new AppError(msg, 404, "NOT_FOUND");
export const badRequest = (msg = "Requête invalide.") =>
  new AppError(msg, 400, "BAD_REQUEST");

type ErrorBody = {
  error: string;
  code?: string;
  fields?: Record<string, string>;
  detail?: string;
};

function toErrorResponse(err: unknown): { status: number; body: ErrorBody } {
  // Validation Zod → 400 détaillé par champ.
  if (err instanceof ZodError) {
    const fields: Record<string, string> = {};
    for (const issue of err.issues) {
      fields[issue.path.join(".") || "_"] = issue.message;
    }
    return {
      status: 400,
      body: { error: "Données invalides.", code: "VALIDATION_ERROR", fields },
    };
  }
  if (err instanceof AppError) {
    return { status: err.status, body: { error: err.message, code: err.code } };
  }
  // Inconnu → 500 générique. JAMAIS de stack trace en prod.
  const isProd = process.env.NODE_ENV === "production";
  return {
    status: 500,
    body: {
      error: "Une erreur est survenue. Réessaie dans un instant.",
      code: "INTERNAL_ERROR",
      ...(isProd
        ? {}
        : { detail: err instanceof Error ? err.stack : String(err) }),
    },
  };
}

/**
 * Enveloppe un handler de route App Router :
 * - try/catch centralisé (Zod 400, AppError, 500 générique sans stack en prod) ;
 * - préflight CORS (OPTIONS) ;
 * - headers CORS sur la réponse ;
 * - log structuré (method, path, status, durée).
 *
 * Le générique `C` préserve le type du contexte (`{ params }`) au call site.
 */
export function withApi<C = unknown>(
  handler: (req: Request, ctx: C) => Promise<Response> | Response
) {
  return async (req: Request, ctx: C): Promise<Response> => {
    const start = Date.now();
    const { pathname } = new URL(req.url);
    const origin = req.headers.get("origin");
    const cors = corsHeaders(origin);

    if (req.method === "OPTIONS") {
      return new Response(null, { status: 204, headers: cors });
    }

    try {
      const res = await handler(req, ctx);
      for (const [k, v] of Object.entries(cors)) res.headers.set(k, v);
      logger.info("api", {
        method: req.method,
        path: pathname,
        status: res.status,
        ms: Date.now() - start,
      });
      return res;
    } catch (err) {
      const { status, body } = toErrorResponse(err);
      if (status >= 500) {
        logger.error("api_error", {
          method: req.method,
          path: pathname,
          status,
          ms: Date.now() - start,
          err: err instanceof Error ? err.message : String(err),
        });
        // Sentry.captureException(err) — câblé en Phase 4.
      } else {
        logger.warn("api_client_error", {
          method: req.method,
          path: pathname,
          status,
        });
      }
      const res = NextResponse.json(body, { status });
      for (const [k, v] of Object.entries(cors)) res.headers.set(k, v);
      return res;
    }
  };
}
