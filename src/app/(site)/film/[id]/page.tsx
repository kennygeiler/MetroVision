import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import { FilmHeader } from "@/components/films/film-header";
import { FilmCoverageStats } from "@/components/films/film-coverage-stats";
import { FilmTimeline } from "@/components/films/film-timeline";
import { SceneCard } from "@/components/films/scene-card";
import {
  getFilmById,
  getFilmCoverageStats,
  getFilmTrustSummary,
} from "@/db/queries";
import { countShotsNeedingReliableClassification } from "@/lib/shot-pipeline-health";

type Props = {
  params: Promise<{ id: string }>;
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id } = await params;
  const film = await getFilmById(id);
  if (!film) return { title: "Film Not Found" };
  return {
    title: `${film.title} — ${film.director}`,
    description: `Shot-level composition archive for ${film.title} (${film.year}) by ${film.director}. ${film.shotCount} shots across ${film.sceneCount} scenes.`,
  };
}

export default async function FilmDetailPage({ params }: Props) {
  const { id } = await params;
  const [film, stats, filmTrust] = await Promise.all([
    getFilmById(id),
    getFilmCoverageStats(id),
    getFilmTrustSummary(id),
  ]);

  if (!film) notFound();

  const allShots = film.scenes.flatMap((s) => s.shots);
  const weakClassificationCount = countShotsNeedingReliableClassification(allShots);
  const yearStr =
    film.year != null && Number.isFinite(film.year) ? String(film.year) : "";
  const ingestPrefillHref =
    yearStr !== ""
      ? `/ingest?filmTitle=${encodeURIComponent(film.title)}&director=${encodeURIComponent(film.director)}&year=${encodeURIComponent(yearStr)}`
      : `/ingest?filmTitle=${encodeURIComponent(film.title)}&director=${encodeURIComponent(film.director)}`;

  return (
    <div className="space-y-10 pb-16">
      {/* Back nav */}
      <div>
        <Link
          href="/browse"
          className="font-mono text-xs uppercase tracking-[var(--letter-spacing-wide)] text-[var(--color-text-tertiary)] transition-colors hover:text-[var(--color-text-accent)]"
        >
          &larr; Back to archive
        </Link>
      </div>

      {/* Film Header */}
      <FilmHeader film={film} trust={filmTrust} />

      {film.boundaryCutPresetName ? (
        <p className="text-sm text-[var(--color-text-secondary)]">
          Boundary cut preset:{" "}
          <span className="font-mono text-[var(--color-text-tertiary)]">
            {film.boundaryCutPresetName}
          </span>
          .{" "}
          <Link
            href="/tuning/workspace"
            className="text-[var(--color-text-accent)] underline"
          >
            Tuning workspace
          </Link>
        </p>
      ) : null}

      {/* Full Film Timeline */}
      <section>
        <h2
          className="font-mono text-[10px] uppercase tracking-[var(--letter-spacing-wide)] text-[var(--color-text-accent)]"
        >
          Shot timeline
        </h2>
        <p className="mt-1 max-w-3xl text-sm text-[var(--color-text-secondary)]">
          Cuts in story order; segment width matches shot duration and color follows framing. Striped / outlined
          segments used a template fallback or are flagged for another pipeline pass — the usual fix is to{" "}
          <strong className="text-[var(--color-text-primary)]">re-run ingest</strong> for this film (same title,
          director, year replaces prior shots).
        </p>
        {weakClassificationCount > 0 ? (
          <div
            className="mt-4 rounded-[var(--radius-lg)] border px-4 py-3 text-sm leading-relaxed"
            style={{
              borderColor: "color-mix(in oklch, var(--color-status-error) 38%, transparent)",
              backgroundColor: "color-mix(in oklch, var(--color-status-error) 8%, transparent)",
            }}
          >
            <p className="text-[var(--color-text-primary)]">
              <span className="font-mono tabular-nums">{weakClassificationCount}</span> shot
              {weakClassificationCount === 1 ? "" : "s"} may need a fresh classification pass (template fallback or
              &ldquo;needs review&rdquo; status). They are highlighted on the bar below.
            </p>
            <Link
              href={ingestPrefillHref}
              className="mt-3 inline-flex items-center rounded-full border border-[var(--color-border-default)] bg-[var(--color-surface-secondary)] px-4 py-2 font-mono text-xs uppercase tracking-[var(--letter-spacing-wide)] text-[var(--color-text-primary)] transition-colors hover:border-[var(--color-accent-base)]"
            >
              Open ingest (film pre-filled) →
            </Link>
          </div>
        ) : (
          <p className="mt-3 text-sm text-[var(--color-status-verified)]">
            All shots carry normal model classification — nothing flagged for re-run on this bar.
          </p>
        )}
        <div className="mt-4">
          <FilmTimeline shots={allShots} scenes={film.scenes} />
        </div>
      </section>

      {/* Coverage Stats */}
      <section>
        <h2
          className="font-mono text-[10px] uppercase tracking-[var(--letter-spacing-wide)] text-[var(--color-text-accent)]"
        >
          Coverage Analysis
        </h2>
        <p className="mt-1 text-sm text-[var(--color-text-secondary)]">
          Framing and shot-size distribution across {film.shotCount} shots.
        </p>
        <div className="mt-4">
          <FilmCoverageStats stats={stats} />
        </div>
      </section>

      {/* Scene List */}
      <section>
        <h2
          className="font-mono text-[10px] uppercase tracking-[var(--letter-spacing-wide)] text-[var(--color-text-accent)]"
        >
          Scenes ({film.sceneCount})
        </h2>
        <p className="mt-1 text-sm text-[var(--color-text-secondary)]">
          Scene breakdown with shot coverage patterns.
        </p>
        <div className="mt-4 space-y-4">
          {film.scenes.map((scene) => (
            <SceneCard key={scene.id} scene={scene} />
          ))}
        </div>
      </section>
    </div>
  );
}
