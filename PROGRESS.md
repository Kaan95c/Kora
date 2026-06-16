# KORA — PROGRESS.md

> **Référence d'état du projet.** À lire en début de chaque session Claude Code.
> SaaS de gestion client pour freelances/agences créatives (alternative FR à HoneyBook).
> **Dernière mise à jour : 2026-06-16 — étape 28 : ONBOARDING WIZARD. Un `/register` (ou 1er login Google) crée une Company **vide** → arrivait sur des pages vides. Désormais : redirection `/register` + `/auth/callback` (nouveau compte) → **`/onboarding`**, wizard **4 étapes** (1 Studio : nom prérempli + tél/adresse optionnels ; 2 Premier client ; 3 Premier projet ; 4 Récap). Page **hors groupe `(app)`** (pas de sidebar/topbar — `app/onboarding/{layout,page}.tsx`, `layout` enrobe juste `AuthProvider` pour `useAuth`). **Soumission groupée à la dernière étape** (PUT `/api/settings/studio` + POST `/api/contacts` si rempli + POST `/api/projects` si rempli + POST `/api/onboarding/complete`) → pas de doublon si l'onglet est fermé, reprise propre. Étapes client/projet **facultatives** (champs vides = ignorées) ; bouton « Passer pour l'instant » = `complete` direct. **Migration additive** : `Company.onboardedAt DateTime?` (db:push) ; backfill `db:mark-onboarded` (lib/mark-onboarded.ts) a marqué les **5 companies existantes** comme onboardées (sinon le gate les renverrait au wizard). **`OnboardingGate`** (`components/onboarding/`, monté dans `(app)/layout` sous AuthProvider) : compte authentifié + `company.onboardedAt === null` → `router.replace('/onboarding')` (reprise ; pas de check DB en middleware Edge). Middleware : `/onboarding` ajouté à `PROTECTED_PREFIXES`. i18n FR/EN namespace `onboarding` (37 clés). `npm run build` + `tsc --noEmit` exit 0. Avant : étape 27 : PAGE DÉTAIL PROJET (`/projects/[id]`) — 5 sections (header : nom éditable inline + statut via dropdown + suppression + dates ; infos générales client/description/budget ; tâches CRUD ; documents liés ; notes autosave 1 s). **Migration additive** : `Project.description` + `Project.notes` (db:push). Routes : `GET/PATCH/DELETE /api/projects/[id]` (PATCH étendu de status-only → update partiel, compat drag Kanban) + `GET/POST/PATCH/DELETE /api/projects/[id]/tasks`. Cartes `/projects` (List = `<Link>`, Kanban = clic gardé par distance de drag) + lien « Review Now » dashboard → `/projects/[id]`. Budget = `totalAmount` existant ; statuts = enum réel (INQUIRY/FOLLOW_UP/BOOKING/ACTIVE/ARCHIVED) ; i18n FR/EN (`projectDetail`). Avant : étape 26 : INTERNATIONALISATION (i18n FR/EN) via `next-intl`. Locale par **cookie `kora-locale`** (défaut `fr`, **pas de routing URL** → pas de flash, SSR correct), lue dans `i18n/request.ts` ; switcher **Settings → Général** (`LanguageSelect`, écrit cookie + localStorage + `Company.language` + `router.refresh()`) ; dictionnaires `messages/{fr,en}.json`. **Tout l'UI applicatif traduit** : les 9 pages (dashboard, contacts, projects, documents, inbox, scheduler, finance, automations, settings/general) + shell (Sidebar/Topbar/SearchCommand) + auth (login/register/forgot/reset) + labels partagés (`UsageMeter`, `PlanLimitDialog`) + pages `error.tsx`/`not-found.tsx`. **Convention** : le **formatage dates/nombres reste codé en dur** (`toLocaleDateString("en"/"en-US")`, préfixe `$`) — non internationalisé volontairement. ⚠️ **Restent NON traduits** : Settings **studio/branding/billing**, pages **légales** + **landing** + bandeau cookies (FR only). Avant : étape 25 : SÉCURISATION COMPLÈTE. (1) RLS Supabase (`security/rls-policies.sql`, 13 tables, défense en profondeur — Prisma bypasse, ferme le trou REST/anon). (2) Validation Zod (`lib/validations.ts`) + sanitization DOMPurify (`lib/sanitize.ts`) sur tous les POST/PUT/PATCH. (3) CORS allowlist (`lib/cors.ts`) + security headers. (4) Rate limiting Upstash (`lib/rate-limit.ts`, middleware). (5) Reset OTP 30 min (réglage Supabase). (6) `app/error.tsx` + `app/not-found.tsx` + `lib/api-handler.ts` (`withApi` enrobe les 33 routes). (7) Index composites DB. (8) `lib/logger.ts` (JSON prod). (9) Sentry (no-op sans DSN). ⚠️ Actions PHASE 0 côté user requises (Upstash/Sentry env, exécuter le SQL RLS, OTP). Avant : étape 24 = RECHERCHE TOPBAR + LIENS DASHBOARD + QUICK ACTION. Avant : étape 23 = FORGOT PASSWORD. Avant : étape 22 = GOOGLE OAUTH. Étapes 1 à 21 = 9 pages + intégrations + prod + abonnements + légal. Prochaine : onboarding (wizard), relances auto, `/projects/[id]`.**
> Voir aussi `CLAUDE.md` (design system + conventions).

---

## 📅 Journal — Rate-limit anti-bot landing (étape 35)

**✅ Protection de la landing `/` contre les floods de bots**
- **Contexte** : attaque bot ≈ **671K requêtes sur `/` en quelques minutes**. Objectif : couper les floods sans gêner les humains.
- **`lib/rate-limit.ts`** : nouveau bucket `landing: make(200, "rl:landing")` → **200 req/min/IP** (sliding window Upstash). Très au-dessus de tout usage humain (personne ne recharge la home 200×/min).
- **`middleware.ts`** : bloc `if (pathname === "/" && request.method === "GET")` → `checkRateLimit("landing", clientIp(request))` → **429 `Too Many Requests`** (+ `Retry-After`) si dépassé. **Placé AVANT `updateSession`** → un flood renvoie 429 sans déclencher le `getUser()` Supabase (protège aussi le backend). Extraction IP factorisée dans un helper **`clientIp(request)`** (réutilisé par le bloc `/api/*`).
- **Fail-open** : sans env Upstash (dev) rien n'est bloqué ; en prod Upstash est configuré (Phase 0 faite) → actif.
- **⚠️ Limite connue** : rate-limit **par IP** → un **botnet distribué** (milliers d'IP, ~1 req chacune) passe sous le seuil. Pour ce cas, la défense est en amont : **Vercel Firewall / Attack Challenge Mode** (gratuit sur Hobby, à activer pendant une attaque). Le rate-limit applicatif couvre le cas courant (peu d'IP, gros volume) = exactement le profil des 671K req.
- `npx tsc --noEmit` + `npm run build` **exit 0**. *(commit `f24ea34`)*

---

## 📅 Journal — Durcissement CSP : nonce + strict-dynamic (étape 34)

**✅ Content-Security-Policy renforcée — `script-src` sans `unsafe-inline`**
- **Contexte** : une 1re passe avait ajouté une CSP statique dans `next.config.mjs` (`headers()`), mais Mozilla Observatory la notait **« implemented unsafely » (−20)** à cause de `'unsafe-inline'` dans **`script-src`**.
- **Solution** : **nonce cryptographique par requête + `'strict-dynamic'`** (pattern officiel Next 14). La CSP **ne peut plus** vivre dans `next.config.mjs` (headers statiques évalués au build, le nonce change à chaque requête) → **déplacée dans `middleware.ts`**.
- **`lib/csp.ts`** (nouveau) : `buildCsp(nonce)` → `default-src 'self'` ; `script-src 'self' 'nonce-…' 'strict-dynamic' js.stripe.com *.vercel-insights.com` ; `style-src 'self' 'unsafe-inline'` (**gardé volontairement** : Next/Tailwind injectent trop de styles inline ; Observatory ne pénalise pas les styles) ; `img-src 'self' data: blob: *.supabase.co` ; `connect-src 'self' *.supabase.co api.stripe.com *.sentry.io *.upstash.io resend.com` ; `frame-src js.stripe.com` ; **`object-src 'none'` · `base-uri 'self'` · `form-action 'self'` · `frame-ancestors 'none'`**. ⚠️ Sous `'strict-dynamic'` les **hôtes** de `script-src` (`js.stripe.com`, `*.vercel-insights.com`) sont **ignorés** par les navigateurs modernes (gardés en fallback CSP2) ; Stripe.js / Vercel Insights restent autorisés car **injectés par un script déjà fiable** (propagation de confiance).
- **`middleware.ts`** : `nonce = Buffer.from(crypto.randomUUID()).toString("base64")` par requête → passé à `updateSession(request, nonce, csp)` (injecté dans les **headers de requête** → Next nonce automatiquement ses scripts de bootstrap) **et** posé sur la **réponse** `Content-Security-Policy` (ce que le navigateur applique), y compris sur les **redirects** login/dashboard.
- **`lib/supabase/middleware.ts`** : `updateSession` accepte `(request, nonce?, csp?)` ; un helper `nextWithHeaders()` reconstruit `new Headers(request.headers)` + `x-nonce` + `content-security-policy` à **chaque** `NextResponse.next` (initial **et** dans `setAll` après `request.cookies.set`) → **cookies de refresh Supabase préservés** + nonce ajouté. Comportement auth strictement inchangé.
- **`next.config.mjs`** : entrée `Content-Security-Policy` **retirée** de `securityHeaders` (les autres headers statiques — X-Frame-Options, X-Content-Type-Options, Referrer-Policy, X-DNS-Prefetch-Control, Permissions-Policy, HSTS — conservés).
- **`app/layout.tsx`** : **aucune modif** — pas de `<Script>`/script inline custom dans le codebase (Next auto-nonce ses scripts via le header CSP de requête ; `SpeedInsights`/`Analytics` Vercel couverts par `'strict-dynamic'`).
- **⚠️ Trade-off assumé** : un nonce par requête **force le rendu dynamique** de toutes les pages (Next ne peut pas pré-générer un nonce fixe) → **landing + pages légales perdent la génération statique / cache CDN du HTML**. Les 14 pages `(app)` étaient déjà `force-dynamic` → impact réel ≈ pages publiques marketing/légales seulement. Confirmé au build : toutes les routes en `ƒ (Dynamic)`.
- **⚠️ Routes hors `matcher`** (`/auth/callback`, `/api/webhooks/*`, assets) **n'ont plus de CSP** (redirects/JSON sans HTML rendu → OK).
- `node --check` + `npx tsc --noEmit` + `npm run build` **exit 0**. ⏳ **Smoke-test navigateur en attente côté user** (console sans violation CSP sur `/dashboard` + landing + `/pay/[id]` Stripe ; re-scan Observatory). *(commit `4eb4ec0`)*

