---
artifact_type: task
artifact_id: task_actor_runtime_interface_pilot_cutover_phaseE_v1
title: "Actor Runtime Interface Pilot Cutover Sequencing (Phase E)"
status: completed
phase: phaseE
target_files:
  - plans/actor-runtime-interface-discovery-and-migration-plan-v1.md
  - plans/tasks/actor-runtime-interface-pilot-cutover-phaseE.md
prd_ref: null
plan_ref: plans/actor-runtime-interface-discovery-and-migration-plan-v1.md
system_context_ref: README.md
owners:
  - "felho"
---

# Task: Actor Runtime Interface Pilot Cutover Sequencing (Phase E)

## Current Tree Progress Update (2026-04-15)

1. Az eredeti sequencing proof sorrendje ervenyben maradt, de a current tree kozben mar lezarta az elso harom predecessor closure-t:
   - `E1` execution-scoped authority foundation,
   - `E2a` delivery / launch producer + shared contract closure,
   - `E2b` direct runtime/orchestration consumer alignment.
2. Az `E2b` consume-family alignment a `b72242cc3e63a2316738f5e131f81aefcb0ff4c8` merge-ben zart, es a relevant code/test diff a kickoff, ask-human, pass/converged, watchdog, start/restart seam-eket erinti.
3. Emiatt ez a sequencing artifact current-tree olvasatban mar nem `E1` megnyitasat irja elo kovetkezo aktiv lepeskent, hanem azt rogziti, hogy a remaining open successor mar `E2c`.
4. A sequencing logika ettol nem valtozik: `E2c` tovabbra sem csuszhat vissza producer-contract vagy pilot-activation workbe, es `E3`/`E4` csak utana nyithato.

## L0 - Policy

### Goal

Current-tree sequencing anchor keszitese a discovery utan megmaradt actor-runtime implementation munkahoz ugy, hogy:
1. a stale parent-plan statusz helyere current-state sequencing keruljon,
2. explicit legyen, hogy a fennmarado implementation scope nem viheto egyetlen bundled taskban,
3. a kovetkezo successor taskok boundaryje, sorrendje es ownershipje review-loop nelkul kovetheto legyen.

### Domain / Control Model Summary

1. Business invariant: az `implementer`, `reviewer` es `meta_reviewer` ugyanazon actor-runtime boundaryt kell hogy hasznalja; role-nev alapjan nem maradhat kulon runtime truth vagy special-case lifecycle.
2. Control model: a canonical actor write authority explicit execution-contexthez kotott. A remaining Phase E munka ezt erositi execution-scoped boundaryve; nem uj authorityforrast vezet be.
3. Read-path rule: actor authority, delivery truth es workflow-step allapot csak a canonical state/execution-context + actor-protocol + runtime-ack boundaryrol olvashato.
4. Forbidden fallback:
   - tmux pane-visible activity mint authority truth,
   - prompt/pane-marker mint canonical delivery ack,
   - role-specifikus uj actor API a generic boundary helyett,
   - bundled “do the whole pilot in one task” delivery.
5. Allowed resolution path:
   - a jelenlegi deterministic same-authority path (`state.execution_context` + `handoff_id` + optional guards) preserved baseline marad, amig az explicit replacement boundary megerkezik,
   - restart/recovery explicit uj execution authorityval tovabbra is megengedett,
   - tmux retained topology observability/debug surface maradhat, de nem control source.
6. Missing-data rule:
   - authority hiany vagy mismatch -> fail-closed,
   - explicit delivery/launch ack hiany -> unavailable vagy failed state, nem heuristic success,
   - nincs pane-derived “probably accepted” fallback.
7. Phase boundary:
   - contract closure: successor task `E1`
   - producer closure: successor task `E1`
   - internal_execution_closure: successor task `E2`
   - workflow_orchestration_closure: successor task `E3`
   - read_model_closure: csak minimalis fallout alignment ott, ahol az uj boundary explicit projectiont kenyszerit
   - activation_closure: successor task `E3`
   - cleanup_recovery_closure: successor task `E4`

