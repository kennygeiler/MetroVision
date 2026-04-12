import type { Metadata } from "next";
import Link from "next/link";

import { getAccuracyStats, getVerificationStats } from "@/db/queries";

export const metadata: Metadata = {
  title: "Review hub",
  description:
    "Film timelines, pipeline health, and optional human QA metrics for the MetroVision archive.",
};

function formatAverageRating(value: number | null) {
  return value === null ? "Unrated" : `${value.toFixed(1)}/5`;
}

export default async function VerifyPage() {
  const [stats, accuracy] = await Promise.all([getVerificationStats(), getAccuracyStats()]);

  return (
    <div className="space-y-10">
      <section className="flex flex-wrap items-end justify-between gap-4">
        <div className="max-w-3xl">
          <p className="font-mono text-xs uppercase tracking-[var(--letter-spacing-wide)] text-[var(--color-text-tertiary)]">
            Quality &amp; pipeline
          </p>
          <h1
            className="mt-4 text-4xl font-bold tracking-[var(--letter-spacing-tight)] sm:text-5xl"
            style={{ fontFamily: "var(--font-heading)" }}
          >
            Review hub
          </h1>
          <p className="mt-4 text-base leading-8 text-[var(--color-text-secondary)]">
            The primary workflow is <strong className="text-[var(--color-text-primary)]">film-first</strong>: open a
            title from Browse, read the <strong className="text-[var(--color-text-primary)]">shot timeline</strong>{" "}
            (cuts in order, framing colors, uncertain segments highlighted), and{" "}
            <strong className="text-[var(--color-text-primary)]">re-run ingest</strong> when the model used a template
            fallback or shots are flagged for another pass. Per-shot rating forms are optional — use batch review only
            when you need spreadsheet-style QA.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Link
            href="/browse"
            className="inline-flex h-7 items-center justify-center rounded-full border border-[var(--color-accent-base)] bg-transparent px-4 text-[0.8rem] text-[var(--color-text-primary)] transition-colors hover:bg-[var(--color-surface-tertiary)]"
          >
            Browse films
          </Link>
          <Link
            href="/ingest"
            className="inline-flex h-7 items-center justify-center rounded-full border border-[var(--color-border-default)] bg-transparent px-4 text-[0.8rem] text-[var(--color-text-secondary)] transition-colors hover:bg-[var(--color-surface-tertiary)] hover:text-[var(--color-text-primary)]"
          >
            Ingest
          </Link>
          <Link
            href="/verify/batch"
            className="inline-flex h-7 items-center justify-center rounded-full border border-[var(--color-border-default)] bg-transparent px-4 text-[0.8rem] text-[var(--color-text-secondary)] transition-colors hover:bg-[var(--color-surface-tertiary)] hover:text-[var(--color-text-primary)]"
          >
            Batch QA (optional)
          </Link>
        </div>
      </section>

      <section
        className="rounded-[var(--radius-xl)] border p-6"
        style={{
          backgroundColor: "color-mix(in oklch, var(--color-surface-secondary) 78%, transparent)",
          borderColor: "color-mix(in oklch, var(--color-border-default) 72%, transparent)",
        }}
      >
        <h2
          className="font-mono text-[10px] uppercase tracking-[var(--letter-spacing-wide)] text-[var(--color-text-accent)]"
        >
          Where to look
        </h2>
        <ul className="mt-4 list-inside list-disc space-y-2 text-sm leading-relaxed text-[var(--color-text-secondary)]">
          <li>
            <Link href="/browse" className="text-[var(--color-text-accent)] underline-offset-2 hover:underline">
              Browse
            </Link>{" "}
            → choose a film → <strong className="text-[var(--color-text-primary)]">Shot timeline</strong> shows every
            cut; striped segments need a fresh classification pass.
          </li>
          <li>
            Use <strong className="text-[var(--color-text-primary)]">Open ingest (film pre-filled)</strong> on the film
            page to queue the same title again (replaces shots for that film when ingest completes).
          </li>
          <li>
            <Link href="/verify/batch" className="text-[var(--color-text-accent)] underline-offset-2 hover:underline">
              Batch QA
            </Link>{" "}
            remains for operators who still want per-shot ratings and bulk approve — not required for normal archive
            use.
          </li>
        </ul>
      </section>

      <section className="grid gap-4 md:grid-cols-3">
        <div
          className="rounded-[var(--radius-xl)] border p-5"
          style={{
            backgroundColor:
              "color-mix(in oklch, var(--color-surface-secondary) 78%, transparent)",
            borderColor:
              "color-mix(in oklch, var(--color-border-default) 72%, transparent)",
          }}
        >
          <p className="font-mono text-xs uppercase tracking-[var(--letter-spacing-wide)] text-[var(--color-text-tertiary)]">
            Total shots
          </p>
          <p className="mt-3 text-3xl font-semibold text-[var(--color-text-primary)]">
            {stats.totalShots}
          </p>
          <p className="mt-2 text-sm text-[var(--color-text-secondary)]">
            {stats.reviewQueueCount} flagged <code className="font-mono text-[10px]">needs_review</code> in metadata.
          </p>
        </div>

        <div
          className="rounded-[var(--radius-xl)] border p-5"
          style={{
            backgroundColor:
              "color-mix(in oklch, var(--color-surface-secondary) 78%, transparent)",
            borderColor:
              "color-mix(in oklch, var(--color-border-default) 72%, transparent)",
          }}
        >
          <p className="font-mono text-xs uppercase tracking-[var(--letter-spacing-wide)] text-[var(--color-text-tertiary)]">
            Shots with human QA rows
          </p>
          <p className="mt-3 text-3xl font-semibold text-[var(--color-text-primary)]">
            {stats.verifiedShots}
          </p>
          <p className="mt-2 text-sm text-[var(--color-text-secondary)]">
            {stats.unverifiedShots} never had a verification form submitted.
          </p>
        </div>

        <div
          className="rounded-[var(--radius-xl)] border p-5"
          style={{
            backgroundColor:
              "color-mix(in oklch, var(--color-surface-secondary) 78%, transparent)",
            borderColor:
              "color-mix(in oklch, var(--color-border-default) 72%, transparent)",
          }}
        >
          <p className="font-mono text-xs uppercase tracking-[var(--letter-spacing-wide)] text-[var(--color-text-tertiary)]">
            Average QA rating
          </p>
          <p className="mt-3 text-3xl font-semibold text-[var(--color-text-primary)]">
            {formatAverageRating(stats.averageOverallRating)}
          </p>
          <p className="mt-2 text-sm text-[var(--color-text-secondary)]">
            {stats.totalVerifications} optional review passes recorded.
          </p>
        </div>
      </section>

      {accuracy.totalShotsReviewed > 0 && (
        <section className="space-y-4">
          <div className="flex items-baseline justify-between">
            <h2
              className="text-xl font-semibold tracking-[var(--letter-spacing-snug)]"
              style={{ fontFamily: "var(--font-heading)" }}
            >
              Optional QA accuracy
            </h2>
            <p className="font-mono text-xs text-[var(--color-text-tertiary)]">
              {accuracy.totalShotsReviewed} shots with reviews &middot; {accuracy.totalCorrections} corrections
            </p>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <div
              className="rounded-[var(--radius-xl)] border p-5"
              style={{
                backgroundColor:
                  "color-mix(in oklch, var(--color-surface-secondary) 78%, transparent)",
                borderColor:
                  "color-mix(in oklch, var(--color-border-default) 72%, transparent)",
              }}
            >
              <p className="font-mono text-xs uppercase tracking-[var(--letter-spacing-wide)] text-[var(--color-text-tertiary)]">
                Overall accuracy
              </p>
              <p
                className="mt-3 text-3xl font-semibold"
                style={{
                  color:
                    accuracy.overallAccuracy !== null && accuracy.overallAccuracy >= 85
                      ? "var(--color-status-verified)"
                      : "var(--color-text-primary)",
                }}
              >
                {accuracy.overallAccuracy !== null ? `${accuracy.overallAccuracy}%` : "N/A"}
              </p>
              <p className="mt-2 text-sm text-[var(--color-text-secondary)]">
                {accuracy.overallAccuracy !== null && accuracy.overallAccuracy >= 85
                  ? "M3 gate: passing (>= 85%)"
                  : "M3 gate: not yet passing (< 85%)"}
              </p>
            </div>

            <div
              className="rounded-[var(--radius-xl)] border p-5"
              style={{
                backgroundColor:
                  "color-mix(in oklch, var(--color-surface-secondary) 78%, transparent)",
                borderColor:
                  "color-mix(in oklch, var(--color-border-default) 72%, transparent)",
              }}
            >
              <p className="font-mono text-xs uppercase tracking-[var(--letter-spacing-wide)] text-[var(--color-text-tertiary)]">
                Per-field accuracy
              </p>
              <div className="mt-3 space-y-2">
                {Object.entries(accuracy.perFieldAccuracy).map(([field, pct]) => (
                  <div key={field} className="flex items-center justify-between text-sm">
                    <span className="font-mono text-xs text-[var(--color-text-secondary)]">{field}</span>
                    <span
                      className="font-semibold"
                      style={{
                        color:
                          pct !== null && pct >= 85
                            ? "var(--color-status-verified)"
                            : "var(--color-text-primary)",
                      }}
                    >
                      {pct !== null ? `${pct}%` : "—"}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {Object.keys(accuracy.perFilmAccuracy).length > 0 && (
            <div
              className="rounded-[var(--radius-xl)] border p-5"
              style={{
                backgroundColor:
                  "color-mix(in oklch, var(--color-surface-secondary) 78%, transparent)",
                borderColor:
                  "color-mix(in oklch, var(--color-border-default) 72%, transparent)",
              }}
            >
              <p className="font-mono text-xs uppercase tracking-[var(--letter-spacing-wide)] text-[var(--color-text-tertiary)]">
                Per-film accuracy
              </p>
              <div className="mt-3 space-y-2">
                {Object.entries(accuracy.perFilmAccuracy)
                  .sort(([, a], [, b]) => (b ?? 0) - (a ?? 0))
                  .map(([film, pct]) => (
                    <div key={film} className="flex items-center justify-between text-sm">
                      <span className="text-[var(--color-text-secondary)]">{film}</span>
                      <span
                        className="font-mono font-semibold"
                        style={{
                          color:
                            pct !== null && pct >= 85
                              ? "var(--color-status-verified)"
                              : "var(--color-text-primary)",
                        }}
                      >
                        {pct !== null ? `${pct}%` : "—"}
                      </span>
                    </div>
                  ))}
              </div>
            </div>
          )}
        </section>
      )}
    </div>
  );
}
