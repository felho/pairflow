---
artifact_type: task
artifact_id: task_repo_defaults_create_time_v1
task_family_id: repo-defaults-create-time
sequence_key: "1"
task_id: 1-repo-defaults-create-time
title: "Repo Defaults Create-Time Materialization"
status: archived
phase: phase1
target_files:
  - "src/config/repoConfig.ts"
  - "tests/config/repoConfig.test.ts"
  - "src/types/bubble.ts"
  - "src/v11/application/create/createCommandContract.ts"
  - "src/v11/application/create/createBubbleFlowContext.ts"
  - "src/v11/application/create/createBubblePreparation.ts"
  - "src/v11/application/create/createCommandRuntime.ts"
  - "src/v11/application/create/createCliOptionValidation.ts"
  - "src/v11/application/create/createCliRunHelpers.ts"
  - "src/v11/application/create/createCliOptions.ts"
  - "tests/core/bubble/createBubble.test.ts"
  - "tests/v11/application/create/createCliRunner.test.ts"
  - "tests/v11/application/create/createCliRunHelpers.test.ts"
prd_ref: null
plan_ref: plans/repo-defaults-create-time-plan-v1.md
system_context_ref: docs/pairflow-initial-design.md
owners:
  - "felho"
doc_bubble_id: 1-repo-defaults-create-time-doc
impl_bubble_id: 1-repo-defaults-create-time-impl
supersedes: []
superseded_by: null
archive_group: 2026-05-01-repo-defaults-create-time-plan-v1
archive_path: plans/archive/tasks/2026-05-01-repo-defaults-create-time-plan-v1/1-repo-defaults-create-time.md
---

# Task: Repo Defaults Create-Time Materialization

## L0 - Policy

### Goal

Implement repo-root `pairflow.toml` `[defaults]` as a create-time defaults source for a conservative set of new-bubble configuration fields, then persist the resolved values into the created bubble's `bubble.toml`.

### Domain / Control Model Summary

1. Business invariant: repo defaults reduce repeated create configuration without making runtime behavior depend on mutable repo-level config.
2. Control model: repo-root `pairflow.toml` `[defaults]` is create-time input only; `.pairflow/bubbles/<id>/bubble.toml` is the durable authority after creation.
3. Read-path rule: only create reads repo defaults. Later lifecycle and runtime paths must continue to read the created bubble config.
4. Forbidden fallback: no runtime path may re-read repo defaults to fill missing bubble config fields.
5. Allowed resolution path: explicit create input wins, repo defaults apply next, built-in defaults apply last.
6. Missing-data rule: missing `pairflow.toml` or missing `[defaults]` preserves current behavior; invalid `[defaults]` fails before bubble persistence.
7. Phase boundary: this task owns the narrow default schema and create-time materialization only.

### Plan Linkage

1. Parent plan gap closed: add the first repo-level create defaults contract from `plans/repo-defaults-create-time-plan-v1.md`.
2. Depends on: existing repo-level `[validation]` loader and create-time validation profile behavior.
3. Unlocks / impacts successors: future tasks may add extended defaults (`local_overlay`, open commands, default remote) without changing the create-time authority rule.
4. Task-list impact: fresh task; does not supersede any existing task.
5. Inherited validation / exit expectation: parser tests, create-flow tests, CLI tests, plus lint/typecheck/build.

### Supported Defaults Contract

This task supports only these fields:

```toml
[defaults]
base_branch = "main"
watchdog_timeout_minutes = 40
max_rounds = 8
severity_gate_round = 4
pairflow_command_profile = "external"
reviewer_context_mode = "fresh"

[defaults.agents]
implementer = "codex"
reviewer = "claude"
meta_reviewer = "codex"

[defaults.review_policy]
review_loop_mode = "full"
reviewer_blocking_min_severity = "P3"
meta_review_auto_rework_min_severity = "P3"
meta_review_consecutive_clean_runs_required = 2

[defaults.doc_contract_gates]
round_gate_applies_after = 2
```

The existing `[validation]` contract remains separate and unchanged.

### Scope Reality / Shape Proof

