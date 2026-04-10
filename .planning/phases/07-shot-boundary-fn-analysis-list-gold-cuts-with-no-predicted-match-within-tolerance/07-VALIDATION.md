---
phase: 07
slug: shot-boundary-fn-analysis-list-gold-cuts-with-no-predicted-match-within-tolerance
status: draft
nyquist_compliant: true
wave_0_complete: true
created: 2026-04-10
---

# Phase 07 — Validation Strategy

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | Vitest 3.x |
| **Config file** | `vitest.config.ts` |
| **Quick run command** | `pnpm test` |
| **Full suite command** | `pnpm test` |
| **Estimated runtime** | ~5 s |

## Sampling Rate

- **After every task commit:** `pnpm test`
- **After every plan wave:** `pnpm test`
- **Before `/gsd-verify-work`:** `pnpm test` green

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Test Type | Automated Command | Status |
|---------|------|------|-------------|-----------|-------------------|--------|
| 07-01-01 | 01 | 1 | — | manual grep | `rg "eval:boundary-misses" docs/tuning-flow.md eval/runs/README.md` | ⬜ |
| 07-01-02 | 01 | 1 | — | unit | `pnpm test` includes `eval-cuts` or `boundary-eval` | ⬜ |
| 07-02-01 | 02 | 1 | — | unit + CLI | `pnpm test`; `pnpm eval:boundary-misses -- ... --markdown` file exists | ⬜ |

## Wave 0 Requirements

- [x] Vitest already installed — no Wave 0 install.

## Manual-Only Verifications

| Behavior | Why Manual | Test Instructions |
|----------|------------|-------------------|
| Markdown report readable | Human scan | Open generated `.md` under `eval/runs/`; confirm FN/FP sections and metric line match `eval:pipeline` for same inputs. |

## Validation Sign-Off

- [ ] `pnpm test` green after Phase 7 execution
- [ ] `pnpm eval:smoke` green

**Approval:** pending
