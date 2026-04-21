---
artifact_type: task
artifact_id: task_runtime_review_policy_foundation_and_authority_refactor_phase1_v2
title: "Runtime Review Policy Foundation and Authority Refactor (Phase 1)"
status: draft
phase: phase1
target_files:
  - src/types/bubble.ts
  - src/config/bubbleConfig.ts
  - src/v11/shared/list/listCommandContract.ts
  - src/v11/shared/list/listCommandEntryBuilder.ts
  - src/v11/shared/status/statusCommandViewBuilder.ts
  - src/v11/shared/reviewPolicy/reviewPolicyRuntime.ts
  - src/v11/shared/reviewPolicy/updateBubbleReviewPolicy.ts
  - src/v11/shared/metaReviewGate/metaReviewGateThresholdAuthority.ts
  - src/v11/shared/metaReviewGate/metaReviewGateFindingsMetadata.ts
  - src/v11/shared/metaReviewGate/metaReviewGateFindingsParityInput.ts
  - src/v11/shared/metaReviewGate/metaReviewGateFindingsSplit.ts
  - tests/config/bubbleConfig.test.ts
  - tests/core/bubble/listBubbles.test.ts
  - tests/core/bubble/statusBubble.test.ts
  - tests/v11/shared/reviewPolicy/reviewPolicyRuntime.test.ts
  - tests/v11/shared/reviewPolicy/updateBubbleReviewPolicy.test.ts
  - tests/v11/shared/metaReviewGate/metaReviewGateThresholdAuthority.test.ts
prd_ref: null
plan_ref: plans/runtime-review-policy-reset-and-phasing-plan-v1.md
system_context_ref: docs/pairflow-initial-design.md
normative_refs:
  - plans/runtime-review-policy-reset-and-phasing-plan-v1.md
  - plans/tasks/review-policy-runtime-surface-and-rollout-phase1.md
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
2. A current list/status read pathok kozvetlenul a `BubbleConfig`-ot parse-oljak vagy consume-oljak, de nincs kozos review-policy runtime-view builder:
   - `src/v11/shared/list/listCommandEntryBuilder.ts`
   - `src/v11/shared/status/statusCommandViewBuilder.ts`
3. A meta-review gate current tree-ben letezik parity/report/artifact validation baseline, de nincs kulon named threshold-authority resolver boundary; a routing es human-gate consume tovabbra is mas helpercsoportokra tamaszkodik.
4. A `MetaReviewRuntimeDeliveryObservation` es a same-round parity baseline preserved runtime truth marad; ez a task ezeket nem csereli le.
5. A `src/core/**` topology vegleg retired; Phase 1 targetje csak a mai `src/v11/**`, `src/config/**`, `src/types/**` es teszt-topology lehet.

## L0 - Policy

### Goal

Bevezetni a shared runtime review policy foundationt ugy, hogy:
1. a canonical `review_policy` config/runtime shape workflow-owned legyen,
2. a bubble TOML update-je egyetlen mutation seamre keruljon,
3. a status/list/detail backend projection ugyanazt a runtime-view buildert hasznalja,
4. a thresholdhez szukseges report/artifact/parity feloldas kulon named authority boundarybe keruljon,
5. de a gate routing, approval refresh, human-gate payload es bypass activation meg ne valtozzon.

### Domain / Control Model Summary

1. Business invariant:
   ugyanarra a review-policy allapotra nem johet letre kulon canonical truth status/list/detail projectionben, bubble configban, vagy meta-review helper-oldalon.
2. Control model:
   a canonical `review_policy` workflow/orchestrator-owned bubble-config contract; a threshold authority truth kulon explicit resolver-owned boundary.
3. Read-path rule:
   review-policy runtime projection csak a kozos `reviewPolicyRuntime` helperen keresztul olvashato; threshold authority csak a named resolveren keresztul olvashato.
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
   - read_model_closure: owned here, de csak backend status/list/detail projection szinten
   - activation_closure: successor
   - cleanup_recovery_closure: successor

