---
artifact_type: task
artifact_id: task_remote_bubble_execution_phase1b2_workspace_authority_producer_foundation_v1
title: "Remote Bubble Execution Workspace Authority Producer Foundation (Phase 1B2)"
status: implementable
phase: phase1b2-workspace-authority-producer-foundation
target_files:
  - src/v11/shared/ports/runtimeSessions.ts
  - src/v11/application/start/startCommandContract.ts
  - src/v11/application/start/startCommandOrchestration.ts
  - src/v11/application/start/startCommandSession.ts
  - src/v11/application/start/startCommandFlows.ts
  - src/v11/application/start/startCommandCleanup.ts
  - src/v11/infrastructure/executor/sessionRuntime/runtimeSessionsRegistry.ts
  - tests/core/bubble/startBubble.test.ts
  - tests/core/runtime/restartRecovery.test.ts
  - tests/core/runtime/startupReconciler.test.ts
  - tests/core/runtime/sessionsRegistry.test.ts
  - tests/contracts/v11/start.contract.runner.ts
  - tests/contracts/v11/start.contract.test.ts
prd_ref: null
plan_ref: plans/remote-bubble-execution-contract-and-phasing-plan-v2.md
system_context_ref: docs/pairflow-initial-design.md
owners:
  - "felho"
---

# Task: Remote Bubble Execution Workspace Authority Producer Foundation (Phase 1B2)

## Current Codebase Check (2026-04-12)

1. A Phase 1B1 lezarta a `workspaceKind` / `workspacePath` family additive contractjat, de a start/runtime flow ma meg nem viselkedik authority producerkent: a tenyleges start path nem irja ki stabilan ezeket a mezoket a runtime session recordokba.
2. A fresh-start bootstrap eredmenye ma lokalisan csak a workspace letrehozasahoz hasznalodik; a runtime session finalize/update seam nem kap explicit canonical workspace authority payloadot.
3. A runtime-session ownership claim ma tovabbra is a retained `worktreePath` alapu baseline-ra ul, es stale-session reclaim utan a visszairas sem bizonyitja kulon a workspace authority producer closure-t.
4. A failed-start cleanup/rollback ma meg mindig a retained `bubblePaths.worktreePath` vonalon dolgozik; worktree modban ez ma helyes, de producer szinten nincs kimondva, hogy ez ugyanannak a canonical authority chainnek a determinisztikus azonos oldala.
5. A plan szerint a kovetkezo szelet mar nem contract closure, hanem producer closure: a canonical workspace authority eloallitasa es tarolasa zarul, mikozben clone activation tovabbra is tiltott.

## Implementation Target Decision

1. `implementable_now`: `yes`
2. Ez a fazis nem nyit uj clone-success runtimeot, es nem vagja at a tmux / runtime delivery / bubble-loop consume retegeket canonical workspace consume-ra.
3. A task csak azt zarja le, hogy a worktree-mode canonical workspace authority deterministic producerkent megjelenjen es persistalodjon:
   - fresh-start bootstrap -> runtime session finalize,
   - resumable worktree recovery/update -> runtime session update,
   - failed-start rollback -> ugyanazon authority chainre epulo cleanup identity.
4. A retained worktree baseline tovabbra is ervenyes, de innentol producer-levelen expliciten bizonyitott authority chain lesz, nem hallgatozolagos statikus path-egyezes.

## L0 - Policy

### Goal

Lezarni a canonical workspace authority producer seamet ugy, hogy:
1. worktree mode-ban a start/runtime producer retegek explicit workspace authorityt allitsanak elo es taroljanak,
2. a failed-start rollback ugyanennek az authority chainnek a determinisztikus worktree-oldalat hasznalja,
3. a jelenlegi worktree-mode runtime viselkedes regresszio nelkul megmaradjon,
4. a clone-topology tovabbra is fail-closed maradjon, azaz sem bootstrap success, sem resume success nem nyithat clone activationt ebben a fazisban.

