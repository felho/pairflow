---
artifact_type: task
artifact_id: task_remote_bubble_execution_phase2a_local_clone_topology_activation_v1
title: "Remote Bubble Execution Local Clone Topology Activation (Phase 2A)"
status: implementable
phase: phase2a-local-clone-topology-activation
target_files:
  - src/v11/application/start/startCommandApi.ts
  - src/v11/application/start/startCommandFlows.ts
  - src/v11/application/start/startCommandLaunchWorkspace.ts
  - src/v11/application/start/startCommandRuntime.ts
  - src/v11/application/start/startCommandSession.ts
  - src/v11/infrastructure/workspace/worktreeManager.ts
  - tests/core/bubble/startBubble.test.ts
  - tests/core/workspace/worktreeManager.test.ts
  - tests/v11/application/start/startCommandLaunchWorkspace.test.ts
  - tests/contracts/v11/start.contract.runner.ts
  - tests/contracts/v11/cases/start/start-clone-not-activated-v11.case.json
  - tests/contracts/v11/cases/start/start-clone-not-activated-resume-v11.case.json
  - tests/contracts/v11/cases/start/start-clone-not-activated-resume-waiting-human-v11.case.json
  - tests/contracts/v11/cases/start/start-clone-not-activated-resume-ready-for-human-approval-v11.case.json
  - tests/contracts/v11/cases/start/start-clone-not-activated-resume-approved-for-commit-v11.case.json
  - tests/contracts/v11/cases/start/start-clone-not-activated-resume-committed-v11.case.json
prd_ref: null
plan_ref: plans/remote-bubble-execution-contract-and-phasing-plan-v2.md
system_context_ref: docs/pairflow-initial-design.md
owners:
  - "felho"
---

# Task: Remote Bubble Execution Local Clone Topology Activation (Phase 2A)

## Current Codebase Check (2026-04-14)

1. A Phase 1B1-1E lezarta az activation prerequisite-eket:
   - a workspace authority contract es producer seam mar explicit,
   - a start/tmux launch, runtime delivery, reviewer-context es bubble-loop consume mar canonical workspace authorityt fogyaszt,
   - a local clone lifecycle cleanup family mar topology-aware contracttal zarul.
2. A local clone-topology ennek ellenere tovabbra is explicit fail-closed:
   - `src/v11/application/start/startCommandApi.ts` preflight szinten azonnal `WORKSPACE_MODE_CLONE_NOT_ACTIVATED` hibaval lep ki,
   - `src/v11/application/start/startCommandLaunchWorkspace.ts` fresh es resume oldalon is kulon tiltja a `workspaceKind === "clone"` authorityt,
   - a start contract es a core start tesztek ezt a retained reject viselkedest bizonyitjak.
3. A bootstrap producer seam ugyanakkor megvan, de jelenleg csak registered worktree topologyt allit elo:
   - `src/v11/infrastructure/workspace/worktreeManager.ts` `bootstrapWorktreeWorkspace(...)` ma mindig `git worktree add`-ot hasznal,
   - a visszaadott `WorktreeBootstrapResult` mindig `workspaceKind: "worktree"` es `workspacePath === worktreePath`.
4. A runtime consume oldali activation prerequisites mar alkalmasak clone authority fogadasara:
   - a runtime session record tud `workspacePath` + `workspaceKind` mezot tarolni,
   - a `resolveRuntimeSessionWorkspaceAuthority(...)` helper explicit clone authorityt fel tud oldani, ha az tenyleg perzisztalva van,
   - a tmux / reviewer / bubble-loop family mar a canonical `workspacePath` mezot fogyasztja.
5. Emiatt a Phase 2A mar tenyleg activation task lehet:
   - a retained global clone rejectet el kell tavolitani a helyi start/resume pathrol,
   - fresh startnal a bootstrap seamnek valodi clone topologyt kell eloallitani,
   - resume pathnal ugyanazt a perzisztalt clone authorityt kell tovabbfuttatni,
   - mindezt ugy, hogy a remote create/start/status/list/attach es a `pairflow_sync_command` tovabbra is successor-only maradjon.

## Implementation Target Decision

