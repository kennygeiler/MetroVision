import type { Metadata } from "next";
import Link from "next/link";

import { TuningWorkspace } from "@/components/tuning/tuning-workspace";
import { getAllFilms } from "@/db/queries";

export const metadata: Metadata = {
  title: "Boundary Tuning · Workspace",
  description:
    "Global boundary presets, human verified cuts revisions, worker detect, eval runs, and film preset assignment.",
};

export default async function TuningWorkspacePage() {
  const films = await getAllFilms();
  const options = films.map((f) => ({
    id: f.id,
    title: f.title,
    director: f.director,
    year: f.year,
  }));

  return (
    <div className="space-y-8 pb-16">
      <div>
        <p className="font-mono text-xs uppercase tracking-[var(--letter-spacing-wide)] text-[var(--color-text-tertiary)]">
          Boundary Tuning
        </p>
        <h1
          className="mt-2 text-3xl font-bold tracking-[var(--letter-spacing-tight)] sm:text-4xl"
          style={{ fontFamily: "var(--font-heading)" }}
        >
          Workspace
        </h1>
        <p className="mt-3 max-w-2xl text-sm leading-7 text-[var(--color-text-secondary)]">
          Boundary presets live in the <strong>shared database</strong>. System baselines and community-shared rows appear
          on <Link href="/ingest" className="text-[var(--color-text-accent)] underline">ingest</Link>. Human verified cuts
          are <strong>versioned</strong> revisions. Run detection on the <strong>TS worker</strong> (not Vercel), then
          score against DB-backed gold. For the step-by-step flow, use{" "}
          <Link href="/tuning/prep" className="text-[var(--color-text-accent)] underline">
            guided prep
          </Link>
          .
        </p>
        <p className="mt-4">
          <Link href="/tuning" className="text-sm text-[var(--color-text-accent)] underline">
            ← Boundary Tuning hub
          </Link>
        </p>
      </div>

      <TuningWorkspace films={options} />
    </div>
  );
}
