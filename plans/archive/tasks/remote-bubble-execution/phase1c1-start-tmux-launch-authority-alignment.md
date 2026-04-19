---
artifact_type: task
artifact_id: task_remote_bubble_execution_phase1c1_start_tmux_launch_authority_alignment_v1
title: "Remote Bubble Execution Start/Tmux Launch Authority Alignment (Phase 1C1)"
status: implementable
phase: phase1c1-start-tmux-launch-authority-alignment
target_files:
  - src/v11/application/start/startCommandApi.ts
  - src/v11/application/start/startCommandOrchestration.ts
  - src/v11/application/start/startCommandFlows.ts
  - src/v11/application/start/startCommandTmuxLaunch.ts
  - src/v11/application/start/startCommandPrompts.ts
  - src/v11/application/start/startCommandImplementerPrompts.ts
  - src/v11/application/start/startCommandResumePrompts.ts
  - src/v11/application/start/startCommandResumeImplementerPrompt.ts
  - src/v11/application/start/startCommandResumeKickoffMessages.ts
  - src/v11/application/start/startCommandResumeKickoffMessageBuilders.ts
  - src/v11/application/start/startCommandResumeFlowPreparation.ts
  - src/v11/shared/command/agentCommand.ts
  - src/v11/shared/command/pairflowCommandBootstrap.ts
  - src/v11/shared/ports/tmuxSessions.ts
  - src/v11/infrastructure/channel/tmux/tmuxManager.ts
  - src/v11/infrastructure/channel/tmux/tmuxManagerSessionLayout.ts
  - tests/core/bubble/startBubble.test.ts
  - tests/core/runtime/agentCommand.test.ts
  - tests/core/runtime/pairflowCommand.test.ts
  - tests/core/runtime/restartRecovery.test.ts
  - tests/core/runtime/tmuxManager.test.ts
  - tests/contracts/v11/start.contract.runner.ts
  - tests/contracts/v11/start.contract.test.ts
  - tests/v11/application/start/startCommandOrchestration.test.ts
prd_ref: null
plan_ref: plans/archive/plans/remote-bubble-execution-contract-and-phasing-plan-v2.md
system_context_ref: docs/pairflow-initial-design.md
owners:
  - "felho"
---

# Task: Remote Bubble Execution Start/Tmux Launch Authority Alignment (Phase 1C1)

## Current Codebase Check (2026-04-12)

1. A Phase 1B2 lezarta a canonical workspace authority producer oldalat, de a start/tmux launch consume retegek ma meg kozvetlenul a static `context.resolved.bubblePaths.worktreePath` erteket olvassak.
2. Ez a kozvetlen olvasas tobb leaf surface-en is jelen van:
   - `startCommandTmuxLaunch.ts` a tmux launch inputban, a status pane commandban es az agent command/startup prompt inputokban,
   - `startCommandPrompts.ts`, `startCommandImplementerPrompts.ts`, `startCommandResumePrompts.ts`, `startCommandResumeImplementerPrompt.ts`, `startCommandResumeKickoffMessages.ts`, `startCommandResumeKickoffMessageBuilders.ts` a command-guidance es kickoff/startup szovegekhez adott pathban,
   - `src/v11/shared/command/agentCommand.ts` a pane-root pinning scriptben ugyanazt a pathot viszi `cd <worktreePath>` ala,
   - `src/v11/shared/command/pairflowCommandBootstrap.ts` ugyanezt a pathot hasznalja `PAIRFLOW_WORKTREE_ROOT`, wrapper dir, wrapper path es local entrypoint root kepzesere,
   - `tmuxManager.ts` es `tmuxManagerSessionLayout.ts` a tmux session/pane `cwd` consume pontjain.
3. A runtime session record mar kepes canonical `workspacePath` / `workspaceKind` authorityt hordozni, de a start/tmux launch path ezt ma meg nem tekinti authoritative consume inputnak sem a tmux `-c`, sem az agent `cd`, sem a Pairflow bootstrap/wrapper root consume-ban.
4. Emiatt a Phase 2A local clone-topology activation tovabbra sem nyithato meg, mert a critical start/tmux consume reteg meg nem valtott at a canonical authority chainre, es ma meg ugyanaz a retained path futhat tovabb tobb kulon executable jelentessel.
5. A plan szerint ez a task csak `internal_consume_alignment`: a fresh/resume tmux launch pathnak canonical workspace consume-ra kell allnia, mikozben a runtime delivery, reviewer-context, bubble-loop es operator read-model consume tovabbra is kesobbi ownership.

## Implementation Target Decision

1. `implementable_now`: `yes`
2. Ez a fazis a producer closure utan kovetkezik, de meg mindig nem activation task.
3. A feladat a start/tmux launch consume explicit atallitasa:
   - a tmux session/pane `cwd`,
   - az agent pane script `cd` rootja,
   - a Pairflow wrapper/bootstrap root (`PAIRFLOW_WORKTREE_ROOT`, wrapper dir/path, local entrypoint root),
   - a status pane command workspace-guidance inputja,
   - a startup/resume/kickoff promptok workspace-guidance inputja
   mar canonical workspace authoritybol jojjon.