### Authority Boundary Map

1. Authority producer:
   - `state.execution_context`
   - start/resume mutation pathok
   - actor emit context materialization
2. Stored authority:
   - bubble state snapshot fingerprint
   - execution context mezok
3. In-scope consumers:
   - `src/v11/shared/actorProtocol/actorEmitContext.ts`
   - `src/v11/application/actorProtocol/emitActorProtocolV11.ts`
   - `src/types/protocol.ts`
   - runtime delivery / restart / watchdog consume seams
   - pilot actor rollout guardok
4. Explicit out-of-scope consumers:
   - lezart meta-review cached/public cleanup lane-ek
   - broad docs cleanup a current-tree plan closure felett
   - teljes topology-csere vagy tmux azonnali eltavolitasa
5. Export surfaces closed in this phase: `no`; ez sequencing artifact, nem source/runtime closure task.

### Baseline Preservation

1. Must-preserve behaviors:
   - canonical `pairflow agent emit --kind ...` actor-facing surface,
   - explicit state-derived actor authority fail-closed ellenorzessel,
   - restart/recovery retained operator path, ameddig az uj delivery/ack boundary nem erkezik meg,
   - tmux observability/debug retained szerepe.
2. Allowed resolution paths:
   - current `execution_context` + `handoff_id` + `expected_state_fingerprint` authority path,
   - explicit restart -> uj authority materialization -> canonical actor emit,
   - delivery confirmation csak explicit runtime boundaryrol.
3. Forbidden regression interpretations:
   - a tmux marker-confirmation nem nevezheto at canonical typed acknak implementacios foundation nelkul,
   - a role-specifikus wrapperhalmaz nem tekintheto automatikusan kesz role-neutral cutovernek,
   - a pilot convenience nem igazolhat bundled contract + activation taskot.
4. Replacement proof required if removed:
   - ha a current `execution_context` + `handoff_id` baseline barmely resze kikerul, az uj replacementnek explicit execution-scoped authority proofot kell adnia.

### In Scope

1. A parent plan current-state es statusz frissitese.
2. A remaining implementation split explicit rogzítese.
3. Successor task boundaryk, sorrend es ownership dokumentalasa.
4. A code-read alapjan azonosithato current implementation gapek sequencingre forditasa.

### Out of Scope

1. Barmilyen source/runtime/test implementation.
2. Uj runtime contract vagy CLI path bevezetese.
3. A successor implementation taskok teljes kidolgozasa.
4. Reviewer/meta-reviewer rollout tenyleges specifikacioja az umbrella sequencingen tul.

### Safety Defaults

1. A fennmarado implementation munka egyetlen taskban nem viheto.
2. Az explicit authority foundation meg kell eloze a typed delivery/ack boundary aktivalasat.
3. A typed delivery/ack boundary meg kell eloze az implementer pilot cutovert.
4. A multi-role rollout es retained adapter cleanup csak a pilot utan nyithato.

### Contract Boundary / Blast Radius

1. `contract_boundary_override`: `yes`
2. Erintett contractok:
   - actor input authority contract
   - delivery / launch ack contract
   - pilot activation / rollout sequencing contract

### Complexity Risk Gate

1. `authority_risk`: `2`
2. `surface_spread`: `2`
3. `identity_join_risk`: `2`
4. `activation_coupling`: `2`
5. `prerequisite_risk`: `1`
6. `acceptance_multiplicity`: `2`
7. `risk_score`: `11`
8. `single-task allowed`: `no`
9. Required split:
   - `E1 authority foundation`
   - `E2 delivery / ack boundary`
   - `E3 implementer pilot activation`
   - `E4 reviewer + meta-reviewer rollout / retained adapter cleanup`
10. Identity/join note:
   - canonical identity path: `state.execution_context` -> `ActorEmitContextSnapshot` -> canonical actor emit
   - competing identifiers or fallback identities: tmux pane state, prompt-visible authority, marker-confirmation, actor/role-specific wrapper assumptions
