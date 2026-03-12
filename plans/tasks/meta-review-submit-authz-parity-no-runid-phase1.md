---
artifact_type: task
artifact_id: task_meta_review_submit_authz_parity_no_runid_phase1_v1
title: "Meta-Review Submit Auth Parity + Watchdog Timeout Unification: No runId Gate (Phase 1)"
status: implementable
phase: phase1
target_files:
  - src/core/bubble/metaReview.ts
  - src/core/bubble/metaReviewGate.ts
  - src/core/bubble/watchdogBubble.ts
  - src/core/runtime/watchdog.ts
  - src/core/runtime/sessionsRegistry.ts
  - src/core/state/stateSchema.ts
  - src/core/state/initialState.ts
  - src/cli/commands/bubble/metaReview.ts
  - src/types/protocol.ts
  - src/types/bubble.ts
  - tests/core/bubble/metaReview.test.ts
  - tests/core/bubble/metaReviewGate.test.ts
  - tests/core/bubble/watchdogBubble.test.ts
  - tests/core/runtime/watchdog.test.ts
  - tests/core/runtime/sessionsRegistry.test.ts
  - tests/core/state/stateSchema.test.ts
  - tests/cli/bubbleMetaReviewCommand.test.ts
prd_ref: null
plan_ref: null
system_context_ref: docs/pairflow-initial-design.md
owners:
  - "felho"
---

# Task: Meta-Review Submit Auth Parity + Watchdog Timeout Unification: No runId Gate (Phase 1)

## L0 - Policy

### Goal

A meta-review submit engedélyezése pontosan ugyanarra a modellre álljon át, mint implementer/reviewer esetén: kizárólag lifecycle + ownership + round alapú döntés legyen, `runId`-alapú gate és `run_id`-kötelező read-model nélkül. Emellett a meta-review timeout-kezelés ne lokális gate wait/poll mechanizmus legyen, hanem a központi watchdog út kezelje.

### In Scope

1. Távolítsuk el a `runId`-t mint meta-review submit authorization/gating inputot.
2. `submitMetaReviewResult` ne olvasson és ne validáljon `metaReviewerPane.runId` mezőt.
3. A runtime pane binding auth szempontból csak `role` + `active` állapotot hordozzon; `runId` mezőt töröljük a binding szerződésből.
4. Duplikált submit kezelése maradjon determinisztikus CAS + state progression alapon, ne `runId`-egyezés alapján.
5. Vezessük ki a lokális gate-wait timeout/poll útvonalat (`awaitMetaReviewSubmission`) az autoritatív timeout-kezelésből.
6. A `META_REVIEW_RUNNING` timeout-detektálása a központi watchdogból történjen.
7. Watchdog timeout meta-review alatt determinisztikusan `META_REVIEW_FAILED` állapotot és human gate jelzést (`APPROVAL_REQUEST`) eredményezzen.
8. Vezessük ki a `last_autonomous_run_id`/`run_id` kötelezőséget a meta-review state/read-model szerződésből.
9. Tesztekkel zárjuk le, hogy rossz state/role/agent/round esetén továbbra is reject van, de `runId` hiánya vagy hiányzó `run_id` nem reject ok.
10. Takarítsuk ki a historikus, már nem használt submit-gate maradványokat (`deprecated` fallback hookok, marker/run identity maradványkötések az autoritatív útban).

### Out of Scope

1. Teljes meta-review domain redesign vagy új recommendation szemantika.
2. Implementer/reviewer flow átalakítása.

### Safety Defaults

1. Ha `META_REVIEW_RUNNING` alatt timeout történik, fail-safe út: `META_REVIEW_FAILED` + `APPROVAL_REQUEST` (nem néma hiba).
2. Nem autoritatív submit (rossz lifecycle/ownership/round) továbbra is determinisztikusan elutasítandó.
3. Canonical truth továbbra is state snapshot + canonical artifacts.

### Contract Boundary / Blast Radius

1. `contract_boundary_override`: `yes`
2. Érintett contractok:
   - belső auth/gating contract (`META_REVIEW_RUNNING` submit acceptance),
   - runtime session binding shape (`metaReviewerPane` auth-releváns mezők),
   - timeout/escalation contract (`META_REVIEW_RUNNING` -> `META_REVIEW_FAILED` + human gate),
   - meta-review state/read-model mezők (`last_autonomous_*` contract).

