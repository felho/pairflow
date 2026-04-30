---
artifact_type: task
artifact_id: task_meta_review_consecutive_clean_runs_docs_validation_v1
task_family_id: clean-runs-docs-validation
sequence_key: "4"
task_id: 4-clean-runs-docs-validation
title: "Meta-Review Consecutive Clean Runs Docs and Validation"
status: approved
phase: phase4
target_files:
  - README.md
  - docs/pairflow-initial-design.md
  - docs/meta-review-gate-e2e-validation.md
  - docs/meta-review-gate-rollout-runbook.md
  - docs/pairflow-ui-prd.md
  - plans/meta-review-consecutive-clean-runs-plan-v1.md
prd_ref: null
plan_ref: plans/meta-review-consecutive-clean-runs-plan-v1.md
system_context_ref: docs/pairflow-initial-design.md
owners:
  - "felho"
doc_bubble_id: clean-runs-docs-validation-doc
impl_bubble_id: null
supersedes: []
superseded_by: null
archive_group: 2026-04-27-meta-review-consecutive-clean-runs-plan-v1
---

# Task: Meta-Review Consecutive Clean Runs Docs and Validation

## L0 - Policy

### Goal

Close the documentation and final validation slice for configurable consecutive clean meta-review runs.

This task updates operator-facing and architecture documentation so the implemented behavior is discoverable and contract-aligned, records final validation evidence, and prepares the parent plan for completion. It must not change runtime behavior, state schema, CLI command semantics, UI behavior, or tests except through explicitly documented validation evidence.

### Domain / Control Model Summary

1. Business invariant: operators and future implementers must understand that human approval is unlocked only after the configured number of consecutive threshold-clean meta-review results.
2. Control model: `review_policy.meta_review_consecutive_clean_runs_required` remains the configured requirement, `meta_review.consecutive_clean_runs` remains the persisted current streak, and `review_policy.meta_review_auto_rework_min_severity` remains the threshold authority used to decide whether a meta-review result is clean.
3. Read-path rule: docs must describe the canonical runtime/read-model contract implemented by Tasks 1-3; they must not introduce prose-only behavior, UI-only authority, transcript heuristics, or runtime-pane authority.
4. Forbidden fallback: do not document `auto_rework_count`, prior human-gate status, generic `approve` wording, pane output, or UI labels as clean-run streak authority.
5. Allowed resolution path: documentation may summarize the implemented behavior from archived task contracts, current code/tests, and validation command results. Missing or uncertain behavior must be called out as not documented rather than filled with inferred semantics.
6. Missing-data rule: docs must state the implemented defaults: missing clean-run requirement normalizes to `1`, missing current streak normalizes to `0`, and unsupported quality-preset backend pairs display as custom/unsupported rather than as a supported preset.

### Plan Linkage

1. Parent gap closed: "Spec/docs alignment and implementation proof" from `plans/meta-review-consecutive-clean-runs-plan-v1.md`.
2. Depends on:
   - archived `1-clean-runs-policy-state.md`
   - archived `2-clean-runs-gate-routing.md`
   - archived `3-clean-runs-read-model-ui.md`
3. Unlocks / impacts successors: after this task is closed and archived, the parent plan can move to `plan_status=done` and canonical plan archive aftermath.
4. Task-list impact: creates the planned `4-clean-runs-docs-validation` task.
5. Inherited validation / exit expectation: final validation must include targeted tests for the changed contract families plus `pnpm lint`, `pnpm typecheck`, `pnpm test`, and `pnpm build` unless a command is explicitly skipped with reason.

### Canonical Contract Anchors

1. Source-of-truth anchors:
   - `src/types/bubble.ts`
   - `src/config/bubbleConfig.ts`
   - `src/v11/shared/reviewPolicy/reviewPolicyRuntime.ts`
   - `src/v11/shared/metaReview/metaReviewSnapshot.ts`
   - `src/v11/shared/metaReviewGate/metaReviewGateCurrentRunFinalization.ts`
   - `src/v11/shared/metaReviewGate/metaReviewGateCurrentRunRoutePersistence.ts`
   - `src/v11/shared/status/statusCommandViewProjection.ts`
   - `src/v11/shared/list/listCommandEntryProjection.ts`
   - `src/v11/shared/reviewPolicy/updateBubbleReviewPolicy.ts`
   - `ui/src/components/actions/ActionBar.tsx`
   - `ui/src/components/canvas/BubbleExpandedCard.tsx`
