# Dependency Cleanup Wave Plan V1

Last updated from `main` at `12d9d532`.

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

- Dependency report at this checkpoint: `396 fail / 83 warn`
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
  - `7b161389` start registry lookup compat bridges
  - `715c6e9e` delete cleanup error compat bridge
  - `735dbe9f` delete support compat bridges
  - `403a3735` kickoff bubble lookup compat bridge
  - `9f883bc5` delete runtime error compat bridges
  - `7eca98e4` converged routing compat bridges
  - `e7478bcd` converged policy transcript reads through ports
  - `ac4b16fd` merge state snapshot type via shared ports
  - `e645db13` open lookup and shell compat bridges
  - `0852e587` stop contract ports
  - `5896a634` kickoff explicit delivery evidence
  - approval compat/contract cleanup (pending commit in current worktree)

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
| W5 | `delete` runtime cleanup consumer rewiring | `completed` | orchestrator | Delete runtime and support paths now route through explicit compat bridges instead of direct infra imports |
| W5 | `converged` routing preparation cleanup | `completed` | orchestrator | Remaining converged routing edges now use explicit compat bridges / ports |
| W6 | `start` / `open` / `stop` / `merge` bounded cleanups | `completed` | orchestrator | Small app-lane type/runtime leaks removed with compat bridges or shared port contracts |
| W6 | `approval` contract + dependency cleanup | `in_progress` | orchestrator | Approval app-side delivery types and shared default wiring now avoid direct infra imports; only shared->application orchestration seam remains |
| W7 | shared runtime wiring clusters (`approval`, `askHuman`, `watchdog`, `reply`) | `pending` | orchestrator | Next frontier once bounded approval orchestration seam is classified |

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

Current best next moves:

1. finish `approval` by removing the remaining `shared -> application` orchestration seam,
2. take the next bounded shared wiring batch in `askHuman` or `watchdog` based on explorer classification,
3. keep large cross-cutting `metaReviewGate` / `reply` clusters for later once the smaller shared orchestration seams are down.
