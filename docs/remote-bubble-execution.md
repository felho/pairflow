# Remote Bubble Execution — Design Document

Status: draft
Date: 2026-04-11

---

## 1. Problem Statement

Pairflow bubbles currently run on the user's local machine. When the laptop is closed or loses power, the bubble stops. For long-running bubbles (multi-round review loops, large implementations), this limits productive runtime to active laptop hours.

**Goal:** Enable bubbles to run on a remote server (home server, office workstation, or any always-on machine) so they survive laptop closure and continue through their autonomous lifecycle phases.

---

## 2. Design Principles

1. **Same Pairflow, different machine.** The remote server runs the exact same Pairflow binary. No fork, no "remote edition." The laptop becomes a thin client.
2. **State lives where execution happens.** Bubble state (state.json, transcript.ndjson, artifacts/) lives on the remote. The laptop keeps a lightweight pointer + cached state for UI display.
3. **SSH is the transport.** No custom protocols, no daemons, no message queues. Plain SSH — battle-tested, encrypted, universally available. Network connectivity (VPN, mesh networking, etc.) is the user's responsibility. See [Personal Network Setup Guide](remote-bubble-personal-setup.md) for examples.
4. **Incremental adoption.** Every existing bubble command keeps working locally. Remote is opt-in per bubble via `--remote <host>`.
5. **V2 aligned.** This design maps directly to the V2 Executor interface (BC-08) with `type: "ssh"`. When V2 lands, this becomes the SSHExecutor implementation.

---

## 3. Architecture Overview

```
┌────────────────────────────────────────────────────────┐
│  LAPTOP (thin client)                                  │
│                                                        │
│  ~/.pairflow/config.toml          ← remote host defs   │
│  .pairflow/bubbles/<id>/                               │
│    config.json                    ← bubble config       │
│    remote.json                    ← remote pointer      │
│    state-cache.json               ← cached remote state │
│                                                        │
│  pairflow CLI  ─── routes commands via SSH ───┐        │
└───────────────────────────────────────────────┼────────┘
                                                │ SSH
                                                ▼
┌────────────────────────────────────────────────────────┐
│  REMOTE HOST (execution)                               │
│                                                        │
│  ~/repos/<project>/               ← git clone          │
│  ~/.pairflow-worktrees/<project>/                      │
│    <bubble-id>/                   ← git worktree       │
│                                                        │
│  .pairflow/bubbles/<id>/                               │
│    config.json, state.json,       ← full bubble state  │
│    transcript.ndjson, artifacts/                        │
│                                                        │
│  tmux: pf-<bubble-id>            ← 4-pane session      │
│    pane 0: status/watchdog                             │
│    pane 1: implementer agent                           │
│    pane 2: reviewer agent                              │
│    pane 3: meta-reviewer agent                         │
│                                                        │
│  localhost:<port>                 ← dev server (if any) │
└────────────────────────────────────────────────────────┘
```

### Key decisions

**Why does the kernel run on the remote, not the laptop?**

The bubble must survive laptop closure. The Pairflow agents communicate via `pairflow agent emit` commands, which need a running Pairflow kernel to process state transitions. If the kernel ran on the laptop and the laptop closes, the agents would block indefinitely. Therefore, the entire Pairflow stack (kernel + agents + state) runs on the remote.

**Why SSH and not a custom protocol?**

SSH provides encrypted transport, authentication, port forwarding, and interactive terminal access — everything we need. Using SSH means zero additional infrastructure. The user's `~/.ssh/config` aliases work transparently.

**Why not sync state back continuously?**

Continuous sync adds complexity (conflict resolution, partial writes, network interruption handling) for marginal benefit. Instead, the laptop caches state on-demand when `status` or `attach` is called. The remote is the single source of truth.

---

## 4. Prerequisites — Remote Host Setup

One-time setup on the remote server. This is the user's responsibility — Pairflow does not automate it.

### 4.1 Required software

```bash
# Pairflow
remote$ npm install -g pairflow    # or project-specific install method

# Claude Code + authentication
remote$ npm install -g @anthropic-ai/claude-code
remote$ claude auth login
# → prints a URL → open in any browser → authenticate → tokens persist on remote

# Codex (if used as agent) + authentication
remote$ npm install -g codex
remote$ codex auth login

# tmux (likely pre-installed on Linux servers)
remote$ sudo apt install tmux

# Git (with access to your repositories)
remote$ ssh-keygen -t ed25519
# → add public key to GitHub/GitLab
```

