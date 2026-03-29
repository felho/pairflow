---
artifact_type: task
artifact_id: task_set_m2_protocol_first_running_execution_context_unification_phase2_v1
title: "SET-M2: Protocol-First Running Execution Context Unification (Phase 2)"
status: draft
phase: phase2
target_files:
  - "src/types/bubble.ts"
  - "src/types/ui.ts"
  - "src/core/bubble/listBubbles.ts"
  - "src/core/runtime/watchdog.ts"
  - "src/core/runtime/restartRecovery.ts"
  - "src/v11/application/reconcile/runReconcileFlow.ts"
  - "src/v11/application/status/statusCliValueFormatters.ts"
  - "src/core/bubble/pendingApprovalSignal.ts"
  - "src/core/bubble/metaReview.ts"
  - "tests/core/runtime/watchdog.test.ts"
  - "tests/core/runtime/restartRecovery.test.ts"
  - "tests/core/bubble/listBubbles.test.ts"
  - "tests/core/bubble/metaReview.test.ts"
  - "tests/core/human/approval.test.ts"
  - "tests/cli/bubbleMetaReviewCommand.test.ts"
  - "tests/cli/convergedCommand.test.ts"
  - "tests/cli/index.test.ts"
  - "tests/contracts/v11/metaReviewGate.contract.runner.ts"
  - "tests/contracts/v11/restart.contract.runner.ts"
  - "tests/contracts/v11/approval.contract.runner.ts"
prd_ref: null
plan_ref: plans/protocol-first-bubble-runtime-and-meta-review-unification-plan-v1.md
system_context_ref: docs/pairflow-initial-design.md
normative_refs:
  - plans/protocol-first-bubble-runtime-and-meta-review-unification-plan-v1.md
  - plans/tasks/protocol-first-meta-review-runtime-decoupling-phase1.md
  - docs/pairflow-initial-design.md
owners:
  - "felho"
---

# Task: SET-M2 - Protocol-First Running Execution Context Unification (Phase 2)

## L0 - Policy

### Goal

Atalakítani a bubble futási modelljét úgy, hogy a meta-review ne külön lifecycle-univerzumként, hanem ugyanannak az általános execution-context modellnek a részeként működjön, mint az implementer és a reviewer.

Phase 2 célja nem a teljes actor-facing CLI/protocol unifikáció, hanem a futási állapot szemantikájának közös domain modellre hozása:
1. a `RUNNING` legyen az egyetlen actor-futást reprezentáló canonical domain state,
2. az aktív szereplőt és a várt kimenetet explicit execution context írja le,
3. a restart/recovery/watchdog/listing/status felületek ugyanarra a futási modellre épüljenek,
4. a legacy `META_REVIEW_*` és `READY_FOR_APPROVAL` surface-ek csak compatibility adapterként maradhassanak jelen.

### Preconditions

1. A Phase 2 task megírható és finomítható a Phase 1 contract alapján, a még futó Phase 1 implementation worktree-től függetlenül.
2. A Phase 2 code implementation nem indulhat el addig, amíg a Phase 1 implementation nincs `main`-re merge-elve.
3. A Phase 2 implementation a Phase 1-ben rögzített timeout- és authority-szabályokat baseline-ként kezeli; ezeket nem nyithatja újra.

### Context / Prior-Work Alignment

1. A Phase 1 kivezeti azt a hibás couplingot, amelyben a meta-review activation notify/delivery uncertainty miatt hamis `META_REVIEW_FAILED` állapotba eshet.
2. A Phase 2 erre épít, és a következő szintet rendezi: a domain state machine ne külön meta-review futási állapotokra, hanem közös execution contextre épüljön.
3. A Phase 2 nem nyúl hozzá még az actor-facing CLI felszín egységesítéséhez; azt a plan kifejezetten Phase 3-ra tolja.

### In Scope

