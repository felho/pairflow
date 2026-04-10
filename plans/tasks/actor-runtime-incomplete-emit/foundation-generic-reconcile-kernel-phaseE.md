---
artifact_type: task
artifact_id: task_actor_runtime_incomplete_emit_foundation_generic_reconcile_kernel_phaseE_v1
title: "Actor Runtime Generic Reconcile Kernel Foundation (Phase E)"
status: draft
phase: phaseE
target_files:
  - src/v11/application/reconcile/finishIncompleteActorResult.ts
  - src/v11/application/reconcile/finishIncompleteActorResultTypes.ts
  - src/v11/shared/metaReview/metaReviewCommandSubmitRouting.ts
  - src/v11/shared/metaReviewGate/metaReviewGateRecovery.ts
  - src/v11/application/metaReviewGate/emitMetaReviewGateV11.ts
  - tests/core/bubble/metaReviewGate.test.ts
  - tests/v11/application/reconcile/finishIncompleteActorResult.test.ts
prd_ref: null
plan_ref: plans/actor-runtime-incomplete-emit-reconcile-and-recover-removal-plan-v1.md
system_context_ref: docs/pairflow-initial-design.md
owners:
  - "felho"
---

# Task: Actor Runtime Generic Reconcile Kernel Foundation (Phase E)

## L0 - Policy

### Goal

Vezessen be egy actor-agnosztikus belso reconcile / finish-incomplete-emit kernelt, amely persisted canonical outputbol es explicit execution contextbol dolgozik, es amelyet a jelenlegi meta-review-specifikus recovery/finalization path mar foundation szinten hasznalni tud.

### In Scope

1. Generic belso reconcile kernel contract es tipusok bevezetese.
2. A jelenlegi meta-review recovery/finalization shared logic foundation-level atkeretezese a generic kernel fele.
3. Egy explicit, idempotens finish result shape rogzitese.
4. Core foundation tesztek a generic kernelre.

### Out of Scope

1. A normal meta-review happy path teljes cutoverja.
2. Public `recover` command removal.
3. Watchdog/converged/startup internal caller cutover.
4. Docs/CLI wording cleanup.

### Safety Defaults

1. A generic kernel inputja csak persisted canonical output + explicit execution context lehet.
2. Nincs operator-origin fallback es nincs pane/tmux-derived authority.
3. A foundation task nem hozhat be retained thin-wrapper legitimaciot a public `recover` jovojehez.

### Contract Boundary / Blast Radius

1. `contract_boundary_override`: `yes`
2. Erintett contractok:
   - internal reconcile/finalization authority contract,
   - route-apply engine input/output contract,
   - meta-review recovery facade internal dependency contract.

### Complexity Risk Gate

1. `authority_risk`: `2`
2. `surface_spread`: `1`
3. `activation_coupling`: `0`
4. `prerequisite_risk`: `1`
5. `acceptance_multiplicity`: `1`
6. `risk_score`: `5`
7. `single-task allowed`: `yes`
8. Authority/source-of-truth note:
   - canonical source: persisted canonical actor output + explicit execution context
   - forbidden secondary sources: tmux pane state, operator command path, historical meta-review-specific recovery identity

## L1 - Change Contract

### 1) Call-site Matrix

| ID | File | Function/Entry | Exact Signature (args -> return) | Insertion Point | Expected Behavior | Priority | Timing | Evidence |
|---|---|---|---|---|---|---|---|---|
| CS1 | `src/v11/application/reconcile/finishIncompleteActorResultTypes.ts` | generic reconcile contract types | `FinishIncompleteActorResultInput`, `FinishIncompleteActorResultOutput` type exports | new file | generic input/output contract persisted actor resulthez | P1 | required-now | T1 |
| CS2 | `src/v11/application/reconcile/finishIncompleteActorResult.ts` | generic finalize engine | `finishIncompleteActorResult(input: FinishIncompleteActorResultInput, dependencies?: FinishIncompleteActorResultDependencies) -> Promise<FinishIncompleteActorResultOutput>` | new file | generic internal engine, meta-review-specifikus naming nelkul | P1 | required-now | T1, T2 |
| CS3 | `src/v11/shared/metaReview/metaReviewCommandSubmitRouting.ts` | current submit routing seam | `recoverMetaReviewSubmitRoute(...) -> Promise<...>` | route/apply bridge | a bridge a generic engine fele kezdjen delegálni, ne kulon meta-review-specifikus engine-re | P1 | required-now | T2 |
| CS4 | `src/v11/shared/metaReviewGate/metaReviewGateRecovery.ts` | current recovery seam | `recoverMetaReviewGateFromSnapshot(...) -> Promise<...>` | recovery implementation | retained meta-review facade generic kernel wrapperkent maradjon ebben a taskban | P1 | required-now | T2, T3 |
| CS5 | `src/v11/application/metaReviewGate/emitMetaReviewGateV11.ts` | v11 facade | `recoverMetaReviewGateFromSnapshotV11(...) -> Promise<...>` | facade layer | facade a generic foundationre epuljon, de public semantics valtozatlan maradjon Phase 1-ben | P2 | required-now | T3 |

