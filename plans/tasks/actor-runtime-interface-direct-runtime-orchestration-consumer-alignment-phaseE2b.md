---
artifact_type: task
artifact_id: task_actor_runtime_interface_phaseE2b_direct_runtime_orchestration_consumer_alignment_v1
title: "Actor Runtime Interface Direct Runtime and Orchestration Consumer Alignment (Phase E2b)"
status: implementable
phase: phaseE2b
target_files:
  - src/v11/shared/kickoff/kickoffResultBuilders.ts
  - src/v11/shared/kickoff/kickoffValidatedExecutionDelivery.ts
  - src/v11/shared/askHuman/askHumanDeliveryPortsContract.ts
  - src/v11/shared/askHuman/askHumanFlowContract.ts
  - src/v11/shared/askHuman/askHumanFinalizationArtifacts.ts
  - src/v11/application/askHuman/askHumanNotificationEmission.ts
  - src/v11/application/pass/passResultDelivery.ts
  - src/v11/application/pass/runNormalPassFlowContract.ts
  - src/v11/application/pass/normalPassFinalization.ts
  - src/v11/application/converged/convergedGateDelivery.ts
  - src/v11/application/converged/runConvergedFlowContract.ts
  - src/v11/application/converged/convergedFinalizationTypes.ts
  - src/v11/application/watchdog/watchdogPendingReworkIntent.ts
  - src/v11/application/watchdog/watchdogCommandFlow.ts
  - src/v11/application/start/startCommandContract.ts
  - src/v11/application/start/startCommandFlows.ts
  - src/v11/application/restart/restartCommandContract.ts
  - src/v11/application/restart/runRestartFlow.ts
  - tests/core/agent/askHuman.test.ts
  - tests/core/agent/converged.test.ts
  - tests/core/bubble/startBubble.test.ts
  - tests/core/bubble/restartBubble.test.ts
  - tests/core/runtime/restartRecovery.test.ts
  - tests/contracts/v11/start.contract.runner.ts
  - tests/contracts/v11/converged.contract.runner.ts
  - tests/contracts/v11/restart.contract.runner.ts
prd_ref: null
plan_ref: plans/actor-runtime-interface-discovery-and-migration-plan-v1.md
system_context_ref: docs/pairflow-initial-design.md
owners:
  - "felho"
---

# Task: Actor Runtime Interface Direct Runtime and Orchestration Consumer Alignment (Phase E2b)

Target file interpretation:
1. A `target_files` lista a direct consume-family ownership seam-eket rogziti, nem a teljes helper-halozatot.
2. Az esetlegesen szukseges secondary/helper file-ok authoritative listaja az L1 call-site matrixben marad.

## Current Codebase Check (2026-04-14)

1. Az `E2a` merge utan a producer seam mar explicit typed delivery es launch ack vocabularyt ad a shared portokon (`accepted|rejected`, `running|failed_to_start`), de a direct runtime/orchestration consume family nagy resze meg mindig legacy compatibility projectiont fogyaszt.
2. A kickoff es ask-human oldalon a shared result shape-ek jelenleg sajat boolean `delivered` projectionokkal dolgoznak (`src/v11/shared/kickoff/kickoffResultBuilders.ts`, `src/v11/shared/askHuman/askHumanDeliveryPortsContract.ts`, `src/v11/shared/askHuman/askHumanFlowContract.ts`), tehat a direct flow API meg nem a typed ack boundary nyelvet beszel.
3. A pass/converged oldalon a finalization es gate-delivery aggregatumok ma `delivered: boolean` + optional `reason` surface-ekre redukaljak a canonical delivery eredmenyt (`src/v11/application/pass/passResultDelivery.ts`, `src/v11/application/pass/normalPassFinalization.ts`, `src/v11/application/converged/convergedGateDelivery.ts`, `src/v11/application/converged/runConvergedFlowContract.ts`).
4. A watchdog direct orchestration path jelenleg ugy kezel delivery failure-t es stuck-input retry-t, mintha a runtime seam elsodleges consume nyelve tovabbra is a legacy confirmation shape lenne (`src/v11/application/watchdog/watchdogPendingReworkIntent.ts`, `src/v11/application/watchdog/watchdogCommandFlow.ts`).
5. A launch ack shared port mar formalizalt, de a start/restart orchestration ma meg a legacy `sessionName` success/throw wrapperre epit (`src/v11/application/start/startCommandContract.ts`, `src/v11/application/start/startCommandFlows.ts`, `src/v11/application/restart/runRestartFlow.ts`, `src/v11/application/restart/restartCommandContract.ts`).
6. A parent sequencing artifact explicit boundaryje szerint ez a task csak a direct runtime/orchestration consumer alignmentet owns-olja; approval/reply, persisted diagnostics/meta-review/status/list/CLI projection es implementer pilot activation tovabbra is kulon lane marad.