1. `implementable_now`: `yes`
2. Ez a fazis mar `runtime_activation` task.
3. A feladat a local `work_mode=clone` start/resume success path bekapcsolasa ugy, hogy a bubble vegig ugyanazon canonical workspace authority chainen maradjon:
   - fresh start clone topologyban mar nem explicit rejecttel all meg,
   - a workspace bootstrap producer seam nem registered worktree-t, hanem explicit clone git workspace-et hoz letre,
   - a runtime session a clone workspace authorityt perzisztalja,
   - a tmux launch, bootstrap command es resume flow mar ezt a clone authorityt hasznalja.
4. A task nem vallalja:
   - `bubble create --remote` vagy barmilyen operator write-path expose-ot,
   - remote SSH clone/start orchestrationt,
   - `pairflow_sync_command` config vagy invoke contractot,
   - remote status/list/attach consume-ot,
   - remote mutation routingot.
5. A local lifecycle family Phase 1E-ben lezart baseline-ra tamaszkodni kell:
   - a sikeresen aktivalt local clone bubble commit/merge/delete szempontbol mar a Phase 1E topology-aware contractjat hasznalja,
   - a Phase 2A nem nyithat uj local cleanup semantikakat.

## L0 - Policy

### Goal

Aktivalni a local clone-topology start/resume pathot ugy, hogy a bubble friss starttol a kesobbi loop/lifecycle familyig ugyanazon explicit clone workspace authorityn fusson, mikozben a worktree-mode baseline valtozatlan marad, es semmilyen remote/operator surface nem nyilik meg ebben a fazisban.

### Domain / Control Model Summary

1. Business invariant: sikeres local clone bubble start eseten az executable workspace truth nem eshet vissza retained worktree heurisztikara; bootstrap, session authority, tmux launch es resume ugyanazt az explicit clone workspace authorityt kell hasznalja.
2. Control model:
   - fresh startban a bootstrap producer seam donti el a canonical launch workspace-et,
   - resume startban a perzisztalt runtime session authority dönt,
   - `bubblePaths.worktreePath` retained bubble-path marad, nem implicit executable fallback authority.
3. Read-path rule:
   - fresh start: `bubbleConfig.work_mode=clone` -> topology-aware bootstrap -> explicit clone `workspacePath`/`workspaceKind` -> runtime session persist -> bootstrap command / tmux launch,
   - resume: `runtimeSessionRecord.workspacePath` + `workspaceKind=clone` -> `resolveRuntimeSessionWorkspaceAuthority(...)` -> tmux relaunch,
   - a korabbi phases consume-feluletei tovabbra is ezt a runtime/session authority chain-t hasznaljak.
4. Forbidden fallback:
   - global `WORKSPACE_MODE_CLONE_NOT_ACTIVATED` reject retained hagyasa a local start/resume happy pathon,
   - clone workspace implicit worktree topologykent eloallitasa csak azert, mert ugyanaz a path,
   - clone resume legacy `worktreePath` fallbackal explicit `workspacePath` nelkul,
   - remote executor / remote create / sync-hook consume rejtett megnyitasa a local activation taskban.
5. Allowed resolution path:
   - local `work_mode=clone` fresh start -> explicit clone workspace bootstrap ugyanazon bubble workspace path familyben -> runtime session persist -> tmux launch,
   - local `work_mode=clone` resume -> explicit persisted clone workspace authority consume,
   - worktree mode retained baseline,
   - local lifecycle cleanup retained Phase 1E contract.
6. Missing-data rule:
   - ha a clone bootstrap nem ad explicit canonical workspace authorityt, start fail-closed,
   - ha a clone runtime session csak legacy worktree fallbackot hordoz explicit clone authority nelkul, resume fail-closed,
   - ha a clone workspace bootstrap/source prep nem fejezheto be, nincs RUNNING state.
7. Phase boundary:
   - prerequisite closures: predecessor-owned, Phase 1B1-1E mar lezarta a contract/producer/runtime/bubble-loop/local-cleanup familyt,
   - activation closure: owned here a local `start` fresh/resume pathon,
   - operator write closure: successor-only, Phase 2B,
   - remote pre-start sync hook closure: successor-only, Phase 2C,
   - remote SSH start closure: successor-only, Phase 2D,
   - operator read-model es remote mutation routing: successor-only.

### Authority Boundary Map

1. `authority_producer`
   - `src/v11/infrastructure/workspace/worktreeManager.ts` `bootstrapWorktreeWorkspace(...)`
   - fresh start runtime session persist path
