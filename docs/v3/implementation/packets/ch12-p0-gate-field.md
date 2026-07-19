# Task Packet: ch12-p0-gate-field — the gate-field watchpoint realization

Plan step: plan.md §12.4 ch12-P0 row (realizes §12.1 item 4 — the
ratified model fix `6dd8bd15` in code). Draft anchors: NONE — this
packet anchors no `contract:ch12-runtime-core#Cn` row (the plan's P0
prediction, unconditional since the 2026-07-19 draft ratification);
it follows the ratification in order per the README §4 draft-first
rule.
Autonomy stage: measurement — inherited from the chapter header
(plan §12). Not first-of-a-kind: the kernel-alignment class (an
additive realization delta on built, packet-owned units) has
precedent — ch11-P2c aligned `l2-pseudocode/HANDLE`'s round
consumption; ch11-P0 synced the model registries.
Classification: **projection** — manifest tally: 5 anchored /
3 derived / 0 new-decision (machine-counted from the `packet_rows`
block). Every row anchors to the ratified model state at `6dd8bd15`
(unit emission lines, the l2 Rejected entity, the l2/l2a trace rows)
or to ratified plan text, or derives from those with an in-row note.

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

The EMPTY slice is a declaration, not an omission: no unit changes
owner and no coverage axis moves. `l2-pseudocode/HANDLE` (ch11-P2b)
and `l2a-pseudocode/HANDLE` (ch11-P3b) stay owned-and-realized —
this packet ALIGNS their realizations to the model at `6dd8bd15`
(the fix is registry-neutral: ledger.md byte-identical, 54
rejections / 116 invariants unchanged; no rejection name joins or
moves). The l3 / l5 / emit-contract HANDLE versions carry the same
fixed line in their unit files and stay `pending` in the unit map —
their realization arrives with their owning chapters. The l2/l2a
golden traces are ch11-owned; this packet EDITS their outcome
expectations under the sanctioned expectation-alignment class (the
ch11-P2c precedent), never re-owns them.

## Operative material (full text — projection, not invention)

The single semantic source is the ratified model at `6dd8bd15`. The
l2 HANDLE gate-loop segment, verbatim (`model-src/units/l2-pseudocode/HANDLE.txt`):

```text
  FOR gate IN template.gates_for(instance.current_step, envelope.type):   # ordered, authored; empty for ungated transitions
    registration ← gateRegistry.resolve(gate.uses)
    IF registration is none                  THEN RETURN Rejected(gate_evaluator_unavailable)    # runtime availability backstop — admission resolved the name at load; this lane guards registry drift
    IF registration.implementation = process THEN RETURN Rejected(gate_execution_not_supported)  # process contract is L2a — even an inline process gate
    IF registration.execution ≠ inline       THEN RETURN Rejected(gate_execution_not_supported)  # deferred ⇒ a later lifecycle slice (gate_pending + GATE_RESULT)
    decision ← registration.evaluate(gate.effective_config, gate_projection(instance, template, envelope))
    IF decision.verdict = block       THEN RETURN Rejected(gate_blocked(decision.reason), gate: gate.uses, decision.evidence_refs)  # no commit ⇒ round not burned; refs + blocking gate surfaced
    gate_decisions.append(decision)                                                       # allow or warn ⇒ retained (verdict + evidence_refs + diagnostics)
```

The l2a HANDLE block line, verbatim (`model-src/units/l2a-pseudocode/HANDLE.txt` —
the same emission inside the process-capable loop):

```text
    IF decision.verdict = block     THEN RETURN Rejected(gate_blocked(decision.reason), gate: gate.uses, decision.evidence_refs)   # no commit ⇒ round not burned; refs + blocking gate surfaced
```

