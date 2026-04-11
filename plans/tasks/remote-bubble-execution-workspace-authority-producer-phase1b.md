---
artifact_type: task
artifact_id: task_remote_bubble_execution_workspace_authority_producer_phase1b_v1
title: "Remote Bubble Execution Workspace Authority Producer (Phase 1B)"
status: draft
phase: phase1b-workspace-authority-producer
target_files:
  - src/v11/shared/ports/worktreeWorkspace.ts
  - src/v11/infrastructure/workspace/worktreeManager.ts
  - src/v11/shared/ports/runtimeSessions.ts
  - src/v11/infrastructure/executor/sessionRuntime/runtimeSessionsRegistry.ts
  - src/v11/infrastructure/executor/sessionRuntime/runtimeSessionsRegistryDocument.ts
  - src/v11/defaults/start/startBubbleDefaults.ts
  - src/v11/application/start/startCommandContract.ts
  - src/v11/application/start/startCommandOrchestration.ts
  - src/v11/application/start/startCommandFlows.ts
  - src/v11/application/start/startCommandSession.ts
  - src/v11/application/start/startCommandCleanup.ts
  - tests/core/workspace/worktreeManager.test.ts
  - tests/core/runtime/sessionsRegistry.test.ts
  - tests/v11/application/start/startCommandOrchestration.test.ts
  - tests/core/bubble/startBubble.test.ts
prd_ref: null
plan_ref: plans/remote-bubble-execution-contract-and-phasing-plan-v2.md
system_context_ref: docs/pairflow-initial-design.md
owners:
  - "felho"
---

# Task: Remote Bubble Execution Workspace Authority Producer (Phase 1B)

## Current Codebase Check (2026-04-12)

1. `src/v11/shared/ports/worktreeWorkspace.ts` ma csak worktree-centric bootstrap/cleanup contractot definial: nincs `workMode` consume, nincs `workspaceKind`, nincs `branchPrepared`, es a `worktreePath` mezo implicit modon git-worktree pathkent van ertelmezve.
2. `src/v11/infrastructure/workspace/worktreeManager.ts` a local default implementationben mindig bubble branch + git worktree bootstrapot csinal; a `clone` mode runtime szemantikaja nincs explicit fail-closed contracttal lezarva.
3. `src/v11/application/start/startCommandFlows.ts` a fresh-start flowban a bootstrap utan tovabbra is a statikus `resolved.bubblePaths.worktreePath` megy tovabb a `commands.bootstrap` fogyasztasba; a bootstrap result authorityja itt meg nem canonical.
4. `src/v11/application/start/startCommandSession.ts` a runtime session ownershipot bootstrap elott claimeli a statikus `bubblePaths.worktreePath`-tal, es ma nincs explicit post-bootstrap finalize/update lepes ugyanarra a session recordra.
5. `src/v11/application/start/startCommandCleanup.ts` rollback eseten a cleanup targetet a statikus `bubblePaths.worktreePath`-bol vezeti le, nem a frissen eloallitott workspace authoritybol.
6. `src/v11/application/start/startCommandTmuxLaunch.ts`, a prompt/runtime helper-ek, a `src/cli/index.ts`, valamint a `src/v11/shared/status/**` retegek tovabbra is `worktreePath` consume-ra ulnek; ezek mar consumer-alignment teruletek, nem producer closure.
7. `src/v11/shared/ports/runtimeSessions.ts` es `src/v11/infrastructure/executor/sessionRuntime/runtimeSessionsRegistry*.ts` jelenleg csak `worktreePath` mezot hordoznak; nincs additive workspace-authority mezofamilia, es nincs shared porton keresztuli post-claim finalize/update seam.
8. A cleanup port jelenlegi return shape-je (`removedWorktree`, `removedBranch`) delete/merge flowk altal tenylegesen hasznalt shared contract; ezt a task nem torheti meg foundation-cimke alatt.
9. A `pairflow_command_profile="self_host"` ma a worktree-local `dist/cli/index.js` wiringra epit a start tmux/prompt oldalon; clone topologyval kapcsolatos ervenyesitesi boundary nincs explicit fail-closed modon lezarva.

## Implementation Target Decision

