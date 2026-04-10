---
artifact_type: task
artifact_id: task_watchdog_runtime_surface_mismatch_self_healing_followup_v1
title: "Watchdog Runtime Surface Mismatch Self-Healing Follow-up"
status: draft
phase: phase2
target_files:
  - src/v11/shared/watchdog/watchdogCommandApi.ts
  - src/v11/shared/watchdog/watchdogCommandRouting.ts
  - src/v11/shared/watchdog/watchdogPaneActivitySampler.ts
  - src/v11/application/reconcile/runReconcileFlow.ts
  - src/core/runtime/startupReconciler.ts
  - src/core/runtime/tmuxDelivery.ts
  - src/v11/shared/metaReviewGate/metaReviewGateNotify.ts
  - tests/v11/application/watchdog/watchdogCommandApi.test.ts
  - tests/contracts/v11/watchdog.contract.test.ts
  - tests/contracts/v11/reconcile.contract.test.ts
prd_ref: null
plan_ref: null
system_context_ref: docs/pairflow-initial-design.md
owners:
  - "felho"
---

# Task: Watchdog Runtime Surface Mismatch Self-Healing Follow-up

## Current Codebase Check (2026-04-10)

1. A mai watchdog canonical owner file-ok az `src/v11/application/watchdog/**` alatt vannak, nem a taskban felsorolt `src/v11/shared/watchdog/**` pathokon.
2. A `src/core/runtime/*` targetek mar nem leteznek a checked-out tree-ben.
3. A task marad `draft`, de a target file listat aktualizalni kell, mielott konkret implementation task lehetne belole.

## L0 - Policy

### Goal

Tisztan rogzitsuk a most latott runtime failure class-t: a bubble state szerint aktiv agent ownership van, de a tenyleges tmux pane mar nem az elvart agent surface, hanem fallback shell vagy mas nem-kompatibilis runtime. A jovobeli cel egy altalanos self-healing/reconcile irany, nem egyetlen meta-review special-case tovabbi patch-elese.

### Context

Observed failure pattern:
1. a bubble lifecycle aktiv allapotban marad (`META_REVIEW_RUNNING`),
2. a tmux session es a target pane olvashato marad,
3. de az agent process kozben kilep, es a pane interactive shellre esik vissza,
4. a kesobbi delivery ezutan rossz surface-re megy, mikozben a rendszer ezt nem feltetlenul ismeri fel idoben.

Why this matters:
1. ez nem egyszeru `missing_tmux_session` vagy `pane_unreadable` hiba,
2. ez runtime surface mismatch a state/runtime/delivery boundary-n,
3. ha nincs ra altalanos invariant + reconcile policy, a rendszer csendesen beragadhat aktiv allapotba.

### In Scope

1. A failure class explicit nevesitese es inventoryba emelese.
2. A mostani helyzet tiszta leirasa: mikor beszelunk runtime surface mismatchrol.
3. A jovobeli celallapot rogzitse: detect -> deterministic recover vagy escalate.
4. A watchdog/reconcile/startup recovery kozos iranyanak rogzitse ehhez az esethoz.

### Out of Scope

1. Reszletes implementacios L1 contract most.
2. Exact command-level recovery choreography most.
3. Uj reason code taxonomy veglegesitese most.
4. Barmely egyedi call-site teljes kidolgozasa most.

### Safety Defaults

1. A rendszer ne tekintse automatikusan egeszsegesnek a pane-t attol, hogy a tmux capture olvashato.
2. Ha az elvart agent surface helyett fallback shell vagy mas nem-kompatibilis runtime latszik, azt explicit runtime mismatchnek kell tekinteni.
3. Determinisztikus fix nelkul ne tortenjen bizonytalan auto-mutation.
4. A cel altalanos self-healing boundary, nem elszigetelt meta-review-only javitasok halmaza.

### Contract Boundary / Blast Radius