### Domain / Control Model Summary

1. Business invariant: egy runtime sessionhez ebben a fazisban is pontosan egy canonical workspace authority tartozhat, es worktree mode-ban ez ugyanarra a workspace-azonossagra mutat a bootstrap, a session-finalize es a rollback soran.
2. Control model: Phase 1B2-ben a canonical workspace authority producer forrasa worktree mode-ban a bootstrap/result chain es az ahhoz tartozo deterministic retained worktree identity; consumer cutover meg nincs.
3. Read-path rule: a canonical workspace authority Phase 1B2-ben eloallithato es tarolhato, de a tmux launch, runtime delivery, reviewer-context, bubble-loop es operator read surfaces nem allhatnak at ra ebben a taskban.
4. Forbidden fallback: clone-success custom bootstrap, reszleges clone authority produce, vagy barmilyen olyan consume-cutover tiltott, amely Phase 1C1 elott mar runtime truthkent hasznalna a producer outputot.
5. Allowed resolution path: worktree mode-ban a producer closure deterministicen vezetheti le a canonical `workspacePath` erteket a bootstrapalt / retained worktree authoritybol; ez ugyanazon authority chain resze, nem tiltott fallback.
6. Missing-data rule: ha worktree mode-ban a producer closure nem tud explicit authority payloadot letrehozni vagy tartosan sessionbe irni, a start fail-closed hibaval alljon meg; clone mod tovabbra is az 1B1 guardon bukjon el.
7. Phase boundary: ez csak `producer_foundation`; tmux launch consume, runtime delivery consume, reviewer-context consume, bubble-loop consume es activation kulon successor task ownership.

### Authority Boundary Map

1. Authority producer:
   - fresh-start bootstrap result worktree mode-ban
   - resumable worktree recovery retained deterministic authorityja
2. Stored authority:
   - runtime session record `workspacePath`, `workspaceKind`
3. In-scope consumers:
   - start/runtime producer finalize/update seam
   - failed-start rollback cleanup identity
4. Explicit out-of-scope consumers:
   - `startCommandTmuxLaunch.ts`
   - runtime delivery / reviewer refresh surfaces
   - `pass`, `converged`, `askHuman`, `meta_review_result`
   - status/list/attach/read-model
5. Export surfaces:
   - ebben a fazisban nem zarodnak le; a producer output csak persistence/business proof.

### Baseline Preservation

1. `must_preserve_behaviors`
   - `work_mode=worktree` sikeres start es resume baseline valtozatlan maradjon
   - stale-session reclaim tovabbra is unblockolhassa a resumable worktree startot
   - `work_mode=clone` explicit reject maradjon fresh es resume utvonalon is
2. `allowed_resolution_paths`
   - fresh start: bootstrapalt worktree authority -> runtime session finalize
   - resume / restart recovery worktree mode-ban: retained deterministic worktree identity -> runtime session update
   - failed fresh start rollback: ugyanennek az authority chainnek a worktree oldala -> cleanup
3. `forbidden_regression_interpretations`
   - a producer closure nem nyithat clone activationt
   - a producer closure nem jelent consume cutovert tmux / runtime / bubble-loop feluleteken
   - a retained `worktreePath` deterministic producer-oldali hasznalata worktree mode-ban nem minosul tiltott fallbacknak
4. `replacement_proof_required_if_removed`
   - ha barmely retained worktree identity path kikerul, explicit bizonyitani kell, hogy ugyanazt a canonical authorityt mas, azonos authority-chainen levo producer forras adja.

### In Scope

1. A runtime session producer surface explicit closureja worktree mode-ban: a runtime session record tenylegesen megkapja a canonical `workspacePath` es `workspaceKind` mezoket.
2. Fresh-start bootstrap utan runtime session finalize/update producer wiring.
3. Resumable worktree start vagy stale-session reclaim utani runtime session update producer wiring, worktree baseline megtartasaval.
4. Failed-start rollback identity explicit producer closureja worktree mode-ban.
5. A producer surfacehez szukseges dependency/port bovites a start command contracton belul.
6. A fenti boundaryk tesztjei.

