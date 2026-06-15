import type { ActionType, AutomationTrigger, Prisma } from "@prisma/client";

import { prisma } from "@/lib/prisma";
import { sendEmail } from "@/lib/email";
import { logger } from "@/lib/logger";

/**
 * Moteur d'exécution des automatisations (étape 31).
 *
 * `triggerAutomations` est appelé depuis les routes (création de contact,
 * document, RDV, changement de statut projet, webhook Stripe) et depuis le cron
 * (paiement en retard). Il est **best-effort** : il ne lève JAMAIS — une
 * automatisation qui échoue ne doit jamais casser la requête déclenchante.
 *
 * Le `context` ne contient que des **IDs sérialisables** : les exécuteurs
 * résolvent la donnée fraîche depuis la DB (scoping `companyId`) au moment de
 * l'exécution. C'est important pour les actions différées, stockées en JSON
 * dans `AutomationQueue` puis rejouées par le cron.
 */

export type AutomationContext = {
  contactId?: string | null;
  projectId?: string | null;
  documentId?: string | null;
  appointmentId?: string | null;
};

const PROJECT_STATUSES = [
  "INQUIRY",
  "FOLLOW_UP",
  "BOOKING",
  "ACTIVE",
  "ARCHIVED",
] as const;

// ───────────────────────── Helpers config ─────────────────────────

/** Lit une chaîne non vide dans le JSON `config` d'une action (sinon undefined). */
function cfgStr(config: unknown, key: string): string | undefined {
  if (config && typeof config === "object" && !Array.isArray(config)) {
    const v = (config as Record<string, unknown>)[key];
    if (typeof v === "string" && v.trim()) return v.trim();
  }
  return undefined;
}

// ───────────────────────── Variables dynamiques ─────────────────────────

/**
 * Résout les variables disponibles pour les templates, depuis le contexte
 * (IDs) → données fraîches en DB. Variables : `contact_name`, `studio_name`,
 * `project_name`, `appointment_date`. Absentes selon le trigger → non définies
 * (rendues en chaîne vide par `renderTemplate`).
 */
async function resolveVars(
  companyId: string,
  context: AutomationContext
): Promise<Record<string, string>> {
  const vars: Record<string, string> = {};

  const company = await prisma.company.findUnique({
    where: { id: companyId },
    select: { name: true },
  });
  if (company?.name) vars.studio_name = company.name;

  if (context.contactId) {
    const c = await prisma.contact.findFirst({
      where: { id: context.contactId, companyId },
      select: { firstName: true, lastName: true },
    });
    if (c) vars.contact_name = `${c.firstName} ${c.lastName}`.trim();
  }
  if (context.projectId) {
    const p = await prisma.project.findFirst({
      where: { id: context.projectId, companyId },
      select: { name: true },
    });
    if (p) vars.project_name = p.name;
  }
  if (context.appointmentId) {
    const ap = await prisma.appointment.findFirst({
      where: { id: context.appointmentId, companyId },
      select: { startAt: true },
    });
    if (ap) {
      vars.appointment_date = new Date(ap.startAt).toLocaleString("fr-FR", {
        dateStyle: "long",
        timeStyle: "short",
      });
    }
  }
  return vars;
}

/** Remplace `{{ clé }}` (espaces tolérés) ; variable absente → chaîne vide. */
function renderTemplate(text: string, vars: Record<string, string>): string {
  return text.replace(/\{\{\s*(\w+)\s*\}\}/g, (_, key) => vars[key] ?? "");
}

// ───────────────────────── Déclenchement ─────────────────────────

export async function triggerAutomations(
  companyId: string,
  trigger: AutomationTrigger,
  context: AutomationContext
): Promise<void> {
  try {
    const automations = await prisma.automation.findMany({
      where: { companyId, trigger, isActive: true },
      select: {
        id: true,
        actions: {
          orderBy: { order: "asc" },
          select: { id: true, type: true, delayHours: true, config: true },
        },
      },
    });
    if (automations.length === 0) return;

    for (const automation of automations) {
      // Stat de déclenchement (best-effort).
      await prisma.automation
        .update({
          where: { id: automation.id },
          data: { triggerCount: { increment: 1 }, lastTriggeredAt: new Date() },
        })
        .catch(() => {});

      for (const action of automation.actions) {
        if (action.delayHours > 0) {
          await enqueueAction(companyId, automation.id, action, context);
        } else {
          await runAction(companyId, action.type, action.config, context);
        }
      }
    }
  } catch (err) {
    logger.error("automation_trigger_failed", {
      companyId,
      trigger,
      error: err instanceof Error ? err.message : String(err),
    });
  }
}

