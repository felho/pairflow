---
artifact_type: plan
artifact_id: plan_core_zero_retirement_v1
title: "Core Zero Retirement Plan"
status: draft
prd_ref: null
owners:
  - "felho"
---

# Plan: Core Zero Retirement

## Objective

Deliver the repository to a true `core-zero` end-state:

1. `src/core/**` is not a tolerated permanent compatibility layer.
2. The final target is to eliminate the remaining `src/core/**` code, not merely to stabilize an intermediate bridge inventory.
3. `src/v11/**` becomes the only canonical home for retained application, domain, shared, and infrastructure behavior.
4. Any temporary bridge introduced on the way must be explicitly tracked and then retired in a later wave; no bridge is treated as an acceptable steady state.
5. The end of this plan is a repository state where legacy `src/core/**` files are either deleted or proven unnecessary.

Success means:

- no meaningful runtime or test dependency remains on `src/core/**`,
- the remaining `src/core/**` file count trends to `0`,
- direct `src/v11/**` or `src/cli/**` imports from `src/core/**` stay at `0`,
- no residual compatibility-facade logic remains hidden behind parity or contract harnesses,
- `core-shim-boundary-coverage` can enforce a zero-inventory end-state again.

## Complexity / Split Rationale

1. `risk_score`: `9`
2. Why a plan is needed:
   - this work moves and deletes canonical ownership,
   - the same concept spans application/domain/shared/infrastructure/test surfaces,
   - refactor and runtime preservation must be separated cleanly,
   - a naive delete-first approach would create regressions or false parity.
3. Split decision:
   - `foundation/refactor`
   - `delivery`
   - `activation/rollout`
4. Milestone-gated behavior to defer:
   - no product behavior activation is deferred,
   - but stricter `core-zero` sentinel promotion should happen only after the final deletion waves are complete.

## Current Baseline

Latest verified baseline at plan creation:

- `ci:local`: PASS
- `fitness:check:ci`: PASS
- direct `src/v11/**` and `src/cli/**` imports from `src/core/**`: `0`
- current `src/core/**` file count: `139`

Interpretation:

- the repository is no longer blocked on the old `v11 -> core` dependency frontier,
- but the larger endgame is still open because a substantial `src/core/**` tree remains,
- therefore the next phase is no longer "dependency unblock", but "remove the remaining legacy compatibility layer itself".

## End-State Policy

This plan uses the following hard rule:

1. Interim bridge inventories are allowed only as temporary migration steps.
2. Temporary bridge inventories are not the success metric.
3. The final success metric is the disappearance of the remaining `src/core/**` code.
4. If a residual `src/core/**` file is kept for any reason, that file must have an explicit architectural exception and expiry condition; otherwise it is a deletion candidate.

## Parallelization Model

This plan is intentionally written for aggressive parallel execution.

Safe operating model:

1. Up to `8-10` active agents may work in parallel.
2. Every agent gets its own worktree.
3. Every agent operates on one bounded lane with a disjoint write set.
4. Every lane must end in a runnable intermediate state:
   - targeted tests pass,
   - `typecheck` passes,
   - no known merge-conflicting half-state is left behind.
5. After each small logical commit:
   - merge to `main`,
   - sync `main` back into the other active worktrees,
   - continue from the updated baseline.

Unsafe parallelization patterns:

1. Multiple agents editing the same compatibility facade family at once.
2. Multiple agents redefining the same replacement `v11` authority surface at once.
3. Mixing deletion of a `core` facade with concurrent updates to the tests that still assume it exists.

## Core Retirement Typology

Every `src/core/**` file belongs to exactly one temporary working bucket:

1. `thin_shim`
   - simple re-export or near-zero logic,
   - delete as soon as no consumers remain.
2. `compatibility_facade`
   - preserves old naming or public shape,
   - can disappear only after consumers, parity assumptions, and harness expectations are migrated.