1. `implementable_now`: `yes`
2. Ez a task producer-only Phase 1B szelet:
   - workspace bootstrap contract additive bovitese,
   - bubble branch authoring ownership explicit bootstrap-level rogzites,
   - pre-claim + post-bootstrap finalize/update runtime session authority,
   - fresh-start rollback identity contract,
   - local `clone` fail-closed,
   - `self_host` + clone fail-closed.
3. A task nem zar le consumer-family migrationt:
   - nem valt at bubble-loop consume-ra,
   - nem valt at tmux/pane delivery consume-ra,
   - nem valt at status/CLI/read-model consume-ra,
   - nem mozditja meg a delete/merge cleanup interpretationt.
4. A Phase 1B celja az, hogy a canonical workspace authority explicit legyen es a runtime session registry mar tudja fogadni, de a legtobb downstream consumer tovabbra is a kesobbi fazis ownershipje maradjon.

## L0 - Policy

### Goal

Lezarni a remote-aware workspace authority producer seamet ugy, hogy a fresh-start bootstrap explicit es additive contracttal allitsa elo az authoritative workspace cwd-t, es ezt ugyanazon runtime session recordba finalize/update-olja, mikozben a shared consumer-ek kompatibilisek maradnak.

Ez a task szandekosan nem oldja meg a bubble-loop, tmux/pane, status/CLI vagy cleanup consumer cutovert; csak azt, hogy legyen egy stabil producer contract, amire ezek a fazisok raulhetnek.

### Domain / Control Model Summary

1. Business invariant: egy futó bubble-höz legfeljebb egy autoritativ workspace-azonossag tartozhat, es a fresh-start bootstrap utan ezt nem szabad visszairni statikus bubble path fallbackra.
2. Control model: a fresh-start bootstrap result zarja le az effective workspace cwd-t; ezt a task csak a bootstrap command es a runtime session finalize/update szintjen teheti canonicalla.
3. Read-path rule: ebben a fazisban az authoritative workspace az additive bootstrap resultbol jon, es a runtime sessions registry ugyanennek a producer authoritynak a persisted runtime hordozója.
4. Forbidden fallback: bootstrap utan kozvetlen `resolved.bubblePaths.worktreePath` authority fallback; stale-session remove+reclaim workaround authoritative workspace finalize helyett; `self_host` clone-topology csendes tovabbengedese.
5. Missing-data rule: ha a bootstrap result nem ad explicit producer authorityt (`branchPrepared`, workspace target), vagy a runtime session finalize/update nem tudja ezt rogziteni, a start fail-closed marad; nincs silent fallback.
6. Phase boundary:
   - contract closure: owned here
   - producer closure: owned here
   - internal execution closure: owned here, de csak a `commands.bootstrap` consume es a runtime session finalize/update szintjen
   - workflow/orchestration closure: successor (Phase 1C)
   - read-model closure: successor (Phase 2B)
   - activation closure: successor (Phase 2A)
   - cleanup/recovery closure: successor, kiveve a fresh-start rollback identity preservationt

### Authority Boundary Map

1. Authority producer: a workspace bootstrap result, plus a post-bootstrap runtime session finalize/update ugyanarra a bubble session recordra.
2. Stored authority: a retained Phase 1A persisted remote config/pointer baseline, plus az additive runtime session workspace authority mezok.
3. In-scope consumers: fresh-start bootstrap command cwd, runtime session finalize/update, fresh-start rollback cleanup target.
4. Explicit out-of-scope consumers: bubble-loop actor protocol, tmux pane delivery/prompt wiring, status/list/attach read-model, delete/merge cleanup result interpretation.
5. Export surfaces closed in this phase: `no`; a user-facing `worktree` wording, `StartBubbleResult`, status path view es CLI output nem ownershipje ennek a tasknak.

### In Scope

1. `worktreeWorkspace` bootstrap port additive bovitese `workMode`, `workspaceKind`, `branchPrepared` es authoritative workspace szemantikaval, a `worktreePath` compatibility alias megtartasaval.
2. Local default bootstrap implementation explicit `clone` fail-closed policyja.
3. Bubble branch authoring explicit bootstrap-owned contractja.
4. Runtime session shared port additive bovitese authoritative workspace mezokkel es finalize/update seam-mel.
5. Fresh-start flow olyan atalakítása, hogy:
   - pre-claim tovabbra is bootstrap elott tortenjen,
   - post-bootstrap finalize/update ugyanazt a runtime session recordot irja felul az authoritative workspace adatokkal,
   - `commands.bootstrap` mar a bootstrap-result authorityt fogyassza.
