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
4. Target lifecycle: a bubble domain state machine ne szereplo-specifikus allapotokra epuljon. A meta-review futas elvi celallapota nem kulon `META_REVIEW_RUNNING`, hanem egy altalanos `RUNNING(active_role=meta_reviewer)` execution context.
5. Timeout policy: timeout akkor tortenik, ha a vart tartos result envelope nem erkezik meg a deadline-ig. A "delivery unconfirmed" onmagaban nem timeout es nem domain failure.
6. Migration policy: Phase 1-ben backward compatibility megengedett, de csak adapter retegben. A target architecture reasoninget nem a jelenlegi implementation korlatai diktaljak.
7. End-state cleanup policy: a migration vegallapota nem hosszu tavu adapter-egyutteles. Az utolso fazis kotelezo celja a korabbi meta-review lifecycle modellhez es compatibility pathokhoz tartozo kod teljes eltavolitasa, hogy a vegso codebase a target modellre redukalt, lean es egyertelmu legyen.
8. Transport uncertainty policy: a `confirmed|uncertain|failed` delivery jelzes operator/runtime surface, nem gate routing authority.

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
   - meta-review activation,
   - meta-review notify/runtime uncertainty,
   - meta-review submit acceptance,
   - meta-review watchdog timeout authority.
2. Phase 2-nek le kell fednie:
   - bubble lifecycle state shape,
   - execution context representation,
   - restart/recovery es timeout szemantika kozositese.
3. Phase 3-nak le kell fednie:
   - actor-facing CLI entrypointok es parser-ek (`pass`, `converged`, `ask-human`, `bubble meta-review submit`),
   - `orchestra` alias surface,
   - human-facing vs actor-facing CLI boundary, beleertve a `bubble meta-review run|status|last-report|recover` operatori status/recovery surface megtartasat vagy athelyezeset,
   - runtime guidance/prompt/help text, amely ma actor-specifikus commandokat ajanl.
4. Phase 4-nek le kell fednie:
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
4. Ez a szakasz kizarolag kesobbi future-improvement iranyt rogzit. Nem resze a jelen plan fazisainak, nem jelenlegi deliverable, es nem elvaras a Phase 1-4 vegrehajtasahoz.

## Phase Breakdown

| Phase | Goal | Inputs | Outputs | Exit Criteria |
|---|---|---|---|---|
| Phase 1 | Meta-review delivery/domain decoupling | jelenlegi meta-review gate, watchdog, submit flow | a durable TASK append utan a meta-review lifecycle mar nem eshet fail-closed-ra pusztan pane/delivery bizonytalansag miatt; runtime uncertainty kulon surface-re kerul | hamis `META_REVIEW_FAILED` notify-path megszunik; timeout tovabbra is eredmeny-hiany alapu |
| Phase 2 | Generic running execution context | Phase 1 contract, state machine inventory, watchdog semantics | altalanos `RUNNING(active_role, awaited_output_type, handoff_id, deadline_at, attempt)` context + compatibility adapter | a meta-review futas es timeout ugyanabba az execution modellbe kerul, mint reviewer/implementer |
| Phase 3 | CLI and protocol surface unification | Phase 2 domain model, human vs actor CLI inventory | generic actor-protocol emission surface + actor-specifikus commandok kivezetesi terve + recovery/restart/watchdog alignment | az actor output mar nem role-specifikus command semanticsre epul; a meta-review domain path mar nem kulon submit/gate special case |
| Phase 4 | Legacy model removal and codebase lean-down | stabilized Phase 3 architecture, compatibility inventory | regi `META_REVIEW_*` lifecycle special case-ek, `READY_FOR_APPROVAL` approval-compatibility branch-ek, actor-command aliasok, UI/state legacy surface-ek es transitional branch-ek eltavolitasa | nincs tartos backward-compatibility code path; a vegso codebase csak a protocol-first modellt tartalmazza |

## Task List

1. `plans/tasks/protocol-first-meta-review-runtime-decoupling-phase1.md`
2. `plans/tasks/protocol-first-running-execution-context-unification-phase2.md` (kesobbi task)
3. `plans/tasks/protocol-first-cli-and-protocol-surface-unification-phase3.md` (kesobbi task)
4. `plans/tasks/protocol-first-legacy-meta-review-model-removal-phase4.md` (kesobbi task)

## Dependencies

1. `docs/pairflow-initial-design.md`
2. A bubble state/store es transcript contract jelenlegi implementacioja
3. Meta-review gate, watchdog es runtime delivery jelenlegi szetelemzese
4. CLI entrypointok, actor command parser-ek, runtime guidance promptok es approval compatibility surface inventoryja

## Risks and Mitigations

1. Risk: a Phase 1 csak felig decouplolja a runtime-ot a domain logikatol -> Mitigation: explicit target-state invariansok a taskban, es adapter-only kompromisszumok nevekkel jelolve.
2. Risk: a jelenlegi `META_REVIEW_*` allapotok tul sok helyen szerepelnek -> Mitigation: Phase 2-ig compatibility adapter megtartasa, de a domain target modell mar most kanonizalva legyen.
3. Risk: timeout semantics es restart/recovery drift -> Mitigation: Phase 1 taskban explicit timeout authority es restart boundary sorok.
4. Risk: a meta-review submit vagy mas actor command tovabbra is CLI special case marad -> Mitigation: Phase 3 kulon task, explicit human-facing vs actor-facing CLI modellel es actor-specifikus command retirementtel.

## Validation Strategy

1. Contract testek a transport uncertainty es domain state szetvalasztasara.
2. E2E szcenariok:
   - notify false negative, majd sikeres meta-review result,
   - pane unavailable, de durable handoff megmarad,
   - timeout durable result hianyaban,
   - restart aktiv meta-review kozben,
   - duplicate vagy keso result suppresszio.
3. Migration compatibility tesztek a regi `META_REVIEW_*`, `READY_FOR_APPROVAL` es actor-command compatibility surface-ekre.

## Assumptions

1. Ehhez a scope-hoz eleg a `Plan -> Task` lanc; kulon PRD nem kotelezo.
2. Phase 1-ben elfogadhato a jelenlegi allapotnevek megtartasa compatibility okbol, ha a domain authority mar nem a delivery confirmationra epul.