2. `persisted_authority`
   - runtime session record `workspacePath`, `workspaceKind`, retained `worktreePath`
   - bubble config `work_mode`, `bubble_branch`, `base_branch`
3. `internal_execution_consumers` in scope
   - `src/v11/application/start/startCommandApi.ts`
   - `src/v11/application/start/startCommandFlows.ts`
   - `src/v11/application/start/startCommandLaunchWorkspace.ts`
   - `src/v11/application/start/startCommandSession.ts`
   - `src/v11/infrastructure/workspace/worktreeManager.ts`
4. Explicit out-of-scope consumers
   - `bubble create --remote` es remote pointer/cache write model
   - `pairflow_sync_command` config/invoke
   - remote SSH runner es remote tmux startup
   - operator read-model (`status`, `list`, `attach`)
   - remote approval/rework/cleanup routing
5. Export surfaces closed in this phase:
   - `yes`, de csak a local `start` activation surface-en
   - remote/operator export surfaces tovabbra is nyitva maradnak successor taskokra

### Baseline Preservation

1. Must-preserve behaviors:
   - worktree-mode fresh es resume start viselkedese valtozatlan maradjon,
   - a Phase 1C1-1D canonical workspace consume chain valtozatlan maradjon, csak mar clone authorityt is elfogadjon,
   - a Phase 1E local lifecycle cleanup baseline valtozatlanul ervenyes maradjon a sikeresen aktivalt clone bubble-re is,
   - remote surfaces tovabbra se nyiljanak meg.
2. Allowed resolution paths:
   - worktree mode: retained registered worktree bootstrap es start,
   - clone mode: explicit clone bootstrap -> persisted clone session authority -> tmux/resume consume,
   - resume legacy worktree fallback csak worktree topologyra ervenyes.
3. Forbidden regression interpretations:
   - a local clone activation nem jelent remote create/start supportot,
   - a local clone activation nem autorizalja a `pairflow_sync_command` consume-ot,
   - a local clone activation nem teszi meg a retained `worktreePath`-ot generic fallback executable rootta clone resume alatt.
4. Replacement proof required if removed:
   - ha barmely worktree-mode start regression felmerul, explicit bizonyitani kell, hogy a retained worktree bootstrap + resume baseline valtozatlanul zoldben marad.

### In Scope

1. Local clone fresh start explicit activationja.
2. Local clone resume explicit activationja perzisztalt workspace authorityrol.
3. A bootstrap workspace producer seam clone topologyra bovitese.
4. A start contract es a start test matrix frissitese az uj activation semanticsre.

### Out of Scope

1. `bubble create --remote`
2. Remote SSH start
3. `pairflow_sync_command`
4. Remote status/list/attach
5. Remote approval/rework/cleanup routing

### Target File Precision

1. A primer implementation surface a front matterben felsorolt start/bootstrap production es teszt file-okra szukul; ezek fedik a Phase 2A activation seam tenyleges entrypointjait.
2. Nincs elore-jovahagyott incidental production vagy test file escape hatch a felsorolt `target_files` listan kivul.
3. Ha a local clone activation typed boundary zarasa a listan kivuli filet igenyelne, azt scope blockernek kell tekinteni, es a taskot kell elobb pontositani.
4. A `target_files` listan kivuli remote/operator surfaces tovabbra is tiltottak:
   - local create/write path files,
   - remote executor config/pointer/cache files,
   - status/list/attach CLI consume,
   - remote mutation router files.

### Safety Defaults

1. Clone activation csak explicit canonical workspace authorityval engedelyezett.
2. Clone resume legacy fallback nelkul explicit fail-closed marad.
3. Worktree mode nem regresszalodhat.
4. Remote surfaces erintetlenek maradnak.

### Contract Boundary / Blast Radius

1. `contract_boundary_override`: `yes`
2. Erintett contractok:
   - local `start` fresh/resume public behavior
   - `bootstrapWorktreeWorkspace(...)` workspace topology contract
   - start contract fixture/case semantics clone scenarioiban
3. Fan-out note:
   - a valtozas elsodlegesen start-time activation,
   - de ugyanazt a canonical workspace authority shape-et fogyasztja a korabbi phases tmux/runtime/bubble-loop consume csaladja,
   - remote/write/read surfaces tovabbra is kulon maradnak.

### Complexity Risk Gate

