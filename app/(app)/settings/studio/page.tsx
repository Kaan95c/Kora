"use client";

import { useEffect, useState } from "react";
import { Check } from "lucide-react";

import { useAuth } from "@/lib/hooks/useAuth";

const inputCls =
  "font-inter h-11 w-full rounded-lg border border-[#c4c8be] bg-white px-3 text-sm text-[#1b1c1a] outline-none transition-colors placeholder:text-outline focus:border-[#52634c]";
const labelCls = "font-inter mb-1.5 block text-sm font-medium text-[#1b1c1a]";

type Form = {
  name: string;
  siret: string;
  vatNumber: string;
  address: string;
  phone: string;
  email: string;
};

const EMPTY: Form = {
  name: "",
  siret: "",
  vatNumber: "",
  address: "",
  phone: "",
  email: "",
};

export default function StudioSettingsPage() {
  const { company } = useAuth();
  const [form, setForm] = useState<Form>(EMPTY);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (company) {
      setForm({
        name: company.name ?? "",
        siret: company.siret ?? "",
        vatNumber: company.vatNumber ?? "",
        address: company.address ?? "",
        phone: company.phone ?? "",
        email: company.email ?? "",
      });
    }
  }, [company]);

  function update<K extends keyof Form>(key: K, value: Form[K]) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  async function save() {
    if (!form.name.trim()) return setError("Studio name is required.");
    setSaving(true);
    setError(null);
    setSaved(false);
    const res = await fetch("/api/settings/studio", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });
    setSaving(false);
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      return setError(data.error ?? "Failed to save.");
    }
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  }

  return (
    <div>
      <h1 className="font-manrope text-[28px] font-semibold tracking-[-0.01em] text-[#1b1c1a]">
        Studio Settings
      </h1>
      <p className="font-inter mt-1 text-sm text-[#444841]">
        These details appear on your invoices, quotes and client portal.
      </p>

      <section className="mt-6 rounded-2xl bg-white p-6 shadow-card">
        <h2 className="font-manrope text-lg font-semibold text-[#1b1c1a]">
          Studio Information
        </h2>

        <div className="mt-5 grid max-w-2xl grid-cols-2 gap-4">
          <div className="col-span-2">
            <label className={labelCls}>Studio name</label>
            <input
              className={inputCls}
              value={form.name}
              onChange={(e) => update("name", e.target.value)}
              placeholder="Boutique Studio"
            />
          </div>
          <div>
            <label className={labelCls}>SIRET</label>
            <input
              className={inputCls}
              value={form.siret}
              onChange={(e) => update("siret", e.target.value)}
              placeholder="123 456 789 00012"
            />
          </div>
          <div>
            <label className={labelCls}>VAT number</label>
            <input
              className={inputCls}
              value={form.vatNumber}
              onChange={(e) => update("vatNumber", e.target.value)}
              placeholder="FR 12 345678900"
            />
          </div>
          <div className="col-span-2">
            <label className={labelCls}>Address</label>
            <input
              className={inputCls}
              value={form.address}
              onChange={(e) => update("address", e.target.value)}
              placeholder="12 Rue des Lilas, 75011 Paris"
            />
          </div>
          <div>
            <label className={labelCls}>Phone</label>
            <input
              className={inputCls}
              value={form.phone}
              onChange={(e) => update("phone", e.target.value)}
              placeholder="+33 1 23 45 67 89"
            />
          </div>
          <div>
            <label className={labelCls}>Email</label>
            <input
              type="email"
              className={inputCls}
              value={form.email}
              onChange={(e) => update("email", e.target.value)}
              placeholder="studio@boutique.com"
            />
          </div>
        </div>

        {error && (
          <p className="font-inter mt-4 max-w-2xl rounded-lg bg-error-container px-3 py-2 text-sm text-[#93000a]">
            {error}
          </p>
        )}

        <div className="mt-6 flex items-center gap-3">
          <button
            type="button"
            onClick={save}
            disabled={saving}
            className="font-inter rounded-lg bg-[#52634c] px-5 py-2.5 text-sm font-semibold text-white transition-all hover:-translate-y-px hover:opacity-95 disabled:opacity-60"
          >
            {saving ? "Saving…" : "Save"}
          </button>
          {saved && (
            <span className="font-inter flex items-center gap-1 text-sm font-medium text-[#3b4b36]">
              <Check className="h-4 w-4" strokeWidth={2} /> Saved
            </span>
          )}
        </div>
      </section>
    </div>
  );
}
