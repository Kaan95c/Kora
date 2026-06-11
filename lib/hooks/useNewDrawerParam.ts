"use client";

import { useEffect, useRef } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";

/**
 * Ouvre un drawer « New X » quand l'URL porte `?new=1`, puis nettoie l'URL.
 *
 * Utilisé pour le menu Quick Action (Sidebar) : un item navigue vers
 * `/<page>?new=1`, la page concernée appelle ce hook pour ouvrir son drawer.
 * Réactif au param → fonctionne aussi quand on est déjà sur la page.
 *
 * ⚠️ Nécessite un `<Suspense>` au-dessus (fourni par AppShell) car
 * `useSearchParams` fait basculer la page en rendu client.
 */
export function useNewDrawerParam(onOpen: () => void) {
  const params = useSearchParams();
  const pathname = usePathname();
  const router = useRouter();

  const shouldOpen = params.get("new") === "1";
  const onOpenRef = useRef(onOpen);
  onOpenRef.current = onOpen;

  useEffect(() => {
    if (shouldOpen) {
      onOpenRef.current();
      router.replace(pathname, { scroll: false });
    }
  }, [shouldOpen, pathname, router]);
}
