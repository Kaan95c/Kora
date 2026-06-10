import { NextResponse } from "next/server";
import { createElement } from "react";
import type Stripe from "stripe";

import { prisma } from "@/lib/prisma";
import { getStripe } from "@/lib/stripe";
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

  return NextResponse.json({ received: true });
}
