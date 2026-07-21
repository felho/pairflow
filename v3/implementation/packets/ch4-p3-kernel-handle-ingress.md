# Task Packet: ch4-P3 — kernel HANDLE + dispatch_intent + ingress

Plan step: plan.md §4.1 (the L0b semantic level) + §4.6 (ingress);
realizes `CT-A1-DUP`
Autonomy stage: calibration

## Ledger slice (declared — feeds the coverage accounting)

```json
{
  "ledger_slice": {
    "units": [
      { "id": "l0a-pseudocode/HANDLE", "disposition": "alias/inherited" },
      { "id": "l0b-pseudocode/HANDLE", "disposition": "implement" },
      { "id": "l0b-pseudocode/dispatch_intent", "disposition": "implement" }
    ],
    "rejections": [
      "invalid_shape",
      "unknown_instance",
      "no_transition",
      "missing_version"
    ],
    "invariants": [
      { "id": "l0a/op-id-idempotency", "disposition": "test" },
      { "id": "l0b/expected-version-mandatory", "disposition": "test" }
    ],
    "traces": [],
    "shared_ownership": []
  }
}
```

(`l0a-pseudocode/HANDLE` is `alias/inherited`: the L0b HANDLE subsumes it
— same skeleton plus the mandatory version check and post-commit intent
derivation. The golden trace is ch4-P4's slice.)

## Operative material (full text — projection, not invention)

### `l0b-pseudocode/HANDLE` (verbatim — the check ORDER is contract)

```text
HANDLE envelope → Outcome
  IF not valid_shape(envelope)            THEN RETURN Rejected(invalid_shape)

  instance ← instanceStore.load(envelope.instance_id)
  IF instance is none                     THEN RETURN Rejected(unknown_instance)
  template ← definitionStore.load(instance.template_ref)   # separate store; pinned immutable version

  # idempotency, key scope (instance_id, op_id)
  IF instance.transcript.has(envelope.op_id) THEN RETURN Duplicate   # no-op, no 2nd entry

  # actor-supplied stale-intent — mandatory at L0b
  IF envelope.expected_version is missing  THEN RETURN Rejected(missing_version)
  IF envelope.expected_version ≠ instance.version THEN RETURN Stale(instance.version)

  step   ← template.step(instance.current_step)
  target ← step.transitions[envelope.type]   # transitions: event_type → target
  IF target is none                       THEN RETURN Rejected(no_transition)

  # one atomic commit, CAS on instance.version
  COMMIT atomically at expected_version = instance.version:
    instance.transcript.append(envelope)
    instance.current_step ← target
    IF target is terminal THEN instance.status ← DONE
    instance.version ← instance.version + 1
  # on CAS conflict: restart HANDLE from load —
  #   re-check idempotency and re-resolve the transition;
  #   never re-commit a target computed from stale state

  intent ← (instance.status = DONE) ? none : dispatch_intent(instance, template, instance.current_step)  # derive after commit
  RETURN Committed(instance.version, intent)
```

### `l0b-pseudocode/dispatch_intent` (verbatim)

```text
dispatch_intent(instance, template, step_id) → DispatchIntent
  step  ← template.step(step_id)
  actor ← instance.binding[step.role]                  # guaranteed present by the start invariant
  packet ← ContextPacket {
    instance_id, expected_version: instance.version, task: instance.task,
    instruction:   step.instruction,
    handoff:       payload_of_transition_into(instance, step_id),  # the envelope that brought us here; absent at start
    available_ops: event_types_of(step.transitions),              # PASS / CONVERGED — not on_pass; navigation, not L1
    agent_config:  step.agent_config }                            # raw/optional pass-through until L0c (may be absent)
  RETURN DispatchIntent { actor, packet }            # a local/manual driver delivers; durable channel is L8
```

### Exact rejection strings (ledger §3; never invented, never paraphrased)

`invalid_shape` · `unknown_instance` · `no_transition` · `missing_version`

### Inherited contracts (ch4-P1 matrix / plan §4)

- Round rule: kernel increments `round` on a commit whose target is
  `template.start` (loop-back re-entry); otherwise unchanged.
- Commit mapping: `committed` → `Outcome.committed` (version =
  expectedVersion + 1, intent derived from POST-commit state, `null` at
  terminal); `duplicate_op` → `Outcome.duplicate`; `cas_conflict` →
  restart from load.
- `DefinitionStore.load` returning `null` at HANDLE = integrity error
  (pinned ref) → throw, not a rejection.

## In-context notes (the scarce budget)

- **The check order above IS the contract** — duplicate before
  missing_version/stale (the L0b trace step 4 note: "idempotency checked
  first"), stale before no_transition. Tests assert order-sensitive
  cases, do not reorder for convenience.
- **Ingress owns `valid_shape`** (plan §4.6): `submit(raw: unknown)`
  validates hand-rolled — the raw envelope is a PLAIN object, non-empty
  string ids/type/actor, `expectedVersion` optional but if present a
  non-negative integer, `eventId` optional string; UNKNOWN top-level
  keys — string OR symbol — → `invalid_shape` (strict/fail-closed; the
  envelope surface formalizes at the emit-contract level later). The
  kernel receives only typed envelopes. *(Amended, ch-4 aftermath:)*
  `payload` is NOT free — it must be canonicalizable (the emit-lib
  predicate `isCanonicalizable`): what ingress admits is exactly what
  the store's JSON round-trip preserves ("the transcript stores what
  ingress admitted", ch4-P2) and what the ch-5 digest path can pin;
  undefined props, symbol keys, sparse arrays, non-plain objects,
  non-finite numbers, functions, BigInt → `invalid_shape`.
  *(Aftermath 2 — descriptor level:)* own string props must be
  ENUMERABLE DATA properties (a hidden data prop vanishes in the
  round-trip; a hidden `toJSON` REWRITES the persisted value; a getter
  can answer the digest read and the stringify read differently); array
  indices must be data properties. The ingress unknown-key check runs
  on `getOwnPropertyNames` — a non-enumerable unknown key is still an
  unknown key. *(Aftermath 3 — prototype level:)* arrays must carry the
  STANDARD `Array.prototype` (`Array.isArray` is true across
  prototypes, and a custom array prototype smuggles the same `toJSON`
  rewrite one lane over; null-proto arrays reject too) and every index
  0..length−1 must be an OWN data property — `i in value` would let an
  inherited index fill a hole. *(Aftermath 4 — numeric identity, sweep
  CLOSED:)* `-0` rejects everywhere (payload and `expectedVersion`) —
  `JSON.stringify(-0)` flattens to `"0"`, so `{x:-0}` would digest and
  persist as `{x:0}`, while `JSON.parse("-0")` CAN deliver `-0` into
  the process. The remaining round-trip dimensions were swept and
  test-pinned as safe: every other finite double round-trips exactly;
  lone surrogates are escaped to ASCII by well-formed stringify
  (SQLite-safe too); circular/over-deep payloads reject loudly by
  throw; an own `__proto__` key round-trips as data. Out of scope
  (undetectable / compromised runtime): a lying Proxy and polluted
  GLOBAL prototypes — the real trust boundary is the ch-9 transport
  serialization.
- **A DONE instance / terminal current step** has no Step entry →
  `transitions` lookup fails → `Rejected(no_transition)`. This is the
  model mapping (`template.step` of a terminal position has no
  transitions), not a new rule.
- **The CAS-restart loop is unbounded** (model-faithful): version moves
  forward, so it converges; the scripted-double test proves one
  conflict→reload cycle. Never re-commit a target computed from stale
  state — recompute EVERYTHING after reload.
- **`handoff` = the payload of the envelope that brought us here**;
  START has no handoff (P4). With `exactOptionalPropertyTypes`, omit
  absent optional fields (conditional spread), never pass `undefined`.
- **`TimeSource` is plumbed through the kernel factory but unused** —
  PI-6's injected-clock seam; first real consumer is the ch-5 gate
  timeout. CHK-D-NOCLOCK holds regardless.
- The kernel's transcript pre-check (`hasOp`) is the FAST PATH; the
  store's in-txn precedence is the correctness mechanism (REV-A1-TXN).

## Embedding gates (v1-inherited)

- Target files: `v3/src/kernel/kernel.ts` (createKernel + handle),
  `v3/src/kernel/dispatchIntent.ts`, `v3/src/kernel/index.ts`,
  `v3/src/kernel/kernel.test.ts`; `v3/src/ingress/ingress.ts`,
  `v3/src/ingress/index.ts`, `v3/src/ingress/ingress.test.ts`.
- Entrypoints: `createKernel({ store, definitions, time })`;
  `createIngress(kernel).submit(raw)`.
- Mutation boundary: `v3/src/kernel/` + `v3/src/ingress/` ONLY.
  `domain/`, `ports/`, `store/`, `testkit/` unchanged. Kernel imports
  `domain/` + `ports/` ONLY (lint-enforced, ADR-001). Test-local
  template/definition fixtures live in the test files — the testkit
  MD-1 builder is ch4-P4's deliverable.

## Acceptance

- Contract tests:
  - **`CT-A1-DUP`**: two racing deliveries of the same
    `(instance_id, op_id)` through ingress on the real in-memory SQLite
    store → exactly one `committed`, one `duplicate`, ONE transcript
    row; plus the CAS-restart race on a scripted `StorePort` double
    (conflict → reload shows the op landed → `duplicate`; and the
    stale-after-reload variant → `stale`, never a re-commit of the old
    target);
  - `op-id-idempotency` (l0a): sequential redelivery → `duplicate`,
    no second transcript entry;
  - `expected-version-mandatory` (l0b): missing → 
    `rejected(missing_version)`; mismatched → `stale(currentVersion)`;
    duplicate WINS over missing/stale version on a committed op;
  - rejection branches: `invalid_shape` family (ingress),
    `unknown_instance`, `no_transition` (incl. the DONE-instance case);
  - committed path: intent derived from post-commit state (actor via
    binding, expectedVersion = new version, availableOps from the target
    step, handoff = triggering payload); terminal commit → `intent: null`
    + status DONE; round increments exactly on the loop-back commit.
- Checks: kernel import-boundary + CHK-D-NOCLOCK hold (existing lint);
  all v3 bridges green.
- Drift tests green (standing — PI-3 pre-test unaffected).
- Standing review rules in force: **REV-A1-TXN** (pre-check = fast path),
  **REV-E-NO-ADAPTER-BRANCH** (the kernel sees only port interfaces),
  **REV-B-LOCAL-NOT-AUTHORITY** (no local cache treated as authority —
  every restart goes back to the store).
