# Local Plan Watch V1 Pilot

Status: pilot evidence
Date: 2026-05-02
Plan: `plans/local-plan-watch-plan-v1.md`
Task: `plans/archive/tasks/2026-05-01-local-plan-watch/4-pilot-docs.md`
Retrofit task: `plans/tasks/5-plan-watch-codex-runner.md`

---

## Scope

This pilot records the V1 operator boundary for `pairflow plan watch`. The
watcher is validated as a local-control-plane polling process that detects
approval-ready linked bubbles, writes local ledger evidence, suppresses duplicate
trigger evidence, and invokes the config-selected built-in Codex
`ExecutePairflowPlan` runner.

The watcher is not a route authority or lifecycle mutator. `ExecutePairflowPlan`
continues to own workflow route selection and delegated progression. Pairflow
bubble status remains the lifecycle authority.

## Command Surface

Dry-run command shape:

```bash
pairflow plan watch <plan-path> \
  --repo <repo-path> \
  --interval-seconds <seconds> \
  --once \
  --dry-run
```

Observed contract from `src/cli/commands/plan/watch.ts`:

- Default interval: `60` seconds.
- `--once`: exits after one iteration.
- `--dry-run`: discovers and ledgers trigger evidence without invoking the runner.
- `[plan_watch.runner] backend = "codex"` selects the built-in Codex backend for
  non-dry-run execution.
- Legacy `--runner-command` / `--runner-arg` / `--runner-input-mode` remain
  internal escape hatches, not the primary V1 automation path.

Primary non-dry-run command shape:

```bash
pairflow plan watch <plan-path> \
  --repo <repo-path> \
  --once
```

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

Observed focused result on 2026-05-02 after the Codex runner retrofit:

- `tests/config/repoConfig.test.ts`: 21 tests passed.
- `tests/cli/planWatchCommand.test.ts`: 5 tests passed.
- `tests/v11/application/planWatch/planWatchLoop.test.ts`: 36 tests passed.
- `tests/v11/application/planWatch/agentRunnerBridge.test.ts`: 33 tests passed.
- Total: 4 test files passed, 95 tests passed.
- Evidence log: `.pairflow/evidence/plan-watch-focused.log`.

Safe live dry-run command:

