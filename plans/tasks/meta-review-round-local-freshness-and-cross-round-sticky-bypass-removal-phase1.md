---
artifact_type: task
artifact_id: task_meta_review_round_local_freshness_cross_round_sticky_bypass_removal_phase1_v1
title: "Meta-Review Round-Local Freshness + Cross-Round Sticky Bypass Removal (Phase 1)"
status: draft
phase: phase1
target_files:
  - src/v11/shared/metaReviewGate/metaReviewGateApply.ts
  - src/v11/shared/metaReviewGate/metaReviewGateApplyHelpers.ts
  - src/v11/shared/metaReviewGate/metaReviewGateStateHelpers.ts
  - src/v11/shared/metaReviewGate/metaReviewGateRecovery.ts
  - src/v11/application/approval/approvalResultMapping.ts
  - src/core/human/reworkIntent.ts
  - src/core/bubble/metaReview.ts
  - src/v11/application/metaReview/metaReviewCliRenderers.ts
  - src/v11/application/metaReview/metaReviewCliRenderersHelpers.ts
  - tests/core/human/approval.test.ts
  - tests/core/bubble/metaReview.test.ts
  - tests/v11/shared/metaReviewGate/metaReviewGateApplyHelpers.test.ts
  - tests/cli/bubbleMetaReviewCommand.test.ts
  - docs/meta-review-gate-rollout-runbook.md
prd_ref: null
plan_ref: null
system_context_ref: docs/pairflow-initial-design.md
owners:
  - "felho"
---

# Task: Meta-Review Round-Local Freshness + Cross-Round Sticky Bypass Removal (Phase 1)

## L0 - Policy

### Goal

Align meta-review gate behavior with product intent:
every round that reaches reviewer convergence after bubble changes must receive a fresh meta-review run before human attention is requested.
Prior-round meta-review output must not substitute for current-round gate execution, and it must not be surfaced as live/current-round meta-review state after a round increment.

### Context (Product Clarification)

1. Meta-review exists to defer human attention until the latest safe point.
2. Its special value is autonomous `rework` routing:
   when the meta-reviewer sees a clear rework, Pairflow should keep the bubble working on itself instead of interrupting the human.
3. Therefore, once a bubble changes and a new round reaches reviewer convergence, the previous round's meta-review is no longer decision-authoritative for the new round.
4. Current `sticky_human_gate` bypass semantics allow a prior human-gate outcome to skip a fresh meta-review on later rounds, which is inconsistent with that product goal.
5. Product clarification: prior-round meta-review history is not operationally interesting on live status surfaces; if needed, operators can inspect the transcript for history.
6. The previously drafted stale-cache/run-id task addressed a symptom, but not the root issue: cross-round reuse of old meta-review authority.

### In Scope

1. Enforce round-local meta-review authority: prior-round meta-review cannot satisfy gate requirements for a later round.
2. Remove or narrow cross-round `human_gate_sticky_bypass` behavior from convergence flow so a fresh meta-review always runs after a new round converges.
3. Preserve the autonomous rework loop: current-round meta-review may still send the bubble back to `RUNNING` without human intervention.
4. Preserve same-round recovery semantics where canonical current-round meta-review output already exists and can be recovered safely.
5. On any round increment, clear live/current-round meta-review snapshot/report semantics so status surfaces do not refer back to prior-round meta-review as if it were active.
6. On any round increment, fully clear `sticky_human_gate` from live bubble state instead of preserving it as current-round or fallback routing input.
7. Update runbook/operator guidance to reflect the new round-local rule and transcript-as-history rule.
8. Keep prior-round history transcript-backed only in Phase 1; do not add a new historical carry field for `sticky_human_gate` in this task.
9. Add regression coverage for human rework -> next round -> mandatory fresh meta-review and status reset behavior.

### Out of Scope

1. Meta-review recommendation taxonomy redesign (`approve|rework|inconclusive` unchanged).
2. Scoring/severity ontology changes.
3. Full historical timeline or multi-snapshot UX redesign.
4. Retrospective migration of old bubble state/artifacts.
5. Full transcript UX redesign.
6. General status-surface polishing unrelated to gate authority.

### Safety Defaults

