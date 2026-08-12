# Study — AI Maestro (23blocks-OS/ai-maestro): a production multi-agent control plane with no kernel

**Source:** <https://github.com/23blocks-OS/ai-maestro> @ **v0.36.27**, HEAD `a6913da` (2026-08-07),
read as a shallow clone at `/Users/felho/dev/repos-to-learn-from/ai-maestro`; plugin submodule
`23blocks-OS/ai-maestro-plugins` @ `9b13ad6`. MIT, 745 stars, 96 forks, actively developed.
**Size:** ~152K LOC TS/JS/shell (excluding `node_modules`) + 60 docs + a 50-script / 8-skill
Claude Code plugin.
**Type:** codebase reverse-engineering study, seven parallel source-verified slices, all
mechanism claims carrying `file:line` citations.
**Why it is in this series:** ai-maestro is a *shipping* product occupying exactly the outer
levels the corpus is thinnest on — **L8 channels** (a named public agent-messaging protocol),
**L10 federation** (a leaderless multi-machine peer mesh), **L13 trust** (DID-based cryptographic
agent identity), plus agent **mobility between machines**. Three of those are levels where 16
prior studies found little or no prior art. It is also, on the inside, the clearest available
demonstration of what a system looks like when the kernel those outer levels rest on is simply
absent.

---

## Executive summary — eight load-bearing findings

**1. The half-primitive scatter — the study's central finding, and a review heuristic that falls
out of it.** Across all seven slices, independently, the same shape recurs: a kernel primitive's
*form* exists without its *enforcement*. `AgentDirectory.version` is incremented on every write
(`lib/agent-directory.ts:113`) and read only to be displayed (`:259`). `db_version` is written
(`lib/cozo-db.ts:139`) and never read. `PortableManifest.checksum` is declared
(`types/portable.ts:51`) and never set or verified. `signatureVerified` is computed on the
federation ingress and never branched on for admission — it only picks a trust label
(`services/amp-service.ts:1890-1938`). `Task.isBlocked` is computed and enforced only in React
(`components/kanban/KanbanCard.tsx:33`), never in the server validator. `AgentRuntime` is a
declared provider interface with one implementor and a swap point that production never calls
(`lib/agent-runtime.ts:27-54`, `:254`). `healthCheckUrl`, `prefer_websocket`, `thread_id`,
`maxRetries`, `timeoutMs`, `nightlyTime`, the `'provisioning'` status, `getRevocationList()`,
`trackMessageId()`, the fully-tested `meeting-inject-queue`, and the correct-but-unreferenced
`lib/headless-terminal.mjs` are all written-and-never-read or built-and-never-wired.

This is not a list of bugs; it is one pattern with sixteen instances. Each individually reads as
diligence in review. **The transferable rule for v3: for every version, id, ledger, verdict or
readiness field in a design, name the line that *reads* it. If none exists, the field is
documentation, not a mechanism.** This is the cheapest possible guard against building the shape
of a kernel without the kernel, and this repo is its empirical justification.

**2. Two identity planes in one product, never connected — a natural experiment in signed
provenance.** Agents get `did:key:z…` derived from an Ed25519 public key, with the design intent
stated in source: *"an id/key mismatch is unrepresentable rather than merely detected"*
(`lib/amp-did.ts:5-9`). Hosts get `os.hostname().toLowerCase()` (`lib/hosts-config.ts:139-141`).
The keyed layer needs no guard code. The named layer spends ~200 lines guessing which hostname is
itself — an alias cache, a five-strategy `isSelf()`, IP-overlap matching, Docker-bridge-IP
exclusions, hostname auto-migration (`lib/hosts-config.ts:24-66`, `:228-333`, `:462-495`,
`:735-763`) — and still cannot survive a peer's IP change, because the only URL-refresh path is
gated on a state no code ever writes (`services/hosts-service.ts:846-861`). Meanwhile the
*directory* — the thing that answers "where does agent X live" — is keyed by a bare lowercase
display name in a flat last-writer-wins map (`lib/agent-directory.ts:33-53`, `:206-213`), so two
hosts each running an agent named `backend` collapse silently, with `hosts.json` array order
deciding the winner. **The strongest argument for v3's L10/L11/L14 signed-provenance direction is
delivered as a controlled comparison inside a single codebase.**

**3. The corpus's first genuine cryptographic agent identity — and its boundary fails open.**
L13 previously had no prior art at all. Five primitives here are worth lifting: (a) the identifier
is **derived server-side from the key and never client-asserted** (`services/amp-service.ts:571-575`);
(b) a **boot-time identity-integrity conformance check** fails on shared fingerprints, shared
addresses, shared DIDs, or did↔key drift (`services/diagnostics-service.ts:147-186`), motivated by
a named real incident — *"the contamination bug where a machine keypair was copied into many agent
dirs"* (`:142-145`); (c) **TOFU with refuse-to-overwrite** on key conflict
(`lib/amp-known-keys.ts:49-74`); (d) **rotation with proof-of-possession** that atomically updates
the TOFU ledger *and* revokes the superseded fingerprint (`services/amp-service.ts:1776-1830`) —
the cleanest rotation story in the corpus; (e) a **durable** replay seen-set surviving restart
(`lib/amp-replay.ts:32-63`), where the corpus's usual finding is memory-only.

Against that: `AMP_REQUIRE_SIGNATURES` **defaults off** and is documented in no file, script or
`.env.example` (`services/amp-service.ts:869-873`); the cross-host federation ingress requires no
credential of any kind and verifies signatures against a key supplied **in the same request body**
(`:1852-1857`, `:1875`, `:1938`); an `X-Forwarded-From` header naming any host in `hosts.json`
converts an unauthenticated request into an authenticated one, with the log line saying so out
loud — *"signature NOT verified -- trusted host"* (`:798-809`); and revocation has no distribution
path (`lib/amp-revocation.ts:69-71`, zero production callers). **The sharpest single lesson: a
verification result that selects a label instead of gating admission is not a control.**

**4. L9 fuzzy correlation gets its first prior art — and it arrives as a matched pair with
opposite policies.** Seventeen systems in, still nobody does semantic correlation, and ai-maestro
does not close the gap: nothing in it blocks on a reply, `thread_id` is written by every producer
and matched on by nothing, and no durable wait state exists anywhere. But it contains two fuzzy
*identity* resolvers with contradictory ambiguity rules. `getAgentByPartialName` returns
`matches[0]` arbitrarily on a tie (`lib/agent-registry.ts:373-389`). `resolveByCwd` scores by
longest prefix and **abstains on a tie**, with a comment naming the incident that produced the
rule — *"every session under `$HOME` becoming whatever agent claimed home"*
(`plugin/plugins/ai-maestro/scripts/ai-maestro-hook.cjs:47-63`). The abstaining one was written
after being burned. **v3's matcher must return `Matched(id) | Ambiguous(candidates) | NoMatch`,
never a bare `Option` — abstain-with-a-reason beats first-match, and that is an empirically earned
rule rather than a design preference.**

**5. The nanoclaw delivery bug, independently reproduced — with a sharper mechanism.** `deliver()`
returns an explicit, documented `DeliveryResult` and the AMP protocol front door drops it on the
floor: `deliverLocally` is `Promise<void>` (`services/amp-service.ts:401-416`), and its caller
answers `status: 'delivered'` unconditionally (`:1155-1165`). The federation path has the same hole
(`:1934-1955`). Thirty lines away in a sibling module the same contract *is* honoured
(`lib/message-send.ts:323-326`). nanoclaw's version was an ill-defined return being misread; here
the type existed and dropping it required writing **less** code. **The generalization: the hazard
is not an API shape, it is a non-throwing failure value crossing a module boundary. v3's answer —
only an outbox row transition may mark delivery — is structural rather than disciplinary, which is
exactly why it holds.**

**6. The best last-mile in the corpus, and two of four settled L8 elements independently derived.**
After the durable write, `deliver()` walks a four-tier capability ladder — WebSocket → streaming
session → **MCP channel turn-injection** → tmux `send-keys` fallback
(`lib/message-delivery.ts:66-142`). Tier three is the novel one: an MCP server runs *inside* the
agent's own session, declares `capabilities.experimental['claude/channel']`, self-registers a port
to `~/.aimaestro/channels/<agentId>.json`, and converts an inbound POST into
`notifications/claude/channel` — **starting a real turn on an idle agent with no keystrokes**
(`lib/amp-channel-server.mjs:60-88`, `lib/channel-bridge.mjs:36-52`). A fifth, orthogonal mechanism
forces inbox processing at turn end via a Stop-hook `decision: 'block'` with a 200-id dedup memory
(`ai-maestro-hook.cjs:530-566`). The agent-harness survey was right that no system has a
first-class channels *contract*; this repo has the corpus's best answer to the *mechanical*
question v3's L8 must solve — how an EventEnvelope becomes a turn in a recipient LLM.
Independently derived from the corpus-settled shape: the **two-struct envelope**
(`{envelope, payload}`, enforced in type, on wire and on disk) and the **relay contract**
(queue / pending / ack / attempt-count / TTL). Absent: the two channel classes, and declared
capability degradation — capabilities here are *probed*, never declared.

**7. A declared-but-unhonoured provider contract — the sharpest L0e result, and it inverts
gastown's.** gastown *considered* a pluggable backend interface and **rejected** it. ai-maestro
**wrote** it, shipped a swap point, threaded ~25 call sites through it — and when a real second
backend arrived, built it as a copy-paste sibling of free functions whose own comments say they
*"mirror"* the interface (`lib/container-utils.ts:93-98`), dispatched by three
`if (provider === 'local-container')` branches (`services/agents-core-service.ts:1024/1669/1960`).
Modes three and four (EC2, Fargate) received provisioning and **no lifecycle branches at all**.
The reason is visible in the interface itself: its operations are `isInCopyMode`,
`cancelCopyMode`, `capturePane`, `sendKeys`, `setEnvironment` (`lib/agent-runtime.ts:36-49`) — every
one a tmux verb. **An abstraction whose vocabulary is one backend's CLI cannot absorb a second, so
writing it early buys nothing.** Two conclusions for v3's L0e: keep observe/attach/write *out* of
the provider contract (they are what made this one unimplementable twice), and ship the MVP with
two providers rather than one, or the git-worktree MVP will produce a worktree-shaped interface
exactly as tmux produced a tmux-shaped one.

