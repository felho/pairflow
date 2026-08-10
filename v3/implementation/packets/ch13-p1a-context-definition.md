# Task Packet: ch13-p1a-context-definition — the definition side: the declared lanes driven, the admitted form produced, the hygiene lane

Plan step: plan.md §13.4's re-derivation-alignment row (**ch13-p1 v2**),
part (a) of the in-chapter split that row pre-authorizes. Realizes
`ch13-rederivation-plan.md` phase P5's definition half.
Autonomy stage: measurement — inherited from the chapter header
(plan §13) and from the split's parent row. Not first-of-a-kind as a
PACKET class (format-extension packets have precedent: ch11-P4,
ch12-P4); the schema re-lock ACT inside its build is first-of-a-kind
and rides flag 4.
Classification: **projection** — manifest tally: 7 anchored / 3 derived
/ 4 new-decision (machine-counted from the `packet_rows` block). Three
of the four new-decision rows are RESOLVED STOP VERDICTS and
`approve-ratified` is the marker that exists for that class; they were
ruled across TWO `1:open-choice` STOPs — the shape rulings on
2026-08-08 and the ADR-flavour reversal on 2026-08-09, the review
record carrying both; the fourth, D14, is a test
discipline over this packet's own suite, which touches no authority,
separation or availability-class semantics and therefore rides to the
same human approve below the Case-B threshold. No Case-B draft route
opens: routing a decision the human has already made into a
contract-draft round would ratify it twice. Prediction and discovery
agree (plan §13.4 predicted `projection`).

## Reading rule

This packet is POINTER-ONLY, on the division the contract's Context
states and this sentence quotes from it: every structural rule of this
surface lives as DATA in `v3/src/definition/schema/templateFormat.ts`,
byte-locked by the contract's ratification block; every semantic rule
lives as a C-row in `contracts/ch13-context-block-v2-contract.md`,
byte-locked by the same act. A row below CITES its authority and adds
only what projection adds — placement, and the build decisions the
cited row leaves open. Re-wording a cited rule is a defect even when
the wording is better.

Two disciplines govern what this packet STATES, and both cut against
saying more. **Necessity precedes truth:** every sentence here is a
truth-maintenance liability, so each earns its place by the delegation
litmus — what does the builder get wrong without it? A sentence that
fails is absent, not corrected. **A set the tree regenerates is not
stated:** where the build's own compiler, suite or declaration
re-derives a membership for free, this packet states the DERIVATION
RULE and its owner, plus a floor where one is measured — never a
hand-assembled list, which ages the moment the tree moves.

## Ledger slice (declared — feeds the coverage accounting)

```json
{
  "ledger_slice": {
    "units": [
      { "id": "l2b-pseudocode/validate_context_refs", "disposition": "generated/mapped" },
      { "id": "l2b-pseudocode/CREATE_INSTANCE", "disposition": "review-only" }
    ],
    "rejections": [],
    "invariants": [
      { "id": "l2b/refs-validated-at-definition-load", "disposition": "test" },
      { "id": "l2b/single-body-source", "disposition": "type/schema" }
    ],
    "traces": [],
    "shared_ownership": []
  }
}
```

`validate_context_refs` is `generated/mapped` because its rule is no
longer code: the resolution lane is declared at `[vc-blockidlist]` and
executed by the one engine on both channels — ADR-019 D1's whole point.
`CREATE_INSTANCE` is `review-only`: its only l2b delta is the comment
line placing definition-static validation at ADMISSION, already true of
the built pipeline. BOTH tokens are precedent-free in this tree and
both realized entries owe a `codeRef` the drift test resolves — flag 6.
What the other half owns is enumerated once, at D12.

## Operative material (full text — projection, not invention)

`v3/model/units/l2b-pseudocode/validate_context_refs.txt`, VERBATIM:

```
validate_context_refs(template) → ok | issues                       # ADMISSION (admit_definition) at definition load — the definition-issue channel; the static analog of binding coverage / validate_gate_config
  catalog ← template.context_blocks                                   # id → { body }; the single body source
  FOR ref IN all_issued_context_block_refs(template):                 # every role/step prompt_concern_ref + gate context_block_ref
    IF ref NOT IN catalog THEN RETURN issue(unresolved_context_block_ref)
  RETURN ok                                                           # existence only — NOT semantic parity between a block’s prose and the gate config it describes
```

`v3/model/units/l2b-pseudocode/CREATE_INSTANCE.txt`, VERBATIM:

```
# Convenience operator API, not a kernel primitive: a single "start workflow" command may
# compose CREATE_INSTANCE(...) then START(instance). activation_mode controls what happens
# after RUNTIME_CONTEXT_READY (activate vs WAITING(kickoff_pending)) — not whether CREATE dispatches.
CREATE_INSTANCE(template_ref, activation_mode, task, binding, run_overrides) → Created   # operator_intent; template + binding resolved on the start path (formalized by L0f)
  template ← definitionStore.load(template_ref)                # a pinned ADMITTED definition (admit_definition, L2) — plain or L0f-resolved, always carrying EFFECTIVE configs; the raw/authored form is admission's input and never reaches CREATE
  IF activation_mode = immediate AND task is absent THEN RETURN Rejected(task_required)
  REQUIRE binding covers every role reachable in template      # binding resolved pre-kernel; the kernel only validates coverage (fail at create, not mid-run)
  # definition-static validation happened at ADMISSION (admit_definition, definition load) — the store issues only ADMITTED definitions; CREATE validates INSTANCE inputs (task, binding coverage) only
  instance ← create { template_ref, task, binding, activation_mode,
                      kernel_status: CREATED, current_step: none, round: 0,   # round 0 = prepared, no work cycle begun yet (position none until ACTIVE)
                      runtime_context: none, run_overrides: snapshot(run_overrides), version: 1 }
  COMMIT instance creation
  RETURN Created(instance.version)                             # no dispatch yet — not active
```

The unit's model-side divergence question is settled by the contract's
Context ("Model-table note"): admission governs. No model↔code
divergence STOP is owed.

Rejection strings: NONE — `unresolved_context_block_ref` is a
definition ISSUE code in the `[d-codes]` namespace, already declared at
the ratifying basis, not a registry rejection name. The 54-name
registry is byte-untouched and the drift lanes are green before and
after.

## Claim

A template's context-block surface is decided ENTIRELY by declared data
and one named semantic lane, on both channels, at admission — a
successfully admitted template carries a complete, producer-owned
context-ref form that its consumers can read without ever touching the
authored positions again, and the one issue code this surface mints
survives intact to the CLI's machine document.

The four guarantees this packet is answerable for:

1. **Every lane this surface owns actually fires** — both the declared
   validation-node lanes and the one semantic lane — on both channels,
   through the real admission entries (→[lane-drive]).
2. **Admission produces the admitted form**, computed from the authored
   source and nothing else, with the producer monopoly holding
   (→[recompute-home]).
3. **The code travels** intact to the CLI's machine document, and no
   other lane THIS PACKET owns carries a code (→[code-equality]); the
   same exclusivity over the render side's lanes is p1b's (D12).
4. **Nothing else moves** — no verdict, path or message beyond the one
   delta class D11 names (→[parity-corpus]), and every value-level
   consequence is re-pinned rather than weakened (→[value-repin]).

Dimensions (enumerated before any test row — R-DIMENSIONS):

1. **Channel** — direct construction vs the file walk. Every guarantee
   is asserted on both; the only legal differences are the declared
   ones (→[produced-positions]).
2. **Position** — the catalog, the role-level ref list, the step-level
   ref list, the gate-binding ref list.
3. **Nesting depth of the source** — the gate list is a direct field of
   its binding; the two config lists are NESTED inside a format-open
   map, which is what makes them a different realization (→[hook-form]).
   The axis has a DECLARATION-TIME half as well as an admission-time
   one: the same nesting is what the new hook's load guard must resolve
   through, and a guard that cannot reach the nested name accepts a
   declaration that writes nothing.
4. **Authored state** — absent / present-empty / present-populated /
   present-refused, per position, crossed with dimension 1.
5. **Lane independence** — six lanes over one document, each with its
   own report and its own suppression rule (→[lane-independence]).
6. **Reachability of the C9 audit** — the stand-down is template-wide,
   so what it reads must answer for every enclosure on the path to a
   ref list (→[hygiene-trigger]).
7. **Produced-vs-authored** — which positions admission writes, which
   it carries, and what a caller-supplied produced position meets.
8. **Type grain** — the shared raw types' optionality against the
   admitted value's always-present guarantee.
9. **Code travel** — the issue code from the declared lane to the CLI
   document, and its exclusivity against this packet's other lanes.
10. **Non-movement, at two grains** — verdicts, paths and messages
    unchanged but for one named class, AND the standing assertion
    corpus's exposure to a value-shape growth, which moves no verdict
    and still reds (→[value-repin]).

## Canonical rows