3. `retained_behavior`
   - still contains meaningful logic or composition,
   - requires explicit migration into `src/v11/**` before deletion.

The important rule:

- we are not planning to preserve these buckets,
- we are using them only to decide the safest deletion order.

## Phase Breakdown

| Phase | Goal | Inputs | Outputs | Exit Criteria |
|---|---|---|---|---|
| Phase 1 | Build a reliable `core-zero` inventory and lane map | current `src/core/**`, current tests, current bridge inventory | categorized deletion ledger, lane ownership, explicit zero-end-state policy | every `src/core/**` file belongs to a lane and a typology bucket |
| Phase 2 | Retire delete-ready thin shims and trivial bridges in parallel | Phase 1 ledger | multiple small deletion batches merged to `main` | all `thin_shim` files with no remaining consumers are deleted |
| Phase 3 | Retire compatibility facades by migrating tests, callers, and public assumptions | Phase 2 baseline | command-family closure batches | compatibility facades are reduced to only the truly retained-behavior families |
| Phase 4 | Migrate retained behavior into `src/v11/**` and delete the remaining `core` owners | Phase 3 baseline | owner-migration batches by domain/capability | every retained-behavior `core` file has either moved or been deleted |
| Phase 5 | Remove the final sentinel exceptions and enforce `core-zero` | Phase 4 baseline | zero-inventory sentinel, retired bridge removal, final doc updates | `src/core/**` is functionally eliminated and policy is back to hard zero |

## Lane Breakdown

The lane model is designed for parallel execution with up to `10` agents.

### Lane 1: Bubble Thin Shims

Scope:

- `src/core/bubble/paths.ts`
- `src/core/bubble/bubbleLookup.ts`
- `src/core/bubble/workspaceResolution.ts`
- similar pure bridge files in `bubble/*`

Goal:

- delete files that are already behavior-empty once consumers are migrated.

Parallelization:

- high

### Lane 2: Bubble Compatibility Facades

Scope:

- `src/core/bubble/startBubble.ts`
- `src/core/bubble/restartBubble.ts`
- `src/core/bubble/listBubbles.ts`
- `src/core/bubble/openBubble.ts`
- `src/core/bubble/statusBubble.ts`
- neighboring command-shaped facades

Goal:

- migrate remaining consumers and parity assumptions off these public compatibility wrappers.

Parallelization:

- medium, command-family disjoint only

### Lane 3: Agent/Human Facades

Scope:

- `src/core/agent/*`
- `src/core/human/*`

Goal:

- eliminate compatibility surfaces such as `askHuman`, `reply`, `approval`, `pass` lineage if still retained through core-facing contracts or harnesses.

Parallelization:

- medium-high, because command families can usually be isolated

### Lane 4: Runtime/Tmux/Sessions Bridges

Scope:

- `src/core/runtime/tmux*`
- `src/core/runtime/sessionsRegistry.ts`
- `src/core/runtime/agentCommand.ts`
- `src/core/runtime/reviewer*`

Goal:

- move the remaining compatibility entrypoints fully onto `src/v11/infrastructure/**` or remove them once consumers are gone.

Parallelization:

- medium, avoid concurrent edits to the same runtime family

### Lane 5: State/Protocol Primitives

Scope:

- `src/core/state/*`
- `src/core/protocol/*`

Goal:

- eliminate remaining low-level compatibility bridges after all higher-level consumers stop depending on them.

Parallelization:

- low-medium, because these are high-fan-out primitives

### Lane 6: Reviewer/Gates/Validation

Scope:

- `src/core/reviewer/*`
- `src/core/gates/*`
- `src/core/validation.ts`

Goal:

- migrate retained canonical contract logic into `src/v11/shared/**` or `src/v11/infrastructure/**` and delete old facades.

Parallelization:

- medium

### Lane 7: Metrics/Reporting

Scope:

- `src/core/metrics/*`

