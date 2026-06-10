import { cn } from "@/lib/utils";

export type StatusVariant =
  | "active"
  | "paid"
  | "pending"
  | "progress"
  | "booking"
  | "sent"
  | "draft"
  | "overdue"
  | "error"
  | "priority";

const variantStyles: Record<StatusVariant, string> = {
  active: "bg-primary/[0.12] text-[#3b4b36]",
  paid: "bg-primary/[0.12] text-[#3b4b36]",
  pending: "bg-secondary/[0.12] text-[#574333]",
  progress: "bg-secondary/[0.12] text-[#574333]",
  booking: "bg-secondary-container text-[#574333]",
  sent: "bg-secondary-container text-[#574333]",
  draft: "bg-surface-container text-on-surface-variant",
  overdue: "bg-error-container text-[#93000a]",
  error: "bg-error-container text-[#93000a]",
  priority: "bg-[#1b1c1a] text-white",
};

/** Déduit le variant à partir d'un statut texte ("Paid", "In Progress"...). */
function resolveVariant(status: string): StatusVariant {
  const key = status.toLowerCase().trim();
  if (["active", "paid", "signed", "completed", "done"].includes(key))
    return "active";
  if (["pending", "in progress", "progress", "follow-up"].includes(key))
    return "pending";
  if (["booking", "sent", "inquiry", "proposal"].includes(key))
    return "booking";
  if (["draft", "archived"].includes(key)) return "draft";
  if (["overdue", "error", "failed", "late"].includes(key)) return "overdue";
  if (["priority", "high priority", "urgent"].includes(key)) return "priority";
  return "draft";
}

interface StatusBadgeProps {
  status: string;
  variant?: StatusVariant;
  className?: string;
}

export function StatusBadge({ status, variant, className }: StatusBadgeProps) {
  const resolved = variant ?? resolveVariant(status);
  return (
    <span
      className={cn(
        "font-inter inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold",
        variantStyles[resolved],
        className
      )}
    >
      {status}
    </span>
  );
}

export default StatusBadge;
