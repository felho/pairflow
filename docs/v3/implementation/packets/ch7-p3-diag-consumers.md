# Task Packet: ch7-P3 — diag consumers (tail diagnostic layer + bundle three-state flip + the free-text boundary)

Plan step: plan.md §7.4. Autonomy stage: calibration — **pre-approve**
(first-of-a-kind: cross-lane streaming; export-boundary extension; the
FIRST v2-form packet — the ch7 pilot, human-approved per README §5.5).
Classification: **projection with TWO new-decision rows** — manifest
tally: 26 anchored / 14 derived / 2 new-decision (machine-counted from
the `packet_rows` block; the round-1 header had written the tally from
memory and was wrong — the measurement-rule lesson, process-logged).
The new-decision rows: X1 (the interim CLI wiring token — reclassified
at panel round 1 by the entailment attack; Case-B semantic trigger →
STOP `1:late-b-signal`) and J10 (the errorName length cap — minted by
the STOP-2 hybrid verdict). **Both STOPs are RESOLVED by the user's
verdicts (2026-07-10):** STOP 1 → option (a), the `open_failed`
mapping stands (flag 1); STOP 2 → stated exception + 64-character
prefix cap (flag 4). Both decisions ride as flags to this pilot's
human approve, which ratifies them. Every derived row carries its
derivation note in the row text; the §7.7 pre-registered prediction
(projection) holds for the packet's substance — the two decisions are
flagged, never absorbed.

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

Operability packet (§7.6): the diagnostic channel is memo-born (PI-4 /
Addendum 2 B1), not model pseudocode. Coverage axes unchanged — an
assertion the close verifies, not an omission.

## Sizing/risk (template §2 step 0 — materialized)

Predicted class (plan §7.7, pre-registered 2026-07-09 at the Phase-1
flip): projection (sources: the P1/P2 packet contracts + §7.4).
Discovered at authoring + round 1 + the STOP verdicts: projection with
two new-decision rows (X1; J10) — the mismatch is the pair of flagged
decisions, recorded for the prediction data the pilot exists to
collect.

Six axes:

- **authority movement:** NO — both consumers READ; no source of truth
  moves (committed truth stays the main store's; diag truth stays the
  diag store's).
- **surface spread:** ONE concept (diag consumption) on ONE production
  surface family — the floor read projections (tail + bundle, two
  sibling modules of the same family). The CLI edits are a mechanical
  signature ripple (no exit/parse/config matrix changes; one
  pass-through content lane, X1 — whose TOKEN pick is the flagged
  new-decision, the STOP-1 subject, declared below). Testkit CONTRACT
  unchanged (rejecting readers/stores are inline test fakes — the P1
  per-call-fake precedent; tests merely exercising the change never
  count).
- **identity/join fragility:** TOUCHED, shallow — diag rows correlate
  to instances across two stores by ONE exact-string id form
  (`instanceId`); no competing id forms to align. The join mechanism
  (attribution routing) is P2's, already driven; P3 re-asserts it at
  each consumer (dimension 3 and lane S8 — both halves driven).
- **foundation + activation coupling:** NO — P3 is foundation (library
  layer); the CLI activation is P4's (the ch6-P2/P3 scope-statement
  culture).
- **prerequisite coupling:** NO — P1 and P2 are built and committed.
- **acceptance multiplicity:** two success classes (streaming behavior;
  export format) — no schema / write-path / migration class.

