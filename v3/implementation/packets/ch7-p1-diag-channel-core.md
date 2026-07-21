# Task Packet: ch7-P1 — the diagnostic channel core (types, sink port, emission matrix)

Plan step: plan.md §7.2. Autonomy stage: calibration — **pre-approve**
(first-of-a-kind: the diagnostic seam; the first live `CreateTaskPacket`
skill run — the skill-run verdict feeds the ch-7 boundary review).

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

Operability packet (§7.6): the channel is memo-born (PI-4 / Addendum 2
B1), not model pseudocode. Coverage axes unchanged — an assertion the
close verifies, not an omission.

## Claim + dimensions (enumerated BEFORE deriving)

**Claim (wide):** every ingress/kernel call that does NOT return
successfully — a non-committed `Outcome` or a throw, INCLUDING a
post-commit/post-create throw — emits exactly ONE classified
diagnostic event to the injected sink (plus one `cas_restart` per
internal restart); a call returning a committed `Outcome` or a
`Started` emits NO outcome-classified event — the call's TOTAL is zero
events only when no CAS restart occurred; and wiring the channel changes NO `Outcome`,
no transcript row, and no committed read surface — the channel is
observation only, and the fail-open obligation lives on the
`DiagnosticsSink` PORT, never at call sites.

1. **Emission matrix** — every declared lane driven, BOTH success
   negatives included (no outcome-classified event on a committed
   return — total zero only on a restart-free call; zero events on a
   successful `startInstance`), the digest-throw wrapper lane driven
   via a contract-violating fake, and EVERY port-call sublane driven
   or explicitly ruled out.
2. **Event classification** — exact optional-field presence per kind
   (keyset-tested per lane: a `stale` event carries versions, an
   `internal_failure` carries `error`, nothing carries extras);
   `payloadDigest` presence is DIGEST-POINT-derived per lane
   (pre-digest absent / post-digest present incl. absent payload —
   round-14: this axis is distinct from the state phase), driven both
   ways.
3. **Ingress detail tokens** — all six driven; attribution both ways
   (`not_plain_object` → NO attribution fields; later gates → valid
   string fields carried best-effort).
4. **Rethrow transparency** — `internal_failure` lanes rethrow the
   SAME error instance, message unchanged; no outcome lane changes
   shape.
5. **Zero-semantics regression** — the full existing suite (219 tests:
   l0a/l0b golden traces, kernel/ingress/floor/CLI) stays green with
   only mechanical wiring edits.
6. **Count discipline** — a committed/`Started` return emits NO
   outcome-classified event (total zero ONLY when no CAS restart
   occurred — a committed-after-restart call emits exactly its N
   `cas_restart` events and nothing else, driven); exactly ONE
   classified event for a non-committed final outcome OR a throw
   (never per `handleOnce` attempt); exactly N `cas_restart` events
   for N restarts.
7. **Numeric domains** — NO new numeric-domain validator is introduced
   (stale-event versions pass through already-admitted values); the
   R-NUMERIC-LADDER obligation is n/a in P1, stated here so its absence
   is a decision, not an oversight.

## Canonical type matrix (this packet IS the shape's source — memo-born)

