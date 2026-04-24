---
artifact_type: task
artifact_id: task_actor_runtime_interface_opportunity2_task4_topology_neutral_launch_executor_contract_foundation_v1
title: "Actor Runtime Interface Opportunity 2 Task 4: Topology-Neutral Launch/Executor Contract Foundation"
status: implementable
phase: post-phaseE
target_files:
  - src/v11/shared/ports/tmuxSessions.ts
  - src/v11/infrastructure/channel/tmux/tmuxManager.ts
  - src/v11/defaults/start/startBubbleDefaults.ts
  - tests/core/runtime/tmuxManager.test.ts
  - tests/core/bubble/startBubble.test.ts
  - tests/v11/application/start/startCommandOrchestration.test.ts
  - tests/contracts/v11/start.contract.runner.ts
prd_ref: null
plan_ref: plans/actor-runtime-interface-post-phaseE-successor-plan-v1.md
system_context_ref: docs/pairflow-initial-design.md
owners:
  - "felho"
---

# Task: Actor Runtime Interface Opportunity 2 Task 4: Topology-Neutral Launch/Executor Contract Foundation

## Current Codebase Check (2026-04-18)

1. A canonical launch ack truth current-tree szinten mar letezik, de retained `tmux` naminggel:
   - `src/v11/shared/ports/tmuxSessions.ts`
2. A producer-local runtime helper es a retained launch wrapper ugyanabban a `tmux` vocabularyban allitja elo es projekciozza a launch truthot:
   - `src/v11/infrastructure/channel/tmux/tmuxManager.ts`
3. A start defaults seam ma mind a canonical ack producer entrypointot, mind a retained legacy wrappert ugyanebbol a retained `tmux` adapterbol huzza be:
   - `src/v11/defaults/start/startBubbleDefaults.ts`
4. A downstream consumer fan-out mar most tobb consume familyre szorodik szet:
   - start orchestration / retained launch consumer:
     - `src/v11/application/start/startCommandContract.ts`
     - `src/v11/application/start/startCommandOrchestration.ts`
     - `src/v11/application/start/startCommandTmuxLaunch.ts`
   - restart / retained execution helpers:
     - `src/v11/application/restart/**`
   - retained public/default surfaces:
     - `src/index.ts`
     - `src/v11/defaults/metaReviewGate/**`
5. Emiatt az `O2-T4` nem lehet consumer migration task:
   - additive foundation kell,
   - retained `tmux` launch producer parity mellett,
   - a start/restart/public consume-family alignment explicit successor taskban marad (`O2-T5`).

## L0 - Policy

### Goal

1. Vezessunk be topology-neutral launch contract naminget es canonical producer entrypointot additiven, a lezart `running | failed_to_start` truth ujranyitasa nelkul.
2. A retained `tmux` launch adapter alljon at arra, hogy topology-neutral canonical ackot allitson elo, majd ebbol kepezze a retained `tmux` compat es legacy result surface-eket.
3. Ne csusszon be start/restart consumer migration, public/read-model alignment vagy terminate/delete/merge session-surface cleanup ebbe a taskba.

### Domain / Control Model Summary

1. Business invariant: a launch acceptance truth topologytol fuggetlen marad; a canonical outcome tovabbra is `running | failed_to_start`, nem `tmux` session/pane observability vagy legacy result projection.
2. Control model: a launch producer seam ownershipolja a canonical topology-neutral ack truthot; a retained `tmux` adapter es a current legacy result surface csak ebbol derivalt compat retegek lehetnek.
3. Read-path rule: a canonical launch ack csak a current launch producer authority-lancbol kepezheto:
   - workspace authority validation,
   - bubble session-name resolution,
   - direct `tmux has-session` precondition check,
   - session layout launch,
   - pane seed/bootstrap execution.
4. Forbidden fallback:
   - a retained `LaunchBubbleTmuxSessionResult.sessionName` nem lehet canonical success truth;
   - a start orchestration legacy bridge nem nevezheto ki contract ownernek;
   - pane label visibility vagy session-nev jelenlete nem elegendo canonical launch siker bizonyiteknak;
   - a wide consumer fan-out nem huzhato be "ugyis erintett" alapon.
5. Allowed resolution path:
   - topology-neutral type/port/function naming additive modon vezetheto be retained file-okban;
   - a retained `launchBubbleTmuxSession(...)` wrapper megmaradhat compat bridge-kent;
   - a current producer ugyanazokbol a source anchorokbol adhat topology-neutral canonical ackot es legacy derivaciot is.
