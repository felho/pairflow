---
artifact_type: task
artifact_id: task_m5_01_watchdog_timeout_pane_quiet_window_v1
title: "M5-01 Watchdog: Timeout + Pane Quiet Window Gate"
status: implementable
phase: phase1
target_files:
  - "src/v11/application/watchdog/watchdogCommandContract.ts"
  - "src/v11/shared/watchdog/watchdogCommandApi.ts"
  - "src/v11/shared/watchdog/watchdogCommandRouting.ts"
  - "src/v11/shared/watchdog/watchdogPaneActivitySampler.ts"
  - "src/v11/shared/watchdog/watchdogPaneActivityStore.ts"
  - "tests/v11/application/watchdog/watchdogCommandApi.test.ts"
  - "tests/contracts/v11/watchdog.contract.runner.ts"
  - "tests/contracts/v11/watchdog.contract.test.ts"
  - "tests/contracts/v11/cases/watchdog/"
prd_ref: null
plan_ref: null
system_context_ref: docs/pairflow-initial-design.md
owners:
  - "runtime"
  - "architecture"
---

# Task: M5-01 Watchdog: Timeout + Pane Quiet Window Gate

## L0 - Policy

### Goal

A watchdog jelenlegi `timeout -> azonnali eszkalacio` viselkedeset egy ketlepcsos gate-re csereljuk:
1. az elso kuszob marad a `watchdog_timeout_minutes`, de ennek defaultja ebben a setupban `30` perc,
2. a quiet-window es a hard dead-signalok csak a timeout kuszob elerese utan lepnek be a standard `RUNNING` dontesbe,
3. timeout utan akkor eszkalalunk, ha a celpane nyers `tmux capture-pane` tartalma legalabb 10 perce valtozatlan, vagy a session/pane mar nem olvashato.

Celzott eredmeny:
1. a hosszu, de lathatoan meg mozgo agent-futas ne essen ki csak azert, mert 30 perce nem volt uj Pairflow command,
2. a Pairflow-szempontbol tenylegesen "halott" bubble tovabbra is keruljon `WAITING_HUMAN` allapotba.

### In Scope

1. Bubble-onkenti, perzisztalt pane-activity record bevezetese a runtime terben.
2. A watchdog command monitorozott, aktiv agentes allapotokban legfeljebb percenkent egyszer vegyen uj nyers `capture-pane` mintat.
3. A pane-activity record kovesse legalabb az utolso mintavetel idejet, az utolso nyers pane-hash-t, es az utolso valtozas idejet.
4. A standard `RUNNING` watchdog eszkalacio gate-je valtozzon `timeout + post-timeout pane quiet-window` modellre.
5. Timeout utan, ugyanabban a post-timeout ertekelesben a kovetkezo eros jelek azonnali eszkalaciot okozhatnak:
   - runtime session hianyzik,
   - target pane nem olvashato.
6. A quiet-window kuszob elso korben belso konstans legyen: `10` perc.
7. Celozott unit/integration + contract coverage a quiet-window viselkedesre.
8. A default timeout policy explicit alljon at `40` percrol `30` percre, mert a quiet-window gate mellett a teljesen nema eset igy is kb. `40` perc korul eszkalal.

### Out of Scope

1. Uj daemon, background scheduler vagy kulon watchdog process.
2. Uj bubble state, transcript schema/metadata vagy public CLI surface.
3. Uj config mezo a quiet-window kuszobhoz ebben a taskban.
4. Pane-tartalom normalizalasa vagy "erdemi progresszio" felismerese.
5. Prompt/block classifier (`blocked` kulon statusz) vagy prompt-specifikus kivetelszabaly.
6. Auto-restart, auto-resume vagy barmilyen tovabbi operator automation.
7. Meta-review timeout routing policy ujratervezese; a meglevo special-case route marad.

### Safety Defaults

1. Public watchdog result shape es a meglevo user-facing reason-keszlet maradjon valtozatlan; ne vezessunk be uj public reason stringet csak emiatt.
2. Pane-valtozas definicioja az MVP-ben: a nyers `tmux capture-pane` output barmilyen byte-szintu valtozasa ket minta kozott.
3. A pane-activity record ne a bubble state-ben es ne a transcriptben legyen; kulon runtime store-ba keruljon.
4. Ha timeout utan nincs elozo pane-activity record, vagy a record JSON-hibas/olvashatatlan, de uj minta veheto, az adott watchdog futas seedelje/epitse ujra a recordot, es emiatt ne eszkalaljon meg ugyanabban a futasban pusztan a quiet-window alapjan.
5. A meglevo transcript append + state persist eszkalacios write path ownershipje valtozatlan marad.

