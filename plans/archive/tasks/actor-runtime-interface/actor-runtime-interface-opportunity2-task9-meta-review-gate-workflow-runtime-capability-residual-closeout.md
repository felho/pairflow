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
  - tests/v11/application/metaReview/metaReviewGateEmit.test.ts
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
2. Ugyanakkor a shared/application/defaults lane current-tree szinten mar grouped `notify` / `paneBinding` capability surface-re allt, de ez a grouped shape meg mindig retained raw `tmux` primitive nev mezokkel ownershipolja a gate-local runtime capabilityt:
   - `runTmux`
   - `maybeAcceptClaudeTrustPrompt`
   - `sendAndSubmitTmuxPaneMessage`
   - `submitTmuxPaneInput`
   - `respawnTmuxPaneCommand`
3. A residual ownership mar nem standalone workflow runner authoritykent latszik, hanem nested gate-local capability es a dependency-defaults + V11 wrapper merge retegekben:
   - `src/v11/shared/metaReviewGate/metaReviewGateTypes.ts`
   - `src/v11/application/metaReviewGate/metaReviewGateDependencyDefaults.ts`
   - `src/v11/application/metaReviewGate/metaReviewGateCommandDefaults.ts`
   - `src/v11/application/metaReviewGate/emitMetaReviewGateV11.ts`
   - `src/v11/defaults/metaReviewGate/metaReviewGateCommandDefaults.ts`
   - `src/v11/application/metaReviewGate/metaReviewGateNotify.ts`
   - `src/v11/application/metaReviewGate/metaReviewGatePaneBinding.ts`
4. Az adjacent command/apply export shell-ek current-tree szinten tovabbra is koveto/forwarding szerepuek, de type-surface parity miatt explicit same-family follow scope-ban maradnak:
   - `src/v11/shared/metaReviewGate/metaReviewGateCommandContract.ts`
   - `src/v11/shared/metaReviewGate/metaReviewGateCommandApi.ts`
   - `src/v11/shared/metaReviewGate/metaReviewGateCommandRuntime.ts`
   - `src/v11/shared/metaReviewGate/metaReviewGateApplyContext.ts`
   - `src/v11/shared/metaReviewGate/metaReviewGateApply.ts`
   - `src/v11/application/metaReviewGate/metaReviewGateCommandContract.ts`
   - `src/v11/application/metaReviewGate/metaReviewGateApplyContext.ts`
5. A retained runtime adapter current-tree szinten tovabbra is valid implementation detail:
   - `tmux` runner
   - trust-prompt acceptance helper
   - pane submit
   - pane respawn
   - a raw runner vocabulary source anchorja `src/v11/shared/metaReviewGate/metaReviewGateTmuxCapabilities.ts`, de ez retained capability-detail marad, nem kulon shared workflow authority
6. Emiatt a current residual gap nem observation-truth rewrite es nem generic executor alapozas:
   - ez a grouped workflow runtime capability ownership es a retained helperek wrapper/default retegeken atmeno tovabbi szukitese
7. A UI/public delivery read-model scope current-tree szinten mar kulon, lezart predecessor task:
   - ezt nem szabad visszahuzni ebbe a lane-be

## L0 - Policy

### Goal

1. A meta-review gate workflow-level shared/application contractbol a megmaradt raw `tmux` primitive ownership eltuntetese vagy gate-local retained capability vocabulary moge zarasa.
   - a grouped `notify` / `paneBinding` capability forma current-tree baselinekent megmaradhat
2. A retained `tmux` defaults maradhatnak adapter/default implementaciokent.
3. A `MetaReviewRuntimeDeliveryObservation` maradjon az egyetlen runtime truth.
4. A downstream caller compatibility maradjon consumer-side rewrite nelkul megtarthato.
5. Ne csusszon ebbe a taskba:
   - generic executor registry vagy non-`tmux` runtime platform,
   - UI/public read-model cleanup,
   - delivery/launch producer rewrite.

### Domain / Control Model Summary

1. Business invariant:
   - a meta-review gate workflow route nem nyugodhat raw adapter primitive nev ownershipon;
   - a gate lane canonical truthja observation, nem side effect success.