1. If the bubble is in a later round than the last authoritative meta-review, gate authority is treated as missing, not reusable.
2. When in doubt, run a fresh meta-review rather than route directly to human approval.
3. After round increment, live meta-review status surfaces should behave as "no current-round meta-review yet" rather than showing prior-round results.
4. After round increment, `sticky_human_gate` is cleared from live state rather than preserved as current-round or routing-relevant metadata.
5. Prior-round history remains available from transcript and other historical artifacts, not from current-round status semantics.

### Contract Boundary / Blast Radius

1. `contract_boundary_override`: `no`
2. Behavior changes are limited to meta-review gate routing semantics, round transition carry-over rules, tests, and runbook guidance.

## L1 - Change Contract

### 1) Call-site Matrix

| ID | File | Function/Entry | Exact Signature (args -> return) | Insertion Point | Expected Behavior | Priority | Timing | Evidence |
|---|---|---|---|---|---|---|---|---|
| CS1 | `src/v11/shared/metaReviewGate/metaReviewGateApply.ts` | convergence gate entry | `(input, dependencies?) -> Promise<MetaReviewGateResult>` | `applyMetaReviewGateOnConvergence` sticky branch | Do not let prior-round `sticky_human_gate` short-circuit a fresh meta-review during later-round convergence. Stage a current-round meta-review run instead, preserving the fresh-run path that can still produce autonomous rework. | P1 | required-now | product clarification + T1,T2,T3 |
| CS2 | `src/v11/shared/metaReviewGate/metaReviewGateApplyHelpers.ts` | sticky bypass helper scope | `routeStickyHumanGateBypass(...) -> Promise<MetaReviewGateResult>` | helper call/use sites | Remove convergence-time use of prior-round sticky bypass. If helper remains, it may only participate in same-round recovery-compatible handling and must not authorize later-round human routing. | P1 | required-now | T2,T5 |
| CS3 | `src/v11/application/approval/approvalResultMapping.ts` | immediate human rework transition | `resolveApprovalNextState(input) -> BubbleStateSnapshot` | non-approve branch | Round increment must invalidate prior-round meta-review authority, clear live meta-review current-state fields, and fully clear `sticky_human_gate` so the next round starts without an active meta-review or sticky carry-over view. | P1 | required-now | T1,T6,T7 |
| CS4 | `src/core/human/reworkIntent.ts` | deferred human rework transition | `applyDeferredReworkIntent(input) -> ApplyDeferredReworkIntentResult | null` | `nextRound` branch | Deferred rework path must follow the same invalidation/reset rule as immediate rework: next round requires fresh meta-review at convergence, shows no current-round meta-review before that, and does not carry a live sticky flag forward. | P1 | required-now | T4,T6,T7 |
| CS5 | `src/v11/shared/metaReviewGate/metaReviewGateRecovery.ts` | same-round recovery path | `(input, dependencies?) -> Promise<MetaReviewGateResult>` | recovery resolution path | Preserve same-round recovery of canonical current-round meta-review output; do not accidentally regress recovery into always rerunning. | P2 | required-now | T5 |
| CS6 | `src/v11/shared/metaReviewGate/metaReviewGateStateHelpers.ts` | sticky flag semantics | `transitionToGateState(...) -> BubbleStateSnapshot` and related helpers | sticky flag write/carry logic | `sticky_human_gate` must not grant cross-round gate bypass authority; on round increment it is fully cleared from live state instead of being reduced to a current-round-visible historical hint. | P1 | required-now | T1,T2 |
| CS7 | `src/core/bubble/metaReview.ts` | status and last-report read path | read APIs | `getMetaReviewStatus`, `getMetaReviewLastReport` | Read-path helpers must expose current-round pending/none semantics after round increment and must not return prior-round recommendation/report or sticky flag as active current-round data. | P1 | required-now | T6,T7 |
| CS8 | `src/v11/application/metaReview/metaReviewCliRenderers.ts` + `src/v11/application/metaReview/metaReviewCliRenderersHelpers.ts` | status and last-report renderers | renderer path | render helpers for status/last-report commands | Renderer output must faithfully present the read-path contract: pending/none before a fresh current-round run, current-round report after a fresh run, and no prior-round sticky/report carry-over shown as active. | P1 | required-now | T6,T7 |
| CS9 | `tests/*` | regression tests | `vitest` | listed test files | Lock per-round freshness, human rework carry semantics, same-round recovery safety, autonomous rework preservation, and status reset behavior. | P1 | required-now | T1-T7 |
| CS10 | `docs/meta-review-gate-rollout-runbook.md` | operator runbook | doc update | interpretation guidance | Clarify that each new converged round requires fresh meta-review before any human approval request, that transcript is the source for prior-round meta-review history, and how to interpret recovery diagnostics outside the same-round recovery happy path. | P2 | required-now | docs consistency |

