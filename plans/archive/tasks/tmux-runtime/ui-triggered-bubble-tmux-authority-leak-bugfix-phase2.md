---
artifact_type: task
artifact_id: task_ui_triggered_bubble_tmux_authority_leak_bugfix_phase2_v1
title: "UI-Triggered Bubble Tmux Authority Leak Bugfix (Phase 2)"
status: implementable
phase: phase2
target_files:
  - scripts/ui-server.sh
  - src/v11/application/restart/runRestartFlow.ts
  - src/v11/defaults/start/startBubbleDefaults.ts
  - src/v11/application/start/startCommandTmuxLaunch.ts
  - src/v11/infrastructure/channel/tmux/tmuxManager.ts
  - src/v11/infrastructure/channel/tmux/tmuxRunner.ts
  - tests/core/bubble/startBubble.test.ts
  - tests/core/runtime/tmuxManager.test.ts
  - tests/v11/application/restart/runRestartFlow.test.ts
prd_ref: null
plan_ref: null
system_context_ref: docs/pairflow-initial-design.md
normative_refs:
  - docs/pairflow-initial-design.md
owners:
  - "felho"
---

# Task: UI-Triggered Bubble Tmux Authority Leak Bugfix (Phase 2)

## Current Codebase Check (2026-04-24)

1. A Phase 1 fix utan a UI mar dedikalt tmux socketen fut:
   - current observed UI socket: `pairflow-ui-pf-ui-server`
2. A UI restart bug elso szelete javult:
   - a `scripts/ui-server.sh` mar `env -u TMUX tmux -L <ui-socket>` wrapperrel kezeli a sajat tmux sessionjet
   - a canonical `runTmux()` mar torli a `TMUX` envet
3. Uj, jelenleg reprodukalt hiba maradt:
   - ha egy bubble session korabban eltunik,
   - majd a bubble restart a UI-bol tortenik,
   - az uj bubble tmux session megfigyelt modon a UI tmux socketen jon letre, nem a canonical bubble authority alatt
4. Ennek current-tree operational evidence-je:
   - a UI session `pf-ui-server` a `pairflow-ui-pf-ui-server` socketen fut
   - a `commit-snapshot-p1a-docref` bubble uj runtime sessionje a UI restart utani idoszakban jott letre
   - `tmux -L pairflow-ui-pf-ui-server ls` alatt egyutt latszott a UI session es a bubble session
   - sima `tmux ls` a default socketen `no server running` allapotot adott
5. A UI bubble action path current-tree szerint belso API-hivason megy:
   - `routerActionDispatch.ts` -> `restartBubble`
   - `restartBubble` -> `runRestartFlow`
   - `runRestartFlow` -> `startBubble`
6. A current-tree default local session producer viszont nem a router vagy a restart wrapper, hanem a start default wiring:
   - `startBubbleDefaults.launchBubbleSessionAck` -> `tmuxManager.launchBubbleSessionAck` -> `tmuxRunner.runTmux`
   - ez a canonical shared tmux session materialization seam
7. A `src/v11/application/start/startCommandTmuxLaunch.ts` current-tree shared start seam:
   - local start es remote start is consume-olja
   - remote start current-tree consume familyje: `startCommandRemoteExecution.ts` -> `launchFreshTmuxSession(...)`
   - ebben a taskban ez retained compatibility consumer, nem uj remote owner
8. A bounded problema ebben a fazisban nem altalanos attach redesign, hanem az, hogy a UI-bol inditott bubble `start/restart` nem szivarogtathatja at a UI tmux authorityt a bubble uj sessionjere, mikozben a shared start seam remote consume baseline-ja valtozatlan marad.

## L0 - Policy

### Goal

1. A UI-bol inditott local bubble `restart` utan a bubble tmux session a canonical bubble authority alatt jojjon letre, ne a UI tmux socketen.
2. Ugyanez a szabaly ervenyes maradjon a UI-bol inditott local bubble `start` flowra is, mivel a restart current tree-ben a start pathon keresztul materializalja az uj sessiont.
3. Az attach workflow publikus session-name alapu modellje maradjon valtozatlan.
4. A javitas ne nyisson uj publikus socket/env/config contractot a bubble UX fele.

### In Scope

