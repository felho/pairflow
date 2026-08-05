# ch13 — context-block contract

```json
{"contract_draft": {"chapter": "ch13", "surface": "context-block", "status": "superseded"}}
```

## Context (non-normative by declaration)

**Business invariant.** L2 enforces; L2b communicates. A context block
is deterministic, actor-facing prose rendered into the dispatched
ContextPacket so the actor is told an operating rule before acting —
it never enters a verdict, a gate decision, or any kernel decision
surface (`l2b/communication-only`, disposition `review`; the precise
byte-scope is C12's).

**Control model.** One render mechanism, two ref sources, one body
source: the template-level catalog holds every body; role/step
prompt-concern refs (the L0c slot this chapter first resolves) and
gate/policy block refs are id lists into it. Refs are validated at
ADMISSION-time definition-static checking (the definition-issue
channel, static analog of binding coverage; the walk/rung realization
split is C19's); the render is a pure function at dispatch.

**Read-path, staged.** The definition-static lanes read the SOURCE
form (the walk) and the built template (the admission rung), per
C19's split; `assemble_context_blocks(instance, template, step)`
reads the admitted template's NORMALIZED fields and catalog (C17) —
never the merged effective agent config (C5).

**Forbidden fallback.** No render-time drop of an unresolved ref and
no render-time skip of a malformed catalog (neither state exists
post-admission — C7/C9/C17); no code-invented rejection name (the
issue code is the EXISTING `unresolved_context_block_ref` from the
ch11 model-sync 31-name definition-issue family).

**Allowed resolution.** An absent catalog with zero refs issued is
the every-existing-file state — fully legal, zero-impact.

**Missing-data.** A template with refs but no resolving catalog
entries fails at definition-static checking (per-site findings, C7).

**Model-table note (superseded cells, recorded — no divergence stop
owed):** the model's Canonical Context Block Contract table still
says "reject at create" on its two ref rows; the same section's
invariant record (`refs-validated-at-definition-load`: "runs under
ADMISSION"), the `CREATE_INSTANCE` reprint's own comment, and the
Evidence block all say ADMISSION — the table cells are pre-model-fix
residue of the ch11 sync (definition-static validation moved to the
admission channel). This draft follows ADMISSION.

**Substrate probes (recorded per the ch11 probe-record form —
yaml@2.9.0, the v3 package's pinned dependency; YAML 1.2 semantics
via `YAML.parseDocument`):**
- **PROBE-CB1 (2026-07-26; re-executed at the round-2 and round-3
  panels):** kebab-case catalog keys with digit-bearing segments
  (`no-converged-before-round-2`) are plain STRINGS at node level; a
  bare digit-leading key (`2`) is a NUMBER at node level — the GP2
  identity class.
- **PROBE-CB2 (2026-07-26; re-executed at the round-2 and round-3
  panels):** a bare `true:` key is a BOOLEAN at node level; beside
  the string key `"true":` the pair passes the duplicate-key gate
  (the loader's `yamlNodeEqual` is SameValueZero on scalar values —
  `true ≠ "true"`). Under a NAKED default `toJS` the pair would
  collapse to one key (last wins) — but the v3 loader resolves with
  `toJS({ mapAsMap: true })` EXACTLY to prevent that collapse (its
  own comment says so), so non-string keys ARRIVE PRESERVED at the
  walk, and every sibling open-key surface (`steps`, `roles`,
  `transitions`, the gates subtree) already carries a WALK-side
  non-string-key validation lane reporting at the nearest
  addressable path. The consequence for this chapter is C2's key
  lane in the walk — the sibling pattern applied to the new open-key
  map.
- **PROBE-CB3 (2026-07-26, executed at the round-2 panel through the
  real `loadTemplate`; EXTENDED at the round-3 panel):** integer-like
  keys authored in QUOTED form (`"2":`) admit as record keys and
  HOIST to the front of the record's enumeration order (`transitions`
  authored `ZZZ, "2", AAA` → admitted keys `["2","ZZZ","AAA"]`, and
  the rebuilt gates record mirrors it); MULTIPLE integer-like keys
  additionally re-sort ASCENDING among themselves (authored
  `ZZZ,"10","2",AAA,"1"` → `["1","2","10","ZZZ","AAA"]` — the
  round-3 measurement); an UNQUOTED `2:` is rejected upstream as a
  non-string key. C9's order basis rests on this measured behavior.

**Prepared reopen texts (ch11-C4 + ch11-C30 + the ch11-C41
comparative parenthetical — ONE post-close reopen act over three
named sites, riding this draft's ratification; the act's carrier row
is C16; the realized→reopened→realized mechanics per the
contract-draft template §4):**
- C4 becomes: *"A gate map is FIXED-KEYSET: `uses` (required) +
  `config` (optional map) + `contextBlockRefs` (optional — value
  class and semantics owned by `contract:ch13-context-block#C6`). NO
  `implementation` / `execution` / `id` keys exist — the
  implementation and execution axes are evaluator-INTRINSIC
  (registry-resolved from `uses`), never authored; unknown keys are
  ADMISSION issues per the ch8-C13 fail-closed culture."*
- C30's trailing `context_block_refs` clause (semicolon-joined — the
  edit also closes the preceding clause with a period) becomes:
  *"The authored gate-binding key `contextBlockRefs` (the model's
  `context_block_refs`) joined the binding keyset at the ch13
  ratification act — value class and semantics:
  `contract:ch13-context-block#C6`; before ch13 it was explicitly
  not a key of this surface."* (Only that clause changes; the row's
  remaining text is untouched.)
- C41's comparative parenthetical is edited IN FULL (both mentions —
  the half-fix would leave the antecedent naming a pattern the same
  act retires): *"deliberately NOT the then-standing C30
  `context_block_refs` non-surface pattern: `context_block_refs` was
  another chapter's semantics (landed at ch13 as the authored key
  `contextBlockRefs` — `contract:ch13-context-block#C6`), while the override is ratified
  model capability on THIS surface"*.
- Map-entry duties, ITEMIZED (the token-blind `v3:realized-map` lint
  cannot catch these — the ch9-C27 lesson): C4's entry updates its
  keyset parenthetical — *"(uses + optional config)"* becomes
  *"(uses + optional config; + contextBlockRefs at ch13 —
  delegation: ch13#C6)"* — beside its historical landing; C30's
  entry RETIRES the code witness *"context_block_refs is NOT a key
  (validate.ts unknown-key)"* and records the delegation (the
  witness's intent is falsified by ch13-P1 by design — and the
  witness was mis-sited anyway: the binding unknown-key lane lives
  in the admission rung, not validate.ts); C41's entry is
  annotation-only (the clause fix). All three realize VACUOUSLY
  (this chapter's close owns the new key's realization).

