import { NextResponse } from "next/server";

import { prisma } from "@/lib/prisma";
import { getAuthedCompany } from "@/lib/auth";
import { sendEmail } from "@/lib/email";

export const dynamic = "force-dynamic";

// ───────────────────────── GET : conversations groupées par contact ─────────────────────────
export async function GET() {
  const { user, company } = await getAuthedCompany();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (!company) return NextResponse.json([]);

  // Tous les messages rattachés à un contact, les plus récents d'abord.
  const messages = await prisma.message.findMany({
    where: { companyId: company.id, contactId: { not: null } },
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      subject: true,
      body: true,
      direction: true,
      status: true,
      createdAt: true,
      contactId: true,
      contact: {
        select: { firstName: true, lastName: true, status: true },
      },
    },
  });

  // Regroupe par contact : 1ʳᵉ occurrence = dernier message ; compte les non-lus.
  type Conversation = {
    contactId: string;
    contact: { firstName: string; lastName: string; status: string } | null;
    lastMessage: {
      subject: string | null;
      body: string;
      direction: string;
      createdAt: Date;
    };
    unreadCount: number;
  };

  const map = new Map<string, Conversation>();
  for (const m of messages) {
    if (!m.contactId) continue;
    let conv = map.get(m.contactId);
    if (!conv) {
      conv = {
        contactId: m.contactId,
        contact: m.contact,
        lastMessage: {
          subject: m.subject,
          body: m.body,
          direction: m.direction,
          createdAt: m.createdAt,
        },
        unreadCount: 0,
      };
      map.set(m.contactId, conv);
    }
    if (m.direction === "INBOUND" && m.status !== "READ") {
      conv.unreadCount += 1;
    }
  }

  return NextResponse.json(Array.from(map.values()));
}

// ───────────────────────── POST : créer + envoyer un message ─────────────────────────
export async function POST(request: Request) {
  const { user, company } = await getAuthedCompany();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (!company) {
    return NextResponse.json({ error: "No company" }, { status: 403 });
  }

  let body: {
    subject?: string;
    body?: string;
    contactId?: string;
    projectId?: string;
  };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const text = body.body?.trim();
  if (!text) {
    return NextResponse.json({ error: "Message body is required" }, { status: 400 });
  }
  if (!body.contactId) {
    return NextResponse.json({ error: "A recipient is required" }, { status: 400 });
  }

  // Le contact doit appartenir à la company (anti cross-tenant).
  const contact = await prisma.contact.findFirst({
    where: { id: body.contactId, companyId: company.id },
    select: { id: true, email: true },
  });
  if (!contact) {
    return NextResponse.json({ error: "Invalid contact" }, { status: 400 });
  }

  // Projet optionnel, scopé lui aussi.
  let projectId: string | null = null;
  if (body.projectId) {
    const project = await prisma.project.findFirst({
      where: { id: body.projectId, companyId: company.id },
      select: { id: true },
    });
    if (project) projectId = project.id;
  }

  const message = await prisma.message.create({
    data: {
      companyId: company.id,
      contactId: contact.id,
      projectId,
      direction: "OUTBOUND",
      status: "SENT",
      subject: body.subject?.trim() || null,
      body: text,
    },
    select: {
      id: true,
      subject: true,
      body: true,
      direction: true,
      status: true,
      createdAt: true,
      contactId: true,
    },
  });

  // Envoi réel best-effort via lib/email (no-op si pas de clé).
  if (contact.email) {
    await sendEmail({
      to: contact.email,
      subject: message.subject ?? `New message from ${company.name}`,
      text: message.body,
    });
  }

  return NextResponse.json(message, { status: 201 });
}
