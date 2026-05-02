---
artifact_type: task
artifact_id: task_meta_review_approve_validation_gate_phase1_v1
task_family_id: meta-approve-validation-gate
sequence_key: "1"
task_id: 1-meta-approve-validation-gate
title: "Meta-Review Approve Validation Gate"
status: approved
phase: phase1
target_files:
  - "README.md"
  - "pairflow.toml"
  - "src/types/bubble.ts"
  - "src/config/repoConfig.ts"
  - "src/config/bubbleConfig.ts"
  - "src/v11/application/create/repoValidationProfileResolver.ts"
  - "src/v11/application/create/createValidationCommandsConfig.ts"
  - "src/v11/application/pass/passValidationGate.ts"
  - "src/v11/shared/metaReviewGate/metaReviewGateCurrentRunFinalization.ts"
  - "src/v11/shared/metaReviewGate/metaReviewGateCurrentRunRoutePersistence.ts"
  - "src/v11/shared/metaReviewGate/metaReviewGateCurrentRunTypes.ts"
  - "src/v11/infrastructure/executor/validation/passValidationCommandRunner.ts"
  - "src/v11/infrastructure/artifact/validation/metaReviewApproveValidationEvidence.ts"
  - "src/v11/infrastructure/artifact/validation/metaReviewApproveValidationEvidenceContract.ts"
  - "tests/config/repoConfig.test.ts"
  - "tests/config/bubbleConfig.test.ts"
  - "tests/v11/application/create/repoValidationProfileResolver.test.ts"
  - "tests/v11/application/pass/passValidationGate.test.ts"
  - "tests/v11/shared/metaReviewGate/metaReviewGateCurrentRunFinalization.test.ts"
prd_ref: null
plan_ref: plans/meta-review-approve-validation-gate-plan-v1.md
system_context_ref: docs/pairflow-initial-design.md
normative_refs:
  - plans/meta-review-approve-validation-gate-plan-v1.md
  - plans/archive/plans/2026-04-29-repo-level-validation-profile-plan-v2.md
  - docs/reviewer-evidence-governance.md
  - docs/meta-review-gate-prd.md
owners:
  - "felho"
doc_bubble_id: null
impl_bubble_id: null
supersedes: []
superseded_by: null
archive_group: 2026-05-02-meta-review-approve-validation-gate-plan-v1
---

# Task: Meta-Review Approve Validation Gate

## L0 - Policy

### Goal

Introduce a separate configurable validation gate that runs before meta-review approve can route to human approval, so full test suites can move out of the fast implementation PASS loop without losing final confidence.

### Domain / Control Model Summary

1. Business invariant: Pairflow must keep fast implementation feedback while requiring configured full-suite confidence before final approval.
2. Control model: repo-root `pairflow.toml` controls create-time defaults; created bubble `bubble.toml` controls runtime validation.
3. Read-path rule: PASS and meta-review gate runtime must read validation policies from the bubble config.
4. Forbidden fallback: runtime must not infer approve validation from prompt text, repo config, or hardcoded Pairflow repo assumptions.
5. Allowed resolution path: `bubble create` resolves repo validation defaults into `bubble.toml`, then runtime consumes persisted command ids and command strings.
6. Missing-data rule: missing approve-gate policy preserves existing approve routing; malformed configured policy fails closed before `human_gate_approve`.
7. Phase boundary:
   - contract closure: owned here
   - producer closure: owned here
   - internal execution closure: owned here
   - workflow/orchestration closure: owned here for meta-review approve routing
   - read-model closure: deferred unless existing output requires a failure diagnostic field
   - activation closure: owned here for Pairflow repo `pairflow.toml`
   - cleanup/recovery closure: out of scope

### Plan Linkage

1. Parent plan gap closed: separate PASS-loop validation from final meta-review approve validation.
2. Depends on: repo-level validation profile V2 baseline in `plans/archive/plans/2026-04-29-repo-level-validation-profile-plan-v2.md`.
3. Unlocks / impacts successors: future UI/read-model surfacing of approve-gate validation evidence.
4. Task-list impact: creates first task in `plans/meta-review-approve-validation-gate-plan-v1.md`.
5. Inherited validation / exit expectation: implementation must keep `fitness` in the fast PASS-loop policy and move full `pnpm test` to the approve gate for this repository.

### Canonical Contract Anchors

