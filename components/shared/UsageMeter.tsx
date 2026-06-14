"use client";

import { useTranslations } from "next-intl";

/**
 * Compteur discret d'usage par rapport au plan, en bas d'une liste.
 * - `max === undefined` → caps pas encore chargés (rien affiché).
 * - `max === null`      → illimité (PRO) → libellé "Illimité", pas de barre.
 * - `max` nombre        → "current/max … utilisés" + barre ; badge orange à 100%.
 */
export function UsageMeter({
  label,
  current,
  max,
}: {
  label: string;
  current: number;
  max: number | null | undefined;
}) {
  const t = useTranslations("usage");
  if (max === undefined) return null;

  if (max === null) {
    return (
      <div className="font-inter mt-4 flex items-center justify-end gap-2 text-xs text-[#747870]">
        <span>
          {current} {label}
        </span>
        <span className="rounded-full bg-[#d5e8cb] px-2 py-0.5 font-semibold text-[#3b4b36]">
          {t("unlimited")}
        </span>
      </div>
    );
  }

  const reached = current >= max;
  const pct = max === 0 ? 100 : Math.min(100, Math.round((current / max) * 100));

  return (
    <div className="mt-4 rounded-xl border border-[#c4c8be]/50 bg-white px-4 py-3 shadow-card">
      <div className="flex items-center justify-between gap-3">
        <span className="font-inter text-xs text-[#444841]">
          <span className="font-semibold text-[#1b1c1a]">
            {current}/{max}
          </span>{" "}
          {t("usedSuffix", { label })}
        </span>
        {reached && (
          <span className="font-inter rounded-full bg-[#fbe2cb] px-2 py-0.5 text-[11px] font-semibold text-[#92400e]">
            {t("limitReached")}
          </span>
        )}
      </div>
      <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-[#efeeea]">
        <div
          className={`h-full rounded-full transition-all ${
            reached ? "bg-[#d9770c]" : "bg-[#52634c]"
          }`}
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}
