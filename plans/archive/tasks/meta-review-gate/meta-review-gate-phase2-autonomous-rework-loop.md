---
artifact_type: task
artifact_id: task_meta_review_gate_phase2_autonomous_rework_loop_v5
title: "Meta Review Gate - Phase 2 Autonomous Rework Loop"
status: implementable
phase: phase2
target_files:
  - src/types/bubble.ts
  - src/core/state/transitions.ts
  - src/core/state/stateSchema.ts
  - src/core/agent/converged.ts
  - src/core/bubble/metaReview.ts
  - src/core/bubble/metaReviewGate.ts
  - src/core/human/approval.ts
  - src/core/runtime/watchdog.ts
  - src/core/runtime/startupReconciler.ts
  - src/core/bubble/listBubbles.ts
  - src/types/ui.ts
  - src/cli/commands/bubble/approve.ts
  - src/cli/commands/bubble/requestRework.ts
  - tests/core/state/transitions.test.ts
  - tests/core/state/stateSchema.test.ts
  - tests/core/agent/converged.test.ts
  - tests/core/bubble/metaReviewGate.test.ts
  - tests/core/human/approval.test.ts
  - tests/core/runtime/watchdog.test.ts
  - tests/core/runtime/startupReconciler.test.ts
  - tests/core/bubble/listBubbles.test.ts
  - tests/cli/bubbleApproveCommand.test.ts
  - tests/cli/bubbleRequestReworkCommand.test.ts
prd_ref: docs/meta-review-gate-prd.md
plan_ref: plans/archive/tasks/meta-review-gate/meta-review-gate-plan-v1.md
system_context_ref: docs/pairflow-initial-design.md
normative_refs:
  - docs/meta-review-gate-prd.md
  - docs/pairflow-initial-design.md
owners:
  - "felho"
---

# Task: Meta Review Gate - Phase 2 Autonomous Rework Loop

## Revision Log

1. `v2` (docs-refine, meta-review gate): frontmatter promoted to `implementable`, open-question scope converted to explicit decisions, and CLI compatibility text contract clarified so `READY_FOR_HUMAN_APPROVAL` is the canonical emitted state label.
2. `v3` (r2 human quick rework): Spec Lock wording aligned to `implementable` task-artifact convention (spec-ready, not post-implementation), explicit CLI output-label assertion contract bound to test matrix, and legacy `READY_FOR_APPROVAL` compatibility path bound to dedicated test traceability.
3. `v4` (r4 human quick rework): CS2/routing bypass edge made explicit at transition-level with T9/AC7 binding, auto-rework dispatch minimum contract concretized (envelope/sender/precondition) with explicit test mapping, and CAS conflict recovery lifecycle invariant clarified as `no lifecycle change` with dedicated traceability.
4. `v5` (r5 human quick rework): CS5 evidence bookkeeping aligned with sticky-gate bypass traceability (`T9`), and Review Control governance rule clarified with explicit post-round-2 exception path for human-requested docs-contract consistency closures (no scope expansion, deterministic traceability required).
5. `v6` (2026-03-09 post-implementation alignment): actual fail-closed routing clarified as `META_REVIEW_FAILED` for autonomous run execution failures (`META_REVIEW_GATE_RUN_FAILED`), while `inconclusive` remains `READY_FOR_HUMAN_APPROVAL`; lifecycle/test contracts updated accordingly.

## L0 - Policy

### Goal

Implement autonomous rework routing once a bubble converges, using the Phase 1 persisted meta-review snapshot as canonical source.

Phase 2 must:

1. trigger autonomous review on convergence,
2. auto-dispatch rework when recommendation is `rework` and budget allows,
3. route non-auto-rework outcomes to explicit human gate state.

### In Scope

1. Add lifecycle states required by Phase 2 gate routing:
   - `META_REVIEW_RUNNING`
   - `META_REVIEW_FAILED`
   - `READY_FOR_HUMAN_APPROVAL`