6. Fresh-start rollback olyan atalakítása, hogy a cleanup a bootstrap-result identityt hasznalja, ne a statikus `bubblePaths.worktreePath` fallbacket.
7. `clone` + `self_host` explicit fail-closed boundary rogzitesi a start producer retegen.
8. A fenti contractokhoz tartozó workspace/start/runtime sessions tesztek.

### Out of Scope

1. Tmux/session pane delivery consume, prompt wiring, status-pane command cwd vagy agent startup prompt cutover.
2. `StartBubbleResult`, CLI start output, status/list/read-model wording vagy `worktree` elnevezes operator-level cseréje.
3. Bubble-loop consume migration (`pass`, `converged`, `ask-human`, `meta_review_result`).
4. Remote SSH clone/sync/start activation.
5. Delete/merge cleanup contract interpretation vagy result-shape breaking valtoztatasa.
6. A teljes `worktreePath` mezocsalad atnevezese `workspacePath`-ra a kodbazisban.

### Safety Defaults

1. `work_mode = "worktree"` eseten a jelenlegi local bootstrap viselkedes regresszio nelkul megmarad, de a bootstrap result explicit producer contracttal ter vissza.
2. `work_mode = "clone"` local default bootstrap implementation mellett fail-closed marad; a task nem engedi a local repo gyoker vagy barmilyen ad-hoc path authority fallbacket.
3. `pairflow_command_profile = "self_host"` clone topology mellett ebben a fazisban explicit unsupported allapot; nincs silent external-profile fallback.
4. A cleanup port return shape kompatibilis marad a jelenlegi delete/merge fogyasztokkal.
5. Ha a runtime session pre-claim sikerult, de a producer finalize/update megbukik, a start hibaagnak a claimed session es a bootstrapolt workspace cleanupjaval fail-closed modon kell zarulnia.

### Contract Boundary / Blast Radius

1. `contract_boundary_override`: `yes`
2. Erintett contractok:
   - shared workspace bootstrap / cleanup contract
   - shared runtime sessions contract
   - start fresh-start producer contract
3. Blast radius guard:
   - a shared port bovitesek csak additivek lehetnek,
   - a foundation task nem huzhatja be a tmux/status/delete/merge consumer alignmentet,
   - a cleanup result-shape nem valhat `void`-da es nem veszitheti el a jelenlegi reporting mezoket.

### Complexity Risk Gate

1. `authority_risk`: `2`
2. `surface_spread`: `1`
3. `identity_join_risk`: `2`
4. `activation_coupling`: `0`
5. `prerequisite_risk`: `1`
6. `acceptance_multiplicity`: `1`
7. `risk_score`: `7`
8. `single-task allowed`: `yes`
9. Split decision note:
   - a v2 plan mar producer-only bounded taskra vette vissza ezt a fazist; a tmux/runtime, bubble-loop, read-model es activation consume kulon utodtask ownership.
10. Identity/join note:
   - canonical identity path: `bubbleConfig.work_mode -> bootstrap result -> runtime session finalize/update`
   - competing identifiers or fallback identities: `bubblePaths.worktreePath`, stale runtime session record, worktree registry, self-host local entrypoint path
11. Authority/source-of-truth note:
   - canonical source: additive workspace bootstrap result + runtime session finalize/update
   - forbidden secondary sources: statikus bubble path fallback vagy cleanup/remove+reclaim workaround authoritative update helyett

## L1 - Change Contract

### 0) Domain / Control Contract

| Item | Rule | Implementation Consequence | Priority | Timing |
|---|---|---|---|---|
| Business invariant | Fresh-start utan a bubble-nek egyetlen authoritative workspace identityje lehet. | A bootstrap resultet explicit producer authoritykent kell kezelni, nem csak helper-returnkent. | P1 | required-now |
| Control model | A workspace authorityt a bootstrap reteg allitja elo; a runtime sessions registry ennek persisted runtime tukre. | A start flowban kell post-bootstrap finalize/update seam, nem workaround reclaim. | P1 | required-now |
| Read-path rule | Ebben a fazisban csak a bootstrap result es a runtime session additive authority mezoi olvashatok canonical workspace-kent. | `commands.bootstrap` es rollback cleanup ezekre all at; tmux/status meg nem. | P1 | required-now |
| Forbidden fallback | Bootstrap utan kozvetlen `resolved.bubblePaths.worktreePath` fallback, valamint clone+self_host csendes tovabbengedes tilos. | A tasknak explicit fail-closed errorokat kell adnia, es nem szabad consumer parityt szimulalnia. | P1 | required-now |
| Missing-data rule | Ha a bootstrap nem ad explicit authorityt vagy a finalize/update nem rogzithetó, a start hibaagnak fail-closed modon kell zarulnia. | Nincs partial success claim, nincs tmux launch, nincs authority inference. | P1 | required-now |
| Phase boundary | Ez a task a producer contractot zarja le, de nem zár bubble-loop, tmux pane, read-model vagy cleanup consumer parityt. | A target file lista es a tesztmatrix nem hivatkozhat Phase 1C/1D/2B consumer cutoverre. | P2 | required-now |