### 2) Data and Interface Contract

| Contract | Current | Target | Required Fields | Optional Fields | Compatibility | Priority | Timing |
|---|---|---|---|---|---|---|---|
| Meta-review authority scope | previous round may influence later-round convergence routing via sticky bypass | authoritative only for the round in which the meta-review was produced | current `round`, current convergence event | historical prior-round metadata | behavior-tightening | P1 | required-now |
| Sticky human gate semantics | can act as direct later-round routing shortcut | fully cleared from live state on round increment; no cross-round routing or current-round visibility | round increment event, current round context | transcript/history artifacts only | behavior-tightening | P1 | required-now |
| Human rework carry-over | new round keeps enough old state to enable accidental old-authority reuse and misleading status output | new round clears live meta-review state and sticky flag; fresh meta-review is required at next convergence | `round + 1` transition | transcript history only | behavior-tightening | P1 | required-now |
| Same-round recovery | implicit mixed with sticky behavior | explicitly preserved only for current-round canonical meta-review output | current-round canonical snapshot/report evidence | warnings/diagnostics | behavior-tightening | P2 | required-now |
| Status/last-report semantics | may expose prior-round meta-review as if it were current | only current-round meta-review appears in live status surfaces; prior-round history is transcript-only | current round context | future explicit history UX | behavior-tightening | P1 | required-now |

Normative rules:
1. A meta-review result is decision-authoritative only for the round in which it was produced.
2. Any transition that increments the bubble round invalidates prior-round meta-review authority for later convergence routing.
3. Reviewer convergence in a new round must trigger a fresh meta-review before human approval is requested.
4. Any transition that increments the bubble round fully clears `sticky_human_gate` from live bubble state; the flag is not preserved as current-round metadata, fallback signal, or history field in Phase 1.
5. Live `meta-review status` / `last-report` surfaces are current-round views, not historical views.
6. Same-round recovery remains allowed when canonical current-round meta-review output already exists and matches the active gate context.

### 2a) Round Transition Contract

| Path | Transition | Required Round-Local Effect | Forbidden Carry-Over | Priority | Timing |
|---|---|---|---|---|---|
| Immediate human rework | `READY_FOR_HUMAN_APPROVAL -> RUNNING` with `round + 1` | clear live meta-review snapshot/report fields, clear `sticky_human_gate`, require fresh meta-review at next convergence | prior-round recommendation, report, sticky flag, or run identity shown as active | P1 | required-now |
| Deferred human rework intent | deferred resume into next round | same reset/invalidation contract as immediate rework | any live current-round status, sticky flag, or run identity derived from prior-round meta-review | P1 | required-now |
| Fresh current-round autonomous rework | current-round meta-review returns `rework` after the new round converges | preserve autonomous loop by routing back to `RUNNING` after the fresh current-round run | forcing human attention because prior-round sticky state was cleared | P1 | required-now |
| Same-round recovery | recovery inside the active round with canonical current-round output already persisted | reuse current-round canonical output without rerun | treating prior-round output as eligible recovery input | P2 | required-now |

### 3) Side Effects Contract

| Area | Allowed | Forbidden | Notes | Priority | Timing |
|---|---|---|---|---|---|
| Convergence routing | stage `META_REVIEW_RUNNING` on each newly converged round | direct later-round human approval due only to prior-round sticky flag | human attention must stay last-resort/latest-point | P1 | required-now |
| Human rework transitions | clear live meta-review fields and `sticky_human_gate` on round increment | carrying prior-round recommendation/report or sticky flag into current-round live status surfaces | transcript remains history source | P1 | required-now |
| Recovery | reuse canonical same-round output for recovery | using previous-round output as if it were a fresh run | recovery must remain round-local | P1 | required-now |
| Autonomous rework | current-round meta-review may still dispatch auto-rework | forcing human review when fresh current-round meta-review would have routed rework | preserve original product value | P1 | required-now |
| Status surfaces | show no current-round meta-review before a fresh run exists | showing prior-round report/recommendation or sticky flag as if still active | avoid operator confusion | P1 | required-now |

