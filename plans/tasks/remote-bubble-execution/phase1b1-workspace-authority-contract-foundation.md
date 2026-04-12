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
  - src/v11/application/start/startCommandFlows.ts
  - tests/core/workspace/worktreeManager.test.ts
  - tests/core/runtime/sessionsRegistry.test.ts
  - tests/core/bubble/startBubble.test.ts
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
3. a clone-topology tovabbra is fail-closed maradjon, azaz ebben a taskban semmilyen successful clone start nem engedelyezett.

### Domain / Control Model Summary

1. Business invariant: Phase 1B1 utan minden sikeres start tovabbra is a jelenlegi worktree-runtime modellnek felel meg; nem johet letre "felig aktivalt" clone runtime.
2. Control model: ebben a taskban a runtime behavior authoritative forrasa tovabbra is a meglevo worktree-mode start modell; az uj workspace authority mezok contract-foundation szerepet kapnak, nem activation szerepet.
3. Read-path rule: az uj authority mezok csak shared contractban, parser/serializerben es tesztelt fail-closed guardokban jelenhetnek meg; runtime consume nem valt at rajuk ebben a taskban.
4. Forbidden fallback: custom bootstrap injection, additive authority fieldek reszleges consume-ja, vagy barmilyen clone-success start utvonal tiltott.
5. Missing-data rule: `work_mode=clone` eseten a start explicit fail-closed rejectet ad PREPARING elott; nincs bootstrap, nincs partial session write, nincs cleanup workaround.
6. Phase boundary: ez csak `contract_foundation`; producer wiring, tmux/runtime consume, bubble-loop consume es clone activation kulon successor taskok.

### In Scope

1. `WorktreeBootstrapResult` additive bovitese explicit workspace authority metadata-val.
2. `RuntimeSessionRecord` additive bovitese optional authority metadata-val.
3. Runtime session parser/serializer kompatibilis roundtrip legacy es additive recordokra.
4. Local default workspace bootstrap explicit metadata visszaadasa worktree mode-ban.
5. Egységes, korai clone fail-closed start guard, amely nem enged PREPARING vagy bootstrap iranyba lepni.
6. A fenti boundaryk tesztjei.

### Out of Scope

1. Bootstrap utani runtime-session finalize/update.
2. `commands.bootstrap` canonical workspace consume.
3. Failed-start cleanup authority cutover.
4. Tmux launch, delivery, reviewer refresh, reconcile consume.
5. Bubble-loop consume (`pass`, `converged`, `ask-human`, `meta_review_result`).
6. Operator read-model, CLI wording, status/list/attach.
7. Barmilyen successful clone-topology start.

### Safety Defaults

1. `work_mode=worktree` viselkedes regresszio nelkul megmarad.
2. `work_mode=clone` minden start pathon explicit reject marad.
3. Az uj runtime session authority mezok optional/additivek; legacy rekordok tovabbra is olvashatok.
4. Nincs uj runtime activation, meg akkor sem, ha egy custom dependency elvileg tudna clone-root authorityt eloallitani.

### Contract Boundary / Blast Radius

1. `contract_boundary_override`: `yes`
2. Erintett contractok:
   - shared workspace bootstrap contract
   - shared runtime session record contract
   - start guard contract

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
| Control model | Az uj authority mezok Phase 1B1-ben contract-only szerepet kapnak. | Nem vezetheto be producer vagy consumer cutover ugyanebben a taskban. | P1 | required-now |
| Read-path rule | Runtime consume nem olvashat uj authority mezokrol ebben a taskban. | Tmux/runtime/bubble-loop file-ok tiltottak. | P1 | required-now |
| Forbidden fallback | Custom bootstrap success vagy partial authority consume tilos. | A start guardnak PREPARING elott kell rejectalnia a clone modot. | P1 | required-now |
| Missing-data rule | Clone modban nincs neutral fallback vagy degraded mode. | `throw` + state marad `CREATED`. | P1 | required-now |
| Phase boundary | Ez csak contract-foundation. | Producer es activation successor task ownership. | P2 | required-now |

### 1) Call-site Matrix