2. Trigger meta-review run automatically from convergence path when `sticky_human_gate=false`.
3. Implement auto-rework budget contract:
   - use `meta_review.auto_rework_limit` / `meta_review.auto_rework_count`,
   - increment count only on successful automatic rework dispatch.
4. Implement deterministic lifecycle routing after autonomous run:
   - `rework` + budget available -> auto-rework back to `RUNNING`,
   - `approve` -> `READY_FOR_HUMAN_APPROVAL`,
   - `rework` + exhausted budget -> `READY_FOR_HUMAN_APPROVAL`,
   - `inconclusive` -> `READY_FOR_HUMAN_APPROVAL`,
   - run execution error/fail-closed path -> `META_REVIEW_FAILED`.
5. Set and persist `sticky_human_gate=true` on first entry to human gate state.
6. Update human approval/rework command gate so human decisions operate from `READY_FOR_HUMAN_APPROVAL` in Phase 2.
7. Keep `meta-review status` and `meta-review last-report` read-only contract unchanged.

### Out of Scope

1. Dedicated `meta-reviewer` tmux pane orchestration.
2. UI rendering/styling for new states and role visuals.
3. Non-approve override flag + mandatory reason policy hardening (Phase 3).
4. Historical multi-run autonomous archive beyond Phase 1 single-slot artifacts.
5. New protocol message type introduction (Phase 2 should reuse current protocol envelope model).

### Safety Defaults

1. Never auto-approve; final approval remains human-only.
2. If autonomous run fails at execution level, route fail-closed to `META_REVIEW_FAILED`; if outcome is `inconclusive`, route to `READY_FOR_HUMAN_APPROVAL`.
3. Auto-rework counter must not increase on failed dispatch.
4. Read-only retrieval commands (`status`, `last-report`) must remain non-mutating.
5. Convergence/state/protocol writes must remain CAS-safe with transcript-first recovery semantics.

### Contract Boundary / Blast Radius

1. `contract_boundary_override`: `yes`
2. Impacted boundaries:
   - lifecycle state machine contract,
   - human approval command state precondition contract,
   - autonomous routing contract between convergence and human gate.

## L1 - Change Contract

### 1) Call-site Matrix