### 2) Data and Interface Contract

| Contract | Current | Target | Required Fields | Optional Fields | Compatibility | Priority | Timing |
|---|---|---|---|---|---|---|---|
| Internal finalize input | meta-review-specifikus recovery inputok | actor-agnosztikus internal input | persisted result ref/data, execution context, route policy hook | diagnostics refs, caller tag | internal breaking-by-plan | P1 | required-now |
| Internal finalize output | recovery-specific route result | generic finish result | lifecycle outcome, applied route, mutation status | warnings, diagnostics | internal tightening | P1 | required-now |
| Meta-review recovery facade | direct meta-review recovery engine | thin meta-review adapter a generic kernel felett | same external inputs as current facade | none | compatibility-preserving temporary adapter | P1 | required-now |

### 3) Side Effects Contract

| Area | Allowed | Forbidden | Notes | Priority | Timing |
|---|---|---|---|---|---|
| Internal reconcile kernel | route/apply/finalize mutation via explicit dependencies | implicit authority reconstruction | foundation-only seam | P1 | required-now |
| Meta-review adapter | generic kernel delegálása | uj meta-review-specific engine branch | temporary wrapper only | P1 | required-now |

Constraint: ebben a taskban nincs public CLI side effect.

### 4) Error and Fallback Contract

| Trigger | Dependency (if any) | Behavior (`throw|result|fallback`) | Fallback Value/Action | Reason Code | Log Level | Priority | Timing |
|---|---|---|---|---|---|---|---|
| missing explicit execution context | state/execution context | throw | nincs fallback | `ACTOR_RECONCILE_CONTEXT_INVALID` | error | P1 | required-now |
| persisted output invalid or missing | state/artifact | throw | nincs hidden rerun | `ACTOR_RECONCILE_INPUT_INVALID` | error | P1 | required-now |
| caller still uses meta-review facade | adapter layer | result | compatibility retained in this task only | N/A | info | P2 | required-now |

### 5) Dependency Constraints

| Type | Items | Priority | Timing |
|---|---|---|---|
| must-use | `plans/tasks/actor-runtime-interface-capability-contract-phaseB-draft.md`, `plans/tasks/actor-runtime-interface-scenario-simulation-phaseC-matrix.md` | P1 | required-now |
| must-not-use | public `recover` removal, operator-surface redesign, tmux-derived authority | P1 | required-now |

### 6) Test Matrix

| ID | Scenario | Given | When | Then | Priority | Timing | Evidence |
|---|---|---|---|---|---|---|---|
| T1 | generic kernel accepts explicit persisted result input | valid persisted actor result + execution context | generic kernel fut | deterministic finish output jon | P1 | required-now | automated test |
| T2 | meta-review route bridge delegates to generic kernel | existing meta-review route/apply fixture | submit/recovery bridge fut | nincs kulon meta-review engine dependency | P1 | required-now | automated test |
| T3 | retained meta-review facade still works on top of generic kernel | current v11 facade fixture | v11 facade fut | current external behavior nem torik Phase 1-ben | P1 | required-now | automated test |

## L2 - Implementation Notes (Optional)

1. [later-hardening] a final generic naming Phase 4-ben tisztuljon teljesen; Phase 1-ben a facade retained lehet.

## Hardening Backlog (Optional)

| ID | Item | Layer | Priority | Timing | Source | Proposed Action |
|---|---|---|---|---|---|---|
| H1 | generic kernel result shape tovabbi egyszerusitese | L2 | P2 | later-hardening | Phase 1 | revisit Phase 4 cleanupban |

## Review Control

1. Every finding must include: `priority`, `timing`, `layer`, `evidence`.

## Spec Lock

Mark task as `IMPLEMENTABLE` when all `P0/P1 + required-now` items are closed.
