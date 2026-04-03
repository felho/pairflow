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
  - src/v11/shared/start/startCommandApi.ts
  - src/core/runtime/watchdog.ts
  - src/core/bubble/metaReview.ts
  - src/v11/shared/watchdog/watchdogMetaReviewRouting.ts
  - docs/pairflow-initial-design.md
  - tests/core/bubble/metaReview.test.ts
  - tests/core/bubble/watchdogBubble.test.ts
  - tests/core/runtime/restartRecovery.test.ts
  - tests/contracts/v11/metaReviewGate.contract.runner.ts
  - tests/contracts/v11/metaReviewSubmitCoverage.test.ts
  - tests/contracts/v11/restart.contract.runner.ts
  - tests/contracts/v11/resume.contract.runner.ts
  - tests/contracts/v11/watchdog.contract.runner.ts
  - tests/core/state/stateSchema.test.ts
prd_ref: null
plan_ref: plans/archive/plans/protocol-first-bubble-runtime-and-meta-review-unification-plan-v1.md
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

1. Tartos meta-review execution context schema bevezetese a bubble state `meta_review.execution_context` adapter-shape-jeben.
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
   - start/restart reattach authority-preservation contract,
   - watchdog timeout authority contract,
   - meta-review submit active-window validation contract,
   - operator/runtime lifecycle semantics `resume` es `restart` kozben.

### Normative Reference Policy

1. `plan_ref`: `plans/archive/plans/protocol-first-bubble-runtime-and-meta-review-unification-plan-v1.md`
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
6. `compatibility normalization` = csak migration boundary-n, explicit adapteren keresztul vegrehajtott canonicalizalas olyan durable state/handoff adatokbol, amelyek mar ugyanahhoz a canonical handoffhoz kothetok; ez nem jelenthet activity- vagy snapshot-alapu authority rekonstrukciot.

### Phase 1 Shape Decision

1. Phase 1 default persisted target shape-je `state.meta_review.execution_context`.
2. Ez egy dedikalt authority blokk legyen; a meglevő `meta_review.last_autonomous_*` mezok snapshot/report metadata szerepben maradnak, nem authority mezo-kent.
3. Aktiv meta-review context mellett `state.round` es `state.meta_review.execution_context.round` ugyanazt a canonical handoff-roundot kell jelentse.
4. Top-level generic `RUNNING` execution context bevezetese nem resze ennek a tasknak; az a plan szerinti Phase 3 scope.

## L1 - Change Contract

### 1) Call-site Matrix