### 0a) Shared Contract Compatibility

| Shared Contract | Current Consumers | Change Type (`additive|breaking|N/A`) | This Task Action | Deferred Alignment |
|---|---|---|---|---|
| `src/v11/shared/ports/worktreeWorkspace.ts` | start fresh-start, delete finalization, merge finalization, workspace tests/helpers/contract runners | additive | `workMode`, `workspaceKind`, `branchPrepared` explicit closure; `worktreePath` es cleanup result reporting retained | delete/merge consume interpretation es user-facing wording successor taskokban |
| `src/v11/shared/ports/runtimeSessions.ts` | start, list/ui/reconcile/watchdog/restart flows, many runtime tests | additive | optional authoritative workspace mezok + finalize/update port bevezetese; existing `worktreePath` retained | tmux/runtime consume alignment (Phase 1D), read-model consumers (Phase 2B) |

### 1) Call-site Matrix

| ID | File | Function/Entry | Exact Signature (args -> return) | Insertion Point | Expected Behavior | Priority | Timing | Evidence |
|---|---|---|---|---|---|---|---|---|
| CS1 | `src/v11/shared/ports/worktreeWorkspace.ts` | bootstrap workspace port | `BootstrapWorktreeWorkspacePort(input: { repoPath: string; baseBranch: string; bubbleBranch: string; worktreePath: string; workMode?: "worktree" | "clone"; localOverlay?: LocalOverlayConfig }) -> Promise<{ repoPath: string; baseRef: string; bubbleBranch: string; worktreePath: string; workspaceKind: "worktree" | "clone_root"; branchPrepared: boolean }>` | shared workspace contract | additive producer contract; `worktreePath` compatibility alias marad, de explicit authoritative workspace targette valik | P1 | required-now | T1, T2 |
| CS2 | `src/v11/infrastructure/workspace/worktreeManager.ts` | `bootstrapWorktreeWorkspace(...)`, `cleanupWorktreeWorkspace(...)` | existing exported functions | local default implementation | `worktree` modban explicit producer metadata, `clone` modban actionable fail-closed, cleanup input/output kompatibilis marad | P1 | required-now | T1, T2 |
| CS3 | `src/v11/shared/ports/runtimeSessions.ts` | runtime session shared contract | `ClaimRuntimeSessionInput`, `RuntimeSessionRecord`, `UpsertRuntimeSessionPort` | shared runtime authority contract | pre-claim + post-bootstrap finalize/update ugyanazon registryre additive mezokkel mukodik | P1 | required-now | T3, T4 |
| CS4 | `src/v11/infrastructure/executor/sessionRuntime/runtimeSessionsRegistry.ts`, `runtimeSessionsRegistryDocument.ts` | `upsertRuntimeSession(...)`, parser/serializer | existing infrastructure seam | runtime session persistence | optional authoritative workspace mezok parse/serialize kompatibilisen, existing records retained | P1 | required-now | T3, T4 |
| CS5 | `src/v11/application/start/startCommandContract.ts`, `startCommandOrchestration.ts`, `src/v11/defaults/start/startBubbleDefaults.ts` | start dependency contract and default wiring | existing start dependency resolution | producer dependency boundary | start flow explicit finalize/update dependencyt kap anelkul, hogy direct infra import smuggle-olodna be | P1 | required-now | T3 |
| CS6 | `src/v11/application/start/startCommandSession.ts` | runtime session ownership helpers | existing ownership claim layer -> claim + finalize/update helper pair | start producer seam | pre-claim megmarad, stale-record remove+reclaim csak ownership szerzesre marad, authoritative workspace update kulon explicit finalize lepes | P1 | required-now | T3, T4 |
| CS7 | `src/v11/application/start/startCommandFlows.ts` | `runFreshStartFlow(...)` | `runFreshStartFlow(...) -> Promise<FreshStartResult>` | fresh-start producer flow | bootstrap resultet elmenti, `commands.bootstrap`-nak mar az authoritative pathot adja, finalize/update-olja a runtime sessiont, es explicit `clone`/`self_host` fail-closed guardot alkalmaz | P1 | required-now | T3, T5, T6 |
| CS8 | `src/v11/application/start/startCommandCleanup.ts` | `cleanupFailedStart(...)` | existing rollback helper | fresh-start rollback path | ha van bootstrapolt workspace authority, a cleanup ezt hasznalja; nincs statikus bubble path fallback | P1 | required-now | T4 |
| CS9 | `tests/core/workspace/worktreeManager.test.ts`, `tests/core/runtime/sessionsRegistry.test.ts`, `tests/v11/application/start/startCommandOrchestration.test.ts`, `tests/core/bubble/startBubble.test.ts` | regression + producer tests | unit/integration tests | validation surface | explicit producer-only closure, additive compatibility, clone/self_host fail-closed | P1 | required-now | T1-T6 |