2. Canonical elements:
   - configured requirement: `review_policy.meta_review_consecutive_clean_runs_required`
   - current streak: `meta_review.consecutive_clean_runs`
   - meta-review threshold: `review_policy.meta_review_auto_rework_min_severity`
   - reviewer blocking threshold: `review_policy.reviewer_blocking_min_severity`
   - quality preset identity: exact backend pair `(meta_review_auto_rework_min_severity, meta_review_consecutive_clean_runs_required)`
3. Guard elements:
   - runtime-aligned review-policy detail may be hidden/guarded in closed status states.
   - unsupported quality-preset pairs must be documented as custom/unsupported, not coerced to supported labels.
4. Compat elements:
   - legacy configs without the requirement project default `1`.
   - legacy state without the streak projects default `0`.
5. Forbidden reinterpretations:
   - `auto_rework_count` is a budget counter, not a clean-run streak.
   - `P3+2` is not a new severity; it is threshold `P3` plus requirement `2`.
   - a generic meta-review `approve` recommendation is not sufficient clean-run authority unless threshold evaluation confirms no threshold-meeting findings.

### Scope Reality / Shape Proof

1. Inspected entrypoints / call-sites: current README state-machine/operator sections, initial design meta-review authority notes, meta-review validation/runbook docs, UI PRD references, and archived Tasks 1-3.
2. Actual touched scope: documentation and plan completion evidence only.
3. Hidden scope ruled out:
   - no `src/**` runtime implementation changes
   - no `ui/src/**` implementation changes
   - no config/schema/test behavior changes
   - no lifecycle command changes
4. Why this bounded task matches reality: Tasks 1-3 already closed producer, routing, read-model, and UI implementation. The remaining gap is documentation alignment plus final evidence capture.

### Authority Boundary Map

1. Authority producer: already closed by Tasks 1-2.
2. Persisted authority: already closed by Task 1.
3. Workflow orchestration consumers: already closed by Task 2.
4. Read-model/UI consumers: already closed by Task 3.
5. Documentation consumers: owned by this task.
6. Cleanup/recovery consumers: out of scope except documenting implemented restart/status guidance already present in docs.

### Baseline Preservation

1. Must-preserve behaviors:
   - existing state-machine lifecycle names and approval flow.
   - existing meta-review submit authority through `pairflow agent emit --kind meta_review_result`.
   - existing distinction between reviewer blocking threshold and meta-review threshold.
   - existing statement that there is no public `bubble meta-review` operator namespace.
2. Allowed replacement:
   - update outdated single-pass meta-review prose to include the implemented clean-run rerun/unlock behavior.
   - update UI docs from plain severity selector wording to quality-preset wording.
3. Forbidden regression interpretations:
   - docs must not imply new operator commands or a new severity label.
   - docs must not imply human approval can unlock from UI labels or transcript prose.
   - docs must not imply the clean-run gate changes reviewer PASS severity semantics.

### Success / Completion Proof Boundary

1. Current proof source: Tasks 1-3 implementation/test evidence and archived task contracts.
2. Target proof source: updated docs plus final validation command evidence recorded in the task/plan close summary.
3. Final truth surfaces affected:
   - README operator behavior
   - architecture/design docs
   - meta-review validation/runbook docs
   - UI product docs where quality preset behavior is described
   - parent plan tracker/progress
4. Mixed-truth surfaces allowed: none. Documentation must describe the implemented canonical contract only.

### Precondition and Side-Effect Boundary

1. Preconditions before documentation edits:
   - Tasks 1-3 are archived.
   - current code/tests contain the implemented clean-run and quality-preset surfaces.
2. Allowed side effects:
   - edit `README.md`, relevant `docs/**`, and the parent plan/task artifacts.
   - run validation commands and record their results.
3. Forbidden side effects:
   - mutate runtime code, UI implementation, tests, bubble state-machine behavior, or config schema.
4. Invalid/precondition-failure behavior:
   - if documentation cannot be aligned without changing behavior, stop and route back to plan/task refinement instead of smuggling implementation into this docs task.

### In Scope

