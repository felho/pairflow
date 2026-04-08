# Core Shim Retirement Wave Plan V1

Last updated from `main` after the temporary warn-only downgrade of
`tests/contracts/v11/core-shim-boundary-coverage.test.ts`.

## Goal

Retire the remaining `src/v11/**` and `src/cli/**` direct imports from
`src/core/**` without mixing simple shim rewrites with deeper architecture
decisions. The end-state is:

- easy shim-through imports removed first,
- medium dependency-resolution and contract-shape bridges removed second,
- hard retained-behavior or boundary-design cases handled explicitly,
- `core-shim-boundary-coverage` promoted back from warn-only to fail-only.

## Why A Wave Plan Is Needed

The current residual set is mixed:

- some `v11 -> core` imports are only thin re-export shims,
- some are dependency-resolution or type-contract bridges,
- some may still hide retained compatibility behavior or missing `ports`
  boundaries.

Treating the whole set as a single cleanup batch would either:

- block on the hardest residuals too early, or
- encourage unsafe path-only rewrites without clarifying ownership.

## Source Of Truth

- `tests/contracts/v11/core-shim-boundary-coverage.test.ts`
- `docs/architecture/v11-placement-and-extraction-governance.md`
- `docs/architecture/architecture-fitness-checks.md`
- `plans/v11-closure-and-residual-core-plan-v1.md`

## Current Operating Baseline

The boundary coverage test is temporarily warn-only because the current repo
state still contains a large residual `v11/cli -> core` surface.

Observed warning snapshot when the test was downgraded:

- about `323` direct `src/v11/**` or `src/cli/**` imports from `src/core/**`
- about `17` imports in the explicit retired-shim subset
- about `2` public `src/index.ts` exports still pointing at `./core/...`

These numbers are triage inputs, not yet a finalized ledger.

## Wave 0 Findings

Initial inventory run from `tests/contracts/v11/core-shim-boundary-coverage.test.ts`
shows:

- total direct residual imports: `323`
- retired-shim subset: `17`
- public `src/index.ts -> ./core/...` exports: `2`

Initial cluster distribution:

- `shared/metaReviewGate`: `35`
- `infrastructure/ui`: `31`
- `application/start`: `27`
- `application/pass`: `23`
- `shared/metaReview`: `21`
- `application/watchdog`: `20`
- `application/converged`: `18`
- `application/delete`: `14`
- `application/merge`: `13`
- `shared/askHuman`: `13`

Initial target distribution:

- `src/core/state/stateStore.ts`: `63`
- `src/core/bubble/bubbleLookup.ts`: `48`
- `src/core/protocol/transcriptStore.ts`: `37`
- `src/core/runtime/sessionsRegistry.ts`: `21`
- `src/core/runtime/tmuxManager.ts`: `18`
- `src/core/runtime/tmuxDelivery.ts`: `13`
- `src/core/bubble/bubbleInstanceId.ts`: `11`
- `src/core/workspace/git.ts`: `8`
- `src/core/runtime/pairflowCommand.ts`: `8`
- `src/core/bubble/workspaceResolution.ts`: `7`

Most important triage result:

- about `320 / 323` residual imports currently target thin or near-thin
  `core` bridge files,
- only `3 / 323` residual imports currently point at non-thin `core` targets:
  - `src/core/bubble/createBubble.ts`
  - `src/core/util/fileLock.ts`
  - `src/core/metrics/events.ts`

This means the next wave should aggressively favor thin-shim consumer rewrites
before opening deeper architecture batches.

## Classification Model

Every residual `v11/cli -> core` edge should be classified into one of these
three buckets before rewrite work starts.

### A. Easy Rewrite

Definition:

- `core` target is a thin re-export or very small facade,
- no extra contract meaning is added by the `core` path,
- canonical `v11` target is already obvious.

Typical shape:

- `export * from "../../v11/..."`
- one-symbol re-export with no behavior

Expected action:

- rewrite imports directly to the canonical `v11` owner,
- validate feature tests,
- remove from the residual inventory.

### B. Medium Bridge With Contract

Definition:

- the `core` import is still only a bridge, but the consumer file also builds
  dependency contracts, default wiring, or type surfaces from it,
