import {
  UserPlus,
  FileSignature,
  Send,
  CircleDollarSign,
  AlertTriangle,
  CalendarCheck,
  RefreshCw,
  Tag,
  Mail,
  FileText,
  ListTodo,
  BellRing,
  type LucideIcon,
} from "lucide-react";

// Source unique de vérité pour l'affichage des automations (page + drawer).

export type AutomationTrigger =
  | "NEW_LEAD"
  | "CONTRACT_SIGNED"
  | "INVOICE_SENT"
  | "PAYMENT_RECEIVED"
  | "PAYMENT_OVERDUE"
  | "APPOINTMENT_BOOKED"
  | "PROJECT_STATUS_CHANGED"
  | "TAG_ADDED";

export type ActionType =
  | "SEND_EMAIL"
  | "SEND_DOCUMENT"
  | "CREATE_TASK"
  | "CHANGE_PROJECT_STATUS"
  | "ADD_TAG"
  | "SEND_REMINDER";

export const TRIGGERS: AutomationTrigger[] = [
  "NEW_LEAD",
  "CONTRACT_SIGNED",
  "INVOICE_SENT",
  "PAYMENT_RECEIVED",
  "PAYMENT_OVERDUE",
  "APPOINTMENT_BOOKED",
  "PROJECT_STATUS_CHANGED",
  "TAG_ADDED",
];

export const ACTION_TYPES: ActionType[] = [
  "SEND_EMAIL",
  "SEND_DOCUMENT",
  "CREATE_TASK",
  "CHANGE_PROJECT_STATUS",
  "ADD_TAG",
  "SEND_REMINDER",
];

export const TRIGGER_CONFIG: Record<
  AutomationTrigger,
  { label: string; icon: LucideIcon; description: string }
> = {
  NEW_LEAD: {
    label: "New Lead",
    icon: UserPlus,
    description: "A new lead is added",
  },
  CONTRACT_SIGNED: {
    label: "Contract Signed",
    icon: FileSignature,
    description: "A contract gets signed",
  },
  INVOICE_SENT: {
    label: "Invoice Sent",
    icon: Send,
    description: "An invoice is sent",
  },
  PAYMENT_RECEIVED: {
    label: "Payment Received",
    icon: CircleDollarSign,
    description: "A payment is received",
  },
  PAYMENT_OVERDUE: {
    label: "Payment Overdue",
    icon: AlertTriangle,
    description: "An invoice becomes overdue",
  },
  APPOINTMENT_BOOKED: {
    label: "Appointment Booked",
    icon: CalendarCheck,
    description: "A new appointment is booked",
  },
  PROJECT_STATUS_CHANGED: {
    label: "Project Status Changed",
    icon: RefreshCw,
    description: "A project moves stage",
  },
  TAG_ADDED: {
    label: "Tag Added",
    icon: Tag,
    description: "A tag is added to a contact",
  },
};

export const ACTION_CONFIG: Record<
  ActionType,
  { label: string; icon: LucideIcon }
> = {
  SEND_EMAIL: { label: "Send Email", icon: Mail },
  SEND_DOCUMENT: { label: "Send Document", icon: FileText },
  CREATE_TASK: { label: "Create Task", icon: ListTodo },
  CHANGE_PROJECT_STATUS: { label: "Change Project Status", icon: RefreshCw },
  ADD_TAG: { label: "Add Tag", icon: Tag },
  SEND_REMINDER: { label: "Send Reminder", icon: BellRing },
};

/** "Last triggered X days ago" / "2 hours ago" / "Never triggered". */
export function lastTriggeredLabel(d: string | Date | null): string {
  if (!d) return "Never triggered";
  const diff = Date.now() - new Date(d).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "Triggered just now";
  if (mins < 60) return `Last triggered ${mins} min ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `Last triggered ${hours} hour${hours === 1 ? "" : "s"} ago`;
  const days = Math.floor(hours / 24);
  return `Last triggered ${days} day${days === 1 ? "" : "s"} ago`;
}

/** Délai lisible : "Immediately" / "1h" / "3 days". */
export function delayLabel(hours: number): string {
  if (!hours) return "Immediately";
  if (hours < 24) return `${hours}h`;
  const days = Math.round(hours / 24);
  return `${days} day${days === 1 ? "" : "s"}`;
}
