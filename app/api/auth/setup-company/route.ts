import { NextResponse } from "next/server";
import { createClient as createAdminClient } from "@supabase/supabase-js";

import { prisma } from "@/lib/prisma";
import { withApi } from "@/lib/api-handler";
import { setupCompanySchema } from "@/lib/validations";
import { logger } from "@/lib/logger";

export const dynamic = "force-dynamic";

/**
 * Crée la Company + le User en base juste après l'inscription Supabase.
 * Sécurité : on valide le userId reçu via l'API admin (service_role) avant
 * de créer quoi que ce soit, et on auto-confirme l'email pour ouvrir la
 * session immédiatement (flux trial). Idempotent.
 */
export const POST = withApi(async (request: Request) => {
  const { userId, fullName, studioName, email } = setupCompanySchema.parse(
    await request.json()
  );

  const admin = createAdminClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  );

  // 1. Valider que le user existe bien côté Supabase et correspond à l'email.
  //    NB : cette route ne dépend PAS de la session/cookies — elle valide le
  //    `userId` (issu de signUp) via l'API admin (service_role). Les 3 branches
  //    sont distinctes pour un diagnostic immédiat.
  const { data: userData, error: getErr } =
    await admin.auth.admin.getUserById(userId);

  if (getErr) {
    // Échec de l'appel admin → quasi toujours une SUPABASE_SERVICE_ROLE_KEY
    // absente/incorrecte, ou d'un projet ≠ NEXT_PUBLIC_SUPABASE_URL.
    logger.error("setup_company_admin_lookup_failed", {
      userId,
      error: getErr.message,
    });
    return NextResponse.json(
      {
        error: "Service d'authentification indisponible (clé service_role ?).",
        code: "ADMIN_LOOKUP_FAILED",
      },
      { status: 502 }
    );
  }
  if (!userData?.user) {
    logger.warn("setup_company_user_not_found", { userId });
    return NextResponse.json(
      { error: "Utilisateur introuvable.", code: "USER_NOT_FOUND" },
      { status: 400 }
    );
  }
  // Comparaison insensible à la casse (Supabase normalise l'email en minuscules).
  const supabaseEmail = userData.user.email?.trim().toLowerCase() ?? "";
  if (supabaseEmail !== email.trim().toLowerCase()) {
    logger.warn("setup_company_email_mismatch", { userId });
    return NextResponse.json(
      { error: "Email incohérent.", code: "EMAIL_MISMATCH" },
      { status: 400 }
    );
  }

  // 2. Auto-confirmer l'email pour permettre le login immédiat.
  if (!userData.user.email_confirmed_at) {
    await admin.auth.admin.updateUserById(userId, { email_confirm: true });
  }

  // 3. Idempotence : si déjà initialisé, renvoyer l'existant.
  const existing = await prisma.user.findUnique({
    where: { supabaseId: userId },
  });
  if (existing) {
    return NextResponse.json({
      companyId: existing.companyId,
      userId: existing.id,
    });
  }

  // 4. Créer Company + User + lien owner dans une transaction.
  const result = await prisma.$transaction(async (tx) => {
    const company = await tx.company.create({
      data: {
        name: studioName,
        plan: "FREE",
        primaryColor: "#52634c",
      },
    });

    const user = await tx.user.create({
      data: {
        supabaseId: userId,
        email,
        name: fullName ?? null,
        companyId: company.id,
      },
    });

    await tx.company.update({
      where: { id: company.id },
      data: { ownerId: user.id },
    });

    return { companyId: company.id, userId: user.id };
  });

  logger.info("account_created", {
    companyId: result.companyId,
    userId: result.userId,
    email,
  });

  return NextResponse.json(result);
});
