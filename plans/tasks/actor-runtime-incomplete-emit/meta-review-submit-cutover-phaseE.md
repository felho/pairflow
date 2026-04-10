---
artifact_type: task
artifact_id: task_actor_runtime_incomplete_emit_meta_review_submit_cutover_phaseE_v1
title: "Actor Runtime Meta-Review Submit Cutover To Generic Reconcile Kernel (Phase E)"
status: draft
phase: phaseE
target_files:
  - src/v11/shared/metaReview/metaReviewCommandSubmitRuntime.ts
  - src/v11/shared/metaReview/metaReviewCommandSubmitRouting.ts
  - src/v11/application/metaReview/emitMetaReviewV11.ts
  - src/v11/application/actorProtocol/actorProtocolEmitters.ts
  - src/v11/application/actorProtocol/emitActorProtocolV11.ts
  - tests/core/bubble/metaReview.test.ts
  - tests/contracts/v11/metaReviewSubmitCoverage.test.ts
  - tests/v11/application/actorProtocol/emitActorProtocolV11.test.ts
prd_ref: null
plan_ref: plans/actor-runtime-incomplete-emit-reconcile-and-recover-removal-plan-v1.md
system_context_ref: docs/pairflow-initial-design.md
owners:
  - "felho"
---

# Task: Actor Runtime Meta-Review Submit Cutover To Generic Reconcile Kernel (Phase E)

## L0 - Policy

### Goal

A normal `meta_review_result` happy path mar a generic incomplete-emit reconcile kernelen finalize-oljon, es ne "recover" fogalommal vagy meta-review-specifikus belso engine-nel legyen modellezve.

### In Scope

1. Normal meta-review submit happy path cutover a generic kernelre.
2. Actor-emit wrapper parity megtartasa.
3. Routed success/failure contract explicit megtartasa a cutover utan.

### Out of Scope

1. Public `recover` command removal.
2. Watchdog/converged/startup caller cutover.
3. Remaining meta-review-specific internal naming teljes cleanupja.

### Safety Defaults

1. A normal submit path nem dobhat intentional exceptiont csak azert, mert a finalize engine generic lett.
2. A routed success semantics (`gate_route`, `lifecycle_state`, `gate_envelope_type`) valtozatlanul kotelezo.

### Contract Boundary / Blast Radius

1. `contract_boundary_override`: `yes`
2. Erintett contractok:
   - canonical actor emit submit contract,
   - meta-review submit runtime/facade contract,
   - route/finalize success surface.

### Complexity Risk Gate

1. `authority_risk`: `1`
2. `surface_spread`: `2`
3. `activation_coupling`: `1`
4. `prerequisite_risk`: `1`
5. `acceptance_multiplicity`: `1`
6. `risk_score`: `6`
7. `single-task allowed`: `yes`
8. Authority/source-of-truth note:
   - canonical source: generic reconcile kernel + persisted meta-review result
   - forbidden secondary sources: legacy recovery-only branch, public operator path

## L1 - Change Contract

### 1) Call-site Matrix

| ID | File | Function/Entry | Exact Signature (args -> return) | Insertion Point | Expected Behavior | Priority | Timing | Evidence |
|---|---|---|---|---|---|---|---|---|
| CS1 | `src/v11/shared/metaReview/metaReviewCommandSubmitRuntime.ts` | `submitMetaReviewResult` | `submitMetaReviewResult(input: MetaReviewSubmitInput, dependencies?: MetaReviewCommandDependencies) -> Promise<MetaReviewSubmitResult>` | happy path finalize branch | generic kernelre delegál, nem recovery-fogalomra | P1 | required-now | T1, T2 |
| CS2 | `src/v11/shared/metaReview/metaReviewCommandSubmitRouting.ts` | finalize bridge | `recoverMetaReviewSubmitRoute(...) -> Promise<...>` vagy utodnev | bridge layer | semantics generic finalize bridge-re szukul | P1 | required-now | T2 |
| CS3 | `src/v11/application/metaReview/emitMetaReviewV11.ts` | retained facade | `submitMetaReviewResultV11(...) -> Promise<MetaReviewSubmitResult>` | v11 facade | facade ugyanazt a routed-success contractot adja vissza | P1 | required-now | T3 |
| CS4 | `src/v11/application/actorProtocol/actorProtocolEmitters.ts` | meta-review actor emit wrapper | `emitMetaReviewActorResultV11(...) -> Promise<ActorEmitResultV11>` | wrapper | wrapper nem szukitheti vissza a generic cutover semanticsat | P1 | required-now | T4 |
| CS5 | `src/v11/application/actorProtocol/emitActorProtocolV11.ts` | outer dispatcher | `emitMetaReviewerActorProtocolV11(...) -> Promise<ActorEmitResultV11>` | public actor emit path | public canonical path ugyanarra a generic finalize semanticsra fusson | P1 | required-now | T4 |