1. A UI process authority leak megszuntetese a bubble lifecycle child pathok fele.
2. Minimalis shell/runtime wiring, ha a UI Node process inditasi kornyezetet explicit semlegesiteni kell.
3. A UI-bol inditott bubble restart/start path current-tree ownershipenek lezart, implementalt authority-szabalya.
4. Celzott regresszios bizonyitas arra, hogy a UI-bol inditott bubble restart a bubble sessiont nem a UI socket ala hozza letre.

### Out Of Scope

1. Bubble attach command shape vagy session lookup publikus szerzodesenek atalakitas.
2. Socket-aware attach launcher redesign.
3. Stale runtime registry auto-healing vagy reconcile redesign.
4. Bubble state machine/protocol valtoztatas.
5. Remote bubble topology, remote attach vagy remote tmux authority.
6. Remote start/launch semantics vagy remote authority ownership ujraertelmezese.

### Safety Defaults

1. A UI tmux socket csak a UI sajat sessionjet hordozhatja; local bubble session ott nem johet letre.
2. A UI-bol inditott bubble lifecycle muvelet nem kotodhet implicit authoritykent a UI process `TMUX` kornyezetehez.
3. Tiltott fallback:
   - nem eleg azt bizonyitani, hogy a bubble ujra fut; azt is bizonyitani kell, hogy nem a UI socket ala kerult.
4. Tiltott regresszio:
   - a local attach tovabbra is mukodjon a jelenlegi session-name alapu modellen, kulon socket parameter nelkul.
5. A bubble canonical authority ebben a fazisban a meglvo local bubble tmux authority marad; a task nem vezetheti be csendben, hogy a bubble runtime a UI socket resze legyen.

### Contract Boundary / Blast Radius

1. `contract_boundary_override`: `no`
2. Erintett boundary-k:
   - UI process launch environment boundary
   - start default wiring + shared tmux session-materialization boundary
   - tmux spawn-env neutrality source-check boundary
   - local bubble attach compatibility boundary

## L1 - Change Contract

### Target-File Reality Check

1. A `scripts/ui-server.sh` current-tree szerint a UI Node process inditasi authority producer.
2. A `src/v11/application/restart/runRestartFlow.ts` current-tree restart wrapper, amely az uj runtime sessiont a `startBubble(...)` pathon keresztul materializalja.
3. A tenyleges current-tree default local session-materialization ownership current tree-ben a `launchSessionAck` default wiringon ul:
   - `src/v11/defaults/start/startBubbleDefaults.ts`
   - `src/v11/infrastructure/channel/tmux/tmuxManager.ts`
4. A `src/v11/infrastructure/channel/tmux/tmuxRunner.ts` current-tree tmux spawn-env neutrality source-check seam:
   - a `tmuxManager.ts` ezt consume-olja,
   - de a session-materialization ownershiptol kulon current-tree seam marad.
5. A `src/v11/application/start/startCommandTmuxLaunch.ts` current-tree shared start consume/assembly seam, amelyet local start es remote start is hasznal:
   - local owner path: `startBubble(...)`
   - retained compatibility consumer: `src/v11/application/start/startCommandRemoteExecution.ts`
6. A `routerActionDispatch.ts` current tree-ben dispatch layer, nem bizonyitott root-cause owner; ezert nem required-now target ebben a taskban.
7. A `startCommandDefaults.ts` current tree-ben bootstrap shell-spawn es helper boundary; ez optional guard-scope lehet, de nem a primer shared session-materialization owner.
8. A real bounded slice ezert nem altalanos UI router hardening, hanem `UI authority producer + start default wiring + shared session-materialization hardening`, explicit remote consume-family preservation guarddal es retained `tmuxRunner.ts` source-checkkel.

### Control Model

1. `business_invariant`
   - a UI csak operator control plane; a bubble runtime nem valhat a UI tmux authority reszeve.
2. `control_model`
   - UI-bol inditott lifecycle muvelet ugyanazt a canonical bubble authorityt kell hogy hasznalja, mint a nem-UI bubble start/restart.
   - a dispatcher layer nem lehet masodlagos authority source; a tenyleges session-materialization seam ownershipe a start familyben marad.
   - a shared local session producer authorityja a `startBubbleDefaults.launchBubbleSessionAck -> tmuxManager.launchBubbleSessionAck -> tmuxRunner.runTmux` lancban marad; az application start layer ezt csak consume-olja.
