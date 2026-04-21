---
artifact_type: task
artifact_id: task_actor_runtime_interface_opportunity2_task9_meta_review_gate_workflow_runtime_capability_residual_closeout_v1
title: "Actor Runtime Interface Opportunity 2 Task 9: Meta-Review Gate Workflow Runtime Capability Residual Closeout"
status: implementable
phase: post-phaseE
target_files:
  - src/v11/shared/metaReviewGate/metaReviewGateTmuxCapabilities.ts
  - src/v11/shared/metaReviewGate/metaReviewGateTypes.ts
  - src/v11/shared/metaReviewGate/metaReviewGateCommandContract.ts
  - src/v11/shared/metaReviewGate/metaReviewGateCommandApi.ts
  - src/v11/shared/metaReviewGate/metaReviewGateCommandRuntime.ts
  - src/v11/shared/metaReviewGate/metaReviewGateApplyContext.ts
  - src/v11/shared/metaReviewGate/metaReviewGateApply.ts
  - src/v11/application/metaReviewGate/metaReviewGateCommandContract.ts
  - src/v11/application/metaReviewGate/metaReviewGateApplyContext.ts
  - src/v11/application/metaReviewGate/metaReviewGateDependencyDefaults.ts
  - src/v11/application/metaReviewGate/metaReviewGateCommandDefaults.ts
  - src/v11/application/metaReviewGate/metaReviewGateNotify.ts
  - src/v11/application/metaReviewGate/metaReviewGatePaneBinding.ts
  - src/v11/application/metaReviewGate/emitMetaReviewGateV11.ts
  - src/v11/defaults/metaReviewGate/metaReviewGateCommandDefaults.ts
  - tests/core/bubble/metaReviewGate.test.ts
  - tests/contracts/v11/metaReviewGate.contract.runner.ts
  - tests/contracts/v11/metaReviewGate.contract.test.ts
  - tests/v11/application/metaReview/metaReviewGateNotify.test.ts
  - tests/v11/application/metaReview/metaReviewGatePaneBinding.test.ts
prd_ref: null
plan_ref: plans/actor-runtime-interface-post-phaseE-successor-plan-v1.md
system_context_ref: docs/pairflow-initial-design.md
owners:
  - "felho"
---

# Task: Actor Runtime Interface Opportunity 2 Task 9: Meta-Review Gate Workflow Runtime Capability Residual Closeout

## Current Codebase Check (2026-04-19)

1. A meta-review gate lane current-tree szinten mar explicit observation truthot hasznal:
   - `MetaReviewRuntimeDeliveryObservation`
   - `confirmed | uncertain | failed`
2. Ugyanakkor a shared/application/defaults lane current-tree szinten meg mindig retained raw `tmux` primitive nev mezokkel ownershipolja a gate-local runtime capabilityt:
   - `runTmux`
   - `maybeAcceptClaudeTrustPrompt`
   - `sendAndSubmitTmuxPaneMessage`
   - `submitTmuxPaneInput`
   - `respawnTmuxPaneCommand`
3. A residual ownership mar nem standalone workflow runner authoritykent latszik, hanem nested gate-local capability es defaults/wrapper wiring formajaban:
   - `src/v11/shared/metaReviewGate/metaReviewGateTypes.ts`
   - `src/v11/application/metaReviewGate/metaReviewGateDependencyDefaults.ts`
   - `src/v11/application/metaReviewGate/metaReviewGateCommandDefaults.ts`
   - `src/v11/defaults/metaReviewGate/metaReviewGateCommandDefaults.ts`
   - `src/v11/application/metaReviewGate/metaReviewGateNotify.ts`
   - `src/v11/application/metaReviewGate/metaReviewGatePaneBinding.ts`
