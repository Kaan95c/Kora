import type { ReactNode } from "react";

/**
 * Mise en forme typographique partagée des pages légales (Tailwind, variantes
 * descendantes `[&_x]:` → pas besoin de répéter les classes sur chaque balise).
 */
export function LegalProse({ children }: { children: ReactNode }) {
  return (
    <article
      className="font-inter text-[15px] leading-relaxed text-[#444841]
        [&_h1]:font-manrope [&_h1]:text-3xl [&_h1]:font-bold [&_h1]:tracking-[-0.01em] [&_h1]:text-[#1b1c1a]
        [&_h2]:font-manrope [&_h2]:mt-10 [&_h2]:mb-3 [&_h2]:text-xl [&_h2]:font-semibold [&_h2]:text-[#1b1c1a]
        [&_h3]:mt-6 [&_h3]:mb-2 [&_h3]:font-semibold [&_h3]:text-[#1b1c1a]
        [&_p]:mt-3 [&_ul]:mt-3 [&_ul]:list-disc [&_ul]:pl-5 [&_li]:mt-1.5
        [&_a]:font-medium [&_a]:text-[#52634c] [&_a]:underline [&_a]:underline-offset-2
        [&_strong]:font-semibold [&_strong]:text-[#1b1c1a]
        [&_table]:mt-4 [&_table]:w-full [&_table]:border-collapse
        [&_th]:border [&_th]:border-[#e0e4de] [&_th]:bg-[#f5f3f0] [&_th]:px-3 [&_th]:py-2 [&_th]:text-left
        [&_td]:border [&_td]:border-[#e0e4de] [&_td]:px-3 [&_td]:py-2"
    >
      {children}
    </article>
  );
}