1. `authority_risk`: `1`
2. `surface_spread`: `1`
3. `identity_join_risk`: `2`
4. `activation_coupling`: `2`
5. `prerequisite_risk`: `1`
6. `acceptance_multiplicity`: `1`
7. `risk_score`: `8`
8. `single-task allowed`: `yes`, mert ez mar a plan altal elokeszitett activation closure, nem uj foundation + activation bundle
9. If `no`, required split:
   - `N/A`
   - `N/A`
   - `N/A`
10. Identity/join note:
   - canonical identity path: bootstrap/runtime-session workspace authority -> start launch workspace -> tmux launch/resume
   - competing identifiers or fallback identities: retained `worktreePath`, retained global clone reject, legacy clone fallback explicit `workspacePath` nelkul
11. Authority/source-of-truth note:
   - canonical source: explicit clone `workspacePath` + `workspaceKind`
   - forbidden secondary source: bare `worktreePath` clone executable truthkent explicit authority nelkul

## L1 - Change Contract

### 0) Domain / Control Contract

| Item | Rule | Implementation Consequence | Priority | Timing |
| --- | --- | --- | --- | --- |
| Business invariant | Local clone bubble start/resume ugyanazon explicit workspace authority chainen fut vegig. | A clone activation nem maradhat global reject, de nem is eshet vissza worktree heurisztikara. | P1 | required-now |
| Control model | Fresh startban a bootstrap result, resume-ban a runtime session authority dönt. | A `work_mode=clone` activation producer es consume oldalon is explicit authorityra epul. | P1 | required-now |
| Read-path rule | Start launch workspace csak explicit `workspacePath`/`workspaceKind` authorityt olvashat clone topologyban. | `startCommandLaunchWorkspace.ts` clone authorityt elfogad, de authority-hianyban fail-closed marad. | P1 | required-now |
| Forbidden fallback | Generic clone-not-activated reject, legacy clone worktree fallback, remote scope-csuszatas tiltott. | A local start sikerulhet clone mode-ban, de csak a local activation seamen. | P1 | required-now |
| Allowed resolution path | clone bootstrap -> runtime session persist -> bootstrap command/tmux -> resume ugyanarra az authorityra. | A Phase 1C1-1E retained consumers mar ugyanazt az authorityt fogyasztjak. | P1 | required-now |
| Missing-data rule | Canonical clone authority nelkul nincs clone start/resume success. | `START_LAUNCH_WORKSPACE_UNAVAILABLE` vagy ekvivalens fail-closed hiba marad. | P1 | required-now |
| Phase boundary | Ez csak local clone runtime activation. | Remote create/start/read-model/mutation routing nem nyilhat meg. | P1 | required-now |

### 0a) Shared Contract Compatibility (if applicable)

| Shared Contract | Current Consumers | Change Type (`additive|breaking|N/A`) | This Task Action | Deferred Alignment |
| --- | --- | --- | --- | --- |
| `bootstrapWorktreeWorkspace(...)` workspace topology contract | start fresh flow, workspace manager tests, start contract fixtures | additive / behaviorally breaking | clone mode-ban valodi clone git workspace-et allit elo es explicit `workspaceKind: "clone"` authorityt ad vissza, worktree mode retained mellett | remote create/write exposure Phase 2B |
| local `startBubble(...)` clone behavior | public start API, start contract, core start tests | breaking | a retained clone reject helyett local clone fresh/resume activation success path nyilik meg; fail-closed mar csak authority-hiany vagy bootstrap error esetén marad | remote SSH start Phase 2D |
| runtime session workspace authority consume | start launch workspace resolver, tmux/runtime/bubble-loop retained consumers | additive | explicit persisted clone authority elfogadott es kotelezo resume pathkent; legacy clone fallback tovabbra is tiltott | remote read-model successor-only |

### 0b) Baseline Preservation (if applicable)

| Current Behavior | Preserve/Replace/Forbid | Required Proof | Priority | Timing |
| --- | --- | --- | --- | --- |
| worktree-mode fresh/resume start | preserve | existing worktree-mode start tests es contract proof retained marad | P1 | required-now |
| clone-mode global `WORKSPACE_MODE_CLONE_NOT_ACTIVATED` reject | replace | explicit clone fresh/resume success proof local topologyval | P1 | required-now |
| clone resume explicit authority nelkul | forbid | legacy clone fallback tovabbra is fail-closed marad | P1 | required-now |
| Phase 1E local lifecycle cleanup baseline | preserve | sikeres clone start utan a workspace topology valodi clone-kent is cleanupolhato marad | P1 | required-now |
| remote surfaces untouched | preserve | nincs remote config/pointer/status/list mutation ebben a taskban | P1 | required-now |

