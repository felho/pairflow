---
artifact_type: task
artifact_id: task_remote_bubble_execution_phase1b2_workspace_authority_producer_foundation_v1
title: "Remote Bubble Execution Workspace Authority Producer Foundation (Phase 1B2)"
status: implementable
phase: phase1b2-workspace-authority-producer-foundation
target_files:
  - src/v11/shared/ports/runtimeSessions.ts
  - src/v11/application/start/startCommandApi.ts
  - src/v11/application/start/startCommandContract.ts
  - src/v11/application/start/startCommandOrchestration.ts
  - src/v11/application/start/startCommandSession.ts
  - src/v11/application/start/startCommandFlows.ts
  - src/v11/application/start/startCommandCleanup.ts
  - src/v11/defaults/start/startBubbleDefaults.ts
  - src/v11/infrastructure/executor/sessionRuntime/runtimeSessionsRegistry.ts
  - tests/core/bubble/startBubble.test.ts
  - tests/core/runtime/restartRecovery.test.ts
  - tests/core/runtime/startupReconciler.test.ts
  - tests/core/runtime/sessionsRegistry.test.ts
  - tests/contracts/v11/start.contract.runner.ts
  - tests/contracts/v11/start.contract.test.ts
  - tests/v11/application/start/startCommandOrchestration.test.ts
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
4. A failed-start cleanup/rollback ma meg mindig a retained `bubblePaths.worktreePath` vonalon dolgozik; worktree modban ez ma helyes, de producer szinten nincs kimondva, hogy a bubble-szintu worktree pathot az adott start attempt ugyanannak a canonical authority chainnek a determinisztikus azonos oldalakent viszi tovabb.
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
2. Control model: Phase 1B2-ben worktree mode-ban pontosan ket engedelyezett producer source van, mindketto utvonal-specifikusan:
   - fresh start: az aktualis sikeres `bootstrapWorktreeWorkspace(...)` result `worktreePath` kimenete,
   - resume / reclaim: a bubble-hoz tartozo `bubblePaths.worktreePath`, amelyet a start/recovery attempt mar bemenetkent hordoz a runtime session update elott.
   Consumer cutover meg nincs, es a ket ut kozott nincs harmadik feloldasi forras vagy fallback-sorrend.
3. Read-path rule: a canonical workspace authority Phase 1B2-ben eloallithato es tarolhato, de a tmux launch, runtime delivery, reviewer-context, bubble-loop es operator read surfaces nem allhatnak at ra ebben a taskban.
4. Forbidden fallback: clone-success custom bootstrap, reszleges clone authority produce, vagy barmilyen olyan consume-cutover tiltott, amely Phase 1C1 elott mar runtime truthkent hasznalna a producer outputot.
5. Allowed resolution path: worktree mode-ban a producer closure determinisztikusan csak az aktualis utvonalhoz rendelt source-bol allithat elo canonical `workspacePath` erteket:
   - fresh startban a mostani bootstrap resultbol,
   - resume / reclaim pathon a bubble-hoz tartozo `bubblePaths.worktreePath`-bol, amelyet a start/recovery attempt mar bemenetkent hordoz.
   Runtime-session-recordbol, status/read-modelbol, tmux-bol, reviewer-contextbol vagy mas consumer surface felol visszafele authorityt rekonstrualni tiltott.
6. Attempt-local rule: a rollback authority Phase 1B2-ben producer-oldali attempt-local data flow marad a `startBubble()` catch/cleanup orchestration es a fresh/resume flow state kozott; nem lesz state-level `execution_context` authority, es nem nyilik uj state contract a workspace field familynek.
7. Missing-data rule: ha worktree mode-ban a producer closure nem tud explicit authority payloadot letrehozni vagy tartosan sessionbe irni, a start fail-closed hibaval alljon meg; clone mod tovabbra is az 1B1 guardon bukjon el.
8. Phase boundary: ez csak `producer_foundation`; tmux launch consume, runtime delivery consume, reviewer-context consume, bubble-loop consume es activation kulon successor task ownership.

### Authority Boundary Map

