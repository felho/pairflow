---
artifact_type: task
artifact_id: task_v11_closure_meta_review_compat_bridge_removal_phase2c_v1
title: "v11 Closure Meta-Review Compat Bridge Removal (Phase 2C)"
status: implementable
phase: phase2c
target_files:
  - src/core/bubble/metaReview.ts
  - src/v11/shared/metaReviewGate/metaReviewGateTypes.ts
  - src/v11/shared/metaReviewGate/metaReviewGateRecoveryRunResolution.ts
  - src/v11/shared/metaReview/metaReviewTypes.ts
  - tests/core/bubble/metaReview.test.ts
  - tests/contracts/v11/metaReviewGate.contract.runner.ts
  - tests/contracts/v11/metaReviewGate.contract.test.ts
prd_ref: null
plan_ref: plans/v11-closure-and-residual-core-plan-v1.md
system_context_ref: docs/pairflow-initial-design.md
owners:
  - "felho"
---

# Task: v11 Closure Meta-Review Compat Bridge Removal (Phase 2C)

## L0 - Policy

### Goal

A Phase 2B utan megmaradt meta-review compat bridge-ek teljes eltakaritasa ugy, hogy a recovery/parity/test inputok is a kanonikus `MetaReviewResult` alakra alljanak at, es a `runMetaReview`-shaped retained inputok megszunjenek.

### In Scope

1. A Phase 2B-ben kommentben dokumentalt compat bridge-ek eltavolitasa.
2. A recovery/parity fixture-ek es runner seedek kanonikus `MetaReviewResult` payloadra atallitasa.
3. A kapcsolodo bridge/comment/deletion-trigger nyomok eltakaritasa, ha a bridge mar tenylegesen torolheto.

### Out of Scope

1. Uj meta-review domain-policy valtozas.
2. `inconclusive` semantics egyszerusitese.
3. `list` lane closure.
4. Infrastructure migration.

### Safety Defaults

1. A canonical `MetaReviewResult` shape nem valtozhat.
2. A retained operator surface nem valtozhat.
3. A task nem vezethet vissza uj `v11 -> core` canonical ownership-fuggest.

### Contract Boundary / Blast Radius

1. `contract_boundary_override`: `yes`
2. Erintett contractok:
   - meta-review recovery input contract
   - meta-review gate parity fixture input contract
   - canonical result seed contract a teszt/contract harnessben

### Complexity Risk Gate

1. `authority_risk`: `1`
2. `surface_spread`: `1`
3. `activation_coupling`: `0`
4. `prerequisite_risk`: `1`
5. `acceptance_multiplicity`: `1`
6. `risk_score`: `4`
7. `single-task allowed`: `yes`
8. If `no`, required split:
   - `foundation/refactor`
   - `delivery`
   - `activation/rollout`
9. Authority/source-of-truth note:
   - canonical source: `src/v11/shared/metaReview/metaReviewTypes.ts#MetaReviewResult`
   - forbidden secondary sources: retained `runMetaReview`-shaped compat bridge-ek

## L1 - Change Contract

### 1) Call-site Matrix

| ID | File | Function/Entry | Exact Signature (args -> return) | Insertion Point | Expected Behavior | Priority | Timing | Evidence |
|---|---|---|---|---|---|---|---|---|
| CS1 | `src/v11/shared/metaReviewGate/metaReviewGateTypes.ts` | recovery compat input types | retained compat bridge -> canonical-only input | existing compat type block | A recovery input contract ne fogadjon mar `runMetaReview`-alakú retained shape-et, ha a fixture-ek mar seedelhetnek kanonikus `MetaReviewResult`-ot. | P1 | required-now | T1 |
| CS2 | `src/v11/shared/metaReviewGate/metaReviewGateRecoveryRunResolution.ts` | `resolveRecoveredRunResolution` | existing signature preserved where possible | requestedRunResult normalization path | A recovery resolution kanonikus `MetaReviewResult` inputtal mukodjon, retained shape normalizalo bridge nelkul. | P1 | required-now | T1, T2 |
| CS3 | `tests/contracts/v11/metaReviewGate.contract.runner.ts` | retained run-result seed helpers | test helper seeds -> canonical result seeds | current helper definitions | A parity/contract runner ne `MetaReviewRunResult`-alakú retained payloadot seedeljen, hanem kanonikus `MetaReviewResult`-ot. | P1 | required-now | T2 |
| CS4 | `src/core/bubble/metaReview.ts` | retained compat comments/types | compat seam block | current retained result block | Ha a Phase 2C utan mar nincs konkret fogyaszto, a retained `MetaReviewRunResult` bridge torlendo. | P1 | required-now | T3 |