## Reviewer/Implementer Parity Comparison (Normative)

### Célállapot, ami implementer/reviewerrel azonos elv

1. Submit/auth only: `state + active_role + active_agent + round + CAS`.
2. Nincs session-level run identity gate.
3. Nincs run-token alapú dedup.

### Szándékos különbség, ami maradhat

1. Meta-review külön lifecycle szakaszban fut (`META_REVIEW_RUNNING`), míg pass/converged `RUNNING` állapotban dolgozik.
2. Timeout-kezelés központi watchdogból történik, de a meta-review timeout célállapota továbbra is meta-review-specifikus (`META_REVIEW_FAILED` + human gate).

### Historikus eltérés, amit ebben a taskban meg kell szüntetni

1. `metaReviewerPane.runId` mint auth gate.
2. `last_autonomous_run_id`/`run_id` kötelezőség a snapshot/read-model szerződésben.
3. Marker-era maradványok vagy `deprecated` fallback hookok, amelyek az autoritatív submit út viselkedését befolyásolhatják.
4. Gate-lokális timeout/poll várakozás, ami párhuzamos timeout-ownershipot tart fenn a központi watchdog mellett.

## L1 - Change Contract

### 1) Call-site Matrix

| ID | File | Function/Entry | Exact Signature (args -> return) | Insertion Point | Expected Behavior | Priority | Timing | Evidence |
|---|---|---|---|---|---|---|---|---|
| CS1 | `src/core/bubble/metaReview.ts` | `assertMetaReviewSubmitterOwnership` | `(input) -> Promise<void>` | submit auth validation branch | ownership check csak state+active role/agent + active pane state + round guard alapján; `metaReviewerPane.runId` nem létezik auth inputként | P1 | required-now | jelenleg explicit `runId` missing -> reject |
| CS2 | `src/core/bubble/metaReview.ts` | `submitMetaReviewResult` | `(input, deps?) -> Promise<MetaReviewRunResult>` | duplicate/acceptance path | duplikált submit védelem ne `runId`-egyezésre épüljön; konfliktus és már-rögzített submit detektálás state-alapon; output contract ne követeljen `run_id`-t | P1 | required-now | jelenleg `isDuplicateSubmitForGateRun` + `run_id` output |
| CS3 | `src/core/bubble/metaReviewGate.ts` | `applyMetaReviewGateOnConvergence` | `(input, deps?) -> Promise<MetaReviewGateResult>` | pane bind start/stop path | pane bindinghez ne kelljen gate run identity auth célra; start/stop csak active ownership állapotot kezeljen | P1 | required-now | jelenleg `setMetaReviewerPane(... runId: submitRunId)` |
| CS4 | `src/core/bubble/metaReviewGate.ts` | `applyMetaReviewGateOnConvergence` + deps | `(input, deps?) -> Promise<MetaReviewGateResult>` | timeout ownership | gate ne végezzen saját wait/poll timeoutot; timeout ownership a watchdog úté legyen | P1 | required-now | jelenleg lokális await timeout ág is van |
| CS5 | `src/core/runtime/sessionsRegistry.ts` | meta reviewer pane schema/normalization | existing APIs | `metaReviewerPane` normalization | schema ne tartalmazzon `runId` mezőt; auth-critical útban csak role+active | P1 | required-now | jelenleg runId normalization és típuskényszer |
| CS6 | `src/core/state/stateSchema.ts` + `src/types/bubble.ts` | meta-review snapshot schema/types | validators and types | `last_autonomous_*` contract | `last_autonomous_run_id` kivezetése; status/recommendation set esetén ne legyen kötelező run-id | P1 | required-now | jelenleg hard-required |
| CS7 | `src/cli/commands/bubble/metaReview.ts` + `src/types/protocol.ts` | CLI/protocol view contract | status/submit output formatting + payload typing | user-facing and machine-facing output | run-id ne legyen kötelező output mező, parity reviewer/implementer trace modellel | P1 | required-now | jelenleg "Run id" megjelenik |
| CS8 | `src/core/bubble/metaReviewGate.ts` | dependency contract cleanup | deps interface | gate deps shape | `deprecated` `runMetaReview`/`metaReviewDependencies` compat hookok eltávolítása ebben a parity taskban | P1 | required-now | historikus fallback |
| CS9 | `src/core/runtime/watchdog.ts` | `computeWatchdogStatus` | `(state, timeoutMinutes, now?) -> WatchdogStatus` | monitored-state policy | `META_REVIEW_RUNNING` állapotot a watchdog monitorozza timeout célra | P1 | required-now | jelenleg non-agent monitored kivétel |
| CS10 | `src/core/bubble/watchdogBubble.ts` | `runBubbleWatchdog` | `(input, deps?) -> Promise<BubbleWatchdogResult>` | expiry escalation route | meta-review timeout esetén route: `META_REVIEW_FAILED` + `APPROVAL_REQUEST` (human gate), nem néma állapotváltás | P1 | required-now | jelenleg generic RUNNING->WAITING_HUMAN út |
| CS11 | `tests/core/bubble/metaReview.test.ts` | submit auth tests | vitest | metaReview submit suite | legyen explicit teszt: active ownership mellett `runId` nélküli runtime bindinggel és run-id nélküli snapshot contracttal is elfogadható submit | P1 | required-now | regression target |
| CS12 | `tests/core/bubble/metaReviewGate.test.ts` | gate tests | vitest | gate convergence suite | gate működés marad determinisztikus runId gate nélkül, és nem ő birtokolja a timeout mechanizmust | P1 | required-now | regression target |
| CS13 | `tests/core/bubble/watchdogBubble.test.ts` | watchdog escalation tests | vitest | meta-review timeout suite | `META_REVIEW_RUNNING` timeout -> `META_REVIEW_FAILED` + `APPROVAL_REQUEST` | P1 | required-now | regression target |
| CS14 | `tests/core/runtime/watchdog.test.ts` | watchdog monitor tests | vitest | watchdog status suite | `META_REVIEW_RUNNING` monitorozott legyen timeout számítással | P1 | required-now | regression target |
| CS15 | `tests/core/runtime/sessionsRegistry.test.ts` + `tests/core/state/stateSchema.test.ts` + `tests/cli/bubbleMetaReviewCommand.test.ts` | schema/CLI tests | vitest | parity suites | `runId`/`run_id` dependency nélküli contract lock | P1 | required-now | schema + CLI lock |

