# Docs-Only Issues Status Index

Date: 2026-03-07
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
| `artifact-type-ownership-enforcement-phase1.md` | related hardening | BACKLOG | yes (code + policy) | Defined task, not listed as active in current priority sequence. |
| `review-loop-complexity-memo-2026-03-04.md` | umbrella memo | ACTIVE | partial | Program memo says WS-A/B/C delivered, WS-D pending. |
| `doc-only-priority-and-rollout-plan-2026-03-04.md` | control plan | ACTIVE | n/a (tracking doc) | Living status/sequence document; should be kept up to date. |

## Direct Answer: What Is Still To Implement

1. P1/2 operational rollout execution (matrix adoption in routine + metric collection window).
2. WS-D pilot execution and pilot report/go-hold outcome.
3. Artifact-type ownership enforcement if promoted from backlog to active scope.
