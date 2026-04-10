---
artifact_type: task
artifact_id: task_actor_runtime_interface_meta_review_approve_advisory_guidance_hardening_phaseE_v1
title: "Actor Runtime Interface Meta-Review Approve Advisory Guidance Hardening (Phase E)"
status: implementable
phase: phaseE
target_files:
  - src/v11/shared/metaReview/metaReviewSubmitGuidance.ts
  - src/v11/application/start/startCommandPrompts.ts
  - src/v11/application/metaReviewGate/metaReviewGateNotify.ts
  - src/v11/infrastructure/channel/tmux/tmuxDeliveryMessageBuilder.ts
  - src/v11/shared/metaReview/metaReviewRuntimeParity.ts
  - src/v11/shared/metaReview/liveRun/metaReviewLiveRunReviewerSnapshot.ts
  - src/v11/shared/metaReviewGate/metaReviewGateApprovalReviewerConsistency.ts
  - src/v11/shared/metaReviewGate/approvalRequestEnvelope.ts
  - docs/meta-review-gate-rollout-runbook.md
  - tests/core/runtime/metaReviewSubmitGuidance.test.ts
  - tests/core/runtime/tmuxDelivery.test.ts
  - tests/core/bubble/metaReview.test.ts
  - tests/core/bubble/approvalRequestEnvelope.test.ts
  - tests/core/bubble/metaReviewGate.test.ts
  - tests/contracts/v11/metaReviewSubmitCoverage.test.ts
prd_ref: null
plan_ref: plans/actor-runtime-interface-discovery-and-migration-plan-v1.md
system_context_ref: docs/pairflow-initial-design.md
owners:
  - "felho"
---

# Task: Actor Runtime Interface Meta-Review Approve Advisory Guidance Hardening (Phase E)

## Current Codebase Check (2026-04-10)

1. `src/core/**` is already removed from the current tree, so the old Phase E ownership framing is stale.
2. The shared submit guidance now lives in `src/v11/shared/metaReview/metaReviewSubmitGuidance.ts`, and its current approve note only says that split fields are mandatory and `findings_blocking_open_total` must be `0`.
3. The live prompt surfaces that consume that guidance are:
   - `src/v11/application/start/startCommandPrompts.ts`
   - `src/v11/application/metaReviewGate/metaReviewGateNotify.ts`
   - `src/v11/infrastructure/channel/tmux/tmuxDeliveryMessageBuilder.ts`
4. The live reviewer-snapshot parity and approval diagnostics seams are:
   - `src/v11/shared/metaReview/metaReviewRuntimeParity.ts`
   - `src/v11/shared/metaReview/liveRun/metaReviewLiveRunReviewerSnapshot.ts`
   - `src/v11/shared/metaReviewGate/metaReviewGateApprovalReviewerConsistency.ts`
   - `src/v11/shared/metaReviewGate/approvalRequestEnvelope.ts`
5. The regression surface already exists in current tests under:
   - `tests/core/runtime/metaReviewSubmitGuidance.test.ts`
   - `tests/core/runtime/tmuxDelivery.test.ts`
   - `tests/core/bubble/metaReview.test.ts`
   - `tests/core/bubble/approvalRequestEnvelope.test.ts`
   - `tests/core/bubble/metaReviewGate.test.ts`
   - `tests/contracts/v11/metaReviewSubmitCoverage.test.ts`
6. The runbook already states that advisory-only approve is valid when `findings_blocking_open_total=0`, but it does not yet serve as an explicit corrective script for the recurrent "clean approve rejected, then agent switches to inconclusive" failure mode.
7. Conclusion: this is now a legitimate, bounded implementation target on the current codebase. The stale part was the file ownership map, not the underlying gap.

## Executive Summary

