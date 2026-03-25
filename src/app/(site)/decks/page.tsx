import type { Metadata } from "next";

import { DeckManager } from "@/components/decks/deck-manager";

export const metadata: Metadata = {
  title: "Reference Decks",
  description:
    "Create and manage curated shot collections for cinematography research and pre-production reference.",
};

export default function DecksPage() {
  return (
    <div className="space-y-8">
      <section className="max-w-3xl">
        <p className="font-mono text-xs uppercase tracking-[var(--letter-spacing-wide)] text-[var(--color-text-tertiary)]">
          Reference decks
        </p>
        <h1
          className="mt-4 text-4xl font-bold tracking-[var(--letter-spacing-tight)] sm:text-5xl"
          style={{ fontFamily: "var(--font-heading)" }}
        >
          Curated shot collections
        </h1>
        <p className="mt-4 text-base leading-8 text-[var(--color-text-secondary)]">
          Build reference decks from shots across the archive. Export as JSON or
          CSV for storyboards, research, and pre-production planning.
        </p>
      </section>

      <DeckManager />
    </div>
  );
}