| ID   | File                                                                                                                         | Function/Entry                   | Exact Signature (args -> return)                                                  | Insertion Point                                  | Expected Behavior                                                                                                                                                                                                                                                                      | Priority | Timing       | Evidence                 |
| ---- | ---------------------------------------------------------------------------------------------------------------------------- | -------------------------------- | --------------------------------------------------------------------------------- | ------------------------------------------------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------- | ------------ | ------------------------ |
| CS1  | `src/types/bubble.ts`                                                                                                        | lifecycle enum                   | `bubbleLifecycleStates` / `BubbleLifecycleState`                                  | lifecycle type constants                         | Add `META_REVIEW_RUNNING`, `META_REVIEW_FAILED`, and `READY_FOR_HUMAN_APPROVAL` as first-class lifecycle states                                                                                                                                                                         | P1       | required-now | T1,T2                    |
| CS2  | `src/core/state/transitions.ts`                                                                                              | transition graph                 | `canTransition(from, to) -> boolean` and `getAllowedTransitions(from)`            | directed transitions + active runtime states     | Support canonical transitions: `READY_FOR_APPROVAL -> META_REVIEW_RUNNING`, `READY_FOR_APPROVAL -> READY_FOR_HUMAN_APPROVAL` (sticky-gate bypass edge), `META_REVIEW_RUNNING -> RUNNING\|META_REVIEW_FAILED\|READY_FOR_HUMAN_APPROVAL`, `META_REVIEW_FAILED -> RUNNING\|APPROVED_FOR_COMMIT`, `READY_FOR_HUMAN_APPROVAL -> RUNNING\|APPROVED_FOR_COMMIT` | P1       | required-now | T1,T2,T9                 |
| CS3  | `src/core/state/stateSchema.ts`                                                                                              | state validation                 | `validateBubbleStateSnapshot(input) -> ValidationResult<BubbleStateSnapshot>`     | lifecycle validation branch                      | Accept new lifecycle values without breaking legacy states                                                                                                                                                                                                                             | P1       | required-now | T2                       |
| CS4  | `src/core/agent/converged.ts`                                                                                                | convergence path                 | `emitConvergedFromWorkspace(input, deps?) -> Promise<EmitConvergedResult>`        | post-policy success path after transcript append | Replace direct `READY_FOR_APPROVAL` human handoff with Phase 2 gate pipeline trigger                                                                                                                                                                                                   | P1       | required-now | T3,T4,T5                 |
| CS5  | `src/core/bubble/metaReviewGate.ts`                                                                                          | new routing orchestrator         | `applyMetaReviewGateOnConvergence(input, deps?) -> Promise<MetaReviewGateResult>` | new core module                                  | Own deterministic routing from convergence to auto-rework or human gate, including budget and sticky-gate logic, plus explicit auto-rework dispatch contract (envelope/sender/precondition gate)                                                                                       | P1       | required-now | T3,T4,T5,T6,T7,T8,T9,T15 |
| CS6  | `src/core/bubble/metaReview.ts`                                                                                              | run API usage contract           | `runMetaReview(input, deps?) -> Promise<MetaReviewRunResult>`                     | call integration boundary                        | Phase 2 gate must call Phase 1 run service as compute+persistence source-of-truth (no duplicate runner path)                                                                                                                                                                           | P1       | required-now | T3,T6                    |
| CS7  | `src/core/human/approval.ts`                                                                                                 | decision state gate              | `emitApprovalDecision(...)` / `emitRequestRework(...)`                            | state precondition checks + next-state resolver  | Accept human decisions from `READY_FOR_HUMAN_APPROVAL` (Phase 2 gate state), preserve existing behavior for legacy `READY_FOR_APPROVAL` compatibility path                                                                                                                             | P1       | required-now | T9,T10,T14               |
| CS8  | `src/cli/commands/bubble/approve.ts`                                                                                         | approve command surface          | `runBubbleApproveCommand(args, cwd?) -> Promise<...>`                             | command error/help contract                      | Error/help text must reflect `READY_FOR_HUMAN_APPROVAL` as valid approval state and remain canonical in new user-facing outputs                                                                                                                                                        | P2       | required-now | T10,T14                  |
| CS9  | `src/cli/commands/bubble/requestRework.ts`                                                                                   | request-rework command surface   | `runBubbleRequestReworkCommand(args, cwd?) -> Promise<...>`                       | command error/help contract                      | Error/help text must reflect `READY_FOR_HUMAN_APPROVAL` as valid revise source state and remain canonical in new user-facing outputs                                                                                                                                                   | P2       | required-now | T10,T14                  |
| CS10 | `src/core/runtime/watchdog.ts`, `src/core/runtime/startupReconciler.ts`, `src/core/bubble/listBubbles.ts`, `src/types/ui.ts` | runtime expected-state contracts | `computeWatchdogStatus`, `reconcileRuntimeSessions`, list state counters          | tracked/expected state sets                      | Treat new lifecycle states (`META_REVIEW_RUNNING`, `META_REVIEW_FAILED`, `READY_FOR_HUMAN_APPROVAL`) as valid active runtime states where applicable; no stale-session false positives solely because of new state values                                                              | P2       | required-now | T11                      |
| CS11 | `src/core/bubble/listBubbles.ts`                                                                                             | by-state schema                  | `BubbleListStateCounts`                                                           | counters + output                                | Include counts for new states to keep API shape coherent                                                                                                                                                                                                                               | P2       | required-now | T11                      |
| CS12 | tests                                                                                                                        | coverage                         | `N/A`                                                                             | listed test files                                | Cover trigger, budget, fallback, sticky-gate, dispatch contract, CAS-conflict lifecycle invariant, command-gate, output-label contract, and compatibility invariants                                                                                                                   | P1       | required-now | T1-T16                   |

### 2) Data and Interface Contract

