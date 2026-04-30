---
artifact_type: task
artifact_id: task_validation_target_resolution_v1
task_family_id: validation-target-resolution
sequence_key: "2"
task_id: 2-validation-target-resolution
title: "Validation Target Resolution"
status: approved
phase: phase2
target_files:
  - "src/config/repoConfig.ts"
  - "tests/config/repoConfig.test.ts"
  - "src/v11/application/create/repoValidationProfileResolver.ts"
  - "tests/v11/application/create/repoValidationProfileResolver.test.ts"
  - "src/v11/application/create/createCliOptionTypes.ts"
  - "src/v11/application/create/createCliOptionParser.ts"
  - "src/v11/application/create/createCliOptionValidation.ts"
  - "tests/cli/createCommand.test.ts"
  - "tests/v11/application/create/createCliRunner.test.ts"
  - "src/v11/application/create/createBubbleFlowContext.ts"
  - "src/v11/application/create/createCommandRuntime.ts"
  - "src/types/bubble.ts"
  - "src/config/bubbleConfig.ts"
  - "tests/config/bubbleConfig.test.ts"
  - "src/v11/infrastructure/artifact/validation/passValidationEvidenceContract.ts"
  - "src/v11/infrastructure/artifact/validation/passValidationEvidence.ts"
  - "src/v11/infrastructure/executor/validation/passValidationCommandRunner.ts"
  - "tests/v11/infrastructure/executor/validation/passValidationCommandRunner.test.ts"
  - "tests/core/agent/pass.test.ts"
  - "tests/core/bubble/createBubble.test.ts"
  - "tests/core/runtime/passValidationEvidence.test.ts"
prd_ref: null
plan_ref: plans/repo-level-validation-profile-plan-v2.md
system_context_ref: docs/pairflow-initial-design.md
owners:
  - "felho"
doc_bubble_id: 2-validation-target-resolution-doc
impl_bubble_id: null
supersedes: []
superseded_by: null
archive_group: 2026-04-29-repo-level-validation-profile-plan-v2
---

# Task: Validation Target Resolution

## L0 - Policy

### Goal

Add deterministic multi-target validation support on top of the Task 1 single-profile foundation. A repository may define named validation targets, and `bubble create` must resolve exactly one target before writing the created bubble's validation commands and target metadata into `bubble.toml`.

### Domain / Control Model Summary

1. Business invariant: target-aware validation must make the selected validation target explicit and durable for the created bubble.
2. Control model: repo-root `pairflow.toml` `[validation]` remains create-time input only; the selected target and resolved commands written into `.pairflow/bubbles/<id>/bubble.toml` are runtime authority.
3. Read-path rule: `bubble create` may read repo config and create options to select one target; lifecycle/PASS runtime must read only the created bubble config.
4. Forbidden fallback: runtime must not re-resolve targets from repo config, changed files, branch state, task prose, or legacy defaults after bubble creation.
5. Allowed resolution path: explicit create target wins; otherwise a single declared default target may be selected; otherwise create fails fast with an ambiguity or missing-target error.
6. Missing-data rule: missing target config preserves Task 1 single-profile behavior; malformed target config, unresolved target id, ambiguous implicit target selection, or unresolved target command fails before bubble config persistence.
7. Phase boundary:
   - contract closure: target config schema and selected target persistence are in scope
   - producer closure: create-time target selection and command materialization are in scope
   - internal execution closure: PASS runs selected target commands from the persisted bubble config, including target cwd when configured
   - workflow/orchestration closure: only create/PASS integration is in scope; lifecycle state-machine behavior is not
   - read-model closure: out of scope except evidence/log fields needed to show the selected target/cwd
   - cleanup/recovery closure: out of scope

### Plan Linkage

1. Parent gap closed: Task 2 closes the deferred multi-target/monorepo validation slice from `plans/repo-level-validation-profile-plan-v2.md`.
2. Depends on: archived Task 1 `1-repo-validation-profile-base`; this task must preserve Task 1's created-bubble authority model.
3. Unlocks / impacts successors: no successor task is currently reserved in the parent plan.
4. Task-list impact: creates planned task id `2-validation-target-resolution`; it does not replace or obsolete another live task artifact.
5. Inherited validation / exit expectation: relevant unit tests for repo config, create CLI parsing/validation, create config materialization, bubble config parse/render, PASS policy/execution, plus `pnpm lint`, `pnpm typecheck`, and `pnpm build` before lifecycle commands.

