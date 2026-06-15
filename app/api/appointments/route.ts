import { NextResponse } from "next/server";
import type { Prisma } from "@prisma/client";

import { prisma } from "@/lib/prisma";
import { getAuthedCompany } from "@/lib/auth";
import { withApi } from "@/lib/api-handler";
import { appointmentCreateSchema } from "@/lib/validations";
import { sanitizeNullable } from "@/lib/sanitize";
import { triggerAutomations } from "@/lib/automations/engine";

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

function parseDate(v: string | null | undefined): Date | null {
  if (typeof v !== "string" || v.trim() === "") return null;
  const d = new Date(v);
  return Number.isNaN(d.getTime()) ? null : d;
}

// Vérifie qu'un id (contact / sessionType) appartient bien à la company.
async function belongsToCompany(
  model: "contact" | "sessionType",
  id: string,
  companyId: string
): Promise<boolean> {
  if (model === "contact") {
    return !!(await prisma.contact.findFirst({
      where: { id, companyId },
      select: { id: true },
    }));
  }
  return !!(await prisma.sessionType.findFirst({
    where: { id, companyId },
    select: { id: true },
  }));
}

// ───────────────────────── GET : liste ─────────────────────────
export const GET = withApi(async () => {
  const { user, company } = await getAuthedCompany();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (!company) return NextResponse.json([]);

  const appointments = await prisma.appointment.findMany({
    where: { companyId: company.id },
    orderBy: { startAt: "asc" },
    select: SELECT,
  });

  return NextResponse.json(appointments);
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

  const data = appointmentCreateSchema.parse(await request.json());

  const startAt = parseDate(data.startAt);
  if (!startAt) {
    return NextResponse.json(
      { error: "Valid start date is required" },
      { status: 400 }
    );
  }
  const endAt = parseDate(data.endAt);

  if (data.contactId) {
    if (!(await belongsToCompany("contact", data.contactId, company.id))) {
      return NextResponse.json({ error: "Invalid contact" }, { status: 400 });
    }
  }
  if (data.sessionTypeId) {
    if (
      !(await belongsToCompany("sessionType", data.sessionTypeId, company.id))
    ) {
      return NextResponse.json(
        { error: "Invalid session type" },
        { status: 400 }
      );
    }
  }

  const appointment = await prisma.appointment.create({
    data: {
      companyId: company.id,
      title: data.title,
      startAt,
      endAt: endAt && endAt > startAt ? endAt : null,
      notes: sanitizeNullable(data.notes),
      contactId: data.contactId || null,
      sessionTypeId: data.sessionTypeId || null,
    },
    select: SELECT,
  });

  // Automatisations : rendez-vous réservé.
  await triggerAutomations(company.id, "APPOINTMENT_BOOKED", {
    appointmentId: appointment.id,
    contactId: appointment.contactId,
  });

  return NextResponse.json(appointment, { status: 201 });
});
