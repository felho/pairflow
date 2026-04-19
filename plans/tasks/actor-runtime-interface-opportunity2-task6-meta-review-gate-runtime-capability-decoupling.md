---
artifact_type: task
artifact_id: task_actor_runtime_interface_opportunity2_task6_meta_review_gate_runtime_capability_decoupling_v1
title: "Actor Runtime Interface Opportunity 2 Task 6: Meta-Review Gate Runtime Capability Decoupling"
status: implementable
phase: post-phaseE
target_files:
  - src/v11/shared/metaReviewGate/metaReviewGateTypes.ts
  - src/v11/shared/metaReviewGate/metaReviewGateCommandContract.ts
  - src/v11/shared/metaReviewGate/metaReviewGateCommandApi.ts
  - src/v11/shared/metaReviewGate/metaReviewGateCommandRuntime.ts
  - src/v11/shared/metaReviewGate/metaReviewGateApplyContext.ts
  - src/v11/shared/metaReviewGate/metaReviewGateApply.ts
  - src/v11/application/metaReviewGate/metaReviewGateCommandContract.ts
  - src/v11/application/metaReviewGate/metaReviewGateApplyContext.ts
  - src/v11/application/metaReviewGate/metaReviewGateNotify.ts
  - src/v11/application/metaReviewGate/metaReviewGatePaneBinding.ts
  - src/v11/application/metaReviewGate/emitMetaReviewGateV11.ts
  - src/v11/application/metaReviewGate/metaReviewGateDependencyDefaults.ts
  - src/v11/application/metaReviewGate/metaReviewGateCommandDefaults.ts
  - src/v11/defaults/metaReviewGate/metaReviewGateCommandDefaults.ts
  - tests/core/bubble/metaReviewGate.test.ts
  - tests/contracts/v11/metaReviewGate.contract.runner.ts
  - tests/contracts/v11/metaReviewGate.contract.test.ts
  - tests/v11/application/metaReview/metaReviewGatePaneBinding.test.ts
prd_ref: null
plan_ref: plans/actor-runtime-interface-post-phaseE-successor-plan-v1.md
system_context_ref: docs/pairflow-initial-design.md
owners:
  - "felho"
---

# Task: Actor Runtime Interface Opportunity 2 Task 6: Meta-Review Gate Runtime Capability Decoupling

## Current Codebase Check (2026-04-19)

1. A canonical delivery es launch truth current-tree szinten mar topology-neutral baseline:
   - `DeliveryAck`
   - `LaunchBubbleSessionAck`
2. A meta-review gate lane-ben ugyanakkor a workflow/defaults contract current-tree szinten meg mindig kozvetlen `tmux` primitivek nyelven van drotozva:
   - `NotifyMetaReviewerSubmissionRequestDependencies.runTmux`
   - `sendAndSubmitTmuxPaneMessage`
   - `submitTmuxPaneInput`
   - `ResolveMetaReviewerPaneWarningInput.runTmuxRunner`
   - `respawnTmuxPaneCommand`
3. Ez a direct retained capability ownership tobb helyen is latszik:
   - `src/v11/shared/metaReviewGate/metaReviewGateTypes.ts`
   - `src/v11/shared/metaReviewGate/metaReviewGateApplyContext.ts`
   - `src/v11/shared/metaReviewGate/metaReviewGateApply.ts`
   - `src/v11/application/metaReviewGate/emitMetaReviewGateV11.ts`
   - `src/v11/application/metaReviewGate/metaReviewGateDependencyDefaults.ts`
   - `src/v11/application/metaReviewGate/metaReviewGateCommandDefaults.ts`
   - `src/v11/defaults/metaReviewGate/metaReviewGateCommandDefaults.ts`
4. A route/state truth viszont mar nem a raw primitive sikeressegre ul, hanem a `MetaReviewRuntimeDeliveryObservation` explicit `confirmed | uncertain | failed` megfigyelesre.
5. Emiatt a current residual gap itt nem producer rewrite, hanem workflow/defaults/internal-execution consume contract cleanup.
6. A UI/router es repo-root/public delivery read-model/export alignment kulon residual slice marad:
   - ezt a successor `O2-T7` ownershipolja
   - itt nem szabad read-model/public scope-ot visszahuzni.
