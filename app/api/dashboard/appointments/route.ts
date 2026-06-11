import { NextResponse } from "next/server";

import { prisma } from "@/lib/prisma";
import { getAuthedCompany } from "@/lib/auth";
import { withApi } from "@/lib/api-handler";

export const dynamic = "force-dynamic";

export const GET = withApi(async (request: Request) => {
  const { searchParams } = new URL(request.url);
  const limitParam = searchParams.get("limit");
  const parsed = limitParam ? parseInt(limitParam, 10) : 3;
  const take = Number.isFinite(parsed) && parsed > 0 ? parsed : 3;

  const { user, company } = await getAuthedCompany();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (!company) return NextResponse.json([]);

  const appointments = await prisma.appointment.findMany({
    where: { companyId: company.id, startAt: { gt: new Date() } },
    orderBy: { startAt: "asc" },
    take,
    select: {
      id: true,
      title: true,
      startAt: true,
      endAt: true,
      notes: true,
    },
  });

  return NextResponse.json(appointments);
});
