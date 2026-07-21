# V3 Concept — Test Workflows

Status: draft
Date: 2026-06-12
Purpose: Seven theoretical workflows used as a fixed test set for the forming v3 concept
(distributed, cross-person workflows coordinated by a shared kernel). Every iteration of
the concept should be walked through these scenarios on paper before any
implementation decision is locked in.

Each workflow is chosen to exercise a distinct combination of capabilities, and each one
contains a deliberately embedded trap (edge case) the design must survive. Together they
cover the risky surface of the concept: trigger kinds, wait kinds, correlation kinds,
human gates, timers, idempotency, cancellation, and external participants.

---

## WF-1: Inbound Invoice Processing

**Trigger:** Email arrives at person A (finance) with a vendor invoice attached.

**Flow:**
1. A's agent extracts structured data from the invoice (amount, vendor, PO number).
2. The contract terms for the PO live with person B (procurement) — inside an earlier
   email in B's private mailbox. The workflow registers a wait condition:
   "waiting for contract terms for PO #X from vendor Y".
3. B's gatekeeper agent recognizes the relevant email in B's mailbox, matches it against
   the open wait condition, and offers a contribution to B: "this email seems to resolve
   workflow instance #42 — submit the extracted terms?" Only the extracted data enters
   the workflow; the email itself never leaves B's mailbox.
4. If the invoice amount exceeds a threshold, a human approval gate fires for the finance
   lead (policy-based gate).
5. Approved invoice is handed off to accounting.

**Capabilities exercised:**
- Email trigger with unstructured payload
- Private-data federation (gatekeeper agent; kernel sees contributions, not mailboxes)
- Wait condition registration + fuzzy (LLM-assisted) correlation of an unsolicited event
- Policy-based human gate (amount threshold)
- Task inbox delivery

**Embedded traps:**
- The vendor sends the same invoice twice → idempotency: a duplicate event must NOT start
  a second instance.
- Two open invoices from the same vendor are in flight → ambiguous correlation: which
  instance does B's contribution belong to? The matcher must detect ambiguity and require
  human confirmation instead of guessing.

---

## WF-2: New Employee Onboarding

**Trigger:** Manual start by HR. The template contains date-relative steps
("3 days before first working day").

**Flow:**
1. Parallel branches fan out:
   - IT equipment order (person C)
   - Access provisioning (person D)
   - Contract signing (HR + external signer)
2. Join on "everything ready" before the first working day.
3. Scheduled buddy reminder on day one.

**Capabilities exercised:**
- Parallel steps with a join barrier
- Weeks-long instance lifetime
- Scheduled / date-relative steps
- Multiple task inboxes active simultaneously
- Reminder + escalation: D does not react for 3 days → escalate to D's manager

**Embedded trap:**
- The candidate withdraws in week 2 → cancellation with compensation: already-provisioned
  accesses must be revoked, the ordered laptop cancelled. Cancel is not just a state
  transition — it triggers cleanup steps.

---

## WF-3: Weekly Management Report

**Trigger:** Cron (every Friday 08:00).

**Flow:**
1. Fan-out data collection:
   - Two sources automatic (agents pull from systems)
   - Two sources human contributions (sales and support weekly summaries)
2. Aggregation barrier with a 10:00 deadline.
3. Agent drafts the report.
4. Review gate by the manager.
5. Publish to Slack.

**Capabilities exercised:**
- Scheduled trigger producing recurring instances
- Fan-out + barrier with a deadline
- Degraded completion: whatever has not arrived by 10:00 proceeds marked as "missing" —
  the workflow must never block forever on a human contribution
- Recurring-instance management (a new instance every week)

**Embedded traps:**
- The sales contributor is on vacation → substitution rule from the participant registry
  (who is the fallback contributor?).
- Last week's instance is still running when this week's instance starts → overlap policy.

---

## WF-4: Customer RFP to Quote

**Trigger:** Unstructured email from an **external** party to the sales address.

**Flow:**
1. Classification: is this a new RFP (start a new instance), a reply belonging to a
   running deal (feed a waiting instance), or neither? This exercises the trigger
   router's three-way decision live.
2. Technical content requires input from an engineering colleague (blocking wait).
3. Agent drafts the quote.
4. Approval gate.
5. Quote sent to the customer.
6. Follow-up timer: no customer reply within 7 days → reminder email. The customer's
   reply is correlated back via the email thread.

