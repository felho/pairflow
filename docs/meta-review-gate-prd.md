# Meta Review Gate PRD (Autonomous Rework Loop + Human Final Gate)

**Date:** 2026-03-09  
**Status:** Implemented (released)  
**Owner:** Pairflow Core  
**Type:** Large feature

Current operational policy lives in
[`docs/meta-review-governance.md`](./meta-review-governance.md). This PRD is
retained as implemented feature history and should not override the governance
document when current runtime policy changes.

## Implementation Snapshot (2026-03-09)

1. Phase 1 delivered: `6d6ac06` (merged by `3f5b08c`).
2. Phase 2 delivered: `a2bbc25` (merged by `b044acb`).
3. Phase 3 delivered: `74ec1e3` (merged by `d672d29`).
4. Phase 3e delivered: `8f5e1c6` (merged by `240ed47`).
5. Post-release fail-closed correction delivered: `38a68ec`.

## WS-D Pilot Tracking Note (2026-03-09)

1. Historical WS-D pilot outcome: the March 2026 Phase 2 `required-for-doc-gates` decision was `go` (WS-D docs-workflow scope only); this later became rollout history only after `9fab8f1` and `c55a90c` removed the enforcement config surface on `2026-03-27`.
2. The WS-D pilot report and rollout validation templates were removed from the working tree. Use git history for historical detail only.
3. Current meta-review operational policy, including clean-run gates and command-authority blockers, is tracked in `docs/meta-review-governance.md`.

## Summary

Pairflow should run the existing deep bubble review workflow as a first-class platform step and automate rework routing when recommendation is `rework`.

Core intent:
1. Keep the current reviewer quality bar and methodology.
2. Remove unnecessary human confirmation for clear `rework` recommendations.
3. Keep final human decision authority for approval.
4. Persist the latest recommendation so users can read it without rerunning costly review.
5. Reuse the existing `UsePairflow/ReviewBubble` workflow as the review engine (do not invent a separate review logic path).

## Decision Snapshot (Historical)

This section records the original MVP decision shape. Current operational
policy lives in `docs/meta-review-governance.md`; implemented defaults and
public CLI surface may differ from early rollout wording below.

1. Original `max_auto_rework_rounds` target: `5`; the implemented default
   `meta_review.auto_rework_limit` is now `10`.
2. If recommendation is `rework`, Pairflow auto-executes `request-rework` (no human confirmation required).
3. Auto-rework applies regardless of severity (`P0`-`P3`).
4. Every reviewer convergence while `sticky_human_gate=false` triggers autonomous review while lifecycle remains `RUNNING`.
5. When budget is exhausted, flow moves to `READY_FOR_HUMAN_APPROVAL`.
6. `approve` is never auto-executed in MVP; final approval remains human-driven.
7. A dedicated meta-reviewer pane runs autonomous review execution and shows live progress.
8. Pairflow CLI meta-review surface is limited to one canonical actor submit path plus generic inspection/remediation surfaces:
   - `agent emit --kind meta_review_result`: canonical autonomous gate write path.
   - `bubble status`: current lifecycle snapshot and non-generative diagnostics.
   - `bubble restart`: supported runtime remediation.
9. Latest review recommendation must be readable from state/artifacts without rerun.
10. Once bubble reaches `READY_FOR_HUMAN_APPROVAL`, it enters sticky human-gate mode for the remainder of that bubble lifecycle.

## Problem Statement

Current behavior:
1. Bubble reaches reviewer convergence in `RUNNING`.
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
2. `READY_FOR_HUMAN_APPROVAL`
3. `APPROVED_FOR_COMMIT`

### Transition Rules

1. `RUNNING -> RUNNING`
   - Trigger: internal loop converges AND `sticky_human_gate=false`.
   - Action: autonomous meta review starts by switching canonical authority to `execution_context.active_role=meta_reviewer` while lifecycle remains `RUNNING`.
2. `RUNNING -> READY_FOR_HUMAN_APPROVAL`
   - Trigger: internal loop converges AND `sticky_human_gate=true`.
   - Action: skip autonomous review; hand back to human gate directly.
3. `RUNNING -> RUNNING`
   - Condition: recommendation `rework` AND `auto_rework_count < auto_rework_limit`.
   - Action: Pairflow issues `request-rework` automatically.