1. Update operator-facing docs for:
   - clean-run requirement and current streak.
   - clean approval below requirement rerunning meta-review.
   - unlock to human approval when requirement is met.
   - reset behavior for threshold-meeting findings, inconclusive, and failure-style outcomes.
2. Update UI docs/product references for the quality preset model:
   - `P1 -> (P1,1)`
   - `P2 -> (P2,1)`
   - `P3 -> (P3,1)`
   - `P3+2 -> (P3,2)`
   - unsupported/custom pair display.
3. Update architecture/design docs where they currently describe meta-review gate authority or approval routing in a way that would be incomplete after Tasks 1-3.
4. Record final validation evidence and any skipped checks.
5. Update the parent plan progress/tracker so this task can close the plan after document-bubble and implementation-bubble lifecycle completion.

### Out of Scope

1. Runtime behavior changes.
2. UI code or UI tests changes.
3. New CLI commands or command flags.
4. New validation tests.
5. Remote execution behavior changes.
6. Reopening Tasks 1-3 unless validation finds a concrete blocker.

### Safety Defaults

1. Prefer exact field names and implemented defaults over paraphrased authority.
2. Keep docs conservative when a behavior is not proven by code/tests.
3. If validation fails, do not mark the task complete.
4. If docs reveal an implementation mismatch, stop at a replanning checkpoint.

### Contract Boundary / Blast Radius

1. `contract_boundary_override`: `yes`
2. Impacted contracts: documentation contract only; no runtime shared contract changes in this task.

### Complexity Risk Gate

1. `authority_risk`: `1`
2. `surface_spread`: `1`
3. `identity_join_risk`: `1`
4. `activation_coupling`: `0`
5. `prerequisite_risk`: `0`
6. `acceptance_multiplicity`: `1`
7. `risk_score`: `4`
8. `single-task allowed`: `yes, because this is a docs/final-validation closure over already-archived implementation tasks`
9. Authority/source-of-truth note:
   - docs consume code/tests and archived task contracts; docs do not become runtime authority.
10. Closure-budget triage:
   - closure buckets touched: documentation consumers and final validation evidence.
   - explicitly deferred closures: none for this plan; any behavior mismatch becomes replanning.
11. Bounded-task-shape decision:
   - primary shape: `consumer_family_alignment`
   - secondary shape: docs-only final validation closure.

## L1 - Change Contract

### 0) Domain / Control Contract

| Item | Rule | Implementation Consequence | Priority | Timing |
| --- | --- | --- | --- | --- |
| Clean-run requirement | Human approval unlock depends on configured threshold-clean streak count | docs name `meta_review_consecutive_clean_runs_required` and default `1` | P1 | required-now |
| Current streak | Operators can inspect current progress | docs name `consecutive_clean_runs` and default `0` | P1 | required-now |
| Threshold authority | Clean means no threshold-meeting meta-review findings | docs preserve `meta_review_auto_rework_min_severity` as threshold authority | P1 | required-now |
| Budget separation | Auto-rework budget is not confidence streak | docs preserve `auto_rework_count` / `auto_rework_limit` distinction | P1 | required-now |
| Quality preset identity | UI preset is exact backend pair | docs list supported mappings and unsupported/custom behavior | P1 | required-now |
| Validation closure | Plan completion requires evidence | run and report final checks | P1 | required-now |

### 1) Required Behavior

| Scenario | Required Result | Priority |
| --- | --- | --- |
| Clean meta-review approve when streak remains below requirement | docs say Pairflow reruns meta-review without implementer/reviewer round | P1 |
| Clean meta-review approve reaches requirement | docs say Pairflow routes to `READY_FOR_HUMAN_APPROVAL` | P1 |
| Threshold-meeting finding, inconclusive, or failure-style outcome | docs say streak resets to `0` | P1 |
| Operator reads status/list/UI | docs say requirement and streak are projected from canonical state/read models | P1 |
| UI reads unsupported pair `(P2,2)` | docs say custom/unsupported, not `P2` | P1 |
| UI writes `P3+2` | docs say backend receives threshold `P3` and required clean runs `2` | P1 |
| Final validation fails | task does not close; route to rework/replanning | P1 |

### 2) Call-Site / Documentation Matrix

