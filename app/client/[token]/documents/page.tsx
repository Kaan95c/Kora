import Link from "next/link";
import { FileText, Download, CreditCard, Wallet } from "lucide-react";

import { PortalShell } from "@/components/client/PortalShell";
import { InvalidLink } from "@/components/client/InvalidLink";
import { StatusBadge, type StatusVariant } from "@/components/shared/StatusBadge";
import { TYPE_CONFIG, STATUS_CONFIG } from "@/lib/documents";
import {
  getPortalData,
  euros,
  portalDate,
  type PortalPayment,
} from "@/lib/client-portal";

export const dynamic = "force-dynamic";

const METHOD_LABEL: Record<NonNullable<PortalPayment["method"]>, string> = {
  CARD: "Card",
  BANK_TRANSFER: "Bank transfer",
  SEPA: "SEPA",
  CASH: "Cash",
};

const PAYMENT_STATUS: Record<
  PortalPayment["status"],
  { label: string; variant: StatusVariant }
> = {
  PAID: { label: "Paid", variant: "paid" },
  PENDING: { label: "Pending", variant: "pending" },
  OVERDUE: { label: "Overdue", variant: "overdue" },
  REFUNDED: { label: "Refunded", variant: "draft" },
};

export default async function PortalDocumentsPage({
  params,
}: {
  params: { token: string };
}) {
  const data = await getPortalData(params.token);
  if (!data) return <InvalidLink />;

  const { company, documents, payments } = data;
  const accent = company.primaryColor;

  return (
    <PortalShell
      companyName={company.name}
      logoUrl={company.logoUrl}
      primaryColor={accent}
      token={params.token}
      active="documents"
    >
      <h1 className="font-manrope mb-1 text-2xl font-semibold text-[#1b1c1a]">
        Documents
      </h1>
      <p className="font-inter mb-6 text-sm text-[#444841]">
        Invoices, quotes and contracts shared with you.
      </p>

      {/* Liste des documents */}
      {documents.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-2xl bg-white py-16 shadow-card">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[#efeeea]">
            <FileText className="h-6 w-6 text-outline" strokeWidth={1.5} />
          </div>
          <p className="font-inter mt-3 text-sm text-[#444841]">
            No documents have been shared yet.
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {documents.map((d) => {
            const type = TYPE_CONFIG[d.type];
            const st = STATUS_CONFIG[d.status];
            const Icon = type.icon;
            const payable =
              d.type === "INVOICE" &&
              (d.status === "SENT" || d.status === "SIGNED") &&
              (d.total ?? 0) > 0;
            const downloadable = d.type === "INVOICE" && d.status === "PAID";

            return (
              <div
                key={d.id}
                className="rounded-2xl bg-white p-5 shadow-card transition-all hover:-translate-y-0.5"
              >
                <div className="flex flex-wrap items-center justify-between gap-4">
                  <div className="flex min-w-0 items-center gap-3">
                    <div
                      className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl"
                      style={{ backgroundColor: type.tile }}
                    >
                      <Icon className="h-5 w-5 text-[#52634c]" strokeWidth={1.75} />
                    </div>
                    <div className="min-w-0">
                      <p className="font-manrope truncate text-sm font-semibold text-[#1b1c1a]">
                        {d.title}
                      </p>
                      <p className="font-inter text-xs text-outline">
                        {type.label}
                        {d.number ? ` · ${d.number}` : ""} · {portalDate(d.createdAt)}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-4">
                    {d.total != null && (
                      <span className="font-manrope text-base font-semibold text-[#1b1c1a]">
                        {euros(d.total)}
                      </span>
                    )}
                    <StatusBadge status={st.label} variant={st.variant} />
                  </div>
                </div>

                {(payable || downloadable) && (
                  <div className="mt-4 flex items-center gap-3 border-t border-[#f5f3f0] pt-4">
                    {payable && (
                      <Link
                        href={`/pay/${d.id}`}
                        className="font-inter inline-flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-semibold text-white transition-all hover:-translate-y-px hover:opacity-95"
                        style={{ backgroundColor: accent }}
                      >
                        <CreditCard className="h-4 w-4" strokeWidth={2} />
                        Pay now
                      </Link>
                    )}
                    {downloadable && (
                      <a
                        href={`/api/pay/${d.id}/invoice`}
                        className="font-inter inline-flex items-center gap-2 rounded-lg border border-[#c4c8be] px-4 py-2 text-sm font-semibold text-[#1b1c1a] transition-colors hover:bg-[#fbf9f5]"
                      >
                        <Download className="h-4 w-4" strokeWidth={2} />
                        Download invoice
                      </a>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Historique des paiements */}
      <div className="mt-10">
        <h2 className="font-manrope mb-1 text-lg font-semibold text-[#1b1c1a]">
          Payment history
        </h2>
        <p className="font-inter mb-4 text-sm text-[#444841]">
          A record of your payments.
        </p>

        {payments.length === 0 ? (
          <div className="flex flex-col items-center justify-center rounded-2xl bg-white py-12 shadow-card">
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-[#efeeea]">
              <Wallet className="h-5 w-5 text-outline" strokeWidth={1.5} />
            </div>
            <p className="font-inter mt-3 text-sm text-[#444841]">
              No payments recorded yet.
            </p>
          </div>
        ) : (
          <div className="overflow-hidden rounded-2xl bg-white shadow-card">
            {payments.map((p, i) => {
              const ps = PAYMENT_STATUS[p.status];
              const when = p.paidAt ?? p.createdAt;
              const ref = p.document?.number ?? p.document?.title ?? "Payment";
              return (
                <div
                  key={p.id}
                  className={`flex items-center justify-between px-5 py-4 ${
                    i > 0 ? "border-t border-[#f5f3f0]" : ""
                  }`}
                >
                  <div className="min-w-0">
                    <p className="font-manrope truncate text-sm font-semibold text-[#1b1c1a]">
                      {ref}
                    </p>
                    <p className="font-inter text-xs text-outline">
                      {portalDate(when)}
                      {p.method ? ` · ${METHOD_LABEL[p.method]}` : ""}
                    </p>
                  </div>
                  <div className="flex shrink-0 items-center gap-4">
                    <span className="font-manrope text-sm font-semibold text-[#1b1c1a]">
                      {euros(p.amount)}
                    </span>
                    <StatusBadge status={ps.label} variant={ps.variant} />
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </PortalShell>
  );
}
