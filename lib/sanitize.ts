/**
 * Nettoie un texte libre (notes, corps de message, sujet) avant stockage.
 *
 * Défense en profondeur : le rendu passe déjà par React / react-email (qui
 * échappent automatiquement). On retire ici tout balisage HTML **sans
 * dépendance DOM** (jsdom / isomorphic-dompurify se bundlent mal dans le
 * runtime serverless Vercel → 500 à l'import sur contacts/appointments/...).
 * Suffisant ici car l'objectif est de retirer TOUT tag, pas d'en autoriser.
 */

// Retire les balises bien formées (commençant par une lettre ou « /lettre »).
// Un « < » ou « > » légitime dans le texte (ex. « 5 < 3 ») n'est pas touché.
function stripTags(input: string): string {
  return input
    // <script>/<style> + leur contenu
    .replace(/<(script|style)\b[^>]*>[\s\S]*?<\/\1>/gi, "")
    // toute autre balise <tag …> ou </tag>
    .replace(/<\/?[a-zA-Z][^>]*>/g, "");
}

export function sanitizeText(input: string): string {
  return stripTags(input).trim();
}

/** Variante optionnelle : renvoie `null` si vide/absent après nettoyage. */
export function sanitizeNullable(
  input: string | null | undefined
): string | null {
  if (input === null || input === undefined) return null;
  const clean = sanitizeText(input);
  return clean === "" ? null : clean;
}
