// Helpers partagés du Scheduler (calendrier Week/Month + drawer).

export const START_HOUR = 8; // début de la grille horaire (Week view)
export const END_HOUR = 20; // fin
export const HOUR_HEIGHT = 56; // px par heure

export const HOURS: number[] = Array.from(
  { length: END_HOUR - START_HOUR },
  (_, i) => START_HOUR + i
);

export const WEEK_DAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

// Palette pour les types de session (et couleur par défaut des blocs).
export const PALETTE = [
  "#52634c",
  "#705a4a",
  "#8b9d83",
  "#b0846a",
  "#5f7a8a",
  "#9a7b4f",
];

export const DEFAULT_EVENT_COLOR = "#52634c";

// ───────────────────────── Dates ─────────────────────────

export function startOfDay(d: Date): Date {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x;
}

/** Lundi 00:00 de la semaine contenant `d`. */
export function startOfWeek(d: Date): Date {
  const x = startOfDay(d);
  const dow = (x.getDay() + 6) % 7; // 0 = lundi
  x.setDate(x.getDate() - dow);
  return x;
}

export function addDays(d: Date, n: number): Date {
  const x = new Date(d);
  x.setDate(x.getDate() + n);
  return x;
}

export function addMonths(d: Date, n: number): Date {
  const x = new Date(d);
  x.setMonth(x.getMonth() + n);
  return x;
}

export function startOfMonth(d: Date): Date {
  const x = startOfDay(d);
  x.setDate(1);
  return x;
}

export function isSameDay(a: Date, b: Date): boolean {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}

export function isSameMonth(a: Date, b: Date): boolean {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth();
}

/** Matrice 6×7 (jours) couvrant le mois de `cursor`, alignée sur lundi. */
export function monthMatrix(cursor: Date): Date[][] {
  const first = startOfWeek(startOfMonth(cursor));
  const weeks: Date[][] = [];
  for (let w = 0; w < 6; w++) {
    const row: Date[] = [];
    for (let d = 0; d < 7; d++) row.push(addDays(first, w * 7 + d));
    weeks.push(row);
  }
  return weeks;
}

// ───────────────────────── Formatage ─────────────────────────

export function formatTime(d: Date | string): string {
  return new Date(d).toLocaleTimeString("en-GB", {
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function hourLabel(h: number): string {
  return `${String(h).padStart(2, "0")}:00`;
}

export function monthLabel(d: Date): string {
  return d.toLocaleDateString("en-US", { month: "long", year: "numeric" });
}

export function weekRangeLabel(weekStart: Date): string {
  const end = addDays(weekStart, 6);
  const sameMonth = weekStart.getMonth() === end.getMonth();
  const left = weekStart.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
  });
  const right = end.toLocaleDateString("en-US", {
    month: sameMonth ? undefined : "short",
    day: "numeric",
    year: "numeric",
  });
  return `${left} – ${right}`;
}

// ───────────────────────── Inputs (datetime-local décomposé) ─────────────────────────

export function toDateInput(d: Date): string {
  const x = new Date(d);
  const m = String(x.getMonth() + 1).padStart(2, "0");
  const day = String(x.getDate()).padStart(2, "0");
  return `${x.getFullYear()}-${m}-${day}`;
}

export function toTimeInput(d: Date): string {
  const x = new Date(d);
  const h = String(x.getHours()).padStart(2, "0");
  const min = String(x.getMinutes()).padStart(2, "0");
  return `${h}:${min}`;
}

/** Combine "YYYY-MM-DD" + "HH:mm" en Date locale. */
export function combineLocal(dateStr: string, timeStr: string): Date {
  return new Date(`${dateStr}T${timeStr || "00:00"}`);
}

// ───────────────────────── Positionnement Week view ─────────────────────────

export function minutesIntoDay(d: Date | string): number {
  const x = new Date(d);
  return x.getHours() * 60 + x.getMinutes();
}

export function durationMinutes(
  start: Date | string,
  end: Date | string | null
): number {
  if (!end) return 60;
  const ms = new Date(end).getTime() - new Date(start).getTime();
  return Math.max(15, Math.round(ms / 60000));
}
