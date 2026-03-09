---
artifact_type: task
artifact_id: task_meta_review_gate_phase3_human_gate_pane_and_ui_v1
title: "Meta Review Gate - Phase 3 Human Gate, Meta-Reviewer Pane, and UI"
status: implementable
phase: phase3
target_files:
  - src/types/bubble.ts
  - src/types/ui.ts
  - src/core/human/approval.ts
  - src/cli/commands/bubble/approve.ts
  - src/cli/commands/bubble/requestRework.ts
  - src/core/runtime/tmuxDelivery.ts
  - src/core/runtime/tmuxManager.ts
  - src/core/runtime/sessionsRegistry.ts
  - src/core/runtime/reviewerContext.ts
  - src/core/bubble/metaReview.ts
  - src/cli/commands/bubble/metaReview.ts
  - src/core/ui/presenters/bubblePresenter.ts
  - src/core/ui/events.ts
  - ui/src/lib/types.ts
  - ui/src/state/useBubbleStore.ts
  - ui/src/components/canvas/stateVisuals.ts
  - ui/src/components/canvas/BubbleCanvas.tsx
  - ui/src/components/canvas/BubbleExpandedCard.tsx
  - ui/src/components/expanded/BubbleTimeline.tsx
  - tests/core/human/approval.test.ts
  - tests/core/runtime/tmuxDelivery.test.ts
  - tests/core/runtime/sessionsRegistry.test.ts
  - tests/core/ui/bubblePresenter.test.ts
  - tests/core/ui/events.test.ts
  - tests/core/bubble/metaReview.test.ts
  - tests/cli/bubbleApproveCommand.test.ts
  - tests/cli/bubbleRequestReworkCommand.test.ts
  - tests/cli/bubbleMetaReviewCommand.test.ts
  - ui/src/components/canvas/BubbleCanvas.test.tsx
  - ui/src/components/canvas/BubbleExpandedCard.test.tsx
  - ui/src/components/expanded/BubbleTimeline.test.tsx
  - ui/src/state/useBubbleStore.test.ts
prd_ref: docs/meta-review-gate-prd.md
plan_ref: plans/archive/tasks/meta-review-gate/meta-review-gate-plan-v1.md
system_context_ref: docs/pairflow-initial-design.md
normative_refs:
  - docs/meta-review-gate-prd.md
  - docs/pairflow-initial-design.md
owners:
  - "felho"
---

# Task: Meta Review Gate - Phase 3 Human Gate, Meta-Reviewer Pane, and UI

## Revision Log

1. `2026-03-08` (r1 fix pass): added approval-time recommendation lookup fallback contract, restored AC10 output-shape stability coverage, added explicit detail-surface actor coverage, and added request-rework preservation test/AC traceability.
1. `2026-03-08` (docs-refine pass): promoted frontmatter to `implementable`, added deterministic override/audit and pane-label decisions, and fixed AC10 traceability with explicit read-only regression tests (`T17`, `T18`, `T19`).
1. `2026-03-09` (post-implementation alignment): human-gate and UI contracts expanded to include `META_REVIEW_FAILED` (run-failed fail-closed state) alongside `READY_FOR_HUMAN_APPROVAL`.

## L0 - Policy

### Goal

Complete the operator-facing and runtime-facing hardening slice after Phase 2 by delivering:

1. human-gate approval override policy enforcement,
2. dedicated meta-reviewer pane execution visibility,
3. UI support for meta-review states, actor, and latest recommendation.

### In Scope

1. Enforce human-only decision gate behavior at `READY_FOR_HUMAN_APPROVAL` and `META_REVIEW_FAILED`.
2. Require explicit override flag + non-empty reason when human approves while latest recommendation is not `approve`.
3. Add runtime meta-reviewer pane orchestration/visibility for autonomous runs.
4. Surface `META_REVIEW_RUNNING`, `META_REVIEW_FAILED`, and `READY_FOR_HUMAN_APPROVAL` in UI state rendering.
5. Surface `meta-reviewer` actor and latest autonomous recommendation in UI detail/timeline surfaces.
6. Keep `meta-review status` and `meta-review last-report` retrieval semantics unchanged (read-only).