## L0 - Policy

### Goal

1. A lezart `E2a` typed delivery/launch ack contract direct runtime/orchestration consume-family atallasa ugyanazon canonical truthra.
2. A kickoff, pass/converged, ask-human, watchdog, start/restart orchestration megszuntesse a legacy boolean/success-throw szemantikak canonical consume szerepet.
3. A current flow-k operator-visible behaviora migration alatt compatibility-preserving maradjon, de a consume-family source-of-truth mar a typed ack boundarybol jojjon.

### Domain / Control Model Summary

1. Business invariant: a direct runtime/orchestration flow-k csak explicit producer-owned typed ack truth alapjan donthetnek delivery vagy launch sikerrol; best-effort tmux jel, pane activity vagy legacy wrapper projection nem maradhat canonical consume authority.
2. Control model: delivery consume oldalon a canonical source a `TmuxDeliveryAck`; launch consume oldalon a canonical source a `LaunchBubbleTmuxSessionAck`. A direct flow API-k tovabbi compatibility mezoi csak ebbol derivalt projectionk lehetnek ugyanabban a consume chainben.
3. Read-path rule: a task csak a shared `tmuxDelivery` es `tmuxSessions` port explicit ack shape-jeibol, valamint az ezekbol szuksegesen kepzett same-authority compatibility projectionkbol olvashat delivery/launch truthot.
4. Forbidden fallback:
   - `delivered: boolean` vagy success/throw wrapper mint onallo canonical truth,
   - pane-visible activity vagy retry side effect mint delivery-success bizonyitek,
   - tmux attachability/session liveness mint launch `running` bizonyitek,
   - status/list/read-model vagy operator text mint runtime consume authority.
5. Allowed resolution path:
   - ugyanabban a direct consume chainben megengedett a typed ack -> compatibility projection atvezetes, ha a typed ack mar a decision source;
   - same-authority aggregate consume megengedett, ha tobb delivery eredmenybol explicit typed failure/partial-failure mapping keszul;
   - launch oldalon a legacy wrapper surface atmenetileg megmaradhat, ha a start/restart orchestration mar az explicit launch ack szemantikahoz van kotve.
6. Missing-data rule:
   - delivery ack hiany vagy explicit rejected outcome -> a direct flow fail-closed vagy explicit partial/unavailable allapotot ad;
   - launch ack `failed_to_start` -> start/restart orchestration explicit launch-failure consume utvonalon megy, nem synthetic success-re vagy raw throw-only jelentestre epit;
   - retry/recovery csak explicit uj execution/launch/delivery eredmenyre epulhet.
7. Phase boundary:
   - contract closure: inherited from `E2a`, consume-family contract alignment owned here
   - producer closure: predecessor (`E2a`)
   - internal execution closure: owned here a direct runtime/orchestration consume-familyen belul
   - workflow/orchestration closure: owned here a direct runtime/orchestration consume-familyen belul
   - read_model_closure: successor (`E2c`)
   - activation_closure: successor (`E3`)
   - cleanup_recovery_closure: successor (`E4`), az explicit restart/watchdog read-model es retained adapter cleanup kivetelevel

