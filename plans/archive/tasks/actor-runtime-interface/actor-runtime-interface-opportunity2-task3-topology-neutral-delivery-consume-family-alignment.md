---
artifact_type: task
artifact_id: task_actor_runtime_interface_opportunity2_task3_topology_neutral_delivery_consume_family_alignment_v1
title: "Actor Runtime Interface Opportunity 2 Task 3: Topology-Neutral Delivery Consume-Family Alignment"
status: implementable
phase: post-phaseE
target_files:
  - src/v11/shared/kickoff/kickoffDependencyContract.ts
  - src/v11/shared/kickoff/kickoffValidatedExecutionDelivery.ts
  - src/v11/shared/kickoff/kickoffResultBuilders.ts
  - src/v11/shared/askHuman/askHumanDeliveryPortsContract.ts
  - src/v11/shared/askHuman/askHumanCommandContract.ts
  - src/v11/shared/askHuman/askHumanFlowContract.ts
  - src/v11/shared/askHuman/askHumanFinalizationArtifactsContract.ts
  - src/v11/shared/converged/convergedCommandTypes.ts
  - src/v11/shared/delivery/implementerHandoffDelivery.ts
  - src/v11/shared/metaReview/metaReviewDeliveryCapabilities.ts
  - src/v11/application/approval/approvalCommandContract.ts
  - src/v11/application/approval/approvalCommandDependencyResolution.ts
  - src/v11/application/approval/runApprovalDecisionEffects.ts
  - src/v11/application/askHuman/askHumanNotificationEmission.ts
  - src/v11/application/askHuman/askHumanFinalizationDependencyDefaults.ts
  - src/v11/application/pass/normalPassDeliveryExecution.ts
  - src/v11/application/pass/passResultDelivery.ts
  - src/v11/application/pass/normalPassFinalization.ts
  - src/v11/application/pass/reviewerDelivery.ts
  - src/v11/application/pass/reviewerDeliveryDefaults.ts
  - src/v11/application/pass/reviewerDeliveryHelpers.ts
  - src/v11/application/pass/runNormalPassFlow.ts
  - src/v11/application/pass/runNormalPassFlowContract.ts
  - src/v11/application/converged/convergedDefaultDependencies.ts
  - src/v11/application/converged/convergedExecution.ts
  - src/v11/application/converged/convergedGateDelivery.ts
  - src/v11/application/converged/runConvergedFlowContract.ts
  - src/v11/application/reply/replyCommandContract.ts
  - src/v11/application/reply/replyCommandDependencyResolution.ts
  - src/v11/application/reply/replyCommandApi.ts
  - src/v11/application/watchdog/watchdogCommandContract.ts
  - src/v11/application/watchdog/watchdogDependencyDefaults.ts
  - src/v11/application/watchdog/watchdogCommandFlow.ts
  - src/v11/application/watchdog/watchdogPendingReworkIntent.ts
  - tests/v11/application/kickoff/kickoffValidatedExecution.test.ts
  - tests/v11/application/kickoff/kickoffResultBuilders.test.ts
  - tests/contracts/v11/kickoff.contract.runner.ts
  - tests/v11/application/askHuman/askHumanNotificationEmission.test.ts
  - tests/v11/application/askHuman/askHumanFinalization.test.ts
  - tests/v11/application/askHuman/askHumanFinalizationArtifacts.test.ts
  - tests/contracts/v11/askHuman.contract.runner.ts
  - tests/contracts/v11/approval.contract.runner.ts
  - tests/core/human/approval.test.ts
  - tests/v11/application/pass/passResultDelivery.test.ts
  - tests/v11/application/pass/normalPassFinalization.test.ts
  - tests/core/agent/pass.test.ts
  - tests/contracts/v11/pass.contract.runner.ts
  - tests/v11/application/converged/convergedExecution.test.ts
  - tests/v11/application/converged/runConvergedFlow.test.ts
  - tests/core/agent/converged.test.ts
  - tests/contracts/v11/converged.contract.runner.ts
  - tests/v11/application/reply/replyDeliveryInvariant.test.ts
  - tests/core/human/reply.test.ts
  - tests/contracts/v11/reply.contract.runner.ts
  - tests/core/runtime/watchdog.test.ts
  - tests/core/bubble/watchdogBubble.test.ts
  - tests/v11/application/watchdog/watchdogCommandApi.test.ts
  - tests/contracts/v11/watchdog.contract.runner.ts