### Canonical Contract Anchors

1. Source anchors:
   - `plans/repo-level-validation-profile-plan-v2.md`
   - `plans/archive/tasks/2026-04-29-repo-level-validation-profile-plan-v2/1-repo-validation-profile-base.md`
   - `src/config/repoConfig.ts`
   - `src/v11/application/create/repoValidationProfileResolver.ts`
   - `src/v11/application/create/createBubbleFlowContext.ts`
   - `src/v11/application/create/createCommandRuntime.ts`
   - `src/v11/application/create/createCliOptionTypes.ts`
   - `src/v11/application/create/createCliOptionParser.ts`
   - `src/v11/application/create/createCliOptionValidation.ts`
   - `src/types/bubble.ts`
   - `src/config/bubbleConfig.ts`
   - `src/v11/infrastructure/artifact/validation/passValidationEvidence.ts`
   - `src/v11/infrastructure/executor/validation/passValidationCommandRunner.ts`
2. Canonical elements to preserve: created bubble `[commands]`, ordered `validation_required`, `validation_required_explicit`, command id validation, and PASS execution from bubble config only.
3. New canonical elements: selected `validation_target` metadata in bubble config, target id, optional target cwd, and target-scoped required command ids/command map after create-time resolution.
4. Guard elements: repo target declarations, explicit target option validation, path selector syntax validation, default-target uniqueness, cwd containment, unresolved required id checks, and ambiguity fail-fast errors.
5. Compat elements: repos without target config and existing bubbles without target metadata continue to behave like Task 1.
6. Forbidden reinterpretations: do not make path selectors a runtime fallback authority; do not infer a target from task prose; do not silently choose the first target; do not run PASS from a cwd outside the repo; do not change lifecycle approval/pass state semantics.

### Scope Reality / Shape Proof

1. Inspected entrypoints / call-sites: repo config parser, Task 1 validation resolver, create CLI option surfaces, create flow context, bubble config type/parser/rendering, PASS policy/evidence, PASS command runner cwd handling, and representative tests.
2. Actual touched scope: `contract_or_persisted_authority_foundation` plus adjacent create producer and PASS internal execution consumer support.
3. Mutation entrypoints in scope: bubble creation writes selected validation target and resolved commands; PASS writes validation evidence/logs for target-aware command execution.
4. Hidden scope ruled out: lifecycle state transitions, reviewer evidence reuse, status/list UI, remote executor topology, cleanup/recovery, automatic changed-file target inference, and multi-target fan-out execution.
5. Branch inventory note: no target config, explicit target, default target, missing default, duplicate defaults, unknown target id, invalid target id, invalid selector, invalid/out-of-repo cwd, unresolved required command, target command overriding root command, and PASS target cwd success/failure.
6. Why the task shape matches reality: the bounded change extends the same created-bubble validation authority established by Task 1; it does not introduce runtime repo-config resolution or lifecycle state changes.

### Authority Boundary Map

1. Authority producer: `bubble create` resolves a single validation target and writes selected target metadata plus resolved commands into `bubble.toml`.
2. Stored authority: created bubble config `[commands]` and selected validation target metadata.
3. In-scope consumers: PASS validation policy/execution and PASS evidence/log reporting.
4. Explicit out-of-scope consumers: UI/status/read-model surfaces, reviewer evidence reuse, cleanup/recovery, and any target selection after bubble creation.
5. Runtime authority assertion: PASS may use target cwd and command specs persisted in bubble config; it must not read repo-root `pairflow.toml` or recompute target selection.

### In Scope

1. Extend repo config validation to support named validation targets with command maps, required command ids, optional cwd, optional path selectors, and at most one default target.
2. Add an explicit create-time target selector surface, for example `--validation-target <id>`, with validation and tests.
3. Resolve exactly one target at create time when target config exists.
4. Persist selected target metadata and target-resolved commands into `bubble.toml`.
5. Preserve Task 1 single-profile behavior when no target config is present.
6. Run PASS validation commands from the selected target cwd when configured, while keeping logs/evidence under the existing worktree evidence location.
7. Add tests for config parsing, target resolution, create CLI behavior, bubble config compatibility, PASS cwd behavior, and fail-fast ambiguity cases.

### Out of Scope

1. Automatically inferring target from changed files at PASS runtime.
2. Running validation for multiple targets in one PASS invocation.
3. Lifecycle state-machine changes.
4. Reviewer evidence reuse from implementer-run validation.
5. UI/status/list read models.
6. Remote executor topology changes.
7. Cleanup/recovery behavior changes.

