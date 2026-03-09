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
plan_ref: plans/archive/tasks/meta-review-gate/meta-review-gate-plan-v1.md
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
| CS1 | `src/core/bubble/metaReviewGate.ts` | autonomous gate routing + diagnostics | `applyMetaReviewGateOnConvergence(...) -> Promise<MetaReviewGateResult>` | Emit deterministic route diagnostics and reason-code coverage for all terminal branches used in rollout validation | P1 | required-now | T1,T2,T3,T4,T16,T17 |
| CS2 | `src/core/runtime/agentCommand.ts` | worker shell bootstrap contract | `buildAgentCommand(input) -> string` | Ensure worker command context is pinned to bubble worktree and supports deterministic local CLI path usage for Pairflow commands | P1 | required-now | T5,T6,T18 |
| CS3 | `src/core/runtime/tmuxDelivery.ts` | protocol guidance output | `emitTmuxDeliveryNotification(...) -> Promise<...>` | Delivery guidance and command hints must stay aligned with deterministic worktree execution contract | P1 | required-now | T5,T7 |
| CS4 | `src/core/runtime/startupReconciler.ts` | restart recovery | `reconcileRuntimeSessions(...) -> Promise<...>` | Restart/reconcile must preserve valid progression for `META_REVIEW_RUNNING` and `READY_FOR_HUMAN_APPROVAL` without dead session drift | P1 | required-now | T8,T9,T18 |
| CS5 | `src/core/ui/server.ts`, `src/core/ui/router.ts` | UI integration surface | UI server/router handlers | E2E UI data flow must preserve lifecycle + actor + recommendation visibility after restart and list/status refresh; correctness/regression scope only (no UI redesign) | P2 | required-now | T10,T11 |
| CS6 | `src/core/metrics/bubbleEvents.ts`, `src/core/metrics/report/report.ts` | rollout observability | metrics event/report paths | Record and report events sufficient to validate rollout gates (auto-rework hit, human-gate reached, fallback reasons) | P2 | required-now | T12,T13 |
| CS7 | `docs/meta-review-gate-rollout-runbook.md` | operator runbook | markdown document | Provide deterministic go/no-go checklist, smoke commands, expected outputs, rollback steps, and minimum T14 artifact bundle definition (command list, expected markers, rollback rehearsal note, operator context) | P1 | required-now | T14 |
| CS8 | `docs/meta-review-gate-e2e-validation.md` | validation evidence template | markdown document | Provide canonical evidence matrix mapping ACs to commands/logs/tests for release sign-off and declare authoritative rollout-readiness gate owner + decision source for stale command path | P1 | required-now | T15 |

### 2) Data and Interface Contract

| Contract | Current | Target | Required Fields | Optional Fields | Compatibility | Priority | Timing |
|---|---|---|---|---|---|---|---|
| E2E lifecycle traceability | branch behavior is covered by unit/integration slices | full-loop E2E contract | route outcome, lifecycle state, round, recommendation, reason code | verbose diagnostics payload | additive | P1 | required-now |
| Runtime command-path determinism | worker runs from bubble worktree but may call stale global binary | explicit worktree-local command contract | deterministic command entrypoint resolution for Pairflow operations in worker context | fallback warning text | behavior hardening | P1 | required-now |
| Restart/reconcile continuity | state-level support exists | rollout-grade recovery guarantees | no invalid downgrade, no orphaned active runtime session, no wrong-role recovery | warning metadata | additive | P1 | required-now |
| Rollout observability | core metrics event system exists | meta-review rollout gate observability | events for autonomous run route, auto-rework dispatch, human-gate entry, fallback reason | duration/summary fields | additive | P2 | required-now |
| Ops docs contract | no dedicated phase3e runbook/evidence template | explicit runbook + evidence spec | go/no-go checks, rollback procedure, evidence checklist | optional troubleshooting appendix | additive | P1 | required-now |
| Rollout gate ownership | decision authority is implied across docs/metrics text | explicit single-owner rollout gate contract | `rollout_readiness_gate_owner`, `rollout_readiness_decision_source`, `blocking_reason_codes` (`PAIRFLOW_COMMAND_PATH_STALE`, `ROLLOUT_EVIDENCE_INCOMPLETE`, `META_REVIEW_RUNNER_ERROR`) | escalation contact | behavior hardening | P1 | required-now |

