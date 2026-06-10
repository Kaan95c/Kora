import type { Plan } from "@prisma/client";

import { prisma } from "@/lib/prisma";
import { PLAN_LIMITS } from "@/lib/billing-server";

/**
 * Enforcement des limites par plan.
 *
 * Les caps sont la propriété de `lib/billing-server.ts` (`PLAN_LIMITS`, source
 * unique). Ce module : compte l'usage courant via Prisma, décide si une création
 * est autorisée, et produit le message FR montré à l'utilisateur.
 *
 * Server-only (importe Prisma). Le client n'importe PAS ce fichier : il reçoit
 * les caps via `/api/auth/me` (`planLimitsForClient`) et le message via le corps
 * du 403.
 */

export type LimitedResource =
  | "projects"
  | "contacts"
  | "documents"
  | "automations";

const RESOURCE_PLURAL: Record<LimitedResource, string> = {
  projects: "projets",
  contacts: "contacts",
  documents: "documents",
  automations: "automatisations",
};

const PLAN_LABEL: Record<Plan, string> = {
  FREE: "Free",
  STARTER: "Starter",
  PRO: "Pro",
};

/** Plan immédiatement supérieur (pour l'upsell). PRO = aucun. */
export function nextPlan(plan: Plan): Plan | null {
  if (plan === "FREE") return "STARTER";
  if (plan === "STARTER") return "PRO";
  return null;
}

export function planLabel(plan: Plan): string {
  return PLAN_LABEL[plan] ?? plan;
}

/** Cap numérique d'une ressource pour un plan (Infinity = illimité). */
export function getLimit(plan: Plan, resource: LimitedResource): number {
  const caps = PLAN_LIMITS[plan] ?? PLAN_LIMITS.FREE;
  return caps[resource];
}

export function hasClientPortal(plan: Plan): boolean {
  return (PLAN_LIMITS[plan] ?? PLAN_LIMITS.FREE).clientPortal;
}

export type ClientPlanLimits = {
  projects: number | null;
  contacts: number | null;
  documents: number | null;
  automations: number | null;
  clientPortal: boolean;
};

/** Caps exposables au client (Infinity → null = illimité). */
export function planLimitsForClient(plan: Plan): ClientPlanLimits {
  const cap = (n: number) => (Number.isFinite(n) ? n : null);
  return {
    projects: cap(getLimit(plan, "projects")),
    contacts: cap(getLimit(plan, "contacts")),
    documents: cap(getLimit(plan, "documents")),
    automations: cap(getLimit(plan, "automations")),
    clientPortal: hasClientPortal(plan),
  };
}

/** Usage courant d'une ressource (contacts : hors ARCHIVED). */
function countResource(
  companyId: string,
  resource: LimitedResource
): Promise<number> {
  if (resource === "projects") {
    return prisma.project.count({ where: { companyId } });
  }
  if (resource === "contacts") {
    return prisma.contact.count({
      where: { companyId, status: { not: "ARCHIVED" } },
    });
  }
  if (resource === "documents") {
    return prisma.document.count({ where: { companyId } });
  }
  return prisma.automation.count({ where: { companyId } });
}

export type LimitCheck = { allowed: boolean; current: number; max: number };

/**
 * La company peut-elle créer une ressource de plus selon son plan ?
 * max = Infinity (PRO) → toujours autorisé, sans requête de comptage.
 */
export async function checkLimit(
  companyId: string,
  resource: LimitedResource,
  plan: Plan
): Promise<LimitCheck> {
  const max = getLimit(plan, resource);
  if (!Number.isFinite(max)) {
    return { allowed: true, current: 0, max };
  }
  const current = await countResource(companyId, resource);
  return { allowed: current < max, current, max };
}

/** Message FR affiché quand la limite est atteinte. */
export function limitMessage(
  resource: LimitedResource,
  plan: Plan,
  max: number
): string {
  const next = nextPlan(plan);
  const nextLabel = next ? planLabel(next) : "supérieur";
  // Cap 0 (automatisations en Free) → message dédié.
  if (max === 0 && resource === "automations") {
    return `Les automatisations ne sont pas incluses dans le plan ${planLabel(
      plan
    )}. Passez au plan ${nextLabel} pour les activer.`;
  }
  return `Vous avez atteint la limite de ${max} ${RESOURCE_PLURAL[resource]} sur le plan ${planLabel(
    plan
  )}. Passez au plan ${nextLabel} pour continuer.`;
}

/** Corps JSON standard d'une réponse 403 « limite atteinte ». */
export function planLimitErrorBody(
  resource: LimitedResource,
  plan: Plan,
  check: LimitCheck
) {
  return {
    error: limitMessage(resource, plan, check.max),
    code: "PLAN_LIMIT_REACHED" as const,
    resource,
    current: check.current,
    max: Number.isFinite(check.max) ? check.max : null,
    plan,
    upgradeTo: nextPlan(plan),
  };
}
