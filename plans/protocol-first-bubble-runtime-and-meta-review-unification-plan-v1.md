---
artifact_type: plan
artifact_id: plan_protocol_first_bubble_runtime_and_meta_review_unification_v1
title: "Protocol-First Bubble Runtime and Meta-Review Unification (Phase Plan)"
status: draft
prd_ref: null
owners:
  - "felho"
---

# Plan: Protocol-First Bubble Runtime and Meta-Review Unification

## Objective

Elso elvbol ujrarendezni a bubble runtime szemantikajat ugy, hogy:
1. a workflow igazsaga kizarolag a tartos protocol allapot legyen,
2. a tmux/pane/shell marker csak transport es observability szerepet kapjon,
3. a meta-reviewer ne legyen kulon lifecycle-kivetel, hanem normal actor legyen,
4. a timeout a hianyzo tartos eredmenybol kovetkezzen, ne transport-bizonytalansagbol.

## Decision Baseline

1. Canonical truth source: a tartos bubble state + transcript envelope-ok. Domain state transition nem vezetheto le tmux capture-bol, pane markerbol, prompt allapotbol vagy shell fallbackbol.
2. Runtime layering: a workflow/protocol reteg, az orchestration reteg es a runtime/transport reteg kulon felelossegi kor. A runtime delivery status observability signal, nem domain input.
3. Actor model: `implementer`, `reviewer` es `meta_reviewer` ugyanannak az altalanos actor/handoff/result modellnek a szereploi.
4. Execution-context authority policy: minden aktiv actor-futast explicit, tartos execution context definial `handoff_id`, `round`, `awaited_output_type`, `started_at`, `deadline_at`, `attempt` mezokkel. Ezek a mezok domain authorityk.
5. Execution-context mutation policy: execution contextet csak durable handoff nyithat meg, es csak canonical durable result vagy explicit human lifecycle decision zarhat le vagy cserelhet le. `resume`, `restart`, tmux rebind, pane liveness, `last_command_at` vagy mas runtime activity timestamp nem irhatja at a context authority mezoit.
6. Target lifecycle: a bubble domain state machine ne szereplo-specifikus allapotokra epuljon. A meta-review futas elvi celallapota nem kulon `META_REVIEW_RUNNING`, hanem egy altalanos `RUNNING(active_role=meta_reviewer)` execution context.
7. Timeout policy: timeout akkor tortenik, ha a vart tartos result envelope nem erkezik meg a canonical `deadline_at`-ig. A "delivery unconfirmed" onmagaban nem timeout es nem domain failure.
8. Migration policy: az authority-modellt Phase 1-ben explicitte kell tenni, mielott a meta-review decoupling vagy generic runtime unification megtortenik. Backward compatibility csak adapter retegben megengedett; a target architecture reasoninget nem a jelenlegi implementation korlatai diktaljak.
9. End-state cleanup policy: a migration vegallapota nem hosszu tavu adapter-egyutteles. Az utolso fazis kotelezo celja a korabbi meta-review lifecycle modellhez es compatibility pathokhoz tartozo kod teljes eltavolitasa, hogy a vegso codebase a target modellre redukalt, lean es egyertelmu legyen.
10. Transport uncertainty policy: a `confirmed|uncertain|failed` delivery jelzes operator/runtime surface, nem gate routing authority.

## Target Architecture

### Domain Model

1. Bubble lifecycle canonical shape:
   - `CREATED`
   - `PREPARING_WORKSPACE`
   - `RUNNING`
   - `WAITING_HUMAN`
   - `READY_FOR_HUMAN_APPROVAL`
   - `APPROVED_FOR_COMMIT`
   - `COMMITTED`
   - `DONE`
   - `FAILED`
   - `CANCELLED`
2. A `RUNNING` allapot kotelezo execution contexttel rendelkezik:
   - `active_role = implementer | reviewer | meta_reviewer`
   - `awaited_output_type = pass_result | human_reply | meta_review_result`
   - `handoff_id`
   - `round`
   - `started_at`
   - `deadline_at`
   - `attempt`