prd_ref: null
plan_ref: plans/actor-runtime-interface-post-phaseE-successor-plan-v1.md
system_context_ref: docs/pairflow-initial-design.md
owners:
  - "felho"
---

# Task: Actor Runtime Interface Opportunity 2 Task 3: Topology-Neutral Delivery Consume-Family Alignment

## Current Codebase Check (2026-04-18)

1. Az `O2-T2` utan a topology-neutral canonical delivery contract current-tree szinten mar explicit:
   - `src/v11/shared/delivery/tmuxDeliveryContract.ts`
   - `src/v11/shared/ports/tmuxDelivery.ts`
   - `src/v11/infrastructure/channel/tmux/tmuxDelivery.ts`
2. A canonical producer seam mar kulon exportot ad:
   - `emitDeliveryNotificationAck(...) -> Promise<DeliveryAck>`
   - a retained `emitTmuxDeliveryNotification(...)` wrapper csak legacy projectiont ad vissza ugyanebbbol a canonical truthbol.
3. A workflow/orchestration consume family nagy resze ugyanakkor meg mindig retained `tmux` delivery port/result naminget fogyaszt:
   - approval: `src/v11/application/approval/**`
   - kickoff: `src/v11/shared/kickoff/**`
   - ask-human: `src/v11/shared/askHuman/**`, `src/v11/application/askHuman/**`
   - pass / converged: `src/v11/application/pass/**`, `src/v11/application/converged/**`
   - reply / watchdog: `src/v11/application/reply/**`, `src/v11/application/watchdog/**`
4. A direct consume helyek kozul tobb ma meg a retained compatibility projectionbol kepzi vissza a canonicalnak szant allapotot:
   - `passResultDelivery.ts`
   - `convergedGateDelivery.ts`
   - `watchdogPendingReworkIntent.ts`
   ezek `delivery.delivered` vagy retained result fields alapjan allitanak elo `accepted|rejected` consume semanticsat.
5. A retained helper consume seam-ek is meg a legacy result shape-re ulnek:
   - `src/v11/shared/delivery/implementerHandoffDelivery.ts`
   - `src/v11/shared/metaReview/metaReviewDeliveryCapabilities.ts`
   - shared ask-human es kickoff delivery contractok.
6. A public/read-model surfaces tovabbra is retained naminget exportalnak, de current-tree szinten ez nem blokkolo `O2-T3` prereq:
   - `src/v11/shared/ports/uiRouter.ts`
   - `src/index.ts`
   mert a retained `EmitTmuxDeliveryNotificationResult` shape explicit compat projectionkent megmaradt.
7. Emiatt az `O2-T3` current-tree reality alapjan nem producer task es nem public/read-model cleanup task:
   - consumer-family alignment kell,
   - narrow shared consume-contract bridge-ekkel,
   - retained public/read-model cleanup explicit deferrel.

## L0 - Policy

### Goal

1. A topology-neutral canonical delivery truth consume-side atallitasa a delivery consume familyben ugy, hogy a direct/shared/orchestration decisions mar ne a retained `delivered` projectiont tekintsek canonical source-nak.
2. A retained `EmitTmuxDeliveryNotification...` wrapper es legacy result shape maradjon explicit compat bridge ott, ahol current consumers vagy harness-ek ezt meg igenylik, de ne onallo authoritykent.
3. Ne csusszon be a launch/executor lane (`O2-T4`/`O2-T5`) vagy a delivery public/read-model cleanup ugyanebbe a taskba.

### Domain / Control Model Summary

1. Business invariant: a delivery acceptance truth topologytol fuggetlen marad; a canonical outcome tovabbra is `accepted | rejected`, nem retained `tmux` wrapper projection vagy pane-observability.
2. Control model: a canonical producer truth az `emitDeliveryNotificationAck(...) -> DeliveryAck`; a consume family ezt a neutral ackot vagy ugyanennek same-authority projectionjat fogyaszthatja, de nem re-derivalhatja kulon canonical truth-ra a legacy `delivered` fieldbol.
3. Read-path rule: direct delivery decision csak ezekbol johet:
   - `DeliveryAck.status`
   - `DeliveryAck.reason`
   - `DeliveryAck.reason_code`
   - vagy ennek ugyanazon consume chainben, explicit projectionkent kepzett compatibility shape-je.