| Contract                      | Current                                                                | Target                                                                                | Required Fields                                                                                                                                                                                                                             | Optional Fields                                                    | Compatibility                              | Priority | Timing       |
| ----------------------------- | ---------------------------------------------------------------------- | ------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------ | ------------------------------------------ | -------- | ------------ |
| Lifecycle states              | No meta-review-specific lifecycle states                               | Add `META_REVIEW_RUNNING`, `READY_FOR_HUMAN_APPROVAL`                                 | state value in lifecycle enum/validation/transitions                                                                                                                                                                                        | N/A                                                                | additive                                   | P1       | required-now |
| Autonomous gate trigger       | Convergence always transitions to `READY_FOR_APPROVAL` + human request | Convergence triggers autonomous gate pipeline first                                   | converged round context + bubble id + state snapshot                                                                                                                                                                                        | refs/summary metadata                                              | behavior change                            | P1       | required-now |
| Auto-rework budget            | `meta_review` counters exist (Phase 1) but no routing semantics        | Counters drive auto-rework eligibility                                                | `auto_rework_count`, `auto_rework_limit`                                                                                                                                                                                                    | N/A                                                                | behavior activation                        | P1       | required-now |
| Counter increment rule        | not active                                                             | increment only on successful automatic rework dispatch                                | successful dispatch proof path                                                                                                                                                                                                              | N/A                                                                | behavior activation                        | P1       | required-now |
| Sticky human gate             | stored but not enforced in routing                                     | once human gate reached, set/use `sticky_human_gate=true` for subsequent convergences | `sticky_human_gate`                                                                                                                                                                                                                         | N/A                                                                | behavior activation                        | P1       | required-now |
| Human decision gate state     | human approve/rework expects `READY_FOR_APPROVAL`                      | human decision commands accept `READY_FOR_HUMAN_APPROVAL` as canonical gate state     | valid state precondition                                                                                                                                                                                                                    | legacy `READY_FOR_APPROVAL` compatibility accepted in Phase 2      | behavior change + compat                   | P1       | required-now |
| Human-gate CLI output label   | legacy terminology may still appear in older command text              | canonical user-facing label is `READY_FOR_HUMAN_APPROVAL`                             | canonical label in success/help/error output for new Phase 2 flows                                                                                                                                                                          | legacy label accepted only as backward-compatible input/state path | behavior clarification + compat            | P1       | required-now |
| Auto-rework dispatch contract | auto-dispatch path described only as routing result                    | deterministic dispatch contract before `RUNNING` handoff                              | envelope type=`APPROVAL_DECISION` (rework intent), sender metadata `payload.metadata.actor=\"meta-review-gate\"`, precondition gate (`recommendation=rework`, budget available, `sticky_human_gate=false`, lifecycle=`META_REVIEW_RUNNING`) | optional operator-facing summary metadata                          | behavior hardening + deterministic handoff | P1       | required-now |
| Protocol envelope type usage  | existing types only                                                    | keep existing types; no new protocol type required                                    | existing `APPROVAL_REQUEST`/`APPROVAL_DECISION` envelopes remain valid                                                                                                                                                                      | metadata extension under `payload.metadata`                        | backward-compatible by schema              | P2       | required-now |

Routing contract (required-now):

1. On convergence with `sticky_human_gate=false`, autonomous gate path runs before human approval request handling.
2. `recommendation=rework` and `auto_rework_count < auto_rework_limit`:
   - dispatch automatic revise,
   - increment counter exactly by 1,
   - transition to `RUNNING` with round increment and implementer handoff.
3. `recommendation=approve` routes to `READY_FOR_HUMAN_APPROVAL` and sets `sticky_human_gate=true`.
4. `recommendation=rework` with exhausted budget routes to `READY_FOR_HUMAN_APPROVAL` and sets `sticky_human_gate=true`.
5. `recommendation=inconclusive` or runtime error routes to `READY_FOR_HUMAN_APPROVAL` and sets `sticky_human_gate=true`.
6. If `sticky_human_gate=true` already, convergence must bypass autonomous run and route directly to `READY_FOR_HUMAN_APPROVAL`.
   - required transition edge: `READY_FOR_APPROVAL -> READY_FOR_HUMAN_APPROVAL` (bypass path),
   - traceability gate: `T9 -> AC7`.
