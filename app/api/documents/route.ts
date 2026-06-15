import { NextResponse } from "next/server";
import type { Prisma } from "@prisma/client";

import { prisma } from "@/lib/prisma";
import { getAuthedCompany } from "@/lib/auth";
import { checkLimit, planLimitErrorBody } from "@/lib/plan-limits";
import { withApi } from "@/lib/api-handler";
import { documentCreateSchema } from "@/lib/validations";
import { triggerAutomations } from "@/lib/automations/engine";

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
export const GET = withApi(async (request: Request) => {
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

  const data = documentCreateSchema.parse(await request.json());
  const status: DocStatus = data.status ?? "DRAFT";

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
  if (typeof data.total === "number" && Number.isFinite(data.total)) {
    total = data.total;
  } else if (typeof data.total === "string" && data.total.trim() !== "") {
    const n = Number(data.total);
    if (Number.isFinite(n)) total = n;
  }

  // Validation anti cross-tenant : le contact/projet doit appartenir à la company.
  let contactId: string | null = null;
  if (data.contactId) {
    const c = await prisma.contact.findFirst({
      where: { id: data.contactId, companyId: company.id },
      select: { id: true },
    });
    if (!c) {
      return NextResponse.json({ error: "Invalid contact" }, { status: 400 });
    }
    contactId = c.id;
  }

  let projectId: string | null = null;
  if (data.projectId) {
    const p = await prisma.project.findFirst({
      where: { id: data.projectId, companyId: company.id },
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
      title: data.title,
      number: data.number ?? null,
      type: data.type,
      status,
      total,
      signedAt: status === "SIGNED" ? new Date() : null,
      contactId,
      projectId,
    },
    select: SELECT,
  });

  // Automatisations : facture envoyée (uniquement à la création d'une INVOICE).
  if (document.type === "INVOICE") {
    await triggerAutomations(company.id, "INVOICE_SENT", {
      documentId: document.id,
      contactId,
      projectId,
    });
  }

  return NextResponse.json(document, { status: 201 });
});