### 4) Error and Fallback Contract

| Trigger | Dependency (if any) | Behavior (`throw|result|fallback`) | Fallback Value/Action | Reason Code | Log Level | Priority | Timing |
|---|---|---|---|---|---|---|---|
| New round converges while prior-round `sticky_human_gate=true` | bubble state | result | start fresh meta-review; do not bypass to human gate | `META_REVIEW_FRESH_RUN_REQUIRED` | info | P1 | required-now |
| Human rework increments round | approval/rework transition | fallback | preserved prior-round meta-review data becomes historical only | `META_REVIEW_AUTHORITY_INVALIDATED_BY_NEW_ROUND` | info | P1 | required-now |
| Round increment would otherwise carry `sticky_human_gate=true` into the next round | round transition helpers | fallback | clear the sticky flag from live state and continue with transcript-only history | `META_REVIEW_STICKY_FLAG_CLEARED_ON_ROUND_INCREMENT` | info | P1 | required-now |
| Status read after round increment but before fresh meta-review | status/last-report read path | result | return no-current-meta-review / pending semantics, not prior-round details | `META_REVIEW_CURRENT_ROUND_PENDING` | info | P1 | required-now |
| Recovery request has canonical current-round output | current-round snapshot/artifact | result | recover from existing current-round run without rerun | existing recovery codes remain valid | info | P2 | required-now |
| Recovery request only has prior-round output for current round gate | snapshot/artifact mismatch | fallback | treat as missing current-round authority and require fresh meta-review path | `META_REVIEW_RECOVERY_REQUIRES_CURRENT_ROUND_RESULT` | warn | P2 | required-now |

### 5) Dependency Constraints

| Type | Items | Priority | Timing |
|---|---|---|---|
| must-use | existing round semantics (`round + 1` on rework transitions) | P1 | required-now |
| must-use | existing meta-review gate start/recovery split | P1 | required-now |
| must-use | current-round canonical submit/recovery path where available | P1 | required-now |
| must-use | transcript as historical source of truth for prior-round meta-review review history | P2 | required-now |
| must-use | explicit live-state clearing on round increment instead of historical sticky carry-over | P1 | required-now |
| must-not-use | prior-round sticky flag as later-round convergence shortcut | P1 | required-now |
| must-not-use | prior-round report/run-id as substitute for current-round meta-review authority | P1 | required-now |
| must-not-use | operator-facing logic that presents a prior-round meta-review as active current-round status | P1 | required-now |
| must-not-use | new Phase 1 shadow/history field that preserves `sticky_human_gate` outside transcript/history artifacts | P1 | required-now |

### 6) Test Matrix

| ID | Scenario | Given | When | Then | Priority | Timing | Evidence |
|---|---|---|---|---|---|---|---|
| T1 | Human rework invalidates prior-round authority | bubble in `READY_FOR_HUMAN_APPROVAL` with sticky flag and prior-round meta-review | human `request-rework` / revise occurs | next round is created, `sticky_human_gate` is cleared, and prior-round meta-review no longer authorizes later convergence routing | P1 | required-now | automated test |
| T2 | Later-round convergence requires fresh meta-review despite legacy sticky carry-over fixture | defensive pre-fix/legacy-style fixture for round `N+1` convergence still contains prior-round `sticky_human_gate=true` from round `N` | `applyMetaReviewGateOnConvergence` runs | state enters `META_REVIEW_RUNNING` / fresh meta-review kickoff path instead of `human_gate_sticky_bypass`; test proves defensive handling, not allowed Phase 1 steady-state carry-over | P1 | required-now | automated test |
| T3 | Fresh current-round meta-review still enables autonomous rework | round `N+1` converges after human rework | current-round meta-review returns `rework` | bubble returns to `RUNNING` without human interruption | P1 | required-now | automated test |
| T4 | Deferred rework path follows same invalidation rule | pending rework intent resumes bubble into next round | next round later converges | fresh meta-review is required; prior-round sticky state is cleared from live state and does not bypass it | P1 | required-now | automated test |
| T5 | Same-round recovery remains valid | bubble in `META_REVIEW_RUNNING` already has canonical current-round meta-review output | recovery path runs | recovery succeeds without rerunning and without loosening round-local rule | P2 | required-now | automated test |
| T6 | Status resets after immediate round increment | bubble had prior-round meta-review, then human rework creates next round | `meta-review status` runs before a fresh current-round meta-review | status does not show prior-round recommendation/report or sticky flag as current; shows pending/none semantics | P1 | required-now | automated test |
| T7 | Last-report resets after round increment | bubble had prior-round report, then deferred or immediate rework creates next round | `meta-review last-report` runs before a fresh current-round meta-review | last-report does not present prior-round report as current-round last report; history remains transcript-only and no live sticky carry-over is exposed | P1 | required-now | automated test |

