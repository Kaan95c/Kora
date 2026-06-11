import { NextResponse } from "next/server";

import { prisma } from "@/lib/prisma";
import { getAuthedCompany } from "@/lib/auth";
import { withApi } from "@/lib/api-handler";
import { languageSchema } from "@/lib/validations";

export const dynamic = "force-dynamic";

// PUT : persiste la langue de l'interface (Company.language), scopé companyId.
export const PUT = withApi(async (request: Request) => {
  const { user, company } = await getAuthedCompany();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (!company) {
    return NextResponse.json({ error: "No company" }, { status: 403 });
  }

  const { language } = languageSchema.parse(await request.json());

  await prisma.company.updateMany({
    where: { id: company.id },
    data: { language },
  });

  return NextResponse.json({ language });
});
