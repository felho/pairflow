---
artifact_type: task
artifact_id: task_commit_result_protocol_contract_v1
title: "Commit Result Protocol Contract"
status: draft
phase: phase1
target_files:
  - "src/types/protocol.ts"
  - "src/v11/shared/protocol/protocolPayloadValidation.ts"
  - "src/v11/shared/protocol/protocolPayloadValidationHelpers.ts"
  - "src/v11/shared/protocol/validators.ts"
  - "tests/core/protocol/validators.test.ts"
prd_ref: null
plan_ref: plans/commit-snapshot-and-completion-artifact-retirement-plan-v1.md
system_context_ref: docs/pairflow-initial-design.md
owners:
  - "felho"
---

# Task: Commit Result Protocol Contract

## L0 - Policy

### Goal

Introduce the `COMMIT_RESULT` protocol envelope contract as the technical commit-finalization event shape. This task is a protocol foundation slice only: it defines and validates the new event payload without cutting over local commit, remote commit, CLI/API, or live docs.

### Domain / Control Model Summary

1. Business invariant: A bubble commit is complete because Pairflow has a valid git commit and finalizes state, not because a prose done-package exists.
2. Control model: Commit finalization remains controlled by commit runtime; this task only defines the event contract that later producers will emit.
3. Read-path rule: First-party runtime consumers may later read commit completion from state, transcript `COMMIT_RESULT`, command result, and git. This task does not update consumers.
4. Forbidden fallback: Do not introduce a new prose completion artifact, do not treat `DONE_PACKAGE` as the target finalization event, and do not add done-package fields to `COMMIT_RESULT`.
5. Allowed resolution path: Add `COMMIT_RESULT` as an integration-slice protocol type with closed technical metadata. Temporary coexistence with existing `DONE_PACKAGE` validation is allowed only because downstream producers have not yet cut over.
6. Missing-data rule: Missing `COMMIT_RESULT` remains non-recovered in this task; local crash-after-git-commit recovery is not expanded.
7. Phase boundary:
   - contract closure: owned here for `COMMIT_RESULT` payload validation.
   - producer closure: successor `local-commit-done-package-removal`.
   - internal execution closure: successor.
   - workflow/orchestration closure: successor.
   - read-model closure: successor.
   - activation closure: successor.
   - cleanup/recovery closure: out of scope.

### Plan Linkage

1. Parent plan gap closed: Phase 1, `commit-result-protocol-contract`.
2. Depends on: Approved plan [plans/commit-snapshot-and-completion-artifact-retirement-plan-v1.md](/Users/felho/dev/pairflow/plans/commit-snapshot-and-completion-artifact-retirement-plan-v1.md).
3. Unlocks / impacts successors: `local-commit-done-package-removal`, `commit-cli-stage-all-cutover`, `remote-commit-result-alignment`, `done-package-live-reference-cleanup`.
4. Task-list impact: replaces deleted obsolete Phase 1A-1D done-package compatibility tasks.
5. Inherited validation / exit expectation: `COMMIT_RESULT` validates with required technical fields; prose summary, done-package fields, missing commit fields, and unknown metadata keys are rejected.

### Canonical Contract Anchors

1. Source-of-truth anchors:
   - `src/types/protocol.ts`
   - `src/v11/shared/protocol/validators.ts`
   - `src/v11/shared/protocol/protocolPayloadValidation.ts`
   - `src/v11/shared/protocol/protocolPayloadValidationHelpers.ts`
   - `tests/core/protocol/validators.test.ts`
2. Canonical elements:
   - `COMMIT_RESULT` envelope type.
   - `payload.metadata.commit_sha`: required non-empty string.
   - `payload.metadata.commit_message`: required non-empty string.
   - `payload.metadata.staged_files`: required non-empty string array.
3. Guard elements:
   - Closed metadata key validation for `COMMIT_RESULT`.
   - Rejection of `payload.summary` for `COMMIT_RESULT`.
   - Rejection of done-package fields in payload or metadata.
4. Compat-only elements:
   - Existing `DONE_PACKAGE` type may remain temporarily valid in this integration slice until producer cutover removes it.
5. Forbidden reinterpretations:
   - Do not make `COMMIT_RESULT` a prose artifact under another name.
   - Do not allow `donePackagePath`, `done_package_path`, `donePackageContent`, `done_package_content`, or `summary` as valid `COMMIT_RESULT` content.
   - Do not remove or rewrite commit producers in this task.