| ID   | File                                                               | Function/Entry                 | Exact Signature (args -> return)                                                                                                                                        | Insertion Point                                                                       | Expected Behavior                                                                                                                                                                                                             | Priority | Timing       | Evidence                                                               |
| ---- | ------------------------------------------------------------------ | ------------------------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------- | ------------ | ---------------------------------------------------------------------- |
| CS1  | `src/types/bubble.ts`                                              | bubble state types             | `BubbleStateSnapshot` es kapcsolodo tipusok -> type definitions                                                                                                         | `BubbleMetaReviewSnapshotState` alatt                                                 | A bubble state tudjon explicit `meta_review.execution_context` authority blokkot serializalni ugy, hogy a required vs optional shape es a snapshot-vs-authority szetvalasztas egyertelmu legyen Phase 1 compatibility mellett | P1       | required-now | jelenleg nincs explicit `handoff_id` / `deadline_at` authority shape   |
| CS2  | `src/core/state/initialState.ts` + `src/core/state/stateSchema.ts` | state persistence + validation | `createInitialBubbleState(...) -> BubbleStateSnapshot`, `validateBubbleStateSnapshot(input) -> ValidationResult<BubbleStateSnapshot>`                                   | state defaulting es validation branch                                                 | A schema fogadja es ervenyesitse a canonical meta-review execution contextet; activity mezok ne helyettesithessek az authority contextet                                                                                      | P1       | required-now | jelenlegi schema `active_since` / `last_command_at` shape-re epit      |
| CS3  | `src/v11/shared/metaReviewGate/metaReviewGateStateStaging.ts`      | activation staging             | `stageMetaReviewRunningState(input) -> Promise<LoadedStateSnapshot>`                                                                                                    | `META_REVIEW_RUNNING` activation path                                                 | A meta-review handoff nyitasakor canonical execution context jon letre ugyanarra a roundra, rogzitett `started_at` es `deadline_at` authorityval                                                                              | P1       | required-now | activation ma csak `active_since` + `last_command_at` mezoket allit    |
| CS4  | `src/v11/shared/start/startCommandFlows.ts`                        | resume flow                    | `runResumeStartFlow(input) -> Promise<ResumeStartResult>`                                                                                                               | `resumed` state write                                                                 | `resume` tovabbra is frissitheti az operatori/runtime activity surface-et, de nem irhatja at a canonical meta-review execution context authority mezoket                                                                      | P1       | required-now | jelenleg `last_command_at` activity write authority-szivargast okozhat |
| CS4b | `src/v11/shared/start/startCommandApi.ts`                          | start/reattach orchestration   | `startBubble(input: StartBubbleInput, dependencies?: StartBubbleDependencies) -> Promise<StartBubbleResult>`                                                            | restart altal ujrahasznalt resume/reattach path                                       | Ha a bubble restart utan aktiv `META_REVIEW_RUNNING` allapotban attacholodik ujra, a flow legfeljebb observability/activity surface-et frissithet; canonical authority contextet nem mutalhat es nem nyithat uj handoffot     | P1       | required-now | restart szemantika ma a start/reattach uton ervenyesul                 |
| CS5  | `src/core/runtime/watchdog.ts`                                     | timeout reference              | `computeWatchdogStatus(state, watchdogTimeoutMinutes, now?) -> WatchdogStatus`                                                                                          | meta-review timeout reference resolution                                              | Meta-review scope-ban a watchdog reference/deadline a canonical execution contextet olvassa, nem `last_command_at ?? active_since` activity mezot                                                                             | P1       | required-now | jelenlegi timeout authority mozgo activity timestamp                   |
| CS6  | `src/core/bubble/metaReview.ts`                                    | active-window validation       | `submitMetaReviewResult(input: MetaReviewSubmitInput, dependencies?: MetaReviewDependencies) -> Promise<MetaReviewSubmitResult>` es kapcsolodo active-window helper(ek) | submit validation path                                                                | A valid submit elfogadasa ugyanazt a rogzitett authority contextet olvassa, mint a watchdog; `resume` vagy mas activity nem hosszabbitja meg a submit ablakot                                                                 | P1       | required-now | submit acceptance ma activity-timestamp driftre erzekeny               |
| CS7  | `src/v11/shared/watchdog/watchdogMetaReviewRouting.ts`             | meta-review expiry routing     | `maybeRouteMetaReviewBeforeExpiry(...)` / `maybeRouteMetaReviewOnExpiry(...)`                                                                                           | `META_REVIEW_RUNNING` branch                                                          | Az expiry/non-expiry döntés ugyanabból a canonical authority contextből menjen, mint a submit; ne implicit activity timestamp driftből                                                                                        | P1       | required-now | timeout authority koherencia Phase 2 elofeltetele                      |
| CS8  | `docs/pairflow-initial-design.md`                                  | lifecycle/spec sync            | markdown                                                                                                                                                                | `State Machine` meta-review lifecycle notes + `META_REVIEW_RUNNING handoff semantics` | A docs rogzitsek, hogy meta-review scope-ban az activity timestamp nem authority, a contextet a handoff nyitja meg, es Phase 1-ben ez a persisted authority blokk a `meta_review.execution_context` adapter-shape             | P2       | required-now | state/protocol behavior valtozik                                       |

### 2) Data and Interface Contract

