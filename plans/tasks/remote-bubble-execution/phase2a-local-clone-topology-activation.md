---
artifact_type: task
artifact_id: task_remote_bubble_execution_phase2a_local_clone_topology_activation_v1
title: "Remote Bubble Execution Local Clone-Topology Activation (Phase 2A)"
status: implementable
phase: phase2a-local-clone-topology-activation
target_files:
  - src/v11/application/start/startCommandApi.ts
  - src/v11/application/start/startCommandLaunchWorkspace.ts
  - src/v11/application/start/startCommandRuntime.ts
  - src/v11/application/start/startCommandSession.ts
  - src/v11/application/start/startCommandFlows.ts
  - tests/v11/application/start/startCommandLaunchWorkspace.test.ts
  - tests/core/bubble/startBubble.test.ts
  - tests/contracts/v11/start.contract.runner.ts
  - tests/contracts/v11/start.contract.test.ts
  - tests/contracts/v11/cases/start/start-clone-not-activated-v11.case.json
  - tests/contracts/v11/cases/start/start-clone-not-activated-resume-v11.case.json
  - tests/contracts/v11/cases/start/start-clone-not-activated-resume-waiting-human-v11.case.json
  - tests/contracts/v11/cases/start/start-clone-not-activated-resume-ready-for-human-approval-v11.case.json
  - tests/contracts/v11/cases/start/start-clone-not-activated-resume-approved-for-commit-v11.case.json
  - tests/contracts/v11/cases/start/start-clone-not-activated-resume-committed-v11.case.json
  - tests/contracts/v11/cases/start/start-clone-state-not-startable-v11.case.json
prd_ref: null
plan_ref: plans/remote-bubble-execution-contract-and-phasing-plan-v2.md
system_context_ref: docs/pairflow-initial-design.md
owners:
  - "felho"
---

# Task: Remote Bubble Execution Local Clone-Topology Activation (Phase 2A)

## Current Codebase Check (2026-04-13)

1. A Phase 1C1-1D lezarta a canonical workspace authority producer- es consume-lancanak critical local runtime reszeit:
   - start/tmux launch mar explicit `workspacePath` authorityra ul,
   - runtime delivery/reviewer-context mar a kozos `resolveRuntimeSessionWorkspaceAuthority(...)` helperre ul,
   - bubble-loop wrapper family mar explicit `workspace_path` executable rootot hasznal.
2. A local clone-topology start ennek ellenere tovabbra is global phase-gate miatt le van tiltva:
   - `src/v11/application/start/startCommandApi.ts` `resolveStartBubblePreflightOrThrow(...)` a `bubbleConfig.work_mode === "clone"` esetet config-only alapon visszautasitja,
   - `src/v11/application/start/startCommandLaunchWorkspace.ts` `requireLaunchWorkspacePath(...)` az explicit `workspaceKind === "clone"` authorityt is visszautasitja fresh es resume pathon.
3. A start-flow viszont mar most is a canonical launch workspace rootot viszi tovabb a critical executable consume pontokra:
   - `runFreshStartFlow(...)` a bootstrap resultbol feloldott `launchWorkspace.workspacePath`-ot adja a bootstrap parancsnak es a tmux launchnak,
   - `runResumeStartFlow(...)` a `resolveResumeLaunchWorkspace(...)` eredmenyet adja a resume summary es tmux launch consume-nak.
4. A fo implementacios kockazat nem a guard eltavolitasa, hanem a resume ownership/reclaim seam:
   - `src/v11/application/start/startCommandSession.ts` ma a resume initial claim authorityt `launchWorkspacePath = bubblePaths.worktreePath` es `launchWorkspaceKind = bubbleConfig.work_mode` alapjan szintetizalja,
   - ez Phase 2A-ban hamis clone authorityt tudna gyartani pusztan retained worktree path + config alapjan,
   - vagyis egy naiv "engedd at a clone-ot" modositas megszegne a mar lezart authority control modelt.
5. A kozos authority helper mar most is eleg eros ahhoz, hogy a helyes Phase 2A control modellt tamogassa:
   - explicit persisted `workspacePath` + `workspaceKind=clone` authority feloldhato,
   - clone-only legacy worktree fallback canonical authority nelkul explicit tiltott.