2. Control model:
   - retained runtime primitivek maradhatnak gate-local capability vagy adapter-default szerepben;
   - a shared/application contract nem hordozhat grouped capability-be csomagolt raw `runTmux` authorityt workflow ownerkent;
   - a wrapper/default retegek nem erosithetik vissza workflow-level canonba a retained helper ownershipot.
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
   - `docs/actor-runtime-interface/topology-neutral-delivery-executor-contract-note-v1.md`
   - `plans/archive/tasks/actor-runtime-interface-opportunity2-task6-meta-review-gate-runtime-capability-decoupling.md`
3. Unlocks / impacts successors:
   - az archived `O2-T8` mar lezart sibling slice; ez a task a megmaradt meta-review gate residualt pontosítja, nem az archived slice ujranyitasat.
   - ha ez a slice is lezarul, az `Opportunity 2` closeout claim mar nem ezen a lane-en marado belso residualon fog mulni
   - `O3-T1` csak ezutan a megmaradt meta-review gate residual slice utan nyithato
4. Task-list impact:
   - ez residual closeout task a lezart `O2-T6` utan
   - nem replacement es nem generic executor expansion

### Canonical Contract Anchors

1. Source-of-truth anchors:
   - `plans/actor-runtime-interface-post-phaseE-successor-plan-v1.md`
   - `docs/actor-runtime-interface/topology-neutral-delivery-executor-contract-note-v1.md`
   - `plans/archive/tasks/actor-runtime-interface-opportunity2-task6-meta-review-gate-runtime-capability-decoupling.md`
   - `src/v11/shared/metaReviewGate/metaReviewGateTmuxCapabilities.ts`
   - `src/v11/shared/metaReviewGate/metaReviewGateTypes.ts`
   - `src/v11/shared/metaReviewGate/metaReviewGateCommandContract.ts`
   - `src/v11/shared/metaReviewGate/metaReviewGateCommandApi.ts`
   - `src/v11/shared/metaReviewGate/metaReviewGateCommandRuntime.ts`
   - `src/v11/shared/metaReviewGate/metaReviewGateApplyContext.ts`
   - `src/v11/shared/metaReviewGate/metaReviewGateApply.ts`
   - `src/v11/application/metaReviewGate/metaReviewGateCommandContract.ts`
   - `src/v11/application/metaReviewGate/metaReviewGateApplyContext.ts`
   - `src/v11/application/metaReviewGate/metaReviewGateDependencyDefaults.ts`
   - `src/v11/application/metaReviewGate/metaReviewGateCommandDefaults.ts`
   - `src/v11/application/metaReviewGate/metaReviewGateNotify.ts`
   - `src/v11/application/metaReviewGate/metaReviewGatePaneBinding.ts`
   - `src/v11/application/metaReviewGate/emitMetaReviewGateV11.ts`
   - `src/v11/defaults/metaReviewGate/metaReviewGateCommandDefaults.ts`
   - `tests/v11/application/metaReview/metaReviewGateEmit.test.ts`
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
   - archived `O2-T8` nem keretezheto ujranyitott sibling gate-kent vagy tovabbra is nyitott residualkent;
   - az observation contract nem downgrade-olhato diagnostics-only alakra.
5. `drift_status`: `residual_gap_discovered_after_meta_review_gate_cleanup`

### Scope Reality / Shape Proof

1. Inspected entrypoints / call-sites:
   - `src/v11/shared/metaReviewGate/metaReviewGateTmuxCapabilities.ts`
   - `src/v11/shared/metaReviewGate/metaReviewGateTypes.ts`
   - `src/v11/shared/metaReviewGate/metaReviewGateCommandContract.ts`
   - `src/v11/shared/metaReviewGate/metaReviewGateCommandApi.ts`
   - `src/v11/shared/metaReviewGate/metaReviewGateCommandRuntime.ts`
   - `src/v11/shared/metaReviewGate/metaReviewGateApply.ts`
   - `src/v11/shared/metaReviewGate/metaReviewGateApplyContext.ts`
   - `src/v11/application/metaReviewGate/metaReviewGateCommandContract.ts`
   - `src/v11/application/metaReviewGate/metaReviewGateApplyContext.ts`
   - `src/v11/application/metaReviewGate/metaReviewGateDependencyDefaults.ts`
   - `src/v11/application/metaReviewGate/metaReviewGateCommandDefaults.ts`
   - `src/v11/application/metaReviewGate/emitMetaReviewGateV11.ts`
   - `src/v11/application/metaReviewGate/metaReviewGateNotify.ts`
   - `src/v11/application/metaReviewGate/metaReviewGatePaneBinding.ts`
   - `src/v11/defaults/metaReviewGate/metaReviewGateCommandDefaults.ts`
   - `tests/v11/application/metaReview/metaReviewGateEmit.test.ts`
   - `tests/contracts/v11/metaReviewGate.contract.test.ts`
   - `tests/v11/application/metaReview/metaReviewGateNotify.test.ts`
   - `tests/v11/application/metaReview/metaReviewGatePaneBinding.test.ts`
   - `tests/contracts/v11/metaReviewGate.contract.runner.ts`
   - `tests/contracts/v11/converged.contract.runner.ts`
