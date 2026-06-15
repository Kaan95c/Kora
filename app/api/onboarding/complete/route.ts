import { NextResponse } from "next/server";

import { prisma } from "@/lib/prisma";
import { getAuthedCompany } from "@/lib/auth";
import { withApi } from "@/lib/api-handler";

export const dynamic = "force-dynamic";

/**
 * Marque l'onboarding de la company comme terminé (`onboardedAt = now()`).
 * Scopé companyId. Idempotent : ne réécrit pas une date déjà posée.
 * Appelé par le wizard `/onboarding` (dernière étape ou « Passer »).
 */
export const POST = withApi(async () => {
  const { user, company } = await getAuthedCompany();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (!company) {
    return NextResponse.json({ error: "No company" }, { status: 403 });
  }

  if (!company.onboardedAt) {
    await prisma.company.updateMany({
      where: { id: company.id, onboardedAt: null },
      data: { onboardedAt: new Date() },
    });
  }

  return NextResponse.json({ ok: true });
});
