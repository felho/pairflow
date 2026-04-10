---
artifact_type: task
artifact_id: task_bubble_start_preparing_workspace_recovery_foundation_phase1_v1
title: "Bubble Start PREPARING_WORKSPACE Recovery Foundation (Phase 1)"
status: draft
phase: phase1
target_files:
  - src/types/bubble.ts
  - src/v11/application/start/startCommandApi.ts
  - src/v11/application/start/startCommandFlows.ts
  - src/v11/application/start/startCommandOrchestration.ts
  - src/v11/application/start/startCommandSession.ts
  - src/v11/application/start/startCommandCleanup.ts
  - src/v11/shared/start/startStateMutation.ts
  - src/v11/infrastructure/channel/tmux/tmuxManager.ts
  - src/v11/application/reconcile/runReconcileFlow.ts
  - tests/core/bubble/startBubble.test.ts
  - tests/core/runtime/startupReconciler.test.ts
  - tests/core/runtime/restartRecovery.test.ts
  - tests/core/runtime/tmuxManager.test.ts
  - tests/v11/application/start/startCommandOrchestration.test.ts
prd_ref: null
plan_ref: plans/bubble-startup-recovery-contract-and-phasing-plan-v1.md
system_context_ref: docs/pairflow-initial-design.md
owners:
  - "felho"
---

# Task: Bubble Start PREPARING_WORKSPACE Recovery Foundation (Phase 1)

## Current Codebase Check (2026-04-10)

1. A checked-out tree-ben a `start` flow jelenleg lokalis kiserleti valtozasokat tartalmaz a `src/v11/application/start/**` es a kapcsolodo tesztek alatt.
2. A beszelgetes review-koreiben a scope mar nem egyszeru bugfixnek bizonyult, hanem implicit distributed transaction recovery-protokollnak:
   - `state.json`
   - runtime session registry
   - tmux session
   - worktree/branch lifecycle
3. Ez a task a kovetkezo implementacios kor foundation specje. A mostani lokalis patch learning baseline, nem delivery target.

## L0 - Policy

### Goal

Lezarni a `PREPARING_WORKSPACE` startup/recovery szerzodest ugy, hogy a kovetkezo implementacios kor mar explicit resource-invariant es failure-policy mellett dolgozzon.

Ez a task akkor sikeres, ha:
1. a `CREATED`, `PREPARING_WORKSPACE` es `RUNNING` allapotokra explicit resource-ownership tabla letezik,
2. minden startup failure ponthoz ki van mondva, hogy `rollback`, `retry`, vagy `preserve-for-recovery`,
3. a `PREPARING_WORKSPACE` nem generic `resume`, hanem kulon recovery contract alapu path.

### In Scope

1. A bubble-start startup eroforras-szerzodes formalizalasa:
   - state snapshot
   - runtime session registry
   - tmux session
   - worktree/branch
2. A `PREPARING_WORKSPACE` canonical invariansainak rogzítese.
3. Egy explicit startup recovery descriptor / authority boundary meghatarozasa.
4. A `resolveStartBubbleMode(...)`, ownership-claim, tmux-attribution es cleanup dontesek Phase 1 contractja.
5. Reconcile es restart alignment annak kimondasara, hogy a `PREPARING_WORKSPACE` milyen stale/live kombinaciokkal egyeztetheto.
6. Tesztmatrix a default dependency recovery agakra.

### Out of Scope

1. Uj operator command surface.
2. Uj top-level lifecycle state, ha a szerzodes `PREPARING_WORKSPACE` alatt is zarhato.
3. UI/TUI surface redesign.
4. Meta-review vagy watchdog altalanos recovery scope tovabbi bovítese a startup contracton tul.

### Safety Defaults