7. Phase 2 does not auto-approve under any branch.

Human-gate text compatibility contract (required-now):

1. New CLI success/help output MUST use `READY_FOR_HUMAN_APPROVAL` as the canonical human-gate label.
2. Legacy `READY_FOR_APPROVAL` remains accepted only as backward-compatible input/state handling path and must not become the preferred label in new Phase 2 operator guidance.
3. Verification binding:
   - canonical output-label assertion is covered by `T10`,
   - legacy acceptance-path assertion is covered by `T14`.

Auto-rework dispatch minimum contract (required-now):

1. Envelope contract: successful autonomous auto-rework dispatch MUST emit `APPROVAL_DECISION` envelope in existing protocol model with rework intent payload.
2. Sender contract: envelope metadata MUST mark autonomous actor as `payload.metadata.actor="meta-review-gate"` and must not claim human origin.
3. Precondition gate: dispatch is allowed only when all are true: `recommendation=rework`, `auto_rework_count < auto_rework_limit`, `sticky_human_gate=false`, lifecycle currently `META_REVIEW_RUNNING`.
4. Verification binding: dispatch contract assertions are covered by `T15 -> AC13`.

### 3) Side Effects Contract

| Area                  | Allowed                                                          | Forbidden                                                  | Notes                                              | Priority | Timing       |
| --------------------- | ---------------------------------------------------------------- | ---------------------------------------------------------- | -------------------------------------------------- | -------- | ------------ |
| Lifecycle mutation    | Transition through new Phase 2 states according to routing rules | direct jump to `APPROVED_FOR_COMMIT` from autonomous logic | human-only final approval must hold                | P1       | required-now |
| Transcript/inbox      | Append auditable envelopes for autonomous routing decisions      | silent state-only transitions without protocol trace       | keep operator observability and recovery semantics | P1       | required-now |
| Meta-review execution | call `runMetaReview` once per eligible convergence               | parallel duplicate run for same convergence event          | avoid double counting / race                       | P1       | required-now |
| Counter persistence   | increment `auto_rework_count` only on successful auto-dispatch   | increment on failed dispatch/run errors                    | strict budget accounting                           | P1       | required-now |
| Read commands         | keep `meta-review status` / `last-report` read-only              | hidden writes in read paths                                | Phase 1 contract must stay intact                  | P1       | required-now |

Constraint: autonomous gate must be deterministic for identical input snapshot + run output; no hidden state mutation outside explicit state/protocol writes.

### 4) Error and Fallback Contract

| Trigger                                                  | Dependency (if any)            | Behavior (`throw\|result\|fallback`) | Fallback Value/Action                                                                                                                                   | Reason Code                               | Log Level | Priority | Timing       |
| -------------------------------------------------------- | ------------------------------ | ------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------- | --------- | -------- | ------------ |
| Autonomous run invocation fails                          | `runMetaReview`                | fallback                             | route to `READY_FOR_HUMAN_APPROVAL`, set sticky gate true, keep system operable                                                                         | `META_REVIEW_GATE_RUN_FAILED`             | warn      | P1       | required-now |
| Auto-rework dispatch fails after `rework` recommendation | approval/rework dispatch path  | fallback                             | do not increment counter, route to `READY_FOR_HUMAN_APPROVAL`, set sticky gate true                                                                     | `META_REVIEW_GATE_REWORK_DISPATCH_FAILED` | warn      | P1       | required-now |
| Counter update CAS conflict                              | state store                    | throw                                | fail command with conflict error; no partial commit after conflict point; lifecycle invariants require `no lifecycle change` from pre-conflict snapshot | `META_REVIEW_GATE_STATE_CONFLICT`         | warn      | P1       | required-now |
| New-state transition mismatch                            | lifecycle transition validator | throw                                | explicit state-transition error, no silent remap                                                                                                        | `META_REVIEW_GATE_TRANSITION_INVALID`     | error     | P1       | required-now |
| Human decision attempted from unsupported state          | approval command path          | throw                                | explicit precondition error                                                                                                                             | `APPROVAL_STATE_INVALID`                  | info      | P2       | required-now |

