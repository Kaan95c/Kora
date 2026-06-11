// Security headers appliqués à toutes les routes (défense en profondeur).
// Pas de CSP stricte ici : Next injecte des scripts/styles inline → une CSP
// nécessiterait un setup nonce dédié (risque de casse). À part.
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
  },
  async headers() {
    return [{ source: "/:path*", headers: securityHeaders }];
  },
};

export default nextConfig;
