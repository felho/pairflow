# Agent Pair Orchestrator MVP Spec (Claude Code + Codex CLI)

> Historical baseline: the initial MVP scope from this spec is implemented.  
> Last status review: 2026-03-07.  
> For current behavior and CLI/API surface, use `README.md` as canonical.

## Status
- Date: 2026-02-21
- Owner: felho
- State: Implemented (historical baseline)

## Goal
Build a local-first orchestration tool that keeps the quality benefits of dual-agent review while removing manual relay overhead.

Priority order:
1. Maximize output quality.
2. Reduce operator mistakes (wrong thread, wrong context, wrong files).
3. Improve speed only if it does not reduce 1 or 2.

## Non-Goals (MVP)
1. No full reimplementation of agent features via SDK.
2. No autonomous deploy to production.
3. No mandatory rich UI in v1 (terminal/TUI is acceptable).

## Product Decisions
1. CLI-first architecture: run real Claude Code and Codex CLI processes.
2. Bubble isolation by default: one bubble = one git worktree + one branch.
3. Text-based protocol between agents (no screenshot relay).
4. Human approval gate at logical-change boundary before commit.
5. Agents can request human input at any moment (not only at convergence).
6. Work unit boundary rule: PRD creation/review is a separate bubble from PRD implementation.
7. Implementation bubbles must reference an approved PRD artifact ID/source bubble.
8. Robustness-first MVP policy: never trade away state integrity, auditability, or quality gates for raw build speed.
9. Interactive-first v1: both agents run in visible tmux panes; headless mode is deferred.

## High-Level Architecture
Components:
1. Orchestrator Core
   - Owns bubble lifecycle, state machine, routing rules, retries, and stop conditions.
2. Workspace Manager
   - Creates and manages per-bubble git worktrees (or optional full clone mode).
3. Agent Runners (Claude/Codex adapters)
   - Starts CLI sessions and monitors health/liveness.
   - Message transport is command-driven through canonical actor emit (`pairflow agent emit --kind ...`), not raw stdout scraping.
   - Optional telemetry tap may capture outputs for diagnostics, but it is not authoritative for protocol flow.
4. Protocol Bus
   - Persists message envelopes and artifacts as append-only logs.
5. Human Inbox
   - Shows only blocking items: approvals, clarifications, tie-break decisions.
6. Diff/Test Collector
   - Captures changed files, diff stats, test outcomes per iteration.

## Merged v1.1 Delivery Strategy
Balanced merge of the two planning passes:
1. Keep fast local tmux + file-backed exchange + simple launcher workflow primitives.
2. Keep strict orchestration guarantees from this spec (state machine ownership, convergence policy, commit gates).
3. Use canonical actor emit commands (`pairflow agent emit --kind pass|human_question|convergence`) with validated structured envelopes.
4. Build minimal first, but never bypass mandatory checks for quality-first goals.

## Bubble Isolation Model
Default mode: git worktree per bubble.

Rationale:
1. Strong task isolation for 3-5 concurrent topics.
2. Lower disk/network cost than full clones.
3. Easy "open in editor" mapping by bubble path.

Optional fallback mode: full clone per bubble for maximal filesystem isolation.

## State Machine
Bubble-level states:
1. `CREATED`
2. `PREPARING_WORKSPACE`
3. `RUNNING`
4. `WAITING_HUMAN`
5. `READY_FOR_HUMAN_APPROVAL`
6. `APPROVED_FOR_COMMIT`
7. `COMMITTED`
8. `DONE`
9. `FAILED`
10. `CANCELLED`

Allowed transitions:
1. `CREATED -> PREPARING_WORKSPACE -> RUNNING`
2. `RUNNING -> WAITING_HUMAN` when either agent emits `HUMAN_QUESTION`
3. `WAITING_HUMAN -> RUNNING` after human reply
4. `RUNNING -> RUNNING` on reviewer convergence criteria pass when autonomous meta-review gate starts (`execution_context.active_role=meta_reviewer` while lifecycle remains `RUNNING`)
5. `RUNNING -> RUNNING` on autonomous rework dispatch
6. `RUNNING -> READY_FOR_HUMAN_APPROVAL` when convergence must hand back to a human decision (approve/inconclusive/budget exhausted/run-failed diagnostics/sticky human gate)
7. `READY_FOR_HUMAN_APPROVAL -> APPROVED_FOR_COMMIT` on explicit user approval
8. `READY_FOR_HUMAN_APPROVAL -> RUNNING` on explicit immediate rework decision (`APPROVAL_DECISION=rework`)
9. `WAITING_HUMAN` supports deferred deterministic rework intent queue; scheduler consumes pending intent and routes next actionable handoff to implementer (`WAITING_HUMAN -> RUNNING`) without reviewer relay
10. `APPROVED_FOR_COMMIT -> COMMITTED -> DONE`
15. Any active state -> `FAILED` on unrecoverable errors
16. Any non-final state -> `CANCELLED` on user stop