4. Forbidden fallback:
   - `EmitTmuxDeliveryNotificationResult.delivered` mint onallo canonical source,
   - pane activity / watchdog retry / delivery side effect mint success truth,
   - public/read-model export naming vagy operator-facing wording mint orchestration authority.
5. Allowed resolution path:
   - a consume family internal/shared contractjai atallhatnak `EmitDeliveryNotificationAckPort` + `DeliveryAck` namingre;
   - ahol outward result surface retained compatibilityt igenyel, a `delivered` / `reason` / `reason_code` projection megmaradhat, ha explicitten a neutral ackbol szarmazik;
   - helper retry/aggregate logic megmaradhat, ha a retry trigger es aggregate failure mapping is a canonical ackbol indul.
6. Missing-data rule:
   - hianyzo delivery runtime vagy explicit rejected ack esetben fail-closed consume marad;
   - consumer helper nem allithat elo synthetic `accepted` outcome-ot a wrapper sikeres visszaterese, pane liveness vagy retry side effect alapjan;
   - ha egy consume site csak breaking modon tudna atallni, retained compatibility projection maradjon meg es a removal kulon successor cleanup legyen.
7. Phase boundary:
   - shared contract closure: inherited from `O2-T2`, csak a consume-familyhez tartozo narrow bridge contractok owned here
   - producer closure: predecessor (`O2-T2`)
   - internal execution closure: owned here
   - workflow/orchestration closure: owned here
   - read_model_closure: deferred
   - public export cleanup: deferred
   - launch/executor closure: successor (`O2-T4`, `O2-T5`)

### Plan Linkage

1. Parent plan gap closed: az `O2-T2` utan a kovetkezo blokkolo gap az, hogy a delivery consume family meg mindig retained `tmux` vocabularyt es `delivered` projectiont fogyaszt canonical consume szerepben.
2. Depends on:
   - `plans/actor-runtime-interface-post-phaseE-successor-plan-v1.md`
   - `docs/actor-runtime-interface/topology-neutral-delivery-executor-contract-note-v1.md`
   - `plans/archive/tasks/actor-runtime-interface-opportunity2-task2-topology-neutral-delivery-contract-and-retained-adapter-foundation.md`
3. Unlocks / impacts successors:
   - retained `tmux` delivery wrapper kesobbi cleanupja, ha mar nincs in-scope consumer rajta
   - esetleges public/read-model delivery export cleanup, ha az `O2-T3` utan ez kulon bounded slice-kent meg mindig indokolt
   - `O2-T4` launch/executor foundation lane mar producer-separate maradhat, nem kell delivery consumer truthot tovabb cipelnie
4. Task-list impact:
   - ez az `Opportunity 2` current next bounded implementation slice-a
   - nem valtja ki az `O2-T4` launch/executor foundationt
   - nem ownershipolja a delivery public/read-model export surface cleanupjat
5. Inherited validation / exit expectation:
   - explicit fan-out inventory kell approval / kickoff / ask-human / pass / converged / reply / watchdog familyben
   - direct consume places mar a neutral ack truthbol dontsenek
   - retained compatibility fields csak same-authority projectionkent maradhatnak

### Canonical Contract Anchors

1. Source-of-truth anchors:
   - `plans/actor-runtime-interface-post-phaseE-successor-plan-v1.md`
   - `docs/actor-runtime-interface/topology-neutral-delivery-executor-contract-note-v1.md`
   - `plans/archive/tasks/actor-runtime-interface-opportunity2-task2-topology-neutral-delivery-contract-and-retained-adapter-foundation.md`
   - `src/v11/shared/delivery/tmuxDeliveryContract.ts`
   - `src/v11/shared/ports/tmuxDelivery.ts`
   - `src/v11/infrastructure/channel/tmux/tmuxDelivery.ts`