1. Fresh start nem irhat tartos `RUNNING` allapotot addig, amig a startup commit pont nincs expliciten definialva es sikeresen teljesitve.
2. Teardown nem alapulhat pusztan inferred resource-allapoton (`tmux exists`, `registry exists`, `worktree exists`).
3. Ha ownership elveszett vagy nem bizonyithato, a flow fail-closed / preserve-for-recovery maradjon.
4. `PREPARING_WORKSPACE` alatt sem generic resume, sem vak cleanup nem megengedett explicit recovery contract nelkul.
5. A task nem merge-li implicitten a mostani lokalis patch szemantikat; uj contractot rogzit.

### Contract Boundary / Blast Radius

1. `contract_boundary_override`: `yes`
2. Erintett contractok:
   - lifecycle/status semantics (`PREPARING_WORKSPACE` jelentese)
   - internal start API contract
   - runtime session ownership contract
   - tmux launch attribution contract
   - reconcile recovery contract

### Complexity Risk Gate

1. `authority_risk`: `2`
2. `surface_spread`: `2`
3. `activation_coupling`: `2`
4. `prerequisite_risk`: `1`
5. `acceptance_multiplicity`: `2`
6. `risk_score`: `9`
7. `single-task allowed`: `no`
8. Required split:
   - `foundation/refactor`
   - `delivery`
   - `operator/recovery-surface hardening`
9. Authority/source-of-truth note:
   - canonical source: persisted startup recovery contract bound to `state.json` lifecycle snapshot
   - forbidden secondary sources: tmux existence alone, registry entry alone, worktree existence alone, test-stub-only semantics

## L1 - Change Contract

### 1) Call-site Matrix

| ID | File | Function/Entry | Exact Signature (args -> return) | Insertion Point | Expected Behavior | Priority | Timing | Evidence |
|---|---|---|---|---|---|---|---|---|
| CS1 | `src/types/bubble.ts` | startup recovery state shape | `BubbleStateSnapshot -> typed startup recovery block or explicit N/A decision` | lifecycle state schema | A `PREPARING_WORKSPACE` resource contract explicitten tipizalt: milyen resource letezhet, melyik ownership bizonyitott, mi a recovery policy | P1 | required-now | T1, T2 |
| CS2 | `src/v11/application/start/startCommandOrchestration.ts` | start mode resolution | `resolveStartBubbleMode(input) -> StartBubbleMode` | state routing boundary | `PREPARING_WORKSPACE` nem generic runtime resume, hanem kulon recovery decision boundary | P1 | required-now | T3 |
| CS3 | `src/v11/application/start/startCommandSession.ts` | runtime ownership claim | `claimRuntimeSessionOwnership(input) -> RuntimeSessionOwnership` | start ownership boundary | A claim eredmenye explicitten megkulonbozteti a local claimet, a reused live sessiont es a nem-bizonyithato ownershipet | P1 | required-now | T4, T5 |
| CS4 | `src/v11/infrastructure/channel/tmux/tmuxManager.ts` | tmux launch attribution | `launchBubbleTmuxSession(input) -> LaunchResult` + typed launch error | tmux boundary | A tmux launch output/error explicitten jelzi, hogy a session letrejott-e es melyik attempthez tartozik | P1 | required-now | T6 |
| CS5 | `src/v11/application/start/startCommandFlows.ts` | startup commit protocol | `runFreshStartFlow(...) -> FreshStartResult`, `runRecoverPreparingStartFlow(...) -> FreshStartResult` | start orchestration | A fresh es preparing-recovery flow ugyanarra az explicit startup commit modellre epul | P1 | required-now | T7, T8 |
| CS6 | `src/v11/application/start/startCommandCleanup.ts` | startup failure handling | `cleanupFailedStart(input) -> Promise<void>` | cleanup boundary | A cleanup csak explicit recovery policy alapjan rollbackel vagy preserve-el; nincs inferred vak teardown | P1 | required-now | T9, T10 |
| CS7 | `src/v11/shared/start/startStateMutation.ts` | lifecycle mutation seam | `executeStartPreparingMutation`, `executeStartRunningMutation`, `executeStartFailedCleanupMutation` | lifecycle persistence seam | A mutation layer a startup commit pontot es a `PREPARING_WORKSPACE` recovery contractot tukrozi | P1 | required-now | T7, T9 |
| CS8 | `src/v11/application/reconcile/runReconcileFlow.ts` | stale-session reasoning | `resolveStaleReason(...) -> RuntimeSessionStaleReason | null` | reconcile boundary | A reconcile nem tekinti automatikusan stale-nak a `PREPARING_WORKSPACE` bubble-t pusztan a generic runtime rules alapjan | P1 | required-now | T11 |

