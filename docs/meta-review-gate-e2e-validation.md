# Meta Review Gate E2E Validation Template

## Rollout Contract

- `rollout_readiness_gate_owner`: `felho`
- `rollout_readiness_decision_source`: completed AC checklist below plus `<pairflow-command> metrics report --from <iso-from> --to <iso-to>` for the rollout window
- `blocking_reason_codes`:
  - `META_REVIEW_GATE_RUN_FAILED`
  - `META_REVIEW_GATE_REWORK_DISPATCH_FAILED`
  - `PAIRFLOW_COMMAND_EXTERNAL_UNAVAILABLE`
  - `PAIRFLOW_COMMAND_PATH_STALE`
  - `META_REVIEW_RECONCILE_STATE_MISMATCH`
  - `ROLLOUT_EVIDENCE_INCOMPLETE`
  - `META_REVIEW_RUNNER_ERROR`

`PAIRFLOW_COMMAND_EXTERNAL_UNAVAILABLE` remains the fail-closed rollout blocker when `external` profile cannot resolve PATH `pairflow`.
`PAIRFLOW_COMMAND_PATH_STALE` remains a rollout blocker for `self_host` identity failures. If it appears under `external`, treat that as a regression in command-profile semantics.

If either owner or decision source is missing, rollout is `not ready`.

## Evidence Session Header

- Date:
- Operator:
- Repo path:
- Worktree path:
- Command profile:
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
| `pnpm test tests/config/bubbleConfig.test.ts tests/v11/shared/reviewPolicy/reviewPolicyRuntime.test.ts tests/v11/shared/metaReview/metaReviewSnapshot.test.ts tests/v11/shared/state/stateSchema.test.ts` |  | `exit=0`, `.pairflow/evidence/clean-runs-policy-state.log` | `.pairflow/evidence/clean-runs-policy-state.log` |
| `pnpm test tests/v11/shared/metaReviewGate/metaReviewGateCurrentRunFinalization.test.ts tests/core/agent/converged.test.ts tests/core/agent/pass.test.ts` |  | `exit=0`, `.pairflow/evidence/clean-runs-gate-routing.log` | `.pairflow/evidence/clean-runs-gate-routing.log` |
| `pnpm test tests/core/bubble/statusBubble.test.ts tests/core/bubble/listBubbles.test.ts tests/core/ui/bubblePresenter.test.ts tests/v11/infrastructure/executor/ssh/sshBubbleStatus.test.ts ui/src/state/useBubbleStore.test.ts ui/src/components/actions/ActionBar.test.tsx ui/src/components/canvas/BubbleExpandedCard.test.tsx ui/src/lib/api.test.ts` |  | `exit=0`, `.pairflow/evidence/clean-runs-read-model-ui.log` | `.pairflow/evidence/clean-runs-read-model-ui.log` |
| `pnpm build` |  | `exit=0`, `.pairflow/evidence/build.log` | `.pairflow/evidence/build.log` |
| `<pairflow-command> bubble status --id <bubble-id> --repo <repo-path>` |  | `profile=external -> Command path: external`, no `PAIRFLOW_COMMAND_EXTERNAL_UNAVAILABLE`, no `PAIRFLOW_COMMAND_PATH_STALE`; `profile=self_host -> Command path: worktree_local`, no `PAIRFLOW_COMMAND_PATH_STALE` |  |
| `<pairflow-command> bubble status --id <bubble-id> --repo <repo-path> --json` |  | active `executionContext` is present when authority is active; meta-review diagnostics remain observational only |  |
| `<pairflow-command> bubble restart --id <bubble-id> --repo <repo-path>` |  | restart completes without authority/profile fallback errors; follow-up projection commands remain current-round consistent |  |
| `<pairflow-command> metrics report --from <iso-from> --to <iso-to>` |  | `meta_review_rollout.route_counts`, `rollout_blocked_events: 0`, `meta_review_rollout.pairflow_command_external_unavailable_count: 0`, `meta_review_rollout.pairflow_command_path_stale_count: 0` |  |

## AC Coverage Matrix

