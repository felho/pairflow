---
artifact_type: task
artifact_id: task_repo_validation_profile_base_v1
task_family_id: repo-validation-profile-base
sequence_key: "1"
task_id: 1-repo-validation-profile-base
title: "Repo Validation Profile Foundation"
status: in_progress
phase: phase1
target_files:
  - "src/config/repoConfig.ts"
  - "tests/config/repoConfig.test.ts"
  - "src/v11/application/create/createBubbleFlowContext.ts"
  - "src/v11/application/create/createCommandRuntime.ts"
  - "src/config/bubbleConfig.ts"
  - "src/types/bubble.ts"
  - "src/v11/application/create/repoValidationProfileResolver.ts"
  - "src/v11/infrastructure/artifact/validation/passValidationEvidenceContract.ts"
  - "src/v11/infrastructure/artifact/validation/passValidationEvidence.ts"
  - "src/v11/infrastructure/executor/validation/passValidationCommandRunner.ts"
  - "src/v11/application/start/startCommandImplementerPrompts.ts"
  - "src/v11/application/start/startCommandResumeImplementerPrompt.ts"
  - "src/v11/application/start/startCommandTmuxLaunch.ts"
  - "src/v11/infrastructure/channel/tmux/tmuxDeliveryMessageBuilder.ts"
  - "tests/config/bubbleConfig.test.ts"
  - "tests/v11/application/create/repoValidationProfileResolver.test.ts"
  - "tests/v11/application/start/startCommandResumeImplementerPrompt.test.ts"
  - "tests/v11/infrastructure/executor/validation/passValidationCommandRunner.test.ts"
  - "tests/core/agent/pass.test.ts"
  - "tests/core/bubble/createBubble.test.ts"
  - "tests/core/runtime/passValidationEvidence.test.ts"
  - "tests/core/bubble/startBubble.test.ts"
  - "tests/core/runtime/tmuxDelivery.test.ts"
prd_ref: null
plan_ref: plans/repo-level-validation-profile-plan-v2.md
system_context_ref: docs/pairflow-initial-design.md
owners:
  - "felho"
doc_bubble_id: 1-repo-validation-profile-foundation-doc
impl_bubble_id: 1-repo-validation-profile-base-impl
supersedes: []
superseded_by: null
archive_group: 2026-04-29-repo-level-validation-profile-plan-v2
---

# Task: Repo Validation Profile Foundation

## L0 - Policy

### Goal

Implement the first repo-level validation profile slice: parse a single default `[validation]` profile from repo-root `pairflow.toml`, materialize the resolved validation commands into newly created `bubble.toml` files, allow PASS validation to execute configured custom command ids from the created bubble config, and surface required validation guidance to the implementer.

### Domain / Control Model Summary

1. Business invariant: repo-level validation defaults must reduce per-bubble setup without hiding which commands are authoritative for a created bubble.
2. Control model: repo-root `pairflow.toml` `[validation]` is create-time default authority only; the created bubble's `.pairflow/bubbles/<id>/bubble.toml` `[commands]` is runtime execution authority.
3. Read-path rule: create may read repo config and explicit create input; later lifecycle/PASS runtime must read only the created bubble config for validation policy and command strings.
4. Forbidden fallback: PASS/runtime must not re-read repo config or fall back to legacy built-in command strings after a repo profile command has been selected and written to `bubble.toml`.
5. Allowed resolution path: create resolves each command id by explicit create input first, repo profile second, legacy built-in defaults third, then persists the resolved result into bubble config.
6. Missing-data rule: missing `pairflow.toml` or missing `[validation]` preserves existing built-in create behavior; invalid `[validation]` or unsupported multi-target config fails fast before bubble config persistence.
7. Phase boundary:
   - contract closure: owned here for single-profile validation config and bubble command map compatibility
   - producer closure: owned here for create-time materialization into `bubble.toml`
   - internal execution closure: owned here only for PASS executing required ids present in bubble config
   - workflow/orchestration closure: out of scope except preserving existing PASS lifecycle routing
   - read-model closure: out of scope
   - activation closure: owned here only because create-time materialization activates the single-profile default for new bubbles
   - cleanup/recovery closure: out of scope

### Plan Linkage

1. Parent plan gap closed: Task 1 closes the single-profile foundation gap from `plans/repo-level-validation-profile-plan-v2.md`: repo config parsing, create-time inheritance, bubble config persistence, PASS custom-id execution, and implementer prompt visibility.
2. Depends on: N/A.
3. Unlocks / impacts successors: unlocks `2-validation-target-resolution`; Task 2 must not reopen single-profile authority and must build multi-target selection on top of the materialized bubble config authority.
4. Task-list impact: refines planned task id `1-repo-validation-profile-base`; does not replace or obsolete another live task artifact.
5. Inherited validation / exit expectation: relevant unit tests for repo config, create path, bubble config rendering/parsing, PASS validation policy/execution, implementer guidance, plus `pnpm lint`, `pnpm typecheck`, and `pnpm build` before implementation lifecycle commands.

### Canonical Contract Anchors

