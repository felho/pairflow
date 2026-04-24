---
artifact_type: task
artifact_id: task_runtime_review_policy_foundation_and_authority_refactor_phase1_v2
title: "Runtime Review Policy Foundation and Authority Refactor (Phase 1)"
status: draft
phase: phase1
target_files:
  - src/types/bubble.ts
  - src/config/bubbleConfig.ts
  - src/v11/shared/reviewPolicy/reviewPolicyRuntime.ts
  - src/v11/shared/reviewPolicy/updateBubbleReviewPolicy.ts
  - src/v11/shared/list/listCommandContract.ts
  - src/v11/shared/list/listCommandEntryBuilder.ts
  - src/v11/shared/list/listCommandApi.ts
  - src/v11/shared/status/statusCommandViewBuilder.ts
  - src/v11/shared/status/statusCommandApi.ts
  - src/v11/shared/metaReviewGate/metaReviewGateThresholdAuthority.ts
  - src/v11/shared/metaReviewGate/metaReviewGateCurrentRunFinalization.ts
  - src/v11/shared/metaReviewGate/metaReviewGateHumanGatePersistence.ts
  - src/v11/shared/metaReviewGate/approvalRequestEnvelope.ts
  - src/v11/shared/metaReviewGate/metaReviewGateReviewerSnapshot.ts
  - src/v11/shared/metaReviewGate/metaReviewGateFindingsValidation.ts
  - src/v11/shared/metaReviewGate/metaReviewGateFindingsMetadata.ts
  - src/v11/shared/metaReviewGate/metaReviewGateFindingsParityHelpers.ts
  - src/v11/shared/metaReviewGate/metaReviewGateFindingsParityInput.ts
  - src/v11/shared/metaReviewGate/metaReviewGateFindingsSplit.ts
  - tests/config/bubbleConfig.test.ts
  - tests/core/bubble/listBubbles.test.ts
  - tests/core/bubble/statusBubble.test.ts
  - tests/core/bubble/metaReviewGate.test.ts
  - tests/core/bubble/approvalRequestEnvelope.test.ts
  - tests/contracts/v11/metaReviewGate.contract.test.ts
  - tests/v11/application/list/listCommandApi.test.ts
  - tests/v11/shared/reviewPolicy/reviewPolicyRuntime.test.ts
  - tests/v11/shared/reviewPolicy/updateBubbleReviewPolicy.test.ts
  - tests/v11/shared/metaReviewGate/metaReviewGateFindingsMetadata.test.ts
  - tests/v11/shared/metaReviewGate/metaReviewGateHumanGatePersistence.test.ts
  - tests/v11/shared/metaReviewGate/metaReviewGateFindingsParityHelpers.test.ts
  - tests/v11/shared/metaReviewGate/metaReviewGateFindingsSplit.test.ts
  - tests/v11/shared/metaReviewGate/metaReviewGateThresholdAuthority.test.ts
prd_ref: null
plan_ref: plans/archive/plans/runtime-review-policy-reset-and-phasing-plan-v1.md
system_context_ref: docs/pairflow-initial-design.md
normative_refs:
  - plans/archive/plans/runtime-review-policy-reset-and-phasing-plan-v1.md
  - plans/archive/tasks/review-policy-runtime-surface-and-rollout-phase1.md
  - plans/actor-runtime-interface-post-phaseE-successor-plan-v1.md
  - plans/archive/tasks/actor-runtime-interface-opportunity2-task9-meta-review-gate-workflow-runtime-capability-residual-closeout.md
  - docs/pairflow-initial-design.md
  - docs/architecture/v11-placement-and-extraction-governance.md
owners:
  - "felho"
---

# Task: Runtime Review Policy Foundation and Authority Refactor (Phase 1)

## Current Codebase Check (2026-04-21)

1. A checked-out codebase-ben tovabbra sincs canonical `review_policy` bubble-config surface, es nincs `review_loop_mode` / `meta_review_auto_rework_min_severity` runtime projection.
2. A current list/status read pathok kozvetlenul a `BubbleConfig`-ot parse-oljak vagy consume-oljak, es a consume boundary current-tree anchorjai ezek:
   - `src/v11/shared/list/listCommandEntryBuilder.ts`
   - `src/v11/shared/list/listCommandApi.ts`
   - `src/v11/shared/status/statusCommandViewBuilder.ts`
   - `src/v11/shared/status/statusCommandApi.ts`
   kozos review-policy runtime-view builder meg nincs.
3. A meta-review gate current tree-ben letezik parity/report/artifact validation baseline, de nincs kulon named threshold-authority resolver boundary; a routing es human-gate consume tovabbra is mas helpercsoportokra tamaszkodik.
4. A `MetaReviewRuntimeDeliveryObservation` es a same-round parity baseline preserved runtime truth marad; ez a task ezeket nem csereli le.
5. A `src/core/**` topology vegleg retired; Phase 1 targetje csak a mai `src/v11/**`, `src/config/**`, `src/types/**` es teszt-topology lehet.

## L0 - Policy

### Goal

Bevezetni a shared runtime review policy foundationt ugy, hogy:
1. a canonical `review_policy` config/runtime shape workflow-owned legyen,
2. a bubble TOML update-je egyetlen mutation seamre keruljon,
3. a status/list backend projection ugyanazt a runtime-view buildert hasznalja a mai `listCommandApi` / `statusCommandApi` consume boundarykon at,
4. a thresholdhez szukseges report/artifact/parity feloldas kulon named authority boundarybe keruljon,
5. de a gate routing, approval refresh, human-gate payload es bypass activation meg ne valtozzon.

### Domain / Control Model Summary

1. Business invariant:
   ugyanarra a review-policy allapotra nem johet letre kulon canonical truth status/list projectionben, bubble configban, vagy meta-review helper-oldalon.
