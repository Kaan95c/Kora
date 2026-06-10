"use client";

import { useMemo } from "react";
import { Check, Download } from "lucide-react";

import { useAuth } from "@/lib/hooks/useAuth";
import { StatusBadge } from "@/components/shared/StatusBadge";

type Plan = {
  key: string;
  name: string;
  price: string;
  period: string;
  features: string[];
  cta: string;
  highlight?: boolean;
};

const PLANS: Plan[] = [
  {
    key: "FREE",
    name: "Free",
    price: "€0",
    period: "forever",
    features: [
      "Up to 3 clients",
      "1 active project",
      "Basic invoicing",
      "Community support",
    ],
    cta: "Current plan",
  },
  {
    key: "STARTER",
    name: "Starter",
    price: "€19",
    period: "/ month",
    features: [
      "Unlimited clients",
      "10 active projects",
      "Invoices & quotes",
      "Email support",
    ],
    cta: "Upgrade",
  },
  {
    key: "PRO",
    name: "Pro",
    price: "€39",
    period: "/ month",
    features: [
      "Everything in Starter",
      "Unlimited projects",
      "Branded client portal",
      "Automations & priority support",
    ],
    cta: "Upgrade",
    highlight: true,
  },
];

const INVOICES = [
  { date: "May 1, 2026", plan: "Pro", amount: "€39.00", status: "Paid" },
  { date: "Apr 1, 2026", plan: "Pro", amount: "€39.00", status: "Paid" },
  { date: "Mar 1, 2026", plan: "Pro", amount: "€39.00", status: "Paid" },
];

