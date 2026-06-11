"use client";

import { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { ArrowLeft, Check, MailCheck } from "lucide-react";

import { createClient } from "@/lib/supabase/client";

const BULLETS = [
  "Invoices & contracts in minutes",
  "Automated client follow-ups",
  "Beautiful client portal",
];

function AuthHero() {
  return (
    <div className="relative hidden overflow-hidden bg-[#52634c] p-12 lg:flex lg:flex-col lg:justify-between">
      {/* Cercles décoratifs */}
      <div className="pointer-events-none absolute inset-0 opacity-5">
        <div className="absolute -left-16 -top-16 h-72 w-72 rounded-full bg-white" />
        <div className="absolute bottom-10 right-10 h-96 w-96 rounded-full bg-white" />
        <div className="absolute left-1/3 top-1/2 h-40 w-40 rounded-full bg-white" />
      </div>

      <Image
        src="/logo-white.png"
        alt="Kora"
        width={116}
        height={119}
        priority
        className="relative h-auto w-[116px]"
      />

      <div className="relative">
        <h2 className="font-manrope text-[36px] font-semibold leading-[1.2] text-white">
          Focus on creating,
          <br />
          let us handle the rest.
        </h2>
        <p className="font-inter mt-4 max-w-md text-base text-white/80">
          Join thousands of creative professionals who trust Kora to run their
          studio.
        </p>

        <ul className="mt-8 space-y-3">
          {BULLETS.map((b) => (
            <li key={b} className="flex items-center gap-3">
              <span className="flex h-5 w-5 items-center justify-center rounded-full bg-[#d5e8cb]">
                <Check className="h-3 w-3 text-[#52634c]" strokeWidth={3} />
              </span>
              <span className="font-inter text-sm text-white/90">{b}</span>
            </li>
          ))}
        </ul>
      </div>

      <div className="relative" />
    </div>
  );
}

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sent, setSent] = useState(false);
  const [touched, setTouched] = useState(false);

  const emailEmpty = touched && !email;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setTouched(true);
    setError(null);

    if (!email) return;

    setLoading(true);
    const supabase = createClient();
    // On route le lien de réinitialisation par /auth/callback (déjà public +
    // déjà autorisé dans les Redirect URLs Supabase) : il échange le code PKCE
    // puis renvoie sur /auth/reset-password avec une session de récupération.
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/auth/callback?next=/auth/reset-password`,
    });

    if (error) {
      setError(error.message);
      setLoading(false);
      return;
    }

    setSent(true);
    setLoading(false);
  }

  const inputBase =
    "font-inter h-11 w-full rounded-lg border bg-white px-3 text-sm text-on-surface placeholder:text-outline focus:outline-none focus:ring-[3px] focus:ring-primary/15";

  return (
    <main className="grid min-h-screen grid-cols-1 lg:grid-cols-2">
      <AuthHero />

      {/* Colonne droite */}
      <div className="flex items-center justify-center bg-[#fbf9f5] p-12">
        <div className="w-full max-w-[400px]">
          {sent ? (
            <div className="text-center">
              <span className="mx-auto mb-6 flex h-14 w-14 items-center justify-center rounded-full bg-[#d5e8cb]">
                <MailCheck className="h-7 w-7 text-[#52634c]" />
              </span>
              <h1 className="font-manrope text-[32px] font-semibold text-[#1b1c1a]">
                Check your email
              </h1>
              <p className="font-inter mb-8 mt-2 text-base text-[#444841]">
                If an account exists for{" "}
                <span className="font-medium text-[#1b1c1a]">{email}</span>,
                we&apos;ve sent a link to reset your password.
              </p>
              <Link
                href="/login"
                className="font-inter inline-flex items-center gap-2 text-sm font-medium text-[#52634c] hover:underline"
              >
                <ArrowLeft className="h-4 w-4" />
                Back to sign in
              </Link>
            </div>
          ) : (
            <>
              {error && (
                <div className="font-inter mb-6 rounded-lg bg-[#ffdad6] px-4 py-3 text-sm text-[#93000a]">
                  {error}
                </div>
              )}

              <h1 className="font-manrope text-[32px] font-semibold text-[#1b1c1a]">
                Forgot your password?
              </h1>
              <p className="font-inter mb-8 mt-2 text-base text-[#444841]">
                Enter your email and we&apos;ll send you a link to reset it.
              </p>

              <form onSubmit={handleSubmit} noValidate className="flex flex-col">
                <label
                  htmlFor="email"
                  className="font-inter mb-1.5 text-sm font-medium text-[#1b1c1a]"
                >
                  Email address
                </label>
                <input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@studio.com"
                  className={`${inputBase} ${
                    emailEmpty
                      ? "border-[#ba1a1a] focus:border-[#ba1a1a]"
                      : "border-[#c4c8be] focus:border-primary"
                  }`}
                />

                <button
                  type="submit"
                  disabled={loading}
                  className="font-manrope mt-6 flex h-12 w-full items-center justify-center gap-2 rounded-lg bg-[#52634c] text-[15px] font-semibold text-white transition-all duration-150 hover:-translate-y-px hover:bg-[#3b4b36] disabled:cursor-not-allowed disabled:opacity-70"
                >
                  {loading ? (
                    <>
                      <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/40 border-t-white" />
                      Sending...
                    </>
                  ) : (
                    "Send reset link"
                  )}
                </button>
              </form>

              <p className="font-inter mt-8 text-center text-sm text-[#444841]">
                <Link
                  href="/login"
                  className="inline-flex items-center gap-2 font-medium text-[#52634c] hover:underline"
                >
                  <ArrowLeft className="h-4 w-4" />
                  Back to sign in
                </Link>
              </p>
            </>
          )}
        </div>
      </div>
    </main>
  );
}