### Scope Reality / Shape Proof

1. Inspected entrypoints / call-sites:
   - `validateProtocolEnvelope(input: unknown): ValidationResult<ProtocolEnvelope>` in `src/v11/shared/protocol/validators.ts`.
   - `validatePayloadByType(envelopeType, payload, errors): ProtocolEnvelope["payload"]` in `src/v11/shared/protocol/protocolPayloadValidation.ts`.
   - `validateEnvelopeSpecificPayload(...)` and metadata helpers in `src/v11/shared/protocol/protocolPayloadValidationHelpers.ts`.
   - `protocolMessageTypes` and `ProtocolEnvelopePayload` in `src/types/protocol.ts`.
   - Existing protocol validator tests in `tests/core/protocol/validators.test.ts`.
2. Actual touched scope: `contract_or_persisted_authority_foundation`.
3. Mutation entrypoints in scope: N/A; this task changes validation/type contract only.
4. Hidden scope ruled out: Local commit finalization, remote SSH parsing, CLI/API request parsing, and runtime docs are successor tasks in the parent plan.
5. Branch inventory note: valid `COMMIT_RESULT`, invalid missing fields, invalid summary, invalid done-package fields, invalid unknown metadata.
6. Why the declared task shape matches reality: The task adds and validates a protocol event shape without producing it or changing downstream consumers.

### Authority Boundary Map

1. Authority producer: Successor commit runtime tasks produce `COMMIT_RESULT`; this task does not produce envelopes.
2. Stored authority: Transcript envelope schema and validation contract.
3. In-scope consumers: Protocol validator and tests only.
4. Explicit out-of-scope consumers: local commit producer, remote commit executor, CLI output, API/UI router, start/resume prompt/context surfaces, live docs.
5. Export surfaces closed in this phase: The protocol type and validator acceptance/rejection rules for `COMMIT_RESULT`.

### Baseline Preservation

1. Must-preserve behaviors:
   - Existing non-commit envelope validation behavior for `TASK`, `PASS`, `HUMAN_QUESTION`, `HUMAN_REPLY`, `CONVERGENCE`, `APPROVAL_REQUEST`, and `APPROVAL_DECISION`.
   - Existing findings parity metadata validation for non-`COMMIT_RESULT` envelopes.
   - Existing deterministic commit reuse/source-sync runtime behavior remains untouched because producers are out of scope.
2. Allowed resolution paths:
   - Temporary dual protocol acceptance of existing `DONE_PACKAGE` and new `COMMIT_RESULT` is allowed as an integration-slice state only.
3. Forbidden regression interpretations:
   - Do not treat temporary `DONE_PACKAGE` validation as target-state compatibility.
   - Do not require local/remote producers to emit `COMMIT_RESULT` in this task.
4. Replacement proof required if removed: Any removal of `DONE_PACKAGE` validation must be deferred until producer cutover tasks prove local and remote producers no longer emit or require it.

### Success / Completion Proof Boundary

1. Current canonical success proof source: Existing protocol validation accepts known envelope types including `DONE_PACKAGE`.
2. Target canonical success proof source: Protocol validation accepts a valid `COMMIT_RESULT` envelope with closed technical metadata.
3. Current canonical completion proof source: Runtime still emits `DONE_PACKAGE` in current producers; not changed here.
4. Target canonical completion proof source: Successor producer tasks will emit `COMMIT_RESULT`.
5. Reused proof contract: no_reuse.
6. Proof-parity rule: no_reuse.
7. Final truth surfaces affected: Protocol event type and validation result only.
8. Mixed-truth surfaces allowed: Temporary protocol-level coexistence is allowed only as an integration-slice state; no runtime producer or read-model mixed truth is authorized here.

### Precondition and Side-Effect Boundary

1. Primary bounded task shape: `contract_or_persisted_authority_foundation`.
2. Secondary shape (if any): N/A.
3. Preconditions that must pass before side effects: N/A; no runtime side effects are introduced.
4. Side effects forbidden before preconditions pass: N/A.
5. Invalid/precondition-failure behavior: Invalid envelopes return validation errors and are not accepted by `assertValidProtocolEnvelope`.
6. Coordination primitives in scope: N/A.

### In Scope