1. Authority producer:
   - fresh-start bootstrap result worktree mode-ban
   - resumable worktree recovery bubble-szintu `bubblePaths.worktreePath` inputja, amelyet a start/recovery attempt mar bemenetkent hordoz
2. Stored authority:
   - runtime session record `workspacePath`, `workspaceKind`
3. Resolution rule:
   - egy start attempten belul pontosan egy authority source valaszthato az aktualis utvonal szerint
   - resume/reclaim pathon ez a source a bubble-hoz tartozo `bubblePaths.worktreePath`, amelyet a start/recovery attempt mar bemenetkent hordoz
   - a rollback ugyanazt a mar feloldott attempt-scope worktree identityt hasznalja, nem ujraszamitott masodlagos forrast
   - az attempt-local authority handoff a start orchestration es a flow-local progress adatfolyamaban marad; a futasi `execution_context` ebben a fazisban nem workspace authority tarolo
4. In-scope consumers:
   - start/runtime producer finalize/update seam
   - failed-start rollback cleanup identity
5. Explicit out-of-scope consumers:
   - `startCommandTmuxLaunch.ts`
   - runtime delivery / reviewer refresh surfaces
   - `pass`, `converged`, `askHuman`, `meta_review_result`
   - status/list/attach/read-model
6. Export surfaces:
   - ebben a fazisban nem zarodnak le; a producer output csak persistence/business proof.

### Baseline Preservation

1. `must_preserve_behaviors`
   - `work_mode=worktree` sikeres start es resume baseline valtozatlan maradjon
   - stale-session reclaim tovabbra is unblockolhassa a resumable worktree startot
   - `work_mode=clone` explicit reject maradjon fresh es resume utvonalon is
2. `allowed_resolution_paths`
   - fresh start: `bootstrapWorktreeWorkspace(...).worktreePath` -> runtime session finalize
   - resume / restart recovery worktree mode-ban: a bubble-hoz tartozo `bubblePaths.worktreePath`, amelyet a start/recovery attempt mar bemenetkent hordoz -> runtime session update
   - failed fresh start rollback: a jelen attemptben mar feloldott worktree identity -> cleanup
3. `forbidden_regression_interpretations`
   - a producer closure nem nyithat clone activationt
   - a producer closure nem jelent consume cutovert tmux / runtime / bubble-loop feluleteken
   - a retained `bubblePaths.worktreePath` deterministic producer-oldali hasznalata worktree mode-ban csak resume/reclaim pathon engedelyezett, es nem minosul tiltott fallbacknak; ez nem jelent state-level `execution_context` authorityt
   - rollback nem valthat at masodlagos feloldasra; a cleanup authority minden esetben ugyanabbol az attempt-scope producer source-bol jon
4. `replacement_proof_required_if_removed`
   - ha barmely retained worktree identity path kikerul, explicit bizonyitani kell, hogy ugyanazt a canonical authorityt mas, azonos authority-chainen levo producer forras adja.

### In Scope

1. A runtime session producer surface explicit closureja worktree mode-ban: a runtime session record tenylegesen megkapja a canonical `workspacePath` es `workspaceKind` mezoket.
2. Fresh-start bootstrap utan runtime session finalize/update producer wiring.
3. Resumable worktree start vagy stale-session reclaim utani runtime session update producer wiring, worktree baseline megtartasaval.
4. `startCommandApi.ts` try/catch orchestration seam explicit ownershipa: a producer write attempt-local authorityja es a rollback cleanup kozti handoff itt is le van irva.
5. Failed-start rollback identity explicit producer closureja worktree mode-ban.
6. A producer surfacehez szukseges dependency/port bovites a start command contracton belul, beleertve a default dependency wiringet is.
7. Ugyanazon attemptben a runtime session write es a cleanup ugyanazt a worktree identityt kapja bemenetkent, nem kulon consumer-source lookupbol dolgozik.
8. A fenti boundaryk tesztjei.

### Out of Scope

1. `startCommandTmuxLaunch.ts` canonical workspace consume cutover.
2. Resume transcript summary, reviewer-context, delivery targeting vagy tmux pane inditas authority consume-ja.
3. `pass`, `converged`, `ask-human`, `meta_review_result` consume alignment.
4. Operator read-model vagy CLI wording valtozas.
5. Barmilyen successful clone-topology start.
6. Remote execution write/read surfaces.
7. Uj `BubbleExecutionContext` workspace authority field vagy execution-context builder contract-bovites.