### 0c) Authority Consumption Decision Table

| Path Class | Source Of Truth | Allowed Executable Root | Retained Bubble Path | Forbidden Shortcut | Evidence |
| --- | --- | --- | --- | --- | --- |
| clone fresh start | `bootstrapWorktreeWorkspace(...)` explicit `workspacePath` + `workspaceKind=clone` | bootstrap result `workspacePath` | `bubblePaths.worktreePath` traceability/cleanup rootkent retained maradhat | global clone reject vagy implicit worktree bootstrap | T1, T2, T7 |
| clone resume | runtime session explicit clone authority | resolved runtime `workspacePath` | retained `worktreePath` | legacy clone fallback explicit `workspacePath` nelkul | T3, T5 |
| worktree fresh/resume | retained worktree authority chain | retained worktree `workspacePath` | `bubblePaths.worktreePath` | clone activation miatti regresszio | T6 |
| remote/operator surfaces | successor taskok authority chainje | `N/A` | `N/A` | local activation taskban barmilyen remote consume | T8 |

### 1) Call-site Matrix

| ID | File | Function/Entry | Exact Signature (args -> return) | Insertion Point | Expected Behavior | Priority | Timing | Evidence |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| CS1 | `src/v11/application/start/startCommandApi.ts` | `resolveStartBubblePreflightOrThrow(...)`, `startBubble(...)` | existing exports | start preflight es public entry | `work_mode=clone` nem global reject tobbe a local start/resume pathon; a state gate tovabbra is retained, es remote scope nem nyilik | P1 | required-now | T1, T3, T6, T8, T9 |
| CS2 | `src/v11/application/start/startCommandLaunchWorkspace.ts` | `resolveFreshLaunchWorkspace(...)`, `resolveResumeLaunchWorkspace(...)` | existing exports | launch workspace authority resolution | explicit clone authority elfogadott; authority-hiany vagy legacy clone fallback tovabbra is fail-closed | P1 | required-now | T2, T3, T5 |
| CS3 | `src/v11/application/start/startCommandFlows.ts` | `runFreshStartFlow(...)`, `runResumeStartFlow(...)` | existing exports | activation orchestration seam | clone fresh start explicit clone workspace authorityt perzisztal bootstrap utan es ezt hasznalja bootstrap command/tmux launchhoz; resume ugyanigy consume-olja | P1 | required-now | T1, T3, T4 |
| CS4 | `src/v11/application/start/startCommandSession.ts` | `claimRuntimeSessionOwnership(...)` | existing export | runtime session ownership + retry seam | a perzisztalt clone workspace authority resume/retry alatt nem veszhet el vagy torzulhat worktree fallbackga | P1 | required-now | T3, T5 |
| CS5 | `src/v11/infrastructure/workspace/worktreeManager.ts` | `bootstrapWorktreeWorkspace(...)` | existing export | workspace producer seam | clone mode-ban independent clone topology jön létre a local activationhoz, worktree mode retained mellett | P1 | required-now | T1, T7 |

### 2) Data and Interface Contract

| Contract | Current | Target | Required Fields | Optional Fields | Compatibility | Priority | Timing |
| --- | --- | --- | --- | --- | --- | --- | --- |
| `WorktreeBootstrapResult` clone authority | gyakorlatban mindig worktree topology | clone mode-ban explicit `workspaceKind: "clone"` authority is lehet | `workspacePath`, `workspaceKind`, `worktreePath`, `bubbleBranch`, `branchPrepared` | existing overlay/baseRef fields | additive, de clone activationnal behavior-change | P1 | required-now |
| fresh start clone public behavior | explicit reject | local success path canonical clone authorityval | `bubbleId`, `work_mode=clone`, explicit bootstrap authority | existing `now`, `cwd`, bootstrap command | behaviorally breaking clone modeban | P1 | required-now |
| resume clone public behavior | explicit reject | resumable local success explicit runtime session clone authorityrol | runtime session `workspacePath`, `workspaceKind=clone`, resumable state | existing summary/reviewer directive flows | behaviorally breaking clone modeban | P1 | required-now |
| legacy clone runtime session authority | forbidden fallback | retained forbidden fallback | explicit clone `workspacePath` + `workspaceKind` kotelezo ha clone resume success kell | none | retained fail-closed | P1 | required-now |

