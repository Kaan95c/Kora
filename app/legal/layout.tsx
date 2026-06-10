import type { ReactNode } from "react";
import Link from "next/link";

/**
 * Coque des pages légales (`/legal/*`) — publique, hors groupe `(app)` donc
 * sans AppShell (ni sidebar ni topbar). Le middleware laisse passer `/legal/*`
 * (hors `PROTECTED_PREFIXES`).
 */

const LINKS = [
  { href: "/legal/mentions", label: "Mentions légales" },
  { href: "/legal/privacy", label: "Confidentialité" },
  { href: "/legal/cgv", label: "CGV" },
];

export default function LegalLayout({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-screen bg-[#fbf9f5] text-[#1b1c1a]">
      <header className="sticky top-0 z-10 border-b border-[#e0e4de] bg-[#fbf9f5]/85 backdrop-blur">
        <div className="mx-auto flex max-w-[820px] items-center justify-between gap-4 px-6 py-4">
          <Link href="/" className="flex items-center gap-2.5">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/landing/logo.png" alt="Kora" className="h-7 w-auto" />
            <span className="font-manrope text-lg font-bold tracking-[0.12em] text-[#52634c]">
              KORA
            </span>
          </Link>
          <Link
            href="/"
            className="font-inter text-sm font-medium text-[#444841] transition-colors hover:text-[#52634c]"
          >
            ← Retour à l&apos;accueil
          </Link>
        </div>
      </header>

      <main className="mx-auto max-w-[820px] px-6 py-12">
        <nav className="mb-8 flex flex-wrap gap-2">
          {LINKS.map((l) => (
            <Link
              key={l.href}
              href={l.href}
              className="font-inter rounded-full border border-[#c4c8be] bg-white px-3.5 py-1.5 text-sm text-[#444841] transition-colors hover:border-[#52634c] hover:text-[#52634c]"
            >
              {l.label}
            </Link>
          ))}
        </nav>
        {children}
      </main>

      <footer className="border-t border-[#e0e4de]">
        <div className="mx-auto flex max-w-[820px] flex-col items-center gap-1 px-6 py-8 text-center">
          <p className="font-inter text-sm text-[#747870]">
            © 2026 Kora — Kaan Tekten
          </p>
          <p className="font-inter text-xs text-[#747870]">
            app.kora-app.fr ·{" "}
            <a
              href="mailto:hello@kora-app.fr"
              className="text-[#52634c] hover:underline"
            >
              hello@kora-app.fr
            </a>
          </p>
        </div>
      </footer>
    </div>
  );
}
