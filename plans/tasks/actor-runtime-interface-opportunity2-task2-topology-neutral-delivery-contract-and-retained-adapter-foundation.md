---
artifact_type: task
artifact_id: task_actor_runtime_interface_opportunity2_task2_topology_neutral_delivery_contract_retained_adapter_foundation_v1
title: "Actor Runtime Interface Opportunity 2 Task 2: Topology-Neutral Delivery Contract and Retained Adapter Foundation"
status: implementable
phase: post-phaseE
target_files:
  - src/v11/shared/delivery/tmuxDeliveryContract.ts
  - src/v11/shared/ports/tmuxDelivery.ts
  - src/v11/infrastructure/channel/tmux/tmuxDeliveryRuntime.ts
  - src/v11/infrastructure/channel/tmux/tmuxDelivery.ts
  - tests/core/runtime/tmuxDelivery.test.ts
prd_ref: null
plan_ref: plans/actor-runtime-interface-post-phaseE-successor-plan-v1.md
system_context_ref: docs/pairflow-initial-design.md
owners:
  - "felho"
---

# Task: Actor Runtime Interface Opportunity 2 Task 2: Topology-Neutral Delivery Contract and Retained Adapter Foundation

## Current Codebase Check (2026-04-18)

1. A canonical delivery ack truth current-tree szinten mar letezik, de retained `tmux` naminggel:
   - `src/v11/shared/delivery/tmuxDeliveryContract.ts`
   - `src/v11/shared/ports/tmuxDelivery.ts`
2. A producer-local runtime helper es a retained adapter entrypoint ma ugyanabban a `tmux` vocabularyban allitja elo es projekciozza a delivery truthot:
   - `src/v11/infrastructure/channel/tmux/tmuxDeliveryRuntime.ts`
   - `src/v11/infrastructure/channel/tmux/tmuxDelivery.ts`
3. A downstream consumer fan-out mar most tobb consume familyre szorodik szet:
   - workflow/orchestration: `src/v11/shared/kickoff/**`, `src/v11/application/pass/**`, `src/v11/application/converged/**`, `src/v11/application/approval/**`, `src/v11/application/watchdog/**`, `src/v11/application/reply/**`
   - retained delivery helpers: `src/v11/shared/delivery/implementerHandoffDelivery.ts`
   - read-model / public compat: `src/v11/shared/ports/uiRouter.ts`, `src/index.ts`
4. Emiatt az `O2-T2` nem lehet consumer migration task:
   - additive foundation kell,
   - retained `tmux` compat surface mellett,
   - a workflow/read-model alignment explicit successor taskban marad (`O2-T3`).

## L0 - Policy

### Goal

1. Vezessunk be topology-neutral delivery contract naminget es canonical producer entrypointot additiven, a lezart `accepted | rejected` truth ujranyitasa nelkul.
2. A retained `tmux` adapter alljon at arra, hogy topology-neutral canonical ackot allit elo, majd ebbol kepezze a retained `tmux` compat es legacy result surface-eket.
3. Ne csusszon be workflow-orchestration, UI/read-model vagy launch/executor consume alignment ebbe a taskba.

### Domain / Control Model Summary

1. Business invariant: a delivery acceptance truth topologytol fuggetlen marad; a canonical outcome tovabbra is `accepted | rejected`, nem `tmux` pane/session observability.
2. Control model: a delivery producer seam ownershipolja a canonical topology-neutral ack truthot; a retained `tmux` adapter es a current legacy result surfaces csak ebbol derivalt compat retegek lehetnek.
3. Read-path rule: a canonical delivery ack csak a current delivery producer authority-lancbol kepezheto:
   - runtime session registry read,
   - workspace authority resolution,
   - target resolution,
   - explicit send + marker confirmation.
4. Forbidden fallback:
   - pane-visible activity, status pane, watchdog jel vagy operatori megfigyeles nem lehet delivery truth;
   - a retained `tmux` file-/type-nev nem nevezheto ki canonical contract ownershipnak onmagaban;
   - a wide consumer fan-out nem huzhato be “egyutt mar ugyis erintett” indokkal.
5. Allowed resolution path:
   - topology-neutral type/port naming additive modon vezetheto be a retained file-okban;
   - a retained `EmitTmuxDeliveryNotification...` surface megmaradhat compat wrapperkent;
   - a current producer ugyanazokbol a source anchorokbol adhat topology-neutral canonical ackot es legacy derivaciot is.
