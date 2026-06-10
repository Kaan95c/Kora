import type { User } from "@supabase/supabase-js";

import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma";

/**
 * Résout l'utilisateur Supabase courant (depuis les cookies) et la Company
 * dont il est propriétaire. Utilisé par les routes API authentifiées.
 *
 * - user = null  → pas de session (répondre 401)
 * - company = null → user authentifié mais sans Company (onboarding incomplet)
 */
export async function getAuthedCompany(): Promise<{
  user: User | null;
  company: Awaited<ReturnType<typeof prisma.company.findFirst>>;
}> {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return { user: null, company: null };

  const company = await prisma.company.findFirst({
    where: { owner: { supabaseId: user.id } },
  });

  return { user, company };
}
