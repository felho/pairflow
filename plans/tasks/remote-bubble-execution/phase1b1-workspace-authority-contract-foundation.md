---
artifact_type: task
artifact_id: task_remote_bubble_execution_phase1b1_workspace_authority_contract_foundation_v1
title: "Remote Bubble Execution Workspace Authority Contract Foundation (Phase 1B1)"
status: implementable
phase: phase1b1-workspace-authority-contract-foundation
target_files:
  - src/v11/shared/ports/worktreeWorkspace.ts
  - src/v11/shared/ports/runtimeSessions.ts
  - src/v11/infrastructure/executor/sessionRuntime/runtimeSessionsRegistry.ts
  - src/v11/infrastructure/executor/sessionRuntime/runtimeSessionsRegistryDocument.ts
  - src/v11/infrastructure/workspace/worktreeManager.ts
  - src/v11/application/start/startCommandApi.ts
  - tests/core/workspace/worktreeManager.test.ts
  - tests/core/runtime/sessionsRegistry.test.ts
  - tests/core/bubble/startBubble.test.ts
  - tests/core/runtime/restartRecovery.test.ts
  - tests/contracts/v11/start.contract.runner.ts
  - tests/core/bubble/orchestrationLoopSmoke.test.ts
  - tests/core/runtime/startupReconciler.test.ts
  - tests/v11/application/start/startCommandOrchestration.test.ts
prd_ref: null
plan_ref: plans/remote-bubble-execution-contract-and-phasing-plan-v2.md
system_context_ref: docs/pairflow-initial-design.md
owners:
  - "felho"
---

# Task: Remote Bubble Execution Workspace Authority Contract Foundation (Phase 1B1)

## L0 - Policy

### Goal

Lezarni a workspace-authority additive contractot ugy, hogy:
1. a shared type/schema/persistence boundary explicit legyen,
2. a jelenlegi worktree-mode runtime viselkedes regresszio nelkul megmaradjon,
3. a clone-topology tovabbra is fail-closed maradjon, azaz ebben a taskban semmilyen successful clone start nem engedelyezett,
4. a worktree bootstrap return-shape igazitas kizarolag a Phase 1B1 plan-output shared contract closurejat szolgalja; producer-seam ownership tovabbra is a Phase 1B2 scope-ja marad.

### Domain / Control Model Summary

1. Business invariant: Phase 1B1 utan minden sikeres start tovabbra is a jelenlegi worktree-runtime modellnek felel meg; nem johet letre "felig aktivalt" clone runtime.
2. Control model: ebben a taskban a runtime behavior authoritative forrasa tovabbra is a meglevo worktree-mode start modell; az uj workspace authority mezok contract-foundation szerepet kapnak, nem activation szerepet.
3. Read-path rule: az uj authority mezok csak shared contractban, parser/serializerben, valamint a meglevo worktree bootstrap return shape minimalis igazitasaban jelenhetnek meg; runtime consume vagy producer wiring nem valt at rajuk ebben a taskban.
4. Forbidden fallback: custom bootstrap injection, additive authority fieldek reszleges consume-ja, vagy barmilyen clone-success start utvonal tiltott.
5. Missing-data rule: `work_mode=clone` eseten a fresh-start entry explicit fail-closed rejectet ad runtime-session ownership claim, PREPARING, bootstrap dependency invoke es session write elott; failed-start cleanup authorityra vagy cleanup-triggerelt workaroundra nem tamaszkodhat.
6. Phase boundary: ez csak `contract_foundation`; producer wiring, tmux/runtime consume, bubble-loop consume es clone activation kulon successor taskok.

### In Scope

1. `WorktreeBootstrapResult` additive bovitese explicit workspace authority metadata-val.
2. `RuntimeSessionRecord` additive bovitese optional authority metadata-val.
3. Runtime session parser/serializer kompatibilis roundtrip legacy es additive recordokra.
4. A meglevo local worktree bootstrap visszateresi shape-jenek minimalis igazitasaval explicit metadata visszaadas worktree mode-ban, a meglevo worktree-forrasok megtartasaval es kizárólag a Phase 1B1 shared-contract closurejahoz.
5. Egységes, korai clone fail-closed start guard, amely nem enged runtime-session ownership claim, PREPARING, bootstrap dependency invoke vagy session write iranyba lepni.
6. A required `WorktreeBootstrapResult` return-shape valtozasabol kovetkezo type-driven fallout update minden ismert legacy 4-field `bootstrapWorktreeWorkspace` stubhelyen, valamint minden ugyanilyen mintaju, implementacio kozben felbukkano teszt/runner stubon.
7. A fenti boundaryk tesztjei.

### Out of Scope

