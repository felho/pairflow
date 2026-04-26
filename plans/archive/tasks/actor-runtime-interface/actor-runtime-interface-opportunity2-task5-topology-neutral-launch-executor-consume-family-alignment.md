---
artifact_type: task
artifact_id: task_actor_runtime_interface_opportunity2_task5_topology_neutral_launch_executor_consume_family_alignment_v1
title: "Actor Runtime Interface Opportunity 2 Task 5: Topology-Neutral Launch/Executor Consume-Family Alignment"
status: implementable
phase: post-phaseE
target_files:
  - src/v11/application/start/startCommandContract.ts
  - src/v11/application/start/startCommandOrchestration.ts
  - src/v11/application/start/startCommandTmuxLaunch.ts
  - src/index.ts
  - tests/v11/application/start/startCommandOrchestration.test.ts
  - tests/core/bubble/startBubble.test.ts
  - tests/contracts/v11/start.contract.runner.ts
prd_ref: null
plan_ref: plans/actor-runtime-interface-post-phaseE-successor-plan-v1.md
system_context_ref: docs/pairflow-initial-design.md
owners:
  - "felho"
---

# Task: Actor Runtime Interface Opportunity 2 Task 5: Topology-Neutral Launch/Executor Consume-Family Alignment

## Current Codebase Check (2026-04-19)

1. Az `O2-T4` utan a topology-neutral canonical launch contract es producer current-tree szinten mar explicit:
   - `src/v11/shared/ports/tmuxSessions.ts`
   - `src/v11/infrastructure/channel/tmux/tmuxManager.ts`
   - `src/v11/defaults/start/startBubbleDefaults.ts`
2. A canonical producer seam mar kulon exportot ad:
   - `launchBubbleSessionAck(...) -> Promise<LaunchBubbleSessionAck>`
   - a retained `launchBubbleTmuxSessionAck(...)` wrapper ugyanennek compat projectionja
   - a retained `launchBubbleTmuxSession(...)` wrapper legacy result projection marad
3. A start consume-family ugyanakkor current-tree szinten meg mindig retained `tmux` launch vocabularyt fogyaszt canonical consume szerepben:
   - `src/v11/application/start/startCommandContract.ts`
   - `src/v11/application/start/startCommandOrchestration.ts`
   - `src/v11/application/start/startCommandTmuxLaunch.ts`
4. A start orchestrationban a retained bridge ma meg explicit current consumer:
   - `projectLegacyLaunchPortToAckPort(...)`
   - `launchTmuxAck: LaunchBubbleTmuxSessionAckPort`
   Ez mar same-authority bridge, de a consumer contract meg mindig retained naminggel fut.
5. A repo-root/public launch export surface current-tree szinten meg mindig retained `tmux` naminget exportal:
   - `src/index.ts`
   - explicit neutral `LaunchBubbleSession*` vagy `launchBubbleSessionAck` public export current-tree szinten nincs
6. A restart lane current-tree szinten nem kozvetlen launch-ack consumer:
   - `src/v11/application/restart/**` a `startBubble(...)` public/result surface-en keresztul orokli a launch lane-t
   - emiatt az `O2-T5` fo mutation surface a start consume-family + repo-root public export, nem kulon restart producer lane
7. A start API/result surface current-tree szinten csak adjacent read-model context ehhez a closure-hoz:
   - `src/v11/application/start/startCommandApi.ts`
   - itt operator/lifecycle metadata emit es result mapping latszik, de a launch consume contract primary ownershipa nem itt zarul
8. A `metaReviewGate` es a `uiRouter` current-tree reality szerint nem launch contract consumer:
   - `src/v11/defaults/metaReviewGate/**`
   - `src/v11/shared/ports/uiRouter.ts`
   ezek retained `tmux` runtime utility / delivery result vocabularyt fogyasztanak, de nem az `O2-T4` launch ack/input/port consume cutover blokkoloi
9. Emiatt az `O2-T5` current-tree reality alapjan nem producer task es nem altalanos tmux cleanup task:
   - launch consume-family alignment kell,
   - repo-root/public neutral export additiven,
   - retained compat bridge-ek explicit statuszaval,
   - kulon tmux operator/runtime surface rewrite nelkul.

## L0 - Policy

### Goal

