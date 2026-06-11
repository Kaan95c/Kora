import { NextResponse } from "next/server";

import { prisma } from "@/lib/prisma";
import { getAuthedCompany } from "@/lib/auth";
import { AUTOMATION_SELECT, buildActionsCreate } from "@/lib/automations-server";
import { checkLimit, planLimitErrorBody } from "@/lib/plan-limits";
import { withApi } from "@/lib/api-handler";
import { automationCreateSchema } from "@/lib/validations";
import { sanitizeNullable } from "@/lib/sanitize";

export const dynamic = "force-dynamic";

// ───────────────────────── GET : liste ─────────────────────────
export const GET = withApi(async () => {
  const { user, company } = await getAuthedCompany();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (!company) return NextResponse.json([]);

  const automations = await prisma.automation.findMany({
    where: { companyId: company.id },
    orderBy: { createdAt: "desc" },
    select: AUTOMATION_SELECT,
  });

  return NextResponse.json(automations);
});

// ───────────────────────── POST : création ─────────────────────────
export const POST = withApi(async (request: Request) => {
  const { user, company } = await getAuthedCompany();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (!company) {
    return NextResponse.json({ error: "No company" }, { status: 403 });
  }

  const data = automationCreateSchema.parse(await request.json());

  // Gating par plan : nombre d'automatisations (Free = 0 → toujours bloqué).
  const limit = await checkLimit(company.id, "automations", company.plan);
  if (!limit.allowed) {
    return NextResponse.json(
      planLimitErrorBody("automations", company.plan, limit),
      { status: 403 }
    );
  }

  const automation = await prisma.automation.create({
    data: {
      companyId: company.id,
      name: data.name,
      description: sanitizeNullable(data.description),
      trigger: data.trigger,
      isActive: data.isActive ?? true,
      actions: { create: buildActionsCreate(data.actions) },
    },
    select: AUTOMATION_SELECT,
  });

  return NextResponse.json(automation, { status: 201 });
});