### Plan Linkage

1. Parent plan gap closed:
   a planbol hianyzo Phase 1 foundation slice, amely a canonical policy objectet, a kozos runtime-view buildert, a mutation seamet es a pure threshold-authority boundaryt letrehozza.
2. Depends on:
   approved [runtime-review-policy-reset-and-phasing-plan-v1.md](/Users/felho/dev/pairflow/plans/runtime-review-policy-reset-and-phasing-plan-v1.md), es az archived `O2-T9` baseline maradjon preserved boundary.
3. Unlocks / impacts successors:
   `runtime-review-policy-auto-rework-threshold-phase2`, valamint a `runtime-review-policy-reviewer-bypass-contract-phase3a` task.
4. Task-list impact:
   a korabbi stale Phase 1 draftot ezen path uj, current-tree implementalhato specje valtja fel.
5. Inherited validation / exit expectation:
   Phase 1 utan legyen explicit policy schema + runtime view + mutation seam + threshold authority API, de ne legyen threshold enforce, approval payload alignment vagy bypass activation.

### Canonical Contract Anchors

1. Source-of-truth anchors:
   - `src/v11/shared/metaReviewGate/metaReviewGateCurrentRunFinalization.ts`
   - `src/v11/shared/metaReviewGate/approvalRequestEnvelope.ts`
   - `src/v11/shared/metaReviewGate/metaReviewGateReviewerSnapshot.ts`
   - `src/v11/shared/metaReviewGate/metaReviewGateFindingsValidation.ts`
   - `src/v11/shared/list/listCommandEntryBuilder.ts`
   - `src/v11/shared/status/statusCommandViewBuilder.ts`
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

1. Inspected entrypoints / call-sites:
   `src/config/bubbleConfig.ts`, `src/types/bubble.ts`, `src/v11/shared/list/listCommandEntryBuilder.ts`, `src/v11/shared/status/statusCommandViewBuilder.ts`, `src/v11/shared/metaReviewGate/metaReviewGateCurrentRunFinalization.ts`, `src/v11/shared/metaReviewGate/approvalRequestEnvelope.ts`, `src/v11/shared/metaReviewGate/metaReviewGateFindingsValidation.ts`, `src/v11/shared/metaReviewGate/metaReviewGateFindingsParityInput.ts`.
2. Actual touched scope:
   `contract_or_persisted_authority_foundation` primary, `activation_or_read_model` secondary only a backend list/status/detail consume familyre.
3. Mutation entrypoints in scope:
   az uj `updateBubbleReviewPolicy(...)` bubble TOML read-modify-write seam; mas command/router/UI mutation entrypoint nincs scope-ban.
4. Hidden scope ruled out:
   approval/human-gate payload shaping, current-run routing, auto-rework dispatch, UI presenter es web store consume kulon ellenorizve es kiveve a scope-bol.
5. Branch inventory note:
   precondition-pass/fail a bubble TOML write seamnel, parse/render valid/invalid branch, threshold authority resolved/unresolved/incomplete branch, es status/list projection full-vs-guarded branch.
6. Why the declared task shape matches reality:
   a task shared contract + persisted config + egy read-model family backend consume closurejat zarja; workflow routing consume, human-gate consume es activation kulon successor taskokban maradnak.

### Authority Boundary Map

1. Authority producer:
   a bubble config `review_policy` object es a pure threshold-authority resolver outputja.
2. Stored authority:
   `bubble.toml` persisted `review_policy` block, illetve a mar letezo report/artifact/parity metadata inputs.
3. In-scope consumers:
   backend status/list/detail projection, es a future threshold task altal hasznalhato pure resolver API.