### Safety Defaults

1. `work_mode=worktree` viselkedes regresszio nelkul megmarad.
2. `work_mode=clone` tovabbra sem kap successful start pathot; a Phase 1B1 fail-closed guard retained prerequisite.
3. A runtime session authority mezok worktree mode-ban producerkent tenylegesen irtak lesznek, de ettol meg downstream consume nem nyilik meg.
4. Ha a producer closure reszben sikerulne, de a runtime session finalize/update nem zarhato le, a start fail-closed marad; nincs silent drop-back a legacy authority-nelkulisegre.
5. Ha rollback szukseges, az ugyanazt a mar feloldott worktree identityt hasznalja; nincs kulon "mento" authority lookup consumer vagy operator surface felol.
6. A Phase 1B2 nem teszi workspace authority source-sza az `execution_context`et, es nem bovit uj state-level authority mezokkel.

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
   - competing identifiers: pre-bootstrap claim record, stale session legacy row, valamint barmely consumer-surface alapjan visszafejtett path
11. Authority/source-of-truth note:
   - canonical source worktree mode-ban a producer seam soran a bootstrap/result chain es resume/reclaim eseten a bubble-hoz tartozo `bubblePaths.worktreePath`, amelyet a start/recovery attempt mar bemenetkent hordoz
   - forbidden secondary source a custom clone authority vagy barmely consume-cutoverbol visszafejtett runtime truth.

## L1 - Change Contract

### 0) Domain / Control Contract

| Item | Rule | Implementation Consequence | Priority | Timing |
|---|---|---|---|---|
| Business invariant | Egy runtime session ugyanarra a canonical workspace authorityra mutasson a start producer es rollback soran. | Nem maradhat authority-nelkul producer path a worktree success es stale-session refresh folyamataiban, es ugyanazon attempten belul nem lehet ket kulon authority source. | P1 | required-now |
| Control model | Phase 1B2 producer-only fazis. | A task irhat es tarolhat authorityt, de nem valt at canonical consume-ra. | P1 | required-now |
| Read-path rule | Producer output persistalhato, de tmux/runtime/bubble-loop nem fogyaszthatja meg. | `startCommandTmuxLaunch.ts` es hasonlo consume surfaces tiltottak. | P1 | required-now |
| Forbidden fallback | Clone-success custom bootstrap vagy consume-side authority inference tilos. | A clone fail-closed guard retained, es az uj produce path csak worktree mode-ban mukodhet. | P1 | required-now |
| Allowed resolution path | Worktree mode-ban utvonalankent pontosan egy authority source engedelyezett. | Fresh start csak bootstrap resultbol irhat authorityt; resume/recovery csak a start/recovery attempt altal mar hordozott `bubblePaths.worktreePath`-bol frissithet; rollback ugyanennek az attempt-scope identitynek a cleanup oldalat hasznalja. | P1 | required-now |
| Missing-data rule | Producer write hianya worktree mode-ban fail-closed. | Nem engedheto meg, hogy a start csendben workspace authority nelkul fejezodjon be ott, ahol a producer closure mar in-scope. | P1 | required-now |
| Phase boundary | Ez csak producer foundation. | Tmux, runtime delivery, reviewer context, bubble-loop es activation successor task marad. | P1 | required-now |

### 1) Call-site Matrix