### Out of Scope

1. `startCommandTmuxLaunch.ts` canonical workspace consume cutover.
2. Resume transcript summary, reviewer-context, delivery targeting vagy tmux pane inditas authority consume-ja.
3. `pass`, `converged`, `ask-human`, `meta_review_result` consume alignment.
4. Operator read-model vagy CLI wording valtozas.
5. Barmilyen successful clone-topology start.
6. Remote execution write/read surfaces.

### Safety Defaults

1. `work_mode=worktree` viselkedes regresszio nelkul megmarad.
2. `work_mode=clone` tovabbra sem kap successful start pathot; a Phase 1B1 fail-closed guard retained prerequisite.
3. A runtime session authority mezok worktree mode-ban producerkent tenylegesen irtak lesznek, de ettol meg downstream consume nem nyilik meg.
4. Ha a producer closure reszben sikerulne, de a runtime session finalize/update nem zarhato le, a start fail-closed marad; nincs silent drop-back a legacy authority-nelkulisegre.

### Contract Boundary / Blast Radius

1. `contract_boundary_override`: `yes`
2. Erintett contractok:
   - runtime session producer port/dependency contract
   - start producer/finalize/rollback contract
   - runtime session persisted authority write behavior
3. Phase ownership anchor:
   - Phase 1B2 csak a canonical workspace producer seamet owns-olja
   - Phase 1C1 consumer ownershipa nem nyilik meg ebben a taskban
4. Fan-out note:
   - a producer output kesobbi critical consume familykhez vezet, de ezek ebben a fazisban csak inventory/prereq szerepben maradnak.

### Complexity Risk Gate

1. `authority_risk`: `2`
2. `surface_spread`: `1`
3. `identity_join_risk`: `2`
4. `activation_coupling`: `0`
5. `prerequisite_risk`: `1`
6. `acceptance_multiplicity`: `1`
7. `risk_score`: `7`
8. `single-task allowed`: `yes`
9. If `no`, required split:
   - `N/A`
   - `N/A`
   - `N/A`
10. Identity/join note:
   - canonical identity Phase 1B2-ben: worktree-mode workspace authority producer -> runtime session record
   - competing identifiers: statikus `bubblePaths.worktreePath`, pre-bootstrap claim record, stale session legacy row
11. Authority/source-of-truth note:
   - canonical source worktree mode-ban a producer seam soran a bootstrap/result chain es a deterministic retained worktree identity
   - forbidden secondary source a custom clone authority vagy barmely consume-cutoverbol visszafejtett runtime truth.

## L1 - Change Contract

### 0) Domain / Control Contract

| Item | Rule | Implementation Consequence | Priority | Timing |
|---|---|---|---|---|
| Business invariant | Egy runtime session ugyanarra a canonical workspace authorityra mutasson a start producer es rollback soran. | Nem maradhat authority-nelkul producer path a worktree success es stale-session refresh folyamataiban. | P1 | required-now |
| Control model | Phase 1B2 producer-only fazis. | A task irhat es tarolhat authorityt, de nem valt at canonical consume-ra. | P1 | required-now |
| Read-path rule | Producer output persistalhato, de tmux/runtime/bubble-loop nem fogyaszthatja meg. | `startCommandTmuxLaunch.ts` es hasonlo consume surfaces tiltottak. | P1 | required-now |
| Forbidden fallback | Clone-success custom bootstrap vagy consume-side authority inference tilos. | A clone fail-closed guard retained, es az uj produce path csak worktree mode-ban mukodhet. | P1 | required-now |
| Allowed resolution path | Worktree mode-ban a retained worktree identity ugyanazon authority chain determinisztikus oldala. | Resume/recovery update nem minosul tiltott fallbacknak, ha explicit worktree-only producer closure marad. | P1 | required-now |
| Missing-data rule | Producer write hianya worktree mode-ban fail-closed. | Nem engedheto meg, hogy a start csendben workspace authority nelkul fejezodjon be ott, ahol a producer closure mar in-scope. | P1 | required-now |
| Phase boundary | Ez csak producer foundation. | Tmux, runtime delivery, reviewer context, bubble-loop es activation successor task marad. | P2 | required-now |

