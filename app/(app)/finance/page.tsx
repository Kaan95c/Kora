"use client";

import { useEffect, useMemo, useState } from "react";
import dynamic from "next/dynamic";
import { Download, TrendingUp, ChevronLeft, ChevronRight } from "lucide-react";
import { useTranslations } from "next-intl";

import { StatusBadge, type StatusVariant } from "@/components/shared/StatusBadge";

// Recharts chargé en différé (chunk séparé) — placeholder à hauteur égale.
const RevenueBarChart = dynamic(
  () => import("@/components/finance/RevenueBarChart"),
  {
    ssr: false,
    loading: () => <div className="h-[200px] w-full animate-pulse rounded-xl bg-[#efeeea]" />,
  }
);

// ───────────────────────── Types ─────────────────────────

type Transaction = {
  id: string;
  date: string;
  amount: number;
  status: string;
  method: string | null;
  contact: { firstName: string; lastName: string } | null;
};

type RevenuePoint = { month: string; collected: number; expected: number };

type FinanceData = {
  totalRevenue: number;
  totalRevenueGrowth: number;
  outstandingAmount: number;
  outstandingCount: number;
  revenueChart: RevenuePoint[];
  transactions: Transaction[];
};

const TX_VARIANT: Record<string, StatusVariant> = {
  PAID: "paid",
  PENDING: "pending",
  OVERDUE: "overdue",
  REFUNDED: "draft",
};

const TX_STATUSES = ["PAID", "PENDING", "OVERDUE", "REFUNDED"];
const TX_METHODS = ["CARD", "BANK_TRANSFER", "SEPA", "CASH"];

const PER_PAGE = 5;

// ───────────────────────── Helpers ─────────────────────────