export default function BillingSettingsPage() {
  const { company } = useAuth();
  const currentPlan = (company?.plan ?? "FREE").toUpperCase();

  const renewLabel = useMemo(() => {
    const d = new Date(new Date().getFullYear() + 1, 0, 1);
    return d.toLocaleDateString("en-US", {
      month: "long",
      day: "numeric",
      year: "numeric",
    });
  }, []);

  return (
    <div>
      <h1 className="font-manrope text-[28px] font-semibold tracking-[-0.01em] text-[#1b1c1a]">
        Billing &amp; Plan
      </h1>
      <p className="font-inter mt-1 text-sm text-[#444841]">
        Manage your subscription and download past invoices.
      </p>

      {/* Plan actuel */}
      <section className="relative mt-6 overflow-hidden rounded-2xl bg-[#52634c] p-6 text-white">
        <div className="flex items-start justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="font-inter text-sm font-medium text-white/70">
                Current plan
              </span>
              <span className="font-inter rounded-full bg-white/15 px-2.5 py-0.5 text-xs font-bold uppercase tracking-wide">
                {currentPlan}
              </span>
            </div>
            <p className="font-manrope mt-2 text-2xl font-semibold">
              You&apos;re on the {currentPlan.charAt(0) + currentPlan.slice(1).toLowerCase()} plan
            </p>
            <p className="font-inter mt-1 text-sm text-white/80">
              Your plan renews on {renewLabel}.
            </p>
          </div>
          <button
            type="button"
            title="Coming soon"
            className="font-inter flex shrink-0 items-center gap-2 rounded-lg bg-white px-4 py-2.5 text-sm font-semibold text-[#52634c] transition-all hover:-translate-y-px hover:opacity-95"
          >
            Manage subscription
            <span className="rounded-full bg-[#52634c]/10 px-1.5 py-0.5 text-[10px] font-semibold text-[#52634c]">
              Soon
            </span>
          </button>
        </div>
      </section>

      {/* Plans disponibles */}
      <div className="mt-6 grid grid-cols-3 gap-4">
        {PLANS.map((plan) => {
          const isCurrent = plan.key === currentPlan;
          return (
            <div
              key={plan.key}
              className={`relative flex flex-col rounded-2xl border bg-white p-6 shadow-card ${
                plan.highlight
                  ? "border-[#52634c] ring-1 ring-[#52634c]"
                  : "border-[#c4c8be]/60"
              }`}
            >
              {plan.highlight && !isCurrent && (
                <span className="font-inter absolute -top-2.5 left-6 rounded-full bg-[#52634c] px-2.5 py-0.5 text-[11px] font-semibold text-white">
                  Most popular
                </span>
              )}
              <div className="flex items-center justify-between">
                <h3 className="font-manrope text-lg font-semibold text-[#1b1c1a]">
                  {plan.name}
                </h3>
                {isCurrent && (
                  <span className="font-inter rounded-full bg-[#d5e8cb] px-2.5 py-0.5 text-[11px] font-semibold text-[#3b4b36]">
                    Current
                  </span>
                )}
              </div>
              <div className="mt-3 flex items-baseline gap-1">
                <span className="font-manrope text-3xl font-bold text-[#1b1c1a]">
                  {plan.price}
                </span>
                <span className="font-inter text-sm text-[#444841]">
                  {plan.period}
                </span>
              </div>

              <ul className="mt-5 flex-1 space-y-2.5">
                {plan.features.map((f) => (
                  <li
                    key={f}
                    className="font-inter flex items-start gap-2 text-sm text-[#444841]"
                  >
                    <Check
                      className="mt-0.5 h-4 w-4 shrink-0 text-[#52634c]"
                      strokeWidth={2}
                    />
                    {f}
                  </li>
                ))}
              </ul>

              <button
                type="button"
                disabled={isCurrent}
                title={isCurrent ? undefined : "Coming soon"}
                className={`font-inter mt-6 flex items-center justify-center gap-2 rounded-lg px-4 py-2.5 text-sm font-semibold transition-all ${
                  isCurrent
                    ? "cursor-default border border-[#c4c8be] bg-[#f5f3f0] text-[#747870]"
                    : plan.highlight
                    ? "bg-[#52634c] text-white hover:-translate-y-px hover:opacity-95"
                    : "border border-[#52634c] text-[#52634c] hover:bg-[#d5e8cb]/40"
                }`}
              >
                {isCurrent ? "Current plan" : plan.cta}
                {!isCurrent && (
                  <span
                    className={`rounded-full px-1.5 py-0.5 text-[10px] font-semibold ${
                      plan.highlight
                        ? "bg-white/20 text-white"
                        : "bg-[#52634c]/10 text-[#52634c]"
                    }`}
                  >
                    Soon
                  </span>
                )}
              </button>
            </div>
          );
        })}
      </div>

      {/* Invoices */}
      <section className="mt-6 rounded-2xl bg-white p-6 shadow-card">
        <h2 className="font-manrope text-lg font-semibold text-[#1b1c1a]">
          Invoices
        </h2>

        <div className="mt-4">
          <div className="grid grid-cols-[1.5fr_1fr_1fr_1fr_auto] gap-4 border-b border-[#c4c8be]/50 pb-3">
            {["Date", "Plan", "Amount", "Status", ""].map((h, i) => (
              <span
                key={i}
                className="font-inter text-[11px] font-semibold uppercase tracking-wide text-[#444841]"
              >
                {h}
              </span>
            ))}
          </div>
          {INVOICES.map((inv, i) => (
            <div
              key={i}
              className="grid grid-cols-[1.5fr_1fr_1fr_1fr_auto] items-center gap-4 border-b border-[#f5f3f0] py-3.5 last:border-b-0"
            >
              <span className="font-inter text-sm text-[#444841]">
                {inv.date}
              </span>
              <span className="font-inter text-sm text-[#444841]">
                {inv.plan}
              </span>
              <span className="font-manrope text-sm font-semibold text-[#1b1c1a]">
                {inv.amount}
              </span>
              <div>
                <StatusBadge status={inv.status} variant="paid" />
              </div>
              <button
                type="button"
                title="Coming soon"
                aria-label="Download invoice"
                className="flex h-8 w-8 items-center justify-center rounded-full text-[#444841] transition-colors hover:bg-[#efeeea]"
              >
                <Download className="h-4 w-4" strokeWidth={1.75} />
              </button>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
