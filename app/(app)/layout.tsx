import type { ReactNode } from "react";

import { AppShell } from "@/components/layout/AppShell";
import { AuthProvider } from "@/components/providers/AuthProvider";
import { OnboardingGate } from "@/components/onboarding/OnboardingGate";

export default function AppLayout({ children }: { children: ReactNode }) {
  return (
    <AuthProvider>
      <OnboardingGate />
      <AppShell>{children}</AppShell>
    </AuthProvider>
  );
}