4. Explicit out-of-scope consumers:
   current gate routing, approval refresh/human-gate payload, reviewer snapshot alignment, UI/API controls, archived `O2-T9` cleanup baseline.
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
   `activation_or_read_model`, de csak additive backend status/list/detail projection szinten; nincs kulon activation vagy UI consume.
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
2. Kozós review-policy runtime-view builder a requested/effective/support/blocked statehez.
3. Egyetlen bubble TOML mutation seam a review-policy mezokhoz.
4. Backend status/list/detail projection additive bekotese ugyanarra a runtime-view builderre.
5. Pure `metaReviewGateThresholdAuthority` resolver boundary report/artifact/parity inputokbol.
6. A fenti seam-ekhez es contractszintekhez tartozo tesztcoverage.

### Out of Scope

1. Gate routing vagy auto-rework threshold tenyleges enforce-a.
2. Approval refresh / human-gate envelope parity alignment.
3. Reviewer bypass contract vagy activation.
4. Web UI control surface, UI store, API mutation endpoint.
5. archived `O2-T9` runtime-capability cleanup ujranyitasa vagy tovabbi tmux capability rename.

### Safety Defaults

1. `review_policy.review_loop_mode = meta_only` Phase 1-ben persisted lehet, de `effective_loop_mode` nem valhat `meta_only`-va.
2. Hianyos threshold authority input unresolved/incomplete eredmenyt ad, nem secondary source fallbackot.
3. Additive status/list/detail field nem valtoztathatja meg a jelenlegi CLI/UI renderelt semantics-et, ha meg nincs consume.
4. A mutation seam nem vezethet be silent overwrite-ot vagy partial bubble TOML write-ot.

### Contract Boundary / Blast Radius

1. `contract_boundary_override`: `yes`
2. Impacted contracts:
   - bubble config contract
   - backend status/list/detail read-model contract
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
| Read-path rule | Status/list/detail csak kozos review-policy runtime view-bol olvashat | Nincs sajat inline requested/effective/support projection | P1 | required-now |
| Forbidden fallback | Reviewer snapshot, approval metadata, UI/store local state nem fallback truth | Resolver unresolved marad, projection guarded marad | P1 | required-now |
| Allowed resolution path | report_json + artifact + parity merge explicit resolverben engedelyezett | Same-authority deterministic merge helper-szinten maradhat | P1 | required-now |
| Missing-data rule | Invalid policy throw; hianyos authority unresolved/incomplete result | Nem szabad synthetic threshold truthot gyartani | P1 | required-now |
| Phase boundary | Ez a task foundation + additive backend read-model; routing/human-gate/bypass kesobbi task | A current route es approval consume nem valtozhat meg | P1 | required-now |

### 0a) Canonical Contract Preservation

| Element | Source Anchor | Required Interpretation | This Task Action | Priority | Timing |
|---|---|---|---|---|---|
| `MetaReviewRuntimeDeliveryObservation` | `src/v11/shared/metaReviewGate/metaReviewGateTypes.ts` | observability-only runtime truth | preserve | P1 | required-now |
| same-round findings parity validation | `src/v11/shared/metaReviewGate/metaReviewGateFindingsValidation.ts` | canonical guard chain resze | preserve + expose behind new resolver | P1 | required-now |
| reviewer snapshot | `src/v11/shared/metaReviewGate/metaReviewGateReviewerSnapshot.ts` | guard/approval consistency only | preserve_as_guard | P1 | required-now |
| approval envelope metadata | `src/v11/shared/metaReviewGate/approvalRequestEnvelope.ts` | human-facing payload metadata, nem threshold truth | preserve_as_compat | P1 | required-now |

### 0b) Scope Reality and Shape Proof

| Item | Rule | Implementation / Review Consequence | Priority | Timing |
|---|---|---|---|---|
| Inspected entrypoints / call-sites | list/status builders, bubble config parse/render, current meta-review validation helpers atnezve | Ezek hatarozzak meg a valos target-file scope-ot | P1 | required-now |
| Actual touched scope | foundation + additive backend read-model | Nem feature-activation task | P1 | required-now |
| Mutation entrypoints in scope | uj `updateBubbleReviewPolicy(...)` seam | Minden review-policy bubble TOML write ezen menjen at | P1 | required-now |
| Hidden scope ruled out | current routing, approval payload es UI presenter nem target | Ezek successor taskok maradnak | P1 | required-now |
| Branch inventory note | parse valid/invalid, write success/conflict, projection full/guarded, resolver resolved/unresolved | Tesztmatrixnek ezeket kulon fednie kell | P1 | required-now |
| Shape proof | csak egy consumer family (`read_model`) van in scope a foundation mellett | A bounded task shape megvedheto split nelkul | P1 | required-now |

