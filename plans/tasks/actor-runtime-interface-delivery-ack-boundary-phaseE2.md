---
artifact_type: task
artifact_id: task_actor_runtime_interface_delivery_ack_boundary_phaseE2_v1
title: "Actor Runtime Interface Delivery Ack Boundary (Phase E2)"
status: draft
phase: phaseE2
target_files:
  - src/v11/shared/delivery/tmuxDeliveryContract.ts
  - src/v11/shared/ports/tmuxDelivery.ts
  - src/v11/infrastructure/channel/tmux/tmuxDeliveryRuntime.ts
  - src/v11/shared/ports/tmuxSessions.ts
  - src/v11/infrastructure/channel/tmux/tmuxManager.ts
  - src/v11/application/start/startCommandContract.ts
  - src/v11/application/start/startCommandTmuxLaunch.ts
  - src/v11/application/start/startCommandFlows.ts
  - src/v11/application/converged/convergedGateDelivery.ts
  - src/v11/shared/delivery/implementerHandoffDelivery.ts
  - src/v11/shared/kickoff/kickoffValidatedExecutionDelivery.ts
  - src/v11/application/watchdog/watchdogPendingReworkIntent.ts
  - src/v11/shared/metaReviewGate/metaReviewGateTypes.ts
  - src/v11/shared/metaReviewGate/metaReviewGateApplyPersistence.ts
  - src/types/bubble.ts
  - src/v11/shared/state/stateSchemaMetaReviewRuntime.ts
  - src/v11/infrastructure/state/stateSnapshotInspection.ts
  - src/v11/shared/metaReview/metaReviewSnapshot.ts
  - src/v11/shared/status/statusCommandViewProjection.ts
  - src/v11/application/status/statusCliTextRenderer.ts
  - src/v11/application/status/statusCliTableRenderer.ts
  - src/cli/index.ts
  - tests/cli/passAutoConvergeWarning.test.ts
  - tests/cli/convergedDeliveryWarning.test.ts
  - tests/cli/requestReworkDeliveryWarning.test.ts
  - tests/cli/bubbleStatusCommand.test.ts
  - tests/core/runtime/restartRecovery.test.ts
  - tests/core/bubble/watchdogBubble.test.ts
  - plans/tasks/actor-runtime-interface-delivery-ack-boundary-phaseE2.md
prd_ref: null
plan_ref: plans/actor-runtime-interface-discovery-and-migration-plan-v1.md
system_context_ref: README.md
owners:
  - "felho"
---

# Task: Actor Runtime Interface Delivery Ack Boundary (Phase E2)

## L0 - Policy

### Goal

Typed delivery / launch ack boundary specifikalasa a current actor-runtime boundaryhez ugy, hogy:
1. a retained tmux delivery result tobbe ne `delivered: boolean` + best-effort failure reason szerzodes legyen,
2. a runtime acceptance truth explicit, typed boundarykent valassza szet a delivery ackot es a launch ackot,
3. restart/recovery, watchdog, CLI warning es status surfaces mar ezen az explicit ack modellen uljenek, pane-derived heurisztika helyett.

### Domain / Control Model Summary

1. Business invariant: workflow-level runtime acceptance vagy launch allapot csak a current executionhoz kotott explicit ack boundaryrol olvashato; a pane-ben lathato activity vagy marker onmagaban nem acceptance truth.
2. Control model: az `E1` altal bevezetett explicit `execution_id` a delivery/launch ack boundary kotelezo target-azonositoja. Ack observation csak akkor canonical, ha a current `execution_id` + `handoff_id` + `round` parhoz kotheto.
3. Boundary split:
   - `delivery ack` = a runtime befogadasi boundaryjan adott typed jelzes (`accepted`, `rejected`, vagy explicit unavailable/equivalent),
   - `launch ack` = a concrete actor/session inditasi boundaryjan adott typed jelzes (`running`, `failed_to_start`, vagy explicit unavailable/equivalent).
4. Read-path rule:
   - pane-activity, tmux capture, marker-presence es session-nev csak observability / diagnostics input lehet,
   - state transition vagy user-facing success guidance nem olvashat acceptance truthot ezekbol kozvetlenul.
5. Forbidden fallback:
   - nincs `delivered=true` => implicit `accepted`,
   - nincs marker-confirmation => implicit `running`,
   - nincs "ha latszik a pane-ben, akkor biztos fut" fallback,
   - nincs role-specifikus kulon ack vocabulary az implementer/reviewer/meta-reviewer lane-ekhez.