2. Canonical elements:
   - `DeliveryAck`
   - `DeliveryAckStatus`
   - `DeliveryAckReasonCode`
   - `DeliveryFailureReason`
   - `EmitDeliveryNotificationAckPort`
   - `EmitDeliveryNotificationInput`
   - `accepted | rejected`
3. Compat elements:
   - `EmitTmuxDeliveryNotificationPort`
   - `EmitTmuxDeliveryNotificationResult`
   - `delivered`
   - `TmuxDeliveryAck*` alias family
   - `emitTmuxDeliveryNotification(...)`
4. Guard elements:
   - `shouldRetryImplementerHandoffDelivery(...)`
   - converged aggregate reason priority
   - watchdog rework-delivery fail-closed branch
   - kickoff / ask-human fallback result builders
5. Forbidden reinterpretations:
   - a retained `EmitTmuxDeliveryNotificationResult` nem promotalhato vissza canonical delivery source-sza
   - a neutral port nem nevezheto egyszeru alias-polishnak, ha a consumer decision tovabbra is `delivered`-bol szarmazik
   - a public/read-model retained export surface nem csuszhat ide consume-family alignment cimszo alatt
6. `drift_status`: `closed_contract_preserved`

### Scope Reality / Shape Proof

1. Inspected entrypoints / call-sites:
   - `src/v11/application/approval/approvalCommandContract.ts`
   - `src/v11/shared/kickoff/kickoffValidatedExecutionDelivery.ts`
   - `src/v11/shared/askHuman/askHumanDeliveryPortsContract.ts`
   - `src/v11/application/pass/passResultDelivery.ts`
   - `src/v11/application/converged/convergedGateDelivery.ts`
   - `src/v11/application/reply/replyCommandContract.ts`
   - `src/v11/application/watchdog/watchdogPendingReworkIntent.ts`
   - `src/v11/shared/delivery/implementerHandoffDelivery.ts`
   - `src/v11/shared/metaReview/metaReviewDeliveryCapabilities.ts`
2. Actual touched scope:
   - primary bounded-task shape: `consumer_family_alignment`
   - justified secondary shape: `shared_contract` (narrow consume-bridge only)
3. Mutation entrypoints reviewed:
   - approval delivery emission
   - kickoff validated delivery consume
   - ask-human notification/finalization consume
   - pass / converged delivery aggregate consume
   - reply delivery emit
   - watchdog pending rework consume
4. Producer behavior touched:
   - `no`
   - a producer contract es implementation inherited baseline; a task a consumer decision source-t allitja at.
5. Fresh/failure branch inventory:
   - `accepted`
   - `no_runtime_session`
   - `unsupported_recipient`
   - `registry_read_failed`
   - `delivery_unconfirmed`
   - `tmux_send_failed`
   - aggregate partial failure
   - helper retry path
6. Why the declared shape matches reality:
   - a canonical producer mar lezart
   - a current open work a same-authority consume chainben maradt vissza
   - read-model/public fallout explicitten elhagyhato, mert a retained compatibility result shape mar megvan

### Authority Boundary Map

1. `authority_producer`
   - `emitDeliveryNotificationAck(...)`
   - `emitTmuxDeliveryNotification(...)`
   - explicit predecessor-owned baseline
2. `persisted_authority`
   - `N/A`
   - runtime sessions / transcript refs csak producer input maradnak
3. `internal_execution_consumers`
   - `kickoffValidatedExecutionDelivery.ts`
   - `askHumanDeliveryPortsContract.ts`
   - `implementerHandoffDelivery.ts`
   - `metaReviewDeliveryCapabilities.ts`
4. `workflow_orchestration_consumers`
   - approval
   - ask-human
   - pass
   - converged
   - reply
   - watchdog
5. `read_model_consumers`
   - explicit out of scope:
     - `src/v11/shared/ports/uiRouter.ts`
     - `src/index.ts`
6. `cleanup_recovery_consumers`
   - explicit out of scope
7. Export surfaces closed in this phase:
   - v11 internal/shared consume-family contract surfaces: `yes`
   - repo-root/public export surface: `no`

### Baseline Preservation

