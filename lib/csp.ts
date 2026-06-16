/**
 * Construit la Content-Security-Policy de Kora pour un nonce donné.
 *
 * La CSP est générée **par requête** (le nonce change à chaque fois) et posée
 * dans `middleware.ts` — elle ne peut donc pas vivre dans `next.config.mjs`
 * (headers statiques évalués au build).
 *
 * `script-src` : pas de `'unsafe-inline'` (noté "unsafe" par Mozilla
 * Observatory). À la place, un `'nonce-…'` cryptographique + `'strict-dynamic'`
 * (les scripts chargés par un script déjà fiable le deviennent → Stripe.js,
 * Vercel Insights). Sous `'strict-dynamic'`, les hôtes `js.stripe.com` /
 * `*.vercel-insights.com` sont ignorés par les navigateurs modernes — gardés en
 * fallback pour les navigateurs CSP2.
 *
 * `style-src` garde `'unsafe-inline'` volontairement : Next/Tailwind injectent
 * trop de styles inline pour les nonce proprement, et Observatory ne pénalise
 * pas les styles inline.
 */
export function buildCsp(nonce: string): string {
  return [
    "default-src 'self'",
    `script-src 'self' 'nonce-${nonce}' 'strict-dynamic' js.stripe.com *.vercel-insights.com`,
    "style-src 'self' 'unsafe-inline'",
    "img-src 'self' data: blob: *.supabase.co",
    "connect-src 'self' *.supabase.co api.stripe.com *.sentry.io *.upstash.io resend.com",
    "frame-src js.stripe.com",
    "object-src 'none'",
    "base-uri 'self'",
    "form-action 'self'",
    "frame-ancestors 'none'",
  ].join("; ");
}
