import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

/**
 * Seed NON DESTRUCTIF des types de session pour "Boutique Studio".
 * Idempotent : ne crée un type que s'il n'existe pas déjà (match par nom).
 * Ne touche à rien d'autre → préserve le rattachement owner du user de test.
 */

const DEFAULTS = [
  { name: "Discovery Call", duration: 20, color: "#52634c", price: null as number | null },
  { name: "Strategy Session", duration: 60, color: "#705a4a", price: 150 },
  { name: "Project Review", duration: 45, color: "#8b9d83", price: null as number | null },
];

async function main() {
  console.log("🗓️  Seed session types — démarrage…");

  const company = await prisma.company.findFirst({
    where: { name: "Boutique Studio" },
    select: { id: true },
  });

  if (!company) {
    console.warn('⚠️  Company "Boutique Studio" introuvable — rien à seeder.');
    return;
  }

  let created = 0;
  for (const d of DEFAULTS) {
    const existing = await prisma.sessionType.findFirst({
      where: { companyId: company.id, name: d.name },
      select: { id: true },
    });
    if (existing) {
      console.log(`   • ${d.name} → existe déjà (ignoré)`);
      continue;
    }
    await prisma.sessionType.create({
      data: { companyId: company.id, ...d },
    });
    created += 1;
    console.log(`   • ${d.name} → créé`);
  }

  console.log(`✅ Terminé : ${created} type(s) créé(s).`);
}

main()
  .catch((err) => {
    console.error("❌ Seed session types échoué :", err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
