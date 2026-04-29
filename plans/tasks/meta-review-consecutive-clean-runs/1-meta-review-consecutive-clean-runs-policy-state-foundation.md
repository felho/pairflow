---
artifact_type: task
artifact_id: task_meta_review_consecutive_clean_runs_policy_state_foundation_v1
task_family_id: meta-review-consecutive-clean-runs-policy-state-foundation
sequence_key: "1"
task_id: 1-meta-review-consecutive-clean-runs-policy-state-foundation
title: "Meta-Review Consecutive Clean Runs Policy + State Foundation"
status: approved
phase: phase1
target_files:
  - src/types/bubble.ts
  - src/config/defaults.ts
  - src/config/bubbleConfig.ts
  - src/v11/shared/reviewPolicy/reviewPolicyRuntime.ts
  - src/v11/shared/metaReview/metaReviewSnapshot.ts
  - src/v11/shared/metaReviewGate/metaReviewGateSnapshotHelpers.ts
  - src/v11/shared/state/stateSchema.ts
  - tests/config/bubbleConfig.test.ts
  - tests/v11/shared/reviewPolicy/reviewPolicyRuntime.test.ts
  - tests/v11/shared/metaReviewGate/metaReviewGateStateStaging.test.ts
prd_ref: null
plan_ref: plans/meta-review-consecutive-clean-runs-plan-v1.md
system_context_ref: docs/pairflow-initial-design.md
owners:
  - "felho"
doc_bubble_id: null
impl_bubble_id: null
supersedes: []
superseded_by: null
archive_group: 2026-04-27-meta-review-consecutive-clean-runs-plan-v1
---

# Task: Meta-Review Consecutive Clean Runs Policy + State Foundation

## L0 - Policy

### Goal

Add the canonical policy and state foundation for configurable consecutive clean meta-review runs.

This task introduces the persisted config field, defaulting, parsing, runtime normalization, and canonical meta-review streak state shape only. It does not change meta-review gate routing behavior.

### Domain / Control Model Summary

1. Business invariant: human approval must eventually be gated by a configured count of consecutive threshold-clean meta-review runs, but this task only creates the authority surfaces needed by later routing.
2. Control model: `bubble.toml` `review_policy.meta_review_consecutive_clean_runs_required` is the configured requirement; canonical bubble state `meta_review.consecutive_clean_runs` is the persisted current streak.
3. Read-path rule: implementation must read the requirement through review-policy normalization and the streak through normalized canonical meta-review state.
4. Forbidden fallback: do not infer the required count or current streak from transcript text, prior human-gate state, UI-only preset labels, auto-rework counters, or recommendation prose.
5. Allowed resolution path: missing persisted config defaults to `1`; missing persisted streak state normalizes to `0`.
6. Missing-data rule: invalid configured counts fail validation; absent state shape normalizes to a safe zero-streak baseline.
7. Phase boundary:
   - contract closure: owned here for policy and streak field shape
   - producer closure: owned here for parse/default/normalize and state normalization
   - internal execution closure: not owned here
   - workflow/orchestration closure: successor task
   - read-model closure: successor task
   - activation closure: none
   - cleanup/recovery closure: state normalization only; broader recovery behavior is successor/deferred

### Plan Linkage

1. Parent plan gap closed: new review-policy contract and canonical persistence of the current clean streak.
2. Depends on: current merged review-policy and meta-review snapshot baseline.
3. Unlocks / impacts successors: `2-meta-review-consecutive-clean-runs-gate-routing-streak-semantics` may consume normalized requirement and streak without inventing local fallback semantics.
4. Task-list impact: refines `1-meta-review-consecutive-clean-runs-policy-state-foundation`.
5. Inherited validation / exit expectation: config parsing/validation, runtime normalization, and state normalization tests must prove default `1`, invalid count rejection, and missing state -> streak `0`.

### Canonical Contract Anchors