| ID | Rule |
|---|---|
| D1 | **Scope: the declaration is this packet's BASIS, not its subject.** The ch13v2-rowed validation nodes are live and byte-locked at the ratifying basis (`templateFormat.ts` sha256 `9368e525…` recorded at commit `3cb4498c`); this packet DRIVES their lanes and grows the declaration at the surfaces `contract:ch13-context-block-v2#C19` names as P5's, PLUS one addition C19 does not name and this packet decides in the open — the empty-list default at the gate ref position (D4), which ADR-019 D7 classes as ordinary additive node growth and which flag 2 carries to the approve rather than smuggling under C19's list. Restating any declared attribute here is a defect (ADR-019 D4) |
| D2 | **The lane-driving duty.** Discipline: every lane this surface owns is driven on BOTH channels through the real admission entries, in both directions (a violating input produces exactly the declared finding at the declared path; a conforming input produces none), and the finding SET is asserted whole — equality, never containment, so a spurious extra finding reds. MEMBERSHIP is PARAMETERIZED over `contract:ch13-context-block-v2#C19`'s inventory, which has TWO halves and this packet owes both: the lanes the ch13v2-rowed VALIDATION nodes introduce, whose owner is the declaration file at the build's basis and which the build enumerates by reading it — the derivation yields NODES, and a node carrying several lanes expands to all of them, which the build-close sensitivity pass verifies member by member; PLUS C9's one semantic lane, whose owner is D7. C19's four exclusions carry their own per-node reasons at that row and are subtracted with them. The duty exists because the declared lanes are currently live and undriven at the admission entries: the ch13 key names appear TWICE in the four definition-side suites today, both times as the absent-catalog default assertion |
| D3 | **Declaration growth (a): the two admission-PRODUCED ref positions — DERIVED.** Anchor: `contract:ch13-context-block-v2#C13` (FIELD SPELLINGS and CHANNEL GRAIN) and `#C19`. Two new field nodes join `[d-roles-entry]` and `[d-step]`, carrying the spellings C13 decides, channel-gated to the direct channel — a gate on legality, presence and evaluation only, so the normalizer still writes both positions onto the admitted value on BOTH channels, which is what C13 requires and what a channel-scoped hook would break — and citing `ch13v2-C13` in `rows`. CLOSURE, named because it does not hold mechanically and someone must own the gap: both authorities state citation closure in BOTH directions, and after this build FOUR new tags (these two nodes and D4's two hook entries) will be rowed to C13 while no C-row can cite them back — C13 is byte-locked and C19 names them in prose only. AN EARLIER FORM OF THIS ROW DECLARED THOSE FOUR "C19-forward-scoped exemptions" recorded as sibling comments in the declaration, at zero process cost. ARM GATE 1 REFUSED IT, and correctly: no authority admits an exemption mechanism. ADR-019 D4's 2026-08-08 amendment states the standing per-contract form directionally — every tag a contract cites exists in the declaration, and every node ROWED TO that contract is cited by it — and the contract's Context and the declaration's own header restate it, none of the three offering an exception. A comment is not a citation, and a packet cannot mint an exemption an authority does not define. THE MECHANISM IS THEREFORE CREATED WHERE IT BELONGS, in D4's ADR-019 prerequisite act (not D6's form-authority act — the closure rule is the ADR's text, and the contract and the declaration header only mirror it): that act gains a FORWARD-SCOPED EXEMPTION as a named, defined form — a node rowed to a byte-locked row that the row cannot cite back, admitted only where a later ratifying act will close the citation, recorded in the declaration beside the node AND in the amending act. This packet's four tags are its first instances, and they are exemptions under a defined mechanism rather than declared to be exempt by the packet asserting it. `[n-effective-config]`, rowed to C13 AND cited by it, is the shape this cannot reproduce, and the shape the closing act must restore. DERIVATION NOTE: their `kind` is `raw` on the live precedent C13's own recompute clause carries WHOLE — `[d-advances-round]`, the producer-monopoly field that is already `raw` and channel-direct — and a validating kind would MINT lanes on the direct channel, joining D2's inventory and turning a caller-supplied produced position from silent recompute into a finding, which C13's own clause forbids. RECOMPUTE HOME (→[recompute-home]): each produced position is recomputed from its authored source and overwrites any caller-supplied value; C13's CHANNEL GRAIN clause is the authority and this row is its only in-packet statement. The binding's position is NOT new — `[d-ctx-gate-refs]` is C6's authored key and stays channel-both. The authored SOURCE key survives unmodified on the admitted value at every position, which is what the ch12 cascade reads (C13's own clause); the produced positions are siblings, never replacements. NAMED NON-MOVERS, because a helpful edit here breaks D11 silently: neither landing node's `containerMessage` changes; `[d-step]`'s already omits the channel-direct `[d-advances-round]`, which settles the convention for both sites |
| D4 | **Declaration growth (b): ONE new hook kind, plus a declared default. DECIDED HERE — resolved STOP verdicts: the SHAPE ruled 2026-08-08, the ADR-019 FLAVOUR reversed and ruled 2026-08-09.** Anchor for the duty: `contract:ch13-context-block-v2#C13`'s realization clause and `ADR-019` D3/D7. The ruling settled the SHAPE — no multi-operand attribute — and left the ADR-019 flavour to be argued on its own evidence; the shape that follows is the minimum that fits the built vocabulary. **The gate position needs no hook at all**: filling an absent key with a constant is `default:` materialization, which `normalizer.ts`'s own boundary places SCHEMA-side, so `[d-ctx-gate-refs]` gains a declared empty-list default and `[n-effective-config]`'s `carry` list grows by that key — the walk materializes, the rebuild carries. **The two config positions need one new hook kind**, two entries, because their source is NESTED inside a format-open map and a value computed from another position is derivation. Both the default and the hook entries cite `ch13v2-C13` in `rows`, on D3's closure reasoning. C13's ordering clause stands unqualified: the fill runs before the binding rebuild, which the schema route satisfies by construction since plain defaults materialize during the walk. DECIDED HERE, and it is the clause a builder gets wrong in the OPPOSITE direction from the obvious guess: the declared default fills only an ABSENT key — the engine's presence test is key presence — so a caller-supplied key valued `undefined` is not filled but REFUSED by that field's own lane, which is C1's fail-closed class working, not a gap. The state C13's clause warns of is therefore unreachable through admission once the default is declared, and survives only on a direct normalizer call over a hand-built value. C13's two named build traps bind. THE ADR-019 D7 FLAVOUR, argued on the DISCRIMINATING test rather than on act-form, because both flavours have a realizing row and act-form therefore proves neither. The cut that separates them is new USE of the vocabulary versus new MEMBER of it: D7's node examples — a key, a grammar, a default — are all new uses of existing vocabulary entries, which is why that flavour anchors in plan §8.2's authored-format stance, whereas a new arm of the hook union is a new member and changes what the engine can express. This is therefore the CONSTRUCT flavour. It is ADMITTED on the two-POSITION reading of the two-independent-row test that ADR-019 D10 ratified and that D11 then applied to THIS EXACT PAIR of parents — the roles-entry and step agent-config positions — which is the shape precedent, D10 being the reading's source. THE REFUSAL COUNTERFACTUAL, which D10's own examination carries and without which the tripwire is only named: refusing the construct would not avoid an amendment, because the two nested-source derivations would then live as hand-written normalizer code outside the declared-hook regime, which is ADR-019 D9's THIRD tripwire and a residual-family amendment instead of a vocabulary one — between two amendments, keeping a derivation DECLARED wins, exactly as D10 reasoned. ADR-019 D9's first tripwire is thereby examined rather than cited: it fires on admitting a single-use construct to make one row fit, and both the two-position reading and the refusal counterfactual are why this is not that case. CONSEQUENCE, an act this packet cannot perform for itself: a SECOND prerequisite `docs(v3)` act, beside D6's, editing the THREE surfaces D10's and D11's own commits each edited — the ADR's header amendment log, D7's admitted-so-far tally, and the new section itself — in their form. THE ACT CARRIES ONE SURFACE MORE THAN D10's AND D11's DID, added at arm gate 1: **D4's closure paragraph**, which gains the FORWARD-SCOPED EXEMPTION as a defined form (D3 states why it is owed and what it must admit). That is a fourth surface, not a fourth act — the same commit, the same category — and it is the reason this act cannot be deferred behind the build: the declaration this build re-locks would otherwise carry four nodes rowed to a row that cannot cite them, under no rule that permits it. Its standing category is `process revisions` (plan §13's list), which the approve ratifies rather than the packet assumes. C13's "landing at P5's own act" is satisfied and not strained: the SCHEMA edit lands at this packet's act, and the authorizing amendment is what "never silently" requires. WHAT THE AMENDMENT NEEDS FROM THE BUILD: the construct's spelling, which D10 and D11 each carry in their own sections — so the amendment admits the construct BY KIND and records the spelling at the build, a stated divergence from the D10/D11 form rather than an inherited one (flag 6(d)). The declared default at the gate position is untouched by this: a default is literally D7's node flavour. The refused ALTERNATIVE realization: ONE entry with a new multi-operand attribute is an attribute at a new grain, refused on vocabulary MINIMALITY rather than on a tripwire: no multi-operand attribute exists in the vocabulary today, each hook is a named capability parameterized by declared operand paths, and inventing a multi-target attribute to avoid a union member trades a smaller amendment for a looser vocabulary |
| D5 | **The engine growth D3/D4/D7 require — guard machinery, twice threat-modelled. DECIDED HERE — resolved STOP verdict (user, 2026-08-08).** THREE threat models, one per capability. (i) The hook guards defend against a declared operand path that reaches nothing, so the hook returns having written nothing and no one is told — the class `normalizer.ts`'s header records and `resolveHooks` exists to end. Sites: the `NormalizerHookDecl` union gains the member, `checkHook`/`resolveHooks` gain their branch, `normalize` gains the implementation. The nested-source name IS checkable: the config field is a declared direct field of the landing node, and the ref key inside it is a declared typed field of that field's value class since ADR-019 D11, so the guard already RESOLVES one level into a plain map — what `fieldProblem` owes is naming that typed subset in its message, which today renders an empty field list. (ii) The residual channel defends against a semantic lane that cannot distinguish "unreachable" from "clean" and therefore accuses entries whose only mentions sit inside a broken position. Site: the engine's run result gains **the failed-tag surface** — the set the engine already maintains, exposed read-only, in the form the result already uses to give the R3 hand-code its operand. Scoped precisely, because the justification is load-bearing: the ENGINE consumes that set for its document-scoped dependent suppression, but no rule declared on the TEMPLATE surface reads it today, so the C9 lane is its first live consumer here and family 2's stand-down member is this surface's only guard on the operand — family 1's C9 half drives the two plain directions, neither of which breaks an enclosure, so neither reads a failed tag; the operand is exercised only where a MARKING malformation breaks the enclosure, which is family 2's member and no other. (iii) The ENCLOSURE-MARKING capability defends against a subtree the engine removes from evaluation without recording that anything failed — the arm-gate-1 counterexample: `evalMapOpen`'s `keysSubsetOf` branch emits its dead-config finding and `continue`s, so the entry and every ref list beneath it are never evaluated, while the enclosing container still returns `ok: true` and no tag is marked (MEASURED pre-growth: M1's `gates dead-config key -> []` row). A C9 stand-down reading only the tags therefore cannot see an unreachable list on this route, and would accuse an entry mentioned nowhere on a document C9 requires it to stand down on. Site: the subset skip marks the ENCLOSING container's declared tag failed, through the same `markTag` path every other failure already uses — the guard's own discipline being that the skip and the marking are one branch, so no later edit can reinstate the skip without the marking. TWO THINGS THIS ROW ASSERTS ABOUT THE CHOICE. First, the REJECTED alternative minted a stable machine code on the dead-config rule and had the hand-written lane read it: that opens a SECOND failure-signal surface beside the tags, which every later hand rule must then also consult, where (iii) completes the ONE that already exists. Second, the suppression (iii) produces is NOT a new optimization but PARITY: a declared rule citing that tag through `dependsOn` already stands down on exactly this condition today, so C9 — a hand rule by its own realization — merely receives the treatment every declared rule already has. EXAMINED AND REJECTED, recorded because it is the cheapest-looking route: dropping the stand-down entirely and reopening C9 — rejected because a single rule would then behave differently from every declared one, and because in an agent-authored environment a false `unreferenced` accusation induces a DESTRUCTIVE wrong fix (the author deletes or re-points a live entry); the failure list's truth repair is due independently of C9. Findings outside these three sentences are carried-scope (the 2026-08-04 threat-model rule), and this row's build is arm-obliged (the 2026-08-02 tooling-arm rule) |
| D6 | **The schema re-lock act. DECIDED HERE — resolved STOP verdict (user, 2026-08-08).** The contract's Context ratifies THAT a later declaration edit turns the lock red until a re-ratifying act records the new bytes; this row decides the act's name, its place in the lifecycle, and its choreography. **A PREREQUISITE ACT runs first, outside this packet's commit** — a `docs(v3)` act touching THREE sections of `contract-draft-template.md` — §4 gains the schema re-lock as a named `ratified → ratified` transition (no C-row moves, so nothing needs suspending; the §4 edit draws the transition in BOTH of that section's surfaces, its lifecycle diagram and its bullet list) and re-defining §5's metric so the number means what its name says. Without it the draft's metrics line would read one post-ratification reopening where zero reopens occurred, corrupting the number `ch13-rederivation-plan.md` §5 reads at the boundary and the count the draft's own close-time metrics line re-records — the form authority's §5 duty runs at ratification AND at close, so a mis-defined metric is recorded twice, not once. MEASURED TREE-WIDE, not from one draft, and the sweep is what constrains the act's wording rather than merely motivating it (receipt: the P5 review record's executed-measurement log, M5): a naive redefinition to "row-changing re-ratifications" would MOVE an already-recorded number — `ch9-runner-contract` carries two blocks, records 0, and its second block amended rows — so the new §5 text must exclude BOTH non-reopening amendments and schema re-locks, under which every recorded count in every draft stays where it stands. TWO drafts additionally carry the DATED-INCREMENT form ch9-C27 codifies (`ch11-gate-format`, `ch13-context-block` v1), where the recorded number is a dated snapshot with later increments beside it rather than a single live figure; the new text must leave that form legal, and the act's own check is a re-run of that sweep against its new wording. The discriminator is the `**Dated update (<date>, <act>)**` header carrying an `N → M` increment, NOT the count of metrics lines — ch8 and ch9 carry two lines each because §5's duty runs at ratification and at close, which is not an increment (M5, re-measured after a reconciliation pass refuted the first, line-oriented tally). The same sweep shows the metric has been narrated rather than computed across the tree — no tool computes it anywhere — which is the deeper reason it is worth fixing once. That act falls inside plan §13's standing Fable-mandatory categories (the contract-draft's ratification support; process revisions) and is scheduled as such. Then, in this packet's build: the declaration edit rides the packet's own build commit, leaving the D5b schema-lock check RED at that commit — a transient of the same kind as a `reopened` draft, and the reason the chapter DoD's `ci:local` green is taken after the follow-up commit and never at the build commit; the build STOPS at the standing human checkpoint; and **a FOLLOW-UP commit appends a re-ratification block** recording the NEW `sha256` and the BUILD COMMIT as its `commit` value — two commits, because the build commit's sha cannot be recorded before that commit exists — with an `arms` value naming the act rather than a review round, since no arm runs on an act that moves no C-row — a use the form authority's §3 defines as the reviewing arms, which is why §3's sentence is the act's third section: it either admits the act-naming use or records that the field is used by shape here. Recording the build commit is the decided half: the block's `commit` names the commit whose bytes the act binds. FLAG 4'S DECLINED ALTERNATIVE WAS WITHDRAWN AT ARM GATE 1 and this row carries no branch for it: the form authority wins on any mismatch and defines the metric mechanically, so the lighter route was never a legal option. The build has ONE choreography, described above. What that withdrawal DOES change here is the act's scope — the §5 redefinition is now also the repair that makes `ch9-runner-contract.md`'s recorded 0 true rather than tolerated, and the measured constraint below is what keeps that repair from moving any recorded count. NO new mechanism is built for this row at all — the phrase once read "either way", which was the withdrawn two-route framing surviving its own withdrawal (PROBE-P5-1). One wording constraint the act inherits: §4 will then carry TWO row-free transitions with opposite commit counts — supersede at one, this at two — so the act states the discriminator, which is that a re-lock's second commit records bytes that cannot exist before the first |
| D7 | **The C9 hygiene lane — DERIVED, named measurer: the instrumented engine run recorded in the floor below.** Anchor: `contract:ch13-context-block-v2#C9`, whose three carried decisions are the lane's specification and which this packet does not re-word. Placement: the audited residual's module, wired into the same finding stream as R3 and R7 — **the one place ADR-019 D1 leaves prose legislating**. The stand-down reads D5's failed-tag surface, and its trigger set is DERIVED rather than listed (→[hygiene-trigger]), because a hand list of tags cannot be true across an engine it does not control. THE DERIVATION, in three parts. (a) WHICH TAG a failure records: the engine marks the tag of the node it EVALUATES, and a value-class target is reached by a direct dispatch that bypasses that marking — so a broken ref list or agent config records its REFERENCING FIELD node's tag, never the value class's. A build that names value-class tags gets a stand-down that never fires. (b) WHICH TAGS belong: C9's rule is general — **any lane that makes a ref list unreachable** — with an illustrative list, so the set is every declared tag on the containment path from the root to a ref list, taken under (a). (c) WHAT THE AUDIT READS: its reference set is the RAW AUTHORED document, exactly as C9's first carried decision says — and so is its AUDITED set, on C9's second carried decision (each key the catalog itself enumerates, unconditionally). The audited half is stated because the obvious route silently narrows it: `evalMapOpen` writes an entry into the normalized value only where the key is a string, so a catalog read off `run.normalized` drops C2's non-string-key case, which no acceptance member drives and nothing would red. That is load-bearing, not incidental — the engine skips an entry whose enclosing open-map key fails its own subset lane WITHOUT marking that enclosure failed, so a lane reading the normalized value instead would lose a mention with no stand-down firing, which is the false accusation this whole row exists to prevent. FLOOR, taken at this basis by instrumenting the engine's marking over one malformation per position and reading back the recorded tag (receipt: the P5 review record's executed-measurement log M1 — EXECUTED and re-executed, script and output committed beside it) — extendable but not droppable, and a floor member whose MARKING malformation does not stand the audit down is itself a finding. THE QUALIFIER CHANGED AT ARM GATE 1 AND THE CHANGE IS THIS ROW'S, NOT A NOTE: one enclosure (`d-gates`) has TWO routes, and on the engine AS MEASURED only the container-kind route marks its tag — the dead-config `keysSubsetOf` route makes the ref list unreachable while marking nothing, which is a route C9's template-wide stand-down covers and this lane could not see. Part (c)'s raw read does NOT close it: it saves the mention sitting inside the dead key, and does nothing for an entry mentioned NOWHERE, which the stand-down protects. D5's third capability closes it at the source by marking the enclosure on that skip, so after this build BOTH routes mark `d-gates` and the derived trigger set is sufficient rather than merely large. The build therefore CHANGES a measured value: M1's `gates dead-config key` row reads `[]` pre-growth and must read `["d-gates"]` after, and the acceptance member below asserts the post-growth reading. The floor itself is unaffected — eleven tags markable, now reachable by twelve routes. The floor's members are: the two ref-position field NODES (two nodes covering three positions, since both config positions cite one shared node), the two agent-config field nodes, the binding, pipeline and gates nodes of the gate chain, and the enclosing steps and roles map and entry nodes — ELEVEN. The root node is deliberately absent: its own container failure yields no admitted value at all, so it can never be marked, and rule (b) reconciles to eleven rather than twelve for that reason. The two alternatives are refused: matching finding paths or messages would index prose by meaning, the failure class this line exists to end; inferring unreachability from absences in the normalized value is the R3 idiom for ONE field and cannot span the path without answering wrong in silence. Widening the engine's marking to value classes is NOT the route — it would move dependent-suppression semantics unratified |
| D8 | **The type grain and the minted names.** Anchor: `contract:ch13-context-block-v2#C13`'s TYPE GRAIN clause. Three shared raw types gain the normalized ref-list fields as OPTIONAL fields — `Step` and the `roles` entry value in `domain/template.ts`, `GateBinding` in `domain/gate.ts`; `WorkflowTemplate.contextBlocks?` already carries the decided shape. Because every added field is optional, no construction site is compiler-forced, and `pnpm v3:typecheck` carries that half over the whole tree. MINTING DUTY, named because D10's flip cannot be done without it and no gate catches its absence: C13 assigns the flipped rows their realized type names, spelling ONE (`BlockId`) and DESCRIBING the other (the catalog record type), which today is an anonymous inline shape. HOMES, decided by LAYERING rather than by scope: `BlockId` is minted in `domain/ids.ts`, the dependency-free bottom of the module where every id alias already lives — because `domain/template.ts` already type-imports the binding type from `domain/gate.ts`, and minting `BlockId` in `template.ts` while typing the binding's field from it would invert that edge into a NEW import cycle inside `domain/` — joining the pre-existing one between the template and instance modules, which is precisely why it would go unnoticed: no lint rule in this tree catches either. The catalog record type is minted in `domain/template.ts`, beside the template-level shape it names. Both join the explicit named re-export list in `domain/index.ts`, the registry's second sync surface. The catalog type's NAME is the one choice C13 leaves open; flag 6 carries it. The disposition of `l2b/single-body-source` is realized by the closed `[d-ctx-entry]` keyset and `[d-ctx-body]` together with `[vc-block-id]`'s grammar, which is what nominally excludes prose at a ref site — that ENFORCEMENT half is complete in this packet. The residual — a body-bearing key inside a format-open agent-config map is legal open data surviving onto the admitted value — is inert because C13's and C10's read rule means nothing ever reads it as a body; that is a non-enforcement rationale, not a deferred obligation, which is why the slice claims the invariant whole |
| D9 | **The CLI code travel.** Anchor: `contract:ch13-context-block-v2#C18` for both halves — the positive lane asserting **the actual VALUE of the code field** on a ch13-only fixture, and its negative twin. What this packet adds is placement: the carrier exists end to end and gains nothing — the `code` field on `ValidationFinding`, the `{stage, findings}` document `TemplateLoadError.toJSON` emits, and `toTemplateInvalid`, which passes findings through verbatim. C18's standing validate channel is the DEV CLI's validate verb, which lifts the load result into the canonical document; the operator CLI has no validate verb, and the existing coded-finding precedent lane lives in `cli/dev/dev.test.ts`, which is where both halves land. ZERO verb growth and ZERO flag growth, per the row |
| D10 | **The registry and unit-map flips.** Anchors: `contract:ch13-context-block-v2#C13`'s registry-flip clause and plan §13.5's DoD line making the flip a NAMED duty because the registry test pins key sets, not dispositions, so no gate catches an omission. The catalog and `ContextBlockRef` rows flip here carrying D8's minted names; the two unit-map rows this packet's slice declares are FLIPPED from `pending`, each carrying the `codeRef` flag 6 decides. The registry's own answer to "no gate catches it" is the VERBATIM PIN both drift tests already carry for ch12's packet-owned rows, whose stated reason — a wrong-but-existing target stays green on the generic lane — is exactly D10's exposure; this packet adopts that precedent rather than deferring it to an aftermath fold, which is why both drift test files are inside the boundary. What travels with the other half is D12's |
| D11 | **Non-movement, measured not asserted, with its ONE expected delta class — DERIVED.** Anchor: `ADR-019` D5. The corpus is **derived from the CALLERS** of the entry points this packet touches — never from a file list, the 2026-08-06 amendment's whole subject — and every case reaching them is replayed: identical verdicts, identical finding paths, identical messages, or a delta list ratified BEFORE the change. The replay has NO artifact by design: the standing suites ARE the corpus, enumerated from the callers at build time. DERIVATION NOTE: the expectation is not empty, and naming the class is what keeps the replay honest — on the direct channel the two produced positions convert a previously-firing unknown-key refusal at the two landing nodes into acceptance-plus-recompute, exactly as C13's CHANNEL GRAIN clause describes. Any OTHER verdict/path/message delta is a finding and a build STOP. Value-level movement is NOT this row's — it is D14's |
| D12 | **Out of scope — the single in-packet home for what ch13-p1b holds.** `assemble_context_blocks` and the `dispatch_intent` reprint with their order/dedup/provenance rules, the gate-ref predicate, the packet field and its tree-wide equality re-pin, the `ContextBlock` registry row, `contract:ch13-context-block-v2#C16`'s shipped catalog entry and authoring comment with their fixture ripples INCLUDING the l0c golden-trace re-pin that row's fixture disposition names, C18's code-exclusivity half over the render side's own lanes, the four render-side invariants (dedup-with-retained-provenance, deterministic-ordered-render, authority-scoped-gate-blocks, communication-only), the `l2b` golden trace, and the journey smoke. NAMED NON-MEMBERS, because they are the chapter close's and not p1b's: the dogfooding checkpoint, the draft `realized` flip and its map, the ch-13 map row, and DoD items (a)–(g). FORWARD SCOPE: C19 assigns the declaration growth to this packet alone, so p1b is expected to trigger no second schema re-lock — an expectation the p1b authoring confirms, never a guarantee this packet can make. This packet ships no consumer of the positions D3/D4 produce — the foundation half of a foundation→activation split, which plan §13.4 rules is inside the §8.2 stance (it binds at CHAPTER grain) |
| D13 | **Lane independence.** Anchor: `contract:ch13-context-block-v2#C1`, `#C7`, `#C8` and `#C9`, whose interplay this row homes rather than restates. Six lanes meet over one document — a ref member's own shape lane, the list-level duplicate lane, the membership lane, the container lane, the key lane, and the C9 audit — and **each lane reports on its own**: suppression happens only where a declared container precondition or a declared stand-down says so, and the contract's rows say which is which per pair. FIVE normative PAIRS, the ones a lane set must be able to falsify: C1's refused-or-absent catalog beside issued refs; C7's per-occurrence resolution beside C8's duplicate finding; C8's invisibility of a shape-failing member to every list-level lane; C9's deliberate carve-out from that invisibility rule; and C9's stand-down. Beside them, not a pair and driven on its own, is C8's compound clean case at the gate position — an all-clean document that must admit with zero findings, which that row assigns to P5 by name and which needs an injected registry |
| D14 | **The admitted-VALUE re-pin — DECIDED HERE.** C13 guarantees the produced positions are present on every admitted value; C12 and C16 name their ripple families explicitly because a value-level re-pin trips no gate until it reds. No ratified row names THIS ripple, and no criterion this packet could write would be better than the one the build already runs: **the membership IS the set of assertions that go red** under the growth, and the suite is its own enumeration. What this row decides is therefore not who is in the set but what may be done to a member: a red site is RE-PINNED to the admitted value including its produced fields — never by deleting the assertion, never by narrowing it to a sub-field, never by converting an equality to a containment matcher, and never by computing the expected value through the producer under test — a re-pin whose expectation is derived from the normalizer or from a re-admission is tautological, reds once and passes forever, which retires the coverage as surely as a deletion. The expected value is a LITERAL written from the AUTHORED source, never pasted from the failing run's output. FLOOR, measured at this basis by applying the growth in a throwaway copy and running the definition, schema and drift suites against a pristine baseline of the same copy, the growth-ONLY failure set being the floor (receipt: the P5 review record's executed-measurement log M3, whose script and output are committed beside it; zero baseline-only failures, so the growth neither fixes nor hides an assertion) — the build's re-run may extend it, never drop a member, and **a member of the floor that does NOT red is itself a finding**, because it means a produced position is missing: whole-admitted-template equalities, whole-roles-entry equalities, whole-admitted-binding equalities including the list-wrapped form, and normalizer-output equalities, which the word "admitted" would have excluded. Cross-channel comparisons are structurally NOT members — both sides gain the fields together — and are for the same reason blind to an omission of the produced positions, which is why guarantee 2's proof rests on the admitted-form family and not on them |

## Mirrored Surface Map

Every rule above is stated ONCE at its canonical row; every other
mention defers with an arrow-bracket pointer naming a registered rule.
The register's machine face is below. SIX of its signatures are phrases
this packet QUOTES from the ratified contract (C9, C13 twice, C18, C19)
and from ADR-019 D5. The file quotes verbatim from its authorities in
other places too; those runs are deliberately NOT censused here,
because a count of them is a number no build step reads and every
edit can falsify. What governs them is a DUTY instead: every verbatim
run in this file names its source in the same sentence that carries
it — a duty the register cannot enforce, because P11's confinement
check reaches DECLARED SIGNATURES only and an unregistered run is
outside it entirely. The register
confines ITS SIGNATURES inside this file and their home is the cited
row; what it cannot do is notice the source moving, which is why each
quoting site names its row as well as its source.

```json
{
  "mirror_map": {
    "form": "pointer-only",
    "rules": [
      { "id": "lane-drive", "canonical": "D2", "signature": ["the finding SET is asserted whole", "the lanes the ch13v2-rowed VALIDATION nodes introduce"], "allow": [] },
      { "id": "produced-positions", "canonical": "D3", "signature": ["channel-gated to the direct channel", "is C6's authored key and stays channel-both"], "allow": [] },
      { "id": "recompute-home", "canonical": "D3", "signature": ["overwrites any caller-supplied value"], "allow": [] },
      { "id": "hook-form", "canonical": "D4", "signature": ["The gate position needs no hook at all"], "allow": [] },
      { "id": "engine-channel", "canonical": "D5", "signature": ["the failed-tag surface"], "allow": [] },
      { "id": "relock-act", "canonical": "D6", "signature": ["a FOLLOW-UP commit appends a re-ratification block"], "allow": [] },
      { "id": "hygiene-trigger", "canonical": "D7", "signature": ["every declared tag on the containment path", "any lane that makes a ref list unreachable"], "allow": [] },
      { "id": "code-equality", "canonical": "D9", "signature": ["the actual VALUE of the code field"], "allow": [] },
      { "id": "parity-corpus", "canonical": "D11", "signature": ["derived from the CALLERS"], "allow": [] },
      { "id": "lane-independence", "canonical": "D13", "signature": ["each lane reports on its own"], "allow": [] },
      { "id": "value-repin", "canonical": "D14", "signature": ["the membership IS the set of assertions that go red"], "allow": [] }
    ]
  }
}
```

## In-context notes

- Both admission entries reach ONE computation, and the normalizer is
  channel-agnostic. Driving both channels is therefore not about the
  shared computation — it is about the attributes that differentiate
  them: the channel gate, key identity on the file channel, the source
  ladders, and the unknown-key refusal. Those are the only places a
  one-channel lane can be blind.

## Embedding gates

- Target files: the mutation boundary below, nothing else.
- Entrypoints: `admitTemplate` / `admitFromSource`, the file pipeline's
  validate stage, and the dev CLI's validate verb for D9 only.
- Declaration surfaces to grow, by TAG: `[d-roles-entry]` and `[d-step]`
  gain a field each (D3); `[d-ctx-gate-refs]` gains its default and
  `[n-effective-config]` its carry entry (D4); the `normalizers` array
  gains the new kind's two entries. `[d-advances-round]` is the
  channel-gated `kind: "raw"` precedent D3 follows.
- Engine surfaces to grow, by SYMBOL: `NormalizerHookDecl`
  (`vocabulary.ts`), `checkHook` / `resolveHooks` / `fieldProblem`
  (`defineSurface.ts`), `normalize` (`normalizer.ts`), and the
  `EngineRun` result plus its construction sites (`engine.ts`), whose
  `runtimeContextBindings` field is the residual-channel precedent D5
  follows.
- Test homes that already exist: the declaration and engine load guards
  and both existing hooks are driven from `schema/engine.test.ts` — the
  new hook's guard and behaviour lanes join it rather than minting a
  home. The admission-entry lanes join `definition/admit.test.ts` (the
  direct channel) and `definition/validate.test.ts` (the file channel);
  D9's two lanes join `cli/dev/dev.test.ts`; D10's verbatim pins join
  the two drift test files. D14's re-pins land wherever its red set puts
  them, which at this basis includes `fileDefinitionStore.test.ts` and
  `schema/engine.test.ts` as well as the two admission suites.
- **PROBE-P5-1 — the D6 lock cycle, EXECUTED 2026-08-08**, restored
  byte-identically afterwards (`shasum` back to `9368e525…`, two-entry
  porcelain). (a) With one appended comment line in `templateFormat.ts`,
  `python3 tools/v3-plan/check_packet.py` FAILS with exactly one error:
  *"…schema file … bytes differ from the recorded sha256 (9368e5253d11…
  recorded, 8351475e89c9… in the working tree) — an edit of the
  declaration after ratification is an unratified schema change until a
  new act records the new bytes"*. (b) With a further ratification block
  appended carrying the NEW `sha256` and a `commit` whose C-rows equal
  the working tree's, the same command returns **0 errors**. What stays
  UNMEASURED and is left to the build is the behaviour at the
  intermediate commit itself, which is the same red as (a) by
  construction.