1. Bootstrap utani runtime-session finalize viselkedes- vagy ownership-valtozas.
2. `commands.bootstrap` canonical workspace consume.
3. Runtime-session writer authority-atallitas bootstrap/finalize ownership seam-ben; a Phase 1B1 parser/serializer compatibility es additive roundtrip ownership nem csuszik ki ebbol a taskbol.
4. Failed-start cleanup authority cutover.
5. Tmux launch, resume-path consume, delivery, reviewer refresh, reconcile consume.
6. Bubble-loop consume (`pass`, `converged`, `ask-human`, `meta_review_result`).
7. Operator read-model, CLI wording, status/list/attach.
8. Barmilyen successful clone-topology start.

### Safety Defaults

1. `work_mode=worktree` viselkedes regresszio nelkul megmarad.
2. `work_mode=clone` tovabbra sem kap successful start pathot; ebben a taskban a kotelezo implementalt es tesztelt reject surface a fresh-start entry path.
3. Az uj runtime session authority mezok optional/additivek; legacy rekordok tovabbra is olvashatok.
4. Nincs uj runtime activation vagy producer wiring, meg akkor sem, ha egy custom dependency elvileg tudna clone-root authorityt eloallitani; ez a boundary a plan szerinti Phase 1B2 producer-foundation ownershipot erintetlenul hagyja.

### Contract Boundary / Blast Radius

1. `contract_boundary_override`: `yes`
2. Erintett contractok:
   - shared workspace bootstrap contract
   - shared runtime session record contract
   - start guard contract
3. Phase ownership anchor:
   - Phase 1B1 csak a plan Phase 1B1 soraban nevezett additive workspace authority fields + parser/serializer compatibility + explicit clone fail-closed guard closurejat szallitja
   - Phase 1B2 producer-foundation ownershipa nem nyilik meg ebben a taskban, meg minimalis return-shape alignment mellett sem
4. Type-driven fallout anchor:
   - ha a `WorktreeBootstrapResult` required additive shape-je miatt legacy 4-field bootstrap stubok tornek, azok javitasa Phase 1B1 scope-ban marad
   - ez a fallout csak shape-alignmentet jelenthet; nem nyithat uj producer wiringet, runtime consume-ot vagy activation viselkedest

### Complexity Risk Gate

1. `authority_risk`: `2`
2. `surface_spread`: `1`
3. `identity_join_risk`: `1`
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
   - canonical identity path: Phase 1B1-ben meg csak additive contractkent jelenik meg a `workspaceKind/workspacePath` csalad
   - competing identifiers or fallback identities: statikus `bubblePaths.worktreePath`, custom bootstrap altal eloallitott clone path, legacy runtime session record
11. Authority/source-of-truth note:
   - canonical source: ebben a taskban a futo behaviorhez tovabbra is a meglevo worktree start modell
   - forbidden secondary sources: reszlegesen bevezetett workspace authority mezok runtime aktivaciokent

## L1 - Change Contract

### 0) Domain / Control Contract

| Item | Rule | Implementation Consequence | Priority | Timing |
|---|---|---|---|---|
| Business invariant | Sikeres start ebben a fazisban tovabbra is csak worktree-topology lehet. | A clone-topology nem lehet "majdnem kesz" feature. | P1 | required-now |
| Control model | Az uj authority mezok Phase 1B1-ben contract-only szerepet kapnak. | Nem vezetheto be producer wiring vagy consumer cutover ugyanebben a taskban; csak a Phase 1B1 output closurejahoz szukseges minimalis return-shape alignment engedelyezett. | P1 | required-now |
| Read-path rule | Runtime consume nem olvashat uj authority mezokrol ebben a taskban. | Tmux/runtime/bubble-loop file-ok tiltottak; a worktree bootstrap csak a shared return contract minimalis kitoltesere igazithato. | P1 | required-now |
| Forbidden fallback | Custom bootstrap success vagy partial authority consume tilos. | A start guardnak runtime-session ownership claim, PREPARING, bootstrap dependency invoke es session write elott kell rejectalnia a clone modot. | P1 | required-now |
| Missing-data rule | Clone modban nincs neutral fallback vagy degraded mode. | `throw` + state marad `CREATED`. | P1 | required-now |
| Phase boundary | Ez csak contract-foundation. | Producer es activation successor task ownership. | P2 | required-now |

### 1) Call-site Matrix

