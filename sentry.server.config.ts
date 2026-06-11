import * as Sentry from "@sentry/nextjs";

// Init seulement si un DSN est fourni → no-op en dev / sans config.
const dsn = process.env.NEXT_PUBLIC_SENTRY_DSN;
if (dsn) {
  Sentry.init({
    dsn,
    tracesSampleRate: 0.1,
    enabled: process.env.NODE_ENV === "production",
  });
}