2. Control model:
   a canonical `review_policy` workflow/orchestrator-owned bubble-config contract; a threshold authority truth kulon explicit resolver-owned boundary.
3. Read-path rule:
   review-policy runtime projection csak a kozos runtime-view helperen keresztul olvashato a current-tree `list/status` API-builder consume family felett; threshold authority csak a named resolveren keresztul olvashato.
4. Forbidden fallback:
   reviewer snapshot, approval envelope metadata, status/list local projection, UI/store local state es ad hoc route helper nem valhat canonical review-policy vagy threshold truth-ta.
5. Allowed resolution path:
   report_json + findings artifact + parity metadata ugyanazon resolverben osszeolvashato; a deterministic same-authority reconciliation megengedett, ha explicit named helper alatt tortenik.
6. Missing-data rule:
   ha a policy surface vagy a threshold authority input hianyos, a task fail-closed vagy unresolved eredmenyt ad; nem gyart secondary source-bol "igazsagot".
7. Phase boundary:
   - contract closure: owned here
   - producer closure: owned here
   - internal execution closure: successor
   - workflow/orchestration closure: successor
   - read_model_closure: owned here, de csak backend status/list projection szinten
   - activation_closure: successor
   - cleanup_recovery_closure: successor

### Plan Linkage

1. Parent plan gap closed:
   a planbol hianyzo Phase 1 foundation slice, amely a canonical policy objectet, a kozos runtime-view buildert, a mutation seamet es a pure threshold-authority boundaryt letrehozza.
2. Depends on:
   completed [runtime-review-policy-reset-and-phasing-plan-v1.md](/Users/felho/dev/pairflow/plans/archive/plans/runtime-review-policy-reset-and-phasing-plan-v1.md) plan-reference, es az `O2-T9` lane maradjon kulon ownership alatt.
3. Unlocks / impacts successors:
   `runtime-review-policy-auto-rework-threshold-phase2`, valamint a `runtime-review-policy-reviewer-bypass-contract-phase3a` task.
4. Task-list impact:
   a korabbi stale Phase 1 draftot ezen path uj, current-tree implementalhato specje valtja fel.
5. Inherited validation / exit expectation:
   Phase 1 utan legyen explicit policy schema + runtime view + mutation seam + threshold authority API, de ne legyen threshold enforce, approval payload alignment vagy bypass activation.

### Canonical Contract Anchors

1. Source-of-truth anchors:
   - `src/v11/shared/metaReviewGate/metaReviewGateCurrentRunFinalization.ts`
   - `src/v11/shared/metaReviewGate/metaReviewGateHumanGatePersistence.ts`
   - `src/v11/shared/metaReviewGate/approvalRequestEnvelope.ts`
   - `src/v11/shared/metaReviewGate/metaReviewGateReviewerSnapshot.ts`
   - `src/v11/shared/metaReviewGate/metaReviewGateFindingsValidation.ts`
   - `src/v11/shared/list/listCommandContract.ts`
   - `src/v11/shared/list/listCommandEntryBuilder.ts`
   - `src/v11/shared/list/listCommandApi.ts`
   - `src/v11/shared/status/statusCommandViewBuilder.ts`
   - `src/v11/shared/status/statusCommandApi.ts`
2. Canonical elements:
   - bubble TOML marad a bubble-scoped config canonical store-ja
   - `MetaReviewRuntimeDeliveryObservation` observability-only runtime truth marad
   - same-round artifact/parity validation marad canonical threshold input chain resze
3. Guard elements:
   - findings artifact path safety
   - run-id parity guard
   - same-round / parity consistency diagnostics
4. Compat-only elements:
   - reviewer snapshot
   - approval envelope advisory metadata
   - status/list local formatting
5. Forbidden reinterpretations:
   - reviewer snapshot nem lephet elo threshold authority source-sza
   - approval payload metadata nem lephet elo canonical severity truth-ta
   - `MetaReviewRuntimeDeliveryObservation` nem lephet elo submit/approval authorityva

### Scope Reality / Shape Proof

`target_files` ebben a taskban szandekosan vegyes lista: tartalmaz kotelezo uj Phase 1 outputokat es preserve/prove celbol targetelt current-tree anchorokat is. A kotelezo ownershipet a Call-site Matrix, a Canonical Contract Preservation tabla, valamint a Test Matrix egyutt hatarozza meg; a preservation-only anchor nem ertelmezheto uj activation vagy routing ownershipkent.

1. Inspected entrypoints / call-sites:
   `src/config/bubbleConfig.ts`, `src/types/bubble.ts`, `src/v11/shared/list/listCommandEntryBuilder.ts`, `src/v11/shared/list/listCommandApi.ts`, `src/v11/shared/status/statusCommandViewBuilder.ts`, `src/v11/shared/status/statusCommandApi.ts`, `src/v11/shared/metaReviewGate/metaReviewGateCurrentRunFinalization.ts`, `src/v11/shared/metaReviewGate/metaReviewGateHumanGatePersistence.ts`, `src/v11/shared/metaReviewGate/approvalRequestEnvelope.ts`, `src/v11/shared/metaReviewGate/metaReviewGateFindingsValidation.ts`, `src/v11/shared/metaReviewGate/metaReviewGateFindingsParityHelpers.ts`, `src/v11/shared/metaReviewGate/metaReviewGateFindingsParityInput.ts`.
   named Phase 1 outputok ebben a slice-ban: `src/v11/shared/reviewPolicy/reviewPolicyRuntime.ts`, `src/v11/shared/reviewPolicy/updateBubbleReviewPolicy.ts`, `src/v11/shared/metaReviewGate/metaReviewGateThresholdAuthority.ts`.
2. Actual touched scope:
   `contract_or_persisted_authority_foundation` primary, `activation_or_read_model` secondary only a backend list/status consume familyre.