**Capabilities exercised:**
- External participant (no agent, no identity in the system — email-thread correlation
  only)
- Trigger router three-way decision (new instance / feed instance / unmatched)
- Multi-round loop with an external party
- Timers attached to a running instance

**Embedded trap:**
- The customer replies with an acceptance **after** the quote has expired → stale intent:
  the instance is already EXPIRED, so the incoming event must not be applied blindly.
  A new round requires a human decision. (This is the distributed counterpart of the v2
  plan's WAL stale-intent rejection invariant.)

---

## WF-5: Contract Renewal Watch

**Trigger:** Neither an event nor a fixed cron — a **data condition**: a daily scan
detects that a contract expires within 60 days.

**Flow:**
1. Instance starts for the expiring contract.
2. Decision gate at the contract owner: renew / renegotiate / let lapse.
3. Optional legal-review subflow (blocking).
4. Wait for an external event: signed PDF arrives.
5. Archive and write the outcome into **org memory** (the new expiry date — which becomes
   the trigger data for the next cycle).

**Capabilities exercised:**
- Data-driven trigger (state-of-the-world, not an inbound message)
- Singleton guarantee: the daily scan "sees" the approaching expiry every day for 60
  days, yet exactly one instance may exist per contract per cycle
- Very long sleep periods
- Branching human decision
- Closing the loop: the workflow's own output becomes the trigger data of the next
  instance

**Embedded trap:**
- The decision is "let lapse" → the workflow must handle downstream obligations: a
  termination letter has a deadline, i.e., a timed obligation emitted from an instance
  that is winding down.

---

## WF-6: Inbox Processing Pipeline

**Trigger:** Two cooperating triggers — every inbound email (event trigger, high volume)
and a daily cron (07:00) for the digest.

**Flow:**
1. Triage on every inbound email (config rules + LLM classification):
   - drop (configured noise)
   - surface as action item (the email implies something the owner must do)
   - kick off a sub-workflow (e.g., newsletter processing)
   - default: include in the next daily digest
2. Newsletter sub-workflow: extract the N article links → **dynamic fan-out** — each link
   gets fetch → summarize → novelty-rank, all in parallel (N is data-driven, unknown at
   template-authoring time).
3. Articles above the novelty threshold are written into a **bronze dataset** (raw
   store of scored article summaries).
4. A separate downstream workflow subscribes to the bronze dataset's change feed: new
   entries are periodically examined for novel concepts/patterns worth extracting, and
   promoted into the curated knowledge layer (personal wiki) — bronze → curated, in
   medallion-architecture terms.
5. Every morning the digest workflow aggregates across the previous day's instances:
   triage outcomes, action items, top-ranked articles → one summary message.

**Capabilities exercised:**
- High-volume event trigger feeding a triage router (config rules + LLM hybrid)
- **Dynamic fan-out over a data-driven item list** (map over collection; agent-only
  parallelism, no human in the loop)
- **Datasets as first-class entities with change feeds**: workflows compose through
  persistent collections, not only through messages; a downstream workflow is triggered
  by new entries in a dataset another workflow wrote
- **Score-based gate**: the novelty rank is a number, routing thresholds on it
  (non-binary policy output)
- **Cross-instance aggregation (read model)**: the digest queries the outputs of many
  instances over a time window

**Embedded traps:**
- A newsletter contains 80 links → fan-out bounds: concurrency cap, per-item failure
  isolation (one dead link must not fail the batch), cost guard.
- The same article arrives via two different newsletters → dataset-level dedupe (the
  bronze layer, not the workflow, owns uniqueness).
- The digest runs while a newsletter sub-workflow from yesterday is still in flight →
  the digest must report on partial state honestly ("3 items still processing").

---

## WF-7: Plan Execution (Pairflow Self-Hosting)

**Trigger:** Manual — an approved plan document exists and the owner starts execution.
(Today this is the ExecutePairflowPlan skill plus the `pairflow plan watch` polling
command; this workflow replaces both.)

**Flow:**
1. Parent workflow instance is created for the plan; it iterates over plan steps.
2. For each step: generate/refine the task spec (agent step, with a human gate if the
   spec deviates from the plan) → spawn a **child workflow instance** (a pairflow
   bubble: implement/review loop) → the parent step blocks, waiting on the child's
   lifecycle events.
3. The parent's wait condition subscribes to **internal kernel events**: "child instance
   reached READY_FOR_HUMAN_APPROVAL / DONE / FAILED". No polling.
4. On child DONE: parent advances to the next plan step. On child FAILED or human
   rework: parent routes per template (retry, re-spec, or escalate to owner).
5. When all steps are done: aftermath handoff (plan marked complete, summary to owner).

**Capabilities exercised:**
- **Workflow-of-workflows**: a child is a full first-class instance with its own
  lifecycle, not an embedded subflow; parent-child links are tracked
- **Internal lifecycle events as a channel**: kernel-emitted instance transitions are
  subscribable triggers, replacing the `plan watch` polling hack
- Long-lived parent instance spanning many child instances and human gates
- Orchestration moved out of agent prompts into the kernel: the observed
  LLM non-adherence to the ExecutePairflowPlan skill is direct evidence for the
  "workflow is the boss" principle — prompt-level (Level 1) enforcement is advisory,
  kernel-level is not

**Embedded traps:**
- The child bubble is cancelled or deleted out-of-band (operator intervention outside
  the parent's control) → the parent must detect the orphaned wait and route to a
  recovery decision instead of waiting forever.
- The human approves the child but requests a plan-level change → the parent's remaining
  steps are now stale: re-spec gate before continuing.

**Topology note (local vs. global):** this workflow is fully local — same kernel
semantics as the company-level workflows, different topology. Local/global is a
deployment attribute (where instance state is homed, which identity model and channels
apply), not a type difference in the model. The intended long-term shape is kernel
federation: a global instance assigns a task to a person, that person's local kernel
runs an entire local workflow (e.g., this one) and reports back a single contribution —
the same gatekeeper pattern used for private mailboxes, and the same relay/op_id
mechanics as the v2 remote executor (BC-08).

---

## Coverage Matrix

| Capability | WF-1 | WF-2 | WF-3 | WF-4 | WF-5 | WF-6 | WF-7 |
|---|---|---|---|---|---|---|---|
| Trigger kind | email | manual | cron | email (external) | data condition | event + cron | manual |
| Wait condition + fuzzy correlation | x | | | x | | | |
| Private-data federation (gatekeeper agent) | x | | x | | | x | |
| Human gate / approval / decision | x | x | x | x | x | | x |
| Parallelism + join | | x | x | | | x | |
| Dynamic fan-out over data-driven items | | | | | | x | |
| Timer, reminder, escalation | | x | x | x | x | | |
| Idempotency / singleton / dedupe | x | | x | | x | x | |
| Cancel / compensation / stale intent | ambiguity | x | degraded | x | x | partial state | orphaned child |
| External participant | | signer | | x | x | | |
| Dataset layer + change-feed trigger | | | | | x | x | |
| Score-based (non-binary) gate | | | | | | x | |
| Cross-instance aggregation (read model) | | | x | | | x | |
| Child instance as step (workflow-of-workflows) | | | | | | | x |
| Internal lifecycle events as trigger | | | | | | | x |
| Org memory write | | | x | | x | x | |

---

## Deliberately Out of Scope

Two areas this set intentionally does not cover, deferred until the core concept holds:

1. **Blackboard-to-template discovery** — emergent formalization of recurring patterns
   into templates (a later, learning layer).
2. **Multi-tenant / cross-company federation** — workflows spanning organizational
   boundaries. (Local vs. company-level topology within one organization IS covered —
   see the topology note in WF-7.)

---

## Recommended Test Order

1. **WF-1 (invoice)** first: the smallest scenario that still contains the two riskiest
   novelties — fuzzy correlation of an unsolicited event, and federated handling of a
   private mailbox.
2. **WF-4 (RFP)** second: reveals whether the model survives a participant who is outside
   the system and behaves unstructuredly.
3. **WF-7 (plan execution)** third: it is the dogfooding scenario — pairflow describing
   its own orchestration — and the first to stress workflow composition and internal
   lifecycle events; it also has an immediate practical payoff (retiring the
   `plan watch` polling hack and the prompt-level skill orchestration).
4. WF-3, WF-2, WF-5, WF-6 afterwards in any order — they primarily stress scheduling,
   parallelism, dataset composition, and lifecycle edge cases on top of an
   already-validated core.
