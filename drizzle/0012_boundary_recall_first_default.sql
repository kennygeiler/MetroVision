-- Recall-first product baseline: tighten default merge gap + refresh copy on seeded preset row.

UPDATE "boundary_cut_presets"
SET
  "name" = 'Recall-first default (ensemble)',
  "description" = 'PyScene ensemble + merge_flat; recall-first merge gap (0.18 s). See eval/runs/STATUS.md.',
  "config" = "config" || '{"mergeGapSec": 0.18}'::jsonb,
  "updated_at" = now()
WHERE "slug" = 'cemented-ran-2026-04-11';
