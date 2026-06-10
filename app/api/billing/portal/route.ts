import { NextResponse } from "next/server";

import { getAuthedCompany } from "@/lib/auth";
import { getStripe } from "@/lib/stripe";
import { originFromRequest } from "@/lib/billing-server";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

/**
 * Ouvre le Stripe Customer Portal (gérer / changer / annuler l'abonnement,
 * mettre à jour la CB, télécharger les factures). Renvoie l'URL de redirection.
 */
export async function POST(request: Request) {
  const { user, company } = await getAuthedCompany();
  if (!user || !company) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (!company.stripeCustomerId) {
    return NextResponse.json(
      { error: "No billing account yet" },
      { status: 400 }
    );
  }

  const stripe = getStripe();
  const origin = originFromRequest(request);

  const session = await stripe.billingPortal.sessions.create({
    customer: company.stripeCustomerId,
    return_url: `${origin}/settings/billing`,
  });

  return NextResponse.json({ url: session.url });
}