### Decision Order

1. A standard `RUNNING` watchdog utvonalon eloszor mindig a `watchdog_timeout_minutes` kuszobot kell ellenorizni; timeout elott ez a task nem nyit kulon shortcut eszkalaciot.
2. Ha a timeout meg nem jart le, a watchdog legfeljebb percenkent egyszer mintat vehet, de az eredmeny csak a kesobbi post-timeout gate alapjat kesziti elo.
3. Ha a timeout lejart, a watchdog a legfrissebb pane-activity record es az aktualis mintavetel alapjan ertekel.
4. A post-timeout ertekelesben a hianyzo session vagy az olvashatatlan pane hard dead-signal, es quiet-window nelkul is azonnali eszkalaciot jelent.
5. Ha a pane olvashato, az eszkalacio feltetele az, hogy az utolso pane-valtozas ota eltelt ido elerje a 10 percet (peldaul `now - last_changed_at >= 10 perc`); kulonben no-op es a bubble `RUNNING` marad.
6. Ha az aktualis timeout utani futasban nincs elozo record, vagy a record JSON-hibas/olvashatatlan, de a session/pane olvashato es uj minta veheto, a rendszer seedel/ujraepit es nem eszkalal ugyanabban a runban pusztan quiet-window alapon.
7. Ha a pane-activity record hianyos vagy hibas, de a post-timeout mintavetelnel a session hianyzik vagy a pane nem olvashato, a hard dead-signal szabaly elsobbseget elvez, tehat a watchdog azonnal eszkalal.
8. A `META_REVIEW_RUNNING` special-case tovabbra is kulon route: ha ez a branch ervenyes, megelőzi a standard `RUNNING` quiet-window gate-et.

### Contract Boundary / Blast Radius

1. `contract_boundary_override`: `no`
2. Erintett boundary: v11 runtime/watchdog belso orchestracio + belso runtime file format.

## L1 - Change Contract

### 1) Call-site Matrix

| ID | File | Function/Entry | Exact Signature (args -> return) | Insertion Point | Expected Behavior | Priority | Timing | Evidence |
|---|---|---|---|---|---|---|---|---|
| CS1 | `src/v11/application/watchdog/watchdogCommandContract.ts` | `BubbleWatchdogDependencies` | existing internal dependency contract | watchdog dependency surface | Opcionalisan felveszi a sampler/store seam-eket a deterministic tesztelhetoseghez, de a command input/output publikus alakja nem valtozik. | P1 | required-now | targetable watchdog tests without public CLI drift |
| CS2 | `src/v11/shared/watchdog/watchdogPaneActivityStore.ts` | `readWatchdogPaneActivity(...)`, `writeWatchdogPaneActivity(...)` | internal FS helper API | new file | `.pairflow/runtime/watchdog-health/<bubbleId>.json` alatt kezeli a per-bubble pane-activity recordot, atomic write-tal es hiany/bad-json tolerant olvasassal. | P1 | required-now | persisted quiet-window source of truth |
| CS3 | `src/v11/shared/watchdog/watchdogPaneActivitySampler.ts` | `sampleWatchdogPaneActivity(...) -> Promise<PaneActivitySampleResult>` | internal runtime sampler | new file | A bubble aktiv agentjehez tartozo target pane-rol nyers `capture-pane` mintat vesz, hash-t szamol, es visszaadja: `changed`, `pane_hash`, `sampled_at`, illetve hibaagban `no_session` / `pane_unreadable`. | P1 | required-now | raw pane movement signal |
| CS4 | `src/v11/shared/watchdog/watchdogCommandApi.ts` | `runBubbleWatchdog(...) -> Promise<BubbleWatchdogResult>` | existing | watchdog orchestration before routing | Monitorozott allapotokban legfeljebb percenkent egyszer mintat vesz es frissiti a pane-activity recordot mar a fo timeout elerese elott is. | P1 | required-now | timeout-time baseline exists |
| CS5 | `src/v11/shared/watchdog/watchdogCommandRouting.ts` | `resolveWatchdogLifecycleRoute(...) -> Promise<BubbleWatchdogResult>` | existing | standard RUNNING post-timeout branch | A `RUNNING` timeout utani agban az eszkalacio csak akkor tortenik meg, ha a quiet-window feltetel teljesul vagy a sampler/session eros hibajelet ad. | P1 | required-now | replaces `expired => escalate` with two-step gate |
| CS6 | `tests/v11/application/watchdog/watchdogCommandApi.test.ts` | watchdog API tests | existing | watchdog v11 suite | Lefedi a timeout utan is aktiv pane no-op, a quiet-window utani eszkalacio, es a missing-session / unreadable-pane eros hibaagakat. | P1 | required-now | v11 watchdog regression coverage |
| CS7 | `tests/contracts/v11/watchdog.contract.runner.ts` | contract fixture runner | existing | fixture seeding + execution path | Kiterjeszti a fixture-eket pane-activity store seedelesere, hogy a quiet-window gate deterministic contract esetekkel ellenorizheto legyen. | P1 | required-now | contract harness parity remains aligned |
| CS8 | `tests/contracts/v11/cases/watchdog/` | watchdog contract cases | existing folder | case corpus | A korabbi `running_expired` azonnali eszkalacios elvaras helyett kulon esetek lesznek: `expired_recent_change_noop`, `expired_quiet_window_escalates`, `expired_missing_session_escalates`, `expired_unreadable_pane_escalates`. | P1 | required-now | public command contract updated to new runtime rule |

