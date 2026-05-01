---
artifact_type: plan
artifact_id: plan_repo_defaults_create_time_v1
plan_id: repo-defaults-create-time-plan-v1
created_on: "2026-05-01"
title: "Repo Defaults Create-Time Plan V1"
plan_status: draft
prd_ref: null
task_order:
  - 1-repo-defaults-create-time
task_tracker:
  - task_id: 1-repo-defaults-create-time
    task_path: plans/tasks/1-repo-defaults-create-time.md
    status: approved
    notes: "Add repo-root pairflow.toml [defaults] support and materialize supported defaults into newly created bubble.toml files."
active_task_id: 1-repo-defaults-create-time
archive_group: 2026-05-01-repo-defaults-create-time-plan-v1
supersedes: []
owners:
  - "felho"
---

# Plan: Repo Defaults Create-Time V1

## Objective

Add a narrow repo-level defaults surface so repo-root `pairflow.toml` can provide default values for newly created bubbles.

The plan is intentionally one task: parse and validate `[defaults]`, resolve create-time precedence, and write the resolved values into the new bubble's `.pairflow/bubbles/<id>/bubble.toml`.

## Done Definition

1. Repo-root `pairflow.toml` accepts a supported `[defaults]` contract for new bubble creation.
2. `bubble create` materializes supported repo defaults into the created bubble config.
3. Explicit create input wins over repo defaults.
4. Missing `[defaults]` preserves current built-in defaults.
5. Later lifecycle commands continue to use the created bubble's `bubble.toml`; they do not re-read repo-root `pairflow.toml`.

## Control Model

Business invariant: repo defaults reduce repetitive create flags without hiding the durable authority for a created bubble.

Control model:

1. Repo-root `pairflow.toml` `[defaults]` is create-time default authority only.
2. `.pairflow/bubbles/<id>/bubble.toml` remains the created bubble runtime and lifecycle authority.
3. CLI/API explicit create input has higher precedence than repo defaults.
4. Built-in defaults remain the fallback when neither explicit input nor repo defaults supply a supported field.

Read path rule: only `bubble create` reads repo defaults; later lifecycle, status, PASS, start, approval, commit, and merge paths read the bubble config.

Forbidden fallback: runtime paths must not re-read repo defaults to fill missing bubble config fields.

Allowed resolution path: explicit create input -> repo `[defaults]` -> built-in defaults, then persist the resolved value in `bubble.toml`.

Missing data rule: missing `pairflow.toml` or missing `[defaults]` preserves current behavior; invalid `[defaults]` fails fast before bubble persistence.

## Open Task

1. `1-repo-defaults-create-time`: add the supported `[defaults]` schema and create-time materialization path.

## Deferred Work

1. Extended repo defaults for `local_overlay`, `open_command`, `open_remote_command`, `notifications`, and default remote/executor selection.
2. Existing bubble migration or backfill.
3. Runtime inheritance.
4. UI editing for repo defaults.

## Validation Strategy

1. Repo config parser/validator tests for valid, missing, partial, and invalid `[defaults]`.
2. Create-flow tests proving precedence and materialized `bubble.toml` output.
3. CLI create tests proving `--base` may be omitted only when repo defaults provide `base_branch`, and fails clearly otherwise.
4. Existing validation-profile tests remain green.
5. Run relevant unit tests plus `pnpm lint`, `pnpm typecheck`, and `pnpm build`.
