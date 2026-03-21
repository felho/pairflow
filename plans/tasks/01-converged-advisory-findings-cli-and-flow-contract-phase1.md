---
artifact_type: task
artifact_id: task_converged_advisory_findings_cli_flow_contract_phase1_v1
title: "Converged Advisory Findings CLI + Flow Contract (Phase 1)"
status: draft
phase: phase1
target_files:
  - src/cli/commands/agent/converged.ts
  - src/cli/commands/agent/pass.ts
  - src/v11/shared/converged/convergedCommandTypes.ts
  - src/v11/application/converged/runConvergedFlowContract.ts
  - src/v11/application/converged/runConvergedFlow.ts
  - tests/cli/convergedCommand.test.ts
  - tests/v11/application/converged/convergedCommandInputNormalization.test.ts
  - tests/v11/application/converged/runConvergedFlow.test.ts
  - tests/core/convergence/policy.test.ts
prd_ref: null
plan_ref: plans/converged-advisory-findings-contract-plan-v1.md
system_context_ref: docs/pairflow-initial-design.md
owners:
  - "felho"
---

# Task: Converged Advisory Findings CLI + Flow Contract (Phase 1)

## L0 - Policy

### Goal

Vezessuk be a `converged --finding` bemeneti contractot ugy, hogy:
1. a reviewer ugyanazt a finding szintaxist hasznalja, mint `pass` alatt,
2. `converged` alatt `P0/P1` determinisztikusan tiltott legyen,
3. a summary-vs-structured finding ellentmondas mar command-szinten hard reject legyen.

### In Scope

1. `converged` CLI option bovitese `--finding` repeatable flaggel.
2. Parser reuse (`pass` finding parse logika kozositese vagy ujrahasznositasa).
3. Ketziranyu summary guard command-szinten:
   - summary nyitott findingot allit, de nincs structured finding payload -> reject
   - structured finding van, de summary clean/no-findings allitast tesz -> reject
4. Flow input contract bovitese (findings tovabbitasa a converged flow-ban).
5. P2/P3-only guard `converged` kontextusban.

### Out of Scope

1. Approval metadata/parity pipeline vegleges kiepitese.
2. Reviewer guidance/docs rollout (kulon task).
3. Per-severity advisory aggregate metrikak (`P2/P3`) bevezetese.

### Safety Defaults

1. `P0/P1` `converged` alatt fail-closed.
2. Summary-structured ellentmondas fail-closed command-reject.
3. Ha summary finding-detektor bizonytalan, a meglvo `evaluatePositiveSummaryFindingsAssertion` logika marad az egyetlen canonical forras.

### Contract Boundary / Blast Radius

1. `contract_boundary_override`: `yes`
2. Erintett contractok:
   - public CLI contract (`pairflow converged --finding ...`)
   - converged command-to-flow input contract
   - convergence payload finding transport kezdopontja

## L1 - Change Contract

### 1) Call-site Matrix

| ID | File | Function/Entry | Exact Signature (args -> return) | Insertion Point | Expected Behavior | Priority | Timing | Evidence |
|---|---|---|---|---|---|---|---|---|
| CS1 | `src/cli/commands/agent/converged.ts` | option parsing | `parseConvergedCommandOptions(args: string[]) -> ParsedConvergedCommandOptions` | CLI option map + parser | `--finding` repeatable flag beolvasasa, formatum-validalas | P1 | required-now | T1,T2 |
| CS2 | `src/cli/commands/agent/pass.ts` | finding parser reuse | `parseFinding(raw: string) -> Finding` (shared/hozzaferheto forma) | parser extraction boundary | `converged` ugyanazt a finding grammar-t hasznalja | P1 | required-now | T3 |
| CS3 | `src/cli/commands/agent/converged.ts` | command dispatch | `runConvergedCommand(args: string[], cwd?: string) -> Promise<EmitConvergedResult \| null>` | emit elotti validation | ketiranyu summary guard + reason code-os reject | P1 | required-now | T4,T5 |
| CS4 | `src/v11/shared/converged/convergedCommandTypes.ts` | command type | type delta | converged command types | findings input bekerul typed formaban | P1 | required-now | T6 |
| CS5 | `src/v11/application/converged/runConvergedFlowContract.ts` | flow input contract | `RunConvergedFlowInput` type delta | contract definition | structured findings tovabbitas flow-ba | P1 | required-now | T6,T7 |
| CS6 | `src/v11/application/converged/runConvergedFlow.ts` | flow orchestration | `runConvergedFlow(input, deps) -> Promise<RunConvergedFlowResult>` | execution input builder | findings tovabbitasa execution/finalization fele | P1 | required-now | T7 |

### 2) Data and Interface Contract

| Contract | Current | Target | Required Fields | Optional Fields | Compatibility | Priority | Timing |
|---|---|---|---|---|---|---|---|
| Converged CLI input | `--summary`, `--ref` | `--summary`, `--ref`, `--finding` | `summary` | `refs`, `findings[]` | backward compatible extension | P1 | required-now |
| Finding input grammar | pass-only parser | shared parser grammar | `P2/P3` under converged context | `refs` | grammar compatible, context guard stricter | P1 | required-now |
| Summary consistency check | no command-level hard guard | command-level hard guard | consistency with structured findings | N/A | behavior tightening | P1 | required-now |