### 2) Data and Interface Contract

| Contract | Current | Target | Required Fields | Optional Fields | Compatibility | Priority | Timing |
|---|---|---|---|---|---|---|---|
| Pane activity runtime record | nincs | per-bubble JSON record a runtime terben | `bubble_id`, `sampled_at`, `pane_hash`, `last_changed_at` | `session_name`, `target_pane`, `last_sample_error`, `last_sample_status` | new internal runtime artifact | P1 | required-now |
| Sampling cadence | nincs perzisztalt minta | max 1 uj minta / perc / bubble monitorozott aktiv allapotban | `sampled_at` gate, raw capture hash | internal memoized/no-op flag | non-breaking internal | P1 | required-now |
| Default timeout policy | `DEFAULT_WATCHDOG_TIMEOUT_MINUTES = 40` | `DEFAULT_WATCHDOG_TIMEOUT_MINUTES = 30` ebben a setupban | `watchdog_timeout_minutes` | n/a | behavior-changing config default, explicit by task | P1 | required-now |
| Watchdog escalation decision | `expired` eleg a standard RUNNING eszkalaciohoz | `expired` + post-timeout (`quiet_window_reached` vagy `session_missing` vagy `pane_unreadable`) kell, ahol a quiet-window az utolso pane-valtozas ota eltelt idobol szamolodik | `watchdog_timeout_minutes`, `last_changed_at` | `last_sample_status` | behavior-changing internal, CLI surface kept stable | P1 | required-now |
| Watchdog result contract | `BubbleWatchdogResult` meglevo shape | shape valtozatlan; eszkalacio/no-op semantics valtoznak | `bubbleId`, `escalated`, `reason`, `state` | existing optional fields | compatible public shape | P1 | required-now |

### 3) Side Effects Contract

| Area | Allowed | Forbidden | Notes | Priority | Timing |
|---|---|---|---|---|---|
| Runtime FS store | read/create/update `.pairflow/runtime/watchdog-health/<bubbleId>.json` | bubble state/transcript schema modositas | Kulon runtime artifact, nem canonical workflow log. | P1 | required-now |
| tmux sampling | `capture-pane` raw output olvasas, hash szamitas | prompt classification matrix, output normalizalas | Elso korben a nyers tartalom barmilyen valtozasa activitynek szamit. | P1 | required-now |
| Escalation write path | meglevo transcript append + `WAITING_HUMAN` state persist hasznalata | uj lifecycle state vagy kulon operator envelope | Az eszkalacios finalization ownership marad a jelenlegi flow-ban. | P1 | required-now |
| Status pane loop | meglovo 2s watchdog hivast hasznalhatja valtozas nelkul | uj status-pane daemon / launch-protocol redesign | A perces sampling rate-limit a watchdog belsejeben tortenik, nem a pane loopban. | P1 | required-now |

Constraint: a watchdog pane-activity feature nem irhat bubble state-et, ha nincs eszkalacio.

### 4) Error and Fallback Contract