3. `read_path_rule`
   - local attach/session resolution tovabbra is a bubble sessionnevhez kotodik, ezert a bubble sessiont a canonical local bubble authority alatt kell materializalni.
4. `forbidden_fallback`
   - tilos a hibat attach oldali socket-aware workarounddal elfedni, ha a bubble session tovabbra is a UI socketen jon letre.
5. `allowed_resolution_path`
   - UI launch env semlegesites es/vagy start default wiring + shared tmux session-materialization hardening, amennyiben current-tree ownership szerint ez szukseges.
6. `missing_data_rule`
   - ha a canonical bubble authority nem erheto el, az restart/start hiba; ez nem legitimalja, hogy a bubble session a UI socketen jojjon letre.

### Baseline Preservation

1. `must_preserve_behaviors`
   - `pnpm ui:start|stop|restart|status` tovabbra is mukodik
   - local bubble attach sessionnev alapu marad
   - bubble restart tovabbra is recovery-friendly marad eltunt elozo tmux session eseten
   - a shared `startCommandTmuxLaunch.ts` remote consume baseline-ja nem reinterpretalodik
2. `forbidden_regression_interpretations`
   - a fix nem jelentheti azt, hogy a UI-bol inditott bubble lifecycle csak UI socket-aware attach mellett mukodik
   - a fix nem nyithat uj bubble config/env kovetelmenyt a felhasznalo fele
   - a fix nem nevezheti at vagy cserelheti le a remote start authority semantics-et local UI authority bugfix cimen
3. `replacement_proof_required_if_removed`
   - ha a UI process authorityjabol, a start default wiringbol vagy a shared tmux producerbol barmilyen implicit tmux oroklest kiveszunk, regresszios bizonyitas kell arra, hogy a bubble restart/session materializacio a canonical bubble authorityn marad

### Authority Fan-out Scan

1. `authority_producer`
   - `scripts/ui-server.sh`
2. `internal_execution_consumers`
   - `src/v11/defaults/start/startBubbleDefaults.ts`
   - `src/v11/application/start/startCommandTmuxLaunch.ts`
   - `src/v11/infrastructure/channel/tmux/tmuxManager.ts`
   - `src/v11/infrastructure/channel/tmux/tmuxRunner.ts`
   - retained compatibility consumer: `src/v11/application/start/startCommandRemoteExecution.ts`
3. `workflow_orchestration_consumers`
   - `runRestartFlow.ts`
4. `read_model_consumers`
   - local attach viselkedes mint retained compatibility consumer:
     `src/v11/shared/attach/resolveAttachBubbleExecution.ts`
5. `cleanup_recovery_consumers`
   - restart recovery path

Verdict:

1. A bounded task shape itt `producer + default-wiring/shared-session-producer boundary + spawn-env neutrality source-check seam + restart_recovery authority hardening`.
2. A shared local producer boundary ket orthogonalis current-tree seamre bomlik:
   - `tmuxManager.ts` ownershipolja a bubble session materialization / launch-ack producer API oldalat
   - `tmuxRunner.ts` ownershipolja a tmux spawn-env neutrality source-check seamet
3. A shared launch seam remote consume-ja current-tree valosag, de ebben a taskban compatibility fence, nem kulon remote activation closure.
4. Az attach contract redesign tovabbra is kulon, nem required-now munka.

### Call-Site Matrix

