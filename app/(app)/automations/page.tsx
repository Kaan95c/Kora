"use client";

import { useEffect, useMemo, useState, type ReactNode } from "react";
import {
  Plus,
  Zap,
  Clock,
  TrendingUp,
  ChevronRight,
  Pencil,
  Trash2,
  X,
  ArrowUp,
  ArrowDown,
} from "lucide-react";

import {
  TRIGGERS,
  ACTION_TYPES,
  TRIGGER_CONFIG,
  ACTION_CONFIG,
  lastTriggeredLabel,
  delayLabel,
  type AutomationTrigger,
  type ActionType,
} from "@/lib/automations";
import { UsageMeter } from "@/components/shared/UsageMeter";
import { PlanLimitDialog } from "@/components/shared/PlanLimitDialog";
import { useAuth } from "@/lib/hooks/useAuth";

// ───────────────────────── Types ─────────────────────────

type Action = { id: string; type: ActionType; order: number; delayHours: number };

type Automation = {
  id: string;
  name: string;
  description: string | null;
  isActive: boolean;
  trigger: AutomationTrigger;
  lastTriggeredAt: string | null;
  triggerCount: number;
  createdAt: string;
  actions: Action[];
};

// Action côté formulaire (drawer).
type FormAction = {
  key: string;
  type: ActionType;
  delayValue: string;
  delayUnit: "hours" | "days";
};

const uid = () =>
  typeof crypto !== "undefined" && crypto.randomUUID
    ? crypto.randomUUID()
    : Math.random().toString(36).slice(2);

// ───────────────────────── Toggle ─────────────────────────

function Toggle({
  on,
  onClick,
}: {
  on: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={on}
      onClick={onClick}
      className={`relative h-6 w-11 shrink-0 rounded-full transition-colors ${
        on ? "bg-[#52634c]" : "bg-[#c4c8be]"
      }`}
    >
      <span
        className={`absolute top-0.5 h-5 w-5 rounded-full bg-white shadow-sm transition-all ${
          on ? "left-[22px]" : "left-0.5"
        }`}
      />
    </button>
  );
}

// ───────────────────────── Flow (trigger → actions) ─────────────────────────

function FlowBlock({
  icon: Icon,
  label,
  variant,
}: {
  icon: typeof Zap;
  label: string;
  variant: "trigger" | "action";
}) {
  return (
    <span
      className={`font-inter inline-flex shrink-0 items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs font-semibold ${
        variant === "trigger"
          ? "bg-[#d5e8cb] text-[#3b4b36]"
          : "bg-[#efeeea] text-[#444841]"
      }`}
    >
      <Icon className="h-3.5 w-3.5" strokeWidth={1.75} />
      {label}
    </span>
  );
}

// ───────────────────────── Drawer New / Edit ─────────────────────────