4. `RUNNING -> READY_FOR_HUMAN_APPROVAL`
   - Condition: recommendation `approve`, OR recommendation `rework` with exhausted budget, OR review `inconclusive`, OR run-failed diagnostics.
   - Action: set `sticky_human_gate=true` and persist the current-round recommendation snapshot/diagnostics.
5. `READY_FOR_HUMAN_APPROVAL -> RUNNING`
   - Trigger: human requests rework.
6. `READY_FOR_HUMAN_APPROVAL -> APPROVED_FOR_COMMIT`
   - Trigger: human approves (explicit override policy applies on non-approve recommendation paths).
9. `READY_FOR_HUMAN_APPROVAL -> RUNNING`
   - Trigger: human requests rework.
10. `READY_FOR_HUMAN_APPROVAL -> APPROVED_FOR_COMMIT`
   - Trigger: human approves.

## Auto-Rework Budget Contract

1. `auto_rework_limit` default: `10`.
2. `auto_rework_count` increments only when Pairflow successfully dispatches automatic `request-rework`.
3. Manual human-triggered rework does not increment `auto_rework_count`.
4. Auto-review trigger repeats on each new reviewer convergence while lifecycle remains `RUNNING` until budget is exhausted.
5. When `auto_rework_count >= auto_rework_limit`, `rework` recommendation no longer auto-dispatches; route to `READY_FOR_HUMAN_APPROVAL`.
6. After `sticky_human_gate=true`, autonomous trigger path is disabled for the same bubble; future convergences return directly to `READY_FOR_HUMAN_APPROVAL`.

## Review Engine and Invocation Contract

Review execution engine:
1. The review computation must reuse the existing `UsePairflow/ReviewBubble` workflow logic.
2. Pairflow CLI covers canonical result submission plus generic bubble inspection; runtime remediation uses `pairflow bubble restart --id <id>` or a fresh meta-review run outside any dedicated meta-review subcommand surface.
3. `pairflow bubble status --json` is the operator inspection surface for current authority plus non-authority diagnostics.

Boundary contract (skill vs Pairflow CLI):
1. Skill/workflow layer is compute-only: it produces structured review output (`recommendation`, `summary`, findings, detailed report body/refs, and rework target message when applicable).
2. Pairflow CLI is the single persistence authority for the canonical autonomous snapshot: it validates and stores only the latest autonomous review output in Pairflow state/artifacts.
3. Pairflow CLI is the single lifecycle authority: only CLI may apply routing/state transitions (`request-rework`, human-gate routing, counters).
4. Skill/workflow must not maintain its own independent durable `last review` storage.
5. Cached retrieval commands must read only Pairflow-persisted state/artifacts (no model run, no skill-local cache).

| Command | Trigger | Side Effects | Expected Output | Primary Use |
|---|---|---|---|---|
| `agent emit --kind meta_review_result` | Structured actor submission | Allowed (`request-rework`, state updates) | Full report + recommendation + rework target message (if `rework`) | Canonical autonomous gate write path in production flow |
Rules:
1. Pairflow CLI command set is intentionally minimal: one canonical actor write command (`agent emit --kind meta_review_result`) plus generic bubble inspection and restart commands.
2. Public operator `bubble meta-review` subcommands are removed; autonomous review execution happens outside the public operator CLI and submits results through the canonical actor emit path.
3. Supported operator remediation is `pairflow bubble restart --id <id>` or a fresh meta-review run through the active workflow.
4. Operator inspection must remain non-generative and near-constant-cost.

Reviewer output payload contract:
1. Every autonomous live review submitted through the canonical actor path must produce a detailed human-readable report artifact/body.
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
   - canonical submit path: auto `request-rework` if budget allows, using `rework_target_message`.
2. `approve`:
   - never auto-approve in MVP; move/keep in human gate state.
   - optional `rework_target_message` (if present) is advisory and human-consumed only.
3. `inconclusive`:
   - route to `READY_FOR_HUMAN_APPROVAL` with explicit reason.

Execution error semantics:
1. `status=error` is not treated as a successful inconclusive review outcome.
2. On `status=error`, route to `READY_FOR_HUMAN_APPROVAL` with explicit run-failed diagnostics, then require explicit human decision (`request-rework` or override-aware `approve`).

