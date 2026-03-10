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

Remove the compatibility gap between reviewer PASS CLI shorthand findings and the docs gate schema contract so that `REVIEW_SCHEMA_WARNING` is not emitted only because the shorthand syntax cannot carry explicit `timing` or `layer` fields.

### Incident Pattern

1. Reviewer CLI shorthand uses `pairflow pass --finding <P*:Title|refs>`.
2. That shorthand format produces a `Finding` without user-supplied `timing` or `layer`.
3. The docs gate minimum-fields check treats those omitted fields as missing schema data and emits `REVIEW_SCHEMA_WARNING`.
4. The resulting warning is non-blocking noise, but it still appears in `failing_gates` and obscures real blockers.

### In Scope

1. CLI shorthand finding parsing assigns deterministic defaults when the shorthand format is used and the finding object does not already carry those fields:
   - `timing = "later-hardening"`
   - `layer = "L1"`
2. Reviewer finding normalization preserves parser-applied defaults unchanged.
3. Docs gate `review_schema.minimum_fields` warning logic no longer emits `missing timing/layer` for findings that already contain valid shorthand defaults.
4. Help or docs text explicitly states the shorthand defaulting semantics.
5. Regression coverage proves the parser, normalization path, gate evaluation, and post-gate routing behavior remain deterministic.

### Out of Scope

1. New CLI surface such as `--findings-file` in Phase 1.
2. Full finding schema redesign.
3. Any weakening of docs gate blocker rules, including `P0/P1` evidence requirements or doc qualifier enforcement.
4. Runtime state machine or lifecycle transition changes.

### Safety Defaults

1. Defaulted `timing` and `layer` must not strengthen blocker severity; the defaults remain `later-hardening` and `L1`.
2. Explicitly supplied `timing` or `layer` values must never be overwritten by parser or normalizer logic.
3. Invalid shorthand syntax remains a hard error on the existing `FINDINGS_PAYLOAD_INVALID` path.
4. Noise reduction applies only to fields synthesized by the shorthand compatibility rule; truly missing, empty, or invalid schema fields still produce the existing gate signal.

### Contract Boundary / Blast Radius

1. `contract_boundary_override`: `no`
2. Affected boundary: reviewer CLI input parsing/normalization plus docs gate warning-generation policy.

### Acceptance Criteria

1. `AC1`: Every valid shorthand finding emitted by the CLI parser contains `timing=later-hardening` and `layer=L1`.
2. `AC2`: Parser-synthesized shorthand defaults and structured or otherwise explicit `timing` and `layer` values survive normalization unchanged end-to-end.
3. `AC3`: `review_schema.minimum_fields` no longer emits a `missing timing/layer` `REVIEW_SCHEMA_WARNING` for shorthand findings that already contain the compatibility defaults, while any other applicable schema warning remains unchanged.
4. `AC4`: Gate warnings still appear for genuinely missing, empty, or invalid schema values; blocker strictness is unchanged.
5. `AC5`: Reviewer pass routing remains unchanged for non-blocking finding sets after the gate runs.
6. `AC6`: User-facing docs explicitly describe shorthand defaulting semantics and backward-compatible additive payload behavior.
7. `AC7`: Invalid shorthand syntax still fails on the existing hard-error path and is not silently defaulted.

## L1 - Change Contract

### 1) Call-site Matrix