| Contract                                | Current                                                        | Target                                                                                                               | Required Fields                                                                                         | Optional Fields                                                                                    | Compatibility                                                               | Priority | Timing       |
| --------------------------------------- | -------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------- | -------- | ------------ |
| Meta-review execution context state     | implicit `active_since` / `last_command_at` / round kombinacio | explicit `meta_review.execution_context` authority blokk                                                             | `handoff_id`, `round`, `awaited_output_type=meta_review_result`, `started_at`, `deadline_at`, `attempt` | diagnostics vagy compatibility metadata a `meta_review` alatt, de kulon az authority blokk mellett | additive nested adapter in `meta_review`; top-level generic context Phase 3 | P1       | required-now |
| Activation authority                    | handoff nyitas utan csak partial activity mezok frissulnek     | activation egyetlen canonical contextet hoz letre ugyanarra a handoffra                                              | `handoff_id`, `round`, `awaited_output_type=meta_review_result`, `started_at`, `deadline_at`, `attempt` | legacy lifecycle state mezok                                                                       | behavior tightening                                                         | P1       | required-now |
| Watchdog timeout input                  | `last_command_at ?? active_since`                              | canonical execution context deadline/reference                                                                       | `handoff_id`, `round`, `awaited_output_type=meta_review_result`, `started_at`, `deadline_at`, `attempt` | runtime liveness notes                                                                             | behavior change                                                             | P1       | required-now |
| Submit active-window validation         | implicit time-window `active_since`/activity alapon            | canonical context-window validacio                                                                                   | `handoff_id`, `round`, `awaited_output_type=meta_review_result`, `started_at`, `deadline_at`, `attempt` | compatibility snapshot metadata                                                                    | behavior tightening                                                         | P1       | required-now |
| Resume/restart mutation semantics       | state activity update implicit authority drift lehetseges      | activity update csak observability, nem context mutation                                                             | current lifecycle state, canonical execution context                                                    | operator diagnostics                                                                               | behavior clarification                                                      | P1       | required-now |
| Restart/reattach authority preservation | restart ujrainditja a runtime-ot es a start-pathot reuse-olja  | aktiv `META_REVIEW_RUNNING` allapotban a reattach nem nyithat uj authority contextet es nem tolhatja ki a deadline-t | current lifecycle state, canonical execution context                                                    | launch/runtime diagnostics                                                                         | behavior clarification                                                      | P1       | required-now |

Normative rules:

1. A canonical meta-review execution contextnek machine-readable formaban persistednek kell lennie; puszta szamitas `active_since` / `last_command_at` alapjan nem eleg.
2. `started_at` es `deadline_at` ugyanahhoz a `handoff_id`-hoz tartozzanak, es csak uj durable handoff nyithasson uj contextet.
3. `last_command_at` es mas activity mezok operatori/runtimeszintu observability mezok maradnak; timeout authoritykent nem hasznalhatok.
4. A submit es watchdog ugyanazt a persisted authority contextet kell olvassa; Phase 1-ben nem johet letre kulon submit-window es kulon watchdog-window modell.
5. Ha a legacy lifecycle state (`META_REVIEW_RUNNING`) megmarad, az csak compatibility/state label; a timeout es active-window authority ettol fuggetlenul az explicit contextbol szarmazik.
6. Ha a context persisted shape-je Phase 1-ben adapteres formaban kerul bevezetesre, az adapternek egyertelmuen ki kell mondania, mely mezok authorityk es melyek legacy/UX mezok.
7. Phase 1-ben a default adapter-home `state.meta_review.execution_context`; ennek Phase 3 elotti top-level generikalasa nem elvart.
8. `meta_review.last_autonomous_*` mezok nem hasznalhatok authority mezok helyettesitesere, es nem lehetnek a timeout/submit window forrasai.
9. Aktiv `META_REVIEW_RUNNING` allapotban a top-level `state.round` es az execution context `round` mezoje kozt barmilyen elteres invalid state-nek szamit.
10. Restart/reattach flow legfeljebb `last_command_at` observability frissitest vegezhet; ha authority mezohoz nyulna, az Phase 1 regresszio.
11. Compatibility adapter csak mar letezo durable handoff/state authority inputokbol normalizalhat canonical contextet; `last_command_at`, `active_since`, tmux/pane liveness vagy `meta_review.last_autonomous_*` snapshot metadata nem lehet normalization input.

### 3) Side Effects Contract

