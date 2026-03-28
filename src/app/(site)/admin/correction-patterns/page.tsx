"use client";

import { useState, useEffect } from "react";
import Link from "next/link";

// ---------------------------------------------------------------------------
// Types (mirrors server CorrectionPatterns)
// ---------------------------------------------------------------------------

type FieldFrequency = {
  corrections: number;
  total: number;
  rate: number;
};

type CorrectionTransition = {
  field: string;
  from: string;
  to: string;
  count: number;
};

type ConfidenceBucket = {
  bucket: string;
  totalShots: number;
  correctedShots: number;
  correctionRate: number;
};

type CorrectionPatterns = {
  perFieldFrequency: Record<string, FieldFrequency>;
  topTransitions: CorrectionTransition[];
  perFilmCorrectionRates: Record<string, FieldFrequency>;
  confidenceVsAccuracy: ConfidenceBucket[];
  totalVerifications: number;
};

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const FIELD_LABELS: Record<string, string> = {
  framing: "Framing",
  depth: "Depth",
  blocking: "Blocking",
  shotSize: "Shot Size",
  angleVertical: "Vertical Angle",
  angleHorizontal: "Horizontal Angle",
};

function Bar({ value, max, color }: { value: number; max: number; color: string }) {
  const pct = max > 0 ? Math.min((value / max) * 100, 100) : 0;
  return (
    <div className="h-2 w-full rounded-full bg-white/5">
      <div
        className={`h-2 rounded-full ${color}`}
        style={{ width: `${pct}%` }}
      />
    </div>
  );
}

// ---------------------------------------------------------------------------
// Main Page
// ---------------------------------------------------------------------------