2. Actual touched scope:
   - primary bounded-task shape: `consumer_family_alignment`
   - justified secondary shape: `contract_or_persisted_authority_foundation`
3. Producer behavior touched:
   - `no`
4. Why the declared shape matches reality:
   - a same-family meta-review gate workflow/internal contract sugarzasa zarodik itt;
   - a residual elsodlegesen a nested capability type surface-ben, a notify/pane-binding consume pathban, es a dependency-defaults + V11 wrapper merge retegekben maradt meg;
   - a contract-runner test fan-out explicit scope-resz, mert a runtime capability shape-et valosan ott epitjuk fel es injektaljuk parity/contract coverage alatt;
   - az adjacent command/apply export shell-ek csak annyiban tartoznak ide, amennyiben a type/export surface-et kovetniuk kell, nem primer targetkent;
   - nincs public/read-model vagy producer fallout.

### Target-File Interpretation

1. Primary expected edit family:
   - `src/v11/shared/metaReviewGate/metaReviewGateTypes.ts`
   - `src/v11/application/metaReviewGate/metaReviewGateDependencyDefaults.ts`
   - `src/v11/application/metaReviewGate/metaReviewGateCommandDefaults.ts`
   - `src/v11/application/metaReviewGate/metaReviewGateNotify.ts`
   - `src/v11/application/metaReviewGate/metaReviewGatePaneBinding.ts`
   - `src/v11/application/metaReviewGate/emitMetaReviewGateV11.ts`
   - `src/v11/defaults/metaReviewGate/metaReviewGateCommandDefaults.ts`
2. Conditional same-family follow surfaces:
   - `metaReviewGateTmuxCapabilities.ts`, `metaReviewGateApply*.ts`, az application-side `metaReviewGateApplyContext.ts`, es a shared/application command re-export shell-ek csak akkor erintettek, ha a capability naming vagy a runtime-forwarding surface tenylegesen mozog.
   - `tests/core/bubble/metaReviewGate.test.ts` csak akkor lesz kozvetlen edit-target, ha a same-family smoke coverage a capability-shape valtozasa miatt explicit igazitasra szorul.
   - `tests/contracts/v11/metaReviewGate.contract.test.ts`, `tests/v11/application/metaReview/metaReviewGateEmit.test.ts`, `tests/v11/application/metaReview/metaReviewGateNotify.test.ts`, es `tests/v11/application/metaReview/metaReviewGatePaneBinding.test.ts` a contract/wrapper-merge/notify/pane-binding matrix koveto same-family proof feluletei.
3. Reconciliation rule:
   - a canonical anchors szandekosan szelesebbek lehetnek a primer edit-listanal, mert boundary proofot adnak;
   - ettol fuggetlenul a `target_files` inventory tartalmazza a conditional same-family koveto feluleteket is, hogy a docs artifact ne sugalljon indokolatlan file-kizarast.

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
   - `src/v11/shared/metaReviewGate/metaReviewGateTypes.ts`
   - `src/v11/shared/metaReviewGate/metaReviewGateApply.ts`
   - `src/v11/shared/metaReviewGate/metaReviewGateApplyContext.ts`
   - `src/v11/shared/metaReviewGate/metaReviewGateCommandContract.ts`, `src/v11/shared/metaReviewGate/metaReviewGateCommandApi.ts`, `src/v11/shared/metaReviewGate/metaReviewGateCommandRuntime.ts` conditional same-family follow surface-kent
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

### Downstream Compatibility Guard

1. Adjacent downstream caller anchors:
   - `src/v11/application/converged/convergedDefaultDependencies.ts`
   - `tests/core/agent/converged.test.ts`
   - `tests/core/runtime/restartRecovery.test.ts`
   - `tests/core/human/approval.test.ts`
   - `tests/contracts/v11/converged.contract.runner.ts`