---

## 📅 Journal — Config des actions Automations (étape 33)

**✅ Personnalisation des actions + variables dynamiques**
- **Drawer** (`automations/page.tsx`) : chaque action affiche ses champs selon le type — Email/Rappel → **Sujet + Corps** (+ ligne « Variables disponibles »), Créer une tâche → **Titre**, Ajouter un tag → **Tag**, Changer le statut → **`<select>`** (INQUIRY/FOLLOW_UP/BOOKING/ACTIVE/ARCHIVED, libellés `status.project.*`). `FormAction.config` + `CONFIG_KEYS` par type ; **pré-rempli** à l'édition ; `save()` envoie le `config` élagué + **valide « sujet requis »** pour Email/Rappel.
- **Serveur** : `AUTOMATION_SELECT += config` (pour le prefill) ; `buildActionsCreate` construit un `config` **propre par type** (clés connues, `trim`, plafonné, **sanitizé** via `lib/sanitize`, statut validé contre l'enum).
- **Moteur** (`engine.ts`) : `resolveVars(companyId, context)` (résout `contact_name`/`studio_name`/`project_name`/`appointment_date` depuis les IDs) + `renderTemplate` (`{{ clé }}`, espaces tolérés, var absente → vide) ; appliqué au **sujet + corps** (email/rappel) et au **titre** (tâche). Défauts génériques conservés si la config est vide.
- **i18n** : 8 clés `config*` (FR/EN). ⚠️ **Gotcha ICU** : les placeholders contenant `{{…}}` sont **hardcodés en JSX** (pas via `t()`, sinon `{…}` est interprété comme un placeholder ICU). **Pas de migration** (`config Json` existait). `npm run build` + `tsc` exit 0.
- **✅ Validé en prod (2026-06-15)** : e-mail d'automatisation reçu avec `{{studio_name}}` et `{{contact_name}}` correctement remplacés par les vraies valeurs (nom du studio + nom du contact).

---

## 📅 Journal — Inbox mobile + correctifs prod auth (étape 32)

**✅ Inbox master/détail mobile (étape 32)**
- `< md` : on affiche **soit** la liste **soit** la conversation (plein écran), piloté par `selectedId` (déjà existant). Classes : liste `${selectedId ? "hidden md:flex" : "flex"}` (+ `flex-1` mobile / `md:w-[320px] md:flex-none` desktop) ; conversation `${selectedId ? "flex" : "hidden md:flex"}`. Suppression de l'empilement `max-md:h-[45%]`.
- Bouton **« ← Retour »** (`ArrowLeft`, `md:hidden`) dans l'en-tête conversation → `setSelectedId(null)` (revient à la liste). Titre = nom du contact (déjà dans l'en-tête). i18n `inbox.back` (FR/EN).
- **Desktop ≥ md inchangé** (2 colonnes côte à côte).

**✅ Correctifs prod auth (cette session, déjà en prod)**
- **Inscription** : `setup-company` réécrit — identité dérivée de la **session validée serveur** (`supabase.auth.getUser()`), **plus de `userId` du body ni de dépendance service_role** ; le formulaire fait `signIn` **avant** setup-company. ⚠️ Suppose **« Confirm email » OFF** côté Supabase (fait par le user). Avant ça : 429 (rate-limit `/api/auth/me` trop strict → corrigé) puis « Invalid user » (clé service_role d'un projet ≠ → contourné par l'approche session).
- **Google OAuth → landing** : `/auth/callback` réécrit pour **poser les cookies de session explicitement sur la réponse de redirect** (bug : `cookies()` next/headers non attachés au `NextResponse.redirect`) + base via `x-forwarded-host` ; filet `app/page.tsx` (un `?code` sur `/` est transmis au callback). Config Supabase Redirect URLs + Google Cloud vérifiée côté user.
- ⚠️ **Déploiement Vercel** : auto-deploy GitHub capricieux cette session → plusieurs **commits vides** pour forcer. Si ça récidive : vérifier l'intégration Git Vercel / le webhook GitHub.

---

## 📅 Journal — Exécution réelle des automatisations (étape 31)

