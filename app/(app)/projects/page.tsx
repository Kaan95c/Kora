"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import {
  DndContext,
  PointerSensor,
  useSensor,
  useSensors,
  useDraggable,
  useDroppable,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  Calendar,
  LayoutGrid,
  List,
  Palette,
  Camera,
  PenTool,
  Sparkles,
  FolderOpen,
  Plus,
  X,
  type LucideIcon,
} from "lucide-react";

import { StatusBadge, type StatusVariant } from "@/components/shared/StatusBadge";
import { UsageMeter } from "@/components/shared/UsageMeter";
import { PlanLimitDialog } from "@/components/shared/PlanLimitDialog";
import { useAuth } from "@/lib/hooks/useAuth";
import { useNewDrawerParam } from "@/lib/hooks/useNewDrawerParam";
import { readCache, writeCache, CACHE_KEYS } from "@/lib/hooks/useResourceCache";

// ───────────────────────── Types & constantes ─────────────────────────

type ProjectStatus = "INQUIRY" | "FOLLOW_UP" | "BOOKING" | "ACTIVE" | "ARCHIVED";

type Project = {
  id: string;
  name: string;
  status: ProjectStatus;
  totalAmount: number;
  paidAmount: number;
  startDate: string | null;
  endDate: string | null;
  contact: { firstName: string; lastName: string; email: string } | null;
  _count: { tasks: number; documents: number };
};