**Reopen-vs-aggregate-note criterion (applied here; promotion is a
NAMED boundary-review item — plan §13.5(e) is the carrier):** a row
is REOPENED when its operative text is a hard promise about THIS
surface (ch11-C4's closed keyset; ch11-C30's "explicitly not a key";
C41's present-tense comparative); it is AGGREGATE-NOTED when its own
text pre-authorizes or forward-scopes the arrival (ch12-C7's
delegation clause names this chapter; ch12-C1's aggregate-note chain;
ch9-C18's "the later ContextAssembly surface (L2b, the named §1.3
candidate)" — aggregate-noted here: its "later" clause resolves to
this chapter, recorded without a reopen). Tie-break, decided by the
live case: a row carrying BOTH a hard promise AND a delegation clause
(ch12-C7) follows the DELEGATION — the promise is self-scoped to the
pre-arrival state by the row's own next clause. Fourth application,
recorded: ch11-C21's lane matrix is SELF-SCOPING ("the containers
this surface introduces"; its checklist derivation is its own P4's) —
its text stays true after the act (the `gate-map unknown key` lane is
parametric on C4's keyset), the ch13 binding-level lanes are C19's
inventory, and the reopened C4's delegation pointer carries
discoverability: aggregate-noted, no reopen.

**Seed-row disposition (every §13.3 item landed — the ch8–ch12 form;
no seed item is undisposed):** the three keys' camelCase spelling +
attachment points + keyset rules → C1/C3/C4/C6; the catalog entry's
fixed keyset + unknown-key disposition → C3; the packet TS shape +
the three provenance source spellings incl. the gate-binding
step+event pair → C11; the admission finding's lane (path form,
`code` carrier, accumulate-vs-short-circuit vs ch8-C21/C36) →
C7/C19; the empty/absent matrix (incl. the same-id-from-role-AND-step
case) → C8 + C9; the render when a gate ref's binding is not
offerable → C10; the shipped catalog entry's PRESENCE rule → C14;
the REQUIRED caveat row → C15. Rows beyond the seed (C2, C5, C12's byte-scope precision, C13,
C16, C17, C18, C19) per §13.3's "the draft decides".

**Decision-home triage (template §1, the K0→K4 sequence — outcomes
for ALL TWELVE DECIDED-HERE markers: C2 key lane + grammar, C3
no-reserve, C6 any-binding, C7 entry-belted resolution grain (added
at the 2026-08-01 reopen), C8(c) strict flip, C8(c) no-exclusion +
unconditional domain (added at the same reopen), C8(e) hygiene lane,
C9 record-order, C11 pair-flattening + quoting, C14 both-roles, C16
act composition, C17 optional-on-raw shape):** all twelve triage
ROW-HOME. K0: none is model-shaped — the model's own text leaves
each surface open: set-iteration order (the unit iterates a set); a
new id namespace's grammar; reserved syntax; intra-list repetition;
catalog-entry hygiene; the evaluator-class scope of a communication
key; the JSON grain of a pseudocode tuple (C11: the unit itself
emits the TAGGED `{ source, at }` member — the tagged shape is the
unit's own form, NOT a ch13 invention; what is decided here is only
the `at`-pair flattening and the token quoting — the ch11-C13/C16/
C37 rename culture governs the byte grain, so no model wave); the
shipped file's authoring position; an act's composition; a TS
optionality grain; and the two 2026-08-01 additions are likewise
open in the model — its `refs-validated-at-definition-load` text
fixes WHEN refs are validated, never what "resolved" requires
structurally, and the unreferenced lane is itself a hygiene lane
above the model's text (C8(c)'s own strict-start marker), so neither
the belt nor the domain rule is model-shaped. K1–K4: no
beyond-chapter architecture shape —
C2's namespace follows the ch8-C10 row-home precedent (id grammars
live in format rows; no ADR exists for any of them); no safety
class, no innocent-diff risk beyond the rows' own text.