6. A contract es integration proof surface viszont meg Phase 1C1 fail-closed allapotot bizonyit:
   - `tests/v11/application/start/startCommandLaunchWorkspace.test.ts` az explicit clone authorityt friss es resume pathon is elutasitja,
   - `tests/core/bubble/startBubble.test.ts` a config-only clone start rejectet ownership claim, launch es resume summary elott bizonyitja,
   - `tests/contracts/v11/start.contract.runner.ts` es a hozza tartozo case corpus ma meg `clone_not_activated` / `clone_not_activated_resume` scenariokra epul.

## Implementation Target Decision

1. `implementable_now`: `yes`
2. Ez a fazis explicit `runtime_activation` task, de csak local clone-topology start/resume activationre.
3. A feladat:
   - elvenni a config-only clone phase gate-et a local start pathrol,
   - megengedni az explicit canonical clone workspace authorityt fresh bootstrap es persisted resume runtime session eseten,
   - valtozatlanul tiltani minden olyan clone-success utat, amely nem explicit canonical authoritybol jon.
4. A task activation ownershipa szuk:
   - fresh activation source: explicit bootstrap result `workspacePath` + `workspaceKind=clone`,
   - resume activation source: explicit persisted runtime session `workspacePath` + `workspaceKind=clone`,
   - stale reclaim activation source: ugyanennek a persisted canonical authoritynak a megorzese a claim/remove/reclaim korben.
5. A task nem vallalja:
   - remote SSH start activationt,
   - operator read-model / status / list / attach cutovert,
   - cleanup routingot,
   - uj producer contract bevezeteset.
6. Public contract decision:
   - a local `start` command clone behaviora a Phase 2A-ban valtozik, ezert a start contract corpus es a reason-code expectation is in-scope,
   - de az activation utan is fail-closed marad minden olyan resume/fresh clone helyzet, ahol a canonical authority hianyzik vagy tiltott fallbackbol jon.

## L0 - Policy

### Goal

Aktivalni a local clone-topology start/resume utat ugy, hogy a sikeres clone launch csak explicit canonical workspace authorityra epulhessen, mikozben a retained worktree path, a `work_mode=clone` config es a legacy clone fallback onmagaban tovabbra sem valhat executable runtime truth-va.

### Domain / Control Model Summary

1. Business invariant: local clone-mode start vagy resume soran pontosan egy canonical executable workspace identity hasznalhato; a retained bubble worktree es az executable clone workspace nem szakadhat szet nem-nevezett fallbackokkal.
2. Control model: Phase 2A-ban a clone activationt nem a config, hanem az explicit canonical authority donti el.
   - fresh pathon ezt a bootstrap result adja,
   - resume/reclaim pathon ezt a persisted runtime session canonical authority adja.
3. Read-path rule:
   - fresh clone activation csak a bootstrap result `workspacePath` + `workspaceKind` authorityjabol olvashat,
   - resume/reclaim clone activation csak a runtime session authority helper feloldott eredmenyebol olvashat,
   - a kesobbi executable consume pontok mar a `launchWorkspace.workspacePath` eredmenyt kapjak tovabb.
4. Forbidden fallback:
   - `bubbleConfig.work_mode === "clone"` onmagaban executable truthkent,
   - `resolved.bubblePaths.worktreePath` vagy `runtimeSessionRecord.worktreePath` clone authoritykent explicit canonical `workspacePath` nelkul,
   - `startCommandSession.ts` olyan initial vagy retry claim authorityja, amely clone kindot retained worktree pathbol szintetizal.
5. Allowed resolution path:
   - fresh: bootstrap explicit clone authority -> runtime session upsert -> bootstrap command / tmux launch,
   - resume: explicit persisted runtime session canonical clone authority -> `resolveResumeLaunchWorkspace(...)` -> resume summary / tmux launch,
   - stale reclaim: stale runtime session explicit canonical clone authorityja megorizheto es ujrairhato a reclaim claimben,
   - legacy fallback tovabbra is csak worktree-mode same-authority esetre megengedett.