| Trigger | Dependency (if any) | Behavior (`throw|result|fallback`) | Fallback Value/Action | Reason Code | Log Level | Priority | Timing |
|---|---|---|---|---|---|---|---|
| Nincs elozo pane-activity record | runtime FS | fallback | uj record seedeles + nincs eszkalacio pusztan quiet-window miatt ugyanabban a runban | existing no-op reason | info | P1 | required-now |
| Timeout utan a runtime session nem talalhato | sessions registry / tmux | result | standard watchdog eszkalacio a meglevo HUMAN_QUESTION pathon | existing `escalated` | warn | P1 | required-now |
| Timeout utan a target pane nem olvashato | tmux capture | result | standard watchdog eszkalacio a meglevo HUMAN_QUESTION pathon | existing `escalated` | warn | P1 | required-now |
| Timeout utan az utolso pane-valtozas ota eltelt ido elerte a 10 percet | pane-activity record | result | standard watchdog eszkalacio a meglevo HUMAN_QUESTION pathon | existing `escalated` | info | P1 | required-now |
| Timeout lejart, de a pane az utolso 10 percben valtozott | pane-activity record | result | no-op, bubble marad RUNNING | existing `not_expired` vagy mas meglovo no-op reason; ne vezess be uj public stringet kenyszer nelkul | info | P1 | required-now |
| Pane-activity record JSON hibas/olvashatatlan, de uj minta veheto | runtime FS | fallback | record ujraepitese friss mintabol; ugyanabban a runban nincs azonnali quiet-window eszkalacio | existing no-op reason | warn | P2 | required-now |
| Meta-review special route ervenyes | meglevo meta-review watchdog routing | result | a meglevo meta-review watchdog routing szerzodese valtozatlan | existing meta-review reason flow | info | P1 | required-now |

### 5) Dependency Constraints

| Type | Items | Priority | Timing |
|---|---|---|---|
| must-use | `watchdog_timeout_minutes` mint elso kuszob; defaultja ebben a taskban `30` perc; meglevo `runBubbleWatchdog` command surface; meglevo `escalateRunningWatchdog(...)` write path | P1 | required-now |
| must-use | a standard `RUNNING` gate-ben a timeout-kuszob megelozi a hard dead-signal / quiet-window ertekelest; nincs timeout elotti shortcut | P1 | required-now |
| must-use | `resolved.bubblePaths.runtimeDir` alapu runtime artifact hely, ne bubble state/transcript kornyezetbe szorjuk a health adatot | P1 | required-now |
| must-use | nyers `tmux capture-pane` output hash; nincs normalizalas, nincs prompt classifier | P1 | required-now |
| must-not-use | uj config mezo a quiet-window kuszobhoz ebben a taskban | P1 | required-now |
| must-not-use | uj bubble state mezo, transcript envelope metadata vagy audit event csak a sampling miatt | P1 | required-now |
| must-not-use | olyan special-case kivetel, hogy interaktiv prompt miatt a watchdog soha ne eszkalaljon; ha Pairflow nem kap hivatalos segitsegkerest, a bubble timeout utan quiet-window szerint dont | P1 | required-now |
| must-not-use | legacy `src/core/**` watchdog logika tovabbi novelese; az ownership `src/v11/**` marad | P1 | required-now |

### 6) Test Matrix

