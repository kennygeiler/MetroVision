import type { Metadata } from "next";
import Link from "next/link";

import { BoundaryTuningPrepWizard } from "@/components/tuning/boundary-tuning-prep-wizard";
import { getAllFilms } from "@/db/queries";

export const metadata: Metadata = {
  title: "Boundary Tuning · Guided prep",
  description:
    "Walk through human verified gold, worker detect, eval, optional LLM insights, and publishing a boundary preset.",
};

export default async function BoundaryTuningPrepPage() {
  const films = await getAllFilms();
  const options = films.map((f) => ({
    id: f.id,
    title: f.title,
    director: f.director,
    year: f.year,
  }));

  return (
    <div className="mx-auto max-w-4xl space-y-8 pb-16">
      <div>
        <Link
          href="/tuning"
          className="font-mono text-xs uppercase tracking-[var(--letter-spacing-wide)] text-[var(--color-text-tertiary)] transition-colors hover:text-[var(--color-text-accent)]"
        >
          &larr; Boundary Tuning
        </Link>
        <p className="mt-4 font-mono text-xs uppercase tracking-[var(--letter-spacing-wide)] text-[var(--color-text-tertiary)]">
          Boundary Tuning
        </p>
        <h1
          className="mt-2 text-3xl font-bold tracking-[var(--letter-spacing-tight)] sm:text-4xl"
          style={{ fontFamily: "var(--font-heading)" }}
        >
          Guided prep
        </h1>
        <p className="mt-3 max-w-2xl text-sm leading-7 text-[var(--color-text-secondary)]">
          Step through gold selection, worker prediction, scoring, optional Gemini explanations, and publishing a preset for
          the ingest model picker. For knobs and JSON editing, use the{" "}
          <Link href="/tuning/workspace" className="text-[var(--color-text-accent)] underline">
            workspace
          </Link>
          .
        </p>
      </div>

      <BoundaryTuningPrepWizard films={options} />
    </div>
  );
}