1. Source-of-truth anchors:
   - `plans/repo-level-validation-profile-plan-v2.md`
   - `src/config/repoConfig.ts`
   - `tests/config/repoConfig.test.ts`
   - `src/types/bubble.ts`
   - `src/config/bubbleConfig.ts`
   - `src/v11/application/create/repoValidationProfileResolver.ts`
   - `src/v11/application/create/createBubbleFlowContext.ts`
   - `src/v11/application/create/createCommandRuntime.ts`
   - `src/v11/infrastructure/artifact/validation/passValidationEvidenceContract.ts`
   - `src/v11/infrastructure/artifact/validation/passValidationEvidence.ts`
   - `src/v11/infrastructure/executor/validation/passValidationCommandRunner.ts`
   - `src/v11/application/start/startCommandImplementerPrompts.ts`
   - `src/v11/application/start/startCommandResumeImplementerPrompt.ts`
   - `src/v11/application/start/startCommandTmuxLaunch.ts`
   - `src/v11/infrastructure/channel/tmux/tmuxDeliveryMessageBuilder.ts`
   - `tests/config/bubbleConfig.test.ts`
   - `tests/v11/application/create/repoValidationProfileResolver.test.ts`
   - `tests/v11/application/start/startCommandResumeImplementerPrompt.test.ts`
   - `tests/v11/infrastructure/executor/validation/passValidationCommandRunner.test.ts`
   - `tests/core/agent/pass.test.ts`
   - `tests/core/bubble/createBubble.test.ts`
   - `tests/core/runtime/passValidationEvidence.test.ts`
   - `tests/core/bubble/startBubble.test.ts`
   - `tests/core/runtime/tmuxDelivery.test.ts`
2. Canonical elements: created bubble `[commands]`, built-in ids `lint`, `typecheck`, `test`, `bootstrap`, ordered `validation_required`, `validation_required_explicit=true` for explicit empty policy, and existing PASS evidence/log path safety rooted in the PASS validation artifact/runner anchors above.
3. Guard elements: repo-level `validation.required` reference validation, unsupported multi-target field rejection, invalid command-id/empty command checks.
4. Compat-only elements: existing fixed fields in `BubbleCommandsConfig`, existing bubbles with fixed `lint`/`typecheck`/`test`/`bootstrap`, and PASS evidence `kind` naming for command ids.
5. Forbidden reinterpretations: do not make repo config runtime authority, do not make `lint` or custom ids required unless listed in `validation.required`, do not silently accept multi-target config, and do not treat implementer-reported output as authoritative PASS evidence.

### Scope Reality / Shape Proof

1. Inspected entrypoints / call-sites: repo config parser/loader, create flow context that invokes `buildBubbleConfig`, bubble config parse/render, create-time `buildBubbleConfig`, PASS validation policy/evidence, PASS runner command id typing/log path, implementer start prompt paths, resume implementer prompt builder, tmux resume launch call-site, and implementer delivery message path.
2. Actual touched scope: mixed but bounded to `contract_or_persisted_authority_foundation` plus adjacent `authority_producer` and internal execution consumer compatibility for the same validation command authority.
3. Mutation entrypoints in scope: create-time bubble config persistence through `buildBubbleConfig` consumers; PASS validation evidence/log writes for required commands.
4. Hidden scope ruled out: lifecycle state-machine changes, reviewer evidence reuse semantics, cleanup/recovery, remote execution topology, UI/status/list read models, and multi-target resolution remain out of scope.
5. Branch inventory note: missing profile vs present profile, explicit create override vs repo profile vs legacy default, invalid config vs valid config, explicit empty required policy vs missing policy, built-in required ids vs custom required ids, unsupported multi-target fields, PASS success vs unsupported/missing required command failure, and runtime bubble config requiring an unsupported/invalid command id.
6. Why the declared task shape matches reality: the plan explicitly authorizes widening the validation command contract and requires create-time materialization plus PASS custom-id compatibility in the same Task 1 slice; the task does not include target selection, lifecycle routing, cleanup, or read-model fallout.

### Authority Boundary Map

1. Authority producer: `bubble create` resolves and writes validation command authority into new `bubble.toml`.
2. Stored authority: `.pairflow/bubbles/<id>/bubble.toml` `[commands]`.
3. In-scope consumers: PASS validation policy/execution consumer and implementer prompt guidance consumer.
4. Explicit out-of-scope consumers: repo target resolver, target-specific cwd consumers, UI/status/read-model consumers, reviewer evidence reuse beyond existing PASS artifact compatibility, cleanup/recovery consumers.
5. Runtime authority assertion: PASS must not consult repo-root `pairflow.toml`, repo validation defaults, or legacy built-in defaults after bubble creation; it may use only the created bubble config plus existing PASS execution dependencies.
6. Export surfaces closed in this phase: yes, the created bubble config and PASS validation evidence must represent custom command ids that are present in `commands.validation_required`.

### Baseline Preservation

1. Must-preserve behaviors: missing repo config returns `{}`; missing `[validation]` keeps legacy create defaults; existing fixed bubble command fields continue to parse/render; PASS still reads bubble config as runtime authority.
2. Allowed resolution paths: explicit create input > repo profile command > legacy default for built-in ids with defaults (`test`, `typecheck`); explicit create/bootstrap behavior remains supported.
3. Forbidden regression interpretations: do not broaden repo config validation back to accepting arbitrary future validation structures; do not reject existing fixed bubble configs; do not require `lint` by default.
4. Replacement proof required if removed: any removal of fixed PASS id closure must be replaced by same-bubble-config command resolution with tests for built-in and custom ids.

### Success / Completion Proof Boundary

N/A. This task does not change Pairflow lifecycle success/completion proof; it changes validation command configuration and PASS execution inputs.

### Precondition and Side-Effect Boundary

1. Primary bounded task shape: `contract_or_persisted_authority_foundation`.
2. Secondary shape: `authority_producer` plus internal execution consumer compatibility; safe because the producer and PASS consumer are both required to prove the same created-bubble `[commands]` authority and do not alter lifecycle state transitions.
3. Preconditions that must pass before side effects: repo `[validation]` schema validation, unsupported multi-target rejection, required id resolution, and command string non-empty validation must pass before writing a new bubble config.
4. Side effects forbidden before preconditions pass: creating or mutating the new bubble directory/config for invalid repo validation config.
5. Invalid/precondition-failure behavior: zero new bubble config persistence for invalid profile or unresolved required id.
6. Coordination primitives in scope: N/A.

### In Scope

