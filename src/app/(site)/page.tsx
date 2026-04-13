import Link from "next/link";

import { ArchiveDemoSlice } from "@/components/archive/archive-demo-slice";
import { HomeHero } from "@/components/home/home-hero";
import { FRAMINGS } from "@/lib/taxonomy";

const workflowSteps = [
  {
    step: "01",
    title: "Archive",
    description:
      "Shot-level composition metadata (framing, depth, blocking, and related fields) with provenance and verification hooks.",
  },
  {
    step: "02",
    title: "Explore",
    description:
      "Browse, visualize patterns across films, and export structured records with citation-ready methodology text.",
  },
  {
    step: "03",
    title: "Tune boundaries",
    description:
      "Version global boundary-cut presets in the database, keep a versioned history of human verified cuts, run detect on the ingest worker, and score predicted cuts in-app—without mutating process env. Assign a preset per film for reproducible worker ingest.",
    links: [
      { href: "/tuning/workspace", label: "Tuning workspace" },
      { href: "/tuning", label: "Cemented profile & evidence" },
    ],
  },
] as const;

export default function Home() {
  const framingTypeCount = Object.keys(FRAMINGS).length;

  return (
    <div className="flex flex-col gap-12 pb-12 sm:gap-16 sm:pb-16 lg:gap-20">
      <HomeHero />

      <ArchiveDemoSlice framingTypeCount={framingTypeCount} spotlightShotId={null} />

      <section aria-labelledby="how-it-works-heading" className="space-y-6 sm:space-y-8">
        <div className="max-w-3xl">
          <p className="font-mono text-[10px] uppercase tracking-[var(--letter-spacing-wide)] text-[var(--color-text-tertiary)] sm:text-xs">
            Workflow
          </p>
          <h2
            id="how-it-works-heading"
            className="mt-2 text-2xl font-semibold tracking-[var(--letter-spacing-snug)] text-[var(--color-text-primary)] sm:mt-3 sm:text-3xl lg:text-4xl"
            style={{ fontFamily: "var(--font-heading)" }}
          >
            How researchers use it
          </h2>
          <p className="mt-3 text-sm leading-7 text-[var(--color-text-secondary)] sm:mt-4 sm:text-base sm:leading-8">
            A single taxonomy and database surface for composition research,
            tooling prototypes, and teaching—including an in-app loop for
            shot-boundary presets, human verified cuts, and eval alongside the CLI workflow.
          </p>
        </div>

        <div className="grid gap-4 sm:gap-5 lg:grid-cols-3">
          {workflowSteps.map((item) => (
            <div
              key={item.step}
              className="rounded-[var(--radius-xl)] border p-5 sm:p-6"
              style={{
                background:
                  "linear-gradient(160deg, color-mix(in oklch, var(--color-surface-secondary) 82%, transparent), color-mix(in oklch, var(--color-surface-primary) 96%, transparent))",
                borderColor:
                  "color-mix(in oklch, var(--color-border-default) 72%, transparent)",
              }}
            >
              <p className="font-mono text-[10px] uppercase tracking-[var(--letter-spacing-wide)] text-[var(--color-text-accent)] sm:text-xs">
                {item.step}
              </p>
              <h3
                className="mt-3 text-xl font-semibold tracking-[var(--letter-spacing-snug)] text-[var(--color-text-primary)] sm:mt-4 sm:text-2xl"
                style={{ fontFamily: "var(--font-heading)" }}
              >
                {item.title}
              </h3>
              <p className="mt-3 text-sm leading-7 text-[var(--color-text-secondary)] sm:mt-4 sm:text-base sm:leading-8">
                {item.description}
              </p>
              {"links" in item && item.links ? (
                <div className="mt-4 flex flex-wrap gap-2 sm:mt-5">
                  {item.links.map((l) => (
                    <Link
                      key={l.href}
                      href={l.href}
                      className="inline-flex min-h-11 min-w-0 items-center justify-center rounded-full border border-[var(--color-border-default)] px-4 py-2.5 text-xs text-[var(--color-text-secondary)] transition-colors active:bg-[var(--color-surface-tertiary)] hover:bg-[var(--color-surface-tertiary)] hover:text-[var(--color-text-primary)] sm:h-9 sm:py-0 sm:text-sm"
                    >
                      {l.label}
                    </Link>
                  ))}
                </div>
              ) : null}
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
