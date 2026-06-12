"use client";

import { useState } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Check, Eye, EyeOff } from "lucide-react";
import { useTranslations } from "next-intl";

import { createClient } from "@/lib/supabase/client";

const BULLET_KEYS = ["bullet1", "bullet2", "bullet3"] as const;

function GoogleIcon() {
  return (
    <svg className="h-5 w-5" viewBox="0 0 24 24" aria-hidden="true">
      <path
        fill="#4285F4"
        d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.27-4.74 3.27-8.1Z"
      />
      <path
        fill="#34A853"
        d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84A11 11 0 0 0 12 23Z"
      />
      <path
        fill="#FBBC05"
        d="M5.84 14.1a6.6 6.6 0 0 1 0-4.2V7.06H2.18a11 11 0 0 0 0 9.88l3.66-2.84Z"
      />
      <path
        fill="#EA4335"
        d="M12 4.75c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 1.46 14.97.5 12 .5A11 11 0 0 0 2.18 7.06l3.66 2.84C6.71 6.68 9.14 4.75 12 4.75Z"
      />
    </svg>
  );
}

function AuthHero() {
  const t = useTranslations("auth");
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
        <h2 className="font-manrope whitespace-pre-line text-[36px] font-semibold leading-[1.2] text-white">
          {t("heroTitle")}
        </h2>
        <p className="font-inter mt-4 max-w-md text-base text-white/80">
          {t("heroSubtitle")}
        </p>

        <ul className="mt-8 space-y-3">
          {BULLET_KEYS.map((k) => (
            <li key={k} className="flex items-center gap-3">
              <span className="flex h-5 w-5 items-center justify-center rounded-full bg-[#d5e8cb]">
                <Check className="h-3 w-3 text-[#52634c]" strokeWidth={3} />
              </span>
              <span className="font-inter text-sm text-white/90">{t(k)}</span>
            </li>
          ))}
        </ul>
      </div>

      <div className="relative" />
    </div>
  );
}

export default function LoginPage() {
  const router = useRouter();
  const t = useTranslations("auth");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [touched, setTouched] = useState(false);

  const emailEmpty = touched && !email;
  const passwordEmpty = touched && !password;

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    setTouched(true);
    setError(null);

    if (!email || !password) return;

    setLoading(true);
    const supabase = createClient();
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      setError(error.message);
      setLoading(false);
      return;
    }

    router.push("/dashboard");
    router.refresh();
  }

  async function handleGoogle() {
    const supabase = createClient();
    await supabase.auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo: `${window.location.origin}/auth/callback` },
    });
  }

  const inputBase =
    "font-inter h-11 w-full rounded-lg border bg-white px-3 text-sm text-on-surface placeholder:text-outline focus:outline-none focus:ring-[3px] focus:ring-primary/15";

  return (
    <main className="grid min-h-screen grid-cols-1 lg:grid-cols-2">
      <AuthHero />

      {/* Colonne droite */}
      <div className="flex items-center justify-center bg-[#fbf9f5] p-12">
        <div className="w-full max-w-[400px]">
          {error && (
            <div className="font-inter mb-6 rounded-lg bg-[#ffdad6] px-4 py-3 text-sm text-[#93000a]">
              {error}
            </div>
          )}

          <h1 className="font-manrope text-[32px] font-semibold text-[#1b1c1a]">
            {t("welcomeBack")}
          </h1>
          <p className="font-inter mb-8 mt-2 text-base text-[#444841]">
            {t("signInSubtitle")}
          </p>

          <form onSubmit={handleLogin} noValidate className="flex flex-col">
            <label
              htmlFor="email"
              className="font-inter mb-1.5 text-sm font-medium text-[#1b1c1a]"
            >
              {t("emailAddress")}
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

            <div className="mb-1.5 mt-4 flex items-center justify-between">
              <label
                htmlFor="password"
                className="font-inter text-sm font-medium text-[#1b1c1a]"
              >
                {t("password")}
              </label>
              <Link
                href="/forgot-password"
                className="font-inter text-[13px] text-[#52634c] hover:underline"
              >
                {t("forgotPassword")}
              </Link>
            </div>
            <div className="relative">
              <input
                id="password"
                type={showPassword ? "text" : "password"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className={`${inputBase} pr-10 ${
                  passwordEmpty
                    ? "border-[#ba1a1a] focus:border-[#ba1a1a]"
                    : "border-[#c4c8be] focus:border-primary"
                }`}
              />
              <button
                type="button"
                onClick={() => setShowPassword((v) => !v)}
                aria-label={showPassword ? "Hide password" : "Show password"}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-outline hover:text-on-surface-variant"
              >
                {showPassword ? (
                  <EyeOff className="h-4 w-4" />
                ) : (
                  <Eye className="h-4 w-4" />
                )}
              </button>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="font-manrope mt-6 flex h-12 w-full items-center justify-center gap-2 rounded-lg bg-[#52634c] text-[15px] font-semibold text-white transition-all duration-150 hover:-translate-y-px hover:bg-[#3b4b36] disabled:cursor-not-allowed disabled:opacity-70"
            >
              {loading ? (
                <>
                  <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/40 border-t-white" />
                  {t("signingIn")}
                </>
              ) : (
                t("signIn")
              )}
            </button>
          </form>

          {/* Séparateur */}
          <div className="my-6 flex items-center gap-3">
            <span className="h-px flex-1 bg-[#c4c8be]" />
            <span className="font-inter text-xs text-[#444841]">
              {t("orContinueWith")}
            </span>
            <span className="h-px flex-1 bg-[#c4c8be]" />
          </div>

          <button
            type="button"
            onClick={handleGoogle}
            className="font-inter flex h-12 w-full items-center justify-center gap-3 rounded-lg border border-[#c4c8be] bg-white text-sm font-medium text-[#1b1c1a] transition-colors hover:bg-[#f5f3f0]"
          >
            <GoogleIcon />
            {t("continueWithGoogle")}
          </button>

          <p className="font-inter mt-8 text-center text-sm text-[#444841]">
            {t("noAccount")}{" "}
            <Link
              href="/register"
              className="font-medium text-[#52634c] hover:underline"
            >
              {t("startTrial")}
            </Link>
          </p>
        </div>
      </div>
    </main>
  );
}