### Out of Scope

1. Meta-review recommendation model/logic changes.
2. New recommendation severities or ontology changes.
3. Historical archive redesign beyond current latest-snapshot model.
4. Rollout SLO/SLA tuning and fleet-level validation (Phase 3e).

### Safety Defaults

1. Final approval remains human-only; autonomous flow must not approve.
2. Non-approve recommendation approval path is blocked unless explicit override+reason is provided.
3. Missing runtime pane visibility must fail safe to existing review behavior (no silent approval bypass).
4. UI unknown/unsupported state fallback must not hide bubble actions or recommendation metadata.

### Contract Boundary / Blast Radius

1. `contract_boundary_override`: `yes`
2. Impacted boundaries:
   - human approval CLI/public command semantics,
   - runtime pane/session behavior contracts,
   - UI state/actor/recommendation rendering contract.

## L1 - Change Contract

### 1) Call-site Matrix

| ID  | File                                                                                                                                                                                        | Function/Entry                    | Exact Signature (args -> return)                      | Insertion Point                     | Expected Behavior                                                                                                                                                        | Priority | Timing       | Evidence    |
| --- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------- | ----------------------------------------------------- | ----------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | -------- | ------------ | ----------- |
| CS1 | `src/core/human/approval.ts`                                                                                                                                                                | approval policy gate              | `emitApprovalDecision(...) -> Promise<...>`           | approval decision precondition path | When latest recommendation is `rework` or `inconclusive`, approval requires explicit override flag and non-empty reason; otherwise reject with deterministic reason code | P1       | required-now | T1,T2,T3    |
| CS2 | `src/cli/commands/bubble/approve.ts`                                                                                                                                                        | CLI option/validation             | `runBubbleApproveCommand(args, cwd?) -> Promise<...>` | parse + command contract            | Add explicit override option and required reason validation for non-approve recommendation path; fail closed when latest recommendation lookup is unavailable           | P1       | required-now | T2,T4,T5,T6 |
| CS3 | `src/core/runtime/tmuxDelivery.ts`, `src/core/runtime/tmuxManager.ts`, `src/core/runtime/sessionsRegistry.ts`                                                                               | meta-reviewer pane runtime wiring | runtime delivery/orchestration helpers                | meta-review run execution path      | Dedicated `meta-reviewer` pane/session visibility is available and auditable during autonomous meta-review execution                                                     | P1       | required-now | T7,T8,T9    |
| CS4 | `src/core/ui/presenters/bubblePresenter.ts`, `src/types/ui.ts`                                                                                                                              | UI payload model                  | presenter + UI types                                  | bubble list/detail mapping          | UI API payload includes/keeps meta-review actor/state/recommendation fields needed for rendering                                                                         | P1       | required-now | T10,T11     |
| CS5 | `ui/src/lib/types.ts`, `ui/src/state/useBubbleStore.ts`                                                                                                                                     | frontend state ingestion          | typed client model + store mapping                    | SSE/API snapshot handling           | Frontend store preserves new Phase 3 fields without lossy mapping or fallback regression                                                                                 | P1       | required-now | T11,T12     |
| CS6 | `ui/src/components/canvas/stateVisuals.ts`, `ui/src/components/canvas/BubbleCanvas.tsx`, `ui/src/components/canvas/BubbleExpandedCard.tsx`, `ui/src/components/expanded/BubbleTimeline.tsx` | rendering layer                   | React components                                      | card/timeline visualization         | Render `META_REVIEW_RUNNING`, `META_REVIEW_FAILED`, `READY_FOR_HUMAN_APPROVAL`, `meta-reviewer` actor, and latest recommendation clearly and deterministically across timeline/detail surfaces | P1       | required-now | T13,T14,T15,T16 |
| CS7 | `src/core/human/approval.ts`, `src/cli/commands/bubble/requestRework.ts`                                                                                                                   | human rework preservation         | `emitRequestRework(...)`, `runBubbleRequestReworkCommand(...)` | human gate non-approve path    | Override policy hardening must not regress request-rework behavior from `READY_FOR_HUMAN_APPROVAL`                                                                     | P1       | required-now | T20         |
| CS8 | tests                                                                                                                                                                                       | coverage                          | `N/A`                                                 | listed test files                   | Cover approval policy, override UX contract, pane visibility contract, UI rendering contract, request-rework preservation, and read-only regression guard              | P1       | required-now | T1-T20      |
| CS9 | `src/core/bubble/metaReview.ts`, `src/cli/commands/bubble/metaReview.ts`                                                                                                                   | cached retrieval contract         | `getMetaReviewStatus(...)`, `getMetaReviewLastReport(...)` | read-only command boundary      | Preserve non-mutating, non-generative retrieval semantics and stable output shape for `status`/`last-report` while Phase 3 changes adjacent state/UI paths             | P1       | required-now | T17,T18,T19 |