export default function CorrectionPatternsPage() {
  const [data, setData] = useState<CorrectionPatterns | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/admin/correction-patterns")
      .then((res) => {
        if (!res.ok) throw new Error("Failed to load correction patterns");
        return res.json();
      })
      .then(setData)
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="mx-auto max-w-5xl py-16 text-center text-sm text-[var(--color-text-tertiary)]">
        Loading correction patterns…
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="mx-auto max-w-5xl py-16 text-center text-sm text-red-400">
        {error ?? "No data available."}
      </div>
    );
  }

  const maxFieldCorrections = Math.max(
    ...Object.values(data.perFieldFrequency).map((f) => f.corrections),
    1,
  );

  const filmEntries = Object.entries(data.perFilmCorrectionRates).sort(
    (a, b) => b[1].rate - a[1].rate,
  );

  return (
    <div className="mx-auto max-w-5xl space-y-10 pb-16">
      {/* Header */}
      <div>
        <Link
          href="/admin"
          className="font-mono text-xs uppercase tracking-[var(--letter-spacing-wide)] text-[var(--color-text-tertiary)] transition-colors hover:text-[var(--color-text-accent)]"
        >
          &larr; Back to admin
        </Link>
        <h1
          className="mt-4 text-3xl font-bold tracking-[var(--letter-spacing-tight)]"
          style={{ fontFamily: "var(--font-heading)" }}
        >
          Correction Patterns
        </h1>
        <p className="mt-2 text-sm text-[var(--color-text-secondary)]">
          Aggregated correction data to inform Gemini prompt tuning.{" "}
          <span className="text-[var(--color-text-tertiary)]">
            {data.totalVerifications} verification{data.totalVerifications !== 1 ? "s" : ""} analyzed.
          </span>
        </p>
      </div>

      {/* 1. Per-field correction frequency */}
      <Section title="Per-Field Correction Frequency" subtitle="Which fields get corrected most often">
        {Object.keys(data.perFieldFrequency).length === 0 ? (
          <EmptyState />
        ) : (
          <div className="space-y-3">
            {Object.entries(data.perFieldFrequency)
              .sort((a, b) => b[1].rate - a[1].rate)
              .map(([field, freq]) => (
                <div key={field} className="space-y-1">
                  <div className="flex items-baseline justify-between gap-4">
                    <span className="font-mono text-xs text-[var(--color-text-secondary)]">
                      {FIELD_LABELS[field] ?? field}
                    </span>
                    <span className="font-mono text-[10px] text-[var(--color-text-tertiary)]">
                      {freq.corrections}/{freq.total} ({freq.rate}%)
                    </span>
                  </div>
                  <Bar
                    value={freq.corrections}
                    max={maxFieldCorrections}
                    color="bg-amber-500/70"
                  />
                </div>
              ))}
          </div>
        )}
      </Section>

      {/* 2. Top correction transitions */}
      <Section title="Common Correction Transitions" subtitle="Most frequent corrections applied by reviewers">
        {data.topTransitions.length === 0 ? (
          <EmptyState />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left font-mono text-xs">
              <thead>
                <tr className="border-b border-white/10 text-[10px] uppercase tracking-wider text-[var(--color-text-tertiary)]">
                  <th className="pb-2 pr-4">Field</th>
                  <th className="pb-2 pr-4">Corrected To</th>
                  <th className="pb-2 text-right">Count</th>
                </tr>
              </thead>
              <tbody>
                {data.topTransitions.slice(0, 25).map((t, i) => (
                  <tr key={i} className="border-b border-white/5">
                    <td className="py-1.5 pr-4 text-[var(--color-text-secondary)]">
                      {FIELD_LABELS[t.field] ?? t.field}
                    </td>
                    <td className="py-1.5 pr-4">
                      <span className="rounded bg-cyan-500/15 px-1.5 py-0.5 text-cyan-400">
                        {t.to}
                      </span>
                    </td>
                    <td className="py-1.5 text-right text-[var(--color-text-tertiary)]">
                      {t.count}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Section>

      {/* 3. Per-film correction rates */}
      <Section title="Per-Film Correction Rates" subtitle="Which films have the highest error rates">
        {filmEntries.length === 0 ? (
          <EmptyState />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left font-mono text-xs">
              <thead>
                <tr className="border-b border-white/10 text-[10px] uppercase tracking-wider text-[var(--color-text-tertiary)]">
                  <th className="pb-2 pr-4">Film</th>
                  <th className="pb-2 pr-4 text-right">Corrections</th>
                  <th className="pb-2 pr-4 text-right">Total Fields</th>
                  <th className="pb-2 text-right">Error Rate</th>
                </tr>
              </thead>
              <tbody>
                {filmEntries.map(([film, freq]) => (
                  <tr key={film} className="border-b border-white/5">
                    <td className="max-w-[200px] truncate py-1.5 pr-4 text-[var(--color-text-secondary)]">
                      {film}
                    </td>
                    <td className="py-1.5 pr-4 text-right text-amber-400">
                      {freq.corrections}
                    </td>
                    <td className="py-1.5 pr-4 text-right text-[var(--color-text-tertiary)]">
                      {freq.total}
                    </td>
                    <td className="py-1.5 text-right">
                      <span
                        className={`rounded px-1.5 py-0.5 ${
                          freq.rate > 30
                            ? "bg-red-500/15 text-red-400"
                            : freq.rate > 15
                              ? "bg-amber-500/15 text-amber-400"
                              : "bg-emerald-500/15 text-emerald-400"
                        }`}
                      >
                        {freq.rate}%
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Section>

      {/* 4. Confidence vs accuracy correlation */}
      <Section
        title="Confidence vs Correction Rate"
        subtitle="Do low-confidence shots actually get corrected more?"
      >
        {data.confidenceVsAccuracy.length === 0 ? (
          <EmptyState />
        ) : (
          <div className="space-y-3">
            {data.confidenceVsAccuracy.map((b) => (
              <div key={b.bucket} className="space-y-1">
                <div className="flex items-baseline justify-between gap-4">
                  <span className="font-mono text-xs text-[var(--color-text-secondary)]">
                    {b.bucket}
                  </span>
                  <span className="font-mono text-[10px] text-[var(--color-text-tertiary)]">
                    {b.correctedShots}/{b.totalShots} corrected ({b.correctionRate}%)
                  </span>
                </div>
                <Bar
                  value={b.correctionRate}
                  max={100}
                  color={
                    b.correctionRate > 30
                      ? "bg-red-500/70"
                      : b.correctionRate > 15
                        ? "bg-amber-500/70"
                        : "bg-emerald-500/70"
                  }
                />
              </div>
            ))}
          </div>
        )}
      </Section>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Shared UI components
// ---------------------------------------------------------------------------

function Section({
  title,
  subtitle,
  children,
}: {
  title: string;
  subtitle: string;
  children: React.ReactNode;
}) {
  return (
    <section
      className="rounded-xl border p-6"
      style={{
        borderColor: "color-mix(in oklch, var(--color-border-default) 60%, transparent)",
        backgroundColor: "color-mix(in oklch, var(--color-surface-secondary) 40%, transparent)",
      }}
    >
      <h2
        className="text-lg font-semibold tracking-[var(--letter-spacing-tight)]"
        style={{ fontFamily: "var(--font-heading)" }}
      >
        {title}
      </h2>
      <p className="mb-5 mt-1 text-xs text-[var(--color-text-tertiary)]">{subtitle}</p>
      {children}
    </section>
  );
}

function EmptyState() {
  return (
    <p className="py-6 text-center text-xs text-[var(--color-text-tertiary)]">
      No correction data yet. Verify some shots to see patterns here.
    </p>
  );
}