- CARRIED SCOPE, recorded because the build opens the file and the
  threat-model rule forbids fixing it here: the declaration module's
  header pins the expressiveness audit at a sha256 that is one commit
  stale, and no check reads that pin. Outside both of D5's threat-model
  sentences, so it is recorded and routed, never repaired in passing.
  `Route: boundary-review`
- NAMED NON-MEMBERS of the mutation boundary, with their reasons: the
  contract file, whose re-ratification block lands in the FOLLOW-UP
  commit (→[relock-act]) — outside the packet's one-commit boundary, on
  the footing of the process-log lines that ride their own docs commits;
  `contract-draft-template.md` and `v3/adr/ADR-019-declared-schema-for-structural-definition-rules.md`, each edited by one of the two PREREQUISITE acts as its own `docs(v3)` commit; and
  `v3/implementation/ch13-rederivation-arm/p5/review-record.md`, the
  phase's evidence home, together with the probe scripts and outputs
  committed beside it — all of them ride their own `docs(v3)` commits
  rather than the build. The post-build audit is pinned to the build
  commit's own bytes and must see none of them.

```json
{
  "mutation_boundary": {
    "files": [
      "v3/src/definition/schema/templateFormat.ts",
      "v3/src/definition/schema/vocabulary.ts",
      "v3/src/definition/schema/defineSurface.ts",
      "v3/src/definition/schema/normalizer.ts",
      "v3/src/definition/schema/templateSurface.ts",
      "v3/src/definition/schema/engine.ts",
      "v3/src/definition/schema/engine.test.ts",
      "v3/src/definition/admit.test.ts",
      "v3/src/definition/validate.test.ts",
      "v3/src/definition/fileDefinitionStore.test.ts",
      "v3/src/domain/ids.ts",
      "v3/src/domain/template.ts",
      "v3/src/domain/gate.ts",
      "v3/src/domain/index.ts",
      "v3/src/drift/domainRegistry.ts",
      "v3/src/drift/domainRegistry.test.ts",
      "v3/src/drift/unitMap.json",
      "v3/src/drift/unitMap.test.ts",
      "v3/src/cli/dev/dev.test.ts",
      "v3/implementation/plan.md",
      "v3/implementation/packets/ch13-p1a-context-definition.md"
    ]
  }
}
```

