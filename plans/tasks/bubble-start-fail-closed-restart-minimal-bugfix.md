---
artifact_type: task
artifact_id: task_bubble_start_fail_closed_restart_minimal_bugfix_v1
title: "Bubble Start Fail-Closed Restart Minimal Bugfix"
status: implementable
phase: bugfix-startup-incomplete
target_files:
  - src/v11/application/start/startCommandApi.ts
  - src/v11/application/start/startCommandCleanup.ts
  - src/v11/application/start/startCommandFlows.ts
  - src/v11/application/start/startCommandOrchestration.ts
  - tests/core/bubble/startBubble.test.ts
  - tests/core/runtime/startupReconciler.test.ts
prd_ref: null
plan_ref: null
system_context_ref: docs/pairflow-initial-design.md
owners:
  - "felho"
---

# Task: Bubble Start Fail-Closed Restart Minimal Bugfix

## Current Codebase Check (2026-04-11)

1. A startup flow ma tobb lepesben megy `CREATED -> PREPARING_WORKSPACE -> RUNNING`, mikozben a bootstrap es a tmux launch koztes fail pontok maradhatnak.
2. A rendelkezesre allo kod- es tesztbizonyitek alapjan a problema elsodlegesen nem silent state corruption, hanem ritka startup-incomplete beragadas:
   - a bubble nem jut legitim `RUNNING` allapotba,
   - reszleges workspace/runtime residue maradhat,
   - operatori restart vagy reconcile szukseges lehet.
3. A jelen feladat celja nem recovery-authority modell epites, hanem a ritka hiba fail-closed kezelese a leheto legkisebb scope-pal.

## L0 - Policy

### Goal

Minimal bugfix szallitas a ritka startup-incomplete hibara ugy, hogy:
1. a rendszer ne folytathasson reszleges startup utan bizonytalan authorityval,
2. a user/operator egyertelmu restart-guidance-ot kapjon,
3. ne vezessunk be uj canonical recovery/state authority reget.

### In Scope

1. A fresh start failure path explicit fail-closed kezelese.
2. A `PREPARING_WORKSPACE`-ban ragadt bubble-ra adott start-hibauzenet tisztazasa.
3. A startup cleanup best-effort viselkedes pontositasa ott, ahol ez a restartot biztonsagosabba teszi.
4. A kapcsolodo tesztek frissitese a fail-closed + restart contractra.

### Out of Scope

1. Uj `startup_recovery` descriptor vagy barmilyen uj persisted recovery authority.
2. `PREPARING_WORKSPACE` explicit recovery/resume mode.
3. Retry-safe routing, admission policy, stale descriptor taxonomy.
4. Uj lifecycle state, uj operator command surface, vagy UI redesign.
5. Altalanos startup/recovery roadmap vagy foundation/refactor program.

### Safety Defaults

1. Reszleges startup utan a bubble nem folytathat normal runtime authorityval.
2. `PREPARING_WORKSPACE` alatt beragadt snapshot nem szamithat generic resumable allapotnak.
3. Tmux/runtime/worktree residue onmagaban nem lehet truth source vagy tovabbleptetesi alap.
4. Ha cleanup nem bizonyithatoan sikeres, a rendszer akkor is fail-closed maradjon, explicit restart/reconcile guidance mellett.
5. A task nem valtoztathatja meg a canonical state schema-t es nem adhat uj persisted recovery szemantikat.

### Contract Boundary / Blast Radius

1. `contract_boundary_override`: `no`
2. A task belso bugfix a start-orchestration, cleanup es operatori hibauzenet retegeben; nincs public API vagy config contract valtozas.

### Complexity Risk Gate

1. `authority_risk`: `0`
2. `surface_spread`: `1`
3. `identity_join_risk`: `0`
4. `activation_coupling`: `1`
5. `prerequisite_risk`: `0`
6. `acceptance_multiplicity`: `1`
7. `risk_score`: `3`
8. `single-task allowed`: `yes`
9. Identity/join note:
   - canonical identity path: `bubble_id -> resolved bubble paths -> state.json`
   - competing identifiers or fallback identities: tmux session name es worktree path csak operacios residue, nem authority identifier
10. Authority/source-of-truth note:
   - canonical source: a meglevo lifecycle snapshot es az ervenyes `execution_context` jelenlete
   - forbidden secondary sources: tmux existence alone, runtime registry residue alone, partial worktree alone

## L1 - Change Contract

### 1) Call-site Matrix

