---
artifact_type: plan
artifact_id: plan_repo_level_validation_profile_v2
plan_id: repo-level-validation-profile-plan-v2
created_on: "2026-04-29"
title: "Repo-Level Validation Profile Plan V2"
plan_status: in_progress
prd_ref: null
task_order:
  - 1-repo-validation-profile-base
  - 2-validation-target-resolution
task_tracker:
  - task_id: 1-repo-validation-profile-base
    task_path: plans/archive/tasks/2026-04-29-repo-level-validation-profile-plan-v2/1-repo-validation-profile-base.md
    status: archived
    notes: "First implementation slice: parse repo-level validation config and inherit it into new bubble command config."
  - task_id: 2-validation-target-resolution
    task_path: plans/tasks/repo-level-validation-profile-plan-v2/2-validation-target-resolution.md
    status: in_progress
    notes: "Deferred multi-target/monorepo slice. Do not implement before Task 1 is complete."
active_task_id: 2-validation-target-resolution
archive_group: 2026-04-29-repo-level-validation-profile-plan-v2
supersedes: []
owners:
  - "felho"
---

# Plan: Repo-Level Validation Profile V2

## Objective

Introduce a repo-level validation profile so a repository can define the validation commands that new Pairflow bubbles should use by default.

The immediate goal is narrow: new bubbles should inherit validation defaults from repo-root `pairflow.toml` when present, while preserving current behavior for repositories without that config.

## Supersession

This plan replaces the removed `repo-agnostic-validation-contract` draft lineage.

The previous plan and task files were deleted because they mixed older `src/core/**` ownership paths, a now-stale reviewer-evidence framing, and missing Plan metadata. This file is the only active planning authority for repo-level validation profile work.

## Current Codebase Baseline

1. `src/config/repoConfig.ts` loads `pairflow.toml`, but currently validates every valid object down to `{}`. There is no `[validation]` schema yet.
2. `src/v11/application/create/createCommandRuntime.ts` currently hardcodes new bubble command defaults:
   - `test = "pnpm test"`
   - `typecheck = "pnpm typecheck"`
   - `bootstrap` only when explicit input exists.
3. Bubble config already supports command-level fields:
   - `commands.lint`
   - `commands.test`
   - `commands.typecheck`
   - `commands.bootstrap`
   - `commands.validation_required`
   - `commands.validation_required_explicit`
4. PASS-time validation already resolves `commands.validation_required` from bubble config and runs configured command ids for code bubbles, but today those command ids are fixed to the built-in set.
5. Therefore Phase 1 should focus on repo-config parsing, create-time inheritance into bubble config, and widening PASS validation to support configured custom validation command ids.

## Control Model

Business invariant: repo-level validation defaults must reduce per-bubble setup without hiding which commands are authoritative for a created bubble.

Control model:

1. Canonical repo default source: repo-root `pairflow.toml` `[validation]`.
2. Created bubble execution source: `.pairflow/bubbles/<id>/bubble.toml` `[commands]`.
3. PASS validation source at runtime: the created bubble's `[commands]`, especially `validation_required`.

Read path rule: lifecycle/runtime validation must read the bubble config, not re-resolve repo defaults after bubble creation.

Forbidden fallback: once a repo profile has been selected for a command, runtime failure must not fall back to legacy built-in commands.

Allowed resolution path:

1. `bubble create` loads repo config.
2. It resolves command defaults using explicit input first, repo profile second, legacy defaults last.
3. It writes resolved commands into the new bubble config.
4. Later lifecycle commands use the bubble config as authority.

Missing data rule:

1. Missing `pairflow.toml` or missing `[validation]` means current built-in defaults remain active.
2. Invalid `pairflow.toml` or invalid `[validation]` fails fast with an actionable config error.
3. Multi-target validation config is rejected in Task 1 and deferred to Task 2.

## Contract

### Closed Contract Inventory

Task 1 intentionally widens two existing contracts. This is an authorized
reinterpretation of the current fixed validation-command surface, not an
incidental implementation detail.

Source anchors:

1. `src/types/bubble.ts` currently defines `BubbleCommandsConfig` with fixed
   command fields: `bootstrap`, `lint`, `test`, `typecheck`,
   `validation_required`, and `validation_required_explicit`.