6. Allowed resolution path:
   - retained tmux topology, pane routing es session launch adapter megmaradhat transportkent,
   - a canonical returned / persisted boundary viszont explicit typed ack observation kell legyen,
   - operator diagnostics lehet reszletesebb, de nem vezethet be a canonical vocabularytol eltero uj acceptance szemantikat.
7. Missing-data rule:
   - ha a runtime nem tud explicit delivery vagy launch ackot adni, azt explicit unavailable / not-confirmed boundary allapotkent kell visszaadni,
   - ez nem azonos a sikerrel, es nem nyithat csendes tovabblepest.
8. Duplicate/interim invariant:
   - duplicate masodik delivery/launch signal nem hozhat letre masodik `accepted` vagy masodik `running` truthot ugyanarra a current executionre,
   - a vegso suppression-policy finomitas maradhat bounded open kerdes, de az interim invariant kotelezo.
9. Phase boundary:
   - contract_closure: owned here
   - producer_closure: owned here
   - internal_execution_closure: owned here
   - workflow_orchestration_closure: successor (`E3`)
   - read_model_closure: csak a typed ack falloutig owned here
   - activation_closure: successor (`E3`)
   - cleanup_recovery_closure: csak a kozvetlen restart/watchdog fallout owned here; broad retained cleanup successor (`E4`)

### Authority / Ack Boundary Map

1. Ack producers:
   - `src/v11/infrastructure/channel/tmux/tmuxDeliveryRuntime.ts`
   - `src/v11/infrastructure/channel/tmux/tmuxManager.ts`
   - `src/v11/application/start/startCommandTmuxLaunch.ts`
2. Ack identity anchors:
   - persisted `state.execution_context.execution_id`
   - current `handoff_id`
   - current `round`
3. In-scope consumers:
   - converged/pass/request-rework delivery helpers
   - start/resume launch flow
   - watchdog deferred rework delivery
   - restart/recovery fallout tests
   - meta-review runtime delivery persistence/projection where current tree already stores runtime delivery diagnostics
   - CLI warning text and status/list projections
4. Explicit out-of-scope consumers:
   - implementer pilot activation policy
   - reviewer/meta-reviewer rollout cleanup
   - topology csere vagy tmux eltavolitasa
   - full duplicate-suppression policy ownership split beyond the interim invariant
5. Export surfaces closed in this phase: `no`; retained adapters maradnak, de mar typed ack contracttal.

### Baseline Preservation

1. Must-preserve behaviors:
   - az `E1` explicit execution authority baseline valtozatlan marad,
   - retained tmux launch/delivery adapter megmaradhat current-tree transportkent,
   - restart/recovery operator path megmarad,
   - watchdog deferred rework intent csak explicit delivery-success mellett lephet tovabb.
2. Allowed resolution paths:
   - same current execution + explicit typed delivery ack,
   - same current execution + explicit typed launch ack,
   - missing ack => explicit unavailable / failed diagnostics, nem silent success.
3. Forbidden regression interpretations:
   - a boolean `delivered` nem tekintheto elegseges replacement proofnak az `E2` utan,
   - a retained meta-review `confirmed|uncertain|failed` triad nem maradhat canonical runtime truth, ha nem kotodik az uj typed ack boundaryhoz,
   - az `E2` nem csuszhat at implementer pilot activationbe vagy broad adapter cleanupba.
4. Replacement proof required if removed:
   - ha a jelenlegi tmux marker-confirmation retained mechanizmus barmilyen resze kikerul, az uj boundarynak explicit proofot kell adnia a `accepted/rejected` vagy `running/failed_to_start` separationre es a no-pane-inference szabalyra.

### In Scope

1. A retained delivery result contract explicit, typed ack boundaryre cserelese.
2. A retained launch/session-start result contract explicit launch ackra emelese.
3. `execution_id` parity bevonasa minden canonical ack observation target-azonositasaba.
4. A watchdog es deferred rework flow alignmentje az uj typed delivery resulttal.
5. A meta-review runtime delivery persisted/projection seam minimalis, current-tree-owned alignmentje.
6. A CLI warning- es status-szovegek alignmentje a typed ack boundaryra.
7. A restart/recovery es watchdog tesztfelulet explicit lezarsa az uj ack modelre.

