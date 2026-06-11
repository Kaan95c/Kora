import DOMPurify from "isomorphic-dompurify";

/**
 * Nettoie un texte libre (notes, corps de message, sujet) avant stockage.
 *
 * Le rendu se fait déjà via React / react-email (qui ré-échappent), donc le
 * risque XSS est faible — ceci est une défense en profondeur. On RETIRE tout
 * HTML/JS (`ALLOWED_TAGS: []`) puis on redécode les entités de base pour garder
 * un texte brut lisible (sinon « a & b » serait stocké « a &amp; b »).
 */
export function sanitizeText(input: string): string {
  const stripped = DOMPurify.sanitize(input, {
    ALLOWED_TAGS: [],
    ALLOWED_ATTR: [],
    KEEP_CONTENT: true,
  });
  return stripped
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .trim();
}

/** Variante optionnelle : renvoie `null` si vide/absent après nettoyage. */
export function sanitizeNullable(
  input: string | null | undefined
): string | null {
  if (input === null || input === undefined) return null;
  const clean = sanitizeText(input);
  return clean === "" ? null : clean;
}
