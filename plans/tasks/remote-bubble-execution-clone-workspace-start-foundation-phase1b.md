---
artifact_type: task
artifact_id: task_remote_bubble_execution_clone_workspace_start_foundation_phase1b_v1
title: "Remote Bubble Execution Clone Workspace Start Foundation (Phase 1B)"
status: draft
phase: phase1b-clone-workspace-start-foundation
target_files:
  - src/v11/shared/ports/worktreeWorkspace.ts
  - src/v11/infrastructure/workspace/worktreeManager.ts
  - src/v11/application/start/startCommandContract.ts
  - src/v11/application/start/startCommandContext.ts
  - src/v11/application/start/startCommandOrchestration.ts
  - src/v11/application/start/startCommandFlows.ts
  - src/v11/application/start/startCommandTmuxLaunch.ts
  - src/v11/application/start/startCommandSession.ts
  - tests/v11/application/start/startCommandOrchestration.test.ts
  - tests/core/bubble/startBubble.test.ts
prd_ref: null
plan_ref: plans/remote-bubble-execution-contract-and-phasing-plan-v1.md
system_context_ref: docs/pairflow-initial-design.md
owners:
  - "felho"
---

# Task: Remote Bubble Execution Clone Workspace Start Foundation (Phase 1B)

## Current Codebase Check (2026-04-11)

1. `src/types/bubble.ts` mar tartalmazza a `work_mode = "worktree" | "clone"` shape-et, de a kodbaseben a `clone` modnak jelenleg nincs runtime consume-ja; a valos start surface tovabbra is worktree-only.
2. `src/v11/application/start/startCommandFlows.ts` a fresh-start pathban kozvetlenul a `bootstrapWorktreeWorkspace(...)` dependencyt hasznalja, majd minden tovabbi lepesben a `resolved.bubblePaths.worktreePath`-ra epit.
3. `src/v11/application/start/startCommandTmuxLaunch.ts`, `startCommandSession.ts`, valamint a start prompt/runtime helper-ek a bubble workspace cwd-jet mindenhol `worktreePath` szemantikaval fogyasztjak.
4. `src/v11/shared/ports/worktreeWorkspace.ts` es `src/v11/infrastructure/workspace/worktreeManager.ts` ma kifejezetten git worktree bootstrap/cleanup contractot formalizalnak; nincs explicit workspace-kind seam es nincs bubble-branch authoring contract clone-root esetre.
5. A jelenlegi `worktreeManager` a bubble branch-et a local repo alatt hozza letre, majd ahhoz kapcsol worktree-t; ez jo local bubble-re, de nem ugyanaz a contract, mint a remote clone gyokerben kesobbi bubble-branch authoring.
6. A start tesztek ma gyakorlatilag csak worktree-centric viselkedest fednek le; nincs explicit bizonyitek arra, hogy a start/runtime code egy elokeszitett clone-root workspace cwd-bol is konzisztensen tudna futni.
7. Emiatt Phase 2A remote provisioning elott kulon le kell zarni a start/runtime foundation seamet, hogy a kesobbi remote create/start ne worktree-hackkel, hanem explicit workspace contracttal csatlakozzon.

## Implementation Target Decision

1. `implementable_now`: `yes`
2. Ez a fazis a start/runtime foundation seamet zarja le:
   - workspace bootstrap contract consume,
   - clone-root-kompatibilis start cwd szemantika,
   - bubble branch authoring ownership,
   - local-vs-remote dependency boundary.
3. A `clone` mod ebben az initiative-ben nem onallo user-facing capability, hanem a remote execution belso workspace-formaja.
3. Nem cel:
   - remote clone letrehozas,
   - SSH/SCP helper layer,
   - `--remote` CLI activation,
   - remote `status/list/attach`,
   - merge/delete remote cleanup consume.
4. A Phase 1B outputnak ugy kell elokeszitenie a Phase 2A-t, hogy a local worktree behavior regresszio nelkul maradjon, mikozben a start flow mar ne legyen implicit worktree-only.

## L0 - Policy

### Goal

Lezarni a remote-aware start foundationt ugy, hogy a start/runtime code explicit workspace seamre tamaszkodjon, ne implicit git worktree feltetelezesre.