The l2 Rejected entity (core model, 08-l2 — the field's meaning):

> `Rejected(gate_blocked(reason))` — a policy returned `block` for
> this state — carries the blocking binding's `uses` as `gate`
> beside the decision's `reason` / `evidence_refs`, so a multi-gate
> pipeline names WHICH gate blocked (the retained side's `uses`
> provenance, mirrored on the reject side).

The trace rows as executable expectations (the committed-row
sequences are unchanged — a block commits nothing; the OUTCOME
expectations move):

- l2 trace row 2 (round 1 threshold block; fixture op-2, read as
  `outcomes[2]`):
  `Rejected(gate_blocked(round_below_min), gate: declarative.threshold)`
- l2a trace row 2 (test failure; the fixture interposes an ungated
  op-2 commit, so this is fixture op-3, read as `outcomes[3]`):
  `Rejected(gate_blocked(reason=test_failed), gate: external.process)`
- l2a trace row 3 (runner error; fixture op-4, read as `outcomes[4]`):
  `Rejected(gate_blocked(reason=runner_error), gate: external.process)`

## Claim

Every gate-blocked rejection NAMES the gate that blocked it: the
`gate_blocked` Outcome carries the blocking binding's `uses` as a
REQUIRED `gate` field, verbatim, on the kernel return and on every
downstream surface that renders that outcome document (the operator
CLI `submit` stdout document, driven; the dev CLI `inject` and
`replay` documents, the identical pass-through — scoped in G6) —
while every other rejection reason
carries no gate payload (type-expressed) and the diagnostic channel's
rejected event keyset stays exactly as built.

Dimensions (enumerated before test rows — R-DIMENSIONS):

1. **Presence** — the field exists on every `gate_blocked` outcome,
   from every producing branch (inline declarative, packaged,
   process exit-bucket, process JSON verdict, process
   runner_error/timeout, the fail-closed CLI runner's
   classification) — and at the TYPE level the arm REQUIRES it: a
   gate-less `gate_blocked` literal is a compile error (G8's
   requiredness probe).
2. **Value** — equals the blocking binding's `uses` VERBATIM (no
   normalization, no truncation, no default token).
3. **Selection** — under a multi-gate pipeline, the FIRST blocking
   binding's `uses` (first-block-wins interplay): never the
   pipeline's first binding per se, never a later one.
4. **Co-presence** — `gate` rides BESIDE the O1 iff-halves;
   `gateReason` / `evidenceRefs` presence rules are UNCHANGED.
5. **Exclusion** — non-gate rejection reasons forbid `gate` at the
   type level; the diag rejected event does NOT gain the field.
6. **Surface reach** — kernel Outcome → ingress pass-through → the
   outcome-document renderers: the operator CLI `submit` stdout
   document (driven end-to-end) and the dev CLI's `inject` and
   `replay` documents (the identical pass-through — named and
   scoped in G6).

## Canonical contract matrix

