# Task Packet: ch6-P2 — `tailCommittedTimeline`, the committed floor-tail seed

Plan step: plan.md §6.3. Autonomy stage: calibration — **pre-approve**
(first-of-a-kind: streaming shape + wait seam). Approved after one
refine round (three findings: the terminal-stop race, the WAL two-handle
acceptance topology, the tail error contract).

**Scope statement (approval watchpoint, binding):** P2 delivers the
**seam + engine foundation** — the `TailWait` port, the scripted test
binding, and the drain/stop engine. The production timer binding
activates in P4 with the CLI; this packet is NOT an end-to-end operator
tail and must not be read as one.

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

(Empty by design — the P1 precedent; every ownership axis keeps its
owners.)

## Claim + dimensions (chapter rule 1 — enumerated BEFORE deriving)

**Claim (stated wide):** the tail yields EVERY committed row of the
instance with `seq > fromSeq` exactly once, in seq order — rows
committed before AND during the tail alike; it completes exactly when
the instance is terminal and fully drained; non-committed data never
appears; unknown instance and invalid cursor fail closed before any
wait. Deliberately NOT the observe seam: live push media, addressed
streams, backpressure, terminal/gap marker semantics, and the
diagnostic layer (ch 7) are deferred; the stop-at-terminal is a
pragmatic completion condition, not the seam's typed terminal-marker
contract.

1. **History replay** — rows present at start yielded first, in order.
2. **Live no-skip** — rows committed between poll rounds (staged by the
   scripted wait) all appear, order preserved across the replay/live
   boundary. Proven on the ratified topology: ONE WAL file, tail and
   writer on separate `openStore` handles (refine finding 2).
3. **No-duplicate** — cursor advance across rounds never re-yields.
4. **Stop condition** — (a) mid-tail terminal commit: all rows out,
   completion, no post-terminal wait; (b) already-terminal at start:
   full replay + completion with ZERO waits; (c) the drain/status race
   (refine finding 1): a terminal commit landing between the drain and
   the status read is picked up by the no-wait final drain (fake-seam
   schedule — the real store cannot stage it deterministically).
5. **Unknown at start** — `TailUnknownInstanceError` on the first
   `next()`, zero waits; never a silent empty stream.
6. **Invalid cursor** — `RangeError` (inherited §6.2 domain) on the
   first `next()`, zero waits.
7. **Committed-only inherited by construction** (reads only through
   `getTimeline`) + probe: stale/collision lanes fired mid-tail through
   the real kernel yield nothing.
8. **Mid-stream vanish** — `TailIntegrityError` on BOTH read lanes
   (timeline null, instance null); v1 cannot produce it (no purge), the
   code is fail-closed anyway (fake-seam probes).
9. **`wait()` rejection** — propagates as-is out of that `next()`; the
   tail is terminated (the following `next()` reports done).

## Operative material

- **Engine invariant (refine finding 1):** `wait()` runs ONLY after a
  non-terminal POST-drain status read. Once terminal is observed the
  engine drains until an empty batch and completes — bounded by the
  terminal-sink invariant (no commits after terminal).
- **Tail Error Contract (refine finding 3 — the P4 exit-code mapping
  base).** Header rule: the factory and `tailCommittedTimeline` never
  throw; every failure surfaces on iteration.

  | Lane | Class | When |
  |---|---|---|
  | invalid cursor | `RangeError` (from §6.2) | first `next()`, before any wait |
  | unknown at start | `TailUnknownInstanceError` | first `next()`, before any wait |
  | mid-stream vanish | `TailIntegrityError` | the affected round's `next()`; no wait after detection |
  | `wait()` rejection | propagates unchanged | that `next()`; tail terminated |

- **Factory shape (aligned at ch6-P2 pre-approval):**
  `createTail(store, wait)` in `floor/tail.ts` — NOT a `createFloor`
  extension; the request/response `Floor` stays seam-free and no
  fake-store ripple arises. `TailWait` lives in `ports/tail.ts` (the
  injected-interface home, ADR-001).
- **Scripted wait** (testkit): the Nth wait runs the Nth scripted step;
  an exhausted script fails LOUDLY — a tail that should have completed
  becomes a deterministic test error, never a hang. Exposes a call
  counter for the zero-wait assertions. No real sleep anywhere; the
  kernel's `TimeSource` untouched (IC-D).

## Embedding gates (v1-inherited)

- Target files: `v3/src/ports/tail.ts` (new) + `ports/index.ts`,
  `v3/src/floor/tail.ts` (new, incl. the two named error classes) +
  `floor/index.ts`, `v3/src/floor/tail.test.ts` (new),
  `v3/src/testkit/tailWait.ts` (new) + `testkit/index.ts`,
  `docs/v3/implementation/plan.md` (§6.3 aligned-at-ch6-P2 line), this
  packet file.
- Mutation boundary: exactly those. NO kernel / ingress / emit / store
  / schema change; no fake-store ripple (StorePort and Floor
  unchanged).

## Acceptance

- Dimensions 2–4a on the file-backed WAL two-handle topology; 1, 4b,
  5–7, 9 on the real store (+ real kernel where ops flow); 4c and 8 as
  fake-seam engine probes.
- The scripted-wait exhausted guard itself test-pinned.
- All v3 bridges green; coverage unchanged on ownership axes
  (units 5/158, invariants 8/116, traces 2/20).
- Standing review rules: **REV-C-PROJECTIONS-READONLY** (the tail only
  reads); REV-A1-TXN untouched.

## Build record

Built 2026-07-08. 179 v3 tests green (169 → 179: 10 new in
`floor/tail.test.ts`). Typecheck + lint green; one lint round
(IteratorResult narrowing helper replaced `value?.seq`).