A task celja, hogy a kesobbi remote clone-root workspace delivery Phase 2A-ban mar egy stabil start contractra uljon ra, ne egy worktree-centric flowra ragasztott special case-kent jelenjen meg.

### In Scope

1. A start/runtime dependency seam olyan bovitese, hogy a start flow egy effektiv workspace cwd-bol tudjon futni, ne csak `bubblePaths.worktreePath`-ra epitve.
2. Workspace bootstrap contract formalizalasa `work_mode` figyelembevetelevel.
3. Bubble branch authoring ownership explicit rogzitesi a workspace bootstrap retegben.
4. Local default viselkedes explicit megtartasa `worktree` modban.
5. Fail-closed local default viselkedes clone modban addig, amig Phase 2A nem ad tenyleges clone-root provisioning dependencyt.
6. Fresh-start tesztek, amelyek bizonyitjak, hogy a start/runtime code dependency-injected clone-root workspace cwd-vel is futtathato.
7. Local regresszio tesztek, amelyek bizonyitjak, hogy a jelenlegi worktree mode nem torik el.

### Out of Scope

1. Remote clone provisioning vagy remote repo sync.
2. Bubble create `--remote` CLI input vagy remote pointer/cache init.
3. SSH command assembly, SCP artifact copy, port-forward, attach consume.
4. Remote runtime state read-model (`status`, `list`) consume.
5. Remote lifecycle mutation routing (`approve/rework/commit/merge/delete`).
6. A teljes kodbazisban a `worktreePath` elnevezes atnevezese `workspacePath`-ra.

### Safety Defaults

1. `work_mode = "worktree"` eseten a jelenlegi local bootstrap path marad canonical default.
2. `work_mode = "clone"` ebben a roadmapban belso runtime forma, nem kozvetlen user intent. Publikus szinten a felhasznaloi szandek a kesobbi fazisokban `--remote <host>` lesz, nem a standalone clone mode.
3. `work_mode = "clone"` eseten a local default bootstrap implementation nem probalhat a local repoPath-on clone-root shortcutot futtatni; explicit actionable hibaval fail-closed marad, ha nincs erre dedikalt dependency.
4. A start flow nem authoralhat bubble branch-et a workspace bootstrap retegen kivul.
5. Ha a bootstrap dependency visszaad egy workspace cwd-t, a tmux/session/bootstrap command consume minden tovabbi lepesben ezt a cwd-t hasznalja.
6. A task nem nyit remote transport side effectet es nem teszi a local repo gyokeret bubble workspace authorityva clone modban.

### Contract Boundary / Blast Radius

1. `contract_boundary_override`: `yes`
2. Erintett contractok:
   - bubble config `work_mode` runtime szemantikaja
   - start/runtime dependency contract
   - workspace bootstrap / cleanup side-effect contract
3. Phase-guard:
   - a task csak foundation seamet zar le; remote delivery es activation tovabbra is kulon task ownership.
4. Exposure-guard:
   - a task nem emelheti a `clone` modot onallo public API-vagy user-facing workflow-vá; a publikus activation tovabbra is a kesobbi remote flow ownership.

### Complexity Risk Gate

1. `authority_risk`: `1`
2. `surface_spread`: `1`
3. `identity_join_risk`: `1`
4. `activation_coupling`: `1`
5. `prerequisite_risk`: `1`
6. `acceptance_multiplicity`: `1`
7. `risk_score`: `6`
8. `single-task allowed`: `yes`
9. Split decision note:
   - a plan mar kulonvalasztotta a foundation (Phase 1B) es a delivery (Phase 2A) scope-ot; ebben a taskban nincs remote activation
10. Identity/join note:
   - canonical identity path: `bubbleConfig.work_mode -> workspace bootstrap result -> effective workspace cwd -> tmux/runtime session cwd`
   - competing identifiers or fallback identities: `repoPath`, `bubblePaths.worktreePath`, local checkout cwd, implicit git branch state; ezek nem irhatjak felul az explicit bootstrap-result cwd-t
11. Authority/source-of-truth note:
   - canonical source: a workspace bootstrap dependency altal visszaadott workspace contract
   - forbidden secondary sources: kozvetlen `bubblePaths.worktreePath` consume akkor is, ha a bootstrap mas cwd-t adott vissza