6. Missing-data rule:
   - hianyzo runtime session, registry read failure, unsupported recipient vagy unconfirmed/send failure eseten canonical `rejected` outcome kell;
   - a retained legacy result ezt fail-closed modon kovesse;
   - synthetic success nem vezetheto be naming-transition miatt.
7. Phase boundary:
   - contract closure: owned here
   - producer closure: owned here
   - internal execution closure: csak producer-local compat bridgeig owned here
   - workflow_orchestration_closure: successor (`O2-T3`)
   - read_model_closure: successor (`O2-T3`)
   - activation_closure: successor
   - cleanup_recovery_closure: successor

### Plan Linkage

1. Parent plan gap closed: az `O2-T1` docs-only boundary note utan az elso implementacios gap az, hogy a delivery canonical contract mar topology-neutral naminggel letezzen, mikozben a retained `tmux` adapter es a current consumers meg nem migralodnak.
2. Depends on:
   - `plans/actor-runtime-interface-post-phaseE-successor-plan-v1.md`
   - `plans/actor-runtime-interface-topology-neutral-delivery-executor-contract-note-v1.md`
   - `plans/archive/tasks/actor-runtime-interface/actor-runtime-interface-delivery-ack-producer-contract-phaseE2a.md`
3. Unlocks / impacts successors:
   - `O2-T3` delivery consume-family alignment
   - retained `tmux` delivery wrapper eventual cleanup a consume-family cutover utan
   - retained package-root/public delivery export alignment, ha a neutral naminget a shared `v11` export surface-en tul is fel kell huzni
4. Task-list impact:
   - ez az `Opportunity 2` current next bounded implementation slice-a;
   - nem valtja ki az `O2-T1` docs-only artifactot;
   - nem ownershipolja az `O2-T4` launch/executor foundationt.
5. Inherited validation / exit expectation:
   - az additive topology-neutral contract nem torheti a current consumers retained `EmitTmuxDeliveryNotificationResult` consume surface-et;
   - explicit current-consumer inventory kotelezo, mert a shared contract tobb consume familyre sugarzik ki;
   - a repo-root/public export surface retained `tmux` namingje csak explicit successor ownership mellett valtozhat;
   - a handoff summary csak shared contract + producer-local bridge closure-t claimelhet.

### Canonical Contract Anchors

1. Source-of-truth anchors:
   - `plans/actor-runtime-interface-post-phaseE-successor-plan-v1.md`
   - `plans/actor-runtime-interface-topology-neutral-delivery-executor-contract-note-v1.md`
   - `plans/archive/tasks/actor-runtime-interface/actor-runtime-interface-delivery-ack-producer-contract-phaseE2a.md`
   - `src/v11/shared/delivery/tmuxDeliveryContract.ts`
   - `src/v11/shared/ports/tmuxDelivery.ts`
   - `src/v11/infrastructure/channel/tmux/tmuxDeliveryRuntime.ts`
   - `src/v11/infrastructure/channel/tmux/tmuxDelivery.ts`
   - `tests/core/runtime/tmuxDelivery.test.ts`
2. Canonical elements:
   - delivery ack status tokens: `accepted | rejected`
   - delivery failure reason tokens: `no_runtime_session | unsupported_recipient | registry_read_failed | delivery_unconfirmed | tmux_send_failed`
   - delivery ack reason-code tokens: `DELIVERY_ACK_RUNTIME_SESSION_UNAVAILABLE | DELIVERY_ACK_TARGET_UNSUPPORTED | DELIVERY_ACK_REJECTED`
   - optional `deliveryTargetReasonCode` carry-through
   - topology-neutral canonical ack/input/port naming, retained semantics valtozatlanul
3. Guard elements:
   - `maybeAcceptClaudeTrustPrompt(...)`
   - `sendAndSubmitTmuxPaneMessage(...)`
   - `confirmTmuxPaneMarkerSubmission(...)`
   - target pane string resolution
4. Compat elements:
   - `TmuxDeliveryAck*` nomenklatura retained alias/re-export statuszban
   - `EmitTmuxDeliveryNotificationResult`
   - `projectTmuxDeliveryAckToLegacyResult(...)` vagy equivalent retained legacy mapper
   - `emitTmuxDeliveryNotification(...)` retained wrapper
5. Closed terms:
   - `accepted`
   - `rejected`
   - `DELIVERY_ACK_RUNTIME_SESSION_UNAVAILABLE`
   - `DELIVERY_ACK_TARGET_UNSUPPORTED`
   - `DELIVERY_ACK_REJECTED`
   - `delivered`
