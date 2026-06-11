import type { Metadata } from "next";

import { LegalProse } from "@/components/legal/LegalProse";

export const metadata: Metadata = {
  title: "Conditions Générales de Vente — Kora",
  description:
    "Conditions Générales de Vente (CGV) du service d'abonnement Kora.",
};

export default function CgvPage() {
  return (
    <LegalProse>
      <h1>Conditions Générales de Vente</h1>
      <p className="!mt-2 text-sm text-[#747870]">
        Dernière mise à jour : 11 juin 2026
      </p>

      <h2>1. Objet et champ d&apos;application</h2>
      <p>
        Les présentes Conditions Générales de Vente (CGV) régissent la
        souscription et l&apos;utilisation du service{" "}
        <strong>Kora</strong> (
        <a href="https://app.kora-app.fr">app.kora-app.fr</a>), édité par Kaan
        Tekten (voir <a href="/legal/mentions">mentions légales</a>). Elles
        s&apos;appliquent à tout client, professionnel ou consommateur, qui
        souscrit à un abonnement. La souscription implique l&apos;acceptation
        sans réserve des présentes CGV.
      </p>

      <h2>2. Description du service</h2>
      <p>
        Kora est un logiciel en ligne (SaaS) de gestion de la relation client
        destiné aux indépendants et studios créatifs : gestion des contacts,
        projets, documents (devis, factures, contrats), facturation, paiements
        en ligne, prise de rendez-vous et automatisations.
      </p>

      <h2>3. Compte et inscription</h2>
      <p>
        L&apos;accès au service nécessite la création d&apos;un compte. Vous vous
        engagez à fournir des informations exactes et à préserver la
        confidentialité de vos identifiants. Vous êtes responsable de toute
        activité réalisée depuis votre compte. L&apos;accès au service est
        réservé aux personnes majeures ou autorisées par un tuteur légal.
      </p>

      <h2>4. Offres et tarifs</h2>
      <p>
        Kora propose les formules suivantes (prix en euros ; TVA non applicable,
        art. 293 B du CGI) :
      </p>
      <table>
        <thead>
          <tr>
            <th>Formule</th>
            <th>Prix</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td>Gratuit</td>
            <td>0 € / mois</td>
          </tr>
          <tr>
            <td>Starter</td>
            <td>19 € / mois (ou 15 € / mois en facturation annuelle)</td>
          </tr>
          <tr>
            <td>Pro</td>
            <td>39 € / mois (ou 31 € / mois en facturation annuelle)</td>
          </tr>
        </tbody>
      </table>
      <p>
        Les tarifs en vigueur sont ceux affichés sur le site au moment de la
        souscription. Kora se réserve le droit de modifier ses tarifs ; tout
        changement vous sera notifié et s&apos;appliquera à l&apos;échéance
        suivante.
      </p>

      <h2>5. Paiement</h2>
      <p>
        Les paiements sont traités de manière sécurisée par notre prestataire{" "}
        <strong>Stripe</strong>. L&apos;abonnement est payable d&apos;avance, par
        carte bancaire, et se renouvelle automatiquement par tacite reconduction
        à chaque période (mensuelle ou annuelle) jusqu&apos;à résiliation.
      </p>

      <h2>6. Durée, résiliation et remboursement</h2>
      <p>
        L&apos;abonnement est sans engagement de durée. Vous pouvez le résilier à
        tout moment depuis votre espace (rubrique Facturation / portail Stripe).
        La résiliation prend effet à la fin de la période en cours déjà payée ;
        aucun remboursement au prorata n&apos;est effectué pour la période
        entamée, sauf disposition légale impérative contraire. À l&apos;issue de
        l&apos;abonnement payant, le compte peut basculer vers la formule
        gratuite.
      </p>

      <h2>7. Droit de rétractation (clients consommateurs)</h2>
      <p>
        Conformément aux articles L221-18 et suivants du Code de la
        consommation, le client <strong>consommateur</strong> (personne physique
        agissant à des fins non professionnelles) dispose d&apos;un délai de{" "}
        <strong>quatorze (14) jours</strong> à compter de la souscription pour
        exercer son droit de rétractation, sans avoir à se justifier.
      </p>
      <p>
        Le service étant un contenu/service numérique fourni immédiatement, vous
        pouvez demander expressément son exécution avant la fin du délai de
        rétractation. Dans ce cas, conformément à l&apos;article L221-28 du Code
        de la consommation, vous reconnaissez que le droit de rétractation ne
        peut plus être exercé une fois le service pleinement exécuté ; pour un
        service exécuté progressivement, le montant dû en cas de rétractation est
        proportionnel à ce qui a déjà été fourni.
      </p>
      <p>
        Pour exercer ce droit, il suffit d&apos;adresser une demande non
        équivoque à <a href="mailto:hello@kora-app.fr">hello@kora-app.fr</a>.
        Ce droit ne s&apos;applique pas aux clients professionnels (B2B).
      </p>

      <h2>8. Obligations de l&apos;utilisateur</h2>
      <p>
        Vous vous engagez à utiliser Kora conformément à la loi et aux présentes
        CGV, à ne pas porter atteinte au service, et à disposer du droit de
        traiter les données (notamment les données de vos propres clients) que
        vous saisissez dans l&apos;outil, dont vous restez responsable.
      </p>

      <h2>9. Disponibilité et maintenance</h2>
      <p>
        Kora met en œuvre ses meilleurs efforts pour assurer la disponibilité du
        service mais ne garantit pas un fonctionnement ininterrompu. Des
        opérations de maintenance ou des incidents techniques peuvent entraîner
        des interruptions temporaires.
      </p>

      <h2>10. Responsabilité</h2>
      <p>
        Kora ne saurait être tenu responsable des dommages indirects. Dans la
        limite autorisée par la loi, la responsabilité de l&apos;éditeur est
        limitée au montant des sommes effectivement versées par le client au
        cours des douze (12) derniers mois. Aucune stipulation ne limite la
        responsabilité en cas de faute lourde ou dans les cas où la loi
        l&apos;interdit, notamment vis-à-vis des consommateurs.
      </p>

      <h2>11. Données personnelles</h2>
      <p>
        Le traitement des données personnelles est décrit dans notre{" "}
        <a href="/legal/privacy">politique de confidentialité</a>.
      </p>

      <h2>12. Droit applicable et litiges</h2>
      <p>
        Les présentes CGV sont soumises au droit français. En cas de litige, une
        solution amiable sera recherchée en priorité.
      </p>
      <p>
        Conformément au Code de la consommation, le client consommateur peut
        recourir gratuitement à un médiateur de la consommation :{" "}
        <strong>CM2C</strong> — 14 rue Saint Jean, 75017 Paris —{" "}
        <a href="https://cm2c.net" rel="nofollow">
          cm2c.net
        </a>
        . Il peut également utiliser la plateforme européenne de Règlement en
        Ligne des Litiges :{" "}
        <a href="https://ec.europa.eu/consumers/odr" rel="nofollow">
          ec.europa.eu/consumers/odr
        </a>
        . À défaut de résolution amiable, les tribunaux français sont
        compétents.
      </p>
    </LegalProse>
  );
}
