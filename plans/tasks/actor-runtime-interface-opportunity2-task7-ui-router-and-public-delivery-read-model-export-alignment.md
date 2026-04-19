---
artifact_type: task
artifact_id: task_actor_runtime_interface_opportunity2_task7_ui_router_and_public_delivery_read_model_export_alignment_v1
title: "Actor Runtime Interface Opportunity 2 Task 7: UI Router and Public Delivery Read-Model / Export Alignment"
status: implementable
phase: post-phaseE
target_files:
  - src/v11/shared/ports/uiRouter.ts
  - src/v11/defaults/ui/routerDefaults.ts
  - src/v11/infrastructure/ui/routerDependencies.ts
  - src/index.ts
  - tests/core/ui/router.test.ts
prd_ref: null
plan_ref: plans/actor-runtime-interface-post-phaseE-successor-plan-v1.md
system_context_ref: docs/pairflow-initial-design.md
owners:
  - "felho"
---

# Task: Actor Runtime Interface Opportunity 2 Task 7: UI Router and Public Delivery Read-Model / Export Alignment

## Current Codebase Check (2026-04-19)

1. Az approval lane current-tree szinten mar topology-neutral delivery signal vocabularyt ad:
   - `src/v11/application/approval/approvalCommandContract.ts`
   - `ApprovalDecisionDeliverySignal.status`
   - `accepted | rejected`
2. A UI/router surface ennek ellenere retained shape-et fogyaszt:
   - `UiEmitApprovalDecisionResult.delivery.statusDelivery: EmitTmuxDeliveryNotificationResult`
   - `UiEmitApprovalDecisionResult.delivery.implementerDelivery?: EmitTmuxDeliveryNotificationResult`
3. A default UI mapper explicitten visszaprojektalja a neutral delivery signal-t a retained `delivered: boolean` shape-re:
   - `src/v11/defaults/ui/routerDefaults.ts`
4. A repo-root/public delivery export surface current-tree szinten csak retained `EmitTmuxDeliveryNotification*` delivery shape-et exportal, neutral parity nelkul:
   - `src/index.ts`
5. A meta-review gate workflow/defaults cleanup kulon predecessor slice:
   - ezt az `O2-T6` ownershipolja
   - ez a task mar csak read-model/public alignment.

## L0 - Policy

### Goal

1. A UI/router delivery signal surface topology-neutral delivery vocabularyhoz igazitasa.
2. A repo-root/public delivery export surface additive neutral delivery exportokkal valo kiegeszitese retained parity mellett.
3. A retained `EmitTmuxDeliveryNotification*` shape maradhat explicit compat projectionkent, de nem maradhat canonical UI/public contract owner.
4. Ne csusszon ebbe a taskba:
   - meta-review gate workflow/defaults cleanup,
   - delivery vagy launch producer rewrite,
   - retained export breaking removal.

### Domain / Control Model Summary

1. Business invariant:
   - a UI/public delivery contractnak ugyanarra a topology-neutral authorityra kell ulnie, mint az approval lane internal signalnak;
   - a retained delivery result shape nem lehet onallo public truth.
2. Control model:
   - a source anchor a neutral approval delivery signal es a shared delivery ack semantics;
   - UI/read-model/public feluletek explicit same-authority projectiont kapnak.
3. Read-path rule:
   - a UI/public read path nem regresszalhat `delivered` booleant tekinto primary truthra;
   - a `status: accepted | rejected` semantics legyen a canonical UI/public consume surface.
4. Forbidden fallback:
   - third delivery vocabulary bevezetese ahelyett, hogy a mar letezo neutral signal semanticshez kotnenk;
   - retained `EmitTmuxDeliveryNotificationResult` shape mint canonical UI/public contract.
5. Allowed resolution path:
   - UI contract uj neutral delivery signal shape-et kap, amely explicitten a current neutral approval signal semanticsere van ankoralva;
   - repo-root/public surface additiven exportalja a neutral delivery contractot retained parity mellett.
6. Missing-data rule:
   - a rejected signal explicit rejected marad optional reason/reason_code mezokkel;
   - nincs synthetic delivered=true projection mint source-of-truth.
7. Phase boundary:
   - read_model_closure: owned here
   - activation_closure: owned here
   - shared contract closure: only narrow UI/public projection
   - producer closure: predecessor-owned

### Plan Linkage

1. Parent plan gap:
   - a current tree UI/router es repo-root/public delivery surface meg mindig retained vocabularyt visz.
