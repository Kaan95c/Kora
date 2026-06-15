"use client";

import { useEffect, useMemo, useState } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import {
  Check,
  Building2,
  UserPlus,
  FolderPlus,
  Sparkles,
  ArrowRight,
  ArrowLeft,
} from "lucide-react";

import { useAuth } from "@/lib/hooks/useAuth";

const PROJECT_STATUSES = [
  "INQUIRY",
  "FOLLOW_UP",
  "BOOKING",
  "ACTIVE",
] as const;

const inputBase =
  "font-inter h-11 w-full rounded-lg border border-[#c4c8be] bg-white px-3 text-sm text-[#1b1c1a] placeholder:text-[#a0a39b] focus:border-[#52634c] focus:outline-none focus:ring-[3px] focus:ring-[#52634c]/15";

const labelBase =
  "font-inter mb-1.5 block text-sm font-medium text-[#1b1c1a]";

const TOTAL_STEPS = 4;
const STEP_ICONS = [Building2, UserPlus, FolderPlus, Sparkles] as const;

function Field({
  id,
  label,
  optional,
  optionalLabel,
  children,
}: {
  id: string;
  label: string;
  optional?: boolean;
  optionalLabel?: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <label htmlFor={id} className={labelBase}>
        {label}
        {optional && (
          <span className="ml-1.5 font-normal text-[#a0a39b]">
            · {optionalLabel}
          </span>
        )}
      </label>
      {children}
    </div>
  );
}

