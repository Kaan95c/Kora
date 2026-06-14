"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { useTranslations } from "next-intl";
import {
  ArrowLeft,
  Trash2,
  Plus,
  Check,
  X,
  FileText,
  Calendar,
} from "lucide-react";

import { StatusBadge, type StatusVariant } from "@/components/shared/StatusBadge";

// ───────────────────────── Types & config ─────────────────────────

type ProjectStatus =
  | "INQUIRY"
  | "FOLLOW_UP"
  | "BOOKING"
  | "ACTIVE"
  | "ARCHIVED";

type DocStatus = "DRAFT" | "SENT" | "SIGNED" | "PAID";

type LinkedDoc = {
  id: string;
  title: string;
  type: string;
  status: DocStatus;
  total: number | null;
  createdAt: string;
};

type Task = {
  id: string;
  title: string;
  completed: boolean;
  priority: string;
};

type Detail = {
  id: string;
  name: string;
  status: ProjectStatus;
  description: string | null;
  notes: string | null;
  totalAmount: number;
  paidAmount: number;
  startDate: string | null;
  endDate: string | null;
  contactId: string | null;
  contact: { firstName: string; lastName: string; email: string } | null;
  documents: LinkedDoc[];
  tasks: Task[];
};

type ContactOption = { id: string; label: string };

const STATUS_LIST: ProjectStatus[] = [
  "INQUIRY",
  "FOLLOW_UP",
  "BOOKING",
  "ACTIVE",
  "ARCHIVED",
];

const STATUS_VARIANT: Record<ProjectStatus, StatusVariant> = {
  INQUIRY: "booking",
  FOLLOW_UP: "pending",
  BOOKING: "sent",
  ACTIVE: "active",
  ARCHIVED: "draft",
};

const DOC_VARIANT: Record<DocStatus, StatusVariant> = {
  DRAFT: "draft",
  SENT: "sent",
  SIGNED: "active",
  PAID: "paid",
};

// ───────────────────────── Helpers ─────────────────────────

const money = (n: number) => `$${n.toLocaleString()}`;

