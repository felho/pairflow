---
artifact_type: task
artifact_id: task_protocol_first_meta_review_execution_context_authority_phase1_v1
title: "Protocol-First Meta-Review Execution Context Authority (Phase 1)"
status: draft
phase: phase1
target_files:
  - src/types/bubble.ts
  - src/core/state/initialState.ts
  - src/core/state/stateSchema.ts
  - src/v11/shared/metaReviewGate/metaReviewGateStateStaging.ts
  - src/v11/shared/start/startCommandFlows.ts
  - src/core/runtime/watchdog.ts
  - src/core/bubble/metaReview.ts
  - src/v11/shared/watchdog/watchdogMetaReviewRouting.ts
  - docs/pairflow-initial-design.md
  - tests/core/bubble/metaReview.test.ts
  - tests/core/bubble/watchdogBubble.test.ts
  - tests/core/runtime/restartRecovery.test.ts
  - tests/contracts/v11/resume.contract.runner.ts
  - tests/core/state/stateSchema.test.ts
prd_ref: null
plan_ref: plans/protocol-first-bubble-runtime-and-meta-review-unification-plan-v1.md
system_context_ref: docs/pairflow-initial-design.md
owners:
  - "felho"
---

# Task: Protocol-First Meta-Review Execution Context Authority (Phase 1)

## L0 - Policy

### Goal

Bevezetni egy explicit, tartos meta-review execution context authority-t, amely leválasztja a domain aktiv ablakot a mozgo runtime activity mezokrol.
Phase 1 sikeres, ha a meta-review aktiv context canonical mezokbol (`handoff_id`, `round`, `awaited_output_type`, `started_at`, `deadline_at`, `attempt`) jon letre, es ezt `resume`, `restart`, tmux liveness vagy `last_command_at` mar nem tudja meghosszabbitani vagy ujraertelmezni.

### Context

Megfigyelt authority-hiba:
1. a meta-review aktiv ablak jelenleg kozvetve `active_since` / `last_command_at` mezokre epul,
2. a `resume` flow ma tovabbirja a `last_command_at` mezot,
3. a watchdog authority ma ezt az activity timestampet olvassa,
4. emiatt egy runtime/operator activity ujradefiniálhatja azt, amit a domainnek a handoff pillanatában kellett volna rogzitett contextkent kezelnie.

Phase 1 nem a teljes meta-review delivery/domain decouplingot oldja meg.
Ez a kor kizarolag azt a canonical authority modellt vezeti be, amelyre a kesobbi Phase 2 biztonsagosan epulhet.

### In Scope

1. Tartos meta-review execution context schema bevezetese a bubble stateben vagy vele ekvivalens canonical state-szerkezetben.
2. A meta-review activation oldalon a canonical `handoff_id`, `round`, `awaited_output_type`, `started_at`, `deadline_at`, `attempt` mezok rogzitese.
3. A watchdog timeout authority atkotese erre a rogzitett contextre a meta-review scope-ban.
4. A submit active-window ellenorzes atkotese ugyanarra a canonical contextre.
5. `resume` / `restart` / activity timestamp es execution-context authority szetvalasztasa.
6. A schema-, state- es contract-tesztek frissitese, beleertve explicit negativ guardokat arra, hogy runtime activity nem hosszabbitja meg a meta-review authority contextet.
7. Docs/spec szinkron a `docs/pairflow-initial-design.md`-ben a Phase 1 authority modellrol.

### Out of Scope

1. Notify/delivery uncertainty domain-decoupling teljes megvalositasa.
2. `confirmed|uncertain|failed` runtime surface vegleges shape-je.
3. Generic `RUNNING(active_role=...)` execution context unification minden actorra.
4. Actor-facing CLI unification vagy command retirement.
5. `META_REVIEW_*` lifecycle state-ek eltavolitasa.
6. Uj altalanos reconcile engine vagy watchdog redesign a teljes bubble lifecycle-ra.