4. Az adjacent command/apply export shell-ek current-tree szinten mar inkabb forwarding/adjacency szerepuek, nem a residual elsodleges ownerjei:
   - `src/v11/shared/metaReviewGate/metaReviewGateCommandContract.ts`
   - `src/v11/shared/metaReviewGate/metaReviewGateCommandApi.ts`
   - `src/v11/shared/metaReviewGate/metaReviewGateCommandRuntime.ts`
   - `src/v11/shared/metaReviewGate/metaReviewGateApplyContext.ts`
   - `src/v11/shared/metaReviewGate/metaReviewGateApply.ts`
   - `src/v11/application/metaReviewGate/metaReviewGateCommandContract.ts`
   - `src/v11/application/metaReviewGate/metaReviewGateApplyContext.ts`
   - `src/v11/application/metaReviewGate/emitMetaReviewGateV11.ts`
5. A retained runtime adapter current-tree szinten tovabbra is valid implementation detail:
   - `tmux` runner
   - trust-prompt acceptance helper
   - pane submit
   - pane respawn
   - a raw runner vocabulary source anchorja `src/v11/shared/metaReviewGate/metaReviewGateTmuxCapabilities.ts`, de ez retained capability-detail marad, nem kulon shared workflow authority
6. Emiatt a current residual gap nem observation-truth rewrite es nem generic executor alapozas:
   - ez a workflow contract ownership tovabbi szukitese
7. A UI/public delivery read-model scope current-tree szinten mar kulon, lezart predecessor task:
   - ezt nem szabad visszahuzni ebbe a lane-be

## L0 - Policy

### Goal

1. A meta-review gate workflow-level shared/application contractbol a megmaradt raw `tmux` primitive ownership eltuntetese vagy gate-local retained capability vocabulary moge zarasa.
2. A retained `tmux` defaults maradhatnak adapter/default implementaciokent.
3. A `MetaReviewRuntimeDeliveryObservation` maradjon az egyetlen runtime truth.
4. Ne csusszon ebbe a taskba:
   - generic executor registry vagy non-`tmux` runtime platform,
   - UI/public read-model cleanup,
   - delivery/launch producer rewrite.

### Domain / Control Model Summary

1. Business invariant:
   - a meta-review gate workflow route nem nyugodhat raw adapter primitive nev ownershipon;
   - a gate lane canonical truthja observation, nem side effect success.
2. Control model:
   - retained runtime primitivek maradhatnak gate-local capability vagy adapter-default szerepben;
   - a shared/application contract nem hordozhat kulon raw `runTmux` authorityt workflow ownerkent.
3. Read-path rule:
   - workflow-visibleen az observation es a notify/pane-binding seam marad a consume pont;
   - ha runner access megmarad, az family-local nested capabilityben legyen, ne standalone shared authoritykent.
4. Forbidden fallback:
   - source-anchor nelkuli generic `runCommand`/executor vocabulary bevezetese;
   - raw `tmux` primitivek tovabbi ownershipja a shared workflow contractban;
   - observation semantics lazitasa.
5. Allowed resolution path:
   - gate-local runtime capability contract szukitese;
   - retained `tmux` defaults explicit adapter-default implementaciokent maradnak.
6. Missing-data rule:
   - missing capability tovabbra is fail-closed observationt vagy explicit hibat eredmenyez;
   - nincs synthetic success.
7. Phase boundary:
   - shared contract closure: owned here
   - internal_execution_closure: owned here
   - workflow_orchestration_closure: owned here
   - read_model_closure: predecessor-owned
   - producer closure: predecessor-owned

### Plan Linkage

1. Parent plan gap:
   - `O2-T6` utan current-tree szinten megmaradt raw `tmux` primitive nev ownership a meta-review gate nested runtime capability es defaults/wrapper wiring contractban.
2. Depends on:
   - `plans/actor-runtime-interface-post-phaseE-successor-plan-v1.md`
   - `plans/actor-runtime-interface-topology-neutral-delivery-executor-contract-note-v1.md`
   - `plans/archive/tasks/actor-runtime-interface-opportunity2-task6-meta-review-gate-runtime-capability-decoupling.md`
