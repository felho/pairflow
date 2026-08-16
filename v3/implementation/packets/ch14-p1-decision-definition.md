# Task Packet: ch14-p1-decision-definition — the definition side: the step-class partition, the decision/wait declaration, the named hand lanes, the integer-key ban

Plan step: plan.md §14.4's `ch14-P1` row (the chapter's first packet;
order: draft ratification → P1 → P2 → P3).
Autonomy stage: measurement — inherited from the chapter header
(plan §14). Not first-of-a-kind as a PACKET class: format-extension
packets have precedent (ch11-P4, ch12-P4, ch13-p1a), and the schema
re-lock act inside the build has one too (ch13-p1a). What has NO
precedent is the re-lock's COEXISTENCE half — two contracts binding one
declaration file — which rides flag 5 with its measured receipt.
Classification: **projection** — manifest tally: 12 anchored / 3 derived
/ 2 new-decision (machine-counted from the `packet_rows` block). Both
new-decision rows ride to a human approve with `approve-ratified`
routes: D17 is a RESOLVED STOP VERDICT ruled 2026-08-15, and D11 is a
scope decision this packet takes in the open (which fields of a shared
type move now and which move with their consumers). No Case-B route
opens: two rows are not new-decision MASS, and neither subject —
an attribute grain in the declaration vocabulary with its load-time
guard, and the timing of a type relaxation — touches authority,
separation or availability-class semantics. Routing a decision the human
has already made into a contract-draft round would ratify it twice.
Prediction and discovery agree (plan §14.4 predicted `projection`, basis
now resolved: the ratified `ch14-human-decision` contract).

## Reading rule

This packet is POINTER-ONLY on the division its two authorities state:
every STRUCTURAL rule of this surface lives as DATA in
`v3/src/definition/schema/templateFormat.ts`, byte-locked at sha256
`fa8bc5a2…`; every SEMANTIC rule lives as a C-row in
`contracts/ch14-human-decision-contract.md`, byte-locked by the same
ratification blocks. A row below CITES its authority and adds only what
projection adds — placement, realization route, and the build decisions
the cited row leaves open. Re-wording a cited rule is a defect even
when the wording is better.

HANDOVER, stated because the reading rule makes it load-bearing: the
build's context — delegated or main — carries this packet AND the two
authorities named above. A build handed the packet alone would have to
invent the cited keysets, and the "do not re-word" discipline is what
makes that failure silent. The two `ch13-context-block-v2` anchors
(D8's travel discipline, D11's type grain) are NOT a third handover
item: both rows carry their operative content in full.

Two disciplines govern what this packet STATES. **Necessity precedes
truth:** each sentence earns its place by the delegation litmus — what
does the builder get wrong without it? **A set the tree regenerates is
not stated:** where the compiler, the suite or the declaration
re-derives a membership for free, this packet states the DERIVATION
RULE and its owner, plus the floor where one is measured — never a
hand-assembled list.

## Ledger slice (declared — feeds the coverage accounting)

```json
{
  "ledger_slice": {
    "units": [
      { "id": "l3-pseudocode/validate_decision_gates", "disposition": "implement" }
    ],
    "rejections": [],
    "invariants": [],
    "traces": [],
    "shared_ownership": []
  }
}
```

`validate_decision_gates` is `implement` rather than `generated/mapped`:
its per-type rules are NOT expressible in the declaration vocabulary
(D3), so the unit's load-bearing half realizes as named hand lanes in
the audited residual's module, with the ordinary field grammars riding
the schema beside them. `rejections` is EMPTY by the chapter's own
letter — this surface mints definition ISSUES, never registry names
(D8); the registry's own untouched-ness is D12's claim and the drift
bullet's assertion. `invariants` and `traces` are EMPTY: all eight `l3`
invariants are homed in kernel rows (C13–C18, C4+C11) and the `l3`
golden trace is the kernel and activation packets' — D15 names the
split once.

## Operative material (full text — projection, not invention)

`v3/model/units/l3-pseudocode/validate_decision_gates.txt`, VERBATIM:

```

# Loader-owned schema validation: this sketch names the load-bearing invariants the kernel requires from
# the pinned template; it is NOT a full JSON Schema. It is this detailed because each rejected shape would
# change runtime SEMANTICS (a dropped required field, a misrouted decision), not merely form. Further lexical
# refinements (valid-identifier decision keys, field-name conventions) belong to the later general template schema.
validate_decision_gates(template) → ok | issues                     # L3 — definition load (CREATE_INSTANCE); the generic decision vocabulary must not be a loose string-map. Fail at create, beside validate_gate_config / validate_context_refs
  FOR step IN human_gate_steps(template):
    IF step.decisions is absent OR step.decisions is not a map THEN RETURN issue(invalid_decision_gate_config)   # the decisions map must be a map (not a scalar/list) — a human_gate's transition vocabulary
    IF step.decisions is empty THEN RETURN issue(decision_gate_empty)              # ...and must offer at least one decision
    FOR (key, choice) IN step.decisions:
      IF choice is not a map                   THEN RETURN issue(invalid_decision_gate_config)   # each decision entry must be a map { target, payload? }
      IF keys_of(choice) ⊄ { target, payload } THEN RETURN issue(invalid_decision_gate_config)   # CLOSED entry — an unknown key (e.g. a `paylod` typo) silently dropping the required-instruction rule is rejected, not ignored
      IF template.step(choice.target) is none  THEN RETURN issue(decision_target_unresolved)   # every decision routes to a declared step
      IF choice.payload is present AND choice.payload is not a map THEN RETURN issue(invalid_decision_payload_schema)   # the payload schema itself must be a map (absent is fine) — not a scalar/list (e.g. payload: true / "instruction")
      FOR (field, spec) IN (choice.payload ?? {}):                    # MVP payload schema is minimal + CLOSED: per field only { required: bool } — keeps the generic map from being a loose string-map
        IF spec is not a map                           THEN RETURN issue(invalid_decision_payload_schema)   # the field spec must be an object { required: bool } — not a scalar (e.g. instruction: true / "required")
        IF keys_of(spec) ⊄ { required }                THEN RETURN issue(invalid_decision_payload_schema)   # no nested types / unknown schema keys yet (e.g. type: markdown)
        IF spec.required is present AND spec.required NOT IN { true, false } THEN RETURN issue(invalid_decision_payload_schema)   # required must be a bool (e.g. NOT "yes")
  FOR edge IN transitions_with_recommends(template):                  # `recommends` is meaningful ONLY on an edge whose target is a human_gate
    IF NOT is_human_gate(template, edge.target) THEN RETURN issue(recommends_on_non_gate)
    IF edge.recommends NOT IN keys_of(template.step(edge.target).decisions)
       THEN RETURN issue(recommends_unknown_decision)              # a recommendation must name an existing decision key of its target gate
  RETURN ok
```

Three model-relation deltas bind on this text, each ruled by a cited
row and none re-litigated here: the sketch's first-issue RETURN is
control flow and the realized family ACCUMULATES (C8); the sketch's
`template.step(target)` is resolution shorthand and the realized
decision-target domain is `steps ∪ terminal` (C4); and the unit
header's "definition load (CREATE_INSTANCE)" placement is resolved for
ADMISSION (the contract's Context (d), plan §14.1).

Rejection strings: NONE. The six names this unit emits are definition
ISSUE codes in the `[d-codes]` namespace (D8), not registry rejections.

## Claim

A template's human-decision and bare-wait DECLARATION surface is
decided ENTIRELY at admission, on both channels: the step space is
partitioned into three classes whose keysets are closed, the decision
and wait vocabularies are validated to the grain the kernel will later
rely on, and the one id grammar refuses every spelling whose
enumeration order the runtime cannot trust — so a successfully admitted
template carries exactly the decision/wait forms the kernel reads, and
every refusal is a definition issue reported at its declared path,
carrying one of the six machine names on exactly the lanes
→[code-table] assigns it and on no other.

The five guarantees this packet is answerable for:

1. **Every lane this surface owns actually fires, every lane that must
   stay silent does, and each carries the code it owns and no other** —
   the declared node lanes, the named hand lanes, and the re-homed
   role-set equality — on both channels, through the real admission
   entries, in both directions, with a broken container yielding its own
   finding and nothing beneath it, and with the six names riding only
   the lanes →[code-table] assigns them, at the grain →[code-grain]
   admits, all the way to the CLI document (→[lane-drive],
   →[suppression]).
2. **The class partition is total and fail-closed**: a key legal on one
   class is REFUSED on the others, the declared presence relaxation
   loses no finding because the hand lanes re-impose it, an unknown
   `type` value or an unknown key is refused on both channels, and the
   admitted value carries the STORED token the map assigns
   (→[class-partition], →[lane-drive]).
3. **The ban binds wherever the one grammar is cited**, its three named
   exclusions untouched, and its single measured consumer is REWORKED
   rather than weakened (→[ban-carrier]).
4. **Nothing else moves** — no verdict, path or message outside the ONE
   named delta and the three carrier moves (→[parity-corpus]), the
   rejection registry byte-untouched (D12), and the admitted form's
   growth measured rather than assumed.
5. **The declaration itself is loud, and what it produces is right** —
   a declaration that names an operand it cannot reach (D10's hook
   guard), that carries an attribute the vocabulary does not admit at
   that position (→[loud-guard]), or that names a code outside the
   declared namespace (→[namespace-check]) FAILS at declaration load;
   and the admitted form the widened hook produces carries every edge of
   every class with an explicit flag (D10). This guarantee is answerable
   at a different stage from 1–4, which is why it is stated rather than
   folded into them.

Dimensions (enumerated before any test row — R-DIMENSIONS):

1. **Channel** — direct construction vs the file walk. Every guarantee
   is asserted on both. The channels differ in TWO OUTCOME classes and
   no third: the `type` token DOMAIN per C1's authored↔stored map (D2 —
   each channel renders and admits its own spellings), and the standing
   produced-field carve-out (→[produced-carve-out]). They differ
   additionally in which CASES are expressible at all — the file
   channel alone can author a non-string key, a duplicate key, or a
   source-form violation — which is a reachability difference, not a
   difference in what an expressible case yields; the in-context note
   enumerates those.
2. **Step class** — agent (absent `type`) / `humanGate` / `wait` /
   present-but-invalid `type`, crossed with dimension 3. The fourth
   state is a class state, not a value error only: what the class hand
   lanes do when the discriminator itself is unusable is a rule (D2).
3. **Keyset lane** — unknown key / missing required key / value lane,
   per class. The declared node carries every class's fields
   (→[class-partition]), so every cell in this cross-product is decided
   by a hand lane, a declared lane, or both — D3 fixes which, including
   the two-finding cell where a class-refused key also fails its own
   declared lane.
4. **Presence source** — declared lane vs hand lane. The relaxation
   creates a THREE-sided risk: BOTH silent (a lost finding), BOTH
   firing where the rule wants one, and NEITHER-but-noisy (a dependent
   lane whose operand vanished reports an internal validator failure
   instead of an authoring finding — measured, PROBE-CH14P1-5). Every
   relaxed key and every operand-dependent lane is driven for exactly
   one.
5. **Container state** — absent / present-wrong-kind / present-empty /
   present-populated, per container (`decisions`, a decision entry,
   `payload`, a field spec, `wait`, `resumeEvents`, `onResume`,
   `recommends`), crossed with the suppression rule ch8-C21 gives it
   (D7).
6. **Accumulation** — findings from independent positions accumulate;
   findings under a broken container do not. The pair is driven
   together, since an implementation that short-circuits passes every
   single-fault fixture.
7. **Code carriage** — the six names against the lane set
   →[code-table] assigns them, the GRAIN each rides (→[code-grain]),
   the namespace membership every declared code owes
   (→[namespace-check], canonical D8), and the code's VALUE at the CLI
   document's far end (D8). Guarantee 1 owns this dimension.
8. **Id-grammar membership** — the in-class members (the canonical
   decimal spellings of 0…2³²−2) against the non-members, whose
   membership is MEASURED: PROBE-CH14P1-2's enumerated sample minus
   `1.5`, which is a ban-class non-member the STANDING dot ban already
   refuses and which rides as that control rather than as a legality
   case. Crossed with the citing positions, stated at TWO grains
   because a family parameterized over the wrong one misses the bug it
   exists to catch: the id CLASSES are step id, terminal id, role name,
   event type, decision key, payload field name and wait kind — SEVEN,
   since a resume-event member IS an event type (C10, D9); the
   POSITIONS are every declaration NODE citing a class — today five (a
   role name occupies two), after this build the decisions key class,
   the payload field-name key class, the wait kind, the resume-event
   member and the recommends VALUE join them. A gates KEY is
   deliberately not a citing position — that node declares no key class
   and is constrained transitively by its dead-config lane; the
   `recommends` KEY likewise inherits the ban only through its subset
   lane.
9. **Cross-position reference** — five reference rules whose operand
   lives outside the node being validated (decision target ∈ steps ∪
   terminal, D4; `onResume` keys ⊆ `resumeEvents`, D5; `recommends`
   keys ⊆ `keys(transitions)`, the recommended edge's target is a
   `humanGate`, and the recommended VALUE ∈ that gate's decision keys,
   all D16), each with its own broken-operand and ABSENT-operand
   behaviour.