6. Forbidden reinterpretations:
   - a topology-neutral rename nem valtoztathatja meg a status- vagy reason-tokeneket;
   - a retained `tmux` alias nem nevezheto at canonical truth-ra, ha a neutral export mar letezik;
   - a legacy `delivered` result nem lehet canonical source, csak projection;
   - a consumer migration hianya nem igazol breaking contract valtozast.
7. `drift_status`: `no_unauthorized_drift`

### Scope Reality / Shape Proof

1. Inspected entrypoints / call-sites:
   - `src/v11/shared/delivery/tmuxDeliveryContract.ts`
   - `src/v11/shared/ports/tmuxDelivery.ts`
   - `src/v11/infrastructure/channel/tmux/tmuxDeliveryRuntime.ts`
   - `src/v11/infrastructure/channel/tmux/tmuxDelivery.ts`
   - `tests/core/runtime/tmuxDelivery.test.ts`
   - downstream fan-out inventory via imports of `EmitTmuxDeliveryNotificationResult`, `TmuxDeliveryAckStatus`, `EmitTmuxDeliveryNotificationPort`
2. Actual touched scope:
   - primary bounded-task shape: `contract_or_persisted_authority_foundation`
   - justified secondary shape: `authority_producer`
3. Mutation entrypoints reviewed:
   - `emitTmuxDeliveryNotification(...)`
   - `attemptTmuxDelivery(...)`
4. Producer behavior touched:
   - `yes`
   - a canonical ack builder es a retained wrapper boundary itt valtozik, de a side-effect choreography nem.
5. Fresh/failure branch inventory:
   - registry read succeeds vs fails
   - runtime session/workspace resolved vs unresolved
   - recipient target resolved vs unsupported
   - marker confirmation succeeds vs fails
   - tmux send succeeds vs throws
6. Why the declared shape matches reality:
   - a shared contract es a producer seam ugyanazon bounded delivery slice-ban van;
   - a workflow/read-model consumers explicit successor taskban maradnak;
   - uj coordination, cleanup vagy persisted-authority valtozas nem latszik.

### Authority Boundary Map

1. `authority_producer`
   - `createAcceptedTmuxDeliveryAck(...)`
   - `createRejectedTmuxDeliveryAck(...)`
   - `attemptTmuxDelivery(...)`
   - `emitTmuxDeliveryNotification(...)`
2. `persisted_authority`
   - runtime sessions registry read-only input
   - resolved workspace authority read-only adapter input
3. `internal_execution_consumers`
   - retained `tmux` adapter wrapper es producer-local legacy mapper
4. `workflow_orchestration_consumers`
   - explicit out of scope:
     - kickoff
     - pass
     - converged
     - approval
     - watchdog
     - ask-human
     - meta-review delivery capability consume
5. `read_model_consumers`
   - explicit out of scope:
     - `src/v11/shared/ports/uiRouter.ts`
     - `src/index.ts`
     - public/read-model projections using `EmitTmuxDeliveryNotificationResult`
6. `cleanup_recovery_consumers`
   - explicit out of scope
7. Export surfaces closed in this phase:
   - topology-neutral delivery ack/input/port naming a `src/v11/shared/**` retained shared surface-en
   - producer-local canonical ack entrypoint
   - retained tmux alias/re-export + legacy projection boundary

### Baseline Preservation

1. Must-preserve behaviors:
   - a canonical delivery truth tovabbra is `accepted | rejected`;
   - a retained `EmitTmuxDeliveryNotificationResult` surface tovabbra is elerheto marad;
   - a `emitTmuxDeliveryNotification(...)` wrapper tovabbra is legacy resultet ad vissza current consumersnek;
   - nincs pane/status/watchdog-derived synthetic success.
2. Allowed resolution paths:
   - a neutral delivery contract ugyanabban a retained contract file-ban is megjelenhet additive modon;
   - a `TmuxDeliveryAck` es kapcsolodo exportok lehetnek retained aliasok a neutral contract mellett;
   - a retained wrapper hivhat neutral canonical producer entrypointot, majd projekciozhat legacy resultot;
   - a repo-root/public export surface retained `tmux` naminggel maradhat, amig explicit successor alignment nem ownershipolja.
3. Forbidden regression interpretations:
   - tilos `EmitTmuxDeliveryNotificationResult`-ot ebben a taskban torni vagy kivezetni;
   - tilos a workflow/read-model consume helyeket “opportunista” modon atallitani a neutral namingre;
   - tilos a delivery contract rename-et launch/executor contract rewrite-tal osszemosni.
