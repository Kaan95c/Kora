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
  // 12 buckets : de 11 mois en arrière jusqu'au mois courant inclus.
  const buckets = Array.from({ length: 12 }, (_, i) => {
    const start = new Date(now.getFullYear(), now.getMonth() - 11 + i, 1);
    const end = new Date(now.getFullYear(), now.getMonth() - 11 + i + 1, 1);
    return { label: MONTH_LABELS[start.getMonth()], start, end };
  });

  const { user, company } = await getAuthedCompany();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (!company) {
    return NextResponse.json(
      buckets.map((b) => ({ month: b.label, amount: 0 }))
    );
  }

  const payments = await prisma.payment.findMany({
    where: {
      companyId: company.id,
      status: "PAID",
      paidAt: { gte: buckets[0].start, lt: buckets[11].end },
    },
    select: { amount: true, paidAt: true },
  });

  const data = buckets.map((b) => {
    const amount = payments.reduce((sum, p) => {
      if (p.paidAt && p.paidAt >= b.start && p.paidAt < b.end) {
        return sum + p.amount;
      }
      return sum;
    }, 0);
    return { month: b.label, amount };
  });

  return NextResponse.json(data);
}