### 2) Data and Interface Contract

| Contract                               | Current                                                                              | Target                                       | Required Fields                                                                                         | Optional Fields                                                    | Compatibility      | Priority | Timing       |
| -------------------------------------- | ------------------------------------------------------------------------------------ | -------------------------------------------- | ------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------ | ------------------ | -------- | ------------ |
| Human approval override                | human approve path does not fully enforce recommendation-aware override in all paths | recommendation-aware policy gate             | `override_non_approve` flag and non-empty `override_reason` when latest recommendation is not `approve` | `override_reason` may be omitted only for recommendation=`approve` | behavior hardening | P1       | required-now |
| CLI approve input shape                | limited approve options                                                              | explicit override surface                    | `--override-non-approve` and `--override-reason <text>` (or equivalent deterministic pair)              | N/A                                                                | additive           | P1       | required-now |
| Meta-reviewer runtime actor visibility | autonomous run exists but pane/actor visibility may be partial                       | first-class meta-reviewer runtime visibility | actor/session identity + bubble binding during run                                                      | stage/progress metadata                                            | additive           | P1       | required-now |
| UI state rendering                     | phase2 states may be partially visible by fallback                                   | explicit phase3 rendering contract           | `META_REVIEW_RUNNING`, `META_REVIEW_FAILED`, `READY_FOR_HUMAN_APPROVAL`                                | styling variants are optional                                      | additive           | P1       | required-now |
| UI recommendation visibility           | recommendation available in backend snapshot                                         | recommendation shown in detail surface       | latest recommendation (`rework`/`approve`/`inconclusive`)                                               | optional report ref summary                                        | additive           | P1       | required-now |
| Approval recommendation lookup fallback | latest recommendation is usually available from canonical snapshot                    | deterministic fail-closed contract           | approval command must reject when recommendation lookup is unavailable at decision time                  | diagnostic text for remediation                                     | additive           | P2       | required-now |
| Read-only retrieval regression guard   | Phase 3 touches adjacent state/UI/runtime paths                                      | keep Phase 1/2 retrieval contract unchanged  | `meta-review status` and `meta-review last-report` remain non-mutating and non-generative              | output formatting details                                           | additive           | P1       | required-now |

Policy contract (required-now):

1. Human approval from `READY_FOR_HUMAN_APPROVAL` with recommendation `rework|inconclusive` must fail without explicit override+reason.
2. Override reason validation is deterministic: `trim(override_reason)` must be non-empty for non-approve approval; whitespace-only values are rejected.
3. Approved override path persists audit metadata at minimum with `override_non_approve=true`, trimmed `override_reason`, and recommendation value at decision time.
4. Recommendation `approve` path must continue to work without override flag.
5. Override semantics must not change `request-rework` behavior from human gate.
6. If latest recommendation lookup is unavailable at approval time, approval must fail closed before state mutation with deterministic reason code.

Pane/runtime label contract (required-now):

1. Worker pane role label for this phase is static `meta-reviewer`.
2. Bubble/run-specific identity must be represented via runtime/session metadata binding (not by mutating pane role label).

### 3) Side Effects Contract

