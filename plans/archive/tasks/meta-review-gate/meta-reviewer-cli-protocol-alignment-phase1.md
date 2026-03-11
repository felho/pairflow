---
artifact_type: task
artifact_id: task_meta_reviewer_cli_protocol_alignment_phase1_v1
title: "Meta-Reviewer CLI Protocol Alignment (Phase 1)"
status: superseded
phase: phase1
superseded_by: plans/tasks/meta-reviewer-structured-pairflow-channel-cutover-phase1.md
target_files:
  - src/core/bubble/metaReview.ts
  - src/core/bubble/metaReviewGate.ts
  - src/core/bubble/startBubble.ts
  - src/cli/commands/bubble/metaReview.ts
  - src/cli/index.ts
  - src/core/runtime/sessionsRegistry.ts
  - tests/core/bubble/metaReview.test.ts
  - tests/core/bubble/metaReviewGate.test.ts
  - tests/cli/bubbleMetaReviewCommand.test.ts
prd_ref: null
plan_ref: null
system_context_ref: docs/pairflow-initial-design.md
owners:
  - "felho"
---

> Superseded task: canonical replacement is
> `plans/tasks/meta-reviewer-structured-pairflow-channel-cutover-phase1.md`.
> Kept in archive for historical traceability only.

# Task: Meta-Reviewer CLI Protocol Alignment (Phase 1)

## L0 - Policy

### Goal

Replace fragile tmux pane marker scraping in meta-review with the same CLI-mediated, canonical-state update pattern already used by implementer/reviewer handoffs.

### Context

Observed mismatch on `2026-03-10`:
1. Bubble state moved to `META_REVIEW_FAILED` due to marker timeout.
2. The meta-reviewer Codex session still produced a valid final JSON for the same run ID.
3. This created split truth between gate status and actual reviewer output.

### In Scope

1. Add an explicit CLI submission path for meta-reviewer result handoff (`run_id`, recommendation, summary, report, optional rework message).
2. Gate path (`META_REVIEW_RUNNING`) must consume canonical submitted result by `run_id`, not tmux pane text parsing.
3. Preserve existing lifecycle semantics (`auto_rework`, human gate, `META_REVIEW_FAILED` fallback).
4. Keep `meta-review status` and `meta-review last-report` read contracts deterministic from persisted snapshot/artifacts.
5. Update meta-reviewer pane startup/run prompt to use the CLI submission path as required output channel.

### Out of Scope

1. Recommendation policy redesign (`approve|rework|inconclusive` meaning changes).
2. Removal of meta-reviewer pane concept.
3. Full event model redesign across all bubble roles.
4. Retrospective migration of historical inconsistent bubbles.

### Safety Defaults

1. If no valid submission is persisted before timeout, route fail-safe to human gate (`META_REVIEW_FAILED`) with explicit reason code.
2. Treat stale/foreign `run_id` submissions as invalid and non-authoritative.
3. Canonical source of truth remains bubble state snapshot + canonical report artifacts.

### Contract Boundary / Blast Radius

1. `contract_boundary_override`: `no`
2. Affected boundaries:
   - meta-review runtime handoff channel,
   - gate run ingestion semantics,
   - CLI command surface under `pairflow bubble meta-review`,
   - tests for routing/persistence consistency.

## L1 - Change Contract

### 1) Call-site Matrix

| ID | File | Function/Entry | Exact Signature (args -> return) | Insertion Point | Expected Behavior | Priority | Timing | Evidence |
|---|---|---|---|---|---|---|---|---|
| CS1 | `src/cli/commands/bubble/metaReview.ts` | `handleBubbleMetaReviewSubmitCommand` (new) | `(args, io) -> Promise<number>` | `pairflow bubble meta-review` subcommand family | Parse and validate structured submission payload, then persist via core service with `run_id` binding | P1 | required-now | current pane marker parsing can timeout despite valid reviewer output |
| CS2 | `src/cli/index.ts` | bubble meta-review routing | `handleBubbleMetaReviewCommand(...)` | command dispatch table | Register `submit` subcommand without breaking existing `run|status|last-report|recover` flows | P1 | required-now | CLI parity requirement |
| CS3 | `src/core/bubble/metaReview.ts` | `submitMetaReviewResult` (new) | `(input, deps?) -> Promise<MetaReviewRunResult>` | alongside `runMetaReview` | Persist canonical `meta_review.last_autonomous_*` + canonical report artifacts from submitted payload with run-id validation | P1 | required-now | canonical state must not depend on tmux buffer parsing |
| CS4 | `src/core/bubble/metaReviewGate.ts` | `applyMetaReviewGateOnConvergence` | `(input, deps?) -> Promise<MetaReviewGateResult>` | after transition to `META_REVIEW_RUNNING` | Wait for/consume submitted canonical result by `run_id`; do not parse pane-delimited marker block as primary path | P1 | required-now | eliminate split-truth timing race |
| CS5 | `src/core/bubble/startBubble.ts` | meta-reviewer run instructions | prompt assembly for pane 3 | startup + run prompts | Meta-reviewer must return result through `pairflow bubble meta-review submit ...` contract | P2 | required-now | operational consistency |
| CS6 | `src/core/runtime/sessionsRegistry.ts` | meta-review run-id binding usage | runtime session read/update helpers | submission validation path | Submission accepted only when `run_id` matches active meta-reviewer run context (or explicit compatible recovery rule) | P1 | required-now | stale run protection |
| CS7 | `tests/core/bubble/metaReview.test.ts` | submission flow tests | vitest | meta-review core service coverage | Validate submit persistence, run-id mismatch rejection, and schema validation | P1 | required-now | regression guard |
| CS8 | `tests/core/bubble/metaReviewGate.test.ts` | gate ingestion tests | vitest | convergence gate meta-review integration | Validate route behavior with submitted result (`approve/rework/inconclusive`) without pane marker dependency | P1 | required-now | regression guard |
| CS9 | `tests/cli/bubbleMetaReviewCommand.test.ts` | CLI submit tests | vitest | command integration | Validate submit route + structured JSON errors + status/last-report coherence | P1 | required-now | user-visible contract |