### Authority Boundary Map

1. Authority producer: `src/v11/infrastructure/channel/tmux/tmuxDeliveryRuntime.ts`, `src/v11/infrastructure/channel/tmux/tmuxDelivery.ts`, `src/v11/infrastructure/channel/tmux/tmuxManager.ts` altal eloallitott typed ack boundary.
2. Stored authority: nincs uj persisted authority ebben a taskban; a runtime sessions registry, transcript es state snapshot csak orchestration input marad.
3. In-scope consumers:
   - kickoff delivery consume,
   - ask-human delivery consume,
   - pass/converged direct delivery consume + aggregate warning/result consume,
   - watchdog pending rework es stuck-input direct consume,
   - start/restart launch consume.
4. Explicit out-of-scope consumers:
   - approval es reply delivery consume,
   - persisted diagnostics, meta-review, status/list/CLI projection,
   - read-model/state snapshot surfacing,
   - implementer pilot activation,
   - reviewer/meta-reviewer rollout cleanup.
5. Export surfaces closed in this phase: yes, a direct runtime/orchestration consume-family exportjai itt mar typed-ack-semantics szerint zarulnak le; public read-model/export closure nem.

### Baseline Preservation

1. Must-preserve behaviors:
   - kickoff, ask-human, pass, converged, watchdog, start es restart tovabbra is ugyanazon workflow allapotatmeneteket hajtsa vegre,
   - a direct result objectek migration alatt tovabbra is hordozhatnak compatibility mezoket a jelenlegi consume feluletek vedelmere,
   - a start/restart operator flow tovabbra is fail-closed maradjon launch failure eseten,
   - watchdog/retry orchestration ne allitson elo synthetic delivery success-t.
2. Allowed resolution paths:
   - typed delivery ack -> direct flow delivery summary/projection,
   - typed launch ack -> direct start/restart orchestration decision -> optional compatibility projection,
   - tobb delivery eredmenybol explicit aggregate mapping (`all accepted`, `partial failure`, `all rejected`) ugyanabban a consume chainben.
3. Forbidden regression interpretations:
   - tilos az `E2b`-t ugy ertelmezni, hogy minden direct flow mar most public/read-model typed ack surfacet kell kapjon;
   - tilos a legacy compatibility mezok korai torlese, ha az adott direct consumer vagy contract harness meg ezeket varja;
   - tilos a producer seam semanticsat ujranyitni vagy uj ack vocabularyt bevezetni;
   - tilos az `E2c` read-model falloutot vagy az `E3` activation gate-et ide huzni.
4. Replacement proof required if removed:
   - barmely direct consume-family compatibility mezot csak akkor lehet torolni, ha ugyanazon task bizonyitja, hogy a direct command/result/contract harness mar explicit typed ack consume-ra allt, es nincs tovabbi in-scope consumer rajta.

### In Scope

1. A kickoff direct delivery consume atallitasa a typed delivery ack szemantikahoz.
2. Az ask-human direct delivery consume es shared ask-human delivery contract alignmentje.
3. A pass es converged direct delivery result/aggregate consume alignmentje.
4. A watchdog pending-rework es stuck-input consume alignmentje.
5. A start es restart launch consume alignmentje a shared launch ack contracthoz.
6. A kapcsolodo direct contract harness es runtime teszt coverage frissitese.

### Out of Scope

1. Approval es reply delivery consume alignment.
2. Persisted diagnostics, meta-review, status/list/CLI/read-model fallout.
3. Uj producer ack semantics vagy uj shared ack vocabulary.
4. Implementer pilot activation, reviewer/meta-reviewer rollout, retained adapter cleanup.
5. UI/presenter/operator wording cleanup.

### Safety Defaults

