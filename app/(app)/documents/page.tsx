"use client";

import {
  useEffect,
  useMemo,
  useState,
  type MouseEvent,
  type ReactNode,
} from "react";
import { useTranslations } from "next-intl";
import {
  Plus,
  Search,
  Download,
  Trash2,
  MoreHorizontal,
  Send,
  FileSignature,
  CircleDollarSign,
  FileText,
  FileClock,
  FileEdit,
  ChevronLeft,
  ChevronRight,
  Link2,
  X,
} from "lucide-react";

import { StatusBadge } from "@/components/shared/StatusBadge";
import { UsageMeter } from "@/components/shared/UsageMeter";
import { PlanLimitDialog } from "@/components/shared/PlanLimitDialog";
import { useAuth } from "@/lib/hooks/useAuth";
import { useNewDrawerParam } from "@/lib/hooks/useNewDrawerParam";
import {
  TYPE_CONFIG,
  STATUS_CONFIG,
  DOCUMENT_TYPES,
  DOCUMENT_STATUSES,
  money,
  formatDate,
  type DocumentType,
  type DocumentStatus,
} from "@/lib/documents";

// ───────────────────────── Types ─────────────────────────

type Doc = {
  id: string;
  title: string;
  number: string | null;
  type: DocumentType;
  status: DocumentStatus;
  total: number | null;
  signedAt: string | null;
  createdAt: string;
  contactId: string | null;
  projectId: string | null;
  contact: { firstName: string; lastName: string } | null;
  project: { name: string } | null;
};

type Option = { id: string; label: string };

const PER_PAGE = 10;
const GRID = "2.2fr 0.9fr 1.3fr 1.3fr 0.9fr 0.9fr 1fr 44px";

const TYPE_FILTERS: { key: string; value: DocumentType | "ALL" }[] = [
  { key: "typeAll", value: "ALL" },
  { key: "typeInvoices", value: "INVOICE" },
  { key: "typeQuotes", value: "QUOTE" },
  { key: "typeContracts", value: "CONTRACT" },
  { key: "typeProposals", value: "PROPOSAL" },
];

function clientName(d: Doc) {
  return d.contact ? `${d.contact.firstName} ${d.contact.lastName}` : "—";
}

// ───────────────────────── Carte stat ─────────────────────────

function StatCard({
  label,
  value,
  icon,
  tile,
}: {
  label: string;
  value: string;
  icon: ReactNode;
  tile: string;
}) {
  return (
    <div className="rounded-2xl bg-white p-5 shadow-card">
      <div className="flex items-center justify-between">
        <p className="font-inter text-xs font-semibold uppercase tracking-wide text-[#444841]">
          {label}
        </p>
        <span
          className="flex h-8 w-8 items-center justify-center rounded-lg"
          style={{ backgroundColor: tile }}
        >
          {icon}
        </span>
      </div>
      <p className="font-manrope mt-3 text-[28px] font-bold leading-none text-[#1b1c1a]">
        {value}
      </p>
    </div>
  );
}

// ───────────────────────── Drawer New Document ─────────────────────────