## Sandbox Compatibility Gate

Reference: `docs/architecture/sandbox-compatibility-gate.md`

1. `SG1 Runtime Boundary Preservation`
   - megfeleles: a task csak a start/runtime workspace seamet zarja le; nem mossa ossze a start/attach/cleanup/operator read-model fogalmakat
2. `SG2 Host Path Non-Authority`
   - megfeleles: a workspace cwd explicit bootstrap-result marad; a host path onmagaban nem lesz remote identity vagy operator authority
3. `SG3 Host-Tool Decoupling`
   - megfeleles: a start flow nem kodol bele host-specifikus git/tmux/ssh topology assumptiont a bubble configba; a workspace bootstrap dependency marad a hatar
4. `SG4 Wrapper-Ready Execution`
   - megfeleles: a kesobbi remote adapter egyetlen workspace bootstrap seamen tud csatlakozni, nem szetszort worktree-path fallbackekre
5. `SG5 Explicit Non-Goals for Isolation`
   - explicit non-goalok:
     - SSH transport
     - remote clone provisioning
     - attach/port-forward semantics
     - local checkout mutation remote merge kozben

## L1 - Change Contract

### 1) Call-site Matrix

| ID | File | Function/Entry | Exact Signature (args -> return) | Insertion Point | Expected Behavior | Priority | Timing | Evidence |
|---|---|---|---|---|---|---|---|---|
| CS1 | `src/v11/shared/ports/worktreeWorkspace.ts` | workspace bootstrap/cleanup port shape | `BootstrapWorktreeWorkspacePort(input: { repoPath: string; baseBranch: string; bubbleBranch: string; worktreePath: string; workMode: "worktree" | "clone"; localOverlay?: LocalOverlayConfig }) -> Promise<{ repoPath: string; baseRef: string; bubbleBranch: string; worktreePath: string; workspaceKind: "worktree" | "clone_root"; branchPrepared: boolean }>` | workspace bootstrap boundary | a port explicitten hordozza a `workMode` consume-jat es azt, hogy a visszaadott `worktreePath` effective workspace cwd-kent kezelendo, nem csak git worktree pathkent | P1 | required-now | T1, T2 |
| CS2 | `src/v11/infrastructure/workspace/worktreeManager.ts` | local default bootstrap/cleanup | existing exported `bootstrapWorktreeWorkspace`, `cleanupWorktreeWorkspace` | local workspace implementation | `worktree` modban megtartja a jelenlegi behavior-t; `clone` modban explicit fail-closed actionable hibaval leall, ahelyett hogy a local repo gyokeret hasznalna bubble workspacekent | P1 | required-now | T2, T3 |
| CS3 | `src/v11/application/start/startCommandFlows.ts` | fresh start workspace consume | `runFreshStartFlow(...) -> Promise<FreshStartResult>` | fresh start orchestration | a bootstrap dependency altal visszaadott effective workspace cwd-t hasznalja a bootstrap command, tmux launch es runtime session consume tovabbi lepesekhez; a start flow maga nem authoral branch-et | P1 | required-now | T1, T4 |
| CS4 | `src/v11/application/start/startCommandContext.ts` | start execution context workspace contract | `loadStartExecutionContext(...) -> Promise<StartExecutionContext>` | start context assembly | a context hordozza az effective workspace cwd consume-jat ugy, hogy a tobbi start helper ne kozvetlenul `bubblePaths.worktreePath`-ot olvasson mindenhol | P1 | required-now | T1, T4 |
| CS5 | `src/v11/application/start/startCommandTmuxLaunch.ts` | tmux launch cwd and prompt consume | fresh/resume tmux launch helper layer | tmux/prompt assembly | a status/agent commandok es kickoff promptok cwd-je az effective workspace cwd-re epul; nem fixen a bubble path-derived worktree locationre | P1 | required-now | T4, T5 |
| CS6 | `src/v11/application/start/startCommandSession.ts` | runtime session claim metadata | existing runtime session claim helper | start runtime ownership seam | a runtime session record cwd metadataja az effective workspace cwd-vel iródik, igy a kesobbi tmux delivery/restart surfaces nem tornek clone-root eseten | P1 | required-now | T4 |
| CS7 | `src/v11/application/start/startCommandOrchestration.ts` | dependency resolution invariants | `resolveStartBubbleDependencies(...) -> Promise<ResolvedStartBubbleDependencies>` | start dependency resolution | a workspace bootstrap seam tovabbra is dependency-injected marad; Phase 1B nem kodol be remote transportot a start orchestrationbe | P2 | required-now | T1, T2 |
| CS8 | `tests/v11/application/start/startCommandOrchestration.test.ts` | dependency + mode tests | unit tests | existing start orchestration test surface | explicit coverage a workspace bootstrap seam consume-jara es a clone fail-closed local default policyra | P1 | required-now | T1, T2 |
| CS9 | `tests/core/bubble/startBubble.test.ts` | fresh-start integration tests | unit/integration tests | existing core start test surface | worktree regresszio coverage + dependency-injected clone-root workspace cwd coverage | P1 | required-now | T3, T4, T5 |

