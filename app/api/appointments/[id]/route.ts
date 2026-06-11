import { NextResponse } from "next/server";
import type { Prisma } from "@prisma/client";

import { prisma } from "@/lib/prisma";
import { getAuthedCompany } from "@/lib/auth";
import { withApi } from "@/lib/api-handler";
import { appointmentCreateSchema } from "@/lib/validations";
import { sanitizeNullable } from "@/lib/sanitize";

export const dynamic = "force-dynamic";

type RouteCtx = { params: { id: string } };

const SELECT = {
  id: true,
  title: true,
  startAt: true,
  endAt: true,
  notes: true,
  contactId: true,
  sessionTypeId: true,
  contact: { select: { firstName: true, lastName: true } },
  sessionType: { select: { name: true, color: true } },
} satisfies Prisma.AppointmentSelect;

function parseDate(v: string | null | undefined): Date | null {
  if (typeof v !== "string" || v.trim() === "") return null;
  const d = new Date(v);
  return Number.isNaN(d.getTime()) ? null : d;
}

// ───────────────────────── PUT : édition ─────────────────────────
export const PUT = withApi(async (request: Request, { params }: RouteCtx) => {
  const { user, company } = await getAuthedCompany();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (!company) {
    return NextResponse.json({ error: "No company" }, { status: 403 });
  }

  const data = appointmentCreateSchema.parse(await request.json());

  const startAt = parseDate(data.startAt);
  if (!startAt) {
    return NextResponse.json(
      { error: "Valid start date is required" },
      { status: 400 }
    );
  }
  const endAt = parseDate(data.endAt);

  // Validation cross-tenant des relations fournies.
  if (data.contactId) {
    const ok = await prisma.contact.findFirst({
      where: { id: data.contactId, companyId: company.id },
      select: { id: true },
    });
    if (!ok) {
      return NextResponse.json({ error: "Invalid contact" }, { status: 400 });
    }
  }
  if (data.sessionTypeId) {
    const ok = await prisma.sessionType.findFirst({
      where: { id: data.sessionTypeId, companyId: company.id },
      select: { id: true },
    });
    if (!ok) {
      return NextResponse.json(
        { error: "Invalid session type" },
        { status: 400 }
      );
    }
  }

  const updated = await prisma.appointment.updateMany({
    where: { id: params.id, companyId: company.id },
    data: {
      title: data.title,
      startAt,
      endAt: endAt && endAt > startAt ? endAt : null,
      notes: sanitizeNullable(data.notes),
      contactId: data.contactId || null,
      sessionTypeId: data.sessionTypeId || null,
    },
  });

  if (updated.count === 0) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const appointment = await prisma.appointment.findFirst({
    where: { id: params.id, companyId: company.id },
    select: SELECT,
  });

  return NextResponse.json(appointment);
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

  const deleted = await prisma.appointment.deleteMany({
    where: { id: params.id, companyId: company.id },
  });

  if (deleted.count === 0) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  return NextResponse.json({ id: params.id, deleted: true });
});
