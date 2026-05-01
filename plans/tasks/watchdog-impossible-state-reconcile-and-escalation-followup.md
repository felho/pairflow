---
artifact_type: task
artifact_id: task_watchdog_impossible_state_reconcile_escalation_followup_v1
title: "Watchdog Impossible-State Reconcile + Escalation Follow-up"
status: draft
phase: phase1
target_files:
  - src/v11/application/watchdog/watchdogCommandApi.ts
  - src/v11/application/watchdog/watchdogCommandRouting.ts
  - src/v11/application/reconcile/runReconcileFlow.ts
  - src/v11/application/reconcile/reconcileCommandContract.ts
  - docs/pairflow-initial-design.md
  - docs/architecture/architecture-fitness-checks.md
  - docs/architecture/v11-boundary-decisions.md
  - tests/contracts/v11/watchdog.contract.test.ts
  - tests/contracts/v11/reconcile.contract.test.ts
  - tests/v11/application/watchdog/watchdogCommandApi.test.ts
  - tests/v11/application/reconcile/reconcileFacadeParity.test.ts
prd_ref: null
plan_ref: null
system_context_ref: docs/architecture/v11-boundary-decisions.md
owners:
  - "felho"
---

# Task: Watchdog Impossible-State Reconcile + Escalation Follow-up

## Current Codebase Check (2026-04-10)

1. A mai watchdog/reconcile canonical kod `src/v11/application/watchdog/**` es `src/v11/application/reconcile/**` alatt el.
2. A korabbi v1.1 rollout doksik torolve lettek; a megorzott dontesek es fitness policy az aktiv `docs/architecture/**` authority alatt vannak.
3. A task tovabbra is iranyrogzito `draft`, de a concrete implementation scope-ot frissiteni kell a mai topologyra.

## L0 - Policy

### Goal

Rogzitsuk magas szinten a jovobeli watchdog szerepet: ne normal progression engine legyen, hanem invariant-figyelo es reconcile/escalation reteggel mukodo runtime guard.
Ez a task most tudatosan csak magas szintu capture; a konkret implementacios szerzodest a jelenlegi watchdog fejlesztes lezarasa utan kell refine-olni.

### Context

Architectural direction:
1. transient vagy partial-failure allapot barmely critical command utan keletkezhet, nem csak meta-review submit utan,
2. ezert az "impossible state" felismereset es kezeleset altalanos rendszerelvkent kell kezelni,
3. a watchdog hosszu tavu szerepe: ilyen allapotok felismerese, deterministic reconcile-kiserlet, es ha ez nem biztos, operator jelzes.

Current timing constraint:
1. a watchdog teruleten jelenleg parhuzamos fejlesztes fut,
2. emiatt most nem celszeru vegleges L1 implementacios szerzodest befagyasztani,
3. de a magas szintu iranyt erdemes most rogziteni, hogy a kesobbi refine ne nullarol induljon.

### In Scope

1. Magas szintu termek- es architecture-policy rogzitese a jovobeli watchdog reconcile szerepere.
2. "Impossible state" kategoriak kezdeti inventoryja.
3. Az elvi dontes rogzitese, hogy a watchdog normal handoff authority helyett invariant/recovery layer.
4. A refine-olas elofoelteteleinek rogzitese a most futo watchdog munka utanra.

### Out of Scope

1. Konkret implementacios terv befagyasztasa most.
2. Exact call-site level code changes most.
3. Uj reconcile command surface veglegesitese most.
4. A jelenlegi watchdog munka megelozese vagy felulirasa.

### Safety Defaults

1. Impossible-state detection csak determinisztikus, auditalhato szabalyokra epulhet; heurisztikus "talan rossz" dontesek nem elegendoek automatikus mutaciohoz.
2. Ha a watchdog nem tud biztos reconcile-t alkalmazni, csengessen/eszkalaljon, ne mutaljon bizonytalanul.
3. A watchdog nem lehet uj, harmadik altalanos state-write kapu a forward mutation es a transcript-based reconstruction mellett.
4. A jovobeli reconcile-nek transcript/state/runtime bizonyitekot kell hasznalnia, nem kezi ad-hoc operator inputot.

### Contract Boundary / Blast Radius