1. A topology-neutral canonical launch truth consume-side atallitasa a start/orchestration lane-ben ugy, hogy a direct workflow consumers mar ne a retained `LaunchBubbleTmuxSessionAckPort`-ot tekintsek canonical launch consume contractnak.
2. A retained `launchBubbleTmuxSessionAck(...)` es `launchBubbleTmuxSession(...)` wrapper maradjon explicit compat bridge ott, ahol current override path vagy harness ezt meg igenyli, de ne onallo consumer authoritykent.
3. A repo-root/public launch export surface kapjon topology-neutral launch exportokat additiven, retained `tmux` export parity mellett.
4. Ne csusszon be tmux operator/runtime cleanup, terminate-session family rewrite, vagy a start result operator-facing `tmuxSessionName` field opportunista atnevezese ebbe a taskba.

### Domain / Control Model Summary

1. Business invariant: a launch acceptance truth topologytol fuggetlen marad; a canonical outcome tovabbra is `running | failed_to_start`, nem retained `tmux` portnev vagy legacy result projection.
2. Control model: a canonical producer truth a `launchBubbleSessionAck(...) -> LaunchBubbleSessionAck`; a start consume family ezt a neutral ackot vagy ugyanennek same-authority projectionjat fogyaszthatja, de nem nevezheti ki a retained `tmux` portnevet canonical contract ownernek.
3. Read-path rule: a direct start decision csak ezekbol johet:
   - `LaunchBubbleSessionAck.status`
   - `LaunchBubbleSessionAck.reason_code`
   - `LaunchBubbleSessionAck.failure_kind`
   - `LaunchBubbleSessionAck.sessionName`
   - vagy ennek ugyanazon consume chainben, explicit compatibility projectionkent kepzett retained aliasa
4. Forbidden fallback:
   - `LaunchBubbleTmuxSessionResult.sessionName` mint onallo canonical success source
   - a `projectLegacyLaunchPortToAckPort(...)` bridge mint producer authority
   - repo-root/public retained export naming mint consume-side authority bizonyitek
   - tmux session liveness vagy attach/attachable state mint launch success truth
5. Allowed resolution path:
   - a start consume family internal contractjai atallhatnak `LaunchBubbleSessionAckPort` + neutral namingre
   - a retained `launchBubbleTmuxSessionAck` es `launchBubbleTmuxSession` override seam megmaradhat same-authority compat bridge-kent
   - a repo-root/public export additiven kaphat neutral launch exportokat retained export parity mellett
6. Missing-data rule:
   - explicit `failed_to_start` ack eseten a start lane fail-closed marad
   - consumer helper nem allithat elo synthetic `running` outcome-ot legacy wrapper availability vagy tmux session attachability alapjan
   - ha egy current override path csak retained compat bridge-en keresztul tarthato fenn, a bridge maradjon meg, de ne legyen canonical contract owner
7. Phase boundary:
   - shared contract closure: predecessor (`O2-T4`)
   - producer closure: predecessor (`O2-T4`)
   - internal execution closure: owned here, a start consume-family scope-jaban
   - workflow_orchestration_closure: owned here
   - read_model_closure: owned here, repo-root/public export surface-re szukitve
   - activation_closure: not owned here
   - cleanup_recovery_closure: deferred

### Plan Linkage

1. Parent plan gap closed: az `O2-T4` utan a kovetkezo blokkolo gap az, hogy a start consume-family current-tree szinten meg mindig retained `tmux` launch port naminget fogyaszt, es a repo-root/public export surface sem huzza fel a neutral launch contractot.
2. Depends on:
   - `plans/actor-runtime-interface-post-phaseE-successor-plan-v1.md`
   - `docs/actor-runtime-interface/topology-neutral-delivery-executor-contract-note-v1.md`
   - `plans/archive/tasks/actor-runtime-interface-opportunity2-task4-topology-neutral-launch-executor-contract-foundation.md`
3. Unlocks / impacts successors:
   - retained `tmux` launch compat bridge kesobbi cleanupja, ha mar nincs current consumer rajta
   - esetleges kulon external/public removal task, ha a retained launch exportok tenyleges kivezetese is szukseges lesz
   - `Opportunity 2` lane closure-ja, ha kulon launch cleanup mar nem marad nyitva
4. Task-list impact:
   - ez az `Opportunity 2` current next bounded implementation slice-a
   - nem valtja ki a delivery lane (`O2-T2`, `O2-T3`) closure-jat
   - nem ownershipolja a tmux operator/runtime utility naming cleanupjat
