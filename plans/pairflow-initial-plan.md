# Pairflow Initial Implementation Plan

Source specs:
- `/Users/felho/dev/pairflow/docs/pairflow-initial-design.md`
- `/Users/felho/dev/pairflow/AGENTS.md`

Planning constraints applied:
1. Quality and robustness over speed optimizations.
2. TypeScript core implementation.
3. MVP runs in `strict` quality mode only.
4. Protocol uses validated `PASS` envelopes with optional `--intent` and CLI-side inference when omitted.
5. `pairflow converged` is reviewer-only and validated against state + transcript evidence.
6. `state.json` tracks `active_agent`, `active_role`, and `round_role_history` (plus timestamps/liveness fields).
7. `watchdog_timeout_minutes` defaults to `5` via `bubble.toml`.

## Execution Status

Last updated: 2026-02-22

Tracking rule:
1. Update this section when a ticket is completed (same PR/commit that lands the ticket).
2. Keep ticket numbering aligned with the implementation order below.

Ticket status:
1. Ticket 01: Completed (`strict` TS scaffold, lint/typecheck/test baseline).
2. Ticket 02: Completed (config/state/protocol schema validation layer).
3. Ticket 03: Completed (bubble create bootstrap + CLI hardening).
4. Ticket 04: Completed (state machine transitions + guarded state store).
5. Ticket 05: Completed (worktree bootstrap, git consistency, cleanup API).
6. Ticket 06: Completed (transcript store, shared file locking, sequence allocation hardening).
7. Ticket 07: Completed (`pass` command workflow + workspace resolution + CLI routing).
8. Ticket 08: Completed (`ask-human` + `bubble reply` workflow and state/protocol integration).
9. Ticket 09: Pending (`converged` validator + approval gating).
10. Ticket 10: Pending (tmux launcher + watchdog + status pane + commit gate final path).

## Milestone 1: Phase 1 Single-Bubble MVP (CLI-First, Strict Mode)

### Objective
Deliver one end-to-end bubble lifecycle with robust state integrity, agent protocol enforcement, human gates, and commit gating.

### Scope
In:
1. Bubble create/start/status/inbox/reply/approve/request-rework/commit/stop/resume/open commands.
2. Agent commands: `pass`, `ask-human`, `converged`.
3. One running bubble with implementer/reviewer loop and role alternation tracking.
4. Worktree-based isolation, append-only transcript, and file-lock safety.
5. Watchdog escalation based on `active_agent` inactivity and timeout.

Out:
1. Multi-bubble orchestration dashboard or central scheduler.
2. Rich web UI.
3. Non-strict quality modes.

### Concrete Tasks (Ordered)
1. Define domain types and schema validators for `bubble.toml`, `state.json`, and NDJSON envelope payloads.
2. Implement bubble initialization flow (`bubble create`): id validation, directories, default config, initial state snapshot.
3. Implement state machine engine with explicit transition guards and idempotent persistence.
4. Implement workspace manager for worktree create/open/check and branch bootstrap from base branch.
5. Implement protocol bus writer: sequence allocation under lock, envelope validation, append-only transcript, artifact reference capture.
6. Implement agent command handlers:
   - `pass` -> `PASS` envelope with optional `--intent`, inferred `payload.pass_intent` when omitted.
   - `ask-human` -> `HUMAN_QUESTION`.
   - `converged` -> `CONVERGENCE` only after reviewer-role + criteria validation.
7. Implement human inbox + decision commands:
   - question reply path (`HUMAN_REPLY`) and RUNNING resume behavior.
   - approval decision path (`APPROVAL_DECISION`) with commit gate state transitions.
8. Implement tmux session launcher (status pane + claude pane + codex pane) and short notification delivery contract.
9. Implement watchdog/liveness monitor keyed by `active_agent` and `watchdog_timeout_minutes` (default 5).
10. Implement commit gate + scope check + done-package requirement, then finalize `COMMITTED -> DONE`.

### Proposed Module/File Structure
```text
/Users/felho/dev/pairflow/src/
  cli/
    index.ts
    commands/
      bubble/
        create.ts
        start.ts
        status.ts
        inbox.ts
        reply.ts
        approve.ts
        requestRework.ts
        commit.ts
        stop.ts
        resume.ts
        open.ts
      agent/
        pass.ts
        askHuman.ts
        converged.ts
  core/
    state/
      machine.ts
      transitions.ts
      stateStore.ts
    protocol/
      envelope.ts
      validators.ts
      transcriptStore.ts
      sequenceAllocator.ts
    workspace/
      worktreeManager.ts
      scopePolicy.ts
    runtime/
      tmuxManager.ts
      lockManager.ts
      watchdog.ts
      recovery.ts
    human/
      inboxStore.ts
      approvalFlow.ts
    convergence/
      policy.ts
      reviewerEvidence.ts
    quality/
      testProfile.ts
      diffCollector.ts
  config/
    bubbleConfig.ts
    defaults.ts
  types/
    bubble.ts
    protocol.ts
    findings.ts
```