const money2 = (n: number) =>
  n.toLocaleString("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });

function initials(c: Transaction["contact"]) {
  return c ? `${c.firstName[0] ?? ""}${c.lastName[0] ?? ""}`.toUpperCase() : "—";
}

function clientName(c: Transaction["contact"]) {
  return c ? `${c.firstName} ${c.lastName}` : "—";
}

function fmtDate(d: string) {
  return new Date(d).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function csvCell(v: string) {
  return /[",\n\r]/.test(v) ? `"${v.replace(/"/g, '""')}"` : v;
}

// ───────────────────────── Page ─────────────────────────

export default function FinancePage() {
  const t = useTranslations("finance");
  const [data, setData] = useState<FinanceData | null>(null);
  const [page, setPage] = useState(1);

  const txLabel = (s: string) => (TX_STATUSES.includes(s) ? t(`status.${s}`) : s);
  const methodLabel = (m: string | null) =>
    m && TX_METHODS.includes(m) ? t(`method.${m}`) : m ?? "";

  useEffect(() => {
    fetch("/api/finance")
      .then((r) => r.json())
      .then((d: FinanceData) => setData(d))
      .catch(() =>
        setData({
          totalRevenue: 0,
          totalRevenueGrowth: 0,
          outstandingAmount: 0,
          outstandingCount: 0,
          revenueChart: [],
          transactions: [],
        })
      );
  }, []);

  const transactions = useMemo(() => data?.transactions ?? [], [data]);
  const totalPages = Math.max(1, Math.ceil(transactions.length / PER_PAGE));
  const safePage = Math.min(page, totalPages);
  const pageItems = transactions.slice(
    (safePage - 1) * PER_PAGE,
    safePage * PER_PAGE
  );
  const from = transactions.length === 0 ? 0 : (safePage - 1) * PER_PAGE + 1;
  const to = Math.min(safePage * PER_PAGE, transactions.length);

  function exportCSV() {
    if (!data) return;
    const header = [
      t("colDate"),
      t("colClient"),
      t("colTransactionId"),
      t("colAmount"),
      t("colStatus"),
      t("colMethod"),
    ];
    const rows = data.transactions.map((tx) => [
      fmtDate(tx.date),
      clientName(tx.contact),
      `#${tx.id.slice(0, 8).toUpperCase()}`,
      tx.amount.toFixed(2),
      txLabel(tx.status),
      methodLabel(tx.method),
    ]);
    const csv = [header, ...rows]
      .map((r) => r.map(csvCell).join(","))
      .join("\r\n");

    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "kora-transactions.csv";
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }

  // ─── Skeleton ───
  if (!data) {
    return (
      <div className="animate-pulse">
        <div className="mb-8 flex items-start justify-between">
          <div className="space-y-2">
            <div className="h-9 w-64 rounded-xl bg-[#efeeea]" />
            <div className="h-4 w-96 rounded-lg bg-[#efeeea]" />
          </div>
          <div className="h-10 w-32 rounded-lg bg-[#efeeea]" />
        </div>
        <div className="mb-6 grid grid-cols-1 gap-6 lg:grid-cols-5">
          <div className="col-span-3 h-72 rounded-2xl bg-[#efeeea]" />
          <div className="flex flex-col gap-4 lg:col-span-2">
            <div className="h-[136px] flex-1 rounded-2xl bg-[#efeeea]" />
            <div className="h-[136px] flex-1 rounded-2xl bg-[#efeeea]" />
          </div>
        </div>
        <div className="h-80 rounded-2xl bg-[#efeeea]" />
      </div>
    );
  }

  return (
    <div>
      {/* HEADER */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="font-manrope text-[32px] font-semibold tracking-[-0.01em] text-[#1b1c1a]">
            {t("title")}
          </h1>
          <p className="font-inter mt-1 text-base text-[#444841]">
            {t("subtitle")}
          </p>
        </div>
        <button
          type="button"
          onClick={exportCSV}
          className="font-inter flex items-center gap-2 rounded-lg border-[1.5px] border-[#52634c] bg-transparent px-4 py-2.5 text-sm font-medium text-[#52634c] transition-all hover:-translate-y-px hover:bg-[#d5e8cb]/40"
        >
          <Download className="h-4 w-4" strokeWidth={2} />
          {t("exportCsv")}
        </button>
      </div>

      {/* SECTION HAUTE */}
      <div className="mt-8 grid grid-cols-1 gap-6 lg:grid-cols-5">
        {/* Revenue Trends */}
        <div className="rounded-2xl bg-white p-6 shadow-[0_4px_20px_rgba(0,0,0,0.04)] lg:col-span-3">
          <div className="mb-4 flex items-start justify-between">
            <div>
              <h2 className="font-manrope text-xl font-semibold text-[#1b1c1a]">
                {t("revenueTrends")}
              </h2>
              <p className="font-inter mt-0.5 text-[13px] text-[#444841]">
                {t("revenueTrendsDesc")}
              </p>
            </div>
            <div className="flex items-center gap-4">
              <span className="font-inter flex items-center gap-1.5 text-xs font-medium text-[#444841]">
                <span className="h-2.5 w-2.5 rounded-full bg-[#52634c]" />
                {t("collected")}
              </span>
              <span className="font-inter flex items-center gap-1.5 text-xs font-medium text-[#444841]">
                <span className="h-2.5 w-2.5 rounded-full border border-[#705a4a] bg-[#f8dac5]" />
                {t("expected")}
              </span>
            </div>
          </div>

          <RevenueBarChart
            data={data.revenueChart}
            collectedLabel={t("collected")}
            expectedLabel={t("expected")}
          />
        </div>

        {/* Colonne droite */}
        <div className="flex flex-col gap-4 lg:col-span-2">
          {/* Total Revenue */}
          <div className="relative flex-1 overflow-hidden rounded-2xl bg-[#52634c] p-6 text-white">
            <TrendingUp
              className="absolute right-4 top-4 h-10 w-10 text-white opacity-20"
              strokeWidth={1.5}
            />
            <p className="font-inter text-xs font-semibold uppercase tracking-wide text-white/70">
              {t("totalRevenue")}
            </p>
            <p className="font-manrope mt-2 text-[40px] font-bold leading-none">
              ${money2(data.totalRevenue)}
            </p>
            <span className="font-inter mt-3 inline-block rounded-full bg-white/15 px-3 py-1 text-xs font-semibold">
              {t("fromLastMonth", {
                value: `${data.totalRevenueGrowth >= 0 ? "+" : ""}${
                  data.totalRevenueGrowth
                }`,
              })}
            </span>
          </div>

          {/* Outstanding Invoices */}
          <div className="relative flex-1 overflow-hidden rounded-2xl bg-[#705a4a] p-6 text-white">
            <p className="font-inter text-xs font-semibold uppercase tracking-wide text-white/70">
              {t("outstandingInvoices")}
            </p>
            <p className="font-manrope mt-2 text-[40px] font-bold leading-none">
              ${money2(data.outstandingAmount)}
            </p>
            <div className="mt-3 flex items-center gap-2">
              <span className="font-inter rounded-full bg-white/15 px-3 py-1 text-xs font-semibold">
                {t("pending", { count: data.outstandingCount })}
              </span>
              <span className="font-inter rounded-full bg-[#ba1a1a]/30 px-3 py-1 text-xs font-semibold">
                {t("actionRequired")}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* SECTION BASSE — Recent Transactions */}
      <div className="mt-6 overflow-x-auto rounded-2xl bg-white p-6 shadow-[0_4px_20px_rgba(0,0,0,0.04)]">
        <div className="mb-6 flex items-center justify-between">
          <h2 className="font-manrope text-xl font-semibold text-[#1b1c1a]">
            {t("recentTransactions")}
          </h2>
        </div>

        {/* Header colonnes */}
        <div className="grid min-w-[640px] grid-cols-5 border-b border-[#c4c8be]/50 pb-3">
          {[
            t("colDate"),
            t("colClient"),
            t("colTransactionId"),
            t("colAmount"),
            t("colStatus"),
          ].map((h) => (
            <span
              key={h}
              className="font-inter text-[11px] font-semibold uppercase tracking-wide text-[#444841]"
            >
              {h}
            </span>
          ))}
        </div>

        {/* Lignes */}
        <div>
          {pageItems.map((tx) => {
            const variant = TX_VARIANT[tx.status] ?? ("draft" as StatusVariant);
            return (
              <div
                key={tx.id}
                className="grid min-w-[640px] grid-cols-5 items-center border-b border-[#f5f3f0] py-4 transition-colors hover:bg-[#fbf9f5]"
              >
                <span className="font-inter text-sm text-[#444841]">
                  {fmtDate(tx.date)}
                </span>
                <div className="flex items-center gap-2">
                  <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[#efeeea] font-inter text-[11px] font-bold text-[#444841]">
                    {initials(tx.contact)}
                  </span>
                  <span className="font-inter text-sm font-medium text-[#1b1c1a]">
                    {clientName(tx.contact)}
                  </span>
                </div>
                <span className="font-mono text-sm text-[#444841]">
                  #{tx.id.slice(0, 8).toUpperCase()}
                </span>
                <span className="font-manrope text-[15px] font-semibold text-[#1b1c1a]">
                  ${money2(tx.amount)}
                </span>
                <div>
                  <StatusBadge status={txLabel(tx.status)} variant={variant} />
                </div>
              </div>
            );
          })}
          {pageItems.length === 0 && (
            <p className="font-inter py-10 text-center text-sm text-[#444841]">
              {t("noTransactions")}
            </p>
          )}
        </div>

        {/* Pagination */}
        <div className="mt-4 flex items-center justify-between">
          <span className="font-inter text-[13px] text-[#444841]">
            {t("showing", { from, to, total: transactions.length })}
          </span>
          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={safePage === 1}
              aria-label={t("previousPage")}
              className="flex h-8 w-8 items-center justify-center rounded-full text-[#444841] transition-colors hover:bg-[#efeeea] disabled:opacity-40"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
            {Array.from({ length: totalPages }, (_, i) => i + 1).map((n) => (
              <button
                key={n}
                type="button"
                onClick={() => setPage(n)}
                className={`flex h-8 w-8 items-center justify-center rounded-full font-inter text-sm transition-colors ${
                  n === safePage
                    ? "bg-[#1b1c1a] text-white"
                    : "text-[#444841] hover:bg-[#efeeea]"
                }`}
              >
                {n}
              </button>
            ))}
            <button
              type="button"
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              disabled={safePage === totalPages}
              aria-label={t("nextPage")}
              className="flex h-8 w-8 items-center justify-center rounded-full text-[#444841] transition-colors hover:bg-[#efeeea] disabled:opacity-40"
            >
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
