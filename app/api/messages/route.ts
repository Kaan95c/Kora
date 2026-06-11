import { NextResponse } from "next/server";

import { prisma } from "@/lib/prisma";
import { getAuthedCompany } from "@/lib/auth";
import { sendEmail } from "@/lib/email";
import { withApi } from "@/lib/api-handler";
import { messageCreateSchema } from "@/lib/validations";
import { sanitizeText, sanitizeNullable } from "@/lib/sanitize";

export const dynamic = "force-dynamic";

// ──────────────── GET : conversations groupées par contact ────────────────
export const GET = withApi(async () => {
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
});

// ─────────────────── POST : créer + envoyer un message ───────────────────
export const POST = withApi(async (request: Request) => {
  const { user, company } = await getAuthedCompany();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (!company) {
    return NextResponse.json({ error: "No company" }, { status: 403 });
  }

  const data = messageCreateSchema.parse(await request.json());

  // Sanitization du texte libre (le corps part dans un email → défense XSS).
  const body = sanitizeText(data.body);
  const subject = sanitizeNullable(data.subject);
  if (!body) {
    return NextResponse.json(
      { error: "Le message est requis." },
      { status: 400 }
    );
  }

  // Le contact doit appartenir à la company (anti cross-tenant).
  const contact = await prisma.contact.findFirst({
    where: { id: data.contactId, companyId: company.id },
    select: { id: true, email: true },
  });
  if (!contact) {
    return NextResponse.json({ error: "Invalid contact" }, { status: 400 });
  }

  // Projet optionnel, scopé lui aussi.
  let projectId: string | null = null;
  if (data.projectId) {
    const project = await prisma.project.findFirst({
      where: { id: data.projectId, companyId: company.id },
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
      subject,
      body,
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
});