1. A typed ack legyen a canonical direct decision source; compatibility projection csak ezt kovetheti.
2. Ha direct consumer alignment kozben egy consume shape csak breaking modon lenne atallithato, a compatibility projection maradjon meg es a removal kulon successor cleanup legyen.
3. Ha launch vagy delivery direct consume nem tud explicit typed failure-t ertelmezni, fail-closed maradjon; ne menjen at implicit successbe.

### Contract Boundary / Blast Radius

1. `contract_boundary_override`: `yes`
2. Erintett contractok:
   - direct runtime command/result contractok,
   - shared ask-human es kickoff delivery result contractok,
   - start/restart launch consume contractok,
   - direct contract harness expectation surfaces.

### Complexity Risk Gate

1. `authority_risk`: `1`
2. `surface_spread`: `2`
3. `identity_join_risk`: `1`
4. `activation_coupling`: `1`
5. `prerequisite_risk`: `1`
6. `acceptance_multiplicity`: `2`
7. `risk_score`: `8`
8. `single-task allowed`: `yes`
9. Split decision:
   - a producer closure mar kulon lezart (`E2a`),
   - a read-model/persisted fallout kulon deferred (`E2c`),
   - a pilot activation kulon deferred (`E3`),
   - a fennmarado bounded task itt kifejezetten a direct runtime/orchestration consume family alignmentje.
10. Identity/join note:
   - canonical identity path: `typed producer ack -> direct orchestration decision -> optional compatibility projection`
   - competing identifiers or fallback identities: legacy `delivered` boolean mint authority, success/throw launch wrapper, pane activity, retry side effect, operator-facing diagnostics
11. Authority/source-of-truth note:
   - canonical source: shared `TmuxDeliveryAck` es `LaunchBubbleTmuxSessionAck`
   - forbidden secondary sources: pane-derived liveness, legacy boolean-only consume, read-model/status projection
12. Closure-budget triage:
   - closure buckets touched: `shared_contract`, `internal_execution_consumers`, `workflow_orchestration_consumers`
   - intentionally collapsed closures: `shared_contract` + `internal_execution_consumers` + `workflow_orchestration_consumers`, mert itt ugyanaz a bounded direct consume-family ownership zarja le a typed ack direct consume-jat, explicit deferred read-model es activation lane-ek mellett
   - explicitly deferred closures: `authority_producer`, `read_model_consumers`, `persisted_authority_or_schema`, `cleanup_recovery_consumers` (a direct watchdog/restart consume kivetelével)

## L1 - Change Contract

### 0) Domain / Control Contract

| Item | Rule | Implementation Consequence | Priority | Timing |
|---|---|---|---|---|
| Business invariant | A direct runtime/orchestration flow-k explicit typed ackbol dontenek delivery/launch sikerrol. | A boolean/success-throw compatibility surface nem maradhat onallo decision source. | P1 | required-now |
| Control model | Deliverynel a `TmuxDeliveryAck`, launchnal a `LaunchBubbleTmuxSessionAck` a canonical truth. | A direct flow contractoknak ezekbol kell levezetniuk a sajat consume semanticsat. | P1 | required-now |
| Read-path rule | Csak explicit producer ack es annak same-authority consume projectionje olvashato. | Nincs pane/status/watchdog-derived canonical success. | P1 | required-now |
| Forbidden fallback | Nincs legacy boolean-only vagy throw-only canonical consume. | A direct flow-k nem kovetkeztethetnek typed truthot a regi wrapperbol. | P1 | required-now |
| Allowed resolution path | Compatibility projection maradhat, ha a typed ack mar a decision source. | Az eredmeny shape migration atmenetileg additive maradhat. | P1 | required-now |
| Missing-data rule | Hianyzo vagy rejected/failed ack explicit failure/unavailable consume-ot ad. | A direct flow fail-closed marad, nem implicit success alapjan route-ol. | P1 | required-now |
| Phase boundary | Ez a task csak direct consume-family alignmentet owns-ol. | Approval/reply, read-model, pilot activation es cleanup lane-ek kulon maradnak. | P1 | required-now |

