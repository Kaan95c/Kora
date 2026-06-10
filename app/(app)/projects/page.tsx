"use client";

import { useEffect, useMemo, useState } from "react";
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
  type LucideIcon,
} from "lucide-react";

import { StatusBadge, type StatusVariant } from "@/components/shared/StatusBadge";

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

const STATUS_LABEL: Record<ProjectStatus, string> = {
  INQUIRY: "Inquiry",
  FOLLOW_UP: "Follow-up",
  BOOKING: "Booking",
  ACTIVE: "Active",
  ARCHIVED: "Archived",
};

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

const FILTERS: { label: string; value: ProjectStatus | "ALL" }[] = [
  { label: "All Projects", value: "ALL" },
  { label: "Inquiry", value: "INQUIRY" },
  { label: "Follow-up", value: "FOLLOW_UP" },
  { label: "Booking", value: "BOOKING" },
  { label: "Active", value: "ACTIVE" },
  { label: "Archived", value: "ARCHIVED" },
];

// ───────────────────────── Helpers ─────────────────────────

const money = (n: number) => `$${n.toLocaleString()}`;

function initials(p: Project) {
  if (p.contact) {
    return `${p.contact.firstName[0] ?? ""}${p.contact.lastName[0] ?? ""}`.toUpperCase();
  }
  return "—";
}

function clientName(p: Project) {
  return p.contact ? `${p.contact.firstName} ${p.contact.lastName}` : "No client";
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
  const Icon = PROJECT_ICONS[index % PROJECT_ICONS.length];
  const pct = progress(project);

  return (
    <div className="group rounded-2xl bg-white p-6 shadow-card transition-all duration-200 hover:-translate-y-0.5 hover:shadow-card-hover">
      <div className="flex items-start justify-between">
        <div
          className="flex h-11 w-11 items-center justify-center rounded-xl"
          style={{ backgroundColor: STATUS_TILE[project.status] }}
        >
          <Icon className="h-5 w-5 text-[#52634c]" strokeWidth={1.75} />
        </div>
        <StatusBadge
          status={STATUS_LABEL[project.status]}
          variant={STATUS_VARIANT[project.status]}
        />
      </div>

      <h3 className="font-manrope mt-4 text-xl font-semibold text-[#1b1c1a]">
        {project.name}
      </h3>
      <p className="font-inter mt-1 text-sm text-[#444841]">
        Client: {clientName(project)}
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
          {project._count.tasks} tasks · {project._count.documents} docs
        </span>
      </div>
    </div>
  );
}

// ───────────────────────── Kanban ─────────────────────────

function KanbanCard({ project }: { project: Project }) {
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
      {...listeners}
      {...attributes}
      className={`cursor-grab touch-none rounded-xl border border-[#c4c8be]/50 bg-white p-3 active:cursor-grabbing ${
        isDragging ? "opacity-60 shadow-card-hover" : "shadow-sm"
      }`}
    >
      <p className="font-manrope text-sm font-semibold text-[#1b1c1a]">
        {project.name}
      </p>
      <p className="font-inter mt-0.5 text-xs text-[#444841]">
        {clientName(project)}
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
  const { setNodeRef, isOver } = useDroppable({ id: status });

  return (
    <div className="flex w-72 shrink-0 flex-col">
      <div className="mb-3 flex items-center justify-between px-1">
        <StatusBadge
          status={STATUS_LABEL[status]}
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
            Drop here
          </p>
        )}
      </div>
    </div>
  );
}

// ───────────────────────── Page ─────────────────────────

export default function ProjectsPage() {
  const [projects, setProjects] = useState<Project[] | null>(null);
  const [view, setView] = useState<"list" | "kanban">("list");
  const [filter, setFilter] = useState<ProjectStatus | "ALL">("ALL");

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } })
  );

  async function loadProjects() {
    try {
      const res = await fetch("/api/projects");
      const data = await res.json();
      setProjects(Array.isArray(data) ? data : []);
    } catch {
      setProjects([]);
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

    // Optimiste
    setProjects((prev) =>
      prev
        ? prev.map((p) => (p.id === projectId ? { ...p, status: newStatus } : p))
        : prev
    );

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
      <div className="mb-6 flex items-start justify-between gap-4">
        <div>
          <h1 className="font-manrope text-[32px] font-semibold tracking-[-0.01em] text-on-surface">
            Active Projects
          </h1>
          <p className="font-manrope mt-1 text-base font-normal text-on-surface-variant">
            Managing {activeCount} ongoing creative partnership
            {activeCount === 1 ? "" : "s"}.
          </p>
        </div>

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
            List
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
            Kanban
          </button>
        </div>
      </div>

      {/* Filtres (vue List) */}
      {view === "list" && (
        <div className="mb-6 flex flex-wrap gap-2">
          {FILTERS.map((f) => (
            <button
              key={f.value}
              type="button"
              onClick={() => setFilter(f.value)}
              className={`font-inter rounded-full px-4 py-1.5 text-sm font-medium transition-colors ${
                filter === f.value
                  ? "bg-[#52634c] text-white"
                  : "border border-[#c4c8be] bg-[#efeeea] text-[#444841] hover:bg-[#e6e4df]"
              }`}
            >
              {f.label}
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
              No projects here
            </p>
            <p className="font-inter mt-1 text-sm text-[#444841]">
              {filter === "ALL"
                ? "Create your first project to get started."
                : `No projects with status “${STATUS_LABEL[filter]}”.`}
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
    </div>
  );
}
