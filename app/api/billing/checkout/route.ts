import { NextResponse } from "next/server";

import { getAuthedCompany } from "@/lib/auth";
import { getStripe } from "@/lib/stripe";
import {
  getOrCreateStripeCustomer,
  originFromRequest,
  priceIdForPlan,
  type PaidPlan,
} from "@/lib/billing-server";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

/**
 * Crée une session Stripe Checkout (mode subscription) pour que le studio
 * s'abonne à un plan payant. Renvoie l'URL de redirection.
 */
export async function POST(request: Request) {
  const { user, company } = await getAuthedCompany();
  if (!user || !company) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body: { plan?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const plan = body.plan;
  if (plan !== "STARTER" && plan !== "PRO") {
    return NextResponse.json({ error: "Invalid plan" }, { status: 400 });
  }

  const stripe = getStripe();
  const customerId = await getOrCreateStripeCustomer(company);
  const origin = originFromRequest(request);

  const session = await stripe.checkout.sessions.create({
    mode: "subscription",
    customer: customerId,
    line_items: [{ price: priceIdForPlan(plan as PaidPlan), quantity: 1 }],
    success_url: `${origin}/settings/billing?status=success`,
    cancel_url: `${origin}/settings/billing?status=cancel`,
    subscription_data: { metadata: { companyId: company.id } },
    metadata: { companyId: company.id },
    allow_promotion_codes: true,
  });

  return NextResponse.json({ url: session.url });
}