### Out of Scope

1. Implementer pilot cutover vagy activation.
2. Reviewer/meta-reviewer full runtime rollout.
3. Tmux eltavolitasa vagy topology-semleges executor bevezetese.
4. Bounded open policy teljes lezarsa duplicate success replay vagy retry UX teren.
5. Broad UI redesign a minimalis diagnostics fallouton tul.

### Safety Defaults

1. A retained tmux adapter maradhat, de a canonical contract mar nem lehet tmux-heurisztika-alapu.
2. `accepted` es `running` csak explicit boundary observationbol allhat elo.
3. `execution_id` nelkuli ack observation nem canonical.
4. Ha a transport csak reszleges bizonyitekot tud adni, a surface explicit unknowable/unavailable pathot mutasson, ne optimistic successet.
5. Role-specifikus special-case ack contract nem vezetheto be; a boundary shared marad.

### Ack Vocabulary Decision

1. Minimum canonical vocabulary:
   - delivery boundary: `accepted`, `rejected`
   - launch boundary: `running`, `failed_to_start`
2. Equivalent extension megengedett, ha a contract explicit kulon tudja jelezni az ack hianyat vagy bizonyithatatlansagat, de ez nem moshatja ossze a fenti minimum statuszokat.
3. A delivery ack es a launch ack kulon boundary-pillanat; egyetlen lapos `confirmed|failed` vagy `delivered:boolean` shape nem elfogadhato replacement.
4. Minden canonical ack observation kotelezo target mezoi:
   - `observed_for_execution_id`
   - `observed_for_handoff_id`
   - `observed_for_round`
   - `observed_at`
5. `reason_code` es operator-facing `message` maradhat diagnostics mezokent, de nem helyettesiti a typed statuszt.

### Contract Boundary / Blast Radius

1. `contract_boundary_override`: `yes`
2. Erintett contractok:
   - retained tmux delivery result contract
   - retained tmux session launch result contract
   - meta-review runtime delivery persistence/projection contract
   - CLI warning / status diagnostics contract

### Complexity Risk Gate

1. `authority_risk`: `1`
2. `surface_spread`: `2`
3. `identity_join_risk`: `2`
4. `activation_coupling`: `1`
5. `prerequisite_risk`: `1`
6. `acceptance_multiplicity`: `2`
7. `risk_score`: `9`
8. `single-task allowed`: `yes`
9. Identity/join note:
   - canonical join path: `execution_context.execution_id` + `handoff_id` + `round` -> typed ack observation
   - forbidden join path: pane-visible activity, tmux marker alone, role-only routing
10. Source-of-truth note:
   - canonical source: typed runtime ack producer seams
   - forbidden secondary source: pane observability, warning text, ad-hoc transport side effects

## L1 - Change Contract

### 0) Domain / Control Contract

| Item | Rule | Implementation Consequence | Priority | Timing |
|---|---|---|---|---|
| Business invariant | Runtime acceptance truth csak explicit ack boundaryrol olvashato. | Delivery/launch result contractot typed statuszokra kell emelni. | P1 | required-now |
| Control model | `execution_id` + `handoff_id` + `round` a canonical ack target. | Ack observation ezek nelkul nem canonical. | P1 | required-now |
| Read-path rule | Pane activity nem acceptance source. | Status/warning text nem kovetkeztethet pane-lathatosagbol `accepted` vagy `running` allapotra. | P1 | required-now |
| Forbidden fallback | Boolean `delivered` vagy `confirmed` triad nem eleg. | Result shape replacement kell, nem csak string-atnevezes. | P1 | required-now |
| Allowed resolution path | Tmux retained adapter maradhat transportkent. | Infra megtarthato, de a returned contract typed ack lesz. | P1 | required-now |
| Missing-data rule | Ack hiany explicit unavailable / not-confirmed state. | Consumers nem lephetnek tovabb implicit successre. | P1 | required-now |
| Phase boundary | `E2` csak ack boundary + fallout. | Pilot activation es broad cleanup tiltott. | P1 | required-now |

### 0a) Shared Contract Compatibility

