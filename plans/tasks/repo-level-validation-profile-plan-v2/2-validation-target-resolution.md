---
artifact_type: task
artifact_id: task_validation_target_resolution_v1
task_family_id: validation-target-resolution
sequence_key: "2"
task_id: 2-validation-target-resolution
title: "Validation Target Resolution"
status: implementable
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
7. Precedence closure: explicit create command inputs override selected target commands; selected target commands override root `validation.commands`; root `validation.commands` override legacy built-in defaults. The selected target's `required` list is authoritative when a target is selected and must materialize into created-bubble `commands.validation_required`; root `validation.required` is used only for no-target Task 1 behavior.

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
| `resolveRepoValidationProfileCommands` | Resolve four-tier precedence: explicit create command input, selected target command, root validation command, then legacy built-in default; return selected target metadata with the materialized command output. | P1 | required-now |
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

#### Create-Time Override Surface

1. The new target selector is `--validation-target <id>` and maps to the create command contract as `validationTarget`.
2. Existing explicit create command inputs remain the only command override surface for this task: `testCommand`, `typecheckCommand`, and `bootstrapCommand`. The currently exposed CLI flag among these is `--bootstrap-command`; adding a new `lintCommand` create input is out of scope for this task.
3. This task must not silently introduce a broad `--validation-command <id>=<cmd>` CLI surface. If such a surface is needed, it belongs in a separate CLI-contract task.
4. Precedence tests must prove explicit create command inputs override selected target commands through the create command contract, using `bootstrapCommand` as the explicit built-in command input and at least one selected-target override of a root command, without requiring a new public CLI command-map flag.

#### Concrete Repo Config Shape

The implementation must use parser-supported section syntax, not dotted keys or array-of-tables:

```toml
[validation]
required = ["typecheck", "test"]

[validation.commands]
typecheck = "pnpm typecheck"
test = "pnpm test"

[validation.targets.web]
default = true
cwd = "apps/web"
paths = ["apps/web/**", "packages/ui/**"]
required = ["lint", "typecheck", "test"]

[validation.targets.web.commands]
lint = "pnpm --filter web lint"
typecheck = "pnpm --filter web typecheck"
test = "pnpm --filter web test"
```

Rules:

1. Target ids and command ids use the existing validation command id character rule exactly; do not introduce a broader or narrower target-id charset in this task.
2. `validation.targets.<id>` must be an object/section.
3. `validation.targets.<id>.commands` must be an object/section of non-empty shell command strings.
4. `validation.targets.<id>.required` is required and must be an ordered array of unique command ids; `[]` is valid and must persist as an explicit empty PASS policy.
5. `validation.targets.<id>.default`, when present, must be boolean.
6. `validation.targets.<id>.cwd`, when present, must be a non-empty relative path that resolves inside the repo/worktree after normalization.
7. `validation.targets.<id>.paths`, when present, must be an ordered array of non-empty normalized relative path selectors. A valid selector must use `/` separators, must not be absolute, must not contain `.` or `..` path segments, must not contain empty path segments, and may use `*` / `**` glob tokens only as inert metadata. Selectors are stored/validated only and must not drive automatic runtime target selection in this task.
8. Root `validation.required` and root `validation.commands` remain valid for Task 1 single-profile behavior and as root-level fallback inputs for target command resolution. In no-target mode, root `validation.required = []` preserves Task 1 explicit-empty semantics by writing `commands.validation_required = []` and `commands.validation_required_explicit = true`.
9. Reserved target ids are forbidden: `id`, `commands`, `required`, `default`, `cwd`, `paths`, `targets`, `validation`, and built-in command ids `lint`, `test`, `typecheck`, and `bootstrap`. This avoids ambiguous mental models between target ids, target fields, and command ids even when TOML section syntax could technically represent the shape.
10. When a selected target has `cwd`, every materialized required command for that target executes from that cwd, including commands that came from root `validation.commands` or legacy built-in defaults by fallback.
11. `default = true` affects only create-time implicit target selection. `paths` remains inert metadata in this task, so a target may have both `default = true` and `paths` without introducing path-based selection or precedence.

#### Concrete Bubble Config Shape

Persist selected target metadata as its own top-level section:

```toml
[validation_target]
id = "web"
cwd = "apps/web"
paths = ["apps/web/**", "packages/ui/**"]

[commands]
lint = "pnpm --filter web lint"
typecheck = "pnpm --filter web typecheck"
test = "pnpm --filter web test"
validation_required = ["lint", "typecheck", "test"]
```

Rules:

1. `validation_target` is optional for compatibility; existing bubbles without it keep Task 1 PASS behavior.
2. When present, `validation_target.id` is required.
3. `validation_target.cwd` and `validation_target.paths` are optional persisted audit metadata copied from the selected repo target after validation in normalized relative form: `/` separators, no leading slash, no `.` / `..` segments, and no empty path segments.
4. A selected target's `required` list must materialize into `commands.validation_required` in the same order. If the selected target has a non-empty `required` list, create must omit `validation_required_explicit`; it must not write `validation_required_explicit = false`. If the selected target has `required = []`, create must write `validation_required = []` and `validation_required_explicit = true`.
5. Root `validation.required` must not be copied into `commands.validation_required` when a target is selected.
6. PASS must treat the created bubble config as complete runtime authority: `[commands]`, including `validation_required` and `validation_required_explicit`, plus optional `[validation_target]`.
7. PASS must not read repo-root `pairflow.toml` to repair, infer, or reinterpret target metadata.

#### PASS Policy State Names

1. `policy_missing`: `commands.validation_required` is absent; PASS does not infer required commands from `validation_target` metadata.
2. `policy_explicit_null`: `commands.validation_required = []` and `commands.validation_required_explicit = true`; PASS intentionally runs no validation commands.
3. `policy_configured`: `commands.validation_required` is present and non-empty, or present with invalid explicit-empty shape; PASS validates and runs the listed command ids when valid.
4. `validation_required_explicit = false` is not a meaningful persisted value in this contract. Producers must omit the field unless explicit empty policy is intended. If a manually authored config contains `validation_required_explicit = false`, consumers must treat it as not true: `validation_required = []` with false is an invalid explicit-empty shape under `policy_configured`, and non-empty `validation_required` with false remains `policy_configured` with no special explicit-empty meaning.

#### PASS Command Spec Shape

1. `resolvePassValidationPolicy` derives command specs from `[commands]`.
2. When `[validation_target]` is present, each resolved command spec/result should include `target_id` and normalized `cwd` audit fields copied from `validation_target`.
3. Per-command `target_id` / `cwd` fields are evidence metadata only; they do not create a second runtime authority apart from the same bubble config.

### 3) Side Effects Contract

| Side Effect | Allowed When | Forbidden When | Priority | Timing |
|---|---|---|---|---|
| Write new bubble config | Target selection and command resolution succeeded. | Target config invalid, target ambiguous, cwd invalid, or required id unresolved. | P1 | required-now |
| Execute PASS command | Command and cwd resolve from created bubble config. | Runtime would need repo config or cwd outside worktree. | P1 | required-now |
| Write PASS logs/evidence | PASS command starts under a valid worktree evidence path. | Log path would escape `.pairflow/evidence`. | P1 | required-now |

### 4) Error and Fallback Contract

