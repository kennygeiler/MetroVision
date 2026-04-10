import type { ReactNode } from "react";

import { SiteShell } from "@/components/layout/site-shell";

/** Avoid prerendering DB-backed pages at `next build` (CI without a live Neon URL). */
export const dynamic = "force-dynamic";

export default function SiteLayout({ children }: { children: ReactNode }) {
  return <SiteShell>{children}</SiteShell>;
}