1. Parse and validate the single default repo `[validation]` shape with `required` and `[validation.commands]`.
2. Reject unsupported multi-target/target-specific config in Task 1 with actionable phase-boundary errors.
3. Resolve command precedence during create: explicit input, repo profile, then legacy built-in defaults.
4. Persist resolved commands and `validation_required`/`validation_required_explicit` into created bubble config, preserving `validation.required` order exactly after materialization.
5. Preserve existing fixed-field bubble config compatibility while allowing custom validation command ids materialized into the created bubble commands map.
6. Materialize `bootstrap` when configured or explicitly provided without making it required unless `bootstrap` is explicitly listed in `validation.required`.
7. Update PASS validation evidence/types/resolution so custom ids present in bubble config can be executed and reported.
8. Add implementer start/resume guidance that lists required validation command ids and shell commands as local feedback commands while saying PASS re-runs them.
9. Add focused tests for repo config, create inheritance, bubble config parse/render compatibility, PASS custom command execution/resolution, and prompt guidance.

### Out of Scope

1. Multi-target or monorepo target resolution.
2. Target-specific working directories.
3. Per-context validation policy.
4. PASS lifecycle state-machine changes.
5. Reviewer evidence reuse from implementer-run validation.
6. UI/status/list read-model changes.
7. Cleanup/recovery behavior changes.
8. A second validation config file.

### Safety Defaults

1. Missing repo config or missing `[validation]` preserves current behavior.
2. Invalid repo validation config fails fast before bubble config persistence.
3. Runtime validation uses created bubble config only.
4. Custom ids are valid only when a non-empty command is materialized in the same bubble config.
5. `bootstrap` is materialized when configured or explicitly provided, but it is not required by default and is not PASS-required unless listed in `validation.required`.

### Contract Boundary / Blast Radius

1. `contract_boundary_override`: `yes`
2. Impacted contracts: repo config schema, bubble config `[commands]` shape, PASS validation evidence/command-id contract, create-time command resolution contract, and implementer prompt guidance.

### Complexity Risk Gate

1. `authority_risk`: `2`
2. `surface_spread`: `2`
3. `identity_join_risk`: `1`
4. `activation_coupling`: `2`
5. `prerequisite_risk`: `0`
6. `acceptance_multiplicity`: `2`
7. `risk_score`: `9`
8. `single-task allowed`: `yes`, because the approved parent plan explicitly defines Task 1 as the authorized foundation slice and excludes target resolution, read-models, lifecycle changes, and cleanup/recovery.
9. If `no`, required split: N/A.
10. Identity/join note:
   - canonical identity path: command id string from repo validation profile becomes canonical only after materialization into created bubble `[commands]`.
   - competing identifiers or fallback identities: repo profile ids are create-time inputs only; they must not compete with bubble config ids at PASS runtime.
11. Authority/source-of-truth note:
   - canonical source: created bubble `[commands]` for runtime validation.
   - forbidden secondary sources: repo-root `pairflow.toml` after bubble creation and implementer-reported validation output.
12. Closure-budget triage:
   - closure buckets touched: shared contract, authority producer, persisted authority, internal execution consumer, human-facing prompt guidance.
   - intentionally collapsed closures: repo config contract, create-time producer, and PASS validation compatibility are collapsed because each proves the same command-id materialization authority.
   - explicitly deferred closures: multi-target resolution, target cwd, read-model/UI/status consumers, cleanup/recovery.
13. Bounded-task-shape decision:
   - primary shape: `contract_or_persisted_authority_foundation`
   - secondary shape: `authority_producer` and internal execution consumer compatibility
   - why this bounded mix is safe: no lifecycle state transition, cleanup/recovery, coordination primitive, or target selection is changed; the consumer change is limited to executing command ids already persisted in bubble config.

## L1 - Change Contract

### 0) Domain / Control Contract

| Item | Rule | Implementation Consequence | Priority | Timing |
|---|---|---|---|---|
| Business invariant | Created bubbles must expose the exact validation authority they will use. | Persist resolved commands into `bubble.toml`; do not require operators to remember repo defaults later. | P1 | required-now |
| Control model | Repo config controls create-time defaults only; bubble config controls runtime validation. | PASS and prompts read `bubbleConfig.commands`, not repo config. | P1 | required-now |
| Read-path rule | Create reads explicit input and repo config; PASS/runtime reads bubble config. | Add resolver at create boundary; keep PASS resolver input as `BubbleConfig`. | P1 | required-now |
| Forbidden fallback | No runtime fallback to repo config or built-in commands after bubble config exists. | Missing required custom command in bubble config is invalid, not silently replaced. | P1 | required-now |
| Allowed resolution path | explicit input > repo profile > legacy default per command id. | Resolver must be deterministic per id and covered by precedence tests. | P1 | required-now |
| Missing-data rule | Missing profile keeps legacy defaults; invalid profile fails fast. | Loader/parser remains tolerant of absent file, strict for invalid `[validation]`. | P1 | required-now |
| Phase boundary | Task 1 is single-profile only. | Reject target-specific/multi-target keys; Task 2 owns target resolution. | P1 | required-now |

### 0a) Canonical Contract Preservation