| Shared Contract | Current Consumers | Change Type (`additive|breaking|N/A`) | This Task Action | Deferred Alignment |
|---|---|---|---|---|
| `EmitTmuxDeliveryNotificationResult` | pass/converged/request-rework/watchdog/kickoff flows | breaking internal shared contract | `delivered:boolean` helyett explicit typed delivery ack result vagy ekvivalens split-contract | `E3-E4` csak higher-level rollout |
| `EmitTmuxDeliveryNotificationPort` | delivery helper layers | breaking internal port | minden consume hely explicit typed ackot kezeljen | `E3-E4` |
| `LaunchBubbleTmuxSessionResult` | start/resume launch flow | breaking internal port | explicit launch ack / failure semantics threadelese | `E3` activation build on top |
| meta-review runtime delivery stored state | meta-review gate, status, inspect/read path | breaking internal diagnostics contract | `confirmed|uncertain|failed` canonical source-of-truthkent megszunik vagy lossless typed projectionne valik | `E4` broad cleanup marad separate |
| CLI delivery warning text | `pairflow pass`, `converged`, `request-rework` | breaking user-facing wording contract | warning text typed ack terminologyra all at | later copy polish only |
| status/read-model runtime projection | `bubble status` text/table and list fallout | breaking diagnostics projection | execution-bound typed ack projection jelenik meg pane-helyettesites nelkul | `E4` non-critical cleanup |

### 0b) Baseline Preservation

| Current Behavior | Preserve/Replace/Forbid | Required Proof | Priority | Timing |
|---|---|---|---|---|
| `E1` explicit execution authority | preserve | tests prove ack target `execution_id`-hoz kotodik | P1 | required-now |
| retained tmux transport | preserve as adapter | infra kept, but no canonical boolean-success semantics remain | P1 | required-now |
| watchdog deferred rework csak sikeres delivery utan lep tovabb | preserve then strengthen | tests prove explicit accepted-equivalent path required | P1 | required-now |
| restart/recovery retained operator path | preserve | tests prove delivery failure utan uj recovery path routeolhato marad | P1 | required-now |
| meta-review authority nem deaktivodik pusztan diagnostics failure miatt deadline elott | preserve | tests prove failed/unavailable runtime delivery nem ir felul az authority lifecycle-t | P1 | required-now |

### 0c) Ack Normative Rules

1. `R1_SPLIT_BOUNDARY`: delivery ack es launch ack kulon boundary-pillanat; egyetlen boolean vagy lapos triad nem eleg.
2. `R2_EXECUTION_TARGETING`: canonical ack observation csak explicit `observed_for_execution_id`, `observed_for_handoff_id` es `observed_for_round` mellett ervenyes.
3. `R3_NO_PANE_INFERENCE`: pane activity, tmux capture vagy marker-presence nem inferalhat `accepted` vagy `running` allapotot.
4. `R4_MISSING_ACK_EXPLICIT`: ha explicit ack nem bizonyithato, a returned/persisted contract explicit unavailable/not-confirmed allapotot kell adjon, nem successet.
5. `R5_DUPLICATE_INTERIM_GUARD`: duplicate masodik signal nem hozhat letre masodik `accepted` vagy `running` truthot ugyanarra a current executionre.

### 1) Call-site Matrix

