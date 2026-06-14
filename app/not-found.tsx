import Link from "next/link";
import { getTranslations } from "next-intl/server";

/** Page 404 personnalisée (brandée Kora). */
export default async function NotFound() {
  const t = await getTranslations("errors");
  return (
    <main className="flex min-h-screen flex-col items-center justify-center bg-[#fbf9f5] px-6 text-center">
      <p className="font-manrope text-[64px] font-bold leading-none text-[#52634c] md:text-[88px]">
        404
      </p>
      <h1 className="font-manrope mt-2 text-[24px] font-bold text-[#1b1c1a] md:text-[32px]">
        {t("notFoundTitle")}
      </h1>
      <p className="font-inter mt-3 max-w-md text-base text-[#444841]">
        {t("notFoundText")}
      </p>
      <Link
        href="/dashboard"
        className="font-manrope mt-8 flex h-12 items-center justify-center rounded-lg bg-[#52634c] px-6 text-[15px] font-semibold text-white transition-all duration-150 hover:-translate-y-px hover:bg-[#3b4b36]"
      >
        {t("backToDashboard")}
      </Link>
    </main>
  );
}
