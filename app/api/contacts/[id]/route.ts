import { NextResponse } from "next/server";
import type { Prisma } from "@prisma/client";

import { prisma } from "@/lib/prisma";
import { getAuthedCompany } from "@/lib/auth";
import { signClientToken, clientPortalPath } from "@/lib/client-portal";

export const dynamic = "force-dynamic";

/** Reconstruit l'origin de la requête (gère les proxys via x-forwarded-*). */
function requestOrigin(request: Request): string {
  const url = new URL(request.url);
  const proto = request.headers.get("x-forwarded-proto") ?? url.protocol.replace(":", "");
  const host =
    request.headers.get("x-forwarded-host") ?? request.headers.get("host") ?? url.host;
  return `${proto}://${host}`;
}

const CONTACT_STATUSES = ["LEAD", "PROSPECT", "CLIENT", "ARCHIVED"] as const;
type ContactStatus = (typeof CONTACT_STATUSES)[number];

const isStatus = (v: unknown): v is ContactStatus =>
  typeof v === "string" && CONTACT_STATUSES.includes(v as ContactStatus);

// ───────────────────────── GET : détail + relations ─────────────────────────
export async function GET(
  request: Request,
  { params }: { params: { id: string } }
) {
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

  // Lien du portail client (token signé, stateless — voir lib/client-portal).
  const portalUrl =
    requestOrigin(request) + clientPortalPath(signClientToken(contact.id));

  return NextResponse.json({ ...contact, portalUrl });
}

// ───────────────────────── PUT : édition ─────────────────────────
export async function PUT(
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

  // On ne met à jour que les champs explicitement fournis (PUT partiel possible
  // depuis les onglets Infos / Notes / tags).
  const data: Prisma.ContactUpdateInput = {};

  const str = (v: unknown) =>
    typeof v === "string" ? v.trim() || null : undefined;

  if ("firstName" in body) {
    const v = typeof body.firstName === "string" ? body.firstName.trim() : "";
    if (!v) {
      return NextResponse.json(
        { error: "firstName cannot be empty" },
        { status: 400 }
      );
    }
    data.firstName = v;
  }
  if ("lastName" in body) {
    const v = typeof body.lastName === "string" ? body.lastName.trim() : "";
    if (!v) {
      return NextResponse.json(
        { error: "lastName cannot be empty" },
        { status: 400 }
      );
    }
    data.lastName = v;
  }
  if ("email" in body) {
    const v = typeof body.email === "string" ? body.email.trim() : "";
    if (!v) {
      return NextResponse.json(
        { error: "email cannot be empty" },
        { status: 400 }
      );
    }
    data.email = v;
  }
  if ("phone" in body) data.phone = str(body.phone);
  if ("companyName" in body) data.companyName = str(body.companyName);
  if ("address" in body) data.address = str(body.address);
  if ("notes" in body) data.notes = str(body.notes);
  if ("status" in body) {
    if (!isStatus(body.status)) {
      return NextResponse.json({ error: "Invalid status" }, { status: 400 });
    }
    data.status = body.status;
  }
  if ("tags" in body) {
    data.tags = Array.isArray(body.tags)
      ? body.tags.filter(
          (t): t is string => typeof t === "string" && t.trim() !== ""
        )
      : [];
  }

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
}

// ───────────────────────── DELETE : soft-delete → ARCHIVED ─────────────────────────
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

  const updated = await prisma.contact.updateMany({
    where: { id: params.id, companyId: company.id },
    data: { status: "ARCHIVED" },
  });

  if (updated.count === 0) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  return NextResponse.json({ id: params.id, status: "ARCHIVED" });
}