function formatDate(d: string | null) {
  if (!d) return "—";
  return new Date(d).toLocaleDateString("en", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function toDateInputValue(iso: string | null) {
  return iso ? iso.slice(0, 10) : "";
}

// ───────────────────────── Page ─────────────────────────

export default function ProjectDetailPage() {
  const params = useParams();
  const id = String(params.id);
  const router = useRouter();
  const t = useTranslations("projectDetail");
  const tc = useTranslations("common");
  const ts = useTranslations("status");

  const [detail, setDetail] = useState<Detail | null>(null);
  const [notFound, setNotFound] = useState(false);
  const [contacts, setContacts] = useState<ContactOption[]>([]);

  // Buffers éditables
  const [name, setName] = useState("");
  const [editingName, setEditingName] = useState(false);
  const [status, setStatus] = useState<ProjectStatus>("ACTIVE");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [contactId, setContactId] = useState("");
  const [description, setDescription] = useState("");
  const [budget, setBudget] = useState("");
  const [notes, setNotes] = useState("");

  const [tasks, setTasks] = useState<Task[]>([]);
  const [newTask, setNewTask] = useState("");

  const [infoSaving, setInfoSaving] = useState(false);
  const [infoSaved, setInfoSaved] = useState(false);
  const [notesSaved, setNotesSaved] = useState(false);

  const loadedNotes = useRef<string | null>(null);

  // ─── Chargement ───
  useEffect(() => {
    let alive = true;
    Promise.all([
      fetch(`/api/projects/${id}`).then((r) =>
        r.ok ? r.json() : Promise.reject(r.status)
      ),
      fetch("/api/contacts").then((r) => (r.ok ? r.json() : [])),
    ])
      .then(([p, cs]: [Detail, { id: string; firstName: string; lastName: string }[]]) => {
        if (!alive) return;
        setDetail(p);
        setName(p.name);
        setStatus(p.status);
        setStartDate(toDateInputValue(p.startDate));
        setEndDate(toDateInputValue(p.endDate));
        setContactId(p.contactId ?? "");
        setDescription(p.description ?? "");
        setBudget(p.totalAmount ? String(p.totalAmount) : "");
        setNotes(p.notes ?? "");
        loadedNotes.current = p.notes ?? "";
        setTasks(p.tasks ?? []);
        setContacts(
          Array.isArray(cs)
            ? cs.map((c) => ({ id: c.id, label: `${c.firstName} ${c.lastName}` }))
            : []
        );
      })
      .catch(() => {
        if (alive) setNotFound(true);
      });
    return () => {
      alive = false;
    };
  }, [id]);

  // ─── PATCH générique ───
  async function patch(data: Record<string, unknown>) {
    const res = await fetch(`/api/projects/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });
    return res.ok;
  }

  // ─── Notes : autosave debounce 1 s ───
  useEffect(() => {
    if (loadedNotes.current === null) return; // pas encore chargé
    if (notes === loadedNotes.current) return; // inchangé
    const timer = setTimeout(async () => {
      const ok = await patch({ notes });
      if (ok) {
        loadedNotes.current = notes;
        setNotesSaved(true);
        setTimeout(() => setNotesSaved(false), 2000);
      }
    }, 1000);
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [notes]);

  // ─── Header : nom, statut, dates ───
  async function saveName() {
    setEditingName(false);
    const trimmed = name.trim();
    if (!detail) return;
    if (!trimmed || trimmed === detail.name) {
      setName(detail.name);
      return;
    }
    const ok = await patch({ name: trimmed });
    if (ok) setDetail({ ...detail, name: trimmed });
    else setName(detail.name);
  }

  async function changeStatus(next: ProjectStatus) {
    setStatus(next);
    const ok = await patch({ status: next });
    if (!ok && detail) setStatus(detail.status);
  }

  // ─── Infos générales ───
  async function saveInfo() {
    setInfoSaving(true);
    const ok = await patch({
      contactId: contactId || null,
      description,
      totalAmount: budget === "" ? 0 : budget,
    });
    setInfoSaving(false);
    if (ok) {
      setInfoSaved(true);
      setTimeout(() => setInfoSaved(false), 2000);
      if (detail) {
        setDetail({
          ...detail,
          contactId: contactId || null,
          description,
          totalAmount: budget === "" ? 0 : Number(budget),
        });
      }
    }
  }

  // ─── Suppression du projet ───
  async function deleteProject() {
    if (!window.confirm(t("deleteConfirm"))) return;
    const res = await fetch(`/api/projects/${id}`, { method: "DELETE" });
    if (res.ok) router.push("/projects");
  }

  // ─── Tâches ───
  async function addTask() {
    const title = newTask.trim();
    if (!title) return;
    setNewTask("");
    const res = await fetch(`/api/projects/${id}/tasks`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title }),
    });
    if (res.ok) {
      const task: Task = await res.json();
      setTasks((prev) => [...prev, task]);
    }
  }

  async function toggleTask(task: Task) {
    const completed = !task.completed;
    setTasks((prev) =>
      prev.map((x) => (x.id === task.id ? { ...x, completed } : x))
    );
    const res = await fetch(`/api/projects/${id}/tasks`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ taskId: task.id, completed }),
    });
    if (!res.ok) {
      setTasks((prev) =>
        prev.map((x) => (x.id === task.id ? { ...x, completed: task.completed } : x))
      );
    }
  }

  async function deleteTask(taskId: string) {
    setTasks((prev) => prev.filter((x) => x.id !== taskId));
    await fetch(`/api/projects/${id}/tasks?taskId=${taskId}`, {
      method: "DELETE",
    });
  }

  const inputCls =
    "font-inter w-full rounded-lg border border-[#c4c8be] bg-white px-3 py-2.5 text-sm text-[#1b1c1a] outline-none transition-colors placeholder:text-outline focus:border-[#52634c]";
  const labelCls =
    "font-inter mb-1.5 block text-xs font-semibold uppercase tracking-wide text-[#444841]";

  const pct = useMemo(() => {
    if (!detail || detail.totalAmount <= 0) return 0;
    return Math.min(100, Math.round((detail.paidAmount / detail.totalAmount) * 100));
  }, [detail]);

  // ─── Not found ───
  if (notFound) {
    return (
      <div className="flex flex-col items-center justify-center py-24 text-center">
        <p className="font-manrope text-lg font-semibold text-[#1b1c1a]">
          {t("notFound")}
        </p>
        <Link
          href="/projects"
          className="font-inter mt-4 inline-flex items-center gap-1.5 text-sm font-medium text-[#52634c] hover:underline"
        >
          <ArrowLeft className="h-4 w-4" strokeWidth={1.75} />
          {t("back")}
        </Link>
      </div>
    );
  }

  // ─── Skeleton ───
  if (!detail) {
    return (
      <div className="animate-pulse">
        <div className="h-4 w-24 rounded bg-[#efeeea]" />
        <div className="mt-4 h-9 w-80 rounded-xl bg-[#efeeea]" />
        <div className="mt-8 grid grid-cols-1 gap-6 lg:grid-cols-3">
          <div className="h-64 rounded-2xl bg-[#efeeea] lg:col-span-2" />
          <div className="h-64 rounded-2xl bg-[#efeeea]" />
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-5xl">
      {/* ── Retour ── */}
      <Link
        href="/projects"
        className="font-inter inline-flex items-center gap-1.5 text-sm font-medium text-[#444841] transition-colors hover:text-[#1b1c1a]"
      >
        <ArrowLeft className="h-4 w-4" strokeWidth={1.75} />
        {t("back")}
      </Link>

      {/* ── SECTION 1 — Header ── */}
      <div className="mt-4 flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
        <div className="min-w-0 flex-1">
          {editingName ? (
            <input
              autoFocus
              value={name}
              onChange={(e) => setName(e.target.value)}
              onBlur={saveName}
              onKeyDown={(e) => {
                if (e.key === "Enter") saveName();
                if (e.key === "Escape") {
                  setName(detail.name);
                  setEditingName(false);
                }
              }}
              className="font-manrope w-full rounded-lg border border-[#c4c8be] bg-white px-2 py-1 text-[28px] font-semibold tracking-[-0.01em] text-[#1b1c1a] outline-none focus:border-[#52634c]"
            />
          ) : (
            <h1
              onClick={() => setEditingName(true)}
              title={t("namePlaceholder")}
              className="font-manrope cursor-text rounded-lg px-2 py-1 text-[28px] font-semibold tracking-[-0.01em] text-[#1b1c1a] transition-colors hover:bg-[#f0efea]"
            >
              {detail.name}
            </h1>
          )}

          {/* Statut + dates */}
          <div className="mt-3 flex flex-wrap items-center gap-3 px-2">
            <div className="relative inline-flex items-center">
              <StatusBadge
                status={ts(`project.${status}`)}
                variant={STATUS_VARIANT[status]}
              />
              <select
                value={status}
                onChange={(e) => changeStatus(e.target.value as ProjectStatus)}
                aria-label={ts(`project.${status}`)}
                className="absolute inset-0 cursor-pointer opacity-0"
              >
                {STATUS_LIST.map((s) => (
                  <option key={s} value={s}>
                    {ts(`project.${s}`)}
                  </option>
                ))}
              </select>
            </div>
            <span className="font-inter flex items-center gap-1.5 text-sm text-[#444841]">
              <Calendar className="h-4 w-4 text-outline" strokeWidth={1.75} />
              <input
                type="date"
                value={startDate}
                onChange={(e) => {
                  setStartDate(e.target.value);
                  patch({ startDate: e.target.value });
                }}
                className="rounded border border-transparent bg-transparent px-1 py-0.5 outline-none transition-colors hover:border-[#c4c8be] focus:border-[#52634c]"
              />
              <span className="text-outline">–</span>
              <input
                type="date"
                value={endDate}
                onChange={(e) => {
                  setEndDate(e.target.value);
                  patch({ endDate: e.target.value });
                }}
                className="rounded border border-transparent bg-transparent px-1 py-0.5 outline-none transition-colors hover:border-[#c4c8be] focus:border-[#52634c]"
              />
            </span>
          </div>
        </div>

        <button
          type="button"
          onClick={deleteProject}
          className="font-inter inline-flex shrink-0 items-center gap-1.5 rounded-lg border border-[#ba1a1a]/30 px-3 py-2 text-sm font-medium text-[#ba1a1a] transition-colors hover:bg-error-container"
        >
          <Trash2 className="h-4 w-4" strokeWidth={1.75} />
          {t("deleteProject")}
        </button>
      </div>

      <div className="mt-8 grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Colonne gauche */}
        <div className="space-y-6 lg:col-span-2">
          {/* ── SECTION 2 — Infos générales ── */}
          <section className="rounded-2xl bg-white p-6 shadow-card">
            <h2 className="font-manrope text-lg font-semibold text-[#1b1c1a]">
              {t("generalInfo")}
            </h2>
            <div className="mt-4 space-y-4">
              <div>
                <label className={labelCls}>{t("client")}</label>
                <select
                  className={inputCls}
                  value={contactId}
                  onChange={(e) => setContactId(e.target.value)}
                >
                  <option value="">{t("noClient")}</option>
                  {contacts.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.label}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className={labelCls}>{t("description")}</label>
                <textarea
                  rows={4}
                  className={`${inputCls} resize-y`}
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder={t("descriptionPlaceholder")}
                />
              </div>
              <div>
                <label className={labelCls}>{t("budget")}</label>
                <input
                  type="number"
                  min="0"
                  className={inputCls}
                  value={budget}
                  onChange={(e) => setBudget(e.target.value)}
                />
              </div>
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={saveInfo}
                  disabled={infoSaving}
                  className="font-inter rounded-lg bg-[#52634c] px-5 py-2.5 text-sm font-semibold text-white transition-all hover:-translate-y-px hover:opacity-95 disabled:opacity-60"
                >
                  {infoSaving ? tc("saving") : t("saveChanges")}
                </button>
                {infoSaved && (
                  <span className="font-inter inline-flex items-center gap-1 text-sm text-[#52634c]">
                    <Check className="h-4 w-4" strokeWidth={2} />
                    {t("saved")}
                  </span>
                )}
              </div>
            </div>
          </section>

          {/* ── SECTION 3 — Tâches ── */}
          <section className="rounded-2xl bg-white p-6 shadow-card">
            <h2 className="font-manrope text-lg font-semibold text-[#1b1c1a]">
              {t("tasks")}
            </h2>
            <div className="mt-4 space-y-1.5">
              {tasks.map((task) => (
                <div
                  key={task.id}
                  className="group flex items-center gap-3 rounded-xl px-2 py-2 transition-colors hover:bg-[#fbf9f5]"
                >
                  <button
                    type="button"
                    onClick={() => toggleTask(task)}
                    aria-checked={task.completed}
                    role="checkbox"
                    className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-md border transition-colors ${
                      task.completed
                        ? "border-[#52634c] bg-[#52634c] text-white"
                        : "border-[#c4c8be] bg-white hover:border-[#52634c]"
                    }`}
                  >
                    {task.completed && (
                      <Check className="h-3.5 w-3.5" strokeWidth={2.5} />
                    )}
                  </button>
                  <span
                    className={`font-inter flex-1 text-sm ${
                      task.completed
                        ? "text-outline line-through"
                        : "text-[#1b1c1a]"
                    }`}
                  >
                    {task.title}
                  </span>
                  <button
                    type="button"
                    onClick={() => deleteTask(task.id)}
                    aria-label={t("deleteTask")}
                    className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-outline opacity-0 transition-all hover:bg-error-container hover:text-[#93000a] group-hover:opacity-100"
                  >
                    <X className="h-4 w-4" strokeWidth={1.75} />
                  </button>
                </div>
              ))}
              {tasks.length === 0 && (
                <p className="font-inter py-2 text-sm text-outline">
                  {t("noTasks")}
                </p>
              )}
            </div>
            <div className="mt-3 flex items-center gap-2">
              <Plus className="h-4 w-4 shrink-0 text-outline" strokeWidth={2} />
              <input
                value={newTask}
                onChange={(e) => setNewTask(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") addTask();
                }}
                placeholder={t("addTaskPlaceholder")}
                className="font-inter flex-1 border-b border-transparent bg-transparent py-1 text-sm text-[#1b1c1a] outline-none transition-colors placeholder:text-outline focus:border-[#c4c8be]"
              />
            </div>
          </section>
        </div>

        {/* Colonne droite */}
        <div className="space-y-6">
          {/* Progression budget */}
          <section className="rounded-2xl bg-white p-6 shadow-card">
            <div className="font-inter mb-1.5 flex items-center justify-between text-xs">
              <span className="text-[#444841]">
                {money(detail.paidAmount)} / {money(detail.totalAmount)}
              </span>
              <span className="font-semibold text-[#52634c]">{pct}%</span>
            </div>
            <div className="h-1.5 w-full overflow-hidden rounded-full bg-[#efeeea]">
              <div
                className="h-full rounded-full bg-[#52634c] transition-all"
                style={{ width: `${pct}%` }}
              />
            </div>
          </section>

          {/* ── SECTION 4 — Documents liés ── */}
          <section className="rounded-2xl bg-white p-6 shadow-card">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="font-manrope text-lg font-semibold text-[#1b1c1a]">
                {t("documents")}
              </h2>
              <Link
                href="/documents?new=1"
                className="font-inter inline-flex items-center gap-1 text-xs font-medium text-[#52634c] hover:underline"
              >
                <Plus className="h-3.5 w-3.5" strokeWidth={2} />
                {t("newDocument")}
              </Link>
            </div>
            <div className="space-y-2">
              {detail.documents.map((doc) => (
                <Link
                  key={doc.id}
                  href="/documents"
                  className="flex items-center gap-3 rounded-xl border border-[#f0efea] px-3 py-2.5 transition-colors hover:bg-[#fbf9f5]"
                >
                  <FileText
                    className="h-4 w-4 shrink-0 text-[#52634c]"
                    strokeWidth={1.75}
                  />
                  <div className="min-w-0 flex-1">
                    <p className="font-manrope truncate text-sm font-medium text-[#1b1c1a]">
                      {doc.title}
                    </p>
                    <p className="font-inter text-xs text-[#444841]">
                      {formatDate(doc.createdAt)}
                      {doc.total != null ? ` · ${money(doc.total)}` : ""}
                    </p>
                  </div>
                  <StatusBadge
                    status={ts(`document.${doc.status}`)}
                    variant={DOC_VARIANT[doc.status]}
                  />
                </Link>
              ))}
              {detail.documents.length === 0 && (
                <p className="font-inter py-2 text-sm text-outline">
                  {t("noDocuments")}
                </p>
              )}
            </div>
          </section>

          {/* ── SECTION 5 — Activité / Notes ── */}
          <section className="rounded-2xl bg-white p-6 shadow-card">
            <div className="mb-3 flex items-center justify-between">
              <h2 className="font-manrope text-lg font-semibold text-[#1b1c1a]">
                {t("notes")}
              </h2>
              {notesSaved && (
                <span className="font-inter inline-flex items-center gap-1 text-xs text-[#52634c]">
                  <Check className="h-3.5 w-3.5" strokeWidth={2} />
                  {t("saved")}
                </span>
              )}
            </div>
            <textarea
              rows={5}
              className={`${inputCls} resize-y`}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder={t("notesPlaceholder")}
            />
          </section>
        </div>
      </div>
    </div>
  );
}
