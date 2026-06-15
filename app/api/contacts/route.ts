import { NextResponse } from "next/server";
import type { Prisma } from "@prisma/client";

import { prisma } from "@/lib/prisma";
import { getAuthedCompany } from "@/lib/auth";
import { checkLimit, planLimitErrorBody } from "@/lib/plan-limits";
import { withApi } from "@/lib/api-handler";
import { contactCreateSchema } from "@/lib/validations";
import { sanitizeNullable } from "@/lib/sanitize";
import { triggerAutomations } from "@/lib/automations/engine";

export const dynamic = "force-dynamic";

const CONTACT_STATUSES = ["LEAD", "PROSPECT", "CLIENT", "ARCHIVED"] as const;
type ContactStatus = (typeof CONTACT_STATUSES)[number];
const isStatus = (v: unknown): v is ContactStatus =>
  typeof v === "string" && CONTACT_STATUSES.includes(v as ContactStatus);

const CONTACT_SELECT = {
  id: true,
  firstName: true,
  lastName: true,
  email: true,
  phone: true,
  companyName: true,
  status: true,
  tags: true,
  createdAt: true,
  _count: { select: { projects: true, documents: true } },
} satisfies Prisma.ContactSelect;

// ───────────────────────── GET : liste ─────────────────────────
export const GET = withApi(async (request: Request) => {
  const { user, company } = await getAuthedCompany();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (!company) return NextResponse.json([]);

  const { searchParams } = new URL(request.url);
  const status = searchParams.get("status");
  const search = searchParams.get("search")?.trim();

  const where: Prisma.ContactWhereInput = { companyId: company.id };
  if (isStatus(status)) where.status = status;
  if (search) {
    where.OR = [
      { firstName: { contains: search, mode: "insensitive" } },
      { lastName: { contains: search, mode: "insensitive" } },
      { email: { contains: search, mode: "insensitive" } },
    ];
  }

  const contacts = await prisma.contact.findMany({
    where,
    orderBy: { createdAt: "desc" },
    select: CONTACT_SELECT,
  });

  return NextResponse.json(contacts);
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

  const data = contactCreateSchema.parse(await request.json());

  // Gating par plan : nombre de contacts (hors archivés).
  const limit = await checkLimit(company.id, "contacts", company.plan);
  if (!limit.allowed) {
    return NextResponse.json(
      planLimitErrorBody("contacts", company.plan, limit),
      { status: 403 }
    );
  }

  const contact = await prisma.contact.create({
    data: {
      companyId: company.id,
      firstName: data.firstName,
      lastName: data.lastName,
      email: data.email,
      phone: data.phone ?? null,
      companyName: data.companyName ?? null,
      address: data.address ?? null,
      notes: sanitizeNullable(data.notes),
      status: data.status ?? "LEAD",
      tags: data.tags ?? [],
    },
    select: CONTACT_SELECT,
  });

  // Automatisations : nouveau lead (seulement si le contact créé est LEAD).
  if (contact.status === "LEAD") {
    await triggerAutomations(company.id, "NEW_LEAD", { contactId: contact.id });
  }

  return NextResponse.json(contact, { status: 201 });
});
