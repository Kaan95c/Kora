"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useTranslations } from "next-intl";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import {
  Wallet,
  FolderOpen,
  FileText,
  MoreHorizontal,
  AlertCircle,
  Mail,
} from "lucide-react";

import StatusBadge from "@/components/shared/StatusBadge";
import { useAuth } from "@/lib/hooks/useAuth";

// ───────────────────────── Types ─────────────────────────

type Metrics = {
  monthlyRevenue: number;
  revenueGrowth: number;
  activeProjects: number;
  projectsDueThisWeek: number;
  pendingDocuments: number;
  requireSignature: number;
};

type RevenuePoint = { month: string; amount: number };

type DashboardProject = {
  id: string;
  name: string;
  status: string;
  totalAmount: number;
  paidAmount: number;
  endDate: string | null;
  contact: { firstName: string; lastName: string } | null;
};

type DashboardAppointment = {
  id: string;
  title: string;
  startAt: string;
  endAt: string | null;
  notes: string | null;
};

type DashboardTask = {
  id: string;
  title: string;
  description: string | null;
  priority: string;
  project: { id: string; name: string } | null;
};

// ─── Config visuelle des cartes "Urgent Tasks" (par index) ───
const TASK_VISUALS = [
  { Icon: AlertCircle, color: "#ba1a1a", linkKey: "reviewNow", href: "/projects" },
  { Icon: FileText, color: "#444841", linkKey: "sendNow", href: "/documents" },
  { Icon: Mail, color: "#444841", linkKey: "openInbox", href: "/inbox" },
] as const;

const PROJECT_TILE_COLORS = ["#d5e8cb", "#f8dac5", "#efeeea"];

function initialsOf(name: string) {
  return name
    .split(" ")
    .slice(0, 2)
    .map((w) => w[0] ?? "")
    .join("")
    .toUpperCase();
}