| ID | File | Function/Entry | Exact Signature (args -> return) | Insertion Point | Expected Behavior | Priority | Timing | Evidence |
|---|---|---|---|---|---|---|---|---|
| CS1 | `src/v11/shared/ports/worktreeWorkspace.ts` | bootstrap workspace contract | `BootstrapWorktreeWorkspacePort(input) -> Promise<WorktreeBootstrapResult>` | shared workspace port | `WorktreeBootstrapResult` required `workspaceKind` + `branchPrepared` mezoket kap, `worktreePath` retained compatibility fielddel; a required shape minden in-scope bootstrap stubra is ervenyes | P1 | required-now | T1, T6 |
| CS2 | `src/v11/shared/ports/runtimeSessions.ts` | runtime session record contract | `RuntimeSessionRecord` additive optional fields | shared runtime port | optional `workspacePath`, `workspaceKind`; existing fields retained | P1 | required-now | T3, T4 |
| CS3 | `src/v11/infrastructure/executor/sessionRuntime/runtimeSessionsRegistry.ts`, `runtimeSessionsRegistryDocument.ts` | parser/serializer roundtrip | existing functions | runtime session persistence seam | legacy rekordok olvashatok, additive rekordok roundtripolnak, invalid `workspaceKind` rejectalodik | P1 | required-now | T3, T4, T5 |
| CS4 | `src/v11/infrastructure/workspace/worktreeManager.ts` | `bootstrapWorktreeWorkspace(...)` | existing export | local default bootstrap return shape | worktree mode explicit metadata-t ad vissza a shared contract teljesitesehez; a retained worktree mezok tovabbra is a meglevo bootstrap forrasbol jonnek, es ez a sor nem nyit Phase 1B2 producer-seam ownershipot | P1 | required-now | T1 |
| CS5 | `src/v11/application/start/startCommandApi.ts` | fresh-start clone guard | `startBubble(...)` fresh-start entry precondition | start entry guard a runtime-session ownership claim elott | `work_mode=clone` explicit reject runtime-session ownership claim, PREPARING, bootstrap dependency invoke es session write elott; custom bootstrap success tovabbra is tilos | P1 | required-now | T2 |
| CS6 | `tests/core/workspace/worktreeManager.test.ts`, `tests/core/runtime/sessionsRegistry.test.ts`, `tests/core/bubble/startBubble.test.ts` | primary contract regression tests | unit/integration | primary validation surface | explicit foundation-only evidence | P1 | required-now | T1-T5 |
| CS7 | `tests/core/runtime/restartRecovery.test.ts`, `tests/contracts/v11/start.contract.runner.ts`, `tests/core/bubble/orchestrationLoopSmoke.test.ts`, `tests/core/runtime/startupReconciler.test.ts`, `tests/v11/application/start/startCommandOrchestration.test.ts` | legacy bootstrap stub fallout | test/runner stubs | type-driven validation fallout surface | known legacy 4-field `bootstrapWorktreeWorkspace` stubboknak is fel kell venniuk a required additive shape-et, viselkedesi scope-szelesites nelkul | P1 | required-now | T6 |

### 2) Data and Interface Contract

| Contract | Current | Target | Required Fields | Optional Fields | Compatibility | Priority | Timing |
|---|---|---|---|---|---|---|---|
| `WorktreeBootstrapResult` | worktree-only shape | additive authority metadata | `repoPath`, `baseRef`, `bubbleBranch`, `worktreePath`, `workspaceKind`, `branchPrepared` | none | additive but required for returned value; ebben a fazisban sikeres path csak `workspaceKind=\"worktree\"` lehet | P1 | required-now |
| `RuntimeSessionRecord` | legacy worktree-centric record | legacy + additive authority metadata | existing legacy fields | `workspacePath`, `workspaceKind` | non-breaking; legacy record valid marad, es ha `workspaceKind` jelen van, csak explicit discriminant lehet | P1 | required-now |

### 3) Side Effects Contract

| Area | Allowed | Forbidden | Notes | Priority | Timing |
|---|---|---|---|---|---|
| shared contracts | additive fieldek | breaking rename / broad consume cutover | no mass rename to `workspacePath` family | P1 | required-now |
| start behavior | early clone reject | runtime-session ownership claim, bootstrap/finalize/tmux launch clone modban | runtime-session ownership claim, PREPARING, bootstrap dependency invocation es session write nem indulhat el clone modban | P1 | required-now |
| runtime registry | parse/serialize support | uj runtime ownership flow, finalize port vagy writer adoption | contract only | P1 | required-now |
| tests and runners | required bootstrap stub shape alignment | unrelated behavioral rewrites vagy uj remote/producer semantics | known legacy 4-field stubbok frissitese a contract fallout resze | P1 | required-now |

Constraint: ha itt nincs explicit consumer alignment engedelyezve, implementacio nem modosit consumer retegeket.

### 4) Error and Fallback Contract

