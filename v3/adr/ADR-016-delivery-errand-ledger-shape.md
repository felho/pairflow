# ADR-016: the delivery-errand ledger — runner-owned, scheduling-only claims, kernel-evidence confirmation

Status: accepted
Date: 2026-07-23
Links: supersedes — · amends — · depends-on ADR-003, ADR-004 · related ADR-010, ADR-014

## Context

Chapter 9 builds the first REAL delivery plane: a loop that takes
committed dispatches to a real actor process and feeds the emitted op
back through ingress. The kernel deliberately does not own delivery
(commit ≠ deliver), so the delivery plane needs durable bookkeeping of
its own — and the SHAPE of that bookkeeping binds every future adapter
(local, cloud, or headless): where the state lives, what a claim
means, and what counts as "delivered". The IC-A2 contract family
(crash-window kills, no-ack as a distinct state, restart-surviving
retry budget) and the CT-B two-worker re-run are the acceptance
surface. This is a K1 lift (README §6 decision-home triage): the
decision outlives the ch9 contract-draft's realized-freeze.

## Decision

1. **Runner-owned, physically separate durable store.** The
   delivery-errand ledger is a host-local SQLite file OWNED by the
   runner composition — separate from the kernel store (the ADR-010
   one-file-per-concern pattern), same WAL discipline, same
   mount/agent-unreachability rules. The kernel schema and its
   ADR-003 fence stay untouched by runner-plane evolution; kernel
   state is written ONLY through normal ingress ops.
2. **Claims are scheduling-only, never semantics** (the ADR-003
   stance extended to the runner plane): a claim carries
   `(worker_id, claimed_at)`; stale claims (past a configured lease
   window) are reclaimable by any worker; correctness NEVER depends
   on claim exclusivity.
3. **Correctness = the kernel's content-addressed idempotency.**
   Duplicate delivery collapses at the kernel: the adapter derives
   the actor-emit `op_id` via emit-lib (ADR-004) — its
   `contextPacketId` input is the ratified packet identity
   `"<instance_id>@v<expected_version>"` (ch9-C13; every future
   adapter derives the same string for the same dispatch) — so a
   re-delivered packet re-derives the SAME op id and lands
   `Duplicate`. Duplicate spawn work is the deliberate, kernel-safe
   cost.
4. **Confirmation is committed kernel evidence, never runner
   self-report:** an errand is `confirmed` only when the actor's
   emitted op exists as a COMMITTED transcript row (`Duplicate` on
   submission = evidence already exists); the confirmation check is
   LIVENESS-INDEPENDENT (a committed-row read any worker can re-run
   — never the submitting attempt's memory). A clean exit with no
   committed evidence is a DISTINCT non-terminal `unconfirmed`
   state — never success; entering it freezes the remaining budget
   (operator re-spawn is out-of-band).
5. **The retry budget is durable errand state**, decremented on
   attempt START (bounded beats optimistic across crash windows);
   exhaustion is a runner-plane terminal state, floor-visible,
   kernel state untouched. A run reaching TERMINAL before
   confirmation MOOTS the errand (a distinct terminal disposition —
   a run-level sink from every non-terminal errand state). The
   disposition precedence is `confirmed > mooted > (unconfirmed |
   exhausted)`: every terminal-disposition write runs the
   committed-row check first, and reads of any non-confirmed
   RESTING disposition (`unconfirmed` / `exhausted` / `mooted`)
   re-check (the transient states run the same check at their own
   decision points) — a delivered dispatch is never reported
   exhausted or mooted. Attempt starts mint a durable `attempt_id`;
   handoff files and session names are attempt-scoped, so a stale
   or parallel attempt's artifacts are never attributed to another
   attempt.

## Alternatives Considered

- **Errand tables inside the kernel store DB** — rejected: couples
  runner-plane schema churn to the kernel's fenced-wipe stance and
  puts non-authoritative rows one mistake away from authoritative
  surfaces; ADR-010 already established the physical-separation
  pattern for exactly this class.
- **Claim-as-lock (exclusive lease as a correctness primitive)** —
  rejected: reintroduces leader-style coordination the kernel spectrum
  decision avoided; the corpus lesson ("claim is intent, not a lock"
  as a correctness hole) applies — here duplicates are SAFE by op_id,
  so exclusivity buys only efficiency.
- **Adapter self-report as delivery confirmation** — rejected: the
  verification-gate principle (durable state > self-report); the
  silent-loss class (deliver() returning undefined logged as
  delivered) is a documented external incident pattern.

## IC-N Screen (mandatory)

No. No deterministic replay, no leader-per-shard coordination (claims
are explicitly non-semantic), no event-sourcing as a source of truth
(the errand ledger is materialized rows), no reconciler/outbox for
kernel state (the kernel is written only through ingress). This screen
does not bypass the model↔code divergence stop.

## Consequences

- Positive: every future adapter inherits a proven durability shape;
  two workers are safe by construction (CT-B); the kernel store stays
  pure; crash recovery is a table read, not a heuristic.
- Negative: duplicate spawns can do duplicate host-side work (worktree
  writes, LLM cost) inside crash/lease windows — accepted as the
  deliberate cost, mirrored on the ch12-C18 duplicate-provisioning
  precedent; a second DB file to operate/inspect.
- Neutral: polling discovery (no event bus) at MVP; the interval is
  composition config.

## Verification

`CT-A2-CRASH` (kill between claim commit and effect; between effect
and completion marker), `CT-A2-CONFIRM` (no-error/no-ack is a distinct
non-terminal state), `CT-A2-RETRY-DURABLE` (budget survives restart),
and the `CT-B-TWOWORKER` re-run under the real runner — all named in
the plan §1 intake tables, realized as ch9 packet tests.

## Related

ch9 contract rows C12–C16, C20; plan §9.1 item 4; IC-A2/IC-B (the
implementation contract); the ch12-C18 crash-retry precedent.
