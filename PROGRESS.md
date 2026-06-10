# KORA — PROGRESS.md

> **Référence d'état du projet.** À lire en début de chaque session Claude Code.
> SaaS de gestion client pour freelances/agences créatives (alternative FR à HoneyBook).
> **Dernière mise à jour : 2026-06-10 — étape 16 : MISE EN PRODUCTION (Vercel) ✅. Reset de la base de prod (fausses données supprimées) + **compte admin réel** créé. Étapes 1 à 15 = 9 pages + Supabase + Stripe + PDF + Resend + portail client. Prochaine : webhook Stripe prod + Google OAuth / abonnements SaaS.**
> Voir aussi `CLAUDE.md` (design system + conventions).

---

## 0. Résumé express

| Avancement | État |
|---|---|
| Étape 1 — Setup + design system + layout | ✅ Fait |
| Étape 2 — Schéma DB + seed + Dashboard | ✅ Fait |
| Étape 3 — Authentification Supabase | ✅ Fait |
| Étape 4 — Page Projects (List + Kanban) | ✅ Fait |
| Étape 5 — Page Finance | ✅ Fait |
| Étape 6 — Page Contacts (CRM : liste + drawer + détail) | ✅ Fait |
| Étape 7 — Page Documents (CRUD : liste + stats + drawer + statuts) | ✅ Fait |
| Étape 8 — Page Scheduler (calendrier Week/Month + session types + drawer) | ✅ Fait |
| Étape 9 — Page Settings (General/Studio/Branding/Billing + sous-nav) | ✅ Fait |
| Étape 10 — Page Inbox (messagerie : conversations + bulles + compose) | ✅ Fait |
| Étape 11 — Page Automations (builder visuel : triggers + actions) | ✅ Fait |
| Étape 12 — Stripe (paiement client : payment links + page `/pay` + webhook) | ✅ Fait |
| Étape 13 — Génération PDF des factures (`@react-pdf/renderer`) | ✅ Fait |
| Étape 14 — Resend (emails réels : facture, reçu, inbox) | ✅ Fait |
| Étape 15 — Portail client (`/client/[token]`, lien signé HMAC, lecture seule) | ✅ Fait |
| Étape 16 — **Mise en production (Vercel)** + reset prod + compte admin réel | ✅ Fait |
| Étapes suivantes | ⏳ Webhook Stripe prod, Google OAuth, **abonnements SaaS Stripe** (Billing réel), relances auto |

**Le projet compile (`npm run build` exit 0), tourne (`npm run dev`), et l'auth fonctionne end-to-end.**
**Les 9 pages sont complètes et branchées aux vraies données — plus aucun placeholder.** 🎉
**Intégrations faites : Supabase (auth + Storage), Stripe (paiement client + webhook), PDF factures (`@react-pdf/renderer`), Resend (emails réels), portail client public.** → **15 étapes terminées.**
**Portail client (`/client/[token]`) : espace public en lecture seule (overview + documents/factures + paiements + RDV), branding studio dynamique, lien signé HMAC stateless (pas de migration DB, pas de compte côté client), réutilise `/pay` + le PDF public gated PAID.**

**🚀 EN PRODUCTION (étape 16) : déployé sur Vercel → https://kora-nine-topaz.vercel.app (repo `github.com/Kaan95c/Kora`, branche `main`).**
**Base de prod **réinitialisée** via `npm run db:reset-prod` (plus aucune donnée de démo). **Compte admin réel** créé via `npm run db:create-admin` : `kaantekten958@gmail.com` → studio **"Kora Studio"** (plan PRO).**
**⚠️ Le compte de test `test@kora.fr` et les données seed "Boutique Studio" N'EXISTENT PLUS (supprimés par le reset, base partagée dev=prod). Pour re-peupler du dev, recréer un compte via `/register` ou relancer les scripts seed.**

**💳 STRIPE EN MODE LIVE (argent réel) depuis le 2026-06-10 : `STRIPE_SECRET_KEY=sk_live_…`, `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_live_…`, `STRIPE_WEBHOOK_SECRET=whsec_…` (endpoint **Live**), redeploy Vercel fait. → Les paiements clients sur `/pay/[id]` encaissent de VRAIES CB. La carte de test `4242…` ne marche plus en prod.**

---

## 1. Stack & versions (ÉPINGLÉES — ne pas upgrader sans accord)

| Paquet | Version | Note |
|---|---|---|
| Next.js | **14.2.35** (App Router) | PAS 15/16. Init via `create-next-app@14`. |
| React / React-DOM | 18 | |
| TypeScript | 5 (strict, jamais `any`) | |
| Tailwind CSS | **3.4.1** (v3) | PAS v4. Config dans `tailwind.config.ts`. |
| shadcn/ui | configuré manuellement | `components.json` + `lib/utils.ts` + `components/ui/button.tsx`. |
| Prisma / @prisma/client | **6.19.3** | PAS 7 (v7 supprime `url` dans datasource). |
| @supabase/ssr | 0.10.3 | Auth + session via cookies. |
| @supabase/supabase-js | 2.x | |
| recharts | 3.x | AreaChart (dashboard), BarChart (finance). Client-only. |
| @dnd-kit/core + /sortable | 6 / 10 | Kanban Projects (drag & drop). |
| lucide-react | 1.x | Icônes (uniquement). |
| resend + react-email | installés | **Emails réels** : facture, reçu de paiement, inbox (`lib/email.ts`). |
| stripe + @stripe/stripe-js + react-stripe-js | 22 / 9 / 6 | **Paiement client** (PaymentIntent + Elements). Pas d'abonnements. |
| @react-pdf/renderer | 4.x | **Génération PDF** factures/devis (serveur, police Helvetica native). |
| dotenv-cli, tsx | dev | Scripts Prisma/seed (CLI ne lit pas `.env.local`). |
| Fonts | Manrope + Inter | `next/font/google` dans `app/layout.tsx`. |

