---
artifact_type: plan
artifact_id: plan_meta_review_consecutive_clean_runs_v1
plan_id: meta-review-consecutive-clean-runs-plan-v1
created_on: "2026-04-27"
title: "Meta-Review Consecutive Clean Runs Plan"
status: approved
plan_status: approved
prd_ref: null
owners:
  - "felho"
task_order:
  - 1-clean-runs-policy-state
  - 2-clean-runs-gate-routing
  - 3-clean-runs-read-model-ui
  - 4-clean-runs-docs-validation
active_task_id: 2-clean-runs-gate-routing
archive_group: 2026-04-27-meta-review-consecutive-clean-runs-plan-v1
task_tracker:
  - task_id: 1-clean-runs-policy-state
    task_path: plans/archive/tasks/2026-04-27-meta-review-consecutive-clean-runs-plan-v1/1-clean-runs-policy-state.md
    status: archived
  - task_id: 2-clean-runs-gate-routing
    task_path: plans/tasks/meta-review-consecutive-clean-runs/2-clean-runs-gate-routing.md
    status: approved
  - task_id: 3-clean-runs-read-model-ui
    task_path: null
    status: not_created
  - task_id: 4-clean-runs-docs-validation
    task_path: null
    status: not_created
---

# Plan: Meta-Review Consecutive Clean Runs

## Objective

1. Add a configurable review-policy setting that requires multiple consecutive threshold-clean meta-review runs before Pairflow may route a bubble to human approval.
2. Preserve the current threshold-based meta-review auto-rework behavior while adding a deterministic, stateful confidence gate for repeated clean meta-review passes.
3. Add a compact UI preset selector that writes both backend settings together without expanding the UI surface into multiple separate controls.

## Done Definition

1. Pairflow accepts and normalizes a new `review_policy` setting that defines how many consecutive clean meta-review runs are required before human approval routing is allowed.
2. Canonical bubble state persists the current clean-run streak needed to enforce this policy across meta-review runs.
3. A threshold-clean meta-review `approve` result increments the streak and either:
   - triggers another meta-review run when the configured requirement is not yet met, or
   - routes to `READY_FOR_HUMAN_APPROVAL` when the requirement is met.
4. Any threshold-meeting finding, `inconclusive`, or meta-review failure-style terminal outcome resets the streak to `0`.
5. Status/read-model surfaces expose both the configured requirement and the current streak so operators can understand why human approval is or is not unlocked.
6. The UI exposes a single compact preset selector with exact supported mappings:
   - `P1` -> `(meta_review_auto_rework_min_severity=P1, meta_review_consecutive_clean_runs_required=1)`
   - `P2` -> `(P2, 1)`
   - `P3` -> `(P3, 1)`
   - `P3+2` -> `(P3, 2)`
7. The UI label/tooltip/copy is updated to reflect that this control sets a meta-review quality preset rather than only a severity threshold.
8. Tests cover config normalization, state validation, streak increment/reset semantics, rerun routing, final unlock routing, and UI preset mapping behavior.

## Guiding Principles

1. Business invariant: human approval must not become available until Pairflow has observed the configured number of consecutive meta-review results that are clean relative to the canonical meta-review severity threshold.
2. Control model: the canonical authority for whether a run is clean is the finalized meta-review gate decision derived from the submitted meta-review result plus threshold evaluation against `review_policy.meta_review_auto_rework_min_severity`.
3. Read-path rule: routing, counters, operator status, and UI preset projection must read the threshold and streak from canonical bubble state and canonical finalized meta-review outputs, not from transient pane/runtime observations.
4. Forbidden fallback: do not infer streak state from transcript heuristics, UI-only projections, or prior human-gate status; do not treat a generic `approve` recommendation as clean unless threshold evaluation confirms no threshold-meeting findings; do not silently display an unsupported backend `(threshold, clean-run-count)` pair as one of the compact UI presets unless it is an exact match.
5. Allowed resolution path: the meta-review gate may immediately re-enter another meta-review run after a threshold-clean `approve` result when the required streak has not yet been reached; no implementer/reviewer round is required for that clean-rerun path. The UI may encode a supported backend pair as a single quality-level preset as long as the write-path remains deterministic and exact.
6. Missing-data rule: if threshold authority or canonical result finalization is unresolved, fail closed by not advancing the streak and by preserving existing safe human-gate failure routing semantics. If the backend settings form an unsupported pair for the compact preset UI, project a non-misleading fallback/custom state rather than a wrong preset label.
7. Sequencing / boundary note:
   - producer-first rule: establish config normalization and canonical state shape before changing gate routing.
   - downstream consume families that remain separate: workflow orchestration consumers and read-model/status/UI consumers.
   - cleanup/recovery timing: included now only where needed to preserve canonical streak state across normal gate execution and restart-safe state reads; broader recovery redesign is deferred.

