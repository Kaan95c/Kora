import { getRequestConfig } from "next-intl/server";
import { cookies } from "next/headers";

export const locales = ["fr", "en"] as const;
export type Locale = (typeof locales)[number];
export const defaultLocale: Locale = "fr";

/**
 * Config de requête next-intl SANS routing par URL : la locale provient du
 * cookie `kora-locale` (défaut `fr`). Lue côté serveur → SSR correct, pas de
 * flash de langue. Le changement = set cookie + `router.refresh()`.
 */
export default getRequestConfig(async () => {
  const cookieLocale = cookies().get("kora-locale")?.value;
  const locale: Locale = cookieLocale === "en" ? "en" : defaultLocale;

  return {
    locale,
    messages: (await import(`../messages/${locale}.json`)).default,
  };
});