| Area                     | Allowed                                                            | Forbidden                                                                                              | Notes                                                                                 | Priority | Timing       |
| ------------------------ | ------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------- | -------- | ------------ |
| Bubble state             | explicit meta-review execution context persist es schema-validacio | activity timestamp fallback authority vagy implicit deadline-számítás tartós persisted context helyett | state contract valtozik, plan_ref kotelezo                                            | P1       | required-now |
| Activation flow          | canonical context letrehozasa handoff nyitasakor                   | activation utani runtime/operator muvelet altali context-atiras                                        | handoff nyitas az egyetlen authority forras; round-konzisztencia itt rogzul           | P1       | required-now |
| Resume/restart           | activity/liveness surface frissites                                | `started_at`, `deadline_at`, `handoff_id`, `attempt` authority mezo atirasa                            | explicit negative guard szukseges                                                     | P1       | required-now |
| Start/reattach path      | runtime session ownership es attach ujraepitese                    | restart utan implicit uj authority context nyitasa vagy a meglevo context deadline-jának atirasa       | restart a start-pathot reuse-olja, ezert kulon coverage kell                          | P1       | required-now |
| Watchdog timeout         | canonical context alapjan timeout-ellenorzes                       | `last_command_at` vagy `active_since` meta-review authoritykent                                        | Phase 1 kulcs viselkedesi valtas                                                      | P1       | required-now |
| Meta-review expiry route | canonical contextre epulo expiry/non-expiry routing                | route-dontes snapshot/activity drift vagy kulon routing-window alapjan                                 | a routing authority ugyanazt a contextet olvassa, mint a watchdog timeout es a submit | P1       | required-now |
| Docs/spec                | execution context authority dokumentalasa                          | hallgato docs drift a regi activity-alapu modellrol                                                    | state/protocol behavior valtozas miatt required                                       | P2       | required-now |

Constraint: ha az implementation allowed side effect nelkul probalja a context authorityt helperben "csak kiszamitani", az nem eleg; Phase 1 persisted domain shape-et kovetel.

### 4) Error and Fallback Contract

| Trigger                                                                                                                | Dependency (if any)               | Behavior           | Fallback Value/Action                                                                                                                                  | Reason Code                                                                           | Log Level  | Priority | Timing       |
| ---------------------------------------------------------------------------------------------------------------------- | --------------------------------- | ------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------- | ---------- | -------- | ------------ |
| meta-review activation nem tud canonical contextet letrehozni                                                          | state write / transition          | throw              | no partial authority context persist                                                                                                                   | `META_REVIEW_EXECUTION_CONTEXT_INVALID` vagy normalized existing transition error     | error      | P1       | required-now |
| state snapshot hianyos/invalid execution contextet tartalmaz meta-review scope-ban                                     | state schema                      | throw              | invalid state reject; no fallback to `last_command_at`/`active_since` authority                                                                        | schema validation error surface                                                       | error      | P1       | required-now |
| aktiv meta-review stateben a top-level round vagy a lifecycle scope nincs osszhangban a persisted execution contexttel | state schema / authority resolver | throw              | explicit invalid-state path; no silent normalization                                                                                                   | `META_REVIEW_EXECUTION_CONTEXT_MISMATCH` vagy normalized existing validation error    | error      | P1       | required-now |
| watchdog canonical context nelkul probalna active windowt ertelmezni                                                   | persisted state                   | throw              | explicit invalid-state path; no activity timestamp fallback                                                                                            | `META_REVIEW_STATE_INVALID` vagy normalized watchdog/state reason                     | error      | P1       | required-now |
| submit canonical context nelkul probalna active windowt ertelmezni                                                     | persisted state                   | explicit reject    | typed submit error; no route emission, no activity timestamp fallback                                                                                  | `META_REVIEW_STATE_INVALID` vagy normalized submit/state reason                       | error      | P1       | required-now |
| watchdog a `meta_review.last_autonomous_*` snapshotot probalja authoritykent felhasznalni                              | persisted snapshot metadata       | throw              | explicit invalid-state path; snapshot metadata nem helyettesitheti a canonical execution contextet                                                     | `META_REVIEW_STATE_INVALID` vagy normalized authority-resolution reason               | error      | P1       | required-now |
| submit a `meta_review.last_autonomous_*` snapshotot probalja authoritykent felhasznalni                                | persisted snapshot metadata       | explicit reject    | typed submit error; snapshot metadata nem helyettesitheti a canonical execution contextet, es nem route-olhato success-path handoffkent                | `META_REVIEW_STATE_INVALID` vagy normalized authority-resolution reason               | error      | P1       | required-now |
| resume/restart invoked while canonical context aktiv                                                                   | runtime/start orchestration       | result             | csak activity surface frissul; authority context valtozatlan marad                                                                                     | N/A                                                                                   | info       | P1       | required-now |
| restart/reattach path aktiv context mellett uj authority contextet probalna nyitni vagy deadline-t ujraszamolni        | start/reattach orchestration      | throw              | no synthesized replacement context; a persisted authority context marad ervenyben                                                                      | `META_REVIEW_EXECUTION_CONTEXT_MISMATCH` vagy normalized existing start/restart error | error      | P1       | required-now |
| legacy state file nem hordozza meg az uj contextet migration boundary-n                                                | compatibility adapter             | normalize or throw | explicit adapter path csak ugyanahhoz a handoffhoz kotheto durable state/handoff inputokbol normalizalhat; egyebkent deterministic invalid-state error | migration/validation warning or error                                                 | warn/error | P2       | required-now |
| docs/spec update elmaradna protocol/state valtozas mellett                                                             | docs sync                         | fallback           | task nem tekintheto kesznek docs update nelkul                                                                                                         | N/A                                                                                   | warn       | P2       | required-now |