### 0a) Shared Contract Compatibility

| Shared Contract | Current Consumers | Change Type (`additive|breaking|N/A`) | This Task Action | Deferred Alignment |
|---|---|---|---|---|
| `KickoffResultDelivery` + kickoff validated delivery consume | kickoff flow, kickoff result shape, kickoff tests | additive-to-breaking internal migration | typed delivery ack semantics consume + compatibility projection megtartasa ahol szukseges | `E2c` public/read-model fallout |
| `AskHumanEmitTmuxDeliveryNotificationResult` + `RunAskHumanFlowResult.delivery` | ask-human finalization, ask-human tests | additive-to-breaking internal migration | align the shared ask-human delivery contract with typed ack consume semantics | `E2c` projection fallout |
| pass/converged delivery result surfaces | pass finalization, converged gate/finalization, CLI warnings, contract runners | additive | typed ack legyen a direct decision source; legacy warning/result mezok atmenetileg maradhatnak | later cleanup only after in-scope consumers migrate |
| `LaunchBubbleTmuxSessionResult` consume in start/restart | start orchestration, restart orchestration, start/restart contract runners | additive-to-breaking internal migration | explicit launch ack consume semantics bevezetese a direct orchestrationben compatibility projection mellett | `E2c`/later cleanup a broader projection surfacesre |

### 0b) Baseline Preservation

| Current Behavior | Preserve/Replace/Forbid | Required Proof | Priority | Timing |
|---|---|---|---|---|
| kickoff/ask-human/pass/converged/watchdog today still expose `delivered: boolean` style direct results | replace as canonical source, preserve as temporary projection | tests prove typed ack drives the flow decision while compatibility fields remain accurate | P1 | required-now |
| start/restart ma `sessionName` success vagy throw fail-closed consume-ra epul | replace as canonical source, preserve wrapper compatibility | tests prove launch ack drives orchestration while legacy wrapper remains fail-closed and compatibility-safe | P1 | required-now |
| watchdog retry/rework path explicit delivery-confirmation failuret surfacel | preserve | tests prove explicit rejected ackbol marad a failure path, retry side effect nem canonical success | P1 | required-now |

### 0c) Sequencing / Successor Handoff Boundary

| Boundary Slice | Closed Here | Must Stay Deferred | Exit Rule |
|---|---|---|---|
| kickoff / ask-human / pass / converged / watchdog delivery consume alignment | yes | persisted/meta-review/status fallout | direct flow results mar explicit typed-ack-semantics szerint route-olnak |
| start / restart launch consume alignment | yes | pilot activation, broader runtime rollout | start/restart orchestration explicit launch ack consume semanticset hasznal |
| read-model/status/list/CLI fallout | no | `E2c` | a task nem claimel public projection closure-t |
| implementer pilot activation | no | `E3` | a task nem kapcsol uj actor pilotot |
| retained adapter cleanup | no | `E4` | compatibility remove trigger tovabbra is successor-owned |

### 1) Call-site Matrix