| Element | Source Anchor | Required Interpretation | This Task Action | Priority | Timing |
|---|---|---|---|---|---|
| `bubble.toml` `[commands]` | `src/config/bubbleConfig.ts`, `src/types/bubble.ts`, parent plan | Runtime validation authority. | preserve and widen to include materialized custom command ids | P1 | required-now |
| `validation_required` | `src/types/bubble.ts`, `src/config/bubbleConfig.ts`, parent plan | Ordered list of PASS-required command ids. | preserve semantics and ordering through create materialization and render/parse; allow custom ids when command exists in same config | P1 | required-now |
| `validation_required_explicit` | `src/config/bubbleConfig.ts`, parent plan | Only proof that empty required list is explicit policy. | preserve | P1 | required-now |
| Fixed ids `lint`, `typecheck`, `test`, `bootstrap` | `src/types/bubble.ts`, parent plan | Built-in command ids; only `test` and `typecheck` have legacy defaults. | preserve; do not make `lint` or `bootstrap` required by default | P1 | required-now |
| Repo `[validation]` | parent plan, `src/config/repoConfig.ts` | Create-time default/guard, not runtime authority. | authorized new contract | P1 | required-now |
| PASS `kind` | `passValidationEvidenceContract.ts`, `passValidationEvidence.ts` | Command id label in evidence/log reporting. | widen from closed union to validated materialized command id | P1 | required-now |

### 0b) Scope Reality and Shape Proof

| Item | Rule | Implementation / Review Consequence | Priority | Timing |
|---|---|---|---|---|
| Inspected entrypoints / call-sites | Source anchors listed in L0 define the current real scope. | Review must check create, config, PASS, runner, prompt, and tests, not only repo parser. | P1 | required-now |
| Actual touched scope | Contract foundation with create producer and PASS consumer compatibility. | Do not add target resolution, UI/read-model, cleanup, or lifecycle-state changes. | P1 | required-now |
| Mutation entrypoints in scope | Create writes bubble config; PASS writes validation evidence/logs. | Invalid repo validation config must fail before create persistence; PASS custom id logs must stay under existing evidence path rules. | P1 | required-now |
| Hidden scope ruled out | Multi-target, retry/cleanup, coordination, state machine, remote topology, and read-model changes are excluded. | Any implementation touching these areas must route back to plan/task refinement. | P1 | required-now |
| Branch inventory note | Cover missing/present/invalid profile, explicit override, empty required, unresolved required id, custom id, unsupported target fields. | Tests must include these branches. | P1 | required-now |
| Shape proof | The collapsed closures all prove materialized command authority in one bubble config. | Do not include unrelated activation or cleanup under this task. | P1 | required-now |

### 0c) Plan Linkage and Successor Impact

| Item | Rule | Implementation / Review Consequence | Priority | Timing |
|---|---|---|---|---|
| Parent gap closed | Single-profile repo validation defaults and created-bubble materialization. | Completion should satisfy Task 1 acceptance items 1-11 in the parent plan. | P1 | required-now |
| Depends on | N/A | No predecessor task must be complete. | P2 | required-now |
| Unlocks / impacts successors | `2-validation-target-resolution` depends on this materialized authority. | Task 2 must add target resolution without changing runtime authority away from bubble config. | P1 | required-now |
| Task-list impact | Refines planned task `1-repo-validation-profile-base`. | Parent tracker must point at this file; `status: approved` remains valid only while this refined task continues to satisfy ReviewSpec task-mode readiness. If review requires further refinement, the lifecycle/review workflow owns any temporary status downgrade. | P1 | required-now |
| Inherited validation / exit expectation | Parent validation strategy and manual checks apply. | Implementation summary must state relevant unit tests plus lint/typecheck/build. | P1 | required-now |

### 0d) Shared Contract Compatibility

| Shared Contract | Current Consumers | Change Type (`additive|breaking|N/A`) | This Task Action | Deferred Alignment |
|---|---|---|---|---|
| `PairflowRepoConfig` / `pairflow.toml` | create-time repo config loader | additive, with strict rejection for unsupported validation fields | Add optional single-profile validation schema. | multi-target fields in Task 2 |
| `BubbleCommandsConfig` / `[commands]` | create, bubble config parser/renderer, PASS, start prompts, existing bubbles | additive if existing fixed fields remain accepted | Support materialized custom validation command ids while preserving fixed fields. | target-aware command selection |
| PASS validation evidence command id | PASS artifact builder/reuse checks, reviewer compatibility output, runner logs | additive contract widening | Allow custom ids from bubble config using the validation command-id predicate; keep the existing evidence schema version if persisted field names and value types stay unchanged, and bump the version only if implementation changes serialized evidence shape beyond widening `kind` string values. | reuse of implementer-run evidence |
| Implementer guidance text | start/resume/kickoff delivery consumers | additive | List required commands and state PASS re-runs them. | richer UX/read-model surfacing |

### 0e) Baseline Preservation

| Current Behavior | Preserve/Replace/Forbid | Required Proof | Priority | Timing |
|---|---|---|---|---|
| Missing `pairflow.toml` loads `{}` | preserve | `tests/config/repoConfig.test.ts` | P1 | required-now |
| Missing `[validation]` keeps `test=pnpm test`, `typecheck=pnpm typecheck` | preserve | `tests/core/bubble/createBubble.test.ts` and `tests/config/bubbleConfig.test.ts` | P1 | required-now |
| Existing fixed `[commands]` parse/render | preserve | `tests/config/bubbleConfig.test.ts` | P1 | required-now |
| PASS rejects required id with no command in bubble config | preserve as invalid, widen id support | `tests/core/runtime/passValidationEvidence.test.ts` | P1 | required-now |
| PASS closed id list rejects `fitness` even when configured | replace | same-bubble-config command resolution in `src/v11/infrastructure/artifact/validation/passValidationEvidence.ts`, covered by `tests/core/runtime/passValidationEvidence.test.ts` and `tests/core/agent/pass.test.ts` | P1 | required-now |
| Repo config as runtime fallback | forbid | test or code review proof that PASS accepts no repo config dependency | P1 | required-now |

### 0f) Success / Completion Proof Boundary

| Surface | Current Proof Source | Target Proof Source | Canonical / Compat / Guard | Mixed-Truth Allowed? | Priority | Timing |
|---|---|---|---|---|---|---|
| Pairflow lifecycle completion | Existing lifecycle state machine | unchanged | canonical | no | P2 | required-now |
| PASS validation command success | PASS command runner exit codes and evidence logs | unchanged, with custom ids allowed | canonical | no | P1 | required-now |

