import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { LandingPage } from "@/components/landing/LandingPage";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = {
  title: "Kora — Le partenaire de gestion des indépendants créatifs",
  description:
    "Kora réunit clients, projets, devis, contrats, facturation et rendez-vous dans un espace de travail calme — pour les freelances et studios créatifs.",
};

export default async function Home({
  searchParams,
}: {
  searchParams: { code?: string; next?: string };
}) {
  // Filet de sécurité OAuth : si Supabase retombe sur la Site URL (`/`) avec un
  // `?code=…` au lieu de `/auth/callback`, on transmet le code au vrai callback
  // (qui établit la session + redirige) plutôt que d'afficher la landing.
  if (searchParams.code) {
    const q = new URLSearchParams({ code: searchParams.code });
    if (searchParams.next) q.set("next", searchParams.next);
    redirect(`/auth/callback?${q.toString()}`);
  }

  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  // Connecté → on garde l'ancien comportement (accès direct à l'app).
  if (user) {
    redirect("/dashboard");
  }

  // Non connecté → landing page publique (hors AppShell : pas de sidebar/topbar).
  return <LandingPage />;
}