### 0c) Plan Linkage and Successor Impact

| Item | Rule | Implementation / Review Consequence | Priority | Timing |
|---|---|---|---|---|
| Parent gap closed | plan Phase 1 foundation gap | Ez a task hozza letre az implementalhato foundation baseline-t | P1 | required-now |
| Depends on | approved reset plan; archived `O2-T9` preserved baseline marad | Nem keverheto bele runtime-capability cleanup | P1 | required-now |
| Unlocks / impacts successors | Phase 2 threshold delivery, Phase 3A bypass contract | A successorok mar nem hozhatnak letre uj canonical ownerseget | P1 | required-now |
| Task-list impact | stale draft replaced by this task | Nincs in-place retarget ping-pong | P1 | required-now |
| Inherited validation / exit expectation | Phase 1 utan nincs gate behavior change | Approval/human-gate/bypass valtozatlan marad | P1 | required-now |

### 0d) Shared Contract Compatibility

| Shared Contract | Current Consumers | Change Type (`additive|breaking|N/A`) | This Task Action | Deferred Alignment |
|---|---|---|---|---|
| `BubbleConfig` | parse/render, lookup, create/start/kickoff, tests | additive | `review_policy` block bevezetese defaults-szal | Phase 2/3 consume families only if needed |
| `BubbleStatusView` | status CLI, UI detail presenter | additive | backend `reviewPolicy` projection field hozzaadasa render change nelkul | UI copy/controls deferred |
| `BubbleListEntry` | list CLI, UI summary presenter | additive | backend `reviewPolicy` projection field hozzaadasa render change nelkul | UI copy/controls deferred |
| threshold authority result | uj internal shared contract | additive | explicit resolver result shape | routing/human-gate consume Phase 2-ben |

### 0e) Baseline Preservation

| Current Behavior | Preserve/Replace/Forbid | Required Proof | Priority | Timing |
|---|---|---|---|---|
| recommendation+budget current route | preserve | current route test parity nem torhet | P1 | required-now |
| same-round parity guard | preserve | resolver ugyanazt a guard chain-t vagy explicit supersetet hasznalja | P1 | required-now |
| reviewer snapshot as approval-only guard | preserve | Phase 1 nem vezeti be authority fallbackkent | P1 | required-now |
| approval metadata as compat payload | preserve | nincs threshold truth promotion | P1 | required-now |

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
| CS2 | `src/config/bubbleConfig.ts` | parse/render normalization | `parseBubbleConfigToml(input, options?) -> BubbleConfig`, `renderBubbleConfigToml(config) -> string` | TOML parse/render path | `review_policy` parse/render defaults-szal, fail-fast invalid valuesnel | P1 | required-now | T1, T2 |
| CS3 | `src/v11/shared/reviewPolicy/reviewPolicyRuntime.ts` | policy runtime helpers | `normalizeBubbleReviewPolicy(config: BubbleConfig) -> NormalizedBubbleReviewPolicy`, `buildBubbleReviewPolicyRuntimeView(config: BubbleConfig) -> BubbleReviewPolicyRuntimeView` | uj shared helper | single canonical normalization + requested/effective/support projection | P1 | required-now | T3, T4 |
| CS4 | `src/v11/shared/reviewPolicy/updateBubbleReviewPolicy.ts` | mutation seam | `updateBubbleReviewPolicy(input: UpdateBubbleReviewPolicyInput) -> Promise<UpdateBubbleReviewPolicyResult>` | uj shared mutation helper | egyetlen bubble TOML read-modify-write seam ownership a review-policy mezokhoz | P1 | required-now | T5, T6 |
| CS5 | `src/v11/shared/list/listCommandContract.ts`, `src/v11/shared/list/listCommandEntryBuilder.ts` | list projection consume | `buildBubbleListEntry(...) -> Promise<BubbleBuildResult>` | backend list read path | a bubble list entry ugyanazt a canonical runtime view-t projekciozza | P1 | required-now | T3, T7 |
| CS6 | `src/v11/shared/status/statusCommandViewBuilder.ts` | status projection consume | `buildBubbleStatusView(input) -> BubbleStatusView` | backend status/detail read path | a status/detail ugyanazt a canonical runtime view-t projekciozza | P1 | required-now | T3, T8 |
| CS7 | `src/v11/shared/metaReviewGate/metaReviewGateThresholdAuthority.ts` | pure authority resolver | `resolveMetaReviewGateThresholdAuthority(input: ResolveMetaReviewGateThresholdAuthorityInput) -> Promise<MetaReviewGateThresholdAuthorityResolution>` | uj shared meta-review gate helper | report/artifact/parity inputokbol canonical threshold authority resultet epit route mutation nelkul | P1 | required-now | T9, T10, T11 |
| CS8 | `src/v11/shared/metaReviewGate/metaReviewGateFindingsMetadata.ts`, `src/v11/shared/metaReviewGate/metaReviewGateFindingsParityInput.ts`, `src/v11/shared/metaReviewGate/metaReviewGateFindingsSplit.ts` | support helpers | existing helpers -> support-only | existing helper modules | support-only maradnak; nem valnak kulon authority dontesi felulettte | P1 | required-now | T9, T10 |

