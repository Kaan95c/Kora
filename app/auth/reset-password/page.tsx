"use client";

import { useEffect, useState } from "react";
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

export default function ResetPasswordPage() {
  const router = useRouter();
  const t = useTranslations("auth");
  const [checking, setChecking] = useState(true);
  const [hasSession, setHasSession] = useState(false);
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const passwordValid = PASSWORD_RULES.every((r) => r.test(password));

  // Le lien de l'email passe par /auth/callback (échange du code PKCE) qui pose
  // une session de récupération avant de rediriger ici. Sans session valide
  // (lien expiré / accès direct), on ne peut pas réinitialiser le mot de passe.
  useEffect(() => {
    const supabase = createClient();
    supabase.auth.getSession().then(({ data }) => {
      setHasSession(Boolean(data.session));
      setChecking(false);
    });
  }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (!passwordValid) {
      setError(t("passwordRequirements"));
      return;
    }

    setLoading(true);
    const supabase = createClient();
    const { error } = await supabase.auth.updateUser({ password });

    if (error) {
      setError(error.message);
      setLoading(false);
      return;
    }

    // La session de récupération est une vraie session → on entre directement
    // dans l'app avec le nouveau mot de passe.
    router.push("/dashboard");
    router.refresh();
  }

  const inputBase =
    "font-inter h-11 w-full rounded-lg border border-[#c4c8be] bg-white px-3 text-sm text-on-surface placeholder:text-outline focus:border-primary focus:outline-none focus:ring-[3px] focus:ring-primary/15";

  return (
    <main className="grid min-h-screen grid-cols-1 lg:grid-cols-2">
      <AuthHero />

      {/* Colonne droite */}
      <div className="flex items-center justify-center bg-[#fbf9f5] p-12">
        <div className="w-full max-w-[400px]">
          {checking ? (
            <div className="flex items-center justify-center">
              <span className="h-6 w-6 animate-spin rounded-full border-2 border-[#c4c8be] border-t-[#52634c]" />
            </div>
          ) : !hasSession ? (
            <div className="text-center">
              <h1 className="font-manrope text-[32px] font-semibold text-[#1b1c1a]">
                {t("linkExpired")}
              </h1>
              <p className="font-inter mb-8 mt-2 text-base text-[#444841]">
                {t("linkExpiredText")}
              </p>
              <Link
                href="/forgot-password"
                className="font-manrope inline-flex h-12 w-full items-center justify-center rounded-lg bg-[#52634c] text-[15px] font-semibold text-white transition-all duration-150 hover:-translate-y-px hover:bg-[#3b4b36]"
              >
                {t("requestNewLink")}
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
                {t("resetTitle")}
              </h1>
              <p className="font-inter mb-8 mt-2 text-base text-[#444841]">
                {t("resetSubtitle")}
              </p>

              <form onSubmit={handleSubmit} noValidate className="flex flex-col">
                <label
                  htmlFor="password"
                  className="font-inter mb-1.5 text-sm font-medium text-[#1b1c1a]"
                >
                  {t("newPassword")}
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

                <button
                  type="submit"
                  disabled={loading}
                  className="font-manrope mt-6 flex h-12 w-full items-center justify-center gap-2 rounded-lg bg-[#52634c] text-[15px] font-semibold text-white transition-all duration-150 hover:-translate-y-px hover:bg-[#3b4b36] disabled:cursor-not-allowed disabled:opacity-70"
                >
                  {loading ? (
                    <>
                      <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/40 border-t-white" />
                      {t("updating")}
                    </>
                  ) : (
                    t("updatePassword")
                  )}
                </button>
              </form>
            </>
          )}
        </div>
      </div>
    </main>
  );
}
