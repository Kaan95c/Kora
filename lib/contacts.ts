import type { StatusVariant } from "@/components/shared/StatusBadge";

// Source unique de vérité pour l'affichage des contacts (liste + détail).

export type ContactStatus = "LEAD" | "PROSPECT" | "CLIENT" | "ARCHIVED";

export const CONTACT_STATUSES: ContactStatus[] = [
  "LEAD",
  "PROSPECT",
  "CLIENT",
  "ARCHIVED",
];

export const STATUS_CONFIG: Record<
  ContactStatus,
  { label: string; variant: StatusVariant; avatarBg: string; avatarText: string }
> = {
  LEAD: {
    label: "Lead",
    variant: "booking",
    avatarBg: "#f3ebe1",
    avatarText: "#705a4a",
  },
  PROSPECT: {
    label: "Prospect",
    variant: "pending",
    avatarBg: "#f8dac5",
    avatarText: "#574333",
  },
  CLIENT: {
    label: "Client",
    variant: "active",
    avatarBg: "#d5e8cb",
    avatarText: "#3b4b36",
  },
  ARCHIVED: {
    label: "Archived",
    variant: "draft",
    avatarBg: "#ebebe7",
    avatarText: "#8a8d85",
  },
};

export function initials(firstName: string, lastName: string) {
  return `${firstName[0] ?? ""}${lastName[0] ?? ""}`.toUpperCase() || "—";
}

export function fullName(firstName: string, lastName: string) {
  return `${firstName} ${lastName}`.trim();
}

export function formatDate(d: string | Date | null) {
  if (!d) return "—";
  return new Date(d).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}
