"use client";

import { useEffect, useState } from "react";
import { Camera, Check } from "lucide-react";

import { useAuth } from "@/lib/hooks/useAuth";
import { createClient } from "@/lib/supabase/client";
import { LanguageSelect } from "@/components/settings/LanguageSelect";

const PASSWORD_RULES = [
  { label: "8 characters minimum", test: (p: string) => p.length >= 8 },
  { label: "One uppercase letter", test: (p: string) => /[A-Z]/.test(p) },
  { label: "One number", test: (p: string) => /[0-9]/.test(p) },
];

const inputCls =
  "font-inter h-11 w-full rounded-lg border border-[#c4c8be] bg-white px-3 text-sm text-[#1b1c1a] outline-none transition-colors placeholder:text-outline focus:border-[#52634c]";
const labelCls = "font-inter mb-1.5 block text-sm font-medium text-[#1b1c1a]";

function initialsOf(name: string, email: string) {
  const base = name.trim() || email;
  const parts = base.split(/[\s@.]+/).filter(Boolean);
  return ((parts[0]?.[0] ?? "") + (parts[1]?.[0] ?? "")).toUpperCase() || "U";
}

export default function GeneralSettingsPage() {
  const { user } = useAuth();
  const email = user?.email ?? "";

  // ─── Profil ───
  const [name, setName] = useState("");
  const [savingProfile, setSavingProfile] = useState(false);
  const [savedProfile, setSavedProfile] = useState(false);

  useEffect(() => {
    if (user) {
      const metaName =
        (user.user_metadata?.full_name as string | undefined) ?? "";
      setName(metaName);
    }
  }, [user]);

  async function saveProfile() {
    if (!name.trim()) return;
    setSavingProfile(true);
    setSavedProfile(false);
    const res = await fetch("/api/settings/profile", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name }),
    });
    setSavingProfile(false);
    if (res.ok) {
      setSavedProfile(true);
      setTimeout(() => setSavedProfile(false), 2000);
    }
  }

  // ─── Mot de passe ───
  const [current, setCurrent] = useState("");
  const [newPw, setNewPw] = useState("");
  const [confirm, setConfirm] = useState("");
  const [pwSaving, setPwSaving] = useState(false);
  const [pwError, setPwError] = useState<string | null>(null);
  const [pwSaved, setPwSaved] = useState(false);

  const pwValid = PASSWORD_RULES.every((r) => r.test(newPw));

  async function updatePassword() {
    setPwError(null);
    setPwSaved(false);
    if (!current) return setPwError("Enter your current password.");
    if (!pwValid) return setPwError("New password doesn't meet the rules.");
    if (newPw !== confirm) return setPwError("Passwords don't match.");

    setPwSaving(true);
    const supabase = createClient();
    // Vérifie le mot de passe actuel en se ré-authentifiant.
    const { error: signInErr } = await supabase.auth.signInWithPassword({
      email,
      password: current,
    });
    if (signInErr) {
      setPwSaving(false);
      return setPwError("Current password is incorrect.");
    }
    const { error: updErr } = await supabase.auth.updateUser({
      password: newPw,
    });
    setPwSaving(false);
    if (updErr) return setPwError(updErr.message);
    setCurrent("");
    setNewPw("");
    setConfirm("");
    setPwSaved(true);
    setTimeout(() => setPwSaved(false), 2500);
  }

  return (
    <div>
      <h1 className="font-manrope text-[28px] font-semibold tracking-[-0.01em] text-[#1b1c1a]">
        Account Settings
      </h1>
      <p className="font-inter mt-1 text-sm text-[#444841]">
        Manage your personal information and password.
      </p>

      {/* Personal Information */}
      <section className="mt-6 rounded-2xl bg-white p-6 shadow-card">
        <h2 className="font-manrope text-lg font-semibold text-[#1b1c1a]">
          Personal Information
        </h2>

        <div className="mt-5 flex items-center gap-5">
          <span className="font-manrope flex h-20 w-20 shrink-0 items-center justify-center rounded-full bg-[#d5e8cb] text-2xl font-bold text-[#3b4b36]">
            {initialsOf(name, email)}
          </span>
          <div>
            <button
              type="button"
              className="font-inter flex items-center gap-2 rounded-lg border border-[#c4c8be] bg-white px-4 py-2 text-sm font-medium text-[#1b1c1a] transition-colors hover:bg-[#f5f3f0]"
            >
              <Camera className="h-4 w-4" strokeWidth={1.75} />
              Change photo
            </button>
            <p className="font-inter mt-1.5 text-xs text-outline">
              PNG or JPG, up to 2 MB.
            </p>
          </div>
        </div>

        <div className="mt-6 grid max-w-xl grid-cols-1 gap-4">
          <div>
            <label className={labelCls}>Full name</label>
            <input
              className={inputCls}
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Your name"
            />
          </div>
          <div>
            <label className={labelCls}>Email address</label>
            <input
              className={`${inputCls} cursor-not-allowed bg-[#f5f3f0] text-[#747870]`}
              value={email}
              readOnly
              disabled
            />
            <p className="font-inter mt-1.5 text-xs text-outline">
              Managed by your authentication provider.
            </p>
          </div>
        </div>

        <div className="mt-6 flex items-center gap-3">
          <button
            type="button"
            onClick={saveProfile}
            disabled={savingProfile}
            className="font-inter rounded-lg bg-[#52634c] px-5 py-2.5 text-sm font-semibold text-white transition-all hover:-translate-y-px hover:opacity-95 disabled:opacity-60"
          >
            {savingProfile ? "Saving…" : "Save changes"}
          </button>
          {savedProfile && (
            <span className="font-inter flex items-center gap-1 text-sm font-medium text-[#3b4b36]">
              <Check className="h-4 w-4" strokeWidth={2} /> Saved
            </span>
          )}
        </div>
      </section>

      {/* Password */}
      <section className="mt-6 rounded-2xl bg-white p-6 shadow-card">
        <h2 className="font-manrope text-lg font-semibold text-[#1b1c1a]">
          Password
        </h2>
        <p className="font-inter mt-1 text-sm text-[#444841]">
          Choose a strong password you don&apos;t use elsewhere.
        </p>

        <div className="mt-5 grid max-w-xl grid-cols-1 gap-4">
          <div>
            <label className={labelCls}>Current password</label>
            <input
              type="password"
              className={inputCls}
              value={current}
              onChange={(e) => setCurrent(e.target.value)}
              placeholder="••••••••"
            />
          </div>
          <div>
            <label className={labelCls}>New password</label>
            <input
              type="password"
              className={inputCls}
              value={newPw}
              onChange={(e) => setNewPw(e.target.value)}
              placeholder="••••••••"
            />
            <ul className="mt-2 space-y-1">
              {PASSWORD_RULES.map((rule) => {
                const ok = rule.test(newPw);
                return (
                  <li
                    key={rule.label}
                    className={`font-inter flex items-center gap-1.5 text-xs ${
                      ok ? "text-[#3b4b36]" : "text-[#747870]"
                    }`}
                  >
                    <Check
                      className={`h-3 w-3 ${ok ? "text-[#3b4b36]" : "text-[#c4c8be]"}`}
                      strokeWidth={3}
                    />
                    {rule.label}
                  </li>
                );
              })}
            </ul>
          </div>
          <div>
            <label className={labelCls}>Confirm new password</label>
            <input
              type="password"
              className={inputCls}
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
              placeholder="••••••••"
            />
          </div>

          {pwError && (
            <p className="font-inter rounded-lg bg-error-container px-3 py-2 text-sm text-[#93000a]">
              {pwError}
            </p>
          )}
        </div>

        <div className="mt-6 flex items-center gap-3">
          <button
            type="button"
            onClick={updatePassword}
            disabled={pwSaving}
            className="font-inter rounded-lg bg-[#52634c] px-5 py-2.5 text-sm font-semibold text-white transition-all hover:-translate-y-px hover:opacity-95 disabled:opacity-60"
          >
            {pwSaving ? "Updating…" : "Update password"}
          </button>
          {pwSaved && (
            <span className="font-inter flex items-center gap-1 text-sm font-medium text-[#3b4b36]">
              <Check className="h-4 w-4" strokeWidth={2} /> Password updated
            </span>
          )}
        </div>
      </section>

      <LanguageSelect />
    </div>
  );
}
