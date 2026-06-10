import { NextResponse } from "next/server";
import { createElement } from "react";
import type Stripe from "stripe";

import { prisma } from "@/lib/prisma";
import { getStripe } from "@/lib/stripe";
import { planFromPriceId } from "@/lib/billing-server";
import { sendEmail } from "@/lib/email";
import { PaymentReceiptEmail } from "@/components/emails/PaymentReceiptEmail";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const eur = (n: number) =>
  new Intl.NumberFormat("fr-FR", { style: "currency", currency: "EUR" }).format(n);

function mapMethod(types?: string[]): "CARD" | "SEPA" | null {
  if (!types) return null;
  if (types.includes("card")) return "CARD";
  if (types.includes("sepa_debit")) return "SEPA";
  return null;
}

/**
 * Synchronise l'abonnement SaaS Stripe vers la Company.
 * Mapping company : metadata.companyId (posé à la création) sinon stripeCustomerId.
 */
async function syncSubscription(sub: Stripe.Subscription) {
  const companyId = sub.metadata?.companyId;
  const customerId =
    typeof sub.customer === "string" ? sub.customer : sub.customer.id;
  const item = sub.items.data[0];
  const priceId = item?.price.id ?? null;
  const mappedPlan = planFromPriceId(priceId);
  const downgraded =
    sub.status === "canceled" || sub.status === "incomplete_expired";

  // current_period_end est top-level ou porté par l'item selon la version d'API.
  const periodEndUnix =
    (sub as { current_period_end?: number }).current_period_end ??
    (item as { current_period_end?: number } | undefined)?.current_period_end ??
    null;

  const data = {
    stripeCustomerId: customerId,
    stripeSubscriptionId: sub.id,
    stripePriceId: priceId,
    subscriptionStatus: sub.status,
    currentPeriodEnd: periodEndUnix ? new Date(periodEndUnix * 1000) : null,
    cancelAtPeriodEnd: sub.cancel_at_period_end,
    plan: downgraded ? "FREE" : mappedPlan,
  };

  if (companyId) {
    await prisma.company.updateMany({ where: { id: companyId }, data });
  } else {
    await prisma.company.updateMany({ where: { stripeCustomerId: customerId }, data });
  }
}

// POST : reçoit les events Stripe. Vérifie la signature puis traite payment_intent.succeeded.
export async function POST(request: Request) {
  const sig = request.headers.get("stripe-signature");
  const secret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!sig || !secret) {
    return NextResponse.json({ error: "Missing signature" }, { status: 400 });
  }

  const raw = await request.text();
  const stripe = getStripe();

  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(raw, sig, secret);
  } catch {
    return NextResponse.json({ error: "Invalid signature" }, { status: 400 });
  }

  if (event.type === "payment_intent.succeeded") {
    const pi = event.data.object as Stripe.PaymentIntent;
    const documentId = pi.metadata?.documentId;
    const companyId = pi.metadata?.companyId;
    const method = mapMethod(pi.payment_method_types);

    // 1) Le paiement → PAID (+ paidAt + méthode).
    await prisma.payment.updateMany({
      where: { stripePaymentIntentId: pi.id },
      data: {
        status: "PAID",
        paidAt: new Date(),
        ...(method ? { method } : {}),
      },
    });

    // 2) La facture liée → PAID (scopé company via metadata) + reçu par email.
    if (documentId) {
      await prisma.document.updateMany({
        where: companyId
          ? { id: documentId, companyId }
          : { id: documentId },
        data: { status: "PAID" },
      });

      const doc = await prisma.document.findUnique({
        where: { id: documentId },
        select: {
          number: true,
          total: true,
          contact: { select: { email: true, firstName: true } },
          company: { select: { name: true } },
        },
      });

      if (doc?.contact?.email) {
        const origin = new URL(request.url).origin;
        await sendEmail({
          to: doc.contact.email,
          subject: `Payment received — invoice ${doc.number ?? ""}`.trim(),
          react: createElement(PaymentReceiptEmail, {
            studioName: doc.company.name,
            clientName: doc.contact.firstName,
            invoiceNumber: doc.number ?? documentId.slice(0, 8).toUpperCase(),
            amount: eur(doc.total ?? pi.amount / 100),
            invoiceUrl: `${origin}/api/pay/${documentId}/invoice`,
          }),
        });
      }
    }
  }

  // ── Abonnements SaaS (le studio paie Kora) ──────────────────────────────
  if (event.type === "checkout.session.completed") {
    const session = event.data.object as Stripe.Checkout.Session;
    if (session.mode === "subscription" && session.subscription) {
      const subId =
        typeof session.subscription === "string"
          ? session.subscription
          : session.subscription.id;
      const sub = await stripe.subscriptions.retrieve(subId);
      await syncSubscription(sub);
    }
  }

  if (
    event.type === "customer.subscription.created" ||
    event.type === "customer.subscription.updated" ||
    event.type === "customer.subscription.deleted"
  ) {
    await syncSubscription(event.data.object as Stripe.Subscription);
  }

  // Échec de prélèvement d'abonnement → marque la Company past_due.
  // (Redondant avec subscription.updated, mais explicite et conforme.)
  if (event.type === "invoice.payment_failed") {
    const invoice = event.data.object as Stripe.Invoice;
    const customerId =
      typeof invoice.customer === "string"
        ? invoice.customer
        : invoice.customer?.id;
    if (customerId) {
      await prisma.company.updateMany({
        where: { stripeCustomerId: customerId },
        data: { subscriptionStatus: "past_due" },
      });
    }
  }

  return NextResponse.json({ received: true });
}