RUNNING turn tracking (required):
1. `state.json` must track `active_agent` (`claude` | `codex`) and `active_since` timestamp.
2. `state.json` must track round-role metadata: `active_role` (`implementer` | `reviewer` | `meta_reviewer`) and `round_role_history`.
3. Active autonomous work must persist a canonical top-level `execution_context` authority block with `active_role`, `handoff_id`, `execution_id`, `round`, `awaited_output_type`, `started_at`, `deadline_at`, and `attempt`.
4. `active_role` remains a lifecycle/status mirror, but authority belongs to `execution_context.active_role`.
5. The status pane shows high-level state, active turn owner, active role, and meta-review diagnostics when present.
6. Liveness watchdog uses canonical `execution_context.started_at` / `deadline_at` whenever an active execution context exists; runtime activity remains observational.
7. Timeout is configured by `watchdog_timeout_minutes` in `bubble.toml` (default: `30`), then standard `RUNNING` escalation additionally requires either a hard dead-signal (missing session / unreadable pane) or a post-timeout quiet window.

Meta-review authority while lifecycle remains `RUNNING`:
1. `RUNNING` must persist the same canonical top-level `execution_context` authority used by generic `RUNNING`.
2. `meta_review.execution_context` may remain as a cached diagnostic mirror, but it is no longer a separate primary authority source.
3. The active meta-review execution context contains `active_role=meta_reviewer`, `handoff_id`, `execution_id`, `round`, `awaited_output_type=meta_review_result`, `started_at`, `deadline_at`, and `attempt`.
4. `pairflow agent emit --kind meta_review_result` is the canonical success-path handoff command. A successful submit validates the active execution context, persists the canonical result, applies the gate route, advances lifecycle state, and closes meta-reviewer ownership in the same command flow.
5. A submit that cannot produce a routeable normal handoff must fail closed as a typed submit error; a canonical snapshot alone is not a successful handoff.
6. The watchdog is not the normal success-path router for canonical meta-review submits before timeout expiry.
7. Watchdog responsibility for meta-review is limited to timeout/liveness/recovery fallback handling when normal submit handoff did not finish.
8. Meta-review authority must not be inferred from `active_since`, `last_command_at`, resume, restart, or general liveness updates; those fields remain observational and must not extend the canonical submit window.
9. After the durable kickoff envelope is appended, runtime delivery confirmation is observability only. Pane-marker uncertainty or pane availability problems must not, by themselves, route the bubble out of canonical `RUNNING`.
10. `state.json` may persist `meta_review.runtime_delivery` as a non-authority diagnostic block with `status = confirmed|uncertain|failed`, optional `reason_code`/`message`, `observed_at`, and correlation fields such as `observed_for_handoff_id` and `observed_for_round`.
11. `meta_review.runtime_delivery` must never extend or replace the canonical authority model. Submit acceptance, recovery, and timeout decisions remain anchored to top-level `execution_context` plus the current-round durable `meta_review_result`.
12. Canonical `pairflow agent emit --kind meta_review_result` authorization must not depend on runtime pane-binding freshness. Missing or deactivated `metaReviewerPane` state after delivery failure, restart, or resume is a runtime diagnostic, not a submit gate, as long as the current-round execution context is still valid.
13. Recovery may temporarily clear live `active_agent` / `active_role` ownership while keeping `RUNNING` plus a valid canonical execution context. In that state canonical submit remains allowed; conflicting live ownership is still rejected, but missing live ownership is not an authority failure by itself.
14. Status and recovery surfaces must project runtime-delivery diagnostics only when their correlation fields still match the active execution context; stale diagnostics are archival only.

## Convergence Policy (Quality-First)
Each loop round:
1. Implementer agent proposes changes and rationale.
2. Reviewer agent performs strict review with severity tags (`P0` to `P3`).
3. If any `P0` or `P1` exists, loop continues.
4. If only `P2/P3`, orchestrator decides:
   - continue loop if risk touches core logic, security, data integrity
   - otherwise request human tie-break
