/**
 * Point d'entrée d'instrumentation Next.js (chargé via
 * `experimental.instrumentationHook`). Charge la config Sentry adaptée au
 * runtime. No-op tant qu'aucun DSN n'est défini.
 */
export async function register() {
  if (process.env.NEXT_RUNTIME === "nodejs") {
    await import("./sentry.server.config");
  }
  if (process.env.NEXT_RUNTIME === "edge") {
    await import("./sentry.edge.config");
  }
}
