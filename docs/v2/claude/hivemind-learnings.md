# claude-hivemind — Learnings for pairflow v2

Date: 2026-03-07
Source: /Users/felho/dev/claude-hivemind

## What is hivemind?

A Claude Code plugin that coordinates **multiple parallel Claude Code sessions** on the same codebase. Not a workflow engine — more of a "multi-agent collaboration layer": agent registration, messaging, file conflict detection, task queue, audit log.

## Relevant patterns

### 1. TTY-based identity — agent session recovery

Hivemind binds agent identity to the terminal device (TTY), not to the Claude Code session ID. If the session resets (context truncation, `/clear`), the agent survives because the terminal is the same.

**v2 takeaway:** Agents running inside a pairflow bubble need a session-independent identity. When the reviewer respawns (as it does now with `reviewer_context_mode=fresh`), identity and "where I am in the workflow" info must not be lost.

### 2. Hook-based context injection and enforcement

Hivemind operates through Claude Code hooks:
- `PreToolUse` — inject pending messages, enforce task requirements
- `PostToolUse` — changelog, lock release
- `UserPromptSubmit` — message delivery

This means **agents do not need modification** — the hook system injects context and enforces rules in the background.

**v2 takeaway:** Step rules and role scope enforcement could work **through hooks**, not just CLI command validation. This is stronger because the agent cannot bypass it (the system calls the hook, not the agent).

### 3. Advisory file locking — conflict prevention

Non-blocking locks that warn: "hey, alfa is also editing this file". The agent decides whether to continue.

**v2 takeaway:** Role scope (idea #4 in first-idea.md) does not have to be a hard block. There could be **advisory + hard** as two levels: advisory warns, hard blocks. More flexible.

### 4. Central state store via Milvus

Hivemind uses Milvus vector DB for everything (agents, messages, tasks, locks, changelog). Feels overengineered for a coordination tool, but there is logic to it: everything in one place, and semantic search (in the task queue) is genuinely useful.

**v2 takeaway:** We do not need Milvus, but the **central state layer** concept matters. In v1, `state.json` + `transcript.ndjson` + `bubble.toml` are scattered. In v2, a clean **state layer** that uniformly handles flow state, step state, messages, and artifacts would be valuable. Does not have to be a DB — could be file-based, but behind a single API.

### 5. Dashboard / observability

Hivemind has a terminal dashboard showing real-time active agents, tasks, and metrics.

**v2 takeaway:** The v1 status pane partially does this, but **multi-flow observability** (multiple bubbles at once) would be important in v2. Hivemind's approach: status line cache file + polling. Simple and effective.

### 6. Delegated work tracking

When an agent delegates work to another, the system tracks it and reminds the delegate to report back.

**v2 takeaway:** This is exactly the **subflow/help** concept (idea #2 in first-idea.md). Hivemind solves it simply: a flag on the agent (`delegated_by`) + reminder at task completion. We could do similarly: a help subflow is a "delegation" with a report-back obligation.

## What is NOT relevant / different direction

| hivemind | pairflow v2 | Why different |
|---|---|---|
| Peer-to-peer agents (equals) | Workflow-driven roles (agent lives in a step) | For us the workflow is the boss, not the agent |
| Bash-only (MCP server = 842 lines bash) | TypeScript core | Different technology choice |
| Milvus vector DB | File-based or lightweight DB | No need for semantic search in core flow |
| No workflow engine | Workflow engine is the point | Hivemind = collaboration, pairflow = orchestration |

## Top 3 things to adopt

1. **Hook-based enforcement** — enforce role scope and step rules through hooks, not just CLI. The agent cannot bypass rules because the system enforces them, not the agent.

2. **Session-independent agent identity** — in the executor layer, agent identity must not depend on the Claude Code session. TTY-binding or a similar mechanism.

3. **State layer abstraction** — hide flow state behind a single API instead of managing scattered files. Hivemind uses Milvus; we could use something simpler, but the abstraction level is right.