### State/Protocol Implications
1. `state.json` is the authoritative state snapshot; all command handlers must perform transition guard checks before write.
2. `active_agent`, `active_since`, `active_role`, `round_role_history`, and `last_command_at` are mandatory fields in RUNNING flows.
3. Envelope typing is CLI-owned; agents never write raw NDJSON or set arbitrary message type.
4. `pass` defaults:
   - if intent provided, persist as `payload.pass_intent`.
   - if omitted, infer from `active_role` (`implementer` -> task/fix context, `reviewer` -> review context).
5. `converged` acceptance requires:
   - invoker is current reviewer,
   - no open `P0/P1`,
   - reviewer alternation evidence in `round_role_history`,
   - tests done/waived evidence,
   - no unresolved human questions.
6. Watchdog escalation targets the currently tracked `active_agent` and creates actionable inbox events.

### Test/Validation Plan
1. Unit tests:
   - transition matrix validity and forbidden transitions,
   - envelope schema validation + type assignment rules,
   - intent inference rules,
   - reviewer-only convergence and round-history checks,
   - watchdog timeout calculations/default application.
2. Integration tests:
   - bubble create/start happy path with real filesystem fixtures,
   - `pass/ask-human/reply/converged` transcript + inbox writes,
   - lock contention and sequence id monotonicity,
   - crash/restart state reload from snapshot + transcript.
3. End-to-end smoke:
   - one full bubble round-trip from `CREATED` to `DONE` with at least one review loop and approval gate.
4. Validation commands before merge:
   - lint, typecheck, targeted tests for changed modules.

### Acceptance Criteria
1. One bubble can run end-to-end with at least one implementer/reviewer pass.
2. Human blocking question interrupts and resumes correctly.
3. Commit is impossible before explicit approval.
4. `pairflow pass|ask-human|converged` emit validated NDJSON envelopes and tmux notifications.
5. Watchdog escalates when no protocol command arrives beyond timeout.
6. Convergence is rejected without valid reviewer-role alternation evidence.

### Risks + Mitigations
1. Risk: state drift between transcript and snapshot.
   Mitigation: append transcript first, then guarded snapshot update with version/checkpoint id.
2. Risk: race conditions on simultaneous command invocations.
   Mitigation: per-bubble lock files for sequence allocation + state CAS semantics.
3. Risk: agents bypass protocol commands.
   Mitigation: prompt contract plus watchdog escalation and visible status gaps.
4. Risk: false-positive convergence due to weak findings parsing.
   Mitigation: enforce structured `findings[]` schema and strict severity parsing.

## Milestone 2: Phase 2 Multi-Bubble Parallel Usage

### Objective
Scale the MVP engine to support reliable parallel bubbles (target >=5 active) without state/session contamination.

### Scope
In:
1. Per-bubble lock/session/runtime isolation hardening.
2. Multi-process-safe command handling for concurrent bubble operations.
3. Restart/resume reliability across orchestrator restarts.

Out:
1. Centralized visual dashboard (Phase 3).
2. Advanced scheduling/priority orchestration across bubbles.

### Concrete Tasks (Ordered)
1. Harden bubble id normalization and naming rules for tmux session + filesystem safety.
2. Introduce runtime registry for active sessions (`runtime/sessions.json`) with atomic updates.
3. Add cross-bubble guardrails to all command handlers (cannot read/write another bubble path by mistake).
4. Implement startup reconciliation command to detect and repair stale locks/sessions.
5. Add multi-bubble status aggregation and summary command output.
6. Add stress-test harness for 5+ concurrent bubbles with synthetic pass/ask-human traffic.
7. Improve recovery logic to reconcile transcript tail, state snapshot, and tmux process state.

### Proposed Module/File Structure
```text
/Users/felho/dev/pairflow/src/core/runtime/
  sessionsRegistry.ts
  bubbleIsolation.ts
  startupReconciler.ts
  staleLockRecovery.ts

/Users/felho/dev/pairflow/src/cli/commands/bubble/
  list.ts
  resumeAll.ts (optional admin utility)

/Users/felho/dev/pairflow/tests/integration/
  multiBubbleIsolation.test.ts
  restartRecovery.test.ts
  lockContention.test.ts
```

### State/Protocol Implications
1. Bubble-scoped state and transcript paths must remain fully namespaced by `bubble_id`.
2. Session ownership metadata is required to prevent duplicate bubble starts.
3. Recovery logic must preserve append-only transcript guarantees even during partial writes.
4. Protocol handling remains identical; only isolation and concurrency behavior changes.

### Test/Validation Plan
1. Concurrency integration tests for simultaneous `pass` and status polling across bubbles.
2. Process restart tests that assert no orphaned RUNNING state without matching tmux/session evidence.
3. Collision tests for branch names, session names, and lock files.
4. Soak test with >=5 active bubbles and repeated human question cycles.

### Acceptance Criteria
1. Five concurrent bubbles run in separate terminals without collision.
2. No cross-bubble transcript, inbox, state, or worktree contamination.
3. Restart recovery returns each bubble to a valid resumable state.

### Risks + Mitigations
1. Risk: stale lock deadlocks after crash.
   Mitigation: lock lease metadata + reconciler-assisted cleanup policy.