### 2) Data and Interface Contract

| Contract | Current | Target | Required Fields | Optional Fields | Compatibility | Priority | Timing |
|---|---|---|---|---|---|---|---|
| Bubble `work_mode` runtime semantics | schema-level literal only; runtime consume implicit worktree-only | explicit start/runtime seam consume | `work_mode = "worktree" | "clone"` | N/A | additive semantic closure; existing `worktree` default retained | P1 | required-now |
| Workspace bootstrap result | git-worktree-oriented result | generic effective workspace cwd contract | `repoPath`, `baseRef`, `bubbleBranch`, `worktreePath`, `workspaceKind`, `branchPrepared` | local overlay continue input-side only | non-breaking for local mode if `worktreePath` field retained; clone-root semantics explicit | P1 | required-now |
| Bubble branch authoring ownership | implicit in local worktree manager | explicit workspace bootstrap responsibility | `bubbleBranch`, `branchPrepared = true` before agent launch | N/A | clarifying contract; no second branch creation in start flow | P1 | required-now |
| Start runtime cwd consume | fixed `bubblePaths.worktreePath` reads in multiple helpers | effective workspace cwd propagated from bootstrap result | `worktreePath` field as effective cwd | `workspaceKind` for diagnostic routing | internal contract hardening for later remote consume | P1 | required-now |
| Public exposure of `clone` mode | schema literal exists, but no clear product policy | `clone` remains internal execution topology, not direct user intent; public activation belongs to remote flow | public user intent = remote execution selection | internal `work_mode = "clone"` wiring | standalone clone-without-remote remains unsupported | P1 | required-now |

Implementation notes:

1. Phase 1B-ben a `worktreePath` mezonev megtarthato compatibility okbol, de a dokumentum szintjen explicitten rogzitett, hogy ez az effective workspace cwd, es clone-root eseten nem feltetlen git worktree.
2. A bubble branch authoring a workspace bootstrap reteg ownershipje; a start flow csak egy mar bubble-branchre allitott workspace-szel dolgozhat.
3. A local default implementation Phase 1B-ben nem vallal clone-root provisioninget; clone mode local defaulton fail-closed marad, amig Phase 2A nem ad kulon bootstrap dependencyt.
4. A task nem vezeti be a remote pointer/cache consume-ot; csak azt zarja le, hogy a start/runtime flow nem worktree-path hardcode-ra epul.
5. A `clone` mode termekjelentese ebben az initiative-ben: remote execution internal workspace form. Nem cel, hogy a user kesobb kozvetlenul `clone` topologiat valasszon `--remote` nelkul.

### 3) Side Effects Contract

| Area | Allowed | Forbidden | Notes | Priority | Timing |
|---|---|---|---|---|---|
| local workspace bootstrap | `worktree` modban existing git branch + git worktree bootstrap | clone modban local repo gyoker bubble workspacekent hasznalata | a default local implementation Phase 1B-ben csak worktree-t tamogat | P1 | required-now |
| clone mode on local default | explicit actionable reject | silent fallback `worktree`-ra vagy local checkout mutate-olasa | fail-closed safety boundary | P1 | required-now |
| start runtime consume | bootstrap-result cwd tovabbadasa tmux/session/bootstrap commandnak | kozvetlen `bubblePaths.worktreePath` hardcode a workspace bootstrap utan | ez a foundation task fo closure-je | P1 | required-now |
| branch preparation | workspace bootstrap reteg ownershipje | branch authoring duplikalasa start flowban vagy tmux launch elott ad-hoc git parancsokkal | remote clone-root es local worktree ugyanarra a contractra uljon | P1 | required-now |