### 2) Data and Interface Contract

| Contract | Current | Target | Required Fields | Optional Fields | Compatibility | Priority | Timing |
|---|---|---|---|---|---|---|---|
| Workspace bootstrap input | implicit worktree-only | additive work-mode-aware input | `repoPath`, `baseBranch`, `bubbleBranch`, `worktreePath` | `workMode`, `localOverlay` | additive; omitted `workMode` = existing worktree semantics | P1 | required-now |
| Workspace bootstrap result | worktree-only return | authoritative workspace producer result | `repoPath`, `baseRef`, `bubbleBranch`, `worktreePath`, `workspaceKind`, `branchPrepared` | N/A | additive; existing `worktreePath` retained | P1 | required-now |
| Runtime session record | `repoPath`, `worktreePath`, `tmuxSessionName`, `updatedAt` | additive workspace authority metadata | existing fields retained | `workspacePath`, `workspaceKind` | additive; current consumers can ignore new fields | P1 | required-now |
| Start dependency contract | claim/remove only | explicit finalize/update runtime session seam | existing claim/remove ports | finalize/update port | additive dependency resolution | P1 | required-now |
| Clone mode local policy | config literal exists, runtime producer contract absent | explicit local default fail-closed | actionable unsupported-mode reason | N/A | semantic closure only; no public activation yet | P1 | required-now |
| `self_host` clone policy | implicit undefined behavior | explicit fail-closed | actionable unsupported-profile reason | N/A | semantic closure only; no consumer parity claimed | P1 | required-now |

Implementation notes:

1. Ebben a fazisban a `worktreePath` mezonev compatibility alias marad; a dokumentum szintjen viszont explicitten az authoritative workspace targetet jelenti.
2. A `workspaceKind` kezdetben csak `worktree | clone_root` discriminant; downstream UI/read-model consume meg nem ownershipje ennek a tasknak.
3. A runtime session shared contract bovitese optional mezokkel tortenjen; a mar letezo list/ui/reconcile/watchdog olvasok Phase 1B-ben nem valthatnak at kovetelmenyszeruen ezekre.
4. A finalize/update seam az ownership megszerzese utan ugyanazt a bubble session recordot frissiti; nem uj claim-pathot nyit.
5. A cleanup port output reporting (`removedWorktree`, `removedBranch`) valtozatlanul megmarad.

### 3) Side Effects Contract

| Area | Allowed | Forbidden | Notes | Priority | Timing |
|---|---|---|---|---|---|
| local workspace bootstrap | existing git branch + git worktree bootstrap `worktree` modban | local repo root authority fallback `clone` modban | local default implementation csak explicit fail-closed clone policyt kap | P1 | required-now |
| runtime session persistence | pre-claim + post-bootstrap finalize/update ugyanabba a registrybe | second ownership claim authoritative update helyett | ownership es authority update kulon, de koherens flow marad | P1 | required-now |
| fresh-start bootstrap command | bootstrap-result authoritative path consume | statikus `bubblePaths.worktreePath` fallback bootstrap utan | ez az egyetlen internal execution consume closure ebben a fazisban | P1 | required-now |
| fresh-start rollback | bootstrap-result identity alapjan cleanup | rollback bubble path fallback, ha a bootstrap mar mast adott vissza | cleanup consumer parity tovabbra sem scope, csak rollback target identity | P1 | required-now |

