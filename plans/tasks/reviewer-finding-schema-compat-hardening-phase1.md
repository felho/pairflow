---
artifact_type: task
artifact_id: task_reviewer_finding_schema_compat_hardening_phase1_v1
title: "Reviewer Finding Schema Compatibility Hardening (Phase 1)"
status: implementable
phase: phase1
target_files:
  - src/cli/commands/agent/pass.ts
  - src/core/agent/pass.ts
  - src/core/gates/docContractGates.ts
  - tests/cli/passCommand.test.ts
  - tests/core/agent/pass.test.ts
  - tests/core/gates/docContractGates.test.ts
  - docs/reviewer-severity-ontology.md
prd_ref: null
plan_ref: null
system_context_ref: docs/pairflow-initial-design.md
owners:
  - "felho"
---

# Task: Reviewer Finding Schema Compatibility Hardening (Phase 1)

## L0 - Policy

### Goal

Szuntesse meg a reviewer PASS CLI shorthand es a docs gate schema-elvaras kozotti inkompatibilitast ugy, hogy a rendszer ne termeljen zajos `REVIEW_SCHEMA_WARNING` jelzeseket csak azert, mert a CLI formatum nem kuld explicit `timing`/`layer` mezot.

### Incident Pattern

1. A reviewer `pairflow pass --finding <P*:Title|refs>` formatuma nem tud `timing`/`layer` mezot atadni.
2. A docs gate finding minimum-field ellenorzese ezt hianyzo mezokent warningolja.
3. A bubble status `failing_gates` listaja ettol tele lesz nem-blokkolo warningokkal, ami rontja a jel-zaj aranyt.

### In Scope

1. CLI shorthand finding parser defaultolja a hianyzo mezoket:
   - `timing = "later-hardening"`
   - `layer = "L1"`
2. A reviewer finding normalizacios path ezeket a defaultokat stabilan megorzi.
3. Docs gate `review_schema.minimum_fields` warning ne keletkezzen olyan findingokra, ahol a CLI shorthand altal adott defaultok mar jelen vannak.
4. Help szovegben explicit dokumentalas: CLI shorthand defaultolja a `timing`/`layer` mezot.
5. Regresszios tesztek a parser + gate + pass integracios utvonalon.

### Out of Scope

1. Uj CLI opcio (`--findings-file`) Phase 1-ben.
2. Teljes finding schema ujratervezese.
3. Docs gate blocker szabalyok (`P0/P1` evidence, doc qualifier) gyengitese.
4. Runtime state machine vagy lifecycle tranzicio modositas.

### Safety Defaults

1. Defaultolt `timing`/`layer` nem emelhet blocker szigort; tovabbra is `later-hardening` + `L1` legyen az alap.
2. Expliciten megadott `timing`/`layer` ertekeket nem irhatja felul sem parser, sem normalizer.
3. Invalid finding format tovabbra is hard error marad (`FINDINGS_PAYLOAD_INVALID` path).

### Contract Boundary / Blast Radius

1. `contract_boundary_override`: `no`
2. Erintett boundary: reviewer CLI input normalization + docs gate warning-kepzes policy.

## L1 - Change Contract

### 1) Call-site Matrix