5. Inherited validation / exit expectation:
   - explicit current-consumer inventory kell a start contract/orchestration lane-ben
   - direct start consume places mar a neutral ack truthbol dontsenek
   - repo-root/public export surface additiven kapjon neutral launch exportokat
   - retained compat exportok vagy override seam-ek csak explicit compatibility statuszban maradhatnak

### Canonical Contract Anchors

1. Source-of-truth anchors:
   - `plans/actor-runtime-interface-post-phaseE-successor-plan-v1.md`
   - `docs/actor-runtime-interface/topology-neutral-delivery-executor-contract-note-v1.md`
   - `plans/archive/tasks/actor-runtime-interface-opportunity2-task4-topology-neutral-launch-executor-contract-foundation.md`
   - `src/v11/shared/ports/tmuxSessions.ts`
   - `src/v11/infrastructure/channel/tmux/tmuxManager.ts`
   - `src/v11/defaults/start/startBubbleDefaults.ts`
   - `src/v11/application/start/startCommandContract.ts`
   - `src/v11/application/start/startCommandOrchestration.ts`
   - `src/v11/application/start/startCommandApi.ts`
   - `src/index.ts`
2. Canonical elements:
   - `LaunchBubbleSessionInput`
   - `LaunchBubbleSessionAck`
   - `LaunchBubbleSessionAckPort`
   - `launchBubbleSessionAck(...)`
   - `running | failed_to_start`
   - `LAUNCH_ACK_WORKSPACE_REQUIRED | LAUNCH_ACK_SESSION_EXISTS | LAUNCH_ACK_TMUX_COMMAND_FAILED`
3. Compat elements:
   - `LaunchBubbleTmuxSessionAck*` alias family
   - `LaunchBubbleTmuxSessionAckPort`
   - `LaunchBubbleTmuxSessionPort`
   - `launchBubbleTmuxSessionAck(...)`
   - `launchBubbleTmuxSession(...)`
   - `projectLegacyLaunchPortToAckPort(...)`
4. Guard elements:
   - `assertRunningLaunchAck(...)`
   - start fail-closed reason propagation
   - default dependency resolution precedence
   - contract runner legacy override scenarios
5. Closed terms:
   - `running`
   - `failed_to_start`
   - `sessionName`
   - `LAUNCH_ACK_WORKSPACE_REQUIRED`
   - `LAUNCH_ACK_SESSION_EXISTS`
   - `LAUNCH_ACK_TMUX_COMMAND_FAILED`
6. Forbidden reinterpretations:
   - a retained `LaunchBubbleTmuxSessionAckPort` nem promotalhato vissza canonical launch source-sza
   - a neutral port nem nevezheto egyszeru alias-polishnak, ha a consumer contract tovabbra is retained namingre ul
   - a repo-root/public retained export surface nem torolheto breaking modon current external inventory nelkul
   - a start result `tmuxSessionName` nem keverheto ossze a shared launch ack `sessionName` contract closure-javal
7. `drift_status`: `closed_contract_preserved`

### Scope Reality / Shape Proof

1. Inspected entrypoints / call-sites:
   - `src/v11/application/start/startCommandContract.ts`
   - `src/v11/application/start/startCommandOrchestration.ts`
   - `src/v11/application/start/startCommandTmuxLaunch.ts`
   - `src/v11/application/start/startCommandApi.ts`
   - `src/index.ts`
   - `tests/v11/application/start/startCommandOrchestration.test.ts`
   - `tests/contracts/v11/start.contract.runner.ts`
   - `tests/core/bubble/startBubble.test.ts`
2. Actual touched scope:
   - primary bounded-task shape: `consumer_family_alignment`
   - justified secondary shape: `activation_or_read_model`
3. Mutation entrypoints reviewed:
   - start dependency contract resolution
   - start launch ack assertion path
   - adjacent start result/lifecycle event mapping context
   - repo-root/public export surface
4. Producer behavior touched:
   - `no`
   - a canonical producer baseline inherited from `O2-T4`; a task a consumer contractot es export surfacet allitja at
5. Fresh/failure branch inventory:
   - canonical `running`
   - canonical `failed_to_start`
   - explicit launch-ack failure override
   - legacy wrapper override projection
   - default dependency path
   - repo-root/public neutral export presence retained parity mellett
