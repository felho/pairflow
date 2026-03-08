# Meta Review Gate PRD (Autonomous Rework Loop + Human Final Gate)

**Date:** 2026-03-08  
**Status:** Proposed (discussion-refined)  
**Owner:** Pairflow Core  
**Type:** Large feature

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
8. Review surface has three explicit invocation modes:
   - `autonomous-run`: Pairflow-invoked live review, lifecycle actions allowed.
   - `manual-run`: user-invoked live review, recommendation/report only.
   - `manual-last`: user-invoked cached-result read, no live review execution.
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
5. `APPROVED_FOR_COMMIT`

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
   - Condition: recommendation `approve`, OR recommendation `rework` with exhausted budget, OR review `inconclusive/error`.
   - Action: set `sticky_human_gate=true`.
6. `READY_FOR_HUMAN_APPROVAL -> RUNNING`
   - Trigger: human requests rework.
7. `READY_FOR_HUMAN_APPROVAL -> APPROVED_FOR_COMMIT`
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
2. `autonomous-run` and `manual-run` differ in side effects, not in review quality bar.
3. `manual-last` does not execute a new review; it only reads persisted latest output.

Boundary contract (skill vs Pairflow CLI):
1. Skill/workflow layer is compute-only: it produces structured review output (`recommendation`, `summary`, findings, detailed report body/refs, and rework target message when applicable).
2. Pairflow CLI is the single persistence authority: it validates and stores review outputs in Pairflow state/artifacts.
3. Pairflow CLI is the single lifecycle authority: only CLI may apply routing/state transitions (`request-rework`, human-gate routing, counters).
4. Skill/workflow must not maintain its own independent durable `last review` storage.
5. `manual-last` must read only Pairflow-persisted state/artifacts (no model run, no skill-local cache).

| Mode | Trigger | Side Effects | Expected Output | Primary Use |
|---|---|---|---|---|
| `autonomous-run` | Pairflow lifecycle trigger | Allowed (`request-rework`, state updates) | Full report + recommendation + rework target message (if `rework`) | Automated gate in production flow |
| `manual-run` | User command | None | Full report + recommendation (+ rework target message if `rework`) | Human deep review / diagnostics |
| `manual-last` | User command | None | Cached latest recommendation/report summary | Low-cost status retrieval in user Codex session |

Rules:
1. Both modes share the same core evaluation methodology to avoid divergence.
2. Only `autonomous-run` may perform lifecycle actions.
3. `manual-run` must never mutate lifecycle state.
4. `manual-last` must be non-generative and near-constant-cost.

Reviewer output payload contract:
1. Every live review (`autonomous-run`, `manual-run`) must produce a detailed human-readable report artifact/body.
2. Every live review must produce exactly one recommendation: `rework|approve|inconclusive`.
3. If recommendation is `rework`, output must include a targeted rework instruction payload (`rework_target_message`) suitable for implementer handoff.
4. `rework_target_message` should be actionable and issue-linked (what to fix and why), not only a generic "please rework" text.
5. If recommendation is `approve|inconclusive`, `rework_target_message` must be `null`.

## Recommendation Contract

Allowed recommendation values:
1. `rework`
2. `approve`
3. `inconclusive`

Routing semantics:
1. `rework`:
   - autonomous-run: auto `request-rework` if budget allows, using `rework_target_message`.
   - manual-run: recommendation only.
   - manual-last: return last stored recommendation only.
2. `approve`:
   - never auto-approve in MVP; move/keep in human gate state.
3. `inconclusive`:
   - route to `READY_FOR_HUMAN_APPROVAL` with explicit reason.

## Input Surface for Meta Review

Required:
1. Bubble transcript tail + round summaries.
2. Worktree diff (`main...HEAD`) and status.
3. Done package.
4. Reviewer verification artifacts.
5. Evidence logs referenced by findings/claims.
6. Task and plan references from bubble artifacts.

Optional:
1. Cross-bubble related tasks.
2. Source-of-truth docs for policy validation.

## Findings and Report Model

Review still emits findings with severity and class tags. Recommendation is derived from full review outcome (not severity-only shortcut).

Finding classes (unchanged conceptual baseline):
1. Evidence/governance consistency.
2. Scope and packaging integrity.
3. Cross-document consistency.
4. Handoff clarity and ownership.
5. Residual risk/readiness.

## Persistence Model (No-Rerun Retrieval)

Artifacts per run:
1. `artifacts/meta-review.json`
2. `artifacts/meta-review.md`

State fields (minimum):
1. `meta_review.last_run_id`
2. `meta_review.last_mode` (`autonomous-run|manual-run`)
3. `meta_review.last_status` (`success|error|inconclusive`)
4. `meta_review.last_recommendation` (`rework|approve|inconclusive`)
5. `meta_review.last_summary`
6. `meta_review.last_report_ref`
7. `meta_review.last_rework_target_message` (nullable; required when `last_recommendation=rework`)
8. `meta_review.last_updated_at`
9. `meta_review.auto_rework_count`
10. `meta_review.auto_rework_limit`
11. `meta_review.sticky_human_gate` (bool)