export default function OnboardingPage() {
  const router = useRouter();
  const t = useTranslations("onboarding");
  const tStatus = useTranslations("status.project");
  const { user, company, isLoading } = useAuth();

  const [step, setStep] = useState(1);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [studioPrefilled, setStudioPrefilled] = useState(false);

  // Studio (étape 1)
  const [studioName, setStudioName] = useState("");
  const [studioPhone, setStudioPhone] = useState("");
  const [studioAddress, setStudioAddress] = useState("");

  // Premier client (étape 2)
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [contactEmail, setContactEmail] = useState("");
  const [contactCompany, setContactCompany] = useState("");
  const [contactPhone, setContactPhone] = useState("");

  // Premier projet (étape 3)
  const [projectName, setProjectName] = useState("");
  const [linkContact, setLinkContact] = useState(true);
  const [projectStatus, setProjectStatus] =
    useState<(typeof PROJECT_STATUSES)[number]>("ACTIVE");

  const firstNameUser =
    (user?.user_metadata?.full_name as string | undefined)?.split(" ")[0] ??
    null;

  // Préremplit le nom du studio depuis la Company (une seule fois, à l'arrivée).
  useEffect(() => {
    if (company && !studioPrefilled) {
      setStudioName(company.name ?? "");
      setStudioPrefilled(true);
    }
  }, [company, studioPrefilled]);

  // Garde : compte déjà onboardé → dashboard (évite de rejouer le wizard).
  useEffect(() => {
    if (!isLoading && company?.onboardedAt) {
      router.replace("/dashboard");
    }
  }, [isLoading, company, router]);

  const hasContact = useMemo(
    () =>
      firstName.trim() !== "" ||
      lastName.trim() !== "" ||
      contactEmail.trim() !== "",
    [firstName, lastName, contactEmail]
  );
  const contactComplete =
    firstName.trim() !== "" &&
    lastName.trim() !== "" &&
    contactEmail.trim() !== "";
  const contactName = `${firstName.trim()} ${lastName.trim()}`.trim();
  const hasProject = projectName.trim() !== "";

  function validateStep(current: number): string | null {
    if (current === 1 && studioName.trim() === "") {
      return t("errStudioName");
    }
    if (current === 2 && hasContact && !contactComplete) {
      return t("errContactIncomplete");
    }
    if (
      current === 2 &&
      contactEmail.trim() !== "" &&
      !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(contactEmail.trim())
    ) {
      return t("errEmail");
    }
    return null;
  }

  function goNext() {
    const err = validateStep(step);
    if (err) {
      setError(err);
      return;
    }
    setError(null);
    setStep((s) => Math.min(s + 1, TOTAL_STEPS));
  }

  function goBack() {
    setError(null);
    setStep((s) => Math.max(s - 1, 1));
  }

  /** Marque l'onboarding terminé puis redirige vers le dashboard. */
  async function complete() {
    // On ne redirige QUE si `onboardedAt` a bien été posé : sinon le
    // OnboardingGate renverrait en boucle vers /onboarding.
    const res = await fetch("/api/onboarding/complete", { method: "POST" });
    if (!res.ok) throw new Error("complete");
    router.push("/dashboard");
    router.refresh();
  }

  /** « Passer » : aucune donnée créée, on marque juste l'onboarding terminé. */
  async function handleSkip() {
    if (submitting) return;
    setSubmitting(true);
    setError(null);
    try {
      await complete();
    } catch {
      setError(t("errGeneric"));
      setSubmitting(false);
    }
  }

  /** Dernière étape : crée studio + (contact) + (projet), puis termine. */
  async function handleFinish() {
    setSubmitting(true);
    setError(null);
    try {
      // 1. Studio (le nom est requis ; téléphone / adresse optionnels).
      const studioRes = await fetch("/api/settings/studio", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: studioName.trim(),
          phone: studioPhone.trim() || null,
          address: studioAddress.trim() || null,
        }),
      });
      if (!studioRes.ok) throw new Error("studio");

      // 2. Premier client (si renseigné).
      let contactId: string | null = null;
      if (contactComplete) {
        const contactRes = await fetch("/api/contacts", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            firstName: firstName.trim(),
            lastName: lastName.trim(),
            email: contactEmail.trim(),
            companyName: contactCompany.trim() || null,
            phone: contactPhone.trim() || null,
            status: "CLIENT",
          }),
        });
        if (!contactRes.ok) throw new Error("contact");
        const created = await contactRes.json();
        contactId = created?.id ?? null;
      }

      // 3. Premier projet (si renseigné), éventuellement lié au client créé.
      if (hasProject) {
        const projectRes = await fetch("/api/projects", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            name: projectName.trim(),
            status: projectStatus,
            contactId: linkContact ? contactId : null,
          }),
        });
        if (!projectRes.ok) throw new Error("project");
      }

      // 4. Marque l'onboarding terminé + redirige.
      await complete();
    } catch {
      setError(t("errGeneric"));
      setSubmitting(false);
    }
  }

  // Splash pendant le chargement de la session / company.
  if (isLoading || (company?.onboardedAt ?? null)) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-[#fbf9f5]">
        <span className="h-8 w-8 animate-spin rounded-full border-2 border-[#c4c8be] border-t-[#52634c]" />
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-[#fbf9f5] px-4 py-8 md:py-12">
      <div className="mx-auto w-full max-w-[560px]">
        {/* En-tête : logo + passer */}
        <div className="mb-8 flex items-center justify-between">
          <Image
            src="/logo.png"
            alt="Kora"
            width={40}
            height={41}
            priority
            className="h-auto w-10"
          />
          <button
            type="button"
            onClick={handleSkip}
            disabled={submitting}
            className="font-inter text-sm text-[#747870] transition-colors hover:text-[#1b1c1a] disabled:opacity-60"
          >
            {t("skip")}
          </button>
        </div>

        {/* Stepper */}
        <div className="mb-8 flex items-center gap-2">
          {Array.from({ length: TOTAL_STEPS }, (_, i) => {
            const n = i + 1;
            const StepIcon = STEP_ICONS[i];
            const done = n < step;
            const active = n === step;
            return (
              <div key={n} className="flex flex-1 items-center gap-2">
                <span
                  className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full transition-colors ${
                    done
                      ? "bg-[#52634c] text-white"
                      : active
                        ? "bg-[#d5e8cb] text-[#3b4b36]"
                        : "bg-[#efeeea] text-[#a0a39b]"
                  }`}
                >
                  {done ? (
                    <Check className="h-4 w-4" strokeWidth={3} />
                  ) : (
                    <StepIcon className="h-4 w-4" strokeWidth={2} />
                  )}
                </span>
                {n < TOTAL_STEPS && (
                  <span
                    className={`h-0.5 flex-1 rounded-full ${
                      done ? "bg-[#52634c]" : "bg-[#efeeea]"
                    }`}
                  />
                )}
              </div>
            );
          })}
        </div>

        <div className="rounded-2xl bg-white p-6 shadow-[0_4px_20px_rgba(0,0,0,0.04)] md:p-8">
          <p className="font-inter mb-1 text-xs font-semibold uppercase tracking-widest text-[#52634c]">
            {t("stepOf", { current: step, total: TOTAL_STEPS })}
          </p>

          {error && (
            <div className="font-inter mb-5 rounded-lg bg-[#ffdad6] px-4 py-3 text-sm text-[#93000a]">
              {error}
            </div>
          )}

          {/* ───────────── Étape 1 : Studio ───────────── */}
          {step === 1 && (
            <>
              <h1 className="font-manrope text-[26px] font-semibold leading-tight text-[#1b1c1a]">
                {firstNameUser
                  ? t("welcomeTitleName", { name: firstNameUser })
                  : t("welcomeTitle")}
              </h1>
              <p className="font-inter mb-6 mt-2 text-sm text-[#444841]">
                {t("welcomeSubtitle")}
              </p>

              <div className="flex flex-col gap-4">
                <Field id="studioName" label={t("studioName")}>
                  <input
                    id="studioName"
                    type="text"
                    value={studioName}
                    onChange={(e) => setStudioName(e.target.value)}
                    placeholder="Boutique Studio"
                    className={inputBase}
                  />
                </Field>
                <Field
                  id="studioPhone"
                  label={t("phone")}
                  optional
                  optionalLabel={t("optional")}
                >
                  <input
                    id="studioPhone"
                    type="tel"
                    value={studioPhone}
                    onChange={(e) => setStudioPhone(e.target.value)}
                    placeholder="+33 6 12 34 56 78"
                    className={inputBase}
                  />
                </Field>
                <Field
                  id="studioAddress"
                  label={t("address")}
                  optional
                  optionalLabel={t("optional")}
                >
                  <input
                    id="studioAddress"
                    type="text"
                    value={studioAddress}
                    onChange={(e) => setStudioAddress(e.target.value)}
                    placeholder="12 Rue des Lilas, 75011 Paris"
                    className={inputBase}
                  />
                </Field>
              </div>
            </>
          )}

          {/* ───────────── Étape 2 : Premier client ───────────── */}
          {step === 2 && (
            <>
              <h1 className="font-manrope text-[26px] font-semibold leading-tight text-[#1b1c1a]">
                {t("clientTitle")}
              </h1>
              <p className="font-inter mb-6 mt-2 text-sm text-[#444841]">
                {t("clientSubtitle")}
              </p>

              <div className="flex flex-col gap-4">
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <Field id="firstName" label={t("firstName")}>
                    <input
                      id="firstName"
                      type="text"
                      value={firstName}
                      onChange={(e) => setFirstName(e.target.value)}
                      placeholder="Elena"
                      className={inputBase}
                    />
                  </Field>
                  <Field id="lastName" label={t("lastName")}>
                    <input
                      id="lastName"
                      type="text"
                      value={lastName}
                      onChange={(e) => setLastName(e.target.value)}
                      placeholder="Moreau"
                      className={inputBase}
                    />
                  </Field>
                </div>
                <Field id="contactEmail" label={t("email")}>
                  <input
                    id="contactEmail"
                    type="email"
                    value={contactEmail}
                    onChange={(e) => setContactEmail(e.target.value)}
                    placeholder="elena@studio.com"
                    className={inputBase}
                  />
                </Field>
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <Field
                    id="contactCompany"
                    label={t("companyLabel")}
                    optional
                    optionalLabel={t("optional")}
                  >
                    <input
                      id="contactCompany"
                      type="text"
                      value={contactCompany}
                      onChange={(e) => setContactCompany(e.target.value)}
                      placeholder="Velvet Rose"
                      className={inputBase}
                    />
                  </Field>
                  <Field
                    id="contactPhone"
                    label={t("phone")}
                    optional
                    optionalLabel={t("optional")}
                  >
                    <input
                      id="contactPhone"
                      type="tel"
                      value={contactPhone}
                      onChange={(e) => setContactPhone(e.target.value)}
                      placeholder="+33 6 12 34 56 78"
                      className={inputBase}
                    />
                  </Field>
                </div>
                <p className="font-inter text-xs text-[#747870]">
                  {t("clientHint")}
                </p>
              </div>
            </>
          )}

          {/* ───────────── Étape 3 : Premier projet ───────────── */}
          {step === 3 && (
            <>
              <h1 className="font-manrope text-[26px] font-semibold leading-tight text-[#1b1c1a]">
                {t("projectTitle")}
              </h1>
              <p className="font-inter mb-6 mt-2 text-sm text-[#444841]">
                {t("projectSubtitle")}
              </p>

              <div className="flex flex-col gap-4">
                <Field id="projectName" label={t("projectName")}>
                  <input
                    id="projectName"
                    type="text"
                    value={projectName}
                    onChange={(e) => setProjectName(e.target.value)}
                    placeholder={t("projectPlaceholder")}
                    className={inputBase}
                  />
                </Field>
                <Field id="projectStatus" label={t("projectStatusLabel")}>
                  <select
                    id="projectStatus"
                    value={projectStatus}
                    onChange={(e) =>
                      setProjectStatus(
                        e.target.value as (typeof PROJECT_STATUSES)[number]
                      )
                    }
                    className={inputBase}
                  >
                    {PROJECT_STATUSES.map((s) => (
                      <option key={s} value={s}>
                        {tStatus(s)}
                      </option>
                    ))}
                  </select>
                </Field>

                {contactComplete && (
                  <label className="flex cursor-pointer items-center gap-2.5 rounded-lg border border-[#c4c8be] bg-[#fbf9f5] px-3 py-3">
                    <input
                      type="checkbox"
                      checked={linkContact}
                      onChange={(e) => setLinkContact(e.target.checked)}
                      className="h-4 w-4 accent-[#52634c]"
                    />
                    <span className="font-inter text-sm text-[#1b1c1a]">
                      {t("linkToClient", { name: contactName })}
                    </span>
                  </label>
                )}
                <p className="font-inter text-xs text-[#747870]">
                  {t("projectHint")}
                </p>
              </div>
            </>
          )}

          {/* ───────────── Étape 4 : Récapitulatif ───────────── */}
          {step === 4 && (
            <>
              <h1 className="font-manrope text-[26px] font-semibold leading-tight text-[#1b1c1a]">
                {t("readyTitle")}
              </h1>
              <p className="font-inter mb-6 mt-2 text-sm text-[#444841]">
                {t("readySubtitle")}
              </p>

              <div className="flex flex-col gap-3">
                <RecapRow
                  Icon={Building2}
                  label={t("recapStudio")}
                  value={studioName.trim() || "—"}
                />
                <RecapRow
                  Icon={UserPlus}
                  label={t("recapClient")}
                  value={contactComplete ? contactName : t("recapNone")}
                  muted={!contactComplete}
                />
                <RecapRow
                  Icon={FolderPlus}
                  label={t("recapProject")}
                  value={hasProject ? projectName.trim() : t("recapNone")}
                  muted={!hasProject}
                />
              </div>
            </>
          )}

          {/* ───────────── Navigation ───────────── */}
          <div className="mt-8 flex items-center justify-between gap-3">
            {step > 1 ? (
              <button
                type="button"
                onClick={goBack}
                disabled={submitting}
                className="font-inter inline-flex items-center gap-1.5 rounded-lg px-3 py-2.5 text-sm font-medium text-[#444841] transition-colors hover:bg-[#f5f3f0] disabled:opacity-60"
              >
                <ArrowLeft className="h-4 w-4" />
                {t("back")}
              </button>
            ) : (
              <span />
            )}

            {step < TOTAL_STEPS ? (
              <button
                type="button"
                onClick={goNext}
                className="font-manrope inline-flex h-11 items-center gap-2 rounded-lg bg-[#52634c] px-5 text-sm font-semibold text-white transition-all duration-150 hover:-translate-y-px hover:bg-[#3b4b36]"
              >
                {t("continue")}
                <ArrowRight className="h-4 w-4" />
              </button>
            ) : (
              <button
                type="button"
                onClick={handleFinish}
                disabled={submitting}
                className="font-manrope inline-flex h-11 items-center gap-2 rounded-lg bg-[#52634c] px-5 text-sm font-semibold text-white transition-all duration-150 hover:-translate-y-px hover:bg-[#3b4b36] disabled:cursor-not-allowed disabled:opacity-70"
              >
                {submitting ? (
                  <>
                    <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/40 border-t-white" />
                    {t("finishing")}
                  </>
                ) : (
                  t("goToDashboard")
                )}
              </button>
            )}
          </div>
        </div>
      </div>
    </main>
  );
}

function RecapRow({
  Icon,
  label,
  value,
  muted,
}: {
  Icon: typeof Building2;
  label: string;
  value: string;
  muted?: boolean;
}) {
  return (
    <div className="flex items-center gap-3 rounded-xl border border-[#c4c8be]/60 bg-[#fbf9f5] px-4 py-3">
      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-[#d5e8cb]">
        <Icon className="h-4 w-4 text-[#3b4b36]" strokeWidth={2} />
      </span>
      <div className="min-w-0">
        <p className="font-inter text-[11px] font-semibold uppercase tracking-wide text-[#747870]">
          {label}
        </p>
        <p
          className={`font-manrope truncate text-sm font-semibold ${
            muted ? "text-[#a0a39b]" : "text-[#1b1c1a]"
          }`}
        >
          {value}
        </p>
      </div>
    </div>
  );
}