4. A task nem nyit clone-success runtimeot, nem veti at a bubble-loop consume csaladot, es nem mozditja az operator-facing read-modelt.

## L0 - Policy

### Goal

Lezarni a start/tmux launch consume reteget ugy, hogy:
1. fresh es resume startban a tmux session/pane launch, az agent pane root es a Pairflow bootstrap/wrapper root ugyanarra a canonical workspace authorityra uljon, amelyet az elozo fazis eloallitott,
2. a leaf launch/prompt/tmux consume pontok ne olvassak tobbet kozvetlen fallbackkent a static `bubblePaths.worktreePath`-ot,
3. a worktree-mode baseline valtozatlan maradjon ott, ahol a canonical authority es a retained bubble path ma ugyanarra az ertekre mutat,
4. a clone-topology tovabbra is fail-closed maradjon.

### Domain / Control Model Summary

1. Business invariant: egy start attempt alatt minden launch-executable consumer ugyanazt a canonical workspace identityt hasznalja a tmux `cwd`-hez, az agent pane `cd` roothoz, a Pairflow bootstrap/wrapper roothoz es a command-guidancehoz; nem lehet kulon status-pane, implementer/reviewer/meta pane vagy kickoff/startup prompt eltero workspace truthon.
2. Control model: Phase 1C1-ben a tmux launch consume authorityja a producer chain altal mar feloldott canonical workspace identity. A leaf consumer nem donthet sajat fallback-sorrendet.
3. Read-path rule: a launch consume az explicit launch inputon vagy egy ugyanazon authority chainen belul dolgozo consume helperen keresztul olvashat canonical workspace pathot; a leaf consumer kozvetlen `context.resolved.bubblePaths.worktreePath` olvasasa tiltott a cutoveren atesett pontokon.
4. Forbidden fallback:
   - a static `bubblePaths.worktreePath` kozvetlen leaf fallbackkent a cutoveren atesett launch surfaces-eken.
5. Allowed resolution path:
   - fresh startban az aktualis attempt canonical workspace identityje explicit launch inputkent tovabbadhato,
   - az API handoff es a flow/launch assembly seam egyszer tovabbviheti ezt az inputot, de a leaf launch/prompt/tmux/agent/bootstrap consumers mar csak a feloldott canonical launch workspace-t kaphatjak meg,
   - resume worktree pathon a consume helper ugyanazon authority chainen belul feloldhatja a canonical workspace pathot a Phase 1B2 producer outputjabol es a worktree-mode retained identitybol,
   - ha egy surface-en a static bubble path tovabbra is szukseges nem-authoritative referenciahoz, azt kulon neven kell hordozni; nem keverheto a launch `cwd`, agent `cd` vagy Pairflow bootstrap root truth-tal.
6. Missing-data rule: ha a start/tmux launch consume pontnak nincs explicit canonical workspace authorityja, a launch fail-closed hibaval alljon meg a tmux session letrehozasa elott; nincs silent fallback a static bubble pathra.
7. Phase boundary: ez `internal_consume_alignment`, azon belul is a start/tmux launch consume closure. Runtime delivery, reviewer-context refresh, bubble-loop consume, activation, operator read-model es cleanup tovabbra is successor task.

### Retained Bubble-Root Reference Rule

1. Phase 1C1 defaultja `no_split`: ha az implementacio nem vezet be kulon retained bubble-root reference mezot, akkor a tovabbvitt `worktreePath` jelentese minden executable launch seam-en canonical launch workspace root.
2. Ez a `no_split` forma akkor elfogadhato, ha ugyanaz a jelentestiszta canonical root megy at:
   - `LaunchBubbleTmuxSessionInput.worktreePath`,
   - tmux `new-session -c` es `split-window -c`,
   - `buildAgentCommand(...worktreePath)` altal generalt `cd <worktreePath>` root,
   - `buildPairflowCommandBootstrap(...worktreePath)` altal kepzett `PAIRFLOW_WORKTREE_ROOT`, wrapper dir/path es local entrypoint root.
3. Ha a Phase 1C1 implementacio megis kulon retained bubble-root referenciat tart meg, az csak explicit kulon mezoneven (`bubbleRootReferencePath`, `displayWorktreePath` vagy ennel egyertelmubb nev) maradhat fent.
4. Retained bubble-root reference csak plain-text, non-executable launch-facing display surface-en engedelyezett:
   - prompt/status/kickoff text, ahol emberi olvashatosag vagy bubble-root traceability a cel,
   - olyan display line, amely nem vezeti vissza a shell/pane/bootstrap rootot.
5. Retained bubble-root reference nem feedelheti:
   - `LaunchBubbleTmuxSessionInput.worktreePath`,
   - tmux `-c`,
   - `buildAgentCommand` `cd` rootjat,
   - `buildPairflowCommandBootstrap` worktree/root inputjat,
   - wrapper dir/path vagy local entrypoint resolutiont.
6. A tasknak explicitten bizonyitania kell, melyik mod valosul meg:
   - `no_split`, vagy
   - `dual_role_split` explicit named retained reference-vel.

### Authority Boundary Map

