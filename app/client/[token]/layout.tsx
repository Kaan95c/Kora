import type { ReactNode } from "react";

export const metadata = {
  title: "Client portal — Kora",
  robots: { index: false, follow: false },
};

// Coque de fond du portail client (public). Le branding studio + la navigation
// sont rendus par <PortalShell> dans chaque page (qui dépendent du token).
export default function ClientPortalLayout({
  children,
}: {
  children: ReactNode;
}) {
  return <div className="min-h-screen bg-[#fbf9f5]">{children}</div>;
}