6. Missing-data rule:
   - fresh clone bootstrap explicit canonical authority nelkul fail-closed marad a tmux launch elott, a fresh cleanup/session cleanup baseline megtartasaval,
   - resume clone explicit persisted canonical authority nelkul fail-closed marad, nincs tmux launch es nincs implicit clone resume,
   - nem-startolhato state tovabbra is megelzi az activation-specifikus clone authority hibakat.
7. Phase boundary:
   - contract closure: owned here a local start public contract es contract corpus activation semantics-retege
   - producer closure: predecessor-owned, Phase 1B2-ben lezart
   - internal execution closure: owned here a local start fresh/resume activation gate es ownership/reclaim authority seam
   - workflow/orchestration closure: owned here, de csak a `start` command local orchestration activation gatejen
   - read-model closure: successor-only
   - activation closure: owned here, de csak local clone-topology start/resume
   - cleanup/recovery closure: successor-only

### Authority Boundary Map

1. `authority_producer`
   - fresh bootstrap result `workspacePath` / `workspaceKind`
   - persisted runtime session canonical authority a korabbi running sessionbol
2. `persisted_authority`
   - `RuntimeSessionRecord.workspacePath`
   - `RuntimeSessionRecord.workspaceKind`
   - retained `RuntimeSessionRecord.worktreePath`
3. `internal_execution_consumers` in scope
   - `src/v11/application/start/startCommandApi.ts`
   - `src/v11/application/start/startCommandLaunchWorkspace.ts`
   - `src/v11/application/start/startCommandSession.ts`
   - `src/v11/application/start/startCommandFlows.ts`
4. `workflow_orchestration_consumers` in scope
   - local `start` command contract harness es start integration proof surfaces
5. Explicit out-of-scope consumers
   - remote SSH start activation
   - operator read-model (`status`, `list`, `attach`)
   - bubble-loop command family
   - cleanup/commit/merge/delete routing
6. Export surfaces closed in this phase:
   - `yes`
   - a local `pairflow bubble start` clone-success semantics lezarodik, de csak local clone-topologyra

### Baseline Preservation

1. Must-preserve behaviors:
   - worktree-mode fresh es resume start tovabbra is sikeres marad,
   - `START_STATE_NOT_STARTABLE` precedence clone config mellett is retained marad,
   - fresh start pre-launch failure cleanup/session cleanup baseline retained marad,
   - clone-only legacy worktree fallback canonical authority nelkul tovabbra is tiltott marad,
   - stale session reclaim tovabbra is megorzi a persisted canonical authorityt ott, ahol mar letezett.
2. Allowed resolution paths:
   - fresh explicit bootstrap authority -> `resolveFreshLaunchWorkspace(...)`,
   - resume explicit runtime session authority -> `resolveResumeLaunchWorkspace(...)`,
   - retry reclaim -> persisted explicit authority reuse,
   - worktree legacy fallback csak a helper altal `worktree` same-authority pathkent feloldva.
3. Forbidden regression interpretations:
   - a config-only clone reject eltavolitasa nem jelent config-only clone success pathot,
   - a Phase 2A nem engedi meg, hogy a retry claim retained worktree pathbol irjon clone authorityt,
   - a Phase 2A nem aktival remote runtimeot vagy operator read-modelt,
   - a Phase 2A nem lazithatja fel a clone-only legacy fallback tiltast.
4. Replacement proof required if removed:
   - ha a config-only clone preflight reject megszunik, bizonyitani kell, hogy a state-not-startable precedence, a fresh cleanup, a resume fail-closed, es a tmux-launch-elotti authority gate explicit tesztekkel tovabbra is vedett.

### In Scope

1. A local `start` command config-only clone preflight gatejenek feloldasa.
2. Az explicit fresh bootstrap clone authority engedelyezese a launch workspace resolverben.
3. Az explicit persisted resume clone authority engedelyezese a launch workspace resolverben.
4. A runtime session ownership/reclaim seam szigoritasa, hogy clone authority csak explicit canonical source-bol maradhasson fenn.
5. A start integration es contract proof frissitese az uj activation semanticsre.

### Out of Scope