### 5) Dependency Constraints

| Type         | Items                                                                                | Priority | Timing       |
| ------------ | ------------------------------------------------------------------------------------ | -------- | ------------ |
| must-use     | Phase 1 `runMetaReview` as single autonomous execution+persistence boundary          | P1       | required-now |
| must-use     | Existing state CAS write path (`writeStateSnapshot` with expected fingerprint/state) | P1       | required-now |
| must-use     | Existing convergence policy validation (no bypass) before autonomous gate trigger    | P1       | required-now |
| must-not-use | New protocol message types in Phase 2                                                | P2       | required-now |
| must-not-use | Auto-approval branch                                                                 | P1       | required-now |
| must-not-use | Mutable side effects in `meta-review status` / `meta-review last-report`             | P1       | required-now |

### 6) Test Matrix

| ID  | Scenario                                             | Given                                                                                                 | When                                                                     | Then                                                                                                                                                                         | Priority | Timing       | Evidence       |
| --- | ---------------------------------------------------- | ----------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------- | ------------ | -------------- |
| T1  | Lifecycle enum + transitions include Phase 2 states  | baseline state machine                                                                                | validate transitions                                                     | `META_REVIEW_RUNNING`, `META_REVIEW_FAILED`, and `READY_FOR_HUMAN_APPROVAL` are accepted and routed as specified                                                          | P1       | required-now | automated test |
| T2  | State schema accepts new lifecycle states            | state snapshots using new states                                                                      | schema validate                                                          | validation success for valid payloads including `META_REVIEW_FAILED`                                                                                                         | P1       | required-now | automated test |
| T3  | Convergence triggers autonomous run                  | reviewer convergence in eligible state, sticky=false                                                  | run converged path                                                       | autonomous gate is invoked (not direct human approval request path)                                                                                                          | P1       | required-now | automated test |
| T4  | Auto-rework success path                             | recommendation=`rework`, budget available, dispatch succeeds                                          | convergence -> gate                                                      | transition to `RUNNING`, round increments, counter increments by 1                                                                                                           | P1       | required-now | automated test |
| T5  | Rework with exhausted budget                         | recommendation=`rework`, `auto_rework_count >= auto_rework_limit`                                     | convergence -> gate                                                      | transition to `READY_FOR_HUMAN_APPROVAL`, sticky gate true, no counter increment                                                                                             | P1       | required-now | automated test |
| T6  | Approve recommendation path                          | recommendation=`approve`                                                                              | convergence -> gate                                                      | transition to `READY_FOR_HUMAN_APPROVAL`, sticky gate true, no auto-approve                                                                                                  | P1       | required-now | automated test |
| T7  | Inconclusive vs run-error fallback split             | recommendation=`inconclusive` or run execution failure                                                | convergence -> gate                                                      | `inconclusive` routes to `READY_FOR_HUMAN_APPROVAL`; run execution failure routes fail-closed to `META_REVIEW_FAILED`; sticky gate handling remains deterministic          | P1       | required-now | automated test |
| T8  | Auto-dispatch failure fallback                       | recommendation=`rework`, budget available, dispatch fails                                             | convergence -> gate                                                      | fallback to `READY_FOR_HUMAN_APPROVAL`, sticky true, counter unchanged                                                                                                       | P1       | required-now | automated test |
| T9  | Sticky-gate bypass path                              | `sticky_human_gate=true` before convergence                                                           | converged command                                                        | autonomous run skipped, direct route to `READY_FOR_HUMAN_APPROVAL`                                                                                                           | P1       | required-now | automated test |
| T10 | Human command gate canonical + output-label contract | bubble in `READY_FOR_HUMAN_APPROVAL`                                                                  | run `bubble approve` / `bubble request-rework` in text/help output paths | commands accepted, state transitions valid, and canonical label `READY_FOR_HUMAN_APPROVAL` appears in user-facing output/help for Phase 2 flows                              | P1       | required-now | automated test |
| T11 | Runtime/list compatibility with new states           | bubble/runtime registry in new states                                                                 | list/status/watchdog/startup reconcile                                   | no stale false positives; by-state counters include new states                                                                                                               | P2       | required-now | automated test |
| T12 | No auto-approve invariant                            | autonomous gate branches                                                                              | evaluate terminal action                                                 | none of the autonomous branches produce `APPROVED_FOR_COMMIT`                                                                                                                | P1       | required-now | automated test |
| T13 | Phase 1 read-only regression guard                   | existing snapshot state/artifacts                                                                     | call `meta-review status`/`last-report`                                  | zero mutation side effect retained after Phase 2 wiring                                                                                                                      | P1       | required-now | automated test |
| T14 | Legacy human-gate compatibility path                 | legacy bubble snapshot/state in `READY_FOR_APPROVAL`                                                  | run `bubble approve` / `bubble request-rework`                           | command precondition accepts legacy state path, transition behavior remains valid, and canonical guidance label remains `READY_FOR_HUMAN_APPROVAL`                           | P1       | required-now | automated test |
| T15 | Auto-rework dispatch contract assertions             | `recommendation=rework`, budget available, `sticky_human_gate=false`, lifecycle=`META_REVIEW_RUNNING` | convergence -> gate auto-dispatch path                                   | emitted envelope type is `APPROVAL_DECISION` (rework intent), sender metadata actor is `meta-review-gate`, and dispatch executes only with declared precondition gate        | P1       | required-now | automated test |
| T16 | CAS conflict lifecycle invariant                     | CAS conflict occurs on counter/state write in gate path                                               | convergence -> gate write attempt                                        | command fails with `META_REVIEW_GATE_STATE_CONFLICT`, lifecycle remains unchanged from pre-conflict snapshot (`no lifecycle change`), and audit log contains conflict reason | P1       | required-now | automated test |

