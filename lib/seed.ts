import {
  PrismaClient,
  Plan,
  ContactStatus,
  ProjectStatus,
  DocumentType,
  DocumentStatus,
  PaymentStatus,
  PaymentMethod,
  Priority,
  AutomationTrigger,
  ActionType,
} from "@prisma/client";

const prisma = new PrismaClient();

// ─── Helpers de dates (relatives au moment du seed) ───
function daysAgo(days: number): Date {
  const d = new Date();
  d.setDate(d.getDate() - days);
  return d;
}
function daysAhead(days: number): Date {
  const d = new Date();
  d.setDate(d.getDate() + days);
  return d;
}
function atDaysFromNow(days: number, hour: number, minute: number): Date {
  const d = new Date();
  d.setDate(d.getDate() + days);
  d.setHours(hour, minute, 0, 0);
  return d;
}

async function main() {
  console.log("🌱 Seed Kora — démarrage…");

  // 1. Reset (ordre FK-safe)
  await prisma.task.deleteMany();
  await prisma.appointment.deleteMany();
  await prisma.payment.deleteMany();
  await prisma.document.deleteMany();
  await prisma.project.deleteMany();
  await prisma.contact.deleteMany();
  await prisma.user.deleteMany();
  await prisma.company.deleteMany();
  console.log("🧹 Données existantes supprimées.");

  // 2. Company
  const company = await prisma.company.create({
    data: {
      name: "Boutique Studio",
      plan: Plan.PRO,
      primaryColor: "#52634c",
      invoicePrefix: "FAC",
      quotePrefix: "DEV",
    },
  });

  // 3. Contacts
  const elena = await prisma.contact.create({
    data: {
      companyId: company.id,
      firstName: "Elena",
      lastName: "Vance",
      email: "elena@velvetrose.com",
      phone: "+33 6 24 51 80 12",
      companyName: "Velvet Rose",
      address: "12 Rue des Lilas, 75011 Paris",
      notes: "VIP client — prefers email over calls. Rebrand launching Q4.",
      status: ContactStatus.CLIENT,
      tags: ["VIP"],
    },
  });
  const marcus = await prisma.contact.create({
    data: {
      companyId: company.id,
      firstName: "Marcus",
      lastName: "Thorne",
      email: "marcus@oasisspa.com",
      phone: "+33 6 88 32 14 09",
      companyName: "Oasis Spa",
      address: "8 Avenue du Parc, 69006 Lyon",
      notes: "Spa chain owner. Digital revamp in progress.",
      status: ContactStatus.CLIENT,
    },
  });
  const sophie = await prisma.contact.create({
    data: {
      companyId: company.id,
      firstName: "Sophie",
      lastName: "Chen",
      email: "sophie@nara-arch.com",
      phone: "+33 7 14 09 66 23",
      companyName: "Nara Architecture",
      address: "24 Quai de la Loire, 44000 Nantes",
      notes: "Architecture studio. Considering full website package.",
      status: ContactStatus.PROSPECT,
    },
  });
  const james = await prisma.contact.create({
    data: {
      companyId: company.id,
      firstName: "James",
      lastName: "Morgan",
      email: "james@elysian.com",
      phone: "+33 6 51 77 40 88",
      companyName: "Elysian",
      address: "3 Place Bellecour, 33000 Bordeaux",
      notes: "New lead from referral. Awaiting first call.",
      status: ContactStatus.LEAD,
    },
  });

  // 4. Projects
  const velvetRose = await prisma.project.create({
    data: {
      companyId: company.id,
      contactId: elena.id,
      name: "Velvet Rose Rebrand",
      status: ProjectStatus.ACTIVE,
      totalAmount: 8500,
      paidAmount: 4250,
      endDate: new Date("2025-10-24T00:00:00"),
    },
  });
  const oasisSpa = await prisma.project.create({
    data: {
      companyId: company.id,
      contactId: marcus.id,
      name: "Oasis Spa Digital",
      status: ProjectStatus.ACTIVE,
      totalAmount: 3200,
      paidAmount: 0,
      endDate: new Date("2025-11-02T00:00:00"),
    },
  });
  const naraArch = await prisma.project.create({
    data: {
      companyId: company.id,
      contactId: sophie.id,
      name: "Nara Architecture Site",
      status: ProjectStatus.ACTIVE,
      totalAmount: 5800,
      paidAmount: 5800,
      endDate: new Date("2025-10-28T00:00:00"),
    },
  });

  // 5. Documents
  await prisma.document.createMany({
    data: [
      {
        companyId: company.id,
        contactId: elena.id,
        projectId: velvetRose.id,
        title: "Facture FAC-2025-001",
        number: "FAC-2025-001",
        type: DocumentType.INVOICE,
        total: 2450,
        status: DocumentStatus.SENT,
      },
      {
        companyId: company.id,
        contactId: marcus.id,
        projectId: oasisSpa.id,
        title: "Contrat Oasis Spa",
        type: DocumentType.CONTRACT,
        status: DocumentStatus.DRAFT,
      },
      {
        companyId: company.id,
        contactId: sophie.id,
        projectId: naraArch.id,
        title: "Devis DEV-2025-003",
        number: "DEV-2025-003",
        type: DocumentType.QUOTE,
        total: 4800,
        status: DocumentStatus.SIGNED,
        signedAt: daysAgo(6),
      },
      {
        companyId: company.id,
        contactId: james.id,
        title: "Facture FAC-2025-004",
        number: "FAC-2025-004",
        type: DocumentType.INVOICE,
        total: 1200,
        status: DocumentStatus.PAID,
      },
    ],
  });

  // 6. Payments
  await prisma.payment.createMany({
    data: [
      {
        companyId: company.id,
        projectId: velvetRose.id,
        contactId: elena.id,
        amount: 4250,
        status: PaymentStatus.PAID,
        method: PaymentMethod.CARD,
        paidAt: daysAgo(5),
      },
      {
        companyId: company.id,
        contactId: james.id,
        amount: 1200,
        status: PaymentStatus.PAID,
        method: PaymentMethod.BANK_TRANSFER,
        paidAt: daysAgo(2),
      },
      {
        companyId: company.id,
        projectId: oasisSpa.id,
        contactId: marcus.id,
        amount: 3200,
        status: PaymentStatus.PENDING,
        dueDate: daysAhead(7),
      },
    ],
  });

  // 7. Appointments
  await prisma.appointment.createMany({
    data: [
      {
        companyId: company.id,
        contactId: elena.id,
        title: "Brand Identity Kickoff",
        startAt: atDaysFromNow(1, 10, 0),
        endAt: atDaysFromNow(1, 11, 0),
        notes: "Studio B",
      },
      {
        companyId: company.id,
        contactId: marcus.id,
        title: "Client Revision Sync",
        startAt: atDaysFromNow(3, 14, 30),
        notes: "Zoom",
      },
      {
        companyId: company.id,
        contactId: sophie.id,
        title: "Portfolio Review",
        startAt: atDaysFromNow(4, 9, 0),
        notes: "In person",
      },
    ],
  });

  // 8. Tasks (liens project conformes au brief)
  await prisma.task.createMany({
    data: [
      {
        companyId: company.id,
        projectId: velvetRose.id,
        title: "Approve Final Mockups",
        description:
          "Nara Architecture project phase 1 is stalled waiting for approval.",
        priority: Priority.HIGH,
        completed: false,
      },
      {
        companyId: company.id,
        projectId: oasisSpa.id,
        title: "Send Invoice #204",
        description: "Oasis Spa project retainer fee.",
        priority: Priority.HIGH,
        completed: false,
      },
      {
        companyId: company.id,
        projectId: naraArch.id,
        title: "Client Feedback Received",
        description: "Velvet Rose just sent comments on the logo concepts.",
        priority: Priority.MEDIUM,
        completed: false,
      },
    ],
  });

  // 9. Session types (Scheduler)
  await prisma.sessionType.createMany({
    data: [
      { companyId: company.id, name: "Discovery Call", duration: 20, color: "#52634c" },
      { companyId: company.id, name: "Strategy Session", duration: 60, color: "#705a4a", price: 150 },
      { companyId: company.id, name: "Project Review", duration: 45, color: "#8b9d83" },
    ],
  });

  // 10. Automations (Scheduler/workflows)
  await prisma.automation.create({
    data: {
      companyId: company.id,
      name: "Welcome New Lead",
      description: "Greet new leads instantly and queue a follow-up task.",
      trigger: AutomationTrigger.NEW_LEAD,
      isActive: true,
      triggerCount: 12,
      lastTriggeredAt: daysAgo(0),
      actions: {
        create: [
          { type: ActionType.SEND_EMAIL, order: 0, delayHours: 0 },
          { type: ActionType.CREATE_TASK, order: 1, delayHours: 1 },
        ],
      },
    },
  });
  await prisma.automation.create({
    data: {
      companyId: company.id,
      name: "Contract Follow-up",
      description: "Confirm signed contracts and nudge if there's no reply.",
      trigger: AutomationTrigger.CONTRACT_SIGNED,
      isActive: true,
      triggerCount: 5,
      lastTriggeredAt: daysAgo(2),
      actions: {
        create: [
          { type: ActionType.SEND_EMAIL, order: 0, delayHours: 0 },
          { type: ActionType.SEND_REMINDER, order: 1, delayHours: 72 },
        ],
      },
    },
  });
  await prisma.automation.create({
    data: {
      companyId: company.id,
      name: "Overdue Invoice Alert",
      description: "Chase late payments and flag the contact for review.",
      trigger: AutomationTrigger.PAYMENT_OVERDUE,
      isActive: false,
      triggerCount: 3,
      lastTriggeredAt: daysAgo(8),
      actions: {
        create: [
          { type: ActionType.SEND_REMINDER, order: 0, delayHours: 0 },
          { type: ActionType.ADD_TAG, order: 1, delayHours: 24 },
        ],
      },
    },
  });

  // 11. Line items sur FAC-2025-001 (pour le PDF)
  const invoiceForPdf = await prisma.document.findFirst({
    where: { companyId: company.id, number: "FAC-2025-001" },
    select: { id: true },
  });
  if (invoiceForPdf) {
    await prisma.lineItem.createMany({
      data: [
        { documentId: invoiceForPdf.id, name: "Brand identity design", description: "Logo concept, exploration & final lockup", quantity: 1, unitPrice: 1500, total: 1500, taxRate: 20, order: 0 },
        { documentId: invoiceForPdf.id, name: "Logo suite", description: "Primary, secondary & monochrome variations", quantity: 1, unitPrice: 650, total: 650, taxRate: 20, order: 1 },
        { documentId: invoiceForPdf.id, name: "Brand guidelines", description: "24-page PDF — colours, typography, usage", quantity: 1, unitPrice: 300, total: 300, taxRate: 20, order: 2 },
      ],
    });
    await prisma.document.update({
      where: { id: invoiceForPdf.id },
      data: { total: 2940 },
    });
  }

  // Récap
  const [contacts, projects, documents, payments, appointments, tasks] =
    await Promise.all([
      prisma.contact.count(),
      prisma.project.count(),
      prisma.document.count(),
      prisma.payment.count(),
      prisma.appointment.count(),
      prisma.task.count(),
    ]);

  console.log("✅ Seed terminé :");
  console.log(`   • 1 company (${company.name}, plan ${company.plan})`);
  console.log(`   • ${contacts} contacts`);
  console.log(`   • ${projects} projects`);
  console.log(`   • ${documents} documents`);
  console.log(`   • ${payments} payments`);
  console.log(`   • ${appointments} appointments`);
  console.log(`   • ${tasks} tasks`);
}

main()
  .catch((e) => {
    console.error("❌ Seed échoué :", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