**8. Not a kernel — a view/control plane over live processes; and v3 is precisely the layer it does
not have.** No idempotency ledger, no CAS, no lock, no transaction boundary, no canonical
transcript, and no reconciliation that repairs (zero grep hits for
`idempot|op_id|expected_version|flock|O_EXCL` in any storage path). Truth is split three ways with
no arbiter — tmux for liveness, `registry.json` for identity, a volatile `globalThis` Map for
status, so after a restart every live agent renders `disconnected`
(`services/sessions-service.ts:213`). Every multi-write operation is **effects-first** and returns
HTTP 200 regardless: `createSession` fires `tmux new-session` at `:675`, writes the record at
`:684`, swallows three step failures, and returns `success: true` at `:759`. The codebase says so
itself — *"Atomicity caveat… the operator is left with the old container gone and the old agent
soft-deleted but no new agent. Recovery requires manual undelete"*
(`services/agents-docker-service.ts:1477-1486`). **The absence is visible without a kernel-shaped
lens**, because the missing layer left artifacts: a comment naming a tear window and a manual
recovery procedure, a version incremented and never compared, a repair script named in an error
message and never written (`lib/cozo-schema-simple.ts:302`), and a recovery routine that logs
`✅ Database initialized` without touching a database (`lib/agent-db-sync.mjs:55-102`).

---

## 1. What ai-maestro is, precisely

A browser dashboard ("mission control") for running and watching many terminal AI agents. Next.js
14 App Router + a custom `server.mjs` (107 KB) carrying the WebSocket/PTY layer, xterm.js in the
browser, `node-pty` on the host, tmux as the substrate. Four deployment modes — host tmux, local
Docker, AWS EC2, AWS ECS Fargate — though in code only the first two are lifecycle-managed. A
leaderless peer mesh lets any node display and drive agents on any other. AMP (the Agent Messaging
Protocol, spec at agentmessaging.org) gives agents email-shaped inter-agent messaging with
Ed25519 signatures and DID identities. A per-agent CozoDB holds a conversation RAG index, an
LLM-distilled long-term memory, and a `ts-morph`-built code graph. A teams/meetings/Kanban layer
sits on top. A Claude Code plugin ships 8 skills and 50 CLI scripts.

The origin story is stated in the README and matters for reading the code: the author was running
35 agents in terminals and became the human message bus between them. **The product is an answer to
a coordination-visibility problem, not to a durability problem** — and almost every finding below
becomes a scope boundary rather than a defect once that is held in view. The interesting question
is not "why is there no kernel" but "what does the absence look like from inside a system that is
otherwise doing real work".

---

## 2. Kernel spectrum placement

```
symphony ── ai-maestro ── nanoclaw ── hermes ── vibe-kanban ── honcho ── paperclip ── DBOS ── LangGraph ── CHASM ── TEMPORAL
              ▲
```

**Below the light end, below nanoclaw, beside symphony.** Placement evidence: the irreversible
effect always precedes the record; the record write is a whole-file `writeFileSync` with no
tmp+rename (`lib/agent-registry.ts:211`); ~15 durable stores across **three** home directories
(`~/.aimaestro`, `~/.ai-maestro` — one live dashed singleton at `lib/session-persistence.ts:14` —
and `~/.agent-messaging`) with genuinely concurrent external writers and no coordination; and the
sole recovery routine reports success without acting.

Below nanoclaw specifically because nanoclaw at least mutated SQLite, which buys per-statement
atomicity for free, and had two single-writer files; ai-maestro's primary store is a hand-rolled
JSON array rewritten whole. Beside symphony because both outsource durability — but symphony
outsources to *one* substrate, and ai-maestro to five that can disagree (tmux, Docker, Claude
Code's JSONL, the filesystem, the browser's localStorage), with nothing detecting the
disagreement.

Three things are **unexpectedly disciplined** and should not be flattened out of the record:

1. **Atomic tmp+rename on exactly the three AMP security files** — the name→UUID index, the
   known-keys TOFU ledger, the replay seen-set (`lib/amp-inbox-writer.ts:47-49`,
   `lib/amp-known-keys.ts:40-45`, `lib/amp-replay.ts:35-37`) — with a comment about half-written
   readers. They knew the technique and applied it where a written spec forced them to, and
   nowhere else. That is a useful observation about how discipline propagates: **it follows
   specifications, not code review.**
2. **A clean canonical/derived split.** CozoDB holds nothing that cannot be rebuilt from Claude
   Code's JSONL, and `last_indexed_message_count` (`lib/cozo-schema-simple.ts:76-77`) is a real
   resumable high-water mark. This containment is why their destructive drop-and-rebuild
   migrations (`lib/cozo-schema-simple.ts:109`, `lib/cozo-schema-rag.ts:191`, no transaction, no
   backup) have not been fatal. **It is direct support for v3's "transcript is canonical,
   everything else is a projection" bet** — that split is what makes a destructive rebuild
   survivable.
3. **Stale-but-shown handled correctly in the browser cache** — every cached remote agent is
   stamped `_cached: true` at the cache boundary (`lib/agent-cache.ts:96-99`) and the UI renders
   the badge (`components/AgentList.tsx:1337`). Better than several heavier systems in the corpus.
   (The failure moved elsewhere: see §8.)

**Minimum delta to reach DBOS's light end**, which is unusually small and worth recording: the
client already supplies a stable UUID (`lib/agent-registry.ts:457`), and `:462` *rejects* the
duplicate. Turning that `throw` into `return existing` makes create idempotent today with no new
storage. Add an `ops(instance_id, op_id) => status, result` table to the per-agent SQLite store
already present, and swap `sessions-service.ts:675` with `:684` so the record precedes the effect.
Steps one to three are days of work; only the status CAS is architectural, because the JSON file
layout cannot support it.

---

## 3. The half-primitive scatter

This deserves its own section because it is the finding that generalizes furthest, and because it
was reached independently by six of seven slices before being named.

| Primitive shape | Where it exists | Where it should be read | Citation |
|---|---|---|---|
| Optimistic-concurrency version | `AgentDirectory.version`, incremented every write, comment says "increments on changes" | never in a write predicate; only in a stats display | `lib/agent-directory.ts:50-54, 113, 259` |
| Schema version | `db_version: '0.1.0'` written into `agent_metadata` | never read; schema conflicts are swallowed as success | `lib/cozo-db.ts:139`; `lib/cozo-schema-memory.ts:44-54` |
| Bundle integrity | `PortableManifest.checksum?: SHA-256 of contents` | never set on export, never verified on import | `types/portable.ts:51` |
| Signature verdict | `signatureVerified` computed on federation ingress | selects `senderPublicKeyHex` label; never gates delivery | `services/amp-service.ts:1890-1905, 1938` |
| Dependency enforcement | `Task.isBlocked` computed on every read | enforced in `draggable={!task.isBlocked}` only; server validator never consults it | `lib/task-registry.ts:69-72`; `components/kanban/KanbanCard.tsx:33`; `services/teams-service.ts:249-266` |
| Provider abstraction | `interface AgentRuntime` + `setRuntime()` swap point | one implementor; `setRuntime` never called in production | `lib/agent-runtime.ts:27-54, 248, 254` |
| Readiness state | `status?: 'provisioning' \| …` in the type | never assigned anywhere | `types/agent.ts:335` |
| Health probe | `healthCheckUrl` written by both cloud providers | never consumed; the one health function takes a URL from a query param | `services/agents-cloud-service.ts:437`; `services/agents-core-service.ts:2134` |
| Correlation key | `thread_id` written by every producer | zero matchers, zero queries, zero grouping; and computed wrongly server-side | `services/amp-service.ts:937`; grep across repo |
| Capability declaration | `delivery.prefer_websocket` on registration | no reader; capabilities are probed instead | `lib/types/amp.ts:223-228` |
| Retry policy | `maxRetries`, `timeoutMs` on `Schedule` | never read by the executor | `types/schedule.ts:19-20`; `lib/schedule-executor.ts` |
| Revocation distribution | `getRevocationList()` exported "for federation propagation" | zero production callers | `lib/amp-revocation.ts:69-71` |
| Delivery dedup | `trackMessageId()` file-per-id ledger | dead code, no callers; and fails open on write error | `services/amp-service.ts:193-211` |
| Injection serialization | `meeting-inject-queue` FIFO, 179 tests, HTTP drain wired | **no producer anywhere in the repo** | `lib/meeting-inject-queue.ts:26-49` |
| Lossless terminal replay | `headless-terminal.mjs`, correct VS Code-style serialize-on-connect, deps installed | zero references repo-wide | `lib/headless-terminal.mjs` |
| Memory push channel | brain-inbox JSONL, header says "the cortex polls this via the hook" | the hook contains zero occurrences of `brain` | `lib/cerebellum/brain-inbox.ts:4-36` |
| Consolidation schedule config | `MemorySettings.consolidation.{schedule,nightlyTime}` | no reader; the live knob is a different field in a different file | `lib/memory/types.ts:157-180` vs `lib/agent.ts:178` |
| Repair procedure | error text: *"Run `node scripts/migrate-agent-databases.mjs` to fix schema issues"* | the file does not exist | `lib/cozo-schema-simple.ts:302` |

Two observations that make this more than an inventory.

