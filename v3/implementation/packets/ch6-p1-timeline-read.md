# Task Packet: ch6-P1 — `getTimeline` cursor read

Plan step: plan.md §6.2. Autonomy stage: calibration — **pre-approve**
(first-of-a-kind: cursor read surface + null/`[]` contract). Approved
after one refine round (three findings: the read-transaction honesty,
the fake-store type ripple, the cursor domain).

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

(Empty by design: the floor is a PI-2 operability surface, not model
pseudocode; every ownership axis keeps its ch-4/ch-5 owners.)

## Claim + dimensions (chapter rule 1 — enumerated BEFORE deriving)

**Claim (stated wide):** the timeline surface returns a known instance's
committed transcript rows strictly after the cursor, seq-ascending — and
nothing else can EVER enter this surface (no diagnostic or non-committed
data; the diagnostic channel is ch 7 and separate); unknown instance is
distinguished from known-but-empty.

1. **Cursor semantics** — `afterSeq=0` → full replay; mid-cursor → the
   exact suffix; exact-last-seq and beyond-end → `[]` (valid, empty,
   never null).
2. **Ordering** — seq-ascending, always.
3. **Unknown vs known-empty** — `null` vs `[]`, on BOTH layers
   (StorePort and floor); consistent with `getInstanceDetail`'s
   existing null contract.
4. **Committed-only, negative derived from the wide claim** — after
   duplicate / collision / stale / missing_version / no_transition /
   unknown_instance lanes driven through the REAL kernel, the timeline
   is deep-equal to its prior snapshot (the surface did not move).
5. **Row fidelity** — the rows deep-equal `getInstanceDetail`'s
   transcript (one read surface, two entrypoints; the shared
   `toTranscriptEntry` mapper makes this structural).
6. **Cursor domain (aligned at ch6-P1 pre-approval, plan §6.2)** —
   `afterSeq` is a nonnegative safe integer; negative / fractional /
   `NaN` / `±Infinity` / `> MAX_SAFE_INTEGER` fail closed with a
   `RangeError` BEFORE any query — an integrity-style throw, never a
   kernel rejection (the ch-6 CLI maps it to its usage class; the P2
   tail inherits the same domain).

## Operative material

- `StorePort.getTimeline(instanceId, afterSeq): Promise<readonly
  TranscriptEntry[] | null>` — the port doc-comment carries the full
  contract (duality, domain, wide committed-only claim, one-snapshot
  guarantee).
- **Snapshot decision (refine finding 1):** the implementation is TWO
  statements (existence check → transcript suffix) wrapped in an
  explicit **`BEGIN DEFERRED` read transaction** — never IMMEDIATE (a
  reader must not take the write lock; WAL readers do not block the
  writer). The null/`[]` decision and the row suffix therefore come
  from ONE snapshot — the base the P2 tail's no-skip claim inherits.
  The earlier "single consistent SELECT, no transaction needed" reason
  was WRONG and is retired by this packet.
- Rows are mapped to `TranscriptEntry` AFTER the transaction closes, so
  a parse error cannot leave it open; SQL errors roll back
  (build watchpoints, both test-pinned).
- **Boundary note:** `getInstanceDetail`'s existing transaction-less
  two-statement shape is OUTSIDE this packet's mutation boundary — its
  own claim is unchanged; the dim-5 cross-consistency test runs on
  quiescent state. If the tail or bundle later needs a snapshot
  guarantee on the detail read, that is that packet's decision.
- Floor: `getTimeline` delegates; the duality and the `RangeError`
  propagate unchanged.
- No schema change (`SCHEMA_VERSION` stays `"2"`); no kernel / ingress /
  emit change.

## Embedding gates (v1-inherited)

- Target files: `v3/src/ports/store.ts`, `v3/src/store/sqliteStore.ts`
  + `sqliteStore.test.ts`, `v3/src/floor/floor.ts` + `floor.test.ts`,
  `docs/v3/implementation/plan.md` (§6.2 aligned-at-ch6-P1 line), this
  packet file.
- **Type-surface ripple, no behavioral assertion change** (refine
  finding 2): `v3/src/kernel/kernel.test.ts` (`unusedStoreParts` Pick +
  stub) and `v3/src/testkit/traceHarness.test.ts` (`fakeStore` stub) —
  one `getTimeline: reject("unused")` line each; no assertion touched.
- Mutation boundary: exactly those files.

## Acceptance

- Dimensions 1–3, 5–6 against the real SQLite store; dimension 4
  through the REAL kernel over the floor (six rejected lanes, snapshot
  deep-equal).
- Build watchpoints test-pinned: an invalid cursor opens NO transaction
  (a subsequent `BEGIN IMMEDIATE` commit succeeds); a row-parse error
  surfaces AND leaves no open transaction.
- All v3 bridges green; coverage unchanged on ownership axes
  (units 5/158, invariants 8/116, traces 2/20).
- Standing review rules: **REV-C-PROJECTIONS-READONLY** (the read path
  writes nothing); REV-A1-TXN untouched (no commit-path change).

## Build record

Built 2026-07-08. 169 v3 tests green (160 → 169: 6 store-level + 3
floor-level). Typecheck + lint green; the two ripple files carry the
stub line only.