6. Missing-data rule:
   - hianyzo workspace path, mar letezo session vagy `tmux` command failure eseten canonical `failed_to_start` outcome kell;
   - a retained legacy result ezt fail-closed modon kovesse;
   - synthetic `running` ack nem vezetheto be naming-transition miatt.
7. Phase boundary:
   - contract closure: owned here
   - producer closure: owned here
   - internal execution closure: csak producer-local compat bridgeig owned here
   - workflow_orchestration_closure: successor (`O2-T5`)
   - read_model_closure: successor (`O2-T5`)
   - activation_closure: successor (`O2-T5`)
   - cleanup_recovery_closure: successor

### Plan Linkage

1. Parent plan gap closed: az `O2-T1` docs-only boundary note utan az elso implementacios gap a launch lane-ben az, hogy a canonical launch contract topology-neutral naminggel letezzen, mikozben a retained `tmux` producer es a current consumers meg nem migralodnak.
2. Depends on:
   - `plans/actor-runtime-interface-post-phaseE-successor-plan-v1.md`
   - `plans/actor-runtime-interface-topology-neutral-delivery-executor-contract-note-v1.md`
   - `plans/archive/tasks/actor-runtime-interface/actor-runtime-interface-delivery-ack-producer-contract-phaseE2a.md`
3. Unlocks / impacts successors:
   - `O2-T5` launch/executor consume-family alignment
   - retained `tmux` launch wrapper eventual cleanup a consume-family cutover utan
   - retained package-root/public launch export alignment, ha a neutral naminget a shared `v11` export surface-en tul is fel kell huzni
4. Task-list impact:
   - ez az `Opportunity 2` current next bounded implementation slice-a;
   - nem valtja ki az `O2-T1` docs-only artifactot;
   - nem ownershipolja a delivery lane (`O2-T2`, `O2-T3`) vagy a retained terminate consumer family cleanupjat.
5. Inherited validation / exit expectation:
   - az additive topology-neutral launch contract nem torheti a current consumers retained `launchBubbleTmuxSession(...)` consume surface-et;
   - explicit current-consumer inventory kotelezo, mert a shared launch contract tobb consume familyre sugarzik ki;
   - a repo-root/public export surface retained `tmux` namingje csak explicit successor ownership mellett valtozhat;
   - a handoff summary csak shared contract + producer-local bridge closure-t claimelhet.

### Canonical Contract Anchors

1. Source-of-truth anchors:
   - `plans/actor-runtime-interface-post-phaseE-successor-plan-v1.md`
   - `plans/actor-runtime-interface-topology-neutral-delivery-executor-contract-note-v1.md`
   - `plans/archive/tasks/actor-runtime-interface/actor-runtime-interface-delivery-ack-producer-contract-phaseE2a.md`
   - `src/v11/shared/ports/tmuxSessions.ts`
   - `src/v11/infrastructure/channel/tmux/tmuxManager.ts`
   - `src/v11/defaults/start/startBubbleDefaults.ts`
   - `tests/core/runtime/tmuxManager.test.ts`
   - `tests/core/bubble/startBubble.test.ts`
   - `tests/v11/application/start/startCommandOrchestration.test.ts`
2. Canonical elements:
   - launch ack status tokens: `running | failed_to_start`
   - launch failure reason tokens: `workspace_required | session_exists | tmux_command_failed`
   - launch ack reason-code tokens: `LAUNCH_ACK_WORKSPACE_REQUIRED | LAUNCH_ACK_SESSION_EXISTS | LAUNCH_ACK_TMUX_COMMAND_FAILED`
   - topology-neutral canonical launch ack/input/port naming, retained semantics valtozatlanul
3. Guard elements:
   - workspace-path validation
   - `tmux has-session` precondition
   - session-layout creation
   - pane seed/bootstrap dispatch
4. Compat elements:
   - `LaunchBubbleTmuxSessionAck*` nomenklatura retained alias/re-export statuszban
   - `LaunchBubbleTmuxSessionResult`
   - `launchBubbleTmuxSession(...)`
   - `projectLegacyLaunchPortToAckPort(...)` retained consumer bridge
5. Closed terms:
   - `running`
   - `failed_to_start`
   - `LAUNCH_ACK_WORKSPACE_REQUIRED`
   - `LAUNCH_ACK_SESSION_EXISTS`
   - `LAUNCH_ACK_TMUX_COMMAND_FAILED`
   - `sessionName`
