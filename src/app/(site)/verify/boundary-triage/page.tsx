import type { Metadata } from "next";

import { BoundaryTriageWorkspace } from "@/components/verify/boundary-triage-workspace";

export const metadata: Metadata = {
  title: "Boundary cut triage",
  description:
    "Bulk Human-in-the-Loop review for AI-flagged shot boundaries: before/after frames, confidence filter, and keyboard shortcuts.",
};

export default function BoundaryTriagePage() {
  return <BoundaryTriageWorkspace />;
}