### 2) Data and Interface Contract

| Contract | Current | Target | Required Fields | Optional Fields | Compatibility | Priority | Timing |
|---|---|---|---|---|---|---|---|
| Meta-review output ingestion | runner extracts delimited JSON from tmux pane content | CLI submit provides structured payload persisted by core service | `bubble_id`, `run_id`, `recommendation`, `summary`, `report_markdown` | `rework_target_message`, `report_json` | additive | P1 | required-now |
| Canonical snapshot update | primarily tied to `runMetaReview` internal runner result | supports both autonomous internal run and explicit submit path using same canonical fields | `last_autonomous_run_id`, `last_autonomous_status`, `last_autonomous_recommendation`, `last_autonomous_report_ref`, `last_autonomous_updated_at` | `last_autonomous_summary`, `last_autonomous_rework_target_message` | non-breaking | P1 | required-now |
| Gate result consumption | depends on synchronous runner return + pane parsing timeout | consumes canonical persisted result by matching `run_id` and routes deterministically | matching `run_id`, valid status/recommendation pair | warning metadata | non-breaking | P1 | required-now |

### 3) Side Effects Contract

| Area | Allowed | Forbidden | Notes | Priority | Timing |
|---|---|---|---|---|---|
| Bubble state | update `meta_review` canonical snapshot fields through CAS writes | non-CAS blind overwrite | preserve current conflict handling patterns | P1 | required-now |
| Artifacts | write canonical `artifacts/meta-review-last.md` and `.json` | non-canonical report paths | keep safe artifacts-only path rules | P1 | required-now |
| Runtime/tmux | keep pane delivery for prompting | pane buffer as canonical output channel | tmux remains transport, not source of truth | P1 | required-now |

Constraint: no hidden state mutations in read commands (`status`, `last-report` remain read-only).

### 4) Error and Fallback Contract

| Trigger | Dependency (if any) | Behavior (`throw|result|fallback`) | Fallback Value/Action | Reason Code | Log Level | Priority | Timing |
|---|---|---|---|---|---|---|---|
| submit payload schema invalid | CLI parser / core validator | throw | command exits non-zero with structured validation error | META_REVIEW_SCHEMA_INVALID | error | P1 | required-now |
| submit recommendation/status invariant invalid | core validator | throw | reject payload, no state mutation | META_REVIEW_SCHEMA_INVALID_COMBINATION | error | P1 | required-now |
| submit `run_id` does not match active run | runtime session binding | throw | reject as stale/foreign result | META_REVIEW_RUN_ID_MISMATCH | warn | P1 | required-now |
| gate timeout without valid submission | gate wait loop | fallback | route to `META_REVIEW_FAILED` + human approval request | META_REVIEW_GATE_RUN_FAILED | warn | P1 | required-now |
| artifact write warning after successful snapshot write | fs write | result + warning | return success with warning; keep snapshot authoritative | META_REVIEW_ARTIFACT_WRITE_WARNING | warn | P2 | required-now |

### 5) Dependency Constraints

| Type | Items | Priority | Timing |
|---|---|---|---|
| must-use | existing CAS state write flow (`readStateSnapshot` + `writeStateSnapshot`) | P1 | required-now |
| must-use | canonical artifact refs: `artifacts/meta-review-last.md`, `artifacts/meta-review-last.json` | P1 | required-now |
| must-use | existing meta-review status/last-report read services as source for CLI output | P1 | required-now |
| must-not-use | tmux `capture-pane` marker block as primary authoritative output ingestion | P1 | required-now |
| must-not-use | hidden read-command writes in `meta-review status` / `last-report` | P1 | required-now |

### 6) Test Matrix

