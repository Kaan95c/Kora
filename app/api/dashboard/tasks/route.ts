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

  const tasks = await prisma.task.findMany({
    where: {
      companyId: company.id,
      completed: false,
      priority: "HIGH",
    },
    orderBy: { createdAt: "asc" },
    select: {
      id: true,
      title: true,
      description: true,
      priority: true,
      project: { select: { name: true } },
    },
  });

  return NextResponse.json(tasks);
}
