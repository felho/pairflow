# Remote Bubble Execution — Design Document

Status: draft
Date: 2026-04-11

---

## 1. Problem Statement

Pairflow bubbles currently run on the user's local machine. When the laptop is closed or loses power, the bubble stops. For long-running bubbles (multi-round review loops, large implementations), this limits productive runtime to active laptop hours.

**Goal:** Enable bubbles to run on a remote server (home server, office workstation, or any always-on machine) so they survive laptop closure and continue through their autonomous lifecycle phases.

---

## 2. Design Principles

1. **Same Pairflow workflow, target-specific install.** The remote server runs Pairflow itself, but V1 does not require exact build equality with the laptop. Instead, remote start may use an optional target-specific sync/update hook before launch. The laptop remains a thin client; the remote remains the execution host.
2. **State lives where execution happens (operational).** Bubble runtime state (state.json, transcript.ndjson, artifacts/) lives on the remote during execution. The laptop still retains the local control-plane bubble files needed for routing and fail-closed continuity (`bubble.toml`, local `state.json`, `remote.json`, `state-cache.json`), but the remote remains the **operational** runtime source of truth for the duration of this design — not the long-term architectural source of truth. See [§13 Temporary Architectural Debt](#13-temporary-architectural-debt) for the distinction.
3. **SSH is the transport.** No custom protocols, no daemons, no message queues. Plain SSH — battle-tested, encrypted, universally available. Network connectivity (VPN, mesh networking, etc.) is the user's responsibility. See [Personal Network Setup Guide](remote-bubble-personal-setup.md) for examples.
4. **Incremental adoption.** Every existing bubble command keeps working locally. Remote is opt-in per bubble via `--remote <host>`.
5. **V2-aware, not V2-native.** This design is shaped to be replaceable by the V2 Executor interface (BC-08), but does not implement it. The CLI-over-SSH routing is an **adapter shape** — it solves the problem within V1 constraints. It is not a final boundary. See [§14 V2 Extraction Seams](#14-v2-extraction-seams) for where V2 will cut.

---

## 3. Architecture Overview

```
┌────────────────────────────────────────────────────────┐
│  LAPTOP (thin client)                                  │
│                                                        │
│  ~/.pairflow/config.toml          ← remote host defs   │
│  .pairflow/bubbles/<id>/                               │
│    bubble.toml                    ← bubble control      │
│    state.json                     ← local control copy  │
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
│  ~/repos/<project>--<bubble-id>/  ← independent clone  │
│    .pairflow/bubbles/<id>/                             │
│      bubble.toml, state.json,     ← remote bubble      │
│      transcript.ndjson, artifacts/                     │
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

**Flat clone per bubble.** Each remote bubble gets its own independent `git clone`. No shared repo, no worktrees linking back to a common `.git`. This means bubbles have zero overlap: deleting one bubble's clone has no effect on any other bubble. The trade-off is a full clone per bubble (~3-8 seconds for a typical repo), which is negligible compared to bootstrap time (pnpm install, build, etc.). This topology is also intentionally sandbox-friendly: a future containerized or jailed runtime can mount the entire clone as a single isolated workspace root without any shared `.git` coupling to other bubbles.

### Key decisions

**Why does the kernel run on the remote, not the laptop?**

The bubble must survive laptop closure. The Pairflow agents communicate via `pairflow agent emit` commands, which need a running Pairflow kernel to process state transitions. If the kernel ran on the laptop and the laptop closes, the agents would block indefinitely.

Within the V1 architecture, where the kernel is the CLI binary itself (not a persistent service), there is no cheaper option than running the entire Pairflow stack on the remote. A host-based kernel/service that stays alive independently would be architecturally cleaner (and is the V2 direction), but amounts to V2 kernel extraction work — disproportionate for this feature.

**Why SSH and not a custom protocol?**

SSH provides encrypted transport, authentication, port forwarding, and interactive terminal access — everything we need. Using SSH means zero additional infrastructure. The user's `~/.ssh/config` aliases work transparently.

**Why not sync state back continuously?**

Continuous sync adds complexity (conflict resolution, partial writes, network interruption handling) for marginal benefit. Instead, the laptop caches state on-demand when `status` or `attach` is called. The remote holds the operational state; the laptop holds a cache.

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

### 4.4 Local-only overlays and secrets

Only committed repository content is guaranteed to appear in the remote clone. Gitignored local-only files such as `.env.local`, `.env.production`, or similar machine-specific overlays are **not** automatically copied to the remote by this design.

This is deliberate:
- it avoids silently creating a secret-replication contract,
- it keeps remote secret provisioning a separate operational concern,
- it stays compatible with future sandbox/container runtimes where secrets should arrive via a dedicated injection mechanism rather than ad-hoc file copy.

If a remote bubble needs local-only secrets or environment-specific files, the user must provision them on the remote host explicitly.

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
pairflow_sync_command = "~/bin/pairflow-sync" # optional best-effort update hook run before remote start
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
pairflow_sync_command = "cd ~/src/pairflow && git pull --ff-only && pnpm install --frozen-lockfile && pnpm build"
default_port_forwards = [3000, 5173, 8080]
```

`pairflow_sync_command` is intentionally opaque and target-specific. Pairflow only knows that it may run a single best-effort pre-start command on the target before remote bubble startup. It does not standardize the remote package manager, install layout, or update strategy.

### 5.2 Per-bubble remote config

When a bubble is created with `--remote`, the executor config is stored in `bubble.toml`:

```toml
id = "feature-auth"

[executor]
type = "ssh"
remote = "myserver"
```

The `executor` object is intentionally extensible. In this design it uses the minimal `{ type: "ssh", remote: "<host>" }` shape, but the `type` field exists specifically so future runtime kinds (containerized, sandboxed, cloud-backed, etc.) can add executor-specific fields without redefining the top-level bubble config contract.

### 5.3 Remote pointer file (pointer only)

**File:** `.pairflow/bubbles/<id>/remote.json`

Created on `bubble create --remote`, updated on `bubble start`. This file is a **pointer** — it identifies where the remote bubble lives. It does NOT cache state.

Two discriminated shapes exist:
- **Created, not started yet:** `kind: "created"` plus minimal pointer data (`host` and static settings only)
- **Started:** `kind: "started"` plus full pointer data (`instanceId`, `remoteClonePath`, `tmuxSession`, `startedAt`)

Created shape:

```json
{
  "kind": "created",
  "host": "myserver",
  "portForwards": [3000]
}
```

Started shape:

```json
{
  "kind": "started",
  "host": "myserver",
  "instanceId": "inst_20260411T203000Z",
  "remoteClonePath": "~/repos/my-project--feature-auth",
  "tmuxSession": "pf-feature-auth",
  "startedAt": "2026-04-11T20:30:00Z",
  "portForwards": [3000]
}
```

The `instanceId` distinguishes this started instance from any later separately-defined start lineage of the same bubble. This document does not define a restart/recovery contract on top of preserved started state.

### 5.4 State cache file (cache only)

**File:** `.pairflow/bubbles/<id>/state-cache.json`

Initialized on `bubble start`, then updated only by explicit live read-model refresh paths (`status` and `list --refresh`). This is the **single cache authority** for remote state. The default `bubble list` command reads from this file, not from `remote.json`.

```json
{
  "lastCheckedAt": "2026-04-11T22:15:00Z",
  "state": "RUNNING",
  "round": 2,
  "maxRounds": 8,
  "implementerStatus": "idle",
  "reviewerStatus": "working"
}
```

The UI can show cache freshness via `lastCheckedAt`. Stale cache (e.g., hours old) should be visually indicated.

---

## 6. Command Flows

### 6.1 `pairflow bubble create --remote <host>`

```
pairflow bubble create <bubbleId> --remote <host> [existing flags]
  │
  ├─ Validate remote host exists in config.toml
  ├─ Run existing local create flow (bubble.toml, state.json, transcript, inbox, artifacts/)
  ├─ Add executor config to bubble.toml: [executor] { type = "ssh", remote = "<host>" }
  └─ Write remote.json: { host, portForwards }
```

At this point nothing happens on the remote. The bubble is configured locally.

### 6.2 `pairflow bubble start --id <bubbleId>`

For remote bubbles, start is a multi-step SSH flow:

```
pairflow bubble start --id <bubbleId>
  │
  ├─ Read bubble.toml → detect executor.type === "ssh"
  ├─ Load remote host config from config.toml
  ├─ Validate repo has `origin`
  │   └─ Else: Error: remote bubble requires a git origin URL. Run `git remote add origin <url>` first.
  ├─ Validate local base branch has no uncommitted changes
  │   └─ Else: Error: you have uncommitted changes on `<baseBranch>`. Commit or stash first.
  ├─ If pairflow_sync_command is configured:
  │   ├─ SSH: run the configured sync/update hook once
  │   └─ If it fails: warn and continue (best-effort only; no hard block in V1)
  ├─ SSH: pairflow --version
  │   └─ Diagnostic only; version drift may be shown, but it is not a hard compatibility gate
  │
  ├─ STEP 1: Push base branch to origin (if needed)
  │   └─ git push origin <baseBranch>
  │
  ├─ STEP 2: Clone repo on remote (independent, per-bubble)
  │   ├─ Get origin URL: git remote get-url origin
  │   ├─ SSH: git clone <originUrl> ~/repos/<project>--<bubbleId>
  │   └─ SSH: cd ~/repos/<project>--<bubbleId> && git checkout <baseBranch>
  │
  ├─ STEP 3: Sync canonical bubble control artifacts to remote
  │   ├─ scp .pairflow/bubbles/<id>/bubble.toml → remote clone/.pairflow/bubbles/<id>/
  │   ├─ scp .pairflow/bubbles/<id>/state.json, transcript.ndjson, inbox.ndjson → same remote bubble dir
  │   ├─ scp task artifact → remote clone/.pairflow/bubbles/<id>/artifacts/
  │   └─ scp reviewer-brief, reviewer-focus, and any already-required runtime artifacts (if present) → matching remote artifact paths
  │      (Gitignored local-only overlays such as `.env.local` are NOT copied.
  │       If the app needs them, they must already exist on the remote.
  │       Phase 2D must not invent a legacy `config.json` authority or a reduced artifact set
  │       that the remote inner `pairflow bubble start` cannot resolve.)
  │
  ├─ STEP 4: Start on remote
  │   └─ SSH: cd ~/repos/<project>--<bubbleId> && pairflow bubble start --id <bubbleId>
  │       (The clone IS the working directory — no worktree creation.
  │        Bubble branch creation is described in §7.3.
  │        The remote start then runs with an explicit adapter-provided
  │        "already on remote clone" execution context, so the inner command
  │        resolves the bubble from the remote clone and does NOT re-enter the
  │        outer SSH materialization/orchestration branch.
  │        Within that inner branch, the existing default non-attach semantics apply:
  │        overlay sync, tmux launch, agent startup.
  │        This requires a remote-aware start mode that skips worktree
  │        creation and uses the clone root as the workspace directly.)
  │
  ├─ STEP 5: Initialize local state cache
  │   └─ Write state-cache.json only from explicit remote runtime confirmation
  │      returned by the remote inner start.
  │      (No optimistic hardcoded `RUNNING` cache-init, and no immediate
  │       remote `status` refresh as a substitute for start-time authority.)
  │
  ├─ STEP 6: Update local pointer
  │   └─ Write remote.json: { instanceId, remoteClonePath, tmuxSession, startedAt }
  │
  └─ Print summary with next-step guidance:
      - if start succeeded, the operator may run `status` next for a later
        read-model freshness check
      - this follow-up does not make remote read-model authority part of the
        Phase 2D start contract
      - `attach` remains a separate successor-owned `Phase 2F` surface
      - the success output may name the remote tmux session and remote clone path,
        but must not imply that local attach already happened or that a local
        worktree became the remote runtime authority
      - include the sync warning too if the optional hook failed
```

This design deliberately does **not** auto-update Pairflow for already running remote bubbles. The optional sync hook is a start-time provisioning seam only.

### 6.3 `pairflow bubble status --id <bubbleId>`

```
pairflow bubble status --id <bubbleId>
  │
  ├─ Detect remote bubble (remote.json exists)
  ├─ If remoteClonePath is missing (created, not started):
  │   └─ Render local CREATED status from config + remote pointer (no SSH)
  ├─ Else:
  │   ├─ SSH: pairflow bubble status --id <bubbleId> --repo <remoteClonePath> --json
  │   ├─ If SSH fails or the remote status payload is invalid:
  │   │   └─ Report remote status as unavailable (fail-closed);
  │   │      do not reinterpret stale cache as fresh live truth,
  │   │      and leave state-cache.json untouched
  │   ├─ If SSH succeeds but the runtime session is missing (e.g. remote reboot):
  │   │   └─ Report: bubble stopped unexpectedly; persisted state is preserved on disk,
  │   │      but the runtime is no longer active.
  │   │      Phase 2D does not define started-pointer restart/recovery semantics;
  │   │      surface the runtime-loss state fail-closed instead of implying
  │   │      that `pairflow bubble start --id <bubbleId>` is already a supported
  │   │      restart path on top of preserved state.
  │   ├─ Cache response locally → state-cache.json (single cache authority)
  │   └─ Display (re-run SSH for text output, or render locally from JSON)
```

### 6.4 `pairflow bubble attach --id <bubbleId>`

```
pairflow bubble attach --id <bubbleId> [--port-forward <port>...]
  │
  ├─ Detect remote bubble
  ├─ If remoteClonePath / tmuxSession is missing (created, not started):
  │   └─ Error: remote bubble is not started yet; run `pairflow bubble start --id <bubbleId>` first
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
  ├─ If remoteClonePath is missing (created, not started):
  │   └─ Error: remote bubble is not started yet; only `status` and `start` are valid before remote start
  └─ SSH: cd <remoteClonePath> && pairflow bubble <command> --id <bubbleId> [args]
```

Current implementation note (2026-04-20):

- The routed pattern above is the retained thin-client operator model.
- `pairflow bubble request-rework` now has one bounded exception to the routed pattern above:
  - when the operator is already inside the verified remote bubble clone workspace,
  - and Pairflow can prove that workspace context from the active clone root,
  - and no retained clone-local `remote.json` pointer artifacts are present in that workspace,
  - then `request-rework` may mutate the canonical remote runtime state locally from that clone.
- This exception is request-rework-only. `approve`, `reply`, and cleanup commands remain on the retained thin-client routed model in this design slice.

### 6.6 `pairflow bubble list`

Lists both local and remote bubbles:

```
pairflow bubble list
  │
  ├─ Scan local .pairflow/bubbles/ (existing logic)
  ├─ For each bubble, check if remote.json exists
  ├─ For remote bubbles with remote.json(kind="created"): display as CREATED (remote, not started)
  ├─ For started remote bubbles with valid state-cache.json: use cached state (no SSH call)
  ├─ For started remote bubbles with missing/invalid state-cache.json:
  │   └─ Display as remote/unavailable (started, cache missing or invalid);
  │      do not fall back to local state.json as remote runtime truth
  └─ Display with location column

  ID              STATE                  ROUND   LOCATION
  feature-auth    RUNNING (round 2/8)    2/8     myserver (remote)
  doc-review      CREATED                -       myserver (remote, not started)
  stuck-remote    -                      -       myserver (remote, started; cache missing -> unavailable)
  fix-login       WAITING_HUMAN          3/8     local
  refactor-db     DONE                   -       local
```

In structured output, list-entry `stateSource` should cover all four Phase 2E branches explicitly: `cache` for default cache-hit projection, `refresh` for explicit live refresh results, `created_not_started` for a `remote.json(kind="created")` pointer, and `unavailable_started` for started remote bubbles whose cache or refresh path cannot prove fresh runtime truth. Top-level lifecycle fields stay absent unless a retained compat consumer requires a labeled `compatLifecyclePlaceholder`, in which case its `source` value is `local_control_plane_compat`.

For live status of remote bubbles, use `--refresh`:

```
pairflow bubble list --refresh
  │
  └─ For each started remote bubble: SSH status call → update cache on success → display;
     on per-bubble refresh failure, keep stale cache-derived projection if one exists,
     otherwise degrade only that bubble to explicit unavailable projection
```

When the live refresh succeeds but reports `runtimeAvailability="missing"`, the list entry must stay in the `refresh` branch and preserve the remotely confirmed lifecycle snapshot (`state`, `round`, timestamps). This is a runtime-loss diagnosis with preserved state, not a transport failure. Default cache-only `bubble list` still must not invent this diagnosis without a fresh live read.

---

## 7. Repo Sync Strategy

### 7.1 Clone model: one clone per bubble

Each remote bubble gets its own independent `git clone` from origin. There is no shared repo on the remote.

```
laptop repo ──origin──→ GitHub ←──clone── ~/repos/project--bubble-A/
                                 ←──clone── ~/repos/project--bubble-B/
```

This means:
- Bubbles are fully independent — no shared `.git`, no worktree linking
- Deleting a bubble's clone is always safe: `rm -rf ~/repos/project--bubble-A/`
- Each bubble starts from a clean clone of the base branch

### 7.2 Branch sync

Before remote start, the base branch must be available on origin. If the user has local commits not yet pushed, `bubble start` pushes them first:

```bash
# Laptop pushes to origin (automatic, part of start flow)
git push origin <baseBranch>

# Remote clones from origin (automatic, part of start flow)
ssh remote "git clone <originUrl> ~/repos/<project>--<bubbleId>"
```

If the repo has no `origin`, remote start fails fast with an actionable error. Likewise, if the local working tree on `<baseBranch>` has uncommitted changes, remote start stops before pushing and tells the user to commit or stash first. Remote execution only begins from a committed, pushable base branch.

### 7.3 Bubble branch creation

After the remote clone is created, the remote-aware start flow creates the bubble branch from `<baseBranch>` inside that clone and switches to it before any agent work begins.

```bash
ssh remote "cd ~/repos/<project>--<bubbleId> && git checkout -b <bubbleBranch> <baseBranch>"
```

This branch is the branch later merged by `pairflow bubble merge`.

### 7.4 Post-completion sync

After a remote bubble completes (DONE state), the changes are on the remote's bubble branch. To get them back:

```bash
# Pairflow merges on remote and pushes to origin
pairflow bubble merge --id <bubbleId>
# → SSH: merge bubble branch to base branch on remote
# → SSH: git push origin <baseBranch>
# → prints: "Merged. Run `git pull origin <baseBranch>` to update your local checkout."
```

The merge command does NOT automatically modify the laptop's local checkout. The user pulls explicitly when ready. This keeps the remote executor adapter from reaching into the user's local working directory.

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
2. **Per-bubble** (`bubble.toml`): `port_forwards = [3000]`
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
| Repo sync logic | M | Origin URL resolution, branch push, per-bubble clone on remote |
| Bubble config sync | S | SCP config + artifacts to remote clone |
| Remote-aware start mode | M | `--work-mode clone` or equivalent: skip worktree creation, use clone root as workspace directly |
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
| Merge + push flow | S | Post-merge git push to origin, hint to user to pull locally |
| Remote cleanup | S | `rm -rf` bubble clone directory, tmux kill, local pointer removal |
| Error handling | M | SSH connection failures, remote pairflow errors, stale sessions |

---

## 10. V2 Alignment

This design is **V2-aware but not V2-native.** It solves the remote execution problem within V1 constraints using CLI-over-SSH as an adapter shape. The table below maps the correspondence, but the current implementation does not use these as formal interfaces — it routes pairflow CLI commands over SSH directly. This is deliberate: introducing the Executor abstraction layer before the V2 kernel exists would add cost without architectural payoff.

| V2 Executor method | Current SSH adapter | Gap |
|--------------------|--------------------|----|
| `provision(workspace_spec)` | SSH: git clone (independent per bubble) | No `workspace_spec` type — uses raw paths |
| `start(handle, agent, config)` | SSH: `pairflow bubble start` | No `sandbox_handle` — uses tmux session name |
| `stop(handle)` | SSH: `pairflow bubble stop` | Same |
| `sync(handle, direction)` | SCP / rsync | No formal sync contract — ad-hoc file copy |
| `health(handle)` | SSH: `pairflow bubble status --json` | No structured `HealthStatus` — raw JSON |
| `relay(handle, event, op_id)` | Not implemented — agents call pairflow CLI directly on remote | No op_id, no idempotency guarantee |

See [§14 V2 Extraction Seams](#14-v2-extraction-seams) for where and how V2 will formalize these.

---

## 11. Limitations and Future Work

### Current limitations

- **Network required for thin-client commands.** The retained laptop-side `status`, `approve`, `attach`, and related routed commands still need SSH access to the remote. The bounded exception is local `request-rework` from inside a verified remote clone workspace, which can mutate the canonical remote runtime state in place without hopping back through the laptop-side routed path.
- **Single user.** The remote host is assumed to be single-user. No multi-tenant isolation.
- **No automatic notifications.** When a remote bubble reaches WAITING_HUMAN, the user must poll via `status` or `list --refresh`. Push notifications (Slack, email) are a future feature (V2 Channel Adapters).
- **Manual prerequisite setup.** Pairflow does not automate remote host provisioning. Software installation and authentication are the user's responsibility.
- **No general remote-local mutation parity.** Only `request-rework` gained verified remote-clone local parity in this slice. `approve`, `reply`, and cleanup commands still follow the retained thin-client routed model.

### Future extensions

- **Docker executor.** Wrap the remote execution in a container for reproducibility and isolation. Same SSH transport, but runs inside a container on the remote host.
- **Cloud executor (e2b.dev, Modal, etc.).** API-driven sandbox provisioning. Removes the need for a personal server.
- **Push notifications.** V2 Channel Adapters (Slack, webhook) for WAITING_HUMAN events.
- **Persistent status sync.** Background daemon or cron job that periodically caches remote state for instant `bubble list` display.
- **Multi-remote orchestration.** Running different bubbles on different remotes, or load-balancing across hosts.
- **Stale clone cleanup.** Optional auto-cleanup for `DONE` / `CANCELLED` remote bubbles older than a configured age to reclaim disk space on the remote host.

---

## 12. Failure & Recovery Semantics

This design does not implement command-level idempotency (op_id, resume tokens). Recovery relies on manual inspection: SSH back in, check state, retry if needed. This is acceptable for a single-user tool where the operator is the user. V2 will formalize this with the relay() contract.

**Important distinction:** The Pairflow state machine already prevents invalid double-transitions (e.g., you cannot approve an already-approved bubble). However, this is not the same as command-level idempotency. Commands like `start`, `merge`, and repo sync have side effects (git clone, tmux launch, bootstrap scripts) that can be left in a partially completed state if SSH drops mid-execution.

Another important distinction: runtime liveness is separate from persisted state. A remote reboot can kill the tmux session and all agents while leaving `state.json`, transcripts, and artifacts intact on disk. This is not a transport failure; it is a runtime-loss scenario with preserved persisted state.

### Recovery matrix

Since each bubble has its own independent clone, recovery never risks affecting other bubbles.

| Command | SSH drops during... | What may be left partially done | Recovery |
|---------|--------------------|---------------------------------|----------|
| `start` (step 1: push to origin) | git push | Push may not have completed | Retry — git push is idempotent |
| `start` (step 2: clone on remote) | git clone | Partial clone directory | `rm -rf ~/repos/<project>--<bubbleId>` → retry (safe — independent clone, no other bubble affected) |
| `start` (step 3: config sync) | scp | Missing config files on remote | Retry start — scp overwrites |
| `start` (step 4: remote start) | overlay sync / tmux launch / agent startup | Partial tmux session | SSH → `tmux kill-session -t pf-<bubbleId>` → retry start on remote |
| `start` (step 5: initial cache) | writing state-cache.json | Remote is running, cache missing locally | Do not reinterpret this as a successful Phase 2D substitute path; treat local start as failed, then use a later read-model/recovery path to regenerate cache from remote authority |
| `start` (step 6: local pointer) | writing remote.json | Remote is running, local doesn't know where it lives | Do not reinterpret later `status` output or manual `remote.json` repair as a successful Phase 2D substitute path. Treat local start as failed and leave started-pointer reconciliation to a later explicit read-model/recovery phase. |
| remote host reboot / unexpected restart | tmux session and agents disappear | Persisted bubble state remains on disk, but runtime is gone; local cache may still show `RUNNING` | SSH → verify clone still exists → `pairflow bubble status`; if runtime session is missing, report preserved state fail-closed. Re-creating runtime on preserved state is later-phase recovery work, not Phase 2D start authority |
| `status` | reading JSON | No side effects | Retry — read-only operation |
| `attach` | SSH tunnel setup | No side effects on remote | Retry — SSH reconnect |
| `approve` | state transition | State may or may not have transitioned | SSH → `pairflow bubble status --json` → check actual state |
| `merge` | git merge / git push | Partial merge on remote, push may not have happened | SSH → check branch state → manual `git push` if needed |
| `clean` | clone/tmux cleanup | Partial cleanup | `rm -rf ~/repos/<project>--<bubbleId>` — always safe |

### General recovery procedure

For any interrupted command:
1. `ssh <remote>` — verify you can reach the remote
2. Inspect the remote state only within the interrupted command's currently defined authority boundary
3. Retry only if the retry path stays within that same authority boundary
4. Do not manually repair local persisted authority or reinterpret read-model output as start-success unless a later phase explicitly defines that recovery contract

For remote reboot specifically:
1. Re-establish SSH access to the host
2. Check whether `~/repos/<project>--<bubbleId>` still exists
3. If persisted bubble state is present but the tmux session is gone, treat it as runtime-loss with preserved state
4. Do not treat `pairflow bubble start --id <bubbleId>` as an already-approved Phase 2D restart contract on top of preserved state; fail closed and defer explicit restart/recovery semantics to the later recovery phase

### Operator guidance for runtime-loss

When a started remote bubble may have lost its runtime after reboot or tmux loss:

1. Check reachability and clone presence on the remote host.
2. Run `pairflow bubble status --id <bubbleId> --repo <repo> --json`.
3. Run `pairflow bubble list --repo <repo> --refresh` if you need a repo-wide refreshed read-model.
4. If the live status says the runtime is missing, record that the persisted state is still present but no live runtime is active.
5. Do not convert that observation into a supported `pairflow bubble start --id <bubbleId>` restart path in this phase.

### Manual smoke evidence expectation

Rollout closure should include one short manual smoke note, stored by default in `.pairflow/bubbles/<id>/artifacts/done-package.md` or, if needed, in a separate evidence artifact that is referenced from the done package.

That note should capture:

1. The exact commands used for the check, typically `pairflow bubble status --json` and `pairflow bubble list --refresh`.
2. The observed fail-closed output or JSON fields showing preserved state plus missing live runtime.
3. A short confirmation that the operator-facing docs wording matched the observed behavior.

Example closure note:

1. `pairflow bubble status --id p3c-demo --repo /repo --json`
2. `pairflow bubble list --repo /repo --refresh`
3. Observed status JSON fields: `"state":"RUNNING"`, `"round":3`, `"remoteExecution":{"runtimeAvailability":"missing","runtimeReasonCode":"STATUS_REMOTE_RUNTIME_MISSING","lastLiveCheckAt":"2026-04-16T10:00:00.000Z"}`
4. Observed list text suffix: `source=refresh runtime=missing cache=present live_checked=2026-04-16T10:00:00.000Z checked=2026-04-16T10:00:00.000Z runtime_reason=STATUS_REMOTE_RUNTIME_MISSING runtime_note=preserved_state_no_live_runtime_fail_closed`
5. Docs wording matched the behavior: persisted state remained visible, but the runtime was reported fail-closed as missing, with no restart claim for the started pointer.

---

## 13. Temporary Architectural Debt

This section documents known deviations from the V2 north star. These are **deliberate trade-offs** — accepted to ship the feature within V1 constraints, with explicit extraction paths for V2.

### Debt 1: Remote-owned kernel and state

**V2 direction:** The kernel is the single authoritative state owner. Executors are runtime boundaries that relay events to the kernel via `relay(op_id)`.

**This design:** The kernel (= the pairflow CLI binary) runs on the remote alongside the agents. State lives on the remote. The laptop is a thin client that issues CLI commands over SSH.

**Why accepted:** In V1, the kernel is not a persistent service — it is the CLI binary invoked per-command. There is no cheaper option within V1 to keep the kernel alive while the laptop is closed. A host-based kernel service would solve this cleanly but is V2 kernel extraction work.

**Extraction path:** When V2 introduces a persistent kernel (daemon or service), the kernel moves back to a stable host (laptop, cloud, or co-located with the state store). The remote executor becomes a pure runtime boundary.

### Debt 2: No command-level idempotency

**V2 direction:** Every `relay()` call carries an `op_id`. The kernel guarantees at-most-once processing. Resume tokens restore position after disconnect.

**This design:** Commands are plain SSH calls with no op_id. If SSH drops mid-command, the user must manually verify state and retry.

**Why accepted:** For a single-user tool where the operator is the user, manual recovery is sufficient. The Pairflow state machine already prevents invalid double-transitions for lifecycle operations. The side-effect-bearing commands (start, merge, bootstrap) are infrequent and manually recoverable.

**Extraction path:** When V2 introduces the relay contract, wrap each SSH command in an `op_id` envelope. The remote pairflow command logs the op_id to transcript before executing, enabling replay detection.

### Debt 3: CLI-over-SSH as adapter, not boundary

**V2 direction:** The Executor interface (`provision`, `start`, `stop`, `health`, `sync`, `relay`) is the formal boundary. Executor implementations (local, SSH, container, cloud) are pluggable.

**This design:** The laptop CLI detects remote bubbles and routes pairflow commands over SSH. This is an inline adapter in the CLI runner code, not a pluggable Executor implementation. It uses raw paths, tmux session names, and CLI flags as its interface — not `workspace_spec` or `sandbox_handle`.

**Why accepted:** Introducing the Executor abstraction before the V2 kernel exists adds indirection without payoff. The V1 CLI runners are not structured for pluggable execution — they would need significant refactoring to accept an Executor dependency. The adapter shape is simpler and sufficient.

**Extraction path:** See §14.

---

## 14. V2 Extraction Seams

When V2 work begins, these are the specific points where the remote execution code transforms into the Executor interface:

### Seam 1: `pairflow bubble start` remote activation seam → `SSHExecutor.provision() + start()`

**Current:** The V1 start surface needs an explicit remote activation branch spanning the CLI entry, start orchestration, artifact sync, and SSH adapter seam. That branch must also carry an explicit "already on remote clone" execution context so the inner start does not recurse back into the outer orchestration.

**V2 extraction:** Extract this coordinated branch into an `SSHExecutor` class implementing the Executor interface. The CLI runner calls `executor.provision(spec)` and `executor.start(handle, agent, config)` — same code, different shape, with the explicit remote execution context becoming part of the executor contract instead of an ad hoc start-only branch.

### Seam 2: `routeRemoteBubbleCommand()` → `Executor.relay()`

**Current:** A generic routing function detects remote bubbles and forwards CLI commands over SSH.

**V2 extraction:** Replace with `executor.relay(handle, eventEnvelope, opId)`. The routing function becomes the relay implementation. Add op_id generation and idempotency tracking at this point.

### Seam 3: `remote.json` + `state-cache.json` → `sandbox_handle`

**Current:** Two files — `remote.json` (pointer: host, instanceId, paths, tmux session) and `state-cache.json` (cached remote state).

**V2 extraction:** The `sandbox_handle` type absorbs the pointer fields from `remote.json` (host, instanceId, tmuxSession). The handle gains op_id tracking (last acknowledged op) and health snapshot. The state cache becomes part of the kernel's state layer.

### Seam 4: State ownership inversion

**Current:** State lives on the remote; laptop caches.

**V2 extraction:** When the kernel becomes a persistent service, state moves to the kernel's state store (local file, SQLite, or cloud-backed per V2 §4.6). The remote executor syncs artifacts but does not own state. Agent emit commands relay through the executor to the kernel.

---

## 15. Security Considerations

### What is exposed

- SSH connection between laptop and remote — encrypted, key-authenticated
- OAuth tokens on the remote — stored by Claude Code's credential manager, auto-refreshing
- Git SSH keys on the remote — standard GitHub/GitLab access
- Repo working copy on the remote — including whatever files the checked-out repo and bootstrap flow materialize there

### What is NOT exposed

- No ports open to the internet (unless the user configures their network that way)
- No cloud services involved (unless the user chooses a cloud remote)
- No Pairflow-specific daemons or listeners

### User responsibility

- Securing SSH access (key-based auth, no password login)
- Keeping the remote host updated
- Network connectivity security (VPN, mesh networking, etc.) — see [Personal Network Setup Guide](remote-bubble-personal-setup.md)
- If the remote host is compromised: revoke Claude/Codex OAuth sessions from the relevant account settings, rotate Git credentials as needed, and re-authenticate on a clean host
- Understanding that repo-local secrets or generated `.env` files present in the remote clone remain on remote disk until the bubble is cleaned up
