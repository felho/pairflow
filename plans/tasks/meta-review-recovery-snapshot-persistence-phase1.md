---
artifact_type: task
artifact_id: task_meta_review_recovery_snapshot_persistence_phase1_v1
title: "Meta-Review Recovery Snapshot + Last-Report Persistence (Phase 1)"
status: draft
phase: phase1
target_files:
  - src/core/bubble/metaReviewGate.ts
  - src/core/bubble/metaReview.ts
  - src/cli/commands/bubble/metaReview.ts
  - src/core/bubble/statusBubble.ts
  - tests/core/bubble/metaReviewGate.test.ts
  - tests/cli/bubbleMetaReviewCommand.test.ts
prd_ref: null
plan_ref: null
system_context_ref: docs/pairflow-initial-design.md
owners:
  - "felho"
---

# Task: Meta-Review Recovery Snapshot + Last-Report Persistence (Phase 1)

## L0 - Policy

### Goal

Fix the meta-review recovery bug where routing reaches human approval but the autonomous result is not persisted as canonical snapshot/report, causing `meta-review status` and `meta-review last-report` to show missing data.

### Context

Observed production-like repro on `2026-03-10`:
1. Bubble lifecycle reached `META_REVIEW_FAILED` with pending `APPROVAL_REQUEST`.
2. Approval payload summary/metadata indicated recovered meta-review recommendation (`inconclusive`).
3. `state.meta_review.last_autonomous_*` stayed `null`, and `artifacts/meta-review-last.md|json` were absent.
4. CLI then reported `has_run=no` and `has_report=no`, which conflicts with the human approval route metadata.

### In Scope

1. Recovery path must hydrate `meta_review.last_autonomous_*` fields from recovered run result (including synthesized fallback run result).
2. Recovery path must persist canonical last-report artifacts (`artifacts/meta-review-last.md` and `artifacts/meta-review-last.json`) when recovery synthesizes or replays meta-review output.
3. Route metadata (`APPROVAL_REQUEST` payload) and persisted snapshot must remain consistent in recommendation/status/summary/run_id/report_ref.
4. CLI outputs (`meta-review status`, `meta-review last-report`, `bubble status`) must reflect persisted recovery outcome deterministically.

### Out of Scope

1. Redesign of meta-review recommendation policy (`approve|rework|inconclusive` semantics).
2. Broader reviewer evidence trust model changes outside this persistence bug.
3. Historical migration of already broken bubbles at scale (manual recover command remains acceptable for backfill).

### Safety Defaults

1. Keep existing lifecycle routing behavior unchanged (`auto_rework` vs human gate decisions).
2. Keep schema contract additive and backward compatible (no state schema field changes in Phase 1).
3. If artifact persistence partially fails, never drop snapshot hydration; fail behavior must be explicit and test-covered.

### Contract Boundary / Blast Radius

1. `contract_boundary_override`: `no`
2. Affected areas: recovery persistence logic, CLI read semantics, gate/report consistency.

## L1 - Change Contract

### 1) Call-site Matrix

| ID | File | Function/Entry | Exact Signature (args -> return) | Insertion Point | Expected Behavior | Priority | Timing | Evidence |
|---|---|---|---|---|---|---|---|---|
| CS1 | `src/core/bubble/metaReviewGate.ts` | `recoverMetaReviewGateFromSnapshot` | `(input, dependencies?) -> Promise<MetaReviewGateResult>` | recovery flow after `runResult` synthesis and before state write | recovered/synthesized run result must be converted into canonical snapshot payload for persistence | P1 | required-now | repro bubble: approval metadata exists while snapshot is null |
| CS2 | `src/core/bubble/metaReviewGate.ts` | `persistHumanGateRoute` (or helper called by it) | `(input) -> Promise<MetaReviewGateResult>` | state transition payload construction | when `metaReviewRun` is present, persist `last_autonomous_run_id/status/recommendation/summary/report_ref/rework_target/updated_at` deterministically | P1 | required-now | `META_REVIEW_FAILED` + `has_run=no` mismatch |
| CS3 | `src/core/bubble/metaReviewGate.ts` | recovery artifact writer helper (new or reused) | `(paths, runResult, summary) -> Promise<void>` | before gate return on recover routes | ensure `artifacts/meta-review-last.md` and `artifacts/meta-review-last.json` exist after successful recover routing | P1 | required-now | `meta-review last-report` returned `has_report=no` |
| CS4 | `src/core/bubble/metaReview.ts` | `getMetaReviewLastReport` | `(input, dependencies?) -> Promise<MetaReviewLastReportView>` | missing-file handling branch | behavior must stay deterministic with recovered snapshot/report refs; no false negative after recovery persistence | P2 | required-now | CLI reproducibility requirement |
| CS5 | `tests/core/bubble/metaReviewGate.test.ts` | recovery tests | `vitest` cases | `recoverMetaReviewGateFromSnapshot` coverage | add failing repro tests for null snapshot + synthesized runResult + artifact persistence + state hydration | P1 | required-now | guard against regression |
| CS6 | `tests/cli/bubbleMetaReviewCommand.test.ts` | CLI recover/status/last-report assertions | `vitest` cases | meta-review command integration flow | after recover, `status.has_run=yes` and `last-report.has_report=yes` with matching recommendation/summary/run_id | P1 | required-now | user-visible failure mode |

### 2) Data and Interface Contract