### 2) Data and Interface Contract

| Contract | Current | Target | Required Fields | Optional Fields | Compatibility | Priority | Timing |
|---|---|---|---|---|---|---|---|
| Bubble config review policy | nincs canonical object | `review_policy` additive object | `review_loop_mode`, `meta_review_auto_rework_min_severity` | future extension note | additive | P1 | required-now |
| Review policy runtime view | nincs | single canonical runtime view | `requested_loop_mode`, `effective_loop_mode`, `support_status`, `meta_review_auto_rework_min_severity` | `blocked_reason_code` | additive internal/read-model | P1 | required-now |
| Review policy mutation seam | nincs | explicit shared write contract | requested review-policy fields, freshness/expected-content guard | diagnostics | additive internal | P1 | required-now |
| Bubble list/status projection | implicit/no review-policy field | additive `reviewPolicy` field | canonical runtime view | none | additive | P1 | required-now |
| Threshold authority resolution | helper-halmazon szetszorva | explicit pure result | `status`, `parityMetadata`, `diagnostics`, `highestOpenSeverity` | split counts, artifactRef, metaReviewRunId | additive internal | P1 | required-now |

Normative rules:

1. `review_policy.review_loop_mode` canonical normalized domainje: `full | meta_only`.
2. `review_policy.meta_review_auto_rework_min_severity` canonical normalized domainje: `P1 | P2 | P3`.
3. Ha a `review_policy` blokk hianyzik, a normalized internal shape akkor is teljes legyen deterministic defaultokkal.
4. `effective_loop_mode` Phase 1-ben nem lehet `meta_only`.
5. `support_status` minimum domain: `enabled | guarded | unsupported`.
6. `highestOpenSeverity` csak report/artifact/parity authority chainbol szarmazhat; reviewer snapshotbol vagy approval metadata-bol nem.

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
| must-use | `plans/runtime-review-policy-reset-and-phasing-plan-v1.md`, `docs/architecture/v11-placement-and-extraction-governance.md`, existing findings parity helpers | P1 | required-now |
| must-not-use | reviewer snapshot as threshold truth, approval metadata as severity source, UI/store rollout, archived `O2-T9` cleanup scope, gate-route behavior change | P1 | required-now |

### 6) Test Matrix

