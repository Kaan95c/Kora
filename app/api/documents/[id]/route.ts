import { NextResponse } from "next/server";

import { prisma } from "@/lib/prisma";
import { getAuthedCompany } from "@/lib/auth";

export const dynamic = "force-dynamic";

const STATUSES = ["DRAFT", "SENT", "SIGNED", "PAID"] as const;
type DocStatus = (typeof STATUSES)[number];
const isStatus = (v: unknown): v is DocStatus =>
  typeof v === "string" && STATUSES.includes(v as DocStatus);

// ───────────────────────── PATCH : changement de statut ─────────────────────────
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

  let body: { status?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  if (!isStatus(body.status)) {
    return NextResponse.json({ error: "Invalid status" }, { status: 400 });
  }
  const status = body.status;

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
}

// ───────────────────────── DELETE : suppression ─────────────────────────
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

  const deleted = await prisma.document.deleteMany({
    where: { id: params.id, companyId: company.id },
  });

  if (deleted.count === 0) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  return NextResponse.json({ id: params.id, deleted: true });
}