| ID | File | Function/Entry | Exact Signature (args -> return) | Insertion Point | Expected Behavior | Priority | Timing | Evidence |
|---|---|---|---|---|---|---|---|---|
| CS1 | `src/v11/shared/ports/runtimeSessions.ts` | runtime session producer port | runtime session create/update payload types -> persisted record | shared runtime port | a producer write contract explicit `workspacePath` + `workspaceKind` authority payloadot tud fogadni worktree-mode finalize/update utakon | P1 | required-now | T1, T2, T4 |
| CS2 | `src/v11/application/start/startCommandApi.ts` | start orchestration entrypoint | `startBubble(...)` orchestration entry -> result/throw | try/catch coordination seam | a producer write attempt-local authority handoffja es a rollback cleanup kozti ownership itt explicit; Phase 1B2-ben ez producer-side data flow, nem `execution_context` state contract | P1 | required-now | T3, T7 |
| CS3 | `src/v11/application/start/startCommandContract.ts` | producer dependency contract | existing start dependencies -> typed contract | start dependency contract seam | a start dependency contract explicit producer-writer dependencyt hordoz, consumer oldali uj dependency nelkul | P1 | required-now | T1, T2 |
| CS3b | `src/v11/application/start/startCommandOrchestration.ts` | producer dependency wiring | existing start dependencies -> orchestration wiring | start orchestration seam | az orchestration a producer-writer dependencyt tovabbadja, de nem vezet be uj read/consume dependency-t tmux vagy bubble-loop feluletekre | P1 | required-now | T1, T2 |
| CS3c | `src/v11/defaults/start/startBubbleDefaults.ts` | producer dependency default wiring | canonical infrastructure defaults -> start dependency bundle | default dependency seam | a default start wiring a producer-writer dependencyt is a canonical runtime-session infrastructure exporthoz koti, hogy a CLI/default start path se maradjon felig bekotve | P1 | required-now | T1, T2, T4 |
| CS4 | `src/v11/application/start/startCommandSession.ts` | runtime session ownership claim surface | existing claim-oriented session surface | start producer seam | a jelenlegi claim-oriented surface Phase 1B2-ben a producer authority write iranyaba bovulhet: fresh pathon a bootstrap resultbol, resume/reclaim pathon a bubble-hoz tartozo `bubblePaths.worktreePath`-bol irja be a runtime session authority mezoket, amelyet a start/recovery attempt mar bemenetkent hordoz; a surface nem feltetelez mar meglevo finalize/update helper-csaladot, es nem vegez secondary lookupot consumer surface-ek fele | P1 | required-now | T1, T2, T3 |
| CS5 | `src/v11/application/start/startCommandFlows.ts` | fresh/resume producer wiring | `runFreshStartFlow(...)`, `runResumeStartFlow(...)` | fresh/resume flow state seam | a fresh es resume utak csak az adott pathhoz engedelyezett authority source-ot adjak tovabb a producer writernek; fresh flowban az attempt-local rollback authority a flow/progress adatokban marad a catch-orchestrationig, state-level `execution_context` authority nelkul | P1 | required-now | T1, T2, T3, T5 |
| CS6 | `src/v11/application/start/startCommandCleanup.ts` | failed-start rollback identity | existing cleanup helper | rollback producer seam | rollback ugyanazt az attempt-scope worktree identityt kapja, amelyre a producer write epult volna; nincs kulon status/tmux/read-model alapu ujrafeloldas | P1 | required-now | T3, T7 |
| CS7 | `src/v11/infrastructure/executor/sessionRuntime/runtimeSessionsRegistry.ts` | runtime session write path | `upsertRuntimeSession(...)` existing export | runtime session persistence seam | a producer finalize/update writer explicit authority payloadot tud fogadni es persistalni a start flowbol, legacy parser/read viselkedes valtoztatasa nelkul | P1 | required-now | T4 |
| CS8 | `src/types/bubble.ts`, `src/v11/shared/state/executionContext.ts` | state contract guardrail | existing `BubbleExecutionContext` shape / execution-context builders | state-contract negative boundary | az aktualis state/execution_context shape nem lesz workspace authority source vagy uj authority-field family target ebben a fazisban | P1 | required-now | T3, T7 |
| CS9 | `tests/core/bubble/startBubble.test.ts`, `tests/core/runtime/restartRecovery.test.ts`, `tests/core/runtime/startupReconciler.test.ts`, `tests/contracts/v11/start.contract.runner.ts`, `tests/contracts/v11/start.contract.test.ts`, `tests/core/runtime/sessionsRegistry.test.ts`, `tests/v11/application/start/startCommandOrchestration.test.ts` | producer regression tests | unit/integration/contract | primary validation surface | worktree-mode producer closure explicit bizonyitasa fresh, rollback es restart/reclaim utakon; clone tovabbra is blocked; a default dependency wiring explicit regressziotesztet kap | P1 | required-now | T1-T7 |