### 4.2 Authentication model

Claude Code and Codex authenticate via OAuth on the remote host. The `claude auth login` command provides a URL that can be opened in any browser (even on the laptop). Once authenticated, tokens persist on the remote and auto-refresh. **No API key needed — your existing subscription works.**

### 4.3 Network connectivity

The laptop must be able to SSH into the remote host. How you achieve this depends on your network setup — LAN, VPN, mesh networking, etc. See [Personal Network Setup Guide](remote-bubble-personal-setup.md) for examples.

---

## 5. Configuration

### 5.1 Remote host definitions

**File:** `~/.pairflow/config.toml`

```toml
# Existing config
attach_launcher = "auto"
open_command = "cursor"

# Remote host definitions
[remotes.myserver]
host = "myserver"                      # SSH host (can be ~/.ssh/config alias)
user = "myuser"                        # SSH user (optional, defaults to current user)
repo_base = "~/repos"                  # where repos are cloned on the remote
pairflow_command = "pairflow"          # pairflow binary on remote (optional, default: "pairflow")
default_port_forwards = [3000, 8080]   # ports forwarded on attach (optional)
```

Multiple remotes can be defined:

```toml
[remotes.homelab]
host = "homelab"
repo_base = "~/repos"

[remotes.workstation]
host = "office-ws"
user = "dev"
repo_base = "/data/repos"
default_port_forwards = [3000, 5173, 8080]
```

### 5.2 Per-bubble remote config

When a bubble is created with `--remote`, the executor config is stored in `config.json`:

```json
{
  "id": "feature-auth",
  "executor": {
    "type": "ssh",
    "remote": "myserver"
  }
}
```

### 5.3 Remote pointer file

**File:** `.pairflow/bubbles/<id>/remote.json`

Created on `bubble create --remote`, updated on `bubble start`:

```json
{
  "host": "myserver",
  "remoteRepoPath": "~/repos/my-project",
  "remoteBubblePath": "~/repos/my-project/.pairflow/bubbles/feature-auth",
  "tmuxSession": "pf-feature-auth",
  "status": "running",
  "startedAt": "2026-04-11T20:30:00Z",
  "portForwards": [3000]
}
```

---

## 6. Command Flows

### 6.1 `pairflow bubble create --remote <host>`

```
pairflow bubble create <bubbleId> --remote <host> [existing flags]
  │
  ├─ Validate remote host exists in config.toml
  ├─ Run existing local create flow (config.json, state.json, artifacts/)
  ├─ Add executor config to config.json: { type: "ssh", remote: "<host>" }
  └─ Write remote.json: { host, status: "created" }
```

At this point nothing happens on the remote. The bubble is configured locally.

### 6.2 `pairflow bubble start --id <bubbleId>`

For remote bubbles, start is a multi-step SSH flow:

```
pairflow bubble start --id <bubbleId>
  │
  ├─ Read config.json → detect executor.type === "ssh"
  ├─ Load remote host config from config.toml
  │
  ├─ STEP 1: Sync repo to remote
  │   ├─ Get origin URL: git remote get-url origin
  │   ├─ SSH: check if repo exists on remote
  │   │   └─ test -d ~/repos/<project>/.git
  │   ├─ If not: SSH: git clone <originUrl> ~/repos/<project>
  │   ├─ If yes: SSH: cd ~/repos/<project> && git fetch origin
  │   └─ Push current branch to remote (if not yet on origin):
  │       └─ git push origin <branch>
  │
  ├─ STEP 2: Sync bubble config to remote
  │   ├─ scp .pairflow/bubbles/<id>/config.json → remote
  │   ├─ scp task artifact → remote
  │   └─ scp reviewer-brief, reviewer-focus (if present) → remote
  │
  ├─ STEP 3: Start on remote
  │   └─ SSH: cd ~/repos/<project> && pairflow bubble start --id <bubbleId> --no-attach
  │       (This runs the standard local start flow ON THE REMOTE:
  │        worktree creation, overlay sync, tmux launch, agent startup)
  │
  ├─ STEP 4: Update local pointer
  │   └─ Write remote.json: { status: "running", startedAt: now, remoteRepoPath, tmuxSession }
  │
  └─ Print summary with attach/status commands
```

### 6.3 `pairflow bubble status --id <bubbleId>`