1. This task is not an approve-policy rewrite. The policy baseline already allows `recommendation=approve` with advisory-only open findings when the split metadata is valid and `findings_blocking_open_total=0`.
2. The current gap is wording and diagnostics consistency across the live `v11` submit/prompt/parity surfaces.
3. Today the runtime often tells the agent only that a clean approve claim is contradictory. It does not consistently tell the agent the correct next move:
   - keep `recommendation=approve`
   - do not switch to `inconclusive`
   - re-emit the advisory-only approve shape
4. The task is implementable now because the authoritative seams, error points, and regression tests are already isolated in the current tree.

## L0 - Policy

### Goal

Make the corrective path explicit when the latest same-round reviewer snapshot shows advisory-only open findings:

1. reject a false `clean approve` claim as today,
2. keep fail-closed validator policy unchanged,
3. but tell the agent and operator that the next valid shape is:
   - `recommendation=approve`
   - `findings_claim_state=open_findings`
   - `findings_blocking_open_total=0`
   - positive `findings_advisory_open_total`
4. explicitly warn not to switch to `inconclusive` for this advisory-only parity conflict class.

### Context

1. `buildMetaReviewSubmitApproveParityNote()` is the current shared wording root for startup and notify flows, so it is the narrowest correct owner for the reusable corrective instruction.
2. The tmux-delivered meta-review task prompt is assembled separately in `tmuxDeliveryMessageBuilder.ts`, so prompt parity requires touching that surface too, not just startup/notify helpers.
3. Reviewer-snapshot conflicts are enforced in both meta-review submit seams (`metaReviewRuntimeParity.ts`, `liveRun/metaReviewLiveRunReviewerSnapshot.ts`) and the approval envelope seam (`metaReviewGateApprovalReviewerConsistency.ts` via `approvalRequestEnvelope.ts`).
4. Existing tests already prove three things:
   - advisory-only approve is accepted when the split is valid,
   - clean approve is rejected against a same-round open-finding snapshot,
   - the current contract and help text are anchored in shared guidance builders.
5. This means the remaining work is bounded guidance hardening and message alignment, not new policy design.

### In Scope

1. Rewrite the shared approve guidance note so it explicitly distinguishes `clean approve` from `advisory-only approve`.
2. Propagate the same corrective language across all current canonical prompt surfaces.
3. Tighten reviewer-snapshot conflict/error messages so they tell the agent what valid corrective shape to use when the conflict is advisory-only.
4. Keep blocking-findings failures fail-closed and explicitly avoid advisory-only hints for that invalid case.
5. Align the rollout runbook wording with the runtime wording.
6. Add or update regression tests for the new guidance/error wording.

### Out of Scope

1. Changing approve/rework/inconclusive routing semantics.
2. Changing `META_REVIEW_APPROVE_*` reason-code taxonomy.
3. Introducing new report-json fields or structured corrective metadata.
4. Reopening `status` / `last-report` / `recover` retained-surface cleanup.
5. Solving the separate `inconclusive` submit lane under the guise of this wording task.

### Safety Defaults

1. The validator remains authoritative; wording may clarify, not broaden policy.
2. A real `clean approve` claim must still fail closed when the latest same-round reviewer snapshot reports open findings.
3. Blocking findings must never receive an advisory-only corrective hint.
4. The docs and prompts must not imply that "approve failed once, therefore inconclusive is the default fallback."

### Sequencing Note

1. This task is a valid Phase E implementation target now.
2. Keep it separate from the current `plans/tasks/actor-runtime-interface-meta-review-submit-inconclusive-human-gate-phaseE.md` lane. Likely overlap points are the submit/parity surfaces under:
   - `src/v11/shared/metaReview/metaReviewRuntimeParity.ts`
   - `src/v11/shared/metaReview/liveRun/metaReviewLiveRunReviewerSnapshot.ts`
   - `tests/core/bubble/metaReview.test.ts`
   - `tests/contracts/v11/metaReviewSubmitCoverage.test.ts`
3. Do not bundle inconclusive-policy changes into this task. If a separate implementation bubble for that lane is active, serialize or coordinate those shared files explicitly.

## L1 - Change Contract

### Target File Alignment

