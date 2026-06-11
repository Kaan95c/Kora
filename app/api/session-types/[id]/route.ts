import { NextResponse } from "next/server";
import type { Prisma } from "@prisma/client";

import { prisma } from "@/lib/prisma";
import { getAuthedCompany } from "@/lib/auth";
import { withApi } from "@/lib/api-handler";
import { sessionTypeUpdateSchema } from "@/lib/validations";

export const dynamic = "force-dynamic";

type RouteCtx = { params: { id: string } };

// ───────────────────────── PATCH : édition ─────────────────────────
export const PATCH = withApi(async (request: Request, { params }: RouteCtx) => {
  const { user, company } = await getAuthedCompany();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (!company) {
    return NextResponse.json({ error: "No company" }, { status: 403 });
  }

  const parsed = sessionTypeUpdateSchema.parse(await request.json());

  const data: Prisma.SessionTypeUpdateInput = {};
  if (parsed.name !== undefined) data.name = parsed.name;
  if (parsed.duration !== undefined) data.duration = Math.max(5, parsed.duration);
  if (parsed.color !== undefined) data.color = parsed.color;
  if (parsed.price !== undefined) {
    const n =
      typeof parsed.price === "number" ? parsed.price : Number(parsed.price);
    data.price =
      parsed.price === null || parsed.price === "" || !Number.isFinite(n)
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
});

// ───────────────────────── DELETE ─────────────────────────
export const DELETE = withApi(async (_request: Request, { params }: RouteCtx) => {
  const { user, company } = await getAuthedCompany();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (!company) {
    return NextResponse.json({ error: "No company" }, { status: 403 });
  }

  // onDelete: SetNull → les appointments liés gardent leur créneau.
  const deleted = await prisma.sessionType.deleteMany({
    where: { id: params.id, companyId: company.id },
  });

  if (deleted.count === 0) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  return NextResponse.json({ id: params.id, deleted: true });
});