Goal:

- remove residual reporting and metrics compatibility layers after v11 consumers and reports use only `src/v11/**`.

Parallelization:

- medium

### Lane 8: UI/Repo/Workspace/Util

Scope:

- `src/core/ui/*`
- `src/core/repo/*`
- `src/core/workspace/*`
- `src/core/util/*`

Goal:

- delete infrastructure and utility bridges once all callers are routed to their v11 owners.

Parallelization:

- high, because sub-families are mostly disjoint

### Lane 9: Watchdog/Archive

Scope:

- `src/core/watchdog/*`
- `src/core/archive/*`

Goal:

- migrate any retained runtime/archive behavior and then delete the compatibility files.

Parallelization:

- medium

### Lane 10: Meta-Review / Convergence Retained Behavior

Scope:

- `src/core/bubble/metaReview.ts`
- `src/core/bubble/metaReviewExecutionContext.ts`
- `src/core/bubble/metaReviewGate.ts`
- `src/core/convergence/*`
- neighboring retained-behavior clusters

Goal:

- resolve the hard cases where core may still hide real behavior, not just naming bridges.

Parallelization:

- low, this should usually be a dedicated lane

## Task List

1. `plans/tasks/core-zero/phase1-inventory-and-lane-map.md`
2. `plans/tasks/core-zero/phase2-bubble-thin-shim-retirement.md`
3. `plans/tasks/core-zero/phase2-runtime-ui-util-retirement.md`
4. `plans/tasks/core-zero/phase3-agent-human-facade-retirement.md`
5. `plans/tasks/core-zero/phase3-bubble-facade-retirement.md`
6. `plans/tasks/core-zero/phase4-reviewer-gates-migration.md`
7. `plans/tasks/core-zero/phase4-state-protocol-migration.md`
8. `plans/tasks/core-zero/phase4-metrics-watchdog-archive-migration.md`
9. `plans/tasks/core-zero/phase4-meta-review-convergence-migration.md`
10. `plans/tasks/core-zero/phase5-core-zero-sentinel-promotion.md`

## Dependencies

1. The current `ci:local` green baseline must be preserved after every merged batch.
2. The current explicit residual bridge inventory must stay documented until the final zero-inventory phase removes it.
3. High-fan-out primitives (`state`, `protocol`, `runtime sessions`, `tmux`) should not be migrated concurrently by multiple agents.
4. Test-harness and parity expectations must be migrated before deleting any compatibility facade they still reference.

## Risks and Mitigations

1. Hidden consumer risk - each phase starts from inventory, not assumptions.
2. Merge-churn risk under heavy parallelism - use bounded write sets, short-lived worktrees, and immediate main sync after every merge.
3. False sense of completion risk - success is defined as `core-zero`, not as "dependency checks are green".
4. Parity tautology risk - never replace both baseline and v11 paths with the same implementation without first redesigning the affected harness.
5. Primitive fan-out risk - state/protocol/runtime lanes stay narrow and serialize when necessary.

## Validation Strategy

1. For every lane batch:
   - targeted `eslint`
   - targeted `vitest`
   - `pnpm typecheck`
2. At every merge checkpoint:
   - `pnpm fitness:check:ci`
3. At every phase exit:
   - `pnpm run ci:local`
4. At the final phase:
   - zero-inventory `core-shim-boundary-coverage`
   - updated `core` file count ledger
   - explicit proof that no retained `src/core/**` consumers remain

## Immediate Next Step

Create the Phase 1 inventory task and refresh the current `src/core/**` ledger to a machine-auditable form:

1. every file tagged as `thin_shim`, `compatibility_facade`, or `retained_behavior`
2. every tag mapped to a lane
3. every lane marked:
   - `parallel_safe`
   - `serial_only`
   - or `depends_on_other_lane`

Without this ledger, aggressive 8-10 agent parallelization would create conflict noise instead of throughput.