7. A shared apply entrypoint nem izolalt:
   - a downstream orchestration wiring current-tree szinten `src/v11/application/converged/convergedDefaultDependencies.ts`-on keresztul fogyasztja;
   - a magasabb szintu flow coverage is ezt az entrypointot eri el:
     - `tests/core/agent/converged.test.ts`
     - `tests/core/runtime/restartRecovery.test.ts`
     - `tests/core/human/approval.test.ts`
   - emiatt a task nem igenyel consumer-family rewrite-ot, de explicit signature- es validation-guardot igenyel.

## L0 - Policy

### Goal

1. A meta-review gate workflow/defaults lane levalasztasa a direct `tmux` primitive ownershiprol ugy, hogy a workflow-level contract gate-local runtime capabilityre alljon at.
   - ez gate-local cleanupot jelent, nem generic executor vagy topology-neutral command API ownershipot
2. A retained `tmux` default implementacio megmaradhat adapterkent, de nem maradhat workflow contract owner.
3. A `MetaReviewRuntimeDeliveryObservation` maradjon az egyetlen runtime-delivery truth a gate lane-ben.
4. Ne csusszon ebbe a taskba:
   - UI/router read-model alignment,
   - repo-root/public delivery export alignment,
   - generic executor registry,
   - delivery vagy launch producer rewrite.

### Domain / Control Model Summary

1. Business invariant:
   - a canonical delivery truth topologytol fuggetlen marad: `accepted | rejected`;
   - a canonical launch truth topologytol fuggetlen marad: `running | failed_to_start`;
   - a meta-review gate route/state nem ulhet raw `tmux` side effectre mint canonical truthra.
2. Control model:
   - a gate lane-ben a runtime submit/binding retained adapter action lehet;
   - a workflow-level dontes az explicit `MetaReviewRuntimeDeliveryObservation`-on alapul;
   - a default implementation tovabbra is hasznalhat `tmux`-ot gate-local, retained-adapter-anchored capability contract alatt;
   - ez a task nem vezethet be source-anchor nelkuli generic `runCommand` / executor / launcher vocabularyt.
3. Read-path rule:
   - a gate lane workflow-level consume-ja csak observation truthbol vagy ugyanennek explicit same-authority projectionjabol johet;
   - a missing runtime capability fail-closed observationt kell adjon, nem implicit success-t.
4. Forbidden fallback:
   - raw `runTmux` vagy pane submit/respawn/capture siker mint workflow truth;
   - direct `tmux` dependency lista mint shared workflow contract authority;
   - generic executor registry behuzasa consume cleanup cimszo alatt.
5. Allowed resolution path:
   - gate-local runtime capability grouping vagy ezzel ekvivalens narrow direct-contract cleanup;
   - retained `tmux` defaults ennek az adapter-default implementaciojakent maradhatnak;
   - a workflow-level shared apply contractbol a standalone raw `runTmux` ownership kiveheto, ha a runner access teljesen a notify/pane-binding seam mogott zarul, vagy egy kizarolag meta-review-gate familyben marado nested capability objectben marad;
   - a current `confirmed | uncertain | failed` observation semantics valtozatlan marad.
6. Missing-data rule:
   - runtime capability hiany vagy submit bizonytalansag eseten explicit `failed | uncertain` observation marad;
   - synthetic success nem hozhato letre pusztan attol, hogy egy adapter side effect meghivhato.
7. Phase boundary:
   - shared contract closure: narrow meta-review gate runtime capability contract
   - internal_execution_closure: owned here
   - workflow_orchestration_closure: owned here
   - read_model_closure: deferred to `O2-T7`
   - producer closure: predecessor-owned

### Plan Linkage

1. Parent plan gap:
   - a current tree-ben a meta-review gate workflow/defaults lane meg mindig retained `tmux` contract ownerkent viselkedik.
2. Depends on:
   - `plans/actor-runtime-interface-post-phaseE-successor-plan-v1.md`
   - `plans/actor-runtime-interface-topology-neutral-delivery-executor-contract-note-v1.md`
   - `plans/archive/tasks/actor-runtime-interface-opportunity2-task3-topology-neutral-delivery-consume-family-alignment.md`
   - `plans/archive/tasks/actor-runtime-interface-opportunity2-task5-topology-neutral-launch-executor-consume-family-alignment.md`
3. Unlocks / impacts successors:
   - `O2-T7` UI/router + repo-root/public read-model/export alignment
   - `Opportunity 2` lane closeout csak `O2-T7` utan claimelheto
