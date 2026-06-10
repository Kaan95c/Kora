"use client";

import Link from "next/link";
import { Sparkles, X } from "lucide-react";

/**
 * Modal affichée quand un POST renvoie 403 `PLAN_LIMIT_REACHED`.
 * `message` vient du corps de la réponse serveur (texte FR déjà construit).
 */
export function PlanLimitDialog({
  message,
  onClose,
}: {
  message: string | null;
  onClose: () => void;
}) {
  if (!message) return null;

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
      <div
        onClick={onClose}
        className="absolute inset-0 bg-black/30 backdrop-blur-sm"
      />
      <div className="relative mx-4 w-full max-w-[420px] rounded-2xl bg-white p-6 shadow-modal">
        <button
          type="button"
          onClick={onClose}
          aria-label="Fermer"
          className="absolute right-4 top-4 flex h-8 w-8 items-center justify-center rounded-full text-[#444841] transition-colors hover:bg-[#f5f3f0]"
        >
          <X className="h-5 w-5" strokeWidth={1.75} />
        </button>

        <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-[#f8dac5]">
          <Sparkles className="h-5 w-5 text-[#574333]" strokeWidth={1.75} />
        </span>

        <h2 className="font-manrope mt-4 text-lg font-semibold text-[#1b1c1a]">
          Limite de votre plan atteinte
        </h2>
        <p className="font-inter mt-2 text-sm leading-relaxed text-[#444841]">
          {message}
        </p>

        <div className="mt-6 flex items-center justify-end gap-3">
          <button
            type="button"
            onClick={onClose}
            className="font-inter rounded-lg px-4 py-2.5 text-sm font-medium text-[#444841] transition-colors hover:bg-[#f5f3f0]"
          >
            Plus tard
          </button>
          <Link
            href="/settings/billing"
            onClick={onClose}
            className="font-inter rounded-lg bg-[#52634c] px-5 py-2.5 text-sm font-semibold text-white transition-all hover:-translate-y-px hover:opacity-95"
          >
            Voir les plans
          </Link>
        </div>
      </div>
    </div>
  );
}