1. Remote SSH start activation
2. `bubble create --remote` write-path exposure
3. `status` / `list` / `attach` read-model
4. Bubble-loop `pass` / `converged` / `ask-human` / `meta_review_result`
5. Cleanup/recovery routing
6. Uj persisted authority schema vagy producer field bevezetese

### Safety Defaults

1. Canonical clone authority nelkul nincs clone tmux launch.
2. Retained worktree path es config-only clone intent nem valhat implicit executable rootta.
3. A task csak local activationt nyit; minden remote es operator consume successor-only marad.

### Contract Boundary / Blast Radius

1. `contract_boundary_override`: `yes`
2. Erintett contractok:
   - local `start` command activation semantics
   - `StartLaunchWorkspace` clone acceptance/fail-closed contract
   - start contract harness scenario taxonomy es case corpus
3. Fan-out note:
   - a shared runtime authority helper mar lezart es retained baseline,
   - a Phase 2A nem nyithat uj consumer alignment scope-ot a local start activationon kivul.

### Complexity Risk Gate

1. `authority_risk`: `1`
2. `surface_spread`: `1`
3. `identity_join_risk`: `2`
4. `activation_coupling`: `1`
5. `prerequisite_risk`: `1`
6. `acceptance_multiplicity`: `1`
7. `risk_score`: `7`
8. `single-task allowed`: `yes`
9. If `no`, required split:
   - `N/A`
   - `N/A`
   - `N/A`
10. Identity/join note:
   - canonical identity path: bootstrap/runtime-session canonical authority -> `StartLaunchWorkspace` -> bootstrap command / resume summary / tmux launch
   - competing identifiers or fallback identities: `bubbleConfig.work_mode`, retained `bubblePaths.worktreePath`, retained `runtimeSessionRecord.worktreePath`
11. Authority/source-of-truth note:
   - canonical source: explicit bootstrap result vagy explicit persisted runtime session canonical authority
   - forbidden secondary sources: config-only clone intent, retained worktree-only clone fallback, synthetic clone claim authority

## L1 - Change Contract

### 0) Domain / Control Contract

| Item | Rule | Implementation Consequence | Priority | Timing |
| --- | --- | --- | --- | --- |
| Business invariant | A local clone start/resume csak explicit canonical workspace authorityrol indulhat. | A start path nem szakadhat kulon config intent, retained worktree es executable clone root truthra. | P1 | required-now |
| Control model | A clone activationt fresh pathon a bootstrap result, resume pathon a persisted runtime session authority donti el. | A preflight config-only clone gate megszunik; az authority-based launch gate marad. | P1 | required-now |
| Read-path rule | Fresh clone a bootstrap resultot, resume clone a runtime-session helper feloldasat olvashatja. | A start flow nem olvashat retained worktree pathot clone authoritykent. | P1 | required-now |
| Forbidden fallback | `work_mode=clone`, `bubblePaths.worktreePath`, `runtimeSessionRecord.worktreePath`, vagy synthetic claim authority nem lehet clone executable truth. | A resume ownership/reclaim seamet explicitten szigoritani kell. | P1 | required-now |
| Allowed resolution path | Fresh explicit clone authority, resume explicit persisted clone authority, stale reclaim explicit persisted clone authorityja. | A worktree legacy fallback retained marad, de csak worktree same-authority esetre. | P1 | required-now |
| Missing-data rule | Clone authority hianyaban a local start fail-closed marad. | Freshnel cleanup retained, resumenel nincs tmux launch, nincs implicit clone success. | P1 | required-now |
| Phase boundary | Ez a task csak local clone-topology activation. | Remote activation, read-model, cleanup es bubble-loop consume successor-only. | P2 | required-now |

### 0a) Shared Contract Compatibility (if applicable)