2. Depends on:
   - `plans/actor-runtime-interface-post-phaseE-successor-plan-v1.md`
   - `plans/actor-runtime-interface-topology-neutral-delivery-executor-contract-note-v1.md`
   - `plans/tasks/actor-runtime-interface-opportunity2-task6-meta-review-gate-runtime-capability-decoupling.md`
   - `plans/archive/tasks/actor-runtime-interface-opportunity2-task5-topology-neutral-launch-executor-consume-family-alignment.md`
3. Unlocks / impacts successors:
   - `Opportunity 2` lane closeout
   - `O3-T1` biztonsagosabb nyitasa, mert a residual public/read-model retained ownership is eltunik
4. Task-list impact:
   - ez az `Opportunity 2` residual read-model/public closeout slice-a
   - kulon lett bontva a meta-review gate workflow/defaults cleanup utan

### Canonical Contract Anchors

1. Source-of-truth anchors:
   - `plans/actor-runtime-interface-post-phaseE-successor-plan-v1.md`
   - `plans/actor-runtime-interface-topology-neutral-delivery-executor-contract-note-v1.md`
   - `src/v11/application/approval/approvalCommandContract.ts`
   - `src/v11/shared/delivery/tmuxDeliveryContract.ts`
   - `src/v11/shared/ports/tmuxDelivery.ts`
   - `src/v11/shared/ports/uiRouter.ts`
   - `src/v11/defaults/ui/routerDefaults.ts`
   - `src/index.ts`
2. Canonical elements:
   - `DeliveryAck`
   - `ApprovalDecisionDeliverySignal.status`
   - `accepted | rejected`
3. Compat elements:
   - `EmitTmuxDeliveryNotificationResult`
   - retained repo-root `EmitTmuxDeliveryNotification*` exports
4. Forbidden reinterpretations:
   - `delivered: boolean` nem promotalhato vissza canonical UI truthra;
   - a UI/public target contract nem talalhat ki harmadik neutral-sounding, de source-anchor nelkuli vocabularyt.
5. `drift_status`: `split_from_previous_overwide_task`

### Scope Reality / Shape Proof

1. Inspected entrypoints / call-sites:
   - `src/v11/application/approval/approvalCommandContract.ts`
   - `src/v11/shared/ports/uiRouter.ts`
   - `src/v11/defaults/ui/routerDefaults.ts`
   - `src/v11/infrastructure/ui/routerDependencies.ts`
   - `src/index.ts`
2. Actual touched scope:
   - primary bounded-task shape: `activation_or_read_model`
   - secondary shape: `N/A`
3. Producer behavior touched:
   - `no`
4. Why the declared shape matches reality:
   - a current residual gap itt projection/export/read-model fallout;
   - nincs meta-review gate workflow/defaults behavior ugyanebben a filecsaladban.

### Authority Boundary Map

1. `authority_producer`
   - `emitDeliveryNotificationAck(...)`
   - predecessor-owned baseline
2. `persisted_authority`
   - `N/A`
3. `internal_execution_consumers`
   - none in scope
4. `workflow_orchestration_consumers`
   - none in scope
5. `read_model_consumers`
   - `src/v11/shared/ports/uiRouter.ts`
   - `src/v11/defaults/ui/routerDefaults.ts`
   - `src/v11/infrastructure/ui/routerDependencies.ts`
   - `src/index.ts`
6. `cleanup_recovery_consumers`
   - deferred
7. Export surfaces closed in this phase:
   - UI/router delivery signal contract
   - repo-root/public delivery exports

### In Scope

1. A UI/router delivery signal contract neutral read-model/public vocabularyra allitasa.
2. A router defaults mapping alignmentje a current neutral approval delivery signal semanticshez.
3. A repo-root/public neutral delivery export parity additive felhuzasa.
4. A kapcsolodo UI tests frissitese.

### Out of Scope

1. Meta-review gate workflow/defaults cleanup.
2. Delivery vagy launch producer rewrite.
3. Retained export breaking removal.
4. Generic executor registry.

### Safety Defaults

1. A neutral UI/public contract explicit same-authority projection legyen.
2. A retained `EmitTmuxDeliveryNotification*` surface maradhat compat statuszban.
3. Ha egy kulso consumer retained shape-et igenyel, az explicit compat projection legyen, ne canonical shared truth.

### Contract Boundary / Blast Radius

