# Agent Pair Orchestrator MVP Spec (Claude Code + Codex CLI)

## Status
- Date: 2026-02-21
- Owner: felho
- State: Planned

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
   - Message transport is command-driven (`pairflow pass|ask-human|converged`), not raw stdout scraping.
   - Optional telemetry tap may capture outputs for diagnostics, but it is not authoritative for protocol flow.
4. Protocol Bus
   - Persists message envelopes and artifacts as append-only logs.
5. Human Inbox
   - Shows only blocking items: approvals, clarifications, tie-break decisions.
6. Diff/Test Collector
   - Captures changed files, diff stats, test outcomes per iteration.

## Merged v1.1 Delivery Strategy
Balanced merge of the two planning passes:
1. Keep fast local primitives from `orchestra` (tmux + file-backed exchange + simple launcher workflow).
2. Keep strict orchestration guarantees from this spec (state machine ownership, convergence policy, commit gates).
3. Use agent-friendly short commands (`pass`, `ask-human`, `converged`) but map them to validated structured envelopes.
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
5. `READY_FOR_APPROVAL`
6. `APPROVED_FOR_COMMIT`
7. `COMMITTED`
8. `DONE`
9. `FAILED`
10. `CANCELLED`

Allowed transitions:
1. `CREATED -> PREPARING_WORKSPACE -> RUNNING`
2. `RUNNING -> WAITING_HUMAN` when either agent emits `HUMAN_QUESTION`
3. `WAITING_HUMAN -> RUNNING` after human reply
4. `RUNNING -> READY_FOR_APPROVAL` on convergence criteria pass
5. `READY_FOR_APPROVAL -> APPROVED_FOR_COMMIT` on explicit user approval
6. `READY_FOR_APPROVAL -> RUNNING` on explicit rework decision (`APPROVAL_DECISION=revise|reject`)
7. `APPROVED_FOR_COMMIT -> COMMITTED -> DONE`
8. Any active state -> `FAILED` on unrecoverable errors
9. Any non-final state -> `CANCELLED` on user stop

RUNNING turn tracking (required):
1. `state.json` must track `active_agent` (`claude` | `codex`) and `active_since` timestamp.
2. `state.json` must track round-role metadata: `active_role` (`implementer` | `reviewer`) and `round_role_history`.
3. The status pane shows high-level state, active turn owner, and active role.
4. Liveness watchdog uses `active_agent` context for escalation when no `pairflow` command arrives within configured timeout.
5. Timeout is configured by `watchdog_timeout_minutes` in `bubble.toml` (default: `5`).

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
2. Test command set for bubble completed (or explicitly marked "not available").
3. Explanation pack generated (what changed, why, risks, manual test plan).
4. No unresolved human questions.

Convergence command policy:
1. `pairflow converged` may be invoked only by the agent currently assigned as reviewer for that round.
2. `pairflow` CLI validates transcript and state evidence before accepting convergence transition.
3. Validation must include reviewer-role alternation evidence (`round_role_history`) per policy.
4. If criteria are not met, CLI rejects the command and logs a protocol warning in `transcript.ndjson`.

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
2. All required document checks passed or explicitly waived by user.
3. Human comprehension gate approved.

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
  "type": "TASK|PASS|HUMAN_QUESTION|HUMAN_REPLY|CONVERGENCE|APPROVAL_REQUEST|APPROVAL_DECISION|DONE_PACKAGE",
  "round": 3,
  "payload": {},
  "refs": ["artifact://diff/round-3.patch"]
}
```

Required message types:
1. `TASK`: scoped instruction with acceptance criteria (emitted by orchestrator, typically at bubble start or replan events).
2. `PASS`: agent-to-agent handoff message with summary + artifact references.
3. `HUMAN_QUESTION`: blocking question to user.
4. `HUMAN_REPLY`: user decision/clarification.
5. `CONVERGENCE`: no-critical-findings claim + evidence.
6. `APPROVAL_REQUEST`: final package request to user.
7. `APPROVAL_DECISION`: approve, reject, or revise.
8. `DONE_PACKAGE`: final summary bundle.

Type assignment rules:
1. `pairflow pass` always emits `PASS` in MVP (no required type choice for agents).
2. Optional `--intent <task|review|fix_request>` may be provided; if omitted, CLI infers `payload.pass_intent` from active role.
3. Reviewer-origin `pairflow pass` must explicitly declare findings via `--finding` (repeatable) or `--no-findings`; this is persisted as `PASS.payload.findings[]` (possibly empty).
4. Implementer-origin `pairflow pass` does not carry findings payload.
5. `pairflow ask-human` always emits `HUMAN_QUESTION`.
6. `pairflow bubble reply` always emits `HUMAN_REPLY`.
7. `pairflow converged` always emits `CONVERGENCE` only after policy validation.
8. Agents never infer/write envelope types directly; type is validated and persisted by CLI.

Transport and UX rules:
1. Canonical record is always `transcript.ndjson` (machine-readable source of truth).
2. Optional human-readable message snapshots are stored under `artifacts/messages/`.
3. tmux `send-keys` carries only short notifications and file refs, never full payload bodies.
4. Sequence IDs are allocated under lock to avoid concurrent write races.
5. Agents never write NDJSON directly; `pairflow` CLI generates and appends envelopes on their behalf.

Incoming delivery contract:
1. `pairflow pass` writes artifact + NDJSON envelope first.
2. Then it sends a short tmux notification to the recipient pane containing the round and message file reference.
3. Recipient agent reads referenced artifact(s), performs work/review, and responds via `pairflow` commands.

## Directory Layout
Repository-local control data:
```text
.pairflow/
  bubbles/
    <bubble_id>/
      bubble.toml
      state.json              # includes: state, active_agent, active_since, active_role, round_role_history, last_command_at
      transcript.ndjson
      inbox.ndjson
      artifacts/
        messages/
          001-codex-pass.md
          002-claude-review.md
        round-001.diff
        round-001.tests.txt
        done-package.md
  locks/
    <bubble_id>.lock
  runtime/
    sessions.json
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
reviewer_context_mode = "fresh" # fresh|persistent (default: fresh)
watchdog_timeout_minutes = 5
max_rounds = 8
commit_requires_approval = true
open_command = "cursor {{worktree_path}}"

