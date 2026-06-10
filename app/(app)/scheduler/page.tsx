"use client";

import {
  useEffect,
  useMemo,
  useState,
  type MouseEvent,
  type ReactNode,
} from "react";
import {
  Plus,
  X,
  Trash2,
  ChevronLeft,
  ChevronRight,
  CalendarDays,
  LayoutGrid,
  Clock,
  Check,
} from "lucide-react";

import {
  START_HOUR,
  END_HOUR,
  HOUR_HEIGHT,
  HOURS,
  WEEK_DAYS,
  PALETTE,
  DEFAULT_EVENT_COLOR,
  startOfWeek,
  addDays,
  addMonths,
  isSameDay,
  isSameMonth,
  monthMatrix,
  formatTime,
  hourLabel,
  monthLabel,
  weekRangeLabel,
  toDateInput,
  toTimeInput,
  combineLocal,
  minutesIntoDay,
  durationMinutes,
} from "@/lib/scheduler";

// ───────────────────────── Types ─────────────────────────

type Appt = {
  id: string;
  title: string;
  startAt: string;
  endAt: string | null;
  notes: string | null;
  contactId: string | null;
  sessionTypeId: string | null;
  contact: { firstName: string; lastName: string } | null;
  sessionType: { name: string; color: string } | null;
};

type SessionType = {
  id: string;
  name: string;
  duration: number;
  color: string;
  price: number | null;
};

type Option = { id: string; label: string };

const TOTAL_HEIGHT = HOURS.length * HOUR_HEIGHT;

const apptColor = (a: Appt) => a.sessionType?.color ?? DEFAULT_EVENT_COLOR;

// ───────────────────────── Drawer New / Edit ─────────────────────────

