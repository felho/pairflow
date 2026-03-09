# Docs-Only Issues Status Index

Date: 2026-03-09
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
| `doc-only-review-loop-ws-d-pilot-and-metrics-phase1.md` | WS-D pilot | READY | no | Pilot report completed in `docs/review-loop-ws-d-pilot-report-2026-03.md` (`decision=go`, `2026-03-09`), WS-D docs-workflow scope filtering explicit. |
| `WS-D large-feature process-test anchor (external PRD)` | WS-D pilot extension | READY | no | `docs/meta-review-gate-prd.md` marked implemented/released (`2026-03-09`) and explicitly linked from pilot report (`docs/review-loop-ws-d-pilot-report-2026-03.md`). |
| `artifact-type-ownership-enforcement-phase1.md` | related hardening | READY | no (slot candidate done) | Small-feature candidate implementation merged (`4bbeb03`, `8383efe`), majd task contract/refine sync lezarva (`47fdb54`, `3fb675e`, `20390cb`). |
| `review-loop-complexity-memo-2026-03-04.md` | umbrella memo | ACTIVE | partial | Program memo updated: WS-A/B/C delivered, WS-D pilot assessed (`go`, `2026-03-09`, scope-filtered). |
| `doc-only-priority-and-rollout-plan-2026-03-04.md` | control plan | ACTIVE | n/a (tracking doc) | Living status/sequence document; should be kept up to date. |

## Direct Answer: What Is Still To Implement

1. P1/2 operational rollout execution (matrix adoption in routine + metric collection window).
2. Phase 2 docs-workflow enforce rollout monitoring (scope-filtered WS-D metrics).
3. Meta-review rollout-readiness kulon lane-ben marad (nem WS-D gate input).

## WS-D Pilot Candidate Mapping (2026-03-09)

1. `bugfix` slot -> `plans/tasks/RHI/reviewer-summary-diff-scope-prompt-hardening-phase1.md` (`READY`: implemented and merged via `f22124c`, `c21b80e`, `8486970`; moved to RHI).
2. `small feature` slot -> `plans/tasks/doc-only-issues/artifact-type-ownership-enforcement-phase1.md` (`READY`: implemented via `bubble/impl-artifact-type-ownership-strict-v1` (`4bbeb03`, merged `8383efe`), then contract-refine sync (`47fdb54`, `3fb675e`)).
3. `docs-only hardening` slot -> `plans/tasks/doc-only-issues/doc-only-evidence-source-whitelist-phase1.md` (`READY`: docs-only refine candidate from bubble history `7717faa`; implementation/merge trail also completed: `80c0c58`, `b71d3e3`).
4. `large feature` extension slot -> `docs/meta-review-gate-prd.md` (`READY`: implemented/released PRD with explicit WS-D pilot linkage in `docs/review-loop-ws-d-pilot-report-2026-03.md`).