| ID | File | Function/Entry | Exact Signature (args -> return) | Insertion Point | Expected Behavior | Priority | Timing | Evidence |
|---|---|---|---|---|---|---|---|---|
| CS1 | `src/v11/shared/delivery/tmuxDeliveryContract.ts` | `EmitTmuxDeliveryNotificationResult`, failure/status types | type shapes | retained delivery contract seam | A canonical delivery result typed ack vocabularyt hordozzon; `delivered:boolean` onmagaban megszunik. | P1 | required-now | code diff + tests |
| CS2 | `src/v11/shared/ports/tmuxDelivery.ts` | exported delivery port types | port types | shared port seam | Port consumer mindenhol az uj typed resultot olvassa. | P1 | required-now | code diff |
| CS3 | `src/v11/infrastructure/channel/tmux/tmuxDeliveryRuntime.ts` | `attemptTmuxDelivery`, `createDeliveryFailureResult` | infra delivery attempt -> result | retained delivery producer | Marker-confirmation vagy tmux-failure mar typed delivery ack observationne/projectionne fordul. | P1 | required-now | tests |
| CS4 | `src/v11/shared/ports/tmuxSessions.ts` | `LaunchBubbleTmuxSessionResult` | tmux launch port result | launch result contract | Fresh/resume launch explicit launch ack / failure semanticsat hordozzon. | P1 | required-now | code diff |
| CS5 | `src/v11/infrastructure/channel/tmux/tmuxManager.ts` | `launchBubbleTmuxSession` | launch input -> launch result | retained session launch producer | Session launch resultnek explicit launch-boundary statuszt kell adnia, nem csak session nevet. | P1 | required-now | tests |
| CS6 | `src/v11/application/start/startCommandTmuxLaunch.ts` | `launchFreshTmuxSession`, `launchResumeTmuxSession` | start context -> tmux launch result | start launch boundary | A start flow typed launch ackot threadel, nem csak `sessionName`-et. | P1 | required-now | tests |
| CS7 | `src/v11/application/start/startCommandFlows.ts`, `src/v11/application/start/startCommandContract.ts` | fresh/resume start orchestration and result contracts | start input -> `StartBubbleResult` | start consume seam | Start/resume failure/success semantics explicit launch ack boundaryra epuljenek. | P1 | required-now | tests |
| CS8 | `src/v11/application/converged/convergedGateDelivery.ts` | `buildConvergedDelivery`, aggregate reason resolver | delivery results -> CLI-facing result | converged delivery aggregation | Aggregate result explicit typed delivery outcome alapjan alljon, ne boolean failed-counton. | P1 | required-now | tests |
| CS9 | `src/v11/shared/delivery/implementerHandoffDelivery.ts` | `shouldRetryImplementerHandoffDelivery`, `executeImplementerHandoffDelivery` | delivery input -> result | handoff retry seam | Retry policy csak explicit retryable ack-unavailable/failure esetre aktivalodjon. | P1 | required-now | tests |
| CS10 | `src/v11/shared/kickoff/kickoffValidatedExecutionDelivery.ts` | `mapKickoffResultDelivery`, fallback builders | validation + envelope -> kickoff delivery projection | kickoff delivery seam | Kickoff consumer mar typed delivery resultot adjon vissza. | P1 | required-now | tests |
| CS11 | `src/v11/application/watchdog/watchdogPendingReworkIntent.ts` | `maybeApplyPendingReworkIntent` | watchdog input -> watchdog result | deferred rework consume seam | Pending rework intent csak explicit accepted-equivalent delivery mellett alkalmazhato; unavailable/failure explicit visszajelzest ad. | P1 | required-now | tests |
| CS12 | `src/v11/shared/metaReviewGate/metaReviewGateTypes.ts`, `src/v11/shared/metaReviewGate/metaReviewGateApplyPersistence.ts` | runtime delivery observation types/persistence | gate run -> persisted snapshot | meta-review retained diagnostics seam | Meta-review runtime delivery persisted recordje az uj typed ack boundaryra alignaljon, `execution_id` target mezovel. | P1 | required-now | tests |
| CS13 | `src/types/bubble.ts`, `src/v11/shared/state/stateSchemaMetaReviewRuntime.ts`, `src/v11/infrastructure/state/stateSnapshotInspection.ts`, `src/v11/shared/metaReview/metaReviewSnapshot.ts` | persisted runtime delivery state, validation, inspect normalization | snapshot state -> validated/inspectable state | persisted diagnostics seam | Stored meta-review runtime delivery explicit typed statuszt es `observed_for_execution_id` parityt hordozzon. | P1 | required-now | tests |
| CS14 | `src/v11/shared/status/statusCommandViewProjection.ts`, `src/v11/application/status/statusCliTextRenderer.ts`, `src/v11/application/status/statusCliTableRenderer.ts` | status projections/renderers | state -> view text/table | diagnostics fallout | Status explicit typed ack state-et jelenitsen meg, pane activitytol kulon. | P1 | required-now | tests |
| CS15 | `src/cli/index.ts` | pass/converged/request-rework warning writers | command result -> stderr text | CLI warning seam | Warning text delivery/launch ack terminologyval beszeljen, ne "active pane confirmed" framinggel. | P1 | required-now | tests |

### 2) Data and Interface Contract