| ID | File | Section / Entry | Expected Change | Priority | Timing | Evidence |
| --- | --- | --- | --- | --- | --- | --- |
| CS1 | `README.md` | state-machine / meta-review / command reference areas | document consecutive clean-run gate, reset/unlock behavior, and quality preset wording where operator-facing | P1 | required-now | doc diff + final review |
| CS2 | `docs/pairflow-initial-design.md` | meta-review authority and approval routing | align architecture notes with clean-run requirement/streak authority | P1 | required-now | doc diff + final review |
| CS3 | `docs/meta-review-gate-e2e-validation.md` | validation scenarios | add or update clean-run validation coverage expectations | P1 | required-now | doc diff + validation command output |
| CS4 | `docs/meta-review-gate-rollout-runbook.md` | rollout/operator checks | add operator checks for requirement/streak and quality preset behavior | P2 | required-now | doc diff |
| CS5 | `docs/pairflow-ui-prd.md` | review policy / action controls | document quality preset mapping and unsupported/custom UI state | P2 | required-now | doc diff |
| CS6 | `plans/meta-review-consecutive-clean-runs-plan-v1.md` | tracker/progress | update completion status/evidence after close | P1 | close-time | plan diff |

### 3) Data and Interface Contract

| Contract | Current | Target | Compatibility | Priority | Timing |
| --- | --- | --- | --- | --- | --- |
| Documentation contract | Some docs describe meta-review as single clean approval -> human gate | Docs describe clean-run rerun/unlock semantics | additive clarification of implemented behavior | P1 | required-now |
| UI documentation | Plain severity selector wording may remain | Quality preset pair mapping documented | additive clarification | P1 | required-now |
| Runtime interfaces | implemented by Tasks 1-3 | unchanged | no code changes | P1 | required-now |

### 4) Side Effects Contract

| Area | Allowed | Forbidden | Priority | Timing |
| --- | --- | --- | --- | --- |
| Docs | Edit targeted README/docs files | invent unimplemented behavior | P1 | required-now |
| Plan/task artifacts | Update tracker/status/evidence during close | change task identity or archive group | P1 | close-time |
| Code/tests | Run validation commands | edit source/test files | P1 | required-now |

### 5) Error and Fallback Contract

| Trigger | Behavior | Fallback | Priority | Timing |
| --- | --- | --- | --- | --- |
| Validation command fails | stop task closure and report failing command | no close without rework/replan | P1 | required-now |
| Docs require unimplemented behavior | stop and route to replanning | no prose-only workaround | P1 | required-now |
| Target doc section is obsolete or contradictory | update or remove stale wording with source-backed replacement | do not leave mixed truth | P1 | required-now |
| A planned target file does not need changes after inspection | leave unchanged and report reason | no filler edits | P2 | required-now |

### 6) Dependency Constraints

| Type | Items | Priority | Timing |
| --- | --- | --- | --- |
| must-use | archived Tasks 1-3, current code/tests, README/docs existing terminology | P1 | required-now |
| must-not-use | transcript prose, pane text, UI labels, `auto_rework_count` as streak authority | P1 | required-now |

### 7) Test / Validation Matrix

| ID | Scenario | Command / Evidence | Required Result | Priority | Timing |
| --- | --- | --- | --- | --- | --- |
| V1 | Documentation-only diff review | manual review of targeted docs | docs match implemented field names and behavior | P1 | required-now |
| V2 | Policy/config/state foundation still passes | `pnpm test tests/config/bubbleConfig.test.ts tests/v11/shared/reviewPolicy/reviewPolicyRuntime.test.ts tests/v11/shared/metaReview/metaReviewSnapshot.test.ts tests/v11/shared/state/stateSchema.test.ts` | pass | P1 | required-now |
| V3 | Gate routing behavior still passes | `pnpm test tests/v11/shared/metaReviewGate/metaReviewGateCurrentRunFinalization.test.ts tests/core/agent/converged.test.ts tests/core/agent/pass.test.ts` | pass | P1 | required-now |
| V4 | Read-model/UI behavior still passes | `pnpm test tests/core/bubble/statusBubble.test.ts tests/core/bubble/listBubbles.test.ts tests/core/ui/bubblePresenter.test.ts tests/v11/infrastructure/executor/ssh/sshBubbleStatus.test.ts ui/src/state/useBubbleStore.test.ts ui/src/components/actions/ActionBar.test.tsx ui/src/components/canvas/BubbleExpandedCard.test.tsx ui/src/lib/api.test.ts` | pass | P1 | required-now |
| V5 | Repository checks | `pnpm lint`, `pnpm typecheck`, `pnpm test`, `pnpm build` | pass or explicitly skipped with reason | P1 | required-now |