### Safety Defaults

1. Runtime activity (`resume`, `restart`, tmux rebind, pane liveness, `last_command_at`) nem lehet alternativ authority forras a meta-review aktiv ablakhoz.
2. Ha a canonical meta-review execution context nem hozhato letre vagy invalid, a rendszer fail-closed validacios vagy transition hibaval alljon meg; ne fallbackeljen activity timestamp authorityra.
3. A Phase 1 ne valtoztassa meg a notify/delivery uncertainty route policyjat azon felul, ami a canonical execution-context authority ervenyesitesehez kozvetlenul szukseges.
4. A legacy lifecycle state nevek compatibility okbol megmaradhatnak, de a timeout/submit authority mar nem epithet kizarolag `active_since` / `last_command_at` mezokre.

### Contract Boundary / Blast Radius

1. `contract_boundary_override`: `yes`
2. Impacted contracts:
   - bubble state schema / persistence contract,
   - meta-review activation authority contract,
   - watchdog timeout authority contract,
   - meta-review submit active-window validation contract,
   - operator/runtime lifecycle semantics `resume` es `restart` kozben.

### Normative Reference Policy

1. `plan_ref`: `plans/protocol-first-bubble-runtime-and-meta-review-unification-plan-v1.md`
   - Ez a Phase 1 authority-first sorrend canonical forrasa.
2. `system_context_ref`: `docs/pairflow-initial-design.md`
   - A bubble lifecycle alapmodell tovabbra is innen jon, amig a task explicitten felul nem ir egy authority szabalyt.
3. Precedence rule:
   - ha a jelenlegi implementation vagy korabbi taskok implicit activity timestamp authorityt hasznalnak,
   - ebben a korben a Phase 1 plan authority-invariansai az elsodlegesek.

### Terminology Lock

1. `execution context` = a futó actor canonical domain contextje, amely legalabb `handoff_id`, `round`, `awaited_output_type`, `started_at`, `deadline_at`, `attempt` mezoket hordoz.
2. `meta-review execution context` = a `meta_reviewer` aktiv handoffjának ugyanez a canonical contextje.
3. `activity timestamp` = olyan mező, mint `last_command_at`, amely operatori vagy runtime aktivitast jelez, de nem authority.
4. `authority window` = a `started_at` -> `deadline_at` intervallum ugyanahhoz a canonical handoffhoz kotve.
5. `context mutation` = uj context letrehozasa, vagy a meglévo `handoff_id` / `started_at` / `deadline_at` / `attempt` mezok domain atirasa.

## L1 - Change Contract

### 1) Call-site Matrix

