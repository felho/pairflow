# Task Packet: ch5-P4 — the digest slice: ADR-008, schema v2, op_id_collision

Plan step: plan.md §5.4; realizes `CT-A1-COLLISION` + `CHK-A1-DIGEST`
(actor-emit scope — the EC memo's scope decision; operator/lifecycle
digests stay a named Absent).
Autonomy stage: calibration — **pre-approved before build** (§5.8
first-of-a-kind: first live schema bump, new result arm, new digest
contract — ratification finding).

## Ledger slice (declared — feeds the coverage accounting)

```json
{
  "ledger_slice": {
    "units": [
      { "id": "emit-contract-pseudocode/payload_digest", "disposition": "implement" }
    ],
    "rejections": ["op_id_collision"],
    "invariants": [],
    "traces": [],
    "shared_ownership": []
  }
}
```

(The unit's SCHEMA-LESS branch is what this packet implements —
`contract is none → digest_of(type ⊕ canonical(payload))`; the
contract-inclusive branch needs the EC catalog machinery and stays with
the emit-contract chapter. `digest-pinned-to-the-contract` (invariant)
is deliberately NOT claimed: its full-contract pinning is the later
half. The three-way lock forces the `unitMap.json` row in this commit.)

## Claim + dimensions (chapter rule 1 — enumerated BEFORE deriving)

**Claim:** a committed `(instance_id, op_id)` pins the op's CONTENT
identity — the same op_id can only ever be a retransmission (same
digest → `Duplicate`) or a visible collision (different digest →
`Rejected(op_id_collision)`); rejected attempts consume nothing.

1. **Content identity** — same op_id + same payload → duplicate; same
   op_id + different payload → collision; same op_id + different TYPE
   (same payload) → collision (the digest is type-inclusive).
2. **Absence identity** — absent payload ≠ `null` payload (distinct
   digests); absent-vs-absent retransmission → duplicate.
3. **Rung order** — the idempotency rung answers FIRST: a collision or
   duplicate wins over a stale expectedVersion (never misreported as
   `Stale`), and both precede the CAS inside the transaction (never
   misreported as `cas_conflict` after a version advance).
4. **No consumption** — a collision/duplicate/rejected attempt writes
   NO row, advances NO version, consumes NO key: the colliding op_id
   retried with the ORIGINAL payload still answers `Duplicate`, and the
   rejected payload under a FRESH op_id commits.
5. **Recorded fact** — every committed row carries `payload_digest` ==
   the emit-lib derivation of its envelope (`CHK-A1-DIGEST`); the
   fast path and the in-txn check read the SAME stored value.
6. **Migration boundary** — a v1-marker PROTOTYPE store wipes fenced on
   open (the first LIVE run of the ADR-003 path); a non-prototype or
   unreadable marker still refuses (the existing fail-closed tests must
   survive the bump untouched).

## Operative material

### The model unit (verbatim, the realized branch)

```text
payload_digest(envelope, contract) → digest
  IF contract is none THEN RETURN digest_of(envelope.type ⊕ canonical(envelope.payload))
```

### Canonical contract matrix — the TWO digest surfaces (ratification finding)

