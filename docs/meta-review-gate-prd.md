# Meta Review Gate PRD (Autonomous Rework Loop + Human Final Gate)

**Date:** 2026-03-09  
**Status:** Implemented (released)  
**Owner:** Pairflow Core  
**Type:** Large feature

## Implementation Snapshot (2026-03-09)

1. Phase 1 delivered: `6d6ac06` (merged by `3f5b08c`).
2. Phase 2 delivered: `a2bbc25` (merged by `b044acb`).
3. Phase 3 delivered: `74ec1e3` (merged by `d672d29`).
4. Phase 3e delivered: `8f5e1c6` (merged by `240ed47`).
5. Post-release fail-closed correction delivered: `38a68ec`.

## WS-D Pilot Tracking Note (2026-03-09)

1. WS-D pilot report linkage: `docs/review-loop-ws-d-pilot-report-2026-03.md`.
2. Current WS-D decision for Phase 2 `required-for-doc-gates` enforce: `go` (WS-D docs-workflow scope only).
3. Meta-review rollout blockers remain tracked in a separate rollout-readiness lane (runbook/e2e validation path).

## Summary

Pairflow should run the existing deep bubble review workflow as a first-class platform step and automate rework routing when recommendation is `rework`.

Core intent:
1. Keep the current reviewer quality bar and methodology.
2. Remove unnecessary human confirmation for clear `rework` recommendations.
3. Keep final human decision authority for approval.
4. Persist the latest recommendation so users can read it without rerunning costly review.
5. Reuse the existing `UsePairflow/ReviewBubble` workflow as the review engine (do not invent a separate review logic path).

## Decision Snapshot (Locked from current discussion)

1. `max_auto_rework_rounds = 5`.
2. If recommendation is `rework`, Pairflow auto-executes `request-rework` (no human confirmation required).
3. Auto-rework applies regardless of severity (`P0`-`P3`).
4. Every transition to `READY_FOR_APPROVAL` triggers autonomous review while budget remains and `sticky_human_gate=false`.
5. When budget is exhausted, flow moves to `READY_FOR_HUMAN_APPROVAL`.
6. `approve` is never auto-executed in MVP; final approval remains human-driven.
7. A dedicated meta-reviewer pane runs autonomous review execution and shows live progress.
8. Pairflow CLI meta-review surface has three explicit commands:
   - `run`: Pairflow-invoked live autonomous review, lifecycle actions allowed.
   - `status`: cached last-autonomous snapshot read (no live review execution).
   - `last-report`: cached last-autonomous report read (no live review execution).
9. Latest review recommendation must be readable from state/artifacts without rerun.
10. Once bubble reaches `READY_FOR_HUMAN_APPROVAL`, it enters sticky human-gate mode for the remainder of that bubble lifecycle.

## Problem Statement

Current behavior:
1. Bubble reaches `READY_FOR_APPROVAL`.
2. Human (often in Codex context) runs deep review workflow manually.
3. Reviewer recommends `rework` or `approve`.
4. Human still has to manually issue lifecycle decision.

Pain points:
1. Human attention is repeatedly consumed by a control action (`request-rework`) that is often reliably decided by review output.
2. Even when `rework` recommendation is clear, human still has to manually execute lifecycle routing.
3. User involvement happens too early in the loop; the desired model is to involve human later, when bubble quality is already higher and approval decisions are more meaningful.

## Goals

1. Make deep review recommendation a native Pairflow step.
2. Auto-route `rework` recommendations back to implementer/reviewer loop.
3. Preserve human final gate for approval.
4. Persist recommendation/report artifacts for low-cost retrieval.
5. Keep behavior deterministic and auditable across rounds.
6. Make it convenient for user-facing Codex session to read last autonomous outcome without spending extra review tokens.

## Non-Goals

1. Replacing the internal implementer/reviewer loop.
2. Auto-approval in MVP.
3. Changing reviewer severity ontology.
4. Redesigning model-provider strategy in MVP.

## Lifecycle Model

### States

1. `RUNNING`
2. `READY_FOR_APPROVAL`
3. `META_REVIEW_RUNNING`
4. `READY_FOR_HUMAN_APPROVAL`
5. `META_REVIEW_FAILED`
6. `APPROVED_FOR_COMMIT`

### Transition Rules

1. `RUNNING -> READY_FOR_APPROVAL`
   - Trigger: internal loop converges AND `sticky_human_gate=false`.
2. `RUNNING -> READY_FOR_HUMAN_APPROVAL`
   - Trigger: internal loop converges AND `sticky_human_gate=true`.
   - Action: skip autonomous review; hand back to human gate directly.
3. `READY_FOR_APPROVAL -> META_REVIEW_RUNNING`
   - Trigger: autonomous meta review start.