1. Source-of-truth anchors:
   - `src/config/repoConfig.ts`
   - `src/config/bubbleConfig.ts`
   - `src/v11/application/create/repoValidationProfileResolver.ts`
   - `src/v11/application/pass/passValidationGate.ts`
   - `src/v11/shared/metaReviewGate/metaReviewGateCurrentRunFinalization.ts`
2. Canonical elements:
   - `validation.required`: repo create-time PASS-required ids.
   - `commands.validation_required`: bubble runtime PASS-required ids.
   - New repo approve-gate field: `validation.meta_review_approve_required`.
   - New bubble approve-gate field: `commands.meta_review_approve_required`.
3. Guard elements:
   - command id validation and duplicate detection.
   - existence of command strings for all required ids.
   - no side effects before approve-gate validation passes.
4. Compat-only elements: absent `meta_review_approve_required` means legacy behavior, not an implicit full-test requirement.
5. Forbidden reinterpretations:
   - Do not overload `validation.required` to mean both PASS and approve gate.
   - Do not run full `pnpm test` during PASS unless it is explicitly listed in `commands.validation_required`.
   - Do not treat reviewer-run tests as satisfying the meta-review approve gate unless a future task adds trusted reuse.

### Scope Reality / Shape Proof

1. Inspected entrypoints / call-sites:
   - `pairflow.toml`
   - `package.json`
   - `src/config/repoConfig.ts`
   - `src/config/bubbleConfig.ts`
   - `src/v11/application/create/repoValidationProfileResolver.ts`
   - `src/v11/application/create/createValidationCommandsConfig.ts`
   - `src/v11/application/pass/passValidationGate.ts`
   - `src/v11/shared/metaReviewGate/metaReviewGateCurrentRunFinalization.ts`
   - `src/v11/shared/metaReviewGate/metaReviewGateCurrentRunRoutePersistence.ts`
2. Actual touched scope: contract foundation plus producer and one workflow consumer.
3. Mutation entrypoints in scope:
   - bubble create config writing path,
   - meta-review gate finalization before `persistResolvedHumanRoute`.
4. Hidden scope ruled out: approval command/human `bubble approve` is not the intended boundary; the correct boundary is meta-review `recommendation=approve` before `human_gate_approve`.
5. Branch inventory note: absent policy, configured success, configured failure, unresolved command id, duplicate id, non-approve recommendation, clean-rerun threshold not yet met.
6. Why the declared task shape matches reality: the config producer and approve-route consumer are tightly coupled by the new persisted field and can be implemented as one bounded slice.

### Authority Boundary Map

1. Authority producer: repo config parser and bubble create resolver produce persisted bubble validation policy.
2. Stored authority: `.pairflow/bubbles/<id>/bubble.toml` `[commands]`.
3. In-scope consumers: PASS prompt guidance surface only insofar as it reads existing PASS policy; meta-review gate approve routing.
4. Explicit out-of-scope consumers: UI dashboards, evidence reuse across validation phases, human approval command semantics.
5. Export surfaces closed in this phase: yes, config parse/render and meta-review gate routing behavior.

### Baseline Preservation

1. Must-preserve behaviors:
   - repositories without the new config field keep existing meta-review approve routing.
   - `commands.validation_required` continues to govern PASS validation only.
   - docs-only bubbles remain exempt from PASS runtime validation unless separately configured in existing behavior.
2. Allowed resolution paths: create-time explicit command overrides still win over repo config for existing supported command ids.
3. Forbidden regression interpretations: do not make repo config a runtime fallback after bubble creation.
4. Replacement proof required if removed: no existing field may be removed; this task is additive.

### Success / Completion Proof Boundary

1. Current canonical success proof source: meta-review clean approve plus parity/threshold checks can route to `human_gate_approve`.
2. Target canonical success proof source: same checks plus successful configured `commands.meta_review_approve_required` execution when present.
3. Current canonical completion proof source: persisted `APPROVAL_REQUEST` and state transition to `READY_FOR_HUMAN_APPROVAL`.
4. Target canonical completion proof source: persisted `APPROVAL_REQUEST` and state transition only after approve-gate validation succeeds.
5. Reused proof contract: validation command execution may reuse the existing PASS validation runner mechanics, but must write distinct approve-gate evidence logs.
6. Proof-parity rule: narrowed_here_with_proof.
7. Final truth surfaces affected: meta-review gate route/result and evidence refs/diagnostics.
8. Mixed-truth surfaces allowed: none.