### Safety Defaults

1. No target config means Task 1 behavior remains unchanged.
2. Multiple targets without explicit target or exactly one default fail fast.
3. Target cwd must resolve inside the worktree.
4. Invalid target config fails before new bubble config persistence.
5. Runtime validation fails if the created bubble config references a selected target/cwd/required command that cannot be resolved from the same bubble config.

### Contract Boundary / Blast Radius

1. `contract_boundary_override`: `yes`
2. Impacted contracts: repo config schema, create CLI contract, bubble config shape, PASS evidence/runner contract, and validation command resolution contract.

### Complexity Risk Gate

1. `authority_risk`: `2`
2. `surface_spread`: `2`
3. `identity_join_risk`: `2`
4. `activation_coupling`: `2`
5. `prerequisite_risk`: `1`
6. `acceptance_multiplicity`: `2`
7. `risk_score`: `11`
8. `single-task allowed`: `yes`, only as the target-resolution slice already reserved by the approved parent plan; hidden changed-file inference, read-models, cleanup, remote execution, and multi-target fan-out remain excluded.
9. Identity/join note: target id is canonical only after create writes it into the bubble config; repo target declarations are create-time candidates only.
10. Authority/source-of-truth note: runtime validation authority remains the created bubble config, not repo config.
11. Closure-budget triage:
   - closure buckets touched: shared contract, authority producer, persisted authority, internal execution consumer
   - collapsed closures: target selection, command materialization, and PASS cwd execution are collapsed because they prove the same selected-target authority
   - deferred closures: automatic changed-file inference, read models, cleanup/recovery, remote topology
12. Bounded-task-shape decision:
   - primary shape: `contract_or_persisted_authority_foundation`
   - secondary shape: `authority_producer` and internal execution consumer alignment
   - bounded proof: the task adds selected-target materialization and same-bubble-config PASS execution only.

## L1 - Change Contract

### 0) Domain / Control Contract

| Item | Rule | Implementation Consequence | Priority | Timing |
|---|---|---|---|---|
| Business invariant | Created bubbles must carry the target validation authority they use. | Persist selected target metadata and resolved commands into `bubble.toml`. | P1 | required-now |
| Control model | Repo config is create-time input; bubble config is runtime authority. | PASS must not read repo config. | P1 | required-now |
| Read path | Create resolves target; PASS reads persisted config. | Add target resolver at create boundary only. | P1 | required-now |
| Forbidden fallback | No runtime target recomputation or first-target fallback. | Unknown/ambiguous target selection fails before persistence. | P1 | required-now |
| Missing data | No target config preserves Task 1 behavior. | Existing repos and bubbles stay compatible. | P1 | required-now |
| Phase boundary | Target resolution only, not target inference or fan-out. | Do not implement changed-file inference or multiple-target PASS. | P1 | required-now |

### 0a) Canonical Contract Preservation

| Element | Source Anchor | Required Interpretation | This Task Action | Priority | Timing |
|---|---|---|---|---|---|
| Created bubble `[commands]` | `src/types/bubble.ts`, `src/config/bubbleConfig.ts` | Runtime command authority. | Preserve and add target-resolved materialization. | P1 | required-now |
| `validation_required` | Task 1 anchors | Ordered required command ids for PASS. | Preserve order after target resolution. | P1 | required-now |
| Repo `[validation]` | `src/config/repoConfig.ts` | Create-time config only. | Extend schema with target declarations. | P1 | required-now |
| Selected target metadata | new bubble config fields | Runtime proof of selected target and cwd. | Add parse/render/type support while keeping old configs valid. | P1 | required-now |
| PASS evidence/logs | `passValidationEvidence.ts`, `passValidationCommandRunner.ts` | Evidence of commands actually run. | Include enough target/cwd context to audit execution without moving evidence roots. | P1 | required-now |

### 0b) Scope Reality and Shape Proof

| Item | Rule | Implementation / Review Consequence | Priority | Timing |
|---|---|---|---|---|
| Create CLI is a mutation entrypoint | Explicit target input changes created config. | Validate before persistence. | P1 | required-now |
| Repo config parser is a contract entrypoint | Target syntax must be strict. | Reject malformed target ids, duplicate default target, invalid cwd/selector shapes. | P1 | required-now |
| PASS runner is an execution consumer | Target cwd affects side effects of command execution. | Ensure cwd resolves inside worktree and logs remain in worktree evidence path. | P1 | required-now |
| Hidden scope excluded | No runtime repo lookup or changed-file inference. | Any implementation doing this must route back to plan/task refinement. | P1 | required-now |