4. Replacement proof required if removed:
   - a retained `TmuxDeliveryAck*` exportok vagy `EmitTmuxDeliveryNotificationResult` csak az `O2-T3` consume-family alignment parity evidence utan szuntetheto meg;
   - a retained wrapper csak akkor torolheto, ha az osszes current consumer explicit neutral port consume-ra allt.

### In Scope

1. Additive topology-neutral delivery contract exportok bevezetese a retained contract file-ban.
2. Additive topology-neutral shared port naming bevezetese a retained port file-ban.
3. Producer-local canonical delivery ack entrypoint bevezetese a retained `tmux` adapterben.
4. Retained `tmux` compat aliasok/re-exportok es legacy projection boundary fenntartasa.
5. Direct runtime testek frissitese a neutral canonical ack + retained compat parity bizonyitasara.

### Out of Scope

1. Workflow/orchestration consume-family alignment:
   - kickoff
   - pass
   - converged
   - approval
   - watchdog
   - reply
   - ask-human
   - meta-review delivery capability surfaces
2. UI/router/public read-model consume alignment.
3. Repo-root/public export surface alignment (`src/index.ts`) vagy mas retained aggregator export.
4. Launch/executor contract vagy `tmuxSessions` launch ack valtoztatas.
5. Runtime session registry schema vagy workspace authority semantics valtoztatas.
6. `retryStuckAgentInput(...)` topology-neutralizalasa.

### Safety Defaults

1. A shared contract transition additive-only; breaking exportcsere nem megengedett ebben a taskban.
2. Ha a neutral canonical ack es a retained compat result kozott feszultseg jelenik meg, a neutral canonical ack a source-of-truth, es a retained compat surface ezt fail-closed modon koveti.
3. Ha egy consumer implicit alignment nelkul torne, a task nincs keszen; vissza kell menni decomposition vagy contract-bridge pontositasra, nem szabad csendben consumer migrationt behuzni.
4. A repo-root/public export surface csak akkor vonhato be ebbe a taskba, ha a `target_files` es a call-site matrix ezt explicit ownershipolja; kulonben retained public compat surface marad.

### Contract Boundary / Blast Radius

1. `contract_boundary_override`: `yes`
2. Erintett contract:
   - shared delivery contract export naming
   - shared delivery port naming
   - retained tmux adapter canonical-vs-compat bridge boundary

### Complexity Risk Gate

1. `authority_risk`: `1`
2. `surface_spread`: `1`
3. `identity_join_risk`: `1`
4. `activation_coupling`: `0`
5. `prerequisite_risk`: `1`
6. `acceptance_multiplicity`: `1`
7. `risk_score`: `5`
8. `single-task allowed`: `yes`
9. Split note:
   - a shared contract + producer foundation ugyanabban a bounded taskban maradhat;
   - a workflow/read-model consume-family alignment explicit successor task (`O2-T3`);
   - a launch/executor contract kulon successor foundation (`O2-T4`).
10. Identity/join note:
   - canonical identity path: `bubbleId + envelope.id + runtime session/workspace resolution + target pane resolution + explicit confirmation`
   - competing fallback identities: pane-visible activity, operatori pane inspection, downstream `delivered` boolean, workflow-level inferred success
11. Authority/source-of-truth note:
   - canonical source: producer-local delivery path explicit runtime/registry/marker truth-a
   - forbidden secondary sources: diagnostics, status surface, workflow summaries, current UI projection
12. Closure-budget triage:
   - closure buckets touched: `authority_producer`, `shared_contract`, `internal_execution_consumers`
   - intentionally collapsed closures: shared contract + producer + producer-local compat bridge, mert ugyanaz a bounded delivery slice ownershipolja oket
   - explicitly deferred closures: `workflow_orchestration_consumers`, `read_model_consumers`, `persisted_authority_or_schema`, `cleanup_recovery_consumers`
   - success-claim boundary: ez a task csak neutral contract + producer-local bridge closure-t claimelhet

## L1 - Change Contract

### 0) Domain / Control Contract