2. Preservation rule:
   - az `applyMetaReviewGateOnConvergenceV11(...)` callable shape-ja es default wiring contractja maradjon consumer-side rewrite nelkul hasznalhato a current converged lane-ben.
3. Proof expectation:
   - ha a wrapper/default/runtime merge behavior vagy a callable shape kornyezo szerzodese mozog, a `tests/contracts/v11/converged.contract.runner.ts` explicit downstream parity anchor marad.
4. Allowed change:
   - belso runtime capability narrowitas,
   - wrapper/default merge authority hardening,
   - adjacent export surface alignment csak akkor, ha a capability naming tenyleg mozog.
5. Forbidden change:
   - a converged / approval / restart caller oldalon uj signature-repair adapter vagy policy-branch pusztan az `O2-T9` cleanup miatt.

### In Scope

1. Meta-review gate shared/application runtime capability contract szukitese a jelenlegi grouped `notify` / `paneBinding` baseline megtartasa mellett.
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
| Successor unlocked | a megmaradt meta-review gate residual slice closureja; archived `O2-T8` nem nyilik ujra | P1 | required-now |
| Explicitly not closed here | public/read-model cleanup, producer rewrite, generic executor lane | P1 | required-now |

### 2) Call-Site Matrix

| ID | File | Entry / Surface | Current | Target | Why Here | Priority | Timing | Evidence |
|---|---|---|---|---|---|---|---|---|
| CS1 | `src/v11/shared/metaReviewGate/metaReviewGateTypes.ts` | shared runtime capability types | grouped `notify` / `paneBinding` capability mar letezik, de raw `tmux` helper names meg workflow-facing tulajdonosi surface-kent latszanak | grouped capability megmarad, de raw helper ownership retained adapter-detailre vagy additiv same-family compatibility fieldre szukul | shared ownership itt latszik | P1 | required-now | code diff |
| CS2 | `src/v11/shared/metaReviewGate/metaReviewGateApply.ts` + `src/v11/shared/metaReviewGate/metaReviewGateApplyContext.ts` | shared apply wiring | workflow layer ma is tovabbit runtime capability authorityt downstreamnak | workflow layer csak a grouped gate seamet ownershipolja; raw helper authority nem erosodik vissza | orchestration boundary itt zarhato | P1 | required-now | code diff |
| CS3 | `src/v11/application/metaReviewGate/metaReviewGateNotify.ts` | notify runtime consume | direct submit helper ownership a grouped notify capabilityben ul | gate-local notify capability consume, fail-closed semantics valtozatlan | internal execution family | P1 | required-now | code/test diff |
| CS4 | `src/v11/application/metaReviewGate/metaReviewGatePaneBinding.ts` | pane-binding runtime consume | direct runner/respawn ownership a grouped pane-binding capabilityben ul | gate-local pane-binding capability consume, notify runner fallback csak retained adapter policy | internal execution family | P1 | required-now | code/test diff |
| CS5 | `src/v11/defaults/metaReviewGate/metaReviewGateCommandDefaults.ts` | defaults adapter inventory | a grouped runtime capability retained helper inventoryja default dependencykent van feltoltve | a defaults inventory adapter-default implementaciokent marad, workflow authority nelkul | defaults ownership itt latszik | P1 | required-now | code diff |
| CS6 | `src/v11/application/metaReviewGate/metaReviewGateCommandDefaults.ts` | application defaults forwarding | az application layer a defaults inventoryt same-family command wiringhoz tovabbitja | forwarding marad, retained helper ownership visszaemelese nelkul | application defaults boundary itt zarhato | P1 | required-now | code diff |
| CS7 | `src/v11/application/metaReviewGate/emitMetaReviewGateV11.ts` | V11 wrapper runtime merge | a wrapper caller/default/runtime retegeket merge-el a notify es pane-binding seam felett | a merge retegek explicit bounded wiring maradnak, retained helper ownership visszaemelese nelkul | wrapper boundary itt zarhato | P1 | required-now | code diff |
| CS8 | `src/v11/shared/metaReviewGate/metaReviewGateCommandContract.ts` + `src/v11/shared/metaReviewGate/metaReviewGateCommandApi.ts` + `src/v11/shared/metaReviewGate/metaReviewGateCommandRuntime.ts` + `src/v11/application/metaReviewGate/metaReviewGateCommandContract.ts` + `src/v11/application/metaReviewGate/metaReviewGateApplyContext.ts` | command follow surfaces + application apply-context forwarding seam | type surface drift kockazat | export/apply-context forwarding surface csak akkor koveti a szukitest, ha tenyleges capability naming vagy runtime-forwarding surface mozog; generic executor drift nelkul | compile-time parity kell, ha mozog a surface | P1 | required-now | typecheck |
| CS9 | `tests/contracts/v11/metaReviewGate.contract.test.ts` + `tests/v11/application/metaReview/metaReviewGateEmit.test.ts` + `tests/v11/application/metaReview/metaReviewGateNotify.test.ts` + `tests/v11/application/metaReview/metaReviewGatePaneBinding.test.ts` | same-family proof tests | frontmatterben mar explicit proof feluletek, de eddig matrix nelkul | contract/wrapper-merge/notify/pane-binding proof a capability-shape es wrapper/default guardok koveto coverage-jekent marad | proof inventory itt zarul | P1 | required-now | test diff |