Command-path policy (required-now):
1. Worker-initiated Pairflow actions used in protocol guidance must resolve against the bubble worktree build path deterministically.
2. If deterministic local resolution is unavailable, the system must emit an explicit warning and keep human-gate-safe behavior.
3. Phase 3e rollout cannot be marked ready while stale global-binary execution can alter convergence behavior.
4. Authoritative rollout-readiness decision owner must be declared in CS8 evidence-template contract and referenced by CS7 runbook go/no-go checklist.

### 3) Side Effects Contract

| Area | Allowed | Forbidden | Notes | Priority | Timing |
|---|---|---|---|---|---|
| E2E validation code | Add/adjust tests and deterministic diagnostics | Change recommendation model semantics | Validation slice only | P1 | required-now |
| Runtime command path | Harden command entrypoint/guidance for determinism | Silent fallback to unknown global binary | Must be observable | P1 | required-now |
| UI correctness boundary | List/status/action parity validation for restart/meta-review states | Visual redesign, new UX flows, layout restyling | CS5 must remain correctness/regression-only to satisfy Out-of-Scope #3 | P1 | required-now |
| Rollout docs | Add runbook and evidence template | Implicit rollout assumptions without checklist | Ops clarity is mandatory | P1 | required-now |
| Metrics/reporting | Add event/report checks for rollout gates | Hidden analytics dependencies for core routing | Keep best-effort event semantics | P2 | required-now |

### 4) Error and Fallback Contract

| Trigger | Dependency (if any) | Behavior (`throw|result|fallback`) | Fallback Value/Action | Reason Code | Log Level | Priority | Timing |
|---|---|---|---|---|---|---|---|
| Autonomous run fails in E2E path | `runMetaReview` | fallback | route to `READY_FOR_HUMAN_APPROVAL`, persist inconclusive/error snapshot | `META_REVIEW_GATE_RUN_FAILED` | warn | P1 | required-now |
| Auto-rework dispatch failure | request-rework dispatch path | fallback | route to `READY_FOR_HUMAN_APPROVAL`, no counter increment | `META_REVIEW_GATE_REWORK_DISPATCH_FAILED` | warn | P1 | required-now |
| Worker command path resolves stale binary | runtime command resolution | result + warning | fail rollout-readiness gate; continue fail-safe lifecycle behavior | `PAIRFLOW_COMMAND_PATH_STALE` | warn | P1 | required-now |
| Restart reconciliation mismatch | runtime/session registry | throw | preserve current state and require manual intervention via runbook | `META_REVIEW_RECONCILE_STATE_MISMATCH` | warn | P2 | required-now |
| Missing rollout evidence item | docs validation/checklist runner | result | mark rollout gate as not ready with missing-item list | `ROLLOUT_EVIDENCE_INCOMPLETE` | info | P2 | required-now |
| Meta-review runner adapter unavailable | meta-review runner adapter | result + fallback | record `inconclusive/error`, keep lifecycle human-safe, and mark rollout-readiness gate `not ready` until explicit human waiver is logged in runbook | `META_REVIEW_RUNNER_ERROR` | warn | P2 | required-now |

Reason-code rollout classification (explicit, required-now):
1. Blocking by default (must block rollout readiness):
   - `META_REVIEW_GATE_RUN_FAILED`
   - `META_REVIEW_GATE_REWORK_DISPATCH_FAILED`
   - `PAIRFLOW_COMMAND_PATH_STALE`
   - `META_REVIEW_RECONCILE_STATE_MISMATCH`
   - `ROLLOUT_EVIDENCE_INCOMPLETE`
   - `META_REVIEW_RUNNER_ERROR`
2. Advisory codes do not unblock any blocking code; they are informational only.
3. Any unlisted reason code is treated as `blocking` until explicitly classified in this section (fail-closed default).

### 5) Dependency Constraints