| ID | File | Function/Entry | Exact Signature (args -> return) | Insertion Point | Expected Behavior | Priority | Timing | Evidence |
|---|---|---|---|---|---|---|---|---|
| CS1 | `src/types/bubble.ts` | bubble state types | `BubbleStateSnapshot` es kapcsolodo tipusok -> type definitions | meta-review state/output tipusoknal | A bubble state tudjon explicit meta-review execution context authority mezoket serializalni ugy, hogy a required vs optional shape egyertelmu legyen Phase 1 compatibility mellett | P1 | required-now | jelenleg nincs explicit `handoff_id` / `deadline_at` authority shape |
| CS2 | `src/core/state/initialState.ts` + `src/core/state/stateSchema.ts` | state persistence + validation | `createInitialBubbleState(...) -> BubbleStateSnapshot`, `validateBubbleStateSnapshot(input) -> ValidationResult<BubbleStateSnapshot>` | state defaulting es validation branch | A schema fogadja es ervenyesitse a canonical meta-review execution contextet; activity mezok ne helyettesithessek az authority contextet | P1 | required-now | jelenlegi schema `active_since` / `last_command_at` shape-re epit |
| CS3 | `src/v11/shared/metaReviewGate/metaReviewGateStateStaging.ts` | activation staging | `stageMetaReviewRunningState(input) -> Promise<LoadedStateSnapshot>` | `META_REVIEW_RUNNING` activation path | A meta-review handoff nyitasakor canonical execution context jon letre ugyanarra a roundra, rogzitett `started_at` es `deadline_at` authorityval | P1 | required-now | activation ma csak `active_since` + `last_command_at` mezoket allit |
| CS4 | `src/v11/shared/start/startCommandFlows.ts` | resume flow | `runResumeStartFlow(input) -> Promise<ResumeStartResult>` | `resumed` state write | `resume` tovabbra is frissitheti az operatori/runtime activity surface-et, de nem irhatja at a canonical meta-review execution context authority mezoket | P1 | required-now | jelenleg `last_command_at` activity write authority-szivargast okozhat |
| CS5 | `src/core/runtime/watchdog.ts` | timeout reference | `computeWatchdogStatus(state, watchdogTimeoutMinutes, now?) -> WatchdogStatus` | meta-review timeout reference resolution | Meta-review scope-ban a watchdog reference/deadline a canonical execution contextet olvassa, nem `last_command_at ?? active_since` activity mezot | P1 | required-now | jelenlegi timeout authority mozgo activity timestamp |
| CS6 | `src/core/bubble/metaReview.ts` | active-window validation | `submitMetaReviewResult(input: MetaReviewSubmitInput, dependencies?: MetaReviewDependencies) -> Promise<MetaReviewSubmitResult>` es kapcsolodo active-window helper(ek) | submit validation path | A valid submit elfogadasa ugyanazt a rogzitett authority contextet olvassa, mint a watchdog; `resume` vagy mas activity nem hosszabbitja meg a submit ablakot | P1 | required-now | submit acceptance ma activity-timestamp driftre erzekeny |
| CS7 | `src/v11/shared/watchdog/watchdogMetaReviewRouting.ts` | meta-review expiry routing | `maybeRouteMetaReviewBeforeExpiry(...)` / `maybeRouteMetaReviewOnExpiry(...)` | `META_REVIEW_RUNNING` branch | Az expiry/non-expiry döntés ugyanabból a canonical authority contextből menjen, mint a submit; ne implicit activity timestamp driftből | P1 | required-now | timeout authority koherencia Phase 2 elofeltetele |
| CS8 | `docs/pairflow-initial-design.md` | lifecycle/spec sync | markdown | lifecycle/state semantics | A docs rogzitsek, hogy meta-review scope-ban az activity timestamp nem authority, es a contextet a handoff nyitja meg | P2 | required-now | state/protocol behavior valtozik |

### 2) Data and Interface Contract

| Contract | Current | Target | Required Fields | Optional Fields | Compatibility | Priority | Timing |
|---|---|---|---|---|---|---|---|
| Meta-review execution context state | implicit `active_since` / `last_command_at` / round kombinacio | explicit canonical context a stateben vagy vele ekvivalens persisted shape | `handoff_id`, `round`, `awaited_output_type=meta_review_result`, `started_at`, `deadline_at`, `attempt` | diagnostics vagy compatibility metadata | additive with compatibility adapter | P1 | required-now |
| Activation authority | handoff nyitas utan csak partial activity mezok frissulnek | activation egyetlen canonical contextet hoz letre ugyanarra a handoffra | `round`, `started_at`, `deadline_at`, `handoff_id` | legacy lifecycle state mezok | behavior tightening | P1 | required-now |
| Watchdog timeout input | `last_command_at ?? active_since` | canonical execution context deadline/reference | `deadline_at` vagy vele ekvivalens canonical timeout authority | runtime liveness notes | behavior change | P1 | required-now |
| Submit active-window validation | implicit time-window `active_since`/activity alapon | canonical context-window validacio | `round`, `handoff_id`, `started_at`, `deadline_at` | compatibility snapshot metadata | behavior tightening | P1 | required-now |
| Resume/restart mutation semantics | state activity update implicit authority drift lehetseges | activity update csak observability, nem context mutation | current lifecycle state, canonical execution context | operator diagnostics | behavior clarification | P1 | required-now |

