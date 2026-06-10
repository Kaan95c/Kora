import { NextResponse } from "next/server";
import type { Prisma } from "@prisma/client";

import { prisma } from "@/lib/prisma";
import { getAuthedCompany } from "@/lib/auth";

export const dynamic = "force-dynamic";

// ───────────────────────── PATCH : édition ─────────────────────────
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

  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const data: Prisma.SessionTypeUpdateInput = {};
  if ("name" in body) {
    const v = typeof body.name === "string" ? body.name.trim() : "";
    if (!v) {
      return NextResponse.json(
        { error: "Name cannot be empty" },
        { status: 400 }
      );
    }
    data.name = v;
  }
  if ("duration" in body) {
    const n = Number(body.duration);
    if (Number.isFinite(n)) data.duration = Math.max(5, Math.round(n));
  }
  if ("color" in body && typeof body.color === "string" && body.color) {
    data.color = body.color;
  }
  if ("price" in body) {
    const n = Number(body.price);
    data.price =
      body.price === null || body.price === "" || !Number.isFinite(n)
        ? null
        : n;
  }

  const updated = await prisma.sessionType.updateMany({
    where: { id: params.id, companyId: company.id },
    data,
  });

  if (updated.count === 0) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  return NextResponse.json({ id: params.id, ...data });
}

// ───────────────────────── DELETE ─────────────────────────
export async function DELETE(
  _request: Request,
  { params }: { params: { id: string } }
) {
  const { user, company } = await getAuthedCompany();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (!company) {
    return NextResponse.json({ error: "No company" }, { status: 403 });
  }

  // onDelete: SetNull → les appointments liés gardent leur créneau (sessionTypeId = null).
  const deleted = await prisma.sessionType.deleteMany({
    where: { id: params.id, companyId: company.id },
  });

  if (deleted.count === 0) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  return NextResponse.json({ id: params.id, deleted: true });
}
