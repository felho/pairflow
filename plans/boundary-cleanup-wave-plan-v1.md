# Boundary Cleanup Wave Plan V1

## Goal

Reduce the `boundary` fitness check backlog to zero without introducing new
dependency regressions or moving write ownership into the wrong layer.

Current baseline on `main`:

- `boundary`: `11 fail`
- `mutation`: `6 warn`
- `transition`: `1 fail`

These three are partially coupled, so each batch must validate all three.

## Source Of Truth

- `tools/fitness/checks/boundary.ts`
- `tools/fitness/checks/mutation.ts`
- `tools/fitness/checks/transition.ts`
- `docs/architecture/architecture-fitness-checks.md`

## Current Boundary Frontier

1. `src/v11/application/commit/commitCommandFinalization.ts`
   - transcript append + state writes
2. `src/v11/application/start/startCommandCleanup.ts`
   - direct failed-state persistence
3. `src/v11/application/start/startCommandFlows.ts`
   - multiple direct state writes during startup flow
4. `src/v11/application/stop/stopCommandOrchestration.ts`
   - direct cancelled-state persistence
5. `src/v11/application/watchdog/watchdogCommandFlow.ts`
   - transcript append + state write
6. `src/v11/application/watchdog/watchdogPendingReworkIntent.ts`
   - direct state write and also current `transition` fail

## Working Rules

- Do not “fix” boundary by pushing writes back into the wrong layer blindly.
- Prefer explicit mutation helpers / pipeline owners with clear contracts.
- Any batch that touches write ownership must re-run:
  - relevant feature tests
  - `pnpm typecheck`
  - `pnpm exec tsx tools/fitness/run-report.ts`
- Track `boundary`, `mutation`, and `transition` deltas together.

## Batch Order

| Wave | Scope | Status | Notes |
| --- | --- | --- | --- |
| B1 | `watchdogPendingReworkIntent` transition/boundary cleanup | validated | Pending rework state persist now goes through a dedicated shared watchdog mutation helper; baseline moved to `boundary=10 fail`, `mutation=5 warn`, `transition=pass` |
| B2 | `watchdogCommandFlow` transcript/state write extraction | planned | Likely pairs naturally with B1 once watchdog write boundary is clearer |
| B3 | `stopCommandOrchestration` cancelled-state persistence extraction | planned | Single-file, lower blast radius |
| B4 | `startCommandCleanup` + `startCommandFlows` write-path extraction | planned | Multi-write cluster; keep after watchdog/stop patterns are proven |
| B5 | `commitCommandFinalization` transcript/state boundary extraction | planned | Likely needs its own mutation/finalization helper |

## Initial Hypothesis

- `watchdogPendingReworkIntent.ts` proved to be the right first batch:
  - it removed the only `transition` fail
  - it reduced `boundary` and `mutation` together
  - it established the shared watchdog mutation-helper pattern for follow-up batches

## Validation Checklist

- relevant `vitest` scope
- targeted `eslint` on touched files
- `pnpm typecheck`
- `pnpm exec tsx tools/fitness/run-report.ts`

## Progress Notes

- Dependency backlog closed on `main` before starting this plan.
- Do not mix boundary-wave commits with unrelated checker-hardening unless a
  false positive is proven.
- B1 result on `main`:
  - `boundary`: `11 fail` -> `10 fail`
  - `mutation`: `6 warn` -> `5 warn`
  - `transition`: `1 fail` -> `pass`