## Row manifest

```json
{
  "packet_rows": {
    "rows": [
      { "id": "D1", "class": "anchored", "refs": ["contract:ch13-context-block-v2#C19", "ADR-019"] },
      { "id": "D2", "class": "anchored", "refs": ["contract:ch13-context-block-v2#C19"] },
      { "id": "D3", "class": "derived", "refs": ["contract:ch13-context-block-v2#C13", "contract:ch13-context-block-v2#C19"] },
      { "id": "D4", "class": "new-decision", "refs": [] },
      { "id": "D5", "class": "new-decision", "refs": [] },
      { "id": "D6", "class": "new-decision", "refs": [] },
      { "id": "D7", "class": "derived", "refs": ["contract:ch13-context-block-v2#C9", "ADR-019"] },
      { "id": "D8", "class": "anchored", "refs": ["contract:ch13-context-block-v2#C13"] },
      { "id": "D9", "class": "anchored", "refs": ["contract:ch13-context-block-v2#C18"] },
      { "id": "D10", "class": "anchored", "refs": ["contract:ch13-context-block-v2#C13", "prose:plan §13.5 DoD"] },
      { "id": "D11", "class": "derived", "refs": ["ADR-019", "contract:ch13-context-block-v2#C13"] },
      { "id": "D12", "class": "anchored", "refs": ["prose:plan §13.4"] },
      { "id": "D13", "class": "anchored", "refs": ["contract:ch13-context-block-v2#C1", "contract:ch13-context-block-v2#C7", "contract:ch13-context-block-v2#C8", "contract:ch13-context-block-v2#C9"] },
      { "id": "D14", "class": "new-decision", "refs": [] }
    ]
  }
}
```