1. `contract_boundary_override`: `yes`
2. Expected impacted contracts after refinement:
   - watchdog authority semantics,
   - reconcile command semantics,
   - runtime invariant inventory,
   - operator escalation/audit contract.

## L1 - Change Contract

### 1) Call-site Matrix

Provisional only. Exact required-now call-site contractot a jelenlegi watchdog munka utan kell refine-olni.

| ID | File | Function/Entry | Exact Signature (args -> return) | Insertion Point | Expected Behavior | Priority | Timing | Evidence |
|---|---|---|---|---|---|---|---|---|
| CS1 | `src/v11/application/watchdog/watchdogCommandRouting.ts` | watchdog lifecycle routing | existing watchdog routing entrypoint | impossible-state branch (future) | Kulonitse el a normal liveness/timeouthoz tartozo donteseket az impossible-state detection/reconcile logikatol | P1 | later-refine | architectural direction agreed in review |
| CS2 | `src/v11/application/reconcile/runReconcileFlow.ts` | reconcile flow | existing reconcile entrypoint | shared recovery contract (future) | A deterministic runtime reconcile es a watchdog altal felismert impossible-state treatment kozos boundary moge kerulhessen | P1 | later-refine | avoid duplicate recovery engines |
| CS3 | `src/v11/application/reconcile/**` | startup/runtime reconcile boundary | existing reconcile entrypoints | invariant inventory alignment (future) | Startup recovery es watchdog impossible-state inventory ugyanazt a canonical szabalykeszletet hasznalja | P2 | later-refine | one invariant source |
| CS4 | `src/v11/application/watchdog/**` | monitoring model | existing watchdog status/routing model | model/contract review (future) | Tisztan kulonuljon a liveness monitoring es a future impossible-state capability | P2 | later-refine | semantic separation |

### 2) Data and Interface Contract

High-level direction only; exact field-level contract kesobb refine-olando.

| Contract | Current | Target | Required Fields | Optional Fields | Compatibility | Priority | Timing |
|---|---|---|---|---|---|---|---|
| Watchdog role | primarily timeout/liveness, some ad-hoc recovery | explicit invariant monitor + deterministic reconcile/escalate layer | invariant class, evidence source, chosen action | diagnostics metadata | behavior extension | P1 | later-refine |
| Impossible-state inventory | implicit/incidental | explicit, auditalhato inventory | state, transcript/runtime evidence, allowed action | debug refs | behavior clarification | P1 | later-refine |
| Reconcile authority | partly split across paths | explicit shared recovery boundary | operation reason, evidence basis, outcome class | audit artifact refs | behavior clarification | P1 | later-refine |

Seed impossible-state categories to revisit after current watchdog work:
1. canonical handoff result persisted, de lifecycle nem lepett tovabb,
2. active ownership/runtime session ellentmond a bubble state-nek,
3. transcript tail es state snapshot nem ugyanazt az utolso canonical allapotot mutatja,
4. terminal state mellett meg aktiv runtime ownership marad,
5. non-terminal state mellett nincs ervenyes kovetkezo target vagy handoff surface.

### 3) Side Effects Contract

Provisional policy only.

| Area | Allowed | Forbidden | Notes | Priority | Timing |
|---|---|---|---|---|---|
| Watchdog recovery | deterministic reconcile attempt evidence-backed impossible-state eseten | heuristic/bizonytalan auto-mutation | auditability first | P1 | later-refine |
| Escalation | explicit operator bell, ha reconcile nem biztos | silent drop vagy csendes no-op impossible-state eseten | observability mandatory | P1 | later-refine |
| State writes | kozos reconcile boundaryn keresztul | uj ad-hoc watchdog-only mutation path | dual-gate architecture respect | P1 | later-refine |

Constraint: a jovobeli megoldasnak altalanosnak kell lennie; meta-review-specifikus special-case nem eleg.

### 4) Error and Fallback Contract

High-level direction only.