1. A bubble lifecycle state shape olyan átalakítása, hogy a futás alatt használt canonical state `RUNNING` legyen explicit execution contexttel.
2. A `RUNNING` execution context minimál contractjának bevezetése vagy kanonizálása:
   - `active_role`
   - `awaited_output_type`
   - `handoff_id`
   - `round`
   - `started_at`
   - `deadline_at`
   - `attempt`
3. A watchdog, restart/recovery, reconcile, list/status és approval-közeli surface-ek Phase 2-kompatibilis igazítása a közös execution modellhez.
4. A legacy `META_REVIEW_RUNNING`, `META_REVIEW_FAILED` és `READY_FOR_APPROVAL` felületek compatibility-pathra szorítása, úgy hogy a canonical domain path már a közös execution-context modellt tükrözze.
5. A szükséges state-, CLI- és contract-tesztek frissítése az új canonical futási modellhez.

### Out of Scope

1. Az actor-facing CLI/protocol surface általánosítása és a role-specifikus actor commandok kivezetése.
2. A canonical `meta_review_result` envelope vagy általános actor output taxonomy végleges bevezetése.
3. A zero-CLI actor adapter runtime vagy bármilyen hasonló jövőbeli adapteres modell implementálása.
4. A legacy compatibility pathok teljes eltávolítása a codebase-ből.
5. Új operatori lifecycle parancsok vagy UI-redesign bevezetése.

### Safety Defaults

1. Phase 2 után a bubble operatori használhatósága meg kell maradjon: create/start/run/reply/approve/commit/merge flow nem eshet szét a state-shape átalakítás miatt.
2. A canonical domain state progression nem válhat tmux/runtime-scraping függővé.
3. A compatibility surface csak adapter lehet; nem fordíthatja vissza a canonical domain truth-ot legacy állapotokra.
4. A restart és a watchdog ugyanarra a canonical execution contextre támaszkodjon; nem lehet külön meta-review-specifikus futásértelmezésük.

### Contract Boundary / Blast Radius

1. `contract_boundary_override`: `yes`
2. Érintett contractok:
   - lifecycle state union és state snapshot contract,
   - restart/recovery/watchdog state authority,
   - status/listing/UI state mapping contract,
   - approval és meta-review compatibility acceptance surface.

### Normative Reference Policy

1. `normative_refs[0]`: `plans/protocol-first-bubble-runtime-and-meta-review-unification-plan-v1.md`
   - Ez rögzíti a Phase 2 célállapotot: általános `RUNNING(active_role, awaited_output_type, ...)` modell + compatibility adapter.
2. `normative_refs[1]`: `plans/tasks/protocol-first-meta-review-runtime-decoupling-phase1.md`
   - Ez adja a Phase 1 authority baseline-t; a Phase 2 nem ronthatja vissza a Phase 1-ben lezárt runtime-vs-domain boundaryt.
3. `normative_refs[2]`: `docs/pairflow-initial-design.md`
   - Ez marad a bubble lifecycle és workflow alapviselkedés baseline referenciája ott, ahol a Phase 2 task nem ír felül semmit.
4. Precedence rule: ha a jelenlegi implementáció vagy legacy test-corpus ellentmond a Phase 2 target state-shape-nek, a plan és a Phase 1 task protocol-first szabályai az elsődlegesek.

### Terminology Lock

1. `execution context` = a canonical `RUNNING` state-hez tartozó structured futási kontextus, amelyből a workflow megállapítja az aktív szereplőt és a várt kimenetet.
2. `awaited_output_type` = az a canonical output-kategória, amelyet az aktuális futás lezárásához a rendszer vár (`pass_result`, `human_reply`, `meta_review_result`).
3. `compatibility adapter` = olyan átmeneti mapping vagy acceptance path, amely legacy lifecycle shape-et elfogad vagy megjelenít, de nem ez a canonical domain truth.
4. `canonical running model` = az a domain modell, ahol minden actor-futás `RUNNING` state-ként jelenik meg explicit execution contexttel.
5. `legacy lifecycle surface` = bármely olyan state-név, guard vagy UI/counting branch, amely külön kezeli a `META_REVIEW_*` vagy `READY_FOR_APPROVAL` állapotokat a canonical modell helyett.