function NewDocumentDrawer({
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
    title: "",
    type: "INVOICE" as DocumentType,
    number: "",
    total: "",
    status: "DRAFT" as DocumentStatus,
    contactId: "",
    projectId: "",
  };
  const td = useTranslations("documents");
  const tc = useTranslations("common");
  const ts = useTranslations("status");
  const [form, setForm] = useState(empty);
  const [contacts, setContacts] = useState<Option[]>([]);
  const [projects, setProjects] = useState<Option[]>([]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    setForm(empty);
    setSaving(false);
    setError(null);
    // Charge les sélecteurs (contacts + projets) à l'ouverture.
    fetch("/api/contacts")
      .then((r) => r.json())
      .then((data: { id: string; firstName: string; lastName: string }[]) =>
        setContacts(
          Array.isArray(data)
            ? data.map((c) => ({
                id: c.id,
                label: `${c.firstName} ${c.lastName}`,
              }))
            : []
        )
      )
      .catch(() => setContacts([]));
    fetch("/api/projects")
      .then((r) => r.json())
      .then((data: { id: string; name: string }[]) =>
        setProjects(
          Array.isArray(data)
            ? data.map((p) => ({ id: p.id, label: p.name }))
            : []
        )
      )
      .catch(() => setProjects([]));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  function update<K extends keyof typeof form>(key: K, value: (typeof form)[K]) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  async function handleSave() {
    if (!form.title.trim()) {
      setError(td("titleRequired"));
      return;
    }
    setSaving(true);
    setError(null);
    try {
      const res = await fetch("/api/documents", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: form.title,
          type: form.type,
          number: form.number,
          total: form.total,
          status: form.status,
          contactId: form.contactId || null,
          projectId: form.projectId || null,
        }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        if (res.status === 403 && data?.code === "PLAN_LIMIT_REACHED") {
          onLimit(data.error);
          setSaving(false);
          return;
        }
        setError(data.error ?? td("createFailed"));
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

  const numberPlaceholder =
    form.type === "INVOICE"
      ? "FAC-2025-005"
      : form.type === "QUOTE"
      ? "DEV-2025-005"
      : td("numberOptional");

  return (
    <div
      className={`fixed inset-0 z-50 ${open ? "" : "pointer-events-none"}`}
      aria-hidden={!open}
    >
      <div
        onClick={onClose}
        className={`absolute inset-0 bg-black/30 transition-opacity duration-300 ${
          open ? "opacity-100" : "opacity-0"
        }`}
      />
      <aside
        className={`absolute right-0 top-0 flex h-full w-full flex-col bg-white shadow-[-8px_0_40px_rgba(0,0,0,0.12)] transition-transform duration-300 ease-out sm:w-[460px] ${
          open ? "translate-x-0" : "translate-x-full"
        }`}
        style={{ borderTopLeftRadius: 16, borderBottomLeftRadius: 16 }}
      >
        <div className="flex items-center justify-between border-b border-[#efeeea] px-6 py-5">
          <h2 className="font-manrope text-xl font-semibold text-[#1b1c1a]">
            {td("drawerTitle")}
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
          <div>
            <label className={labelCls}>{td("docTitle")}</label>
            <input
              className={inputCls}
              value={form.title}
              onChange={(e) => update("title", e.target.value)}
              placeholder={td("titlePlaceholder")}
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={labelCls}>{td("type")}</label>
              <select
                className={inputCls}
                value={form.type}
                onChange={(e) =>
                  update("type", e.target.value as DocumentType)
                }
              >
                {DOCUMENT_TYPES.map((dt) => (
                  <option key={dt} value={dt}>
                    {td(`docTypeLabel.${dt}`)}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className={labelCls}>{td("number")}</label>
              <input
                className={inputCls}
                value={form.number}
                onChange={(e) => update("number", e.target.value)}
                placeholder={numberPlaceholder}
              />
            </div>
          </div>

          <div>
            <label className={labelCls}>{td("client")}</label>
            <select
              className={inputCls}
              value={form.contactId}
              onChange={(e) => update("contactId", e.target.value)}
            >
              <option value="">{td("noClientOption")}</option>
              {contacts.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.label}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className={labelCls}>{td("project")}</label>
            <select
              className={inputCls}
              value={form.projectId}
              onChange={(e) => update("projectId", e.target.value)}
            >
              <option value="">{td("noProjectOption")}</option>
              {projects.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.label}
                </option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={labelCls}>{td("amount")}</label>
              <input
                type="number"
                min="0"
                step="0.01"
                className={inputCls}
                value={form.total}
                onChange={(e) => update("total", e.target.value)}
                placeholder="2450"
              />
            </div>
            <div>
              <label className={labelCls}>{td("status")}</label>
              <select
                className={inputCls}
                value={form.status}
                onChange={(e) =>
                  update("status", e.target.value as DocumentStatus)
                }
              >
                {DOCUMENT_STATUSES.map((s) => (
                  <option key={s} value={s}>
                    {ts(`document.${s}`)}
                  </option>
                ))}
              </select>
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

export default function DocumentsPage() {
  const [docs, setDocs] = useState<Doc[] | null>(null);
  const [typeFilter, setTypeFilter] = useState<DocumentType | "ALL">("ALL");
  const [statusFilter, setStatusFilter] = useState<DocumentStatus | "ALL">(
    "ALL"
  );
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [limitMsg, setLimitMsg] = useState<string | null>(null);
  const { limits } = useAuth();
  const td = useTranslations("documents");
  const tc = useTranslations("common");
  const ts = useTranslations("status");

  // Quick Action (Sidebar) → /documents?new=1 ouvre le drawer.
  useNewDrawerParam(() => setDrawerOpen(true));
  const [menu, setMenu] = useState<{ id: string; x: number; y: number } | null>(
    null
  );
  const [payLink, setPayLink] = useState<string | null>(null);
  const [linkLoading, setLinkLoading] = useState(false);
  const [copied, setCopied] = useState(false);

  async function loadDocs() {
    try {
      const res = await fetch("/api/documents");
      const data = await res.json();
      setDocs(Array.isArray(data) ? data : []);
    } catch {
      setDocs([]);
    }
  }

  useEffect(() => {
    loadDocs();
  }, []);

  // ─── Stats (sur l'ensemble, pas la vue filtrée) ───
  const stats = useMemo(() => {
    const list = docs ?? [];
    let totalValue = 0;
    let paid = 0;
    let awaiting = 0;
    let drafts = 0;
    for (const d of list) {
      const t = d.total ?? 0;
      totalValue += t;
      if (d.status === "PAID") paid += t;
      if (d.status === "SENT" || d.status === "SIGNED") awaiting += t;
      if (d.status === "DRAFT") drafts += 1;
    }
    return { totalValue, paid, awaiting, drafts };
  }, [docs]);

  // ─── Filtrage ───
  const visible = useMemo(() => {
    const list = docs ?? [];
    const q = search.trim().toLowerCase();
    return list.filter((d) => {
      if (typeFilter !== "ALL" && d.type !== typeFilter) return false;
      if (statusFilter !== "ALL" && d.status !== statusFilter) return false;
      if (!q) return true;
      return (
        d.title.toLowerCase().includes(q) ||
        (d.number ?? "").toLowerCase().includes(q)
      );
    });
  }, [docs, typeFilter, statusFilter, search]);

  const totalPages = Math.max(1, Math.ceil(visible.length / PER_PAGE));
  const safePage = Math.min(page, totalPages);
  const pageItems = visible.slice(
    (safePage - 1) * PER_PAGE,
    safePage * PER_PAGE
  );
  const from = visible.length === 0 ? 0 : (safePage - 1) * PER_PAGE + 1;
  const to = Math.min(safePage * PER_PAGE, visible.length);

  function resetPage<T>(setter: (v: T) => void, value: T) {
    setter(value);
    setPage(1);
  }

  // ─── Mutations ───
  async function patchStatus(id: string, status: DocumentStatus) {
    setMenu(null);
    setDocs((prev) =>
      prev ? prev.map((d) => (d.id === id ? { ...d, status } : d)) : prev
    );
    const res = await fetch(`/api/documents/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status }),
    });
    if (!res.ok) await loadDocs();
  }

  async function handleDelete(id: string) {
    setMenu(null);
    if (!window.confirm(td("deleteConfirm"))) return;
    setDocs((prev) => (prev ? prev.filter((d) => d.id !== id) : prev));
    const res = await fetch(`/api/documents/${id}`, { method: "DELETE" });
    if (!res.ok) await loadDocs();
  }

  async function sendPaymentLink(id: string) {
    setMenu(null);
    setLinkLoading(true);
    setCopied(false);
    try {
      const res = await fetch("/api/payments/create-intent", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ documentId: id }),
      });
      const data = await res.json().catch(() => ({}));
      if (res.ok && data.url) setPayLink(data.url);
      else window.alert(data.error ?? td("linkFailed"));
    } catch {
      window.alert(tc("networkError"));
    } finally {
      setLinkLoading(false);
    }
  }

  function downloadPdf(id: string) {
    setMenu(null);
    const a = document.createElement("a");
    a.href = `/api/documents/${id}/pdf`;
    a.rel = "noopener";
    document.body.appendChild(a);
    a.click();
    a.remove();
  }

  function openMenu(e: MouseEvent<HTMLButtonElement>, id: string) {
    e.stopPropagation();
    const r = e.currentTarget.getBoundingClientRect();
    setMenu((m) => (m?.id === id ? null : { id, x: r.right, y: r.bottom }));
  }

  // ─── Skeleton ───
  if (docs === null) {
    return (
      <div className="animate-pulse">
        <div className="mb-6 flex items-start justify-between">
          <div className="space-y-2">
            <div className="h-9 w-52 rounded-xl bg-[#efeeea]" />
            <div className="h-4 w-80 rounded-lg bg-[#efeeea]" />
          </div>
          <div className="h-10 w-40 rounded-lg bg-[#efeeea]" />
        </div>
        <div className="mb-6 grid grid-cols-2 gap-4 md:grid-cols-4">
          {[0, 1, 2, 3].map((i) => (
            <div key={i} className="h-24 rounded-2xl bg-[#efeeea]" />
          ))}
        </div>
        <div className="h-96 rounded-2xl bg-[#efeeea]" />
      </div>
    );
  }

  const menuDoc = menu ? docs.find((d) => d.id === menu.id) ?? null : null;

  return (
    <div>
      {/* Header */}
      <div className="mb-6 flex items-start justify-between gap-4">
        <div>
          <h1 className="font-manrope text-[32px] font-semibold tracking-[-0.01em] text-on-surface">
            {td("title")}
          </h1>
          <p className="font-manrope mt-1 text-base font-normal text-on-surface-variant">
            {td("subtitle")}
          </p>
        </div>
        <button
          type="button"
          onClick={() => setDrawerOpen(true)}
          className="font-inter flex items-center gap-2 rounded-lg bg-[#52634c] px-4 py-2.5 text-sm font-semibold text-white transition-all hover:-translate-y-px hover:opacity-95"
        >
          <Plus className="h-4 w-4" strokeWidth={2.5} />
          {td("newDocument")}
        </button>
      </div>

      {/* Stats */}
      <div className="mb-6 grid grid-cols-2 gap-4 md:grid-cols-4">
        <StatCard
          label={td("statTotalValue")}
          value={money(stats.totalValue)}
          tile="#efeeea"
          icon={<FileText className="h-4 w-4 text-[#52634c]" strokeWidth={1.75} />}
        />
        <StatCard
          label={td("statPaid")}
          value={money(stats.paid)}
          tile="#d5e8cb"
          icon={
            <CircleDollarSign
              className="h-4 w-4 text-[#3b4b36]"
              strokeWidth={1.75}
            />
          }
        />
        <StatCard
          label={td("statAwaiting")}
          value={money(stats.awaiting)}
          tile="#f8dac5"
          icon={<FileClock className="h-4 w-4 text-[#574333]" strokeWidth={1.75} />}
        />
        <StatCard
          label={td("statDrafts")}
          value={String(stats.drafts)}
          tile="#ece3d9"
          icon={<FileEdit className="h-4 w-4 text-[#705a4a]" strokeWidth={1.75} />}
        />
      </div>

      {/* Toolbar */}
      <div className="mb-5 flex flex-wrap items-center justify-between gap-4">
        <div className="flex flex-wrap gap-2">
          {TYPE_FILTERS.map((f) => (
            <button
              key={f.value}
              type="button"
              onClick={() => resetPage(setTypeFilter, f.value)}
              className={`font-inter rounded-full px-4 py-1.5 text-sm font-medium transition-colors ${
                typeFilter === f.value
                  ? "bg-[#52634c] text-white"
                  : "border border-[#c4c8be] bg-[#efeeea] text-[#444841] hover:bg-[#e6e4df]"
              }`}
            >
              {td(f.key)}
            </button>
          ))}
        </div>
        <div className="flex items-center gap-3">
          <select
            value={statusFilter}
            onChange={(e) =>
              resetPage(
                setStatusFilter,
                e.target.value as DocumentStatus | "ALL"
              )
            }
            className="font-inter rounded-lg border border-[#c4c8be] bg-white px-3 py-2.5 text-sm text-[#444841] outline-none transition-colors focus:border-[#52634c]"
          >
            <option value="ALL">{td("allStatuses")}</option>
            {DOCUMENT_STATUSES.map((s) => (
              <option key={s} value={s}>
                {ts(`document.${s}`)}
              </option>
            ))}
          </select>
          <div className="relative w-full max-w-[240px]">
            <Search
              className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-outline"
              strokeWidth={1.75}
            />
            <input
              value={search}
              onChange={(e) => resetPage(setSearch, e.target.value)}
              placeholder={td("searchPlaceholder")}
              className="font-inter w-full rounded-lg border border-[#c4c8be] bg-white py-2.5 pl-9 pr-3 text-sm text-[#1b1c1a] outline-none transition-colors placeholder:text-outline focus:border-[#52634c]"
            />
          </div>
        </div>
      </div>

      {/* Table */}
      <div className="overflow-x-auto rounded-2xl bg-white shadow-card">
        {/* Header colonnes */}
        <div
          className="grid min-w-[1040px] items-center gap-4 border-b border-[#c4c8be]/50 px-6 py-3"
          style={{ gridTemplateColumns: GRID }}
        >
          {[
            td("colDocument"),
            td("colType"),
            td("colClient"),
            td("colProject"),
            td("colAmount"),
            td("colStatus"),
            td("colDate"),
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
        {pageItems.map((d) => {
          const t = TYPE_CONFIG[d.type];
          const st = STATUS_CONFIG[d.status];
          const Icon = t.icon;
          return (
            <div
              key={d.id}
              className="group grid min-w-[1040px] items-center gap-4 border-b border-[#f5f3f0] px-6 py-3.5 transition-colors last:border-b-0 hover:bg-[#f5f3f0]"
              style={{ gridTemplateColumns: GRID }}
            >
              {/* Document */}
              <div className="flex min-w-0 items-center gap-3">
                <span
                  className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg"
                  style={{ backgroundColor: t.tile }}
                >
                  <Icon className="h-4 w-4 text-[#52634c]" strokeWidth={1.75} />
                </span>
                <div className="min-w-0">
                  <p className="font-manrope truncate text-sm font-semibold text-[#1b1c1a]">
                    {d.title}
                  </p>
                  {d.number && (
                    <p className="font-inter truncate text-xs text-outline">
                      {d.number}
                    </p>
                  )}
                </div>
              </div>
              {/* Type */}
              <span className="font-inter text-sm text-[#444841]">
                {td(`docTypeLabel.${d.type}`)}
              </span>
              {/* Client */}
              <span className="font-inter truncate text-sm text-[#444841]">
                {clientName(d)}
              </span>
              {/* Project */}
              <span className="font-inter truncate text-sm text-[#444841]">
                {d.project?.name ?? "—"}
              </span>
              {/* Amount */}
              <span className="font-manrope text-sm font-semibold text-[#1b1c1a]">
                {d.total != null ? money(d.total) : "—"}
              </span>
              {/* Status */}
              <div>
                <StatusBadge status={ts(`document.${d.status}`)} variant={st.variant} />
              </div>
              {/* Date */}
              <span className="font-inter text-[13px] text-[#444841]">
                {formatDate(d.createdAt)}
              </span>
              {/* Actions */}
              <div className="flex justify-end">
                <button
                  type="button"
                  onClick={(e) => openMenu(e, d.id)}
                  aria-label={td("documentActions")}
                  className={`flex h-8 w-8 items-center justify-center rounded-full text-[#444841] transition-all hover:bg-[#efeeea] ${
                    menu?.id === d.id
                      ? "bg-[#efeeea] opacity-100"
                      : "opacity-0 group-hover:opacity-100"
                  }`}
                >
                  <MoreHorizontal className="h-4 w-4" strokeWidth={2} />
                </button>
              </div>
            </div>
          );
        })}

        {/* Empty state */}
        {pageItems.length === 0 && (
          <div className="flex flex-col items-center justify-center py-20">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[#efeeea]">
              <FileText className="h-6 w-6 text-outline" strokeWidth={1.5} />
            </div>
            <p className="font-manrope mt-4 text-base font-semibold text-[#1b1c1a]">
              {td("noDocuments")}
            </p>
            <p className="font-inter mt-1 text-sm text-[#444841]">
              {search || typeFilter !== "ALL" || statusFilter !== "ALL"
                ? td("emptyFiltered")
                : td("emptyDefault")}
            </p>
          </div>
        )}
      </div>

      {/* Pagination */}
      {visible.length > 0 && (
        <div className="mt-4 flex items-center justify-between">
          <span className="font-inter text-[13px] text-[#444841]">
            {td("showing", { from, to, total: visible.length })}
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

      {/* Menu d'actions (popover fixe — évite le clipping de la table) */}
      {menu && menuDoc && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setMenu(null)} />
          <div
            className="fixed z-50 w-52 rounded-xl border border-[#c4c8be]/60 bg-white p-1.5 shadow-modal"
            style={{ top: menu.y + 6, left: menu.x - 208 }}
          >
            {(["SENT", "SIGNED", "PAID"] as DocumentStatus[])
              .filter((s) => s !== menuDoc.status)
              .map((s) => {
                const ItemIcon =
                  s === "SENT"
                    ? Send
                    : s === "SIGNED"
                    ? FileSignature
                    : CircleDollarSign;
                return (
                  <button
                    key={s}
                    type="button"
                    onClick={() => patchStatus(menuDoc.id, s)}
                    className="font-inter flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-left text-sm text-[#1b1c1a] transition-colors hover:bg-[#f5f3f0]"
                  >
                    <ItemIcon
                      className="h-4 w-4 text-[#52634c]"
                      strokeWidth={1.75}
                    />
                    {td("markAs", { status: ts(`document.${s}`) })}
                  </button>
                );
              })}

            {menuDoc.type === "INVOICE" && menuDoc.status !== "PAID" && (
              <>
                <div className="my-1 border-t border-[#efeeea]" />
                <button
                  type="button"
                  onClick={() => sendPaymentLink(menuDoc.id)}
                  className="font-inter flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-left text-sm text-[#1b1c1a] transition-colors hover:bg-[#f5f3f0]"
                >
                  <Link2 className="h-4 w-4 text-[#52634c]" strokeWidth={1.75} />
                  {td("sendPaymentLink")}
                </button>
              </>
            )}

            <div className="my-1 border-t border-[#efeeea]" />

            <button
              type="button"
              onClick={() => downloadPdf(menuDoc.id)}
              className="font-inter flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-left text-sm text-[#1b1c1a] transition-colors hover:bg-[#f5f3f0]"
            >
              <Download className="h-4 w-4 text-[#52634c]" strokeWidth={1.75} />
              {td("downloadPdf")}
            </button>

            <div className="my-1 border-t border-[#efeeea]" />

            <button
              type="button"
              onClick={() => handleDelete(menuDoc.id)}
              className="font-inter flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-left text-sm text-[#ba1a1a] transition-colors hover:bg-error-container"
            >
              <Trash2 className="h-4 w-4" strokeWidth={1.75} />
              {tc("delete")}
            </button>
          </div>
        </>
      )}

      {/* Compteur d'usage */}
      <UsageMeter
        label={td("usageLabel")}
        current={docs.length}
        max={limits ? limits.documents : undefined}
      />

      {/* Drawer */}
      <NewDocumentDrawer
        open={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        onCreated={() => {
          setDrawerOpen(false);
          loadDocs();
        }}
        onLimit={(msg) => {
          setDrawerOpen(false);
          setLimitMsg(msg);
        }}
      />

      {/* Modal limite de plan */}
      <PlanLimitDialog message={limitMsg} onClose={() => setLimitMsg(null)} />

      {/* Toast génération du lien */}
      {linkLoading && (
        <div className="fixed bottom-6 left-1/2 z-50 -translate-x-1/2 rounded-full bg-[#1b1c1a] px-4 py-2 text-sm font-medium text-white shadow-modal">
          {td("generatingLink")}
        </div>
      )}

      {/* Modal lien de paiement */}
      {payLink && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div
            onClick={() => setPayLink(null)}
            className="absolute inset-0 bg-black/30 backdrop-blur-sm"
          />
          <div className="relative mx-4 w-full max-w-[460px] rounded-2xl bg-white p-6 shadow-modal">
            <div className="mb-3 flex items-center justify-between">
              <h2 className="font-manrope text-xl font-semibold text-[#1b1c1a]">
                {td("paymentLink")}
              </h2>
              <button
                type="button"
                onClick={() => setPayLink(null)}
                aria-label={tc("close")}
                className="flex h-8 w-8 items-center justify-center rounded-full text-[#444841] transition-colors hover:bg-[#f5f3f0]"
              >
                <X className="h-5 w-5" strokeWidth={1.75} />
              </button>
            </div>
            <p className="font-inter text-sm text-[#444841]">
              {td("paymentLinkDesc")}
            </p>
            <div className="mt-4 flex items-center gap-2">
              <input
                readOnly
                value={payLink}
                onFocus={(e) => e.currentTarget.select()}
                className="font-inter min-w-0 flex-1 rounded-lg border border-[#c4c8be] bg-[#f5f3f0] px-3 py-2.5 text-sm text-[#1b1c1a] outline-none"
              />
              <button
                type="button"
                onClick={() => {
                  navigator.clipboard?.writeText(payLink);
                  setCopied(true);
                  setTimeout(() => setCopied(false), 1500);
                }}
                className="font-inter shrink-0 rounded-lg bg-[#52634c] px-4 py-2.5 text-sm font-semibold text-white transition-all hover:opacity-95"
              >
                {copied ? td("copied") : td("copy")}
              </button>
            </div>
            <a
              href={payLink}
              target="_blank"
              rel="noopener noreferrer"
              className="font-inter mt-3 inline-block text-sm font-medium text-[#52634c] hover:underline"
            >
              {td("openPaymentPage")}
            </a>
          </div>
        </div>
      )}
    </div>
  );
}
