# Task Packet: ch13-p1b-context-dispatch — the dispatch side: the render, the packet field, the shipped catalog

Plan step: plan.md §13.4's re-derivation-alignment row (**ch13-p1 v2**),
part (b) of the in-chapter split that row pre-authorizes. Realizes
`ch13-rederivation-plan.md` phase P5's dispatch half.
Autonomy stage: measurement — inherited from the chapter header
(plan §13) and from the split's parent row. Not first-of-a-kind: a
kernel-side derivation packet with a golden trace and a journey smoke
has precedent (ch12-P2, ch12-P3, ch8-P2), and the render mints no
class this tree has not built.
Classification: **projection** — manifest tally: 11 anchored / 4 derived
/ 1 new-decision (machine-counted from the `packet_rows` block). The
one new-decision row is a test discipline over this packet's own suite:
it touches no authority, separation or availability-class semantics,
which is what keeps it below the Case-B threshold and rides it to the
human approve on a flag rather than into a contract-draft round. Every
other rule this packet states is a ratified C-row's, a derivation from
one, or a placement the cited row leaves open. Prediction and discovery
agree (plan §13.4 predicted
`projection`). The MODE nevertheless resolves to human approve:
`approve-ratified` routes exist and README §5.5 makes ONE sufficient on
its own — flag 2 carries the resolution and the aligned plan edit it
lands.

## Reading rule

This packet is POINTER-ONLY, on the division the contract's Context
states: every structural rule of this surface lives as DATA in
`v3/src/definition/schema/templateFormat.ts`, byte-locked by the
re-ratification act that closed ch13-p1a; every semantic rule lives as
a C-row in `contracts/ch13-context-block-v2-contract.md`. A row below
CITES its authority and adds only what projection adds — placement,
and the build decisions the cited row leaves open. Re-wording a cited
rule is a defect even when the wording is better.

Two disciplines govern what this packet STATES, and both cut against
saying more. **Necessity precedes truth:** each sentence earns its
place by the delegation litmus — what does the builder get wrong
without it? A sentence that fails is absent, not corrected. **A set the
tree regenerates is not stated:** where the build's own compiler, suite
or declaration re-derives a membership for free, this packet states the
DERIVATION RULE and its owner, plus a floor where one is measured —
never a hand-assembled list, which ages the moment the tree moves.

## Ledger slice (declared — feeds the coverage accounting)

```json
{
  "ledger_slice": {
    "units": [
      { "id": "l2b-pseudocode/assemble_context_blocks", "disposition": "implement" },
      { "id": "l2b-pseudocode/dispatch_intent", "disposition": "alias/inherited" }
    ],
    "rejections": [],
    "invariants": [
      { "id": "l2b/dedup-with-retained-provenance", "disposition": "test" },
      { "id": "l2b/deterministic-ordered-render", "disposition": "test" },
      { "id": "l2b/authority-scoped-gate-blocks", "disposition": "test" },
      { "id": "l2b/communication-only", "disposition": "review" }
    ],
    "traces": ["l2b-pseudocode"],
    "shared_ownership": []
  }
}
```

`assemble_context_blocks` is `implement`: the render is code this
packet writes, and it is the one l2b unit with no live claimant.
`dispatch_intent` is `alias/inherited` on the live precedent for a
reprint whose realization already exists — `l0e-pseudocode/dispatch_intent`
carries that disposition today against `deriveDispatchIntent`, one of
whose `implement` claimants is `l0d-pseudocode/dispatch_intent`; the
l2b reprint's delta is the packet field, which lands in that same
function.
Rejection strings: NONE — this surface mints no rejection and no issue
code (→[code-exclusivity]). The four invariants are the
four C10/C11/C14/C15 name as theirs; the two p1a claims are its own,
and the union closes the l2b section. What p1a already built is not
enumerated here — D15 names its single home.

## Operative material (full text — projection, not invention)

`v3/model/units/l2b-pseudocode/assemble_context_blocks.txt`, VERBATIM:

```
assemble_context_blocks(instance, template, step) → [ContextBlock]    # L2b — deterministic render; bodies resolved from the catalog only
  catalog  ← template.context_blocks                                  # id → { body }; the single body source
  rendered ← ordered_map()                                            # first-seen order; dedups by id, accumulates provenance.sources[]
  emit(ref, source):                                                  # local closure — resolve once; on a repeat only append the provenance source
    IF rendered.has(ref) THEN rendered[ref].provenance.sources.append(source) ; RETURN
    rendered.put(ref, { id: ref, body: catalog[ref].body, provenance: { sources: [source] } })
  # render order IS source order: role refs → step refs → gate/policy refs, declaration order within each — render-order, NOT precedence/override
  FOR ref IN template.role(step.role).default_agent_config.prompt_concern_refs:   # 1) role identity / operating rules
    emit(ref, { source: role_config })
  FOR ref IN step.agent_config.prompt_concern_refs:                               # 2) the current step
    emit(ref, { source: step_config })
  authorized_ops ← capability(template, step.role, step.id) ∩ event_types_of(step.transitions)   # L1 authority ∩ transition existence — the ops this actor may legally emit
  FOR event_type IN authorized_ops:                                              # 3) gates on transitions the actor may emit — not blind step membership
    FOR gate IN template.gates_for(step.id, event_type):
      FOR ref IN gate.context_block_refs:
        emit(ref, { source: gate_binding, at: (step.id, event_type) })
  RETURN rendered.values()                                            # ordered [{ id, body, provenance: { sources } }]
```

`v3/model/units/l2b-pseudocode/dispatch_intent.txt`, VERBATIM:

```
dispatch_intent(instance, template, step_id) → DispatchIntent
  step  ← template.step(step_id)
  actor ← instance.binding[step.role]                  # guaranteed present by the start invariant
  requirement ← template.runtime_context
  IF instance.runtime_context = ready(∅) THEN                                       # the workflow declared no runtime context
    runtime_view ← none                                                            # explicit: the actor assumes no workspace
  ELSE
    REQUIRE requirement = required(spec)                                            # provisioned path ⇒ a context is required (made explicit)
    provider ← providerRegistry.resolve(spec.provider)                             # the same pinned-template provider that issued the request
    REQUIRE provider is not none                       # kernel/config invariant (not a business rejection): registry stable for an active run
    runtime_view ← provider.project_for_actor(instance.runtime_context.ready_ref)  # actor-facing projection (L0e); raw ref stays kernel-side
  packet ← ContextPacket {
    instance_id, expected_version: instance.version, task: instance.task,
    role:          step.role,                                      # dispatched-as role → echoed back as expected_role
    instruction:   step.instruction,
    handoff:       payload_of_transition_into(instance, step_id),  # the envelope that brought us here; absent at start
    available_ops: event_types_of(step.transitions),              # navigation affordances; L1 enforces capability in HANDLE
    context_blocks: assemble_context_blocks(instance, template, step),   # L2b — rendered, ordered, deduped, with provenance; communication only
    effective_agent_config: resolve_agent_config(template, step, instance),   # resolved portable run intent (was raw agent_config at L0b)
    runtime_context: runtime_view }                              # the projection, or none for a context-free workflow
  RETURN DispatchIntent { actor, packet }            # a local/manual driver delivers; durable channel is L8
```

Both files are quoted with their leading and trailing whitespace-only
lines normalized away and nothing else touched; every character of
every rule line is the file's.

Both units are realized against the CONTRACT where the two speak at
different grains, and THREE places need saying because a builder
reading only the unit gets each wrong. FIRST, the render's outer gate
loop: no model↔code divergence STOP is owed — →[render-order] owns the
disposition and carries the reason, including what the two readings
cost if the guard is missing. SECOND, the unit's PARAMETER LIST, which
→[render-arity] decides and flag 8 carries; no divergence STOP is owed
there either, on the same footing — a second independent implementation
reaching identical outputs need not accept a parameter no
implementation reads, so the arity is not expressible as unit,
invariant or trace behaviour and belongs to the code home. The
`dispatch_intent` reprint's own call line spells the same three
arguments and rides that disposition. THIRD, the two
CONFIG legs: the unit spells the RAW authored nested keys, while what
the render reads is the admission-produced sibling at each fixed-keyset
level (→[admitted-belt]). The two coincide in VALUE on an admitted
template, which is exactly why the wrong read survives every test — it
is a compliance divergence, not a set divergence, and D1 owns which
surface is legal.

## Claim

Every context block an admitted template makes reachable for a
dispatched step — and no other — reaches the actor exactly once, in a
fixed order, carrying every place it came from, and it moves nothing
the kernel decides.

The four guarantees this packet is answerable for:

1. **The set is exactly right** — every ref the three positions issue
   is rendered, nothing else is, the gate leg is narrowed by authority
   rather than by step membership (→[authority-scope]), and no ref
   enters from the one channel that may not feed it
   (→[run-scope-blind]).
2. **The form is exactly right** — one member per id in a fixed order,
   every emitter recorded (→[render-order]), and a body that can only
   come from the admitted catalog, a miss aborting rather than
   degrading (→[integrity-abort]).
3. **It travels** — unconditionally present on the packet
   (→[packet-field]) and intact through the shipped path, driven at
   three grains, because no one of them reaches the far end alone: the
   golden trace in process, the journey through the shipped operator
   entrypoint's own document, and the byte-grain lane where the
   actor's artifact is actually written.
4. **Nothing else moves** — no verdict, transition or committed row
   beyond the one byte scope C14 fixes (→[byte-scope]), and every
   value-level consequence is re-pinned rather than weakened
   (→[value-repin]).

Dimensions (TWELVE, enumerated before any test row — R-DIMENSIONS):

1. **Source position** — the role config, the step config, the gate
   binding; and their fixed relative order.
2. **Order within a source** — the authored list sequence; for the gate
   leg, the enumeration of three nested containers (→[render-order]).
3. **Repetition** — the same id twice in one list, in two lists of
   different sources, and in two bindings of one step and event.
4. **Authority** — the two sets the gate leg intersects, crossed with
   the default-derivation case and the explicitly-narrowed case
   (→[authority-scope]).
5. **Authored state** — absent catalog / catalog with no refs issued
   (reachable only off the admitting channel, since the hygiene lane
   refuses it) / refs issued from one, two, three positions / empty ref
   lists (→[admitted-belt]).
6. **Key hostility, on all THREE namespaces the render touches** — a
   block id, a step id and an event type whose spellings collide with
   prototype member names, which the ratified grammars admit at
   different widths, crossed with whether the render INDEXES that
   namespace or enumerates it (→[integrity-abort]).
7. **Determinism** — the same admitted inputs rendered twice
   (→[determinism]), and the render's arity (→[render-arity]).
8. **Wire travel** — the field through canonical serialization to the
   artifact the actor reads, and through the operator entrypoint's own
   document.
9. **Non-movement, at two grains** — verdicts, transitions and
   committed rows under C14's byte experiment (→[byte-scope]), AND the
   standing equality corpus's exposure to an unconditional new field
   plus a shipped-artifact growth, which moves no verdict and still
   reds (→[value-repin]).
10. **Artifact reach** — the canonical file, the fixture pinned to it,
    the suites that consume either, and the fixture-disposition
    migration C16's ripple assigns beyond them (→[shipped-catalog],
    →[l0c-migration]); crossed with WHICH ROLE is dispatched, the
    reason being the shipped entry's ratified symmetry.
11. **Run-scope reachability** — the one channel that lives inside a
    legal input of the DISPATCH ENTRY and that no step of the dispatch
    may read into the block set (→[run-scope-blind]), crossed with a
    catalog-declared and an undeclared id.
12. **Code surface** — the machine document's code field on this
    packet's own paths, and the standing codes elsewhere
    (→[code-exclusivity]).

## Canonical rows

