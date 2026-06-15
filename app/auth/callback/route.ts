import { createServerClient, type CookieOptions } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

import { prisma } from "@/lib/prisma";
import { logger } from "@/lib/logger";

export const dynamic = "force-dynamic";

/**
 * Callback OAuth (Google) : échange le code contre une session, puis onboarding.
 *
 * ⚠️ Cookies : on écrit la session dans un `cookieJar` puis on pose ces cookies
 * **explicitement sur la réponse de redirection** (et pas seulement via
 * `cookies()` de next/headers) — sinon les `Set-Cookie` ne sont pas garantis
 * d'être attachés au `NextResponse.redirect()`, et le navigateur arrive sur la
 * destination SANS session (→ retombe sur la landing / login). C'est le pattern
 * robuste recommandé par Supabase pour les Route Handlers qui redirigent.
 *
 * Redirection : on préfère le host public (`x-forwarded-host`, derrière le proxy
 * Vercel) à l'`origin` interne du déploiement.
 */
export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const next = searchParams.get("next") ?? "/dashboard";

  const isLocal = process.env.NODE_ENV === "development";
  const forwardedHost = request.headers.get("x-forwarded-host");
  const base = isLocal || !forwardedHost ? origin : `https://${forwardedHost}`;

  const cookieJar: { name: string; value: string; options: CookieOptions }[] =
    [];

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach((c) => cookieJar.push(c));
        },
      },
    }
  );

  // Redirige en posant les cookies de session collectés sur LA réponse renvoyée.
  function redirectTo(path: string) {
    const res = NextResponse.redirect(`${base}${path}`);
    for (const { name, value, options } of cookieJar) {
      res.cookies.set({ name, value, ...options });
    }
    return res;
  }

  if (!code) {
    return redirectTo("/login?error=oauth");
  }

  const { error } = await supabase.auth.exchangeCodeForSession(code);
  if (error) {
    logger.warn("oauth_exchange_failed", { error: error.message });
    return redirectTo("/login?error=oauth");
  }

  // Un nouveau compte (1er login Google) part vers le wizard d'onboarding ;
  // un compte existant (ou un reset de mot de passe via ?next=) garde `next`.
  let createdNewAccount = false;

  // Onboarding du compte OAuth (best-effort : ne doit jamais casser le flux
  // d'auth — la session est déjà établie par l'échange ci-dessus).
  try {
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (user?.email) {
      const email = user.email;
      const supabaseId = user.id;

      const existing = await prisma.user.findUnique({ where: { supabaseId } });

      // Garde-fou : `User.email` est @unique → si l'email est déjà rattaché à un
      // autre compte, on ne crée rien (évite une violation de contrainte).
      if (!existing) {
        const byEmail = await prisma.user.findUnique({ where: { email } });

        if (!byEmail) {
          const meta = (user.user_metadata ?? {}) as Record<string, unknown>;
          const fullName =
            typeof meta.full_name === "string" && meta.full_name.trim()
              ? meta.full_name.trim()
              : typeof meta.name === "string" && meta.name.trim()
                ? meta.name.trim()
                : null;
          const studioName = fullName
            ? `${fullName}'s Studio`
            : `${email.split("@")[0]}'s Studio`;

          await prisma.$transaction(async (tx) => {
            const company = await tx.company.create({
              data: { name: studioName, plan: "FREE", primaryColor: "#52634c" },
            });
            const created = await tx.user.create({
              data: {
                supabaseId,
                email,
                name: fullName,
                companyId: company.id,
              },
            });
            await tx.company.update({
              where: { id: company.id },
              data: { ownerId: created.id },
            });
          });

          createdNewAccount = true;
          logger.info("account_created", { email, via: "oauth" });
        }
      }
    }
  } catch {
    // Onboarding en échec → l'utilisateur arrive connecté mais sans Company
    // (dashboard vide) plutôt que de bloquer la connexion.
  }

  // Nouveau compte → wizard. Sinon (compte existant / reset password) → next.
  const target = createdNewAccount ? "/onboarding" : next;
  return redirectTo(target);
}