| ID | Rule |
|---|---|
| G1 | The `Outcome` gate_blocked arm gains REQUIRED `readonly gate: string` — the blocking binding's `uses`. The O1 iff-halves are untouched: `gateReason?` present iff the decision carried `reason`; `evidenceRefs?` present iff carried (empty list rides verbatim). The model emission is unconditional (`gate: gate.uses` — the loop variable always has `uses`), so the field is required, never optional (anchored: prose:l2-pseudocode/HANDLE @ 6dd8bd15, prose:core-model 08-l2 Rejected(gate_blocked) entity @ 6dd8bd15) |
| G2 | The kernel's single gate_blocked construction site (the block-return in the gate loop, `kernel/kernel.ts`) adds `gate: binding.uses` — both evaluator branches (process and declarative/packaged) flow through this one return, so one edit covers every producing branch (anchored: prose:l2-pseudocode/HANDLE + prose:l2a-pseudocode/HANDLE emission lines @ 6dd8bd15) |
| G3 | Selection: the field names THE binding whose decision blocked — the model's emission sits INSIDE the loop iteration of the blocking gate, under first-block-wins (later gates not evaluated). Driven by combination lanes: `[allow, block]` → `gate` = the SECOND binding's `uses`; `[block, x]` → the FIRST's (anchored: prose:l2-pseudocode/HANDLE @ 6dd8bd15 — the emission line's loop position + the first-block-wins comment) |
| G4 | Value semantics: `uses` passes through VERBATIM. Free-text classification (template §2): the value is sanitized-by-contract — a registry id the ch11 admission resolved at definition load; an unresolvable `uses` rejects EARLIER as `gate_evaluator_unavailable`, so an unadmitted id never reaches the block site. DERIVATION: verbatim pass-through is the emission line's letter; the sanitized classification follows from the admission contract's load-time resolution + the K2 runtime backstop ordering in the same loop (derived: prose:l2-pseudocode/HANDLE @ 6dd8bd15, prose:ch11-P2a admission — uses resolved at load) |
| G5 | The golden-trace outcome expectations realize the model trace rows: the l2 blocked outcome (model row 2 = fixture op-2, `outcomes[2]`) equals `{ kind: "rejected", reason: "gate_blocked", gateReason: "round_below_min", gate: "declarative.threshold" }`; the two l2a blocked outcomes (model rows 2/3 = fixture ops 3/4, `outcomes[3]`/`outcomes[4]` — keyed by `test_failed` / `runner_error`) carry `gate: "external.process"` beside their existing reason/refs fields (anchored: prose:core-model 08-l2 trace row + 09-l2a trace rows @ 6dd8bd15) |
| G6 | The CLI rejection detail: the `submit` verb's stdout outcome document carries `gate` — the thin client serializes the kernel outcome verbatim (`JSON.stringify(outcome)`, zero semantics), so NO CLI code changes; the journey's blocked-document equality is the end-to-end drive. Renderer inventory (SCOPED — measured from the tree): THREE outcome-document renderer sites exist — (1) the operator `submit` stdout (DRIVEN, above); (2) the dev CLI `inject` verb (`cli/dev/main.ts` `verbInject` — `ingress.submit` → `JSON.stringify(outcome)`, the identical direct pass-through); (3) the dev CLI `replay` verb (`verbReplay` — `JSON.stringify(result)` where the `ReplayResult.outcomes` array embeds the per-step `Outcome | Started` values). The two dev sites are named for inventory completeness and explicitly NOT separate driven lanes — no gated dev fixture exists in the tree (the broad sweep finds zero `gate_blocked` under `cli/dev/`, covering both verbs), so there is nothing to update, and the dev entrypoint sits behind the ADR-009 boundary; the field's presence there is proven by the shared serialization + the type, not by dev-verb tests (anchored: prose:plan §12.1 item 4 + §12.4 P0 row; the pass-through mechanism: cli/main.ts submit, built ch6-P4a; the dev renderers: cli/dev/main.ts, built ch6-P4b) |
| G7 | Diag confinement: the kernel's rejected diag event keyset is UNCHANGED — `gate` does NOT join it. The built exact-keyset lane (kernel.test.ts, gate rung dimension 10: the eight-key rejected event) is the standing guard and is NOT edited by this packet. DERIVATION: the ratified fix enumerates its whole surface — the five HANDLE emission lines, the l2 entity, the l2/l2a trace rows; the diag emission line is not among them, and extending diag would oblige MORE than the anchors force (the ch11-P2b O1 lesson) (derived: prose:6dd8bd15 touched-surface enumeration, prose:ch11-P2b dimension-10 rejected-event contract) |
| G8 | Type-ripple closure, FOUR type directions driven: (a) EXCLUSION — non-gate rejection reasons forbid `gate` at the type level (the O1 type-expressed exclusion extended to a third field — a third `@ts-expect-error` probe joins the existing two); (b) REQUIREDNESS — a `gate_blocked` literal WITHOUT `gate` is a compile error, driven by a fourth `@ts-expect-error` probe staging the gate-less literal; the directive is SELF-VERIFYING: were the arm weakened to `gate?: string`, the probe's error disappears and tsc reds on the unused directive — the runtime equality lanes cannot catch this mutant (every kernel-produced outcome carries the field); (c) VALUE TYPE — the field's declared type is EXACTLY `string`, driven by a positive compile-time assignability probe (`const v: string = <narrowed gate_blocked outcome>.gate;`) that reds if the field widens to `unknown` or admits `undefined` — mutants both probes in (a)/(b) and every runtime equality would pass; (d) IMMUTABILITY — the field is `readonly` (the arm's uniform convention), driven by a fifth `@ts-expect-error` probe staging an assignment to the narrowed field (TS2540); self-verifying the same way: a mutable slip leaves the directive unused, tsc red. No other Outcome consumer changes shape — `outcomeExitCode` switches on `kind` only, the trace harness `ExpectedOutcome` carries `reason` only (both stay), and the kernel construction-site sweep finds ONE production `gate_blocked` literal (kernel.ts) — receipt in Embedding gates. DERIVATION: entailed by G1's arm shape (`readonly gate: string`, required) + the O1 "the type forbids what the row forbids" discipline, all four directions (derived: prose:ch11-P2b O1, prose:l2-pseudocode/HANDLE @ 6dd8bd15) |

Mirrored surfaces (stated once, mirrors named): G1's arm shape is
canonical HERE; its mirrors are the `outcome.ts` doc comment (updated
in this build, present-tense) and the model's l2 entity (upstream
authority, never edited from code). G6's pass-through is canonical
HERE; its comment mirror is the `ingress/ingress.ts` module doc's
Outcome sentence ("byte-identical to ch-4"), which the build updates
to the anchor-free form — ingress returns the kernel Outcome
verbatim, no reshaping (the ch-4 anchor goes stale the moment the
arm gains a field). G7's confinement is canonical HERE; its mirror
is the dimension-10 test's comment. Every other row has no mirror.

