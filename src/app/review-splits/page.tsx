import type { Metadata } from "next";

import { ReviewSplitsWorkspace } from "@/components/review/review-splits-workspace";

export const metadata: Metadata = {
  title: "Review Splits",
  description: "Review detected shot boundaries and export corrected splits.",
};

export default function ReviewSplitsPage() {
  return (
    <main className="h-[100dvh] overflow-hidden bg-[var(--color-surface-primary)]">
      <ReviewSplitsWorkspace />
    </main>
  );
}
