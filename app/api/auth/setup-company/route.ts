import { NextResponse } from "next/server";

import { prisma } from "@/lib/prisma";
import { createClient } from "@/lib/supabase/server";
import { withApi } from "@/lib/api-handler";
import { setupCompanySchema } from "@/lib/validations";
import { logger } from "@/lib/logger";

export const dynamic = "force-dynamic";

/**
 * Crée la Company + le User en base juste après l'inscription.
 *
 * Sécurité : l'identité (supabaseId + email) est dérivée de la **session validée
 * côté serveur** — `supabase.auth.getUser()` re-valide le JWT auprès de Supabase
 * (méthode sûre, pas `getSession()` qui ne fait que lire le cookie). On ne fait
 * donc **pas** confiance à un `userId` fourni par le client, et on ne dépend
 * **plus** de la clé `service_role` (plus d'API admin ici). Idempotent.
 *
 * Prérequis : une session doit exister au moment de l'appel → le formulaire
 * d'inscription établit la session (signIn) avant d'appeler cette route. Cela
 * suppose la **confirmation d'email désactivée** côté Supabase (sinon le signIn
 * échoue tant que l'email n'est pas confirmé).
 */
export const POST = withApi(async (request: Request) => {
  const { studioName, fullName } = setupCompanySchema.parse(
    await request.json()
  );

  // Source de vérité = session validée serveur (cookies).
  const supabase = createClient();
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  if (error || !user) {
    return NextResponse.json(
      { error: "Session requise. Reconnecte-toi puis réessaie.", code: "NO_SESSION" },
      { status: 401 }
    );
  }

  const supabaseId = user.id;
  const email = user.email;
  if (!email) {
    return NextResponse.json(
      { error: "Email manquant sur la session.", code: "NO_EMAIL" },
      { status: 400 }
    );
  }

  // Idempotence : déjà initialisé pour ce supabaseId → renvoie l'existant.
  const existing = await prisma.user.findUnique({ where: { supabaseId } });
  if (existing) {
    return NextResponse.json({
      companyId: existing.companyId,
      userId: existing.id,
    });
  }

  // Garde-fou : email déjà rattaché à un autre compte (User.email @unique).
  const byEmail = await prisma.user.findUnique({ where: { email } });
  if (byEmail) {
    return NextResponse.json(
      { error: "Cet email est déjà associé à un compte.", code: "EMAIL_TAKEN" },
      { status: 409 }
    );
  }

  // Crée Company + User + lien owner dans une transaction.
  const result = await prisma.$transaction(async (tx) => {
    const company = await tx.company.create({
      data: {
        name: studioName,
        plan: "FREE",
        primaryColor: "#52634c",
      },
    });

    const created = await tx.user.create({
      data: {
        supabaseId,
        email,
        name: fullName ?? null,
        companyId: company.id,
      },
    });

    await tx.company.update({
      where: { id: company.id },
      data: { ownerId: created.id },
    });

    return { companyId: company.id, userId: created.id };
  });

  logger.info("account_created", {
    companyId: result.companyId,
    userId: result.userId,
    email,
  });

  return NextResponse.json(result);
});
