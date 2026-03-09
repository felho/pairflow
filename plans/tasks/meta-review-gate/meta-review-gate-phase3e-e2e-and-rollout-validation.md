---
artifact_type: task
artifact_id: task_meta_review_gate_phase3e_e2e_and_rollout_validation_v1
title: "Meta Review Gate - Phase 3e E2E and Rollout Validation"
status: draft
phase: phase3e
target_files:
  - src/core/bubble/metaReviewGate.ts
  - src/core/runtime/agentCommand.ts
  - src/core/runtime/tmuxDelivery.ts
  - src/core/runtime/startupReconciler.ts
  - src/core/ui/router.ts
  - src/core/ui/server.ts
  - src/cli/commands/bubble/metaReview.ts
  - src/cli/commands/bubble/status.ts
  - src/core/metrics/bubbleEvents.ts
  - src/core/metrics/report/report.ts
  - tests/core/bubble/metaReviewGate.test.ts
  - tests/core/bubble/orchestrationLoopSmoke.test.ts
  - tests/core/bubble/parallelBubblesSmoke.test.ts
  - tests/core/runtime/restartRecovery.test.ts
  - tests/core/runtime/startupReconciler.test.ts
  - tests/core/ui/server.integration.test.ts
  - tests/cli/bubbleMetaReviewCommand.test.ts
  - tests/cli/bubbleStatusCommand.test.ts
  - docs/meta-review-gate-rollout-runbook.md
  - docs/meta-review-gate-e2e-validation.md
prd_ref: docs/meta-review-gate-prd.md
plan_ref: plans/tasks/meta-review-gate/meta-review-gate-plan-v1.md
system_context_ref: docs/pairflow-initial-design.md
normative_refs:
  - docs/meta-review-gate-prd.md
  - docs/pairflow-initial-design.md
owners:
  - "felho"
---

# Task: Meta Review Gate - Phase 3e E2E and Rollout Validation

## L0 - Policy

### Goal

Close Meta Review Gate delivery with production-grade end-to-end validation and rollout readiness checks after Phase 1-3 feature implementation.

Phase 3e must ensure:
1. end-to-end lifecycle behavior is stable under realistic loop conditions,
2. operator flow is deterministic in tmux/CLI/UI surfaces,
3. rollout evidence and rollback guidance are explicit and actionable.

### In Scope

1. Add deterministic E2E coverage for the full meta-review lifecycle:
   - convergence -> autonomous review -> auto-rework loop -> human gate -> human decision.
2. Add resilience coverage for restart/reconcile paths while bubbles are in `META_REVIEW_RUNNING` and `READY_FOR_HUMAN_APPROVAL`.
3. Validate command-path determinism for worker-driven commands so bubble worktree execution cannot silently use stale global `pairflow` build output.
4. Add rollout runbook + validation evidence template docs for operators.
5. Add rollout-level metric/event validation hooks for post-merge confidence.

### Out of Scope

1. New recommendation classes or reviewer ontology changes.
2. New lifecycle states beyond the PRD-defined model.
3. UI redesign work beyond correctness and regression guards.
4. Historical archive redesign for autonomous snapshots.

### Safety Defaults

1. Keep fail-safe routing to `READY_FOR_HUMAN_APPROVAL` on autonomous failures.
2. Never auto-approve; human final decision remains mandatory.
3. Rollout defaults to staged validation gates; no "silent on" path.
4. If command-path determinism cannot be proven, block rollout readiness.

### Contract Boundary / Blast Radius

1. `contract_boundary_override`: `yes`
2. Impacted boundaries:
   - cross-component lifecycle behavior contract,
   - runtime command execution path contract,
   - rollout operations and evidence contract.

## L1 - Change Contract

### 1) Call-site Matrix