1. Add `COMMIT_RESULT` to the protocol message type family.
2. Add a closed payload validation contract for `COMMIT_RESULT`.
3. Require `metadata.commit_sha`, `metadata.commit_message`, and `metadata.staged_files`.
4. Reject `payload.summary` for `COMMIT_RESULT`.
5. Reject done-package fields on `COMMIT_RESULT`.
6. Reject unknown `COMMIT_RESULT` metadata keys.
7. Add protocol validator tests for valid and invalid `COMMIT_RESULT` envelopes.
8. Keep any temporary `DONE_PACKAGE` acceptance explicitly classified as integration-slice only.

### Out of Scope

1. Local commit producer cutover.
2. Remote commit execution, SSH marker, output parsing, or sync-back changes.
3. CLI/API/UI-router `auto` to `stageAll` cutover.
4. Removing `donePackagePath` from command result surfaces.
5. Runtime-generated prompt/context cleanup.
6. Live docs cleanup.
7. New crash recovery or retry semantics.

### Safety Defaults

1. Invalid `COMMIT_RESULT` envelopes fail validation.
2. `COMMIT_RESULT` is technical only; if a field looks like prose completion artifact data, reject it.
3. This task must not make Pairflow depend on `COMMIT_RESULT` producers yet.

### Contract Boundary / Blast Radius

1. `contract_boundary_override`: `yes`.
2. Impacted contracts:
   - Event/message payload contract: `ProtocolMessageType`, `ProtocolEnvelopePayload`, protocol envelope validation.
   - No DB/auth/config contract changes.

### Complexity Risk Gate

1. `authority_risk`: `1`
2. `surface_spread`: `1`
3. `identity_join_risk`: `0`
4. `activation_coupling`: `0`
5. `prerequisite_risk`: `0`
6. `acceptance_multiplicity`: `1`
7. `risk_score`: `3`
8. `single-task allowed`: `yes`
9. If `no`, required split: N/A.
10. Identity/join note:
   - canonical identity path: `commit_sha` is a required technical fact but this task does not correlate it to git state.
   - competing identifiers or fallback identities: done-package path/content must not identify commit completion.
11. Authority/source-of-truth note:
   - canonical source: protocol envelope schema/validator for event shape only.
   - forbidden secondary sources: done-package artifact fields and prose summaries.
12. Closure-budget triage:
   - closure buckets touched: `shared_contract`.
   - intentionally collapsed closures: N/A.
   - explicitly deferred closures: `authority_producer`, `internal_execution_consumers`, `workflow_orchestration_consumers`, `read_model_consumers`, `cleanup_recovery_consumers`.
13. Bounded-task-shape decision:
   - primary shape: `contract_or_persisted_authority_foundation`.
   - secondary shape: N/A.
   - why this bounded mix is safe: The task is additive protocol foundation with validation tests only.

## L1 - Change Contract

### 0) Domain / Control Contract

| Item | Rule | Implementation Consequence | Priority | Timing |
|---|---|---|---|---|
| Business invariant | Commit completion is technical git/state/transcript truth, not prose package truth. | `COMMIT_RESULT` must contain only technical commit facts. | P1 | required-now |
| Control model | Commit runtime will control emission later; this task controls schema validation only. | Do not update producers or consumers here. | P1 | required-now |
| Read-path rule | Future consumers may read transcript `COMMIT_RESULT`; current consumers are not cut over. | Validator must accept valid `COMMIT_RESULT` without requiring done-package. | P1 | required-now |
| Forbidden fallback | `DONE_PACKAGE` and `done-package.md` are not target-state fallbacks. | Do not add done-package fields to `COMMIT_RESULT`. | P1 | required-now |
| Allowed resolution path | Temporary dual validation is allowed only as an integration-slice state. | Existing `DONE_PACKAGE` may remain until producer cutover; do not describe it as target compatibility. | P1 | required-now |
| Missing-data rule | Missing `COMMIT_RESULT` is not auto-recovered here. | No recovery/retry code changes. | P1 | required-now |
| Phase boundary | Contract foundation only. | Defer local producer, CLI/API, remote, docs, and cleanup work. | P1 | required-now |

### 0a) Canonical Contract Preservation

