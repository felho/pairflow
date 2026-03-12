---
artifact_type: task
artifact_id: task_meta_review_recovery_snapshot_persistence_phase1_v2
title: "Meta-Review Recovery Snapshot + Last-Report Persistence (Residual Gap Closure)"
status: implementable
phase: phase1
target_files:
  - src/core/bubble/metaReviewGate.ts
  - tests/core/bubble/metaReviewGate.test.ts
  - tests/cli/bubbleMetaReviewCommand.test.ts
  - tests/core/human/approval.test.ts
prd_ref: null
plan_ref: null
system_context_ref: docs/pairflow-initial-design.md
owners:
  - "felho"
---

# Task: Meta-Review Recovery Snapshot + Last-Report Persistence (Residual Gap Closure)

## L0 - Policy

### Goal

Close the remaining recovery-path persistence gaps after recent MetaReview refactors:
1. recovery routing can succeed while `state.meta_review.last_autonomous_*` stays null,
2. recovery does not guarantee canonical last-report artifact persistence,
3. approval metadata and persisted snapshot can diverge.

### Context

Current codebase already covers substantial ground:
1. recover routing (`human_gate_approve|inconclusive|run_failed|dispatch_failed|auto_rework`) exists and is tested,
2. `run` and `submit` flows already write canonical `artifacts/meta-review-last.md|json`,
3. status/last-report views are stable and schema-validated.

Residual issue:
1. recovery path still has scenarios where route/metadata indicate autonomous outcome, but persisted snapshot/artifacts are not deterministically aligned.

### In Scope

1. Recovery route must hydrate `meta_review.last_autonomous_*` from `metaReviewRun` when present.
2. Recovery route must persist canonical artifacts (`artifacts/meta-review-last.md`, `artifacts/meta-review-last.json`) on successful recovery routing.
3. `APPROVAL_REQUEST.payload.metadata.latest_recommendation` and persisted snapshot recommendation must remain consistent.
4. CLI recovery follow-up (`meta-review status`, `meta-review last-report`) must reflect persisted outcome (`has_run=yes`, `has_report=yes`) in recoverable cases.

### Out of Scope

1. Meta-review recommendation policy redesign (`approve|rework|inconclusive`).
2. Runner mode/orchestration redesign (`pane_agent|agent` behavior changes).
3. Historical bulk migration for previously broken bubbles.
4. Any new protocol/state schema fields.

### Safety Defaults

1. Keep existing lifecycle route decisions unchanged.
2. Keep snapshot/report contracts additive and backward-compatible.
3. If artifact write fails after snapshot persistence, do not lose state hydration; surface deterministic warning.

### Contract Boundary / Blast Radius

1. `contract_boundary_override`: `no`
2. Affected boundaries:
   - recovery snapshot hydration,
   - recovery artifact persistence,
   - approval metadata vs persisted snapshot coherence.

## L1 - Change Contract

### 1) Call-site Matrix

| ID | File | Function/Entry | Exact Signature (args -> return) | Insertion Point | Expected Behavior | Priority | Timing | Evidence |
|---|---|---|---|---|---|---|---|---|
| CS1 | `src/core/bubble/metaReviewGate.ts` | `persistHumanGateRoute` | `(input) -> Promise<MetaReviewGateResult>` | snapshot build before state write | when `metaReviewRun` exists, hydrate `last_autonomous_*` from run result (status/recommendation/summary/report_ref/updated_at; optional run_id/rework_target_message) | P1 | required-now | recover route currently can return approval while snapshot remains null in residual cases |
| CS2 | `src/core/bubble/metaReviewGate.ts` | `recoverMetaReviewGateFromSnapshot` | `(input, dependencies?) -> Promise<MetaReviewGateResult>` | branches calling `persistHumanGateRoute` | recovery with synthesized or provided run result must always provide canonical data needed for persistence, not route-only metadata | P1 | required-now | residual mismatch between route metadata and persisted snapshot |
| CS3 | `src/core/bubble/metaReviewGate.ts` | new helper (or equivalent) `writeRecoveredMetaReviewArtifacts` | `(paths, runResult, nowIso) -> Promise<{ warnings: MetaReviewRunWarning[] }>` | before recover route return | write canonical `meta-review-last.md` and `meta-review-last.json` during recover path | P1 | required-now | `meta-review last-report` reliability after recover |
| CS4 | `tests/core/bubble/metaReviewGate.test.ts` | recover regression tests | `vitest` cases | `recoverMetaReviewGateFromSnapshot` suite | add empty-snapshot and artifact persistence assertions; ensure metadata/snapshot coherence | P1 | required-now | prevent regression |
| CS5 | `tests/cli/bubbleMetaReviewCommand.test.ts` | CLI recover/status/last-report assertions | `vitest` cases | recover flow tests | after recover, `status.has_run=yes` and `last-report.has_report=yes` where recover persisted output | P1 | required-now | user-visible correctness |
| CS6 | `tests/core/human/approval.test.ts` | approval metadata coherence test | `vitest` case | recover -> approval request path | `latest_recommendation` in envelope metadata matches persisted snapshot recommendation | P2 | required-now | protocol/state consistency |

