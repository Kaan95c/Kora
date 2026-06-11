import { NextResponse } from "next/server";

import { prisma } from "@/lib/prisma";
import { getAuthedCompany } from "@/lib/auth";
import { withApi } from "@/lib/api-handler";
import { projectStatusSchema } from "@/lib/validations";

export const dynamic = "force-dynamic";

export const PATCH = withApi(
  async (request: Request, { params }: { params: { id: string } }) => {
    const { user, company } = await getAuthedCompany();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    if (!company) {
      return NextResponse.json({ error: "No company" }, { status: 403 });
    }

    const { status } = projectStatusSchema.parse(await request.json());

    // updateMany scopé par companyId → empêche de modifier le projet d'une autre company.
    const updated = await prisma.project.updateMany({
      where: { id: params.id, companyId: company.id },
      data: { status },
    });

    if (updated.count === 0) {
      return NextResponse.json({ error: "Project not found" }, { status: 404 });
    }

    return NextResponse.json({ id: params.id, status });
  }
);
