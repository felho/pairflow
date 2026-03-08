# Docs-Only Issues Status Index

Date: 2026-03-08
Scope: `plans/tasks/doc-only-issues/`
Primary source: `doc-only-priority-and-rollout-plan-2026-03-04.md`

## Legend

- `READY`: merged/completed in mainline.
- `ACTIVE`: in progress right now.
- `NOT_STARTED`: defined but not started.
- `BACKLOG`: documented idea/task, not currently in active execution sequence.
- `PARKED`: intentionally deferred; no active task file at the moment.

## Current Status Matrix

| File | Track | Status | Need Implementation? | Notes |
|---|---|---|---|---|
| `doc-only-temporary-disable-runtime-checks-phase1.md` | P0/1 | READY | no | Completed and merged (priority plan snapshot). |
| `doc-only-summary-verifier-consistency-gate-phase1.md` | P0/2 | READY | no | Completed and merged (priority plan snapshot). |
| `doc-only-evidence-source-whitelist-phase1.md` | P1/1 | READY | no | Completed and merged (`80c0c58`, `b71d3e3`). |
| `doc-only-operational-decision-matrix-and-rollout-phase1.md` | P1/2 | ACTIVE | yes (rollout/process) | Task spec is ready; source-of-truth sync done, baseline frozen, and first weekly windows (`2026-W09`, `2026-W10`) logged; rollout monitoring remains active. |
| `P2/1 claim-based validation architecture (no active task file)` | P2/1 | PARKED | no (for now) | Task file was intentionally removed in `c1739e7`; revisit only if a concrete docs-only runtime-claim use case reappears. |
| `doc-only-review-loop-ws-d-pilot-and-metrics-phase1.md` | WS-D pilot | NOT_STARTED | yes (pilot execution/docs) | Task is `draft`; pilot run/report still pending. |
| `WS-D large-feature process-test anchor (external PRD)` | WS-D pilot extension | ACTIVE | yes (tracking/docs) | `docs/meta-review-gate-prd.md` kijelolve large-feature process-test anchor-kent (`2026-03-08`); pilot report/memo bekotes pending. |
| `artifact-type-ownership-enforcement-phase1.md` | related hardening | BACKLOG | yes (code + policy) | Spec rewritten to strict explicit mode (`document|code`, no create-time `auto`) in `20390cb`; further doc-refinement is running in bubble `doc-refine-artifact-type-ownership-strict-v1`; queue status remains `BACKLOG` until promotion. |
| `review-loop-complexity-memo-2026-03-04.md` | umbrella memo | ACTIVE | partial | Program memo says WS-A/B/C delivered, WS-D pending. |
| `doc-only-priority-and-rollout-plan-2026-03-04.md` | control plan | ACTIVE | n/a (tracking doc) | Living status/sequence document; should be kept up to date. |

## Direct Answer: What Is Still To Implement

1. P1/2 operational rollout execution (matrix adoption in routine + metric collection window).
2. WS-D pilot execution and pilot report/go-hold outcome.
3. WS-D large-feature extension lane explicit report/memo bekotese (`docs/meta-review-gate-prd.md` process-test outcome).
4. Artifact-type ownership enforcement if promoted from backlog to active scope.

## WS-D Pilot Candidate Mapping (2026-03-07)

1. `bugfix` slot -> `plans/tasks/RHI/reviewer-summary-diff-scope-prompt-hardening-phase1.md` (`READY`: implemented and merged via `f22124c`, `c21b80e`, `8486970`; moved to RHI).
2. `small feature` slot -> `plans/tasks/doc-only-issues/artifact-type-ownership-enforcement-phase1.md` (explicitly designated as pilot small-feature candidate; currently `BACKLOG`).
3. `docs-only hardening` slot -> pending explicit designation in a follow-up update.
4. `large feature` extension slot -> `docs/meta-review-gate-prd.md` (`ACTIVE`: PRD discussion refinement complete on `2026-03-08`; WS-D pilot report linkage pending).