```
pairflow bubble status --id <bubbleId>
  │
  ├─ Detect remote bubble (remote.json exists)
  ├─ SSH: pairflow bubble status --id <bubbleId> --repo <remoteRepoPath> --json
  ├─ Cache response locally → state-cache.json
  └─ Display (re-run SSH for text output, or render locally from JSON)
```

### 6.4 `pairflow bubble attach --id <bubbleId>`

```
pairflow bubble attach --id <bubbleId> [--port-forward <port>...]
  │
  ├─ Detect remote bubble
  ├─ Load remote config + port forwards
  ├─ Build SSH command:
  │   ssh -t \
  │     -L 3000:localhost:3000 \
  │     -L 8080:localhost:8080 \
  │     <user>@<host> \
  │     "tmux attach-session -t pf-<bubbleId>"
  └─ Replace current process with SSH (interactive)
```

After attach, the user is inside the remote tmux session with full access to all panes. Port forwards make dev servers accessible at `localhost:<port>` in the browser.

### 6.5 Other commands (approve, rework, commit, merge, clean)

All follow the same routing pattern:

```
pairflow bubble <command> --id <bubbleId> [args]
  │
  ├─ Detect remote bubble
  └─ SSH: cd <remoteRepoPath> && pairflow bubble <command> --id <bubbleId> [args]
```

### 6.6 `pairflow bubble list`

Lists both local and remote bubbles:

```
pairflow bubble list
  │
  ├─ Scan local .pairflow/bubbles/ (existing logic)
  ├─ For each bubble, check if remote.json exists
  ├─ For remote bubbles: use state-cache.json (no SSH call)
  └─ Display with location column

  ID              STATE                  ROUND   LOCATION
  feature-auth    RUNNING (round 2/8)    2/8     myserver (remote)
  fix-login       WAITING_HUMAN          3/8     local
  refactor-db     DONE                   -       local
```

For live status of remote bubbles, use `--refresh`:

```
pairflow bubble list --refresh
  │
  └─ For each remote bubble: SSH status call → update cache → display
```

---

## 7. Repo Sync Strategy

### 7.1 Initial sync (first start)

The remote clones from the same origin (GitHub/GitLab) as the laptop. This avoids pushing over SSH from laptop to remote (which would be slow for large repos) and ensures the remote has proper origin tracking.

```
laptop repo ──origin──→ GitHub ←──clone── remote repo
```

### 7.2 Branch sync

Before remote start, the current branch must be available on the remote:

```bash
# On laptop: push the bubble's base branch to origin
git push origin main

# On remote: fetch and checkout
git fetch origin
git checkout main
```

If the user has local commits not yet pushed to origin, `bubble start` pushes them first:

```bash
# Laptop pushes to origin
git push origin <baseBranch>

# Then remote fetches
ssh remote "cd ~/repos/<project> && git fetch origin"
```

### 7.3 Post-completion sync

After a remote bubble completes (DONE state), the changes are on the remote's bubble branch. To get them back to the laptop:

```bash
# Option A: merge on remote, push to origin, pull on laptop
ssh remote "cd ~/repos/<project> && pairflow bubble merge --id <bubbleId>"
laptop$ git pull origin main

# Option B: pairflow handles it
pairflow bubble merge --id <bubbleId>
# → SSH: merge on remote
# → SSH: git push origin main
# → local: git pull origin main
```

---

## 8. Port Forwarding for Dev Servers

### 8.1 How it works

When attaching to a remote bubble, SSH port forwards are established. The dev server runs on the remote, but is accessible at `localhost:<port>` on the laptop.

```
Browser → localhost:3000 → SSH tunnel → remote:3000 → Next.js dev server
```

### 8.2 Configuration

Ports can be configured at three levels (in precedence order):

1. **Per-attach** (CLI flag): `pairflow bubble attach --id X --port-forward 3000 5173`
2. **Per-bubble** (config.json): `"port_forwards": [3000]`
3. **Per-remote** (config.toml): `default_port_forwards = [3000, 8080]`

### 8.3 Dev server startup

Pairflow does NOT start the dev server automatically. The user (or agent) starts it within the tmux session. Since the bubble's bootstrap command can include a dev server start, this can be automated per-bubble:

```toml
# bubble config
[commands]
bootstrap = "pnpm install --frozen-lockfile && pnpm dev &"
```

Or the agent can start the dev server as part of its implementation work (which is the natural flow when developing a web app).

---

## 9. Implementation Plan