Constraint: ha itt nincs explicit engedelyezett tmux/status/CLI consumer cutover, az implementacio nem nyithat Phase 1D vagy Phase 2B scope-ot.

### 4) Error and Fallback Contract

| Trigger | Dependency (if any) | Behavior (`throw|result|fallback`) | Fallback Value/Action | Reason Code | Log Level | Priority | Timing |
|---|---|---|---|---|---|---|---|
| `work_mode = "clone"` local default bootstrap mellett | workspace bootstrap default | throw | explicit actionable unsupported-mode error; nincs local repo root fallback | `WORKSPACE_MODE_CLONE_UNSUPPORTED_LOCAL_DEFAULT` | error | P1 | required-now |
| `work_mode = "clone"` + `pairflow_command_profile = "self_host"` | fresh-start producer guard | throw | explicit unsupported profile/topology error; nincs silent external fallback | `WORKSPACE_MODE_CLONE_SELF_HOST_UNSUPPORTED` | error | P1 | required-now |
| bootstrap result `branchPrepared !== true` | bootstrap dependency | throw | start stop, nincs bootstrap command, nincs tmux launch | `WORKSPACE_BRANCH_NOT_PREPARED` | error | P1 | required-now |
| runtime session finalize/update fails | runtime session persistence dependency | throw | fresh-start fail-closed cleanup indul; nincs partial RUNNING success | `RUNTIME_SESSION_WORKSPACE_FINALIZE_FAILED` | error | P1 | required-now |
| stale runtime record present, tmux missing | ownership claim path | fallback | existing remove+reclaim ownership flow marad, majd finalize/update a claimed recordre fut | `N/A` | warn | P1 | required-now |
| cleanup target authority differs from static bubble path | rollback path | result | cleanup bootstrap-result targettel fusson, nincs statikus fallback | `N/A` | info | P1 | required-now |

### 5) Dependency Constraints

| Type | Items | Priority | Timing |
|---|---|---|---|
| must-use | `plans/remote-bubble-execution-contract-and-phasing-plan-v2.md` Phase 1B ownership es cross-phase gate sourcekent | P1 | required-now |
| must-use | `plans/archive/tasks/remote-bubble-execution-config-and-pointer-authority-phase1a.md` retained persisted-authority baselinekent | P1 | required-now |
| must-use | `docs/remote-bubble-execution.md` clone-root topology es target-level design sourcekent | P2 | required-now |
| must-not-use | `src/v11/application/start/startCommandTmuxLaunch.ts`, prompt builders, status/read-model cutover ownership Phase 1B-ben | P1 | required-now |
| must-not-use | `src/cli/index.ts`, `src/v11/shared/status/**` user-facing wording closure Phase 1B-ben | P1 | required-now |
| must-not-use | cleanup port return-shape breaking valtoztatasa vagy `void`-ra szukitese | P1 | required-now |
| must-not-use | bubble-loop actor protocol consume migration ebben a taskban | P1 | required-now |
| must-not-use | remote SSH/provisioning activation, sync hook, attach/list/status routing | P1 | required-now |

### 6) Test Matrix

