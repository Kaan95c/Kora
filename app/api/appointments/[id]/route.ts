import { NextResponse } from "next/server";
import type { Prisma } from "@prisma/client";

import { prisma } from "@/lib/prisma";
import { getAuthedCompany } from "@/lib/auth";

export const dynamic = "force-dynamic";

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

function parseDate(v: unknown): Date | null {
  if (typeof v !== "string" || v.trim() === "") return null;
  const d = new Date(v);
  return Number.isNaN(d.getTime()) ? null : d;
}

// ───────────────────────── PUT : édition ─────────────────────────
export async function PUT(
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

  let body: {
    title?: string;
    startAt?: string;
    endAt?: string | null;
    notes?: string;
    contactId?: string | null;
    sessionTypeId?: string | null;
  };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const title = body.title?.trim();
  if (!title) {
    return NextResponse.json({ error: "Title is required" }, { status: 400 });
  }
  const startAt = parseDate(body.startAt);
  if (!startAt) {
    return NextResponse.json(
      { error: "Valid start date is required" },
      { status: 400 }
    );
  }
  const endAt = parseDate(body.endAt);

  // Validation cross-tenant des relations fournies.
  if (body.contactId) {
    const ok = await prisma.contact.findFirst({
      where: { id: body.contactId, companyId: company.id },
      select: { id: true },
    });
    if (!ok) {
      return NextResponse.json({ error: "Invalid contact" }, { status: 400 });
    }
  }
  if (body.sessionTypeId) {
    const ok = await prisma.sessionType.findFirst({
      where: { id: body.sessionTypeId, companyId: company.id },
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
      title,
      startAt,
      endAt: endAt && endAt > startAt ? endAt : null,
      notes: body.notes?.trim() || null,
      contactId: body.contactId || null,
      sessionTypeId: body.sessionTypeId || null,
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

  const deleted = await prisma.appointment.deleteMany({
    where: { id: params.id, companyId: company.id },
  });

  if (deleted.count === 0) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  return NextResponse.json({ id: params.id, deleted: true });
}