1. Inspected entrypoints / call-sites: repo config parser/loader, create flow context, create input preparation, `buildBubbleConfig`, CLI create validation/run helpers, and create tests.
2. Actual touched scope: config contract extension plus create-time producer materialization.
3. Mutation entrypoints in scope: `bubble create` config persistence through the existing create flow.
4. Hidden scope ruled out: runtime inheritance, existing bubble migration, lifecycle state-machine changes, PASS validation changes, UI/status/list projection changes, and remote executor selection.
5. Branch inventory note: missing repo config, missing `[defaults]`, partial `[defaults]`, invalid default values, explicit create input overriding repo defaults, and repo default values materialized to `bubble.toml`.
6. Why the declared task shape matches reality: all in-scope changes terminate at the created bubble config write; consumers keep reading the same `BubbleConfig` shape afterward.

### Authority Boundary Map

1. Authority producer: `bubble create` resolves supported repo defaults and writes the new bubble config.
2. Stored authority: `.pairflow/bubbles/<id>/bubble.toml`.
3. In-scope consumers: create CLI/API only.
4. Explicit out-of-scope consumers: start/pass/status/list/UI/commit/merge/runtime recovery.
5. Runtime authority assertion: after creation, runtime paths must not consult repo-root `pairflow.toml`.

### Baseline Preservation

1. Missing repo config still returns `{}`.
2. Existing `[validation]` behavior remains unchanged.
3. Existing create commands with explicit `--base` and other current required flags continue to work.
4. Built-in defaults remain the fallback for unsupported or absent repo default fields.
5. Existing bubble config parse/render behavior remains compatible.

### Precondition and Side-Effect Boundary

1. Primary bounded task shape: `contract_or_persisted_authority_foundation`.
2. Secondary shape: `authority_producer`, limited to create-time config materialization.
3. Preconditions that must pass before side effects: repo config parse/validation, create input validation after repo default resolution, and bubble config validation.
4. Side effects forbidden before preconditions pass: creating or mutating the new bubble directory/config when `[defaults]` is invalid or required create inputs remain unresolved.
5. Invalid/precondition-failure behavior: fail with actionable config/create error and leave no new bubble artifacts.
6. Coordination primitives in scope: N/A.

### In Scope

1. Extend repo config schema with optional `[defaults]`.
2. Validate every supported default using the same domain rules as the corresponding bubble config field.
3. Merge partial nested defaults with built-in defaults.
4. Apply create precedence: explicit create input > repo default > built-in default.
5. Materialize resolved defaults into the new bubble `bubble.toml`.
6. Adjust create CLI handling so `--base` can be omitted when `[defaults].base_branch` is configured, and fails clearly when neither exists.
7. Preserve existing `[validation]` behavior and tests.
8. Add focused docs or README note only if the implementation changes user-visible CLI usage text.

### Out of Scope

1. Runtime inheritance from repo config.
2. Existing bubble migration/backfill.
3. `local_overlay`, `open_command`, `open_remote_command`, `notifications`, and `executor.remote` repo defaults.
4. UI editing or display of repo defaults.
5. PASS validation contract changes.
6. Remote/global config precedence changes.
7. Changing default built-in values other than reading repo defaults where configured.

### Safety Defaults

1. Missing `[defaults]` preserves current behavior.
2. Invalid `[defaults]` fails fast.
3. Unsupported `[defaults]` fields fail validation instead of being ignored.
4. Explicit create input always wins.
5. Runtime and lifecycle commands keep using bubble config only.

### Contract Boundary / Blast Radius

1. `contract_boundary_override`: `yes`
2. Impacted contracts: repo config schema, create input resolution contract, CLI required-option behavior for `--base`, and create-time bubble config materialization.

### Complexity Risk Gate

1. `authority_risk`: `2`
2. `surface_spread`: `2`
3. `identity_join_risk`: `0`
4. `activation_coupling`: `1`
5. `prerequisite_risk`: `0`
6. `acceptance_multiplicity`: `2`
7. `risk_score`: `7`
8. `single-task allowed`: `yes`, because the task changes one producer boundary and persists results into the existing bubble config authority.
9. Closure-budget triage:
   - closure buckets touched: shared config contract, persisted authority, authority producer.
   - intentionally collapsed closures: parser and producer materialization, because parser output has no runtime value unless create persists it.
   - explicitly deferred closures: runtime consumers, read models, cleanup/recovery, extended defaults.