| Case | Required Behavior | Enforcement Locus | Priority | Timing |
|---|---|---|---|---|
| No `validation.targets` and no explicit target | Preserve Task 1 behavior. | repo config parser + create resolver | P1 | required-now |
| Explicit target but no `validation.targets` or an empty target map | Fail create with `VALIDATION_TARGETS_NOT_CONFIGURED`; do not silently ignore the option. This error takes precedence over unknown-target wording. | create CLI validation / create resolver before persistence | P1 | required-now |
| Explicit unknown target when a non-empty target map exists | Fail create with `VALIDATION_TARGET_UNKNOWN`. | create resolver before persistence | P1 | required-now |
| Multiple targets and no explicit/default target | Fail create with `VALIDATION_TARGET_AMBIGUOUS`. | create resolver before persistence | P1 | required-now |
| More than one default target | Fail config validation with `VALIDATION_TARGET_DEFAULT_NOT_UNIQUE`. | repo config parser/validator | P1 | required-now |
| Malformed or reserved target id | Fail config validation with `VALIDATION_TARGET_ID_INVALID`. | repo config parser/validator | P1 | required-now |
| Malformed path selector | Fail config validation with `VALIDATION_TARGET_PATH_SELECTOR_INVALID`. | repo config parser/validator | P1 | required-now |
| Target cwd escapes worktree | Fail before persistence or PASS execution with `VALIDATION_TARGET_CWD_OUTSIDE_WORKTREE`. | create resolver and PASS runtime cwd guard | P1 | required-now |
| Required id missing command | Fail before persistence with `VALIDATION_TARGET_REQUIRED_COMMAND_UNRESOLVED`. | create resolver before persistence | P1 | required-now |
| Existing bubble lacks target metadata | Continue Task 1 PASS behavior. | bubble config parser + PASS policy resolver | P1 | required-now |

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
| T4 | Multiple targets without explicit/default target. | Create fails before persistence with `VALIDATION_TARGET_AMBIGUOUS`. | P1 | required-now |
| T5 | Duplicate default targets. | Config validation fails with `VALIDATION_TARGET_DEFAULT_NOT_UNIQUE`. | P1 | required-now |
| T6 | Unknown explicit target with a non-empty target map. | Create validation/resolution fails with `VALIDATION_TARGET_UNKNOWN` and includes the requested target id. | P1 | required-now |
| T7 | Target cwd outside repo. | Fail before persistence or PASS execution. | P1 | required-now |
| T8 | PASS target cwd execution. | Runner uses target cwd, evidence/log remains under worktree. | P1 | required-now |
| T9 | Existing bubble config without target metadata. | PASS policy remains compatible. | P1 | required-now |
| T10 | Target required id unresolved. | Create fails before persistence with `VALIDATION_TARGET_REQUIRED_COMMAND_UNRESOLVED`. | P1 | required-now |
| T11 | Explicit target supplied when repo config has no `validation.targets` section or has an empty `validation.targets` map. | Create fails before persistence with `VALIDATION_TARGETS_NOT_CONFIGURED` in both sub-cases. | P1 | required-now |
| T12 | Target command overrides root command and explicit `bootstrapCommand` create input overrides target `bootstrap`. | Created bubble `[commands]` proves deterministic precedence without requiring a new public CLI command-map flag. | P1 | required-now |
| T13 | Target path selectors are configured. | Parser validates and bubble config round-trips selectors; PASS does not use them for target inference. | P1 | required-now |
| T14 | Malformed target path selector is configured. | Repo config validation fails before create persistence. | P1 | required-now |
| T15 | Selected target has `required = []`. | Bubble config writes `validation_required = []` and `validation_required_explicit = true`; PASS resolves `policy_explicit_null`. | P1 | required-now |
| T16 | Selected target has a non-empty `required` list. | Bubble config writes `validation_required` and omits `validation_required_explicit`; PASS resolves `policy_configured`. | P1 | required-now |
| T17 | Repo config has no `validation.targets` and root `validation.required = []` is configured. | Task 1 behavior is preserved: bubble config writes `validation_required = []` and `validation_required_explicit = true`; PASS resolves `policy_explicit_null`. | P1 | required-now |
| T18 | Manually authored or pre-existing bubble config has valid `validation_target.id` and `validation_target.cwd` but no `commands.validation_required`. | Bubble config can parse for compatibility; PASS remains `policy_missing` and does not infer commands from target metadata. | P1 | required-now |
| T19 | Target cwd exists in bubble config at PASS runtime. | PASS re-checks resolved cwd containment before spawn and fails without command execution with `VALIDATION_TARGET_CWD_OUTSIDE_WORKTREE` if it escapes the worktree. | P1 | required-now |
| T20 | Root `validation.required` and selected target `required` both exist. | Created bubble `commands.validation_required` uses only the selected target order; root required ids are ignored, while root `validation.commands` remains available as command-string fallback. | P1 | required-now |
| T21 | `validation.targets.<id>.commands` is missing or not an object/section. | Repo config validation fails with a target commands schema error. | P1 | required-now |
| T22 | `validation.targets.<id>.default` is not boolean. | Repo config validation fails with a target default schema error. | P1 | required-now |
| T23 | Bubble config contains `[validation_target]` without `id`. | Bubble config validation fails with a missing target id error. | P1 | required-now |
| T24 | Bubble config contains `[validation_target]`, `[commands]`, and repo-root `pairflow.toml` has conflicting targets. | PASS uses only the created bubble config; prove by running the PASS policy/runner path with a repo-config loader spy that would throw if called, or by using the PASS API surface that has no repo-config dependency. | P1 | required-now |
| T25 | Target id is malformed or uses a reserved target id. | Repo config validation fails before create resolution. | P1 | required-now |
| T26 | Target required id falls back to a root command while target `cwd` is configured. | Created bubble uses the root command string, stores selected target cwd, and PASS executes that command from target cwd. | P1 | required-now |
| T27 | Target has both `default = true` and `paths`. | Create may select it as the default target, but `paths` remains inert metadata and does not participate in selection. | P2 | later-hardening |
| T28 | Target cwd is configured with `./`, `..`, absolute path, or empty segments. | Repo config validation rejects malformed/escaping cwd before create persistence. | P1 | required-now |
| T29 | Target path selectors use backslashes, absolute paths, `.`, `..`, or empty path segments. | Repo config validation fails with `VALIDATION_TARGET_PATH_SELECTOR_INVALID`. | P1 | required-now |
| T30 | Target id is `id`, a target field name, or a built-in command id. | Repo config validation fails with `VALIDATION_TARGET_ID_INVALID`. | P1 | required-now |
| T31 | Target with cwd uses command fallback from legacy built-in default. | Created bubble stores selected target cwd and PASS executes the legacy command string from target cwd. | P1 | required-now |
| T32 | Target cwd/path metadata requires normalization before persistence. | Bubble config round-trips normalized `validation_target.cwd` and `validation_target.paths` with `/` separators and without leading slash, `.`, `..`, or empty segments. | P1 | required-now |
| T33 | Full four-tier command precedence chain is configured for different ids. | Created bubble proves explicit `bootstrapCommand` wins over target/root, selected target command wins over root, root command wins over legacy default, and legacy default is used when neither explicit/target/root command exists. | P1 | required-now |
| T34 | Manually authored config has `validation_required = []` and `validation_required_explicit = false`. | PASS treats false as not true and returns `policy_configured` with the invalid explicit-empty-shape reason, not `policy_explicit_null`. | P1 | required-now |

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
3. Preconditions before PASS execution: created bubble config must provide required command ids, command strings, and any target cwd; cwd must resolve inside worktree at PASS runtime even if create-time validation already checked it.
4. Coordination primitives: N/A.

