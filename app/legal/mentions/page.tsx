import type { Metadata } from "next";

import { LegalProse, LegalDisclaimer } from "@/components/legal/LegalProse";

export const metadata: Metadata = {
  title: "Mentions légales — Kora",
  description: "Mentions légales du service Kora (app.kora-app.fr).",
};

export default function MentionsLegalesPage() {
  return (
    <LegalProse>
      <h1>Mentions légales</h1>
      <p className="!mt-2 text-sm text-[#747870]">
        Dernière mise à jour : 11 juin 2026
      </p>

      <LegalDisclaimer />

      <h2>1. Éditeur du service</h2>
      <p>
        Le service <strong>Kora</strong>, accessible à l&apos;adresse{" "}
        <a href="https://app.kora-app.fr">app.kora-app.fr</a>, est édité par :
      </p>
      <ul>
        <li>
          <strong>Kaan Tekten</strong>, entrepreneur individuel (micro-entreprise)
        </li>
        <li>Adresse : [À COMPLÉTER]</li>
        <li>SIRET : [À COMPLÉTER]</li>
        <li>
          TVA : non applicable, article 293 B du Code général des impôts
          (franchise en base de TVA) — [À VÉRIFIER selon votre seuil de chiffre
          d&apos;affaires]
        </li>
        <li>
          Contact :{" "}
          <a href="mailto:hello@kora-app.fr">hello@kora-app.fr</a>
        </li>
      </ul>

      <h2>2. Directeur de la publication</h2>
      <p>
        Le directeur de la publication est <strong>Kaan Tekten</strong>,
        en sa qualité d&apos;éditeur du service.
      </p>

      <h2>3. Hébergement</h2>
      <p>
        L&apos;application est hébergée par :
      </p>
      <ul>
        <li>
          <strong>Vercel Inc.</strong> — 340 S Lemon Ave #4133, Walnut, CA 91789,
          États-Unis —{" "}
          <a href="https://vercel.com" rel="nofollow">
            vercel.com
          </a>
          .
        </li>
        <li>
          Les données applicatives (base de données et authentification) sont
          hébergées par <strong>Supabase Inc.</strong>, sur une infrastructure
          située dans l&apos;Union européenne —{" "}
          <a href="https://supabase.com" rel="nofollow">
            supabase.com
          </a>
          .
        </li>
      </ul>

      <h2>4. Propriété intellectuelle</h2>
      <p>
        L&apos;ensemble des éléments du service Kora (marque, logo, interface,
        textes, code, structure) est protégé par le droit de la propriété
        intellectuelle et demeure la propriété exclusive de l&apos;éditeur, sauf
        mention contraire. Toute reproduction ou représentation, totale ou
        partielle, sans autorisation écrite préalable est interdite.
      </p>
      <p>
        Les données que vous saisissez dans Kora (vos contacts, projets,
        documents, etc.) restent votre propriété ; voir la{" "}
        <a href="/legal/privacy">politique de confidentialité</a>.
      </p>

      <h2>5. Contact</h2>
      <p>
        Pour toute question relative au service ou à ces mentions légales :{" "}
        <a href="mailto:hello@kora-app.fr">hello@kora-app.fr</a>.
      </p>
    </LegalProse>
  );
}
