---
artifact_type: task
artifact_id: task_actor_runtime_incomplete_emit_actor_agnostic_cleanup_phaseE_v1
title: "Actor Runtime Actor-Agnostic Reconcile Cleanup (Phase E)"
status: draft
phase: phaseE
target_files:
  - src/v11/shared/metaReviewGate/metaReviewGateRecovery.ts
  - src/v11/shared/metaReviewGate/metaReviewGateCommandApi.ts
  - src/v11/application/metaReviewGate/emitMetaReviewGateV11.ts
  - src/v11/application/watchdog/watchdogCommandContract.ts
  - src/v11/application/converged/runConvergedFlowContract.ts
  - src/v11/shared/metaReview/metaReviewCommandContract.ts
  - tests/core/bubble/metaReviewGate.test.ts
  - tests/core/human/approval.test.ts
  - tests/contracts/v11/metaReviewGate.contract.runner.ts
  - README.md
  - docs/pairflow-initial-design.md
prd_ref: null
plan_ref: plans/actor-runtime-incomplete-emit-reconcile-and-recover-removal-plan-v1.md
system_context_ref: docs/pairflow-initial-design.md
owners:
  - "felho"
---

# Task: Actor Runtime Actor-Agnostic Reconcile Cleanup (Phase E)

## L0 - Policy

### Goal

Takaritsa ki a megmarado meta-review-specifikus reconcile/recovery identitast a belso contractokbol, exported symbolokbol es docs surface-ekbol ugy, hogy a kernelben mar csak actor-agnosztikus incomplete-emit finalize/reconcile fogalom maradjon.

### In Scope

1. Remaining meta-review-specific reconcile/recovery naming cleanup az internal/exported contractsben.
2. Facade/contract alignment a generic kernel fele.
3. Docs/update closure a public `recover` removal es actor-agnosztikus kernel vegallapotahoz.

### Out of Scope

1. Uj actor migration Phase E reviewer/meta-reviewer rollout.
2. Uj public command family.
3. Kernel semantics ujranyitasa.

### Safety Defaults

1. A cleanup nem hozhat vissza retained meta-review-specific fogalmakat compatibility cimen.
2. A docs csak a tenyleges vegallapotot irhatjak le: nincs public recover, a belso finalize kernel actor-agnosztikus.

### Contract Boundary / Blast Radius

1. `contract_boundary_override`: `yes`
2. Erintett contractok:
   - exported internal dependency naming,
   - v11 facade contract,
   - docs/operator semantics.

### Complexity Risk Gate

1. `authority_risk`: `1`
2. `surface_spread`: `2`
3. `activation_coupling`: `0`
4. `prerequisite_risk`: `1`
5. `acceptance_multiplicity`: `1`
6. `risk_score`: `5`
7. `single-task allowed`: `yes`
8. Authority/source-of-truth note:
   - canonical source: actor-agnostic reconcile kernel contract
   - forbidden secondary sources: retained meta-review-specific exported naming as compatibility crutch

## L1 - Change Contract

### 1) Call-site Matrix

| ID | File | Function/Entry | Exact Signature (args -> return) | Insertion Point | Expected Behavior | Priority | Timing | Evidence |
|---|---|---|---|---|---|---|---|---|
| CS1 | `src/v11/shared/metaReviewGate/metaReviewGateRecovery.ts` | retained implementation names | existing exports | internal implementation | remaining names generic kernel semanticsra tisztulnak | P1 | required-now | T1 |
| CS2 | `src/v11/shared/metaReviewGate/metaReviewGateCommandApi.ts` | exported contract | existing export surface | API layer | exported names nem orzik a meta-review-specific recover identityt | P1 | required-now | T1 |
| CS3 | `src/v11/application/metaReviewGate/emitMetaReviewGateV11.ts` | facade exports | v11 facade | facade | v11 facade naming a generic kernelhez igazodik | P1 | required-now | T2 |
| CS4 | `src/v11/application/watchdog/watchdogCommandContract.ts`, `src/v11/application/converged/runConvergedFlowContract.ts`, `src/v11/shared/metaReview/metaReviewCommandContract.ts` | dependency contracts | existing dependency types | contract files | dependency names generic finalize/reconcile fogalmat hasznalnak | P1 | required-now | T2, T3 |
| CS5 | `README.md`, `docs/pairflow-initial-design.md` | docs surface | docs text | docs | vegallapot explicit: nincs public recover, actor-agnosztikus belso kernel maradt | P2 | required-now | T4 |

### 2) Data and Interface Contract

| Contract | Current | Target | Required Fields | Optional Fields | Compatibility | Priority | Timing |
|---|---|---|---|---|---|---|---|
| Exported internal dependency naming | meta-review-specific recover names | generic finalize/reconcile names | same callable behavior | diagnostics naming | internal breaking-by-plan | P1 | required-now |
| Docs/operator semantics | mixed historical terminology | explicit final-state terminology | removed command guidance, generic internal kernel statement | background rationale | user-visible clarification | P2 | required-now |

### 3) Side Effects Contract

| Area | Allowed | Forbidden | Notes | Priority | Timing |
|---|---|---|---|---|---|
| Internal contracts | rename/cleanup exported symbols and deps | retained historical compatibility aliases | required-now | P1 | required-now |
| Docs | final-state sync | historical partial-state wording retained | required-now | P2 | required-now |

### 4) Error and Fallback Contract

| Trigger | Dependency (if any) | Behavior (`throw|result|fallback`) | Fallback Value/Action | Reason Code | Log Level | Priority | Timing |
|---|---|---|---|---|---|---|---|
| stale meta-review-specific dependency name remains in runtime contract | code search / tests | test failure | no compatibility alias | implementation regression evidence | error | P1 | required-now |
| docs still mention public recover as active path | docs | review failure | explicit final-state sync required | docs parity failure | warn | P2 | required-now |

### 5) Dependency Constraints

| Type | Items | Priority | Timing |
|---|---|---|---|
| must-use | Phases 1-3 completed kernel/caller/removal state | P1 | required-now |
| must-not-use | retained compatibility aliases, partial wording, historical command references as active path | P1 | required-now |

### 6) Test Matrix

| ID | Scenario | Given | When | Then | Priority | Timing | Evidence |
|---|---|---|---|---|---|---|---|
| T1 | internal API cleanup removes meta-review-specific reconcile identity | updated internal modules | tests/code search fut | exported symbols genericek | P1 | required-now | automated test |
| T2 | v11 facades/contracts align with generic kernel naming | v11 facade fixtures | contract tests futnak | no old recover identity remains | P1 | required-now | automated test |
| T3 | runtime dependency contracts no longer encode meta-review-specific recover names | watchdog/converged/metaReview contracts | type/test coverage fut | generic dependency names maradnak | P1 | required-now | automated test |
| T4 | docs reflect final state | final docs diff | review fut | no public recover, generic internal reconcile wording | P2 | required-now | doc review |

## Review Control

1. Every finding must include: `priority`, `timing`, `layer`, `evidence`.

## Spec Lock

Mark task as `IMPLEMENTABLE` when all `P0/P1 + required-now` items are closed.