## In-context notes (the scarce budget)

- The `outcome.ts` doc comment extends its O1 note with the `gate`
  field in the same voice: required on the gate_blocked arm, the
  blocking binding's `uses`, iff-halves unchanged.
- The ratified ch11-gate-format row C33 quotes the PRE-fix emission
  form (`Rejected(gate_blocked(reason), evidence_refs)`,
  "model-verbatim (the l2a HANDLE)"). Assessed at authoring: no
  reopen — the quote is an ILLUSTRATION deferring to the model unit
  as its authority, and the added field is additive to C33's
  normative content (evidence propagation, untouched). The ch11
  draft's 2026-07-19 re-ratification (post-fix) re-bound the
  registry bytes with a reopen scoped to C18/C19/C21/C30 — C33's
  citation was carried forward unchanged, not re-examined; the
  refresh of the stale illustration quote is therefore routed
  boundary-review (a process-log line; revisit = the chapter DoD's
  log review), never a reopen and never a packet edit.
- The site × shape × phase coverage grid: N/A — no new failure lane
  over a phased seam joins (one field is added to an EXISTING
  rejection lane; the gate rung's grid is ch11-P2b's, unchanged).

## Embedding gates

- Target files: the mutation boundary below, nothing else.
- Entrypoints: unchanged — no new entrypoint; the shipped `submit`
  surface carries the field by pass-through (G6).
- Mutation boundary: the two production files + the ingress module's
  comment mirror (a doc-comment sync only — no ingress code moves) +
  the four test files whose full-document gate_blocked asserts move +
  this packet.
- Construction-site sweep receipt (G8; authoring-time, re-run at
  build — TWO commands, each untruncated, no head-cut): the broad
  sweep `grep -rn 'gate_blocked' v3/src --include='*.ts'` — 35 hits,
  covering every mention including the domain/drift surfaces
  (`rejections.ts` name list, `domainRegistry.ts` entity row —
  neither constructs an Outcome); the narrow constructor sweep
  `grep -rn 'reason: "gate_blocked"' v3/src --include='*.ts'` —
  23 hits: ONE production literal (`kernel/kernel.ts`, the block
  return), the `outcome.ts` arm (the type itself), and test
  expectations for the remainder.
- Full-document assert inventory (authoring-time receipt; the
  build-time membership owner is the re-run sweep): kernel.test.ts —
  dim 2 `[block, recorder]`, dim 3 block-before-commit, dim 9's four
  value/absence lanes, dim 11 packaged first-arrival, the five
  process classification lanes (exit-nonzero, timeout, runner_error,
  JSON block, JSON malformed), the E2 hostile-block lane;
  l2Trace.test.ts — the `outcomes[2]` blocked assert;
  l2aTrace.test.ts — the `outcomes[3]`/`outcomes[4]` blocked asserts
  (fixture ops 3/4 = model trace rows 2/3); cli/journey.test.ts —
  the blocked stdout document. The dim 2 `[allow, block]` and
  `[warn, block]` lanes assert `kind` only today — `[allow, block]`
  gains the G3 value assert; the fail-closed runner test asserts a
  GateDecision (not an Outcome) and does not move.

```json
{
  "mutation_boundary": {
    "files": [
      "v3/src/domain/outcome.ts",
      "v3/src/kernel/kernel.ts",
      "v3/src/ingress/ingress.ts",
      "v3/src/kernel/kernel.test.ts",
      "v3/src/l2Trace.test.ts",
      "v3/src/l2aTrace.test.ts",
      "v3/src/cli/journey.test.ts",
      "docs/v3/implementation/packets/ch12-p0-gate-field.md"
    ]
  }
}
```

## Row manifest