1. Source-of-truth anchors:
   - `src/types/bubble.ts`
   - `src/config/defaults.ts`
   - `src/config/bubbleConfig.ts`
   - `src/v11/shared/reviewPolicy/reviewPolicyRuntime.ts`
   - `src/v11/shared/metaReview/metaReviewSnapshot.ts`
   - `src/v11/shared/metaReviewGate/metaReviewGateSnapshotHelpers.ts`
   - `src/v11/shared/state/stateSchema.ts`
2. Canonical elements:
   - `review_policy.meta_review_auto_rework_min_severity` remains threshold authority.
   - `review_policy.meta_review_consecutive_clean_runs_required` is the configured clean-run requirement.
   - `meta_review.consecutive_clean_runs` is the persisted current streak.
3. Guard elements:
   - validation errors for invalid config values
   - schema/state validation for malformed streak state
4. Compat-only elements:
   - missing `review_policy` remains valid and normalizes to existing defaults plus clean-run requirement `1`
   - missing `meta_review` snapshot remains valid and normalizes to the baseline snapshot plus streak `0`
5. Forbidden reinterpretations:
   - do not treat `auto_rework_count` or `auto_rework_limit` as confidence-streak controls
   - do not rename or reinterpret severity threshold labels
   - do not make generic `approve` recommendation text sufficient clean-run authority

### Scope Reality / Shape Proof

1. Inspected entrypoints / call-sites: review-policy type/default/parse/render/normalize helpers, meta-review snapshot normalization helpers, state schema validation, and adjacent tests.
2. Actual touched scope: contract and persisted-authority foundation.
3. Mutation entrypoints in scope: TOML parse/render and state snapshot normalization/validation only; no lifecycle transition or route mutation entrypoint is in scope.
4. Hidden scope ruled out: `metaReviewGateCurrentRunFinalization` routing, current-run route persistence, status/list projections, and UI presenter/action surfaces remain successor ownership.
5. Branch inventory note: missing config, explicit valid config, invalid config, missing snapshot, explicit snapshot, and malformed state branches must be represented.
6. Why the declared task shape matches reality: the foundation fields can be added and normalized without deciding how a clean `approve` reruns or unlocks human approval.

### Authority Boundary Map

1. Authority producer: config defaults/parser and meta-review state normalization.
2. Stored authority: `.pairflow/bubbles/<id>/bubble.toml` `review_policy` block and canonical bubble state `meta_review` snapshot.
3. In-scope consumers: runtime normalization helpers and state/schema validation consumers needed to preserve the new fields.
4. Explicit out-of-scope consumers: meta-review gate routing, route persistence, status/list/UI projection, and UI preset mapping.
5. Export surfaces closed in this phase: TypeScript config/state types and normalized runtime/state helper outputs.

### Baseline Preservation

1. Must-preserve behaviors:
   - existing `review_loop_mode`, `reviewer_blocking_min_severity`, and `meta_review_auto_rework_min_severity` defaults and parsing
   - existing auto-rework counter defaults and normalization
   - existing sticky-human-gate and runtime-delivery snapshot normalization
2. Allowed resolution paths:
   - absent config requirement -> default `1`
   - absent streak field -> normalized `0`
3. Forbidden regression interpretations:
   - adding this field must not make legacy configs invalid
   - adding this field must not cause missing historical state to appear threshold-clean
4. Replacement proof required if removed: no existing behavior may be removed in this task.

### Success / Completion Proof Boundary

1. Current canonical success proof source: successful config/state normalization and schema validation.
2. Target canonical success proof source: same, expanded to include the new requirement and streak fields.
3. Current canonical completion proof source: targeted tests plus type/build checks.
4. Target canonical completion proof source: targeted tests for config and state foundation plus build.
5. Reused proof contract: existing review-policy and meta-review snapshot normalization tests.
6. Proof-parity rule: `inherit_full_parity`.
7. Final truth surfaces affected: typed config/state helper outputs only.
8. Mixed-truth surfaces allowed: none.

### Precondition and Side-Effect Boundary