3. Unlocks / impacts successors:
   - `Opportunity 2` closeout claim megerositese
   - `O3-T1` csak ezutan nyithato ugy, hogy a gate lane mar nem szivarogtat raw tmux workflow ownershipot
4. Task-list impact:
   - ez residual closeout task a lezart `O2-T6` utan
   - nem replacement es nem generic executor expansion

### Canonical Contract Anchors

1. Source-of-truth anchors:
   - `plans/actor-runtime-interface-post-phaseE-successor-plan-v1.md`
   - `plans/actor-runtime-interface-topology-neutral-delivery-executor-contract-note-v1.md`
   - `plans/archive/tasks/actor-runtime-interface-opportunity2-task6-meta-review-gate-runtime-capability-decoupling.md`
   - `src/v11/shared/metaReviewGate/metaReviewGateTmuxCapabilities.ts`
   - `src/v11/shared/metaReviewGate/metaReviewGateTypes.ts`
   - `src/v11/shared/metaReviewGate/metaReviewGateApply.ts`
   - `src/v11/application/metaReviewGate/metaReviewGateNotify.ts`
   - `src/v11/application/metaReviewGate/metaReviewGatePaneBinding.ts`
   - `src/v11/defaults/metaReviewGate/metaReviewGateCommandDefaults.ts`
   - `tests/contracts/v11/metaReviewGate.contract.runner.ts`
2. Canonical elements:
   - `MetaReviewRuntimeDeliveryObservation`
   - `confirmed | uncertain | failed`
3. Compat elements:
   - `MetaReviewGateTmuxRunner`
   - `maybeAcceptClaudeTrustPrompt`
   - retained `tmux` runner/default implementations
   - pane submit/respawn helpers
4. Forbidden reinterpretations:
   - retained `tmux` defaults nem lehetnek shared workflow authorityk;
   - a `MetaReviewGateTmuxRunner` helper type nem nevezheto ki kulon canonical workflow authoritynak;
   - a residual cleanup nem nyithat uj generic executor lane-t;
   - az observation contract nem downgrade-olhato diagnostics-only alakra.
5. `drift_status`: `residual_gap_discovered_after_meta_review_gate_cleanup`

### Scope Reality / Shape Proof

1. Inspected entrypoints / call-sites:
   - `src/v11/shared/metaReviewGate/metaReviewGateTmuxCapabilities.ts`
   - `src/v11/shared/metaReviewGate/metaReviewGateTypes.ts`
   - `src/v11/shared/metaReviewGate/metaReviewGateApply.ts`
   - `src/v11/shared/metaReviewGate/metaReviewGateApplyContext.ts`
   - `src/v11/application/metaReviewGate/metaReviewGateDependencyDefaults.ts`
   - `src/v11/application/metaReviewGate/metaReviewGateCommandDefaults.ts`
   - `src/v11/application/metaReviewGate/metaReviewGateNotify.ts`
   - `src/v11/application/metaReviewGate/metaReviewGatePaneBinding.ts`
   - `src/v11/defaults/metaReviewGate/metaReviewGateCommandDefaults.ts`
   - `tests/contracts/v11/metaReviewGate.contract.runner.ts`
2. Actual touched scope:
   - primary bounded-task shape: `consumer_family_alignment`
   - justified secondary shape: `contract_or_persisted_authority_foundation`
3. Producer behavior touched:
   - `no`
4. Why the declared shape matches reality:
   - a same-family meta-review gate workflow/internal contract sugarzasa zarodik itt;
   - a residual elsodlegesen a nested capability type surface-ben, a notify/pane-binding consume pathban, es a defaults/wrapper wiringben maradt meg;
   - a contract-runner test fan-out explicit scope-resz, mert a runtime capability shape-et valosan ott epitjuk fel es injektaljuk parity/contract coverage alatt;
   - az adjacent command/apply export shell-ek csak annyiban tartoznak ide, amennyiben a type/export surface-et kovetniuk kell;
   - nincs public/read-model vagy producer fallout.