### 2) Data and Interface Contract

| Contract | Current | Target | Required Fields | Optional Fields | Compatibility | Priority | Timing |
|---|---|---|---|---|---|---|---|
| Submit authorization tuple | state+agent+active pane + pane `runId` | state+agent+active pane + round (no runId gate) | `state= META_REVIEW_RUNNING`, `active_role=meta_reviewer`, `active_agent`, `round` match | diagnostics | behavior change | P1 | required-now |
| Runtime pane binding | includes `runId` used by submit auth | no `runId` field in binding contract | `role`, `active` | `updatedAt` | behavior change | P1 | required-now |
| Snapshot contract | status/recommendation set => `last_autonomous_run_id` required | run-id free snapshot contract | status, recommendation, summary/report_ref, updated_at | rework target | behavior change | P1 | required-now |
| Duplicate submit protection | `runId` equality check | CAS/state-based single-accept rule | expected fingerprint/state, deterministic reject reason | optional diagnostics | behavior change | P1 | required-now |
| Timeout ownership | gate-local wait/poll timeout (`awaitMetaReviewSubmission`) | central watchdog timeout ownership | watchdog expiry route for `META_REVIEW_RUNNING` | diagnostics | behavior change | P1 | required-now |
| Timeout escalation contract | timeout may remain local gate failure path | timeout -> `META_REVIEW_FAILED` + `APPROVAL_REQUEST` | human gate signal + state transition | recommendation metadata | behavior change | P1 | required-now |

### 3) Side Effects Contract

