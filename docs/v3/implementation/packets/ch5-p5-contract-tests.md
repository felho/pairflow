# Task Packet: ch5-P5 — CT-A3-RETRANS, CT-A3-EMITLIB-REFRESH, CT-B-TWOWORKER

Plan step: plan.md §5.5; realizes the three remaining ch-5 IC rows.
Autonomy stage: calibration — **flow** (§5.8: an already-validated
class — pure contract tests over the landed P4 surface; reviewed at the
commit boundary). The §5.5 **flow guard held**: the packet is
test-only — no production module, port, schema, or lint change.

## Ledger slice (declared — feeds the coverage accounting)

```json
{
  "ledger_slice": {
    "units": [],
    "rejections": [],
    "invariants": [],
    "traces": [],
    "shared_ownership": []
  }
}
```

(Empty by design: the three CTs realize INTAKE rows; the invariants they
lean on — op-id-idempotency, expected-version-mandatory — keep their
ch-4 owners.)

## Claim + dimensions (chapter rule 1 — enumerated BEFORE deriving)

**CT-A3 claim (IC-A3, kernel-facing halves):** op_id stability is the
emit-lib's contract and the kernel enforces exactly what it receives —
a retransmission is invisible (Duplicate), a refresh is a new operation.

1. **Retransmission identity** — same packet identity + payload →
   byte-identical op_id → `Duplicate`, ONE row.
2. **Refresh identity** — a post-Stale re-emit from a FRESH packet →
   a DIFFERENT op_id by construction → commits.
3. **No consumption** — the Stale rejection consumed no key: the final
   transcript holds exactly the two committed ops.

**CT-B claim (IC-B):** two workers over one instance stream are
winner- and schedule-independent — authority is the SHARED store
(uniqueness + CAS), never worker-local state.

4. **Cross-handle race** — the same op racing through both handles →
   exactly one commit + one `Duplicate`; both handles read back the
   same single row.
5. **Schedule independence** — ALL 2⁴ worker assignments of the
   four-op run produce the identical transcript and final state.
6. **Cross-handle visibility** — a worker that never saw the other's
   commit answers `Stale`/`Duplicate` from the shared store (REV-B).
7. **Topology boundary (stated narrowly, plan §5.5)** — one process /
   one event loop / synchronous `node:sqlite`: no two BEGIN IMMEDIATE
   transactions in flight → no SQLITE_BUSY HERE; process-level
   contention is the explicit ch-9 contract (real-runner re-run of
   this CT). No BUSY behavior is claimed or tested in this packet.

## Operative material

- **Context-packet identity** is the CALLER's stable string (the
  emit-lib takes it opaque; ADR-004): these tests use
  `<instanceId>@v<version>` — the packet the emit was derived from. A
  refresh means a NEW packet string; a retransmission reuses the old
  derivation output untouched.
- **CT-B runs on ONE file-backed WAL database** with two `openStore`
  handles (`:memory:` would be two separate stores and prove nothing);
  ops interleave at the op level — the scripted actor's turn order and
  the assignment mask are the schedule.
- The stale probe op in dimension 6 uses a FRESH op_id — probing
  staleness with a committed op would (correctly) answer `Duplicate`
  and mask the dimension.

## Embedding gates (v1-inherited)

- Target files: `v3/src/emitLoop.test.ts` (new),
  `v3/src/twoWorker.test.ts` (new — the src-root cross-module test
  precedent); this packet file.
- Mutation boundary: exactly those. NO production file, port, schema,
  lint, or script change (the flow guard's condition, verified at the
  commit boundary by this diff).

## Acceptance

- `CT-A3-RETRANS`: derivation equality asserted lib-side AND the
  kernel answers `Duplicate` with one transcript row (dimension 1).
- `CT-A3-EMITLIB-REFRESH`: `Stale(currentVersion)` then a fresh-packet
  commit under a provably different op_id; final transcript = the two
  committed ops only, version arithmetic intact (dimensions 2–3).
- `CT-B-TWOWORKER`: the cross-handle race (dimension 4); all 16
  assignment schedules identical (dimension 5); cross-handle
  stale/duplicate visibility (dimension 6). No BUSY claims
  (dimension 7 is a boundary statement, not a test).
- All v3 bridges green; coverage unchanged on ownership axes
  (units 5/158, invariants 8/116, traces 2/20).
- Standing review rules: **REV-B-LOCAL-NOT-AUTHORITY** is the tested
  claim itself; REV-A1-TXN / REV-E untouched (no production diff).