| Item | Rule | Implementation Consequence | Priority | Timing |
|---|---|---|---|---|
| Business invariant | Delivery truth topologytol fuggetlen. | Neutral canonical ack naming bevezetese nem valtoztathat statusz- vagy reason-semantikat. | P1 | required-now |
| Control model | Producer seam owns canonical truth. | Uj neutral producer entrypoint kell; retained wrapper csak projection lehet. | P1 | required-now |
| Read-path rule | Canonical ack csak runtime/registry/workspace/target/send/marker authority-lancbol kepezheto. | Nincs pane/status/watchdog-derived success shortcut. | P1 | required-now |
| Forbidden fallback | Consumer fan-out nem oldhato meg breaking exportcserivel. | Additive alias/re-export kotelezo. | P1 | required-now |
| Allowed resolution path | Neutral exports es retained tmux aliases egyutt elhetnek. | Contract file es port file additive marad. | P1 | required-now |
| Missing-data rule | Hianyzo source truth -> canonical `rejected`. | Legacy result `delivered=false` ugyanebbol legyen projekciozva. | P1 | required-now |
| Phase boundary | Ez foundation task, nem consumer migration. | Downstream call-site atallitas successor taskban marad. | P1 | required-now |

### 0a) Canonical Contract Preservation

| Element | Current Role | Target Role | Preservation Rule | Priority | Timing |
|---|---|---|---|---|---|
| `accepted | rejected` | canonical delivery ack status | canonical delivery ack status | tokenek es jelenteseik valtozatlanok maradnak | P1 | required-now |
| `TmuxDeliveryAck*` family | canonical delivery ack naming | retained compat alias / re-export a neutral naming mellett | csak naming-level downgrade engedett, semantic downgrade nem | P1 | required-now |
| `EmitTmuxDeliveryNotificationResult` | retained legacy consume/result surface | retained compat projection | nem lehet canonical source-of-truth | P1 | required-now |
| `projectTmuxDeliveryAckToLegacyResult(...)` | legacy projection mapper | retained compat mapper vagy equivalent neutral->legacy mapper | projection-only marad | P1 | required-now |
| `emitTmuxDeliveryNotification(...)` | retained public-ish wrapper for current consumers | retained wrapper a neutral producer entrypoint felett | signature preserved | P1 | required-now |

### 0b) Shared Contract Compatibility

| Shared Contract | Current Consumers Inventory | Change Type (`additive|breaking|N/A`) | This Task Action | Deferred Alignment |
|---|---|---|---|---|
| delivery ack/input types a `tmuxDeliveryContract.ts` file-ban | kickoff, pass, converged, approval, watchdog, ask-human, meta-review, reply helpers, implementer handoff helper, UI/router, runtime tests | additive | neutral canonical exportok hozzaadasa retained tmux aliasokkal | `O2-T3` |
| `EmitTmuxDeliveryNotificationPort` | approval, converged, watchdog, pass, reply, implementer handoff helper, tests | additive | neutral canonical port export hozzaadasa retained tmux port mellett | `O2-T3` |
| `EmitTmuxDeliveryNotificationResult` | current workflow/read-model consumers, implementer handoff helper, UI/router | additive / preserved | retained legacy result surface valtozatlanul marad | `O2-T3` |
| repo-root/public delivery type export surface (`src/index.ts`) | external/public type consumers | preserved retained compat | nincs neutral public export cutover ebben a taskban | explicit successor-owned public alignment |

### 1) Plan Linkage and Successor Impact

| Item | Value | Priority | Timing |
|---|---|---|---|
| Parent plan gap | topology-neutral delivery contract + retained adapter foundation | P1 | required-now |
| Predecessor dependency | `O2-T1` note lezarta a boundary-nevesitest | P1 | required-now |
| Successor unlocked | `O2-T3` consume-family alignment | P1 | required-now |
| Parallel-but-separate successor | `O2-T4` launch/executor foundation | P2 | later |
| Explicitly not closed here | workflow/read-model consume migration, launch/executor rename, UI/router cleanup | P1 | required-now |

### 2) Call-Site Matrix

| ID | File | Entry / Surface | Current | Target | Why Here | Priority | Timing | Evidence |
|---|---|---|---|---|---|---|---|---|
| CS1 | `src/v11/shared/delivery/tmuxDeliveryContract.ts` | shared delivery types | only tmux-named canonical types + legacy result types | neutral canonical delivery ack/input types + retained tmux aliases + retained legacy result types | shared contract closure itt indul | P1 | required-now | code diff |
| CS2 | `src/v11/shared/ports/tmuxDelivery.ts` | shared port exports | only tmux-named port | neutral canonical delivery port export + retained tmux port export | consumer-safe additive transition | P1 | required-now | code diff |
| CS3 | `src/v11/infrastructure/channel/tmux/tmuxDeliveryRuntime.ts` | canonical ack builders / projection mapper | tmux-named canonical ack helpers + legacy mapper | neutral canonical helpers + retained alias/legacy mapper | producer truth + compat bridge ownership itt van | P1 | required-now | tests/core/runtime/tmuxDelivery.test.ts |
| CS4 | `src/v11/infrastructure/channel/tmux/tmuxDelivery.ts` | adapter entrypoint | retained wrapper returns legacy result directly | neutral canonical producer entrypoint + retained legacy wrapper | current consumers vedeleme mellett neutral seam kell | P1 | required-now | tests/core/runtime/tmuxDelivery.test.ts |
| CS5 | `tests/core/runtime/tmuxDelivery.test.ts` | direct runtime parity tests | tmux-named canonical helper coverage | neutral canonical helper coverage + retained compat parity coverage | foundation without evidence nem claimelheto | P1 | required-now | test diff |