✅ **Stripe installé** (`stripe` ^22 + `@stripe/stripe-js` + `@stripe/react-stripe-js`) — **paiement client opérationnel en LIVE** (clés **`sk_live_`/`pk_live_`** + webhook **Live** sur Vercel). ⚠️ **Argent réel** : la carte de test `4242…` ne fonctionne plus, ce sont de vraies CB. Abonnements SaaS pas encore.

---

## 2. Ce qui a été fait ✅

### Configuration & racine
- ✅ `tailwind.config.ts` — design tokens Kora (background, surface, primary vert `#52634c`, secondary brun, outline, error…) + tokens sémantiques shadcn mappés dessus + fonts + ombres tonales.
- ✅ `app/globals.css`, `app/layout.tsx` (fonts Manrope/Inter), `app/page.tsx` (redirect → `/dashboard`).
- ✅ `CLAUDE.md`, `components.json`, `.env.local` (clés Supabase + DB **remplies** ; Stripe/Resend vides).
- ✅ **Assets de marque** : `public/logo.png` (logo vert détouré, transparent), `public/logo-white.png` (version blanche, fonds verts), `app/icon.png` (favicon = icône pêche). Planche source `design/kora-brandboard.png` (hors `public/`). Logo branché dans **Sidebar** (vert) + **login/register** (blanc) via `next/image`. *(Détouré depuis une planche photo → première version ; à remplacer par un SVG/PNG transparent natif pour du pixel-perfect.)*
- ✅ `package.json` scripts : `dev`, `build`, `start`, `lint`, `db:push`, `db:generate`, `db:studio`, `db:seed` (les 4 derniers via `dotenv -e .env.local`).

### Base de données (`prisma/schema.prisma`) — poussée sur Supabase
- ✅ Modèles : `Company`, `User`, `Contact`, `Project`, `Document`, `Payment`, `Appointment`, `Task`, `SessionType`, `Message`, `Automation`, `AutomationAction`, `LineItem` (+ enums `MessageDirection`/`MessageStatus`, `AutomationTrigger`/`ActionType`).
- ✅ Enums : `Plan`, `ContactStatus`, `ProjectStatus`, `DocumentType`, `DocumentStatus`, `PaymentStatus`, `PaymentMethod`, `Priority`.
- ✅ Multi-tenant : `companyId` partout. `Company.owner` → `User` (relation `CompanyOwner`, `ownerId` nullable), `Company.users` (`CompanyMembers`). `User.supabaseId` unique = lien vers Supabase Auth.
- ✅ `lib/seed.ts` idempotent — **company "Boutique Studio"** : 4 contacts, 3 projets (tous ACTIVE), 4 documents, 3 payments (2 PAID = 4250+1200, 1 PENDING = 3200), 3 appointments, 3 tasks.

### lib/
- ✅ `lib/prisma.ts` (singleton), `lib/utils.ts` (`cn`).
- ✅ `lib/supabase/client.ts` (browser), `server.ts` (cookies), `middleware.ts` (`updateSession`).
- ✅ `lib/auth.ts` — `getAuthedCompany()` : résout user Supabase (cookies) + company via `owner.supabaseId`.
- ✅ `lib/hooks/useAuth.ts` — consomme le contexte `AuthProvider`.

### Composants
- ✅ `components/layout/Sidebar.tsx` — 220px, 9 items nav + séparateur + bouton "Quick Action" *(décoratif)*.
- ✅ `components/layout/Topbar.tsx` — recherche *(décorative)*, Bell/Help *(décoratifs)*, "New Project" *(non câblé)*, **avatar avec vraies initiales + dropdown (Settings + Sign out câblés)**.
- ✅ `components/shared/StatusBadge.tsx` — variants pill (export nommé + default).
- ✅ `components/providers/AuthProvider.tsx` — contexte `{ user, company, isLoading }` (onAuthStateChange + fetch `/api/auth/me`).
- ✅ `components/ui/button.tsx` — shadcn (variants Kora).

### Authentification (étape 3) — fonctionnelle end-to-end
- ✅ `middleware.ts` — protège les 9 routes app, redirige non-connecté → `/login`, connecté sur login/register → `/dashboard`. Publiques : `/login`, `/register`, `/client/*`, `/api/webhooks/*`, `/auth/callback`.
- ✅ Pages `login` + `register` (design 2 colonnes vert, toggle mot de passe, checklist mdp, **bouton Google OAuth (UI)**).
- ✅ `app/api/auth/setup-company` (POST) — crée Company+User en transaction, auto-confirme l'email via service_role (login immédiat), sécurisé (valide le userId via admin), idempotent.
- ✅ `app/api/auth/me` (GET) — user + company.
- ✅ `app/auth/callback` — échange code OAuth.
- ✅ **User de test : `test@kora.fr` / `Test1234!`** — confirmé, owner de "Boutique Studio" (voit les données seed).