| Type | Items | Priority | Timing |
|---|---|---|---|
| must-use | Existing Phase 1-3 contracts as baseline (no semantic rewrite in 3e) | P1 | required-now |
| must-use | Existing CAS/lock state writes and transcript-first recovery semantics | P1 | required-now |
| must-use | Existing UI/server integration and runtime reconciler infrastructure | P1 | required-now |
| must-use | Review finding schema fields `priority`, `timing`, `layer`, `evidence` for every new finding entry in this task context | P1 | required-now |
| must-use | CS5 boundary guard: UI changes remain correctness/regression-only (no redesign semantics) | P1 | required-now |
| must-not-use | New lifecycle states for phase3e | P1 | required-now |
| must-not-use | Auto-approve path introduction | P1 | required-now |
| must-not-use | Rollout sign-off without explicit evidence mapping | P1 | required-now |
| must-not-use | Implicit rollout decision authority (gate owner must be explicit via CS8/Section 7 contract) | P1 | required-now |

Dependency coherence check (required-now):
1. In-scope CS5 UI assertions are constrained to correctness/regression only, so Out-of-Scope UI redesign remains intact.
2. Reason-code set remains fail-safe and auditable with normalized naming families (`META_REVIEW_*`, `PAIRFLOW_*`, `ROLLOUT_*`).
3. Rollout gate ownership is explicit and bound to docs contracts (CS7/CS8), preventing ambiguous go/no-go authority.

### 6) Test Matrix

| ID | Scenario | Given | When | Then | Priority | Timing | Evidence |
|---|---|---|---|---|---|---|---|
| T1 | Full auto-rework loop to human gate | recommendation sequence includes `rework` until budget exhaustion | run end-to-end convergence cycles | each eligible cycle auto-dispatches rework until limit, then routes to `READY_FOR_HUMAN_APPROVAL` | P1 | required-now | automated test |
| T2 | Sticky human gate direct bypass | bubble already has `sticky_human_gate=true` | emit converged | autonomous run is skipped and route goes directly to `READY_FOR_HUMAN_APPROVAL` | P1 | required-now | automated test |
| T3 | Inconclusive/run-failed fail-safe | runner fails or returns inconclusive | apply gate | route is human gate with deterministic reason code and snapshot data | P1 | required-now | automated test |
| T4 | No auto-approve invariant in E2E | any autonomous route outcome | complete gate path | no autonomous branch reaches `APPROVED_FOR_COMMIT` | P1 | required-now | automated test |
| T5 | Worker command-path determinism (positive) | worker pane in bubble worktree | issue protocol command sequence | command execution resolves to worktree-local Pairflow build path | P1 | required-now | automated/integration test |
| T6 | Worker command-path stale detection (negative) | stale global binary would be selected | run validation check | deterministic warning/reason emitted and rollout gate fails closed | P1 | required-now | automated test |
| T7 | tmux delivery guidance consistency | delivery emits command guidance lines | parse emitted guidance | guidance contains explicit worktree-local command-path hint and explicit stale-path fail-closed warning (`PAIRFLOW_COMMAND_PATH_STALE`), and contains no silent-global-fallback wording | P2 | required-now | automated test |
| T8 | Restart recovery while `META_REVIEW_RUNNING` | bubble + runtime session interrupted mid-run | startup reconcile | valid recovery or explicit manual-intervention signal, no invalid state mutation | P1 | required-now | automated test |
| T9 | Restart recovery while `READY_FOR_HUMAN_APPROVAL` | bubble awaiting human decision | startup reconcile | state and pending approval intent remain intact | P1 | required-now | automated test |
| T10 | UI server list/status parity after restart | bubbles in meta-review states | reload UI server endpoints | state/actor/recommendation fields remain consistent | P2 | required-now | integration test |
| T11 | UI action safety in human-gate state | bubble in `READY_FOR_HUMAN_APPROVAL` | trigger approve/rework action paths | action availability and payload contract remain valid post-restart | P2 | required-now | integration test |
| T12 | Metrics event emission for rollout gates | autonomous routes executed | inspect metrics events | required event types for run route and fallback reasons are emitted | P2 | required-now | automated test |
| T13 | Metrics report includes meta-review rollout signals | event logs exist | run metrics report | report contains expected aggregates used by rollout checklist | P2 | required-now | automated test |
| T14 | Runbook command correctness | rollout runbook commands | execute smoke checklist | commands are valid and expected outputs match documented assertions, and minimum artifact bundle is produced: executed command list, raw output extracts with expected markers, rollback rehearsal note, operator context stamp | P1 | required-now | manual + scripted evidence bundle |
| T15 | Evidence template completeness | AC list and tests/docs/logs | fill template for validation run | each AC maps to test or command/log evidence without gaps, and template declares rollout gate owner + pass/fail decision source for `PAIRFLOW_COMMAND_PATH_STALE` | P1 | required-now | docs review |
| T16 | Auto-rework dispatch failure fail-safe trace | rework path is selected but dispatch fails | apply meta-review gate | route stays human-safe, counter does not increment, and reason code is `META_REVIEW_GATE_REWORK_DISPATCH_FAILED` with auditable snapshot | P1 | required-now | automated test |
| T17 | Meta-review runner unavailable fail-safe trace | runner adapter unavailable during autonomous evaluation | apply meta-review gate | result is `inconclusive/error`, lifecycle remains human-safe, reason code is `META_REVIEW_RUNNER_ERROR`, and rollout readiness is blocked by classification table | P1 | required-now | automated test |
| T18 | AC5 x AC6 intersection coverage (determinism after restart) | runtime session restarts while worker command-path determinism check remains required | run startup reconcile then issue worker command path check | post-restart path resolution remains worktree-local or emits `PAIRFLOW_COMMAND_PATH_STALE` fail-closed signal; no silent global fallback | P1 | required-now | automated/integration test |