6. Forbidden reinterpretations:
   - a topology-neutral rename nem valtoztathatja meg a status- vagy reason-tokeneket;
   - a retained `tmux` alias nem nevezheto at canonical truth-ra, ha a neutral export mar letezik;
   - a legacy `sessionName` result nem lehet canonical source, csak projection;
   - a consumer migration hianya nem igazol breaking contract valtozast.
7. `drift_status`: `no_unauthorized_drift`

### Scope Reality / Shape Proof

1. Inspected entrypoints / call-sites:
   - `src/v11/shared/ports/tmuxSessions.ts`
   - `src/v11/infrastructure/channel/tmux/tmuxManager.ts`
   - `src/v11/defaults/start/startBubbleDefaults.ts`
   - `src/v11/application/start/startCommandContract.ts`
   - `src/v11/application/start/startCommandOrchestration.ts`
   - `src/v11/application/start/startCommandTmuxLaunch.ts`
   - `tests/core/runtime/tmuxManager.test.ts`
2. Actual touched scope:
   - primary bounded-task shape: `contract_or_persisted_authority_foundation`
   - justified secondary shape: `authority_producer`
3. Mutation entrypoints reviewed:
   - `launchBubbleTmuxSessionAck(...)`
   - `launchBubbleTmuxSession(...)`
4. Producer behavior touched:
   - `yes`
   - a canonical ack builder es a retained wrapper boundary itt valtozik, de a side-effect choreography nem.
5. Fresh/failure branch inventory:
   - workspace path present vs missing
   - session already exists vs absent
   - `tmux has-session` precheck expected failure vs command error
   - layout + pane seed succeeds vs fails
   - canonical ack returned directly vs retained wrapper projects legacy result
6. Why the declared shape matches reality:
   - a shared launch contract es a producer seam ugyanazon bounded launch slice-ban van;
   - a workflow/read-model consumers explicit successor taskban maradnak;
   - uj coordination, cleanup vagy persisted-authority valtozas nem latszik.

### Authority Boundary Map

1. `authority_producer`
   - `launchBubbleTmuxSessionAck(...)`
   - `resolveLaunchBubbleTmuxSessionAck(...)`
   - `launchBubbleTmuxSession(...)`
2. `persisted_authority`
   - `N/A`
   - workspace path es bubble session-name resolution runtime input marad, nem persisted schema closure
3. `internal_execution_consumers`
   - retained `tmux` adapter wrapper
   - `startBubbleDefaults` default seam
4. `workflow_orchestration_consumers`
   - explicit out of scope:
     - `src/v11/application/start/startCommandContract.ts`
     - `src/v11/application/start/startCommandOrchestration.ts`
     - `src/v11/application/start/startCommandTmuxLaunch.ts`
     - `src/v11/application/restart/**`
     - `src/v11/defaults/metaReviewGate/**`
5. `read_model_consumers`
   - explicit out of scope:
     - `src/index.ts`
     - kapcsolodo CLI/UI consume/projection surfaces
6. `cleanup_recovery_consumers`
   - explicit out of scope:
     - stop / delete / merge terminate-session surfaces
7. Export surfaces closed in this phase:
   - topology-neutral launch ack/input/port naming a retained shared surface-en
   - producer-local canonical launch ack entrypoint
   - retained `tmux` alias/re-export + legacy projection boundary

### Baseline Preservation

1. Must-preserve behaviors:
   - a canonical launch truth tovabbra is `running | failed_to_start`;
   - a retained `LaunchBubbleTmuxSessionResult` surface tovabbra is elerheto marad;
   - a `launchBubbleTmuxSession(...)` wrapper tovabbra is legacy resultet ad vissza current consumersnek;
   - nincs session-name-only vagy pane-observability-based synthetic success.
2. Allowed resolution paths:
   - a neutral launch contract ugyanabban a retained contract file-ban is megjelenhet additive modon;
   - a `LaunchBubbleTmuxSessionAck*` exportok lehetnek retained aliasok a neutral contract mellett;
   - a retained wrapper hivhat neutral canonical producer entrypointot, majd projekciozhat legacy resultot;
   - a repo-root/public export surface retained `tmux` naminggel maradhat, amig explicit successor alignment nem ownershipolja.
3. Forbidden regression interpretations:
   - tilos `launchBubbleTmuxSession(...)`-t ebben a taskban torni vagy kivezetni;
   - tilos a start/restart consume helyeket "opportunista" modon atallitani a neutral namingre;
   - tilos a launch contract rename-et delivery lane cleanup-pal vagy generic executor taxonomyval osszemosni.