| ID | File | Function/Entry | Exact Signature (args -> return) | Insertion Point | Expected Behavior | Priority | Timing | Evidence |
|---|---|---|---|---|---|---|---|---|
| CS1 | `src/v11/application/start/startCommandOrchestration.ts` | `resolveStartBubbleMode` | `(currentState: string) -> StartBubbleMode` | start mode routing | `PREPARING_WORKSPACE` ne tunjon resumable allapotnak; az exception szovege explicit restart/reconcile guidance-ot adjon a startup-incomplete helyzetre | P1 | required-now | T1 |
| CS2 | `src/v11/application/start/startCommandApi.ts` | `startBubble` catch path | `(input, dependencies) -> Promise<StartBubbleResult>` | top-level start error surface | fresh start kozbeni bootstrap/tmux/startup-failure eseten a dobott hiba mondja ki, hogy a startup incomplete es restart szukseges lehet; ne sugalljon sikeres continuationt | P1 | required-now | T2 |
| CS3 | `src/v11/application/start/startCommandCleanup.ts` | `cleanupFailedStart` | `(input) -> Promise<void>` | failed-start cleanup | cleanup best-effort marad, de a fail-closed kimenet legyen egyertelmu: ha state rollback/finalize nem sikerul, attol meg ne legyen hamis success/continuation benyomas | P1 | required-now | T2, T3 |
| CS4 | `src/v11/application/start/startCommandFlows.ts` | `runFreshStartFlow` progress handoff | `({ context, deps, progress }) -> Promise<FreshStartResult>` | failure handoff context | a top-level catch mindig megkapja a startup failure ertelmezesehez szukseges minimalis kontextust (`preparingState`, bootstrap progress), uj recovery descriptor nelkul | P2 | required-now | T2 |
| CS5 | `tests/core/runtime/startupReconciler.test.ts` | reconcile regression coverage | test surface | stale pre-runtime residue behavior | a stale pre-runtime session eltakaritasa tovabbra is tamogassa a kesobbi tiszta restartot, anelkul hogy resumable runtime truthot allitana | P2 | required-now | T3 |

### 2) Data and Interface Contract

| Contract | Current | Target | Required Fields | Optional Fields | Compatibility | Priority | Timing |
|---|---|---|---|---|---|---|---|
| Startup failure error wording | altalanos start failure uzenet | explicit startup-incomplete + restart guidance | bubble id, failure fact, restart guidance | reconcile guidance, stale cleanup hint | backward-compatible text hardening | P1 | required-now |
| `PREPARING_WORKSPACE` start retry behavior | non-resumable, de operatori jelentese nem eleg explicit | tovabbra is non-resumable, explicit fail-closed wordinggel | current state, non-resumable reason, restart guidance | reconcile hint | backward-compatible bugfix | P1 | required-now |
| Cleanup result interpretation | best-effort, implicit | best-effort, de soha nem sugall successful continuationt | fail-closed outcome | cleanup detail in message | backward-compatible bugfix | P1 | required-now |

Required-now rules:

1. A task nem adhat hozza uj fieldet a persisted state schemahoz.
2. A task nem teheti resumable-va a `PREPARING_WORKSPACE` allapotot.
3. A startup-failure path explicit operatori remediationje: restart; reconcile csak akkor emlitheto, ha stale runtime residue a valoszinubb kovetkezo blokkolo ok.
4. A kod nem kovetkeztethet reszleges startup residue-bol legitim runtime authorityra.

### 3) Side Effects Contract

| Area | Allowed | Forbidden | Notes | Priority | Timing |
|---|---|---|---|---|---|
| state write | meglevo `FAILED` finalize path vagy meglevo state megtartasa fail-closed modban | uj persisted recovery descriptor vagy archival marker | state semantics maradjon minimalis | P1 | required-now |
| runtime cleanup | best-effort tmux/session/worktree cleanup a meglevo helper surfacesen | uj cleanup policy matrix vagy ownership taxonomy | cleanup csak a restartot segitheti, nem recovery truthot gyart | P1 | required-now |
| error messaging | explicit restart/reconcile guidance | misleading success/continue wording | operatori clarity a fobb szallitas | P1 | required-now |

Constraint: implementation nem hozhat be uj canonical recovery/severity/state vocabularyt a jelenlegi start bugfix scope-on tul.

### 4) Error and Fallback Contract

