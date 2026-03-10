# Meta Review Gate E2E Validation Template

## Rollout Contract

- `rollout_readiness_gate_owner`: `felho`
- `rollout_readiness_decision_source`: completed AC checklist below plus `node ./dist/cli/index.js metrics report --from <iso-from> --to <iso-to>` for the rollout window
- `blocking_reason_codes`:
  - `META_REVIEW_GATE_RUN_FAILED`
  - `META_REVIEW_GATE_REWORK_DISPATCH_FAILED`
  - `PAIRFLOW_COMMAND_PATH_STALE`
  - `META_REVIEW_RECONCILE_STATE_MISMATCH`
  - `ROLLOUT_EVIDENCE_INCOMPLETE`
  - `META_REVIEW_RUNNER_ERROR`

If either owner or decision source is missing, rollout is `not ready`.

## Evidence Session Header

- Date:
- Operator:
- Repo path:
- Worktree path:
- Release/ref:
- Rollback rehearsal mode: `dry-run | executed`
- Metrics report window:
- Final decision: `ready | not ready`
- Blocking reason codes observed:

## Command/Log Bundle

Record every executed command with timestamp and raw marker lines.

| Command | Timestamp | Expected Marker(s) | Evidence Ref / Note |
|---|---|---|---|
| `pnpm lint` |  | `exit=0`, `.pairflow/evidence/lint.log` |  |
| `pnpm typecheck` |  | `exit=0`, `.pairflow/evidence/typecheck.log` |  |
| `pnpm test` |  | `exit=0`, `.pairflow/evidence/test.log` |  |
| `node ./dist/cli/index.js bubble status --id <bubble-id> --repo <repo-path>` |  | `Command path: worktree_local` |  |
| `node ./dist/cli/index.js bubble meta-review status --id <bubble-id> --repo <repo-path> --verbose` |  | `Auto rework:`, `Sticky human gate:` |  |
| `node ./dist/cli/index.js bubble meta-review recover --id <bubble-id> --repo <repo-path>` |  | `route=...`, `Lifecycle state: ...`, no new run started |  |
| `node ./dist/cli/index.js metrics report --from <iso-from> --to <iso-to>` |  | `meta_review_rollout.route_counts`, `rollout_blocked_events: 0` |  |

## AC Coverage Matrix

| AC | Required Evidence | Suggested Source |
|---|---|---|
| AC1 | Full lifecycle auto-rework loop reaches deterministic human gate | `tests/core/bubble/metaReviewGate.test.ts`, `tests/core/bubble/orchestrationLoopSmoke.test.ts` |
| AC2 | Sticky human gate bypass validated end-to-end | `tests/core/bubble/metaReviewGate.test.ts` |
| AC3 | Autonomous failure branches are fail-safe and auditable | `tests/core/bubble/metaReviewGate.test.ts`, `tests/core/agent/converged.test.ts` |
| AC4 | No autonomous branch approves | `tests/core/bubble/metaReviewGate.test.ts` |
| AC5 | Worker command path is worktree-local or explicitly blocked with `PAIRFLOW_COMMAND_PATH_STALE` | `tests/core/runtime/pairflowCommand.test.ts`, `tests/core/runtime/agentCommand.test.ts`, smoke `bubble status` command |
| AC6 | Restart/reconcile behavior is validated for meta-review states | `tests/core/runtime/restartRecovery.test.ts`, `tests/core/runtime/startupReconciler.test.ts`, `tests/core/bubble/metaReviewGate.test.ts` |
| AC7 | UI list/detail/action payloads stay coherent after restart | `tests/core/ui/server.integration.test.ts` |
| AC8 | Rollout metrics/events are emitted and reportable | `tests/core/metrics/report/report.test.ts`, `tests/core/metrics/report/format.test.ts` |
| AC9 | Runbook exists with smoke + rollback + incident steps | `docs/meta-review-gate-rollout-runbook.md` |
| AC10 | Evidence template maps every AC to verifiable artifacts | this document |

## AC Completion

| AC | Pass/Fail | Evidence Ref(s) | Notes |
|---|---|---|---|
| AC1 |  |  |  |
| AC2 |  |  |  |
| AC3 |  |  |  |
| AC4 |  |  |  |
| AC5 |  |  |  |
| AC6 |  |  |  |
| AC7 |  |  |  |
| AC8 |  |  |  |
| AC9 |  |  |  |
| AC10 |  |  |  |

## Command-Path Determinism Check

- Expected local entrypoint: `./dist/cli/index.js`
- Observed command-path status:
- Observed active entrypoint:
- If stale, capture exact `PAIRFLOW_COMMAND_PATH_STALE` output and mark rollout `not ready`.

## Rollout Metrics Summary

- `meta_review_rollout.route_counts`:
- `meta_review_rollout.auto_rework_dispatches`:
- `meta_review_rollout.human_gate_entries`:
- `meta_review_rollout.rollout_blocked_events`:
- `meta_review_rollout.pairflow_command_path_stale_count`:
- `meta_review_rollout.blocking_reason_code_counts`:

## Rollback Rehearsal Note

- Previous known-good release/ref:
- Command sequence used or prepared:
- Observed outcome:

## Decision Rule

Mark the rollout `ready` only if:

1. every AC row is filled and passes,
2. every claimed validation command has a matching evidence log,
3. the command-path check is `worktree_local`,
4. no blocking reason code is present in the metrics report or command/log bundle.