1. Shared guidance source:
   - `src/v11/shared/metaReview/metaReviewSubmitGuidance.ts`
2. Canonical prompt consumers:
   - `src/v11/application/start/startCommandPrompts.ts`
   - `src/v11/application/metaReviewGate/metaReviewGateNotify.ts`
   - `src/v11/infrastructure/channel/tmux/tmuxDeliveryMessageBuilder.ts`
3. Reviewer-snapshot / approval conflict surfaces:
   - `src/v11/shared/metaReview/metaReviewRuntimeParity.ts`
   - `src/v11/shared/metaReview/liveRun/metaReviewLiveRunReviewerSnapshot.ts`
   - `src/v11/shared/metaReviewGate/metaReviewGateApprovalReviewerConsistency.ts`
   - `src/v11/shared/metaReviewGate/approvalRequestEnvelope.ts`
4. Docs surface:
   - `docs/meta-review-gate-rollout-runbook.md`
5. Regression surface:
   - `tests/core/runtime/metaReviewSubmitGuidance.test.ts`
   - `tests/core/runtime/tmuxDelivery.test.ts`
   - `tests/core/bubble/metaReview.test.ts`
   - `tests/core/bubble/approvalRequestEnvelope.test.ts`
   - `tests/core/bubble/metaReviewGate.test.ts`
   - `tests/contracts/v11/metaReviewSubmitCoverage.test.ts`

### Call-Site Matrix

| ID | Surface | Current State | Required Change | Priority |
|---|---|---|---|---|
| CS1 | `metaReviewSubmitGuidance.ts` | approve note mentions mandatory split and blocking=0 only | make the corrective branch explicit: keep `recommendation=approve`, do not switch to `inconclusive`, use advisory-only approve shape when latest snapshot is advisory-only | P1 |
| CS2 | `startCommandPrompts.ts` | startup prompt inherits shared note but not the full corrective path | ensure startup wording reflects the expanded shared guidance without diverging vocabulary | P1 |
| CS3 | `metaReviewGateNotify.ts` + `tmuxDeliveryMessageBuilder.ts` | notify/task-delivery prompts mention structured submit contract but not the explicit corrective branch | keep these prompts textually aligned with the shared guidance and each other | P1 |
| CS4 | `metaReviewRuntimeParity.ts` + `liveRun/metaReviewLiveRunReviewerSnapshot.ts` | conflict errors say contradiction / clean approve cannot be emitted | add corrective hint for the advisory-only parity-conflict case while keeping reason code unchanged | P1 |
| CS5 | `metaReviewGateApprovalReviewerConsistency.ts` + `approvalRequestEnvelope.ts` | approval-request conflict surface rejects contradiction but does not explain the valid advisory-only correction | align approval diagnostics with the submit diagnostics vocabulary | P1 |
| CS6 | `docs/meta-review-gate-rollout-runbook.md` | advisory-only approve is described semantically, but not as an explicit corrective playbook | add a short operator-facing corrective rule that mirrors runtime wording | P2 |
| CS7 | tests | coverage is present but current wording is not locked | add assertions that the corrective phrasing survives future edits | P1 |

### Normative Rules

1. `recommendation=approve` is not the same claim as `findings_claim_state=clean`.
2. `clean approve` is valid only when open findings are truly `0`.
3. When the latest same-round reviewer snapshot is advisory-only:
   - keep `recommendation=approve`
   - do not switch to `inconclusive`
   - emit advisory-only split metadata instead of a clean claim
4. Advisory-only corrective hints are valid only when `findings_blocking_open_total=0`.
5. Reason codes stay stable; the hardening is in wording, not taxonomy.
6. Runtime prompts and runbook wording must use the same decision tree and compatible vocabulary.

### Error and Fallback Contract

1. Advisory-only parity conflict:
   - behavior: fail closed
   - reason code: `META_REVIEW_GATE_REVIEWER_CONVERGENCE_CONFLICT`
   - required message behavior: explain that clean approve is invalid here and name advisory-only approve as the valid corrective shape
