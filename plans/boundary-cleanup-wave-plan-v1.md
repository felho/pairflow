# Boundary Cleanup Wave Plan V1

## Goal

Reduce the `boundary` fitness check backlog to zero without introducing new
dependency regressions or moving write ownership into the wrong layer.

Current baseline on `main`:

- `boundary`: `11 fail`
- `mutation`: `6 warn`
- `transition`: `1 fail`

Current validated progress on `main`:

- `boundary`: `pass`
- `mutation`: `pass`
- `transition`: `pass`

These three are partially coupled, so each batch must validate all three.

## Source Of Truth

- `tools/fitness/checks/boundary.ts`
- `tools/fitness/checks/mutation.ts`
- `tools/fitness/checks/transition.ts`
- `docs/architecture/architecture-fitness-checks.md`

## Current Boundary Frontier

No remaining `boundary` frontier on `main`.

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
| B2 | `watchdogCommandFlow` transcript/state write extraction | validated | Escalation transcript/state writes now go through a dedicated shared watchdog escalation mutation helper; baseline moved to `boundary=8 fail`, `mutation=5 warn`, `transition=pass` |
| B3 | `stopCommandOrchestration` cancelled-state persistence extraction | validated | Stop orchestration now delegates the CANCELLED state persist to a shared stop mutation helper; baseline moved to `boundary=7 fail`, `mutation=4 warn`, `transition=pass` |
| B4 | `startCommandCleanup` + `startCommandFlows` write-path extraction | validated | Start lifecycle persists now delegate to a shared start mutation helper; baseline moved to `boundary=pass`, `mutation=pass`, `transition=pass` |
| B5 | `commitCommandFinalization` transcript/state boundary extraction | already satisfied | The shared finalization mutation extract had already landed; the earlier frontier entry was stale and was removed once the report was rerun after B4 validation |

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
- B2 result on `main`:
  - `boundary`: `10 fail` -> `8 fail`
  - `mutation`: `5 warn` -> `5 warn`
  - `transition`: `pass` -> `pass`
- B3 result on `main`:
  - `boundary`: `8 fail` -> `7 fail`
  - `mutation`: `5 warn` -> `4 warn`
  - `transition`: `pass` -> `pass`
- B4 result on `main`:
  - `boundary`: `7 fail` -> `pass`
  - `mutation`: `4 warn` -> `pass`
  - `transition`: `pass` -> `pass`
- The earlier `commitCommandFinalization.ts` frontier note was stale by the time
  this wave closed; the shared commit finalization mutation already owned the
  transcript/state writes, and only a type-shape fix was needed in this session
  to keep `pnpm typecheck` green.