| Area | Allowed | Forbidden | Notes | Priority | Timing |
|---|---|---|---|---|---|
| Bubble state | CAS-based snapshot update and conflict handling | blind overwrite | first accepted submit remains canonical | P1 | required-now |
| Runtime sessions | active pane binding management | `runId` field and any `runId`-based authorization decisions | runtime sessions are transport/ownership hints only | P1 | required-now |
| Timeout escalation | watchdog-driven `META_REVIEW_RUNNING` expiry route | gate-local timeout ownership ambiguity | meta-review timeout routing legyen egyértelműen központi | P1 | required-now |
| Artifacts | canonical `meta-review-last.md/.json` write | non-canonical decision source | unchanged canonical persistence | P1 | required-now |

### 4) Error and Fallback Contract

| Trigger | Dependency (if any) | Behavior (`throw|result|fallback`) | Fallback Value/Action | Reason Code | Log Level | Priority | Timing |
|---|---|---|---|---|---|---|---|
| submit wrong lifecycle (`!= META_REVIEW_RUNNING`) | state machine | throw | reject, no mutation | META_REVIEW_STATE_INVALID | warn | P1 | required-now |
| submit sender mismatch (active role/agent mismatch) | ownership tuple | throw | reject, no mutation | META_REVIEW_SENDER_MISMATCH | warn | P1 | required-now |
| submit round mismatch | round binding | throw | reject, no mutation | META_REVIEW_ROUND_MISMATCH | warn | P1 | required-now |
| duplicate submit race | state store CAS | throw/result | deterministic reject (already submitted/conflict) | META_REVIEW_STATE_INVALID or conflict-mapped code | warn | P1 | required-now |
| timeout while `META_REVIEW_RUNNING` | central watchdog | fallback | `META_REVIEW_FAILED` + `APPROVAL_REQUEST` human gate | META_REVIEW_GATE_RUN_FAILED (or watchdog-mapped equivalent) | warn | P1 | required-now |

### 5) Dependency Constraints

| Type | Items | Priority | Timing |
|---|---|---|---|
| must-use | `readStateSnapshot` + `writeStateSnapshot` CAS semantics | P1 | required-now |
| must-use | active role ownership invariants (`META_REVIEW_RUNNING` + `meta_reviewer` + `active_agent` + `round`) | P1 | required-now |
| must-use | central watchdog timeout path for meta-review lifecycle (`META_REVIEW_RUNNING`) | P1 | required-now |
| must-not-use | `metaReviewerPane.runId` as submit authorization gate | P1 | required-now |
| must-not-use | `run_id`/`last_autonomous_run_id` mint kötelező canonical mező | P1 | required-now |
| must-not-use | duplicate-submit reject keyed solely by gate run identity | P1 | required-now |
| must-not-use | any gate routing decision that requires pane-bound run identity | P1 | required-now |
| must-not-use | deprecated/historical fallback hook (`runMetaReview`, marker-era compat) az autoritatív submit útban | P1 | required-now |
| must-not-use | gate-local timeout polling mint elsődleges timeout ownership (`awaitMetaReviewSubmission` autoritatív timeoutként) | P1 | required-now |

### 6) Test Matrix

