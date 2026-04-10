---
artifact_type: task
artifact_id: task_meta_review_recover_runtime_removal_phase1_v1
title: "Meta-Review Recover Runtime Removal (Phase 1)"
status: draft
phase: phase1
target_files:
  - src/v11/shared/metaReview/metaReviewCommandSubmitRouting.ts
  - src/v11/shared/metaReview/metaReviewCommandContract.ts
  - src/v11/application/metaReview/emitMetaReviewV11.ts
  - src/v11/application/metaReviewGate/emitMetaReviewGateV11.ts
  - src/v11/shared/metaReviewGate/metaReviewGateRecovery.ts
  - src/v11/shared/metaReviewGate/metaReviewGateTypes.ts
  - src/v11/application/converged/convergedDefaultDependencies.ts
  - src/v11/application/converged/convergedExecution.ts
  - src/v11/application/converged/runConvergedFlowContract.ts
  - src/v11/application/watchdog/watchdogCommandApi.ts
  - src/v11/application/watchdog/watchdogCommandContract.ts
  - src/v11/application/watchdog/watchdogMetaReviewRouting.ts
  - src/v11/application/reconcile/finishIncompleteActorResult.ts
  - src/v11/application/reconcile/finishIncompleteActorResultTypes.ts
  - src/v11/shared/reconcile/finishIncompleteActorResultPort.ts
  - tests/core/bubble/metaReview.test.ts
  - tests/core/bubble/metaReviewGate.test.ts
  - tests/core/bubble/watchdogBubble.test.ts
  - tests/contracts/v11/metaReviewGate.contract.runner.ts
  - tests/contracts/v11/watchdog.contract.runner.ts
  - tests/v11/application/reconcile/finishIncompleteActorResult.test.ts
prd_ref: null
plan_ref: plans/meta-review-recover-and-reconcile-removal-plan-v1.md
system_context_ref: docs/pairflow-initial-design.md
owners:
  - "felho"
---

# Task: Meta-Review Recover Runtime Removal (Phase 1)

## L0 - Policy

### Goal

Szuntesse meg a meta-review snapshot-driven recover/reconcile runtime kepesseget es a generic incomplete-emit kernelt ugy, hogy a submit/watchdog/converged flowk tobbe ne epitsenek route-replay logikara.

### In Scope

1. `finishIncompleteActorResult` es a hozza tartozo retained generic reconcile contractok eltavolitasa.
2. A meta-review submit happy path atallitasa retained recovery helper helyett kozvetlen finalize / explicit fail-closed logikara.
3. A watchdog es converged dependency contractokbol a recover seam eltavolitasa.
4. A `recoverMetaReviewGateFromSnapshot(...)` runtime szerepenek megszuntetese.

### Out of Scope

1. Public `pairflow bubble meta-review recover` CLI/help/docs cleanup.
2. Operator runbook vagy PRD wording update.
3. Uj automatic recovery capability bevezetese `restart` helyett.

### Safety Defaults

1. A runtime nem route-olhat ujra persisted snapshotbol recovery helperrel.
2. Ha a gate finalize nem bizonyithato biztosan, a viselkedes explicit fail-closed legyen, ne silent replay.
3. A normal meta-review submit flow nem fugghet retained recovery fogalomtól vagy wrappertol.

### Contract Boundary / Blast Radius

1. `contract_boundary_override`: `yes`
2. Erintett contractok:
   - public-ish CLI-backed command semantics underpinning, mert a runtime dependency surface valtozik,
   - internal event/routing contract a submit/watchdog/converged flowkban,
   - dependency injection contract a v11 facade-kban.

### Complexity Risk Gate

1. `authority_risk`: `1`
2. `surface_spread`: `2`
3. `identity_join_risk`: `1`
4. `activation_coupling`: `1`
5. `prerequisite_risk`: `0`
6. `acceptance_multiplicity`: `2`
7. `risk_score`: `7`
8. `single-task allowed`: `no`
9. required split:
   - `foundation/refactor`
   - `delivery`