**First, the pattern is not laziness — it is the signature of a missing layer.** Each entry is a
place where someone reached for a kernel primitive, produced its shape, and stopped because there
was nothing underneath to attach it to. A `version` field has nowhere to be compared when writes
are whole-file `writeFileSync`. A `checksum` has no natural verification point when transfer is
"HTTP GET a zip, HTTP POST the zip". A provider interface cannot be honoured when the observe-seam
is inside it. **This is what "no L0a" looks like from the inside: not chaos, but a scatter of
half-primitives that each individually look like diligence.**

**Second, the same team applied full rigour where a written specification demanded it.** The three
atomic writers, the fail-closed 403/409 branches on invalid signature / key conflict / revocation /
replay, the proof-of-possession rotation, the boot-time identity-integrity check — all of these are
in the AMP security surface, which has an external spec. Discipline followed the spec boundary
exactly. For v3's implementation plane this is an argument for the model ledger and the
implementation contract being *binding artifacts* rather than guidance: the corpus now has a
worked example of a competent team applying two different standards inside one repository,
separated precisely by whether a written contract existed.

---

## 4. Identity — two planes, never connected

### 4.1 The host plane (L10)

A "peer" is `os.hostname().toLowerCase().replace(/\.local$/,'')` (`lib/hosts-config.ts:139-141`),
persisted to `~/.aimaestro/hosts.json`. `PeerRegistrationRequest` carries
`{host:{id,name,url,aliases}, source:{initiator,timestamp,propagationId,propagationDepth}}` and
nothing signed (`types/host-sync.ts:39-55`).

**Discovery is real and works**, and is worth recording as mechanism: back-registration when you
add a peer, bidirectional peer-list exchange, transitive propagation to your existing peers, and a
5-second-post-boot re-announce (`lib/host-sync.ts:244-257`, `:406-527`, `:535-613`;
`server.mjs:2449-2485`). Loop control is a `propagationId` in a 60-second TTL set plus
`MAX_PROPAGATION_DEPTH = 3`, checked on both sides. **That depth-limit + propagation-id pair is a
cheap, correct anti-amplification control and is a genuine LEARN** — v3 needs exactly it if
contributions ever propagate transitively.

Everything around it is a convenience topology, and the repo's own docs say so:
`SECURITY.md:20` — *"No authentication required — anyone on your WiFi can access it"*;
`docs/CONCEPTS.md:299` — *"No user authentication (anyone with access can control all agents)"*.

- **Join is unauthenticated assertion.** `registerPeer()` validates field presence, propagation
  dedup, and "not me" — then writes the caller into `hosts.json`
  (`services/hosts-service.ts:734-989`, write at `:928-941`). No middleware exists in the repo;
  `next.config.js:24-37` sets `Access-Control-Allow-Origin: *`.
- **"Eventually consistent" is asserted in three docs and implemented nowhere.** No convergence
  loop, no retry (`lib/host-sync-queue.ts`, promised at `docs/HOST-SYNC-PLAN.md:222`, does not
  exist), no version or clock field on `Host`, no tombstones. Unreachable peers are pushed onto
  `unreachable[]` and dropped (`services/hosts-service.ts:1180-1186`). Contradictory records never
  reconcile: `registerPeer` short-circuits on a known id **without updating the stored URL**
  (`:885-901`). **Membership is add-only: you cannot leave and you cannot evict** — a deleted peer
  re-registers at its own next startup or is re-gossiped by any third node.
- **Disabling a peer is actively destructive.** `validateHosts()` filters `enabled === false`
  before caching (`lib/hosts-config.ts:446-449`) while `addHost`/`updateHost`/`deleteHost` read
  that filtered list and write the whole array back (`:771`, `:825`, `:934`). By construction, any
  host addition erases every manually-disabled host from disk, and the erased peer is re-added as
  `enabled: true` by the next exchange. The operator's "I do not want this peer" is not durable
  against the mesh.
- **No `contribution` analogue.** Crossing the boundary means the complete unfiltered `Agent`
  record set — working directories, OS username, CLI args, metrics, hooks
  (`types/agent.ts:212-301`) — fanned out to every host
  (`services/agents-core-service.ts:1220-1246`), plus browser-direct peer fetches enabled by the
  wildcard CORS header. The one boundary-ish object is the `organization` string, and it is
  **fail-open by omission**: the entire check is gated on
  `if (body.organization && body.organizationSetAt && body.organizationSetBy)`
  (`services/hosts-service.ts:811`), so a caller that omits the field skips the domain check
  entirely.
- **Authority is fully transitive.** `createSession` forwards a plain POST to
  `${peer}/api/sessions/create` (`services/sessions-service.ts:615-641`); keystrokes go browser →
  local `/term?host=peerId` → `handleRemoteWorker` → the peer's PTY (`server.mjs:956-1000`,
  `:1709-1717`). Nothing on any of these paths carries a principal. `source.initiator`
  (`types/host-sync.ts:41-45`) is the right *slot* with no proof in it.

### 4.2 The agent plane (L11/L13)

`did:key:z<base58btc(0xed01 || raw-32-byte-ed25519-pubkey)>` (`lib/amp-did.ts:40-47`), **derived
server-side and never client-supplied**, with the reason in the comment
(`services/amp-service.ts:571-575`). Private key at
`~/.aimaestro/agents/{agentId}/keys/private.pem`, mode `0600` inside a `0700` directory
(`lib/amp-keys.ts:63-74, 142-155`). The DID is bound to the key alone (portable); the AMP *address*
is bound to `(agent-name, host-id)` (`:239-261`) — so identity is portable and address is not,
which is the right split.

**And the directory that answers "where does agent X live" is keyed by neither.** It is
`Record<name.toLowerCase(), {…, ampAddress, …}>` (`lib/agent-directory.ts:33-53`), a flat map with
local-beats-remote precedence and remote-overwrites-remote otherwise (`:196-213`), resolved in
`hosts.json` array order. `qualifiedName = name@hostId` is computed — for display only
(`services/agents-core-service.ts:1327-1342`). **The self-certifying identity exists one module
away and is carried in the directory as an optional field, never as the key.**

### 4.3 Why this is the study's most valuable comparison

Against gastown/Wasteland — the corpus's only prior federation reference — the difference is
instructive. Gastown at least had a *claim*: a durable attributable assertion with a known
concurrency weakness ("a claim is intent, not a lock"). ai-maestro's mesh has **no assertion object
at all**: membership is an unsigned side effect of a POST, and there is no claim to weaken and no
way to un-claim. But one layer up it has the self-certifying identity gastown's reputation stamps
gestured at.

**Net: this repo ships the federation *transport* and the *identity primitive* as two working
pieces that were never connected to each other. Connecting them is exactly v3's L10 job.** And the
harness survey's "no first-class federation anywhere" finding survives, with a refinement worth
recording: *the transport is a weekend; the hard part is the boundary object, and shipping the
transport without one produces a system that cannot add one later without breaking every
deployment* — `types/host-sync.ts` has no room for a credential, and every peer already trusts
every peer.

---

## 5. The trust layer (L13 / L7 / the injection boundary)

### 5.1 Control-by-control posture

The four genuinely boundary-shaped controls — deterministic, in the path, fail-closed, default-on —
are worth naming precisely, because they are what v3's L2/L13 wants and the corpus has been short
of:

| Control | Site | Behaviour |
|---|---|---|
| Invalid signature | `services/amp-service.ts:994-1000` | 403 unconditionally, independent of the strictness flag |
| Key conflict (TOFU) | `services/amp-service.ts:967-978`; `lib/amp-known-keys.ts:49-74` | 409, refuses to overwrite a differing fingerprint |
| Key revoked | `services/amp-service.ts:960-966` | 403 |
| Replay | `services/amp-service.ts:1881`; `lib/amp-replay.ts:44-63` | 409/400 against a **durable** seen-set |

The **invalid-vs-absent split** is itself a LEARN: a malformed credential is rejected always, while
a missing credential is allowed under the default profile. That is a coherent two-axis policy v3's
L2 gate could adopt — *deny on bad proof always; ask/allow on missing proof only under an explicit
profile* — provided the profile is a stated decision rather than a backward-compatibility default.

Against that, the fail-open set: unauthenticated federation ingress; the `X-Forwarded-From`
mesh-trust bypass, which additionally excludes the request from key-conflict, revocation and
signature checks (`:956, 1002, 1010`); anonymous `/api/v1/register` issuing a live API key;
registration name-collision with an existing **non-AMP** agent silently *adopting* it and binding
the caller's key (`:648-651`); and ~108 `app/api/**` routes with no authentication at all on a
default `0.0.0.0:23000` bind, including tmux send-keys, agent spawn and peer registration.

### 5.2 The signing detail that matters for v3

What is signed is **not the envelope**. It is a pipe-joined six-field string:

```ts
[envelope.from, envelope.to, envelope.subject, priority, in_reply_to, payloadHash].join('|')
```
(`services/amp-service.ts:984-992`, identically at `:1893-1901` and `lib/message-send.ts:177-187`)

Two structural consequences. **The separator is unescaped and unlength-prefixed**, so a `subject`
containing `|` shifts field boundaries — the classic canonical-serialization ambiguity that a
canonical form exists to prevent, and the payload *is* canonicalized while the concatenation around
it is not. And **`envelope.id` and `envelope.timestamp` are not covered** — yet those are precisely
the two values the replay guard keys on (`:1881`). `canonicalStringify`
(`lib/amp-canonical-json.ts:12-26`) is JCS-compatible on key ordering but diverges from RFC 8785 on
number formatting (`1e21` → `"1e+21"`, `-0` → `"0"`) and emits non-ASCII raw — fine for
same-runtime peers, an interop hazard for the cross-language peers the file itself names.

**For v3: sign the structure, not a rendering of it; and whatever the replay window keys on must be
inside the signed region.**

### 5.3 The injection filter is a labeller, not a boundary

