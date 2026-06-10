"use client";

import { useEffect, useState } from "react";
import { Check } from "lucide-react";

import { useAuth } from "@/lib/hooks/useAuth";

type PlanCard = {
  key: "FREE" | "STARTER" | "PRO";
  name: string;
  price: string;
  period: string;
  features: string[];
  highlight?: boolean;
};

const PLANS: PlanCard[] = [
  {
    key: "FREE",
    name: "Free",
    price: "€0",
    period: "forever",
    features: [
      "3 projects",
      "5 contacts",
      "3 documents / invoices",
      "No automations",
      "No client portal",
    ],
  },
  {
    key: "STARTER",
    name: "Starter",
    price: "€19",
    period: "/ month",
    features: [
      "15 projects",
      "50 contacts",
      "30 documents",
      "3 automations",
      "Client portal included",
      "Email support",
    ],
  },
  {
    key: "PRO",
    name: "Pro",
    price: "€39",
    period: "/ month",
    features: [
      "Unlimited projects",
      "Unlimited contacts",
      "Unlimited documents",
      "Unlimited automations",
      "Client portal included",
      "Custom PDF with your logo",
      "Priority support",
    ],
    highlight: true,
  },
];

const ACTIVE_STATUSES = ["active", "trialing", "past_due"];

export default function BillingSettingsPage() {
  const { company } = useAuth();
  const currentPlan = (company?.plan ?? "FREE").toUpperCase();
  const subscribed = ACTIVE_STATUSES.includes(company?.subscriptionStatus ?? "");
  const hasCustomer = Boolean(company?.stripeCustomerId);

  const [busy, setBusy] = useState(false);
  const [flash, setFlash] = useState<"success" | "cancel" | null>(null);

  // Bannière de retour depuis Stripe (?status=success|cancel) — lecture client-only.
  useEffect(() => {
    const status = new URLSearchParams(window.location.search).get("status");
    if (status === "success") setFlash("success");
    else if (status === "cancel") setFlash("cancel");
  }, []);

  const periodEnd = company?.currentPeriodEnd
    ? new Date(company.currentPeriodEnd)
    : null;
  const periodLabel = periodEnd
    ? periodEnd.toLocaleDateString("en-US", {
        month: "long",
        day: "numeric",
        year: "numeric",
      })
    : null;

  let statusLine = "You're on the Free plan.";
  if (currentPlan !== "FREE") {
    if (company?.cancelAtPeriodEnd && periodLabel) {
      statusLine = `Your plan ends on ${periodLabel}.`;
    } else if (company?.subscriptionStatus === "past_due") {
      statusLine = "Payment past due — please update your card in the portal.";
    } else if (periodLabel) {
      statusLine = `Your plan renews on ${periodLabel}.`;
    } else {
      statusLine = "Subscription active.";
    }
  }

  async function redirectTo(endpoint: string, payload?: Record<string, string>) {
    setBusy(true);
    try {
      const res = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: payload ? JSON.stringify(payload) : undefined,
      });
      const data = await res.json();
      if (res.ok && data.url) {
        window.location.href = data.url as string;
        return;
      }
      alert(data.error ?? "Something went wrong. Please try again.");
    } catch {
      alert("Network error. Please try again.");
    } finally {
      setBusy(false);
    }
  }

  const startCheckout = (plan: "STARTER" | "PRO") =>
    redirectTo("/api/billing/checkout", { plan });
  const openPortal = () => redirectTo("/api/billing/portal");

  function ctaLabel(plan: PlanCard) {
    if (plan.key === currentPlan) return "Current plan";
    if (plan.key === "FREE") return "Switch to Free";
    return subscribed ? `Switch to ${plan.name}` : `Choose ${plan.name}`;
  }

  function onCardClick(plan: PlanCard) {
    if (plan.key === currentPlan) return;
    // Free downgrade, ou changement de plan d'un abonné existant → Portal.
    if (plan.key === "FREE" || subscribed) {
      openPortal();
      return;
    }
    startCheckout(plan.key);
  }

  return (
    <div>
      <h1 className="font-manrope text-[28px] font-semibold tracking-[-0.01em] text-[#1b1c1a]">
        Billing &amp; Plan
      </h1>
      <p className="font-inter mt-1 text-sm text-[#444841]">
        Manage your subscription and payment details.
      </p>

      {flash && (
        <div
          className={`font-inter mt-5 flex items-center justify-between gap-4 rounded-xl border px-4 py-3 text-sm ${
            flash === "success"
              ? "border-[#52634c]/30 bg-[#d5e8cb]/40 text-[#3b4b36]"
              : "border-[#c4c8be]/60 bg-[#f5f3f0] text-[#444841]"
          }`}
        >
          <span>
            {flash === "success"
              ? "✅ Subscription confirmed. It can take a few seconds to update — refresh if needed."
              : "Checkout canceled — no changes were made."}
          </span>
          {flash === "success" && (
            <button
              type="button"
              onClick={() => window.location.reload()}
              className="shrink-0 rounded-lg bg-[#52634c] px-3 py-1.5 text-xs font-semibold text-white hover:opacity-95"
            >
              Refresh
            </button>
          )}
        </div>
      )}

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
              You&apos;re on the{" "}
              {currentPlan.charAt(0) + currentPlan.slice(1).toLowerCase()} plan
            </p>
            <p className="font-inter mt-1 text-sm text-white/80">{statusLine}</p>
          </div>
          {hasCustomer && (
            <button
              type="button"
              onClick={openPortal}
              disabled={busy}
              className="font-inter flex shrink-0 items-center gap-2 rounded-lg bg-white px-4 py-2.5 text-sm font-semibold text-[#52634c] transition-all hover:-translate-y-px hover:opacity-95 disabled:cursor-not-allowed disabled:opacity-60"
            >
              Manage subscription
            </button>
          )}
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
                disabled={isCurrent || busy}
                onClick={() => onCardClick(plan)}
                className={`font-inter mt-6 flex items-center justify-center gap-2 rounded-lg px-4 py-2.5 text-sm font-semibold transition-all disabled:cursor-not-allowed ${
                  isCurrent
                    ? "border border-[#c4c8be] bg-[#f5f3f0] text-[#747870]"
                    : plan.highlight
                    ? "bg-[#52634c] text-white hover:-translate-y-px hover:opacity-95 disabled:opacity-60"
                    : "border border-[#52634c] text-[#52634c] hover:bg-[#d5e8cb]/40 disabled:opacity-60"
                }`}
              >
                {ctaLabel(plan)}
              </button>
            </div>
          );
        })}
      </div>

      {/* Historique de facturation → portail Stripe */}
      <section className="mt-6 flex items-center justify-between gap-4 rounded-2xl bg-white p-6 shadow-card">
        <div>
          <h2 className="font-manrope text-lg font-semibold text-[#1b1c1a]">
            Billing history
          </h2>
          <p className="font-inter mt-1 text-sm text-[#444841]">
            Invoices, receipts and payment method are managed in the secure
            Stripe billing portal.
          </p>
        </div>
        <button
          type="button"
          onClick={openPortal}
          disabled={busy || !hasCustomer}
          title={hasCustomer ? undefined : "Available once you have a subscription"}
          className="font-inter shrink-0 rounded-lg border border-[#52634c] px-4 py-2.5 text-sm font-semibold text-[#52634c] transition-all hover:bg-[#d5e8cb]/40 disabled:cursor-not-allowed disabled:opacity-50"
        >
          Open billing portal
        </button>
      </section>
    </div>
  );
}