Constraint: ha nincs explicit transport/SSH side effect engedelyezve, az implementacio nem vezethet be remote network orchestrationt ebben a taskban.

### 4) Error and Fallback Contract

| Trigger | Dependency (if any) | Behavior (`throw|result|fallback`) | Fallback Value/Action | Reason Code | Log Level | Priority | Timing |
|---|---|---|---|---|---|---|---|
| `work_mode = "clone"` local default bootstrap mellett | workspace bootstrap default | throw | explicit actionable error, hogy clone mode runtime bootstrap kulon dependencyt igenyel | `WORKSPACE_MODE_CLONE_UNSUPPORTED_LOCAL_DEFAULT` | error | P1 | required-now |
| direct standalone clone intent remote context nelkul | future public API / config consume | throw | explicit unsupported-mode error; remote selection marad a user-facing activation path | `WORKSPACE_MODE_CLONE_REQUIRES_REMOTE_CONTEXT` | error | P1 | required-now |
| workspace bootstrap branch-et nem keszitette elo | workspace bootstrap dependency | throw | start stop, nincs tmux launch | `WORKSPACE_BRANCH_NOT_PREPARED` | error | P1 | required-now |
| bootstrap-result cwd es fallback worktree path elterese mellett helper meg fallbacket olvasna | start/runtime helper contract | throw vagy explicit tesztfail | nincs silent fallback | `WORKSPACE_PATH_FALLBACK_FORBIDDEN` | error | P1 | required-now |
| injected clone-root bootstrap sikeres | alternate bootstrap dependency | result | start flow a visszaadott cwd-vel tovabbfut | `N/A` | info | P1 | required-now |
| existing worktree bootstrap path | local default bootstrap | result | current behavior retained | `N/A` | info | P1 | required-now |

### 5) Dependency Constraints

| Type | Items | Priority | Timing |
|---|---|---|---|
| must-use | `plans/remote-bubble-execution-contract-and-phasing-plan-v1.md` Phase 1B ownership es validation strategy | P1 | required-now |
| must-use | `plans/archive/tasks/remote-bubble-execution-config-and-pointer-authority-phase1a.md` Phase 1A foundation contract sourcekent | P1 | required-now |
| must-use | `docs/remote-bubble-execution.md` clone-root start design sourcekent | P1 | required-now |
| must-not-use | SSH/SCP/helper transport code ebben a taskban | P1 | required-now |
| must-not-use | `clone` mod direct user-facing featurekent vagy standalone public API-kent valo expose-olasa | P1 | required-now |
| must-not-use | `status/list/attach/merge/delete` remote consume scope becsusztatasa | P1 | required-now |
| must-not-use | clone mode silent fallbackja local worktree-re vagy local checkout mutate-olasara | P1 | required-now |
| must-not-use | start helperekben kozvetlen `bubblePaths.worktreePath` hardcode a bootstrap-result cwd helyett | P1 | required-now |

### 6) Test Matrix