4. Task-list impact:
   - ez a current next bounded implementation slice
   - a korabbi tul szeles residual `O2-T6` taskot valtja fel
   - read-model/public falloutot nem ownershipolja

### Canonical Contract Anchors

1. Source-of-truth anchors:
   - `plans/actor-runtime-interface-post-phaseE-successor-plan-v1.md`
   - `plans/actor-runtime-interface-topology-neutral-delivery-executor-contract-note-v1.md`
   - `src/v11/shared/delivery/tmuxDeliveryContract.ts`
   - `src/v11/shared/ports/tmuxDelivery.ts`
   - `src/v11/shared/metaReviewGate/metaReviewGateTypes.ts`
   - `src/v11/shared/metaReviewGate/metaReviewGateCommandApi.ts`
   - `src/v11/shared/metaReviewGate/metaReviewGateCommandRuntime.ts`
   - `src/v11/shared/metaReviewGate/metaReviewGateApplyContext.ts`
   - `src/v11/shared/metaReviewGate/metaReviewGateApply.ts`
   - `src/v11/application/metaReviewGate/metaReviewGateCommandContract.ts`
   - `src/v11/application/metaReviewGate/metaReviewGateApplyContext.ts`
   - `src/v11/application/metaReviewGate/emitMetaReviewGateV11.ts`
   - `src/v11/application/metaReviewGate/metaReviewGateDependencyDefaults.ts`
2. Canonical elements:
   - `DeliveryAck`
   - `LaunchBubbleSessionAck`
   - `MetaReviewRuntimeDeliveryObservation`
   - `confirmed | uncertain | failed`
3. Compat elements:
   - `MetaReviewGateTmuxRunner`
   - `maybeAcceptClaudeTrustPrompt`
   - `sendAndSubmitTmuxPaneMessage`
   - `submitTmuxPaneInput`
   - `buildAgentCommand`
   - `respawnTmuxPaneCommand`
   - retained `tmux` pane submit/capture/respawn defaults
4. Forbidden reinterpretations:
   - `MetaReviewRuntimeDeliveryObservation` nem downgrade-olhato best-effort diagnostics shape-re;
   - a retained `tmux` defaults nem nevezhetok ki workflow-level authority contractnak;
   - gate-local retained helper cleanup nem nevezheto at generic executor/runtime command contractta source anchor nelkul;
   - a canonical delivery/launch truth nem nyithato ujra ebben a taskban.
5. `drift_status`: `split_from_previous_overwide_task`

### Scope Reality / Shape Proof

1. Inspected entrypoints / call-sites:
   - `src/v11/shared/metaReviewGate/metaReviewGateTypes.ts`
   - `src/v11/shared/metaReviewGate/metaReviewGateCommandApi.ts`
   - `src/v11/shared/metaReviewGate/metaReviewGateCommandRuntime.ts`
   - `src/v11/shared/metaReviewGate/metaReviewGateApplyContext.ts`
   - `src/v11/shared/metaReviewGate/metaReviewGateApply.ts`
   - `src/v11/application/metaReviewGate/metaReviewGateCommandContract.ts`
   - `src/v11/application/metaReviewGate/metaReviewGateApplyContext.ts`
   - `src/v11/application/metaReviewGate/metaReviewGateNotify.ts`
   - `src/v11/application/metaReviewGate/metaReviewGatePaneBinding.ts`
   - `src/v11/application/metaReviewGate/emitMetaReviewGateV11.ts`
   - `src/v11/application/metaReviewGate/metaReviewGateDependencyDefaults.ts`
   - `src/v11/application/metaReviewGate/metaReviewGateCommandDefaults.ts`
   - `src/v11/defaults/metaReviewGate/metaReviewGateCommandDefaults.ts`
2. Actual touched scope:
   - primary bounded-task shape: `consumer_family_alignment`
   - justified secondary shape: `contract_or_persisted_authority_foundation`
3. Producer behavior touched:
   - `no`
