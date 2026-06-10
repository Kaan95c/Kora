import { LinkIcon } from "lucide-react";

/**
 * Écran affiché quand le token du portail est invalide, expiré ou que le
 * contact n'existe plus. Volontairement neutre (pas de marque studio : on n'a
 * pas pu résoudre le contact).
 */
export function InvalidLink() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-[#fbf9f5] px-4">
      <div className="w-full max-w-md rounded-2xl bg-white p-8 text-center shadow-card">
        <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-[#efeeea]">
          <LinkIcon className="h-7 w-7 text-outline" strokeWidth={1.75} />
        </div>
        <h1 className="font-manrope mt-5 text-xl font-semibold text-[#1b1c1a]">
          This link isn&apos;t valid
        </h1>
        <p className="font-inter mt-2 text-sm text-[#444841]">
          The portal link may have expired or been mistyped. Please ask your
          studio to send you a fresh link.
        </p>
      </div>
    </main>
  );
}