## Acceptance Criteria (Binary)

1. AC1: Any new round produced by rework requires a fresh meta-review before human approval can be requested again.
2. AC2: Prior-round `sticky_human_gate` can no longer cause direct later-round convergence bypass to human approval.
3. AC3: Current-round meta-review can still route autonomous rework, preserving the human-attention deferral goal.
4. AC4: Same-round recovery of already-persisted canonical meta-review output remains supported.
5. AC5: After round increment, live status/last-report surfaces no longer present prior-round meta-review as current-round state.
6. AC6: Prior-round meta-review history remains obtainable from transcript, not from current-round status semantics.
7. AC7: `sticky_human_gate` is fully cleared from live state on round increment rather than preserved in Phase 1 as a non-routing current-round-visible field.

## Acceptance Traceability Matrix

| AC | Covered By Tests | Covered By Call-sites |
|---|---|---|
| AC1 | T1, T2, T4 | CS1, CS3, CS4, CS6 |
| AC2 | T2 | CS1, CS2, CS6 |
| AC3 | T3 | CS1, CS6 |
| AC4 | T5 | CS5 |
| AC5 | T6, T7 | CS3, CS4, CS7, CS8 |
| AC6 | T1, T6, T7 | CS3, CS4, CS7, CS8, CS10 |
| AC7 | T1, T4, T6, T7 | CS3, CS4, CS6, CS7, CS8 |

## L2 - Implementation Notes (Optional)

1. [later-hardening] Add an explicit round-local metadata field if future maintenance needs a cheaper proof than route-context inference.
2. [later-hardening] If future UX needs historical meta-review browsing, add a dedicated transcript-backed history view instead of overloading live status surfaces.
3. [later-hardening] Add metrics for how many human approvals were avoided by the restored fresh current-round auto-rework path.
4. [phase1-non-goal] Do not introduce a replacement historical carry field for `sticky_human_gate`; transcript-backed history is sufficient for this phase.

## Assumptions

1. The desired product invariant is stronger than the current sticky bypass implementation: each changed, converged round must get its own fresh meta-review.
2. Same-round recovery is still valuable and should be preserved.
3. Transcript is the preferred historical source for prior-round meta-review details.

## Resolved Decisions

1. On round increment, `sticky_human_gate` is fully cleared from live bubble state in Phase 1.
2. Transcript/history artifacts remain the only supported source for prior-round meta-review history in this phase; no replacement sticky-history field is added.

## Hardening Backlog (Optional)

| ID | Item | Layer | Priority | Timing | Source | Proposed Action |
|---|---|---|---|---|---|---|
| HB1 | Explicit round-local authority marker | L2 | P2 | later-hardening | maintainability | add typed field only if post-fix codepaths remain too inference-heavy |
| HB2 | Dedicated historical meta-review browser | L2 | P2 | later-hardening | operator UX | expose transcript-backed history in a separate command/view if needed |
| HB3 | Human-attention deferral metrics | L2 | P3 | later-hardening | product validation | count fresh meta-review auto-rework saves after rollout |

## Review Control

1. Any implementation that still allows prior-round sticky bypass after a new round converges is not acceptable.
2. Any implementation that breaks same-round recovery without explicit product approval is not acceptable.
3. Findings must distinguish clearly between transcript-backed history and current-round routing/status authority.

## Spec Lock

Task is `IMPLEMENTABLE` when:
1. A reworked later round cannot skip fresh meta-review due to prior-round sticky history.
2. Fresh current-round meta-review remains the last autonomous chance to request rework before human attention.
3. Same-round recovery still works, but prior-round output is never treated as current-round authority or shown as current-round live status.
4. Round increment fully clears `sticky_human_gate` from live state instead of preserving a Phase 1 historical carry field.