### 2) Data and Interface Contract

| Contract | Current | Target | Required Fields | Optional Fields | Compatibility | Priority | Timing |
|---|---|---|---|---|---|---|---|
| Runtime session producer behavior | authority fields schema-levelen leteznek, de a start producer jellemzoen nem irja oket | worktree-mode producer authority tenylegesen persistalodik | existing fields + worktree-mode finalize/update eseten `workspacePath`, `workspaceKind` | legacy absence tovabbra is olvashato historical rekordokra | additive persistence behavior; consumer cutover nelkul | P1 | required-now |
| Fresh bootstrap -> finalize seam | bootstrap letrehozza a workspace-t, de authority finalize nincs explicit lezarva | bootstrap eredmenye explicit producer input runtime session finalize-hoz | `workspaceKind="worktree"`, `workspacePath=<current bootstrap result worktreePath>` worktree mode-ban | `N/A` | additive producer closure | P1 | required-now |
| Resume / reclaim producer seam | stale-session reclaim vagy resumable start utan a session row legacy shape-ben is ujra letrejohet | resumable worktree path explicit authority update-et kap | `workspaceKind="worktree"`, `workspacePath=<bubblePaths.worktreePath carried by the start/recovery attempt before session write>` | `N/A` | additive update; clone tovabbra is blocked, es nincs runtime-session/status/tmux/reviewer-context reverse resolution | P1 | required-now |
| Rollback identity seam | cleanup worktree path implicit retained baseline-kent letezhet | cleanup ugyanazt az attempt-scope authority identityt hasznalja, amelyet a producer writer kapott | same worktree identity as finalize/update candidate | `N/A` | nincs uj cleanup source hierarchy vagy consumer lookup | P1 | required-now |
| Attempt-local handoff seam | a rollback correctness jelenleg az orchestration es flow-local adatokon mulik a RUNNING mutation elott | a producer write es cleanup kozti authority-handoff attempt-local data flowkent van leirva | same resolved worktree identity as producer candidate | `N/A` | nincs uj `BubbleExecutionContext` vagy execution-context builder authority contract | P1 | required-now |

Implementation notes:

1. Phase 1B2-ben a canonical worktree-mode `workspacePath` csak az aktualis pathhoz rendelt producer source-bol szarmazhat; ez nem consumer fallback, hanem producer closure.
2. Fresh start esetben a kotelezo producer source a current bootstrap/result chain; resumable worktree pathon a kotelezo producer source a bubble-hoz tartozo `bubblePaths.worktreePath`, amelyet a start/recovery attempt mar bemenetkent hordoz, mert bootstrap nem fut ujra.
3. Fresh-start rollback Phase 1B2-ben a `startBubble()` orchestration catch/cleanup es a `FreshStartProgress`/fresh-flow adatok kozti attempt-local handoffra tamaszkodhat; nem tarol workspace authorityt `execution_context`ben.
4. A rollback ugyanazt a mar feloldott worktree identityt vigye tovabb, ne masodik lookupbol probalja visszafejteni a canonical authorityt.
5. A runtime session finalize/update Phase 1B2-ben nem jelent uj start outcome-ot, csak explicit persistence closure-t.
6. Ha a producer finalize/update kulon portot igenyel, az a start dependency contract resze legyen; ne keruljon bele tmux vagy bubble-loop consumer surface ugyanebben a taskban.

### 3) Side Effects Contract

| Area | Allowed | Forbidden | Notes | Priority | Timing |
|---|---|---|---|---|---|
| runtime session persistence | explicit authority finalize/update write | consume-side decision logic vagy tmux launch cutover | producer-only write seam | P1 | required-now |
| start flow sequencing | bootstrap utani producer finalize, resume update | `startCommandTmuxLaunch.ts` consume valtoztatas vagy secondary authority lookup sorrend | start sequencing csak annyiban mozoghat, amennyi a producer closure-hoz kell, es utvonalankent egy authority source marad | P1 | required-now |
| rollback cleanup | produced worktree authority chain explicit hasznalata | clone authority cleanup, remote topology cleanup vagy consumer-surface alapu ujrafeloldas | rollback csak worktree-mode producer closure | P1 | required-now |
| clone safety | retained explicit reject | clone-success custom bootstrap vagy partial producer activation | 1B1 guard erintetlen prereq | P1 | required-now |