```json
{
  "packet_rows": {
    "rows": [
      { "id": "G1", "class": "anchored", "refs": ["prose:l2-pseudocode/HANDLE @ 6dd8bd15", "prose:core-model 08-l2 Rejected(gate_blocked) entity @ 6dd8bd15"] },
      { "id": "G2", "class": "anchored", "refs": ["prose:l2-pseudocode/HANDLE @ 6dd8bd15", "prose:l2a-pseudocode/HANDLE @ 6dd8bd15"] },
      { "id": "G3", "class": "anchored", "refs": ["prose:l2-pseudocode/HANDLE @ 6dd8bd15 (emission-line loop position + first-block-wins)"] },
      { "id": "G4", "class": "derived", "refs": ["prose:l2-pseudocode/HANDLE @ 6dd8bd15", "prose:ch11-P2a admission (uses resolved at load)"] },
      { "id": "G5", "class": "anchored", "refs": ["prose:core-model 08-l2 trace row @ 6dd8bd15", "prose:core-model 09-l2a trace rows @ 6dd8bd15"] },
      { "id": "G6", "class": "anchored", "refs": ["prose:plan §12.1 item 4", "prose:plan §12.4 ch12-P0 row"] },
      { "id": "G7", "class": "derived", "refs": ["prose:6dd8bd15 touched-surface enumeration", "prose:ch11-P2b dimension-10 rejected-event contract"] },
      { "id": "G8", "class": "derived", "refs": ["prose:ch11-P2b O1 (type-expressed exclusion)", "prose:l2-pseudocode/HANDLE @ 6dd8bd15"] }
    ]
  }
}
```

## Sizing/risk (template §2 step 0 — materialized)

Predicted class (plan §12.4 P0 row): **projection** (source: the
ratified model @ `6dd8bd15` — anchors no draft row). Discovered at
authoring: **projection** — prediction and discovery agree (zero
new-decision rows; every decision point was resolved at the model
fix and the plan ratification).

Six axes: **authority movement** — NO (the model already owns the
field; this packet realizes, moves nothing). **Surface spread** —
TRIPPED, hard stop 2 by letter: ONE concept (the gate field)
changes THREE production surfaces — the domain type (the Outcome
arm), the kernel (the one construction site), and the CLI-HUMAN
PAYLOAD (the `submit` stdout document observably gains the field;
the surface rule counts the payload's change, not whether a CLI
code line moves). The testkit contract is untouched (the harness
`ExpectedOutcome` stays `reason`-only — tests merely exercising the
change never count). **Identity/join fragility** — NO
(no cross-seam identity; the value is the in-hand loop binding's
field). **Foundation + activation coupling** — NO (the lane exists
and is live; one additive field). **Prerequisite coupling** — NO
(the draft is ratified; no dependence on P1–P4). **Acceptance
multiplicity** — one proof surface (`pnpm v3:test` + bridges)
validates type, kernel, traces, and CLI document together. No
persisted-state impact: rejections commit nothing, no schema or
migration surface exists for this field.

**Hard stop 2 (letter-tripped, closure-proven; single-packet
allowed: yes).** The trip shares ONE cause — the additive field.
One bounded code change (the type arm + one emission line) closes
every touched bucket without separate sequencing: the CLI payload
change IS the same field riding the built verbatim pass-through
(zero CLI code — G6; the journey lane proves it end-to-end), and no
cut point exists (the field cannot reach the CLI document without
the kernel emitting it, and the required arm without the emission
does not compile the kernel). The same in-repo consumers own the
fallout; ONE proof surface validates all three surfaces; no
per-consumer-family review loop; no compatibility / diagnostics /
read-projection / recovery / ordering risk is introduced (additive
field, nothing persisted, diag confined by G7). Stops 1 and 3–11:
no authority movement, no unfinished prerequisite, no competing
authority paths, no contract-plus-consumer cutover on a fragile
join, no proof-source move, no reused proof contract without
parity. The ch11-P2c letter-trip-with-closure-proof pattern is the
precedent.

**Closure-budget triage** (annex — buckets in scope): THREE buckets
are touched — the SHARED-CONTRACT bucket (the `Outcome` result shape
is a contract shared by the kernel, both CLI renderers, and every
test consumer — the domain-type surface IS this bucket), the runtime
producer (the kernel emission), and read/presentation (the CLI
payload document). Both non-producer closures are COLLAPSED into the
producer's deliberately, and the collapse is safe: the shared-shape
change is one additive required field whose every consumer is proven
shape-stable by the type-consequence sweep (no exhaustive consumer,
no persisted copy — nothing to migrate), and the presentation bucket
has ZERO independent code (verbatim pass-through) with its proof
lane (the journey blocked document) riding the same build; no bucket
is deferred. The authority bucket is not in scope (the model owns
the contract; this packet moves no source of truth).