### 0c) Plan Linkage and Successor Impact

| Item | Rule | Implementation / Review Consequence | Priority | Timing |
|---|---|---|---|---|
| Parent gap closed | Multi-target/monorepo validation target support. | Completion must satisfy the Task 2 parent-plan deferred scope. | P1 | required-now |
| Depends on | Task 1 archived foundation. | Preserve single-profile behavior and command authority. | P1 | required-now |
| Successor impact | No successor currently reserved. | Do not add new planned work unless a review finds the slice still too broad. | P2 | required-now |

### 1) Call-Site Matrix

| Call Site / Entrypoint | Required Change | Priority | Timing |
|---|---|---|---|
| `parsePairflowRepoConfigToml` / `validatePairflowRepoConfig` | Parse and validate target declarations while preserving no-target behavior. | P1 | required-now |
| `resolveRepoValidationProfileCommands` | Resolve root/default/target command precedence and selected target metadata. | P1 | required-now |
| create CLI parser/validation | Add explicit target option and error handling. | P1 | required-now |
| `prepareCreateBubbleFlowContext` | Pass selected target input into resolver before `buildBubbleConfig`. | P1 | required-now |
| `buildBubbleConfig` | Persist selected target metadata and target-resolved commands. | P1 | required-now |
| bubble config parse/render | Round-trip selected target metadata and old configs. | P1 | required-now |
| `resolvePassValidationPolicy` | Preserve command resolution from bubble config and carry target/cwd context. | P1 | required-now |
| `runPassValidationCommand` | Execute from target cwd when configured and proven inside worktree. | P1 | required-now |

### 2) Data and Interface Contract

| Contract | Required Fields / Shape | Optional Fields | Compatibility Rule | Priority | Timing |
|---|---|---|---|---|---|
| Repo target config | target id, `commands`, `required` | `cwd`, `paths`, `default` | Missing `targets` keeps single-profile behavior. | P1 | required-now |
| Create CLI | `--validation-target <id>` | N/A | Optional unless repo config has multiple targets without one default. | P1 | required-now |
| Bubble config | selected target id and resolved commands | selected target cwd/path metadata | Existing bubbles without target metadata parse unchanged. | P1 | required-now |
| PASS command spec | command id, command string | target id, cwd | Existing command specs without target metadata remain valid. | P1 | required-now |

### 3) Side Effects Contract

| Side Effect | Allowed When | Forbidden When | Priority | Timing |
|---|---|---|---|---|
| Write new bubble config | Target selection and command resolution succeeded. | Target config invalid, target ambiguous, cwd invalid, or required id unresolved. | P1 | required-now |
| Execute PASS command | Command and cwd resolve from created bubble config. | Runtime would need repo config or cwd outside worktree. | P1 | required-now |
| Write PASS logs/evidence | PASS command starts under a valid worktree evidence path. | Log path would escape `.pairflow/evidence`. | P1 | required-now |

### 4) Error and Fallback Contract

| Case | Required Behavior | Priority | Timing |
|---|---|---|---|
| No `validation.targets` | Preserve Task 1 behavior. | P1 | required-now |
| Explicit unknown target | Fail create with actionable target id error. | P1 | required-now |
| Multiple targets and no explicit/default target | Fail create with ambiguity error. | P1 | required-now |
| More than one default target | Fail config validation. | P1 | required-now |
| Target cwd escapes worktree | Fail before persistence or PASS execution. | P1 | required-now |
| Required id missing command | Fail before persistence. | P1 | required-now |
| Existing bubble lacks target metadata | Continue Task 1 PASS behavior. | P1 | required-now |

### 5) Dependency Constraints

| Dependency | Constraint | Failure Handling | Priority | Timing |
|---|---|---|---|---|
| Node path resolution | cwd must resolve under worktree. | Throw schema/create/PASS error before side effects. | P1 | required-now |
| TOML parser | Section syntax supports nested sections, dotted keys do not. | Use parser-supported section shapes; tests must prove examples parse. | P1 | required-now |
| Shell execution | PASS runner still uses `bash -lc`. | Preserve current spawn error mapping. | P2 | required-now |

### 6) Test Matrix