**✅ Terminé — les automatisations s'exécutent vraiment**
- **Moteur** `lib/automations/engine.ts` : `triggerAutomations(companyId, trigger, context)` (**best-effort, ne throw jamais** → ne casse jamais la requête déclenchante) → cherche les automations **actives** `{companyId, trigger}` (actions triées + `config`), incrémente `triggerCount`/`lastTriggeredAt`, puis pour chaque action : **delay 0 = inline (awaited)**, **delay > 0 = mise en file `AutomationQueue`** (`runAt = now + delayHours`). `runAction()` exporté (réutilisé par le cron). Chaque action en `try/catch` + `logger`.
- **Contexte = IDs sérialisables uniquement** (`{ contactId?, projectId?, documentId?, appointmentId? }`) → les exécuteurs résolvent email/nom/studio depuis la DB (scoping `companyId`) à l'exécution (donnée fraîche, et stockable en JSON pour les actions différées).
- **Exécuteurs** : `SEND_EMAIL` / `SEND_REMINDER` (Resend, `config.subject`/`body` sinon défauts ; skip si pas d'email), `CREATE_TASK` (`config.title`), `CHANGE_PROJECT_STATUS` (`config.status`, **écriture Prisma directe → pas de récursion** sur PROJECT_STATUS_CHANGED), `ADD_TAG` (`config.tag`, dédup), `SEND_DOCUMENT` = **no-op tracé** (hors périmètre).
- **Migration additive** : modèle `AutomationQueue` (companyId/automationId/type/config/`context Json`/runAt/status PENDING|DONE|FAILED/attempts ; index `(status,runAt)`) via `db:push`.
- **Triggers branchés** (awaited) : `POST /api/contacts` → **NEW_LEAD** (si statut `LEAD`) ; `POST /api/documents` → **INVOICE_SENT** (si `type === INVOICE`) ; webhook Stripe `payment_intent.succeeded` → **PAYMENT_RECEIVED** ; `PATCH /api/projects/[id]` → **PROJECT_STATUS_CHANGED** (lit l'**ancien statut** avant l'update, fire seulement si changé → pas de fire sur édition nom/notes ni drag sans effet) ; `POST /api/appointments` → **APPOINTMENT_BOOKED**.
- **Cron** `app/api/cron/automations/route.ts` (`runtime nodejs`, GET) : auth `Authorization: Bearer ${CRON_SECRET}` (exigée si l'env est posée, sinon warn) ; (1) **PAYMENT_OVERDUE** = `Payment` PENDING avec `dueDate < now` → bascule **OVERDUE une fois** puis fire (idempotent, pas de spam quotidien) ; (2) traite la file `AutomationQueue` due (`runAt <= now`, batch 200) → `runAction` → `DONE`. `vercel.json` : cron `0 9 * * *` (09:00 **UTC** quotidien).
- **⚠️ Conséquence (plan Hobby, D2)** : 1 cron/jour → les actions différées (`delayHours`) ont une **granularité ~journalière** (partent au prochain passage 9h UTC). Passer à `0 * * * *` (horaire) si upgrade Pro.
- **⚠️ Action user** : définir **`CRON_SECRET`** dans les env Vercel (sinon le cron est non protégé ; Vercel injecte le header `Authorization` automatiquement quand l'env existe). `npm run build` + `tsc --noEmit` exit 0.
- **Notes** : `CONTRACT_SIGNED` et `TAG_ADDED` (enum) **pas encore câblés** (hors demande) — moteur prêt. Anti-récursion garanti car les exécuteurs écrivent via Prisma, pas via les routes API.

---

## 📅 Journal — Changement de domaine principal (étape 30)

**✅ Terminé — `app.kora-app.fr` → `kora-app.fr`**
- Remplacé `app.kora-app.fr` par `kora-app.fr` dans le **code** : `lib/cors.ts` (allowlist CORS), `lib/create-admin.ts` (`LOGIN_URL`), pages légales (`app/legal/layout.tsx` footer, `app/legal/mentions/page.tsx` ×2, `app/legal/cgv/page.tsx`).
- **Inchangé** (volontaire) : `hello@kora-app.fr` (email, déjà sur le domaine racine) ; `/auth/forgot-password` + OAuth utilisent **`window.location.origin`** (dynamique) → suivent automatiquement le nouveau domaine, aucun domaine en dur.
- **✅ Infra (côté user, confirmé)** : Stripe webhook → `kora-app.fr` ; Supabase *Site URL* + *Redirect URLs* → `kora-app.fr` ; Google Cloud OAuth → `kora-app.fr` ajouté.
- **CORS double domaine (transition)** : `lib/cors.ts` autorise **`kora-app.fr` ET `app.kora-app.fr`** le temps de la bascule → à réduire à `kora-app.fr` seul quand l'ancien sous-domaine n'aura plus de trafic.

---

## 📅 Journal — Session du 2026-06-16 (suite)

**✅ Terminé — Optimisation des performances de navigation (étape 29)**
- **Audit** : les 14 pages `(app)` sont **100 % client-side + fetch en `useEffect`** (aucun SSR, aucun cache → chaque retour sur une page refait tout le chargement). Coût secondaire = **double `getUser()` Supabase** par chargement (middleware + `getAuthedCompany` dans chaque route API). Bundles lourds (Recharts) chargés en synchrone (Dashboard 358 kB / Finance 293 kB). Pas de `loading.tsx`.
- **Cache client « stale-while-revalidate »** (`lib/hooks/useResourceCache.ts`, Map module-level, durée = onglet) appliqué à **Dashboard** (bundle des 5 endpoints, read-only), **Contacts** et **Projects** (init de l'état depuis le cache + write après fetch + miroir sur mutation optimiste + garde anti-vidage si revalidation échoue). **Retour sur une page = instantané**, revalidé en fond. `AuthProvider` : **warm-start `sessionStorage`** de `/api/auth/me` (lu après montage → pas de mismatch d'hydratation ; purgé au sign-out).
- **⚠️ Décision** : **PAS** de `Cache-Control` HTTP sur `/api/auth/me|contacts|projects` (routes **authentifiées par cookie** + `force-dynamic`) → risque de **fuite inter-utilisateurs** (cache partagé) et de **données périmées après création/édition**. Le cache est donc strictement **côté client**.
- **`app/(app)/loading.tsx`** : skeleton générique instantané (supprime l'écran blanc entre pages).
- **Recharts en `next/dynamic`** (`ssr:false` + placeholder) : graphiques extraits dans `components/dashboard/RevenueAreaChart.tsx` + `components/finance/RevenueBarChart.tsx`. **First Load JS : Dashboard 358→255 kB, Finance 293→187 kB** (Recharts déplacé dans un chunk différé).
- **Prefetch `<Link>`** : déjà actif par défaut (App Router) → vérifié, rien à changer.
- **Reste recommandé (non fait, blast-radius auth/sécurité)** : supprimer le **double `getUser()`** (middleware pose `x-user-id` validé → routes le lisent au lieu de re-`getUser`) → gain au **premier** chargement. `npm run build` + `tsc --noEmit` exit 0.

---

## 📅 Journal — Session du 2026-06-16

**✅ Terminé aujourd'hui — Onboarding wizard (étape 28)**
- **Problème** : `/register` (et 1er login Google) crée une Company **vide** → le nouvel inscrit atterrissait sur des pages vides.
- **Migration additive** : `Company.onboardedAt DateTime?` (`db:push`). Backfill **`db:mark-onboarded`** (`lib/mark-onboarded.ts`, idempotent — `updateMany` sur `onboardedAt: null`) lancé une fois → **5 companies existantes** marquées onboardées (l'owner « Kora Studio » + comptes de test antérieurs) pour ne pas les renvoyer au wizard.
- **Route** `POST /api/onboarding/complete` (`withApi`, scopée companyId, idempotente) → pose `onboardedAt = now()`. `onboardedAt` ajouté au type `Company` de l'`AuthProvider` (déjà renvoyé par `/api/auth/me` car `getAuthedCompany` retourne la row complète).
- **Page** `app/onboarding/{layout,page}.tsx` **hors groupe `(app)`** (donc **pas d'AppShell** — expérience focalisée). `layout` = `AuthProvider` seul (pour `useAuth`). Wizard **4 étapes** (stepper iconographié) : (1) **Studio** — nom prérempli depuis `company.name` + tél/adresse optionnels ; (2) **Premier client** — first/last/email + entreprise/tél (facultatif, status `CLIENT`) ; (3) **Premier projet** — nom + statut + case « Lier à {client} » (si client renseigné, facultatif) ; (4) **Récap** + « Accéder au tableau de bord ». **Soumission groupée à l'étape 4** : PUT `/api/settings/studio` + POST `/api/contacts` (si complet) + POST `/api/projects` (si nom rempli, `contactId` du contact créé) + POST `/api/onboarding/complete` → `router.push('/dashboard')`. Bouton **« Passer pour l'instant »** = `complete` direct (aucune donnée). Garde : `company.onboardedAt` déjà posé → `replace('/dashboard')`.
- **Câblage** : `/register` succès → `router.push('/onboarding')` (au lieu de `/dashboard`) ; `/auth/callback` → redirige vers `/onboarding` **uniquement si un nouveau compte a été créé** (`createdNewAccount`), sinon garde `next` (compat reset password) ; `middleware.ts` → `/onboarding` dans `PROTECTED_PREFIXES` ; **`OnboardingGate`** (`components/onboarding/OnboardingGate.tsx`) monté dans `(app)/layout` sous `AuthProvider` → si `!isLoading && user && company && !company.onboardedAt` → `replace('/onboarding')` (reprise si onglet fermé en plein wizard ; pas de requête DB en middleware Edge, d'où le gate client).
- **i18n** : namespace `onboarding` (FR/EN, **37 clés**, symétriques). Caps FREE (5 contacts / 3 projets) → créer 1 contact + 1 projet passe largement. `npm run build` + `tsc --noEmit` exit 0.

**⏳ Prochaine session — reprise (ordre de priorité)**
1. **Relances automatiques** — brancher les **Automations** sur **Resend** (envois différés via `delayHours`) + un déclencheur (cron / queue).
2. **Inbox master/détail mobile** — UX dédiée < `md` (bascule liste ↔ conversation ; aujourd'hui les deux colonnes sont empilées).
3. **i18n** Settings studio/branding/billing (formulaires encore FR only).
4. *(Évolution onboarding possible : option « charger des données d'exemple » + reprise étape par étape persistée.)*

---

## 📅 Journal — Session du 2026-06-15

**✅ Terminé aujourd'hui — Page détail projet (étape 27)**
- **Migration additive** : `Project.description` + `Project.notes` (nullable, `db:push`).
- **API** : `GET /api/projects/[id]` (détail + contact + documents + tasks) ; **PATCH** réécrit (status-only → update partiel : name/status/contactId/description/notes/totalAmount/dates ; `sanitizeNullable` ; contact anti cross-tenant ; **reste compat drag Kanban** qui n'envoie que `{status}`) ; **DELETE** (`deleteMany` scopé) ; nouvelle route `GET/POST/PATCH/DELETE /api/projects/[id]/tasks` (scopée projet + company, `taskId` en body PATCH / `?taskId=` DELETE).
- **Page** `app/(app)/projects/[id]/page.tsx` (client) : 5 sections — header (nom inline, dropdown statut, suppression confirm, dates) ; infos client/description/budget + « Enregistrer » ; tâches checkbox/add(Enter)/delete ; documents liés → `/documents` + « Nouveau document » → `/documents?new=1` ; notes **autosave debounce 1 s**.
- **Navigation** : cartes `/projects` cliquables (List `<Link>`, Kanban `onClick` gardé par distance de drag > 6 px) ; `GET /api/dashboard/tasks` renvoie `project.id` → « Review Now » → `/projects/[id]`.
- **i18n** : namespace `projectDetail` (FR/EN). **Décisions** : Budget = `totalAmount` existant ; statuts = enum réel (pas « Lead/Completed » du brief). `npm run build` + `tsc --noEmit` exit 0.

**⏳ Prochaine session — reprise 2026-06-16 (ordre de priorité)**
1. **Onboarding wizard** (PRIORITÉ) — un `/register` crée une Company **vide** (seul l'historique seed était rattaché à un compte). Prévoir un wizard de démarrage après inscription (infos studio + premiers contacts/projets ou données d'exemple) pour que le nouveau compte n'arrive pas sur des pages vides.
2. **Relances automatiques** — brancher les **Automations** sur **Resend** (envois différés via `delayHours`) + un déclencheur (cron / queue).
3. **Inbox master/détail mobile** — UX dédiée < `md` (bascule liste ↔ conversation ; aujourd'hui les deux colonnes sont empilées).

---

## 📅 Journal — Session du 2026-06-14

**✅ Terminé aujourd'hui — i18n FR/EN (étape 26)**
- **Phase 1 (infra)** : `next-intl` sans routing URL, locale par cookie `kora-locale` (`i18n/request.ts`, défaut `fr`) + `NextIntlClientProvider` (racine) + champ `Company.language` + route `PUT /api/settings/language` + switcher `LanguageSelect` (Settings → Général). *(commit `ad0422e`)*
- **Phase 2 (shell + dashboard + settings/general)** *(commit `f6a2867`)*.
- **Phase 3a (auth)** : login, register, forgot, reset *(commit `9fdbc12`)*.
- **Phase 3b (pages données)** : Contacts, Projects, Documents, Inbox *(commits déjà faits)* puis **Scheduler**, **Finance**, **Automations** *(cette session)*. Chaque page = un commit `feat(i18n): page X traduite`.
- **Phase 4 (labels/erreurs)** : `UsageMeter` + `PlanLimitDialog` (chrome) localisés ; les 4 appelants passent un `usageLabel` traduit ; `app/error.tsx` (`useTranslations`) + `app/not-found.tsx` (`getTranslations`, server).
- **Convention assumée** : dates/nombres **non** internationalisés (restent `en`/`en-US` + `$`), cohérent avec les pages déjà faites.

**⏳ Reste (i18n)**
- Settings **studio / branding / billing** (formulaires non traduits).
- Pages **légales** + **landing** + bandeau **cookies** (FR only — marketing/juridique).
- Messages d'erreur **serveur** (validations Zod, `limitMessage` de `plan-limits`) : encore en FR (corps des 400/403). Le **chrome** de la modale de limite est traduit, pas le `message` serveur.

---

## 📅 Journal — Session du 2026-06-11

**✅ Terminé aujourd'hui**
- **Sécurisation complète (étape 25, 9 volets)** : RLS SQL · Zod + DOMPurify · CORS + security headers · rate limiting Upstash · OTP 30 min · pages erreur/404 + `withApi` sur 33 routes · index composites DB · logger JSON · Sentry
- **✅ Phase 0 (user) FAITE** : Upstash (env local + Vercel) · Sentry (DSN + token + org/project, local + Vercel) · `security/rls-policies.sql` exécuté · OTP = 1800 s
- **✅ Sentry actif** : événements tagués `kind=stripe_webhook` (échec webhook) et `kind=rate_limit` (pic) ajoutés → 3 alertes configurables (voir plus bas)
- **Recherche Topbar fonctionnelle** (modal ⌘K + `GET /api/search` + résultats groupés) — étape 24
- **Liens Dashboard câblés** (View All / View Full Calendar / CTA tâches urgentes) — étape 24
- **Menu Quick Action** (Sidebar → New Project/Contact/Document/RDV via `?new=1`) — étape 24
- **Forgot password** (`/forgot-password` + `/auth/reset-password` + lien câblé sur `/login`) — étape 23
- **Google OAuth** (login + register + onboarding dans `/auth/callback`) — étape 22
- **Pages légales** (CGV, RGPD/confidentialité, mentions légales) — étape 21
- **Bandeau cookies** (cookies essentiels) — étape 21
- **Gating par plan FREE / STARTER / PRO** enforcé (`lib/plan-limits.ts`) — étape 20
- **New Project drawer** câblé (+ `POST /api/projects`) — étape 20
- **Domaine custom `app.kora-app.fr`** (remplace `kora-nine-topaz.vercel.app`) — *⚠️ devenu `kora-app.fr` à l'étape 30*
- **Resend vérifié** sur `hello@kora-app.fr` (`RESEND_FROM`, plus de sandbox) + **redirection email `hello@` → Gmail**
- **Stripe Live validé** — **vrai paiement de 19€ testé** end-to-end
- **Responsive mobile complet** — étape 18
- **Landing page** intégrée avec les **vrais tarifs** (FREE 0€ / STARTER 19€ / PRO 39€) — étape 19

**⏳ Prochaine session — à faire**
- **Onboarding nouveaux inscrits** (wizard)
- **Page détail projet** `/projects/[id]` (les résultats de recherche + CTA « Review Now » pointent pour l'instant vers `/projects` faute de page détail)
- **Relances automatiques** (Automations → Resend, envois différés + déclencheur cron/queue)
- **Inbox master/détail mobile** (UX dédiée < md)

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
| Étape 17 — **Abonnements SaaS Stripe** (Checkout + Customer Portal + webhook + Billing branchée, plans FREE/STARTER/PRO) | ✅ Fait |
| Étape 18 — **Responsive mobile complet** (sidebar overlay + hamburger + toutes les pages) | ✅ Fait |
| Étape 19 — **Landing page publique** (`/` : marketing FR « Serene Workspace », redirect connecté → `/dashboard`, CTA → `/register` + `/login`) | ✅ Fait |
| Étape 20 — **Gating / quotas par plan ENFORCÉ** (`lib/plan-limits.ts` : `checkLimit`, 403 sur POST projects/contacts/documents/automations + portail Free désactivé ; toast upsell + compteurs d'usage) | ✅ Fait |
| Étape 21 — **Pages légales + bandeau cookies** (`/legal/cgv` · `/legal/privacy` · `/legal/mentions` ; bandeau cookies essentiels ; liens dans le footer landing) | ✅ Fait |
| Étape 22 — **Google OAuth** (boutons « Continue with Google » sur `/login` + `/register` ; onboarding OAuth dans `/auth/callback` : crée Company+User au 1er login) | ✅ Fait |
| Étape 23 — **Forgot password** (`/forgot-password` `resetPasswordForEmail` + `/auth/reset-password` `updateUser` ; lien câblé sur `/login` ; reset routé via `/auth/callback`) | ✅ Fait |
| Étape 24 — **Recherche Topbar + liens Dashboard + Quick Action** (`GET /api/search` scopée + modal `SearchCommand` ⌘K/debounce/groupes ; liens Dashboard en `<Link>` ; menu Quick Action Sidebar → drawers via `?new=1` + `useNewDrawerParam` + `<Suspense>` AppShell) | ✅ Fait |
| Étape 25 — **Sécurisation complète** (RLS SQL · Zod + DOMPurify · CORS + headers · rate limiting Upstash · OTP 30 min · error/404 + `withApi` sur 33 routes · index composites · logger JSON · Sentry) | ✅ Code fait — ⚠️ **Phase 0 user requise** (env Upstash/Sentry, SQL RLS, OTP) |
| Étape 26 — **Internationalisation FR/EN** (`next-intl`, cookie `kora-locale`, switcher Settings ; 9 pages + shell + auth + labels partagés + error/404 traduits ; dates/nombres non i18n par convention) | ✅ Fait — ⚠️ reste Settings studio/branding/billing + légal/landing |
| Étape 27 — **Page détail projet** (`/projects/[id]` : header éditable + infos client/description/budget + tâches CRUD + docs liés + notes autosave ; routes `GET/PATCH/DELETE` + `[id]/tasks` ; cartes & dashboard → détail ; migration `description`/`notes`) | ✅ Fait |
| Étape 28 — **Onboarding wizard** (`/onboarding` hors `(app)`, 4 étapes : studio/client/projet/récap ; soumission groupée → studio+contact+project+complete ; migration `Company.onboardedAt` + backfill `db:mark-onboarded` ; redirections register/OAuth + `OnboardingGate` ; i18n FR/EN) | ✅ Fait |
| Étape 29 — **Perf navigation** (cache client SWR `useResourceCache` sur Dashboard/Contacts/Projects + warm-start AuthProvider ; `loading.tsx` ; Recharts en `dynamic` → Dashboard 358→255 kB, Finance 293→187 kB) | ✅ Fait |
| Étape 30 — **Domaine principal `kora-app.fr`** (remplace `app.kora-app.fr` dans le code ; CORS double domaine en transition) | ✅ Fait |
| Étape 31 — **Exécution réelle des automatisations** (moteur `lib/automations/engine.ts` ; triggers NEW_LEAD/INVOICE_SENT/PAYMENT_RECEIVED/PROJECT_STATUS_CHANGED/APPOINTMENT_BOOKED branchés ; actions email/rappel/tâche/statut/tag ; délais via `AutomationQueue` + cron `0 9 * * *` ; PAYMENT_OVERDUE en cron) | ✅ Fait — ⚠️ user : poser `CRON_SECRET` (Vercel) |
| Étape 32 — **Inbox master/détail mobile** (`< md` : liste plein écran ↔ conversation plein écran + bouton « ← Retour » ; bascule via `selectedId` ; desktop 2 colonnes inchangé) | ✅ Fait |
| Étape 33 — **Config des actions Automations + variables dynamiques** (drawer : champs par type — email sujet/corps, tâche titre, tag, statut select ; `config` persisté/pré-rempli ; moteur substitue `{{contact_name}}`/`{{studio_name}}`/`{{project_name}}`/`{{appointment_date}}` ; sujet requis email/rappel) | ✅ Fait — **validé en prod** |
| Étape 34 — **Durcissement CSP (nonce + strict-dynamic)** (`lib/csp.ts` + nonce par requête dans `middleware.ts` → retire `'unsafe-inline'` de `script-src`, corrige le −20 Observatory ; CSP statique retirée de `next.config.mjs` ; `style-src 'unsafe-inline'` gardé ; trade-off : rendu dynamique des pages publiques) | ✅ Code + build OK — ⏳ **smoke-test user** (console CSP + Observatory) |
| Étape 35 — **Rate-limit anti-bot landing** (bucket Upstash `landing` 200 GET/min/IP sur `/` dans `middleware.ts`, avant `updateSession` ; helper `clientIp` ; suite au flood ~671K req sur `/`) | ✅ Fait — ⚠️ botnet distribué → activer Vercel Attack Challenge Mode |
| Étapes suivantes | ⏳ i18n Settings studio/branding/billing, *(perf : supprimer le double getUser ; automations : câbler CONTRACT_SIGNED/TAG_ADDED)* |

**Le projet compile (`npm run build` exit 0), tourne (`npm run dev`), et l'auth fonctionne end-to-end.**
**Les 9 pages sont complètes et branchées aux vraies données — plus aucun placeholder.** 🎉
**Intégrations faites : Supabase (auth + Storage), Stripe (paiement client + webhook), PDF factures (`@react-pdf/renderer`), Resend (emails réels), portail client public.** → **15 étapes terminées.**
**Portail client (`/client/[token]`) : espace public en lecture seule (overview + documents/factures + paiements + RDV), branding studio dynamique, lien signé HMAC stateless (pas de migration DB, pas de compte côté client), réutilise `/pay` + le PDF public gated PAID.**

**🚀 EN PRODUCTION (étape 16) : déployé sur Vercel → https://kora-app.fr (domaine principal depuis étape 30, ex `app.kora-app.fr` ; repo `github.com/Kaan95c/Kora`, branche `main`).**
**Base de prod **réinitialisée** via `npm run db:reset-prod` (plus aucune donnée de démo). **Compte admin réel** créé via `npm run db:create-admin` : `kaantekten958@gmail.com` → studio **"Kora Studio"** (plan PRO).**
**⚠️ Le compte de test `test@kora.fr` et les données seed "Boutique Studio" N'EXISTENT PLUS (supprimés par le reset, base partagée dev=prod). Pour re-peupler du dev, recréer un compte via `/register` ou relancer les scripts seed.**

**💳 STRIPE EN MODE LIVE (argent réel) depuis le 2026-06-10 : `STRIPE_SECRET_KEY=sk_live_…`, `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_live_…`, `STRIPE_WEBHOOK_SECRET=whsec_…` (endpoint **Live**), redeploy Vercel fait. → Les paiements clients sur `/pay/[id]` encaissent de VRAIES CB. La carte de test `4242…` ne marche plus en prod.**

**🔁 ABONNEMENTS SaaS (étape 17) : le studio paie Kora. Plans **FREE / STARTER 19€ / PRO 39€** (mensuel). `Company` + champs Stripe (`stripeCustomerId`/`stripeSubscriptionId`/`subscriptionStatus`/`currentPeriodEnd`/`cancelAtPeriodEnd`). Routes `POST /api/billing/checkout` (Checkout subscription) + `POST /api/billing/portal` (Customer Portal). Webhook étendu : `checkout.session.completed` + `customer.subscription.created/updated/deleted` + `invoice.payment_failed` → sync `plan`/statut. Page `/settings/billing` branchée. Price IDs en env `STRIPE_PRICE_STARTER`/`STRIPE_PRICE_PRO` (test en local, live sur Vercel). Limites par plan dans `lib/billing-server.ts` (`PLAN_LIMITS`, **enforcées depuis l'étape 20** via `lib/plan-limits.ts`). Compte owner = PRO offert (sans abonnement Stripe).**

**📱 RESPONSIVE MOBILE (étape 18) : `components/layout/AppShell.tsx` (état sidebar partagé). Sidebar = overlay + backdrop < md (`md:static` inchangé desktop), hamburger + logo dans la Topbar (recherche/Bell/Help/New Project cachés < md). Dashboard + toutes les pages : grids `grid-cols-1 md:/lg:`, tables (Contacts/Finance/Documents) en `overflow-x-auto` + `min-w`, drawers `w-full sm:w-[…]`, modals `mx-4`. Breakpoints : mobile défaut / `md:`768 / `lg:`1024. ⚠️ Inbox = empilé (liste 45% + conversation) ; une vraie UX master/détail reste à faire.**

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
| zod | **4.x** | Validation des entrées API (`lib/validations.ts`). ⚠️ v4 : `z.enum(x, { message })`, plus `errorMap`. |
| isomorphic-dompurify | installé | Sanitization XSS serveur (`lib/sanitize.ts`). |
| @upstash/ratelimit + /redis | installés | Rate limiting par IP (middleware). Fail-open sans env. |
| @sentry/nextjs | **10.x** | Monitoring erreurs. No-op sans `NEXT_PUBLIC_SENTRY_DSN`. |
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
- ✅ Pages `login` + `register` (design 2 colonnes vert, toggle mot de passe, checklist mdp, **bouton Google OAuth fonctionnel** — étape 22).
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
| `/api/onboarding/complete` | POST (pose `Company.onboardedAt`) | ✅ 401 | owner |
| `/api/cron/automations` | GET (overdue + file différée) | `Bearer CRON_SECRET` | toutes companies |
| `/api/dashboard/metrics` | GET | ✅ 401 | owner |
| `/api/dashboard/revenue-chart` | GET | ✅ 401 | owner |
| `/api/dashboard/projects` | GET | ✅ 401 | owner |
| `/api/dashboard/appointments` | GET | ✅ 401 | owner |
| `/api/dashboard/tasks` | GET | ✅ 401 | owner |
| `/api/projects` | GET, **POST** (création, gated plan) | ✅ 401 | owner |
| `/api/projects/[id]` | GET (détail + docs + tasks), PATCH (update partiel ou statut seul), DELETE | ✅ 401 | owner (`updateMany`/`deleteMany` scopé) |
| `/api/projects/[id]/tasks` | GET, POST, PATCH (toggle/title via `taskId`), DELETE (`?taskId=`) | ✅ 401 | owner (scopé projet + company) |
| `/api/finance` | GET | ✅ 401 | owner |
| `/api/search` | GET (`q`, contacts/projects/documents, max 5/cat.) | ✅ 401 | owner |
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
| Projects | `/projects` + `/projects/[id]` | ✅ Oui (liste + Kanban drag + création + **page détail CRUD** : header éditable, infos, tâches, docs liés, notes) | ✅ `/api/projects` + `[id]` (GET/PATCH/DELETE) + `[id]/tasks` | ✅ Oui | ✅ Oui |
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
- ⏳ Bouton **"New Project"** (Topbar) — toujours décoratif (le drawer de création est ouvert via Quick Action / page Projects, pas via ce bouton).
- ✅ Édition de projet (nom, statut, contact, description, budget, dates, notes) — **FAIT (étape 27)** via la page détail `/projects/[id]`.
- ✅ Bouton **"Quick Action"** (Sidebar) — **FAIT (étape 24)** : menu → New Project/Contact/Document/RDV.
- ✅ Barre de **recherche** (Topbar) — **FAIT (étape 24)**. Icônes **Bell** / **Help** toujours décoratives.
- ✅ Lien **"Forgot password?"** (login) — **FAIT (étape 23)**.
- ✅ Boutons Dashboard (**View All** / **View Full Calendar** / CTA tâches urgentes) — **FAIT (étape 24)**.
- ⏳ Boutons **"Filters"** / **"Sort by Date"** (Finance).
- ⏳ Pagination Finance OK ; tri/filtre réels à faire.

### Intégrations non branchées
- 🟡 **Stripe** — **paiement client FAIT** : "Send payment link" sur les factures (page Documents), page publique **`/pay/[id]`** (Elements CB + SEPA), webhook `payment_intent.succeeded` → `Payment` + `Document` = **PAID**. **Reste** : abonnements SaaS (rendre le **Billing** réel) + intégrer les payment links dans la page **Finance**.
- ✅ **Google OAuth — FAIT (étape 22)** : provider Google activé dans Supabase (credentials Google Cloud → redirect URI `…supabase.co/auth/v1/callback`) ; boutons « Continue with Google » sur `/login` + `/register` (`signInWithOAuth` → `redirectTo: ${origin}/auth/callback`) ; **onboarding OAuth** dans `/auth/callback` (échange du code puis crée Company+User si 1er login, nom de studio dérivé du profil Google). Garde-fou anti-doublon sur `User.email` (@unique).
- ✅ **PDF (`@react-pdf/renderer`)** — **FAIT** : template `components/pdf/InvoicePDF.tsx` (en-tête vert, bloc client, lignes, sous-total HT / TVA 20% / Total TTC, mentions légales + « Généré par Kora »), générateur `lib/invoice-pdf.tsx` (`buildInvoiceBuffer`, fallback ligne unique). Routes `GET /api/documents/[id]/pdf` (authed) + `GET /api/pay/[id]/invoice` (public, gated `PAID`). Boutons "Download PDF" (Documents) + "Download your invoice" (page `/pay` succès). Modèle `LineItem` + `Document.dueDate`.
- ✅ **Resend / react-email** — **FAIT** : `lib/email.ts` (`sendEmail` **best-effort**, expéditeur `RESEND_FROM`) + templates `components/emails/InvoiceEmail.tsx` & `PaymentReceiptEmail.tsx`. Câblé : "Send payment link" → **email facture** (dans `create-intent`), webhook `payment_intent.succeeded` → **reçu de paiement**, Inbox → **email du message**. **Domaine vérifié `kora-app.fr`** (`RESEND_FROM=Kora <hello@kora-app.fr>`) → emails envoyés aux **vrais destinataires**, plus de redirection sandbox. **Reste** : relances auto (automations).
- ✅ **Portail client** (`/client/[token]`) — **FAIT** (étape 15) : espace public lecture seule (overview + factures/devis + paiements + RDV), lien signé HMAC. **Reste** : actions côté client (accepter un devis, signer un contrat, réserver un créneau) = lecture seule pour l'instant.
- ✅ **Onboarding nouveaux comptes — FAIT (étape 28)** — wizard `/onboarding` après `/register` & 1er login Google (studio + premier client + premier projet, étapes facultatives, soumission groupée). `Company.onboardedAt` + `OnboardingGate` (reprise). *(Évolution possible : option « données d'exemple ».)*

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
- **Gating / quotas par plan (étape 20)** : **aucune migration** (réutilise `Company.plan` + `PLAN_LIMITS` de `billing-server`). **`lib/plan-limits.ts`** (server-only, importe Prisma) = source de vérité de l'enforcement : `checkLimit(companyId, resource, plan) → {allowed, current, max}` (compte via Prisma ; **contacts hors `ARCHIVED`** ; projets/documents/automatisations = tous ; **PRO/Infinity → pas de requête de comptage**), `limitMessage` (FR ; **cap 0 automatisations = message dédié**), `planLimitErrorBody` (corps **403** `{error, code:"PLAN_LIMIT_REACHED", resource, current, max, upgradeTo}`), `planLimitsForClient` (caps client, **Infinity→null**) et `hasClientPortal`. **Enforcé sur les POST** `/api/projects` (route **créée** — il n'y avait que GET ; mini-drawer "New Project" : name/contact/stage/startDate, "type"=`status` car Project n'a pas de champ type), `/api/contacts`, `/api/documents`, `/api/automations` (Free cap 0 → toujours bloqué). **Portail Free désactivé** (décision retenue plutôt qu'un 403 sur `GET /api/contacts/[id]` qui aurait cassé la fiche) : `GET /api/contacts/[id]` renvoie `portalUrl:null` + `clientPortal:false` → **encart upgrade** sur la fiche ; **`getPortalData` renvoie `null` si plan Free** → page publique `/client/[token]` = "lien invalide" (coupe aussi les liens déjà partagés). **Client** : caps exposés via **`/api/auth/me` → `AuthProvider` (`limits`)** (le client n'importe jamais `plan-limits`, server-only) ; message d'erreur lu dans le **corps du 403**. Composants partagés **`components/shared/PlanLimitDialog.tsx`** (modal upsell → "Voir les plans" `/settings/billing`, déclenchée quand un POST renvoie `code:"PLAN_LIMIT_REACHED"`) et **`UsageMeter.tsx`** (compteur "current/max … utilisés" + barre, **badge orange "Limite atteinte"** à 100%, "Illimité" pour PRO) en bas des listes Projects/Contacts/Documents/Automations. ⚠️ **Owner = PRO** → tester un parcours FREE→limite nécessite un compte non-owner. Enforcement = **création (POST)** uniquement ; PUT/édition et `customPdfLogo` non gatés.
- **Pages légales (étape 21)** : 3 pages **publiques** sous `app/legal/` (**hors groupe `(app)`** → pas d'AppShell ; `/legal/*` hors `PROTECTED_PREFIXES` → le middleware laisse passer sans session) : `cgv`, `privacy`, `mentions`. Coque commune `app/legal/layout.tsx` (logo → `/`, nav inter-pages, footer) + composants partagés `components/legal/LegalProse.tsx` (typo via **variantes descendantes Tailwind `[&_h2]:…`** → DRY, pas de plugin `@tailwindcss/typography`). **Contenu = modèles FR** adaptés au stack réel (sous-traitants Supabase/Stripe/Resend/Vercel, plans FREE/19€/39€) avec infos Kora (éditeur **Kaan Tekten**, **auto-entrepreneur/micro-entreprise**, `app.kora-app.fr`, `hello@kora-app.fr`) ; **CGV B2B + B2C** (droit de rétractation 14 j art. L221-18/L221-28). Champs `[À COMPLÉTER]` laissés volontairement (SIRET, adresse, médiateur conso, durées) → **à compléter + faire valider par un juriste**. **Bandeau cookies** `components/legal/CookieBanner.tsx` (client) monté dans `app/layout.tsx` (**racine → site-wide**) : Kora ne posant que des cookies **essentiels** (session Supabase), bandeau informatif simple « Accepter » + lien vers `/legal/privacy`, consentement mémorisé en `localStorage` (`kora-cookie-consent`). Liens du **footer de la landing** (`Légal`) câblés en `<Link>` vers les 3 pages.
- **Sécurisation complète (étape 25)** — 9 volets. **(1) RLS** `security/rls-policies.sql` (versionné, exécuté manuellement dans Supabase) : **`ENABLE` (pas FORCE)** sur les 13 tables → **Prisma (rôle `postgres`) bypasse le RLS, donc l'app n'est PAS impactée** ; le vrai gain = fermer l'accès **REST PostgREST via clé anon publique**. Helper `auth_company_ids()` (`STABLE SECURITY DEFINER`, évite la récursion) + cast **`auth.uid()::text`** (supabaseId est du text). Tables sans `companyId` (`AutomationAction`, `LineItem`) scopées via sous-requête `EXISTS`. **(2) Validation/sanitization** : `zod` (**v4** — `z.enum(x, { message })`, pas `errorMap`) `lib/validations.ts` (schéma par entité) branché dans **tous** les POST/PUT/PATCH via `schema.parse(await req.json())` → `ZodError` → **400 détaillé par champ** ; `isomorphic-dompurify` `lib/sanitize.ts` (strip tags + décode entités → texte brut lisible) sur **notes / message body+subject / description automation** (défense XSS, le rendu React/react-email ré-échappe déjà). **(3) CORS** `lib/cors.ts` (allowlist `kora-app.fr` + `app.kora-app.fr` (transition étape 30) + `localhost:3000`, reflète l'Origin) : préflight `OPTIONS` dans le **middleware**, headers sur les réponses via `withApi`. **Security headers** statiques dans `next.config.mjs` (X-Frame-Options DENY, nosniff, Referrer-Policy, HSTS, Permissions-Policy ; **pas de CSP** — risque de casse Next inline). **(4) Rate limiting** `lib/rate-limit.ts` (`@upstash/ratelimit` sliding window par IP : auth 5 / search 20 / payments 10 / général 60 par min) dans le **middleware** sur `/api/*` (webhooks hors matcher) → **429** + `Retry-After` ; **fail-open** sans env Upstash ou si Upstash down. **(5) OTP 30 min** = réglage Supabase (Auth → Email → OTP Expiration = 1800). **(6) Error handling** : `app/error.tsx` + `app/not-found.tsx` (brandés FR) ; **`lib/api-handler.ts` `withApi`** enrobe **les 33 routes** (try/catch centralisé : Zod 400, `AppError` typée, **500 générique sans stack en prod**, + CORS + log + `Sentry.captureException`). **Compat Next** : `withApi<C = unknown>` générique préserve le type de `{ params }` → le route-type checker de `next build` passe. **(7) Index DB** composites `(companyId, status|type|startAt)` + `Contact.email` (les `companyId`/FK étaient déjà indexés), via `db:push` (additif). **(8) Logger** `lib/logger.ts` (Edge+Node, ANSI en dev, **JSON 1 ligne en prod** pour Vercel Log Drains) ; logge requêtes API, 500, paiements Stripe (webhook), créations de compte (`setup-company` + `/auth/callback`). **(9) Sentry** v10 : `sentry.{server,edge,client}.config.ts` + `instrumentation.ts` (+ `experimental.instrumentationHook`), **init no-op sans `NEXT_PUBLIC_SENTRY_DSN`** ; `withSentryConfig` **n'enrobe `next.config` que si le DSN est présent** (build local intact, source maps uploadées en prod). ⚠️ **Bundle** : First Load JS ~88→~155 kB et Middleware ~83→~168 kB (Sentry + Upstash). ⚠️ **PHASE 0 user** : créer Upstash (`UPSTASH_REDIS_REST_URL`/`_TOKEN`) + Sentry (`NEXT_PUBLIC_SENTRY_DSN`/`SENTRY_AUTH_TOKEN`/`SENTRY_ORG`/`SENTRY_PROJECT`), exécuter le SQL RLS, régler l'OTP. Sans ça : rate-limit & Sentry **inactifs** (fail-open), RLS **non posé** (REST encore ouvert).
- **Recherche Topbar + liens Dashboard + Quick Action (étape 24)** : **aucune migration**, **aucune clé `.env`**. **Recherche** — `GET /api/search?q=` (`force-dynamic`, scopée company via `getAuthedCompany`) = 3 `findMany` parallèles (`take: 5`, `mode: "insensitive"`) : Contacts `firstName|lastName|email` (hors `ARCHIVED`), Projects `name`, Documents `title|number`. Composant client **`components/search/SearchCommand.tsx`** (remplace l'input décoratif du Topbar) : déclencheur stylé + badge ⌘K, **raccourci ⌘/Ctrl+K** (toggle) et **Échap** via listener `keydown` global, modal centrée (`fixed z-[60]`, backdrop `bg-black/30`, carte `rounded-2xl`), **debounce 300 ms**, résultats groupés Contacts/Projets/Documents (icône Lucide à gauche, hover `#f5f3f0`), « No results found », clic → `router.push`. **Navigation** : contact → `/contacts/[id]`, **projet → `/projects`** (pas de page détail), document → `/documents`. **Liens Dashboard** : `<button>` décoratifs → `<Link>` (View All → `/projects`, View Full Calendar → `/scheduler` ; `TASK_VISUALS` gagne un `href` : Review Now → `/projects`, Send Now → `/documents`, Open Inbox → `/inbox`). **Quick Action** : `Sidebar.tsx` — sous-composant `QuickAction` (menu popup `absolute bottom-full`, clic-dehors + Échap, **icônes Lucide** `FolderPlus/UserPlus/FileText/CalendarPlus` au lieu des emojis du brief — convention design system) ; 4 `<Link>` vers `/<page>?new=1`. **Mécanique d'ouverture cross-page** : hook **`lib/hooks/useNewDrawerParam.ts`** (lit `?new=1` via `useSearchParams`, appelle `onOpen()`, nettoie l'URL avec `router.replace` ; réactif → marche même déjà sur la page) branché dans projects/contacts/documents (`setDrawerOpen(true)`) et scheduler (`openCreate(null)`, fonction hoistée). **⚠️ Contrainte Next** : `useSearchParams` fait basculer la page en CSR → besoin d'une frontière `<Suspense>` au build → **1 seul `<Suspense fallback={null}>` ajouté dans `AppShell.tsx`** autour de `{children}` (couvre toutes les pages `(app)`, zéro restructuration). Les pages restent `○ (Static)` au build.
- **Forgot password (étape 23)** : **aucune migration**, **aucune clé `.env`**, **aucune nouvelle Redirect URL Supabase**. Deux pages client (réutilisent la coque `AuthHero` 2 colonnes vert + `inputBase` + checklist mdp de `/register`) : **`/forgot-password`** (`app/(auth)/forgot-password/page.tsx`) appelle `supabase.auth.resetPasswordForEmail(email, { redirectTo: ${origin}/auth/callback?next=/auth/reset-password })` puis affiche un écran de confirmation **neutre** (anti-énumération d'emails — message identique que le compte existe ou non, car `resetPasswordForEmail` ne renvoie pas d'erreur sur email inconnu). **`/auth/reset-password`** (`app/auth/reset-password/page.tsx`) : au montage, `getSession()` → si **pas de session** (lien expiré / accès direct) écran « Link expired » + bouton vers `/forgot-password` ; sinon formulaire « new password » (même checklist 8 car/maj/chiffre) → `supabase.auth.updateUser({ password })` → `router.push("/dashboard")` (la session de récupération **est** une vraie session → entrée directe dans l'app). **Astuce clé** : le lien email est routé **via `/auth/callback`** (déjà public — exclu du `matcher` middleware — et déjà dans les Redirect URLs Supabase pour Google OAuth) qui fait l'`exchangeCodeForSession` (PKCE) **avant** de rediriger sur `/auth/reset-password` via `?next=` → **rien à ajouter dans Supabase**. Le passage par `/auth/callback` réveille son onboarding (`getUser` + création Company/User) mais c'est **idempotent** : pour un reset, le `User` existe déjà → no-op. Bouton « Forgot password? » de `/login` = `<button>` décoratif → **`<Link href="/forgot-password">`** (`Link` déjà importé). Middleware : `/forgot-password` et `/auth/reset-password` ne sont ni dans `PROTECTED_PREFIXES` ni dans `AUTH_PAGES` → **publics** (et `reset-password` NE doit PAS être un `AUTH_PAGE`, sinon la session de récupération déclencherait la redirection connecté→`/dashboard` et casserait le reset).
- **Google OAuth (étape 22)** : **aucune migration**, **aucune clé `.env`** (le Client ID/Secret Google vivent dans Supabase, pas dans l'app). Config = Google Cloud (OAuth consent + credentials Web ; **Authorized redirect URI = `https://<ref>.supabase.co/auth/v1/callback`**) + Supabase (provider Google activé, Site URL + Redirect URLs `…/auth/callback`). Côté code : boutons « Continue with Google » (mêmes `GoogleIcon` + `handleGoogle` → `supabase.auth.signInWithOAuth({ provider:'google', options:{ redirectTo: ${origin}/auth/callback } })`) sur `/login` (déjà présent) et **`/register` (ajouté, en haut du formulaire + séparateur « or continue with email »)**. **`/auth/callback/route.ts`** (déjà public — exclu du `matcher` du middleware) : `exchangeCodeForSession(code)` **puis onboarding** — `getUser()`, si aucun `User` pour ce `supabaseId` (et email pas déjà pris, `User.email` @unique) → crée **Company + User** en transaction (même logique que `setup-company`, `plan FREE`, `ownerId` posé après), **nom de studio dérivé** de `user_metadata.full_name`/`name` (`"<nom>'s Studio"`) sinon préfixe email. Onboarding **best-effort** (try/catch → ne bloque jamais la connexion, la session est déjà établie). ⚠️ Suppose le **linking d'identités Supabase** (même email vérifié → même `supabaseId`) pour le cas « déjà inscrit en email/password ».
- **Landing page (étape 19)** : `app/page.tsx` (avant = `redirect("/dashboard")` sec) devient un **server component** qui lit la session (`createClient().auth.getUser()`) → **connecté = `redirect("/dashboard")`** (comportement préservé), **non connecté = `<LandingPage />`**. La page est **hors du groupe `(app)`** → aucun `AppShell` (ni sidebar ni topbar), et `/` n'est ni dans `PROTECTED_PREFIXES` ni dans `AUTH_PAGES` du middleware → accessible sans session (le redirect connecté se fait donc **dans la page**, pas dans le middleware). Source = bundle auto-extractible `kora/KoraLanding.html` (design « Serene Workspace ») : le vrai markup vivait dans un `<script type="__bundler/template">` (JSON) + 5 PNG en base64 dans le manifest → **extraits dans `public/landing/`** (logo, hero-dashboard, revenue-chart, upcoming, scheduler). `components/landing/LandingPage.tsx` (`"use client"`) reproduit le markup + **toggle tarifs Mensuel/Annuel** (`useState`, prix **alignés sur les plans réels** : FREE 0€ / STARTER 19€ (15€ annuel) / PRO 39€ (31€ annuel) ; « Facturé X€ par an » sur les payants ; badge « Le plus populaire » sur Starter ; plan « Studio » du mock supprimé) + **reveal au scroll** (`IntersectionObserver` + fallback 400 ms, scoping via `ref`). **CSS = `components/landing/landing.css` entièrement scopé sous `.kora-landing`** car en Next un `import "*.css"` est **global** → sans scope, le reset `* { margin:0 }` et les classes génériques (`.container` qui collisionne avec Tailwind, `.section`, `.btn`…) fuiteraient sur tout le SaaS. `@font-face` embarqué **supprimé** → `--font-display`/`--font-ui` mappés sur `var(--font-manrope)`/`var(--font-inter)` (déjà chargées par `app/layout.tsx`). **Câblage liens** (seule modif de contenu, design inchangé) : **« Demander une démo » supprimé partout → « Commencer gratuitement » → `/register`** + ajout **« Connexion » → `/login`** dans la nav ; ancres internes (#fonctionnalites/#tarifs/#faq…) conservées ; liens footer/légal en `#` (pas encore de pages). Images en `<img src="/landing/*.png">` (eslint `no-img-element` désactivé en tête de fichier).
- **Resend (étape 14)** : `lib/email.ts` `sendEmail()` **best-effort** (no-op si pas de `RESEND_API_KEY` → mode démo inchangé ; ne lève jamais → n'échoue pas une requête). **Domaine vérifié `kora-app.fr`** (`RESEND_FROM=Kora <hello@kora-app.fr>`) → envoi aux **vrais destinataires** ; la **redirection sandbox `RESEND_TEST_EMAIL` a été retirée du code** (`sendEmail` envoie directement à `args.to`). Resend rend les templates via l'option **`react:`** → routes gardées en `.ts` en passant `createElement(Template, props)` (pas de JSX). Templates react-email `InvoiceEmail`/`PaymentReceiptEmail` (`@react-email/components`, pas de "use client"). Câblage : email facture dans **`create-intent`** (appelé seulement par "Send payment link", PAS par la page `/pay` → zéro spam), reçu dans le **webhook** (URL absolue via `new URL(request.url).origin`), Inbox via `sendEmail`. **Fallback** : si `RESEND_FROM` absent, `from` = `onboarding@resend.dev` (n'envoie qu'à l'email du compte) — ne devrait plus arriver en prod.

### Onboarding wizard (étape 28)
- **Trigger après inscription, pas en middleware** : la locale/Company se résout côté Prisma (Node), or le middleware tourne en **Edge** → pas de check DB possible là. On déclenche donc l'onboarding (a) par **redirection** depuis `/register` et `/auth/callback` (uniquement quand un nouveau compte est créé), et (b) par un **gate client** `OnboardingGate` monté dans `(app)/layout` (lit `useAuth`, redirige si `company.onboardedAt === null`). Le middleware ne fait qu'ajouter `/onboarding` à `PROTECTED_PREFIXES` (exige une session).
- **Page hors `(app)`** (`app/onboarding/`) pour éviter l'AppShell (sidebar/topbar) — expérience focalisée. Son `layout` enrobe quand même `AuthProvider` pour réutiliser `useAuth` (user, `company.onboardedAt`, préremplissage du nom). Pas de boucle : le gate vit dans `(app)`, `/onboarding` est hors `(app)`.
- **Soumission groupée à la dernière étape** (pas de save-as-you-go) → si l'utilisateur ferme l'onglet en plein wizard, **rien n'est créé** et `onboardedAt` reste null → le gate le ramène proprement au début (pas de contacts/projets en double). Ordre : PUT studio (nom requis, prérempli) → POST contact (si first+last+email) → POST project (`contactId` du contact créé si « lier ») → POST `complete`. Étapes 2 et 3 **facultatives** (détectées par champs non vides).
- **`Company.onboardedAt DateTime?`** (additif) + backfill **`db:mark-onboarded`** (idempotent) : sans le backfill, les comptes pré-existants (`onboardedAt: null`) seraient renvoyés au wizard par le gate. Les comptes créés *après* la migration (register/OAuth) naissent à null → wizard.
- **`/auth/callback`** : on ne redirige vers `/onboarding` que si `createdNewAccount` (1er login Google) ; sinon on garde `next` → **ne casse pas** le flux reset-password (`?next=/auth/reset-password`).
- **Gating** : caps FREE (5 contacts / 3 projets) → créer 1 de chaque en onboarding passe sans 403. Le studio est mis à jour via la route `/api/settings/studio` existante (réutilisée telle quelle).

### Page détail projet (étape 27)
- **Migration additive** : `Project.description` + `Project.notes` (nullable) — Budget réutilise `totalAmount` existant (pas de nouveau champ ; reste la base de la barre paid/total). Statuts = enum réel `ProjectStatus` (le brief disait « Lead/Completed » → on garde INQUIRY/FOLLOW_UP/BOOKING/ACTIVE/ARCHIVED + les libellés i18n `status.project.*`).
- **PATCH `/api/projects/[id]` rendu partiel** (avant : status seul) via `projectUpdateSchema` (tout optionnel) → `data` construit champ par champ, typé **`Prisma.ProjectUncheckedUpdateManyInput`** (le FK scalaire `contactId` n'existe pas dans la variante *checked* d'`updateMany`). `sanitizeNullable` sur description/notes, contact validé anti cross-tenant, `totalAmount` coercé en Float, dates `""`→null. **Reste 100 % compatible** avec le drag Kanban (`{status}` seul).
- **Tâches** : route dédiée `/api/projects/[id]/tasks` (collection) — PATCH/DELETE prennent `taskId` (body / `?taskId=`) plutôt qu'une sous-route `[taskId]`, conformément au brief ; tout scopé `{ projectId, companyId }`.
- **Page** : nom **éditable inline** (clic → input, Enter/blur → PATCH) ; statut = `<select>` transparent superposé au `StatusBadge` ; **notes autosave** = `useEffect` sur `notes` avec `setTimeout` 1 s + garde `loadedNotes` (ref) pour ne pas sauver à l'hydratation ni si inchangé.
- **Navigation Kanban** : la carte est draggable (dnd-kit, activation distance 6 px) **et** cliquable → on enregistre la position au `onPointerDown` (en rappelant `listeners.onPointerDown`) et on ne navigue au `onClick` que si le déplacement est < 6 px (sinon c'était un drag).

### Internationalisation (étape 26)
- **`next-intl` sans routing par URL** (choix : pas de `/[locale]/…`, pas de réécriture middleware) → la locale vient du **cookie `kora-locale`** lu côté serveur dans `i18n/request.ts` (`getRequestConfig`, défaut `fr`, charge `messages/<locale>.json`). Provider `NextIntlClientProvider` monté à la racine (`app/layout.tsx`). **Aucune augmentation de type** `next-intl` configurée → le `t()` accepte des **clés dynamiques** (`t(\`triggers.${type}\`)`, `t(\`status.${s}\`)`), utilisées pour mapper enums (statuts paiement/contact, triggers/actions d'automation, jours de semaine).
- **Persistance** : `LanguageSelect` (Settings → Général) écrit le **cookie** (source SSR) + **localStorage** (miroir) + `PUT /api/settings/language` (`Company.language`, best-effort) puis `router.refresh()` (re-render serveur, pas de reload).
- **Dictionnaires** : `messages/fr.json` (défaut) + `messages/en.json`, **mêmes clés**, namespacés par zone (`common`, `status`, `contacts`, `projects`, `documents`, `inbox`, `scheduler`, `finance`, `automations`, `nav`, `topbar`, `auth`, `dashboard`, `settings`, `usage`, `planLimit`, `errors`). Pluriels/variables en **ICU** (`{count, plural, …}`, `{from}-{to}`).
- **Convention dates/nombres** : **non internationalisés** (helpers `lib/scheduler.ts`, `fmtDate`, `money` gardent `toLocaleDateString("en"/"en-US")` + préfixe `$`) — cohérent avec les pages traduites lors des phases précédentes ; à reprendre si un vrai support `fr` des dates est voulu.
- **Helpers temps relatif localisés** : la page Automations réimplémente `lastTriggered`/`delay` **inline** avec `t()` (les versions anglaises `lastTriggeredLabel`/`delayLabel` de `lib/automations.ts` ne sont plus importées).
- **⚠️ Hors périmètre (FR only)** : Settings **studio/branding/billing**, pages **légales**, **landing**, bandeau **cookies**, et les **messages d'erreur serveur** (corps des 400 Zod / 403 `PLAN_LIMIT_REACHED` via `limitMessage`) — seul le **chrome** de `PlanLimitDialog` est traduit, pas le `message` renvoyé par l'API.

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
2. **✅ Google OAuth — FAIT (étape 22).** Provider activé dans Supabase + **onboarding OAuth** (`/auth/callback` crée Company+User au 1er login).
3. **Abonnements SaaS Stripe** — rendre la page **Billing** réelle (Stripe Checkout / Customer Portal) + afficher les payment links dans **Finance**. *(Le paiement CLIENT est déjà fait ; là c'est l'abonnement du studio à Kora.)*
4. **Relances automatiques** — brancher les **Automations** sur **Resend** (envois différés via `delayHours`) + un déclencheur (cron / queue).
5. **Câblage transversal restant** — "New Project" (création), édition projet, recherche Topbar, Quick Action, filtres/tri Finance. *(« Forgot password? » FAIT — étape 23.)*
6. **✅ Onboarding nouveaux comptes — FAIT (étape 28).** Wizard `/onboarding` (studio + premier client + premier projet) après `/register` & 1er login Google ; `Company.onboardedAt` + `OnboardingGate`.

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
npm run db:mark-onboarded # backfill NON destructif : marque les companies onboardées (à lancer 1× après l'ajout de Company.onboardedAt)
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
- ✅ + **Resend (domaine vérifié `kora-app.fr`)** : `RESEND_API_KEY` (`re_`), `RESEND_FROM=Kora <hello@kora-app.fr>`. `RESEND_TEST_EMAIL` **supprimé** (plus de redirection sandbox → emails aux vrais destinataires).
- ⛔ Plus aucune clé vide. *(Domaine Resend vérifié + `RESEND_FROM` du domaine + `RESEND_TEST_EMAIL` supprimé — fait.)*
- 🔌 **Stripe en local** : lancer `stripe listen --forward-to localhost:3000/api/webhooks/stripe` (terminal séparé) — c'est lui qui relaie les events → sans ça, le Document ne passe pas PAID. Carte test `4242 4242 4242 4242` **uniquement en mode test (local)** ; ⚠️ **en prod = LIVE**, vraies CB seulement.
- 🗂️ **Supabase Storage** : bucket public **`logos`** (créé via `npm run ensure:bucket`, ou à la volée par `/api/settings/logo`) — utilisé par l'upload de logo (Branding).
- 🔑 **`CLIENT_PORTAL_SECRET`** (étape 15, **optionnel**) : secret HMAC des liens du portail client. Non défini → repli sur `SUPABASE_SERVICE_ROLE_KEY` (fonctionne tel quel en dev). **En prod : poser une valeur dédiée** — sinon roter la service_role key casserait tous les liens portail déjà partagés.
- ⏰ **`CRON_SECRET`** (étape 31, **prod Vercel**) : protège `GET /api/cron/automations`. Quand l'env est défini, Vercel ajoute automatiquement `Authorization: Bearer ${CRON_SECRET}` aux appels cron, et la route exige ce header (401 sinon). Non défini → route non protégée (warn loggé). **À poser dans les env Vercel.**
- 🛡️ **Sécurité (étape 25) — ✅ TOUT RENSEIGNÉ (local + Vercel)** :
  - ✅ **Upstash (rate limiting)** : `UPSTASH_REDIS_REST_URL`, `UPSTASH_REDIS_REST_TOKEN`.
  - ✅ **Sentry (monitoring)** : `NEXT_PUBLIC_SENTRY_DSN`, `SENTRY_AUTH_TOKEN`, `SENTRY_ORG`, `SENTRY_PROJECT`.
  - ✅ **RLS** : `security/rls-policies.sql` exécuté dans Supabase.
  - ✅ **OTP reset 30 min** : `Email OTP Expiration` = `1800`.
  - **Alertes Sentry** : 3 alertes (erreurs > 5 / 5 min · `kind:stripe_webhook` · pic `kind:rate_limit`) — les événements tagués sont émis par le code (`lib/rate-limit.ts`, `app/api/webhooks/stripe/route.ts`).

### Compte admin (production) — depuis l'étape 16
- **Email** : `kaantekten958@gmail.com` — mot de passe défini à la création (`db:create-admin`, non stocké ici).
- Owner de la company **"Kora Studio"** (plan PRO), **base vide** (aucune donnée de démo).

### ⚠️ Compte de test `test@kora.fr` — SUPPRIMÉ (étape 16)
- Le reset prod (`db:reset-prod`) a supprimé `test@kora.fr` / `Test1234!` **et** toutes les données seed. **N'existe plus** (base partagée dev=prod). Conservé ici pour mémoire des scripts/seed historiques.

### Données seed (Boutique Studio) — HISTORIQUE (supprimées par le reset)
1 company · 4 contacts (Elena CLIENT/VIP · Marcus CLIENT · Sophie PROSPECT · James LEAD ; enrichis phone/company/address/notes) · 3 projects (tous ACTIVE) · 4 documents · 3 payments (2 PAID = 4250+1200, 1 PENDING = 3200) · 3 appointments · 3 tasks (2 HIGH) · 3 session types (Discovery Call/Strategy Session/Project Review) · 6 messages de démo (Elena ×3 out, Marcus ×2 in non lus, Sophie ×1 out — via `db:seed-messages`) · 3 automations (Welcome New Lead, Contract Follow-up, Overdue Invoice Alert — via `db:seed-automations`) · 3 line items sur FAC-2025-001 (via `db:seed-line-items`, total → 2940 € TTC).

### Conventions (rappel `CLAUDE.md`)
TypeScript strict (jamais `any`) · icônes Lucide uniquement · Tailwind uniquement · spacing multiples de 8px · radius cards 16px / boutons 8px / badges pill · ombres tonales · hover cards `translateY(-2px)` · **toutes les requêtes DB filtrées par `companyId`**.