### Precondition and Side-Effect Boundary

1. Primary bounded task shape: contract_or_persisted_authority_foundation.
2. Secondary shape: workflow_orchestration_closure for meta-review approve routing.
3. Preconditions that must pass before side effects:
   - approve-gate command ids resolve to configured command strings.
   - all configured approve-gate commands exit successfully.
4. Side effects forbidden before preconditions pass:
   - appending `APPROVAL_REQUEST` for `human_gate_approve`.
   - transitioning state to `READY_FOR_HUMAN_APPROVAL` for approve route.
5. Invalid/precondition-failure behavior: no `human_gate_approve` route and no `READY_FOR_HUMAN_APPROVAL` state transition; use the existing fail-closed `human_gate_dispatch_failed` route with diagnostics.
6. Coordination primitives in scope: existing meta-review gate lock/state persistence only; no new lock primitive.

### In Scope

1. Add repo config support for `validation.meta_review_approve_required`.
2. Add bubble config support for `commands.meta_review_approve_required`.
3. Resolve and materialize the approve-gate required list at bubble create time.
4. Run approve-gate commands before `human_gate_approve`.
5. Write distinct evidence logs for approve-gate validation.
6. Update `pairflow.toml` so PASS requires `lint`, `typecheck`, and `fitness`, while approve gate requires `test`.
7. Update implementer-facing validation guidance if it currently implies full tests are part of normal PASS feedback.

### Out of Scope

1. Reusing prior PASS/test evidence for approve-gate validation.
2. UI display of approve-gate validation evidence.
3. Running approve-gate validation for non-approve meta-review recommendations.
4. Changing human `bubble approve` semantics.
5. Introducing a separate targeted-test discovery engine.
6. Changing existing persistence failure semantics if writing the fail-closed `human_gate_dispatch_failed` route itself fails.

### Safety Defaults

1. Additive config only; absent new field preserves current behavior.
2. Fail closed on configured approve-gate failure before approval side effects.
3. Keep PASS and approve validation evidence names distinct.
4. Keep command ids explicit; no implicit `test` requirement unless configured.

### Contract Boundary / Blast Radius

1. `contract_boundary_override`: `yes`
2. Impacted contracts:
   - config contract: `pairflow.toml` and bubble `[commands]`,
   - runtime validation policy contract,
   - meta-review gate approve routing contract,
   - evidence artifact/log naming contract.

### Complexity Risk Gate

1. `authority_risk`: `2`
2. `surface_spread`: `2`
3. `identity_join_risk`: `0`
4. `activation_coupling`: `1`
5. `prerequisite_risk`: `1`
6. `acceptance_multiplicity`: `2`
7. `risk_score`: `8`
8. `single-task allowed`: `yes`
9. If `no`, required split: N/A
10. Identity/join note:
   - canonical identity path: validation command ids in bubble config.
   - competing identifiers or fallback identities: repo config and prompt prose are not runtime identities.
11. Authority/source-of-truth note:
   - canonical source: created bubble `bubble.toml`.
   - forbidden secondary sources: repo config at runtime, reviewer prose, previous evidence logs.
12. Closure-budget triage:
   - closure buckets touched: contract, producer, workflow orchestration, internal execution.
   - intentionally collapsed closures: producer plus first consumer, because the new field has no value without the approve-route consumer.
   - explicitly deferred closures: UI/read-model, evidence reuse.
13. Bounded-task-shape decision:
   - primary shape: contract_or_persisted_authority_foundation.
   - secondary shape: workflow_orchestration_closure.
   - why this bounded mix is safe: one new persisted config field is consumed at one routing boundary.
14. Contract-dense decision:
   - gate triggered: yes
   - trigger reasons: structured payload/config schema, fallback/precedence, split ownership, downstream consumers, mirrored surfaces
   - canonical matrix source: L1 Canonical Contract Matrix
   - mirrored surfaces: L0 policy, config contract, runtime gate, evidence naming, tests, Pairflow repo config.

## L1 - Change Contract

### Canonical Contract Matrix