Normative rules:
1. A canonical meta-review execution contextnek machine-readable formaban persistednek kell lennie; puszta szamitas `active_since` / `last_command_at` alapjan nem eleg.
2. `started_at` es `deadline_at` ugyanahhoz a `handoff_id`-hoz tartozzanak, es csak uj durable handoff nyithasson uj contextet.
3. `last_command_at` es mas activity mezok operatori/runtimeszintu observability mezok maradnak; timeout authoritykent nem hasznalhatok.
4. A submit es watchdog ugyanazt a persisted authority contextet kell olvassa; Phase 1-ben nem johet letre kulon submit-window es kulon watchdog-window modell.
5. Ha a legacy lifecycle state (`META_REVIEW_RUNNING`) megmarad, az csak compatibility/state label; a timeout es active-window authority ettol fuggetlenul az explicit contextbol szarmazik.
6. Ha a context persisted shape-je Phase 1-ben adapteres formaban kerul bevezetesre, az adapternek egyertelmuen ki kell mondania, mely mezok authorityk es melyek legacy/UX mezok.

### 3) Side Effects Contract

| Area | Allowed | Forbidden | Notes | Priority | Timing |
|---|---|---|---|---|---|
| Bubble state | explicit meta-review execution context persist es schema-validacio | activity timestamp fallback authority vagy implicit deadline-számítás tartós persisted context helyett | state contract valtozik, plan_ref kotelezo | P1 | required-now |
| Activation flow | canonical context letrehozasa handoff nyitasakor | activation utani runtime/operator muvelet altali context-atiras | handoff nyitas az egyetlen authority forras | P1 | required-now |
| Resume/restart | activity/liveness surface frissites | `started_at`, `deadline_at`, `handoff_id`, `attempt` authority mezo atirasa | explicit negative guard szukseges | P1 | required-now |
| Watchdog | canonical context alapjan timeout-ellenorzes | `last_command_at` vagy `active_since` meta-review authoritykent | Phase 1 kulcs viselkedesi valtas | P1 | required-now |
| Docs/spec | execution context authority dokumentalasa | hallgato docs drift a regi activity-alapu modellrol | state/protocol behavior valtozas miatt required | P2 | required-now |

Constraint: ha az implementation allowed side effect nelkul probalja a context authorityt helperben "csak kiszamitani", az nem eleg; Phase 1 persisted domain shape-et kovetel.

### 4) Error and Fallback Contract

| Trigger | Dependency (if any) | Behavior (`throw|result|fallback`) | Fallback Value/Action | Reason Code | Log Level | Priority | Timing |
|---|---|---|---|---|---|---|---|
| meta-review activation nem tud canonical contextet letrehozni | state write / transition | throw | no partial authority context persist | `META_REVIEW_EXECUTION_CONTEXT_INVALID` vagy normalized existing transition error | error | P1 | required-now |
| state snapshot hianyos/invalid execution contextet tartalmaz meta-review scope-ban | state schema | throw | invalid state reject; no fallback to `last_command_at`/`active_since` authority | schema validation error surface | error | P1 | required-now |
| watchdog vagy submit canonical context nelkul probalna active windowt ertelmezni | persisted state | throw | explicit invalid-state path; no activity timestamp fallback | `META_REVIEW_STATE_INVALID` vagy normalized watchdog/state reason | error | P1 | required-now |
| resume/restart invoked while canonical context aktiv | runtime/start orchestration | result | csak activity surface frissul; authority context valtozatlan marad | N/A | info | P1 | required-now |
| legacy state file nem hordozza meg az uj contextet migration boundary-n | compatibility adapter | fallback | explicit adapter path egyertelmuen normalizalja a contextet, vagy deterministic invalid-state error ha ez nem lehetseges | migration/validation warning or error | warn/error | P2 | required-now |
| docs/spec update elmaradna protocol/state valtozas mellett | docs sync | fallback | task nem tekintheto kesznek docs update nelkul | N/A | warn | P2 | required-now |