### Pages complètes (branchées aux vraies données)
- ✅ **Dashboard** (`/dashboard`) — 3 metric cards, AreaChart Revenue Growth, Upcoming, Recent Projects, Urgent Tasks, greeting = prénom du user. Skeleton loading.
- ✅ **Projects** (`/projects`) — vue List (cards 3 col : progression paid/total, contact, dates) + vue **Kanban drag & drop @dnd-kit (statut persisté)** + filtres pills.
- ✅ **Finance** (`/finance`) — BarChart Collected/Expected, cards Total Revenue + Outstanding, table transactions + pagination 5/page + **Export CSV (blob client)**.
- ✅ **Contacts** (`/contacts` + `/contacts/[id]`) — **CRUD complet** : vue liste (tableau, avatar coloré par statut, tags pills, search nom/email + filtres pills, pagination 10/page client), **drawer New Contact 420px** (slide droite, tags chips, POST → refresh), **page détail** (avatar 64px, tags éditables persistés, onglets **Infos** form inline / **Projects** cards mini / **Documents** liste / **Notes** textarea — tous via PUT), **soft-delete** (Trash → `status: ARCHIVED`).
- ✅ **Documents** (`/documents`) — **CRUD** : 4 cartes stats (Total Value / Paid / Awaiting / Drafts), pills type (Invoices/Quotes/Contracts/Proposals) + select statut + search (titre/number), tableau (icône type, client, project, montant, `StatusBadge`), **menu d'actions popover** (Mark as Sent/Signed/Paid → PATCH, Delete + confirm, Download PDF *décoratif*), **drawer New Document 460px** (selects contacts/projects alimentés par les API existantes), pagination 10/page client. Hooks PDF/Stripe décoratifs.
- ✅ **Scheduler** (`/scheduler`) — **calendrier** vraies données : vue **Week** (time-grid 8:00–20:00, blocs colorés par type de session, ligne "now", clic créneau → création) + toggle **Month** (grille mensuelle, chips par jour) + nav ◀ Today ▶. Rail droit : **Session Types** (CRUD réel : couleur/durée/prix, add/delete) + **Weekly availability** *(décoratif "Soon")*. **Drawer New/Edit Appointment 440px** (type de session → préremplit titre+fin, client, date, start/end, notes ; delete).
- ✅ **Settings** (`/settings/*`) — **layout sous-nav** (General/Studio/Branding/Billing, 180px) ; `/settings` redirige → `/settings/general`. **General** : profil (nom → PUT + displayName Supabase admin ; email readonly) + changement de mot de passe (vérif du mdp actuel par re-auth puis `supabase.auth.updateUser`). **Studio** : infos company (name/siret/vatNumber/address/phone/email → PUT scopé). **Branding** : **upload logo drag&drop → Supabase Storage bucket `logos`**, color picker + hex (preview live), préfixes facture/devis. **Billing** : plan actuel (card verte, plan via `useAuth`) + 3 plans + table invoices **statiques** (hooks "Soon"). Prefill via `useAuth()`.
- ✅ **Inbox** (`/inbox`) — **messagerie 2 colonnes pleine hauteur** (`calc(100vh-8.5rem)`). Gauche : conversations groupées par contact (avatar couleur statut, aperçu dernier message, date, **badge non-lu**), recherche + filtres **All/Unread/Sent**, skeleton. Droite : header (avatar + StatusBadge + "View Contact →") + **bulles** OUTBOUND (vert, droite) / INBOUND (blanc bordé, gauche) **groupées par jour** (Today/Yesterday/date) + **composer** (subject + textarea auto-grow + Send, Ctrl/⌘+Enter). **Compose modal** 480px (To/Subject/Message). Ouvrir une conversation → INBOUND marqués `READ` (effet de bord GET). Envoi **best-effort Resend** si clé, sinon **mode démo SENT**.
- ✅ **Automations** (`/automations`) — **builder visuel** : 3 cards stats (Active réel / Triggered this month = somme `triggerCount` / Time saved décoratif) ; liste de cards (toggle on/off `isActive`, flow **[Trigger]→[Action]→…** blocs colorés, footer "Last triggered X ago" + Edit/Trash) ; **drawer New/Edit 500px** en 3 sections (grille de triggers, actions avec type + délai hrs/days + réordonnancement **↑/↓**, nom/description) → POST (create) / PATCH (edit complet, remplacement des actions). Toggle = PATCH `isActive`, delete = DELETE (cascade actions).

### Portail client (étape 15) — `/client/[token]`, public, lecture seule
- ✅ **Accès par lien signé HMAC** (`lib/client-portal.ts`) — token = `base64url(contactId).HMAC-SHA256(contactId)`, **stateless** (aucune migration DB, aucun compte Supabase côté client). Secret = `CLIENT_PORTAL_SECRET` sinon repli sur `SUPABASE_SERVICE_ROLE_KEY`. Vérif à temps constant (`timingSafeEqual`). `getPortalData(token)` charge contact + branding company + documents (hors **DRAFT**) + payments + appointments + projects, **scopé `contactId`** ; renvoie `null` si token invalide ou contact ARCHIVED.
- ✅ **Pages** : `app/client/[token]/layout.tsx` (fond), `page.tsx` (**Overview** : greeting, cards Outstanding/Paid/Upcoming, prochain RDV, documents récents), `documents/page.tsx` (**factures/devis** : Pay → `/pay/[id]`, Download invoice → PDF public gated PAID + **historique des paiements**), `appointments/page.tsx` (RDV à venir / passés).
- ✅ **Composants** : `components/client/PortalShell.tsx` (en-tête brandé logo/couleur company dynamique + nav onglets Overview/Documents/Appointments + footer "Powered by Kora") et `InvalidLink.tsx` (lien invalide/expiré, neutre). Tous **server components** (zéro interactivité côté portail).
- ✅ **Partage côté studio** : `GET /api/contacts/[id]` renvoie désormais `portalUrl` (origin reconstruit via `x-forwarded-*`) ; **carte "Client portal"** sur la page détail contact (input lecture seule + **Copy link** + **Open**).
- ✅ **Vérifié** : build exit 0, HTTP 200 sur les 3 routes (rendu brandé + vraies données seed), token falsifié → écran "link isn't valid" **sans fuite de données**.