| Surface | Field / Behavior | Authority | Required Rule | Failure Behavior | Tests |
|---|---|---|---|---|---|
| Repo config | `validation.required` | repo create-time defaults | PASS-required command ids only | invalid id/duplicate fails config validation | repo config parser |
| Repo config | `validation.meta_review_approve_required` | repo create-time defaults | approve-gate-required command ids only | invalid id/duplicate/unresolved command fails create/config validation | repo config parser, create resolver |
| Repo config | `validation.commands.<id>` | repo create-time command map | every required id without built-in default must have a command string | fail fast | repo config parser, create resolver |
| Bubble config | `commands.validation_required` | runtime PASS policy | consumed only by PASS validation | existing PASS failure behavior | bubble config, PASS tests |
| Bubble config | `commands.meta_review_approve_required` | runtime approve-gate policy | consumed only before `human_gate_approve` | fail closed before approve side effects | bubble config, meta-review gate tests |
| Evidence logs | approve-gate validation log path | approve-gate runner | `.pairflow/evidence/meta-review-approve-validation-<command-id>-<timestamp>.log`; never `.pairflow/evidence/pass-validation-*.log` | failing command path included in diagnostics | runtime tests |
| Pairflow repo config | `pairflow.toml` | repository policy | PASS = lint/typecheck/fitness; approve gate = test | N/A | parser/create tests |

### 0) Domain / Control Contract

| Item | Rule | Implementation Consequence | Priority | Timing |
|---|---|---|---|---|
| Business invariant | Full tests move to final approve gate, not every PASS | Implement separate policy list | P1 | required-now |
| Control model | Bubble config is runtime authority | Persist approve policy during create | P1 | required-now |
| Read-path rule | Runtime reads `commands.meta_review_approve_required` | No repo config lookup in gate finalization | P1 | required-now |
| Forbidden fallback | No implicit test command at runtime | Missing field means no approve-gate validation | P1 | required-now |
| Allowed resolution path | Explicit input > repo config > built-in default where defined | Extend existing resolver | P1 | required-now |
| Missing-data rule | Invalid configured command ids fail closed | Add validation and tests | P1 | required-now |
| Phase boundary | UI/evidence reuse deferred | Keep implementation bounded | P2 | required-now |

### 0a) Canonical Contract Preservation

| Element | Source Anchor | Required Interpretation | This Task Action | Priority | Timing |
|---|---|---|---|---|---|
| `validation.required` | repo validation profile plan V2 | PASS-required ids | preserve | P1 | required-now |
| `commands.validation_required` | `passValidationGate.ts` | PASS runtime authority | preserve | P1 | required-now |
| `human_gate_approve` | `metaReviewGateCurrentRunFinalization.ts` | approve recommendation route after checks | add pre-route validation | P1 | required-now |
| `pairflow.toml` | repo root | create-time defaults | update policy split | P1 | required-now |

### 0b) Scope Reality and Shape Proof

| Item | Rule | Implementation / Review Consequence | Priority | Timing |
|---|---|---|---|---|
| Inspected entrypoints / call-sites | Config parser, create resolver, PASS gate, meta-review finalizer | Review must verify all four surfaces | P1 | required-now |
| Actual touched scope | Contract + producer + first workflow consumer | No unrelated UI work | P1 | required-now |
| Mutation entrypoints in scope | Bubble create writes config; meta-review finalizer appends state/envelope | Validate before side effects | P1 | required-now |
| Hidden scope ruled out | Human approval command is not touched | Avoid changing `bubble approve` | P1 | required-now |
| Branch inventory note | absent/success/failure/threshold-rerun/non-approve | Tests must cover routing boundaries | P1 | required-now |
| Shape proof | One new policy list and one consumer boundary | Single task remains bounded | P1 | required-now |

### 0c) Plan Linkage and Successor Impact

| Item | Rule | Implementation / Review Consequence | Priority | Timing |
|---|---|---|---|---|
| Parent gap closed | split PASS and approve validation | Must update repo config and runtime | P1 | required-now |
| Depends on | repo-level validation profile V2 | Reuse existing command-id validation model | P1 | required-now |
| Unlocks / impacts successors | UI/read-model surfacing | Defer unless current tests require output updates | P2 | deferred |
| Task-list impact | first task in plan | No supersession | P1 | required-now |
| Inherited validation / exit expectation | full `pnpm test` proves final implementation | Mention skipped broad commands only if not run | P1 | required-now |

### 0d) Shared Contract Compatibility