### 3) Data and Interface Contract

| Contract | Current | Target | Required Fields | Optional Fields | Compatibility | Priority | Timing |
|---|---|---|---|---|---|---|---|
| gate runtime capability contract | grouped `notify` / `paneBinding` capability raw primitive helper ownershipgal | grouped gate capability megmarad, de workflow-facing ownership retained adapter detailre szukul | notify capability, pane-binding capability, observation contract | helper support fields, additiv same-family compatibility fields | additive/narrowing | P1 | required-now |
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
| T4 | wrapper merge preservation | caller/default/runtime layers combined | `emitMetaReviewGateV11.ts` nem erositi vissza workflow truth-va a retained helper ownershipot, es a wrapper-merge proof ezt explicit `metaReviewGateEmit.test.ts` coveragevel koveti | P1 | code/test diff |
| T5 | downstream compatibility guard preservation | `applyMetaReviewGateOnConvergenceV11(...)` es 5 adjacent caller/parity anchor reviewed | callable shape es consumer-side rewrite tilalom valtozatlan marad, beleertve a converged contract runner parity anchort is | P1 | diff review |
| T6 | observation semantics preservation | confirmed/uncertain/failed paths exercised | same observation truth remains | P1 | contract tests |
| T7 | non-scope proof | diff reviewed | no UI/public or generic executor scope pulled in, es archived `O2-T8` nem nyilik ujra wordingben sem | P1 | diff review |

### 6) Baseline Preservation

| Baseline | Must Preserve | Allowed Change | Forbidden Change | Priority | Timing |
|---|---|---|---|---|---|
| observation semantics | explicit gate runtime truth | contract cleanup | truth downgrade | P1 | required-now |
| retained tmux runtime helpers | adapter implementation | adapter-default annotation/structure cleanup | generic executor rewrite | P1 | required-now |
| downstream caller compatibility | current converged integration | unchanged caller behavior | converged-side signature repair requirement | P1 | required-now |
| archived `O2-T8` sequencing baseline | predecessor slice mar archived/closed | wording hardening a residual ownership korul | archived sibling ujranyitasa vagy nyitott residualkent keretezese | P1 | required-now |

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
4. Ne fogadjunk el olyan wordingot, amely archived `O2-T8`-at ujranyitott sibling gate-kent kezeli.

## Spec Lock

Mark task as `IMPLEMENTABLE` when:

1. a meta-review gate shared/application contract mar nem raw `tmux` primitive ownershipon ul;
2. a grouped `notify` / `paneBinding` capability current-tree baselinekent megmarad consume seamkent; ez a task csak a workflow-level raw helper authorityt szukiti, nem a grouped baseline-t bontja vissza;
3. a retained `tmux` defaults explicit adapter-default statuszban maradnak;
4. a gate observation semantics valtozatlan;
5. a downstream caller compatibility megmarad consumer-side rewrite nelkul;
6. nincs producer rewrite, generic executor vagy UI/public scope-behuzas;
7. a task wording a parent-plan sequencinggel osszhangban nem kezeli archived `O2-T8`-at ujranyitott sibling gate-kent.

## Assumptions

1. A meta-review gate residual lezarhato generic executor lane nyitasa nelkul.
2. A retained `tmux` adapter vocabulary family-local capabilitykent meg mindig eleg a jelenlegi runtimehoz.

## Open Questions

1. Nincs blocker-szintu nyitott kerdes a current code- es plan-context alapjan.