11. Authority/source-of-truth note:
   - canonical source: state/execution-context + canonical actor protocol
   - forbidden secondary sources: tmux pane activity, prompt text, retained role-special-case runtime seams

## L1 - Change Contract

### 0) Domain / Control Contract

| Item | Rule | Implementation Consequence | Priority | Timing |
|---|---|---|---|---|
| Business invariant | Minden role ugyanarra a runtime boundaryre all ra. | Nem maradhat szerep-specifikus special-case activation task a foundation elott. | P1 | required-now |
| Control model | Authority truth explicit execution-contextbol jon. | A sequencing elso lepesenek ezt kell formalizalnia. | P1 | required-now |
| Read-path rule | Ack truth explicit runtime boundaryrol jon, nem tmux-bol. | A typed ack producer closure es a consume-family fallout kulon closure marad. | P1 | required-now |
| Forbidden fallback | Nincs pane-derived authority vagy success fallback. | A pilot task nem epithet heuristic acceptance-re. | P1 | required-now |
| Allowed resolution path | A jelenlegi deterministic same-authority path preserved baseline. | Az E1 replacement csak explicit proof mellett cserelheti le. | P1 | required-now |
| Missing-data rule | Hianyzo authority vagy ack fail-closed / explicit unavailable. | A sequencing nem enged bundled shortcutot. | P1 | required-now |
| Phase boundary | Foundation -> ack producer/contract -> runtime consumer alignment -> persisted/read-model fallout -> pilot -> multi-role cleanup. | A successor split kotelezo. | P1 | required-now |

### 0a) Shared Contract Compatibility

| Shared Contract | Current Consumers | Change Type (`additive|breaking|N/A`) | This Task Action | Deferred Alignment |
|---|---|---|---|---|
| `ActorEmitContextSnapshot` shape | actor emit wrappers, CLI `agent emit` path | breaking successor | sequencing only; foundation task owns change | `E1` |
| `ActorEmitBaseInput` authority fields | canonical actor emit input | breaking successor | sequencing only; foundation task owns change | `E1` |
| tmux delivery confirmation contract | delivery runtime, restart/watchdog fallout | breaking successor | sequencing only; typed ack split explicit | `E2` |
| pilot actor routing and activation | implementer flow first | additive then cleanup | sequencing only | `E3` |
| reviewer/meta-reviewer retained adapter cleanup | rollout / cleanup consumers | breaking successor | sequencing only | `E4` |

### 0b) Baseline Preservation

| Current Behavior | Preserve/Replace/Forbid | Required Proof | Priority | Timing |
|---|---|---|---|---|
| `state.execution_context`-alapu canonical actor authority | preserve until explicit replacement | successor foundation task explicit replacement proof | P1 | required-now |
| tmux marker-confirmation mint best-effort runtime confirmation | preserve csak observability/runtime adapterkent | successor ack task explicit typed-boundary replacement proof | P1 | required-now |
| role-specific wrapper layer (`implementerPilotActorProtocolV11`, `reviewerActorProtocolV11`, `metaReviewerActorProtocolV11`) | replace fokozatosan | pilot es rollout tasks explicit parity evidence | P1 | required-now |

### 0c) Sequencing / Successor Split

