# V3 Concept — Divergence-Phase Braindump

Status: draft — DIVERGENCE phase (intentionally bloated and unfiltered; convergence comes later)
Date: 2026-06-12
Sources: working session 2026-06-11/12 (v2 implementation review, distributed-workflow
problem exploration, Apache Camel assessment, Gmail-inbox and plan-execution workflow
inputs, Abundly capability-map analysis)
Companion: [test-workflows.md](test-workflows.md) — the fixed 7-scenario test set every
iteration of this concept must be walked through.

This document dumps everything discussed so far about the v3 concept in one place.
Nothing here is decided. Items may contradict each other. The goal is to not lose
anything before convergence starts.

---

## 1. The Problem

Take a small company. Person A receives an email and can already automate their part of
a workflow with a personal skill/agent. The next step needs information that lives with
person B — for example inside another email in B's mailbox. If the workflow had that
piece of information, it could continue. Individual people can already solve their own
workflow fragments very well, but the workflow **as a whole** cannot run, because the
connecting fabric — the *substrate* — is missing.

What is actually missing is not work execution (skills do that) but four coordination
capabilities:

1. **Durable, shared workflow state** — somewhere it must be a fact that "instance #42
   of the invoicing workflow is at step 3, waiting for data from B". Today this lives in
   someone's head or nowhere.
2. **Event correlation** — an email arrives at B; how does anything know it resolves the
   wait of instance #42? (The hardest part — see §4.)
3. **Addressed task requests (task inbox)** — the workflow must be able to ask a human
   for something, on their preferred channel, with reminders, timeout, escalation.
4. **Triggering and scheduling** — email arrival, cron, manual start, deadline expiry —
   all normalized into one event stream.

Observation: this is the EventEnvelope + Channel adapter + kernel + blocking subflow
(HELP_PENDING) + human gate vocabulary of the pairflow v2 plan. "A workflow step waits
for data" is exactly the v2 blocking subflow — not with a 30-minute tmux timeout but
with days-long waits addressed to another person. The distributed company workflow is
the v2 "remote executor + multi-channel" story taken seriously.

---

## 2. Relationship to Pairflow v2

**Thesis: the pairflow v2 kernel is the embryonic form of the substrate.** Local
pairflow is the single-user, single-machine special case. The distributed case is the
same machine plus three new subsystems:

1. Identity / authorization (multi-user capability matrix becomes a security model, not
   a formality)
2. Federated private-data access (local gatekeeper agents)
3. Wait-condition-based correlation of unsolicited events

Practical consequence today: nothing global needs to be built yet — only the invariants
must be kept (only EventEnvelopes cross boundaries; the state layer is a dumb store;
op_id idempotency everywhere). Then a local instance can later be re-homed or proxied.

### 2.1 Carry-over conclusions from the v2 implementation review

These came out of the same session and shape v3 thinking:

- **Simplest v2 path is v1 evolution, not greenfield.** ~70% of v2 entities already
  exist in v1 under other names (protocol envelope ≈ EventEnvelope; transcript NDJSON;
  state store with atomic writes; transition graph; scattered policy logic). The genuinely
  new, small pieces: Capability Engine (~100-200 LOC matrix + pure check) and a template
  loader. Strangler-pattern refactor under the existing 423-test suite.
- **No external workflow engine for the kernel.** Temporal/Inngest/BPM break local-first
  and solve durable execution, which file-persisted state + external agent processes
  don't need. XState only becomes interesting when a generic step-graph interpreter
  (loop/subflow types) is built — and even then it would be a generated artifact with
  real impedance cost.
- **Template = configuration first, interpreter later.** The v1-preset YAML should only
  parameterize the existing flow (max_rounds, gate policy lists, roles, capability
  matrix). A generic step-graph interpreter is YAGNI until a real second template exists.
- **Idempotency/CAS must not be deferred** — op_id and expected_version are cheap to add
  at the single-dispatch-entry-point step and painful to retrofit for remote executors.

### 2.2 Two-level state model (lifecycle vs. execution position)

A configurable workflow does not invalidate the ~10 v2 states, because they are (mostly)
not workflow content — they are the instance's **lifecycle**. The plan already separates
lifecycle state from `current_step` + `round` (execution position). Two corrections:

