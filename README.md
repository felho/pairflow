# Pairflow

Pairflow is a **CLI-first bubble orchestrator** for local git repositories. It runs an isolated implementer/reviewer iteration loop with human gates, a validated state machine, and an append-only protocol transcript.

**The core idea:** you define a task, Pairflow creates an isolated workspace (git worktree + tmux session), and two AI agents — an implementer and a reviewer — iterate on the solution. You stay in control through explicit approval gates and can intervene at any point.

## Current status

- Phase 1 (single bubble MVP): done
- Phase 2 (multi-bubble reliability): done
- Phase 3 (thin UI): not yet implemented

Stable CLI + runtime + parallel multi-bubble usage is available.

## Key concepts

### What is a bubble?

A **bubble** is an isolated unit of work. Each bubble gets:

- Its own **git worktree** (separate from your main repo)
- Its own **tmux session** with 3 panes (status, implementer agent, reviewer agent)
- Its own **state machine** tracking the lifecycle
- Its own **NDJSON transcript** recording every protocol message

Bubbles are fully isolated from each other — you can run multiple bubbles in parallel on the same repo.

### How does the flow work?

Pairflow does **not** autonomously drive conversations between agents. Instead, the agents use protocol commands (`pass`, `ask-human`, `converged`) to advance the flow. Think of Pairflow as the referee + record-keeper, not the player.

```
┌──────────┐    pass     ┌──────────┐    pass     ┌──────────┐
│Implementer│ ────────→  │ Reviewer  │ ────────→  │Implementer│  ...
└──────────┘             └──────────┘             └──────────┘
                              │
                              │ converged
                              ▼
                         ┌──────────┐   approve   ┌──────────┐
                         │  Human   │ ────────→   │  Commit   │
                         │ approval │             │  & Done   │
                         └──────────┘             └──────────┘
```

At any point, agents can call `ask-human` to pause the flow and ask for your input.

### Roles

| Role | Default agent | What it does |
|------|---------------|--------------|
| **Implementer** | `codex` | Writes code based on the task description |
| **Reviewer** | `claude` | Reviews the implementation, requests fixes or converges |
| **Human** (you) | — | Answers questions, approves/rejects, commits |

## Prerequisites

- Node.js `>= 22`
- `pnpm` (`packageManager: pnpm@10.8.1`)
- `git`
- `tmux`

Optional but recommended:

- `cursor` (default editor for `bubble open`)
- `codex` and `claude` binaries in PATH (for tmux agent panes)

## Installation

```bash
git clone <repo-url> && cd pairflow
pnpm install
pnpm build
```

Development mode (zsh-safe):

```bash
PF=(node /path/to/pairflow/dist/cli/index.js)
"${PF[@]}" bubble list --help
```

Global install (adds `pairflow` to PATH):

```bash
pnpm link --global
pairflow bubble list --help
```

## Quick start (5 minutes)

```bash
pnpm build

# Create a test repo
TEST_REPO="/tmp/pairflow-test"
rm -rf "$TEST_REPO" && mkdir -p "$TEST_REPO" && cd "$TEST_REPO"
git init -b main
git config user.email "test@example.com"
git config user.name "Test"
echo "# Test" > README.md && git add . && git commit -m "init"

# Create and start a bubble
pairflow bubble create --id my_first --repo "$TEST_REPO" --base main \
  --task "Add a hello world function to index.ts"
pairflow bubble start --id my_first --repo "$TEST_REPO"

# Check status
pairflow bubble status --id my_first --repo "$TEST_REPO" --json
```

This opens a tmux session with 3 panes. The agents can now start working.

---

## Scenarios: using Pairflow step by step

### Scenario 1: Happy path — task to commit

This is the simplest flow where everything goes smoothly.

```bash
# 1. Define the task and create a bubble
pairflow bubble create --id feat_login \
  --repo /path/to/myapp --base main \
  --task "Implement email/password login form with client-side validation"

# You can also use a file for complex task descriptions:
pairflow bubble create --id feat_login \
  --repo /path/to/myapp --base main \
  --task-file ./tasks/login-spec.md

# 2. Start the bubble (creates worktree + tmux session)
pairflow bubble start --id feat_login --repo /path/to/myapp
```

