import type { Metadata } from "next";

import { LegalProse } from "@/components/legal/LegalProse";

export const metadata: Metadata = {
  title: "Politique de confidentialité — Kora",
  description:
    "Politique de confidentialité et traitement des données personnelles (RGPD) du service Kora.",
};

export default function PrivacyPage() {
  return (
    <LegalProse>
      <h1>Politique de confidentialité</h1>
      <p className="!mt-2 text-sm text-[#747870]">
        Dernière mise à jour : 11 juin 2026
      </p>

      <p>
        La présente politique explique comment <strong>Kora</strong> collecte,
        utilise et protège vos données personnelles, conformément au Règlement
        général sur la protection des données (RGPD) et à la loi
        « Informatique et Libertés ».
      </p>

      <h2>1. Responsable du traitement</h2>
      <p>
        Le responsable du traitement est <strong>Kaan Tekten</strong>, éditeur
        du service Kora (voir les{" "}
        <a href="/legal/mentions">mentions légales</a>). Pour toute question
        relative à vos données :{" "}
        <a href="mailto:hello@kora-app.fr">hello@kora-app.fr</a>.
      </p>

      <h2>2. Données que nous collectons</h2>
      <ul>
        <li>
          <strong>Compte &amp; studio</strong> : nom, adresse e-mail, mot de
          passe (stocké chiffré), nom du studio et informations
          professionnelles (SIRET, coordonnées) que vous renseignez.
        </li>
        <li>
          <strong>Contenu que vous saisissez</strong> : vos contacts/clients,
          projets, documents (devis, factures, contrats), rendez-vous, messages
          et automatisations.
        </li>
        <li>
          <strong>Paiement</strong> : les abonnements sont gérés par Stripe.
          Kora <strong>ne stocke pas</strong> vos numéros de carte bancaire —
          seuls des identifiants techniques (client, abonnement) sont conservés.
        </li>
        <li>
          <strong>Données techniques</strong> : journaux de connexion, adresse
          IP et informations de sécurité nécessaires au bon fonctionnement et à
          la protection du service.
        </li>
      </ul>

      <h2>3. Finalités et bases légales</h2>
      <table>
        <thead>
          <tr>
            <th>Finalité</th>
            <th>Base légale</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td>Fournir et faire fonctionner le service</td>
            <td>Exécution du contrat</td>
          </tr>
          <tr>
            <td>Gérer l&apos;abonnement et la facturation</td>
            <td>Exécution du contrat &amp; obligation légale (comptable)</td>
          </tr>
          <tr>
            <td>E-mails liés au service (factures, reçus, notifications)</td>
            <td>Exécution du contrat</td>
          </tr>
          <tr>
            <td>Sécurité, prévention des fraudes et abus</td>
            <td>Intérêt légitime</td>
          </tr>
        </tbody>
      </table>

      <h2>4. Sous-traitants et destinataires</h2>
      <p>
        Vos données ne sont jamais vendues. Elles sont traitées par des
        prestataires (sous-traitants au sens du RGPD), uniquement pour faire
        fonctionner le service :
      </p>
      <ul>
        <li>
          <strong>Supabase</strong> — hébergement de la base de données et
          authentification (infrastructure UE).
        </li>
        <li>
          <strong>Stripe</strong> — traitement des paiements et abonnements.
        </li>
        <li>
          <strong>Resend</strong> — envoi des e-mails transactionnels.
        </li>
        <li>
          <strong>Vercel</strong> — hébergement de l&apos;application.
        </li>
      </ul>

      <h2>5. Transferts hors Union européenne</h2>
      <p>
        Certains prestataires (Vercel, Stripe, Resend) sont susceptibles de
        traiter des données en dehors de l&apos;Union européenne, notamment aux
        États-Unis. Ces transferts sont encadrés par des garanties appropriées
        (clauses contractuelles types de la Commission européenne et/ou
        certification au Data Privacy Framework).
      </p>

      <h2>6. Durée de conservation</h2>
      <ul>
        <li>
          <strong>Données de compte et contenu</strong> : pendant toute la durée
          d&apos;utilisation du service, puis supprimées ou anonymisées dans un
          délai de 90 jours après la fermeture du compte.
        </li>
        <li>
          <strong>Documents comptables (factures)</strong> : conservés 10 ans,
          conformément aux obligations légales.
        </li>
        <li>
          <strong>Journaux techniques</strong> : conservés pour une durée
          limitée à des fins de sécurité.
        </li>
      </ul>

      <h2>7. Vos droits</h2>
      <p>Conformément au RGPD, vous disposez des droits suivants :</p>
      <ul>
        <li>droit d&apos;accès à vos données ;</li>
        <li>droit de rectification ;</li>
        <li>droit à l&apos;effacement (« droit à l&apos;oubli ») ;</li>
        <li>droit à la limitation du traitement ;</li>
        <li>droit à la portabilité de vos données ;</li>
        <li>droit d&apos;opposition.</li>
      </ul>
      <p>
        Vous pouvez exercer ces droits à tout moment en écrivant à{" "}
        <a href="mailto:hello@kora-app.fr">hello@kora-app.fr</a>. Vous disposez
        également du droit d&apos;introduire une réclamation auprès de la{" "}
        <a href="https://www.cnil.fr" rel="nofollow">
          CNIL
        </a>
        .
      </p>

      <h2>8. Cookies</h2>
      <p>
        Kora utilise uniquement des <strong>cookies essentiels</strong> au
        fonctionnement du service (maintien de votre session de connexion,
        sécurité). Ces cookies sont strictement nécessaires et ne servent ni au
        suivi publicitaire ni à des mesures d&apos;audience tierces. Aucun cookie
        de traçage n&apos;est déposé sans votre action.
      </p>

      <h2>9. Sécurité</h2>
      <p>
        Nous mettons en œuvre des mesures techniques et organisationnelles
        appropriées (chiffrement des mots de passe, hébergement sécurisé, accès
        restreints) pour protéger vos données contre tout accès, altération ou
        divulgation non autorisés.
      </p>
    </LegalProse>
  );
}