| ID | Scenario | Given | When | Then | Priority | Timing | Evidence |
|---|---|---|---|---|---|---|---|
| T1 | worktree bootstrap producer metadata | local default `worktree` mode input | `bootstrapWorktreeWorkspace(...)` fut | result explicit `workspaceKind="worktree"` es `branchPrepared=true` mezoket ad vissza, a jelenlegi worktree behavior regresszio nelkul | P1 | required-now | `tests/core/workspace/worktreeManager.test.ts` |
| T2 | local default clone mode fail-closed | `workMode="clone"` local default bootstrap input | `bootstrapWorktreeWorkspace(...)` fut | actionable hiba keletkezik, nincs branch/worktree side effect, es a cleanup/result contract nem torik | P1 | required-now | `tests/core/workspace/worktreeManager.test.ts` |
| T3 | pre-claim + post-bootstrap finalize/update | CREATED bubble, bootstrap result path eltér a static bubble path-tol | fresh start flow fut | ownership claim csak egyszer szerzi meg a recordot, majd explicit finalize/update ugyanarra a bubble sessionre rogziti az authoritative workspace mezoket; `commands.bootstrap` mar ezt a pathot kapja | P1 | required-now | `tests/core/bubble/startBubble.test.ts`, `tests/core/runtime/sessionsRegistry.test.ts`, `tests/v11/application/start/startCommandOrchestration.test.ts` |
| T4 | rollback cleanup uses bootstrap authority | bootstrapolt workspace authority elter a static bubble path-tol, es utana bootstrap command vagy finalize/update hiba tortenik | fresh start hibaag lefut | cleanup a bootstrap-result targettel hivodik, a claimed runtime session eltakaritodik, es nincs static bubble path fallback | P1 | required-now | `tests/core/bubble/startBubble.test.ts` |
| T5 | clone + self_host fail-closed | bubble config `work_mode="clone"` es `pairflow_command_profile="self_host"` | fresh start flow fut | explicit unsupported error keletkezik tmux launch es remote activation nelkul | P1 | required-now | `tests/core/bubble/startBubble.test.ts` |
| T6 | additive runtime session compatibility | letezo registry rekordok csak `worktreePath`-ot hordoznak, uj rekord optional workspace authority mezokkel jon | parse/upsert/read fut | regi rekordok tovabbra is olvashatok, uj optional mezok persistalodnak, es a shared consumer-ek szamara a `worktreePath` compatibility megmarad | P1 | required-now | `tests/core/runtime/sessionsRegistry.test.ts` |

## L2 - Implementation Notes (Optional)

1. [later-hardening] Ha a `workspacePath` terminology kesobb user-facing consume-ba is bekerul, kulon taskban lehet fokozatosan atvezetni a `worktreePath` aliasrol.
2. [later-hardening] A Phase 1D taskban erdemes kulon view-level contractot irni arra, mikor fogyaszthatja a tmux/runtime pane delivery a runtime session additive workspace authority mezoket.
3. [later-hardening] A Phase 2B taskban erdemes kulon rogzitni, mikor es hogyan szabad a `workspaceKind`-et operator-facing wordingben megjeleniteni.

## Hardening Backlog (Optional)

| ID | Item | Layer | Priority | Timing | Source | Proposed Action |
|---|---|---|---|---|---|---|
| H1 | `worktreePath` terminology cleanup | L2 | P2 | later-hardening | producer contract compatibility alias | csak akkor nyitni, amikor a downstream consumer-ek mar atalltak |
| H2 | consumer-facing workspace diagnostics | L2 | P2 | later-hardening | v2 sequencing | Phase 2B read-model task ownership |
| H3 | full clone-root runtime consumer parity | L2 | P2 | later-hardening | v2 sequencing | Phase 1D + Phase 2A ownership |

## Review Control

1. Every finding must include: `priority`, `timing`, `layer`, `evidence`.
2. P1 regresszio, ha a task tmux/prompt/status/CLI consumer cutovert huz be.
3. P1 regresszio, ha a cleanup shared contract elveszti a `removedWorktree` / `removedBranch` reportingot.
4. P1 regresszio, ha a runtime authority finalize/update helyett ujabb ownership claim, remove+reclaim vagy statikus bubble path fallback lesz az authoritative update mechanizmus.
5. P1 regresszio, ha `clone` vagy `clone+self_host` csendesen tovabbfut local default bootstrap mellett.
6. P1 regresszio, ha a task Phase 1B-ben bubble-loop, read-model vagy remote activation ownershipet csusztat be.

## Spec Lock

Mark task as `IMPLEMENTABLE` when all `P0/P1 + required-now` items are closed, and specifically when:

1. a workspace bootstrap contract explicit additive producer metadata-val zarul (`workMode`, `workspaceKind`, `branchPrepared` szemantikaval),
2. a local default clone mode explicit fail-closed modon van lezarva,
3. a fresh-start runtime session ownership flow pre-claim + post-bootstrap finalize/update seammel mukodik,
4. a `commands.bootstrap` es a rollback cleanup mar a bootstrap-result authorityt hasznalja,
5. a `self_host` + clone topology explicit fail-closed,
6. a shared workspace es runtime session contractok additivek maradnak, es a delete/merge/list/ui fogyasztok Phase 1B-ben nem kenyszerulnek consumer cutoverre.