3. Mutation entrypoints in scope:
   az uj `updateBubbleReviewPolicy(...)` bubble TOML read-modify-write seam Phase 1-ben kotelezo named output; a current-tree scope-proofot a `bubbleConfig` parse/render es a list/status API-builder consume family adja. Mas command/router/UI mutation entrypoint nincs scope-ban.
4. Hidden scope ruled out:
   approval/human-gate payload shaping, current-run routing, auto-rework dispatch, valamint a `detail` UI/router-presenter compose family kulon ellenorizve es kiveve a scope-bol.
5. Branch inventory note:
   precondition-pass/fail a bubble TOML write seamnel, parse/render valid/invalid branch, threshold authority resolved/unresolved/incomplete branch, es status/list projection full-vs-guarded branch.
6. Why the declared task shape matches reality:
   a task shared contract + persisted config + egy status/list read-model family backend consume closurejat zarja; workflow routing consume, human-gate consume es activation kulon successor taskokban maradnak.

### Authority Boundary Map

1. Authority producer:
   a bubble config `review_policy` object es a pure threshold-authority resolver outputja.
2. Stored authority:
   `bubble.toml` persisted `review_policy` block, illetve a mar letezo report/artifact/parity metadata inputs.
3. In-scope consumers:
   backend status/list projection, valamint az ebben a fazisban eloallitott pure resolver API.
4. Explicit out-of-scope consumers:
   current gate routing, approval refresh/human-gate payload, reviewer snapshot alignment, UI/API controls, `O2-T9` cleanup lane.
5. Export surfaces closed in this phase:
   `no`; a backend contract additive lesz, de operatori/UI activation es human-gate consume kesobbi taskban zarul.

### Baseline Preservation

1. Must-preserve behaviors:
   - a current meta-review route tovabbra is a jelenlegi recommendation+budget behaviorrel fut
   - `MetaReviewRuntimeDeliveryObservation` tovabbra is observability-only marad
   - same-round parity/report/artifact guardok tovabbra is elnek
2. Allowed resolution paths:
   - report_json -> parity metadata merge
   - report_json -> findings artifact path resolution
   - findings artifact -> severity/count derivation ugyanazon resolverben
3. Forbidden regression interpretations:
   - a pure resolver bevezetese nem jelentheti azt, hogy routing mar atallt threshold enforce-ra
   - a reviewer snapshot vagy approval metadata nem hasznalhato severity fallbackkent
4. Replacement proof required if removed:
   ha barmely parity/report/artifact guard eltunik, explicit equivalence proof kell a replacement authority chainre.

### Success / Completion Proof Boundary

N/A. Ez a task nem valtoztatja meg a meta-review gate canonical success/completion proof source-at.

### Precondition and Side-Effect Boundary

1. Primary bounded task shape:
   `contract_or_persisted_authority_foundation`
2. Secondary shape (if any):
   `activation_or_read_model`, de csak additive backend status/list projection szinten; nincs kulon activation vagy UI consume.
3. Preconditions that must pass before side effects:
   - bubble TOML sikeres parse
   - review-policy patch validalas
   - freshness/expected-content guard sikeres
4. Side effects forbidden before preconditions pass:
   - `bubble.toml` felulirasa
   - reszleges write vagy invalid rendered config persistalasa
5. Invalid/precondition-failure behavior:
   zero side effects; explicit parse/validation/conflict result vagy throw.
6. Coordination primitives in scope:
   `N/A`; uj lock/mutex/lease nincs, csak optimistic freshness/conflict guard.

### In Scope

1. `BubbleConfig.review_policy` additive config schema + TOML parse/render.
2. Kozos review-policy runtime-view builder a requested/effective/support/blocked statehez.
3. Egyetlen bubble TOML mutation seam a review-policy mezokhoz.
4. Backend status/list projection additive bekotese ugyanarra a runtime-view builderre a current-tree API-builder consume familyben.
5. Pure `metaReviewGateThresholdAuthority` resolver boundary report/artifact/parity inputokbol.
6. A fenti seam-ekhez es contractszintekhez tartozo tesztcoverage.

### Out of Scope

1. Gate routing vagy auto-rework threshold tenyleges enforce-a.
2. Approval refresh / human-gate envelope parity alignment.
3. Reviewer bypass contract vagy activation.
4. Web UI control surface, UI store, API mutation endpoint.
5. `detail` UI/router-presenter compose family backend consume-kent vagy ownershipolt Phase 1 closurekent.
6. `O2-T9` runtime-capability cleanup vagy tmux capability rename.

### Safety Defaults

1. `review_policy.review_loop_mode = meta_only` Phase 1-ben persisted lehet, de `effective_loop_mode` nem valhat `meta_only`-va.
2. Hianyos threshold authority input unresolved/incomplete eredmenyt ad, nem secondary source fallbackot.
3. Additive status/list field nem valtoztathatja meg a jelenlegi CLI/UI renderelt semantics-et, ha meg nincs consume.
4. A mutation seam nem vezethet be silent overwrite-ot vagy partial bubble TOML write-ot.

### Contract Boundary / Blast Radius

1. `contract_boundary_override`: `yes`
2. Impacted contracts:
   - bubble config contract
   - backend status/list read-model contract
   - internal threshold authority result contract

### Complexity Risk Gate

1. `authority_risk`: `2`
2. `surface_spread`: `2`
3. `identity_join_risk`: `1`
4. `activation_coupling`: `0`
5. `prerequisite_risk`: `1`
6. `acceptance_multiplicity`: `1`
7. `risk_score`: `7`
8. `single-task allowed`: `yes`
9. Required split:
   - `foundation/refactor`: this task
   - `delivery`: Phase 2 threshold task
   - `activation/rollout`: Phase 3 bypass lane
10. Identity/join note:
   - canonical identity path: `report_json.meta_review_run_id` + `findings_artifact_ref` + resolved artifact parity metadata
   - competing identifiers or fallback identities: reviewer snapshot envelope id, approval metadata, status/list local fields