- **APPROVED and COMMITTING leak workflow semantics into the lifecycle** — they belong
  to the code-pairing workflow, not the generic engine. They should be demoted to steps
  (`on_approve: commit` where `commit` is a step).
- **Criterion for what deserves a lifecycle state:** it is (a) workflow-independent AND
  (b) changes who may do what (a row in the capability matrix) or whether the kernel
  schedules (paused vs. active). By this filter WAITING_HUMAN / HELP_PENDING /
  READY_FOR_HUMAN_APPROVAL stay (operator capabilities differ); APPROVED / COMMITTING
  go.

Result: a fixed, small, kernel-owned lifecycle enum (~7 states) + a template-dependent
position record (current_step, round, step status — data, not enum). v1's snapshot
variants (RunningIdeation / RunningStandard / RunningMetaReview) conflate exactly these
two levels and should be dissolved into RUNNING + current_step.

### 2.3 Empirical evidence for "the workflow is the boss"

The ExecutePairflowPlan skill — orchestration written into an agent prompt — was
observed to be followed imperfectly by the LLM. Prompt-level (Level 1) enforcement is
advisory by definition. Separately, the `pairflow plan watch` polling command exists
only because internal lifecycle events are not subscribable. Both are direct evidence
for moving orchestration into the kernel (see WF-7 in the test set).

---

## 3. Two Substrate Paradigms

**A) Orchestration (central kernel).** A shared coordination point (small server, or
even a shared repo/DB) is the single source of truth for instances. Templates declare
steps; the kernel pushes tasks to people/agents. Camunda/Temporal/pairflow-v2 model.
Strengths: auditability, guaranteed completion, SLAs, "where is it stuck" always
answerable. Weaknesses: someone must write the whole workflow up front; the coordinator
must be operated.

**B) Blackboard / choreography.** No central conductor — a shared event/fact space.
Everyone's agent watches it and fires when its step's preconditions are met, posting
results back. Fits the observation that fragments already exist with individuals; the
substrate is just a shared log + conventions; workflows emerge. Weaknesses: hard to
guarantee end-to-end completion, deadlines, accountability.

**Recommended hybrid:** explicit template orchestration for critical, recurring flows;
a blackboard-like "open events" layer for everything else; plus a discovery mechanism
that proposes templates from recurring blackboard patterns ("these three steps always
run in sequence — formalize?"). Template discovery is deferred (out of scope in the
test set) but reserved.

---

## 4. The Correlation Problem

Classic BPM solves correlation with rigid correlation IDs (token in the subject line).
That works when the workflow *asked* for the data. In the motivating example the
information arrives **unsolicited** in B's mailbox — B doesn't even know a workflow is
waiting.

The LLM-era twist: when a step starts waiting, it registers a **wait condition** — a
structured predicate PLUS a natural-language description ("waiting for the signed Acme
contract or its effective date"). On B's side a local matcher agent compares every
inbound event against open wait conditions and, on a hit, *offers* a contribution to B:
"this email seems to resolve workflow #42 — submit the date from it?" Fuzzy correlation
that previously only humans could do.

Design principle: **the substrate must never see B's mailbox.** Only B's own agent
reads B's email, and only the extracted, declared data (the contract date, not the
email) enters the workflow — initially with B's approval, later automatically by trust
level. Federated model: private data stays local; the substrate sees only declared
contributions. Without this, nobody in a small company will connect their mailbox.

Known hard cases (encoded as traps in the test set):
- Ambiguous match — two open instances could both claim the contribution → require
  human confirmation, never guess.
- Duplicate events → idempotent: no second instance.
- Stale intent — the event arrives after the instance moved on / expired → reject and
  route to a human decision (distributed counterpart of the v2 WAL stale-intent
  invariant).

---

## 5. Trigger Model

Every inbound thing — email, webhook, cron tick, manual command, dataset change, an
internal kernel lifecycle event — normalizes to an EventEnvelope and hits a router that
asks three questions in order:

1. Does it resolve a wait condition of a running instance? → feed it.
2. Does it match a template's start trigger? → start a new instance (subject to
   idempotency/singleton policies).
3. Neither → "unmatched" table (later: pattern mining input for template discovery).

Trigger kinds collected so far:
- **Message events:** email (internal or external sender), Slack, webhook
- **Schedule:** cron (recurring instances), date-relative steps, follow-up timers,
  timeout/escalation timers
