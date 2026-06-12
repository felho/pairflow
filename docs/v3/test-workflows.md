# V3 Concept — Test Workflows

Status: draft
Date: 2026-06-12
Purpose: Five theoretical workflows used as a fixed test set for the forming v3 concept
(distributed, cross-person workflows coordinated by a shared kernel). Every iteration of
the concept should be walked through these five scenarios on paper before any
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

## Coverage Matrix

| Capability | WF-1 | WF-2 | WF-3 | WF-4 | WF-5 |
|---|---|---|---|---|---|
| Trigger kind | email | manual | cron | email (external) | data condition |
| Wait condition + fuzzy correlation | x | | | x | |
| Private-data federation (gatekeeper agent) | x | | x | | |
| Human gate / approval / decision | x | x | x | x | x |
| Parallelism + join | | x | x | | |
| Timer, reminder, escalation | | x | x | x | x |
| Idempotency / singleton / dedupe | x | | x | | x |
| Cancel / compensation / stale intent | ambiguity | x | degraded | x | x |
| External participant | | signer | | x | x |
| Org memory write | | | x | | x |

---

## Deliberately Out of Scope

Two areas this set intentionally does not cover, deferred until the core concept holds:

1. **Blackboard-to-template discovery** — emergent formalization of recurring patterns
   into templates (a later, learning layer).
2. **Multi-tenant / cross-company federation** — workflows spanning organizational
   boundaries.

---

## Recommended Test Order

1. **WF-1 (invoice)** first: the smallest scenario that still contains the two riskiest
   novelties — fuzzy correlation of an unsolicited event, and federated handling of a
   private mailbox.
2. **WF-4 (RFP)** second: reveals whether the model survives a participant who is outside
   the system and behaves unstructuredly.
3. WF-3, WF-2, WF-5 afterwards in any order — they primarily stress scheduling,
   parallelism, and lifecycle edge cases on top of an already-validated core.