| ID | File | Function/Entry | Exact Signature (args -> return) | Expected Behavior | Priority | Timing | Evidence |
|---|---|---|---|---|---|---|---|
| CS1 | `src/core/bubble/metaReviewGate.ts` | autonomous gate routing + diagnostics | `applyMetaReviewGateOnConvergence(...) -> Promise<MetaReviewGateResult>` | Emit deterministic route diagnostics and reason-code coverage for all terminal branches used in rollout validation | P1 | required-now | T1,T2,T3,T4 |
| CS2 | `src/core/runtime/agentCommand.ts` | worker shell bootstrap contract | `buildAgentCommand(input) -> string` | Ensure worker command context is pinned to bubble worktree and supports deterministic local CLI path usage for Pairflow commands | P1 | required-now | T5,T6 |
| CS3 | `src/core/runtime/tmuxDelivery.ts` | protocol guidance output | `emitTmuxDeliveryNotification(...) -> Promise<...>` | Delivery guidance and command hints must stay aligned with deterministic worktree execution contract | P1 | required-now | T5,T7 |
| CS4 | `src/core/runtime/startupReconciler.ts` | restart recovery | `reconcileRuntimeSessions(...) -> Promise<...>` | Restart/reconcile must preserve valid progression for `META_REVIEW_RUNNING` and `READY_FOR_HUMAN_APPROVAL` without dead session drift | P1 | required-now | T8,T9 |
| CS5 | `src/core/ui/server.ts`, `src/core/ui/router.ts` | UI integration surface | UI server/router handlers | E2E UI data flow must preserve lifecycle + actor + recommendation visibility after restart and list/status refresh | P2 | required-now | T10,T11 |
| CS6 | `src/core/metrics/bubbleEvents.ts`, `src/core/metrics/report/report.ts` | rollout observability | metrics event/report paths | Record and report events sufficient to validate rollout gates (auto-rework hit, human-gate reached, fallback reasons) | P2 | required-now | T12,T13 |
| CS7 | `docs/meta-review-gate-rollout-runbook.md` | operator runbook | markdown document | Provide deterministic go/no-go checklist, smoke commands, expected outputs, and rollback steps | P1 | required-now | T14 |
| CS8 | `docs/meta-review-gate-e2e-validation.md` | validation evidence template | markdown document | Provide canonical evidence matrix mapping ACs to commands/logs/tests for release sign-off | P1 | required-now | T15 |

### 2) Data and Interface Contract

| Contract | Current | Target | Required Fields | Optional Fields | Compatibility | Priority | Timing |
|---|---|---|---|---|---|---|---|
| E2E lifecycle traceability | branch behavior is covered by unit/integration slices | full-loop E2E contract | route outcome, lifecycle state, round, recommendation, reason code | verbose diagnostics payload | additive | P1 | required-now |
| Runtime command-path determinism | worker runs from bubble worktree but may call stale global binary | explicit worktree-local command contract | deterministic command entrypoint resolution for Pairflow operations in worker context | fallback warning text | behavior hardening | P1 | required-now |
| Restart/reconcile continuity | state-level support exists | rollout-grade recovery guarantees | no invalid downgrade, no orphaned active runtime session, no wrong-role recovery | warning metadata | additive | P1 | required-now |
| Rollout observability | core metrics event system exists | meta-review rollout gate observability | events for autonomous run route, auto-rework dispatch, human-gate entry, fallback reason | duration/summary fields | additive | P2 | required-now |
| Ops docs contract | no dedicated phase3e runbook/evidence template | explicit runbook + evidence spec | go/no-go checks, rollback procedure, evidence checklist | optional troubleshooting appendix | additive | P1 | required-now |

Command-path policy (required-now):
1. Worker-initiated Pairflow actions used in protocol guidance must resolve against the bubble worktree build path deterministically.
2. If deterministic local resolution is unavailable, the system must emit an explicit warning and keep human-gate-safe behavior.
3. Phase 3e rollout cannot be marked ready while stale global-binary execution can alter convergence behavior.

### 3) Side Effects Contract

| Area | Allowed | Forbidden | Notes | Priority | Timing |
|---|---|---|---|---|---|
| E2E validation code | Add/adjust tests and deterministic diagnostics | Change recommendation model semantics | Validation slice only | P1 | required-now |
| Runtime command path | Harden command entrypoint/guidance for determinism | Silent fallback to unknown global binary | Must be observable | P1 | required-now |
| Rollout docs | Add runbook and evidence template | Implicit rollout assumptions without checklist | Ops clarity is mandatory | P1 | required-now |
| Metrics/reporting | Add event/report checks for rollout gates | Hidden analytics dependencies for core routing | Keep best-effort event semantics | P2 | required-now |

