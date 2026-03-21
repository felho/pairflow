---
artifact_type: task
artifact_id: task_converged_advisory_findings_reviewer_guidance_rollout_phase1_v1
title: "Converged Advisory Findings Reviewer Guidance and Rollout (Phase 1)"
status: draft
phase: phase1
target_files:
  - src/core/runtime/reviewerCommandGateGuidance.ts
  - src/core/runtime/tmuxDelivery.ts
  - docs/reviewer-severity-ontology.md
  - docs/reviewer-pass-converged-issue-assessment-2026-03-21.md
  - plans/converged-advisory-findings-contract-plan-v1.md
  - tests/core/runtime/tmuxDelivery.test.ts
  - tests/core/runtime/reviewerCommandGateGuidance.test.ts
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

Zarjuk le a reviewer UX es rollout oldali bizonytalansagokat:
1. egyertelmu command guidance (`pass --finding` vs `converged --finding`),
2. pre-existing help/guidance inkonzisztencia megszuntetese,
3. in-flight bubble atmenet operativ szabalyainak dokumentalt bevezetese.

### In Scope

1. Reviewer command guidance frissites runtime szovegekben.
2. Dokumentacios align:
   - severity ontology references
   - issue assessment doc frissites
3. Rollout policy konkretizalas:
   - forward-only + fail-closed
   - in-flight bubble strategy + grace period
4. Contract-level regression esetek frissitese converged contract tesztekben.
5. Readiness state ellenorzes, hogy task-level granularitas mar rendelkezésre all.

### Out of Scope

1. CLI parser implementacio (Task 1).
2. Approval parity metadata implementacio (Task 2).
3. Meta-review recommendation policy redesign.

### Safety Defaults

1. Reviewer guidance nem lehet ketertelmu a command routingban.
2. Rollout alatt in-flight bubble viselkedes explicit policy szerint tortenik.
3. Ha contract-case update hianyos, rollout nem jelolheto kesznek.

### Contract Boundary / Blast Radius

1. `contract_boundary_override`: `yes`
2. Erintett contractok:
   - reviewer runtime guidance contract
   - rollout operational contract (in-flight vs new bubbles)
   - converged contract test fixtures

### Dependency

1. Task 3 Task 1 + Task 2 lezarasara epul.

## L1 - Change Contract

### 1) Call-site Matrix

| ID | File | Function/Entry | Exact Signature (args -> return) | Insertion Point | Expected Behavior | Priority | Timing | Evidence |
|---|---|---|---|---|---|---|---|---|
| CS1 | `src/core/runtime/reviewerCommandGateGuidance.ts` | reviewer guidance text builders | `(input) -> string` | converged/pass routing guidance | explicit `converged --finding (P2/P3)` + tiltott mintak | P1 | required-now | T1 |
| CS2 | `src/core/runtime/tmuxDelivery.ts` | delivery message content | existing delivery builder signatures | reviewer-facing command snippets | command peldak es contradiction warning egyertelmu | P1 | required-now | T2 |
| CS3 | `docs/reviewer-severity-ontology.md` | policy doc content | document update | command usage section | pass/converged command policy aligned | P2 | required-now | T3 |
| CS4 | `docs/reviewer-pass-converged-issue-assessment-2026-03-21.md` | assessment record | document update | baseline + resolution section | pre-existing `--finding` inconsistency explicitly tracked as historical baseline | P2 | required-now | T3 |
| CS5 | `plans/converged-advisory-findings-contract-plan-v1.md` | rollout policy section | document update | forward contract strategy | in-flight kickoff-version strategy + grace period concretely documented | P1 | required-now | T4 |
| CS6 | `tests/contracts/v11/converged.contract.test.ts` + cases | contract fixtures | existing contract runner interface | converged scenario matrix | updated guidance/contract assumptions reflected in automated contract coverage | P1 | required-now | T5 |

### 2) Data and Interface Contract

| Contract | Current | Target | Required Fields | Optional Fields | Compatibility | Priority | Timing |
|---|---|---|---|---|---|---|---|
| Reviewer command guidance | mixed/partly inconsistent wording | single-source aligned wording | pass vs converged routing rules | examples | additive docs/runtime change | P1 | required-now |
| Rollout policy | high-level forward-only note | executable operational policy | kickoff-time contract version, grace period | rollout window length | non-breaking process change | P1 | required-now |
| Contract tests | pre-advisory assumptions | advisory-aware contract cases | converged cases with structured findings expectations | extra diagnostics checks | additive | P1 | required-now |

