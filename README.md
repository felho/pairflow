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
- Its own **tmux session** with 4 panes (status, implementer agent, reviewer agent, meta-reviewer agent)
- Its own **state machine** tracking the lifecycle
- Its own **NDJSON transcript** recording every protocol message

Bubbles are fully isolated from each other — you can run multiple bubbles in parallel on the same repo.

### How does the flow work?

Pairflow does **not** autonomously decide technical content between agents. Instead, agents advance the flow through canonical actor emits (`pairflow agent emit --kind pass|human_question|convergence`). Pairflow acts as the referee + state/protocol engine, injects an initial protocol briefing into agent panes at bubble start, and auto-sends an initial kickoff prompt to the implementer pane (or, for `--ideation` bubbles, a kickoff instruction to run `pairflow bubble kickoff` first).

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

At any point, agents can emit `human_question` to pause the flow and ask for your input.

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
docker run --rm -it \
  --mount type=bind,src="$PWD",target=/workspace \
  --mount type=volume,src=pairflow-node_modules,target=/workspace/node_modules \
  --mount type=volume,src=pairflow-ui-node_modules,target=/workspace/ui/node_modules \
  -w /workspace \
  pairflow-dev bash
```

For VS Code/Codespaces, use `.devcontainer/devcontainer.json` ("Reopen in Container").

Important for macOS/Linux mixed workflows:
1. Do not run container-side `pnpm install` against host-mounted `node_modules`.
2. Keep `node_modules` and `ui/node_modules` on container volumes (as above), otherwise Linux optional binaries can overwrite host-native dependencies.
3. If this already happened, repair on host with:

```bash
pnpm install --frozen-lockfile --force
pnpm --dir ui install --frozen-lockfile --force
```

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

### Skill quick routing (`$UsePairflow` vs `$CreatePairflowSpec`)

Use this split to avoid mixing lifecycle execution with specification writing:

| If your intent is... | Use this skill | Typical output |
|---|---|---|
| Start/create/intervene/review/close/recover a bubble | `$UsePairflow` | Lifecycle actions (`bubble ...`, `pass`, `converged`) |
| Create/refine PRD/Plan/Task docs (`L0/L1/L2`) | `$CreatePairflowSpec` | Spec artifact(s) in `plans/` / `docs/` |
| Docs-only task refinement before implementation | `$CreatePairflowSpec` first, then `$UsePairflow` | Refined task file, then bubble lifecycle |
| Bubble anomaly/debug (`WAITING_HUMAN`, watchdog, mismatch) | `$UsePairflow` | State-aware diagnosis and next command |

Boundary rules:
1. `$CreatePairflowSpec` is for artifact authoring/refinement, not runtime bubble execution.
2. `$UsePairflow` is for lifecycle/state handling, not direct implementation as the primary path in bubble-autonomous mode.
3. If work starts as unclear notes: use `$CreatePairflowSpec` first; when task is ready, switch to `$UsePairflow`.

Why this document structure exists:
1. We observed a recurring failure mode: as docs were refined, they accumulated more and more detail, which exposed even more missing detail, causing a near endless refinement loop.
2. The `L0/L1/L2` structure was introduced to stop that spiral by focusing on contract boundaries first, not implementation internals.
3. This is a divide-and-conquer strategy: make interfaces, required behavior, and acceptance contracts explicit, then let implementation details stay in implementation.
4. Goal: refine specs to a level where implementation failure risk is very low, without turning task docs into pseudo-code.
5. We present this as a practical system trait, not as a novelty or "innovation" claim.

Copy-paste prompt examples:

```text
$CreatePairflowSpec refine this task into strict L0/L1/L2 with explicit required-now vs later-hardening tags.
```

```text
$UsePairflow create and start a docs-only bubble from plans/tasks/my-task.md with review_artifact_type=document.
```

```text
$UsePairflow bubble is in WAITING_HUMAN; inspect status/inbox and route the correct next command.
```

```text
$UsePairflow close this bubble end-to-end: approve -> commit -> merge -> cleanup, then report residual risks.
```

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
  --review-artifact-type code \
  --task "Add a hello world function to index.ts"
pairflow bubble start --id my_first --repo "$TEST_REPO"

# Check status
pairflow bubble status --id my_first --repo "$TEST_REPO" --json
```

This opens a tmux session with 4 panes. The agents can now start working.

## Remote quick start

Remote bubbles use the same lifecycle, but execution happens in a remote clone over SSH.

1. Configure a remote host in `~/.pairflow/config.toml`:

```toml
[remotes.spark1]
host = "spark1"
repo_base = "~/repos"
pairflow_command = "pairflow"
pairflow_sync_command = "~/bin/pairflow-sync"
default_port_forwards = [3000, 5173]
```

2. Make sure the remote host can already run:

```bash
ssh spark1 "pairflow --version"
ssh spark1 "claude auth status"
ssh spark1 "codex --version"
```

3. Create and start a remote bubble:

```bash
pairflow bubble create --id remote_demo --repo "$TEST_REPO" --base main \
  --review-artifact-type code \
  --remote spark1 \
  --task "Run this change on the remote executor."
pairflow bubble start --id remote_demo --repo "$TEST_REPO"
```

4. Monitor and attach:

