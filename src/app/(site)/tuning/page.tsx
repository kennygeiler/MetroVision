import type { Metadata } from "next";
import type { ReactNode } from "react";
import Link from "next/link";

const REPO_MAIN =
  "https://github.com/kennygeiler/MetroVision/blob/main" as const;

export const metadata: Metadata = {
  title: "Boundary Tuning",
  description:
    "Shot-boundary presets, human verified cuts, evaluation, and shared ingest profiles — one hub for operators and contributors.",
};

function DocLink({ path, label }: { path: string; label: string }) {
  return (
    <a
      href={`${REPO_MAIN}/${path}`}
      className="font-mono text-sm text-[var(--color-text-accent)] underline decoration-[var(--color-border-default)] underline-offset-4 transition-colors hover:decoration-[var(--color-text-accent)]"
      rel="noreferrer"
      target="_blank"
    >
      {label}
    </a>
  );
}

function JourneyStep({
  n,
  title,
  children,
  href,
  cta,
}: {
  n: number;
  title: string;
  children: ReactNode;
  href: string;
  cta: string;
}) {
  return (
    <li className="grid gap-3 rounded-2xl border border-[var(--color-border-subtle)] bg-[var(--color-surface-secondary)] p-5 sm:grid-cols-[auto_1fr] sm:items-start">
      <span
        className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full font-mono text-sm font-semibold text-[var(--color-text-primary)]"
        style={{ backgroundColor: "color-mix(in oklch, var(--color-accent-base) 22%, transparent)" }}
      >
        {n}
      </span>
      <div className="space-y-2">
        <h3 className="text-base font-semibold text-[var(--color-text-primary)]">{title}</h3>
        <div className="text-sm leading-7 text-[var(--color-text-secondary)]">{children}</div>
        <Link
          href={href}
          className="inline-flex text-sm font-medium text-[var(--color-text-accent)] underline-offset-2 hover:underline"
        >
          {cta} →
        </Link>
      </div>
    </li>
  );
}