4. Replacement proof required if removed:
   - a retained `LaunchBubbleTmuxSessionAck*` exportok vagy `launchBubbleTmuxSession(...)` csak az `O2-T5` consume-family alignment parity evidence utan szuntetheto meg;
   - a retained consumer bridge (`projectLegacyLaunchPortToAckPort(...)`) csak akkor torolheto, ha az osszes current consumer explicit neutral ack-port consume-ra allt.

### In Scope

1. Additive topology-neutral launch contract exportok bevezetese a retained shared port file-ban.
2. Additive topology-neutral launch ack port naming bevezetese a retained port file-ban.
3. Producer-local canonical launch ack entrypoint bevezetese a retained `tmux` adapterben.
4. Retained `tmux` compat aliasok/re-exportok es legacy projection boundary fenntartasa.
5. Start default-seam frissitese a neutral canonical launch ack export retained compatibility melletti huzalozasara.
6. Direct runtime + start seam testek frissitese a neutral canonical ack + retained compat parity bizonyitasara.

### Out of Scope

1. Start/restart consume-family alignment vagy dependency contract rename:
   - `src/v11/application/start/**`
   - `src/v11/application/restart/**`
2. Meta-review gate vagy mas retained execution-default consumer alignment.
3. Repo-root/public export surface alignment (`src/index.ts`) vagy mas retained aggregator export.
4. Stop/delete/merge terminate-session consumer family topology-neutralizalasa.
5. Delivery contract vagy delivery consumer family valtoztatas.
6. Generic executor capability registry vagy non-`tmux` topology handshake deklaralasa.

### Safety Defaults

1. A shared contract transition additive-only; breaking exportcsere nem megengedett ebben a taskban.
2. Ha a neutral canonical ack es a retained compat result kozott feszultseg jelenik meg, a neutral canonical ack a source-of-truth, es a retained compat surface ezt fail-closed modon koveti.
3. Ha egy consumer implicit alignment nelkul torne, a task nincs keszen; vissza kell menni decomposition vagy contract-bridge pontositasra, nem szabad csendben consumer migrationt behuzni.
4. A repo-root/public export surface csak akkor vonhato be ebbe a taskba, ha a `target_files` es a call-site matrix ezt explicit ownershipolja; kulonben retained public compat surface marad.

### Contract Boundary / Blast Radius

1. `contract_boundary_override`: `yes`
2. Erintett contract:
   - shared launch contract export naming
   - shared launch ack port naming
   - retained launch adapter canonical-vs-compat bridge boundary

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
   - a shared contract + producer foundation ugyanabban a bounded taskban maradhat;
   - a start/restart/public consume-family alignment explicit successor task (`O2-T5`);
   - a delivery lane explicit kulon predecessor/sibling closure marad (`O2-T2`, `O2-T3`).
10. Identity/join note:
   - canonical identity path: `bubbleId + workspacePath + sessionName resolution + has-session precheck + launch layout + pane seed`
   - competing fallback identities: legacy `sessionName` result, pane labels, orchestration-level inferred running state
11. Authority/source-of-truth note:
   - canonical source: producer-local launch path explicit workspace/precheck/layout/seed truth-a
   - forbidden secondary sources: diagnostics, start summary, wrapper success projection, public export naming
12. Closure-budget triage:
   - closure buckets touched: `authority_producer`, `shared_contract`, `internal_execution_consumers`
   - intentionally collapsed closures: shared contract + producer + producer-local compat bridge, mert ugyanaz a bounded launch slice ownershipolja oket
   - explicitly deferred closures: `workflow_orchestration_consumers`, `read_model_consumers`, `cleanup_recovery_consumers`, `persisted_authority_or_schema`
   - success-claim boundary: ez a task csak neutral launch contract + producer-local bridge closure-t claimelhet

## L1 - Change Contract

### 0) Domain / Control Contract

