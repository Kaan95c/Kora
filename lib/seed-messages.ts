import {
  PrismaClient,
  MessageDirection,
  MessageStatus,
} from "@prisma/client";

const prisma = new PrismaClient();

/**
 * Seed NON DESTRUCTIF de messages de démo pour "Boutique Studio".
 * Idempotent : ne fait rien si la company a déjà des messages.
 */

function ago(opts: { days?: number; hours?: number; minutes?: number }): Date {
  const d = new Date();
  if (opts.days) d.setDate(d.getDate() - opts.days);
  if (opts.hours) d.setHours(d.getHours() - opts.hours);
  if (opts.minutes) d.setMinutes(d.getMinutes() - opts.minutes);
  return d;
}

async function main() {
  console.log("💬 Seed messages — démarrage…");

  const company = await prisma.company.findFirst({
    where: { name: "Boutique Studio" },
    select: { id: true },
  });
  if (!company) {
    console.warn('⚠️  Company "Boutique Studio" introuvable — rien à seeder.');
    return;
  }

  const existing = await prisma.message.count({
    where: { companyId: company.id },
  });
  if (existing > 0) {
    console.log(`✅ ${existing} message(s) déjà présents — seed ignoré.`);
    return;
  }

  const contacts = await prisma.contact.findMany({
    where: {
      companyId: company.id,
      email: {
        in: [
          "elena@velvetrose.com",
          "marcus@oasisspa.com",
          "sophie@nara-arch.com",
        ],
      },
    },
    select: { id: true, email: true },
  });
  const byEmail = (e: string) => contacts.find((c) => c.email === e)?.id;

  const elena = byEmail("elena@velvetrose.com");
  const marcus = byEmail("marcus@oasisspa.com");
  const sophie = byEmail("sophie@nara-arch.com");

  const data = [
    // Elena — 3 OUTBOUND (dont 1 avec subject)
    elena && {
      companyId: company.id,
      contactId: elena,
      direction: MessageDirection.OUTBOUND,
      status: MessageStatus.SENT,
      subject: "Velvet Rose — brand proposal",
      body: "Hi Elena, here's the proposal for the Velvet Rose rebrand. Let me know your thoughts whenever you get a moment!",
      createdAt: ago({ days: 2, minutes: 30 }),
    },
    elena && {
      companyId: company.id,
      contactId: elena,
      direction: MessageDirection.OUTBOUND,
      status: MessageStatus.SENT,
      body: "I've also attached the moodboard we discussed last week.",
      createdAt: ago({ days: 2, minutes: 18 }),
    },
    elena && {
      companyId: company.id,
      contactId: elena,
      direction: MessageDirection.OUTBOUND,
      status: MessageStatus.SENT,
      body: "Looking forward to our kickoff call tomorrow ☕",
      createdAt: ago({ hours: 20 }),
    },
    // Marcus — 2 INBOUND (non lus)
    marcus && {
      companyId: company.id,
      contactId: marcus,
      direction: MessageDirection.INBOUND,
      status: MessageStatus.SENT,
      body: "Hey! Just reviewed the spa landing page — it looks fantastic.",
      createdAt: ago({ hours: 5 }),
    },
    marcus && {
      companyId: company.id,
      contactId: marcus,
      direction: MessageDirection.INBOUND,
      status: MessageStatus.SENT,
      body: "Could we tweak the booking button colour to match the new palette though?",
      createdAt: ago({ hours: 4, minutes: 20 }),
    },
    // Sophie — 1 OUTBOUND
    sophie && {
      companyId: company.id,
      contactId: sophie,
      direction: MessageDirection.OUTBOUND,
      status: MessageStatus.SENT,
      body: "Hi Sophie, sharing the quote for the Nara Architecture website. Happy to walk you through it.",
      createdAt: ago({ days: 3 }),
    },
  ].filter(Boolean) as {
    companyId: string;
    contactId: string;
    direction: MessageDirection;
    status: MessageStatus;
    subject?: string;
    body: string;
    createdAt: Date;
  }[];

  await prisma.message.createMany({ data });
  console.log(`✅ ${data.length} message(s) de démo créés.`);
}

main()
  .catch((e) => {
    console.error("❌ Seed messages échoué :", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