### 5) Dependency Constraints

| Type | Items | Priority | Timing |
|---|---|---|---|
| must-use | `plans/protocol-first-bubble-runtime-and-meta-review-unification-plan-v1.md` authority-first invariansai | P1 | required-now |
| must-use | jelenlegi bubble state schema/store mint canonical persisted domain source | P1 | required-now |
| must-use | a jelenlegi meta-review activation, submit es watchdog call-siteok, mint authority-konzisztencia felulet | P1 | required-now |
| must-use | explicit compatibility adapter ott, ahol legacy lifecycle state shape meg nem vezetheto ki Phase 1-ben | P1 | required-now |
| must-not-use | `last_command_at`, `active_since`, tmux heartbeat vagy session-rebind authoritykent | P1 | required-now |
| must-not-use | implicit "ha nincs context, szamoljuk ki activity alapjan" fallback | P1 | required-now |
| must-not-use | Phase 2 scope-ba tartozo notify/delivery route policy redesign | P1 | required-now |
| must-not-use | Phase 3-5 scope-ba tartozo generic actor CLI vagy lifecycle cleanup | P2 | required-now |

### 6) Test Matrix

| ID | Scenario | Given | When | Then | Priority | Timing | Evidence |
|---|---|---|---|---|---|---|---|
| T1 | activation creates canonical meta-review execution context | `RUNNING` bubble converges into meta-review handoff | activation staging runs | persisted state contains `handoff_id`, `round`, `awaited_output_type`, `started_at`, `deadline_at`, `attempt`, and they are schema-valid | P1 | required-now | automated test |
| T2 | resume does not mutate canonical context | active meta-review execution context exists | resume flow runs | `last_command_at` may advance, but `handoff_id`, `started_at`, `deadline_at`, `attempt` remain unchanged | P1 | required-now | automated test |
| T3 | watchdog reads canonical deadline instead of activity timestamp | active meta-review context exists, `last_command_at` advances later | watchdog computes status/expiry | timeout reference remains tied to canonical context, not the later activity timestamp | P1 | required-now | automated test |
| T4 | submit active-window validation uses canonical context | active meta-review context exists, runtime/operator activity advances after activation | valid submit arrives inside canonical authority window | submit is accepted based on canonical window, not on activity drift | P1 | required-now | automated test |
| T5 | post-deadline submit is rejected even if activity advanced | active meta-review context expired by canonical deadline, but `last_command_at` moved later | submit arrives after deadline | submit rejects with explicit invalid-state error; no activity fallback extends the window | P1 | required-now | automated test |
| T6 | invalid state without canonical context is rejected | lifecycle enters meta-review scope without valid persisted context | watchdog or submit path evaluates state | deterministic invalid-state/schema error occurs; no implicit reconstruction from activity fields | P1 | required-now | automated test |
| T7 | compatibility adapter remains deterministic | legacy-compatible state shape is loaded during migration boundary | schema normalization or read path runs | context authority is either deterministically materialized or explicitly rejected; no ambiguous mixed authority model remains | P2 | required-now | automated test |
| T8 | restart/rebind/runtime liveness cannot extend authority window | active meta-review context exists, runtime session changes occur | restart/rebind/liveness-related path runs | authority context remains unchanged, and timeout semantics still follow the original `deadline_at` | P2 | required-now | automated test |
| T9 | docs/spec parity | implementation updates merged | doc review | `docs/pairflow-initial-design.md` states that authority comes from persisted execution context, not activity timestamps | P2 | required-now | doc review |

### Acceptance Criteria