### 10) Success / Completion Proof Boundary

N/A. This task does not change Pairflow lifecycle success/completion semantics. PASS success remains command execution success recorded in PASS evidence/logs.

## L2 - Implementation Notes

1. Prefer a small resolver type that separates repo target candidates from the resolved created-bubble command output.
2. Keep target cwd resolution in one helper used by create validation and PASS runtime to avoid divergent path-containment behavior.
3. Use parser-supported TOML section examples in tests, for example nested `[validation.targets.web]` and `[validation.targets.web.commands]` sections.
4. Extend `RepoValidationConfig` with `targets?: Record<string, RepoValidationTargetConfig>` rather than adding a separate repo-config loader.
5. Extend `BubbleConfig` with `validation_target?: BubbleValidationTargetConfig` and keep the field outside `commands` so command authority and target audit metadata stay separate.
6. Extend `PassValidationCommandSpec`, `PassValidationCommandResult`, and `PassValidationEvidenceArtifact.commands[]` with optional `cwd` / `target_id` fields when a selected target is present.
7. Change `runPassValidationCommand` to accept an optional execution cwd, re-check that cwd against the current worktree before spawn, and keep log creation under `worktreePath/.pairflow/evidence` regardless of command cwd.
8. Keep path selectors as inert metadata in this slice. Validation can reject malformed selector strings, but no runtime consumer may match changed files against them yet.

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
| HB1 | Changed-file target inference from stored path selectors | create/runtime | P2 | later-hardening | plan deferred scope risk | This task only validates and stores path selectors as inert metadata. Add inference only after a separate task defines deterministic matching, ambiguity behavior, and whether matching happens at create time or runtime. |
| HB2 | Multi-target fan-out PASS | PASS runtime | P2 | later-hardening | monorepo expansion | Split into a future task if one bubble must validate multiple targets. |