| AC | Required Evidence | Suggested Source |
|---|---|---|
| AC1 | Full lifecycle auto-rework loop reaches deterministic human gate | `tests/core/bubble/metaReviewGate.test.ts`, `tests/core/bubble/orchestrationLoopSmoke.test.ts` |
| AC2 | Sticky human gate bypass validated end-to-end | `tests/core/bubble/metaReviewGate.test.ts` |
| AC3 | Autonomous failure branches are fail-safe and auditable | `tests/core/bubble/metaReviewGate.test.ts`, `tests/core/agent/converged.test.ts` |
| AC4 | No autonomous branch approves | `tests/core/bubble/metaReviewGate.test.ts` |
| AC5 | Worker command path matches the configured authority model (`external` for `external`, `worktree_local` for `self_host`), or the active profile is explicitly fail-closed with the matching command-path blocker (`PAIRFLOW_COMMAND_EXTERNAL_UNAVAILABLE` for `external`, `PAIRFLOW_COMMAND_PATH_STALE` for `self_host`) | `tests/core/runtime/pairflowCommand.test.ts`, `tests/core/runtime/agentCommand.test.ts`, smoke `bubble status` command |
| AC6 | Restart/reconcile behavior is validated for meta-review states | `tests/core/runtime/restartRecovery.test.ts`, `tests/core/runtime/startupReconciler.test.ts`, `tests/core/bubble/metaReviewGate.test.ts` |
| AC7 | UI list/detail/action payloads stay coherent after restart | `tests/core/ui/server.integration.test.ts` |
| AC8 | Rollout metrics/events are emitted and reportable | `tests/core/metrics/report/report.test.ts`, `tests/core/metrics/report/format.test.ts` |
| AC9 | Runbook exists with smoke + rollback + incident steps | `docs/meta-review-gate-rollout-runbook.md` |
| AC10 | Evidence template maps every AC to verifiable artifacts | this document |
| AC11 | Consecutive clean meta-review requirement is enforced before human approval | `tests/config/bubbleConfig.test.ts`, `tests/v11/shared/reviewPolicy/reviewPolicyRuntime.test.ts`, `tests/v11/shared/metaReview/metaReviewSnapshot.test.ts`, `tests/v11/shared/state/stateSchema.test.ts`, `tests/v11/shared/metaReviewGate/metaReviewGateCurrentRunFinalization.test.ts`, `tests/core/agent/converged.test.ts`, `tests/core/agent/pass.test.ts`, `tests/core/bubble/statusBubble.test.ts`, `tests/core/bubble/listBubbles.test.ts`, `tests/core/ui/bubblePresenter.test.ts`, `tests/v11/infrastructure/executor/ssh/sshBubbleStatus.test.ts`, `ui/src/state/useBubbleStore.test.ts`, `ui/src/components/actions/ActionBar.test.tsx`, `ui/src/components/canvas/BubbleExpandedCard.test.tsx`, `ui/src/lib/api.test.ts` |
| AC12 | UI quality preset projection is exact and unsupported backend pairs are not mislabeled | `ui/src/components/actions/ActionBar.test.tsx`, `ui/src/components/canvas/BubbleExpandedCard.test.tsx`, `ui/src/lib/api.test.ts`, `tests/core/ui/bubblePresenter.test.ts` |

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
| AC11 |  |  |  |
| AC12 |  |  |  |

## Consecutive Clean-Run Gate Checks

Use these expectations when filling the AC rows and reviewing status/list/UI projections:

1. `review_policy.meta_review_consecutive_clean_runs_required` is the configured unlock count; missing legacy config normalizes to `2`.
2. `meta_review.consecutive_clean_runs` is the persisted current streak; missing legacy state normalizes to `0`.
3. `review_policy.meta_review_auto_rework_min_severity` is the threshold authority for deciding whether a finalized meta-review result is clean.
4. A threshold-clean `approve` below the required streak starts another meta-review run directly, without an implementer/reviewer round.
5. A threshold-clean `approve` that reaches the required streak routes to `READY_FOR_HUMAN_APPROVAL`.
6. Threshold-meeting findings, `rework`, `inconclusive`, parity/threshold failures, run failures, and auto-rework paths reset the streak to `0`.
7. `auto_rework_count` / `auto_rework_limit` are budget controls only and must not be used as streak evidence.
8. `review_policy.reviewer_blocking_min_severity` remains separate from `review_policy.meta_review_auto_rework_min_severity`.
9. Clean-run authority must not be inferred from transcript prose, pane text, prior human-gate state, UI labels, quality preset labels, or `auto_rework_count`.

## Quality Preset Checks

Supported UI preset mappings are exact backend pairs:

| Preset | Backend pair |
|---|---|
| `P1` | `(meta_review_auto_rework_min_severity=P1, meta_review_consecutive_clean_runs_required=1)` |
| `P2` | `(P2, 1)` |
| `P3` | `(P3, 1)` |
| `P3+2` | `(P3, 2)` |

Unsupported pairs, for example `(P2, 2)`, must display as custom/unsupported rather than a supported preset. `P3+2` is not a new severity; it is threshold `P3` with two required consecutive clean meta-review runs.

## Command-Path Determinism Check

- Expected authority by profile: `external -> PATH-resolved pairflow`, `self_host -> ./dist/cli/index.js`
- Observed command-path status:
- Observed active entrypoint:
- If `external` cannot resolve PATH `pairflow`, capture exact `PAIRFLOW_COMMAND_EXTERNAL_UNAVAILABLE` output and mark rollout `not ready`.
- If stale under `self_host`, capture exact `PAIRFLOW_COMMAND_PATH_STALE` output and mark rollout `not ready`.
- If stale under `external`, capture it as a regression and mark rollout `not ready`.

## Rollout Metrics Summary

- `meta_review_rollout.route_counts`:
- `meta_review_rollout.auto_rework_dispatches`:
- `meta_review_rollout.human_gate_entries`:
- `meta_review_rollout.rollout_blocked_events`:
- `meta_review_rollout.pairflow_command_external_unavailable_count`:
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
3. the command-path check matches the configured profile authority,
4. no blocking reason code is present in the metrics report or command/log bundle.
   This includes `meta_review_rollout.pairflow_command_external_unavailable_count: 0` and `meta_review_rollout.pairflow_command_path_stale_count: 0`.