### 3) Data and Interface Contract

| Contract | Current | Target | Required Fields | Optional Fields | Compatibility | Priority | Timing |
|---|---|---|---|---|---|---|---|
| Canonical delivery input | `EmitTmuxDeliveryNotificationInput` | additive `EmitDeliveryNotificationInput` ugyanazzal a shape-pel | `bubbleId`, `bubbleConfig`, `sessionsPath`, `envelope` | `reviewerTestDirective`, `reviewerBrief`, `reviewerFocus`, `messageRef`, `initialDelayMs`, `deliveryAttempts` | retained tmux inputnev alias/re-export marad | P1 | required-now |
| Canonical delivery ack | `TmuxDeliveryAck` | additive `DeliveryAck` | `status`, `message` | `sessionName`, `targetPaneIndex`, `reason`, `reason_code`, `deliveryTargetReasonCode` | retained tmux acknev alias/re-export marad | P1 | required-now |
| Canonical delivery port | nincs topology-neutral export | `EmitDeliveryNotificationAckPort = (input: EmitDeliveryNotificationInput) => Promise<DeliveryAck>` | exact signature | `N/A` | retained tmux port mellette marad | P1 | required-now |
| Retained legacy result surface | `EmitTmuxDeliveryNotificationResult` | valtozatlan retained compat result | `delivered`, `message` | `reason`, `reason_code`, `sessionName`, `targetPaneIndex`, `deliveryTargetReasonCode` | backward-compatible | P1 | required-now |
| Retained wrapper entrypoint | `emitTmuxDeliveryNotification(input: EmitTmuxDeliveryNotificationRuntimeInput) => Promise<EmitTmuxDeliveryNotificationResult>` | valtozatlan signature, neutral producer fele delegal | exact signature preserved | `N/A` | backward-compatible | P1 | required-now |
| Canonical runtime producer entrypoint | nincs topology-neutral runtime export | `emitDeliveryNotificationAck(input: EmitDeliveryNotificationRuntimeInput) => Promise<DeliveryAck>` | exact signature | runtime deps maradhatnak optional injectionkent | additive | P1 | required-now |
| Repo-root/public export surface | `EmitTmuxDeliveryNotificationInput|Result|TmuxDeliveryFailureReason` tmux-naminggel exportalva | retained current naming | existing public aliases | `N/A` | explicit deferred public alignment, not changed here | P2 | later |

### 4) Side Effects Contract

| Area | Allowed | Forbidden | Notes | Priority | Timing |
|---|---|---|---|---|---|
| shared contract / port files | additive exportok es aliasok | consumer importok tomeges atirasa | tisztan interface-szintu valtozas | P1 | required-now |
| retained tmux delivery runtime | a meglevo send + trust-prompt + marker confirmation choreography reuse-ja | uj topology, uj side-effect source, uj diagnostics hack | runtime side-effect viselkedes nem valtozik | P1 | required-now |
| retained wrapper | canonical neutral ackbol legacy projection | breaking wrapper return-shape | wrapper current consumers miatt retained marad | P1 | required-now |
| repo-root/public exports | nincs valtozas ebben a taskban | neutral public export cutover | explicit successor alignmentig retained marad | P1 | required-now |
| tests | direct runtime parity coverage bovitese | workflow/read-model integration tesztek atallitasa | az utobbi `O2-T3` scope | P1 | required-now |

### 5) Error and Fallback Contract