2. Risk: runtime registry corruption under concurrent writes.
   Mitigation: atomic temp-file replace and checksum/version fields.
3. Risk: session naming collision.
   Mitigation: deterministic prefix + validated unique suffix derived from bubble id hash.

## Milestone 3: Phase 3 Thin UI

### Objective
Provide a thin local UI for monitoring and unblocking bubbles while preserving CLI as source-of-truth.

### Scope
In:
1. Bubble list with state badges and active agent/role indicators.
2. Bubble timeline view from transcript.
3. Inbox actions (reply, approve, request rework, resume).
4. Changed files + diff stats panel and open-in-editor action.

Out:
1. Full orchestration from browser without CLI backend parity checks.
2. Remote/multi-user collaboration features.

### Concrete Tasks (Ordered)
1. Define read model layer that projects state/transcript/inbox into UI-safe DTOs.
2. Build thin local API service exposing bubble list/detail/actions backed by existing CLI/core modules.
3. Implement web UI shell with list/detail routes and real-time polling/subscription.
4. Implement inbox action components wired to existing command handlers.
5. Implement diff stats and changed-file list view using collector artifacts.
6. Add end-to-end UI tests for core unblock flows.

### Proposed Module/File Structure
```text
/Users/felho/dev/pairflow/src/ui-api/
  server.ts
  routes/
    bubbles.ts
    inbox.ts
    actions.ts
  presenters/
    bubbleSummaryPresenter.ts
    bubbleTimelinePresenter.ts

/Users/felho/dev/pairflow/ui/
  src/
    app.tsx
    pages/
      BubbleListPage.tsx
      BubbleDetailPage.tsx
    components/
      StateBadge.tsx
      Timeline.tsx
      InboxPanel.tsx
      DiffStatsPanel.tsx
```

### State/Protocol Implications
1. UI never writes transcript directly; it invokes existing command/action APIs.
2. UI read models must expose `active_agent`, `active_role`, and watchdog countdown from canonical state.
3. Approval and human-reply actions continue to generate the same protocol envelopes as CLI commands.

### Test/Validation Plan
1. Contract tests for UI API responses against state/transcript fixtures.
2. UI integration tests for unblock workflows (reply/approve/rework/resume).
3. Snapshot tests for timeline rendering against known transcript sequences.
4. Regression checks ensuring CLI and UI actions produce identical envelope/state effects.

### Acceptance Criteria
1. User can monitor all active bubbles from one screen.
2. User can clear blocking inbox items from UI and see state update.
3. Diff visibility removes need to open editor only for changed-file awareness.

### Risks + Mitigations
1. Risk: UI drifts from CLI behavior.
   Mitigation: action endpoints delegate to shared core command handlers, not duplicated logic.
2. Risk: stale UI state causes wrong approvals.
   Mitigation: optimistic concurrency token on actionable items + refresh-before-submit.
3. Risk: over-expanding UI scope delays delivery.
   Mitigation: enforce thin-UI checklist and reject non-MVP UI features for Phase 3.

## Implementation Order (First ~10 Tickets)

1. Ticket 01: Establish TypeScript project scaffolding, strict tsconfig, shared lint/test tooling.
   Dependencies: none.
2. Ticket 02: Implement config + type schemas (`bubble.toml`, `state.json`, envelope schema).
   Dependencies: Ticket 01.
3. Ticket 03: Implement bubble filesystem bootstrap (`bubble create`) with default strict config and watchdog=5.
   Dependencies: Ticket 02.
4. Ticket 04: Implement state machine transition engine + persistence guards.
   Dependencies: Ticket 02.
5. Ticket 05: Implement worktree manager and bubble branch bootstrap.
   Dependencies: Ticket 03.
6. Ticket 06: Implement protocol transcript writer with lock-based sequence allocator.
   Dependencies: Ticket 02, Ticket 04.
7. Ticket 07: Implement `pairflow pass` command (`PASS` envelope + optional intent inference).
   Dependencies: Ticket 06, Ticket 04.
8. Ticket 08: Implement `ask-human` and `bubble reply` workflow (`WAITING_HUMAN` round-trip).
   Dependencies: Ticket 06, Ticket 04, Ticket 07.
9. Ticket 09: Implement `converged` validator (reviewer-only + round_role_history + P0/P1 checks) and approval gating.
   Dependencies: Ticket 06, Ticket 04, Ticket 07, Ticket 08.
10. Ticket 10: Implement tmux launcher + watchdog + status pane fields (`active_agent`, `active_role`, countdown), then add commit gate command path.
    Dependencies: Ticket 03, Ticket 04, Ticket 05, Ticket 09.

## Unknowns / Clarifications Needed Before Coding

1. Bubble scope policy details for commit gate: whether scope is path-prefix allowlist, task-file-derived, or user-specified glob rules.
2. Test/manual-check profile UX at bubble creation: exact prompt format and how explicit waivers are recorded in artifacts/state.
3. Tie-break trigger for `P2/P3`: deterministic rule set needed for "core logic/security/data integrity" classification to avoid inconsistent behavior.
