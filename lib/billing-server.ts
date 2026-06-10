import type { Plan } from "@prisma/client";

import { prisma } from "@/lib/prisma";
import { getStripe } from "@/lib/stripe";

/**
 * Helpers serveur des abonnements SaaS (le studio paie Kora).
 * Ne JAMAIS importer côté client (utilise la clé Stripe secrète + Prisma).
 */

export type PaidPlan = "STARTER" | "PRO";

/**
 * Limites par plan. Définies ici dès maintenant ; l'enforcement (gating) sera
 * branché dans un lot ultérieur. `Infinity` = illimité.
 */
export const PLAN_LIMITS = {
  FREE: {
    projects: 3,
    contacts: 5,
    documents: 3,
    automations: 0,
    clientPortal: false,
    customPdfLogo: false,
  },
  STARTER: {
    projects: 15,
    contacts: 50,
    documents: 30,
    automations: 3,
    clientPortal: true,
    customPdfLogo: false,
  },
  PRO: {
    projects: Infinity,
    contacts: Infinity,
    documents: Infinity,
    automations: Infinity,
    clientPortal: true,
    customPdfLogo: true,
  },
} as const satisfies Record<Plan, unknown>;

/** Price ID Stripe (env) pour un plan payant. */
export function priceIdForPlan(plan: PaidPlan): string {
  const id =
    plan === "STARTER"
      ? process.env.STRIPE_PRICE_STARTER
      : process.env.STRIPE_PRICE_PRO;
  if (!id) {
    throw new Error(`Missing Stripe price id for plan ${plan} (env STRIPE_PRICE_${plan})`);
  }
  return id;
}

/** Déduit le plan Kora à partir d'un price ID Stripe. Inconnu → FREE. */
export function planFromPriceId(priceId: string | null | undefined): Plan {
  if (priceId && priceId === process.env.STRIPE_PRICE_STARTER) return "STARTER";
  if (priceId && priceId === process.env.STRIPE_PRICE_PRO) return "PRO";
  return "FREE";
}

/** Récupère (ou crée + persiste) le Stripe Customer de la company. */
export async function getOrCreateStripeCustomer(company: {
  id: string;
  name: string;
  email: string | null;
  stripeCustomerId: string | null;
}): Promise<string> {
  if (company.stripeCustomerId) return company.stripeCustomerId;

  const stripe = getStripe();
  const customer = await stripe.customers.create({
    name: company.name,
    email: company.email ?? undefined,
    metadata: { companyId: company.id },
  });

  await prisma.company.update({
    where: { id: company.id },
    data: { stripeCustomerId: customer.id },
  });

  return customer.id;
}

/**
 * Origine absolue de la requête, robuste derrière le proxy Vercel
 * (x-forwarded-*) — sert à construire les URLs success/cancel/return Stripe.
 */
export function originFromRequest(request: Request): string {
  const proto = request.headers.get("x-forwarded-proto") ?? "https";
  const host =
    request.headers.get("x-forwarded-host") ?? request.headers.get("host");
  if (host) return `${proto}://${host}`;
  return new URL(request.url).origin;
}