3. A meta-reviewer domain szemantikaja nem kulon gate runtime, hanem ugyanolyan handoff/result actor ciklus, mint a reviewer.
4. Execution context invariansok:
   - `started_at` es `deadline_at` a handoff nyitasakor rogzulnek, es ugyanahhoz az aktiv handoffhoz tartoznak.
   - `handoff_id` az a canonical kapocs, amely a futo actor contextet a durable handoff envelope-hoz koti.
   - a timeout authority ezt a rogzitett execution contextet olvassa, nem mozgathato activity timestampet.
   - `resume`, `restart`, session-rebind, pane-ujrainditas vagy runtime heartbeat nem hoz letre uj execution contextet, es nem hosszabbitja meg a meglevo deadline-t.
5. Compatibility policy:
   - transitional fazisokban a legacy lifecycle state nevek megmaradhatnak,
   - de a domain decisioneket mar az explicit execution context authoritynak kell vezetnie,
   - a legacy mezok nem lehetnek alternativ authority forrasok.

### Protocol Model

1. A bubble loop minden szereploje ugyanazt a mintat koveti:
   - orchestrator durable handoffot appendel,
   - runtime best-effort kezbesit,
   - actor a durable handoffbol dolgozik,
   - actor canonical protocol outputot appendel,
   - orchestrator a canonical outputbol routol tovabb.
2. A meta-review output canonical contractja egy durable `meta_review_result`.
3. Az actor-originated canonical protocol output nem csak result lehet, hanem human escalation/request is, ha az actor human input nelkul nem tud tovabblepni.
4. A CLI surface a target protocol modellel legyen osszhangban:
   - a human-facing bubble lifecycle parancsok megmaradhatnak,
   - az actor-facing role-specifikus submit/parity/question parancsok fokozatosan kivezetendok,
   - helyettuk altalanos actor-protocol primitive vagy vele ekvivalens canonical protocol emission surface legyen.
5. A CLI submit lehet atmeneti kenyelmi adapter, de nem lehet a domain source of truthja.

### Runtime Model

1. A tmux/runtime feladata:
   - session es pane launch,
   - message delivery,
   - retry,
   - liveness,
   - restart/rebind,
   - observability artifactok.
2. A tmux/runtime nem feladata:
   - domain state fail-re allitasa delivery bizonytalansag miatt,
   - workflow authority eldontese scrollback alapjan,
   - "agent biztosan elindult" kovetelmeny kikovetkeztetese marker-presencebol.

### CLI Surface Model

1. A target CLI-t ket felelossegi korre kell szetvalasztani:
   - human-facing bubble lifecycle surface,
   - generic actor-facing protocol surface.
2. A human-facing bubble lifecycle surface celja a bubble operatori menedzsmentje:
   - `bubble create`
   - `bubble start`
   - `bubble kickoff`
   - `bubble status`
   - `bubble list`
   - `bubble inbox`
   - `bubble open`
   - `bubble resume`
   - `bubble reply`
   - `bubble approve`
   - `bubble request-rework`
   - `bubble restart`
   - `bubble reconcile`
   - `bubble watchdog`
   - `bubble stop`
   - `bubble delete`
   - `bubble commit`
   - `bubble merge`
   - `bubble meta-review run`
   - `bubble meta-review status`
   - `bubble meta-review last-report`
   - `bubble meta-review recover`
3. A human-facing CLI nem actor outputot formalizal, hanem operatori donteseket es lifecycle muveleteket.
4. Az actor-facing surface celja canonical actor protocol emission:
   - ne legyen implementer/reviewer/meta-reviewer-specifikus command semantics,
   - a surface generic legyen actor- es protocol-output-kind fuggetlen alapprimitive-ekkel,
   - ugyanaz a generic surface fedje a result emissiont es a human escalation/request emissiont is,
   - a protocol emission ugyanarra a durable envelope modellre epuljon minden actor eseten.
5. A target allapotban a kovetkezo actor-specifikus command kategoriak kivezetendok:
   - `pairflow pass`,
   - `pairflow converged`,
   - `pairflow ask-human`,
   - `pairflow bubble meta-review submit`,
   - `orchestra` actor-command aliasok,
   - role-specifikus submit commandok,
   - meta-review special-case commandok,
   - olyan parity/notify-submit branch-ek, amelyek a command elteresebol erednek.
6. A target CLI invarians:
   - ugyanaz a canonical protocol modell fogadja az implementer, reviewer es meta-reviewer actor outputot, beleertve a resultokat es a human escalation/request outputokat is,
   - a CLI csak interface lehet ehhez, nem kulon domain logic branch.

