---
artifact_type: task
artifact_id: task_converged_advisory_findings_reviewer_guidance_rollout_phase1_v1
title: "Converged Advisory Findings Reviewer Guidance and Rollout (Phase 1)"
status: draft
phase: phase1
target_files:
  - src/core/runtime/reviewerCommandGateGuidance.ts
  - src/core/runtime/tmuxDelivery.ts
  - tests/core/runtime/reviewerCommandGateGuidance.test.ts
  - tests/core/runtime/tmuxDelivery.test.ts
  - docs/reviewer-severity-ontology.md
  - docs/reviewer-pass-converged-issue-assessment-2026-03-21.md
  - plans/converged-advisory-findings-contract-plan-v1.md
  - tests/contracts/v11/converged.contract.test.ts
  - tests/contracts/v11/cases/converged/converged-document-v11.case.json
  - tests/contracts/v11/cases/converged/converged-document-parity.case.json
prd_ref: null
plan_ref: plans/converged-advisory-findings-contract-plan-v1.md
system_context_ref: docs/pairflow-initial-design.md
owners:
  - "felho"
---

# Task: Converged Advisory Findings Reviewer Guidance and Rollout (Phase 1)

## L0 - Policy

### Goal

Zarjuk le a reviewer guidance + rollout oldali Phase 1 nyitott pontokat ugy, hogy:
1. reviewer oldalon egyertelmu legyen a command routing (`pass --finding` vs `converged --finding`),
2. a docs es runtime guidance szovegek ne mondjanak egymasnak ellent,
3. az in-flight bubble rollout policy operativan vegrehajthato es ellenorizheto legyen,
4. contract szintu tesztlefedettseg igazolja, hogy a guidance/rollout contract valtozas nem tor regressziot.

### In Scope

1. WP4 scope lock:
   - reviewer runtime guidance copy update (`reviewerCommandGateGuidance`, `tmuxDelivery`),
   - docs alignment (`reviewer-severity-ontology`, `reviewer-pass-converged-issue-assessment`),
   - rollout policy konkretizalas a plan dokumentumban (in-flight strategy + grace period).
2. WP5-bol csak a Task 3-hoz tartozo contract regression coverage:
   - converged contract tesztek es kapcsolodo case fixture-ek frissitese.
3. Task-level readiness explicit gate-jeinek leirasa (review control + spec lock).

### Out of Scope

1. WP1-WP3 funkcionalis implementacio (CLI parser, flow contract, approval/parity pipeline).
2. Uj protocol/schema mezok bevezetese.
3. Meta-review recommendation policy redesign.
4. Barmilyen uj funkcionalis scope a jovahagyott planen tul.

### Safety Defaults

1. Reviewer guidance nem lehet ketertelmu: blocker -> `pass --finding`, advisory -> `converged --finding (P2/P3)`, clean -> `converged` finding nelkul.
2. "summary-only finding allitas" tiltott minta minden guidance feluleten explicit marad.
3. In-flight bubble kezeles kickoff-time contract-verziohoz kotott, es `RSC-T3-WP4` rollout sign-off checklist gate nelkul nem zarhato.
4. Ha contract-case coverage nem tukrozi a guidance/rollout contractot, rollout Phase 1 nem zarhato.

### Contract Boundary / Blast Radius

1. `contract_boundary_override`: `yes`
2. Erintett contractok:
   - reviewer runtime guidance contract
   - docs policy contract (severity ontology + issue assessment)
   - rollout operational contract (in-flight vs new bubble policy)
   - converged contract test fixture contract

### Dependency

1. Task 3 csak Task 1 + Task 2 stabil contractjara epulhet.
2. Task 3 nem irhatja felul Task 1/2 normativ donteseit, csak operationalizalja es dokumentalja azokat.

## L1 - Change Contract

### 1) Call-site Matrix

| ID | File | Function/Entry | Exact Signature (args -> return) | Insertion Point | Expected Behavior | Priority | Timing | Evidence |
|---|---|---|---|---|---|---|---|---|
| CS1 | `src/core/runtime/reviewerCommandGateGuidance.ts` | reviewer guidance text builders | existing text builder signatures -> `string` | reviewer command gate guidance copy | explicit routing matrix + P2/P3-only converged guidance | P1 | required-now | T1 |
| CS2 | `src/core/runtime/tmuxDelivery.ts` | reviewer-facing delivery snippets | existing delivery builder signatures -> delivery payload | tmux reviewer instruction blocks | copy-paste command examples + tiltott minta figyelmeztetes | P1 | required-now | T2 |
| CS3 | `docs/reviewer-severity-ontology.md` | policy sections | document update | command mapping + terminology sections | guidance nyelvezet teljes osszhangban Task 1/2 contracttal | P1 | required-now | T3 |
| CS4 | `docs/reviewer-pass-converged-issue-assessment-2026-03-21.md` | baseline/resolution record | document update | historical inconsistency tracking | pre-existing mismatch historical baseline-kent jelolve, aktualis policy egyertelmu | P2 | required-now | T3 |
| CS5 | `plans/converged-advisory-findings-contract-plan-v1.md` | `Forward Contract Strategy` + rollout policy | document update | in-flight transition section | kickoff-version pinning + grace-period policy operational wordinggel | P1 | required-now | T4 |
| CS6 | `tests/contracts/v11/converged.contract.test.ts` | contract scenario matrix | existing runner signatures | converged advisory scenario assertions | guidance/rollout policyvel osszhangos contract assertions | P1 | required-now | T5 |
| CS7 | `tests/contracts/v11/cases/converged/*.json` | fixture data | schema-compatible fixture update | parity-oriented document fixtures | advisory guidance es in-flight policy edge case-ek explicit fixtureben | P1 | required-now | T6 |