Normative rules:
1. `converged --finding` alatt canonical finding grammar: `P0|P1|P2|P3:Title[|ref1,ref2]`.
2. `converged` kontextusban policy szerinti elfogadhato severities: csak `P2/P3`.
3. Summary finding-detektor forrasa: `evaluatePositiveSummaryFindingsAssertion`.

### 3) Side Effects Contract

| Area | Allowed | Forbidden | Notes | Priority | Timing |
|---|---|---|---|---|---|
| CLI parse/runtime | option + validation bovitese | silent ignore invalid findings | explicit reason code kotelezo | P1 | required-now |
| Flow contract | typed input bovitese findings mezovel | implicit/any-alapu payload | type-safe forwarding kotelezo | P1 | required-now |
| UX | egysseges `--finding` nomenklatura | ket eltero finding flag (`--advisory-finding` vs `--finding`) | reviewer cognitive load csokkentes | P2 | required-now |

Constraint: ha parser extraction nem oldhato konfliktus nelkul, shared utility modul letrehozas kotelezo.

### 4) Error and Fallback Contract

| Trigger | Dependency (if any) | Behavior (`throw|result|fallback`) | Fallback Value/Action | Reason Code | Log Level | Priority | Timing |
|---|---|---|---|---|---|---|---|
| `converged` finding invalid format | finding parser | throw | command reject | `CONVERGED_FINDINGS_INVALID` | warn | P1 | required-now |
| `converged` alatt `P0/P1` | severity context validator | throw | command reject | `CONVERGED_BLOCKER_FINDINGS_FORBIDDEN` | warn | P1 | required-now |
| summary open-findings + no structured finding | summary detector | throw | command reject | `CONVERGED_SUMMARY_FINDINGS_CONTRADICTION` | warn | P1 | required-now |
| summary clean/no-findings + structured finding present | summary detector | throw | command reject | `CONVERGED_SUMMARY_FINDINGS_CONTRADICTION` | warn | P1 | required-now |
| parser extraction dependency failure | shared parser module | fallback | keep existing pass parser and add TODO_BLOCKER note | `CONVERGED_PARSER_REUSE_BLOCKED` | error | P2 | required-now |

### 5) Dependency Constraints

| Type | Items | Priority | Timing |
|---|---|---|---|
| must-use | existing `parseFinding` grammar and ref parsing semantics | P1 | required-now |
| must-use | `evaluatePositiveSummaryFindingsAssertion` for summary signal | P1 | required-now |
| must-not-use | uj NLP model summary classificationhez | P2 | required-now |
| must-not-use | summary contradiction puszta warningkent kezelese | P1 | required-now |

### 6) Test Matrix

| ID | Scenario | Given | When | Then | Priority | Timing | Evidence |
|---|---|---|---|---|---|---|---|
| T1 | `--finding` accepted | `converged --summary ... --finding P2:Title` | parser fut | parsed findings tartalmaz egy P2 findingot | P1 | required-now | automated test |
| T2 | blocker forbidden | `converged --finding P1:Title` | parser/validator fut | command reject `CONVERGED_BLOCKER_FINDINGS_FORBIDDEN` | P1 | required-now | automated test |
| T3 | parser parity with pass | azonos nyers finding string pass/converged alatt | parse fut | strukturalis parse eredmeny azonos (context guard nelkul) | P1 | required-now | automated test |
| T4 | summary says open, findings missing | summary pozitiv finding allitas + nincs findings | command fut | reject `CONVERGED_SUMMARY_FINDINGS_CONTRADICTION` | P1 | required-now | automated test |
| T5 | summary says clean, findings present | clean summary + structured findings | command fut | reject `CONVERGED_SUMMARY_FINDINGS_CONTRADICTION` | P1 | required-now | automated test |
| T6 | type contract update | new converged command types | typecheck fut | findings mezo type-safe | P1 | required-now | automated test |
| T7 | flow forwarding | parsed findings jelen vannak | runConvergedFlow fut | findings tovabbitodik execution inputba | P1 | required-now | automated test |

## L2 - Implementation Notes (Optional)

1. [later-hardening] Parser extraction kulon util file-ba (`src/cli/commands/agent/shared/findingParser.ts`) ha a pass file ownership miatt merge-risk no.
2. [later-hardening] CLI help-ben konkret contradiction peldak.

## Hardening Backlog (Optional)

| ID | Item | Layer | Priority | Timing | Source | Proposed Action |
|---|---|---|---|---|---|---|
| HB1 | parser extraction file-scope cleanup | L2 | P3 | later-hardening | implementation hygiene | dedicated refactor commit |
| HB2 | contradiction error message localization polish | L2 | P3 | later-hardening | UX feedback | concise actionable variants |

## Review Control

1. Kotelezo coverage: T1-T7.
2. P1 rows nem csokkenhetnek warning-only viselkedesre.
3. Task 2 nem indulhat, amig Task 1 `IMPLEMENTABLE` es parser/guard contract nem stabil.

## Spec Lock

Task `IMPLEMENTABLE`, ha:
1. `converged --finding` grammar es parser reuse stabil.
2. `P0/P1` converged alatt determinisztikusan reject.
3. ketiranyu summary contradiction command-szinten hard reject.
4. findings input type-safe modon atmegy a converged flow contracton.

## Assumptions

1. A `pass` parser reuse technikailag megvalosithato API toras nelkul.
2. A summary detector canonical forrasa mar adott a policy modulban.

## Open Questions

1. N/A (blocker nyitott kerdes nincs).