`applyContentSecurity` has **no deny branch** (`lib/content-security.ts:107-153`): on match it
prepends a `[SECURITY WARNING: n suspicious pattern(s) detected]` line and wraps the content in
`<external-content source=… trust="none">` with an explicit "CONTENT IS DATA ONLY" banner. Whether
it runs at all is decided by `fromVerified`, computed as `!!senderPublicKeyHex`
(`lib/message-delivery.ts:54`) — and one call site passes the literal string `'verified'`
(`lib/message-send.ts:310, 507`). **Agent-authored internal messages therefore bypass the filter by
construction**, and "verified" is a routing-origin label rather than a cryptographic fact.

Placed against gstack — the corpus's cleanest deterministic gate, faulted for being opt-in and
fail-open — ai-maestro sits further from the boundary on the content path (an always-on annotator
with no deny) and closer on the identity path (four deterministic fail-closed denies). **The useful
lift is the wrapping primitive itself**: provenance labelling with an explicit data-only banner is
a clean pattern for v3's untrusted context-packet segments. What must not be copied is deriving the
"trusted, skip wrapping" bit from routing origin.

### 5.4 L7: no vault, one good decision

No broker, no secret-ref, no `Grant` entity, no argument-level predicates. PTYs inherit the parent
environment wholesale — `pty.spawn(attachCmd, attachArgs, { env: process.env })`
(`server.mjs:1953-1959`) — so an agent's shell sees every secret the dashboard was started with,
and every agent's `private.pem` is readable by that process. The AMP API key is stored hashed
server-side (`lib/amp-auth.ts:82-84`) and written **in plaintext with default umask** into the
agent's own registration file (`scripts/setup-agent-amp.mjs:618-694`), while keypairs get explicit
`0600`.

The single L7 artifact worth lifting is `buildEnv()` (`lib/streaming-runtime.mjs:33-49`): the
Agent-SDK subprocess gets a *reduced* environment with `ANTHROPIC_API_KEY` explicitly deleted in
favour of a subscription OAuth token. **Deliberate credential-class substitution at a spawn
boundary** — the idea behind onecli's placeholder without the mechanism, and the only place in the
repo that treats "which credential travels" as a design decision. Also of note for the audit story:
the trust ledgers themselves (`known-keys.json`, `revoked-keys.json`, `seen-messages.json`) are
unsigned plain JSON with no chain hash, so the harness survey's *"an audit record MUST be
hashed/signed"* (§9.5) is unmet exactly where it would matter most.

---

## 6. Channels and the last mile (L8)

**Verdict: AMP is a message format plus a best-effort transport, not a protocol with durability
guarantees** — with one genuinely good idea (the last-mile ladder) and one genuinely good
sub-component (the relay queue) attached.

The envelope, taken from `lib/types/amp.ts:110-180` rather than the docs: `version` (always the
literal `"amp/0.1"`, never read, and disagreeing with the `AMP_PROTOCOL_VERSION = '0.1.3'`
constant in the same file), `id`, `from`, `from_did`, `to`, `subject`, `priority` (affects a
notification prefix only — no effect on ordering or scheduling), `timestamp`, `expires_at`
(enforced in the relay, never checked in an inbox), `signature`, `in_reply_to`, `thread_id`,
`reply_to`. Payload carries `type` (10 values, of which the internal message type accepts 4 — a
type lie rather than a runtime narrowing), `message`, `context`, `attachments`.

What is missing and matters: **no producer idempotency key** — `/api/v1/route` mints a fresh id per
request (`services/amp-service.ts:911`), so a client timeout-and-retry produces a second distinct
message. **No ordering at any level** — the inbox is a directory tree of files, reads sort by a
timestamp that is millisecond-precision server-side and *second*-precision client-side, and the
relay sorts by filename across two incompatible id formats. **No undelivered ledger** — nanoclaw at
least had `dropped_messages`.

Silent-loss surfaces, each cited: non-atomic inbox writes in a file that uses tmp+rename for its
*index* forty lines away (`lib/amp-inbox-writer.ts:357` vs `:45-54`); malformed files silently
skipped on read with no log or counter (`lib/messageQueue.ts:358-360`); the relay deleting what it
cannot parse and counting it as cleaned (`lib/amp-relay.ts:308-316`); and the WebSocket relay drain
**auto-acknowledging before the client confirms** (`lib/amp-websocket.ts:150-160`), which makes
that path at-most-once while an explicit client ack endpoint sits unused.

And an **undocumented fifth delivery path**: when `amp-send.sh` cannot reach the API it writes
directly into the recipient's inbox directory on the local filesystem, with no replay check, no
notification, no channel injection — and prints `✅ Message sent` (`amp-send.sh:626-661`).

Against the four corpus-settled L8 elements, AMP independently has **two**: the two-struct envelope
(strong convergent evidence — enforced in the type, on the wire, and on disk) and the relay
contract (the best-specified part of AMP). It lacks the two channel classes, and its capability
degradation is *probed* rather than *declared*, so a caller cannot know in advance what a recipient
supports.

**Gateways are modelled as agents, not adapters** — an external process registers as an ordinary
agent and uses the same generic endpoints. There is therefore no `EventNormalizer` seam because
there is nothing in-repo to normalize; the trust boundary and the normalization logic both live
outside the system that carries the consequences. This is a real and cheap design (the kernel needs
no adapter registry, and external senders get the same envelope and relay semantics as internal
ones) with an equally real cost. **For v3, whose kernel "only ever sees EventEnvelopes", the
question this sharpens is whether the normalizer belongs inside the trust boundary — v3's answer
remains yes, and this repo shows what the alternative costs: it can make no statement at all about
inbound normalization correctness.**

---

## 7. Correlation — the first fuzzy prior art (L9)

