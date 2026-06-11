import { NextResponse } from "next/server";

import { prisma } from "@/lib/prisma";
import { getAuthedCompany } from "@/lib/auth";
import { withApi } from "@/lib/api-handler";
import { sessionTypeCreateSchema } from "@/lib/validations";

export const dynamic = "force-dynamic";

const SELECT = {
  id: true,
  name: true,
  duration: true,
  color: true,
  price: true,
} as const;

function toPrice(v: number | string | null | undefined): number | null {
  if (typeof v === "number" && Number.isFinite(v)) return v;
  if (typeof v === "string" && v.trim() !== "") {
    const n = Number(v);
    if (Number.isFinite(n)) return n;
  }
  return null;
}

// ───────────────────────── GET : liste ─────────────────────────
export const GET = withApi(async () => {
  const { user, company } = await getAuthedCompany();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (!company) return NextResponse.json([]);

  const types = await prisma.sessionType.findMany({
    where: { companyId: company.id },
    orderBy: { createdAt: "asc" },
    select: SELECT,
  });

  return NextResponse.json(types);
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

  const data = sessionTypeCreateSchema.parse(await request.json());

  const type = await prisma.sessionType.create({
    data: {
      companyId: company.id,
      name: data.name,
      duration: Math.max(5, data.duration ?? 30),
      color: data.color ?? "#52634c",
      price: toPrice(data.price),
    },
    select: SELECT,
  });

  return NextResponse.json(type, { status: 201 });
});
