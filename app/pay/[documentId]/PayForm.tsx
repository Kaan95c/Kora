"use client";

import { useEffect, useState, type FormEvent, type ReactNode } from "react";
import { loadStripe } from "@stripe/stripe-js";
import {
  Elements,
  PaymentElement,
  useStripe,
  useElements,
} from "@stripe/react-stripe-js";
import { Check, Lock, AlertCircle, Download } from "lucide-react";

const stripePromise = loadStripe(
  process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY ?? ""
);

type Recap = {
  title: string;
  number: string | null;
  total: number;
  clientName: string | null;
  companyName: string;
};

const euros = (n: number) =>
  new Intl.NumberFormat("fr-FR", { style: "currency", currency: "EUR" }).format(
    n
  );

// ───────────────────────── Coque de page ─────────────────────────

function Shell({ children }: { children: ReactNode }) {
  return (
    <main className="flex min-h-screen items-center justify-center bg-[#fbf9f5] px-4 py-10">
      <div className="w-full max-w-md">{children}</div>
    </main>
  );
}

function RecapCard({ recap }: { recap: Recap }) {
  return (
    <div className="mb-5 rounded-2xl bg-white p-6 shadow-card">
      <p className="font-inter text-xs font-semibold uppercase tracking-wide text-[#444841]">
        {recap.companyName}
      </p>
      <p className="font-manrope mt-3 text-[40px] font-bold leading-none text-[#1b1c1a]">
        {euros(recap.total)}
      </p>
      <div className="mt-4 space-y-1.5 border-t border-[#efeeea] pt-4">
        <div className="flex justify-between">
          <span className="font-inter text-sm text-[#444841]">Invoice</span>
          <span className="font-inter text-sm font-medium text-[#1b1c1a]">
            {recap.number ?? recap.title}
          </span>
        </div>
        {recap.clientName && (
          <div className="flex justify-between">
            <span className="font-inter text-sm text-[#444841]">Billed to</span>
            <span className="font-inter text-sm font-medium text-[#1b1c1a]">
              {recap.clientName}
            </span>
          </div>
        )}
      </div>
    </div>
  );
}