**Consumed authorities (context pointers, not rules):** ch8-C7 root
additive growth; ch8-C10 id-grammar rationale; ch8-C13 fixed/open map
classification; ch8-C15 roles-entry keyset (as grown by ch12-C6 —
the authority that makes C4's role position exist); ch8-C21
accumulated findings + container suppression; ch8-C31 dev-validate
machine shape; ch8-C36 staging + the standing cross-rung accumulation
(the walk hands a best-effort template; the admission rung's findings
JOIN the walk's in ONE validate-stage result — the realized ch11-P4
F7 form C19 relies on); ch11-C1 step-keyset growth precedent; ch11-C2
(gates keys ⊆ transitions keys — the reason C10's membership leg is
by-construction); ch11-C3 (gate pipelines are lists; authored order
is pipeline order); ch11-C4 + ch11-C30 + the ch11-C41 parenthetical
(the named reopen act); ch11-C7 (the LIST-INDEX `[<i>]` path
grammar); ch11-C9 (the three-class registry); ch11-C40 (the
per-occurrence duplicate-lane precedent, unconditional `seen` feed —
AND the REALIZATION-SPLIT precedent C19 applies: source-form lanes
in the walk, value-level lanes in the admission rung); ch11-P2a A9
named-lane `code` carrier; ch12-C6 (roles-entry keyset growth);
ch12-C7 (the agentConfig refs-field delegation — its exact clause:
the refs' value classes "arrive ADDITIVELY with their consuming
chapter (the ch-9 ActorAdapter / L2b ContextAssembly)": this
chapter); ch12-C8/C10 (the cascade + the commit-time
`issued_agent_config` provenance C12's byte-scope names); ch12-C1
(root-aggregate note convention); ch9-C18 (`*_refs` uninterpreted at
the adapter — aggregate-noted above); the model's Canonical Context
Block Contract table (two cells superseded — the note above) + the
four `l2b-pseudocode` units + the six l2b invariants; plan §13.

**Draft metrics (template §5):** rounds to ratify: 5 panel rounds
(4 full + 1 targeted) + 1 top-level close, CLEAN; new-decision
content: 10 DECIDED-HERE markers across 9 rows; post-ratification
reopenings: 0.

**Reopen record (2026-08-01, the ch13-P1 gate-1 arm re-check #3).**
Reopened C1's closing clause alone: the row called the
present-but-malformed catalog's result "exactly the
absent-catalog-with-refs shape", an identity that holds at the
REF-LANE grain (the same per-site C7 findings, nothing resolving) and
fails at the whole-result grain (an absent key runs no container lane,
so it cannot produce the container finding the malformed case does).
The clause now states both grains. Three consecutive review rounds
contested the packet's projection of this clause from ALTERNATING
directions — a packet could satisfy the row's letter or the code,
never both — which located the defect in the contract bytes rather
than in the projection. Reopen-delta new-decision rows: 0 (a fact
correction; no decision moves, and the C-row's normative content —
one container finding, the named suppressed dependents, C7 still
firing — is unchanged).

**Dated update (2026-08-01, the C1 grain reopen):** post-ratification
reopenings 0 → 1 (closed by re-ratification within the same act).

**Second reopen record (2026-08-01, the ch13-P1 panel round 7 — the
direct-construction region).** Reopened C7, C8(c), C2's far-side edge
and C19's CHANNEL SCOPE sentence. The rows had declined to specify
what the admission rung does with a catalog on the
direct-construction channel: C19 handed it to "the testkit author's
discipline" on a type-foreclosure premise that measurement falsified
(`tsc --strict` rejects an array, a wrong-valued entry object and a
class instance alike, while an ungrammatical KEY needs no cast at
all), and C8(c) conditioned its key exclusion on a C2 finding that
never exists there. Three consecutive review rounds each found P1
defects in that one region, every one traceable to a packet having to
invent policy the rows left open. Decided: C7 resolution is
ENTRY-BELTED against C3's definition BY REFERENCE; C8(c)'s
C2-failed-key exclusion is DELETED on both sides and its domain is
ALL own enumerable keys with no value condition; C19's realization
split is UNTOUCHED (the key lane stays walk-side) with only its
CHANNEL SCOPE rationale corrected to the measured facts. Outcome: the
admit/refuse result is channel-symmetric for every catalog and entry
shape, the finding SET differing only by the lanes C19 places in the
walk. Reopen-delta new-decision rows: 2 (C7's grain, C8(c)'s domain —
the triage roster carries both, ROW-HOME, neither model-shaped).

**Dated update (2026-08-01, the direct-channel region reopen):**
post-ratification reopenings 1 → 2 (closed by re-ratification within
the same act).

**Third reopen record (2026-08-02, the ch13-P1 arm gate-1 on the
approve-ready bytes).** Reopened C17's catalog normalization clause
and C8(c)'s nullish residual sentence — two rows, nothing else. The
arm found C8(c) asserting an identity the rows could not deliver: a
cast-forged `contextBlocks: null` with zero refs was called
"observably identical to the legal absent-catalog state", while
measurement showed `admitTemplate` admitting it and carrying the
`null` onto the admitted value against C17's own typed surface, so
the render would meet a non-record it may neither revalidate nor dig
through. Decided: C17 normalizes absent, present-null and
present-undefined alike to `{}`, the nullish idiom the sibling
`activation` rebuild already applies (`admit.ts:444`), which makes
C8(c)'s identity true BY CONSTRUCTION. Reopen-delta new-decision
rows: 1 (the nullish grain, marked DECIDED HERE in C17).

TWO FORM PRECEDENTS this act sets, recorded because later drafts
should copy them. FIRST — the DERIVED marking: C8(c)'s identity
cannot be measured until the rebuild exists, so the row SAYS it is
derived instead of wearing a false "measured", and NAMES its
measuring carrier (the normalization family's empty-direction
full-value equality member, audited by the build-close sensitivity
pass). A derived claim without a named verifier is a deferred
assertion, not a contract row. SECOND — the provenance of the defect:
the false sentence entered from the RATIFYING side's own drafting
without a probe behind it, which is why the executed-probe rule is
recorded in the process log as binding on reviewer-proposed and
author-proposed sentences alike.

**Dated update (2026-08-02, the nullish-normalization reopen):**
post-ratification reopenings 2 → 3 (closed by re-ratification within
the same act).

**Fourth reopen record (2026-08-02, the ch13-P1 arm gate-1 re-check —
the SAME DAY as the third, and that is the point).** Reopened C17's
normalization clause and C8(c)'s measuring-carrier sentence — two
rows, nothing else. The third reopen had been scoped to the NULLISH
catalog; the arm's re-check showed the defect was the CLASS "an
admitted catalog may be a non-record", so four of five members
survived the fix. RECEIPTS (live `admitTemplate`, zero refs,
2026-08-02):

    contextBlocks: null  → ok:true  carried: null  (object)
    contextBlocks: 42    → ok:true  carried: 42    (number)
    contextBlocks: true  → ok:true  carried: true  (boolean)
    contextBlocks: ""    → ok:true  carried: ""    (string)
    contextBlocks: []    → ok:true  carried: []    (object)

Decided: the authored value is carried in place IFF it is a RECORD
(a non-null, non-array object — the predicate defined in C17 for the
rebuild rule) and normalizes to `{}` otherwise, so C17's typed
surface is true without exception. C8(c)'s carrier grew to match: the
absent fixture and EVERY non-record fixture must yield byte-identical
admitted values. Reopen-delta new-decision rows: 1 (the class-width
grain). TWO CORRECTIONS the ratifying side caught before GO, recorded
because both are rule-instances: the draft first attributed the
record predicate to C8(c), which does not state it (an UNVERIFIED
CITATION — the citation-shaped form of an unrun "measured"); and the
empty-array receipt was demanded in the record rather than in
conversation, since a MEASURED label travels with its receipt.

**Dated update (2026-08-02, the class-width normalization reopen):**
post-ratification reopenings 3 → 4 (closed by re-ratification within
the same act).

## Contract rows (every normative statement is a C-row)

| ID | Rule |
|---|---|
| C1 | The template top level gains the OPTIONAL `contextBlocks` key (ch8-C7 additive growth; the root keyset becomes the ch8 five + the ratified optional keys `runtimeContext`, `round`, `activation`, and this — ch12-C1's aggregate note described the pre-ch13 state; no earlier row is modified). camelCase realization of the model's `context_blocks` (the ch11-C13/C16/C37 rename culture — stated so neither side silently forks). Its value is an OPEN-KEY map (the ch8-C13 classification: its KEYS are data — block ids, C2; its VALUES are C3's). A PRESENT value that is not a map — present-null, scalar, list — is a container-precondition finding at path `contextBlocks` (ONE finding, dependent lanes suppressed — the ch8-C21 container rule; the suppressed dependents are the CATALOG-side lanes: C2's key lane, C3's entry lanes, and C8(c)'s reference check — NOT the ref-list member lanes, which presuppose their own containers, and NOT C7, whose per-site findings still fire because no entry can resolve; AT THE REF-LANE GRAIN the resulting shape is exactly the absent-catalog-with-refs shape — the same per-site C7 findings, nothing resolving — while THIS case adds its OWN one container finding beside them, which an absent key cannot produce because no container lane runs on it; stated at both grains, not accidental). An ABSENT key with zero refs issued is legal (every pre-ch13 file). |
| C2 | Block-id KEY LANE and grammar (a NEW namespace — catalog keys and every ref-list member). ONE key lane, the sibling helper shape (the realized `idGrammarError` form rejects non-strings and grammar violations in one lane — a split identity-vs-grammar precedence would be unobservable at build): a catalog key that is not a node-level STRING (number, boolean, null-form — PROBE-CB1/CB2's identity classes; the walk sees them because `mapAsMap: true` preserves key types) OR that fails the grammar below yields ONE walk-side validation finding at the CONTAINING path `contextBlocks` — UNCONDITIONALLY, string and non-string alike (the realized sibling form: the steps/roles/transitions/gates key lanes all report at the bare containing path; the key-segment conditional belongs to the unknown-key/container lane class, not to key lanes — stated so the build copies the right idiom, and the C3 entry-lane paths (`contextBlocks.<id>`) stay DISTINCT from this lane's by construction). Hand-off: the walk FILTERS NON-STRING keys out of the built catalog (a typed Record cannot carry them); a grammar-failing STRING key STAYS in the built catalog (the realized non-cascade culture — the sibling walk keeps grammar-failing string ids), its presence INERT AT THE RESOLUTION LANE ONLY: no shape-passing ref can address it (one shared grammar). It is NOT inert at C8(c) — since the 2026-08-01 reopen no key is excluded from the unreferenced check, so such a key draws that finding too unless a raw ref member names it. N failing keys yield N findings at the one bare path, separated by message (the sibling multi-key behavior). Grammar (string keys and members): nonempty, matching `^[a-z][a-z0-9-]*$`. DECIDED HERE, strict start: letter-start excludes the numeric string forms; the charset bans whitespace and `.` by construction (block ids appear as ch8-C21 path segments); the `-` separator deliberately diverges from the ch11-C6/ch12-C3 underscore token grammars (the model's exhibited ids are kebab — stated so the namespaces do not blur). The model's exhibited ids (`reviewer-severity-ontology`, `no-converged-before-round-2`) are members — and the digit-bearing kebab STRING key is the lane's named SUCCESS member (PROBE-CB1's discriminating case; a digit-rejecting implementation must red — P1-driven). Two-sided edges, stated here as on their owner rows: this lane is suppressed under C1's catalog-container failure; a C2-failed key is NOT excluded from C8(c) (the carve-out was deleted at the 2026-08-01 reopen — the two lanes state two independent facts, and on the direct-construction channel this lane does not run at all). A ref-list member violating the grammar fails the C4/C6 member-shape lane and is EXCLUDED from C7's resolution set (C7 states the same carve-out from its side). |
| C3 | A catalog ENTRY is a FIXED-KEYSET map: `{ body }`, `body` REQUIRED, a nonempty string — authored static text rendered VERBATIM, and template-authored DEFINITION data by construction: no runtime, actor, or run-supplied channel reaches this position (the catalog is admitted-template content; C5 closes the only run-scoped channel near the field family). Outbound, the same bytes travel verbatim into the actor's `packet.json` with no length or content bound — the same exposure class as the shipped `instruction` field; prompt shaping is the `actor-adapter-rendering` Absent, named, not implied. No interpolation syntax exists, and none is reserved: a body containing `{{…}}`-like text is legal literal prose (DECIDED HERE — rejecting would speculatively enforce the computed-bodies Absent; that later chapter owns any syntax and its migration, including the consequence that today's literal `{{…}}` prose would need migration then). Unknown keys in an entry are definition-static findings (the ch8-C13 fail-closed culture; walk-side per C19's split); an entry value that is not a map — present-null, scalar, list — is its container-precondition finding at `contextBlocks.<id>` (suppressing the entry's body lane). Two-sided suppression edges, stated here as on their source rows: this row's entry lanes are suppressed under C1's catalog-container failure and under a C2 key failure on the same entry. |
| C4 | The role/step ref positions: `promptConcernRefs` INSIDE the two template agentConfig positions (`roles.<r>.defaultAgentConfig`, `steps.<s>.agentConfig` — the positions exist per ch8-C15 as grown by ch12-C6) — camelCase of the model's `prompt_concern_refs`; the ch12-C7-DELEGATED additive arrival (ch12-C7 pre-authorizes the refs' value classes arriving with "their consuming chapter (the ch-9 ActorAdapter / L2b ContextAssembly)" — no ch12 reopen; this is the FIRST field of the otherwise format-OPEN agentConfig map that admission types, and ch12-C7's "NO field of it is format-enforced or kernel-interpreted" sentence thereby described the pre-ch13 state — the aggregate-note convention, no ch12 row modified; the GP2-scan exemption on agentConfig stays safe beside this: any non-string-keyed map nested in agentConfig already fails the canonical-JSON value lane as a non-plain object). Value class: a list (possibly empty) of C2-grammar strings. ABSENT states are legal and contribute ZERO refs: an absent `defaultAgentConfig`/`agentConfig` map, or a present map without the key (C17 materializes the normalized form to `[]` — the render never dereferences an absent path). A present value that is not a list — present-null, scalar, map — is a container-precondition finding at the field's path (dependent member lanes suppressed, and C8(c)'s check is SKIPPED for the whole template — the soundness reason: the reference set is a template-wide UNION, and a per-list skip would emit PHANTOM unreferenced findings for entries referenced only from the broken list); a non-string, empty-string, or grammar-violating member is a finding at `…promptConcernRefs[<i>]` (the ch11-C7 list-index path grammar, 0-based). Every OTHER agentConfig field stays exactly as raw and format-open as ch12-C7 states. The tree's one live snake-spelled FIXTURE (`prompt_concern_refs` in the l0c golden-trace file — TWO sites: the authored step key and the `RESOLVE_REVIEW` expected-cascade echo; a TS fixture, not an authored template file) is DISPOSED at P2: BOTH sites move to the typed key WITH a catalog entry, realizing the L0c slot's resolution (this chapter's acceptance evidence); the post-move fixture carries the typed key beside untyped snake siblings at those sites (`skill_refs`; the implementer-side map carries `prompt_profile_refs`) — the CORRECT end state (one typed field, open raw vocabulary), stated so it does not read as an inconsistency; the sweep searches the VALUE (`reviewer-severity-ontology`) too, per R-ABSENCE-CONSUMERS. |
| C5 | A `runOverrides` entry MAY carry `promptConcernRefs` (ch12-C7: the kernel merges and records runOverrides opaquely — that surface is untouched, the merged value flows into `effectiveAgentConfig` as DATA), but it is NEVER a render source: the render reads the admitted template's normalized declarations (C17), never the merged effective config, and the provenance source enum has no run-level member (model-verbatim — the unit's read-path plus the three-member source set). Consequences, all DECLARED observables with a named owner (the P2 packet's test families): (a) run-supplied ref ids are NOT validated against the catalog and never resolve to blocks — and a catalog entry serving ONLY run-supplied refs is rejected by C8(c) as unreferenced (dead by design, the two rows compose); (b) because the ch12-C8 cascade merges top-level keys wholesale (arrays REPLACE), a run override or step override CAN make `effectiveAgentConfig.promptConcernRefs` differ from the rendered set — the packet's `contextBlocks` field IS the rendered truth (communication), `effectiveAgentConfig` is recorded run intent (data); an adapter renders neither, it passes the packet through (ch9). Stated so the two read-paths never silently fork. |
| C6 | The gate-binding keyset gains OPTIONAL `contextBlockRefs` — VIA the named post-close reopen act over ch11-C4, ch11-C30, and the ch11-C41 parenthetical, riding this draft's ratification (C16 is the act's carrier; prepared texts in Context; ch11-C30's realized text otherwise promise-binds the key's absence, with a code witness in its map entry the act retires). camelCase of the model's `context_block_refs`. Value class: identical to C4's (a possibly-empty list of C2-grammar strings; same container/member lanes incl. present-null — a container failure likewise skips C8(c) — paths `steps.<s>.gates.<event>[<i>].contextBlockRefs[<j>]`, the ch11-C7 list-index grammar). Unknown-key fail-closed on the binding is UNCHANGED. The key is legal on ANY binding — declarative, packaged, and process alike (the ch11-C9 three-class registry; communication is evaluator-independent, DECIDED HERE — the restrict-to-declarative alternative was rejected: the model's config instance exhibits declarative only because that is the trace's gate, not a scoping rule). |
| C7 | The resolution lane: `validate_context_refs` runs at ADMISSION-time definition-static checking (`admit_definition`; realization per C19's split), its lookup domain the BUILT catalog Record (no stringify-first lookup). One OBSERVABLE lookup consequence, stated with its vacuous twin: keys and members share ONE grammar, so no shape-passing ref can address a grammar-failing STRING key — that leg is VACUOUS by construction (stated, never testable); the observable case is the FILTERED NON-STRING key, whose refs are unresolved and fire HERE (the typed catalog factually cannot carry the key — two true findings for the one authoring defect, deliberately; the discriminating fixture is PROBE-CB2's class: a bare `true:` entry beside the grammar-valid ref `"true"`): EVERY issued ref — each role/step `promptConcernRefs` member and each gate `contextBlockRefs` member that PASSED its C4/C6 member-shape lane (a shape-failing member is excluded here; a beyond-first duplicate occurrence fails C8(e) and is excluded here — the FIRST occurrence carries resolution) — must RESOLVE TO AN ENTRY (DECIDED HERE at the 2026-08-01 reopen, the ENTRY-BELTED grain): the ref must be an OWN key of the catalog AND the value at that key must BE AN ENTRY AS C3 DEFINES ONE — by REFERENCE, never restated here, so ONE definition of "entry" governs both channels (a fixed-keyset `{ body }` map whose `body` is a nonempty string; an empty body, an extra key, or a non-map value all fail the belt exactly as they fail C3). Key existence alone is not resolution — a key whose value is not a C3 entry leaves its refs UNRESOLVED and fires this lane per site. What the belt makes unnecessary, stated so no reader reintroduces it: NO catalog-container predicate and NO array special case is owed beside it — an array's own grammar-passing `length` (whose value is a NUMBER) and a wrong-valued `{ <id>: 42 }` alike fail the belt — only the NULL/UNDEFINED guard the own-property read itself requires (`Object.hasOwn(null, …)` and `Object.hasOwn(undefined, …)` throw; a PRIMITIVE catalog does not throw — `Object.hasOwn("abc", "length")` is true — and needs no guard because the belt refuses its values anyway). CHANNEL CONSEQUENCE, both directions: on the DIRECT-CONSTRUCTION channel this is the whole of the catalog's shape discipline at resolution time (no walk lane runs there); on the FILE channel the belt runs just the same (the walk's build slot materializes entry values whatever their shape — the non-cascade culture), so a malformed entry NAMED BY A REF draws BOTH C3's entry finding and this lane's per-site finding — two independent, separately-fixable facts, the multi-true-finding pattern this chapter already ratifies at C2's filtered non-string key. The admit/refuse OUTCOME is therefore channel-symmetric for every entry shape; only the finding SET differs, and only by the lanes C19 places in the walk. An unresolved ref is the `unresolved_context_block_ref` DEFINITION ISSUE (the EXISTING ch11-model-sync name; no registry rejection name is touched), carried on the named-lane form: `code: "unresolved_context_block_ref"` present on exactly this lane (the ch11-P2a A9 carrier), path = the REF SITE (`…promptConcernRefs[<i>]` / `…contextBlockRefs[<j>]`), one finding PER unresolved site over the resolution set, ALL sites ACCUMULATED in one result — a projection of the standing ch8-C21 validate-stage culture (the model unit's first-issue return is the semantic floor). Refs issued with NO RESOLVING ENTRY fire this lane per site — an absent catalog, a present-but-empty catalog, and a malformed catalog (C1's single container finding beside these) alike. This row is the `l2b/refs-validated-at-definition-load` invariant's home (disposition `test`). Containment, both legs stated: the validated ref set ⊇ the render's read set (equality reachable on a single-step template; C9 reads the dispatched step's role, its own step, and its authorized gates), and every dispatch site reads a store-admitted template — together these are why C9's render-time miss is integrity drift, not a business state. |
| C8 | The empty/absent/edge matrix: (a) absent catalog + zero refs → legal, zero-impact; (b) catalog present + zero refs → legal; (c) an UNREFERENCED catalog entry is a validation finding at its path (DECIDED HERE, strict start; like (e), a hygiene lane above the model's text — the unit checks ref→catalog only — the ch8-C16 declared==used shape: strict-start is the ONE direction later relaxable additively, while permissive-start could be tightened only as a breaking format change; the shipped C14 entry is referenced by construction). The REFERENCE SET is the RAW authored member strings across all well-formed ref lists — grammar-violating and duplicate members COUNT as references (they evidence intent; their own lanes carry the defect), and the check is SKIPPED entirely when any ref-position container lane fired or the catalog container itself failed (the template-wide grain is a SOUNDNESS rule, not merely anti-cascade: the reference set is a template-wide union, so a narrower skip would emit phantom findings); NO key is excluded from this check (DECIDED HERE at the 2026-08-01 reopen — the former C2-failed-key carve-out is DELETED on both of its sides, here and at C2's edge): the check runs on EVERY channel, and its DOMAIN is the catalog's own ENUMERABLE keys — ALL of them, with NO value condition (DECIDED HERE at the same reopen): a key whose value is not a C3 entry is still a declared-and-unused key and draws this finding, because a value condition would reinstate an unstated exception of exactly the kind deleted above, and its justification fails on the direct-construction channel for the same reason. ENUMERATION GUARD: a cast-forged null/undefined catalog is not enumerated (`Object.keys(null)` throws) and yields nothing of this lane — residual named rather than left implicit: such a catalog carrying ZERO refs ADMITS, and its admitted value is then IDENTICAL to the absent-catalog state of (a) — not merely similar: C17's rebuild normalizes a nullish catalog to `{}` exactly as it normalizes an absent one (reopened 2026-08-02). That identity is DERIVED from C17's rule and is NOT measurable until the rebuild exists; its NAMED MEASURING CARRIER is the normalization acceptance family's EMPTY-DIRECTION member, which proves the admitted form by FULL-VALUE equality — the ABSENT fixture and EVERY non-record fixture (present-null, a scalar, an empty string, an empty array) must yield BYTE-IDENTICAL admitted values — audited by the build-close arm's mandatory sensitivity pass against the built test body. What IS measured, 2026-08-02, is the defect the normalization closes: today's `admitTemplate` admits `contextBlocks: null` and carries the `null` onto the admitted value — `{"ok":true,"contextBlocks":null}` — which this row's own C17 typed surface forbids. A PRIMITIVE catalog enumerates by its own rules, NOT to nothing — MEASURED 2026-08-01: `Object.keys(42)`, `Object.keys(true)` and `Object.keys("")` are empty while `Object.keys("abc")` is `["0", "1", "2"]` — so a nonempty-string forgery draws this lane at each index key and REFUSES, the fail-closed direction, needing no rule of its own. DOMAIN ASYMMETRY, named once here because it is load-bearing: C7 resolves over OWN keys at any enumerability while this lane enumerates own ENUMERABLE keys, so a cast-forged NON-ENUMERABLE own entry can resolve a ref yet is never audited here — a residual bounded to that cast class, accepted rather than hidden. Rationale, recorded because the carve-out had one: the exception did not SAVE the second complaint, it deferred it by one run (fix the key, and the unreferenced finding appears next time), while costing a cross-lane coupling — the unreferenced check had to know whether the key lane had fired, which is unanswerable on the direct-construction channel where that lane does not run. CONSEQUENCE MATRIX, stated so the two channels are read correctly: FILE channel, ungrammatical key, no ref naming it → TWO findings (C2's grammar finding + this one); DIRECT channel, same catalog → ONE finding (this one — C2 is file-channel per C19); EITHER channel, ungrammatical key WITH a matching RAW ref member → NO unreferenced finding, because the reference set is raw member strings and a grammar-violating member still COUNTS as a reference (that member carries its own C4/C6 finding); EITHER channel, a key whose VALUE is not a C3 entry and which nothing references → this lane fires on it like any other (the domain has no value condition), and where a ref DOES name it C7's belt fires instead. The admit/refuse OUTCOME is channel-symmetric throughout; only the finding SET differs, and only by the lanes C19 places in the walk. (d) an EMPTY ref list → legal, renders nothing; (e) a DUPLICATE id within ONE ref list is a validation finding PER repeat occurrence — `[a, a, a]` yields findings at index 1 AND index 2 (the ch11-C40 per-occurrence precedent; the `seen` set is fed UNCONDITIONALLY by raw members under SameValueZero — the realized Set semantics — so a shape-failing duplicate co-fires its shape lane and this lane on the same index, per-defect-class findings), each repeat excluded from C7's resolution set (DECIDED HERE — an admission hygiene lane above the model's text, the ch11-C15 hardening precedent; the DESIGNED repeat is the cross-source one, C9's dedup); (f) `contextBlocks: {}` (present-empty map) and an ABSENT catalog behave identically under refs: legal with zero refs; with refs issued, C7 fires per site (no resolving entry); (g) the fully-valid populated case — catalog + resolving refs — admits CLEAN with zero findings: the family's success negative, P1-driven, its member set including the digit-bearing kebab id (C2's named success member). |
| C9 | The render (`assemble_context_blocks`, model-verbatim with ONE order decision and ONE iteration-domain restatement — the unit loops `authorized_ops` then `gates_for`; this row loops the gates record filtered by C10, membership-equivalent via ch11-C2, the argument carried at C10): source order IS render order — role refs, then step refs, then gate refs; within each source, list order; the gate leg iterates the admitted step's `gates` RECORD in its OWN key order (the surface the refs live on — the invariant's "declaration order within each" read on the gate source itself), each event's pipeline in binding-list order (ch11-C3: authored order IS pipeline order), each binding's `contextBlockRefs` in list order, filtered by the C10 predicate. RECORD KEY ORDER, not "authored declaration order", deliberately: the admitted form is a JS record; integer-like event keys authored in QUOTED form hoist to the front AND re-sort ascending among themselves (PROBE-CB3; an unquoted `2:` is rejected upstream as a non-string key); record enumeration order is the deterministic, substrate-true basis. Two alternatives considered and REJECTED (DECIDED HERE): the `transitions`-record order (a different surface that does not carry the refs; `availableOps` continues to publish ITS order independently) and a canonical SORTED key order (deterministic and hoist-immune, but it would divorce render order from authored reading sequence — the invariant's own gloss is "order is reading sequence"). Construction-order dependency DECLARED: the admitted record's key order is the authored order modulo quoted-integer hoisting because admission REBUILDS the gates record over the authored keys — an admission refactor that changes that construction order is a C13-visible contract change, not a free refactor. Dedup: a ref reached again renders ONCE, first-seen position; `provenance.sources[]` appends EVERY emitter in encounter order — this row is the `l2b/dedup-with-retained-provenance` invariant's home (disposition `test`). Bodies resolve from the admitted catalog ONLY (post-admission a miss cannot exist — C7's two containment legs; a miss at render time is kernel-integrity drift, throw, never a skip — the standing dispatch integrity culture). `HANDLE`'s verdict path is untouched. |
| C10 | The gate-ref predicate: a binding's blocks render iff its transition ∈ available_ops ∩ L1 capability (model-verbatim; the `l2b/authority-scoped-gate-blocks` invariant, disposition `test`; the ch11 authority logic REUSED — no fresh authority logic). Honest per-leg accounting: the MEMBERSHIP leg (∈ available_ops) holds BY ADMISSION on every admitted template — ch11-C2 makes every gates key a transition of its step, so the leg can never exclude anything post-admission; its test carrier is therefore the render's ITERATION-DOMAIN negative (blocks come only from the DISPATCHED step's gates — the golden trace's cross-role leg: the reviewer's rule is absent from the implementer's packet). The L1 NARROWING leg carries the MANDATORY discriminating negative via a directly-constructed `capabilityProfile` — the live type-level channel (narrowing profiles are already test-constructed on the kernel seam today; only FILE authoring of profiles is the deferred Absent): a profile narrowing the dispatched role's current step below its transitions must NOT render that gate's block even though the event ∈ availableOps — the lane that reds an implementation dropping the `∩ capability` term. Under the DEFAULT derivation the intersection is a no-op — which is exactly why the explicit-profile negative is mandatory, never waived (the green-but-blind class). FORWARD SCOPE: the EC layer's reprint replaces `available_ops` with `offerable_ops` — the membership leg's by-admission status is PRE-EC, and re-examining it belongs to the §1.3 EC candidate's chapter. |
| C11 | The packet field: `ContextPacket` gains `contextBlocks` — camelCase of the model's packet-level `context_blocks` (the same rename culture, stated) — ALWAYS present (possibly empty; model-verbatim — the `dispatch_intent` reprint carries the field unconditionally — with the ch12-P2 E1 always-present precedent behind it), an ORDERED list of `{ id, body, provenance: { sources } }`. A source member is `{ source: "role_config" }` \| `{ source: "step_config" }` \| `{ source: "gate_binding", step, event }` — the TAGGED shape and the `source` field are the MODEL UNIT'S OWN form (the unit's members are tagged `{ source }` maps, the gate member additionally carrying `at`; the domain view's bare-token spelling is its compressed notation); the token VALUES are model-verbatim (the realized discriminant-value culture keeps model snake_case tokens: `runner_error`, `kickoff_pending`); DECIDED HERE is only the `at: (step, event)` pair's flattening to sibling `step`/`event` fields and the string-literal quoting (a nested `at: {step, event}` map was the alternative — rejected for canonical-JSON flatness; stated so neither side silently forks). Two bindings on one (step, event) each carrying the same ref yield two IDENTICAL source members (no source-level dedup — model-verbatim append; stated as the decided observable, P2-owned). The list order is the C9 render order and travels VERBATIM through the existing canonical `packet.json` channel (the ch9 H2 surface — object keys canonicalize sorted, array order is semantic and preserved). The always-present field ripples every full-packet deep-equal fixture in the suite — a NAMED family spanning the kernel/testkit/runner/CLI suites, member enumeration P2's (R-ALTITUDE-LINE). |
| C12 | Communication-only boundary, byte-scope precise: the packet FIELD `contextBlocks` (and the catalog behind it) never enters gate evaluation, transition verdicts, round arithmetic, or any kernel DECISION surface; the definition-static lanes (C1–C8) are the stated exception — catalog content decides ADMISSION findings, never a runtime verdict. The canonical deletion experiment: removing a catalog entry WITH its refs in the same edit leaves every verdict, round, and transition outcome identical; the bytes that change are the packet artifact (`packet.json` / the `contextBlocks` field) AND — exactly where the removed refs rode the two agentConfig positions — the commit-time `issued_agent_config` provenance rows (ch12-C10's surface: refs are config DATA and were always recorded there; blocks themselves never enter any committed row). The GATE-source variant is committed-row byte-identical (ch11-C27 records `{uses, verdict, reason, message, evidence_refs}` only). Spawn-side, TWO carriers reach a real process and both are closed: the packet artifact carries the refs as data (this row's packet-byte scope), and the argv-INTERPRETATION path over `effectiveAgentConfig` is closed by ch9-C18 (`*_refs` left uninterpreted — aggregate-noted in Context). This row is the `l2b/communication-only` invariant's home (disposition `review` — the owning packet carries its `REV-*` line against THIS precise scope, never the wholesale form). |
| C13 | Determinism: the render is a PURE function of (instance, template, step) — no clock, no randomness, no store read beyond its inputs; same committed instance state + same admitted template ⇒ byte-identical `contextBlocks` (the `l2b/deterministic-ordered-render` invariant, disposition `test`; carrier: the P2 golden trace plus a dedicated same-inputs double-render equality lane, P2-owned). |
| C14 | The shipped-catalog presence rule: the canonical `v3/templates/local-pair-v0@1.yaml` gains THREE insertions — a root `contextBlocks` catalog carrying the entry id `emit-envelope`, and a NEW `defaultAgentConfig: { promptConcernRefs: [emit-envelope] }` subtree under EACH of the two roles (an untruncated draft-time sweep found the file authoring neither key; this makes the canonical file the first agentConfig-family authoring in an authored template FILE — the l0c TS fixture authors the family in-test today — DECIDED HERE: role-level on BOTH roles, because every actor emits and the block is role-symmetric). The entry's PROSE is packet-time authored (the interim carrier of the emit-envelope knowledge — `v1-prompt-parity-audit.md` §5; its retirement is bound into the DoD of the chapter that takes the §1.3 EC candidate). Ripple, the named families (member enumeration the owning packet's, R-ALTITUDE-LINE): (i) the ch8-P2 equality pin FOLLOWS the file in the same commit (fixture + file move together, the pin test unchanged — the ch11-P4 Y1/Y2 precedent; both pin sides pass through admission, so C17's normalized fields appear symmetrically); (ii) the `effectiveAgentConfig` assertions and full-packet deep-equals — spanning the CLI/journey suites AND the kernel/testkit deep-equal fixtures (C11's family, one sweep) — re-pin, P2; (iii) the COMMITTED-provenance family: `issued_agent_config` assertions re-pin to the new resolved values (the C12-named byte surface — the shared fixture flows through the ch12-C8 cascade into every committed transition); MEMBERSHIP is by `fixtureTemplate`/canonical-file CONSUMPTION, not by directory (the floor and testkit suites, the runner delivery-loop suite, and the root CT files are in; a suite building its own template is out) — P2; (iv) the l0c golden-trace re-pin (a ch12 trace: BOTH fixture sites move per C4's disposition and gain the catalog entry) — P2; (v) consumers of the keys' former ABSENCE are swept by VALUE and by key (R-ABSENCE-CONSUMERS). |
| C15 | Catalog-authoring caveat (the plan §13.3 REQUIRED row; aim, not enforcement): a block body that states a gate's configured VALUE can go stale against that gate, and NOTHING detects it — C7 proves a ref RESOLVES, never that prose matches config; the missing capabilities are the two named L2b Absents (`computed-templated-bodies`, `semantic-parity-check`), owned by a later chapter. The shipped file carries a sibling COMMENT beside the catalog stating exactly this (plan §13.1 item 4 — placed where the risk is CREATED: the author of the NEXT entry). This chapter ships no gate-describing body, so the risk is latent here by construction. |
| C16 | The reopen-act carrier (the ch9-C27/ch12-C26 precedent — the ratification act's own cross-contract duties, normative; one GO, TWO named acts: this draft's ratification + ONE ch11 reopen act over three named sites — DECIDED HERE, the act's composition): the act executes the ch11-C4 + ch11-C30 + C41-parenthetical reopens per the Context's prepared texts and itemized map duties (C4's keyset-parenthetical update included). EXECUTABLE ORDER, four commits (the ch9 act's git-verified precedent): this draft's CONTENT commit first (carrying the final rows AND all SIX draft-round plan edits — the §13.4 order line, the §13.4 P2-row l0c re-pin clause, the §13.5 registry-flip DoD clause, the §13.5(e) item with its fallback, the §13.5(f) integer-key-ban boundary item, and the §1.3 carried-item (3) system-vs-workflow sub-question (the last two the owner's ratification-round additions) — R-ALIGNED-UP; plus the FH-3 future-hardening record (the ratification round's parse-don't-validate question, `future-hardening.md`)) → ch11 reopen commit 1 (the three site edits + status `reopened` + `realized_map` removed) → ch11 reopen commit 2 (the updated map restored per the ITEMIZED duties — C41's entry gaining the file's minimal reopen annotation, the :252/:264 convention; a FOURTH reopen-record prose BLOCK in ch11's Context — the file's own convention, INCLUDING its `Reopen-delta new-decision rows: 0` line; the close-metrics increment recorded as a NEW dated update line "3 → 4" — the existing dated 2026-07-23 line stays untouched, the count is cumulative with dated increments, never a silent edit of a dated line; the new ratification block whose recorded `commit` is reopen commit 1's hash, FULL 40-hex (the file's current block form); status back to `realized`) → the ch13 draft's own ratifying commit LAST, closing the act (its ratification block records the CONTENT commit's hash — template §4). Re-ratification is permanently human (one GO covers the act's whole payload — named bytes). Every commit stays green on the draft-FORM rules; the packet-anchor surface into ch11 is loud-red for the window BY DESIGN, and the zero-reopened gate's THREE gate points (packet approve, chapter close, process flips — README §5.5's canonical inventory; the check-docs wrapper binds the flag on its approve/close modes) all sit OUTSIDE the act, so none may land between the ch11 pair. Plan §13.4's order line carries the act's annotation (aligned at the ch13 draft round). |
| C17 | The admitted-form normalization (the ch11-C38/C39 admission-normalized precedent) — the `type/schema` carriers: on all-or-nothing admission success, the rebuild MATERIALIZES the validated context surfaces into dedicated normalized fields on the admitted value — the catalog as `contextBlocks: Readonly<Record<BlockId, { body: string }>>` in place IFF THE AUTHORED VALUE IS A RECORD — a non-null, non-array object, the predicate DEFINED HERE for this rebuild rule — and `{}` OTHERWISE: absent, present-null, present-undefined, a scalar, an empty string, an empty array, ANY non-record value that reached the rebuild normalizes to `{}` (DECIDED HERE at the 2026-08-02 CLASS-WIDTH reopen, which GENERALIZES the nullish clause it replaces — that instance-width form left the rest of its own class carried, MEASURED 2026-08-02 through the live `admitTemplate`: `null`, `42`, `true`, `""` and `[]` each admit with zero refs and are carried onto the admitted value unchanged, receipts in the reopen record). NO TENSION WITH C7, stated so the two rows are never read against each other: C7's "no catalog-container predicate is owed" governs the RESOLUTION lane, where the entry belt makes such a predicate unnecessary — the predicate defined here serves ONLY this rebuild's normalize-or-carry decision, creates no lane, emits no finding, and moves no template's admit/refuse outcome. Stated at class width deliberately: this row's typed surface is then true WITHOUT exception on every admitted template, and the render — which C9/C17 forbid to revalidate or dig through `unknown` — never meets a non-record. The sibling precedent is the one the nullish form already cited (`activation`, `admit.ts:444`), widened from `??` to the predicate. A NONEMPTY array or string never reaches this rule: A4's domain fires at its index keys and the template is refused before any rebuild.), each role entry's and each step's validated ref list as a SIBLING field `promptConcernRefs: readonly BlockId[]` beside (never inside) the raw agentConfig map (absent map, absent key, or empty list ⇒ `[]`), and each admitted gate binding's `contextBlockRefs: readonly BlockId[]` likewise (⇒ `[]`). TYPE SHAPE per the standing dead-belt precedent (`advancesRound?`): the fields are OPTIONAL (`?`) on the shared raw types — `AdmittedTemplate` is a brand, not a structural type — with the always-present guarantee holding at the VALUE level on every admitted value; required fields would break every hand-built raw fixture and are REJECTED (DECIDED HERE — the optionality grain). The AUTHORED keysets do NOT grow: `ROLES_ENTRY_KEYS` stays `{defaultActor, defaultAgentConfig}` and the step keyset is untouched — the normalized fields are admission-PRODUCED, never authorable (an authored `promptConcernRefs` at the roles-entry or step level is an unknown-key finding, unchanged; the authoring position is C4's, inside agentConfig). THREE named consequences, all new P1 work: (1) admission REBUILDS `roles` (today only `steps` is rebuilt); (2) the role-side normalized list is the first normalization whose SOURCE is nested (inside `defaultAgentConfig`) rather than in place; (3) the admitted gate binding is constructed FRESH with exactly `{uses, config}` today — the rebuild gains the `contextBlockRefs` field, or every gate-sourced block would silently vanish on a fully-admitted template. The RAW agentConfig maps keep the authored key as cascade-read DATA (C5 reads THAT); at the two template positions the same key is admission-VALIDATED (C4) — "opaque" describes only the runOverrides position; the RENDER reads ONLY the normalized fields (no `unknown`-digging, no re-validation at dispatch — the ch11-C22 class); the definition-static lanes read the source form and the built template (C19), never these fields (they do not exist yet at checking time). The `l2b/single-body-source` invariant's `type/schema` disposition is carried HERE: body text has exactly one typed home (the catalog's `{ body }`), and every ref position's type is id-only. RIPPLE, two named families (owner P1): the admitted-form shape-delta lane (the "what admission adds" deep-equal gains the new materialized fields beside `activation`/`runtimeContext`/`advancesRound`), and the THREE `l2b/*` domain-registry rows flip `pending` → realized WITH THEIR REALIZING PACKETS — the catalog and `ContextBlockRef` rows at P1 (their types land here; `BlockId` and the catalog record type are the realized-form names), the `ContextBlock` row at P2 (the packet-rendered value) — the registry test asserts key sets, not dispositions, so the flip is a NAMED duty precisely because no gate reds on its omission (the C16 token-blind-lint lesson applied to our own manifest). |
| C18 | The CLI surface: NO new verbs and NO new flags — the chapter's definition-static laneS (C19's inventory) ride the existing channels unchanged: dev `validate` surfaces them through the ch8-C31 `{stage, findings}` machine shape (stage `validate`; C7's lane carries its `code` end-to-end into the CLI doc — the one cross-boundary hop, DRIVEN by a P1 lane asserting the `code` field's VALUE (equality with `unresolved_context_block_ref`, never presence alone) in the CLI JSON, plus the exclusivity negative (no other CH13 lane carries a `code`; ch11's A9 named lanes keep theirs — the doc-level assert binds a ch13-only fixture)), and the store/create paths through their standing typed-error docs (the ch11-C28 analog, stated so P1 neither mints a surface nor re-derives its absence). |
| C19 | The lane inventory + realization split (the ch11-C40 REALIZATION-SPLIT precedent, applied at chapter grain): the chapter's definition-static lanes are exactly — C1's container lane, C2's key lane, C3's three entry lanes (keyset / body / container), C4's and C6's container + member-shape lanes, C7's resolution lane (the ONE code-carrying lane), C8(c)'s unreferenced-entry lane, and C8(e)'s duplicate lane. SPLIT: the CATALOG-SIDE lanes (C1 container, C2 key, C3's three) live in the WALK — the Map-form source traversal where non-string keys are visible and the four sibling key lanes already live; the REF-SIDE and VALUE-LEVEL lanes (C4/C6 containers + member shapes, C7 resolution, C8(c), C8(e)) live in the ADMISSION RUNG over the built template. The ref-side containers/members sit rung-side DELIBERATELY, diverging from C40's source-form classification for its typed input (stated, two reasons): the refs live inside the format-OPEN agentConfig, where member primitiveness is NOT type-foreclosed on the direct-construction channel — rung placement covers that channel too; and C8(c)'s skip-on-container-failure signal becomes INTRA-RUNG (a walk→rung findings signal does not exist in the pipeline interface and is not minted). CHANNEL SCOPE, stated symmetrically: the walk lanes are FILE-CHANNEL. On the direct-construction channel the ratified catalog type forecloses NOTHING that a cast does not reach — MEASURED 2026-08-01: `tsc --strict` rejects an array, a wrong-valued entry object, and a class instance alike against C17's `Readonly<Record<BlockId, { body: string }>>`, so no forgery class is type-endorsed and none is type-prevented — while an ungrammatical KEY needs no cast at all (`BlockId` is an UNBRANDED string alias, so any string is a legal key). Entry-shape discipline there is therefore NOT the testkit author's: C7's belt checks it at resolution on BOTH channels (reopened 2026-08-01). What remains the testkit author's is key GRAMMAR alone — and an ungrammatical key still FAILS there, by C8(c)'s unreferenced check when nothing names it, or by C4/C6's member-shape lane when a raw ref does; only the DIAGNOSIS is weaker there, never the outcome (step-id grammar is walk-only the same way). The OBSERVABLE is unchanged either way: both rungs' findings JOIN in the ONE `{stage: "validate", findings}` result (the standing cross-rung accumulation — the realized ch11-P4 F7 form), so C7's all-sites-accumulated promise holds across the split. Named build surfaces (P1): the walk's legal-root-keys set gains `contextBlocks`; the walk gains a `contextBlocks` build slot (the C2 hand-off: non-string keys filtered, grammar-failing string keys kept); and the admission rung's gate-binding key allowlist (today hard-coded `uses`/`config`) grows `contextBlockRefs`. |


## Ratification history (empty at `draft` — blocks are appended by the lifecycle acts)

```json
{"ratification": {"date": "2026-07-26", "arms": ["none external — the internal five-lens Opus panel (4 full + 1 targeted round + top-level close CLEAN @ 20a3c3d2); the codex arm consciously waived by the owner at GO (2026-07-26)"], "commit": "16a668b08dfe6e9e36076573c226503113ea8a16"}}
```

```json
{"ratification": {"date": "2026-08-01", "arms": ["agent-invoked codex arm (pin gpt-5.6-sol/high), ch13-P1 gate-1 re-check #3 finding 4 — the arm read the PACKET's bytes and located the defect in C1; no arm reviewed this reopen's own bytes"], "commit": "616f4aa6299d8ece3dd1c20e169c83960540246b"}}
```

```json
{"ratification": {"date": "2026-08-01", "arms": ["ch13-P1 panel round 7 — five fresh-context Opus lenses on the packet, whose lens-1/lens-2 executed probes located the region and falsified C19's type-foreclosure premise; agent-invoked codex arm gate-1 re-check #4 (pin gpt-5.6-sol/high) on the same packet bytes; a draft-scoped adversarial pass on the DRAFTED rows returned 3 P1 + 4 lesser findings, all folded before this act. No arm reviewed the FINAL reopen bytes: the last defect in them — a false measured claim, `Object.keys(\"abc\")` is [\"0\",\"1\",\"2\"] and not empty — was caught by the human at a NO-GO and corrected before the GO"], "commit": "3c6ed1815efe4266f71f0a6e6ae4a34028f8fcee"}}
```

```json
{"ratification": {"date": "2026-08-02", "arms": ["agent-invoked codex arm, ch13-P1 gate-1 on the approve-ready bytes (pin gpt-5.6-sol/high, 880s, guards clean) — it re-executed all seven declared premises, the untruncated ripple sweeps, 378 tests and v3:typecheck, and its P1 located THIS defect by probe; no arm reviewed this reopen's own bytes, and the DERIVED identity it introduces is by construction unverifiable until the rebuild exists (its measuring carrier is named in C8(c))"], "commit": "a0cf73b51bee8a65d6c4155d0689ec4f9a68e340"}}
```

```json
{"ratification": {"date": "2026-08-02", "arms": ["agent-invoked codex arm, ch13-P1 gate-1 re-check on the prior approve-ready bytes (pin gpt-5.6-sol/high, 550s, guards clean) — it re-executed every declared premise, the untruncated ripple sweeps, v3:typecheck, v3:adr-check and the full v3:test (71 files, 1830 tests green), and its P1 measured the surviving class members this act normalizes; no arm reviewed this reopen's own bytes, and the post-normalization identity stays DERIVED with its measuring carrier named in C8(c)"], "commit": "8360510eab21093f13e6cba471c814a9052ba077"}}
```

## Realized map (empty until chapter close)

## Supersede record

```json
{"superseded": {"date": "2026-08-05", "oracle_branch": "ch13-prose-line", "oracle_tip": "bb313036c7e50ad2625f0669f76a90bf317255e3", "plan": "v3/implementation/ch13-rederivation-plan.md"}}
```