## Input Surface for Meta Review

1. Meta review input discovery is treated as a black-box capability of `UsePairflow/ReviewBubble`.
2. Normal operation must not require users to pass explicit input bundles for review.
3. If required information cannot be discovered, review must return `inconclusive`; in autonomous mode this must be persisted with diagnostics for human follow-up.

## Findings and Report Model

Review internals are treated as a black box in this PRD.

Pairflow-facing output contract from an autonomous review submission:
1. Decision recommendation: `rework|approve|inconclusive`.
2. Detailed report payload/artifact for human inspection.
3. `rework_target_message` when recommendation is `rework` (optional advisory text may exist for other recommendations).
4. When recommendation is `rework`, `report_json.findings_artifact_ref` must reference a structured JSON findings artifact under `artifacts/`; the human-readable report may be a separate artifact.

## Persistence Model (Last Autonomous Snapshot)

Canonical persistence policy:
1. Pairflow persists only the latest autonomous review snapshot.
2. Each new autonomous submission overwrites the previous snapshot.
3. Retrieval commands read the canonical autonomous snapshot only.

Canonical artifact/state footprint:
1. Rolling artifact: `artifacts/meta-review-last.json` (single-slot overwrite model).
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

## CLI Surface (MVP)

1. `pairflow agent emit --kind meta_review_result --repo <path> --bubble-id <id> --handoff-id <id> --round <n> --recommendation approve|rework|inconclusive --summary <text> [--rework-target-message <text>] --report-json <json> [--ref <artifact-path>]...`
   - Canonical autonomous review result submission path.
   - CLI must persist returned review output before applying any lifecycle action.
2. `pairflow bubble status --id <id> [--json]`
   - Returns the current lifecycle snapshot, active authority fields, and non-authority diagnostics.
   - Default output should be compact for quick operator checks.
3. `pairflow bubble restart --id <id>`
   - Supported operator remediation when a bubble is stuck after snapshot persistence.
   - Restores runtime execution instead of exposing a public snapshot replay subcommand.

Behavioral requirement:
1. `bubble status` inspection must be cheap and non-generative.
2. Inspection commands are read-only by contract: no mutation of canonical snapshot, counters, or lifecycle state.
3. Unknown extra meta-review subcommands must fail fast and must not reroute automatically.
4. If convergence gate execution partially fails after persisting snapshot/run result, supported remediation is `restart` or a fresh meta-review rerun rather than a public snapshot replay command.

## Meta-Reviewer Pane Requirement

1. Pairflow provides a dedicated Codex worker pane (`meta-reviewer`) for autonomous review execution.
2. The pane follows the same orchestrator handoff protocol as other worker panes (implementer/reviewer): receives work, runs its role, returns output to orchestrator.
3. The meta-reviewer pane may be static across runs; restart-per-round behavior is not required.
4. The pane is an execution worker, not a persistence authority; canonical persistence remains the last autonomous snapshot in Pairflow state/artifacts.
5. Pane observability should expose current bubble id, review run id, live stage/progress, final recommendation, and whether auto-rework was dispatched.

## UI Impact (PRD-level)

1. UI must recognize and render meta-review authority while lifecycle stays `RUNNING`, plus `READY_FOR_HUMAN_APPROVAL`.
2. UI must recognize and render `meta-reviewer` as a first-class actor/role anywhere active role or timeline role is shown.
3. Severity/finding tags should remain actor-agnostic: existing severity tag behavior (for example `P0`-`P3`) must continue to work for meta-reviewer findings when findings are present.
4. UI should display the latest autonomous recommendation (`rework|approve|inconclusive`) from the canonical snapshot in a clearly visible bubble/detail surface.
5. Distinct visual styling for meta-reviewer role/recommendation is optional in MVP; correctness of state/role/recommendation visibility is required.

## Approval and Human Gate Rules

1. Human approval decisions happen from `READY_FOR_HUMAN_APPROVAL`.
2. If latest recommendation is not `approve`, CLI should require explicit override flag for approval attempt.
3. Override reason is mandatory and auditable.
4. On first entry to `READY_FOR_HUMAN_APPROVAL`, set `sticky_human_gate=true`.
5. While `sticky_human_gate=true`, new convergence must route directly to `READY_FOR_HUMAN_APPROVAL` (skip autonomous trigger).
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