1. Primary bounded task shape: `contract_or_persisted_authority_foundation`.
2. Secondary shape: `N/A`.
3. Preconditions that must pass before side effects: invalid config values must be rejected before producing a parsed config.
4. Side effects forbidden before preconditions pass: no lifecycle state or routing mutation may depend on an invalid clean-run count.
5. Invalid/precondition-failure behavior: validation error with actionable `review_policy.meta_review_consecutive_clean_runs_required` path.
6. Coordination primitives in scope: `N/A`.

### In Scope

1. Add `meta_review_consecutive_clean_runs_required` to the review-policy type and TOML parse/render validation.
2. Add `DEFAULT_REVIEW_POLICY_CONSECUTIVE_CLEAN_RUNS_REQUIRED = 1`.
3. Normalize missing review-policy requirement to `1`.
4. Reject non-integer, zero, negative, or otherwise invalid configured counts.
5. Add `consecutive_clean_runs` to canonical meta-review state with missing-state default `0`.
6. Ensure state validation accepts valid non-negative streaks and rejects malformed values.
7. Add focused tests for config defaults, explicit parse/render, invalid values, runtime normalization, and snapshot/state normalization.

### Out of Scope

1. Increment/reset semantics for clean or non-clean meta-review results.
2. Direct meta-review rerun routing below the configured requirement.
3. Human approval unlock routing after the requirement is met.
4. Status/list/UI projections and compact quality preset mapping.
5. Documentation beyond this task artifact.

### Safety Defaults

1. Default requirement is `1`, preserving current single-clean-run behavior until later routing changes consume the field.
2. Default current streak is `0`, so legacy state never fabricates confidence.
3. Invalid config fails closed instead of silently downgrading to a preset.

### Contract Boundary / Blast Radius

1. `contract_boundary_override`: `yes`
2. Impacted contracts:
   - config/TOML `review_policy` shape
   - TypeScript `BubbleReviewPolicyConfig`
   - canonical `BubbleMetaReviewSnapshotState`
   - normalized runtime and state helper outputs

### Complexity Risk Gate

1. `authority_risk`: `1`
2. `surface_spread`: `1`
3. `identity_join_risk`: `0`
4. `activation_coupling`: `0`
5. `prerequisite_risk`: `0`
6. `acceptance_multiplicity`: `1`
7. `risk_score`: `3`
8. `single-task allowed`: `yes`
9. If `no`, required split: `N/A`
10. Identity/join note:
    - canonical identity path: review-policy field name plus meta-review snapshot field name
    - competing identifiers or fallback identities: auto-rework counters and UI preset labels are forbidden fallback identities
11. Authority/source-of-truth note:
    - canonical source: `review_policy` config and `meta_review` state
    - forbidden secondary sources: transcript prose, recommendation text, runtime pane observations, UI-only projections
12. Closure-budget triage:
    - closure buckets touched: contract, persisted authority
    - intentionally collapsed closures: config and state normalization only, because both are foundation producer surfaces
    - explicitly deferred closures: routing, read-model/UI, docs/validation closeout
13. Bounded-task-shape decision:
    - primary shape: contract/persisted-authority foundation
    - secondary shape: `N/A`
    - why this bounded mix is safe: no runtime routing consumes the fields in this task

## L1 - Change Contract

### 0) Domain / Control Contract

| Item                    | Rule                                                                             | Implementation Consequence                             | Priority | Timing       |
| ----------------------- | -------------------------------------------------------------------------------- | ------------------------------------------------------ | -------- | ------------ |
| Business invariant      | configurable clean-run confidence must have separate config and streak authority | add separate requirement and current-streak fields     | P1       | required-now |
| Control model           | config owns required count; state owns current streak                            | no derived counters from auto-rework or UI labels      | P1       | required-now |
| Read-path rule          | consumers read normalized helpers                                                | expose fields through existing normalization functions | P1       | required-now |
| Forbidden fallback      | no transcript/recommendation/UI/auto-rework fallback                             | validation and defaults must be explicit               | P1       | required-now |
| Allowed resolution path | absent requirement -> `1`; absent streak -> `0`                                  | legacy config/state remain valid                       | P1       | required-now |
| Missing-data rule       | invalid config fails; missing state normalizes safe                              | tests cover both branches                              | P1       | required-now |
| Phase boundary          | foundation only                                                                  | no gate-routing changes                                | P1       | required-now |

