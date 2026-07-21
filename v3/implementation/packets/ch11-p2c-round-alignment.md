# Task Packet: ch11-P2c — the round alignment (declared `advances_round` flags · the reconstructability checker · the projection round-consumption pin)

Plan step: plan.md §11.4 P2c row — the P2 row's ALIGNMENT share under
the ratified ch11-P2 in-chapter sizing split (executed at ch11-p2a
authoring; parts P2a/P2b/P2c). Realizes §11.1 item 2's round clause
as re-ratified at the ch11-gate-format reopen (2026-07-12): the ch-4
`target === template.start` heuristic assessed at projection and
RETIRED — declared-only advancement (absent declaration ⇒ none, C38)
via admission-normalized per-transition flags (C39) + C40's
value-level admission lanes; the `round-is-canonical-reconstructable`
storeChecker; `gate_projection`'s round consumption pinned. Draft
anchors (= the manifest's C-row ref union): `contract:ch11-gate-format`
rows C37/C38/C39/C40 (C37 at the domain grain only — the YAML key and
C40's source-form lanes are P4's). Plan alignment: none — the ten
reopen re-ratification alignments (89fcf9fd) already carried every
plan consequence of this packet's decisions; no packet decision here
contradicts ratified plan text.
Autonomy stage: measurement — inherited from the ch11-P2 row through
the split (parts inherit mode, predicted class, watchpoints; fresh
watchdog per part). Not first-of-a-kind: the kernel-alignment class
has precedent (ch11-P1 extended the admission ladder; ch11-P2b
extended the commit path), the admission-extension class has
precedent (ch11-P2a built `admitTemplate`), and the
storeChecker-extension class has precedent (ch5-P2 built the kit).
Classification: **projection** — manifest tally: 7 anchored /
7 derived / 0 new-decision (machine-counted from the `packet_rows`
block). Every row anchors to the re-ratified draft rows C37–C40, the
model's 08-l2 round-semantics paragraph, the l2 unit texts, ratified
plan text, or the built P2a/P2b rows, or derives from them with an
in-row note.

## Ledger slice (declared — feeds the coverage accounting)

```json
{
  "ledger_slice": {
    "units": [],
    "rejections": [],
    "invariants": [
      { "id": "l2/round-is-canonical-reconstructable", "disposition": "checker" }
    ],
    "traces": [],
    "shared_ownership": []
  }
}
```

The EMPTY unit list is a declaration, not an omission: all six l2
units are P2a/P2b-owned and REALIZED; this packet ALIGNS two of their
realizations along dispositions those packets explicitly deferred
here — `l2-pseudocode/HANDLE`'s `advances_round` line (the P2b
partial-realization note: "stays the ch-4 heuristic — the P2c row's
alignment") and `l2-pseudocode/admit_definition`'s normalization
surface (the C39 admission touch, named in the re-ratified plan row).
The split's coverage union (declared at ch11-P2a): P2c owns exactly
`l2/round-is-canonical-reconstructable` (checker). No rejection and
no trace joins (the l2 trace is P2b-owned; this packet EDITS its
fixture under T2's sanctioned classes, never re-owns it).

## Sizing/risk (template §2 step 0 — materialized)

Predicted class (plan §11.4, inherited through the split):
**projection**. Discovered at authoring: **projection** — prediction
and discovery agree (the round-format decision points all resolved at
the reopen; zero new-decision rows remain).

**This packet's own six axes** (the parent P2 assessment lives in the
ch11-P2a packet):

- **authority movement:** YES — this is the split's deliberate
  alignment share: round-advancement truth MOVES from a kernel
  heuristic to declared template semantics (admission-normalized
  flags). The parent P2 assessment named exactly this move; the split
  quarantined it here.
- **new runtime behavior turned on:** YES in the narrow window sense —
  a declaration-absent loaded template's round stops advancing (stays
  1 after activation), the ratified C38 default observable on the
  shipped channel. Hard stop 1 (authority movement + activation in
  one packet) trips BY LETTER.
- **surface spread:** TRIPPED — hard stop 2 by letter. One concept
  (the declaration→flags→consumption chain) spans domain (the two
  optional fields), definition (expansion + value-level lanes), the
  kernel (the flag read), the testkit CONTRACT (a NEW checker +
  `runAllCheckers` growth + the `TraceSeams.template` narrowing — a
  kit contract change, counted under the surface rule), and the dev
  CLI's replay seam (a one-token type-driven swap).
- **identity/join fragility:** NO — no cross-seam identity; the flags
  ride the pinned template value the kernel already loads.
- **foundation + activation coupling:** NO new foundation — admission
  (P2a) and the commit path (P2b) are built; this packet swaps ONE
  input of an existing computation and adds validation/checker on
  built seams.
- **prerequisite coupling:** NO — P2a/P2b built; the draft
  re-ratified 2026-07-12 (89fcf9fd); P3/P4 depend on this packet's
  chapter, not the reverse.
- **acceptance multiplicity:** admission lanes + kernel behavior +
  checker + trace/journey updates — one proof surface (`pnpm v3:test`
  + the bridges) validates all of it.

**Hard stops 1 and 2 (letter-tripped, closure-proven; single-packet
allowed: yes).** The trips share ONE cause — the predicate swap. The
authority move IS the behavior change (retiring the heuristic and
reading declared flags are the same edit); no separate sequencing
exists: the kernel cannot read flags admission does not write, the
admission lanes guard the very declarations the kernel consumes, and
the checker without declared flags would have to re-derive the BANNED
inference (the reason the split bundled predicate + checker). One
bounded code change closes all touched buckets; the same in-repo
consumers own the fallout; ONE proof surface validates it; no
per-consumer-family review loop; no migration risk (no persisted
schema change — `newRound` flows through the built `commitTransition`
input unchanged in shape). Stops 5/8/9/10/11: no contract cutover, no
persisted-schema move, no rollback/lock/ordering change (the commit's
`newRound` computation swaps its INPUT, the transaction is untouched),
no proof-source move, no reused proof contract (new lanes + the
regression corpus).

**Consume-family scan** (run because stops 1+2 tripped; measured from
the tree 2026-07-12, receipts in Embedding gates): producer = kernel/
(changed: the commit-path predicate read); validator/gate =
definition/ (changed: `admitTemplate` gains the round expansion +
value-level lanes; gates/ UNCHANGED); persistence/replay = store/
(present, UNCHANGED — same `commitTransition` input shape, same
column); execution consumer = dispatch intent (present, UNCHANGED);
read/presentation = floor/ + CLI (present, ZERO production code
change — the round field flows as built; its VALUE changes on
declaration-absent loop-back runs, driven at the journey grain);
recovery/cleanup = absent; external/integration = the dev CLI's
`replay` verb (changed: the seam value swaps to the
already-computed `admitted.template` — a one-token, type-driven
production edit under the `TraceSeams.template` narrowing; no verb,
flag, or output change, C28 intact; `cli/main.ts` UNCHANGED);
testkit = CONTRACT CHANGES (the new checker + `runAllCheckers` + the
`TraceSeams.template` narrowing; `fixtureTemplate` itself UNTOUCHED —
the ch8-P2 equality pin holds).