- path rewrite alone is not enough because the consumer boundary must stay
  coherent.

Typical shape:

- dependency-resolution modules,
- command contract/default-wiring modules,
- type-only surfaces built from `typeof coreFunction`.

Expected action:

- retarget the consumer to canonical `v11` owners or explicit `shared/ports`,
- keep the consumer contract stable,
- validate the command/feature cluster,
- only then consider retiring the shim.

### C. Hard Retained Dependency

Definition:

- the `core` path still carries retained behavior, compatibility logic, or a
  missing architecture boundary,
- direct rewrite would either change behavior or force an implicit boundary
  decision.

Typical shape:

- retained behavior in `core`,
- compatibility adapter still serving multiple lanes,
- application-facing dependency that should probably become a `shared/ports`
  contract first.

Expected action:

- do not hide it with blind path rewrites,
- open a dedicated boundary/ownership batch,
- only retire the shim after the replacement boundary is explicit.

## Wave Strategy

### Wave 0: Inventory And Tagging

Goal:

- build the initial residual inventory from the boundary coverage test output,
- tag each edge as `easy`, `medium`, or `hard`,
- identify clusters by consumer lane.

Required output:

- residual inventory table,
- cluster grouping,
- first bounded batch candidates.

### Wave 1: Easy Rewrites

Goal:

- remove the clear thin-shim imports first,
- do not redesign boundaries here,
- maximize count reduction with low regression risk.

Expected effect:

- the raw residual count should fall quickly,
- some currently medium-looking clusters will simplify after surrounding easy
  edges disappear.

### Wave 2: Reclassification

Goal:

- rerun the residual report after Wave 1,
- reclassify the remaining set,
- promote newly simplified cases from `medium` to `easy`.

This wave is mandatory. Do not assume the initial classification remains
accurate after the first cleanup passes.

### Wave 3: Medium Contract Cleanup

Goal:

- handle dependency-resolution and contract-shape bridges cluster by cluster.

Preferred cluster order:

1. `approval`
2. `status` / `inbox`
3. `restart` / `reconcile`
4. `askHuman` / `kickoff`
5. `metaReviewGate` or other residual command clusters

Rule:

- each batch must keep behavior stable and avoid mixing unrelated `ports`
  redesign work unless the batch cannot be made correct without it.

### Wave 4: Hard Residuals

Goal:

- isolate the few remaining cases that still need architecture decisions.

Possible outcomes:

- new `shared/ports/**` contract,
- explicit compatibility bridge retained for a documented period,
- real owner move out of `core`,
- public API realignment.

### Wave 5: Boundary Test Re-hardening

Goal:

- return `tests/contracts/v11/core-shim-boundary-coverage.test.ts` to fail-only.

Promotion gate:

- no retired-shim imports remain under `src/v11/**`,
- no silent `src/cli/** -> src/core/**` growth remains,
- any explicitly retained hard residuals are documented and allowlisted with a
  concrete justification,
- the warning-only branch of the test is no longer needed.

## Initial Example Classification

These are examples only, not yet the full inventory.

### Likely Easy

- `src/v11/application/create/createCommandApi.ts`
  - `createBubble` currently re-exported from `src/core/bubble/createBubble.ts`
  - candidate for direct rewrite once the canonical owner is confirmed
- any consumer currently importing these top thin targets:
  - `src/core/state/stateStore.ts`
  - `src/core/bubble/bubbleLookup.ts`
  - `src/core/protocol/transcriptStore.ts`
  - `src/core/runtime/sessionsRegistry.ts`
  - `src/core/runtime/tmuxManager.ts`
  - `src/core/runtime/tmuxDelivery.ts`
  - `src/core/bubble/bubbleInstanceId.ts`
  - `src/core/workspace/git.ts`
  - `src/core/runtime/pairflowCommand.ts`
  - `src/core/bubble/workspaceResolution.ts`

### Likely Medium

- `src/v11/application/approval/approvalCommandDependencyResolution.ts`
  - imports transcript/state/tmux/bubble helpers through `core`,
  - also builds dependency contracts and default wiring from them,
  - not a pure path rewrite.