1. `authority_producer`
   - Phase 1B2 fresh producer result
   - Phase 1B2 resumable worktree authority chain
2. `persisted_authority`
   - runtime session record `workspacePath`, `workspaceKind`
3. `workflow_orchestration_consumers` in scope
   - `startCommandApi.ts` csak a launch input handoff seam szintjen
   - `startCommandOrchestration.ts` dependency/default wiring seam
   - `startCommandFlows.ts` fresh/resume launch input assembly seam
4. `internal_execution_consumers` in scope
   - `startCommandTmuxLaunch.ts`
    - prompt/kickoff builders a start launch pathon
   - `src/v11/shared/command/agentCommand.ts` agent pane root pinning (`cd <worktreePath>`)
   - `src/v11/shared/command/pairflowCommandBootstrap.ts` Pairflow bootstrap/wrapper root (`PAIRFLOW_WORKTREE_ROOT`, wrapper dir/path, local entrypoint root)
   - `tmuxManager.ts`, `tmuxManagerSessionLayout.ts`
5. `read_model_consumers` explicit out of scope
   - status/list/attach projection
   - lifecycle result wording
   - reviewer-context projection
6. `cleanup_recovery_consumers` explicit out of scope
   - cleanup/rollback identity
   - commit/merge/delete cleanup consume

### Baseline Preservation

1. `must_preserve_behaviors`
   - `work_mode=worktree` fresh es resume start tovabbra is sikeres maradjon
   - a tmux panes baseline layout es startup sequencing ne regresszaljon
   - `work_mode=clone` explicit reject maradjon
2. `allowed_resolution_paths`
   - fresh start: same-attempt canonical workspace authority -> launch consume input -> tmux/session/prompt builders
   - resume worktree path: canonical consume helper -> tmux/session/prompt builders
   - worktree-mode retained bubble path csak akkor maradhat jelen, ha explicit ugyanazon authority chain nem-authoritative referenciajakent van nevezve
3. `forbidden_regression_interpretations`
   - a consume cutover nem jelent runtime delivery vagy reviewer-context cutovert
   - a consume cutover nem jelent operator-facing status/list/attach cutovert
   - a consume cutover nem nyithat clone activationt
   - a leaf `worktreePath` hasznalat nem maradhat bent rejtett launch truthkent csak azert, mert worktree mode-ban ma ugyanarra az ertekre esik
4. `replacement_proof_required_if_removed`
   - ha barmely jelenlegi launch/prompt path mar nem kap kulon bubble-root referenciat, bizonyitani kell, hogy a megmarado canonical input eleg minden jelenlegi non-authoritative megjeleniteshez is, vagy a static referencia kulon nevvel retained marad.

### In Scope

1. A fresh es resume start launch input explicit canonical workspace consume-ja, az API handoff es a tenyleges flow/launch assembly seamre kotve.
2. A tmux session/pane `cwd` consume atallitasa canonical workspace authorityra.
3. Az agent pane script root (`cd <worktreePath>`) atallitasa canonical launch workspace authorityra.
4. A Pairflow bootstrap/wrapper root (`PAIRFLOW_WORKTREE_ROOT`, wrapper dir/path, local entrypoint root) consume atallitasa canonical launch workspace authorityra.
5. A status pane command es a startup/resume/kickoff prompt builders workspace-guidance inputjanak canonical consume-ra allitasa, illetve retained bubble-root reference eseten explicit non-executable referencia-rule adasa.
6. A start launch call-siteok olyan additiv vagy egyertelmu interface-alakitasa, amely szetvalasztja a canonical launch workspace truth-ot a retained static bubble-root referenciatol, ha ugyanazon seam ma mindkettot `worktreePath` neven keveri.
7. A fenti consume szabalyok tesztjei fresh, resume, missing-authority es dual-role divergence helyzetekben.

### Out of Scope

1. `src/v11/infrastructure/channel/tmux/tmuxDeliveryRuntime.ts`
2. `src/v11/infrastructure/channel/tmux/reviewerContext.ts`
3. `pass`, `converged`, `askHuman`, `meta_review_result`
4. status/list/attach operator read-model
5. cleanup/rollback consume
6. barmilyen clone-success activation
7. remote start/write/read surfaces

### Safety Defaults

1. Ha a canonical launch workspace consume nem oldhato fel egyertelmuen, nincs tmux launch.
2. A task csak internal launch consume-t zár; nincs user-facing success semantics valtozas.
3. A worktree-mode retained path csak explicit, non-authoritative referencia lehet; nem lehet implicit leaf fallback, es nem lehet executable root a tmux `-c`, agent `cd` vagy Pairflow bootstrap root alatt.
4. A clone preflight reject erintetlen retained prerequisite.

### Contract Boundary / Blast Radius

1. `contract_boundary_override`: `yes`
2. Erintett contractok:
   - start/tmux launch consume interface
   - agent pane root contract
   - Pairflow bootstrap/wrapper root contract
   - prompt/status command workspace input contract
   - tmux launch port cwd semantics
   - start launch assembly handoff seam az api/flow/launch boundaryn