Conditional annexes: **closure-budget triage** — buckets touched:
runtime behavior (the predicate), admission validation (the lanes),
testkit contract (the checker). Collapsed into one packet because the
plan's re-ratified P2c row IS this bundle and one compile-plus-test
closure covers them; explicitly deferred: the YAML `round` key +
C40's source-form lanes + the shipped template's declaration + the
wrapper retirement (P4, the plan row names the reciprocal), the
process contract (P3), and the model's per-transition-override half
(C41's partial-realization disposition — A1 is pure target-membership
and forecloses it; the override's later arrival is authoring-grammar
only, no admitted-form change). **Proof-boundary triage** — N/A: no
success/completion proof source moves. **Mutable-flow record** (hard
stop 9 material near): precondition failure still produces ZERO side
effects (admission findings admit nothing; a rejected envelope
commits nothing); the commit transaction, CAS, idempotency, and
ordering are untouched — the ONE mutated expression is the
`newRound` input.

**R-ACTIVATION-JOURNEY disposition (the rule FIRES — the kernel
commit path is live from the shipped `submit` verb, and the C38
default changes observable behavior on that channel):** the journey
discharge is a NEW pass-back scenario in `cli/journey.test.ts` —
subprocess, production bindings, the SHIPPED declaration-absent
template: implement →PASS→ review →PASS→ implement (the loop-back
arrival at start) →PASS→ review →CONVERGED→ done, asserting the final
detail's `round === 1` (declared-only default live end-to-end).
Sensitivity: under the retired heuristic this run ends round 2 — the
assert fails, the lane can fail. Deterministic actors: the journey's
existing stub-actor configuration through the shipped surface.

## Claim + dimensions (enumerated BEFORE deriving test rows)

**Claim (wide):**