### 8) Shared Contract Compatibility

| Shared Contract | Current Consumers | Change Type | This Task Action | Deferred Alignment |
| --- | --- | --- | --- | --- |
| Runtime review-policy/state contracts | CLI, gate routing, status/list, UI | N/A, already changed by Tasks 1-3 | document only | none |
| Documentation contract | operators and future agents | additive clarification | update docs to current behavior | none |

### 9) Baseline Preservation

| Current Behavior | Preserve/Replace/Forbid | Required Proof | Priority | Timing |
| --- | --- | --- | --- | --- |
| `agent emit --kind meta_review_result` submit authority | preserve | README/design wording | P1 | required-now |
| no public `bubble meta-review` namespace | preserve | README wording remains clear | P1 | required-now |
| reviewer blocking threshold semantics | preserve | docs do not conflate with quality preset | P1 | required-now |
| stale single-pass meta-review wording | replace | docs describe rerun/unlock behavior | P1 | required-now |

### 10) Closure-Budget Summary

1. Closure buckets touched: documentation consumers and validation evidence.
2. Collapsed closures: docs plus final validation are safe together because neither changes runtime authority.
3. Deferred closures: none inside this plan; a failed validation result routes to rework/replanning.

### 11) Precondition and Side-Effect Boundary

1. Validations before side effects: inspect archived Tasks 1-3 and current docs before editing.
2. Forbidden early side effects: no runtime/source/test mutation.
3. Invalid/precondition-failure behavior: stop at replan/human checkpoint if the docs cannot truthfully describe implemented behavior.
4. Coordination primitives: none.

### 12) Success / Completion Proof Boundary

| Surface | Current Proof Source | Target Proof Source | Mixed Truth Allowed? | Priority | Timing |
| --- | --- | --- | --- | --- | --- |
| plan completion | archived Tasks 1-3 plus open Task 4 | archived Task 4 and plan archive aftermath | no | P1 | close-time |
| docs accuracy | older docs + plan notes | source-backed docs and validation evidence | no | P1 | required-now |

## L2 - Implementation Plan

1. Inspect target documentation for stale single-pass meta-review, review-policy, UI severity, and status/read-model wording.
2. Update README operator sections with:
   - clean-run requirement/streak fields,
   - rerun/unlock/reset behavior,
   - quality preset mapping,
   - unsupported/custom UI projection.
3. Update design/validation/runbook/UI docs where the same behavior is currently incomplete or stale.
4. Run the validation matrix in L1.
5. Record validation evidence in the implementation summary and parent plan close context.
6. During close workflow, archive this task and, if all tracker rows are archived, move the plan to canonical archive path.

## Hardening Backlog

| ID | Item | Layer | Priority | Timing | Source | Proposed Action |
| --- | --- | --- | --- | --- | --- | --- |
| H1 | Consolidate duplicated meta-review docs over time | L2 | P3 | later-hardening | task drafting | After plan completion, consider a separate docs cleanup if multiple historical docs still repeat the same contract. |

## Assumptions

1. Tasks 1-3 are authoritative for implemented behavior and are already archived.
2. This task is docs-only plus validation; any implementation mismatch is a replan signal, not scope to patch here.
3. The parent plan remains active until this task and its archive aftermath are complete.

## Open Questions

N/A.

## Review Control

1. Every finding must include: `priority`, `timing`, `layer`, `evidence`.
2. Items outside docs/final-validation scope must route to replanning rather than implementation inside this task.
3. Product/runtime code edits are forbidden unless a new implementation task is created.

## Spec Lock

CreatePairflowSpec `ReviewSpec` task-mode approval recorded during `ExecutePairflowPlan` orchestration:

1. Execution metadata gate passed for task identity, filename, parent tracker path, lineage, and bubble linkage fields.
2. Target-file reality check supports the declared docs-only/final-validation scope; product/runtime source edits remain forbidden.
3. Control-model, closed-contract drift, authority fan-out, closure-budget, and bounded-task-shape checks are satisfied because Tasks 1-3 already closed runtime, routing, read-model, and UI implementation.
4. Remaining-task viability is unchanged: this is the final planned task before parent plan archive aftermath.