| Shared Contract | Current Consumers | Change Type (`additive|breaking|N/A`) | This Task Action | Deferred Alignment |
| --- | --- | --- | --- | --- |
| `tests/contracts/v11/start.contract.runner.ts` scenario taxonomy + `tests/contracts/v11/cases/start/*.case.json` corpus | `tests/contracts/v11/start.contract.test.ts`, corpus manifest build, start contract validation surface | breaking | a `clone_not_activated*` fail-closed scenariokat activation-success es authority-missing fail-closed scenariokra kell atvezetni, a `clone_state_not_startable` precedence proof megtartasaval | remote start/read-model successor tasks |
| `src/v11/application/start/startCommandLaunchWorkspace.ts` local launch authority contract | `startCommandFlows.ts`, `startCommandLaunchWorkspace.test.ts`, `startBubble.test.ts` | additive | explicit clone canonical authority elfogadott lesz fresh es resume pathon; a hianyzo vagy tiltott authority tovabbra is fail-closed marad | `N/A` |
| runtime session ownership claim authority semantics | `startCommandApi.ts`, `startBubble.test.ts`, stale reclaim resume flow | additive / narrowing | a claim path mar nem generalhat synthetic clone authorityt retained worktree + config alapjan | remote recovery successor tasks |

### 0b) Baseline Preservation (if applicable)

| Current Behavior | Preserve/Replace/Forbid | Required Proof | Priority | Timing |
| --- | --- | --- | --- | --- |
| config-only clone preflight reject | replace | explicit proof kell arra, hogy a clone success mar authority-gated, nem config-gated, es a state-not-startable precedence retained marad | P1 | required-now |
| explicit bootstrap clone authority fresh pathon | replace | fresh clone bootstrap authorityval sikeres tmux launch, upsert es cleanup invarians bizonyitas | P1 | required-now |
| explicit persisted clone authority resume pathon | replace | resumable statesben explicit canonical clone authorityval sikeres resume summary es tmux launch bizonyitas | P1 | required-now |
| clone-only legacy fallback canonical authority nelkul | forbid | resume/fresh fail-closed teszt, explicit `START_LAUNCH_WORKSPACE_UNAVAILABLE` vagy retained equivalent authority-missing proof | P1 | required-now |
| stale reclaim megorzi a persisted canonical authorityt | preserve and extend | stale clone reclaim teszt bizonyitja, hogy a remove/reclaim kor nem ir synthetic clone authorityt, hanem a persisted canonical authorityt tartja meg | P1 | required-now |

### 1) Call-site Matrix

| ID | File | Function/Entry | Exact Signature (args -> return) | Insertion Point | Expected Behavior | Priority | Timing | Evidence |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| CS1 | `src/v11/application/start/startCommandApi.ts` | `resolveStartBubblePreflightOrThrow(...)`, `startBubble(...)` | `(input) -> Promise<ResolvedStartBubble>`, `(input, dependencies?) -> Promise<StartBubbleResult>` | preflight gate a bubble lookup + state validation utan | a config-only clone reject megszunik; a local start clone bubblesnel is tovabbmegy a normal start mode/authority gate fele, mikozben a `START_STATE_NOT_STARTABLE` precedence retained marad | P1 | required-now | T1, T3, T7 |
| CS2 | `src/v11/application/start/startCommandLaunchWorkspace.ts` | `requireLaunchWorkspacePath(...)`, `resolveFreshLaunchWorkspace(...)`, `resolveResumeLaunchWorkspace(...)` | `(input) -> StartLaunchWorkspace`, `(input) -> StartLaunchWorkspace`, `(input) -> StartLaunchWorkspace` | launch authority resolver seam | explicit `workspaceKind=clone` canonical authority elfogadott fresh es resume pathon; hianyzo canonical authority es clone-only legacy fallback tovabbra is fail-closed marad | P1 | required-now | T1, T2, T3, T4 |
| CS3 | `src/v11/application/start/startCommandSession.ts` | `claimRuntimeSessionOwnership(...)` es a kapcsolodo initial/retry authority helper-ek | `(input) -> Promise<RuntimeSessionRecord>` | ownership claim es stale reclaim seam | a claim path nem generalhat clone authorityt `worktreePath + work_mode=clone` alapjan; freshnel ures authority marad bootstrapig, resumenel/reclaimnel csak explicit persisted canonical authority viheto tovabb clone esetre | P1 | required-now | T3, T5 |
| CS4 | `src/v11/application/start/startCommandFlows.ts` | `runFreshStartFlow(...)`, `runResumeStartFlow(...)` | `(input) -> Promise<FreshStartResult>`, `(input) -> Promise<ResumeStartResult>` | fresh/resume launch assembly seam | fresh clone bootstrap explicit canonical authorityjat perzisztalja es ugy launchol; resume clone explicit persisted canonical authorityval epit resume summaryt es launchot | P1 | required-now | T1, T3, T5 |
| CS5 | `src/v11/application/start/startCommandRuntime.ts` | clone-phase-gate wording / start error builders | existing exports | public start error wording seam | a local start path nem hasznalhat tovabb altalanos "clone not activated in this phase" reason/message szerzodest ott, ahol Phase 2A mar aktiv; az authority-missing fail-closed maradjon a canonical start error familyben | P1 | required-now | T2, T4, T7 |
| CS6 | `tests/v11/application/start/startCommandLaunchWorkspace.test.ts` | launch workspace authority unit proof | vitest | local unit validation seam | az explicit clone authority acceptance, a legacy clone fallback tiltasa, es a worktree legacy baseline kulon bizonyitast kap | P1 | required-now | T1-T4 |
| CS7 | `tests/core/bubble/startBubble.test.ts` | local start integration proof | vitest | fresh/resume/stale reclaim integration seam | a clone success/fail-closed viselkedes, a cleanup es a stale reclaim authority preservation integraciosan bizonyitott | P1 | required-now | T1-T7 |
| CS8 | `tests/contracts/v11/start.contract.runner.ts`, `tests/contracts/v11/start.contract.test.ts`, `tests/contracts/v11/cases/start/*.json` | start contract corpus | contract harness | corpus / manifest seam | a start contract mar nem `clone_not_activated` fail-closed semanticsre epul, hanem local activation success + authority-missing fail-closed + state precedence proofra | P1 | required-now | T8, T9 |

