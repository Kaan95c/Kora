import { NextResponse } from "next/server";

import { prisma } from "@/lib/prisma";
import { getAuthedCompany } from "@/lib/auth";
import { withApi } from "@/lib/api-handler";

export const dynamic = "force-dynamic";

export const GET = withApi(async () => {
  const { user, company } = await getAuthedCompany();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (!company) {
    return NextResponse.json({
      monthlyRevenue: 0,
      revenueGrowth: 0,
      activeProjects: 0,
      projectsDueThisWeek: 0,
      pendingDocuments: 0,
      requireSignature: 0,
    });
  }

  const now = new Date();
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
  const monthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 1);
  const prevMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1);
  const weekFromNow = new Date(now);
  weekFromNow.setDate(weekFromNow.getDate() + 7);

  const [
    paidThisMonth,
    paidPrevMonth,
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
    prisma.payment.aggregate({
      _sum: { amount: true },
      where: {
        companyId: company.id,
        status: "PAID",
        paidAt: { gte: prevMonthStart, lt: monthStart },
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

  // Croissance réelle mois courant vs précédent (division par zéro → +100% si
  // on part de 0 avec du revenu ce mois, sinon 0). Arrondi à 1 décimale.
  const current = paidThisMonth._sum.amount ?? 0;
  const prev = paidPrevMonth._sum.amount ?? 0;
  const revenueGrowth =
    prev === 0
      ? current > 0
        ? 100
        : 0
      : Math.round(((current - prev) / prev) * 1000) / 10;

  return NextResponse.json({
    monthlyRevenue: current,
    revenueGrowth,
    activeProjects,
    projectsDueThisWeek,
    pendingDocuments,
    requireSignature,
  });
});