| Element | Source Anchor | Required Interpretation | This Task Action | Priority | Timing |
|---|---|---|---|---|---|
| `ProtocolMessageType` | `src/types/protocol.ts` | Enum-like string union defines accepted envelope types. | Add `COMMIT_RESULT`; keep temporary `DONE_PACKAGE` until producer cutover. | P1 | required-now |
| `ProtocolEnvelopePayload.metadata` | `src/types/protocol.ts` | Metadata carries technical fields; no top-level custom payload keys. | Reuse metadata for `COMMIT_RESULT` technical facts. | P1 | required-now |
| Unknown payload keys | `src/v11/shared/protocol/protocolPayloadValidationHelpers.ts` | Non-metadata custom payload fields are rejected. | Preserve existing behavior. | P1 | required-now |
| Findings parity metadata | `src/v11/shared/protocol/protocolPayloadValidationHelpers.ts` | Existing shared metadata validation remains valid for existing envelope types. | Do not regress non-`COMMIT_RESULT` validation. | P1 | required-now |
| `DONE_PACKAGE` | `src/types/protocol.ts` and current commit producers | Current runtime event, but not target state. | Preserve only as temporary integration-slice validation until successor cutover. | P2 | required-now |

### 0b) Scope Reality and Shape Proof

| Item | Rule | Implementation / Review Consequence | Priority | Timing |
|---|---|---|---|---|
| Inspected entrypoints / call-sites | `validateProtocolEnvelope`, `validatePayloadByType`, `validateEnvelopeSpecificPayload`, `protocolMessageTypes`, `validators.test.ts`. | Review should verify no producer or consumer cutover leaked into this task. | P1 | required-now |
| Actual touched scope | Shared event contract foundation. | Implementation changes protocol type and validation only. | P1 | required-now |
| Mutation entrypoints in scope | N/A. | No commit/transcript write path changes. | P1 | required-now |
| Hidden scope ruled out | Commit producer, remote executor, CLI/API, docs, runtime prompts. | These remain successor tasks. | P1 | required-now |
| Branch inventory note | Valid, missing fields, summary present, done-package field present, unknown metadata. | Tests must cover these branches. | P1 | required-now |
| Shape proof | No runtime finalization behavior changes are required. | Primary shape remains `contract_or_persisted_authority_foundation`. | P1 | required-now |

### 0c) Plan Linkage and Successor Impact

| Item | Rule | Implementation / Review Consequence | Priority | Timing |
|---|---|---|---|---|
| Parent gap closed | Phase 1 `commit-result-protocol-contract`. | This task creates the event contract successor producers will use. | P1 | required-now |
| Depends on | Approved parent plan. | No predecessor task required. | P1 | required-now |
| Unlocks / impacts successors | Local producer, CLI/API, remote alignment, live reference cleanup. | Successors inherit field names and rejection rules. | P1 | required-now |
| Task-list impact | Replaces obsolete Phase 1A-1D compatibility task set. | Do not revive additive/compat done-package framing. | P1 | required-now |
| Inherited validation / exit expectation | Valid `COMMIT_RESULT`; invalid summary/missing/unknown/done-package fields rejected. | Tests must prove each acceptance/rejection rule. | P1 | required-now |

### 0d) Shared Contract Compatibility

| Shared Contract | Current Consumers | Change Type (`additive|breaking|N/A`) | This Task Action | Deferred Alignment |
|---|---|---|---|---|
| `ProtocolMessageType` | validators, transcript store, status/list/detail consumers, local commit, remote commit, UI/API protocol projections | additive integration-slice | Add `COMMIT_RESULT`; do not remove `DONE_PACKAGE` yet. | Producer/consumer hard removal in successor tasks. |
| `ProtocolEnvelopePayload.metadata` for `COMMIT_RESULT` | future local/remote commit producers and result consumers | additive integration-slice | Define closed required fields for `COMMIT_RESULT`. | Emission and read-model alignment in successors. |

### 0e) Baseline Preservation

| Current Behavior | Preserve/Replace/Forbid | Required Proof | Priority | Timing |
|---|---|---|---|---|
| Non-`COMMIT_RESULT` envelope validation | preserve | Existing validator tests remain passing. | P1 | required-now |
| Temporary `DONE_PACKAGE` validation before producer cutover | preserve as integration-slice only | Existing commit producers are not changed here. | P2 | required-now |
| Done-package fields as commit result truth | forbid | `COMMIT_RESULT` validator rejects them. | P1 | required-now |
| Prose summary as commit result truth | forbid | `COMMIT_RESULT` validator rejects `payload.summary`. | P1 | required-now |