| Trigger | Dependency (if any) | Behavior (`throw|result|fallback`) | Fallback Value/Action | Reason Code | Log Level | Priority | Timing |
|---|---|---|---|---|---|---|---|
| runtime registry read fails | runtime sessions registry | result | canonical neutral `rejected`; retained legacy `delivered=false` | `DELIVERY_ACK_RUNTIME_SESSION_UNAVAILABLE` | warn | P1 | required-now |
| runtime session or workspace authority unresolved | runtime sessions registry / workspace authority resolver | result | canonical neutral `rejected`; retained legacy `delivered=false` | `DELIVERY_ACK_RUNTIME_SESSION_UNAVAILABLE` | warn | P1 | required-now |
| unsupported recipient | target resolution | result | canonical neutral `rejected`; retained legacy `delivered=false` | `DELIVERY_ACK_TARGET_UNSUPPORTED` | warn | P1 | required-now |
| send or marker confirmation fails | tmux delivery path | result | canonical neutral `rejected`; retained legacy `delivered=false` | `DELIVERY_ACK_REJECTED` | warn | P1 | required-now |
| neutral-vs-legacy projection cannot be kept coherent | internal mapping | throw | fail closed, do not publish a “successful” compat result | `N/A` | error | P1 | required-now |

### 6) Dependency Constraints

| Type | Items | Priority | Timing |
|---|---|---|---|
| must-use | `plans/actor-runtime-interface-post-phaseE-successor-plan-v1.md` | P1 | required-now |
| must-use | `plans/actor-runtime-interface-topology-neutral-delivery-executor-contract-note-v1.md` | P1 | required-now |
| must-use | `plans/archive/tasks/actor-runtime-interface/actor-runtime-interface-delivery-ack-producer-contract-phaseE2a.md` | P1 | required-now |
| must-use | current-tree code evidence: `src/v11/shared/delivery/tmuxDeliveryContract.ts`, `src/v11/shared/ports/tmuxDelivery.ts`, `src/v11/infrastructure/channel/tmux/tmuxDeliveryRuntime.ts`, `src/v11/infrastructure/channel/tmux/tmuxDelivery.ts`, `tests/core/runtime/tmuxDelivery.test.ts` | P1 | required-now |
| must-not-use | workflow consume-family alignment in kickoff/pass/converged/approval/watchdog/ask-human/meta-review | P1 | required-now |
| must-not-use | UI/router/public read-model cleanup | P1 | required-now |
| must-not-use | repo-root/public export cutover `src/index.ts`-ben | P1 | required-now |
| must-not-use | launch/executor shared contract rewrite | P1 | required-now |
| must-not-use | runtime session schema or persisted state mutation | P1 | required-now |

### 7) Test Matrix

| ID | Scenario | Given | When | Then | Priority | Timing | Evidence |
|---|---|---|---|---|---|---|---|
| T1 | neutral canonical success | runtime session, workspace es target pane rendelkezesre all, marker confirmation sikeres | neutral producer entrypoint fut | `DeliveryAck.status = accepted`, es a retained wrapperbol kapott legacy result `delivered=true` pontosan ebbol szarmazik | P1 | required-now | `tests/core/runtime/tmuxDelivery.test.ts` |
| T2 | neutral canonical no-runtime-session failure | runtime session vagy workspace authority nem oldhato fel | neutral producer entrypoint fut | `DeliveryAck.status = rejected`, `reason_code = DELIVERY_ACK_RUNTIME_SESSION_UNAVAILABLE`, es a retained wrapper fail-closed | P1 | required-now | `tests/core/runtime/tmuxDelivery.test.ts` |
| T3 | neutral canonical unsupported-recipient failure | target resolution nem ad pane-t | neutral producer entrypoint fut | canonical `rejected` + `DELIVERY_ACK_TARGET_UNSUPPORTED`, retained wrapper `delivered=false` | P1 | required-now | `tests/core/runtime/tmuxDelivery.test.ts` |
| T4 | retained wrapper parity | barmely success/failure canonical ack | retained wrapper fut | nincs olyan ag, ahol a retained legacy result tobb vagy kevesebb success-t allit, mint a canonical neutral ack | P1 | required-now | `tests/core/runtime/tmuxDelivery.test.ts` |
| T5 | precondition-before-side-effect | runtime session/workspace hianyzik vagy recipient unsupported | retained wrapper vagy neutral producer fut | nincs tmux send side effect ezekben az agokban | P1 | required-now | `tests/core/runtime/tmuxDelivery.test.ts` |

### 8) Baseline Preservation