| Shared Contract | Current Consumers | Change Type | This Task Action | Deferred Alignment |
|---|---|---|---|---|
| Repo validation config | create resolver | additive | add approve-gate list | N/A |
| Bubble `[commands]` config | PASS, prompts, meta-review gate | additive | add runtime approve-gate list | UI surfacing |
| Meta-review route result | converged/pass/UI readers | additive behavior | preserve route names, add precondition | optional diagnostics projection |

### 1) Implementation Requirements

| ID | Requirement | Priority | Timing |
|---|---|---|---|
| R1 | Parse and validate `validation.meta_review_approve_required` in repo config with the same command-id rules as `validation.required`. | P1 | required-now |
| R2 | Extend create-time validation resolution to return `metaReviewApproveRequired` and require every id to resolve to a command string. | P1 | required-now |
| R3 | Persist `commands.meta_review_approve_required` in bubble config and render/roundtrip it in TOML. | P1 | required-now |
| R4 | Do not include `test` in Pairflow repo PASS `validation.required` unless intentionally configured. | P1 | required-now |
| R5 | Before `persistResolvedHumanRoute` can route `human_gate_approve`, run configured approve-gate commands. | P1 | required-now |
| R6 | If an approve-gate command fails, route fail-closed without appending a successful approval request. | P1 | required-now |
| R7 | Write approve-gate evidence logs using names that cannot be confused with PASS validation logs. | P1 | required-now |
| R8 | Update implementer guidance so normal code-scope loop names lint/typecheck/fitness/targeted tests, not full suite by default. | P2 | required-now |

### 2) Error and Fallback Contract

| Trigger | Behavior | Reason / Diagnostic | Priority | Timing |
|---|---|---|---|---|
| Missing `meta_review_approve_required` | preserve current routing | no approve-gate configured | P1 | required-now |
| Empty `meta_review_approve_required=[]` | explicit no approve-gate commands | accepted only if represented unambiguously | P2 | required-now |
| Required id has no command | fail fast at create/config validation | unresolved command id | P1 | required-now |
| Approve-gate command exits nonzero | no `human_gate_approve`; route `human_gate_dispatch_failed` | include command id/log path/exit code | P1 | required-now |
| Runner spawn/log error | no `human_gate_approve`; route `human_gate_dispatch_failed` | include stage/log path; log-path may be null only when log setup itself failed | P1 | required-now |
| Non-approve recommendation | do not run approve-gate commands | gate is approve-only | P1 | required-now |
| Clean-run threshold requires rerun | route `meta_review_running` before approve-gate validation | avoid repeated full suite during clean-rerun threshold | P1 | required-now |

### 2a) Approve-Gate Diagnostic Payload

| Failure Source | Required Diagnostic Keys | Notes |
|---|---|---|
| Command exits nonzero | `stage="exec"`, `commandId`, `exitCode`, `logPath` | `logPath` must use the approve-gate evidence prefix. |
| Runner spawn failure | `stage="spawn"`, `commandId`, `exitCode=null`, `logPath` | Include `logPath` when the runner can create one before failure. |
| Evidence log setup/write failure | `stage="log"`, `commandId`, `exitCode=null`, `logPath=null` | Use when the runner cannot create or write the approve-gate evidence log. |
| Command resolution failure | `stage="resolve"`, `commandId`, `exitCode=null`, `logPath=null` | Create-time validation should normally catch this first. |

### 3) Test Matrix