### 2) Data and Interface Contract

| Contract | Current | Target | Required Fields | Optional Fields | Compatibility | Priority | Timing |
|---|---|---|---|---|---|---|---|
| Startup resource contract | implicit, code-pathokbol kovetkeztetett | explicit startup recovery descriptor | lifecycle state, attempt identity, runtime ownership status, worktree bootstrap status, tmux creation status, recovery policy | diagnostic timestamps, reason codes | internal contract change, explicit migration note required | P1 | required-now |
| Start mode resolution input | current state stringbol dont | full loaded state / recovery descriptor alapjan dont | lifecycle state, recovery descriptor presence/status | diagnostic metadata | internal contract hardening | P1 | required-now |
| Runtime session ownership result | claimed vs not-claimed | attributed ownership result | `claimed`, `reusedLiveSession`, `tmuxSessionName` | provenance/attempt metadata | internal contract hardening | P1 | required-now |
| Tmux launch attribution | partial typed error semantics | explicit created/not-created attribution | session name, `sessionCreated`, launch stage | cause metadata | internal contract hardening | P1 | required-now |

Normative startup invariant table:

| State | Registry | Tmux | Worktree/Branch | Resume Eligibility | Notes |
|---|---|---|---|---|---|
| `CREATED` | optional absent; if present, stale only | forbidden as normal state invariant | may be absent | `fresh` only | no startup side effect is committed yet |
| `PREPARING_WORKSPACE` | may exist only if startup recovery contract says so | may exist only if startup recovery contract says so | may exist | `recover_preparing` only | partial startup resources are allowed only under explicit contract |
| `RUNNING` | required | required live session | required | `resume` | startup recovery contract must be cleared or archival-only |

Required-now contract rules:

1. `PREPARING_WORKSPACE` jelentese nem kovetkeztetheto pusztan side effectekbol; explicit contract kotelezo.
2. A startup commit pontot egyertelmuen meg kell nevezni:
   - mi van committed allapotban `PREPARING_WORKSPACE` alatt,
   - mi kell ahhoz, hogy `RUNNING` legitimen perzisztalhato legyen.
3. A typed tmux launch attribution es a runtime ownership result kozos vocabularyt kell hasznaljon.
4. `RUNNING`-ra atlepett bubble nem maradhat explicit startup recovery alatt.
5. `PREPARING_WORKSPACE` recovery pathnak default dependencykkel is mukodnie kell, nem csak stubolt tesztekkel.

### 3) Side Effects Contract

| Area | Allowed | Forbidden | Notes | Priority | Timing |
|---|---|---|---|---|---|
| `state.json` | explicit startup recovery descriptor persist | inferred resource truth | state a canonical source, de csak explicit descriptorral | P1 | required-now |
| runtime registry | claim/reclaim/remove explicit recovery policy alapjan | registry-only ownership inference | registry onmagaban nem eleg teardown donteshez | P1 | required-now |
| tmux | typed session attribution, explicit reuse vs relaunch decision | blind kill by expected name | kill csak bizonyitott policyvel | P1 | required-now |
| worktree/branch | bootstrap / cleanup explicit policy alapjan | teardown state-commit nelkul | worktree nem tunhet el hamis `RUNNING` alatt | P1 | required-now |

Constraint: ha egy resource rollbackja nem bizonyithatoan lokal ownership alatt tortenne, a rendszer preserve-for-recovery modban marad.