Traceability lock (required-now):
1. `CS5 -> T4` (rollout policy completeness review).
2. `CS6 -> T5` (contract scenario assertion ownership).
3. `CS7 -> T6` (parity-oriented fixture ownership).
4. `T5` es `T6` intent nem fedhet at: `T5` assertion-level, `T6` fixture-level parity coverage.
5. `T7` nem call-site ownership teszt; review-control ownershipa a `Review Control` #3 checkpoint.

### 2) Data and Interface Contract

| Contract | Current | Target | Required Fields | Optional Fields | Compatibility | Priority | Timing |
|---|---|---|---|---|---|---|---|
| Reviewer guidance text contract | mixed wording surfaces | single-source aligned wording | command routing rules + forbidden patterns | copy-paste examples | additive | P1 | required-now |
| Rollout operational contract | high-level forward-only note | executable in-flight strategy | kickoff-time contract version rule + grace-period gate | operational window length | process-level tightening | P1 | required-now |
| Contract regression coverage | partial advisory awareness | guidance+rollout aware scenario matrix | converged contract assertions for advisory path | diagnostics detail | additive | P1 | required-now |

Normative wording rules:
1. Guidanceben `converged --finding` alatt csak `P2/P3` peldak szerepelhetnek.
2. Guidance explicit tiltja:
   - summary-only finding allitas structured payload nelkul,
   - "clean/no findings" allitas structured findings mellett.
3. In-flight policy normativ mondata: kickoffkor rogzitett contract-verzio iranyado bubble-closeig.
4. Grace period policy normativ mondata: idoben korlatozott atmeneti ablak utan minden uj rollout sign-off csak `advisory_v1` policyvel engedheto.

### 3) Side Effects Contract

| Area | Allowed | Forbidden | Notes | Priority | Timing |
|---|---|---|---|---|---|
| Runtime guidance copy | command szovegek/peldak frissitese | ellentmondo command tanacs | reviewer first-try success cel | P1 | required-now |
| Docs policy | ontology + issue assessment + plan rollout policy frissites | Task 1/2 contract rewrite vagy scope-bovites | docs a lockolt contractot operationalizalja | P1 | required-now |
| Contract tests | converged contract assertions + fixtures frissitese | docs update tesztlekovetes nelkul | release confidence gate | P1 | required-now |

Constraint:
1. Guidance update nem vezethet vissza `--advisory-finding` terminologiara.
2. Task 3 nem vezethet be uj parser/protocol ownershipot (az Task 1/2 terulete).

### 4) Error and Fallback Contract

| Trigger | Dependency (if any) | Behavior (`throw|result|fallback`) | Fallback Value/Action | Reason Code | Log Level | Priority | Timing |
|---|---|---|---|---|---|---|---|
| guidance wording drift runtime vs docs | `plans/tasks/03-converged-advisory-findings-reviewer-guidance-and-rollout-phase1.md`: Test Matrix `T1-T3` + Review Control #4 | result | release checklist blokkolas | `CONVERGED_GUIDANCE_CONTRACT_DRIFT` | warn | P1 | required-now |
| in-flight rule hianyzik rollout policybol | `RSC-T3-WP4` (RC1, RC2) | result | status marad `draft`, no rollout sign-off | `CONVERGED_INFLIGHT_POLICY_MISSING` | warn | P1 | required-now |
| grace-period gate nincs expliciten dokumentalva | `RSC-T3-WP4` (RC1, RC2) | result | status marad `draft`, policy update required | `CONVERGED_GRACE_PERIOD_POLICY_MISSING` | warn | P1 | required-now |
| contract fixture nincs osszhangban guidance policyval | `tests/contracts/v11/converged.contract.test.ts` + `tests/contracts/v11/cases/converged/*.json` (`CS6`, `CS7`) | throw | CI contract test fail | `CONVERGED_CONTRACT_CASE_OUTDATED` | error | P1 | required-now |
| terminology drift (`--advisory-finding` visszacsuszas) | `plans/tasks/03-converged-advisory-findings-reviewer-guidance-and-rollout-phase1.md`: Test Matrix `T3` + Review Control #4 | result | blocker jelzes reviewon | `CONVERGED_TERMINOLOGY_DRIFT` | warn | P1 | required-now |

Verification boundary note:
1. Task 3 enforcement mechanizmusai review/contract gate alapuak (T1-T7), nem uj runtime guardok.
2. Rollout policy enforcement ebben a taskban dokumentacios + sign-off gate formaju; runtime enforcement ownership Task 1/2 scope-on kivul marad.

