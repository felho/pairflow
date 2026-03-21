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

## L0 - Policy Contract

### Goal

Vezessuk be a `converged --finding` input contractot ugy, hogy:
1. a reviewer ugyanazt a finding szintaxist hasznalja, mint `pass` alatt,
2. `converged` alatt `P0/P1` determinisztikusan tiltott legyen,
3. a summary-vs-structured finding ellentmondas command szinten hard reject legyen,
4. a structured finding payload type-safe modon tovabb menjen a converged flow inputba, legalabb a kovetkezo minimumban:
   - `findings?: ConvergedStructuredFinding[]`
   - `ConvergedStructuredFinding = { severity: 'P2' | 'P3'; title: string; refs?: string[] }`

### Scope Lock (Task 1 only)

Ez a task kizarolag a plan WP1 (CLI + parser + flow input contract) scope-jat valositja meg.

Belefer:
1. `converged` CLI option bovitese repeatable `--finding` flaggel.
2. `pass` finding parser grammar ujrahasznositasa (kozos parser vagy extractalt utility).
3. Ketziranyu summary consistency guard command szinten.
4. `findings` input atadasa a converged flow contractba.
5. `converged` context severity guard: csak `P2/P3` engedett.

Nem fer bele:
1. WP2/WP3/WP4/WP5 scope (approval metadata pipeline, docs rollout, release monitor).
2. Uj severity taxonomy vagy uj claim-class modell.
3. Product/app feature bovitese a jovahagyott planen tul.

### Safety Defaults

1. `P0/P1` `converged` alatt fail-closed (`CONVERGED_BLOCKER_FINDINGS_FORBIDDEN`).
2. Summary es structured finding ellentmondas fail-closed (`CONVERGED_SUMMARY_FINDINGS_CONTRADICTION`).
3. Summary finding detektor canonical forrasa: `evaluatePositiveSummaryFindingsAssertion`.
4. Invalid finding format fail-closed (`CONVERGED_FINDINGS_INVALID`).

### Dependency Order

1. Task 1 -> Task 2 -> Task 3 sorrend kotelezo.
2. Task 2 nem indulhat, amig ennek a tasknak a spec lock allapota nem `IMPLEMENTABLE`.

## L1 - Change Contract

### 1) Call-site Matrix

| ID | File | Entry | Contract Delta | Required Behavior | Priority | Evidence |
|---|---|---|---|---|---|---|
| CS1 | `src/cli/commands/agent/converged.ts` | option parse + help | uj repeatable `--finding` option | a `--finding` ertekek gyujtese es parse boundary-hoz adasa (validation nelkul) | P1 | T1 |
| CS2 | `src/cli/commands/agent/pass.ts` + shared parse boundary | finding parser reuse | kozos grammar + refs parse semantics | pass/converged parser parity garantalt | P1 | T3 |
| CS3 | `src/cli/commands/agent/converged.ts` | command validation gate | format + severity + ketiranyu summary consistency guard | invalid/severity/contradiction eseten command reject reason code-dal | P1 | T2,T4,T5 |
| CS4 | `src/v11/shared/converged/convergedCommandTypes.ts` | command types | `findings?: ConvergedStructuredFinding[]` mezovel bovit | any/implicit payload tiltott, minimum shape explicit | P1 | T6 |
| CS5 | `src/v11/application/converged/runConvergedFlowContract.ts` | flow input contract | `RunConvergedFlowInput.findings?: ConvergedStructuredFinding[]` | typed forwarding contract, mezok (`severity`,`title`,`refs`) valtozatlanul tovabbadva | P1 | T6,T7 |
| CS6 | `src/v11/application/converged/runConvergedFlow.ts` | flow orchestration input builder | parsed findings tovabbitasa | findings elerheto execution pathon | P1 | T7 |

### 2) Data and Interface Contract

| Contract | Current | Target | Required | Optional | Compatibility |
|---|---|---|---|---|---|
| Converged CLI input | `--summary`, `--ref` | `--summary`, `--ref`, `--finding` | `summary` | `refs`, `findings[]` | backward-compatible extension |
| Finding grammar | pass-only parse path | shared pass-converged grammar | `P2/P3` enforce `converged` contextban | `refs` | grammar parity + context szigoritas |
| Summary consistency | nincs hard command guard | hard command guard | summary allitas egyezzen structured finding state-tel | N/A | intentional behavior tightening |

