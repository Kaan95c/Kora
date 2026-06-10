"use client";

import { useEffect, useState, type ReactNode } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import {
  ArrowLeft,
  Mail,
  Phone,
  Building2,
  MapPin,
  Briefcase,
  FileText,
  Calendar,
  Plus,
  X,
  Check,
  Link2,
  Copy,
  ExternalLink,
} from "lucide-react";

import { StatusBadge, type StatusVariant } from "@/components/shared/StatusBadge";
import {
  STATUS_CONFIG,
  initials,
  fullName,
  formatDate,
  type ContactStatus,
} from "@/lib/contacts";

// ───────────────────────── Types ─────────────────────────

type ProjectStatus = "INQUIRY" | "FOLLOW_UP" | "BOOKING" | "ACTIVE" | "ARCHIVED";
type DocumentStatus = "DRAFT" | "SENT" | "SIGNED" | "PAID";
type DocumentType = "INVOICE" | "QUOTE" | "CONTRACT" | "PROPOSAL";

type ContactProject = {
  id: string;
  name: string;
  status: ProjectStatus;
  totalAmount: number;
  paidAmount: number;
  startDate: string | null;
  endDate: string | null;
};

type ContactDocument = {
  id: string;
  title: string;
  number: string | null;
  type: DocumentType;
  status: DocumentStatus;
  total: number | null;
  createdAt: string;
};

type ContactDetail = {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  phone: string | null;
  companyName: string | null;
  address: string | null;
  notes: string | null;
  status: ContactStatus;
  tags: string[];
  createdAt: string;
  portalUrl: string | null;
  projects: ContactProject[];
  documents: ContactDocument[];
};

const PROJECT_STATUS: Record<
  ProjectStatus,
  { label: string; variant: StatusVariant }
> = {
  INQUIRY: { label: "Inquiry", variant: "booking" },
  FOLLOW_UP: { label: "Follow-up", variant: "pending" },
  BOOKING: { label: "Booking", variant: "sent" },
  ACTIVE: { label: "Active", variant: "active" },
  ARCHIVED: { label: "Archived", variant: "draft" },
};

const DOCUMENT_STATUS: Record<
  DocumentStatus,
  { label: string; variant: StatusVariant }
> = {
  DRAFT: { label: "Draft", variant: "draft" },
  SENT: { label: "Sent", variant: "sent" },
  SIGNED: { label: "Signed", variant: "active" },
  PAID: { label: "Paid", variant: "paid" },
};

const DOCUMENT_TYPE: Record<DocumentType, string> = {
  INVOICE: "Invoice",
  QUOTE: "Quote",
  CONTRACT: "Contract",
  PROPOSAL: "Proposal",
};

const TABS = [
  { value: "infos", label: "Infos" },
  { value: "projects", label: "Projects" },
  { value: "documents", label: "Documents" },
  { value: "notes", label: "Notes" },
] as const;
type Tab = (typeof TABS)[number]["value"];

const money = (n: number) => `$${n.toLocaleString()}`;

function progress(p: ContactProject) {
  if (p.totalAmount <= 0) return 0;
  return Math.min(100, Math.round((p.paidAmount / p.totalAmount) * 100));
}

// ───────────────────────── Page ─────────────────────────

