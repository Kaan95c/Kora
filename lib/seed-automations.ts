import { PrismaClient, AutomationTrigger, ActionType } from "@prisma/client";

const prisma = new PrismaClient();

/**
 * Seed NON DESTRUCTIF des automations de démo pour "Boutique Studio".
 * Idempotent : ne fait rien si la company a déjà des automations.
 */

function hoursAgo(h: number): Date {
  const d = new Date();
  d.setHours(d.getHours() - h);
  return d;
}

const DEFS = [
  {
    name: "Welcome New Lead",
    description: "Greet new leads instantly and queue a follow-up task.",
    trigger: AutomationTrigger.NEW_LEAD,
    isActive: true,
    lastTriggeredAt: hoursAgo(5),
    triggerCount: 12,
    actions: [
      { type: ActionType.SEND_EMAIL, order: 0, delayHours: 0, config: { subject: "Welcome to the studio!" } },
      { type: ActionType.CREATE_TASK, order: 1, delayHours: 1, config: { title: "Call the new lead" } },
    ],
  },
  {
    name: "Contract Follow-up",
    description: "Confirm signed contracts and nudge if there's no reply.",
    trigger: AutomationTrigger.CONTRACT_SIGNED,
    isActive: true,
    lastTriggeredAt: hoursAgo(48),
    triggerCount: 5,
    actions: [
      { type: ActionType.SEND_EMAIL, order: 0, delayHours: 0, config: { subject: "Thanks for signing!" } },
      { type: ActionType.SEND_REMINDER, order: 1, delayHours: 72, config: {} },
    ],
  },
  {
    name: "Overdue Invoice Alert",
    description: "Chase late payments and flag the contact for review.",
    trigger: AutomationTrigger.PAYMENT_OVERDUE,
    isActive: false,
    lastTriggeredAt: hoursAgo(192),
    triggerCount: 3,
    actions: [
      { type: ActionType.SEND_REMINDER, order: 0, delayHours: 0, config: {} },
      { type: ActionType.ADD_TAG, order: 1, delayHours: 24, config: { tag: "Overdue" } },
    ],
  },
];

async function main() {
  console.log("⚡ Seed automations — démarrage…");

  const company = await prisma.company.findFirst({
    where: { name: "Boutique Studio" },
    select: { id: true },
  });
  if (!company) {
    console.warn('⚠️  Company "Boutique Studio" introuvable — rien à seeder.');
    return;
  }

  const existing = await prisma.automation.count({
    where: { companyId: company.id },
  });
  if (existing > 0) {
    console.log(`✅ ${existing} automation(s) déjà présentes — seed ignoré.`);
    return;
  }

  for (const d of DEFS) {
    await prisma.automation.create({
      data: {
        companyId: company.id,
        name: d.name,
        description: d.description,
        trigger: d.trigger,
        isActive: d.isActive,
        lastTriggeredAt: d.lastTriggeredAt,
        triggerCount: d.triggerCount,
        actions: { create: d.actions },
      },
    });
    console.log(`   • ${d.name} → créée (${d.actions.length} actions)`);
  }

  console.log(`✅ ${DEFS.length} automations de démo créées.`);
}

main()
  .catch((e) => {
    console.error("❌ Seed automations échoué :", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