## Canonical Contract Anchors

1. Source-of-truth anchors:
   - `src/types/bubble.ts`
   - `src/config/defaults.ts`
   - `src/config/bubbleConfig.ts`
   - `src/v11/shared/reviewPolicy/reviewPolicyRuntime.ts`
   - `src/v11/shared/metaReview/metaReviewSnapshot.ts`
   - `src/v11/shared/metaReviewGate/metaReviewGateCurrentRunFinalization.ts`
   - `src/v11/shared/metaReviewGate/metaReviewGateStateHelpers.ts`
   - `src/v11/shared/metaReviewGate/metaReviewGateCurrentRunRoutePersistence.ts`
2. Closed canonical elements / terms:
   - `review_policy.meta_review_auto_rework_min_severity` remains the threshold authority for whether findings are relevant for meta-review auto-rework and clean-run evaluation.
   - Meta-review gate routing remains canonical only after current-run finalization, not from raw pane/runtime observations.
   - `auto_rework_count` / `auto_rework_limit` remain budget controls, not confidence-streak controls.
3. Explicitly authorized reinterpretation (if any): introduce a new review-policy control and a separate canonical streak counter; no reinterpretation of existing severity labels or auto-rework budget semantics is authorized.
4. Downstream task impact: all downstream tasks must preserve the distinction between threshold evaluation, auto-rework budget tracking, and the new clean-streak tracking.
   UI-facing tasks must also preserve the distinction between backend canonical settings and the compact preset encoding used in the dropdown surface.

## Current Status

### Completed Work

1. Pairflow already has canonical review-policy normalization for `reviewer_blocking_min_severity` and `meta_review_auto_rework_min_severity`.
2. Meta-review gate finalization already evaluates threshold authority and routes either to auto-rework or human-gate outcomes.
3. Meta-review state already persists gate-local runtime state such as execution context, runtime delivery observation, sticky human gate, and auto-rework budget counters.

### Open Work

1. No review-policy field currently defines the required consecutive clean meta-review run count.
2. No canonical meta-review state field currently persists a clean-run streak.
3. Current meta-review gate finalization is single-pass with respect to clean approvals; it cannot intentionally re-run meta-review without involving implementer/reviewer or human approval.
4. Operator/read-model surfaces do not yet explain clean-streak progress or the configured requirement.
5. The current UI severity dropdown does not yet support compact quality presets or naming that reflects combined threshold-plus-streak semantics.

### Deferred / Future Work

1. N/A.

## Progress / Phase Summary

1. Phase 1: policy and canonical state introduction completed and archived from `clean-runs-policy-state-impl`.
2. Phase 2: gate-routing behavior change for clean reruns and unlocks.
3. Phase 3: observability and UI preset surfacing.
4. Phase 4: docs and final validation.

## Open Task List

| Task | Purpose | Depends On | Closes Gap | Status |
|---|---|---|---|---|
| `plans/archive/tasks/2026-04-27-meta-review-consecutive-clean-runs-plan-v1/1-clean-runs-policy-state.md` | Add the new review-policy field, defaults, parsing, runtime normalization, and canonical meta-review streak state shape. | `N/A` | Missing config/state foundation for the feature. | archived |
| `plans/tasks/meta-review-consecutive-clean-runs/2-clean-runs-gate-routing.md` | Update current-run meta-review finalization to increment/reset the streak and route directly to another meta-review run until the configured requirement is met. | `1-clean-runs-policy-state.md` | Missing workflow-orchestration behavior for consecutive clean runs. | open |
| `plans/tasks/meta-review-consecutive-clean-runs/3-clean-runs-read-model-ui.md` | Expose the configured requirement and current streak in status/read-model projections, add the compact UI preset selector mapping (`P1`, `P2`, `P3`, `P3+2`), and update the control label/tooltip to quality-level language. | `2-clean-runs-gate-routing.md` | Missing operator observability and compact UI control for the new gate behavior. | open |
| `plans/tasks/meta-review-consecutive-clean-runs/4-clean-runs-docs-validation.md` | Update repo docs/spec references and close the validation matrix across unit/integration/build and UI mapping checks. | `2-clean-runs-gate-routing.md`, `3-clean-runs-read-model-ui.md` | Missing documentation and completion evidence. | open |

