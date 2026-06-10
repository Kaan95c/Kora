import { NextResponse } from "next/server";

import { prisma } from "@/lib/prisma";
import { getAuthedCompany } from "@/lib/auth";
import {
  AUTOMATION_SELECT,
  isTrigger,
  buildActionsCreate,
} from "@/lib/automations-server";
import { checkLimit, planLimitErrorBody } from "@/lib/plan-limits";

export const dynamic = "force-dynamic";

// ───────────────────────── GET : liste ─────────────────────────
export async function GET() {
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
}

// ───────────────────────── POST : création ─────────────────────────
export async function POST(request: Request) {
  const { user, company } = await getAuthedCompany();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (!company) {
    return NextResponse.json({ error: "No company" }, { status: 403 });
  }

  let body: {
    name?: string;
    description?: string;
    trigger?: string;
    isActive?: boolean;
    actions?: unknown;
  };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const name = body.name?.trim();
  if (!name) {
    return NextResponse.json({ error: "Name is required" }, { status: 400 });
  }
  if (!isTrigger(body.trigger)) {
    return NextResponse.json({ error: "Invalid trigger" }, { status: 400 });
  }

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
      name,
      description: body.description?.trim() || null,
      trigger: body.trigger,
      isActive: body.isActive ?? true,
      actions: { create: buildActionsCreate(body.actions) },
    },
    select: AUTOMATION_SELECT,
  });

  return NextResponse.json(automation, { status: 201 });
}