### 2) Data and Interface Contract

| Contract | Current | Target | Required Fields | Optional Fields | Compatibility | Priority | Timing |
|---|---|---|---|---|---|---|---|
| `meta_review` snapshot after recover | may remain null-like while recover route emits recommendation metadata | when recover route has recommendation outcome, snapshot must be hydrated | `last_autonomous_status`, `last_autonomous_recommendation`, `last_autonomous_summary`, `last_autonomous_report_ref`, `last_autonomous_updated_at` | `last_autonomous_run_id`, `last_autonomous_rework_target_message` | non-breaking (existing fields) | P1 | required-now |
| recover artifact contract | recover path does not guarantee canonical md/json writes | recover must write both canonical report artifacts | `artifacts/meta-review-last.md`, `artifacts/meta-review-last.json` | json payload `run_id`, `rework_target_message`, `warnings` | non-breaking | P1 | required-now |
| approval metadata coherence | envelope can carry recommendation while snapshot is not hydrated | envelope recommendation and snapshot recommendation must match | recommendation value parity | additional diagnostics/warnings | non-breaking | P1 | required-now |

### 3) Side Effects Contract

| Area | Allowed | Forbidden | Notes | Priority | Timing |
|---|---|---|---|---|---|
| Bubble state write | hydrate existing `meta_review.*` fields during recover | lifecycle transition matrix changes | keep current routes and target states | P1 | required-now |
| Artifact writes | write canonical meta-review md/json under `artifacts/` | writing outside bubble artifacts | preserve canonical refs (`artifacts/meta-review-last.*`) | P1 | required-now |
| Approval envelope metadata | keep recommendation metadata aligned with snapshot | introducing new metadata semantics in this task | consistency fix only | P2 | required-now |

Constraint: no new external dependency; implementation remains local state/filesystem logic.

### 4) Error and Fallback Contract

| Trigger | Dependency (if any) | Behavior (`throw|result|fallback`) | Fallback Value/Action | Reason Code | Log Level | Priority | Timing |
|---|---|---|---|---|---|---|---|
| recover called outside `META_REVIEW_RUNNING` | lifecycle state | throw | no mutation | `META_REVIEW_GATE_TRANSITION_INVALID` | error | P1 | required-now |
| snapshot write conflict during recover persistence | state store CAS | throw | no partial state mutation accepted | `META_REVIEW_GATE_STATE_CONFLICT` | error | P1 | required-now |
| recover artifact write fails after successful snapshot persistence | filesystem write | fallback | keep hydrated snapshot + route; attach warning diagnostics | `META_REVIEW_ARTIFACT_WRITE_WARNING` | warn | P1 | required-now |
| dependency failure (state store unavailable) | state read/write | throw | abort recover route; no synthetic success | `META_REVIEW_GATE_STATE_CONFLICT` | error | P1 | required-now |

### 5) Dependency Constraints

