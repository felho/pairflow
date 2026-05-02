# Local Plan Watch V1 Pilot

Status: pilot evidence
Date: 2026-05-02
Plan: `plans/archive/plans/2026-05-01-local-plan-watch-plan-v1.md`
Task: `plans/archive/tasks/2026-05-01-local-plan-watch/4-pilot-docs.md`

---

## Scope

This pilot records the V1 operator boundary for `pairflow plan watch`. The
watcher is validated as a local-control-plane polling process that detects
approval-ready linked bubbles, writes local ledger evidence, suppresses duplicate
trigger evidence, and invokes a configured local `ExecutePairflowPlan` runner.

The watcher is not a route authority or lifecycle mutator. `ExecutePairflowPlan`
continues to own workflow route selection and delegated progression. Pairflow
bubble status remains the lifecycle authority.

## Command Surface

Canonical usage:

```bash
pairflow plan watch <plan-path> \
  --repo <repo-path> \
  --interval-seconds <seconds> \
  --once \
  --dry-run \
  --runner-command <local-runner> \
  --runner-arg <arg> \
  --runner-input-mode stdin_json
```

Observed contract from `src/cli/commands/plan/watch.ts`:

- Default interval: `60` seconds.
- `--once`: exits after one iteration.
- `--dry-run`: discovers and ledgers trigger evidence without invoking the runner.
- `--runner-command`: required for non-dry-run execution.
- `--runner-input-mode`: `stdin_json` by default; `arg_json` is also accepted.

## Evidence Sources

Authoritative surfaces:

- `PlanWatchIterationResult` from `src/v11/application/planWatch/planWatchLoopContract.ts`.
- Watch ledger records from `.pairflow/runtime/plan-watch/ledger.json`.
- `AgentRunnerBridgeResult` from `src/v11/application/planWatch/agentRunnerBridgeContract.ts`.
- Pairflow bubble status/list output for exact linked bubble lifecycle state.

Non-authoritative surfaces:

- Human-readable CLI summaries.
- Chat memory.
- Raw transcript impressions.
- Remote clone state without local routed status authority.

## Pilot Evidence Matrix

Local verification command:

```bash
bash ./scripts/run-evidence.sh .pairflow/evidence/plan-watch-focused.log \
  "plan watch focused tests" -- \
  pnpm exec vitest run \
    tests/cli/planWatchCommand.test.ts \
    tests/v11/application/planWatch/planWatchLoop.test.ts
```

Observed result on 2026-05-02:

- `tests/cli/planWatchCommand.test.ts`: 5 tests passed.
- `tests/v11/application/planWatch/planWatchLoop.test.ts`: 36 tests passed.
- Total: 2 test files passed, 41 tests passed.
- Evidence log: `.pairflow/evidence/plan-watch-focused.log`.

Safe live dry-run command:

```bash
bash ./scripts/run-evidence.sh .pairflow/evidence/plan-watch-live-dry-run.log \
  "plan watch live dry-run no-trigger" -- \
  pairflow plan watch plans/archive/plans/2026-05-01-local-plan-watch-plan-v1.md \
    --repo /Users/felho/dev/pairflow \
    --once \
    --dry-run
```

Observed result on 2026-05-02:

```text
plan watch: idle candidates=0 deferred=0
PAIRFLOW_EVIDENCE_COMMAND_RESULT command="plan watch live dry-run no-trigger" status=pass exit=0
```

This live command proves the safe operator path for `--once`, `--dry-run`, and
the no-trigger case on the representative plan at the time of the pilot. It is
not a successful automation claim because no approval-ready trigger was present
and no runner was invoked.

Live mutation boundary:

- This docs-only bubble did not run a non-dry-run watcher against a live
  approval-ready bubble in `/Users/felho/dev/pairflow`, because doing so would
  invoke the configured runner and could mutate unrelated plan or bubble state.
- No live production watch ledger record is claimed in this document.
- The absence of a live production ledger record is a fail-closed pilot boundary,
  not a successful automation claim.
- Ledger reservation, completion, dry-run observation, and duplicate suppression
  evidence comes from the focused watch-loop tests listed above.
- A future operator pilot that uses a disposable approval-ready bubble should add
  the concrete ledger `key`, `invocationId`, `runnerStatus`, and
  `runnerReasonCode` from `.pairflow/runtime/plan-watch/ledger.json`.