1. `contract_boundary_override`: `yes`
2. Expected impacted contracts after refinement:
   - watchdog impossible-state inventory,
   - reconcile stale-reason semantics,
   - runtime surface health contract,
   - delivery replay / recovery authority boundary.

## L1 - Change Contract

### 1) Call-site Matrix

This is intentionally provisional. A pontos implementacios szerzodest kesobb kell kitolteni.

| ID | File | Function/Entry | Exact Signature (args -> return) | Insertion Point | Expected Behavior | Priority | Timing | Evidence |
|---|---|---|---|---|---|---|---|---|
| CS1 | `src/v11/shared/watchdog/watchdogPaneActivitySampler.ts` | pane activity sampling | existing sampler | future runtime-surface classification | Kulonitse el az olvashato-de-nem-agent surface-et a normal `sampled` es a `pane_unreadable` esetektol | P1 | later-refine | observed shell fallback incident |
| CS2 | `src/v11/shared/watchdog/watchdogCommandRouting.ts` | watchdog lifecycle routing | existing routing entrypoint | future impossible-state branch | Runtime surface mismatch eseten deterministic recover vagy escalate utat tudjon valasztani | P1 | later-refine | current watchdog only sees timeout/readability |
| CS3 | `src/v11/application/reconcile/runReconcileFlow.ts` | reconcile flow | existing reconcile entrypoint | stale-reason expansion (future) | A tmux-elo-de-wrong-surface eset ne vesszen el a mai stale-reason modelben | P1 | later-refine | current reconcile reason set too coarse |
| CS4 | `src/core/runtime/startupReconciler.ts` | startup reconcile facade | existing startup entrypoint | shared invariant inventory alignment (future) | Startup recovery es runtime watchdog ugyanazt a runtime surface mismatch fogalmat hasznalja | P2 | later-refine | one invariant source |
| CS5 | `src/core/runtime/tmuxDelivery.ts` | delivery health assumptions | existing delivery confirmation layer | health / replay boundary (future) | A delivery konfirmacio kapcsolodjon a kozos runtime-surface health modelhez, ne kulon ad-hoc szabalyokra epuljon | P2 | later-refine | avoid duplicated health logic |

### 2) Data and Interface Contract

High-level direction only.

| Contract | Current | Target | Required Fields | Optional Fields | Compatibility | Priority | Timing |
|---|---|---|---|---|---|---|---|
| Runtime pane health | readable pane ~= healthy pane | explicit runtime-surface classification | expected role, observed surface class, evidence basis | raw diagnostics | behavior extension | P1 | later-refine |
| Reconcile stale reason set | missing bubble/session/final-state oriented | includes surface-mismatch class | reason, evidence source, chosen action | audit metadata | behavior extension | P1 | later-refine |
| Self-healing action policy | partial, route-specific | shared recover-or-escalate rule | deterministic action class, replay policy | operator guidance | behavior clarification | P1 | later-refine |

Seed scenario to preserve:
1. state active ownership says implementer/reviewer/meta-reviewer is live,
2. tmux capture works,
3. pane content shows shell fallback, exited worker, or non-agent runtime surface,
4. pending or future delivery would target the wrong surface unless recovered.

### 3) Side Effects Contract

| Area | Allowed | Forbidden | Notes | Priority | Timing |
|---|---|---|---|---|---|
| Runtime recovery | deterministic respawn/restart + idempotent replay, ha evidence eleg eros | heuristic blind replay vagy bizonytalan state mutation | self-healing csak explicit invariant proof mellett | P1 | later-refine |
| Escalation | explicit operator signal, ha recovery nem biztos | silent stuck active state | observability fontosabb, mint a latszolagos smoothness | P1 | later-refine |
| Shared authority | watchdog/reconcile/startup kozos boundary | kulon-kulon special-case javitasok szetszorasa | hosszabb tavu cel a kozos authority | P1 | later-refine |

### 4) Error and Fallback Contract

