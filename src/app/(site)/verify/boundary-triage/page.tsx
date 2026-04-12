import type { Metadata } from "next";

import { BoundaryTriageWorkspace } from "@/components/verify/boundary-triage-workspace";

export const metadata: Metadata = {
  title: "Cut verification",
  description:
    "Human-in-the-Loop cut verification: before/after frames at each flagged boundary, confidence filter, clusters, and keyboard shortcuts.",
};

export default function BoundaryTriagePage() {
  return <BoundaryTriageWorkspace />;
}