| Area                   | Allowed                                                       | Forbidden                                                 | Notes                            | Priority | Timing       |
| ---------------------- | ------------------------------------------------------------- | --------------------------------------------------------- | -------------------------------- | -------- | ------------ |
| Approval decision path | emit explicit override metadata in approval decision envelope | silent approval bypass when recommendation is non-approve | preserve auditability            | P1       | required-now |
| Runtime pane/session   | create/track dedicated meta-reviewer session visibility       | mutating unrelated bubble sessions                        | isolation per bubble is required | P1       | required-now |
| UI rendering           | display additional state/actor/recommendation data            | mutating backend state from display path                  | frontend remains read-driven     | P1       | required-now |
| Read commands          | keep `meta-review status` / `meta-review last-report` read-only | hidden writes or live review execution in read paths    | preserve Phase 1/2 command contract | P1    | required-now |

### 4) Error and Fallback Contract

| Trigger                            | Dependency (if any)                          | Behavior (`throw/result/fallback`) | Fallback Value/Action                                                         | Reason Code                         | Log Level | Priority | Timing       |
| ---------------------------------- | -------------------------------------------- | ---------------------------------- | ----------------------------------------------------------------------------- | ----------------------------------- | --------- | -------- | ------------ |
| Approval without required override | latest recommendation lookup + approval gate | throw                              | reject approval with actionable message                                       | `APPROVAL_OVERRIDE_REQUIRED`        | info      | P1       | required-now |
| Override reason missing/empty      | CLI parse/validation                         | throw                              | reject command before state mutation                                          | `APPROVAL_OVERRIDE_REASON_REQUIRED` | info      | P1       | required-now |
| Recommendation lookup unavailable  | canonical `meta_review` recommendation lookup | throw                             | fail closed; reject approval before state mutation with diagnostics            | `APPROVAL_RECOMMENDATION_UNAVAILABLE` | warn    | P2       | required-now |
| Meta-reviewer pane unavailable     | tmux/session runtime                         | fallback                           | continue with existing run path and emit degraded visibility warning          | `META_REVIEWER_PANE_UNAVAILABLE`    | warn      | P2       | required-now |
| UI field missing in payload        | backend/frontend schema mismatch             | fallback                           | render deterministic fallback label, keep actions usable, emit client warning | `UI_META_REVIEW_FIELD_MISSING`      | warn      | P2       | required-now |

### 5) Dependency Constraints

| Type         | Items                                                                            | Priority | Timing       |
| ------------ | -------------------------------------------------------------------------------- | -------- | ------------ |
| must-use     | Phase 2 lifecycle and routing semantics as baseline                              | P1       | required-now |
| must-use     | Existing meta-review snapshot fields (`meta_review.*`) for recommendation lookup | P1       | required-now |
| must-use     | Existing transcript envelope audit path for human decisions                      | P1       | required-now |
| must-use     | Existing read-only retrieval service contract for `meta-review status/last-report` | P1     | required-now |
| must-use     | Existing human-gate request-rework semantics from Phase 2                        | P1       | required-now |
| must-not-use | Auto-approve branch introduction                                                 | P1       | required-now |
| must-not-use | UI-only state shadow source of truth for recommendation                          | P1       | required-now |
| must-not-use | Hidden writes or implicit rerun in `meta-review status/last-report`             | P1       | required-now |
| must-not-use | Silent fallback to approval when recommendation lookup fails                     | P1       | required-now |

### 6) Test Matrix

