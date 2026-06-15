"use client";

import { useState } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Check, Eye, EyeOff } from "lucide-react";
import { useTranslations } from "next-intl";

import { createClient } from "@/lib/supabase/client";

const BULLET_KEYS = ["bullet1", "bullet2", "bullet3"] as const;

const PASSWORD_RULES = [
  { key: "pwRule8", test: (p: string) => p.length >= 8 },
  { key: "pwRuleUpper", test: (p: string) => /[A-Z]/.test(p) },
  { key: "pwRuleNumber", test: (p: string) => /[0-9]/.test(p) },
];

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

export default function RegisterPage() {
  const router = useRouter();
  const t = useTranslations("auth");
  const [fullName, setFullName] = useState("");
  const [studioName, setStudioName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const passwordValid = PASSWORD_RULES.every((r) => r.test(password));

  async function handleRegister(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (!fullName || !studioName || !email) {
      setError(t("fillAllFields"));
      return;
    }
    if (!passwordValid) {
      setError(t("passwordRequirements"));
      return;
    }

    setLoading(true);
    const supabase = createClient();

    const { data, error: signUpError } = await supabase.auth.signUp({
      email,
      password,
      options: { data: { full_name: fullName, studio_name: studioName } },
    });

    if (signUpError || !data.user) {
      setError(signUpError?.message ?? t("signUpFailed"));
      setLoading(false);
      return;
    }

    // Crée la Company + User en base (et auto-confirme l'email).
    const setupRes = await fetch("/api/auth/setup-company", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        userId: data.user.id,
        fullName,
        studioName,
        email,
      }),
    });

    if (!setupRes.ok) {
      // Remonte la raison précise renvoyée par le serveur (rate-limit, validation,
      // service_role…) en plus du message générique → diagnostic facilité.
      let detail = "";
      try {
        const b = await setupRes.json();
        detail = (b?.error as string) || (b?.code as string) || "";
      } catch {
        /* corps non-JSON */
      }
      if (setupRes.status === 429) {
        detail = "Trop de tentatives, patiente une minute puis réessaie.";
      }
      setError(detail ? `${t("setupFailed")} (${detail})` : t("setupFailed"));
      setLoading(false);
      return;
    }

    // Ouvre la session (au cas où signUp n'en a pas créé une).
    const { error: signInError } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    if (signInError) {
      setError(signInError.message);
      setLoading(false);
      return;
    }

    // Nouveau compte → wizard de démarrage (évite d'arriver sur des pages vides).
    router.push("/onboarding");
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
    "font-inter h-11 w-full rounded-lg border border-[#c4c8be] bg-white px-3 text-sm text-on-surface placeholder:text-outline focus:border-primary focus:outline-none focus:ring-[3px] focus:ring-primary/15";

  return (
    <main className="grid min-h-screen grid-cols-1 lg:grid-cols-2">
      <AuthHero />

      <div className="flex items-center justify-center bg-[#fbf9f5] p-12">
        <div className="w-full max-w-[400px]">
          {error && (
            <div className="font-inter mb-6 rounded-lg bg-[#ffdad6] px-4 py-3 text-sm text-[#93000a]">
              {error}
            </div>
          )}

          <h1 className="font-manrope text-[32px] font-semibold text-[#1b1c1a]">
            {t("trialTitle")}
          </h1>
          <p className="font-inter mb-6 mt-2 text-base text-[#444841]">
            {t("trialSubtitle")}
          </p>

          <button
            type="button"
            onClick={handleGoogle}
            className="font-inter flex h-12 w-full items-center justify-center gap-3 rounded-lg border border-[#c4c8be] bg-white text-sm font-medium text-[#1b1c1a] transition-colors hover:bg-[#f5f3f0]"
          >
            <GoogleIcon />
            {t("continueWithGoogle")}
          </button>

          {/* Séparateur */}
          <div className="my-6 flex items-center gap-3">
            <span className="h-px flex-1 bg-[#c4c8be]" />
            <span className="font-inter text-xs text-[#444841]">
              {t("orContinueEmail")}
            </span>
            <span className="h-px flex-1 bg-[#c4c8be]" />
          </div>

          <form onSubmit={handleRegister} noValidate className="flex flex-col gap-4">
            <div>
              <label
                htmlFor="fullName"
                className="font-inter mb-1.5 block text-sm font-medium text-[#1b1c1a]"
              >
                {t("fullName")}
              </label>
              <input
                id="fullName"
                type="text"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                placeholder="Julianne Martin"
                className={inputBase}
              />
            </div>

            <div>
              <label
                htmlFor="studioName"
                className="font-inter mb-1.5 block text-sm font-medium text-[#1b1c1a]"
              >
                {t("studioName")}
              </label>
              <input
                id="studioName"
                type="text"
                value={studioName}
                onChange={(e) => setStudioName(e.target.value)}
                placeholder="Boutique Studio"
                className={inputBase}
              />
            </div>

            <div>
              <label
                htmlFor="email"
                className="font-inter mb-1.5 block text-sm font-medium text-[#1b1c1a]"
              >
                {t("emailAddress")}
              </label>
              <input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@studio.com"
                className={inputBase}
              />
            </div>

            <div>
              <label
                htmlFor="password"
                className="font-inter mb-1.5 block text-sm font-medium text-[#1b1c1a]"
              >
                {t("password")}
              </label>
              <div className="relative">
                <input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className={`${inputBase} pr-10`}
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

              {/* Checklist mot de passe */}
              <ul className="mt-2 space-y-1">
                {PASSWORD_RULES.map((rule) => {
                  const ok = rule.test(password);
                  return (
                    <li
                      key={rule.key}
                      className={`font-inter flex items-center gap-1.5 text-xs ${
                        ok ? "text-[#3b4b36]" : "text-[#747870]"
                      }`}
                    >
                      <Check
                        className={`h-3 w-3 ${
                          ok ? "text-[#3b4b36]" : "text-[#c4c8be]"
                        }`}
                        strokeWidth={3}
                      />
                      {t(rule.key)}
                    </li>
                  );
                })}
              </ul>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="font-manrope mt-2 flex h-12 w-full items-center justify-center gap-2 rounded-lg bg-[#52634c] text-[15px] font-semibold text-white transition-all duration-150 hover:-translate-y-px hover:bg-[#3b4b36] disabled:cursor-not-allowed disabled:opacity-70"
            >
              {loading ? (
                <>
                  <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/40 border-t-white" />
                  {t("creatingAccount")}
                </>
              ) : (
                t("createAccount")
              )}
            </button>
          </form>

          <p className="font-inter mt-4 text-center text-xs text-[#444841]">
            {t("termsPrefix")}{" "}
            <Link
              href="/legal/cgv"
              className="font-medium text-[#52634c] hover:underline"
            >
              {t("termsOfService")}
            </Link>{" "}
            {t("and")}{" "}
            <Link
              href="/legal/privacy"
              className="font-medium text-[#52634c] hover:underline"
            >
              {t("privacyPolicy")}
            </Link>
            .
          </p>

          <p className="font-inter mt-6 text-center text-sm text-[#444841]">
            {t("alreadyAccount")}{" "}
            <Link
              href="/login"
              className="font-medium text-[#52634c] hover:underline"
            >
              {t("signIn")}
            </Link>
          </p>
        </div>
      </div>
    </main>
  );
}