| ID | Scenario | Given | When | Then | Priority | Timing | Evidence |
|---|---|---|---|---|---|---|---|
| T1 | Submit happy path (`approve`) | bubble in `META_REVIEW_RUNNING`, valid active `run_id` | `meta-review submit` with valid payload | canonical snapshot + artifacts persisted; recommendation/status consistent | P1 | required-now | automated test |
| T2 | Submit happy path (`rework`) | same as T1 | submit with non-empty `rework_target_message` | snapshot stores rework target and gate can route auto/human deterministically | P1 | required-now | automated test |
| T3 | Submit reject on missing rework message | `recommendation=rework` | submit without `rework_target_message` | command fails with invariant error; no mutation | P1 | required-now | automated test |
| T4 | Submit reject on stale run id | active run id differs | submit payload with mismatched `run_id` | command fails with `META_REVIEW_RUN_ID_MISMATCH`; no mutation | P1 | required-now | automated test |
| T5 | Gate route from submitted `approve` | valid submitted result exists for active run id | convergence gate recovery path executes | route reaches human approval state with consistent summary/metadata | P1 | required-now | automated test |
| T6 | Gate route from submitted `inconclusive/error` | valid submitted result with inconclusive/error | gate routing executes | lifecycle routes to `META_REVIEW_FAILED` with human-safe approval request | P1 | required-now | automated test |
| T7 | Timeout fallback with no submission | no valid submit arrives before timeout | gate wait expires | deterministic fallback reason and human gate route | P1 | required-now | automated test |
| T8 | Read contract stability | bubble has submitted snapshot/report | run `meta-review status` and `last-report` | read-only behavior; no state mutation; output matches persisted snapshot | P1 | required-now | automated test |
| T9 | Legacy run command compatibility | existing `meta-review run` command path | run command | still works, but canonical persistence path converges with submit semantics | P2 | required-now | automated test |

## Acceptance Criteria (Binary)

1. AC1: Meta-reviewer output can be persisted via explicit Pairflow CLI submit path with strict schema and invariant validation.
2. AC2: Gate routing in `META_REVIEW_RUNNING` no longer depends on tmux marker block parsing as primary truth source.
3. AC3: `run_id` mismatch submissions are rejected deterministically without state/artifact mutation.
4. AC4: Canonical snapshot and canonical report artifacts remain consistent for accepted submissions.
5. AC5: `meta-review status` and `meta-review last-report` stay read-only and reflect persisted canonical data.
6. AC6: Timeout/no-submit path still fails safe to human gate with explicit reason code.
7. AC7: Existing meta-review lifecycle semantics remain backward compatible (`approve/rework/inconclusive` routing unchanged).

## Acceptance Traceability Matrix

| AC | Covered By Tests | Covered By Call-sites |
|---|---|---|
| AC1 | T1, T2, T3 | CS1, CS2, CS3 |
| AC2 | T5, T6, T7 | CS4 |
| AC3 | T4 | CS3, CS6 |
| AC4 | T1, T2, T8 | CS3, CS4 |
| AC5 | T8 | CS2, CS3 |
| AC6 | T7 | CS4 |
| AC7 | T5, T6, T9 | CS3, CS4 |

## L2 - Implementation Notes (Optional)

1. [later-hardening] Keep temporary pane marker parser behind explicit fallback flag until rollout confidence is established.
2. [later-hardening] Add per-run telemetry (`submitted_at`, `route_latency_ms`) for operational diagnostics.
3. [later-hardening] Consider extracting shared `MetaReviewResultSchema` for runner+submit contract parity.

## Hardening Backlog (Optional)

| ID | Item | Layer | Priority | Timing | Source | Proposed Action |
|---|---|---|---|---|---|---|
| H1 | Remove legacy pane marker fallback path after rollout confidence | L2 | P2 | later-hardening | implementation follow-up | create cleanup task once production error rate is stable |
| H2 | Add replay-safe dedup key for duplicate submit attempts | L2 | P3 | later-hardening | robustness follow-up | add idempotency key contract in later phase |

## Review Control

1. Any claimed fix must prove single-source-of-truth behavior (submitted result -> snapshot/artifact -> status/last-report -> gate route).
2. Do not accept solutions that still require tmux pane text parsing as normal path.
3. Keep fallback behavior human-safe and deterministic under all failure modes.

## Assumptions

1. Meta-reviewer pane can execute Pairflow CLI commands in the worktree context.
2. Existing runtime session binding (`metaReviewerPane.runId`) is available for run-id validation.
3. CLI additive change under `pairflow bubble meta-review` is acceptable in this phase.

## Open Questions

1. Should legacy marker parsing remain as temporary fallback for one release or be removed in Phase 1 directly?
2. Should submit command accept inline JSON only, file-based input only, or both?

## Spec Lock

Mark task as `IMPLEMENTABLE` when AC1-AC7 are satisfied with T1-T9 green and no split-truth scenario remains between gate state and meta-reviewer output.
