"use client";

import { useEffect, useRef, useState, type DragEvent } from "react";
import { Check, UploadCloud, ImageIcon } from "lucide-react";

import { useAuth } from "@/lib/hooks/useAuth";

const inputCls =
  "font-inter h-11 w-full rounded-lg border border-[#c4c8be] bg-white px-3 text-sm text-[#1b1c1a] outline-none transition-colors placeholder:text-outline focus:border-[#52634c]";
const labelCls = "font-inter mb-1.5 block text-sm font-medium text-[#1b1c1a]";

const HEX = /^#[0-9a-fA-F]{6}$/;
const ACCEPTED = ["image/png", "image/jpeg", "image/jpg", "image/svg+xml"];
const MAX_BYTES = 2 * 1024 * 1024;

export default function BrandingSettingsPage() {
  const { company } = useAuth();
  const fileRef = useRef<HTMLInputElement>(null);

  const [logoUrl, setLogoUrl] = useState<string | null>(null);
  const [color, setColor] = useState("#52634c");
  const [invoicePrefix, setInvoicePrefix] = useState("FAC");
  const [quotePrefix, setQuotePrefix] = useState("DEV");

  const [dragOver, setDragOver] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (company) {
      setLogoUrl(company.logoUrl ?? null);
      setColor(company.primaryColor ?? "#52634c");
      setInvoicePrefix(company.invoicePrefix ?? "FAC");
      setQuotePrefix(company.quotePrefix ?? "DEV");
    }
  }, [company]);

  async function handleFile(file: File) {
    setError(null);
    if (!ACCEPTED.includes(file.type)) {
      return setError("Unsupported format (PNG, JPG or SVG only).");
    }
    if (file.size > MAX_BYTES) {
      return setError("File too large (max 2 MB).");
    }
    setUploading(true);
    const fd = new FormData();
    fd.append("file", file);
    const res = await fetch("/api/settings/logo", {
      method: "POST",
      body: fd,
    });
    setUploading(false);
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      return setError(data.error ?? "Upload failed.");
    }
    const { url } = await res.json();
    setLogoUrl(url);
  }

  function onDrop(e: DragEvent<HTMLDivElement>) {
    e.preventDefault();
    setDragOver(false);
    const file = e.dataTransfer.files?.[0];
    if (file) handleFile(file);
  }

  async function save() {
    if (!HEX.test(color)) return setError("Primary color must be a #RRGGBB hex.");
    setSaving(true);
    setError(null);
    setSaved(false);
    const res = await fetch("/api/settings/branding", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        primaryColor: color,
        logoUrl,
        invoicePrefix,
        quotePrefix,
      }),
    });
    setSaving(false);
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      return setError(data.error ?? "Failed to save.");
    }
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  }

  const safeColor = HEX.test(color) ? color : "#52634c";

  return (
    <div>
      <h1 className="font-manrope text-[28px] font-semibold tracking-[-0.01em] text-[#1b1c1a]">
        Branding
      </h1>
      <p className="font-inter mt-1 text-sm text-[#444841]">
        Customize how your studio looks across documents and the client portal.
      </p>

      <section className="mt-6 rounded-2xl bg-white p-6 shadow-card">
        <h2 className="font-manrope text-lg font-semibold text-[#1b1c1a]">
          Visual Identity
        </h2>

        {/* Logo upload */}
        <div className="mt-5">
          <label className={labelCls}>Logo</label>
          <div className="flex items-center gap-5">
            {/* Preview */}
            <div className="flex h-24 w-24 shrink-0 items-center justify-center overflow-hidden rounded-2xl border border-[#c4c8be] bg-[#f5f3f0]">
              {logoUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={logoUrl}
                  alt="Studio logo"
                  className="h-full w-full object-contain p-2"
                />
              ) : (
                <ImageIcon className="h-7 w-7 text-outline" strokeWidth={1.5} />
              )}
            </div>

            {/* Dropzone */}
            <div
              role="button"
              tabIndex={0}
              onClick={() => fileRef.current?.click()}
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === " ") fileRef.current?.click();
              }}
              onDragOver={(e) => {
                e.preventDefault();
                setDragOver(true);
              }}
              onDragLeave={() => setDragOver(false)}
              onDrop={onDrop}
              className={`flex flex-1 cursor-pointer flex-col items-center justify-center rounded-2xl border-2 border-dashed px-6 py-7 text-center transition-colors ${
                dragOver
                  ? "border-[#52634c] bg-[#d5e8cb]/40"
                  : "border-[#c4c8be] bg-[#fbf9f5] hover:bg-[#f5f3f0]"
              }`}
            >
              <UploadCloud
                className="h-6 w-6 text-[#52634c]"
                strokeWidth={1.75}
              />
              <p className="font-inter mt-2 text-sm font-medium text-[#1b1c1a]">
                {uploading
                  ? "Uploading…"
                  : "Drop your logo here or click to upload"}
              </p>
              <p className="font-inter mt-0.5 text-xs text-outline">
                PNG, JPG or SVG — max 2 MB
              </p>
            </div>
            <input
              ref={fileRef}
              type="file"
              accept="image/png,image/jpeg,image/svg+xml"
              className="hidden"
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) handleFile(f);
                e.target.value = "";
              }}
            />
          </div>
        </div>

        {/* Primary color */}
        <div className="mt-6 max-w-md">
          <label className={labelCls}>Primary color</label>
          <div className="flex items-center gap-3">
            <input
              type="color"
              value={safeColor}
              onChange={(e) => setColor(e.target.value)}
              aria-label="Pick primary color"
              className="h-11 w-12 shrink-0 cursor-pointer rounded-lg border border-[#c4c8be] bg-white p-1"
            />
            <input
              className={`${inputCls} max-w-[140px] font-mono`}
              value={color}
              onChange={(e) => setColor(e.target.value)}
              placeholder="#52634c"
            />
            {/* Preview en temps réel */}
            <button
              type="button"
              style={{ backgroundColor: safeColor }}
              className="font-inter rounded-lg px-4 py-2.5 text-sm font-semibold text-white shadow-sm"
            >
              Button preview
            </button>
          </div>
        </div>

        {/* Document prefixes */}
        <div className="mt-6 grid max-w-md grid-cols-2 gap-4">
          <div>
            <label className={labelCls}>Invoice prefix</label>
            <input
              className={inputCls}
              value={invoicePrefix}
              onChange={(e) => setInvoicePrefix(e.target.value)}
              placeholder="FAC"
            />
          </div>
          <div>
            <label className={labelCls}>Quote prefix</label>
            <input
              className={inputCls}
              value={quotePrefix}
              onChange={(e) => setQuotePrefix(e.target.value)}
              placeholder="DEV"
            />
          </div>
        </div>

        {error && (
          <p className="font-inter mt-4 max-w-md rounded-lg bg-error-container px-3 py-2 text-sm text-[#93000a]">
            {error}
          </p>
        )}

        <div className="mt-6 flex items-center gap-3">
          <button
            type="button"
            onClick={save}
            disabled={saving || uploading}
            className="font-inter rounded-lg bg-[#52634c] px-5 py-2.5 text-sm font-semibold text-white transition-all hover:-translate-y-px hover:opacity-95 disabled:opacity-60"
          >
            {saving ? "Saving…" : "Save branding"}
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