- `src/v11` consumer files that aggregate many thin shim imports into one
  dependency-resolution or command-contract module should still be treated as
  `medium` even when every individual target is a thin shim.

### Likely Hard

- any residual where `core` still carries retained compatibility behavior or
  where the correct end-state should be an explicit `shared/ports/**` boundary
  instead of a direct `application -> infrastructure` rewrite.
- current concrete candidates:
  - `src/core/bubble/createBubble.ts`
  - `src/core/metrics/events.ts`
- `src/core/util/fileLock.ts` looks almost-thin, but keep it out of the first
  path-only wave until the exact consumer contract is checked.

## Batch Rules

- Do not mix `easy` and `hard` work in the same commit.
- Prefer consumer-cluster batches over provider-cluster batches.
- If the canonical owner is not obvious, stop and classify the edge as `hard`
  until proven otherwise.
- Do not promote code into `shared` only to hide a `core` import.
- If a `medium` case requires `ports`, create or reuse the smallest correct
  `shared/ports/**` contract instead of a thin wrapper.

## Validation Per Batch

- relevant `vitest` scope
- targeted `eslint`
- `pnpm typecheck`
- `pnpm exec tsx tools/fitness/run-report.ts`
- rerun `tests/contracts/v11/core-shim-boundary-coverage.test.ts`

If the batch changes `src/**` and then any bubble lifecycle command is used for
validation, run `pnpm build` first.

## Ledger Template

| Wave | Cluster | Classification | Status | Notes |
| --- | --- | --- | --- | --- |
| W0 | inventory and initial tagging | mixed | planned | Build the first residual table from the current warn-only coverage output |
| W1 | inventory and initial tagging | mixed | completed | Initial coverage run shows `323` residual imports; `320` target thin or near-thin `core` bridges, so the backlog is dominated by consumer rewrites rather than retained `core` behavior |
| W2 | easy rewrite batch 1 | easy | validated | First safe rewrites landed only where the consumer layer stayed valid: `emitOpenV11` now imports `shellQuote` from `shared/foundation`, and `eventsStore` now imports `fileLock` from the canonical `infrastructure/foundation` owner; coverage moved from `323 -> 321` total and `17 -> 15` retired-shim warnings |
| W3 | easy rewrite batch 2 | easy | planned | Continue thin-shim removals, then rerun classification |
| W4 | approval dependency bridge | medium | planned | Rewrite `approval` contract/default wiring away from `core` shims |
| W5 | status and inbox bridge cleanup | medium | planned | Resolve read-side contract leakage without broad redesign |
| W6 | hard residual review | hard | planned | Decide `ports`, retained bridge, or owner-move outcome |
| W7 | boundary test re-hardening | mixed | planned | Return coverage test to fail-only |

## Stop Conditions

This wave should stop only when one of these is true:

1. the boundary coverage test is back to fail-only and green,
2. the remaining residuals are explicitly documented hard cases with a separate
   approved architecture plan,
3. or the repo intentionally accepts a smaller documented allowlist instead of
   full elimination.

## Immediate Next Step

Start with Wave 0:

- collect the current warn-only coverage inventory,
- group it by consumer cluster,
- tag each residual as `easy`, `medium`, or `hard`,
- then open the first thin-shim rewrite batch.

Wave 0 is now complete enough to start Wave 1:

- start with thin-shim consumer rewrites against:
  - `stateStore`
  - `bubbleLookup`
  - `transcriptStore`
  - `sessionsRegistry`
  - `tmuxManager`
  - `tmuxDelivery`
- defer `createBubble`, `metrics/events`, and the `fileLock` bridge until the
  thin-target frontier is materially smaller.

Wave 1 lesson from the first batch:

- `thin core target` does **not** automatically mean `easy consumer rewrite`,
- application-layer consumers cannot be rewritten straight to
  `v11/infrastructure/**` without opening dependency violations,
- therefore the remaining easy frontier should prefer:
  - `infrastructure -> infrastructure` rewrites,
  - `shared -> shared` rewrites,
  - `application -> shared` rewrites,
- and defer `application -> infrastructure` candidates to the `medium` wave
  unless an existing `shared/ports/**` or `shared/**` canonical boundary
  already exists.