10. **Role-set arity** — the equality's two directions crossed with
    role-LESS steps (a `wait` step contributes nothing), with the
    grammar-invalid suppression the declared lane carried, and with a
    broken `steps` container (D6).
11. **Non-movement**, at two grains — verdicts/paths/messages on the
    standing corpus, and the admitted VALUE's own re-pin set (D14).
12. **Declaration-load loudness** — attribute × kind × POSITION
    (admitted vs refused, →[inventory-key]), operand reachability
    (D10), and code namespace membership (→[namespace-check],
    canonical D8), each on a declaration the build authors for the
    guard rather than on the shipped one.
13. **Produced-form correctness** — the three edge classes crossed with
    the advance/no-advance declaration, on the admitted value the
    widened hook computes (D10).

## Canonical rows

| ID | Rule |
|---|---|
| D1 | **Scope: the declaration is this packet's BASIS and its subject.** The template surface's declaration is live and byte-locked at the ratifying basis (`templateFormat.ts` sha256 `fa8bc5a2…`, recorded by BOTH bound contracts on the same bytes — each at its own act's commit); this packet GROWS it at the nodes the contract's Context enumerates and re-locks it at build close (D13). Restating a declared attribute in this file is a defect (ADR-019 D4). The intended TAG spellings the Context names are the realizing act's to fix, and the citation closure over the grown nodes closes at the CHAPTER close, not here — the exemption that carries is taken by D13's act, never asserted by this packet |
| D2 | **The step-class discriminator.** Anchor: `contract:ch14-human-decision#C1`. `type` joins the step node as an ordinary ADDITIVE OPTIONAL field — an `enum` carrying the authored↔stored token map, the live `[d-act-mode]` precedent read whole: a token whose authored and stored spellings DIFFER is realized as two channel-scoped members (`humanGate` on the file channel, `human_gate` on the direct channel, whose input IS the domain type), and a token IDENTICAL on both sides is ONE unscoped member with its `store` (the `immediate` precedent) — so `wait` is a single member rather than a duplicated pair, while each channel still renders its OWN spellings (the enum lane filters members by channel before rendering, so identical `{members}` text across channels is neither expected nor asserted). The precedent is read whole in its OTHER half too: `[d-act-mode]`'s live pins assert the ADMITTED value carries the STORED token, which is what the `store` half of the map is for and what family 1 drives here. An ABSENT `type` is the agent class and no `agent` token is minted. THE TRAP THIS ROW EXISTS FOR: the declared step node holds the UNION of the three classes' fields, so the declaration alone would admit `decisions` on an agent step and `role` on a wait step — the partition is enforced by D3's hand lanes and by nothing in the schema, and a builder who reads the declared keyset as the class keyset ships a surface that accepts every cross-class form. An unknown or wrong-channel `type` VALUE draws the enum lane and GATES the class hand lanes — one finding, never an enum finding plus a cascade of agent-class presence findings for a step whose class was never decided — and the gate is computed PER STEP from that step's own discriminator, never read off the engine's template-wide failed-tag set, which would stand every other step's class lanes down with it. The agent class's own container message is held BYTE-IDENTICAL (D14): class-specific wording rides the hand lanes, which is what keeps the message-parity claim true |
| D3 | **The per-class keysets, and the presence relaxation that pays for them.** Anchor: `contract:ch14-human-decision#C2` and `#C3` (the keysets and the expressibility ruling), `#C8` (the family they live in). The type-conditional rules are NOT expressible: no field-discriminated union exists in the vocabulary, and minting one for a single declaration position fails ADR-019 D7's ≥2-position test — so each class's closed keyset is a NAMED HAND LANE in the audited residual's module, beside the lanes already wired into that finding stream, and the residual family they join is **R7** (rows whose only declaration would use a single-use construct — the family C2 names as the designed home). That module's own residual documentation grows by this member in the same edit, and the SAME edit corrects the stale R7 label wherever it names the uses-scoped source ladder, which the expressiveness audit reclassified to R8 while declaring R7 resolved-empty: SIX sites, measured — four in the residual module (its header twice, and two lane comments), one in the declaration module's header, and one in the admission module's pointer comment, which is why that module joins the mutation boundary for a comment-only visit. The declaration module's header carries a THIRD stale sentence the same edit repairs: its claim that every node realizes a re-expression row of the audit, which this chapter's nodes are the first not to (the audit document itself is deliberately NOT edited — it is a phase record, and its own ruling is what the comments are being corrected against). The three keysets, spelled once here because they are this packet's primary deliverable and live nowhere else in it: the AGENT class carries `role`, `instruction`, `transitions`, plus optional `agentConfig`, `gates`, `recommends`; the `humanGate` class carries EXACTLY `type`, `role`, `instruction`, `decisions`; the `wait` class carries EXACTLY `type`, `wait`, `onResume`. Presence per class: every key of the two new keysets is REQUIRED — including `onResume`, which is required BUT legally empty (D5), the one pair a builder reads as optional. THE CARVE-OUT: the class keysets bind the AUTHORED document on both channels, while the ADMITTED form additionally carries the standing admission-produced channel-direct fields (`advancesRound`, the ch13v2 produced ref positions) — producer-owned, never authorable, outside every class keyset by the standing rule C2 states; a hand lane written to the literal keyset would refuse a re-admitted admitted value, which the tree already pins as legal on the direct channel. The declared side pays three prices, each a named build duty: `role`, `instruction` and `transitions` flip declaration-OPTIONAL (a required-key lane cannot be class-conditional); the hand lanes RE-IMPOSE their presence per class; and every declared lane whose OPERAND those keys were is re-checked under the now-optional operand — the gates subset lane over `^.transitions`, the role-set equality's collect (D6), and the two lanes THIS packet adds whose operand is class-scoped (D5's, D16's). ONE COMPOSITION RULE, because the hand lanes run AFTER the declared ones and may only ADD findings, never retract a declared one: a class-refused key that ALSO fails its own declared lane draws BOTH findings — the declared value or container lane and the class refusal — two findings for one authored mistake, by construction and not a defect to suppress; its converse holds too, so a class-refused key whose value SATISFIES its declared lane draws the class refusal alone. The failure modes to drive are therefore the SILENT one, the WRONGLY-DOUBLED one and the NOISY one (dimension 4) |
| D4 | **The decision vocabulary's declarable half.** Anchor: `contract:ch14-human-decision#C4` (the ChoicePoint at the shared grain and the `decisions` instance) and `#C5` (the payload spec). What rides the schema: `decisions` as an open map whose KEYS carry the id grammar (D9); its entries as closed maps `{ target, payload? }` with an unknown entry key refused; `target` REQUIRED, its absence drawing the entry's missing-key lane and its presence-but-unresolvable drawing the membership lane on the live `[d-target]` precedent read whole — no type message there, so a non-string target IS the membership fault and ONE finding covers both — over the union selector `steps ∪ terminal`; `payload` as an open map of field name → spec, field names carrying the id grammar; and each spec as a closed map whose single optional `required` is an `enum` of the two BOOLEAN members. That last realization is measured, not assumed (receipt PROBE-CH14P1-1, both channels): the vocabulary's enum members are already value-typed, so `{ required?: bool }` needs NO vocabulary growth for its VALUE lane, `{members}` renders `true, false`, and YAML 1.2's unquoted `yes` arrives as a STRING and is refused — which is the model's own `NOT "yes"` case, driven by the substrate rather than by a hand check. Every lane of this row that carries a code carries it at the grain →[code-grain] admits and →[code-table] assigns. A decision route naming its OWN gate is admissible — C4's self-target, which genuinely re-arrives — so the membership lane's conforming side includes it and an over-zealous self-loop refusal is a defect. What does NOT ride the schema: the `decisions` key's CLASS restriction, its presence on a `humanGate`, and the ≥1-decision floor — the first two because they are type-conditional (D3), the third for a reason that is not expressibility at all and is stated so no builder re-derives it wrongly: the vocabulary's list/map `nonempty` attribute exists and would express the floor, but it carries NO code grain, and →[code-grain]'s widening stops at the container and unknown-key grains, so a declared floor could not carry `decision_gate_empty`. The floor is therefore a hand lane BY CODE CARRIAGE, and declaring `nonempty` on `decisions` beside it would double the finding |
| D5 | **The wait declaration, split by what the vocabulary can say.** Anchor: `contract:ch14-human-decision#C3`. DECLARABLE: `wait` as a closed `{ kind, resumeEvents }` map, BOTH fields required; `kind` an id-grammar string; `resumeEvents` a nonempty list of id-grammar members with the per-occurrence uniqueness the live `unique` attribute expresses; `onResume` as an open map to a target in the same `steps ∪ terminal` domain, its keys constrained to the declared resume events by the `keysSubsetOf` relation over a SIBLING'S NESTED list — measured to resolve (receipt PROBE-CH14P1-3), so the dead-route rule is a declared lane and not hand code. That lane's operand is class-scoped, so it carries the declared `whenOperandAbsent: "skip"` knob: without it, a step authoring `onResume` with no `wait` answers `internal validator failure` instead of the class hand lane's honest finding (measured, PROBE-CH14P1-5). NOT DECLARABLE, and therefore a named hand lane in D3's family: the reservation of the KERNEL-OWNED wait kinds — no selector reads a constant set. The reserved set is homed as ONE named constant whose membership OWNER is ch12-C23 as that row's text stands (today `kickoff_pending`, `human_decision`, `child_workflow`, `timeout`; never a count in this packet) — AUTHORED from that row, never derived from the runtime wait-reason union, which carries one member at this basis and would silently under-reserve three kinds while family 8 passed green. A later kernel kind extends the constant in its own chapter, and family 8 drives every member of it. The degenerate cases are ADMISSIBLE by measurement: an `onResume` missing a route for a declared event, the empty `onResume` map included, admits — the runtime's `no_resume_transition` stays reachable, which is C3's deliberate choice and not an omission to repair; `onResume`'s own PRESENCE is required nonetheless (D3). NO lane of this row carries a code (→[code-table]) |
| D16 | **The recommendation attachment.** Anchor: `contract:ch14-human-decision#C6`. `recommends` is realized as an edge-keyed SIBLING map on the SOURCE agent step (the `gates` precedent — the format's transition values are plain targets, so an edge attribute attaches as a sibling map), an open map event-type → decision key, legal on the AGENT class only (D3's two closed keysets exclude it elsewhere), its VALUES carrying the decision-key grammar (D9's id class) and its KEYS inheriting the ban only transitively, through the subset lane. Three rules, split by expressibility exactly as D3 rules: `keys ⊆ keys(transitions)` is DECLARABLE — the same `keysSubsetOf` shape the gates dead-config lane uses, carrying the `whenOperandAbsent: "skip"` knob for the now-optional operand (D3) — while "the referenced transition's TARGET is a `humanGate`" and "the VALUE ∈ that gate's declared decision keys" are two-hop dereferences over a REMOTE node's class and keys: no member of the declared selector vocabulary (`keysOf`, `valuesOf`, `validKeysOf`, `collect`, `union`, `injected`) resolves a value to a node and then reads a field on it, so both are hand lanes in D3's family, and they are the home of the two `recommends` codes →[code-table] assigns. Those two hand lanes STAND DOWN where their own operand is absent — a `recommends` map on a class that refuses it, or an agent step with no `transitions` — because the class refusal or the missing-key finding is the honest one and a second finding at a remote path would mis-address the author |
| D6 | **The role-set equality, re-homed.** Anchor: `contract:ch14-human-decision#C7`(a). The declared `[d-roleset]` cross-rule RETIRES in the same edit that lands the hand lane, because its `collect` over `$.steps.*.role` has no per-member absence tolerance and the only existing knob would disable the equality for every wait-bearing template. The re-homed lane is absence-tolerant by construction — a role-less step contributes nothing to the used set — and carries over THREE properties of the retired declaration that a rewrite silently drops, each of them readable in the declaration and the engine at this basis: the two directions with their DIFFERENT path grains (used-but-undeclared at the container, declared-but-unused at the entry — the two `at` values the retired rule declares); the grammar-invalid SUPPRESSION the two role nodes' `gating: true` gave it; and the BROKEN-`steps`-CONTAINER stand-down, which today comes from the engine's UNRELIABLE-operand rule — silence — and NOT from its undecided-operand rule, which reports an internal validator failure and is the path PROBE-CH14P1-5 measures; the two are opposite outcomes, and a lane built off the wrong one ships an internal-failure message where the declaration was silent. The parity corpus cannot catch that on its own: its only broken-`steps` case pairs it with an empty roles map, where both directions are empty regardless, so family 8 drives the discriminating case (a broken `steps` container beside a NONEMPTY roles map, asserting silence). The lane reads the engine's reliability signal, which the residual already consumes for another lane, so nothing new crosses that boundary. It carries no code. CONSEQUENCE, recorded because it is invisible from this file: the live surface's `crossRules` array becomes EMPTY, which the engine already supports (its own guard suite constructs empty-cross-rule surfaces), and the `equals` relation's machinery keeps only synthetic drivers — a fact for the boundary, not a repair for this build (flag 9) |
| D7 | **The finding form of the definition-static family, and the CODE TABLE.** Anchor: `contract:ch14-human-decision#C8`, whose three decisions this row PLACES and does not re-word: findings ACCUMULATE in the validate stage as `{path, message}` entries with dotted paths at ch11-C7's index grain; this chapter's containers join ch8-C21's container-precondition rule WHOLE, so a container that is missing-where-required or not its required kind yields its own finding and SUPPRESSES its dependents (`decisions: "x"` is ONE finding, never a key-iteration cascade); and the code question C8's container sentence leaves open resolves by the MODEL'S LETTER, which is what that sentence defers to. THE TABLE is this packet's single statement of which lane carries which name, and its completeness is CHECKABLE rather than asserted: its membership is the model unit's own `issue(...)` sites — eleven of them, six distinct names — with exactly two anchored splits, C8's split of the `decisions` absent-or-not-a-map site into a presence lane and a container lane, and C4's ruling that an ABSENT `target` is the entry's missing-key refusal in the same shape family; eleven sites plus two splits is thirteen lanes, and a fourteenth would be an invention. **`invalid_decision_gate_config`** — the `decisions` container lane (declared), the `decisions`-absent-on-a-`humanGate` presence lane (hand), the decision-entry container lane (declared), the decision-entry unknown-key lane (declared), and the entry's missing-`target` lane (declared); **`decision_gate_empty`** — the ≥1-decision floor (hand, D4); **`decision_target_unresolved`** — the target membership lane (declared); **`invalid_decision_payload_schema`** — the `payload` container lane, the spec container lane, the spec unknown-key lane and the spec `required` value lane (all declared); **`recommends_on_non_gate`** and **`recommends_unknown_decision`** — D16's two hand lanes. Every OTHER lane of this chapter is code-less, including this chapter's four remaining containers (`wait`, `resumeEvents`, `onResume`, `recommends`) and every class-keyset and presence lane not named above; container lanes on OTHER surfaces are untouched. THE READING THIS TABLE TAKES, stated because C8's own sentence calls the decisions/entry lanes "hand lanes" while C2 rules that C4's field grammars ride the schema: the contract's phrase names the FAMILY these lanes report in, not their realization, and the realization follows C2's ruling — declared where a grammar can express it, hand where it cannot. Realizing them twice would double the finding C8's own container rule says is ONE, which is what makes the alternative reading self-defeating rather than merely different (flag 2). The suppression half is measured on the declared side (receipt PROBE-CH14P1-3: a broken `wait` container yields its container finding alone and the dead-route lane stands down), and the hand lanes owe the SAME discipline — which is what dimension 6 drives, because a hand lane written as a straight walk accumulates where the declared engine suppresses |
| D8 | **The code namespace and the travel.** Anchor: `contract:ch14-human-decision#C8` (the code set) and `contract:ch13-context-block-v2#C18` (the travel discipline). The `[d-codes]` node grows by the six model-verbatim names, its `rows` attribution grows by this contract, and the SAME edit corrects that node's stale "disjoint from registry names" comment — the disjointness claim is false of the token sets today (two pre-existing names overlap) and the row rests on the MEASURED absence of all six from the 54-name list instead. Every code any node declares must be a member of that namespace, checked at declaration load — a standing promise whose enforcement →[code-grain]'s new position must join, because today a code at a container lane escapes it entirely (measured, D17). The exclusivity — no lane outside →[code-table] carries a code — is what the negative half drives, and after the widening it must be driven DECLARATION-WIDE rather than chapter-wide: the attribute becomes legal at the container and unknown-key grains on every node of the surface, so a code landing on a pre-existing node is a defect no chapter-scoped inventory reaches (family 5). The travel half is placement only: the carrier exists end to end (`ValidationFinding.code`, `TemplateLoadError.toJSON`'s `{stage, findings}` document, the dev CLI's validate verb, whose coded-finding lane is the live precedent), so the build adds lanes and no code — the positive asserting the code FIELD's VALUE by equality on a ch14-only fixture, never presence and never a containment over the serialized text |
| D17 | **The code GRAIN, and the guard that makes an unadmitted attribute loud — DECIDED HERE: a resolved STOP `1:open-choice`, ruled by the human 2026-08-15 with two binding conditions.** MEASURED at authoring (receipt PROBE-CH14P1-6, and re-measurable in three greps: `code?` appears in `vocabulary.ts` at the membership rule, the `presence` block and the `enum` node, and the declaration-load namespace check guards exactly those three sites): the declaration vocabulary admits a `code` attribute at those three grains and at NO container or unknown-key lane; a `code` authored at a container lane is accepted at load and silently dropped at runtime — AND, measured with it, a code that is not even a member of the declared namespace is accepted there too, where the same code at an enum grain is refused. So C8's stated exception is not expressible as written, and the position that would express it also escapes the standing namespace check. THE RULING: the vocabulary widens — `code` becomes legal at the CONTAINER-lane and UNKNOWN-KEY-lane grains, an existing attribute at a new grain (the ADR-019 D11 shape, not a new construct), whose ≥2-position case is the lane set →[code-table] assigns: SIX declared container/unknown-key positions (the `decisions` container, the decision-entry container, the decision-entry unknown-key lane, the `payload` container, the spec container, the spec unknown-key lane), so each widened grain carries ≥2 on its own. The ADR tally records the widening at the grain its spelling resolves to — flag 6(e) leaves the spelling to the build, and one node-grain attribute serving both lanes of a fixed map satisfies the same test at four nodes. The new position JOINS the namespace check (→[namespace-check]) in the same edit. CONDITION 1: the widening is RECORDED in ADR-019 D7's admitted-so-far tally, inside the same amendment act this packet already opens for D10's edge-source widening — one act, two recorded widenings. That record is an UNGUARDED NAMED DUTY: `pnpm v3:adr-check` validates statuses, references and index consistency and reads neither the tally nor the amendment log, so no gate catches its omission (the same reason D12's flips are named). CONDITION 2: the load guard makes the DEFECT CLASS loud — an attribute the vocabulary does not admit at a node's position FAILS at declaration load with an explicit error naming the attribute and the node. Its realization is an ADMITTED-ATTRIBUTE inventory keyed on attribute × kind × POSITION, fail-closed by construction: a vocabulary attribute added later without its inventory entry is REFUSED at its first use, which is loud and self-correcting, its INVERSE — an inventory entry whose reader was deleted — is NOT closed by the inventory and this row does not claim it is: an allowlist cannot see an absent reader, so that direction is a build-close SENSITIVITY duty under the standing mutation-probe protocol (remove the reader, keep the entry, observe the acceptance lanes the reader feeds — the guard itself cannot see its own missing reader), receipt-backed like every other probe of that protocol, and family 9 carries it as a build-record member rather than an acceptance lane. Its CARRIER is the plan's `ch14-P1` row, which holds it as a tracked build-close item (the ratifier's addition at this packet's flag-2 approve): the receipt is collected from that row, never from this prose, so a build close cannot discharge it from memory. The human's condition is met by the direction it names — an AUTHORED attribute the vocabulary does not admit at that position fails loud — and the packet claims no more. THE POSITION KEY IS NOT OPTIONAL, and a kind-only inventory would leave the condition unmet — measured (receipt PROBE-CH14P1-7): `presence` on a `string` FIELD of a fixed map is legitimate and fires, while `presence` on a `string` ENTRY of an open map loads clean and produces byte-identical findings with and without it, so ONE kind carries the same attribute as both a live and an inert case and no kind-keyed allowlist can separate them. The position grain is the vocabulary's own: ADR-019 D11 already legislates applicability in exactly these terms, and the guard's three existing refusals are each position-scoped (`channel` and `default` off a fixed-map field, `presence` on a plain-map typed field), so this widens their pattern rather than inventing one. TWO consequences of the position key, both stated because a kind-grain reading gets each backwards. First, the guard's LIVE TERRITORY grows: an attribute a kind's interface does not declare is a compile error at any typed literal, but a POSITION-illegal attribute is type-legal by construction — `presence` is declared on the shared node base and an open map's entry is a full node — so the position half reaches ordinary straight-authored declarations and not only cast-authored ones. Second, a node CONSTANT reused at two positions must carry only attributes admitted at BOTH; every constant in the declaration is single-position at this basis (a spot check, not a receipt), and this build puts three class keysets on the one step node, so the rule is stated before it binds. CONSEQUENCE, priced into the ruling: `engine.ts` and the load guard are inside the mutation boundary, and the engine growth is exactly this widening plus D10's |
| D9 | **The integer-key ban.** Anchor: `contract:ch14-human-decision#C10`. The carrier is the ONE id grammar at `[vc-id-class]`, which every id class this chapter adds cites (decision keys, payload field names, wait kinds; resume-event members are event types), so the ban lands in ONE place and reaches every position by citation. FEASIBILITY, measured at this authoring rather than discovered at build (receipt PROBE-CH14P1-2): the class — the canonical decimal spellings of 0…2³²−2 — is expressible as a single negative-lookahead alternation inside the existing `grammar.re` attribute, needing no new attribute and no engine change; over the enumerated sample the refusal set and the JS own-key HOIST set coincide exactly, with `"1.5"` the sole divergence and it is the STANDING dot ban's, not this clause's. The grammar's MESSAGE renders no `{grammar}` placeholder, so its ban clause is an AUTHORED edit — the one delta D14 names, and a delta whose ABSENCE is equally a finding. The three named exclusions stay untouched, and they divide by whether this packet's surface can drive them: the delegated gate-config schemas' own keys and the type-level `capabilityProfile` position are DRIVEN in-boundary, while the `runOverrides` surface is a NO-LANE exclusion — a create-instance input surface this packet's admission walk never reaches, which C10 itself rules "no new lane, the ratified ch12 disposition unmoved", so it is asserted by that disposition and not by a test this boundary could host. MIGRATION: the sweep re-runs at the build under the contract's own membership predicate — a CONSUMER is a site whose asserted outcome depends on an in-class key standing in an id-namespace position — and the site COUNT is the re-run's to produce; what is pinned here is the disposition per class. The one consumer measured at authoring is the boundary-pin fixture that admits `"10"` as an event type, which is REWORKED (the in-class pin flips to an admission-refusal assertion; the no-hoist half stays pinned by `"01"` with a new `"4294967295"` case joining it) — that fixture carries the in-class key in two positions and both move. Every OCCURRENCE site whose assertions turn on other lanes is RE-CLASSIFIED by the re-run, not rediscovered |
| D10 | **The round-expansion basis, widened — DERIVED.** Anchor: `contract:ch14-human-decision#C11` (the widening and its ADR class) and `ADR-019` D11. The `[n-advances-round]` hook's edge SOURCES widen from `transitions` alone to all three edge classes, with per-class target extraction (a `decisions` entry's target sits under its `target` key; an `onResume` value IS the target) — without it a rework loop-back could not open a new round. DERIVATION NOTE: C11 rules the widening and its ADR-019 class; what this row adds is the act's PLACEMENT — the amendment RIDES this packet's build commit (the ADR file inside the mutation boundary), because C11's ratification already admitted the widening and the ADR section RECORDS it, where ch13-p1a's prerequisite act had to AUTHORIZE a construct before the declaration could use it. The act edits the three surfaces its own precedents each edited — the header amendment log, D7's admitted-so-far tally, and the new section — and carries →[code-grain]'s widening in the same tally (D17, condition 1), under the same unguarded-duty caveat. Its ratification point is this packet's human approve (flag 3). The engine-side edit is the hook's declared attribute shape, its load guard and its implementation — a NAMED growth beside →[code-grain]'s, not a live capability; the hook runs only on a finding-free value, so a malformed decisions map never reaches it, which is what makes the produced map's correctness a pure expansion question (family 10) |
| D11 | **The type grain — DECIDED HERE (a scope decision, carried to the approve by flag 7).** Anchor for the parts that ARE anchored: `contract:ch14-human-decision#C1` (the stored token domain) and `contract:ch13-context-block-v2#C13`'s TYPE-GRAIN precedent. The shared raw `Step` type grows FIVE optional fields — `type`, `decisions`, `wait`, `onResume`, `recommends` — and the token domain of `type` is the STORED form, since the direct channel's input is this type; a discriminated union over the classes is refused on the precedent's own ground and on a measured one (optionality is what keeps every hand-built raw fixture compiling; a union would force a construction-site migration across suites this packet does not otherwise touch). WHAT IS DECIDED RATHER THAN DERIVED, and why it carries a new-decision class: the three fields the two new classes DROP — `role`, `instruction`, `transitions` — stay REQUIRED on `Step` at this packet, and the relaxation moves to P2 with the consumers that make it reachable. No anchor forces that timing; the ground is this packet's own boundary, since relaxing now is a compile-forced cascade across kernel, runner and testkit call sites the sizing excludes by construction. What the deferral costs, stated exactly rather than softened: after this build the type is honest for every ADMITTED value in the tree, and P1's OWN direct-channel fixtures for the two new classes are cast-authored on the suite's standing idiom — the divergence is real from this packet on, not from P2. The deferral gets a MACHINE CARRIER, not prose only: a `DEFERRED(ch14-p2):` marker beside the three fields in the domain module (inside this boundary), which the deferred-marker check's form and namespace rules validate and which the chapter close's `--closed ch14` run reads. The marker's TEXT carries BOTH halves of the debt (the ratifier's addition at this packet's flag-7 approve), because only the first half announces itself: the relaxation, AND the retirement of the type-bypasses P1's own fixtures for the two new classes are written through. After the relaxation those casts become unnecessary — and an unnecessary cast still COMPILES, so they go silently dead rather than breaking, and nothing else in the tree would ever surface them. AUTHORING that marker is itself an UNGUARDED NAMED DUTY — the checker enumerates markers that EXIST and cannot see one that was never written, exactly as D12's flips and D17's tally cannot be caught by their gates. The class discipline lives at ADMISSION (D3), not in the type; the type is the witness, never the authority. The minted names and their homes follow the live layering rule (id aliases at the dependency-free bottom, structure types beside the aggregate they belong to) and join the explicit re-export list, the registry's second sync surface — the NAMES themselves are build choices under flag 6 |
| D12 | **The registry and unit-map flips this packet owns.** Anchor: `contract:ch14-human-decision#C25`, `#C19` (the registry's byte-untouched duty this row homes) and `prose:plan §14.5 DoD` (the flip is a NAMED duty precisely because the registry test pins key sets, not dispositions, so no gate catches an omission). This packet flips ONE domain-registry row — `l3/human_gate` — and ONE unit-map row, its own slice's, carrying the `codeRef` flag 6 decides. The WITNESS is named rather than implied: the flip's type witness is the minted step-TYPE union (the discriminator's token domain, `Step.type`'s type), a FIELD-grain witness on the live `BlockId`/`l2b/ContextBlockRef` precedent — not the shared `Step` interface, which every agent step satisfies identically and would make the row vacuous; the realized-type table gains its entry with that name, and that table's `import type` is the existence proof the `typeName` string alone does not give. The unit-map row is addressed FULLY QUALIFIED (`l3-pseudocode/validate_decision_gates`), because a second row of the same bare name exists under another section and a name-only edit would flip the wrong one. The other four `l3` rows stay `pending` here and are P2's by their own C-rows (the shared arrival C11, the Ask C20, the transcript pair C22, and the wait-plus-resume row C18/C14) — named so no successor packet reads another as owner. Both flips adopt the standing VERBATIM PIN precedent for packet-owned rows, so a wrong-but-existing target cannot stay green on the generic lane. The 54-name rejection registry is asserted byte-untouched before AND after — the drift bullet is its execution and C19 its authority |
| D13 | **The re-lock act and its coexistence half — DERIVED.** Anchor: `contract:ch14-human-decision#C10` (bundle member 3) and the contract's Context, which ratifies the mechanics: one block per bound contract. The choreography is ch13-p1a's, extended by the second lock. The declaration edit rides the BUILD commit, leaving BOTH locks red at that commit — MEASURED at this authoring, one error per bound contract naming the recorded and working-tree digests (receipt PROBE-CH14P1-4) — and a FOLLOW-UP commit appends: this draft's ordinary `ratified → ratified` re-lock block, and a `realized`-state block-append on `ch13-context-block-v2` recording the same new bytes with no status change and no C-row motion. The same receipt measures the close: with one block appended per bound contract, the lint returns zero errors, the `realized`-state append included. DERIVATION NOTE: what this row decides beyond the Context is the form authority's §4 amendment PLACEMENT — the follow-up commit, beside this packet's own appends. THREE PROSE RIDERS travel in that same commit, none of them sha-dependent and all of them falsified by the append: the §4 amendment itself, §5's enumeration of non-reopen block-appending transitions, and the ch13v2 draft's own close-metrics sentence naming its blocks. They ride on the packet-rows delegation the plan's Order paragraph grants, not on the sha ground that carries the two blocks. THE DIVERGENCE IS STATED, not left to be read as drift (the ratifier's addition at this packet's flag-4 approve): the one comparable earlier act carried its own amendment in COMMIT ONE, and this act carries it in the follow-up — so the follow-up's commit message, or the amendment paragraph itself, says in one sentence that the earlier act went the other way and why this one does not (the build commit's bytes stay clean for the schema-lock boundary check, a constraint that act's pure-docs commit never faced). Both blocks name the BUILD commit as their `commit` value, which is why two commits exist at all: a sha cannot be recorded before the commit that mints it. The `arms` of both name the ACT, on the standing rule that an act moving no C-row gives a review arm nothing to read |
| D14 | **Non-movement, measured — DERIVED.** Anchor: `ADR-019` D5. The corpus is DERIVED from the CALLERS of the entry points this packet touches, never from a file list, and every case reaching them is replayed: identical verdicts, identical paths, identical messages, except for ONE delta and THREE carrier moves — a distinction the build must keep, because a family that treats them alike invites a manufactured change. THE ONE DELTA: the id-grammar message grows its ban clause (D9), asserted POSITIVELY so its absence reds as loudly as an extra delta. THE THREE CARRIER MOVES, each asserted UNCHANGED: presence findings for the three relaxed keys now come from the hand lanes and must keep their PATHS and MESSAGES (the relaxation's real proof); the role-set equality's findings likewise, including the broken-`steps` stand-down D6 names; and the step node's container message, which enumerates the agent keyset literally and is held BYTE-IDENTICAL (D2) — a change there is a finding, not a tidy-up. Any other delta is a finding and a build STOP. The VALUE grain is the second half: an admitted template's `advancesRound` map gains entries only where decision or resume edges exist, and no such template exists in the tree at this basis — so the measured re-pin set is expected EMPTY, and a NON-empty one is a finding to be understood before it is folded, never a re-pin to be performed silently |
| D15 | **Out of scope — the single in-packet home for what ch14-P2 and ch14-P3 hold.** P2 (the kernel core): the three-entry spine and its shared arrival, both parks, `admit_input` with the F-W4-2 delta, the DECISION_REQUEST/DECISION_MADE pair, the override rule, the `HumanDecisionRequest` value, the wait-record and transcript-class growth, the binding-coverage loop's role-less SKIP (C7(b)), the floor's timeline classes, the `l3` golden trace, the four `l3` registry rows D12 leaves pending, AND the `Step` type relaxation D11 defers — with its call-site sweep and the retirement of the fixture type-bypasses the relaxation makes unnecessary — carried by that row's machine marker, whose text names both. P3 (the activation): the two operator CLI verbs, the floor's pending-Ask read, the shipped template wiring, the golden-trace re-pins that change reaches, and the journey smoke. Shared with both: the remaining seventeen `l3` units and all eight invariants. NAMED NON-MEMBERS, because they are the CHAPTER CLOSE's and neither successor packet's: the draft's `realized` flip with its `realized_map`, the ch-14 map row, the §14.5 DoD items, and ONE aggregate note this packet's reading earns — C8's "hand lanes" phrase, whose family-not-realization reading (D7, flag 2) is recorded at the close in the draft's own realized-map annotation, so the next reader of that row inherits the reading rather than re-deriving the literal one. ALSO A NAMED NON-MEMBER, because plan §14.1 and §14.4 both name it in this packet's content line and it resolves to NO work here: the `operator` role needs no format growth at all (C7 — an ordinary role in the ordinary roles map), so P3 wires it and P2 takes the binding-coverage half. FORWARD SCOPE: this packet ships no consumer of the declarations it lands — the foundation half of a foundation → kernel → activation cut, which plan §14.4 rules is inside the §8.2 stance (it binds at CHAPTER grain) |

## Mirrored Surface Map

Every rule above is stated ONCE at its canonical row; every other
mention defers with an arrow-bracket pointer naming a registered rule.
The register's machine face is below. Verbatim runs quoted from the
contract and from the model unit are NOT censused here: what governs
them is a DUTY the register cannot enforce — every quoting site names
its source in the same sentence that carries it.

```json
{
  "mirror_map": {
    "form": "pointer-only",
    "rules": [
      { "id": "lane-drive", "canonical": "D3", "signature": ["may only ADD findings, never retract a declared one"], "allow": [] },
      { "id": "class-partition", "canonical": "D2", "signature": ["the declared step node holds the UNION of the three classes' fields"], "allow": [] },
      { "id": "produced-carve-out", "canonical": "D3", "signature": ["outside every class keyset by the standing rule"], "allow": [] },
      { "id": "suppression", "canonical": "D7", "signature": ["yields its own finding and SUPPRESSES its dependents"], "allow": [] },
      { "id": "code-table", "canonical": "D7", "signature": ["Every OTHER lane of this chapter is code-less"], "allow": [] },
      { "id": "namespace-check", "canonical": "D8", "signature": ["must be a member of that namespace, checked at declaration load"], "allow": [] },
      { "id": "code-grain", "canonical": "D17", "signature": ["an existing attribute at a new grain"], "allow": [] },
      { "id": "loud-guard", "canonical": "D17", "signature": ["FAILS at declaration load with an explicit error naming the attribute and the node"], "allow": [] },
      { "id": "inventory-key", "canonical": "D17", "signature": ["keyed on attribute × kind × POSITION"], "allow": [] },
      { "id": "ban-carrier", "canonical": "D9", "signature": ["the ban lands in ONE place and reaches every position by citation"], "allow": [] },
      { "id": "relock-act", "canonical": "D13", "signature": ["one block per bound contract"], "allow": [] },
      { "id": "parity-corpus", "canonical": "D14", "signature": ["DERIVED from the CALLERS"], "allow": [] }
    ]
  }
}
```

## In-context notes

- Both admission entries reach ONE computation. Driving both channels
  is therefore not about the shared computation but about what
  differentiates them: the `type` token domain and the produced-field
  carve-out (dimension 1's two outcome classes), plus the cases only
  the file channel can express at all — key identity, duplicate keys,
  and the source-form ladders — and the unknown-key refusal. Those are
  the only places a one-channel lane can be blind. A hand lane that
  must tell the two channels apart says so in data — the live residual
  already carries a channel-scoped hand lane, so the idiom exists.
- The audited residual's module is where a hand lane belongs BECAUSE
  its findings join the same stream at the same stage; a lane placed in
  the admission entry instead would report outside the all-or-nothing
  discipline the stage owns.

## Embedding gates

- Target files: the mutation boundary below, nothing else.
- Entrypoints: `admitTemplate` / `admitFromSource`, the file pipeline's
  validate stage, and the dev CLI's validate verb for D8's travel lanes
  only.
- Declaration surfaces to grow: the contract names ELEVEN intended tags
  — the step-class discriminator plus the wait, wait-kind,
  resume-events, on-resume, decisions, decision-entry, decision-target,
  decision-payload and payload-spec and recommends nodes — and the node
  set the build actually mints is PARAMETERIZED over the declaration's
  own composition rules rather than over that count: every open map
  additionally carries its KEY CLASS node and its ENTRY node, every
  list its MEMBER node, every fixed map its FIELD nodes, and each of
  those carries its own tag. Four of the sub-nodes are dimension 8's
  new citing positions (the decisions key class, the payload
  field-name key class, the resume-event member, the recommends value),
  so a build that mints only the eleven named nodes ships two id
  classes with no grammar. Beyond the new nodes: `[vc-id-class]`'s
  grammar tightens (D9); `[d-codes]` grows by six (D8);
  `[n-advances-round]`'s edge sources widen (D10); the `crossRules`
  array loses `[d-roleset]` (D6). Live precedents, each read whole
  rather than re-derived: `[d-act-mode]` for the enum's channel-scoped
  and identical-token members AND for its admitted-value store pin,
  `[d-target]` for the no-type-message membership lane, `[d-gates]`'s
  `keysSubsetOf` for the dead-config lane SHAPE, and `[d-terminal]`'s
  `unique` for the per-occurrence list rule. `whenOperandAbsent` is NOT
  a live precedent — it is a declared vocabulary attribute with no
  current user on this surface, whose behaviour PROBE-CH14P1-5
  measures and whose first live use this build is.
- Engine growth, NAMED — two members and no third: D10's widened hook
  (its declared attribute shape, its load guard and its implementation)
  and →[code-grain] (the container and unknown-key emission sites, the
  attribute-applicability guard and the namespace check at the new
  position). Every OTHER lane this packet declares uses a live
  capability, which the seven probes measure rather than assume.
- Test homes that already exist: the admission-entry lanes join the
  direct-channel and file-channel definition suites; the declaration
  load guards join the schema engine suite; D8's travel lanes join the
  dev CLI suite beside its live coded-finding lane; D12's verbatim pins
  join the two drift suites. The ban's reworked consumer sits in the
  kernel context-blocks suite — a test-only visit, no kernel code.
- **PROBE-CH14P1-1 — the boolean spec field, EXECUTED 2026-08-15**
  (node v24.18.0, live engine, throwaway surface): an `enum` node with
  members `true`/`false` admits both booleans and an absent key, refuses
  `"yes"`, `1` and a quoted `"true"`, refuses an unknown spec key, and
  reports a non-map spec at the spec's own path — on BOTH channels, with
  `{members}` rendering `true, false`. The VALUE lane needs no
  vocabulary growth; its container and unknown-key siblings are
  →[code-grain]'s.
- **PROBE-CH14P1-2 — the ban's grammar form, EXECUTED 2026-08-15**: the
  0…2³²−2 class expressed as one negative-lookahead alternation inside a
  single `grammar.re`; over the enumerated sample (`0`, `1`, `9`, `10`,
  `999999999`, `1000000000`, `4294967293`, `4294967294`,
  `4294967295`, `4294967296`, `01`, `-1`, `-0`, `+1`, `1_000`, `٠`,
  `٠١`, `99999999999999999999`, `1e3`, `0x10`, `1.5`, `a1`, `10a`,
  `implement`, `COMMIT`) the refusal set equals the own-key HOIST set on
  every member but `"1.5"`, which the standing dot ban already refused —
  zero mismatches. The sample MINUS `1.5` is dimension 8's legality
  membership, and the build EXTENDS it by one ten-digit value FAR
  above the ceiling (`9999999999`, whose leading digit no in-class
  branch reaches): the sample's above-ceiling members sit in the
  `42949672xx` neighbourhood, so an alternation whose top branch
  wrongly admits a high leading digit over-refuses there and stays
  green on every member measured. `1.5` rides as the standing-ban
  control.
- **PROBE-CH14P1-3 — the sibling-nested selector and container
  suppression, EXECUTED 2026-08-15**: `keysSubsetOf` over
  `valuesOf: "^.wait.resumeEvents"` resolves and reports the dead route
  at the offending entry's path; an empty `onResume` admits; a broken
  `wait` container and a non-list `resumeEvents` each yield their
  container finding ALONE, the dependent lane standing down.
- **PROBE-CH14P1-4 — the two-lock red window, EXECUTED 2026-08-15**,
  restored byte-identically afterwards (`shasum` back to `fa8bc5a2…`,
  clean porcelain, `cmp` on all three files). (a) With one appended
  comment line in the declaration, `check_packet.py` reports exactly TWO
  errors — one per bound contract, each naming the recorded and
  working-tree digests. (b) With one ratification block appended per
  bound contract carrying the new digest, the same command returns ZERO
  errors, the `realized`-state append on `ch13-context-block-v2`
  included. What stays UNMEASURED, and is left to the build: the
  behaviour at the intermediate COMMIT itself, which is (a) by
  construction.
- **PROBE-CH14P1-5 — the absent-operand knob, EXECUTED 2026-08-15**: a
  `keysSubsetOf` lane whose operand path runs through an ABSENT sibling
  reports `internal validator failure: the keysSubsetOf lane could not
  be decided` at the citing entry's path; with `whenOperandAbsent:
  "skip"` declared it is silent, and the present-operand lane is
  unaffected in both forms. This is the third failure mode dimension 4
  enumerates, and the UNDECIDED-operand path D6 distinguishes from the
  unreliable-operand path its own stand-down rides.
- **PROBE-CH14P1-6 — the live declaration under the generalized guard,
  EXECUTED 2026-08-15**: every node of the shipped declaration was
  walked and its own attribute keys collected per node KIND, then
  compared against the vocabulary's admitted set for that kind. Result:
  ZERO unadmitted attributes tree-wide (the census: `map.fixed`,
  `map.open`, `map.plain`, `list`, `string`, `integer`, `enum`,
  `union`, `raw`, `valueClass`, `delegate`, each carrying only its own
  interface's attributes plus the shared base). The census is KIND-grain
  and its conclusion is kind-grain with it: no shipped node carries an
  attribute its KIND does not admit. Re-keying it to POSITION is a build
  duty — the same walk, one key wider — and until it runs, the
  position-grain guard's clean landing on the shipped declaration is a
  spot check (every node constant is single-position today) rather than
  a receipt.
- **PROBE-CH14P1-7 — attribute applicability is POSITION-dependent,
  EXECUTED 2026-08-15** (the external arm's counterexample, re-measured
  independently): the SAME attribute on the SAME kind, one position
  apart — `presence` on a `string` FIELD of a fixed map loads clean and
  FIRES (`missing required key`), while `presence` on a `string` ENTRY
  of an open map loads clean and produces findings byte-identical to
  the same declaration without it. Both are accepted at load today.
  This is what fixes D17's inventory key at attribute × kind ×
  position and what family 9's same-kind twin drives.
- NAMED NON-MEMBERS of the mutation boundary, with their reasons: both
  contract files, `contract-draft-template.md` (§4 and §5) and the
  ch13v2 draft's close-metrics prose, whose blocks and repairs land in
  the FOLLOW-UP commit (→[relock-act]); the expressiveness audit, a
  phase record whose own ruling the comment repairs cite; the process
  log, which rides its own docs commit. The post-build audit is pinned
  to the build commit's own bytes and must see none of them.

```json
{
  "mutation_boundary": {
    "files": [
      "v3/src/definition/schema/templateFormat.ts",
      "v3/src/definition/schema/templateSurface.ts",
      "v3/src/definition/schema/vocabulary.ts",
      "v3/src/definition/schema/defineSurface.ts",
      "v3/src/definition/schema/normalizer.ts",
      "v3/src/definition/schema/engine.ts",
      "v3/src/definition/schema/engine.test.ts",
      "v3/src/definition/admit.ts",
      "v3/src/definition/admit.test.ts",
      "v3/src/definition/validate.test.ts",
      "v3/src/domain/ids.ts",
      "v3/src/domain/template.ts",
      "v3/src/domain/index.ts",
      "v3/src/drift/domainRegistry.ts",
      "v3/src/drift/domainRegistry.test.ts",
      "v3/src/drift/unitMap.json",
      "v3/src/drift/unitMap.test.ts",
      "v3/src/kernel/contextBlocks.test.ts",
      "v3/src/cli/dev/dev.test.ts",
      "v3/adr/ADR-019-declared-schema-for-structural-definition-rules.md",
      "v3/implementation/plan.md",
      "v3/implementation/packets/ch14-p1-decision-definition.md"
    ]
  }
}
```

## Row manifest

```json
{
  "packet_rows": {
    "rows": [
      { "id": "D1", "class": "anchored", "refs": ["ADR-019", "prose:contracts/ch14-human-decision-contract.md Context (the declaration authority; the schema lock)"] },
      { "id": "D2", "class": "anchored", "refs": ["contract:ch14-human-decision#C1"] },
      { "id": "D3", "class": "anchored", "refs": ["contract:ch14-human-decision#C2", "contract:ch14-human-decision#C3", "contract:ch14-human-decision#C8"] },
      { "id": "D4", "class": "anchored", "refs": ["contract:ch14-human-decision#C4", "contract:ch14-human-decision#C5"] },
      { "id": "D5", "class": "anchored", "refs": ["contract:ch14-human-decision#C3"] },
      { "id": "D16", "class": "anchored", "refs": ["contract:ch14-human-decision#C6"] },
      { "id": "D6", "class": "anchored", "refs": ["contract:ch14-human-decision#C7"] },
      { "id": "D7", "class": "anchored", "refs": ["contract:ch14-human-decision#C8"] },
      { "id": "D8", "class": "anchored", "refs": ["contract:ch14-human-decision#C8", "contract:ch13-context-block-v2#C18"] },
      { "id": "D17", "class": "new-decision", "refs": [] },
      { "id": "D9", "class": "anchored", "refs": ["contract:ch14-human-decision#C10"] },
      { "id": "D10", "class": "derived", "refs": ["contract:ch14-human-decision#C11", "ADR-019"] },
      { "id": "D11", "class": "new-decision", "refs": [] },
      { "id": "D12", "class": "anchored", "refs": ["contract:ch14-human-decision#C25", "contract:ch14-human-decision#C19", "prose:plan §14.5 DoD"] },
      { "id": "D13", "class": "derived", "refs": ["contract:ch14-human-decision#C10", "prose:contracts/ch14-human-decision-contract.md Context (the coexistence mechanics)"] },
      { "id": "D14", "class": "derived", "refs": ["ADR-019"] },
      { "id": "D15", "class": "anchored", "refs": ["prose:plan §14.4"] }
    ]
  }
}
```

## Sizing/risk (template §2 step 0 — materialized)

Predicted class (plan §14.4's row): **projection**. Discovered at
authoring: **projection** — every row anchors on a ratified C-row, an
ADR decision, or a live declared precedent; the three derived rows add
placement and realization route, not semantics, and the two
new-decision rows are a resolved STOP verdict and a scope call, both
carried to the human approve.

**The six axes.** *Authority movement* — YES, narrowly: the role-set
equality's authority moves from the declaration to a hand lane (D6),
the definition-static family grows a second named member (D3), and the
declaration vocabulary gains an attribute grain (D17). "Authority" here
is the six-axis sense — a canonical source of truth moving — not the
Case-B sense of authority SEMANTICS, which the header addresses.
Nothing is turned ON: no live path consumes a decision or wait
declaration until P2's kernel, and no shipped template authors one
until P3, so hard stop 1 does not trip. *Surface spread* — ONE concept
on ONE production surface, `src/definition/**`, with `src/domain/**`
carrying the optional type witnesses of that same change and
`src/drift/**` its bookkeeping; no store, floor, ingress, gates, runner
or provider file moves, the kernel gains ONE reworked test lane and no
code (D9's consumer), and the CLI gains test lanes and no code; the
testkit CONTRACT is untouched. Hard stop 2 does not trip.
*Identity/join fragility* — NO. *Foundation + activation coupling* —
NO, by construction; D15 names what stays out. *Prerequisite coupling*
— NONE: the ADR amendment rides this build (D10, D17) rather than
blocking it, and the form-authority edits ride the follow-up commit
(D13). *Acceptance multiplicity* — ONE proof surface, `pnpm v3:test`,
plus `ci:local` at the chapter close.

**Consume-family scan** (run because the packet moves an authority):
producer `present` (the declaration and the normalizer hook);
validator/gate `present` (the declared lanes plus the hand lanes);
read/presentation `present` as a READER only (the dev CLI's validate
document, unchanged in code); testkit `present` as a reader (fixtures
compile against the grown type, contract untouched); persistence/replay,
execution consumer, recovery/cleanup and external/integration `absent`
— the execution consumer arriving at P2 is why the scan is recorded
rather than skipped. Consumers of the moved authority: TWO
(validator/gate, read/presentation-as-reader), so hard stop 6 (3+
consume families) does not trip.

**Hard stop 7 TRIPS, and is closed by the implementation-closure
proof** — recorded rather than argued away, because all three conjuncts
hold: the authority producer changes (the declaration), a shared
contract shape changes (five optional `Step` fields plus the minted
names), and two fallout families exist (validator/gate,
read/presentation-as-reader). The proof: ONE build closes it without
separate sequencing; the same bounded change inside `src/definition/**`
plus its type witnesses closes every touched bucket; the same consumers
own the fallout; ONE proof surface validates it; no per-consumer-family
review loop is expected; and no compatibility, diagnostics,
read-projection, recovery or ordering risk is introduced. Shared
invariant coherence is explicitly NOT the argument — the argument is
that one implementation closure closes the work.

Hard stop 4 is examined rather than waved: the presence relaxation
could look like two competing authority paths for one decision, and it
is not — after the edit exactly ONE path decides presence per class
(the hand lane), the declared lane having stopped deciding it, and D3's
composition rule fixes what happens where a declared and a hand lane
both legitimately fire.
Hard stop 11 binds: the ban REUSES the id grammar's existing proof
surface, so proof-parity is taken HERE, not deferred — every citing
position is driven under dimension 8 rather than inheriting the pre-ban
family's coverage.

No other hard stop and no escalation combination trips. **single-packet
allowed: yes**, on the closure proof above.

**Closure-budget triage:** the AUTHORITY bucket (the definition-static
family, the id grammar, the code grain) and the SHARED-CONTRACT bucket
(five optional type fields plus the minted names) are touched and
deliberately collapsed — the type surface is the authority's own
witness, compiler-forced nowhere, and meaningless without it. The
RUNTIME and READ-PROJECTION buckets are DEFERRED to P2/P3 (D15).
**Proof-boundary triage:** not triggered — no success/completion proof
semantics move. **Mutable-flow record:** not triggered — admission is
all-or-nothing with no side effect, no rollback/retry/preservation, no
coordination primitive, and no precondition ordering that decides
whether side effects precede validation. **Site × shape × phase grid:**
not triggered — admission is single-phase (one walk, one all-or-nothing
verdict, no stop/drain path and no pre/post-commit split), which the
mutable-flow record and PROBE-CH14P1-3's suppression measurement
evidence.

**Difficulty index** (`model-tier-experiment-2.md` §3, computed at this
approve from the machine blocks): **A = 1** (`packet_rows` = 17, in
16–30) · **B = 1** (derived 3 + new-decision 2 = 5, in 5–10) ·
**C = 1** (`mutation_boundary` = 22, in 16–45) · **D = 1**
(stateful-persistent: the definition schema and its admission staging;
no async, temporal or external-substrate seam) · **E = 2** — grounded
on what is genuinely precedent-free rather than on the format-extension
work the header itself declares precedented: the re-lock's COEXISTENCE
half (two contracts binding one declaration, no prior instance) and
D17's vocabulary widening with its class-closing guard, admitted by a
ratified amendment act, which is declared idiom-minting by ADR-019's
own regime. The experiment's Fable-mandatory "idiom-minting slice"
category does NOT fire on that grounding — it is qualified "named at
chapter ratification", and plan §14 names none — so the chapter's arm
assignment stands unchanged. **Σ = 6 → Medium band.** The D and E calls
are the checklist half and are resolved BY this approve; the index
freezes there, and a boundary change discovered at build time is
recorded in the Build record without re-scoring.

**Residual risk, recorded here rather than as a flag because it carries
no decision:** the relaxation's silent-failure mode is this packet's
main exposure, and it is a TEST risk. Making three required keys
optional moves live findings onto new carriers, and four distinct
builds go quietly wrong — one that lands the hand lanes but drops a
presence case admits a step with no `instruction`; one that forgets an
absent-operand knob ships an internal-failure message where an
authoring finding belongs; one that gates the class lanes on the
engine's template-wide signal drops every other step's class findings
behind a single typo; and one that reaches for the undecided-operand
treatment in the re-homed role-set lane ships an internal-failure
message where the declaration was silent. Dimension 4's modes, D2's
per-step gating clause, D6's mechanism distinction and D14's carrier
moves exist for exactly these, and acceptance families 2, 3, 7 and 8
drive them.

## Pre-approval flags

1. **The mode resolves to a human approve, and the plan edit records
   it.** Plan §14.4's `ch14-P1` row reads "flag-free approve →
   autonomous build"; this packet carries `approve-ratified` routes and
   two new-decision rows, so the §5.5 condition fails and the verdict is
   STOP `4:flagged-approve` — recorded IN PLACE in the plan row, on the
   ch13-P0 / ch13-p1a precedent. The aligned plan edit lands in the same
   commit and does THREE things: it records this mode resolution; it
   adds to §14.4's Order paragraph the sentence that reconciles D13's
   two-commit choreography with the standing "one packet = packet file
   + code + tests in ONE commit" — the re-lock follow-up named as the
   exception class, together with the form-authority prose that act
   entails; and it carries the BUILD-CLOSE TRACKED ITEM that discharges
   D17's inverse direction, added at this flag round's own approve and
   self-attributing as such. Without the second the plan forbids what
   D13 requires; without the third D17's carrier does not exist.
   RECOMMENDATION: accept. `Route: approve-ratified`
2. **The code grain, the loud load guard, and the lane table (D17, D7)
   — a resolved STOP `1:open-choice`, ruled 2026-08-15 with two binding
   conditions.** The ratified C8 assigns a code to a container lane the
   declaration vocabulary cannot carry one on, and an authored `code`
   there is silently dropped — as is a code outside the declared
   namespace (both measured). The ruling widens the vocabulary
   (→[code-grain], serving six declared positions) with (1) the widening
   recorded in the same ADR amendment act flag 3 opens — an UNGUARDED
   duty, since the ADR check reads neither the tally nor the log — and
   (2) the load guard made loud for the DEFECT CLASS the ruling names
   (→[loud-guard]), realized as a fail-closed attribute inventory —
   →[inventory-key] fixes its key, and the per-KIND form the first
   draft of this flag proposed is superseded, for the reason the next
   paragraph measures — with →[namespace-check] joining the new
   position and its own regression lane. The two REFUSED alternatives are
   recorded with their costs: hand-laning the payload shape checks would
   require deleting the declared node (else one fault yields two
   findings) and would narrow C2's "the field grammars ride the schema";
   narrowing C8's exception would strip the code from most of its lanes
   and needs a contract reopen. WHAT CHANGED SINCE THE RULING, and it
   changes the realization rather than the decision: the external arm
   showed — and PROBE-CH14P1-7 re-measured — that a kind-keyed
   inventory cannot close the class condition 2 names, because ONE
   attribute on ONE kind is legitimate in one position and inert in
   another; →[inventory-key] is the consequence, on the grain ADR-019
   D11 already uses. The ruling stands as given; this is what meeting
   it costs. RIDING WITH IT, because it is
   the same subject: →[code-table] reads C8's phrase "the decisions/entry
   shape+keyset hand lanes" as naming the FAMILY those lanes report in
   rather than their realization, since C2 rules that C4's field
   grammars ride the schema and a double realization would double the
   finding C8 calls ONE; D15 carries that reading into the chapter
   close's realized-map annotation so the next reader inherits it.
   `Route: approve-ratified`
3. **The ADR-019 amendment rides this build commit (D10, D17).** C11
   rules the `advancesRound` edge-source widening and classes it; this
   packet reads "rides P1's realizing act" as: the ADR section RECORDS
   widenings the ratifications already admitted, so the edit sits in the
   build commit and its ratification point is this approve — D10's half
   authorized by C11, D17's by this approve itself. The act carries TWO
   widenings in one tally edit, which the ADR's own form accommodates
   (its amendment log already carries multi-item acts). ALTERNATIVE, and
   it is a real one: a separate prerequisite `docs(v3)` act before the
   build, which is the ch13-p1a form. That form exists because a NEW
   CONSTRUCT had to be authorized before the declaration could use it;
   neither widening here is a construct, so the prerequisite would buy
   sequencing, not authority. Cost of the alternative: one more human
   checkpoint and a commit the boundary comparison must exclude.
   RECOMMENDATION: ride the build commit. `Route: approve-ratified`
4. **The form-authority edits land in the FOLLOW-UP commit (D13).** The
   `realized`-state block-append is already in the tree and already
   lint-clean — the ch13 close's second commit appended a block to that
   contract while its status was already `realized`, changing nothing
   else (measured at authoring) — so what the §4 amendment admits is
   narrower than "a first instance": the LINT-CLEANLINESS is
   precedented, while the status pair for a STANDALONE re-lock (the §4
   bullet is titled `ratified → ratified`, and the tree's one instance
   came from the narrowly self-scoped citation-closure bullet) is
   admitted here and owes the boundary its own read. The contract's
   Context sentence naming it "the act that first exercises it" is a
   factual slip in that prose, not a falsified C-row. Two prose repairs
   ride the same commit: §5's enumeration of non-reopen block-appending
   transitions, and the ch13v2 draft's close-metrics sentence, which the
   append falsifies and no lint sees. The placement DIVERGES from the
   one comparable act, which amended in commit one; D13 carries the
   duty to state that divergence and its ground in the act itself, so
   a later reader meets a decision rather than drift. RECOMMENDATION:
   accept the placement; the Context slip is recorded for the boundary
   rather than repaired here. `Route: approve-ratified`
5. **The two-lock red window, and what it costs.** This is the first
   build to edit a declaration bound by TWO contracts. MEASURED at this
   authoring (PROBE-CH14P1-4): the build commit carries TWO lint errors,
   one per bound contract, and the follow-up's two blocks clear both.
   The consequences this approve ratifies: `pnpm ci:local` is not green
   between the build commit and its follow-up (the same transient
   ch13-p1a's re-lock established, now doubled); both blocks name the
   build commit; and every FUTURE edit of this declaration pays what
   →[relock-act] requires, which the contract's ratification already
   accepted rather than weakening either lock. One qualifier the
   approve should see: PROBE-CH14P1-4 is the one receipt an external
   read could not reproduce under a read-only binding, for the reason
   flag 8 records. `Route: approve-ratified`
6. **Names and forms this packet does not pin from ratified sources.**
   (a) The declaration TAG spellings — the contract names eleven as
   intended and assigns the exact spellings to the realizing act; the
   sub-nodes the composition rules mint (key classes, members, entries)
   take their spellings from the same act on the same precedent.
   (b) The hand lanes' finding MESSAGES: the contract fixes their
   paths, their codes and their suppression, and nothing decides their
   wording; the live precedents are the messages of the lanes they sit
   beside. (c) The minted domain type names — the step-type union D12
   uses as its flip witness among them — and the hand-lane symbol the
   unit-map `codeRef` points at. (d) The ban's exact regex form, whose
   FEASIBILITY is measured (PROBE-CH14P1-2) and whose final spelling is
   the build's. (e) →[loud-guard]'s error wording AND the `code`
   attribute's SPELLING at the two new grains — the container and
   unknown-key messages are bare templates at node grain, so one
   node-grain attribute may serve both lanes of a fixed map; the choice
   follows the enum-grain precedent, is recorded at the build, and is
   what the ADR tally's grain count names. Each has a live precedent in
   the same file and none is unpinnable in principle. RECOMMENDATION:
   accept as precedent-following build choices, with (c) pinned VERBATIM
   by the drift tests so the next packet inherits a precedent with a
   test behind it. `Route: approve-ratified`
7. **The type relaxation this packet defers, and its class (D11).** The
   two new step classes drop three fields that stay REQUIRED on the
   shared `Step` type. No anchor decides the timing, which is why the
   row is classed `new-decision` rather than derived: what the approve
   ratifies is a SCOPE call. The cost is stated exactly — the type is
   honest for every ADMITTED value, and P1's own direct-channel
   fixtures for the two new classes are cast-authored on the suite's
   standing idiom, so the divergence begins here, not at P2. The
   alternative — relaxing now — is a compile-forced cascade across
   kernel, runner and testkit call sites outside this packet's boundary,
   which would re-open the surface-spread axis. The deferral carries a
   machine marker so the chapter close cannot pass blind; AUTHORING that
   marker is itself an unguarded duty, named in the row.
   RECOMMENDATION: accept the deferral. `Route: approve-ratified`
8. **Probe receipts live in this packet's prose and nowhere else.** The
   external arm could not re-run the mutation/restore receipt
   (PROBE-CH14P1-4) under its read-only binding, because the probe
   scripts are throwaway and only their results are recorded — a
   measured evidence gap it named rather than a defect it found. Every
   other receipt was independently reproducible from its description,
   which is why this is a process question and not a fold: whether
   probe scripts should be committed beside their packet (the
   ch13-p1a review-record precedent) is worth deciding once, for every
   packet, rather than here. `Route: boundary-review`
9. **The live surface's `crossRules` array becomes empty (D6).** After
   the role-set equality re-homes, the declared `equals` relation has
   no live user and keeps only synthetic drivers in the engine suite.
   That is a vocabulary member whose only consumer left the surface —
   worth a retirement question, and not one this build should answer
   while the relation's guards are still the engine's.
   `Route: boundary-review`

## Acceptance

- Contract tests: no new `CT-*` ids — this packet realizes no IC item;
  its claim surface is the D-row set plus the declared slice.
- Checks in force: the drift trio, `pnpm v3:typecheck` (D11's carrier
  for the compiler half and the minted names' existence proof),
  `pnpm v3:lint` (the sanctioned-mint guard over the admission module
  and the drift registry's import discipline), `pnpm v3:coverage`, and
  `pnpm v3:packet-lint` — the last carrying both schema locks, so it is
  RED at the build commit and green at the follow-up (→[relock-act]);
  the post-build audit is unaffected, running only the boundary
  comparison. TWO checks are named for what they do NOT cover:
  `pnpm v3:adr-check` runs but reads neither the ADR tally nor the
  amendment log, which is why D10/D17 name that record an unguarded
  duty; and `pnpm v3:deferred` — a standalone invocation, not a
  `ci:local` leg — validates marker FORM and, at the chapter close,
  markers REMAINING, so it cannot see a marker that was never written
  (D11's authoring duty).
- Test disciplines + family inventories (DISCIPLINE plus PARAMETERIZED
  membership with its owner named; fixture-level enumeration is build
  work, verified member by member by the build-close arm gate's
  sensitivity pass):
  - **1. Declared-lane family** — drives →[lane-drive]'s declared half.
    Discipline: every lane the nodes this packet adds or changes
    introduce is driven on BOTH channels through the real admission
    entries, in both directions (a violating input produces exactly the
    declared finding at the declared path; a conforming input produces
    none), with the finding SET asserted whole so a spurious extra
    reds; and the discriminator's ADMITTED VALUE is asserted on the
    file channel to carry the STORED token, with the stored token
    refused as an authored file value as its sensitivity twin — the
    `[d-act-mode]` store pin read whole. MEMBERSHIP: PARAMETERIZED over
    the declaration itself, enumerated by reading it at the build — the
    derivation yields NODES, and a node carrying several lanes expands
    to all of them.
  - **2. Class-partition family** — drives →[class-partition] and
    →[produced-carve-out]. Discipline: for each class, every key the
    class does not own is REFUSED and every key it requires is
    demanded, on both channels, with the finding SET asserted whole on
    the class-refusal cells so a spurious remote finding reds; each of
    the three relaxed keys is driven for dimension 4's SILENT and
    WRONGLY-DOUBLED modes, while its NOISY mode is parameterized over
    the operand CONSUMERS only — `transitions` (the gates subset lane
    and D16's subset lane) and `wait` (D5's dead-route lane) — because
    `instruction` feeds no dependent lane at all, and `role`'s only
    consumer is the equality D6 RE-HOMES to an absence-tolerant hand
    lane in this same build, so neither can stage a noisy cell and
    demanding one would demand a case the surface does not have; the
    carve-out is driven by RE-ADMITTING an admitted
    value of each class on the direct channel, which must recompute
    rather than refuse; a class-refused key carrying a value its own
    declared lane also refuses is driven for D3's two-finding rule,
    with its converse (a class-refused key whose value satisfies its
    lane → ONE finding) beside it; and a present-but-invalid `type` is
    driven for the gating rule in a COMBINATION document that also
    carries a class-valid step with a class fault, so a template-wide
    gate reds. MEMBERSHIP: the cross-product of dimensions 2 and 3,
    whose owner is D3's three spelled keysets; no cell is
    construction-unreachable, so none is exempted.
  - **3. Reference-rule family** — drives dimension 9's five rules,
    whose owner is D4 (the decision target, self-target included), D5
    (`onResume` keys) and D16 (the three `recommends` rules).
    Discipline: each rule is driven with a violating operand, with a
    conforming operand AT EVERY MEMBER of its declared domain (the
    decision target's terminal half is the case a sketch-following
    build would miss), with a BROKEN operand container whose
    suppression is asserted positively (→[suppression]), and with an
    ABSENT operand, whose silence is the declared knob's proof for the
    declared lanes and D16's stand-down rule for the two hand lanes.
    Each rule's finding is asserted at its own grain, so a rule firing
    at the wrong path reds rather than passing on a coincidence.
  - **4. Accumulation family** — drives dimension 6 and →[suppression].
    Discipline: a document staging TWO independent faults in different
    positions yields BOTH findings (which is what falsifies a
    first-return implementation), while a document staging a fault
    under a broken container yields the container's finding ALONE. Each
    member is a COMBINATION lane holding both conditions at once,
    because isolated lanes cannot falsify a reordered implementation.
    MEMBERSHIP: PARAMETERIZED over the container set dimension 5 names,
    whose owner is D7.
  - **5. Code family** — drives →[code-table], →[code-grain] and D8.
    Discipline: each of the six NAMES is asserted by VALUE on every
    lane →[code-table] assigns it, at the GRAIN →[code-grain] admits (a
    container-lane code asserted on a container-lane finding, so a build
    attaching it to a sibling value lane reds); the CLI travel positive
    asserts the code FIELD's value at the document's far end on a
    ch14-only fixture, with its negative twin; and the EXCLUSIVITY
    negative is a DECLARATION-WIDE census — the same walk
    PROBE-CH14P1-6 establishes as an idiom — asserting that the set of
    code-bearing DECLARATION positions equals →[code-table]'s declared
    assignments plus the TWO pre-existing declared code positions
    (measured: the gate-evaluator membership lane and the
    context-block-ref membership lane), so a code landing on a node this
    chapter never touches reds too. The other three coded lanes live
    outside the declaration — one hand lane in the audited residual,
    two inside delegated gate-config validators — and are asserted by
    their own inventory rather than by this walk, because a census of
    declaration nodes cannot see them and a baseline of five would red
    a correct declaration. Findings are asserted on the `code` FIELD
    and never on the serialized text.
  - **6. Grammar family** — drives →[ban-carrier]. Discipline: the
    membership ladder of dimension 8 is driven at EVERY citing
    position, in both directions, with the measured non-members
    asserted LEGAL (a ban that over-reaches is as much a defect as one
    that under-reaches) and the `1.5` control asserted REFUSED with its
    standing-ban attribution. MEMBERSHIP: PARAMETERIZED over dimension
    8's POSITION grain — every declaration node citing an id class,
    expanded at the build from the declaration itself, never over the
    seven class NAMES alone (a class occupying two nodes would
    otherwise be driven once) and never over "the nodes that cite the
    id class" as a self-defining set (which would exclude by
    construction the node whose missing citation is the bug: the
    expansion is checked against dimension 8's class list, so a class
    with no citing node reds) — plus the exclusions of
    `contract:ch14-human-decision#C10`: the gate-config schema keys and
    the `capabilityProfile` position asserted UNTOUCHED in-boundary,
    and the `runOverrides` surface recorded as a NO-LANE exclusion on
    C10's own disposition, since this packet's admission walk never
    reaches it. The sweep re-runs at the build and its sites take the
    dispositions D9 assigns them.
  - **7. Parity family** — drives →[parity-corpus]. Membership owner:
    the caller enumeration re-derived at the build. The ONE delta is
    asserted POSITIVELY, so a build failing to produce it reds as
    loudly as one producing a second; the THREE carrier moves are
    asserted UNCHANGED, so a build that manufactures a message change
    to satisfy the family reds instead; the admitted-VALUE re-pin set
    is measured, expected empty, and a non-empty result is a finding
    before it is a fold.
  - **8. Hand-lane family** — drives →[lane-drive]'s hand half, which
    no declaration enumerates and which therefore needs its own
    inventory. MEMBERSHIP, declared here because its owner is this
    packet: the three class keysets and their presence re-imposition
    (D3), the `decisions`-absent presence lane and the ≥1-decision
    floor (D4, →[code-table]), the kernel-owned wait-kind reservation
    (D5) — PARAMETERIZED over that row's named constant, every member
    driven as refused-as-an-authored-kind, so a later kernel kind added
    without extending the reservation reds in its own chapter — the
    re-homed role-set equality (D6), and D16's two two-hop
    `recommends` rules. Discipline: family 1's, applied to each member
    — both channels, both directions, path and message asserted,
    suppression asserted positively — plus, for the role-set member,
    dimension 10's full crossing: both directions, a role-less step
    contributing nothing, the grammar-invalid suppression, and the
    broken-`steps` stand-down driven with a NONEMPTY roles map, the
    discriminating case the parity corpus cannot reach. One negative
    the family owns by construction: `nonempty` is NOT declared on
    `decisions` beside the hand floor (D4's code-carriage ground), so
    an empty `decisions` map yields exactly ONE finding.
  - **9. Load-guard family** — drives guarantee 5's declaration-time
    half (dimension 12), →[loud-guard] and →[namespace-check].
    Discipline: a declaration whose widened hook names an unresolvable
    operand path, a landing node of the wrong kind, or a field the
    landing node does not declare is REFUSED AT LOAD with a problem
    naming the hook and the node; an attribute the vocabulary does not
    admit at a node's position is REFUSED AT LOAD with a problem naming
    the attribute and the node; and a `code` outside the declared
    namespace is REFUSED at the NEW position exactly as it already is
    at the enum grain. Each negative carries its DISCRIMINATING
    positive — the same declaration with that one reference corrected
    loads clean. Two build traps the discipline names because both
    would silently retire the family, and they pull in OPPOSITE
    directions, which is why each is named with its half: a KIND-grain
    negative must be CAST-AUTHORED, because an attribute the kind's
    interface omits is a compile error before the guard ever sees it —
    while the POSITION-grain twin is STRAIGHT-authored by construction,
    since a position-illegal attribute is type-legal (→[inventory-key]'s
    first consequence) and a cast there would prove nothing; and the
    unadmitted-attribute negative must name a pair →[code-grain] does
    NOT admit, since `code` at a container lane is legal after this
    build and cannot serve as its own negative. MEMBERSHIP:
    PARAMETERIZED over the widened hook's declared operand paths and
    over dimension 12's triples, whose owner is →[inventory-key]. The
    family owes ONE member no coarser grain can carry: a SAME-KIND twin
    driving D17's measured counterexample in both directions (the
    legitimate position loads clean, the inert one is refused). The
    inverse direction — an inventory entry whose reader was deleted —
    is NOT an acceptance lane here: D17 scopes it to a build-close
    sensitivity probe under the standing mutation-probe protocol, and
    it lands in the build record with its receipt rather than in this
    family.
  - **10. Produced-form family** — drives guarantee 5's produced half
    (dimension 13), which no finding-shaped lane can reach. Discipline:
    on a constructed template carrying all THREE edge classes, the
    admitted `advancesRound` map is asserted whole per step — every
    edge of every class present with an explicit boolean, both flag
    directions driven, and the per-class target extraction falsifiable
    (a build reading a decision entry as its own target produces a map
    whose decision edges are all `false`, which this family reds).
    MEMBERSHIP: the three edge classes crossed with the
    advance/no-advance declaration.
- Drift tests green (standing, unconditional — PI-3), asserted before
  AND after: the 54-name rejection registry byte-untouched (D12), the
  domain registry's key set unchanged with one disposition flipped and
  pinned verbatim, the unit-map row flipped from `pending` and pinned
  verbatim.
- Standing review rules in force (§3): none of `REV-A1-TXN`,
  `REV-B-LOCAL-NOT-AUTHORITY`, `REV-C-PROJECTIONS-READONLY`,
  `REV-E-NO-ADAPTER-BRANCH` or `REV-DIAG-FAILOPEN` touches this
  packet's surface — an explicit empty declaration, not an omission.

## Build record

**Build execution context: FRESH-CONTEXT-DELEGATED** (the README §4
default). The executor was handed the packet as sole spec plus the two
authorities the Reading rule's HANDOVER clause names, and byte-verified
the basis (`b82b186b…`) before its first read; the declaration's
ratifying basis (`fa8bc5a2…`) was checked before the first edit. No
guidance notes beyond the packet were handed over.

**Rounds: ONE.** No fix round followed: both defects below were caught
INSIDE the build by the packet's own acceptance families, which is the
outcome the families were written for.

**Two build-time defects, both self-caught.** (a) The
`recommends_on_non_gate` hand lane stood down on a TERMINAL target — a
target that resolves and is definitively not a gate — where the rule
wants a finding; family 3's every-member-of-the-declared-domain
discipline is what surfaced it, and the lane now separates terminal
from unresolvable. Author: build agent. `[R-CLAIM-NEGATIVES]`
(b) The `recommends_unknown_decision` hand lane ACCUMULATED where the
declared engine SUPPRESSES: a grammar-invalid value drew both its
grammar finding and a membership finding. D7's "the hand lanes owe the
SAME discipline" decides it; the lane now stands down behind the
value's own grammar, read off the declaration rather than restated.
Author: build agent. `[R-LANE-SENSITIVITY]`

**One INSTRUMENT failure, recorded because it produced false
evidence.** The first four mutation probes were run with their commands
piped through `tail`, which masks the exit code — the runner recorded
four vacuous GREEN receipts on suites that had actually gone red. Caught
by the executor, re-run without the pipe, and all eleven probes then
recorded honestly. The class is the guard's own tokenizer being part of
the guard: a probe harness that cannot see failure measures nothing.
Author: build agent. `[R-CLAIM-FORM-PROBES]`

**Test delta: 2313 → 2759 (+446) across 74 files**, no new test home
minted; the growth lands in the homes the embedding gates named
(`admit.test.ts` 140→485, `validate.test.ts` 174→323, `engine.test.ts`
249→273, `dev.test.ts` 46→67, `contextBlocks.test.ts` 36→37, the two
drift suites +3). Of that growth the +86 before the last is the
build-close arm's AFTERMATH (below), which expanded five families to
their declared memberships, and the final +39 is the gate-2 RE-CHECK's,
which closed the expansion the first aftermath left half-done and
re-grounded three assertion bodies on content.

**Mutation probes: eleven at the build, all receipt-backed** through the
probe runner (backup-before, restore-from-copy, `cmp`-verified after),
one per declared family plus the plan's build-close tracked item — the
load guard's inverse direction (remove the reader, keep the inventory
entry), which went RED as required and discharges that row from the plan
rather than from this prose. The table is the receipts read back, one
row each; every row carries `baseline: green`, `exit 1`,
`suite_red: true` and `restore_verified: true`, and the MUTATION column
is what the receipt's captured output evidences (the runner stores the
mutated digest, never the mutated bytes).

| family | mutation | expected red | observed | receipt |
|---|---|---|---|---|
| 1 — declared lanes | `templateFormat.ts`: the `d-wait-kind` presence lane stops producing its finding | that one lane's row, admission succeeding where it must refuse | 1 of 77 red — `d-wait-kind: presence`, `expected true to be false` at `ch14Fail` | `PROBE-CH14P1-B1` |
| 2 — class partition | `templateSurface.ts`: the AGENT class stops refusing `decisions` | the agent refusal cell and D3's composition rule, both directions | 3 of 63 red — the refusal cell, the two-finding rule (the class finding missing), and its converse | `PROBE-CH14P1-B2` |
| 3 — reference rules | `templateFormat.ts`: the `keysSubsetOf` lane's absent-operand knob | the ABSENT-operand row's honest finding | 1 of 32 red — an EXTRA `internal validator failure: the keysSubsetOf lane could not be decided` beside the missing-key finding | `PROBE-CH14P1-B3` |
| 4 — accumulation | `templateSurface.ts`: the `decisions` container's dependent suppression | the container's finding ALONE | 1 of 17 red — 2 findings under the container where 1 is owed | `PROBE-CH14P1-B4` |
| 5 — code carriage | `templateFormat.ts`: the `decisions` container lane's `code` assignment | that lane carrying `invalid_decision_gate_config` by value | 1 of 15 red — the finding fires with `code: undefined` | `PROBE-CH14P1-B5` |
| 6 — the ban | `templateFormat.ts`: the ban's UPPER edge narrowed | every citing position, at the ceiling | 20 of 105 red — `4294967293` and `4294967294` admitted at all TEN positions at once | `PROBE-CH14P1-B6` |
| 7 — non-movement | `templateFormat.ts`: the ban clause removed from the grammar MESSAGE (the refusal itself intact) | the ONE delta, asserted positively | 1 of 5 red — the standing clause survives, the grown half is gone | `PROBE-CH14P1-B7` |
| 8 — hand lanes | `templateSurface.ts`: `timeout` dropped from the kernel wait-kind constant | every member of that constant | 4 of 13 red — `timeout` admitted, and the other three messages lose it from their enumeration | `PROBE-CH14P1-B8` |
| 9 — load guard | `defineSurface.ts`: the inert-POSITION closure refusal | the position-key row, both directions | 1 of 3 red — `closureProblems` returns empty where one problem is owed | `PROBE-CH14P1-B9` |
| 10 — produced form | `templateFormat.ts`: the per-class decision-target extraction | the decision class's own edges | 2 of 3 red — every `gate` edge computes `false`, the non-decision class unaffected | `PROBE-CH14P1-B10` |
| build-close tracked item (the load guard's INVERSE) | `defineSurface.ts`, a SECOND distinct mutation of the same file (distinct `mutated_sha256`): the reader removed, the inventory entry kept | the acceptance lanes the removed reader feeds | 1 of 3 red — the same lane, and the captured output is byte-identical to B9's apart from its timestamps, which is the honest limit of what the receipt evidences | `PROBE-CH14P1-B11` |

**AFTERMATH of the build-close arm's gate-2 review (external arm, no
product defects found; eight findings on the ACCEPTANCE bodies).** Five
of the ten families were not expanded to their declared memberships and
two were plausibly blind; +86 tests. SEVEN of the eight closed outright
and the EIGHTH closed HALF — family 3's expansion landed on the DIRECT
channel only — which the gate-2 RE-CHECK below names and closes; this
paragraph claimed all eight, and that claim was the re-check's own
finding 1. Family 1's
file half now runs the whole thirty-lane declaration-derived register
with the finding SET asserted by equality; family 2's file half runs the
full `CLASS_KEYSETS × authorable × required` cross-product on authored
fixtures; family 3 is parameterized over five rules × four operand
states, each with its own whole finding set (on the DIRECT channel; its
file half arrives at the re-check below); family 4 asserts each
container row's whole ORDERED set by literal value instead of a count;
family 5's exclusivity census forbids ANY own `code` rather than a
`decision`-prefixed one — a filter that could not see four of the six
names; family 7 enumerates the three PRODUCTION callers of the touched
entry points and compares whole rows, plus the file channel's whole
`{stage, findings}` document per caller-reachable failure; family 8's
eight members are GENERATED on both channels from ONE register instead
of counted as a literal list. Seven further receipt-backed probes
(`PROBE-CH14P1-A1`…`A7`, receipts under `/tmp/ch14p1-aftermath/`) prove
the expansions sensitive, each RED with a green baseline and a
byte-verified restore: A1 attaches `invalid_decision_gate_config` to the
uncoded `wait` container lane (invisible to the retired prefix filter);
A2 swaps one accumulated finding's MESSAGE while the count stays 2 (the
retired `>= 2` assertion would have stayed green); A3–A7 drive the
file-channel lane register, the file-channel class labels, rule 4's
remote-operand stand-down, the reservation's file half, and the file
channel's own copy of the ONE delta.

**ONE question the aftermath surfaced, RULED by the ratifier
(2026-08-16).** The `recommends_on_non_gate` hand lane fired when the
REMOTE step's own `type` was unusable — i.e. when that step's class was
never decided — reporting "routes to step 'gate', which is not a
humanGate step" beside the enum finding that names the real mistake,
while the same lane already STOOD DOWN where the remote step is not a
container at all. THE RULING: the lane STANDS DOWN. An undecided class
is a THIRD state beside the two the build's own defect-(a) resolution
separated — `terminal` (resolves, definitively not a gate → finding)
and unresolvable (already standing down) — and that resolution never
ruled on it. The ground is the packet's own: D2's per-step gate exists
so that a step whose class was never decided draws no class cascade,
D16 stands its two hand lanes down because "a second finding at a
remote path would mis-address the author", and D7 binds the hand lanes
to the engine's suppression discipline. No admit/refuse verdict moves
either way — the template is refused under both readings — so what the
ruling buys is that the author is sent to the typo and not to a
consequence of it. Realized in the residual module (the declaration is
untouched, so the schema digest is unmoved), pinned by family 3's
rule-4 broken-operand row, and driven: removing the stand-down reds
that row (`PROBE-CH14P1-A8`, green baseline, byte-verified restore).

**AFTERMATH of the gate-2 RE-CHECK (external arm, no product defects
found; five findings — four on the ACCEPTANCE bodies, one on this
record).** All five closed, +39 tests (2720 → 2759). No production byte
moved: `admit.test.ts` and `validate.test.ts` are the only files edited,
and the declaration's digest is unchanged (`d9a58122…`).

- **1 (packet-docs).** This record claimed all eight gate-2 findings
  closed while one had closed on one channel only. Corrected in the
  aftermath paragraph above and by finding 3's row below.
- **2 (test-evidence): family 1's two mirrored 30-lane registers could
  drift apart silently** — a node SET and a lane COUNT are shape, and the
  arm's substitution kept both. Each row now carries a CHANNEL-INDEPENDENT
  lane identity, and both modules carry the same `CH14_LANE_IDENTITIES`
  literal, spelled `<node>/<lane key> | <finding path>[#<code>]` — the
  lane's identity plus the SHAPE of what it owes, so a row that keeps its
  label while driving a neighbour's case reds too. Each half asserts its
  own register against that list by equality AND asserts every entry
  verbatim in the SIBLING module's SOURCE. The two directions are what
  close the drift: a substituted lane reds against its own list, a list
  edited to match one reds against the other. A genuinely shared register
  is impossible here — importing one test module from the other
  re-registers its suite — so the content comparison IS the mechanism,
  and the comment where the register lives says exactly that. Four
  fixtures were re-keyed so the two channels' paths coincide
  (`NOPE`→`GHOST`, `E`→`COMMIT`); the differences that remain are
  dimension 1's two, which ride the per-channel PROSE label and not the
  identity.
- **3 (test-evidence): family 3's five-rules × four-operand-states matrix
  ran on the direct channel alone.** The register now carries BOTH
  channels' fixtures per case, on family 8's one-register idiom (the
  `handFile` builder moves up beside the ch14 fixtures and both families
  generate from it): 35 cases × 2 channels + the register check = 71
  lanes, from 36. Every case's file half agrees with its direct half
  finding for finding EXCEPT the two dimension-1 divergences, which are
  declared per case (`fileFindings`) rather than smoothed over — so the
  expansion also MEASURES the packet's two-outcome-class claim instead of
  assuming it. No product defect surfaced.
- **4 (test-evidence): family 4's whole-set assertions were taken AFTER a
  prefix filter**, so a spurious finding outside the container was
  invisible. The filter is retired; both sides assert the WHOLE
  document's finding set by literal value. Two `wait`-container rows
  gained an empty `onResume` so the container's faults are the document's
  only faults — staging the fixture, never re-narrowing the assertion.
- **5 (bookkeeping): the stale `OPEN QUESTION` comment** at the family-3
  register is replaced by a present-tense statement of the 2026-08-16
  ruling; the ruling's own ground stays at the rows that pin it.

Four receipt-backed probes, all through the probe runner with a green
baseline, a non-masking command, a `-t` filter measured to select a
NON-ZERO set, and a byte-verified restore (receipts under
`/tmp/ch14p1-recheck/`; every row carries `baseline: green`, `exit 1`,
`suite_red: true`, `restore_verified: true`):

| finding | mutation | observed | receipt |
|---|---|---|---|
| 2 | `admit.test.ts`: one lane SUBSTITUTED for another — id, prose label, node set and count all kept | 1 of 46 red, and the red one is the CONTENT check: every legacy shape assertion stayed green in the same receipt, which reproduces the arm's measured blindness beside its fix | `PROBE-CH14P1-C2a` |
| 2 | `admit.test.ts`: a register row renamed TOGETHER with its own literal entry — the drift a duplicated literal would otherwise hide | 1 of 46 red — only the cross-module sibling check | `PROBE-CH14P1-C2b` |
| 3 | `templateSurface.ts`: rule 4's ratified stand-down regressed on the FILE channel only | 1 of 71 red — the FILE row, its direct twin green, which is the hole exactly where the arm measured it | `PROBE-CH14P1-C3` |
| 4 | `templateSurface.ts`: the role-set equality's declared-but-unused direction stops reading the used set | 16 of 17 red, every extra finding at `roles.*` — outside every prefix the retired filter narrowed to | `PROBE-CH14P1-C4` |

**Verification, re-run by the orchestrator rather than inherited:**
`v3:typecheck` PASS · `v3:lint` PASS · `v3:test` 2759/2759 PASS ·
`v3:coverage` PASS (validation mode) · `v3:adr-check` PASS ·
`v3:deferred` 1 marker / 0 errors · `v3:packet-lint` exactly TWO errors,
one per bound contract, both naming `fa8bc5a2…` recorded against
`d9a58122…` in the working tree — the ratified transient flag 5 prices,
cleared by the follow-up commit.

**GATE 2 CLOSES ON A CONVERGENCE JUDGEMENT, not on a clean verdict —
the ratifier's call, 2026-08-16.** Three rounds ran on the built bodies:
8 findings at the build commit, 5 at the aftermath, 1 at the closing
pass, with ZERO product defects in all three. The arm's own closing
recommendation was to end here rather than fold again, and the packet
records that rather than manufacturing a clean verdict it did not get.

ONE RESIDUAL, named with its route rather than folded: family 1's
cross-channel lock compares the SHAPE of what each lane owes, not its
MEANING. Two lanes whose finding paths coincide can be substituted for
each other with their identities kept and all 46 rows stay green —
reproduced by the arm in a scratch copy, not inferred. Folding it was
declined on the arm's measured ground: the source-reading half of that
lock is already syntactically over-sensitive (a pure reformat reds it),
so a further text-based cross-module lock buys brittleness rather than
proof. The general question — how two mirrored test registers prove
SEMANTIC agreement without brittle source reading — is every packet's,
not this one's. `Route: boundary-review`

**The declaration's new digest, for the follow-up act:**
`d9a58122f2c83d20e8ef07e18a0a69d4d57146bbf7c0a6066bf16c0ba23f5164`.

```json
{
  "packet_metrics": {
    "class": "kernel-semantic",
    "prediction": { "predicted": "projection", "reasoning": "plan §14.4's row, basis resolved at the draft ratification", "discovered": "projection" },
    "provenance": { "anchored": 12, "derived": 3, "new_decision": 2 },
    "rounds": { "review": 3, "doc_refinement": 0, "implementation": 3 },
    "stops": [
      { "type": "1:open-choice", "what": "a ratified C-row assigns a machine code to a container lane the declaration vocabulary cannot carry one on, and an authored code there is silently dropped", "resolution": "the human ruled the vocabulary widens (2026-08-15) under two binding conditions — the widening recorded in the ADR tally inside the act this packet already opens, and the load guard made loud for the defect class with its own regression lane; D17 carries it" },
      { "type": "4:flagged-approve", "what": "nine pre-approval flags, seven approve-ratified routes and two new-decision rows, so the plan row's flag-free-⇒-autonomous letter does not reach this packet", "resolution": "the human worked the flags one at a time and approved (2026-08-16), adding four durability duties: the plan's build-close tracked item, the follow-up commit's divergence sentence, the marker's second half, and the ADR tally entry verified by name at the close" },
      { "type": "3:plateau", "what": "the build-close arm gate ran three rounds on the built bodies — 8 findings, then 5, then 1, with zero product defects throughout — and its own closing recommendation was to stop rather than fold again, the remaining item being a test register's maintenance blind spot whose fix the arm measured as buying brittleness over proof", "resolution": "the human closed the gate on a convergence judgement (2026-08-16); the residual is dispositioned boundary-review in the Build record rather than folded, so the bytes stabilize" }
    ],
    "detector_misses": [],
    "learned": "a fold that regrains a rule owes the surfaces written for the old grain — three of the last four rounds' findings were the loop's own fold debt, not the packet's design",
    "main_thread_model": "claude-opus-5[1m]"
  }
}

```
