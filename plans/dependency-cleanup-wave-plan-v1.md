# Dependency Cleanup Wave Plan V1

Last updated from `main` at `66fd4394`.

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

- Dependency report at this checkpoint: `427 fail / 84 warn`
- Recent completed batches:
  - `f996d399` shared bubble path/id helpers
  - `250b3cf6` start + merge port contracts
  - `5cd500f8` restart + reconcile port contracts
  - `026ff66f` converged port contracts
  - `cf45b9b5` create capability port batch
  - `2fcbc566` delete preflight contract batch
  - `9adad19e` converged finalization default-wiring extract
  - `7a00ba30` pass shared-port routing batch
  - `76af3276` delete archive + mutation shim-through cleanup
  - `99a82383` converged execution + gate-delivery cleanup
  - `c92e040b` pass read capability ports
  - `638ce0cf` pass consumer rewiring batch
  - `e7478bcd` converged policy transcript port wiring
  - `14c043e4` converged policy stable dependency error
  - `bb32bfe7` converged transcript import collapse
  - `66fd4394` list compat-bridge cleanup

## Wave Ledger

| Wave | Cluster | Status | Owner | Notes |
| --- | --- | --- | --- | --- |
| W1 | `converged` contract/type leakage audit | `completed` | orchestrator | Bounded type-first batch identified around workspace/bubble identity, pairflow command, transcript append, and notification delivery contracts |
| W1 | `delete` contract/runtime leakage audit | `completed` | subagent | First safe batch classified around `pathExists` + `branchExists` plus existing delete support ports |
| W1 | `create` post-helper residual audit | `completed` | orchestrator | Capability edges classified around repo registry, git-repository assertion, and transcript append |
| W2 | `converged` first bounded cleanup | `completed` | orchestrator | Converged contract files now use app-facing shared ports/contracts instead of direct infra types |
| W2 | `delete` first bounded cleanup | `completed` | orchestrator | Delete support now uses app-facing `PathExistsPort` and `BranchExistsPort` contracts instead of direct infra types |
| W2 | `create` capability port cleanup | `completed` | orchestrator | Create flow now uses app-facing git-repository, transcript, and repo-registry ports; legacy CLI parity preserved |
| W3 | `converged` finalization default-wiring cleanup | `completed` | orchestrator | `convergedFinalization.ts` no longer owns infra default wiring; dependency surface carries the port |
| W3 | `pass` first bounded cleanup | `completed` | orchestrator | Initial pass flow files now route through existing shared ports instead of direct infra imports |
| W4 | `delete` archive + mutation follow-up | `completed` | orchestrator | Archive snapshot/index and bubble identity edges routed through explicit legacy bridges |
| W4 | `converged` execution + gate-delivery cleanup | `completed` | orchestrator | Execution, gate delivery, and policy transcript wiring now avoid direct app->infra transcript reads |
| W4 | `pass` second bounded cleanup | `completed` | orchestrator | Delivery/routing read-side pass flow now routes through seeded shared ports |
| W5 | `list` compat-bridge cleanup | `completed` | orchestrator | `listCommandApi` and `listCommandContract` now use explicit core compat bridges / shared port types instead of direct infra imports |
| W5 | `delete` runtime cleanup consumer rewiring | `pending` | orchestrator | Highest-yield remaining app lane; likely next bounded batch around tmux naming, readStateSnapshot, and error boundary leakage |
| W5 | `converged` routing preparation cleanup | `pending` | orchestrator | Small remaining converged cluster with three direct infra edges |
| W6 | shared runtime wiring clusters (`approval`, `reply`, `watchdog`, `merge`) | `pending` | orchestrator | Only after app-side lanes are reduced further |

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

`list`, `converged`, and both `pass` waves are complete. Next choose between:

1. `delete` runtime cleanup + error-boundary follow-up,
2. `converged` routing preparation cleanup, or
3. early shared wiring follow-up in `approval` / `watchdog`.
