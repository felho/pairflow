# ADR-004: op_id scheme per operation family

Status: accepted
Date: 2026-07-07
Links: supersedes — · amends — · depends-on ADR-000 · related ADR-001

This ADR realizes the intake row `ADR-A3-IDSCHEME` (IC-A3's enforcement
line: "ADR selecting content-addressed vs nonce per operation family").

## Context

`op_id` stability is an edge/actor/relay contract (IC-A3): the kernel
enforces the identity it receives and cannot infer that two fresh IDs meant
one logical operation. The derivation must live in ONE audited
implementation — the emit-lib (`v3/src/emit/`), shared by the scripted
actor (ch 3) and the operator CLI (ch 6) — and the scheme must be chosen
per operation family, because the two natural schemes fail in opposite
directions: pure content-addressing collapses two legitimate identical
operations; pure nonces make retransmission indistinguishable from
re-attempt.

## Decision

- **Actor-emit family: content-addressed.** `op_id` is derived from
  (instance id, context-packet identity, op type, payload digest). Two
  consequences fall out by construction: resend-without-ack reproduces the
  same `op_id` (retransmission → `Duplicate`), and a refresh after `Stale`
  — which starts from a NEW context packet — yields a new `op_id` (a new
  logical operation, because the input changed). The digest uses a
  canonical payload serialization so semantically identical payloads hash
  identically.
- **Operator/CLI verb family: request-scoped nonce.** One nonce per
  logical invocation, generated once and reused across retries within that
  invocation. Two identical payloads may be two legitimate operations
  ("cancel, then cancel again after a restart"); content-addressing would
  collapse them.
- **The nonce source is injected.** Production binds a crypto source;
  tests bind a deterministic source. The test-kit no-randomness lint
  (plan §3.3) therefore needs no emit-lib exemption.

## Alternatives Considered

- **Content-addressing everywhere** — collapses legitimate duplicate
  operator verbs; rejected by IC-A3's own scheme guidance.
- **Nonces everywhere** — pushes retransmission-vs-re-attempt bookkeeping
  onto every caller; a resend after a lost ack would mint a new identity
  and defeat `Duplicate` detection unless every edge persists its nonce
  perfectly. Content addressing gives the actor-emit path this property
  for free.
- **Per-call-site choice** — exactly what IC-A3 bans ("one audited
  implementation, not per-call-site choices").

## IC-N Screen (mandatory)

No — this decision touches none of the banned kernel shapes (no
deterministic replay, no leader-per-shard, no event-sourcing source of
truth, no kernel-state reconciler/outbox). It also does not bypass the
model↔code divergence stop: the kernel-side semantics (`Duplicate`,
`Stale`, key non-consumption on rejection) are model content and stay on
the model plane; this ADR fixes only the edge-side derivation the model
explicitly delegates (IC-A3).

## Consequences

- Positive: retransmission and refresh semantics hold by construction on
  the actor-emit path; one audited derivation, no call-site drift.
- Negative: content-addressing requires a canonical serialization — the
  emit-lib owns it, and payload-digest sensitivity is part of its local
  test suite.
- Neutral: a future operation family (e.g. relay-level, L8) picks its
  scheme by amending this ADR, not ad hoc.

## Verification

Ch-3 emit-lib local tests: derivation determinism, packet-identity
sensitivity, payload-digest sensitivity, family separation. Ch-5 kernel
contract tests: `CT-A3-RETRANS` (same `op_id` → `Duplicate`) and
`CT-A3-EMITLIB-REFRESH` (post-`Stale` re-emit → new `op_id`).

## Related

IC-A3 (`implementation-contract.md`); plan §3.5; ADR-001 (the `emit/`
module).
