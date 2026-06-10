import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

/**
 * Seed NON DESTRUCTIF des lignes de la facture FAC-2025-001 (pour tester le PDF).
 * Idempotent : ne fait rien si le document a déjà des lignes.
 * Recalcule `Document.total` = somme TTC (TVA 20%) pour rester cohérent.
 */

const LINES = [
  {
    name: "Brand identity design",
    description: "Logo concept, exploration & final lockup",
    quantity: 1,
    unitPrice: 1500,
    order: 0,
  },
  {
    name: "Logo suite",
    description: "Primary, secondary & monochrome variations",
    quantity: 1,
    unitPrice: 650,
    order: 1,
  },
  {
    name: "Brand guidelines",
    description: "24-page PDF — colours, typography, usage",
    quantity: 1,
    unitPrice: 300,
    order: 2,
  },
];

async function main() {
  console.log("📄 Seed line items (FAC-2025-001) — démarrage…");

  const doc = await prisma.document.findFirst({
    where: { number: "FAC-2025-001" },
    select: { id: true },
  });
  if (!doc) {
    console.warn("⚠️  Facture FAC-2025-001 introuvable — rien à seeder.");
    return;
  }

  const existing = await prisma.lineItem.count({
    where: { documentId: doc.id },
  });
  if (existing > 0) {
    console.log(`✅ ${existing} ligne(s) déjà présentes — seed ignoré.`);
    return;
  }

  await prisma.lineItem.createMany({
    data: LINES.map((l) => ({
      documentId: doc.id,
      name: l.name,
      description: l.description,
      quantity: l.quantity,
      unitPrice: l.unitPrice,
      total: l.quantity * l.unitPrice,
      taxRate: 20,
      order: l.order,
    })),
  });

  const ht = LINES.reduce((s, l) => s + l.quantity * l.unitPrice, 0);
  const ttc = ht * 1.2;
  await prisma.document.update({
    where: { id: doc.id },
    data: { total: ttc },
  });

  console.log(
    `✅ ${LINES.length} lignes créées — HT ${ht} € · TTC ${ttc} € (total mis à jour).`
  );
}

main()
  .catch((e) => {
    console.error("❌ Seed line items échoué :", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
