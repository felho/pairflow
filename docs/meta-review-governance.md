# Meta Review Governance

Status: active
Owner: Pairflow core
Scope: operational policy for autonomous meta-review, clean-run gating, command authority, and rollout telemetry

## Purpose

This document is the active governance surface for the implemented meta-review
gate. The original PRD remains feature history; removed rollout templates and
pilot reports remain available only through git history.

## Current Authority

1. Autonomous meta-review starts after reviewer convergence only while
   `sticky_human_gate=false`.
2. Human approval remains mandatory. Pairflow may route to
   `READY_FOR_HUMAN_APPROVAL`, but it must not approve a bubble automatically.
3. `agent emit --kind meta_review_result` is the canonical write path for
   persisted autonomous meta-review results.
4. `bubble status` and persisted report/artifact projections are inspection
   surfaces; they must not execute a fresh review.
5. Runtime recovery uses `bubble restart` or a fresh meta-review run through the
   active workflow. Do not recover current-round authority by replaying stale
   prior-round snapshots.

## Consecutive Clean-Run Gate

The implemented clean-run contract is:

1. `review_policy.meta_review_consecutive_clean_runs_required` is the configured
   number of consecutive threshold-clean meta-review runs required before human
   approval can unlock. Missing legacy config normalizes to `2`.
2. `meta_review.consecutive_clean_runs` is the persisted current streak. Missing
   legacy state normalizes to `0`.
3. `review_policy.meta_review_auto_rework_min_severity` is the threshold
   authority for clean-run evaluation.
4. `review_policy.reviewer_blocking_min_severity` is the reviewer post-gate
   blocking threshold; it does not define whether a meta-review result is clean.
5. A finalized threshold-clean `approve` increments
   `meta_review.consecutive_clean_runs`.
6. If the updated streak is below
   `review_policy.meta_review_consecutive_clean_runs_required`, lifecycle stays
   `RUNNING` and Pairflow starts another meta-review run directly, without an
   implementer/reviewer round.
7. If the updated streak is at or above
   `review_policy.meta_review_consecutive_clean_runs_required`, Pairflow routes
   to `READY_FOR_HUMAN_APPROVAL`.
8. Threshold-meeting findings, `rework`, `inconclusive`, parity/threshold
   failures, run failures, and auto-rework paths reset
   `meta_review.consecutive_clean_runs` to `0`.
9. `auto_rework_count` and `auto_rework_limit` are budget controls only. They
   are not clean-run streak authority.

Do not infer streak authority from transcript prose, pane text, prior human-gate
state, UI labels, quality preset labels, or `auto_rework_count`.

## Structured Findings-Claim Gate

Meta-review routing must use structured `report_json` claim fields, not prose
parsing:

1. `recommendation=rework` requires a structured positive findings claim:
   `findings_claim_state=open_findings`,
   `findings_claim_source=meta_review_artifact`, `findings_count>0`, a
   non-empty `findings_artifact_ref` that resolves under `artifacts/` and points
   to JSON, a non-empty `meta_review_run_id`, non-empty
   `findings_digest_sha256`, and non-empty `findings_artifact_status`.
2. When a submitted `run_id` exists, `report_json.meta_review_run_id` must match
   it.
3. `recommendation=approve` requires split fields:
   `findings_claimed_open_total`, `findings_blocking_open_total`, and
   `findings_advisory_open_total`.
4. Approve split fields must be non-negative integers, `claimed` must equal
   `blocking + advisory`, and `findings_blocking_open_total` must be `0`.
5. Advisory-only approve is allowed only as `recommendation=approve` with
   `findings_claim_state=open_findings`, `findings_blocking_open_total=0`, and
   positive `findings_advisory_open_total`.

Current fail-closed reason codes for this gate include:

1. `FINDINGS_CLAIM_STATE_REQUIRED`
2. `FINDINGS_CLAIM_SOURCE_INVALID`
3. `META_REVIEW_FINDINGS_ARTIFACT_REQUIRED`
4. `META_REVIEW_FINDINGS_COUNT_MISMATCH`
5. `META_REVIEW_FINDINGS_RUN_LINK_MISSING`
6. `META_REVIEW_FINDINGS_PARITY_GUARD`
7. `META_REVIEW_APPROVE_ADVISORY_SPLIT_REQUIRED`
8. `META_REVIEW_APPROVE_ADVISORY_SPLIT_FORMAT_INVALID`
9. `META_REVIEW_APPROVE_BLOCKING_FINDINGS_PRESENT`
10. `META_REVIEW_APPROVE_ADVISORY_ONLY`