## L1 - Change Contract

### 1) Call-site Matrix

| ID | File | Function/Entry | Exact Signature (args -> return) | Insertion Point | Expected Behavior | Priority | Timing | Evidence |
|---|---|---|---|---|---|---|---|---|
| CS1 | `src/types/bubble.ts` | lifecycle + snapshot contract | lifecycle state union, `BubbleStateSnapshot` | state union + snapshot shape | a canonical domain shape a `RUNNING` execution-context modellre épül; a futáskontextus explicit mezőkkel reprezentálja a meta-reviewt is | P1 | required-now | target architecture baseline |
| CS2 | `src/core/runtime/watchdog.ts` | runtime monitoring eligibility | watchdog state classification helpers | monitored/non-monitored state map | a watchdog eligibility és reference timestamp logic a canonical futási modellre épüljön; a meta-review futás ne külön state-specifikus kivétel legyen | P1 | required-now | shared timeout authority |
| CS3 | `src/core/runtime/restartRecovery.ts` | restart-state preservation | restart flow entrypoints | state reload + runtime resume path | restart után a canonical execution context maradjon az authority; meta-review futás ugyanúgy `RUNNING`-ként álljon helyre, mint más actorok | P1 | required-now | recovery symmetry |
| CS4 | `src/v11/application/reconcile/runReconcileFlow.ts` | runtime session staleness logic | `runReconcileFlow(...) -> Promise<ReconcileRuntimeSessionsReport>` | runtime expected state set | a runtime session expected-state logika a canonical futási modellhez igazodjon; legacy állapotokra csak adapteres acceptance maradhat | P1 | required-now | reconcile consistency |
| CS5 | `src/core/bubble/listBubbles.ts` + `src/types/ui.ts` + `src/v11/application/status/statusCliValueFormatters.ts` | listing/status/UI state surface | list + status formatters | repo summary, counts, state formatting | a status/listing/UI surface canonicalan a `RUNNING` + execution context modellt tükrözze; legacy label-ek csak compatibility nézetként maradhassanak | P1 | required-now | operator visibility |
| CS6 | `src/core/bubble/pendingApprovalSignal.ts` + `src/core/bubble/metaReview.ts` | approval/meta-review compatibility boundary | pending approval helpers + meta-review paths | approval acceptance + submit/recover boundary | `READY_FOR_HUMAN_APPROVAL` maradjon a canonical approval state; `READY_FOR_APPROVAL` és `META_REVIEW_FAILED` csak compatibility acceptance branch lehet, nem canonical steady-state | P1 | required-now | approval compatibility |

### 2) Data and Interface Contract

| Contract | Current | Target | Required Fields | Optional Fields | Compatibility | Priority | Timing |
|---|---|---|---|---|---|---|---|
| Lifecycle state shape | `RUNNING` mellett külön `META_REVIEW_RUNNING`, `META_REVIEW_FAILED`, `READY_FOR_APPROVAL` surface-ek élnek | canonical state union a futásra `RUNNING`-ot használja; approval canonical state `READY_FOR_HUMAN_APPROVAL` | `state`, `round`, `active_role`, `active_since`, `last_command_at` | compatibility aliases | compatibility adapter allowed | P1 | required-now |
| Running execution context | részben implicit, részben szétszórt role/timestamp mezők | explicit structured execution context a canonical futás authorityjához | `active_role`, `awaited_output_type`, `handoff_id`, `round`, `started_at`, `deadline_at`, `attempt` | diagnostics | additive in Phase 2, legacy fields temporarily mirrored if needed | P1 | required-now |
| Watchdog authority input | meta-review és non-meta-review futás részben eltérő state-classificationnel működik | watchdog ugyanabból a canonical execution contextből dolgozik minden actor-futásnál | `state=RUNNING`, execution context timestamps, awaited output type | runtime diagnostics | compatibility acceptance allowed | P1 | required-now |
| Restart/recovery state authority | meta-review futás külön state-preservation ágon is értelmezhető | restart a canonical futási modellt állítja helyre, nem actor-specifikus lifecycle state-et | canonical state + execution context | adapter diagnostics | compatibility adapter allowed | P1 | required-now |
| Listing/status/UI projection | állapotnevek részben legacy surface-eket tükröznek | operatori projection canonical `RUNNING` + approval state köré szerveződik | canonical state, active role, awaited output | legacy label mapping | compatibility view allowed | P2 | required-now |