| ID | File | Function/Entry | Exact Signature (args -> return) | Insertion Point | Expected Behavior | Priority | Timing | Evidence |
|---|---|---|---|---|---|---|---|---|
| CS1 | `src/v11/shared/ports/worktreeWorkspace.ts` | bootstrap workspace contract | `BootstrapWorktreeWorkspacePort(input) -> Promise<WorktreeBootstrapResult>` | shared workspace port | `WorktreeBootstrapResult` required `workspaceKind` + `branchPrepared` mezoket kap, `worktreePath` retained compatibility fielddel | P1 | required-now | T1 |
| CS2 | `src/v11/shared/ports/runtimeSessions.ts` | runtime session record contract | `RuntimeSessionRecord` additive optional fields | shared runtime port | optional `workspacePath`, `workspaceKind`; existing fields retained | P1 | required-now | T3, T4 |
| CS3 | `src/v11/infrastructure/executor/sessionRuntime/runtimeSessionsRegistry.ts`, `runtimeSessionsRegistryDocument.ts` | parser/serializer roundtrip | existing functions | runtime session persistence seam | legacy rekordok olvashatok, additive rekordok roundtripolnak, invalid `workspaceKind` rejectalodik | P1 | required-now | T3, T4, T5 |
| CS4 | `src/v11/infrastructure/workspace/worktreeManager.ts` | `bootstrapWorktreeWorkspace(...)` | existing export | local default bootstrap | worktree mode explicit metadata-t ad vissza; clone mode tovabbra is unsupported | P1 | required-now | T1, T2 |
| CS5 | `src/v11/application/start/startCommandFlows.ts` | fresh-start clone guard | `runFreshStartFlow(...)` precondition | start runtime guard | `work_mode=clone` early reject, PREPARING elott, custom bootstrap success nelkul | P1 | required-now | T2 |
| CS6 | `tests/core/workspace/worktreeManager.test.ts`, `tests/core/runtime/sessionsRegistry.test.ts`, `tests/core/bubble/startBubble.test.ts` | contract regression tests | unit/integration | validation surface | explicit foundation-only evidence | P1 | required-now | T1-T5 |

### 2) Data and Interface Contract

| Contract | Current | Target | Required Fields | Optional Fields | Compatibility | Priority | Timing |
|---|---|---|---|---|---|---|---|
| `WorktreeBootstrapResult` | worktree-only shape | additive authority metadata | `repoPath`, `baseRef`, `bubbleBranch`, `worktreePath`, `workspaceKind`, `branchPrepared` | none | additive but required for returned value | P1 | required-now |
| `RuntimeSessionRecord` | legacy worktree-centric record | legacy + additive authority metadata | existing legacy fields | `workspacePath`, `workspaceKind` | non-breaking; legacy record valid marad | P1 | required-now |

### 3) Side Effects Contract

| Area | Allowed | Forbidden | Notes | Priority | Timing |
|---|---|---|---|---|---|
| shared contracts | additive fieldek | breaking rename / broad consume cutover | no mass rename to `workspacePath` family | P1 | required-now |
| start behavior | early clone reject | bootstrap/finalize/tmux launch clone modban | state mutation nem indulhat el clone modban | P1 | required-now |
| runtime registry | parse/serialize support | uj runtime ownership flow vagy finalize port | contract only | P1 | required-now |

Constraint: ha itt nincs explicit consumer alignment engedelyezve, implementacio nem modosit consumer retegeket.

### 4) Error and Fallback Contract

| Trigger | Dependency (if any) | Behavior (`throw|result|fallback`) | Fallback Value/Action | Reason Code | Log Level | Priority | Timing |
|---|---|---|---|---|---|---|---|
| `work_mode=clone` fresh start | start flow | throw | explicit fail-closed reject PREPARING elott | `WORKSPACE_MODE_CLONE_NOT_ACTIVATED` | error | P1 | required-now |
| invalid persisted `workspaceKind` | runtime sessions parser | throw | fail-closed parse reject | `invalid_workspace_kind` | error | P1 | required-now |
| missing additive runtime fields on legacy record | runtime sessions parser | result | legacy record accepted | `N/A` | info | P1 | required-now |

### 5) Dependency Constraints

| Type | Items | Priority | Timing |
|---|---|---|---|
| must-use | `plans/remote-bubble-execution-contract-and-phasing-plan-v2.md` | P1 | required-now |
| must-not-use | `src/v11/application/start/startCommandTmuxLaunch.ts` | P1 | required-now |
| must-not-use | `src/v11/infrastructure/channel/tmux/**` | P1 | required-now |
| must-not-use | `src/v11/application/pass/**`, `converged/**`, `askHuman/**` | P1 | required-now |
| must-not-use | custom bootstrap success tests clone activation bizonyitasara | P1 | required-now |

### 6) Test Matrix

| ID | Scenario | Given | When | Then | Priority | Timing | Evidence |
|---|---|---|---|---|---|---|---|
| T1 | worktree bootstrap metadata | local worktree mode | bootstrap lefut | explicit `workspaceKind=\"worktree\"`, `branchPrepared=true` jon vissza | P1 | required-now | `tests/core/workspace/worktreeManager.test.ts` |
| T2 | clone fail-closed before state mutation | bubble `work_mode=clone` | `startBubble(...)` fut | explicit reject; nincs PREPARING, nincs bootstrap, state marad `CREATED` | P1 | required-now | `tests/core/bubble/startBubble.test.ts` |
| T3 | legacy runtime session roundtrip | existing worktree-only record | parse/read/write | legacy rekord kompatibilis marad | P1 | required-now | `tests/core/runtime/sessionsRegistry.test.ts` |
| T4 | additive runtime session roundtrip | record `workspacePath` + `workspaceKind` mezokkel | parse/read/write | additive mezok stabilan roundtripolnak | P1 | required-now | `tests/core/runtime/sessionsRegistry.test.ts` |
| T5 | invalid workspace kind reject | persisted record rossz discriminanttal | parse/read | explicit fail-closed parser hiba | P1 | required-now | `tests/core/runtime/sessionsRegistry.test.ts` |

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