## Historical Rollout Plan

The original rollout plan below is retained for implementation history. The
current public operator surface is canonical submit plus generic `bubble status`
and `bubble restart`; removed `meta-review status` / `meta-review last-report`
commands must not be treated as current authority.

### Phase 1: Persistence + Inspection

1. Add rolling last-autonomous snapshot storage + state fields.
2. Expose no-rerun inspection through generic status/report artifact surfaces.
3. Ensure no-rerun retrieval works end-to-end from the last autonomous snapshot.

### Phase 2: Autonomous Rework Loop

1. Add reviewer-convergence lifecycle trigger inside `RUNNING`.
2. Add budget contract with default limit `5`.
3. Add automatic `request-rework` dispatch in autonomous mode.

### Phase 3: Human Gate Hardening + Meta-Reviewer Pane

1. Add `READY_FOR_HUMAN_APPROVAL` decision wiring with preserved run-failed diagnostics.
2. Add explicit override path for non-approve recommendations.
3. Ship meta-reviewer pane observability.
4. Ship UI state/role/recommendation rendering for meta-review flow.

## Acceptance Criteria

1. Each reviewer convergence triggers autonomous review while `sticky_human_gate=false` and until auto-rework budget is exhausted.
2. `rework` recommendation auto-dispatches `request-rework` without human confirmation when budget allows.
3. Auto-rework budget default is `10`, and dispatch stops automatically at limit.
4. Final approval is never auto-executed in MVP.
5. Generic inspection surfaces return latest autonomous snapshot data without running a new review.
6. Pairflow CLI supports canonical submit plus `bubble status` / `bubble restart`; fresh manual deep review remains an external workflow.
7. When budget is exhausted or review is inconclusive, bubble routes to `READY_FOR_HUMAN_APPROVAL` and sets sticky human gate.
8. Autonomous run execution failure routes bubble to `READY_FOR_HUMAN_APPROVAL` with persisted run-failed diagnostics.
9. Human decision paths remain explicit (`request-rework` or override-aware `approve`).
10. After sticky human gate is set, future convergences route directly back to `READY_FOR_HUMAN_APPROVAL`.
11. Meta-reviewer pane exposes live review progress and final routing outcome.
12. All automated rework decisions are reflected in current state/snapshot.
13. UI renders `RUNNING` with active meta-review authority plus `READY_FOR_HUMAN_APPROVAL` without fallback/unknown behavior.
14. UI renders `meta-reviewer` actor and latest autonomous recommendation from the canonical snapshot.
15. If gate execution fails after snapshot persistence, supported operator remediation is `restart` or a fresh meta-review run; the public CLI does not expose a snapshot replay command.

## Risks and Mitigations

1. Risk: excessive looping from aggressive rework policy.
   - Mitigation: strict `meta_review.auto_rework_limit` budget and human gate fallback.
2. Risk: behavior drift between autonomous execution and external manual review usage patterns.
   - Mitigation: keep both paths on the same `UsePairflow/ReviewBubble` logic source and monitor recommendation deltas in operator practice.
3. Risk: users accidentally rerun expensive reviews just to check status.
   - Mitigation: explicit non-generative status/report artifact inspection.
4. Risk: autonomous flow opacity.
   - Mitigation: meta-reviewer pane + persisted last autonomous snapshot.
5. Risk: bubble stuck in `RUNNING` with meta-review authority after partial gate failure.
   - Mitigation: explicit restart/new-run remediation and converged-path fail-closed routing to human-visible state.

## Resolved Decisions (from PRD discussion)

1. Rework handoff message channel:
   - Autonomous routing must reuse existing `pairflow bubble request-rework --message` semantics.
   - `rework_target_message` is passed as the canonical `--message` payload (no extra message contract required in MVP).
   - Optional: append/include a report reference in message text for operator convenience.
2. Approval override UX:
   - MVP uses single-step override (no interactive confirm flow).
   - Override requires explicit flag + non-empty reason.
   - Practical operator flow may be natural-language via Codex; Codex maps intent to correct CLI invocation.