Normative linkage:
1. A Phase 2 canonical domain truth a `RUNNING` execution context; a meta-review nem külön lifecycle kategória.
2. A watchdog, restart és reconcile ugyanarra a canonical futási modellre támaszkodik.
3. A legacy `META_REVIEW_*` és `READY_FOR_APPROVAL` surface-ek csak compatibility adapterként maradhatnak fenn, nem mint új elsődleges authority.

### 3) Side Effects Contract

| Area | Allowed | Forbidden | Notes | Priority | Timing |
|---|---|---|---|---|---|
| State store | canonical `RUNNING` execution context bevezetése, explicit futási authority | külön meta-review-only steady state újraerősítése | a canonical domain shape itt dől el | P1 | required-now |
| Runtime monitoring | watchdog/restart/reconcile közös futási modellhez igazítása | actor-specifikus állapotkivétel visszahozása | restart és watchdog ne drifteljen | P1 | required-now |
| Status/UI projection | compatibility view mapping, canonical status surface pontosítása | operatori teljes használhatóság lerontása | a napi bubble használhatóság meg kell maradjon | P1 | required-now |
| Approval compatibility | legacy acceptance input megtartható átmenetileg | legacy approval state canonicalként való megtartása | `READY_FOR_HUMAN_APPROVAL` maradjon az elsődleges approval state | P1 | required-now |

Constraint: Phase 2 nem hozhat létre új actor-facing CLI special case-et a state-shape rendezéséhez.

### 4) Error and Fallback Contract

| Trigger | Dependency (if any) | Behavior (`throw|result|fallback`) | Fallback Value/Action | Reason Code | Log Level | Priority | Timing |
|---|---|---|---|---|---|---|---|
| canonical execution context hiányos vagy ellentmondásos | state load / transition mapping | throw | state unchanged; explicit validation error | `RUNNING_EXECUTION_CONTEXT_INVALID` | error | P1 | required-now |
| legacy state beolvasás compatibility pathon | persisted state / transcript history | fallback | deterministic normalize/map a canonical Phase 2 modellre | `LEGACY_RUNNING_STATE_COMPATIBILITY` | info | P2 | required-now |
| approval path legacy `READY_FOR_APPROVAL` inputtal érkezik | approval command input | fallback | acceptance megmarad, de canonical output `READY_FOR_HUMAN_APPROVAL` | `LEGACY_APPROVAL_STATE_ACCEPTED` | info | P2 | required-now |
| restart/reconcile legacy meta-review state-et talál | persisted runtime/state | fallback | canonical running compatibility normalization | `LEGACY_META_REVIEW_RUNNING_ACCEPTED` | warn | P2 | required-now |
| legacy `META_REVIEW_FAILED` csak approval compatibility miatt marad jelen | approval/meta-review transition | fallback | compatibility-only acceptance; no new canonical writes | `LEGACY_META_REVIEW_FAILED_COMPATIBILITY` | warn | P2 | required-now |

### 5) Dependency Constraints

| Type | Items | Priority | Timing |
|---|---|---|---|
| must-use | Phase 1 timeout authority baseline; canonical `RUNNING` execution context; `READY_FOR_HUMAN_APPROVAL` canonical approval state | P1 | required-now |
| must-not-use | új actor-facing CLI/submit semantics bevezetése Phase 2-ben | P1 | required-now |
| must-not-use | `META_REVIEW_RUNNING` vagy `META_REVIEW_FAILED` új canonical steady-state-ként való visszaerősítése | P1 | required-now |
| must-not-use | operatori listing/status felület használhatóságának lerontása Phase 2 állapotváltás miatt | P1 | required-now |

