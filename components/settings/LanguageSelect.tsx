"use client";

import { useLocale, useTranslations } from "next-intl";
import { useRouter } from "next/navigation";
import { useTransition } from "react";

/**
 * Sélecteur de langue (Settings → General).
 * Au changement : écrit le cookie `kora-locale` (source SSR) + localStorage
 * (miroir) + persiste `Company.language` en DB, puis `router.refresh()` →
 * re-render serveur instantané avec la nouvelle langue (sans reload complet).
 */
export function LanguageSelect() {
  const locale = useLocale();
  const t = useTranslations("settings");
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  function change(next: string) {
    if (next === locale) return;
    document.cookie = `kora-locale=${next}; path=/; max-age=31536000; samesite=lax`;
    try {
      localStorage.setItem("kora-locale", next);
    } catch {
      /* localStorage indisponible → on ignore (le cookie suffit) */
    }
    // Persistance best-effort (ne bloque pas le changement).
    fetch("/api/settings/language", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ language: next }),
    }).catch(() => {});
    startTransition(() => router.refresh());
  }

  return (
    <section className="mt-6 rounded-2xl bg-white p-6 shadow-card">
      <h2 className="font-manrope text-lg font-semibold text-[#1b1c1a]">
        {t("languageTitle")}
      </h2>
      <p className="font-inter mt-1 text-sm text-[#444841]">{t("languageHelp")}</p>
      <select
        value={locale}
        onChange={(e) => change(e.target.value)}
        disabled={pending}
        className="font-inter mt-4 h-11 w-full max-w-xs rounded-lg border border-[#c4c8be] bg-white px-3 text-sm text-[#1b1c1a] outline-none transition-colors focus:border-[#52634c] disabled:opacity-60"
      >
        <option value="fr">🇫🇷 Français</option>
        <option value="en">🇬🇧 English</option>
      </select>
    </section>
  );
}
