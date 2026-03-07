# Pairflow

Pairflow is a **CLI-first orchestrator** for local git repositories, built around **bubbles** (isolated units of work with their own worktree, tmux session, state machine, and transcript). It runs an implementer/reviewer iteration loop with human gates and append-only protocol history.

**The core idea:** you define a task, Pairflow creates an isolated workspace (git worktree + tmux session), and two AI agents — an implementer and a reviewer — iterate on the solution. You stay in control through explicit approval gates and can intervene at any point.

Pairflow also provides a unified web UI to oversee all active bubbles in one place, then quickly drill into a specific bubble by opening its worktree in your editor (`pairflow bubble open`) or attaching to its tmux session (`pairflow bubble attach`).

## Why Pairflow

Pairflow started as a practical experiment in **delegation-first engineering**: push as much implementation work as possible to AI agents, while keeping quality gates explicit and human-controlled.

Two concrete triggers led to building it:

1. **Single-model reliability was not enough**
- In practice, using one model alone was not consistently reliable.
- A ping-pong loop between different models (implementer + reviewer) produced better outcomes.
- Manual handoff between agents worked, but became slow and error-prone across multiple parallel tasks.
- Pairflow automates this handoff loop with a strict protocol and state machine.

2. **Parallel work lacked visibility**
- Across multiple repositories and active agent sessions, it was easy to lose track of what was in progress.
- Pairflow provides one visual control surface (CLI + web UI) to see active work, status, and next required human action.

## Design Principles

1. **Agent-first architecture**
- The primary “user” of Pairflow is the coding agent itself.
- Interfaces and workflows are designed so agents can drive the system directly and reliably.

2. **Deterministic orchestration over non-deterministic agents**
- Pairflow keeps lifecycle control deterministic (states, transitions, gates), while implementation/review remains LLM-driven.
- The state machine is the primary source of truth: every lifecycle step is state-bound, with no implicit workflow jumps.
- We prioritize robustness over raw speed: slower but consistent and recoverable flow is preferred over fragile automation.
- Handoffs are explicit and evidence-aware (`summary` + `ref` attachments), so decisions stay inspectable instead of implicit.
- The protocol trail (transcript, inbox, state, archive) is designed for post-hoc audit and recovery.

3. **Use real coding agents, not reimplemented agent runtimes**
- Pairflow does not build a replacement coding agent runtime on top of SDK abstractions.
- It intentionally leverages real coding agents (for example, Claude Code and Codex) with their native strengths.
- Pairflow is the orchestration layer around them.

4. **Tmux as the execution substrate**
- Runtime execution is tmux-based because it is both human- and agent-friendly.
- Sessions/panes are easy to inspect, capture, and replay.
- Manual intervention is always possible by attaching directly to running sessions.

5. **Operator control and graceful intervention**
- The system is not black-box automation.
- The operator can take over quickly when ambiguity, edge cases, or failures happen.
- Automation is there to reduce coordination overhead, not to remove human control.

## Start Here (New Developer Path)

If you are new to Pairflow, read in this order:

1. [Key concepts](#key-concepts)
2. [Prerequisites](#prerequisites)
3. [Installation](#installation)
4. [Quick start (5 minutes)](#quick-start-5-minutes)
5. [Daily workflow cheat sheet](#daily-workflow-cheat-sheet)

Then use:
1. [How we use Pairflow in practice (agent + UI first)](#how-we-use-pairflow-in-practice-agent--ui-first)
2. [API & CLI reference](#api--cli-reference)

Historical note: [`docs/pairflow-initial-design.md`](./docs/pairflow-initial-design.md) is the original MVP baseline spec (implemented), kept for traceability.

## Key concepts

### What is a bubble?

A **bubble** is an isolated unit of work. Each bubble gets:

- Its own **git worktree** (separate from your main repo)
- Its own **tmux session** with 3 panes (status, implementer agent, reviewer agent)
- Its own **state machine** tracking the lifecycle
- Its own **NDJSON transcript** recording every protocol message

Bubbles are fully isolated from each other — you can run multiple bubbles in parallel on the same repo.

### How does the flow work?

Pairflow does **not** autonomously decide technical content between agents. Instead, agents advance the flow through protocol commands (`pass`, `ask-human`, `converged`). Pairflow acts as the referee + state/protocol engine, injects an initial protocol briefing into agent panes at bubble start, and auto-sends an initial kickoff prompt to the implementer pane.

```
┌──────────┐    pass     ┌──────────┐    pass     ┌──────────┐          ┌──────────┐
│Implementer│ ────────→  │ Reviewer  │ ────────→  │Implementer│ ··· ──→ │ Reviewer  │
└──────────┘             └──────────┘             └──────────┘          └──────────┘
     ▲                                                                       │
     │                                                            converged  │
     │                        ┌──────────────────────────────────────────────┘
     │                        ▼
     │                   ┌────────────────┐
     │                   │ Human approval │
     │                   └───────┬────────┘
     │                           │
     │              ┌────────────┴────────────┐
     │              ▼                         ▼
     │    ┌─────────────────────┐      ┌──────────────────┐
     └────┤ 1) Send back rework │      │ 2) Approve       │
          │ bubble request-     │      │ bubble approve   │
          │ rework --message    │      │                  │
          └─────────────────────┘      └────────┬─────────┘
                                                │
                                                ▼
                                          ┌──────────┐
                                          │ Commit   │
                                          │ & Done   │
                                          └──────────┘
```

At any point, agents can call `ask-human` to pause the flow and ask for your input.

### Roles

| Role | Default agent | What it does |
|------|---------------|--------------|
| **Implementer** | `codex` | Writes code based on the task description |
| **Reviewer** | `claude` | Reviews the implementation, requests fixes or converges |
| **Human** (you) | — | Answers questions, approves or sends back rework, commits |

## Prerequisites

- Node.js `>= 22`
- `pnpm` (`packageManager: pnpm@10.8.1`)
- `git`
- `tmux`

Optional but recommended:

- `cursor` (default editor for `bubble open`)
- `codex` and `claude` binaries in PATH (for tmux agent panes)
- One of these macOS terminals for `bubble attach`: [iTerm2](https://iterm2.com/), [Ghostty](https://ghostty.org/), [Warp](https://www.warp.dev/), or Terminal.app (`auto` mode falls back to `copy` when no GUI launcher is available)

## Containerized Development (No Local Node/pnpm)

If you want to contribute without installing Node.js/pnpm on the host:

```bash
# Run full CI checks in a container
docker build --target ci -t pairflow-ci .

# Open an interactive development shell
docker build --target dev -t pairflow-dev .
docker run --rm -it -v "$PWD":/workspace -w /workspace pairflow-dev bash
```

For VS Code/Codespaces, use `.devcontainer/devcontainer.json` ("Reopen in Container").

Important: for full Pairflow runtime operations (`bubble attach`, `bubble open`, host terminal/editor integration), host-native installation is still the recommended path.

## Installation (Core CLI + optional Pairflow skills)

### 1) Install core Pairflow CLI

```bash
git clone https://github.com/felho/pairflow.git && cd pairflow
./scripts/install.sh
```

The installer checks prerequisites, installs dependencies, builds, links `pairflow` globally, and runs a smoke test. See [INSTALL.md](./INSTALL.md) for details.

After installation, you can configure both:
- terminal launcher for `bubble attach` (see [Attach launcher selection (macOS)](#attach-launcher-selection-macos))
- editor command for `bubble open` (see [Open command selection (`bubble open`)](#open-command-selection-bubble-open))

### 2) (Optional) Install Pairflow skills for your coding agent

Recommended if you operate Pairflow via Claude Code or Codex:

1. Open this file in your coding-agent chat:
   - `.claude/skills/INSTALL.md`
2. Ask the agent to run it (for example: "run this install workflow").
3. Pass install params as needed:
   - `--skills all|UsePairflow|CreatePairflowSpec`
   - `--target-dir .claude|.codex`
   - `--link-other true|false` (optional cross-agent symlink)
4. This installs/updates selected skills under `~/.claude/skills/` or `~/.codex/skills/`.

Development mode (zsh-safe, no global install):

```bash
PF=(node /path/to/pairflow/dist/cli/index.js)
"${PF[@]}" bubble list --help
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

## How we use Pairflow in practice (agent + UI first)

### Pairflow is used primarily through

1. Your coding agent (for example, Codex or Claude Code), which runs Pairflow CLI commands in the background
2. The web UI (operational overview + human decision points)

The CLI is still the protocol/API surface, but day-to-day usage is typically agent-driven. In current usage, bubble creation/start is usually initiated by the coding agent via CLI, while the UI is used mainly for visibility and control.

### Typical practical workflow

1. **Discuss intent with your coding agent**
- You describe a bug/feature/plan change in chat.
- The agent helps shape scope and expected outcome.

2. **Choose the entry mode by change size**
- For small/trivial changes, start an implementation bubble directly with inline task text.
- For substantial changes, first create a task file and run a dedicated docs-only task-file refinement bubble.

3. **If you used task-file refinement, review that artifact first**
- Ask for deep review mode and detailed explanation.
- Request rework if needed, then re-review until the task file is solid.

4. **Run implementation bubble**
- Start a new implementation bubble from the refined task file (or from inline task text for the trivial path).
- Implementer/reviewer loop runs in tmux-backed worktree context.

5. **Human-gated review and rework cycle**
- When the bubble is ready, ask your coding agent for a deep review summary.
- Ask questions, send rework back if needed, then re-review.

6. **Approve and let the agent handle closure**
- Once approved, ask the coding agent to handle the lifecycle end-to-end:
  `approve -> commit -> merge -> cleanup`.
- This minimizes manual git/session handling overhead.

7. **Use the UI + agent for anomaly handling**
- If something looks off (for example unusually high round count or repetitive findings), ask your coding agent to inspect transcript/log quality and recommend action (targeted rework, stronger instruction, or controlled convergence guidance).

### One practical setup (how I use Pairflow)

- I usually run one VSCode window per active project and operate coding agents in integrated terminals.
- VSCode Source Control (Git) view provides a fast overview of active branches and changed files while bubbles run.
- This complements Pairflow: the UI shows lifecycle/protocol state, while Source Control shows actual code/doc deltas.
- During approval review, you can inspect diffs directly, ask clarifying questions, and issue immediate `request-rework` if output quality or intent alignment is off.

### Git pull/rebase policy (important with Pairflow)

Bubble lifecycle closes through merge commits and stateful cleanup (`approve -> commit -> merge`).  
Repository configs that auto-enable pull-rebase often create repeated conflict/rebase loops in this flow.

Not recommended for Pairflow operation:

- Global or repo-local `pull.rebase=true`
- `branch.main.rebase=true`
- Auto pull-rebase workflows as default behavior

Recommended repo-local baseline:

```bash
git config --local pull.rebase false
git config --local branch.main.rebase false
git config --local pull.ff only
```

Why this matters:

- Pairflow bubble merges are easier to reason about in merge-first mode.
- It avoids accidental rebase states during bubble close/reopen operations.
- It reduces repeated merge-conflict loops caused by implicit rebase pulls.

### Common real-world use cases

1. **Parallel delivery across repositories**
- Keep multiple bubbles active at once, while the UI provides one consolidated view of states and next required human action.

2. **Task-file driven planning and implementation**
- Start with a task/plan refinement bubble (docs-only), then run a separate implementation bubble based on the refined task file.

3. **Human-gated quality loop**
- Let agents iterate autonomously, but enforce explicit human checkpoints before commit/merge.

4. **Failure recovery and intervention**
- When an agent stalls or watchdog escalates, inspect tmux pane output, resume with targeted human guidance, and continue the same bubble lifecycle.

For command-level details and full end-to-end CLI flows, see [API & CLI reference](#api--cli-reference).

---

## API & CLI reference

### Daily workflow cheat sheet

```bash
# Create + start
pairflow bubble create --id <id> --repo <repo> --base main --task "<task>"
pairflow bubble start --id <id> --repo <repo>

# Monitor
pairflow bubble status --id <id> --repo <repo> --json
pairflow bubble inbox --id <id> --repo <repo>
pairflow bubble list --repo <repo>

# Human decisions
pairflow bubble reply --id <id> --repo <repo> --message "<answer>"
pairflow bubble approve --id <id> --repo <repo>
pairflow bubble request-rework --id <id> --repo <repo> --message "<rework>"

# Finalize
pairflow bubble commit --id <id> --repo <repo> --auto
pairflow bubble merge --id <id> --repo <repo> --push --delete-remote
```

Agent-side commands from the bubble worktree:

```bash
pairflow pass --summary "<handoff>" [--ref ...] [--finding ... | --no-findings]
pairflow ask-human --question "<question>" [--ref ...]
pairflow converged --summary "<convergence summary>" [--ref ...]
```

---

### CLI scenarios (feature showcase)

These scenarios are detailed, command-centric walkthroughs intended to showcase the Pairflow feature set and CLI/API behavior.
For normal operation, prefer the agent + UI workflow described above.

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
- **Pane 1**: Implementer agent (codex) — receives auto protocol briefing + kickoff prompt
- **Pane 2**: Reviewer agent (claude) — receives auto protocol briefing

By default, reviewer context mode is **fresh**: when the implementer hands off (`PASS` to reviewer), Pairflow respawns the reviewer pane process so each review round starts from a clean session context.

```bash
# 3. Implementer finishes first pass, hands off to reviewer
#    (run FROM the worktree directory — bubble is auto-detected from CWD)
pairflow pass --summary "Login form implemented with email regex validation; validation run: lint/typecheck/test" \
  --ref .pairflow/evidence/lint.log \
  --ref .pairflow/evidence/typecheck.log \
  --ref .pairflow/evidence/test.log

# 4. Reviewer reviews and sends feedback back
pairflow pass --summary "Missing: password strength indicator, error messages not i18n-ready" \
  --finding "P1:Password strength indicator missing|artifact://review/password-strength-proof.md" \
  --finding "P2:i18n error keys missing"

# For blocker findings (P0/P1), prefer inline finding refs:
# --finding "P1:Title|ref1,ref2"
# If a single ref contains a comma, escape it as \, inside the --finding value.
# Strict rule: envelope-level --ref values are optional generic artifacts only;
# they do not satisfy blocker finding evidence binding.

# 5. Implementer fixes issues, hands off again
pairflow pass --summary "Added password strength meter and i18n error keys; reran lint/typecheck/test" \
  --ref .pairflow/evidence/lint.log \
  --ref .pairflow/evidence/typecheck.log \
  --ref .pairflow/evidence/test.log

# If only a subset of checks was intentionally run, attach refs for those
# commands and state skipped checks explicitly in the summary.

# 6. Reviewer is satisfied — signals convergence
pairflow converged --summary "All review criteria met, code is clean"
#    → State becomes READY_FOR_APPROVAL
#    → An approval request appears in your inbox

# 7. You review and approve
pairflow bubble approve --id feat_login --repo /path/to/myapp
#    → State becomes APPROVED_FOR_COMMIT

# 8. Commit
#    Fast path: auto-stage worktree changes + auto-generate done-package if missing
pairflow bubble commit --id feat_login --repo /path/to/myapp --auto
#    → State becomes DONE

#    Strict/manual path (if you prefer full manual control):
#    - stage files yourself
#    - write .pairflow/bubbles/<id>/artifacts/done-package.md
#    - run pairflow bubble commit without --auto

# 9. Merge + cleanup
#    Merge bubble branch into base branch and clean runtime/worktree artifacts.
#    Add --push/--delete-remote if you also want remote updates.
pairflow bubble merge --id feat_login --repo /path/to/myapp --push --delete-remote
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
#    → Implementer receives explicit rework notification and continues the next round
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

Each bubble runs in its own tmux session. Use `tmux attach -t pf-feat_login` to switch between them, or use the web UI for a visual overview of all bubbles across repos.

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

# Attach to the bubble's tmux session (uses configured launcher)
pairflow bubble attach --id feat_login --repo .
```

### Scenario 6: Using the web UI

The web UI provides a real-time canvas dashboard for monitoring and managing all bubbles across repos.

```bash
# Start the web UI (default: http://127.0.0.1:4173)
pairflow ui

# Serve bubbles from specific repos only
pairflow ui --repo /path/to/myapp --repo /path/to/other

# Custom host/port
pairflow ui --host 0.0.0.0 --port 8080
```

Managed local UI server commands (tmux-based, recommended for daily use):

```bash
pnpm ui:start
pnpm ui:status
pnpm ui:restart
pnpm ui:stop
```

These helpers run the UI in a dedicated tmux session (`pf-ui-server` by default), which is more stable than ad-hoc background processes.

The dashboard shows:
- **Bubble cards** on a draggable canvas — one card per bubble with state, round count, and active agent
- **Expandable detail view** — click a card to see its timeline, findings, and available actions
- **Action buttons** — Start, Approve, Reply, Commit, Merge, Attach, Stop — all available inline based on bubble state
- **Header status strip** — repo scope pills + SSE/polling connection status
- **Repo filter** — toggle visibility per repo when managing multiple repositories
- **Real-time updates** via SSE (Server-Sent Events) with automatic polling fallback

### Scenario 7: Crash recovery and restart

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

### Scenario 8: Stopping or cancelling a bubble

```bash
# Graceful stop — kills tmux, sets state to CANCELLED
pairflow bubble stop --id feat_login --repo .

# Delete a bubble (with confirmation gate when external artifacts exist)
pairflow bubble delete --id feat_login --repo .          # reports artifacts, may exit with code 2
pairflow bubble delete --id feat_login --repo . --force  # performs delete
```

Delete behavior notes:
- When external artifacts exist (worktree/tmux/branch), `bubble delete` requires explicit `--force`.
- Forced delete snapshots bubble metadata into the archive before removing active bubble artifacts.
- Archive root defaults to `~/.pairflow/archive` (override: `PAIRFLOW_ARCHIVE_ROOT`).

### Scenario 9: Using a PRD or design doc as input

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
Task files are also used to infer review guidance mode: `.md/.txt` are document-leaning, `.ts/.tsx/.js/.py` are code-leaning, otherwise Pairflow falls back to `auto`.

### Scenario 10: Generating a metrics report

```bash
# Full report for a date range (table output)
pairflow metrics report --from 2026-02-01 --to 2026-02-28

# Repo-filtered report
pairflow metrics report --from 2026-02-01 --to 2026-02-28 --repo /path/to/myapp

# JSON output (for ad-hoc analysis)
pairflow metrics report --from 2026-02-01 --to 2026-02-28 --format json
```

Notes:
- Date bounds accept `YYYY-MM-DD` or ISO UTC timestamps.
- Metrics shards are read from `~/.pairflow/metrics/events` by default (override: `PAIRFLOW_METRICS_EVENTS_ROOT`).
- Report includes archive context from `~/.pairflow/archive/index.json` (override: `PAIRFLOW_ARCHIVE_ROOT`).

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
3. The reviewer's last `PASS` must declare findings explicitly (`--finding` or `--no-findings`)
4. The reviewer's last review must not contain P0/P1 severity findings
5. Round-sensitive P2 gate:
   - Round 2-3: convergence is blocked if the last reviewer `PASS` contains P2 findings
   - Round 4+: convergence is allowed again (P0/P1 block still applies)
6. No unanswered `HUMAN_QUESTION` may be pending

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

### CLI command reference

#### Bubble management (human-facing)

| Command | Description |
|---------|-------------|
| `bubble create --id <id> --repo <path> --base <branch> (--task <text> \| --task-file <path>)` | Initialize a new bubble |
| `bubble start --id <id> [--repo <path>]` | Start or restart a bubble (worktree + tmux) |
| `bubble stop --id <id> [--repo <path>]` | Stop and cancel a bubble |
| `bubble delete --id <id> [--repo <path>] [--force]` | Delete a bubble; without `--force` it reports external artifacts and exits with confirmation-required status |
| `bubble resume --id <id> [--repo <path>]` | Resume from WAITING_HUMAN with default reply |
| `bubble open --id <id> [--repo <path>]` | Open worktree in editor |
| `bubble attach --id <id> [--repo <path>]` | Attach to bubble's tmux session via configured macOS launcher (`auto|warp|iterm2|terminal|ghostty|copy`) |
| `bubble status --id <id> [--repo <path>] [--json]` | Show current state |
| `bubble list [--repo <path>] [--json]` | List all bubbles |
| `bubble inbox --id <id> [--repo <path>] [--json]` | Show pending human actions |
| `bubble reply --id <id> --message <text> [--repo <path>] [--ref <path>]...` | Answer a human question |
| `bubble approve --id <id> [--repo <path>] [--ref <path>]...` | Approve for commit |
| `bubble request-rework --id <id> --message <text> [--repo <path>] [--ref <path>]...` | Send back for rework (`READY_FOR_APPROVAL`: immediate; `WAITING_HUMAN`: queues deferred deterministic rework intent) |
| `bubble commit --id <id> [--repo <path>] [--message <text>] [--ref <path>]...` | Commit and finalize |
| `bubble merge --id <id> [--repo <path>] [--push] [--delete-remote]` | Merge bubble branch and clean up |
| `bubble reconcile [--repo <path>] [--dry-run] [--json]` | Clean up stale sessions |
| `bubble watchdog --id <id> [--repo <path>] [--json]` | Check for stuck agents |

#### Repo registry

Manage a list of repositories for the web UI to aggregate bubbles across multiple repos.

| Command | Description |
|---------|-------------|
| `repo add <path> [--label <text>]` | Register a repo |
| `repo remove <path>` | Unregister a repo |
| `repo list [--json]` | List registered repos |

The registry is stored at `~/.pairflow/repos.json` (override with `PAIRFLOW_REPO_REGISTRY_PATH` env var). When `pairflow ui` is started without `--repo` flags, it loads bubbles from all registered repos.

#### Web UI

| Command | Description |
|---------|-------------|
| `ui [--repo <path>]... [--host <host>] [--port <port>]` | Start the web dashboard (default: `http://127.0.0.1:4173`) |

#### Metrics

| Command | Description |
|---------|-------------|
| `metrics report --from <date> --to <date> [--repo <path>] [--format table\|json]` | Generate loop-quality and throughput metrics from local event shards |

#### Agent-facing commands (auto-detected from CWD)

These commands don't require `--id` or `--repo` — they detect the bubble from the current working directory (the worktree).

| Command | Description |
|---------|-------------|
| `pass --summary <text> [--ref <path>]... [--intent <task\|review\|fix_request>] [--finding <P0\|P1\|P2\|P3:Title>]... [--no-findings]` | Hand off to the other agent (reviewer must declare findings explicitly) |
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

~/.pairflow/
  config.toml               # Global Pairflow user config (optional)
  metrics/events/YYYY/MM/
    events-YYYY-MM.ndjson  # Global metrics event shards
  archive/
    index.json              # Global archive index (deleted bubble metadata)
    <repo-key>/<bubble-instance-id>/
      bubble.toml
      state.json
      transcript.ndjson
      inbox.ndjson
      artifacts/task.md
```

Path overrides:
- `PAIRFLOW_METRICS_EVENTS_ROOT` overrides metrics shard root (`~/.pairflow/metrics/events`).
- `PAIRFLOW_ARCHIVE_ROOT` overrides archive root (`~/.pairflow/archive`).

### Local environment parity in worktrees

By default, `bubble start` mirrors selected local (non-git) files from the main repo into the bubble worktree so agent panes get the same local setup (MCP/editor/env files).

Default behavior:

- Enabled by default
- Mode: `symlink`
- Entries:
  - `.claude`
  - `.mcp.json`
  - `.env.local`
  - `.env.production`

This is controlled by `[local_overlay]` in `bubble.toml`:

```toml
[local_overlay]
enabled = true
mode = "symlink" # symlink|copy
entries = [".claude", ".mcp.json", ".env.local", ".env.production"]
```

Rules:

- Missing source entries are skipped silently.
- Existing files in worktree are never overwritten.
- Entries must be normalized relative paths (no absolute path, no `.`/`..` traversal).

### Attach launcher selection (macOS)

`bubble attach` resolves launcher with this priority:

1. `attach_launcher` in bubble `bubble.toml` (only when explicitly set)
2. `attach_launcher` in global `~/.pairflow/config.toml` (if set)
3. `"auto"` default

Bubble-level override in `bubble.toml`:

```toml
attach_launcher = "auto" # auto|warp|iterm2|terminal|ghostty|copy
```

Global default in `~/.pairflow/config.toml`:

```toml
attach_launcher = "iterm2" # auto|warp|iterm2|terminal|ghostty|copy
```

Behavior:

- `auto` probes GUI launchers in deterministic order: `iterm2 -> ghostty -> warp -> terminal`, then falls back to `copy`.
- Explicit GUI launchers (`warp|iterm2|terminal|ghostty`) do not silently switch to another GUI launcher.
- `copy` does not open a terminal app; it returns the tmux attach command.

### Open command selection (`bubble open`)

`bubble open` resolves editor launch command with this priority:

1. `open_command` in bubble `bubble.toml` (only when explicitly set)
2. `open_command` in global `~/.pairflow/config.toml` (if set)
3. Built-in default: `cursor {{worktree_path}}`

Global default in `~/.pairflow/config.toml`:

```toml
open_command = "code --reuse-window {{worktree_path}}"
```

Bubble-level override in `bubble.toml`:

```toml
open_command = "cursor --reuse-window {{worktree_path}}"
```

Rendering rules:

- If template contains `{{worktree_path}}`, all occurrences are replaced.
- If template has no placeholder, Pairflow appends shell-quoted worktree path.

## Advanced internals

### Archive scope on bubble delete

When you run `pairflow bubble delete`, Pairflow creates a **core archive snapshot** first, then removes the active bubble directory/worktree runtime artifacts.  
Important: this is **not** a full copy of the entire bubble directory/worktree.

Current snapshot scope:

```text
.pairflow/bubbles/<bubble-id>/
├── bubble.toml                    [archived]
├── state.json                     [archived]
├── transcript.ndjson              [archived]
├── inbox.ndjson                   [archived]
└── artifacts/
    ├── task.md                    [archived]
    ├── done-package.md            [not archived]
    ├── reviewer-test-verification.json [not archived]
    └── messages/                  [not archived]
```

Also **not archived**:

- worktree contents (`.pairflow-worktrees/...`)
- git branch/history metadata
- tmux/runtime session artifacts
- repo-level evidence logs (`.pairflow/evidence/*`)

Archive destination:

- `~/.pairflow/archive/<repo-key>/<bubble-instance-id>/`
- `~/.pairflow/archive/index.json` is updated with lifecycle metadata

### Reviewer ontology source (build vs runtime)

Pairflow assumes a local repository context during development/build where
`docs/reviewer-severity-ontology.md` is available.

Reviewer ontology reminder content is sourced as:

1. Canonical source markdown: full `docs/reviewer-severity-ontology.md`.
2. Runtime reminder subset block in that doc between:
   - `<!-- pairflow:runtime-reminder:start -->`
   - `<!-- pairflow:runtime-reminder:end -->`
3. Build/codegen step (`pnpm codegen:reviewer-ontology`) embeds both:
   - full canonical ontology markdown
   - runtime reminder text derived from the marker block
   into `src/core/runtime/reviewerSeverityOntology.generated.ts`.
4. Runtime prompt helper (`src/core/runtime/reviewerSeverityOntology.ts`)
   consumes generated constants, so runtime delivery does not require reading
   markdown files from disk.

When ontology policy text changes, run `pnpm codegen:reviewer-ontology` (or
`pnpm build`) to refresh the embedded module.

## What is NOT in scope

- This is **not** a fully autonomous agent framework — agents still must explicitly call protocol commands
- `bubble start` sets up runtime + injects protocol briefing, but does not auto-produce PASS/ASK/CONVERGED events

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

### Agent ignores protocol

Pairflow now injects startup protocol instructions into both agent panes, but agents must still call protocol commands explicitly. If they drift, use `bubble status`, `bubble inbox`, and watchdog escalation to recover, then continue via `pass` / `ask-human` / `converged`.

---

## Development

```bash
pnpm lint       # ESLint
pnpm typecheck  # TypeScript
pnpm test       # Vitest
pnpm check      # All of the above
pnpm dev:ui     # Rebuild CLI + restart web UI server on port 4173
```

Validation commands write evidence logs to `.pairflow/evidence/` (lint/typecheck/test), which can be attached in `pairflow pass --ref ...`.

## Roadmap

- Diff / changed files view in the web UI
- Inline inbox panel for human questions
- Notification system for state transitions
