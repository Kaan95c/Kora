import { NextResponse } from "next/server";

import { prisma } from "@/lib/prisma";
import { getAuthedCompany } from "@/lib/auth";

export const dynamic = "force-dynamic";

const VALID_STATUSES = [
  "INQUIRY",
  "FOLLOW_UP",
  "BOOKING",
  "ACTIVE",
  "ARCHIVED",
] as const;
type ProjectStatus = (typeof VALID_STATUSES)[number];

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

  let body: { status?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const { status } = body;
  if (!status || !VALID_STATUSES.includes(status as ProjectStatus)) {
    return NextResponse.json({ error: "Invalid status" }, { status: 400 });
  }

  // updateMany scopé par companyId → empêche de modifier le projet d'une autre company.
  const updated = await prisma.project.updateMany({
    where: { id: params.id, companyId: company.id },
    data: { status: status as ProjectStatus },
  });

  if (updated.count === 0) {
    return NextResponse.json({ error: "Project not found" }, { status: 404 });
  }

  return NextResponse.json({ id: params.id, status });
}