### 6) Test Matrix

| ID | Scenario | Given | When | Then | Priority | Timing | Evidence |
|---|---|---|---|---|---|---|---|
| T1 | meta-review active run canonicalizes to `RUNNING` execution context | bubble aktív meta-review futással vagy ennek compatibility inputjával rendelkezik | state load / status / restart flow lefut | a canonical authority `RUNNING` execution context; `active_role=meta_reviewer` és a várt output explicit | P1 | required-now | shared running model |
| T2 | implementer and reviewer parity remains under same running model | bubble implementer vagy reviewer futásban van | state transition / status / watchdog lefut | minden actor-futás ugyanazzal a canonical execution-context shape-pel látszik | P1 | required-now | actor parity |
| T3 | watchdog monitors canonical running context only | bubble canonical `RUNNING` contextben van különböző actorokkal | watchdog eligibility és timeout reference fut | nincs meta-review-specifikus külön watchdog state-követelmény | P1 | required-now | timeout symmetry |
| T4 | restart preserves canonical running context across meta-review | bubble meta-review futásból restartol | restart recovery lefut | a bubble canonical futási contexttel áll helyre, nem külön legacy steady state-be | P1 | required-now | recovery symmetry |
| T5 | reconcile stale-session logic aligns to canonical running model | runtime registry és state store vegyes canonical/legacy inputot tartalmaz | reconcile fut | a runtime expected-state logika canonical futási modellen alapul, legacy path csak adapterként marad | P1 | required-now | reconcile consistency |
| T6 | approval canonical state remains `READY_FOR_HUMAN_APPROVAL` | approval-ready bubble canonical vagy legacy inputtal van jelen | approval/status/listing flow lefut | a canonical output és user-facing elsődleges state `READY_FOR_HUMAN_APPROVAL`; legacy `READY_FOR_APPROVAL` csak acceptance path | P1 | required-now | approval normalization |
| T7 | `META_REVIEW_FAILED` no longer acts as canonical steady state | korábbi compatibility esetek `META_REVIEW_FAILED` inputot adnak | state normalization / approval path fut | compatibility acceptance megmaradhat, de új canonical steady-state írás nem erre a state-re épül | P1 | required-now | legacy containment |
| T8 | list/status/UI counts remain usable under canonical running model | repo több bubble-lel fut, köztük docs és code bubble is | list/status/UI projection fut | a bubble-k jól láthatók és operatorilag használhatók maradnak; a canonical running model nem teszi használhatatlanná a felszínt | P1 | required-now | operational usability |
| T9 | Phase 2 scope guard excludes CLI unification work | Phase 2 task diff + target files + plan együtt olvasható | docs/code review lefut | nincs új actor-facing generic emission surface, nincs role-command retirement implementálva | P2 | required-now | phase boundary guard |

## Acceptance Criteria (Binary)

1. AC1: A canonical actor-futás Phase 2 után `RUNNING` state-ként reprezentálódik explicit execution contexttel, és ez a meta-reviewre is igaz.
2. AC2: A watchdog, restart és reconcile ugyanarra a canonical futási modellre támaszkodik; nincs külön meta-review-specifikus steady-state authority.
3. AC3: `READY_FOR_HUMAN_APPROVAL` marad a canonical approval state; `READY_FOR_APPROVAL` legfeljebb compatibility acceptance branch lehet.
4. AC4: `META_REVIEW_RUNNING` és `META_REVIEW_FAILED` legfeljebb compatibility adapterként élhet tovább; új canonical steady-state írás nem ezekre épül.
5. AC5: A status/listing/UI surface operatorilag használható marad, és a canonical futási modell nem teszi a rendszert “nem használhatóvá” párhuzamos bubble-knél sem.
6. AC6: A Phase 2 task nem csúszik át a Phase 3 actor-facing CLI/protocol unification scope-jába.