1. `contract_boundary_override`: `yes`
2. Erintett contract:
   - UI/router delivery signal contract
   - repo-root/public delivery export surface

### Complexity Risk Gate

1. `authority_risk`: `1`
2. `surface_spread`: `1`
3. `identity_join_risk`: `1`
4. `activation_coupling`: `1`
5. `prerequisite_risk`: `1`
6. `acceptance_multiplicity`: `1`
7. `risk_score`: `6`
8. `single-task allowed`: `yes`
9. Split note:
   - a workflow/defaults meta-review gate cleanup explicitten `O2-T6`-ban marad;
   - ez a task mar csak read-model/public fallout.

## L1 - Change Contract

### 0) Domain / Control Contract

| Item | Rule | Implementation Consequence | Priority | Timing |
|---|---|---|---|---|
| Business invariant | UI/public delivery ugyanarra az authorityra uljon, mint az approval lane. | No retained boolean truth primary sourcekent. | P1 | required-now |
| Control model | Neutral approval delivery signal a source anchor. | UI contract es mapper ehhez igazodik. | P1 | required-now |
| Forbidden fallback | Harmadik delivery vocabulary tilos. | Existing neutral semantics explicit projectionjat kell hasznalni. | P1 | required-now |
| Public compatibility | Retained exports nem torhetnek inventory nelkul. | Neutral exportok additive modon menjenek be. | P1 | required-now |

### 0a) Canonical Contract Preservation

| Element | Current Role | Target Role | Preservation Rule | Priority | Timing |
|---|---|---|---|---|---|
| `ApprovalDecisionDeliverySignal.status` | neutral approval signal anchor | neutral approval signal anchor | `accepted | rejected` semantics valtozatlan | P1 | required-now |
| `EmitTmuxDeliveryNotificationResult` | retained compat/public shape | retained compat/public shape | nem lehet canonical UI contract | P1 | required-now |
| retained root exports | compat surface | compat surface | breaking removal nem megengedett | P1 | required-now |

### 0b) Shared Contract Compatibility

| Shared Contract | Current Consumers Inventory | Change Type (`additive|breaking|N/A`) | This Task Action | Deferred Alignment |
|---|---|---|---|---|
| UI/router delivery signal contract | uiRouter + router defaults + ui tests | breaking in-scope local realignment | neutral UI/public signal shape-re all | retained compat projection csak explicit helyen |
| repo-root/public delivery exports | external inventory ismeretlen | additive | neutral delivery export parity hozzaadasa | retained export cleanup deferred |

### 1) Plan Linkage and Successor Impact

| Item | Value | Priority | Timing |
|---|---|---|---|
| Parent plan gap | retained delivery read-model/public vocabulary | P1 | required-now |
| Successor unlocked | `Opportunity 2` lane closeout | P1 | required-now |
| Explicitly not closed here | retained export breaking removal | P1 | required-now |

### 2) Call-Site Matrix

| ID | File | Entry / Surface | Current | Target | Why Here | Priority | Timing | Evidence |
|---|---|---|---|---|---|---|---|---|
| CS1 | `src/v11/shared/ports/uiRouter.ts` | UI delivery signal contract | retained `EmitTmuxDeliveryNotificationResult` | neutral UI/public delivery signal | contract owner itt latszik | P1 | required-now | code diff |
| CS2 | `src/v11/defaults/ui/routerDefaults.ts` | UI signal mapping | neutral -> retained boolean projection | neutral -> neutral projection | read-model fallout itt zarhato | P1 | required-now | `tests/core/ui/router.test.ts` |
| CS3 | `src/v11/infrastructure/ui/routerDependencies.ts` | UI dependency loading | current router contract | aligned router contract | dependency surface parity | P1 | required-now | code diff |
| CS4 | `src/index.ts` | root public delivery exports | retained-only export surface | additive neutral delivery exports retained parityvel | public fallout itt zarhato | P1 | required-now | code diff |
| CS5 | tests | UI router coverage | retained assumptions | neutral UI/public contract assertions | closeout tests kellenek | P1 | required-now | test diff |

### 3) Data and Interface Contract

| Contract | Current | Target | Required Fields | Optional Fields | Compatibility | Priority | Timing |
|---|---|---|---|---|---|---|---|
| UI delivery signal | retained `EmitTmuxDeliveryNotificationResult` | neutral delivery signal same-authority projection | `status`, `message` | `sessionName`, `targetPaneIndex`, `deliveryTargetReasonCode`, `reason`, `reason_code` | in-scope local realignment | P1 | required-now |
| Root public delivery exports | retained `EmitTmuxDeliveryNotification*` | neutral delivery input/ack/helper exportok retained parityvel | exact shared neutral names | retained aliases | additive | P1 | required-now |

