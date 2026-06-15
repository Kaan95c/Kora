import { NextResponse } from "next/server";
import type { Prisma } from "@prisma/client";

import { prisma } from "@/lib/prisma";
import { getAuthedCompany } from "@/lib/auth";
import { withApi } from "@/lib/api-handler";
import { projectUpdateSchema } from "@/lib/validations";
import { sanitizeNullable } from "@/lib/sanitize";
import { triggerAutomations } from "@/lib/automations/engine";

export const dynamic = "force-dynamic";

const DETAIL_SELECT = {
  id: true,
  name: true,
  status: true,
  description: true,
  notes: true,
  totalAmount: true,
  paidAmount: true,
  startDate: true,
  endDate: true,
  contactId: true,
  contact: { select: { firstName: true, lastName: true, email: true } },
  documents: {
    select: {
      id: true,
      title: true,
      type: true,
      status: true,
      total: true,
      createdAt: true,
    },
    orderBy: { createdAt: "desc" },
  },
  tasks: {
    select: { id: true, title: true, completed: true, priority: true },
    orderBy: { createdAt: "asc" },
  },
} satisfies Prisma.ProjectSelect;

// ───────────────────────── GET : détail complet ─────────────────────────
export const GET = withApi(
  async (_request: Request, { params }: { params: { id: string } }) => {
    const { user, company } = await getAuthedCompany();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    if (!company) {
      return NextResponse.json({ error: "No company" }, { status: 403 });
    }

    const project = await prisma.project.findFirst({
      where: { id: params.id, companyId: company.id },
      select: DETAIL_SELECT,
    });

    if (!project) {
      return NextResponse.json({ error: "Project not found" }, { status: 404 });
    }

    return NextResponse.json(project);
  }
);

// ───────────────────────── PATCH : mise à jour partielle ─────────────────────────
export const PATCH = withApi(
  async (request: Request, { params }: { params: { id: string } }) => {
    const { user, company } = await getAuthedCompany();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    if (!company) {
      return NextResponse.json({ error: "No company" }, { status: 403 });
    }

    const body = projectUpdateSchema.parse(await request.json());

    const data: Prisma.ProjectUncheckedUpdateManyInput = {};

    if (body.name !== undefined) data.name = body.name;
    if (body.status !== undefined) data.status = body.status;
    if (body.description !== undefined)
      data.description = sanitizeNullable(body.description);
    if (body.notes !== undefined) data.notes = sanitizeNullable(body.notes);

    // Budget = totalAmount (number | string nettoyé).
    if (body.totalAmount !== undefined && body.totalAmount !== null) {
      const n =
        typeof body.totalAmount === "number"
          ? body.totalAmount
          : parseFloat(body.totalAmount);
      if (!Number.isNaN(n)) data.totalAmount = Math.max(0, n);
    }

    // Dates : "" → null, sinon Date valide.
    if (body.startDate !== undefined) {
      data.startDate = parseDate(body.startDate);
    }
    if (body.endDate !== undefined) {
      data.endDate = parseDate(body.endDate);
    }

    // Contact : null pour détacher, sinon validé anti cross-tenant.
    if (body.contactId !== undefined) {
      if (!body.contactId) {
        data.contactId = null;
      } else {
        const c = await prisma.contact.findFirst({
          where: { id: body.contactId, companyId: company.id },
          select: { id: true },
        });
        if (!c) {
          return NextResponse.json({ error: "Invalid contact" }, { status: 400 });
        }
        data.contactId = c.id;
      }
    }

    // Trigger PROJECT_STATUS_CHANGED : on lit le statut courant avant l'update
    // (uniquement si un nouveau statut est fourni) pour ne déclencher qu'en cas
    // de réel changement (pas sur une édition de nom/notes ni un drag sans effet).
    let previousStatus: string | null = null;
    if (body.status !== undefined) {
      const before = await prisma.project.findFirst({
        where: { id: params.id, companyId: company.id },
        select: { status: true },
      });
      previousStatus = before?.status ?? null;
    }

    // updateMany scopé par companyId → empêche de modifier un projet d'une autre company.
    const updated = await prisma.project.updateMany({
      where: { id: params.id, companyId: company.id },
      data,
    });

    if (updated.count === 0) {
      return NextResponse.json({ error: "Project not found" }, { status: 404 });
    }

    if (
      body.status !== undefined &&
      previousStatus !== null &&
      body.status !== previousStatus
    ) {
      await triggerAutomations(company.id, "PROJECT_STATUS_CHANGED", {
        projectId: params.id,
      });
    }

    return NextResponse.json({ id: params.id, ok: true });
  }
);

// ───────────────────────── DELETE : suppression ─────────────────────────
export const DELETE = withApi(
  async (_request: Request, { params }: { params: { id: string } }) => {
    const { user, company } = await getAuthedCompany();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    if (!company) {
      return NextResponse.json({ error: "No company" }, { status: 403 });
    }

    // documents/payments/tasks ont projectId onDelete: SetNull → pas de cascade destructrice.
    const deleted = await prisma.project.deleteMany({
      where: { id: params.id, companyId: company.id },
    });

    if (deleted.count === 0) {
      return NextResponse.json({ error: "Project not found" }, { status: 404 });
    }

    return NextResponse.json({ ok: true });
  }
);

function parseDate(value: string | null | undefined): Date | null {
  if (!value || value.trim() === "") return null;
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? null : d;
}