### 1) Call-site Matrix

| ID | File | Function/Entry | Exact Signature (args -> return) | Insertion Point | Expected Behavior | Priority | Timing | Evidence |
|---|---|---|---|---|---|---|---|---|
| CS1 | `src/v11/shared/ports/runtimeSessions.ts` | runtime session producer port | additive producer port types | shared runtime port | explicit upsert/finalize producer contract letezik az authority mezok tenyleges kiirasahoz | P1 | required-now | T1, T2, T4 |
| CS2 | `src/v11/application/start/startCommandContract.ts`, `startCommandOrchestration.ts` | dependency resolution | start dependency resolution surface | start orchestration seam | a start flow explicit runtime session finalize/update dependencyt kap; ez producer-only seam, nem consumer cutover | P1 | required-now | T1, T2 |
| CS3 | `src/v11/application/start/startCommandSession.ts` | runtime session claim/finalize/update helpers | existing start session helper surface | start producer seam | fresh es resumable worktree pathon a runtime session record stabilan megkapja `workspacePath` + `workspaceKind` authorityt; stale-session reclaim update sem esik vissza legacy authority-nelkulisegre | P1 | required-now | T1, T2, T3 |
| CS4 | `src/v11/application/start/startCommandFlows.ts` | fresh/resume producer wiring | `runFreshStartFlow(...)`, `runResumeStartFlow(...)` | start flow sequencing | fresh path bootstrap utan finalize/update producer lezaras; resume path worktree-mode retained authority update; clone guard retained | P1 | required-now | T1, T2, T5 |
| CS5 | `src/v11/application/start/startCommandCleanup.ts` | failed-start rollback identity | existing cleanup helper | rollback producer seam | fresh-start rollback ugyanannak a worktree authority chainnek a cleanup identityjat hasznalja, nem hallgatozolagos statikus fallbackkent | P1 | required-now | T3 |
| CS6 | `src/v11/infrastructure/executor/sessionRuntime/runtimeSessionsRegistry.ts` | runtime session write path | `upsertRuntimeSession(...)` existing export | runtime session persistence seam | a producer finalize/update writer explicit authority payloadot tud fogadni es persistalni a start flowbol | P1 | required-now | T4 |
| CS7 | `tests/core/bubble/startBubble.test.ts`, `tests/core/runtime/restartRecovery.test.ts`, `tests/core/runtime/startupReconciler.test.ts`, `tests/contracts/v11/start.contract.runner.ts`, `tests/contracts/v11/start.contract.test.ts`, `tests/core/runtime/sessionsRegistry.test.ts` | producer regression tests | unit/integration/contract | primary validation surface | worktree-mode producer closure explicit bizonyitasa fresh, rollback es restart/reclaim utakon; clone tovabbra is blocked | P1 | required-now | T1-T6 |

### 2) Data and Interface Contract