- **Data conditions:** a scan observes a state of the world (contract expiring in 60
  days) — generalized as **subscription to dataset change feeds** (see §7)
- **Manual:** human starts an instance
- **Internal lifecycle events:** kernel-emitted instance transitions ("child reached
  READY_FOR_HUMAN_APPROVAL") are subscribable — this is what replaces the `plan watch`
  polling hack
- High-volume triage (every inbound email) where the router itself is a config-rules +
  LLM-classification hybrid

Singleton/dedupe is a router-level concern: a daily scan sees the same approaching
expiry 60 times but exactly one instance per contract per cycle may exist; a vendor
sends the same invoice twice and no second instance starts.

---

## 6. Component Inventory (Divergence-Phase, Unfiltered)

- **Trigger/sensor layer:** mailbox watcher, webhook receiver, cron, manual entry, data
  scans — all normalize to EventEnvelope
- **Event normalizer + router:** the three-way decision above
- **Kernel:** template registry, instance manager, transition engine, policy/gate
  engine, capability engine — the pairflow v2 core, unchanged in shape
- **Scheduler:** recurring starts, step timeouts, reminder/escalation ladders, timed
  obligations emitted by winding-down instances
- **Task inbox + channel adapters:** per-person preferred channel, observable delivery
  status, reminders, substitution rules (vacation fallback), escalation paths
- **Participant/agent registry:** humans and agents uniformly, with capability
  descriptions; "create a new agent" = registration, not platform work; steps declare
  needs ("someone who can validate an invoice") and the registry resolves
- **Skills stay local:** the substrate sees the contract (input/output schema), not the
  implementation (Claude Code skill, script, anything)
- **Wait-condition register + matcher agents:** structured predicate + NL description;
  local (per-person) matchers for private sources
- **Gatekeeper agents:** the privacy boundary — extract-and-contribute, never expose
- **Two memory layers, kept separate:**
  - Instance-scoped artifacts + transcript (immutable, auditable — the machine's fuel)
  - Org memory: results and learnings of workflows, searchable (the machine's yield)
- **Datasets as first-class entities** with change feeds (see §7)
- **Read model / cross-instance query:** digests and dashboards aggregate over many
  instances' outputs for a time window
- **Identity + authz:** Role × State capability matrix becomes the security model
- **Credential vault + on-behalf-of delegation** (gap identified in market scan, §9)
- **Cost metering + budget guards** (gap, §9)
- **Structured human-input surfaces:** schema-rendered forms / decision cards / public
  tokenized form links (gap, §9)
- **Operator observability surface:** fleet view — what runs, what waits on whom, what
  is stuck (partial gap, §9)
- **Eval / trust calibration layer:** when may an agent step skip its human gate —
  driven by evals and historical override rates (deferred; v2 plan's Trust Profile)

---

## 7. Datasets and Workflow Composition

From the inbox-pipeline input (WF-6): workflows compose not only through messages but
through **persistent datasets**. One workflow writes scored article summaries into a
*bronze* collection (raw layer, medallion-architecture vocabulary); a downstream
workflow subscribes to the collection's change feed and promotes extracted
concepts/patterns into a curated knowledge layer (personal wiki).

Implications:
- Org memory is not just a sink; datasets need **subscriptions (changelog/stream)**
- The WF-5 "data condition trigger" generalizes to: trigger = subscription to dataset
  changes
- Dataset-level concerns are substrate concerns: dedupe/uniqueness lives in the layer,
  not in workflow logic
- A workflow's output becoming the trigger data of the next cycle closes loops
  (contract renewal writes the new expiry date that the next cycle's scan will see)

Related step-type needs:
- **Dynamic fan-out (map over collection):** N items known only at runtime, parallel
  per-item processing, concurrency cap, per-item failure isolation, cost guard
- **Score-based (non-binary) gate outputs:** a novelty rank is a number; routing
  thresholds on it (PolicyResult grows a score, e.g. in `details`)
- **Cross-instance aggregation:** the morning digest reads many instances' outcomes

---

## 8. Local vs. Global Topology

**Not a type difference in the model — a deployment/topology difference.** Kernel
semantics (envelope, state, gate, capability) are identical; what differs:

- where instance state is homed (local file vs. shared server)
- the identity model (single trusted user vs. multi-user authz)
- the available channels

Preferred shape: **kernel federation, not one global kernel.** A company-level instance
assigns a task to person F; F's *local* kernel runs an entire local workflow (e.g., the
plan-execution workflow) and reports back a single contribution to the global instance.
Same pattern as the gatekeeper agent for private mailboxes — the local kernel is the
gatekeeper of a person's local workflows. The mechanics already exist in the v2 plan:
the remote executor relay/op_id/resume-token machinery (BC-08) is exactly the link two
kernels can talk over.

---

## 9. Market Scan: Abundly Capability Map

Analyzed Abundly's building-block treemap (Integrations; Security & Governance;
Communication; Documents & Data; AI Providers; Code & Apps; Automation; Core AI;
Intelligence; Enterprise). Block inventory, mapped to our concepts:

| Abundly block | Our concept | Verdict |
|---|---|---|
| Integrations wall (Slack, GitHub, Outlook, Drive, MCP servers, …20+) | Channel adapters / sensors | Breadth, not new concept |
| Communication (chat, voice, SMS, TTS, email) | Channel adapters | Breadth |
| AI Providers / Model Selection | AgentConfig detail | Not fundamental |
| Documents & Data (repository, RAG, semantic search, version history, visibility levels) | Dataset layer + org memory | Covered; visibility levels tie into authz |
| Automation (scheduled/recurring tasks, event triggers, webhooks, task delegation, A2A, agent API endpoint) | Trigger router + scheduler + registry | Covered |
| Core AI (instructions, versioned instructions, evals, cloning & sharing) | AgentConfig + provenance + trust layer | Partially covered |
| Intelligence (web search, scraping, context & memory, fact checking, activity monitoring, citations) | Skills + org memory + observability | Mixed |
| Enterprise (teams, admin roles, guest access, multilingual) | Identity/authz | Covered conceptually |

**Three fundamental gaps this scan exposed in our thinking:**

1. **Credential/secrets management with scoped delegation** (Credential Isolation,
   Encrypted Secrets, OAuth). The gatekeeper-agent pattern silently assumes B's agent
   can access B's mailbox — but who holds the OAuth token, with what scope, how is it
   revoked, and how is "a workflow step acted on behalf of B" audited? In a distributed
   multi-person substrate this is a base subsystem (credential vault + on-behalf-of
   delegation), not an implementation detail. The capability matrix says what a role may
   do; this says with what authority toward the outside world. Without it the federation
   model is a slide, not a system.
2. **Cost metering and budget guards** (Credit System, Daily Limits, Usage Reports).
   Per-instance / per-template / per-person budgets, consumption metering, limits
   expressible as policies ("this template may spend $X per run"). For LLM-heavy
   workflows run cost is a gateable resource exactly like human attention. Fits the
   existing PolicyModule abstraction (budget policy → block/defer on projected overrun).
3. **Structured human-input surfaces** (Forms & Calculators, Dashboards, Public Apps).
   Our model has humans replying free-text on channels; the alternative is the workflow
   **generating ad-hoc UI for the decision**: schema-rendered forms, decision cards,
   mini-dashboards. Contributions then arrive schema-validated instead of being
   LLM-parsed out of a reply email. Also the better answer for external participants
   (WF-4): a tokenized public form link instead of email-thread correlation. (The v2
   plan's parallel-human-queue already contained `ui: decision-card` — the idea existed
   once and must be pulled into v3 as a capability.)

**Two partial gaps:**

4. **Agent evals / trust calibration** (Agent Evals, Fact Checking) — exists as the v2
   Trust Profile "future" entity and the deferred intelligence layer, but sharper in a
   distributed context: when may an agent step skip its human gate? Driven by evals and
   historical override rates. Consciously deferred.
5. **Operator observability surface** (Activity Monitoring, Diary & Logs) — the data
   side exists (transcript, delivery status, read model); the *surface* (fleet view:
   what runs, what waits on whom, what is stuck) was missing from the component list.
   With 7 workflows × many instances this is not a luxury.

**The reverse lesson (breadth vs. depth):** note what is NOT on Abundly's map — durable
workflow instances with days-long waits, wait-condition correlation, human gates with
escalation, compensation/stale-intent handling, capability matrix, idempotency. Their
Automation block is trigger/task-centric: a **broad agent platform with shallow
orchestration**. Our concept is the inverse: a deep orchestration kernel with a
deliberately thin rim. Reassuring for differentiation, and a warning: their strength
(mass of ready connectors, UI surfaces) is our rim, which must be kept cheap (see the
Camel assessment, §10) — that is not where to compete.

---

## 10. Existing-Tools Assessment

- **Temporal / Restate / Inngest:** durable execution + signals + timers out of the box
  (a step waiting for an external event = signal). Best technical fit under the kernel,
  but developer-oriented; correlation, task inbox, and agent integration would still be
  ours to build. Also breaks local-first if adopted wholesale.
- **n8n / Zapier / Make:** good at trigger→action; weak at long-running, multi-human,
  stateful waiting. Usable as sensor/adapter layer in front of a kernel, not as the
  substrate.
- **Camunda-style BPM:** conceptually exactly this domain (human tasks, message
  correlation, timer events) — worth raiding for vocabulary; but heavyweight,
  enterprise, not agent-native.
- **Apache Camel:** covers exactly one ring of the substrate — the channel
  adapter/trigger/normalizer rim — and does it best-in-class (~300 components, EIP
  pattern language). It is NOT a workflow kernel: stateless message-flow optimized; no
  workflow-instance concept; aggregator/Saga exist but building an instance manager on
  them is kernel-writing on harder terrain; no human tasks (the BPM ecosystem pairs
  Camel WITH a process engine, which is the tell). Practical mismatches here: JVM vs.
  TS/Node stack; ops weight disproportionate at small-company scale. The tipping point
  would be a large integration surface (15-20 systems: ERP, invoicing, FTP, SAP…) —
  then Camel (or Camel K / Karavan) as an *adapter rim* in front of our kernel is
  sensible, with a clean boundary: Camel = Channel Adapter layer, kernel = all
  decisions.
- **What to take from Camel regardless: the EIP pattern language** (Hohpe–Woolf) as the
  design dictionary of the adapter/event layer. Direct mappings: Camel
  Exchange/Message ≈ EventEnvelope; idempotent consumer ≈ op_id dedupe; dead letter
  channel ≈ BC-09 retry queue; content enricher ≈ gatekeeper agent (forwarding only the
  extracted data); claim check ≈ artifact ref instead of fat payload; message
  expiration ≈ stale intent. The v2 BC-02/BC-09 contracts should be annotated with
  these names so future debates can cite established literature.
- **XState:** see §2.1 — not for the lifecycle machine (too small to need it); possibly
  for a future generic step-graph interpreter, as a generated artifact, with real
  impedance cost.

---

## 11. Open Questions (Unordered)

- Where does a company-level kernel physically live for a small company (tiny server?
  shared repo + cron? someone's always-on machine?)
- Wait-condition schema: how are the structured predicate and the NL description
  combined, and how is the matcher's confidence threshold tuned per person?
- Contribution approval UX: when does per-contribution human confirmation relax into
  trust-level automation, and what is the audit trail for that relaxation?
- Overlap policy for recurring instances (this week's report starts while last week's
  still runs) — kill, queue, or coexist?
- Substitution rules: where do vacation fallbacks live (registry? template? org
  policy?), and who maintains them?
- How does the unmatched-events table feed template discovery without becoming a
  junk drawer?
- Federation handshake: what exactly does a local kernel expose to a global one
  (contract surface of a "contribution"), and how are op_ids namespaced across kernels?
- Budget policy mechanics: pre-flight estimation vs. metered cutoff mid-run; who gets
  the defer when a budget gate blocks?
- Structured-input surfaces: who renders the form (substrate web surface? channel-native
  forms like Slack modals?), and how do tokenized public links expire/authenticate?
- Credential vault: build vs. adopt (OS keychain? Vault? per-person local secrets with
  scoped grants?), and what does an on-behalf-of audit entry look like?
- Eval/trust loop: what minimal data must the transcript capture from day one so trust
  calibration is computable later without migration?
- Internal lifecycle events as a channel: are kernel events just another EventEnvelope
  source_channel ("kernel"), keeping the router uniform?
- How do datasets relate to artifacts: is a dataset entry an artifact with a collection
  id, or a separate entity with its own contract?

---

## 12. What This Document Is Not

Not a design. Not prioritized. Not consistent. It is the raw material for the
convergence phase: the next step is to pick the load-bearing decisions (kernel
invariants, correlation model, federation boundary, the three gap subsystems) and test
them against [test-workflows.md](test-workflows.md) scenario by scenario.