| ID  | Scenario                                                        | Given                                                                | When                                               | Then                                                                       | Priority | Timing       | Evidence       |
| --- | --------------------------------------------------------------- | -------------------------------------------------------------------- | -------------------------------------------------- | -------------------------------------------------------------------------- | -------- | ------------ | -------------- |
| T1  | Human approval on non-approve recommendation requires override  | bubble in `READY_FOR_HUMAN_APPROVAL`, latest recommendation=`rework` | run approval without override                      | command rejected with `APPROVAL_OVERRIDE_REQUIRED`                         | P1       | required-now | automated test |
| T2  | Override reason is mandatory                                    | recommendation=`inconclusive`                                        | run approval with override flag but empty reason   | command rejected with `APPROVAL_OVERRIDE_REASON_REQUIRED`                  | P1       | required-now | automated test |
| T3  | Approval with proper override succeeds                          | recommendation=`rework`                                              | run approval with override flag + non-empty reason | transition to `APPROVED_FOR_COMMIT`; transcript contains override metadata | P1       | required-now | automated test |
| T4  | Approve CLI help/usage exposes override contract                | CLI help                                                             | request help                                       | override options and semantics are visible                                 | P2       | required-now | automated test |
| T5  | Recommendation=`approve` does not require override              | recommendation=`approve`                                             | run approval without override                      | approval succeeds normally                                                 | P1       | required-now | automated test |
| T6  | Recommendation lookup unavailable fails closed                  | recommendation lookup returns unavailable/invalid                    | run approval command                               | command rejected with `APPROVAL_RECOMMENDATION_UNAVAILABLE` before mutation | P2      | required-now | automated test |
| T7  | Meta-reviewer pane identity visibility during run               | autonomous run triggered                                             | inspect runtime/session registry                   | meta-reviewer actor/session is bound to bubble and observable              | P1       | required-now | automated test |
| T8  | Pane unavailability fallback                                    | tmux pane setup fails                                                | run autonomous review                              | run does not silently approve; warning reason code emitted                 | P2       | required-now | automated test |
| T9  | Runtime session isolation                                       | two bubbles                                                          | concurrent runs                                    | meta-reviewer session metadata does not bleed across bubbles               | P2       | required-now | automated test |
| T10 | Presenter includes Phase 3 fields                               | backend state with meta-review data                                  | build presenter payload                            | state/actor/recommendation fields present in UI payload                    | P1       | required-now | automated test |
| T11 | Frontend store mapping keeps meta-review fields                 | incoming API/SSE payload                                             | store update                                       | no data loss for actor/state/recommendation values                         | P1       | required-now | automated test |
| T12 | Store fallback behavior with missing optional fields            | partial payload                                                      | store update                                       | deterministic defaults without crashes                                     | P2       | required-now | automated test |
| T13 | Canvas renders `META_REVIEW_RUNNING`/`META_REVIEW_FAILED`/`READY_FOR_HUMAN_APPROVAL` | bubbles in those states                                              | render canvas                                      | clear state labels/visual mapping                                          | P1       | required-now | automated test |
| T14 | Expanded card shows latest recommendation                       | detail payload with recommendation                                   | render expanded card                               | recommendation is visible in detail view                                   | P1       | required-now | automated test |
| T15 | Timeline shows `meta-reviewer` actor                            | timeline entries with sender/recipient meta-reviewer                 | render timeline                                    | actor label is first-class, not unknown/fallback                           | P2       | required-now | automated test |
| T16 | Detail surface shows `meta-reviewer` actor                      | expanded/detail payload includes meta-reviewer actor context         | render expanded card/detail surface                | actor label is visible as first-class (not unknown/fallback)               | P2       | required-now | automated test |
| T17 | `meta-review status` remains read-only under Phase 3 wiring     | bubble has existing `meta_review` snapshot and lifecycle state       | run `pairflow bubble meta-review status --id <id>` | no lifecycle/counter/snapshot mutation and no live review execution         | P1       | required-now | automated test |
| T18 | `meta-review last-report` remains read-only under Phase 3 wiring | bubble has existing report ref or missing report artifact            | run `pairflow bubble meta-review last-report --id <id>` | response is read-only/no-rerun and state fingerprint remains unchanged | P1       | required-now | automated test |
| T19 | `status`/`last-report` output shape stability under Phase 3 wiring | existing snapshot/no-snapshot cases                                  | run read commands in text+json output modes        | stable output contract shape preserved with no hidden mutation              | P2       | required-now | automated test |
| T20 | Request-rework behavior preserved from human gate               | bubble in `READY_FOR_HUMAN_APPROVAL` or `META_REVIEW_FAILED`         | run `bubble request-rework` path                   | transition/message contract remains valid and unaffected by override policy | P2       | required-now | automated test |

## Acceptance Criteria (Binary)