11. Authority/source-of-truth note:
   - canonical source: bubble `review_policy` config + named threshold authority resolver
   - forbidden secondary sources: reviewer snapshot, approval envelope metadata, UI/store local projection
12. Closure-budget triage:
   - closure buckets touched: `shared_contract`, `persisted_authority_or_schema`, `authority_producer`, `read_model_consumers`
   - intentionally collapsed closures: `shared_contract + persisted_authority_or_schema + read_model_consumers`, mert ugyanazon policy object additive backend projectionjat zarjak le UI/human-gate consume nelkul
   - explicitly deferred closures: `workflow_orchestration_consumers`, `internal_execution_consumers`, `cleanup_recovery_consumers`, `activation`
13. Bounded-task-shape decision:
   - primary shape: `contract_or_persisted_authority_foundation`
   - secondary shape: `activation_or_read_model`
   - why this bounded mix is safe: a read-model consume csak additive backend projection, kulon UI/human-gate/runtime activation nelkul

## L1 - Change Contract

### 0) Domain / Control Contract

| Item | Rule | Implementation Consequence | Priority | Timing |
|---|---|---|---|---|
| Business invariant | Egy bubble review-policy es threshold truthja nem szorodhat szet tobb canonical helperre | A config, projection es authority boundary egy-egy named helperben zaruljon | P1 | required-now |
| Control model | `review_policy` workflow-owned config, threshold truth pure resolver-owned | Actor, reviewer snapshot es approval metadata nem lehet authority source | P1 | required-now |
| Read-path rule | Status/list current-tree consume family csak kozos review-policy runtime view-bol olvashat | Nincs sajat inline requested/effective/support projection | P1 | required-now |
| Forbidden fallback | Reviewer snapshot, approval metadata, UI/store local state nem fallback truth | Resolver unresolved marad, projection guarded marad | P1 | required-now |
| Allowed resolution path | report_json + artifact + parity merge explicit resolverben engedelyezett | Same-authority deterministic merge helper-szinten maradhat | P1 | required-now |
| Missing-data rule | Invalid policy throw; hianyos authority unresolved/incomplete result | Nem szabad synthetic threshold truthot gyartani | P1 | required-now |
| Phase boundary | Ez a task foundation + additive backend read-model; routing/human-gate/bypass kesobbi task | A current route es approval consume nem valtozhat meg | P1 | required-now |

### 0a) Canonical Contract Preservation

| Element | Source Anchor | Required Interpretation | This Task Action | Priority | Timing |
|---|---|---|---|---|---|
| `MetaReviewRuntimeDeliveryObservation` | `src/v11/shared/metaReviewGate/metaReviewGateTypes.ts` | observability-only runtime truth | preserve | P1 | required-now |
| same-round findings validation/parity helper chain | `src/v11/shared/metaReviewGate/metaReviewGateFindingsValidation.ts`, `src/v11/shared/metaReviewGate/metaReviewGateFindingsMetadata.ts`, `src/v11/shared/metaReviewGate/metaReviewGateFindingsParityHelpers.ts`, `src/v11/shared/metaReviewGate/metaReviewGateFindingsParityInput.ts`, `src/v11/shared/metaReviewGate/metaReviewGateFindingsSplit.ts` | canonical guard/input chain resze | preserve helper-family szinten + expose behind new resolver | P1 | required-now |
| `metaReviewGateCurrentRunFinalization` + human-gate persistence wiring | `src/v11/shared/metaReviewGate/metaReviewGateCurrentRunFinalization.ts`, `src/v11/shared/metaReviewGate/metaReviewGateHumanGatePersistence.ts` | current route/finalization es persisted human-gate state/envelope seam parity preserved; default Phase 1 action a wiring valtozatlanul hagyasa | preserve_by_default; csak bounded same-family internal rewiring engedett explicit route/state/envelope parity proof mellett | P1 | required-now |
| reviewer snapshot | `src/v11/shared/metaReviewGate/metaReviewGateReviewerSnapshot.ts` | guard/approval consistency only | preserve_as_guard + direct negative authority proof | P1 | required-now |
| approval envelope metadata | `src/v11/shared/metaReviewGate/approvalRequestEnvelope.ts` | human-facing payload metadata, nem threshold truth | preserve_as_compat + direct negative authority proof | P1 | required-now |

### 0b) Scope Reality and Shape Proof

| Item | Rule | Implementation / Review Consequence | Priority | Timing |
|---|---|---|---|---|
| Inspected entrypoints / call-sites | list/status builders, bubble config parse/render, current meta-review validation helpers atnezve | Ezek hatarozzak meg a valos target-file scope-ot | P1 | required-now |
| Actual touched scope | foundation + additive backend read-model | Nem feature-activation task | P1 | required-now |
| Mutation entrypoints in scope | a named `updateBubbleReviewPolicy(...)` seam Phase 1-ben kotelezo output; a current-tree proofet a `bubbleConfig` parse/render + list/status API-builder family horgonyozza | Minden review-policy bubble TOML write ezen menjen at | P1 | required-now |
| Hidden scope ruled out | current routing, approval payload es UI presenter nem target | Ezek successor taskok maradnak | P1 | required-now |
| Branch inventory note | parse valid/invalid, write success/conflict, projection full/guarded, resolver resolved/unresolved | Tesztmatrixnek ezeket kulon fednie kell | P1 | required-now |
| Shape proof | csak egy consumer family (`read_model`) van in scope a foundation mellett | A bounded task shape megvedheto split nelkul | P1 | required-now |

### 0c) Plan Linkage and Successor Impact