Path-specific failure semantics:

1. `throw` itt typed invalid-state / validation / transition hibat jelent a state-, watchdog-, activation- es start/restart orchestration pathokon.
2. `explicit reject` itt typed submit-error visszaterest jelent a submit surface-en; ez nem route-olhato success-path handoff, es nem cserelheti le a canonical contextet.
3. Ugyanarra az authority-hibara a watchdog/state-resolver path nem adhat submit-style rejectet, es a submit path nem "sikeres, de warningos" route-ot.

### 5) Dependency Constraints

| Type         | Items                                                                                                                                                                 | Priority | Timing       |
| ------------ | --------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------- | ------------ |
| must-use     | `plans/archive/plans/protocol-first-bubble-runtime-and-meta-review-unification-plan-v1.md` authority-first invariansai                                                              | P1       | required-now |
| must-use     | jelenlegi bubble state schema/store mint canonical persisted domain source                                                                                            | P1       | required-now |
| must-use     | a meglevo `meta_review` namespace mint Phase 1 adapter-home az execution contexthez                                                                                   | P1       | required-now |
| must-use     | a jelenlegi meta-review activation, submit es watchdog call-siteok, mint authority-konzisztencia felulet                                                              | P1       | required-now |
| must-use     | explicit compatibility adapter ott, ahol legacy lifecycle state shape meg nem vezetheto ki Phase 1-ben; normalization csak durable handoff/state inputokbol tortenhet | P1       | required-now |
| must-not-use | `last_command_at`, `active_since`, tmux heartbeat vagy session-rebind authoritykent                                                                                   | P1       | required-now |
| must-not-use | `meta_review.last_autonomous_*` snapshot metadata authority- vagy normalization-inputkent                                                                             | P1       | required-now |
| must-not-use | implicit "ha nincs context, szamoljuk ki activity alapjan" fallback                                                                                                   | P1       | required-now |
| must-not-use | Phase 2 scope-ba tartozo notify/delivery route policy redesign                                                                                                        | P1       | required-now |
| must-not-use | Phase 3-5 scope-ba tartozo generic actor CLI vagy lifecycle cleanup                                                                                                   | P2       | required-now |

### 6) Test Matrix