### 0g) Precondition and Side-Effect Boundary

| Case | Must Be Validated Before | Forbidden Early Side Effects | Required Failure Behavior | Priority | Timing |
|---|---|---|---|---|---|
| invalid `[validation]` shape | repo config schema validation | new bubble config persistence | zero side effects on new bubble config | P1 | required-now |
| unsupported multi-target fields | phase-boundary validation | accepting or partially applying target config | fail fast with actionable error | P1 | required-now |
| unresolved required id | command id resolution against explicit input, repo commands, legacy defaults | writing `validation_required` with no command | fail fast before persistence | P1 | required-now |
| empty explicit required policy | explicit `validation.required = []` | treating empty list as missing policy | persist `validation_required=[]` and `validation_required_explicit=true` | P1 | required-now |

### 1) Call-site Matrix

| ID | File | Function/Entry | Exact Signature (args -> return) | Insertion Point | Expected Behavior | Priority | Timing | Evidence |
|---|---|---|---|---|---|---|---|---|
| CS1 | `src/config/repoConfig.ts` | `validatePairflowRepoConfig` | `(input: unknown) -> ValidationResult<PairflowRepoConfig>` | repo config validation | Accept missing validation, parse single-profile validation, reject invalid/target-specific fields. | P1 | required-now | `tests/config/repoConfig.test.ts` |
| CS2 | `src/config/repoConfig.ts` | `parsePairflowRepoConfigToml` / `loadPairflowRepoConfig` | `(input: string) -> PairflowRepoConfig`; `(repoPath: string, path?: string) -> Promise<PairflowRepoConfig>` | TOML parse/load | Preserve absent file behavior and surface schema errors for invalid validation config. | P1 | required-now | `tests/config/repoConfig.test.ts` |
| CS3 | `src/v11/application/create/repoValidationProfileResolver.ts` | `resolveRepoValidationProfileCommands` | `(input: { explicitCommands: Partial<Record<"lint" \| "typecheck" \| "test" \| "bootstrap", string>>; repoValidation?: RepoValidationConfig; legacyDefaults: { typecheck: string; test: string } }) -> ResolvedRepoValidationProfileCommands` | create boundary, before `buildBubbleConfig` input is finalized | Apply explicit > repo > legacy precedence per command id, distinguish missing `required` from explicit `required=[]`, validate command ids with the shared predicate, reject duplicate required ids, and validate every required id before config persistence. | P1 | required-now | `tests/v11/application/create/repoValidationProfileResolver.test.ts` and `tests/core/bubble/createBubble.test.ts` |
| CS4 | `src/v11/application/create/createBubbleFlowContext.ts` | create flow context builder | existing create context input -> prepared context | before `config: buildBubbleConfig(prepared.bubbleConfigInput)` | Load/resolve repo validation defaults before bubble config construction and prove invalid profile fails before any bubble directory/config persistence. | P1 | required-now | `tests/core/bubble/createBubble.test.ts` |
| CS5 | `src/v11/application/create/createCommandRuntime.ts` | `buildBubbleConfig` | `(input: CreateBubbleConfigInput) -> BubbleConfig` | commands construction | Consume already-resolved validation defaults and persist commands/required policy into bubble config; do not read repo config here. | P1 | required-now | `tests/v11/application/create/repoValidationProfileResolver.test.ts` and `tests/core/bubble/createBubble.test.ts` |
| CS6 | `src/config/bubbleConfig.ts` | `validateBubbleConfig` / render parser | `(input: unknown) -> ValidationResult<BubbleConfig>` and renderer | `[commands]` parse/render | Preserve fixed fields; parse/render unknown `[commands]` keys as custom command ids only when they satisfy the validation command-id predicate and have non-empty string values; reject reserved/invalid keys instead of silently dropping them. | P1 | required-now | `tests/config/bubbleConfig.test.ts` |
| CS7 | `src/types/bubble.ts` | `BubbleCommandsConfig` | interface | type contract | Represent fixed built-ins plus custom materialized validation commands without weakening required built-ins. | P1 | required-now | typecheck |
| CS8 | `src/v11/infrastructure/artifact/validation/passValidationEvidence.ts` | `resolvePassValidationPolicy` | `(bubbleConfig: BubbleConfig) -> ResolvedPassValidationPolicy` | PASS policy resolution | Resolve required ids from same bubble config, including custom ids; reject missing or unsupported runtime required ids without repo-config or built-in fallback. | P1 | required-now | `tests/core/runtime/passValidationEvidence.test.ts` |
| CS9 | `src/v11/infrastructure/executor/validation/passValidationCommandRunner.ts` | `runPassValidationCommand` and log path helper | existing runner input -> result | PASS command execution | Accept validated custom ids and produce safe PASS-owned evidence log paths without accepting implementer-supplied log locations. | P1 | required-now | `tests/v11/infrastructure/executor/validation/passValidationCommandRunner.test.ts` and `tests/core/agent/pass.test.ts` |
| CS10 | `src/v11/application/start/startCommandImplementerPrompts.ts` and `src/v11/infrastructure/channel/tmux/tmuxDeliveryMessageBuilder.ts` | start implementer prompt/delivery builders | existing prompt inputs -> string | start guidance | Include required validation commands from bubble config, clarify PASS re-runs them, and avoid implying implementer-run output/log refs are authoritative PASS evidence. | P1 | required-now | `tests/core/bubble/startBubble.test.ts` and `tests/core/runtime/tmuxDelivery.test.ts` |
| CS11 | `src/v11/application/start/startCommandResumeImplementerPrompt.ts` and `src/v11/application/start/startCommandTmuxLaunch.ts` | `buildResumeImplementerStartupPrompt` and tmux launch call-site | existing resume prompt input -> string | resume guidance | Carry the same required validation guidance, PASS re-run wording, and no-authoritative-implementer-output/log-ref wording into resume startup prompts without changing lifecycle state. | P1 | required-now | `tests/v11/application/start/startCommandResumeImplementerPrompt.test.ts` |

