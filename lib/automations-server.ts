import type { Prisma } from "@prisma/client";

import { sanitizeText } from "@/lib/sanitize";

// Helpers serveur partagés par les routes /api/automations.
// (Hors du fichier route.ts : Next.js interdit les exports non-handler dans une route.)

const PROJECT_STATUSES = [
  "INQUIRY",
  "FOLLOW_UP",
  "BOOKING",
  "ACTIVE",
  "ARCHIVED",
] as const;

const TRIGGERS = [
  "NEW_LEAD",
  "CONTRACT_SIGNED",
  "INVOICE_SENT",
  "PAYMENT_RECEIVED",
  "PAYMENT_OVERDUE",
  "APPOINTMENT_BOOKED",
  "PROJECT_STATUS_CHANGED",
  "TAG_ADDED",
] as const;
const ACTION_TYPES = [
  "SEND_EMAIL",
  "SEND_DOCUMENT",
  "CREATE_TASK",
  "CHANGE_PROJECT_STATUS",
  "ADD_TAG",
  "SEND_REMINDER",
] as const;

type Trigger = (typeof TRIGGERS)[number];
type ActionTypeT = (typeof ACTION_TYPES)[number];

export const isTrigger = (v: unknown): v is Trigger =>
  typeof v === "string" && TRIGGERS.includes(v as Trigger);
export const isActionType = (v: unknown): v is ActionTypeT =>
  typeof v === "string" && ACTION_TYPES.includes(v as ActionTypeT);

export const AUTOMATION_SELECT = {
  id: true,
  name: true,
  description: true,
  isActive: true,
  trigger: true,
  lastTriggeredAt: true,
  triggerCount: true,
  createdAt: true,
  actions: {
    orderBy: { order: "asc" },
    select: {
      id: true,
      type: true,
      order: true,
      delayHours: true,
      config: true,
    },
  },
} satisfies Prisma.AutomationSelect;

type ActionInput = { type?: string; delayHours?: unknown; config?: unknown };

/** Lit une chaîne dans le config brut → texte nettoyé (sans tags), plafonné. */
function readStr(config: unknown, key: string, max: number): string {
  if (config && typeof config === "object" && !Array.isArray(config)) {
    const v = (config as Record<string, unknown>)[key];
    if (typeof v === "string") return sanitizeText(v).slice(0, max);
  }
  return "";
}

/**
 * Construit un `config` propre selon le type d'action : seules les clés connues
 * sont conservées, nettoyées et plafonnées. Le statut projet est validé contre
 * l'enum (ignoré sinon).
 */
function buildActionConfig(
  type: (typeof ACTION_TYPES)[number],
  rawConfig: unknown
): Prisma.InputJsonValue {
  switch (type) {
    case "SEND_EMAIL":
    case "SEND_REMINDER":
      return {
        subject: readStr(rawConfig, "subject", 200),
        body: readStr(rawConfig, "body", 5000),
      };
    case "CREATE_TASK":
      return { title: readStr(rawConfig, "title", 200) };
    case "ADD_TAG":
      return { tag: readStr(rawConfig, "tag", 40) };
    case "CHANGE_PROJECT_STATUS": {
      const status = readStr(rawConfig, "status", 20);
      return PROJECT_STATUSES.includes(
        status as (typeof PROJECT_STATUSES)[number]
      )
        ? { status }
        : {};
    }
    default:
      return {};
  }
}

export function buildActionsCreate(
  actions: unknown
): Prisma.AutomationActionCreateWithoutAutomationInput[] {
  if (!Array.isArray(actions)) return [];
  return actions
    .filter((a): a is ActionInput => !!a && isActionType((a as ActionInput).type))
    .map((a, i) => ({
      type: a.type as ActionTypeT,
      order: i,
      delayHours:
        typeof a.delayHours === "number" && Number.isFinite(a.delayHours)
          ? Math.max(0, Math.round(a.delayHours))
          : 0,
      config: buildActionConfig(a.type as ActionTypeT, a.config),
    }));
}