### 7) Validation Evidence Bundle Contract (CS7/CS8, T14/T15)

Minimum artifact bundle for rollout sign-off:
1. Smoke command execution log set:
   - exact commands executed,
   - raw output snippets containing expected markers,
   - command timestamp + operator context.
2. Command-path determinism proof:
   - positive evidence (`worktree-local entrypoint resolved`) and/or
   - fail-closed evidence with reason code `PAIRFLOW_COMMAND_PATH_STALE`.
3. Rollback rehearsal note:
   - rollback command sequence,
   - execution mode (`dry-run` or executed),
   - observed outcome.
4. AC coverage matrix:
   - AC1-AC10 each mapped to at least one test or command/log evidence item.

Authoritative rollout gate owner contract:
1. Primary owner field: `rollout_readiness_gate_owner` in `docs/meta-review-gate-e2e-validation.md`.
2. Decision source field: `rollout_readiness_decision_source` referencing metrics report + evidence checklist evaluation.
3. Blocking reason-code set (canonical): `META_REVIEW_GATE_RUN_FAILED`, `META_REVIEW_GATE_REWORK_DISPATCH_FAILED`, `PAIRFLOW_COMMAND_PATH_STALE`, `META_REVIEW_RECONCILE_STATE_MISMATCH`, `ROLLOUT_EVIDENCE_INCOMPLETE`, `META_REVIEW_RUNNER_ERROR`.
4. If owner/source fields are missing, rollout readiness is `not ready` by default.
5. `META_REVIEW_RUNNER_ERROR` classification is rollout-blocking by default and requires explicit human waiver entry for go/no-go override.
6. Canonical blocking set for rollout gate is defined in Section 4 classification table; this section must not declare a narrower set.

### 7.1 AC5 x AC6 Intersection Coverage Plan (required-now)

1. Intersection intent: prove command-path determinism guarantees survive restart/reconcile flow.
2. Canonical scenario: T18 (`startup reconcile` -> immediate command-path check).
3. Pass condition:
   - worktree-local command entrypoint remains deterministic after restart, or
   - stale-path detection triggers `PAIRFLOW_COMMAND_PATH_STALE` fail-closed path.
4. Failure condition:
   - any post-restart silent fallback to unknown global binary path.

## Acceptance Criteria (Binary)

1. AC1: Full lifecycle E2E path (auto-rework loops + human gate) is covered and deterministic.
2. AC2: Sticky human gate bypass behavior is validated in E2E form, not only unit slices.
3. AC3: Autonomous failure branches are fail-safe and auditable in E2E validation.
4. AC4: No autonomous branch can approve.
5. AC5: Worker command-path determinism is enforced or explicitly guarded with rollout-blocking warning.
6. AC6: Restart/reconcile behavior is validated for meta-review-specific states.
7. AC7: UI list/detail/action surfaces remain coherent after restart and state refresh; pass iff list/status/action endpoints return identical `lifecycle+actor+recommendation` tuples pre/post restart and reject invalid actions for the current state, fail otherwise.
8. AC8: Rollout metrics/events needed for go/no-go checks are validated.
9. AC9: Runbook exists with concrete smoke, rollback, and incident steps.
10. AC10: Evidence template exists and maps ACs to verifiable artifacts.

