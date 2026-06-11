import { NextResponse } from "next/server";

import { prisma } from "@/lib/prisma";
import { getAuthedCompany } from "@/lib/auth";
import { withApi } from "@/lib/api-handler";

export const dynamic = "force-dynamic";

const EMPTY = { contacts: [], projects: [], documents: [] };

/**
 * Recherche globale (Topbar) — scopée company.
 * Cherche dans Contacts (firstName/lastName/email), Projects (name) et
 * Documents (title/number). Max 5 résultats par catégorie.
 */
export const GET = withApi(async (request: Request) => {
  const { user, company } = await getAuthedCompany();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (!company) return NextResponse.json(EMPTY);

  const q = new URL(request.url).searchParams.get("q")?.trim();
  if (!q) return NextResponse.json(EMPTY);

  const [contacts, projects, documents] = await Promise.all([
    prisma.contact.findMany({
      where: {
        companyId: company.id,
        status: { not: "ARCHIVED" },
        OR: [
          { firstName: { contains: q, mode: "insensitive" } },
          { lastName: { contains: q, mode: "insensitive" } },
          { email: { contains: q, mode: "insensitive" } },
        ],
      },
      select: { id: true, firstName: true, lastName: true, email: true },
      orderBy: { createdAt: "desc" },
      take: 5,
    }),
    prisma.project.findMany({
      where: {
        companyId: company.id,
        name: { contains: q, mode: "insensitive" },
      },
      select: { id: true, name: true, status: true },
      orderBy: { createdAt: "desc" },
      take: 5,
    }),
    prisma.document.findMany({
      where: {
        companyId: company.id,
        OR: [
          { title: { contains: q, mode: "insensitive" } },
          { number: { contains: q, mode: "insensitive" } },
        ],
      },
      select: { id: true, title: true, number: true, type: true },
      orderBy: { createdAt: "desc" },
      take: 5,
    }),
  ]);

  return NextResponse.json({ contacts, projects, documents });
});