| Step | Successor File | Dominant Boundary | Why it must be separate | Must not include |
|---|---|---|---|---|
| `E1` | `plans/archive/tasks/actor-runtime-interface-execution-authority-foundation-phaseE1.md` | execution-scoped authority contract | A canonical authority shape formalizalasa megelőzi az osszes consume/activation munkat. | delivery/ack activation, pilot rollout |
| `E2a` | `plans/archive/tasks/actor-runtime-interface-delivery-ack-producer-contract-phaseE2a.md` | typed delivery / launch producer + shared contract closure | A runtime acceptance truth producer seamje kulon closure; ezt nem szabad consumer rollouttal vagy pilot aktivalassal osszecsomagolni. | runtime/orchestration consume fallout, persisted diagnostics, implementer pilot |
| `E2b` | `plans/tasks/actor-runtime-interface-direct-runtime-orchestration-consumer-alignment-phaseE2b.md` | direct runtime/orchestration consumer alignment | A lezart typed ack contract consume-family atallasa kulon compatibility closure; ezt nem szabad a producer semanticszel vagy read-model fallouttal osszemosni. | producer semantics reopen, persisted diagnostics/read-model fallout, implementer pilot |
| `E2c` | `plans/tasks/actor-runtime-interface-persisted-diagnostics-meta-review-read-model-fallout-phaseE2c.md` | persisted diagnostics + meta-review + read-model fallout | A persisted/projection/status fallout kulon read-model closure; itt mar nem szabad uj ack truthot definialni. | producer contract ujranyitasa, implementer pilot, multi-role cleanup |
| `E3` | `plans/tasks/actor-runtime-interface-implementer-pilot-cutover-phaseE3.md` | implementer pilot rollout | Az elso aktivacio kulon parity gate-et igenyel a stabil foundation + ack closurek folott. | reviewer/meta-reviewer rollout, full adapter cleanup |
| `E4` | `plans/tasks/actor-runtime-interface-reviewer-meta-rollout-and-adapter-cleanup-phaseE4.md` | multi-role rollout + retained cleanup | A policy-heavy role-ok es a retained adapter cleanup csak a pilot utan vedheto. | uj authority foundation vagy uj ack contract |

Normative sequencing rules:

1. `E1` merge nelkul `E2a` nem nyithato implementacios taskkent.
2. `E2a` merge nelkul `E2b` nem owns-olhat consume-family alignmentet canonical truth claim mellett.
3. `E2b` merge nelkul `E2c` nem allithat persisted/meta-review/status closuret lezart runtime boundaryre hivatkozva.
4. `E2c` merge nelkul `E3` csak historical spike lehetne, canonical pilot nem.
5. `E3` merge nelkul `E4` nem nyithat retained cleanupot role-neutral completion claim mellett.
6. Ha current-tree implementation kozben minimalis status/diagnostics fallout jelenik meg, azt az eppen aktiv successor task owns-olja, nem uj bundled cleanup task.

### 0d) Sequencing Simulation

| Simulation ID | Starting Point | Attempted Move | Expected Result | Why this proves the split |
|---|---|---|---|---|
| `SIM1_HAPPY_PATH` | current tree: state-derived authority, tmux delivery confirm, no typed ack boundary | `E1 -> E2a -> E2b -> E2c -> E3 -> E4` sorrendben haladunk | minden lepes a kovetkezo egyetlen valos blokkolo prereqjet zarja le: authority -> producer ack truth -> consume-family alignment -> persisted/read-model fallout -> pilot -> multi-role cleanup | Ez a sorrend koveti a current-tree boundary spreadet, es nem kever producer closuret a downstream rollouttal. |
| `SIM2_SKIP_E1` | current tree-ben nincs explicit `execution_id` / emit-capability shape | kozvetlenul `E2a`, `E2b` vagy `E3` nyitas | a task review-loopba csuszik, mert az ack vagy pilot tasknak sajat authority-shape dontest kellene hoznia | Bizonyitja, hogy az authority foundation nem optional hygiene, hanem producer-first prerequisite. |
| `SIM3_SKIP_E2A` | `E1` utan mar van explicit authority shape, de a runtime acceptance meg mindig tmux-confirmation/best-effort | kozvetlen consume-family alignment vagy implementer pilot | a consumer task kenytelen lenne sajat maga definialni, mi szamit `accepted` / `running` truthnak, vagy visszacsuszik pane-derived heuristikara | Bizonyitja, hogy a typed delivery/launch producer boundary kulon closure, nem a consume rollout mellektermeke. |
| `SIM4_BUNDLE_E2A_E2C` | current tree high-risk fan-out | producer contract + persisted/status/meta-review fallout egy taskban | ugyanabban a taskban vitatnank a canonical ack truthot es annak read-model projectionjet | Bizonyitja, hogy a closure-budget gate tiltja a producer + read-model bundled closuret. |
| `SIM5_OPEN_E4_EARLY` | implementer pilot meg nincs parityval lezárva | reviewer/meta-reviewer rollout + retained adapter cleanup korai nyitasa | a task nem tudja kulon valasztani, hogy reviewer/meta-review drift vagy foundation/ack hiba okozza a regressziot | Bizonyitja, hogy a policy-heavy role rollout es a retained cleanup csak a pilot utan vedheto. |