5. Alternate reviewer role at least once before convergence.

Convergence criteria (MVP):
1. Two consecutive review passes with no open `P0/P1`.
2. Round-sensitive `P2` gate on convergence:
   - round 2-3: convergence blocked if the last reviewer pass contains `P2`
   - round 4+: convergence allowed again (`P0/P1` block still applies)
3. Test command set for bubble completed (or explicitly marked "not available").
4. Explanation pack generated (what changed, why, risks, manual test plan).
5. No unresolved human questions.

Convergence command policy:
1. Canonical convergence emit (`pairflow agent emit --kind convergence ...`) may be invoked only by the agent currently assigned as reviewer for that round.
2. `pairflow` CLI validates transcript and state evidence before accepting convergence transition.
3. Validation must include reviewer-role alternation evidence (`round_role_history`) per policy.
4. If criteria are not met, CLI rejects the command and logs a protocol warning in `transcript.ndjson`.

## Accuracy-Critical Reviewer Verification (Phase 1)
When `accuracy_critical=true` in `bubble.toml`:
1. Bubble creation requires persisted reviewer guidance in `artifacts/reviewer-brief.md`.
2. Reviewer PASS must attach a `--ref` whose basename is exactly `review-verification-input.json`.
3. Reviewer verification input must validate against schema `review_verification_v1`.
4. On valid reviewer PASS, orchestrator normalizes and atomically writes `artifacts/review-verification.json`.
5. Reviewer PASS is rejected if verification input is missing, unreadable, invalid JSON, or schema-invalid.
6. Cross-check is enforced:
   - `overall=fail` is allowed only with reviewer `fix_request` + open findings.
   - `overall=pass` is allowed only for clean reviewer handoff (`review` + no findings).
7. Canonical convergence emit (`pairflow agent emit --kind convergence ...`) is blocked unless latest persisted reviewer verification is `pass`.
8. `pairflow bubble status --json` exposes:
   - `accuracy_critical`
   - `last_review_verification` (`pass|fail|missing|invalid`)
   - `failing_gates`

## Document Quality Gate (PRD/PRV Bubbles)
For PRD/PRV work units, "tests" are document validation gates instead of code execution.

Required checks:
1. Completeness check:
   - required sections exist: scope, non-goals, requirements, acceptance criteria, risks, rollout.
2. Ambiguity check:
   - vague/unmeasurable statements are flagged unless tied to measurable targets.
3. Consistency check:
   - no contradiction between scope, requirements, and acceptance criteria.
4. Traceability check:
   - each requirement maps to at least one acceptance criterion.
5. Implementability dry-run:
   - implementer agent can produce a feasible implementation outline without unresolved blockers.
6. Adversarial review pass:
   - reviewer agent performs explicit edge-case/risk critique and tags findings (`P0`-`P3`).
7. Human comprehension gate (mandatory):
   - before PRD/PRV approval, user receives an explanation pack and confirms understanding.

PRD/PRV convergence criteria:
1. Two consecutive review passes with no open `P0/P1`.
2. Round-sensitive `P2` gate on convergence:
   - round 2-3: convergence blocked if the last reviewer pass contains `P2`
   - round 4+: convergence allowed again (`P0/P1` block still applies)
3. All required document checks passed or explicitly waived by user.
4. Human comprehension gate approved.

## Agent Message Protocol (Text Envelope)
Transport format: NDJSON (`one JSON object per line`).

Envelope schema:
```json
{
  "id": "msg_20260221_001",
  "ts": "2026-02-21T12:34:56Z",
  "bubble_id": "b_legal_search_01",
  "sender": "codex|claude|orchestrator|human",
  "recipient": "codex|claude|orchestrator|human",
  "type": "TASK|PASS|HUMAN_QUESTION|HUMAN_REPLY|CONVERGENCE|APPROVAL_REQUEST|APPROVAL_DECISION|COMMIT_RESULT",
  "round": 3,
  "payload": {
    "metadata": {
      "delivery_target_role": "implementer|reviewer|meta_reviewer|status"
    }
  },
  "refs": ["artifact://diff/round-3.patch"]
}
```

