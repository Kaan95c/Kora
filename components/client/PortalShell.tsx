import Link from "next/link";
import type { ReactNode } from "react";
import { FileText, CalendarDays, LayoutGrid, ShieldCheck } from "lucide-react";

import { clientPortalPath } from "@/lib/client-portal";

type Active = "overview" | "documents" | "appointments";

const TABS: { key: Active; label: string; icon: typeof FileText; href: (t: string) => string }[] = [
  { key: "overview", label: "Overview", icon: LayoutGrid, href: (t) => clientPortalPath(t) },
  { key: "documents", label: "Documents", icon: FileText, href: (t) => `${clientPortalPath(t)}/documents` },
  {
    key: "appointments",
    label: "Appointments",
    icon: CalendarDays,
    href: (t) => `${clientPortalPath(t)}/appointments`,
  },
];

/**
 * Coque brandée du portail client : en-tête (logo / nom du studio + couleur
 * primaire dynamique), navigation par onglets et pied de page. Server component
 * (aucune interactivité). La couleur est appliquée en style inline car Tailwind
 * ne peut pas générer de classes à partir d'une valeur runtime.
 */
export function PortalShell({
  companyName,
  logoUrl,
  primaryColor,
  token,
  active,
  children,
}: {
  companyName: string;
  logoUrl: string | null;
  primaryColor: string;
  token: string;
  active: Active;
  children: ReactNode;
}) {
  return (
    <div className="mx-auto w-full max-w-4xl px-4 py-8 sm:py-10">
      {/* En-tête brandé */}
      <header className="rounded-2xl bg-white p-6 shadow-card">
        <div className="flex items-center justify-between gap-4">
          <div className="flex min-w-0 items-center gap-3">
            {logoUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={logoUrl}
                alt={companyName}
                className="h-9 w-auto max-w-[160px] object-contain"
              />
            ) : (
              <span
                className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg font-manrope text-sm font-bold text-white"
                style={{ backgroundColor: primaryColor }}
              >
                {companyName.charAt(0).toUpperCase()}
              </span>
            )}
            <span className="font-manrope truncate text-lg font-semibold text-[#1b1c1a]">
              {companyName}
            </span>
          </div>

          <span className="font-inter hidden items-center gap-1.5 rounded-full bg-[#efeeea] px-3 py-1 text-xs font-semibold text-[#444841] sm:inline-flex">
            <ShieldCheck className="h-3.5 w-3.5" strokeWidth={1.75} />
            Client portal
          </span>
        </div>

        {/* Onglets */}
        <nav className="mt-6 flex gap-1 border-t border-[#efeeea] pt-2">
          {TABS.map((tab) => {
            const isActive = tab.key === active;
            const Icon = tab.icon;
            return (
              <Link
                key={tab.key}
                href={tab.href(token)}
                className={`font-inter relative flex items-center gap-1.5 px-3 py-2.5 text-sm font-medium transition-colors sm:px-4 ${
                  isActive ? "" : "text-[#444841] hover:text-[#1b1c1a]"
                }`}
                style={isActive ? { color: primaryColor } : undefined}
              >
                <Icon className="h-4 w-4" strokeWidth={1.75} />
                {tab.label}
                {isActive && (
                  <span
                    className="absolute inset-x-2 -bottom-px h-0.5 rounded-full"
                    style={{ backgroundColor: primaryColor }}
                  />
                )}
              </Link>
            );
          })}
        </nav>
      </header>

      {/* Contenu */}
      <main className="mt-6">{children}</main>

      {/* Pied de page */}
      <footer className="mt-10 flex flex-col items-center gap-1 pb-2 text-center">
        <p className="font-inter text-xs text-outline">
          Powered by <span className="font-semibold text-[#444841]">Kora</span>
        </p>
        <p className="font-inter text-[11px] text-outline">
          This is a private link — please don&apos;t share it.
        </p>
      </footer>
    </div>
  );
}