10. Identity/join note:
   - canonical identity path: active bubble state + current meta-review submit result
   - competing identifiers or fallback identities: persisted snapshot-route replay, retained recover seam, generic reconcile wrapper
11. Authority/source-of-truth note:
   - canonical source: normal submit/finalize path and explicit runtime state mutation
   - forbidden secondary sources: snapshot-driven route replay, generic incomplete-emit reconcile helper

## L1 - Change Contract

### 1) Call-site Matrix

| ID | File | Function/Entry | Exact Signature (args -> return) | Insertion Point | Expected Behavior | Priority | Timing | Evidence |
|---|---|---|---|---|---|---|---|---|
| CS1 | `src/v11/shared/metaReview/metaReviewCommandSubmitRouting.ts` | submit finalize router | existing submit routing helpers | canonical finalize branch | submit tobbe nem hivhat snapshot-recover executort route-alkalmazashoz | P1 | required-now | T1 |
| CS2 | `src/v11/application/metaReview/emitMetaReviewV11.ts` | retained facade defaults | `submitMetaReviewResultV11(...) -> Promise<...>` | dependency default wiring | facade-bol eltunik a recover dependency wiring | P1 | required-now | T2 |
| CS3 | `src/v11/application/metaReviewGate/emitMetaReviewGateV11.ts` | recovery facade wiring | `recoverMetaReviewGateFromSnapshotV11(...) -> Promise<MetaReviewGateResult>` es default dependencies | facade layer | retained recover wiring es a generic reconcile dependency megszunik; Phase 2-ben a public surface teljesen torolheto legyen | P1 | required-now | T3 |
| CS4 | `src/v11/application/converged/convergedDefaultDependencies.ts`, `src/v11/application/converged/runConvergedFlowContract.ts`, `src/v11/application/converged/convergedExecution.ts` | converged dependency surface | existing dependency contracts | dependency resolution | converged flow nem dependalhat recover helperre | P1 | required-now | T4 |
| CS5 | `src/v11/application/watchdog/watchdogCommandApi.ts`, `src/v11/application/watchdog/watchdogCommandContract.ts`, `src/v11/application/watchdog/watchdogMetaReviewRouting.ts` | watchdog dependency surface | existing watchdog routing contracts | meta-review watchdog route | watchdog nem hivhat snapshot-recover route replayt; explicit escalation/restart-friendly fail-closed path marad | P1 | required-now | T5 |
| CS6 | `src/v11/application/reconcile/finishIncompleteActorResult.ts`, `src/v11/application/reconcile/finishIncompleteActorResultTypes.ts`, `src/v11/shared/reconcile/finishIncompleteActorResultPort.ts` | generic reconcile kernel | exported files/modules | full module surface | a generic reconcile kernel torlendo, mert nincs retained consumer | P1 | required-now | T6 |
| CS7 | `src/v11/shared/metaReviewGate/metaReviewGateRecovery.ts`, `src/v11/shared/metaReviewGate/metaReviewGateTypes.ts` | recover runtime contract | existing recovery entry + dependency types | internal recovery implementation | snapshot-driven recovery runtime szerep megszunik; Phase 2 public cleanupet blokkoló retained dependency nem maradhat | P1 | required-now | T3, T5 |

### 2) Data and Interface Contract

| Contract | Current | Target | Required Fields | Optional Fields | Compatibility | Priority | Timing |
|---|---|---|---|---|---|---|---|
| Submit finalize dependency | retained recover executor | direct finalize path | canonical run result, explicit route/apply inputs | diagnostics | internal breaking-by-plan | P1 | required-now |
| Watchdog/converged dependency contract | `recoverMetaReviewGateFromSnapshot` optional dependency | no recover dependency | normal routing inputs only | existing diagnostics | internal breaking-by-plan | P1 | required-now |
| Reconcile kernel exports | retained generic helper modules | deleted | N/A | N/A | internal breaking-by-plan | P1 | required-now |

### 3) Side Effects Contract