| ID  | Scenario                                                                         | Given                                                                                                                                     | When                                                                                  | Then                                                                                                                                                                                                                      | Priority | Timing       | Evidence       |
| --- | -------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------- | ------------ | -------------- |
| T1  | activation creates canonical meta-review execution context                       | `RUNNING` bubble converges into meta-review handoff                                                                                       | activation staging runs                                                               | persisted state contains `meta_review.execution_context.{handoff_id, round, awaited_output_type, started_at, deadline_at, attempt}`, the block is schema-valid, and `state.round === meta_review.execution_context.round` | P1       | required-now | automated test |
| T2  | resume does not mutate canonical context                                         | active meta-review execution context exists                                                                                               | resume flow runs                                                                      | `last_command_at` may advance, but `handoff_id`, `round`, `awaited_output_type`, `started_at`, `deadline_at`, `attempt` remain unchanged                                                                                  | P1       | required-now | automated test |
| T3  | watchdog reads canonical deadline instead of activity timestamp                  | active meta-review context exists, `last_command_at` advances later                                                                       | watchdog computes status/expiry                                                       | timeout reference remains tied to canonical context, not the later activity timestamp                                                                                                                                     | P1       | required-now | automated test |
| T3b | expiry routing reads the same canonical authority context as watchdog and submit | active meta-review context exists, and expiry/non-expiry routing is evaluated before and after the canonical deadline                     | `maybeRouteMetaReviewBeforeExpiry(...)` vagy `maybeRouteMetaReviewOnExpiry(...)` runs | routing decision remains bound to the same `handoff_id`, `round`, `awaited_output_type`, `started_at`, `deadline_at`, `attempt` authority context, not activity drift or a separate routing-only window                   | P1       | required-now | automated test |
| T4  | submit active-window validation uses canonical context                           | active meta-review context exists, runtime/operator activity advances after activation                                                    | valid submit arrives inside canonical authority window                                | submit is accepted based on canonical window, not on activity drift                                                                                                                                                       | P1       | required-now | automated test |
| T4b | snapshot metadata cannot substitute for authority context                        | `meta_review.last_autonomous_*` snapshot metadata exists, but canonical execution context hianyzik vagy invalid                           | watchdog vagy submit path evaluates state                                             | watchdog/state path explicit invalid-state/schema errort dob, submit path typed submit-errorral rejectel; snapshot metadata nem lesz timeout vagy submit-window authority                                                 | P1       | required-now | automated test |
| T5  | post-deadline submit is rejected even if activity advanced                       | active meta-review context expired by canonical deadline, but `last_command_at` moved later                                               | submit arrives after deadline                                                         | submit typed submit-errorral rejectel; no activity fallback extends the window                                                                                                                                            | P1       | required-now | automated test |
| T6  | invalid state without canonical context is rejected                              | lifecycle enters meta-review scope without valid persisted context, or `state.round` disagrees with `meta_review.execution_context.round` | watchdog or submit path evaluates state                                               | watchdog/state path deterministic invalid-state/schema errort dob, submit path typed submit-errorral rejectel; nincs implicit reconstruction activity mezokbol es nincs silent round-normalization                        | P1       | required-now | automated test |
| T7  | compatibility adapter remains deterministic                                      | legacy-compatible state shape is loaded during migration boundary                                                                         | schema normalization or read path runs                                                | context authority is either deterministically materialized or explicitly rejected; no ambiguous mixed authority model remains                                                                                             | P2       | required-now | automated test |
| T8  | restart/reattach/runtime liveness cannot extend authority window                 | active meta-review context exists, runtime session changes occur                                                                          | restart/rebind/liveness-related path runs es a bubble ujraattacholodik                | `handoff_id`, `round`, `awaited_output_type`, `started_at`, `deadline_at`, `attempt` authority context unchanged marad, es a timeout semantics tovabbra is az eredeti `deadline_at`-ot koveti                             | P1       | required-now | automated test |
| T9  | docs/spec parity                                                                 | implementation updates merged                                                                                                             | doc review                                                                            | `docs/pairflow-initial-design.md` kimondja, hogy meta-review scope-ban az authority a persisted `meta_review.execution_context` adapter-shape-bol jon, nem activity timestamp mezokbol                                    | P2       | required-now | doc review     |

Verification note:

1. A mixed-path authority teszteknek (`T4b`, `T6`) kulon kell ellenorizniuk a watchdog/state-resolver `throw` surface-et es a submit `explicit reject` surface-et; a ket path nem moshato ossze egy kozos "hiba tortent" allitassa.
2. A routing/time-window teszteknek (`T3b`, `T8`) nem eleg csak azt nezniuk, hogy "nem timeoutolt"; assertalniuk kell, hogy a vizsgalt path ugyanazt a hat canonical authority mezot olvassa, es restart/reattach utan sem szintetizal uj contextet.

### Acceptance Criteria

1. AC1: Meta-review scope-ban explicit persisted execution context authority jon letre `meta_review.execution_context` alatt `handoff_id`, `round`, `awaited_output_type`, `started_at`, `deadline_at`, `attempt` mezokkel.
2. AC2: `resume`, `restart`, start/reattach, tmux rebind, pane liveness es `last_command_at` nem tudja megvaltoztatni vagy meghosszabbitani a canonical meta-review authority contextet.
3. AC3: A watchdog timeout authority es a submit active-window validation ugyanazt a canonical persisted contextet olvassa.
4. AC4: Meta-review scope-ban nincs implicit activity-timestamp fallback authority.
5. AC5: A docs/spec egyertelmuen rogzitik az uj authority modellt, beleertve hogy a Phase 1 persisted authority adapter-home `meta_review.execution_context`, es ez nem activity timestamp forras.