### 0f) Success / Completion Proof Boundary

| Surface | Current Proof Source | Target Proof Source | Canonical / Compat / Guard | Mixed-Truth Allowed? | Priority | Timing |
|---|---|---|---|---|---|---|
| Protocol validation | `protocolMessageTypes` plus payload validation. | Same validator accepts closed `COMMIT_RESULT`. | canonical | No for `COMMIT_RESULT`; temporary coexistence with `DONE_PACKAGE` is integration-only. | P1 | required-now |
| Runtime commit completion | Current producers emit `DONE_PACKAGE`. | Successor producers emit `COMMIT_RESULT`. | canonical in successors | Not changed here. | P2 | successor |

### 0g) Precondition and Side-Effect Boundary

| Case | Must Be Validated Before | Forbidden Early Side Effects | Required Failure Behavior | Priority | Timing |
|---|---|---|---|---|---|
| Invalid `COMMIT_RESULT` payload | Type-specific payload fields. | N/A; validation is pure. | Return validation errors; assertion throws via existing validator path. | P1 | required-now |

### 1) Call-site Matrix

| ID | File | Function/Entry | Exact Signature (args -> return) | Insertion Point | Expected Behavior | Priority | Timing | Evidence |
|---|---|---|---|---|---|---|---|---|
| CS1 | `src/types/protocol.ts` | `protocolMessageTypes` / `ProtocolMessageType` | readonly string array -> union type | Add `COMMIT_RESULT` to message type family. | `isProtocolMessageType("COMMIT_RESULT")` is true. | P1 | required-now | Unit test validating `COMMIT_RESULT` envelope succeeds. |
| CS2 | `src/types/protocol.ts` | `ProtocolEnvelopePayload` | interface | Metadata remains the carrier for technical commit fields. | Type allows metadata object used by `COMMIT_RESULT`; no new prose payload field required. | P1 | required-now | Typecheck. |
| CS3 | `src/v11/shared/protocol/protocolPayloadValidation.ts` | `validatePayloadByType(envelopeType: string, payload: Record<string, unknown>, errors: ValidationError[]): ProtocolEnvelope["payload"]` | before returning type-specific payload validation | Route `COMMIT_RESULT` through type-specific closed payload validation. | Valid payload returns metadata; invalid payload accumulates errors. | P1 | required-now | Validator tests. |
| CS4 | `src/v11/shared/protocol/protocolPayloadValidationHelpers.ts` | `validateEnvelopeSpecificPayload(envelopeType: string, payload: Record<string, unknown>, validatedPayload: ProtocolEnvelope["payload"], errors: ValidationError[]): ProtocolEnvelope["payload"]` | type-specific validation branch | Enforce required fields and reject summary/done-package/unknown metadata for `COMMIT_RESULT`. | Invalid contract shapes fail validation with specific paths. | P1 | required-now | Validator tests. |
| CS5 | `src/v11/shared/protocol/validators.ts` | `validateProtocolEnvelope(input: unknown): ValidationResult<ProtocolEnvelope>` | type error message | Error message includes `COMMIT_RESULT` in accepted type list. | Invalid type diagnostics stay accurate. | P2 | required-now | Existing invalid type tests or snapshot-free assertion. |
| CS6 | `tests/core/protocol/validators.test.ts` | protocol envelope schema tests | Vitest tests | Add `COMMIT_RESULT` acceptance/rejection tests. | Tests cover valid, summary rejected, missing fields rejected, unknown metadata rejected, done-package fields rejected. | P1 | required-now | `pnpm test -- tests/core/protocol/validators.test.ts`. |

### 2) Data and Interface Contract