### Coverage Checklist

1. Phase 1-nek le kell fednie:
   - explicit execution context schema es persistence,
   - activation-side `started_at` / `deadline_at` / `handoff_id` authority,
   - `resume` / `restart` / watchdog activity mezok es execution context authority szetvalasztasa,
   - negative guardok arra, hogy runtime activity nem hosszabbit meg execution contextet.
2. Phase 2-nek le kell fednie:
   - meta-review activation,
   - meta-review notify/runtime uncertainty,
   - meta-review submit acceptance,
   - meta-review watchdog timeout authority,
   - meta-review recovery ugyanazon execution context authorityra kotese.
3. Phase 3-nak le kell fednie:
   - bubble lifecycle state shape altalanositasa a teljes loopra,
   - reviewer/implementer/meta-reviewer kozos execution context representationje,
   - restart/recovery es timeout szemantika kozositese minden actorra,
   - compatibility adapter a legacy `META_REVIEW_*` allapotok es az uj context kozott.
4. Phase 4-nek le kell fednie:
   - actor-facing CLI entrypointok es parser-ek (`pass`, `converged`, `ask-human`, `bubble meta-review submit`),
   - `orchestra` alias surface,
   - human-facing vs actor-facing CLI boundary, beleertve a `bubble meta-review run|status|last-report|recover` operatori status/recovery surface megtartasat vagy athelyezeset,
   - runtime guidance/prompt/help text, amely ma actor-specifikus commandokat ajanl.
5. Phase 5-nek le kell fednie:
   - `META_REVIEW_*` lifecycle special case-ek eltavolitasa a state es UI surface-ekrol,
   - `READY_FOR_APPROVAL` approval-compatibility branch-ek es transcript-context legacy guardok cleanupja,
   - docs, runbookok es help/guidance szovegek cleanupja, amelyek a regi actor-command vagy `META_REVIEW_*` modellre epulnek,
   - contract fixtures, parity cases es tesztek atallitasa az uj canonical modellre.

### Potential Future Improvement: Actor Adapter Runtime

1. Az adapteres, zero-CLI actor runtime nincs benne ennek a plannak a scope-jaban.
2. Kesesobbi egyszerusitesi lehetosegkent vizsgalhato egy actor adapter runtime, ahol:
   - a launcher egy generic actor runtime-ot indit,
   - az actor egy specialis toolon vagy mas explicit structured csatornan ad le canonical actor outputot,
   - az adapter ezt durable envelope-ra forditja.
3. Ennek potencialis elonye:
   - meg kevesebb actor-specifikus CLI surface,
   - tisztabb boundary a workflow es az agent runtime kozott,
   - alacsonyabb kockazat a pane-scraping vagy shell-driven coupling iranyaba.
4. Ez a szakasz kizarolag kesobbi future-improvement iranyt rogzit. Nem resze a jelen plan fazisainak, nem jelenlegi deliverable, es nem elvaras a Phase 1-5 vegrehajtasahoz.

## Phase Breakdown

| Phase | Goal | Inputs | Outputs | Exit Criteria |
|---|---|---|---|---|
| Phase 1 | Execution-context authority bevezetese meta-review scope-ban | jelenlegi meta-review gate, watchdog, resume/restart flow inventory | explicit, tartos meta-review execution context authority `handoff_id`, `round`, `awaited_output_type`, `started_at`, `deadline_at`, `attempt` mezokkel; invariansok arra, hogy runtime activity nem irhatja at ezeket | a meta-review aktiv ablak mar nem `last_command_at` vagy mas activity timestamp alapu; `resume`/`restart` nem hosszabbit meg authority contextet |
| Phase 2 | Meta-review runtime/domain decoupling az explicit authority contextre epitve | Phase 1 execution context contract | a durable handoff utan notify/delivery bizonytalansag nem fail-closed domain route; submit/watchdog/recovery ugyanazt a rogzitett contextet olvassa; runtime uncertainty kulon surface-re kerul | hamis notify-path fail route megszunik, es timeout kizarolag a rogzitett context deadline + hianyzo durable result alapjan tortenik |
| Phase 3 | Generic running execution context a teljes bubble loopra | Phase 1-2 authority es meta-review contract, state machine inventory | altalanos `RUNNING(active_role, awaited_output_type, handoff_id, started_at, deadline_at, attempt)` modell reviewerre, implementerre es meta-reviewerre; compatibility adapter | a meta-review mar nem special-case execution modell, hanem ugyanazon altalanos context egy peldanya |
| Phase 4 | CLI es protocol surface unification | Phase 3 domain model, human vs actor CLI inventory | generic actor-protocol emission surface + actor-specifikus commandok kivezetesi terve + recovery/restart/watchdog alignment | az actor output mar nem role-specifikus command semanticsre epul; a meta-review domain path mar nem kulon submit/gate special case |
| Phase 5 | Legacy model removal es codebase lean-down | stabilized Phase 4 architecture, compatibility inventory | regi `META_REVIEW_*` lifecycle special case-ek, `READY_FOR_APPROVAL` approval-compatibility branch-ek, actor-command aliasok, UI/state legacy surface-ek es transitional branch-ek eltavolitasa | nincs tartos backward-compatibility code path; a vegso codebase csak a protocol-first modellt tartalmazza |