| Contract | Current | Target | Required Fields | Optional Fields | Compatibility | Priority | Timing |
|---|---|---|---|---|---|---|---|
| Runtime session producer behavior | authority fields schema-levelen leteznek, de a start producer jellemzoen nem irja oket | worktree-mode producer authority tenylegesen persistalodik | existing fields + worktree-mode finalize/update eseten `workspacePath`, `workspaceKind` | legacy absence tovabbra is olvashato historical rekordokra | additive persistence behavior; consumer cutover nelkul | P1 | required-now |
| Fresh bootstrap -> finalize seam | bootstrap letrehozza a workspace-t, de authority finalize nincs explicit lezarva | bootstrap eredmenye explicit producer input runtime session finalize-hoz | `workspaceKind="worktree"`, `workspacePath=<worktree authority>` worktree mode-ban | `N/A` | additive producer closure | P1 | required-now |
| Resume / reclaim producer seam | stale-session reclaim vagy resumable start utan a session row legacy shape-ben is ujra letrejohet | resumable worktree path explicit authority update-et kap | `workspaceKind="worktree"`, `workspacePath=<retained worktree authority>` | `N/A` | additive update; clone tovabbra is blocked | P1 | required-now |

Implementation notes:

1. Phase 1B2-ben a canonical worktree-mode `workspacePath` determinisztikusan a retained worktree authoritybol szarmazhat; ez nem consumer fallback, hanem producer closure.
2. Fresh start esetben a preferred producer source a bootstrap/result chain; resumable worktree pathon explicit deterministic retained authority hasznalhato, mert bootstrap nem fut ujra.
3. A runtime session finalize/update Phase 1B2-ben nem jelent uj start outcome-ot, csak explicit persistence closure-t.
4. Ha a producer finalize/update kulon portot igenyel, az a start dependency contract resze legyen; ne keruljon bele tmux vagy bubble-loop consumer surface ugyanebben a taskban.

### 3) Side Effects Contract

| Area | Allowed | Forbidden | Notes | Priority | Timing |
|---|---|---|---|---|---|
| runtime session persistence | explicit authority finalize/update write | consume-side decision logic vagy tmux launch cutover | producer-only write seam | P1 | required-now |
| start flow sequencing | bootstrap utani producer finalize, resume update | `startCommandTmuxLaunch.ts` consume valtoztatas | start sequencing csak annyiban mozoghat, amennyi a producer closure-hoz kell | P1 | required-now |
| rollback cleanup | produced worktree authority chain explicit hasznalata | clone authority cleanup vagy remote topology cleanup | rollback csak worktree-mode producer closure | P1 | required-now |
| clone safety | retained explicit reject | clone-success custom bootstrap vagy partial producer activation | 1B1 guard erintetlen prereq | P1 | required-now |

Constraint: ha itt nincs explicit consume alignment engedelyezve, az implementacio nem modosit tmux/runtime/reviewer-context/bubble-loop consume reteget.

### 4) Error and Fallback Contract

| Trigger | Dependency (if any) | Behavior (`throw|result|fallback`) | Fallback Value/Action | Reason Code | Log Level | Priority | Timing |
|---|---|---|---|---|---|---|---|
| worktree-mode authority finalize/update write sikertelen | runtime session writer | throw | fail-closed start hiba; nincs silent legacy record | existing start/runtime session error surface retained | error | P1 | required-now |
| worktree-mode producer input hianyzik ott, ahol finalize in-scope | bootstrap/result or retained worktree identity | throw | fail-closed; start nem fejezodhet be authority nelkul | existing start error normalization retained | error | P1 | required-now |
| `work_mode=clone` start | retained start guard | throw | explicit reject, state unchanged | `WORKSPACE_MODE_CLONE_NOT_ACTIVATED` vagy retained state-not-startable | error | P1 | required-now |
| historical legacy runtime session record authority nelkul | runtime session parser | result | tovabbra is olvashato legacy record | `N/A` | info | P1 | required-now |

### 5) Dependency Constraints

| Type | Items | Priority | Timing |
|---|---|---|---|
| must-use | `plans/remote-bubble-execution-contract-and-phasing-plan-v2.md` | P1 | required-now |
| must-use | archived Phase 1B1 task mint retained contract baseline | P1 | required-now |
| must-not-use | `src/v11/application/start/startCommandTmuxLaunch.ts` | P1 | required-now |
| must-not-use | `src/v11/application/pass/**`, `converged/**`, `askHuman/**`, `metaReview*/**` consume cutover | P1 | required-now |
| must-not-use | clone-success custom bootstrap proof vagy hidden activation | P1 | required-now |
| must-not-use | operator wording/status/list/attach surface valtozas | P1 | required-now |

