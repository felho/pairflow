# Task: Design & Implement Resume Context Recovery (Reviewed Plan)

## Goal

When `pairflow bubble start --id <id>` runs on a bubble already in a resumable runtime state (`RUNNING`, `WAITING_HUMAN`, `READY_FOR_APPROVAL`, `APPROVED_FOR_COMMIT`, `COMMITTED`), both newly spawned agent panes must receive enough context to continue safely after orchestrator/runtime restarts.

## Review Findings Against Current Code

- `startBubble` correctly detects fresh vs resume mode, but in resume mode it launches both agents without `startupPrompt` and without kickoff messaging.
- Startup prompts are currently passed as CLI arguments via `buildAgentCommand(...startupPrompt)`, not via tmux bootstrap message fields.
- `tmuxManager.launchBubbleTmuxSession` supports only `implementerKickoffMessage`; there is no reviewer kickoff field, so "kick off active agent" is incomplete when active role is reviewer.
- `transcriptStore.readTranscriptEnvelopes` already provides tolerant read mode (`allowMissing`, `toleratePartialFinalLine`) that should be reused for resume summary generation.
- Protocol/inbox semantics for unresolved work exist already (`HUMAN_QUESTION`/`HUMAN_REPLY`, `APPROVAL_REQUEST`/`APPROVAL_DECISION`) and should be derived from transcript events, not from new protocol fields.

## Implementation Plan

### 1. Add Resume Transcript Summary Builder

Create a dedicated summarizer (for example `src/core/protocol/resumeSummary.ts`) that:
- Reads transcript using `readTranscriptEnvelopes(..., { allowMissing: true, toleratePartialFinalLine: true })`.
- Produces a bounded summary (target ~500-1000 tokens; implement with deterministic char/line caps).
- Includes:
  - rounds observed (`max(round)` and message count),
  - key PASS events (`sender`, `recipient`, `summary`, reviewer findings if present),
  - HUMAN question/reply flow,
  - latest message (`type`, `sender`, short payload excerpt),
  - unresolved items inferred from transcript pair balancing.
- Degrades safely: if transcript parsing fails, return a compact fallback summary instead of blocking `bubble start`.

Dependency/testability requirement:
- Wire summary generation through `StartBubbleDependencies` (defaulting to production implementation), similar to existing injectable deps like `launchBubbleTmuxSession`, so resume behavior can be unit tested deterministically without filesystem/transcript coupling.

### 2. Add Resume Prompt Builders in `startBubble`

In resume mode, build startup prompts for both implementer and reviewer using:
- bubble identity: id/repo/worktree,
- current state snapshot: `state`, `round`, `active_agent`, `active_role`,
- generated transcript summary,
- a role-specific instruction line:
  - implementer: continue implementation when active,
  - reviewer: stand by unless active/handed work.

Important: keep using `buildAgentCommand(...startupPrompt)` so behavior remains consistent with fresh start prompt injection.

### 3. Fix Active-Agent Kickoff Delivery

Extend tmux launch API to support kickoff for either pane (recommended: add optional `reviewerKickoffMessage` alongside existing `implementerKickoffMessage`).

Resume kickoff behavior:
- `RUNNING`: send kickoff only to currently active role pane.
- If state is `RUNNING` but `active_role`/`active_agent` is unexpectedly null/inconsistent, do not crash startup; skip kickoff and rely on resume prompts + status guidance.
- `WAITING_HUMAN`: no kickoff (status/watchdog already exposes pending question).
- `READY_FOR_APPROVAL`, `APPROVED_FOR_COMMIT`, `COMMITTED`: no kickoff.

Fresh-start behavior must remain unchanged (implementer kickoff only).

### 4. State-by-State Resume Matrix (Expected)

- `RUNNING`: prompt both panes + kickoff active role pane.
- `WAITING_HUMAN`: prompt both panes, no kickoff.
- `READY_FOR_APPROVAL`: prompt both panes, no kickoff.
- `APPROVED_FOR_COMMIT`: prompt both panes, no kickoff.
- `COMMITTED`: prompt both panes, no kickoff.

### 5. Tests

Add/extend tests to cover:
- Summary generation:
  - empty transcript,
  - long transcript truncation/bounds,
  - PASS + findings extraction,
  - unresolved HUMAN/APPROVAL items,
  - malformed trailing line tolerance and parse-failure fallback.
- `startBubble` resume path:
  - both agent commands contain resume prompt context,
  - active implementer receives kickoff in `RUNNING`,
  - active reviewer receives kickoff in `RUNNING`,
  - `RUNNING` with missing/invalid active role context does not crash and performs no kickoff,
  - no kickoff for non-`RUNNING` resumable states,
  - fresh-start path unchanged.
  - update existing resume assertion in `tests/core/bubble/startBubble.test.ts` (currently checks `implementerKickoffMessage` is undefined) so it reflects new `RUNNING + active implementer` kickoff behavior.
- `tmuxManager`:
  - reviewer kickoff message dispatch (new field),
  - existing implementer kickoff behavior unaffected.
- Summary generator:
  - explicit test for graceful degradation when summary builder fails/throws (resume still starts with fallback context).

## Non-Goals

- No protocol schema changes.
- No bubble state machine transition changes.
- No new CLI commands.
- No automatic restart/resume daemon behavior.

## Acceptance Criteria

1. Resume start injects context prompts into both agent panes for all resumable states.
2. `RUNNING` resume sends kickoff to whichever role is currently active.
3. Transcript summary is concise, deterministic, and unit-tested.
4. Resume flow remains robust even if transcript summary generation encounters parse issues.
5. Fresh-start behavior and existing runtime/session semantics remain unchanged.

## Key Files

- `src/core/bubble/startBubble.ts`
- `src/core/protocol/transcriptStore.ts`
- `src/core/runtime/tmuxManager.ts`
- `src/core/runtime/agentCommand.ts`
- `src/types/protocol.ts`
- `tests/core/bubble/startBubble.test.ts`
- `tests/core/runtime/tmuxManager.test.ts`