| ID | File | Function/Entry | Exact Signature (args -> return) | Insertion Point | Expected Behavior | Priority | Timing | Evidence |
|---|---|---|---|---|---|---|---|---|
| CS1 | `src/cli/commands/agent/pass.ts` | `parseFinding(raw: string): Finding` | `(raw: string) -> Finding` | shorthand finding object construction | Every valid shorthand parse result includes `timing=later-hardening` and `layer=L1` before the object leaves the parser. No other shorthand semantics change. | P1 | required-now | T1 |
| CS2 | `src/core/agent/pass.ts` | `normalizeReviewerFindingsPayload(findings: unknown)` | `(unknown) -> { findings: Finding[]; invalid: boolean }` | normalized finding assembly | Parser-applied defaults pass through unchanged. Explicit `timing` and `layer` values on non-shorthand inputs also remain unchanged. | P1 | required-now | T2, T3 |
| CS3 | `src/core/gates/docContractGates.ts` | `evaluateReviewerGateWarnings(input)` | `(EvaluateReviewerGateInput) -> EvaluateReviewerGateResult` | `review_schema.minimum_fields` warning branch | If a finding already contains valid `timing` and `layer` values, including shorthand defaults, no `missing timing/layer` warning is emitted. Other schema warnings remain unaffected, and missing/empty/invalid values still warn. | P1 | required-now | T4, T5, T9, T10 |
| CS4 | `tests/cli/passCommand.test.ts` | pass parser coverage | `test assertions` | shorthand parse tests | Verifies deterministic shorthand defaults and verifies the parser still rejects invalid shorthand format. | P1 | required-now | T1, T8 |
| CS5 | `tests/core/agent/pass.test.ts` | pass integration coverage | `test assertions` | reviewer pass findings path | Verifies defaults survive into emitted payloads and that post-gate reviewer-pass routing remains unchanged for non-blocking findings. | P1 | required-now | T2, T3, T6 |
| CS6 | `tests/core/gates/docContractGates.test.ts` | gate warning coverage | `test assertions` | minimum-fields warning branch | Verifies shorthand-defaulted findings do not warn for missing `timing/layer`, while other schema warnings and truly missing/empty/invalid values still produce `REVIEW_SCHEMA_WARNING`. | P1 | required-now | T4, T5, T9, T10 |
| CS7 | `docs/reviewer-severity-ontology.md` | CLI finding documentation | markdown text | reviewer CLI finding section | Explicitly documents shorthand defaults, additive backward compatibility, and the fact that blocker policy is unchanged. | P2 | required-now | T7 |

### 2) Data and Interface Contract

| Contract | Current | Target | Required Fields | Optional Fields | Compatibility | Priority | Timing |
|---|---|---|---|---|---|---|---|
| CLI shorthand finding | `P*:Title[|refs]` currently requires only shorthand input fields and yields a finding without explicit schema-policy fields | Shorthand emits an additive superset of the current payload, with `timing=later-hardening` and `layer=L1` always present on valid shorthand results | Parser input requires `priority`, `title`; parser output guarantees `priority`, `timing`, `layer` | `refs`, existing derived fields such as severity/effective priority | Backward-compatible: existing shorthand syntax and field meanings remain valid; only additive fields are introduced | P1 | required-now |
| Reviewer finding normalization | `timing/layer` may be absent unless provided earlier in the pipeline | Defaulted or explicit `timing/layer` values survive normalization unchanged | Normalized finding must retain valid `priority`, `timing`, `layer` | `refs`, `evidence`, explicit `effective_priority` | Backward-compatible and deterministic | P1 | required-now |
| Doc gate minimum-fields warning | Warnings can be emitted for shorthand findings solely due to omitted `timing/layer` | Warnings remain only for true missing or invalid schema data after normalization | Warning suppression applies only when normalized `priority`, `timing`, and `layer` are all valid | `evidence` remains policy-dependent | Warning noise decreases without relaxing blocker strictness | P1 | required-now |

### 3) Side Effects Contract

| Area | Allowed | Forbidden | Notes | Priority | Timing |
|---|---|---|---|---|---|
| CLI finding parse output | Add shorthand compatibility defaults for `timing` and `layer` | Relax shorthand syntax validation or change `priority/title/refs` semantics | Shorthand remains `P*:Title[|refs]`; only additive schema fields are introduced | P1 | required-now |
| Doc gate warning volume | Remove warning noise caused only by shorthand omissions now satisfied by defaults | Weaken blocker evidence policy, qualifier checks, or invalid-value warnings | Noise reduction is limited to already-valid defaulted findings | P1 | required-now |
| Lifecycle behavior | No change | Modify PASS/CONVERGED routing or state transition policy | Routing must remain behaviorally equivalent to current logic | P1 | required-now |

