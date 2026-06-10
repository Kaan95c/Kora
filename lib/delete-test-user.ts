// Charge .env.local AVANT tout import qui lit l'env (Prisma lit DATABASE_URL
// à l'instanciation). Lancé en direct : `npx tsx lib/delete-test-user.ts <email>`.
import { config } from "dotenv";
config({ path: ".env.local" });

import { PrismaClient } from "@prisma/client";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";

/**
 * Supprime un compte de test : sa Company en DB (cascade → User + données
 * tenant) ET l'utilisateur Supabase Auth associé.
 *
 * Usage : npx tsx lib/delete-test-user.ts test-billing@kora.fr
 *
 * Ciblé sur un seul email (faible portée) ; à ne pas confondre avec le reset
 * global `npm run db:reset-prod`.
 */

const prisma = new PrismaClient();

async function findAuthUserIdByEmail(
  admin: SupabaseClient,
  email: string
): Promise<string | null> {
  // Pas de lookup par email dans l'API admin → on pagine listUsers.
  const perPage = 1000;
  let page = 1;
  for (;;) {
    const { data, error } = await admin.auth.admin.listUsers({ page, perPage });
    if (error) throw error;
    const match = data.users.find((u) => u.email === email);
    if (match) return match.id;
    if (data.users.length < perPage) return null;
    page += 1;
  }
}

async function main() {
  const email = process.argv[2];
  if (!email) {
    console.error("Usage: npx tsx lib/delete-test-user.ts <email>");
    process.exitCode = 1;
    return;
  }

  console.log(`\n🗑️  Suppression du compte de test : ${email}\n`);

  const admin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  );

  // 1. Retrouver l'utilisateur en DB (email unique) → companyId + supabaseId.
  const dbUser = await prisma.user.findUnique({
    where: { email },
    select: { id: true, supabaseId: true, companyId: true },
  });

  // 2. Supprimer la Company → cascade (User + contacts/projets/documents/…).
  if (dbUser) {
    const company = await prisma.company.delete({
      where: { id: dbUser.companyId },
    });
    console.log(`   ✅ Company supprimée : ${company.name} (${company.id}) — cascade DB`);
  } else {
    console.log("   ⚠️  Aucun User en DB pour cet email (rien à supprimer côté DB).");
  }

  // 3. Supprimer l'utilisateur Supabase Auth.
  const supabaseId =
    dbUser?.supabaseId ?? (await findAuthUserIdByEmail(admin, email));

  if (supabaseId) {
    const { error } = await admin.auth.admin.deleteUser(supabaseId);
    if (error) {
      console.log(`   ✖ Échec suppression Supabase Auth : ${error.message}`);
    } else {
      console.log(`   ✅ User Supabase Auth supprimé (${supabaseId})`);
    }
  } else {
    console.log("   ⚠️  Aucun user Supabase Auth trouvé pour cet email.");
  }

  console.log("\n✅ Terminé.\n");
}

main()
  .catch((err) => {
    console.error("\n💥 Erreur :", err);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
