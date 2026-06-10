import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { LandingPage } from "@/components/landing/LandingPage";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = {
  title: "Kora — Le partenaire de gestion des indépendants créatifs",
  description:
    "Kora réunit clients, projets, devis, contrats, facturation et rendez-vous dans un espace de travail calme — pour les freelances et studios créatifs.",
};

export default async function Home() {
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