### 2) Data and Interface Contract

| Contract | Current | Target | Required Fields | Optional Fields | Compatibility | Priority | Timing |
|---|---|---|---|---|---|---|---|
| Repo config `[validation]` | `PairflowRepoConfig = {}` and arbitrary objects normalize to `{}` | Optional `validation` object with optional `required` and optional `commands` map | command values, when present, must be non-empty strings; required ids must be strings | `validation.required`, `validation.commands.bootstrap`, built-in/custom command ids | additive for missing config; stricter for invalid `[validation]` | P1 | required-now |
| Bubble config `[commands]` | fixed `bootstrap`, `lint`, `test`, `typecheck`, `validation_required`, `validation_required_explicit` | fixed fields preserved plus materialized custom validation command ids | `test`, `typecheck` remain required for existing config contract | `bootstrap`, `lint`, custom ids, validation policy fields | additive; existing fixed configs must parse | P1 | required-now |
| PASS command spec/result | `kind` is closed to `lint|typecheck|test` | `kind` may be any validated command id from bubble config policy | `kind`, `command`; result also `exitCode`, `logPath`, `durationMs` | N/A | additive in behavior; type/evidence schema version decision must be deliberate | P1 | required-now |
| Create input | explicit command overrides materialized at the create resolver boundary, including existing `testCommand`, `typecheckCommand`, and `bootstrapCommand` fields | explicit override map covers `lint`, `typecheck`, `test`, and `bootstrap`; existing create CLI fields continue to win over repo profile where present | existing explicit fields and resolver-bound command ids | repo profile resolved values | non-breaking; does not require adding a new CLI field before the resolver can represent `lint` | P1 | required-now |

`RepoValidationConfig` is the exported repo validation profile type owned by `src/config/repoConfig.ts`; CS3 consumes that profile after CS1/CS2 parse and validate repo config input.

Validation command-id predicate: a command id must match `^[a-z][a-z0-9_-]{0,63}$`; the reserved-name set is closed in Task 1 to `validation_required` and `validation_required_explicit`, and those names are not command ids. Built-in ids `lint`, `typecheck`, `test`, and `bootstrap` are valid command ids with built-in identity; explicit create input or repo profile commands may override their command strings through normal precedence, but they must not be reclassified as custom ids or given alternate semantics. Duplicate entries in `validation.required` are invalid.

### 3) Side Effects Contract

| Area | Allowed | Forbidden | Notes | Priority | Timing |
|---|---|---|---|---|---|
| FS: repo config read | Read repo-root `pairflow.toml` during create. | Re-read repo config during PASS/runtime validation. | Missing file is non-error. | P1 | required-now |
| FS: bubble config write | Write resolved `[commands]` into new bubble config after validation passes. | Write partial config when validation fails. | Precondition-before-side-effect tests required. | P1 | required-now |
| FS: explicit empty required policy | Write `validation_required=[]` and `validation_required_explicit=true` when repo `validation.required=[]` is present. | Treat explicit empty required policy as missing policy or omit the explicit marker. | This is a valid side effect after repo validation passes. | P1 | required-now |
| FS: PASS evidence/logs | Write PASS-owned validation evidence and command logs for configured required ids. | Trust implementer-reported output as PASS evidence, or commingle implementer-run logs/refs into the PASS-owned evidence artifact/log set. | Existing evidence directories/path safety must be preserved. | P1 | required-now |
| PASS evidence schema | Preserve existing persisted evidence schema when only widening command-id values. | Change persisted field names/value shapes without an explicit schema-version bump in the evidence contract and matching tests. | Schema decision is enforced at the PASS evidence contract boundary. | P1 | required-now |
| Network/DB | N/A | New DB/network side effects. | Implementation should remain local FS/process only. | P2 | required-now |

### 4) Error and Fallback Contract

| Trigger | Dependency (if any) | Behavior (`throw|result|fallback`) | Fallback Value/Action | Reason Code | Log Level | Priority | Timing |
|---|---|---|---|---|---|---|---|
| missing `pairflow.toml` | FS read | fallback | `{}` repo config and legacy create defaults | N/A | N/A | P1 | required-now |
| missing `[validation]` | repo config | fallback | legacy create defaults | N/A | N/A | P1 | required-now |
| explicit `validation.required=[]` | repo config | result | explicit empty required policy; persist `validation_required=[]` plus `validation_required_explicit=true` | N/A | N/A | P1 | required-now |
| invalid `[validation]` | repo config parser | throw | no bubble config write | schema validation error | N/A | P1 | required-now |
| unsupported target/multi-target fields | repo config parser | throw | no bubble config write | phase-boundary validation error | N/A | P1 | required-now |
| duplicate id in `validation.required` | repo config parser or create resolver | throw | zero side effects on new bubble config | validation config error | N/A | P1 | required-now |
| unknown key in repo `validation.commands` | repo config parser | throw only when key fails the validation command-id predicate or is reserved; otherwise accept as custom command id | zero side effects on new bubble config for invalid/reserved key | schema validation error | N/A | P1 | required-now |
| `validation.required` references unresolved id | resolver | throw | no bubble config write | validation config error | N/A | P1 | required-now |
| unknown key in bubble `[commands]` | bubble config parser | result/throw per parser contract | accept as custom command id only when key satisfies the validation command-id predicate and value is a non-empty string; reject reserved/invalid keys | bubble config validation error | N/A | P1 | required-now |
| PASS required id missing command in bubble config | bubble config | result | invalid policy result; do not fallback | existing/custom PASS invalid policy reason | warn/error per existing PASS path | P1 | required-now |
| PASS evidence schema change | PASS evidence contract | throw/fail test | schema version must stay unchanged for value-only command-id widening; any serialized shape change requires explicit schema-version bump | evidence contract mismatch | N/A | P1 | required-now |
| dependency failure | process runner | result/throw per existing runner | preserve existing PASS runner failure handling | existing runner error | existing behavior | P1 | required-now |

