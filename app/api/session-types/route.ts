import { NextResponse } from "next/server";

import { prisma } from "@/lib/prisma";
import { getAuthedCompany } from "@/lib/auth";

export const dynamic = "force-dynamic";

const SELECT = {
  id: true,
  name: true,
  duration: true,
  color: true,
  price: true,
} as const;

function toInt(v: unknown, fallback: number): number {
  if (typeof v === "number" && Number.isFinite(v)) return Math.round(v);
  if (typeof v === "string" && v.trim() !== "") {
    const n = Number(v);
    if (Number.isFinite(n)) return Math.round(n);
  }
  return fallback;
}

function toPrice(v: unknown): number | null {
  if (typeof v === "number" && Number.isFinite(v)) return v;
  if (typeof v === "string" && v.trim() !== "") {
    const n = Number(v);
    if (Number.isFinite(n)) return n;
  }
  return null;
}

// ───────────────────────── GET : liste ─────────────────────────
export async function GET() {
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
}

// ───────────────────────── POST : création ─────────────────────────
export async function POST(request: Request) {
  const { user, company } = await getAuthedCompany();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (!company) {
    return NextResponse.json({ error: "No company" }, { status: 403 });
  }

  let body: {
    name?: string;
    duration?: unknown;
    color?: string;
    price?: unknown;
  };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const name = body.name?.trim();
  if (!name) {
    return NextResponse.json({ error: "Name is required" }, { status: 400 });
  }

  const type = await prisma.sessionType.create({
    data: {
      companyId: company.id,
      name,
      duration: Math.max(5, toInt(body.duration, 30)),
      color: typeof body.color === "string" && body.color ? body.color : "#52634c",
      price: toPrice(body.price),
    },
    select: SELECT,
  });

  return NextResponse.json(type, { status: 201 });
}