4. `META_REVIEW_RUNNING -> RUNNING`
   - Condition: recommendation `rework` AND `auto_rework_count < auto_rework_limit`.
   - Action: Pairflow issues `request-rework` automatically.
5. `META_REVIEW_RUNNING -> READY_FOR_HUMAN_APPROVAL`
   - Condition: recommendation `approve`, OR recommendation `rework` with exhausted budget, OR review `inconclusive` (non-error completion).
   - Action: set `sticky_human_gate=true`.
6. `META_REVIEW_RUNNING -> META_REVIEW_FAILED`
   - Condition: autonomous meta-review execution failed (`status=error`, runner unavailable, or invocation failure).
   - Action: persist run-failed diagnostics/recommendation snapshot in fail-closed state.
7. `META_REVIEW_FAILED -> RUNNING`
   - Trigger: human requests rework.
8. `META_REVIEW_FAILED -> APPROVED_FOR_COMMIT`
   - Trigger: human approves (explicit override policy applies on non-approve recommendation paths).
9. `READY_FOR_HUMAN_APPROVAL -> RUNNING`
   - Trigger: human requests rework.
10. `READY_FOR_HUMAN_APPROVAL -> APPROVED_FOR_COMMIT`
   - Trigger: human approves.

## Auto-Rework Budget Contract

1. `auto_rework_limit` default: `5`.
2. `auto_rework_count` increments only when Pairflow successfully dispatches automatic `request-rework`.
3. Manual human-triggered rework does not increment `auto_rework_count`.
4. Auto-review trigger repeats on each new `READY_FOR_APPROVAL` transition until budget is exhausted.
5. When `auto_rework_count >= auto_rework_limit`, `rework` recommendation no longer auto-dispatches; route to `READY_FOR_HUMAN_APPROVAL`.
6. After `sticky_human_gate=true`, autonomous trigger path is disabled for the same bubble; future convergences return directly to `READY_FOR_HUMAN_APPROVAL`.

## Review Engine and Invocation Contract

Review execution engine:
1. The review computation must reuse the existing `UsePairflow/ReviewBubble` workflow logic.
2. Pairflow CLI covers autonomous execution and cached retrieval; fresh manual deep review remains an external workflow in user Codex session.
3. Cached retrieval commands (`status`, `last-report`) do not execute a new review; they only read persisted latest autonomous output.

Boundary contract (skill vs Pairflow CLI):
1. Skill/workflow layer is compute-only: it produces structured review output (`recommendation`, `summary`, findings, detailed report body/refs, and rework target message when applicable).
2. Pairflow CLI is the single persistence authority for the canonical autonomous snapshot: it validates and stores only the latest autonomous review output in Pairflow state/artifacts.
3. Pairflow CLI is the single lifecycle authority: only CLI may apply routing/state transitions (`request-rework`, human-gate routing, counters).
4. Skill/workflow must not maintain its own independent durable `last review` storage.
5. Cached retrieval commands must read only Pairflow-persisted state/artifacts (no model run, no skill-local cache).

| Command | Trigger | Side Effects | Expected Output | Primary Use |
|---|---|---|---|---|
| `meta-review run` | Pairflow lifecycle trigger | Allowed (`request-rework`, state updates) | Full report + recommendation + rework target message (if `rework`) | Automated gate in production flow |
| `meta-review status` | User command | None | Cached latest autonomous recommendation + counters | Low-cost decision/status retrieval |
| `meta-review last-report` | User command | None | Cached latest autonomous report summary/reference | Low-cost report retrieval |

Rules:
1. Pairflow CLI command set is intentionally minimal: one execute command (`run`) and two retrieval commands (`status`, `last-report`).
2. Only `meta-review run` may perform lifecycle actions.
3. Retrieval commands must be non-generative and near-constant-cost.

Reviewer output payload contract:
1. Every autonomous live review (`run`) must produce a detailed human-readable report artifact/body.
2. Every autonomous live review must produce exactly one recommendation: `rework|approve|inconclusive`.
3. If recommendation is `rework`, output must include a targeted rework instruction payload (`rework_target_message`) suitable for implementer handoff.
4. `rework_target_message` should be actionable and issue-linked (what to fix and why), not only a generic "please rework" text.
5. If recommendation is `approve|inconclusive`, `rework_target_message` may still be present as optional quality-improvement guidance.
6. For `approve|inconclusive`, `rework_target_message` is informational only and must not trigger automatic lifecycle routing.

## Recommendation Contract

Allowed recommendation values:
1. `rework`
2. `approve`
3. `inconclusive`

Routing semantics:
1. `rework`:
   - run: auto `request-rework` if budget allows, using `rework_target_message`.
