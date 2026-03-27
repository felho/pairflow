# Docs-Only Issues Status Index

Date: 2026-03-27
Scope: `plans/archive/tasks/doc-only-issues/`
Primary source: `doc-only-priority-and-rollout-plan-2026-03-04.md`

## Legend

- `READY`: merged/completed in mainline.
- `ACTIVE`: in progress right now.
- `NOT_STARTED`: defined but not started.
- `BACKLOG`: documented idea/task, not currently in active execution sequence.
- `PARKED`: intentionally deferred; no active task file at the moment.
- `HISTORICAL`: retained as reference only; no active implementation or rollout remains.

## Current Status Matrix

| File | Track | Status | Need Implementation? | Notes |
|---|---|---|---|---|
| `doc-only-temporary-disable-runtime-checks-phase1.md` | P0/1 | READY | no | Completed and merged (priority plan snapshot). |
| `doc-only-summary-verifier-consistency-gate-phase1.md` | P0/2 | READY | no | Completed and merged (priority plan snapshot). |
| `doc-only-evidence-source-whitelist-phase1.md` | P1/1 | READY | no | Completed and merged (`80c0c58`, `b71d3e3`). |
| `doc-only-operational-decision-matrix-and-rollout-phase1.md` | P1/2 | HISTORICAL | no | Task/spec, source-of-truth sync, baseline freeze, and weekly windows (`2026-W09`, `2026-W10`) were completed; config-based enforcement rollout was not continued after `9fab8f1` and `c55a90c` removed the config surface on `2026-03-27`. |
| `P2/1 claim-based validation architecture (no active task file)` | P2/1 | PARKED | no (for now) | Task file was intentionally removed in `c1739e7`; revisit only if a concrete docs-only runtime-claim use case reappears. |
| `doc-only-review-loop-ws-d-pilot-and-metrics-phase1.md` | WS-D pilot | READY | no | Pilot report completed in `docs/review-loop-ws-d-pilot-report-2026-03.md` (`decision=go`, `2026-03-09`), WS-D docs-workflow scope filtering explicit. |
| `WS-D large-feature process-test anchor (external PRD)` | WS-D pilot extension | READY | no | `docs/meta-review-gate-prd.md` marked implemented/released (`2026-03-09`) and explicitly linked from pilot report (`docs/review-loop-ws-d-pilot-report-2026-03.md`). |
| `artifact-type-ownership-enforcement-phase1.md` | related hardening | READY | no (slot candidate done) | Small-feature candidate implementation merged (`4bbeb03`, `8383efe`), majd task contract/refine sync lezarva (`47fdb54`, `3fb675e`, `20390cb`). |
| `review-loop-complexity-memo-2026-03-04.md` | umbrella memo | HISTORICAL | no | Program memo retained as a closed historical record; the old phased enforcement rollout model is no longer active. |
| `doc-only-priority-and-rollout-plan-2026-03-04.md` | control plan | HISTORICAL | no | Control plan closed on `2026-03-27`; retained for baseline, sequence, and decision history only. |

## Direct Answer: What Is Still To Implement

1. Nothing in this folder requires further implementation or active rollout.
2. `P2/1` remains intentionally parked after `c1739e7`; reopen only if a new, concrete docs-only runtime-claim use case appears.
3. Meta-review rollout-readiness remains a separate lane and is not a reason to keep this folder active.
4. The folder now serves as archived historical documentation under `plans/archive/tasks/doc-only-issues/`.

## WS-D Pilot Candidate Mapping (2026-03-09)

1. `bugfix` slot -> `plans/tasks/RHI/reviewer-summary-diff-scope-prompt-hardening-phase1.md` (`READY`: implemented and merged via `f22124c`, `c21b80e`, `8486970`; moved to RHI).
2. `small feature` slot -> `plans/archive/tasks/doc-only-issues/artifact-type-ownership-enforcement-phase1.md` (`READY`: implemented via `bubble/impl-artifact-type-ownership-strict-v1` (`4bbeb03`, merged `8383efe`), then contract-refine sync (`47fdb54`, `3fb675e`)).
3. `docs-only hardening` slot -> `plans/archive/tasks/doc-only-issues/doc-only-evidence-source-whitelist-phase1.md` (`READY`: docs-only refine candidate from bubble history `7717faa`; implementation/merge trail also completed: `80c0c58`, `b71d3e3`).
4. `large feature` extension slot -> `docs/meta-review-gate-prd.md` (`READY`: implemented/released PRD with explicit WS-D pilot linkage in `docs/review-loop-ws-d-pilot-report-2026-03.md`).