3. Phase ownership anchor:
   - Phase 1C1 csak a start/tmux launch consume familyt owns-olja
   - Phase 1C2 ownershipa runtime delivery/reviewer-context consume
4. Fan-out note:
   - ugyanaz a canonical authority tovabbi consume csaladokhoz is eljut majd, de ebben a taskban csak a launch family all at.

### Complexity Risk Gate

1. `authority_risk`: `1`
2. `surface_spread`: `1`
3. `identity_join_risk`: `2`
4. `activation_coupling`: `0`
5. `prerequisite_risk`: `1`
6. `acceptance_multiplicity`: `1`
7. `risk_score`: `6`
8. `single-task allowed`: `yes`
9. If `no`, required split:
   - `N/A`
   - `N/A`
   - `N/A`
10. Identity/join note:
   - a launch consume correctness most azon mulik, hogy a canonical workspace authority es a retained bubble path azonos authority chainen maradjon, de a leaf consumers ne keverjek ossze a ket szerepet
11. Authority/source-of-truth note:
   - Phase 1C1-ben a canonical workspace authority mar adott; a kockazat nem uj producer, hanem a leaf consume pontok fallbackja

## L1 - Change Contract

### 0) Domain / Control Contract

| Item | Rule | Implementation Consequence | Priority | Timing |
|---|---|---|---|---|
| Business invariant | Minden launch-executable consumer ugyanazt a canonical workspace identityt hasznalja. | Nem maradhat kulon truth a tmux sessionnek, a pane splitnek, az agent `cd` rootnak, a Pairflow bootstrap rootnak es a startup/kickoff command guidance-nak. | P1 | required-now |
| Control model | Phase 1C1 consume-only closure. | A task consume inputot allit at, nem producer contractot es nem activationt. | P1 | required-now |
| Read-path rule | A launch consume explicit canonical workspace inputbol vagy ugyanezt burokolt helperbol olvas. | Leaf `bubblePaths.worktreePath` olvasas megszunik a cutoveren atesett pontokon. | P1 | required-now |
| Forbidden fallback | Static bubble path kozvetlen leaf fallbackkent tiltott a cutoveren atesett launch-executable surfaces-eken. | Hianyzo canonical input eseten fail-closed launch, nincs masodlagos leaf fallback. | P1 | required-now |
| Retained reference rule | Retained bubble-root reference csak explicit, non-executable display semantics alatt maradhat meg. | A tasknak ki kell mondania, hogy `no_split` vagy `dual_role_split` valosul meg, es mely mezo/surface mit jelent. | P1 | required-now |
| Allowed resolution path | A same-authority fresh/resume launch helper explicit feloldhat canonical workspace inputot, es kulon tarthat non-authoritative bubble-root referenciat. | Ha egy seamen mindket path szukseges, azt el kell nevezni, nem szabad ugyanazon jelentest implicit `worktreePath` alatt bent hagyni. | P1 | required-now |
| Missing-data rule | Hianyzo canonical launch authority megallitja a startot tmux launch elott. | Nincs session/pane letrehozas authority nelkul. | P1 | required-now |
| Phase boundary | Csak start/tmux launch consume. | Runtime delivery, reviewer-context, bubble-loop, operator read-model es activation kulon task marad. | P1 | required-now |

### 1) Call-site Matrix