| ID | File | Function/Entry | Exact Signature (args -> return) | Insertion Point | Expected Behavior | Priority | Timing | Evidence |
|---|---|---|---|---|---|---|---|---|
| CS1 | `src/v11/shared/kickoff/kickoffValidatedExecutionDelivery.ts`, `src/v11/shared/kickoff/kickoffResultBuilders.ts` | `executeKickoffValidatedDelivery`, kickoff delivery/result mapping | validated kickoff context -> `KickoffResultDelivery` | kickoff direct delivery consume | kickoff direct result a typed delivery ackbol szarmaztassa a direct consume semanticsat; compatibility projection csak output-level maradjon | P1 | required-now | kickoff tests |
| CS2 | `src/v11/shared/askHuman/askHumanDeliveryPortsContract.ts`, `src/v11/shared/askHuman/askHumanFlowContract.ts`, `src/v11/shared/askHuman/askHumanFinalizationArtifacts.ts`, `src/v11/application/askHuman/askHumanNotificationEmission.ts` | ask-human delivery ports/result builders | ask-human finalization input -> `RunAskHumanFlowResult` | ask-human direct delivery consume | ask-human direct flow a typed delivery ack consume semanticsara alljon at ugyanazon authority chainben | P1 | required-now | askHuman tests |
| CS3 | `src/v11/application/pass/passResultDelivery.ts`, `src/v11/application/pass/runNormalPassFlowContract.ts`, `src/v11/application/pass/normalPassFinalization.ts` | pass delivery mapping/finalization result | delivery result + retry flag -> pass result | pass direct delivery consume | pass result es finalization metadata mar typed delivery ack consume-ra epuljon, legacy warning/result projection fenntartasaval | P1 | required-now | pass-related tests |
| CS4 | `src/v11/application/converged/convergedGateDelivery.ts`, `src/v11/application/converged/runConvergedFlowContract.ts`, `src/v11/application/converged/convergedFinalizationTypes.ts` | converged gate delivery aggregation + result contract | gate route + delivery results -> converged direct result | converged direct delivery consume | aggregate partial/all-failure logic explicit typed delivery ack consume semanticsara alljon at | P1 | required-now | converged tests + contract runner |
| CS5 | `src/v11/application/watchdog/watchdogPendingReworkIntent.ts`, `src/v11/application/watchdog/watchdogCommandFlow.ts` | pending rework consume + stuck-input retry direct consume | watchdog context -> watchdog result | watchdog direct orchestration consume | watchdog failure path explicit rejected/unavailable consume semanticsat hasznaljon; retry side effect ne legyen success truth | P1 | required-now | watchdog/restart recovery tests |
| CS6 | `src/v11/application/start/startCommandContract.ts`, `src/v11/application/start/startCommandFlows.ts`, `src/v11/application/restart/restartCommandContract.ts`, `src/v11/application/restart/runRestartFlow.ts` | start/restart launch consume | launch/restart input -> `StartBubbleResult` / `RestartBubbleResult` | launch direct orchestration consume | start/restart orchestration explicit launch ack consume alapjan menjen, wrapper compatibility megorzese mellett | P1 | required-now | start/restart tests + contract runners |

### 2) Data and Interface Contract

| Contract | Current | Target | Required Fields | Optional Fields | Compatibility | Priority | Timing |
|---|---|---|---|---|---|---|---|
| Direct delivery consume result family | boolean `delivered` + optional `reason` per-flow shape | typed delivery ack-driven consume semantics + compatibility projection | canonical delivery status consume mapping, failure reason mapping | retry, message, target reason compatibility fields | additive migration within direct flows | P1 | required-now |
| Ask-human shared delivery contract | ask-human local clone of legacy delivery result | shared typed-ack-semantics-aligned local contract or direct shared contract adoption | explicit accepted/rejected consume semantics | compatibility fields where still needed | additive-to-breaking internal contract correction | P1 | required-now |
| Kickoff delivery result contract | `KickoffResultDelivery` boolean summary | typed-ack-driven kickoff result | delivery status consume source, failure mapping | retried compatibility field | additive | P1 | required-now |
| Pass/converged direct result contract | delivery summary with `delivered`, `reason`, `retried` | typed-ack-driven summary with compatible outward shape where required | explicit mapping from canonical rejected reasons / aggregate failures | compatibility output fields | additive | P1 | required-now |
| Start/restart launch consume contract | `sessionName` success surface, throw fail-closed path | explicit `running|failed_to_start` launch consume semantics in orchestration, projected to current result shape | `status`, failure reason_code/kind consume internally | sessionName compatibility on success and selected failures | additive migration | P1 | required-now |

### 3) Side Effects Contract