Hard stops: none trip. Stop 11 answered explicitly: the diag tail
REUSES the ch6-P2 committed-lane proof contract WITH proof parity —
dimension 1 re-drives the committed schedules THROUGH the diag tail
(never assumed from the plain tail's suite), the ch6-P2 dimension-7
separation probe included (dimension 3's both-lanes-react schedule).
Escalation combos below hard-stop: none (no authority change; one id
form; two surfaces).

Consume-family scan: N/A — no authority movement (the scan is
authority-heavy discovery; this packet moves none).

**single-packet allowed: yes** — closure proof: one bounded build
closes both consumer seams; the same proof surface (the floor suites +
two CLI pass-through lanes) validates it; the same owner (this
packet's boundary) takes the fallout; no separate
compatibility/recovery/migration risk beyond the declared lanes.

## Claim + dimensions (chapter rule — enumerated BEFORE deriving)

**Claim (wide):**

1. **Tail:** `tailWithDiagnostics` yields a discriminated two-lane
   union. Its COMMITTED lane delivers exactly what the ch6-P2 tail
   delivers — every committed row of the instance with
   `seq > fromSeq` exactly once, in seq order, same completion
   condition — the guarantee UNCHANGED, and the diag lane's presence
   cannot weaken it. Its DIAG lane delivers every ATTRIBUTED
   diagnostic event with `ordinal > fromOrdinal` that lands before
   the final diag read fires exactly once, in ordinal order. NO
   cross-lane total order is claimed — each lane in its OWN cursor
   order, the interleave is polling-incidental, rows carry their own
   cursors. The tail completes at the COMMITTED terminal after a
   final drain of both lanes; post-close diag events are never
   streamed (the query surface is the recourse). Every failure is
   LOUD on iteration — never a silent gap, never a silently empty
   lane (the canonical statement is the E-matrix header rule).
2. **Bundle:** the bundle's `rejectedInputs` section is three-state —
   attributed rows present (zero rows = known-empty), or
   `unavailable(reason)` with an enumerated token — NEVER a silent
   empty, and the bundle itself SUCCEEDS under ANY diag-side failure,
   read and row-projection alike, typed or not (the committed half is
   authoritative). Only ATTRIBUTED rows enter; the row projection
   carries ONLY the plan-enumerated fields.
3. **Free text:** no free text sourced from runtime errors or
   payloads appears ANYWHERE in the default bundle's full
   serialization, with ONE stated, plan-enumerated exception: the
   `errorName` scalar carries `error.name` — an
   untrusted-in-principle string that is an identifier by convention
   — verbatim up to a 64-CHARACTER PREFIX CAP (J10; the STOP-2
   verdict, 2026-07-10, resolved the tension as stated exception +
   cap — flag 4). `error.message` does not appear at all (not even
   as a redacted string), and `unavailable.reason` is the enumerated
   token — never underlying error text, even from a lying
   name-matched carrier (S6's token validation). The FULL
   `error.message` remains readable on the diag channel's LOCAL
   surfaces — the tail's diag lane is one (§7.4).

Dimensions:

1. **Committed-lane parity (proof parity for the ch6-P2 contract):**
   the ch6-P2 schedules — history replay; live no-skip across rounds;
   no-duplicate; stop condition (mid-tail terminal /
   already-terminal-at-start with ZERO waits / the drain-status race)
   — re-driven THROUGH `tailWithDiagnostics`: committed rows and
   completion identical to the plain tail's. The plain
   `tailCommittedTimeline` is untouched (lane T7).
2. **Diag-lane delivery:** pre-tail history events replay on the first
   poll; live events staged between rounds appear; ordinal order
   within the lane; exactly-once under cursor advance; a mid-cursor
   `fromOrdinal` skips earlier events (`ordinal > fromOrdinal`).
   Staging: shape/cursor schedules stage events via direct
   `sink.emit` into the real diag store; the both-lanes-react
   schedule (dimension 3) stages via REAL kernel/ingress flows.
3. **Attribution scope + separation at the consumer (tail):**
   (a) another instance's attributed events and unattributed events
   NEVER appear — driven from both sides (they exist in the diag
   store; the tail yields none of them); (b) the ch6-P2 dimension-7
   probe transposed and SHARPENED — a mid-tail rejected/stale submit
   through the REAL kernel appears on the DIAG lane and mints NO
   committed-lane row (both lanes react to one input; the chapter
   preamble's separation claim driven at this consumer).
4. **Union row shape:** every yielded row matches exactly ONE variant
   with the EXACT keyset (closed schema per variant, lane T1); the
   diag variant carries the FULL `DiagnosticEvent` —
   `error.message` included: the tail is a LOCAL surface (§7.4).
5. **Stop semantics (lane T5):** committed terminal observed →
   committed drain-till-empty → ONE final diag read → complete.
   Driven: (a) a diag event landing in the final-drain window IS
   delivered; (b) post-close diag events are NOT streamed and ARE
   visible on the query surface (the recourse test at the library
   seam: a rejected submit against the DONE instance after tail
   completion appears in `getDiagnostics`, not in the closed stream —
   the plan-literal DUMP-face variant is P4's forward obligation,
   flag 5); (c) no wait after terminal (scripted-wait call count
   pinned); (d) the diag lane never extends the tail's life (no
   till-empty on the diag lane).
6. **Tail error contract:** every E-lane driven, the stop-path sites
   included (the E-matrix header carries the per-phase awaited-site
   inventory); a round's fetch failures surface BEFORE that round's
   yields (engine order T3, so unknown-instance / seq-cursor errors
   take precedence over diag errors within a round). Rows carry their
   own cursors, so a terminated tail is losslessly resumable — DRIVEN:
   a mid-stream diag failure staged in a round WITH freshly committed
   rows asserts (i) that round's committed rows were NOT yielded
   before the error, and (ii) a new tail from the last yielded
   cursors delivers everything exactly once.
7. **Bundle three-state:** S1/S2 both ways (known-empty is `present`
   with zero rows — never `unavailable`, never omitted); every
   `DiagUnavailableReason` token driven THROUGH the bundle surface
   (S3–S5, real diag-store states); the bundle SUCCEEDS on every
   unavailable lane with its committed half byte-identical to a
   healthy-diag twin export; the contract-violating-reader lanes
   driven per S6's member list (member (i) in BOTH shapes — non-typed
   rejection AND synchronous throw; lied-reason name-match; malformed
   resolved rows breaking the projection); a committed-half failure
   is NEVER masked (S9).
8. **Bundle projection keyset:** closed schema per row (the J matrix):
   `{kind, source, at, ordinal}` always; `reason` / `errorName` /
   `payloadDigest` / `detail` per their J-rows; NOTHING else — no
   `error.message`, no attribution fields, no version fields. Driven
   by the EIGHT-class fixture partition below (derived FROM the
   J-matrix so every presence/absence combination the bundle can meet
   is exercised — carried verbatim, no out-of-packet fishing).
9. **Free-text marker scan (wide-claim negative):** markers planted
   via (a) committed payloads (the ch6-P3 lane, kept), (b) a HOSTILE
   `internal_failure` `error.message` emitted through the REAL sink,
   (c) the unavailable lane's underlying driver/path message — with a
   LOUD fixture self-check first (assert the marker IS present in the
   underlying `DiagUnavailableError.message` before asserting its
   absence in the bundle — the P2 flag-5 self-check culture; markers
   plain alphanumeric so JSON escaping cannot flatten them). Staging
   channel for (c), stated (measured against the live store,
   2026-07-10: every reader-error construction site passes reason
   only — `sqliteDiagStore.ts:430` and `:442` — so a REAL store
   state's `message` is always the fixed token-derived default,
   `:54`, and can never carry the marker): the (c) lane stages a
   SYNTHETIC name-matched carrier on an inline rejecting fake —
   `name = "DiagUnavailableError"`, a VALID token `reason`, and a
   hostile marker-bearing `message` — which is exactly the free-text
   shape the boundary must hold against; the self-check binds that
   carrier. And
   (d) a HOSTILE `error.name` (flag 4): a marker planted in the NAME
   appears ONLY within `errorName` field positions and NOWHERE else
   in the full serialization — the carve-out's boundary driven
   precisely — AND the J10 cap driven: a 65+-character name projects
   as exactly its first 64 characters (a conforming short name is
   untouched). The full `JSON.stringify(bundle)` scan finds no marker
   outside (d)'s stated positions under the default policy.
10. **Policy independence:** the diag-row projection is IDENTICAL
    under both named policies (`RedactionPolicy` governs transcript
    payload admission ONLY — its contract is `includePayload`); the
    ch6-P3 schema walk re-run under BOTH policies with the new
    section (the K matrix).
11. **Unknown instance:** `exportDebugBundle` → `null` with the diag
    reader NEVER consulted (a rejecting/poisoned reader + unknown id
    still → clean `null`): existence is decided by the committed
    detail read — the diag store has no instance-existence authority
    (P2).
12. **Determinism:** two exports of the same store + diag state are
    string-identical; two exports under the same unavailable reason
    are string-identical (the ch6-P3 dimension extended to the new
    section).
13. **No new numeric-domain validator:** both cursors are validated by
    their OWNING surfaces — `getTimeline` (§6.2 domain incl. the
    P2-landed `-0` guard) and `getDiagnostics` (the P2 full-ladder
    validator, `RangeError` before SQL and before availability). The
    tail introduces NO validator of its own; the R-NUMERIC-LADDER
    obligation is discharged by delegation — driven at the seam (one
    invalid representative per cursor surfaces as `RangeError` before
    any wait, E1/E2), the full ladder lives in the owners' suites.
14. **Zero-semantics regression:** kernel / ingress / store / ports
    untouched; the full existing suite (323 tests at the ch7-P2
    aftermath baseline, verified in-session) stays green; the CLI
    exit/parse/config matrices untouched — the bundle verb's
    pass-through CONTENT changes exactly per the K matrix (lane X1).

## Canonical tail surface matrix (this packet is the shape's source — memo-born)

| Id | Surface | Contract |
|---|---|---|
| T1 | `DiagTailRow` union | `{ lane: "committed", row: TranscriptEntry } \| { lane: "diag", event: DiagnosticEvent }` — exact keysets per variant (closed schema: `lane` + the one payload key, nothing else). The diag variant carries the FULL read-face event (`at`/`ordinal` included — the row carries its own cursor). DERIVATION: plan §7.4 names the discriminated union and §7.5 the lane discriminator; the TS member/key naming is minted here (derived) |
| T2 | `DiagTail` + factory | `createDiagTail(store, diag, wait): DiagTail` with `tailWithDiagnostics(instanceId, fromSeq, fromOrdinal): AsyncIterable<DiagTailRow>` — lives in `floor/tail.ts`: the ch6-P2 seed EXTENDED in place, not a parallel module. STRUCTURAL row: compile-enforced signature, exercised by every driving test — no separate lane. DERIVATION: the per-surface factory precedent (ch6-P2 `createTail`, ch6-P3 `createDebugBundleExporter`) + plan §7.4 "extended, not rewritten" (derived) |
| T3 | engine round order | per round: fetch committed batch (`getTimeline`) → fetch diag batch (`getDiagnostics`) → yield committed rows → yield diag rows. A round's fetch failures fire BEFORE any of that round's yields; the committed fetch runs FIRST, so existence/seq-cursor errors take precedence over diag errors in the same round. DERIVATION: the ch6-P2 fail-closed-before-any-wait culture extended to two lanes — deterministic error lanes need fetches ahead of yields (derived) |
| T4 | cursors | two independent cursors (`fromSeq`; `fromOrdinal`), each lane in its OWN order (`seq`; `ordinal`), NO cross-lane total order claim — the interleave is polling-incidental; every yielded row carries its own cursor (anchored: plan §7.4) |
| T5 | stop rule | completion anchors to the COMMITTED terminal: terminal observed (post-yield status read) → committed drain-till-empty (bounded by the terminal-sink invariant) → ONE final diag read → complete. Post-close diag events are NOT streamed; the query surface is the recourse. DERIVATION of the ONE-read final drain: the plan's own stop rationale — a stray submit can mint diag events forever, so a till-empty diag drain would unbound the tail; one post-terminal read is the maximal drain that terminates (derived from plan §7.4) |
| T6 | wait seam | the single `TailWait` between rounds, unchanged; `wait()` runs ONLY after a non-terminal POST-drain status read (anchored: the ch6-P2 engine invariant) |
| T7 | plain tail untouched | the EXPORTED ch6-P2 surfaces are byte-untouched: `tailCommittedTimeline`'s behavior and bytes, `createTail(store, wait)`'s signature. The module diff is additive PLUS one comment-only ripple: the file-header doc comment's "the diagnostic layer (ch 7) … deferred" sentence goes stale with this packet and gets the refresh (the ch7-P1 trace-harness comment-only precedent). DERIVATION: dimension 14's zero-regression obligation made structural (derived) |

## Tail error-contract matrix (extends ch6-P2's — the P4 exit-code mapping base)

Header rule (canonical for "every failure is LOUD on iteration"): the
factory and `tailWithDiagnostics` never throw synchronously — every
failure surfaces on iteration, and the engine carries NO try/catch
ANYWHERE, so propagation is uniform BY CONSTRUCTION. The awaited
port/boundary sites are enumerated PER PHASE (a list, not a count):
per NORMAL round — `store.getTimeline`, `diag.getDiagnostics`,
`store.loadInstance`, `wait()`; the STOP PATH adds its own awaited
sites — the drain `getTimeline` reads and the ONE final
`getDiagnostics` read (a phase change MINTS lanes — the P2 flag-8(b)
lesson; the final-read failure lane is DRIVEN because a build could
locally catch it and silently complete, which no other declared lane
would detect).

| Id | Lane | Class | When |
|---|---|---|---|
| E1 | invalid `fromSeq` | `RangeError` — `getTimeline`'s §6.2 validator (the P2-landed `Object.is` `-0` guard included) | first `next()`, zero rows, zero waits |
| E2 | invalid `fromOrdinal` | `RangeError` — `getDiagnostics`' P2 validator (before SQL, before availability). DERIVATION: the cursor domain is the P2 surface row's; the tail only inherits its seam (derived from packet ch7-p2 + the ch6-P2 error-contract form) | first `next()`, zero rows, zero waits (T3: fetches precede yields) |
| E3 | unknown instance at start | `TailUnknownInstanceError` — PRECEDES diag errors (T3: committed fetch first). The precedence is DRIVEN as a combination lane, not inferred from the isolated lanes: unknown instance + an unavailable diag reader in the SAME first round → `TailUnknownInstanceError`, never `DiagUnavailableError` (a diag-first engine would pass every isolated lane while falsifying T3) | first `next()`, zero rows, zero waits |
| E4 | mid-stream vanish | `TailIntegrityError`, both committed read lanes (timeline null; instance null) — unchanged from ch6-P2 — PLUS the stop-path DRAIN-null variant as its own driven lane (the header's minting rule, applied symmetrically with E6/E9: terminal observed → a drain `getTimeline` read resolves null → `TailIntegrityError`, never a silent completion; the drain null-check is a distinct code site from the round's) | the affected round's `next()` — the drain window included |
| E5 | diag unavailable at start | `DiagUnavailableError` propagates AS-IS — matched by nothing, wrapped by nothing (the tail is fail-LOUD: §7.3 matrix, tail row). DERIVATION: the §7.3 CLI mapping (one stderr error doc / exit 1) requires the library to surface the typed error; the P2 `(name, reason)` contract is what P4 will map (derived) | first `next()`, zero rows, zero waits |
| E6 | diag failure mid-stream OR at the stop-path final read | `DiagUnavailableError` propagates on that `next()`; the tail is TERMINATED (the following `next()` reports done). The stop-path variant is its own driven lane: terminal observed, committed lane fully drained, the final diag read rejects → LOUD on the last `next()`, never a silent completion. DERIVATION: same §7.3 tail row + the ch6-P2 wait-rejection termination shape (derived) | that `next()`; no wait after — the final-read site included |
| E7 | `wait()` rejection | propagates as-is; tail terminated — the ch6-P2 row, re-driven in the two-lane engine | that `next()` |
| E8 | contract-violating reader (non-typed rejection) | propagates as-is — the tail classifies NOTHING (loud is its contract; unlike the bundle it has no succeed-anyway obligation). DERIVATION: the E5/E6 pass-through culture applied to the unclaimed input (derived) | that `next()`; tail terminated — driven at the round phase AND at the stop-path final read (a name-filtering local catch there would pass E6's typed stop variant while swallowing the non-typed shape; this variant closes the last site × shape cell) |
| E9 | committed-lane port rejection (`getTimeline` / `loadInstance` rejects — any round's reads AND the stop-path drain reads, the same site class) | propagates as-is; tail terminated — the two-lane engine adds NO swallow anywhere (the header's no-catch construction). DERIVATION: P1's awaited-port-call inventory rule applied to this seam; ch6-P2 left the lane undeclared, P3 declares AND drives it (derived) | that `next()` — the stop-path DRAIN read included as its OWN driven variant (the header's minting rule, applied symmetrically with E6: terminal observed → the drain `getTimeline` rejects → LOUD on that `next()`, never a silent completion that drops rows landed between the last yield and terminal) |

## Bundle section-state matrix

| Id | Diag-side state | Section | Bundle |
|---|---|---|---|
| S1 | attributed rows exist | `{ status: "present", rows: [...] }` — the instance's FULL attributed history (read from cursor 0), ordinal-ascending | succeeds (anchored: plan §7.4) |
| S2 | diag store open, zero attributed rows | `{ status: "present", rows: [] }` — known-empty, NEVER `unavailable`, never omitted | succeeds (anchored: plan §7.4 known-empty clause) |
| S3 | open failure (garbage bytes / directory path — P2-driven states) | `{ status: "unavailable", reason: "open_failed" }` | succeeds; committed half byte-identical to the healthy twin (anchored: §7.3 matrix bundle row; ADR-010) |
| S4 | refused marker (the P2 O4–O6 family) | `{ status: "unavailable", reason: "refused_marker" }` | succeeds (anchored: §7.3 matrix; ADR-010) |
| S5 | read failure (closed handle / corrupt row) | `{ status: "unavailable", reason: "read_failed" }` | succeeds (anchored: §7.3 matrix) |
| S6 | contract-violating reader — members enumerated (a list, not a count): (i) NON-typed rejection or SYNCHRONOUS throw — BOTH shapes driven: the throw is a distinct failure shape at a surface that HAS a catch (a mis-scoped catch around only the awaited promise would pass the rejection lane and fail the export on a sync throw); (ii) a name-matched error whose `reason` is NOT one of the three tokens (a lying carrier); (iii) resolved rows that break the projection (e.g. `internal_failure` without `error` → the `errorName` copy would throw) | `{ status: "unavailable", reason: "read_failed" }` on every member — the wrapper proof. `DiagUnavailableError` is matched BY NAME (`error.name` — the P2 cross-module `(name, reason)` contract; `floor/` takes no `diag/` value import, ADR-007 discipline + the new lint pattern) AND its `reason` is VALIDATED against the three-token enum — a non-token `reason` degrades to `read_failed`, so K3 holds against lying carriers; the catch wraps the diag read AND the row projection (the whole diag-side consumption), never the committed half. DERIVATION: §7.3 "the bundle itself SUCCEEDS" read wide + the P1 contract-violating-fake culture (a claim's negatives derive from the claim, not from polite callers) (derived; FLAGGED — flag 2) | succeeds |
| S7 | unknown instance | bundle = `null`; the diag reader NEVER consulted — existence is the committed detail read's decision (the diag store has no instance-existence authority, P2). The NEVER is pinned by a CALL-RECORDING fake, not by absence of failure: a rejecting reader alone cannot distinguish "never called" from "called and swallowed by the S6 catch" — the driving fake counts invocations and the test asserts ZERO | — (anchored: ch6-P3 null lane + ch7-p2 no-existence-authority) |
| S8 | another instance's rows / unattributed rows | never enter — attributed-only via `getDiagnostics(instanceId, 0)`; unattributed rows are the GLOBAL read's territory (P4's dev dump). Driven on BOTH consumers: the tail half in dimension 3, the bundle half staged in the real diag store (foreign + unattributed rows present; `rejectedInputs.rows` excludes them) | succeeds (anchored: plan §7.4) |
| S9 | committed-half failure (`getInstanceDetail` rejects) | propagates — the export FAILS; a committed-side failure is NEVER masked as `unavailable` (the succeed-anyway scope is the DIAG side only; the catch wraps the diag read + projection, nothing else). Ruled-out member, stated: `policy.includePayload` sits on the transcript path (ch6-P3's surface, untouched here) — its misbehavior was never claimed and stays unclaimed. DERIVATION: the committed half is authoritative (§7.3 rationale), so its failure is the export's failure (derived) | fails loud |

## Bundle diag-row projection matrix (plan §7.4's enumerated field list is the authority)

The projection COPIES fields from the read-face event — it derives
nothing and performs no fallible work beyond its own reads (the P2
observer rule); presence of the conditional source fields on the EVENT
is P1/P2's contract (enforced upstream by the emit gate + the R3 read
gate), not re-decided here — the proof boundary: P3 proves faithful
copying and exclusion, never digest-point/keyset correctness (P1/P2
own those). A resolved row whose violation BREAKS the projection
(e.g. `internal_failure` without `error`) is S6 member (iii) — lost
to the diag-side catch, never a thrown export. A NON-breaking
violation (a missing conditional field the copy-iff-carried rule
skips cleanly; a value-lied field that copies verbatim) is
deliberately UNCLAIMED residue: the real channel cannot produce it —
P2's R3 gate rejects every non-projection row at read — so the
guarantee is upstream's, stated here so the residue is a decision,
not an oversight.

| Id | Field | Presence | Source |
|---|---|---|---|
| J1 | `kind` | always | the event (anchored: plan §7.4) |
| J2 | `source` | always | the event (anchored: plan §7.4) |
| J3 | `at` | always | the event (sink-stamped, P2) (anchored: plan §7.4) |
| J4 | `ordinal` | always | the event (anchored: plan §7.4) |
| J5 | `reason` | iff the event carries it (kind = `rejected`) | the exact `RejectionName` (anchored: plan §7.4 "the rejection name") |
| J6 | `errorName` | iff kind = `internal_failure` | `error.name` ONLY, flattened to a scalar — carrying an `error` OBJECT would leave a structural slot for `message`; the flat key makes the no-message rule structural. The VALUE is untrusted in principle (an identifier by convention) — the Claim-3 carve-out, flag 4 — and is length-capped per J10. DERIVATION: plan §7.4 enumerates "`error.name`", not the error object (derived) |
| J7 | `payloadDigest` | iff the event carries it | the fingerprint, copied (anchored: plan §7.4 "the fingerprint") |
| J8 | `detail` | iff the event carries it | the enumerated `IngressDetailToken` (anchored: plan §7.4) |
| J9 | excluded, closed | `error.message` NEVER (not even redacted); attribution fields (`instanceId`/`opId`/`actorId`/`type`) NEVER — rows are the bundle instance's by selection, and `opId`/`actorId`/`type` are admission-passed but ARBITRARY caller strings, outside the plan's ONLY-list; `expectedVersion`/`currentVersion` NEVER — outside the ONLY-list | anchored: plan §7.4's exhaustive "carries ONLY … " enumeration |
| J10 | `errorName` length cap | the projected value is `error.name`'s FIRST 64 UTF-16 CODE UNITS (`String.prototype.slice(0, 64)` semantics — the unit is pinned so an astral-heavy hostile name cannot make the boundary test fixture-dependent; every "64-character" mirror reads per this definition) — deterministic prefix truncation, unmarked; a conforming name is untouched (measured 2026-07-10: `grep -rn "this.name = " v3/src --include="*.ts"` non-test → literal sites: `TailUnknownInstanceError` 24, `DiagUnavailableError` 20, `TailIntegrityError` 18, `TraceMismatchError` 18 (testkit); plus ONE dynamic site, `cli/contract.ts` `this.name = name` — its live values are the same error-class names, ≤ 24; maximum 24 ≪ 64) | **NEW-DECISION (the STOP-2 hybrid verdict, 2026-07-10 — flag 4):** caps the per-event covert-channel bandwidth of the one stated free-text exception; residual stated — an identifier-shaped value of ≤64 code units still passes, and the dimension-9(d) boundary test keeps the channel visible |

**The eight-class fixture partition (derived FROM the J matrix — the
driving `it.each` set, carried verbatim; every body is R3-valid per
P2's canonical shape table and staged via the real sink):**

```text
1. {source:"kernel",  kind:"duplicate",        instanceId, opId, actorId, type, payloadDigest}
   → projection {kind, source, at, ordinal, payloadDigest}
2. {source:"kernel",  kind:"cas_restart",      instanceId, opId, actorId, type, payloadDigest}
   → same keyset class as 1 (kind value differs) — driven anyway (cheap it.each row)
3. {source:"kernel",  kind:"stale",            instanceId, opId, actorId, type, payloadDigest,
                                               expectedVersion, currentVersion}
   → versions EXCLUDED from the projection (J9 drive)
4. {source:"kernel",  kind:"rejected", reason:"unknown_instance", instanceId, opId, actorId, type}
   → reason present, payloadDigest ABSENT (J5 without J7)
5. {source:"kernel",  kind:"rejected", reason:"no_transition",    instanceId, opId, actorId, type,
                                               payloadDigest}
   → reason + payloadDigest both present
6. {source:"kernel",  kind:"internal_failure", instanceId, opId, actorId, type,
                                               error:{name, message}, payloadDigest}
   → errorName + payloadDigest CO-OCCUR (the digested handle-lane class); message excluded
7. {source:"kernel",  kind:"internal_failure", instanceId, error:{name, message}}
   → errorName only, minimal keyset (the start-side class)
8. {source:"ingress", kind:"rejected", reason:"invalid_shape", detail:"unknown_key",
                                               instanceId, opId, actorId, type}
   → detail + reason present, no digest — an ATTRIBUTED ingress body (best-effort
     attribution, non-empty strings; R3-valid per P2's "other detail" row). P2's third
     representative (detail:"not_plain_object") is UNUSABLE here BY RATIFIED RULE: it is
     unattributed (R3 forbids attribution on it; the emit gate drops an attributed variant),
     so it can never be returned by getDiagnostics(instanceId, ·) — stated so the swap is a
     decision, not an oversight.
```

## Canonical bundle schema matrix (supersedes ch6-P3's `rejectedInputs` row; every other level inherited unchanged)

| Id | Level | Keys |
|---|---|---|
| K1 | bundle | `formatVersion` (=1), `policy`, `instance`, `transcript`, `rejectedInputs` — exactly (unchanged from ch6-P3). `formatVersion` STAYS 1 across the section flip — a stated NO-CHANGE decision on the ch6-P3 anchor (hence anchored, not a new-decision row): the `absent` state was a forward-declared gap ("diagnostic channel lands ch 7"), the `status` discriminator is self-describing, and no consumer contract pinned `formatVersion=1 ⇒ absent` (measured: zero `rejectedInputs` references outside the two `debugBundle` files) |
| K2 | `rejectedInputs`, present | `status: "present"`, `rows` — exactly |
| K3 | `rejectedInputs`, unavailable | `status: "unavailable"`, `reason` — exactly; `reason` ∈ `DiagUnavailableReason` (the enumerated token, never underlying error text — anchored: plan §7.4 + the ch7-p2 surface row that names P3's serialization; held against lying carriers by S6's token validation) |
| K4 | `rejectedInputs.rows[i]` | exactly the J-matrix keyset per event class — closed at every level, checked under BOTH policies (the ch6-P3 dim-5 discipline) |

The ch6-P3 `{ status: "absent", reason }` state RETIRES in this packet
— the seam it stated as a gap RESOLVES here (plan §7.6; packets are
historical records: ch6-P3's matrix is superseded for this row, never
rewritten — flag 3).

## Interim wiring matrix (the P3→P4 gap)

| Id | Site | Contract |
|---|---|---|
| X1 | CLI bundle verbs (operator `bundle`; dev `bundle`) | pass `unavailableDiagnosticsReader` (new, `diag/index.ts`, beside `noopDiagnosticsSink`): both reads reject `DiagUnavailableError("open_failed")` — operator-visible interim: `rejectedInputs = { status: "unavailable", reason: "open_failed" }` until P4 wires the store on the derived config. **NEW-DECISION row (reclassified at panel round 1):** the UNAVAILABLE direction is anchored (§7.3 duality: an unwired channel is not known-empty; §7.7 gives P4 the config, so real wiring here would mint an ad-hoc config lane — the P2 flag-2 precedent), but the TOKEN pick is underdetermined by ratified text — P2's `open_failed` mapping binds its own store's open sequence, not a never-opened process state; the port doc's "I/O-shaped" is looser but does not decide. Three-way fork (open_failed / read_failed / a new token) closed by judgment, not anchor → new-decision; trips the Case-B semantic trigger → STOP `1:late-b-signal`. **RESOLVED — the user's STOP-1 verdict (2026-07-10): the mapping stands, approve-ratified (flag 1).** Driven at BOTH entrypoints (one pass-through lane each) |
| X2 | `createDebugBundleExporter(store, policy, diag)` | the reader param is REQUIRED — an optional dep would leave a silent path back toward an undeclared section state; explicit wiring forecloses it. STRUCTURAL row: compile-enforced — a two-arg call is a TYPE error; exercised by every driving test and the X1 CLI lanes, no separate lane. DERIVATION: the explicit-wiring culture (`KernelDeps.diag` REQUIRED, ch7-P1) (derived) |
| X3 | tail CLI | untouched — the plain tail verb keeps `createTail(store, wait)`; `tail --diag` is P4's row (anchored: plan §7.7), and P4 must DECIDE its CLI cursor surface for `fromOrdinal` (expose vs pin 0 — the flag-5(b) forward obligation, recorded live here) |

## Mirrored surface map (one canonical statement per rule)

Convention: acceptance-list and embedding-gates entries that restate a
rule (with or without row-id pointers) COUNT as mirrors and are
listed.

| Rule | Canonical | Mirrors |
|---|---|---|
| union row shape (exact variant keysets) | T1 | Claim sentence 1 ("discriminated two-lane union") · dimension 4 · acceptance list · plan §7.4 "rows become a discriminated union" (cross-artifact) |
| stop semantics (terminal + final drain of both lanes; ONE diag read) | T5 | Claim sentence 1 · dimension 5 · the in-context ONE-read note · the E-matrix header's stop-path site list · E4's drain-null variant cell · E6's stop-path variant cell · E9's drain-read variant cell · acceptance list · plan §7.4 stop clause (cross-artifact, summary) |
| committed-lane parity (proof reuse WITH parity) | dimension 1 | Claim sentence 1 · T7 · Sizing/risk stop-11 answer · the embedding-gates "exported ch6-P2 surfaces byte-untouched" line · acceptance list · plan §7.4 "the committed lane's no-skip/no-duplicate guarantee is UNCHANGED …" (cross-artifact) |
| engine order (fetches before yields; committed first) | T3 | dimension 6 · E2/E3 lane cells · the in-context buffering note |
| two cursors / NO cross-lane order / rows carry their own cursors | T4 | Claim sentence 1 · dimension 6 (the resumability corollary) · the in-context buffering note (resumable clause) · plan §7.4 two-cursors clause (cross-artifact) |
| loud-on-iteration / no synchronous throw / no catch anywhere | the E-matrix header rule | Claim sentence 1 (final sentence, defers) · E9's no-swallow cell |
| tail fail-loud vs bundle stated-gap (opposite by ratified design) | E5/E6 + S3–S6 (the rows themselves) | the in-context asymmetry note · E8's "unlike the bundle" clause · S9's "succeed-anyway scope" clause · plan §7.3 matrix rows 3–4 (cross-artifact) |
| attribution scope (attributed-only; unattributed = the global read's) | S8 | Claim sentences 1+2 (ATTRIBUTED mentions) · dimension 3 · the Sizing/risk join bullet · acceptance list · plan §7.4 attributed-only clause (cross-artifact) |
| unknown instance → null, reader never consulted | S7 | dimension 11 · acceptance list |
| projection field list (the ONLY-enumeration) | the J matrix | Claim sentence 2 · dimension 8 · K4 · the fixture-partition block (derived set) · acceptance list · plan §7.4 field list (cross-artifact) |
| free-text boundary (wide scope + row-level exclusions + the cap + token-only reason) | Claim sentence 3 (wide scope) + J6/J9/J10 (row-level structural) + K3 (the unavailable half) — a composite canonical set | dimension 9 · Claim sentence 2's "with an enumerated token" clause · S6's token-validation clause · acceptance list · plan §7.4 wide claim (cross-artifact; gains the prepared aligned sentence) — flag 4 is the decision RECORD, not a live mirror (the flags-ledger footnote) |
| three-state section (present/known-empty/unavailable) | the S matrix + K2/K3 | Claim sentence 2 · dimension 7 · acceptance list · plan §7.4 flip clause (cross-artifact) · ch6-P3 schema matrix (SUPERSEDED for this row — historical, not a live mirror) |
| interim CLI wiring | X1 | the embedding-gates CLI lines (the exact interim value) · dimension 14's pass-through clause · acceptance list · the `diag/index.ts` doc comment (code-side) — flag 1 is the decision RECORD, not a live mirror (the flags-ledger footnote below) |
| floor→diag boundary (name-match; no `diag/` value import; lint-mechanized) | S6's name-match clause (runtime rule) + the in-context note 2 (the lint-pattern spec) | E5's "matched by nothing" contrast · the embedding-gates eslint line · acceptance lint-probe line |
| local-surface complement (the FULL `error.message` stays readable on LOCAL surfaces; the tail carries the FULL event) | dimension 4 | Claim sentence 3's final sentence · T1's "FULL read-face event" clause · plan §7.4 local-surfaces clause (cross-artifact) |
| policy independence (RedactionPolicy governs transcript payloads ONLY) | dimension 10 | K4's "both policies" clause · S9's `includePayload` ruled-out clause · acceptance list |
| determinism (string-identical twins, healthy + unavailable) | dimension 12 | acceptance list |
| cursor-validator delegation (no new numeric validator; owners' suites carry the ladder) | dimension 13 | E1/E2 owner-validator cells · acceptance list |
| diag-lane delivery (attributed history + live, exactly-once, ordinal order, mid-cursor) | dimension 2 | Claim sentence 1's diag clause · acceptance list |
| zero-regression / untouched surfaces (kernel/ingress/store/ports/testkit; CLI contract matrices) | dimension 14 | the Sizing/risk surface-spread bullet · the embedding-gates "Untouched, explicitly" list · acceptance's dimension-14 bullet (the 323-baseline restatement) · acceptance's X1 no-matrix-change clause |
| required reader (no optional dep — the retired `absent` state cannot re-enter) | X2 (structural row: compile-enforced — the two-arg call is a TYPE error once the param is required; exercised by every driving test, no separate lane) | the embedding-gates `debugBundle.ts` entry ("the required reader param") |

The Pre-approval flags ledger is deliberately NOT in the live mirror
set (the P1/P2 precedent): entries are dated resolution/decision
snapshots; history is never rewritten when a canonical row changes.

## In-context notes (the scarce budget)

- The §7.3 availability matrix's two consumer rows point OPPOSITE
  directions BY RATIFIED DESIGN: the tail is fail-LOUD (the operator
  asked for a live diag stream; a silent half-stream would lie), the
  bundle is fail-open-to-stated-gap (the committed half is
  authoritative; the export must not die on the best-effort half). Do
  not "unify" them during build.
- `floor/` never value-imports `diag/`: `DiagUnavailableError` is
  matched by `error.name` (the P2 cross-module contract) in the
  bundle; the tail matches nothing at all. The interim reader's value
  import lives in the CLI — a composition root (the P1 import-boundary
  note). This build MECHANIZES the rule (rule → environment): one
  `@typescript-eslint/no-restricted-imports` pattern in
  `v3/eslint.config.mjs` (the TS variant — the base rule has no
  `allowTypeImports`; the drift-module entry is the in-file
  precedent) scoped to NON-TEST files under `src/floor/**` (the
  floor test files legitimately value-import `openDiagStore` — the
  ADR-005 `ignores` culture), added WITHOUT clobbering the existing
  floor-file entries (flat-config later-entry-overrides-per-rule-id
  semantics — the new entry must coexist with the testkit/drift
  bans). Per the config's own "negative-tested before it counts as
  realized" convention: the pattern lands with an EXECUTED negative
  probe (a scratch violation linted red, then removed — the ch6-P4a
  probe culture) that ALSO re-probes the existing floor testkit ban
  still firing.
- The diag tail buffers one round's TWO fetches before yielding (T3).
  Do not "optimize" into yield-as-you-fetch: fetch-failures firing
  before yields is what makes E1–E3/E5 deterministic and the stream
  losslessly resumable (T4).
- The final diag read after terminal is ONE read by design (T5): a
  stray submit against a DONE instance can mint diag events forever —
  a till-empty diag drain would unbound the tail. Post-close
  visibility is the query surface's job, driven by the recourse test.
- Reuse, not invention: `DiagnosticEvent` / `DiagnosticsReader` /
  `DiagUnavailableReason` are type-only imports from
  `ports/diagnostics.js`; no new port types; no testkit surface —
  tests compose `openDiagStore` + `createControlledClock` +
  `createScriptedTailWait` directly (the P2 precedent), and rejecting
  readers/stores are inline test fakes (the P1 per-call-fake
  precedent).

## Embedding gates (v1-inherited)

- Edited: `v3/src/floor/tail.ts` (additive: `DiagTailRow`, `DiagTail`,
  `createDiagTail` + the two-lane engine; exported ch6-P2 surfaces
  byte-untouched; header doc-comment refresh per T7),
  `v3/src/floor/debugBundle.ts` (three-state `RejectedInputsSection` +
  the required reader param + the J projection + `BundleDiagRow`;
  PLUS a comment-only refresh: the header's "single source for … the
  P4 JSON consumer" pointer goes stale under flag 3 — P4 reads THIS
  packet's K matrix),
  `v3/src/floor/debugBundle.test.ts` (the section pins update + the
  S/J/K and dims 9–12 lanes), `v3/src/floor/index.ts` (new exports),
  `v3/src/diag/index.ts` (`unavailableDiagnosticsReader` + the
  doc-comment refresh — the "until P4" forecast updates to name the
  read side too), `v3/src/cli/main.ts` (bundle verb passes the interim
  reader), `v3/src/cli/dev/main.ts` (same), `v3/src/cli/cli.test.ts` +
  `v3/src/cli/dev/dev.test.ts` (ONE pass-through lane each: the
  bundle verb's `rejectedInputs` = `unavailable(open_failed)` — X1
  driven at both entrypoints), `v3/eslint.config.mjs` (the floor→diag
  value-import ban pattern, per the in-context note's spec),
  `docs/v3/implementation/plan.md` (the flag-4 PREPARED aligned edit
  — its text lives in flag 4; plan §7.4 is deliberately untouched
  until it lands in the packet's ONE build commit).
- New: `v3/src/floor/diagTail.test.ts` (the T/E lanes).
- Untouched, explicitly: `kernel/`, `ingress/`, `store/`, `ports/`
  (all consumed types exist — verified against the live tree),
  `testkit/`, the CLI exit/parse/config contract surfaces.
- Call-site sweep (the measurement, per the sweep-claim rule):
  `grep -rn "createDebugBundleExporter\|createTail" v3/src
  --include="*.ts"` (2026-07-10) → production call sites are exactly
  `cli/main.ts` (tail verb :137, bundle verb :165) and
  `cli/dev/main.ts` (bundle :47); test files: `floor/tail.test.ts`,
  `floor/debugBundle.test.ts`. No CLI test pins the old section shape
  (`grep -n "rejectedInputs" v3/src/cli` → zero hits; independently
  re-verified by two panel lenses).
- Type-ripple targets: NONE beyond the listed files — the
  `createTail` signature is unchanged (T7); the exporter signature
  change ripples exactly to the two CLI verbs + its own test file
  (the sweep above is the evidence; a panel lens independently
  confirmed no file outside the boundary references
  `RejectedInputsSection`/`DebugBundle`).

```json
{
  "mutation_boundary": {
    "files": [
      "v3/src/floor/tail.ts",
      "v3/src/floor/diagTail.test.ts",
      "v3/src/floor/debugBundle.ts",
      "v3/src/floor/debugBundle.test.ts",
      "v3/src/floor/index.ts",
      "v3/src/diag/index.ts",
      "v3/src/cli/main.ts",
      "v3/src/cli/dev/main.ts",
      "v3/src/cli/cli.test.ts",
      "v3/src/cli/dev/dev.test.ts",
      "v3/eslint.config.mjs",
      "docs/v3/implementation/plan.md"
    ]
  }
}
```

## Row manifest (the D1 classification's machine face)

```json
{
  "packet_rows": {
    "rows": [
      { "id": "T1", "class": "derived", "refs": ["prose:plan §7.4 (discriminated union)", "prose:plan §7.5 (lane discriminator)"] },
      { "id": "T2", "class": "derived", "refs": ["prose:plan §7.4 (extended, not rewritten)", "prose:packet ch6-p2 (factory shape precedent)"] },
      { "id": "T3", "class": "derived", "refs": ["prose:packet ch6-p2 (fail-closed before any wait)", "prose:plan §7.4"] },
      { "id": "T4", "class": "anchored", "refs": ["prose:plan §7.4 (two cursors, no cross-lane order)"] },
      { "id": "T5", "class": "derived", "refs": ["prose:plan §7.4 (stop semantics + rationale)"] },
      { "id": "T6", "class": "anchored", "refs": ["prose:packet ch6-p2 (engine invariant)"] },
      { "id": "T7", "class": "derived", "refs": ["prose:plan §7.4 (the seed extended)"] },
      { "id": "E1", "class": "anchored", "refs": ["prose:packet ch6-p2 (tail error contract)", "prose:plan §6.2 (cursor domain)"] },
      { "id": "E2", "class": "derived", "refs": ["prose:packet ch7-p2 (cursor-domain surface row)", "prose:packet ch6-p2 (tail error contract)"] },
      { "id": "E3", "class": "anchored", "refs": ["prose:packet ch6-p2 (tail error contract)"] },
      { "id": "E4", "class": "anchored", "refs": ["prose:packet ch6-p2 (tail error contract)"] },
      { "id": "E5", "class": "derived", "refs": ["prose:plan §7.3 (availability matrix, tail row)", "prose:packet ch7-p2 ((name, reason) contract)"] },
      { "id": "E6", "class": "derived", "refs": ["prose:plan §7.3 (availability matrix, tail row)", "prose:packet ch6-p2 (wait-rejection termination shape)"] },
      { "id": "E7", "class": "anchored", "refs": ["prose:packet ch6-p2 (tail error contract)"] },
      { "id": "E8", "class": "derived", "refs": ["prose:packet ch6-p2 (propagate-as-is culture)"] },
      { "id": "E9", "class": "derived", "refs": ["prose:packet ch7-p1 (awaited-port-call inventory rule)"] },
      { "id": "S1", "class": "anchored", "refs": ["prose:plan §7.4 (bundle flip)"] },
      { "id": "S2", "class": "anchored", "refs": ["prose:plan §7.4 (known-empty clause)"] },
      { "id": "S3", "class": "anchored", "refs": ["prose:plan §7.3 (availability matrix, bundle row)", "ADR-010"] },
      { "id": "S4", "class": "anchored", "refs": ["prose:plan §7.3 (availability matrix, bundle row)", "ADR-010"] },
      { "id": "S5", "class": "anchored", "refs": ["prose:plan §7.3 (availability matrix, bundle row)"] },
      { "id": "S6", "class": "derived", "refs": ["prose:plan §7.3 (the bundle itself SUCCEEDS)", "prose:packet ch7-p1 (contract-violating-fake culture)"] },
      { "id": "S7", "class": "anchored", "refs": ["prose:packet ch6-p3 (unknown instance null lane)", "prose:packet ch7-p2 (no instance-existence authority)"] },
      { "id": "S8", "class": "anchored", "refs": ["prose:plan §7.4 (attributed-only; global read territory)"] },
      { "id": "S9", "class": "derived", "refs": ["prose:plan §7.3 (the committed half is authoritative)"] },
      { "id": "J1", "class": "anchored", "refs": ["prose:plan §7.4 (projection field list)"] },
      { "id": "J2", "class": "anchored", "refs": ["prose:plan §7.4 (projection field list)"] },
      { "id": "J3", "class": "anchored", "refs": ["prose:plan §7.4 (projection field list)"] },
      { "id": "J4", "class": "anchored", "refs": ["prose:plan §7.4 (projection field list)"] },
      { "id": "J5", "class": "anchored", "refs": ["prose:plan §7.4 (projection field list)"] },
      { "id": "J6", "class": "derived", "refs": ["prose:plan §7.4 (error.name, not the error object)"] },
      { "id": "J7", "class": "anchored", "refs": ["prose:plan §7.4 (the fingerprint)"] },
      { "id": "J8", "class": "anchored", "refs": ["prose:plan §7.4 (the enumerated ingress detail)"] },
      { "id": "J9", "class": "anchored", "refs": ["prose:plan §7.4 (the ONLY-enumeration + the wide free-text claim)"] },
      { "id": "J10", "class": "new-decision", "refs": [] },
      { "id": "K1", "class": "anchored", "refs": ["prose:packet ch6-p3 (canonical bundle schema matrix)"] },
      { "id": "K2", "class": "anchored", "refs": ["prose:plan §7.4 (three-state flip)"] },
      { "id": "K3", "class": "anchored", "refs": ["prose:plan §7.4 (enumerated constant)", "prose:packet ch7-p2 (DiagUnavailableReason surface row)"] },
      { "id": "K4", "class": "anchored", "refs": ["prose:packet ch6-p3 (closed schema at every level)"] },
      { "id": "X1", "class": "new-decision", "refs": [] },
      { "id": "X2", "class": "derived", "refs": ["prose:packet ch7-p1 (KernelDeps.diag REQUIRED — explicit wiring)"] },
      { "id": "X3", "class": "anchored", "refs": ["prose:plan §7.7 (P4 packet row)"] }
    ]
  }
}
```

## Pre-approval flags

1. **STOP `1:late-b-signal` — X1 is a NEW-DECISION row on an
   availability-class surface (the Case-B semantic trigger).** The
   interim CLI reader maps the unwired state to
   `unavailable("open_failed")`: between the P3 and P4 commits the
   operator/dev bundle verbs show
   `rejectedInputs = { status: "unavailable", reason: "open_failed" }`.
   The UNAVAILABLE direction is anchored (an unwired channel is not
   known-empty — the §7.3 duality; real wiring would mint the P4
   config lane early — the P2 flag-2 precedent; keeping `absent`
   would contradict the three-state flip, which IS this packet's plan
   content). The TOKEN pick is the decision: P2's `open_failed` was
   ratified for its own store's open sequence, not for a
   never-opened process state; `read_failed` fits no better; a new
   `not_wired` token would be a NEW availability token (heavier
   Case-B material). Panel round 1 reclassified the row new-decision
   (the entailment attack: the fork is closed by judgment, not
   anchor). **Resolution options for the human:** (a) ratify the
   `open_failed` mapping at this pilot's approve — the approve act IS
   the ratification (recommended: one-packet lifetime, zero
   downstream branching, P4 retires it); (b) route to a DraftContract
   round (the by-the-letter Case-B route — the row set is the seed);
   (c) pick a different interim design (`present([])` via a real
   `:memory:` store was considered and rejected: it asserts
   known-empty for a channel that is OFF — dishonest under the
   §7.3 duality). **RESOLVED — the user's STOP-1 verdict
   (2026-07-10): option (a)** — the `open_failed` mapping stands; the
   pilot's approve act ratifies it. Route: approve-ratified.
2. **The bundle's succeed-anyway direction extends past the typed
   contract (S6):** any diag-side failure — non-typed rejection,
   lied-reason name-match, or a projection break on malformed
   resolved rows — degrades to `unavailable("read_failed")` instead
   of failing the export, and a name-matched carrier's `reason` is
   token-VALIDATED before serialization (K3 holds against lying
   carriers). The tail deliberately does NOT get the same treatment
   (E8 — loud is its contract). Route: fold-now — folded into
   S6/E8/dimension 7; the approve ratifies the direction.
3. **ch6-P3's "single source" bundle schema matrix is superseded for
   the `rejectedInputs` row by this packet's K matrix.** Packets are
   historical records (the P2 flag-2 culture): ch6-P3 is not edited;
   P4's JSON consumer reads THIS packet's K matrix for the section.
   Route: fold-now — stated here; no edit to ch6-P3.
4. **STOP `2:contested-ratified-vs-reality` — `errorName` is
   runtime-error-sourced text inside the default bundle while the
   wide claim says none appears ANYWHERE.** Plan §7.4 both enumerates
   `error.name` into the projection AND states the wide no-free-text
   claim; reality: `error.name` is an unconstrained string an
   adversarial thrower controls (P1 copies `{name, message}`
   verbatim; P2's R3 gate checks only that it is a string). The two
   ratified sentences tension against each other. Options weighed:
   (a) carve the exception out explicitly with a driven boundary;
   (b) full identifier-shape egress validation (rejected: new
   behavior the plan never asked for, and still not airtight — an
   identifier-shaped value passes any shape gate).
   **RESOLVED — the user's STOP-2 verdict (2026-07-10): (a) PLUS a
   64-character prefix cap (the hybrid):** Claim 3 names `errorName`
   the ONE stated, plan-enumerated exception (untrusted in
   principle, identifier by convention); J10 caps the projected
   value at `error.name`'s first 64 characters (behavior-invisible
   on conforming names; caps the per-event bandwidth of the residual
   channel — the honest residual is stated in J10); dimension 9(d)
   drives BOTH the boundary (a marker planted in the NAME appears
   ONLY at `errorName` positions and nowhere else) and the cap. The
   cap is a NEW-DECISION row (J10), ratified by this pilot's approve
   together with X1.
   **Prepared aligned edit (marked "aligned at ch7-P3 pre-approval",
   same commit):** plan §7.4's wide-claim sentence gains: *"— with
   one enumerated exception: `error.name` rides as the projection's
   `errorName` scalar, verbatim up to a 64-character (UTF-16
   code-unit) prefix cap, an
   untrusted-in-principle identifier-by-convention (aligned at ch7-P3
   pre-approval; the marker-scan negative binds every OTHER position
   of the serialization, and the hostile-name lane pins the boundary
   and the cap)."* Route: approve-ratified (the STOP-2 verdict is
   recorded above; the approve act formalizes it).
5. **P4 forward obligations (recorded here because §7.5 does not
   name them; P4's authoring inherits this packet as precedent):**
   (a) the plan-literal recourse test names the DUMP face — §7.4: "a
   post-close rejected submit is visible in the dump", and the dump
   verb is P4's; P3 drives the same rule at `getDiagnostics`
   (dimension 5(b)), so P4 must carry the DUMP-face variant of the
   lane; (b) `tailWithDiagnostics` forces a `fromOrdinal` argument
   at the library seam while §7.5 names no cursor flag for
   `tail --diag` — P4 must DECIDE the CLI cursor surface
   (expose a from-ordinal flag vs pin 0) as a recorded decision, not
   an ambient default. Route: fold-now — (a) recorded live in
   dimension 5(b), (b) recorded live in X3's cell; this flag is the
   joint decision record.

## Acceptance

- Dimensions 1–14 test-driven; every declared lane driven by name:
  - **T/E (in `floor/diagTail.test.ts`):** the ch6-P2 parity
    schedules through `tailWithDiagnostics` (history replay; live
    no-skip on the scripted wait; no-duplicate; mid-tail terminal;
    already-terminal zero-wait; the drain-status race — fake-seam
    schedule, the ch6-P2 4c precedent); the dimension-3
    both-lanes-react schedule (REAL kernel mid-tail rejected/stale
    submit → diag-lane event, ZERO committed-lane rows); diag history
    + live delivery + `fromOrdinal` mid-cursor (direct-`sink.emit`
    staging); attribution scope both sides (S8's tail half); union
    keysets per variant (T1); the stop set — final-drain window
    pickup, the post-close recourse test at the library seam
    (rejected submit against DONE → in `getDiagnostics`, not in the
    stream), scripted-wait call-count pin, T5's one-read drain;
    E1–E9 each (E1/E2 one invalid representative per cursor — the
    full ladder is the owners' suites, dimension 13; E3 including
    the PRECEDENCE combination lane (unknown id + unavailable diag
    in the same first round → `TailUnknownInstanceError` wins); E4
    including the stop-path drain-null variant (terminal observed →
    drain read null → `TailIntegrityError`, never silent done); E5
    with a real unavailable diag store; E6 BOTH variants —
    mid-stream (closed handle mid-tail) AND the stop-path final read
    (scripted reader rejecting exactly there → loud on the last
    `next()`, never a silent completion); E8 with a non-typed
    rejecting fake at the round phase AND at the stop-path final
    read (the name-filtering-catch falsifier — closes the last
    site × shape cell); E9 with rejecting store fakes on both committed
    reads PLUS the stop-path drain-read variant (a scripted fake
    rejecting the first post-terminal `getTimeline` → loud on that
    `next()`, never a silent completion — the E6-symmetric phase
    lane)); the dimension-6
    resume lane (mid-stream diag failure in a round with fresh
    commits → that round's committed rows NOT yielded; a new tail
    from the last yielded cursors delivers everything exactly once).
  - **S/J/K + dims 9–12 (in `floor/debugBundle.test.ts`):** S1–S2
    both ways; S3–S5 through REAL diag-store states (garbage-bytes
    file; raw-SQL refused-marker fixture; closed handle / raw-SQL
    corrupt row — the P2 fixture culture) with the committed half
    asserted byte-identical to the healthy twin; S6 all three members
    (member (i) BOTH shapes: a non-typed REJECTING fake AND a
    synchronously-THROWING fake — the sync throw is the one lane that
    falsifies a mis-scoped catch around only the awaited promise;
    lied-reason name-matched fake — non-token `reason` →
    `read_failed`, the free text never serialized;
    malformed-resolved-rows fake — `internal_failure`
    without `error` → `unavailable("read_failed")`, never a thrown
    export); S7 with a CALL-RECORDING rejecting reader + unknown id
    → clean `null` AND zero reader invocations asserted;
    S8's bundle half (foreign-instance + unattributed rows staged in
    the real diag store → excluded from `rejectedInputs.rows`); S9
    rejecting `getInstanceDetail` fake → loud failure, never
    `unavailable`; the J-matrix eight-class fixture partition as an
    `it.each` (exact projection keyset per class), J9 exclusions
    asserted key-by-key; the K schema walk under BOTH policies; the
    dimension-9 marker scan — (a) payload markers, (b) hostile
    `error.message` through the real sink, (c) the unavailable lane's
    hostile message via the SYNTHETIC name-matched carrier (a real
    store state's message is the fixed token-derived default —
    dimension 9's stated staging channel) WITH the loud fixture
    self-check, (d) the
    hostile-NAME lane (marker only at `errorName` positions) PLUS the
    J10 cap lane (a 65+-character name projects as exactly its first
    64 characters; a conforming short name untouched) — over the full
    serialization; determinism twins (healthy + unavailable).
  - **X1 (one lane per CLI entrypoint):** operator `bundle` and dev
    `bundle` emit `rejectedInputs = unavailable(open_failed)` on the
    interim reader (pass-through content only — no exit/parse matrix
    change).
  Estimated ~55 new tests (at `it.each` granularity — vitest counts
  each fixture row individually; the named-lane enumeration recounts
  to ~50–60).
- Dimension 14: the FULL existing suite green (323 baseline,
  verified in-session 2026-07-10 and independently by two panel
  lenses); all v3 bridges green (`v3:typecheck`, `v3:lint` — the new
  floor→diag import-ban pattern included AND negative-probed per the
  in-context spec (a scratch violation linted red, the existing
  floor testkit ban re-probed — executed, not assumed), `v3:test`,
  `v3:coverage` validation with the empty slice, `v3:adr-check` —
  11 ADRs, unchanged), `v3:packet-lint` green on this packet (the
  first live v2 form).
- No ADR trigger fires: no new substrate/tooling/contract-class
  decision — stop semantics and the free-text boundary are
  plan-ratified (§7.4); the interim wiring and the errorName cap are
  flagged packet decisions (STOP-1/STOP-2 verdicts recorded in flags
  1 and 4, ratified at the approve), not architecture decisions;
  the eslint pattern extends the existing ADR-005/ADR-007 lint
  culture without a new decision class.
- Substrate probes: NONE new — every diag-store failure state this
  packet stages is a P2-probed/driven lane (garbage bytes, refused
  marker, closed handle, raw-SQL corrupt row); P3 adds no premise
  resting on unprobed driver/OS behavior.
- Standing review rules in force: **REV-C-PROJECTIONS-READONLY**
  (both consumers read-only; the diag channel never stands in for a
  decision record — the bundle's committed half never sources from
  the diag file); **REV-DIAG-FAILOPEN** — n/a-by-design on the write
  side (this packet adds NO sink implementation and touches no emit
  call site; the interim READER is read-side), stated, not silently
  skipped; **REV-B** (cursors are stream positions, never authority);
  **REV-E** (the reader arrives as an injected port — no adapter
  branching); **REV-A1-TXN** — n/a (no writes);
  **REV-BUNDLE-DEFAULT-POLICY** (the normal CLI graph still binds
  `redactPayloadsPolicy` — untouched here, re-verified at the P4
  review).

## Build record

Approved 2026-07-10 — the user's explicit approve on the round-5 clean
bytes (sha256
`fd6fee2af8e3546620ef34193539cb2544381ff503d4e6db9012061cb60a2d80`; the
STOP-4 flagged-approve act ratified flags 1–5, the X1/J10 new-decision
rows included). Built the same day in a FRESH session — the packet's
self-containment was the pilot's own test, and it held: no session
memory was needed beyond the repo surfaces. 323 → 380 tests (+57; the
~55 estimate held at `it.each` granularity): the T/E lanes in
`floor/diagTail.test.ts` (27 — the ch6-P2 parity schedules re-driven
through `tailWithDiagnostics`, diag-lane delivery incl. the mid-cursor
lane, both-sides attribution + the both-lanes-react probe, union
keysets, the stop set with the one-read-drain pin and the recourse
test, E1–E9 with every stop-path variant, the resume lane); the S/J/K +
dims 9–12 lanes in `floor/debugBundle.test.ts` (the eight-class
`it.each` partition with key-by-key J9 exclusions, the four-leg marker
scan incl. the hostile-name boundary and the J10 cap, real-store S3–S5
states per the P2 fixture culture, the full S6 member list with the
sync-throw falsifier, the call-recording S7 fake, byte-identical
committed-half twins, both-policy K walks, determinism twins healthy +
unavailable); one X1 pass-through lane per CLI entrypoint.

Two mechanical in-build rounds, ZERO behavioral surprises (typecheck
green on the first full run; the engine shape fell out of T3/T5
directly): (1) the resume-lane test's own staging schedule was wrong —
CONVERGED from `implement` is not a fixture-template transition — a
test-script bug caught by its own red, no production change; (2)
`no-useless-assignment` on the stop-path's dead ordinal-cursor advance
after the final read — removed with the T4 rationale stated in place
(rows carry their own cursors).

Executed probes, per the in-context spec and the ch6-P4a probe culture:
the floor→diag value-import scratch violation linted RED with the new
pattern's message; a diag TYPE import stayed GREEN (`allowTypeImports`);
the existing floor testkit ban re-probed RED (distinct rule ids coexist
— no clobbering); the X2 two-arg exporter call typechecked RED
(TS2554). All bridges green: `v3:typecheck`, `v3:lint`, `v3:test` (380),
`v3:coverage` validation (ownership axes unchanged — units 5/158,
invariants 8/116, traces 2/20: the empty slice held), `v3:packet-lint`
(the first live v2 packet), `v3:adr-check` (11 ADRs — no trigger fired,
per the acceptance's no-ADR statement). Node v26.3.0.

One process observation (friction-logged, routed boundary-review): the
approve record's "one commit (… + the packet-work log lines)"
choreography collides with the post-build audit's boundary contract
(changed files ⊆ `mutation_boundary` ∪ packet; `process-log.md` is not
in the boundary) — the log lines land in their own docs(v3) commits
around the build commit instead.

**Aftermath (2026-07-10, the user's post-build review — fixed same
day):** the floor→diag lint ban proved LESS than its claim — the
import rules (base + TS variant) check import DECLARATIONS only, so a
dynamic `await import("../diag/index.js")` VALUE import in a floor
file stayed lint-green, bypassing the mechanized guardrail (the
user's stdin probe; reproduced in-repo before fixing). Fix: a
`no-restricted-syntax` ban in the SAME floor-scope block — selector
`ImportExpression[source.value=/\u002Fdiag\u002F/]` (the escaped
`/diag/` path SEGMENT, so `ports/diagnostics.js` never matches). Probe trio EXECUTED: the dynamic scratch violation
RED under the new selector; the static ban re-probed RED; the
type-position form fires NEITHER boundary rule (probe-verified —
`consistent-type-imports` separately disallows the `typeof import()`
annotation form; `import type … from "../diag/…"` remains the legal
type route). No production change: no dynamic import existed — the
hole was the GUARDRAIL's, not the boundary's (the runtime claim
held). Lesson (process-logged): the probe set derived from the
implemented rule FORM (static import declaration), not from the
claim's dimensions (import FORMS: static / dynamic / re-export) —
the ch-4 claim-negatives class recurring at the lint layer. The same
static-only limitation holds for the config's OTHER import bans
(testkit/drift, kernel allowlist) — routed boundary-review, never
silently swept here.

```json
{
  "packet_metrics": {
    "class": "operability",
    "prediction": {
      "predicted": "projection",
      "reasoning": "pre-registered at the Phase-1 flip (2026-07-09), before authoring: the P1/P2 packet contracts + plan §7.4 were expected to determine every row",
      "discovered": "projection"
    },
    "provenance": { "anchored": 26, "derived": 14, "new_decision": 2 },
    "rounds": { "review": 5, "doc_refinement": 0, "implementation": 2 },
    "stops": [
      {
        "type": "1:late-b-signal",
        "what": "X1 (the interim CLI reader's unavailable-token pick) reclassified derived -> new-decision by the round-1 lens-2 entailment attack — the three-way token fork closes by judgment, not anchor",
        "resolution": "the user's STOP-1 verdict (2026-07-10): option (a) — the open_failed mapping stands; ratified by the pilot's approve (flag 1)"
      },
      {
        "type": "2:contested-ratified-vs-reality",
        "what": "plan section 7.4 both enumerates error.name into the projection AND states the wide no-free-text claim; an adversarial thrower controls error.name, so the two ratified sentences contradict in conjunction",
        "resolution": "the user's STOP-2 hybrid verdict (2026-07-10): stated exception PLUS a 64-code-unit prefix cap (J10, the second new-decision row); ratified by the pilot's approve (flag 4) with the prepared aligned plan edit landing in the build commit"
      }
    ],
    "detector_misses": [
      {
        "found_at": "code-review",
        "what": "the floor->diag lint ban covered only STATIC import declarations — a dynamic await import('../diag/index.js') value import in a floor file stayed lint-green, bypassing the mechanized guardrail (no production violation existed; the hole was the guardrail's)",
        "why_missed": "the executed negative probes were derived from the implemented rule FORM (a static import declaration), not from the claim's dimensions (import FORMS: static / dynamic / re-export) — the ch-4 claim-negatives class recurring at the lint layer"
      }
    ],
    "learned": "review-ahead-of-build held at the first v2 packet (zero behavioral surprises); both post-close finds were meta — commit choreography vs the audit boundary, and a lint guardrail probed on its rule form instead of its claim",
    "baseline_note": "The FIRST v2-form packet (the ch7 pilot, human-approved). rounds.review = 5 FULL five-lens panel rounds to the clean round (one fresh-eyes propagation pass not counted; the panel-sustainability re-run scoping was ratified mid-pilot from this packet's cost profile). prediction.discovered = projection per the D7 enum; the header carries the honest nuance — projection WITH two flagged new-decision rows (X1, J10), exactly the mismatch the pilot exists to measure. rounds.implementation = 2: the build round (two mechanical in-build fixes) + the same-day aftermath round (the dynamic-import lint hole, detector_misses[0])."
  }
}
```
