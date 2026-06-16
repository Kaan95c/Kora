import { withSentryConfig } from "@sentry/nextjs";
import createNextIntlPlugin from "next-intl/plugin";

const withNextIntl = createNextIntlPlugin("./i18n/request.ts");

// Security headers statiques appliqués à toutes les routes (défense en
// profondeur). La Content-Security-Policy n'est PAS ici : elle utilise un nonce
// par requête (impossible en statique) → générée dans middleware.ts (lib/csp.ts).
const securityHeaders = [
  { key: "X-Frame-Options", value: "DENY" },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "X-DNS-Prefetch-Control", value: "on" },
  {
    key: "Permissions-Policy",
    value: "camera=(), microphone=(), geolocation=()",
  },
  {
    // HSTS : ignoré sur http (localhost), actif en prod https.
    key: "Strict-Transport-Security",
    value: "max-age=63072000; includeSubDomains; preload",
  },
];

/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: {
    // @react-pdf/renderer embarque des deps natives (fontkit, yoga) qui ne
    // doivent pas être bundlées par Next → on les garde externes côté serveur.
    serverComponentsExternalPackages: ["@react-pdf/renderer"],
    // Charge instrumentation.ts (init Sentry par runtime).
    instrumentationHook: true,
  },
  async headers() {
    return [{ source: "/:path*", headers: securityHeaders }];
  },
};

// Sentry n'enrobe la config QUE si un DSN est présent (prod/Vercel) → le build
// local sans variables Sentry n'active jamais le plugin webpack.
const config = process.env.NEXT_PUBLIC_SENTRY_DSN
  ? withSentryConfig(nextConfig, {
      org: process.env.SENTRY_ORG,
      project: process.env.SENTRY_PROJECT,
      authToken: process.env.SENTRY_AUTH_TOKEN,
      silent: true,
      widenClientFileUpload: true,
    })
  : nextConfig;

export default withNextIntl(config);