1. **Declared transition semantics, end to end:** from this packet
   on, round advancement is decided ONLY by admission-normalized
   per-transition flags on the pinned admitted template — the kernel
   NEVER infers it from role names, graph shape, target equality, or
   naming (the model's ban), and NO code path computes
   `target === template.start` for round purposes (the ch-4 heuristic
   is retired, not wrapped).
2. **Absent means none (C38):** a template with no `round`
   declaration has NO advancing transitions — after activation the
   instance's round remains 1 for the rest of active execution, on
   EVERY channel; every loadable file today is declaration-absent
   (the P2c→P4 window), and the shipped entrypoint exhibits exactly
   this.
3. **Admission owns the declaration (C39/C40 value-level):** the
   authored (direct-channel) or absent declaration is expanded ONCE
   at `admit_definition` into COMPLETE per-step flag maps (every
   transition key present, explicit boolean; no absent state
   downstream), and the value-level lanes — empty list, member not in
   `keys(steps)` (terminal ids included), duplicate members — reject
   as admission findings on every channel; nothing downstream
   re-validates or re-derives.
4. **Round stays canonical and reconstructable:** replaying the
   committed transcript over the pinned admitted template's flags
   reproduces the stored round exactly; a divergent stored round and
   a non-resolving history are checker VIOLATIONS, never skips — and
   the checker runs in `runAllCheckers`, so every harness trace
   carries it.
5. **Confinement:** version/step/status arithmetic, the gate
   pipeline, retained decisions, the store schema, the read-surface
   SHAPES, dispatch, and diag are byte-identical; `fixtureTemplate()`
   and the shipped YAML stay declaration-absent and deep-equal (the
   ch8-P2 pin untouched); the round-2 golden expectations are
   preserved via LOCAL wrappers, never rewritten (the two
   raw-vs-loaded round-trip pins re-bind at the admitted stage —
   dimension 6's build-round correction); `gate_projection`'s
   round consumption is the built pass-through (`instance.round`),
   re-driven, unchanged.

Dimensions:

1. **Predicate lanes — both directions of the heuristic replacement**
   (the P2b both-directions lesson, R-LANE-SENSITIVITY): (a) a
   declared advancing transition whose target is NOT the start step
   advances (+1) — the retired heuristic would NOT advance: the lane
   fails on a surviving heuristic; (b) a loop-back arrival AT the
   start step on a declaration-absent template does NOT advance — the
   heuristic WOULD advance: the lane fails on a surviving heuristic;
   (c) a declared template whose list omits start: arrival at start
   does not advance while arrival at the listed step does (C38's
   exhaustive-authored-list rule, both halves in one fixture).
2. **Default and lifecycle lanes:** declaration-absent template:
   activation sets round 1 (start.ts untouched), a full loop-back run
   ends round 1 (kernel grain) AND the journey's pass-back scenario
   ends round 1 at the shipped grain (the R-ACTIVATION-JOURNEY
   discharge); a declared `[start]` template reproduces the ch-4
   exhibited behavior exactly (round 2 after one loop-back — the
   restored-by-declaration claim driven).
3. **Admission value-level lanes (each able to fail, each at its C40
   path):** empty `advanceOnArrivalAt` list → a finding at
   `round.advanceOnArrivalAt`; an unknown-id member → a finding at
   `round.advanceOnArrivalAt[<i>]`; a TERMINAL-id member → the same
   lane driven on a terminal id specifically (C37's exclusion — a
   deliberate reference, the membership rule catches it); DUPLICATE
   members → a finding; a VALID declaration admits; the
   declaration-absent template admits. Findings ACCUMULATE with gate
   findings on the one channel (a fixture carrying BOTH a bad gate
   and a bad round declaration reports both — the C21/A3 one-channel
   rule driven as a combination).
4. **Normalization completeness grid:** the admitted template carries
   a COMPLETE `advancesRound` map per step — every transition key
   present with an explicit boolean (asserted as exact maps, not
   spot-keys); flags are TARGET-membership (`target ∈ list`): a
   transition into a listed step advances FROM ANY source step (two
   different sources, one listed target — both flagged); a step with
   an empty transitions map gets an empty map; the absent declaration
   yields all-false maps (asserted exactly). PRODUCER-MONOPOLY
   hostile lanes (A1): a declared input arriving with WRONG
   pre-populated `advancesRound` maps admits with the RECOMPUTED maps
   (input flags ignored wholesale); a declaration-absent input with
   pre-populated TRUE maps admits ALL-FALSE — an implementation
   trusting or merging input flags fails both.
5. **Checker lanes (each able to fail):** a multi-loop-back committed
   history over a DECLARED-ADVANCING admitted template (stored round
   > 1 — a declaration-absent fixture would be blind to a
   raw-template regression) reconstructs the stored round (green); a
   TAMPERED stored round (hostile detail: round off by one) → a
   violation whose message carries BOTH values (stored and
   reconstructed — a fired-but-empty violation fails the lane); a
   corrupt history (non-resolving replay) → a violation, never a
   skip (the checkTerminalSink precedent); a declaration-absent
   history with a loop-back reconstructs 1; `runAllCheckers` includes
   the checker (a trace whose round was tampered fails through the
   aggregate).
6. **Wrapper/pin confinement:** `fixtureTemplate()` and the shipped
   YAML are byte-untouched; the ch8-P2 equality pin RE-BINDS at the
   ADMITTED stage — `loadTemplate(canonical file)` ≡
   `admit(fixtureTemplate())` via the stub catalog (the build-round
   correction: `loadTemplate` returns the ADMITTED value since P2a,
   so admission's all-false maps now appear on the loaded side of any
   raw-vs-loaded comparison; the pin's ch8-P2 MEANING — canonical
   file ≡ fixture — is preserved same-stage and stays P4-robust), and
   the validate suite's exact-load pin literal gains the all-false
   maps (an exact admitted-output pin); the round-2 goldens
   (`l0aTrace` + its negative variant, `l0bTrace`, `twoWorker`,
   `l2Trace`) keep their EXACT final states via local declaration
   wrappers — no golden expectation rewritten; `l1Trace`, dev/CLI
   round-1 asserts untouched.
7. **Type-ripple confinement:** the two new DOMAIN fields are
   OPTIONAL — zero forced template-literal updates (the measured
   sweep: no existing literal names `round` or `advancesRound`); the
   `TraceSeams.template` NARROWING to `AdmittedTemplate` (T1) forces
   EXACTLY the measured harness-consumer set — the three wrapped
   traces, `l1Trace`, `traceHarness.test.ts`, and the dev replay's
   one-token seam swap — all in the boundary; `v3:typecheck` is the
   closing backstop; the admitted-form completeness stays an
   admission POSTCONDITION (test-asserted), never a type claim.
8. **Kernel confinement + projection pin:** the gated l2 trace stays
   green with its wrapper declaration (threshold reads
   `projection.round` = the canonical kernel round — the consumption
   pin driven end-to-end at round 1→2); CAS restart re-runs on fresh
   state unchanged; the FULL existing suite green (zero production
   edits outside the boundary's named seven — the Embedding gates'
   production list is exhaustive).

## Operative material (full text — projection, not invention)

### The model's round-semantics paragraph (08-l2, verbatim — the alignment's source)

> Round semantics (L2 owns them, because L2 makes round load-bearing —
> the declarative.threshold gate reads it). round always starts at 0
> (prepared — no work cycle yet); that is a fixed convention, not
> configurable (like 0-indexing, not a knob). Activation is the first
> work-cycle arrival and sets round to 1 (the start step being a
> round-start); each later advancing arrival adds one. advances_round
> is declared transition semantics in the normalized/pinned template —
> never inferred from role names, graph shape, target equality, or
> naming. The authoring form may declare
> round: { advance_on_arrival_at: [implement] }; the definition loader
> expands it into explicit per-transition advances_round flags (with
> per-transition override) for the committed transitions after
> activation — it does not synthesize a flag for activation (which has
> no incoming edge). The kernel consumes only the normalized flags —
> round stays transcript-reconstructable.

### `l2-pseudocode/HANDLE` — the aligned line (verbatim; the unit is P2b-owned, reprinted for the delta only)

```
    IF advances_round(step, target) THEN instance.round ← instance.round + 1    # advance predicate = transition semantics; transcript-reconstructable
```

### The ratified rows this packet realizes (anchors, not reprints)

- **C38** — absent `round` key declares NO advancing transitions;
  after activation round remains 1 for the rest of active execution;
  the (empty) default materialized once at admission; an authored
  list is EXHAUSTIVE (replace, not merge); the deviation from §8.2
  rule 2 is ratified (the deviation clause's first exercise).
- **C39** — admission expands authored-or-defaulted declarations into
  explicit per-transition `advancesRound` flags
  (`advancesRound = (target ∈ advanceOnArrivalAt)`); no flag for
  activation; the kernel consumes ONLY the flags (the verbatim ban);
  STAGING: the file channel is default-only until P4; direct
  construction authors from THIS packet on; round stays
  transcript-reconstructable (this checker's guarantee).
- **C40 (value-level share)** — the empty list, membership (incl.
  terminal), and duplicate lanes bind every channel and land HERE
  with the normalization; the source-form lanes are P4's.
- **C37 (domain grain)** — the declaration shape
  `{ advanceOnArrivalAt: [step ids] }`; members ∈ `keys(steps)`,
  terminal ids illegal, nonempty; the YAML key itself is P4's.

### Trace expectation (executable — the journey pass-back scenario)

| # | Act (shipped channel, subprocess) | Expected |
|---|---|---|
| 0 | `start` on the shipped declaration-absent template | round 1 |
| 1 | `submit` PASS on implement | committed → review; round 1 |
| 2 | `submit` PASS on review (pass back — arrival at start) | committed → implement; **round stays 1** (the heuristic would say 2) |
| 3 | `submit` PASS on implement | committed → review; round 1 |
| 4 | `submit` CONVERGED on review | committed → done; final detail `round === 1` |

The four round-2 goldens keep their EXACT existing tables via wrapper
declarations (`advanceOnArrivalAt: ["implement"]` — the model's own
exhibited declaration); no golden row changes.

## Canonical domain/declaration matrix (D)

| Id | Rule |
|---|---|
| D1 | `WorkflowTemplate` gains OPTIONAL `round?: { readonly advanceOnArrivalAt: readonly StepId[] }` — C37's authoring shape at the DOMAIN grain (the direct channel's input; the YAML key maps onto it at P4). Absent = C38's none-default. The field is admission's INPUT; whether the authored record itself survives on the admitted value is BUILD FREEDOM — no anchor forces retention and nothing downstream reads it (the flags, D2, are the kernel's ONLY consumption surface per C39); what admission may never do is MUTATE it (A4) (anchored: contract:ch11-gate-format#C37, contract:ch11-gate-format#C38) |
| D2 | `Step` gains OPTIONAL `advancesRound?: Readonly<Record<EventType, boolean>>` — the model's "explicit per-transition advances_round flags" as a parallel step key (the `Step.gates` C1-pattern precedent; transitions' scalar targets stay untouched). On an ADMITTED template the map is COMPLETE per step: every `keys(step.transitions)` member present with an explicit boolean; a step with no transitions carries an empty map. DERIVATION: C39 fixes the flags' existence and semantics and EXPLICITLY grants the placement choice ("a parallel step key vs a transition-record field is packet freedom — the C29 pattern"); this row EXERCISES that ratified grant (the P2b K6 verb-choice precedent: a within-grant choice is derived, never a new semantic decision) — the parallel key chosen for the C1 symmetry and because widening `transitions`' values would fork the ch8-C24-mirrored domain shape (derived: contract:ch11-gate-format#C39, prose:packet ch11-p2a D1) |
| D3 | The admitted-form completeness (D2's "COMPLETE") is an ADMISSION POSTCONDITION, not a type claim — the optional field keeps every existing literal compiling (dimension 7); `admitTemplate` is the only producer of complete maps, and the kernel reads the admitted form by the store port contract (P2a C20/D6 — only admitted templates reach it). DERIVATION: the P2a effective-config precedent (materialized into the same field shape, guaranteed by the single producer, not by the type) (derived: prose:packet ch11-p2a A1, contract:ch11-gate-format#C39) |

## Canonical admission matrix (A)

| Id | Rule |
|---|---|
| A1 | `admitTemplate` expands the declaration — authored `round` or the absent default — into D2's flag maps: for every step and every `eventType ∈ keys(step.transitions)`, `advancesRound[eventType] = (step.transitions[eventType] ∈ round.advanceOnArrivalAt)`; the absent declaration yields ALL-FALSE maps (C38's empty expansion). PRODUCER MONOPOLY (the arm-gate-1 hostile class — the shared type permits a raw input to arrive with pre-populated `advancesRound` maps): the expansion IGNORES and OVERWRITES any input flags WHOLESALE — every admitted map is recomputed from the declaration-or-default, never merged with or trusted from the input (driven: a declared input with WRONG pre-populated maps admits with the recomputed maps; a declaration-absent input with pre-populated TRUE maps admits all-false). No flag is synthesized for activation (it has no incoming edge — the model's clause; activation's `round ← 1` lives in `start.ts`, untouched) (anchored: contract:ch11-gate-format#C39, contract:ch11-gate-format#C38) |
| A2 | The value-level lanes (C40's P2c share), UNCODED findings in ch8-C21 `{path, message}` form at C40's paths, binding EVERY admission channel: an EMPTY `advanceOnArrivalAt` list → a finding at `round.advanceOnArrivalAt`; a member not in `keys(steps)` — an unknown id OR a terminal id (ch8-C17 disjointness: one membership lane catches both; the terminal case driven by name) → a finding at `round.advanceOnArrivalAt[<i>]`; DUPLICATE members → a finding. The source-form lanes (non-map, unknown key, missing key, non-list value, non-string member) are P4's format walk — on the direct channel the TYPED input forecloses them (C40's realization split; a stated proof boundary, not a gap) (anchored: contract:ch11-gate-format#C40) |
| A3 | One channel, all-or-nothing, accumulation (the P2a A1/A2 rules joined, not re-decided): round findings ACCUMULATE with gate findings in the SAME result (a template carrying both defect classes reports both); ANY finding ⇒ no admitted value. DERIVATION: C40 says the lanes JOIN C21's one channel; the P2a-built accumulation is that channel's realized form (derived: contract:ch11-gate-format#C40, prose:packet ch11-p2a A2) |
| A4 | The authored declaration is validated and expanded but NEVER mutated — an INPUT-PURITY rule in the chapter's established admission culture (the P2a purity lanes: frozen inputs, repeated-call determinism), not a C38 entailment (C38's replace-not-merge governs the SEMANTIC default replacement; this row adds the object-level guarantee on the P2a precedent). Driven MUTATION-SENSITIVE: the admission round lanes run on a DEEP-FROZEN input template (`Object.freeze` on the declaration and its list — a mutating implementation throws in strict mode) plus an input before/after deep-equality assert; the record's retention on the admitted value is build freedom (D1) (derived: contract:ch11-gate-format#C38, prose:packet ch11-p2a) |

## Canonical kernel matrix (K)

| Id | Rule |
|---|---|
| K1 | The commit-path predicate reads the CURRENT step's flag for the committed event type — `step.advancesRound?.[envelope.type] === true` on the pinned ADMITTED template — replacing `target === template.start` VERBATIM at the one existing site (`kernel.ts`, the `newRound` expression); the retired comparison survives NOWHERE in round logic (a grep lane: no `template.start` comparison outside navigation/terminal semantics). The `=== true` form is explicit-flag consumption, never a defensive default — an admitted template's map is complete (D3), and the optional chain exists only because the TYPE is shared with the raw form (anchored: contract:ch11-gate-format#C39, prose:l2-pseudocode/HANDLE) |
| K2 | The round lifecycle OUTSIDE the predicate is untouched: CREATE-state round semantics and activation's `round ← 1` (`start.ts`) stand as built; version/step/status arithmetic, the CAS restart, idempotency, and the commit transaction are byte-identical — the ONE mutated expression is the `newRound` input (anchored: contract:ch11-gate-format#C38, prose:v3/src/kernel/start.ts) |
| K3 | `gate_projection`'s round consumption PINNED: the projection's `round` stays the loaded instance's canonical round (the P2b V1 pass-through — zero code change); the pin is DRIVEN end-to-end by the l2 trace's threshold gate reading round 1 → block, round 2 → allow under the wrapper declaration. DERIVATION: the plan row names the pin; the built V1 already realizes it — the packet's obligation is the regression drive, not new code (derived: prose:plan §11.4 P2c row, prose:packet ch11-p2b V1) |

## Canonical testkit/checker matrix (T)

| Id | Rule |
|---|---|
| T1 | `checkRoundReconstruction(detail, template)` joins `storeCheckers.ts`: replay from `template.start` (the checkTerminalSink walk), round₀ = 1 (the post-activation value — `InstanceDetail` exists only for started instances; `startInstance` is the sole creator and sets round 1), +1 per committed row whose replayed-position step carries `advancesRound[type] === true`; the final reconstructed round MUST equal `detail.instance.round` — a mismatch is a violation naming BOTH values (stored and reconstructed — the checkVersionArithmetic message idiom; the tampered lane asserts the message carries both, not just that a violation fired). A non-resolving replay (no step entry at the position; no transition for the row's type) is a VIOLATION, never a skip (the checkTerminalSink corrupt-history precedent). The checker consumes the ADMITTED template's flags — and the CURRENT tree does NOT satisfy that at the harness seam: the built traces pass RAW templates as `seams.template` (`l0aTrace.test.ts:54`, `l0bTrace.test.ts:84`, `l2Trace.test.ts:156` — measured; the raw value satisfies the `WorkflowTemplate`-typed field silently). The fix is TYPE-LEVEL (the arm-gate-1 correction — the C20 letter: "harness types narrow to the admitted type"): `TraceSeams.template` NARROWS to `AdmittedTemplate`, compile-enforcing what a per-call-site discipline would leave to review. The narrowing ripples EXACTLY the measured consumer set: the three wrapped harness traces hand their wrapper's admitted value (one `admit(...)` result → BOTH `seams.template` and `definitions`); `l1Trace.test.ts:107` admits through its EXISTING local `admit()` helper, and `traceHarness.test.ts` GAINS a tiny helper with an INLINE stub catalog — `admitTemplate(template, { resolve: () => null } satisfies GateCatalog)`, the `GateCatalog` type imported from `ports/` and consumed by the `satisfies` — because the G1 eslint ban covers `src/testkit/**` WITHOUT a test exclusion (measured: a lint probe on a gates/ import under testkit fails; the src-root trace tests like l1Trace are outside that dir-block and import `gates/` legally), and its fixtures are GATE-FREE so admission under a never-resolving catalog is vacuous — all-false flags, their round-1 histories stay green (C38's default); the dev CLI's `replay` verb swaps its seam value to the `admitted.template` it ALREADY computes (`cli/dev/main.ts` — a one-token production edit; no verb, flag, or output change, C28 intact). The message obligation on the tampered lane is the packet's own R-LANE-SENSITIVITY discipline (a fired-but-empty violation is a blind lane) plus the kit's checkVersionArithmetic idiom — a test-evidence demand this packet imposes on its own tests, not contract semantics (anchored: prose:ledger §2 l2, contract:ch11-gate-format#C39, prose:v3/src/testkit/storeCheckers.ts, prose:v3/src/testkit/traceHarness.ts, prose:packet ch11-p2a) |
| T2 | `runAllCheckers` grows by the checker (every harness trace inherits it); the kit's import boundary is untouched (pure functions over floor-read data, ADR-005). The four round-2 goldens (`l0aTrace` + negative variant, `l0bTrace`, `twoWorker`, `l2Trace`) update under ONE sanctioned change class — the LOCAL declaration wrapper: ONE admitted value per test, `const admitted = admit({ ...fixtureTemplate(), round: { advanceOnArrivalAt: ["implement"] } })` — in the three HARNESS traces (`l0aTrace`, `l0bTrace`, `l2Trace`) handed to BOTH `definitions` and `seams.template` (the T1 seam correction; `l2Trace`'s directly-constructed template gains the same declaration inline and flows the same way); `twoWorker` has NO harness seam (its round-2 line is a bare kernel read) — its wrapper lands at the ONE `wireWorker` definitions site only. This row is the wrapper value's CANONICAL statement — the trace table's note and in-context note 2 defer to it. ZERO golden expectation changes, ZERO lane-meaning changes; `fixtureTemplate()` and the shipped YAML stay byte-untouched, and the ch8-P2 equality pin RE-BINDS at the admitted stage (dimension 6 — `loadTemplate` returns the admitted value since P2a, so the raw-vs-loaded comparison gains admission's maps on one side; the same-stage form preserves the pin's meaning and survives P4). The wrappers retire at P4 (the plan row's reciprocal; greppable by `advanceOnArrivalAt` — no marker needed) (anchored: prose:plan §11.4 P2c row, prose:v3/src/testkit/templateFixture.ts) |
| T3 | The journey extension (the R-ACTIVATION-JOURNEY discharge): a NEW pass-back scenario through the shipped subprocess channel on the declaration-absent shipped template, asserting the final detail `round === 1` (the trace table above). The existing linear journey scenario is untouched. DERIVATION: the rule's template (ch8-P2 journey) + the C38 default's shipped-channel observability — the pass-back is the ONLY scenario where the default is distinguishable from the retired heuristic (derived: prose:plan §11.4 P2c row, prose:v3/src/cli/journey.test.ts) |
| T4 | Drift-registry flip: `domainRegistry.ts` `l2/WorkflowInstance` flips `realized` witnessed by `WorkflowInstance` — the row's load-bearing half (the reconstructable-round claim, deferred at P2b by name) is realized by K1+T1; `unitMap.json` is UNTOUCHED (no unit ownership joins). DERIVATION: the P2b embedding note deferred exactly this flip here (derived: prose:packet ch11-p2b, prose:v3/src/drift/domainRegistry.ts) |

## Site × shape × phase grid (template §2 write-time discipline)

Trigger check: NO new awaited site enters any phased seam — the
predicate swap is a synchronous expression over already-loaded state;
admission's new lanes are synchronous over the in-memory template;
the checker is a pure function. One-line N/A with evidence: the
packet adds zero `await` sites (the mutation boundary's production
files gain no port call — verified against the diff surface at build
close).

## Mirrored surface map (one canonical statement per rule)

| Rule | Canonical | Mirrors |
|---|---|---|
| declared-flags-only consumption + heuristic retirement | K1 | Claim 1 · dimension 1 · the header's alignment sentence |
| absent ⇒ none (round 1 after activation) | A1 (the all-false half) | Claim 2 · dimension 2 · the journey table · T3 |
| expansion semantics (membership; complete maps; no activation flag) | A1 + D2 | Claim 3's expansion clause · dimension 4 |
| value-level lanes at P2c, source-form at P4 | A2 | Claim 3's lane clause · dimension 3 · the C37/C40 anchor notes |
| reconstructability (replay = stored) | T1 | Claim 4 · dimension 5 · the slice's checker row |
| wrapper-only staging (goldens never rewritten; pin holds; the wrapper VALUE) | T2 | Claim 5's wrapper clause · dimension 6 · the trace-table note · in-context notes 2/4 |
| projection round-consumption pin | K3 | Claim 5's pin clause · dimension 8 |
| lifecycle untouched (create/activation) | K2 | Claim 5's arithmetic clause · dimension 2's activation half |

## In-context notes (the scarce budget)

1. **Swap the input, not the shape:** the `newRound` expression is
   the ONLY kernel edit — resist touching the commit structure,
   `start.ts`, or the store input; the alignment is a one-expression
   semantic swap plus its guards. In `admit.ts`, mind the rebuild
   walk's GATELESS shortcut (`defineOwn(admittedSteps, stepId, step)`
   copies gateless steps verbatim) — the `advancesRound` map must
   attach on EVERY step, gated and gateless alike (D2's completeness
   binds both branches).
2. **The wrapper is a test-local VALUE, never kit surface:** spread
   `fixtureTemplate()` + the declaration inline in each trace file;
   do not add a kit helper for it (it retires at P4 — a helper would
   outlive its window and blur the pin).
3. **Complete maps beat sparse maps:** materialize every transition
   key's boolean at admission — a sparse "true-only" map would make
   the kernel's `=== true` read indistinguishable from an
   unadmitted template and hide D3's postcondition from the
   completeness lane.
4. **The checker consumes flags, so hand it flags:** the
   `TraceSeams.template` narrowing makes this COMPILE-ENFORCED — in
   the wrapped harness traces (l0a/l0b/l2) `seams.template` gets the
   SAME admitted value as `definitions` (T1 — a raw value there would
   reconstruct 1 against a stored 2; `twoWorker` has no harness
   seam — T2);
   the checker's job is arithmetic over committed rows, not
   validation — no store import, no re-admission inside the kit.
5. **Do not "fix" the inert-configuration shape:** a direct-channel
   template declaring gates-on-round with no `round` declaration is
   LEGAL and inert (C38's stated consequence) — no admission
   cross-rule, no warning; that detection is a NAMED later decision.

## Embedding gates (v1-inherited)

- **Edited (production):** `v3/src/domain/template.ts` (D1/D2),
  `v3/src/definition/admit.ts` (A1–A4),
  `v3/src/kernel/kernel.ts` (K1 — the `newRound` expression),
  `v3/src/testkit/storeCheckers.ts` (T1/T2),
  `v3/src/testkit/traceHarness.ts` (T1 — the `TraceSeams.template`
  narrowing to `AdmittedTemplate`),
  `v3/src/cli/dev/main.ts` (the replay seam's one-token swap to
  `admitted.template` — no verb/flag/output change),
  `v3/src/drift/domainRegistry.ts` (T4 — the `l2/WorkflowInstance`
  flip + its RealizedTypes entry).
- **Edited (tests):** `v3/src/definition/admit.test.ts` (dimension
  3/4 lanes incl. the producer-monopoly hostile pair),
  `v3/src/kernel/kernel.test.ts` (dimension 1/2 kernel lanes),
  `v3/src/testkit/storeCheckers.test.ts` (dimension 5),
  `v3/src/l0aTrace.test.ts` + `v3/src/l0bTrace.test.ts` +
  `v3/src/twoWorker.test.ts` (T2 wrappers), `v3/src/l2Trace.test.ts`
  (the inline declaration + K3's drive), `v3/src/l1Trace.test.ts` +
  `v3/src/testkit/traceHarness.test.ts` (the narrowing ripple —
  l1Trace via its existing local helper; traceHarness.test.ts gains
  the stub-catalog helper, T1),
  `v3/src/cli/journey.test.ts` (T3),
  `v3/src/testkit/templateFixture.test.ts` + 
  `v3/src/definition/validate.test.ts` (the build-round correction —
  the two raw-vs-loaded round-trip pins re-bind at the admitted
  stage: the equality pin compares against `admit(fixtureTemplate())`
  via the stub catalog; the validate exact-load literal gains the
  all-false maps).
- **Untouched, explicitly:** `v3/src/kernel/start.ts` (K2),
  `v3/src/testkit/templateFixture.ts` + `v3/templates/**` (the pin's
  SOURCE files),
  `v3/src/store/**`, `v3/src/ports/**`, `v3/src/gates/**`,
  `v3/src/floor/**`, `v3/src/ingress/**`, `v3/src/cli/main.ts`
  (production), `v3/src/diag/**`,
  `v3/src/kernel/gateProjection.ts` (K3 — zero code change),
  `v3/src/domain/rejections.ts` (no rejection joins),
  `v3/src/drift/unitMap.json` (no unit flips), `v3/eslint.config.mjs`,
  `tools/**`, `v3/adr/**` (no module/boundary decision enters).
- **Sweeps (measured 2026-07-12, current tree; untruncated):**
  `grep -rn "template.start" v3/src --include="*.ts"` → the kernel's
  round expression (`kernel.ts:227`, retired here) + navigation/
  terminal-semantics sites (untouched; the build re-runs the sweep
  and asserts the round-purpose set is empty);
  `grep -rn "round: 2" v3/src --include="*.test.ts"` → EXACTLY 4 hits
  (`l2Trace:134`, `l0bTrace:63`, `twoWorker:156`, `l0aTrace:85`);
  the `l0aTrace:134` negative variant (a `round: 1` override — NOT a
  grep hit) rides the same wrapper set — ALL five carried; `grep -rn "advanceOnArrivalAt\|advancesRound" v3/src` → 0
  hits (the fields are new; zero forced literal updates — the
  dimension-7 measurement).
- **Type-ripple targets:** the two DOMAIN fields force nothing
  (optional, additive); the `TraceSeams.template` narrowing forces
  exactly the measured harness-consumer set (the sweep:
  `grep -rln "replayTrace\|TraceFixture" v3/src --include="*.ts"` →
  l2Trace, l0aTrace, l0bTrace, l1Trace, cli/dev/main.ts,
  traceHarness.test.ts + the kit files themselves — all carried);
  `v3:typecheck` is the closing backstop.

```json
{
  "mutation_boundary": {
    "files": [
      "v3/src/domain/template.ts",
      "v3/src/definition/admit.ts",
      "v3/src/definition/admit.test.ts",
      "v3/src/kernel/kernel.ts",
      "v3/src/kernel/kernel.test.ts",
      "v3/src/testkit/storeCheckers.ts",
      "v3/src/testkit/storeCheckers.test.ts",
      "v3/src/testkit/traceHarness.ts",
      "v3/src/testkit/traceHarness.test.ts",
      "v3/src/cli/dev/main.ts",
      "v3/src/drift/domainRegistry.ts",
      "v3/src/l0aTrace.test.ts",
      "v3/src/l0bTrace.test.ts",
      "v3/src/l1Trace.test.ts",
      "v3/src/twoWorker.test.ts",
      "v3/src/l2Trace.test.ts",
      "v3/src/cli/journey.test.ts",
      "v3/src/testkit/templateFixture.test.ts",
      "v3/src/definition/validate.test.ts"
    ]
  }
}
```

## Row manifest (the D1 classification's machine face)

```json
{
  "packet_rows": {
    "rows": [
      { "id": "D1", "class": "anchored", "refs": ["contract:ch11-gate-format#C37", "contract:ch11-gate-format#C38"] },
      { "id": "D2", "class": "derived", "refs": ["contract:ch11-gate-format#C39", "prose:packet ch11-p2a"] },
      { "id": "D3", "class": "derived", "refs": ["prose:packet ch11-p2a", "contract:ch11-gate-format#C39"] },
      { "id": "A1", "class": "anchored", "refs": ["contract:ch11-gate-format#C39", "contract:ch11-gate-format#C38"] },
      { "id": "A2", "class": "anchored", "refs": ["contract:ch11-gate-format#C40"] },
      { "id": "A3", "class": "derived", "refs": ["contract:ch11-gate-format#C40", "prose:packet ch11-p2a"] },
      { "id": "A4", "class": "derived", "refs": ["contract:ch11-gate-format#C38", "prose:packet ch11-p2a"] },
      { "id": "K1", "class": "anchored", "refs": ["contract:ch11-gate-format#C39", "prose:l2-pseudocode/HANDLE"] },
      { "id": "K2", "class": "anchored", "refs": ["contract:ch11-gate-format#C38", "prose:v3/src/kernel/start.ts"] },
      { "id": "K3", "class": "derived", "refs": ["prose:plan §11.4 P2c row", "prose:packet ch11-p2b"] },
      { "id": "T1", "class": "anchored", "refs": ["prose:ledger §2 l2", "contract:ch11-gate-format#C39", "prose:v3/src/testkit/storeCheckers.ts", "prose:v3/src/testkit/traceHarness.ts", "prose:packet ch11-p2a"] },
      { "id": "T2", "class": "anchored", "refs": ["prose:plan §11.4 P2c row", "prose:v3/src/testkit/templateFixture.ts"] },
      { "id": "T3", "class": "derived", "refs": ["prose:plan §11.4 P2c row", "prose:v3/src/cli/journey.test.ts"] },
      { "id": "T4", "class": "derived", "refs": ["prose:packet ch11-p2b", "prose:v3/src/drift/domainRegistry.ts"] }
    ]
  }
}
```

## Pre-approval flags

None. Zero new-decision manifest rows (tally: 7 anchored / 7 derived /
0 new-decision) — every decision point this packet realizes was
resolved and RATIFIED at the ch11-gate-format reopen (the C38
default, the C40 realization split, the wrapper-only staging, the
§8.2 deviation clause); the staged remainder (the YAML key + the
source-form lanes + the shipped declaration + wrapper retirement at
P4; the process contract at P3; the per-transition-override half
unrealized per C41's ratified partial-realization disposition — the
model quote in the operative material carries the override clause,
and THIS is its by-name deferral) is the ratified plan's own cut,
stated as proof boundaries. No contested substrate premise exists
(the packet adds no parser-resting or driver-resting claim).

## Acceptance

- **Dimensions 1–6 and 8 test-driven (dimension 7 is
  typecheck+sweep-driven by its nature — the zero-hit measurement +
  `v3:typecheck`); every declared lane driven by name and ABLE TO
  FAIL (R-LANE-SENSITIVITY, checked once against these lane texts
  and once against the BUILT test bodies at close — the P2b lesson).
  TWO NAMED CLOSE-TIME sweeps are acceptance obligations, not prose:
  (a) the K1 retirement grep — `grep -rn "template.start" v3/src
  --include="*.ts"` re-run at close, its round-purpose subset EMPTY
  (the wrapped-inert-heuristic class: a fallback keyed on map-absence
  passes every behavioral lane because admitted maps are always
  complete — the grep is the lane that kills it); (b) the
  golden-integrity check — the four round-2 expectation lines
  byte-identical to their pre-build forms (zero golden edits,
  mechanically diffed):**
  - `kernel/kernel.test.ts` — dimension 1's three predicate lanes
    (the non-start declared target advancing; the declaration-absent
    start arrival NOT advancing; the start-omitting list's both
    halves) + dimension 2's kernel-grain default lane + dimension 8's
    CAS/confinement spot-checks.
  - `definition/admit.test.ts` — dimension 3's five lanes (empty
    list; unknown member; terminal member BY NAME; duplicates; the
    accumulation combination with a gate finding) + dimension 4's
    completeness grid (exact-map asserts: the two-source one-target
    fixture; the empty-transitions step; the all-false absent case)
    + the producer-monopoly hostile pair (pre-populated wrong maps
    with a declaration → recomputed; pre-populated true maps with no
    declaration → all-false) + the A4 input-purity drive (the round
    lanes run on a DEEP-FROZEN input; an input before/after
    deep-equality assert on the declaration object).
  - `testkit/storeCheckers.test.ts` — dimension 5's five checker
    lanes (multi-loop-back green; tampered round red; corrupt history
    red; absent-declaration loop-back reconstructs 1; the aggregate
    carries it).
  - `l0aTrace/l0bTrace/twoWorker/l2Trace` — dimension 6: the wrappers
    land, every golden table byte-identical, the l0a negative variant
    still fails red; `templateFixture.test.ts` (the pin) green
    UNTOUCHED.
  - `cli/journey.test.ts` — dimension 2's shipped-grain lane (the
    pass-back scenario, final `round === 1`).
  - the l2 trace — dimension 8's projection pin (threshold blocks at
    round 1, allows at round 2, under the wrapper declaration).
- **Behavior-change honesty:** the claimed deltas are EXACTLY: the
  round value on declaration-absent loop-back runs (advances → stays
  1), the two optional domain fields, the admission round lanes, and
  the checker; everything else is proven unchanged by the FULL
  existing suite green with zero golden-expectation edits.
- Drift tests green (standing, unconditional — PI-3): the rejection
  registry untouched (54); `unitMap.json` untouched;
  `domainRegistry.ts` `l2/WorkflowInstance` flipped with its witness.
- Coverage validation green: units 17/159 (unchanged), invariants
  16/116 (+ the checker row), traces 4/20 (unchanged).
- Bridges green at close: `v3:typecheck`, `v3:lint`, `v3:test`,
  `v3:coverage`, `v3:packet-lint` (--forbid-reopened: 0 reopened),
  `v3:adr-check` (no new ADR).
- Standing review rules in force: **REV-A1-TXN** (the commit txn
  untouched — the predicate feeds the same input), **REV-B-LOCAL-NOT-AUTHORITY**
  (the flags live on the pinned template value, never a process-local
  cache), **REV-C-PROJECTIONS-READONLY** (the checker reads
  floor-read data; the projection stays a read model),
  **REV-E-NO-ADAPTER-BRANCH** (no adapter branching enters),
  **REV-DIAG-FAILOPEN** (diag untouched).

## Build record

Approved 2026-07-12 on the AUTONOMOUS flag-free path (README §5.5) —
zero new-decision manifest rows, zero flags, every approve-time
tier-0 gate green, a clean FINAL close, and arm gate 1 clean on the
same final hash. The hash chronicle: R1 FULL bound `9e127981…` (five
lenses; the seams.template raw-premise defect + the C41 by-name
deferral gap + six sharpenings folded) → `33bf0349…`; R2 TARGETED
(lenses 1/3/5 + lens-4 recon; lens 2 skipped proven-unaffected) ran
clean with one twoWorker precision folded as bookkeeping →
`d0c39cc4…`; the first close ran CLEAN on it. ARM GATE 1
(agent-invoked codex, pin-conform gpt-5.6-sol/high/never, byte guard
clean before+after) returned `refine` with THREE findings — the
type-level `TraceSeams.template` narrowing (boundary 13→17), the
producer-monopoly hostile pair, and the manifest-hygiene set (D2's
grant citation, D1/A4's retention narrowed, T1's message demand
re-based) — folded; the arm's re-checks sharpened three remnants
across three rounds (the traceHarness.test.ts stub-catalog route
under the G1 testkit ban; A4 re-based on the P2a purity precedent +
reclassified anchored→derived, tally 7/7/0; the `satisfies` lint
form), each folded with lens-4 reconciliation; the arm's FOURTH
re-check returned CLEAN citing `143cfe3b…`; the FINAL close ran
CLEAN on the same hash. 2 counted panel rounds of the 8-round
watchdog; reconciliations, closes, and arm passes uncounted. All
internal passes Opus-class. Approve-basis disposition (the P2a/P2b
precedent): the approve-ready bytes = this file with this
`## Build record` restored to its placeholder + zeroed-metrics form.

Built the same day (delegated build round, the packet as the binding
contract @ `143cfe3b…`). ONE build-round packet correction (the
doc-refinement fold, boundary 17→19, packet → `f43106e1…`): the
builder STOPPED on a real detector-miss — `loadTemplate` returns the
ADMITTED value since P2a, so the two raw-vs-loaded round-trip pins
(the ch8-P2 equality pin; the validate exact-load literal) gained
admission's all-false maps on one side; resolved same-stage (the pin
re-binds against `admit(fixtureTemplate())`; the exact-load literal
gains the maps). **705 → 725 tests** (+20; zero golden-expectation
changes — the four round-2 finals and the l0a negative variant
byte-identical). Bridges at close (orchestrator-rerun, not
builder-claimed): `v3:typecheck` 0 errors · `v3:lint` clean ·
`v3:test` 725/725 · `v3:coverage` OK (units 17/159, invariants
16/116, traces 4/20 — exactly the acceptance numbers) ·
`v3:packet-lint` 0 errors (0 reopened) · `v3:adr-check` OK (14 ADRs,
no new ADR).
Sweep receipts at build close: the `template.start` round-purpose
subset EMPTY (the retired expression gone from `kernel.ts`); the
`round: 2` goldens byte-identical (4 hits + 2 new tamper-lane
literals in `storeCheckers.test.ts` — answered as a boundary
question); `advanceOnArrivalAt` hits = the new sites only. Every
dimension 1–8 lane driven by a named test; changed files (19) ⊆ the
declared boundary (the post-build audit is the mechanical witness).

**Aftermath (2026-07-12, ARM GATE 2 — the build-close implementation
review; pin-conform gpt-5.6-sol/high/never, verdict `refine` citing
the build sha `3edab71f`, byte guard clean):** three test-evidence
findings (green-but-blind lanes in the BUILT tests — the P2b
R-LANE-SENSITIVITY-binds-twice class recurring), folded in ONE
`fix(v3)` round: (1) **the invalid round admission lanes ran on
MUTABLE inputs** — only the valid-declaration purity test froze; a
validator mutating REJECTED inputs stayed green; fix: `admitRoundFail`
deep-freezes the whole input (template, steps, declaration, list) —
all five invalid lanes mutation-sensitive. (2) **the GATED rebuild
branch had no exact-map/monopoly drive** — the completeness grid and
both hostile pre-populated-map lanes used gateless steps; a
gated-only merge/stale-key regression passed; fix: a gated step
(valid threshold binding) + declaration + wrong pre-populated maps
incl. a stale GHOST key → `toStrictEqual` on the whole recomputed
map, both branches. (3) **the missing-STEP-ENTRY non-resolving
replay branch was undriven** (only the missing-transition form had a
lane); fix: a replay walking to a position with no step entry → a
violation naming the position, never a skip. 725 → 727 tests (two
new lanes; one strengthened in place); full bridges re-verified green
(orchestrator-rerun); the aftermath commit's post-build audit run
against the packet at its own sha.

```json
{
  "packet_metrics": {
    "class": "kernel-semantic",
    "prediction": { "predicted": "projection", "reasoning": "inherited from the ch11-P2 row through the sizing split; the round-format decision points resolved at the 2026-07-12 gate-format reopen — pure projection from the re-ratified C37–C40 rows + the model's round-semantics paragraph", "discovered": "projection" },
    "provenance": { "anchored": 7, "derived": 7, "new_decision": 0 },
    "rounds": { "review": 2, "doc_refinement": 1, "implementation": 1 },
    "stops": [],
    "detector_misses": [
      {
        "found_at": "refinement",
        "what": "the packet's T1 premise claimed seams.template already carries the admitted template; the built traces pass RAW templates there (the type admits them silently) — the wrapped goldens would have gone red with the checker reconstructing 1 against a stored 2",
        "why_missed": "the authoring verified the checker's consumption rule against the HARNESS CALL SITE's existence, not against the VALUE actually flowing through it"
      },
      {
        "found_at": "arm-approve",
        "what": "arm gate 1 found the per-call-site seam discipline weaker than C20's letter (the type-level narrowing), the producer-monopoly hole (the shared type permits pre-populated flags no lane drove), and three manifest rows obliging more than their anchors force (D1/A4 retention; T1's message demand; D2's grant left implicit)",
        "why_missed": "the internal lenses checked rows against the model and draft anchors but not against the BUILT sibling types' permissiveness (the P2b lesson recurring at the packet grain) nor against C20's exact wording"
      },
      {
        "found_at": "implementation",
        "what": "loadTemplate returns the ADMITTED value (since P2a), so admission's new all-false maps broke two raw-vs-loaded round-trip pins OUTSIDE the boundary (templateFixture equality pin; the validate exact-load literal) — the packet claimed the pin green untouched",
        "why_missed": "the confinement claim was verified against the pin's SOURCE files (fixture + YAML untouched) but never against the pin TEST's comparison STAGE — no lens traced what loadTemplate returns through the admission change"
      },
      {
        "found_at": "arm-build-close",
        "what": "three green-but-blind lanes in the BUILT tests: the invalid admission lanes ran on mutable inputs (purity driven only on the valid path); the gated rebuild branch had no exact-map/monopoly drive (all hostile fixtures gateless); the missing-step-entry replay branch was undriven (only the missing-transition twin had a lane)",
        "why_missed": "the packet's lane texts demanded the right meanings and the build realized weaker coverage on the halves/branches the texts did not enumerate member-by-member — R-LANE-SENSITIVITY re-applied at the BUILT bodies caught what write-time application missed (the P2b class recurring)"
      }
    ],
    "learned": "a confinement claim over a comparison test is checked against the comparison's STAGE (what flows), not the compared files; and a shared input/output type's permissiveness (pre-populatable fields) needs its own hostile lane the moment admission becomes the sole legal producer"
  }
}
```
