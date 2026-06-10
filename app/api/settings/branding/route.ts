import { NextResponse } from "next/server";
import type { Prisma } from "@prisma/client";

import { prisma } from "@/lib/prisma";
import { getAuthedCompany } from "@/lib/auth";

export const dynamic = "force-dynamic";

const HEX = /^#[0-9a-fA-F]{6}$/;

// PUT : met à jour l'identité visuelle (couleur, logo, préfixes), scopé companyId.
export async function PUT(request: Request) {
  const { user, company } = await getAuthedCompany();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (!company) {
    return NextResponse.json({ error: "No company" }, { status: 403 });
  }

  let body: {
    primaryColor?: string;
    logoUrl?: string | null;
    invoicePrefix?: string;
    quotePrefix?: string;
  };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const data: Prisma.CompanyUpdateInput = {};

  if (body.primaryColor !== undefined) {
    if (!HEX.test(body.primaryColor)) {
      return NextResponse.json(
        { error: "Invalid color (expected #RRGGBB)" },
        { status: 400 }
      );
    }
    data.primaryColor = body.primaryColor;
  }
  if (body.logoUrl !== undefined) {
    data.logoUrl =
      typeof body.logoUrl === "string" && body.logoUrl.trim()
        ? body.logoUrl.trim()
        : null;
  }
  if (body.invoicePrefix !== undefined) {
    const v = body.invoicePrefix.trim();
    if (v) data.invoicePrefix = v;
  }
  if (body.quotePrefix !== undefined) {
    const v = body.quotePrefix.trim();
    if (v) data.quotePrefix = v;
  }

  await prisma.company.updateMany({
    where: { id: company.id },
    data,
  });

  const updated = await prisma.company.findUnique({
    where: { id: company.id },
    select: {
      id: true,
      primaryColor: true,
      logoUrl: true,
      invoicePrefix: true,
      quotePrefix: true,
    },
  });

  return NextResponse.json(updated);
}