10. Bounded-task-shape decision:
   - primary shape: `contract_or_persisted_authority_foundation`
   - secondary shape: `authority_producer`
   - why this bounded mix is safe: the producer writes the same existing `BubbleConfig` authority; no lifecycle or runtime consumer semantics change.

## L1 - Change Contract

### 0) Domain / Control Contract

| Item | Rule | Implementation Consequence | Priority | Timing |
|---|---|---|---|---|
| Business invariant | Repo defaults must be visible in the created bubble config. | Write resolved values to `bubble.toml`; do not rely on repo config later. | P1 | required-now |
| Control model | Repo defaults are create-time only. | Load repo config in create flow; runtime paths unchanged. | P1 | required-now |
| Precedence | Explicit input > repo default > built-in default. | Resolver must apply field-level precedence. | P1 | required-now |
| Missing data | Missing `[defaults]` preserves current behavior. | Optional defaults object; no new required repo config. | P1 | required-now |
| Invalid data | Invalid `[defaults]` fails before persistence. | Reuse or mirror bubble config validators with actionable paths. | P1 | required-now |
| CLI base branch | `--base` may be omitted only if repo default supplies `base_branch`. | Move final required-base enforcement after repo config load. | P1 | required-now |

### 1) Call-Site Matrix

| ID | File | Function/Entry | Expected Behavior | Priority | Timing |
|---|---|---|---|---|---|
| CS1 | `src/config/repoConfig.ts` | `PairflowRepoConfig`, `validatePairflowRepoConfig`, `parsePairflowRepoConfigToml` | Accept optional `[defaults]` with supported nested sections; reject unknown/invalid fields with paths under `defaults.*`. | P1 | required-now |
| CS2 | `src/v11/application/create/createCommandContract.ts` | `BubbleCreateInput` | Allow `baseBranch` to be absent at the API contract boundary so repo defaults can supply it. | P1 | required-now |
| CS3 | `src/v11/application/create/createBubbleFlowContext.ts` | `prepareCreateBubbleFlowContext` | Load repo config once after repo-path resolution/git assertion and before final create input preparation; resolve supported defaults before `prepareCreateBubbleInput`; fail if base branch remains empty/missing. | P1 | required-now |
| CS4 | `src/v11/application/create/createBubblePreparation.ts` | `prepareCreateBubbleInput` | Pass resolved/defaulted config values into `CreateBubbleConfigInput`, including scalar defaults, nested agents, review policy, and doc contract gates. | P1 | required-now |
| CS5 | `src/v11/application/create/createCommandRuntime.ts` | `CreateBubbleConfigInput`, `buildBubbleConfig` | Use already-resolved create config values and built-ins only when no explicit/repo value exists; do not load repo config from this lower-level config builder. | P1 | required-now |
| CS6 | `src/v11/application/create/createCliOptionValidation.ts` | `collectCreateValidationState`, missing-option handling | Stop adding absent `--base` to the pre-repo-load missing list; when `--base` is present, trim/validate it and reject an empty or blank value before create execution. | P1 | required-now |
| CS7 | `src/v11/application/create/createCliRunHelpers.ts` | CLI options -> `BubbleCreateInput` | Omit `baseBranch` when `--base` is absent; preserve explicit value when present. | P1 | required-now |
| CS8 | `src/v11/application/create/createCliOptions.ts` | help text | Change usage/options wording so `--base` is optional when repo `[defaults].base_branch` is configured. | P2 | required-now |
| CS9 | `src/v11/application/create/createBubbleFlowContext.ts`, `src/v11/application/create/createCliRunHelpers.ts` | base-branch normalization and create input construction | Treat absent `baseBranch` as eligible for repo default resolution, but reject an explicitly empty/blank `baseBranch` as invalid input rather than falling through to repo defaults. | P1 | required-now |

### 2) Data and Interface Contract

| Contract | Required Fields | Optional Fields | Compatibility | Priority | Timing |
|---|---|---|---|---|---|
| `PairflowRepoConfig` | none | `defaults`, existing `validation` | additive top-level schema extension; unknown fields still rejected | P1 | required-now |
| `RepoDefaultsConfig` | none | supported scalar and nested fields listed below | partial defaults allowed; missing nested fields use built-ins | P1 | required-now |
| `BubbleCreateInput.baseBranch` | no longer required at input type boundary | `baseBranch?: string` | explicit CLI/API callers continue to work | P1 | required-now |
| Created `BubbleConfig` | all existing required fields remain required | N/A | resolved repo defaults are materialized to the same existing bubble config fields | P1 | required-now |

