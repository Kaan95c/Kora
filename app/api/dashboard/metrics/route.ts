import { NextResponse } from "next/server";

import { prisma } from "@/lib/prisma";
import { getAuthedCompany } from "@/lib/auth";

export const dynamic = "force-dynamic";

export async function GET() {
  const { user, company } = await getAuthedCompany();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (!company) {
    return NextResponse.json({
      monthlyRevenue: 0,
      revenueGrowth: 12,
      activeProjects: 0,
      projectsDueThisWeek: 0,
      pendingDocuments: 0,
      requireSignature: 0,
    });
  }

  const now = new Date();
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
  const monthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 1);
  const weekFromNow = new Date(now);
  weekFromNow.setDate(weekFromNow.getDate() + 7);

  const [
    paidThisMonth,
    activeProjects,
    projectsDueThisWeek,
    pendingDocuments,
    requireSignature,
  ] = await Promise.all([
    prisma.payment.aggregate({
      _sum: { amount: true },
      where: {
        companyId: company.id,
        status: "PAID",
        paidAt: { gte: monthStart, lt: monthEnd },
      },
    }),
    prisma.project.count({
      where: { companyId: company.id, status: "ACTIVE" },
    }),
    prisma.project.count({
      where: { companyId: company.id, endDate: { lt: weekFromNow } },
    }),
    prisma.document.count({
      where: { companyId: company.id, status: { in: ["SENT", "DRAFT"] } },
    }),
    prisma.document.count({
      where: { companyId: company.id, status: "SENT", signedAt: null },
    }),
  ]);

  return NextResponse.json({
    monthlyRevenue: paidThisMonth._sum.amount ?? 0,
    revenueGrowth: 12,
    activeProjects,
    projectsDueThisWeek,
    pendingDocuments,
    requireSignature,
  });
}