### Phase 1: Foundation (S-M)

| Component | Size | Description |
|-----------|------|-------------|
| Remote config schema | S | `[remotes]` section in config.toml, TOML parsing, validation |
| SSH transport module | M | `sshExec()`, `sshInteractive()`, `scpTo()`, `scpFrom()` functions wrapping system SSH binary |
| Remote pointer file | S | `remote.json` schema, read/write utilities |

### Phase 2: Create + Start (M-L)

| Component | Size | Description |
|-----------|------|-------------|
| `--remote` flag on `bubble create` | S | Flag parsing, remote validation, pointer file creation |
| Repo sync logic | M | Clone detection, origin URL resolution, branch push/fetch |
| Bubble config sync | S | SCP config + artifacts to remote |
| Remote start orchestration | L | SSH-based start flow, error handling, pointer update |

### Phase 3: Operations (M)

| Component | Size | Description |
|-----------|------|-------------|
| Remote-aware `status` | S | SSH + JSON parsing + local cache |
| Remote-aware `attach` | M | SSH interactive + port forwarding |
| Remote command router | M | Generic `routeRemoteBubbleCommand()` for approve/rework/commit/merge/clean |
| `bubble list` remote column | S | Pointer detection + cache display |

### Phase 4: Polish (S)

| Component | Size | Description |
|-----------|------|-------------|
| Merge + pull-back flow | S | Post-merge git push + local pull |
| Remote cleanup | S | Worktree removal, tmux kill, state cleanup on remote |
| Error handling | M | SSH connection failures, remote pairflow errors, stale sessions |

---

## 10. V2 Alignment

This design maps directly to the V2 Executor interface (BC-08 in [V2 Architecture Plan](v2/pairflow-v2-architecture-plan-joint.md)):

| V2 Executor method | SSH implementation |
|--------------------|--------------------|
| `provision(workspace_spec)` | SSH: git clone + worktree create |
| `start(handle, agent, config)` | SSH: pairflow bubble start |
| `stop(handle)` | SSH: pairflow bubble stop |
| `sync(handle, direction)` | SCP / rsync |
| `health(handle)` | SSH: pairflow bubble status --json |
| `relay(handle, event, op_id)` | Not needed yet — agents call pairflow CLI directly on remote |

The V2 migration path (Phase D) is:
1. Extract current local execution behind an `Executor` interface → `LocalExecutor`
2. Implement `SSHExecutor` using this document's SSH transport
3. Later: `ContainerExecutor` (Docker), `CloudExecutor` (e2b.dev, etc.)

---

## 11. Limitations and Future Work

### Current limitations

- **Network required for commands.** Every `status`, `approve`, `attach` etc. needs SSH access to the remote. Offline operation on the laptop is limited to cached state.
- **Single user.** The remote host is assumed to be single-user. No multi-tenant isolation.
- **No automatic notifications.** When a remote bubble reaches WAITING_HUMAN, the user must poll via `status` or `list --refresh`. Push notifications (Slack, email) are a future feature (V2 Channel Adapters).
- **Manual prerequisite setup.** Pairflow does not automate remote host provisioning. Software installation and authentication are the user's responsibility.

### Future extensions

- **Docker executor.** Wrap the remote execution in a container for reproducibility and isolation. Same SSH transport, but runs inside a container on the remote host.
- **Cloud executor (e2b.dev, Modal, etc.).** API-driven sandbox provisioning. Removes the need for a personal server.
- **Push notifications.** V2 Channel Adapters (Slack, webhook) for WAITING_HUMAN events.
- **Persistent status sync.** Background daemon or cron job that periodically caches remote state for instant `bubble list` display.
- **Multi-remote orchestration.** Running different bubbles on different remotes, or load-balancing across hosts.

---

## 12. Security Considerations

### What is exposed

- SSH connection between laptop and remote — encrypted, key-authenticated
- OAuth tokens on the remote — stored by Claude Code's credential manager, auto-refreshing
- Git SSH keys on the remote — standard GitHub/GitLab access

### What is NOT exposed

- No ports open to the internet (unless the user configures their network that way)
- No cloud services involved (unless the user chooses a cloud remote)
- No Pairflow-specific daemons or listeners

### User responsibility

- Securing SSH access (key-based auth, no password login)
- Keeping the remote host updated
- Network connectivity security (VPN, mesh networking, etc.) — see [Personal Network Setup Guide](remote-bubble-personal-setup.md)