| Type | Items | Priority | Timing |
|---|---|---|---|
| must-use | existing CAS state flow (`readStateSnapshot` + `writeStateSnapshot`) | P1 | required-now |
| must-use | canonical refs: `artifacts/meta-review-last.md` and `artifacts/meta-review-last.json` | P1 | required-now |
| must-use | existing state schema invariants for `last_autonomous_*` consistency | P1 | required-now |
| must-not-use | CLI-only synthetic `has_run/has_report` without persisted state+artifacts | P1 | required-now |
| must-not-use | non-canonical ad-hoc artifact paths in recover | P1 | required-now |

### 6) Test Matrix

| ID | Scenario | Given | When | Then | Priority | Timing | Evidence |
|---|---|---|---|---|---|---|---|
| T1 | Empty snapshot recover hydration | `META_REVIEW_RUNNING` + `last_autonomous_*` null | recover with synthesized fallback (no explicit runResult) | persisted snapshot has non-null status/recommendation/summary/report_ref/updated_at | P1 | required-now | automated test |
| T2 | Recover writes canonical artifacts | same as T1 | recover completes | both `meta-review-last.md` and `meta-review-last.json` exist and are parseable | P1 | required-now | automated test |
| T3 | Provided runResult persists into snapshot | `META_REVIEW_RUNNING` + null snapshot + explicit runResult (`approve`/`inconclusive`) | recover executes | snapshot fields mirror runResult values (including optional run_id when provided) | P1 | required-now | automated test |
| T4 | Artifact write warning fallback | snapshot persistence succeeds, artifact write forced to fail | recover executes | route and snapshot stay persisted; warning includes `META_REVIEW_ARTIFACT_WRITE_WARNING` | P1 | required-now | automated test |
| T5 | CLI status reflects recover persistence | post-recover bubble from T1/T3 | `pairflow bubble meta-review status` | `has_run=yes` with populated last-autonomous fields | P1 | required-now | automated test |
| T6 | CLI last-report reflects recover persistence | post-recover bubble from T1/T3 | `pairflow bubble meta-review last-report` | `has_report=yes` and markdown present | P1 | required-now | automated test |
| T7 | Approval metadata coherence | recover emits `APPROVAL_REQUEST` | inspect envelope + state | `payload.metadata.latest_recommendation` equals `state.meta_review.last_autonomous_recommendation` | P1 | required-now | automated test |
| T8 | Transition guard non-regression | bubble not in `META_REVIEW_RUNNING` | recover called | deterministic reject with unchanged reason code | P1 | required-now | automated test |

## L2 - Implementation Notes (Optional)

1. [later-hardening] Consolidate recover/run/submit artifact writers into one shared helper to avoid future drift.
2. [later-hardening] Add lightweight telemetry counter for recover paths that required synthetic fallback.

## Assumptions

1. Existing state schema invariants for `last_autonomous_*` remain unchanged.
2. Canonical artifact paths stay `artifacts/meta-review-last.md` and `artifacts/meta-review-last.json`.
3. Recovery remains a local-only flow (no external service dependency).

## Open Questions

No open non-blocking questions.

## Hardening Backlog (Optional)

| ID | Item | Layer | Priority | Timing | Source | Proposed Action |
|---|---|---|---|---|---|---|
| H1 | Shared report artifact writer for run/submit/recover | L2 | P2 | later-hardening | residual duplication risk | open follow-up refactor task after residual gap closure |
| H2 | Recover diagnostics metric (`recover_synthesized_count`) | L2 | P3 | later-hardening | ops observability | add metric only if incidents persist after this fix |

## Review Control

1. Do not accept fixes that only change CLI rendering; persistence must be state+artifact based.
2. Any claim of completion must include proof for both snapshot hydration and artifact presence.
3. Keep lifecycle route semantics unchanged (`auto_rework` vs human-gate branches).

## Spec Lock

Mark task as `IMPLEMENTABLE` when T1-T8 are green and both conditions hold:
1. recover route never leaves recommendation metadata and snapshot recommendation out of sync,
2. recover route reliably persists canonical last-report artifacts in successful recoverable paths.