### 2) Data and Interface Contract

| Contract | Current | Target | Required Fields | Optional Fields | Compatibility | Priority | Timing |
| --- | --- | --- | --- | --- | --- | --- | --- |
| local start preflight clone behavior | `work_mode=clone` config-only alapon azonnali reject | clone config tovabbmegy a normal start-flow authority gate fele | `bubbleId`, resolved state/start mode | `repoPath`, `cwd` | behaviorally breaking, plan-owned activation change | P1 | required-now |
| `StartLaunchWorkspace` authority contract | explicit clone `workspaceKind` rejected fresh es resume pathon | explicit clone `workspacePath` + `workspaceKind=clone` elfogadott; missing authority es tiltott fallback tovabbra is reject | `workspacePath`, `workspaceKind` | `N/A` | additive activation | P1 | required-now |
| runtime session claim authority semantics | resume claim synthetic clone authorityt is tud generalni `worktreePath + work_mode` alapjan | clone authority field csak explicit canonical source-bol maradhat/irhato; worktree fallback csak worktree mode-ra ervenyes | `worktreePath`, `tmuxSessionName` | explicit `workspacePath`, explicit `workspaceKind` | narrowing, fail-closed hardening | P1 | required-now |
| start contract corpus clone scenarios | `clone_not_activated`, `clone_not_activated_resume` fail-closed | activation success scenariok + authority-missing fail-closed scenariok + retained `clone_state_not_startable` | `scenario`, `expected.status`, `expected.reasonCode` | `resumeState` | breaking test corpus, plan-owned | P1 | required-now |

### 3) Side Effects Contract

| Area | Allowed | Forbidden | Notes | Priority | Timing |
| --- | --- | --- | --- | --- | --- |
| local start runtime mutation | runtime session claim/upsert/remove, state PREPARING/RUNNING/RESUME mutation, tmux launch, fresh cleanup retained baseline szerint | remote SSH, operator read-model mutation, cleanup routing extension | Phase 2A local activation only | P1 | required-now |
| runtime session authority persistence | explicit canonical clone authority perzisztalasa fresh bootstrap utan, persisted canonical clone authority megozrese reclaimnel | synthetic clone authority irasa retained worktree path + config alapjan | a control model itt lesz fail-closed vagy explicit | P1 | required-now |