| Area | Allowed | Forbidden | Notes | Priority | Timing |
|---|---|---|---|---|---|
| Meta-review finalize path | direct canonical state/protocol finalize through explicit submit flow | snapshot-route replay through recover helper | required-now | P1 | required-now |
| Watchdog/converged | explicit fail-closed / escalation-friendly result | automatic route replay from snapshot | restart marad operator remediation | P1 | required-now |
| Filesystem/module graph | deletion of now-unused reconcile modules | retained dead compatibility wrapper | required-now | P1 | required-now |

Constraint: nem maradhat retained runtime branch, amely a canonical meta-review outcome-bol utolagos recover-reconcile route replayt vegez.

### 4) Error and Fallback Contract

| Trigger | Dependency (if any) | Behavior (`throw|result|fallback`) | Fallback Value/Action | Reason Code | Log Level | Priority | Timing |
|---|---|---|---|---|---|---|---|
| finalize path previously would have used recover replay | submit runtime | result | explicit typed failure/escalation path, no replay | existing meta-review gate failure family or equivalent explicit replacement | error | P1 | required-now |
| watchdog/converged detects state where recover used to run | watchdog/converged runtime | result | restart/escalation-friendly fail-closed outcome | explicit runtime reason code, no hidden replay | warn/error | P1 | required-now |
| deleted reconcile helper is still imported anywhere | module graph | throw/test failure | no compatibility alias | build/test regression evidence | error | P1 | required-now |

### 5) Dependency Constraints

| Type | Items | Priority | Timing |
|---|---|---|---|
| must-use | existing meta-review submit/gate/watchdog/converged regression suites | P1 | required-now |
| must-use | direct code search proving `finishIncompleteActorResult` and runtime recover dependency removal | P1 | required-now |
| must-not-use | retained thin wrapper around deleted reconcile kernel | P1 | required-now |
| must-not-use | snapshot-driven route replay as hidden fallback | P1 | required-now |

### 6) Test Matrix

| ID | Scenario | Given | When | Then | Priority | Timing | Evidence |
|---|---|---|---|---|---|---|---|
| T1 | submit happy path no longer depends on recover runtime | valid canonical meta-review submit fixture | submit flow runs | route/finalize succeeds or fails directly without recover executor wiring | P1 | required-now | automated test |
| T2 | v11 submit facade no longer wires recover dependency | facade fixture | `submitMetaReviewResultV11(...)` resolves deps | no recover dependency passed through | P1 | required-now | automated test |
| T3 | retained recover runtime implementation is removed from runtime graph | code search + compile fixture | build/tests run | no runtime consumer/import of deleted recover/reconcile helper remains | P1 | required-now | automated test + code search |
| T4 | converged path no longer exposes recover dependency | converged fixture | dependency resolution runs | no recover dependency in invocation/defaults/contracts | P1 | required-now | automated test |
| T5 | watchdog meta-review path no longer replays snapshot route | watchdog fixture that previously recovered | watchdog flow runs | explicit fail-closed/escalation path, no recover invocation | P1 | required-now | automated test |
| T6 | generic reconcile kernel files are removable | code search/build fixture | build/tests run after deletion | no import/type/runtime dependency remains | P1 | required-now | automated test + code search |

## L2 - Implementation Notes (Optional)

1. [later-hardening] Ha a fail-closed reason code family tul diffuz, kulon cleanup taskban erdemes lehet dedikalni a restart/escalation wordinget.

## Hardening Backlog (Optional)

| ID | Item | Layer | Priority | Timing | Source | Proposed Action |
|---|---|---|---|---|---|---|
| H1 | restart/escalation diagnostics wording unify | L2 | P2 | later-hardening | review follow-up | normalize operator-facing diagnostics after runtime removal lands |

## Review Control

1. Every finding must include: `priority`, `timing`, `layer`, `evidence`.
2. If `contract_boundary_override=yes`, `plan_ref` is mandatory and must align with L1 contract rows.

## Spec Lock

Mark task as `IMPLEMENTABLE` when all `P0/P1 + required-now` items are closed.
