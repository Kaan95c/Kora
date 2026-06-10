"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

/**
 * Bandeau cookies simple. Kora ne pose que des cookies essentiels (session) →
 * pas de consentement granulaire requis : on informe + un bouton « Accepter ».
 * Le choix est mémorisé dans `localStorage` pour ne plus réafficher le bandeau.
 */
const CONSENT_KEY = "kora-cookie-consent";

export function CookieBanner() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    try {
      if (!localStorage.getItem(CONSENT_KEY)) setVisible(true);
    } catch {
      // localStorage indisponible (mode privé strict) → on n'affiche rien.
    }
  }, []);

  function accept() {
    try {
      localStorage.setItem(CONSENT_KEY, "accepted");
    } catch {
      // ignore
    }
    setVisible(false);
  }

  if (!visible) return null;

  return (
    <div className="fixed inset-x-0 bottom-0 z-[80] px-4 pb-4">
      <div className="mx-auto flex max-w-[960px] flex-col gap-3 rounded-2xl border border-[#e0e4de] bg-white p-4 shadow-[0_12px_40px_rgba(37,52,32,0.12)] sm:flex-row sm:items-center sm:justify-between">
        <p className="font-inter text-sm text-[#444841]">
          Kora utilise uniquement des cookies essentiels au fonctionnement du
          service (connexion, sécurité). En savoir plus dans notre{" "}
          <Link
            href="/legal/privacy"
            className="font-medium text-[#52634c] underline underline-offset-2"
          >
            politique de confidentialité
          </Link>
          .
        </p>
        <button
          type="button"
          onClick={accept}
          className="font-inter shrink-0 rounded-lg bg-[#52634c] px-5 py-2.5 text-sm font-semibold text-white transition-all hover:-translate-y-px hover:opacity-95"
        >
          Accepter
        </button>
      </div>
    </div>
  );
}