6. Why the declared shape matches reality:
   - a producer mar lezart
   - a current open work a start consume-familyben es a root export surface-en maradt vissza
   - restart csak kozvetett orokles, nem sajat launch contract consumer lane
   - meta-review gate es uiRouter current-tree szinten nem launch consume blockers

### Authority Boundary Map

1. `authority_producer`
   - `launchBubbleSessionAck(...)`
   - `launchBubbleTmuxSessionAck(...)`
   - explicit predecessor-owned baseline
2. `persisted_authority`
   - `N/A`
   - runtime session/workspace authority nem valtozik ebben a taskban
3. `internal_execution_consumers`
   - `src/v11/application/start/startCommandTmuxLaunch.ts`
   - adjacent inspected context only: `src/v11/application/start/startCommandApi.ts`
4. `workflow_orchestration_consumers`
   - `src/v11/application/start/startCommandContract.ts`
   - `src/v11/application/start/startCommandOrchestration.ts`
   - start contract runner es core start harness
5. `read_model_consumers`
   - `src/index.ts`
   - external/public type-helper export surface
6. `cleanup_recovery_consumers`
   - explicit out of scope:
     - `src/v11/application/restart/**` direct launch contract rewrite
     - stop/delete/merge session cleanup surfaces
7. Export surfaces closed in this phase:
   - start consume-family neutral launch port/ack naming
   - repo-root/public neutral launch export additiven
   - retained override bridge explicit compat statusza

### Baseline Preservation

1. Must-preserve behaviors:
   - a canonical launch truth tovabbra is `running | failed_to_start`
   - a retained `launchBubbleTmuxSessionAck(...)` override seam tovabbra is elerheto marad current tests/overrides szamara
   - a retained `launchBubbleTmuxSession(...)` wrapper tovabbra is legacy result projection marad
   - a start runtime fail-closed reason propagation nem torhet
2. Allowed resolution paths:
   - a start dependency contract atallhat neutral port namingre, retained alias fallback megtartasaval
   - a root export surface additiven kaphat neutral launch exportokat retained parity mellett
   - a contract runner es core tests atallhatnak neutral override namingre, retained override scenario explicit coverage mellett
3. Forbidden regression interpretations:
   - tilos a retained override seam-eket ebben a taskban torni vagy kivezetni
   - tilos tmux operator/runtime utility naming cleanupot opportunista modon idehuzni
   - tilos a start result `tmuxSessionName` operator-facing fieldet breaking modon atnevezni
4. Replacement proof required if removed:
   - retained `LaunchBubbleTmuxSessionAck*` exportok vagy root exportok csak explicit external/public parity evidence utan torolhetok
   - a `projectLegacyLaunchPortToAckPort(...)` bridge csak akkor torolheto, ha az osszes current override/harness neutral ack portot fogyaszt

### In Scope

1. A start consume-family dependency contractjainak atallitasa topology-neutral launch ack/port namingre.
2. A start orchestration default/fallback resolution explicit neutral-first consume sorrendje retained compat bridge mellett.
3. A start launch assertion path es kapcsolodo tests neutral contract consume-jara allitasa.
4. A contract runner es core start harness override seam-jeinek neutral naming alignmentje retained compat parity coverage mellett.
5. A repo-root/public launch export surface additive neutral exportokkal valo kiegeszitese.

### Out of Scope

1. Launch producer vagy shared launch contract tovabbi modositasa:
   - `src/v11/shared/ports/tmuxSessions.ts`
   - `src/v11/infrastructure/channel/tmux/tmuxManager.ts`
   - `src/v11/defaults/start/startBubbleDefaults.ts`
2. Meta-review gate vagy uiRouter launch cleanup.
3. Tmux attach/attachable/operator-facing CLI wording rewrite.
4. Stop/delete/merge terminate-session family topology-neutralizalasa.
5. External/public retained exportok breaking removalja explicit inventory nelkul.
6. Delivery lane vagy generic executor registry valtoztatas.

### Safety Defaults

1. A consume-family transition lehet neutral-first, de nem lehet breaking exportcsere current override paths nelkul.
2. Ha a neutral contract es a retained compat bridge kozott feszultseg jelenik meg, a neutral launch ack marad a source-of-truth.
3. Ha egy public export alignment csak breaking removal mellett lenne elerheto, a retained export maradjon meg explicit compat statuszban.
4. Ha a restart lane-ben csak kozvetett coverage kell, azt test-level parityvel kell bizonyitani, nem kulon restart rewrite-tal.