export default function ContactDetailPage() {
  const router = useRouter();
  const params = useParams<{ id: string }>();
  const id = params.id;

  const [contact, setContact] = useState<ContactDetail | null | "notfound">(
    null
  );
  const [tab, setTab] = useState<Tab>("infos");

  // Drafts éditables
  const [infos, setInfos] = useState({
    email: "",
    phone: "",
    companyName: "",
    address: "",
    status: "LEAD" as ContactStatus,
  });
  const [notesDraft, setNotesDraft] = useState("");
  const [tagInput, setTagInput] = useState("");
  const [savingInfos, setSavingInfos] = useState(false);
  const [savedInfos, setSavedInfos] = useState(false);
  const [savingNotes, setSavingNotes] = useState(false);
  const [savedNotes, setSavedNotes] = useState(false);
  const [copied, setCopied] = useState(false);

  async function copyPortalLink(url: string) {
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // clipboard indisponible (http non sécurisé) — l'input reste sélectionnable.
    }
  }

  async function load() {
    try {
      const res = await fetch(`/api/contacts/${id}`);
      if (res.status === 404) {
        setContact("notfound");
        return;
      }
      const data: ContactDetail = await res.json();
      setContact(data);
      setInfos({
        email: data.email,
        phone: data.phone ?? "",
        companyName: data.companyName ?? "",
        address: data.address ?? "",
        status: data.status,
      });
      setNotesDraft(data.notes ?? "");
    } catch {
      setContact("notfound");
    }
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  async function patch(body: Record<string, unknown>) {
    const res = await fetch(`/api/contacts/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    if (!res.ok) return null;
    return (await res.json()) as Partial<ContactDetail>;
  }

  async function saveInfos() {
    setSavingInfos(true);
    setSavedInfos(false);
    const updated = await patch(infos);
    setSavingInfos(false);
    if (updated && contact !== "notfound" && contact) {
      setContact({ ...contact, ...updated });
      setSavedInfos(true);
      setTimeout(() => setSavedInfos(false), 2000);
    }
  }

  async function saveNotes() {
    setSavingNotes(true);
    setSavedNotes(false);
    const updated = await patch({ notes: notesDraft });
    setSavingNotes(false);
    if (updated && contact !== "notfound" && contact) {
      setContact({ ...contact, notes: updated.notes ?? null });
      setSavedNotes(true);
      setTimeout(() => setSavedNotes(false), 2000);
    }
  }

  async function persistTags(tags: string[]) {
    if (contact === "notfound" || !contact) return;
    setContact({ ...contact, tags }); // optimiste
    const updated = await patch({ tags });
    if (!updated) load(); // rollback via refetch
  }

  function addTag() {
    if (contact === "notfound" || !contact) return;
    const t = tagInput.trim();
    setTagInput("");
    if (!t || contact.tags.includes(t)) return;
    persistTags([...contact.tags, t]);
  }

  function removeTag(t: string) {
    if (contact === "notfound" || !contact) return;
    persistTags(contact.tags.filter((x) => x !== t));
  }

  // ─── States limites ───
  if (contact === null) {
    return (
      <div className="animate-pulse">
        <div className="mb-6 h-4 w-28 rounded bg-[#efeeea]" />
        <div className="mb-6 flex items-center gap-5">
          <div className="h-16 w-16 rounded-full bg-[#efeeea]" />
          <div className="space-y-2">
            <div className="h-7 w-56 rounded-lg bg-[#efeeea]" />
            <div className="h-4 w-40 rounded bg-[#efeeea]" />
          </div>
        </div>
        <div className="h-80 rounded-2xl bg-[#efeeea]" />
      </div>
    );
  }

  if (contact === "notfound") {
    return (
      <div className="flex flex-col items-center justify-center py-24 text-center">
        <p className="font-manrope text-xl font-semibold text-[#1b1c1a]">
          Contact not found
        </p>
        <p className="font-inter mt-1 text-sm text-[#444841]">
          This contact may have been removed.
        </p>
        <Link
          href="/contacts"
          className="font-inter mt-5 rounded-lg bg-[#52634c] px-4 py-2.5 text-sm font-semibold text-white transition-all hover:-translate-y-px hover:opacity-95"
        >
          Back to contacts
        </Link>
      </div>
    );
  }

  const cfg = STATUS_CONFIG[contact.status];
  const inputCls =
    "font-inter w-full rounded-lg border border-[#c4c8be] bg-white px-3 py-2.5 text-sm text-[#1b1c1a] outline-none transition-colors placeholder:text-outline focus:border-[#52634c]";
  const labelCls =
    "font-inter mb-1.5 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-[#444841]";

  return (
    <div>
      {/* Retour */}
      <button
        type="button"
        onClick={() => router.push("/contacts")}
        className="font-inter mb-5 flex items-center gap-1.5 text-sm font-medium text-[#444841] transition-colors hover:text-[#1b1c1a]"
      >
        <ArrowLeft className="h-4 w-4" strokeWidth={1.75} />
        Back to contacts
      </button>

      {/* En-tête */}
      <div className="rounded-2xl bg-white p-6 shadow-card">
        <div className="flex items-start gap-5">
          <span
            className="font-manrope flex h-16 w-16 shrink-0 items-center justify-center rounded-full text-xl font-bold"
            style={{ backgroundColor: cfg.avatarBg, color: cfg.avatarText }}
          >
            {initials(contact.firstName, contact.lastName)}
          </span>

          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-3">
              <h1 className="font-manrope text-2xl font-semibold text-[#1b1c1a]">
                {fullName(contact.firstName, contact.lastName)}
              </h1>
              <StatusBadge status={cfg.label} variant={cfg.variant} />
            </div>
            {contact.companyName && (
              <p className="font-inter mt-1 text-sm text-[#444841]">
                {contact.companyName}
              </p>
            )}

            {/* Tags éditables */}
            <div className="mt-3 flex flex-wrap items-center gap-1.5">
              {contact.tags.map((t) => (
                <span
                  key={t}
                  className="font-inter flex items-center gap-1 rounded-full bg-[#efeeea] px-2.5 py-1 text-[11px] font-semibold text-[#444841]"
                >
                  {t}
                  <button
                    type="button"
                    onClick={() => removeTag(t)}
                    aria-label={`Remove ${t}`}
                    className="text-outline hover:text-[#1b1c1a]"
                  >
                    <X className="h-3 w-3" strokeWidth={2.5} />
                  </button>
                </span>
              ))}
              <span className="inline-flex items-center gap-1 rounded-full border border-dashed border-[#c4c8be] px-2 py-0.5">
                <Plus className="h-3 w-3 text-outline" strokeWidth={2} />
                <input
                  value={tagInput}
                  onChange={(e) => setTagInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" || e.key === ",") {
                      e.preventDefault();
                      addTag();
                    }
                  }}
                  onBlur={addTag}
                  placeholder="Add tag"
                  className="font-inter w-20 bg-transparent text-[11px] font-semibold text-[#444841] outline-none placeholder:text-outline"
                />
              </span>
            </div>
          </div>
        </div>

        {/* Onglets */}
        <div className="mt-6 flex gap-1 border-b border-[#efeeea]">
          {TABS.map((t) => (
            <button
              key={t.value}
              type="button"
              onClick={() => setTab(t.value)}
              className={`font-inter relative px-4 py-2.5 text-sm font-medium transition-colors ${
                tab === t.value
                  ? "text-[#52634c]"
                  : "text-[#444841] hover:text-[#1b1c1a]"
              }`}
            >
              {t.label}
              {t.value === "projects" && contact.projects.length > 0 && (
                <span className="ml-1.5 rounded-full bg-[#efeeea] px-1.5 py-0.5 text-[10px] font-semibold text-[#444841]">
                  {contact.projects.length}
                </span>
              )}
              {t.value === "documents" && contact.documents.length > 0 && (
                <span className="ml-1.5 rounded-full bg-[#efeeea] px-1.5 py-0.5 text-[10px] font-semibold text-[#444841]">
                  {contact.documents.length}
                </span>
              )}
              {tab === t.value && (
                <span className="absolute inset-x-0 -bottom-px h-0.5 rounded-full bg-[#52634c]" />
              )}
            </button>
          ))}
        </div>

        {/* Contenu onglets */}
        <div className="pt-6">
          {/* INFOS */}
          {tab === "infos" && (
            <div className="max-w-2xl">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className={labelCls}>
                    <Mail className="h-3.5 w-3.5" strokeWidth={1.75} /> Email
                  </label>
                  <input
                    type="email"
                    className={inputCls}
                    value={infos.email}
                    onChange={(e) =>
                      setInfos((s) => ({ ...s, email: e.target.value }))
                    }
                  />
                </div>
                <div>
                  <label className={labelCls}>
                    <Phone className="h-3.5 w-3.5" strokeWidth={1.75} /> Phone
                  </label>
                  <input
                    className={inputCls}
                    value={infos.phone}
                    onChange={(e) =>
                      setInfos((s) => ({ ...s, phone: e.target.value }))
                    }
                    placeholder="—"
                  />
                </div>
                <div>
                  <label className={labelCls}>
                    <Building2 className="h-3.5 w-3.5" strokeWidth={1.75} />{" "}
                    Company
                  </label>
                  <input
                    className={inputCls}
                    value={infos.companyName}
                    onChange={(e) =>
                      setInfos((s) => ({ ...s, companyName: e.target.value }))
                    }
                    placeholder="—"
                  />
                </div>
                <div>
                  <label className={labelCls}>Status</label>
                  <select
                    className={inputCls}
                    value={infos.status}
                    onChange={(e) =>
                      setInfos((s) => ({
                        ...s,
                        status: e.target.value as ContactStatus,
                      }))
                    }
                  >
                    <option value="LEAD">Lead</option>
                    <option value="PROSPECT">Prospect</option>
                    <option value="CLIENT">Client</option>
                    <option value="ARCHIVED">Archived</option>
                  </select>
                </div>
                <div className="col-span-2">
                  <label className={labelCls}>
                    <MapPin className="h-3.5 w-3.5" strokeWidth={1.75} /> Address
                  </label>
                  <input
                    className={inputCls}
                    value={infos.address}
                    onChange={(e) =>
                      setInfos((s) => ({ ...s, address: e.target.value }))
                    }
                    placeholder="—"
                  />
                </div>
              </div>
              <div className="mt-5 flex items-center gap-3">
                <button
                  type="button"
                  onClick={saveInfos}
                  disabled={savingInfos}
                  className="font-inter rounded-lg bg-[#52634c] px-5 py-2.5 text-sm font-semibold text-white transition-all hover:-translate-y-px hover:opacity-95 disabled:opacity-60"
                >
                  {savingInfos ? "Saving…" : "Save changes"}
                </button>
                {savedInfos && (
                  <span className="font-inter flex items-center gap-1 text-sm font-medium text-[#3b4b36]">
                    <Check className="h-4 w-4" strokeWidth={2} /> Saved
                  </span>
                )}
              </div>
            </div>
          )}

          {/* PROJECTS */}
          {tab === "projects" && (
            <>
              {contact.projects.length === 0 ? (
                <EmptyTab
                  icon={<Briefcase className="h-6 w-6 text-outline" strokeWidth={1.5} />}
                  text="No projects linked to this contact yet."
                />
              ) : (
                <div className="grid grid-cols-2 gap-4">
                  {contact.projects.map((p) => {
                    const st = PROJECT_STATUS[p.status];
                    const pct = progress(p);
                    return (
                      <div
                        key={p.id}
                        className="rounded-xl border border-[#c4c8be]/40 bg-white p-5 transition-all hover:-translate-y-0.5 hover:shadow-card"
                      >
                        <div className="flex items-start justify-between">
                          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#d5e8cb]">
                            <Briefcase
                              className="h-5 w-5 text-[#52634c]"
                              strokeWidth={1.75}
                            />
                          </div>
                          <StatusBadge status={st.label} variant={st.variant} />
                        </div>
                        <h3 className="font-manrope mt-3 text-base font-semibold text-[#1b1c1a]">
                          {p.name}
                        </h3>
                        <div className="font-inter mt-1 flex items-center gap-1.5 text-xs text-[#444841]">
                          <Calendar className="h-3.5 w-3.5 text-outline" strokeWidth={1.75} />
                          {formatDate(p.startDate)} – {formatDate(p.endDate)}
                        </div>
                        <div className="mt-4">
                          <div className="font-inter mb-1.5 flex items-center justify-between text-xs">
                            <span className="text-[#444841]">
                              {money(p.paidAmount)} / {money(p.totalAmount)}
                            </span>
                            <span className="font-semibold text-[#52634c]">
                              {pct}%
                            </span>
                          </div>
                          <div className="h-1.5 w-full overflow-hidden rounded-full bg-[#efeeea]">
                            <div
                              className="h-full rounded-full bg-[#52634c]"
                              style={{ width: `${pct}%` }}
                            />
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </>
          )}

          {/* DOCUMENTS */}
          {tab === "documents" && (
            <>
              {contact.documents.length === 0 ? (
                <EmptyTab
                  icon={<FileText className="h-6 w-6 text-outline" strokeWidth={1.5} />}
                  text="No documents linked to this contact yet."
                />
              ) : (
                <div className="overflow-hidden rounded-xl border border-[#c4c8be]/40">
                  {contact.documents.map((d, i) => {
                    const st = DOCUMENT_STATUS[d.status];
                    return (
                      <div
                        key={d.id}
                        className={`flex items-center justify-between px-5 py-4 transition-colors hover:bg-[#fbf9f5] ${
                          i > 0 ? "border-t border-[#f5f3f0]" : ""
                        }`}
                      >
                        <div className="flex min-w-0 items-center gap-3">
                          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-[#efeeea]">
                            <FileText
                              className="h-4 w-4 text-[#52634c]"
                              strokeWidth={1.75}
                            />
                          </div>
                          <div className="min-w-0">
                            <p className="font-manrope truncate text-sm font-semibold text-[#1b1c1a]">
                              {d.title}
                            </p>
                            <p className="font-inter text-xs text-outline">
                              {DOCUMENT_TYPE[d.type]}
                              {d.number ? ` · ${d.number}` : ""}
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center gap-4">
                          {d.total != null && (
                            <span className="font-manrope text-sm font-semibold text-[#1b1c1a]">
                              {money(d.total)}
                            </span>
                          )}
                          <StatusBadge status={st.label} variant={st.variant} />
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </>
          )}

          {/* NOTES */}
          {tab === "notes" && (
            <div className="max-w-2xl">
              <textarea
                value={notesDraft}
                onChange={(e) => setNotesDraft(e.target.value)}
                rows={8}
                placeholder="Add private notes about this contact…"
                className="font-inter w-full resize-y rounded-xl border border-[#c4c8be] bg-white px-4 py-3 text-sm leading-relaxed text-[#1b1c1a] outline-none transition-colors placeholder:text-outline focus:border-[#52634c]"
              />
              <div className="mt-4 flex items-center gap-3">
                <button
                  type="button"
                  onClick={saveNotes}
                  disabled={savingNotes}
                  className="font-inter rounded-lg bg-[#52634c] px-5 py-2.5 text-sm font-semibold text-white transition-all hover:-translate-y-px hover:opacity-95 disabled:opacity-60"
                >
                  {savingNotes ? "Saving…" : "Save notes"}
                </button>
                {savedNotes && (
                  <span className="font-inter flex items-center gap-1 text-sm font-medium text-[#3b4b36]">
                    <Check className="h-4 w-4" strokeWidth={2} /> Saved
                  </span>
                )}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Lien du portail client */}
      <div className="mt-5 rounded-2xl bg-white p-5 shadow-card">
        <div className="flex items-center gap-2">
          <Link2 className="h-4 w-4 text-[#52634c]" strokeWidth={1.75} />
          <h2 className="font-manrope text-sm font-semibold text-[#1b1c1a]">
            Client portal
          </h2>
        </div>
        <p className="font-inter mt-1 text-xs text-[#444841]">
          Share this private link with {contact.firstName} to view their
          invoices, documents and appointments. No account required.
        </p>

        {contact.portalUrl ? (
          <div className="mt-3 flex flex-col gap-2 sm:flex-row sm:items-center">
            <input
              readOnly
              value={contact.portalUrl}
              onFocus={(e) => e.currentTarget.select()}
              className="font-inter min-w-0 flex-1 truncate rounded-lg border border-[#c4c8be] bg-[#fbf9f5] px-3 py-2.5 text-sm text-[#444841] outline-none focus:border-[#52634c]"
            />
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => copyPortalLink(contact.portalUrl!)}
                className="font-inter inline-flex items-center justify-center gap-1.5 rounded-lg bg-[#52634c] px-4 py-2.5 text-sm font-semibold text-white transition-all hover:-translate-y-px hover:opacity-95"
              >
                {copied ? (
                  <>
                    <Check className="h-4 w-4" strokeWidth={2} /> Copied
                  </>
                ) : (
                  <>
                    <Copy className="h-4 w-4" strokeWidth={2} /> Copy link
                  </>
                )}
              </button>
              <a
                href={contact.portalUrl}
                target="_blank"
                rel="noopener noreferrer"
                aria-label="Open client portal"
                className="font-inter inline-flex items-center justify-center rounded-lg border border-[#c4c8be] px-3 py-2.5 text-sm font-semibold text-[#1b1c1a] transition-colors hover:bg-[#fbf9f5]"
              >
                <ExternalLink className="h-4 w-4" strokeWidth={2} />
              </a>
            </div>
          </div>
        ) : (
          // Plan Free → portail désactivé : encart upgrade.
          <div className="mt-3 flex flex-col gap-3 rounded-xl border border-[#f8dac5] bg-[#fdf3ea] px-4 py-3.5 sm:flex-row sm:items-center sm:justify-between">
            <p className="font-inter text-sm text-[#574333]">
              Le portail client est inclus à partir du plan{" "}
              <span className="font-semibold">Starter</span>.
            </p>
            <Link
              href="/settings/billing"
              className="font-inter shrink-0 rounded-lg bg-[#52634c] px-4 py-2 text-sm font-semibold text-white transition-all hover:-translate-y-px hover:opacity-95"
            >
              Voir les plans
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}

// ───────────────────────── Empty tab ─────────────────────────

function EmptyTab({ icon, text }: { icon: ReactNode; text: string }) {
  return (
    <div className="flex flex-col items-center justify-center py-16">
      <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[#efeeea]">
        {icon}
      </div>
      <p className="font-inter mt-3 text-sm text-[#444841]">{text}</p>
    </div>
  );
}