Normative wording rules:
1. `converged --finding` alatt csak `P2/P3` pelda adható reviewer guidanceben.
2. "summary-only findings statement" tiltott minta explicit marad.
3. In-flight bubble policy: kickoffkor rogzitett contract verzio iranyado.

### 3) Side Effects Contract

| Area | Allowed | Forbidden | Notes | Priority | Timing |
|---|---|---|---|---|---|
| Runtime guidance | szovegfrissites command examples-szel | contradiktiv command advice | reviewer first-try success erosites | P1 | required-now |
| Docs | policy es assessment update | implementation details doc-only feluliras kod ellen | docs must mirror implemented contract | P2 | required-now |
| Contract tests | fixture update + assertions | rollout policy coverage nelkuli merge | release confidence gate | P1 | required-now |

Constraint: guidance update nem vezethet vissza `--advisory-finding` terminologiara.

### 4) Error and Fallback Contract

| Trigger | Dependency (if any) | Behavior (`throw|result|fallback`) | Fallback Value/Action | Reason Code | Log Level | Priority | Timing |
|---|---|---|---|---|---|---|---|
| guidance text drift old/new contract kozott | docs/runtime sync | result | block release checklist item | `CONVERGED_GUIDANCE_CONTRACT_DRIFT` | warn | P1 | required-now |
| in-flight policy missing rollout docsbol | rollout checklist | result | keep status draft, no rollout sign-off | `CONVERGED_INFLIGHT_POLICY_MISSING` | warn | P1 | required-now |
| contract fixture outdated | contract test suite | throw | fail CI contract test | `CONVERGED_CONTRACT_CASE_OUTDATED` | error | P1 | required-now |
| reviewer guidance test snapshot mismatch | test harness | result | update expected text intentionally with review note | `CONVERGED_GUIDANCE_SNAPSHOT_CHANGED` | info | P2 | required-now |

### 5) Dependency Constraints

| Type | Items | Priority | Timing |
|---|---|---|---|
| must-use | Task 1/2 approved contract decisions | P1 | required-now |
| must-use | converged contract tests as rollout gate | P1 | required-now |
| must-not-use | docs-only "assume works" release without contract tests | P1 | required-now |
| must-not-use | mixed terminology (`--advisory-finding`) after decision lock | P1 | required-now |

### 6) Test Matrix

| ID | Scenario | Given | When | Then | Priority | Timing | Evidence |
|---|---|---|---|---|---|---|---|
| T1 | guidance routing accuracy | reviewer guidance projection | guidance render fut | pass vs converged rule explicit es nem ellentmondo | P1 | required-now | automated test |
| T2 | tmux delivery command examples | reviewer delivery event | message build fut | `converged --finding` peldak + tiltott mintak szerepelnek | P1 | required-now | automated test |
| T3 | docs alignment check | ontology + assessment docs | docs review fut | policy wording osszhangban van a locked decisionnel | P2 | required-now | doc review + optional lint |
| T4 | rollout policy completeness | plan rollout section | policy review fut | in-flight + grace period explicit | P1 | required-now | doc review |
| T5 | contract fixture parity | converged contract cases | contract test fut | advisory-aware converged path atmegy | P1 | required-now | automated contract test |

## L2 - Implementation Notes (Optional)

1. [later-hardening] Add dedicated rollout runbook doc for support/oncall handoff.
2. [later-hardening] Add checklist automation for doc/runtime wording drift detection.

## Hardening Backlog (Optional)

| ID | Item | Layer | Priority | Timing | Source | Proposed Action |
|---|---|---|---|---|---|---|
| HB1 | rollout runbook extraction | L2 | P3 | later-hardening | ops process | create docs/rollout/converged-advisory-v1.md |
| HB2 | wording drift automation | L2 | P3 | later-hardening | maintenance | add script/check in CI |

## Review Control

1. Kotelezo coverage: T1, T2, T5.
2. T3-T4 legalabb review evidence szinten kotelezo release elott.
3. Task 3 akkor zarhato, ha terminology drift (`--advisory-finding`) nulla az erintett guidance/docs feluleteken.

## Spec Lock

Task `IMPLEMENTABLE`, ha:
1. reviewer guidance egyertelmuen `pass --finding` vs `converged --finding (P2/P3)`.
2. in-flight rollout policy explicit es operativan vegrehajthato.
3. converged contract tests advisory-aware esetekkel zolden futnak.
4. plan/task readiness allapot mar task-level granularitast tukroz.

## Assumptions

1. Task 1 es Task 2 functional contractja mar implementation-levelen stabil.
2. Contract tests frissitese elegendo rollout confidence gate a Phase 1 release-hez.

## Open Questions

1. A grace period konkret hossza (napokban) ops dontes, kodszintu blocker nelkul.

