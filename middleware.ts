import { NextResponse, type NextRequest } from "next/server";

import { updateSession } from "@/lib/supabase/middleware";
import { corsHeaders } from "@/lib/cors";
import { checkRateLimit, scopeForPath } from "@/lib/rate-limit";

// Routes (préfixes) qui exigent une session.
const PROTECTED_PREFIXES = [
  "/dashboard",
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
    const ip =
      request.ip ??
      request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ??
      "anonymous";
    const { ok, retryAfter } = await checkRateLimit(
      scopeForPath(pathname),
      ip
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

  const { supabaseResponse, user } = await updateSession(request);

  const isProtected = PROTECTED_PREFIXES.some(
    (prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`)
  );
  const isAuthPage = AUTH_PAGES.includes(pathname);

  // Non connecté sur une route protégée → /login
  if (!user && isProtected) {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    return NextResponse.redirect(url);
  }

  // Connecté sur login/register → /dashboard
  if (user && isAuthPage) {
    const url = request.nextUrl.clone();
    url.pathname = "/dashboard";
    return NextResponse.redirect(url);
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
