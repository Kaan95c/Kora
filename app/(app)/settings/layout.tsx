"use client";

import type { ReactNode } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { User, Building2, Palette, CreditCard, type LucideIcon } from "lucide-react";

import { cn } from "@/lib/utils";

type NavItem = { label: string; href: string; icon: LucideIcon };

const NAV: NavItem[] = [
  { label: "General", href: "/settings/general", icon: User },
  { label: "Studio", href: "/settings/studio", icon: Building2 },
  { label: "Branding", href: "/settings/branding", icon: Palette },
  { label: "Billing", href: "/settings/billing", icon: CreditCard },
];

export default function SettingsLayout({ children }: { children: ReactNode }) {
  const pathname = usePathname();

  return (
    <div className="flex gap-8">
      {/* Sous-navigation */}
      <aside className="w-[180px] shrink-0">
        <nav className="flex flex-col gap-1">
          {NAV.map((item) => {
            const active = pathname === item.href;
            const Icon = item.icon;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "font-inter flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors duration-150",
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
                {item.label}
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