2. `src/config/bubbleConfig.ts` currently parses and renders only those fixed
   `[commands]` keys in `bubble.toml`.
3. `src/v11/infrastructure/artifact/validation/passValidationEvidenceContract.ts`
   currently closes PASS validation command ids to `lint`, `typecheck`, and
   `test`.
4. `src/v11/infrastructure/artifact/validation/passValidationEvidence.ts`
   currently rejects `commands.validation_required` entries that are outside
   that closed id set.

Canonical elements after Task 1:

1. `bubble.toml` `[commands]` remains the created-bubble execution authority.
2. Built-in command ids remain canonical: `lint`, `typecheck`, `test`, and
   `bootstrap`.
3. `validation_required` remains the canonical ordered list of PASS-required
   validation command ids.
4. `validation_required_explicit=true` remains the only way an empty
   `validation_required = []` represents an explicit empty policy.
5. Custom validation command ids become canonical only after they are
   materialized into the created bubble's `[commands]` map.

Guard elements:

1. Repo-level `[validation]` is a create-time default source only; it is not a
   runtime fallback authority after bubble creation.
2. `validation.required` references are validation guards during bubble
   creation: every required id must resolve to an explicit repo command or a
   legacy built-in default before the bubble config is written.
3. Unsupported multi-target fields are phase-boundary guards and must fail
   fast in Task 1.

Compat elements:

1. Existing bubbles with only fixed `lint`, `typecheck`, and `test` fields must
   continue to parse and run.
2. Missing repo-level `[validation]` must keep the legacy create behavior.
3. PASS evidence may keep a `kind` field for command ids, but the type/contract
   must no longer reject custom ids that are present in the same bubble config.

Forbidden reinterpretations:

1. Do not treat repo-level `pairflow.toml` as PASS runtime authority.
2. Do not fall back to built-in commands after a repo profile command was
   selected and written for a created bubble.
3. Do not make `lint` or any custom id required unless it appears in
   `validation.required`.
4. Do not silently accept multi-target config in Task 1.
5. Do not treat implementer-reported validation output as authoritative PASS
   evidence.

### Repo Config Shape

Phase 1 supports one default validation profile only.

The preferred shape is:

```toml
[validation]
required = ["lint", "typecheck", "test", "fitness"]

[validation.commands]
lint = "pnpm lint"
typecheck = "pnpm typecheck"
test = "pnpm test"
fitness = "pnpm fitness:check:ci"
bootstrap = "pnpm install --frozen-lockfile && pnpm build"
```

Rules:

1. `validation.commands` is a map of `command_id -> shell command`.
2. Command ids may include built-in ids and custom ids.
3. Built-in ids with legacy defaults:
   - `typecheck`: `pnpm typecheck`
   - `test`: `pnpm test`
4. Built-in ids without legacy defaults:
   - `lint`
   - `bootstrap`
5. Custom ids, for example `fitness`, must have explicit command strings under `validation.commands`.
6. `validation.commands.bootstrap` is optional. If absent, no bootstrap command is written unless explicit bubble input provides one.
7. `validation.required` is optional. If absent, the bubble keeps current PASS validation policy behavior by not writing `commands.validation_required`.
8. If `validation.required = []` is present, create writes `validation_required = []` and `validation_required_explicit = true`.
9. If `validation.required` references a command id that has no explicit repo command and no legacy default, create fails fast.
10. Unsupported multi-target fields are rejected in Task 1 with a clear phase-boundary error.

Deferred scope:

1. Multi-target or monorepo target resolution.
2. Target-specific working directories.
3. Per-context validation policy.
4. Runtime validation failure policy changes.

### Precedence

For each command id independently:

1. Explicit bubble create input wins.
2. Repo-level `[validation.commands]` wins when there is no explicit bubble input.
3. Legacy built-in defaults apply only when neither explicit input nor repo profile value exists.

Current legacy defaults:

1. `test`: `pnpm test`
2. `typecheck`: `pnpm typecheck`
3. `bootstrap`: absent
4. `lint`: absent
5. custom ids: absent unless configured

### Non-Goals

Task 1 must not:

1. introduce multi-target matching,
2. change PASS command execution semantics,
3. change lifecycle state machine behavior,
4. require reviewer-evidence rewrites beyond compatibility tests proving current behavior still consumes bubble config,
5. add a second validation config file.