| Contract | Current | Target | Required Fields | Optional Fields | Compatibility | Priority | Timing |
|---|---|---|---|---|---|---|---|
| Delivery result contract | `delivered:boolean`, optional `reason` | typed delivery ack result | status, observed_for_execution_id, observed_for_handoff_id, observed_for_round, observed_at | reason_code, message, sessionName, targetPaneIndex | breaking internal contract | P1 | required-now |
| Launch result contract | `sessionName` only | typed launch ack result | status, observed_for_execution_id, observed_for_handoff_id, observed_for_round, observed_at | reason_code, message, sessionName | breaking internal contract | P1 | required-now |
| Meta-review runtime delivery state | `confirmed|uncertain|failed` + handoff/round | typed runtime delivery projection aligned to canonical ack vocabulary | status, observed_for_execution_id, observed_for_handoff_id, observed_for_round, observed_at | reason_code, message | breaking internal diagnostics state | P1 | required-now |
| CLI-facing delivery summary | boolean failure + freeform guidance | typed ack outcome summary | status / routeable outcome | reason text, retry hint | breaking user-facing wording | P1 | required-now |

Normative data rules:

1. A delivery contractnak kulon ki kell tudnia mondani, hogy a runtime befogadta-e a munkat, nem eleg csak azt tudni, hogy a tmux-send lefutott.
2. A launch contractnak kulon ki kell tudnia mondani, hogy a concrete actor/session tenylegesen elindult-e.
3. Ha egy consumer csak delivery boundaryt erint, launch ack mezot nem kotelezo gyartani, de delivery success sem inferalhat launch successet.
4. `observed_for_execution_id` required-now mezove valik minden canonical ack observationben.
5. A retained meta-review persisted state nem maradhat az uj `execution_id` targeteles nelkul, mert az `E1` authority foundationnel ellentmondasba kerulne.

### 2a) L1 Normative Ack Mapping

1. `accepted` = a runtime explicitten befogadta a target executionhoz tartozo munkat.
2. `rejected` = a runtime explicitten elutasitotta a target executionhoz tartozo munkat.
3. `running` = a runtime explicitten elinditotta a concrete actor/session boundaryt.
4. `failed_to_start` = a runtime probalta inditani, de explicitten nem tudta elinditani.
5. `unavailable` vagy ezzel ekvivalens allapot csak akkor megengedett, ha a contract tovabbra is kulon tartja a delivery es launch boundaryt, es nem mossa ossze a fenti minimum statuszokat.

### 3) Side Effects Contract

| Area | Allowed | Forbidden | Notes | Priority | Timing |
|---|---|---|---|---|---|
| Delivery/runtime helpers | typed result shape csere, retry-gating alignment | pilot activation logic | shared boundary only | P1 | required-now |
| Start/resume flow | explicit launch ack threading | workflow state machine redesign a minimalis fallouton tul | retained start ownership marad | P1 | required-now |
| Watchdog/restart fallout | explicit ack-based gating | uj operator policy lane nyitasa | only direct fallout | P1 | required-now |
| Status/CLI text | terminology es projection alignment | broad UX redesign | diagnostics-only change | P1 | required-now |
| Meta-review diagnostics | current stored runtime delivery alignment | full meta-review rollout redesign | retained lane minimal fallout | P1 | required-now |

Constraint:

1. Az `E2` task nem vezethet be role-only kulon ack contractot a meta-review retained lane kedveert.

### 4) Error and Fallback Contract

| Trigger | Dependency (if any) | Behavior (`throw|result|fallback`) | Fallback Value/Action | Reason Code | Log Level | Priority | Timing |
|---|---|---|---|---|---|---|---|
| explicit delivery ack nem bizonyithato | retained tmux delivery | result | explicit unavailable/not-confirmed delivery outcome | `DELIVERY_ACK_UNAVAILABLE` | warn | P1 | required-now |
| runtime explicitten elutasitja a deliveryt | retained delivery producer | result | typed rejected outcome | `DELIVERY_REJECTED` | warn | P1 | required-now |
| session/actor launch nem indul | retained tmux launch producer | result | typed `failed_to_start` outcome | `LAUNCH_FAILED_TO_START` | warn | P1 | required-now |
| pane activity latszik, de nincs explicit ack | status/watchdog/cli consumer | fallback forbidden | keep diagnostics only; no success inference | `PANE_ACTIVITY_NOT_ACK` | warn | P1 | required-now |
| stale targeting: ack mas execution/handoff/round parra mutat | `E1` authority baseline | result | treat as inactive / non-canonical observation | `ACK_TARGET_MISMATCH` | warn | P1 | required-now |
| duplicate masodik signal ugyanarra a current executionre | retained transport retries | result | explicit reject vagy bounded no-op; masodik success tiltott | `ACK_DUPLICATE_SUPPRESSED` | warn | P2 | required-now |

