import { NextResponse } from "next/server";
import type { Prisma } from "@prisma/client";

import { prisma } from "@/lib/prisma";
import { getAuthedCompany } from "@/lib/auth";
import { checkLimit, planLimitErrorBody } from "@/lib/plan-limits";

export const dynamic = "force-dynamic";

const TYPES = ["INVOICE", "QUOTE", "CONTRACT", "PROPOSAL"] as const;
const STATUSES = ["DRAFT", "SENT", "SIGNED", "PAID"] as const;
type DocType = (typeof TYPES)[number];
type DocStatus = (typeof STATUSES)[number];

const isType = (v: unknown): v is DocType =>
  typeof v === "string" && TYPES.includes(v as DocType);
const isStatus = (v: unknown): v is DocStatus =>
  typeof v === "string" && STATUSES.includes(v as DocStatus);

const SELECT = {
  id: true,
  title: true,
  number: true,
  type: true,
  status: true,
  total: true,
  signedAt: true,
  createdAt: true,
  contactId: true,
  projectId: true,
  contact: { select: { firstName: true, lastName: true } },
  project: { select: { name: true } },
} satisfies Prisma.DocumentSelect;

// ───────────────────────── GET : liste ─────────────────────────
export async function GET(request: Request) {
  const { user, company } = await getAuthedCompany();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (!company) return NextResponse.json([]);

  const { searchParams } = new URL(request.url);
  const type = searchParams.get("type");
  const status = searchParams.get("status");
  const search = searchParams.get("search")?.trim();

  const where: Prisma.DocumentWhereInput = { companyId: company.id };
  if (isType(type)) where.type = type;
  if (isStatus(status)) where.status = status;
  if (search) {
    where.OR = [
      { title: { contains: search, mode: "insensitive" } },
      { number: { contains: search, mode: "insensitive" } },
    ];
  }

  const documents = await prisma.document.findMany({
    where,
    orderBy: { createdAt: "desc" },
    select: SELECT,
  });

  return NextResponse.json(documents);
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
    title?: string;
    number?: string;
    type?: string;
    status?: string;
    total?: unknown;
    contactId?: string | null;
    projectId?: string | null;
  };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const title = body.title?.trim();
  if (!title) {
    return NextResponse.json({ error: "Title is required" }, { status: 400 });
  }
  if (!isType(body.type)) {
    return NextResponse.json({ error: "Invalid type" }, { status: 400 });
  }
  const status: DocStatus = isStatus(body.status) ? body.status : "DRAFT";

  // Gating par plan : nombre de documents.
  const limit = await checkLimit(company.id, "documents", company.plan);
  if (!limit.allowed) {
    return NextResponse.json(
      planLimitErrorBody("documents", company.plan, limit),
      { status: 403 }
    );
  }

  // Montant : nombre, ou null si vide/invalide.
  let total: number | null = null;
  if (typeof body.total === "number" && Number.isFinite(body.total)) {
    total = body.total;
  } else if (typeof body.total === "string" && body.total.trim() !== "") {
    const n = Number(body.total);
    if (Number.isFinite(n)) total = n;
  }

  // Validation anti cross-tenant : le contact/projet doit appartenir à la company.
  let contactId: string | null = null;
  if (body.contactId) {
    const c = await prisma.contact.findFirst({
      where: { id: body.contactId, companyId: company.id },
      select: { id: true },
    });
    if (!c) {
      return NextResponse.json({ error: "Invalid contact" }, { status: 400 });
    }
    contactId = c.id;
  }

  let projectId: string | null = null;
  if (body.projectId) {
    const p = await prisma.project.findFirst({
      where: { id: body.projectId, companyId: company.id },
      select: { id: true },
    });
    if (!p) {
      return NextResponse.json({ error: "Invalid project" }, { status: 400 });
    }
    projectId = p.id;
  }

  const document = await prisma.document.create({
    data: {
      companyId: company.id,
      title,
      number: body.number?.trim() || null,
      type: body.type,
      status,
      total,
      signedAt: status === "SIGNED" ? new Date() : null,
      contactId,
      projectId,
    },
    select: SELECT,
  });

  return NextResponse.json(document, { status: 201 });
}