| Item | Rule | Implementation Consequence | Priority | Timing |
|---|---|---|---|---|
| Business invariant | Launch truth topologytol fuggetlen. | Neutral canonical ack naming bevezetese nem valtoztathat statusz- vagy reason-semantikat. | P1 | required-now |
| Control model | Producer seam owns canonical truth. | Uj neutral producer entrypoint kell; retained wrapper csak projection lehet. | P1 | required-now |
| Read-path rule | Canonical ack csak workspace/precheck/layout/seed authority-lancbol kepezheto. | Nincs session-name-only vagy orchestration-derived success shortcut. | P1 | required-now |
| Forbidden fallback | Consumer fan-out nem oldhato meg breaking exportcserivel. | Additive alias/re-export kotelezo. | P1 | required-now |
| Allowed resolution path | Neutral exports es retained tmux aliases egyutt elhetnek. | Shared port file es producer additive marad. | P1 | required-now |
| Missing-data rule | Hianyzo source truth -> canonical `failed_to_start`. | Legacy result nem jelenthet sikeres launchot canonical `failed_to_start` mellett. | P1 | required-now |
| Phase boundary | Ez foundation task, nem consumer migration. | Downstream call-site atallitas successor taskban marad. | P1 | required-now |

### 0a) Canonical Contract Preservation

| Element | Current Role | Target Role | Preservation Rule | Priority | Timing |
|---|---|---|---|---|---|
| `running | failed_to_start` | canonical launch ack status | canonical launch ack status | tokenek es jelenteseik valtozatlanok maradnak | P1 | required-now |
| `LaunchBubbleTmuxSessionAck*` family | canonical launch ack naming | retained compat alias / re-export a neutral naming mellett | csak naming-level downgrade engedett, semantic downgrade nem | P1 | required-now |
| `LaunchBubbleTmuxSessionResult` | retained legacy consume/result surface | retained compat projection | nem lehet canonical source-of-truth | P1 | required-now |
| `launchBubbleTmuxSession(...)` | retained wrapper for current consumers | retained wrapper a neutral producer entrypoint felett | signature preserved | P1 | required-now |
| `projectLegacyLaunchPortToAckPort(...)` | retained start consume bridge | retained compat bridge a successor consumer cutoverig | nem promotalhato producer authorityva | P1 | required-now |

### 0b) Shared Contract Compatibility

| Shared Contract | Current Consumers Inventory | Change Type (`additive|breaking|N/A`) | This Task Action | Deferred Alignment |
|---|---|---|---|---|
| launch ack/input types a `tmuxSessions.ts` file-ban | start contract/orchestration, tmuxManager, start defaults, runtime tests, start contract tests | additive | neutral canonical launch ack/input exportok hozzaadasa retained tmux aliasokkal | `O2-T5` |
| `LaunchBubbleTmuxSessionAckPort` | start dependency resolution, start defaults, tests | additive | neutral canonical ack port export hozzaadasa retained tmux port mellett | `O2-T5` |
| `LaunchBubbleTmuxSessionResult` | legacy start override bridge, runtime tests | additive / preserved | retained legacy result surface valtozatlanul marad | `O2-T5` |
| repo-root/public launch export surface (`src/index.ts`) | external/public type es helper consumers | preserved retained compat | nincs neutral public export cutover ebben a taskban | explicit successor-owned public alignment |

### 1) Plan Linkage and Successor Impact

| Item | Value | Priority | Timing |
|---|---|---|---|
| Parent plan gap | topology-neutral launch contract + retained producer foundation | P1 | required-now |
| Predecessor dependency | `O2-T1` note lezarta a boundary-nevesitest | P1 | required-now |
| Successor unlocked | `O2-T5` launch/executor consume-family alignment | P1 | required-now |
| Parallel-but-separate sibling | delivery lane (`O2-T2`, `O2-T3`) | P2 | later |
| Explicitly not closed here | start/restart/public consume migration, terminate cleanup, generic executor taxonomy | P1 | required-now |

### 2) Call-Site Matrix

| ID | File | Entry / Surface | Current | Target | Why Here | Priority | Timing | Evidence |
|---|---|---|---|---|---|---|---|---|
| CS1 | `src/v11/shared/ports/tmuxSessions.ts` | shared launch types | only tmux-named canonical launch types + legacy result types | neutral canonical launch ack/input types + retained tmux aliases + retained legacy result types | shared contract closure itt indul | P1 | required-now | code diff |
| CS2 | `src/v11/infrastructure/channel/tmux/tmuxManager.ts` | adapter entrypoint | retained producer es wrapper tmux naminggel | neutral canonical producer entrypoint + retained legacy wrapper | current consumers vedelme mellett neutral seam kell | P1 | required-now | `tests/core/runtime/tmuxManager.test.ts` |
| CS3 | `src/v11/defaults/start/startBubbleDefaults.ts` | default dependency wiring | only tmux-named canonical exports | neutral canonical launch ack export + retained wrapper export egyutt | start seam additive transitionje itt zarhato | P1 | required-now | `tests/v11/application/start/startCommandOrchestration.test.ts` |
| CS4 | `tests/core/runtime/tmuxManager.test.ts` | direct runtime parity tests | tmux-named canonical helper coverage | neutral canonical helper coverage + retained compat parity coverage | foundation without runtime evidence nem claimelheto | P1 | required-now | test diff |
| CS5 | `tests/core/bubble/startBubble.test.ts` / `tests/contracts/v11/start.contract.runner.ts` | retained start seam evidence | tmux-named launch ack seam proofs | retained start seam tovabbra is fail-closed, neutral producer parity mellett | consumer-safe foundation evidence kell | P1 | required-now | test diff |

