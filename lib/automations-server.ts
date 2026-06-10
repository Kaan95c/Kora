import type { Prisma } from "@prisma/client";

// Helpers serveur partagés par les routes /api/automations.
// (Hors du fichier route.ts : Next.js interdit les exports non-handler dans une route.)

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
    select: { id: true, type: true, order: true, delayHours: true },
  },
} satisfies Prisma.AutomationSelect;

type ActionInput = { type?: string; delayHours?: unknown; config?: unknown };

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
      config: (a.config ?? {}) as Prisma.InputJsonValue,
    }));
}