### 5) Dependency Constraints

| Type | Items | Priority | Timing |
|---|---|---|---|
| must-use | Task 1/2 approved contract decisions | P1 | required-now |
| must-use | converged contract tests as rollout confidence gate | P1 | required-now |
| must-use | plan `Forward Contract Strategy` in-flight policy wording | P1 | required-now |
| must-use | `RSC-T3-WP4` checklist gate for rollout sign-off | P1 | required-now |
| must-not-use | docs-only "assume works" release claim contract regression evidence nelkul | P1 | required-now |
| must-not-use | mixed terminology (`--advisory-finding`) a decision lock utan | P1 | required-now |
| must-not-use | uj funkcionalis parser/protocol elvaras a Task 3 specben | P1 | required-now |

### 6) Test Matrix

| ID | Scenario | Given | When | Then | Priority | Timing | Evidence |
|---|---|---|---|---|---|---|---|
| T1 | runtime guidance routing | reviewer guidance render path | guidance text build fut | blocker/advisory/clean routing explicit es nem ellentmondo | P1 | required-now | automated test |
| T2 | tmux reviewer snippet correctness | reviewer delivery event | tmux message build fut | copy-paste command mintak policy-konformak | P1 | required-now | automated test |
| T3 | docs terminology + assessment alignment | ontology + issue assessment docs | docs review fut | terminology drift nincs, es issue-assessment baseline/resolution policy-konform | P1 | required-now | doc review |
| T4 | rollout policy completeness | plan rollout sections | policy review fut | kickoff-version + grace period explicit, operativ nyelvezettel | P1 | required-now | doc review |
| T5 | contract scenario assertion coverage | converged advisory scenario definitions (`CS6`) | contract test fut | advisory converged path assertion-level policy coverage zold | P1 | required-now | automated contract test |
| T6 | parity fixture coverage | converged parity fixtures (`CS7`) | contract test fut | parity-oriented fixtureek policyval osszhangban maradnak | P1 | required-now | automated contract test |
| T7 | no hidden scope expansion | Task 3 change set | review control fut | WP1-WP3-hoz tartozo uj funkcionalis igeny nem kerult be | P1 | required-now | review checklist |

## L2 - Implementation Notes (Optional)

1. [later-hardening] Kulon rollout runbook (`docs/rollout/converged-advisory-v1.md`) keszitese ops handoffhoz.
2. [later-hardening] Terminology drift auto-check script/check CI-ben.

## Hardening Backlog (Optional)

| ID | Item | Layer | Priority | Timing | Source | Proposed Action |
|---|---|---|---|---|---|---|
| HB1 | rollout runbook extraction | L2 | P3 | later-hardening | ops process | create docs/rollout/converged-advisory-v1.md |
| HB2 | wording drift automation | L2 | P3 | later-hardening | maintenance | add script/check in CI |

## Review Control

1. Kotelezo coverage: T1, T2, T5, T6.
2. T3-T4 legalabb review evidence szinten kotelezo rollout sign-off elott.
3. T7 kotelezo checklist item: nincs WP1-WP3 scope-bovites a Task 3 specben.
4. Task 3 csak akkor zarhato, ha terminology drift (`--advisory-finding`) nulla az erintett guidance/docs feluleteken.

Rollout Sign-off Checklist (`RSC-T3-WP4`):
1. `RC1` - Target artifact: `plans/converged-advisory-findings-contract-plan-v1.md`, section `Forward Contract Strategy`; kotelezo tartalom: kickoff-version pinning + grace period policy explicit.
2. `RC2` - Target checkpoint: jelen task file `Call-site Matrix` (`CS5`) es `Test Matrix` (`T4`) 1:1 traceability.
3. `RC3` - Target checkpoint: jelen task file `CS6 -> T5` es `CS7 -> T6` traceability lock, overlap nelkul.
4. `RC4` - Target checkpoint: jelen task file `Test Matrix` (`T3`) es `Review Control` #4 osszhangja (terminology drift gate audit trail).

## Spec Lock

Task `IMPLEMENTABLE`, ha:
1. reviewer guidance explicit es ellentmondasmentes: blocker (`pass --finding`) / P2-P3 advisory (`converged --finding`) / clean (`converged` finding nelkul) routing determinisztikus.
2. rollout policy expliciten tartalmazza kickoff-version pinning + grace-period szabalyokat.
3. converged contract test matrix advisory-aware guidance/rollout esetekkel stabil.
4. nincs uj funkcionalis scope a jovahagyott plan WP4+WP5 hataran kivul.
5. review control gate objektiven teljesitheto: `T1-T7` + `RSC-T3-WP4` (`RC1-RC4`) + terminology drift zero (`Review Control` #4).

## Assumptions

1. Task 1 es Task 2 contract-levelen mar stabil es implementalhato.
2. Task 3 celja ezek operationalizalasa guidance/docs/rollout + contract coverage oldalon.
3. Contract tesztek mar kepesek a Task 3 policyt regresszioban ervenyesiteni.

## Open Questions

1. A grace period konkret hossza (napokban) tovabbra is ops dontes, kodszintu blocker nelkul.