| ID | File | Function/Entry | Exact Signature (args -> return) | Insertion Point | Expected Behavior | Priority | Timing | Evidence |
|---|---|---|---|---|---|---|---|---|
| CS1 | `src/cli/commands/agent/pass.ts` | `parseFinding(raw: string): Finding` | `(raw: string) -> Finding` | finding object build branch | shorthand finding automatikusan kap `timing=later-hardening`, `layer=L1` mezot | P1 | required-now | T1, T2 |
| CS2 | `src/core/agent/pass.ts` | `normalizeReviewerFindingsPayload(findings: unknown)` | `(unknown) -> { findings: Finding[]; invalid: boolean }` | normalized finding assembly | parser-defaultolt `timing`/`layer` ertekek valtozatlanul atmennek | P1 | required-now | T3 |
| CS3 | `src/core/gates/docContractGates.ts` | `evaluateReviewerGateWarnings(input)` | `(EvaluateReviewerGateInput) -> EvaluateReviewerGateResult` | minimum_fields warning branch | ha finding mar tartalmaz ervenyes `timing`/`layer` mezot (shorthand default miatt), ne adjon `missing timing/layer` warningot | P1 | required-now | T4, T5 |
| CS4 | `tests/cli/passCommand.test.ts` | pass parser coverage | `test assertions` | finding parse tests | ellenorzi a default `timing`/`layer` mezok letrejottet shorthandnal | P1 | required-now | T1, T2 |
| CS5 | `tests/core/agent/pass.test.ts` | pass integration coverage | `test assertions` | reviewer pass findings path | default mezok jelen vannak az atadott finding payloadban | P1 | required-now | T3, T6 |
| CS6 | `tests/core/gates/docContractGates.test.ts` | gate warning coverage | `test assertions` | minimum_fields warning branch | shorthandbol szarmazo finding defaultoknal nincs `REVIEW_SCHEMA_WARNING` timing/layer hiany miatt | P1 | required-now | T4, T5 |
| CS7 | `docs/reviewer-severity-ontology.md` | runtime PASS evidence binding note | markdown text | CLI finding section | explicit note a shorthand default `timing/layer` ertekrol | P2 | required-now | T7 |

### 2) Data and Interface Contract

| Contract | Current | Target | Required Fields | Optional Fields | Compatibility | Priority | Timing |
|---|---|---|---|---|---|---|---|
| CLI shorthand finding | `P*:Title[|refs]` -> `priority,severity,title,refs` | shorthand finding + default policy mezok | `priority`, `title`; defaults: `timing=later-hardening`, `layer=L1` | `refs` | backward-compatible parsing, additive payload fields | P1 | required-now |
| Reviewer finding normalization | timing/layer csak ha explicit jott | timing/layer defaultolt ertekek is stabilan megmaradnak | valid `timing`, valid `layer` | explicit `effective_priority` | backward-compatible | P1 | required-now |
| Doc gate minimum-fields warning | gyakran warning timing/layer hiany miatt | warning csak valos hiany/invalid esetre marad | valid `priority/timing/layer` | `evidence` tovabbra is policy-fuggo | warning-zaj csokken, blocker-szigor nem valtozik | P1 | required-now |

### 3) Side Effects Contract

| Area | Allowed | Forbidden | Notes | Priority | Timing |
|---|---|---|---|---|---|
| CLI finding parse output | default mezok hozzadasa | finding severity/refs parser lazitasa | csak `timing/layer` defaultolas | P1 | required-now |
| Doc gate warning volume | nem valos schema warning csokkentese | blocker-evidence szabaly gyengitese | jel-zaj javitas only | P1 | required-now |
| Lifecycle behavior | nincs valtozas | PASS/CONVERGED tranzicio policy modositas | out-of-scope | P1 | required-now |

Constraint: ha nincs explicit engedelyezett lifecycle side effect, implementacio nem valtoztathat state transition logikat.

### 4) Error and Fallback Contract

| Trigger | Dependency (if any) | Behavior (`throw|result|fallback`) | Fallback Value/Action | Reason Code | Log Level | Priority | Timing |
|---|---|---|---|---|---|---|---|
| invalid shorthand finding format | CLI parse | throw | parse error uzenet valtozatlanul | `FINDINGS_PAYLOAD_INVALID` | error | P1 | required-now |
| shorthand finding valid, timing/layer missing | CLI parse | fallback | default `timing=later-hardening`, `layer=L1` | `REVIEWER_FINDING_DEFAULTS_APPLIED` | info | P2 | required-now |
| doc gate minimum_fields check | gate evaluator | result | nincs warning, ha defaultolt mezok ervenyesek | `REVIEW_SCHEMA_WARNING` not emitted for this case | info | P1 | required-now |

### 5) Dependency Constraints