### Acceptance Traceability

| AC  | Primary Call Sites | Mandatory Tests |
| --- | ------------------ | --------------- |
| AC1 | CS1, CS2, CS3      | T1, T7          |
| AC2 | CS3, CS4, CS4b     | T2, T8          |
| AC3 | CS5, CS6, CS7      | T3, T3b, T4, T5 |
| AC4 | CS2, CS5, CS6, CS7 | T4b, T5, T6     |
| AC5 | CS8                | T9              |

## L2 - Implementation Notes (Optional)

1. [later-hardening] Phase 1-ben az execution context a `meta_review.execution_context` ala keruljon persisted adapter-shape-ben; ez a jelen task defaultja, es ugy kell kialakitani, hogy Phase 3-ban tovabbemelheto legyen generic `RUNNING` contextte.
2. [later-hardening] A watchdog es submit kozos context-resolver helper kialakitasa hasznos lehet, de csak ha nem rejti el az authority-mezok explicit persisted shape-jet.
3. [later-hardening] Phase 3-ban az execution context altalanositasakor erdemes a reviewer/implementer utakhoz ugyanazt a persisted shape-et hasznalni.

## Hardening Backlog (Optional)

| ID  | Item                                                 | Layer | Priority | Timing          | Source                | Proposed Action                                                                |
| --- | ---------------------------------------------------- | ----- | -------- | --------------- | --------------------- | ------------------------------------------------------------------------------ |
| H1  | Generic execution-context abstraction minden actorra | L2    | P2       | later-hardening | plan phase boundary   | Phase 3-ban emeljuk ki a meta-review-only shape-bol kozos `RUNNING` contextte  |
| H2  | Dedicated migration helper legacy state fileshez     | L2    | P2       | later-hardening | compatibility concern | Ha Phase 1 adapter tul zajos lenne, kulon migration/helper layerben tisztazzuk |

## Review Control

1. P1 regresszio, ha a task barmilyen formaban meghagyja a `last_command_at` vagy `active_since` authority fallbacket meta-review scope-ban.
2. P1 regresszio, ha `resume` vagy mas runtime activity ugyanahhoz a handoffhoz uj timeout authorityt tud generalni.
3. P1 regresszio, ha a submit es watchdog kulon active-window modellre epul.
4. A task nem csuszhat at Phase 2 notify/delivery decouplingba, Phase 3 generic runtime unificationba vagy kesobbi CLI cleanupba.
5. `contract_boundary_override=yes`, ezert a `plan_ref` kotelezo es az L1 state/interface contracttal osszhangban kell maradjon.
6. P1 regresszio, ha a task nyitva hagyja, hogy Phase 1 top-level generic `RUNNING` execution-context migraciova bovuljon; ez a plan szerint kesobbi fazis.
7. P1 regresszio, ha a task nem keri ki explicitten a `state.round === meta_review.execution_context.round` activation-time es invalid-state guard ervenyesiteset.
8. P1 regresszio, ha a `meta_review.last_autonomous_*` snapshot metadata authority-helyettesitokent visszaszivarog a timeout vagy submit ablakba.

## Assumptions

1. Phase 1-ben elfogadhato a legacy `META_REVIEW_RUNNING` state nev megtartasa, ha a timeout authority mar explicit persisted contextre epul.
2. A canonical execution context persisted shape-je Phase 1-ben meta-review-specifikus adapterkent a `meta_review.execution_context` alatt jelenik meg, es a Phase 3 altalanositas nincs ezzel elzarva.

## Open Questions (Non-Blocking)

1. None. A Phase 1 persisted shape defaultja `meta_review.execution_context`; ennek top-level generic formara emelese kesobbi fazis.

## Spec Lock

Task `IMPLEMENTABLE`, ha:

1. a meta-review authority context explicit es persisted,
2. `resume`/activity timestamp nem tud authority windowt hosszabbitani,
3. a watchdog es submit ugyanazt a canonical contextet olvassa, es
4. a docs ezt a szemantikat egyertelmuen rogzitik.
