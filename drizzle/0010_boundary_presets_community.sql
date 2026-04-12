-- Community-shared boundary presets: system baselines vs contributions with eval provenance.

ALTER TABLE "boundary_cut_presets"
  ADD COLUMN IF NOT EXISTS "is_system" boolean DEFAULT false NOT NULL;
--> statement-breakpoint
ALTER TABLE "boundary_cut_presets"
  ADD COLUMN IF NOT EXISTS "share_with_community" boolean DEFAULT true NOT NULL;
--> statement-breakpoint
ALTER TABLE "boundary_cut_presets"
  ADD COLUMN IF NOT EXISTS "contributor_label" text;
--> statement-breakpoint
ALTER TABLE "boundary_cut_presets"
  ADD COLUMN IF NOT EXISTS "validated_f1" real;
--> statement-breakpoint
ALTER TABLE "boundary_cut_presets"
  ADD COLUMN IF NOT EXISTS "source_eval_run_id" uuid REFERENCES "boundary_eval_runs"("id") ON DELETE SET NULL;
--> statement-breakpoint
UPDATE "boundary_cut_presets"
SET "is_system" = true
WHERE "slug" IS NOT NULL;