| Type | Fields |
|---|---|
| `DiagnosticKind` | `"rejected" \| "stale" \| "duplicate" \| "cas_restart" \| "internal_failure"` |
| `DiagnosticEventBody` | `source: "ingress" \| "kernel"`; `kind: DiagnosticKind`; `instanceId?`; `opId?`; `actorId?`; `type?`; `reason?: RejectionName` (iff kind=`rejected`); `detail?: IngressDetailToken` (iff source=`ingress`); `expectedVersion?`/`currentVersion?: number` (iff kind=`stale`); `payloadDigest?: string` (kernel-source only; presence is DIGEST-POINT-based — never payload-key-based, and distinct from the STATE phase (round-14): present on every POST-digest lane — even when the payload is ABSENT, the ch-5 digest is type-inclusive with arity encoding (ADR-008, `[TAG, type]`) — absent on pre-digest lanes and the digest-throw lane; the emit path NEVER invokes `DigestSource` or any port itself (round-6 finding: a re-call would make the diag emit fallible on the digest-throw lane); the ONLY payload derivative on events); `error?: { name: string; message: string }` (iff kind=`internal_failure`; `message` is UNTRUSTED free text — a thrown error may embed payload/env/path fragments — confined to the diag channel's store and local reads; the marker-scan negative binds the default-BUNDLE path in P3, not the raw event) |
| `DiagnosticEvent` | `DiagnosticEventBody & { at: EpochMillis; ordinal: number }` — the read face; populated by P2's store, declared here so consumers share one shape |
| `DiagnosticsSink` | `{ emit(body: DiagnosticEventBody): void }` — **contract ON the port: never THROWS; implementations swallow their OWN failures; an emit never changes an `Outcome` and never touches the main commit path. Non-blocking is NOT claimed** (refine finding 1: the SQLite path is a sync driver — an inline write may briefly occupy the caller; a queue/async-drain contract would be a new contract class, P2's own call). **Call sites call it BARE** (a defensive wrapper would blur the owner — `REV-DIAG-FAILOPEN` born here) |
| `IngressDetailToken` | `"not_plain_object" \| "unknown_key" \| "invalid_required_string" \| "invalid_expected_version" \| "invalid_event_id" \| "payload_not_canonicalizable"` — one token per admission gate block in `parseEnvelope` |

Reuse, not invention: `reason` is the existing `RejectionName` (drift
suite covers the names); `payloadDigest` is the existing digest string;
`at` is `EpochMillis`.

## Canonical emission matrix (every lane a named test obligation)

| Lane | Emit |
|---|---|
| `handle` → committed | **no outcome-classified event** — the separation negative (prior `cas_restart` events from the SAME call are their own lane; total zero only on a restart-free call) |
| `handle` → duplicate | `{source:"kernel", kind:"duplicate", instanceId, opId, actorId, type, payloadDigest}` — post-digest lane: the digest is UNCONDITIONALLY present (absent payload included, ADR-008 arity) |
| `handle` → stale | as above with `kind:"stale"`, + `expectedVersion` (envelope) + `currentVersion` (outcome) — post-digest: `payloadDigest` present |
| `handle` → rejected (`unknown_instance`, `missing_version`, `no_transition`, `op_id_collision`) | `kind:"rejected"` + `reason` (exact `RejectionName`); `payloadDigest` by DIGEST POINT: `unknown_instance` is pre-digest → ABSENT; the other three are post-digest → PRESENT (absent payload included) |
| `handle` → CAS restart | `kind:"cas_restart"` + full envelope attribution + `payloadDigest` (keyset canonical in the lane-inventory table; round-12: attribution is uniform wherever an envelope exists) — one per restart, then the final outcome's own lane |
| `handle` → any never-committed throw — port-call sublanes listed per the inventory rule (round-6: "store-port rejection" was itself still collapsed): `store.loadInstance` rejection (pre-digest — event lacks `payloadDigest`), `definitions.load` rejection, pinned-template integrity throw, `store.findOp` rejection, `store.commitTransition` rejection (the txn did not land — still never-committed) — EACH driven with a per-call rejecting fake | exact keysets by DIGEST POINT (round-10; axis named at round-14 — the envelope is typed and IN HAND on every `handle` lane, only the digest is digest-point-gated): pre-digest members (`loadInstance` / `definitions.load` / pinned-template) = `{source:"kernel", kind:"internal_failure", instanceId, opId, actorId, type, error}`; post-digest members (`findOp` / `commitTransition`) = same + `payloadDigest` → **rethrow unchanged** |
| BOTH entry points → **post-success `deriveDispatchIntent` throw** (`handle` post-commit, `startInstance` post-create — the shared derive site has two integrity throws: missing step definition, unbound role) | **rethrow unchanged**; the transition/instance is ALREADY PERSISTED when the call fails; driven with a corrupted-template fake at EACH entry point (template well-formedness is ch-8 debt — "cannot occur" is unavailable). Exact keyset PER entry point (round-4 finding — the lane must not lose attribution): via `handle` = `{source:"kernel", kind:"internal_failure", instanceId, opId, actorId, type, payloadDigest, error}` (envelope attribution; `payloadDigest` PRESENT — this lane is post-digest, the value was computed pre-throw, absent payload included); via `startInstance` = `{source:"kernel", kind:"internal_failure", instanceId, error}` (`instanceId` from input; NO envelope and NO digest exist at the birth seam — no opId/actorId/type/payloadDigest) |
| `handle` → digest throw | `{source:"kernel", kind:"internal_failure", instanceId, opId, actorId, type, error}` — envelope attribution, NO `payloadDigest` (the digest is what threw) → **rethrow unchanged** — driven with a contract-violating throwing `DigestSource` fake (refine finding 2: unreachable via ingress — the ch-4 admission pin stands; the lane proves the WRAPPER at a second throw site, not reachability) |
| `startInstance` → started | **nothing** — the birth-side separation negative (refine finding 3: the channel must not become a birth/audit substitute; same reason `handle` → committed carries one) |
| `startInstance` → any PRE/AT-create throw — code-path inventory (transitive, port boundaries included; a LIST, not a count — counts drift): `definitions.load` REJECTION (port failure ≠ the null lane), unknown template (`definitions.load` → null), binding coverage, `store.createInstance` REJECTION (port failure — the colliding minted id integrity throw is its known in-repo instance, both driven) (the post-create derive throw is the shared row above) | `kind:"internal_failure"` + `error{name,message}` + `instanceId` (from input) → **rethrow unchanged** |
| ingress → `invalid_shape` | `{source:"ingress", kind:"rejected", reason:"invalid_shape", detail: <token>}` + best-effort attribution; NO fingerprint (no digest authority in ingress — kept dep-minimal) |
| runner/adapter lanes | named absent → ch 9 |

## Field provenance / lane inventory (CANONICAL for event shapes)

Per lane MEMBER: source site(s) · STATE phase (pre-state | pre-commit
| post-commit | post-create — the never-committed vs persisted axis,
P1's core distinction) · DIGEST point (pre-digest | post-digest | n/a
— the axis that gates `payloadDigest`; round-14: the two axes were
mixed in one column) · exact keyset · per-derived-field provenance ·
driving test. **Keysets list
event-specific keys; `source` and `kind` are structural — fixed by
lane, present on every event** (round-13). **Provenance defaults**
(rows state only deviations and row-specific fields): attribution
fields → the typed envelope (`handle`) / valid raw string fields
(ingress) / `StartInstanceInput` (`startInstance`); `payloadDigest` →
the attempt-computed value, threaded; `reason` → the outcome's
`RejectionName` (static `"invalid_shape"` on the ingress lane);
`error` → the caught error's `name`+`message`; `detail` → the failed
admission gate's token; `expectedVersion` → envelope field;
`currentVersion` → the outcome's value. Every value is IN HAND at the
emit point — the emit path performs no fallible work (the type-matrix
observer rule; this table defers to it).

| Lane member | Source site(s) | State phase | Digest point | Keyset | Field provenance | Test |
|---|---|---|---|---|---|---|
| `handle` duplicate | **TWO origins, both driven** (round-12): `findOp` fast-path · `commitTransition` `duplicate_op` result | pre-commit (no new row lands) | post-digest | `{instanceId, opId, actorId, type, payloadDigest}` | attribution: always → typed envelope; `payloadDigest`: post-digest → attempt-computed, threaded | keyset test at EACH origin |
| `handle` rejected `op_id_collision` | **TWO origins, both driven**: `findOp` digest mismatch · `commitTransition` `op_id_collision` result | pre-commit | post-digest | duplicate keyset + `reason` | + `reason`: rejected kind → the outcome's `RejectionName` | keyset test at EACH origin |
| `handle` rejected `missing_version` / `no_transition` | `handleOnce` guard checks | pre-commit | post-digest | duplicate keyset + `reason` | as above | per-reason keyset tests |
| `handle` stale | `handleOnce` version compare | pre-commit | post-digest | `{instanceId, opId, actorId, type, payloadDigest, expectedVersion, currentVersion}` (explicit — no back-reference, round-12) | `expectedVersion`: stale → envelope field; `currentVersion`: stale → the outcome's value | stale keyset test |
| `handle` rejected `unknown_instance` | `loadInstance` null return | pre-commit | pre-digest | `{instanceId, opId, actorId, type, reason}` — no digest | attribution: always → typed envelope | no-digest keyset test |
| `handle` CAS restart | `commitTransition` `cas_conflict` result | pre-commit (the conflicting attempt landed nothing) | post-digest | `{instanceId, opId, actorId, type, payloadDigest}` — FULL envelope attribution (round-12 reversal: attribution is uniform wherever an envelope exists) | fields → envelope + threaded digest | restart count + keyset test |
| `handle` pre-digest throws | per sublane: `loadInstance` / `definitions.load` / pinned-template check + `digest` call | pre-commit | pre-digest (incl. the digest call itself) | `{instanceId, opId, actorId, type, error}` | attribution: always → typed envelope; `error`: internal_failure → caught error's `name`+`message` | per-sublane rejecting/throwing fakes |
| `handle` post-digest port throws | `findOp` / `commitTransition` rejections | pre-commit (the txn did not land) | post-digest | previous row + `payloadDigest` | as above; `payloadDigest`: post-digest → threaded | per-sublane rejecting fakes |
| `handle` post-commit derive throw | `deriveDispatchIntent` | **post-commit — the transition IS persisted** (round-14 split: this is P1's never-committed vs persisted core distinction, no longer blurred in a mixed cell) | post-digest | previous row (attribution + `error` + `payloadDigest`) | as above | corrupted-template fake + persisted-row assert |
| `startInstance` pre/at-create throws | `definitions.load` (rejection + null) · `resolveBinding` · `createInstance` | pre-state (no instance exists yet) | n/a (no envelope) | `{instanceId, error}` | `instanceId`: always → `StartInstanceInput`; NO envelope/digest exists at the birth seam | per-class fakes |
| `startInstance` post-create derive throw | `deriveDispatchIntent` | **post-create — the instance IS persisted** (round-14 split) | n/a (no envelope) | `{instanceId, error}` | as above | corrupted-template fake + persisted-instance assert |
| ingress `invalid_shape` | `parseEnvelope` admission gates | pre-state | n/a (nothing admitted) | `{reason, detail[, instanceId, opId, actorId, type]}` | `detail`: always → the failed admission gate's token; attribution: PER-FIELD → valid non-empty string fields of the raw record (`not_plain_object` → no attribution fields) | six token tests + two attribution lanes |

## Mirrored surface map (the v1 Contract-Dense gate discipline)

One canonical statement per rule; every other mention summarizes or
defers. A change to a canonical row updates EVERY mirror below before
handing back.

| Rule | Canonical | Mirrors |
|---|---|---|
| Event shapes + field provenance (per lane) | the **lane-inventory table** above | the emission-matrix rows' inline keyset texts (historical, round-pinned) · type-matrix per-field condition notes · acceptance test list · plan §7.2 event-fields clause |
| `payloadDigest` presence (digest-point-based) | type-matrix `payloadDigest` entry | lane-inventory table Digest-point column · duplicate/stale/rejected/`cas_restart` row keysets · post-success derive row keysets · never-committed throw row keysets · in-context digest-threading note · dimension 2 clause · acceptance test list · plan §7.2 payload-boundary clause |
| Count discipline (zero / one / N) | dimension 6 | Claim sentence · dimension 1 · committed-row qualifier · `cas_restart` row ("one per restart") · in-context outer-loop note · acceptance test list · plan §7.2 committed row + wide-claim sentence |
| Sink fail-open contract | type-matrix `DiagnosticsSink` row | Claim ("obligation lives on the PORT") · plan §7.2 sink bullet · acceptance REV-DIAG-FAILOPEN line |
| Free-text boundary (`error.message`) | type-matrix `error` entry | plan §7.4 free-text boundary (via §7.2 clause) |
| Emission lane set | the emission matrix above | dimension 1 · acceptance test list · plan §7.2 matrix (summary mirror — the aligned blocks) |
| `IngressDetailToken` list | type-matrix `IngressDetailToken` row | dimension 3 · acceptance ingress-token clause · plan §7.2 detail-token clause |
| Rethrow transparency (same instance, unchanged) | dimension 4 | emission-matrix throw rows ("rethrow unchanged") · in-context wrapper note · plan §7.2 matrix throw rows |

The **Pre-approval flags ledger is deliberately NOT in the live mirror
set**: its entries are dated per-round resolution snapshots — history
is never rewritten when a canonical row changes (their consistency
with the canonicals as of this revision was verified by the fresh-eyes
pass; a FUTURE canonical change owes the ledger nothing).

## In-context notes (the scarce budget)

- Emission lives in `handle()`'s OUTER loop, never in `handleOnce` —
  that is what makes dimension 6 (count discipline) hold: restart →
  emit `cas_restart` + continue; a non-committed/throw final lane →
  one classified emit; the committed final lane emits no
  outcome-classified event (dimension 6 is the canonical statement —
  this note mirrors it).
- The try/catch for `internal_failure` wraps the whole `handle()` body
  (loop included) and `startInstance`'s delegation; it emits and
  rethrows the SAME instance — it must not normalize, wrap, or rename
  the error (the CLI's error mapping relies on names).
- `payloadDigest` on events is the value ALREADY computed inside the
  handling attempt, THREADED to the emit — never recomputed there:
  the emit path performs NO fallible dependency calls (a `digest`
  re-call at emit would blow up exactly on the digest-throw lane —
  round-6 finding). Presence is DIGEST-POINT-based, never
  payload-key-based (round-7; axis named at round-14): pre-digest
  lanes (`unknown_instance`, `loadInstance` /
  `definitions.load` / pinned-template throws) and the digest-throw
  lane emit WITHOUT it; every post-digest lane emits WITH it,
  ABSENT-payload envelopes included — the ch-5 digest is
  type-inclusive with arity encoding (ADR-008), so the value always
  exists once the digest point is passed. Embedding note, NOT a P1
  contract (round-9 prose-contract scan): `handleOnce` already
  computes the digest per attempt (ch4-P3 shape) — P1 threads that
  value and does not restructure the compute; no call-count or
  recompute obligation is claimed (the digest is deterministic, so a
  cache would be observationally identical — deliberately not a lane).
- `parseEnvelope` refactors internally to a discriminated result
  (envelope | `{detail, attribution}`); `submit`'s public `Outcome` is
  byte-identical to today.
- The post-success derive throw is the one lane where a diag event
  coexists with a PERSISTED transition/instance — the committed row
  EXISTS in the transcript while the call surface only sees the
  throw; the wrapper must NOT special-case it (emit + rethrow, same
  as every throw), and the test asserts both: the emit AND the
  persisted row.
- The production no-op sink (`noopDiagnosticsSink`) lives in `diag/`
  (the ch-2 reserved module — its first content); the CLI wires it
  until P2 swaps in the store-backed sink. `ports/` stays type-only
  (ADR-007 import-type discipline); `testkit/diagnostics.ts` records
  bodies verbatim (stamping is P2's store obligation, CHK-C-TS-SOURCE
  lane).
- Import boundaries: kernel/ingress import the TYPE from `ports/`;
  only composition roots (CLI, tests) import `diag/`.

## Embedding gates (v1-inherited)

- New files: `v3/src/ports/diagnostics.ts` (types + port),
  `v3/src/testkit/diagnostics.ts` (recording sink),
  `v3/src/kernel/diagEmission.test.ts` (matrix lanes D1/D2/D4/D6).
- Content lands in: `v3/src/diag/index.ts` (placeholder →
  `noopDiagnosticsSink`).
- Edited: `v3/src/kernel/kernel.ts` (`KernelDeps.diag` REQUIRED +
  emission wrapper), `v3/src/ingress/ingress.ts`
  (`createIngress({kernel, diag})` + detail tokens),
  `v3/src/ports/index.ts`, `v3/src/testkit/index.ts`.
- Mechanical ripple (signature only, verified against the live tree):
  `l0aTrace.test.ts`, `l0bTrace.test.ts`, `emitLoop.test.ts`,
  `twoWorker.test.ts`, `ingress/ingress.test.ts` (+ detail-token
  tests), `kernel/kernel.test.ts`, `kernel/start.test.ts`,
  `floor/floor.test.ts`, `floor/debugBundle.test.ts`,
  `floor/tail.test.ts`, `cli/main.ts` (2 sites), `cli/dev/main.ts`
  (2 sites). The trace harness receives wired seams — code untouched,
  but its doc comment (`createIngress(kernel).submit`,
  `testkit/traceHarness.ts`) goes stale with the signature change:
  comment-only ripple target (round-12).
- Mutation boundary: exactly those + this packet file +
  `docs/v3/implementation/plan.md` (the "aligned at ch7-P1
  pre-approval" edits — same-commit per the standing convention; no
  count stated, counts drift).

## Pre-approval flags (raised at authoring; resolved at the refine round)

1. **Ingress events carry no fingerprint** — a narrowing of §7.2's
   "fingerprint ONLY when canonicalizable" (necessary-not-sufficient
   reading; ingress keeps zero digest deps). RESOLVED: lifted into the
   plan as an aligned sentence (refine finding 4).
2. **The digest-throw lane** was initially declared "cannot occur, no
   dedicated test lane". RESOLVED: the lane is DRIVEN with a throwing
   `DigestSource` fake — R-MATRIX-LANES holds with zero exemptions; the
   ch-4 admission pin remains the reachability proof (refine finding 2).
3. **The `startInstance → any throw` row collapsed three code-anchored
   throw classes into two driven examples** — `start.ts` has a third,
   distinct site (`definitions.load` → null). RESOLVED: all three
   classes named and driven (crossover round, free-arm finding).
4. **"Raw payload NEVER enters an event" was too strong** —
   `error.message` is verbatim free text and may embed payload/env/path
   fragments. RESOLVED: the claim is precise now — no structured/raw
   payload FIELD on events; `payloadDigest` the only payload
   derivative; `error.message` untrusted free text confined to the
   diag channel; the marker-scan negative binds the default-bundle
   path (P3), not the raw event (crossover round, workflow-arm
   `plan_contract_challenge`).
5. **The throw inventory was STILL example-shaped after one inventory
   round** — both review arms independently found the shared
   post-success `deriveDispatchIntent` throw site (two integrity
   throws; called post-commit by `handle`, post-create by
   `startInstance`), which made "ALL THREE" false on the start side.
   RESOLVED: dedicated shared matrix row, driven with
   corrupted-template fakes at both entry points; the claim and the
   count-discipline dimension reworded to success-return form (a
   post-commit throw emits; committed/`Started` returns emit nothing).
6. **The round-3 fold itself skipped the write-back re-run** — the new
   shared row landed without the packet's own dimension-2 keyset
   discipline (attribution could silently vanish on the most
   interesting lane). RESOLVED: exact per-entrypoint keysets in the
   row (envelope attribution via `handle`; input `instanceId` only via
   `startInstance` — no envelope exists at the birth seam), asserted
   by the driving tests (round-4 finding).
7. **Round 5, two resolutions:** (a) the round-3 "ZERO events" reword
   itself over-claimed — a committed-after-restart call totals N
   `cas_restart` events; the claim/dimension/matrix now say "no
   outcome-classified event; total zero only restart-free", with the
   combination lane driven; (b) the throw inventory deepened a THIRD
   level: an awaited PORT call (`definitions.load`) is a throw source
   with no visible `throw` site — the rejection lane is distinct from
   the null lane and driven at BOTH entry points with a rejecting
   `DefinitionStore` fake.
8. **Round 6, three resolutions:** (a) the emit path must not perform
   fallible work — `payloadDigest` is THREADED from the attempt, never
   recomputed at emit (a digest re-call would fail exactly on the
   digest-throw lane); `unknown_instance` and pre-digest throws lack
   it, driven; (b) "store-port rejection" was itself still a collapsed
   lane — the per-call sublanes (`loadInstance` / `findOp` /
   `commitTransition`; `createInstance` on the start side) are listed
   and EACH driven with a per-call rejecting fake — the round-5 fix
   had been applied only to the flagged member, not re-derived over
   the whole inventory; (c) the CAS qualifier propagated to every
   canonical spot (packet dimension 1, plan committed row).
9. **Round 7 (both arms converged): the presence rule changed in
   round 6 but two keysets still stated the OLD payload-key-based
   condition** ("iff the envelope carries a payload") — false on
   post-digest lanes: the ch-5 digest is type-inclusive with arity
   encoding (ADR-008, verified at `emit/opId.ts`), so the digest
   EXISTS for absent payload. RESOLVED: presence is PHASE-based
   everywhere — pre-digest lanes and digest-throw: absent; every
   post-digest lane: present unconditionally (duplicate / stale /
   post-digest rejected / `cas_restart` — which gained the field —
   / post-success derive throw / post-digest store rejections);
   the rule-change-sweep lesson: a changed rule sweeps every row
   stating the old one.
10. **Round 9 (the skill's own new rules, applied reflexively):** the
   packet gained its Mirrored Surface Map (it is contract-dense — the
   drift class behind most earlier rounds), and the "per-restart
   recompute / do not cache" note was DE-CLAIMED to an embedding note:
   the digest is deterministic, a cache would be observationally
   identical, so it is deliberately not a lane and carries no test
   obligation.
11. **Round 10 (map completeness + keyset explicitness):** the handle
   internal-failure sublanes got exact phase-split keysets (envelope
   attribution is ALWAYS in hand on `handle` lanes — generic
   "attribution" could have let a build drop it); the digest-throw
   keyset made explicit (attribution, no digest); the map gained its
   two missing rows (`IngressDetailToken` list; rethrow transparency).
   No skill change — the first round where the gates were already
   right and only their application converged.
12. **Round 11 (field-provenance inventory):** the lane-inventory
   table added as the CANONICAL home for per-lane event shapes and
   per-field provenance (condition → value source); the
   emission-matrix rows' inline keysets became its named mirrors —
   one authority for shapes, one for lane behavior. The `cas_restart`
   minimal keyset (no actorId/type) recorded as a DECLARED choice
   (kernel-log event, not an outcome record).
13. **Round 12 (per-member granularity + a reversal):** (a) the
   inventory gained a `source_site` column with per-member splits —
   duplicate and `op_id_collision` each have TWO code origins
   (`findOp` fast-path · `commitTransition` result), both driven, so
   no build can silently serve only one; (b) the stale keyset made
   explicit (the back-reference to a row with optional `reason` was
   ambiguous); (c) the round-11 `cas_restart` minimal-keyset choice
   REVERSED: full envelope attribution — uniform rule, no plan
   carve-out needed (the plan's "opId/actorId/type when parseable"
   sentence now holds without exception); (d) the trace-harness
   comment (`createIngress(kernel).submit`) added as a comment-only
   ripple target.
14. **Round 13 (inventory cell completeness):** table-level provenance
   DEFAULTS added (attribution / payloadDigest / reason / error /
   detail / version fields — rows state only deviations), closing the
   per-field gaps (`reason` on `unknown_instance` and ingress, `error`
   on start throws, `payloadDigest` on stale); the header now states
   that keysets list event-specific keys with `source`/`kind`
   structural per lane; the stale "Per lane group" intro fixed to
   per-member; the plan §7.2 event-fields clause added to the
   event-shape mirror row.
15. **Round 14 (axis separation):** the inventory's single Phase
   column had CONFLATED two axes — the STATE phase (never-committed
   vs persisted, P1's core distinction) and the DIGEST point (what
   gates `payloadDigest`). Split into two columns; the two mixed rows
   split (post-digest port throws vs post-commit derive; pre/at-create
   vs post-create derive); every live "phase-based" presence mention
   renamed to digest-point-based (rule-change sweep; the flags ledger
   stays historical).
16. **Round 15 (the cross-artifact half of round 14):** the plan §7.2
   payload-boundary clause — a LIVE mirror per the map — had kept
   "PHASE-based": the round-14 sweep and its fresh-eyes run were
   FILE-scoped while the rule's mirror list spans artifacts. RESOLVED:
   the plan clause renamed digest-point-based with the
   distinct-from-state-phase note (same aligned block); both artifacts
   grep-swept clean. Lesson: a rule-change sweep's scope IS the mirror
   map's list, never a file.

## Acceptance

- Dimensions 1–6 test-driven: the emission suite (BOTH success
  negatives, per-lane keysets, restart counts via a scripted-CAS-conflict
  store fake, the throwing-`DigestSource` wrapper lane, EVERY
  port-call sublane per entry point via per-call rejecting fakes
  (driven or explicitly ruled out — none left collapsed), BOTH code
  origins of duplicate AND `op_id_collision` (`findOp` fast-path ·
  `commitTransition` result — round-12), the no-digest attribution
  lanes (`unknown_instance`, pre-digest throws),
  committed-after-restart = N `cas_restart` + zero outcome-classified,
  the post-success derive throw at BOTH entry points via
  corrupted-template fakes — asserting the emit, its EXACT
  per-entrypoint keyset, AND the persisted row, rethrow identity) +
  the six ingress detail tokens + the two attribution lanes.
  Estimated ~32 new tests.
- Dimension 5: the FULL existing suite green (the zero-semantics
  guard); all v3 bridges + coverage green (empty slice).
- `REV-DIAG-FAILOPEN` recorded as a standing review rule (plan §7.2);
  call sites reviewed bare (no wrapper) — review surface, not lint.
- REV-E untouched (no adapter branching anywhere in the diff).

## Build record

Built 2026-07-08, after 15 pre-approval refine rounds — the first live
`CreateTaskPacket` skill run. 219 → 255 tests (+36: the emission suite
with BOTH duplicate/collision origins, per-sublane rejecting/throwing
fakes, both success negatives, exact per-lane keysets and the two
persisted-row asserts; the six ingress detail tokens + attribution
lanes; recording-sink pins). Zero implementation surprises: typecheck
AND the full suite were green on the FIRST run after the 13-call-site
ripple — the 15-round contract surface left nothing to discover at
build time, which is the strongest evidence yet for the
review-ahead-of-build economics. Two mechanical lint rounds
(unnecessary type assertions in test fakes; an `import()`-type
annotation). Emission placement exactly per the in-context notes:
outer-loop emits, ctx-threaded digest, bare `diag.emit` call sites
(REV-DIAG-FAILOPEN eyeballed across the diff), rethrow-identity
asserted with `rejects.toBe` on the SAME error instances.

**Aftermath (2026-07-08, post-build review — fixed same day, 257
tests):** the threading context was CALL-scoped while the digest-point
contract is ATTEMPT-scoped — after a CAS restart, a pre-digest failure
(unknown_instance, `loadInstance` rejection, digest-throw) inherited
the PRIOR attempt's `payloadDigest`. The suite had driven
restart→commit and first-attempt pre-digest lanes separately, never
their COMBINATION across the restart boundary. Fix: `ctx` resets per
attempt (the catch reads the current attempt's context); two
regression lanes driven RED-first (restart→unknown_instance,
restart→pre-digest throw — both assert NO digest). Lesson: when a
contract's unit is "per attempt", every mechanism THREADING data
across attempts is a lane-combination surface — drive the product,
not just the factors.
