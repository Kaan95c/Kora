import { NextResponse } from "next/server";
import type { Prisma } from "@prisma/client";

import { prisma } from "@/lib/prisma";
import { getAuthedCompany } from "@/lib/auth";
import { withApi } from "@/lib/api-handler";
import { brandingUpdateSchema } from "@/lib/validations";

export const dynamic = "force-dynamic";

// PUT : met à jour l'identité visuelle (couleur, logo, préfixes), scopé companyId.
export const PUT = withApi(async (request: Request) => {
  const { user, company } = await getAuthedCompany();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (!company) {
    return NextResponse.json({ error: "No company" }, { status: 403 });
  }

  const parsed = brandingUpdateSchema.parse(await request.json());

  const data: Prisma.CompanyUpdateInput = {};
  if (parsed.primaryColor !== undefined) data.primaryColor = parsed.primaryColor;
  if (parsed.logoUrl !== undefined) {
    data.logoUrl = parsed.logoUrl && parsed.logoUrl.trim() ? parsed.logoUrl.trim() : null;
  }
  if (parsed.invoicePrefix !== undefined && parsed.invoicePrefix.trim()) {
    data.invoicePrefix = parsed.invoicePrefix.trim();
  }
  if (parsed.quotePrefix !== undefined && parsed.quotePrefix.trim()) {
    data.quotePrefix = parsed.quotePrefix.trim();
  }

  await prisma.company.updateMany({ where: { id: company.id }, data });

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
});