### 3) Data and Interface Contract

| Contract | Current | Target | Required Fields | Optional Fields | Compatibility | Priority | Timing |
|---|---|---|---|---|---|---|---|
| Canonical launch input | `LaunchBubbleTmuxSessionInput` | additive `LaunchBubbleSessionInput` ugyanazzal a shape-pel | `bubbleId`, `workspacePath`, `statusCommand`, `implementerCommand`, `reviewerCommand` | retained pane-label/bootstrap/message/runner fields | retained tmux inputnev alias/re-export marad | P1 | required-now |
| Canonical launch ack | `LaunchBubbleTmuxSessionAck` | additive `LaunchBubbleSessionAck` | `status` | `sessionName`, `reason_code`, `failure_kind`, `error_message` | retained tmux acknev alias/re-export marad | P1 | required-now |
| Canonical launch ack port | nincs topology-neutral export | `LaunchBubbleSessionAckPort = (input: LaunchBubbleSessionInput) => Promise<LaunchBubbleSessionAck>` | exact signature | `N/A` | retained tmux ack port mellette marad | P1 | required-now |
| Retained legacy result surface | `LaunchBubbleTmuxSessionResult` | valtozatlan retained compat result | `sessionName` | `N/A` | backward-compatible | P1 | required-now |
| Retained wrapper entrypoint | `launchBubbleTmuxSession(input: LaunchBubbleTmuxSessionInput) => Promise<LaunchBubbleTmuxSessionResult>` | valtozatlan signature, neutral producer fele delegal | exact signature preserved | `N/A` | backward-compatible | P1 | required-now |
| Canonical runtime producer entrypoint | nincs topology-neutral runtime export | `launchBubbleSessionAck(input: LaunchBubbleSessionInput) => Promise<LaunchBubbleSessionAck>` | exact signature | runtime deps maradhatnak optional injectionkent | additive | P1 | required-now |
| Repo-root/public export surface | `launchBubbleTmuxSession`, `terminateBubbleTmuxSession` retained naminggel exportalva | retained current naming | existing public aliases | `N/A` | explicit deferred public alignment, not changed here | P2 | later |

### 4) Side Effects Contract

| Area | Allowed | Forbidden | Notes | Priority | Timing |
|---|---|---|---|---|---|
| shared port file | additive exportok es aliasok | consumer importok tomeges atirasa | tisztan interface-szintu valtozas | P1 | required-now |
| retained tmux launch producer | a meglevo workspace validation + has-session precheck + layout + pane seed choreography reuse-ja | uj topology, uj side-effect source, uj diagnostics hack | runtime side-effect viselkedes nem valtozik | P1 | required-now |
| retained wrapper | canonical neutral ackbol legacy projection | breaking wrapper return-shape | wrapper current consumers miatt retained marad | P1 | required-now |
| repo-root/public exports | nincs valtozas ebben a taskban | neutral public export cutover | explicit successor alignmentig retained marad | P1 | required-now |
| tests | direct runtime parity + retained start seam coverage bovitese | start/restart consumer migration tesztek atallitasa | az utobbi `O2-T5` scope | P1 | required-now |

### 5) Error and Fallback Contract

| Trigger | Dependency (if any) | Behavior (`throw|result|fallback`) | Fallback Value/Action | Reason Code | Log Level | Priority | Timing |
|---|---|---|---|---|---|---|---|
| workspace path missing | launch input validation | result | canonical neutral `failed_to_start`; retained wrapper legacy throw/result behavior ugyanebbol a failure truthbol kovetkezzen | `LAUNCH_ACK_WORKSPACE_REQUIRED` | warn | P1 | required-now |
| session already exists | `tmux has-session` precheck | result | canonical neutral `failed_to_start`; retained wrapper fail-closed | `LAUNCH_ACK_SESSION_EXISTS` | warn | P1 | required-now |
| `tmux has-session` command hiba | tmux runner | result | canonical neutral `failed_to_start`; retained wrapper fail-closed | `LAUNCH_ACK_TMUX_COMMAND_FAILED` | warn | P1 | required-now |
| layout or pane-seed command fails | tmux runner | result | canonical neutral `failed_to_start`; retained wrapper fail-closed | `LAUNCH_ACK_TMUX_COMMAND_FAILED` | warn | P1 | required-now |
| neutral-vs-legacy projection cannot be kept coherent | internal mapping | throw | fail closed, do not publish synthetic `running` compat result | `N/A` | error | P1 | required-now |

