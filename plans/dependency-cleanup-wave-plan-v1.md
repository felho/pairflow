# Dependency Cleanup Wave Plan V1

Last updated from `main` at `026ff66f`.

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

- Dependency report at this checkpoint: `456 fail / 83 warn`
- Recent completed batches:
  - `f996d399` shared bubble path/id helpers
  - `250b3cf6` start + merge port contracts
  - `5cd500f8` restart + reconcile port contracts
  - `026ff66f` converged port contracts
  - create capability port batch: `456 fail / 83 warn` after local validation

## Wave Ledger

| Wave | Cluster | Status | Owner | Notes |
| --- | --- | --- | --- | --- |
| W1 | `converged` contract/type leakage audit | `completed` | orchestrator | Bounded type-first batch identified around workspace/bubble identity, pairflow command, transcript append, and notification delivery contracts |
| W1 | `delete` contract/runtime leakage audit | `completed` | subagent | First safe batch classified around `pathExists` + `branchExists` plus existing delete support ports |
| W1 | `create` post-helper residual audit | `completed` | orchestrator | Capability edges classified around repo registry, git-repository assertion, and transcript append |
| W2 | `converged` first bounded cleanup | `completed` | orchestrator | Converged contract files now use app-facing shared ports/contracts instead of direct infra types |
| W2 | `delete` first bounded cleanup | `pending` | orchestrator/worker | First candidate is preflight read-contract batch (`pathExists` + `branchExists`) |
| W2 | `create` capability port cleanup | `completed` | orchestrator | Create flow now uses app-facing git-repository, transcript, and repo-registry ports; legacy CLI parity preserved |
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

`converged` and `create` W2 are complete. Next choose between:

1. `delete` preflight contract batch (`pathExists` + `branchExists`) on top of the existing port surface, or
2. `converged` runtime capability rewiring (`convergedExecution` / `convergedFinalization` / `convergedGateDelivery`) as a separate bounded lane.