Normative rules:
1. Canonical finding grammar: `P0|P1|P2|P3:Title[|ref1,ref2]`.
2. `converged` alatt elfogadhato severity: csak `P2/P3`.
3. Summary signal source: `evaluatePositiveSummaryFindingsAssertion`.
4. Summary contradiction check ketiranyu es kotelezo:
   - summary nyitott findingot allit, de structured finding nincs -> reject,
   - structured finding van, de summary clean/no-findings allitast tesz -> reject.
5. Minimal normative TS-shape (`findings` forwarding contract):
   ```ts
   type ConvergedStructuredFinding = {
     severity: 'P2' | 'P3';
     title: string;
     refs?: string[];
   };

   type ConvergedFindingsInput = {
     findings?: ConvergedStructuredFinding[];
   };
   ```

### 3) Error Contract

| Trigger | Behavior | Reason Code | Priority |
|---|---|---|---|
| invalid finding format | command reject | `CONVERGED_FINDINGS_INVALID` | P1 |
| `P0/P1` finding converged alatt | command reject | `CONVERGED_BLOCKER_FINDINGS_FORBIDDEN` | P1 |
| summary open + structured finding hianyzik | command reject | `CONVERGED_SUMMARY_FINDINGS_CONTRADICTION` | P1 |
| summary clean/no-findings + structured finding jelen van | command reject | `CONVERGED_SUMMARY_FINDINGS_CONTRADICTION` | P1 |

Validation ownership note:
1. Parse ownership: CS1 (`--finding` option beolvasas es parser boundary hivas).
2. Command-level reject ownership: CS3 (invalid format, forbidden severity, summary contradiction).
3. T2 expliciten CS3 severity guardot verifikalja, nem CS1 parse viselkedest.

### 4) Test and Acceptance Matrix

| ID | Scenario | Given | When | Then |
|---|---|---|---|---|
| T1 | `--finding` accepted | `converged --summary ... --finding P2:Title` | parse path fut (CS1) | parsed findings tartalmazza a P2 findingot |
| T2 | blocker forbidden | `converged --finding P1:Title` | command-level validation gate fut (CS3) | command reject `CONVERGED_BLOCKER_FINDINGS_FORBIDDEN` |
| T3 | parser parity with pass | rogzitett `P2/P3` fixture lista (forras: T3 tesztfajl `PARSER_PARITY_FIXTURES`) | minden fixture-re fut pass parse es converged parse ugyanazon grammar boundary-n | deepEqual egyezes a normalizalt strukturan: `{severity,title,refs}`; barmely elteres = fail |
| T4 | summary says open, findings missing | summary open-claim + nincs finding payload | command fut | reject `CONVERGED_SUMMARY_FINDINGS_CONTRADICTION` |
| T5 | summary says clean, findings present | clean summary + van finding payload | command fut | reject `CONVERGED_SUMMARY_FINDINGS_CONTRADICTION` |
| T6 | type contract update | converged command/flow type delta | typecheck fut | findings mezo type-safe |
| T7 | flow forwarding | parsed findings jelen vannak | runConvergedFlow fut | findings atmegy execution inputba |

Coverage gate:
1. T1-T7 mind kotelezo.
2. P1 viselkedes nem downgradelheto warning-only modra.
3. Reason code stringek stabil contractkent kezelendok.
4. T3 csak parser grammar parity-re vonatkozik; context guard viselkedest T2 validalja kulon.

### 5) Review Control

Reviewer akkor adhat `IMPLEMENTABLE` allapotot, ha mind teljesul:
1. WP1-only scope tartva van (nincs WP2+ scope creep).
2. `--finding` parser parity bizonyithato a pass grammarhoz kepest.
3. `P0/P1` tiltas es summary contradiction guard command-szinten enforced.
4. Flow input contractban a `findings` typed forwarding egyertelmu.
5. Tesztterv (T1-T7) teljes, egyertelmuen reprodukalhato.

## L2 - Implementation Notes (Optional)

1. Parser extraction javasolt celpont: `src/cli/commands/agent/shared/findingParser.ts`, ha ownership/merge risk ezt indokolja.
2. CLI helpben legyen explicit converged-only severity policy (`P2/P3 only`).

## Spec Lock

Task `IMPLEMENTABLE`, ha:
1. a fenti L0-L1 contract ellentmondasmentes,
2. acceptance matrix T1-T7 teljesen fedett,
3. CS1-CS3 felelossegi hatar es evidence mapping egyertelmu (parse vs command-level validation nem keveredik),
4. nincs nyitott blocker kerdes.

## Assumptions

1. A pass parser reuse API-tores nelkul megoldhato.
2. A summary detector canonical policy helper mar stabil es ujrahasznalhato.

## Open Questions

1. N/A (blocker nyitott kerdes nincs).