| Baseline | Must Preserve | Allowed Change | Forbidden Change | Priority | Timing |
|---|---|---|---|---|---|
| canonical delivery truth | `accepted | rejected` semantics | neutral naming export hozzaadasa | status tokenek vagy reason-tokenek modositasa | P1 | required-now |
| retained tmux public-ish wrapper | current wrapper signature | neutral producerre valo atkotese | wrapper torese vagy eltavolitasa | P1 | required-now |
| retained legacy result | current result shape | explicit “compat-only” statusz | result shape torese vagy consumer migration idehuzasa | P1 | required-now |
| retained tmux aliasok | re-export / alias statusz | canonical neutral export melletti retained jelenlet | aliasok torlese consume cutover elott | P1 | required-now |

### 9) Closure-Budget Summary

| Item | Value | Priority | Timing |
|---|---|---|---|
| Primary closure now | shared contract + producer foundation | P1 | required-now |
| Collapsed closures | `shared_contract` + `authority_producer` + producer-local compat bridge | P1 | required-now |
| Deferred closures | workflow/read-model consumers, cleanup, launch/executor | P1 | required-now |
| Why safe | ugyanaz a delivery slice owns-olja a neutral contract exportot, a producer canonical ackot es a retained wrapper projectiont | P1 | required-now |

### 10) Precondition and Side-Effect Boundary

| Boundary | Rule | Priority | Timing |
|---|---|---|---|
| Validations before side effects | runtime session/workspace resolution es recipient target resolution meg kell tortenjen barmilyen tmux send elott | P1 | required-now |
| Forbidden early side effects | trust-prompt acceptance, tmux send es marker confirmation nem indulhat unresolved session/workspace vagy unsupported recipient mellett | P1 | required-now |
| Invalid/precondition-failure behavior | canonical `rejected` + retained legacy `delivered=false`, zero send side effect | P1 | required-now |
| Coordination primitives | nincs uj lock/mutex/idempotency primitive; explicit deferred | P2 | later |

## L2 - Implementation Notes (Optional)

1. [later-hardening] Ha a neutral contract naming stabilizalodik, erdemes lehet a retained `tmuxDeliveryContract.ts` file fizikai atnevezeset kesobbre kulon cleanup taskban megfontolni, de ez ebben a taskban nem kovetelmeny.
2. [later-hardening] A retained `TmuxDeliveryAck*` aliasoknal erdemes lehet kodszintu “compat” kommentet vagy JSDoc-ot adni, ha ez segiti a kesobbi `O2-T3` consume cutovert.

## Hardening Backlog (Optional)

| ID | Item | Layer | Priority | Timing | Source | Proposed Action |
|---|---|---|---|---|---|---|
| H1 | retained `tmux` aliasok kesobbi tisztitasa | L2 | P2 | later-hardening | `O2-T2` drafting | csak `O2-T3` consumer alignment utan |
| H2 | contract file fizikai atnevezese neutral pathra | L2 | P3 | later-hardening | `O2-T2` drafting | kulon cleanup taskban, ha mar nincs retained import pressure |

## Review Control

1. Every finding must include: `priority`, `timing`, `layer`, `evidence`.
2. Ne fogadjunk el olyan implementaciot, amely `O2-T2` cimszo alatt workflow/read-model consumer migrationt huz be.
3. A neutral canonical delivery port es a retained `EmitTmuxDeliveryNotificationPort` nem csuszhat ossze breaking exportcserive.
4. Ha a retained wrapper csak breaking consumer rewrite mellett tarthato fenn, a task nem implementalhato ebben a scope-ban; vissza kell menni plan/task refinementre.
5. Done-package summary nem claimelhet `O2-T3` closure-t, es nem sugallhatja, hogy a UI/router vagy workflow surfaces mar topology-neutral consume-ra alltak.

## Spec Lock

Mark task as `IMPLEMENTABLE` when:

1. additive topology-neutral delivery contract naming explicit a shared contractban;
2. additive topology-neutral delivery port explicit a retained shared port file-ban;
3. letezik neutral canonical runtime producer entrypoint, amely `DeliveryAck`-ot ad vissza;
4. a retained `emitTmuxDeliveryNotification(...)` wrapper es a legacy result surface tovabbra is koherens projectionkent mukodik;
5. direct runtime tesztek bizonyitjak a neutral canonical ack + retained compat parityt;
6. nincs workflow/read-model vagy launch/executor scope behuzva ebbe a taskba.

## Assumptions

1. A topology-neutral delivery naming retained file pathon belul is elfogadhato, ha a semantic ownership explicit.
2. Az `O2-T3` fogja ownershipolni a downstream consumer import/port/result alignmentet.
3. A launch/executor neutralization deliverytol kulon closure marad az `O2-T4` taskban.

## Open Questions

1. Nincs blocker-szintu nyitott kerdes a current plan- es code-context alapjan.
