import { NextResponse } from "next/server";
import type { Prisma } from "@prisma/client";

import { prisma } from "@/lib/prisma";
import { getAuthedCompany } from "@/lib/auth";
import { checkLimit, planLimitErrorBody } from "@/lib/plan-limits";

export const dynamic = "force-dynamic";

const PROJECT_STATUSES = [
  "INQUIRY",
  "FOLLOW_UP",
  "BOOKING",
  "ACTIVE",
  "ARCHIVED",
] as const;
type ProjectStatus = (typeof PROJECT_STATUSES)[number];
const isStatus = (v: unknown): v is ProjectStatus =>
  typeof v === "string" && PROJECT_STATUSES.includes(v as ProjectStatus);

const SELECT = {
  id: true,
  name: true,
  status: true,
  totalAmount: true,
  paidAmount: true,
  startDate: true,
  endDate: true,
  contact: { select: { firstName: true, lastName: true, email: true } },
  _count: { select: { tasks: true, documents: true } },
} satisfies Prisma.ProjectSelect;

// ───────────────────────── GET : liste ─────────────────────────
export async function GET() {
  const { user, company } = await getAuthedCompany();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (!company) return NextResponse.json([]);

  const projects = await prisma.project.findMany({
    where: { companyId: company.id },
    orderBy: { createdAt: "desc" },
    select: SELECT,
  });

  return NextResponse.json(projects);
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
    contactId?: string | null;
    status?: string;
    startDate?: string | null;
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

  // Gating par plan : nombre de projets.
  const limit = await checkLimit(company.id, "projects", company.plan);
  if (!limit.allowed) {
    return NextResponse.json(
      planLimitErrorBody("projects", company.plan, limit),
      { status: 403 }
    );
  }

  // Contact optionnel, validé anti cross-tenant.
  let contactId: string | null = null;
  if (body.contactId) {
    const c = await prisma.contact.findFirst({
      where: { id: body.contactId, companyId: company.id },
      select: { id: true },
    });
    if (!c) {
      return NextResponse.json({ error: "Invalid contact" }, { status: 400 });
    }
    contactId = c.id;
  }

  const status: ProjectStatus = isStatus(body.status) ? body.status : "ACTIVE";

  let startDate: Date | null = null;
  if (typeof body.startDate === "string" && body.startDate.trim() !== "") {
    const d = new Date(body.startDate);
    if (!Number.isNaN(d.getTime())) startDate = d;
  }

  const project = await prisma.project.create({
    data: {
      companyId: company.id,
      name,
      status,
      contactId,
      startDate,
    },
    select: SELECT,
  });

  return NextResponse.json(project, { status: 201 });
}