## Coverage Map

| Plan Gap | Closed By | Notes |
|---|---|---|
| New review-policy contract for required consecutive clean runs | `1-clean-runs-policy-state.md` | Includes default `1` and `>= 1` validation. |
| Canonical persistence of current clean streak | `1-clean-runs-policy-state.md` | Must remain separate from `auto_rework_count`. |
| Direct meta-review rerun path for threshold-clean approvals below required streak | `2-clean-runs-gate-routing.md` | Must bypass implementer/reviewer on clean reruns. |
| Reset semantics for threshold-meeting findings and non-clean terminal outcomes | `2-clean-runs-gate-routing.md` | Includes `inconclusive` and failure-style outcomes. |
| Operator visibility into requirement vs current streak | `3-clean-runs-read-model-ui.md` | Avoids opaque autonomous-loop behavior. |
| Compact single-dropdown UI encoding for supported quality presets | `3-clean-runs-read-model-ui.md` | Must map exact backend pairs only; unsupported pairs need non-misleading fallback handling. |
| UI control naming that reflects combined threshold-plus-streak semantics | `3-clean-runs-read-model-ui.md` | Label/tooltip should shift toward `metaReviewQualityLevel` semantics. |
| Spec/docs alignment and implementation proof | `4-clean-runs-docs-validation.md` | Must update docs because workflow semantics change. |

## Dependencies and Order

1. Config/state foundation must land before gate-routing changes so the routing logic has one canonical source for both the required streak and the persisted current streak.
2. Gate-routing semantics must land before status/read-model/UI preset updates, otherwise operator surfaces would project behavior that does not exist yet.
3. UI preset work depends on the backend pair contract being stable first, because the dropdown is a compact encoding of two canonical settings rather than an independent source of truth.
4. Docs must be updated after the routing and UI/read-model behavior are settled, but in the same workstream before the feature is treated as complete.
5. Validation must include targeted unit coverage first, then broader type/build checks, because this feature crosses config parsing, canonical state, orchestration, read-model, and UI preset surfaces.

## Risks and Assumptions

1. Assumption: only threshold-clean `approve` results advance the streak; `inconclusive` never counts.
2. Assumption: any threshold-meeting finding resets the streak to `0`, even if the recommendation shape or report wording changes in the future.
3. Risk: if the rerun path is implemented by overloading existing auto-rework semantics, budget and streak behavior could become entangled; tasks must keep those controls separate.
4. Risk: status/read-model drift could make the new autonomous rerun loop hard to understand unless the current streak and required count are explicitly surfaced.
5. Risk: a UI control that still looks like a plain severity selector could mislead users once it starts writing two backend settings; label/tooltip/copy must make the quality-preset semantics explicit.
6. Risk: unsupported backend pairs such as `(P2, 2)` could be misrepresented in the compact UI if exact-match projection is not enforced.
7. Risk: restart/recovery paths that preserve meta-review execution context but not the new streak field could create apparent nondeterminism; state normalization and schema coverage must include the new field.

## Validation Strategy

1. Add review-policy normalization tests for the new field in the shared review-policy runtime test suite.
2. Add config parsing/validation tests for valid and invalid `review_policy.meta_review_consecutive_clean_runs_required` values.
3. Add state-schema and snapshot-normalization tests for the new canonical streak field.
4. Add meta-review gate tests covering:
   - clean approve increments streak,
   - clean approve below required streak triggers another meta-review run,
   - clean approve at required streak unlocks human approval,
   - threshold-meeting findings reset the streak,
   - `inconclusive` and failure-style outcomes reset the streak.
5. Add read-model/status tests for visibility of the configured requirement and current streak.
6. Add UI projection/update tests for:
   - `P1 -> (P1,1)`
   - `P2 -> (P2,1)`
   - `P3 -> (P3,1)`
   - `P3+2 -> (P3,2)`
   - unsupported backend pairs projecting to a non-misleading fallback/custom state
   - updated label/tooltip/copy reflecting quality-level semantics
7. Run targeted test suites, then `pnpm build`, and any broader lint/typecheck suites needed by touched surface area.