2. `approve`:
   - never auto-approve in MVP; move/keep in human gate state.
   - optional `rework_target_message` (if present) is advisory and human-consumed only.
3. `inconclusive`:
   - route to `READY_FOR_HUMAN_APPROVAL` with explicit reason.

Execution error semantics:
1. `status=error` is not treated as a successful inconclusive review outcome.
2. On `status=error`, route to `META_REVIEW_FAILED` (fail-closed) with explicit run-failed diagnostics, then require explicit human decision (`request-rework` or override-aware `approve`).

## Input Surface for Meta Review

1. Meta review input discovery is treated as a black-box capability of `UsePairflow/ReviewBubble`.
2. Normal operation must not require users to pass explicit input bundles for review.
3. If required information cannot be discovered, review must return `inconclusive`; in autonomous mode this must be persisted with diagnostics for human follow-up.

## Findings and Report Model

Review internals are treated as a black box in this PRD.

Pairflow-facing output contract from a live review run:
1. Decision recommendation: `rework|approve|inconclusive`.
2. Detailed report payload/artifact for human inspection.
3. `rework_target_message` when recommendation is `rework` (optional advisory text may exist for other recommendations).

## Persistence Model (Last Autonomous Snapshot)

Canonical persistence policy:
1. Pairflow persists only the latest autonomous review snapshot.
2. Each new `run` overwrites the previous snapshot.
3. Retrieval commands read the canonical autonomous snapshot only.

Canonical artifact/state footprint:
1. Optional rolling artifacts: `artifacts/meta-review-last.json` and `artifacts/meta-review-last.md` (single-slot overwrite model).
2. State fields (minimum):
   - `meta_review.last_autonomous_run_id`
   - `meta_review.last_autonomous_status` (`success|error|inconclusive`)
   - `meta_review.last_autonomous_recommendation` (`rework|approve|inconclusive`)
   - `meta_review.last_autonomous_summary`
   - `meta_review.last_autonomous_report_ref`
   - `meta_review.last_autonomous_rework_target_message` (nullable; required when recommendation is `rework`; optional advisory text otherwise)
   - `meta_review.last_autonomous_updated_at`
   - `meta_review.auto_rework_count`
   - `meta_review.auto_rework_limit`
   - `meta_review.sticky_human_gate` (bool)

Requirements:
1. Latest autonomous recommendation must be queryable without triggering a new review run.
2. Persisted snapshot must be session-independent and readable from any client context (tmux pane, user Codex session, CLI call).

## CLI Additions (MVP)

1. `pairflow bubble meta-review run --id <id> [--depth <standard|deep>]`
   - Executes live autonomous review.
   - CLI must persist returned review output before applying any lifecycle action.
2. `pairflow bubble meta-review status --id <id> [--json] [--verbose]`
   - Returns cached latest autonomous recommendation snapshot and counters only (no new run).
   - Default output should be compact for quick operator checks.
3. `pairflow bubble meta-review last-report --id <id>`
   - Returns the latest stored report reference/content summary.

Behavioral requirement:
1. `meta-review status` and `meta-review last-report` must be cheap and non-generative.
2. Retrieval commands are read-only by contract: no mutation of canonical snapshot, counters, or lifecycle state.

## Meta-Reviewer Pane Requirement

1. Pairflow provides a dedicated Codex worker pane (`meta-reviewer`) for autonomous review execution.
2. The pane follows the same orchestrator handoff protocol as other worker panes (implementer/reviewer): receives work, runs its role, returns output to orchestrator.
3. The meta-reviewer pane may be static across runs; restart-per-round behavior is not required.
4. The pane is an execution worker, not a persistence authority; canonical persistence remains the last autonomous snapshot in Pairflow state/artifacts.
5. Pane observability should expose current bubble id, review run id, live stage/progress, final recommendation, and whether auto-rework was dispatched.

## UI Impact (PRD-level)

1. UI must recognize and render the meta-review lifecycle states used by this feature (at minimum `META_REVIEW_RUNNING`, `READY_FOR_HUMAN_APPROVAL`, and `META_REVIEW_FAILED`).
2. UI must recognize and render `meta-reviewer` as a first-class actor/role anywhere active role or timeline role is shown.
3. Severity/finding tags should remain actor-agnostic: existing severity tag behavior (for example `P0`-`P3`) must continue to work for meta-reviewer findings when findings are present.
4. UI should display the latest autonomous recommendation (`rework|approve|inconclusive`) from the canonical snapshot in a clearly visible bubble/detail surface.
5. Distinct visual styling for meta-reviewer role/recommendation is optional in MVP; correctness of state/role/recommendation visibility is required.

## Approval and Human Gate Rules