Constraint: ha itt nincs explicit consume alignment engedelyezve, az implementacio nem modosit tmux/runtime/reviewer-context/bubble-loop consume reteget.

### 4) Error and Fallback Contract

| Trigger | Dependency (if any) | Behavior (`throw|result|fallback`) | Fallback Value/Action | Reason Code | Log Level | Priority | Timing | Evidence |
|---|---|---|---|---|---|---|---|---|
| worktree-mode authority finalize/update write sikertelen | runtime session writer | throw | fail-closed start hiba; nincs silent legacy record | existing start/runtime session error surface retained | error | P1 | required-now | T1, T2, T4 |
| fresh-start producer input hianyzik finalize elott | bootstrap result | throw | fail-closed; fresh start nem fejezodhet be authority nelkul | existing start error normalization retained | error | P1 | required-now | T1 |
| resume/reclaim producer input hianyzik update elott | attempt-scoped `bubblePaths.worktreePath` | throw | fail-closed; resume/reclaim nem fejezodhet be authority nelkul | existing start error normalization retained | error | P1 | required-now | T2 |
| rollback masodlagos authority source-ra valtana | cleanup identity resolution | throw | fail-closed; cleanup nem vehet at status/tmux/read-model eredetu source-ot | existing cleanup/start error normalization retained | error | P1 | required-now | T3, T7 |
| `work_mode=clone` start | retained start guard | throw | explicit reject, state unchanged | `WORKSPACE_MODE_CLONE_NOT_ACTIVATED` vagy retained state-not-startable | error | P1 | required-now | T6 |
| historical legacy runtime session record authority nelkul | runtime session parser | result | tovabbra is olvashato legacy record | `N/A` | info | P1 | required-now | T4 |

Binding note:
1. `T3` a rollback koherencia fo bizonyitasa.
2. `T7` a secondary-source tiltasi invarians kulon explicit bizonyitasa.
3. A legacy parser/read compatibility row csak historical backward-compat guard; nem resze az uj producer source feloldasanak, es nem nyit consumer-side reverse resolutiont.

### 5) Dependency Constraints

| Type | Items | Priority | Timing |
|---|---|---|---|
| must-use | `plans/remote-bubble-execution-contract-and-phasing-plan-v2.md` | P1 | required-now |
| must-use | archived Phase 1B1 task mint retained contract baseline | P1 | required-now |
| must-use | `src/v11/application/start/startCommandApi.ts` catch/cleanup orchestration seam mint attempt-local producer handoff boundary | P1 | required-now |
| must-not-use | `src/v11/application/start/startCommandTmuxLaunch.ts` | P1 | required-now |
| must-not-use | runtime session record authority sourcekent resume/reclaim vagy rollback producer feloldashoz | P1 | required-now |
| must-not-use | runtime delivery / reviewer refresh / status-list-attach read-model surfaces authority sourcekent | P1 | required-now |
| must-not-use | `src/types/bubble.ts`, `src/v11/shared/state/executionContext.ts` mint workspace authority source vagy uj state contract Phase 1B2-ben | P1 | required-now |
| must-not-use | `src/v11/application/pass/**`, `converged/**`, `askHuman/**`, `metaReview*/**` consume cutover | P1 | required-now |
| must-not-use | clone-success custom bootstrap proof vagy hidden activation | P1 | required-now |
| must-not-use | operator wording/status/list/attach surface valtozas | P1 | required-now |

### 6) Test Matrix