Constraint: if a lifecycle effect is not explicitly allowed above, the implementation must not change state transition logic.

### 4) Error and Fallback Contract

| Trigger | Dependency (if any) | Behavior (`throw|result|fallback`) | Fallback Value/Action | Reason Code | Log Level | Priority | Timing |
|---|---|---|---|---|---|---|---|
| Invalid shorthand finding format | CLI parse | throw | Existing parse error text remains unchanged | `FINDINGS_PAYLOAD_INVALID` | error | P1 | required-now |
| Valid shorthand finding omits `timing/layer` because the syntax cannot carry them | CLI parse | fallback | Apply `timing=later-hardening`, `layer=L1` before returning the `Finding` | `REVIEWER_FINDING_DEFAULTS_APPLIED` or existing equivalent informational path | info | P2 | required-now |
| Doc gate minimum-fields check sees a finding with valid defaulted or explicit `timing/layer` | gate evaluator | result | Do not emit `REVIEW_SCHEMA_WARNING` for missing `timing/layer` in this case | `REVIEW_SCHEMA_WARNING` not emitted for this condition | info | P1 | required-now |
| Doc gate sees invalid or unsupported `timing/layer` values | gate evaluator | result | Preserve existing warning behavior | existing gate warning reason codes unchanged | warn | P1 | required-now |

### 5) Dependency Constraints

| Type | Items | Priority | Timing |
|---|---|---|---|
| must-use | existing finding types (`FindingTiming`, `FindingLayer`) and current reviewer finding schema | P1 | required-now |
| must-use | existing pass parser, normalization path, and doc gate evaluator pipeline | P1 | required-now |
| must-not-use | blocker policy weakening or severity ontology relaxation | P1 | required-now |
| must-not-use | new CLI surface such as `--findings-file` in this phase | P2 | required-now |

### 6) Test Matrix

| ID | Scenario | Given | When | Then | Priority | Timing | Evidence |
|---|---|---|---|---|---|---|---|
| T1 | CLI shorthand defaults are deterministic | `--finding "P2:Title|path/ref"` | parse pass options | Returned finding contains `timing=later-hardening` and `layer=L1`, with existing `priority/title/refs` behavior unchanged | P1 | required-now | `tests/cli/passCommand.test.ts` |
| T2 | Explicit values are preserved | A reviewer finding payload already contains explicit valid `timing` and `layer` values | normalize reviewer findings | Explicit values survive unchanged; shorthand defaults do not overwrite them | P1 | required-now | `tests/core/agent/pass.test.ts` |
| T3 | Pass integration emits normalized defaulted findings | Reviewer pass uses shorthand finding input | emit pass | Transcript or emitted payload contains the defaulted `timing` and `layer` fields | P1 | required-now | `tests/core/agent/pass.test.ts` |
| T4 | Doc gate suppresses only the false timing/layer missing-field warning | A docs-scope finding arrives with shorthand compatibility defaults already present | evaluate reviewer gate warnings | No `REVIEW_SCHEMA_WARNING` is emitted for `missing required fields: timing, layer`, and unrelated schema-warning behavior is unchanged | P1 | required-now | `tests/core/gates/docContractGates.test.ts` |
| T5 | Doc gate still warns on true schema invalidity | `timing` or `layer` contains an invalid string or unsupported value | evaluate reviewer gate warnings | Existing `REVIEW_SCHEMA_WARNING` behavior remains for the invalid field case | P1 | required-now | `tests/core/gates/docContractGates.test.ts` |
| T6 | Post-gate routing is unchanged | `round >= severity_gate_round` and the finding set is non-blocking after gate evaluation | reviewer pass | Routing remains on the current non-blocking path, such as `REVIEWER_PASS_NON_BLOCKING_POST_GATE` | P1 | required-now | `tests/core/agent/pass.test.ts` |
| T7 | Docs wording stays aligned | Reviewer ontology/help doc is updated | docs review | Shorthand default semantics, additive compatibility, and unchanged blocker strictness are explicit | P2 | required-now | `docs/reviewer-severity-ontology.md` |
| T8 | Invalid shorthand stays a hard error | Malformed shorthand input such as missing priority or title delimiter | parse pass options | Existing `FINDINGS_PAYLOAD_INVALID` path is preserved; no compatibility defaults are applied | P1 | required-now | `tests/cli/passCommand.test.ts` |
| T9 | Valid defaults do not mask other invalid schema fields | A finding reaches the gate with valid shorthand-defaulted `timing/layer` but another schema field is invalid | evaluate reviewer gate warnings | The gate still emits the appropriate schema warning for the truly invalid field, and it does not reintroduce a `missing timing/layer` warning | P1 | required-now | `tests/core/gates/docContractGates.test.ts` |
| T10 | Doc gate still warns on truly missing or empty schema fields | A structured or otherwise non-defaulted finding reaches the gate with missing or empty required schema fields | evaluate reviewer gate warnings | Existing `REVIEW_SCHEMA_WARNING` behavior remains for the missing/empty field case; shorthand compatibility does not suppress it | P1 | required-now | `tests/core/gates/docContractGates.test.ts` |