### 3) Side Effects Contract

| Area | Allowed | Forbidden | Notes | Priority | Timing |
| --- | --- | --- | --- | --- | --- |
| local clone fresh start | PREPARING -> clone bootstrap -> explicit authority persist -> optional bootstrap command -> tmux launch -> RUNNING | global clone reject retained hagyasa vagy clone authority nelkuli launch | local activation csak akkor suksesz, ha az authority chain teljes | P1 | required-now |
| local clone resume | explicit persisted clone authorityrol tmux relaunch + resume mutation | legacy clone fallback explicit `workspacePath` nelkul | resume nem inferalhat clone executable rootot puszta retained worktreePath-bol | P1 | required-now |
| failed clone fresh start | runtime session cleanup + topology-aware workspace cleanup | RUNNING state vagy stale runtime ownership visszahagyasa bootstrap/launch hiba utan | cleanup a Phase 1E clone topology baseline-re ul | P1 | required-now |
| worktree mode | retained existing start flow | clone activation miatti regresszio | all current worktree semantics stay green | P1 | required-now |
| remote surfaces | none | remote create/start/status/list/attach or sync-hook consume | successor-only | P1 | required-now |

### 4) Error and Fallback Contract

| Trigger | Dependency (if any) | Behavior (`throw|result|fallback`) | Fallback Value/Action | Reason Code | Log Level | Priority | Timing |
| --- | --- | --- | --- | --- | --- | --- | --- |
| clone fresh start succeeds | clone bootstrap + explicit authority + tmux | result | normal RUNNING transition | existing success path | info | P1 | required-now |
| clone resume succeeds from explicit authority | runtime session authority + tmux | result | normal resumable RUNNING transition | existing success path | info | P1 | required-now |
| clone bootstrap returned no canonical authority | bootstrap producer seam | throw | cleanup, state not RUNNING | `START_LAUNCH_WORKSPACE_UNAVAILABLE` vagy explicit equivalent | error | P1 | required-now |
| clone resume only has legacy clone fallback | runtime session authority resolution | throw | no resume, state unchanged | `START_LAUNCH_WORKSPACE_UNAVAILABLE` vagy explicit equivalent | error | P1 | required-now |
| clone start bootstrap/setup fails after ownership claim | bootstrap/tmux/start flow | throw | failed-start cleanup retained | existing startup-incomplete family retained where applicable | error | P1 | required-now |
| worktree mode | existing deps | result | existing baseline | existing families retained | info | P1 | required-now |

### 5) Dependency Constraints

| Type | Items | Priority | Timing |
| --- | --- | --- | --- |
| must-use | `plans/remote-bubble-execution-contract-and-phasing-plan-v2.md` | P1 | required-now |
| must-use | `docs/remote-bubble-execution.md` flat clone topology rules | P1 | required-now |
| must-use | `plans/archive/tasks/remote-bubble-execution/phase1e-local-clone-lifecycle-cleanup-alignment.md` retained local lifecycle baseline | P1 | required-now |
| must-use | `src/v11/shared/runtimeSessionWorkspaceAuthority.ts` retained authority resolver semantics | P1 | required-now |
| must-not-use | remote pointer/cache/config files | P1 | required-now |
| must-not-use | remote SSH runner / status / list / attach surfaces | P1 | required-now |
| must-not-use | `pairflow_sync_command` config or invoke behavior | P1 | required-now |

### 6) Test Matrix