4. Why the declared shape matches reality:
   - a current slice nem producer rewrite, de nem is tiszta consume-only rename: a shared meta-review gate dependency contract is szukul, mert a `metaReviewGateTypes.ts` es a defaults/apply wiring ugyanazt a runtime capability authorityt ownershipolja;
   - a `contract_or_persisted_authority_foundation` secondary shape csak a meta-review gate lane szuk shared contractjara terjed ki; nem nyit uj generic executor vagy topology-neutral producer foundationt;
   - az adjacent shared/application export shim-ek (`metaReviewGateCommandApi.ts`, `metaReviewGateCommandRuntime.ts`, `metaReviewGateCommandContract.ts`, `metaReviewGateApplyContext.ts`) csak annyiban tartoznak ide, amennyiben a gate-local contract-szukites miatt a type/export surface-et egyben kell tartani;
   - a `consumer_family_alignment` primary shape attol marad igaz, hogy a contract-szukites ugyanabban a bounded filecsaladban zarul, mint az internal execution + workflow consume alignment;
   - UI/read-model/public surfaces kulon filecsaladban es kulon contract shape-ben vannak, ezert kulon taskba kerulnek.

### Authority Boundary Map

1. `authority_producer`
   - `emitDeliveryNotificationAck(...)`
   - `launchBubbleSessionAck(...)`
   - predecessor-owned baseline
2. `persisted_authority`
   - runtime delivery observation persistence current semantics szerint valtozatlan
3. `internal_execution_consumers`
   - `src/v11/application/metaReviewGate/metaReviewGateNotify.ts`
   - `src/v11/application/metaReviewGate/metaReviewGatePaneBinding.ts`
4. `workflow_orchestration_consumers`
   - `src/v11/shared/metaReviewGate/metaReviewGateTypes.ts`
   - `src/v11/shared/metaReviewGate/metaReviewGateCommandContract.ts`
   - `src/v11/shared/metaReviewGate/metaReviewGateApplyContext.ts`
   - `src/v11/shared/metaReviewGate/metaReviewGateApply.ts`
   - `src/v11/application/metaReviewGate/emitMetaReviewGateV11.ts`
   - `src/v11/application/metaReviewGate/metaReviewGateDependencyDefaults.ts`
   - `src/v11/application/metaReviewGate/metaReviewGateCommandDefaults.ts`
   - `src/v11/defaults/metaReviewGate/metaReviewGateCommandDefaults.ts`
5. `read_model_consumers`
   - explicit out of scope:
     - `src/v11/shared/ports/uiRouter.ts`
     - `src/v11/defaults/ui/routerDefaults.ts`
     - `src/index.ts`
6. `cleanup_recovery_consumers`
   - deferred
7. Export surfaces closed in this phase:
   - `none`

### In Scope

1. A meta-review gate workflow/defaults dependency contract narrow gate-local runtime capabilityre igazitasa.
2. Az apply/default wiring alignmentje, hogy a retained `tmux` defaults adapter capability maradjanak.
3. A notify/pane-binding internal execution consume path explicit gate-local capability contract ala rendezese.
4. Az adjacent export shim-ek alignmentje, ha a shared/application meta-review gate type surface a fenti szukites miatt valtozik.
5. A shared apply entrypoint downstream caller-compatible megorzese a current converged wiring fele consumer-side policy rewrite nelkul.
6. A kapcsolodo meta-review gate tests es contract coverage frissitese, beleertve a downstream caller compatibility proofot.

### Out of Scope

1. UI/router delivery signal contract.
2. Repo-root/public delivery export alignment.
3. Generic executor registry vagy non-`tmux` runtime platform.
4. Delivery vagy launch producer rewrite.
5. Root export breaking cleanup.
6. `converged` / `approval` / `restart` flow policy vagy orchestration rewrite; ezeknel csak signature- es behavior-parity proof kerheto.

### Downstream Compatibility Guard

1. Adjacent downstream caller anchors:
   - `src/v11/application/converged/convergedDefaultDependencies.ts`
   - `tests/core/agent/converged.test.ts`
   - `tests/core/runtime/restartRecovery.test.ts`
   - `tests/core/human/approval.test.ts`
2. Preservation rule:
   - az `applyMetaReviewGateOnConvergenceV11(...)` public-ish application entrypoint callable shape-ja es default wiring contractja maradjon consumer-side rewrite nelkul hasznalhato a current converged lane-ben.
3. Allowed change:
   - belso dependency regrouping,
   - shared/application meta-review gate type surface szukitese,
   - explicit gate-local capability object vagy ezzel ekvivalens family-local cleanup.
