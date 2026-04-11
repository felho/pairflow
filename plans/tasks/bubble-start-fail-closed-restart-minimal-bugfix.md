---
artifact_type: task
artifact_id: task_bubble_start_fail_closed_restart_minimal_bugfix_v2
title: "Bubble Start Startup-Incomplete Message Minimal Bugfix"
status: implementable
phase: bugfix-startup-incomplete-message
target_files:
  - src/v11/application/start/startCommandOrchestration.ts
  - src/v11/application/start/startCommandApi.ts
  - src/v11/shared/status/bubbleAttention.ts
  - tests/v11/application/start/startCommandOrchestration.test.ts
  - tests/core/bubble/startBubble.test.ts
  - tests/v11/shared/status/bubbleAttention.test.ts
prd_ref: null
plan_ref: null
system_context_ref: docs/pairflow-initial-design.md
owners:
  - "felho"
---

# Task: Bubble Start Startup-Incomplete Message Minimal Bugfix

## Current Codebase Check (2026-04-11)

1. A `resolveStartBubbleMode()` ma csak `CREATED` es resumable runtime state-ek kozott routol; a `PREPARING_WORKSPACE` generic unsupported-state hibaba esik.
2. A `PREPARING_WORKSPACE` nem tamogatott restart/recovery belepesi pont.
3. Ha a fresh start a `PREPARING_WORKSPACE` utan, de a legitim `RUNNING` elott hasal el, a bubble startup-incomplete allapotban ragadhat, mikozben a top-level hiba ma nem mondja ki eleg tisztan, hogy a bubble nem fut.
4. A `resolveBubbleAttention()` jelenleg csak runtime-mismatch suppressziot ad `PREPARING_WORKSPACE` alatt; nincs kulon stale-startup attention heuristic.
5. A valos user-facing hiany ezert minimal wording- es attention-szintu: nem uj recovery platform, hanem oszinte fail-closed operatori contract.

## L0 - Policy

### Goal

Legkisebb lehetseges bugfix:
1. a rendszer explicitten mondja ki, hogy a startup nem fejezodott be;
2. a `PREPARING_WORKSPACE` ne tunjon resumable vagy restarttal helyreallithato allapotnak;
3. az operator egy oszinte, jelenleg is tamogatott remediaciot kapjon;
4. ne vezessunk be uj recovery authorityt, uj state szemantikat, uj cleanup taxonomy-t vagy uj retry logikat.

### In Scope

1. A `PREPARING_WORKSPACE` allapotrol dobott start-hiba wordingjenek pontositasa `resolveStartBubbleMode()` szintjen.
2. A fresh startup partial-failure top-level hiba wordingjenek pontositasa `startBubble()` fail-closed surface-en.
3. Minimal stale-startup attention heuristic a beragadt `PREPARING_WORKSPACE` bubble-re a meglevo attention surface-en.
4. A direkt kapcsolodo tesztek frissitese a minimal operator-facing contractra.

### Out of Scope

1. Uj `startup_recovery` descriptor vagy barmilyen uj persisted recovery authority.
2. `PREPARING_WORKSPACE` explicit recovery, resume, restart vagy reconcile mode.
3. Uj retry-safe routing, stale taxonomy, cleanup result object, cleanup-status channel vagy uj reason-code csalad.
4. UI/status surface redesign vagy kulon presenter workflow.
5. Barmilyen altalanos startup recovery roadmap.
6. Altalanos warning minden `PREPARING_WORKSPACE` bubble-re idokuszob nelkul.

### Safety Defaults

1. Reszleges startup utan a bubble nem folytathat runtime authorityval.
2. `PREPARING_WORKSPACE` alatt beragadt bubble nem szamithat generic resumable allapotnak.
3. A hiba nem allithatja vagy sugallhatja, hogy a bubble fut.
4. A hiba nem igerhet olyan remediaciot, amit a rendszer ma valojaban nem tamogat.

## L1 - Change Contract

### 1) Call-site Matrix

| ID | File | Function/Entry | Exact Signature (args -> return) | Insertion Point | Expected Behavior | Priority | Timing | Evidence |
|---|---|---|---|---|---|---|---|---|
| CS1 | `src/v11/application/start/startCommandOrchestration.ts` | `resolveStartBubbleMode` | `(currentState: string) -> StartBubbleMode` | start mode routing | ha `currentState === PREPARING_WORKSPACE`, a hiba explicitten mondja ki, hogy ez incomplete startup / non-resumable allapot, nem altalanos "resumable runtime state" hiba | P1 | required-now | T1 |
| CS2 | `src/v11/application/start/startCommandApi.ts` | `startBubble` catch path | `(input, dependencies) -> Promise<StartBubbleResult>` | top-level start error surface | fresh startup partial failure eseten a vegso hiba mondja ki, hogy a bubble startupja nem fejezodott be es a bubble nem fut; ne irjon restart/reconcile guidance-ot, hanem az operatori torles utani uj, tiszta indulast kerje | P1 | required-now | T2 |
| CS3 | `src/v11/shared/status/bubbleAttention.ts` | `resolveBubbleAttention` | `({ state, runtimeSession, stateValidation, watchdog, paneActivityRead, now }) -> UiBubbleAttention | null` | existing attention surface | csak a runtime session nelkuli, legalabb 5 perce `PREPARING_WORKSPACE` allapotban allo bubble kapjon figyelmeztetest; a normal, rovid startup ne | P1 | required-now | T3 |

### 2) Operator Message Contract

#### A) `PREPARING_WORKSPACE` start reject

Kotelezo operatori teny:
1. a bubble egy felbehagyott vagy incomplete startup allapotban van;
2. ez nem resumable `bubble start` allapot;
3. a bubble nem tekintheto futonak.

