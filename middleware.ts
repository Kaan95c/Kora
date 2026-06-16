import { NextResponse, type NextRequest } from "next/server";

import { updateSession } from "@/lib/supabase/middleware";
import { corsHeaders } from "@/lib/cors";
import { buildCsp } from "@/lib/csp";
import { checkRateLimit, scopeForPath } from "@/lib/rate-limit";

// Routes (préfixes) qui exigent une session.
const PROTECTED_PREFIXES = [
  "/dashboard",
  "/onboarding",
  "/projects",
  "/contacts",
  "/documents",
  "/inbox",
  "/scheduler",
  "/finance",
  "/automations",
  "/settings",
];

const AUTH_PAGES = ["/login", "/register"];

/** IP du client (Vercel renseigne `request.ip` ; fallback x-forwarded-for). */
function clientIp(request: NextRequest): string {
  return (
    request.ip ??
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ??
    "anonymous"
  );
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // CORS preflight (OPTIONS) sur /api/* — court-circuite avant la session.
  if (pathname.startsWith("/api/") && request.method === "OPTIONS") {
    return new NextResponse(null, {
      status: 204,
      headers: corsHeaders(request.headers.get("origin")),
    });
  }

  // Rate limiting par IP sur /api/* (webhooks déjà hors matcher). Fail-open.
  if (pathname.startsWith("/api/")) {
    const { ok, retryAfter } = await checkRateLimit(
      scopeForPath(pathname),
      clientIp(request)
    );
    if (!ok) {
      return NextResponse.json(
        {
          error: "Trop de requêtes, réessaie dans un instant.",
          code: "RATE_LIMITED",
        },
        {
          status: 429,
          headers: {
            "Retry-After": String(retryAfter),
            ...corsHeaders(request.headers.get("origin")),
          },
        }
      );
    }
  }

  // Protection anti-bot de la landing publique : 200 GET/min/IP sur `/`. Placé
  // avant updateSession → un flood épargne aussi le getUser() Supabase. Fail-open
  // si Upstash n'est pas configuré (dev). Voir lib/rate-limit.ts (scope landing).
  if (pathname === "/" && request.method === "GET") {
    const { ok, retryAfter } = await checkRateLimit("landing", clientIp(request));
    if (!ok) {
      return new NextResponse("Too Many Requests", {
        status: 429,
        headers: { "Retry-After": String(retryAfter) },
      });
    }
  }

  // Nonce CSP unique par requête : injecté dans les headers de requête (pour
  // que Next nonce ses scripts) et posé sur la réponse (appliqué par le
  // navigateur). Voir lib/csp.ts.
  const nonce = Buffer.from(crypto.randomUUID()).toString("base64");
  const csp = buildCsp(nonce);

  const { supabaseResponse, user } = await updateSession(request, nonce, csp);
  supabaseResponse.headers.set("Content-Security-Policy", csp);

  const isProtected = PROTECTED_PREFIXES.some(
    (prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`)
  );
  const isAuthPage = AUTH_PAGES.includes(pathname);

  // Non connecté sur une route protégée → /login
  if (!user && isProtected) {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    const redirect = NextResponse.redirect(url);
    redirect.headers.set("Content-Security-Policy", csp);
    return redirect;
  }

  // Connecté sur login/register → /dashboard
  if (user && isAuthPage) {
    const url = request.nextUrl.clone();
    url.pathname = "/dashboard";
    const redirect = NextResponse.redirect(url);
    redirect.headers.set("Content-Security-Policy", csp);
    return redirect;
  }

  return supabaseResponse;
}

export const config = {
  matcher: [
    /*
     * Toutes les routes SAUF :
     * - les assets Next (_next/static, _next/image, favicon)
     * - /auth/callback (échange OAuth, doit rester public)
     * - /api/webhooks/* (webhooks externes, jamais touchés)
     * - les fichiers images statiques
     */
    "/((?!_next/static|_next/image|favicon.ico|auth/callback|api/webhooks|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)",
  ],
};