### Authority Boundary Map

1. `authority_producer`
   - upstream delivery/launch producers
   - closed predecessor baseline
2. `persisted_authority`
   - `N/A`
3. `internal_execution_consumers`
   - `src/v11/application/metaReviewGate/metaReviewGateNotify.ts`
   - `src/v11/application/metaReviewGate/metaReviewGatePaneBinding.ts`
4. `workflow_orchestration_consumers`
   - `src/v11/shared/metaReviewGate/**`
   - `src/v11/application/metaReviewGate/emitMetaReviewGateV11.ts`
   - `src/v11/application/metaReviewGate/metaReviewGateDependencyDefaults.ts`
   - `src/v11/application/metaReviewGate/metaReviewGateCommandDefaults.ts`
   - `src/v11/defaults/metaReviewGate/metaReviewGateCommandDefaults.ts`
5. `read_model_consumers`
   - explicit out of scope
6. `cleanup_recovery_consumers`
   - deferred
7. Export surfaces closed in this phase:
   - none

### In Scope

1. Meta-review gate shared/application runtime capability contract szukitese.
2. Default injection, wrapper merge, es internal execution consume alignmentje, hogy a retained primitivek adapter statuszban maradjanak.
3. Adjacent export shim-ek frissitese csak akkor, ha a type surface a szukites miatt mozog.
4. Kapcsolodo meta-review gate tests frissitese.
   - minimum notify + pane-binding coveragevel, hogy a gate-local runtime capability szukites teljes fan-outja bizonyithato legyen.
   - contract-runner parity coveragevel is, ha a runtime capability shape vagy helper inventory valtozik.

### Out of Scope

1. Generic executor registry vagy non-`tmux` runtime platform.
2. UI/public delivery read-model surfaces.
3. Delivery vagy launch producer contractok.
4. Repo-root export cleanup.

### Safety Defaults

1. Az observation semantics valtozatlan marad.
2. Missing capability fail-closed marad.
3. Retained `tmux` helper mezok csak adapter/default statuszban maradhatnak.
4. Adjacent export shell-eket nem kell primer scope-kent atminositeni, ha csak a gate-local capability szukitest kovetik.

### Contract Boundary / Blast Radius

1. `contract_boundary_override`: `yes`
2. Erintett contract:
   - meta-review gate workflow runtime capability contract
   - internal meta-review gate execution wiring

### Complexity Risk Gate

1. `authority_risk`: `1`
2. `surface_spread`: `1`
3. `identity_join_risk`: `0`
4. `activation_coupling`: `0`
5. `prerequisite_risk`: `1`
6. `acceptance_multiplicity`: `1`
7. `risk_score`: `4`
8. `single-task allowed`: `yes`
9. Split note:
   - delivery consume residual kulon task
   - public/read-model cleanup mar lezart
10. Closure-budget triage:
   - closure buckets touched: `shared_contract`, `internal_execution_consumers`, `workflow_orchestration_consumers`
   - intentionally collapsed closures: gate-local contract cleanup + same-family consume alignment
   - explicitly deferred closures: `authority_producer`, `read_model_consumers`, `cleanup_recovery_consumers`

## L1 - Change Contract

### 0) Domain / Control Contract

| Item | Rule | Implementation Consequence | Priority | Timing |
|---|---|---|---|---|
| Business invariant | Observation az egyetlen gate truth. | Workflow contract nem raw primitive nyelven beszel. | P1 | required-now |
| Control model | Retained primitivek csak adapter/default szerepben maradhatnak. | Shared/application contractot at kell rendezni. | P1 | required-now |
| Forbidden fallback | Nincs uj generic executor seam. | Csak gate-local szukites elfogadhato. | P1 | required-now |
| Missing-data rule | Missing capability fail-closed marad. | Nincs synthetic success. | P1 | required-now |

### 0a) Canonical Contract Preservation

