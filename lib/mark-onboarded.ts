import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

/**
 * Backfill NON DESTRUCTIF de l'onboarding.
 *
 * Après l'ajout de `Company.onboardedAt`, toutes les companies existantes ont
 * `onboardedAt = null` → le `OnboardingGate` les renverrait vers le wizard de
 * démarrage. Ce script marque comme « déjà onboardées » toutes les companies
 * actuellement non onboardées (= les comptes créés AVANT cette fonctionnalité,
 * en pratique l'owner « Kora Studio »).
 *
 * À lancer UNE FOIS, juste après la migration `db:push`. Les comptes créés
 * ensuite (register / OAuth) naissent avec `onboardedAt = null` → wizard.
 * Idempotent : ne touche que les lignes encore nulles.
 */
async function main() {
  console.log("🚩 Backfill onboarding — démarrage…");

  const res = await prisma.company.updateMany({
    where: { onboardedAt: null },
    data: { onboardedAt: new Date() },
  });

  console.log(`✅ Terminé : ${res.count} company(ies) marquée(s) onboardée(s).`);
}

main()
  .catch((err) => {
    console.error("❌ Backfill onboarding échoué :", err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