```bash
bash ./scripts/run-evidence.sh .pairflow/evidence/plan-watch-live-dry-run.log \
  "plan watch live dry-run no-trigger" -- \
  pairflow plan watch plans/local-plan-watch-plan-v1.md \
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

Built-in Codex runner pilot boundary:

- The configured local built-in backend is `[plan_watch.runner] backend = "codex"`.
- The bridge validates payload shape, workflow target, repo path, and plan path
  before invoking Codex.
- Codex is invoked as an argv array using `codex
  --dangerously-bypass-approvals-and-sandbox exec --cd <repo-path>
  --output-schema <schema-file> --output-last-message <result-file> <prompt>`.
  The payload is included as fenced JSON data, and trigger strings are treated
  as untrusted data rather than instructions.
- Missing config, unsupported backend, missing repo path, missing plan path,
  missing Codex, timeout, non-zero exit, and invalid output all return blocked
  runner results with explicit reason codes.
- Disposable approval-ready non-dry-run status on 2026-05-02:
  completed as a blocked runner proof against
  `.pairflow/runtime/plan-watch/codex-pilot/plan.md` in the launch workspace.
  The disposable task linked `impl_bubble_id=plan-watch-codex-runner-pilot`;
  the linked bubble status was `READY_FOR_HUMAN_APPROVAL`, round `1`.
- Dedupe key:
  `plan=.pairflow/runtime/plan-watch/codex-pilot/plan.md|task=plan-watch-codex-runner-pilot|taskPath=.pairflow/runtime/plan-watch/codex-pilot/task.md|bubble=plan-watch-codex-runner-pilot|role=implementation|state=READY_FOR_HUMAN_APPROVAL|status=bubble:plan-watch-codex-runner-pilot:state:READY_FOR_HUMAN_APPROVAL:round:1`.
- Invocation id: `plan-watch-1777716903564-114b03d19721a`.
- Runner status: `blocked`.
- Runner reason code: `PLAN_WATCH_CODEX_UNAVAILABLE`.
- Changed artifacts: none recorded by the runner.
- Route ledger summary: none emitted because the runner blocked before a route
  checkpoint.
- Duplicate suppression evidence: repeating the same command with the same
  trigger returned `plan watch: duplicate_skipped candidates=1 deferred=0
  task=plan-watch-codex-runner-pilot bubble=plan-watch-codex-runner-pilot`
  without adding another run record to the ledger.
- Evidence logs: `.pairflow/evidence/plan-watch-codex-pilot-worktree.log` and
  `.pairflow/evidence/plan-watch-codex-pilot-duplicate.log`.
- External command profile caveat: the PATH-authority external CLI in this
  launch pane resolved to the canonical repo build and returned
  `blocked_reason=runner_config_missing` for the same fixture, captured in
  `.pairflow/evidence/plan-watch-codex-pilot.log`. The worktree-built command
  path was used for the implementation proof because the active external build
  had not yet picked up this bubble's `[plan_watch.runner] backend = "codex"`
  implementation.
- If Codex cannot emit a bridge-compatible structured envelope, the accepted
  pilot result is a blocked ledger record with `AGENT_RUNNER_OUTPUT_INVALID`.
  This run blocked earlier at executable discovery, so the exact recorded
  reason is `PLAN_WATCH_CODEX_UNAVAILABLE`.

| Behavior | Evidence | Result |
|---|---|---|
| No trigger | `runPlanWatchIteration` with no candidates returns `status="idle"` and does not invoke the runner; the safe live dry-run produced `plan watch: idle candidates=0 deferred=0`. | Verified by focused watch-loop test run and `.pairflow/evidence/plan-watch-live-dry-run.log`. |
| Approval-ready trigger | Candidate with `observedState="READY_FOR_HUMAN_APPROVAL"` reserves a ledger record, invokes the config-selected runner once, and completes the same record. The same trigger contract also accepts legacy `READY_FOR_APPROVAL`; this pilot mirrors that compatibility as a documented alias rather than claiming a separate live run. | Verified by focused watch-loop test run, the `LinkedBubbleApprovalReadyState` contract, and the disposable non-dry-run pilot ledger. |
| Built-in Codex invocation | `backend="codex"` derives `command="codex"` and argv args for full-access non-interactive `exec --cd <repo-path> --output-schema <schema-file> --output-last-message <result-file>` using only validated payload authority. | Verified by focused bridge tests and the disposable non-dry-run pilot, which reached Codex executable discovery and recorded `PLAN_WATCH_CODEX_UNAVAILABLE`. |
| Built-in Codex blockers | Unsupported backend, missing repo path, missing plan path, missing Codex/spawn failure, timeout, non-zero exit, and invalid output all fail closed with bridge-compatible blocked results. | Verified by focused config and bridge tests plus `.pairflow/evidence/plan-watch-codex-pilot-worktree.log`. |
| Runner result capture | Completed run record stores `runnerStatus`, `runnerReasonCode`, `changedArtifacts` when present, and `routeLedgerSummary` when emitted. | Verified by focused watch-loop test run, ledger contract assertions, and the disposable pilot ledger record with `runnerStatus="blocked"` and `runnerReasonCode="PLAN_WATCH_CODEX_UNAVAILABLE"`. |
| Duplicate suppression | Existing completed run record for the same dedupe key returns `status="duplicate_skipped"` and does not invoke the runner again. | Verified by focused watch-loop test run and `.pairflow/evidence/plan-watch-codex-pilot-duplicate.log`. |
| Dry-run distinction | Dry-run persists or reuses a ledger record with `mode="dry_run"` and `recordState="dry_run_observed"` when trigger evidence exists; it does not reserve a `mode="run"` record or invoke the runner. In the live no-trigger dry-run, no runner was invoked and no successful automation was claimed. | Verified by focused watch-loop test run, CLI option assertions, and `.pairflow/evidence/plan-watch-live-dry-run.log`. |
| Interval behavior | Default interval is `60_000` ms; configured `--interval-seconds <n>` maps to `intervalMs=n*1000`; `--once` exits after one iteration. The live dry-run used `--once` to prove single-iteration operator behavior without waiting for the default interval. | Verified by focused CLI parser, watch-loop test run, and `.pairflow/evidence/plan-watch-live-dry-run.log`. |
| Human/checkpoint/blocker wording | Runner statuses map to `runner_settled_checkpoint`, `runner_human_checkpoint`, or `blocked`; blocked results carry `blockedReasonKind`. | Proven by `PlanWatchIterationStatus` and runner bridge result contract. |
| Remote boundary | Remote bubble evidence must come from local routed status/list; stale or unavailable remote evidence fails closed. | Documented in `docs/remote-bubble-execution.md`; remote-only progression remains deferred. |
| Live ledger record | Non-dry-run disposable approval-ready pilot produced a completed run record for the dedupe key above. | The proof is a blocked runner result, not successful downstream automation. |

## Representative Operator Runbook

This section records the operator boundary after the built-in Codex runner
retrofit.

Dry-run observation:

```bash
pairflow plan watch plans/local-plan-watch-plan-v1.md \
  --repo /Users/felho/dev/pairflow \
  --once \
  --dry-run
```

Use this when validating trigger discovery without runner mutation. A dry-run
result is not successful automation; it is observation evidence only.

Config-driven built-in Codex invocation:

```bash
pairflow plan watch plans/local-plan-watch-plan-v1.md \
  --repo /Users/felho/dev/pairflow \
  --once
```

The watcher passes a compact continuation payload to the built-in runner. Route
decisions and downstream workflow delegation are runner output, not watcher
output.

Explicit no-trigger continuation:

```bash
pairflow plan watch plans/local-plan-watch-plan-v1.md \
  --repo /Users/felho/dev/pairflow \
  --once \
  --run-now
```

Use this when the plan should be nudged through `ExecutePairflowPlan` even
though no linked bubble has reached an approval-ready state yet.

Foreground polling:

```bash
pairflow plan watch plans/local-plan-watch-plan-v1.md \
  --repo /Users/felho/dev/pairflow \
  --interval-seconds 60
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
- Dedicated `plan nudge` / `plan continue` command aliases. The supported
  no-trigger nudge surface is `pairflow plan watch --run-now`.

If a pilot run cannot produce trustworthy status, ledger, or runner evidence,
the correct result is a documented blocker, not a successful automation claim.
