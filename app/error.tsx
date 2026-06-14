"use client";

import { useEffect } from "react";
import Link from "next/link";
import { useTranslations } from "next-intl";

/**
 * Page d'erreur globale (Next.js error boundary).
 * Couvre toutes les routes sous `app/`. Aucune stack trace exposée à l'écran.
 */
export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  const t = useTranslations("errors");

  useEffect(() => {
    // Log côté client (Sentry capture côté serveur via api-handler / config).
    console.error("[kora] erreur de rendu", error.digest ?? error.message);
  }, [error]);

  return (
    <main className="flex min-h-screen flex-col items-center justify-center bg-[#fbf9f5] px-6 text-center">
      <p className="font-inter text-sm font-semibold uppercase tracking-widest text-[#52634c]">
        {t("label")}
      </p>
      <h1 className="font-manrope mt-3 text-[28px] font-bold text-[#1b1c1a] md:text-[36px]">
        {t("title")}
      </h1>
      <p className="font-inter mt-3 max-w-md text-base text-[#444841]">
        {t("description")}
      </p>
      <div className="mt-8 flex flex-col gap-3 sm:flex-row">
        <button
          type="button"
          onClick={reset}
          className="font-manrope flex h-12 items-center justify-center rounded-lg bg-[#52634c] px-6 text-[15px] font-semibold text-white transition-all duration-150 hover:-translate-y-px hover:bg-[#3b4b36]"
        >
          {t("retry")}
        </button>
        <Link
          href="/dashboard"
          className="font-manrope flex h-12 items-center justify-center rounded-lg border border-[#c4c8be] px-6 text-[15px] font-semibold text-[#1b1c1a] transition-colors hover:bg-[#f5f3f0]"
        >
          {t("backToDashboard")}
        </Link>
      </div>
    </main>
  );
}