Reviewer validation evidence trust is governed separately by
[`reviewer-evidence-governance.md`](./reviewer-evidence-governance.md).

## Quality Preset Authority

The UI quality preset is an exact compact encoding of
`(meta_review_auto_rework_min_severity, meta_review_consecutive_clean_runs_required)`:

| Preset | Backend pair |
|---|---|
| `P1` | `(P1, 1)` |
| `P2` | `(P2, 1)` |
| `P3` | `(P3, 1)` |
| `P3+1` | `(P3, 2)` |
| `P3+2` | `(P3, 3)` |

Unsupported backend pairs, such as `(P2, 2)`, must display as
custom/unsupported and must not be coerced to a supported preset. `P3+1` and
`P3+2` mean threshold `P3` plus one or two additional required clean runs beyond
the baseline `P3` clean run; they are not new severities.

## Command Profile Authority

1. `external` profile means the PATH-resolved external `pairflow` command is
   authoritative.
2. `self_host` is the only profile where the worktree-local `dist/cli/index.js`
   entrypoint is authoritative.
3. A worktree-local Pairflow build may exist during `external` operation, but it
   is diagnostic only and must not redefine authority.
4. `PAIRFLOW_COMMAND_EXTERNAL_UNAVAILABLE` is fail-closed when `external` profile
   cannot resolve a PATH-available `pairflow`.
5. `PAIRFLOW_COMMAND_PATH_STALE` is a blocking command-authority signal for
   `self_host` identity failures.
6. `PAIRFLOW_COMMAND_PATH_UNRESOLVED` is also blocking under `self_host` when the
   configured command path cannot be resolved.

## Round-Local Freshness

1. Each newly converged round requires a fresh meta-review run before the bubble
   is treated as ready for new human approval attention.
2. Prior-round meta-review output is historical only after round increment; it
   must not be treated as current-round gate authority.
3. After round increment and before a fresh current-round run exists, interpret
   `bubble status --json` from the active authority snapshot plus diagnostics
   only.
4. `sticky_human_gate` is not a cross-round bypass signal.
5. Prior-round transcripts and artifacts may be used for diagnosis only, not as
   current-round routing authority.

## Telemetry

`pairflow metrics report` exposes `meta_review_rollout.*` lines for operational
diagnosis:

1. `meta_review_rollout.route_counts`
2. `meta_review_rollout.auto_rework_dispatches`
3. `meta_review_rollout.human_gate_entries`
4. `meta_review_rollout.rollout_blocked_events`
5. `meta_review_rollout.pairflow_command_path_stale_count`
6. `meta_review_rollout.blocking_reason_code_counts`

The `bubble_meta_review_rollout_blocked` event records blocking reason codes.
The current resolver emits these active rollout-blocking codes:

1. `META_REVIEW_GATE_RUN_FAILED`
2. `META_REVIEW_GATE_REWORK_DISPATCH_FAILED`
3. `PAIRFLOW_COMMAND_EXTERNAL_UNAVAILABLE`
4. `PAIRFLOW_COMMAND_PATH_STALE`
5. `PAIRFLOW_COMMAND_PATH_UNRESOLVED`

Treat any new unclassified blocking code as blocking until it has an explicit
policy classification.

## Removed Historical Files

The following files were removed from the working tree because they were
rollout-era artifacts and could be mistaken for active authority:

1. `docs/meta-review-gate-rollout-runbook.md`
2. `docs/meta-review-gate-e2e-validation.md`
3. `docs/review-loop-ws-d-pilot-report-2026-03.md`

Use git history only for historical detail:

```bash
git log --diff-filter=D -- docs/meta-review-gate-rollout-runbook.md
git show <deletion-commit>^:docs/meta-review-gate-rollout-runbook.md
```

Do not use removed files as current policy authority.
