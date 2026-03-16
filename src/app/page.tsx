export default function Home() {
  return (
    <main className="min-h-screen">
      <section className="mx-auto flex min-h-screen w-full max-w-6xl flex-col justify-center px-6 py-24 sm:px-10 lg:px-16">
        <div
          className="w-full max-w-3xl border border-[var(--color-border-subtle)] px-6 py-12 backdrop-blur-sm sm:px-10 sm:py-16"
          style={{
            backgroundColor:
              "color-mix(in oklch, var(--color-surface-secondary) 72%, transparent)",
            boxShadow: "var(--shadow-lg)",
          }}
        >
          <p className="font-mono text-xs uppercase tracking-[0.18em] text-[var(--color-text-secondary)]">
            Camera Motion Database
          </p>
          <h1 className="mt-6 font-sans text-5xl font-bold tracking-[var(--letter-spacing-tight)] text-[var(--color-text-primary)] sm:text-7xl">
            SceneDeck
          </h1>
          <p className="mt-6 max-w-2xl text-base leading-7 text-[var(--color-text-secondary)] sm:text-lg">
            Structured metadata for iconic cinema shots, built for playback-aware overlays, movement search, and rigorous film analysis.
          </p>
          <div className="mt-10 flex flex-wrap gap-3">
            <span className="rounded-full border border-[var(--color-border-default)] px-3 py-1 font-mono text-xs uppercase tracking-[0.14em] text-[var(--color-overlay-arrow)]">
              Motion
            </span>
            <span className="rounded-full border border-[var(--color-border-default)] px-3 py-1 font-mono text-xs uppercase tracking-[0.14em] text-[var(--color-overlay-trajectory)]">
              Trajectory
            </span>
            <span className="rounded-full border border-[var(--color-border-default)] px-3 py-1 font-mono text-xs uppercase tracking-[0.14em] text-[var(--color-overlay-badge)]">
              Metadata
            </span>
          </div>
        </div>
      </section>
    </main>
  );
}