Constraint: ha itt nincs explicit engedely remote start/read-model/cleanup routingra, az implementacio nem modositja ezeket a surfaces-eket.

### 4) Error and Fallback Contract

| Trigger | Dependency (if any) | Behavior (`throw|result|fallback`) | Fallback Value/Action | Reason Code | Log Level | Priority | Timing |
| --- | --- | --- | --- | --- | --- | --- | --- |
| fresh clone bootstrap explicit canonical authorityval | bootstrap workspace port | result | normal fresh start path | `STARTED` | info | P1 | required-now |
| fresh clone bootstrap hianyzo canonical authorityval | bootstrap workspace port | throw | fresh cleanup + runtime session cleanup retained baseline | `START_LAUNCH_WORKSPACE_UNAVAILABLE` vagy retained equivalent | error | P1 | required-now |
| resume clone explicit persisted canonical authorityval | runtime session authority helper | result | normal resume path | `STARTED` | info | P1 | required-now |
| resume clone authority hianyzik vagy clone-only legacy fallbackra fut | runtime session authority helper | throw | nincs tmux launch, nincs implicit clone resume | `START_LAUNCH_WORKSPACE_UNAVAILABLE` | error | P1 | required-now |
| clone bubble nem-startolhato state-ben | state machine / start mode resolver | throw | retained state-not-startable error, nincs activation-specifikus fallback | `START_STATE_NOT_STARTABLE` | error | P1 | required-now |
| stale reclaim clone bubble explicit persisted canonical authorityval | runtime session claim + liveness check | result | stale session remove + uj claim, canonical authority retained | `STARTED` | info | P1 | required-now |

### 5) Dependency Constraints

| Type | Items | Priority | Timing |
| --- | --- | --- | --- |
| must-use | `plans/remote-bubble-execution-contract-and-phasing-plan-v2.md` | P1 | required-now |
| must-use | `src/v11/shared/runtimeSessionWorkspaceAuthority.ts` a resume/reclaim canonical authority read-pathhoz | P1 | required-now |
| must-use | `src/v11/application/start/startCommandLaunchWorkspace.ts` mint a local activation gate canonical authority seamje | P1 | required-now |
| must-use | `src/v11/application/start/startCommandSession.ts` explicit reclaim/claim hardeningnel | P1 | required-now |
| must-not-use | config-only clone reject retained local activation gatekent | P1 | required-now |
| must-not-use | retained `worktreePath` clone authoritykent explicit canonical `workspacePath` nelkul | P1 | required-now |
| must-not-use | remote SSH/start/read-model/cleanup surfaces | P1 | required-now |

### 6) Test Matrix