1. AC1: Human approval policy enforces override+reason when latest recommendation is `rework|inconclusive`.
2. AC2: Approval precondition failures (missing required override/reason or unavailable latest recommendation lookup) fail before any state mutation.
3. AC3: Approval with required override transitions correctly and records override metadata.
4. AC4: Recommendation=`approve` path remains approval-compatible without override.
5. AC5: Meta-reviewer pane/session visibility is available during autonomous run execution.
6. AC6: Pane unavailability has explicit degraded fallback and never bypasses human gate policy.
7. AC7: UI renders `META_REVIEW_RUNNING`, `META_REVIEW_FAILED`, and `READY_FOR_HUMAN_APPROVAL` without unknown-state fallback.
8. AC8: UI renders `meta-reviewer` actor in timeline/detail surfaces.
9. AC9: UI surfaces latest autonomous recommendation from canonical snapshot.
10. AC10: Existing `status`/`last-report` read-only semantics and output-shape stability remain unchanged.
11. AC11: Override hardening does not change human-gate `request-rework` behavior contract from either `READY_FOR_HUMAN_APPROVAL` or `META_REVIEW_FAILED`.

## AC-Test Traceability

| AC   | Covered by Tests |
| ---- | ---------------- |
| AC1  | T1,T2            |
| AC2  | T1,T2,T6         |
| AC3  | T3               |
| AC4  | T5               |
| AC5  | T7,T9            |
| AC6  | T8               |
| AC7  | T13              |
| AC8  | T15,T16          |
| AC9  | T11,T14          |
| AC10 | T17,T18,T19      |
| AC11 | T20              |

## L2 - Implementation Notes (Optional)

1. [later-hardening] Consider explicit UI badge taxonomy for recommendation confidence and recency timestamp.
2. [later-hardening] Consider dedicated operator acknowledgement flow for override approvals.
3. [later-hardening] Consider exposing pane stage telemetry in a compact CLI `meta-review watch` command.

## Hardening Backlog

| ID  | Item                                                                   | Layer | Priority | Timing          | Source                | Proposed Action                             |
| --- | ---------------------------------------------------------------------- | ----- | -------- | --------------- | --------------------- | ------------------------------------------- |
| H1  | Add explicit override reason taxonomy for reporting consistency        | L1    | P3       | later-hardening | operator governance   | Define enums after Phase 3e validation data |
| H2  | Add UI activity timeline grouping for repeated meta-review cycles      | L2    | P3       | later-hardening | timeline readability  | Revisit after production UX feedback        |
| H3  | Add pane lifecycle metric export (`meta_reviewer_pane_restarts_total`) | L2    | P3       | later-hardening | runtime observability | Defer to metrics rollout phase              |

## Review Control

1. Every finding must include: `priority`, `timing`, `layer`, `evidence`.
2. Max 2 L1 hardening rounds before implementation handoff.
3. New `required-now` after round 2 is allowed only with evidence-backed `P0/P1`.
4. Items outside Phase 3 contract are tagged `later-hardening` or deferred to Phase 3e task.
5. Because `contract_boundary_override=yes`, `plan_ref` is mandatory and must remain non-null.

## Spec Lock

In this task-artifact convention, `status: implementable` means specification-ready handoff (deterministic and implementation-ready), not that runtime code changes are already delivered.

Mark this task artifact `IMPLEMENTABLE` when all are true:

1. AC1-AC11 are specified with deterministic contract text and AC-test mapping.
2. Human approval override policy and fallback reason codes are unambiguous.
3. Pane visibility and UI rendering contracts are testable without requiring model-behavior assumptions.
4. Phase 2 implementation branch is merged or equivalent interfaces are confirmed stable for Phase 3 wiring.
5. Implementation execution phase must satisfy AC1-AC11 with automated evidence in code/test changes.

## Assumptions

1. Phase 2 task output is merged before Phase 3 merge.
2. Existing runtime session and UI event pipelines remain available for extension.
3. Meta-review snapshot fields introduced in earlier phases remain canonical.

## Resolution Record

1. Override reason minimum-length/taxonomy hardening is deferred to later-hardening (`H1`) and remains out of `required-now` Phase 3 scope.
2. Phase 3 pane role label is fixed as static `meta-reviewer`; per-bubble identity is represented by runtime/session metadata binding.
