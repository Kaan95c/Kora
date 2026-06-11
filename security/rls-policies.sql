-- ════════════════════════════════════════════════════════════════════════
-- KORA — Row Level Security (étape 25)
-- À exécuter dans Supabase → SQL Editor (une seule fois).
--
-- Pourquoi : l'app accède aux données via Prisma (rôle `postgres`, qui BYPASSE
-- le RLS) → activer le RLS NE CASSE RIEN côté app. Mais il ferme un vrai trou :
-- l'API REST PostgREST de Supabase, accessible avec la clé `anon` PUBLIQUE,
-- peut aujourd'hui lire toutes les tables. Le RLS bloque cet accès.
--
-- On utilise ENABLE (pas FORCE) : le rôle `postgres`/`service_role` continue
-- de bypasser → Prisma, webhooks et scripts admin ne sont pas impactés.
-- ════════════════════════════════════════════════════════════════════════

-- ── Helper : company-ids du user courant ────────────────────────────────
-- SECURITY DEFINER → s'exécute en tant que owner et bypasse le RLS des tables
-- Company/User qu'elle lit (évite la récursion infinie des policies).
-- auth.uid() renvoie un uuid → cast en text (User.supabaseId est du text).
create or replace function public.auth_company_ids()
returns setof text
language sql
stable
security definer
set search_path = public
as $$
  -- companies dont le user est propriétaire
  select c.id
  from "Company" c
  join "User" u on u.id = c."ownerId"
  where u."supabaseId" = auth.uid()::text
  union
  -- companies dont le user est membre (robustesse / futur multi-user)
  select u."companyId"
  from "User" u
  where u."supabaseId" = auth.uid()::text;
$$;

grant execute on function public.auth_company_ids() to authenticated, anon;

-- ── Tables scopées directement par companyId ────────────────────────────
do $$
declare
  t text;
begin
  foreach t in array array[
    'Contact','Project','Document','Payment',
    'Appointment','SessionType','Message','Automation','Task'
  ]
  loop
    execute format('alter table %I enable row level security;', t);
    execute format('drop policy if exists "company_isolation" on %I;', t);
    execute format(
      'create policy "company_isolation" on %I for all
         using ("companyId" in (select public.auth_company_ids()))
         with check ("companyId" in (select public.auth_company_ids()));', t);
  end loop;
end$$;

-- ── Company : la ligne EST la company (scope par id) ─────────────────────
alter table "Company" enable row level security;
drop policy if exists "company_isolation" on "Company";
create policy "company_isolation" on "Company" for all
  using ("id" in (select public.auth_company_ids()))
  with check ("id" in (select public.auth_company_ids()));

-- ── User : voir les users de sa company + sa propre ligne ────────────────
alter table "User" enable row level security;
drop policy if exists "company_isolation" on "User";
create policy "company_isolation" on "User" for all
  using (
    "companyId" in (select public.auth_company_ids())
    or "supabaseId" = auth.uid()::text
  )
  with check (
    "companyId" in (select public.auth_company_ids())
    or "supabaseId" = auth.uid()::text
  );

-- ── AutomationAction : scope via Automation.companyId ────────────────────
alter table "AutomationAction" enable row level security;
drop policy if exists "company_isolation" on "AutomationAction";
create policy "company_isolation" on "AutomationAction" for all
  using (exists (
    select 1 from "Automation" a
    where a.id = "automationId"
      and a."companyId" in (select public.auth_company_ids())
  ))
  with check (exists (
    select 1 from "Automation" a
    where a.id = "automationId"
      and a."companyId" in (select public.auth_company_ids())
  ));

-- ── LineItem : scope via Document.companyId ──────────────────────────────
alter table "LineItem" enable row level security;
drop policy if exists "company_isolation" on "LineItem";
create policy "company_isolation" on "LineItem" for all
  using (exists (
    select 1 from "Document" d
    where d.id = "documentId"
      and d."companyId" in (select public.auth_company_ids())
  ))
  with check (exists (
    select 1 from "Document" d
    where d.id = "documentId"
      and d."companyId" in (select public.auth_company_ids())
  ));

-- ════════════════════════════════════════════════════════════════════════
-- VÉRIFICATION
-- 1) Dans CE SQL Editor (rôle postgres → bypass RLS) : tu vois toujours tout.
--      select count(*) from "Contact";
-- 2) Le vrai test = via l'API REST avec la clé ANON (doit renvoyer []) :
--      curl "https://<REF>.supabase.co/rest/v1/Contact?select=*" \
--        -H "apikey: <ANON_KEY>" -H "Authorization: Bearer <ANON_KEY>"
--    Avant ce script : renvoie des lignes. Après : renvoie [] (RLS actif).
-- ════════════════════════════════════════════════════════════════════════