| ID | Scenario | Given | When | Then | Priority | Timing | Evidence |
| --- | --- | --- | --- | --- | --- | --- | --- |
| T1 | fresh clone success explicit bootstrap authorityval | `work_mode=clone`, bootstrap result explicit `workspacePath` es `workspaceKind=clone` | `startBubble(...)` fresh pathon lefut | runtime session canonical clone authorityt kap, bootstrap command es tmux launch a canonical clone workspace rootot kapja, es a start sikeres | P1 | required-now | `tests/v11/application/start/startCommandLaunchWorkspace.test.ts`, `tests/core/bubble/startBubble.test.ts` |
| T2 | fresh clone hianyzo bootstrap authority fail-closed cleanup-pal | `work_mode=clone`, bootstrap result nem ad ervenyes canonical authorityt | `startBubble(...)` fresh pathon futna | nincs tmux launch, a fresh cleanup/runtime session cleanup retained marad, es a hiba authority-missing familyben marad | P1 | required-now | `tests/v11/application/start/startCommandLaunchWorkspace.test.ts`, `tests/core/bubble/startBubble.test.ts` |
| T3 | resume clone success explicit persisted canonical authorityval | resumable bubble state, runtime session explicit `workspacePath` + `workspaceKind=clone` | `startBubble(...)` resume pathon lefut | resume summary es tmux launch a canonical clone workspace rootot kapja, es a start sikeres | P1 | required-now | `tests/v11/application/start/startCommandLaunchWorkspace.test.ts`, `tests/core/bubble/startBubble.test.ts` |
| T4 | resume clone legacy fallback forbidden | resumable bubble, runtime session csak retained worktree pathot vagy `workspaceKind=clone` authority nelkul tart | `startBubble(...)` resume pathon futna | nincs tmux launch, nincs synthetic clone authority, es a hiba `START_LAUNCH_WORKSPACE_UNAVAILABLE` marad | P1 | required-now | `tests/v11/application/start/startCommandLaunchWorkspace.test.ts`, `tests/core/bubble/startBubble.test.ts` |
| T5 | stale reclaim clone authority preservation | resumable clone bubble, stale runtime session explicit canonical clone authorityval | first claim unclaimed + session dead, retry claim utan start folytatodik | a retry claim a persisted canonical clone authorityt viszi tovabb, nem synthetic worktree-based clone authorityt, es a start sikeres | P1 | required-now | `tests/core/bubble/startBubble.test.ts` |
| T6 | worktree-mode regression guard | worktree-mode fresh es resume bubblek retained baseline-nal | `startBubble(...)` fut | a Phase 2A nem regresszalja a worktree-mode success pathot es legacy same-authority fallbackot | P1 | required-now | `tests/v11/application/start/startCommandLaunchWorkspace.test.ts`, `tests/core/bubble/startBubble.test.ts` |
| T7 | clone state-not-startable precedence retained | `work_mode=clone`, bubble state `FAILED` | public/local start export fut | `START_STATE_NOT_STARTABLE` marad a public hiba, nem activation-specifikus clone authority error | P1 | required-now | `tests/core/bubble/startBubble.test.ts`, `tests/contracts/v11/start.contract.runner.ts` |
| T8 | start contract fresh clone activation corpus | contract case fresh clone explicit bootstrap authorityval | shared contract runner fut | a corpus start success kimenetet var el, nem `clone_not_activated` fail-closedot | P1 | required-now | `tests/contracts/v11/start.contract.runner.ts`, `tests/contracts/v11/start.contract.test.ts`, case json |
| T9 | start contract resume clone activation corpus | contract case resumable clone explicit persisted canonical authorityval tobb resumable stateben | shared contract runner fut | a corpus success kimenetet var el resume clone esetben is, mikozben a nem-startolhato clone state case retained marad | P1 | required-now | `tests/contracts/v11/start.contract.runner.ts`, `tests/contracts/v11/start.contract.test.ts`, case json |

## L2 - Implementation Notes (Optional)

1. [later-hardening] Ha a `startCommandSession.ts` claim helper logikaja tul implicit, erdemes kulon named helperre bontani a "resume persisted authority reuse" es a "fresh authority empty until bootstrap" szabalyokat.
2. [later-hardening] A contract corpus scenario neveit erdemes a Phase 2A utan mar activation-semantikara atnevezni, hogy a retained `clone_not_activated` token ne maradjon felrevezeto historic alias.

## Hardening Backlog (Optional)

| ID | Item | Layer | Priority | Timing | Source | Proposed Action |
| --- | --- | --- | --- | --- | --- | --- |
| H1 | a local clone activation contract utan a remote SSH activation ugyanilyen explicit authority-proofot igenyel | L2 | P2 | later-hardening | Phase 2A successor boundary | lezarni Phase 2D taskban |

## Review Control

1. Every finding must include: `priority`, `timing`, `layer`, `evidence`.
2. Max 2 L1 hardening rounds.
3. After round 2, new `required-now` is allowed only for evidence-backed `P0/P1`.
4. Items outside L1 blocker scope must be tagged `later-hardening`.
5. Mivel a local `start` contract behavior valtozik, a contract corpus scenario inventory es az atvezetes ownership kotelezo.
6. Ha a clone config-only gate megszunik, replacement proof kotelezo a state precedence, cleanup es fail-closed authority semanticsre.
7. Ha a reclaim/claim seam touched, explicit negative proof kotelezo arra, hogy retained worktree pathbol nem szuletik synthetic clone authority.

## Spec Lock

Mark task as `IMPLEMENTABLE` when all `P0/P1 + required-now` items are closed.
