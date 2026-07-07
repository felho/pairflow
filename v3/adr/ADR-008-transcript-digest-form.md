# ADR-008: the transcript digest is type-inclusive — two digest surfaces

Status: accepted
Date: 2026-07-07
Links: supersedes — · amends ADR-004 · depends-on — · related ADR-003

## Context

Chapter 5's digest slice (packet ch5-P4) realizes the model's
`payload_digest` unit in its schema-less branch:
`digest_of(type ⊕ canonical(payload))` — the idempotency rung's
collision input (IC-A1: same committed `op_id` under a different
payload/contract identity must be a VISIBLE `op_id_collision`, never a
silent `Duplicate`). ADR-004's material speaks only about op_id
derivation, where the emit-lib's `payloadDigest` component is
payload-ONLY (the op type rides the op_id material as a separate
element). Left unrecorded, the two digests would blur — the
`DerivedActorEmitId.payloadDigest` comment already wrongly claimed to
be "the CHK-A1-DIGEST input".

## Decision

Two named digest surfaces in the ONE audited emit-lib, never comparable:

- **`digestPayload` (unchanged):** payload-only canonical digest — an
  op_id-derivation COMPONENT. ADR-004's scheme and outputs are
  untouched.
- **`deriveEmitDigest` (new):** the transcript/collision digest —
  sha256 over `JSON.stringify([TAG, type, canonicalize(payload)])`
  under a dedicated domain-separation tag. Material rule: **the third
  element is ALWAYS `canonicalize`'s output STRING; an absent payload
  is ARITY** (`[TAG, type]`), so absent ≠ `null` (`[TAG, type,
  "null"]`) by construction, and no payload can forge the null form
  (the string `"null"` canonicalizes to `"\"null\""`).

The kernel binds `deriveEmitDigest` through the `DigestSource` port
(IC-E: the kernel never names the emit-lib); the store records the
digest on the committed transcript row (`TranscriptEntry.payloadDigest`
— what `recorded_digest_of` reads); the in-transaction idempotency
check is digest-aware and precedes the CAS. The misleading
`payloadDigest` comment is corrected to point here.

## Alternatives Considered

- **Reusing `digestPayload` for the transcript** — loses the type
  dimension: the model's rung compares op kind ⊕ payload; a
  payload-only digest would call a same-payload/different-type reuse a
  retransmission; rejected.
- **Bare JSON `null` as the null-payload material element** (the plan's
  first sketch) — a special case breaking the uniform
  third-element-is-the-canonical-string rule; rejected at P4
  pre-approval (plan §5.4 aligned).
- **Folding the type into ADR-004's payloadDigest component** — would
  change committed op_id derivations for identical inputs, breaking
  IC-A3 retransmission stability; rejected.

## IC-N Screen (mandatory)

No — this decision touches none of the banned kernel shapes. The digest
is a recorded fact on the materialized transcript row, not event
sourcing; no replay, no reconciler.

## Consequences

- Positive: op_id reuse under different content is VISIBLE
  (`op_id_collision`, an 85-registry name); CHK-A1-DIGEST becomes a
  port-readable property of committed rows; the ch-5+ contract branch
  (schema id ⊕ vocabulary versions) extends the same function later.
- Negative: schema v2 (a `payload_digest` column) — the ADR-003 fenced
  wipe path runs live; dev stores at v1 are wiped on open by design.
- Neutral: operator/lifecycle-op digests stay a named Absent (the EC
  memo's scope decision) until their paths exist.

## Verification

Packet ch5-P4's tests: `CT-A1-COLLISION` (content/type/absence
collisions, collision-beats-stale at both the fast path and the
in-transaction layer), `CHK-A1-DIGEST` (committed rows carry the
derivation; rejections record nothing), the emit-lib
determinism/absence/domain-separation suite, and the live v1→v2
fenced-wipe test.