Required message types:
1. `TASK`: scoped instruction with acceptance criteria (emitted by orchestrator, typically at bubble start or replan events).
2. `PASS`: agent-to-agent handoff message with summary + artifact references.
3. When `review_policy.review_loop_mode = "meta_only"` and canonical implementer pass authority is active, implementer-origin `PASS` bypasses reviewer relay and targets `meta_reviewer` directly.
4. `HUMAN_QUESTION`: blocking question to user.
5. `HUMAN_REPLY`: user decision/clarification.
6. `CONVERGENCE`: no-critical-findings claim + evidence.
7. `APPROVAL_REQUEST`: final package request to user.
8. `APPROVAL_DECISION`: approve or rework.
9. `COMMIT_RESULT`: final commit completion envelope with technical commit facts (`metadata.commit_sha`, `metadata.commit_message`, `metadata.staged_files`).

Type assignment rules:
1. Canonical `pairflow agent emit --kind pass` emits `PASS` in MVP.
2. Optional `--intent <task|review|fix_request>` may be provided; if omitted, CLI infers `payload.pass_intent` from active role.
3. Reviewer-origin canonical pass emit must explicitly declare findings via `--finding` (repeatable) or `--no-findings`; this is persisted as `PASS.payload.findings[]` (possibly empty).
4. Implementer-origin canonical pass emit does not carry findings payload.
5. Canonical `pairflow agent emit --kind human_question` emits `HUMAN_QUESTION`.
6. `pairflow bubble reply` always emits `HUMAN_REPLY`.
7. Canonical `pairflow agent emit --kind convergence` emits `CONVERGENCE` only after policy validation.
8. Agents never infer/write envelope types directly; type is validated and persisted by CLI.

Transport and UX rules:
1. Canonical record is always `transcript.ndjson` (machine-readable source of truth).
2. Optional human-readable message snapshots are stored under `artifacts/messages/`.
3. tmux `send-keys` carries only short notifications and file refs, never full payload bodies.
4. Sequence IDs are allocated under lock to avoid concurrent write races.
5. Agents never write NDJSON directly; `pairflow` CLI generates and appends envelopes on their behalf.

Runtime delivery-target contract:
1. Canonical role-target key path is `payload.metadata.delivery_target_role`.
2. Allowed token domain is fixed: `implementer | reviewer | meta_reviewer | status`.
3. Resolver precedence is role-first:
   - valid + mapped `delivery_target_role` routes to role pane
   - explicit `status` target routes to the status pane
4. Canonical actor emits must provide `delivery_target_role`; any compatibility fallback for older persisted envelopes is runtime-internal and not part of the canonical authoring contract.
5. Human/orchestrator delivery semantics remain status-pane based.

Incoming delivery contract:
1. Canonical actor emit writes artifact + NDJSON envelope first.
2. Then runtime resolves target pane by `payload.metadata.delivery_target_role`; compatibility handling for older envelopes without that metadata stays internal to the runtime.
3. Runtime sends a short tmux notification to the resolved pane containing the round and message file reference.
4. Recipient agent reads referenced artifact(s), performs work/review, and responds via `pairflow` commands.

## Directory Layout
Repository-local control data:
```text
.pairflow/
  bubbles/
    <bubble_id>/
      bubble.toml
      state.json              # includes: state, active_agent, active_since, active_role, execution_context, round_role_history, last_command_at, meta_review.execution_context (compat), meta_review.runtime_delivery
      transcript.ndjson
      inbox.ndjson
      artifacts/
        messages/
          001-codex-pass.md
          002-claude-review.md
        round-001.diff
        round-001.tests.txt
        ... optional supporting evidence artifacts
  locks/
    <bubble_id>.lock
  runtime/
    sessions.json
    watchdog-health/
      <bubble_id>.json
```

Worktree root default:
```text
<repo_parent>/.pairflow-worktrees/<repo_name>/<bubble_id>/
```

## Bubble Config (`bubble.toml`)
Minimum fields:
```toml
id = "b_legal_search_01"
repo_path = "/abs/path/to/repo"
base_branch = "main"
bubble_branch = "bubble/b_legal_search_01"
work_mode = "worktree" # worktree|clone
quality_mode = "strict" # MVP: strict only
review_artifact_type = "code" # code|document (review guidance mode)
reviewer_context_mode = "fresh" # fresh|persistent (default: fresh)
watchdog_timeout_minutes = 30
max_rounds = 8
commit_requires_approval = true
open_command = "cursor {{worktree_path}}"

[agents]
implementer = "codex"
reviewer = "claude"

[commands]
bootstrap = "cd 05_finder && npm ci && npm run build" # optional; run during bubble start before tmux launch
test = "cd 05_finder && npm test"
typecheck = "cd 05_finder && npx tsc --noEmit"

[notifications]
enabled = true
waiting_human_sound = "/System/Library/Sounds/Ping.aiff"
converged_sound = "/System/Library/Sounds/Glass.aiff"

[local_overlay]
enabled = true
mode = "symlink" # symlink|copy
entries = [".claude", ".mcp.json", ".env.local", ".env.production"]
```