**The gap is not closed.** Nothing in this system blocks on a reply. `thread_id` is written by every
producer and read by nothing on the server side (and computed wrongly — `body.in_reply_to ||
messageId` sets the thread to the *parent's* id, so a reply-to-a-reply starts a new thread, while
the bash client gets it right by threading the original's `thread_id` forward). `in_reply_to` is
display-only. Read receipts return `receipt_sent: true` regardless of whether anything was sent.
There is **no durable wait state anywhere**; the only timers are HTTP request timeouts, the relay
TTL and the replay staleness window.

What it does add, which the previous sixteen did not:

1. **A worked example of fuzzy identity resolution on a delivery path.** `resolveAgent()` walks
   eight steps — in-memory cache → `name@host` → exact UUID → exact name on self → alias on self →
   exact name on any host → alias on any host → parse-as-tmux-session-name → partial match
   (`lib/messageQueue.ts:448-538`). The last step matches trailing name segments, so
   `amp-send crm "…"` resolves to `23blocks-api-crm`.
2. **A documented incident showing the failure mode of first-match-wins, and the fix.** The two
   resolvers disagree by design history: the registry's returns `matches[0]` arbitrarily; the
   hook's scores by longest prefix and returns `null` on a tie, with the incident in the comment.

**The rule v3 should take: a fuzzy matcher must have a defined ambiguity outcome, and
abstain-with-a-reason beats first-match.** Concretely, the matcher's return type should be
`Matched(id) | Ambiguous(candidates) | NoMatch` rather than an optional — because an `Option`
silently invites the `matches[0]` implementation, and this repo contains both branches of that fork
as a controlled comparison.

A second, smaller lift: `checkReplay(messageId, timestampIso, {fromRelay, nowMs, base})` returning
`{ok, reason}` with an explicit `ReplayReason` enum (`duplicate_message | timestamp_expired |
timestamp_future`) is a clean, pure, testable primitive shape — and its own header states precisely
why it only matters on one path. **The lesson attached to it is the one v3 should carry: a dedup
primitive is worthless unless it sits on the single choke point every inbound event must traverse.
AMP has four doors and guards one.**

---

## 8. Runtime, observe-seam, supervision (L0d / L0e)

### 8.1 The gastown test

**ai-maestro repeats the conflation, more completely — and is a richer cautionary tmux reference
than gastown, not a counterexample.** tmux carries five roles: process substrate
(`lib/agent-runtime.ts:168`), input transport (`send-keys` `:184`, `paste-buffer`
`server.mjs:759`), output transport (`pty.spawn('tmux','attach-session')` `:1953`), history store
(`capture-pane -S -5000` `:2197`), and observation surface. Screen-scraping drives **four semantic
purposes**, each with a documented failure:

| Purpose | Mechanism | Documented failure |
|---|---|---|
| Readiness detection | `waitForPrompt` pane regex | proceeds on timeout; *"the hook may be lost — codex first-launch shows a non-Trust auth picker this handler does not dismiss"* (`services/agents-core-service.ts:477-482`) |
| First-run modal dismissal | `FIRST_RUN_MODAL_PATTERN` + auto-Enter, capped at 3 | as above |
| The human permission gate | `parsePermissionMenu` over box-drawing characters | once silently dropped "Yes" from tall menus (`lib/pane-permission.mjs:7-9`) |
| Send verification | `pasteTailProbe` | false negatives; verification was **abandoned** and the docstring above the function still specifies the superseded behaviour (`server.mjs:678-683` vs `:767-792`) |

The conflation's cost is directly measurable: because the history store *is* the render surface, an
upstream renderer change (Claude Code moving to the alternate screen) destroyed scrollback, and the
fix was to reach into the agent's launch command and set
`CLAUDE_CODE_DISABLE_ALTERNATE_SCREEN=1` (`services/agents-core-service.ts:1858-1868`). **The
observer is reshaping the actor's rendering in order to make itself possible.**

### 8.2 The observe-seam: four media, one fact

- **Medium 1, the terminal byte stream.** Buffer-replay-then-tail is implemented, and the comment
  even half-states the corpus rule — but the seam between replay and live is a **150 ms
  `setTimeout`, not a cursor** (`server.mjs:2191-2215`). Anything the agent emits during the
  capture round-trip plus the join delay is in neither the snapshot nor the live stream, and the
  loss window scales with pane size and load. The container path is worse: the client joins the
  broadcast *before* the capture resolves.
- **Medium 2, Claude Code's JSONL transcript.** A real byte-offset cursor with correct partial-line
  carry, truncation handling, and file-rotation detection with a 60-second quiescence flap-guard
  (`server.mjs:386-437`, `:252-280`). **In the same file**, where a byte offset was available they
  used it correctly; where the medium was a screen they fell back to a sleep.
- **Medium 3, the hook state file.** Written by the agent's own process; 60-second staleness expiry
  for non-waiting states.
- **Medium 4, the pane scrape** for permission menus.

The disagreement is explicit and reconciled by a stated precedence order plus a per-session
`_lastPermission` cache and a 2.5-second poll, with the reason in the comment: *"the hook file /
post-tool_use bursts miss many prompts (a permission menu appears BEFORE any JSONL tool_use is
written)"* (`server.mjs:315-319`, `:359-369`). **A live worked example of the corpus's three-media
observe-seam problem, including its cost — and direct support for v3's rule that the seam must have
one authoritative medium.**

And **Medium 5, unwired**: `lib/headless-terminal.mjs` implements the correct fix — a server-side
`@xterm/headless` terminal fed from `ptyProcess.onData`, serialized on client connect, explicitly
modelled on VS Code's remote-terminal reconnect. Dependencies installed. **Zero references
repo-wide.** The artifact v3 would want, sitting unused while `capture-pane` + a sleep is what runs.

**Observation is in-band where it matters.** Three of four media sit at or above the actor: Medium 1
attaches a second tmux client and mutates session options at every connect; Medium 4 reads rendered
pixels; Medium 3 requires the agent's own cooperation and stops reporting if the agent wedges.
Only Medium 2 is genuinely out-of-band, and it is still agent-produced. **Nothing here can observe
an agent that has stopped cooperating** — a strong argument for AgentSight's "the observe-seam
belongs below the actor", since every seam here at the actor's level acquired a fallback, and every
fallback acquired a bug.

### 8.3 Lifecycle: one strong idea, one cost leak

**The strong idea, and the best L0e-adjacent artifact in the repo:** `cleanupSession`
(`server.mjs:480-576`) tears down the *viewer*, never the agent — it kills the PTY, unwatches the
JSONL, clears timers, closes client sockets, and **never calls `killSession`**. Gated by a 30-second
grace window on last-client-disconnect with a re-check inside the timer, plus a 5-minute orphan
sweep, and independently reimplemented in the container. **Observer lifetime ≠ actor lifetime**, done
cleanly.

**The asymmetry:** there is no `release()` mirroring `provision()`. Docker has a partial mirror
scattered across three verbs, each landed as a separate bug fix with an issue reference. **Cloud has
none**: the hard-delete teardown branch is gated on `provider === 'local-container'`
(`services/agents-core-service.ts:1024`) while EC2/Fargate agents carry `provider: 'aws'`, so
`terraform destroy` never runs — and the delete then `rmSync`s the agent directory containing the
tfstate (`lib/agent-registry.ts:824-831`). **The instance keeps running and keeps billing, and the
state that could destroy it is gone**, recoverable only from an incidental best-effort backup.

**Create is observe-then-commit** — the inverse of v3's L0d invariant — on every path: `terraform
apply` then registry write with a cleanup that deletes tfstate while AWS resources exist
(`services/agents-cloud-service.ts:426, 495, 518-522`); `docker run` then a registry write whose
failure is swallowed while still returning 200 (`services/agents-docker-service.ts:1354, 1400-1402`).

**There is no `RUNTIME_CONTEXT_READY` analogue.** Readiness is assumed (status written as the
literal `'running'` immediately after spawn), never probed (`healthCheckUrl` written and never
read), or scraped. The declared `'provisioning'` state is never assigned. Contrast nanoclaw, which
also lacked a provision→ready event but got away with it because wake **pulls** from a durable
queue; ai-maestro **pushes** into a TUI and therefore cannot — the timeout path's documented
consequence is that the first message to the agent is lost.

### 8.4 The handle, and input injection

The primary handle is a *computed and reparsed* string: `computeSessionName(agentName, index)`
returns `name` or `name_N`, and `parseSessionName` regexes it back with an ambiguity the code
documents — an agent named `report_2` is indistinguishable from session 2 of `report`
(`types/agent.ts:138-156`). A third convention (`__call`) exists specifically to dodge the
collision. Container handles are `aim-${name}` concatenated at the call site, and the prefix leaks
into business logic as a resource-slot concept. The stored `websocketUrl` is string-surgeried back
into an HTTP base so another subsystem can rebuild a different URL from it
(`server.mjs:1891-1894`). **A locator that must be reverse-engineered to be reused is not a
locator** — strong empirical support for v3's opaque `RuntimeContextRef {kind, locator}`. The
agent's UUID does exist and keys the durable state tree; the failure is that it is not the substrate
handle.

**Injection: three paths, three admission rules, no shared idempotency, and no lock.** Two browser
tabs, an on-wake hook and the schedule executor can each `paste-buffer` + `C-m` into the same pane
concurrently. The one clear LEARN is **`paste-buffer` over `send-keys`** — the right escape from
keystroke semantics — plus the bracketed-paste (DEC 2004) wrapper as fallback, *"preventing race
conditions where Enter arrives before the paste window closes"* (`lib/meeting-inject-queue.ts:99-107`).
The correct *shape* is also present and named: queue it, let the agent pull at the next idle prompt
— which matches v3's channel/actor-packet model exactly. It is off by default and applies to one
feature, and its queue has no producer.

### 8.5 Supervision: a well-cited absence

Four liveness signals exist (30-second idle, 120-second container heartbeat, WebSocket ping/pong,
ALB `/health`) and **none can cause an action against an agent**. The ALB check is the only
mechanism that can restart anything for being unhealthy, and it probes the *wrapper*: `/health`
returns a static object as soon as the HTTP server is listening
(`agent-container/agent-server.js:47-56`), so a container whose tmux session died reports healthy
indefinitely. The three restart policies all restart a *process*; none observes progress. No stuck
detection, no escalation record, no silence budget, **and no mechanical killer**.

Reported as **ORTHOGONAL rather than AVOID**, because it is a useful null point on an axis the
corpus now has three positions on: gastown (a mechanical killer, over-aggressive, with a documented
murder spree) → nanoclaw (`decideStuckAction` over durable signals, a workload-declared silence
budget, recovery-consumes-its-own-evidence) → ai-maestro (nothing). And it **validates nanoclaw's
premise from the negative side**: without a durable per-agent progress signal there is nothing a
watchdog could safely decide on, and ai-maestro's four signals are all transport- or
process-level.

For completeness: `pane-permission.mjs` is **not** a capability mechanism — it is a parser for
Claude Code's own TUI menu. The real substrate controls are Docker's (`--cap-drop=ALL`,
`no-new-privileges`, `tmpfs noexec,nosuid`, cpu/memory caps) with one notable gap versus nanoclaw:
**no network isolation** — no `--internal`, and `--add-host=host.docker.internal:host-gateway`
deliberately opens a path back to the host dashboard.

---

## 9. Memory, code graph, skills (L11 / L12 / L5)

### 9.1 Memory is a directory-attributed silo

One CozoDB per agent; the `memories` relation carries `agent_id` as an attribute inside an already
per-agent database, and there is **no `observer`, no `observed`, no source-agent column, and no
cross-agent read path** (`lib/cozo-schema-memory.ts:86-104`). Worse, *whose* conversation becomes an
agent's memory is decided by **directory matching**: ingestion globs every
`~/.claude/projects/**/*.jsonl` and assigns files by comparing the transcript's `cwd` against agent
working directories (`lib/index-delta.ts:119, 225-231`) — the exact heuristic whose failure mode the
repo documents elsewhere and hardened the *hook* against, while leaving the indexer unguarded.

Against honcho's `(observer, observed)` directed edge, this is one implicit observer per database
with no way to express a second. **v3's instance/agent/org scopes cannot be recovered from this
shape, because the scope is an artifact of a filesystem path. The reusable idea is negative and
sharp: directory is not identity — and the repo proves it by having already been bitten.**

The vocabulary, however, is good and worth noting: typed relations `leads_to` / `contradicts` /
`supports` / `supersedes` (`lib/cozo-schema-memory.ts:31-35`) — most memory systems omit the last
two. They are advisory: nothing in retrieval acts on `contradicts` or `supersedes` to suppress a
stale memory.

### 9.2 A new species of theater: production without a consumer

Two disjoint memory systems exist. System A (conversation RAG over raw JSONL) is reachable by
agents through `memory-search.sh`. System B (LLM-distilled typed memories — the headline feature)
runs nightly and **no agent-facing surface reaches it**: grepping the entire plugin tree for
`long-term` returns zero hits, and the endpoint's only consumer is a React component. The push
channel is severed too — `surfaceRelevantMemory` writes a "brain inbox" JSONL whose header asserts
*"The cortex polls this inbox via the hook on idle_prompt"* (`lib/cerebellum/brain-inbox.ts:4-6`),
and **the hook contains zero occurrences of `brain`**.

This is distinct from honcho's off-by-default theater. Here the expensive half — nightly LLM
extraction, embedding, dedup, reinforcement, graph linking — **is on and does run**; the consumption
half is missing. **Production without a consumer is a more expensive failure than a flag left off,
because it burns tokens and CPU nightly to fill a table only a dashboard reads.**

**The generalizable rule: a memory subsystem's on-by-default audit must cover the *read* path, not
just the write path.** "Is extraction enabled?" is the wrong question if no tool signature exposes
the result. v3's L11 should state mnemon's *memory is a port* as an acceptance test — **if no
agent-callable action returns it, it is not memory, it is a report.**

### 9.3 Provider coupling: the README's central claim fails at exactly one layer

The hook is honestly multi-provider and deserves credit as a minimal adapter shape:
`detectAgent()` / `normalizeEvent()` / `buildContextResponse()`, degrading *explicitly* where a
capability is Claude-only — *"`decision:block` is a Claude Code Stop-hook capability. For other
agents (codex/gemini) fall through to idle state only"* (`ai-maestro-hook.cjs:253-291, 546-547`).
**LEARN that triad.**

Everything upstream reads only `~/.claude/projects`, and no Codex/Aider/Gemini transcript reader
exists anywhere. **A Codex agent orchestrated by ai-maestro gets a dashboard tile, a tmux session,
an AMP inbox, working shell skills — and a permanently empty memory database.** This is not
nanoclaw's provider-shaped *memory* (the store is a portable DB, not `CLAUDE.md` prose); it is a
sibling — **provider-shaped *ingestion***. The store is portable; the intake pipe is welded to one
vendor's on-disk log format. Migrating providers here does not cost a re-distillation step; it
simply yields nothing. Notably, the classic `CLAUDE.md`-shaped anti-pattern is **absent** — memory
lives in a database behind an API. **The port exists; it just does not expose the flagship store.**

### 9.4 The code graph is a real capability with a broken identity scheme

Eight agent-callable query verbs over HTTP, plus cytoscape rendering as an *addition* to the agent
path rather than a substitute — **this one is a capability, not a picture**. Delta detection is done
properly: a cheap mtime/size gate then SHA verification, with an explicit unchanged branch, and
deletions found by set difference (`lib/rag/code-indexer.ts:685-730`).

The flaw is identity: `fileId = sha1(path)`, `fnId = sha1(filePath, name)` (`lib/rag/id.ts:36-39`),
so a rename produces delete + create with no continuity — and the source says what that costs:
*"calls edges are based on fn_id, so they'll become dangling"* (`lib/rag/code-indexer.ts:624`).
Callers in untouched files keep edges pointing at a `fn_id` with no row, and are never re-indexed
because their content did not change. **The graph degrades monotonically across refactors and
nothing detects it.** For v3: content-addressed or ledger-assigned symbol identity, and a delta pass
that re-resolves *inbound* edges of any changed node, not only the changed file.

### 9.5 Skills: trigger-only descriptions, zero action indirection

Format is agentskills.io-compatible and the descriptions are **correctly trigger-shaped** — *"Use
when the user asks to 'find callers', 'check dependencies', 'what uses this'…"*. **LEARN.**

Portability fails completely: skill bodies hard-code shell script names, the scripts hard-code
`http://localhost:23000` and `~/.local/bin`, and there is no action name a host resolves — neither
superpowers' runtime indirection nor gstack's codegen. Worse, `common.sh` — which every helper
sources — **is not shipped in the plugin at all**, so a marketplace-installed skill fails at its
first command, while the sync script asserts the plugin "must build standalone so it carries its own
copy". Three of four plugin sources are external git repos at floating `ref: "main"`; there is no
pinning, checksum or signature.

The one control worth lifting directly is **`lib/safe-matter.ts`**: it overrides gray-matter's
`js`/`javascript`/`coffee` frontmatter engines to *throw* rather than execute, citing
GHSA-g7qj-fhxp-6chc, because *"parsing untrusted SKILL.md content … is therefore a remote code
execution vector"*. **v3's L5 will parse third-party skill frontmatter and inherits the identical
hazard.**

A prompt-engineering anti-pattern worth naming: both flagship skills open with a shouted coercion
block — `## CRITICAL: AUTOMATIC BEHAVIOR - READ THIS FIRST` / `**THIS IS NOT OPTIONAL.**` —
mandating a memory search before *every* instruction. **The behaviour they demand is exactly what
the dead brain-inbox channel was built to do mechanically. The shouting is compensating for the
missing wire.** For v3: when a skill has to insist, check whether the capability should have been a
trigger binding rather than an instruction.

### 9.6 The integration-point contract, and why it is red

`scripts/sync-plugin-hook.sh` designates one hook copy canonical and `cp`s it to two destinations;
`tests/plugin-hook-sync.test.ts` asserts SHA-256 equality of all three and names the remedy on the
failing assertion. The header records the motivating incident: *"Historically these drifted into two
independent implementations and every fix had to be applied twice."* **This is nanoclaw's
integration-point contract done right in miniature.**

At HEAD the three copies are **not identical** — canonical is 709 lines, both plugin copies 609,
and they contain *two different agent-resolution implementations*: the canonical refuses to guess
on ambiguity, the copies do longest-prefix matching. The mechanism of failure is the interesting
part: `plugin` is a **git submodule** with no `package.json`, no test runner and no test files, and
the divergent hook fix landed there via its own PR two days *before* the parent introduced the
contract.

**The transferable lesson is sharper than the pattern it instantiates: an integration-point contract
binds only the repository that runs it.** A `cp`-based single-source-of-truth across a submodule
boundary is a seam contract on one side and an honour system on the other. "The failing list IS the
set of things to update" stops being true the moment a contributor can land a change on the far
side without tripping it.

**L12 is a clean absence:** nothing writes back to a skill, agent definition or doc based on
experience (grep for `retro|self-improve|learnFrom` yields one unrelated hit about travel
animations). Memory reinforcement adjusts *data*, never *definitions*. So the corpus's named bug —
prose bypass of a human gate — does not occur, for the sound reason that no definition-evolution
channel exists at all. The `plugin/` submodule being structurally read-only from the running
system's perspective is the one architectural property actively preventing an ungated write-back.

---

## 10. Coordination and mobility (L4 / L6 / L3 / L11)

### 10.1 Is there a workflow object? No.

Coordination is (a) a CRUD Kanban board over four per-host JSON files and (b) AMP message passing,
with **no connection between them**. The task schema is a card, not a run:
`{id, teamId, subject, description, status, assigneeAgentId, blockedBy[], priority, timestamps}`
(`types/task.ts:11-24`) — no attempt, no input/output, no error, no worker, no lease, no version.
The only client of the task API is the browser; **no agent-facing surface exists**, so agents cannot
read, create, claim or transition a task. `assigneeAgentId` resolves a display name and nothing
else. `updateTask` computes an `unblocked: Task[]` list, threads it through the service and the
hook — **and no caller acts on it**. The one place the board could have become a trigger source is
wired and dead.

The system's own answer to durable multi-step work is a prompt: the shipped `planning` skill tells
the model to write `task_plan.md` / `findings.md` / `progress.md` and re-read them. **Durability of
execution state is delegated to the model's discipline.**

Against v3's L4 there is nothing to map. **Fan-out exists** as N unguarded browser `fetch`es inside
`Promise.all` with per-item swallowed errors, so partial failure is invisible to the caller and to
durable state. **Fan-in does not exist in any form** — no spawn/child/parent concept repo-wide, no
counter, no barrier, no slot, no quorum — and the reason is structural: **there is no durable parent
to correlate back to.** Recorded as corpus evidence: *fan-out without fan-in is what a message bus
gives you for free, and it is the easy half.*

Teams are a UI grouping. `AgentRole = 'manager' | 'chief-of-staff' | 'member'` and closed-team
routing are declared in TypeScript with doc-comments describing their authority, enforced nowhere,
and **not even settable through the API** — `createTeam` accepts three fields and `updateTeamById`
whitelists six, neither including `type` or `chiefOfStaffId`. **This is gstack's "roles without
actors, authority in prose" one notch further: here the prose is a doc-comment on a dead field —
direct empirical support for v3's decision to make authority a schema field on the role→agent
binding.**

### 10.2 The unaudited gate, in its purest observed form

The approval gate is Claude Code's own permission prompt, surfaced two ways — a hook state file
and, when that fails, **by screen-scraping the tmux pane**. The operator clicks; the server
validates the key is one character and runs `tmux send-keys -l "<k>"` (`server.mjs:808-826`).
**That is the entire gate.** No decision row is written. The WebSocket carries no user identity, so
*"who approved"* is unanswerable **by construction, not by omission**. *"What was shown"* is
unrecoverable too, since the card may have been built from a pane scrape whose parser once silently
dropped an option.

And yet the codebase demonstrably knows the pattern: the canvas AAP protocol writes an immutable,
timestamped, UUID-keyed JSON file per human interaction, never mutated, listable
(`services/agents-canvas-service.ts:192-246`), with immutability stated as a principle in its design
doc. **It just never applied that pattern where a decision authorizes an effect. The gap is not
capability — it is not having modelled "decision" as a thing distinct from "event".** That is
precisely v3's L3 claim, and this is the cleanest available demonstration of what its absence costs.

Note also that the agent-level trust model (`AgentPermissionMode`) is a pass-through to Claude
Code's `--permission-mode` flag: **ai-maestro delegates the entire gate policy and keeps no record
of what it delegated.**

### 10.3 L6: nanoclaw's two halves at once

**The good half, LEARN:** a durable timer row (`Schedule.nextRunAt` persisted), due-selection as a
predicate over persisted state, and recurrence computed by `cron-parser` with a timezone —
wall-clock anchored, no `now + interval` drift. Executions recorded as durable rows with
`startedAt`/`completedAt`/`status`/`triggeredBy`, pruned to 50.

**The bad half, AVOID, and worse than nanoclaw's:** a 60-second `setInterval` ticker that dies with
the process; **no claim-for-fire** — the only dedup is a process-local `Set` consulted in the cron
loop and never in `executeSchedule`, so two concurrent manual triggers both fire; at-least-once
with `nextRunAt` advanced only inside `completeExecution`, so a crash between fire and completion
refires on next boot; and **the effect being re-executed is `tmux send-keys` of a prompt into a live
agent session — the least idempotent effect imaginable.** The success signal is a lie by admission:
`completeExecution(id, 'success')` runs immediately after the keystrokes, with the comment *"we
can't easily detect when Claude finishes processing"*, while `maxRetries` and `timeoutMs` are stored
and never read.

**The precise lesson: a durable timer row is worth nothing without (a) a CAS claim on fire and
(b) a completion signal that reflects the effect rather than the dispatch.**

### 10.4 Mobility — the empirical test of the identity/durability decomposition

| Aspect | Finding |
|---|---|
| **In the bundle** | manifest; the whole registry record (sessions forced `offline`); `agent.db` — consolidated memory, embeddings, RAG index; AMP inbox/sent/archived verbatim; skills; hooks; **`keys/private.pem`**; provider registrations |
| **Not in the bundle** | the worktree (re-cloned from `remoteUrl`+branch on the far side); **uncommitted work — silently, with no warning**; the JSONL conversation transcripts; the running session; schedules; team/board membership |
| **Identity** | **preserved by default and silently shared** — `newAgentId = options.newId ? uuidv4() : importedAgent.id`, and `transferAgent` never sets `newId`. The private key travels, so the AMP identity is byte-identical |
| **Clone** | byte-identical to move minus the delete → **two live agents sharing one id, one keypair, one memory DB, one message history.** No fork marker, no lineage field, no divergence detection, no merge path. Both sign as the same DID |
| **Transactional** | **No, three ways:** import-then-delete with no rollback (a failed delete leaves the agent live on *both* hosts and still returns `success: true` with an advisory warning string); the source is never quiesced, so anything written to its inbox between export and delete is destroyed unread; no idempotency key, and the declared `checksum` is never set or verified |
| **In-flight messages** | no forwarding, no tombstone, no redirect — the mesh syncs *hosts*, not agent locations |

**Two verdicts.** The worktree handling is **exactly right** — the sandbox is regenerated from a
durable pointer rather than shipped, which is precisely gastown's Sandbox treatment. Everything else
**inverts the corpus decomposition**: it ships the *derived* artifact (consolidated memory,
embeddings, index) and drops the *source* timeline (the transcripts), when Identity/Sandbox/Session
says to carry durable identity plus pointers and regenerate the rest. And the Session boundary is
not respected at all — a `move` deletes the identity while the source session keeps running.

**Portability is implemented as "copy the secret", and the fork is caught after the fact by a boot
diagnostic rather than prevented.** For v3's L11 this is the concrete argument that agent mobility
requires re-keying-with-lineage, not key duplication — and that "same identity" and "two running
copies" must be made structurally exclusive rather than left to operator intent.

An investment signal worth recording without moralizing: `lib/transfer-delight.ts` is 568 lines of
transfer-animation copy — phase messages, easter eggs, five agent personalities — plus a JSON file,
a React component and two design docs. The transactional core of the same feature is ~50 lines with
a `warning:` string where the rollback should be.

---

## 11. Doc-vs-source drift — a taxonomy

This repo warrants its own methodological section, because its drift differs from every prior study
and the difference is instructive. nanoclaw's docs *overstated* the code. ai-maestro drifts in
**both directions at once**, and adds a third species the corpus has not previously named.

**Species 1 — the agent-facing instruction file understating reality, which is the dangerous
direction.** `CLAUDE.md` says *"Phase 1 — Local-only, auto-discovery, no authentication"* (`:22`),
*"Don't implement authentication — Phase 1 is localhost-only"* (`:961`), *"`tests/` — No test suite
in Phase 1"* (`:451`), and *"The dashboard does NOT create or manage agents"* (`:238`). At v0.36.27
all four are false: there is a full DID/API-key/revocation/replay stack, a multi-host mesh, 23 test
files, and agent creation endpoints. The file contradicts itself 430 lines apart, referencing the CI
test at `:16` that it denies exists at `:451`. **An agent following `CLAUDE.md:961` would remove
authentication.**

**Species 2 — the README overstating what the stack enforces.** *"34 prompt injection patterns
detected at the gateway — before any agent sees the message"* (the in-repo list is 20, and detection
never blocks); *"cryptographic signatures"* as a headline capability (default posture is
unsigned-accepted); *"Works with any AI agent… We're agent-agnostic"* (true for tmux/dashboard/AMP,
false for every intelligence layer); *"auto-generated, searchable docs from your code"* (the doc
indexer globs `*.md`/`*.mdx` and generates nothing); `@AIM:` smart routing (zero source occurrences
in this repo); "5 skills / 32 scripts" against a ground truth of 8 and 50, with four different
counts across four documents.