| ID | File | Function/Entry | Exact Signature (args -> return) | Insertion Point | Expected Behavior | Priority | Timing | Evidence |
|---|---|---|---|---|---|---|---|---|
| CS1a | `src/v11/application/start/startCommandApi.ts` | start orchestration launch handoff | `startBubble(input: StartBubbleInput, dependencies?: StartBubbleDependencies) -> Promise<StartBubbleResult>` | `runStartFlow(...)` caller seam | a `startCommandApi.ts` csak a launch input handoff seam szintjen ownershipos; a canonical launch workspace inputot a flow fele tovabbadja, nem maga oldja fel a leaf consume szabalyokat | P1 | required-now | T1, T2, T4 |
| CS1b | `src/v11/application/start/startCommandOrchestration.ts` | dependency/default wiring seam | `resolveStartBubbleDependencies(input: ResolveStartBubbleDependenciesInput) -> Promise<ResolvedStartBubbleDependencies>` | orchestration resolver seam | az orchestration csak dependency override-okat es defaultokat kot be; nem ez a canonical launch workspace authority assembly seam, es nem itt dol el a launch input workspace-jelentese | P1 | required-now | `tests/v11/application/start/startCommandOrchestration.test.ts` |
| CS2 | `src/v11/application/start/startCommandFlows.ts` | fresh/resume launch input assembly | `runFreshStartFlow(...)`, `runResumeStartFlow(...)` | tmux launch call elotti seam | a fresh es resume flow hordozza a launch-input assembly ownershipjat: a canonical workspace authority ugyanazon start/resume chainbol megy tovabb a tmux launch fele, es ha ez hianyzik, meg a tmux launch elott fail-closed hibara fut | P1 | required-now | T1, T2, T3, T5 |
| CS3 | `src/v11/application/start/startCommandTmuxLaunch.ts` | launch preparation + leaf consume | `launchFreshTmuxSession(...)`, `launchResumeTmuxSession(...)` | start/tmux leaf seam | a launch preparation/leaf code nem nyulhat kozvetlenul `context.resolved.bubblePaths.worktreePath`-hoz authoritative consume celra; a status command, agent commandok, kickoff/startup prompt inputok ugyanazt a canonical launch workspace erteket kapjak | P1 | required-now | T1, T2, T5 |
| CS4 | `src/v11/application/start/startCommandPrompts.ts`, `src/v11/application/start/startCommandImplementerPrompts.ts` | fresh startup/status prompt builders | existing prompt/status builders | status pane command es fresh startup prompt seam | a command-guidance es workspace display/cwd input canonical launch workspace authorityrol jon; ha retained static bubble-root referencia kell, az kulon, nem-authoritative mezoneven marad | P1 | required-now | T1, T6 |
| CS5 | `src/v11/application/start/startCommandResumePrompts.ts`, `src/v11/application/start/startCommandResumeImplementerPrompt.ts`, `src/v11/application/start/startCommandResumeKickoffMessages.ts`, `src/v11/application/start/startCommandResumeKickoffMessageBuilders.ts`, `src/v11/application/start/startCommandResumeFlowPreparation.ts` | resume startup/kickoff launch consume | existing resume prompt + kickoff builders | resume tmux startup guidance seam | a resume startup es kickoff messagek ugyanazt a canonical launch workspace inputot kapjak, amelyet a tmux launch is hasznal; nincs kozvetlen static bubble-path leaf consume | P1 | required-now | T2, T6 |
| CS6 | `src/v11/shared/command/agentCommand.ts` | agent pane root pinning | `buildAgentCommand(input: BuildAgentCommandInput) -> string` | pane shell script assembly seam | az agent pane script `cd <worktreePath>` rootja canonical launch workspace authorityra ul; retained bubble-root reference nem maradhat executable root ezen a seam-en | P1 | required-now | T1, T2, T6 |
| CS7 | `src/v11/shared/command/pairflowCommandBootstrap.ts` | Pairflow bootstrap/wrapper root | `buildPairflowCommandBootstrap(worktreePath: string, profile?: PairflowCommandProfile) -> string[]`; `buildPairflowCommandGuidance(worktreePath: string, profile?: PairflowCommandProfile) -> string` | bootstrap wrapper/script seam | a `PAIRFLOW_WORKTREE_ROOT`, wrapper dir/path es local entrypoint root canonical launch workspace authorityrol jon; retained bubble-root reference legfeljebb non-executable display textben maradhat meg | P1 | required-now | T1, T2, T6 |
| CS8 | `src/v11/shared/ports/tmuxSessions.ts` | tmux launch port contract | `LaunchBubbleTmuxSessionInput` -> `LaunchBubbleTmuxSessionResult` | shared tmux port | a port cwd semantics egyertelmuen canonical launch workspace authorityt jelol; ha bubble-root referencia is kell, az additiv es kulon nevezett marad | P1 | required-now | T5, T6, T7 |
| CS9 | `src/v11/infrastructure/channel/tmux/tmuxManager.ts`, `src/v11/infrastructure/channel/tmux/tmuxManagerSessionLayout.ts` | tmux session/pane cwd consume | existing launch/session-layout exports | tmux infra cwd seam | a new-session es split-window `-c` consume ugyanazt a canonical launch workspace erteket hasznalja minden pane-nel; nincs hidden static bubble-path fallback | P1 | required-now | T7 |
| CS10 | `tests/core/bubble/startBubble.test.ts`, `tests/core/runtime/agentCommand.test.ts`, `tests/core/runtime/pairflowCommand.test.ts`, `tests/core/runtime/restartRecovery.test.ts`, `tests/core/runtime/tmuxManager.test.ts`, `tests/contracts/v11/start.contract.runner.ts`, `tests/contracts/v11/start.contract.test.ts`, `tests/v11/application/start/startCommandOrchestration.test.ts` | launch consume regression tests | unit/integration/contract | validation surface | explicit bizonyitas kell arra, hogy a launch executable consumers a canonical workspace authorityt hasznaljak fresh/resume pathon is, es retained bubble-root reference divergence esetben se csusszanak vissza executable truthkent | P1 | required-now | T1-T7 |

### 2) Data and Interface Contract

