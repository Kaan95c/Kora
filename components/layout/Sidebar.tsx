"use client";

import { useEffect, useRef, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  Users,
  Briefcase,
  FileText,
  Inbox,
  Calendar,
  TrendingUp,
  Zap,
  Settings,
  Plus,
  FolderPlus,
  UserPlus,
  CalendarPlus,
  type LucideIcon,
} from "lucide-react";

import { cn } from "@/lib/utils";

const quickActions: NavItem[] = [
  { label: "Nouveau projet", href: "/projects?new=1", icon: FolderPlus },
  { label: "Nouveau contact", href: "/contacts?new=1", icon: UserPlus },
  { label: "Nouveau document", href: "/documents?new=1", icon: FileText },
  { label: "Nouveau RDV", href: "/scheduler?new=1", icon: CalendarPlus },
];

function QuickAction({ onNavigate }: { onNavigate?: () => void }) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function onClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    document.addEventListener("mousedown", onClick);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onClick);
      document.removeEventListener("keydown", onKey);
    };
  }, []);

  return (
    <div className="relative" ref={ref}>
      {/* Menu popup (au-dessus du bouton) */}
      {open && (
        <div className="absolute bottom-full left-0 right-0 mb-2 overflow-hidden rounded-xl border border-[#c4c8be] bg-white shadow-[0_8px_30px_rgba(0,0,0,0.12)]">
          {quickActions.map((a) => {
            const Icon = a.icon;
            return (
              <Link
                key={a.href}
                href={a.href}
                onClick={() => {
                  setOpen(false);
                  onNavigate?.();
                }}
                className="font-inter flex items-center gap-2.5 px-4 py-2.5 text-sm text-[#1b1c1a] transition-colors hover:bg-[#f5f3f0]"
              >
                <Icon className="h-4 w-4 text-[#444841]" strokeWidth={1.75} />
                {a.label}
              </Link>
            );
          })}
        </div>
      )}

      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        className="font-manrope flex w-full items-center justify-center gap-2 rounded-full bg-[#1b1c1a] px-5 py-2.5 text-sm font-medium text-white transition-all duration-150 hover:-translate-y-px hover:opacity-90"
      >
        <Plus className="h-4 w-4" strokeWidth={2} />
        Quick Action
      </button>
    </div>
  );
}

type NavItem = {
  label: string;
  href: string;
  icon: LucideIcon;
};

const mainNav: NavItem[] = [
  { label: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
  { label: "Contacts", href: "/contacts", icon: Users },
  { label: "Projects", href: "/projects", icon: Briefcase },
  { label: "Documents", href: "/documents", icon: FileText },
  { label: "Inbox", href: "/inbox", icon: Inbox },
  { label: "Scheduler", href: "/scheduler", icon: Calendar },
  { label: "Finance", href: "/finance", icon: TrendingUp },
  { label: "Automations", href: "/automations", icon: Zap },
];

const settingsNav: NavItem = {
  label: "Settings",
  href: "/settings",
  icon: Settings,
};

function NavLink({
  item,
  onNavigate,
}: {
  item: NavItem;
  onNavigate?: () => void;
}) {
  const pathname = usePathname();
  const active =
    pathname === item.href || pathname.startsWith(`${item.href}/`);
  const Icon = item.icon;

  return (
    <Link
      href={item.href}
      onClick={onNavigate}
      className={cn(
        "font-inter flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors duration-150",
        active
          ? "bg-primary/10 text-primary"
          : "text-on-surface-variant hover:bg-primary/[0.06]"
      )}
    >
      <Icon
        className={cn(
          "h-5 w-5 shrink-0",
          active ? "text-primary" : "text-on-surface-variant"
        )}
        strokeWidth={1.75}
      />
      {item.label}
    </Link>
  );
}

export function Sidebar({
  open = false,
  onClose,
}: {
  open?: boolean;
  onClose?: () => void;
}) {
  return (
    <>
      {/* Backdrop (mobile, sidebar ouverte) */}
      {open && (
        <div
          onClick={onClose}
          aria-hidden="true"
          className="fixed inset-0 z-40 bg-black/50 md:hidden"
        />
      )}

      <aside
        className={cn(
          "fixed inset-y-0 left-0 z-50 flex w-[220px] shrink-0 flex-col border-r border-outline-variant/50 bg-background transition-transform duration-200 md:static md:z-auto md:translate-x-0",
          open ? "translate-x-0" : "-translate-x-full"
        )}
      >
        {/* Logo */}
      <div className="px-5 pb-4 pt-6">
        <Image
          src="/logo.png"
          alt="Kora"
          width={84}
          height={86}
          priority
          className="h-auto w-[84px]"
        />
        <p className="font-inter mt-2 text-xs font-normal text-on-surface-variant">
          Creative Partner
        </p>
      </div>

      {/* Navigation */}
      <nav className="flex flex-1 flex-col gap-0.5 px-3">
        {mainNav.map((item) => (
          <NavLink key={item.href} item={item} onNavigate={onClose} />
        ))}

        <div className="my-2 border-t border-outline-variant/50" />

        <NavLink item={settingsNav} onNavigate={onClose} />
      </nav>

      {/* Quick Action */}
      <div className="p-4">
        <QuickAction onNavigate={onClose} />
      </div>
      </aside>
    </>
  );
}
