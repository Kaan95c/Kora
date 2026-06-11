import { NextResponse } from "next/server";
import type { Prisma } from "@prisma/client";

import { prisma } from "@/lib/prisma";
import { getAuthedCompany } from "@/lib/auth";
import { checkLimit, planLimitErrorBody } from "@/lib/plan-limits";
import { withApi } from "@/lib/api-handler";
import { projectCreateSchema } from "@/lib/validations";

export const dynamic = "force-dynamic";

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
export const GET = withApi(async () => {
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

  const data = projectCreateSchema.parse(await request.json());

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
  if (data.contactId) {
    const c = await prisma.contact.findFirst({
      where: { id: data.contactId, companyId: company.id },
      select: { id: true },
    });
    if (!c) {
      return NextResponse.json({ error: "Invalid contact" }, { status: 400 });
    }
    contactId = c.id;
  }

  let startDate: Date | null = null;
  if (data.startDate && data.startDate.trim() !== "") {
    const d = new Date(data.startDate);
    if (!Number.isNaN(d.getTime())) startDate = d;
  }

  const project = await prisma.project.create({
    data: {
      companyId: company.id,
      name: data.name,
      status: data.status ?? "ACTIVE",
      contactId,
      startDate,
    },
    select: SELECT,
  });

  return NextResponse.json(project, { status: 201 });
});