## Sizing/risk (template §2 step 0 — materialized)

Predicted class (plan §13.4's live row): **projection**. Discovered at
authoring: **projection** — the four new-decision rows are three
resolved STOP verdicts plus a test discipline, not undecided semantics.

**THE SPLIT.** The parent row records ch13-p1 v2 as ONE packet and
pre-authorizes the partition, so the cut is a sizing call the ratified
text delegates to the loop — not a scope change. On the combined scope
two hard stops trip: **authority movement together with new runtime
behaviour turned on** (after C13 the render reads the admission-produced
positions and nothing rawer, relocating its operand to a producer-owned
surface, while the same packet turns the render on, ships the first
catalog entry and lights a journey through it), and **one concept across
3+ surfaces** (definition/admission, kernel dispatch, the domain wire
contract, the shipped template artifact, the drift registries). The
foundation+activation axis trips below hard-stop grade. Implementation-
closure proof FAILS on three of its own tests: one build does not close
it without separate sequencing (D6's human checkpoint stands between the
declaration growth and anything downstream); the consumers differ; and
more than one proof surface validates it. Shared invariant coherence is
explicitly not sufficient. **Verdict: split REQUIRED**, executed
autonomously per §5.5, depth 1, coverage union preserved, both parts
inheriting predicted class and watchpoints. Shape:
`foundation → activation`.

**The six axes on THIS packet's scope.** *Authority movement* — YES,
narrowly: D3/D4 introduce the producer-owned positions; the axis that
forced the split lands here alone and nothing is turned on.
*Surface spread* — ONE concept on ONE production surface,
`src/definition/**`, with `src/domain/**` carrying the optional type
witnesses and the two minted names of that same change and
`src/drift/**` its bookkeeping. No kernel, store, floor, ingress, emit,
gates, runner or provider file moves; the CLI gains test lanes and no
code; the testkit CONTRACT is untouched. *Identity/join fragility* — NO.
*Foundation + activation coupling* — NO, by construction; D12 names what
stays out. *Prerequisite coupling* — TWO, both named and both
Fable-mandatory `docs(v3)` acts that must land before this build and
block nothing else: D6's form-authority act, and D4's ADR-019
amendment admitting the hook construct. *Acceptance multiplicity* — ONE proof surface,
`pnpm v3:test`, plus `ci:local` at close.

**Consume-family scan** (run because the packet moves an authority):
producer `present` (the hook and the declared default); validator/gate
`present` (the declared lanes plus D7); read/presentation `present` but
UNCHANGED in code; testkit `present` as a READER only; persistence/
replay, execution consumer, recovery/cleanup, external/integration all
`absent` — the execution consumer arriving at p1b is why the scan is
recorded rather than skipped. FOUR families are `present`; testkit-as-
reader does not count toward the family-count stops (template §2's
testkit rule), so THREE count and neither hard stop 6 nor 7 trips.

No hard stop and no escalation combination trips. **single-packet
allowed: yes** — one bounded change inside one module closes every
touched bucket, one proof surface validates it, the same consumers own
the fallout, and no per-consumer-family review loop is expected.
R-NUMERIC-LADDER does not fire: no validator over a numeric domain
enters.

**Closure-budget triage:** the AUTHORITY bucket (the produced positions)
and the SHARED-CONTRACT bucket (three optional fields plus two minted
names) are touched and deliberately collapsed — the type surface is the
authority's own witness, compiler-forced nowhere, and meaningless
without it. The RUNTIME and READ-PROJECTION buckets are DEFERRED to
p1b (D12). **Proof-boundary triage:** not triggered. **Mutable-flow
record:** not triggered — no rollback/retry/preservation, no
coordination primitive, no precondition ordering deciding whether side
effects precede validation; admission is all-or-nothing with no side
effect.

**Difficulty index** (`model-tier-experiment-2.md` §3, computed at this
approve from the machine blocks): **A = 0** (`packet_rows` = 14 ≤ 15) ·
**B = 1** (derived 3 + new-decision 4 = 7, in 5–10) · **C = 1**
(`mutation_boundary` = 21, in 16–45) · **D = 1** (stateful-persistent:
the definition schema and its admission state machine; no async,
temporal or external-substrate seam) · **E = 2** (declared
idiom-minting — flag 8 carries the call and its rejected alternatives).
**Σ = 5 → Medium band.** The D and E calls are the checklist half and
are resolved BY this approve; the index freezes there, and a boundary
change discovered at build time is recorded in the Build record without
re-scoring it.

## Pre-approval flags

1. **The in-chapter split (ch13-p1a / ch13-p1b), and what its plan edit
   contains.** The parent plan row describes ONE packet and
   pre-authorizes the partition in the same breath; the risk gate trips
   two hard stops and the closure proof fails three of its own tests
   (Sizing/risk). Autonomous by the §5.5 matrix, surfaced here because
   it is the most visible thing about this packet. The aligned plan
   edit lands in the same commit and does FIVE things beyond recording
   the split — the fourth being the largest: §13's header gains the
   alignment ruled at this packet's STOP 3 (the ground of the
   no-Fable-slice decision moved, because p1a IS idiom-minting and
   scores E = 2, while the decision stands, a SLICE being build work and
   the two Fable-mandatory items being ACTS inside the standing
   categories). The other three: it declares in the prose introducing the live table which of §13.4's two
   tables the mechanical next-packet derivation reads and names the two
   prose-line rows that will never acquire packet files (the historical
   table's own cells are left as ratified), and it records that the
   parent row's flag-free-⇒-autonomous mode is a conditional this
   packet fails. And a FIFTH, which is not bookkeeping: the Order
   paragraph gains "human acts sit INSIDE that order and are not packet
   boundaries; which acts, and their commit choreography, are recorded
   in the packet's own D4 and D6 and ride its approve rather than being
   settled here" — the sentence that reconciles D6's build-commit-plus-
   follow-up choreography with §13.4's standing "one packet = packet
   file + code + tests in ONE commit". Without it the plan forbids what
   D6 requires. Alternative if declined: one
   packet past two hard stops without closure proof.
   RECOMMENDATION: keep the split. `Route: approve-ratified`
2. **The hook realization and the declared default (D4, D1) — two
   resolved STOP `1:open-choice` verdicts: the SHAPE ruled 2026-08-08,
   the ADR-019 FLAVOUR reversed to CONSTRUCT and ruled 2026-08-09 after
   the panel showed the first framing carried the label inside it.** The ruling settled the
   SHAPE and left the ADR-019 flavour to be argued on its own evidence.
   The shape: ONE new hook kind for the two nested-source positions plus
   a declared empty-list default at the gate position (→[hook-form]),
   the DEFAULT being ordinary additive node growth and the ONE
   declaration addition outside C19's named P5 surfaces, scoped at D1.
   The flavour argument is D4's and lands on ADR-019 D7's CONSTRUCT
   half. CONSEQUENCES the approve ratifies, each of them new since the
   ruling: a SECOND prerequisite `docs(v3)` act beside D6's, editing FOUR
   ADR surfaces — the three D10's and D11's own commits each edited, plus
   D4's closure paragraph, which gains the forward-scoped exemption as a
   defined form (added at arm gate 1; D3 states why it is owed) — classed
   `process revisions`; and the amendment admitting the construct BY
   KIND, its spelling recorded at the build. C13's ordering clause
   stands unqualified, satisfied by construction.
   NO ALTERNATIVE EXISTS, and the history is recorded because the
   opposite was twice believed. The top-level close found this flag
   stating its consequences and not its option, and an alternative was
   written in: ADR-019 D7's NODE reading, costing no ADR amendment and
   no second prerequisite commit, RE-AFFIRMED against by the human on
   2026-08-09 (STOP 4). ARM GATE 1 REFUSED THAT ALTERNATIVE AS NOT AN
   OPTION AT ALL. D7's node flavour is a new DECLARATION use — "a key,
   a grammar, a default" — and a hook kind is none of those: the
   normalizer's hook vocabulary is a CLOSED discriminated union in
   `vocabulary.ts`, so a third arm changes what the engine can express
   and is vocabulary growth by the ADR's own definition, whichever
   label a packet applies. Choosing "NODE" would not have saved the
   amendment; it would have made the same amendment unratified. What
   the human ratifies here is therefore a SINGLE-OPTION decision, and
   it is flagged rather than folded because the consequences are real
   and new since the shape ruling — not because a cheaper route was
   weighed and declined. The prerequisite count is unconditional: TWO
   acts, both Fable-mandatory, neither removable by any choice this
   packet offers.
   `Route: approve-ratified`
3. **The C9 stand-down mechanism and the engine growth (D5, D7) —
   resolved STOP `1:open-choice`, ruled 2026-08-08.** The residual lane
   needs to know which container lanes fired; the engine's run result
   does not say. The ruling's realization is →[engine-channel]'s, and
   its load-bearing qualifier is stated there once. Consequences the
   approve ratifies: `engine.ts` joins the boundary and its build is
   arm-obliged as guard machinery; the trigger set is DERIVED rather
   than listed, because a hand list was measured wrong; the acceptance weight →[engine-channel]'s scoping
   clause creates lands on family 2's stand-down member (D5 is the canonical statement); and the two rejected alternatives — minting a machine code on the dead-config rule, and dropping the stand-down with a C9 reopen — are declined with their reasons in D5, which is where the capability that replaced them is stated, rather than left as builder discretion.
   `Route: approve-ratified`
4. **The schema re-lock act and its prerequisite (D6) — resolved STOP
   `1:open-choice`, ruled 2026-08-08.** The form authority defines no
   `ratified → ratified` transition, and its metrics line defines
   post-ratification reopenings as blocks beyond the first — so this
   build would have written a 1 into the number the re-derivation
   experiment reads as its headline, with zero reopens having occurred
   and no lint able to see it. THE DECLINED ALTERNATIVE IS WITHDRAWN,
   and its withdrawal is the more important fact. It read:
   `ch9-runner-contract.md` carries two ratification blocks and records
   "post-ratification reopenings: 0" with a parenthetical naming the
   second block an amendment rather than a reopening — so a recorded
   parenthetical would do, and the form-authority edit could be
   skipped. ARM GATE 1 REFUSED IT. The form authority states that on
   any mismatch THE TEMPLATE WINS, and its §5 defines the metric
   mechanically as ratification blocks beyond the first; under that
   definition ch9's second block is 1 and its record says 0. The ch9
   parenthetical is therefore not a practice this packet may copy — it
   is a NONCONFORMITY already standing in the tree, and copying it
   would knowingly ship a second one. THIS INVERTS THE ROW'S
   ECONOMICS: D6's act is not a scruple the human may waive for a
   cheaper route, it is the only conformant route AND the act that
   regularizes ch9's existing record, since the redefinition it lands
   is what makes that recorded 0 true rather than tolerated. The ch9
   finding is CARRIED into the act's scope explicitly: the same
   commit's §5 wording must leave ch9's recorded number standing,
   which D6's measured sweep already constrains it to do — what
   changes is that this is now a repair the act performs, not a
   side-effect it avoids. The
   ruling stands on the ground that
   the definitional hole is every future schema-first contract's, not
   ch13's, and the human now ratifies a SINGLE-OPTION decision.
   Consequences the
   approve ratifies: a Fable-mandatory prerequisite act exists;
   `pnpm ci:local` is not green between the build commit and its
   follow-up; the block's `commit` names the build commit; and the §5
   redefinition must be worded to leave every already-recorded count
   where it stands — ch9's own second block would otherwise move it
   (D6's measurement). `Route: approve-ratified`
5. **Form-authority gap: the `mirror_map` block is lint-known and
   template-unknown.** `check_packet.py` P11 specifies the block in
   full, but `task-packet-template.md` — the canonical PACKET-form
   authority, which wins on mismatch — does not mention it (measured:
   zero hits). The block is opt-in, so carrying it is legal, but the
   form authority owes the paragraph. Most likely cause, a hypothesis
   and not a finding: the documenting edit lives on the oracle branch
   `ch13-prose-line`, which never merges. Two measured limits belong
   with it: the confinement scan is line-oriented, so a restatement
   wrapped across a line break is invisible; and a signature quoted from
   an external authority is confined inside the packet but not owned by
   it. `Route: boundary-review`
6. **Names this packet cannot pin from ratified sources.** (a) The
   catalog record type's NAME — C13 spells `BlockId` and describes the
   other. (b) The `codeRef` for the `generated/mapped` unit row, whose
   rule now lives in the declaration rather than in code; the natural
   candidate is the declaration's own exported surface. (c) The
   `codeRef` for the `review-only` row — equally precedent-free, and the
   live precedent for this exact reprint shape is the `l2-`/`l2a-`
   `CREATE_INSTANCE` pair, which use `alias/inherited` pointing at the
   kernel's create function. (d) The new hook kind's discriminator, its
   operand-attribute names, its two entries' tags, THE TWO
   PRODUCED-POSITION FIELD NODES' TAGS (D3's closure clause counts four
   new tags rowed to C13, and these are the two the hook entries do not
   supply; precedent `[d-advances-round]`), the field name D5
   exposes on the run result, and the C9 lane's own finding MESSAGE
   (C9 decides its path, C18 forbids it a code, and nothing decides its
   wording; the live precedent is the R3 cross-rule's message in the
   same module) — each has a named live precedent in the same file and none is unpinnable in principle, so they follow those
   precedents and are recorded in the Build record rather than decided
   here. RECOMMENDATION: accept (a)–(c) as build choices pinned VERBATIM
   by D10's adopted drift-test precedent, so the next packet inherits a
   precedent with a test behind it; accept (d) as precedent-following.
   `Route: approve-ratified`
7. **The mutation-pilot dual-run is a definition-module number.** The
   pilot dual-runs beside arm gate 2 on every packet of this chapter and
   this is its second data chapter, whose window closes at the boundary.
   Scope declared: the files this build changes under
   `src/definition/**`, which carry live suite coverage today, so the
   run yields a genuine delta rather than the activation number ch13-P0
   recorded. `Route: boundary-review`
8. **The difficulty index's E axis — ruled E = 2 at this approve.**
   §3's poles: 0 extends an existing module's patterns · 1 a new module
   from existing idioms · 2 first-of-a-kind class or declared
   idiom-minting. E = 0 is refused: a packet that must run a schema
   re-lock act because it grows the declaration is not extending
   patterns, and `normalizer.ts`'s header classes adding a hook as
   ADR-019 D7 format growth — a ratified amendment, never an edit.
   E = 1 is refused because its pole is literally a new MODULE and none
   is built; recording 1 would be an interpolation between two poles
   that neither matches, and §3's record keeps the AXIS VECTOR, which a
   hedge degrades. E = 2 matches literally, and after D4's flavour
   argument it does so without hedging: a new declarable CONSTRUCT
   enters the schema vocabulary under a ratified-amendment regime, and
   two type names are minted into the
   domain's public surface; ch11-P2a
   and ch12-P1a/P3 took E = 2 for comparable minting. BAND CONSEQUENCE:
   Σ = 5, Medium — E = 1 would also have been Medium, so plan §13.5's
   DoD item (a), which pairs the Opus arm against ch9's Fable data on
   SAME-BAND packets, is unaffected by the choice between 1 and 2 and
   would have been corrupted only by E = 0. `Route: approve-ratified`
9. **The admitted-value re-pin discipline (D14) is decided here.**
   C13 guarantees the produced positions are present on every admitted
   value, and C12/C16 name their own ripple families because a
   value-level re-pin trips no gate until it reds — but no ratified row
   names THIS ripple, so the packet decides what may be done to a red
   assertion: re-pin it to the admitted value, under the prohibitions →[value-repin] carries — no deletion, no narrowing to a
   sub-field, no conversion to a containment matcher, and no expectation
   computed through the producer under test. The manifest classes the row `new-decision`, which README §5.5 makes
   sufficient on its own to render this approve flag-bearing; the flag
   is where such a decision is presented for that approve rather than
   only argued in the header's Case-B paragraph. The decision is a test
   discipline over this packet's own suite: it touches no authority,
   separation or availability-class semantics, which is what keeps it
   below the Case-B threshold. Alternative if declined: the build
   satisfies the growth by weakening whichever assertions object, and
   the coverage those assertions bought is retired silently — which is
   the outcome C12's and C16's explicit ripple naming exists to prevent.
   RECOMMENDATION: accept as stated. `Route: approve-ratified`

## Acceptance

- Contract tests: no new `CT-*` ids — this packet realizes no IC item;
  its claim surface is the D-row set plus the two ledger invariants.
- Checks in force: the drift trio, `pnpm v3:typecheck` (D8's named
  carrier for the compiler half and the minted names' existence proof),
  `pnpm v3:coverage`, `pnpm v3:adr-check`, and `pnpm v3:packet-lint` —
  the last carrying the D5b schema lock, so it is RED at the build
  commit and green at the follow-up (→[relock-act]); the build-close
  post-build audit is unaffected, running only the boundary comparison.
- Test disciplines + family inventories (DISCIPLINE plus PARAMETERIZED
  membership with its owner named; fixture-level enumeration is build
  work, verified member by member by the build-close arm gate's
  sensitivity pass):
  - **1. Declared-lane family** — drives →[lane-drive], BOTH halves of
    its inventory. Each lane is exercised at its own grain, so a lane
    firing at the wrong path reds rather than passing on a coincidence;
    the C9 half carries its own two directions (an unreferenced entry
    produces the finding at the entry's path; a referenced one produces
    none), whose owner is D7.
  - **2. Lane-independence family** — drives →[lane-independence]. Each
    normative pair that row names is staged as a COMBINATION lane
    holding both conditions at once, because isolated lanes cannot
    falsify a reordered implementation; the compound clean case is
    driven on its own as an all-clean admission with zero findings. The
    stand-down member is additionally PARAMETERIZED over →[hygiene-trigger]'s
    derived trigger set, with that row's floor as its checkable
    minimum: for each floor member, a document whose enclosure is broken by a
    MARKING malformation and whose only mention of an entry sits inside
    it must produce NO hygiene finding — and the SAME document carries a
    second catalog entry mentioned nowhere at all, which a template-wide
    stand-down leaves unaccused and a per-entry one does not, because
    C9's stand-down is template-wide and a member that cannot tell the
    two apart tests nothing. One member is NAMED rather than left to the
    parameterization, because it is the case arm gate 1 built to break
    this family: a document with TWO catalog entries, the first
    referenced only from inside a gate key absent from its step's
    transitions, the second mentioned nowhere at all. Pre-growth that
    document marks no tag and the audit accuses the second entry;
    post-growth the dead-config skip marks the enclosure and the whole
    audit stands down, so the member asserts ZERO hygiene findings and
    fails against any implementation that reads only the pre-growth
    signal. A second member asserts the engine half directly — that the
    skip marks the enclosing tag — so the two lanes fail separately and
    a regression in either is addressable on its own. The failure
    condition and the two-route qualifier are →[hygiene-trigger]'s.
  - **3. Admitted-form family** — drives →[produced-positions],
    →[recompute-home] and →[hook-form]. Discipline: on every admission
    SUCCESS each ref position is present with the value its authored
    source implies, absent source yielding the empty list; the produced
    positions are recomputed rather than carried when a caller supplied
    them; and the authored source's own key is left as
    →[produced-positions] requires. Membership:
    PARAMETERIZED over position × authored state × channel, including
    the file channel's unknown-key refusal of a file-authored produced
    position. TWO members carry D4's decided clauses and are named
    because each is a build trap: a binding with an AUTHORED NON-EMPTY
    ref list must admit with that list intact, which reds if the carry
    entry is missing; and a caller-supplied binding key valued
    `undefined` must be REFUSED by its own field lane rather than
    silently filled, which reds if a build widens the engine's presence
    test to reach it.
  - **4. Load-guard family** — drives →[hook-form]'s guard half and
    →[engine-channel]'s first threat model. Discipline: a declaration
    whose new hook names an unresolvable operand path, a landing node of
    the wrong kind, or a produced or source field the landing node does
    not declare is REFUSED AT LOAD with a problem naming the hook AND the landing
    node's declared field names, the plain map's typed subset included —
    never accepted-and-inert, and never refused with an empty field list. Each negative carries its DISCRIMINATING
    positive, the form the live precedent cases use: the same
    declaration with that one reference corrected loads clean, so a
    guard that reds on a legal near-miss is caught too. Membership:
    PARAMETERIZED over the guard's inputs — every declared operand path
    of the new kind, the landing node's kind, and every dynamic field
    name the hook reads or writes, the nested source name included.
  - **5. Code-travel family** — drives →[code-equality]. Membership: the
    two lanes D9 names, the negative parameterized over family 1's
    inventory, and the gate schemas' named lanes asserted unchanged.
  - **6. Parity family** — drives →[parity-corpus]. Membership owner:
    the caller enumeration re-derived at the build. The one expected
    delta class is asserted POSITIVELY, so a build failing to produce it
    reds as loudly as one producing another.
  - **7. Value re-pin family** — drives →[value-repin]. The build runs
    the growth, takes the red set as the membership, re-pins every
    member to the admitted value including its produced fields, and
    records the resulting set against that row's floor.
- Drift tests green (standing, unconditional — PI-3), asserted before
  AND after: the 54-name registry byte-untouched, the domain registry's
  key set unchanged with two dispositions flipped and both new rows
  verbatim-pinned, the two unit-map rows flipped from `pending` and
  verbatim-pinned.
- Standing review rules in force (§3): none of `REV-A1-TXN`,
  `REV-B-LOCAL-NOT-AUTHORITY`, `REV-C-PROJECTIONS-READONLY`,
  `REV-E-NO-ADAPTER-BRANCH` or `REV-DIAG-FAILOPEN` touches this
  packet's surface — an explicit empty declaration, not an omission.

## Build record

**Build execution context: MAIN-CONTEXT.** The user handed the packet to
this session as the build executor with the packet as sole spec; the
approved basis was byte-verified before the first read (sha256
`bb1f38b65f386de4…`, 76 738 B) and both prerequisite acts were confirmed
present in the tree (`2cc63dc8` — ADR-019 D12 + the forward-scoped
exemption form; `b49721a3` — the form authority's §3/§4/§5). `plan.md`'s
pre-approval aligned edits were left untouched and ride this commit.

**Rounds: ONE.** No fix round: every correction below was caught by this
packet's own declared gates inside the build, before any commit. FOUR are
worth recording because each was a mis-derivation and not a typo. (a) The
finding ORDER of the C7+C8 combination lane: the resolution lane DEFERS
(the catalog is a later root field than `roles`, so its operand is still
pending when the list is walked) while the duplicate lane reports in
place — my first expectation had them in path order. (b) Three family-3
fixtures authored a catalog entry and then left it unreferenced, so C9
accused it: correct behaviour, wrong fixture. (c) The family-5 negative
twin referenced a body-defective entry, pulling in C7's ratified pair — a
coded finding where the lane under test owns none. (d) The unit-map
disposition: I applied flag 6(c)'s named precedent (`alias/inherited`) to
the DISPOSITION when it governs only the codeRef TARGET — the ledger
slice declares `review-only`, and `v3:coverage`'s unit-map lock caught it.

**Test-count delta: 2063 → 2197 (+134), 72 files unchanged** (no new test
home was minted — every family joined a declared one). Per home:
`admit.test.ts` 66 → 140 (families 1, 2, 3, 6 on the direct channel),
`validate.test.ts` 174 → 209 (families 1 and 3 on the file channel),
`schema/engine.test.ts` 230 → 249 (family 4's five guard rows in the
pinned GUARDS table, 43 → 48, plus the D5 failed-tag surface and the new
hook's behaviour lanes), `cli/dev/dev.test.ts` 43 → 46 (family 5),
`drift/domainRegistry.test.ts` +2 and `drift/unitMap.test.ts` +1 (D10's
verbatim pins).

**Realization shape.** The declaration grew by exactly what D1 scopes:
two `kind: "raw"`, channel-`direct` field nodes (`[d-ctx-role-refs]`,
`[d-ctx-step-refs]`) under `[d-roles-entry]` and `[d-step]`; the declared
empty-list `default` on `[d-ctx-gate-refs]`; `[n-effective-config]`'s
carry list grown by `contextBlockRefs`; and the new hook's two entries
(`[n-ctx-role-refs]`, `[n-ctx-step-refs]`) declared BEFORE the binding
rebuild. Neither landing node's `containerMessage` moved. The engine grew
by D5's three capabilities and nothing else: the `liftNestedList` arm of
`NormalizerHookDecl` with its `checkHook`/`resolveHooks` branch and
`normalize` implementation; `EngineRun.failedTags`, exposed at BOTH
return sites; and the `keysSubsetOf` skip's `markTag`, written as ONE
branch with the `continue` so no later edit can reinstate the skip
without the marking. `fieldProblem` now names a plain map's TYPED SUBSET
(`typed fields: …`) instead of rendering an empty list. C9's lane lives
in `templateSurface.ts` beside R3 and R7, its trigger set DERIVED by
walking the declaration to every position whose members belt against the
catalog and collecting the REFERRING tags on the path — eleven, matching
M1's floor exactly, root excluded by construction.

**The four FORWARD-SCOPED EXEMPTIONS** (ADR-019 D4, amended 2026-08-09)
are recorded beside each node in the declaration, each naming its closing
act. The closing act named is **the ch13 chapter-close act that flips the
draft to `realized`** — the one scheduled act that edits this contract
next. Condition (iv) — taken by an ACT, never asserted by a packet — is
satisfied at the re-ratification act, which is STOP 3's business and not
this commit's; the declaration half (condition iii) is what this build
lands.

**Flag 6's build choices, each following its named precedent.** (a) The
catalog record type is `ContextBlockCatalog`, minted in
`domain/template.ts`; the entry shape stays inline, because the
`ContextBlock` NAME belongs to the render side's packet member (the l2b
row that stays `pending`). `BlockId` is minted in `domain/ids.ts` on D8's
layering argument — minting it in `template.ts` while typing the
binding's field from it would invert the existing
`template.ts → gate.ts` type import into a NEW cycle inside `domain/`,
which no lint rule in this tree catches. (b) `validate_context_refs`'s
codeRef is `v3/src/definition/schema/templateFormat.ts#templateFormat` —
the declaration's own exported surface, the natural candidate the flag
names. (c) `CREATE_INSTANCE`'s codeRef is
`v3/src/kernel/lifecycle.ts#createInstance`, the live `l2-`/`l2a-` pair's
target, under the slice's declared `review-only` disposition. (d) The
hook discriminator is `liftNestedList`, its operands `over` / `from` /
`source` / `into` (the `expandAdvancesRound` naming shape); the two entry
tags are `[n-ctx-role-refs]` and `[n-ctx-step-refs]` and the two produced
field nodes `[d-ctx-role-refs]` and `[d-ctx-step-refs]`, parallel to the
live `[d-ctx-gate-refs]`; the run-result field is `failedTags` (the
`runtimeContextBindings` precedent, and the spelling M1's probe already
used); and C9's message is
`context block "<id>" is declared but no ref names it`, following the R3
cross-rule's plain-prose form in the same module.

**The two executable receipts, re-taken against the BUILT tree.** Both
committed scripts patch a PRE-GROWTH engine or declaration, so both fail
at their own patch anchors after this build — by construction, not by
regression, and the failure is not the one the packet predicted.
**M1** was therefore re-run with its instrumentation patch OMITTED, since
the engine now exposes `failedTags` natively: every row reproduces and
the one that had to move did — `gates dead-config key` reads
`["d-gates"]` where it read `[]`, the union still **11**, both
zero-marking root routes and the clean control unchanged. That single
moved row is the whole proof the engine change happened. **M3** was
re-taken as the build's own red set at the value-re-pin step: **8
growth-only failing assertions in 4 files**, identical member for member
to the recorded floor, zero baseline-only — no floor member stayed green,
which D14 makes a finding in its own right. CARRIED SCOPE, routed and
not repaired here: neither receipt script can be re-run as committed
after this build, and no check says so. `Route: boundary-review`

**Post-build boundary audit.** The changed-file set equals the declared
`mutation_boundary` EXACTLY — 21 declared, 21 changed, zero outside,
zero declared-but-untouched; re-run against the build commit's own bytes
(`check_packet.py --post-build`), 0 errors, and `check_coverage.py` in
its build-close default mode green.

**AFTERMATH — one fold, author: the build agent (this session).** The
build-close arm's sensitivity pass found D7(c)'s raw-read discipline
UNDRIVEN: swapping the audit's operand from the raw authored value to
`run.normalized` — the exact wrong implementation D7(c) warns against —
left the whole suite green. Reproduced independently before folding, by
mutate-run-restore with hash verification (`templateSurface.ts`
`81744e7e…` before and after): under the mutation the audited set loses
every NON-STRING catalog key, because the engine writes an entry into the
normalized catalog only where the key is a string, and 762 tests across
the three ch13 suites stayed green anyway. The fold adds ONE row to
family 1's file-channel inventory — a boolean-keyed catalog entry, the
only document that discriminates, and only on the file channel where the
walk preserves resolved key types — asserting the key lane's finding and
the hygiene lane's finding as one whole set. It discriminates: under the
same mutation exactly that row reds. Suite 2197 → 2199 (+2, the row's two
directions). The gap was DISCLOSED in D7(c)'s own prose ("which no
acceptance member drives and nothing would red") and is a coverage debt
rather than a behaviour defect — the implementation was correct before
the fold and is unchanged by it.

**Gate state.** `v3:typecheck`, `v3:lint`, `v3:test`, `v3:coverage` and
`v3:adr-check` green at the build commit (72 files / 2197 tests) and at
every aftermath commit since (2199, 2233, 2235, then 2259 — the
per-round counts are in the aftermath paragraphs below).
`v3:packet-lint` is **RED, by design and on exactly one error** — the
D5b schema lock, in the wording PROBE-P5-1 predicted:
`9368e5253d11…` recorded, `a8d4c61ffee0…` in the working tree. It turns
green at the follow-up re-ratification commit (→[relock-act]), which is
the standing human checkpoint this build stops at.

**THE TRANSIENT CLOSED (user-ratified 2026-08-10).** The re-ratification
act landed the block recording the new `sha256` and naming the BUILD
commit `09a0bda2` as the bytes it binds; the four forward-scoped
exemptions were TAKEN by that act, per ADR-019 D4's condition (iv), and
recorded in its message beside the declaration's own notes. `packet-lint`
went to **0 errors**, the draft's post-ratification reopening count
stayed 0 — true rather than tolerated, on the §5 redefinition this
packet's own prerequisite act landed — and `pnpm ci:local` passed whole:
dependency lock, shared codegen, the quality suite (lint/typecheck/test/
v3, 55 s) and the final validation suite (fitness gate + almost-e2e
smoke, 12 s). That green is the chapter DoD's, taken after commit 2 and
never at commit 1, exactly as D6 sequences it.

**AFTERMATH round 2 — four folds, author: the build agent (this
session), all from the PIN-CONFORMANT arm gate-2 run's sensitivity pass
(verdict FAIL, 0 BLOCKER / 4 MAJOR / 1 MINOR, every one test-evidence or
packet-docs; ZERO product findings).** Each was reproduced by
mutate-run-restore before folding and each fold was re-verified to
discriminate, with hashes taken before and after every mutation.
(i) The declared-lane inventories drove `[vc-block-id]`'s type and
grammar lanes but not its NONEMPTY lane — a node carrying several lanes
expands to all of them (D2), and the empty string is that lane's own
member; removing the `nonempty` declaration left 351 tests green. Folded
at the MEMBER and KEY positions on both channels. (ii) D13's five
normative pairs were driven on the direct channel only, so a file-channel
break of C7's per-occurrence resolution passed unnoticed; folded as a
file-channel family 2, and the same mutation now reds exactly there.
(iii) The admitted-form matrix had no `step × present-populated × file`
cell — the file fixture authored the ROLE source and asserted the step's
empty list — so an implementation lifting only the role position stayed
green; folded, with a both-sources-populated member beside it.
(iv) Family 5's negative twin sampled three lanes where the packet
prescribes it PARAMETERIZED over family 1's inventory: a code added to
the duplicate lane left all 46 CLI tests green. Folded as an 18-lane
inventory over the CLI's own document, and the same mutation now reds on
the duplicate row. The MINOR was this record's own gate-state line, which
quoted the build commit's test count beside the aftermath's — corrected
above. Suite 2199 → 2233.

**AFTERMATH round 3 — one fold, author: the build agent (this session),
from the arm's hash-citing RE-CHECK on the round-2 bytes.** That re-check
confirmed all five round-2 folds CLOSED and each one DISCRIMINATING (it
re-ran its own four mutations and every one now reds on the fold that
closed it), and surfaced one further member of the same class: the
catalog KEY node's TYPE lane was driven on the file channel (the
boolean-keyed YAML document) but not on the direct one, where a
direct-channel-only skip of the key class for non-string keys left
367 tests green. Folded as one row: a `Map`-valued catalog with a boolean
key — the hostile-cast idiom this suite already uses, and a reachable
input because the engine accepts a map container on both channels. The
arm's exact mutation now reds on exactly that row. Suite 2233 → 2235.
Also recorded: the first suite run after this fold reported ONE failing
assertion that two subsequent clean runs did not reproduce — the
runner-journey flake class the arm's own first invocation hit, here
following a wedged tmux server on the shared default socket (an orphaned
`p4atest-*` session from an interrupted suite run, blocking every later
tmux call; cleared, and the per-run-socket fix stays the boundary
candidate arm-pin.md already names).

**AFTERMATH round 4 — one BOUNDED fold, author: the build agent (this
session), from the arm's second hash-citing re-check.** That re-check
confirmed the round-3 fold closed and, asked for a cutoff judgement,
gave one: the catalog-key inventory is COMPLETE, and what remained was
not an open-ended trickle but an enumerable set of TWELVE file-channel
stand-down routes — the direct suite parameterizes family 2's stand-down
over the whole derived floor, the file suite drove only the dead-config
route. Executed evidence, the arm's: removing `d-agentconfig` alone from
the trigger set left the file definition suite GREEN at 223/223. All
twelve are folded in ONE pass, each with its intact control, and the same
mutation now reds on BOTH channels. Suite 2235 → 2259.

**The MUTATION-PILOT DUAL-RUN (flag 7), beside gate 2.** Scope as
declared: the files this build changes under `src/definition/**`, run
through `pnpm v3:mutation` with the scope passed on the CLI so the
committed Stryker config is not edited for a measurement. 3 238 mutants,
12 min 48 s, **65.01 % total / 67.02 % covered** — 1 627 killed, 478
timeout, 1 036 survived, 97 no-coverage, 0 errors. Per file:
`normalizer.ts` 96.30, `templateSurface.ts` 85.54, `engine.ts` 73.65,
`templateFormat.ts` 59.84, `defineSurface.ts` 42.14.

READ IT AT THE RIGHT GRAIN, which is the honest caveat: the scope is
whole FILES, so the number is a MODULE score carrying years of
pre-existing code, not a delta of this packet's own growth. The two files
this packet grew most are the two that score highest — the derivation
hook's home at 96.30 and the C9 lane's home at 85.54. DECLARED BLIND
SPOT, the profile's own: `cli/dev/dev.test.ts` sits on
`vitest.stryker.config.ts`'s exclude list, so family 5's CLI lanes are
outside this run by the pilot's declared partial-coverage mechanism.
SURVIVOR CLASS in this packet's own new code, examined rather than
counted: they cluster in `refListPositions`' branches that the LIVE
declaration cannot exercise — no ref list on this surface sits inside a
list or under a second open map, so the `list` and `map.open` descents
are equivalent-for-this-declaration mutants that exist for generality —
plus one on a success return whose `findings: []` no caller reads. None
is a missing assertion this packet could add without inventing a
declaration to test against. `Route: boundary-review`

**Arm gate 2 — the TRANSPORT RULING (user, 2026-08-10), recorded here as
the act that carries it.** The build-close external arm runs primarily on
the **gptsol agent** (Agent tool; model `gpt-5.6-sol`, effort `high`,
pinned in the agent definition — this is the first pin-conformant run and
its provenance is recorded with a timestamp), with `arm_run.sh`'s
external runner kept as the FALLBACK for portability. The ReviewPacket §6
guards are reproduced by hand on the transport: base-hash verification
before and after the run, neutral QA vocabulary in the charter, and the
verdict committed. The pin table's transport column is formalized at the
boundary review.

**Gate-2 run log, both runs recorded because the first is a
pin-nonconformance and the class is worth keeping.** RUN 1 (basis
`09a0bda2`) was launched with an explicit `model` override on the Agent
call, which takes precedence over the agent definition's own pin — so it
did NOT run on `gpt-5.6-sol`. Under §6 item 4's pin-mismatch rule that
verdict is INVALID and the run counts as an INFRA failure, and it was
discarded as a gate result; its one executed finding was folded on its
own evidence, independently reproduced first (aftermath round 1). RUN 2
(basis `02be5f4e`, packet sha256 `c09b1fd3c1a78541…`) carried no
override, and its report opens `MODEL: gpt-5.6-sol; REASONING EFFORT:
high` — pin-conformant, the first such run on this transport. Byte guard
clean on both sides of it (HEAD, porcelain, `git diff --binary HEAD`,
zero untracked, packet sha256 — every measurement identical, and the
clean-tree gate green). Verdict FAIL on four MAJOR + one MINOR, all
folded above; the arm's own mutation-restoration ledger records eight
mutate-run-restore probes, each returned to its original sha256.

```json
{
  "packet_metrics": {
    "class": "projection",
    "prediction": {
      "predicted": "projection",
      "reasoning": "plan §13.4's live row predicted projection: the definition side extends the ch8/ch11 format and admission machinery, and the ch13v2 contract had already decided the surface's semantics",
      "discovered": "projection"
    },
    "provenance": { "anchored": 7, "derived": 3, "new_decision": 4 },
    "rounds": { "review": 7, "doc_refinement": 0, "implementation": 5 },
    "stops": [
      {
        "type": "1:open-choice",
        "what": "STOP 1 — the hook realization SHAPE, the C9 stand-down mechanism, and the schema re-lock act's form",
        "resolution": "user, 2026-08-08: three rulings — one hook kind for the two nested-source positions plus a declared default at the gate position; the engine's failed-tag surface as the stand-down's operand; a prerequisite form-authority act plus a two-commit re-lock choreography"
      },
      {
        "type": "1:open-choice",
        "what": "STOP 2 — the ADR-019 D7 flavour of the new hook, argued on act-form",
        "resolution": "user, 2026-08-09: REVERSED to CONSTRUCT — a new arm of a closed union changes what the engine can express"
      },
      {
        "type": "2:contested-ratified-vs-reality",
        "what": "STOP 3 — plan §13's no-Fable-slice premise against a re-derived packet that scores E = 2",
        "resolution": "user, 2026-08-09: the GROUND moved, the decision stands — a slice is build work and the chapter's build work stays Opus-class; the header is aligned in this packet's own commit"
      },
      {
        "type": "1:open-choice",
        "what": "STOP 4 — flag 2 ratifying a consequence set with no priced alternative",
        "resolution": "user, 2026-08-09: CONSTRUCT re-affirmed once the option set was priced; arm gate 1 later refused the alternative as not an option at all"
      },
      {
        "type": "1:open-choice",
        "what": "STOP 5 — arm gate 1's three coupled routes",
        "resolution": "user, 2026-08-09: engine-side marking on the dead-config skip; the closure exemption created in the ADR act rather than asserted by the packet; flag 4's lighter alternative withdrawn"
      },
      {
        "type": "4:flagged-approve",
        "what": "APPROVE — nine flags carried to the human gate",
        "resolution": "user, 2026-08-09: all nine approved, one per message"
      }
    ],
    "detector_misses": [],
    "learned": "an inventory the packet says is PARAMETERIZED is not driven by sampling it — three of four arm findings were a declared family instantiated on one channel, one position or three lanes of many",
    "main_thread_model": "claude-opus-5[1m]",
    "baseline_note": "test counts are v3-suite totals (pnpm v3:test); the 2063 baseline was taken at S0 on the approved basis with the packet file present"
  }
}
```