1. Must-preserve behaviors:
   - approval / reply / kickoff / ask-human / pass / converged / watchdog state transitions valtozatlanok maradnak
   - retained `emitTmuxDeliveryNotification(...)` wrapper tovabbra is elerheto marad
   - retained `EmitTmuxDeliveryNotificationResult` shape tovabbra is elerheto marad a public/read-model surfaces vedelmere
   - helper retry es aggregate behavior fail-closed marad
2. Allowed resolution paths:
   - in-scope consumer contract atallhat neutral `DeliveryAck` namingre
   - outward compatibility mezok megtarthatok, ha mar csak ack-derived projectionk
   - helper functions wrapolhatjak a neutral portot retained local result shape-re ugyanabban a consume chainben
3. Forbidden regression interpretations:
   - tilos a taskot puszta import-atnevezeskent kezelni, ha a consumer decision tovabbra is `delivered` alapjan megy
   - tilos a `EmitTmuxDeliveryNotificationResult` shape-et ebben a taskban teljesen kivezetni
   - tilos a public/read-model export surfaces opportunista atallitasa
4. Replacement proof required if removed:
   - barmely retained delivery result / helper compatibility only akkor torolheto, ha ugyanazon task explicit proofot ad, hogy nincs mar in-scope consumer vagy harness rajta

### In Scope

1. Approval delivery dependency/result consume alignment.
2. Kickoff shared delivery consume alignment.
3. Ask-human shared + application delivery consume alignment.
4. Pass es converged delivery result/aggregate consume alignment.
5. Reply es watchdog delivery consume alignment.
6. Implementer handoff es meta-review delivery capability helper consume alignment.
7. A kapcsolodo targeted/contract test proof feluletek frissitese.

### Out of Scope

1. Delivery producer implementation vagy canonical port semantics modositas.
2. Launch/executor contract es start/restart lane.
3. `src/v11/shared/ports/uiRouter.ts` vagy `src/index.ts` public/read-model cleanup.
4. Contract file fizikai atnevezese vagy retained alias family eltavolitasa.
5. CLI wording / UI wording polish.

### Safety Defaults

1. A neutral `DeliveryAck` legyen a canonical direct decision source.
2. A retained `delivered` mezot csak projectionkent szabad megtartani.
3. Ha egy consumer rollout breaking lenne, compatibility projection maradjon meg es a removal kulon cleanup legyen.

### Contract Boundary / Blast Radius

1. `contract_boundary_override`: `yes`
2. Erintett contractok:
   - approval / reply / kickoff / ask-human / pass / converged / watchdog direct delivery consume contractok
   - helper consume contractok (`implementerHandoffDelivery`, `metaReviewDeliveryCapabilities`)
   - internal compatibility result builders

### Complexity Risk Gate

1. `authority_risk`: `1`
2. `surface_spread`: `2`
3. `identity_join_risk`: `1`
4. `activation_coupling`: `0`
5. `prerequisite_risk`: `1`
6. `acceptance_multiplicity`: `2`
7. `risk_score`: `7`
8. `single-task allowed`: `yes`
9. Split note:
   - producer closure mar lezart (`O2-T2`)
   - launch/executor kulon lane (`O2-T4`)
   - public/read-model cleanup explicit deferred
10. Closure-budget triage:
   - closure buckets touched: `shared_contract`, `internal_execution_consumers`, `workflow_orchestration_consumers`
   - intentionally collapsed closures: a narrow consume-bridge contractok + internal/shared helpers + orchestration callers ugyanazon delivery consume familyben zarhatok le
   - explicitly deferred closures: `authority_producer`, `read_model_consumers`, `persisted_authority_or_schema`, `cleanup_recovery_consumers`

## L1 - Change Contract

### 0) Domain / Control Contract