### 6) Dependency Constraints

| Type | Items | Priority | Timing |
|---|---|---|---|
| must-use | `plans/actor-runtime-interface-post-phaseE-successor-plan-v1.md` | P1 | required-now |
| must-use | `plans/actor-runtime-interface-topology-neutral-delivery-executor-contract-note-v1.md` | P1 | required-now |
| must-use | `plans/archive/tasks/actor-runtime-interface/actor-runtime-interface-delivery-ack-producer-contract-phaseE2a.md` | P1 | required-now |
| must-use | current-tree code evidence: `src/v11/shared/ports/tmuxSessions.ts`, `src/v11/infrastructure/channel/tmux/tmuxManager.ts`, `src/v11/defaults/start/startBubbleDefaults.ts`, `tests/core/runtime/tmuxManager.test.ts`, `tests/core/bubble/startBubble.test.ts`, `tests/v11/application/start/startCommandOrchestration.test.ts` | P1 | required-now |
| must-not-use | start/restart consume-family alignment vagy dependency contract rename | P1 | required-now |
| must-not-use | meta-review gate/defaults consumer cleanup | P1 | required-now |
| must-not-use | repo-root/public export cutover `src/index.ts`-ben | P1 | required-now |
| must-not-use | terminate session consumer family topology-neutralizalasa | P1 | required-now |
| must-not-use | generic executor capability registry vagy non-`tmux` adapter abstraction | P1 | required-now |

### 7) Test Matrix

| ID | Scenario | Given | When | Then | Priority | Timing | Evidence |
|---|---|---|---|---|---|---|---|
| T1 | neutral canonical success | workspace path ervenyes, session nem letezik, layout + pane seed sikeres | neutral producer entrypoint fut | `LaunchBubbleSessionAck.status = running`, es a retained wrapperbol kapott legacy result `sessionName` pontosan ebbol szarmazik | P1 | required-now | `tests/core/runtime/tmuxManager.test.ts` |
| T2 | neutral canonical workspace-required failure | workspace path hianyzik vagy ures | neutral producer entrypoint fut | `LaunchBubbleSessionAck.status = failed_to_start`, `reason_code = LAUNCH_ACK_WORKSPACE_REQUIRED`, es a retained wrapper fail-closed | P1 | required-now | `tests/core/runtime/tmuxManager.test.ts` |
| T3 | neutral canonical session-exists failure | `tmux has-session` mar letezo sessiont jelez | neutral producer entrypoint fut | canonical `failed_to_start` + `LAUNCH_ACK_SESSION_EXISTS`, retained wrapper nem gyart synthetic running eredmenyt | P1 | required-now | `tests/core/runtime/tmuxManager.test.ts` |
| T4 | neutral canonical tmux-failure branch | tmux precheck vagy launch/seed command hibat ad | neutral producer entrypoint fut | canonical `failed_to_start` + `LAUNCH_ACK_TMUX_COMMAND_FAILED`, retained wrapper fail-closed | P1 | required-now | `tests/core/runtime/tmuxManager.test.ts` |
| T5 | retained start seam parity | default start seam vagy contract harness canonical launch ack failuret kap | start flow consume fut | fail-closed retained start viselkedes megmarad, es nem torik attol, hogy a producer neutral naminget is exportal | P1 | required-now | `tests/core/bubble/startBubble.test.ts`, `tests/contracts/v11/start.contract.runner.ts`, `tests/v11/application/start/startCommandOrchestration.test.ts` |

### 8) Baseline Preservation

| Baseline | Must Preserve | Allowed Change | Forbidden Change | Priority | Timing |
|---|---|---|---|---|---|
| canonical launch truth | `running | failed_to_start` semantics | neutral naming export hozzaadasa | status tokenek vagy reason-tokenek modositasa | P1 | required-now |
| retained tmux wrapper | current wrapper signature | neutral producerre valo atkotese | wrapper torese vagy eltavolitasa | P1 | required-now |
| retained legacy result | current result shape | explicit "compat-only" statusz | result shape torese vagy consumer migration idehuzasa | P1 | required-now |
| retained tmux aliasok | re-export / alias statusz | canonical neutral export melletti retained jelenlet | aliasok torlese consume cutover elott | P1 | required-now |

