import { NextResponse } from "next/server";

import { prisma } from "@/lib/prisma";
import { getAuthedCompany } from "@/lib/auth";
import { withApi } from "@/lib/api-handler";
import { studioUpdateSchema } from "@/lib/validations";

export const dynamic = "force-dynamic";

const orNull = (v: string | null | undefined) => (v && v.trim() ? v.trim() : null);

// PUT : met à jour les informations du studio (Company), scopé companyId.
export const PUT = withApi(async (request: Request) => {
  const { user, company } = await getAuthedCompany();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (!company) {
    return NextResponse.json({ error: "No company" }, { status: 403 });
  }

  const data = studioUpdateSchema.parse(await request.json());

  await prisma.company.updateMany({
    where: { id: company.id },
    data: {
      name: data.name,
      siret: orNull(data.siret),
      vatNumber: orNull(data.vatNumber),
      address: orNull(data.address),
      phone: orNull(data.phone),
      email: orNull(data.email),
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
});