| Item | Rule | Implementation Consequence | Priority | Timing |
|---|---|---|---|---|
| Business invariant | Delivery truth topologytol fuggetlen. | In-scope consumers nem a retained wrapper projectiont tekintik canonical source-nak. | P1 | required-now |
| Control model | Canonical source a `DeliveryAck`. | A shared/internal/orchestration decision logic explicit ack consume-ra alljon at. | P1 | required-now |
| Read-path rule | Csak neutral ack vagy explicit same-authority projection olvashato. | `delivered` csak projectionkent maradhat. | P1 | required-now |
| Forbidden fallback | Nincs pane/side-effect/legacy-boolean canonical consume. | Retry, aggregate es failover branch-ek explicit ack-alapuak maradnak. | P1 | required-now |
| Allowed resolution path | Compatibility projection megtarthato. | Outward result shape nem torik, de a decision source mar neutral. | P1 | required-now |
| Missing-data rule | Explicit rejected/failure consume marad. | Nincs synthetic `accepted` outcome. | P1 | required-now |
| Phase boundary | Ez consume-family alignment task. | Producer, launch es public/read-model cleanup kulon marad. | P1 | required-now |

### 0a) Shared Contract Compatibility

| Shared Contract | Current Consumers Inventory | Change Type (`additive|breaking|N/A`) | This Task Action | Deferred Alignment |
|---|---|---|---|---|
| `EmitTmuxDeliveryNotificationPort` direct consumer imports | approval, reply, pass, converged, watchdog, ask-human helpers | additive / narrowing | internal consumer contracts neutral `EmitDeliveryNotificationAckPort` consume-ra allhatnak; retained port surface preserved marad | public/read-model callers |
| `EmitTmuxDeliveryNotificationResult` direct consumer imports | approval, kickoff, ask-human, pass, converged, watchdog, helper seams | additive / narrowing | internal result contracts neutral `DeliveryAck` vagy ack-derived same-authority projection consume-ra allnak | ui/router, repo-root export |
| helper retry/aggregate result shapes | implementer handoff, converged aggregate, pass result, watchdog pending rework | additive | retry es aggregate logic explicit ack-alapra all | later cleanup only if compat fields removehatoak |

### 0b) Baseline Preservation

| Current Behavior | Preserve/Replace/Forbid | Required Proof | Priority | Timing |
|---|---|---|---|---|
| retained wrapper availability | preserve | wrapper tovabbra is compile-time/runtime elerheto | P1 | required-now |
| direct consumer decisions from `delivered` | replace | tests prove decision source mar `DeliveryAck.status` vagy explicit ack-derived mapping | P1 | required-now |
| helper retry on transient delivery failures | preserve | implementer handoff / converged / watchdog retry branch fail-closed marad | P1 | required-now |
| public/read-model retained result shape | preserve | ui/root export untouched marad | P1 | required-now |

### 0c) Sequencing / Successor Handoff Boundary

| Boundary Slice | Closed Here | Must Stay Deferred | Exit Rule |
|---|---|---|---|
| delivery consumer-family internal/shared/orchestration alignment | yes | public/read-model cleanup | in-scope family mar explicit neutral ack consume-ra all |
| retained wrapper cleanup | no | later cleanup | nincs removal claim az `O2-T3`-ban |
| launch/executor lane | no | `O2-T4`/`O2-T5` | nincs `tmuxSessions`/start/restart consume ownership itt |

### 1) Call-site Matrix