export default function BoundaryTuningHubPage() {
  return (
    <div className="space-y-12">
      <section className="max-w-3xl">
        <p className="font-mono text-xs uppercase tracking-[var(--letter-spacing-wide)] text-[var(--color-text-tertiary)]">
          Operators & contributors
        </p>
        <h1
          className="mt-4 text-4xl font-bold tracking-[var(--letter-spacing-tight)] sm:text-5xl"
          style={{ fontFamily: "var(--font-heading)" }}
        >
          Boundary Tuning
        </h1>
        <p className="mt-4 text-base leading-8 text-[var(--color-text-secondary)]">
          All shot-boundary work lives under this name: where you record human verified cuts, run detection against gold,
          score presets, optionally get plain-language insights, publish profiles for the ingest picker, and dig into
          JSON. Composition and Gemini classification are global — this hub is only about{" "}
          <strong>when shots start and end</strong>.
        </p>
      </section>

      <section className="max-w-3xl space-y-4">
        <h2 className="text-xl font-semibold text-[var(--color-text-primary)]">How the journey flows</h2>
        <p className="text-sm leading-7 text-[var(--color-text-secondary)]">
          Follow the steps in order the first time; later you can jump straight to the workspace or annotator.
        </p>
        <ol className="space-y-4">
          <JourneyStep
            n={1}
            title="Human verified cuts"
            href="/tuning/annotate"
            cta="Open annotator"
          >
            <p>
              Mark <strong>interior hard-cut</strong> times in seconds on the same clock as your reference file. Download
              JSON for CLI, or save artifacts. To drive <strong>in-app</strong> eval and guided prep, append revisions with{" "}
              <code className="font-mono text-xs">POST /api/eval-gold-revisions</code> (see tuning workspace copy).
            </p>
          </JourneyStep>
          <JourneyStep n={2} title="Guided prep" href="/tuning/prep" cta="Start guided prep">
            <p>
              Pick film, gold revision, and baseline preset; run <strong>boundary-detect</strong> on your worker; save
              eval; optional <strong>Gemini</strong> explanation; publish a preset for the shared ingest library.
            </p>
          </JourneyStep>
          <JourneyStep n={3} title="Workspace" href="/tuning/workspace" cta="Open workspace">
            <p>
              Global presets (duplicate, community visibility, JSON), gold revision list, worker detect, eval runs, and
              applying a default preset to a film row.
            </p>
          </JourneyStep>
          <JourneyStep n={4} title="Ingest" href="/ingest" cta="Run ingest">
            <p>
              Choose a <strong>boundary model</strong> on the ingest form (or Auto), then run the full pipeline. Worker env
              should align with your winning preset when you are not passing a DB preset id.
            </p>
          </JourneyStep>
        </ol>
      </section>

      <section className="rounded-2xl border border-[var(--color-border-subtle)] bg-[var(--color-surface-secondary)] p-6 sm:p-8">
        <h2 className="text-lg font-semibold text-[var(--color-text-primary)]">
          Reference · Cemented Ran baseline (2026-04-11)
        </h2>
        <p className="mt-2 text-sm text-[var(--color-text-secondary)]">
          Locked after merge-gap and multi-knob sweeps; evidence links below. Use as the default system preset in the
          database after <code className="font-mono text-xs">pnpm db:seed</code> / push.
        </p>
        <div className="mt-6 overflow-x-auto">
          <table className="w-full min-w-[36rem] border-collapse text-left text-sm">
            <thead>
              <tr className="border-b border-[var(--color-border-subtle)] font-mono text-xs uppercase tracking-[var(--letter-spacing-wide)] text-[var(--color-text-tertiary)]">
                <th className="pb-3 pr-4 font-medium">Knob</th>
                <th className="pb-3 pr-4 font-medium">Value</th>
                <th className="pb-3 font-medium">Notes</th>
              </tr>
            </thead>
            <tbody className="text-[var(--color-text-primary)]">
              <tr className="border-b border-[var(--color-border-subtle)] align-top">
                <td className="py-3 pr-4 font-mono text-xs text-[var(--color-text-accent)]">
                  METROVISION_BOUNDARY_DETECTOR
                </td>
                <td className="py-3 pr-4 font-mono text-xs">
                  pyscenedetect_ensemble_pyscene
                </td>
                <td className="py-3 text-[var(--color-text-secondary)]">
                  Dual PyScene + merge. Single adaptive/content scored lower on Ran human verified cuts.
                </td>
              </tr>
              <tr className="border-b border-[var(--color-border-subtle)] align-top">
                <td className="py-3 pr-4 font-mono text-xs text-[var(--color-text-accent)]">
                  METROVISION_BOUNDARY_MERGE_GAP_SEC
                </td>
                <td className="py-3 pr-4 font-mono text-xs">0.18</td>
                <td className="py-3 text-[var(--color-text-secondary)]">
                  Recall-first default (code + DB preset). Ran1243 ensemble plateau 0.12–0.45 — use 0.22 only to match older CLI logs.
                </td>
              </tr>
              <tr className="border-b border-[var(--color-border-subtle)] align-top">
                <td className="py-3 pr-4 font-mono text-xs text-[var(--color-text-accent)]">
                  Extras / fusion
                </td>
                <td className="py-3 pr-4 font-mono text-xs">
                  None + merge_flat
                </td>
                <td className="py-3 text-[var(--color-text-secondary)]">
                  No TransNet in baseline. Use{" "}
                  <span className="font-mono text-xs">merge_flat</span> when adding{" "}
                  <span className="font-mono text-xs">--extra-cuts</span>.
                </td>
              </tr>
              <tr className="border-b border-[var(--color-border-subtle)] align-top">
                <td className="py-3 pr-4 font-mono text-xs text-[var(--color-text-accent)]">
                  Eval tolerance
                </td>
                <td className="py-3 pr-4 font-mono text-xs">0.5 s</td>
                <td className="py-3 text-[var(--color-text-secondary)]">
                  Primary F1 benchmark. Loosen only for reporting, not detector quality.
                </td>
              </tr>
              <tr className="align-top">
                <td className="py-3 pr-4 font-mono text-xs text-[var(--color-text-accent)]">
                  Reference benchmark
                </td>
                <td className="py-3 pr-4 font-mono text-xs" colSpan={2}>
                  P ≈ 0.784 · R ≈ 0.817 · F1 = 0.80 (tol 0.5) vs{" "}
                  <span className="whitespace-nowrap">gold-ran-2026-04-10.json</span>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </section>

      <section className="grid gap-8 lg:grid-cols-2">
        <div className="space-y-4 rounded-2xl border border-[var(--color-border-subtle)] p-6">
          <h2 className="text-lg font-semibold text-[var(--color-text-primary)]">
            CLI (same contract)
          </h2>
          <ul className="list-inside list-disc space-y-2 text-sm text-[var(--color-text-secondary)]">
            <li>
              <span className="font-mono text-xs text-[var(--color-text-tertiary)]">pnpm detect:export-cuts</span> — detect-only
              JSON
            </li>
            <li>
              <span className="font-mono text-xs text-[var(--color-text-tertiary)]">pnpm eval:pipeline</span> — gold vs
              predicted metrics
            </li>
            <li>
              <span className="font-mono text-xs text-[var(--color-text-tertiary)]">pnpm eval:boundary-misses</span> — FN/FP
              lists
            </li>
          </ul>
          <pre className="overflow-x-auto rounded-xl border border-[var(--color-border-subtle)] bg-[var(--color-surface-primary)] p-4 font-mono text-[11px] leading-relaxed text-[var(--color-text-secondary)]">
            {`export METROVISION_BOUNDARY_DETECTOR=pyscenedetect_ensemble_pyscene
export METROVISION_BOUNDARY_MERGE_GAP_SEC=0.18
pnpm detect:export-cuts -- /path/to/Ran1243.mov --start 0 --end 780 \\
  --gold eval/gold/gold-ran-2026-04-10.json --tol 0.5 \\
  --fusion-policy merge_flat --out eval/predicted/run.json`}
          </pre>
        </div>

        <div className="space-y-4 rounded-2xl border border-[var(--color-border-subtle)] p-6">
          <h2 className="text-lg font-semibold text-[var(--color-text-primary)]">
            Evidence & logs (GitHub)
          </h2>
          <ul className="space-y-3 text-sm text-[var(--color-text-secondary)]">
            <li>
              <DocLink path="eval/runs/STATUS.md" label="eval/runs/STATUS.md" /> — living baseline + CEMENTED section
            </li>
            <li>
              <DocLink
                path="eval/runs/ran1243-knob-sweep-gap022-2026-04-11.md"
                label="Knob sweep summary"
              />{" "}
              +{" "}
              <DocLink
                path="eval/runs/ran1243-knob-sweep-gap022-2026-04-11.log"
                label=".log"
              />
            </li>
            <li>
              <DocLink
                path="eval/runs/ran1243-merge-gap-sweep-2026-04-11.md"
                label="Merge-gap sweep summary"
              />{" "}
              +{" "}
              <DocLink
                path="eval/runs/ran1243-merge-gap-sweep-2026-04-11.log"
                label=".log"
              />
            </li>
            <li>
              <DocLink path="docs/tuning-flow.md" label="docs/tuning-flow.md" /> — staged workflow (CLI → product)
            </li>
          </ul>
          <p className="text-xs text-[var(--color-text-tertiary)]">
            Canonical S3 object:{" "}
            <span className="font-mono">
              s3://metrovision-superai/films/ran-1985/source/Ran1243.mov
            </span>
            . Use a fresh presigned URL to download; do not commit presigned links.
          </p>
        </div>
      </section>

      <section className="max-w-3xl rounded-2xl border border-dashed border-[var(--color-border-default)] p-6">
        <h2 className="text-lg font-semibold text-[var(--color-text-primary)]">
          Roadmap
        </h2>
        <p className="mt-2 text-sm leading-7 text-[var(--color-text-secondary)]">
          In-app HITL boundary review and multi-film gold corpora are later phases (see{" "}
          <DocLink path=".planning/ROADMAP.md" label=".planning/ROADMAP.md" />). This hub links the shipped Boundary Tuning
          surfaces; deep eval history stays in Git until those land.
        </p>
      </section>
    </div>
  );
}