/** Met une action différée (delayHours > 0) en file, traitée plus tard par le cron. */
async function enqueueAction(
  companyId: string,
  automationId: string,
  action: { type: ActionType; delayHours: number; config: unknown },
  context: AutomationContext
): Promise<void> {
  try {
    const runAt = new Date(Date.now() + action.delayHours * 3_600_000);
    await prisma.automationQueue.create({
      data: {
        companyId,
        automationId,
        type: action.type,
        config: (action.config ?? {}) as Prisma.InputJsonValue,
        context: (context ?? {}) as Prisma.InputJsonValue,
        runAt,
      },
    });
  } catch (err) {
    logger.error("automation_enqueue_failed", {
      companyId,
      type: action.type,
      error: err instanceof Error ? err.message : String(err),
    });
  }
}

// ───────────────────────── Exécution d'une action ─────────────────────────

/**
 * Exécute une action unique. Exporté pour être réutilisé par le cron (file
 * différée). Best-effort : capture ses propres erreurs.
 */
export async function runAction(
  companyId: string,
  type: ActionType,
  config: unknown,
  context: AutomationContext
): Promise<void> {
  try {
    switch (type) {
      case "SEND_EMAIL":
        return await actSendEmail(companyId, config, context, false);
      case "SEND_REMINDER":
        return await actSendEmail(companyId, config, context, true);
      case "CREATE_TASK":
        return await actCreateTask(companyId, config, context);
      case "CHANGE_PROJECT_STATUS":
        return await actChangeProjectStatus(companyId, config, context);
      case "ADD_TAG":
        return await actAddTag(companyId, config, context);
      case "SEND_DOCUMENT":
        // Hors périmètre étape 31 (pas d'envoi de document générique) → no-op tracé.
        logger.info("automation_send_document_noop", { companyId });
        return;
      default:
        return;
    }
  } catch (err) {
    logger.error("automation_action_failed", {
      companyId,
      type,
      error: err instanceof Error ? err.message : String(err),
    });
  }
}

// ───────────────────────── Exécuteurs ─────────────────────────

async function actSendEmail(
  companyId: string,
  config: unknown,
  context: AutomationContext,
  reminder: boolean
): Promise<void> {
  if (!context.contactId) return;
  const contact = await prisma.contact.findFirst({
    where: { id: context.contactId, companyId },
    select: { email: true, firstName: true },
  });
  if (!contact?.email) return;

  const vars = await resolveVars(companyId, context);
  const studio = vars.studio_name || "Kora";
  const name = vars.contact_name || contact.firstName || "";

  // Config personnalisée → substitution des variables ; sinon défaut générique.
  const rawSubject = cfgStr(config, "subject");
  const rawBody = cfgStr(config, "body");
  const subject = rawSubject
    ? renderTemplate(rawSubject, vars)
    : reminder
      ? `Petit rappel de ${studio}`
      : `Un message de ${studio}`;
  const body = rawBody
    ? renderTemplate(rawBody, vars)
    : `Bonjour ${name},\n\n${
        reminder
          ? "Ceci est un rappel automatique."
          : "Merci, nous revenons vers vous très vite."
      }\n\n— ${studio}`;

  await sendEmail({ to: contact.email, subject, text: body });
}

async function actCreateTask(
  companyId: string,
  config: unknown,
  context: AutomationContext
): Promise<void> {
  const raw = cfgStr(config, "title") ?? "Tâche automatique";
  // Substitue les variables si le titre en contient.
  const title = /\{\{/.test(raw)
    ? renderTemplate(raw, await resolveVars(companyId, context)).slice(0, 200) ||
      "Tâche automatique"
    : raw;
  await prisma.task.create({
    data: { companyId, title, projectId: context.projectId ?? null },
  });
}

async function actChangeProjectStatus(
  companyId: string,
  config: unknown,
  context: AutomationContext
): Promise<void> {
  if (!context.projectId) return;
  const status = cfgStr(config, "status") ?? cfgStr(config, "toStatus");
  if (!status || !PROJECT_STATUSES.includes(status as (typeof PROJECT_STATUSES)[number])) {
    return;
  }
  // Écriture directe (pas via l'API) → ne re-déclenche pas PROJECT_STATUS_CHANGED.
  await prisma.project.updateMany({
    where: { id: context.projectId, companyId },
    data: { status: status as (typeof PROJECT_STATUSES)[number] },
  });
}

async function actAddTag(
  companyId: string,
  config: unknown,
  context: AutomationContext
): Promise<void> {
  if (!context.contactId) return;
  const tag = cfgStr(config, "tag");
  if (!tag) return;
  const contact = await prisma.contact.findFirst({
    where: { id: context.contactId, companyId },
    select: { tags: true },
  });
  if (!contact || contact.tags.includes(tag)) return;
  await prisma.contact.updateMany({
    where: { id: context.contactId, companyId },
    data: { tags: [...contact.tags, tag] },
  });
}
