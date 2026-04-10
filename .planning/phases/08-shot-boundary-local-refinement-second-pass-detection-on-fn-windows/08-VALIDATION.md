---
phase: 08
slug: shot-boundary-local-refinement-second-pass-detection-on-fn-windows
status: draft
nyquist_compliant: true
wave_0_complete: true
created: 2026-04-10
---

# Phase 08 — Validation Strategy

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | Vitest 3.x |
| **Quick run command** | `pnpm test` |
| **Full suite command** | `pnpm test` |

## Per-Task Verification Map

| Task ID | Plan | Automated Command | Status |
|---------|------|-------------------|--------|
| 08-01-01 | 01 | `pnpm test` + script `--help` contains `refine` flags | ⬜ |
| 08-02-01 | 02 | `rg "detect:refine" AGENTS.md docs/tuning-flow.md` | ⬜ |

## Manual-Only Verifications

| Behavior | Instructions |
|----------|--------------|
| E2E detect on real MP4 | Run with `--max-windows 2` on a short clip; confirm JSON `cutsSec` length ≥ baseline and `eval:pipeline` recall ≥ baseline or document FP regression. |

## Validation Sign-Off

- [ ] `pnpm test` green
- [ ] `pnpm eval:smoke` green

**Approval:** pending