## Acceptance Criteria (Binary)

1. AC1: Lifecycle model supports `META_REVIEW_RUNNING`, `META_REVIEW_FAILED`, and `READY_FOR_HUMAN_APPROVAL` with valid transition rules.
2. AC2: Convergence path triggers autonomous gate when `sticky_human_gate=false`.
3. AC3: `rework + budget available` auto-dispatches revise and returns loop to `RUNNING`.
4. AC4: Auto-rework counter increments only on successful automatic dispatch.
5. AC5: `approve`, `rework+budget exhausted`, and `inconclusive` route to `READY_FOR_HUMAN_APPROVAL`, while run execution errors route fail-closed to `META_REVIEW_FAILED`.
6. AC6: First route to human gate sets `sticky_human_gate=true`.
7. AC7: When sticky gate is true, subsequent convergences bypass autonomous run.
8. AC8: Human approve/request-rework commands operate from `READY_FOR_HUMAN_APPROVAL` in Phase 2, and canonical Phase 2 output/help label is `READY_FOR_HUMAN_APPROVAL`.
9. AC9: No autonomous branch can auto-approve.
10. AC10: Runtime/list/watchdog/startup reconciliation remains coherent with new states.
11. AC11: `meta-review status` and `meta-review last-report` remain read-only.
12. AC12: Legacy `READY_FOR_APPROVAL` remains accepted as backward-compatible human decision path without replacing canonical `READY_FOR_HUMAN_APPROVAL` label guidance.
13. AC13: Autonomous auto-rework dispatch uses explicit minimum contract (envelope=`APPROVAL_DECISION`, actor metadata=`meta-review-gate`, strict precondition gate) before returning to `RUNNING`.
14. AC14: CAS conflict in gate write path enforces `no lifecycle change` invariant and auditable conflict reason output.

### AC-Test Traceability