4. Forbidden change:
   - a converged caller oldalon uj policy/orchestration branch vagy signature-repair adapter bevezetese pusztan az `O2-T6` refactor miatt.
5. Escalation rule:
   - ha a cleanup megis consumer-side rewrite-ot igenyelne a `converged` lane-ben, az mar nem local task-refinement, hanem parent-plan mismatch es `route_back_to_plan`.

### Safety Defaults

1. A `MetaReviewRuntimeDeliveryObservation` semantics valtozatlan marad.
2. Missing capability vagy runtime bizonytalansag fail-closed observationt eredmenyez.
3. A retained `tmux` defaults maradhatnak, de csak adapter/default implementaciokent.

### Contract Boundary / Blast Radius

1. `contract_boundary_override`: `yes`
2. Erintett contract:
   - meta-review gate workflow/defaults runtime capability contract
   - internal meta-review gate execution wiring

### Complexity Risk Gate

1. `authority_risk`: `1`
2. `surface_spread`: `1`
3. `identity_join_risk`: `0`
4. `activation_coupling`: `1`
5. `prerequisite_risk`: `1`
6. `acceptance_multiplicity`: `2`
7. `risk_score`: `6`
8. `single-task allowed`: `yes`
9. Split note:
   - a read-model/public fallout explicitten `O2-T7`-re van bontva;
   - a current task csak a meta-review gate internal + workflow consume familyt ownershipolja.

## L1 - Change Contract

### 0) Domain / Control Contract

| Item | Rule | Implementation Consequence | Priority | Timing |
|---|---|---|---|---|
| Business invariant | A gate lane nem olvashat raw `tmux` side effectet canonical truthkent. | Workflow contract observation-first marad. | P1 | required-now |
| Control model | Runtime action retained adapter lehet, workflow truth explicit observation. | A direct `tmux` deps gate-local capability contract ala mennek. | P1 | required-now |
| Forbidden fallback | Direct `runTmux` / pane primitive lista nem maradhat shared workflow contract owner. | Shared types es defaults contractot at kell rendezni. | P1 | required-now |
| Missing-data rule | Missing capability fail-closed observationt ad. | No synthetic success. | P1 | required-now |

### 0a) Canonical Contract Preservation

| Element | Current Role | Target Role | Preservation Rule | Priority | Timing |
|---|---|---|---|---|---|
| `MetaReviewRuntimeDeliveryObservation` | canonical gate runtime observation | canonical gate runtime observation | `confirmed | uncertain | failed` nem valtozik | P1 | required-now |
| retained `tmux` defaults | adapter/default implementation | adapter/default implementation | nem lehet workflow-level authority | P1 | required-now |
| `DeliveryAck` / `LaunchBubbleSessionAck` | closed upstream canonical contracts | closed upstream canonical contracts | semantika nem nyithato ujra | P1 | required-now |

### 0b) Shared Contract Compatibility

| Shared Contract | Current Consumers Inventory | Change Type (`additive|breaking|N/A`) | This Task Action | Deferred Alignment |
|---|---|---|---|---|
| meta-review gate runtime capability contract | shared types + command re-export shim-ek + apply context + defaults + notify/pane binding + contract tests + downstream converged default wiring compatibility | additive/narrow realignment | gate-local capability grouping vagy ezzel ekvivalens explicit direct-contract cleanup; generic executor vocabulary nelkul | generic executor registry only later if needed |

### 0c) Capability Mapping Contract

| Current Retained Field / Seam | Current Role | Target Contract Responsibility | Required Now | Optional | Notes |
|---|---|---|---|---|---|
| `runTmux` / `runTmuxRunner` | raw adapter command runner | gate-local retained runner access submission confirm + pane respawn supporthoz | yes | no | maradhat retained adapter implementationkent, de nem maradhat standalone workflow-level shared contract owner |
| `sendAndSubmitTmuxPaneMessage` | pane submit side effect | gate-local submission adapter action | yes | no | same-authority adapter action; ne legyen generic command bus |
| `submitTmuxPaneInput` | pane enter/retry side effect | gate-local submission confirmation recovery | yes | no | csak submission capability reszekent engedett |
| `maybeAcceptClaudeTrustPrompt` | trust-prompt guard | gate-local optional submission helper | no | yes | helper maradhat optional adapter supportkent |
| `buildAgentCommand` | meta-reviewer command construction | gate-local pane-binding adapter action | yes | no | explicit pane-binding contract resze; nem generic launcher API |
| `respawnTmuxPaneCommand` | pane respawn side effect | gate-local pane-binding adapter action | yes | no | adapter side effect, nem workflow truth |
| top-level `ApplyMetaReviewGateOnConvergenceDependencies.runTmux` | workflow-level raw runner dependency | remove as direct workflow owner; runner access teljesen a notify/pane-warning seam mogott zarjon, vagy egy csak meta-review-gate familyben marado nested capability objectben maradjon | no | no | implementacio nem hagyhat raw `runTmux`-only top-level authorityt a shared apply contractban, es nem exportalhat uj generic executor seam-et |

