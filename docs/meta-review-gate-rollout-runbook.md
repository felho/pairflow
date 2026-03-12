# Meta Review Gate Rollout Runbook

## Purpose

This runbook defines the staged rollout checks for the Meta Review Gate after Phase 3e.

Release status is `not ready` by default until:

1. the validation evidence bundle is complete,
2. worker-side Pairflow command path is confirmed `worktree_local`,
3. no blocking reason code is present in the rollout decision package.

## Authoritative Gate

- `rollout_readiness_gate_owner`: `felho`
- `rollout_readiness_decision_source`: `docs/meta-review-gate-e2e-validation.md` completed for the current rollout window, plus `pairflow metrics report` output showing no blocking rollout signals.

## Blocking Reason Codes

The rollout must stop on any of these codes:

1. `META_REVIEW_GATE_RUN_FAILED`
2. `META_REVIEW_GATE_REWORK_DISPATCH_FAILED`
3. `PAIRFLOW_COMMAND_PATH_STALE`
4. `META_REVIEW_RECONCILE_STATE_MISMATCH`
5. `ROLLOUT_EVIDENCE_INCOMPLETE`
6. `META_REVIEW_RUNNER_ERROR`

Any unclassified reason code is treated as blocking until explicitly classified.

## Pre-flight

1. Start from the target worktree/release checkout.
2. Ensure `dist/cli/index.js` exists in the worktree build output.
3. Use the worktree-local CLI entrypoint for operator smoke commands: `node ./dist/cli/index.js ...`
4. Keep `.pairflow/evidence/` writable so validation logs are captured.

## Phase 1 Reviewer Evidence Trust Baseline (I2 + I3)

`trusted/skip_full_rerun` classification is allowed only when all required checks satisfy these fail-closed rules:

1. Provenance must be canonical: only `.pairflow/evidence/*.log` refs are trust-eligible.
2. Summary text is never a trust anchor; summary-only command claims are `untrusted/run_checks`.
3. Completion markers are mandatory for each required command family.
4. Accepted alias-equivalent command forms are closed-set only:
   - typecheck: `pnpm typecheck`, `pnpm run typecheck`, `tsc --noEmit`
   - test: `pnpm test`, `pnpm run test`, `vitest`, `vitest run`
   - lint: `pnpm lint`, `pnpm run lint`, `eslint`
5. Script extensions outside the closed set (for example `pnpm run test:ci`) are not accepted as equivalent required-command evidence.

## Smoke Checklist

Run each command from the release worktree root and capture the command, timestamp, and raw marker lines.

1. `pnpm lint`
   Expected markers:
   `pnpm lint`
   `exit=0`
   `.pairflow/evidence/lint.log`

2. `pnpm typecheck`
   Expected markers:
   `pnpm typecheck`
   `exit=0`
   `.pairflow/evidence/typecheck.log`

3. `pnpm test`
   Expected markers:
   `pnpm test`
   `exit=0`
   `.pairflow/evidence/test.log`

4. `node ./dist/cli/index.js bubble status --id <bubble-id> --repo <repo-path>`
   Expected markers:
   `Command path: worktree_local`
   no `PAIRFLOW_COMMAND_PATH_STALE`
   lifecycle/report data renders without fallback errors

5. `node ./dist/cli/index.js bubble meta-review status --id <bubble-id> --repo <repo-path> --verbose`
   Expected markers:
   `Auto rework:`
   `Sticky human gate:`
   last autonomous summary/report ref visible when the bubble has run

6. `node ./dist/cli/index.js bubble meta-review recover --id <bubble-id> --repo <repo-path>`
   Preconditions:
   bubble is in `META_REVIEW_RUNNING` and has a persisted autonomous snapshot.
   Expected markers:
   `route=...`
   `Lifecycle state: ...`
   no new autonomous run is started for this command.

7. `node ./dist/cli/index.js metrics report --from <iso-from> --to <iso-to>`
   Expected markers:
   `meta_review_rollout.route_counts`
   `meta_review_rollout.rollout_blocked_events: 0`
   `meta_review_rollout.pairflow_command_path_stale_count: 0`

## Go/No-Go Checklist

All items must be true before rollout is marked ready:

1. Validation logs exist for every command that was claimed as executed.
2. `docs/meta-review-gate-e2e-validation.md` is filled without AC gaps.
3. The command-path smoke check reports `worktree_local`.
4. Metrics report shows zero blocking rollout events in the rollout window.
5. No blocking reason code appears in the evidence template, metrics report, or smoke outputs.
6. Human approval remains mandatory; no autonomous approval path is observed.

## Minimum Artifact Bundle

The sign-off package must contain:

1. exact smoke commands executed,
2. raw output snippets with expected markers,
3. operator context stamp (who, when, repo/worktree),
4. rollback rehearsal note,
5. AC coverage matrix reference to `docs/meta-review-gate-e2e-validation.md`.

## Rollback Rehearsal

Use one of these modes and record the observed outcome:

1. `dry-run`
   - note the previous known-good release/tag,
   - note the command sequence that would restore it,
   - confirm the target worktree contains the expected previous `dist/cli/index.js`.

2. `executed`
   - restore the previous known-good release/tag in the worktree,
   - run `pnpm install --frozen-lockfile`,
   - run `pnpm build`,
   - restart any affected operator/UI process against the restored worktree,
   - verify `node ./dist/cli/index.js bubble status ...` no longer shows rollout blockers.

## Incident Handling

If a blocking reason code appears during rollout:

1. stop rollout progression immediately,
2. attach the raw evidence/log reference that triggered the block,
3. keep lifecycle fail-safe routing explicit:
   - default fail-safe path is `READY_FOR_HUMAN_APPROVAL`,
   - meta-review execution failure (`META_REVIEW_GATE_RUN_FAILED` / `META_REVIEW_RUNNER_ERROR`) routes to `META_REVIEW_FAILED` with run-failed diagnostics for explicit human override handling,
   - if the bubble is stuck in `META_REVIEW_RUNNING` after snapshot persistence, execute `bubble meta-review recover` before declaring manual escalation,
4. resolve the blocking condition before re-running the smoke checklist.

If the block is `PAIRFLOW_COMMAND_PATH_STALE`:

1. do not trust plain global `pairflow` invocations,
2. rebuild or restore the local worktree `dist/cli/index.js`,
3. re-run the command-path smoke check with `node ./dist/cli/index.js bubble status ...`.