| Area | Allowed | Forbidden | Notes | Priority | Timing |
|---|---|---|---|---|---|
| direct runtime/orchestration result shaping | consume remapping, compatibility projection, contract runner updates | producer ack helper rewrite | producer semantics mar `E2a` tulajdon | P1 | required-now |
| workflow state progression | ugyanazon state transitions megtartasa explicit typed consume mellett | uj lifecycle state vagy read-model write path | direct flow parity kotelezo | P1 | required-now |
| tests/contracts | direct flow, contract runner, regression matrix frissitese | read-model/status/list fallout tests behuzasa | csak in-scope direct consume coverage | P1 | required-now |

Constraint:
1. Ez a task nem vezethet be uj persisted state mezot es nem modosithat read-model/status/list projection source-of-truthot.

### 4) Error and Fallback Contract

| Trigger | Dependency (if any) | Behavior (`throw|result|fallback`) | Fallback Value/Action | Reason Code | Log Level | Priority | Timing |
|---|---|---|---|---|---|---|---|
| direct delivery consume rejected ackot kap | tmux delivery ack | result | explicit failure/partial-failure consume, compatibility fields ezt kovetik | existing delivery/aggregate reason mapping or explicit direct-flow code | warn | P1 | required-now |
| launch consume `failed_to_start` ackot kap | tmux launch ack | result internally; throw csak retained wrapper boundaryn ahol szukseges | start/restart fail-closed marad explicit launch-failure consume mellett | `LAUNCH_ACK_*` family | error | P1 | required-now |
| delivery call exception legacy wrapperkent erkezik | direct flow emit dependency | fallback | explicit rejected/unavailable consume mapping, no synthetic success | `DELIVERY_ACK_REJECTED` equivalent consume mapping | warn | P1 | required-now |
| stuck-input retry side effect nem ad explicit success bizonyitekot | watchdog retry path | result | marad not_expired/no-op vagy explicit delivery failure; retry nem success proof | existing watchdog reason family | info | P1 | required-now |
| broader read-model fallout jelenik meg implementation kozben | out-of-scope dependency | result | stop closure claim at direct consume family; handoff to `E2c` | `PHASEE2B_READ_MODEL_FALLOUT_DEFERRED` | warn | P2 | required-now |

### 5) Dependency Constraints

| Type | Items | Priority | Timing |
|---|---|---|---|
| must-use | `plans/actor-runtime-interface-discovery-and-migration-plan-v1.md` | P1 | required-now |
| must-use | `plans/tasks/actor-runtime-interface-pilot-cutover-phaseE.md` | P1 | required-now |
| must-use | `plans/archive/tasks/actor-runtime-interface-delivery-ack-producer-contract-phaseE2a.md` | P1 | required-now |
| must-use | `plans/tasks/actor-runtime-interface-scenario-simulation-phaseC-matrix.md` rows `SC10_RESTART_RECOVERY`, `SC11_TMUX_OBSERVABILITY_WITH_MISSING_OR_DELAYED_ACK` | P1 | required-now |
| must-use | current-tree code evidence: kickoff, ask-human, pass, converged, watchdog, start, restart direct consume seams | P1 | required-now |
| must-not-use | approval/reply direct consume migration | P1 | required-now |
| must-not-use | persisted diagnostics/meta-review/status/list/CLI projection cleanup | P1 | required-now |
| must-not-use | implementer pilot activation vagy role rollout | P1 | required-now |

### 6) Test Matrix