### 4) Implementation Shape

| Item | Value | Priority | Timing |
|---|---|---|---|
| Primary shape | `activation_or_read_model` | P1 | required-now |
| Secondary shape | `N/A` | P1 | required-now |
| Producer touched | `no` | P1 | required-now |
| Coordination hardening | `no` | P2 | later |
| Fail-closed hardening | inherited, not primary | P1 | required-now |

### 5) Validation Matrix

| ID | Scenario | Setup | Expected Result | Priority | Evidence |
|---|---|---|---|---|---|
| T1 | UI approve mapping | approval delivery signal adott | UI result neutral signal shape-et ad vissza | P1 | `tests/core/ui/router.test.ts` |
| T2 | UI rework mapping | immediate rework signal adott | neutral signal semantics preserved | P1 | `tests/core/ui/router.test.ts` |
| T3 | rejected signal fields | rejected approval signal optional okokkal | `reason` / `reason_code` explicit marad | P1 | code/test diff |
| T4 | root export parity | repo-root export surface olvasasa | neutral delivery exportok elerhetok retained parity mellett | P1 | code diff |

### 6) Baseline Preservation

| Baseline | Must Preserve | Allowed Change | Forbidden Change | Priority | Timing |
|---|---|---|---|---|---|
| approval neutral signal semantics | `accepted | rejected` + optional reason metadata | UI/public projection alignment | third vocabulary | P1 | required-now |
| retained public exports | existing elerhetoseg | additive neutral parity | breaking removal | P1 | required-now |
| upstream producer truth | current delivery/launch behavior | none | producer rewrite | P1 | required-now |

### 7) Closure-Budget Summary

| Item | Value | Priority | Timing |
|---|---|---|---|
| Closure buckets touched | `shared_contract`, `read_model_consumers` | P1 | required-now |
| Intentionally collapsed | UI contract + public export parity | P1 | required-now |
| Why safe | ugyanannak a neutral delivery projectionnak a public/read-model falloutja, producer es workflow contract nelkul | P1 | required-now |
| Deferred closures | retained export breaking cleanup | P1 | required-now |

### 8) Precondition and Side-Effect Boundary

| Boundary | Rule | Priority | Timing |
|---|---|---|---|
| Validations before side effects | neutral UI/public shape explicit anchorral legyen definialva, mielott mapper/export atall | P1 | required-now |
| Forbidden early side effects | ne valtozzon producer vagy meta-review workflow contract | P1 | required-now |
| Invalid/precondition-failure behavior | rejected signal explicit rejected marad | P1 | required-now |
| Existing side-effect boundary preserved | ez read-model/public slice, nincs uj runtime side effect | P1 | required-now |

## L2 - Implementation Notes (Optional)

1. [later-hardening] Ha kulso consumer inventory kesobb ismert, a retained exportok explicit compat jelolese erositheto.

## Hardening Backlog (Optional)

| ID | Item | Layer | Priority | Timing | Source | Proposed Action |
|---|---|---|---|---|---|---|
| H1 | retained root exportok explicit compat jelolese | L2 | P2 | later-hardening | `O2-T7` drafting | JSDoc vagy docs note |

## Review Control

1. Ne fogadjunk el olyan implementaciot, amely meta-review gate workflow/defaults scope-ot is behuz.
2. Ne fogadjunk el retained export breaking removal-t explicit inventory nelkul.
3. Ne fogadjunk el source-anchor nelkuli uj delivery vocabularyt.

## Spec Lock

Mark task as `IMPLEMENTABLE` when:

1. a UI/router delivery signal mar neutral same-authority projection;
2. a router defaults mar nem booleant tekint primary truthnak;
3. a repo-root/public surface additiven exportalja a neutral delivery contractot;
4. a retained `EmitTmuxDeliveryNotification*` surfaces explicit compat statuszban maradnak;
5. a kapcsolodo UI tests bizonyitjak a preserved semantics-et.

## Assumptions

1. A neutral UI/public projection explicit anchorja lehet a current approval delivery signal semantics.
2. A retained export breaking cleanup nem required-now.

## Open Questions

1. Nincs blocker-szintu nyitott kerdes a current code- es plan-context alapjan.