Kotelezo remediation:
1. a jelenlegi bubble-t el kell tavolitani;
2. ezutan uj bubble-t kell inditani.

Megengedett konkret operatori pelda:
1. `pairflow bubble delete --id <id> --force`
2. majd uj bubble letrehozasa / inditasa

Tiltott allitasok:
1. `restart` mint tamogatott helyreallitas erre az allapotra
2. `reconcile` mint altalanos startup recovery
3. barmilyen sugallat, hogy a startup egyszeruen folytathato

#### B) Fresh startup partial failure

Kotelezo operatori teny:
1. a startup nem fejezodott be;
2. a bubble nem lett legitim `RUNNING`;
3. a bubble nem tekintheto futonak.

Kotelezo remediation:
1. uj, tiszta indulast kell kerni;
2. a jelenlegi incomplete bubble operatori torlese utan.

Tiltott allitasok:
1. `restart required`
2. `reconcile may fix this startup`
3. `you can continue from here`

### 3) UI Attention Contract

Kotelezo viselkedes:
1. a UI ne mutasson warningot minden `PREPARING_WORKSPACE` bubble-re;
2. kulon attention csak akkor jelenjen meg, ha a bubble runtime session nelkul gyanusan sokaig marad ebben az allapotban;
3. az attention ugyanazt a jelentest kozvetitse, mint a CLI bugfix: a startup incomplete, a bubble nem resumable, es uj tiszta inditas szukseges torles utan;
4. ez a meglevo attention object surface-en maradjon, ne koveteljen uj UI state-et vagy presenter-logikat.

Required-now heuristic:
1. `state === PREPARING_WORKSPACE`
2. nincs aktiv runtime session
3. az allapot legalabb 5 perce fennall
4. uj config surface nem szukseges

Time-threshold rule:
1. a kuszob legyen fix, perc alapu es 5 perc;
2. ez eleg rovid a tenylegesen beragadt bubble jelzesere;
3. ez eleg hosszu ahhoz, hogy a normal startupot ne jelolje hibasnak;
4. uj config surface nem szukseges.

Allowed UI wording:
1. `Startup incomplete`
2. `This bubble is not resumable. Delete it and create a new bubble.`

Forbidden UI behavior:
1. altalanos warning minden friss `PREPARING_WORKSPACE` bubble-re
2. `restart` mint ajanlott fo action
3. `reconcile` mint ajanlott fo action

### 4) Required-Now Rules

1. A task nem vezet be uj persisted state fieldet.
2. A task nem valtoztatja meg a lifecycle state machine-t.
3. A task nem kovetel cleanup seam vagy state-write refaktort.
4. A task nem kovetel uj reason code-ot; a meglevo error family megtarthato.
5. A task nem vezet be uj UI config vagy threshold config surface-t.
6. A task csak az operator-facing uzeneti contractot es egy minimal, 5 perces UI attention heuristicat szukiti es pontositja.

### 5) Test Matrix

| ID | Scenario | Given | When | Then | Priority | Timing | Evidence |
|---|---|---|---|---|---|---|---|
| T1 | `PREPARING_WORKSPACE` nem tunik resumable allapotnak | bubble state=`PREPARING_WORKSPACE` | `bubble start` routing lefut | a hiba explicit startup-incomplete / non-resumable jelentest ad; a bubble nem tunik futonak; a remediation torles + uj start, nem restart/reconcile | P1 | required-now | `tests/v11/application/start/startCommandOrchestration.test.ts` |
| T2 | fresh startup partial failure fail-closed wording | fresh bubble, a start flow a `PREPARING_WORKSPACE` utan, de `RUNNING` elott elhasal | `bubble start` hibaval visszater | a vegso hiba kimondja, hogy a startup nem fejezodott be es a bubble nem fut; nem iger restartot/reconcile-t; uj tiszta indulast ker a jelenlegi incomplete bubble torlese utan | P1 | required-now | `tests/core/bubble/startBubble.test.ts` |
| T3 | UI attention csak a beragadt `PREPARING_WORKSPACE` bubble-re jelenik meg | egy friss es egy legalabb 5 perce `PREPARING_WORKSPACE` allapotban levo bubble, runtime session nelkul | `resolveBubbleAttention()` lefut | csak a regi bubble kap `Startup incomplete` figyelmeztetest; a friss, normal startup nem | P1 | required-now | `tests/v11/shared/status/bubbleAttention.test.ts` |

## L2 - Implementation Notes (Optional)

1. Ez a task szandekosan nem probalja "megjavitani" a beragadt startupot.
2. Ez a task csak oszinteve es egyertelmuve teszi a jelenlegi rendszer valos viselkedeset.
3. A UI kiegeszites szandekosan egyszeru, fix 5 perces heuristic, nem uj recovery authority.
4. Ha kesobb tenyleges startup recovery feature kell, az kulon, uj task legyen, sajat acceptance contracttal.

## Review Control

1. Csak implementacios blocker finding emelheto be.
2. Wording asymmetry vagy traceability-only finding onmagaban nem nyit uj kort.
3. Barmely javaslat, amely uj recovery authorityt vagy uj retry platformot hozna be, out-of-scope.

## Spec Lock

Ez a task akkor `IMPLEMENTABLE`, ha:
1. a `PREPARING_WORKSPACE` path nem tunik resumable start allapotnak;
2. a fresh partial failure nem tunik sikeresen elindult bubble-nek;
3. egyik hiba sem igert restart/reconcile helyreallitast;
4. a remediation a jelenleg is tamogatott operatori utra mutat: torles, majd uj tiszta inditas;
5. a UI nem altalanos `PREPARING_WORKSPACE` warningot mutat, hanem csak a beragadt esetre ad attentiont;
6. a diff nem vezet be uj state/schema/recovery contractot.