### Contract Boundary / Blast Radius

1. `contract_boundary_override`: `yes`
2. Erintett contract:
   - start dependency contract naming
   - start orchestration launch-ack consume boundary
   - repo-root/public launch export surface

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
   - a producer/shared contract closure mar lezart `O2-T4`
   - a current open launch lane mar consume-family + repo-root/public export closure-re szukul
   - kulon tmux cleanup task csak akkor nyilik, ha retained export removal mar explicit external compatibility problemma valik

## L1 - Change Contract

### 0) Domain / Control Contract

| Item | Rule | Implementation Consequence | Priority | Timing |
|---|---|---|---|---|
| Business invariant | Launch truth topologytol fuggetlen. | A start lane nem retained portnevbol, hanem neutral ackbol dont. | P1 | required-now |
| Control model | Producer seam mar lezart `O2-T4`. | Itt consume contract alignment tortenik, producer rewrite nem. | P1 | required-now |
| Read-path rule | Start fail/success direct consume a neutral ackrol olvas. | `launchTmuxAck` retained tipusnev nem maradhat canonical consumer boundary. | P1 | required-now |
| Forbidden fallback | Legacy wrapper/result nem lehet canonical consume source. | `projectLegacyLaunchPortToAckPort(...)` csak explicit compat bridge maradhat. | P1 | required-now |
| Allowed resolution path | Neutral-first consume retained compat fallbackkal. | Default dependency resolution elobb neutral exportot fogyaszt, utana retained alias/legacy bridge. | P1 | required-now |
| Missing-data rule | `failed_to_start` marad fail-closed. | StartBubbleError propagation valtozatlanul reason-code alapu marad. | P1 | required-now |
| Public compatibility | Root export surface nem torhet current consumers nelkul. | Neutral launch exportok additive modon menjenek be. | P1 | required-now |

### 0a) Canonical Contract Preservation

| Element | Current Role | Target Role | Preservation Rule | Priority | Timing |
|---|---|---|---|---|---|
| `LaunchBubbleSessionAck` | canonical launch truth | canonical launch truth | tokenek es szemantika valtozatlan marad | P1 | required-now |
| `LaunchBubbleTmuxSessionAckPort` | retained compat alias | retained compat alias | nem lehet visszapromotalni canonical consumer boundaryva | P1 | required-now |
| `launchBubbleTmuxSession(...)` | legacy result bridge | legacy result bridge | signature es fail-closed behavior megmarad | P1 | required-now |
| `tmuxSessionName` a start resultben | operator-facing runtime field | operator-facing runtime field | nem target breaking rename ebben a taskban | P1 | required-now |
| repo-root retained exportok | public compat surface | public compat surface neutral exportok mellett | breaking removal nem megengedett | P1 | required-now |

### 0b) Shared Contract Compatibility

| Shared Contract | Current Consumers Inventory | Change Type (`additive|breaking|N/A`) | This Task Action | Deferred Alignment |
|---|---|---|---|---|
| launch ack/input/port shared contract | start contract/orchestration + tests + root exports | additive consume alignment | start lane neutral consume-ra all, retained alias fallbackkal | explicit retained export removal only later if needed |
| `launchBubbleTmuxSession(...)` legacy wrapper | start overrides + harnessek | additive / preserved | bridge status explicit, consumer authority downgraded | later cleanup only after parity proof |
| repo-root/public launch exports | external type/helper consumers | additive | neutral exportok hozzaadasa retained parityvel | breaking cleanup deferred |

### 1) Plan Linkage and Successor Impact

| Item | Value | Priority | Timing |
|---|---|---|---|
| Parent plan gap | launch consume-family es public export alignment | P1 | required-now |
| Predecessor dependency | `O2-T4` producer/shared contract closure | P1 | required-now |
| Successor unlocked | `Opportunity 2` lane closeout, ha kulon cleanup nem marad | P1 | required-now |
| Explicitly not closed here | tmux utility cleanup, terminate family, external breaking export removal | P1 | required-now |

### 2) Call-Site Matrix

