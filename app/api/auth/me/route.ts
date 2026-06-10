import { NextResponse } from "next/server";

import { getAuthedCompany } from "@/lib/auth";
import { planLimitsForClient } from "@/lib/plan-limits";

export const dynamic = "force-dynamic";

/**
 * Renvoie l'utilisateur Supabase courant + sa Company.
 * Consommé par le AuthProvider côté client.
 */
export async function GET() {
  const { user, company } = await getAuthedCompany();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  return NextResponse.json({
    user: {
      id: user.id,
      email: user.email,
      user_metadata: user.user_metadata,
    },
    company,
    limits: company ? planLimitsForClient(company.plan) : null,
  });
}
