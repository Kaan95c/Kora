import { NextResponse } from "next/server";
import type { Prisma } from "@prisma/client";

import { prisma } from "@/lib/prisma";
import { getAuthedCompany } from "@/lib/auth";

export const dynamic = "force-dynamic";

const CONTACT_STATUSES = ["LEAD", "PROSPECT", "CLIENT", "ARCHIVED"] as const;
type ContactStatus = (typeof CONTACT_STATUSES)[number];

const isStatus = (v: unknown): v is ContactStatus =>
  typeof v === "string" && CONTACT_STATUSES.includes(v as ContactStatus);

// ───────────────────────── GET : liste ─────────────────────────
export async function GET(request: Request) {
  const { user, company } = await getAuthedCompany();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (!company) return NextResponse.json([]);

  const { searchParams } = new URL(request.url);
  const status = searchParams.get("status");
  const search = searchParams.get("search")?.trim();

  const where: Prisma.ContactWhereInput = { companyId: company.id };

  if (isStatus(status)) {
    where.status = status;
  }

  if (search) {
    where.OR = [
      { firstName: { contains: search, mode: "insensitive" } },
      { lastName: { contains: search, mode: "insensitive" } },
      { email: { contains: search, mode: "insensitive" } },
    ];
  }

  const contacts = await prisma.contact.findMany({
    where,
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      firstName: true,
      lastName: true,
      email: true,
      phone: true,
      companyName: true,
      status: true,
      tags: true,
      createdAt: true,
      _count: { select: { projects: true, documents: true } },
    },
  });

  return NextResponse.json(contacts);
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
    firstName?: string;
    lastName?: string;
    email?: string;
    phone?: string;
    companyName?: string;
    status?: string;
    tags?: unknown;
  };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const firstName = body.firstName?.trim();
  const lastName = body.lastName?.trim();
  const email = body.email?.trim();

  if (!firstName || !lastName || !email) {
    return NextResponse.json(
      { error: "firstName, lastName and email are required" },
      { status: 400 }
    );
  }

  const tags = Array.isArray(body.tags)
    ? body.tags.filter((t): t is string => typeof t === "string" && t.trim() !== "")
    : [];

  const contact = await prisma.contact.create({
    data: {
      companyId: company.id,
      firstName,
      lastName,
      email,
      phone: body.phone?.trim() || null,
      companyName: body.companyName?.trim() || null,
      status: isStatus(body.status) ? body.status : "LEAD",
      tags,
    },
    select: {
      id: true,
      firstName: true,
      lastName: true,
      email: true,
      phone: true,
      companyName: true,
      status: true,
      tags: true,
      createdAt: true,
      _count: { select: { projects: true, documents: true } },
    },
  });

  return NextResponse.json(contact, { status: 201 });
}