export default function DashboardPage() {
  const t = useTranslations("dashboard");
  const { user } = useAuth();
  const firstName =
    (user?.user_metadata?.full_name as string | undefined)?.split(" ")[0] ??
    "there";

  const [metrics, setMetrics] = useState<Metrics | null>(null);
  const [revenueChart, setRevenueChart] = useState<RevenuePoint[] | null>(null);
  const [projects, setProjects] = useState<DashboardProject[] | null>(null);
  const [appointments, setAppointments] = useState<
    DashboardAppointment[] | null
  >(null);
  const [tasks, setTasks] = useState<DashboardTask[] | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      try {
        const [m, r, p, a, t] = await Promise.all([
          fetch("/api/dashboard/metrics").then((res) => res.json()),
          fetch("/api/dashboard/revenue-chart").then((res) => res.json()),
          fetch("/api/dashboard/projects?limit=3").then((res) => res.json()),
          fetch("/api/dashboard/appointments?limit=3").then((res) =>
            res.json()
          ),
          fetch("/api/dashboard/tasks").then((res) => res.json()),
        ]);
        setMetrics(m);
        setRevenueChart(r);
        setProjects(p);
        setAppointments(a);
        setTasks(t);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  // ───────────────────── Skeleton loading ─────────────────────
  if (
    loading ||
    !metrics ||
    !revenueChart ||
    !projects ||
    !appointments ||
    !tasks
  ) {
    return (
      <div className="animate-pulse">
        <div className="mb-8 flex items-start justify-between">
          <div className="space-y-3">
            <div className="h-12 w-80 rounded-2xl bg-[#efeeea]" />
            <div className="h-4 w-96 rounded-lg bg-[#efeeea]" />
          </div>
          <div className="h-7 w-32 rounded-full bg-[#efeeea]" />
        </div>
        <div className="mb-6 grid grid-cols-1 gap-4 md:grid-cols-3 md:gap-6">
          {[0, 1, 2].map((i) => (
            <div key={i} className="h-32 rounded-2xl bg-[#efeeea]" />
          ))}
        </div>
        <div className="mb-6 grid grid-cols-1 gap-4 lg:grid-cols-5 lg:gap-6">
          <div className="h-72 rounded-2xl bg-[#efeeea] lg:col-span-3" />
          <div className="h-72 rounded-2xl bg-[#efeeea] lg:col-span-2" />
        </div>
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2 lg:gap-6">
          <div className="h-64 rounded-2xl bg-[#efeeea]" />
          <div className="h-64 rounded-2xl bg-[#efeeea]" />
        </div>
      </div>
    );
  }

  // ───────────────────────── Render ─────────────────────────
  return (
    <div>
      {/* HEADER */}
      <div className="mb-8 flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
        <div>
          <h1 className="font-manrope text-[32px] font-bold leading-tight tracking-[-0.02em] text-[#52634c] md:text-[48px]">
            {t("greeting", { name: firstName })}
          </h1>
          <p className="font-inter mt-1 text-base text-[#444841]">
            {t("subtitle")}
          </p>
        </div>
        <span className="font-inter inline-flex items-center gap-2 rounded-full bg-[#efeeea] px-3 py-1.5 text-xs font-semibold text-[#444841]">
          <span className="h-2 w-2 animate-pulse rounded-full bg-[#52634c]" />
          {t("liveOverview")}
        </span>
      </div>

      {/* 3 METRIC CARDS */}
      <div className="mb-6 grid grid-cols-1 gap-4 md:grid-cols-3 md:gap-6">
        {/* Monthly Revenue */}
        <div className="rounded-2xl bg-white p-6 shadow-[0_4px_20px_rgba(0,0,0,0.04)]">
          <div className="flex items-center justify-between">
            <span className="font-inter text-[11px] font-semibold uppercase tracking-widest text-[#444841]">
              {t("monthlyRevenue")}
            </span>
            <Wallet className="h-5 w-5 text-[#52634c]" strokeWidth={1.75} />
          </div>
          <p className="font-manrope mt-3 text-4xl font-semibold text-[#1b1c1a]">
            ${metrics.monthlyRevenue.toLocaleString()}
          </p>
          <p
            className={`font-inter mt-2 text-xs ${
              metrics.revenueGrowth >= 0 ? "text-[#52634c]" : "text-[#ba1a1a]"
            }`}
          >
            {metrics.revenueGrowth >= 0 ? "↗" : "↘"}{" "}
            {Math.abs(metrics.revenueGrowth)}% {t("fromLastMonth")}
          </p>
        </div>

        {/* Active Projects */}
        <div className="rounded-2xl bg-white p-6 shadow-[0_4px_20px_rgba(0,0,0,0.04)]">
          <div className="flex items-center justify-between">
            <span className="font-inter text-[11px] font-semibold uppercase tracking-widest text-[#444841]">
              {t("activeProjects")}
            </span>
            <FolderOpen className="h-5 w-5 text-[#52634c]" strokeWidth={1.75} />
          </div>
          <p className="font-manrope mt-3 text-4xl font-semibold text-[#1b1c1a]">
            {metrics.activeProjects}
          </p>
          <p className="font-inter mt-2 text-xs text-[#444841]">
            ⏱ {t("dueThisWeek", { count: metrics.projectsDueThisWeek })}
          </p>
        </div>

        {/* Pending Documents */}
        <div className="rounded-2xl bg-white p-6 shadow-[0_4px_20px_rgba(0,0,0,0.04)]">
          <div className="flex items-center justify-between">
            <span className="font-inter text-[11px] font-semibold uppercase tracking-widest text-[#444841]">
              {t("pendingDocuments")}
            </span>
            <FileText className="h-5 w-5 text-[#52634c]" strokeWidth={1.75} />
          </div>
          <p className="font-manrope mt-3 text-4xl font-semibold text-[#1b1c1a]">
            {metrics.pendingDocuments}
          </p>
          <p className="font-inter mt-2 text-xs text-[#ba1a1a]">
            ⚠ {t("requireSignature", { count: metrics.requireSignature })}
          </p>
        </div>
      </div>

      {/* SECTION CENTRALE */}
      <div className="mb-6 grid grid-cols-1 gap-4 lg:grid-cols-5 lg:gap-6">
        {/* Revenue Growth */}
        <div className="rounded-2xl bg-white p-6 shadow-[0_4px_20px_rgba(0,0,0,0.04)] lg:col-span-3">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="font-manrope text-xl font-semibold text-[#1b1c1a]">
              {t("revenueGrowth")}
            </h2>
            <select
              defaultValue="12"
              className="font-inter rounded-lg border-none bg-[#efeeea] px-3 py-1.5 text-sm text-[#444841] focus:outline-none"
            >
              <option value="12">{t("last12Months")}</option>
              <option value="6">{t("last6Months")}</option>
              <option value="30">{t("last30Days")}</option>
            </select>
          </div>
          <ResponsiveContainer width="100%" height={220}>
            <AreaChart
              data={revenueChart}
              margin={{ top: 10, right: 10, left: 0, bottom: 0 }}
            >
              <defs>
                <linearGradient id="revenueGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#52634c" stopOpacity={0.15} />
                  <stop offset="100%" stopColor="#52634c" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid
                strokeDasharray="3 3"
                stroke="#c4c8be"
                opacity={0.4}
                vertical={false}
              />
              <XAxis
                dataKey="month"
                tick={{ fontSize: 11, fill: "#444841" }}
                tickLine={false}
                axisLine={false}
              />
              <YAxis
                tickFormatter={(value) => `$${Number(value) / 1000}k`}
                tick={{ fontSize: 11, fill: "#444841" }}
                tickLine={false}
                axisLine={false}
                width={45}
              />
              <Tooltip
                contentStyle={{
                  background: "#ffffff",
                  border: "1px solid #c4c8be",
                  borderRadius: 8,
                  fontSize: 13,
                }}
                formatter={(value) => [
                  `$${Number(value).toLocaleString()}`,
                  "Revenue",
                ]}
              />
              <Area
                type="monotone"
                dataKey="amount"
                stroke="#52634c"
                strokeWidth={2}
                fill="url(#revenueGradient)"
                dot={{ fill: "#52634c", r: 3, strokeWidth: 0 }}
                activeDot={{ r: 5, fill: "#52634c" }}
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        {/* Upcoming */}
        <div className="rounded-2xl bg-white p-6 shadow-[0_4px_20px_rgba(0,0,0,0.04)] lg:col-span-2">
          <div className="mb-2 flex items-center justify-between">
            <h2 className="font-manrope text-xl font-semibold text-[#1b1c1a]">
              {t("upcoming")}
            </h2>
            <MoreHorizontal className="h-[18px] w-[18px] text-[#c4c8be]" />
          </div>
          <div className="divide-y divide-[#c4c8be]/30">
            {appointments.map((apt) => {
              const date = new Date(apt.startAt);
              return (
                <div key={apt.id} className="flex gap-3 py-3">
                  <div className="flex h-11 w-11 shrink-0 flex-col items-center justify-center rounded-xl bg-[#efeeea]">
                    <span className="font-inter text-[9px] font-bold text-[#52634c]">
                      {date
                        .toLocaleString("fr", { month: "short" })
                        .toUpperCase()}
                    </span>
                    <span className="font-manrope text-lg font-bold leading-none text-[#1b1c1a]">
                      {date.getDate()}
                    </span>
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="font-manrope text-sm font-semibold text-[#1b1c1a]">
                      {apt.title}
                    </p>
                    <p className="font-inter mt-0.5 text-xs text-[#444841]">
                      {date.toLocaleTimeString("fr", {
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                      {apt.notes ? ` · ${apt.notes}` : ""}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
          <Link
            href="/scheduler"
            className="font-inter mt-4 block w-full rounded-xl border border-[#c4c8be] py-2 text-center text-sm text-[#444841] transition-colors hover:bg-[#f5f3f0]"
          >
            {t("viewFullCalendar")}
          </Link>
        </div>
      </div>

      {/* SECTION BASSE */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2 lg:gap-6">
        {/* Recent Projects */}
        <div className="rounded-2xl bg-white p-6 shadow-[0_4px_20px_rgba(0,0,0,0.04)]">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="font-manrope text-xl font-semibold text-[#1b1c1a]">
              {t("recentProjects")}
            </h2>
            <Link
              href="/projects"
              className="font-inter text-sm text-[#52634c] hover:underline"
            >
              {t("viewAll")}
            </Link>
          </div>

          <div className="grid grid-cols-4 border-b border-[#c4c8be]/50 pb-3">
            {["colProject", "colClient", "colStatus", "colDeadline"].map((k) => (
              <span
                key={k}
                className="font-inter text-[10px] font-bold uppercase tracking-wide text-[#444841]"
              >
                {t(k)}
              </span>
            ))}
          </div>

          <div className="divide-y divide-[#f5f3f0]">
            {projects.map((project, i) => {
              const clientName = project.contact
                ? `${project.contact.firstName} ${project.contact.lastName}`
                : "—";
              return (
                <div
                  key={project.id}
                  className="grid grid-cols-4 items-center rounded-xl py-3 transition-colors hover:bg-[#f5f3f0]"
                >
                  <div className="flex items-center gap-2">
                    <div
                      className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl"
                      style={{
                        backgroundColor:
                          PROJECT_TILE_COLORS[i % PROJECT_TILE_COLORS.length],
                      }}
                    >
                      <span className="font-inter text-xs font-bold text-[#444841]">
                        {initialsOf(project.name)}
                      </span>
                    </div>
                    <span className="font-manrope text-sm font-semibold text-[#1b1c1a]">
                      {project.name}
                    </span>
                  </div>
                  <span className="font-inter text-sm text-[#444841]">
                    {clientName}
                  </span>
                  <div>
                    <StatusBadge status={project.status} />
                  </div>
                  <span className="font-inter text-sm text-[#444841]">
                    {project.endDate
                      ? new Date(project.endDate).toLocaleDateString("en", {
                          month: "short",
                          day: "numeric",
                        })
                      : "—"}
                  </span>
                </div>
              );
            })}
          </div>
        </div>

        {/* Urgent Tasks */}
        <div className="rounded-2xl bg-white p-6 shadow-[0_4px_20px_rgba(0,0,0,0.04)]">
          <div className="mb-4 flex items-center gap-3">
            <h2 className="font-manrope text-xl font-semibold text-[#1b1c1a]">
              {t("urgentTasks")}
            </h2>
            <span className="font-inter rounded-full bg-[#ffdad6] px-3 py-1 text-[11px] font-bold text-[#93000a]">
              {t("actionNeeded", { count: tasks.length })}
            </span>
          </div>

          <div className="flex flex-col gap-3">
            {tasks.map((task, i) => {
              const visual = TASK_VISUALS[i % TASK_VISUALS.length];
              const Icon = visual.Icon;
              const href =
                visual.linkKey === "reviewNow" && task.project?.id
                  ? `/projects/${task.project.id}`
                  : visual.href;
              return (
                <div key={task.id} className="rounded-xl bg-[#fbf9f5] p-4">
                  <div className="flex items-start gap-3">
                    <Icon
                      size={18}
                      className="mt-0.5 shrink-0"
                      style={{ color: visual.color }}
                    />
                    <div className="min-w-0 flex-1">
                      <p className="font-manrope text-sm font-semibold text-[#1b1c1a]">
                        {task.title}
                      </p>
                      {task.description && (
                        <p className="font-inter mt-0.5 line-clamp-2 text-xs text-[#444841]">
                          {task.description}
                        </p>
                      )}
                      <Link
                        href={href}
                        className="font-inter mt-2 inline-block text-xs font-medium text-[#52634c] hover:underline"
                      >
                        {t(visual.linkKey)}
                      </Link>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