function AppointmentDrawer({
  open,
  editing,
  presetDate,
  contacts,
  types,
  onClose,
  onSaved,
  onDeleted,
}: {
  open: boolean;
  editing: Appt | null;
  presetDate: Date | null;
  contacts: Option[];
  types: SessionType[];
  onClose: () => void;
  onSaved: () => void;
  onDeleted: () => void;
}) {
  const [title, setTitle] = useState("");
  const [sessionTypeId, setSessionTypeId] = useState("");
  const [contactId, setContactId] = useState("");
  const [date, setDate] = useState("");
  const [start, setStart] = useState("09:00");
  const [end, setEnd] = useState("");
  const [notes, setNotes] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    setError(null);
    setSaving(false);
    if (editing) {
      const s = new Date(editing.startAt);
      setTitle(editing.title);
      setSessionTypeId(editing.sessionTypeId ?? "");
      setContactId(editing.contactId ?? "");
      setDate(toDateInput(s));
      setStart(toTimeInput(s));
      setEnd(editing.endAt ? toTimeInput(new Date(editing.endAt)) : "");
      setNotes(editing.notes ?? "");
    } else {
      const base = presetDate ?? new Date();
      setTitle("");
      setSessionTypeId("");
      setContactId("");
      setDate(toDateInput(base));
      setStart(presetDate ? toTimeInput(base) : "09:00");
      setEnd("");
      setNotes("");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, editing, presetDate]);

  // Sélection d'un type → préremplit titre (si vide) + heure de fin via durée.
  function pickType(id: string) {
    setSessionTypeId(id);
    const t = types.find((x) => x.id === id);
    if (!t) return;
    if (!title.trim()) setTitle(t.name);
    if (start) {
      const [h, m] = start.split(":").map(Number);
      const total = h * 60 + m + t.duration;
      const eh = Math.floor((total % 1440) / 60);
      const em = total % 60;
      setEnd(`${String(eh).padStart(2, "0")}:${String(em).padStart(2, "0")}`);
    }
  }

  async function handleSave() {
    if (!title.trim()) return setError("Title is required.");
    if (!date || !start) return setError("Date and start time are required.");
    setSaving(true);
    setError(null);
    const startAt = combineLocal(date, start).toISOString();
    const endAt = end ? combineLocal(date, end).toISOString() : null;
    const payload = {
      title,
      startAt,
      endAt,
      notes,
      contactId: contactId || null,
      sessionTypeId: sessionTypeId || null,
    };
    try {
      const res = await fetch(
        editing ? `/api/appointments/${editing.id}` : "/api/appointments",
        {
          method: editing ? "PUT" : "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        }
      );
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setError(data.error ?? "Failed to save appointment.");
        setSaving(false);
        return;
      }
      onSaved();
    } catch {
      setError("Network error. Please try again.");
      setSaving(false);
    }
  }

  async function handleDelete() {
    if (!editing) return;
    if (!window.confirm("Delete this appointment?")) return;
    setSaving(true);
    const res = await fetch(`/api/appointments/${editing.id}`, {
      method: "DELETE",
    });
    if (res.ok) onDeleted();
    else setSaving(false);
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
        className={`absolute right-0 top-0 flex h-full w-full flex-col bg-white shadow-[-8px_0_40px_rgba(0,0,0,0.12)] transition-transform duration-300 ease-out sm:w-[440px] ${
          open ? "translate-x-0" : "translate-x-full"
        }`}
        style={{ borderTopLeftRadius: 16, borderBottomLeftRadius: 16 }}
      >
        <div className="flex items-center justify-between border-b border-[#efeeea] px-6 py-5">
          <h2 className="font-manrope text-xl font-semibold text-[#1b1c1a]">
            {editing ? "Edit Appointment" : "New Appointment"}
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

        <div className="flex-1 space-y-4 overflow-y-auto px-6 py-6">
          <div>
            <label className={labelCls}>Title</label>
            <input
              className={inputCls}
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Brand identity kickoff"
            />
          </div>

          <div>
            <label className={labelCls}>Session type</label>
            <select
              className={inputCls}
              value={sessionTypeId}
              onChange={(e) => pickType(e.target.value)}
            >
              <option value="">— None —</option>
              {types.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.name} · {t.duration} min
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className={labelCls}>Client</label>
            <select
              className={inputCls}
              value={contactId}
              onChange={(e) => setContactId(e.target.value)}
            >
              <option value="">— No client —</option>
              {contacts.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.label}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className={labelCls}>Date</label>
            <input
              type="date"
              className={inputCls}
              value={date}
              onChange={(e) => setDate(e.target.value)}
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={labelCls}>Start</label>
              <input
                type="time"
                className={inputCls}
                value={start}
                onChange={(e) => setStart(e.target.value)}
              />
            </div>
            <div>
              <label className={labelCls}>End</label>
              <input
                type="time"
                className={inputCls}
                value={end}
                onChange={(e) => setEnd(e.target.value)}
              />
            </div>
          </div>

          <div>
            <label className={labelCls}>Notes</label>
            <textarea
              rows={3}
              className={`${inputCls} resize-y`}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Location, agenda, links…"
            />
          </div>

          {error && (
            <p className="font-inter rounded-lg bg-error-container px-3 py-2 text-sm text-[#93000a]">
              {error}
            </p>
          )}
        </div>

        <div className="flex items-center justify-between gap-3 border-t border-[#efeeea] px-6 py-4">
          {editing ? (
            <button
              type="button"
              onClick={handleDelete}
              disabled={saving}
              className="font-inter flex items-center gap-1.5 rounded-lg px-3 py-2.5 text-sm font-medium text-[#ba1a1a] transition-colors hover:bg-error-container disabled:opacity-60"
            >
              <Trash2 className="h-4 w-4" strokeWidth={1.75} />
              Delete
            </button>
          ) : (
            <span />
          )}
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={onClose}
              className="font-inter rounded-lg px-4 py-2.5 text-sm font-medium text-[#444841] transition-colors hover:bg-[#f5f3f0]"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleSave}
              disabled={saving}
              className="font-inter rounded-lg bg-[#52634c] px-5 py-2.5 text-sm font-semibold text-white transition-all hover:-translate-y-px hover:opacity-95 disabled:opacity-60"
            >
              {saving ? "Saving…" : editing ? "Save" : "Create"}
            </button>
          </div>
        </div>
      </aside>
    </div>
  );
}

// ───────────────────────── Week view ─────────────────────────