### 5) Dependency Constraints

| Type | Items | Priority | Timing |
|---|---|---|---|
| must-use | `plans/actor-runtime-interface-discovery-and-migration-plan-v1.md` | P1 | required-now |
| must-use | `plans/archive/tasks/actor-runtime-interface-execution-authority-foundation-phaseE1.md` | P1 | required-now |
| must-use | `plans/tasks/actor-runtime-interface-capability-contract-phaseB-draft.md` | P1 | required-now |
| must-use | `plans/tasks/actor-runtime-interface-scenario-simulation-phaseC.md` | P1 | required-now |
| must-use | `plans/tasks/actor-runtime-interface-scenario-simulation-phaseC-matrix.md` | P1 | required-now |
| must-use | `plans/tasks/actor-runtime-interface-migration-spine-phaseD-plan.md` | P1 | required-now |
| must-use | current-tree code evidence: `src/v11/shared/delivery/tmuxDeliveryContract.ts`, `src/v11/infrastructure/channel/tmux/tmuxDeliveryRuntime.ts`, `src/v11/application/start/startCommandTmuxLaunch.ts`, `src/cli/index.ts`, `src/v11/shared/status/statusCommandViewProjection.ts` | P1 | required-now |
| must-not-use | pane-visible activity mint acceptance proof | P1 | required-now |
| must-not-use | boolean-only `delivered` compatibility adapter long-lived canonical contractkent | P1 | required-now |
| must-not-use | implementer pilot activation behavior ebben a taskban | P1 | required-now |

### 6) Test Matrix

| ID | Scenario | Given | When | Then | Priority | Timing | Evidence |
|---|---|---|---|---|---|---|---|
| T1 | pass/converged/request-rework warnings typed ack contractot hasznalnak | delivery result mar nem boolean-only | CLI command result renderelodik | a warning szoveg nem "active pane confirmed" framinget hasznal, es explicit ack-outcome terminologyt ad | P1 | required-now | CLI tests |
| T2 | explicit delivery failure nem lep tovabb watchdogban | pending deferred rework intent + unavailable/rejected delivery outcome | watchdog fut | az intent pending marad es explicit ack-failure reason jelenik meg | P1 | required-now | watchdog tests |
| T3 | explicit accepted delivery alkalmazhatja a pending reworkot | pending deferred rework intent + accepted delivery outcome | watchdog fut | az intent alkalmazodik, a flow tovabblep | P1 | required-now | watchdog tests |
| T4 | start/resume explicit launch ackot ad | fresh vagy resumable bubble | start flow fut | a returned launch result explicit `running` vagy `failed_to_start` boundaryt ad, nem csak session nevet | P1 | required-now | start/restart tests |
| T5 | pane activity nem helyettesiti a canonical ackot | pane mutat activityt, de explicit ack nincs | status/warning path renderel | nincs implicit running/accepted claim | P1 | required-now | status tests |
| T6 | meta-review runtime delivery targetelt marad | persisted runtime delivery mas execution_id/handoff/round parra mutat | status/inspect snapshot olvasodik | az observation inactive/non-canonical lesz | P1 | required-now | state/status tests |
| T7 | restart recovery explicit ack failure utan is uj current executionnel routeolhato | delivery failure vagy missing pane binding tortent | restart/recovery lefut | stale ack nem rebindolodik, uj executionnel marad routeolhato a flow | P1 | required-now | restart tests |
| T8 | duplicate delivery nem hoz letre masodik success truthot | ugyanaz a work item ketszer triggerelodik | delivery/launch boundary consume lefut | masodik signal explicit reject/no-op, de nem masodik accepted/running | P2 | required-now | focused tests |

### 7) Acceptance Summary

1. Az `E2` akkor tekintheto kesznek, ha a current-tree canonical delivery/launch truth mar explicit typed ack boundary, nem boolean delivery confirm.
2. Az `E2` acceptance kotelezo bizonyiteka, hogy a current `execution_id` targeteles minden canonical ack observationben jelen van.
3. Az `E2` acceptance kotelezo bizonyiteka, hogy a status/warning/watchdog/restart surfaces nem inferalnak successet pane activitybol vagy marker-confirmationbol.
4. Az `E2` acceptance nem kovetel implementer pilot activationt, reviewer rolloutot vagy retained adapter cleanupot.
