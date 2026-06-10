import { NextResponse } from "next/server";
import type { Prisma } from "@prisma/client";

import { prisma } from "@/lib/prisma";
import { getAuthedCompany } from "@/lib/auth";
import {
  AUTOMATION_SELECT,
  isTrigger,
  buildActionsCreate,
} from "@/lib/automations-server";

export const dynamic = "force-dynamic";

// ───────────────────────── PATCH : toggle isActive OU update complet ─────────────────────────
export async function PATCH(
  request: Request,
  { params }: { params: { id: string } }
) {
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

  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const data: Prisma.AutomationUpdateInput = {};

  if ("name" in body) {
    const v = typeof body.name === "string" ? body.name.trim() : "";
    if (!v) {
      return NextResponse.json({ error: "Name cannot be empty" }, { status: 400 });
    }
    data.name = v;
  }
  if ("description" in body) {
    data.description =
      typeof body.description === "string" && body.description.trim()
        ? body.description.trim()
        : null;
  }
  if ("trigger" in body) {
    if (!isTrigger(body.trigger)) {
      return NextResponse.json({ error: "Invalid trigger" }, { status: 400 });
    }
    data.trigger = body.trigger;
  }
  if ("isActive" in body && typeof body.isActive === "boolean") {
    data.isActive = body.isActive;
  }
  // Remplacement complet des actions si fournies.
  if ("actions" in body) {
    data.actions = {
      deleteMany: {},
      create: buildActionsCreate(body.actions),
    };
  }

  const updated = await prisma.automation.update({
    where: { id: params.id },
    data,
    select: AUTOMATION_SELECT,
  });

  return NextResponse.json(updated);
}

// ───────────────────────── DELETE ─────────────────────────
export async function DELETE(
  _request: Request,
  { params }: { params: { id: string } }
) {
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
}