| ID | Scenario | Given | When | Then | Priority |
|---|---|---|---|---|---|
| T1 | repo config parses approve policy | `validation.meta_review_approve_required=["test"]` | parse repo config | field is present and validated | P1 |
| T2 | repo config rejects duplicate approve ids | duplicate id | parse repo config | schema error; legacy `validation.required` duplicate coverage remains in existing shared parser tests | P1 |
| T3 | create materializes split policy | repo requires PASS `fitness`, approve `test` | bubble create resolver runs | bubble config has both lists | P1 |
| T4 | bubble config roundtrips approve policy | `commands.meta_review_approve_required=["test"]` | parse/render/parse | list preserved | P1 |
| T5 | PASS ignores approve-only test | PASS list lacks `test`, approve list has `test` | implementer PASS runs | only PASS list executes | P1 |
| T6 | approve success runs full test | approve list has `test`, runner exits 0 | meta-review approve finalizes | route is `human_gate_approve` | P1 |
| T7 | approve test failure blocks approve route | runner exits nonzero | meta-review approve finalizes | route is `human_gate_dispatch_failed`, no `human_gate_approve`, no `READY_FOR_HUMAN_APPROVAL` state | P1 |
| T8 | non-approve skips approve gate | recommendation rework/inconclusive | finalizer runs | approve-gate runner is not called | P1 |
| T9 | clean-run threshold rerun skips full test | streak below required threshold | finalizer runs | route is `meta_review_running` and approve-gate runner is not called | P1 |
| T10 | Pairflow repo config policy | repo `pairflow.toml` updated | parser reads it | PASS list excludes `test`, approve list includes `test` | P1 |
| T11 | explicit empty approve policy | `commands.meta_review_approve_required=[]` | meta-review approve finalizes | no approve-gate commands run and legacy approve routing is preserved | P2 |
| T12 | unresolved approve command id fails create/config | approve list references id without a command string | create resolver runs | fail fast before bubble runtime consumes the policy | P1 |
| T13 | implementer guidance reflects split policy | README validation profile guidance is updated | docs/examples are inspected | normal PASS guidance names lint/typecheck/fitness/targeted tests and describes full test as approve-gate validation | P2 |

## L2 - Implementation Notes

Canonical term: use `meta-review approve validation gate` for the feature and `approve-gate validation` for the command execution step.

1. Prefer extending existing validation command id helpers instead of adding a parallel id grammar.
2. Prefer reusing `runPassValidationCommand` mechanics only through an approve-gate wrapper that supplies approve-specific evidence filenames; do not edit PASS evidence artifacts unless extracting shared primitives is strictly required and tests prove PASS artifact compatibility.
3. The meta-review approve gate must run after clean approval and clean-run threshold checks determine that this run would otherwise route to `human_gate_approve`, and before the state/envelope side effects of that route.
4. Failure routing should reuse existing `persistDispatchFailedHumanRoute` or equivalent fail-closed path with a clear fallback reason; do not invent a new lifecycle state or a new gate route.
5. Update `pairflow.toml` to:
   - keep `fitness = "pnpm fitness:check:ci"`;
   - set PASS `required` to `["lint", "typecheck", "fitness"]`;
   - set approve-gate required to `["test"]`.
6. Update README validation profile guidance so examples and prose distinguish PASS-required commands from meta-review approve-required commands.

## Acceptance Criteria

1. AC1: New repo config field `validation.meta_review_approve_required` parses, validates, and rejects invalid/duplicate ids.
2. AC2: New bubble config field `commands.meta_review_approve_required` parses, renders, and roundtrips.
3. AC3: Bubble creation persists both PASS and meta-review approve validation policies from repo config.
4. AC4: PASS validation no longer runs full `pnpm test` for Pairflow repo policy unless explicitly listed in `commands.validation_required`.
5. AC5: Meta-review approve route runs configured approve-gate commands before `human_gate_approve`.
6. AC6: Approve-gate failure routes `human_gate_dispatch_failed`, prevents `human_gate_approve` / `READY_FOR_HUMAN_APPROVAL`, and records actionable command diagnostics with the required keys in `Approve-Gate Diagnostic Payload`.
7. AC7: Pairflow repo `pairflow.toml` reflects the intended split policy.
8. AC8: Targeted tests cover config, create-time materialization, PASS separation, meta-review approve success/failure, non-approve skip, clean-rerun-threshold skip, empty approve policy, unresolved approve command ids, and guidance updates.

## Verification Commands

1. `pnpm exec vitest run tests/config/repoConfig.test.ts tests/config/bubbleConfig.test.ts tests/v11/application/create/repoValidationProfileResolver.test.ts tests/v11/application/pass/passValidationGate.test.ts tests/v11/shared/metaReviewGate/metaReviewGateCurrentRunFinalization.test.ts`
2. `pnpm typecheck`
3. `pnpm lint`
4. `pnpm fitness:check:ci`
5. `pnpm test`
6. `pnpm build`

## Rollout Notes

1. This repository should use the split policy immediately after implementation.
2. Existing bubbles keep their persisted config and are not migrated by this task.
3. If a bubble should use the new policy, create a fresh bubble after the repo config change or update the bubble config explicitly under operator control.