1. Human approval decisions happen from `READY_FOR_HUMAN_APPROVAL` and `META_REVIEW_FAILED`.
2. If latest recommendation is not `approve`, CLI should require explicit override flag for approval attempt.
3. Override reason is mandatory and auditable.
4. On first entry to `READY_FOR_HUMAN_APPROVAL`, set `sticky_human_gate=true`.
5. While `sticky_human_gate=true`, new convergence must route directly to `READY_FOR_HUMAN_APPROVAL` (skip `READY_FOR_APPROVAL` + autonomous trigger).
6. User may still invoke manual deep review directly in user Codex session (outside Pairflow CLI) before deciding `rework` or `approve`.

## Metrics

Per bubble:
1. `meta_review_runs_total`
2. `meta_review_duration_ms`
3. `meta_review_last_autonomous_recommendation`
4. `meta_review_auto_rework_count`
5. `meta_review_auto_rework_limit`
6. `meta_review_reached_human_gate` (bool)
7. `meta_review_inconclusive_count`

Fleet-level:
1. Auto-rework hit rate (% runs resulting in automatic rework).
2. Budget exhaustion rate.
3. Human gate recommendation mix (`approve|rework|inconclusive`).
4. Time-to-human-gate delta vs manual-only baseline.

## Rollout Plan

### Phase 1: Persistence + Command Split (`run|status|last-report`)

1. Add rolling last-autonomous snapshot storage + state fields.
2. Add `meta-review status` and `meta-review last-report` retrieval commands.
3. Ensure no-rerun retrieval path works end-to-end from the last autonomous snapshot.

### Phase 2: Autonomous Rework Loop

1. Add lifecycle trigger on `READY_FOR_APPROVAL`.
2. Add budget contract with default limit `5`.
3. Add automatic `request-rework` dispatch in autonomous mode.

### Phase 3: Human Gate Hardening + Meta-Reviewer Pane

1. Add `READY_FOR_HUMAN_APPROVAL` + `META_REVIEW_FAILED` decision wiring.
2. Add explicit override path for non-approve recommendations.
3. Ship meta-reviewer pane observability.
4. Ship UI state/role/recommendation rendering for meta-review flow.

## Acceptance Criteria

1. Each transition to `READY_FOR_APPROVAL` triggers autonomous review while `sticky_human_gate=false` and until auto-rework budget is exhausted.
2. `rework` recommendation auto-dispatches `request-rework` without human confirmation when budget allows.
3. Auto-rework budget default is `5`, and dispatch stops automatically at limit.
4. Final approval is never auto-executed in MVP.
5. `meta-review status` and `meta-review last-report` return latest autonomous snapshot data without running a new review.
6. Pairflow CLI supports `run`, `status`, and `last-report`; fresh manual deep review remains an external workflow.
7. When budget is exhausted or review is inconclusive, bubble routes to `READY_FOR_HUMAN_APPROVAL` and sets sticky human gate.
8. Autonomous run execution failure routes bubble to `META_REVIEW_FAILED` with persisted run-failed diagnostics.
9. Human decision paths from `META_REVIEW_FAILED` remain explicit (`request-rework` or override-aware `approve`).
10. After sticky human gate is set, future convergences route directly back to `READY_FOR_HUMAN_APPROVAL`.
11. Meta-reviewer pane exposes live review progress and final routing outcome.
12. All automated rework decisions are reflected in current state/snapshot.
13. UI renders `META_REVIEW_RUNNING`, `READY_FOR_HUMAN_APPROVAL`, and `META_REVIEW_FAILED` states without fallback/unknown behavior.
14. UI renders `meta-reviewer` actor and latest autonomous recommendation from the canonical snapshot.

## Risks and Mitigations

1. Risk: excessive looping from aggressive rework policy.
   - Mitigation: strict `max_auto_rework_rounds=5` budget and human gate fallback.
2. Risk: behavior drift between autonomous execution and external manual review usage patterns.
   - Mitigation: keep both paths on the same `UsePairflow/ReviewBubble` logic source and monitor recommendation deltas in operator practice.
3. Risk: users accidentally rerun expensive reviews just to check status.
   - Mitigation: explicit cached `meta-review status` and `meta-review last-report` commands.
4. Risk: autonomous flow opacity.
   - Mitigation: meta-reviewer pane + persisted last autonomous snapshot.

## Resolved Decisions (from PRD discussion)

1. Rework handoff message channel:
   - Autonomous routing must reuse existing `pairflow bubble request-rework --message` semantics.
   - `rework_target_message` is passed as the canonical `--message` payload (no extra message contract required in MVP).
   - Optional: append/include a report reference in message text for operator convenience.
2. Approval override UX:
   - MVP uses single-step override (no interactive confirm flow).
   - Override requires explicit flag + non-empty reason.
   - Practical operator flow may be natural-language via Codex; Codex maps intent to correct CLI invocation.