| Item | Rule | Implementation / Review Consequence | Priority | Timing |
|---|---|---|---|---|
| Parent gap closed | plan Phase 1 foundation gap | Ez a task hozza letre az implementalhato foundation baseline-t | P1 | required-now |
| Depends on | draft reset plan reference; `O2-T9` kulon lane marad | Nem keverheto bele runtime-capability cleanup, es nincs approved parent-plan claim | P1 | required-now |
| Unlocks / impacts successors | Phase 2 threshold delivery, Phase 3A bypass contract | A successorok mar nem hozhatnak letre uj canonical ownerseget | P1 | required-now |
| Task-list impact | stale draft replaced by this task | Nincs in-place retarget ping-pong | P1 | required-now |
| Inherited validation / exit expectation | Phase 1 utan nincs gate behavior change | Approval/human-gate/bypass valtozatlan marad | P1 | required-now |

### 0d) Shared Contract Compatibility

| Shared Contract | Current Consumers | Change Type (`additive|breaking|N/A`) | This Task Action | Deferred Alignment |
|---|---|---|---|---|
| `BubbleConfig` | parse/render, lookup, create/start/kickoff, tests | additive | `review_policy` block bevezetese defaults-szal | Phase 2/3 consume families only if needed |
| `BubbleStatusView` | status CLI, downstream status consume a meglevo status API-n keresztul | additive | backend `reviewPolicy` projection field hozzaadasa render change nelkul | UI copy/controls deferred |
| `BubbleListEntry` | list CLI, UI summary presenter | additive | backend `reviewPolicy` projection field hozzaadasa render change nelkul | UI copy/controls deferred |
| threshold authority result | uj internal shared contract | additive | explicit resolver result shape | routing/human-gate consume Phase 2-ben |

### 0e) Baseline Preservation

| Current Behavior | Preserve/Replace/Forbid | Required Proof | Priority | Timing |
|---|---|---|---|---|
| recommendation+budget current route | preserve | current route test parity nem torhet | P1 | required-now |
| same-round parity guard | preserve | resolver ugyanazt a guard chain-t vagy explicit supersetet hasznalja | P1 | required-now |
| reviewer snapshot as approval-only guard | preserve | explicit negative proof kell arra, hogy Phase 1 nem vezeti be authority fallbackkent | P1 | required-now |
| approval metadata as compat payload | preserve | explicit negative proof kell arra, hogy nincs threshold truth promotion | P1 | required-now |

### 0f) Success / Completion Proof Boundary

| Surface | Current Proof Source | Target Proof Source | Canonical / Compat / Guard | Mixed-Truth Allowed? | Priority | Timing |
|---|---|---|---|---|---|---|
| meta-review gate route / completion | current gate finalization + state transition | unchanged in this task | canonical | no | P1 | required-now |

### 0g) Precondition and Side-Effect Boundary

| Case | Must Be Validated Before | Forbidden Early Side Effects | Required Failure Behavior | Priority | Timing |
|---|---|---|---|---|---|
| invalid `review_policy` parse/render input | TOML parse + enum validation | write of normalized bubble TOML | throw / zero side effects | P1 | required-now |
| stale mutation attempt | expected-content or freshness guard | overwrite of newer `bubble.toml` | explicit conflict result / zero side effects | P1 | required-now |
| unresolved threshold authority | artifact path/run-link/parity validation | synthesized severity truth | unresolved/incomplete result + diagnostics | P1 | required-now |

### 1) Call-site Matrix

| ID | File | Function/Entry | Exact Signature (args -> return) | Insertion Point | Expected Behavior | Priority | Timing | Evidence |
|---|---|---|---|---|---|---|---|---|
| CS1 | `src/types/bubble.ts` | review policy types | `BubbleConfig -> type`, `BubbleStatusView/BubbleListEntry -> additive field types` | bubble config + shared status/list types | canonical `review_policy` config type es runtime-view fieldek explicitten tipizaltak | P1 | required-now | T1, T3 |
| CS2 | `src/config/bubbleConfig.ts` | parse/render normalization | `parseBubbleConfigToml(input) -> BubbleConfig`, `renderBubbleConfigToml(config) -> string` | TOML parse/render path | `review_policy` parse/render defaults-szal, fail-fast invalid valuesnel | P1 | required-now | T1, T2 |
| CS3 | `src/v11/shared/reviewPolicy/reviewPolicyRuntime.ts` | shared runtime-view helper | `normalizeBubbleReviewPolicy(config: BubbleConfig) -> NormalizedBubbleReviewPolicy`, `buildBubbleReviewPolicyRuntimeView(config: BubbleConfig) -> BubbleReviewPolicyRuntimeView` | named Phase 1 helper | single canonical normalization + requested/effective/support projection | P1 | required-now | T3, T4 |
| CS4 | `src/v11/shared/reviewPolicy/updateBubbleReviewPolicy.ts` | mutation seam | `updateBubbleReviewPolicy(input: UpdateBubbleReviewPolicyInput) -> Promise<UpdateBubbleReviewPolicyResult>` | named Phase 1 helper | egyetlen bubble TOML read-modify-write seam ownership a review-policy mezokhoz | P1 | required-now | T5, T6 |
| CS5 | `src/v11/shared/list/listCommandContract.ts`, `src/v11/shared/list/listCommandEntryBuilder.ts`, `src/v11/shared/list/listCommandApi.ts` | list consume boundary | existing list API/builder signatures | backend list read path | a current-tree list consume family adja a scope-anchor proofot; ebbe a slice-ba kotelezoen be kell kotni a named shared runtime-view helpert `[consumes CS3]`, ugy hogy a shared semantics a list builder/core proofban maradnak, es a `listCommandApi.ts` boundary sem derivalt, sem normalizalt review-policy allapotot nem gyarthat ujra inline, hanem a CS3 canonical projectionjat viszi tovabb | P1 | required-now | T3, T7 |
| CS6 | `src/v11/shared/status/statusCommandViewBuilder.ts`, `src/v11/shared/status/statusCommandApi.ts` | status consume boundary | `buildBubbleStatusView(input) -> BubbleStatusView`, existing status API signatures | backend status read path | a current-tree status consume family adja a scope-anchor proofot; ebbe a slice-ba kotelezoen be kell kotni ugyanazt a named shared runtime-view helpert `[consumes CS3]`, ugy hogy a shared semantics a status builder/core proofban maradnak, es a `statusCommandApi.ts` boundary sem derivalt, sem normalizalt review-policy allapotot nem gyarthat ujra inline, hanem a CS3 canonical projectionjat viszi tovabb | P1 | required-now | T3, T8 |
| CS7 | `src/v11/shared/metaReviewGate/metaReviewGateThresholdAuthority.ts` | threshold authority resolver | `resolveMetaReviewGateThresholdAuthority(input: ResolveMetaReviewGateThresholdAuthorityInput) -> Promise<MetaReviewGateThresholdAuthorityResolution>` | named Phase 1 helper | a slice-nak kotelezoen le kell zarni egy named threshold-authority resolver boundaryt report/artifact/parity inputok folott | P1 | required-now | T9, T10, T11 |
| CS8 | `src/v11/shared/metaReviewGate/metaReviewGateCurrentRunFinalization.ts`, `src/v11/shared/metaReviewGate/metaReviewGateFindingsValidation.ts`, `src/v11/shared/metaReviewGate/metaReviewGateFindingsMetadata.ts`, `src/v11/shared/metaReviewGate/metaReviewGateFindingsParityHelpers.ts`, `src/v11/shared/metaReviewGate/metaReviewGateFindingsParityInput.ts`, `src/v11/shared/metaReviewGate/metaReviewGateFindingsSplit.ts` | threshold authority input chain | existing helper signatures -> support/current validation chain | existing helper family | a current tree authority input chain explicit; a named threshold resolver ezekre a helper inputokra epul | P1 | required-now | T9, T10, T11 |
| CS9 | `src/v11/shared/metaReviewGate/metaReviewGateHumanGatePersistence.ts`, `src/v11/shared/metaReviewGate/approvalRequestEnvelope.ts`, `src/v11/shared/metaReviewGate/metaReviewGateReviewerSnapshot.ts` | compat / guard / persistence surfaces | existing helper signatures | approval + reviewer guard family es a persisted human-gate seam | compat/guard surface maradnak, es a persisted human-gate seam Phase 1-ben nem lep elo threshold authority source-sza; a summary-normalization es same-round reviewer fail-closed behavior explicit direct regression proofot kap, beleertve a snapshot/envelope metadata negative authority proofjat is | P1 | required-now | T9, T10, T12 |

