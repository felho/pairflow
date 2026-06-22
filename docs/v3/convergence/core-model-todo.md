# Core Model TODO

Follow-up clarifications for `core-model.html` based on the kernel-spectrum synthesis.

## Part A — Source-closed idempotency kernel

These three TODOs are one logical part, not independent cleanups. They form the
positive version of the synthesis warning: close idempotency at the source.

```text
stable op_id  ->  transactional ledger  ->  derived/effect boundary
 identity          enforcement              safe post-commit behavior
```

The dependency matters. A ledger is only useful if retries reuse a stable operation
identity. Derived dispatch is only safe because the return path is idempotent. External
effects need their own pending-effect marker and egress idempotency key, because kernel
dedupe does not automatically make the outside world idempotent.

### A1. Make the idempotency ledger explicit

The current model uses `instance.transcript.has(envelope.op_id)` to express duplicate
detection. Keep the semantics, but clarify the implementation contract:

- `(instance_id, op_id)` is a kernel-level unique operation record.
- For L0a, default to **transcript-as-ledger** for accepted/committed operations:
  presence in the append-only transcript means the operation has already applied.
- The source of truth must be a store-backed uniqueness guarantee such as
  `UNIQUE(instance_id, op_id)`, enforced in the same atomic commit as the instance CAS.
- `instance.transcript.has(op_id)` may remain as a pseudocode fast path, but it is not
  the correctness mechanism. If only the pre-check exists, concurrent delivery can race.
- The correct write boundary is: insert/append the operation record and update the
  materialized instance state under one transaction/CAS boundary.
- A separate `IdempotencyLedger` is an escape hatch for later cases where an operation
  needs dedupe but has no committed transcript entry, such as a remote relay boundary.
- Do not let rejected/non-committed events accidentally consume the apply-idempotency
  key. If rejected attempts need audit, model that as audit, not as the committed
  operation ledger.

### A2. Clarify derived output vs durable pending-effect boundaries

The model already uses `DispatchIntent`, `ActionIntent`, `SpawnIntent`, and durable
markers such as `action_running` / `spawning`. Clarify when these are merely derived
post-commit outputs versus durable, retryable side-effect work.

- Use this test: **after a crash, can the output be safely re-derived from committed
  kernel state alone?**
- If yes, it can remain a derived output. Actor `DispatchIntent` can stay derived until
  durable delivery arrives at L8.
- Derived dispatch is safe only because actor/event apply is idempotent via A1:
  at-least-once dispatch + idempotent apply = effectively-once state transition.
- External or crash-sensitive side effects need a committed marker/outbox/pending-effect
  record before the side effect runs.
- `action_running`, runtime provisioning requests, and child `spawning` links should be
  described as concrete instances of this pattern.
- The pending-effect marker/request id should be passed to the external system as an
  idempotency key where the external system supports it. Marker-before-effect alone
  still gives at-least-once effect execution after a crash between effect and result.
- For non-idempotent external effects, the egress contract must carry the operation
  identity across the boundary; otherwise recovery can duplicate the outside effect.
- Reconciler/outbox is for real external effects, not for repairing the kernel's own
  state consistency.

### A3. Define the `op_id` generation contract

The model should state what makes an `op_id` stable enough for retries:

- `op_id` stability is an edge/actor/relay contract. The kernel can enforce the
  identity it receives, but it cannot infer that two fresh IDs were intended to be the
  same logical operation.
- The same logical operation retry must reuse the same `op_id`.
- A new `op_id` means a new attempted operation, not "retry the same one."
- Distinguish retransmission from re-attempt. If the actor resends the same envelope
  because it did not receive an acknowledgement, it must reuse the same `op_id`. If the
  kernel returns `Stale` and the actor refreshes to a newer context packet, the next
  emit is a new logical operation with a new `op_id`, because the packet/input changed.
- Use content-addressed IDs when the operation is naturally identified by its content,
  such as "submit this exact decision payload."
- Use request-scoped nonces when two identical-looking payloads may be two legitimate
  operations, such as "increment twice." Pure content-addressing would incorrectly
  collapse those operations into one.
- Later relay/channel levels must preserve this identity across process, host, or
  network retries.

## Non-goals

- Do not move toward full event-sourcing as the source of truth.
- Do not introduce Temporal-style deterministic replay for actor/LLM work.
- Do not introduce leader-per-shard coordination for the L0a kernel.
- Do not use a reconciler/outbox to repair the kernel's own internal state consistency.
- Keep the current materialized `WorkflowInstance` + transcript/audit + per-instance
  version/CAS shape.
