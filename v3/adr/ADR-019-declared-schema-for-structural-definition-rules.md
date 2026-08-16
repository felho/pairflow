# ADR-019: structural definition rules become declared schema, validated by one engine on both channels

Status: accepted
Date: 2026-08-05 · amended 2026-08-06 (D1's residual list, D5's corpus
derivation, D9.3's reading) · amended 2026-08-07 (D10 — the entry-belted
membership construct, admitted under D7) · amended 2026-08-08 (D10's
no-reference-ring rule; D11 — the typed-subset `fields` widening on
`map.plain`; D4's gloss and closure-form clarification; user-ratified —
each carries a dated marker) · amended 2026-08-09 (D12 — the
nested-source normalizer hook construct, admitted under D7; and D4's
FORWARD-SCOPED EXEMPTION, the form that makes a rowed-but-uncited node
legal for a bounded interval; user-ratified — each carries a dated
marker) · amended 2026-08-16 (D13 — TWO attribute widenings in ONE act:
`[n-advances-round]`'s edge SOURCES and the `code` attribute at the
container / unknown-key grains, both in D11's existing-attribute-at-a-
new-grain class; user-ratified at ch14-p1's approve)
Links: supersedes — · amends — · depends-on ADR-011 · related ADR-003, ADR-012, ADR-013

## Context

The ch13 prose line ended at a MEASURED semantic drift floor: 28
registered rules · 6 literal restatements caught by the pointer-lint ·
9 semantic paraphrases in the first full arm sweep · 8 FRESH ones in
the second sweep after the nine were folded. The second number did not
shrink; it came from new places. The measured cause was the worklist:
the conversion's index was a hand-built mirror table, and the
paraphrases lived exactly where that table never looked (five rules had
zero pointers; four of the table's first nine rows were wrong or
incomplete). The general form — **a lint confines LITERALS, a mirror
list names MEANINGS, and prose is not indexable by meaning.** For
restatement to become structurally impossible, the rules must be DATA.

The user raised the structural form of this at the ch13 boundary
(process-log 2026-08-02, commit `4c1d481f`): every new format surface
(ch8, ch11, ch12, ch13) re-legislates the same failure space in
ratified prose — container preconditions, key/value lanes, unknown
keys, null/scalar/array forgeries, suppression edges, path grammar,
channel symmetry. The direction was ratified 2026-08-03 and this ADR is
its P3 realization.

**The basis is an enumeration, not an impression.**
`v3/implementation/schema-expressiveness-audit.md` — the bytes this ADR
was RATIFIED against carried sha256
`f779855f0a0823020c71951873a3a21244500ecd6644179cb78ac1f3045d8da7`
(classification 59/5/6); the ratification act's own D8 ruling then
moved two rows and resolved R7 empty, so the standing document is
sha256
`bfed821037786fa151f9a9c0f3b25d1142917056f10d52bb1dda5ddb4da6e57d`
(classification 61/3/6). Both pins are recorded because the act changed
its own basis, and only in the direction the act itself ruled — the
audit could not have moved itself.

**A THIRD pin, 2026-08-06.** The user-elected design round (finding F3,
`ch13-rederivation-arm/p3-design/`) showed that the P3 build had filed a
boundary-kept rule under R7, whose definition does not cover it. The
audit gained an EIGHTH residual family and the standing document is now
sha256
`a1a7adc5732bc5de6264de7eeac57b5bfd53b64616bfd67acb15af867d8d0fd2`.
The classification is UNCHANGED at 61/3/6 — R8's members are `S`, because
their obligation is expressible; what is not available is a way to reach
them. Every earlier pin stays recorded, for the same reason the second
one does.

The audit classifies every ratified rule of the four format surfaces
against a proposed declaration form, and was verified by two bounded
fresh-context arm rounds (10 findings then 5, all folded;
`ch13-rederivation-arm/p3/`). Its measured result, at the ratified
basis:

- **125 contract rows** (ch8 38 · ch11 41 · ch12 27 · ch13 19). Of the
  **70** that carry a definition-validation obligation: **59 fully
  declarable · 5 mixed · 6 residual** (**61 · 3 · 6** after D8's
  ruling). The other 55 legislate runtime,
  CLI, store, port or process and are marked non-lane with a per-row
  reason. Zero unclassified rows.
- **112 finding-emit sites** in today's validator and the three
  delegated gate-config schemas — every one mapped to its owning row.
- The residual is **seven named families**, not a vague remainder (D8's
  ruling then resolved one of them empty, leaving six with members).
- The plan's predicted residual was CHECKED: event-grain suppression
  and per-occurrence duplicates REFUTED (declarable); reference
  resolution and unreferenced hygiene PARTIALLY refuted (the
  intra-document forms are declarable with the selector vocabulary
  ch8-C16 already ships). Five families the prediction did not name
  were found, one of which forces D3 below.

## Decision

### D1 — the direction

**Structural rules become per-surface DECLARED SCHEMA — key classes,
containers, grammars, defaults and normalization as DATA — consumed by
ONE engine that validates BOTH the file-walk and direct-construction
channels. Ratified prose remains ONLY for the audited semantic
residual.**

Channel symmetry becomes structural rather than argued: attributes that
read source text (`sourceForm`, key-stringness, the substrate block)
are declared once and marked file-scoped; the engine runs them where a
source exists and skips them where none does. This retires the
hand-partitioned "realization split" that ch11-C40 and ch13-C19 each
spent ratified prose defending.

The residual — the ONLY territory where prose keeps legislating
behaviour — is exactly the audit's families, **EIGHT since 2026-08-06**:
**R1** value-shaped reference resolution · **R2** unreferenced hygiene
with a template-wide skip · **R3** existential cross-rules over resolved
registrations · **R4** admitted-form derivation · **R5** cross-artifact
checks · **R6** substrate-owned wording (a parity residual, no
obligation) · **R7** rows whose only declaration uses a construct this
ADR has not admitted (D8) · **R8** BOUNDARY-KEPT — a rule this vocabulary
CAN express, declared on paper, kept in code because a module or port
boundary puts it out of the engine's reach.

R8 is a different KIND of remainder from R1–R7 and is named rather than
folded into them: R1–R7 record what the vocabulary cannot say, R8 records
what it can say but cannot deliver. Its members stay `S`. The distinction
is load-bearing for D9.3 — a boundary is removable by an act, an
expressiveness limit is not, and a tripwire that cannot tell them apart
watches nothing.

### D2 — scope

**The TEMPLATE surface, now. Nothing else is built.** The other
validated surfaces in the repo are NAMED EXTENSION POINTS and each
needs its own ratified act before any declaration is written for it:
the `GateDecision` stdout contract (ch11-C25), the `GateInvocation`
stdin wire (ch11-C23), the CLI `--run-overrides` input (ch12-C9/C20),
the operator-intent wire (ch12-C13), and the EC emit-contract surface
(plan §1.3's fifth candidate — deliberately excluded from the audit as
having no ratified grammar).

### D3 — the engine owes a SECOND capability, named

The audit's R4 is not a leftover lane: admission both VALIDATES and
PRODUCES the admitted form (`advancesRound` expanded per transition,
the effective gate config materialized, ch13-C17's rebuild). **A
declaration says what is legal; it does not compute a value.** The
build therefore carries a NORMALIZER beside the validator, driven by
declared hooks, and this ADR names it so that "schema" is never read as
covering it. Plain `default:` materialization IS declarable and stays
in the schema; only derivation is the normalizer's.

### D4 — the canonical home: ONE authority, pointers everywhere else

**RECOMMENDED: the declaration lives in the CODE tree as a data-only
module under the definition module (ADR-011) — `v3/src/definition/
schema/templateFormat.ts`, a frozen declaration object with no
executable logic — and the contract carries DECISIONS plus declaration
POINTERS, restating no attribute.** The ratification act names the
schema file's bytes exactly as the contract-draft equality lock names
the C-rows, so the lock is a MECHANISM, not a location.

The weighing, recorded because it is the load-bearing choice here:

- *Ratification-lock pull* — put the declaration in the contract
  markdown. It inherits the ratified-bytes lock for free. Rejected as
  the home: the engine would then parse ratified prose to get its
  rules, which is the exact indexing-prose-by-meaning failure this
  whole line exists to end.
- *Code-consumption pull* — put it in the code tree. The engine
  imports data; a diff is reviewable; the declaration is type-checked.
  Its weakness is that a code file can be edited without a
  ratification act — and that weakness is closed by extending the act
  to the file's bytes, which costs one hash line per act.
- **Two authorities is the outcome neither pull may produce.** The
  contract states no structural attribute; it states decisions and
  cites tags. A rule visible in both places is a defect, and the
  cheapest tripwire is the tag-closure check the audit already ran
  twice by hand (every tag defined is cited, every tag cited is
  defined).

  **Amended 2026-08-08 (the first schema-first contract's authoring;
  user-ratified):** "visible in both places" means carried NORMATIVELY
  in both — a contract row's passing gloss of an attribute is
  non-binding paraphrase, with the declaration's bytes governing (the
  contract states the rule in its Context; the declaration's header
  says the same). And the closure check's standing per-contract form
  is directional: every tag a contract cites exists in the
  declaration, and every node ROWED TO that contract is cited by it —
  the audit-time whole-declaration symmetric form remains the
  boundary-act form for surface migrations.

  **Amended 2026-08-09 (ch13-p1a's authoring; user-ratified) — the
  FORWARD-SCOPED EXEMPTION.** The directional form above has no
  escape, and a schema-first contract can reach a state it cannot
  satisfy: a contract row is BYTE-LOCKED against a declaration
  snapshot, the realizing act adds nodes rowed to that row, and the
  row cannot cite them back because citing them would change the
  bytes the lock pins. The gap is real, it is not ch13's, and until
  now no form admitted it — so a packet meeting it had to either
  assert an exemption no authority defines, or reopen a row that
  nothing is wrong with. Neither is acceptable, so the exemption
  becomes a NAMED FORM with four conditions, all required:
  (i) the node is rowed to a row that is byte-locked or otherwise
  unable to cite it AT THE MOMENT OF THE ACT — never to a row that
  simply was not edited; (ii) a LATER RATIFYING ACT that will close
  the citation is named when the exemption is taken, so the exemption
  carries its own end and is an interval rather than a state;
  (iii) it is recorded in TWO places — beside the node in the
  declaration, and in the act that takes it — because the closure
  check reads the declaration and the reviewer reads the act;
  (iv) it is taken by an ACT, never asserted by a packet: a packet may
  argue that one is owed, and only a ratified act may create it. An
  exemption with no named closing act is not a forward-scoped
  exemption but an unclosed defect, and the check treats it as one.

### D5 — the parity gate

**Before the engine replaces any implemented lane, the EXISTING
fixture corpus is replayed against it and must produce identical
verdicts, identical finding PATHS and identical MESSAGES — or an
approved delta list, ratified before the switch, never after.**

**AMENDED 2026-08-06 — the corpus is derived from the CALLERS of the
swapped entry point, never from a file list.** The corpus as originally
named:

The corpus, measured 2026-08-05 by `grep -cE '^\s*(it|test)\('`: **362
cases** — `validate.test.ts` 124 · `load.test.ts` 76 · `admit.test.ts`
59 · `process.test.ts` 59 · `fileDefinitionStore.test.ts` 19 ·
`threshold.test.ts` 13 · `previousReviewerVerdict.test.ts` 12.

Those seven reproduce exactly, and they were the WRONG SET: measured at
the build, `admitTemplate` — the direct-construction channel's entry — is
called from the testkit, kernel, lifecycle and trace suites as well, and
**two thirds of the cases the switch actually affected lived outside the
named files**. A file list is a snapshot of who called the entry point on
the day it was written; the obligation is to replay who calls it NOW.

So the standing rule: enumerate the CALLERS of the entry point being
replaced, and replay every case that reaches them. Where that is the whole
suite, it is the whole suite — the P3 build replayed 1830 executed cases
for a corpus named as 362 source-literal ones, and the difference is
where its delta list came from.

This is a DERIVED claim about behaviour that does not exist yet; its
NAMED MEASURER is the build's parity gate itself. Two delta classes are
pre-named by the audit so they arrive as decisions rather than
surprises: **path grain** (duplicate terminal ids report at `terminal`,
not `terminal[i]`; every key-class lane reports at its containing map —
an engine written naively silently moves these addresses) and
**message wording** (nine measured messages embed rule-specific
rationale; either the declaration carries a literal `message:` or the
delta list authorizes the engine's own wording).

### D6 — retrofit policy

**Existing surfaces stay as built.** Migrating a surface onto the
engine is a deliberate per-surface BOUNDARY act with its own parity
gate and its own ratification — never housekeeping, never folded into a
packet that is doing something else, never a "while we are here". A
surface that is never migrated is a legitimate end state.

### D7 — the format-growth rule

New expressiveness is a RATIFIED AMENDMENT, never silent, in two
flavours that must not be confused:

- **A new NODE declaration** (a key, a grammar, a default) is ordinary
  additive format growth under plan §8.2 — the realizing chapter's
  contract row plus the schema edit, in one act.
- **A new VOCABULARY CONSTRUCT** changes what the engine can express at
  all, and therefore amends THIS ADR. It is admitted only under the
  audit's **≥2 independent ratified rows** test; a construct serving
  exactly one row is refused and that row keeps a prose lane instead.

**Admitted under this rule so far**: one construct, D10 (2026-08-07);
one attribute widening at a new grain, D11 (2026-08-08 — not a new
construct, recorded here so the tally cannot silently drift); a second
construct, D12 (2026-08-09 — the nested-source normalizer hook); and TWO
further attribute widenings in ONE act, D13 (2026-08-16 — the
`expandAdvancesRound` hook's `edges` attribute widened from one edge map
to the three declared edge classes with per-class target extraction, and
the `code` attribute admitted at the CONTAINER-lane and UNKNOWN-KEY-lane
grains; neither is a new construct).

### D8 — the two open constructs — RULED: BOTH ACCEPTED (user, 2026-08-05)

Both were single-use, and the audit deliberately refused to bank their
coverage until this act ruled. **Both are ACCEPTED**, on the ground
that neither is a NEW construct:

- `memberOf: keys(@catalog)` — a selector root that is an INJECTED set
  rather than a document node (ch11-C8's `uses` resolution): admitted
  as a GENERALIZATION of the existing selector root. A set is a set;
  the relation, the finding form and the code carrier are unchanged.
- per-member `code:` inside an enum (ch11-C16's `failInstance` earning
  a distinct issue code): admitted as the existing `code` attribute
  applied at MEMBER grain, not as a new attribute.

**The D9 tripwire was examined at this ruling, not skirted** — recorded
so a later reader can check the reasoning rather than trust it.
Tripwire 1 fires on admitting a single-use CONSTRUCT to make one row
fit. Neither ruling adds a construct: both widen the domain of a
construct that already passes the ≥2-row test (selectors, 7 rows;
`code:`, 7 rows). Had either required a genuinely new construct for its
single row, the correct outcome would have been the prose lane.

Consequence, executed in the audit at this act: residual **R7 is
RESOLVED EMPTY** (kept as a named family with its record, so a future
single-use candidate has a home and the history stays legible), and
ch11-C8 and ch11-C16 move from `H` to `S`. The standing classification
is therefore **61 fully declarable · 3 mixed · 6 residual** of the 70
obligation-bearing rows.

### D9 — the falsifiability criterion

**The direction is declared FAILED, and this ADR deprecated, if
structural rules cannot be expressed without per-rule special cases.**
The smell is code wearing a declaration's costume. Three concrete
tripwires, any one of which forces a scope review rather than a
work-around:

1. a single-use construct is admitted into the vocabulary to make one
   row fit (D7's test bypassed);
2. the engine acquires a per-rule branch — a literal `if (rule === X)`
   — to reproduce a measured verdict, path or message;
3. the declared residual grows past the AUDITED family ids — eight since
   the 2026-08-06 amendment: six carrying members, R7 resolved empty at
   D8, R8 holding one boundary-kept row — without a ratified amendment
   saying so.

   **How this tripwire was defeated once, recorded so it is not defeated
   the same way twice** (design review F3): the P3 build kept a rule in
   code and filed it under an EXISTING family id whose definition did not
   cover it. The family count stayed at seven, the tripwire read green,
   and a new kind of remainder had appeared unseen. Renaming is not a
   ratified amendment. The tripwire fires on a new KIND of residual, not
   only on a new id — and a rule kept in code for a reason no existing
   family states IS a new kind, whatever it is called.

### D10 — the ENTRY-BELTED membership construct (amendment, user-ratified 2026-08-07)

**ADMITTED**: a membership construct that measures against the keys of an
open map whose VALUE IS A VALID ENTRY — "resolve against valid-entry
keys" — rather than against key existence. Spelled `validKeysOf` as a
selector root beside `keysOf`.

**Why it was needed, and how it was found.** Not by inspection. The
2026-08-07 dress-rehearsal round put an outside author in front of this
substrate for the first time and asked them to declare the ch13
context-block surface. They reached for the only available form,
`memberOf` over `keysOf`, and it loaded — then treated a reference to a
key whose entry was `{}` as RESOLVED. The superseded ch13-C7 says the
opposite in as many words: *"Key existence alone is not resolution — a
key whose value is not a C3 entry leaves its refs UNRESOLVED and fires
this lane per site."* Ten rounds of examining this substrate could not
have produced that, because nobody had tried to SAY it.

**ITS SEMANTICS ON A BROKEN OPERAND — part of the construct, not a
separate feature.** When the catalog operand is wrong-kind, absent, or
otherwise unresolvable, NO membership query against it can succeed. The
construct therefore answers with the EMPTY SET, never with "unreliable":
every referencing site gets its own per-site unresolved finding, and the
container's failure NEVER suppresses them.

This is the one place the ratified corpus already said so — the
superseded ch13-C1's *"NOT C7, whose per-site findings still fire because
no entry can resolve"* — turned from an EXCEPTION a contract had to spell
out into the NATURE of a construct. An exception that must be restated at
every site is the drift this ADR exists to end; a nature is stated once
and cannot be forgotten.

**DERIVATION DUTY, executed rather than assumed.** The whole ratified
corpus was swept for other rows carrying a suppression exemption — every
C-row in every contract, matched on container-precondition language
against exemption language. **Exactly one exists: ch13-C1's exemption of
C7.** ch13-C2 mentions suppression as a lane that IS suppressed, and
ch13-C6's match is about registry classes, not suppression. No ch8, ch11
or ch12 row carries one. So this construct absorbs the corpus's only
suppression exemption, and creates no general exception mechanism.

**THE ADMISSION-TEST READING, recorded because it is the close call.**
The audit's D7 test admits a construct on ≥2 INDEPENDENT ratified rows.
This construct is carried by ONE row — the superseded ch13-C7 — which
governs TWO ref positions, C4's `promptConcernRefs` and C6's
`contextBlockRefs`. **The user ratified the two-position reading.** The
recorded alternative: refusing it would not have avoided an amendment,
because the rule would then have kept a prose lane and grown the
residual family — a residual-family amendment instead of a vocabulary
one. Between two amendments, keeping a STRUCTURAL rule DECLARATIVE wins.
D9's tripwire 1 was examined at this ruling and not skirted: it fires on
admitting a single-use construct to make one row fit, and the judgement
here is that two independent ref positions under one row is not the
single-use case that tripwire names.

**ONE DEFINITION OF "ENTRY", by reference.** The construct does NOT take
a separately named entry shape. Validity is the catalog's own declared
`entry:` node, measured by whether that entry's evaluation produced any
finding. A separately named shape would be a SECOND definition of
"entry" — precisely what ch13-C7 forbade when it defined the belt "by
REFERENCE, never restated here, so ONE definition of 'entry' governs both
channels", and precisely the drift class the P3 aftermath spent five
rounds eliminating. The load-time protection the amendment asked for
lands on the only name that exists: a mistyped OPERAND PATH fails the
load, closure-checked through the one resolver like every other
reference.

**The live declaration does not adopt it.** Its first user is P4's
contract; the expected live behavioral delta is zero.

**NO REFERENCE RING (amended 2026-08-08, user-ratified).** A belt's
operands may not form a cycle — catalog A's entries belting on B while
B's entries belt on A, directly or transitively. Such a declaration is
REFUSED AT LOAD, once per ring, naming every belt in it.

The reason is that the question has no answer rather than a hard one:
neither belt can say whether its own entries are valid until the other
already has, so what the walk reports depends on which catalog was
declared first. Round 11 measured exactly that — the same document, the
same rules, one finding in one order and two in the other. Refusing at
load is the sibling of the value-class ring guard and the same shape: a
declaration that cannot be decided is refused before any document meets
it, with no runtime machinery, and the deferred drain's ordering becomes
unreachable by construction rather than by care.

A future surface with a GENUINE mutual-belt need amends this section with
itself as the named user — WATCH-first, never a loosening in advance of
one.

### D11 — the TYPED-SUBSET `fields` widening on `map.plain` (amendment, user-ratified 2026-08-08)

**ADMITTED**: the `fields` attribute — until this act the fixed map's —
is legal on `map.plain`, with OPEN-KEYSET semantics that are the point:
the listed fields are typed and validated WHEN PRESENT; every other key
stays legal, uninterpreted open data; NO unknown-key lane exists. A
plain map remains format-open — the widening types a SUBSET, it closes
nothing.

**Why it was needed, and how it was found.** Not by inspection — by the
P4 authoring probe (executed 2026-08-08, both channels). The superseded
ch13-C4 puts `promptConcernRefs` INSIDE the two format-open agentConfig
positions, and the vocabulary had no way to say it: a ghost ref, a
numeric member and a grammar-violating member inside the plain map all
passed with ZERO findings. The same probe measured the sneak-in: a
runtime `fields` attribute forced onto a `map.plain` node loaded and
was silently inert — the loads-cleanly-validates-nothing class the
design review named as this substrate's root risk.

**THE ADMISSION-TEST READING, recorded because it is the close call.**
This is an existing attribute at a NEW GRAIN — the D8 pattern (the
selector-root and `code` widenings), not a new construct: `fields` on
`map.fixed` carries the template's whole fixed-keyset row population.
The widening's carrier is the superseded ch13-C4's TWO positions
(`roles.*.defaultAgentConfig`, `steps.*.agentConfig`) under one row —
the two-position reading D10 ratified. D9's tripwire 1 was examined at
this ruling and not skirted: it fires on a single-use CONSTRUCT
admitted to make one row fit; this ruling admits no construct, and the
two-position reading has a standing ratified precedent.

**SEMANTICS, exact.** A typed field is validated when its key is
PRESENT (own-property); an absent field is legal and produces nothing —
absence normalization is the ADMITTED form's business (R4, the
normalizer), never this lane's. Validation transforms NOTHING: a plain
map's value is authored data and passes through unchanged. The
container lanes are unchanged and still gate: a non-plain or
non-canonical map suppresses the typed-field lanes under the implicit
container rule. There is no `presence`, no `default` and no `channel`
on a plain-map field — see the applicability rule below.

**ATTRIBUTE APPLICABILITY IS LOUD at the new grain.** An attribute the
engine does not read on a plain-map field is REFUSED at declaration
load, never accepted-and-ignored: `presence` (a plain map has no
missing-key lane), `default` (nothing materializes into authored open
data) and `channel` (read only on a field of a `map.fixed`) — the
latter two by the standing load guards, the first by this amendment.
This kills the measured silently-inert class for the widened grain;
grains this act does not touch keep their standing guards and nothing
else, so the rule's scope is exactly the widening's.

**The live declaration does not adopt it in this act.** Its first user
is P4's contract; the expected live behavioral delta is zero.

### D12 — the NESTED-SOURCE normalizer hook construct (amendment, user-ratified 2026-08-09)

**What is admitted, and it is admitted BY KIND rather than by
spelling.** The normalizer's declared hooks are a CLOSED discriminated
union: each arm is a named capability with its own attributes, and the
engine can express exactly the arms the union carries. This act admits
ONE further arm — a hook whose SOURCE is a field nested inside a value
the landing node already carries, and whose PRODUCT is a sibling field
on that landing node, filled with the source's value where one was
authored and with the declared empty form where none was. Its
discriminator, its operand-attribute names and its entries' tags are
the realizing act's to spell; what this ADR admits is the KIND, and a
later spelling that changes the kind is a new amendment rather than a
rename.

**Why it passes D7's ≥2 independent ratified rows test, on the reading
D10 established.** The naive count says one row — a single ratified row
governs the typed ref field at both of the template's config positions,
and a construct serving exactly one row is refused. That count is the
wrong one, and D10 already settled why: the test asks whether the
construct serves more than one INDEPENDENT DECLARATION POSITION, not
whether more than one row happens to name it. A row is a decision; a
position is a place the engine must act. D10 was admitted on precisely
that reading, and D11 applied it to THIS pair of parents — the
role-level default config and the step-level config map — establishing
them as independent positions with independent lanes. This construct
serves both. A single-position version of it would be refused, and
that refusal is the test still doing its work rather than being
argued around.

**What it is NOT.** It is not node growth. D7's node flavour is a new
DECLARATION USE — a key, a grammar, a default — and a union arm is a
new MEMBER of the vocabulary, which changes what the engine can
express at all. The distinction is not a matter of labelling: a packet
that built this as node growth would perform the same vocabulary
change with no ratifying act behind it, and this tally would drift by
exactly the amount D11's own note exists to prevent.

**The falsifiability tripwires (D9) are checked, not assumed.** The
first — a construct admitted to make one row fit — is answered by the
two-position reading above and by the refusal counterexample: a
single-position hook is refused and its row keeps hand code. The
third — an admission whose counterfactual was never stated — is
answered here: without this construct the two produced positions are
filled by hand-written normalizer code, which is the derivation
scattering this ADR's D3 exists to end.

**The live declaration adopts it in the REALIZING act, not in this
one.** This amendment authorizes the kind; ch13-p1a's build adds the
arm and its two entries, and the schema re-lock act records the new
declaration bytes. The expected live behavioural delta of THIS act is
zero.

### D13 — TWO attribute widenings, ONE act (amendment, user-ratified 2026-08-16)

**ADMITTED, both in D11's class** — an existing attribute at a new
grain, not a new construct — and recorded in ONE act because ch14-P1's
realizing build carries both. Neither is a live capability until that
build; the expected behavioural delta of THIS record is zero.

**(a) `expandAdvancesRound`'s edge SOURCES.** The hook's `edges`
attribute named ONE edge map (`transitions`) and now names a LIST of
edge classes, each declaring where its target sits: absent = the edge
VALUE is the target (`transitions`, `onResume`), `targetAt: "target"` =
the target sits under that key of the edge value (`decisions`).
ch14-C11 ratified the widening and classed it; this section RECORDS it,
which is why the edit rides the realizing act's commit rather than a
prerequisite one — nothing here AUTHORIZES a construct the declaration
could not otherwise use.

Its D7 admission case is the THREE independent edge positions under the
established D10/D12 position-reading. Its counterfactual is stated
rather than implied: without it, the round-advance flag map covers
transition edges only, so a rework loop-back through a decision edge
could not open a new round, and the missing half would be filled by
hand-written normalizer code — the derivation scattering D3 exists to
end.

**(b) `code` at the CONTAINER and UNKNOWN-KEY grains.** MEASURED at
ch14-P1's authoring (receipt PROBE-CH14P1-6): the vocabulary admitted
`code` at exactly three grains — the membership rule, the `presence`
block and the `enum` node — and a `code` authored at a container lane
was accepted at load and silently dropped at runtime, as was a code
outside the declared namespace at that position. ch14-C8 assigns
container-lane codes, so the ratified rule was not expressible.

Its D7 admission case is the SIX declared container / unknown-key
positions ch14-C8's table assigns (the `decisions` container, the
decision-entry container and unknown-key lanes, the `payload`
container, the payload-spec container and unknown-key lanes), so each
widened grain carries ≥2 on its own. The attribute's SPELLING resolves
at NODE grain: the container and unknown-key messages are node-grain
templates with no per-lane carrier, so one attribute on `map.fixed`
serves both of that kind's coded lanes and one on `map.open` serves its
single container lane — the enum-grain precedent. The declaration-load
NAMESPACE check joins the new position in the same edit.

**THE APPLICABILITY GUARD THIS ACT OWES, and its grain.** D11 already
legislates that an attribute the engine does not read at a grain is
REFUSED at declaration load rather than accepted-and-ignored. This act
generalizes that from three hand-spelled refusals to ONE inventory
keyed on attribute × kind × POSITION, fail-closed by construction: a
vocabulary attribute added later without its inventory entry is refused
at its first use.

The POSITION key is not decoration — it is measured (receipt
PROBE-CH14P1-7): `presence` on a `string` FIELD of a fixed map is
legitimate and fires, while `presence` on a `string` ENTRY of an open
map loads clean and produces byte-identical findings with and without
it. ONE kind carries the same attribute as both a live and an inert
case, so a kind-keyed allowlist cannot separate them.

The guard's INVERSE — an inventory entry whose READER was deleted — is
NOT closed by an allowlist and is not claimed to be: an allowlist
cannot see an absent reader. That direction is discharged by a
mutation probe under the standing protocol, receipt-backed.

**The D9 tripwires, checked rather than assumed.** Tripwire 1 fires on
a single-use CONSTRUCT admitted to make one row fit; neither half here
adds a construct, and each carries ≥2 independent positions on its own.
Tripwire 3 — an admission whose counterfactual was never stated — is
answered per half above.

## Alternatives Considered

- **Keep ratified prose plus a hand-written validator (the status
  quo).** Rejected on measurement, not taste: the drift floor above is
  what this shape produces, and its second sweep did not shrink.
- **Adopt an off-the-shelf schema language (JSON Schema, Zod, and
  friends) as the ratified artifact.** Rejected AS THE ARTIFACT: none
  of them expresses the things the parity gate is made of — the
  finding-path GRAIN (`at: index|container`), the container-precondition
  suppression semantics, the source-form ladder over YAML nodes
  (anchor/tag/alias-free raw text), the issue-`code` carrier, or the
  channel-scoped attributes. Zod additionally is code, which forfeits
  the declaration-as-data property that the whole line rests on. NOT
  rejected as an implementation detail: generating onto an existing
  validator core stays open at build time, provided the ratified
  artifact remains our declaration.
- **Put the declaration in the contract markdown (D4's rejected pull).**
  Rejected as the home; kept as the pointer side.
- **Build the engine first and declare afterwards.** Rejected: that is
  precisely how today's validator grew, and the audit is the artifact
  that had to be written to find out what it actually does.
- **Migrate every surface at once.** Rejected by D6 and by the P1
  overbuild lesson (process-log 2026-08-04): a guard that grows faster
  than what it guards is the failure mode this phase already paid for.

## IC-N Screen (mandatory)

No. This decision changes how definition-time structural rules are
EXPRESSED and validated; it touches no banned kernel shape — no
deterministic replay of actor/LLM work, no leader-per-shard
coordination, no event-sourcing as the source of truth, no
reconciler/outbox for kernel state. This screen does not bypass the
model↔code divergence stop: the audit's classification changes no
model meaning, and any row whose MEANING would move travels the
contract-reopen path in its own act.

## Consequences

- **Positive.** Restatement becomes structurally impossible for the 59
  declarable rows — there is one place a structural rule can live.
  Channel asymmetry stops being an argued property (D1). The residual
  is a NAMED list of seven families instead of an unknown remainder, so
  a future reader can see exactly where prose still legislates. The
  ch13-C7 entry belt and its normalization class account for THREE of
  that draft's four ratified reopens (the 2026-08-01 direct-channel act
  that reopened C7 itself, and the 2026-08-02 pair on C17/C8(c)) — and
  the belt is DERIVED to dissolve under one engine on both channels,
  its measurer being the P4 panel's channel-symmetry family plus the
  parity gate.
- **Negative.** A second machine exists (D3's normalizer) and must be
  kept honest, or "schema" will be read as covering derivation. The
  contract becomes less self-contained for a human ratifier: decisions
  live in prose, attributes in the schema file, and the ratification
  act must name both byte sets. The parity gate is real work whose cost
  lands on whoever migrates a surface. None of the benefit is realized
  at this ADR — it is realized at P4/P5.
- **Neutral.** Today's validator keeps working unchanged under D6; this
  ADR authorizes a direction and a scope, not a rewrite. The issue-code
  namespace, the finding forms and the CLI machine shape are unchanged
  by design — they are inputs to the parity gate, not outputs of it.

## Verification

- **The parity gate (D5)** is the primary proof: 362 existing cases
  replayed, verdict/path/message identical or an approved delta list.
- **The tag-closure check (D4)**: every declaration tag cited by a
  contract row exists in the schema file and vice versa — run twice by
  hand during the audit, both difference lists empty at 51/51.
- **The ≥2-row admission test (D7)** is recorded per construct in the
  audit's §2.2, each cell enumerating its rows; a construct that cannot
  produce its second row is refused.
- **The falsifiability tripwires (D9)** are checked at the P4 contract
  authoring and at every migration act; firing one opens a scope
  review, not a work-around.
- The audit itself is the standing basis document, pinned by hash in
  Context.

## Related

`v3/implementation/schema-expressiveness-audit.md` (the enumeration
this ADR rests on) · `v3/implementation/ch13-rederivation-plan.md`
(P3's charter; the phase order P1 → P3 → P4 → P5) · the four format
contracts `ch8-template-format`, `ch11-gate-format`,
`ch12-runtime-core`, `ch13-context-block` (superseded — its rows remain
the ratified decision record) · ADR-011 (the definition module, D4's
home) · ADR-012 (the yaml dependency behind the substrate block) ·
ADR-013 (the injected gate registry D8's first construct resolves
against) · process-log 2026-08-02 (the boundary candidate `4c1d481f`),
2026-08-03 (the ratified direction), 2026-08-04 (the overbuild reset
whose four rules bound this phase), 2026-08-05 (P1's close, P2 struck).