| ID | File | Entry / Surface | Current | Target | Why Here | Priority | Timing | Evidence |
|---|---|---|---|---|---|---|---|---|
| CS1 | `src/v11/application/start/startCommandContract.ts` | start dependency contract | retained `LaunchBubbleTmuxSessionAckPort` / wrapper overrides | neutral launch ack port primary contract + retained compat override path | workflow-orchestration consume contract itt el | P1 | required-now | code diff |
| CS2 | `src/v11/application/start/startCommandOrchestration.ts` | dependency resolution | retained `launchTmuxAck` tipusnev + legacy bridge current-first consume boundary | neutral-first consume boundary retained compat bridge mellett | current canonical consume boundary itt zarhato | P1 | required-now | test diff |
| CS3 | `src/v11/application/start/startCommandTmuxLaunch.ts` | direct launch ack consume | retained ack vocabulary a start assertion pathon | neutral launch ack consume retained stage/fail-closed semantics mellett | direct decision source itt latszik | P1 | required-now | `tests/core/bubble/startBubble.test.ts` |
| CS4 | `src/index.ts` | public launch export surface | retained `launchBubbleTmuxSession` + retained types only | additive neutral launch exportok retained parityvel | root public fallout itt zarhato | P1 | required-now | code diff |
| CS5 | `tests/v11/application/start/startCommandOrchestration.test.ts` | start dependency parity tests | retained-first assertions | neutral-first + retained compat parity assertions | consume-family closure without tests nem claimelheto | P1 | required-now | test diff |
| CS6 | `tests/contracts/v11/start.contract.runner.ts` / `tests/core/bubble/startBubble.test.ts` | harness override paths | retained override naming es fail-closed proofs | neutral override path + retained compat bridge parity | current override/harness path explicit coverage kell | P1 | required-now | test diff |

### 3) Data and Interface Contract

| Contract | Current | Target | Required Fields | Optional Fields | Compatibility | Priority | Timing |
|---|---|---|---|---|---|---|---|
| Start dependency launch ack port | `LaunchBubbleTmuxSessionAckPort` primary | `LaunchBubbleSessionAckPort` primary | canonical ack status/reason fields | `sessionName` | retained alias override path marad | P1 | required-now |
| Start fallback bridge | `projectLegacyLaunchPortToAckPort(...)` running-only bridge | same bridge, explicit compat downgrade mellett | `status`, `sessionName` | `N/A` | preserved | P1 | required-now |
| Public launch exports | retained `LaunchBubbleTmuxSessionInput/Result`, helper export | neutral launch input/ack/helper exportok retained parityvel | exact shared launch contract names | retained aliases | additive | P1 | required-now |

### 4) Implementation Shape

| Item | Value | Priority | Timing |
|---|---|---|---|
| Primary shape | `consumer_family_alignment` | P1 | required-now |
| Secondary shape | `activation_or_read_model` | P1 | required-now |
| Producer touched | `no` | P1 | required-now |
| Coordination hardening | `no` | P2 | later |
| Fail-closed hardening | inherited, not primary | P1 | required-now |

### 5) Validation Matrix

| ID | Scenario | Setup | Expected Result | Priority | Evidence |
|---|---|---|---|---|---|
| T1 | default start dependency resolution | explicit overrides nincsenek | neutral launch ack port lesz a primary consume path | P1 | `tests/v11/application/start/startCommandOrchestration.test.ts` |
| T2 | retained ack compat override | csak retained ack override adott | neutral consume path ugyanazt a fail-closed viselkedest latja | P1 | `tests/core/bubble/startBubble.test.ts` |
| T3 | legacy wrapper override bridge | csak `launchBubbleTmuxSession(...)` override adott | bridge explicit compat pathkent mukodik, nem producer authoritykent | P1 | `tests/contracts/v11/start.contract.runner.ts` |
| T4 | explicit launch ack rejection | canonical `failed_to_start` ack | StartBubbleError reason/failure metadata valtozatlanul fail-closed | P1 | `tests/core/bubble/startBubble.test.ts` |
| T5 | root public export parity | repo-root exportot olvassuk | neutral launch exportok elerhetok retained parity mellett | P1 | code/test diff |

### 6) Baseline Preservation

| Baseline | Must Preserve | Allowed Change | Forbidden Change | Priority | Timing |
|---|---|---|---|---|---|
| canonical launch ack semantics | `running | failed_to_start` | neutral consume naming | token/reason semantics modositasa | P1 | required-now |
| retained override seam | current override behavior | explicit compat statusz | seam torlese current harness parity nelkul | P1 | required-now |
| start fail-closed behavior | StartBubbleError metadata | neutral port naming | fail-open bridge vagy synthetic running | P1 | required-now |
| root public exports | retained elerhetoseg | neutral export hozzaadasa | breaking retained export removal | P1 | required-now |

