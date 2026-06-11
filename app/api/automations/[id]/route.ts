import { NextResponse } from "next/server";
import type { Prisma } from "@prisma/client";

import { prisma } from "@/lib/prisma";
import { getAuthedCompany } from "@/lib/auth";
import { AUTOMATION_SELECT, buildActionsCreate } from "@/lib/automations-server";
import { withApi } from "@/lib/api-handler";
import { automationPatchSchema } from "@/lib/validations";
import { sanitizeNullable } from "@/lib/sanitize";

export const dynamic = "force-dynamic";

type RouteCtx = { params: { id: string } };

// ──────────── PATCH : toggle isActive OU update complet ────────────
export const PATCH = withApi(async (request: Request, { params }: RouteCtx) => {
  const { user, company } = await getAuthedCompany();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (!company) {
    return NextResponse.json({ error: "No company" }, { status: 403 });
  }

  // Vérifie l'appartenance à la company avant tout.
  const existing = await prisma.automation.findFirst({
    where: { id: params.id, companyId: company.id },
    select: { id: true },
  });
  if (!existing) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const parsed = automationPatchSchema.parse(await request.json());

  const data: Prisma.AutomationUpdateInput = {};
  if (parsed.name !== undefined) data.name = parsed.name;
  if (parsed.description !== undefined)
    data.description = sanitizeNullable(parsed.description);
  if (parsed.trigger !== undefined) data.trigger = parsed.trigger;
  if (parsed.isActive !== undefined) data.isActive = parsed.isActive;
  // Remplacement complet des actions si fournies.
  if (parsed.actions !== undefined) {
    data.actions = {
      deleteMany: {},
      create: buildActionsCreate(parsed.actions),
    };
  }

  const updated = await prisma.automation.update({
    where: { id: params.id },
    data,
    select: AUTOMATION_SELECT,
  });

  return NextResponse.json(updated);
});

// ───────────────────────── DELETE ─────────────────────────
export const DELETE = withApi(async (_request: Request, { params }: RouteCtx) => {
  const { user, company } = await getAuthedCompany();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (!company) {
    return NextResponse.json({ error: "No company" }, { status: 403 });
  }

  // Scopé company ; les actions partent en cascade (onDelete: Cascade).
  const deleted = await prisma.automation.deleteMany({
    where: { id: params.id, companyId: company.id },
  });

  if (deleted.count === 0) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  return NextResponse.json({ id: params.id, deleted: true });
});
