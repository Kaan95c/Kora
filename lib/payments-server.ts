import { prisma } from "@/lib/prisma";
import { getStripe } from "@/lib/stripe";

// Données minimales d'un Document nécessaires pour créer un PaymentIntent.
export type DocForIntent = {
  id: string;
  total: number | null;
  companyId: string;
  contactId: string | null;
  projectId: string | null;
};

/**
 * Renvoie un PaymentIntent réutilisable pour ce document :
 * - réutilise celui déjà rattaché (via `Payment.stripePaymentIntentId`) s'il est encore valide,
 * - sinon en crée un (EUR, méthodes automatiques) + (re)lie une ligne `Payment` (PENDING).
 * Idempotent → appelable depuis create-intent (authed) et la page /pay publique.
 */
export async function ensurePaymentIntent(
  doc: DocForIntent
): Promise<{ clientSecret: string | null; paymentIntentId: string }> {
  const stripe = getStripe();
  const amount = Math.round((doc.total ?? 0) * 100);

  const existing = await prisma.payment.findFirst({
    where: { documentId: doc.id, stripePaymentIntentId: { not: null } },
    orderBy: { createdAt: "desc" },
  });

  if (existing?.stripePaymentIntentId) {
    try {
      const pi = await stripe.paymentIntents.retrieve(
        existing.stripePaymentIntentId
      );
      if (pi.status !== "canceled") {
        // Ajuste le montant si la facture a changé (sauf si déjà payé).
        if (pi.status !== "succeeded" && amount > 0 && pi.amount !== amount) {
          const updated = await stripe.paymentIntents.update(pi.id, { amount });
          return {
            clientSecret: updated.client_secret,
            paymentIntentId: updated.id,
          };
        }
        return { clientSecret: pi.client_secret, paymentIntentId: pi.id };
      }
    } catch {
      // PI introuvable → on en recrée un ci-dessous.
    }
  }

  const pi = await stripe.paymentIntents.create({
    amount,
    currency: "eur",
    automatic_payment_methods: { enabled: true },
    metadata: { documentId: doc.id, companyId: doc.companyId },
  });

  if (existing) {
    await prisma.payment.update({
      where: { id: existing.id },
      data: {
        stripePaymentIntentId: pi.id,
        amount: doc.total ?? 0,
        status: "PENDING",
      },
    });
  } else {
    await prisma.payment.create({
      data: {
        companyId: doc.companyId,
        documentId: doc.id,
        contactId: doc.contactId,
        projectId: doc.projectId,
        amount: doc.total ?? 0,
        status: "PENDING",
        stripePaymentIntentId: pi.id,
      },
    });
  }

  return { clientSecret: pi.client_secret, paymentIntentId: pi.id };
}