### 4) Error and Fallback Contract

| Trigger | Dependency (if any) | Behavior (`throw|result|fallback`) | Fallback Value/Action | Reason Code | Log Level | Priority | Timing |
|---|---|---|---|---|---|---|---|
| worktree bootstrap fail tmux elott | workspace bootstrap | throw | explicit rollback only for locally owned resources; lifecycle `FAILED` ha commitelheto | `START_BOOTSTRAP_FAILED` | error | P1 | required-now |
| tmux launch fail session creation nelkul | tmux | throw | rollback allowed if no recoverable startup resource maradt | `START_TMUX_LAUNCH_FAILED` | error | P1 | required-now |
| tmux launch fail session creation utan | tmux | throw | `preserve-for-recovery` unless full rollback bizonyithato es safe | `START_TMUX_PARTIAL_LAUNCH` | error | P1 | required-now |
| startup failure utan lifecycle write konfliktus | state store | fallback | preserve-for-recovery; no blind teardown | `START_RECOVERY_STATE_CONFLICT` | warn | P1 | required-now |
| startup failure utan lifecycle write I/O/lock hiba | state store | fallback | preserve-for-recovery; no blind teardown until contract says ownership is local and rollback-safe | `START_RECOVERY_STATE_WRITE_FAILED` | warn | P1 | required-now |
| reconcile `PREPARING_WORKSPACE` + live tmux | reconcile | result | not stale by generic runtime rule; explicit recovery pathra bizzuk | `START_PREPARING_RECOVERABLE` | info | P2 | required-now |
| reconcile `PREPARING_WORKSPACE` + no live tmux + stale registry | reconcile | result | stale only if startup contract recovery-unsafe vagy missing | `START_PREPARING_STALE_RUNTIME` | warn | P1 | required-now |

### 5) Dependency Constraints

| Type | Items | Priority | Timing |
|---|---|---|---|
| must-use | `docs/pairflow-initial-design.md`, explicit startup invariant table, default dependency integration tests | P1 | required-now |
| must-not-use | generic `RUNNING before tmux` shortcut, blind expected-name tmux cleanup, stub-only recovery proof, registry-only or tmux-only ownership truth | P1 | required-now |

### 6) Test Matrix

| ID | Scenario | Given | When | Then | Priority | Timing | Evidence |
|---|---|---|---|---|---|---|---|
| T1 | startup recovery contract typed | `PREPARING_WORKSPACE` state | schema/type layer loads | explicit startup recovery contract shape letezik vagy explicit N/A decision documented and enforced | P1 | required-now | `src/types/bubble.ts` |
| T2 | invariant table enforced in state transitions | `CREATED` / `PREPARING_WORKSPACE` / `RUNNING` snapshots | transition helpers run | disallowed resource/state combinations rejectelhetok vagy explicit diagnosticsot adnak | P1 | required-now | `tests/core/bubble/startBubble.test.ts` |
| T3 | `PREPARING_WORKSPACE` separate mode | persisted preparing snapshot | `startBubble` lefut | `recover_preparing` agra megy, nem generic resume-ra | P1 | required-now | `tests/v11/application/start/startCommandOrchestration.test.ts`, `tests/core/bubble/startBubble.test.ts` |
| T4 | live tmux reuse | `PREPARING_WORKSPACE` + live runtime session | `startBubble` lefut | startup explicit recovery contract alapjan ujrahasznalja a live sessiont | P1 | required-now | `tests/core/bubble/startBubble.test.ts` |
| T5 | stale registry reclaim | `PREPARING_WORKSPACE` + dead tmux + stale registry | `startBubble` lefut | claim remove + relaunch deterministicen tortenik | P1 | required-now | `tests/core/bubble/startBubble.test.ts` |
| T6 | partial tmux launch attribution | tmux session mar letrejott, layout/seed fail | launch boundary lefut | typed launch attribution hiba jon vissza | P1 | required-now | `tests/core/runtime/tmuxManager.test.ts` |
| T7 | fresh start commit point | fresh start sikeres | start flow lefut | `RUNNING` csak explicit startup commit utan perzisztalodik | P1 | required-now | `tests/core/bubble/startBubble.test.ts` |
| T8 | preparing recovery commit point | recoverable preparing state | recovery flow lefut | `RUNNING` commit ugyanazon explicit contract utan tortenik | P1 | required-now | `tests/core/bubble/startBubble.test.ts` |
| T9 | startup failure state conflict | `PREPARING_WORKSPACE` partial resources + state conflict | cleanup lefut | preserve-for-recovery, nincs vak teardown | P1 | required-now | `tests/core/bubble/startBubble.test.ts` |
| T10 | startup failure lock/io issue | partial startup resources + state write failure | cleanup lefut | preserve-for-recovery unless explicit rollback-safe ownership exists | P1 | required-now | `tests/core/bubble/startBubble.test.ts` |
| T11 | reconcile alignment | preparing bubble live/dead tmux variansokkal | reconcile lefut | a stale reasoning a startup contracttal osszhangban marad | P1 | required-now | `tests/core/runtime/startupReconciler.test.ts`, `tests/core/runtime/restartRecovery.test.ts` |