### API routes (toutes en `dynamic = "force-dynamic"`)
| Route | Méthode | Auth | Scope |
|---|---|---|---|
| `/api/auth/me` | GET | ✅ | owner |
| `/api/auth/setup-company` | POST | service_role | — |
| `/api/auth/callback` (`/auth/callback`) | GET | — (public) | — |
| `/api/dashboard/metrics` | GET | ✅ 401 | owner |
| `/api/dashboard/revenue-chart` | GET | ✅ 401 | owner |
| `/api/dashboard/projects` | GET | ✅ 401 | owner |
| `/api/dashboard/appointments` | GET | ✅ 401 | owner |
| `/api/dashboard/tasks` | GET | ✅ 401 | owner |
| `/api/projects` | GET | ✅ 401 | owner |
| `/api/projects/[id]` | PATCH (statut) | ✅ 401 | owner (`updateMany` scopé) |
| `/api/finance` | GET | ✅ 401 | owner |
| `/api/contacts` | GET (filtre `status`+`search`), POST | ✅ 401 | owner |
| `/api/contacts/[id]` | GET (+projects+documents), PUT, DELETE (soft→ARCHIVED) | ✅ 401 | owner (`updateMany` scopé) |
| `/api/documents` | GET (filtre `type`/`status`/`search`), POST | ✅ 401 | owner |
| `/api/documents/[id]` | PATCH (statut + `signedAt`), DELETE | ✅ 401 | owner (`updateMany`/`deleteMany` scopé) |
| `/api/appointments` | GET, POST (valide contact/sessionType) | ✅ 401 | owner |
| `/api/appointments/[id]` | PUT, DELETE | ✅ 401 | owner (`updateMany`/`deleteMany` scopé) |
| `/api/session-types` | GET, POST | ✅ 401 | owner |
| `/api/session-types/[id]` | PATCH, DELETE | ✅ 401 | owner (`updateMany`/`deleteMany` scopé) |
| `/api/settings/profile` | PUT (User.name + displayName admin) | ✅ 401 | self (`supabaseId`) |
| `/api/settings/studio` | PUT | ✅ 401 | owner (`updateMany` scopé) |
| `/api/settings/branding` | PUT (color/logoUrl/préfixes) | ✅ 401 | owner (`updateMany` scopé) |
| `/api/settings/logo` | POST (upload Storage `logos`) | ✅ 401 | owner |
| `/api/messages` | GET (conversations groupées), POST (send + Resend démo) | ✅ 401 | owner |
| `/api/messages/[contactId]` | GET (conversation + marque INBOUND `READ`) | ✅ 401 | owner |
| `/api/automations` | GET (+actions), POST (nested create) | ✅ 401 | owner |
| `/api/automations/[id]` | PATCH (toggle `isActive` / update complet), DELETE | ✅ 401 | owner (`deleteMany` scopé) |
| `/api/payments/create-intent` | POST (PaymentIntent + URL de paiement) | ✅ 401 | owner |
| `/api/webhooks/stripe` | POST (`payment_intent.succeeded` → PAID) | signature Stripe | via `metadata` |
| `/api/documents/[id]/pdf` | GET (PDF facture) | ✅ 401 | owner |
| `/api/pay/[documentId]/invoice` | GET (PDF public, gated `PAID`) | — (public) | par id (gated PAID) |

---

## 3. État détaillé par page

| Page | Route | Complète ? | API réelle ? | Protégée middleware ? | Vraies données Supabase ? |
|---|---|---|---|---|---|
| Dashboard | `/dashboard` | ✅ Oui | ✅ 5 routes `/api/dashboard/*` | ✅ Oui | ✅ Oui |
| Projects | `/projects` | ✅ Oui (lecture + drag statut ; pas de création) | ✅ `/api/projects` + `[id]` | ✅ Oui | ✅ Oui |
| Finance | `/finance` | ✅ Oui | ✅ `/api/finance` | ✅ Oui | ✅ Oui |
| Contacts | `/contacts` + `/contacts/[id]` | ✅ Oui (CRUD : liste, création, édition, soft-delete) | ✅ `/api/contacts` + `[id]` | ✅ Oui | ✅ Oui |
| Documents | `/documents` | ✅ Oui (CRUD : liste, stats, création, statut, delete) | ✅ `/api/documents` + `[id]` | ✅ Oui | ✅ Oui |
| Scheduler | `/scheduler` | ✅ Oui (calendrier Week/Month + appointments CRUD + session types CRUD) | ✅ `/api/appointments` + `/api/session-types` (+`[id]`) | ✅ Oui | ✅ Oui |
| Inbox | `/inbox` | ✅ Oui (conversations + bulles + compose) | ✅ `/api/messages` (+`[contactId]`) | ✅ Oui | ✅ Oui |
| Automations | `/automations` | ✅ Oui (builder : triggers + actions + toggle/CRUD) | ✅ `/api/automations` (+`[id]`) | ✅ Oui | ✅ Oui |
| Settings | `/settings/*` | ✅ Oui (General/Studio/Branding/Billing) | ✅ 4 routes `/api/settings/*` | ✅ Oui | ✅ Oui (Billing = plans/invoices statiques) |
| Login | `/login` | ✅ Oui (fonctionnelle) | client Supabase `signInWithPassword` | publique (redirige si connecté) | N/A |
| Register | `/register` | ✅ Oui | `signUp` + `/api/auth/setup-company` | publique | crée Company+User |
| Pay (public) | `/pay/[documentId]` | ✅ Oui (Stripe Elements CB+SEPA) | ✅ create-intent + webhook | ❌ publique (hors `PROTECTED_PREFIXES`) | ✅ Oui |
| Portail client (public) | `/client/[token]` (+ `/documents`, `/appointments`) | ✅ Oui (overview + docs/factures + paiements + RDV, lecture seule) | ✅ `getPortalData` (server, token signé) | ❌ publique (token HMAC) | ✅ Oui |

---

## 4. Ce qui reste à faire ⏳

### Pages — toutes complètes ✅
- ✅ **Aucune page placeholder restante** — les 9 pages sont branchées aux vraies données. Le reste à faire = **intégrations** (ci-dessous).

### Fonctionnalités UI non câblées (décoratives)
- ⏳ Bouton **"New Project"** (Topbar) — pas de création de projet.
- ⏳ Édition de projet (montants, contact, dates).
- ⏳ Bouton **"Quick Action"** (Sidebar).
- ⏳ Barre de **recherche**, icônes **Bell** / **Help** (Topbar).
- ⏳ Lien **"Forgot password?"** (login).
- ⏳ Boutons **"Filters"** / **"Sort by Date"** (Finance).
- ⏳ Pagination Finance OK ; tri/filtre réels à faire.