| AC   | Covered by Tests |
| ---- | ---------------- |
| AC1  | T1,T2            |
| AC2  | T3               |
| AC3  | T4               |
| AC4  | T4,T8            |
| AC5  | T5,T6,T7         |
| AC6  | T5,T6,T7         |
| AC7  | T9               |
| AC8  | T10              |
| AC9  | T6,T12           |
| AC10 | T11              |
| AC11 | T13              |
| AC12 | T14              |
| AC13 | T15              |
| AC14 | T16              |

## L2 - Implementation Notes (Optional)

1. [later-hardening] Consider explicit autonomous routing artifact (`meta-review-routing-last.json`) to simplify incident debugging.
2. [later-hardening] Consider separating auto-dispatch protocol envelope (`APPROVAL_DECISION` reuse) into dedicated message type only if audit pressure justifies protocol expansion.
3. [later-hardening] Consider idempotency key for convergence-triggered meta-review to harden against duplicate invocations.

## Hardening Backlog

| ID  | Item                                                                                | Layer | Priority | Timing          | Source                               | Proposed Action                                                                 |
| --- | ----------------------------------------------------------------------------------- | ----- | -------- | --------------- | ------------------------------------ | ------------------------------------------------------------------------------- |
| H1  | Add dedicated autonomous-routing artifact for forensic traceability                 | L2    | P3       | later-hardening | Phase 2 design tradeoff              | Evaluate in Phase 3e if operational debugging needs stronger trace              |
| H2  | Revisit protocol envelope semantics for auto rework dispatch actor typing           | L1    | P3       | later-hardening | Phase 2 protocol minimization choice | Keep existing envelope types in Phase 2; revisit if ambiguity appears in audits |
| H3  | Add idempotency token to convergence->meta-review trigger chain                     | L2    | P3       | later-hardening | race-hardening idea                  | Consider in a separate hardening task after Phase 2 rollout evidence            |
| H4  | Add dedicated auto-rework dispatch metadata fingerprint for cross-round correlation | L2    | P3       | later-hardening | prior open question                  | Revisit in Phase 3 only if audit incidents show insufficient traceability       |

## Review Control

1. Every finding must include: `priority`, `timing`, `layer`, `evidence`.
2. Max 2 L1 hardening rounds before implementation handoff.
3. New `required-now` after round 2 is allowed only when one of the following holds:
   - evidence-backed `P0/P1`, or
   - explicit human `APPROVAL_DECISION` requests docs-contract consistency closure within unchanged scope (no file-scope expansion), with deterministic AC/test traceability in the same revision.
4. Items outside Phase 2 contract are tagged `later-hardening` or deferred to Phase 3 task files.
5. Because `contract_boundary_override=yes`, `plan_ref` is mandatory and must remain non-null.

## Spec Lock

In this task-artifact convention, `status: implementable` means specification-ready handoff (deterministic and implementation-ready), not that runtime code changes are already delivered.

Mark this task artifact `IMPLEMENTABLE` when all are true:

1. AC1-AC14 are fully specified with deterministic contract text and explicit test traceability in this document.
2. Autonomous routing behavior contract is deterministic and auditable under success and fallback branches.
3. Phase 1 read-only retrieval contract remains unchanged in required-now scope.
4. Implementation execution phase must satisfy AC1-AC14 with automated evidence in code/test changes.

## Assumptions

1. Phase 1 task is merged before Phase 2 implementation starts.
2. Phase 2 keeps protocol type surface unchanged.
3. Human override policy for non-approve recommendations is deferred to Phase 3 as planned.

## Resolution Record

1. Dedicated auto-rework dispatch metadata fingerprint is deferred to later hardening (`H4`), not required for Phase 2 `required-now` contract.
2. Phase 2 user-facing canonical label is `READY_FOR_HUMAN_APPROVAL`; `READY_FOR_APPROVAL` remains backward-compatible acceptance only.
3. Post-implementation alignment: autonomous run execution failures are routed to `META_REVIEW_FAILED` (explicit human override/rework gate), while `inconclusive` outcomes continue to use `READY_FOR_HUMAN_APPROVAL`.
