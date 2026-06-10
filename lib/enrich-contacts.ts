import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

/**
 * Script d'enrichissement NON DESTRUCTIF.
 *
 * Remplit les nouveaux champs (phone / companyName / address / notes) des
 * contacts déjà présents dans la company "Boutique Studio", en les ciblant
 * par email. Aucune suppression : on préserve le rattachement owner du user
 * de test (contrairement à `db:seed` qui fait des deleteMany). Idempotent.
 */

const ENRICHMENTS: {
  email: string;
  phone: string;
  companyName: string;
  address: string;
  notes: string;
}[] = [
  {
    email: "elena@velvetrose.com",
    phone: "+33 6 24 51 80 12",
    companyName: "Velvet Rose",
    address: "12 Rue des Lilas, 75011 Paris",
    notes: "VIP client — prefers email over calls. Rebrand launching Q4.",
  },
  {
    email: "marcus@oasisspa.com",
    phone: "+33 6 88 32 14 09",
    companyName: "Oasis Spa",
    address: "8 Avenue du Parc, 69006 Lyon",
    notes: "Spa chain owner. Digital revamp in progress.",
  },
  {
    email: "sophie@nara-arch.com",
    phone: "+33 7 14 09 66 23",
    companyName: "Nara Architecture",
    address: "24 Quai de la Loire, 44000 Nantes",
    notes: "Architecture studio. Considering full website package.",
  },
  {
    email: "james@elysian.com",
    phone: "+33 6 51 77 40 88",
    companyName: "Elysian",
    address: "3 Place Bellecour, 33000 Bordeaux",
    notes: "New lead from referral. Awaiting first call.",
  },
];

async function main() {
  console.log("✨ Enrichissement des contacts — démarrage…");

  const company = await prisma.company.findFirst({
    where: { name: "Boutique Studio" },
    select: { id: true },
  });

  if (!company) {
    console.warn(
      "⚠️  Company \"Boutique Studio\" introuvable — rien à enrichir."
    );
    return;
  }

  let updated = 0;
  for (const e of ENRICHMENTS) {
    const res = await prisma.contact.updateMany({
      where: { companyId: company.id, email: e.email },
      data: {
        phone: e.phone,
        companyName: e.companyName,
        address: e.address,
        notes: e.notes,
      },
    });
    if (res.count > 0) {
      updated += res.count;
      console.log(`   • ${e.email} → enrichi (${res.count})`);
    } else {
      console.log(`   • ${e.email} → non trouvé (ignoré)`);
    }
  }

  console.log(`✅ Terminé : ${updated} contact(s) enrichi(s).`);
}

main()
  .catch((err) => {
    console.error("❌ Enrichissement échoué :", err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
