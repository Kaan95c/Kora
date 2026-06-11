/**
 * Logger minimal, compatible Edge (middleware) ET Node (routes), sans dépendance.
 * - dev  : sortie console lisible + couleurs ANSI.
 * - prod : JSON structuré sur une ligne (compatible Vercel Log Drains).
 */

type Level = "info" | "warn" | "error";

const isProd = process.env.NODE_ENV === "production";

const COLOR: Record<Level, string> = {
  info: "\x1b[36m", // cyan
  warn: "\x1b[33m", // jaune
  error: "\x1b[31m", // rouge
};
const RESET = "\x1b[0m";
const DIM = "\x1b[2m";

function write(level: Level, line: string) {
  if (level === "error") console.error(line);
  else if (level === "warn") console.warn(line);
  else console.log(line);
}

function emit(level: Level, msg: string, context?: Record<string, unknown>) {
  if (isProd) {
    write(
      level,
      JSON.stringify({ level, msg, time: new Date().toISOString(), ...context })
    );
    return;
  }
  const ctx =
    context && Object.keys(context).length
      ? ` ${DIM}${JSON.stringify(context)}${RESET}`
      : "";
  write(level, `${COLOR[level]}${level.toUpperCase()}${RESET} ${msg}${ctx}`);
}

export const logger = {
  info: (msg: string, context?: Record<string, unknown>) =>
    emit("info", msg, context),
  warn: (msg: string, context?: Record<string, unknown>) =>
    emit("warn", msg, context),
  error: (msg: string, context?: Record<string, unknown>) =>
    emit("error", msg, context),
};
