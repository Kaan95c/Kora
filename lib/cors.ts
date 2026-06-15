/**
 * CORS — allowlist d'origines pour `/api/*`.
 *
 * ⚠️ Le CORS est appliqué par le NAVIGATEUR, ce n'est pas un contrôle d'accès
 * serveur (un `curl` l'ignore). Il empêche un autre site d'appeler l'API depuis
 * le navigateur d'un utilisateur connecté. La vraie barrière reste l'auth.
 *
 * Comme on autorise plusieurs origines, on ne peut pas mettre une valeur
 * statique : on reflète l'Origin de la requête si elle est dans l'allowlist.
 */

const ALLOWED_ORIGINS = [
  "https://kora-app.fr",
  "http://localhost:3000",
];

export function isAllowedOrigin(origin: string | null): origin is string {
  return origin !== null && ALLOWED_ORIGINS.includes(origin);
}

/** Headers CORS à appliquer (vide si l'origine n'est pas autorisée). */
export function corsHeaders(origin: string | null): Record<string, string> {
  if (!isAllowedOrigin(origin)) return {};
  return {
    "Access-Control-Allow-Origin": origin,
    "Access-Control-Allow-Credentials": "true",
    "Access-Control-Allow-Methods": "GET, POST, PUT, PATCH, DELETE, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, Authorization",
    Vary: "Origin",
  };
}
