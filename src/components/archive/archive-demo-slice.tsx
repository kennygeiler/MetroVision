import Link from "next/link";

import { ArchiveDemoSliceActions } from "@/components/archive/archive-demo-slice-actions";
import { MethodologyBlurb } from "@/components/archive/methodology-blurb";
type ArchiveDemoSliceProps = {
  framingTypeCount: number;
  spotlightShotId: string | null;
};

export function ArchiveDemoSlice({ framingTypeCount, spotlightShotId }: ArchiveDemoSliceProps) {
  const vizHref = "/visualize#composition-scatter";
  const exportHref = spotlightShotId
    ? `/export?demoShot=${encodeURIComponent(spotlightShotId)}`
    : "/export";

  return (
    <section
      className="space-y-6 rounded-[calc(var(--radius-xl)_+_4px)] border p-5 sm:space-y-8 sm:p-8 lg:p-10"
      style={{
        borderColor:
          "color-mix(in oklch, var(--color-border-default) 72%, transparent)",
        background:
          "linear-gradient(160deg, color-mix(in oklch, var(--color-surface-secondary) 78%, transparent), color-mix(in oklch, var(--color-surface-primary) 94%, transparent))",
      }}
      aria-labelledby="demo-slice-heading"
    >
      <div className="grid gap-6 sm:gap-8 lg:grid-cols-[minmax(0,1fr)_minmax(0,22rem)] lg:items-start">
        <div>
          <p className="font-mono text-[10px] uppercase tracking-[var(--letter-spacing-wide)] text-[var(--color-text-tertiary)] sm:text-xs">
            Minimum impressive demo
          </p>
          <h2
            id="demo-slice-heading"
            className="mt-2 text-2xl font-semibold tracking-[var(--letter-spacing-snug)] text-[var(--color-text-primary)] sm:mt-3 sm:text-3xl lg:text-4xl"
            style={{ fontFamily: "var(--font-heading)" }}
          >
            One path through real data
          </h2>
          <p className="mt-3 max-w-2xl text-sm leading-7 text-[var(--color-text-secondary)] sm:mt-4 sm:text-base sm:leading-8">
            Browse the archive, open a shot with provenance, inspect composition
            patterns in a single chart, export with a ready-made citation, and
            iterate shot-boundary presets when you are calibrating ingest.
          </p>

          <ol className="mt-6 space-y-3 text-sm leading-relaxed text-[var(--color-text-secondary)] sm:mt-8 sm:space-y-4 sm:leading-normal">
            <li className="flex gap-3">
              <span className="font-mono text-[var(--color-text-accent)]">01</span>
              <span>
                <Link
                  href="/browse"
                  className="font-medium text-[var(--color-text-primary)] underline-offset-4 hover:underline"
                >
                  Browse
                </Link>{" "}
                — filter records from the live database.
              </span>
            </li>
            <li className="flex gap-3">
              <span className="font-mono text-[var(--color-text-accent)]">02</span>
              <span>
                {spotlightShotId ? (
                  <>
                    <Link
                      href={`/shot/${spotlightShotId}`}
                      className="font-medium text-[var(--color-text-primary)] underline-offset-4 hover:underline"
                    >
                      Shot detail
                    </Link>{" "}
                    — playback, metadata, model confidence, and review status.
                  </>
                ) : (
                  <>
                    <Link
                      href="/browse?view=shots"
                      className="font-medium text-[var(--color-text-primary)] underline-offset-4 hover:underline"
                    >
                      Shot detail
                    </Link>{" "}
                    — open any row from Browse → Shots.
                  </>
                )}
              </span>
            </li>
            <li className="flex gap-3">
              <span className="font-mono text-[var(--color-text-accent)]">03</span>
              <span>
                <Link
                  href={vizHref}
                  className="font-medium text-[var(--color-text-primary)] underline-offset-4 hover:underline"
                >
                  Visualize
                </Link>{" "}
                — composition scatter (framing × depth) across the archive.
              </span>
            </li>
            <li className="flex gap-3">
              <span className="font-mono text-[var(--color-text-accent)]">04</span>
              <span>
                <Link
                  href={exportHref}
                  className="font-medium text-[var(--color-text-primary)] underline-offset-4 hover:underline"
                >
                  Export
                </Link>{" "}
                — JSON/CSV plus a copyable citation block.
              </span>
            </li>
            <li className="flex gap-3">
              <span className="font-mono text-[var(--color-text-accent)]">05</span>
              <span>
                <Link
                  href="/tuning/workspace"
                  className="font-medium text-[var(--color-text-primary)] underline-offset-4 hover:underline"
                >
                  Tuning workspace
                </Link>{" "}
                — presets, human verified cuts (revision history), worker detect, and boundary eval
                runs;{" "}
                <Link
                  href="/tuning"
                  className="font-medium text-[var(--color-text-primary)] underline-offset-4 hover:underline"
                >
                  boundary profile
                </Link>{" "}
                for the cemented Ran baseline and CLI notes.
              </span>
            </li>
          </ol>

          <ArchiveDemoSliceActions spotlightShotId={spotlightShotId} />
        </div>

        <MethodologyBlurb
          framingTypeCount={framingTypeCount}
          className="rounded-[var(--radius-xl)] border p-4 sm:p-6"
        />
      </div>
    </section>
  );
}
