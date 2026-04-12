import { redirect } from "next/navigation";

/** Alias so the Boundary Tuning journey stays under `/tuning/*`. */
export default function BoundaryTuningAnnotateRedirectPage() {
  redirect("/eval/gold-annotate");
}
