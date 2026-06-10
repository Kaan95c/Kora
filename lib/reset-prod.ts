import * as readline from "node:readline";

import { PrismaClient } from "@prisma/client";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";

/**
 * ⚠️ SCRIPT DESTRUCTIF ET IRRÉVERSIBLE.
 *
 * Vide TOTALEMENT la base de production :
 *  1. supprime toutes les lignes de chaque modèle Prisma (ordre FK-safe) ;
 *  2. supprime tous les utilisateurs de Supabase Auth.
 *
 * Garde-fou : exige la saisie exacte de "CONFIRMER" avant de toucher quoi que
 * ce soit. Lance via `npm run db:reset-prod` (charge .env.local).
 *
 * NB : .env.local pointe sur le MÊME projet Supabase que la prod → c'est bien
 * la base de production qui est vidée.
 */

const prisma = new PrismaClient();

function ask(query: string): Promise<string> {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });
  return new Promise((resolve) => {
    rl.question(query, (answer) => {
      rl.close();
      resolve(answer.trim());
    });
  });
}

async function deleteAllAuthUsers(admin: SupabaseClient): Promise<number> {
  let deleted = 0;
  const perPage = 1000;
  let page = 1;

  // listUsers est paginé (50/page par défaut) → on boucle jusqu'à épuisement.
  // On repart toujours de la page 1 car chaque suppression décale la liste.
  for (;;) {
    const { data, error } = await admin.auth.admin.listUsers({ page, perPage });
    if (error) throw error;

    const users = data.users;
    if (users.length === 0) break;

    for (const user of users) {
      const { error: delErr } = await admin.auth.admin.deleteUser(user.id);
      if (delErr) {
        console.error(`   ✖ Échec suppression ${user.email ?? user.id}: ${delErr.message}`);
        continue;
      }
      deleted += 1;
    }

    // Si on a reçu une page pleine, il peut en rester → on relit la page 1
    // (les users restants ont été décalés). Sinon, terminé.
    if (users.length < perPage) break;
    page = 1;
  }

  return deleted;
}

async function main() {
  console.log(
    "\n⚠️  ATTENTION : Cette action supprime TOUTES les données (DB + Supabase Auth)."
  );
  console.log("    Elle est IRRÉVERSIBLE et vise la base de PRODUCTION.\n");

  const answer = await ask("Tape 'CONFIRMER' pour continuer : ");
  if (answer !== "CONFIRMER") {
    console.log("\n❌ Annulé — aucune donnée supprimée.");
    return;
  }

  console.log("\n🧹 Suppression des données Prisma…");

  // Ordre FK-safe : enfants → parents. (Toutes les relations Company sont
  // onDelete: Cascade, et Company.ownerId repasse SetNull quand l'owner part.)
  const dbResults: Record<string, number> = {};
  dbResults.AutomationAction = (await prisma.automationAction.deleteMany()).count;
  dbResults.Automation = (await prisma.automation.deleteMany()).count;
  dbResults.Message = (await prisma.message.deleteMany()).count;
  dbResults.Payment = (await prisma.payment.deleteMany()).count;
  dbResults.LineItem = (await prisma.lineItem.deleteMany()).count;
  dbResults.Document = (await prisma.document.deleteMany()).count;
  dbResults.Task = (await prisma.task.deleteMany()).count;
  dbResults.Appointment = (await prisma.appointment.deleteMany()).count;
  dbResults.SessionType = (await prisma.sessionType.deleteMany()).count;
  dbResults.Project = (await prisma.project.deleteMany()).count;
  dbResults.Contact = (await prisma.contact.deleteMany()).count;
  dbResults.User = (await prisma.user.deleteMany()).count;
  dbResults.Company = (await prisma.company.deleteMany()).count;

  console.log("🔐 Suppression des utilisateurs Supabase Auth…");
  const admin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  );
  const authDeleted = await deleteAllAuthUsers(admin);

  console.log("\n✅ Reset terminé. Résumé :\n");
  for (const [model, count] of Object.entries(dbResults)) {
    console.log(`   ${model.padEnd(18)} ${count}`);
  }
  console.log(`   ${"Supabase Auth".padEnd(18)} ${authDeleted} user(s)`);
  console.log("");
}

main()
  .catch((err) => {
    console.error("\n💥 Erreur pendant le reset :", err);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