**Species 3 — aspirational wiring comments. The new species, and the most dangerous, because it
lives inside the source tree where a reverse-engineer trusts it most.** These comments are
*accurate about the past* and *misleading about the present*:

- `lib/agent-runtime.ts:5-6` — *"Future runtimes (Docker, API-only, direct-process) can be plugged
  in without touching business logic."* Docker arrived; business logic was touched in three places.
- `lib/cerebellum/brain-inbox.ts:4-6` — *"The cortex polls this inbox via the hook on
  idle_prompt."* The hook has no such code.
- `server.mjs:678-683` — a docstring specifying *"Send Enter ONLY after verification… never
  Enter-anyway"*, twenty lines above code that sends Enter unconditionally and explains why the
  documented behaviour was reverted.
- `lib/memory/types.ts:52, 85` — *"default: false"* two lines above the code that defaults it to
  true, a stale comment then faithfully transcribed into three separate documents that now instruct
  users to do the opposite of what the code does.

**Species 4 — the `.ts`/`.mjs` duplicate pair, where the readable correct file is the dead one.**
Three confirmed instances: `agent-db-sync.ts` (dead, correct, full schema) beside
`agent-db-sync.mjs` (live, broken, three-deep import fallback ending in a smaller schema with
unescaped interpolation, logging `✅ Database initialized` regardless); `hosts-config.ts` beside
`hosts-config-server.mjs`, whose `isSelf()` is a strictly weaker twin, so two modules **in one
process** can disagree about whether an id is "me"; and the CI-guarded three-copy hook, which is red
at HEAD. **Anyone auditing this repo by reading `.ts` files would conclude the DB sync works.**

