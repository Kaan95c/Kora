import { NextResponse } from "next/server";

import { prisma } from "@/lib/prisma";
import { getAuthedCompany } from "@/lib/auth";

export const dynamic = "force-dynamic";

// GET : conversation complète d'un contact (triée ASC) + marque les INBOUND comme lus.
export async function GET(
  _request: Request,
  { params }: { params: { contactId: string } }
) {
  const { user, company } = await getAuthedCompany();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (!company) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const contact = await prisma.contact.findFirst({
    where: { id: params.contactId, companyId: company.id },
    select: { id: true, firstName: true, lastName: true, status: true, email: true },
  });
  if (!contact) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  // Effet de bord : à l'ouverture, les messages reçus non lus passent en READ.
  await prisma.message.updateMany({
    where: {
      companyId: company.id,
      contactId: contact.id,
      direction: "INBOUND",
      status: { in: ["SENT", "DELIVERED"] },
    },
    data: { status: "READ" },
  });

  const messages = await prisma.message.findMany({
    where: { companyId: company.id, contactId: contact.id },
    orderBy: { createdAt: "asc" },
    select: {
      id: true,
      subject: true,
      body: true,
      direction: true,
      status: true,
      createdAt: true,
    },
  });

  return NextResponse.json({ contact, messages });
}