2. Blocking findings under `recommendation=approve`:
   - behavior: fail closed
   - reason code: `META_REVIEW_APPROVE_BLOCKING_FINDINGS_PRESENT`
   - required message behavior: do not suggest advisory-only approve
3. Missing/invalid split metadata:
   - behavior: fail closed
   - reason codes remain existing `META_REVIEW_APPROVE_ADVISORY_SPLIT_*`
   - wording may clarify required fields, but must not invent a new fallback route

## L2 - Acceptance Surface

### Test Matrix

| ID | Scenario | Required Evidence |
|---|---|---|
| T1 | shared submit guidance explicitly names the advisory-only corrective path | `tests/core/runtime/metaReviewSubmitGuidance.test.ts` |
| T2 | startup and tmux-delivered meta-review prompts use aligned corrective wording | `tests/core/runtime/metaReviewSubmitGuidance.test.ts`, `tests/core/runtime/tmuxDelivery.test.ts` |
| T3 | notify prompt uses the same corrective wording as startup/shared guidance | `tests/core/bubble/metaReviewGate.test.ts` or adjacent prompt tests |
| T4 | meta-review submit fails closed on advisory-only snapshot conflict and the message points to advisory-only approve | `tests/core/bubble/metaReview.test.ts` |
| T5 | approval envelope fails closed on the same conflict class with the same corrective vocabulary | `tests/core/bubble/approvalRequestEnvelope.test.ts` |
| T6 | blocking-findings approve failure does not suggest advisory-only approve | `tests/core/bubble/approvalRequestEnvelope.test.ts`, `tests/core/bubble/metaReviewGate.test.ts` |
| T7 | contract-level submit coverage remains aligned with the current structured submit contract | `tests/contracts/v11/metaReviewSubmitCoverage.test.ts` |
| T8 | runbook wording explicitly mirrors runtime corrective guidance | doc review against `docs/meta-review-gate-rollout-runbook.md` |

### Acceptance Criteria

1. AC1: All canonical meta-review submit guidance surfaces explicitly distinguish `clean approve` from `advisory-only approve`.
2. AC2: Advisory-only parity conflicts explicitly tell the actor to keep `recommendation=approve` and not switch to `inconclusive`.
3. AC3: Blocking-findings failures stay fail-closed and do not receive misleading advisory-only guidance.
4. AC4: Runtime wording and runbook wording present the same corrective decision tree.
5. AC5: No validator-policy, route, or reason-code semantics change is introduced under this task.

### Acceptance Traceability

| Acceptance Criterion | Call Sites | Tests |
|---|---|---|
| AC1 | CS1, CS2, CS3 | T1, T2, T3 |
| AC2 | CS4, CS5 | T4, T5 |
| AC3 | CS4, CS5 | T6 |
| AC4 | CS1, CS2, CS3, CS6 | T1, T2, T3, T8 |
| AC5 | CS4, CS5 | T4, T5, T6, T7 |

## Implementation Notes (Optional)

1. [later-hardening] If this failure class continues to recur, add structured corrective diagnostics instead of keeping the hint only in prose.
2. [later-hardening] If prompt drift becomes recurrent, centralize the exact corrective sentence in one shared helper and make all prompt builders consume it verbatim.

## Review Control

1. Review fail if the diff changes approve/rework/inconclusive routing semantics.
2. Review fail if any prompt or error message still implies that `inconclusive` is the default fallback for advisory-only parity conflict.
3. Review fail if blocking-findings cases receive advisory-only corrective wording.
4. Review fail if the task reintroduces stale `src/core/**` ownership.
5. `contract_boundary_override=yes`; the implementation must remain aligned with `plan_ref`.

## Spec Lock

Task `IMPLEMENTABLE` because:

1. the live ownership is now explicit and current,
2. the change is bounded to wording/diagnostics on existing `v11` seams,
3. the regression surface already exists,
4. and no new policy or architecture prerequisite is required before implementation.