| Contract | Current | Target | Required Fields | Optional Fields | Compatibility | Priority | Timing |
|---|---|---|---|---|---|---|---|
| `meta_review` snapshot after recover | can remain all `null` despite routed approval request | must be fully hydrated whenever recover route has a `runResult` | `last_autonomous_run_id`, `last_autonomous_status`, `last_autonomous_recommendation`, `last_autonomous_report_ref`, `last_autonomous_updated_at` | `last_autonomous_summary`, `last_autonomous_rework_target_message` | non-breaking (existing fields) | P1 | required-now |
| canonical report artifacts after recover | may be absent | must be present and readable from canonical refs | `artifacts/meta-review-last.md`, `artifacts/meta-review-last.json` | N/A | non-breaking | P1 | required-now |
| approval metadata vs snapshot consistency | can diverge (`payload.metadata.latest_recommendation` set while snapshot null) | recommendation/status provenance must match in both places | recommendation, run id, summary/report linkage | N/A | non-breaking | P1 | required-now |

### 3) Side Effects Contract

| Area | Allowed | Forbidden | Notes | Priority | Timing |
|---|---|---|---|---|---|
| Bubble state write | update existing `meta_review.*` fields during recover route | lifecycle state drift from existing routing policy | CAS/expected state guarantees must remain intact | P1 | required-now |
| Artifact filesystem writes | write canonical meta-review report md/json in bubble artifacts dir | writing outside bubble artifacts dir | respect safe `artifacts/*` constraints | P1 | required-now |
| CLI reporting | reflect persisted recovery result | deriving synthetic success in CLI without persisted state | source of truth remains state/artifacts | P2 | required-now |

Constraint: no new external dependencies; pure logic + existing fs/state utilities only.

### 4) Error and Fallback Contract

| Trigger | Dependency (if any) | Behavior (`throw|result|fallback`) | Fallback Value/Action | Reason Code | Log Level | Priority | Timing |
|---|---|---|---|---|---|---|---|
| recover route has runResult but snapshot hydration payload invalid | state schema/write | throw | keep previous state untouched via CAS failure | META_REVIEW_GATE_STATE_CONFLICT | error | P1 | required-now |
| recover report artifact write fails | fs write | fallback + continue route only if snapshot is persisted | preserve hydrated snapshot; attach deterministic warning text to summary/report json | META_REVIEW_ARTIFACT_WRITE_WARNING | warn | P1 | required-now |
| recover path called outside `META_REVIEW_RUNNING` | state transition precondition | throw | no mutation | META_REVIEW_GATE_TRANSITION_INVALID | error | P1 | required-now |
| synthesized run result from empty snapshot | N/A | fallback | canonical fallback run_id/summary/report_ref are persisted (not transient-only) | META_REVIEW_GATE_RECOVER_SYNTHESIZED | info | P2 | required-now |

### 5) Dependency Constraints

| Type | Items | Priority | Timing |
|---|---|---|---|
| must-use | existing state CAS flow (`readStateSnapshot` + `writeStateSnapshot`) | P1 | required-now |
| must-use | canonical report refs: `artifacts/meta-review-last.md` and `artifacts/meta-review-last.json` | P1 | required-now |
| must-not-use | ad-hoc non-canonical report paths in recovery | P1 | required-now |
| must-not-use | silent route success with null `last_autonomous_*` after recover | P1 | required-now |

### 6) Test Matrix

| ID | Scenario | Given | When | Then | Priority | Timing | Evidence |
|---|---|---|---|---|---|---|---|
| T1 | Recover from empty snapshot (error route) | `META_REVIEW_RUNNING` + `meta_review.last_autonomous_* = null` | `recoverMetaReviewGateFromSnapshot` with synthesized fallback | state becomes `META_REVIEW_FAILED` and snapshot fields are hydrated (not null) | P1 | required-now | automated test |
| T2 | Recover persists canonical artifacts | same as T1 | recover executes | `artifacts/meta-review-last.md` and `.json` exist and are parseable | P1 | required-now | automated test |
| T3 | Status reflects recovered run | post-recover bubble from T1/T2 | `meta-review status` | `has_run=yes`, with populated status/recommendation/run_id | P1 | required-now | automated test |
| T4 | Last-report reflects recovered run | post-recover bubble from T1/T2 | `meta-review last-report` | `has_report=yes`, canonical ref, non-empty markdown summary | P1 | required-now | automated test |
| T5 | Existing snapshot is preserved/coherent | `META_REVIEW_RUNNING` + valid prior `last_autonomous_*` | recover route | no invalid downgrade to null; route metadata and snapshot remain coherent | P1 | required-now | automated test |
| T6 | Approval metadata consistency | recover emits `APPROVAL_REQUEST` | inspect envelope + state | `payload.metadata.latest_recommendation` equals `state.meta_review.last_autonomous_recommendation` | P1 | required-now | automated test |
| T7 | Transition guard unchanged | bubble not in `META_REVIEW_RUNNING` | recover called | same transition error as current behavior | P1 | required-now | automated test |

## L2 - Implementation Notes (Optional)

1. [later-hardening] Add a tiny shared helper to build fallback report markdown/json payload so `run` and `recover` paths cannot drift.
2. [later-hardening] Add telemetry counter for "recovered-from-empty-snapshot" cases to track operational frequency.

## Hardening Backlog (Optional)

| ID | Item | Layer | Priority | Timing | Source | Proposed Action |
|---|---|---|---|---|---|---|
| H1 | Command-evidence canonicalization mismatch can increase `inconclusive` outcomes | L2 | P2 | later-hardening | field repro on `stripe-v2-s02-impl` | open follow-up task focused on reviewer evidence matching rules |

## Review Control

1. Any finding claiming "resolved" must include proof from both state snapshot and artifact presence.
2. Do not accept fixes that only patch CLI rendering while persistence remains null.
3. Keep lifecycle transition matrix unchanged unless a separate task explicitly extends it.
4. Keep `META_REVIEW_FAILED` approval compatibility behavior intact.

## Spec Lock

Mark task as `IMPLEMENTABLE` when T1-T7 are green and snapshot/report/approval metadata consistency is verified end-to-end on recover path.
