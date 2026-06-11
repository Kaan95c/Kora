import { NextResponse } from "next/server";

import { prisma } from "@/lib/prisma";
import { getAuthedCompany } from "@/lib/auth";
import { withApi } from "@/lib/api-handler";
import { documentStatusSchema } from "@/lib/validations";

export const dynamic = "force-dynamic";

type RouteCtx = { params: { id: string } };

// ───────────────────── PATCH : changement de statut ─────────────────────
export const PATCH = withApi(async (request: Request, { params }: RouteCtx) => {
  const { user, company } = await getAuthedCompany();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (!company) {
    return NextResponse.json({ error: "No company" }, { status: 403 });
  }

  const { status } = documentStatusSchema.parse(await request.json());

  // updateMany scopé companyId → impossible de modifier le document d'une autre company.
  const updated = await prisma.document.updateMany({
    where: { id: params.id, companyId: company.id },
    data: {
      status,
      // Horodate la signature lors du passage à SIGNED.
      ...(status === "SIGNED" ? { signedAt: new Date() } : {}),
    },
  });

  if (updated.count === 0) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  return NextResponse.json({ id: params.id, status });
});

// ───────────────────────── DELETE : suppression ─────────────────────────
export const DELETE = withApi(async (_request: Request, { params }: RouteCtx) => {
  const { user, company } = await getAuthedCompany();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (!company) {
    return NextResponse.json({ error: "No company" }, { status: 403 });
  }

  const deleted = await prisma.document.deleteMany({
    where: { id: params.id, companyId: company.id },
  });

  if (deleted.count === 0) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  return NextResponse.json({ id: params.id, deleted: true });
});
