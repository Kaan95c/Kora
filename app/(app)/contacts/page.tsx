"use client";

import { useEffect, useMemo, useState, type KeyboardEvent } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import {
  Search,
  Plus,
  Pencil,
  Trash2,
  ChevronLeft,
  ChevronRight,
  Users,
  X,
} from "lucide-react";

import { StatusBadge } from "@/components/shared/StatusBadge";
import { UsageMeter } from "@/components/shared/UsageMeter";
import { PlanLimitDialog } from "@/components/shared/PlanLimitDialog";
import { useAuth } from "@/lib/hooks/useAuth";
import { useNewDrawerParam } from "@/lib/hooks/useNewDrawerParam";
import { readCache, writeCache, CACHE_KEYS } from "@/lib/hooks/useResourceCache";
import {
  STATUS_CONFIG,
  initials,
  fullName,
  formatDate,
  type ContactStatus,
} from "@/lib/contacts";

// ───────────────────────── Types & constantes ─────────────────────────

type Contact = {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  phone: string | null;
  companyName: string | null;
  status: ContactStatus;
  tags: string[];
  createdAt: string;
  _count: { projects: number; documents: number };
};

const FILTERS: (ContactStatus | "ALL")[] = [
  "ALL",
  "LEAD",
  "PROSPECT",
  "CLIENT",
  "ARCHIVED",
];

const PER_PAGE = 10;

const GRID = "2.4fr 2.2fr 1.4fr 1fr 1.6fr 1.1fr 72px";

// ───────────────────────── Avatar ─────────────────────────

function Avatar({ contact, size = 36 }: { contact: Contact; size?: number }) {
  const cfg = STATUS_CONFIG[contact.status];
  return (
    <span
      className="font-inter flex shrink-0 items-center justify-center rounded-full font-semibold"
      style={{
        width: size,
        height: size,
        backgroundColor: cfg.avatarBg,
        color: cfg.avatarText,
        fontSize: size <= 36 ? 12 : 15,
      }}
    >
      {initials(contact.firstName, contact.lastName)}
    </span>
  );
}

// ───────────────────────── Tags ─────────────────────────

function TagPills({ tags }: { tags: string[] }) {
  if (tags.length === 0) {
    return <span className="font-inter text-sm text-outline">—</span>;
  }
  const shown = tags.slice(0, 2);
  const extra = tags.length - shown.length;
  return (
    <div className="flex flex-wrap items-center gap-1.5">
      {shown.map((t) => (
        <span
          key={t}
          className="font-inter rounded-full bg-[#efeeea] px-2 py-0.5 text-[11px] font-semibold text-[#444841]"
        >
          {t}
        </span>
      ))}
      {extra > 0 && (
        <span className="font-inter text-[11px] font-semibold text-outline">
          +{extra}
        </span>
      )}
    </div>
  );
}

// ───────────────────────── Drawer New Contact ─────────────────────────