| ID | Rule |
|---|---|
| D1 | **Scope: the admitted form is this packet's BASIS, not its subject.** `contract:ch13-context-block-v2#C13` fixes what admission produces and ch13-p1a built it; this packet CONSUMES those surfaces and rawer ones never — the catalog record, the two produced ref positions at the roles entry and the step, and the binding's own key. Restating any admitted-form attribute here is a defect. THE TYPE-GRAIN CONSEQUENCE, stated because it decides how every read of a PRODUCED position is written — and only those, since the authored-optional keys this packet also reads have live fallbacks of their own (→[integrity-abort] names the gates key's): C13 marks the produced fields OPTIONAL on the shared raw types while every admitted VALUE carries them, so each such read is TOTAL over the optional type with an empty-list fallback that is **structurally dead on an admitted value** — the standing admitted-form belt idiom (`resolveRuntimeContextRequirement` is the live shape). No read re-validates and no read reaches an authored position. AND THE RUN-SCOPE NEGATIVE, which is this row's load-bearing half rather than a closing clause, because `contract:ch13-context-block-v2#C5` states it and NOTHING in the tree enforces it: **no read of the run-scope channel exists at all**. The wrong implementation is one identifier away at the render's CALL SITE, where the run-profile resolver is already imported and its result already sits beside the field this packet adds, and it is INVISIBLE to every other family here, because on any template without a run override the two expressions are byte-identical. INSIDE the render the channel is unrepresentable rather than merely forbidden — D3 decides the signature that makes it so, which is this rule's environment half and the reason the behavioural lane covers the call site only. Two consequences make it worse than a purity slip: a run-supplied ref would silently move what the actor sees, and — run-scope values being belted by nothing — a run-supplied ghost id would reach →[integrity-abort]'s lookup and kill a dispatch AFTER its transition committed. The lane that closes it is named and non-waivable in the acceptance set |
| D2 | **The forward-scope answer: NO second schema re-lock — CONFIRMED at this authoring. DERIVED, named measurer: the declaration tag sweep recorded in the embedding gates, which is the enumeration's single home and is not repeated here.** `contract:ch13-context-block-v2#C19` assigns the declaration growth to p1a alone and ch13-p1a's D12 forward-scopes the consequence as an expectation this authoring must answer; the answer is that every surface this packet's scope names is kernel code, a domain type, a drift registry, a test, or the shipped YAML — and none of them is `templateFormat.ts`, the one file the packet lint's schema lock reads. THE CONFIRMATION IS MEASURED, not argued from scope alone: the sweep resolves every key D7 authors to a node that is already live and byte-locked, so the shipped catalog is expressible under the declaration AS IT STANDS and no node is added. The refutation route is mechanical: the declaration file is absent from the mutation boundary, so a build needing a declaration edit fails the post-build audit before it could re-lock anything. This row confirms; it does not extend the expectation to any later packet |
| D3 | **The render's order and its dedup — the invariant homes.** Anchor: `contract:ch13-context-block-v2#C10`. Placement: a new kernel module beside the run-profile resolver, whose shape it follows; the module is a pure derivation over the pinned admitted template, called from `deriveDispatchIntent` and nowhere else. THE SIGNATURE IS A DECISION and is taken here rather than copied: the unit spells three parameters and READS ONLY TWO — nothing in its body touches the instance — so **the instance is not passed**, and the render takes the template and the STEP ID. The id rather than the step value, because this tree's `Step` carries no id of its own: the id is the key of the steps record, and both the authority call D5 forbids reimplementing and the gate provenance's step field need it. That is also the model→code mapping this tree already uses everywhere — the L0c cascade unit spells `(template, step, instance)` and is realized `(template, stepId, instance)` — so the render resolves its step through the steps record under →[integrity-abort]'s guard, the second of the two guarded records that row governs. WHAT THE DROPPED PARAMETER BUYS: C15's three-input clause is an upper bound on what rendering may DEPEND on, not a floor on arity, so depending on two satisfies it, and dropping the instance makes C5's forbidden channel UNREPRESENTABLE inside the module rather than merely prohibited — a compile-time closure where the behavioural one costs fixtures. The call-site half of C5 is untouched and stays →[run-scope-blind]'s. Flag 8 carries the deviation to the approve. The render is exported from its OWN module — its suite and its unit-map codeRef both need it — but is NOT re-exported from the kernel barrel, unlike the resolver whose shape it otherwise follows: the boundary is the pin, and adding an export line would land a file the audit does not admit. WHY THIS ROW STAYS ANCHORED, stated because a Case-B challenge would cite this row's own words about unrepresentability: the decision changes no OUTPUT of the render at any input — no observer can distinguish the two arities — so it is a mechanism tightening a separation C5 already ratifies, not a new semantics, which is what keeps it a build choice riding a flag rather than a minted duty. THE ORDER, which the unit and the contract state at different grains and the contract decides: sources run role → step → gate, the authored sequence holds inside one list, and the gate leg walks **the admitted gates record in that record's own enumeration**, each event's pipeline in its authored sequence, each binding's list likewise, with D5 deciding what may emit. The unit's outer loop over the authorized ops is the same walk at the model's coarser grain, and the SET is identical ONCE the gate lookup carries →[integrity-abort]'s guard — D5's filter being the only thing that otherwise removes an event. UNGUARDED THE TWO READINGS DIVERGE, and not merely in order: the contract's walk enumerates the record's OWN keys and can never reach a prototype member, while the unit's lookup indexes the record by an authorized op and can. The ratified reading is therefore the SAFE one as well as the ordered one, and a build following the unit's shape owes the guard. A build that iterates the authorized ops also answers differently exactly when the two enumerations disagree, which is why the fixture family carries that case. THE SUBSTRATE CLAUSE binds and its measurer is named by the row itself: the admitted gates record enumerates as authored EXCEPT that the substrate **hoists ARRAY-INDEX-like keys** — canonical decimal spellings of 0 through 2³²−2 — to the front and re-sorts them ascending among themselves, and this build RE-EXECUTES that probe against the live engine before pinning any order fixture. The class is NARROWER than the event-type grammar admits, which is why naming it precisely is worth a clause: the measured spellings on either side of it live at their receipt (the embedding gates' M5 entry) and are not restated here; each is a LEGAL event type, which is what makes them usable as fixtures at all, while the dot-bearing spellings a numeric reading would suggest are refused by the id grammar and cannot appear on this surface. A build sampling ONE key from the wrong side of that boundary measures no hoisting, concludes the record enumerates as authored, and pins a fixture that discriminates nothing. THE DEDUP: an id met a second time emits no new member — **its first position stands** — while the provenance list appends the emitter as encountered, so two bindings of one step and event naming one id yield two identical source members and provenance is never collapsed. This row is the dedup-with-retained-provenance invariant's home (disposition test) and owns C10's order half |
| D4 | **The body's single source and the integrity abort — DERIVED.** Anchor: `contract:ch13-context-block-v2#C10`'s abort clause and `#C2`'s one grammar. Body text comes from the admitted catalog and from nowhere else; after admission no lookup can fail, so a dispatch-time miss is kernel-integrity drift and ABORTS LOUDLY — the throw idiom `deriveDispatchIntent` already uses for its own integrity conditions, never a skipped block and never an undefined body. DERIVATION NOTE, and the reason this row is not merely C10 restated: the render performs **THREE INDEXED record lookups, TWO of them own-property-guarded** — the catalog, and the steps record D3's signature makes it resolve; the ROLES read is the third and is EXEMPT for the reason this row gives below, which is why the census is stated as a count rather than a universal. The gates record is touched but not indexed at all: →[render-order] mandates it be reached by its OWN ENUMERATION, which is own-key by construction, so a guard there would be dead code — and the lane that watches it exists for a build that indexed anyway, which is the shape the unit's own spelling tempts. THE CALL SITE'S OWN steps read is repaired in this build too, and the clause is here because otherwise the render's guard is dead in production: the dispatch entry resolves the same record before it builds the packet, and aborts first. PRECISELY — because a builder reading "aborts first" as "the entry already handles it" would leave the index in place: the entry's own `undefined` check is exactly the check an inherited value DEFEATS, and what throws is the later actor guard, on a message blaming the start invariant. So the call-site read is repaired for two reasons, the dead guard and the misattributed failure. That file is inside the boundary, which is what separates this from the carried-scope defect below. The guard's live shape is the authority module's own-entry idiom, which this render RE-IMPLEMENTS locally because that helper is private to its module and lifting it would land a file outside the boundary. TWO GRAMMARS across the three namespaces, and the laxer one is the sharper exposure. (i) The block-id grammar admits `constructor` — the only prototype member it admits — so a plain-object catalog answers that spelling with an INHERITED member whose body reads `undefined`: a silent degrade at exactly the place the abort clause forbids one. On the admission path this half is a BELT, since the resolution belt reads the catalog's own keys and refuses an undeclared prototype-named ref on either channel; it is LIVE on the admission-BYPASSING construction path, where the discriminating fixture lives. (ii) The EVENT-TYPE grammar (`prose:ch8-C10`'s id class, which the step id shares) is laxer — it admits EVERY prototype member name, `constructor` and `__proto__` among them, and naming the CLASS rather than two examples is what keeps a build from writing an allowlist against two spellings — and a build that INDEXES the gates record by an authorized op — the shape the unit spells, and the one the ratified walk above replaces — meets the hazard head on. An ungated prototype-named transition, which admits with zero findings, then yields an INHERITED value where a list is expected: non-nullish, non-iterable, and NOT →[admitted-belt]'s case — the gates key is ch11's OPTIONAL AUTHORED key with no declared default, absent entirely on any ungated step, so its own empty-list belt is the common case and stays. The inherited value slips past both, and iterating it throws at a site whose transition is already durably committed. This half is live in PRODUCTION, not merely off the admission path, which is why the enumeration walk is mandated rather than merely preferred and why the lane that watches it survives the guard's absence. THE SAME GRAMMAR carries the STEP ID, which the render does index — that is the second of the two guarded lookups, and its failure is quieter: an inherited value passes an undefined-check, every downstream read yields empty, and the render returns an empty block list instead of aborting. CHANNEL ASYMMETRY, decisive for how the lane is authored: `constructor` survives a direct-constructed object literal, but `__proto__` in a BARE LITERAL sets the prototype and the key silently VANISHES, so a fixture spelled that way is vacuously green. It is reachable — as a computed key, through a defining call, and through the file channel's parse — and the FILE channel is this lane's chosen route because it is the one an operator can actually author. The ROLES read needs no guard and is named so the guard is not over-applied: the roles cross-rule is an EQUALITY, and the half that carries this is that every step's role must be a DECLARED roles key, so the read's key is always own. This row is the single-source half of the render; the enforcement half at the definition side is p1a's |
| D5 | **The gate leg's authority predicate.** Anchor: `contract:ch13-context-block-v2#C11`. A binding may emit exactly when its transition belongs to BOTH the step's available operations and the L1 capability narrowing — existing authority logic, nothing minted, and the render calls it rather than reimplementing any part of it. The membership half is guaranteed once admission passed, so what tests it is the ITERATION-DOMAIN negative: no block may originate outside the dispatched step's own gates. The narrowing half owes its NON-WAIVABLE counterexample, and the row states why it cannot be skipped: under default capability derivation the narrowing never bites, so a lane set without it is green and blind. The counterexample is a directly-constructed capability profile narrowing the dispatched role below its transitions, which **must silence that gate's blocks** while the event remains in the packet's available operations — the two fields disagreeing on purpose is the assertion. This row is the authority-scoped-gate-blocks invariant's home (disposition test). C11's forward scope is carried, not resolved here: the membership guarantee holds before the EC layer arrives, and the chapter taking that candidate re-examines it |
| D6 | **The packet field and the equality corpus it re-pins.** Anchor: `contract:ch13-context-block-v2#C12`, plus the sibling packet's re-pin discipline as the live precedent. The field is **ALWAYS present (possibly empty)**, an ordered list in the render's order, its members carrying the id, the body and the provenance sources, travelling verbatim through the canonical packet channel. THE PROVENANCE MEMBER, whose halves the row separates because they follow opposite conventions: the three source TOKEN VALUES keep the model's snake_case verbatim and are authored as string literals, which C12 decides, while the member's KEY spellings follow this tree's camelCase convention as a build choice flag 3 carries — C12's key half is exhausted by the literal keys its siblings name plus the packet field's own, and does not reach here; the gate member's location pair is flattened to sibling step and event fields. THE RE-PIN, which C12 makes a named duty precisely because it trips no gate until it reds: membership is **the red set the growth produces**, and the tree is its own enumeration. What is decided is not who belongs but what may be done to a member — a red site is RE-PINNED to the whole packet including the new field, never by deleting the assertion, never by narrowing it to a sub-field, never by converting an equality to a containment matcher, never by computing the expectation through the render under test, and never by pasting the failing run's own output: the expected value is a LITERAL written from the AUTHORED source. That last prohibition carries the most weight on THIS growth, whose subject is order — a pasted expectation bakes the implementation's own sequence into the assertion, reds once and passes forever, and no order family can see it, because the order families live on their own fixtures and not on the re-pinned corpus. FLOOR, measured at this basis by applying the growth in the working tree and restoring byte-identically, on TWO instruments because either alone is blind to half the set: the SUITE yields the red assertions, and the TYPECHECK yields the hand-built construction sites a required field breaks — **a vitest run cannot see a compile error**, so the second instrument is named rather than assumed (receipts: the embedding gates' M1/M3/M4 entries). The build's re-run may extend either half, never drop a member, and a floor member that does NOT red is itself a finding. A THIRD category, which neither instrument reports and which no ratified row names, is D16's. NAMED NON-MEMBERS, TWO and measured, because their silence is the informative part: the dispatch unit's own suite does not whole-packet-equal today and therefore never reds under the growth — which is why acceptance family 1 owns the equality this row cannot buy — and the l0b section trace asserts its dispatched packet by containment, so it is blind for the same reason and STAYS blind. The second is deliberately not repaired here: converting another section's trace to whole-value assertions is that section's business, and flag 5 routes the question rather than this packet answering it |
| D7 | **The shipped catalog entry and its authoring caveat.** Anchor: `contract:ch13-context-block-v2#C16` and `#C17`. The canonical template file gains a catalog carrying **the emit-envelope entry** and BOTH roles gain a default-config ref to it, the block being role-symmetric because every actor emits — a ratified half with a failure mode worth naming, since NO equality re-pin can see it: →[value-repin] writes every expectation from the AUTHORED source, so a re-pin mirrors whatever shipped, and a one-role authoring passes the canonical-file pin, every re-pin and the journey alike while the other actor's dispatches carry no block at all; the body is authored when this packet lands, sourced from that row's NAMED SCOPE inside the interim knowledge carrier `v1-prompt-parity-audit.md` — its §2 Class A ENVELOPE content, under that file's own interim-carrier ruling — and retiring the carrier belongs to the EC chapter's definition of done. The qualifier is load-bearing, not decoration: Class A holds eleven prompt ids of which only the envelope material is in scope, so a body reaching the rest exceeds what C16 authorizes as its source. WHAT THE BODY IS, per `contract:ch13-context-block-v2#C3`, because a body author needs both facts and neither is guessable: it is authored static text delivered without transformation at the shipped instruction field's outbound exposure class, and the surface defines NO interpolation syntax and RESERVES none — brace-styled literal text is ordinary legal prose, which matters immediately because an emit-envelope body will contain literal braces. Beside it ships C17's comment, sited where the next entry gets written, saying that prose describing a gate's configured value carries no freshness guarantee — an aim, never enforcement; nothing this chapter ships describes gate configuration, so nothing can go stale yet. NO LANE SEES THAT COMMENT and the row says so rather than leaving the silence to be discovered: the canonical-file pin compares ADMITTED values, in which a YAML comment does not exist, so its presence rides the file edit under review — the same shape D12 names when a duty falls outside every gate. THE BODY'S AUTHORING FORM is the other thing no lane catches: a scalar that BEGINS with a brace is a YAML flow mapping unless quoted or written as a block scalar, and an emit-envelope body is exactly the text likely to start that way, so it follows the shipped instruction fields' own block-scalar form. THE FIXTURE CO-EDIT, named because a one-sided edit is mechanically red and the failure would look like a pin defect rather than an omission: the canonical file and the testkit fixture are equality-pinned at the ADMITTED stage, so both gain the catalog and both role refs in the SAME commit and the pin test itself is edited zero times — the shape ch11-P4 and ch12-P4 each used for their own shipped-key growth. WHAT THE ROLE REFS ALSO MOVE, named because the re-pin discipline forbids the shortcut that would otherwise hide it: the normalizer's lift COPIES rather than moves, so the authored `defaultAgentConfig` key survives at its own position and rides the ch12 cascade — every packet dispatched from the canonical template therefore gains the ref inside its resolved run profile as well as in the rendered blocks, and the same resolver feeds the committed issued-config column. That is exactly the movement →[byte-scope] permits at the config positions, but the re-pinned literals are written from the AUTHORED source, so a builder who does not know the ref lands at BOTH positions cannot derive them and →[value-repin] has closed the paste shortcut. RIPPLE MEMBERSHIP is C16's own criterion and this packet does not re-word it: a suite belongs iff it CONSUMES the canonical file or the shared fixture, directory location deciding nothing; the criterion bounds the catalog-content families only and never narrows D6's tree-wide one. THE CRITERION AND THE MEASUREMENT ANSWER DIFFERENT QUESTIONS, and conflating them sends a build hunting: the criterion decides which suites are ELIGIBLE — some twenty of them — while the growth measurement, taken with D6's in one pass, decides which are EDITED, and an eligible suite that does not red is edited zero times |
| D8 | **The l0c golden-trace re-pin — DERIVED.** Anchor: `contract:ch13-context-block-v2#C16`'s fixture disposition, with `contract:ch13-context-block-v2#C7`'s resolution lane for what the half-migration turns the open key into. That trace's agent-config maps carry **snake-spelled fixture sites** today — legal open data under the format-open value class, invisible to every ch13 lane — and they migrate onto the typed camelCase key together with a catalog entry that resolves them, which is what realizes the L0c slot: the cascade's worked values then carry a TYPED ref list and the dispatched packet carries the rendered block. DERIVATION NOTE: the migration is a deliberate edit, not a ripple — measured at this basis, that suite does not red under either growth, because it constructs its own template and never consumes the canonical file or the shared fixture; so it is invisible to D6's and D7's membership rules alike and is named here instead. The trap this row exists for is the half-migration: renaming the key without adding the entry turns a silently-ignored open key into an admission failure of the trace's own template, and the cascade's expected values must move in the same edit as the source |
| D9 | **Determinism.** Anchor: `contract:ch13-context-block-v2#C15`. The render depends on nothing outside its inputs, C15's three-input clause read as →[render-arity] reads it and the parameters themselves being that rule's: no wall clock, no entropy, no store access outside them — so identical committed state under an identical admitted template reproduces the list byte for byte. Carrier, both halves: the golden trace, and a lane that **renders twice from one input set** and asserts equality of the whole result. This row is the deterministic-ordered-render invariant's home (disposition test) and owns the reproducibility half only; the construction order is D3's |
| D10 | **Communication-only, byte-scope precise.** Anchor: `contract:ch13-context-block-v2#C14`. Neither the packet field nor the catalog behind it may influence round arithmetic, gate evaluation, transition verdicts or any other kernel decision; the one stated exception is the definition-static family, which is p1a's and which decides admission findings and nothing further. The canonical experiment, run as an EXECUTED lane and not a reviewed claim: delete a catalog entry together with its refs in one edit, and every verdict and transition comes out the same while **the differing bytes must be confined** to the packet artifact plus, exactly where refs rode the config positions and only there, ch12-C10's committed provenance — the ref having always been config data at those positions. THE GRAIN IS THE COLUMN, not the table, and stating it is what makes the lane buildable: both surfaces C14 names by row id are COLUMNS OF ONE TRANSCRIPT ROW, so a lane asserting "the transcript row unchanged" reds in the config-sourced variant by construction and would be repaired by weakening — the outcome →[value-repin] spends a paragraph forbidding. Precisely: ch11-C27's gate-decision column stays byte-identical in BOTH variants, while ch12-C10's issued-config column moves in the config-sourced variant and NOWHERE else. Asserting the gate-decision column is what closes the lane — watching only the moving column would let a leak into the other pass unseen. Deleting a GATE-sourced ref leaves both columns byte-identical. This row is the communication-only invariant's home (disposition review); its review binding is the packet-scoped clause the acceptance set states, and that clause binds against THIS byte-precise scope, never a wholesale phrasing. The spawn side is closed already and this packet re-opens nothing there: the adapter interprets no ref, and the packet carries blocks as data |
| D11 | **The CLI surface: zero growth, and the code exclusivity over this packet's lanes.** Anchor: `contract:ch13-context-block-v2#C18`. Zero verb growth and zero flag growth — this packet's lanes ride the standing channels as they are, and the render mints no finding at all, so **no other lane of this chapter may carry any code** is satisfied here by having none to carry. The positive half — the ratified issue code arriving intact in the CLI document — is p1a's and is asserted, not re-driven. What this packet owes is the negative direction over its OWN surface: the gate schemas' named lanes keep the codes they always had, and the operator entrypoint's documents gain no code from anything below |
| D12 | **The registry flip.** Anchor: `contract:ch13-context-block-v2#C13`'s registry-flip clause and plan §13.5's DoD line, which makes the flip a NAMED duty because the drift test pins key sets and not dispositions, so no gate catches an omission. The one row this packet owns is the rendered block member type's, whose witness is the type the packet field's members carry; its two siblings flipped with p1a. The unit-map rows this packet's slice declares flip from `pending`, each carrying its `codeRef`. The registry's own answer to "no gate catches it" is the VERBATIM PIN both drift tests carry for packet-owned rows — a wrong-but-existing target stays green on the generic lane — and this packet adopts it for its rows rather than deferring it, which is why both drift test files are inside the boundary |
| D13 | **The l2b golden trace — DERIVED.** Anchor: `contract:ch13-context-block-v2#C10` for the sequence it must reproduce, plan §13.2 for the trace's own ratified content and plan §13.5's DoD for the duty. The trace is carried as an EXECUTABLE EXPECTATION and not narrated behaviour, and it carries the THREE legs §13.2 names: a template exercising all three source positions with a repeated id, dispatched at a step, produces one named block list — ids in order, bodies from the catalog, provenance sources in encounter order including the duplicated pair; the gated transition's blocks render for the actor who could emit it; and they are ABSENT for one who could not. The third leg is the trace's own and is not delegated: the authority family proves the predicate on its own documents, while this one proves that the whole rendered document changes with authority. The committed rows the run produces are asserted beside it. DERIVATION NOTE: the section has no prior trace in the tree, so its home is minted here rather than joining one. It follows the sibling section traces' SHAPE — a direct-constructed template through admission, a scripted run — and adopts whole-value assertions as THIS trace's own discipline rather than as theirs: measured, the siblings are mixed, several asserting their dispatched packet by containment, which is precisely the blindness D6 names. The trace is where D3's order, D4's bodies and D5's authority meet on ONE document, which is the thing no per-rule lane can prove |
| D14 | **The journey smoke.** Anchor: plan §13.5's Deliverables line and the standing activation-journey rule. This packet wires previously-built foundation into a live path reachable from a SHIPPED entrypoint, so it ships at least one journey through that entrypoint: real subprocesses, production bindings, the repo's canonical template file as the operator-authored input, the full lifecycle to the end-state reads. The rendered blocks are ASSERTED THERE, and the row names where they are visible so the build does not go looking for a surface that does not exist. TWO documents, because one cannot carry both roles: the entrypoint's ACTIVATION document carries the whole dispatch intent for the START step's role, and the existing journey already asserts it by full equality, so that half extends a live assertion; the other role's dispatch rides the SUBMIT verb's committed document, whose own intent the journey asserts by containment only, so that half is a new whole-value assertion at an existing site — stated because a build told to "extend the live assertion" would look for a second activation document and find none. THE STANDING DETERMINISM CLAUSE (deterministic actors only; a stub bound through the shipped actor-configuration surface is legal, an injected seam is not) is satisfied VACUOUSLY here and is named only so its silence is not read as an omission: this journey binds no actor at all, which is also why the far-end grain of guarantee 3 lands elsewhere |
| D15 | **Out of scope.** The definition side is ch13-p1a's and is BUILT; its content is enumerated ONCE, at plan §13.4's ch13-p1a row, and is deliberately not repeated here, so the two cannot drift — the same discipline that row's own out-of-scope cell applies to THIS packet. Nothing of it is re-opened, and →[relock-answer] states this packet's relation to the one part of it that could have reached here. The chapter CLOSE's named non-members are p1a's D12 list unchanged, and are likewise not re-enumerated — the same two-home drift the row above avoids — with ONE stated exception, since that list names the DoD items and this packet edits one of them: flag 2(c) annotates a premise at DoD item (f) and takes none of that item's decisions, which stay the close's and the boundary's. The forward-scoped exemptions p1a's declaration carries are also the close's — their closing act is the flip, and this packet neither takes nor extends them |
| D16 | **The silently DE-DISCRIMINATED site — DECIDED HERE.** A growth can retire coverage without any instrument reporting it: a compile-negative whose directive witnesses ONE named absence becomes ambiguous when a second required field joins the type, so it is satisfied by either omission — green under the suite, and green under the typecheck too, because the directive under test absorbs its own error. It is therefore a member of neither of →[growth-instruments]'s sets, and no ratified row reaches it: C12's ripple is scoped to full-packet equality FIXTURES, and the sibling packet's re-pin discipline governs what may be done to a member that REDS. THE DECISION is that such a site is REPAIRED in the same build rather than recorded and routed — the repair being to add this packet's field to the literal so its single omission stays the field the directive names. The alternative was weighed and refused: recording the loss and routing it would retire a live compile-time guarantee of a SIBLING chapter's contract for the length of a route, and the repair is one line. What makes the decision safe to bound is that its membership is MEASURED and closed, not open-ended — the tree's compile-negatives were swept and exactly one changes character under this growth (receipt: the embedding gates' M6 entry) — so this row mints a duty over a named site, never a standing obligation over a class the build must go looking for |

## Mirrored Surface Map

Every rule above is stated ONCE at its canonical row; every other
mention defers with an arrow-bracket pointer naming a registered rule.
The register's machine face is below. Its signatures include phrases
this packet QUOTES from the ratified contract; the file quotes verbatim
from its authorities elsewhere too, and those runs are deliberately NOT
censused here, because a count of them is a number no build step reads
and every edit can falsify. What governs them is a DUTY instead, at ROW
grain: every verbatim run sits in a canonical row whose anchor names
its source — a duty the register cannot enforce, because the
confinement check reaches DECLARED SIGNATURES only.

```json
{
  "mirror_map": {
    "form": "pointer-only",
    "rules": [
      { "id": "relock-answer", "canonical": "D2", "signature": ["NO second schema re-lock"], "allow": [] },
      { "id": "admitted-belt", "canonical": "D1", "signature": ["structurally dead on an admitted value"], "allow": [] },
      { "id": "run-scope-blind", "canonical": "D1", "signature": ["no read of the run-scope channel exists at all"], "allow": [] },
      { "id": "growth-instruments", "canonical": "D6", "signature": ["a vitest run cannot see a compile error"], "allow": [] },
      { "id": "de-discriminated", "canonical": "D16", "signature": ["REPAIRED in the same build rather than recorded and routed"], "allow": [] },
      { "id": "render-order", "canonical": "D3", "signature": ["the admitted gates record in that record's own enumeration", "its first position stands", "hoists ARRAY-INDEX-like keys"], "allow": [] },
      { "id": "integrity-abort", "canonical": "D4", "signature": ["own-property-guarded"], "allow": [] },
      { "id": "authority-scope", "canonical": "D5", "signature": ["must silence that gate's blocks"], "allow": [] },
      { "id": "packet-field", "canonical": "D6", "signature": ["ALWAYS present (possibly empty)"], "allow": [] },
      { "id": "value-repin", "canonical": "D6", "signature": ["the red set the growth produces"], "allow": [] },
      { "id": "shipped-catalog", "canonical": "D7", "signature": ["the emit-envelope entry"], "allow": [] },
      { "id": "l0c-migration", "canonical": "D8", "signature": ["snake-spelled fixture sites"], "allow": [] },
      { "id": "render-arity", "canonical": "D3", "signature": ["the instance is not passed", "an upper bound on what rendering may DEPEND on"], "allow": [] },
      { "id": "determinism", "canonical": "D9", "signature": ["renders twice from one input set"], "allow": [] },
      { "id": "byte-scope", "canonical": "D10", "signature": ["the differing bytes must be confined"], "allow": [] },
      { "id": "code-exclusivity", "canonical": "D11", "signature": ["no other lane of this chapter may carry any code"], "allow": [] }
    ]
  }
}
```

## In-context notes

- The render is the first kernel-side consumer of a producer-owned
  admission surface whose producer shipped in a different commit.
  →[admitted-belt] decides how the read is written, and the intent
  worth stating beside it is the shape of the temptation: a build that
  "defends" against an absent list with a fallback BEHAVIOUR — a
  re-derivation from the authored source — would reintroduce the second
  producer the monopoly exists to prevent.
- The three source positions are reached by three different route
  shapes — a role lookup, a step field, and a three-level walk through
  the gate chain — and only the third carries →[authority-scope]'s
  filter. Almost every plausible wrong implementation of this render is
  that filter applied at the wrong level of that walk.

## Embedding gates

- Target files: the mutation boundary below, nothing else.
- Entrypoints: `deriveDispatchIntent` (the only caller of the render),
  the operator CLI's activation document for the journey, and the
  actor adapter's packet materialization as a pass-through consumer
  that gains nothing.
- **Declaration tag sweep, EXECUTED at this basis — the single home of
  →[relock-answer]'s enumeration.** The nodes the shipped catalog and
  both role refs need are live and byte-locked in `templateFormat.ts`
  today: the catalog container with its key, entry and body nodes; the
  shared ref-list value class with its member and id-grammar nodes; and
  the agent-config value class's one typed field, which is the AUTHORED
  source at both config positions and carries no channel gate. The two
  channel-direct produced positions and the two normalizer hook entries
  are p1a's and are READ here, never authored. No node this packet's
  scope needs is missing, so no declaration edit arises and the file
  stays outside the boundary.
- **M1 — the packet-field growth, EXECUTED**, restored byte-identically
  afterwards (all four probe targets back to their recorded sha256s,
  empty `git status`). Baseline first: 72 files / 2259 tests, all green.
  With the field added to the packet type and set on the dispatched
  value: **3 files red, 31 assertions** — the kernel's own handle suite
  (1), the operator CLI suite (27) and the CLI journey (3).
- **M2 — the shipped-catalog growth, EXECUTED** and restored the same
  way: the canonical file and the testkit fixture gaining the catalog
  and both role refs TOGETHER. **3 files red, 31 assertions** — the
  lifecycle suite (1), the operator CLI suite (28), the CLI journey
  (2). The canonical-file equality pin stayed GREEN, which is the
  measured evidence for D7's co-edit clause; the l0c trace stayed green
  too, which is D8's derivation note.
- **M3 — both growths together with a POPULATED render, EXECUTED** and
  restored: **4 files red, 33 assertions** — the union of M1 and M2 at
  the file grain. Zero baseline-only failures in every run, so neither
  growth fixes nor hides an assertion.
- **M4 — the CONSTRUCTION-SITE sweep, EXECUTED** (`tsc --noEmit`,
  baseline green, restored byte-identically and re-verified green).
  With the packet field REQUIRED, the compiler names **5 sites, of
  which only 1 is production code and was already inside the
  boundary**; the sweep is what puts the other four there.
  `kernel/dispatchIntent.ts` is the production construction (`TS2741`);
  the four hand-built packets that are not `deriveDispatchIntent`'s are
  `runner/actorAdapter.test.ts` (a DIFFERENT error shape, `TS2322`
  rather than `TS2741`, because its `Partial` spread re-optionalizes
  the property — measured: the field added ahead of the spread
  typechecks clean, so the shape differs and the remedy does not),
  `runner/tmuxChannel.test.ts`, `testkit/scriptedAttemptExecutor.test.ts`,
  and `testkit/traceHarness.test.ts` (inside a typed activation
  outcome). M1–M3 are structurally blind to all four —
  →[growth-instruments] states why — so this sweep, not the suite, is
  what makes the boundary below complete on the type axis. Together M3
  and M4 are the floor D6 pins.
- **M5 — the substrate key-order probe, EXECUTED at this basis** (a
  /tmp script, nothing written in-repo): candidate keys inserted in
  scrambled authored order, read back by enumeration. ELEVEN bound the
  class and are the ones recorded — `0`, `1`, `2`, `10` and
  `4294967294` hoist to the front and re-sort ascending, while `01`,
  `-1`, `4294967295`, `+1`, `1e2` and `00` keep their authored
  position; the remaining candidates were non-numeric fillers and
  dot-bearing spellings that the event-type grammar refuses anyway.
  This is →[render-order]'s recorded class, and the build RE-EXECUTES
  the probe before pinning any order fixture rather than inheriting
  this reading.
- **M6 — the compile-negative sweep, EXECUTED and restored**
  byte-identically (`tsc --noEmit` green before and after; the six
  directive-bearing files restored from copies): every
  `@ts-expect-error` in `src/**` was neutralized and the suppressed
  error set compared at baseline against the growth. **Exactly one
  directive changes character** — the dispatch suite's packet literal,
  whose suppressed error goes from a single missing property to a
  two-property miss. That closes D16's membership as MEASURED rather
  than assumed. Recorded because the build will otherwise chase it: a
  SECOND directive's message text shifts without its character
  changing, the compiler's type-summary elision moving while its error
  code, missing property and target type all hold — a directive whose
  code and named property are unchanged is not a member.
- Test homes that already exist: the render's own lanes mint a home
  beside the new module (the run-profile resolver's shape); the packet
  field's lanes join the dispatch suite; the re-pins land where M3 and
  M4 put them; the journey extends the shipped-entrypoint journey
  suite; the wire-travel family's byte half lands at the adapter
  suite's existing canonical-serialization lane and its third dispatch
  site at the delivery-loop suite, which already calls the dispatch
  function directly; the drift pins join the two drift test files. The
  golden trace mints its own file, as every section trace in this tree
  does.
- CARRIED SCOPE: flag 5 is the home of what this packet does and does
  not SWEEP about D6's named non-members.
- CARRIED SCOPE — a LIVE DEFECT this packet's analysis surfaces and
  does not own. The kernel's HANDLE path performs the gates-record
  lookup this render's ratified walk AVOIDS — indexed by an event type,
  unguarded — and its own comment states the
  assumption the hazard breaks ("ABSENT key / absent map = the empty
  pipeline"). The event type reaching it has passed the authority
  predicate, which default-derives the step's transition keys, so a
  transition spelled with a prototype member name — legal, admitting
  with zero findings — yields an inherited non-iterable where a
  pipeline is expected, at a HANDLE site whose commit has not yet
  happened but whose operator input is entirely ordinary. PRECISION
  the repairing lane will need: only the ABSENT-KEY half of that
  comment's assumption breaks. The optional-chain short-circuits when
  the whole map is absent, so the document must be a PARTIALLY gated
  step — the same one-sided sampling this packet's own families guard
  against. A SIBLING read sits earlier in the same function, indexing
  the transitions record by the same grammar; it is not
  operator-reachable, because the profile that would carry it is
  channel-gated to direct construction, so it is named for
  prioritization rather than as a second defect. THE CLASS IS WIDER
  THAN THESE TWO and the record says so rather than implying a
  complete map: the same unguarded steps-record read recurs in the
  run-profile resolver and the gate projection, and the projection
  indexes a transitions record by the same grammar on its replay path
  — the close inherits a CLASS with named members, not an enumeration.
  NOT repaired here:
  the file is another chapter's, sits outside this boundary, and the
  threat-model rule forbids fixing in passing. Recorded and routed so
  the chapter close inherits it rather than rediscovering it.
  `Route: boundary-review`
- NAMED NON-MEMBERS of the mutation boundary, with their reasons: the
  declaration file and the contract file, neither of which this packet
  edits (→[relock-answer]); and the chapter-close surfaces D15 names,
  which ride the close act's own commit.

```json
{
  "mutation_boundary": {
    "files": [
      "v3/src/kernel/contextBlocks.ts",
      "v3/src/kernel/contextBlocks.test.ts",
      "v3/src/kernel/dispatchIntent.ts",
      "v3/src/kernel/dispatchIntent.test.ts",
      "v3/src/kernel/kernel.test.ts",
      "v3/src/kernel/lifecycle.test.ts",
      "v3/src/runner/actorAdapter.test.ts",
      "v3/src/runner/tmuxChannel.test.ts",
      "v3/src/runner/deliveryLoop.test.ts",
      "v3/src/testkit/scriptedAttemptExecutor.test.ts",
      "v3/src/testkit/traceHarness.test.ts",
      "v3/src/domain/dispatch.ts",
      "v3/src/domain/index.ts",
      "v3/src/drift/domainRegistry.ts",
      "v3/src/drift/domainRegistry.test.ts",
      "v3/src/drift/unitMap.json",
      "v3/src/drift/unitMap.test.ts",
      "v3/src/testkit/templateFixture.ts",
      "v3/templates/local-pair-v0@1.yaml",
      "v3/src/l2bTrace.test.ts",
      "v3/src/l0cTrace.test.ts",
      "v3/src/cli/cli.test.ts",
      "v3/src/cli/journey.test.ts",
      "v3/implementation/plan.md",
      "v3/implementation/packets/ch13-p1b-context-dispatch.md"
    ]
  }
}
```

## Row manifest

```json
{
  "packet_rows": {
    "rows": [
      { "id": "D1", "class": "anchored", "refs": ["contract:ch13-context-block-v2#C13", "contract:ch13-context-block-v2#C5", "prose:plan §13.4"] },
      { "id": "D2", "class": "derived", "refs": ["contract:ch13-context-block-v2#C19", "prose:packet ch13-p1a D12"] },
      { "id": "D3", "class": "anchored", "refs": ["contract:ch13-context-block-v2#C10", "contract:ch13-context-block-v2#C15", "contract:ch13-context-block-v2#C5", "prose:l2b-pseudocode/assemble_context_blocks (the unit's parameter list)"] },
      { "id": "D4", "class": "derived", "refs": ["contract:ch13-context-block-v2#C10", "contract:ch13-context-block-v2#C2", "prose:ch8-C10 (the id-class grammar the event-type key runs)"] },
      { "id": "D5", "class": "anchored", "refs": ["contract:ch13-context-block-v2#C11"] },
      { "id": "D6", "class": "anchored", "refs": ["contract:ch13-context-block-v2#C12", "prose:packet ch13-p1a D14"] },
      { "id": "D7", "class": "anchored", "refs": ["contract:ch13-context-block-v2#C16", "contract:ch13-context-block-v2#C17", "contract:ch13-context-block-v2#C3"] },
      { "id": "D8", "class": "derived", "refs": ["contract:ch13-context-block-v2#C16", "contract:ch13-context-block-v2#C7"] },
      { "id": "D9", "class": "anchored", "refs": ["contract:ch13-context-block-v2#C15"] },
      { "id": "D10", "class": "anchored", "refs": ["contract:ch13-context-block-v2#C14"] },
      { "id": "D11", "class": "anchored", "refs": ["contract:ch13-context-block-v2#C18"] },
      { "id": "D12", "class": "anchored", "refs": ["contract:ch13-context-block-v2#C13", "prose:plan §13.5 DoD"] },
      { "id": "D13", "class": "derived", "refs": ["contract:ch13-context-block-v2#C10", "prose:plan §13.2 chapter traces", "prose:plan §13.5 DoD"] },
      { "id": "D14", "class": "anchored", "refs": ["prose:plan §13.5 Deliverables", "prose:task-packet-template.md §2 activation-journey rule"] },
      { "id": "D15", "class": "anchored", "refs": ["prose:plan §13.4", "prose:packet ch13-p1a D12"] },
      { "id": "D16", "class": "new-decision", "refs": [] }
    ]
  }
}
```

## Sizing/risk (template §2 step 0 — materialized)

Predicted class (plan §13.4's live row): **projection**. Discovered at
authoring: **projection** — the manifest is 11 anchored / 4 derived /
1 new-decision, each derived row carrying its note in its own table
text and the single new-decision row being a test discipline over this
packet's own suite, below the Case-B threshold.

**The six axes on this packet's scope.** *Authority movement* — NO: the
producer-owned surfaces exist and this packet only reads them; the axis
that forced the split landed at p1a alone. *Surface spread* — ONE
concept, kernel dispatch, with the domain wire type as its own witness,
the shipped artifact as its first content, and drift as bookkeeping.
No store schema, no ingress seam, no floor projection, no CLI code, no
gates/runner/provider PRODUCTION file moves; the testkit CONTRACT is
untouched — the fixture's VALUE grows and two kit-owned hand-built
packets gain the field (M4), while the kit's exported shapes and every
production call site are unchanged. *Identity/join fragility* —
NO: block ids resolve within one admitted template, and admission has
already proven every ref resolves. *Foundation + activation coupling* —
this packet IS the activation half of the executed split, and its
foundation is BUILT and shipped, so the coupling the axis penalizes
(building the base and turning it on together) is exactly what the
split removed. *Prerequisite coupling* — NONE: p1a's build and its
re-ratification are both landed, and no act stands between this packet
and its build. *Acceptance multiplicity* — ONE proof surface,
`pnpm v3:test`, plus `ci:local` at close.

**Consume-family scan** (run because the packet ships a new value onto
a wire contract): producer `present` (the render); execution consumer
`present` (the dispatch path); external/integration `present` but
UNCHANGED in code (the adapter serializes the packet whole and
interprets nothing); read/presentation `present` as an assertion
surface only (the operator entrypoint's document already carries the
packet; no code moves); testkit `present` as a fixture VALUE, not a
contract; validator/gate `absent` (admission is p1a's and byte-frozen
here); persistence/replay `absent` — the packet is derived and no store
surface accepts it; recovery/cleanup `absent`. FIVE families record
`present`; under the testkit rule that surface does not count, leaving
**FOUR**.

**Hard stop 6 TRIPS BY LETTER** on that count (producer,
execution consumer, external/integration, read/presentation), the
ch11-p3a shape. Hard stop 7 does not: no authority producer moves.
**single-packet allowed: yes** — ONE implementation-closure proof
covers the trip, and it holds on all six of its own tests: one build
closes it with no separate sequencing (no human act sits inside it —
the contrast with p1a is the whole reason the split was taken), the
same bounded code change closes every touched bucket, the same
consumers own the fallout, one proof surface validates it, no
per-consumer-family review loop is expected, and no separate
compatibility, diagnostics, read-projection, recovery or ordering risk
is introduced.
The proof is the only autonomous route: this packet is already a split
part, so a further split would be depth 2 and a STOP. No escalation
combination trips. R-NUMERIC-LADDER does not fire: no validator over a
numeric domain enters. The `site × shape × phase` grid yields **ONE
HANDLING**: the render's only failure SHAPE is a synchronous throw,
propagated unchanged at every site, so that axis is a singleton; the
PHASE is genuinely NOT uniform — the kernel and lifecycle sites derive
AFTER their durable commit, the delivery loop BEFORE any durable write
— but no site handles the throw differently, so no cell owes a lane
another cell does not. D1 argues from that multiplicity, so it is
recorded rather than flattened to an N/A.

**Closure-budget triage:** the RUNTIME bucket (the render and the
packet field) and the SHARED-CONTRACT bucket (the wire type's new
member and its type names) are touched and deliberately collapsed —
the type is the value's own witness and meaningless without it. The
AUTHORITY bucket is p1a's and closed; the READ-PROJECTION bucket is not
entered (no floor or CLI code moves). **Proof-boundary triage:** not
triggered — no success/completion proof semantics move. **Mutable-flow
record:** not triggered — the render is a pure derivation with no side
effect, no rollback/retry/preservation, no coordination primitive, and
no precondition ordering that decides whether side effects precede
validation.

**Difficulty index** (`model-tier-experiment-2.md` §3, computed at this
approve from the machine blocks): **A = 1** (`packet_rows` = 16, in
16–30) · **B = 1** (derived 4 + new-decision 1 = 5, in 5–10) · **C = 1**
(`mutation_boundary` = 25, in 16–45) · **D = 0** (pure sync
data/render/format — the render touches no store, schema or state
machine; the journey drives subprocesses through an entrypoint that
already exists, which is a proof carrier and not the work's seam
class, the ch12-P4 reading) · **E = 1** (a new module built from
existing idioms — the run-profile resolver's shape; the two domain
type names are ordinary additions, not idiom-minting). **Σ = 4 →
Medium band.** The D axis carries no flag: a competing D = 2 reading
exists (the rubric names subprocess; the journey is in scope), and the
band is Medium under both, so the call decides nothing the approve
needs. D = 0 stands on the ch12-P4 reading. Flag 6 owns the boundary
consequence — this chapter now contributes two Medium data points.

## Pre-approval flags

1. **The shipped catalog entry's BODY and its id (D7) — the one
   ratification here that changes what the system SAYS to an actor.**
   →[shipped-catalog]
   fixes THAT the entry exists, what it is about, that both roles
   reference it, and where its content comes from; it does not fix the
   words. Three things make the wording a decision rather than an
   authoring detail. (a) It is the first prose this system SHIPS to
   actors: it lands in the canonical template file, reaches every run
   started from it, and is read by a real model at the dogfooding
   checkpoint. (b) The named source is a v1 audit whose relevant class
   holds ELEVEN prompt ids of which only the envelope material is in
   C16's scope, so turning it into ONE block body is a selection.
   (c) The v1 content is v1's CLI, so nothing can be copied: the body
   must be written against v3's shipped surfaces, and a body describing
   a command form this tree does not ship would be worse than no block.
   THE SOURCE IS v1's AND THE SURFACE IS v3's, and that gap decides
   the content: the carrier's emit material describes v1's own
   mechanism — re-fetching handoff and execution ids from a status
   command before each emit, because v1's authority moved after every
   handoff. MEASURED against this tree: no such id, command or verb
   exists in `v3/src` at all. v3 gives each attempt a scoped emit FILE
   whose path arrives in an environment variable, so the v1 rule is not
   out of scope — it is untrue here, and shipping it would send an
   actor hunting for a surface that does not exist while its real
   output channel sits unused. What carries over is the LESSON, not the
   rule: name the one thing that silently loses an actor's work.
   THE EXACT BYTES THIS APPROVE RATIFIES, id and body, because a flag
   that asks for wording and supplies none leaves two builders free to
   ship different prose with every test green:

   ```yaml
   contextBlocks:
     emit-envelope:
       body: |-
         How to emit an operation.

         Your dispatch packet is a JSON file; its path is in the
         PAIRFLOW_PACKET environment variable. It carries your task,
         your instruction, and availableOps — the operation types
         this step can move on.

         To emit, write ONE JSON object to the path in the
         PAIRFLOW_EMIT environment variable, with EXACTLY two keys:

           { "type": "<one of availableOps>", "payload": <your result> }

         Nothing else is read. Extra keys, a missing payload, or an
         unparseable file are taken as producing NO OUTPUT AT ALL —
         silently, with nothing to correct. A well-formed emit can
         still be rejected — the type may not be in availableOps, or
         your role may not be authorized to emit it here — and the
         rejection says which.
   ```

   THE availableOps LINE WAS CORRECTED AFTER A FIRST RATIFICATION, at
   the external arm's re-check, and the corrected bytes are the ones
   above. The withdrawn wording called availableOps "the exact set of
   operation types you may emit right now". MEASURED: `dispatchIntent`
   sets it to every transition of the step, while the kernel's HANDLE
   independently rejects `not_authorized` when
   `capability(template, step.role, stepId)` excludes the type — and
   `capability` returns an AUTHORED profile entry when the template has
   one, falling back to the step's transitions only when it does not.
   The two sets therefore coincide exactly while no template authors a
   profile, which is every template today; the withdrawn sentence was
   true of this baseline and false of the mechanism. That is precisely
   the distinction D5 and family 4 exist to hold, so the body had
   contradicted this packet's own authority rule. The corrected bytes
   are true under both, which is what a shipped body must be: it
   outlives the baseline that made the coincidence hold.
   RECOMMENDATION: ratify those bytes. The block-scalar form is C17's
   own requirement and the shipped instruction fields' live shape; the
   two-key rule and the silent-`no_output` class are the adapter's
   measured contract, not a paraphrase of it. Alternative if declined:
   supply other exact bytes — a scope decision alone leaves the entry
   under-determined, which is what this flag now exists to prevent.
   `Route: approve-ratified`
2. **The mode consequence, stated plainly because it is the visible
   thing about this packet.** Plan §13.4's live row gives ch13-p1b the
   parent row's flag-free-⇒-autonomous letter, and nothing in the plan
   blocks it; flag 1's `approve-ratified` route is what fails the
   condition, so the approve is the human's (STOP `4:flagged-approve`)
   and the build does not start on the loop's own authority.
   THE ALIGNED PLAN EDIT LANDS IN THE SAME COMMIT AND DOES THREE
   THINGS, each named because the human ratifies the edit and not a
   summary of it. (a) It records the mode resolution in the row's Mode
   cell, the way the ch13-P0 and ch13-p1a rows record theirs — naming
   the FIVE `approve-ratified` routes and the one new-decision row, any
   ONE of which fails README §5.5's condition on its own — so the next
   reader sees the resolved mode and not the inherited letter; the
   row's Content cell stays the deliberate pointer it is. The signature
   route is worded by SUBJECT rather than by outcome ("the render's
   signature deviation from the unit's spelling"), because flag 8 may
   be declined and a cell naming the taken branch would then record a
   decision the packet did not make. (b) It
   disambiguates the Order paragraph's "the packet's own D4 and D6" to
   "ch13-p1a's", which stopped resolving uniquely the moment this
   packet acquired unrelated rows of those ids. (c) It records, at
   §13.5's DoD item (f), that this packet's measurement REFINES the
   class name that item rests on: the item calls canonical
   integer-form string keys "the exact class JS record enumeration
   re-orders", and →[render-order]'s measured class is narrower —
   `4294967295` is such a key and does not re-order. The refinement is
   recorded, never decided: whether the key-ban candidate ADOPTS or
   WATCHES stays the boundary's, and this edit only stops that
   decision from being taken against a refuted premise. THE EDIT IS
   BOUND to the build's own re-execution, because →[render-order]
   assigns the probe there and flag 4 exists for the case where it
   disagrees: the sentence records a basis-time reading, and a
   disagreeing re-execution corrects that line in the same build
   rather than leaving the plan carrying a refuted refinement. The
   deliverables and the rest of the DoD describe this packet as
   authored. `Route: approve-ratified`
3. **Names this packet cannot pin from ratified sources, each with a
   live precedent it follows.** (a) The render's exported function
   name — precedent: the run-profile resolver beside it. The module's
   FILE name is not among them: the mutation boundary pins it, the
   post-build audit compares against that block exactly, and this
   approve ratifies the spelling there. (b) The rendered block member type's name, which
   →[packet-field] describes and which C13 names as the registry row's
   realized type name; the l2b entity's own spelling is the natural
   candidate, and it is the one name p1a deliberately left for this
   packet. (c) The provenance member's type name and its two gate-side
   field spellings, whose VALUES are pinned verbatim by C12 and whose
   keys follow the tree's camelCase convention. (d) The `codeRef`s for
   the two unit-map rows: the render's own exported function, and — for
   the reprint row — the dispatch function the sibling l0d/l0e rows
   already target. RECOMMENDATION: accept all four as build choices
   pinned VERBATIM by the drift-test precedent D12 adopts, so the next
   packet inherits names with a test behind them.
   `Route: approve-ratified`
4. **The substrate re-execution →[render-order] assigns to the build
   can move a fixture.** What the approve should know is only the
   consequence: if the build's re-execution disagrees with the reading
   recorded at this basis, the ORDER fixture changes, not the rule, and
   the build records the measured order rather than asserting the
   recorded one. The same asymmetry sits contract-side and is NOT
   repaired here: C10's own phrasing and its recorded probe both say
   "integer-like quoted keys", which is wider than the measured class
   in the same way §13.5's DoD item did. C10 delegates the class to a
   named measurer, so no C-row edit is owed and the contract stays
   outside the boundary — but a reader of C10 alone keeps the wider
   premise, and recording that contract-side is a reopen act and
   therefore the boundary's call. `Route: boundary-review`
5. **Whole-packet blindness at two measured sites (D6's named
   non-members).** Measured, not suspected: under the packet-field
   growth the dispatch unit's own suite stays green because it asserts
   the packet by parts, and the l0b SECTION TRACE stays green for the
   same reason. Acceptance family 1 closes the first inside this packet
   for this field. The second is left as it is and routed, because
   re-pinning another section's trace is that section's business — and
   the class is wider than either site: how many other derived-value
   suites AND section traces assert by parts and would sit out their
   own growth is a sweep this packet does not run.
   `Route: boundary-review`
6. **The mutation-pilot dual-run's second chapter data point, and its
   window.** The pilot dual-runs beside arm gate 2 on every packet of
   this chapter, and this is the chapter whose boundary CLOSES the
   pre-declared two-chapter window — so this packet's number is the
   last input to the keep-or-stop decision. Scope declared: the files
   this build changes under `src/kernel/**` and `src/domain/**`, which
   carry live suite coverage today. `Route: boundary-review`
7. **The de-discriminated compile-negative is decided here — the
   packet's one `new-decision` row.** →[de-discriminated] states the
   case, why no ratified row reaches it, and why its membership is
   measured and closed; what the approve ratifies is the choice it
   makes. Alternative if declined: record the coverage loss and route
   it — which retires a live compile-time guarantee of a SIBLING
   chapter's contract for the length of a route, against a one-line
   repair in a file already inside the boundary. RECOMMENDATION:
   accept as stated. `Route: approve-ratified`
8. **The render's signature drops the unit's first parameter (D3).**
   →[render-arity] states the decision and what it buys; what the
   approve ratifies is a deviation from a ratified unit's SPELLING, so
   the flag's job is to size that deviation honestly. IT IS NOT NOVEL:
   unit↔code arity divergence is this tree's norm — FIFTEEN `implement`
   units differ in arity from their codeRefs today, none carrying any
   record, one of them dropping a parameter outright, and the L0c
   cascade unit's own `step` is realized as this tree's `stepId`
   exactly as here. WHAT IT STILL COSTS: nothing mechanical records the
   reason, because the drift lanes pin codeRefs and type names, never
   signatures. THREE options, not two. (a) Take it — the template's
   constraint-transformation rule prefers environment to prose wherever
   the transformation exists, and here it does. (b) Decline and keep
   the unit's ARITY — `(instance, template, stepId)`, the unit's own
   third parameter being the step VALUE this tree cannot supply — in
   which case →[run-scope-blind] recovers its in-render half and family
   12's existing direct member becomes the PRIMARY closure rather than
   the arity-independent belt it is under (a); the decline changes that
   member's weight, it does not create it. (c) Fix the
   model instead: drop the vestigial parameter from the unit through
   the model plane's own road. (c) is DECLINED with its reason rather
   than left unnamed — it is a model-wave act for a parameter no
   implementation reads, disproportionate to a spelling the tree
   already diverges on fifteen times. THE DIVERGENCE CENSUS IS MEASURED
   AND TRIAGED, recorded at this approve beside the arm verdict: 15
   arity divergences among the 25 comparable realized rows, of which
   exactly ONE moves information (a branch-scoped deferral carrying a
   regrowth obligation) and fourteen are representational — and TWO of
   those fourteen are this decision's own class, a parameter the unit's
   body never reads. Under that taxonomy this decision is
   REPRESENTATIONAL: no information flows through the dropped parameter
   in the model either, so nothing the model specifies fails to reach
   the code. RECOMMENDATION: (a). `Route: approve-ratified`
9. **A genre sentence the model plane does not state, and this packet
   should not mint.** Every question in flag 8 came from one unstated
   thing: what the pseudocode's parameter list IS. Read as a signature,
   any arity difference is a divergence and the tree carries fifteen.
   Read as a statement of information flow and semantics, almost none
   of them are. The proposed sentence, for the model plane's own
   front matter: *the pseudocode binds the information flow and the
   semantics; the representation is free; changing the information set
   is a packet decision.* NO MECHANISM is proposed with it — no lint,
   no drift lane, no census duty; the sentence's whole value is that a
   later packet asking this question finds it answered instead of
   re-deriving it, as this one did across two rounds. It is NOT minted
   here because a packet may not legislate the model plane's genre,
   and the measured inventory this approve records is the evidence a
   ratifying act would need. `Route: boundary-review`
10. **Whether availableOps should be capability-FILTERED is not a new
   question, and the boundary should not receive it as one.** The model
   ledger already carries it: `l1` · capability-filtered-packet-ops
   → later — *"available_ops still shows all transitions (coincides
   with the authorized set under default-derived)"* — with its sibling
   `l1` · authored-capability-restrictions-in-the-baseline → later. The
   flag-1 correction did not discover the gap; it stopped a shipped
   body from asserting the coincidence as if it were the mechanism.
   ALL THIS ITEM RECORDS is WHEN the ledger item comes due: at
   v1-workflow template AUTHORING. That is not a guess about
   scheduling — it is where the two Absents meet a surface. The model's
   own L1 example is from that very block (`capability_profile:
   { role: reviewer, step: review, allow: [converged] }`, its comment
   reading "narrows: reviewer may converge, not pass back"), and this
   tree makes the timing mechanical: a `capabilityProfile` key in a
   template FILE is an unknown-key REJECTION today, legal only on the
   direct-construction channel, so no authored template can make the
   two sets diverge until authoring admits the key. THE ARGUMENT PAIR
   the boundary will weigh, stated so it is not re-derived: filtering
   keeps ONE authority home — HANDLE decides, and a packet field that
   also decided would be a second place to be wrong; NOT filtering sets
   a UX trap the moment narrowing is real — the actor is shown a type,
   emits it, and is rejected for a reason the packet could have made
   unnecessary. NO MECHANISM is proposed here and no ledger edit is
   asked for: this is a note about due-date and arguments, and the
   item's disposition stays the model plane's. `Route: boundary-review`

## Acceptance

- Contract tests: no new `CT-*` ids — this packet realizes no IC item;
  its claim surface is the D-row set plus the four ledger invariants.
- Checks in force: the drift trio, `pnpm v3:typecheck` (the named
  carrier for →[growth-instruments]'s second half),
  `pnpm v3:coverage` (the l2b section's units, invariants and trace all
  owned at this commit), `pnpm v3:adr-check`, and `pnpm v3:packet-lint`
  — the last GREEN at this packet's build commit and at every commit
  after it, since →[relock-answer] leaves the schema lock untouched;
  and the full `ci:local` gate green at the close.
- Test disciplines + family inventories (DISCIPLINE plus PARAMETERIZED
  membership with its owner named; fixture-level enumeration is build
  work, verified member by member by the build-close arm gate's
  sensitivity pass):
  - **1. Rendered-set family** — drives guarantee 1 and →[render-order]'s
    set half. Discipline: for a dispatched step, the rendered id list
    equals exactly the ids the three positions issue under
    →[authority-scope], asserted as a WHOLE list — equality, never
    containment, so a spurious extra member reds. Membership:
    PARAMETERIZED over source position × authored state (absent list /
    empty list / populated), crossed with the catalog's own state.
    THREE members are NAMED because each is a build trap: a step whose gate
    binding names an id NO other position issues, which must appear;
    a DIRECTLY-CONSTRUCTED admitted-shaped template whose PRODUCED ref
    position and AUTHORED nested key DISAGREE, asserting the rendered
    set follows the produced one — the compliance divergence
    →[admitted-belt] names, which has no other carrier because the lift
    COPIES, so on every ordinary admitted template the two agree and
    every family here stays green; and a DIRECTLY-CONSTRUCTED
    admitted-shaped template whose catalog holds an entry no position
    issues, which must NOT — directly constructed
    because p1a's hygiene lane refuses that document at admission, so
    the trap is unreachable through the admitting channel and a builder
    authoring it there meets a loud finding instead of the lane. The family additionally re-pins the dispatch suite's
    packet assertion to a WHOLE-value equality — the growth-blind site
    D6 names — so this family and the field's own re-pin fail
    separately.
  - **2. Order family** — drives →[render-order]. Discipline: the
    rendered sequence is asserted whole, never by membership, on
    documents that DISCRIMINATE — a fixture whose three sources issue
    the same ids in different sequences, and a step whose gates record
    and transitions record enumerate in DIFFERENT orders, a document
    that separates the contract's walk from the unit's coarser one.
    Membership: PARAMETERIZED over the three nesting levels of the gate
    walk (the record, the pipeline, the binding list), each with at
    least two members so a level-swapped implementation reds. TWO
    members are NAMED on the substrate axis, because sampling one key
    can measure nothing: a hoisting key and a non-hoisting near-miss,
    both legal event types, so the class boundary is PINNED rather than
    sampled. The build's re-executed reading owns their expectations.
  - **3. Dedup-and-provenance family** — drives →[render-order]'s dedup
    half. Discipline: a repeated id yields ONE member whose provenance
    sources list every emitter in encounter order, asserted whole.
    Membership: PARAMETERIZED over repetition shape — twice in one
    list, once from each of two sources, and twice from two bindings of
    ONE step and event, that last one asserting two IDENTICAL source
    members, which is the case a collapsing implementation passes.
  - **4. Authority family** — drives →[authority-scope]. Discipline:
    both halves, in both directions. The iteration-domain negative
    asserts that no rendered block originates outside the dispatched
    step's own gates. The narrowing counterexample is NON-WAIVABLE and
    named: a directly-constructed capability profile narrowing the
    dispatched role, with the silenced event still present in the
    packet's available operations, beside its DISCRIMINATING positive
    — the same document with the profile removed, where the blocks
    appear. It is named rather than parameterized for the reason
    →[authority-scope] gives. THE DOCUMENT CARRIES TWO GATED EVENTS,
    one silenced and one left authorized whose blocks must still
    render, because a single-event document cannot tell the per-event
    predicate from a STEP-level one — under a step-level filter the
    silenced document renders nothing either, and the lane passes the
    implementation the in-context note names as the dominant failure.
    IT ALSO CARRIES A SECOND STEP whose gate bindings issue ids no
    other position issues, because the iteration-domain negative
    ("no block originates outside the dispatched step's own gates")
    passes vacuously on a document with no outside.
  - **5. Body-source family** — drives →[integrity-abort] at all THREE
    of the namespaces it governs, because they behave differently and
    one member cannot carry them. Discipline (catalog): every rendered
    body is the catalog entry's, and a miss ABORTS. Membership: the
    abort lane on a directly-constructed admitted-shaped template whose
    ref finds no entry, plus its hostile-key member — a ref whose
    spelling names a prototype member the catalog does not declare,
    which must abort rather than render an undefined body — each with
    its discriminating positive (the same document with the entry
    declared renders it).
    Discipline (steps record), NAMED because its failure is a SILENT
    DEGRADE rather than a throw and no other family reaches it, and
    driven at BOTH sites the guard is owed because guarding either
    alone leaves the other open: the render driven DIRECTLY at a step
    id spelled with a prototype member name must ABORT, and the same
    document driven THROUGH THE DISPATCH ENTRY must abort at the
    entry's own read rather than surviving to the actor guard's
    misattributed message. Each with its discriminating positive (the
    same id declared as a real step, which renders). Unguarded that lookup
    returns an inherited member, the undefined-check does not fire, and
    every downstream read yields empty — so the render returns an EMPTY
    BLOCK LIST and is green against every other lane here.
    Discipline (gates record), the opposite direction and NAMED because
    nothing else in the inventory reaches it: a dispatched step whose
    transitions carry an UNGATED prototype-named event type renders its
    legitimate blocks, contributes none for that event, and does NOT
    throw — with its discriminating positive (the same event gated,
    whose blocks appear). THE STEP CARRIES A PRESENT GATES RECORD — a
    second, gated event — because the hazard is a lookup that lands ON
    a record and misses; a step with no gates key at all short-circuits
    the optional read and passes against an unguarded implementation,
    which is the same one-sided sampling families 2 and 4 each name.
    TWO members split by CHANNEL on →[integrity-abort]'s asymmetry: the
    `constructor` spelling on either channel, the `__proto__` spelling
    on the FILE channel, since the bare literal a direct fixture would
    use drops it silently.
  - **6. Determinism family** — drives →[determinism]. Discipline: two
    renders from one input set are equal as whole values; and the
    render's inputs are exactly the ones →[render-arity] admits, and
    the family drives that with the double-render equality alone: a
    clock-varying member would assert nothing that equality does not,
    since the store, the clock and the provider registry are all
    unreachable from the module by construction. THE ARITY HAS NO
    MECHANICAL CARRIER and this family does not
    pretend otherwise: the boundary audit compares file sets and a
    codeRef pins a target, so neither observes a parameter list. Its
    review home is the build-close sensitivity pass, and family 12
    keeps a member driving the render DIRECTLY so the behavioural
    closure does not depend on the ratified arity being honoured.
  - **7. Wire-travel family** — drives →[packet-field]. Discipline: the
    field is present on EVERY dispatched packet including the empty
    case, its members carry the three declared parts, and the value
    survives canonical serialization to the artifact the actor reads
    byte-for-byte. Membership: PARAMETERIZED over the dispatch sites
    the tree has, enumerated at the build from the callers of the
    dispatch function — THREE at this basis, the third being the
    delivery loop's, which is why its suite is inside the boundary. The
    byte half lands where the actor's artifact is actually written, at
    the adapter suite's existing canonical-serialization lane; the
    operator journey cannot carry it, because it runs no actor.
  - **8. Non-movement family** — drives →[byte-scope]. Discipline: the
    canonical experiment is EXECUTED as a lane, not reviewed: one edit
    deleting an entry with its refs, asserting identical verdicts and
    transitions, and asserting the differing bytes fall only where
    →[byte-scope] permits, at that row's COLUMN grain. Membership: the
    config-sourced and the gate-sourced variants. BOTH assert the
    gate-decision column byte-identical; the config-sourced one
    additionally permits the issued-config column to move and asserts
    it moves ONLY there, while the gate-sourced one asserts both
    columns unmoved — the direction a provenance leak would break.
    Home: the kernel suite, where committed rows are already read back.
  - **9. Value re-pin family** — drives →[value-repin]. The build runs
    both growths and takes the membership from BOTH instruments —
    the suite's red assertions AND the typecheck's construction sites
    (→[growth-instruments]) — re-pins every member to the whole value
    under that row's prohibitions, and records the resulting set
    against the measured floor; a floor member that stays green, or
    compiles, is a finding. ONE member is NAMED, is →[de-discriminated]'s,
    and sits OUTSIDE the floor comparison the previous sentence governs
    — the dispatch suite's compile-negative literal, whose staying
    green is EXPECTED rather than a finding, repaired so its single
    omission stays the field its directive names.

  - **10. End-to-end family** — drives D13 and D14. The golden trace is
    one document meeting all three rules with its committed rows
    asserted beside the block list, and it carries the AUTHORITY-ABSENT
    leg on that same document — the blocks of a gated transition the
    dispatched actor could not emit do not render — which is the leg
    plan §13.2 ratifies as the trace's own and which family 4 proves
    elsewhere on a different one. The journey asserts the rendered
    blocks in the shipped entrypoint's activation document, through
    real subprocesses and the repo's canonical file, AT A DISPATCH OF
    EACH ROLE — the shipped entry is ratified role-symmetric, so a
    single-role drive cannot distinguish a symmetric authoring from a
    one-sided one. THE TWO ROLES RIDE DIFFERENT DOCUMENTS and the
    second is a NEW assertion, not an extension of a live one: the
    activation document can only ever carry the start step's role,
    while the other role's dispatch rides the submit verb's committed
    document, whose intent the journey asserts today by containment
    only — so that member RE-PINS a containment site to a whole-value
    equality rather than extending an existing one. It binds no actor:
    the operator journey drives the lifecycle through the shipped write
    verbs, which is why the byte-grain half of the wire-travel family
    lives where the actor's artifact is written and not here.
  - **11. Code-exclusivity family** — drives →[code-exclusivity], the
    direction D11 owes. THE PREMISE IS NAMED, because this packet mints
    no lane of its own and a fixture "failing through this packet's
    lanes" is unconstructible: the carrier is a validate document
    failing on the ch13 lane p1a already ships. Discipline, the two
    negatives D11 owes over THIS packet's surface — p1a's own lane
    already discharges the "only the ch13 finding carries a code"
    direction in full over its whole lane inventory, so it is asserted
    unchanged rather than re-driven: the OPERATOR entrypoint's
    documents, which are what this packet grows, gain no `code` from
    anything below; and the gate schemas' named lanes are asserted
    still carrying the codes they always had — the second half being
    what keeps the first from passing by a tree-wide code famine.
    Home: the operator CLI suite, where those documents are already
    re-pinned by family 9.
  - **12. Run-scope family** — drives →[run-scope-blind]. THREE
    members, because the signature's closure is primary but nothing
    mechanical enforces it: two at the CALL SITE, and one driving the
    render DIRECTLY with a run-scope-bearing instance in scope at the
    caller, which reds against any build that accepts and reads it
    whatever arity it wrote. NON-WAIVABLE and named rather than
    parameterized, for the reason D5's counterexample is: under default
    inputs the wrong implementation is byte-identical to the right one,
    so only a fixture that carries the forbidden channel can tell them
    apart. The two call-site members are driven THROUGH the dispatch
    entry: a dispatched step whose instance carries
    run-scope refs naming a catalog-DECLARED id — the rendered list must
    equal the same render with the override removed, and the override's
    list must DIFFER from the authored one or the member discriminates
    nothing — and one naming an UNDECLARED id, which must render
    identically and must NOT abort. The second is what separates a
    purity violation from a live outage.
  - **13. L0c-migration family** — drives →[l0c-migration], which no
    other family reaches and which no instrument reports: D8's own
    measurement is that the suite reds under NEITHER growth, so without
    a stated discipline the migration can be skipped with everything
    green. Discipline: after the migration the l0c trace's cascade
    values carry a TYPED ref list resolving to a declared catalog entry,
    and its dispatched packet carries the rendered block, both asserted
    whole. The half-migration →[l0c-migration] warns of is what the
    resolving-entry half catches: renaming without the entry fails that
    template's own admission.
- Drift tests green (standing, unconditional — PI-3), asserted before
  AND after: the 54-name registry byte-untouched, the domain registry's
  key set unchanged with one disposition flipped and its row
  verbatim-pinned, the two unit-map rows flipped from `pending` and
  verbatim-pinned.
- Standing review rules in force (§3): `REV-C-PROJECTIONS-READONLY`
  holds a fortiori — the render writes nothing at all — but it is a
  readers-never-write rule and does NOT carry the `review`-disposition
  invariant this slice declares. `REV-A1-TXN`,
  `REV-B-LOCAL-NOT-AUTHORITY`, `REV-E-NO-ADAPTER-BRANCH` and
  `REV-DIAG-FAILOPEN` do not touch this surface — an explicit
  declaration, not an omission.
- The `review` binding, stated here because C14 assigns it to the
  owning packet and the §3 registry has no id for it: the build-loop
  review asserts, at →[byte-scope]'s BYTE-PRECISE scope and never a
  wholesale phrasing, that no catalog content and no rendered block
  reaches a kernel decision. That the registry offers no matching
  `REV-*` id — and that §3's home sits outside this packet's boundary,
  so none can be minted in this commit — is recorded rather than
  worked around. `Route: boundary-review`

## Build record

**Build execution context: MAIN-CONTEXT; guidance notes: NONE.** The user
handed the packet to a standalone fresh session as the build executor
with the packet as sole spec, and confirmed at the section-plan gate that
this session carries the whole loop — verification chain, both arm gates,
commit, plan edits and this record. §4's delegated DEFAULT was therefore
a CHOICE, not an omission, and it was declined for two reasons stated
here rather than left silent: the decorrelation ground is already
satisfied by the session boundary (this context did not author these
bytes — the approve closed in a different session at `db57d42e`), and
§4's own delegation-prompt rule exists because a delegated agent
faithfully preserves existing assert strength exactly where this packet's
point is STRONGER proof — a risk this packet carries at thirteen declared
disciplines. The approved basis was byte-verified before the first read
(sha256 `4fa3436c23c83ff2…`) against a clean tree.

**Rounds: ONE.** No fix round. Four corrections were caught inside the
build by the packet's own declared gates, and each is recorded because
each was a mis-derivation rather than a typo. (a) A family-5 file-channel
fixture carried the PRODUCED `promptConcernRefs` key in its YAML: the
unknown-key refusal fired, which is the producer monopoly working — the
fixture was wrong, not the belt. (b) The family-8 experiment was written
without a vacuity guard and passed; adding the guard turned it red for a
missing import, and the guard now asserts the deleted block really
rendered in the carrying variant, without which the whole experiment
proves nothing. (c) The blanket re-pin of the journey's activation
literals over-applied to the GATED journey, which authors its own
catalog-free template — reverted to `{}` / `[]` there. (d) Two
suite-side templates dropped the shipped role refs while overriding
`roles`, orphaning the catalog entry into p1a's hygiene lane; both were
repaired so that only the property under test (an absent `defaultActor`)
is removed.

**The substrate probe (→[render-order]) was RE-EXECUTED at this build and
AGREES with the basis reading**: `0`, `1`, `2`, `10`, `4294967294` hoist
to the front and re-sort ascending, while `01`, `1e2`, `-1`,
`4294967295`, `+1`, `00` keep their authored position (node v24.18.0,
both the defining-call and object-literal shapes). Flag 4 does NOT fire;
plan §13.5's DoD item (f) needed no correction and its "re-confirmed at
that packet's build" clause is now true. The order fixture pins the class
BOUNDARY (`10` against `01`) rather than sampling one side.

**The floor held EXACTLY, on both instruments, with no extension and no
drop.** Baseline 72 files / 2259 tests green, `tsc --noEmit` green. The
packet-field growth alone reproduced M1 (3 files / 31: kernel handle 1,
operator CLI 27, journey 3); both growths together reproduced M3 (4 files
/ 33 — the union at file grain, lifecycle joining); the typecheck
reproduced M4's four TEST construction sites (the fifth, the production
one, is this packet's own work), including `actorAdapter.test.ts`'s
measured `TS2322` shape against the other three's `TS2741`. Every floor
member RED before repair; none stayed green. D16's site is the one
recorded exception and was repaired, not routed — and the repair was
sensitivity-checked: supplying `runtimeContext` makes the directive go
UNUSED (`TS2578`), proving it still witnesses that one absence rather
than absorbing the new field's.

**Test-count delta: 72 files / 2259 → 74 files / 2313 (+54), +2 homes.**
The two new homes are the ones the packet names: `kernel/contextBlocks.ts`'s
suite (36) beside the new module, and the l2b section trace's own file
(3), minted here as every section trace in this tree is. The families
that joined declared homes: `kernel/dispatchIntent.test.ts` 7 → 15,
`kernel/kernel.test.ts` 84 → 87 (family 8's byte-scope experiment),
plus single members at the operator CLI suite (family 11), the adapter
suite's canonical-serialization lane (family 7's byte half), the delivery
loop (the third dispatch site) and both drift files.

**Realization shape.** The render is a pure module beside the run-profile
resolver whose shape it follows, exported from its own file and NOT from
the kernel barrel. It performs the three indexed record lookups D4's
census names — catalog and steps OWN-PROPERTY-GUARDED through a locally
re-implemented `ownEntry`, roles exempt on the roles cross-rule's equality
— and reaches the gates record by `Object.entries` ONLY, never indexing
it. `deriveDispatchIntent` gained the same guard on its own steps read
(D4's call-site repair, which is what keeps the render's guard from being
dead in production) and one call line. No other production file moved.

**Flag 3's build choices, each pinned VERBATIM by D12's drift lanes:**
the exported render is `assembleContextBlocks` in `kernel/contextBlocks.ts`
(the file name the mutation boundary already ratified); the packet member
type is `ContextBlock`, the name p1a deliberately left for this packet;
its provenance carrier is `ContextBlockProvenance` over
`ContextBlockSource`, written as a DISCRIMINATED UNION so that "only a
gate source carries a location" is a type-level fact — the gate arm's two
flattened fields are `stepId` and `eventType`, camelCase per the tree's
convention, while the three `source` token VALUES keep C12's snake_case
verbatim. The two unit-map `codeRef`s are the render's own export and,
for the reprint row, the dispatch function the sibling l0d/l0e rows
already target.

**Sensitivity: the lanes were proven to DISCRIMINATE, not merely to pass.**
Six mutations of the render, each applied and reverted byte-identically:
dropping the authority filter (1 red), indexing the gates record by the
authorized op — the UNIT's own shape (3 red, exactly the divergence D3
and D4 predict), unguarding the catalog lookup (1), unguarding the steps
lookup (2), collapsing provenance (3), swapping role/step source order
(5). The l2b trace was separately shown to red on LEG 3 under the
authority mutation, and the l0c half-migration trap was shown to fail
that trace's own admission when the key is renamed without the entry.

**D7's co-edit held with ZERO edits to the pin test**, which is the
measured evidence that the canonical file's block scalar and the
fixture's TS literal are byte-identical. The shipped body is the flag-1
ratified bytes including the corrected `availableOps` sentence; C17's
comment rides the file edit under review, no lane seeing it, as the row
says. The role refs land at BOTH positions as D7 warns — every re-pinned
`effectiveAgentConfig` on a canonical-template dispatch moved too, and
every such literal was written from the AUTHORED source, never pasted.

**`plan.md` is UNCHANGED in this commit**: flag 2's three aligned edits
(the Mode cell's five routes, the D4/D6 disambiguation, the DoD item (f)
refinement) all landed with the approve at `db57d42e`, and the build's
re-execution confirmed the (f) premise rather than correcting it.

**Verification at close:** `pnpm v3:typecheck`, `v3:lint`, `v3:test`
(74 files / 2313 green), `v3:coverage` (validation OK; the l2b section's
units, invariants and trace owned at this commit), `v3:adr-check` (20
ADRs consistent), `v3:packet-lint` (28 v2 packets, 0 errors — the schema
lock untouched, as →[relock-answer] predicted), and the full `ci:local`
gate. Every changed path is inside the declared `mutation_boundary`; the
two untouched members are `plan.md` and this packet file's pre-approval
body.

**Arm gate 2 (external arm, ReviewPacket §6).** Transport `gptsol`
(the 2026-08-10 user ruling; no `model:` override passed), pin
`gpt-5.6-sol` / effort `high` per `arm-pin.md`'s current row. Byte guard
CLEAN on both sides — HEAD `07f393ae`, porcelain
`b75408b1…`, tracked diff `45af9dba…`, and all three untracked hashes
identical before and after; the arm independently reproduced the
tracked-diff hash and every one of the six mutation-probe counts, and
restored each probe byte-identically. Verdict: **FINDINGS** — two
blockers and one should-fix, all three CONFIRMED by executed
counterexamples rather than reasoning, and all three FOLDED here in ONE
round.

**The fold, with the fix's own counterexample re-run for each.**
(1) *Family 8 was blind beyond the two columns D10 names.* The arm made
the committed `payloadDigest` depend on catalog content — a leak plainly
outside C14's scope — and all three lanes stayed green, because the
experiment projected only the two named columns. The claim D10 actually
makes is CONFINEMENT over every byte of the row, so the lane now compares
the WHOLE committed row with the one permitted column projected out
(projected, not asserted wholesale — asserting the row entire would red
by construction in the config-sourced variant and invite exactly the
weakening →[value-repin] forbids). Re-run of the arm's counterexample
after the fix: 2 of the 3 lanes RED, restored byte-identically.
(2) *Family 11's discriminating positive matched serialized TEXT.* The
inherited gate-lane assertion used `JSON.stringify(findings)` containment,
so a lane that lost its `code` attribute while keeping the token in its
message would pass — the code famine the second half exists to exclude.
The family now owns that half at the MACHINE shape, asserting the
findings' `code` field list. Re-run of the arm's counterexample after
the fix: RED, restored byte-identically.
(3) *The Build record's test count was stale by one*, taken before the
drift-pin edits landed. Corrected above, and the fold's own two lanes
carry it to 2313.

All three folds were authored by the orchestrator (this session), which
is what the Aftermath is asked to record. No finding touched the
render or the packet field: both blockers were TEST-STRENGTH defects in
lanes this packet declares, which is precisely the class the build-close
sensitivity pass exists to catch, and neither was visible to any
instrument the packet names — the suite and the typecheck were green
throughout. Post-fold verification re-ran the full chain and `ci:local`.

```json
{
  "packet_metrics": {
    "class": "dispatch activation (the l2b render + the packet field + the shipped catalog entry)",
    "prediction": {
      "predicted": "projection",
      "reasoning": "inherited from the ch13-p1 v2 row (basis: the ratified ch13v2 contract); the p1a/p1b split preserved the row's values unchanged",
      "discovered": "projection"
    },
    "provenance": {
      "anchored": 11,
      "derived": 4,
      "new_decision": 1
    },
    "rounds": {
      "review": 7,
      "doc_refinement": 0,
      "implementation": 2
    },
    "stops": [
      {
        "type": "4:flagged-approve",
        "what": "five approve-ratified routes plus one new-decision row rode ten pre-approval flags to the human; the inherited flag-free letter reached the packet and its §5.5 condition failed at authoring",
        "resolution": "ratified at the 2026-08-11 approve (db57d42e); flag 1 ratified TWICE — the arm's re-check refuted the first ratified body and the corrected sentences went back for re-ratification rather than being folded silently"
      }
    ],
    "detector_misses": [],
    "learned": "a packet-declared acceptance lane can be BORN asserting a named projection of its claim's surface — both arm gate-2 blockers were this class (the byte-scope lane watched two named columns; the code-exclusivity positive matched serialized text), invisible to every instrument the packet names; the confinement-minus-permitted-delta fold shape is routed to the boundary",
    "baseline_note": "LATE-WRITTEN at the ch13 boundary (2026-08-13), from repo-carried records ONLY — rounds from ch13-rederivation-arm/p5/p1b-review-record.md (§3: seven internal panel rounds; §4: two arm gate-1 passes, order inverted on the owner's call), stops from the approve commit db57d42e and plan §13.4, implementation = the one build round plus the one arm-gate-2 fold round; the block was MISSING at build close (a §5.5-convention breach — process-log 2026-08-13 carries the diagnosis), and the flag-6 mutation dual-run never ran at build while the close's own attempt aborted in the harness (same log entry)",
    "main_thread_model": "claude-opus-5[1m]"
  }
}
```
