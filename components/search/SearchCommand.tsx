"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Search, Users, Briefcase, FileText } from "lucide-react";

// ───────────────────────── Types ─────────────────────────

type ContactHit = {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
};
type ProjectHit = { id: string; name: string; status: string };
type DocumentHit = {
  id: string;
  title: string;
  number: string | null;
  type: string;
};

type SearchResults = {
  contacts: ContactHit[];
  projects: ProjectHit[];
  documents: DocumentHit[];
};

/**
 * Recherche globale de la Topbar.
 * - Déclencheur : bouton stylé comme l'ancien input + raccourci ⌘/Ctrl + K.
 * - Modal centrée : recherche temps réel (debounce 300 ms) sur `/api/search`,
 *   résultats groupés (Contacts / Projets / Documents), navigation au clic.
 */
export function SearchCommand() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchResults | null>(null);
  const [loading, setLoading] = useState(false);

  // Raccourci ⌘/Ctrl + K (toggle) + Échap (ferme).
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setOpen((v) => !v);
      } else if (e.key === "Escape") {
        setOpen(false);
      }
    }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, []);

  // Réinitialise à la fermeture.
  useEffect(() => {
    if (!open) {
      setQuery("");
      setResults(null);
      setLoading(false);
    }
  }, [open]);

  // Recherche debouncée (300 ms).
  useEffect(() => {
    const q = query.trim();
    if (!q) {
      setResults(null);
      setLoading(false);
      return;
    }
    setLoading(true);
    let active = true;
    const timer = setTimeout(async () => {
      try {
        const res = await fetch(`/api/search?q=${encodeURIComponent(q)}`);
        const data: SearchResults = await res.json();
        if (active) setResults(data);
      } catch {
        if (active) setResults({ contacts: [], projects: [], documents: [] });
      } finally {
        if (active) setLoading(false);
      }
    }, 300);
    return () => {
      active = false;
      clearTimeout(timer);
    };
  }, [query]);

  function go(href: string) {
    setOpen(false);
    router.push(href);
  }

  const hasQuery = query.trim().length > 0;
  const total = results
    ? results.contacts.length + results.projects.length + results.documents.length
    : 0;

  const rowClass =
    "flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left transition-colors hover:bg-[#f5f3f0]";
  const headerClass =
    "font-inter px-3 pb-1 pt-3 text-[11px] font-semibold uppercase tracking-wide text-[#444841]";

  return (
    <>
      {/* Déclencheur (desktop) */}
      <div className="hidden flex-1 justify-center md:flex">
        <button
          type="button"
          onClick={() => setOpen(true)}
          aria-label="Search"
          className="relative flex h-10 w-full max-w-[400px] items-center rounded-lg border border-transparent bg-surface-container pl-9 pr-2 text-left transition-colors hover:border-primary/30"
        >
          <Search
            className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-outline"
            strokeWidth={1.75}
          />
          <span className="font-inter flex-1 truncate text-sm text-outline">
            Search projects, contacts, documents...
          </span>
          <kbd className="font-inter ml-2 hidden shrink-0 items-center rounded border border-outline-variant/60 bg-white px-1.5 py-0.5 text-[11px] font-medium text-on-surface-variant lg:inline-flex">
            ⌘K
          </kbd>
        </button>
      </div>

      {/* Modal */}
      {open && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label="Search"
          onMouseDown={(e) => {
            if (e.target === e.currentTarget) setOpen(false);
          }}
          className="fixed inset-0 z-[60] flex items-start justify-center bg-black/30 px-4 pt-[12vh]"
        >
          <div className="w-full max-w-[560px] overflow-hidden rounded-2xl bg-white shadow-[0_20px_60px_rgba(0,0,0,0.25)]">
            {/* Champ de recherche */}
            <div className="relative border-b border-[#c4c8be]/60">
              <Search
                className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-outline"
                strokeWidth={1.75}
              />
              {/* eslint-disable-next-line jsx-a11y/no-autofocus */}
              <input
                autoFocus
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search projects, contacts, documents..."
                className="font-inter h-14 w-full bg-transparent pl-12 pr-4 text-base text-on-surface placeholder:text-outline focus:outline-none"
              />
            </div>

            {/* Résultats */}
            <div className="max-h-[60vh] overflow-y-auto p-2">
              {!hasQuery ? (
                <p className="font-inter px-3 py-6 text-center text-sm text-[#444841]">
                  Type to search across your studio.
                </p>
              ) : results && total > 0 ? (
                <div className="flex flex-col">
                  {results.contacts.length > 0 && (
                    <div>
                      <p className={headerClass}>Contacts</p>
                      {results.contacts.map((c) => (
                        <button
                          key={c.id}
                          type="button"
                          onClick={() => go(`/contacts/${c.id}`)}
                          className={rowClass}
                        >
                          <Users
                            className="h-[18px] w-[18px] shrink-0 text-[#52634c]"
                            strokeWidth={1.75}
                          />
                          <span className="min-w-0 flex-1">
                            <span className="font-manrope block truncate text-sm font-semibold text-[#1b1c1a]">
                              {c.firstName} {c.lastName}
                            </span>
                            <span className="font-inter block truncate text-xs text-[#444841]">
                              {c.email}
                            </span>
                          </span>
                        </button>
                      ))}
                    </div>
                  )}

                  {results.projects.length > 0 && (
                    <div>
                      <p className={headerClass}>Projets</p>
                      {results.projects.map((p) => (
                        <button
                          key={p.id}
                          type="button"
                          onClick={() => go("/projects")}
                          className={rowClass}
                        >
                          <Briefcase
                            className="h-[18px] w-[18px] shrink-0 text-[#52634c]"
                            strokeWidth={1.75}
                          />
                          <span className="min-w-0 flex-1">
                            <span className="font-manrope block truncate text-sm font-semibold text-[#1b1c1a]">
                              {p.name}
                            </span>
                            <span className="font-inter block truncate text-xs capitalize text-[#444841]">
                              {p.status.toLowerCase()}
                            </span>
                          </span>
                        </button>
                      ))}
                    </div>
                  )}

                  {results.documents.length > 0 && (
                    <div>
                      <p className={headerClass}>Documents</p>
                      {results.documents.map((d) => (
                        <button
                          key={d.id}
                          type="button"
                          onClick={() => go("/documents")}
                          className={rowClass}
                        >
                          <FileText
                            className="h-[18px] w-[18px] shrink-0 text-[#52634c]"
                            strokeWidth={1.75}
                          />
                          <span className="min-w-0 flex-1">
                            <span className="font-manrope block truncate text-sm font-semibold text-[#1b1c1a]">
                              {d.title}
                            </span>
                            <span className="font-inter block truncate text-xs text-[#444841]">
                              {d.number ?? d.type}
                            </span>
                          </span>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              ) : loading ? (
                <p className="font-inter px-3 py-6 text-center text-sm text-[#444841]">
                  Searching…
                </p>
              ) : (
                <p className="font-inter px-3 py-6 text-center text-sm text-[#444841]">
                  No results found.
                </p>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
