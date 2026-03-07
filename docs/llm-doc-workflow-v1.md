# LLM Document Workflow v1

Status: draft
Date: 2026-03-04

## Purpose

This workflow defines how to create PRDs, plans, and task files so:
1. docs stay implementable for LLMs,
2. review loops do not become infinite,
3. teams can keep repo-specific writing style while following one minimal contract.

## Artifact Topology

Default topology for medium/large work:
1. PRD file: `docs/prd/<feature>-prd.md`
2. Plan file: `plans/<feature>-plan.md` (must reference PRD)
3. Task files: `plans/tasks/<feature>/<phase>-<slug>.md` (must reference PRD and Plan)

Small standalone change (bugfix/small task):
1. One task file only, with `prd_ref: null` and `plan_ref: null`.

Contract-boundary override (mandatory):
1. If the change modifies DB/API/event/auth/config contract, task-only is not enough.
2. Minimum chain becomes `Plan -> Task` (`plan_ref` must be non-null).
3. For large/new-app scope, keep `PRD -> Plan -> Task`.

## Required Frontmatter Contract

Every task file must contain:
1. `artifact_type: task`
2. `artifact_id`
3. `status`
4. `prd_ref` (path or `null`)
5. `plan_ref` (path or `null`)
6. `system_context_ref` (path or `null`)
7. `phase` (string)

## Task Structure (Single Source of Truth)

Each task has one source-of-truth file with this order:
1. `L0 - Policy` (goal/scope/out-of-scope/safety defaults)
2. `L1 - Change Contract` (must-have implementation contract)
3. `L2 - Implementation Notes` (optional hardening only)

Rule: only `L1` blocker items can block implementation.

## Review Policy

Every review finding must include:
1. `priority`: `P0|P1|P2|P3`
2. `timing`: `required-now|later-hardening`
3. `layer`: `L1|L2`
4. `evidence`: repro, failing output, or precise code-path proof

Round policy:
1. Max 2 L1 hardening rounds.
2. After round 2, new `required-now` is allowed only for evidence-backed `P0/P1`.
3. Other findings move to `later-hardening`.

Spec lock:
1. If all `P0/P1 + required-now` are closed, task state is `IMPLEMENTABLE`.

## Roles and Order

1. Engineer
   - creates/updates PRD/Plan/Task docs,
   - commits doc artifacts on `main`,
   - starts bubble from committed task.
2. Implementer agent
   - implements against L1 contract.
3. Reviewer agent
   - tags findings with required fields,
   - keeps blocker boundary (`P0/P1`) strict.
4. Engineer
   - responds in `WAITING_HUMAN`,
   - decides approve/rework in `READY_FOR_APPROVAL`,
   - closes bubble.

## Pairflow Lifecycle Command Order

Pre-flight:
```bash
git status --short
```

Create/start:
```bash
pairflow bubble create --id <id> --repo <abs_repo_path> --base main --task-file <abs_task_path>
pairflow bubble start --id <id> --repo <abs_repo_path> --attach
pairflow bubble status --id <id> --repo <abs_repo_path> --json
```

Human intervention:
```bash
pairflow bubble reply --id <id> --repo <abs_repo_path> --message "<message>"
pairflow bubble request-rework --id <id> --repo <abs_repo_path> --message "<message>"
pairflow bubble approve --id <id> --repo <abs_repo_path>
```

Close:
```bash
pairflow bubble commit --id <id> --repo <abs_repo_path> --auto
pairflow bubble merge --id <id> --repo <abs_repo_path>
```

## Evidence Ref Policy (Phase 1)

Command verificationhez csak whitelistelt log refeket adj:
1. Elfogadott minta: `.pairflow/evidence/<single-segment>.log`
2. Elfogadott minták példái:
   - `--ref .pairflow/evidence/lint.log`
   - `--ref /abs/path/to/worktree/.pairflow/evidence/test.log#L1`
3. Nem elfogadott:
   - nested path (`.pairflow/evidence/subdir/test.log`)
   - nem `.log` kiterjesztés (`.pairflow/evidence/test.txt`)
   - artifact/prose ref (`done-package.md`, `reviewer-test-verification.json`)
   - URL/protocol ref (`https://...`)

## Scenario Recipes

### A) Bugfix in existing system

1. Create one task file (`L0/L1/L2` in one file).
2. Commit task file on `main`.
3. Start one bubble from that task file.
4. Run max 2 L1 review rounds.
5. Spec lock -> implement -> close.

### B) Small feature in existing system

1. Check contract-boundary override first:
   - if no contract/interface change: one task file is enough.
   - if contract/interface change exists: create one plan + one or two tasks.
2. Commit docs on `main`.
3. Start bubble per task.
4. Close each bubble independently.

### C) Large feature

1. Create full PRD + phase plan.
2. Create phase task files (one L1 contract per phase).
3. Run bubble phase-by-phase (no giant single task).
4. Lock and merge phase before opening next phase.

### D) New app kickoff

1. Create vision/scope PRD + foundation ADRs + MVP plan.
2. Create stream tasks (backend, frontend, auth, infra).
3. Start bubbles per stream only when task contracts are ready.
4. Merge foundation first, then stream tasks.

## Adoption Strategy

1. Phase 1 (`advisory`): check and warn only.
2. Phase 2 (`required-docs`): hard-gate doc-only/task bubbles.
3. Phase 3 (`required-all`): enforce on all bubbles.