[agents]
implementer = "codex"
reviewer = "claude"

[commands]
test = "cd 05_finder && npm test"
typecheck = "cd 05_finder && npx tsc --noEmit"

[notifications]
enabled = true
waiting_human_sound = "/System/Library/Sounds/Ping.aiff"
converged_sound = "/System/Library/Sounds/Glass.aiff"
```

Note: `balanced` quality mode is intentionally out of MVP scope to avoid undefined policy behavior.

## CLI Surface (MVP)
Human/operator commands:
1. `pairflow bubble create --id <id> --repo <path> --base <branch> --task <file-or-text>`
2. `pairflow bubble start --id <id>`
3. `pairflow bubble status --id <id>`
4. `pairflow bubble inbox --id <id>`
5. `pairflow bubble reply --id <id> --message "<text>"`
6. `pairflow bubble approve --id <id>`
7. `pairflow bubble request-rework --id <id> --message "<text>"`
8. `pairflow bubble commit --id <id>`
9. `pairflow bubble open --id <id>` (opens external editor at worktree path)
10. `pairflow bubble stop --id <id>`
11. `pairflow bubble resume --id <id>` (operator resumes ping-pong after intervention)
12. `pairflow bubble watchdog --id <id>` (runs timeout check and escalates to `WAITING_HUMAN` when idle timeout is exceeded)

Agent-facing commands (invoked from inside agent sessions):
1. `pairflow pass --summary "<text>" [--ref <artifact-path>]... [--intent <task|review|fix_request>] [--finding <P0|P1|P2|P3:Title>]... [--no-findings]`
2. `pairflow ask-human --question "<text>"`
3. `pairflow converged --summary "<text>"`

`pairflow pass` reference rules:
1. `--ref` is optional and repeatable (`0..N`).
2. Use `--ref` when the message points to concrete artifacts/files; omit for purely conceptual feedback.

Compatibility option:
1. Provide `orchestra` as a thin alias wrapper for agent-facing commands to reduce adoption friction.

Operational note:
Step-1 MVP can run multiple bubbles by launching multiple `pairflow bubble start` processes in separate terminals.

## tmux Session Strategy
Per bubble session layout:
1. pane 0: status/watcher (round, state, last actions, pending human inbox items)
2. pane 1: Claude Code interactive session
3. pane 2: Codex CLI interactive session

Rules:
1. Session name includes bubble id (`pf-<id>`) to avoid collisions.
2. Lock file prevents starting same bubble twice.
3. Crash recovery reads `state.json` and resumes from last stable state.
4. Any pane can receive direct human input; operator uses `pairflow bubble resume --id <id>` to return to ping-pong mode.
5. Optional sound notifications are supported for `waiting-human` and `converged` events (configurable on/off and sound file).
6. Status watcher must display `active_agent`, `active_since`, and watchdog countdown for escalation visibility.
7. Watchdog escalation action is materialized as orchestrator-emitted `HUMAN_QUESTION` and state transition `RUNNING -> WAITING_HUMAN`.
8. Bubble start injects an initial protocol briefing into implementer/reviewer panes (role, required command set, task/worktree references); this improves protocol adherence but does not emit protocol envelopes automatically.
9. When `reviewer_context_mode = "fresh"`, each implementer -> reviewer `PASS` triggers reviewer pane process respawn so each review round starts from clean agent context.

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
2. Agents request pause/escalation via `pairflow ask-human` but do not self-resume.

Approval package must contain:
1. What changed.
2. Why it changed.
3. Key tradeoffs and residual risks.
4. Exact changed files.
5. Suggested manual test plan.
6. Suggested commit message.

## MVP Implementation Plan
### Phase 1: Single Bubble, CLI-first
1. Bubble config + state machine.
2. Worktree manager.
3. tmux launcher with 3-pane interactive layout.
4. One implement-review loop with agent-facing `pass/ask-human/converged`.
5. Human question and approval gates.
6. Commit gating.

Acceptance:
1. End-to-end one bubble run with at least one review loop.
2. Human can answer blocking question and continue.
3. Commit cannot happen without explicit approval.
4. Agent-facing commands (`pass/ask-human/converged`) correctly write NDJSON envelopes and trigger tmux delivery notifications.
5. Watchdog escalation triggers when active agent is idle beyond timeout without protocol command.
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
   - Mitigation: startup pane briefing + liveness watchdog escalation if no protocol command arrives within timeout.
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

## Recommended Build Start
Start with Phase 1 in strict mode:
1. `max_rounds=8`
2. mandatory alternating review at least once
3. mandatory done-package before approval
4. manual commit approval required