```bash
pairflow bubble status --id remote_demo --repo "$TEST_REPO" --json
pairflow bubble attach --id remote_demo --repo "$TEST_REPO"
pairflow bubble attach --id remote_demo --repo "$TEST_REPO" --port-forward 3000 --port-forward 5173
```

Important remote notes:
- `bubble create --remote <host>` only writes local control-plane state; nothing starts remotely until `bubble start`.
- `bubble attach` for remote bubbles uses the persisted started pointer, not local tmux.
- If a started remote bubble later reports runtime loss, treat that fail-closed. In this phase, do not assume `bubble start` or `bubble restart` reconstructs a started remote pointer on top of preserved state.
- For the full design and recovery model, see [docs/remote-bubble-execution.md](./docs/remote-bubble-execution.md).

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
# Choose one create variant, then run start

# Create (inline task)
pairflow bubble create --id <id> --repo <repo> --base main --review-artifact-type <document|code> --task "<task>"

# Create (task file)
pairflow bubble create --id <id> --repo <repo> --base main --review-artifact-type <document|code> --task-file <path>

# Create (taskless ideation)
pairflow bubble create --id <id> --repo <repo> --base main --review-artifact-type <document|code> --ideation

# Start
pairflow bubble start --id <id> --repo <repo>

# If this bubble was created with --ideation
pairflow bubble kickoff --id <id> --repo <repo> --task "<task>"
# or:
pairflow bubble kickoff --id <id> --repo <repo> --task-file <path>

# Monitor
pairflow bubble status --id <id> --repo <repo> --json
pairflow bubble inbox --id <id> --repo <repo>
pairflow bubble list --repo <repo>

# Human decisions
pairflow bubble reply --id <id> --repo <repo> --message "<answer>"
pairflow bubble approve --id <id> --repo <repo>
pairflow bubble request-rework --id <id> --repo <repo> --message "<rework>"