### 2) Data and Interface Contract

| Contract | Current | Target | Required Fields | Optional Fields | Compatibility | Priority | Timing |
|---|---|---|---|---|---|---|---|
| Meta-review submit finalize path | meta-review-specific recovery terminology | generic finalize/reconcile terminology and engine | recommendation, report_json, execution context, persisted snapshot | diagnostics, refs | internal refactor with public parity | P1 | required-now |
| Submit result surface | routed success/failure | valtozatlan | `status`, `gate_route`, `lifecycle_state`, `gate_envelope_type` | warnings, refs | compatibility-preserving | P1 | required-now |
| Actor emit wrapper contract | wrapper -> submit path | wrapper -> generic finalize path | canonical actor emit payload | wrapper metadata | compatibility-preserving | P1 | required-now |

### 3) Side Effects Contract

| Area | Allowed | Forbidden | Notes | Priority | Timing |
|---|---|---|---|---|---|
| Submit runtime | generic finalize kernel hasznalata | recovery-only terminology retained dependency a happy pathban | required-now | P1 | required-now |
| Actor emit wrapper | facade parity megtartasa | wrapper-level special-case bypass | required-now | P1 | required-now |

### 4) Error and Fallback Contract

| Trigger | Dependency (if any) | Behavior (`throw|result|fallback`) | Fallback Value/Action | Reason Code | Log Level | Priority | Timing |
|---|---|---|---|---|---|---|---|
| generic finalize failure after persist | generic kernel | throw | explicit typed failure marad | existing submit/apply failure family | error | P1 | required-now |
| actor emit wrapper mismatch | actor protocol wrapper | throw | no hidden fallback | existing actor emit mismatch family | error | P1 | required-now |

### 5) Dependency Constraints

| Type | Items | Priority | Timing |
|---|---|---|---|
| must-use | Phase 1 generic kernel foundation | P1 | required-now |
| must-not-use | public recover command, watchdog caller migration, docs-only workaround | P1 | required-now |

### 6) Test Matrix

| ID | Scenario | Given | When | Then | Priority | Timing | Evidence |
|---|---|---|---|---|---|---|---|
| T1 | normal submit happy path uses generic finalize engine | valid meta-review submit fixture | submit fut | routed success marad, recovery terminology fuggetlenül | P1 | required-now | automated test |
| T2 | route/finalize bridge no longer encodes meta-review recovery identity as happy path | existing core fixture | bridge fut | generic finalize branch bizonyithato | P1 | required-now | automated test |
| T3 | retained v11 facade parity | retained contract fixture | facade fut | public result shape nem torik | P1 | required-now | automated test |
| T4 | actor emit wrapper parity | public `agent emit --kind meta_review_result` fixture | wrapper fut | same routed outcome | P1 | required-now | automated test |

## L2 - Implementation Notes (Optional)

1. [later-hardening] terminology cleanup Phase 4-ben teljesedjen ki a remaining internal names-on.

## Review Control

1. Every finding must include: `priority`, `timing`, `layer`, `evidence`.

## Spec Lock

Mark task as `IMPLEMENTABLE` when all `P0/P1 + required-now` items are closed.