Note: `balanced` quality mode is intentionally out of MVP scope to avoid undefined policy behavior.
Note: local overlay entries are synced at worktree bootstrap; missing sources are skipped and existing worktree targets are not overwritten.

## CLI Surface (MVP)
Human/operator commands:
1. `pairflow bubble create --id <id> --repo <path> --base <branch> --review-artifact-type <document|code> ((--task <file-or-text>) | --ideation)`
2. `pairflow bubble start --id <id>`
3. `pairflow bubble kickoff --id <id> (--task <file-or-text>)` (activates ideation pending bubble to round 1)
4. `pairflow bubble status --id <id>`
5. `pairflow bubble inbox --id <id>`
6. `pairflow bubble reply --id <id> --message "<text>"`
7. `pairflow bubble approve --id <id>`
8. `pairflow bubble request-rework --id <id> --message "<text>"`
9. `pairflow bubble commit --id <id>`
10. `pairflow bubble open --id <id>` (opens external editor at worktree path)
11. `pairflow bubble stop --id <id>`
12. `pairflow bubble resume --id <id>` (operator resumes ping-pong after intervention)
13. `pairflow bubble watchdog --id <id>` (runs timeout + pane-quiet-window check and escalates to `WAITING_HUMAN` when the standard `RUNNING` dead-signal gate is met)

Agent-facing commands (invoked from inside agent sessions):
1. `pairflow agent emit --kind pass --repo <path> --bubble-id <id> --handoff-id <id> --execution-id <id> --summary "<text>" [--ref <artifact-path>]... [--intent <task|review|fix_request>] [--finding <P0|P1|P2|P3:Title>]... [--no-findings]`
2. `pairflow agent emit --kind human_question --repo <path> --bubble-id <id> --handoff-id <id> --execution-id <id> --question "<text>"`
3. `pairflow agent emit --kind convergence --repo <path> --bubble-id <id> --handoff-id <id> --execution-id <id> --summary "<text>"`
4. Ideation pending guard: `pass` and `converged` are rejected while bubble is `RUNNING` at `round=0` with `ideation.task_pending=true`.
5. Direct `agent emit` requires an explicit authority snapshot. `pairflow bubble status --id <id> --repo <path> --json` must surface the active `executionContext`, including both `handoffId` and `executionId`, so agents or operators can copy the current authority values without reading state files directly.
6. Implementer restart recovery advances authority to a fresh `executionContext.attempt`/`handoffId`/`executionId`. Any pre-restart implementer authority snapshot becomes stale and must be refreshed from a new `bubble status --json` snapshot before direct `agent emit`.

Canonical pass emit reference rules:
1. `--ref` is optional and repeatable (`0..N`).
2. Use `--ref` when the message points to concrete artifacts/files; omit for purely conceptual feedback.

Operational note:
Step-1 MVP can run multiple bubbles by launching multiple `pairflow bubble start` processes in separate terminals.

## tmux Session Strategy
Per bubble session layout:
1. pane 0: status/watcher (round, state, last actions, pending human inbox items)
2. pane 1: Codex implementer interactive session
3. pane 2: Claude reviewer interactive session
4. pane 3: Codex meta-reviewer interactive session (autonomous gate worker)

Rules:
1. Session name includes bubble id (`pf-<id>`) to avoid collisions.
2. Lock file prevents starting same bubble twice.
3. Crash recovery reads `state.json` and resumes from last stable state.
4. Any pane can receive direct human input; operator uses `pairflow bubble resume --id <id>` to return to ping-pong mode.
5. Optional sound notifications are supported for `waiting-human` and `converged` events (configurable on/off and sound file).
6. Status watcher must display `active_agent`, `active_since`, and watchdog countdown for escalation visibility.
7. Watchdog escalation action is materialized as orchestrator-emitted `HUMAN_QUESTION` and state transition `RUNNING -> WAITING_HUMAN`.
8. Bubble start injects an initial protocol briefing into implementer/reviewer panes (role, required command set, task/worktree references). Legacy/task bubbles also send implementer kickoff to start round 1 automatically; ideation pending bubbles stay `RUNNING round=0` and require explicit `pairflow bubble kickoff`.
9. Meta-review execution uses the dedicated meta-reviewer pane as worker context during gate runs, but the authoritative timeout window comes from persisted `meta_review.execution_context.started_at` and `deadline_at`.
10. Runtime delivery confirmation for that pane is best-effort operator telemetry after durable kickoff. Missing confirmation or a transient pane fault may populate `meta_review.runtime_delivery`, but it does not replace transcript-backed handoff authority, require pane rebinding for canonical submit, require restored live ownership before canonical submit, or delay timeout evaluation.
11. When `reviewer_context_mode = "fresh"`, each implementer -> reviewer `PASS` triggers reviewer pane process respawn so each review round starts from clean agent context.