| Contract | Current | Target | Required Fields | Optional Fields | Compatibility | Priority | Timing |
|---|---|---|---|---|---|---|---|
| Start launch consume input | leaf launch code kozvetlenul `bubblePaths.worktreePath`-ot olvas | a launch path explicit canonical workspace consume inputot kap | canonical launch workspace path; worktree mode-ban az ahhoz tartozo authority kind | retained bubble-root reference, ha tenyleg szukseges kulon nem-authoritative szerepre | additive / naming-clarifying consume contract | P1 | required-now |
| Executable launch root family | ma ugyanaz a `worktreePath` feedeli a tmux `-c`, az agent `cd` rootot es a Pairflow bootstrap rootot, de a jelentese nincs explicitten lezárva | a tmux `cwd`, agent pane root es Pairflow bootstrap/wrapper root egy kozos canonical launch workspace jelentest hordoz | canonical executable launch root | `N/A` | explicit semantic closure required, akar no-split reinterpretationnel is | P1 | required-now |
| Retained bubble-root reference | ma implicitten ugyanabban a `worktreePath` mezoben utazhat launch truth es bubble-root traceability | ha retained bubble-root reference kell, azt explicit kulon mezonev es non-executable semantics mellett kell hordozni | `N/A` | `bubbleRootReferencePath` / `displayWorktreePath`-jellegu kulon named field | additive only; executable seamsre nem mehet vissza | P1 | required-now |
| Prompt/status workspace guidance | a builder surfaces a static bubble pathot kapjak ugyanazon nev alatt | a builder surfaces canonical launch workspace inputot kapnak authoritykent | canonical launch workspace path | separately named bubble-root display/reference path | additive / naming-clarifying | P1 | required-now |
| Tmux launch port cwd semantics | egyetlen `worktreePath` mezore ul a session/pane `cwd` | a shared port egyertelmuen canonical launch workspace `cwd`-t jelent; additiv split csak akkor kell, ha a jelenlegi mezo nem hordozhato egyertelmuen regresszio nelkul | canonical `cwd` path | bubble-root reference only if separately named and not used as launch truth | shared-contract alignment required in-scope consumerskel | P1 | required-now |
| Resume same-authority resolution | resume path ma leaf szinten static bubble-path consume-ra ul | resume consume helper/assembly explicit same-authority canonical launch inputot ad | canonical resume launch workspace path | retained bubble-root reference | additive consume closure; nincs reviewer-context/runtime-delivery fallback | P1 | required-now |

Implementation notes:

1. Phase 1C1-ben nem kotelezo egyetlen uj helper-nev, de kotelezo az explicit authority consume boundary.
2. Phase 1C1-ben a `no_split` a default: ha a jelenlegi `worktreePath` mezot meg lehet tartani, annak jelentese minden executable seam-en canonical launch workspace root legyen.
3. Ha a jelenlegi `worktreePath` mezon ugyanrejtve ket fogalom utazik, a task additiv szetvalasztast preferal.
4. Fresh startban az explicit launch workspace input ugyanazon attempt authority chainjebol jojjon, ne operator/result surface-bol.
5. Resume pathon ugyanaz a helper vagy assembly nyelv legyen ervenyes, mint fresh pathon; a kulonbseg csak az authority source-ja lehet, nem a leaf consumer fallbackja.
6. Ha retained bubble-root reference marad, annak explicit negative bizonyitast kell kapnia arra, hogy nem feedeli a tmux `-c`, az agent `cd` es a Pairflow bootstrap root consume-jat.

### 3) Side Effects Contract

| Area | Allowed | Forbidden | Notes | Priority | Timing |
|---|---|---|---|---|---|
| start launch assembly | canonical launch workspace input eloallitasa es tovabbadasa | implicit leaf fallback a static bubble pathra | consume alignment only | P1 | required-now |
| agent command root | canonical launch workspace root tovabbadasa a pane script `cd` sorara | retained bubble-root reference executable rootkent | a pane shell root is launch truth | P1 | required-now |
| pairflow bootstrap root | canonical launch workspace root tovabbadasa `PAIRFLOW_WORKTREE_ROOT` es wrapper/local-entrypoint resolution fele | retained bubble-root reference executable bootstrap rootkent | bootstrap/wrapper consume is launch truth | P1 | required-now |
| tmux infra | canonical `cwd` consume session/pane launchkor | tmux/session metadata alapjan torteno authority ujrafeloldas | a tmux infra csak consume, nem authority resolver | P1 | required-now |
| prompt/status builders | workspace guidance consume egysegesitese | reviewer-context vagy operator read-model consume bevonasa | launch-facing text/guidance only | P1 | required-now |
| activation safety | retained clone reject | clone-success vagy remote runtime activation | plan prereq retained | P1 | required-now |

Constraint: ha itt nincs explicit engedely runtime deliveryre, reviewer-contextre vagy bubble-loop consume-ra, az implementacio nem modositja ezeket a surfaces-eket.

### 4) Error and Fallback Contract

| Trigger | Dependency (if any) | Behavior (`throw|result|fallback`) | Fallback Value/Action | Reason Code | Log Level | Priority | Timing | Evidence |
|---|---|---|---|---|---|---|---|---|
| fresh launch canonical workspace input hianyzik | fresh authority assembly | throw | fail-closed start hiba tmux launch elott | existing start error surface retained | error | P1 | required-now | T1, T3 |
| resume launch canonical workspace input hianyzik | resume authority assembly | throw | fail-closed start hiba tmux launch elott | existing start error surface retained | error | P1 | required-now | T2, T3 |
| launch executable consumer static bubble pathra esne vissza | tmux/agent/bootstrap consume | throw | nincs fallback; explicit invariant failure vagy normalizalt start hiba | existing start error normalization retained | error | P1 | required-now | T2, T3, T6 |
| shared tmux port nem tudja egyertelmuen canonical `cwd`-kent hordozni a launch workspace inputot | tmux port contract | throw vagy additive contract refinement | nincs silent overload | existing contract-test failure surface retained | error | P1 | required-now | T5, T6 |
| `work_mode=clone` start | retained preflight guard | throw | explicit reject, state unchanged | `WORKSPACE_MODE_CLONE_NOT_ACTIVATED` vagy retained equivalent | error | P1 | required-now | T4 |