| ID | File | Function/Entry | Current | Target | Why Here | Priority | Timing | Evidence |
|---|---|---|---|---|---|---|---|---|
| CS1 | `src/v11/application/approval/approvalCommandContract.ts`, `approvalCommandDependencyResolution.ts`, `runApprovalDecisionEffects.ts` | approval delivery dependencies/results | retained `EmitTmuxDeliveryNotificationPort/Result` | neutral ack consume or explicit ack-derived projection | approval orchestration ma meg retained wrapper namingre ul | P1 | required-now | approval runner/tests |
| CS2 | `src/v11/shared/kickoff/kickoffDependencyContract.ts`, `kickoffValidatedExecutionDelivery.ts`, `kickoffResultBuilders.ts` | kickoff delivery consume | retained delivery result projection | neutral ack-driven kickoff consume mapping | kickoff shared layer ma meg wrapper resultbol kepzi vissza a statuszt | P1 | required-now | kickoff tests/contracts |
| CS3 | `src/v11/shared/askHuman/*.ts`, `src/v11/application/askHuman/*.ts` listed target files | ask-human delivery contracts/finalization | retained ask-human delivery result vocabulary | neutral ack consume with explicit compat projection | ask-human shared/application seam egyszerre hordozza a consume falloutot | P1 | required-now | ask-human tests/contracts |
| CS4 | `src/v11/application/pass/*.ts` listed target files | pass delivery result/finalization | retained result + `delivered` consume | neutral ack decision source + compat outward result | pass ma meg boolean projectionbol allit elo statuszt | P1 | required-now | pass tests/contracts |
| CS5 | `src/v11/application/converged/*.ts`, `src/v11/shared/converged/convergedCommandTypes.ts` | converged gate delivery aggregate | retained result aggregate / reason priority | neutral ack-driven aggregate consume | converged direct family explicit aggregate decision seam | P1 | required-now | converged tests/contracts |
| CS6 | `src/v11/application/reply/*.ts` listed target files | reply delivery dependencies | retained delivery port naming | neutral delivery port consume | reply direct orchestration still old port vocabularyt hasznal | P1 | required-now | reply tests/contracts |
| CS7 | `src/v11/application/watchdog/*.ts` listed target files | watchdog pending rework + flow delivery consume | retained `delivered` / retained port | neutral ack-driven fail-closed consume | watchdog ma explicit rework apply gate-et epiti a wrapper projectionra | P1 | required-now | watchdog tests/contracts |
| CS8 | `src/v11/shared/delivery/implementerHandoffDelivery.ts`, `src/v11/shared/metaReview/metaReviewDeliveryCapabilities.ts` | shared helper delivery consume | retained wrapper result helper contract | neutral ack-driven helper contract or explicit ack-derived projection | helper layer ma meg visszafolyatja a retained result truthot a workflow familybe | P1 | required-now | helper tests + converged/pass tests |

### 2) Data and Interface Contract

| Contract | Current | Target | Compatibility Rule | Priority | Timing |
|---|---|---|---|---|---|
| canonical consumer input | retained `EmitTmuxDeliveryNotificationInput` | `EmitDeliveryNotificationInput` | retained alias elfogadhato, ha a consumer contract mar neutral neven beszel | P1 | required-now |
| canonical consumer port | `EmitTmuxDeliveryNotificationPort` | `EmitDeliveryNotificationAckPort` | retained port maradhat for compatibility, de nem canonical consume contractkent | P1 | required-now |
| canonical consumer result | `EmitTmuxDeliveryNotificationResult` | `DeliveryAck` | retained result maradhat ack-derived projectionkent | P1 | required-now |
| helper aggregate/result surface | `delivered`-kozpontu helper result | `status`-first, ack-driven helper result | `delivered` optional compat projection lehet | P1 | required-now |

### 3) Side Effects Contract

| Area | Allowed | Forbidden | Priority | Timing |
|---|---|---|---|---|
| shared/internal consumer contracts | neutral consume naming es ack-driven mapping | producer semantics modositas | P1 | required-now |
| workflow/orchestration callers | dependency/result alignment | public/read-model fallout behuzasa | P1 | required-now |
| helper retry/aggregate logic | ack-driven retry trigger es aggregate mapping | pane/side-effect based synthetic success | P1 | required-now |

### 4) Error and Fallback Contract

| Trigger | Behavior | Fallback Value/Action | Reasoning | Priority | Timing |
|---|---|---|---|---|---|
| canonical delivery rejected | explicit rejected consume | no synthetic success | neutral ack mar producer-owned truth | P1 | required-now |
| helper catches thrown emit | ack-derived or explicit failure projection | fail-closed retained result only if same-authority | helper nem talalhat ki uj success semanticsat | P1 | required-now |
| aggregate mixed results | explicit partial failure mapping | preserved compat outward warning allowed | aggregate reasoning ack statuses-bol jojjon | P1 | required-now |

### 5) Dependency Constraints

| Type | Items | Priority | Timing |
|---|---|---|---|
| must-use | `plans/archive/tasks/actor-runtime-interface-opportunity2-task2-topology-neutral-delivery-contract-and-retained-adapter-foundation.md` | P1 | required-now |
| must-use | current delivery source anchors in `src/v11/shared/delivery/tmuxDeliveryContract.ts`, `src/v11/shared/ports/tmuxDelivery.ts`, `src/v11/infrastructure/channel/tmux/tmuxDelivery.ts` | P1 | required-now |
| must-not-use | `src/v11/shared/ports/uiRouter.ts`, `src/index.ts` public/read-model cleanup | P1 | required-now |
| must-not-use | launch/executor lane (`tmuxSessions`, start/restart launch contract work) | P1 | required-now |