| Type | Items | Priority | Timing |
|---|---|---|---|
| must-use | existing finding types (`FindingTiming`, `FindingLayer`) | P1 | required-now |
| must-use | existing pass parser + doc gate evaluator pipeline | P1 | required-now |
| must-not-use | blocker-policy vagy severity ontology lazitas | P1 | required-now |
| must-not-use | uj CLI surface (`--findings-file`) ebben a phase-ban | P2 | required-now |

### 6) Test Matrix

| ID | Scenario | Given | When | Then | Priority | Timing | Evidence |
|---|---|---|---|---|---|---|---|
| T1 | CLI shorthand default fields | `--finding \"P2:Title|path/ref\"` | parse pass options | finding tartalmazza `timing=later-hardening`, `layer=L1` | P1 | required-now | `tests/cli/passCommand.test.ts` |
| T2 | CLI explicit fields compatibility | finding payload explicit timing/layerrel | parse+normalize | explicit ertekek megmaradnak, default nem irja felul | P1 | required-now | `tests/cli/passCommand.test.ts`, `tests/core/agent/pass.test.ts` |
| T3 | Pass integration normalized payload | reviewer pass shorthand findinggal | emit pass | transcript payload finding mar tartalmazza default mezoket | P1 | required-now | `tests/core/agent/pass.test.ts` |
| T4 | Doc gate no missing-field warning for shorthand defaults | docs scope finding default mezokkel | evaluateReviewerGateWarnings | nincs `missing required fields: timing, layer` warning | P1 | required-now | `tests/core/gates/docContractGates.test.ts` |
| T5 | Doc gate still warns on truly invalid fields | timing/layer invalid string | evaluateReviewerGateWarnings | `REVIEW_SCHEMA_WARNING` tovabbra is megjelenik | P1 | required-now | `tests/core/gates/docContractGates.test.ts` |
| T6 | Post-gate routing unchanged | round>=severity_gate_round, non-blocking finding set | reviewer pass | route policy valtozatlan (`REVIEWER_PASS_NON_BLOCKING_POST_GATE` marad) | P1 | required-now | `tests/core/agent/pass.test.ts` |
| T7 | Docs wording sync | reviewer ontology doc updated | docs check | shorthand default semantics explicit documented | P2 | required-now | `docs/reviewer-severity-ontology.md` |

## L2 - Implementation Notes (Optional)

1. [later-hardening] Uj `--findings-file <json>` CLI input a teljes finding schemahoz (`timing/layer/evidence` explicit support).
2. [later-hardening] Finding source metadata (`source=cli_shorthand|structured`) persistalasa debug/audit celra.
3. [later-hardening] Gate warning taxonomy bovitese (explicit `DEFAULTED_FIELD_INFO` info-level artifact).

## Hardening Backlog (Optional)

| ID | Item | Layer | Priority | Timing | Source | Proposed Action |
|---|---|---|---|---|---|---|
| H1 | `--findings-file` structured reviewer input | L2 | P1 | later-hardening | recurring schema/noise issue | kulon small-feature task |
| H2 | Finding source audit field | L2 | P2 | later-hardening | diagnostics clarity | optional telemetry extension |
| H3 | Prompt alignment for shorthand defaults | L2 | P2 | later-hardening | reviewer guidance parity | docs+prompt follow-up |

## Review Control

1. Nem fogadhato el olyan valtozas, ami a blocker-finding szigort gyengiti.
2. Nem fogadhato el olyan valtozas, ami lifecycle tranziciot modosít.
3. A Phase 1 fix kotelezoen teszttel bizonyitsa, hogy a zajos `REVIEW_SCHEMA_WARNING` mintazat megszunik shorthand findingokra.

## Spec Lock

Task `IMPLEMENTABLE`, ha:
1. CLI shorthand finding deterministic defaultokat kap (`timing/layer`),
2. doc gate minimum-fields warning nem zajol shorthand default miatt,
3. existing pass/converged policy regresszio nelkul marad.