| ID | Scenario | Given | When | Then | Priority | Timing | Evidence |
|---|---|---|---|---|---|---|---|
| T1 | fresh worktree start finalizes canonical workspace authority | `work_mode=worktree`, successful fresh start, bootstrap explicit `worktreePath`-ot ad vissza | `startBubble(...)` lefut | runtime session record explicit `workspacePath=<same bootstrap worktreePath>` es `workspaceKind="worktree"` mezokkel zarul; worktree success baseline valtozatlan marad | P1 | required-now | `tests/core/bubble/startBubble.test.ts` |
| T2 | resumable worktree reclaim/update keeps authority explicit | stale runtime session reclaim vagy resumable worktree restart, bootstrap nem fut ujra | `reconcileRuntimeSessions(...)` utan `startBubble(...)` fut | az ujra letrejott runtime session record authority mezoket is hordoz; a `workspacePath` a bubble-hoz tartozo `bubblePaths.worktreePath`-val egyezik, amelyet a start/recovery attempt mar bemenetkent hordoz; nincs visszaeses legacy authority-nelkulisegre, es nincs reverse resolution runtime session/status/tmux/reviewer-context felol. Assertion split: `startupReconciler` a stale-session reclaim baseline-et tartja meg, `restartRecovery` pedig a resumable/restart authority update-et bizonyitja. | P1 | required-now | `tests/core/runtime/startupReconciler.test.ts` (reclaim precondition), `tests/core/runtime/restartRecovery.test.ts` (resume/update authority proof), `tests/v11/application/start/startCommandOrchestration.test.ts` (default wiring guard) |
| T3 | failed fresh start rollback keeps producer identity coherent | bootstrap sikerul, kesobbi start lepes hibara fut, producer source mar feloldodott, de RUNNING `execution_context` meg nem authority tarolo | cleanup/rollback lefut | nincs stale runtime session record; a rollback ugyanazt a worktree identityt kapja, amelyet a producer write kapott volna; ez a fo rollback-koherencia bizonyitas, es producer-side attempt-local data flowkent marad a catch/flow seam menten, mig a secondary-source tiltast `T7` kulon bizonyitja. | P1 | required-now | `tests/core/bubble/startBubble.test.ts` (rollback identity coherence assertion) |
| T4 | runtime session registry preserves additive authority and legacy read compatibility | runtime session writer/parser surface fut historical es producer-path recordokkal | upsert/finalize/update/read lefut | az authority mezok stabilan roundtripolnak update pathon is, es a historical authority-nelkuli legacy record olvashatosaga retained marad. Ez registry/writer/parser seam bizonyitas, kulon a `T1`/`T2` end-to-end flow proofoktol. | P1 | required-now | `tests/core/runtime/sessionsRegistry.test.ts` (writer/registry roundtrip + legacy read-compat assertions) |
| T5 | start contract harness proves producer closure without clone activation | v11 start contract worktree es clone scenario vegigfut | contract runner lefut | worktree producer path explicit evidence-t kap, es nem mozdit tmux/runtime consume surface-t; clone scenario tovabbra is reject marad | P1 | required-now | `tests/contracts/v11/start.contract.runner.ts`, `tests/contracts/v11/start.contract.test.ts` |
| T6 | clone fail-closed retained after producer wiring | clone fresh/resume cases | `startBubble(...)` vagy contract harness fut | producer closure nem nyit clone success vagy clone authority write pathot | P1 | required-now | `tests/core/bubble/startBubble.test.ts`, `tests/contracts/v11/start.contract.test.ts` |
| T7 | rollback secondary-source invariant stays explicit | rollback koherenciaja mar bizonyitott, es kulon ellenorizni kell a tiltott secondary-source tilalmat is | a rollbackhoz tartozo implementacio-illeszkedo assertion surface ervenyesul | explicit bizonyitas rogzitett, hogy a cleanup authority nem rekonstruhato runtime session recordbol, status/read-modelbol, tmux-bol vagy reviewer-contextbol, es nem valik state-level `execution_context` authorityve; ez invarians-bizonyitas, nem kotelezo kulon uj behavior branch | P1 | required-now | `tests/core/bubble/startBubble.test.ts` (separate secondary-source prohibition assertion) |

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

Task `IMPLEMENTABLE`, amikor az osszes `P0/P1 + required-now` item zarva van, es a fenti contract/test matrix sorok kozott nincs nyitott belso ellentmondas.