| ID | Scenario | Given | When | Then | Priority | Timing | Evidence |
|---|---|---|---|---|---|---|---|
| T1 | Submit success without pane runId field | `META_REVIEW_RUNNING`, active meta-review ownership, pane active | valid `submit` | accepted, snapshot+artifacts updated | P1 | required-now | `tests/core/bubble/metaReview.test.ts` |
| T2 | Reject wrong round | valid ownership, mismatched round | submit | `META_REVIEW_ROUND_MISMATCH`, no mutation | P1 | required-now | `tests/core/bubble/metaReview.test.ts` |
| T3 | Reject wrong sender/role | invalid ownership tuple | submit | `META_REVIEW_SENDER_MISMATCH`, no mutation | P1 | required-now | `tests/core/bubble/metaReview.test.ts` |
| T4 | Duplicate submit race | same bubble/round, two near-simultaneous submits | submit twice | exactly one canonical accept, second deterministic reject | P1 | required-now | `tests/core/bubble/metaReview.test.ts` |
| T5 | Meta-review timeout watchdog ownership | bubble `META_REVIEW_RUNNING` | watchdog cycle reaches timeout | timeout route watchdogból fut, nem gate-local waitből | P1 | required-now | `tests/core/runtime/watchdog.test.ts` + `tests/core/bubble/metaReviewGate.test.ts` |
| T6 | Sessions schema parity | runtime session with active meta-review pane and no runId field in schema | validate/read | valid state, no auth dependency on run identity | P1 | required-now | `tests/core/runtime/sessionsRegistry.test.ts` |
| T7 | State schema parity | snapshot with status/recommendation set and no `last_autonomous_run_id` | validate/read status | valid | P1 | required-now | `tests/core/state/stateSchema.test.ts` |
| T8 | CLI submit/status parity | user runs submit/status in valid state | submit and status command | success path unchanged without runId/run_id dependency | P1 | required-now | `tests/cli/bubbleMetaReviewCommand.test.ts` |
| T9 | No deprecated fallback path | gate wiring in convergence path | run gate path | no `deprecated` compat hook usage on authoritative path | P1 | required-now | `tests/core/bubble/metaReviewGate.test.ts` |
| T10 | Meta-review watchdog escalation route | `META_REVIEW_RUNNING` timeout + no submit | watchdog escalation | state `META_REVIEW_FAILED` és transcriptben `APPROVAL_REQUEST` jelenik meg | P1 | required-now | `tests/core/bubble/watchdogBubble.test.ts` |
| T11 | No silent timeout failure | meta-review timeout branch | watchdog path executed | human gate jelzés kötelező; nincs „csak state change” | P1 | required-now | `tests/core/bubble/watchdogBubble.test.ts` |

## Acceptance Criteria (Binary)

1. AC1: Meta-review submit authorization pathban nincs `runId`-alapú gate (`runId` hiánya nem önálló reject ok).
2. AC2: Elfogadás kizárólag lifecycle + ownership + round invariánsokra épül.
3. AC3: `last_autonomous_run_id`/`run_id` nem kötelező canonical mező.
4. AC4: Duplikált submit kezelés determinisztikus marad `runId` nélkül is.
5. AC5: Meta-review timeout ownership központi watchdogon van (nem gate-local poll timeouton).
6. AC6: Nincs regresszió a canonical state/artifact persistenciában.
7. AC7: Autoritatív submit útból a historikus `deprecated` fallback hookok ki vannak vezetve.
8. AC8: Meta-review timeout esetén kötelező route: `META_REVIEW_FAILED` + `APPROVAL_REQUEST` (nincs néma hiba).

## L2 - Implementation Notes (Optional)

1. [later-hardening] Add explicit metric: submit rejects by reason code after parity cutover.

## Hardening Backlog (Optional)

| ID | Item | Layer | Priority | Timing | Source | Proposed Action |
|---|---|---|---|---|---|---|
| H1 | Meta-review state/read-model simplification after parity (field minimization beyond v1 contract) | L2 | P3 | later-hardening | follow-up cleanup | separate cleanup task |

## Review Control

1. P1 finding, ha bármely auth-releváns úton `runId` hiány miatt reject történik valid ownership+round mellett.
2. P1 finding, ha bármely submit acceptance döntés `metaReviewerPane.runId` értékétől függ.
3. P1 finding, ha duplikált submit kezelés nondeterminisztikus lesz.
4. P1 finding, ha `last_autonomous_run_id`/`run_id` továbbra is kötelező mező marad a canonical contractban.
5. P1 finding, ha az autoritatív submit út `deprecated` fallback wiringre támaszkodik.
6. P1 finding, ha meta-review timeout esetén nincs `APPROVAL_REQUEST` human gate jelzés.
7. P1 finding, ha meta-review timeout kezelés továbbra is gate-local polling ownershipon múlik.

## Assumptions

1. Az implementer/reviewer parity itt az authorization + canonical snapshot contract szintre értendő.
2. Timeout ownership parity cél: meta-review timeout kezelése is központi watchdogból történjen.

## Open Questions (Non-Blocking)

1. Nincs.

## Spec Lock

Task `IMPLEMENTABLE`, ha AC1-AC8 teljesül, T1-T11 zöld, és a meta-review submit authorization útból a `runId` mint gate, valamint a canonical szerződésből a kötelező `run_id` maradvány teljesen kikerül, továbbá meta-review timeoutnál a watchdog-alapú `META_REVIEW_FAILED` + `APPROVAL_REQUEST` route érvényesül.