### AC-Test Traceability

| AC | Covered by Tests |
|---|---|
| AC1 | T1,T4,T8,T9 |
| AC2 | T2 |
| AC3 | T3,T16,T17 |
| AC4 | T4 |
| AC5 | T5,T6,T7,T18 |
| AC6 | T8,T9,T18 |
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
6. Schema-incomplete finding normalization is deterministic: if any required field is missing, classify as `schema_incomplete`, set `reason_code=REVIEW_SCHEMA_WARNING`, force `timing=later-hardening`, and treat as advisory-only.
7. Schema-incomplete findings cannot create blockers and cannot introduce new `required-now` scope.
8. Reviewer output contract: every non-advisory finding in approval-request handoff must include complete schema (`priority`, `timing`, `layer`, `evidence`).

## Spec Lock

Mark this task artifact `IMPLEMENTABLE` when all are true:
1. AC1-AC10 have deterministic text and AC-test traceability.
2. Rollout runbook and evidence-template requirements are explicit and testable in this task contract (CS7/CS8 + Section 7), and implementation artifacts must satisfy them before rollout sign-off.
3. Command-path determinism guard and rollout decision owner are explicit and testable.
4. Implementation execution phase can produce reproducible evidence for all rollout gates using the minimum artifact bundle contract.
5. Dependency/side-effect coherence checks remain contradiction-free (including CS5 out-of-scope UI boundary).
6. AC3 and AC5xAC6 intersection coverage remain explicitly traceable (`AC3 -> T3,T16,T17`, `AC5/AC6 intersection -> T18`).

## Contract Change Log (Neutral)

This section records persistent, contract-level refinements applied to this artifact (non-round-specific).

Current contract status:
1. No open `P0/P1 required-now` blocker is identified in this document.

| Change ID | Layer | Evidence Anchor | Contract Delta |
|---|---|---|---|
| C1 | L1 error/fallback contract | Error/Fallback table reason-code rows | Normalized reason-code naming to `ROLLOUT_EVIDENCE_INCOMPLETE` and `META_REVIEW_RECONCILE_STATE_MISMATCH`. |
| C2 | L1 test/docs contract | CS7/CS8, T14/T15, Section 7 | Added explicit minimum manual+scripted evidence artifact bundle requirements. |
| C3 | L1 rollout gate ownership | Data/Interface ownership row, command-path policy #4, Section 7 | Unified canonical owner/source field names (`rollout_readiness_gate_owner`, `rollout_readiness_decision_source`) and explicit fail-closed behavior. |
| C4 | L1 meta-review failure handling | Error/Fallback table, Section 7 blocking set | Added explicit contract for `META_REVIEW_RUNNER_ERROR` as rollout-blocking by default with waiver requirement. |
| C5 | L1 dependency coherence | Dependency table + coherence check | Added explicit coherence verification across in-scope/out-of-scope and ownership constraints. |
| C6 | L1 side-effect boundary | Side Effects contract UI boundary row | Locked CS5 to correctness/regression-only UI scope; excluded redesign semantics. |
| C7 | AC traceability | AC-Test traceability table | Expanded AC1 supporting coverage mapping (`T1,T4,T8,T9`). |
| C8 | Review schema control | Review Control rules #6-#8 | Added deterministic handling and reviewer contract for schema-incomplete findings. |
| C9 | L1 reason-code classification | Error/Fallback classification block + Section 7 alignment rule | Added explicit blocking/advisory decision policy with fail-closed default for unlisted reason codes. |
| C10 | AC3 failure-branch traceability | Test matrix rows T16/T17 + AC table | Extended AC3 traceability to full autonomous failure branches (`run_failed`, `rework_dispatch_failed`, `runner_unavailable`). |
| C11 | AC5 x AC6 intersection plan | T18 + Section 7.1 coverage plan + AC table | Added explicit restart-after-determinism coverage plan and traceability (`AC5/AC6 -> T18`). |
| C12 | CS backlink completeness | CS2/CS4 evidence columns + T18 | Added explicit AC5xAC6 intersection backlink in call-site evidence ownership (`CS2`, `CS4` -> `T18`). |
| C13 | Assertion precision | T7 row + AC7 text + Section 7 blocking set | Tightened verifiable assertions for T7 and AC7, and unified Section 7 blocking-code set to canonical Section 4 list. |