**The methodological rule this yields, worth carrying into future studies:** in a repo with
`.ts`/`.mjs` pairs, grep the entrypoint's imports before citing either as mechanism — and treat a
correct, well-commented, unreferenced file as evidence of a *retreat*, not of a capability. More
generally: **this repo's inline comments are unusually trustworthy about incidents and unusually
misleading about wiring.** They name real bugs with commit-level specificity and describe consumers
that were never built or later removed.

---

## 12. Consolidated direction

| Level | LEARN | AVOID | Notes |
|---|---|---|---|
| **L0a kernel** | derived/canonical containment (destructive rebuild survivable because Cozo is a projection over JSONL); `last_indexed_message_count` as a resumable high-water mark; atomic tmp+rename where a spec demanded it | no ledger / no CAS / no lock; effects-first multi-writes returning 200; truth split three ways with no arbiter; a recovery routine that reports success without acting | **The best available argument for the transactional outbox**, written by the people paying for its absence (`agents-docker-service.ts:1477-1486`) |
| **L0d lifecycle** | observer lifetime ≠ actor lifetime (`cleanupSession` never kills the session; 30 s grace + orphan sweep) | observe-then-commit on every create path; no provision↔release mirror; a cloud cost leak plus deletion of the state that could stop it | Direct corroboration of commit-then-observe, from the failure side |
| **L0e runtime context** | the operations two working modes genuinely share, stripped of tmux vocabulary: `exists / provision / start / stop / destroy` | a declared interface with one implementor and an unused swap point; a tmux-vocabulary contract (`isInCopyMode`) that no second backend can implement; constructed-and-reparsed handles; locators string-surgeried back apart | **Keep observe/attach/write OUT of the provider contract; ship the MVP with two providers** |
| **L1 / L2 gates** | the invalid-vs-absent credential split (deny bad proof always; allow missing proof only under an explicit profile) | client-side-only enforcement (`isBlocked` in `draggable=`); a filter with no deny branch presented as a boundary | Validate-after-render is the named mirror of validate-before-mutate |
| **L3 human Ask** | the canvas AAP record: immutable, timestamped, UUID-keyed, append-only, listable | a gate whose only artifact is a keystroke; no decider identity by construction; what-was-shown unrecoverable; policy delegated with no record of the delegation | The corpus's unaudited-gate failure in its purest observed form |
| **L4 child workflows** | — | fan-out as N unguarded fetches with swallowed per-item errors | Fan-in absent, structurally: no durable parent to correlate back to |
| **L5 help / skills** | trigger-only descriptions; **`safeMatter` frontmatter-engine lockdown (lift directly)**; the `detectAgent`/`normalizeEvent`/`buildContextResponse` adapter triad | zero action indirection (hard-coded script names, host and install path); an un-shipped shared dependency; floating `ref: "main"` upstreams with no pinning or checksum; shouted coercion blocks compensating for a missing wire | |
| **L6 triggers** | durable `nextRunAt` + `cron-parser` drift-free recurrence; durable execution rows | 60 s in-process ticker; in-memory claim bypassed by the manual path; at-least-once into a non-idempotent effect; completion signalling dispatch rather than effect | nanoclaw's two halves landed simultaneously |
| **L7 grants** | `buildEnv()` credential-class substitution at the spawn boundary | no vault/broker/secret-ref; `env: process.env` into every PTY; API key plaintext at default umask beside `0600` keys; HMAC keyed on the webhook URL itself | |
| **L8 channels** | **the four-tier last-mile ladder + MCP turn-injection on an idle agent** (best in corpus); the Stop-hook `decision:block` with dedup; the two-struct envelope (independent convergence); the relay contract; `paste-buffer` + bracketed paste over `send-keys`; queue-and-pull-at-idle as the correct injection shape | delivery marked without checking the result (worse than nanoclaw: the type existed); no producer idempotency; no ordering; no undelivered ledger; auto-ack before client confirm; an undocumented fifth path that bypasses everything | Capability degradation is *probed*, never *declared* |
| **L9 correlation** | **abstain-on-tie with longest-prefix scoring**; `Matched \| Ambiguous \| NoMatch` as the matcher's return type; `checkReplay`'s pure `{ok, reason}` enum shape | first-match-wins on ambiguity; a dedup primitive guarding one of four inbound doors | **First fuzzy prior art in 17 studies** — identity resolution, not semantic correlation; the gap stands |
| **L10 federation** | propagation-id + depth-limit as anti-amplification; never-advertise-localhost; per-peer health state written onto the record | hostname-as-identity and its guard-code tax; unauthenticated join-by-assertion; "eventually consistent" with no version/tombstone → add-only membership; no `contribution` analogue; a domain gate that fails open on field omission; transitive unauthenticated authority | **The transport and the identity primitive both exist and were never connected — that connection is v3's L10 job** |
| **L11 registry / memory** | did:key derived server-side; boot-time identity-integrity conformance check; memory behind an API rather than in provider-read prose; typed `contradicts`/`supersedes` relations | flat pool with no observer dimension; **directory-as-identity for attribution**; provider-shaped *ingestion*; a mesh-wide agent address that is a display name in an LWW map; mobility as private-key duplication with no fork marker or lineage | *If no agent-callable action returns it, it is not memory — it is a report* |
| **L12 learning** | the integration-point contract pattern **and its placement failure** (it binds only the repo that runs it) | — | Clean absence: no definition-evolution channel, therefore no ungated write-back |
| **L13 trust** | **TOFU with refuse-to-overwrite; rotation with proof-of-possession that atomically updates the ledger and revokes the predecessor; a durable replay seen-set; identity-integrity as a standing conformance probe** | verification that labels instead of gating; the security-critical flag defaulting off and documented nowhere; a header converting an unauthenticated request into an authenticated one; revocation with no distribution; unsigned trust ledgers | **The corpus's first cryptographic agent identity; the model is L13-grade, the boundary is not yet a boundary** |
| **Observe-seam** | the JSONL byte-offset tail with partial-line carry; explicit precedence across disagreeing media; `headless-terminal.mjs` as a **LEARN by counterfactual** | replay→live seam as a 150 ms `setTimeout` rather than a cursor; three of four media at or above the actor; observation that mutates the substrate to make itself possible | Supports v3's one-authoritative-medium rule and AgentSight's below-the-actor placement |

