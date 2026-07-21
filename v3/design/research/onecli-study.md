# OneCLI Study — The Capability Boundary as Infrastructure (Credential Gateway / Agent Vault)

Date: 2026-06-21

## Purpose

OneCLI ([`github.com/onecli/onecli`](https://github.com/onecli/onecli)) is the **dedicated,
productionised credential gateway** that sits between an AI agent and every external API it
touches. It is the real component behind the BitSafe "agents never hold raw keys" claim and the
literal target of the egress-firewall sentence in the NanoClaw Part-1 article — the thing the
NanoClaw harness *consumes* but does not contain. Tagline: **"Store once. Inject anywhere. Agents
never see the keys."**

This study is different from studies 1–13 in two ways. First, its contribution is not a workflow
kernel at all — it is a **single v3-relevant layer realised as standalone infrastructure**: the
capability/credential boundary (v3's **L7**, with strong ties to **L2/L3** human-decision gating and
**L13** audit). Second, it is the **concrete reference implementation of the abstract L7 pattern the
ETCLOVG survey (study 13) only named** — "credential never travels; vault + placeholders to the LLM +
raw substitution at the execution layer" (Skyvern, §7-L7). OneCLI is that pattern shipped, with its
unsolved part (secret lifecycle over long horizons) visible in the same place the survey flagged it.

It also serves as a **cross-source divergence anchor**: the BitSafe article describes the egress
control as "iptables rules + a config-file allowlist + a reload MCP call." The first-party code shows
a *different and stronger* mechanism (network-membership topology + a MITM proxy hop; `pfctl`-NAT, not
`iptables`, on macOS). Resolving that divergence is part of the study's job (Slice 5).

> **Citation fidelity.** OneCLI's own source was read at **repo/README granularity** (web fetch), so
> OneCLI-internal facts are cited as *(OneCLI repo)* without line numbers. The **load-bearing
> consumer-side evidence is line-precise** from the NanoClaw checkout
> (`/Users/felho/dev/repos-to-learn-from/nanoclaw`) and from the verbatim capture
> (`bitsafe-ai-os-capture.md`). Where the two agree, the mechanism is confirmed from both ends of the
> wire. See Caveats.

---

## Executive Summary

1. **OneCLI is a choke-point capability gate, not a library.** Three components: a **Rust gateway**
   (`:10255`) that MITM-intercepts HTTPS and injects credentials by host+path match as headers or
   query params; a **Next.js dashboard + API** (`:10254`) that owns agents, secrets, policies, and the
   approval UI; an **AES-256-GCM secret store** that decrypts only at request time *(OneCLI repo:
   `apps/gateway` Rust, `apps/web` Next.js, `packages/db` Prisma/Postgres; Apache-2.0)*. This is the
   paperclip "credential broker" (study 3) and the survey's L7 pattern (study 13) **pulled out into its
   own process** with an enforced boundary.

2. **The boundary is produce-not-perform applied to secrets.** The agent emits an *intent* — a plain
   HTTP call to the real URL with **no auth header** — and the privileged act (credential injection)
   happens at a seam the agent cannot see or forge. The agent literally cannot read the key from env,
   files, or `/proc`; MCP servers that demand a local credential file get a `0600` stub holding the
   literal placeholder `"onecli-managed"`, swapped on the wire
   (`container/skills/onecli-gateway/SKILL.md`; `bitsafe-ai-os-capture.md:3842,3881`). This is the
   cleanest real-world instance of v3's **"the actor names the capability, the kernel performs it."**

3. **The approval-hold is a human-decision gate living at the I/O boundary** (v3 **LC2/L2/L3
   DECISION_REQUEST**). When a rule says a credentialed call needs sign-off, the gateway **holds the
   HTTP connection open** and fires a callback; the host persists a durable `pending_approvals` row,
   routes an ask-card to an admin, and resolves on click or denies on expiry
   (`src/modules/approvals/onecli-approvals.ts:1-70`). v3 should **learn the shape and reject the
   transport**: a durable park beats holding a live socket.

4. **Policy is per-identity and the wiring is fail-closed.** Each consumer group gets its own OneCLI
   **agent identity** → per-agent secret-mode (`all` | `selective`), policies, and rate-limits, looked
   up *per request* (no restart) (`CLAUDE.md` "Secret modes"). Spawn is **fail-closed**: if the gateway
   can't be wired, no container starts (`src/container-runner.ts` `ensureAgent`;
   `bitsafe-ai-os-capture.md:3707,3842`). Audit is **at the boundary, not self-reported** — "see what
   every agent is doing" is a property of the choke point, not of the model's honesty.

5. **The control surface is split CLI/UI — and that split is an anti-pattern for v3.** As of
   `onecli@1.3.0` the CLI's `rules create --action` accepts only `block | rate_limit`; the
   **approval policy can only be set in the web UI** at `127.0.0.1:10254` (`CLAUDE.md` "Requiring
   approval"). A security-critical gate configured by clicking, not by a declarative checked-in file,
   is exactly what v3's **constitution-as-YAML** (study 13, §G) exists to avoid.

6. **The divergence verdict.** The article's "iptables allowlist + reload MCP call" is a *simplified
   narrative of OneCLI's behaviour*, and even then not the cross-platform truth: NanoClaw enforces
   egress by **topology** — agents on a Docker `--internal` network with the gateway as the only
   reachable hop, non-root and no `NET_ADMIN`, so the agent can't undo it
   (`src/egress-lockdown.ts:1-95`). No host firewall on the agent at all.

---

## Slice 1 — The capability boundary (gateway architecture & injection-by-match)

### The mechanism

OneCLI is a **transparent MITM HTTPS proxy** *(OneCLI repo: `apps/gateway`, Rust, `:10255`)*. The
agent's HTTP client honours `HTTPS_PROXY`; it calls the real API URL with no credentials; the gateway
intercepts, authenticates the *agent* (not the user) via a `Proxy-Authorization` header, looks up which
stored secret matches by **host + path pattern**, decrypts it (AES-256-GCM, decrypt-at-request-time),
and injects it as a header or query parameter before forwarding *(OneCLI repo: README + secret store
description)*. The matching/identity facts are confirmed from the consumer side: the agent makes bare
calls (`curl https://api.github.com/...` with no auth) and the proxy injects by host+path
(`container/skills/onecli-gateway/SKILL.md`; `bitsafe-ai-os-capture.md:3842`).

The dashboard (`:10254`, Next.js + Prisma/Postgres) is the **policy plane**: it owns agents, secrets,
host/path routes, and approval rules, and the gateway queries it to resolve each request *(OneCLI
repo)*. Two deployment modes: **single-user** (no `NEXTAUTH_SECRET`) or **Google OAuth** for teams;
optional Bitwarden/password-manager vault integration for on-demand injection *(OneCLI repo)*.

A NanoClaw-specific second proxy exists and must not be conflated: a separate Docker-Sandbox MITM at
`:3128` that injects the *Anthropic* key for micro-VM isolation, distinct from the OneCLI gateway at
`:10255` (`bitsafe-ai-os-capture.md:3851,3898`).

### LEARN / AVOID / ORTHOGONAL (Slice 1)

- **LEARN** — **A capability boundary wants to be a single enforced choke point, not a per-tool check.**
  This is the L0g insight ("policy is only ever applied *at* a gate; there is no free-floating policy
  engine") realised at the I/O layer: every outbound capability passes one seam where identity, policy,
  and audit co-locate. v3's commit log is the natural inboard analogue of this outboard choke point.
- **LEARN** — **Match-by-(host, path) is the capability-routing primitive.** It is the runtime twin of
  v3's `*_refs` binding: a request is bound to a credential the same way a gate is bound to a policy —
  by a declared selector, resolved late.
- **AVOID** — **A two-plane split (Rust gateway ⟷ Postgres dashboard) is operational surface v3 should
  not absorb.** OneCLI is *infrastructure the kernel depends on*, not part of the kernel. v3 models the
  **port** (a credential/capability seam) and leaves the proxy as a provider behind it.
- **ORTHOGONAL** — AES-256-GCM, OAuth, Bitwarden integration, the Rust MITM/cert mechanics: pure
  infra, no bearing on the workflow model.

---

## Slice 2 — Produce-not-perform, applied to secrets

### The mechanism

The defining property: **the agent never holds the capability, only requests it.** It sets no auth
headers; it cannot exfiltrate a key because the key is never in its address space — not in env vars,
not in chat context, not on disk (`bitsafe-ai-os-capture.md:3881`). The one hard case — MCP servers
that refuse to start without a local credential file — is solved by writing a `0600` stub whose every
secret value is the literal string `"onecli-managed"`, which the gateway swaps on the wire
(`container/skills/onecli-gateway/SKILL.md`; `bitsafe-ai-os-capture.md:3842`). On a miss the gateway
returns a structured error (`app_not_connected` / 401 / 403) carrying a `connect_url` the agent surfaces
to the human — failure is *informative and inert*, never a silent fallback to an unauthenticated path
(`container/skills/onecli-gateway/SKILL.md`).

### LEARN / AVOID / ORTHOGONAL (Slice 2)

- **LEARN** — **This is the sharpest external proof of v3's produce-not-perform seam.** v3 says an
  action step *produces an intent* (`ActionIntent`, `SpawnIntent`) and the kernel performs the
  privileged act post-commit. OneCLI says the same about *secrets*: the agent produces a credential-less
  request; the boundary performs the privileged substitution. The separation is enforced by the OS/
  network boundary, not by asking the model to behave — exactly v3's "structure over self-report."
- **LEARN** — **Placeholder-with-late-substitution is a reusable pattern for any capability v3 must
  hand to an actor without granting it.** The `"onecli-managed"` stub is the file-system version of
  passing a *handle* (a ref) instead of a *value* — the same discipline as v3's ContextPacket file
  handles (study 9) and `*_refs`.
- **LEARN** — **Inert, informative failure (`connect_url`, no fallback) is the correct gate-miss
  semantics.** Mirrors v3's reject-with-evidence over silent degradation.
- **AVOID** — nothing structural; this slice is pure adoption.

---

## Slice 3 — The approval-hold = a human-decision gate at the I/O boundary

### The mechanism

When a server-side rule marks a credentialed request as needing approval, the gateway **holds the HTTP
connection open** and fires the host's registered `configureManualApproval` callback (the host
long-polls `GET /api/approvals/pending` via `@onecli-sh/sdk`). The host then
(`src/modules/approvals/onecli-approvals.ts:1-70`):

1. delivers an `ask_question` card to the admin channel (approver resolved from the `user_roles` table:
   scoped admins → global admins → owners);
2. persists a **durable `pending_approvals` row** (`action='onecli_credential'`) so the card can be
   edited on expiry and stale rows swept at startup;
3. waits on an in-memory Promise resolved by the admin click or a local expiry timer;
4. on expiry edits the card to "Expired" and returns `deny`.

This is, structurally, v3's **LC2-style human-decision gate** (`HumanDecisionRequest` / `DECISION_REQUEST`):
a request parks, a durable record is written, a human disposition routes it, expiry is a real path.

### LEARN / AVOID / ORTHOGONAL (Slice 3)

- **LEARN** — **The credential-approval flow is a perfect concrete L2/L3 human gate**, and it confirms
  the survey's H4 "human-in-the-loop hook" (study 13, §L3) with a working payload: durable pending row,
  approver-resolution order, explicit expiry disposition. v3's DECISION_REQUEST should carry exactly
  these (record + approver-policy + timeout-route).
- **AVOID — the transport.** Approval here means **holding a live socket open** until a human clicks; if
  the host callback is down or throws, *every credentialed call hangs until the gateway times out*
  (`CLAUDE.md` "Requiring approval": "every credentialed call hangs until the gateway times out"). v3's
  model is strictly better: **durably park the instance** (`WAITING(decision)`), let the actor's request
  fail-fast or suspend, and resume on the committed disposition — no dangling connection coupling
  liveness to a human's attention span.
- **AVOID — split-brain wiring.** "If the gateway has no approval rule the host callback never fires;
  if the host callback isn't running the gateway hangs" (`CLAUDE.md`). Two independently-configured
  sides of one gate is a correctness hazard. v3's single committed gate definition (one record, one
  evaluator) avoids the two-sided desync.
- **ORTHOGONAL** — the Telegram 64-byte `callback_data` workaround (short `oa-` ids) is a channel
  detail (L8), not a gate concept.

---

## Slice 4 — Per-identity policy, fail-closed wiring, audit-at-the-boundary

### The mechanism

Each consumer group is a **distinct OneCLI agent identity** with its own scoped access token, secret
mode, policies, and rate-limits (`bitsafe-ai-os-capture.md:3842`; `CLAUDE.md` "Secret modes"). Secret
mode is `all` (every host-matching vault secret injected — zero per-agent setup) or `selective`
(nothing until assigned; a vault-present credential then shows up as a `401`), changed via
`onecli agents set-secret-mode` / `set-secrets` with **no container restart** (lookup is per-request).
Rules are per-agent: `rules create --action {block|rate_limit}` (`CLAUDE.md`). Spawn is **fail-closed**:
`onecli.ensureAgent()` + `applyContainerConfig()` refuse to spawn if the gateway can't be wired
(`src/container-runner.ts`; `bitsafe-ai-os-capture.md:3707`). The gateway version is **pinned and
upgraded separately** from the harness (`versions.json: onecli-gateway 1.36.0`;
`bitsafe-ai-os-capture.md` CHANGELOG: "the gateway is a separate component").

### LEARN / AVOID / ORTHOGONAL (Slice 4)

- **LEARN** — **Identity-scoped policy + per-request resolution = the right granularity for v3's L7/L13.**
  Policy attaches to an *identity*, is resolved late (per request, no restart), and audit is keyed on
  that identity. This is the runtime analogue of v3's per-binding `modes` and per-instance evidence.
- **LEARN** — **Fail-closed at wiring time is the same discipline as v3's load-time `validate_*` gates.**
  "Refuse to start rather than start with open egress" is the I/O-boundary twin of `validate_child_steps`
  / `validate_action_steps` rejecting at definition load. Adopt the framing: *a capability seam that
  can't be established is a hard reject, never a soft default.*
- **LEARN** — **Audit-at-the-boundary, not self-report** is the L13 thesis. The survey warns "few sign
  or hash records" (study 13, §G); OneCLI's boundary log is structurally tamper-resistant *because the
  agent can't reach it*, which is the property v3's commit log must also have (out-of-process, below the
  actor).
- **AVOID** — **The CLI/UI control split** (Slice/Exec-summary §5): approval policy only settable in the
  web UI is non-reproducible, non-reviewable config. v3's gate/policy must be a **checked-in declarative
  artifact** (the "constitution"), diffable and version-gated — never click-ops.
- **ORTHOGONAL** — pinning/upgrade choreography of a separate component is deployment ops.

---

## Slice 5 — The egress topology and the BitSafe divergence anchor

### The mechanism

NanoClaw's optional egress lockdown (`NANOCLAW_EGRESS_LOCKDOWN=true`) does **not** use a host firewall
on the agent. It places the agent on a Docker **`--internal`** network (`nanoclaw-egress`) with **no
internet route**, and attaches the OneCLI gateway with alias `host.docker.internal` so the proxy is the
**only reachable hop**. The agent is non-root with no `NET_ADMIN`, so it cannot undo the membership;
the setup is idempotent and self-healing, and **throws `EgressLockdownError` rather than spawning with
open egress** (`src/egress-lockdown.ts:1-95`; `bitsafe-ai-os-capture.md:3843`). On macOS the underlying
container networking is `pfctl` NAT + `sysctl net.inet.ip.forwarding`, **not** `iptables`
(`docs/APPLE-CONTAINER-NETWORKING.md`).

### The divergence, resolved

| Claim (BitSafe article) | First-party reality |
|---|---|
| "iptables rules applied when the container starts" | **Network-membership topology** (`--internal` net + mandatory proxy hop); no agent-side firewall. `iptables` is at most a Linux/Docker lower-layer detail; macOS uses `pfctl`. |
| "allowlist read from a config file, reloaded live" | The **domain allowlist + policy live in OneCLI** (the separate gateway/dashboard), not in the NanoClaw repo. |
| "a reload MCP call is required to apply it" | No such MCP tool in the NanoClaw toolset; the reload/policy handshake is **OneCLI-internal** (CLI/web UI). |

The article's sentence is a **simplified, single-platform narrative of a separate component's
behaviour.** The portable architecture is: *agent has no route; the only egress is an authenticated,
policy-enforcing, auditing proxy; failure to establish that = no spawn.*

### LEARN / AVOID / ORTHOGONAL (Slice 5)

- **LEARN** — **Enforce capability boundaries by removing the capability, not by filtering it.** A
  topology where the privileged path is the *only* path (and the actor lacks the permission to change
  topology) is stronger than a rule set the actor's process could tamper with. v3's analogue: the kernel
  performs side effects post-commit; the actor never has a direct handle to perform them itself.
- **AVOID** — **Trusting prose over code for security mechanism.** The divergence is a reminder for the
  synthesis: a system's marketing description of its security layer can diverge from its implementation
  *and* its cross-platform reality.
- **ORTHOGONAL** — the specific `pfctl`/`iptables`/`vmnet` packet plumbing is host-OS detail.

---

## Consolidated Direction for v3

| v3 level | What OneCLI contributes | Verdict |
|---|---|---|
| **L7 (credential / capability)** | The **reference implementation** of the survey's "credential never travels" pattern: vault + placeholder + late substitution at an enforced boundary; identity-scoped, per-request resolution; inert `connect_url` miss. | **Adopt the pattern + the port abstraction.** Model the seam; the proxy is a provider behind it. |
| **L2 / L3 / LC2 DECISION_REQUEST** | A working **human-decision gate at the I/O boundary**: durable pending record, approver-resolution order, explicit expiry disposition. | **Learn the shape; reject the transport** (durable park, not a held socket; one committed gate, not two desyncing sides). |
| **L0a / load-time validation** | **Fail-closed wiring** — refuse to spawn if the capability seam can't be established. | **Adopt the framing** as the I/O twin of `validate_*` rejects. |
| **L13 (governance / audit)** | **Audit-at-the-boundary** the agent can't reach; the choke-point owns the trail. | **Adopt**; pairs with study-13's "hash/sign the ledger." |
| **G / policy-config ("constitution")** | A **cautionary** data point: security-critical policy settable only via web UI. | **AVOID** click-ops; v3 policy is a checked-in declarative artifact. |
| **Kernel scope** | OneCLI is *infrastructure the kernel depends on*, not kernel. | **Keep it a provider/port**; do not absorb a credential proxy. |

---

## Reconsiderations for v3

1. **Name the capability/credential port explicitly (L7).** Studies 3 (paperclip "credential broker"),
   13 (survey L7 "credential never travels"), and now 14 (OneCLI, the shipped instance) triangulate the
   same seam. v3 should declare it a **first-class port** — `CapabilityIntent` produced by the actor,
   performed by the kernel/provider — symmetric with `ActionIntent`/`SpawnIntent`. The agent names a
   capability by ref; it never receives the secret.

2. **Inherit the named *unsolved* part: secret lifecycle over long horizons.** Both the survey and
   OneCLI's design leave open how a credential that **expires or is revoked mid-trajectory** is renewed
   *without ever entering model context* (study 13, §L7). For v3's L4 child instances and long-running
   parents this is a real correctness question — a parked instance may resume against a dead token. v3
   should treat "capability freshness at resume" as an explicit concern of the L7 port, not an
   afterthought.

3. **The approval-hold argues for v3's park model as a feature, not a default.** OneCLI's
   socket-holding approval (liveness coupled to human attention; two-sided desync) is precisely the
   failure mode v3's **durable WAITING(decision) + committed disposition** avoids. Use this as a concrete
   "why durable park beats synchronous hold" example in `approach.md`.

4. **Add the divergence to the cross-source discipline.** Record (in `_synthesis.md`) that a system's
   description of its own security layer diverged from its code and its cross-platform reality — a
   reminder that mechanism claims get verified against source, not prose.

---

## Caveats

- **Citation asymmetry.** OneCLI-internal facts (Rust gateway, ports, AES-256-GCM, dashboard, directory
  layout, stack percentages, Apache-2.0) are from a **repo/README web read**, not a local line-level
  audit — cited as *(OneCLI repo)*. The **consumer-side mechanics** (egress topology, approval flow,
  placeholder stubs, fail-closed spawn, secret modes, the CLI/UI policy split) are **line-precise** from
  the NanoClaw checkout and the verbatim capture, and are the load-bearing evidence. Where a claim rests
  only on the repo read (e.g. exact rule-engine internals, MITM cert-trust mechanics), it is flagged as
  not line-verified.
- **Version drift.** Behaviour is pinned to `onecli-gateway 1.36.0` / `@onecli-sh/sdk` as seen in the
  NanoClaw checkout (2026-06-21). The CLI's approval gap ("`rules create` has only `block|rate_limit`")
  is explicitly version-bound (`onecli@1.3.0`) and may close — the *shape* of the lesson (declarative
  over click-ops) is version-independent; the specific gap may not persist.
- **Single consumer.** All consumer-side evidence is from one integrator (NanoClaw/BitSafe). Patterns
  that look like OneCLI design may be NanoClaw conventions layered on top (e.g. the `user_roles`
  approver-resolution order is NanoClaw's, not OneCLI's).
- **Scope.** OneCLI is one layer, not a kernel — this study is intentionally narrower than the
  engine studies (1–13) and adds **no new central bet**; it sharpens the existing **L7/L2/L13** verdicts
  and supplies a divergence anchor.
