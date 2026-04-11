---
artifact_type: task
artifact_id: task_actor_runtime_interface_meta_review_cached_state_shape_and_persistence_decoupling_phaseE_v1
title: "Actor Runtime Interface Meta-Review Cached State Shape and Persistence Decoupling (Phase E)"
status: implementable
phase: phaseE
target_files:
  - src/types/bubble.ts
  - src/v11/domain/state/initialState.ts
  - src/v11/shared/state/stateSchemaMetaReview.ts
  - src/v11/shared/state/stateSchemaMetaReviewAutonomous.ts
  - src/v11/shared/state/stateSchemaMetaReviewAutonomousSupport.ts
  - src/v11/shared/metaReview/metaReviewSnapshot.ts
  - src/v11/shared/metaReview/metaReviewCommandSubmitPersistence.ts
  - src/v11/shared/metaReview/liveRun/metaReviewLiveRunPersistence.ts
  - src/v11/shared/metaReviewGate/metaReviewGateStateHelpers.ts
  - src/v11/shared/metaReviewGate/metaReviewGateCurrentRunFinalization.ts
  - tests/core/bubble/metaReviewGate.test.ts
  - tests/core/bubble/metaReview.test.ts
prd_ref: null
plan_ref: plans/actor-runtime-interface-discovery-and-migration-plan-v1.md
system_context_ref: docs/pairflow-initial-design.md
owners:
  - "felho"
---

# Task: Actor Runtime Interface Meta-Review Cached State Shape and Persistence Decoupling (Phase E)

## Current Codebase Check (2026-04-11)

1. A bubble state schema es az initial state ma meg cached `last_autonomous_*` scalars blokkot tart fenn.
2. A submit es live-run persistence seam-ek ezt a blokkot ma meg canonical state-be irjak vissza.
3. A gate/finalization helperek ma meg feltetelezik, hogy ez a cached scalar shape resze a `meta_review` state-nek.
4. Emiatt a consumer cutover elott kulon le kell valasztani a state-shape/persistence reteget.

## Executive Summary

1. Ez a task a cached-meta-review removal legszukebb foundation szelete.
2. A cel, hogy a `meta_review` state blokk mar ne tartalmazzon cached last-run scalars mezoket, es a runtime write path se perzisztalja azokat.
3. Ez a task nem nyul approval source-of-truthhoz, status/list consumer projectionhoz vagy public surface-ekhez.

## L0 - Policy

### Goal

Szuntesse meg a cached meta-review state shape-et es annak persistence/writer ownershipet ugy, hogy a `meta_review` state blokk csak elo authority/runtime/gate ownership adatokat tartson.

### In Scope

1. A `BubbleMetaReviewSnapshotState` shape szukitese.
2. Az initial state es a state schema validatorok igazitsa az uj shape-hez.
3. A canonical submit es live-run persistence seam-ek atirasa cached last-run scalars nelkul.
4. A gate-state/finalization helper-ek igazitsa az uj state shape-hez.
5. A fenti valtozasok regresszios tesztjei.

### Out of Scope

1. Approval source-of-truth transcriptre allitasa.
2. Status/list projection contract cleanupja.
3. Public CLI, skill, UI, docs vagy read-model torles.

### Safety Defaults

1. A canonical meta-review authority tovabbra is az aktiv `execution_context`.
2. A task nem vezethet be compatibility bridge-et vagy dual-write-ot a removed cached mezokre.
3. A megmarado live mezok:
   - `execution_context`
   - `runtime_delivery`
   - `auto_rework_count`
   - `auto_rework_limit`
   - `sticky_human_gate`
4. Minden mas cached last-run scalar kivezetendo ebben a taskban.

### Contract Boundary / Blast Radius

1. `contract_boundary_override`: `yes`
2. Erintett contractok:
   - bubble state schema contract,
   - meta-review persistence/write contract.

### Complexity Risk Gate

1. `authority_risk`: `2`
2. `surface_spread`: `1`
3. `identity_join_risk`: `0`
4. `activation_coupling`: `0`
5. `prerequisite_risk`: `1`
6. `acceptance_multiplicity`: `1`
7. `risk_score`: `5`
8. `single-task allowed`: `yes`
9. Identity/join note:
   - canonical identity path: `state.meta_review` shape -> write seams -> gate helpers
   - competing identifiers or fallback identities: none accepted in this task
10. Authority/source-of-truth note:
   - canonical source: live `meta_review` ownership fields only
   - forbidden secondary sources: persisted `last_autonomous_*` scalar block

## L1 - Change Contract

### 1) Call-site Matrix