Simulation readout:

1. A current tree-ben a foundation gap es a producer/direct-consume prereq closurek mar nem nyitottak: az explicit `execution_id` authority-shape, a typed delivery/launch ack producer seam es a direct runtime/orchestration consume alignment mar merged.
2. A legerosebb fennmarado nyitott gap ma a persisted diagnostics / meta-review / read-model fallout closure (`E2c`), vagyis az a consume-family, amely mar lezart runtime truthra epulhet, de nem nyithatja ujra a producer semanticszet.
3. Emiatt az elso megmaradt aktivacios lepes tovabbra is csak implementer pilot lehet, es csak azutan, hogy az `E2c` closure mar kulon lezart.
4. Reviewer + meta-reviewer rolloutot a simulation tovabbra is csak `E4`-ben engedi, mert ott mar a piloton bizonyitott foundationre lehet epiteni, nem elmeleti contractra.

### 1) Call-site Matrix

| ID | File | Function/Entry | Exact Signature (args -> return) | Insertion Point | Expected Behavior | Priority | Timing | Evidence |
|---|---|---|---|---|---|---|---|---|
| CS1 | `plans/actor-runtime-interface-discovery-and-migration-plan-v1.md` | current-state / ownership sections | markdown -> markdown | stale Phase E status block helye | A plan lezárja a discoveryt, es az implementation sequencinget erre a taskra horgonyozza. | P1 | required-now | doc diff |
| CS2 | `plans/tasks/actor-runtime-interface-pilot-cutover-phaseE.md` | sequencing anchor | markdown -> markdown | uj task artifact | A remaining implementation split explicit, current-tree code-readre epulo es successor-file szintu legyen. | P1 | required-now | doc diff |

### 2) Data and Interface Contract

| Contract | Current | Target | Required Fields | Optional Fields | Compatibility | Priority | Timing |
|---|---|---|---|---|---|---|---|
| Remaining-work ownership | implicit / stale parent-plan prose | explicit successor split | phase id, boundary, successor artifact, must-not-include | rationale note | docs-only | P1 | required-now |
| Current-tree gap summary | szetszort code evidence | sequencing-ready synthesis | authority gap, ack gap, activation gap, cleanup gap | code refs | docs-only | P1 | required-now |

### 3) Side Effects Contract

| Area | Allowed | Forbidden | Notes | Priority | Timing |
|---|---|---|---|---|---|
| Plan/task docs | frontmatter + sequencing + status cleanup | source/runtime/test edit | docs-only scope | P1 | required-now |

Constraint:

1. Ez a sequencing task nem nyithat implementation commandlistat es nem foglalhatja magaba a successor taskok kodszeletet.

### 4) Error and Fallback Contract

| Trigger | Dependency (if any) | Behavior (`throw|result|fallback`) | Fallback Value/Action | Reason Code | Log Level | Priority | Timing |
|---|---|---|---|---|---|---|---|
| a current-tree code ellentmond a discovery artifacts valamely allitasanak | source read | result | sequencing explicit current-tree first alapon frissul | `CURRENT_TREE_DRIFT_DETECTED` | warn | P1 | required-now |
| a fennmarado scope egy taskba lenne visszacsomagolva | complexity gate | throw | split kotelezo | `PHASEE_BUNDLED_TASK_FORBIDDEN` | error | P1 | required-now |
| valamely successor boundary nem kulonitheto el egyertelmuen | authority fan-out read | result | boundary note explicit out-of-scope listaval maradjon | `PHASEE_BOUNDARY_NEEDS_FOLLOWUP` | warn | P2 | required-now |

### 5) Dependency Constraints

