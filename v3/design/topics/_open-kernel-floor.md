# The Kernel's Floor and Edges — Weight Floor, Exclusion, and the Not-a-Workload Line

Status: **settled direction (2026-07-07)** — all four boundaries ratified as proposed; see "Settled direction" below (including the enforcement answer and the kernel-vs-product framing the decision discussion produced).
Date: 2026-07-06 · Settled: 2026-07-07
Source: the BitSafe workflow simulation (`research/bitsafe-workflow-simulation.md`, GAP-2 + GAP-11 + the recurring "not a kernel workload" verdicts)

## Question

Where does the kernel's responsibility *stop* — downward (work too small to
deserve an instance) and outward (coordination shapes deliberately left to the
runtime)? The simulation kept hitting the same unwritten line from different
directions; the items below are decisions to state, most of them plausibly
"by design — outside", but a reader today sees omissions, not decisions.

## 1. The instance-weight floor (GAP-2 — 9 of 17 workflows)

Every run pays the full instance lifecycle + LC archival regardless of
coordination content. Real fleets price this constantly: a ~7,700-run autofill
agent (S2), a one-property audited CRM write (S1), a 4-check-vs-1-sweep fork
(S5), a 35-check batch-vs-fan-out decision (S6), ~55 mostly-empty dispatcher
ticks/day (S9), a ~90-second consult (S14), a minute-cadence heartbeat — 1,440
would-be instances/day of pure ceremony (S17, the canonical below-floor case).

To decide and write down:

- Is the answer a **rule** ("below this line, stay provider-native — the
  kernel earns entry when the wait must survive the performer or the ask needs
  independent audit", the S10/S14 line), a **lighter kernel form**
  (sub-instance-weight audited errand), or both?
- Name the canonical cases on each side: runtime self-supervision
  (heartbeats), per-API-call telemetry, and sub-session consults are
  provider-native; anything parked across human latency is kernel.
- The batching guidance that follows from the rule (per-sweep vs per-event
  instances; when per-item audit justifies per-item ceremony).

## 2. Cross-instance exclusive-resource claims (GAP-11 — S11, S12)

A singleton external resource held exclusively by one instance at a time —
one dev VM as one smoke slot with queue + priority injection (S11's flock);
shared file paths with TTL-expiring claims (S12's `claim_file`, 25-minute
auto-expire). No claim/lock construct spans instances: the wait slot is
per-instance, L4 links per-parent, L6 §3 governs scheduler dispatch not
mid-instance acquisition, GAP-10's counters are quota not exclusion — and
`Lease` is deliberately poisoned vocabulary ("implies TTL + renewal; the model
has none"), so expiring claims are absent *by construction*.

To ratify: **is resource/file-grain exclusion below the kernel's line by
design** — de-vocabularized routing knows no paths; which files a performance
touches is discovered mid-performance behind P5 — with the kernel's
contribution capped at task-grain creation identity (one live instance per
task row; see `_open-creation-identity.md`)? If yes, state the residual cost
honestly: the kernel cannot distinguish "parked 4th in the queue" from
"watcher dead" (an L9 R1/R3 concern), and queue-priority policy is invisible
to the transcript.

## 3. The off-host supervision boundary (S17)

The watchdog/pager tower terminates outside v3 by the same argument BitSafe
gives for BetterStack: every on-host monitor dies simultaneously in a kernel
panic. Already folded into L9 R8 (future-topic L9 #7) as a contract
requirement; record it here as a *boundary* statement too — the outermost
liveness monitor is not v3's to own, and the kernel's contribution is capped
at durable, queryable silence evidence plus a state-preserving estop.

## 4. The not-a-workload canon (positive boundary findings)

Six independent verdicts drew the same line and should be preserved as canon
when the floor rule is written: pure lookups (S1), per-API-call telemetry and
fleet model-routing (S7 — model choice belongs to the performer of the
dispatch), level-triggered provider reconcilers (S11's prod restart),
file-grain locks (S12), sub-session agent-to-agent consults (S14), and runtime
self-supervision heartbeats (S17).

## Settled direction (2026-07-07, ratified)

All four boundaries ratified as proposed:

1. **The weight floor is a rule, not a lighter kernel form.** The rule: *a
   work item earns a kernel workflow when its waiting must survive the
   performer, or when the ask needs an independent audit record.* Below that,
   stay runtime/provider-native. A sub-instance-weight kernel form is
   **deliberately deferred, not forgotten**: across all 17 simulated
   workflows, every below-floor case had a clean provider-native answer —
   building a mini-form now would be speculative. Revisit only when a real
   workload demands it.
2. **Cross-instance exclusion/lease stays outside, by design.** The kernel's
   routing is deliberately name-blind (no file paths, no machines; what a
   performance touches is discovered mid-performance), lease/TTL semantics are
   deliberately excluded from kernel vocabulary, and the coarse-grain
   exclusion the kernel *does* owe is already delivered by the creation-key
   decision (`_open-creation-identity.md`: one task = one live instance).
   Finer-grain resource contention belongs to the runtime. Honest cost,
   stated: the kernel cannot distinguish "queued 4th for the deploy slot"
   from "stuck" — that visibility stays runtime-side.
3. **The outermost liveness pager is external by design.** An on-host monitor
   dies with the host; the kernel's contribution is that durable committed
   state makes silence *queryable* (last-commit timestamps, marker ages) plus
   a nothing-lost emergency stop. Already folded into L9 R8 as a contract
   requirement; recorded here as a boundary statement.
4. **The canon list above is preserved** as the standing examples, so template
   authors do not relitigate the line case by case.

**Who holds the rule (the enforcement answer).** The floor rule is
semantic — the kernel cannot enforce it in principle (work the rule says "no"
to never reaches the kernel). It is held at three levels: (a) as written
canon, the review standard for whoever authors workflow definitions; (b)
later, as a checklist gate in the definition-review channel (L12) — a new
template's proposal answers "why is this a workflow / why per-event rather
than per-sweep"; (c) as an observability symptom — templates producing
high-volume, never-parking, single-step, sub-second instances are flagged by
fleet reporting (detection, not prevention). The inverse violation
(should-have-been-a-workflow run provider-native) is invisible to the kernel
by definition and surfaces only as an audit incident — which is exactly why
the rule is written down in advance.

**The kernel/product framing (the understanding key the discussion needed).**
"v3" names two things: the *kernel* (the coordination core this corpus
models) and the *product* (a pairflow installation: kernel + runtime +
connectors + CLI/UI). The floor is a line **inside the product**, not between
the product and something external. The same runtime machinery serves both
sides: one Slack connector answers a question directly (agent session, no
kernel) and routes a contract-review request through the kernel; one agent
runner executes both the kernel-dispatched draft step and the kernel-free
chat reply; one scheduler daemon fires both kernel-facing timers and plain
ops crons. The rule tells the connector/template author **which wire to
connect**, not which machinery to use. (Ticketing analogy: not every piece of
work gets a ticket; the corridor question is answered by the same people in
the same office — the rule decides what gets a ticket.)

**Where below-floor work runs** (the three homes, recorded for future
readers): (1) *in the connector*, as request-response — question in, answer
out, no durable state, safe precisely because nothing irreversible happens;
(2) *in the runtime as plain scheduled scripts* — heartbeats, reconcilers:
ordinary ops crons, no LLM, no kernel; (3) *inside a workflow step*, as the
performer's internals — the kernel sees one errand ("run the enrichment
sweep"), the runner loops over 200 rows itself; most below-floor work runs
*under* a kernel step, not beside the kernel. What this work gives up is
exactly what the rule prices: no transcript, no surviving waits, no kernel
audit. And the clean relationship: the below-floor machinery is not
*governed* by the kernel but can be *observed* by it — a health-dashboard
workflow checking that the crons ran is the canonical pattern.