### 2) Data and Interface Contract

| Contract | Current | Target | Required Fields | Optional Fields | Compatibility | Priority | Timing |
|---|---|---|---|---|---|---|---|
| Bubble config review policy | nincs canonical object | `review_policy` additive object | `review_loop_mode`, `meta_review_auto_rework_min_severity` | future extension note | additive | P1 | required-now |
| Review policy runtime view | nincs | single canonical runtime view | `requested_loop_mode`, `effective_loop_mode`, `support_status`, `meta_review_auto_rework_min_severity` | `blocked_reason_code` | additive internal/read-model | P1 | required-now |
| Review policy mutation seam | nincs | explicit shared write contract | requested review-policy fields, freshness/expected-content guard | diagnostics | additive internal | P1 | required-now |
| Bubble list/status projection | implicit/no review-policy field | additive `reviewPolicy` field | canonical runtime view | none | additive | P1 | required-now |
| Threshold authority resolution | helper-halmazon szetszorva | explicit pure result | `status`, `parityMetadata`, `diagnostics`, `highestOpenSeverity`, `artifactRef`, `metaReviewRunId` | split counts | additive internal | P1 | required-now |

Normative rules:

1. `review_policy.review_loop_mode` canonical normalized domainje: `full | meta_only`.
2. `review_policy.meta_review_auto_rework_min_severity` canonical normalized domainje: `P1 | P2 | P3`.
3. Ha a `review_policy` blokk hianyzik, a normalized internal shape akkor is teljes legyen deterministic defaultokkal.
4. `effective_loop_mode` Phase 1-ben nem lehet `meta_only`.
5. `support_status` Phase 1 canonical domainje: `enabled | guarded`.
6. `P0` nem resze a persisted auto-rework threshold selector domainjenek; a meglevo fail-closed / highest-severity semantics alatt marad, es a policy config Phase 1-ben nem lazithatja vagy irhatja felul.
7. `highestOpenSeverity` csak report/artifact/parity authority chainbol szarmazhat; reviewer snapshotbol vagy approval metadata-bol nem.

### 3) Side Effects Contract

| Area | Allowed | Forbidden | Notes | Priority | Timing |
|---|---|---|---|---|---|
| Bubble TOML persistence | `updateBubbleReviewPolicy(...)` full-file rewrite validated renderrel | inline ad hoc write pathok, partial writes, silent overwrite | csak a canonical mutation seam irhat review-policyt | P1 | required-now |
| List/status projection | additive `reviewPolicy` field projection | sajat local requested/effective/support derivation | render change nem kotelezo | P1 | required-now |
| Threshold authority | artifact/report/parity read + pure result | state write, route mutation, approval payload shaping | ez Phase 1-ben pure helper marad | P1 | required-now |
| UI/API | N/A | uj controls, presenter copy, web store alignment | kulon successor | P1 | required-now |

Constraint: ha a task nem nevezi meg kifejezetten, a resolvernek es a runtime-view buildernek pure-nak kell maradnia.

### 4) Error and Fallback Contract