function NewContactDrawer({
  open,
  onClose,
  onCreated,
  onLimit,
}: {
  open: boolean;
  onClose: () => void;
  onCreated: () => void;
  onLimit: (message: string) => void;
}) {
  const empty = {
    firstName: "",
    lastName: "",
    email: "",
    phone: "",
    companyName: "",
    status: "LEAD" as ContactStatus,
  };
  const tr = useTranslations("contacts");
  const tc = useTranslations("common");
  const ts = useTranslations("status");
  const [form, setForm] = useState(empty);
  const [tags, setTags] = useState<string[]>([]);
  const [tagInput, setTagInput] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Réinitialise quand on ré-ouvre le drawer.
  useEffect(() => {
    if (open) {
      setForm(empty);
      setTags([]);
      setTagInput("");
      setSaving(false);
      setError(null);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  function update<K extends keyof typeof form>(key: K, value: (typeof form)[K]) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  function addTag() {
    const t = tagInput.trim();
    if (t && !tags.includes(t)) setTags((prev) => [...prev, t]);
    setTagInput("");
  }

  function handleTagKey(e: KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Enter" || e.key === ",") {
      e.preventDefault();
      addTag();
    } else if (e.key === "Backspace" && tagInput === "" && tags.length > 0) {
      setTags((prev) => prev.slice(0, -1));
    }
  }

  async function handleSave() {
    if (!form.firstName.trim() || !form.lastName.trim() || !form.email.trim()) {
      setError(tr("requiredFields"));
      return;
    }
    setSaving(true);
    setError(null);
    try {
      const res = await fetch("/api/contacts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...form, tags }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        if (res.status === 403 && data?.code === "PLAN_LIMIT_REACHED") {
          onLimit(data.error);
          setSaving(false);
          return;
        }
        setError(data.error ?? tr("createFailed"));
        setSaving(false);
        return;
      }
      onCreated();
    } catch {
      setError(tc("networkError"));
      setSaving(false);
    }
  }

  const inputCls =
    "font-inter w-full rounded-lg border border-[#c4c8be] bg-white px-3 py-2.5 text-sm text-[#1b1c1a] outline-none transition-colors placeholder:text-outline focus:border-[#52634c]";
  const labelCls =
    "font-inter mb-1.5 block text-xs font-semibold uppercase tracking-wide text-[#444841]";

  return (
    <div
      className={`fixed inset-0 z-50 ${open ? "" : "pointer-events-none"}`}
      aria-hidden={!open}
    >
      {/* Overlay */}
      <div
        onClick={onClose}
        className={`absolute inset-0 bg-black/30 transition-opacity duration-300 ${
          open ? "opacity-100" : "opacity-0"
        }`}
      />
      {/* Panneau */}
      <aside
        className={`absolute right-0 top-0 flex h-full w-full flex-col bg-white shadow-[-8px_0_40px_rgba(0,0,0,0.12)] transition-transform duration-300 ease-out sm:w-[420px] ${
          open ? "translate-x-0" : "translate-x-full"
        }`}
        style={{ borderTopLeftRadius: 16, borderBottomLeftRadius: 16 }}
      >
        <div className="flex items-center justify-between border-b border-[#efeeea] px-6 py-5">
          <h2 className="font-manrope text-xl font-semibold text-[#1b1c1a]">
            {tr("drawerTitle")}
          </h2>
          <button
            type="button"
            onClick={onClose}
            aria-label={tc("close")}
            className="flex h-8 w-8 items-center justify-center rounded-full text-[#444841] transition-colors hover:bg-[#f5f3f0]"
          >
            <X className="h-5 w-5" strokeWidth={1.75} />
          </button>
        </div>

        <div className="flex-1 space-y-4 overflow-y-auto px-6 py-6">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={labelCls}>{tr("firstName")}</label>
              <input
                className={inputCls}
                value={form.firstName}
                onChange={(e) => update("firstName", e.target.value)}
                placeholder="Elena"
              />
            </div>
            <div>
              <label className={labelCls}>{tr("lastName")}</label>
              <input
                className={inputCls}
                value={form.lastName}
                onChange={(e) => update("lastName", e.target.value)}
                placeholder="Vance"
              />
            </div>
          </div>

          <div>
            <label className={labelCls}>{tr("email")}</label>
            <input
              type="email"
              className={inputCls}
              value={form.email}
              onChange={(e) => update("email", e.target.value)}
              placeholder="elena@studio.com"
            />
          </div>

          <div>
            <label className={labelCls}>{tr("phone")}</label>
            <input
              className={inputCls}
              value={form.phone}
              onChange={(e) => update("phone", e.target.value)}
              placeholder="+33 6 12 34 56 78"
            />
          </div>

          <div>
            <label className={labelCls}>{tr("company")}</label>
            <input
              className={inputCls}
              value={form.companyName}
              onChange={(e) => update("companyName", e.target.value)}
              placeholder="Velvet Rose"
            />
          </div>

          <div>
            <label className={labelCls}>{tr("statusLabel")}</label>
            <select
              className={inputCls}
              value={form.status}
              onChange={(e) =>
                update("status", e.target.value as ContactStatus)
              }
            >
              <option value="LEAD">{ts("contact.LEAD")}</option>
              <option value="PROSPECT">{ts("contact.PROSPECT")}</option>
              <option value="CLIENT">{ts("contact.CLIENT")}</option>
              <option value="ARCHIVED">{ts("contact.ARCHIVED")}</option>
            </select>
          </div>

          <div>
            <label className={labelCls}>{tr("tags")}</label>
            <div className="flex flex-wrap items-center gap-1.5 rounded-lg border border-[#c4c8be] bg-white px-2.5 py-2 focus-within:border-[#52634c]">
              {tags.map((t) => (
                <span
                  key={t}
                  className="font-inter flex items-center gap-1 rounded-full bg-[#efeeea] px-2 py-0.5 text-[11px] font-semibold text-[#444841]"
                >
                  {t}
                  <button
                    type="button"
                    onClick={() =>
                      setTags((prev) => prev.filter((x) => x !== t))
                    }
                    aria-label={`Remove ${t}`}
                    className="text-outline hover:text-[#1b1c1a]"
                  >
                    <X className="h-3 w-3" strokeWidth={2.5} />
                  </button>
                </span>
              ))}
              <input
                className="font-inter min-w-[80px] flex-1 bg-transparent text-sm text-[#1b1c1a] outline-none placeholder:text-outline"
                value={tagInput}
                onChange={(e) => setTagInput(e.target.value)}
                onKeyDown={handleTagKey}
                onBlur={addTag}
                placeholder={tags.length === 0 ? tr("tagsPlaceholder") : ""}
              />
            </div>
          </div>

          {error && (
            <p className="font-inter rounded-lg bg-error-container px-3 py-2 text-sm text-[#93000a]">
              {error}
            </p>
          )}
        </div>

        <div className="flex items-center justify-end gap-3 border-t border-[#efeeea] px-6 py-4">
          <button
            type="button"
            onClick={onClose}
            className="font-inter rounded-lg px-4 py-2.5 text-sm font-medium text-[#444841] transition-colors hover:bg-[#f5f3f0]"
          >
            {tc("cancel")}
          </button>
          <button
            type="button"
            onClick={handleSave}
            disabled={saving}
            className="font-inter rounded-lg bg-[#52634c] px-5 py-2.5 text-sm font-semibold text-white transition-all hover:-translate-y-px hover:opacity-95 disabled:opacity-60"
          >
            {saving ? tc("saving") : tc("save")}
          </button>
        </div>
      </aside>
    </div>
  );
}

// ───────────────────────── Page ─────────────────────────

export default function ContactsPage() {
  const router = useRouter();
  // Cache client : affiche d'office la dernière liste connue, revalidée au mount.
  const [contacts, setContacts] = useState<Contact[] | null>(
    () => readCache<Contact[]>(CACHE_KEYS.contacts) ?? null
  );
  const [filter, setFilter] = useState<ContactStatus | "ALL">("ALL");
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [limitMsg, setLimitMsg] = useState<string | null>(null);
  const { limits } = useAuth();
  const t = useTranslations("contacts");
  const tc = useTranslations("common");
  const ts = useTranslations("status");

  // Quick Action (Sidebar) → /contacts?new=1 ouvre le drawer.
  useNewDrawerParam(() => setDrawerOpen(true));

  async function loadContacts() {
    try {
      const res = await fetch("/api/contacts");
      const data = await res.json();
      const list: Contact[] = Array.isArray(data) ? data : [];
      writeCache(CACHE_KEYS.contacts, list);
      setContacts(list);
    } catch {
      // Échec de revalidation : on garde la donnée en cache plutôt que de vider.
      setContacts((prev) => prev ?? []);
    }
  }

  useEffect(() => {
    loadContacts();
  }, []);

  const visible = useMemo(() => {
    const list = contacts ?? [];
    const q = search.trim().toLowerCase();
    return list.filter((c) => {
      if (filter !== "ALL" && c.status !== filter) return false;
      if (!q) return true;
      return (
        fullName(c.firstName, c.lastName).toLowerCase().includes(q) ||
        c.email.toLowerCase().includes(q)
      );
    });
  }, [contacts, filter, search]);

  const totalPages = Math.max(1, Math.ceil(visible.length / PER_PAGE));
  const safePage = Math.min(page, totalPages);
  const pageItems = visible.slice(
    (safePage - 1) * PER_PAGE,
    safePage * PER_PAGE
  );
  const from = visible.length === 0 ? 0 : (safePage - 1) * PER_PAGE + 1;
  const to = Math.min(safePage * PER_PAGE, visible.length);

  function changeFilter(value: ContactStatus | "ALL") {
    setFilter(value);
    setPage(1);
  }

  function changeSearch(value: string) {
    setSearch(value);
    setPage(1);
  }

  async function handleArchive(id: string) {
    if (!window.confirm(t("archiveConfirm"))) return;
    // Optimiste : passe en ARCHIVED localement (+ miroir cache pour le retour).
    setContacts((prev) => {
      if (!prev) return prev;
      const next = prev.map((c) =>
        c.id === id ? { ...c, status: "ARCHIVED" as ContactStatus } : c
      );
      writeCache(CACHE_KEYS.contacts, next);
      return next;
    });
    const res = await fetch(`/api/contacts/${id}`, { method: "DELETE" });
    if (!res.ok) await loadContacts();
  }

  // ─── Skeleton ───
  if (contacts === null) {
    return (
      <div className="animate-pulse">
        <div className="mb-6 flex items-start justify-between">
          <div className="space-y-2">
            <div className="h-9 w-48 rounded-xl bg-[#efeeea]" />
            <div className="h-4 w-72 rounded-lg bg-[#efeeea]" />
          </div>
          <div className="h-10 w-36 rounded-lg bg-[#efeeea]" />
        </div>
        <div className="mb-6 flex gap-2">
          {[0, 1, 2, 3, 4].map((i) => (
            <div key={i} className="h-8 w-20 rounded-full bg-[#efeeea]" />
          ))}
        </div>
        <div className="h-96 rounded-2xl bg-[#efeeea]" />
      </div>
    );
  }

  const total = contacts.length;

  return (
    <div>
      {/* Header */}
      <div className="mb-6 flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
        <div>
          <h1 className="font-manrope text-[32px] font-semibold tracking-[-0.01em] text-on-surface">
            {t("title")}
          </h1>
          <p className="font-manrope mt-1 text-base font-normal text-on-surface-variant">
            {t("subtitle", { count: total })}
          </p>
        </div>
        <button
          type="button"
          onClick={() => setDrawerOpen(true)}
          className="font-inter flex items-center gap-2 rounded-lg bg-[#52634c] px-4 py-2.5 text-sm font-semibold text-white transition-all hover:-translate-y-px hover:opacity-95"
        >
          <Plus className="h-4 w-4" strokeWidth={2.5} />
          {t("newContact")}
        </button>
      </div>

      {/* Recherche + filtres */}
      <div className="mb-5 flex flex-wrap items-center justify-between gap-4">
        <div className="flex flex-wrap gap-2">
          {FILTERS.map((f) => (
            <button
              key={f}
              type="button"
              onClick={() => changeFilter(f)}
              className={`font-inter rounded-full px-4 py-1.5 text-sm font-medium transition-colors ${
                filter === f
                  ? "bg-[#52634c] text-white"
                  : "border border-[#c4c8be] bg-[#efeeea] text-[#444841] hover:bg-[#e6e4df]"
              }`}
            >
              {f === "ALL" ? ts("all") : ts(`contact.${f}`)}
            </button>
          ))}
        </div>
        <div className="relative w-full max-w-xs">
          <Search
            className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-outline"
            strokeWidth={1.75}
          />
          <input
            value={search}
            onChange={(e) => changeSearch(e.target.value)}
            placeholder={t("searchPlaceholder")}
            className="font-inter w-full rounded-lg border border-[#c4c8be] bg-white py-2.5 pl-9 pr-3 text-sm text-[#1b1c1a] outline-none transition-colors placeholder:text-outline focus:border-[#52634c]"
          />
        </div>
      </div>

      {/* Tableau */}
      <div className="overflow-x-auto rounded-2xl bg-white shadow-card">
        {/* En-tête colonnes */}
        <div
          className="grid min-w-[860px] items-center gap-4 border-b border-[#c4c8be]/50 px-6 py-3"
          style={{ gridTemplateColumns: GRID }}
        >
          {[
            t("colName"),
            t("colEmail"),
            t("colPhone"),
            t("colStatus"),
            t("colTags"),
            t("colAdded"),
            "",
          ].map((h, i) => (
              <span
                key={i}
                className="font-inter text-[11px] font-semibold uppercase tracking-wide text-[#444841]"
              >
                {h}
              </span>
            )
          )}
        </div>

        {/* Lignes */}
        {pageItems.map((c) => (
          <div
            key={c.id}
            onClick={() => router.push(`/contacts/${c.id}`)}
            className="group grid min-w-[860px] cursor-pointer items-center gap-4 border-b border-[#f5f3f0] px-6 py-3.5 transition-colors last:border-b-0 hover:bg-[#f5f3f0]"
            style={{ gridTemplateColumns: GRID }}
          >
            {/* Nom + avatar */}
            <div className="flex min-w-0 items-center gap-3">
              <Avatar contact={c} />
              <div className="min-w-0">
                <p className="font-manrope truncate text-sm font-semibold text-[#1b1c1a]">
                  {fullName(c.firstName, c.lastName)}
                </p>
                {c.companyName && (
                  <p className="font-inter truncate text-xs text-outline">
                    {c.companyName}
                  </p>
                )}
              </div>
            </div>
            {/* Email */}
            <span className="font-inter truncate text-sm text-[#444841]">
              {c.email}
            </span>
            {/* Téléphone */}
            <span className="font-inter truncate text-sm text-[#444841]">
              {c.phone ?? "—"}
            </span>
            {/* Statut */}
            <div>
              <StatusBadge
                status={ts(`contact.${c.status}`)}
                variant={STATUS_CONFIG[c.status].variant}
              />
            </div>
            {/* Tags */}
            <TagPills tags={c.tags} />
            {/* Date */}
            <span className="font-inter text-[13px] text-[#444841]">
              {formatDate(c.createdAt)}
            </span>
            {/* Actions */}
            <div className="flex items-center justify-end gap-1 opacity-0 transition-opacity group-hover:opacity-100">
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  router.push(`/contacts/${c.id}`);
                }}
                aria-label={t("editContact")}
                className="flex h-8 w-8 items-center justify-center rounded-full text-[#444841] transition-colors hover:bg-[#efeeea]"
              >
                <Pencil className="h-4 w-4" strokeWidth={1.75} />
              </button>
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  handleArchive(c.id);
                }}
                aria-label={t("archiveContact")}
                className="flex h-8 w-8 items-center justify-center rounded-full text-[#444841] transition-colors hover:bg-error-container hover:text-[#93000a]"
              >
                <Trash2 className="h-4 w-4" strokeWidth={1.75} />
              </button>
            </div>
          </div>
        ))}

        {/* Empty state */}
        {pageItems.length === 0 && (
          <div className="flex flex-col items-center justify-center py-20">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[#efeeea]">
              <Users className="h-6 w-6 text-outline" strokeWidth={1.5} />
            </div>
            <p className="font-manrope mt-4 text-base font-semibold text-[#1b1c1a]">
              {t("noContacts")}
            </p>
            <p className="font-inter mt-1 text-sm text-[#444841]">
              {search || filter !== "ALL"
                ? t("emptyFiltered")
                : t("emptyDefault")}
            </p>
          </div>
        )}
      </div>

      {/* Pagination */}
      {visible.length > 0 && (
        <div className="mt-4 flex items-center justify-between">
          <span className="font-inter text-[13px] text-[#444841]">
            {t("showing", { from, to, total: visible.length })}
          </span>
          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={safePage === 1}
              aria-label={tc("previous")}
              className="flex h-8 w-8 items-center justify-center rounded-full text-[#444841] transition-colors hover:bg-[#efeeea] disabled:opacity-40"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
            {Array.from({ length: totalPages }, (_, i) => i + 1).map((n) => (
              <button
                key={n}
                type="button"
                onClick={() => setPage(n)}
                className={`flex h-8 w-8 items-center justify-center rounded-full font-inter text-sm transition-colors ${
                  n === safePage
                    ? "bg-[#1b1c1a] text-white"
                    : "text-[#444841] hover:bg-[#efeeea]"
                }`}
              >
                {n}
              </button>
            ))}
            <button
              type="button"
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              disabled={safePage === totalPages}
              aria-label={tc("next")}
              className="flex h-8 w-8 items-center justify-center rounded-full text-[#444841] transition-colors hover:bg-[#efeeea] disabled:opacity-40"
            >
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>
        </div>
      )}

      {/* Compteur d'usage (contacts hors archivés) */}
      <UsageMeter
        label={t("usageLabel")}
        current={contacts.filter((c) => c.status !== "ARCHIVED").length}
        max={limits ? limits.contacts : undefined}
      />

      {/* Drawer */}
      <NewContactDrawer
        open={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        onCreated={() => {
          setDrawerOpen(false);
          loadContacts();
        }}
        onLimit={(msg) => {
          setDrawerOpen(false);
          setLimitMsg(msg);
        }}
      />

      {/* Modal limite de plan */}
      <PlanLimitDialog message={limitMsg} onClose={() => setLimitMsg(null)} />
    </div>
  );
}