---

## 13. Reconsiderations for the v3 model

Seven items, in descending order of how much they should move.

**R1 — Adopt the read-side audit as a standing model/plan rule (§3).** For every version, id,
checksum, verdict, readiness or capability field in the model, the ledger should be able to name the
unit that *reads* it. This is mechanically checkable against the existing registries and is the
cheapest known defence against building a kernel's shape without the kernel. Candidate home: a
review rule in the implementation contract, or a lint over the model ledger. **Sixteen cited
instances in one repo is the strongest evidence the corpus has produced for any single review
heuristic.**

**R2 — L9: promote the matcher's ambiguity outcome to a modelled return type (§7).** `Matched(id) |
Ambiguous(candidates) | NoMatch` rather than an optional, with `Ambiguous` a first-class,
inspectable, possibly-escalatable state rather than an error. This is the first empirically earned
input the standout open gap has received, and it arrives with both branches of the fork implemented
side by side. It does not close the fuzzy/semantic correlation gap — nothing here is semantic — but
it constrains the design.

**R3 — L13: lift four primitives, and name the failure mode that surrounds them (§5).**
Derive-not-assert identifiers; identity-integrity as a boot-time conformance probe rather than an
audit script; TOFU with refuse-to-overwrite; rotation-with-proof that atomically rotates the ledger
and revokes the predecessor. Attach to all four the governing rule this repo violates: **a
verification result must gate admission, not decorate a label.** Also: whatever a replay window keys
on must be inside the signed region.

**R4 — L0e: two providers or none, and a narrower contract (§8).** Two concrete constraints for the
runtime-context chapter: (a) the provider contract must contain only `provision / ready / release`
over an opaque ref — observe, attach and write address the ref and are not operations on the
provider, and including them is what made `AgentRuntime` unimplementable twice; (b) `RUNTIME_CONTEXT_READY`
must be an event, because the substitute for a missing one is a heuristic over the observation
channel that acquires an auto-clicker and a proceed-anyway timeout whose documented consequence is
losing the first message.

**R5 — L11: state the memory acceptance test, and make mobility structural (§9, §10.4).** Two
sub-items. *(a)* mnemon's "memory is a port" restated as a test: if no agent-callable action returns
it, it is not memory. The on-by-default audit must cover the read path — this repo runs nightly LLM
distillation into a table no agent can reach. *(b)* Agent mobility as re-key-with-lineage rather than
key duplication, with "same identity" and "two running copies" made structurally exclusive.
`clone` producing two agents that sign as the same DID, caught after the fact by a diagnostic, is
the concrete failure.

**R6 — L3: "decision" as an entity distinct from "event" (§10.2).** This repo writes immutable,
timestamped, UUID-keyed records for canvas interactions and nothing at all for the gate that
authorizes an effect — and cannot answer "who approved" **by construction**, because no principal
exists on the channel. Worth an explicit model line that a decision record binds *decider,
rendering, and options offered*, not merely outcome; and that delegating a gate policy to a
subsystem still requires recording what was delegated.

**R7 — L8/L0a: make the delivery result unignorable, structurally (§6).** The nanoclaw finding
generalizes: the hazard is a **non-throwing failure value crossing a module boundary**, and here it
occurred despite an explicit documented return type correctly consumed thirty lines away, because
ignoring it required writing less code. v3's outbox row transition already answers this; the
reconsideration is to state the *reason* in the contract, so the discipline is not re-litigated as a
code-review preference. Related, smaller: a dedup primitive must sit on the single choke point every
inbound event traverses — AMP has four doors and guards one.

Two items that **confirm rather than move** the model, recorded so the confirmation is not lost:
the two-struct envelope (independently derived), and commit-then-observe (corroborated from the
failure side by three separate create paths).

---

## 14. Caveats

**Method.** Seven parallel slices, all static source reading; the application was never run, no
tmux session or container was started, and no live system was probed. Claims derived from control
flow rather than execution are marked as inference in the slice files and, where load-bearing, in
this study. The highest-value follow-up experiments named by the slices: two nodes with a deleted
peer, restart, observe the peer reappear (§4.1); whether
`import('../.next/server/app/api/agents/[id]/database/route.js')` resolves in a production build,
which decides *which* of two wrong branches `syncAgentDatabases` takes; and whether the UI's delete
control routes cloud agents to the generic delete (the cost leak) or to `destroyCloudAgent`.

**Coverage gaps.** `server.mjs` (107 KB) was read for the terminal and WebSocket paths but not
audited whole; `channels/amp-plugin/server.mjs` (15,552 lines) and `services/headless-router.ts`
(1,450 lines) were budgeted out. The AMP inbound-path count of four doors is a **floor, not a proven
ceiling** — a fifth undocumented path was found in a shell script after the count was made. The
external `aimaestro-gateways` repo was not cloned, so the gateway-side injection filter (the
README's "34 patterns") is unassessed and could change the §5.3 verdict for external channels. The
public AMP specification at agentmessaging.org was deliberately not consulted; if it mandates
idempotency or ordering that this implementation omits, the drift is protocol-level rather than
doc-level — a relevant open question. `lib/streaming-runtime.mjs` (the Agent-SDK execution mode,
which is where `--resume`-based durable continuity would live) was only touched at the credential
boundary; **if a positive context-regeneration reference exists in this repo, that is where to
look.**

**Shallow clone.** Git history is unavailable, so the *sequence* in which controls were added — and
whether the fail-open defaults are transitional or settled — cannot be established. The plugin
submodule's pinned commit is unfetchable, so whether the hook-sync CI is currently red or merely
structurally unenforceable across the boundary is unresolved; **the second is the load-bearing claim
and does not depend on the first.**

**Fairness to the target.** ai-maestro is a young, fast-moving, single-vision product that solves a
real problem well enough to attract 745 stars and 96 forks, and its own technical documents are
candid where its README is promotional (`SECURITY.md:16-20` and `docs/CONCEPTS.md:299` both state
the no-authentication posture plainly). Most of the L0a findings become scope boundaries rather than
defects once it is read as what it is — **a view and control plane over live processes**, not a
workflow engine. This study's value to v3 is not a verdict on the product; it is that **v3 is
precisely the layer this system does not have, and the shape of that absence is unusually legible
from the outside.**

**Security findings.** Several findings describe exploitable weaknesses in a public project:
unauthenticated cross-host message ingress, an unauthenticated agent-import endpoint whose unpacker
has a zip-slip write primitive (`services/agents-transfer-service.ts:230-231`) and through which an
agent's private key travels, a header that converts unauthenticated requests into authenticated
ones, and ~108 unauthenticated routes on a default `0.0.0.0` bind. They are recorded here
descriptively, as design findings for v3's benefit; no exploit code was written and nothing was
probed. **Whether to report any of these upstream is a decision for the repository owner of this
corpus, not an action taken by this study.** The project's `SECURITY.md` names a contact address.

---

## Appendix — slice provenance

| Slice | Scope | Output |
|---|---|---|
| 1 | L10 federation / peer mesh | 7 findings; mesh = convenience topology, not trust boundary |
| 2 | L8 channels + L9 correlation (AMP) | 6 findings; format + best-effort transport; best last mile in corpus |
| 3 | L13 trust + L7 grants + injection boundary | 6 findings + a control-by-control fail-open/fail-closed table |
| 4 | L0a durability + state model | 6 findings + a 17-row store inventory; spectrum placement |
| 5 | L0d/L0e runtime, observe-seam, supervision | 6 findings + the four-modes table + the gastown test |
| 6 | L11/L12 memory, code graph, skills | 6 findings + the three-intelligence-layers table + on-by-default audit |
| 7 | L4/L6 coordination + mobility | 8 findings + the mobility bundle table |

Slice files were written to a scratch directory during analysis and are not committed; every
load-bearing claim they carried has been folded into this study with its citation.