### 5) Dependency Constraints

| Type | Items | Priority | Timing |
|---|---|---|---|
| must-use | Existing TOML parser unless parser limitation blocks the specified shape; existing validation primitives; existing bubble config parser/renderer; existing PASS command runner/evidence paths. | P1 | required-now |
| must-not-use | Runtime repo config read for PASS; UI/read-model changes; new lifecycle states; implementer-reported evidence as trusted PASS proof; target-specific config acceptance. | P1 | required-now |

### 6) Test Matrix

| ID | Scenario | Given | When | Then | Priority | Timing | Evidence |
|---|---|---|---|---|---|---|---|
| T1 | repo config parse success | `pairflow.toml` with `[validation]`, `required`, and `[validation.commands]` including `fitness` | parse/load repo config | structured config preserves required order and command strings | P1 | required-now | `tests/config/repoConfig.test.ts` |
| T2 | missing config fallback | no `pairflow.toml` or no `[validation]` | load repo config and create/render bubble config | missing file loads `{}`; legacy `test` and `typecheck` defaults remain; no required policy is invented; fixed bubble command rendering remains compatible | P1 | required-now | `tests/config/repoConfig.test.ts`, `tests/core/bubble/createBubble.test.ts`, and `tests/config/bubbleConfig.test.ts` |
| T3a | invalid command value | repo `validation.commands` contains an empty or non-string command value | parse/load repo config | actionable schema error and zero side effects on new bubble config | P1 | required-now | `tests/config/repoConfig.test.ts` |
| T3b | invalid required item | repo `validation.required` contains a non-string item | parse/load repo config | actionable schema error and zero side effects on new bubble config | P1 | required-now | `tests/config/repoConfig.test.ts` |
| T3c | duplicate required id | repo `validation.required` repeats the same id | parse/load or create resolution | validation config error and zero side effects on new bubble config | P1 | required-now | `tests/config/repoConfig.test.ts` and `tests/v11/application/create/repoValidationProfileResolver.test.ts` |
| T3d | unsupported multi-target key | repo `[validation]` contains target-specific or multi-target fields | parse/load repo config | phase-boundary error and zero side effects on new bubble config | P1 | required-now | `tests/config/repoConfig.test.ts` and `tests/core/bubble/createBubble.test.ts` |
| T3e | reserved or invalid command id | repo `validation.commands` uses a reserved name or an id that fails the validation command-id predicate | parse/load repo config | schema error and zero side effects on new bubble config | P1 | required-now | `tests/config/repoConfig.test.ts` |
| T3f | unresolved create-time required id | repo profile `validation.required` references an id with no explicit input, repo command, or legacy default | create resolves profile | validation config error and zero side effects on new bubble config | P1 | required-now | `tests/v11/application/create/repoValidationProfileResolver.test.ts` and `tests/core/bubble/createBubble.test.ts` |
| T4 | precedence matrix | explicit create input and repo command candidates exist for `test`, `typecheck`, optional `bootstrap`, optional `lint`, and one custom id; legacy built-in default candidates exist only for `test` and `typecheck` | create resolves commands | explicit wins, repo wins over built-in, built-in applies only when no explicit/repo value exists, `lint`/`bootstrap`/custom ids are not invented by legacy defaults, and runtime PASS later uses only the materialized bubble config with no post-materialization legacy fallback | P1 | required-now | `tests/v11/application/create/repoValidationProfileResolver.test.ts` and `tests/core/bubble/createBubble.test.ts` |
| T5 | explicit empty required policy | `validation.required = []` | create persists bubble config | `validation_required=[]` and `validation_required_explicit=true` are written | P1 | required-now | `tests/v11/application/create/repoValidationProfileResolver.test.ts`, `tests/core/bubble/createBubble.test.ts`, and `tests/config/bubbleConfig.test.ts` |
| T5b | non-empty required policy persistence | `validation.required = ["lint", "fitness", "typecheck"]` and all commands resolve | create persists bubble config and render/parse round-trips it | `commands.validation_required` is written as the same ordered non-empty list and no implicit required ids are added | P1 | required-now | `tests/v11/application/create/repoValidationProfileResolver.test.ts`, `tests/core/bubble/createBubble.test.ts`, and `tests/config/bubbleConfig.test.ts` |
| T6 | custom required command execution | bubble config has `validation_required=["fitness"]` and `fitness` command | PASS resolves/runs validation | PASS executes `fitness`, writes evidence/logs through the existing PASS validation evidence root/path-safety code, and reports required id | P1 | required-now | `tests/core/runtime/passValidationEvidence.test.ts` and `tests/v11/infrastructure/executor/validation/passValidationCommandRunner.test.ts` |
| T7 | runtime missing-command policy | existing or hand-edited bubble config parses successfully but `validation_required` names an id that has no command in the same bubble config | PASS policy resolve and implementer PASS flow reaches validation gate | policy resolver, not bubble parser, returns the existing invalid-policy result shape with a reason/detail naming the missing command id; gate-level test spies that no command runner invocation occurs, no PASS evidence/log is written for that id, and no built-in or repo-config fallback is attempted | P1 | required-now | `tests/core/runtime/passValidationEvidence.test.ts`, `tests/core/agent/pass.test.ts`, and `tests/v11/infrastructure/executor/validation/passValidationCommandRunner.test.ts` |
| T8 | implementer prompt guidance | bubble config has required commands | start/resume delivery guidance is built | prompt lists ids and commands for local feedback and says PASS re-runs them; both start and resume prompt paths must not imply implementer-run logs can be attached as authoritative PASS evidence | P1 | required-now | `tests/core/bubble/startBubble.test.ts`, `tests/core/runtime/tmuxDelivery.test.ts`, and `tests/v11/application/start/startCommandResumeImplementerPrompt.test.ts` |
| T9 | compatibility | existing bubble config with fixed commands only, plus existing/future bubble configs with unknown `[commands]` keys that satisfy or fail the validation command-id predicate | parse/render and PASS current policy | fixed-field behavior remains accepted; valid unknown keys round-trip as custom command ids; invalid/reserved unknown keys fail config validation instead of being silently dropped | P1 | required-now | `tests/config/bubbleConfig.test.ts` and `tests/core/runtime/passValidationEvidence.test.ts` |
| T10 | unsupported runtime required id | existing or hand-edited bubble config has `validation_required` containing an id that fails the validation command-id predicate or is reserved | bubble config parse or PASS policy resolve, depending on where the invalid value is detected | invalid config/policy result names the unsupported id, no command runner invocation occurs, no PASS evidence/log is written for that id, and no repo-config or built-in fallback is attempted | P1 | required-now | `tests/config/bubbleConfig.test.ts`, `tests/core/runtime/passValidationEvidence.test.ts`, `tests/core/agent/pass.test.ts`, and `tests/v11/infrastructure/executor/validation/passValidationCommandRunner.test.ts` |
| T11 | built-in id override is not custom-id reclassification | repo profile overrides built-in `test`, `typecheck`, `lint`, or `bootstrap` command strings | create resolves and persists commands, then PASS resolves required ids | built-in ids keep built-in identity and evidence kind while using overridden command strings; no built-in id is reclassified as custom | P1 | required-now | `tests/v11/application/create/repoValidationProfileResolver.test.ts`, `tests/config/bubbleConfig.test.ts`, and `tests/core/runtime/passValidationEvidence.test.ts` |
| T12 | materialized custom id and bootstrap round-trip | repo profile defines custom `fitness`, optional `bootstrap`, and ordered `validation.required` that omits `bootstrap` | create writes bubble config and bubble config render/parse round-trips it | custom id and `bootstrap` command strings round-trip through `[commands]`; `validation_required` order is preserved exactly; `bootstrap` is not PASS-required unless explicitly listed | P1 | required-now | `tests/core/bubble/createBubble.test.ts`, `tests/config/bubbleConfig.test.ts`, and `tests/v11/application/create/repoValidationProfileResolver.test.ts` |
| T13 | PASS evidence schema version preservation | custom command id widening changes only command id string values and does not change serialized evidence field names or value shapes | build/read PASS validation evidence | existing evidence schema version remains unchanged; any serialized shape change requires an explicit schema-version bump and matching contract test update | P1 | required-now | `tests/core/runtime/passValidationEvidence.test.ts` |

