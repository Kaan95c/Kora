// Helpers partagés de l'Inbox (libellés de dates).

function startOfDay(d: Date): Date {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x;
}

/** Libellé d'un séparateur de groupe : "Today" / "Yesterday" / "Oct 12" / "Oct 12, 2024". */
export function dayGroupLabel(d: Date | string): string {
  const date = new Date(d);
  const today = startOfDay(new Date());
  const day = startOfDay(date);
  const diffDays = Math.round(
    (today.getTime() - day.getTime()) / 86_400_000
  );
  if (diffDays === 0) return "Today";
  if (diffDays === 1) return "Yesterday";
  const sameYear = date.getFullYear() === new Date().getFullYear();
  return date.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: sameYear ? undefined : "numeric",
  });
}

/** Clé de groupe stable (YYYY-MM-DD) pour regrouper les messages par jour. */
export function dayKey(d: Date | string): string {
  const x = new Date(d);
  return `${x.getFullYear()}-${x.getMonth()}-${x.getDate()}`;
}

/** Heure courte "HH:mm". */
export function timeLabel(d: Date | string): string {
  return new Date(d).toLocaleTimeString("en-GB", {
    hour: "2-digit",
    minute: "2-digit",
  });
}

/** Date compacte pour la liste des conversations : heure si aujourd'hui, sinon jour. */
export function conversationDate(d: Date | string): string {
  const date = new Date(d);
  const today = startOfDay(new Date());
  const day = startOfDay(date);
  const diffDays = Math.round((today.getTime() - day.getTime()) / 86_400_000);
  if (diffDays === 0) return timeLabel(date);
  if (diffDays === 1) return "Yesterday";
  const sameYear = date.getFullYear() === new Date().getFullYear();
  return date.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: sameYear ? undefined : "numeric",
  });
}
