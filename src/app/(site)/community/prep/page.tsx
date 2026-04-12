import { redirect } from "next/navigation";

/** Old URL — Boundary Tuning lives under `/tuning`. */
export default function LegacyCommunityPrepRedirectPage() {
  redirect("/tuning/prep");
}