## L2 - Implementation Notes (Optional)

1. [later-hardening] Ha a startup recovery descriptor tul zajos lenne a canonical state-ben, kulso artifact is vedheto lehet, de csak akkor, ha ugyanazt az authority szintet biztosítja.
2. [later-hardening] A Phase 2 utan erdemes lehet kulon operator runbookot irni a `PREPARING_WORKSPACE` incidentekhez.

## Hardening Backlog (Optional)

| ID | Item | Layer | Priority | Timing | Source | Proposed Action |
|---|---|---|---|---|---|---|
| H1 | Külon operator status wording `PREPARING_WORKSPACE` recoveryhez | L2 | P2 | later-hardening | current review loop | Phase 3-ban kezelni |
| H2 | Additional metrics eventek startup recovery branchinghez | L2 | P3 | later-hardening | implementation planning | csak Phase 2 utan |
| H3 | Incident runbook es manual recovery docs | L2 | P2 | later-hardening | current feedback | Phase 3 task |

## Review Control

1. Minden finding tartalmazza: `priority`, `timing`, `layer`, `evidence`.
2. Max 2 L1 hardening round.
3. Uj `required-now` csak evidence-backed `P0/P1` lehet a masodik round utan.
4. A review fo kerdese nem az, hogy "mukodik-e mar a fix?", hanem hogy "lezartuk-e az explicit startup resource contractot?".
5. Ha a doc nem mondja ki minden failure pontra a `rollback|retry|preserve-for-recovery` dontest, nem implementalhato.

## Spec Lock

Mark task as `IMPLEMENTABLE` when:
1. a `CREATED` / `PREPARING_WORKSPACE` / `RUNNING` resource-invariant tabla explicit es ellentmondasmentes,
2. a startup commit pont egyertelmuen meg van nevezve,
3. a teardown es recovery policy nem inferred side effectekre epul,
4. a default dependency testmatrix pontosan lefedi a live reuse, stale reclaim, partial tmux es state-write-failure recovery agakat.

## Assumptions

1. A kovetkezo implementacios kor elott a jelenlegi lokalis start/recovery patchet el fogjuk dobni.
2. A Phase 1 task megoldasa nem kovetel uj operator commandot.
3. A `PREPARING_WORKSPACE` tovabbra is megtarthato lifecycle state, ha a contract explicitte valik.

## Open Questions

1. A startup recovery descriptor a canonical state resze legyen, vagy kulon artifact? Blocker a tenyleges implementaciohoz, de a docs refinement bubble el tudja donteni.
2. A reconcile elegansan tud-e `PREPARING_WORKSPACE` alatt nem-stale es stale kategoriat kulon reason code-okkal kezelni, vagy Phase 2-ben kulon subtype kell?