`RepoDefaultsConfig` supported fields are exactly:

1. scalars: `base_branch`, `watchdog_timeout_minutes`, `max_rounds`, `severity_gate_round`, `pairflow_command_profile`, `reviewer_context_mode`;
2. `agents`: `implementer`, `reviewer`, `meta_reviewer`;
3. `review_policy`: `review_loop_mode`, `reviewer_blocking_min_severity`, `meta_review_auto_rework_min_severity`, `meta_review_consecutive_clean_runs_required`;
4. `doc_contract_gates`: `round_gate_applies_after`.

Name mapping contract: TOML/defaults fields remain snake_case at repo-config parse and `BubbleConfig` persistence boundaries, but create-flow TypeScript inputs use the existing camelCase contract (`baseBranch`, `watchdogTimeoutMinutes`, `maxRounds`, `severityGateRound`, `pairflowCommandProfile`, `reviewerContextMode`, `metaReviewer`, `reviewPolicy`, `docContractGates`). The resolver must be the explicit mapping boundary; call sites must not reconstruct meaning from ad hoc string keys.

Validation rules:

1. Numeric defaults must obey existing bubble config constraints:
   - `watchdog_timeout_minutes > 0`
   - `max_rounds > 0`
   - `severity_gate_round >= 4`
   - `doc_contract_gates.round_gate_applies_after >= 0` per current bubble config rule
   - `meta_review_consecutive_clean_runs_required >= 1`
2. Enum defaults must use existing allowed values.
3. `defaults.agents.*` must use existing agent names and `agents.implementer !== agents.reviewer` behavior must remain enforced by bubble config validation.
4. Unknown fields under `[defaults]` or nested defaults sections must fail.

Current-code alignment requirements:

1. `PairflowRepoConfig` currently permits only `[validation]` plus legacy `[enforcement_mode]`; extend its allowed top-level key set and unsupported-section message to include `[defaults]` while preserving legacy enforcement-mode ignore behavior.
2. `prepareCreateBubbleFlowContext` currently calls `loadPairflowRepoConfig` inside `applyValidationProfileCommands`; refactor so repo config is loaded once and the same parsed object is used for both `[defaults]` resolution and existing validation-profile resolution.
3. Repo config parse/defaults validation and final base-branch enforcement belong after repo-path resolution/git assertion and before `ensureBubbleDoesNotExist` or any `getBubblePaths`-backed persistence side effects. The missing-base failure path must produce a create error mentioning both `--base` and `[defaults].base_branch`.
4. `buildCreateBubbleInput` currently casts `options.base` to a required string; make this field conditional so API callers can also omit `baseBranch` and rely on the same create-flow resolver.
5. `CreateBubbleConfigInput` currently lacks fields for most supported defaults. Add only the required narrow fields: `watchdogTimeoutMinutes`, `maxRounds`, `severityGateRound`, `reviewerContextMode`, `implementer`, `reviewer`, `metaReviewer`, `pairflowCommandProfile`, `reviewPolicy`, and `docContractGates` or equivalent typed sub-objects. Do not add generic passthrough for arbitrary `BubbleConfig` keys.
6. Existing explicit CLI/API inputs for every exposed create option must retain their current precedence and behavior. At minimum this includes `baseBranch`, `implementer`, `reviewer`, `pairflowCommandProfile`, validation commands, bootstrap command, remote executor, task inputs, reviewer brief, and ideation. If this task adds explicit API-only fields for supported defaults, those fields also use explicit input > repo default > built-in default.
7. `DEFAULT_*` constants in `src/config/defaults.ts` remain the built-in fallback source; this task must not change their values.

### 3) Side Effects Contract