1. AC1: Meta-review scope-ban explicit persisted execution context authority jon letre `handoff_id`, `round`, `awaited_output_type`, `started_at`, `deadline_at`, `attempt` mezokkel.
2. AC2: `resume`, `restart`, tmux rebind, pane liveness es `last_command_at` nem tudja megvaltoztatni vagy meghosszabbitani a canonical meta-review authority contextet.
3. AC3: A watchdog timeout authority es a submit active-window validation ugyanazt a canonical persisted contextet olvassa.
4. AC4: Meta-review scope-ban nincs implicit activity-timestamp fallback authority.
5. AC5: A docs/spec egyertelmuen rogzitik az uj authority modellt.

### Acceptance Traceability

| AC | Primary Call Sites | Mandatory Tests |
|---|---|---|
| AC1 | CS1, CS2, CS3 | T1, T7 |
| AC2 | CS3, CS4 | T2, T8 |
| AC3 | CS5, CS6, CS7 | T3, T4, T5 |
| AC4 | CS2, CS5, CS6, CS7 | T5, T6, T7 |
| AC5 | CS8 | T9 |

## L2 - Implementation Notes (Optional)

1. [later-hardening] Phase 1-ben elfogadhato, ha az execution context eloszor a `meta_review` ala kerul persisted adapter-shape-ben, amennyiben a mezok authority statusza egyertelmu es Phase 3-ban tovabbemelheto generic `RUNNING` contextte.
2. [later-hardening] A watchdog es submit kozos context-resolver helper kialakitasa hasznos lehet, de csak ha nem rejti el az authority-mezok explicit persisted shape-jet.
3. [later-hardening] Phase 3-ban az execution context altalanositasakor erdemes a reviewer/implementer utakhoz ugyanazt a persisted shape-et hasznalni.

## Hardening Backlog (Optional)

| ID | Item | Layer | Priority | Timing | Source | Proposed Action |
|---|---|---|---|---|---|---|
| H1 | Generic execution-context abstraction minden actorra | L2 | P2 | later-hardening | plan phase boundary | Phase 3-ban emeljuk ki a meta-review-only shape-bol kozos `RUNNING` contextte |
| H2 | Dedicated migration helper legacy state fileshez | L2 | P2 | later-hardening | compatibility concern | Ha Phase 1 adapter tul zajos lenne, kulon migration/helper layerben tisztazzuk |

## Review Control

1. P1 regresszio, ha a task barmilyen formaban meghagyja a `last_command_at` vagy `active_since` authority fallbacket meta-review scope-ban.
2. P1 regresszio, ha `resume` vagy mas runtime activity ugyanahhoz a handoffhoz uj timeout authorityt tud generalni.
3. P1 regresszio, ha a submit es watchdog kulon active-window modellre epul.
4. A task nem csuszhat at Phase 2 notify/delivery decouplingba, Phase 3 generic runtime unificationba vagy kesobbi CLI cleanupba.
5. `contract_boundary_override=yes`, ezert a `plan_ref` kotelezo es az L1 state/interface contracttal osszhangban kell maradjon.

## Assumptions

1. Phase 1-ben elfogadhato a legacy `META_REVIEW_RUNNING` state nev megtartasa, ha a timeout authority mar explicit persisted contextre epul.
2. A canonical execution context persisted shape-je lehet Phase 1-ben meta-review-specifikus adapter, amennyiben a Phase 3 altalanositas nincs ezzel elzárva.

## Open Questions (Non-Blocking)

1. A canonical execution context persisted shape-je a `BubbleStateSnapshot` top-level mezoi koze keruljon-e, vagy a `meta_review` alatti explicit authority blokk legyen az atmeneti Phase 1 adapter?

## Spec Lock

Task `IMPLEMENTABLE`, ha:
1. a meta-review authority context explicit es persisted,
2. `resume`/activity timestamp nem tud authority windowt hosszabbitani,
3. a watchdog es submit ugyanazt a canonical contextet olvassa, es
4. a docs ezt a szemantikat egyertelmuen rogzitik.