function AutomationDrawer({
  open,
  editing,
  onClose,
  onSaved,
  onLimit,
}: {
  open: boolean;
  editing: Automation | null;
  onClose: () => void;
  onSaved: () => void;
  onLimit: (message: string) => void;
}) {
  const [trigger, setTrigger] = useState<AutomationTrigger | null>(null);
  const [actions, setActions] = useState<FormAction[]>([]);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    setError(null);
    setSaving(false);
    if (editing) {
      setTrigger(editing.trigger);
      setName(editing.name);
      setDescription(editing.description ?? "");
      setActions(
        editing.actions.map((a) => {
          const isDays = a.delayHours > 0 && a.delayHours % 24 === 0;
          return {
            key: uid(),
            type: a.type,
            delayValue: String(isDays ? a.delayHours / 24 : a.delayHours),
            delayUnit: isDays ? "days" : "hours",
          };
        })
      );
    } else {
      setTrigger(null);
      setName("");
      setDescription("");
      setActions([]);
    }
  }, [open, editing]);

  function addAction() {
    setActions((prev) => [
      ...prev,
      { key: uid(), type: "SEND_EMAIL", delayValue: "0", delayUnit: "hours" },
    ]);
  }
  function removeAction(key: string) {
    setActions((prev) => prev.filter((a) => a.key !== key));
  }
  function updateAction<K extends keyof FormAction>(
    key: string,
    field: K,
    value: FormAction[K]
  ) {
    setActions((prev) =>
      prev.map((a) => (a.key === key ? { ...a, [field]: value } : a))
    );
  }
  function move(index: number, dir: -1 | 1) {
    setActions((prev) => {
      const next = [...prev];
      const j = index + dir;
      if (j < 0 || j >= next.length) return prev;
      [next[index], next[j]] = [next[j], next[index]];
      return next;
    });
  }

  async function save() {
    if (!trigger) return setError("Pick a trigger.");
    if (!name.trim()) return setError("Give your automation a name.");
    setSaving(true);
    setError(null);
    const payload = {
      name,
      description,
      trigger,
      actions: actions.map((a) => ({
        type: a.type,
        delayHours:
          (Number(a.delayValue) || 0) * (a.delayUnit === "days" ? 24 : 1),
      })),
    };
    const res = await fetch(
      editing ? `/api/automations/${editing.id}` : "/api/automations",
      {
        method: editing ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      }
    );
    setSaving(false);
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      if (res.status === 403 && data?.code === "PLAN_LIMIT_REACHED") {
        return onLimit(data.error);
      }
      return setError(data.error ?? "Failed to save.");
    }
    onSaved();
  }

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
        className={`absolute right-0 top-0 flex h-full w-full flex-col bg-white shadow-[-8px_0_40px_rgba(0,0,0,0.12)] transition-transform duration-300 ease-out sm:w-[500px] ${
          open ? "translate-x-0" : "translate-x-full"
        }`}
        style={{ borderTopLeftRadius: 16, borderBottomLeftRadius: 16 }}
      >
        <div className="flex items-center justify-between border-b border-[#efeeea] px-6 py-5">
          <h2 className="font-manrope text-xl font-semibold text-[#1b1c1a]">
            {editing ? "Edit Automation" : "New Automation"}
          </h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="flex h-8 w-8 items-center justify-center rounded-full text-[#444841] transition-colors hover:bg-[#f5f3f0]"
          >
            <X className="h-5 w-5" strokeWidth={1.75} />
          </button>
        </div>

        <div className="flex-1 space-y-7 overflow-y-auto px-6 py-6">
          {/* Étape 1 — Trigger */}
          <div>
            <h3 className="font-manrope text-sm font-semibold text-[#1b1c1a]">
              When this happens…
            </h3>
            <div className="mt-3 grid grid-cols-2 gap-2">
              {TRIGGERS.map((t) => {
                const cfg = TRIGGER_CONFIG[t];
                const Icon = cfg.icon;
                const active = trigger === t;
                return (
                  <button
                    key={t}
                    type="button"
                    onClick={() => setTrigger(t)}
                    className={`flex items-center gap-2.5 rounded-xl border px-3 py-2.5 text-left transition-colors ${
                      active
                        ? "border-[#52634c] bg-[#d5e8cb]"
                        : "border-[#c4c8be] bg-white hover:bg-[#f5f3f0]"
                    }`}
                  >
                    <Icon
                      className={`h-4 w-4 shrink-0 ${active ? "text-[#3b4b36]" : "text-[#52634c]"}`}
                      strokeWidth={1.75}
                    />
                    <span className="font-inter text-[13px] font-medium text-[#1b1c1a]">
                      {cfg.label}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Étape 2 — Actions */}
          <div>
            <div className="flex items-center justify-between">
              <h3 className="font-manrope text-sm font-semibold text-[#1b1c1a]">
                Then do this…
              </h3>
              <button
                type="button"
                onClick={addAction}
                className="font-inter flex items-center gap-1 rounded-lg border border-[#c4c8be] bg-white px-2.5 py-1.5 text-xs font-medium text-[#52634c] transition-colors hover:bg-[#f5f3f0]"
              >
                <Plus className="h-3.5 w-3.5" strokeWidth={2} />
                Add action
              </button>
            </div>

            <div className="mt-3 space-y-2">
              {actions.length === 0 && (
                <p className="font-inter rounded-xl border border-dashed border-[#c4c8be] py-5 text-center text-xs text-outline">
                  No actions yet — add at least one.
                </p>
              )}
              {actions.map((a, i) => (
                <div
                  key={a.key}
                  className="flex items-center gap-2 rounded-xl border border-[#c4c8be]/60 bg-[#fbf9f5] p-2.5"
                >
                  <div className="flex shrink-0 flex-col">
                    <button
                      type="button"
                      onClick={() => move(i, -1)}
                      disabled={i === 0}
                      aria-label="Move up"
                      className="text-outline transition-colors hover:text-[#1b1c1a] disabled:opacity-30"
                    >
                      <ArrowUp className="h-3.5 w-3.5" strokeWidth={2} />
                    </button>
                    <button
                      type="button"
                      onClick={() => move(i, 1)}
                      disabled={i === actions.length - 1}
                      aria-label="Move down"
                      className="text-outline transition-colors hover:text-[#1b1c1a] disabled:opacity-30"
                    >
                      <ArrowDown className="h-3.5 w-3.5" strokeWidth={2} />
                    </button>
                  </div>

                  <select
                    value={a.type}
                    onChange={(e) =>
                      updateAction(a.key, "type", e.target.value as ActionType)
                    }
                    className="font-inter min-w-0 flex-1 rounded-lg border border-[#c4c8be] bg-white px-2 py-2 text-[13px] text-[#1b1c1a] outline-none focus:border-[#52634c]"
                  >
                    {ACTION_TYPES.map((t) => (
                      <option key={t} value={t}>
                        {ACTION_CONFIG[t].label}
                      </option>
                    ))}
                  </select>

                  <input
                    type="number"
                    min="0"
                    value={a.delayValue}
                    onChange={(e) =>
                      updateAction(a.key, "delayValue", e.target.value)
                    }
                    aria-label="Delay"
                    className="font-inter w-14 rounded-lg border border-[#c4c8be] bg-white px-2 py-2 text-[13px] text-[#1b1c1a] outline-none focus:border-[#52634c]"
                  />
                  <select
                    value={a.delayUnit}
                    onChange={(e) =>
                      updateAction(
                        a.key,
                        "delayUnit",
                        e.target.value as "hours" | "days"
                      )
                    }
                    className="font-inter rounded-lg border border-[#c4c8be] bg-white px-1.5 py-2 text-[13px] text-[#444841] outline-none focus:border-[#52634c]"
                  >
                    <option value="hours">hrs</option>
                    <option value="days">days</option>
                  </select>

                  <button
                    type="button"
                    onClick={() => removeAction(a.key)}
                    aria-label="Remove action"
                    className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-outline transition-colors hover:bg-error-container hover:text-[#93000a]"
                  >
                    <X className="h-4 w-4" strokeWidth={1.75} />
                  </button>
                </div>
              ))}
            </div>
          </div>

          {/* Étape 3 — Nom */}
          <div>
            <h3 className="font-manrope text-sm font-semibold text-[#1b1c1a]">
              Name
            </h3>
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Automation name"
              className="font-inter mt-3 w-full rounded-lg border border-[#c4c8be] bg-white px-3 py-2.5 text-sm text-[#1b1c1a] outline-none transition-colors placeholder:text-outline focus:border-[#52634c]"
            />
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={2}
              placeholder="Description (optional)"
              className="font-inter mt-2 w-full resize-y rounded-lg border border-[#c4c8be] bg-white px-3 py-2.5 text-sm text-[#1b1c1a] outline-none transition-colors placeholder:text-outline focus:border-[#52634c]"
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
            Cancel
          </button>
          <button
            type="button"
            onClick={save}
            disabled={saving}
            className="font-inter rounded-lg bg-[#52634c] px-5 py-2.5 text-sm font-semibold text-white transition-all hover:-translate-y-px hover:opacity-95 disabled:opacity-60"
          >
            {saving ? "Saving…" : editing ? "Save automation" : "Create automation"}
          </button>
        </div>
      </aside>
    </div>
  );
}

// ───────────────────────── Stat card ─────────────────────────

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

// ───────────────────────── Page ─────────────────────────

export default function AutomationsPage() {
  const [automations, setAutomations] = useState<Automation[] | null>(null);
  const [drawer, setDrawer] = useState<{ open: boolean; editing: Automation | null }>(
    { open: false, editing: null }
  );
  const [limitMsg, setLimitMsg] = useState<string | null>(null);
  const { limits } = useAuth();

  async function load() {
    try {
      const res = await fetch("/api/automations");
      const data = await res.json();
      setAutomations(Array.isArray(data) ? data : []);
    } catch {
      setAutomations([]);
    }
  }

  useEffect(() => {
    load();
  }, []);

  const stats = useMemo(() => {
    const list = automations ?? [];
    const active = list.filter((a) => a.isActive).length;
    const triggered = list.reduce((s, a) => s + a.triggerCount, 0);
    const timeSaved = Math.max(0, Math.round(triggered * 0.25)); // ~15 min / trigger
    return { active, triggered, timeSaved };
  }, [automations]);

  async function toggle(a: Automation) {
    setAutomations((prev) =>
      prev
        ? prev.map((x) =>
            x.id === a.id ? { ...x, isActive: !x.isActive } : x
          )
        : prev
    );
    const res = await fetch(`/api/automations/${a.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ isActive: !a.isActive }),
    });
    if (!res.ok) load();
  }

  async function remove(a: Automation) {
    if (!window.confirm(`Delete "${a.name}"?`)) return;
    setAutomations((prev) => (prev ? prev.filter((x) => x.id !== a.id) : prev));
    const res = await fetch(`/api/automations/${a.id}`, { method: "DELETE" });
    if (!res.ok) load();
  }

  // ─── Skeleton ───
  if (automations === null) {
    return (
      <div className="animate-pulse">
        <div className="mb-6 flex items-start justify-between">
          <div className="space-y-2">
            <div className="h-8 w-56 rounded-xl bg-[#efeeea]" />
            <div className="h-4 w-72 rounded-lg bg-[#efeeea]" />
          </div>
          <div className="h-10 w-44 rounded-lg bg-[#efeeea]" />
        </div>
        <div className="mb-6 grid grid-cols-1 gap-4 md:grid-cols-3">
          {[0, 1, 2].map((i) => (
            <div key={i} className="h-24 rounded-2xl bg-[#efeeea]" />
          ))}
        </div>
        <div className="space-y-4">
          {[0, 1, 2].map((i) => (
            <div key={i} className="h-32 rounded-2xl bg-[#efeeea]" />
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
          <h1 className="font-manrope text-[28px] font-semibold tracking-[-0.01em] text-[#1b1c1a]">
            Automations
          </h1>
          <p className="font-inter mt-1 text-base text-[#444841]">
            Automate your client workflows.
          </p>
        </div>
        <button
          type="button"
          onClick={() => setDrawer({ open: true, editing: null })}
          className="font-inter flex items-center gap-2 rounded-lg bg-[#52634c] px-4 py-2.5 text-sm font-semibold text-white transition-all hover:-translate-y-px hover:opacity-95"
        >
          <Plus className="h-4 w-4" strokeWidth={2.5} />
          New Automation
        </button>
      </div>

      {/* Stats */}
      <div className="mb-6 grid grid-cols-1 gap-4 md:grid-cols-3">
        <StatCard
          label="Active automations"
          value={String(stats.active)}
          tile="#d5e8cb"
          icon={<Zap className="h-4 w-4 text-[#3b4b36]" strokeWidth={1.75} />}
        />
        <StatCard
          label="Triggered this month"
          value={String(stats.triggered)}
          tile="#f8dac5"
          icon={<TrendingUp className="h-4 w-4 text-[#574333]" strokeWidth={1.75} />}
        />
        <StatCard
          label="Time saved"
          value={`${stats.timeSaved}h`}
          tile="#efeeea"
          icon={<Clock className="h-4 w-4 text-[#52634c]" strokeWidth={1.75} />}
        />
      </div>

      {/* Liste */}
      {automations.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-[#c4c8be] bg-white/50 py-20">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[#efeeea]">
            <Zap className="h-6 w-6 text-outline" strokeWidth={1.5} />
          </div>
          <p className="font-manrope mt-4 text-base font-semibold text-[#1b1c1a]">
            No automations yet
          </p>
          <p className="font-inter mt-1 text-sm text-[#444841]">
            Create your first workflow to save time on repetitive tasks.
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {automations.map((a) => {
            const tcfg = TRIGGER_CONFIG[a.trigger];
            const TIcon = tcfg.icon;
            return (
              <div
                key={a.id}
                className="rounded-2xl bg-white p-5 shadow-card transition-shadow hover:shadow-card-hover"
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="min-w-0">
                    <h3 className="font-manrope text-base font-semibold text-[#1b1c1a]">
                      {a.name}
                    </h3>
                    {a.description && (
                      <p className="font-inter mt-0.5 text-sm text-[#444841]">
                        {a.description}
                      </p>
                    )}
                  </div>
                  <Toggle on={a.isActive} onClick={() => toggle(a)} />
                </div>

                {/* Flow */}
                <div className="mt-4 flex flex-wrap items-center gap-1.5">
                  <FlowBlock icon={TIcon} label={tcfg.label} variant="trigger" />
                  {a.actions.map((act) => {
                    const acfg = ACTION_CONFIG[act.type];
                    return (
                      <span key={act.id} className="flex items-center gap-1.5">
                        <ChevronRight
                          className="h-3.5 w-3.5 text-[#c4c8be]"
                          strokeWidth={2}
                        />
                        <FlowBlock
                          icon={acfg.icon}
                          label={`${acfg.label}${
                            act.delayHours
                              ? ` · ${delayLabel(act.delayHours)}`
                              : ""
                          }`}
                          variant="action"
                        />
                      </span>
                    );
                  })}
                </div>

                {/* Footer */}
                <div className="mt-4 flex items-center justify-between border-t border-[#f5f3f0] pt-3">
                  <span className="font-inter text-xs text-[#444841]">
                    {lastTriggeredLabel(a.lastTriggeredAt)}
                  </span>
                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      onClick={() => setDrawer({ open: true, editing: a })}
                      aria-label="Edit automation"
                      className="flex h-8 w-8 items-center justify-center rounded-full text-[#444841] transition-colors hover:bg-[#efeeea]"
                    >
                      <Pencil className="h-4 w-4" strokeWidth={1.75} />
                    </button>
                    <button
                      type="button"
                      onClick={() => remove(a)}
                      aria-label="Delete automation"
                      className="flex h-8 w-8 items-center justify-center rounded-full text-[#444841] transition-colors hover:bg-error-container hover:text-[#93000a]"
                    >
                      <Trash2 className="h-4 w-4" strokeWidth={1.75} />
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Compteur d'usage */}
      <UsageMeter
        label="automatisations"
        current={automations.length}
        max={limits ? limits.automations : undefined}
      />

      {/* Drawer */}
      <AutomationDrawer
        open={drawer.open}
        editing={drawer.editing}
        onClose={() => setDrawer((d) => ({ ...d, open: false }))}
        onSaved={() => {
          setDrawer({ open: false, editing: null });
          load();
        }}
        onLimit={(msg) => {
          setDrawer({ open: false, editing: null });
          setLimitMsg(msg);
        }}
      />

      {/* Modal limite de plan */}
      <PlanLimitDialog message={limitMsg} onClose={() => setLimitMsg(null)} />
    </div>
  );
}