## L2 - Implementation Notes (Optional)

1. [later-hardening] Consider a dedicated branded type for validation command ids if custom id validation rules become reused outside config/PASS boundaries.
2. [later-hardening] Consider richer UI/status surfacing for configured validation profile after Task 2 clarifies target-aware reads.

## Hardening Backlog

| ID | Item | Layer | Priority | Timing | Source | Proposed Action |
|---|---|---|---|---|---|---|
| H1 | Dedicated validation command id branded type | L2 | P2 | later-hardening | task drafting | Add only if implementation shows repeated validation/normalization logic. |
| H2 | UI/status surfacing of validation profile | L2 | P2 | later-hardening | parent plan deferred scope | Defer until target-aware Task 2/read-model planning. |

## Assumptions

1. The parent plan's `plan_status: approved` and closed contract inventory are authoritative even though the plan file already had uncommitted edits before this task was created.
2. Task 1 may remain a single high-risk foundation slice because the parent plan explicitly authorizes this collapsed boundary and defers target/read-model/cleanup concerns.
3. Frontmatter `status: approved` records the current task metadata state. The Spec Lock section below describes the lifecycle close condition for future document-bubble handling; it is not a separate competing status field and does not authorize ad hoc implementer status edits.

## Open Questions

N/A.

## Review Control

1. Every finding must include: `priority`, `timing`, `layer`, `evidence`.
2. Max 2 L1 hardening rounds.
3. After round 2, new `required-now` is allowed only for evidence-backed `P0/P1`.
4. Items outside L1 blocker scope must be tagged `later-hardening`.
5. If `contract_boundary_override=yes`, `plan_ref` is mandatory and must align with L1 contract rows.
6. If a shared contract changes, current-consumer inventory and additive-vs-breaking classification are mandatory.
7. If an authority fan-out exists, the authority boundary map must stay consistent with the bounded task scope.
8. If baseline behavior is removed or replaced, the task must name the exact replacement path and the proof expected from validation.
9. If `plan_ref` is non-null, `Plan Linkage` and the inherited validation/exit expectation are mandatory and must stay consistent with successor impact notes.
10. If `target_files` are known, `Scope Reality / Shape Proof` is mandatory and the declared task shape must match the inspected touched scope.
11. If the task refines an already-closed authority/shared contract, `Canonical Contract Anchors` and `Canonical Contract Preservation` are mandatory.
12. New terminology for an existing contract must map back to source anchors and field roles explicitly before it can become `required-now`.

## Spec Lock

The task is implementation-ready only while frontmatter `status: approved` remains aligned with ReviewSpec task-mode approval. If a future document-bubble review reopens required refinement, the document-bubble close workflow owns the lifecycle status update back to an implementable/approved state.