### 7) Acceptance Traceability

| Acceptance Criterion | Covered By | Notes |
|---|---|---|
| `AC1` | `T1`, `T3` | Covers parser output and emitted pass payload. |
| `AC2` | `T2`, `T3` | Confirms both explicit values and parser-synthesized defaults survive normalization/emission unchanged. |
| `AC3` | `T4`, `T9` | Confirms only the false `timing/layer` missing warning is removed and other schema warnings remain intact. |
| `AC4` | `T5`, `T10` | Confirms missing, empty, and invalid fields still warn under the existing schema rules. |
| `AC5` | `T6` | Confirms routing behavior is unchanged after the gate runs. |
| `AC6` | `T7` | Confirms user-facing docs describe the compatibility behavior. |
| `AC7` | `T8` | Confirms invalid shorthand still fails hard instead of being defaulted. |

## L2 - Implementation Notes (Optional)

1. [later-hardening] Add `--findings-file <json>` or equivalent structured CLI input for explicit full-schema reviewer findings (`timing`, `layer`, `evidence`).
2. [later-hardening] Persist finding source metadata such as `source=cli_shorthand|structured` for audit/debug clarity.
3. [later-hardening] Consider a separate non-warning artifact for default application, such as an explicit info-level compatibility note.

## Hardening Backlog (Optional)

| ID | Item | Layer | Priority | Timing | Source | Proposed Action |
|---|---|---|---|---|---|---|
| H1 | `--findings-file` structured reviewer input | L2 | P1 | later-hardening | recurring schema/noise issue | follow-up small feature task |
| H2 | Finding source audit field | L2 | P2 | later-hardening | diagnostics clarity | optional telemetry extension |
| H3 | Prompt/help alignment for shorthand defaults | L2 | P2 | later-hardening | reviewer guidance parity | docs and prompt follow-up |

## Review Control

1. Reject any change that weakens blocker-finding strictness.
2. Reject any change that modifies lifecycle transitions or reviewer-pass routing semantics.
3. Phase 1 is not complete unless tests prove the noisy `REVIEW_SCHEMA_WARNING` pattern is removed for shorthand findings and retained for true invalid schema cases.

## Spec Lock

Task `IMPLEMENTABLE` when:
1. CLI shorthand findings deterministically receive `timing` and `layer` defaults,
2. doc gate minimum-fields warning no longer produces shorthand-only noise,
3. existing pass/converged policy remains regression-free,
4. explicit backward-compatibility expectations and test traceability remain documented in the task itself,
5. invalid shorthand remains on the existing hard-error path.