| ID | Scenario | Given | When | Then | Priority | Timing | Evidence |
|---|---|---|---|---|---|---|---|
| T1 | effective workspace cwd is propagated | injected workspace bootstrap returns `workspaceKind = "clone_root"` and a clone-root cwd | fresh start flow runs | bootstrap command, tmux launch, runtime session claim ugyanazzal a returned cwd-vel fut; nincs hidden fallback a bubble path-derived worktree locationre | P1 | required-now | `tests/core/bubble/startBubble.test.ts`, `tests/v11/application/start/startCommandOrchestration.test.ts` |
| T2 | local default clone mode fail-closed | bubble config has `work_mode = "clone"` and only local default bootstrap is available | start flow runs | explicit actionable error keletkezik; nincs local repo root fallback es nincs tmux launch | P1 | required-now | `tests/core/bubble/startBubble.test.ts` |
| T3 | existing worktree start remains unchanged | bubble config has `work_mode = "worktree"` | fresh start flow runs | current local worktree bootstrap, bootstrap command run, tmux launch es runtime session behavior regresszio nelkul megmarad | P1 | required-now | `tests/core/bubble/startBubble.test.ts` |
| T4 | branch authoring remains bootstrap-owned | bootstrap dependency reports branch prepared | fresh start flow runs | a start flow nem futtat masodik branch-authoring lepeseket; a tmux launch mar bubble-branchre keszitett workspace-re ul | P1 | required-now | `tests/core/bubble/startBubble.test.ts` |
| T5 | prompt and tmux cwd use effective workspace | injected clone-root cwd differs from `bubblePaths.worktreePath` | fresh or resume tmux launch helper runs | a prompt/status commandok a returned cwd-t hordozzak, igy a branch/workspace utmutatas nem felrevezeto | P1 | required-now | `tests/v11/application/start/startCommandOrchestration.test.ts` |

## L2 - Implementation Notes (Optional)

1. [later-hardening] A `worktreePath` elnevezes kesobb fokozatosan `workspacePath`-ra nevezheto at, ha a public CLI/API surface mar tenylegesen remote clone-root modot is publikusan hordoz.
2. [later-hardening] Kulon `workspaceKind`-aware diagnostics formatter johet a start/status CLI surface-re, ha a clone-root consume mar operatori szinten is lathato.
3. [later-hardening] A worktree manager modul kesobb szetvalaszthato generic workspace bootstrap adapterre es local git-worktree implementationre, ha a remote adapter mar konkret.

## Hardening Backlog (Optional)

| ID | Item | Layer | Priority | Timing | Source | Proposed Action |
|---|---|---|---|---|---|---|
| H1 | `worktreePath` terminology cleanup | L2 | P2 | later-hardening | Phase 1B drafting | csak akkor atnevezni, amikor a public consume mar tenylegesen erintett |
| H2 | dedicated clone-root diagnostics surface | L2 | P3 | later-hardening | Phase 2A/2B follow-up | status/list taskban kezelni, ne ebben a foundation taskban |

## Review Control

1. Every finding must include: `priority`, `timing`, `layer`, `evidence`.
2. P1 regresszio, ha a task remote transportot vagy operator consume scope-ot huz be.
3. P1 regresszio, ha clone mode local defaulton silent fallbackkal a local repo rooton futna tovabb.
4. P1 regresszio, ha a start/runtime helpers a bootstrap-result cwd helyett tovabbra is rejtett fallbackkent `bubblePaths.worktreePath`-ot olvasnak.
5. P1 regresszio, ha a task a `clone` modot onallo, `--remote` nelkul is ajanlott vagy tamogatott user-facing capabilitykent pozicionalja.
6. A task csak akkor lehet `IMPLEMENTABLE`, ha a bounded foundation scope megmarad: workspace/start seam igen, remote provisioning nem.

## Spec Lock

Ez a task akkor jelolheto `IMPLEMENTABLE`-nek, ha:

1. a start/runtime path consume explicit workspace seamre all at,
2. a bubble branch authoring ownership a workspace bootstrap retegben van rogzitve,
3. a local worktree behavior regresszio nelkul megmarad,
4. a local default clone mode fail-closed marad remote provisioning dependency hianyaban,
5. a `clone` mod internal remote workspace formakent van rogzitve, nem standalone public capabilitykent,
6. a Phase 2A remote delivery ehhez a seamehez tud csatlakozni worktree-hack nelkul.

## Assumptions

1. A `work_mode = "clone"` schema mar eleg foundation ahhoz, hogy Phase 1B-ben runtime seam consume szuressen ra, uj bubble config field nelkul.
2. A kesobbi remote delivery kulon bootstrap dependencyvel fog csatlakozni, nem a local default worktree managerbe fog beletorni.
3. A Phase 1A contract mar le van zarva, es a current reference a tarolt archive task.

## Open Questions

1. Nem blokkolo: a public start result es CLI output mikor nevezze at a `worktreePath` szemantikajat `workspacePath`-ra. Jelen taskban ez meg maradhat compatibility alias.