| ID | Scenario | Given | When | Then | Priority | Timing | Evidence |
| --- | --- | --- | --- | --- | --- | --- | --- |
| T1 | clone fresh start succeeds end-to-end | bubble `work_mode=clone`, es a bootstrap producer explicit clone workspace authorityt tud adni | `startBubble(...)` fresh path fut | a state `RUNNING`, a tmux launch a clone workspace rootrol tortenik, es a runtime session explicit clone authorityt tartalmaz | P1 | required-now | `tests/core/bubble/startBubble.test.ts`, `tests/core/workspace/worktreeManager.test.ts` |
| T2 | clone fresh start fails closed when bootstrap authority missing | bubble `work_mode=clone`, de a bootstrap result nem ad ervenyes canonical workspace authorityt | `startBubble(...)` fut | explicit launch-workspace hiba jon vissza, nincs tmux launch, nincs RUNNING, es a failed-start cleanup lefut | P1 | required-now | `tests/core/bubble/startBubble.test.ts`, `tests/v11/application/start/startCommandLaunchWorkspace.test.ts` |
| T3 | clone resume succeeds from explicit persisted authority | bubble resumable state-ben van, es a runtime session explicit `workspacePath` + `workspaceKind=clone` authorityt hordoz | `startBubble(...)` resume path fut | nincs clone-not-activated reject; a relaunch a persisted clone workspace rootrol tortenik | P1 | required-now | `tests/core/bubble/startBubble.test.ts`, `tests/v11/application/start/startCommandLaunchWorkspace.test.ts` |
| T4 | fresh clone start persists canonical authority before launch-dependent work | bubble `work_mode=clone`, optional `commands.bootstrap` be van allitva | `startBubble(...)` fresh path fut | a bootstrap command es a tmux launch mar az explicit clone workspace authorityt kapja, nem retained worktree fallbackot | P1 | required-now | `tests/core/bubble/startBubble.test.ts` |
| T5 | clone resume legacy fallback remains forbidden | resumable bubble runtime session recordja csak retained clone worktree referencia, explicit `workspacePath` nelkul | `startBubble(...)` resume fut | fail-closed launch-workspace hiba jon vissza, nincs tmux relaunch, nincs silent worktree fallback | P1 | required-now | `tests/core/bubble/startBubble.test.ts`, `tests/v11/application/start/startCommandLaunchWorkspace.test.ts` |
| T6 | worktree-mode start baseline retained | worktree bubble fresh es resume scenariok | `startBubble(...)` fut | a retained worktree-mode success behavior valtozatlanul zold marad | P1 | required-now | `tests/core/bubble/startBubble.test.ts`, `tests/contracts/v11/start.contract.runner.ts` |
| T7 | workspace bootstrap produces real clone topology for activation | local clone fresh start producer seam | `bootstrapWorktreeWorkspace(...)` clone mode-ban fut | a workspace git clone-kent jon letre, nem registered worktreekent; a returned authority explicit `workspaceKind=clone` | P1 | required-now | `tests/core/workspace/worktreeManager.test.ts` |
| T8 | remote/operator surfaces remain out of scope | a repo tartalmaz remote plan nyomokat es config contractot | a Phase 2A implementation lefut | nincs remote pointer/cache/create/status/list/attach vagy sync-hook consume valtozas | P1 | required-now | target-file precision + diff review |
| T9 | non-startable state gate still wins for clone bubbles | bubble `work_mode=clone`, de state nem startolhato | `startBubble(...)` fut | a retained `START_STATE_NOT_STARTABLE` family ervenyesul; clone activation nem maszkolhatja az allapot-gate-et | P1 | required-now | `tests/core/bubble/startBubble.test.ts`, `tests/contracts/v11/start.contract.runner.ts` |

## L2 - Implementation Notes (Optional)

1. [later-hardening] Ha a clone bootstrap producer seam tul sok branch/checkout részletet visz a `worktreeManager.ts`-be, erdemes kesobb kulon helperbe kiszervezni a clone bootstrap vs worktree bootstrap topologiai eltereset.
2. [later-hardening] A Phase 2B create write-path taskban erdemes explicit operator-proofot adni arra, hogy a felhasznalo altal letrehozott clone bubble ugyanazt a Phase 2A activation pathot kapja, mint a mostani fixture/manual config scenariok.

## Hardening Backlog (Optional)

| ID | Item | Layer | Priority | Timing | Source | Proposed Action |
| --- | --- | --- | --- | --- | --- | --- |
| H1 | explicit local clone bootstrap recovery/runbook | L2 | P2 | later-hardening | Phase 2A successor boundary | lezarni Phase 3C recovery taskban |

## Review Control

1. Every finding must include: `priority`, `timing`, `layer`, `evidence`.
2. Max 2 L1 hardening rounds.
3. After round 2, new `required-now` is allowed only for evidence-backed `P0/P1`.
4. Items outside L1 blocker scope must be tagged `later-hardening`.
5. Ha a local clone activation explicit canonical workspace authority nelkul sikeresnek latszik, a review defaultja `rework`.

## Spec Lock

Mark task as `IMPLEMENTABLE` when all `P0/P1 + required-now` items are closed.
