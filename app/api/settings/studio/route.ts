import { NextResponse } from "next/server";

import { prisma } from "@/lib/prisma";
import { getAuthedCompany } from "@/lib/auth";

export const dynamic = "force-dynamic";

const str = (v: unknown) =>
  typeof v === "string" ? v.trim() || null : null;

// PUT : met à jour les informations du studio (Company), scopé companyId.
export async function PUT(request: Request) {
  const { user, company } = await getAuthedCompany();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (!company) {
    return NextResponse.json({ error: "No company" }, { status: 403 });
  }

  let body: {
    name?: string;
    siret?: string;
    vatNumber?: string;
    address?: string;
    phone?: string;
    email?: string;
  };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const name = body.name?.trim();
  if (!name) {
    return NextResponse.json(
      { error: "Studio name is required" },
      { status: 400 }
    );
  }

  await prisma.company.updateMany({
    where: { id: company.id },
    data: {
      name,
      siret: str(body.siret),
      vatNumber: str(body.vatNumber),
      address: str(body.address),
      phone: str(body.phone),
      email: str(body.email),
    },
  });

  const updated = await prisma.company.findUnique({
    where: { id: company.id },
    select: {
      id: true,
      name: true,
      siret: true,
      vatNumber: true,
      address: true,
      phone: true,
      email: true,
    },
  });

  return NextResponse.json(updated);
}
