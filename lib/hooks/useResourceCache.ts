"use client";

/**
 * Cache client minimal « stale-while-revalidate ».
 *
 * Les pages `(app)` sont des client components qui fetchent en `useEffect` :
 * sans cache, revenir sur une page refait tout le chargement (skeleton + appels
 * API). Ce module garde en mémoire (durée de vie de l'onglet) la dernière
 * réponse réussie de chaque ressource → au retour, on **réaffiche
 * instantanément** la donnée en cache, puis on **revalide en arrière-plan**.
 *
 * Volontairement simple (Map module-level, pas de dépendance type SWR/React
 * Query) : on n'expose pas de cache HTTP partagé (dangereux sur des routes
 * authentifiées par cookie), le cache reste strictement côté client courant.
 *
 * Convention d'usage dans une page :
 *   const [items, setItems] = useState(() => readCache<Item[]>(KEY) ?? null);
 *   async function load() { const d = await fetch(...); writeCache(KEY, d); setItems(d); }
 *   useEffect(() => { load(); }, []);            // cache affiché d'office, revalidé ici
 * et sur mutation : writeCache(KEY, next) en miroir de l'état optimiste.
 */

const store = new Map<string, unknown>();

/** Dernière valeur connue pour cette clé (undefined si jamais chargée). */
export function readCache<T>(key: string): T | undefined {
  return store.get(key) as T | undefined;
}

/** Mémorise la valeur courante (après un fetch réussi ou une mutation optimiste). */
export function writeCache<T>(key: string, value: T): void {
  store.set(key, value);
}

/** Invalide une clé (force un rechargement complet au prochain montage). */
export function clearCache(key: string): void {
  store.delete(key);
}

/** Vide tout le cache (ex. au sign-out). */
export function clearAllCache(): void {
  store.clear();
}

// Clés centralisées pour éviter les fautes de frappe entre pages.
export const CACHE_KEYS = {
  contacts: "contacts:list",
  projects: "projects:list",
  dashboard: "dashboard:bundle",
} as const;