| Element | Current Role | Target Role | Preservation Rule | Priority | Timing |
|---|---|---|---|---|---|
| `MetaReviewRuntimeDeliveryObservation` | canonical gate truth | canonical gate truth | `confirmed | uncertain | failed` nem valtozik | P1 | required-now |
| retained `tmux` defaults | adapter implementation | adapter implementation | shared authority role megszunik | P1 | required-now |
| downstream converged caller compatibility | current wiring baseline | preserved baseline | no consumer-side rewrite requirement | P1 | required-now |

### 0b) Shared Contract Compatibility

| Shared Contract | Current Consumers Inventory | Change Type (`additive|breaking|N/A`) | This Task Action | Deferred Alignment |
|---|---|---|---|---|
| meta-review gate runtime capability contract | shared types, apply wiring, defaults, notify, pane-binding, tests | additive/narrowing | gate-local capability contract and explicit adapter-default status | generic executor work |

### 1) Plan Linkage and Successor Impact

| Item | Value | Priority | Timing |
|---|---|---|---|
| Parent plan gap | raw tmux primitive ownership a gate workflow contractban | P1 | required-now |
| Successor unlocked | stronger `Opportunity 2` closeout claim | P1 | required-now |
| Explicitly not closed here | public/read-model cleanup, producer rewrite, generic executor lane | P1 | required-now |

### 2) Call-Site Matrix

| ID | File | Entry / Surface | Current | Target | Why Here | Priority | Timing | Evidence |
|---|---|---|---|---|---|---|---|---|
| CS1 | `src/v11/shared/metaReviewGate/metaReviewGateTypes.ts` | shared runtime capability types | raw `tmux` primitive names are direct shared owners | gate-local capability owner with retained helper names only as adapter details or nested compat | shared ownership itt latszik | P1 | required-now | code diff |
| CS2 | `src/v11/shared/metaReviewGate/metaReviewGateApply.ts` + `metaReviewGateApplyContext.ts` | apply wiring | workflow layer still sees raw primitive ownership | workflow layer only notify/pane-binding seamet ownershipol | orchestration boundary itt zarhato | P1 | required-now | code diff |
| CS3 | `src/v11/application/metaReviewGate/metaReviewGateNotify.ts` | notify runtime consume | direct `runTmux`/submit helper ownership | gate-local capability consume | internal execution family | P1 | required-now | code/test diff |
| CS4 | `src/v11/application/metaReviewGate/metaReviewGatePaneBinding.ts` | pane-binding runtime consume | direct `runTmux`/respawn helper ownership | gate-local capability consume | internal execution family | P1 | required-now | code/test diff |
| CS5 | `src/v11/defaults/metaReviewGate/metaReviewGateCommandDefaults.ts` + `emitMetaReviewGateV11.ts` | defaults injection | retained primitivek shared workflow dependencykent vannak injektalva | adapter-default injection explicit gate-local capabilitykent marad | defaults ownership itt zarul | P1 | required-now | code diff |
| CS6 | adjacent re-export shimek | command API/runtime/contract exports | type surface drift kockazat | export surface koveti a szukitest, generic executor drift nelkul | compile-time parity kell | P1 | required-now | typecheck |

### 3) Data and Interface Contract

| Contract | Current | Target | Required Fields | Optional Fields | Compatibility | Priority | Timing |
|---|---|---|---|---|---|---|---|
| gate runtime capability contract | raw primitive fields direct ownerkent | gate-local capability owner, retained primitivek adapter detailkent | submission capability, pane-binding capability, observation contract | helper support fields | additive/narrowing | P1 | required-now |
| observation result | `MetaReviewRuntimeDeliveryObservation` | unchanged | `status`, `reasonCode`, `message` | none | preserved | P1 | required-now |

### 4) Implementation Shape