### 2) Data and Interface Contract

| Contract | Current | Target | Required Fields | Optional Fields | Compatibility | Priority | Timing |
|---|---|---|---|---|---|---|---|
| Recovery input contract | canonical result + compat run-result union | canonical `MetaReviewResult` only | `bubble_id`, `status`, `recommendation`, `summary`, `report_ref`, `rework_target_message`, `updated_at`, `warnings` | `run_id`, `report_json` | narrowing after fixture migration | P1 | required-now |
| Contract runner seed shape | retained run-result shape | canonical `MetaReviewResult` | canonical result fields | `run_id`, `report_json` | internal test-only narrowing | P1 | required-now |

### 3) Side Effects Contract

| Area | Allowed | Forbidden | Notes | Priority | Timing |
|---|---|---|---|---|---|
| FS / runtime | none beyond existing test execution | new runtime behavior changes | This task should be pure contract/fixture cleanup apart from code edits. | P1 | required-now |

### 4) Error and Fallback Contract

| Trigger | Dependency (if any) | Behavior (`throw|result|fallback`) | Fallback Value/Action | Reason Code | Log Level | Priority | Timing |
|---|---|---|---|---|---|---|---|
| legacy compat payload still required by a live consumer | N/A | stop and re-scope | keep bridge and document concrete consumer | COMPAT_BRIDGE_STILL_REQUIRED | warn | P1 | required-now |
| fixture migration reveals hidden runtime dependency | N/A | stop and document | open narrower follow-up with exact consumer | HIDDEN_COMPAT_DEPENDENCY | warn | P1 | required-now |

### 5) Dependency Constraints

| Type | Items | Priority | Timing |
|---|---|---|---|
| must-use | `plans/v11-closure-and-residual-core-plan-v1.md`, `docs/architecture/v11-placement-and-extraction-governance.md` | P2 | required-now |
| must-not-use | new canonical contract ownership under `src/core/**`; new retained bridge names under `src/v11/shared/metaReview/**` | P2 | required-now |

### 6) Test Matrix

| ID | Scenario | Given | When | Then | Priority | Timing | Evidence |
|---|---|---|---|---|---|---|---|
| T1 | recovery accepts canonical result only | canonical `MetaReviewResult` input | recovery resolution runs | route/result behavior unchanged without compat bridge | P1 | required-now | targeted vitest |
| T2 | contract runner seeds canonical result | metaReview gate contract runner fixtures | contract tests run | tests stay green without retained run-shape seed | P1 | required-now | targeted vitest |
| T3 | retained compat bridge removable | no remaining concrete consumer | codebase grep + tests | retained compat type/comment block deleted or reduced to still-needed minimal seam only | P1 | required-now | grep + targeted vitest |

## L2 - Implementation Notes (Optional)

1. [later-hardening] Ha a core `runMetaReview` test seam a Phase 2C utan is marad, kulon explicit seed helper-be erdemes lokalizalni, nem a fo `metaReview.ts` tipusfeluleten hagyni.

## Hardening Backlog (Optional)

| ID | Item | Layer | Priority | Timing | Source | Proposed Action |
|---|---|---|---|---|---|---|
| H1 | core meta-review test seam vegso torlese a Phase 2C utan meg maradekos | L2 | P2 | later-hardening | review follow-up | szukitsd kulon teszt-seam helperre vagy torold teljesen a kovetkezo korben |

## Review Control

1. Every finding must include: `priority`, `timing`, `layer`, `evidence`.
2. Max 2 L1 hardening rounds.
3. After round 2, new `required-now` is allowed only for evidence-backed `P0/P1`.
4. Items outside L1 blocker scope must be tagged `later-hardening`.
5. `plan_ref` alignment kotelezo a closure plan Phase 2C lepesével.

## Spec Lock

Mark task as `IMPLEMENTABLE` when all `P0/P1 + required-now` items are closed.