| ID | File | Contract delta | Priority |
|---|---|---|---|
| CS1 | `scripts/ui-server.sh` | a UI Node process launch kornyezete nem szivarogtathat bubble lifecycle authorityt a UI socket felol | P1 |
| CS2 | `src/v11/defaults/start/startBubbleDefaults.ts` | a default local session producer explicitten a canonical shared `launchSessionAck` authorityt hasznalja UI-triggered start/restart alatt is; a task nem maradhat csak application-layer consume oldalon | P1 |
| CS3 | `src/v11/infrastructure/channel/tmux/tmuxRunner.ts` | a tmux spawn-env neutrality source-checkje required-now; ha a valasztott fix az env-neutralizalast ezen a retegen valtoztatja, akkor a diff ownership itt van | P1 |
| CS4 | `src/v11/infrastructure/channel/tmux/tmuxManager.ts` | a shared `launchBubbleSessionAck` producer a retained tmux spawn-env neutrality mellett sem materializalhat bubble sessiont a UI tmux authority alatt; ez a session-materialization ownership, nem a `tmuxRunner.ts` source-check ownership | P1 |
| CS5 | `src/v11/application/start/startCommandTmuxLaunch.ts` | a shared start seam explicitten a canonical local producerre kotodjon UI-triggered local start/restart alatt, mikozben a remote consume baseline nem reinterpretalodik | P1 |
| CS6 | `src/v11/application/restart/runRestartFlow.ts` | a restart path acceptance proofja a shared start/default-wiring authority boundaryre kotodjon, ne mockolt success route-ra hagyatkozzon | P1 |
| CS7 | `tests/core/runtime/tmuxManager.test.ts` | required-now automated default-path proof kell a shared `launchSessionAck`/tmux producer boundaryre, beleertve a tmux spawn-env hygiene-t | P1 |
| CS8 | `tests/core/bubble/startBubble.test.ts`, `tests/v11/application/restart/runRestartFlow.test.ts` | orchestration-level regresszios bizonyitas kell arra, hogy a start/restart path nem fogad el UI-authority leak eredmenyt canonical successkent | P1 |

Implementation notes:

1. A task nem kotelezi el magat kizarlag egyetlen mechanizmus mellett, de a preferred irany a UI process launch env tovabbi semlegesitese.
2. A `resume` current tree-ben nem session-materialization path; ezert nem required-now target ebben a taskban.
3. Az attach workaround nem elfogadhato substitute; a session materialization authorityt kell javitani.
4. A `tmuxManager.ts` a producer API surface, de a tenyleges tmux spawn-env neutrality source-check seam current tree-ben a `tmuxRunner.ts`; a ket seamet kulon ownershipkent kell kezelni.
5. A `tmuxRunner.ts` current-tree source-checkje required-now, de kodszintu diff csak akkor kotelezo ott, ha a valasztott megoldas tenylegesen az env-neutralizalast ezen a retegen modosítja.
6. Ha a `tmuxRunner.ts` no-delta marad, a PASS evidence explicit review note:
   - a current-tree `runTmux()` tovabbra is torli a `TMUX` envet,
   - es a retained `tests/core/runtime/tmuxManager.test.ts` env-isolation coverage ezt jelenleg is bizonyitja.
7. A `startCommandDefaults.ts` ebben a taskban legfeljebb optional guard-seam; nem szabad a primer shared owner szerepet ra tolni.
8. Ha a regresszios bizonyitas egy shell smoke-ot igenyel az automated default-path coverage mellett, az explicit legyen, ne implicit operatori tudaskent maradjon.
9. Ha a shared `startCommandTmuxLaunch.ts` touched marad, a remote consume branch retained baseline-ja explicit no-reinterpretation guard; a `startCommandRemoteExecution.ts` nem valik required-now targette csak azert, mert ugyanazt a seamet consume-olja.

### Complexity-Risk Triage

1. `risk_score`
   - `5`
2. `split_decision`
   - `single_task_acceptable_with_explicit_remote_consumer_fence`
3. `authority_risk`
   - `2`
4. `surface_spread`
   - `1`
5. `identity_join_risk`
   - `1`
6. `activation_coupling`
   - `0`
7. `prerequisite_risk`
   - `1`
8. `acceptance_multiplicity`
   - `1`
9. `why_no_further_split`
   - a UI launch env hardening, a shared local session producer boundary, es a restart recovery acceptance proof ugyanannak a local authority leaknek a szukseges closure-ja
   - a remote consume branch current-tree szerint ugyanazon shared seam passziv compatibility consume-ja; ettol meg nem lesz kulon remote activation ownership ebben a fazisban

### Data / Interface Contract

| Contract | Current | Target | Required Fields | Optional Fields | Compatibility | Priority | Timing |
|---|---|---|---|---|---|---|---|
| UI-triggered bubble session authority | UI-bol inditott restart utan a bubble session megfigyelt modon a UI tmux socketen johet letre | a bubble session canonical local bubble authorityn jon letre, nem a UI tmux socketen | canonical local bubble session materialization through the default `launchSessionAck` producer path | none | local attach compatibility preserve | P1 | required-now |
| Local attach contract | session-name alapu attach | session-name alapu attach marad | bubble sessionnev valtozatlan | none | retained baseline | P1 | required-now |

Normative rules:

1. A UI tmux socket alatt local bubble session nem johet letre sikeres bubble restart/start eredmenyekent.
2. A UI-bol inditott local bubble restart ugyanarra a canonical bubble authorityra kell hogy alljon vissza, mint a nem-UI inditas.
3. A fix nem oldhatja meg a problemat attach oldali kulon socket-parameter bevezetesevel ebben a fazisban.
4. A bubble attach jelenlegi sessionnev alapu modellje valtozatlan marad.
5. A task nem zarhato le, ha a bubble session tovabbra is lathato a UI tmux socketen a restart utan.
6. A required-now canonical proof nem maradhat csak mockolt application-layer start/restart teszt; explicit default producer-path evidence kotelezo.

### Shared Contract Compatibility

1. `current_consumers`
   - UI bubble start/restart path
   - restart recovery path
   - local attach path
2. `additive_vs_breaking`
   - belso authority-hardening; publikus attach contract nem valtozik
3. `alignment_now_or_later`
   - most az authority leak zarasa required-now a start/restart pathon
   - kesobb lehet attach/read-model hardening, ha marad residual issue
4. `retained_compatibility_consumer`
   - `src/v11/application/start/startCommandRemoteExecution.ts` current-tree consume familyje maradjon ugyanazon shared launch seam passziv kompatibilitasi consumerenek; nincs uj remote authority contract ebben a taskban

### Precondition And Side-Effect Boundary

1. `validations_before_irreversible_side_effects`
   - UI-triggered local start/restart nem claimelhet canonical success proofot, amig nincs bizonyitva, hogy az uj bubble session a canonical local bubble authority alatt materializalodott
   - ha a shared `startCommandTmuxLaunch.ts` seam touched, a remote consume baseline nem reinterpretalodhat local authority fix cimen
2. `required_side_effect_ordering`
   - a restart current-tree sorrendje megmarad: recovery marker persist -> elozo tmux terminate -> runtime session remove -> `startBubble(...)`
   - a stale-session claim/remove/reclaim ordering tovabbra is a retained start-session path ownershipje; a task ezt rely-on boundarykent kezelheti, de nem redesignolja
3. `forbidden_early_side_effects`
   - nincs `running` / canonical success, ha az authority bizonyitas szerint a session a UI socket alatt jon letre vagy a canonical local authority nem feloldhato
   - nincs attach oldali socket-aware workaround mint acceptance substitute
   - nincs remote launch semantics mutacio pusztan a shared seam touched volta miatt
4. `invalid_precondition_behavior`
   - UI-authority contamination vagy canonical local authority hianya start/restart hibava fajul; fail-closed eredmeny kell, nem degraded success
   - ha contamination csak launch-kiserlet utan eszlelheto, a task legfeljebb a transient contaminated runtime artifact fail-closed eltavolitasat ownershipolja; attach contractot, remote authority semantics-et vagy state-machine jelentest nem valtoztathat
5. `coordination_primitives`
   - retained `claimSession/removeSession` choreography reuse-olheto
   - uj coordination/serialization primitive nincs required-now scope-ban

### Closure Budget

1. `touched_closures`
   - `authority_producer`
   - `internal_execution_consumers`
   - `cleanup_recovery_consumers`
2. `intentionally_collapsed`
   - UI launch env, retained tmux spawn-env neutrality source-check, es a start-side session materialization ugyanannak a leaknek egymasra epulo current-tree seamjei, ezert egy taskban tarthatoak
3. `explicitly_deferred`
   - attach redesign
   - stale registry self-healing
   - full socket-aware runtime session schema

### Bounded Task Shape

1. `primary_shape`
   - `authority_producer`
2. `secondary_shape`
   - `consumer_family_alignment`
3. `shape_fit`
   - `single_task_acceptable`
4. `why_primary_shape_is_safe`
   - ugyanaz a local authority leak kapcsolja ossze a UI launch env producer oldalat a shared local session materialization seam-mel
   - a start/restart acceptance proof ugyanennek a local leaknek a closure-ja, nem kulon workflow redesign
5. `why_secondary_shape_is_safe`
   - a restart/start orchestration consumer family csak annyiban touched, hogy a retained recovery path nem fogadhat el UI-authority leakelt sessiont canonical sikerkent
   - ez nem nyit kulon stale-registry, attach vagy remote recovery ownershipet

### Test Matrix