Requirement:
1. Latest recommendation must be queryable without triggering a new review run.
2. Persisted review payload must be session-independent and readable from any client context (tmux pane, user Codex session, CLI call).

## CLI Additions (MVP)

1. `pairflow bubble meta-review --id <id> --mode <autonomous-run|manual-run|manual-last> [--depth <standard|deep>]`
   - `autonomous-run` and `manual-run` execute live review.
   - `manual-last` returns persisted latest result only.
   - For live modes, CLI must persist returned review output before applying any lifecycle action.
2. `pairflow bubble meta-review-status --id <id> [--json] [--verbose]`
   - Returns cached latest recommendation and counters only (no new run).
   - Default output should be compact for quick operator checks.
3. `pairflow bubble meta-review-report --id <id> [--last]`
   - Prints the latest stored report reference/content summary.

Behavioral requirement:
1. `manual-last` and `meta-review-status` must be cheap and non-generative.
2. `manual-last` is read-only by contract: no mutation of `last_*`, counters, or lifecycle state.

## Meta-Reviewer Pane Requirement

1. Pairflow provides a dedicated meta-reviewer pane for autonomous review execution.
2. Pane shows:
   - current bubble id,
   - current review run id,
   - live stage/progress,
   - final recommendation,
   - whether auto-rework was dispatched.
3. Pane logs are persisted as operational audit evidence.

## Approval and Human Gate Rules

1. Human approval decisions happen only from `READY_FOR_HUMAN_APPROVAL`.
2. If latest recommendation is not `approve`, CLI should require explicit override flag for approval attempt.
3. Override reason is mandatory and auditable.
4. On first entry to `READY_FOR_HUMAN_APPROVAL`, set `sticky_human_gate=true`.
5. While `sticky_human_gate=true`, new convergence must route directly to `READY_FOR_HUMAN_APPROVAL` (skip `READY_FOR_APPROVAL` + autonomous trigger).
6. User may still invoke `manual-run` from human gate state to get a fresh recommendation before deciding `rework` or `approve`.

## Metrics

Per bubble:
1. `meta_review_runs_total`
2. `meta_review_duration_ms`
3. `meta_review_last_recommendation`
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

### Phase 1: Persistence + Invocation Split (`autonomous-run|manual-run|manual-last`)

1. Add review artifacts + state fields.
2. Add `meta-review-status` and report retrieval commands.
3. Ensure no-rerun retrieval path works end-to-end.

### Phase 2: Autonomous Rework Loop

1. Add lifecycle trigger on `READY_FOR_APPROVAL`.
2. Add budget contract with default limit `5`.
3. Add automatic `request-rework` dispatch in autonomous mode.

### Phase 3: Human Gate Hardening + Meta-Reviewer Pane

1. Add `READY_FOR_HUMAN_APPROVAL` state wiring.
2. Add explicit override path for non-approve recommendations.
3. Ship meta-reviewer pane observability and audit logging.

## Acceptance Criteria

1. Each transition to `READY_FOR_APPROVAL` triggers autonomous review while `sticky_human_gate=false` and until auto-rework budget is exhausted.
2. `rework` recommendation auto-dispatches `request-rework` without human confirmation when budget allows.
3. Auto-rework budget default is `5`, and dispatch stops automatically at limit.
4. Final approval is never auto-executed in MVP.
5. `manual-last` and `meta-review-status` return latest recommendation without running a new review.
6. `autonomous-run` and `manual-run` are both supported and reuse the same review workflow logic.
7. When budget is exhausted or review is inconclusive, bubble routes to `READY_FOR_HUMAN_APPROVAL` and sets sticky human gate.
8. After sticky human gate is set, future convergences route directly back to `READY_FOR_HUMAN_APPROVAL`.
9. Meta-reviewer pane exposes live review progress and final routing outcome.
10. All automated rework/override decisions are audit-visible in artifacts/state.

## Risks and Mitigations

1. Risk: excessive looping from aggressive rework policy.
   - Mitigation: strict `max_auto_rework_rounds=5` budget and human gate fallback.
2. Risk: mode drift between autonomous-run and manual-run review behavior.
   - Mitigation: shared evaluation core and contract tests for recommendation parity.
3. Risk: users accidentally rerun expensive reviews just to check status.
   - Mitigation: explicit cached `meta-review-status` command.
4. Risk: autonomous flow opacity.
   - Mitigation: meta-reviewer pane + persisted run artifacts.

## Open Questions (Remaining)

1. Should autonomous `request-rework` message include full finding list or compact summary + report link?
2. Exact CLI UX for approval override when latest recommendation is `rework|inconclusive` (single-step vs confirm flow)?
