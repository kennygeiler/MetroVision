"use client";

import {
  startTransition,
  useDeferredValue,
  useEffect,
  useMemo,
  useState,
} from "react";
import { ArrowUpDown, ChevronDown, ChevronUp, Search, SlidersHorizontal } from "lucide-react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";

import { ExportButton } from "@/components/export/export-button";
import { buttonVariants } from "@/components/ui/button";
import {
  formatMediaClock,
  formatShotDuration,
  getFramingDisplayName,
  getShotSizeDisplayName,
} from "@/lib/shot-display";
import type { ShotWithDetails } from "@/lib/types";
import {
  FRAMINGS,
  SHOT_SIZES,
  type FramingSlug,
  type ShotSizeSlug,
} from "@/lib/taxonomy";
import { cn } from "@/lib/utils";

type ShotBrowserProps = {
  shots: ShotWithDetails[];
  totalShots: number;
  availableFilmTitles: string[];
  availableDirectors: string[];
  availableShotSizes: ShotSizeSlug[];
};

const SORT_KEYS = [
  "film",
  "director",
  "framing",
  "shotSize",
  "duration",
  "startTc",
  "reviewStatus",
  "confidence",
  "created",
] as const;

type SortKey = (typeof SORT_KEYS)[number];

function isSortKey(value: string | null): value is SortKey {
  return value != null && SORT_KEYS.includes(value as SortKey);
}

function filterShots(
  shots: ShotWithDetails[],
  filters: {
    framing: string;
    filmTitle: string;
    director: string;
    shotSize: string;
  },
) {
  return shots.filter((shot) => {
    if (
      filters.framing !== "all" &&
      shot.metadata.framing !== filters.framing
    ) {
      return false;
    }

    if (filters.director !== "all" && shot.film.director !== filters.director) {
      return false;
    }

    if (filters.filmTitle !== "all" && shot.film.title !== filters.filmTitle) {
      return false;
    }

    if (filters.shotSize !== "all" && shot.metadata.shotSize !== filters.shotSize) {
      return false;
    }

    return true;
  });
}

function sortShots(
  shots: ShotWithDetails[],
  key: SortKey,
  order: "asc" | "desc",
): ShotWithDetails[] {
  const mul = order === "asc" ? 1 : -1;
  const num = (v: number | null | undefined) =>
    v != null && Number.isFinite(v) ? v : order === "asc" ? Number.POSITIVE_INFINITY : Number.NEGATIVE_INFINITY;
  const str = (v: string | null | undefined) => (v ?? "").toLowerCase();

  return [...shots].sort((a, b) => {
    let c = 0;
    switch (key) {
      case "film":
        c = str(a.film.title).localeCompare(str(b.film.title), undefined, { sensitivity: "base" });
        break;
      case "director":
        c = str(a.film.director).localeCompare(str(b.film.director), undefined, { sensitivity: "base" });
        break;
      case "framing":
        c = str(a.metadata.framing).localeCompare(str(b.metadata.framing), undefined, { sensitivity: "base" });
        break;
      case "shotSize":
        c = str(a.metadata.shotSize).localeCompare(str(b.metadata.shotSize), undefined, { sensitivity: "base" });
        break;
      case "duration":
        c = num(a.duration) - num(b.duration);
        break;
      case "startTc":
        c = num(a.startTc) - num(b.startTc);
        break;
      case "reviewStatus":
        c = str(a.metadata.reviewStatus).localeCompare(str(b.metadata.reviewStatus), undefined, { sensitivity: "base" });
        break;
      case "confidence": {
        const ac = a.metadata.confidence;
        const bc = b.metadata.confidence;
        const na = ac != null && Number.isFinite(ac) ? ac : null;
        const nb = bc != null && Number.isFinite(bc) ? bc : null;
        if (na == null && nb == null) return 0;
        if (na == null) return 1;
        if (nb == null) return -1;
        c = na - nb;
        break;
      }
      case "created":
        c = str(a.createdAt).localeCompare(str(b.createdAt), undefined, { sensitivity: "base" });
        break;
      default:
        return 0;
    }
    return c * mul;
  });
}