At this point, a tmux session `pf-feat_login` opens with:
- **Pane 0**: Status loop (auto-refreshes state + watchdog)
- **Pane 1**: Implementer agent (codex) — ready to work
- **Pane 2**: Reviewer agent (claude) — waiting for handoff

```bash
# 3. Implementer finishes first pass, hands off to reviewer
#    (run FROM the worktree directory — bubble is auto-detected from CWD)
pairflow pass --summary "Login form implemented with email regex validation"

# 4. Reviewer reviews and sends feedback back
pairflow pass --summary "Missing: password strength indicator, error messages not i18n-ready"

# 5. Implementer fixes issues, hands off again
pairflow pass --summary "Added password strength meter and i18n error keys"

# 6. Reviewer is satisfied — signals convergence
pairflow converged --summary "All review criteria met, code is clean"
#    → State becomes READY_FOR_APPROVAL
#    → An approval request appears in your inbox

# 7. You review and approve
pairflow bubble approve --id feat_login --repo /path/to/myapp
#    → State becomes APPROVED_FOR_COMMIT

# 8. Prepare the done package and commit
#    (in the worktree, stage your files and create done-package.md)
pairflow bubble commit --id feat_login --repo /path/to/myapp
#    → State becomes DONE
```

### Scenario 2: Agent asks a question (human intervention)

Sometimes an agent needs clarification. This pauses the flow until you respond.

```bash
# Agent hits an ambiguity and asks you
pairflow ask-human --question "Should password validation happen server-side too, or client-only?"
#    → State becomes WAITING_HUMAN

# You can see pending questions in the inbox
pairflow bubble inbox --id feat_login --repo /path/to/myapp

# You answer
pairflow bubble reply --id feat_login --repo /path/to/myapp \
  --message "Both. Add server-side validation in the /auth/login endpoint too."
#    → State goes back to RUNNING
#    → Agent continues with your answer
```

You can also attach file references to your reply for context:

```bash
pairflow bubble reply --id feat_login --repo /path/to/myapp \
  --message "Follow this pattern" --ref src/auth/existing-validator.ts
```

### Scenario 3: Rejecting and requesting rework

If the converged result isn't good enough, you can send it back.

```bash
# Reviewer converged, but you disagree after reviewing
pairflow bubble request-rework --id feat_login --repo /path/to/myapp \
  --message "The validation logic doesn't handle unicode emails. Fix that first."
#    → State goes back to RUNNING
#    → Agents resume the iteration cycle
```

The agents will do another round, and the reviewer can converge again when ready.

### Scenario 4: Running multiple bubbles in parallel

Each bubble is fully isolated — different worktree, different tmux session, different state.

```bash
# Create three bubbles for three different tasks
pairflow bubble create --id feat_login --repo . --base main --task "Login form"
pairflow bubble create --id fix_nav   --repo . --base main --task "Fix navbar responsive bug"
pairflow bubble create --id refactor  --repo . --base main --task "Extract auth middleware"

# Start them all
pairflow bubble start --id feat_login --repo .
pairflow bubble start --id fix_nav    --repo .
pairflow bubble start --id refactor   --repo .

# See all bubbles at a glance
pairflow bubble list --repo . --json
```

Each bubble runs in its own tmux session. Use `tmux attach -t pf-feat_login` to switch between them.

### Scenario 5: Monitoring and checking status

```bash
# Quick status of a specific bubble
pairflow bubble status --id feat_login --repo . --json

# List all bubbles with their states
pairflow bubble list --repo .

# Check inbox for pending human actions across a bubble
pairflow bubble inbox --id feat_login --repo .

# Open the bubble's worktree in your editor
pairflow bubble open --id feat_login --repo .
```

### Scenario 6: Crash recovery and restart

If your machine reboots, tmux dies, or something goes wrong:

```bash
# Clean up stale sessions first
pairflow bubble reconcile --repo . --dry-run   # preview what would be cleaned
pairflow bubble reconcile --repo .              # actually clean up

# Restart the bubble — reattaches to existing state, no data loss
pairflow bubble start --id feat_login --repo .
```

The restart is safe because:
- State is persisted in `state.json` (not in tmux)
- Transcript is append-only and survives crashes
- Worktree is preserved on disk
- `bubble start` detects an existing bubble in a runtime state and reattaches instead of bootstrapping from scratch

### Scenario 7: Stopping or cancelling a bubble

```bash
# Graceful stop — kills tmux, sets state to CANCELLED
pairflow bubble stop --id feat_login --repo .
```

### Scenario 8: Using a PRD or design doc as input

For larger features, write a detailed spec and pass it as the task file:

```bash
# Write your PRD/spec to a markdown file
cat > /tmp/login-prd.md << 'EOF'
# Login Feature PRD

## Goal
Implement email/password authentication with the following requirements:
- Client-side validation (email format, password min 8 chars)
- Server-side validation in /auth/login endpoint
- Rate limiting: max 5 attempts per IP per minute
- JWT token response with 24h expiry

## Acceptance criteria
1. Login form renders with email and password fields
2. Client shows inline errors for invalid input
3. Server returns 401 with descriptive error for bad credentials
4. Server returns 429 after rate limit exceeded
5. Successful login returns JWT in response body
EOF

pairflow bubble create --id feat_login \
  --repo /path/to/myapp --base main \
  --task-file /tmp/login-prd.md
```

The task content is stored in `.pairflow/bubbles/<id>/artifacts/task.md` and included in the initial `TASK` protocol message that the implementer receives.

---

## How the evaluation works during the flow

### Protocol transcript

Every action is recorded as an NDJSON envelope in the transcript file. This is the source of truth.

| Message type | Who sends it | When |
|---|---|---|
| `TASK` | Orchestrator | At bubble creation |
| `PASS` | Agent → Agent | Handoff between implementer and reviewer |
| `HUMAN_QUESTION` | Agent → Human | `ask-human` call |
| `HUMAN_REPLY` | Human → Agent | `bubble reply` |
| `CONVERGENCE` | Reviewer → Orchestrator | `converged` call |
| `APPROVAL_REQUEST` | Orchestrator → Human | After convergence |
| `APPROVAL_DECISION` | Human → Orchestrator | `approve` or `request-rework` |
| `DONE_PACKAGE` | Orchestrator | At commit |

### Convergence policy

The reviewer can only call `converged` when specific conditions are met:

1. The active role must be `reviewer`
2. At least 2 rounds of implementer↔reviewer exchange must have happened
3. The reviewer's last review must not contain P0/P1 severity findings
4. No unanswered `HUMAN_QUESTION` may be pending

This prevents premature convergence — the agents must actually iterate.

### Rounds

Each time the reviewer sends a `PASS` back to the implementer, a new **round** starts. The round counter tracks how many iteration cycles have occurred. You can see the current round in `bubble status`.

### Watchdog

The status pane runs a watchdog loop. If an agent hasn't produced a protocol message within the configured timeout, the watchdog escalates the bubble to `WAITING_HUMAN` so you know something is stuck.

---

## State machine

```
CREATED ─→ PREPARING_WORKSPACE ─→ RUNNING ←──────────────────┐
                                     │                         │
                              ask-human│              reply / rework
                                     ▼                         │
                              WAITING_HUMAN ──── reply ────→ RUNNING
                                                               │
                                                        converged
                                                               ▼
                                                    READY_FOR_APPROVAL
                                                        │         │
                                                  approve    request-rework
                                                        ▼         │
                                               APPROVED_FOR_COMMIT │
                                                        │         │
                                                     commit       └──→ RUNNING
                                                        ▼
                                                    COMMITTED ─→ DONE

Any active state ─→ FAILED
Any non-final state ─→ CANCELLED (via bubble stop)
```

---

## CLI command reference

### Bubble management (human-facing)