| Trigger | Dependency (if any) | Behavior (`throw|result|fallback`) | Fallback Value/Action | Reason Code | Log Level | Priority | Timing |
|---|---|---|---|---|---|---|---|
| invalid `review_policy.review_loop_mode` | config parse | throw | config reject | `REVIEW_POLICY_LOOP_MODE_INVALID` | error | P1 | required-now |
| invalid `review_policy.meta_review_auto_rework_min_severity` | config parse | throw | config reject | `REVIEW_POLICY_THRESHOLD_INVALID` | error | P1 | required-now |
| requested `meta_only` in Phase 1 | runtime view builder | result | `effective_loop_mode=full`, `support_status=guarded` | `REVIEW_POLICY_META_ONLY_GUARDED` | info | P1 | required-now |
| threshold artifact path / run link invalid | authority resolver | result | `status=unresolved`, diagnostics | `REVIEW_POLICY_THRESHOLD_SOURCE_UNRESOLVED` | warn | P1 | required-now |
| threshold artifact readable but severity not derivable | authority resolver | result | `status=incomplete`, diagnostics | `REVIEW_POLICY_THRESHOLD_CONTEXT_INCOMPLETE` | warn | P1 | required-now |
| mutation freshness conflict | update seam | result | explicit conflict result, no write | `REVIEW_POLICY_WRITE_CONFLICT` | warn | P1 | required-now |

### 5) Dependency Constraints

| Type | Items | Priority | Timing |
|---|---|---|---|
| must-use | `plans/archive/plans/runtime-review-policy-reset-and-phasing-plan-v1.md`, `docs/architecture/v11-placement-and-extraction-governance.md`, existing findings parity helpers | P1 | required-now |
| must-not-use | reviewer snapshot as threshold truth, approval metadata as severity source, UI/store rollout, `O2-T9` cleanup scope, gate-route behavior change | P1 | required-now |

### 6) Test Matrix

| ID | Scenario | Given | When | Then | Priority | Timing | Evidence |
|---|---|---|---|---|---|---|---|
| T1 | config round-trip | valid `review_policy` TOML block | parse + render + reparse | canonical internal shape round-trippel | P1 | required-now | `tests/config/bubbleConfig.test.ts` |
| T2 | invalid config reject | invalid loop mode, invalid severity enum, vagy `P0` threshold selector | parse lefut | explicit config error jon (`REVIEW_POLICY_*_INVALID`), `P0` rejecttel | P1 | required-now | `tests/config/bubbleConfig.test.ts` |
| T3 | shared runtime view | bubble config `review_policy`-val es anelkul | runtime view + list/status projection | ugyanaz a canonical `reviewPolicy` shape jelenik meg a list/status consume familyben | P1 | required-now | `tests/v11/shared/reviewPolicy/reviewPolicyRuntime.test.ts`, `tests/core/bubble/listBubbles.test.ts`, `tests/core/bubble/statusBubble.test.ts` |
| T4 | guarded meta_only projection | `requested_loop_mode=meta_only` | runtime view builder lefut | `effective_loop_mode=full`, `support_status=guarded`, blocked reason explicit | P1 | required-now | `tests/v11/shared/reviewPolicy/reviewPolicyRuntime.test.ts` |
| T5 | mutation seam updates only review policy | valid bubble TOML + review-policy patch | canonical write seam lefut | bubble TOML deterministicen frissul, mas mezok nem driftelnek | P1 | required-now | `tests/v11/shared/reviewPolicy/updateBubbleReviewPolicy.test.ts`, `tests/config/bubbleConfig.test.ts` |
| T6 | mutation conflict | stale expected content / freshness guard | update lefut | explicit `REVIEW_POLICY_WRITE_CONFLICT` result, zero side effects | P1 | required-now | `tests/v11/shared/reviewPolicy/updateBubbleReviewPolicy.test.ts` |
| T7 | list command contract es list API consume shared projectiont hasznal | bubble list entry epul | list build lefut | nincs sajat inline requested/effective/support drift, es a list consume family (`listCommandContract.ts` + `listCommandApi.ts`) additive `reviewPolicy` fieldje ugyanebbol a canonical runtime view-bol jon, nem API-boundary ujraderivalasbol | P1 | required-now | `tests/core/bubble/listBubbles.test.ts` (primary semantic proof a shared list builder/entry projectionre), `tests/v11/application/list/listCommandApi.test.ts` (current-tree application-boundary harness; ebben a taskban explicit review-policy projection assertionnel kell boviteni, hogy a command API additive `reviewPolicy` fieldje a CS3 canonical projectionjat hordozza, es az API boundary ne derivalt sajat review-policy allapotot inline) |
| T8 | status consume family shared projectiont hasznal | bubble status epul | status build lefut | nincs kulon status-only projection drift, es a status consume family (`statusCommandViewBuilder.ts` + `statusCommandApi.ts`) ugyanazt a canonical runtime view-t viszi tovabb, nem API-boundary ujraderivalasbol | P1 | required-now | `tests/core/bubble/statusBubble.test.ts` (primary es current-tree execution proof: a mai repo-ban ez a harness a `getBubbleStatusV11` / shared `statusCommandApi` utat futtatja, igy a status consume-boundary explicit review-policy projection assertioneit itt kell megfogni; a `statusCliEntrypointParity.test.ts` export-paritas-only coverage, ezert nem eleg onallo CS3 consume-proofnak) |
| T9 | threshold authority resolved same-authority chainbol | report_json + findings artifact + parity metadata rendelkezesre all | resolver/input-chain coverage lefut | `status=resolved`, parity metadata preserved, highest severity explicit, es a reviewer snapshot / approval envelope guard- vagy compat-surface marad ugy, hogy egyik sem lep elo authority source-sza | P1 | required-now | `tests/v11/shared/metaReviewGate/metaReviewGateThresholdAuthority.test.ts`, `tests/core/bubble/metaReviewGate.test.ts`, `tests/contracts/v11/metaReviewGate.contract.test.ts`, `tests/v11/shared/metaReviewGate/metaReviewGateFindingsMetadata.test.ts`, `tests/v11/shared/metaReviewGate/metaReviewGateFindingsParityHelpers.test.ts`, `tests/v11/shared/metaReviewGate/metaReviewGateHumanGatePersistence.test.ts` (negative authority proof a guard/compat surface-ekre) |
| T10 | threshold authority unresolved secondary source nelkul | artifact ref/run-link invalid vagy missing | resolver/input-chain coverage lefut | unresolved/incomplete result, reviewer snapshot es approval metadata nelkul mint authority source, vagyis nincs snapshot/envelope fallback severity truth | P1 | required-now | `tests/v11/shared/metaReviewGate/metaReviewGateThresholdAuthority.test.ts`, `tests/core/bubble/metaReviewGate.test.ts`, `tests/contracts/v11/metaReviewGate.contract.test.ts`, `tests/v11/shared/metaReviewGate/metaReviewGateFindingsMetadata.test.ts`, `tests/v11/shared/metaReviewGate/metaReviewGateFindingsParityHelpers.test.ts`, `tests/v11/shared/metaReviewGate/metaReviewGateHumanGatePersistence.test.ts` (negative authority proof fail-closed unresolved/incomplete agban) |
| T11 | threshold authority preserved validation/parity helper chain | same-round parity guard fail | resolver/input-chain coverage lefut | diagnostics a current validation/parity helper chain reasonjaira epulnek, de route nem valtozik, es a helper-family preserve + expose contractja megmarad | P1 | required-now | `tests/v11/shared/metaReviewGate/metaReviewGateThresholdAuthority.test.ts`, `tests/core/bubble/metaReviewGate.test.ts`, `tests/contracts/v11/metaReviewGate.contract.test.ts`, `tests/v11/shared/metaReviewGate/metaReviewGateFindingsMetadata.test.ts`, `tests/v11/shared/metaReviewGate/metaReviewGateFindingsParityHelpers.test.ts`, `tests/v11/shared/metaReviewGate/metaReviewGateFindingsSplit.test.ts` |
| T12 | approval envelope es reviewer snapshot guard surface preserve-elt marad | parity metadata consistent/mismatch, illetve same-round reviewer snapshot metadata-only open findings | approval request envelope epul | a human-facing summary normalization es fail-closed reviewer guard megmarad, de snapshot/envelope metadata nem lep elo threshold authority source-sza; explicit negative proof kell arra, hogy metadata-only surface marad | P1 | required-now | `tests/core/bubble/approvalRequestEnvelope.test.ts` (human-facing payload metadata-only proof), `tests/v11/shared/metaReviewGate/metaReviewGateFindingsMetadata.test.ts`, `tests/v11/shared/metaReviewGate/metaReviewGateHumanGatePersistence.test.ts` (negative authority proof a persisted human-gate route/payload surface-re) |