| Contract | Current | Target | Required Fields | Optional Fields | Compatibility | Priority | Timing |
|---|---|---|---|---|---|---|---|
| `ProtocolMessageType` | No `COMMIT_RESULT`; includes `DONE_PACKAGE`. | Includes `COMMIT_RESULT`; temporary `DONE_PACKAGE` retained until producer cutover. | N/A | N/A | additive integration-slice | P1 | required-now |
| `COMMIT_RESULT` payload | N/A. | `payload.metadata` contains only technical commit facts. | `metadata.commit_sha`, `metadata.commit_message`, `metadata.staged_files` | none for `COMMIT_RESULT` metadata | additive integration-slice | P1 | required-now |
| `metadata.commit_sha` | N/A. | non-empty string. | yes | no | additive | P1 | required-now |
| `metadata.commit_message` | N/A. | non-empty string. | yes | no | additive | P1 | required-now |
| `metadata.staged_files` | N/A. | non-empty array of non-empty strings. | yes | no | additive | P1 | required-now |
| `payload.summary` for `COMMIT_RESULT` | N/A. | forbidden. | N/A | no | breaking only for invalid future `COMMIT_RESULT` drafts | P1 | required-now |
| Done-package fields for `COMMIT_RESULT` | N/A. | forbidden in payload and metadata. | N/A | no | breaking only for invalid future `COMMIT_RESULT` drafts | P1 | required-now |
| Unknown `COMMIT_RESULT` metadata keys | N/A. | forbidden. | N/A | no | breaking only for invalid future `COMMIT_RESULT` drafts | P1 | required-now |

### 3) Side Effects Contract

| Area | Allowed | Forbidden | Notes | Priority | Timing |
|---|---|---|---|---|---|
| Event/type contract | Add `COMMIT_RESULT` type and validation logic. | Removing producers, writing transcript events, generating files. | Pure validation/type changes only. | P1 | required-now |
| Tests | Add protocol validator tests. | End-to-end commit behavior changes. | Commit producer tests are successor scope. | P1 | required-now |

Constraint: implementation must not introduce runtime side effects.

### 4) Error and Fallback Contract

| Trigger | Dependency (if any) | Behavior (`throw|result|fallback`) | Fallback Value/Action | Reason Code | Log Level | Priority | Timing |
|---|---|---|---|---|---|---|---|
| Missing `metadata.commit_sha` | N/A | result | validation error at `payload.metadata.commit_sha` | COMMIT_RESULT_MISSING_COMMIT_SHA | N/A | P1 | required-now |
| Missing `metadata.commit_message` | N/A | result | validation error at `payload.metadata.commit_message` | COMMIT_RESULT_MISSING_COMMIT_MESSAGE | N/A | P1 | required-now |
| Missing/empty `metadata.staged_files` | N/A | result | validation error at `payload.metadata.staged_files` | COMMIT_RESULT_INVALID_STAGED_FILES | N/A | P1 | required-now |
| `payload.summary` present on `COMMIT_RESULT` | N/A | result | validation error at `payload.summary` | COMMIT_RESULT_SUMMARY_FORBIDDEN | N/A | P1 | required-now |
| done-package field present | N/A | result | validation error at the offending path | COMMIT_RESULT_DONE_PACKAGE_FIELD_FORBIDDEN | N/A | P1 | required-now |
| unknown metadata key present on `COMMIT_RESULT` | N/A | result | validation error at `payload.metadata.<key>` | COMMIT_RESULT_UNKNOWN_METADATA | N/A | P1 | required-now |
| dependency failure | N/A | result | N/A | N/A | N/A | P3 | N/A |

### 5) Dependency Constraints

| Type | Items | Priority | Timing |
|---|---|---|---|
| must-use | Existing protocol validator path: `validateProtocolEnvelope` -> `validatePayloadByType` -> `validateEnvelopeSpecificPayload`. | P1 | required-now |
| must-use | Existing validation primitives such as `isNonEmptyString`, `isRecord`, and array checks consistent with current style. | P2 | required-now |
| must-not-use | done-package artifact reads, transcript mutation helpers, git state, CLI/API parser, remote SSH parser. | P1 | required-now |
| must-not-use | Heuristic summary parsing or prose extraction. | P1 | required-now |

### 6) Test Matrix

