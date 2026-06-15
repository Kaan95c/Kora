import * as readline from "node:readline";

import { PrismaClient } from "@prisma/client";
import { createClient } from "@supabase/supabase-js";

/**
 * Crée le vrai compte admin après un reset de la base.
 *  1. crée le user Supabase Auth (email confirmé directement) ;
 *  2. crée la Company "Kora Studio" (plan PRO) ;
 *  3. crée le User en DB lié à la Company + le pose comme owner.
 *
 * Le mot de passe est demandé en saisie masquée (jamais hardcodé).
 * Lance via `npm run db:create-admin` (charge .env.local).
 */

const ADMIN_EMAIL = "kaantekten958@gmail.com";
const ADMIN_NAME = "Kaan Tekten";
const COMPANY_NAME = "Kora Studio";
const LOGIN_URL = "https://kora-app.fr/login";

const prisma = new PrismaClient();

/** Saisie masquée : on imprime la question puis on coupe l'écho du stdin. */
function askHidden(query: string): Promise<string> {
  return new Promise((resolve) => {
    const rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout,
    });
    const mutableRl = rl as unknown as {
      _writeToOutput: (stringToWrite: string) => void;
    };
    let muted = false;
    mutableRl._writeToOutput = (stringToWrite: string) => {
      if (!muted) process.stdout.write(stringToWrite);
    };

    rl.question(query, (answer) => {
      process.stdout.write("\n");
      rl.close();
      resolve(answer);
    });

    // À partir d'ici, plus rien n'est écrit à l'écran (mot de passe invisible).
    muted = true;
  });
}

async function main() {
  console.log(`\n👤 Création du compte admin (${ADMIN_EMAIL})\n`);

  const password = await askHidden("Mot de passe (saisie masquée) : ");
  if (password.length < 6) {
    console.log(
      "\n❌ Mot de passe trop court (6 caractères minimum requis par Supabase)."
    );
    return;
  }

  const admin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  );

  // 1. User Supabase Auth, email confirmé directement.
  console.log("🔐 Création du user Supabase Auth…");
  const { data: created, error: createErr } = await admin.auth.admin.createUser({
    email: ADMIN_EMAIL,
    password,
    email_confirm: true,
  });

  if (createErr || !created?.user) {
    console.log(
      `\n❌ Échec côté Supabase Auth : ${createErr?.message ?? "user introuvable"}.`
    );
    console.log(
      "   (Si l'email existe déjà, lance d'abord `npm run db:reset-prod`.)"
    );
    return;
  }

  const supabaseId = created.user.id;

  // 2 + 3. Company + User + lien owner, dans une transaction.
  console.log("🏢 Création de la Company + du User en DB…");
  const result = await prisma.$transaction(async (tx) => {
    const company = await tx.company.create({
      data: {
        name: COMPANY_NAME,
        plan: "PRO",
        primaryColor: "#52634c",
        invoicePrefix: "FAC",
        quotePrefix: "DEV",
      },
    });

    const user = await tx.user.create({
      data: {
        supabaseId,
        email: ADMIN_EMAIL,
        name: ADMIN_NAME,
        companyId: company.id,
      },
    });

    await tx.company.update({
      where: { id: company.id },
      data: { ownerId: user.id },
    });

    return { companyId: company.id, userId: user.id };
  });

  console.log("\n✅ Compte créé avec succès");
  console.log(`   Email   : ${ADMIN_EMAIL}`);
  console.log(`   Studio  : ${COMPANY_NAME} (PRO)`);
  console.log(`   Company : ${result.companyId}`);
  console.log(`   User    : ${result.userId}`);
  console.log(`   URL     : ${LOGIN_URL}`);
  console.log("");
}

main()
  .catch((err) => {
    console.error("\n💥 Erreur pendant la création de l'admin :", err);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
