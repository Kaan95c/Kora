import { NextResponse } from "next/server";

import { prisma } from "@/lib/prisma";
import { getAuthedCompany } from "@/lib/auth";

export const dynamic = "force-dynamic";

export async function GET() {
  const { user, company } = await getAuthedCompany();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (!company) return NextResponse.json([]);

  const projects = await prisma.project.findMany({
    where: { companyId: company.id },
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      name: true,
      status: true,
      totalAmount: true,
      paidAmount: true,
      startDate: true,
      endDate: true,
      contact: { select: { firstName: true, lastName: true, email: true } },
      _count: { select: { tasks: true, documents: true } },
    },
  });

  return NextResponse.json(projects);
}