| Surface | Input | Material | Consumer | Home |
|---|---|---|---|---|
| `digestPayload` (EXISTS, unchanged) | payload only | `canonicalize(payload)` | op_id derivation component (ADR-004: type rides the op_id material separately) | `emit/opId.ts` |
| `deriveEmitDigest` (NEW) | envelope `{type, payload?}` | sha256 over `JSON.stringify([TAG, type, canonicalize(payload)])`; **absent payload → `[TAG, type]`; `null` → `[TAG, type, "null"]`** (canonicalize's output string is the third element — absence is arity, not a sentinel) | the transcript/collision digest — the kernel rung compares it, the commit records it | `emit/opId.ts` (the ONE audited implementation grows, not forks) |

`TAG` is a new domain-separation constant (the ADR-004 tag culture);
the two surfaces can never produce comparable strings. The
`DerivedActorEmitId.payloadDigest` doc comment ("the CHK-A1-DIGEST
input") was WRONG and is corrected to point at `deriveEmitDigest`.

**Null-encoding decision (pre-approval finding 2, closed):** the third
material element is ALWAYS `canonicalize(payload)`'s output STRING —
`null` payload → `[TAG, type, "null"]`, never a bare JSON `null` value
(a special case would break the uniform rule; no other payload can
canonicalize to `"null"` — the string `"null"` canonicalizes to
`"\"null\""`). Plan §5.4 wrote the bare-value form and is ALIGNED in
this commit ("aligned at P4 pre-approval") — the packet's uniform rule
is the decision.

**Read surface (pre-approval finding 1, closed):** `TranscriptEntry`
gains `payloadDigest: string` — the digest rides the COMMITTED fact
(the model: "this is what recorded_digest_of reads"), so the
floor-read row carries it; `CHK-A1-DIGEST` asserts over `finalDetail`
through the ports, never via store-internal SQL. The domain type
change ripples into the testkit fixtures that build `TranscriptEntry`
literals (storeCheckers / traceHarness tests) — mechanical, no
assertion weakening.

**ADR-008 (amends ADR-004)** records the transcript-digest form and the
comment correction. Born `proposed` in this packet, `accepted` at this
pre-approval.

### `DigestSource` port + kernel rung (model order: compute once → compare → record)

- `ports/digest.ts`: `type DigestSource = (envelope: EventEnvelope) =>
  string` — sync (derivation is pure); production binding is
  `deriveEmitDigest`; `KernelDeps` gains `digest: DigestSource`. The
  kernel import boundary is untouched (domain + ports only).
- HANDLE computes the digest ONCE after load (ingress already
  guarantees canonicalizability — admission == digestible, the ch-4
  aftermath contract), uses it in the fast path and hands it to the
  commit.
- **Fast path:** `StorePort.hasOp` is REPLACED by
  `findOp(instanceId, opId): Promise<{ payloadDigest: string } | null>`
  — the rung needs the stored digest, a boolean cannot answer the
  collision question. Kernel: found + equal → `duplicate`; found +
  different → `Rejected(op_id_collision)`; the check stays BEFORE
  missing_version/stale (the L0b order, now digest-aware).
- **Correctness mechanism (in-txn):** `CommitTransitionInput` gains
  `payloadDigest: string`; inside the transaction an existing
  `(instance_id, op_id)` row compares digests — equal →
  `duplicate_op`, different → the NEW result arm `op_id_collision`;
  both precede the CAS check (§4.2's precedence, extended). The kernel
  maps the store arm to `Rejected(op_id_collision)` on restart-free
  return (same handling shape as `duplicate_op` — a terminal answer,
  not a restart).
- `START_INSTANCE` carries no envelope and no digest — unchanged.

### Store schema v2 + the first live fenced wipe

- `transcript` gains `payload_digest TEXT NOT NULL`; `SCHEMA_VERSION`
  `"1"` → `"2"`.
- Opening a store with a KNOWN PROTOTYPE marker at version "1" →
  wipe-and-recreate (ADR-003's fenced path, exercised live for the
  first time — a file-backed test proves data is gone and the marker
  reads "2"); non-prototype / missing / unreadable marker → the
  existing refuse paths, their tests untouched (dimension 6).

## In-context notes (the scarce budget)

- **Rejected-attempts-record-nothing is LOAD-BEARING here** (IC-A1):
  the collision answer must come from the COMMITTED row only — the
  rejected attempt must not update, annotate, or shadow it. The store
  writes nothing on `op_id_collision`, exactly as on `cas_conflict`.
- The kernel's collision answer needs NO CAS-restart: a collision is
  content-level and version-independent — restarting cannot change it
  (unlike `cas_conflict`, where reload can flip the answer to
  duplicate/stale). A collision discovered in-txn returns directly.
- The ch-4 tests calling `hasOp` / wiring `createKernel` are updated
  mechanically (findOp / `digest` dep) — their ASSERTIONS must not
  weaken; the scripted StorePort double in the kernel tests grows the
  digest fields the same way.
- `deriveEmitDigest` throws on a non-canonicalizable payload — the
  kernel never sees one (ingress admission), and the throw is the
  fail-closed guard against a future ingress regression, not a code
  path to soften.

## Embedding gates (v1-inherited)

- Target files: `v3/adr/ADR-008-transcript-digest-form.md` +
  `v3/adr/README.md` (index); `v3/src/emit/opId.ts` + `opId.test.ts`
  (deriveEmitDigest + comment fix) + `v3/src/emit/index.ts` (public
  emit surface — the production binding imports the LIB, not an
  internal file; finding 3); `v3/src/domain/instance.ts`
  (`TranscriptEntry.payloadDigest` — finding 1); `v3/src/ports/digest.ts`
  (new) + `ports/store.ts` (findOp, payloadDigest, collision arm) +
  `ports/index.ts`; `v3/src/store/sqliteStore.ts` + `sqliteStore.test.ts`
  (schema v2, digest column, precedence, wipe test);
  `v3/src/kernel/kernel.ts` + `kernel.test.ts` (DigestSource dep, rung);
  test wiring updates in `v3/src/l0aTrace.test.ts`, `l0bTrace.test.ts`,
  `ingress/ingress.test.ts` (kernel stubs), `start.test.ts` (if deps
  shape touches it), `v3/src/testkit/storeCheckers.test.ts` +
  `testkit/traceHarness.test.ts` (TranscriptEntry literals — finding 1);
  `v3/src/drift/unitMap.json` (payload_digest row — the lock forces
  it); `docs/v3/implementation/plan.md` §5.4 (null-encoding alignment,
  finding 2); this packet file.
- Mutation boundary: exactly those. `ingress/` production code,
  `floor/`, the rest of `domain/` (the 85-name union already carries
  `op_id_collision`), the coverage script, and the lint config
  unchanged.

## Acceptance

- **`CT-A1-COLLISION`**: committed a1(payload X) → resubmit a1(payload
  Y) → `Rejected(op_id_collision)`, no row, version unchanged; a1(X)
  again → `Duplicate`; Y under a fresh op_id → commits (dimension 4).
  Type-inclusive: a1 with same payload but different TYPE → collision
  (dimension 1). Absent ≠ null (dimension 2).
- **Precedence**: collision with a STALE expectedVersion →
  `op_id_collision`, never `Stale` (fast path) — and at the store
  level, `commitTransition` with an existing op + different digest +
  advanced version → `op_id_collision`, never `cas_conflict`
  (dimension 3, both layers).
- **`CHK-A1-DIGEST`** claim-derived: every committed row's
  `payloadDigest` (now ON `TranscriptEntry` — finding 1) equals
  `deriveEmitDigest(envelope)`, asserted over `finalDetail.transcript`
  through the ports; rejected/duplicate/collision attempts leave row
  count and version untouched (dimensions 4–5).
- **Migration**: the file-backed v1→v2 fenced-wipe test (dimension 6);
  the existing fail-closed tests pass UNMODIFIED.
- Emit-lib: deriveEmitDigest determinism, type-sensitivity,
  absent/null distinction, non-canonicalizable throw; digestPayload
  outputs UNCHANGED for identical inputs (the op_id surface is
  untouched — ADR-004 stands).
- All bridges green; ADR-008 `accepted`, integrity + unitMap lock
  green; 138+ tests.
- Standing review rules: **REV-A1-TXN** (the digest comparison lives
  under the SAME transaction boundary as the op-record insert + CAS);
  **REV-B-LOCAL-NOT-AUTHORITY** (findOp is fast path; the in-txn check
  is the mechanism); **REV-E-NO-ADAPTER-BRANCH** (DigestSource is a
  port, the kernel never names the emit-lib).