# Finalize
pairflow bubble commit --id <id> --repo <repo> --stage-all
# If an already-approved bubble has no remaining worktree diff but still needs
# lifecycle finalization, use an explicit empty finalize commit:
pairflow bubble commit --id <id> --repo <repo> --force
pairflow bubble merge --id <id> --repo <repo> --push --delete-remote [--json]
```

For local bubbles, `--push` / `--delete-remote` remain optional closeout flags. For started-remote bubbles, run the same merge command from the laptop/local repo, but the durable merge completes in that local repo from the remote handoff and those flags are rejected on that route.

Agent-side commands from the bubble worktree:

```bash
pairflow agent emit --kind pass --repo /path/to/repo --bubble-id <id> --handoff-id <handoff-id> --execution-id <execution-id> --summary "<handoff>" [--ref ...] [--finding ... | --no-findings]
pairflow agent emit --kind human_question --repo /path/to/repo --bubble-id <id> --handoff-id <handoff-id> --execution-id <execution-id> --question "<question>" [--ref ...]
pairflow agent emit --kind convergence --repo /path/to/repo --bubble-id <id> --handoff-id <handoff-id> --execution-id <execution-id> --summary "<convergence summary>" [--ref ...]
```

Direct `pairflow agent emit` requires the active authority snapshot. Resolve it first with `pairflow bubble status --id <id> --repo /path/to/repo --json` and copy both `executionContext.handoffId` and `executionContext.executionId` from the JSON output. If no current handoff is available yet, refresh status and wait for the orchestrated handoff instead of guessing context.

### Extract selected ideation artifacts

`pairflow bubble extract` copies explicitly selected documentation artifacts from
an ideation bubble into the target repository without running the normal bubble
close lifecycle.

```bash
pairflow bubble extract --id <id> --path <artifact-path> [--path <artifact-path>]... [--repo <path>] [--json]
pairflow bubble extract --id <id> --path <artifact-path> [--path <artifact-path>]... [--repo <path>] --commit [--message "<text>"] [--json]
```

Use `--path` once per selected file. Each path is repo-relative and v1 accepts
only files under `plans/**`, `docs/**`, or `progress/**`. Globs, directories,
overwrite/replace, product source extraction, and inferred "all changed files"
selection are not supported.

Current CLI help uses a compact repeat marker for the second `--path` value;
the operator contract remains repeated `--path` flags. Help text normalization is
left to a follow-up runtime/read-model task because this slice does not change
extract source behavior.

`--repo` selects the target repository when supplied; otherwise Pairflow resolves
the target from cwd ancestry. The resolved target must match the source bubble
metadata, be on a clean `main` checkout, and have no merge, rebase, or
cherry-pick operation in progress. Missing, unsafe, conflicting, dirty,
non-main, or mismatched inputs fail closed before copy, stage, or commit
whenever that guard can run before side effects.

Without `--commit`, default text output reports the bubble id and copied selected
path count. With `--commit`, text output also reports the commit SHA and
effective commit message. Use `--json` when you need the structured result,
including `selectedPaths`, `copiedPaths`, `stagedPaths`, `commitSha`, and
`commitMessage` when those fields apply.

Extract does not approve, commit, merge, delete, close, or clean up the source
bubble. After inspecting the extracted files, use the normal lifecycle commands
separately when you want to close or remove the source bubble.

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
  --review-artifact-type code \
  --task "Implement email/password login form with client-side validation"

# You can also use a file for complex task descriptions:
pairflow bubble create --id feat_login \
  --repo /path/to/myapp --base main \
  --review-artifact-type document \
  --task-file ./tasks/login-spec.md

# 2. Start the bubble (creates worktree + tmux session)
pairflow bubble start --id feat_login --repo /path/to/myapp
```

At this point, a tmux session `pf-feat_login` opens with:
- **Pane 0**: Status loop (auto-refreshes state + watchdog)
- **Pane 1**: Implementer agent (codex) — receives auto protocol briefing + kickoff prompt
- **Pane 2**: Reviewer agent (claude) — receives auto protocol briefing
- **Pane 3**: Meta-reviewer agent (codex) — used by autonomous meta-review gate runs

By default, reviewer context mode is **fresh**: when the implementer hands off (`PASS` to reviewer), Pairflow respawns the reviewer pane process so each review round starts from a clean session context.

```bash
# 3. Implementer finishes first pass, hands off to reviewer
pairflow bubble status --id feat_login --repo /path/to/myapp --json
#    → copy executionContext.handoffId and executionContext.executionId from the JSON output

pairflow agent emit --kind pass --repo /path/to/myapp --bubble-id feat_login --handoff-id <handoff-id> --execution-id <execution-id> \
  --summary "Login form implemented with email regex validation; PASS validation run: lint/typecheck/fitness plus targeted tests" \
  --ref .pairflow/evidence/lint.log \
  --ref .pairflow/evidence/typecheck.log \
  --ref .pairflow/evidence/fitness-report.json

# 4. Reviewer reviews and sends feedback back
pairflow bubble status --id feat_login --repo /path/to/myapp --json
#    → refresh executionContext.handoffId and executionContext.executionId; do this before every direct agent emit

pairflow agent emit --kind pass --repo /path/to/myapp --bubble-id feat_login --handoff-id <handoff-id> --execution-id <execution-id> \
  --summary "Missing: password strength indicator, error messages not i18n-ready" \
  --finding "P1:Password strength indicator missing|artifact://review/password-strength-proof.md" \
  --finding "P2:i18n error keys missing"

# For blocker findings (P0/P1), prefer inline finding refs:
# --finding "P1:Title|ref1,ref2"
# If a single ref contains a comma, escape it as \, inside the --finding value.
# Strict rule: envelope-level --ref values are optional generic artifacts only;
# they do not satisfy blocker finding evidence binding.

# 5. Implementer fixes issues, hands off again
pairflow bubble status --id feat_login --repo /path/to/myapp --json
#    → refresh executionContext.handoffId and executionContext.executionId again; the previous handoff changed authority

pairflow agent emit --kind pass --repo /path/to/myapp --bubble-id feat_login --handoff-id <handoff-id> --execution-id <execution-id> \
  --summary "Added password strength meter and i18n error keys; reran lint/typecheck/test" \
  --ref .pairflow/evidence/lint.log \
  --ref .pairflow/evidence/typecheck.log \
  --ref .pairflow/evidence/test.log

# If only a subset of checks was intentionally run, attach refs for those
# commands and state skipped checks explicitly in the summary.

# 6. Reviewer is satisfied — signals convergence
pairflow bubble status --id feat_login --repo /path/to/myapp --json
#    → refresh executionContext.handoffId and executionContext.executionId again before convergence

pairflow agent emit --kind convergence --repo /path/to/myapp --bubble-id feat_login --handoff-id <handoff-id> --execution-id <execution-id> \
  --summary "All review criteria met, code is clean"
#    → State remains RUNNING while autonomous meta-review authority completes
#    → An approval request appears in your inbox

# 7. You review and approve
pairflow bubble approve --id feat_login --repo /path/to/myapp
#    → State becomes APPROVED_FOR_COMMIT

# 8. Commit
#    Fast path: stage all worktree changes before committing
pairflow bubble commit --id feat_login --repo /path/to/myapp --stage-all
#    → State becomes DONE

#    Recovery path: when approved work was already merged elsewhere and the
#    bubble has no remaining diff, create an explicit empty finalize commit:
pairflow bubble commit --id feat_login --repo /path/to/myapp --force

#    Strict/manual path (if you prefer full manual control):
#    - stage files yourself
#    - run pairflow bubble commit without --stage-all

# 9. Merge + cleanup
#    Merge bubble branch into base branch and clean runtime/worktree artifacts.
#    Add --push/--delete-remote only on the local route if you also want origin updates.
pairflow bubble merge --id feat_login --repo /path/to/myapp --push --delete-remote
```

### Scenario 2: Agent asks a question (human intervention)

Sometimes an agent needs clarification. This pauses the flow until you respond.

```bash
# Agent hits an ambiguity and asks you
pairflow bubble status --id feat_login --repo /path/to/myapp --json
#    → refresh executionContext.handoffId and executionContext.executionId before direct human_question emit
#    → after a bubble restart/recovery, refresh again; implementer authority
#      advances to a new `attempt`, and the pre-restart handoff becomes stale

pairflow agent emit --kind human_question --repo /path/to/myapp --bubble-id feat_login --handoff-id <handoff-id> --execution-id <execution-id> \
  --question "Should password validation happen server-side too, or client-only?"
#    → State becomes WAITING_HUMAN

# You can see pending questions in the inbox
pairflow bubble inbox --id feat_login --repo /path/to/myapp

# You answer
pairflow bubble reply --id feat_login --repo /path/to/myapp \
  --message "Both. Add server-side validation in the /auth/login endpoint too."
#    → State goes back to RUNNING
#    → Agent continues with your answer
#    → any later direct `pairflow agent emit` must fetch a fresh status snapshot first
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
pairflow bubble create --id feat_login --repo . --base main --review-artifact-type code --task "Login form"
pairflow bubble create --id fix_nav   --repo . --base main --review-artifact-type code --task "Fix navbar responsive bug"
pairflow bubble create --id refactor  --repo . --base main --review-artifact-type code --task "Extract auth middleware"

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

# Attach locally via tmux, or remotely via the persisted started pointer
pairflow bubble attach --id feat_login --repo .

# Override remote port forwards for this attach only
pairflow bubble attach --id feat_login --repo . --port-forward 3000 --port-forward 5173
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

### Scenario 7: Local crash recovery and restart

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
- Resume start injects bounded transcript/state context into both agent panes; in `RUNNING` it sends kickoff to the currently active role pane

If the bubble stays in `RUNNING` with active meta-review authority after restart (for example, autonomous meta-review already persisted snapshot data but routing did not finish), inspect the canonical status snapshot and restart the runtime rather than relying on a separate meta-review recovery command:

```bash
pairflow bubble status --id feat_login --repo . --json
pairflow bubble restart --id feat_login --repo .
```

`bubble status --json` shows the active authority snapshot plus non-authority meta-review diagnostics. If routing still has not completed, use `bubble restart` or continue the active workflow; there is no public `bubble meta-review recover` subcommand.

Remote exception: for remote bubbles, this restart guidance does not extend to a started remote pointer after remote runtime loss. Use `pairflow bubble status --id <id> --repo . --json` or `pairflow bubble list --refresh` to confirm whether persisted state remains while the live runtime is missing. In this phase, Pairflow surfaces that condition fail-closed and does not treat `pairflow bubble start --id <id>` as the supported restart contract on top of preserved remote state.

### Scenario 8: Stopping or cancelling a bubble

```bash
# Graceful stop — kills tmux, sets state to CANCELLED
pairflow bubble stop --id feat_login --repo .

# Delete a bubble (with confirmation gate when external artifacts exist)
pairflow bubble delete --id feat_login --repo .                 # reports artifacts, may exit with code 2
pairflow bubble delete --id feat_login --repo . --force         # performs delete
pairflow bubble delete --id feat_login --repo . --json          # prints structured result
pairflow bubble delete --id feat_login --repo . --force --json  # force-delete with structured result
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
  --review-artifact-type document \
  --task-file /tmp/login-prd.md
```

The task content is stored in `.pairflow/bubbles/<id>/artifacts/task.md` and included in the initial `TASK` protocol message that the implementer receives.
Review ownership is explicit at create time via `--review-artifact-type <document|code>`.

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

### Scenario 11: Watching a local plan for approval-ready bubbles

`pairflow plan watch` runs in the local control plane and polls a plan for linked
document or implementation bubbles that have reached `READY_FOR_HUMAN_APPROVAL`
or the legacy-compatible `READY_FOR_APPROVAL` state. When it finds eligible
trigger evidence, it invokes the configured local runner for `ExecutePairflowPlan`;
the watcher does not compute routes, approve bubbles, or mutate lifecycle state.
The supported V1 automation path selects the built-in Codex backend from
`pairflow.toml`:

```toml
[plan_watch.runner]
backend = "codex"
```

```bash
# One foreground watch process with the default 60 second interval
pairflow plan watch plans/my-plan.md \
  --repo /path/to/repo

# Single iteration for cron, smoke checks, or operator diagnostics
pairflow plan watch plans/my-plan.md \
  --repo /path/to/repo \
  --once

# Explicitly nudge plan continuation even when no linked bubble trigger exists
pairflow plan watch plans/my-plan.md \
  --repo /path/to/repo \
  --once \
  --run-now

# Re-run an explicit nudge even when the same run-now evidence is already in the ledger
pairflow plan watch plans/my-plan.md \
  --repo /path/to/repo \
  --once \
  --run-now \
  --force-run

# Re-run an explicit nudge and print normalized runner timeline rows live
pairflow plan watch plans/my-plan.md \
  --repo /path/to/repo \
  --once \
  --run-now \
  --force-run \
  --follow-runner

# Discover trigger evidence and record a dry-run ledger observation only
pairflow plan watch plans/my-plan.md \
  --repo /path/to/repo \
  --once \
  --dry-run

# Faster polling for a local pilot
pairflow plan watch plans/my-plan.md \
  --repo /path/to/repo \
  --interval-seconds 10
```

Runner configuration:
- `[plan_watch.runner] backend = "codex"` selects Pairflow's built-in local
  Codex runner for non-dry-run invocations.
- The built-in runner invokes `codex --dangerously-bypass-approvals-and-sandbox
  exec --json --cd <repo-path> --output-schema <schema-file> ...` with an argv
  array. The continuation payload is embedded as JSON string-literal data in the
  prompt; trigger strings are explicitly treated as untrusted data, not
  instructions. This is trusted local operator execution.
- Each built-in Codex runner attempt writes artifacts under
  `.pairflow/runtime/plan-watch/agent-runner/<YYYY-MM-DD>_<HH-mm-ss>_<plan-slug>_<invocation-id>/`:
  `metadata.json`, raw Codex `events.ndjson`, normalized Pairflow
  `timeline.ndjson`, and the output schema file. The directory name uses the
  local machine date and time for operator-friendly discovery; `metadata.json`
  keeps `startedAt` as ISO UTC for canonical ordering. Completed ledger records
  carry an `artifactDir` pointer to that directory when available.
- Final runner truth comes from the last schema-valid structured
  `agent_message` in the Codex JSONL stream. Pairflow does not use
  `last-message.json`, Codex session files, stderr text, or timeline rows as a
  fallback final result source.
- Missing runner config blocks with `PLAN_WATCH_RUNNER_CONFIG_MISSING`;
  unsupported backends block with `PLAN_WATCH_RUNNER_BACKEND_UNSUPPORTED`.
- `--runner-command`, `--runner-arg`, and `--runner-input-mode` are retained as
  legacy/internal escape hatches, not the primary V1 automation contract.
- `--run-now` invokes the configured runner once with an operator nudge trigger
  when no linked approval-ready bubble is present, or when all linked candidates
  are already completed duplicate trigger evidence. Use it to start or resume
  plan orchestration from `ExecutePairflowPlan` without waiting for a bubble
  transition.
- `--force-run` makes an explicit `--run-now` nudge produce fresh ledger evidence
  so local pilots can re-run the same plan without moving aside
  `.pairflow/runtime/plan-watch/ledger.json`.
- `--follow-runner` prints the normalized runner timeline while the runner is
  active. It renders the same Pairflow-owned rows that are durably written to
  `timeline.ndjson`; raw Codex `events.ndjson` remains artifact-only.
- `--dry-run` records observation evidence without invoking the runner.

The canonical watch evidence is the typed iteration result and the local ledger
at `.pairflow/runtime/plan-watch/ledger.json`. Human-readable output such as
`plan watch: runner_settled_checkpoint ... runner_reason=...` is only a summary.
Duplicate suppression is ledger-backed: a completed run for the same watched
plan path, task id/path, bubble id/role, approval-ready state, and status
evidence is skipped until materially new evidence appears.

V1 is local-control-plane automation. It can observe remote bubbles only through
the laptop/local routed Pairflow status path; it does not provide remote-only
plan progression, remote-only bubble creation/start, or a remote supervisor.

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
| `COMMIT_RESULT` | Orchestrator | At commit, with commit SHA/message/staged-file facts |

### Convergence policy

The reviewer can only call `converged` when specific conditions are met:

1. The active role must be `reviewer`
2. At least 2 rounds of implementer↔reviewer exchange must have happened
3. The reviewer's last `PASS` must declare findings explicitly (`--finding` or `--no-findings`)
4. At or after `severity_gate_round`, the reviewer's last review must not contain any findings that meet the current `review_policy.reviewer_blocking_min_severity` threshold under scope policy
5. Threshold semantics:
   - Default baseline `review_policy.reviewer_blocking_min_severity=P3` means a `P3`-only post-gate finding set can still remain reviewer-blocking; this is a configuration baseline, not a redefinition of `P3`.
   - If the threshold is tightened to `P2` or `P1`, findings below that threshold become advisory for routing after `severity_gate_round`.
   - Document scope: blocker-grade `P0/P1` still requires `timing=required-now` + `layer=L1`; without those qualifiers the finding is treated as `P2` for post-gate routing-threshold evaluation.
   - Doc-contract round gate (advisory) can auto-demote non-blocker `required-now` findings after the configured threshold (`doc_contract_gates.round_gate_applies_after`, default: round > 2) and reports warnings in status output.
6. No unanswered `HUMAN_QUESTION` may be pending
7. If `accuracy_critical=true`, latest reviewer verification must be `pass`

This prevents premature convergence — the agents must actually iterate.

### Rounds

Each time the reviewer sends a `PASS` back to the implementer, a new **round** starts. The round counter tracks how many iteration cycles have occurred. You can see the current round in `bubble status`.

### Watchdog

The status pane runs a watchdog loop. If an agent hasn't produced a protocol message within the configured timeout, the watchdog escalates the bubble to `WAITING_HUMAN` so you know something is stuck.
Built-in default timeout is 30 minutes (`watchdog_timeout_minutes` in
`bubble.toml`); repository defaults may override it for newly created bubbles.

---

## State machine

```
CREATED -> PREPARING_WORKSPACE -> RUNNING <-> WAITING_HUMAN
RUNNING --reviewer convergence with sticky_human_gate=false--> RUNNING (meta-review authority active)
RUNNING --autonomous rework dispatch--> RUNNING
RUNNING --human decision required--> READY_FOR_HUMAN_APPROVAL
RUNNING --restart / workflow-driven recovery--> RUNNING | READY_FOR_HUMAN_APPROVAL
READY_FOR_HUMAN_APPROVAL --approve--> APPROVED_FOR_COMMIT
READY_FOR_HUMAN_APPROVAL --request-rework--> RUNNING
APPROVED_FOR_COMMIT -> COMMITTED -> DONE

Any active state -> FAILED
Any non-final state -> CANCELLED (via bubble stop)
```

Ideation note:
- `bubble create --ideation` starts in `RUNNING` with round `0`.
- Before first handoff, run `pairflow bubble kickoff --id <id> --task <text>` (or `--task-file <path>`) to activate round `1`.

### Autonomous meta-review clean-run gate

Current detailed operational policy lives in
[`docs/meta-review-governance.md`](docs/meta-review-governance.md). This README
keeps the user-facing summary and CLI surface.

When reviewer convergence starts autonomous meta-review and `sticky_human_gate=false`, human approval is unlocked only after the configured number of consecutive threshold-clean meta-review runs.

Canonical fields:
- configured requirement: `review_policy.meta_review_consecutive_clean_runs_required` (missing legacy config normalizes to `2`)
- current streak: `meta_review.consecutive_clean_runs` (missing legacy state normalizes to `0`)
- meta-review threshold: `review_policy.meta_review_auto_rework_min_severity`
- reviewer blocking threshold: `review_policy.reviewer_blocking_min_severity`

A meta-review result is clean for streak purposes only after current-run finalization confirms `recommendation=approve` and no open finding meets `review_policy.meta_review_auto_rework_min_severity`. A generic `approve` recommendation, transcript prose, pane output, prior human-gate status, UI labels, or `auto_rework_count` is not clean-run authority.

Routing rules:
- clean approve increments `meta_review.consecutive_clean_runs`; if the updated streak is still below `meta_review_consecutive_clean_runs_required`, Pairflow runs another meta-review directly, without an implementer/reviewer round
- clean approve increments `meta_review.consecutive_clean_runs`; if the updated streak is at or above `meta_review_consecutive_clean_runs_required`, Pairflow routes to `READY_FOR_HUMAN_APPROVAL`
- threshold-meeting findings, `rework`, `inconclusive`, parity/threshold failures, run failures, and auto-rework paths reset `meta_review.consecutive_clean_runs` to `0`

`auto_rework_count` / `auto_rework_limit` remain auto-rework budget controls and are not confidence-streak counters. The reviewer blocking threshold controls reviewer convergence after `severity_gate_round`; it is separate from the meta-review threshold used by the clean-run gate.

UI quality presets are compact encodings of exact backend pairs:

| Preset | Backend pair |
|---|---|
| `P1` | `(meta_review_auto_rework_min_severity=P1, meta_review_consecutive_clean_runs_required=1)` |
| `P2` | `(P2, 1)` |
| `P3` | `(P3, 1)` |
| `P3+1` | `(P3, 2)` |
| `P3+2` | `(P3, 3)` |

Unsupported pairs such as `(P2, 2)` must display as custom/unsupported rather than being coerced to one of the supported presets. `P3+1` and `P3+2` are not severity labels; they mean threshold `P3` plus one or two additional required consecutive clean runs beyond the baseline `P3` clean run.

---

### CLI command reference

#### Bubble management (human-facing)

| Command | Description |
|---------|-------------|
| `bubble create --id <id> --repo <path> [--base <branch>] --review-artifact-type <document\|code> ((--task <text> \| --task-file <path>) \| --ideation) [--remote <host>] [--reviewer-brief <text> \| --reviewer-brief-file <path>] [--accuracy-critical]` | Initialize a new bubble (task-based or taskless ideation mode, local or remote). `--base` may be omitted only when repo-root `[defaults].base_branch` is configured. |
| `bubble kickoff --id <id> (--task <text> \| --task-file <path>) [--repo <path>]` | Activate a taskless ideation bubble (round `0` -> `1`) |
| `bubble start --id <id> [--repo <path>]` | Start a bubble (worktree + tmux) |
| `bubble restart --id <id> [--repo <path>]` | Restart a bubble runtime (tmux/session cleanup + start) |
| `bubble stop --id <id> [--repo <path>]` | Stop and cancel a bubble |
| `bubble delete --id <id> [--repo <path>] [--force] [--json]` | Delete a bubble; without `--force` it reports external artifacts and exits with confirmation-required status |
| `bubble resume --id <id> [--repo <path>]` | Resume from WAITING_HUMAN with default reply |
| `bubble open --id <id> [--repo <path>]` | Open worktree in editor |
| `bubble attach --id <id> [--repo <path>] [--port-forward <port>]...` | Attach via configured macOS launcher; local bubbles use tmux, remote bubbles use the persisted started pointer and optional per-attach port-forward overrides |
| `bubble extract --id <id> --path <artifact-path> [--path <artifact-path>]... [--repo <path>] [--commit] [--message <text>] [--json]` | Copy explicit `plans/**`, `docs/**`, or `progress/**` files from an ideation bubble into the matching clean `main` repo; optional commit stages exactly those selected paths and never closes the source bubble |
| `bubble status --id <id> [--repo <path>] [--json]` | Show current state |
| `bubble list [--repo <path>] [--json]` | List all bubbles |
| `bubble inbox --id <id> [--repo <path>] [--json]` | Show pending human actions |
| `bubble reply --id <id> --message <text> [--repo <path>] [--ref <path>]...` | Answer a human question |
| `bubble approve --id <id> [--override-non-approve] [--override-reason <text>] [--repo <path>] [--ref <path>]...` | Approve for commit from `READY_FOR_HUMAN_APPROVAL` |
| `bubble request-rework --id <id> --message <text> [--repo <path>] [--ref <path>]...` | Send back for rework (`READY_FOR_HUMAN_APPROVAL`: immediate; `WAITING_HUMAN`: queues deferred deterministic rework intent) |
| `bubble commit --id <id> [--repo <path>] [--message <text>] [--ref <path>]... [--stage-all] [--force]` | Commit and finalize; `--stage-all` stages all worktree changes before staged-file validation, while `--force` allows an explicit empty finalize commit |
| `bubble merge --id <id> [--repo <path>] [--push] [--delete-remote] [--json]` | Merge bubble branch and clean up. `--push` / `--delete-remote` stay local-route only; started-remote merge completes the durable merge in the local repo and rejects those flags. |
| `bubble reconcile [--repo <path>] [--dry-run] [--json]` | Clean up stale sessions |
| `bubble watchdog --id <id> [--repo <path>] [--json]` | Check for stuck agents |
Autonomous meta-review results are submitted through the canonical actor channel: `pairflow agent emit --kind meta_review_result ...`. Operator inspection uses `bubble status` / `bubble restart`; there is no public `bubble meta-review` subcommand family.

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

#### Plan workflow automation

| Command | Description |
|---------|-------------|
| `plan watch <plan-path> [--repo <path>] [--interval-seconds <n>] [--once] [--dry-run] [--run-now] [--force-run] [--follow-runner] [--runner-command <cmd>] [--runner-arg <arg>]... [--runner-input-mode stdin_json\|arg_json]` | Poll a local plan for approval-ready linked bubbles, dedupe trigger evidence in the local watch ledger, and invoke the config-selected built-in Codex `ExecutePairflowPlan` runner unless `--dry-run` is set. Use `--run-now` to nudge `ExecutePairflowPlan` once when no linked trigger exists; add `--force-run` to re-run that explicit nudge with fresh ledger evidence, and `--follow-runner` to print normalized runner timeline rows while it runs. The runner flags are legacy/internal overrides. Default interval is 60 seconds. |

#### Agent-facing commands

Canonical actor emission uses explicit authority (`--repo`, `--bubble-id`, `--handoff-id`, `--execution-id`). Resolve the active snapshot first with `pairflow bubble status --id <id> --repo <path> --json`, then copy both `executionContext.handoffId` and `executionContext.executionId` from the JSON output.

| Command | Description |
|---------|-------------|
| `agent emit --kind pass --repo <path> --bubble-id <id> --handoff-id <id> --execution-id <id> --summary <text> [--ref <path>]... [--intent <task\|review\|fix_request>] [--finding <P0\|P1\|P2\|P3:Title>]... [--no-findings]` | Canonical pass emit (reviewer must declare findings explicitly; in `accuracy-critical` bubbles reviewer PASS requires `--ref` to `review-verification-input.json`) |
| `agent emit --kind human_question --repo <path> --bubble-id <id> --handoff-id <id> --execution-id <id> --question <text> [--ref <path>]...` | Canonical human-question emit |
| `agent emit --kind convergence --repo <path> --bubble-id <id> --handoff-id <id> --execution-id <id> --summary <text> [--ref <path>]...` | Canonical convergence emit (reviewer only) |
| `agent emit --kind meta_review_result --repo <path> --bubble-id <id> --handoff-id <id> --execution-id <id> --round <n> --recommendation approve\|rework\|inconclusive --summary <text> --report-json <json> [--ref <path>]...` | Canonical meta-review submit |

Actor emits must always use explicit repo, bubble, handoff, and execution authority from the current status snapshot.

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
        ...                # Optional supporting evidence artifacts
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

### Optional bootstrap command at start

`bubble start` can run an optional per-bubble bootstrap command before tmux launch:

```toml
[commands]
bootstrap = "pnpm install --frozen-lockfile && pnpm build"
```

Behavior:

- Runs after workspace/bootstrap prep, before tmux session launch.
- If the command fails, startup fails and Pairflow rolls back start state for a clean retry.

### Repository validation profile

A repository can define the default validation commands for newly created
bubbles in repo-root `pairflow.toml`:

```toml
[validation]
required = ["lint", "typecheck", "fitness"]
meta_review_approve_required = ["test"]

[validation.commands]
lint = "pnpm lint"
typecheck = "pnpm typecheck"
test = "pnpm test"
fitness = "pnpm fitness:check:ci"
bootstrap = "pnpm install --frozen-lockfile && pnpm build"
```

At `bubble create` time, Pairflow reads this profile and writes the resolved
commands into `.pairflow/bubbles/<id>/bubble.toml`. Later PASS and meta-review
approve validation use that bubble config as the execution authority; they do
not re-read repo-root `pairflow.toml`.

Behavior:

- `validation.required` is the ordered list of commands PASS must run for code
  bubbles during the normal implementer/reviewer loop.
- `validation.meta_review_approve_required` is the ordered list of commands the
  meta-review approve gate runs before routing to human approval.
- Custom command ids such as `fitness` are allowed when they have an explicit
  command under `[validation.commands]`.
- Missing `[validation]` preserves the built-in defaults.
- Existing bubbles are not updated retroactively; create a new bubble or update
  its `bubble.toml` explicitly.
- Target-specific validation profiles are not part of the stable documented
  workflow yet.

### Repository create-time defaults

A repository can define selected defaults for newly created bubbles in
repo-root `pairflow.toml`:

```toml
[defaults]
base_branch = "main"
watchdog_timeout_minutes = 40
max_rounds = 8
severity_gate_round = 4
pairflow_command_profile = "external"
reviewer_context_mode = "fresh"

[defaults.agents]
implementer = "codex"
reviewer = "claude"
meta_reviewer = "codex"

[defaults.review_policy]
review_loop_mode = "full"
reviewer_blocking_min_severity = "P3"
meta_review_auto_rework_min_severity = "P3"
meta_review_consecutive_clean_runs_required = 2

[defaults.doc_contract_gates]
round_gate_applies_after = 2
```

At `bubble create` time, Pairflow resolves explicit create input first, then
repo `[defaults]`, then built-in defaults, and writes the resolved values into
`.pairflow/bubbles/<id>/bubble.toml`. Later lifecycle commands use that bubble
config as the authority; they do not re-read repo-root `pairflow.toml`.

Missing `[defaults]` preserves built-in behavior. Unknown or invalid supported
default fields fail create before the new bubble is persisted.

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
- `copy` does not open a terminal app; it returns the generated attach command.
- Local bubbles keep tmux attach behavior.
- Remote bubbles attach through the persisted started pointer; if the pointer is only `created`, attach fails closed and instructs you to run `bubble start` first.
- `--port-forward` is CLI-only and applies only to that remote attach invocation; otherwise attach uses the persisted pointer's forwarded ports.

### Open command selection (`bubble open`)

`bubble open` resolves editor launch command with explicit local-vs-remote precedence:

Local bubbles:

1. `open_command` in bubble `bubble.toml` (only when explicitly set)
2. `open_command` in global `~/.pairflow/config.toml` (if set)
3. Built-in default: `cursor {{worktree_path}}`

Remote bubbles with a persisted `started` pointer:

1. `open_remote_command` in bubble `bubble.toml` (only when explicitly set)
2. `open_remote_command` in global `~/.pairflow/config.toml` (if set)
3. Built-in default: `code --folder-uri "vscode-remote://ssh-remote+{{remote_authority}}{{remote_clone_path}}"`

Global default in `~/.pairflow/config.toml`:

```toml
open_command = "code --reuse-window {{worktree_path}}"
open_remote_command = "code --folder-uri \"vscode-remote://ssh-remote+{{remote_authority}}{{remote_clone_path}}\""
```

Bubble-level override in `bubble.toml`:

```toml
open_command = "cursor --reuse-window {{worktree_path}}"
open_remote_command = "code --folder-uri \"vscode-remote://ssh-remote+{{remote_authority}}{{remote_clone_path}}\""
```

Rendering rules:

- If template contains `{{worktree_path}}`, all occurrences are replaced.
- For local templates, if the template has no placeholder, Pairflow appends the shell-quoted worktree path.
- Remote placeholders are supported only as standalone shell-argument tokens.
- Supported remote placeholders are `{{remote_clone_path}}`, `{{remote_host}}`, `{{remote_user}}`, `{{remote_authority}}`, and `{{remote_alias}}`.
- Standalone remote placeholders are rendered as shell-quoted argument values.
- If you need a VS Code Remote SSH URI, use the canonical literal `vscode-remote://ssh-remote+{{remote_authority}}{{remote_clone_path}}`; Pairflow URI-encodes that literal before shell quoting the final command.
- Pairflow only consults global remote config for placeholder supplementation when the started pointer is missing the needed remote identity, or when remote template resolution already had to consult global precedence because there is no bubble-level `open_remote_command`.
- `{{worktree_path}}` never gains an implicit remote meaning.
- The built-in remote default uses dedicated URI encoding for the VS Code Remote SSH folder URI and does not treat shell quoting as URI encoding.

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
    ├── ... optional evidence artifacts [not archived]
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
   into `src/v11/shared/reviewer/reviewerSeverityOntology.generated.ts`.
4. Runtime prompt helper (`src/v11/shared/reviewer/reviewerSeverityOntology.ts`)
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

Pairflow now injects startup protocol instructions into both agent panes, but agents must still call canonical actor emits explicitly. If they drift, use `bubble status`, `bubble inbox`, and watchdog escalation to recover, then continue via `pairflow agent emit`.

---

## Development

```bash
pnpm lint       # ESLint
pnpm typecheck  # TypeScript
pnpm test       # Vitest
pnpm check      # All of the above
pnpm dev:ui     # Rebuild CLI + restart web UI server on port 4173
```

PASS validation commands write evidence logs to `.pairflow/evidence/` (for example lint/typecheck/fitness), which can be attached in canonical actor emit refs such as `pairflow agent emit --kind pass ... --ref ...`. Full-suite test runs can be configured separately as meta-review approve validation.

### CI fitness gate

Use the CI entrypoint to run the repository fitness policy and write the report under `.pairflow/evidence/fitness-report.json`:

```bash
pnpm fitness:check:ci
```

### Local CI gate (main push before)

Set up a local pre-push quality gate once per clone:

```bash
pnpm hooks:install
```

This enables a versioned git `pre-push` hook (`.githooks/pre-push`) that runs:

```bash
pnpm ci:local
```

`ci:local` steps:
1. `pnpm install --frozen-lockfile`
2. `pnpm check`
3. `pnpm fitness:check:ci`

By default `ci:local` runs in compact mode:
- each step writes a full log under `.pairflow/evidence/ci-local/<timestamp>/`
- on failure, it prints a focused error summary (`matched error lines` + `log tail`) and the exact log path

Use verbose mode if you want fully streamed command output:

```bash
PAIRFLOW_CI_VERBOSE=1 pnpm ci:local
```

## Roadmap

- Diff / changed files view in the web UI
- Inline inbox panel for human questions
- Notification system for state transitions