| Command | Description |
|---------|-------------|
| `bubble create --id <id> --repo <path> --base <branch> (--task <text> \| --task-file <path>)` | Initialize a new bubble |
| `bubble start --id <id> [--repo <path>]` | Start or restart a bubble (worktree + tmux) |
| `bubble stop --id <id> [--repo <path>]` | Stop and cancel a bubble |
| `bubble resume --id <id> [--repo <path>]` | Resume from WAITING_HUMAN with default reply |
| `bubble open --id <id> [--repo <path>]` | Open worktree in editor |
| `bubble status --id <id> [--repo <path>] [--json]` | Show current state |
| `bubble list [--repo <path>] [--json]` | List all bubbles |
| `bubble inbox --id <id> [--repo <path>] [--json]` | Show pending human actions |
| `bubble reply --id <id> --message <text> [--repo <path>] [--ref <path>]...` | Answer a human question |
| `bubble approve --id <id> [--repo <path>] [--ref <path>]...` | Approve for commit |
| `bubble request-rework --id <id> --message <text> [--repo <path>] [--ref <path>]...` | Send back for rework |
| `bubble commit --id <id> [--repo <path>] [--message <text>] [--ref <path>]...` | Commit and finalize |
| `bubble reconcile [--repo <path>] [--dry-run] [--json]` | Clean up stale sessions |
| `bubble watchdog --id <id> [--repo <path>] [--json]` | Check for stuck agents |

### Agent-facing commands (auto-detected from CWD)

These commands don't require `--id` or `--repo` — they detect the bubble from the current working directory (the worktree).

| Command | Description |
|---------|-------------|
| `pass --summary <text> [--ref <path>]... [--intent <task\|review\|fix_request>]` | Hand off to the other agent |
| `ask-human --question <text> [--ref <path>]...` | Ask the human a question |
| `converged --summary <text> [--ref <path>]...` | Signal convergence (reviewer only) |

Aliases: `pairflow agent pass/ask-human/converged` or `orchestra pass/ask-human/converged`

---

## File structure

```
<repo>/
  .pairflow/
    bubbles/<id>/
      bubble.toml          # Bubble configuration (agents, commands, timeouts)
      state.json           # Current lifecycle state
      transcript.ndjson    # Append-only protocol log (source of truth)
      inbox.ndjson         # Pending human actions (questions + approvals)
      artifacts/
        task.md            # Original task description
        done-package.md    # Required before commit
    runtime/
      sessions.json        # Active tmux session registry
    locks/
      <id>.lock            # Per-bubble file lock

<repo-parent>/.pairflow-worktrees/<repo-name>/<bubble-id>/
  # Git worktree — agents work here, isolated from main repo
```

## What is NOT in scope

- This is **not** a web UI (Phase 3 will add a thin UI layer)
- This is **not** an autonomous agent framework — agents must explicitly call protocol commands
- `bubble start` does **not** send PASS/ASK/CONVERGED messages by itself — it only sets up the runtime environment

---

## Troubleshooting

### `zsh: no such file or directory: node /.../index.js`

In zsh, store the command as an array, not a string:

```bash
PF=(node /path/to/pairflow/dist/cli/index.js)
"${PF[@]}" bubble list --help
```

### `pairflow` command not found in tmux pane

The status pane runs `pairflow` commands. In dev mode, link it globally:

```bash
cd /path/to/pairflow && pnpm link --global
```

### Bubble won't start — stale session

```bash
pairflow bubble reconcile --repo <repo>
pairflow bubble start --id <id> --repo <repo>
```

### No automatic agent communication

This is expected. The flow advances through explicit protocol commands (`pass`, `ask-human`, `converged`). Pairflow is the orchestrator, not the driver.

---

## Development

```bash
pnpm lint       # ESLint
pnpm typecheck  # TypeScript
pnpm test       # Vitest
pnpm check      # All of the above
```

## Roadmap

**Phase 3 — Thin UI:**
- Bubble list with state badges
- Timeline view
- Inbox panel
- Diff / changed files view