### 9) Closure-Budget Summary

| Item | Value | Priority | Timing |
|---|---|---|---|
| Primary closure now | shared contract + producer foundation | P1 | required-now |
| Collapsed closures | `shared_contract` + `authority_producer` + producer-local compat bridge | P1 | required-now |
| Deferred closures | workflow/read-model consumers, cleanup, terminate-family cleanup | P1 | required-now |
| Why safe | ugyanaz a launch slice owns-olja a neutral contract exportot, a producer canonical ackot es a retained wrapper projectiont | P1 | required-now |

### 10) Precondition and Side-Effect Boundary

| Boundary | Rule | Priority | Timing |
|---|---|---|---|
| Validations before side effects | workspace validation es `has-session` precheck meg kell tortenjen barmilyen launch/layout/seed side effect elott | P1 | required-now |
| Forbidden early side effects | layout creation es pane seed nem indulhat unresolved workspace vagy mar letezo session mellett | P1 | required-now |
| Invalid/precondition-failure behavior | canonical `failed_to_start` + retained legacy fail-closed behavior, synthetic `running` nelkul | P1 | required-now |
| Coordination primitives | nincs uj lock/mutex/idempotency primitive; explicit deferred | P2 | later |

## L2 - Implementation Notes (Optional)

1. [later-hardening] Ha a neutral launch contract naming stabilizalodik, erdemes lehet a retained `tmuxSessions.ts` file fizikai atnevezeset kesobbre kulon cleanup taskban megfontolni, de ez ebben a taskban nem kovetelmeny.
2. [later-hardening] A retained `LaunchBubbleTmuxSessionAck*` aliasoknal erdemes lehet kodszintu "compat" kommentet vagy JSDoc-ot adni, ha ez segiti a kesobbi `O2-T5` consume cutovert.

## Hardening Backlog (Optional)

| ID | Item | Layer | Priority | Timing | Source | Proposed Action |
|---|---|---|---|---|---|---|
| H1 | retained `tmux` launch aliasok kesobbi tisztitasa | L2 | P2 | later-hardening | `O2-T4` drafting | csak `O2-T5` consumer alignment utan |
| H2 | shared launch port file fizikai atnevezese neutral pathra | L2 | P3 | later-hardening | `O2-T4` drafting | kulon cleanup taskban, ha mar nincs retained import pressure |

## Review Control

1. Every finding must include: `priority`, `timing`, `layer`, `evidence`.
2. Ne fogadjunk el olyan implementaciot, amely `O2-T4` cimszo alatt start/restart vagy public/read-model consumer migrationt huz be.
3. A neutral canonical launch ack port es a retained `LaunchBubbleTmuxSessionAckPort` nem csuszhat ossze breaking exportcserive.
4. Ha a retained wrapper csak breaking consumer rewrite mellett tarthato fenn, a task nem implementalhato ebben a scope-ban; vissza kell menni plan/task refinementre.
5. Done-package summary nem claimelhet `O2-T5` closure-t, es nem sugallhatja, hogy a start/restart/public surfaces mar topology-neutral consume-ra alltak.

## Spec Lock

Mark task as `IMPLEMENTABLE` when:

1. additive topology-neutral launch contract naming explicit a shared port surface-en;
2. additive topology-neutral launch ack port explicit a retained shared port file-ban;
3. letezik neutral canonical runtime producer entrypoint, amely `LaunchBubbleSessionAck`-ot ad vissza;
4. a retained `launchBubbleTmuxSession(...)` wrapper es a legacy result surface tovabbra is koherens projectionkent mukodik;
5. direct runtime es retained start seam tesztek bizonyitjak a neutral canonical ack + retained compat parityt;
6. nincs start/restart/public vagy terminate cleanup scope behuzva ebbe a taskba.

## Assumptions

1. A topology-neutral launch naming retained file pathon belul is elfogadhato, ha a semantic ownership explicit.
2. Az `O2-T5` fogja ownershipolni a downstream consumer import/port/result alignmentet.
3. A retained terminate-session family kulon consume/read-model closure maradhat, ha a launch foundation utan ez tovabbra is indokolt.

## Open Questions

1. Nincs blocker-szintu nyitott kerdes a current plan- es code-context alapjan.