| ID | Scenario | Given | When | Then | Priority | Timing | Evidence |
|---|---|---|---|---|---|---|---|
| T1 | sampling seeds first record | monitorozott RUNNING bubble, nincs meg pane-activity record | watchdog fut timeout elott | uj record jon letre `sampled_at` + `last_changed_at` mezokkel; nincs eszkalacio | P1 | required-now | health store bootstrap |
| T2 | sampling rate-limited to 1 minute | van 30 mp-es friss record | watchdog ujra fut | nem vesz uj tmux capture mintat; a record valtozatlan marad | P1 | required-now | no capture storm under 2s status loop |
| T2b | default timeout lowered to 30 | default bubble configot hasznalo uj bubble | watchdog/status config olvasasa tortenik | az alap watchdog timeout `30` perc | P1 | required-now | setup-level default policy |
| T3 | timeout expired but pane changed recently | timeout mar lejart, de az utolso pane-valtozas ota eltelt ido `< 10 perc` | watchdog fut | nincs eszkalacio, state marad `RUNNING` | P1 | required-now | fixes false-positive long task escalation |
| T4 | timeout expired and quiet window reached | timeout mar lejart, es az utolso pane-valtozas ota eltelt ido `>= 10 perc` | watchdog fut | `HUMAN_QUESTION` + `WAITING_HUMAN` meglevo write pathon keresztul | P1 | required-now | two-threshold escalation |
| T5 | timeout expired and missing session | timeout mar lejart, a post-timeout mintavetelnel runtime session nincs | watchdog fut | azonnali standard eszkalacio | P1 | required-now | hard dead-signal handling |
| T6 | timeout expired and unreadable pane | timeout mar lejart, a post-timeout `capture-pane` fail | watchdog fut | azonnali standard eszkalacio | P1 | required-now | pane read failure handling |
| T7 | raw pane diff resets quiet window | ket egymas utani minta kozott a nyers pane text barmiben valtozik | watchdog mintat frissit | `last_changed_at` az uj mintavetel idejere all | P1 | required-now | raw-hash semantics |
| T8 | no prior record at first expired run | timeout mar lejart, de nincs elozo record, pane olvashato | watchdog fut | friss mintat seedel, de ugyanebben a runban nem eszkalal quiet-window hianyaban | P1 | required-now | safe first-run bootstrap |
| T8b | corrupt record rebuild at expired run | timeout mar lejart, a pane-activity record JSON-hibas/olvashatatlan, de a pane olvashato | watchdog fut | friss mintabol ujraepiti a recordot, es ugyanebben a runban nem eszkalal pusztan quiet-window alapon | P1 | required-now | corrupt-record rebuild path is explicit |
| T9 | meta-review route unchanged | `META_REVIEW_RUNNING` expired scenario | watchdog fut | a meglevo meta-review-specific timeout route tovabbra is elsobbseget elvez | P1 | required-now | scope isolation |
| T10 | contract corpus updated | watchdog contract cases futnak | `pnpm test` contract suite | a regi `running_expired` azonnali-eszkalacio expectation helyett a quiet-window szerinti case-ek zoldre futnak | P1 | required-now | contract source-of-truth sync |

## L2 - Implementation Notes (Optional)

1. A per-bubble runtime path javasolt alakja: `.pairflow/runtime/watchdog-health/<bubbleId>.json`.
2. A quiet-window kuszobot elso korben belso konstans tartsa a sampler/routing reteg (`10 * 60_000`), hogy ne nyissunk config-contractot.
3. A sampling csak akkor fusson, ha a watchdog status monitorozott es van aktiv agent; final/non-runtime state-ekben felesleges.
4. Ha a target pane feloldasa helper-extractet igenyel a tmux routingbol, azt `src/v11/shared/watchdog/**` alatt tartsuk; ne noveljuk tovabb a legacy `src/core/runtime/tmuxDelivery.ts` ownershipjet.

## Hardening Backlog (Optional)

| ID | Item | Layer | Priority | Timing | Source | Proposed Action |
|---|---|---|---|---|---|---|
| H1 | Quiet-window kuszob repo/bubble configga emelese | L1 | P2 | later-hardening | scope cut | Kulon taskban, csak ha tenyleges operator igeny es evidence van. |
| H2 | Pane normalizalas vagy spinner-zaj szures | L2 | P2 | later-hardening | scope cut | Csak akkor nyisd, ha a nyers hash tul engedekenynek bizonyul. |
| H3 | Prompt/block classifier | L2 | P2 | later-hardening | scope cut | Kulon task, mert Pairflow-szintu "dead vs blocked" policy-t is erint. |
| H4 | Status/UI surface bovites `minutes_since_last_change` adattal | L2 | P3 | later-hardening | scope cut | Csak a core gate stabilizalasa utan. |

## Review Control

1. A task akkor marad scope-on belul, ha a valtozas kizarolag a watchdog timeout utani dontesi gate-et szukiti, es nem vezet be uj workflow-allapotot vagy public CLI kiterjesztest.
2. Barmilyen javaslat, ami prompt classifierre, daemonra, restart automationre vagy config-contractra nyitna, `later-hardening` vagy kulon task.
3. A contract suite-et kotelezo ugyanabban a taskban frissiteni; nem maradhat regi `running_expired => escalate` elvaras.
4. A compatibility guard kulcsa: publikus result shape maradjon, a valtozas a mikor-eszkalalunk szabalyban legyen.
5. A hard dead-signalok ebben a taskban sem nyithatnak timeout elotti uj eszkalacios utat; a design csak a timeout utani gate-et pontositja.

## Spec Lock

Mark the task as `IMPLEMENTABLE`, mert:
1. a scope szuk es explicit,
2. nincs kulso contract-boundary override,
3. a quiet-window gate a meglevo v11 watchdog source-of-truth-on belul megvalosithato,
4. nincs ismert blocker, amely miatt mas taskra kellene varni elotte.