## Git Workflow Rules
1. Create bubble branch from selected base branch.
2. Only files in bubble worktree can be modified by that bubble.
3. Pre-commit scope check is mandatory:
   - block commit if staged files violate bubble scope policy
   - require explicit human override
4. Commit only after `APPROVAL_DECISION=approve`.
5. No automatic push in MVP.

## Human-In-The-Loop Behavior
Human is involved at three points:
1. On-demand blocking questions from any agent.
2. Final logical-change approval package before commit.
3. Optional tie-break when reviewers disagree after max rounds.

Resume ownership rule:
1. Only the operator/user resumes paused ping-pong (`pairflow bubble resume --id <id>`).
2. Agents request pause/escalation via canonical actor emit (`pairflow agent emit --kind human_question ...`); this does not change resume ownership.

Approval package must contain:
1. What changed.
2. Why it changed.
3. Key tradeoffs and residual risks.
4. Exact changed files.
5. Suggested manual test plan.
6. Suggested commit message.

## MVP Implementation Plan (Historical, Delivered)
### Phase 1: Single Bubble, CLI-first
1. Bubble config + state machine.
2. Worktree manager.
3. tmux launcher with interactive pane layout (status + implementer + reviewer, later extended with dedicated meta-reviewer pane).
4. One implement-review loop with canonical actor emits for `pass`, `human_question`, and `convergence`.
5. Human question and approval gates.
6. Commit gating.

Acceptance:
1. End-to-end one bubble run with at least one review loop.
2. Human can answer blocking question and continue.
3. Commit cannot happen without explicit approval.
4. Canonical actor emits correctly write NDJSON envelopes and trigger tmux delivery notifications.
5. Watchdog escalation triggers when active agent is past timeout and the post-timeout dead-signal gate is met.
6. Convergence command is rejected when reviewer-role alternation evidence is missing in `state.json`.

### Phase 2: Multi-instance Parallel Usage
1. Reliable lock/session naming.
2. Separate runtime paths per bubble.
3. Stable resume after orchestrator restart.

Acceptance:
1. At least 5 concurrent bubbles in separate terminals without collision.
2. No transcript or session cross-contamination.

### Phase 3: Thin Visual UI
1. Bubble list and state badges.
2. Timeline view per bubble.
3. Inbox panel for human actions.
4. Changed file list + diff stats.
5. Open-in-editor button.

Acceptance:
1. User can monitor and unblock all active bubbles from one view.
2. Diff visibility covers the current "open Cursor just for file list" need.

## Risks and Mitigations
1. Agent protocol bypass (agent does not call `pairflow` commands).
   - Mitigation: startup pane briefing + liveness watchdog escalation if no protocol command arrives within timeout and the pane also goes quiet or unreadable.
2. Infinite critique loops.
   - Mitigation: `max_rounds`, tie-break policies, human escalation.
3. Agent drift from task scope.
   - Mitigation: strict task envelope + diff scope checks every round.
4. State corruption on crash.
   - Mitigation: append-only logs + resumable state snapshots.
5. Simultaneous pass race (both agents attempt handoff at same time).
   - Mitigation: file lock around sequence allocation + state transition CAS check.

## Build Decisions Locked (2026-02-21)
1. Orchestrator core language: `TypeScript`.
2. UI direction: CLI-first backend, thin web UI in Phase 3.
3. Test policy: auto-detect + mandatory human confirmation at bubble creation; no convergence without validated test/manual-check profile.

## Historical Build Start Notes
This was the original suggested start configuration:
1. `max_rounds=8`
2. mandatory alternating review at least once
3. commit completion is authority-backed by `COMMIT_RESULT`, not by a prose done package
4. manual commit approval required