### 0a) Canonical Contract Preservation

| Element                                       | Source Anchor                                                               | Required Interpretation                  | This Task Action | Priority | Timing       |
| --------------------------------------------- | --------------------------------------------------------------------------- | ---------------------------------------- | ---------------- | -------- | ------------ |
| `meta_review_auto_rework_min_severity`        | `src/types/bubble.ts`, `src/v11/shared/reviewPolicy/reviewPolicyRuntime.ts` | threshold authority remains unchanged    | preserve         | P1       | required-now |
| `meta_review_consecutive_clean_runs_required` | new review-policy field                                                     | configured count, integer `>= 1`         | add              | P1       | required-now |
| `consecutive_clean_runs`                      | new meta-review snapshot field                                              | current persisted streak, integer `>= 0` | add              | P1       | required-now |
| `auto_rework_count`                           | `src/v11/shared/metaReview/metaReviewSnapshot.ts`                           | budget counter, not confidence streak    | preserve         | P1       | required-now |

### 0b) Scope Reality and Shape Proof

| Item                               | Rule                                                                          | Implementation / Review Consequence | Priority | Timing       |
| ---------------------------------- | ----------------------------------------------------------------------------- | ----------------------------------- | -------- | ------------ |
| Inspected entrypoints / call-sites | config parse/render and snapshot normalize/schema paths define the foundation | keep edits in foundation surfaces   | P1       | required-now |
| Actual touched scope               | contract/persisted-authority foundation                                       | avoid routing/read-model changes    | P1       | required-now |
| Mutation entrypoints in scope      | config render and state normalization only                                    | no lifecycle transition changes     | P1       | required-now |
| Hidden scope ruled out             | gate finalization, route persistence, status/UI left to successors            | no broad consume-family drift       | P1       | required-now |
| Branch inventory note              | missing/valid/invalid config and missing/valid/invalid state                  | add focused tests                   | P1       | required-now |
| Shape proof                        | fields are not behaviorally consumed here                                     | task remains bounded                | P1       | required-now |

### 0c) Plan Linkage and Successor Impact

| Item                                    | Rule                                   | Implementation / Review Consequence                | Priority | Timing         |
| --------------------------------------- | -------------------------------------- | -------------------------------------------------- | -------- | -------------- |
| Parent gap closed                       | config/state foundation                | closes plan gap 1 and state part of gap 2          | P1       | required-now   |
| Depends on                              | current review-policy baseline         | preserve existing threshold fields                 | P1       | required-now   |
| Unlocks / impacts successors            | task 02 consumes requirement/streak    | successor must not invent fallback                 | P1       | required-now   |
| Task-list impact                        | refines task-01                        | tracker can move to in-progress when bubble starts | P2       | after approval |
| Inherited validation / exit expectation | targeted config/state tests plus build | evidence must be recorded by implementation bubble | P1       | required-now   |

### 0d) Shared Contract Compatibility

| Shared Contract                 | Current Consumers                                          | Change Type (`additive | breaking                                          | N/A`)                                       | This Task Action | Deferred Alignment |
| ------------------------------- | ---------------------------------------------------------- | ---------------------- | ------------------------------------------------- | ------------------------------------------- | ---------------- | ------------------ |
| `BubbleReviewPolicyConfig`      | config parser, create/update/status/list/UI typed fixtures | additive with default  | add required normalized field with legacy default | routing/read-model/UI consume in successors |
| `BubbleMetaReviewSnapshotState` | state schema, meta-review gate helpers/tests               | additive with default  | add streak field and normalization                | increment/reset semantics in task 02        |

### 0e) Baseline Preservation