| ID | Scenario | Given | When | Then | Priority | Timing | Evidence |
|---|---|---|---|---|---|---|---|
| T1 | shared default producer proof | default `launchSessionAck` producer path hasznalatban van | tmux launch proof fut | a shared producer es a retained tmux spawn-env neutrality source-check nem a UI socket alatt materializal bubble sessiont | P1 | required-now | automated test, vagy no-delta esetben explicit source-check note + retained env-isolation test reference |
| T2 | UI-triggered restart authority leak closed | UI process authority present es bubble session hianyzik | UI-bol restart fut | az uj bubble session nem a UI socket alatt jon letre, es a proof explicitten a default producer-pathra kotott | P1 | required-now | automated plus scripted evidence |
| T3 | UI-triggered start authority leak closed | UI process authority present es bubble meg nincs futtatva | UI-bol start fut | a bubble session canonical bubble authorityn jon letre, es a proof explicitten a default producer-pathra kotott | P1 | required-now | automated or scripted evidence |
| T4 | local attach baseline preserved | sikeres UI-bol inditott restart vagy start utan bubble session el | attach fut | az attach a sessionnev alapu retained modellen mukodik | P1 | required-now | manual or scripted smoke |
| T5 | UI socket purity | UI fut a sajat dedikalt socketen | bubble restart/start lefut UI-bol | a UI socket only UI sessiont tartalmaz | P1 | required-now | scripted evidence |
| T6 | restart recovery retained | elozo tmux/runtime ownership mar hianyzik | restart fut | a recovery tovabbra is mukodik, de nem UI-authority leakelt sessionnel | P1 | required-now | automated test |
| T7 | shared remote consume baseline preserved | a shared `startCommandTmuxLaunch.ts` seam touched | existing remote start consume path compile/test baseline-je ellenorzodik | nincs uj remote authority reinterpretacio vagy UI-socket fallback a remote consume pathon | P2 | required-now if shared seam touched | existing automated baseline or explicit no-delta proof |

### Dependency Constraints

| Type | Items | Priority | Timing |
|---|---|---|---|
| must-use | UI authority leak explicit megszuntetese | P1 | required-now |
| must-use | retained local attach contract preserve | P1 | required-now |
| must-not-use | UI-socketes bubble session elfogadasa mint sikeres restart | P1 | required-now |
| must-not-use | remote start authority reinterpretacio local UI bugfix cimen | P1 | required-now |
| must-not-change | publikus attach command shape | P1 | required-now |

## Review Control

1. A review ne fogadja el workaroundnak, hogy a bubble session UI socketen jon letre, csak az attachot tesszuk socket-aware-re.
2. A review ne nyisson teljes socket-aware runtime session schema refactort ebben a taskban.
3. A review ne kenyszeritse bele a stale registry auto-healinget ebbe a fazisba.
4. A review ne huzza vissza a dispatch-layer targeteket, ha a current-tree session-materialization ownership a start familyben marad.
5. A task csak akkor zarhato, ha a UI-triggered start/restart utan a bubble session topologiaja tenylegesen canonicalis.
6. A review ne fogadjon el pusztan mockolt start/restart orchestration proofot a shared producer-path evidence helyett.
7. A review kezelje kulon seamkent a `tmuxRunner.ts` spawn-env neutrality source-checket es a `tmuxManager.ts` session-materialization ownershipet.
8. A review ne hagyja ki a `tmuxRunner.ts` source-checket; kodszintu diffet ott csak akkor kerjen required-now, ha a valasztott fix tenylegesen azt a reteget modosítja.
9. Ha a `tmuxRunner.ts` no-delta marad, a review fogadja el PASS evidence-kent az explicit source-check note-ot + a retained env-isolation test reference-t.

## Spec Lock

Task allapot `IMPLEMENTABLE`, ha:

1. a UI-bol inditott local bubble `restart/start` nem hozza letre a bubble sessiont a UI tmux socket alatt,
2. a local attach retained session-name alapu modellje valtozatlanul mukodokepes marad,
3. a fix nem tereli at a megoldast attach oldali workaroundra,
4. a `tmuxRunner.ts` spawn-env neutrality source-checkje es a `tmuxManager.ts` session-materialization ownershipe kovetkezetesen, nem egymas helyett van leirva,
5. a stale registry/read-model kovetkezmenyek tovabbra is kulon follow-up scope-ban maradnak.