## Task List

1. `plans/tasks/protocol-first-meta-review-execution-context-authority-phase1.md` (uj task)
2. `plans/tasks/protocol-first-meta-review-runtime-decoupling-phase2.md` (uj task)
3. `plans/tasks/protocol-first-running-execution-context-unification-phase3.md` (kesobbi task)
4. `plans/tasks/protocol-first-cli-and-protocol-surface-unification-phase4.md` (kesobbi task)
5. `plans/tasks/protocol-first-legacy-meta-review-model-removal-phase5.md` (kesobbi task)

## Dependencies

1. `docs/pairflow-initial-design.md`
2. A bubble state/store es transcript contract jelenlegi implementacioja
3. Meta-review gate, watchdog es runtime delivery jelenlegi szetelemzese
4. CLI entrypointok, actor command parser-ek, runtime guidance promptok es approval compatibility surface inventoryja

## Risks and Mitigations

1. Risk: a decoupling ujra megelőzi az authority-modell lezárását -> Mitigation: Phase 1 kizárólag execution-context authority task lehet; domain/runtime decoupling csak erre épülhet.
2. Risk: a jelenlegi `META_REVIEW_*` allapotok tul sok helyen szerepelnek -> Mitigation: a compatibility adapter Phase 3-ban bevezethetö es a Phase 5 cleanupig megtarthato, de a domain target modell es az authority invariansok mar most kanonizalva legyenek.
3. Risk: timeout semantics es restart/recovery drift -> Mitigation: Phase 1 taskban explicit szabaly, hogy `resume`/`restart`/activity timestamp nem irhatja at a `started_at`/`deadline_at` authorityt; Phase 2 ezt minden meta-review call site-on ervenyesiti.
4. Risk: a meta-review submit vagy mas actor command tovabbra is CLI special case marad -> Mitigation: Phase 4 kulon task, explicit human-facing vs actor-facing CLI modellel es actor-specifikus command retirementtel.
5. Risk: a transitional allapotban ket authority modell el egymas mellett -> Mitigation: minden fazis exit criteria-jaban legyen kimondva, melyik mezok authorityk es mely legacy mezok csak compatibility/UX szerepet kapnak.

## Validation Strategy

1. Contract testek az execution-context authority rogzitettsegere:
   - activation letrehozza a `handoff_id` / `started_at` / `deadline_at` contextet,
   - `resume` / `restart` / runtime liveness nem modositja ezeket,
   - activity timestamp nem alternativ timeout authority.
2. Contract testek a transport uncertainty es domain state szetvalasztasara.
3. E2E szcenariok:
   - notify false negative, majd sikeres meta-review result,
   - pane unavailable, de durable handoff megmarad,
   - timeout durable result hianyaban,
   - restart aktiv meta-review kozben authority context valtozatlansaggal,
   - duplicate vagy keso result suppresszio.
4. Migration compatibility tesztek a regi `META_REVIEW_*`, `READY_FOR_APPROVAL` es actor-command compatibility surface-ekre.

## Assumptions

1. Ehhez a scope-hoz eleg a `Plan -> Task` lanc; kulon PRD nem kotelezo.
2. Phase 1-ben elfogadhato a jelenlegi allapotnevek megtartasa compatibility okbol, ha az execution-context authority mar explicit es nem activity timestampre vagy delivery confirmationra epul.