### Intégrations non branchées
- 🟡 **Stripe** — **paiement client FAIT** : "Send payment link" sur les factures (page Documents), page publique **`/pay/[id]`** (Elements CB + SEPA), webhook `payment_intent.succeeded` → `Payment` + `Document` = **PAID**. **Reste** : abonnements SaaS (rendre le **Billing** réel) + intégrer les payment links dans la page **Finance**.
- ⏳ **Google OAuth** — bouton + `/auth/callback` prêts, mais **provider Google non activé dans Supabase**. Les comptes OAuth n'ont pas d'onboarding (pas de Company créée → dashboard vide).
- ✅ **PDF (`@react-pdf/renderer`)** — **FAIT** : template `components/pdf/InvoicePDF.tsx` (en-tête vert, bloc client, lignes, sous-total HT / TVA 20% / Total TTC, mentions légales + « Généré par Kora »), générateur `lib/invoice-pdf.tsx` (`buildInvoiceBuffer`, fallback ligne unique). Routes `GET /api/documents/[id]/pdf` (authed) + `GET /api/pay/[id]/invoice` (public, gated `PAID`). Boutons "Download PDF" (Documents) + "Download your invoice" (page `/pay` succès). Modèle `LineItem` + `Document.dueDate`.
- ✅ **Resend / react-email** — **FAIT** : `lib/email.ts` (`sendEmail` **best-effort** + redirection `RESEND_TEST_EMAIL` en sandbox) + templates `components/emails/InvoiceEmail.tsx` & `PaymentReceiptEmail.tsx`. Câblé : "Send payment link" → **email facture** (dans `create-intent`), webhook `payment_intent.succeeded` → **reçu de paiement**, Inbox → **email du message**. **Reste** : relances auto (automations), **domaine vérifié** pour écrire à de vrais clients (sinon sandbox = envoi à son propre email seulement).
- ✅ **Portail client** (`/client/[token]`) — **FAIT** (étape 15) : espace public lecture seule (overview + factures/devis + paiements + RDV), lien signé HMAC. **Reste** : actions côté client (accepter un devis, signer un contrat, réserver un créneau) = lecture seule pour l'instant.
- ⏳ **Onboarding nouveaux comptes** — un `/register` crée une Company **vide** (sans données seed). Seul `test@kora.fr` est rattaché à "Boutique Studio".

---

## 5. Décisions techniques

### Versions
- **Next 14 + Tailwind v3** (et non 15/v4) pour coller au brief qui s'appuie sur `tailwind.config.ts`.
- **Prisma 6** (et non 7) : Prisma 7 supprime `url` dans le `datasource` et impose `prisma.config.ts`.
- **shadcn configuré manuellement** (déterministe sur Tailwind v3, pas de CLI interactif).