### 1) Plan Linkage and Successor Impact

| Item | Value | Priority | Timing |
|---|---|---|---|
| Parent plan gap | retained `tmux` ownership a meta-review gate lane-ben | P1 | required-now |
| Successor unlocked | `O2-T7` | P1 | required-now |
| Explicitly not closed here | UI/public delivery read-model/export alignment | P1 | required-now |

### 2) Call-Site Matrix

| ID | File | Entry / Surface | Current | Target | Why Here | Priority | Timing | Evidence |
|---|---|---|---|---|---|---|---|---|
| CS1 | `src/v11/shared/metaReviewGate/metaReviewGateTypes.ts` | shared gate dependency contract | direct `tmux` capability names | gate-local runtime capability contract | shared ownership itt latszik | P1 | required-now | code diff |
| CS2 | `src/v11/shared/metaReviewGate/metaReviewGateApplyContext.ts` | apply wiring | direct `runTmux` requirement | workflow-visible raw runner ownership megszunik; a runner access teljesen gate-local seam moge kerul vagy family-local nested capabilityben marad | actual orchestration wiring itt latszik | P1 | required-now | code diff |
| CS3 | `src/v11/shared/metaReviewGate/metaReviewGateApply.ts` | shared apply orchestration entrypoint | pane binding / notify capabilities explicit `tmux`-named flowval mennek tovabb | orchestration entrypoint csak a notify/pane-warning seam-et vigye tovabb, ne kulon raw runner authorityt | target-file reality miatt itt kell bizonyitani, hogy a wiring tenyleg ugyanebben a closure-ben zarul | P1 | required-now | code diff |
| CS4 | `src/v11/application/metaReviewGate/emitMetaReviewGateV11.ts` / `metaReviewGateDependencyDefaults.ts` / `metaReviewGateCommandDefaults.ts` / `src/v11/defaults/metaReviewGate/metaReviewGateCommandDefaults.ts` | default injection + loader shim | retained `tmux` defaults kozvetlen workflow depkent | adapter-default injection explicit submission + pane-binding capabilityre rendezve, generic executor seam nelkul | defaults ownership itt zarhato | P1 | required-now | code/test diff |
| CS5 | `src/v11/application/metaReviewGate/metaReviewGateNotify.ts` / `metaReviewGatePaneBinding.ts` | internal execution consume | raw pane/tmux helper deps | explicit gate-local runtime capability consume | internal execution consumer alignment | P1 | required-now | `tests/core/bubble/metaReviewGate.test.ts` |
| CS6 | `src/v11/shared/metaReviewGate/metaReviewGateCommandApi.ts` / `metaReviewGateCommandRuntime.ts` / `src/v11/application/metaReviewGate/metaReviewGateCommandContract.ts` / `metaReviewGateApplyContext.ts` | adjacent export surface | shared contract naming drift atszivaroghat | export surface csak a gate-local contract-szukitest kovesse; ne nyisson uj neutral executor seam-et | target-file reality szerint adjacent shim-eket is zarni kell, ha a type surface mozog | P1 | required-now | code diff |
| CS7 | tests | meta-review gate contract + bubble coverage | retained/current assumptions | gate-local capability contract + preserved observation semantics | closeout tests szuksegesek | P1 | required-now | test diff |

### 3) Data and Interface Contract