| Trigger | Dependency (if any) | Behavior (`throw|result|fallback`) | Fallback Value/Action | Reason Code | Log Level | Priority | Timing |
|---|---|---|---|---|---|---|---|
| bootstrap vagy tmux fail a `PREPARING_WORKSPACE` es `RUNNING` kozott | startup flow | throw | explicit startup-incomplete hiba; restart guidance | `STARTUP_INCOMPLETE_RESTART_REQUIRED` | error | P1 | required-now |
| `bubble start` hivasa `PREPARING_WORKSPACE` allapotban | state snapshot | throw | explicit fail-closed uzenet; restart, nem resume | `START_PREPARING_NOT_RESUMABLE` | warn | P1 | required-now |
| failed-start cleanup state-write hiba vagy conflict | state store | fallback | fail-closed marad; uzenet nem allithatja, hogy a bubble tisztan tovabbmehet | `STARTUP_CLEANUP_INCOMPLETE` | warn | P1 | required-now |
| stale pre-runtime runtime-session residue | runtime registry | result | reconcile tovabbra is eltakarithatja a stale entryt, hogy kesobbi fresh start unblockolhato legyen | `NON_RUNTIME_STATE_STALE_SESSION` | info | P2 | required-now |

### 5) Dependency Constraints

| Type | Items | Priority | Timing |
|---|---|---|---|
| must-use | meglevo `FAILED` write path, meglevo reconcile stale-session behavior | P1 | required-now |
| must-use | explicit restart-focused operatori wording | P1 | required-now |
| must-not-use | `startup_recovery` schema, active/archival descriptor, new persisted recovery object | P1 | required-now |
| must-not-use | `PREPARING_WORKSPACE` resume/recover mode, retry taxonomy, new lifecycle state | P1 | required-now |

### 6) Test Matrix

| ID | Scenario | Given | When | Then | Priority | Timing | Evidence |
|---|---|---|---|---|---|---|---|
| T1 | fail-closed start from `PREPARING_WORKSPACE` | bubble state=`PREPARING_WORKSPACE` | `bubble start` fut | explicit non-resumable/startup-incomplete hiba jon vissza restart guidance-dzsal | P1 | required-now | `tests/core/bubble/startBubble.test.ts` |
| T2 | fresh startup partial failure | fresh bubble, `PREPARING_WORKSPACE` mar perzisztalt, bootstrap vagy tmux fail | start flow elhasal | nincs `RUNNING` continuation; a dobott hiba startup-incomplete + restart guidance tartalmu | P1 | required-now | `tests/core/bubble/startBubble.test.ts` |
| T3 | stale pre-runtime residue nem lesz runtime truth | bubble nem runtime state-ben, stale runtime session entry maradt | reconcile fut, majd kesobb fresh start | stale entry eltunik, a kesobbi start unblockolhato, de nincs implicit resume authority | P2 | required-now | `tests/core/runtime/startupReconciler.test.ts` |

## L2 - Implementation Notes (Optional)

1. [later-hardening] Ha a restart guidance operatori szinten meg mindig nem eleg, kulon follow-up taskban johet status/UI wording hardening.
2. [later-hardening] Ha uj bizonyitek jelenik meg unsafe continuationrol vagy state corruptionrol, kulon recovery-authority task nyithato, nem ebben a bugfixben.

## Hardening Backlog (Optional)

| ID | Item | Layer | Priority | Timing | Source | Proposed Action |
|---|---|---|---|---|---|---|
| H1 | Startup failure reason-code family finomitasa | L2 | P2 | later-hardening | current bugfix scoping | csak akkor nyisd ujra, ha tobb, tenylegesen kulon operatori remediationt igenylo startup-fail osztaly gyulik ossze |
| H2 | Status/UI surface restart hint | L2 | P3 | later-hardening | current bugfix scoping | kulon docs/UI taskban kezeld, ha a CLI hiba onmagaban nem eleg |

## Review Control

1. Minden finding tartalmazza: `priority`, `timing`, `layer`, `evidence`.
2. Max 2 L1 hardening round.
3. Uj `required-now` item csak konkret bizonyitekkal johet, ha kimutatott unsafe continuation vagy state corruption jelenik meg.
4. Barmely recovery-authority vagy schema-expansion javaslat automatikusan `later-hardening`, hacsak nincs ra uj, eros bizonyitek.

## Spec Lock

Ez a task akkor `IMPLEMENTABLE`, ha:
1. a startup-incomplete hiba explicit fail-closed + restart guidance mellett jelenik meg,
2. a `PREPARING_WORKSPACE` nem tunik resumable allapotnak,
3. a stale pre-runtime reconcile viselkedes tovabbra is unblockolja a kesobbi tiszta startot,
4. a diff nem vezet be uj persisted recovery authorityt vagy startup schema programot.