| ID | Scenario | Setup | Expected Result | Priority | Timing |
|---|---|---|---|---|---|
| T1 | Accept valid `COMMIT_RESULT`. | Envelope type `COMMIT_RESULT`, metadata has non-empty `commit_sha`, `commit_message`, and `staged_files`. | Validation succeeds and preserves metadata. | P1 | required-now |
| T2 | Reject prose summary. | Valid `COMMIT_RESULT` metadata plus `payload.summary`. | Validation fails at `payload.summary`. | P1 | required-now |
| T3 | Reject missing commit SHA. | `COMMIT_RESULT` metadata omits `commit_sha`. | Validation fails at `payload.metadata.commit_sha`. | P1 | required-now |
| T4 | Reject missing commit message. | `COMMIT_RESULT` metadata omits `commit_message`. | Validation fails at `payload.metadata.commit_message`. | P1 | required-now |
| T5 | Reject invalid staged files. | `staged_files` missing, empty, non-array, or contains empty string. | Validation fails at `payload.metadata.staged_files`. | P1 | required-now |
| T6 | Reject done-package fields. | `COMMIT_RESULT` includes `donePackagePath`, `done_package_path`, `donePackageContent`, or `done_package_content` in payload or metadata. | Validation fails at the offending path. | P1 | required-now |
| T7 | Reject unknown metadata keys. | `COMMIT_RESULT` metadata includes `extra`. | Validation fails at `payload.metadata.extra`. | P1 | required-now |
| T8 | Preserve existing envelope behavior. | Existing PASS/findings validation tests. | Existing tests remain passing. | P1 | required-now |
| T9 | Temporary `DONE_PACKAGE` acceptance not target-state endorsement. | Existing current producers/tests may still reference `DONE_PACKAGE`. | This task does not remove `DONE_PACKAGE`; successor tasks own hard removal. | P2 | required-now |

### 7) Shared Contract Compatibility

| Shared Contract | Current Consumers | Additive vs Breaking | Required Alignment | Out-of-Scope Consumers |
|---|---|---|---|---|
| `ProtocolMessageType` | transcript store, validators, local commit, remote commit, UI/API protocol projections, status/list/detail reads | additive in this task | Add `COMMIT_RESULT` without removing `DONE_PACKAGE`. | Producer/read-model hard removal. |
| `COMMIT_RESULT` metadata | no current producers; future local/remote producers | additive foundation | Define closed fieldset now. | Producer emission and result projection. |

### 8) Baseline Preservation

| Current Behavior | Preserve/Replace/Forbid | Required Proof | Priority | Timing |
|---|---|---|---|---|
| Existing validation of non-commit envelopes | preserve | Full existing `validators.test.ts` still passes. | P1 | required-now |
| Existing runtime producer behavior | preserve in this task | No changes to commit producer files. | P1 | required-now |
| Existing deterministic commit reuse/source-sync | preserve by non-interference | No changes to git-step or finalization producer files. | P2 | required-now |
| Done-package as target finalization contract | replace in successor tasks | This task only records temporary coexistence and new target contract. | P1 | successor |

### 9) Closure-Budget Summary

| Item | Value |
|---|---|
| Closure buckets touched | `shared_contract` |
| Intentionally collapsed closures | N/A |
| Explicitly deferred closures | `authority_producer`, `internal_execution_consumers`, `workflow_orchestration_consumers`, `read_model_consumers`, `cleanup_recovery_consumers` |
| Safe bounded proof | No producer, parser, remote, CLI/API, or docs changes are included. |

### 10) Precondition and Side-Effect Boundary

| Case | Must Be Validated Before | Forbidden Early Side Effects | Required Failure Behavior | Priority | Timing |
|---|---|---|---|---|---|
| Invalid protocol envelope | Envelope type and payload shape. | Transcript write acceptance through `assertValidProtocolEnvelope`. | Validation result fails; assertion throws using existing behavior. | P1 | required-now |

### 11) Success / Completion Proof Boundary

| Surface | Current Proof Source | Target Proof Source | Required Rule | Priority | Timing |
|---|---|---|---|---|
| Protocol validation success | Known message type and type-specific payload validation. | Same, with `COMMIT_RESULT` added and closed. | Valid `COMMIT_RESULT` is accepted; invalid shape rejected. | P1 | required-now |
| Runtime commit completion | Current `DONE_PACKAGE` producer path. | Successor `COMMIT_RESULT` producer path. | Not changed here. | P2 | successor |

## L2 - Hardening Backlog

| ID | Item | Layer | Priority | Timing | Source | Proposed Action |
|---|---|---|---|---|---|---|
| HB1 | Consider extracting reusable closed-metadata validator helpers if more event types need closed fieldsets. | L2 | P3 | later-hardening | Task drafting | Only do this after `COMMIT_RESULT` implementation proves the duplication is real. |

## Assumptions

1. This is the first task from the approved plan and maps to `commit-result-protocol-contract`.
2. Temporary `DONE_PACKAGE` validation may remain in this task because producer hard removal is explicitly assigned to successor tasks.
3. The implementation will keep the current validator architecture unless the implementer finds a smaller equivalent seam.

## Open Questions

No blocking open questions.