### Acceptance Traceability

| AC | Primary Call Sites | Mandatory Tests |
|---|---|---|
| AC1 | CS1, CS2, CS3 | T1, T2, T4 |
| AC2 | CS2, CS3, CS4 | T3, T4, T5 |
| AC3 | CS5, CS6 | T6 |
| AC4 | CS1, CS5, CS6 | T1, T5, T7 |
| AC5 | CS5 | T8 |
| AC6 | CS1, CS2, CS3, CS4, CS5, CS6 | T9 |

## L2 - Implementation Notes (Optional)

1. [later-hardening] Ha a `BubbleStateSnapshot` jelenlegi lapos mezői és az új execution context egyszerre élnek átmenetileg, ezt világos compatibility mappinggel kell dokumentálni.
2. [later-hardening] A Phase 2 után érdemes külön inventory-t készíteni az összes megmaradt legacy state-label branch-ről a Phase 4 cleanuphoz.
3. [later-hardening] Az operatori usability gate-et érdemes explicit smoke checklistté alakítani a planben vagy külön follow-up docban.

## Assumptions

1. A Phase 1 implementation merge-je után lesz egy elég stabil authority baseline a Phase 2 kódmunkához.
2. A jelenlegi kódbázisban már létezik részleges `RUNNING` + `active_role` szemantika, ezért a Phase 2 nem greenfield state-modell lesz, hanem kanonizáció és egyszerűsítés.
3. A Phase 2-ben elfogadható ideiglenesen néhány compatibility branch fenntartása, ha ezek nem fordítják vissza a canonical domain truth-ot.

## Open Questions

1. A `BubbleStateSnapshot` Phase 2-ben megtartsa-e átmenetileg a jelenlegi lapos mezőket az új execution-context mezők mellett, vagy a task inkább azonnali shape-cserét célozzon compatibility mapperrel? 
2. A status/listing/UI canonical projection Phase 2-ben mennyire legyen “láthatóan új”, és mennyire maradjon operatori compatibility nézet a megszokott state-label készlettel?

## Hardening Backlog (Optional)

| ID | Item | Layer | Priority | Timing | Source | Proposed Action |
|---|---|---|---|---|---|---|
| H1 | Generic delivery status contract minden actorra | L2 | P2 | later-hardening | Phase 1 backlog | csak annyit használjunk fel, amennyi a közös execution modellhez kell; a teljes általánosítást ne nyissuk újra |
| H2 | Generic actor-facing CLI/protocol surface és actor-command retirement | L2 | P2 | later-hardening | target architecture | külön Phase 3 taskban kezeljük |
| H3 | Legacy lifecycle label-ek, approval compatibility és UI cleanup teljes kiszedése | L2 | P2 | later-hardening | target architecture | külön Phase 4 taskban távolítsuk el |

## Review Control

1. A task nem terjeszkedhet actor-facing CLI redesign vagy generic protocol emission surface irányba.
2. A task akkor jó, ha a meta-review futás canonicalan ugyanabba a `RUNNING` execution modellbe kerül, mint az implementer és reviewer.
3. Új `required-now` csak akkor jöhet be, ha a state authority, restart/recovery, watchdog vagy operatori használhatóság közvetlenül megköveteli.
4. P1 regresszió, ha a Phase 2 visszaerősíti a `META_REVIEW_RUNNING` vagy `META_REVIEW_FAILED` state-eket mint canonical steady-state authority.
5. P1 regresszió, ha a Phase 2 a napi bubble használatot lerontja úgy, hogy párhuzamos docs/code bubble operátorként már nem követhető vagy nem kezelhető megbízhatóan.

## Spec Lock

Mark task as `IMPLEMENTABLE` when all `P0/P1 + required-now` items are closed, and AC1-AC6 egyértelműen teljesíthető a state contract, recovery/watchdog consistency és operatori usability boundary alapján.