| ID | Scenario | Given | When | Then | Priority | Timing | Evidence |
|---|---|---|---|---|---|---|---|
| T1 | kickoff direct consume uses typed delivery truth | successful es rejected delivery ack fixture | kickoff validated delivery fut | kickoff result a typed ack alapjan allitja be a success/failure consume-ot, compatibility projection mellett | P1 | required-now | automated test |
| T2 | ask-human direct consume uses typed delivery truth | ask-human delivery accepted/rejected fixture | ask-human finalization fut | `RunAskHumanFlowResult.delivery` explicit typed-ack consume mappinget kovet | P1 | required-now | automated test |
| T3 | pass direct consume parity | pass delivery accepted/rejected fixture | normal pass finalization fut | pass result/warning fields a typed ack consume-bol szarmaznak, flow parity megmarad | P1 | required-now | automated test |
| T4 | converged aggregate partial/all failure mapping explicit | tobb gate delivery eredmeny accepted/rejected kombinaciokkal | converged gate delivery fut | aggregate consume explicit typed failure logicra epul, nem boolean-only legacy precedence-re | P1 | required-now | automated test + contract runner |
| T5 | watchdog pending rework fail-closed marad explicit rejected ackon | pending intent + rejected delivery ack | watchdog apply fut | nincs synthetic success; explicit delivery failure marad | P1 | required-now | automated test |
| T6 | watchdog stuck-input retry nem lesz success proof | active running state + retry helper uncertain output | watchdog not-expired path fut | retry side effect legfeljebb observability/no-op, nem canonical delivery success | P1 | required-now | automated test |
| T7 | start consume explicit launch failuret ertelmez | launch ack `failed_to_start` fixture | fresh/resume start orchestration fut | explicit launch failure consume utvonal ervenyesul; wrapper compatibility fail-closed marad | P1 | required-now | start tests + contract runner |
| T8 | restart consume explicit launch failuret ertelmez | previous session cleanup sikerul, uj launch ack `failed_to_start` | restart flow fut | restart explicit launch failure consume-ot ad, nem implicit success-t | P1 | required-now | restart tests + contract runner |
| T9 | no E2c fallout claim | direct consume alignment diff | validation summary keszul | nincs status/list/meta-review/read-model closure allitas a handoffban | P1 | required-now | review evidence |

## L2 - Implementation Notes (Optional)

1. [later-hardening] Ha a direct flow-k kozott ugyanaz a typed-ack -> compatibility projection logika tobb helyen duplikalodik, kulon shared consume helper task nyithato csak a direct-family stabilization utan.
2. [later-hardening] Approval/reply direct consume alignmentet csak kulon successor taskban erdemes megnyitni, ha a Phase E sequencing ezt tovabbra is kulon lane-en tartja.

## Hardening Backlog (Optional)

| ID | Item | Layer | Priority | Timing | Source | Proposed Action |
|---|---|---|---|---|---|---|
| H1 | kickoff/ask-human/pass/converged delivery projection helper consolidation | L2 | P2 | later-hardening | E2b drafting | csak a direct consume semantics stabilizalasa utan |
| H2 | reply/approval direct consume lane explicit successor taskba rendezese | L1 | P2 | later-hardening | E2b drafting | kulon task megnyitasa csak a direct E2b merge utan |

## Review Control

1. Every finding must include: `priority`, `timing`, `layer`, `evidence`.
2. Ne fogadjunk el olyan follow-upot, amely az `E2b` taskba persisted/meta-review/status/list falloutot vagy implementer pilot activationt huzna be.
3. A typed ack legyen a canonical direct consume source; legacy compatibility mezok csak projectionkent maradhatnak.
4. Ha valamely direct flow csak breaking consume-shape mellett tudna atallni, a task marad compatibility-preserving es a removal kulon successor cleanup.
5. PASS/done-package summary nem claimelhet `E2c` vagy `E3` closure-t.

## Spec Lock

Mark task as `IMPLEMENTABLE` when:

1. a kickoff, ask-human, pass, converged, watchdog, start es restart direct consume-family explicit typed ack consume semanticsre all;
2. a direct result contractok ott tartanak meg compatibility projectiont, ahol az in-scope consumers ezt meg igenylik;
3. nincs approval/reply, persisted/meta-review/status/list/read-model vagy pilot activation fallout behuzva;
4. a start/restart launch consume explicit launch ack alapjan mukodik, fail-closed wrapper compatibility mellett;
5. az automated tests es contract runners bizonyitjak a direct consume parityt es a fail-closed behavior megmaradasat.