| Current Behavior                               | Preserve/Replace/Forbid | Required Proof                                      | Priority | Timing       |
| ---------------------------------------------- | ----------------------- | --------------------------------------------------- | -------- | ------------ |
| Missing review policy normalizes to defaults   | preserve                | runtime normalization test                          | P1       | required-now |
| Existing severity parse/render                 | preserve                | config roundtrip tests                              | P1       | required-now |
| Missing meta-review snapshot normalizes safely | preserve                | snapshot normalization test                         | P1       | required-now |
| Auto-rework counters model budget only         | preserve                | no implementation dependency on counters for streak | P1       | required-now |

### 0f) Success / Completion Proof Boundary

| Surface                         | Current Proof Source         | Target Proof Source                | Canonical / Compat / Guard | Mixed-Truth Allowed? | Priority | Timing       |
| ------------------------------- | ---------------------------- | ---------------------------------- | -------------------------- | -------------------- | -------- | ------------ |
| config normalized review policy | default/explicit parse tests | same plus required clean-run count | canonical                  | no                   | P1       | required-now |
| meta-review snapshot            | normalization/state tests    | same plus streak field             | canonical                  | no                   | P1       | required-now |

### 0g) Precondition and Side-Effect Boundary

| Case                             | Must Be Validated Before   | Forbidden Early Side Effects           | Required Failure Behavior                                                   | Priority | Timing       |
| -------------------------------- | -------------------------- | -------------------------------------- | --------------------------------------------------------------------------- | -------- | ------------ |
| invalid required clean-run count | parsed config is accepted  | route or state mutation consumes value | validation error                                                            | P1       | required-now |
| malformed streak state           | state snapshot is accepted | routing consumes streak                | schema validation error or safe normalization for missing-only legacy state | P1       | required-now |

### 1) Implementation Requirements

1. Extend `BubbleReviewPolicyConfig` with `meta_review_consecutive_clean_runs_required: number`.
2. Add a default constant in `src/config/defaults.ts` with value `1`.
3. Parse and render `review_policy.meta_review_consecutive_clean_runs_required` in TOML.
4. Validate the required count as an integer `>= 1`.
5. Normalize missing review-policy field to the default in `normalizeBubbleReviewPolicy`.
6. Extend runtime view types only if current view surfaces are already normalized contract carriers; do not add UI preset semantics.
7. Extend `BubbleMetaReviewSnapshotState` with `consecutive_clean_runs: number`.
8. Normalize missing `consecutive_clean_runs` to `0` when snapshot is absent or legacy-shaped.
9. Preserve `consecutive_clean_runs` in snapshot clear/live-reset helpers unless the helper is specifically supposed to clear only live execution state.
10. Update state schema validation to require a non-negative integer when the field is present in canonical state.

### 2) Acceptance Criteria

1. Missing `review_policy` normalizes to:
   - existing loop/severity defaults
   - `meta_review_consecutive_clean_runs_required = 1`
2. Explicit TOML with `meta_review_consecutive_clean_runs_required = 2` parses and roundtrips.
3. Invalid TOML values such as `0`, `-1`, non-integer, or unsupported type fail with a path naming `review_policy.meta_review_consecutive_clean_runs_required`.
4. Missing meta-review snapshot normalizes with `consecutive_clean_runs = 0`.
5. Existing snapshot data preserves a non-zero `consecutive_clean_runs`.
6. Existing live-state clear helpers do not accidentally erase the streak.
7. No meta-review gate routing behavior changes in this task.

### 3) Validation

1. Run targeted config tests:
   - `pnpm test -- tests/config/bubbleConfig.test.ts`
2. Run targeted review-policy runtime tests:
   - `pnpm test -- tests/v11/shared/reviewPolicy/reviewPolicyRuntime.test.ts`
3. Run targeted meta-review state/schema tests:
   - `pnpm test -- tests/v11/shared/metaReviewGate/metaReviewGateStateStaging.test.ts`
4. Run `pnpm build`.

## L2 - Handoff

1. Implement only the foundation fields and normalization described above.
2. Leave routing behavior unchanged even though the new values will be available.
3. If implementation discovers that adding the state field requires immediate gate-finalization behavior, stop and route back to plan/task refinement instead of widening this task.
4. Record any additional touched tests as collateral only when they are direct typed-fixture or snapshot updates for the new field.