| Trigger | Dependency (if any) | Behavior (`throw|result|fallback`) | Fallback Value/Action | Reason Code | Log Level | Priority | Timing |
|---|---|---|---|---|---|---|---|
| readable pane but wrong runtime surface | tmux capture + state/runtime evidence | fallback | deterministic recover, ha biztos | TBD_AFTER_REFINEMENT | warn | P1 | later-refine |
| wrong surface but recovery certainty insufficient | same | result | escalate/bell operator | TBD_AFTER_REFINEMENT | error/warn | P1 | later-refine |
| runtime surface recovered but replay outcome uncertain | shared recovery boundary | result | do not double-mutate silently; preserve audit trail | TBD_AFTER_REFINEMENT | warn | P2 | later-refine |

### 5) Dependency Constraints

| Type | Items | Priority | Timing |
|---|---|---|---|
| must-use | transcript/state/runtime evidence together for mismatch classification | P1 | later-refine |
| must-use | shared reconcile/self-healing boundary | P1 | later-refine |
| must-not-use | readable-pane == healthy-pane shortcut | P1 | later-refine |
| must-not-use | meta-review-only one-off fix as the final architecture | P1 | later-refine |

### 6) Test Matrix

Placeholder only.

| ID | Scenario | Given | When | Then | Priority | Timing | Evidence |
|---|---|---|---|---|---|---|---|
| T1 | runtime surface mismatch detected | state says active agent, pane is readable, content shows fallback shell | future watchdog/reconcile flow runs | system classifies impossible-state explicitly, not as normal healthy pane | P1 | later-refine | observed incident |
| T2 | deterministic self-healing path | same mismatch + safe respawn/replay preconditions | future recovery runs | worker restored or delivery re-targeted idempotently | P1 | later-refine | design goal |
| T3 | uncertain recovery path | mismatch evidence incomplete or contradictory | future recovery runs | no silent mutation, explicit escalation | P1 | later-refine | safety default |

## Acceptance Criteria

1. AC1: A dokumentum nevezze meg kulon failure classkent a runtime surface mismatch esetet.
2. AC2: Legyen egyertelmu, hogy a cel altalanos self-healing/reconcile irany, nem tovabbi egyedi meta-review patch.
3. AC3: A dokumentum most tudatosan csak tiszta problem capture + celallapot, nem vegleges implementacios freeze.

## L2 - Implementation Notes (Optional)

1. [later-hardening] Erdemes lehet kulon canonical surface-classification vocabulary.
2. [later-hardening] A delivery replay idempotency policy-t jo lenne kozosen tervezni a reconcile boundaryval.

## Hardening Backlog (Optional)

| ID | Item | Layer | Priority | Timing | Source | Proposed Action |
|---|---|---|---|---|---|---|
| H1 | shared runtime-surface health taxonomy | L2 | P2 | later-hardening | current mismatch ambiguity | kozos classification vocabulary watchdog/reconcile/delivery kozott |
| H2 | replay audit metadata | L2 | P2 | later-hardening | future self-healing traceability | unify replay outcome logging and diagnostics |

## Review Control

1. Ez a task most szandekosan nem exact implementation contract.
2. A kesobbi refine dolga lesz a precise detection/recovery contract kitoltese.
3. A jelen dokumentum celja: a mostani shell-fallback eset es a kivant altalanos irany tiszta rogzitese.

## Assumptions

1. A runtime surface mismatch nem egyszeri meta-review bug, hanem altalanos system class.
2. A jovobeli megoldasnak watchdog + reconcile + startup recovery szinten osszehangoltnak kell lennie.

## Open Questions

1. Milyen minimum evidence eleg deterministic respawn/replay-hez operator bevonas nelkul?
2. Melyik boundary legyen a kozos authority: watchdog, reconcile, vagy kozos recovery primitive?

## Spec Lock

This task is intentionally `NOT_IMPLEMENTABLE_YET`.
Refine-ra kesz, ha:
1. a mostani watchdog baseline stabil,
2. a runtime surface mismatch inventory pontosabb,
3. a kozos self-healing boundaryrol van tisztabb architekturális dontes.