| ID | File | Function/Entry | Exact Signature (args -> return) | Insertion Point | Expected Behavior | Priority | Timing | Evidence |
|---|---|---|---|---|---|---|---|---|
| CS1 | `src/types/bubble.ts`, `src/v11/domain/state/initialState.ts` | `BubbleMetaReviewSnapshotState`, `createInitialBubbleState` | type/state shape -> type/state shape | meta-review state definition | A `meta_review` state shape ne tartalmazza a cached `last_autonomous_*` scalars blokkot. | P1 | required-now | type + compile |
| CS2 | `src/v11/shared/state/stateSchemaMetaReview.ts`, `src/v11/shared/state/stateSchemaMetaReviewAutonomous.ts`, `src/v11/shared/state/stateSchemaMetaReviewAutonomousSupport.ts` | `validateMetaReviewSnapshot(...)` es kapcsolodo validators | `(input: unknown, errors: ValidationError[]) -> BubbleMetaReviewSnapshotState \| undefined` | schema validation | A validator az uj, szukitett shape-et fogadja el; explicit compatibility bridge ne keruljon be. | P1 | required-now | schema tests/build |
| CS3 | `src/v11/shared/metaReview/metaReviewCommandSubmitPersistence.ts`, `src/v11/shared/metaReview/liveRun/metaReviewLiveRunPersistence.ts` | persistence helpers | existing persistence helpers -> updated state writes | canonical submit + live-run persistence | A runtime ne irjon cached `last_autonomous_*` mezoket state-be. | P1 | required-now | core tests |
| CS4 | `src/v11/shared/metaReviewGate/metaReviewGateStateHelpers.ts`, `src/v11/shared/metaReviewGate/metaReviewGateCurrentRunFinalization.ts`, `src/v11/shared/metaReview/metaReviewSnapshot.ts` | gate/finalization helpers | existing helpers -> updated helpers | gate support seam | A helper-ek az uj state shape mellett is determinisztikusan mukodjenek. | P1 | required-now | core tests |

### 2) Data and Interface Contract

| Contract | Current | Target | Required Fields | Optional Fields | Compatibility | Priority | Timing |
|---|---|---|---|---|---|---|---|
| `state.meta_review` schema | live fields + cached `last_autonomous_*` scalars | live authority/runtime/gate ownership only | `execution_context`, `runtime_delivery`, `auto_rework_count`, `auto_rework_limit`, `sticky_human_gate` | none | breaking internal state reduction | P1 | required-now |
| Submit/live-run persistence | writes cached last-run scalars into state | writes only live ownership fields and counters | live fields above | none | breaking internal write contract | P1 | required-now |

### 3) Side Effects Contract

| Area | Allowed | Forbidden | Notes | Priority | Timing |
|---|---|---|---|---|---|
| State snapshot | shape reduction and canonical rewrites | dual-write or fallback-write to removed fields | no migration bridge | P1 | required-now |
| Gate helpers | helper adaptation to reduced shape | recomputing cached report/status payload into state | this task is not a consumer rebuild | P1 | required-now |

### 4) Error and Fallback Contract

| Trigger | Dependency (if any) | Behavior (`throw|result|fallback`) | Fallback Value/Action | Reason Code | Log Level | Priority | Timing |
|---|---|---|---|---|---|---|---|
| Old persisted state file still contains removed cached fields | state file load | result | ignore unknown/removed keys implicitly; no dedicated migration branch | N/A | info | P2 | required-now |
| Gate/finalization helper no longer has cached report scalars in state | current-run inputs | result | use current helper inputs only; do not recreate cached snapshot | N/A | info | P1 | required-now |

### 5) Dependency Constraints

| Type | Items | Priority | Timing |
|---|---|---|---|
| must-use | existing live ownership fields in `meta_review` | P1 | required-now |
| must-not-use | persisted `last_autonomous_*` scalar block | P1 | required-now |
| must-not-use | compatibility shims that keep removed state fields alive | P1 | required-now |

### 6) Test Matrix

| ID | Scenario | Given | When | Then | Priority | Timing | Evidence |
|---|---|---|---|---|---|---|---|
| T1 | State persistence writes reduced meta-review shape | active submit/live-run fixture | state write occurs | persisted `meta_review` block omits cached `last_autonomous_*` scalars | P1 | required-now | automated test |
| T2 | Gate helpers remain stable on reduced shape | human-gate or finalize fixture | gate/finalization runs | existing gate behavior remains deterministic without cached scalar block | P1 | required-now | automated test |
| T3 | Old persisted state file does not require explicit migration bridge | fixture contains deprecated cached keys | state load + new write path runs | new write emits reduced shape without bridge code | P2 | required-now | automated test |

## L2 - Implementation Notes (Optional)

1. [later-hardening] `metaReviewSnapshot` naming kesobb ujragondolhato, ha mar semmi snapshot-semantika nem marad a shape-ben.

## Assumptions

1. A state validator implicit unknown-key toleranciaja eleg a bridge-nelkuli state reductionhoz.

## Open Questions

1. Nincs blocker open question.

## Hardening Backlog (Optional)

| ID | Item | Layer | Priority | Timing | Source | Proposed Action |
|---|---|---|---|---|---|---|
| H1 | naming cleanup a reduced `metaReviewSnapshot` owneren | L2 | P2 | later-hardening | task authoring | csak a consumer cutover es removal utan erdemes nyitni |

## Review Control

1. Every finding must include: `priority`, `timing`, `layer`, `evidence`.
2. Max 2 L1 hardening rounds.
3. After round 2, new `required-now` is allowed only for evidence-backed `P0/P1`.
4. Items outside L1 blocker scope must be tagged `later-hardening`.
5. If `contract_boundary_override=yes`, `plan_ref` is mandatory and must align with L1 contract rows.

## Spec Lock

Mark task as `IMPLEMENTABLE` when all `P0/P1 + required-now` items are closed.