### Schéma / données
- **Montants en `Float`** (et non `Decimal`) → JSON renvoie des nombres, `toLocaleString()` marche direct côté client.
- **Relation owner** : `Company.ownerId` nullable (casse le cycle de création), posé après création dans une transaction (`setup-company`).
- **`User.supabaseId`** unique = pont vers Supabase Auth. La résolution de company se fait via `owner.supabaseId` (`lib/auth.ts`).
- **Projects** : la card est **adaptée aux vraies données** (barre de progression paid/total + avatar contact) car le schéma n'a ni `phase` ni `members` (champs du mockup non implémentés).
- **Finance** : champ `document` **omis** des transactions (pas de relation `Payment → Document` ; l'UI affiche `id.slice(0,8)` comme Transaction ID). `totalRevenueGrowth` : division par zéro (mois précédent = 0) → **+100%**. `date` d'une transaction = `paidAt ?? dueDate ?? createdAt`.
- **StatusBadge** : libellés propres + variants explicites (ex. `Paid`/`Pending`/`Overdue`) plutôt que l'enum brut (`PAID`…).
- **Contacts (étape 6)** : migration **additive non destructive** du modèle `Contact` (ajout `phone`/`companyName`/`address`/`notes` nullable + valeur d'enum `ContactStatus.ARCHIVED`) via `db:push`. Champ nommé `companyName` (et non `company`, déjà pris par la relation tenant) → label UI "Company". **Pas de re-seed** : `db:seed` fait des `deleteMany` qui casseraient le rattachement owner de `test@kora.fr` → enrichissement des 4 contacts existants via le script idempotent `lib/enrich-contacts.ts` (`npm run db:enrich`, `updateMany` par email scopé company). Soft-delete = `status → ARCHIVED`. Filtres + recherche côté client (un seul fetch), pagination 10/page. Config statut (label/variant badge/couleur avatar) centralisée dans `lib/contacts.ts`.
- **Documents (étape 7)** : **aucune migration** (modèle `Document` déjà complet). Page **list-centric** (pas de page `/documents/[id]` — un aperçu PDF serait creux sans *line items* au schéma). `PATCH /api/documents/[id]` change le statut et **horodate `signedAt`** au passage à `SIGNED` ; `DELETE` = **hard delete** (l'enum `DocumentStatus` n'a pas d'`ARCHIVED`). `POST` valide que `contactId`/`projectId` appartiennent à la company (anti cross-tenant). Stats calculées **client** sur l'ensemble (un seul fetch) ; filtres type+statut+search client ; pagination 10/page. Menu d'actions = **popover `position: fixed`** ancré via `getBoundingClientRect` (évite le clipping de la table). Hooks **PDF/Stripe décoratifs** ("Download PDF — Soon"). Config type/statut/icônes centralisée dans `lib/documents.ts`.
- **Scheduler (étape 8)** : migration **additive** — nouveau modèle `SessionType` (`name`/`duration`/`color`/`price?`) + `Appointment.sessionTypeId` nullable (`onDelete: SetNull` → supprimer un type ne supprime pas le RDV). API appointments (GET/POST + `[id]` PUT/DELETE) et session-types (GET/POST + `[id]` PATCH/DELETE) ; POST/PUT valident contact+sessionType cross-tenant. Page = calendrier **Week time-grid** (positionnement par minutes 8:00–20:00, blocs colorés par type) + **Month grid**, **fetch unique** (filtrage semaine/mois côté client). Types de session seedés via `npm run db:seed-types` (**non destructif**, idempotent par nom). Disponibilité hebdo = **décoratif** (pas de schéma ; attend le portail client public). Helpers dates/heures dans `lib/scheduler.ts`. ⚠️ **Windows** : `db:push`/`db:generate` échoue (`EPERM` rename du moteur Prisma) si `npm run dev` tourne → **stopper le dev server** avant de régénérer le client.
- **Settings (étape 9)** : migration **additive** Company (+`siret`/`vatNumber`/`address`/`phone`/`email`/`logoUrl` nullable). Layout **sous-nav** (`(app)/settings/layout.tsx`, client) ; `/settings/page.tsx` = `redirect("/settings/general")` (server). Prefill des formulaires via `useAuth()` (type `Company` du AuthProvider **étendu** avec les nouveaux champs). **Profil** : `User.name` (Prisma, scopé `supabaseId`) + `auth.admin.updateUserById` (displayName). **Mot de passe** : re-auth (`signInWithPassword`) pour vérifier l'actuel, puis `auth.updateUser`. **Logo** : upload `multipart/form-data` → route `runtime = "nodejs"` → **Supabase Storage bucket `logos`** (public, créé à la volée si absent ; ou `npm run ensure:bucket`) → `getPublicUrl` → persiste `Company.logoUrl`. Helper `lib/supabase/admin.ts` (service_role, **jamais côté client**). Preview logo en `<img>` (évite la config `remotePatterns` de next/image). **Billing = statique/décoratif** (plans + invoices, hooks "Soon").
- **Inbox (étape 10)** : migration **additive** — modèle `Message` (`direction`/`status`/`subject?`/`body`/`attachments String[]`/`templateId String?`) + enums `MessageDirection`/`MessageStatus` + relations Company/Contact/Project. **`templateId` = simple `String?`** (pas de modèle Template). **GET `/api/messages`** = conversations groupées par contact en JS (messages triés desc → 1ʳᵉ occurrence = dernier ; `unreadCount` = INBOUND non `READ`). **GET `/api/messages/[contactId]`** marque les INBOUND non lus en `READ` (**effet de bord assumé sur le GET**). **POST** : crée OUTBOUND/SENT + **Resend best-effort si `RESEND_API_KEY`** (importé statiquement ; clé vide → aucun envoi, **mode démo SENT**). Page = 2 colonnes pleine hauteur (`calc(100vh-8.5rem)`), bulles via `borderRadius` inline (16/16/4/16 vs 16/16/16/4), groupées par jour (`lib/messages.ts`). Données démo via `npm run db:seed-messages` (non destructif, skip si messages existants). Badge non-lu = **bleu `#3b82f6`** (seule entorse à la palette, demandée par le brief).
- **Automations (étape 11)** : migration **additive** — `Automation` (+ `lastTriggeredAt`/`triggerCount` pour stats & footer réels) + `AutomationAction` (`config Json @default("{}")`, `onDelete: Cascade`) + enums `AutomationTrigger`(8)/`ActionType`(6) + relation `Company.automations`. **⚠️ Gotcha Next.js** : un fichier `route.ts` **n'autorise que les exports handler** (GET/POST/…) + config → les helpers partagés (`isTrigger`, `buildActionsCreate`, `AUTOMATION_SELECT`) sont dans **`lib/automations-server.ts`** (sinon erreur de build "incompatible with index signature"). **PATCH** gère toggle `isActive` seul **ou** update complet (remplacement actions via `actions: { deleteMany: {}, create: [...] }`). Builder : réordonnancement actions via **boutons ↑/↓** (pas de drag) ; délai saisi en hrs/days → converti en `delayHours`. `config` des actions **non éditée** dans l'UI (réinitialisée à `{}` lors d'un edit). Labels/icônes dans `lib/automations.ts`. Démo via `npm run db:seed-automations` (non destructif).
- **Stripe (étape 12)** : migration **additive** — `Payment` + `documentId` (relation) + **`stripePaymentIntentId @unique`** (→ `db:push --accept-data-loss` requis : NULLs seulement, Postgres autorise plusieurs NULL sous unique) ; `Document.payments`. `lib/stripe.ts` (singleton **lazy** — pas d'instanciation au build) + `lib/payments-server.ts` (`ensurePaymentIntent` idempotent : réutilise le PI via `stripePaymentIntentId` sinon crée + (re)lie un `Payment` PENDING). **`POST /api/payments/create-intent`** (authed) → `${origin}/pay/${id}`. **Page `/pay/[id]` = Server Component public** (crée/réutilise le PI serveur, passe `clientSecret` à `PayForm` = `<Elements>`+`<PaymentElement>`, `confirmPayment` redirect `if_required`, devise **EUR**). **Webhook** `runtime="nodejs"` : `request.text()` (raw) + `constructEvent` (signature) → `payment_intent.succeeded` met `Payment`+`Document` PAID (scopé via `metadata`). **Source de vérité = webhook** (→ `stripe listen` en local). `/api/webhooks/*` déjà exclu du `matcher` du middleware.
- **PDF (étape 13)** : `@react-pdf/renderer` (pas installé avant). **⚠️ next.config** : `experimental.serverComponentsExternalPackages: ["@react-pdf/renderer"]` (deps natives `fontkit`/`yoga` à ne PAS bundler). Migration additive : `LineItem` + `Document.lineItems` + **`Document.dueDate`** (inexistant ; fallback `createdAt + 30j`). Template `InvoicePDF.tsx` (**pas** de "use client", Helvetica natif, `<Image>` raster only → SVG ignoré côté générateur). `lib/invoice-pdf.tsx` (JSX → **`.tsx`**) `buildInvoiceBuffer(id, {companyId?})` partagé : authed scopé company / public par id. **Fallback** : 0 `LineItem` → 1 ligne depuis `document.total`. Lignes `total` = HT (qté×PU) ; `document.total` = **TTC** (réécrit par le seed = HT×1.2). Routes `runtime="nodejs"` → `new Response(new Uint8Array(buffer), {Content-Disposition: attachment})`. Route publique `/api/pay/[id]/invoice` **gated `status==="PAID"`** (403 sinon). Warning `jsx-a11y/alt-text` sur `<Image>` react-pdf supprimé en inline (faux positif). Démo : `npm run db:seed-line-items` (3 lignes sur FAC-2025-001, total → 2940 €).
- **Portail client (étape 15)** : **aucune migration DB** (choix délibéré — évite la gotcha Windows Prisma EPERM). Accès = **token signé HMAC stateless** (`lib/client-portal.ts`) plutôt qu'un champ `portalToken` en base : token = `base64url(contactId).HMAC-SHA256(contactId, SECRET)`, infalsifiable, vérif `timingSafeEqual`. Secret = `CLIENT_PORTAL_SECRET` sinon **repli sur `SUPABASE_SERVICE_ROLE_KEY`** (⚠️ roter cette clé invalide tous les liens existants → poser `CLIENT_PORTAL_SECRET` en prod). `getPortalData` **scope tout par `contactId`** + masque les **DRAFT** + refuse les contacts **ARCHIVED** (pas de fuite cross-tenant ni de doc non finalisé). Pages = **server components** (zéro "use client" côté portail) ; coque réutilisable `PortalShell` (branding couleur primaire en **style inline**, Tailwind ne générant pas de classe runtime ; logo en `<img>` comme `/pay` pour éviter `remotePatterns`). Token invalide → `getPortalData` renvoie `null` → `<InvalidLink>` (HTTP 200, aucune donnée). Réutilise l'existant : bouton **Pay** → `/pay/[id]`, **Download invoice** → `/api/pay/[id]/invoice` (public, gated `PAID`). `/client/*` était **déjà whitelisté** (hors `PROTECTED_PREFIXES`, le `matcher` du middleware le laisse passer sans session). Lien partagé via `portalUrl` dans `GET /api/contacts/[id]` + carte "Client portal" (Copy/Open) sur la page détail contact.
- **Resend (étape 14)** : `lib/email.ts` `sendEmail()` **best-effort** (no-op si pas de `RESEND_API_KEY` → mode démo inchangé ; ne lève jamais → n'échoue pas une requête). **Sandbox** : `RESEND_TEST_EMAIL` redirige TOUS les emails vers cette adresse (vrai destinataire dans le sujet `[→ x@y]`) → teste sans domaine vérifié. Resend rend les templates via l'option **`react:`** → routes gardées en `.ts` en passant `createElement(Template, props)` (pas de JSX). Templates react-email `InvoiceEmail`/`PaymentReceiptEmail` (`@react-email/components`, pas de "use client"). Câblage : email facture dans **`create-intent`** (appelé seulement par "Send payment link", PAS par la page `/pay` → zéro spam), reçu dans le **webhook** (URL absolue via `new URL(request.url).origin`), Inbox via `sendEmail`. **Limite Resend test** : sans domaine vérifié, `from` = `onboarding@resend.dev` et `to` = uniquement l'email du compte (d'où `RESEND_TEST_EMAIL`).

### Auth / sécurité
- **`getAuthedCompany()`** : tout endpoint de données lit le user via cookies puis filtre par `owner.supabaseId`. **Règle : aucune requête DB sans scope company.**
- **`setup-company`** sécurisé : valide le `userId` via l'API admin (service_role) au lieu de faire confiance au body, et **auto-confirme l'email** (flux "login immédiat").
- **Mutations scopées** : `PATCH /api/projects/[id]` utilise `updateMany({ where: { id, companyId } })` → impossible de modifier le projet d'une autre company.
- **AuthProvider** porte l'état (un seul listener `onAuthStateChange`) ; `useAuth` consomme le contexte.
- **`.env.local`** = source unique des secrets. La CLI Prisma ne le lit pas → scripts `db:*` via `dotenv-cli`. Le runtime Next le lit nativement.

### Divers / layout
- Sidebar **220px** (spec détaillée) plutôt que 200px.
- Montants affichés avec préfixe **`$`** (cohérence dashboard/finance) bien que SaaS FR.
- Toutes les routes API de données : `export const dynamic = "force-dynamic"`.

### Notes / warnings connus (bénins)
- Build : warning `@supabase/supabase-js` utilise `process.version` (Edge Runtime, dans le middleware) — connu, sans impact, ça fonctionne.
- Les `endDate` du seed sont en **2025 (passé)** → "projects due this week" les compte toutes (artefact de seed volontaire).
- Dates seed stockées en UTC (saisie en heure locale) ; affichage via `toLocaleDateString`.
- `react-email` tire des sous-paquets `deprecated` (warnings npm, pas des erreurs).

---

## 6. Prochaines étapes (ordre recommandé)

> Les **9 pages** et les intégrations **Supabase / Stripe / PDF / Resend** sont faites. Il ne reste que des **intégrations & de l'onboarding** — plus aucune page core à construire.

1. **✅ Portail client (`/client/[token]`) — FAIT (étape 15).** Espace public lecture seule (overview + factures/devis + paiements + RDV), lien signé HMAC. *Évolution possible : actions côté client (accepter un devis, signer un contrat, réserver un créneau via le Scheduler).*
2. **🎯 Google OAuth — ÉTAPE SUIVANTE RECOMMANDÉE.** Activer le provider dans Supabase + **onboarding** des comptes OAuth (créer une Company si absente, sinon dashboard vide). Bouton + `/auth/callback` déjà prêts.
3. **Abonnements SaaS Stripe** — rendre la page **Billing** réelle (Stripe Checkout / Customer Portal) + afficher les payment links dans **Finance**. *(Le paiement CLIENT est déjà fait ; là c'est l'abonnement du studio à Kora.)*
4. **Relances automatiques** — brancher les **Automations** sur **Resend** (envois différés via `delayHours`) + un déclencheur (cron / queue).
5. **Câblage transversal restant** — "New Project" (création), édition projet, recherche Topbar, Quick Action, "Forgot password?", filtres/tri Finance.
6. **Onboarding nouveaux comptes** — un `/register` crée une Company **vide** ; prévoir un wizard ou des données de départ.

---

## Annexes

### Commandes
```bash
npm run dev          # serveur dev (localhost:3000)
npm run build        # build de prod + type-check + lint
npm run db:push      # pousser le schéma Prisma vers Supabase (.env.local chargé)
npm run db:seed      # (re)seeder "Boutique Studio" (DESTRUCTIF : deleteMany → casse le lien owner test@kora.fr)
npm run db:enrich    # enrichit (NON destructif) les 4 contacts existants par email — préserve le login test
npm run db:seed-types # seed NON destructif des 3 types de session (idempotent par nom)
npm run db:seed-messages # seed NON destructif de 6 messages de démo (skip si déjà présents)
npm run db:seed-automations # seed NON destructif de 3 automations de démo (skip si déjà présentes)
npm run db:seed-line-items # seed NON destructif de 3 lignes sur FAC-2025-001 (total → 2940 € TTC)
npm run ensure:bucket # crée/vérifie le bucket Storage public "logos" (idempotent)
npm run db:studio    # Prisma Studio
npm run db:generate  # régénérer le client Prisma
```
### ⚠️ Gotchas Windows (À NE PAS OUBLIER)
1. **Prisma `EPERM` au `db:push` / `db:generate`** : le client Prisma **ne peut PAS se régénérer si `npm run dev` tourne** — le moteur `query_engine-windows.dll.node` est locké par le process Node. → **Toujours stopper le dev avant** : `Get-Process node | Stop-Process -Force`, puis `npm run db:push`, puis **relancer** `npm run dev`. *(Réflexe pris à chaque migration des étapes 6→13.)*
2. **`stripe listen` n'est PAS un process `node`** (binaire Go) → `Get-Process node | Stop-Process` ne le tue pas. On peut donc stopper le dev sans couper le relais des webhooks.
3. **Ajout d'une contrainte `@unique`** → Prisma exige **`--accept-data-loss`** (il ne peut garantir l'absence de doublons ; sûr ici car colonnes NULL only). Sous **PowerShell le `--` est avalé** → utiliser **`npm run db:push -- --accept-data-loss`** (npm relaie l'argument au script).
4. **Ne pas builder pendant le dev** : `next build` et `next dev` écrivent tous deux dans `.next` → stopper le dev avant `npm run build` (évite les conflits de fichiers).

### Conventions de migration (rappel)
- **Toujours additif/non destructif** (`db:push`), **jamais** `db:seed` (ses `deleteMany` cassent le lien owner de `test@kora.fr`). Pour (re)peupler : scripts `db:enrich` / `db:seed-types` / `db:seed-messages` / `db:seed-automations` / `db:seed-line-items` (tous **idempotents**).
- Un fichier **`route.ts`** n'autorise **que** les exports handler (`GET`/`POST`/…) + config → mettre tout helper partagé dans un `lib/*-server.ts` (sinon build casse).

### Variables d'environnement (`.env.local`)
- ✅ Renseignées : `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`, `DATABASE_URL`, + **Stripe (LIVE en prod)** : `STRIPE_SECRET_KEY` (`sk_live_`), `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` (`pk_live_`), `STRIPE_WEBHOOK_SECRET` (`whsec_` de l'endpoint **Live**). *(En local/dev, garder des clés `sk_test_` dans `.env.local` pour ne pas encaisser pour de vrai.)*
- ✅ + **Resend (test)** : `RESEND_API_KEY` (`re_`), `RESEND_FROM` (`Kora <onboarding@resend.dev>` en sandbox), `RESEND_TEST_EMAIL` (redirige tous les emails vers cette adresse en sandbox).
- ⛔ Plus aucune clé vide. *(Pour la prod : vérifier un domaine Resend + `RESEND_FROM` du domaine, supprimer `RESEND_TEST_EMAIL`.)*
- 🔌 **Stripe en local** : lancer `stripe listen --forward-to localhost:3000/api/webhooks/stripe` (terminal séparé) — c'est lui qui relaie les events → sans ça, le Document ne passe pas PAID. Carte test `4242 4242 4242 4242` **uniquement en mode test (local)** ; ⚠️ **en prod = LIVE**, vraies CB seulement.
- 🗂️ **Supabase Storage** : bucket public **`logos`** (créé via `npm run ensure:bucket`, ou à la volée par `/api/settings/logo`) — utilisé par l'upload de logo (Branding).
- 🔑 **`CLIENT_PORTAL_SECRET`** (étape 15, **optionnel**) : secret HMAC des liens du portail client. Non défini → repli sur `SUPABASE_SERVICE_ROLE_KEY` (fonctionne tel quel en dev). **En prod : poser une valeur dédiée** — sinon roter la service_role key casserait tous les liens portail déjà partagés.

### Compte admin (production) — depuis l'étape 16
- **Email** : `kaantekten958@gmail.com` — mot de passe défini à la création (`db:create-admin`, non stocké ici).
- Owner de la company **"Kora Studio"** (plan PRO), **base vide** (aucune donnée de démo).

### ⚠️ Compte de test `test@kora.fr` — SUPPRIMÉ (étape 16)
- Le reset prod (`db:reset-prod`) a supprimé `test@kora.fr` / `Test1234!` **et** toutes les données seed. **N'existe plus** (base partagée dev=prod). Conservé ici pour mémoire des scripts/seed historiques.

### Données seed (Boutique Studio) — HISTORIQUE (supprimées par le reset)
1 company · 4 contacts (Elena CLIENT/VIP · Marcus CLIENT · Sophie PROSPECT · James LEAD ; enrichis phone/company/address/notes) · 3 projects (tous ACTIVE) · 4 documents · 3 payments (2 PAID = 4250+1200, 1 PENDING = 3200) · 3 appointments · 3 tasks (2 HIGH) · 3 session types (Discovery Call/Strategy Session/Project Review) · 6 messages de démo (Elena ×3 out, Marcus ×2 in non lus, Sophie ×1 out — via `db:seed-messages`) · 3 automations (Welcome New Lead, Contract Follow-up, Overdue Invoice Alert — via `db:seed-automations`) · 3 line items sur FAC-2025-001 (via `db:seed-line-items`, total → 2940 € TTC).

### Conventions (rappel `CLAUDE.md`)
TypeScript strict (jamais `any`) · icônes Lucide uniquement · Tailwind uniquement · spacing multiples de 8px · radius cards 16px / boutons 8px / badges pill · ombres tonales · hover cards `translateY(-2px)` · **toutes les requêtes DB filtrées par `companyId`**.
