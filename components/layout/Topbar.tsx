"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import {
  Menu,
  Bell,
  HelpCircle,
  Settings as SettingsIcon,
  LogOut,
} from "lucide-react";

import { createClient } from "@/lib/supabase/client";
import { useAuth } from "@/lib/hooks/useAuth";
import { SearchCommand } from "@/components/search/SearchCommand";

function getInitials(fullName?: string | null, email?: string | null) {
  if (fullName) {
    const parts = fullName.trim().split(/\s+/).filter(Boolean);
    if (parts.length >= 2) {
      return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
    }
    if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  }
  if (email) return email.slice(0, 2).toUpperCase();
  return "?";
}

export function Topbar({ onMenuClick }: { onMenuClick?: () => void }) {
  const router = useRouter();
  const { user } = useAuth();
  const [open, setOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  const fullName =
    (user?.user_metadata?.full_name as string | undefined) ?? null;
  const email = user?.email ?? null;
  const initials = getInitials(fullName, email);

  useEffect(() => {
    function onClick(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, []);

  async function handleSignOut() {
    const supabase = createClient();
    await supabase.auth.signOut();
    setOpen(false);
    router.push("/login");
    router.refresh();
  }

  return (
    <header className="flex h-16 shrink-0 items-center gap-3 px-4 md:gap-4 md:px-10">
      {/* Hamburger + logo (mobile uniquement) */}
      <div className="flex items-center gap-2 md:hidden">
        <button
          type="button"
          onClick={onMenuClick}
          aria-label="Open menu"
          className="flex h-9 w-9 items-center justify-center rounded-lg text-on-surface-variant transition-colors hover:bg-surface-low"
        >
          <Menu className="h-5 w-5" strokeWidth={1.75} />
        </button>
        <Image
          src="/logo.png"
          alt="Kora"
          width={32}
          height={33}
          priority
          className="h-8 w-auto"
        />
      </div>

      {/* Recherche centrée (desktop) */}
      <SearchCommand />

      {/* Actions à droite */}
      <div className="ml-auto flex items-center gap-3 md:ml-0">
        <button
          type="button"
          aria-label="Notifications"
          className="hidden h-9 w-9 items-center justify-center rounded-lg text-on-surface-variant transition-colors hover:bg-surface-low md:flex"
        >
          <Bell className="h-5 w-5" strokeWidth={1.75} />
        </button>
        <button
          type="button"
          aria-label="Aide"
          className="hidden h-9 w-9 items-center justify-center rounded-lg text-on-surface-variant transition-colors hover:bg-surface-low md:flex"
        >
          <HelpCircle className="h-5 w-5" strokeWidth={1.75} />
        </button>

        <button
          type="button"
          onClick={() => router.push("/projects?new=1")}
          className="font-inter hidden rounded-lg bg-primary px-[18px] py-2.5 text-sm font-medium text-white transition-all duration-150 hover:-translate-y-px hover:shadow-card md:block"
        >
          New Project
        </button>

        {/* Avatar + dropdown */}
        <div className="relative" ref={menuRef}>
          <button
            type="button"
            onClick={() => setOpen((v) => !v)}
            aria-label="User menu"
            aria-expanded={open}
            className="font-inter flex h-9 w-9 items-center justify-center rounded-full bg-primary-container text-sm font-semibold text-white transition-transform hover:scale-105"
          >
            {initials}
          </button>

          {open && (
            <div className="absolute right-0 top-full z-50 mt-2 w-[200px] overflow-hidden rounded-xl border border-[#c4c8be] bg-white shadow-[0_8px_30px_rgba(0,0,0,0.10)]">
              <div className="px-4 py-3">
                <p className="font-inter truncate text-sm font-medium text-[#1b1c1a]">
                  {fullName ?? "Account"}
                </p>
                {email && (
                  <p className="font-inter truncate text-xs text-[#444841]">
                    {email}
                  </p>
                )}
              </div>
              <div className="h-px bg-[#c4c8be]/60" />
              <Link
                href="/settings"
                onClick={() => setOpen(false)}
                className="font-inter flex items-center gap-2 px-4 py-2.5 text-sm text-[#1b1c1a] transition-colors hover:bg-[#f5f3f0]"
              >
                <SettingsIcon className="h-4 w-4 text-[#444841]" />
                Settings
              </Link>
              <button
                type="button"
                onClick={handleSignOut}
                className="font-inter flex w-full items-center gap-2 px-4 py-2.5 text-left text-sm text-[#ba1a1a] transition-colors hover:bg-[#f5f3f0]"
              >
                <LogOut className="h-4 w-4" />
                Sign out
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
