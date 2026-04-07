import type { Metadata } from "next";

import { VizDashboard } from "@/components/visualize/viz-dashboard";
import { getVisualizationData } from "@/db/queries";

export const metadata: Metadata = {
  title: "Visualize",
  description:
    "Composition, staging, and lighting patterns across the MetroVision archive—framing adjacency, depth×blocking, and director fingerprints for research.",
};

export default async function VisualizePage() {
  const data = await getVisualizationData();

  return <VizDashboard data={data} />;
}