### Implementer Prompt and PASS Enforcement

Task 1 should make required validation visible to the implementer, but PASS remains authoritative.

Prompt behavior:

1. Start/resume implementer guidance should list the required validation command ids and shell commands from the bubble config.
2. The wording must say that the implementer can use those commands before PASS for local feedback.
3. The wording must also say Pairflow re-runs required validation during PASS.

Enforcement behavior:

1. PASS validation reads `commands.validation_required` from the bubble config.
2. For each required command id, PASS resolves the shell command from the same bubble config.
3. PASS runs the commands itself and writes logs/evidence.
4. Implementer-reported command output is not authoritative for this slice.
5. Reusing implementer-run validation evidence is explicitly out of scope because it needs fingerprinted same-HEAD/same-worktree proof.

## Task Breakdown

### Task 1: Repo Validation Profile Foundation

Goal: implement single-profile repo validation defaults and create-time inheritance.

Expected target areas:

1. `src/config/repoConfig.ts`
2. `tests/config/repoConfig.test.ts`
3. a new v11 validation profile resolver module under the narrowest correct `src/v11/**` scope
4. `src/v11/application/create/createCommandRuntime.ts`
5. create-path tests that already cover bubble config generation
6. `src/v11/application/pass/**` and `src/v11/infrastructure/artifact/validation/**` where needed to support custom validation command ids
7. implementer start/resume prompt builder paths where required validation guidance is rendered

Inherited contract-boundary requirements:

1. Preserve the fixed-field compatibility contract for existing bubble configs.
2. Add custom validation command id support without making repo config a runtime
   PASS authority.
3. Update PASS validation evidence/types so a custom id such as `fitness` can
   be represented, executed, logged, and reported when listed in the created
   bubble config's `commands.validation_required`.
4. Keep built-in command defaults explicit and bounded to create-time
   resolution.
5. Keep unsupported multi-target config rejected with a phase-boundary error.

Acceptance:

1. `[validation]` can be parsed and validated from `pairflow.toml`.
2. Missing `[validation]` preserves current create behavior.
3. Invalid `[validation]` fails fast.
4. Explicit create input overrides repo profile values.
5. Repo profile values override built-in defaults.
6. Resolved commands are persisted into `bubble.toml`.
7. `validation.required` is persisted into `commands.validation_required`.
8. `validation.required = []` is persisted as an explicit empty policy.
9. Custom validation command ids, such as `fitness`, are persisted and run by PASS when listed in `validation.required`.
10. Implementer prompt guidance lists required validation commands and explains PASS re-runs them.
11. Unsupported multi-target fields fail with a phase-boundary error.

### Task 2: Validation Target Resolution

Goal: add deterministic multi-target support after Task 1 is complete.

Deferred scope:

1. target ids,
2. path selectors,
3. per-target cwd,
4. ambiguity handling,
5. lifecycle integration for target-aware validation.

Task 2 must be created as a fresh task artifact before implementation. The current plan only reserves its sequence slot.

## Validation Strategy

Task 1 tests should cover:

1. repo config parse success,
2. missing config fallback,
3. invalid config failure,
4. unsupported target fields rejection,
5. precedence matrix,
6. bubble config rendering includes inherited commands,
7. `validation_required` compatibility with current PASS validation policy,
8. custom required command execution through PASS validation,
9. implementer prompt guidance includes required validation commands without implying implementer evidence is authoritative.

Manual verification before commit:

1. `pnpm lint`
2. `pnpm typecheck`
3. relevant unit tests for repo config, create path, and PASS validation policy
4. `pnpm build` because source/runtime-affecting files change

## Risks

1. Risk: config schema becomes too broad again. Mitigation: Task 1 rejects deferred fields instead of accepting partial semantics.
2. Risk: repo defaults are re-read during lifecycle and diverge from created bubble config. Mitigation: create-time materialization only; runtime reads bubble config.
3. Risk: explicit bubble overrides lose precedence. Mitigation: per-command precedence tests.
4. Risk: existing repos without `[validation]` regress. Mitigation: no-profile regression tests.
5. Risk: `lint` becomes accidentally required for every repo. Mitigation: `lint` is optional unless present in `validation.required`.
6. Risk: implementer and PASS validation both run the same commands and this surprises users. Mitigation: prompt wording explicitly says PASS re-runs required validation.