| Contract | Current | Target | Required Fields | Optional Fields | Compatibility | Priority | Timing |
|---|---|---|---|---|---|---|---|
| Meta-review runtime observation | `MetaReviewRuntimeDeliveryObservation` | unchanged | `status`, `reasonCode`, `message` | none | preserved baseline | P1 | required-now |
| Gate submission runtime capability | direct `runTmux` + `sendAndSubmitTmuxPaneMessage` + `submitTmuxPaneInput` dependency fields | gate-local submission adapter capability anchored to current retained helpers | a retained runner access egyertelmuen kotve legyen a submission pathhoz; `sendAndSubmitTmuxPaneMessage(...)`; `submitTmuxPaneInput(...)` | `maybeAcceptClaudeTrustPrompt(...)` | additive internal realignment | P1 | required-now |
| Gate pane-binding runtime capability | direct `buildAgentCommand` + `respawnTmuxPaneCommand` + `runTmuxRunner` dependency fields | gate-local pane-binding adapter capability anchored to current retained helpers | `buildAgentCommand(...)`; `respawnTmuxPaneCommand(...)`; retained runner access csak respawn/confirm supporthoz | none | additive internal realignment | P1 | required-now |
| Apply orchestration dependency surface | top-level raw `runTmux` still shared apply dependency | workflow-visibleen csak `notifyMetaReviewerSubmissionRequest` es `resolveMetaReviewerPaneWarning`; runner access nem maradhat kulon top-level authoritykent | `notifyMetaReviewerSubmissionRequest`, `resolveMetaReviewerPaneWarning` | maximum egy unexported / family-local nested capability object, ha a closure maskepp nem zarhato | breaking only inside bounded in-scope shared contract; no out-of-scope consumers listed | P1 | required-now |

### 4) Implementation Shape

| Item | Value | Priority | Timing |
|---|---|---|---|
| Primary shape | `consumer_family_alignment` | P1 | required-now |
| Secondary shape | `contract_or_persisted_authority_foundation` | P1 | required-now |
| Producer touched | `no` | P1 | required-now |
| Coordination hardening | `no` | P2 | later |
| Fail-closed hardening | inherited, not primary | P1 | required-now |
| Why the mix is safe | a shared contract-szukites ugyanabban a meta-review gate filecsaladban zarul, mint a workflow/internal consume alignment; nincs producer, read-model vagy public fallout ugyanebben a bounded slice-ban | P1 | required-now |

### 5) Validation Matrix

| ID | Scenario | Setup | Expected Result | Priority | Evidence |
|---|---|---|---|---|---|
| T1 | gate runtime capability missing | workflow/default dependency intentionally incomplete | explicit fail-closed observation/error path, no implicit success | P1 | `tests/v11/application/metaReview/metaReviewGatePaneBinding.test.ts` + ha szukseges, `tests/core/bubble/metaReviewGate.test.ts` bovitese |
| T2 | meta-review submit confirmed/uncertain/failed parity | retained default implementation fut | observation semantics valtozatlan | P1 | `tests/contracts/v11/metaReviewGate.contract.test.ts` |
| T3 | apply/default wiring | `emitMetaReviewGateV11` defaults + dependency loader shim + shared apply entrypoint | retained `tmux` defaults explicit submission/pane-binding adapter capabilitykent injektalodnak, nem shared authoritykent | P1 | code/test diff |
| T3a | raw top-level runner drift forbidden | shared apply dependency surface csak notify/pane-warning seamet vagy family-local nested capability objectet vigyen | nincs raw `runTmux`-only workflow owner a final shared contractban | P1 | code diff + `tests/core/bubble/metaReviewGate.test.ts` / `tests/contracts/v11/metaReviewGate.contract.test.ts` parity |
| T3b | generic executor drift forbidden | shared/application export shimek is frissulnek, ha a type surface mozog | nincs uj source-anchor nelkuli `runCommand`/executor/launcher public-ish vocabulary | P1 | code diff |
| T4 | adjacent export shim parity | shared/application meta-review gate re-export fajlok compile-szinten egyben maradnak | nincs felig atirt type surface a command API / contract shim-ekben | P1 | typecheck/code diff |
| T4a | downstream caller compatibility | `applyMetaReviewGateOnConvergenceV11` current converged wiringben marad | `src/v11/application/converged/convergedDefaultDependencies.ts` consumer-side rewrite nelkul marad ervenyes | P1 | typecheck + `tests/core/agent/converged.test.ts` + `tests/core/runtime/restartRecovery.test.ts` + `tests/core/human/approval.test.ts` |
| T5 | UI/public non-scope proof | no UI/public files touched in task implementation | nincs read-model/public contract drift ebben a slice-ban | P1 | diff review |