| Trigger | Dependency (if any) | Behavior (`throw|result|fallback`) | Fallback Value/Action | Reason Code | Log Level | Priority | Timing |
|---|---|---|---|---|---|---|---|
| impossible-state detected with deterministic fix | transcript/state/runtime evidence | fallback | reconcile attempt + audit event | TBD_AFTER_REFINEMENT | warn | P1 | later-refine |
| impossible-state detected without deterministic fix | same | result | escalate/bell operator | TBD_AFTER_REFINEMENT | error/warn | P1 | later-refine |
| evidence insufficient or contradictory | same | result | do not auto-mutate; emit diagnostics | TBD_AFTER_REFINEMENT | warn | P1 | later-refine |

### 5) Dependency Constraints

| Type | Items | Priority | Timing |
|---|---|---|---|
| must-use | canonical transcript/state evidence as recovery basis | P1 | later-refine |
| must-use | shared reconcile boundary rather than watchdog-only ad-hoc mutation | P1 | later-refine |
| must-not-use | watchdog as normal success-path orchestrator | P1 | later-refine |
| must-not-use | heuristic auto-mutation without explicit invariant proof | P1 | later-refine |

### 6) Test Matrix

Not implementable yet. The rows below are placeholders for later refinement.

| ID | Scenario | Given | When | Then | Priority | Timing | Evidence |
|---|---|---|---|---|---|---|---|
| T1 | impossible-state inventory lock | current watchdog work completed | follow-up refinement starts | every target impossible-state class is enumerated with evidence basis and action policy | P1 | later-refine | doc review |
| T2 | deterministic reconcile path | future fixture with provable state/runtime divergence | watchdog/reconcile future flow runs | system either reconciles auditalhato modon or escalates deterministically | P1 | later-refine | automated test |
| T3 | no uncertain auto-mutation | ambiguous evidence fixture | future watchdog/reconcile flow runs | no state mutation, explicit bell/escalation emitted | P1 | later-refine | automated test |

## Acceptance Criteria

1. AC1: Ez a task rogzitse, hogy a watchdog jovobeli szerepe invariant/recovery layer, nem normal success-path orchestrator.
2. AC2: A refine kovetkezo korehez legyen explicit impossible-state inventory seed lista.
3. AC3: A dokumentum egyertelmuen jelezze, hogy jelen allapotaban meg nem implementalhato vegleges task, hanem follow-up capture.

## L2 - Implementation Notes (Optional)

1. [later-hardening] Erdemes lehet az impossible-state inventoryt kulon canonical docba kiszervezni, ha tobb command osztozik rajta.
2. [later-hardening] A reconcile audit event schema-t jo lenne kozosen tervezni a startup reconcilerrel.

## Hardening Backlog (Optional)

| ID | Item | Layer | Priority | Timing | Source | Proposed Action |
|---|---|---|---|---|---|---|
| H1 | shared impossible-state inventory doc | L2 | P2 | later-hardening | future refine pain | kozos inventory es evidence taxonomy |
| H2 | reconcile operation idempotency alignment | L2 | P2 | later-hardening | operator recovery direction | shared operation-id schema watchdog/reconcile/startup recovery kozott |

## Review Control

1. Ez a dokumentum most szandekosan high-level capture; nem szabad ugy implementalni belole, mintha teljes L1 contract freeze lenne.
2. A refine kovetkezo kor elofeltetele: a jelenlegi watchdog fejlesztes zaruljon le, es az uj baseline ismert legyen.
3. `contract_boundary_override=yes`, de a jelenlegi task ezt csak future boundary capturekent rogzitse; a vegleges implementacios taskban a pontos L1 szerzodest ujra kell tolteni.

## Assumptions

1. A jovobeli watchdog/reconcile irany altalanos rendszerelv lesz, nem egyetlen command special-case fixe.
2. A most futo watchdog munka utan tisztabb inventory lesz a valos impossible-state classokrol.

## Open Questions (Non-Blocking for this capture)

1. Mely impossible-state osztalyok javithatok automatikusan transcript-state alapon, es melyek maradjanak operator bell-only?
2. A reconcile authority milyen hataron ossza meg a felelosseget a startup reconcilerrel es a runtime watchdoggal?

## Spec Lock

This task is intentionally `NOT_IMPLEMENTABLE_YET`.
Refine-ra kesz, ha:
1. a jelenlegi watchdog fejlesztes lezarult,
2. az aktualis invariant inventory frissult, es
3. uj, konkret implementacios L1 contract kitoltheto.