### 4) Error and Fallback Contract

| Trigger | Dependency (if any) | Behavior (`throw|result|fallback`) | Fallback Value/Action | Reason Code | Log Level | Priority | Timing |
|---|---|---|---|---|---|---|---|
| Autonomous run fails in E2E path | `runMetaReview` | fallback | route to `READY_FOR_HUMAN_APPROVAL`, persist inconclusive/error snapshot | `META_REVIEW_GATE_RUN_FAILED` | warn | P1 | required-now |
| Auto-rework dispatch failure | request-rework dispatch path | fallback | route to `READY_FOR_HUMAN_APPROVAL`, no counter increment | `META_REVIEW_GATE_REWORK_DISPATCH_FAILED` | warn | P1 | required-now |
| Worker command path resolves stale binary | runtime command resolution | result + warning | fail rollout-readiness gate; continue fail-safe lifecycle behavior | `PAIRFLOW_COMMAND_PATH_STALE` | warn | P1 | required-now |
| Restart reconciliation mismatch | runtime/session registry | throw | preserve current state and require manual intervention via runbook | `RUNTIME_RECONCILE_STATE_MISMATCH` | warn | P2 | required-now |
| Missing rollout evidence item | docs validation/checklist runner | result | mark rollout gate as not ready with missing-item list | `ROLL_OUT_EVIDENCE_INCOMPLETE` | info | P2 | required-now |

### 5) Dependency Constraints

| Type | Items | Priority | Timing |
|---|---|---|---|
| must-use | Existing Phase 1-3 contracts as baseline (no semantic rewrite in 3e) | P1 | required-now |
| must-use | Existing CAS/lock state writes and transcript-first recovery semantics | P1 | required-now |
| must-use | Existing UI/server integration and runtime reconciler infrastructure | P1 | required-now |
| must-not-use | New lifecycle states for phase3e | P1 | required-now |
| must-not-use | Auto-approve path introduction | P1 | required-now |
| must-not-use | Rollout sign-off without explicit evidence mapping | P1 | required-now |

### 6) Test Matrix

| ID | Scenario | Given | When | Then | Priority | Timing | Evidence |
|---|---|---|---|---|---|---|---|
| T1 | Full auto-rework loop to human gate | recommendation sequence includes `rework` until budget exhaustion | run end-to-end convergence cycles | each eligible cycle auto-dispatches rework until limit, then routes to `READY_FOR_HUMAN_APPROVAL` | P1 | required-now | automated test |
| T2 | Sticky human gate direct bypass | bubble already has `sticky_human_gate=true` | emit converged | autonomous run is skipped and route goes directly to `READY_FOR_HUMAN_APPROVAL` | P1 | required-now | automated test |
| T3 | Inconclusive/run-failed fail-safe | runner fails or returns inconclusive | apply gate | route is human gate with deterministic reason code and snapshot data | P1 | required-now | automated test |
| T4 | No auto-approve invariant in E2E | any autonomous route outcome | complete gate path | no autonomous branch reaches `APPROVED_FOR_COMMIT` | P1 | required-now | automated test |
| T5 | Worker command-path determinism (positive) | worker pane in bubble worktree | issue protocol command sequence | command execution resolves to worktree-local Pairflow build path | P1 | required-now | automated/integration test |
| T6 | Worker command-path stale detection (negative) | stale global binary would be selected | run validation check | deterministic warning/reason emitted and rollout gate fails closed | P1 | required-now | automated test |
| T7 | tmux delivery guidance consistency | delivery emits command guidance lines | parse emitted guidance | guidance remains aligned with deterministic command-path contract | P2 | required-now | automated test |
| T8 | Restart recovery while `META_REVIEW_RUNNING` | bubble + runtime session interrupted mid-run | startup reconcile | valid recovery or explicit manual-intervention signal, no invalid state mutation | P1 | required-now | automated test |
| T9 | Restart recovery while `READY_FOR_HUMAN_APPROVAL` | bubble awaiting human decision | startup reconcile | state and pending approval intent remain intact | P1 | required-now | automated test |
| T10 | UI server list/status parity after restart | bubbles in meta-review states | reload UI server endpoints | state/actor/recommendation fields remain consistent | P2 | required-now | integration test |
| T11 | UI action safety in human-gate state | bubble in `READY_FOR_HUMAN_APPROVAL` | trigger approve/rework action paths | action availability and payload contract remain valid post-restart | P2 | required-now | integration test |
| T12 | Metrics event emission for rollout gates | autonomous routes executed | inspect metrics events | required event types for run route and fallback reasons are emitted | P2 | required-now | automated test |
| T13 | Metrics report includes meta-review rollout signals | event logs exist | run metrics report | report contains expected aggregates used by rollout checklist | P2 | required-now | automated test |
| T14 | Runbook command correctness | rollout runbook commands | execute smoke checklist | commands are valid and expected outputs match documented assertions | P1 | required-now | manual + scripted evidence |
| T15 | Evidence template completeness | AC list and tests/docs/logs | fill template for validation run | each AC maps to test or command/log evidence without gaps | P1 | required-now | docs review |

