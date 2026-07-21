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

### 3.1 The Execution-Style Spectrum

The scripted/goal-directed dichotomy (§10.2 item 1) hides the middle rung — in
practice the most important one:

- **a) Scripted:** transitions are fixed; the kernel walks the graph. (Today's
  pairflow.)
- **b) Judgment-routed:** the template *declares* the possible routes; an LLM
  judgment picks among them. Grace's triage (trivial → build / unclear → ask /
  complex → ticket) is exactly this — and in our vocabulary it is **a decision card
  filled by an agent instead of a human.** The routing decision is a
  schema-validated artifact (enum + reasons): auditable, evaluable (§17), and every
  option's consequences are scripted. Closed option set, open choice.
- **c) Goal-directed:** no enumerated options — a goal + done-criterion, with the
  action space bounded by grants/budgets/gates instead of transitions. (Grace's full
  mode.)

Rung (b) is the key: most "improvisation" needs are really judgment routing, not full
freedom — and there the security model is unchanged.

**A loose template is not "no structure" — it is structure at a different altitude.**
A goal-directed errand's template declares: the **goal** (NL) + a **done-criterion**
(schema or human judgment: "an approved PR exists") + **guardrails** (grant bounds,
budget, max duration, escalation conditions) + **non-bypassable gates** ("whatever
leaves the org passes approval" — judgment cannot override these). The kernel's role
does not weaken; it **re-weights: from enforcing the path to enforcing the
invariants.** Every action still passes capability/grant checks, the lifecycle is the
same enum, waits/timers/transcript stay kernel-owned (replacing the errands DB). Only
the step graph to validate position against is absent.

**The two styles nest in both directions — composition, not rivalry:**

- A scripted workflow can contain a goal-directed *step* — **today's pairflow
  implement step is exactly this**: the review loop is scripted, but "figure out and
  build it" is goal-directed inside, gated outside. Style (c) is not new to our
  system; it was just never named.
- A goal-directed errand can spawn scripted *children* — Grace, needing a release,
  does not improvise but invokes the Releaser's scripted template (WF-7 mechanics).

**Goal-directed is the discovery mode — and it crystallizes.** Goal-directed
transcripts are raw material: if Grace's errands keep walking the same path
(triage → analyze → build → PR), metacognition (§16 Levels 1/3) can propose a
**template PR** from it — the sibling of blackboard→template discovery above and the
connector spectrum (§6); crystallization-through-use again. Goal-directed is thus not
just an execution style but **the discovery mode for new workflows**: run loose,
observe, harden what proves load-bearing. And trust closes the loop: the *mode
itself* is trust-gated — an agent earns goal-directed errands above a given budget
only with a track record (§17 ladder, applied to mode).

(The ExecutePairflowPlan experience reconnects here too: the skill's orchestration
was partly judgment routing at prompt level — the v3 form steers the same decision
into a schema-validated decision artifact, where deviation is not "non-adherence"
but an audited choice.)

### 3.2 Choreography Over External State — Reassessed

The Releaser (§10.2 item 7) first read as living proof of the choreography paradigm:
four independent triggers coordinating over GitHub PR status, "the PR is the
instance". On closer inspection **that framing was wrong: the Releaser's
choreography is platform necessity, not process nature.** Its orchestrated form in
our vocabulary:

- Weekday 13:00 (cron): instance starts → diff analysis → release PR + docs PR →
  approval Ask to the dev channel → **wait condition registered**: "PR approved".
- The 13:37 "nag check" is not a separate trigger — it is the wait condition's
  standard reminder/escalation rung, which the task-inbox machinery provides anyway.
- "PR approved" resolves the wait → the *same* instance continues: merge, changelog,
  publish → DONE.
- The Friday 14:02 weekly summary is genuinely separate: a digest workflow (WF-3
  shape).

The four "independent triggers" collapse into one daily template (internal wait +
escalation) + one weekly digest. And the 13:37 check is, literally, hand-rolled
polling for "has the approval arrived?" — the §11.3 pattern: without wait
registration as a service, agents simulate it with scheduled self-checks. Even the
implicit state betrays it: "have we nagged already?" lives nowhere, or in Slack
history — process state smeared into external systems' comments. **The Releaser is
thus the second missing-kernel evidence after Grace's errands DB**: four triggers +
external state is how you build a workflow when you have no instances and no waits.

What survives the reassessment:

1. **The non-duplication principle, sharpened.** The instance **references** PR state
   (via wait conditions), never mirrors it — authoritative state has one home; a
   kernel mirror would mean two truths and a permanent sync problem. The instance
   holds only what GitHub *cannot*: "have we nagged", the release-PR ↔ docs-PR link,
   gate context. The PR is not "the instance" — it is a referenced external entity;
   the instance is ours.
2. **Subscription mechanics: webhook + mandatory reconciliation + re-read before
   acting.** Webhook delivery is unreliable → a periodic reconcile scan compares
   expected vs. actual ("the PR is merged but we never saw the event") — pairflow
   v1's `bubble reconcile` is the in-house precedent. And a trigger may fire on
   stale data → the action re-reads current external state before executing — the
   "verify before assuming / check state before destructive action" rule,
   mechanized at kernel level.
3. **Declared external state machines.** The template declares the external entity
   (PR), its observable states, and which transitions our waits/handlers cover.
   BC-01-style validation then checks coverage ("what happens on 'closed without
   merge'? — unhandled external transition"), and an unexpected external state
   becomes a detectable event, not a silent hole.
4. **Pure choreography keeps a narrower, real place: stateless reactive rules.**
   "Whenever a PR gets label X, post a Slack note" — single trigger→action, no
   waits, no sequence, no process state. **The sharpened criterion: the moment there
   is ANY process state — even a single 'already reminded' bit — there is an
   instance.** Don't smear state into trigger handlers or external comments.
5. **Virtual instances stay useful:** correlating activations by external entity ref
   (repo#PR) stitches the story of stateless reactive rules, and lets the fleet view
   show everything that happened around one external entity across instances.

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
- **Connector strategy — adopt breadth, build depth:** we neither build nor compete on
  connector breadth; we adopt ecosystems. The connector runtime (§12) can host MCP
  servers — the MCP catalog (Gmail, Slack, GitHub, Notion, …) is inherited wholesale,
  runs inside the trust domain with credentials from the local vault, and each MCP
  tool surfaces as a named capability with Grant predicates layered on top (MCP
  supplies "what can be called"; our layer supplies "who, when, with what
  constraints" — the governance MCP itself lacks). MCP is not always needed either:
  against a plain API an LLM can write client code directly, often more efficiently
  than going through MCP. The connector spectrum mirrors fixed-vs-loose workflows:
  start generic (MCP / ad-hoc API calls), let usage reveal the hot paths, distill
  them into deterministic scripts (the §10.2 Releaser pattern), and harden what
  proves load-bearing into a first-class connector. Same crystallization-through-use
  meta-pattern as blackboard→template (§3) and prose→schema (§15.1). The same goes
  for skills: existing skill formats (e.g., Claude Code skills) are ready building
  blocks for step execution
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
- **Identity + authz:** Role × State capability matrix becomes the security model.
  The human side is *declared*, not emergent (the v2 matrix's operator rows), and the
  dev-team demo supplies the design heuristic for "what should humans keep":
  **intent** (what/why to build → authoring conversations, plan-approval gates),
  **irreversible externals** (merge, outbound email → the §17.3 reversibility
  asymmetry: gated longest), and **taste/architecture** (review gates — which double
  as the eval harness's labels, §17.1). A guide for template authors and the
  authoring agent alike
- **Credential vault + on-behalf-of delegation** (gap identified in market scan §9;
  model in §13)
- **Cost metering + budget guards** (gap, §9)
- **Structured human-input surfaces:** schema-rendered forms / decision cards / public
  tokenized form links (gap, §9)
- **Operator observability surface:** fleet view — what runs, what waits on whom, what
  is stuck (partial gap, §9). The data side and the architectural home fell out of the
  other sections (transcript/diary/approvals/cost ledger/trust report as read models;
  a fleet view is a tier-3 surface over them, §15.2). Four design notes not stated
  elsewhere:
  - **Person-centric primary axis:** the most frequent query is "what waits on ME"
    (task inbox + approvals + expiring Asks), not "what runs" — the system-wide view
    is the secondary, operator/admin view
  - **"Stuck" is an inference, not a state:** wait condition past its *expected*
    duration, orphaned child instance, piling unmatched events — where expected
    durations come from the same per-step historical distributions that feed cost
    estimation (§14) and trust calibration (§17); three features, one data asset
  - **Observability is domain-bounded:** the org fleet view sees "waiting on B for
    3 days" but not why — status-visibility depth is itself a grant dimension
    ("sees that; not why")
  - **Push alerts are Asks:** a stuck-alert goes through the existing Ask/notification
    machinery, so it falls under the attention budget (§14) — alert-fatigue protection
    comes free
- **Eval / trust calibration layer:** when may an agent step skip its human gate —
  driven by evals and historical override rates (deferred; v2 plan's Trust Profile;
  model in §17)
- **Learning/metacognition layer:** instance learnings → run reflection → agent
  metacognition → system metacognition, with improvements expressed as gated
  "definition PRs" (see §16)
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
   eval/trust layer a concrete mechanism (see §16) and sharpens the requirement that
   definition versions be recorded in transcript provenance (v2 already has
   agent_config provenance — this is why it is not optional).
7. **Releaser is the choreography paradigm in the wild.** Four independent triggers
   (weekday 13:00 release PR + approval ask; 13:37 nag check; "PR approved" → merge +
   publish; Friday 14:02 weekly summary) coordinating over **shared external state**
   (GitHub PR status). No workflow instance — "the PR is the instance". Validates the
   §3 hybrid; new requirement: the substrate must be able to treat external-system
   state as instance state, or at least subscribe to it via wait conditions.
   *(Reassessed in §3.2: this choreography is platform necessity, not process
   nature — the orchestrated form is one instance with an external wait, and the
   Releaser is the second missing-kernel evidence after the errands DB.)*

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

Strategy in one line: **adopt breadth (MCP for connectors, existing skill formats for
execution), build depth (kernel, governance, correlation, trust) — nobody supplies
the latter.** (Connector strategy details in §6.)

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
audit/feedback surface (§16 handles this in a controlled way).

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

### 11.1 The Diary: Testimony, Not Evidence

The transcript/diary distinction (§10.1 item 5) is epistemic, not a format question:

- The **transcript** is written by the kernel: append-only events, machine truth.
  *Evidence.*
- The **diary** is written by the agent: a subjective narrative of what it *thinks* it
  did and why. *Testimony.*

**The two can diverge — and the divergence itself is signal.** If Grace's diary says
"I did X because Y" but the transcript shows Z, that is confabulation or a reasoning
bug — both auditable, provided diary entries link to transcript ranges (provenance).
A §16 metacognition check can explicitly hunt testimony-vs-evidence divergences — a
quality signal available from no other source.

Hard rule that follows: **the diary never feeds a gate or policy.** On the §15.1
strictness scale the diary is prose-tier — it informs humans (and metacognition);
decisions are made from the transcript. (If machines ever start depending on diary
content, the hardening rule kicks in.)

**When it is written: the activation epilogue.** The natural place for a diary entry
is the end of each activation — a short epilogue (what I did, why, what felt off).
Cheap (one LLM call), and exactly the raw material Grace searched in her retro.

**The economic argument: the diary makes metacognition affordable.** §16 Level 2
("the agent reviews all its interactions") implemented naively is expensive —
re-reading full transcripts. The diary is the **pre-digested self-summary layer**:
metacognition reads diaries (terse, narrative) and drills down into transcripts only
on suspicion. Same pattern as context assembly (§10.2 item 4): layered context,
lazily loaded detail. The diary is not a luxury feature but a precondition of
metacognition's token economy.

**Abundly's three tabs, mapped:**

| Abundly tab | Here | Nature |
|---|---|---|
| Log | rendered transcript | kernel-written; evidence; gates may consume |
| Diary | agent-scoped memory, activation epilogues | agent-written; testimony; informs humans/metacognition only |
| Approvals | a view over open decision-Asks (§15) | a task-inbox filter — not a new entity |

### 11.2 Agent-to-Agent Access

The Abundly access graph's semantics ("can A ask B, delegate to B, or use B's
tools?") get a sharp answer here — and for the third option the answer is *never*:

1. **Consult:** agent A, mid-step, asks B and waits — a blocking subflow addressing
   an **Ask to an agent**. The §15 Ask primitive generalizes: the addressee kind is
   `{human, agent, external-token}`. The answer returns as a schema-validated
   artifact. (Grace "interviewing" Backlogger was exactly this.)
2. **Delegate:** A hands B a whole work item — a child instance (WF-7
   workflow-of-workflows) with B as executing actor; A's instance waits on lifecycle
   events.
3. **Tool borrowing is forbidden.** If A could invoke B's grants directly, that is
   the classic **confused deputy**: A borrows B's authority and B's guardrails
   (arg predicates, budgets) apply unchecked to A's intentions. The correct shape is
   always (1) or (2): *B's activation* does the work, *under B's grants*, returning a
   contribution — the gatekeeper pattern, between agents. Raw authority transfer is
   an anti-pattern.

**The edge is a Grant whose resource is B's activation/attention** — granted by B's
owner (§13.1 ownership rule). Two consequences: cost attribution is automatic (when B
answers A, whose budget burns? the grant's budget dimension says — "Freddy may
consult the compliance expert, up to €X/month, charged to the invoice template"); and
B's guardrails stay live (B's arg predicates may include requester conditions:
"accept consultation Asks only from agents in my org").

**Chain protection is mandatory:** A asks B, B asks C, C asks A… The correlation
chain already runs through provenance, so cycle detection and a max consultation
depth are cheap kernel rules — but they must be stated.

**The graph is a view, not an entity.** Abundly's toggle-graph suggests the graph is
a thing; here the edges ARE the consult/delegate grants and the graph is read-model
rendering over them — like the fleet view. Nothing extra to keep in sync.

**Discovery:** A learns what B can do from the registry's static capability
description (part of B's definition) plus a dynamic interview — itself just a
consultation Ask. What A learns lands in A's agent-scoped memory (Grace's
self-authored Cursor API skill doc). Metacognition bonus: B's *advertised*
description vs. *actual* behavior can drift — the same divergence signal as diary
vs. transcript (§11.1).

**Closing unification: A2A is not a separate subsystem.** Consulting an agent and
asking a human are the same Ask primitive; delegating to an agent and assigning a
task to a human are the same child-instance/task mechanics. The A2A graph and the
human task inbox are two projections of one machine, and "who may ask whom" lives in
the same grant system as every other permission.

### 11.3 Errands as a Service

Grace's hand-rolled errands DB (§10.2 item 2) becomes a kernel service. Five points:

1. **The service API is the existing kernel primitives at errand granularity.**
   `errand create` (start a loose-template instance), `errand wait-on` (register a
   wait condition: "waiting on Cursor / on a human"), `errand update`, `errand done`.
   Nothing new in the kernel — the same entry points scripted workflows use, on the
   same Level-2 CLI-validation backbone: every call passes capability checks and
   carries an op_id.
2. **Why the agent complies — not incentive, but instruct → visible failure →
   definition improvement.** An LLM agent has no preferences; token cost does not
   motivate it. The mechanism runs on three layers that need no "caring":
   - *Affordance shaping:* activations are ephemeral by construction (§11) — between
     activations there is no agent, so an unregistered wait is not expensive but
     **inert**: nothing will ever re-activate the agent about it. At activation end
     the context packet offers the errand surface (open errands + available ops); an
     LLM completing that context naturally calls `wait-on`. The alternative —
     creating a polling schedule — is a §16.2 self-expansion act: a gated,
     budget-attributed, default-expiring definition PR. The sanctioned path is the
     path of least resistance *through the permission machinery*, not through
     economics.
   - *Hard walls:* if a wasteful pattern does get approved, it cannot run forever —
     budget ceilings (§14) stop it, schedule expiry (§16.2) kills it without renewal.
   - *Selection on definitions:* the failure is **visible and attributable, never
     silent** — an unregistered errand stalls and the stuck inference (§6) flags it;
     polling smokes in the cost ledger; a capability-wall bounce is logged
     structurally. Each signal dictates a concrete definition PR (metacognition §16
     proposes, human approves); the trust ladder (§17) keeps opaque agents at low
     autonomy. Not the individual learning — the population of definitions drifting
     toward kernel bookkeeping. The contrast with Abundly: there non-adherence is
     *invisible* (prose runs as the LLM happens to read it; Grace's over-asking was
     found by manual retro); here deviation either hits a logged wall or glows as a
     stall in the fleet view. Not a better agent — **a better feedback loop.**
3. **The wake-up contract.** When the wait resolves, the kernel starts a **new
   ephemeral activation** (consistent with §11: no long-running loop) and hands over
   a context packet: errand state + the resolving event + relevant artifacts — the
   first mandatory application of context assembly (§10.2 item 4). The agent does
   not "remember"; it continues from the packet. (Durable wait + re-activation: the
   shape Temporal calls a signal, except our agent side is ephemeral too.)
4. **Double bookkeeping drifts — testimony vs. evidence again.** If the agent also
   keeps private notes about its errands (diary, memory), the kernel register is the
   evidence and the agent's notes are testimony (§11.1). Metacognition can hunt the
   divergence: "Grace believes she is waiting on Cursor — the kernel shows that wait
   resolved two days ago." Concretely, this is the detector for the
   over-asking-and-under-reading bug class.
5. **Incremental adoption.** An agent arriving from an Abundly-like world (own DB)
   can migrate stepwise: register waits first (the highest value), move full errand
   state later.

### 11.4 The Context Packet: What an Activation Receives

The natural continuation of §11.3's wake-up contract; answers the §20 question "what
goes into the packet and who decides".

**Anatomy — layers, not a dump:**

- **Identity:** the agent definition (know-how prose), at a pinned version, from the
  registry
- **Assignment:** the step contract — what to do, input/output schema, the available
  action surface (which CLI ops, who may be Asked), done-criterion
- **State:** the instance position + the triggering event (on wake-up: the resolving
  event, §11.3)
- **Material:** the input artifacts the step contract declares
- **Knowledge:** agent-scoped memory relevant to this step type (skill docs) —
  retrieval, not a dump
- **Boundaries:** what is not allowed, remaining budget, escalation affordances when
  stuck

**The governing principle: push the contract, pull the detail.** The Releaser pattern
(lean main instruction, lazily loaded detail docs) generalized — and it answers "who
decides", with three authorities in order:

1. **The template declares:** the step contract lists required inputs —
   deterministic, like a function's parameter list.
2. **The kernel assembles:** mechanical work — ref resolution, state, budget. No
   judgment in it.
3. **The agent pulls:** the packet is the guaranteed *minimum*; alongside it the
   agent gets references + a read capability and loads more on demand — its own
   judgment, within its grants, and **every pull is logged.**

**Why kernel-owned assembly — three arguments, the third the strongest:**

- *Cost:* no prompt ocean (the Releaser's trigger-segmented instructions show the
  win).
- *Reliability:* lean packets counter context rot — the documented failure mode where
  high context fill causes step-skipping and workflow conflation.
- *Reproducibility — the packet is part of provenance.* Deterministic assembly from
  declared refs makes an activation's input **reconstructible**: it is knowable
  exactly what the agent saw when it did X. This enables replay — re-running a
  definition version with the same packet turns evals (§17) into regression tests.
  For an ocean-swimming agent this is impossible in principle: you never know what it
  attended to.

**The push-set itself crystallizes.** Because pulls are logged, metacognition (§16)
sees the patterns — "this agent always pulls doc X for step type Y → add it to the
push-set" (a definition PR against the step contract), and inversely "this pushed
artifact is never used → prune it". **Packet composition is tuned from usage data** —
crystallization-through-use, applied to context management. The template author does
not guess; the system measures.

(The ManageImpStep skill — hand-prepared focused context packets per plan step — is
the manual prototype; the v3 kernel assembler is its automation, and the skill's
heuristics are exactly the knowledge to encode in step contracts' push-set
declarations. WF-7 plan execution is the first consumer.)

**The memory→definition gradient.** Grace's self-authored Cursor API skill doc
(§10.2 minor) reveals an unstated lifecycle. A skill doc is born as **agent-scoped
memory** — written freely, no definition PR (memory writes are granted but not
gated). Then the existing machinery moves it:

```
free private note (memory)
  → pulled frequently for step type Y (§11.4 pull log)
    → metacognition promotes it into the push-set = definition PR (part of the step contract)
      → possibly shared with other agents = scope promotion (§15.7)
```

**Memory crystallizes into definition** — usage walks it across the boundary, gates
included. The knowledge-side mirror of the §16.2 script spectrum (there: ad-hoc LLM
behavior → script → connector; here: note → push-set → shared knowledge), closing
the gradient: *nothing is born important — it becomes important, and then it comes
under governance.*

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
   it cannot fool the connector, which only evaluates predicates. Internally the
   runtime may host MCP servers or agent-distilled API client scripts — see the
   connector strategy in §6.
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

**Trust ladder** (rhymes with §16 metacognition): per-use approval → instance-scoped
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
- The agent-authored-scripts question (§20) half-resolves: scripts get no raw
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

### 13.1 Grant Negotiation, Concretely

The Freddy-style capability negotiation (§10.1 item 2) is the Grant's creation flow.
Five details:

1. **Don't conflate the two "capabilities" — the static part stays static.** The
   *internal* capability matrix (role × state → pass/converged/approve…) is workflow
   semantics — correctly template-defined and non-negotiable (whether the implementer
   may say converged is a game rule, not a permission). Only *external* authority
   (email, Slack, GitHub) — the Grant layer — is subject to negotiation. Making the
   internal matrix negotiable would be a security regression: the agent could
   negotiate its way around gates. **Negotiation = grants-only.**
2. **Negotiation has three moments:** at authoring (§16.1 — the conversation reveals
   the needs; most grants are born here, one of the Freddy scene's five artifacts);
   at activation/instance start (the template declares step needs; missing grants are
   requested up front or lazily at the step); and mid-run — a runtime grant request
   is a **blocking subflow** that pauses the step HELP_PENDING-style and routes an
   Ask to the grantor. No new machinery: help-subflow + Ask.
3. **A grant request is an Ask; the counter-offer is a human amendment.** The
   decision card carries what is requested, for what purpose, and the options
   (per-use / this instance / standing) with pre-filled constraints. The human may
   approve, deny (with a reason the agent must adapt to), or **narrow** — editing the
   constraints before approving ("email yes, but only to @ourco.hu, for 30 days").
   That narrowing is the §15/§17 amendment mechanic, and the edit distance is a
   training signal: if the human routinely narrows an agent's requests, the agent's
   asking habits need recalibration (feed back into its know-how prose: "ask
   narrower"). Grant requests fall under the attention budget (§14) — protection
   against capability-begging loops.
4. **Who may grant follows from ownership.** Grants come from the resource's owner in
   the domain model (§8): B for B's mailbox, the org admin for the org GitHub bot,
   the domain owner for budget dimensions. Meta-consistently, **granting is itself an
   action governed by the internal capability matrix** (the domain-admin role may
   grant org resources) — "who may grant what to whom" is a row in the existing
   matrix, not a new rule system. A cross-domain request (org workflow asks B) is
   simply an Ask in B's task inbox, enforced by B's personal kernel.
5. **Grant hygiene against privilege creep.** Standing grants accumulate and nobody
   revokes them. The fix is cheap because everything exists: a **scheduled review
   workflow** reads usage statistics from the on-behalf-of audit stream and produces
   Asks — "Freddy hasn't used the Twitter grant in 90 days; revoke?" An early,
   concrete instance of §16 Level-3 system metacognition: the system reflecting on
   its own authorization state. Usage-informed pruning, from the same read model as
   cost and trust.

### 13.2 Argument Predicates

The Grant's constraints field, unpacked — four points:

1. **Predicate outcomes are the allow/deny/defer triad — and defer grows the
   allowlist.** Abundly's No / Yes / With-an-Allowlist is really auto-allow /
   always-ask / conditional. A call with non-matching args (Freddy emailing a
   non-whitelisted recipient) should not hard-fail but spawn an Ask: "allow once /
   add to the allowlist?" — where "add" is a grant amendment. **The allowlist is not
   authored up front; it accumulates from approve-once decisions** —
   crystallization-through-use (§6) applied to guardrails.
2. **The predicate language stays boring — the LLM may only tighten.** Declarative,
   finite forms only: allow/deny lists, numeric ranges, domain patterns, time
   windows, max-uses counters. No arbitrary code, no LLM judgment in the decision
   path (the PEP must not be persuadable, §12). LLM judgment has exactly one,
   asymmetric place: an advisory pre-filter that may *tighten* (allow → defer: "this
   call is out of pattern, ask the human") but never loosen (no deny → allow). The
   deterministic layer decides; the persuadable layer may at most urge caution.
3. **Layered constraints compose by intersection.** A single call may be constrained
   from several sources (grant constraints + template policy + domain rule like "no
   email to competitors, ever, from anyone"). Same composition as the budget
   hierarchy (§14): **the most restrictive binds** — deny overrides everything,
   defer overrides allow. Simple, predictable, auditable.
4. **Same shape, different enforcement locus.** Gate policies and arg predicates
   share the interface shape (context → allow/block/defer) but run in different
   places: gate policies in the kernel at transitions, with full context (artifacts,
   transcript, round history); arg predicates in the connector runtime (PEP) at call
   time, with **deliberately narrow context** — just the call args + the grant.
   That narrowness is a feature: the PEP must be fast and simple, and matching a
   recipient against a list needs no transcript. One pattern, two instantiations.

---

## 14. Cost Governance and Model Routing (Deferred — Keep the Door Open)

Status: enterprise-direction design sketch. NOT a current goal — this is a hobby
project first, value-for-self first. Only the four keep-open invariants at the end of
§14.2 are binding now; everything else builds on them later without retrofit.

### 14.1 Metering and Budgets

- **Metering points = enforcement points.** The deterministic runtimes (LLM-call
  wrapper, connector/PEP) execute the actual calls, so they are the natural metering
  points too — a second duty, exactly like the gatekeeper's. Every cost event is
  written with full provenance: run_id, step_id, agent, definition version, principal.
  Without provenance there are numbers but no attribution.
- **The ledger is a first-class dataset** (§7): a stream of cost events, with a read
  model providing per-instance / per-template / per-agent / per-person / per-day
  aggregates (surfaced in the digest and the fleet view). v1's metrics eventsStore is
  a seed.
- **Two enforcement mechanisms, not one:**
  1. *Pre-flight check (gate):* before an expensive step/fan-out, a budget policy
     estimates projected cost — static estimates first, later per-step cost
     distributions computed from transcript history. Overrun → block/defer.
  2. *Metered cutoff (runtime guard):* hard limit in the runtime — the LLM wrapper
     stops calling when the step/instance quota is exhausted. Exhaustion is a modeled
     event (`budget_exhausted`), routed like any failure — typically defer with a
     decision card: "instance #42 hit its €5 budget at step 3 — top up, abort, or
     continue degraded?"
- **Third policy outcome: allow_with_constraints (degradation).** For the WF-6
  80-link trap the right answer is often not "stop" but "run the top-20 novelty
  candidates" or "switch to a cheaper tier". Same pattern as WF-3 degraded
  completion — policy-driven and audited, never silent.
- **Budget hierarchy with quota leasing.** Budgets nest: step < instance < template
  (monthly) < person/domain < org; the tightest binds. Do NOT implement as a central
  check per LLM call (latency + the central kernel would see everything again):
  the instance leases a quota from the domain budget at start, the runtime enforces
  locally (token bucket), unused quota returns. Ledger is eventually consistent —
  fine for soft limits; hard limits are local anyway.
- **Cross-domain cost bearing: the Grant carries the budget.** When an org workflow
  runs a step on B's personal node, the Grant's constraints field gains a budget
  dimension ("max €X/month under this grant, charged to org" or "from B's quota").
  Cost accounting follows the delegation chain on the §13 audit trail. Zero new
  machinery.
- **Attention is a resource.** Budgets are multi-dimensional: money, tokens, external
  API quotas, wall-clock time — and human interruptions. A person can set "max 5
  workflow interruptions/day; batch the rest into the morning digest". Grace's
  over-asking pattern and Releaser's 13:37 nag are exactly this cost. Same budget
  machinery, the counter is interrupts instead of dollars; ties into the task inbox
  and degraded completion. In a human-centric substrate this guardrail matters as
  much as the financial one (and goes beyond what Abundly shows).
- **Build over adopt, exceptionally.** Calls already pass through our wrapper, so
  metering is a few lines; the ledger is NDJSON + read model; enforcement is a policy
  module. LiteLLM/OpenRouter budgets or Helicone tracking are optional; the 50/75/90%
  alert ladder is a UX pattern worth stealing.
- **MVP order:** (1) LLM-call metering with provenance → cost-event stream; (2) read
  model aggregates; (3) budget policy module with pre-flight check; (4) runtime quota
  cutoff with `budget_exhausted` routing; (5) degradation policies + attention budget
  later.
- **Anti-patterns:** central check on every call; silent degradation without audit;
  metering without provenance; treating cost as money-only.

### 14.2 Model Provider Routing

- **A provider is just another connector.** Like Gmail or Slack: credential (API key)
  in the vault, cost metadata (per-token price or "free/local"), and a descriptor —
  quality tier, context size, modalities, plus a field especially valuable here:
  **privacy class** (does data leave the node?). Local inference (e.g., a model on a
  local DGX box) is a zero-marginal-cost, "private"-class connector. Provider calls
  go through the same deterministic wrapper built for metering and credentials.
- **Local inference strengthens the gatekeeper.** The §12 matcher is credential-less
  but would still send email content to a cloud LLM; run it on local inference and
  B's emails never reach even the model vendor — the privacy story completes. And the
  high-volume, low-stakes work (triage of every inbound email, the WF-6 fan-out) is
  exactly what hurts at cloud prices and is free locally. So cheap-model routing is
  not the antechamber of enterprise cost control here — it is what makes the inbox
  pipeline economical. Value-for-self, now.
- **Selection cascade** (like CSS): step-level override > agent-definition default >
  template default > node/domain default. v2's `agent_config` already carries
  mode/approach keys — `model` is just another key, and transcript provenance already
  plans to record `model_id`.
- **Declarative requirements over pinning.** A step should preferably declare a need
  ("cheap + high-volume + quality ≥ T2", or "private-only") rather than name a
  provider; the router maps requirement → provider considering budget state and
  availability. The budget policy's degrade outcome then concretizes naturally: not
  "stop" but "same requirement, one tier cheaper". Direct pinning stays allowed —
  at hobby scale simplicity wins; the schema must permit both.
- **The four keep-open commitments (binding NOW, everything else later):**
  1. *Single LLM chokepoint:* every model call goes through one shared wrapper —
     needed for metering and credential injection anyway; THE key invariant (direct
     provider calls scattered through agents make routing a painful retrofit).
  2. *Model selection is config, not code:* `agent_config.model` / step override,
     never hardcoded in step logic.
  3. *Provenance records model_id + provider per step* (already planned in v2).
  4. *Provider descriptors carry cost and privacy-class fields*, even while nothing
     reads them.

---

## 15. Structured Human-Input Surfaces: the Ask Primitive

Today's model: task inbox item + free-text reply parsed by an LLM. The upgrade:
**every human-input request is an Ask entity**:

```
Ask {
  id, instance/step,           # where it comes from
  addressee,                   # who it is for (or: external token)
  schema,                      # WHAT is requested: typed fields, options, constraints
  context_refs,                # what the human must see to decide (artifact refs)
  channel_hints, priority,     # delivery preferences; interruptive vs. batchable
  expiry, escalation           # when it lapses, who it escalates to
}
```

The reply is validated against the schema BEFORE it becomes a
contribution/EventEnvelope. Free text does not disappear — it is the degenerate schema
(`{ text: string }`); on rich schemas a text-channel reply is lifted into the schema by
the matcher with a confirm-back. The schema is the *target*, not a constraint on
channel richness.

### 15.1 Ask Schemas Are Artifact Contracts

The Ask's schema is the step's input contract — the same schema machinery as artifact
contracts. The human's reply is a schema-validated artifact with provenance
(`created_by: human:B`), immutable, on the same envelope contract. The system has no
separate "human input" category: just artifacts whose producer happens to be human —
so policies, gates, and downstream steps consume them uniformly.

Artifact contracts themselves span a strictness scale:

1. **Envelope contract** (identical for all artifacts): artifact_id, flow_id, step_id,
   artifact_type, schema_version, created_by, content_ref; validated on write,
   immutable (new version = new id), only referencable within its flow (v2 BC-07).
2. **Type-specific content schema**: e.g., Findings { items: [{ severity, description,
   status, evidence_refs }] } — the validate→fix contract. Its consumers are machines:
   the p2-round-gate reads severity, the fixer works open items, the convergence gate
   checks P0/P1 presence. Contract rigor is what makes producer output machine-judgeable.
3. **Prose convention**: Cursor's structured commit messages (Releaser builds
   changelogs from them), Backlogger's ticket format (humans AND coding agents
   implement from them). No JSON schema, still an interface — the dependencies of the
   system run through artifact formats, not component APIs.

Rule of thumb: **whatever feeds a policy or gate must be schema-level; what only
informs a human may stay prose.** A prose convention can be hardened into a schema
later when machines start depending on it — that hardening is itself a definition PR
(§16).

**Contracts as first-class entities.** Taking "the contracts are the system's real
architecture" seriously has four consequences:

1. **One shared entity, not two copies.** Today "Cursor's commit convention" lives
   twice: in Cursor's instructions ("write commit messages like this") and in
   Releaser's ("expect commit messages like this") — two copies guarantee drift. The
   convention should be a **named contract entity in the registry**, referenced by
   both definitions, changed via definition PRs, carrying producer and consumer
   lists. Valuable side effect: **the system's dependency graph becomes explicit and
   queryable** — the architecture diagram is *rendered from* the contract registry,
   not drawn from memory.
2. **Prose-contract drift is silent — it needs sensors.** Schema violations fail
   loudly; if Cursor switches to one-line commit messages, Releaser's changelog
   degrades and "nobody touched anything". Three detectors fall out of existing
   machinery: the *downstream is the sensor* (the consumer's struggle is measurable —
   more pulls (§11.4), more Asks, longer runs, higher cost in the ledger); *canary
   spot-checks* (§17.3 sampling applied to contracts: an LLM judge periodically asks
   "does this artifact follow the convention?"); and *cross-agent correlation* in
   metacognition ("Releaser's cost/quality degraded since Cursor definition v3" —
   queryable thanks to version-keyed provenance, §17.2).
3. **Consumer-driven contract evals (the Pact pattern).** The consumer supplies the
   test cases: Releaser attaches eval cases to the contract ("I must be able to
   extract X from a commit message"), and these run in the **producer's**
   definition-PR regression gate (§17.4). The producer cannot change in ways its
   consumers would feel without the gate speaking up — cross-agent CI on the
   existing eval machinery.
4. **Evolution rules.** Additive changes are safe (a new field old consumers
   ignore); breaking changes are coordinated — the contract PR requires re-eval of
   every definition on the registry's producer/consumer lists (the v2 append-only
   compatibility principle, generalized). Without the registry (point 1) this is
   impossible; with it, mechanical.

### 15.2 Three Tiers: Card, Form, App

1. **Decision card** — enumerated options + context (approve/rework/reject); schema is
   an enum. The v2 human_gate and the parallel-human-queue `ui: decision-card` are this.
2. **Form** — multiple typed fields (WF-1 contribution confirmation, vacation
   substitution setup); schema is an object.
3. **Generated app / dashboard** — a DIFFERENT beast: not an Ask but a *published
   asset* — a persistent view over a dataset/read model (Abundly's invoice dashboard,
   Grace's errands dashboard), under the §10.1 asset lifecycle (preview/publish).
   Don't conflate the tiers — Abundly's UI is muddled precisely because all three are
   "documents".

### 15.3 Renderer Separation: One Ask, Many Surfaces

The workflow **never describes UI — only schema + hints.** Rendering belongs to
channel adapters:

- **Slack:** Block Kit buttons / modal — native form experience
- **Email:** link to a web form (or button-reply in simple cases)
- **Web inbox:** the personal online node's task-inbox surface (§8 device-independent
  owner UX), form rendered mechanically from the schema
- **CLI:** `pairflow inbox answer`
- **Voice:** the Freddy-style phone call is *also just a renderer* — the agent reads
  the context, collects answers conversationally, fills the same schema. Synchronous
  voice is not a separate mechanism but a conversational rendering of the Ask.

Poor channels fall back to free text + matcher extraction + confirm-back. This mirrors
the EventEnvelope philosophy outbound: one abstract request, channel-native renderings.
No form designer gets built: schemas are JSON Schema (+ a UI-hint layer, RJSF-style);
rendering is mechanical.

### 15.4 External Participants: the Token IS the Capability

WF-4's customer is outside the system: no account, no agent, no identity. Two
problems: how do they give input *safely*, and how do we know *which* instance their
answer belongs to? The email-thread answer is fragile (out-of-thread replies,
forwarding, parse errors, nothing validates completeness).

Instead: the Ask renders as a **unique, unguessable URL**
(`https://flows.example.com/a/8f3kQ9xL2m...`). **No login, no registration —
possession of the link is the authorization** (capability-based security; the
Calendly/DocuSign/anyone-with-the-link pattern). The token's scope is deliberately
minimal, macaroon-style:

- **single-Ask scoped** — if leaked, the damage is one filled form; no access to the
  instance or anything else
- **expiring** — lapses with the offer's validity; a click on an expired link routes
  to the stale-intent branch ("This offer expired — request a renewal?"), exactly
  WF-4's trap
- **revocable** — kill the link the moment the deal is off
- **audited** — every use logged

The submitted form (rendered from the Ask schema: accept yes/no, comments, PO number)
arrives schema-validated as an EventEnvelope with provenance
`external:customer@x via ask-token`. **The correlation problem disappears** — the
token deterministically identifies the Ask and through it the instance. The
email-thread path remains a fallback (some customers will reply by mail; the matcher
handles it), but the link is the primary rail.

**Standing intake forms — same machinery, different routing.** The ask-token above is
created by a running instance, for one occasion. The same form mechanics also work as
a permanent surface (`/forms/request-a-quote`): each submission does not answer a
waiting instance but **starts a new one** — a template start trigger. The trigger
router's three-way decision (§5) maps exactly:

| | Ask-token link | Standing intake form |
|---|---|---|
| Created by | a running instance | the template (at deploy) |
| Lifetime | one-shot, expiring | permanent |
| Submission routes to | **feed**: the waiting instance | **start**: a new instance |

This is why "the form is a channel adapter": a web form is an inbound channel like
email or Slack — it produces EventEnvelopes and does NOT decide whether an envelope
feeds or starts; that is the router's job. Abundly's "Agent API Endpoint" is the
machine twin of the standing intake form: a permanent inbound channel bound to a
template/agent, with the same feed-vs-start routing.

### 15.5 The One Invariant That Matters, and Edge Cases

**Every UI surface is a channel adapter — it never mutates state directly, it only
emits EventEnvelopes.** The Slack button, the web-form submit, the dashboard action
button, the spoken "yes" on a call — all enter through the single kernel entry point,
with capability checks and op_id idempotency. Consequences come free: answering a
stale Ask = stale-intent rejection (already modeled); two competing answers =
first-wins by op_id; validation runs at the renderer AND at the kernel boundary (never
trust the surface).

### 15.6 Ties, MVP, Keep-Open Commitments

Ties: the Ask's `priority` field decides interrupt vs. digest-batch — clicks into the
attention budget (§14). Conversational authoring (§10.1) may *draft* the form ("which
fields does this decision need?"), but the compiled template holds the schema — the
same prose→compiled bridge as for workflow templates.

MVP at hobby scale: Ask entity with JSON Schema; CLI + web-inbox renderer on the
personal node; OS notification with deep link; maybe a Slack Block Kit renderer;
tokenized links only when an external actually appears.

Keep-open commitments (cheap, binding now):

1. **Ask-with-schema is the universal human-input primitive** — free text is the
   degenerate schema, not a separate path
2. **Renderer separation** — templates carry schema + hints, never UI
3. **Every surface is a channel adapter** (the invariant above)
4. **External addressee = token-scoped capability, not an email address**

### 15.7 Three Minor Surface Patterns

1. **Scoped NL query — the matcher's read-side twin.** "How much went through
   today?" is an LLM translating natural language into a read-model query. The
   translator is persuadable, so **the query engine must be scoped**: it only exposes
   the views the asker's domain permissions allow ("sees that, not why", §6). If the
   translator is prompt-injected, it gains nothing past the scoped engine. The §12
   pair, read-direction: persuadable translator + non-persuadable executor.
2. **Publish = audited scope promotion.** "Publishing" an asset is not a UI action
   but a visibility step on the memory-scope ladder: instance → agent → org →
   external. An instance-born dashboard published to org level is a gated, audited
   scope promotion; external publication is a tokenized standing surface (§15.4
   mechanics). Publish is composition of existing scopes + gates + tokens, and it is
   reversible (unpublish = token revocation).
3. **Synchronous conversation as gate resolution.** Freddy calling Henrik adds three
   properties over async forms: (a) *multi-turn interrogation* — the human can probe
   live before deciding (the §16.1 explain-back loop, synchronous and interactive,
   which is what makes it valuable at high stakes); (b) *evidence discipline* — a
   verbally made decision must still materialize as a schema-validated EventEnvelope,
   and since the agent summarizes what the human said, a **confirm-back is mandatory
   before emitting** ("So: permanent rejection, flagged as fraud — correct?"), with
   the call transcript attached as provenance artifact; (c) *the most expensive
   attention currency* — a synchronous call is maximally interruptive, priced highest
   in the attention budget (§14), reserved for high stakes/urgency.

---

## 16. Learning and Metacognition Layers

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

### 16.1 Authoring Is the First Definition PR

Conversational authoring (§10.1 item 1) is not a new subsystem — it is a *surface* of
the definition-PR machinery. **There is no separate "creation" flow: creating a
template/agent is the first definition PR (with an empty predecessor); Freddy's
mid-flight instruction update is the nth one.** Running instances stay on their
version; new instances get the new one.

**The prose splits in two.** Freddy's "Invoice Processing Instructions" mixes two
kinds of content of different natures:

- **Structure** (steps, branching conditions, who approves): this is what the kernel
  enforces — it compiles to the YAML template.
- **Know-how** (how to assess risk within a step): this stays prose, living in the
  agent definition / step prompt. Harmless there — whatever the LLM concludes, the
  kernel only permits what the capability matrix and gates allow.

In Abundly the whole document is the running program (the LLM re-interprets the
structure on every activation — hence Grace's deviations); here structure runs as
YAML, the LLM only works inside steps.

**Single source of truth: the compiled template.** The authority question applies to
the structure part only, and of the two models only one is safe:

- *(a) The template is the only runtime truth; the conversation/prose is provenance* —
  stored as the authoring instance's transcript, never maintained as a parallel
  artifact. Edits are template-first: the conversational UI proposes a **template
  diff** ("raise the threshold to €2000" → one line changes), reviewed as a
  definition PR. Human-facing prose summaries and diagrams (Freddy's self-drawn
  process map) are **generated views, decompiled from the template** — always fresh
  because derived.
- *(b) Prose as source, template as build artifact* — tempting (fits the compilation
  metaphor) but dangerous: the LLM compiler is nondeterministic, so re-compiling the
  whole prose for a one-line change can silently alter unrelated structure. Silent
  semantic drift.

The risk is asymmetric, which settles the design: if an *explanation* is wrong, the
human asks questions and it surfaces; if a *compilation* is wrong, it becomes runtime
behavior. So the write path gets hard gates; the read path is just a view.

**Verification loop at authoring time:**

```
human (intent, prose) ──► agent compiles ──► TEMPLATE ──► system explains back (generated prose)
        │                                                          │
        └────────────── human compares: "is this what I meant?" ◄──┘
```

**BC-01 is the compiler's type checker.** The v2 template loader's structural
verification (dangling transitions, unreachable steps, unknown gate types) gates the
LLM's draft BEFORE the human sees it. Same §12 principle, applied to the authoring
pipeline: the persuadable component (LLM) proposes, the non-persuadable validator
(BC-01) filters, the human decides. BC-01 only checks well-formedness, not intent —
intent is covered by the explain-back loop and eval cases.

**The authoring agent is an ordinary registry agent**, with an unusually narrow
capability set: read the template schema and existing templates/registry; write
drafts as definition PRs; **it cannot activate anything** (that is the human gate's
job) — so despite "writing the workflows", it holds no power; its worst case is a bad
proposal caught by BC-01 or the human. Its activations are ephemeral, inside an
authoring meta-workflow (interview → draft → BC-01 hard gate → explain-back → human
approval → activation) whose transcript IS the template's provenance. The gap-only
interview behavior comes from its know-how prose plus the template schema as input
artifact (what counts as a gap) — the sibling of the CreatePairflowSpec /
CreateSkill pattern, where the skill file's content becomes the definition's know-how
prose. Its agent-scoped memory accumulates house conventions ("max_rounds is usually
8 here") so it asks less over time; and it is itself improvable via definition PRs
(the first version is hand-written, like any seed).

**The Freddy scene, decomposed.** One Abundly chat ("Henrik creates Freddy") bundles
what is five typed, gated, versioned artifacts here:

| Born in the conversation | What it is here |
|---|---|
| Freddy's persona, risk-assessment style | agent definition (know-how prose) in the registry |
| "I need receive/send email, Slack" | grant requests → human approval (§13) |
| Freddy's email address, "start on invoice arrival" | trigger binding in the agent definition (§11) |
| process steps, threshold, who approves | **compiled template** (structure, kernel-enforced) |
| "a €1200 invoice goes to approval, right?" | eval cases alongside the template (§17.4) |

One role-casting difference: in Abundly the freshly created agent interviews itself
(self-configuration). Here the authoring agent drafts *Freddy's* definition — Freddy
never holds edit power over his own definition except via gated definition PRs
(Grace's retro case). And eval co-authoring softens the §17.4 cold start: the
conversation's worked examples become golden cases, so a new template is born with a
non-empty eval suite.

### 16.2 Self-Expansion: Everything the Agent Creates Is a Definition

Agent-initiated automation (§10.1 item 4) looks like three scattered things —
schedules, datasets, scripts — but the existing vocabulary unifies them:

- **Schedule ("alarm clock")** = a trigger binding, which per §11 is part of the
  *agent definition* — Freddy's weekly schedule is literally a definition PR against
  his own definition.
- **Dataset + schema** = the *definition* of a first-class entity (§7).
- **Script/tool** = the *definition* of a capability implementation (§6
  crystallization spectrum).

So self-expansion is not a new capability category but **three new types on the
definition-PR channel (§16)** — one self-modification path, not three ad-hoc ones.
That answers most of the governance question: per-type approval policy (auto/human),
deterministic BC-01-analog validation (schema validity, trigger well-formedness),
audit, versioning, trust-based relaxation (§17). And §13.1/§13.2 bound the new
automation's *runtime*: Freddy's weekly report can only do what Freddy holds grants
for.

**Per-type risk profiles:**

| Type | Main risk | Mitigation |
|---|---|---|
| Schedule/trigger | runaway recurrence (cost, attention) | budget attribution from the creator's quota (§14); visible in the fleet view; **default expiry** |
| Dataset | data sprawl, shadow schemas, privacy | birth registers owner, schema, retention, privacy class, home node (§8); schema evolution = definition PRs too, append-only compatible |
| Script | code execution — the sharpest | no raw credentials (§13 already halved it); its PR is a *code diff*, literally code review; the script version enters transcript provenance on every use |

**Three principles not stated anywhere yet:**

1. **No immortal automation without human blessing.** Agent-created schedules are
   time-boxed by default: they expire unless renewed (renewal can be the sibling of
   the §13.1 grant-hygiene review: "Freddy's weekly report has run for 90 days,
   opened 12 times — renew?"). Human-blessed standing automation may exist;
   agent-created eternal automation, silently, may not.
2. **No shadow automation.** Everything an agent creates is mandatorily registered
   and fleet-visible — owner, purpose, creating-instance provenance. Abundly's value
   is frictionless self-expansion; our added value is that **nothing self-expanded is
   unlisted.**
3. **Distillation carries evidence.** When a script replaces LLM behavior (the
   Releaser pattern), that is a behavior change — the script PR ships with eval cases
   demonstrating equivalence (§17.4's bug→test pattern, here: behavior→test→script).
   Crystallization becomes a regression-protected transition, not a quality gamble.

Plus a ladder analogy: new automation can start **on probation** — the first N runs
in "report every run" mode (kin of §17.3 spot-check), then graduating to silent. The
trust machinery reused, applied to automations.

**Scripts, three more notes:**

1. **The sandbox's job is blocking ambient authority, not isolation in general.**
   Scripts call named capabilities and get no raw credentials (§13), so the
   sandbox's one critical duty is making **the capability layer the only door**: no
   ambient network access, no free filesystem — every external effect goes through
   injected capability handles. A script opening a socket directly would bypass the
   grant system (arg predicates, budget, audit) — *that* is the threat, not "code
   runs" in general. Tech choice becomes secondary and stageable: a subprocess with
   a restricted env at hobby scale (review gate + probation protect), WASM/container
   later. Sandbox strength is itself a trust-ladder dimension: fresh scripts run
   tightly isolated on report-every-run probation; battle-tested ones graduate.
2. **Invoking a script is granted like any capability; sharing it is scope
   promotion.** Releaser's get-my-prs.ts is born scoped to Releaser. If Grace wants
   it: publish = gated scope promotion (§15.7), or she gets her own. Script sharing
   needs no separate rule system, and no shadow tool park ("called by everyone,
   maintained by no one") can form.
3. **The distillation pipeline is Level-2 metacognition's canonical play, not a
   side effect:** cost ledger (§14) flags a hot, repeated LLM step → metacognition
   (§16) proposes distillation → script definition PR with equivalence evidence
   (point 3 above) plus deterministic unit tests (cheaper than LLM evals) →
   probation → graduation; the hot LLM step became deterministic and ~free.

### 16.3 The Retro, Concretely

1. **The retro is pairflow's review loop, pointed at behavior.** The v2 plan called
   the Findings pattern universal (code review, doc review, step validation); the
   retro is its fourth instance: **behavior review.** Shape: gather (diaries +
   signals for the period) → analyze → **findings artifact** (same contract:
   severity, description, status — "over-asking and under-reading" is a P2 behavior
   finding) → fixes as definition PRs per finding → human gate → apply. Not a new
   workflow kind: the validate→fix cycle where the "code" is the agent's definition.
2. **Trigger taxonomy — and the incident path is mandatory.** Cadence (every N days
   / N instances); **severe failure → immediate, mandatory retro** (postmortem
   culture; pairs with §17.3's fast trust drop); signal threshold; on demand.
3. **The retro is the convergence point of every signal stream.** The doc has
   quietly built a full signal inventory, scattered: gate outcomes + edit distances
   (§17.1), testimony-evidence divergences (§11.1, §11.3), stalls (§6), ledger
   anomalies (§14), pull patterns (§11.4), grant-narrowing patterns (§13.1),
   contract-drift correlations (§15.1). The retro aggregates them per agent — design
   consequence: the signal read models must be queryable per agent.
4. **Self-retro is welcome — but the review must be decorrelated.** Nuance first:
   because activations are ephemeral (§11), the retro-ing Grace is a *fresh session
   reading past artifacts as data* — no continuous self, no ego, no defensive
   motivation; the human self-review problem does not transfer directly. The
   residual problem is **correlated error**: the retro session runs on the SAME
   definition (same know-how prose, persona, model), so the blind spot that produced
   the failure pattern is active in the reviewer too — and the diary it reads was
   written by the same definition (double correlation). This is exactly the §17.4
   model-diversity argument. Hence the pairing: **the agent drafts its own retro**
   (cheap; the self-narrative is itself signal; the agent CAN improve itself) —
   **a separate retro agent challenges it against transcript evidence** (different
   definition, different know-how, possibly different model; testimony vs. evidence
   operationalized) — human gate at the end. The general principle, third instance
   included: wherever Abundly lets an agent act on itself (self-create, self-retro,
   direct self-modification), we insert a decorrelated second party + a gate
   (authoring agent §16.1; retro challenger; definition PRs). And the symmetry pays
   forward: as the authoring agent accumulates house conventions, the **retro agent
   accumulates retro craft** — failure taxonomies and cross-agent patterns ("this
   over-asking shape is the third agent showing it") — making it the natural feeder
   of Level-3 system metacognition.

---

## 17. Trust Calibration and Evals (Deferred — Keep the Door Open)

Status: deferred. Decision for now: the production-signal approach below is sufficient;
an explicit eval system is acknowledged as necessary in specific cases (cold start,
regression gates, high-stakes cross-checks) and the door stays open for it. This point
ties the other threads together: provenance (foundation), definition PRs (§16), grant
trust ladder (§13), budget/routing (§14), Ask edit-distance (§15).

### 17.1 The Key Insight: Human Gates ARE the Eval Harness

Every human gate decision is a **labeled example**: approve = "the agent's output was
good"; rework/reject = "it wasn't"; and the finest signal — when the human **edits**
the proposed contribution before approving, the edit distance shows exactly *what* was
wrong. The pairflow review loop is the same: findings are a quality signal against the
implementer. If provenance is right (§16 already requires it), **trust-calibration
training data is a byproduct of normal operation** — production is continuous
evaluation. No separate eval infra needed to start; just record what the gates already
see: outcome, override, edit distance, full provenance.

### 17.2 Trust Is a Matrix, Not a Scalar

The v2 Trust Profile (per-gate threshold/history/override_rate) generalizes to:

```
TrustProfile key: (gate, agent, definition version, context bucket)
```

Freddy is trusted for invoices under €1000, not above; Grace for trivial requests,
not complex ones. The **definition version** is a critical dimension: after a
definition PR (§16) the agent behaves partly differently — trust must not blindly
inherit across the version boundary (how much it should decay with change magnitude
is an open question).

### 17.3 The Autonomy Ladder — and the Middle Rung Everyone Skips

Gate modes (mirror of the §13 grant ladder):

1. **always-human** — everything passes through a person
2. **human-with-recommendation** — the agent pre-judges; the human one-click approves
   (already a huge load reduction)
3. **spot-check** — auto-approve, but an N% sample gets post-hoc human review
4. **auto-with-monitoring** — fully automatic, post-hoc audit
5. **full auto**

Rung 3 is the crux and most systems skip it: **sampling keeps the label stream alive
after automation.** Without it a full-auto system drifts silently — nobody looks
anymore, so nobody notices. Spot-check is the drift detector.

Two asymmetry rules: (a) **by reversibility** — cheaply reversible actions automate
earlier; irreversible ones (an email left for the customer) stay gated longer;
(b) **trust climbs slowly, falls fast** — a severe failure (P0-equivalent) means an
immediate rung drop; climbing requires minimum sample size + override-rate threshold.

### 17.4 Where Explicit Evals Are Still Needed

Production signal is not enough in two places:

1. **Cold start:** a new agent / new definition version has no history — golden test
   sets needed (inputs + expected output properties).
2. **Definition-PR regression gate:** a definition PR must pass the definition's eval
   suite before merge — **CI for agent definitions** (§16). The retro workflow can
   also *generate* eval cases: every production failure becomes a regression test —
   TDD culture transplanted to the agent world (bug → test → fix).

"Verify with all LLMs" (Abundly) is an *online* eval mechanism: N models judge
independently, divergence → defer to human. Expensive — worth it at high-stakes
gates; the §14 budget/routing system prices it. One requirement: the panel must be
**model-diverse** — three copies of the same model give correlated errors; different
model families are needed, and the §14.2 provider registry + router is exactly what
can supply "N independent judges", even across tiers (a cheap local model paired
with a cloud one can be a valuable pair).

### 17.5 Distributed Sharpness: Whose Trust?

Trust lives in the eye of the principal: B trusts Freddy differently than C does.
Trust profiles are per-principal (or per-domain): org trust for org gates, personal
trust for personal gates. Trust composes along delegation: the org trusts B's
gatekeeper's auto-contributions to the extent B's matcher's track record warrants.
Across federation, profiles are NOT directly portable (override standards differ) —
**share evidence, not conclusions**.

### 17.6 MVP and Keep-Open Commitments

MVP (nearly free): (1) record gate outcomes with provenance — a few transcript
fields; (2) a `pairflow trust` report (read model); (3) rung-setting stays *manual*,
informed by the report, audited as a config change / definition PR; (4) spot-check
mode as gate config. Rung-transition automation, calibration math (Wilson intervals
etc.), multi-model cross-checks — all later, on demand.

Keep-open commitments (binding now):

1. **Gate outcome + edit distance recorded with provenance from day one** — the data
   is the asset, it cannot be backfilled. Recommendation: this belongs in v2 already,
   not deferred to v3 — every day without it loses data.
2. **Gate mode is a config enum, not a human/auto boolean**
3. **TrustProfile is keyed by definition version**
4. **Templates/definitions can carry an eval suite** (even an empty one)

---

## 18. Organizational-Scale Capabilities (Org-Singularity Source)

Source: the "Organizational Singularity" / ExO 3.0 video reverse-engineering report
(`~/organizational-singularity-reverse-engineering/report/index.html`) — an operating
model for an AI-native firm, not a product. It validates the substrate from above (the
*fiduciary wedge* — AI executes, a named human/legal entity stays accountable for
high-stakes decisions — is "the workflow is the boss" at org scale, and the "what
humans keep" triad §6). Most of its capability checklist already maps to the
braindump; the subsections below cover what it genuinely adds. Several items are
enterprise-direction (org↔org) and marked deferred with keep-open invariants.

### 18.1 Rollback and Compensation

The report asks for granular rollback (state snapshot, compensating action, approval
rollback). In our model this splits into two distinct things, only one of which is
literal rewinding:

- **Internal state** — append-only event log + immutable artifacts + CAS state, so
  state is reconstructible to any prior point (event sourcing).
- **External effect** — a sent email, a completed merge, a wired payment cannot be
  rewound; a **compensating action** is required (saga pattern): not unsend the email
  but send a correction, revert-PR the merge, reverse the transfer.

Six findings:

- **Reversibility is already a model dimension; now it gets an operational twin.** The
  §17.3 trust ladder already uses the reversibility asymmetry. Make it explicit: every
  capability descriptor declares (a) its class — **reversible / compensable /
  irreversible** — and (b) if compensable, its compensating capability. One piece of
  metadata, two uses: trust calibration AND rollback.
- **Append-only + rollback is not a contradiction — rollback is forward motion.** The
  transcript is never rewritten; a "rollback" is a **compensating event sequence** that
  takes state back to a prior *value* while the history stays complete (the error and
  the compensation remain visible). The rollback itself is an audit event — time travel
  would defeat auditability.
- **Compensation is itself a gated workflow, not a magic undo.** A correction email is
  email-sending under the same capability check, grant, and budget — and often
  *higher* stakes (admitting an error outward), hence frequently human-gated. No silent
  auto-undo.
- **The irreversible class is the closing link to the human gate.** What has no
  compensation (money at a foreign bank, leaked confidential data) has only
  *prevention* — these stay human-gated longest (§17.3) and are **never
  auto-approvable**. The reversibility class is thus both a rollback input and a trust
  ceiling.
- **Forward recovery often beats full rollback — the workflow decides.** WF-2's
  cancel-with-compensation trap: the candidate withdraws → cancel the laptop order,
  revoke the accesses, but the background-check result may be kept. Compensation is
  selective and template-defined, not a global "undo everything".
- **"Granular" = step/round checkpoints, not instance-level.** Because state is
  two-level (lifecycle + execution position, §2.2) and the transcript is round/step
  segmented, a rollback can target a specific round/step boundary (a review loop's 5th
  round back to the 3rd without discarding the whole). A checkpoint = a transcript
  position + the compensation requirement for the external actions taken since.

### 18.2 MTP as Steering Protocol

The report's central element: the MTP (massive transformative purpose) is "not a
poster" but a machine-readable steering protocol. The "purpose → protocol" rename
emphasizes that purpose is not a passive compass but **an active filter you can run
every activity through**.

**Purpose as an active lens — a fifth judgment type.** We had four decision kinds:
capability check (binary), gate/policy (allow/block/defer), trust (when a gate may be
skipped), judgment routing (which path). The purpose protocol is a fifth, different in
nature: **alignment assessment** — "does this activity serve the purpose?" — and
crucially it is **not enforcement**. It does not block; it **surfaces**. An LLM
judgment that runs over activities and flags what drifts, even when the action is
fully permitted.

**The gap only this catches.** Consider an action that (a) passed every capability
check, (b) is within budget, (c) is even short-term *profitable* — all green — and yet
runs against the firm's purpose. **No existing mechanism filters this**: capability is
binary, gates are rule-based, budget is financial, trust is historical. The
"permitted AND profitable BUT wrong" category is a blind spot, and the purpose lens is
the only thing that catches it — the classic **local vs. global optimum** tension
(cost-budget §14 represents the local financial optimum; purpose the global one).

**Why it is LLM territory.** A "never lie" prohibition is binary and mechanical (that
is the boundary, the smaller half). But "this is good for the company short-term yet
contrary in spirit to the goal" is a soft, context-sensitive, partly philosophical
judgment — what only humans used to do and cannot do manually for every action. A
purpose-aware agent **scales** it: running over activities, surfacing the ones that
are "technically fine but directionally off". This is the MTP's real value — not the
prohibition list, but scaling ethical/alignment reflection.

**How it fits — the watchdog/metacognition lane.** Not on the hot path (synchronous
per-action filtering would be slow and costly): an **asynchronous review layer** (kin
of spot-check §17.3 and retro §16.3) reading the transcript, decision artifacts, and
cost ledger to surface misalignment — what the report calls **watchdog agents** in
Govern/Assure. Retrospective by default (sampled/periodic); **prospective** for
high-stakes irreversible actions (§18.1 reversibility class). And **flag, not block —
the fiduciary decides**: on a profit-vs-purpose conflict the lens does not auto-decide
but routes to a human (the fiduciary wedge's high-stakes call). Purpose surfaces; the
accountable human decides.

**The boundary is the smaller, hard half.** Hard prohibitions (deny predicates,
kernel-enforced) live in an outermost org-policy ring — the policy hierarchy gains a
top ring above arg predicate < gate < grant, composing by intersection (most
restrictive binds), unoverridable by any template. Important distinction: *system*
invariants (op_id idempotency, EventEnvelope-only boundaries, gatekeeper layering)
stay in code — not org-specific; the org's own rules ("we never do X here") are
**data** (org policy), not code. But this hard ring is the MTP's less interesting
side.

**Two registers of purpose steering.** (1) The generic alignment lens above — a new
substrate capability. (2) Org-specific dedicated workflows and metric dashboards that
collect/compute purpose-relevant data — and these need **no new substrate
capability**: they are ordinary apps on the existing dataset / read-model / dashboard
/ workflow primitives (§7, §15.7). The substrate does not try to solve every form of
purpose monitoring generically; part of it is simply "another app on the platform".

**Loose ends that close.** Purpose divergence is a metacognition signal — the lens's
aggregated hits feed it (declared purpose vs. actual operation drifting → an MTP
definition PR, §16; same divergence pattern as diary vs. transcript §11.1). The MTP
itself is a definition (machine-readable, versioned), changed by the highest-stakes
definition PR (owner/board-level gate). And at hobby scale the personal domain has a
purpose too — the CLAUDE.md-analog — usable as an active lens over one's own
activities ("I'm doing this, but is it what I actually wanted?"). Not just enterprise.

### 18.3 Data-Object Metadata That Travels (Sticky Labels)

The report asks for "data-object metadata that travels with the data". Our gatekeeper
(§12) is **perimeter enforcement**: it checks at the domain *boundary* — what may
leave/enter. That holds while data is inside the boundary. Once it leaves (a
contribution from B into the org instance, org data to another firm), the perimeter no
longer protects: the data is in another control domain. Sticky policy
(data-centric security) is the complement: the policy **rides with the data object**
and is enforced wherever it lands. The gatekeeper decides whether data *may leave*;
the sticky label governs what may be done with it *after*.

**Worked example (WF-1).** B (procurement) gets an Acme contract email: an effective
date (2026-07-01) and a **confidential clause** ("30% discount, keep it secret, we
don't give it to other customers"). B's gatekeeper extracts the clause for the #42
invoice workflow.

- *Without a sticky label:* the gatekeeper correctly let the data leave B's mailbox.
  Now it moves freely, and each downstream step is individually permitted — the #42
  workflow writes a monthly supplier report to a company-wide dashboard ("Acme: 30%
  discount"), or a benchmark agent writes the clause into a dataset later sent to an
  external partner. The gatekeeper no longer sees any of this; nothing explicit was
  violated, yet the confidential clause leaked. **There is nowhere to remember where
  the data came from and what its limit was.**
- *With a sticky label:* the gatekeeper attaches `{ origin: B, confidential: true,
  allowed_use: "invoice validation only", allowed_recipients: [finance-internal],
  no_external: true }`, riding with the value. The report step → kernel reads the
  label → blocks/flags writing the clause to the shared dashboard. The benchmark step
  → `no_external: true` → kernel stops it. The label is the **memory that sticks to
  the data**, present at every downstream step, not just at the boundary.

Findings:

- **The artifact envelope (§15.1 BC-07) is the natural carrier.** Every artifact
  already has an envelope (artifact_id, flow_id, created_by, schema_version,
  content_ref); the sticky label is a `policy` block extension — **not a new entity**.
  Artifacts are immutable, so the label is too: an object's policy is fixed at birth
  (change = new artifact, like schema evolution).
- **Label contents** (the report's list, structured): provenance/origin (whose, §13
  principal), allowed use (purpose binding — ties to the §13 grant purpose field),
  allowed recipients (an allowlist like §13.2 arg predicates, but on the *data* not
  the caller), retention/expiry (macaroon-caveat style), exposure/on-error policy, and
  consent (the gatekeeper's "B consented to this use").
- **Derivation inheritance is the delicate part — taint propagation.** Data derived
  from a labeled object (summarize, extract, combine) **inherits the intersection** of
  source labels (most restrictive binds — §13.2/§14 composition again): a number
  derived from the Acme clause stays "Acme-origin, no_external" unless an explicit,
  gated **declassification** step relaxes it ("this aggregate no longer traces back to
  Acme") — itself a high-stakes, human-gated action. Default: taint spreads; loosening
  needs an audited step.
- **Enforcement — honest about own vs. external.** Inside our substrate (domain↔domain
  on our kernel) the receiving kernel reads the label and enforces mechanically.
  **At an external party (org↔org, foreign system) perfect technical enforcement is
  impossible** — the classic DRM problem. There the label is part technical (if the
  receiver runs a compatible substrate) and part legal/contractual — the
  "liability framework codesigned in advance" (§18.5). Sticky label + liability give
  *practical* protection, not a mathematical guarantee; don't overpromise.
- **Federation precondition.** When an instance re-homes or a contribution crosses a
  domain boundary, labels are the **only way the policy crosses too** (§8) — without
  them the boundary forgets the rule. Not a federation luxury; a prerequisite.
- **Useful at hobby scale already.** The gatekeeper labels the extracted date
  ("B-origin, for this instance, don't log to an external dataset"), strengthening the
  privacy thesis at the data-object level — and meeting §18.1's irreversible class:
  leaked confidential data is irreversible, so the label is a *prevention* tool
  controlling where data may go at all.

### 18.4 Accountability Shell

The fiduciary wedge's operational core. **Provenance ≠ accountability:** on-behalf-of
provenance (§13) records *which agent* acted under *which grant*; accountability
records *which named human/legal entity bears the consequence*. They often diverge —
the agent executes, but the responsible party sits at the **top** of the delegation
chain, not at the executing end.

- **The chain closes upward with a human — "the buck stops here".** The §13 chain
  delegates downward (A→B→C grants); accountability says a human/legal entity is
  always at the top and responsibility does **not flow down** to agents. If Freddy
  sends a bad email, Freddy does not answer for it — the named human who backs Freddy's
  high-stakes actions does. That is the fiduciary.
- **Not a new mechanism — a field plus an invariant.** High-stakes capabilities/grants
  carry a mandatory `accountable_principal` (a named human/legal entity); the invariant
  is that it **cannot be an agent** and **cannot be empty** at high stakes. The kernel
  enforces it: a high-stakes action without an accountable principal cannot run. This
  mechanizes the wedge — the point where the chain must reach a human.
- **The key subtlety: autonomy rises, accountability does NOT fall — they are
  orthogonal.** The trust ladder (§17) governs whether a human approves each step *in
  advance*; accountability governs *who answers if it goes wrong*. Under spot-check
  auto-approve (§17.3) the human does not look ahead — yet remains responsible
  *afterward*. The naive "if the agent is autonomous, the agent is responsible" is
  exactly the error the shell rules out: even a full-auto agent has a named human
  accountable. Two separate ladders.
- **Accountability is the human anchor of rollback/compensation.** Tied to §18.1: when
  a high-stakes action fails and needs compensating, the accountable principal
  authorizes it — the report's "approval rollback" routes there. The shell links the
  failure to the responsible party.
- **Audit: a mandatory transcript field at high stakes.** Every high-stakes entry
  records the accountable principal (not just on-behalf-of), so postmortem/retro
  (§16.3) and the purpose lens (§18.2) can always answer "who owned this?" — the
  accountability side of the report's searchable-logs + human-review-queue requirement.
- **Hobby scale: you are the fiduciary for every personal action.** In the personal
  domain you are trivially the accountable principal for high-stakes actions — same
  mechanism, and it is what makes federation possible later: when an org instance runs
  on your node, the grant's `accountable_principal` says who answers for the outcome
  (you, or the org fiduciary).
- **Bridge to the external side.** Accountability is the wedge's *internal* side (who
  answers inside one org). Its *external* counterpart — when two firms' agents transact
  — is the liability framework codesigned in advance, in the cross-firm federation
  section (§18.5). Two halves of one line.

### 18.5 Cross-Firm Federation (Deferred — Keep the Door Open)

Status: deferred (pure enterprise, org↔org; the hobby project does not need it). The
report's "Cross-Firm Agent Architecture — architecture, not goodwill" is literally our
thesis raised to the org boundary: enforced structure, not trust/goodwill. Its three
requirements are mostly existing pieces extended past the firm boundary:

- **policy-controlled API surface** = the kernel's single entry point + grant per call
  (§13) — already in place in principle; the receiver is just *another firm's* kernel.
- **data-object metadata that travels** = sticky labels (§18.3) — already written.
- **liability framework codesigned** = the accountability shell's (§18.4) external side
  + the contract entity (§15.1) raised to federation level.

So cross-firm federation is assembling existing parts at the org boundary, not new
construction.

**The new precondition: trusted events / signed provenance — and two kinds of trust.**
Inside a domain, EventEnvelope provenance suffices (the kernel believes its own
events). Cross-firm, the receiver cannot blindly believe the sender's claim →
cryptographic source authentication: signed envelopes, the §13 UCAN/signed-delegation
chain extended to the events themselves. Crucial distinction: **§17 trust** = "how much
I trust the agent's *judgment*" (behavior, calibrated); **cross-firm trust** = "is it
really *their* agent that sent this" (identity/origin, cryptographic). The federation
needs the second; do not conflate them.

Four more findings:

- **Liability "codesigned in advance" = the contract entity, by both parties, up
  front.** The §15.1 producer/consumer contract, at federation level, records not just
  the data format but the **liability split** ("if your agent sends bad data, you
  answer; if mine misreads it, I do") — the contract entity + accountability shell
  fused: an API contract + SLA + liability clause both parties signed.
- **The trust asymmetry is the whole difficulty.** Inside a domain everything is our
  code → mechanical enforcement. Org↔org, we do not control the other side's code. So
  what crosses must be (a) **self-carrying** (sticky label + signed provenance — not
  reliant on the receiver's goodwill) and (b) covered by a **legal frame** (liability)
  for the non-technically-enforceable part. The §18.3 DRM problem generalized to the
  whole interaction.
- **The §8 relay is the carrier.** Kernel federation's relay/op_id/resume-token is "one
  mechanism at three scales" (node↔node, personal↔org, org↔org). Cross-firm is the same
  relay, wrapped in signed envelopes, a foreign-firm-kernel receiver, sticky-labeled
  data, and a codesigned liability contract. Org↔org now gets concrete requirements;
  the carrier already exists.
- **"Companies as protocols" — the vision fits.** The report's 2036 endpoint: firms as
  protocols. That is the endpoint of our federation + contract-as-architecture line: if
  a firm's interface is a policy-controlled API + sticky-labeled data + a codesigned
  liability contract, then the firm is, from outside, a protocol. Nothing to build now;
  good to know the model is consistent in that direction.

**Keep-open invariants (cheap, binding now; nothing to build yet):** boundaries carry
only EventEnvelopes and these are made signable (a provenance field that later grows a
signature); every artifact carries a sticky-label-capable envelope (§18.3); every
high-stakes action carries an accountable principal (§18.4); contracts are first-class
entities (§15.1). Hold these and cross-firm later builds on top **without retrofit**.

### 18.6 Validation Map and Non-Substrate Remainder

**Non-substrate remainder.** The report's REWRITE methodology, Edge deployment,
J-curve/turbulent transition, and middle-60% problem are organizational change
management — correctly the source's normative layer, not ours. But three substrate
seeds hide in them:

- **The trust ladder IS the role-transition engine (middle 60%).** "People move from
  execution to exception-handling and review" is the macro-consequence of the §17
  trust ladder: as agents earn autonomy rungs, humans shift to the defer/escalation/
  review side. We do not solve the org/HR problem, but the substrate's trust mechanism
  is literally what drives the shift.
- **The migration control plane is a workflow.** REWRITE (process mining, readiness
  score, canary rollout, value tracking) is itself a workflow the substrate could run —
  dogfooding like WF-7. Not a new capability; an application.
- **Edge Twin sandbox = our isolation at org scale.** Isolated agent pod + mirrored
  data is the worktree/sandbox isolation (§16.2 no-ambient-authority) at organizational
  scale.

**Validation map.** The report's "what the system must do" catalog, mapped to the
braindump — documenting the "we're not far from this" feeling: most of it is already
covered.

| Report requirement | Where in the braindump | Status |
|---|---|---|
| MTP-as-protocol | §18.2 | new (this source) |
| Enterprise OODA loop (sense→interpret→decide→orchestrate→learn) | §5 triggers, §4 correlation, §3.1 decide, kernel orchestrate, §16 learn | covered |
| Agent registry & passport | §11 (durable identity) + §13 (grants) | covered |
| Policy-controlled API surface | §13 grant per call; §18.5 cross-firm | covered / deferred |
| Data-object metadata | §18.3 sticky labels | new (this source) |
| Govern/Assure: trusted event | §5 EventEnvelope; §18.5 signed provenance | covered / deferred |
| Govern/Assure: searchable logs | §6 observability + transcript | covered |
| Govern/Assure: granular rollback | §18.1 | new (this source) |
| Govern/Assure: human review queue | §15 Ask/approvals | covered |
| Govern/Assure: watchdog agents | §18.2 purpose lens; §17.3 spot-check | covered |
| Workflow migration control plane | §18.6 (a workflow, dogfooding) | non-substrate seed |
| Human role transition support | §17 trust ladder drives it | non-substrate seed |
| Edge Twin sandbox | §16.2 isolation at org scale | non-substrate seed |
| Board/J-curve governance | — | non-substrate (change mgmt) |
| Proprietary intelligence layer (the moat) | §15/§16 org memory + metacognition + provenance-as-asset | covered (our thesis) |
| Curatorial judgment workflows | §6 what-humans-keep + §17.1 review-as-eval + §11.1 diary/rationale | covered |
| Accountability shell / fiduciary wedge | §18.4 | new (this source) |

Net: of the source's catalog, the majority is already covered, five items are genuine
additions from this source (§18.1–18.5), three are non-substrate seeds, and one
(board/J-curve) is purely organizational. The "not far from this" intuition holds.

---

## 19. Existing-Tools Assessment

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

## 20. Open Questions (Unordered)

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
- Ask UX remainders (§15 sets the model): partial saves / amendable answers on long
  forms; standing intake-form governance (spam/abuse, rate limiting); is the
  generated-apps tier (15.2/3) a goal at all, or do card+form plus read-only digest
  views suffice?
- On-behalf-of audit entry: exact schema (grant id, chain, action, argument hash) —
  §13 sets the principles (adopt OS keychain/age/1Password, never build), the schema
  is open
- Vendor-hosted personal node: is an end-to-end-encrypted hosted option feasible later,
  and what must the foundations preserve to keep it possible (§8)?
- Node↔node edge cases within one personal domain: grant/memory visibility when an
  instance's home node differs from where a connector lives
- Trust remainders (§17 sets the model): trust decay across definition versions;
  calibration math for rung transitions; cross-principal evidence sharing format in
  federation
- Internal lifecycle events as a channel: are kernel events just another EventEnvelope
  source_channel ("kernel"), keeping the router uniform?
- How do datasets relate to artifacts: is a dataset entry an artifact with a collection
  id, or a separate entity with its own contract?
- Agent-authored scripts remainder (§16.2 sets the governance and the
  no-ambient-authority principle, §13 the credentials): which mechanism implements
  no-ambient-authority per node (restricted subprocess / WASM / container)?
- External-state subscription remainder (§3.2 sets the model: reference don't mirror,
  mandatory reconciliation, re-read before acting): per-connector tuning of webhook
  vs. scan, and reconcile cadence
- Agent-scoped memory governance: what may an activation write into agent memory, and
  how is cross-instance leakage audited?
- Local vs. global agent definition references from a step: version pinning? what
  happens to memory homing when a global definition runs locally?
- Definition-PR mechanics (§16): how are auto-approve thresholds set, audited, and
  revoked when an auto-approved change misbehaves?
- Grant negotiation remainder (§13.1 sets the model): calibrating rate limits on
  grant requests per agent

---

## 21. What This Document Is Not

Not a design. Not prioritized. Not consistent. It is the raw material for the
convergence phase: the next step is to pick the load-bearing decisions (kernel
invariants, correlation model, federation boundary, the three gap subsystems) and test
them against [test-workflows.md](test-workflows.md) scenario by scenario.