### 6) Test Matrix

| ID | Scenario | Given | When | Then | Priority | Timing | Evidence |
|---|---|---|---|---|---|---|---|
| T1 | approval delivery consume neutralized | approval flow emits status/implementer messages | delivery effects run | approval delivery result semantics neutral ackbol jonnek | P1 | required-now | approval tests/contracts |
| T2 | kickoff + ask-human direct consume neutralized | canonical delivery accepted/rejected | kickoff or ask-human flow runs | shared result builders mar ack-drivenek | P1 | required-now | kickoff / ask-human tests |
| T3 | pass neutral consume | pass delivery returns accepted/rejected | pass finalization maps result | `status`/`reason`/`reason_code` explicit ack-derived | P1 | required-now | pass tests/contracts |
| T4 | converged aggregate neutral consume | mixed delivery results | converged gate aggregates | partial/all-failure logic explicit ack statuses-bol jon | P1 | required-now | converged tests/contracts |
| T5 | reply + watchdog neutral consume | reply or pending rework path emits delivery | orchestration runs | no `delivered`-as-canonical branch marad | P1 | required-now | reply / watchdog tests/contracts |
| T6 | public/read-model compat untouched | ui/router or repo-root type surface unchanged | task diff reviewed | retained public/read-model compatibility preserved | P1 | required-now | review diff |

## L2 - Implementation Notes (Optional)

1. [later-hardening] Ha az `O2-T3` utan mar nincs internal consumer a retained wrapper resultre kotve, kulon cleanup taskban erdemes lehet a helper compatibility projectionk szukitese.
2. [later-hardening] A repo-root/public delivery export surface csak akkor neutralizalando, ha valos kulso consumer pressure latszik; kulonben retained alias eleg lehet.

## Hardening Backlog (Optional)

| ID | Item | Layer | Priority | Timing | Source | Proposed Action |
|---|---|---|---|---|---|---|
| H1 | retained helper compatibility result szukitese | L2 | P2 | later-hardening | `O2-T3` drafting | csak consume-family cutover utan |
| H2 | public/read-model delivery export neutralization | L2 | P3 | later-hardening | `O2-T3` drafting | kulon bounded cleanup, ha tenyleg szukseges |

## Review Control

1. Every finding must include: `priority`, `timing`, `layer`, `evidence`.
2. Ne fogadjunk el olyan implementaciot, amely `O2-T3` cimszo alatt launch/executor vagy public/read-model cleanupot huz be.
3. A retained `delivered` projection nem maradhat canonical decision source a review altal elfogadott vegso diffben.
4. A retained wrapper availability es legacy result shape preserve-ja kotelezo, hacsak ugyanazon task explicit parity evidence-del nem bizonyitja a removal biztonsagat.
5. Done-package summary nem claimelhet public/read-model cleanup closure-t.

## Spec Lock

Mark task as `IMPLEMENTABLE` when:

1. a delivery consume family current-tree fan-outja explicit target-file reality alapjan inventorized;
2. a task egyertelmuen a neutral `DeliveryAck` consume iranyaba allitja a direct/shared/orchestration decisions-t;
3. a retained wrapper/result compatibility explicitten preserve-olt es csak projectionkent kezelt;
4. launch/executor es public/read-model cleanup explicitten out-of-scope marad;
5. targeted/contract tests bizonyitjak a neutral consume cutovert a family kritikus agaiban.

## Assumptions

1. A neutral delivery contract/current producer foundation eleg stabil arra, hogy az `O2-T3` mar consumer alignment task legyen, ne ujabb producer clarification.
2. A public/read-model surfaces retained result compatibility mellett elhalaszthatok kulon cleanupig.
3. Az `O2-T4` launch/executor lane a delivery consume family rollouttol kulon closure marad.

## Open Questions

1. Ha a consume-family cutover utan is marad valos public/root delivery neutral export igeny, azt kulon taskkent vagy az `O2` lane zaro cleanupjakent kell-e megnevezni?
