# The Kernel's Floor and Edges — Weight Floor, Exclusion, and the Not-a-Workload Line

Status: open design decision (mostly ratify-a-boundary, not build-a-mechanism)
Date: 2026-07-06
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