## L2 - Implementation Notes (Optional)

1. A review-policy helper placement `src/v11/shared/reviewPolicy/**` ala keruljon; ezek Phase 1 kotelezo named outputok, mikozben a task scope-proofja tovabbra is a meglevo `list/status` API-builder es `bubbleConfig` entrypointokbol induljon, es az acceptance-proof ott family-szinten ertelmezendo, ahol a current tree-ben nincs kulon dedikalt per-file unit harness.
2. A threshold authority resolver Phase 1-ben pure helper maradjon; a current gate finalization wiring defaultban maradjon erintetlen. Legfeljebb bounded same-family internal rewiring fogadhato el, ha explicit parity proof igazolja, hogy route selection, state write, envelope append es human-gate payload shaping valtozatlan marad, es ezzel sem approval-, sem human-gate-consume scope nem nyilik meg.
3. Ha a list/status additive field compile-time consumer alignmentet igenyel, az alignment maradjon backend presenter-level no-op; ne nyisson uj operatori copy vagy UI-state rolloutot.
4. Ha a consume-boundary proof existing current-tree harnessre epul, akkor a harnesset explicit review-policy projection assertionnel kell kiegesziteni; puszta export- vagy entrypoint-paritas nem eleg a CS3 consume-boundary bizonyitasahoz. A mai repo-ban ez T7-nel a `tests/v11/application/list/listCommandApi.test.ts`, T8-nal pedig a `tests/core/bubble/statusBubble.test.ts`, mert a `tests/v11/application/status/statusCliEntrypointParity.test.ts` csak export-paritast ellenoriz.

## Hardening Backlog (Optional)

| ID | Item | Layer | Priority | Timing | Source | Proposed Action |
|---|---|---|---|---|---|---|
| H1 | current routing consume atkotese a named resolverre | L2 | P2 | later-hardening | Phase 2 task | threshold delivery slice ownershipolja |
| H2 | approval refresh / human-gate payload authority alignment | L2 | P2 | later-hardening | reset plan | Phase 2 task ownershipolja |
| H3 | UI/control surface es guarded copy | L2 | P3 | later-hardening | reset plan | Phase 3A ownershipolja |

## Review Control

1. Minden finding tartalmazza: `priority`, `timing`, `layer`, `evidence`.
2. Max 2 L1 hardening round.
3. Uj `required-now` csak evidence-backed `P0/P1` lehet a masodik round utan.
4. A review fo kerdese:
   - letrejott-e a single policy schema + single runtime-view builder + single mutation seam + single pure authority boundary
   - ugy, hogy kozben nem csuszott be routing/human-gate/UI activation scope.

## Spec Lock

Mark task as `IMPLEMENTABLE` when:
1. a `review_policy` config schema es parse/render contract explicit,
2. a kozos runtime-view builder named Phase 1 helperkent explicit, es status/list consume-ra a current-tree API-builder anchorokon keresztul kotodik be,
3. a bubble TOML mutation seam named Phase 1 helperkent explicit es zero-side-effect conflict pathot ad,
4. a pure threshold-authority resolver named Phase 1 helperkent explicit result contracttal letrejon,
5. es a task tovabbra sem huzza be a gate routingot, approval payloadot vagy bypass activationt.
