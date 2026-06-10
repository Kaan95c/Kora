import { NextResponse } from "next/server";

import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

/**
 * Callback OAuth (Google) : échange le code contre une session, puis onboarding.
 *
 * Les comptes Google ne passent pas par le formulaire d'inscription
 * (`/api/auth/setup-company`) : si c'est le premier login (aucun `User` en base
 * rattaché à ce `supabaseId`), on crée ici la Company + le User (même logique
 * que setup-company), avec un nom de studio dérivé du profil Google.
 */
export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const next = searchParams.get("next") ?? "/dashboard";

  if (!code) {
    return NextResponse.redirect(`${origin}/login?error=oauth`);
  }

  const supabase = createClient();
  const { error } = await supabase.auth.exchangeCodeForSession(code);
  if (error) {
    return NextResponse.redirect(`${origin}/login?error=oauth`);
  }

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
        }
      }
    }
  } catch {
    // Onboarding en échec → l'utilisateur arrive connecté mais sans Company
    // (dashboard vide) plutôt que de bloquer la connexion.
  }

  return NextResponse.redirect(`${origin}${next}`);
}