| Type | Items | Priority | Timing |
|---|---|---|---|
| must-use | `plans/actor-runtime-interface-discovery-and-migration-plan-v1.md` | P1 | required-now |
| must-use | `plans/tasks/actor-runtime-interface-capability-contract-phaseB-draft.md` | P1 | required-now |
| must-use | `plans/tasks/actor-runtime-interface-scenario-simulation-phaseC-matrix.md` | P1 | required-now |
| must-use | `plans/tasks/actor-runtime-interface-migration-spine-phaseD-plan.md` | P1 | required-now |
| must-use | current-tree code evidence: `src/v11/shared/actorProtocol/actorEmitContext.ts`, `src/v11/application/actorProtocol/emitActorProtocolV11.ts`, `src/types/protocol.ts`, `src/v11/shared/delivery/tmuxDeliveryContract.ts`, `src/v11/infrastructure/channel/tmux/tmuxDeliveryRuntime.ts`, `src/v11/application/start/startCommandTmuxLaunch.ts` | P1 | required-now |
| must-not-use | stale 2026-04-12 Phase E state claims current-state factkent | P1 | required-now |
| must-not-use | bundled single-task pilot implementation | P1 | required-now |

### 6) Test Matrix

| ID | Scenario | Given | When | Then | Priority | Timing | Evidence |
|---|---|---|---|---|---|---|---|
| T1 | parent plan no longer reports removed surfaces as live current blockers | stale plan top section exists | docs review fut | a current-state summary mar nem allit public `bubble meta-review` vagy live-run residue-t current blockernek | P1 | required-now | doc review |
| T2 | sequencing anchor exists | parent plan item 5 hivatkozik a Phase E taskra | docs review fut | letezik a checked-in `plans/tasks/actor-runtime-interface-pilot-cutover-phaseE.md` artifact | P1 | required-now | doc review |
| T3 | split is explicit | remaining scope authority + ack + pilot + cleanup fan-outot erint | docs review fut | a task explicit `E1, E2a, E2b, E2c, E3, E4` successor splitet ad | P1 | required-now | doc review |
| T4 | current-tree code evidence is reflected | actor wrapper + tmux delivery + missing typed ack ma is current codeben latszik | docs review fut | a sequencing ezeket named current gapskent rogzíti | P1 | required-now | doc review |
| T5 | bundled Phase E task is explicitly forbidden | high-risk scope maradt hatra | docs review fut | a task kimondja, hogy a maradek implementation nem viheto egy taskban | P1 | required-now | doc review |

## L2 - Implementation Notes (Optional)

1. [later-hardening] Ha a successor taskok megnyitasa elhuzodik, erdemes lehet kulon appendixben fagyasztani a current-tree code referenceset commit SHA-val.
2. [later-hardening] Ha a read-model fallout a pilot alatt nagyobbnak latszik, kulon diagnostics-alignment task nyithato `E3` utan.

## Hardening Backlog (Optional)

| ID | Item | Layer | Priority | Timing | Source | Proposed Action |
|---|---|---|---|---|---|---|
| H1 | remaining successor task files explicit kidolgozasa | L2 | P2 | later-hardening | sequencing anchor | Nyisd meg az `E3, E4` taskokat kulon implementable artifactkent, es a lezart `E1`/`E2a`/`E2b`/`E2c` artifactokat current-tree traceability szerint tartsd karban |

## Review Control

1. Every finding must include: `priority`, `timing`, `layer`, `evidence`.
2. Ne fogadjunk el olyan follow-upot, amely a sequencing anchorra hivatkozva megis egy taskban akarja vinni az authority + ack producer + consume fallout + pilot + cleanup scope-ot.
3. A current-tree code-read priorityje magasabb, mint a historical task prose-e.

## Spec Lock

Task allapot `completed`, ha:

1. a parent plan current-state es statusz allitasa current-tree igazsagra van allitva;
2. a Phase E sequencing anchor file checked-in allapotban letezik;
3. az `E1, E2a, E2b, E2c, E3, E4` successor split explicit boundary-kkel es must-not-include guardokkal rogzitett;
4. a sequencing current-tree code evidence-re epul, nem historical stale statuszra.