Binding note:

1. A missing-data fail-closed viselkedesnek a tmux session letrehozasa elott kell ervenyesulnie.
2. A static bubble path kept-reference nem minosul fallbacknak, ha explicit nem-authoritative mezokent van kulon vive; de canonical `cwd`-kent mar nem olvashato leaf consume pontrol.

### 5) Dependency Constraints

| Type | Items | Priority | Timing |
|---|---|---|---|
| must-use | `plans/archive/plans/remote-bubble-execution-contract-and-phasing-plan-v2.md` | P1 | required-now |
| must-use | `plans/archive/tasks/remote-bubble-execution/phase1b2-workspace-authority-producer-foundation.md` mint retained producer baseline | P1 | required-now |
| must-use | `src/v11/application/start/startCommandOrchestration.ts` mint dependency/default wiring seam | P1 | required-now |
| must-use | `src/v11/application/start/startCommandTmuxLaunch.ts` mint primary consume seam | P1 | required-now |
| must-use | `src/v11/shared/command/agentCommand.ts` mint agent pane root consume seam | P1 | required-now |
| must-use | `src/v11/shared/command/pairflowCommandBootstrap.ts` mint Pairflow bootstrap/wrapper root consume seam | P1 | required-now |
| must-use | `src/v11/shared/ports/tmuxSessions.ts` ha a shared launch contract szetvalasztasa szukseges | P1 | required-now |
| must-not-use | `src/v11/infrastructure/channel/tmux/tmuxDeliveryRuntime.ts` | P1 | required-now |
| must-not-use | `src/v11/infrastructure/channel/tmux/reviewerContext.ts` | P1 | required-now |
| must-not-use | `src/v11/application/pass/**`, `converged/**`, `askHuman/**`, `metaReview*/**` | P1 | required-now |
| must-not-use | status/list/attach/read-model surfaces authority sourcekent | P1 | required-now |
| must-not-use | clone-success bootstrap proof vagy activation | P1 | required-now |

### 6) Test Matrix

| ID | Scenario | Given | When | Then | Priority | Timing | Evidence |
|---|---|---|---|---|---|---|---|
| T1 | fresh launch executable seams consume canonical workspace authority | `work_mode=worktree`, fresh start, canonical workspace launch input explicit | `startBubble(...)` lefut a fresh launchig | a `launchBubbleTmuxSession` input, a status pane command, az agent pane `cd` root es a Pairflow bootstrap root ugyanazt a canonical workspace erteket kapja; nincs leaf static bubble-path consume authoritative szerepben | P1 | required-now | `tests/core/bubble/startBubble.test.ts`, `tests/core/runtime/agentCommand.test.ts`, `tests/core/runtime/pairflowCommand.test.ts` |
| T2 | resume launch executable seams consume same-authority canonical path | resumable worktree bubble, runtime authority mar rendelkezik canonical workspace identityvel, es retained bubble-root referencia tovabbra is jelen lehet | `startBubble(...)` resume pathon lefut | a resume tmux launch, agent/bootstrap seams es resume prompt/kickoff surfaces canonical launch workspace inputot kapnak; a leaf code nem olvas kozvetlen `bubblePaths.worktreePath`-ot authoritative consume-kent akkor sem, ha retained reference parallel jelen van | P1 | required-now | `tests/core/runtime/restartRecovery.test.ts`, `tests/core/bubble/startBubble.test.ts`, `tests/core/runtime/agentCommand.test.ts`, `tests/core/runtime/pairflowCommand.test.ts` |
| T3 | missing canonical launch authority fails closed before executable launch | fresh vagy resume pathon a launch consume input nem oldhato fel | a start launch reszhez er | a start hibat dob a tmux/agent/bootstrap executable launch elott, es nincs silent fallback a static bubble pathra | P1 | required-now | `tests/core/bubble/startBubble.test.ts` |
| T4 | clone fail-closed retained after launch consume alignment | clone fresh/resume cases | `startBubble(...)` vagy contract harness fut | a consume alignment nem nyit clone launch success-t | P1 | required-now | `tests/contracts/v11/start.contract.runner.ts`, `tests/contracts/v11/start.contract.test.ts` |
| T5 | no-split executable-root contract remains explicit if a single path field is retained | az implementacio nem vezet be kulon retained bubble-root reference mezot Phase 1C1-ben | start/orchestration/contract tests lefutnak | explicit bizonyitas van arra, hogy a tovabbvitt egyetlen launch path jelentese canonical executable root a tmux `cwd`, agent `cd` es Pairflow bootstrap root seamjein is; ez Phase 2A-safe groundworkot hagy | P1 | required-now | `tests/core/bubble/startBubble.test.ts`, `tests/core/runtime/agentCommand.test.ts`, `tests/core/runtime/pairflowCommand.test.ts`, `tests/core/runtime/tmuxManager.test.ts`, `tests/contracts/v11/start.contract.test.ts`, `tests/v11/application/start/startCommandOrchestration.test.ts` |
| T6 | dual-role seam divergence is explicit if split introduced | az implementacio intentionalisan kulon canonical launch workspace es retained bubble-root reference fixture-rel fut | start/tmux/agent/bootstrap/prompt tests lefutnak | a canonical launch workspace csak executable seamsre megy, a retained bubble-root reference csak explicit non-executable display surface-en marad | P1 | required-now only if split introduced | `tests/core/runtime/agentCommand.test.ts`, `tests/core/runtime/pairflowCommand.test.ts`, `tests/contracts/v11/start.contract.test.ts`, `tests/v11/application/start/startCommandOrchestration.test.ts` |
| T7 | tmux manager and pane layout use canonical cwd for all panes | a launch port canonical launch workspace pathot kap | `launchBubbleTmuxSession(...)` fut | a `new-session` es minden `split-window -c` ugyanazt a canonical workspace cwd-t hasznalja | P1 | required-now | `tests/core/runtime/tmuxManager.test.ts` |