| Area | Allowed | Forbidden | Notes | Priority | Timing |
|---|---|---|---|---|---|
| Repo config read | Read repo-root `pairflow.toml` during create. | Read repo defaults during runtime/lifecycle commands. | Same file already read for `[validation]`. | P1 | required-now |
| Repo config validation ordering | Parse and validate `[defaults]` before checking whether the target bubble directory already exists. | Mask invalid repo defaults behind a "bubble already exists" error. | Config errors are repository preconditions and must fail before bubble identity collision checks. | P1 | required-now |
| Bubble config write | Persist resolved defaults into `bubble.toml`. | Persist invalid or unresolved defaults. | Existing create persistence path should remain the only writer. | P1 | required-now |
| Existing bubbles | No mutation. | Backfill/migrate existing bubble configs. | Explicitly deferred. | P1 | required-now |

### 4) Error and Fallback Contract

| Trigger | Behavior | Fallback Value/Action | Reason / Message Requirement | Priority | Timing |
|---|---|---|---|---|---|
| Missing `pairflow.toml` | continue | built-in defaults | existing behavior | P1 | required-now |
| Missing `[defaults]` | continue | built-in defaults plus existing `[validation]` behavior | no warning required | P1 | required-now |
| Unknown default field | throw config validation error | none | path names `defaults.<field>` | P1 | required-now |
| Invalid enum/numeric default | throw config validation error | none | path names exact default field | P1 | required-now |
| Missing explicit `--base` and no repo default | create validation error | none | actionable message mentions `--base` or `[defaults].base_branch` | P1 | required-now |
| Empty explicit base input | create validation error | none | explicit empty CLI `--base` or API `baseBranch` is invalid and must not silently fall through to repo defaults | P1 | required-now |
| Explicit input conflicts with repo default | continue | explicit input wins | no warning required | P2 | required-now |

### 5) Dependency Constraints

| Type | Items | Priority | Timing |
|---|---|---|---|
| must-use | existing domain enum/type guards from `src/types/bubble.ts` and bubble config validators where practical | P1 | required-now |
| must-use | existing repo config loader path `loadPairflowRepoConfig` | P1 | required-now |
| must-not-use | ad hoc runtime fallback to repo config | P1 | required-now |
| must-not-use | silent ignore of unsupported `[defaults]` keys | P1 | required-now |

### 6) Shared Contract Compatibility

1. Current consumers inventory:
   - repo config parser tests and create flow consume `PairflowRepoConfig`;
   - create CLI/API consumes `BubbleCreateInput`;
   - lifecycle/runtime consumers consume materialized `BubbleConfig`.
2. Additive vs breaking decision:
   - repo config `[defaults]` is additive;
   - `BubbleCreateInput.baseBranch` becoming optional is a source-compatible widening for TypeScript callers, with runtime fail-closed behavior if unresolved.
3. Alignment ownership:
   - this task owns create CLI/API alignment only;
   - no lifecycle/runtime consumer alignment is required because `BubbleConfig` remains fully materialized.

### 7) Test Matrix

