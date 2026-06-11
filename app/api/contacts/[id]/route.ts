import { NextResponse } from "next/server";
import type { Prisma } from "@prisma/client";

import { prisma } from "@/lib/prisma";
import { getAuthedCompany } from "@/lib/auth";
import { signClientToken, clientPortalPath } from "@/lib/client-portal";
import { hasClientPortal } from "@/lib/plan-limits";
import { withApi } from "@/lib/api-handler";
import { contactUpdateSchema } from "@/lib/validations";
import { sanitizeNullable } from "@/lib/sanitize";

export const dynamic = "force-dynamic";

type RouteCtx = { params: { id: string } };

/** Reconstruit l'origin de la requête (gère les proxys via x-forwarded-*). */
function requestOrigin(request: Request): string {
  const url = new URL(request.url);
  const proto =
    request.headers.get("x-forwarded-proto") ?? url.protocol.replace(":", "");
  const host =
    request.headers.get("x-forwarded-host") ??
    request.headers.get("host") ??
    url.host;
  return `${proto}://${host}`;
}

// ───────────────────────── GET : détail + relations ─────────────────────────
export const GET = withApi(async (request: Request, { params }: RouteCtx) => {
  const { user, company } = await getAuthedCompany();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (!company) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const contact = await prisma.contact.findFirst({
    where: { id: params.id, companyId: company.id },
    select: {
      id: true,
      firstName: true,
      lastName: true,
      email: true,
      phone: true,
      companyName: true,
      address: true,
      notes: true,
      status: true,
      tags: true,
      createdAt: true,
      projects: {
        orderBy: { createdAt: "desc" },
        select: {
          id: true,
          name: true,
          status: true,
          totalAmount: true,
          paidAmount: true,
          startDate: true,
          endDate: true,
        },
      },
      documents: {
        orderBy: { createdAt: "desc" },
        select: {
          id: true,
          title: true,
          number: true,
          type: true,
          status: true,
          total: true,
          createdAt: true,
        },
      },
    },
  });

  if (!contact) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  // Portail client = fonctionnalité gatée par plan (Free = désactivé).
  const clientPortal = hasClientPortal(company.plan);
  const portalUrl = clientPortal
    ? requestOrigin(request) + clientPortalPath(signClientToken(contact.id))
    : null;

  return NextResponse.json({ ...contact, portalUrl, clientPortal });
});

// ───────────────────────── PUT : édition (partielle) ─────────────────────────
export const PUT = withApi(async (request: Request, { params }: RouteCtx) => {
  const { user, company } = await getAuthedCompany();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (!company) {
    return NextResponse.json({ error: "No company" }, { status: 403 });
  }

  const parsed = contactUpdateSchema.parse(await request.json());

  // On ne met à jour que les champs explicitement fournis.
  const data: Prisma.ContactUpdateInput = {};
  if (parsed.firstName !== undefined) data.firstName = parsed.firstName;
  if (parsed.lastName !== undefined) data.lastName = parsed.lastName;
  if (parsed.email !== undefined) data.email = parsed.email;
  if (parsed.phone !== undefined) data.phone = parsed.phone ?? null;
  if (parsed.companyName !== undefined)
    data.companyName = parsed.companyName ?? null;
  if (parsed.address !== undefined) data.address = parsed.address ?? null;
  if (parsed.notes !== undefined) data.notes = sanitizeNullable(parsed.notes);
  if (parsed.status !== undefined) data.status = parsed.status;
  if (parsed.tags !== undefined) data.tags = parsed.tags;

  // updateMany scopé companyId → impossible de modifier le contact d'une autre company.
  const updated = await prisma.contact.updateMany({
    where: { id: params.id, companyId: company.id },
    data,
  });

  if (updated.count === 0) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const contact = await prisma.contact.findFirst({
    where: { id: params.id, companyId: company.id },
    select: {
      id: true,
      firstName: true,
      lastName: true,
      email: true,
      phone: true,
      companyName: true,
      address: true,
      notes: true,
      status: true,
      tags: true,
    },
  });

  return NextResponse.json(contact);
});

// ───────────────────── DELETE : soft-delete → ARCHIVED ─────────────────────
export const DELETE = withApi(async (_request: Request, { params }: RouteCtx) => {
  const { user, company } = await getAuthedCompany();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (!company) {
    return NextResponse.json({ error: "No company" }, { status: 403 });
  }

  const updated = await prisma.contact.updateMany({
    where: { id: params.id, companyId: company.id },
    data: { status: "ARCHIVED" },
  });

  if (updated.count === 0) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  return NextResponse.json({ id: params.id, status: "ARCHIVED" });
});