### 7) Shared Contract Compatibility

| Contract | Current Consumers | Additive or Breaking | Alignment Ownership | Priority | Timing |
|---|---|---|---|---|---|
| `LaunchBubbleTmuxSessionInput` cwd semantics | `startCommandTmuxLaunch.ts`, `tmuxManager.ts`, `tmuxManagerSessionLayout.ts`, kapcsolodo start/tmux tesztek | additive csak akkor, ha a canonical `cwd` es a bubble-root reference egyetlen mezon nem hordozhato egyertelmuen | teljesen ebben a taskban zarando, de a konkret forma lehet reinterpretation vagy additive split | P1 | required-now |
| executable launch root semantics | `startCommandTmuxLaunch.ts`, `agentCommand.ts`, `pairflowCommandBootstrap.ts`, kapcsolodo runtime/start tesztek | additive split csak akkor, ha explicit dual-role bizonyitas kell | ugyanebben a taskban zarando, mert ettol fugg a launch-truth closure valos vegrehajtasi jelentese | P1 | required-now |

Compatibility notes:

1. Ha a shared portban az egyetlen `worktreePath` mezot eleg egyertelmuen at lehet ertelmezni canonical launch `cwd`-re regresszio nelkul, az elfogadhato.
2. Ha a same-authority retained bubble-root reference tovabbra is kell mas launch-facing szovegekhez, az additiv szetvalasztas az elonyos, mert csokkenti a kesobbi Phase 2A review-loop kockazatot.
3. Ha nincs split, a tasknak explicitten ki kell mondania, hogy ugyanaz az egyetlen tovabbvitt path a canonical executable launch root a tmux, agent es Pairflow bootstrap seamjein is.

### 8) Baseline Preservation

| Behavior | Preserve or Replace | Rule | Priority | Timing |
|---|---|---|---|---|
| worktree fresh/resume start sikeressege | preserve | a consume cutover nem torheti el a jelenlegi worktree-mode startot | P1 | required-now |
| tmux pane layout es session lifecycle | preserve | csak a `cwd`/workspace consume truth valtozhat, a session orchestration nem | P1 | required-now |
| clone explicit reject | preserve | preflight guard retained prerequisite | P1 | required-now |
| leaf static bubble-path launch truth | replace | a cutover utan ez mar tiltott regression | P1 | required-now |

## L2 - Implementation Notes (Optional)

1. [later-hardening] A Phase 1C2 elott erdemes ugyanazt a canonical launch workspace helper-nyelvet tovabbvinni a runtime delivery es reviewer-context alignmenthez, hogy a kovetkezo consume familyk se hozzanak vissza uj aliasokat.

## Hardening Backlog (Optional)

| ID | Item | Layer | Priority | Timing | Source | Proposed Action |
|---|---|---|---|---|---|---|
| H1 | A Phase 1C2 runtime delivery/reviewer-context consume ugyanazt a canonical launch workspace helper-szokincset hasznalja, mint a Phase 1C1 launch consume | L2 | P2 | later-hardening | phase split boundary | Phase 1C2-ben lezarni |
| H2 | A nem-static forbidden fallback peldak explicit negative bizonyitasat csak akkor erdemes visszahozni, ha kulon teszt vagy kodpath-evidence kotheto hozzajuk | L2 | P2 | later-hardening | reviewer advisory round 2 | Kovetkezo fazisban vagy kulon docs taskban kotni evidence-hez |

## Review Control

1. Every finding must include: `priority`, `timing`, `layer`, `evidence`.
2. Max 2 L1 hardening rounds.
3. After round 2, new `required-now` is allowed only for evidence-backed `P0/P1`.
4. Items outside L1 blocker scope must be tagged `later-hardening`.
5. If `contract_boundary_override=yes`, `plan_ref` is mandatory and must align with L1 contract rows.

## Spec Lock

Task `IMPLEMENTABLE`, amikor az osszes `P0/P1 + required-now` item zarva van, es a start/tmux launch consume boundary nem hagy nyitva implicit static bubble-path fallbackot a cutoveren atesett surfaces-eken.