| ID | Scenario | Given | When | Then | Priority | Timing |
|---|---|---|---|---|---|---|
| T1 | Parse empty repo config | no `pairflow.toml` or no `[defaults]` | load repo config | result preserves current `{}`/validation behavior | P1 | required-now |
| T2 | Parse full defaults | all supported defaults configured | parse repo config | typed defaults object matches normalized values | P1 | required-now |
| T3 | Reject unknown defaults | unsupported key under `[defaults]` or nested section | parse repo config | validation error path names exact key | P1 | required-now |
| T4 | Reject invalid defaults | invalid enum, invalid number, invalid agent | parse repo config | validation fails before create persistence | P1 | required-now |
| T5 | Create materializes defaults | repo has supported `[defaults]`, CLI omits optional values | create bubble | `result.config` and rendered `bubble.toml` contain resolved values | P1 | required-now |
| T6 | Explicit input wins across exposed defaults | repo default conflicts with explicit create input for `baseBranch`, agents, `pairflowCommandProfile`, validation commands, bootstrap command, remote executor, task inputs, reviewer brief, ideation, and any newly exposed API-only supported default field | create bubble | explicit value/behavior appears in the created artifacts; repo default appears only for fields without explicit input; task/reviewer-brief/ideation mode and remote executor behavior are unchanged by repo defaults | P1 | required-now |
| T7 | Missing base without default fails | no `--base`, no `[defaults].base_branch` | CLI create | actionable error, no bubble artifacts | P1 | required-now |
| T8 | Missing base with default succeeds | no `--base`, repo default has `base_branch` | CLI create | bubble config uses repo default branch | P1 | required-now |
| T9 | Existing validation profile unaffected | repo has `[validation]` only or `[validation]` plus `[defaults]` | create bubble | validation commands still resolve as before | P1 | required-now |
| T10 | API input can omit base with default | `createBubble` input omits `baseBranch`, repo default has `base_branch` | create bubble | bubble config uses repo default branch and TypeScript accepts the call | P1 | required-now |
| T11 | Invalid defaults leave no artifacts | repo has invalid `[defaults]`, valid create input otherwise | create bubble | create rejects before `.pairflow/bubbles/<id>` exists | P1 | required-now |
| T12 | Nested partial defaults merge correctly | repo default supplies one nested review-policy or agent field | create bubble | supplied field is materialized and sibling fields use explicit or built-in values | P1 | required-now |
| T13 | Empty explicit base fails | explicit CLI/API base is empty or blank, repo default also exists | create bubble | create rejects because explicit empty input is invalid and no bubble artifacts are created | P1 | required-now |
| T14 | Runtime paths ignore repo defaults | existing bubble config has materialized values and repo `pairflow.toml` is later changed to conflicting `[defaults]` | run `startCommandContext`/status read-model coverage or the narrowest equivalent lifecycle read-path test with a spy/failing stub on `loadPairflowRepoConfig` | the read path uses `bubble.toml` values and proves repo defaults are not consulted after create; a call to repo-config loading outside create fails the test | P1 | required-now |

### 8) Baseline Preservation

1. Current built-in create defaults remain:
   - `work_mode = worktree`
   - `quality_mode = strict`
   - `pairflow_command_profile = external`
   - `reviewer_context_mode = fresh`
   - existing watchdog/max-round/severity/doc-contract built-ins unless repo defaults override.
2. Existing validation profile precedence remains unchanged.
3. Existing explicit create input behavior remains unchanged except that missing `--base` can be satisfied by repo defaults.

### 9) Success / Completion Proof Boundary

N/A. This task does not change Pairflow lifecycle success/completion proof.

## L2 - Implementation Notes

1. Prefer a small `RepoDefaultsConfig` type inside `src/config/repoConfig.ts` or adjacent to it, not a generic "any bubble config defaults" object.
2. Avoid allowing arbitrary `BubbleConfig` keys in repo defaults; unsupported defaults should fail closed so future expansion is deliberate.
3. Add a resolver helper, for example `resolveRepoDefaultedCreateConfig`, near the create application layer. It should take `BubbleCreateInput`, parsed `RepoDefaultsConfig | undefined`, and built-in defaults, then return explicit resolved fields for `prepareCreateBubbleInput`.
4. Keep `[validation]` and `[defaults]` independent. A repo may define either or both.
5. If bubble config validation already normalizes a field, reuse that path after constructing the candidate `BubbleConfig`; repo config validation should still catch invalid defaults with repo-config paths before persistence.
6. For repo defaults validation, prefer existing enum guards/assertions from `src/types/bubble.ts` and `src/config/bubbleConfig.ts`; when mirroring numeric rules, keep repo-config error paths at `defaults.*` rather than leaking `bubble.toml` paths.
7. Preserve TOML parser limitations already tested for repo config: supported nested sections are `[defaults.agents]`, `[defaults.review_policy]`, and `[defaults.doc_contract_gates]`; dotted keys and array-of-tables remain unsupported through the existing parser.
8. When updating CLI help, remove `--base <branch>` from the required usage segment and describe it as "Base branch; defaults to repo [defaults].base_branch when configured."

## Acceptance Criteria

1. AC1: `pairflow.toml` accepts the supported `[defaults]` shape and rejects unsupported or invalid defaults.
2. AC2: New bubbles materialize supported defaults into their own `bubble.toml`.
3. AC3: Explicit create input wins over repo defaults.
4. AC4: Missing repo defaults preserves current behavior.
5. AC5: CLI create can use repo `base_branch` when `--base` is omitted, and fails clearly when neither exists.
6. AC6: Runtime/lifecycle commands do not read repo defaults.
7. AC7: Relevant tests, `pnpm lint`, `pnpm typecheck`, and `pnpm build` pass.