### 6) Test Matrix

| ID | Scenario | Given | When | Then | Priority | Timing | Evidence |
|---|---|---|---|---|---|---|---|
| T1 | fresh worktree start finalizes canonical workspace authority | `work_mode=worktree`, successful fresh start | `startBubble(...)` lefut | runtime session record explicit `workspacePath=<worktree authority>` es `workspaceKind="worktree"` mezokkel zarul; worktree success baseline valtozatlan marad | P1 | required-now | `tests/core/bubble/startBubble.test.ts` |
| T2 | resumable worktree reclaim/update keeps authority explicit | stale runtime session reclaim vagy resumable worktree restart | `reconcileRuntimeSessions(...)` utan `startBubble(...)` fut | az ujra letrejott runtime session record authority mezoket is hordoz; nincs visszaeses legacy authority-nelkulisegre | P1 | required-now | `tests/core/runtime/restartRecovery.test.ts`, `tests/core/runtime/startupReconciler.test.ts` |
| T3 | failed fresh start rollback keeps producer identity coherent | bootstrap sikerul, kesobbi start lepes hibara fut | cleanup/rollback lefut | nincs stale runtime session record; a rollback worktree identity ugyanahhoz az authority chainhez kotheto, amelyet a bootstrap producer eltolt volna | P1 | required-now | `tests/core/bubble/startBubble.test.ts` |
| T4 | runtime session upsert/update preserves additive authority on producer paths | session write/update producer helper fut | upsert/finalize/update lefut | az authority mezok stabilan roundtripolnak update pathon is, nem csak parser-levelen | P1 | required-now | `tests/core/runtime/sessionsRegistry.test.ts` |
| T5 | start contract harness proves producer closure without clone activation | v11 start contract worktree es clone scenario vegigfut | contract runner lefut | worktree producer path explicit evidence-t kap; clone scenario tovabbra is reject marad | P1 | required-now | `tests/contracts/v11/start.contract.runner.ts`, `tests/contracts/v11/start.contract.test.ts` |
| T6 | clone fail-closed retained after producer wiring | clone fresh/resume cases | `startBubble(...)` vagy contract harness fut | producer closure nem nyit clone success vagy clone authority write pathot | P1 | required-now | `tests/core/bubble/startBubble.test.ts`, `tests/contracts/v11/start.contract.test.ts` |

## L2 - Implementation Notes (Optional)

1. [later-hardening] A Phase 1C1 consume-cutover elott erdemes lesz kulon helperbe tenni a worktree producer authority determinisztikus levezeteset, hogy a resume/fresh producer es a kesobbi consume ugyanazt a nyelvet hasznalja.

## Hardening Backlog (Optional)

| ID | Item | Layer | Priority | Timing | Source | Proposed Action |
|---|---|---|---|---|---|---|
| H1 | A consumer-facing tmux/runtime consume helper Phase 1C1-ben kozositse a retained worktree identity es a producer output olvasasat | L2 | P2 | later-hardening | Phase split boundary | kulon consume-alignment taskban lezarni |

## Review Control

1. Every finding must include: `priority`, `timing`, `layer`, `evidence`.
2. Max 2 L1 hardening rounds.
3. After round 2, new `required-now` is allowed only for evidence-backed `P0/P1`.
4. Items outside L1 blocker scope must be tagged `later-hardening`.
5. If `contract_boundary_override=yes`, `plan_ref` is mandatory and must align with L1 contract rows.

## Spec Lock

Mark task as `IMPLEMENTABLE` when all `P0/P1 + required-now` items are closed.
