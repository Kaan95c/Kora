import type { ReactNode } from "react";

import { AuthProvider } from "@/components/providers/AuthProvider";

/**
 * Layout du wizard d'onboarding — hors du groupe `(app)` (donc pas d'AppShell :
 * ni sidebar ni topbar, expérience focalisée). On garde le `AuthProvider` pour
 * lire `useAuth()` (user + company.onboardedAt + préremplissage du nom de studio).
 */
export default function OnboardingLayout({ children }: { children: ReactNode }) {
  return <AuthProvider>{children}</AuthProvider>;
}
