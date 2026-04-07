# Dependency Cleanup Wave Plan V1

Last updated from `main` at `5cd500f8`.

## Goal

Reduce the remaining `dependency` fitness failures by removing real forbidden
`application -> infrastructure` and selected `shared -> infrastructure` edges
without gaming the checker. Use `shared/ports/**` only for real capability
contracts, not thin wrappers.

## Strategy

1. Keep common port-surface seed work serial.
2. Parallelize only bounded consumer rewiring batches with disjoint write sets.
3. Validate every batch before merge:
   - relevant `vitest` suite
   - targeted `eslint`
   - `pnpm typecheck`
4. Re-run the fitness report after each merged wave.

## Baseline

- Dependency report at this checkpoint: `473 fail / 84 warn`
- Recent completed batches:
  - `f996d399` shared bubble path/id helpers
  - `250b3cf6` start + merge port contracts
  - `5cd500f8` restart + reconcile port contracts

## Wave Ledger

| Wave | Cluster | Status | Owner | Notes |
| --- | --- | --- | --- | --- |
| W1 | `converged` contract/type leakage audit | `in_progress` | subagent | Need first bounded batch recommendation |
| W1 | `delete` contract/runtime leakage audit | `in_progress` | subagent | Need first bounded batch recommendation |
| W1 | `create` post-helper residual audit | `in_progress` | subagent | Need first bounded batch recommendation |
| W2 | `converged` first bounded cleanup | `pending` | orchestrator/worker | Depends on W1 audit |
| W2 | `delete` first bounded cleanup | `pending` | orchestrator/worker | Depends on W1 audit |
| W2 | `create` next bounded cleanup | `pending` | orchestrator/worker | Depends on W1 audit |
| W3 | shared runtime wiring clusters (`approval`, `reply`, `watchdog`, `merge`) | `pending` | orchestrator | Only after app-side ports are seeded enough |

## Parallelization Rules

- Allowed in parallel:
  - different application lanes with file-disjoint write sets
  - consumer rewires against already-stable `shared/ports/**`
- Not allowed in parallel:
  - two workers writing the same `shared/ports/**` file
  - overlapping dependency-resolution files
  - simultaneous redesign of shared runtime wiring and the port surface it depends on

## Batch Checklist Template

- Scope:
- Exact files:
- Classification:
  - pure move:
  - port contract:
  - leave-for-later runtime wiring:
- Validation:
  - vitest:
  - eslint:
  - typecheck:
- Fitness delta:
- Commit:

## Current Next Decision

Wait for the three W1 explorer audits, then choose:

1. the largest safe file-disjoint pair for parallel worker execution, or
2. one serial seed batch if the recommended batches still collide on the same
   `shared/ports/**` surface.
