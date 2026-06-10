"use client";

import { useEffect, useState, type ReactNode } from "react";
import { usePathname } from "next/navigation";

import { Sidebar } from "@/components/layout/Sidebar";
import { Topbar } from "@/components/layout/Topbar";

/**
 * Coque applicative (client) : détient l'état d'ouverture de la sidebar mobile
 * et le partage entre le hamburger (Topbar) et la Sidebar (overlay).
 * Sur desktop (md+), la sidebar redevient statique → comportement inchangé.
 */
export function AppShell({ children }: { children: ReactNode }) {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();

  // Ferme la sidebar mobile à chaque navigation.
  useEffect(() => {
    setOpen(false);
  }, [pathname]);

  return (
    <div className="flex h-screen overflow-hidden bg-background">
      <Sidebar open={open} onClose={() => setOpen(false)} />
      <div className="flex min-w-0 flex-1 flex-col">
        <Topbar onMenuClick={() => setOpen(true)} />
        <main className="flex-1 overflow-y-auto px-4 pb-10 pt-6 md:px-10 md:pt-8">
          {children}
        </main>
      </div>
    </div>
  );
}