function WeekCalendar({
  weekStart,
  appts,
  now,
  onSelect,
  onCreateAt,
}: {
  weekStart: Date;
  appts: Appt[];
  now: Date;
  onSelect: (a: Appt) => void;
  onCreateAt: (d: Date) => void;
}) {
  const days = useMemo(
    () => Array.from({ length: 7 }, (_, i) => addDays(weekStart, i)),
    [weekStart]
  );

  function slotFromClick(e: MouseEvent<HTMLDivElement>, day: Date) {
    const rect = e.currentTarget.getBoundingClientRect();
    const y = e.clientY - rect.top;
    let total = START_HOUR * 60 + (y / HOUR_HEIGHT) * 60;
    total = Math.max(START_HOUR * 60, Math.min(total, END_HOUR * 60 - 30));
    const rounded = Math.round(total / 30) * 30;
    const d = new Date(day);
    d.setHours(Math.floor(rounded / 60), rounded % 60, 0, 0);
    onCreateAt(d);
  }

  return (
    <div className="flex overflow-x-auto">
      {/* Gutter horaire */}
      <div className="w-14 shrink-0">
        <div style={{ height: 40 }} />
        {HOURS.map((h) => (
          <div key={h} style={{ height: HOUR_HEIGHT }} className="relative">
            <span className="font-inter absolute right-2 top-0 -translate-y-1/2 text-[11px] text-outline">
              {hourLabel(h)}
            </span>
          </div>
        ))}
      </div>

      {/* Jours */}
      <div className="grid min-w-[640px] flex-1 grid-cols-7">
        {days.map((day, i) => {
          const today = isSameDay(day, now);
          const dayAppts = appts.filter((a) =>
            isSameDay(new Date(a.startAt), day)
          );
          return (
            <div key={i} className="border-l border-[#f0efea] first:border-l-0">
              {/* En-tête jour */}
              <div
                style={{ height: 40 }}
                className="flex flex-col items-center justify-center border-b border-[#efeeea]"
              >
                <span className="font-inter text-[11px] font-semibold uppercase tracking-wide text-[#444841]">
                  {WEEK_DAYS[i]}
                </span>
                <span
                  className={`font-manrope text-sm font-semibold ${
                    today ? "text-[#52634c]" : "text-[#1b1c1a]"
                  }`}
                >
                  {day.getDate()}
                </span>
              </div>

              {/* Corps colonne */}
              <div
                className="relative cursor-pointer"
                style={{ height: TOTAL_HEIGHT }}
                onClick={(e) => slotFromClick(e, day)}
              >
                {HOURS.map((h) => (
                  <div
                    key={h}
                    style={{ height: HOUR_HEIGHT }}
                    className="border-t border-[#f0efea]"
                  />
                ))}

                {/* Ligne "maintenant" */}
                {today &&
                  minutesIntoDay(now) >= START_HOUR * 60 &&
                  minutesIntoDay(now) <= END_HOUR * 60 && (
                    <div
                      className="pointer-events-none absolute inset-x-0 z-10"
                      style={{
                        top:
                          (minutesIntoDay(now) / 60 - START_HOUR) * HOUR_HEIGHT,
                      }}
                    >
                      <div className="h-px bg-[#ba1a1a]">
                        <span className="absolute -left-1 -top-1 h-2 w-2 rounded-full bg-[#ba1a1a]" />
                      </div>
                    </div>
                  )}

                {/* Blocs */}
                {dayAppts.map((a) => {
                  const color = apptColor(a);
                  const startMin = minutesIntoDay(a.startAt);
                  const dur = durationMinutes(a.startAt, a.endAt);
                  let top = (startMin / 60 - START_HOUR) * HOUR_HEIGHT;
                  let height = (dur / 60) * HOUR_HEIGHT;
                  if (top < 0) {
                    height += top;
                    top = 0;
                  }
                  top = Math.min(top, TOTAL_HEIGHT - 22);
                  height = Math.max(22, Math.min(height, TOTAL_HEIGHT - top));
                  return (
                    <button
                      key={a.id}
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        onSelect(a);
                      }}
                      style={{
                        top,
                        height,
                        backgroundColor: `${color}1f`,
                        borderLeft: `3px solid ${color}`,
                      }}
                      className="absolute inset-x-1 z-20 overflow-hidden rounded-md px-2 py-1 text-left transition-shadow hover:shadow-card"
                    >
                      <p className="font-manrope truncate text-xs font-semibold text-[#1b1c1a]">
                        {a.title}
                      </p>
                      <p className="font-inter truncate text-[11px] text-[#444841]">
                        {formatTime(a.startAt)}
                        {a.endAt ? `–${formatTime(a.endAt)}` : ""}
                      </p>
                    </button>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ───────────────────────── Month view ─────────────────────────

function MonthCalendar({
  cursor,
  appts,
  now,
  onSelect,
  onCreateAt,
}: {
  cursor: Date;
  appts: Appt[];
  now: Date;
  onSelect: (a: Appt) => void;
  onCreateAt: (d: Date) => void;
}) {
  const weeks = useMemo(() => monthMatrix(cursor), [cursor]);

  return (
    <div>
      {/* En-tête jours */}
      <div className="grid grid-cols-7 border-b border-[#efeeea]">
        {WEEK_DAYS.map((d) => (
          <div
            key={d}
            className="font-inter px-3 py-2 text-[11px] font-semibold uppercase tracking-wide text-[#444841]"
          >
            {d}
          </div>
        ))}
      </div>

      {/* Grille */}
      <div className="grid grid-cols-7">
        {weeks.flat().map((day, i) => {
          const inMonth = isSameMonth(day, cursor);
          const today = isSameDay(day, now);
          const dayAppts = appts.filter((a) =>
            isSameDay(new Date(a.startAt), day)
          );
          const d = new Date(day);
          d.setHours(9, 0, 0, 0);
          return (
            <div
              key={i}
              onClick={() => onCreateAt(d)}
              className={`min-h-[104px] cursor-pointer border-b border-r border-[#f0efea] p-2 transition-colors hover:bg-[#fbf9f5] [&:nth-child(7n)]:border-r-0 ${
                inMonth ? "" : "bg-[#faf9f6]"
              }`}
            >
              <div className="mb-1 flex justify-end">
                <span
                  className={`font-inter flex h-6 w-6 items-center justify-center rounded-full text-xs font-semibold ${
                    today
                      ? "bg-[#52634c] text-white"
                      : inMonth
                      ? "text-[#1b1c1a]"
                      : "text-outline"
                  }`}
                >
                  {day.getDate()}
                </span>
              </div>
              <div className="space-y-1">
                {dayAppts.slice(0, 3).map((a) => {
                  const color = apptColor(a);
                  return (
                    <button
                      key={a.id}
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        onSelect(a);
                      }}
                      style={{ backgroundColor: `${color}1f` }}
                      className="flex w-full items-center gap-1.5 truncate rounded px-1.5 py-0.5 text-left"
                    >
                      <span
                        className="h-1.5 w-1.5 shrink-0 rounded-full"
                        style={{ backgroundColor: color }}
                      />
                      <span className="font-inter truncate text-[11px] font-medium text-[#1b1c1a]">
                        {formatTime(a.startAt)} {a.title}
                      </span>
                    </button>
                  );
                })}
                {dayAppts.length > 3 && (
                  <p className="font-inter px-1.5 text-[10px] font-semibold text-outline">
                    +{dayAppts.length - 3} more
                  </p>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ───────────────────────── Panneau Session Types ─────────────────────────

function SessionTypesPanel({
  types,
  onChanged,
}: {
  types: SessionType[];
  onChanged: () => void;
}) {
  const [adding, setAdding] = useState(false);
  const [name, setName] = useState("");
  const [duration, setDuration] = useState("30");
  const [price, setPrice] = useState("");
  const [color, setColor] = useState(PALETTE[0]);
  const [saving, setSaving] = useState(false);

  async function add() {
    if (!name.trim()) return;
    setSaving(true);
    const res = await fetch("/api/session-types", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, duration, color, price }),
    });
    setSaving(false);
    if (res.ok) {
      setName("");
      setDuration("30");
      setPrice("");
      setColor(PALETTE[0]);
      setAdding(false);
      onChanged();
    }
  }

  async function remove(id: string) {
    const res = await fetch(`/api/session-types/${id}`, { method: "DELETE" });
    if (res.ok) onChanged();
  }

  return (
    <div className="rounded-2xl bg-white p-5 shadow-card">
      <div className="mb-4 flex items-center justify-between">
        <h3 className="font-manrope text-base font-semibold text-[#1b1c1a]">
          Session Types
        </h3>
        <button
          type="button"
          onClick={() => setAdding((v) => !v)}
          aria-label="Add session type"
          className="flex h-7 w-7 items-center justify-center rounded-full bg-[#efeeea] text-[#444841] transition-colors hover:bg-[#e6e4df]"
        >
          <Plus className="h-4 w-4" strokeWidth={2} />
        </button>
      </div>

      <div className="space-y-2">
        {types.map((t) => (
          <div
            key={t.id}
            className="group flex items-center gap-3 rounded-xl border border-[#f0efea] px-3 py-2.5"
          >
            <span
              className="h-8 w-1.5 shrink-0 rounded-full"
              style={{ backgroundColor: t.color }}
            />
            <div className="min-w-0 flex-1">
              <p className="font-manrope truncate text-sm font-semibold text-[#1b1c1a]">
                {t.name}
              </p>
              <p className="font-inter flex items-center gap-2 text-xs text-[#444841]">
                <span className="flex items-center gap-1">
                  <Clock className="h-3 w-3" strokeWidth={1.75} />
                  {t.duration} min
                </span>
                <span className="text-outline">·</span>
                <span>{t.price != null ? `$${t.price}` : "Free"}</span>
              </p>
            </div>
            <button
              type="button"
              onClick={() => remove(t.id)}
              aria-label={`Delete ${t.name}`}
              className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-outline opacity-0 transition-all hover:bg-error-container hover:text-[#93000a] group-hover:opacity-100"
            >
              <Trash2 className="h-3.5 w-3.5" strokeWidth={1.75} />
            </button>
          </div>
        ))}

        {types.length === 0 && !adding && (
          <p className="font-inter py-2 text-center text-xs text-outline">
            No session types yet.
          </p>
        )}
      </div>

      {adding && (
        <div className="mt-3 space-y-2.5 rounded-xl bg-[#f5f3f0] p-3">
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Discovery Call"
            className="font-inter w-full rounded-lg border border-[#c4c8be] bg-white px-3 py-2 text-sm outline-none focus:border-[#52634c]"
          />
          <div className="grid grid-cols-2 gap-2">
            <input
              type="number"
              min="5"
              step="5"
              value={duration}
              onChange={(e) => setDuration(e.target.value)}
              placeholder="Min"
              className="font-inter w-full rounded-lg border border-[#c4c8be] bg-white px-3 py-2 text-sm outline-none focus:border-[#52634c]"
            />
            <input
              type="number"
              min="0"
              value={price}
              onChange={(e) => setPrice(e.target.value)}
              placeholder="Price ($)"
              className="font-inter w-full rounded-lg border border-[#c4c8be] bg-white px-3 py-2 text-sm outline-none focus:border-[#52634c]"
            />
          </div>
          <div className="flex items-center gap-1.5">
            {PALETTE.map((c) => (
              <button
                key={c}
                type="button"
                onClick={() => setColor(c)}
                aria-label={`Color ${c}`}
                className={`h-6 w-6 rounded-full transition-transform ${
                  color === c ? "ring-2 ring-[#1b1c1a] ring-offset-1" : ""
                }`}
                style={{ backgroundColor: c }}
              />
            ))}
          </div>
          <div className="flex justify-end gap-2 pt-1">
            <button
              type="button"
              onClick={() => setAdding(false)}
              className="font-inter rounded-lg px-3 py-1.5 text-xs font-medium text-[#444841] hover:bg-[#e6e4df]"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={add}
              disabled={saving}
              className="font-inter flex items-center gap-1 rounded-lg bg-[#52634c] px-3 py-1.5 text-xs font-semibold text-white hover:opacity-95 disabled:opacity-60"
            >
              <Check className="h-3.5 w-3.5" strokeWidth={2} />
              Add
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

// ───────────────────────── Panneau Availability (décoratif) ─────────────────────────

const AVAILABILITY = [
  { day: "Monday", on: true, range: "09:00 – 17:00" },
  { day: "Tuesday", on: true, range: "09:00 – 17:00" },
  { day: "Wednesday", on: true, range: "09:00 – 17:00" },
  { day: "Thursday", on: true, range: "09:00 – 17:00" },
  { day: "Friday", on: true, range: "09:00 – 15:00" },
  { day: "Saturday", on: false, range: "Unavailable" },
  { day: "Sunday", on: false, range: "Unavailable" },
];

function AvailabilityPanel() {
  return (
    <div className="rounded-2xl bg-white p-5 shadow-card">
      <div className="mb-4 flex items-center justify-between">
        <h3 className="font-manrope text-base font-semibold text-[#1b1c1a]">
          Weekly Availability
        </h3>
        <span className="font-inter rounded-full bg-[#efeeea] px-2 py-0.5 text-[10px] font-semibold text-outline">
          Soon
        </span>
      </div>
      <div className="space-y-1.5">
        {AVAILABILITY.map((a) => (
          <div
            key={a.day}
            className="flex items-center justify-between rounded-lg px-1 py-1.5"
          >
            <div className="flex items-center gap-2.5">
              <span
                className={`relative h-4 w-7 rounded-full transition-colors ${
                  a.on ? "bg-[#52634c]" : "bg-[#d8d6d0]"
                }`}
              >
                <span
                  className={`absolute top-0.5 h-3 w-3 rounded-full bg-white transition-all ${
                    a.on ? "left-3.5" : "left-0.5"
                  }`}
                />
              </span>
              <span className="font-inter text-sm font-medium text-[#1b1c1a]">
                {a.day}
              </span>
            </div>
            <span
              className={`font-inter text-xs ${
                a.on ? "text-[#444841]" : "text-outline"
              }`}
            >
              {a.range}
            </span>
          </div>
        ))}
      </div>
      <p className="font-inter mt-3 text-[11px] leading-relaxed text-outline">
        Connect your public booking page to let clients self-schedule.
      </p>
    </div>
  );
}

// ───────────────────────── Helpers UI ─────────────────────────

function ViewToggleButton({
  active,
  onClick,
  icon,
  label,
}: {
  active: boolean;
  onClick: () => void;
  icon: ReactNode;
  label: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`font-inter flex items-center gap-1.5 rounded-full px-3 py-1.5 text-sm font-medium transition-colors ${
        active
          ? "bg-white text-[#1b1c1a] shadow-sm"
          : "text-[#444841] hover:text-[#1b1c1a]"
      }`}
    >
      {icon}
      {label}
    </button>
  );
}

// ───────────────────────── Page ─────────────────────────

export default function SchedulerPage() {
  const [appts, setAppts] = useState<Appt[] | null>(null);
  const [types, setTypes] = useState<SessionType[]>([]);
  const [contacts, setContacts] = useState<Option[]>([]);
  const [view, setView] = useState<"week" | "month">("week");
  const [cursor, setCursor] = useState<Date>(() => new Date());
  const [drawer, setDrawer] = useState<{
    open: boolean;
    editing: Appt | null;
    presetDate: Date | null;
  }>({ open: false, editing: null, presetDate: null });

  const now = useMemo(() => new Date(), []);

  async function loadAppts() {
    try {
      const res = await fetch("/api/appointments");
      const data = await res.json();
      setAppts(Array.isArray(data) ? data : []);
    } catch {
      setAppts([]);
    }
  }
  async function loadTypes() {
    try {
      const res = await fetch("/api/session-types");
      const data = await res.json();
      setTypes(Array.isArray(data) ? data : []);
    } catch {
      setTypes([]);
    }
  }
  async function loadContacts() {
    try {
      const res = await fetch("/api/contacts");
      const data: { id: string; firstName: string; lastName: string }[] =
        await res.json();
      setContacts(
        Array.isArray(data)
          ? data.map((c) => ({ id: c.id, label: `${c.firstName} ${c.lastName}` }))
          : []
      );
    } catch {
      setContacts([]);
    }
  }

  useEffect(() => {
    loadAppts();
    loadTypes();
    loadContacts();
  }, []);

  const weekStart = useMemo(() => startOfWeek(cursor), [cursor]);

  function goPrev() {
    setCursor((c) => (view === "week" ? addDays(c, -7) : addMonths(c, -1)));
  }
  function goNext() {
    setCursor((c) => (view === "week" ? addDays(c, 7) : addMonths(c, 1)));
  }
  function goToday() {
    setCursor(new Date());
  }

  function openCreate(presetDate: Date | null) {
    setDrawer({ open: true, editing: null, presetDate });
  }
  function openEdit(a: Appt) {
    setDrawer({ open: true, editing: a, presetDate: null });
  }
  function closeDrawer() {
    setDrawer((d) => ({ ...d, open: false }));
  }

  const rangeLabel =
    view === "week" ? weekRangeLabel(weekStart) : monthLabel(cursor);

  // ─── Skeleton ───
  if (appts === null) {
    return (
      <div className="animate-pulse">
        <div className="mb-6 flex items-start justify-between">
          <div className="space-y-2">
            <div className="h-9 w-52 rounded-xl bg-[#efeeea]" />
            <div className="h-4 w-80 rounded-lg bg-[#efeeea]" />
          </div>
          <div className="h-10 w-44 rounded-lg bg-[#efeeea]" />
        </div>
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-[1fr_320px]">
          <div className="h-[560px] rounded-2xl bg-[#efeeea]" />
          <div className="space-y-6">
            <div className="h-64 rounded-2xl bg-[#efeeea]" />
            <div className="h-64 rounded-2xl bg-[#efeeea]" />
          </div>
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
            Scheduler
          </h1>
          <p className="font-manrope mt-1 text-base font-normal text-on-surface-variant">
            Plan your sessions and manage your booking types.
          </p>
        </div>
        <button
          type="button"
          onClick={() => openCreate(null)}
          className="font-inter flex items-center gap-2 rounded-lg bg-[#52634c] px-4 py-2.5 text-sm font-semibold text-white transition-all hover:-translate-y-px hover:opacity-95"
        >
          <Plus className="h-4 w-4" strokeWidth={2.5} />
          New Appointment
        </button>
      </div>

      <div className="grid grid-cols-1 items-start gap-6 lg:grid-cols-[1fr_320px]">
        {/* Calendrier */}
        <div className="rounded-2xl bg-white shadow-card">
          {/* Toolbar calendrier */}
          <div className="flex items-center justify-between border-b border-[#efeeea] px-5 py-3.5">
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-1">
                <button
                  type="button"
                  onClick={goPrev}
                  aria-label="Previous"
                  className="flex h-8 w-8 items-center justify-center rounded-full text-[#444841] transition-colors hover:bg-[#efeeea]"
                >
                  <ChevronLeft className="h-4 w-4" />
                </button>
                <button
                  type="button"
                  onClick={goNext}
                  aria-label="Next"
                  className="flex h-8 w-8 items-center justify-center rounded-full text-[#444841] transition-colors hover:bg-[#efeeea]"
                >
                  <ChevronRight className="h-4 w-4" />
                </button>
              </div>
              <h2 className="font-manrope text-lg font-semibold text-[#1b1c1a]">
                {rangeLabel}
              </h2>
              <button
                type="button"
                onClick={goToday}
                className="font-inter rounded-full border border-[#c4c8be] px-3 py-1 text-xs font-medium text-[#444841] transition-colors hover:bg-[#f5f3f0]"
              >
                Today
              </button>
            </div>

            {/* Toggle Week / Month */}
            <div className="flex items-center gap-1 rounded-full bg-[#efeeea] p-1">
              <ViewToggleButton
                active={view === "week"}
                onClick={() => setView("week")}
                icon={<LayoutGrid className="h-4 w-4" strokeWidth={1.75} />}
                label="Week"
              />
              <ViewToggleButton
                active={view === "month"}
                onClick={() => setView("month")}
                icon={<CalendarDays className="h-4 w-4" strokeWidth={1.75} />}
                label="Month"
              />
            </div>
          </div>

          {/* Vue */}
          <div className="p-3">
            {view === "week" ? (
              <WeekCalendar
                weekStart={weekStart}
                appts={appts}
                now={now}
                onSelect={openEdit}
                onCreateAt={openCreate}
              />
            ) : (
              <MonthCalendar
                cursor={cursor}
                appts={appts}
                now={now}
                onSelect={openEdit}
                onCreateAt={openCreate}
              />
            )}
          </div>
        </div>

        {/* Rail droit */}
        <div className="space-y-6">
          <SessionTypesPanel types={types} onChanged={loadTypes} />
          <AvailabilityPanel />
        </div>
      </div>

      {/* Drawer */}
      <AppointmentDrawer
        open={drawer.open}
        editing={drawer.editing}
        presetDate={drawer.presetDate}
        contacts={contacts}
        types={types}
        onClose={closeDrawer}
        onSaved={() => {
          closeDrawer();
          loadAppts();
        }}
        onDeleted={() => {
          closeDrawer();
          loadAppts();
        }}
      />
    </div>
  );
}
