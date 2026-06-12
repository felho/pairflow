# V3 Concept — Divergence-Phase Braindump

Status: draft — DIVERGENCE phase (intentionally bloated and unfiltered; convergence comes later)
Date: 2026-06-12
Sources: working session 2026-06-11/12 (v2 implementation review, distributed-workflow
problem exploration, Apache Camel assessment, Gmail-inbox and plan-execution workflow
inputs, Abundly capability-map analysis, two Abundly video reverse-engineering reports
(Freddy invoice router; Backlogger/Releaser/Grace dev team), agent-model and
metacognition discussion)
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
  needs ("someone who can validate an invoice") and the registry resolves; agent
  entries are durable identities (definition + grants + memory namespaces + trigger
  bindings — see §11), local and global registries federate
- **Skills stay local:** the substrate sees the contract (input/output schema), not the
  implementation (Claude Code skill, script, anything)
- **Wait-condition register + matcher agents:** structured predicate + NL description;
  local (per-person) matchers for private sources
- **Gatekeeper agents:** the privacy boundary — extract-and-contribute, never expose
  (three-layer anatomy in §12)
- **Two memory layers, kept separate:**
  - Instance-scoped artifacts + transcript (immutable, auditable — the machine's fuel)
  - Org memory: results and learnings of workflows, searchable (the machine's yield)
- **Datasets as first-class entities** with change feeds (see §7)
- **Read model / cross-instance query:** digests and dashboards aggregate over many
  instances' outputs for a time window
- **Identity + authz:** Role × State capability matrix becomes the security model
- **Credential vault + on-behalf-of delegation** (gap identified in market scan §9;
  model in §13)
- **Cost metering + budget guards** (gap, §9)
- **Structured human-input surfaces:** schema-rendered forms / decision cards / public
  tokenized form links (gap, §9)
- **Operator observability surface:** fleet view — what runs, what waits on whom, what
  is stuck (partial gap, §9)
- **Eval / trust calibration layer:** when may an agent step skip its human gate —
  driven by evals and historical override rates (deferred; v2 plan's Trust Profile)
- **Learning/metacognition layer:** instance learnings → run reflection → agent
  metacognition → system metacognition, with improvements expressed as gated
  "definition PRs" (see §14)
- **Context packet assembler:** the kernel composes the minimal context for each step
  (step contract + relevant artifacts + agent skill docs) instead of one big prompt

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

## 8. Topology: Trust Domains × Execution Nodes

**Not a type difference in the model — a topology difference.** And "local kernel"
itself conflates two boundaries that must be separated:

1. **Trust domain (ownership boundary):** personal domain (B's) vs. org domain (the
   company's); later possibly org↔org. Governance attaches HERE: grants, memory
   homing, privacy rules, vault ownership.
2. **Execution node (placement):** within one domain there can be multiple nodes —
   B's laptop, B's always-on online node (VPS/home server), a cloud sandbox.
   Connector availability and capabilities attach HERE.

The gatekeeper principle was never about physical locality but about **control**: B's
Gmail is already in the cloud; the mailbox's privacy comes from B controlling access.
A B-controlled online node is exactly as "local" in trust terms as B's laptop. So the
earlier three-way intuition (machine-local / person-online / global) resolves to: the
first two are **one domain, two nodes**; the third is another domain. Making
"person-online" a separate category would duplicate governance semantics — B's online
node obeys exactly the same grant and privacy rules as B's laptop.

Placement consequences:

- The personal kernel is **logically one** (one identity, one grant set), **physically
  spread** over nodes. The vault is per-node: the Gmail token lives on the online node
  (it watches 24/7, independent of the laptop lid), dev tokens stay on the laptop; no
  unnecessary secret replication.
- The gatekeeper's layers (§12) spread accordingly: connector + matcher live where the
  source needs them; the **owner UX is device-independent** — approvals, contribution
  confirmations, and grant decisions must work from a phone/web, not only at the desk.
- Workflows self-sort: WF-6 (inbox pipeline) is personal-online (runs with the laptop
  closed); WF-7 (plan execution) is machine-local (repo, worktree, tmux); WF-1 is an
  org instance fed by contributions from personal domains.
- Each instance has **one home node**. Node↔node communication within a domain uses
  the same relay/op_id/resume-token machinery (BC-08) as domain↔domain federation:
  **one mechanism, three scales** (node↔node, personal↔org, org↔org).

Preferred shape remains **kernel federation, not one global kernel.** An org-level
instance assigns a task to person F; F's *personal* kernel runs an entire local
workflow (e.g., plan execution) and reports back a single contribution. The personal
kernel is the gatekeeper of a person's local workflows.

**Warning — "web-based" means two very different things:**

- *Self-hosted online node* (B's own VPS/home server): trust model intact, B controls
  everything.
- *Vendor-hosted personal node* (SaaS convenience): the trust model CHANGES — the host
  can in principle see everything unless end-to-end encrypted. This is Abundly's path
  (everything in their cloud); that is the price of their convenience.

Foundations must make the self-hosted personal node first-class
("owner-controlled-first", the extension of local-first), with vendor-hosted as a
later convenience option — not the other way around, because the reverse direction is
not recoverable.

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

## 10. Market Scan 2: Abundly in Operation (Two Video Reverse-Engineering Reports)

Two reverse-engineered demo videos deepen the §9 treemap view: (1) "The Simplest Way to
Make an Advanced AI Agent" — building Freddy, an invoice-router agent; (2) "The Human +
AI-Agent Dev Team" — a running ecosystem of three agents (Backlogger, Releaser, Grace)
plus humans, Cursor, GitHub, Slack, Notion. Reports:
`~/ai-agent-video-reverse-engineering/report/index.html` and
`~/human-ai-agent-dev-team-reverse-engineering/report/index.html`.

### 10.1 From the Freddy demo (agent building UX)

Fundamentally new for us:

1. **Conversational authoring — the agent writes its own spec.** Freddy generates his
   operating instructions from uploaded guideline documents and modifies them through
   chat. Bridge to our thesis: **prose instructions can be the source from which formal
   templates are compiled** — author in conversation, enforce the compiled template in
   the kernel. Abundly cannot do the second half: their prose IS the running "workflow"
   (Level 1 prompt enforcement).
2. **Capability negotiation as a first-class flow.** The agent *requests* the
   capabilities it needs for its mission; the human grants them; the grant is visible
   state. Our capability profiles are static template data — runtime
   request/grant/audit is a missing concept (and matters more in a distributed setting:
   who may grant what to whom).
3. **Argument-level guardrails.** Inside Send Email: Require Approval = No / Yes /
   With an Allowlist + recipient whitelist. Our capability matrix is action-level
   (role × state → action); this is one level deeper — **predicates over the action's
   arguments**. Fits the PolicyModule abstraction (capability-attached arg-predicate
   policies) but was never stated.
4. **Agent-initiated automation (gated self-expansion).** Freddy schedules his own
   weekly event ("alarm clock") and creates an internal database with schema on demand.
   Agents creating new trigger rules and datasets at runtime — simultaneously the
   biggest value and the biggest governance risk (which is exactly why items 2 and 3
   must exist).
5. **Diary / Approvals / Log as three distinct oversight surfaces.** Transcript =
   machine truth; diary = human-facing reasoning narrative; approvals = a dedicated
   pending-decisions queue (a specialization of the task inbox). Finer-grained than our
   single transcript concept.
6. **Agent-to-agent access graph as an explicit permission entity** ("Freddy can
   access → compliance expert", graph view with toggles). We discussed kernel
   federation but not configured, audited consultation rights between agent pairs
   (ask? delegate? use the other's tools?).

Minor but noteworthy: NL querying over own data ("total amount processed today");
asset registry with publish/share lifecycle (uploaded docs, databases, and generated
dashboard apps under one lifecycle with preview/publish); "Verify with all LLMs"
multi-model cross-check as a step-level guardrail mechanism; a synchronous voice call
during which a state-changing decision is made (sync conversation as gate resolution).

### 10.2 From the dev-team demo (ecosystem operation)

Fundamentally new for us:

1. **Two execution styles exist; we only had one.** Our model is *scripted*: a template
   prescribes steps. Grace is *goal-directed*: she has a goal ("take stakeholder
   requests from triage to PR") and improvises within guardrails — asks, analyzes,
   decides whether to build or hand off. Her clarity/risk/complexity triage (trivial →
   build via Cursor; unclear → ask; complex → ticket for humans) is **judgment-based
   routing**: the path is decided by LLM assessment, not template transitions. v3
   foundations must host both styles or Grace-type agents are excluded.
2. **Grace's errands database is evidence our kernel is missing.** She maintains her
   own DB of active errands, waiting states, owners ("Am I waiting for a human, Cursor,
   status?") — a hand-rolled workflow-instance store + wait-condition register.
   Lessons: (a) agent-centric platforms don't escape instance state, they push the
   bookkeeping onto the agent; (b) product idea: the kernel can offer **errand tracking
   as a service** to goal-directed agents — register errands and waits with the kernel,
   get triggers, reminders, and audit in return.
3. **Agent-authored deterministic tools.** Releaser writes and maintains helper scripts
   (get-my-prs.ts) because raw GitHub API calls are token-inefficient — distilling LLM
   steps into deterministic steps as a cost/reliability optimization. A third
   self-expansion artifact besides schedules and datasets; sandbox/review/deploy
   lifecycle is open (intersection of skill registry and credential vault).
4. **Context assembly as a kernel responsibility.** Releaser's instructions are
   trigger-segmented, with detail outsourced to documents loaded only when needed —
   explicit cost and reliability optimization. Generalization: the kernel should
   assemble a **minimal context packet** per step (step contract + relevant artifacts)
   instead of the agent swimming in one large prompt ocean.
5. **Artifact quality as the inter-agent interface.** Cursor's structured commit
   messages and PR descriptions are what Releaser builds changelogs from; Backlogger's
   clean tickets are what humans AND coding agents implement from. **Upstream output
   conventions are downstream input contracts** — prose-form schema contracts. Our
   findings-artifact contract is the formalized ancestor; the generalization: every
   inter-agent artifact type carries an (even informal) contract, and these contracts
   are the system's real architecture.
6. **Retrospective as a meta-workflow — "grow agents, don't build them".** After day
   one, Grace searches her own logs/diary, names the failure pattern ("over-asking and
   under-reading"), and updates her own instructions, scripts, and documents. Gives the
   eval/trust layer a concrete mechanism (see §14) and sharpens the requirement that
   definition versions be recorded in transcript provenance (v2 already has
   agent_config provenance — this is why it is not optional).
7. **Releaser is the choreography paradigm in the wild.** Four independent triggers
   (weekday 13:00 release PR + approval ask; 13:37 nag check; "PR approved" → merge +
   publish; Friday 14:02 weekly summary) coordinating over **shared external state**
   (GitHub PR status). No workflow instance — "the PR is the instance". Validates the
   §3 hybrid; new requirement: the substrate must be able to treat external-system
   state as instance state, or at least subscribe to it via wait conditions.

Minor but noteworthy: capability discovery via agent interviews (Grace "interviewed"
Backlogger and Releaser about what they can do); self-authored skill documents (Grace
distilled the Cursor Cloud API into her own skill doc); Usage & Limits in the nav (cost
gap reconfirmed); the human role boundary stated cleanly (what/why decisions,
architecture, PR review/merge).

### 10.3 The reverse lesson, sharpened

Both reports list the same blind spots as "missing details": idempotency, duplicate
email handling, error handling, rollback, RBAC depth, audit retention, secrets scope.
These are exactly our kernel strengths. The full picture: Abundly is strong in
low-friction agent experience (authoring, capability negotiation, asset generation);
we are strong in reliable execution. Not mutually exclusive — their values can be
built ON TOP of our kernel (conversational authoring → compiled template; capability
negotiation → grant workflow in the kernel; allowlists → arg-predicate policies).

---

## 11. Agent Model: Durable Identity, Ephemeral Activations

The "agent-centric vs. workflow-centric" framing is a false dichotomy — it conflates an
agent's *identity* with its *execution*. Resolution:

- **Durable:** the agent's *definition* (versioned instructions/persona), its
  *capability grants*, its *memory*, and its *addresses + trigger bindings*.
- **Ephemeral:** every *activation* — a trigger pulls the agent into a workflow
  instance; the run ends; nothing keeps running.

Freddy is not a continuously running loop in Abundly either — "Freddy is always there"
is a UX illusion over trigger → ephemeral run. What makes him feel alive is the
continuity of definition + accumulated memory BETWEEN runs. (Classic actor-model
insight: persistent identity, ephemeral activation.) The v2 seed already exists
(`Actor` + `AgentConfig` on steps); what is missing is easy agent description tooling —
which is why pairflow has so few agents.

**An agent-registry entry contains:**

1. **Definition:** persona/instructions, versioned — transcript provenance must record
   which definition version ran each instance (v2's agent_config field points here)
2. **Capability grants:** what it may access, with argument-level guardrails
3. **Memory namespaces:** which durable stores it may read/write
4. **Addresses + trigger bindings:** Freddy's email address, Releaser's four schedules —
   i.e., "when this event/schedule fires → start this (templated or loose) workflow
   with this agent". This unifies "the agent kicks off a workflow" and "the agent
   participates in a predefined workflow": the former just means the trigger→workflow
   binding lives in the agent definition rather than in a standalone template.

**Memory is a special tool:** memory access goes through the same capability/grant
system as everything else — the same matrix governs whether an activation may write the
agent's diary as whether it may send email.

**Three memory scopes** (we previously had two):

- *Instance-scoped:* artifacts, transcript — the truth of one run
- *Agent-scoped:* knowledge accumulating across runs, bound to the definition (diary,
  skill docs, user mappings) — **the new middle layer**
- *Org-scoped:* shared datasets, wiki

The middle layer's governance is the sensitive part: what one activation writes leaks
into all future activations — simultaneously the "grow agents" value and an
audit/feedback surface (§14 handles this in a controlled way).

**Registry federation:** if an agent is definition + memory (= data), agents are
portable and homeable like instances. Local registries (definitions on your machine)
and shared/global registries (the Abundly-like central case) coexist; **a step may
reference either a local or a global agent definition.** Sharing a definition is cheap;
sharing memory is not self-evident (company Freddy's memory is company data; your
local agent's memory is private) — the hard half of federation is the homing and
visibility of memory namespaces, the same pattern as the mailbox gatekeeper. Edge
cases expected; to be discovered by walking the test workflows.

Grace-style goal-directed execution also lands cleanly here: an "errand" is just a
workflow instance with a very loose template, and Grace's continuity comes from her
agent-scoped memory plus the kernel tracking her errands (instead of her own ad-hoc
DB).

---

## 12. The Gatekeeper, Concretely

"Gatekeeper agent" is a convenient shorthand but misleading: it is **not one agent but
three components of different natures bundled together**, with different security
requirements.

```
            B'S PRIVATE WORLD                      │  TOWARD THE SUBSTRATE
                                                   │
  Gmail ◄── [1] CONNECTOR RUNTIME ──► [2] MATCHER ──► [3] OWNER UX ──► contribution
  Slack DM      (deterministic,           (LLM, works     (B's decision,   (EventEnvelope
  files         credentials LIVE here,    WITHOUT         task inbox /     to the org
                named capabilities,       credentials)    notification)    kernel)
                constraint checks)             │
                                               │ ◄── open wait conditions,
                                               │     capability invocation requests
```

1. **Connector runtime — the actual PEP (policy enforcement point).** Deterministic
   code, zero LLM. Holds the OAuth tokens (from the vault), talks to the Gmail/Slack
   APIs, executes named capabilities ("mailbox.search with invoice predicate") checking
   grant constraints at call time. It is critical that this is NOT an LLM: the
   enforcement point must not be persuadable. A prompt injection may fool the matcher —
   it cannot fool the connector, which only evaluates predicates.
2. **Matcher — the only LLM component.** The connector hands it a new inbound event
   plus the open wait conditions; it judges "this resolves instance #42, the relevant
   datum is 2026-07-01". It has no credentials and calls no APIs. If fooled, the damage
   is a bad *suggestion* — caught by the next layer.
3. **Owner UX — B's decision surface.** Suggestions reach B (notification, Slack DM,
   task inbox): approve / reject / amend. The trust ladder lives here: initially every
   suggestion stops for B; with standing grants, certain types pass automatically and
   B sees them in the audit log.

**Security rationale for the split: the persuadable component (LLM) has no power; the
powerful component (connector) is not persuadable.**

**Relation to the personal kernel:** the gatekeeper is not a separate product but a
ROLE of the personal kernel — B's full representation toward the substrate: runs B's
local workflows, guards B's private sources (connectors) and vault, exposes B's
granted capabilities, and routes every contribution. The boundary is asymmetric:
inward — raw emails, tokens, files; outward — **only EventEnvelopes** (contributions,
capability results, grant decisions). Raw email and tokens never cross the line.
Inbound from the substrate: wait conditions addressed to B, capability invocation
requests with grant references, task asks.

**Walkthrough (WF-1):** (1) org kernel registers wait condition "waiting for Acme
PO-1234 contract terms", addressee B; (2) B's kernel, subscribed to wait conditions
addressed to B, caches it; (3) an email arrives, the connector (it holds the token)
detects it and hands it to the matcher with the open wait conditions; (4) the matcher
flags a hit and extracts the fields; (5) B gets a notification with the proposed
contribution and approves (or a standing grant auto-passes it); (6) B's kernel sends
an EventEnvelope to the org kernel: contribution to #42, on-behalf-of B, grant id,
op_id idempotency; (7) the org kernel's transcript records the full chain; the
instance advances. The email never left B's machine.

**MVP shape:** a small daemon on B's machine (launchd/cron-driven, or part of the
pairflow personal kernel process) with connector plugins; the matcher is a per-event
LLM call; the owner UX starts as an OS notification + a `pairflow inbox` command.
Always-on needs move the same components to a home server or VPS — a deployment
choice, not a model change (§8).

---

## 13. Credential and Delegation Model

**Guiding principle: the credential never travels — only the capability invocation
does.** B's tokens live in B's per-node vault and never enter the central substrate, a
workflow payload, or — critically — **the LLM context**. A workflow invokes a *named,
narrowed operation* through B's gatekeeper; the connector runtime injects the real
token at call time. This solves three problems at once:

1. **No central honeypot** — no single store whose compromise loses everything; at
   small-company trust levels this is the only model people will actually join.
2. **Prompt-injection-safe** — the LLM agent never saw a secret, so it cannot
   exfiltrate one; it calls a tool name, the deterministic runtime holds the
   credential. For agent systems this is mandatory, not optional.
3. **Revocation is immediate and local** — enforcement happens at B's gatekeeper, so B
   can kill a grant without synchronizing anything anywhere.

**Grant — a first-class entity** (the external-authority counterpart of the internal
capability matrix):

```
Grant {
  id,
  principal,        # who grants (B)
  audience,         # to whom: agent definition / template / specific instance
  capability,       # verb + resource: mailbox.search, email.send
  constraints,      # arg predicates (recipient allowlist!), expiry, max uses, purpose
  approval_policy,  # per-use / instance-scoped / standing
  status            # active / revoked
}
```

Two earlier threads converge here: the Freddy-style **capability negotiation** (agent
requests, human grants) is this entity's creation flow — a mini-workflow with a human
gate on existing kernel machinery; and the **argument-level guardrails** (allowlist)
are the Grant's constraints field. No new machinery, one new entity.

**Trust ladder** (rhymes with §14 metacognition): per-use approval → instance-scoped
grant → template-level standing grant → time-boxed standing grant with audit review.
Each rung up is itself an audited decision; the Trust Profile is the calibration input.

**Delegation chain + audit:** every external action's transcript entry records the
full chain — which agent acted, on behalf of whom, under which grant, in which
instance/step, with an argument hash. The metacognition layer and trust calibration
live off this data.

**Patterns worth raiding** (concepts, not necessarily libraries): Macaroons/Biscuit
tokens — *attenuation*: a capability can be narrowed offline with caveats ("only this
instance", "only today") but never widened; UCAN — signed, offline-verifiable
**delegation chains**, fits kernel federation (org kernel sub-delegates to a personal
kernel, cryptographically traceable); OAuth Token Exchange (RFC 8693) — ready-made
on-behalf-of claim semantics.

**Fit with the existing architecture:**

- The gatekeeper's connector runtime is the PEP (§12) — it gains a second duty:
  besides filtering data outward, it guards credentials inward.
- The remote-executor relay (BC-08) is reused: if a step runs in a cloud sandbox, the
  credential still does not travel — the external call relays BACK to B's gatekeeper
  with op_id idempotency. Same channel, new cargo.
- The agent-authored-scripts question (§16) half-resolves: scripts get no raw
  credentials either — they too invoke named capabilities, shrinking the sandbox
  problem.
- Offline owner: B's node unreachable → the wait condition simply blocks (already a
  modeled state). Standing-grant capabilities can move to an always-on node (§8) — a
  deployment decision.

**Implementation pragmatics (small scale):** build no crypto and no vault — use the OS
keychain, `age`/`sops`-encrypted files, or 1Password CLI. Agent/kernel identity is a
keypair; requests are signed; grant audiences are identified by key. Company service
credentials (e.g., the org GitHub bot token) live in a designated kernel's vault —
"the company" is just another principal. MVP order: (1) local vault adapter + named
capabilities in the gatekeeper, (2) Grant entity + request/approve flow through the
task inbox, (3) on-behalf-of transcript entries, (4) signed delegation chains — but
only when federation actually crosses machines.

**Anti-patterns (state them explicitly):** a central token store for everyone; tokens
in workflow payloads/artifacts; secrets in LLM context; building our own crypto.

---

## 14. Learning and Metacognition Layers

Sketch of a multi-level learning model (depends entirely on provenance being right —
every learning must be linked to run, step, agent, and definition versions):

- **Level 0 — instance learnings (default).** During/after a run, learnings are saved
  as a matter of course, attached to the workflow instance with full provenance.
- **Level 1 — workflow-run reflection.** When a run ends, query all learnings related
  to that workflow, synthesize higher-level reflections, store them against the
  run/workflow type. May emit a **"definition PR" against the workflow template**
  ("this workflow could be improved by...").
- **Level 2 — agent metacognition.** Periodically (every N instances, daily, whatever
  cadence), the agent reviews all interactions it was involved in and extracts
  patterns. Two uses: (a) patterns are **dynamically leveraged in future activations**
  (retrieval at activation time); (b) the agent recommends improvements to **its own
  definition as a PR**, with a per-agent setting for whether such PRs are auto-approved
  or require human approval.
- **Level 3 — system metacognition.** A periodic system-wide process reviews recent
  learnings across all workflows/agents and evaluates whether a learning from one part
  of the system applies elsewhere (cross-workflow, cross-agent transfer).

**Unifying mechanic: every improvement is a pull request against a definition** —
agent definition or workflow template — gated by a configurable approval policy. This
reuses the existing gate machinery (auto-approve = trust-calibrated gate; human
approval = human gate) and makes "grow agents, don't build them" auditable instead of
silent self-modification. Grace's retrospective (§10.2) is Level 2 done manually; the
v2 plan's Trust Profile is the calibration input for when auto-approve is safe.

---

## 15. Existing-Tools Assessment

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

## 16. Open Questions (Unordered)

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
- On-behalf-of audit entry: exact schema (grant id, chain, action, argument hash) —
  §13 sets the principles (adopt OS keychain/age/1Password, never build), the schema
  is open
- Vendor-hosted personal node: is an end-to-end-encrypted hosted option feasible later,
  and what must the foundations preserve to keep it possible (§8)?
- Node↔node edge cases within one personal domain: grant/memory visibility when an
  instance's home node differs from where a connector lives
- Eval/trust loop: what minimal data must the transcript capture from day one so trust
  calibration is computable later without migration?
- Internal lifecycle events as a channel: are kernel events just another EventEnvelope
  source_channel ("kernel"), keeping the router uniform?
- How do datasets relate to artifacts: is a dataset entry an artifact with a collection
  id, or a separate entity with its own contract?
- Agent-authored scripts/tools: sandboxing, review, deploy lifecycle — who approves a
  new script, where does it run, what credentials does it get?
- Context assembly: what exactly goes into a step's context packet, and who decides
  (template? kernel heuristics? the agent's own skill docs)?
- External-system state as instance state ("the PR is the instance"): subscribe via
  webhooks vs. poll; how are consistency and missed events handled?
- Agent-scoped memory governance: what may an activation write into agent memory, and
  how is cross-instance leakage audited?
- Local vs. global agent definition references from a step: version pinning? what
  happens to memory homing when a global definition runs locally?
- Definition-PR mechanics (§14): how are auto-approve thresholds set, audited, and
  revoked when an auto-approved change misbehaves?
- Capability grant workflow: who may grant which capabilities to which agent in a
  multi-user setting, and are grants time-boxed?

---

## 17. What This Document Is Not

Not a design. Not prioritized. Not consistent. It is the raw material for the
convergence phase: the next step is to pick the load-bearing decisions (kernel
invariants, correlation model, federation boundary, the three gap subsystems) and test
them against [test-workflows.md](test-workflows.md) scenario by scenario.