**Consume-family scan** (run because stop 2 tripped; measured from
the tree at authoring): producer = kernel (changed — the one
construction site); validator/gate = admission (absent — no format
or admission surface moves); persistence/replay = store (absent —
a blocked rejection commits nothing; the floor reads committed rows
only, so no floor surface renders an Outcome); execution consumer =
none here (the runner is ch 9's); read/presentation = the CLI
`submit` stdout document (changed, by pass-through) AND the dev
CLI's `inject` + `replay` documents (`cli/dev/main.ts` — the
identical pass-through, the replay document embedding its
`outcomes` array; present, scoped in G6: no gated dev fixture
exists) — the floor and `bundle`/`timeline` documents are absent
for outcomes;
recovery/cleanup = absent; external/integration = absent (dispatch
and egress untouched); testkit = present as EXERCISER only (its
contract is unchanged — does not count toward the family stops). No
`unknown` cells.

## Pre-approval flags

None. Zero new-decision manifest rows (tally: 5 anchored / 3 derived
/ 0 new-decision); no narrowing, no contract-reality issue open. The
stale C33 illustration quote (in-context notes) is a watchpoint
routed boundary-review — its home is the process log with a
chapter-DoD revisit, not this section; nothing here awaits an
approve-time decision.

## Acceptance

- Contract tests: no new CT-* ids — the packet extends BUILT lanes;
  the families below turn green with the field asserted.
- Test disciplines + family inventories (R-ALTITUDE-LINE form):
  - **The full-document equality family** — discipline: every assert
    comparing a COMPLETE `gate_blocked` outcome document asserts
    `gate` with its exact expected value (the fixture's `uses`
    string), never presence alone. Membership: MEASURED — every
    full-document `gate_blocked` assert in the tree (owner: the
    build-time re-run of the Embedding-gates sweep, untruncated —
    R-UNTRUNCATED-SWEEP); the authoring-time inventory is in
    Embedding gates.
  - **The combination family** (G3) — discipline: the multi-gate
    lanes discriminate selection by VALUE — `[allow, block]` asserts
    `gate` equals the SECOND binding's `uses` (a "first binding"
    implementation goes red); `[block, recorder]` asserts the
    FIRST's. Membership: the dim-2 combination lanes (owner: this
    packet's G3).
  - **The type-probe family** (G8) — discipline: FOUR type
    directions driven in the dim-9 type-probe test — exclusion (a
    non-gate reason carrying `gate` is an excess property; the third
    `@ts-expect-error` probe joins the existing two), requiredness
    (a gate-less `gate_blocked` literal errors; the fourth probe's
    directive goes UNUSED and tsc reds if the field weakens to
    `gate?`), value type (a positive assignability probe binds the
    field to `string` — red on `unknown` or `string | undefined`),
    and immutability (a fifth `@ts-expect-error` probe stages an
    assignment to the narrowed readonly field — red on a mutable
    slip via the unused directive). The probes stay individually
    well-typed apart from the probed property. Membership: the dim-9
    type-probe test (owner: G8).
  - **The confinement family** (G7) — discipline: the dim-10
    exact-keyset diag lane stays GREEN and UNEDITED — its continued
    pass IS the proof the field did not leak into diag; the packet
    may not touch that test. Membership: the dim-10 rejected-event
    lane (owner: ch11-P2b, consumed as built).
  - **The end-to-end family** (G6) — discipline: the journey's
    blocked stdout document equality gains `gate:
    "declarative.threshold"` (exact value through subprocess +
    production bindings). Membership: the journey blocked lane
    (owner: G6).
- Build-close sensitivity (R-DERIVED-PROBES): the probe table derives
  from the families above — ≥1 red-on-break probe per family (drop
  the field → equality family red AND the end-to-end family's
  journey blocked document red — the same field through the shipped
  entrypoint; hardcode a wrong `uses` → combination family red;
  add a diag field → confinement family red; widen the arm to a
  non-gate reason → exclusion probe red; weaken `gate` to optional →
  the requiredness probe's directive goes unused, tsc red; widen the
  value type to `unknown` or admit `undefined` → the assignability
  probe red; drop the `readonly` → the immutability probe's
  directive goes unused, tsc red), materialized in the Build record.