| ID | Scenario | Given | When | Then | Priority | Timing | Evidence |
|---|---|---|---|---|---|---|---|
| T1 | config round-trip | valid `review_policy` TOML block | parse + render + reparse | canonical internal shape round-trippel | P1 | required-now | `tests/config/bubbleConfig.test.ts` |
| T2 | invalid config reject | invalid loop mode vagy severity | parse lefut | explicit config error jon | P1 | required-now | `tests/config/bubbleConfig.test.ts` |
| T3 | shared runtime view | bubble config `review_policy`-val es anelkul | runtime view + list/status projection | ugyanaz a canonical `reviewPolicy` shape jelenik meg | P1 | required-now | `tests/v11/shared/reviewPolicy/reviewPolicyRuntime.test.ts`, `tests/core/bubble/listBubbles.test.ts`, `tests/core/bubble/statusBubble.test.ts` |
| T4 | guarded meta_only projection | `requested_loop_mode=meta_only` | runtime view builder lefut | `effective_loop_mode=full`, `support_status=guarded`, blocked reason explicit | P1 | required-now | `tests/v11/shared/reviewPolicy/reviewPolicyRuntime.test.ts` |
| T5 | mutation seam updates only review policy | valid bubble TOML + review-policy patch | `updateBubbleReviewPolicy(...)` lefut | bubble TOML deterministicen frissul, mas mezok nem driftelnek | P1 | required-now | `tests/v11/shared/reviewPolicy/updateBubbleReviewPolicy.test.ts` |
| T6 | mutation conflict | stale expected content / freshness guard | update lefut | explicit conflict result, zero side effects | P1 | required-now | `tests/v11/shared/reviewPolicy/updateBubbleReviewPolicy.test.ts` |
| T7 | list consume shared projectiont hasznal | bubble list entry epul | list build lefut | nincs sajat inline requested/effective/support drift | P1 | required-now | `tests/core/bubble/listBubbles.test.ts` |
| T8 | status/detail consume shared projectiont hasznal | bubble status epul | status build lefut | nincs kulon status-only projection drift | P1 | required-now | `tests/core/bubble/statusBubble.test.ts` |
| T9 | threshold authority resolved same-authority chainbol | report_json + findings artifact + parity metadata rendelkezesre all | resolver lefut | `status=resolved`, parity metadata preserved, highest severity explicit | P1 | required-now | `tests/v11/shared/metaReviewGate/metaReviewGateThresholdAuthority.test.ts` |
| T10 | threshold authority unresolved secondary source nelkul | artifact ref/run-link invalid vagy missing | resolver lefut | unresolved/incomplete result, reviewer snapshot nelkul | P1 | required-now | `tests/v11/shared/metaReviewGate/metaReviewGateThresholdAuthority.test.ts` |
| T11 | threshold authority preserved guard chain | same-round parity guard fail | resolver lefut | diagnostics a current guard reasonokon alapulnak, de route nem valtozik | P1 | required-now | `tests/v11/shared/metaReviewGate/metaReviewGateThresholdAuthority.test.ts` |

## L2 - Implementation Notes (Optional)

1. A review-policy helper placement a `src/v11/shared/reviewPolicy/**` ala menjen, mert status/list es kesobbi mutation/UI/API consume kozos foundationje.
2. A threshold authority resolver Phase 1-ben pure helper maradjon; a current gate finalization wiring atallasa csak akkor elfogadhato ebben a taskban, ha behavioral parity bizonyithato es nem nyit approval/human-gate consume-ot.
3. Ha a list/status additive field compile-time consumer alignmentet igenyel, az alignment maradjon backend presenter-level no-op; ne nyisson uj operatori copy vagy UI-state rolloutot.

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
2. a kozos runtime-view builder status/list/detail consume-ra explicit,
3. a bubble TOML mutation seam explicit es zero-side-effect conflict pathot ad,
4. a pure threshold-authority resolver explicit result contracttal letrejon,
5. es a task tovabbra sem huzza be a gate routingot, approval payloadot vagy bypass activationt.