| ID | Scenario | Expected Proof | Priority | Timing |
|---|---|---|---|---|
| T1 | Repo config with no targets. | Task 1 single-profile behavior unchanged. | P1 | required-now |
| T2 | Explicit target selected. | Bubble config contains selected target metadata and target commands. | P1 | required-now |
| T3 | Single default target selected without CLI option. | Bubble config materializes that target. | P1 | required-now |
| T4 | Multiple targets without explicit/default target. | Create fails before persistence. | P1 | required-now |
| T5 | Duplicate default targets. | Config validation fails. | P1 | required-now |
| T6 | Unknown explicit target. | Create validation/resolution fails with target id. | P1 | required-now |
| T7 | Target cwd outside repo. | Fail before persistence or PASS execution. | P1 | required-now |
| T8 | PASS target cwd execution. | Runner uses target cwd, evidence/log remains under worktree. | P1 | required-now |
| T9 | Existing bubble config without target metadata. | PASS policy remains compatible. | P1 | required-now |
| T10 | Target required id unresolved. | Create fails before persistence. | P1 | required-now |

### 7) Shared Contract Compatibility

| Shared Contract | Current Consumers | Change Type | This Task Action | Deferred Alignment |
|---|---|---|---|---|
| Repo config schema | create flow | additive with stricter validation for malformed target fields | Add target fields and tests. | N/A |
| Bubble config `[commands]` / target metadata | create, PASS, tests | additive | Preserve old configs; persist selected target metadata. | UI/read-model display out of scope |
| PASS command spec/evidence | PASS runner, reviewer compatibility tests | additive | Carry target/cwd context without breaking old artifacts. | Evidence reuse out of scope |

### 8) Baseline Preservation

| Behavior | Preservation Rule | Priority | Timing |
|---|---|---|---|
| Missing repo config | Return empty config and legacy defaults. | P1 | required-now |
| Missing target config | Use Task 1 single-profile resolver behavior. | P1 | required-now |
| Runtime authority | PASS reads bubble config only. | P1 | required-now |
| Existing fixed command ids | Continue to parse/render/run. | P1 | required-now |
| `validation_required_explicit` | Preserve explicit empty policy semantics. | P1 | required-now |

### 9) Precondition and Side-Effect Boundary

1. Preconditions before create persistence: target schema validation, explicit/default target resolution, cwd containment, required id resolution, and command string validation.
2. Side effects forbidden before those pass: creating/mutating the bubble directory/config for invalid target inputs.
3. Preconditions before PASS execution: created bubble config must provide required command ids, command strings, and any target cwd; cwd must resolve inside worktree.
4. Coordination primitives: N/A.

### 10) Success / Completion Proof Boundary

N/A. This task does not change Pairflow lifecycle success/completion semantics. PASS success remains command execution success recorded in PASS evidence/logs.

## L2 - Implementation Notes

1. Prefer a small resolver type that separates repo target candidates from the resolved created-bubble command output.
2. Keep target cwd resolution in one helper used by create validation and PASS runtime to avoid divergent path-containment behavior.
3. Use parser-supported TOML section examples in tests, for example nested `[validation.targets.web]` and `[validation.targets.web.commands]` sections.

## Assumptions

1. The explicit create selector should be named `--validation-target` unless review selects a different CLI name.
2. Path selectors are schema-validated in this slice, but automatic changed-file inference is intentionally out of scope.

## Open Questions

None blocking for draft review.

## Review Status

ReviewSpec task-mode decision: `approve_task`.

Approval provenance: local delegated ReviewSpec pass over `plans/tasks/repo-level-validation-profile-plan-v2/2-validation-target-resolution.md` and parent plan `plans/repo-level-validation-profile-plan-v2.md` after Task 1 archive aftermath. Execution metadata, parent-plan linkage, target-file reality, control model, closed-contract drift, authority fan-out, closure budget, bounded-task shape, and remaining-task viability gates passed for document-bubble routing.

## Hardening Backlog

| ID | Item | Layer | Priority | Timing | Source | Proposed Action |
|---|---|---|---|---|---|---|
| HB1 | Changed-file target inference | create/runtime | P2 | later-hardening | plan deferred scope risk | Add only after a separate task defines deterministic matching and ambiguity behavior. |
| HB2 | Multi-target fan-out PASS | PASS runtime | P2 | later-hardening | monorepo expansion | Split into a future task if one bubble must validate multiple targets. |