- Checks: `pnpm v3:test` + the v3 bridges during build; FULL
  `pnpm ci:local` at build close; `tools/v3-model/check.sh` untouched
  (no model-plane edit rides this packet).
- Drift tests green (standing, unconditional — PI-3): the fix is
  registry-neutral — the drift lanes are green BEFORE and AFTER
  (plan §12.1 item 4); any drift-lane movement is a STOP, never a
  packet-local fix.
- Standing review rules in force: REV-DIAG-FAILOPEN (G7's surface —
  the diag sink stays bare and non-authoritative); REV-A1-TXN /
  REV-B / REV-C / REV-E: n/a (no transaction, locking, projection,
  or adapter-branch surface moves).

## Build record

Built 2026-07-19 in ONE commit (code + tests + packet). The arm
(gpt-5.6-sol/high, 5 runs: 1 full + 4 delta re-checks) drove the
packet through 8 accepted content findings AFTER a clean five-lens
panel — the type-probe directions (requiredness, value type,
immutability), the hard-stop-2 sizing recognition, the
shared-contract bucket, and the three-site renderer inventory
(verbInject mislabel + verbReplay's EMBEDDED outcomes — the latter
a lens-5 sweep miss) all arm-caught; final arm verdict CLEAN citing
the approve hash. Code: the `outcome.ts` arm (`readonly gate:
string` + doc-comment mirror), one `kernel.ts` emission line
(`gate: binding.uses`), the `ingress.ts` comment mirror synced
(anchor-free form). Tests: 17 existing
full-document asserts gained `gate` with exact values (13 in
kernel.test.ts + 1 l2 trace + 2 l2a trace + 1 journey); the dim-2
`[allow, block]` lane upgraded to the 18th — a NEW full-document
combination assert (G3); one NEW dim-9 test carries the
requiredness/value/immutability probes beside the extended
exclusion probe. Test delta: 1015 → 1016, all green; typecheck
clean. SENSITIVITY PROOF (R-DERIVED-PROBES) EXECUTED — 8/8 probe
mutations red, ≥1 per family, content-based restores:

| Probe (family) | Mutation | Expected red | Observed |
|---|---|---|---|
| equality + end-to-end | drop `gate:` from the kernel emission | equality lanes + journey document | 17 tests red across 4 files + 1 type error |
| combination (G3) | `gate: pipeline[0]!.uses` (first-binding mutant) | the `[allow, block]` lane | exactly 1 test red (the combination lane) |
| equality (value) | `gate: "hardcoded.constant"` | every exact-value assert in the probe's run scope | 16 tests red across the 3 unit-level files run (the journey lane's exact-value sensitivity is proven by the drop-field probe, whose run included it) |
| confinement (G7) | `gate: "leak-probe"` added to the rejected diag emit | the dim-10 exact-keyset lane | exactly 1 test red (dim-10) + 1 type error |
| type-probe (G8b) | `gate?: string` | requiredness directive unused | 2 type errors |
| type-probe (G8c) | `gate: unknown` | assignability probe | 1 type error |
| type-probe (G8d) | `readonly` dropped | immutability directive unused | 1 type error |
| type-probe (G8a) | non-gate arm gains `gate?: string` | exclusion directive unused | 1 type error |

No in-build surprise; the model emission mapped 1:1 onto the single
block-return (`binding` is the loop variable — the model's `gate`).

```json
{
  "packet_metrics": {
    "class": "kernel-alignment (additive field realization)",
    "prediction": { "predicted": "projection", "reasoning": "the ratified model fix 6dd8bd15 resolves every decision; the plan's P0 row predicts projection anchoring no draft row", "discovered": "projection" },
    "provenance": { "anchored": 5, "derived": 3, "new_decision": 0 },
    "rounds": { "review": 4, "doc_refinement": 5, "implementation": 1 },
    "stops": [],
    "detector_misses": [],
    "learned": "a clean five-lens panel is not arm-parity: five arm rounds yielded 8 content findings (type-probe directions, sizing letter-trip, embedded-outcomes renderer) — transitive embedding belongs in the lens-5 sweep duty"
  }
}
```
