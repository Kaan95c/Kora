import { NextResponse } from "next/server";

import { prisma } from "@/lib/prisma";
import { getAuthedCompany } from "@/lib/auth";

export const dynamic = "force-dynamic";

const MONTH_LABELS = [
  "Jan",
  "Feb",
  "Mar",
  "Apr",
  "May",
  "Jun",
  "Jul",
  "Aug",
  "Sep",
  "Oct",
  "Nov",
  "Dec",
];

export async function GET() {
  const now = new Date();
  // 6 buckets : des 5 mois précédents jusqu'au mois courant inclus.
  const buckets = Array.from({ length: 6 }, (_, i) => {
    const start = new Date(now.getFullYear(), now.getMonth() - 5 + i, 1);
    const end = new Date(now.getFullYear(), now.getMonth() - 5 + i + 1, 1);
    return { label: MONTH_LABELS[start.getMonth()], start, end };
  });
  const emptyChart = buckets.map((b) => ({
    month: b.label,
    collected: 0,
    expected: 0,
  }));

  const { user, company } = await getAuthedCompany();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (!company) {
    return NextResponse.json({
      totalRevenue: 0,
      totalRevenueGrowth: 0,
      outstandingAmount: 0,
      outstandingCount: 0,
      revenueChart: emptyChart,
      transactions: [],
    });
  }

  const payments = await prisma.payment.findMany({
    where: { companyId: company.id },
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      amount: true,
      status: true,
      method: true,
      paidAt: true,
      dueDate: true,
      createdAt: true,
      contact: { select: { firstName: true, lastName: true } },
    },
  });

  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
  const prevMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1);

  const paid = payments.filter((p) => p.status === "PAID");
  const pending = payments.filter((p) => p.status === "PENDING");

  const totalRevenue = paid.reduce((s, p) => s + p.amount, 0);

  const currentMonthPaid = paid
    .filter((p) => p.paidAt && p.paidAt >= monthStart)
    .reduce((s, p) => s + p.amount, 0);
  const prevMonthPaid = paid
    .filter((p) => p.paidAt && p.paidAt >= prevMonthStart && p.paidAt < monthStart)
    .reduce((s, p) => s + p.amount, 0);

  let totalRevenueGrowth: number;
  if (prevMonthPaid === 0) {
    totalRevenueGrowth = currentMonthPaid > 0 ? 100 : 0;
  } else {
    totalRevenueGrowth =
      Math.round(((currentMonthPaid - prevMonthPaid) / prevMonthPaid) * 1000) /
      10;
  }

  const outstandingAmount = pending.reduce((s, p) => s + p.amount, 0);
  const outstandingCount = pending.length;

  const revenueChart = buckets.map((b) => {
    const collected = paid
      .filter((p) => p.paidAt && p.paidAt >= b.start && p.paidAt < b.end)
      .reduce((s, p) => s + p.amount, 0);
    const expected = pending
      .filter((p) => p.dueDate && p.dueDate >= b.start && p.dueDate < b.end)
      .reduce((s, p) => s + p.amount, 0);
    return { month: b.label, collected, expected };
  });

  const transactions = payments
    .map((p) => ({
      id: p.id,
      date: p.paidAt ?? p.dueDate ?? p.createdAt,
      amount: p.amount,
      status: p.status,
      method: p.method,
      contact: p.contact,
    }))
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

  return NextResponse.json({
    totalRevenue,
    totalRevenueGrowth,
    outstandingAmount,
    outstandingCount,
    revenueChart,
    transactions,
  });
}