const STATUS_ORDER: ProjectStatus[] = [
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

const STATUS_TILE: Record<ProjectStatus, string> = {
  INQUIRY: "#f8dac5",
  FOLLOW_UP: "#f8dac5",
  BOOKING: "#f8dac5",
  ACTIVE: "#d5e8cb",
  ARCHIVED: "#efeeea",
};

const PROJECT_ICONS: LucideIcon[] = [Palette, Camera, PenTool, Sparkles];

const FILTERS: (ProjectStatus | "ALL")[] = [
  "ALL",
  "INQUIRY",
  "FOLLOW_UP",
  "BOOKING",
  "ACTIVE",
  "ARCHIVED",
];

// ───────────────────────── Helpers ─────────────────────────

const money = (n: number) => `$${n.toLocaleString()}`;

function initials(p: Project) {
  if (p.contact) {
    return `${p.contact.firstName[0] ?? ""}${p.contact.lastName[0] ?? ""}`.toUpperCase();
  }
  return "—";
}

function clientName(p: Project): string | null {
  return p.contact ? `${p.contact.firstName} ${p.contact.lastName}` : null;
}

function formatDate(d: string | null) {
  if (!d) return "—";
  return new Date(d).toLocaleDateString("en", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function progress(p: Project) {
  if (p.totalAmount <= 0) return 0;
  return Math.min(100, Math.round((p.paidAmount / p.totalAmount) * 100));
}

// ───────────────────────── Card (vue List) ─────────────────────────

function ProjectCard({ project, index }: { project: Project; index: number }) {
  const t = useTranslations("projects");
  const ts = useTranslations("status");
  const Icon = PROJECT_ICONS[index % PROJECT_ICONS.length];
  const pct = progress(project);

  return (
    <Link
      href={`/projects/${project.id}`}
      className="group block rounded-2xl bg-white p-6 shadow-card transition-all duration-200 hover:-translate-y-0.5 hover:shadow-card-hover"
    >
      <div className="flex items-start justify-between">
        <div
          className="flex h-11 w-11 items-center justify-center rounded-xl"
          style={{ backgroundColor: STATUS_TILE[project.status] }}
        >
          <Icon className="h-5 w-5 text-[#52634c]" strokeWidth={1.75} />
        </div>
        <StatusBadge
          status={ts(`project.${project.status}`)}
          variant={STATUS_VARIANT[project.status]}
        />
      </div>

      <h3 className="font-manrope mt-4 text-xl font-semibold text-[#1b1c1a]">
        {project.name}
      </h3>
      <p className="font-inter mt-1 text-sm text-[#444841]">
        {t("client", { name: clientName(project) ?? t("noClient") })}
      </p>

      <div className="font-inter mt-3 flex items-center gap-2 text-sm text-[#444841]">
        <Calendar className="h-4 w-4 text-outline" strokeWidth={1.75} />
        {formatDate(project.startDate)} – {formatDate(project.endDate)}
      </div>

      <div className="mt-5">
        <div className="font-inter mb-1.5 flex items-center justify-between text-xs">
          <span className="text-[#444841]">
            {money(project.paidAmount)} / {money(project.totalAmount)}
          </span>
          <span className="font-semibold text-[#52634c]">{pct}%</span>
        </div>
        <div className="h-1.5 w-full overflow-hidden rounded-full bg-[#efeeea]">
          <div
            className="h-full rounded-full bg-[#52634c] transition-all"
            style={{ width: `${pct}%` }}
          />
        </div>
      </div>

      <div className="mt-5 flex items-center justify-between border-t border-[#c4c8be]/40 pt-4">
        <span className="flex h-7 w-7 items-center justify-center rounded-full bg-primary-container font-inter text-[11px] font-semibold text-white">
          {initials(project)}
        </span>
        <span className="font-inter text-xs text-[#444841]">
          {t("tasksDocs", {
            tasks: project._count.tasks,
            docs: project._count.documents,
          })}
        </span>
      </div>
    </Link>
  );
}

// ───────────────────────── Kanban ─────────────────────────

function KanbanCard({ project }: { project: Project }) {
  const t = useTranslations("projects");
  const router = useRouter();
  const downPos = useRef<{ x: number; y: number } | null>(null);
  const { attributes, listeners, setNodeRef, transform, isDragging } =
    useDraggable({ id: project.id });
  const pct = progress(project);

  const style = transform
    ? {
        transform: `translate3d(${transform.x}px, ${transform.y}px, 0)`,
        zIndex: 50,
      }
    : undefined;

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      onPointerDown={(e) => {
        downPos.current = { x: e.clientX, y: e.clientY };
        listeners?.onPointerDown?.(e);
      }}
      onClick={(e) => {
        const p = downPos.current;
        if (p && Math.hypot(e.clientX - p.x, e.clientY - p.y) > 6) return;
        router.push(`/projects/${project.id}`);
      }}
      className={`cursor-grab touch-none rounded-xl border border-[#c4c8be]/50 bg-white p-3 active:cursor-grabbing ${
        isDragging ? "opacity-60 shadow-card-hover" : "shadow-sm"
      }`}
    >
      <p className="font-manrope text-sm font-semibold text-[#1b1c1a]">
        {project.name}
      </p>
      <p className="font-inter mt-0.5 text-xs text-[#444841]">
        {clientName(project) ?? t("noClient")}
      </p>
      <div className="mt-2 h-1 w-full overflow-hidden rounded-full bg-[#efeeea]">
        <div
          className="h-full rounded-full bg-[#52634c]"
          style={{ width: `${pct}%` }}
        />
      </div>
      <div className="mt-2 flex items-center justify-between">
        <span className="font-inter text-[11px] text-[#444841]">
          {money(project.totalAmount)}
        </span>
        <span className="flex h-6 w-6 items-center justify-center rounded-full bg-primary-container font-inter text-[10px] font-semibold text-white">
          {initials(project)}
        </span>
      </div>
    </div>
  );
}

function KanbanColumn({
  status,
  projects,
}: {
  status: ProjectStatus;
  projects: Project[];
}) {
  const t = useTranslations("projects");
  const ts = useTranslations("status");
  const { setNodeRef, isOver } = useDroppable({ id: status });

  return (
    <div className="flex w-72 shrink-0 flex-col">
      <div className="mb-3 flex items-center justify-between px-1">
        <StatusBadge
          status={ts(`project.${status}`)}
          variant={STATUS_VARIANT[status]}
        />
        <span className="font-inter text-xs font-semibold text-[#444841]">
          {projects.length}
        </span>
      </div>
      <div
        ref={setNodeRef}
        className={`flex min-h-[140px] flex-1 flex-col gap-2 rounded-2xl border border-dashed p-3 transition-colors ${
          isOver
            ? "border-[#52634c] bg-[#d5e8cb]/40"
            : "border-[#c4c8be]/50 bg-[#f5f3f0]/50"
        }`}
      >
        {projects.map((p) => (
          <KanbanCard key={p.id} project={p} />
        ))}
        {projects.length === 0 && (
          <p className="font-inter px-1 py-6 text-center text-xs text-outline">
            {t("dropHere")}
          </p>
        )}
      </div>
    </div>
  );
}

// ───────────────────────── Drawer New Project ─────────────────────────

function NewProjectDrawer({
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
    name: "",
    contactId: "",
    status: "ACTIVE" as ProjectStatus,
    startDate: "",
  };
  const t = useTranslations("projects");
  const tc = useTranslations("common");
  const ts = useTranslations("status");
  const [form, setForm] = useState(empty);
  const [contacts, setContacts] = useState<{ id: string; label: string }[]>([]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    setForm(empty);
    setSaving(false);
    setError(null);
    // Charge les contacts (sélecteur client) à l'ouverture.
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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  function update<K extends keyof typeof form>(key: K, value: (typeof form)[K]) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  async function handleSave() {
    if (!form.name.trim()) {
      setError(t("nameRequired"));
      return;
    }
    setSaving(true);
    setError(null);
    try {
      const res = await fetch("/api/projects", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: form.name,
          contactId: form.contactId || null,
          status: form.status,
          startDate: form.startDate || null,
        }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        if (res.status === 403 && data?.code === "PLAN_LIMIT_REACHED") {
          onLimit(data.error);
          setSaving(false);
          return;
        }
        setError(data.error ?? t("createFailed"));
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
      <div
        onClick={onClose}
        className={`absolute inset-0 bg-black/30 transition-opacity duration-300 ${
          open ? "opacity-100" : "opacity-0"
        }`}
      />
      <aside
        className={`absolute right-0 top-0 flex h-full w-full flex-col bg-white shadow-[-8px_0_40px_rgba(0,0,0,0.12)] transition-transform duration-300 ease-out sm:w-[420px] ${
          open ? "translate-x-0" : "translate-x-full"
        }`}
        style={{ borderTopLeftRadius: 16, borderBottomLeftRadius: 16 }}
      >
        <div className="flex items-center justify-between border-b border-[#efeeea] px-6 py-5">
          <h2 className="font-manrope text-xl font-semibold text-[#1b1c1a]">
            {t("drawerTitle")}
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
            <label className={labelCls}>{t("name")}</label>
            <input
              className={inputCls}
              value={form.name}
              onChange={(e) => update("name", e.target.value)}
              placeholder={t("namePlaceholder")}
            />
          </div>

          <div>
            <label className={labelCls}>{t("clientLabel")}</label>
            <select
              className={inputCls}
              value={form.contactId}
              onChange={(e) => update("contactId", e.target.value)}
            >
              <option value="">{t("noClientOption")}</option>
              {contacts.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.label}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className={labelCls}>{t("stage")}</label>
            <select
              className={inputCls}
              value={form.status}
              onChange={(e) =>
                update("status", e.target.value as ProjectStatus)
              }
            >
              {(["INQUIRY", "FOLLOW_UP", "BOOKING", "ACTIVE"] as ProjectStatus[]).map(
                (s) => (
                  <option key={s} value={s}>
                    {ts(`project.${s}`)}
                  </option>
                )
              )}
            </select>
          </div>

          <div>
            <label className={labelCls}>{t("startDate")}</label>
            <input
              type="date"
              className={inputCls}
              value={form.startDate}
              onChange={(e) => update("startDate", e.target.value)}
            />
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

export default function ProjectsPage() {
  // Cache client : affiche d'office la dernière liste connue, revalidée au mount.
  const [projects, setProjects] = useState<Project[] | null>(
    () => readCache<Project[]>(CACHE_KEYS.projects) ?? null
  );
  const [view, setView] = useState<"list" | "kanban">("list");
  const [filter, setFilter] = useState<ProjectStatus | "ALL">("ALL");
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [limitMsg, setLimitMsg] = useState<string | null>(null);
  const { limits } = useAuth();
  const t = useTranslations("projects");
  const ts = useTranslations("status");

  // Quick Action (Sidebar) → /projects?new=1 ouvre le drawer.
  useNewDrawerParam(() => setDrawerOpen(true));

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } })
  );

  async function loadProjects() {
    try {
      const res = await fetch("/api/projects");
      const data = await res.json();
      const list: Project[] = Array.isArray(data) ? data : [];
      writeCache(CACHE_KEYS.projects, list);
      setProjects(list);
    } catch {
      // Échec de revalidation : on garde la donnée en cache plutôt que de vider.
      setProjects((prev) => prev ?? []);
    }
  }

  useEffect(() => {
    loadProjects();
  }, []);

  const activeCount = useMemo(
    () => (projects ?? []).filter((p) => p.status === "ACTIVE").length,
    [projects]
  );

  const visible = useMemo(() => {
    const list = projects ?? [];
    return filter === "ALL" ? list : list.filter((p) => p.status === filter);
  }, [projects, filter]);

  const grouped = useMemo(() => {
    const g: Record<ProjectStatus, Project[]> = {
      INQUIRY: [],
      FOLLOW_UP: [],
      BOOKING: [],
      ACTIVE: [],
      ARCHIVED: [],
    };
    for (const p of projects ?? []) g[p.status].push(p);
    return g;
  }, [projects]);

  async function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    if (!over || !projects) return;

    const projectId = String(active.id);
    const newStatus = String(over.id) as ProjectStatus;
    if (!STATUS_ORDER.includes(newStatus)) return;

    const current = projects.find((p) => p.id === projectId);
    if (!current || current.status === newStatus) return;

    // Optimiste (+ miroir cache pour un retour cohérent).
    setProjects((prev) => {
      if (!prev) return prev;
      const next = prev.map((p) =>
        p.id === projectId ? { ...p, status: newStatus } : p
      );
      writeCache(CACHE_KEYS.projects, next);
      return next;
    });

    const res = await fetch(`/api/projects/${projectId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: newStatus }),
    });

    // Rollback en cas d'échec
    if (!res.ok) {
      await loadProjects();
    }
  }

  // ─── Skeleton ───
  if (projects === null) {
    return (
      <div className="animate-pulse">
        <div className="mb-6 flex items-start justify-between">
          <div className="space-y-2">
            <div className="h-9 w-64 rounded-xl bg-[#efeeea]" />
            <div className="h-4 w-80 rounded-lg bg-[#efeeea]" />
          </div>
          <div className="h-10 w-44 rounded-full bg-[#efeeea]" />
        </div>
        <div className="mb-6 flex gap-2">
          {[0, 1, 2, 3, 4].map((i) => (
            <div key={i} className="h-8 w-24 rounded-full bg-[#efeeea]" />
          ))}
        </div>
        <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
          {[0, 1, 2].map((i) => (
            <div key={i} className="h-64 rounded-2xl bg-[#efeeea]" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div>
      {/* Header */}
      <div className="mb-6 flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
        <div>
          <h1 className="font-manrope text-[32px] font-semibold tracking-[-0.01em] text-on-surface">
            {t("title")}
          </h1>
          <p className="font-manrope mt-1 text-base font-normal text-on-surface-variant">
            {t("subtitle", { count: activeCount })}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          {/* Toggle List / Kanban */}
          <div className="flex items-center gap-1 rounded-full bg-[#efeeea] p-1">
            <button
              type="button"
              onClick={() => setView("list")}
              className={`font-inter flex items-center gap-1.5 rounded-full px-3 py-1.5 text-sm font-medium transition-colors ${
                view === "list"
                  ? "bg-white text-[#1b1c1a] shadow-sm"
                  : "text-[#444841] hover:text-[#1b1c1a]"
              }`}
            >
              <List className="h-4 w-4" strokeWidth={1.75} />
              {t("list")}
            </button>
            <button
              type="button"
              onClick={() => setView("kanban")}
              className={`font-inter flex items-center gap-1.5 rounded-full px-3 py-1.5 text-sm font-medium transition-colors ${
                view === "kanban"
                  ? "bg-white text-[#1b1c1a] shadow-sm"
                  : "text-[#444841] hover:text-[#1b1c1a]"
              }`}
            >
              <LayoutGrid className="h-4 w-4" strokeWidth={1.75} />
              {t("kanban")}
            </button>
          </div>

          <button
            type="button"
            onClick={() => setDrawerOpen(true)}
            className="font-inter flex items-center gap-2 rounded-lg bg-[#52634c] px-4 py-2.5 text-sm font-semibold text-white transition-all hover:-translate-y-px hover:opacity-95"
          >
            <Plus className="h-4 w-4" strokeWidth={2.5} />
            {t("newProject")}
          </button>
        </div>
      </div>

      {/* Filtres (vue List) */}
      {view === "list" && (
        <div className="mb-6 flex flex-wrap gap-2">
          {FILTERS.map((f) => (
            <button
              key={f}
              type="button"
              onClick={() => setFilter(f)}
              className={`font-inter rounded-full px-4 py-1.5 text-sm font-medium transition-colors ${
                filter === f
                  ? "bg-[#52634c] text-white"
                  : "border border-[#c4c8be] bg-[#efeeea] text-[#444841] hover:bg-[#e6e4df]"
              }`}
            >
              {f === "ALL" ? t("allProjects") : ts(`project.${f}`)}
            </button>
          ))}
        </div>
      )}

      {/* Contenu */}
      {view === "list" ? (
        visible.length === 0 ? (
          <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-[#c4c8be] bg-white/50 py-20">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[#efeeea]">
              <FolderOpen className="h-6 w-6 text-outline" strokeWidth={1.5} />
            </div>
            <p className="font-manrope mt-4 text-base font-semibold text-[#1b1c1a]">
              {t("noProjects")}
            </p>
            <p className="font-inter mt-1 text-sm text-[#444841]">
              {filter === "ALL"
                ? t("emptyDefault")
                : t("emptyFiltered", { status: ts(`project.${filter}`) })}
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
            {visible.map((p, i) => (
              <ProjectCard key={p.id} project={p} index={i} />
            ))}
          </div>
        )
      ) : (
        <DndContext sensors={sensors} onDragEnd={handleDragEnd}>
          <div className="flex gap-4 overflow-x-auto pb-4">
            {STATUS_ORDER.map((s) => (
              <KanbanColumn key={s} status={s} projects={grouped[s]} />
            ))}
          </div>
        </DndContext>
      )}

      {/* Compteur d'usage */}
      <UsageMeter
        label={t("usageLabel")}
        current={projects.length}
        max={limits ? limits.projects : undefined}
      />

      {/* Drawer */}
      <NewProjectDrawer
        open={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        onCreated={() => {
          setDrawerOpen(false);
          loadProjects();
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