| Trigger | Dependency (if any) | Behavior (`throw|result|fallback`) | Fallback Value/Action | Reason Code | Log Level | Priority | Timing |
|---|---|---|---|---|---|---|---|
| `work_mode=clone` fresh start | start entry | throw | explicit fail-closed reject runtime-session ownership claim, PREPARING, bootstrap dependency invoke es session write elott | `WORKSPACE_MODE_CLONE_NOT_ACTIVATED` | error | P1 | required-now |
| invalid persisted `workspaceKind` | runtime sessions parser | throw | fail-closed parse reject | `invalid_workspace_kind` | error | P1 | required-now |
| missing additive runtime fields on legacy record | runtime sessions parser | result | legacy record accepted | `N/A` | info | P1 | required-now |

### 5) Dependency Constraints

| Type | Items | Priority | Timing |
|---|---|---|---|
| must-use | `plans/remote-bubble-execution-contract-and-phasing-plan-v2.md` | P1 | required-now |
| must-not-use | `src/v11/application/start/startCommandTmuxLaunch.ts` | P1 | required-now |
| must-not-use | `src/v11/infrastructure/channel/tmux/**` | P1 | required-now |
| must-not-use | `src/v11/application/pass/**`, `converged/**`, `askHuman/**` | P1 | required-now |
| must-not-use | `src/v11/application/start/startCommandCleanup.ts`, `src/v11/application/start/startCommandResume*.ts` | P1 | required-now |
| must-not-use | custom bootstrap success tests clone activation bizonyitasara | P1 | required-now |

### 6) Test Matrix

| ID | Scenario | Given | When | Then | Priority | Timing | Evidence |
|---|---|---|---|---|---|---|---|
| T1 | worktree bootstrap metadata | local worktree mode | bootstrap lefut | explicit `workspaceKind=\"worktree\"`, `branchPrepared=true` jon vissza, es a retained `repoPath/baseRef/bubbleBranch/worktreePath` mezok tovabbra is a meglevo worktree bootstrap kimenetet tukrozik | P1 | required-now | `tests/core/workspace/worktreeManager.test.ts` |
| T2 | clone fail-closed before state mutation | bubble `work_mode=clone` | `startBubble(...)` fut | explicit reject; nincs runtime-session ownership claim, nincs PREPARING, nincs bootstrap dependency invoke, nincs session write, state marad `CREATED` | P1 | required-now | `tests/core/bubble/startBubble.test.ts` |
| T3 | legacy runtime session roundtrip | existing worktree-only record `workspaceKind` nelkul | parse/read/write | legacy rekord kompatibilis marad, es a hianyzo `workspaceKind` nem kenyszerit uj discriminant-utat | P1 | required-now | `tests/core/runtime/sessionsRegistry.test.ts` |
| T4 | additive runtime session roundtrip | record `workspacePath` + explicit `workspaceKind` discriminant mezokkel | parse/read/write | additive mezok stabilan roundtripolnak, es ha `workspaceKind` jelen van, explicit valid discriminantkent marad fenn | P1 | required-now | `tests/core/runtime/sessionsRegistry.test.ts` |
| T5 | invalid workspace kind reject | persisted record rossz discriminanttal | parse/read | explicit fail-closed parser hiba | P1 | required-now | `tests/core/runtime/sessionsRegistry.test.ts` |
| T6 | required bootstrap return-shape fallout | ismert legacy 4-field `bootstrapWorktreeWorkspace` stubbok a restart/start runner/orchestration surfaces-en | a `WorktreeBootstrapResult` required additive shape-je ervenybe lep | minden ismert stubhely felveszi a required mezoket vagy ugyanilyen explicit shape-alignmentet, uj viselkedesi scope nelkul | P1 | required-now | `tests/core/runtime/restartRecovery.test.ts`, `tests/contracts/v11/start.contract.runner.ts`, `tests/core/bubble/orchestrationLoopSmoke.test.ts`, `tests/core/runtime/startupReconciler.test.ts`, `tests/v11/application/start/startCommandOrchestration.test.ts` |

## L2 - Implementation Notes (Optional)

1. [later-hardening] A reason code kesobbi activation taskban tovabbi topologia-specifikus al-okokra bonthato.

## Hardening Backlog (Optional)

| ID | Item | Layer | Priority | Timing | Source | Proposed Action |
|---|---|---|---|---|---|---|
| H1 | A future finalize port pontos ownership contractja Phase 1B2-ben keruljon lezarasra | L2 | P2 | later-hardening | plan reset 2026-04-12 | kulon producer taskban specifikalni |

## Review Control

1. Every finding must include: `priority`, `timing`, `layer`, `evidence`.
2. Max 2 L1 hardening rounds.
3. After round 2, new `required-now` is allowed only for evidence-backed `P0/P1`.
4. Items outside L1 blocker scope must be tagged `later-hardening`.
5. If `contract_boundary_override=yes`, `plan_ref` is mandatory and must align with L1 contract rows.

## Spec Lock

Mark task as `IMPLEMENTABLE` when all `P0/P1 + required-now` items are closed.
