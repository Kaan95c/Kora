"use client";

import type { ReactNode } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useTranslations } from "next-intl";
import { User, Building2, Palette, CreditCard, type LucideIcon } from "lucide-react";

import { cn } from "@/lib/utils";

type NavItem = { key: string; href: string; icon: LucideIcon };

const NAV: NavItem[] = [
  { key: "navGeneral", href: "/settings/general", icon: User },
  { key: "navStudio", href: "/settings/studio", icon: Building2 },
  { key: "navBranding", href: "/settings/branding", icon: Palette },
  { key: "navBilling", href: "/settings/billing", icon: CreditCard },
];

export default function SettingsLayout({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const t = useTranslations("settings");

  return (
    <div className="flex flex-col gap-6 md:flex-row md:gap-8">
      {/* Sous-navigation */}
      <aside className="w-full shrink-0 md:w-[180px]">
        <nav className="flex flex-row gap-1 overflow-x-auto md:flex-col">
          {NAV.map((item) => {
            const active = pathname === item.href;
            const Icon = item.icon;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "font-inter flex shrink-0 items-center gap-3 whitespace-nowrap rounded-lg px-3 py-2.5 text-sm font-medium transition-colors duration-150",
                  active
                    ? "bg-primary/10 text-primary"
                    : "text-on-surface-variant hover:bg-primary/[0.06]"
                )}
              >
                <Icon
                  className={cn(
                    "h-[18px] w-[18px] shrink-0",
                    active ? "text-primary" : "text-on-surface-variant"
                  )}
                  strokeWidth={1.75}
                />
                {t(item.key)}
              </Link>
            );
          })}
        </nav>
      </aside>

      {/* Contenu */}
      <div className="min-w-0 flex-1">{children}</div>
    </div>
  );
}