function SuccessCard({
  recap,
  documentId,
}: {
  recap: Recap;
  documentId: string;
}) {
  return (
    <div className="rounded-2xl bg-white p-8 text-center shadow-card">
      <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-[#d5e8cb]">
        <Check className="h-7 w-7 text-[#3b4b36]" strokeWidth={2.5} />
      </div>
      <h1 className="font-manrope mt-5 text-xl font-semibold text-[#1b1c1a]">
        Payment successful
      </h1>
      <p className="font-inter mt-2 text-sm text-[#444841]">
        Thank you! Your payment of{" "}
        <span className="font-semibold text-[#1b1c1a]">{euros(recap.total)}</span>{" "}
        to {recap.companyName} has been received.
      </p>
      <a
        href={`/api/pay/${documentId}/invoice`}
        className="font-inter mt-6 inline-flex items-center gap-2 rounded-lg bg-[#52634c] px-5 py-2.5 text-sm font-semibold text-white transition-all hover:-translate-y-px hover:opacity-95"
      >
        <Download className="h-4 w-4" strokeWidth={2} />
        Download your invoice
      </a>
    </div>
  );
}

// ───────────────────────── Checkout (dans <Elements>) ─────────────────────────

function CheckoutForm({
  recap,
  documentId,
}: {
  recap: Recap;
  documentId: string;
}) {
  const stripe = useStripe();
  const elements = useElements();
  const [status, setStatus] = useState<
    "idle" | "processing" | "succeeded" | "error"
  >("idle");
  const [message, setMessage] = useState<string | null>(null);

  // Au retour d'une redirection (SEPA…), vérifie le statut du PaymentIntent.
  useEffect(() => {
    if (!stripe) return;
    const cs = new URLSearchParams(window.location.search).get(
      "payment_intent_client_secret"
    );
    if (!cs) return;
    stripe.retrievePaymentIntent(cs).then(({ paymentIntent }) => {
      if (paymentIntent?.status === "succeeded") setStatus("succeeded");
      else if (paymentIntent?.status === "processing") setStatus("processing");
    });
  }, [stripe]);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!stripe || !elements) return;
    setStatus("processing");
    setMessage(null);

    const { error, paymentIntent } = await stripe.confirmPayment({
      elements,
      confirmParams: { return_url: window.location.href },
      redirect: "if_required",
    });

    if (error) {
      setStatus("error");
      setMessage(error.message ?? "Something went wrong. Please try again.");
    } else if (paymentIntent?.status === "succeeded") {
      setStatus("succeeded");
    } else {
      // requires_action / processing → la redirection ou le webhook prend le relais.
      setStatus("idle");
    }
  }

  if (status === "succeeded") {
    return (
      <Shell>
        <SuccessCard recap={recap} documentId={documentId} />
      </Shell>
    );
  }

  return (
    <Shell>
      <RecapCard recap={recap} />
      <form
        onSubmit={handleSubmit}
        className="rounded-2xl bg-white p-6 shadow-card"
      >
        <h2 className="font-manrope mb-4 text-base font-semibold text-[#1b1c1a]">
          Payment details
        </h2>
        <PaymentElement />

        {message && (
          <p className="font-inter mt-3 flex items-start gap-1.5 rounded-lg bg-error-container px-3 py-2 text-sm text-[#93000a]">
            <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" strokeWidth={1.75} />
            {message}
          </p>
        )}

        <button
          type="submit"
          disabled={!stripe || status === "processing"}
          className="font-manrope mt-5 flex h-12 w-full items-center justify-center gap-2 rounded-lg bg-[#52634c] text-[15px] font-semibold text-white transition-all hover:-translate-y-px hover:bg-[#3b4b36] disabled:cursor-not-allowed disabled:opacity-70"
        >
          {status === "processing" ? (
            <>
              <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/40 border-t-white" />
              Processing…
            </>
          ) : (
            `Pay ${euros(recap.total)}`
          )}
        </button>

        <p className="font-inter mt-3 flex items-center justify-center gap-1.5 text-xs text-outline">
          <Lock className="h-3 w-3" strokeWidth={2} />
          Secure payment powered by Stripe
        </p>
      </form>
    </Shell>
  );
}

// ───────────────────────── Composant exporté ─────────────────────────

export function PayForm({
  recap,
  documentId,
  clientSecret,
  alreadyPaid,
  notPayable,
}: {
  recap: Recap;
  documentId: string;
  clientSecret: string | null;
  alreadyPaid?: boolean;
  notPayable?: boolean;
}) {
  if (alreadyPaid) {
    return (
      <Shell>
        <SuccessCard recap={recap} documentId={documentId} />
      </Shell>
    );
  }

  if (notPayable || !clientSecret) {
    return (
      <Shell>
        <div className="rounded-2xl bg-white p-8 text-center shadow-card">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-[#efeeea]">
            <AlertCircle className="h-7 w-7 text-outline" strokeWidth={1.75} />
          </div>
          <h1 className="font-manrope mt-5 text-xl font-semibold text-[#1b1c1a]">
            Nothing to pay
          </h1>
          <p className="font-inter mt-2 text-sm text-[#444841]">
            This document isn&apos;t available for online payment.
          </p>
        </div>
      </Shell>
    );
  }

  return (
    <Elements
      stripe={stripePromise}
      options={{
        clientSecret,
        appearance: {
          theme: "stripe",
          variables: {
            colorPrimary: "#52634c",
            borderRadius: "8px",
            fontFamily: "Inter, system-ui, sans-serif",
          },
        },
      }}
    >
      <CheckoutForm recap={recap} documentId={documentId} />
    </Elements>
  );
}
