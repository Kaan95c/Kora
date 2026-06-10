import {
  Receipt,
  FileText,
  FileSignature,
  FilePen,
  type LucideIcon,
} from "lucide-react";

import type { StatusVariant } from "@/components/shared/StatusBadge";

// Source unique de vérité pour l'affichage des documents (liste + drawer).

export type DocumentType = "INVOICE" | "QUOTE" | "CONTRACT" | "PROPOSAL";
export type DocumentStatus = "DRAFT" | "SENT" | "SIGNED" | "PAID";

export const DOCUMENT_TYPES: DocumentType[] = [
  "INVOICE",
  "QUOTE",
  "CONTRACT",
  "PROPOSAL",
];

export const DOCUMENT_STATUSES: DocumentStatus[] = [
  "DRAFT",
  "SENT",
  "SIGNED",
  "PAID",
];

export const TYPE_CONFIG: Record<
  DocumentType,
  { label: string; plural: string; icon: LucideIcon; tile: string }
> = {
  INVOICE: { label: "Invoice", plural: "Invoices", icon: Receipt, tile: "#d5e8cb" },
  QUOTE: { label: "Quote", plural: "Quotes", icon: FileText, tile: "#f8dac5" },
  CONTRACT: {
    label: "Contract",
    plural: "Contracts",
    icon: FileSignature,
    tile: "#ece3d9",
  },
  PROPOSAL: {
    label: "Proposal",
    plural: "Proposals",
    icon: FilePen,
    tile: "#efeeea",
  },
};

export const STATUS_CONFIG: Record<
  DocumentStatus,
  { label: string; variant: StatusVariant }
> = {
  DRAFT: { label: "Draft", variant: "draft" },
  SENT: { label: "Sent", variant: "sent" },
  SIGNED: { label: "Signed", variant: "active" },
  PAID: { label: "Paid", variant: "paid" },
};

export const money = (n: number) => `$${n.toLocaleString()}`;

export function formatDate(d: string | Date | null) {
  if (!d) return "—";
  return new Date(d).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}