| Behavior | Evidence | Result |
|---|---|---|
| No trigger | `runPlanWatchIteration` with no candidates returns `status="idle"` and does not invoke the runner; the safe live dry-run produced `plan watch: idle candidates=0 deferred=0`. | Verified by focused watch-loop test run and `.pairflow/evidence/plan-watch-live-dry-run.log`. |
| Approval-ready trigger | Candidate with `observedState="READY_FOR_HUMAN_APPROVAL"` reserves a ledger record, invokes the runner once, and completes the same record. The same trigger contract also accepts legacy `READY_FOR_APPROVAL`; this pilot mirrors that compatibility as a documented alias rather than claiming a separate live run. | Verified by focused watch-loop test run plus the `LinkedBubbleApprovalReadyState` contract. |
| Runner result capture | Completed run record stores `runnerStatus`, `runnerReasonCode`, `changedArtifacts`, and `routeLedgerSummary`. | Verified by focused watch-loop test run and ledger contract assertions. |
| Duplicate suppression | Existing completed run record for the same dedupe key returns `status="duplicate_skipped"` and does not invoke the runner again. | Verified by focused watch-loop test run. |
| Dry-run distinction | Dry-run persists or reuses a ledger record with `mode="dry_run"` and `recordState="dry_run_observed"` when trigger evidence exists; it does not reserve a `mode="run"` record or invoke the runner. In the live no-trigger dry-run, no runner was invoked and no successful automation was claimed. | Verified by focused watch-loop test run, CLI option assertions, and `.pairflow/evidence/plan-watch-live-dry-run.log`. |
| Interval behavior | Default interval is `60_000` ms; configured `--interval-seconds <n>` maps to `intervalMs=n*1000`; `--once` exits after one iteration. The live dry-run used `--once` to prove single-iteration operator behavior without waiting for the default interval. | Verified by focused CLI parser, watch-loop test run, and `.pairflow/evidence/plan-watch-live-dry-run.log`. |
| Human/checkpoint/blocker wording | Runner statuses map to `runner_settled_checkpoint`, `runner_human_checkpoint`, or `blocked`; blocked results carry `blockedReasonKind`. | Proven by `PlanWatchIterationStatus` and runner bridge result contract. |
| Remote boundary | Remote bubble evidence must come from local routed status/list; stale or unavailable remote evidence fails closed. | Documented in `docs/remote-bubble-execution.md`; remote-only progression remains deferred. |
| Live ledger record | Non-dry-run live runner invocation was intentionally not executed in this docs-only bubble. | Fail-closed by mutation boundary; use a disposable approval-ready bubble for a live operator pilot. |

## Representative Operator Runbook

Dry-run observation:

```bash
pairflow plan watch plans/archive/plans/2026-05-01-local-plan-watch-plan-v1.md \
  --repo /Users/felho/dev/pairflow \
  --once \
  --dry-run
```

Use this when validating trigger discovery without runner mutation. A dry-run
result is not successful automation; it is observation evidence only.

Local runner invocation:

```bash
pairflow plan watch plans/archive/plans/2026-05-01-local-plan-watch-plan-v1.md \
  --repo /Users/felho/dev/pairflow \
  --once \
  --runner-command pairflow-plan-runner
```

Use this only when the configured command is an operator-provided local runner
for `ExecutePairflowPlan`. The watcher passes a compact continuation payload to
that command. Route decisions and downstream workflow delegation are runner
output, not watcher output.

Foreground polling:

```bash
pairflow plan watch plans/archive/plans/2026-05-01-local-plan-watch-plan-v1.md \
  --repo /Users/felho/dev/pairflow \
  --interval-seconds 60 \
  --runner-command pairflow-plan-runner
```

The default interval is already 60 seconds; the explicit flag is useful in
operator docs and pilots. Shorter local pilots may use a smaller positive value.

## Ledger Evidence Shape

Run records use `mode="run"` and transition from `recordState="reserved"` to
`recordState="completed"` around the runner invocation. Completed records include
the trigger evidence, invocation id, timestamps, runner status, runner reason
code, and optional changed artifact or route ledger summary fields.

Dry-run records use `mode="dry_run"` and `recordState="dry_run_observed"`. A
dry-run record is intentionally not a runner invocation and must not be described
as plan progression.

Duplicate suppression is keyed from the watched plan path, task id/path, bubble
id/role, observed approval-ready state, and status evidence. A completed run for
that key prevents repeated runner invocation until the trigger evidence changes.

## Boundary and Blockers

Validated V1 boundary:

- Local watch automation can reduce manual polling for approval-ready linked
  bubbles.
- The watcher invokes the configured local runner; it does not replace
  `ExecutePairflowPlan`.
- `READY_FOR_HUMAN_APPROVAL` is trigger evidence, not approval.
- Watcher output cannot approve, close, merge, or rework a bubble.
- Remote bubbles are observable only through local routed Pairflow status/list
  authority; see `docs/remote-bubble-execution.md` section 6.7 for the remote
  bubble boundary.

Deferred or unsupported:

- Remote-only watcher/supervisor execution.
- Remote-only bubble creation/start/progression.
- Event-driven lifecycle hooks.
- UI checkpoint inboxes.
- Manual nudge/continue commands.

If a pilot run cannot produce trustworthy status, ledger, or runner evidence,
the correct result is a documented blocker, not a successful automation claim.