## Acceptance Criteria (Binary)

1. AC1: Full lifecycle E2E path (auto-rework loops + human gate) is covered and deterministic.
2. AC2: Sticky human gate bypass behavior is validated in E2E form, not only unit slices.
3. AC3: Autonomous failure branches are fail-safe and auditable in E2E validation.
4. AC4: No autonomous branch can approve.
5. AC5: Worker command-path determinism is enforced or explicitly guarded with rollout-blocking warning.
6. AC6: Restart/reconcile behavior is validated for meta-review-specific states.
7. AC7: UI list/detail/action surfaces remain coherent after restart and state refresh.
8. AC8: Rollout metrics/events needed for go/no-go checks are validated.
9. AC9: Runbook exists with concrete smoke, rollback, and incident steps.
10. AC10: Evidence template exists and maps ACs to verifiable artifacts.

### AC-Test Traceability

| AC | Covered by Tests |
|---|---|
| AC1 | T1 |
| AC2 | T2 |
| AC3 | T3 |
| AC4 | T4 |
| AC5 | T5,T6,T7 |
| AC6 | T8,T9 |
| AC7 | T10,T11 |
| AC8 | T12,T13 |
| AC9 | T14 |
| AC10 | T15 |

## L2 - Implementation Notes (Optional)

1. [later-hardening] Add a dedicated `pairflow doctor` check for command-path determinism.
2. [later-hardening] Add replayable e2e fixture snapshots for regression triage.
3. [later-hardening] Add dashboard-backed rollout gate automation once metrics pipeline is stable.

## Hardening Backlog

| ID | Item | Layer | Priority | Timing | Source | Proposed Action |
|---|---|---|---|---|---|---|
| H1 | Automate rollout runbook checks into CI/nightly pipeline | L2 | P3 | later-hardening | rollout operations | Add scripted go/no-go workflow after phase3e merge |
| H2 | Add command-path health check command for workers | L1 | P3 | later-hardening | runtime incident learnings | Implement explicit `pairflow diagnostics command-path` check |
| H3 | Add richer meta-review rollout metric dashboard | L2 | P3 | later-hardening | observability | Build report-to-dashboard bridge after baseline collection |

## Review Control

1. Every finding must include: `priority`, `timing`, `layer`, `evidence`.
2. Max 2 L1 hardening rounds before implementation handoff.
3. New `required-now` after round 2 is allowed only with evidence-backed `P0/P1`.
4. Items outside Phase 3e contract are tagged `later-hardening`.
5. Because `contract_boundary_override=yes`, `plan_ref` is mandatory and must remain non-null.

## Spec Lock

Mark this task artifact `IMPLEMENTABLE` when all are true:
1. AC1-AC10 have deterministic text and AC-test traceability.
2. Rollout runbook and evidence template are both present and internally consistent with contracts.
3. Command-path determinism guard is explicit and testable.
4. Implementation execution phase can produce reproducible evidence for all rollout gates.