| Item | Value | Priority | Timing |
|---|---|---|---|
| Primary shape | `consumer_family_alignment` | P1 | required-now |
| Secondary shape | `contract_or_persisted_authority_foundation` | P1 | required-now |
| Producer touched | `no` | P1 | required-now |
| Coordination hardening | `no` | P2 | later |
| Fail-closed hardening | inherited, not primary | P1 | required-now |

### 5) Validation Matrix

| ID | Scenario | Setup | Expected Result | Priority | Evidence |
|---|---|---|---|---|---|
| T1 | notify capability alignment | runtime capability injected | notify path preserved, raw primitive ownership removed from shared contract | P1 | meta-review tests |
| T2 | pane-binding capability alignment | runtime capability injected | pane-binding path preserved, fail-closed behavior unchanged | P1 | pane-binding tests |
| T3 | defaults injection parity | default tmux helpers wired | retained defaults remain adapter-default implementations only | P1 | code/test diff |
| T4 | observation semantics preservation | confirmed/uncertain/failed paths exercised | same observation truth remains | P1 | contract tests |
| T5 | non-scope proof | diff reviewed | no UI/public or generic executor scope pulled in | P1 | diff review |

### 6) Baseline Preservation

| Baseline | Must Preserve | Allowed Change | Forbidden Change | Priority | Timing |
|---|---|---|---|---|---|
| observation semantics | explicit gate runtime truth | contract cleanup | truth downgrade | P1 | required-now |
| retained tmux runtime helpers | adapter implementation | adapter-default annotation/structure cleanup | generic executor rewrite | P1 | required-now |
| downstream caller compatibility | current converged integration | unchanged caller behavior | converged-side signature repair requirement | P1 | required-now |

### 7) Closure-Budget Summary

| Item | Value | Priority | Timing |
|---|---|---|---|
| Closure buckets touched | `shared_contract`, `internal_execution_consumers`, `workflow_orchestration_consumers` | P1 | required-now |
| Intentionally collapsed | same-family contract cleanup + consumer alignment | P1 | required-now |
| Why safe | a meta-review gate filecsaladban zarul producer/public fallout nelkul | P1 | required-now |
| Deferred closures | generic executor work, public/read-model, cleanup/recovery | P1 | required-now |

### 8) Precondition and Side-Effect Boundary

| Boundary | Rule | Priority | Timing |
|---|---|---|---|
| Validations before side effects | capability availability explicit legyen, mielott submit/respawn side effect tortenik | P1 | required-now |
| Forbidden early side effects | no new runtime action family or executor registry | P1 | required-now |
| Invalid/precondition-failure behavior | explicit fail-closed observation/error marad | P1 | required-now |
| Existing side-effect boundary preserved | submit/respawn retained adapter side effect marad | P1 | required-now |

## L2 - Implementation Notes (Optional)

1. [later-hardening] Ha a gate-local capability naming stabil, a retained helper field names kaphatnak explicit compat JSDoc jelolest.

## Review Control

1. Ne fogadjunk el UI/public read-model cleanupot ebben a taskban.
2. Ne fogadjunk el generic executor/runtime registry expandalast source anchor nelkul.
3. Ne fogadjunk el olyan zarlatot, ahol a shared workflow contract tovabbra is raw `runTmux` authorityt ownershipol.

## Spec Lock

Mark task as `IMPLEMENTABLE` when:

1. a meta-review gate shared/application contract mar nem raw `tmux` primitive ownershipon ul;
2. a retained `tmux` defaults explicit adapter-default statuszban maradnak;
3. a gate observation semantics valtozatlan;
4. a downstream caller compatibility megmarad consumer-side rewrite nelkul;
5. nincs generic executor vagy UI/public scope-behuzas.

## Assumptions

1. A meta-review gate residual lezarhato generic executor lane nyitasa nelkul.
2. A retained `tmux` adapter vocabulary family-local capabilitykent meg mindig eleg a jelenlegi runtimehoz.

## Open Questions

1. Nincs blocker-szintu nyitott kerdes a current code- es plan-context alapjan.
