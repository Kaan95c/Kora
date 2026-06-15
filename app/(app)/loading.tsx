/**
 * Skeleton de navigation (App Router) : affiché instantanément pendant le
 * chargement du segment de route, avant le montage de la page. Évite l'écran
 * blanc entre deux pages. Volontairement générique (header + grille de cartes)
 * — chaque page rend ensuite son propre skeleton plus précis pendant son fetch.
 */
export default function AppLoading() {
  return (
    <div className="animate-pulse" aria-hidden="true">
      {/* En-tête */}
      <div className="mb-8 flex items-start justify-between gap-4">
        <div className="space-y-3">
          <div className="h-9 w-64 rounded-xl bg-[#efeeea]" />
          <div className="h-4 w-80 rounded-lg bg-[#efeeea]" />
        </div>
        <div className="h-9 w-32 rounded-full bg-[#efeeea]" />
      </div>

      {/* Bandeau de cartes */}
      <div className="mb-6 grid grid-cols-1 gap-4 md:grid-cols-3 md:gap-6">
        {[0, 1, 2].map((i) => (
          <div key={i} className="h-28 rounded-2xl bg-[#efeeea]" />
        ))}
      </div>

      {/* Bloc principal */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3 lg:gap-6">
        <div className="h-72 rounded-2xl bg-[#efeeea] lg:col-span-2" />
        <div className="h-72 rounded-2xl bg-[#efeeea]" />
      </div>
    </div>
  );
}
