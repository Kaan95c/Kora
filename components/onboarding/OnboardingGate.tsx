"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

import { useAuth } from "@/lib/hooks/useAuth";

/**
 * Renvoie vers le wizard `/onboarding` tout compte authentifié dont la Company
 * n'a pas terminé l'onboarding (`onboardedAt === null`). Couvre le cas « l'onglet
 * a été fermé en plein wizard » : à la prochaine visite de l'app, on reprend.
 *
 * Monté dans le layout `(app)` (sous le AuthProvider). Ne rend rien.
 * Les comptes existants ont été marqués onboardés (backfill) → pas impactés.
 */
export function OnboardingGate() {
  const router = useRouter();
  const { isLoading, user, company } = useAuth();

  useEffect(() => {
    if (!isLoading && user && company && !company.onboardedAt) {
      router.replace("/onboarding");
    }
  }, [isLoading, user, company, router]);

  return null;
}