### 7) Closure-Budget Summary

| Item | Value | Priority | Timing |
|---|---|---|---|
| Primary closure now | workflow-orchestration consume family + repo-root/public export surface | P1 | required-now |
| Producer/shared contract closure | predecessor-owned (`O2-T4`) | P1 | required-now |
| Deferred closures | tmux cleanup, terminate family, external breaking removal | P1 | required-now |
| Why safe | ugyanaz a start consume-family ownershipolja a current falloutot; root export additiv public alignment kulon producer rewrite nelkul zarhato | P1 | required-now |

### 8) Precondition and Side-Effect Boundary

| Boundary | Rule | Priority | Timing |
|---|---|---|---|
| Validations before side effects | a canonical launch ack consume-pathjat es failure-classificationt elobb kell neutral contractra allitani, mint ahogy barmilyen uj result/public export surface erre epulne | P1 | required-now |
| Forbidden early side effects | tilos uj cleanup, attach, lifecycle event, runtime-session vagy tmux utility side effectet bevezetni a neutral consume alignment cimszo alatt | P1 | required-now |
| Invalid/precondition-failure behavior | `failed_to_start` eseten a start lane tovabbra is fail-closed marad; a neutral consume alignment nem lapithatja el a reason-code/failure-kind metadata-t a start assertion pathon | P1 | required-now |
| Existing side-effect boundary preserved | a `bubble_started` lifecycle event es a start result mapping tovabbra is csak a sikeres launch consume utan maradhat; ez adjacent inspected baseline, nem rewrite target ebben a taskban | P1 | required-now |
| Coordination primitives | nincs uj lock/mutex/idempotency primitive; explicit deferred | P2 | later |

## L2 - Implementation Notes (Optional)

1. [later-hardening] Ha a neutral launch exportok root surface-en stabilak, a retained launch exportok explicit JSDoc compat jelolest kaphatnak.
2. [later-hardening] Ha external consumer inventory kesobb indokolja, a retained root exportok kivezetese kulon cleanup taskba menjen.

## Hardening Backlog (Optional)

| ID | Item | Layer | Priority | Timing | Source | Proposed Action |
|---|---|---|---|---|---|---|
| H1 | retained root launch exportok explicit compat jelolese | L2 | P2 | later-hardening | `O2-T5` drafting | JSDoc vagy docs note |
| H2 | legacy launch wrapper eventual removal | L2 | P3 | later-hardening | `O2-T4` + `O2-T5` | csak explicit external parity evidence utan |

## Review Control

1. Every finding must include: `priority`, `timing`, `layer`, `evidence`.
2. Ne fogadjunk el olyan implementaciot, amely producer/shared contract rewrite-ot huz vissza `O2-T5` ala.
3. A neutral start consume boundary es a retained override seam nem csuszhat ossze.
4. Ha a root export alignment csak breaking retained removal mellett lenne tarthato, a task nincs keszen; kulon cleanupra kell bontani.
5. Done-package summary nem claimelhet producer cleanupot vagy tmux operator surface rewrite-ot.

## Spec Lock

Mark task as `IMPLEMENTABLE` when:

1. a start consume-family primary launch contractja neutral namingre all;
2. a retained ack/wrapper override path explicit compat bridgekent megmarad;
3. a direct start fail-closed consume tovabbra is a canonical launch ack truthra ul;
4. a repo-root/public surface additiven exportalja a neutral launch contractot;
5. tests bizonyitjak a neutral-first consume + retained compat parityt;
6. nincs producer rewrite vagy tmux utility cleanup scope behuzva ebbe a taskba.

## Assumptions

1. A restart lane current-tree szinten eleg a `startBubble(...)` inherited parityn keresztul; kulon restart launch contract rewrite nem prerequisite.
2. A repo-root/public neutral export additiv felhuzasa elegendo ehhez a lane-hez; breaking retained export removal nem required-now.
3. A `metaReviewGate` es a `uiRouter` kulon retained tmux utility/delivery lane marad, nem `O2-T5` blocker.

## Open Questions

1. Nincs blocker-szintu nyitott kerdes a current plan- es code-context alapjan.