export function ShotBrowser({
  shots,
  totalShots,
  availableFilmTitles,
  availableDirectors,
  availableShotSizes,
}: ShotBrowserProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const framing = searchParams.get("framing") ?? "all";
  const filmTitle = searchParams.get("filmTitle") ?? "all";
  const director = searchParams.get("director") ?? "all";
  const shotSize = searchParams.get("shotSize") ?? "all";
  const query = searchParams.get("q") ?? "";
  const shotsSortRaw = searchParams.get("shotsSort");
  const shotsOrder = searchParams.get("shotsOrder") === "asc" ? "asc" : "desc";

  const [searchInput, setSearchInput] = useState(query);
  const [searchResults, setSearchResults] = useState<ShotWithDetails[] | null>(
    query ? shots : null,
  );
  const [isSearching, setIsSearching] = useState(false);
  const deferredSearchInput = useDeferredValue(searchInput);

  useEffect(() => {
    setSearchInput(query);
  }, [query]);

  useEffect(() => {
    if (!query) {
      setSearchResults(null);
      setIsSearching(false);
      return;
    }

    let isCancelled = false;

    async function runSearch() {
      setIsSearching(true);

      try {
        const response = await fetch(`/api/search?q=${encodeURIComponent(query)}`, {
          cache: "no-store",
        });

        if (!response.ok) {
          throw new Error("Search request failed.");
        }

        const results = (await response.json()) as ShotWithDetails[];

        if (!isCancelled) {
          setSearchResults(results);
        }
      } catch (error) {
        console.error(error);

        if (!isCancelled) {
          setSearchResults([]);
        }
      } finally {
        if (!isCancelled) {
          setIsSearching(false);
        }
      }
    }

    void runSearch();

    return () => {
      isCancelled = true;
    };
  }, [query]);

  useEffect(() => {
    const normalizedInput = deferredSearchInput.trim();

    if (normalizedInput === query) {
      return;
    }

    const timeoutId = window.setTimeout(() => {
      const params = new URLSearchParams(searchParams.toString());

      if (normalizedInput) {
        params.set("q", normalizedInput);
      } else {
        params.delete("q");
      }

      const nextUrl = params.toString() ? `${pathname}?${params.toString()}` : pathname;

      startTransition(() => {
        router.replace(nextUrl, { scroll: false });
      });
    }, 250);

    return () => window.clearTimeout(timeoutId);
  }, [deferredSearchInput, pathname, query, router, searchParams]);

  function updateFilter(
    key: "framing" | "filmTitle" | "director" | "shotSize",
    value: string,
  ) {
    const params = new URLSearchParams(searchParams.toString());

    if (value === "all") {
      params.delete(key);
    } else {
      params.set(key, value);
    }

    const nextUrl = params.toString() ? `${pathname}?${params.toString()}` : pathname;

    startTransition(() => {
      router.replace(nextUrl, { scroll: false });
    });
  }

  function toggleSort(key: SortKey) {
    const params = new URLSearchParams(searchParams.toString());
    const current = isSortKey(searchParams.get("shotsSort"))
      ? (searchParams.get("shotsSort") as SortKey)
      : null;
    const currentOrder = searchParams.get("shotsOrder") === "asc" ? "asc" : "desc";

    if (current === key) {
      params.set("shotsOrder", currentOrder === "asc" ? "desc" : "asc");
    } else {
      params.set("shotsSort", key);
      params.set("shotsOrder", key === "duration" || key === "startTc" || key === "confidence" ? "desc" : "asc");
    }

    const nextUrl = params.toString() ? `${pathname}?${params.toString()}` : pathname;
    startTransition(() => {
      router.replace(nextUrl, { scroll: false });
    });
  }

  function clearFilters() {
    startTransition(() => {
      router.replace(pathname, { scroll: false });
    });
  }

  const displayedShots = query
    ? filterShots(searchResults ?? shots, {
        framing,
        filmTitle,
        director,
        shotSize,
      })
    : shots;

  const sortKey = isSortKey(shotsSortRaw) ? shotsSortRaw : null;
  const sortedShots = useMemo(() => {
    if (!sortKey) {
      return displayedShots;
    }
    return sortShots(displayedShots, sortKey, shotsOrder);
  }, [displayedShots, sortKey, shotsOrder]);

  const hasActiveFilters =
    Boolean(query) ||
    framing !== "all" ||
    filmTitle !== "all" ||
    director !== "all" ||
    shotSize !== "all" ||
    sortKey !== null;
  const archiveIsEmpty = totalShots === 0;

  function SortTh({
    label,
    sortK,
    className,
  }: {
    label: string;
    sortK: SortKey;
    className?: string;
  }) {
    const active = sortKey === sortK;
    return (
      <th scope="col" className={cn("px-3 py-3 text-left font-mono text-[10px] uppercase tracking-wide", className)}>
        <button
          type="button"
          onClick={() => toggleSort(sortK)}
          className={cn(
            "inline-flex items-center gap-1 rounded-md px-1 py-0.5 text-[var(--color-text-secondary)] transition-colors hover:bg-[var(--color-surface-tertiary)] hover:text-[var(--color-text-primary)]",
            active && "text-[var(--color-text-primary)]",
          )}
        >
          {label}
          {active ? (
            shotsOrder === "asc" ? (
              <ChevronUp className="size-3.5 shrink-0 opacity-90" aria-hidden />
            ) : (
              <ChevronDown className="size-3.5 shrink-0 opacity-90" aria-hidden />
            )
          ) : (
            <ArrowUpDown className="size-3 shrink-0 opacity-40" aria-hidden />
          )}
        </button>
      </th>
    );
  }

  return (
    <div className="space-y-8">
      <section className="max-w-3xl">
        <p className="font-mono text-xs uppercase tracking-[var(--letter-spacing-wide)] text-[var(--color-text-tertiary)]">
          Archive browse
        </p>
        <h1
          className="mt-4 text-4xl font-bold tracking-[var(--letter-spacing-tight)] sm:text-5xl"
          style={{ fontFamily: "var(--font-heading)" }}
        >
          Shot metadata, rendered as motion telemetry
        </h1>
        <p className="mt-4 text-base leading-8 text-[var(--color-text-secondary)]">
          Filter from the toolbar, sort columns on the table, and open a row for full detail. URL params stay in sync
          for sharing.
        </p>
      </section>

      <section
        className="rounded-[var(--radius-xl)] border p-5"
        style={{
          backgroundColor:
            "color-mix(in oklch, var(--color-surface-secondary) 76%, transparent)",
          borderColor:
            "color-mix(in oklch, var(--color-border-default) 72%, transparent)",
        }}
      >
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[var(--color-border-subtle)] pb-4">
          <div className="flex items-center gap-3">
            <span
              className="flex h-9 w-9 items-center justify-center rounded-full border"
              style={{
                backgroundColor:
                  "color-mix(in oklch, var(--color-overlay-arrow) 18%, transparent)",
                borderColor:
                  "color-mix(in oklch, var(--color-overlay-arrow) 68%, transparent)",
              }}
            >
              <SlidersHorizontal
                aria-hidden="true"
                className="h-4 w-4 text-[var(--color-text-primary)]"
              />
            </span>
            <div>
              <p className="font-mono text-xs uppercase tracking-[var(--letter-spacing-wide)] text-[var(--color-text-tertiary)]">
                Archive controls
              </p>
              <p className="text-sm text-[var(--color-text-secondary)]">
                {sortedShots.length} of {totalShots} shots visible
                {sortKey ? (
                  <span className="ml-2 font-mono text-[10px] text-[var(--color-text-tertiary)]">
                    · sorted by {sortKey} ({shotsOrder})
                  </span>
                ) : null}
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <ExportButton
              filters={{
                framing: framing !== "all" ? framing : undefined,
                filmTitle: filmTitle !== "all" ? filmTitle : undefined,
                director: director !== "all" ? director : undefined,
                shotSize: shotSize !== "all" ? shotSize : undefined,
              }}
            />

            {hasActiveFilters ? (
              <button
                type="button"
                onClick={clearFilters}
                className={cn(buttonVariants({ variant: "outline", size: "sm" }), "rounded-full px-3")}
              >
                Clear all
              </button>
            ) : null}
          </div>
        </div>

        <div className="mt-5 grid gap-4 lg:grid-cols-[minmax(0,1.2fr)_minmax(0,1fr)]">
          <div
            className="rounded-[var(--radius-lg)] border p-4"
            style={{
              backgroundColor:
                "color-mix(in oklch, var(--color-surface-primary) 74%, transparent)",
              borderColor:
                "color-mix(in oklch, var(--color-border-subtle) 88%, transparent)",
            }}
          >
            <label
              htmlFor="browse-search"
              className="font-mono text-xs uppercase tracking-[var(--letter-spacing-wide)] text-[var(--color-text-tertiary)]"
            >
              Search title, director, framing
            </label>
            <div
              className="mt-3 flex items-center gap-3 rounded-full border px-4"
              style={{
                backgroundColor:
                  "color-mix(in oklch, var(--color-surface-secondary) 76%, transparent)",
                borderColor:
                  "color-mix(in oklch, var(--color-border-default) 72%, transparent)",
              }}
            >
              <Search
                aria-hidden="true"
                className="h-4 w-4 shrink-0 text-[var(--color-text-tertiary)]"
              />
              <input
                id="browse-search"
                type="search"
                value={searchInput}
                onChange={(event) => setSearchInput(event.target.value)}
                placeholder="Search the live archive"
                className="h-11 w-full bg-transparent text-sm text-[var(--color-text-primary)] outline-none placeholder:text-[var(--color-text-tertiary)]"
              />
            </div>
            <p className="mt-2 text-xs text-[var(--color-text-tertiary)]">
              {query
                ? isSearching
                  ? "Refreshing matches…"
                  : `q=${query}`
                : "Semantic search updates the URL and merges with filters below."}
            </p>
          </div>

          <div
            className="grid gap-3 sm:grid-cols-2"
            style={{
              alignContent: "start",
            }}
          >
            <label className="flex flex-col gap-1.5 font-mono text-[10px] uppercase tracking-[var(--letter-spacing-wide)] text-[var(--color-text-tertiary)]">
              Framing
              <select
                value={framing === "all" ? "" : framing}
                onChange={(e) => updateFilter("framing", e.target.value || "all")}
                className="h-9 rounded-lg border border-[var(--color-border-default)] bg-[var(--color-surface-primary)] px-2 text-sm text-[var(--color-text-primary)]"
              >
                <option value="">All framings</option>
                {Object.values(FRAMINGS).map((opt) => (
                  <option key={opt.slug} value={opt.slug}>
                    {opt.displayName}
                  </option>
                ))}
              </select>
            </label>
            <label className="flex flex-col gap-1.5 font-mono text-[10px] uppercase tracking-[var(--letter-spacing-wide)] text-[var(--color-text-tertiary)]">
              Film
              <select
                value={filmTitle === "all" ? "" : filmTitle}
                onChange={(e) => updateFilter("filmTitle", e.target.value || "all")}
                className="h-9 rounded-lg border border-[var(--color-border-default)] bg-[var(--color-surface-primary)] px-2 text-sm text-[var(--color-text-primary)]"
              >
                <option value="">All films</option>
                {availableFilmTitles.map((t) => (
                  <option key={t} value={t}>
                    {t}
                  </option>
                ))}
              </select>
            </label>
            <label className="flex flex-col gap-1.5 font-mono text-[10px] uppercase tracking-[var(--letter-spacing-wide)] text-[var(--color-text-tertiary)]">
              Director
              <select
                value={director === "all" ? "" : director}
                onChange={(e) => updateFilter("director", e.target.value || "all")}
                className="h-9 rounded-lg border border-[var(--color-border-default)] bg-[var(--color-surface-primary)] px-2 text-sm text-[var(--color-text-primary)]"
              >
                <option value="">All directors</option>
                {availableDirectors.map((d) => (
                  <option key={d} value={d}>
                    {d}
                  </option>
                ))}
              </select>
            </label>
            <label className="flex flex-col gap-1.5 font-mono text-[10px] uppercase tracking-[var(--letter-spacing-wide)] text-[var(--color-text-tertiary)]">
              Shot size
              <select
                value={shotSize === "all" ? "" : shotSize}
                onChange={(e) => updateFilter("shotSize", e.target.value || "all")}
                className="h-9 rounded-lg border border-[var(--color-border-default)] bg-[var(--color-surface-primary)] px-2 text-sm text-[var(--color-text-primary)]"
              >
                <option value="">All sizes</option>
                {availableShotSizes.map((s) => (
                  <option key={s} value={s}>
                    {SHOT_SIZES[s].displayName}
                  </option>
                ))}
              </select>
            </label>
          </div>
        </div>
      </section>

      {archiveIsEmpty ? (
        <section
          className="rounded-[var(--radius-xl)] border p-8"
          style={{
            background:
              "linear-gradient(135deg, color-mix(in oklch, var(--color-surface-secondary) 74%, transparent), color-mix(in oklch, var(--color-surface-primary) 90%, transparent))",
            borderColor:
              "color-mix(in oklch, var(--color-border-default) 72%, transparent)",
          }}
        >
          <p className="font-mono text-xs uppercase tracking-[var(--letter-spacing-wide)] text-[var(--color-text-tertiary)]">
            Archive empty
          </p>
          <h2
            className="mt-3 text-2xl font-semibold text-[var(--color-text-primary)]"
            style={{ fontFamily: "var(--font-heading)" }}
          >
            MetroVision is connected, but no shots have been published yet.
          </h2>
          <p className="mt-4 max-w-2xl text-base leading-8 text-[var(--color-text-secondary)]">
            Seed the database or ingest clips through the pipeline, then the live archive will render here
            automatically.
          </p>
        </section>
      ) : sortedShots.length > 0 ? (
        <div
          className="overflow-x-auto rounded-[var(--radius-xl)] border"
          style={{
            borderColor: "color-mix(in oklch, var(--color-border-default) 72%, transparent)",
            backgroundColor: "color-mix(in oklch, var(--color-surface-secondary) 70%, transparent)",
          }}
        >
          <table className="w-full min-w-[920px] border-collapse text-left text-sm">
            <thead
              className="sticky top-0 z-10 border-b"
              style={{
                backgroundColor: "color-mix(in oklch, var(--color-surface-primary) 92%, transparent)",
                borderColor: "var(--color-border-subtle)",
              }}
            >
              <tr>
                <th scope="col" className="w-14 px-2 py-3 font-mono text-[10px] uppercase tracking-wide text-[var(--color-text-tertiary)]">
                  Thumb
                </th>
                <SortTh label="Film" sortK="film" />
                <SortTh label="Director" sortK="director" />
                <SortTh label="Framing" sortK="framing" />
                <SortTh label="Shot size" sortK="shotSize" />
                <SortTh label="Duration" sortK="duration" />
                <SortTh label="Start" sortK="startTc" />
                <SortTh label="Review" sortK="reviewStatus" />
                <SortTh label="Conf." sortK="confidence" />
                <SortTh label="Added" sortK="created" className="hidden lg:table-cell" />
              </tr>
            </thead>
            <tbody>
              {sortedShots.map((shot) => {
                const href = `/shot/${shot.id}`;
                return (
                  <tr
                    key={shot.id}
                    className="cursor-pointer border-b border-[var(--color-border-subtle)] transition-colors hover:bg-[color-mix(in_oklch,var(--color-accent-base)_6%,transparent)]"
                    onClick={() => router.push(href)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" || e.key === " ") {
                        e.preventDefault();
                        router.push(href);
                      }
                    }}
                    tabIndex={0}
                    role="link"
                    aria-label={`Open shot ${shot.film.title}`}
                  >
                    <td className="px-2 py-2 align-middle">
                      <div className="relative h-10 w-16 overflow-hidden rounded border border-[var(--color-border-subtle)] bg-[var(--color-surface-tertiary)]">
                        {shot.thumbnailUrl ? (
                          // eslint-disable-next-line @next/next/no-img-element -- many small browse rows
                          <img
                            src={shot.thumbnailUrl}
                            alt=""
                            className="size-full object-cover"
                            loading="lazy"
                            decoding="async"
                          />
                        ) : null}
                      </div>
                    </td>
                    <td className="max-w-[10rem] truncate px-3 py-2 align-middle font-medium text-[var(--color-text-primary)]" title={shot.film.title}>
                      {shot.film.title}
                    </td>
                    <td className="max-w-[8rem] truncate px-3 py-2 align-middle text-[var(--color-text-secondary)]" title={shot.film.director}>
                      {shot.film.director}
                    </td>
                    <td className="whitespace-nowrap px-3 py-2 align-middle text-[var(--color-text-secondary)]">
                      {getFramingDisplayName(shot.metadata.framing)}
                    </td>
                    <td className="whitespace-nowrap px-3 py-2 align-middle text-[var(--color-text-secondary)]">
                      {getShotSizeDisplayName(shot.metadata.shotSize)}
                    </td>
                    <td className="whitespace-nowrap px-3 py-2 align-middle font-mono tabular-nums text-[var(--color-text-secondary)]">
                      {formatShotDuration(shot.duration)}
                    </td>
                    <td className="whitespace-nowrap px-3 py-2 align-middle font-mono tabular-nums text-[var(--color-text-secondary)]">
                      {shot.startTc != null && Number.isFinite(shot.startTc)
                        ? formatMediaClock(shot.startTc)
                        : "—"}
                    </td>
                    <td className="max-w-[7rem] truncate px-3 py-2 align-middle font-mono text-[11px] text-[var(--color-text-tertiary)]" title={shot.metadata.reviewStatus ?? ""}>
                      {shot.metadata.reviewStatus ?? "—"}
                    </td>
                    <td className="whitespace-nowrap px-3 py-2 align-middle font-mono tabular-nums text-[var(--color-text-secondary)]">
                      {shot.metadata.confidence != null && Number.isFinite(shot.metadata.confidence)
                        ? `${Math.round(shot.metadata.confidence * 100)}%`
                        : "—"}
                    </td>
                    <td className="hidden whitespace-nowrap px-3 py-2 align-middle font-mono text-[11px] text-[var(--color-text-tertiary)] lg:table-cell">
                      {shot.createdAt
                        ? new Date(shot.createdAt).toLocaleDateString(undefined, {
                            month: "short",
                            day: "numeric",
                            year: "numeric",
                          })
                        : "—"}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      ) : (
        <section
          className="rounded-[var(--radius-xl)] border p-8 text-center"
          style={{
            backgroundColor:
              "color-mix(in oklch, var(--color-surface-secondary) 74%, transparent)",
            borderColor:
              "color-mix(in oklch, var(--color-border-default) 72%, transparent)",
          }}
        >
          <p className="font-mono text-xs uppercase tracking-[var(--letter-spacing-wide)] text-[var(--color-text-tertiary)]">
            No matching shots
          </p>
          <h2
            className="mt-3 text-2xl font-semibold text-[var(--color-text-primary)]"
            style={{ fontFamily: "var(--font-heading)" }}
          >
            The live archive has no result set for the current query.
          </h2>
          <p className="mt-4 text-base leading-8 text-[var(--color-text-secondary)]">
            Adjust search or filters, or clear URL params to return to the full archive.
          </p>
          <div className="mt-5 flex flex-wrap items-center justify-center gap-2">
            {query ? (
              <span className="rounded-full border px-3 py-1 font-mono text-xs uppercase tracking-[var(--letter-spacing-wide)] text-[var(--color-text-secondary)]">
                q={query}
              </span>
            ) : null}
            {framing !== "all" ? (
              <span className="rounded-full border px-3 py-1 font-mono text-xs uppercase tracking-[var(--letter-spacing-wide)] text-[var(--color-text-secondary)]">
                {FRAMINGS[framing as FramingSlug]?.displayName ?? framing}
              </span>
            ) : null}
            {filmTitle !== "all" ? (
              <span className="rounded-full border px-3 py-1 font-mono text-xs uppercase tracking-[var(--letter-spacing-wide)] text-[var(--color-text-secondary)]">
                {filmTitle}
              </span>
            ) : null}
            {director !== "all" ? (
              <span className="rounded-full border px-3 py-1 font-mono text-xs uppercase tracking-[var(--letter-spacing-wide)] text-[var(--color-text-secondary)]">
                {director}
              </span>
            ) : null}
            {shotSize !== "all" ? (
              <span className="rounded-full border px-3 py-1 font-mono text-xs uppercase tracking-[var(--letter-spacing-wide)] text-[var(--color-text-secondary)]">
                {getShotSizeDisplayName(shotSize as ShotSizeSlug)}
              </span>
            ) : null}
          </div>
          <button
            type="button"
            onClick={clearFilters}
            className={cn(buttonVariants({ size: "sm" }), "mt-6 rounded-full px-4")}
          >
            Reset archive view
          </button>
        </section>
      )}
    </div>
  );
}