### 6) Baseline Preservation

| Baseline | Must Preserve | Allowed Change | Forbidden Change | Priority | Timing |
|---|---|---|---|---|---|
| gate observation semantics | explicit `confirmed | uncertain | failed` | dependency contract cleanup | implicit success vagy fail-open | P1 | required-now |
| retained `tmux` implementation | current runtime helpers | adapter/default status explicitte tehetok | generic executor rewrite | P1 | required-now |
| upstream delivery/launch contracts | current ack semantics | none | producer truth modositasa | P1 | required-now |

### 7) Closure-Budget Summary

| Item | Value | Priority | Timing |
|---|---|---|---|
| Closure buckets touched | `shared_contract`, `internal_execution_consumers`, `workflow_orchestration_consumers` | P1 | required-now |
| Intentionally collapsed | internal execution + workflow orchestration | P1 | required-now |
| Why safe | ugyanannak a meta-review gate capability contractnak a sugarzasa; nincs kulon read-model/public fallout | P1 | required-now |
| Deferred closures | `read_model_consumers`, public exports, generic executor registry | P1 | required-now |

### 8) Precondition and Side-Effect Boundary

| Boundary | Rule | Priority | Timing |
|---|---|---|---|
| Validations before side effects | workflow-visible notify/pane-warning capability availability explicit legyen, mielott runtime submit/bind side effect tortenik; family-local runner access nem maradhat implicit top-level shortcut | P1 | required-now |
| Forbidden early side effects | ne jojjon uj runtime action vagy registry consumer cleanup cimke alatt | P1 | required-now |
| Invalid/precondition-failure behavior | explicit fail-closed observation/error | P1 | required-now |
| Existing side-effect boundary preserved | submit/capture/respawn tovabbra is adapter side effect | P1 | required-now |

## L2 - Implementation Notes (Optional)

1. [later-hardening] Ha a capability naming stabil, a retained `tmux` helper field names JSDoc compat jelolest kaphatnak.
2. [later-hardening] Generic executor/runtime registry csak kulon successor taskban nyithato, ha a narrow capability bridge nem eleg.

## Hardening Backlog (Optional)

| ID | Item | Layer | Priority | Timing | Source | Proposed Action |
|---|---|---|---|---|---|---|
| H1 | retained `tmux` helper naming explicit compat jelolese | L2 | P2 | later-hardening | `O2-T6` drafting | JSDoc vagy docs note |

## Review Control

1. Ne fogadjunk el olyan implementaciot, amely UI/public delivery contractot is behuz ebbe a taskba.
2. Ne fogadjunk el olyan implementaciot, amely a `MetaReviewRuntimeDeliveryObservation` truthot lazitja.
3. Ne fogadjunk el producer/shared delivery-launch rewrite-ot `O2-T6` alatt.
4. Ne fogadjunk el source-anchor nelkuli generic executor/runtime command vocabularyt.
5. Ne fogadjunk el olyan lezarast, ahol a shared apply contractban standalone raw `runTmux` ownership marad.
6. Ne fogadjunk el olyan lezarast, amely `converged` oldali consumer-side policy vagy signature-repair rewrite-ot igenyel pusztan az `O2-T6` cleanup miatt.

## Spec Lock

Mark task as `IMPLEMENTABLE` when:

1. a meta-review gate workflow/defaults contract mar nem raw `tmux` primitiveket tekint shared authoritynek;
2. a retained `tmux` defaults explicit adapter/default implementaciokent maradnak;
3. a shared apply contract workflow-visible surface-e nem hordoz standalone raw `runTmux` authorityt;
4. a gate runtime observation semantics valtozatlanul explicit marad;
5. a kapcsolodo meta-review gate tests bizonyitjak a preserved observation behavior-t;
6. az adjacent export shim-ek nem nyitnak uj generic executor seam-et;
7. a downstream converged caller compatibility valtozatlanul fennmarad consumer-side rewrite nelkul;
8. nincs UI/public read-model/export scope behuzva.

## Assumptions

1. A meta-review gate lane lezarhato gate-local capability contracttal generic executor registry nelkul.
2. A read-model/public fallout kulon taskban biztonsagosabban zarhato.

## Open Questions

1. Nincs blocker-szintu nyitott kerdes a current code- es plan-context alapjan.
