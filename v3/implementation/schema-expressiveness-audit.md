# Schema expressiveness audit — the definition surface, on paper

Phase P3, arc A (the ch13 re-derivation plan §3). This document answers
ONE question with an enumeration, not an impression: **can the ratified
structural rules of the four format surfaces be re-expressed as declared
schema, and what is left over?** No engine code exists or is proposed
here; every declaration below is paper.

Status: DRAFT for the user's go (ARC A stop 1). The ADR (arc B) is
authored only after this document's verdicts are accepted.

## 0. Method, and what this document may not do

**Enumeration, never sampling.** Every source set below is a CLOSED
list, derived at write time from a repo surface with a recorded command
(§6 receipts). No count in this file is recalled from a conversation.

**The verification threat model** (plan §6, threat-model-first — the
sentence the arm charter carries): *the audit's verification defends
against OMISSION (a source rule missing from the table) and INVENTION (a
table row without a source); nothing else.* Findings outside that
sentence are recorded as carried-scope, never folded.

**Classification classes.** Every enumerated rule carries exactly one:

| Class | Meaning |
|---|---|
| **S** | structural — every definition-validation obligation of the rule is expressible in the declaration vocabulary (§2) |
| **Sem** | semantic — the rule's definition-stage obligation is NOT expressible as a declaration; it stays a named prose/code lane (§4) |
| **H** | hybrid — the rule carries both an expressible and an inexpressible obligation |
| **N** | non-lane — the rule imposes NO definition-validation obligation (it legislates runtime, CLI, store, port, module, wire or process) |

The kickoff asked for structural | semantic | hybrid. Class **N** is
added deliberately and is NOT a silent third door: 55 of the 125 C-rows
legislate surfaces the definition validator never touches (kernel
lanes, wire shapes, module homes, growth stances). Forcing them into
the three classes would have made the coverage claim unreadable. Every
N row carries its one-line reason in the table, so the class is
auditable row by row.

**The vocabulary-admission test (the falsifiability instrument).** A
construct enters the declaration vocabulary only if **two or more
INDEPENDENT rules use it**. A construct serving exactly one rule is
code wearing a declaration's costume — that rule goes to the residual
instead, and the single-use construct is recorded as a flagged
borderline (§2.4). This test is what makes the direction falsifiable
rather than merely plausible.

**What this document does NOT establish.** Every parity claim here is
DERIVED (plan §6: a derived claim names its measurer). The named
measurer for all of them is the **build's parity gate** — the existing
fixture corpus replayed against a future engine, verdict-, path- and
message-identical or an approved delta list. Until that gate runs, a
`P` in the parity column means *"reproducible by construction from the
declaration + its message template"*, never *"measured identical"*.

## 1. The requirement inventory (three sources, closed lists)

### 1.1 Source 1 — the ratified contract rows

Derived: `grep -cE '^\| C[0-9]+ \|' <file>` over the four
format-surface contracts (§6 R1).

| Contract | Status | Rows |
|---|---|---|
| `ch8-template-format-contract.md` | realized | 38 (C1–C38) |
| `ch11-gate-format-contract.md` | realized | 41 (C1–C41) |
| `ch12-runtime-core-contract.md` | realized | 27 (C1–C27) |
| `ch13-context-block-contract.md` | **superseded** (rows frozen, decisions live) | 19 (C1–C19) |
| **Total** | | **125** |

The ch13 contract is superseded, not void: its rows are the ratified
decision record (plan §3's amendment of 2026-08-05). They are consulted
as a decision source and cited by row id; no sentence is copied.

### 1.2 Source 2 — the checks the implementation performs

Enumerated by reading every check site (§3.5's table carries the
inventory with line anchors). The count below is **finding-EMIT SITES**,
chosen because it is mechanically derivable — `findings.push` plus the
early `return … findings: [...]` sites, and `return fail(` for the
pipeline (receipt R7). A named lane may own several emit sites (the
process config's `command` lane has two), so this number is an upper
bound on lanes and a floor on the things a parity gate must reproduce.

| Site | Role | Emit sites |
|---|---|---|
| `definition/load.ts` | the staged pipeline: read → parse → resolve → validate | 8 |
| `definition/validate.ts` | the FILE-channel source-form walk | 51 |
| `definition/admit.ts` | the admission rung (both channels) | 19 |
| `gates/threshold.ts` | delegated config schema, `declarative.threshold` | 9 |
| `gates/previousReviewerVerdict.ts` | delegated config schema, `pairflow.previous_reviewer_verdict` | 4 |
| `gates/process.ts` | delegated config schema, `external.process` (17 NAMED lanes a–q) | 21 |
| **Total** | | **112** |

The gate-config validators are IN this source set (disposition
confirmed by the general, 2026-08-05): they run inside admission, on
the one definition channel, and their findings are definition issues in
the `{path, message, code?}` form. Excluding them would leave
ch11-C10/C11/C13–C17 without an implementation side.

**One relayed number left UNRECONCILED, deliberately** (the e7b94ed5
citation rule; the P1 precedent of the "17 live packets" count): the
confirming block reported "7 files carry `validateAndNormalizeConfig`".
The measurement here (receipt R5) returns 13 paths, of which exactly 3
PRODUCE a config schema (`gates/threshold.ts`,
`gates/previousReviewerVerdict.ts`, `gates/process.ts`) — the remainder
are the type homes (`ports/gate.ts`, `domain/gate.ts`), the caller
(`definition/admit.ts`), a unit-map entry, and six test files. Which
form the "7" counted is not reconstructable from the block, so it is
recorded rather than restated. Nothing in this audit rests on it: the
inventory uses the 3 producing files, named.

**The issue-code closed list.** Derived: `grep -rn 'code: "' v3/src`
plus the two `gates/process.ts` constants (§6 R2). FOUR codes are
implemented; ONE more is ratified-but-unbuilt:

| Code | Emitted at | Owning row |
|---|---|---|
| `gate_evaluator_unavailable` | `admit.ts:244` | ch11-C8 / C21 |
| `runtime_context_required_for_process_gate` | `admit.ts:350` | ch11-C19 → ch12-C5 |
| `invalid_process_gate_config` | `gates/process.ts` (lanes d,e,h,i,k,l,p) | ch11-C21 |
| `gate_config_not_supported` | `gates/process.ts` (lane o) | ch11-C16 |
| `unresolved_context_block_ref` | — **not implemented** | ch13-C7 |

Every other finding on the definition channel is UNCODED (`{path,
message}` only) — the ch8-C21 form.

### 1.3 Source 3 — defined, not yet implemented

Boundary ratified by the user, 2026-08-05 (option A): the source set is
the **ch13 context surface** — plan §13.1's in-scope format items,
detailed at row grain by the superseded ch13 contract. The EC
emit-contract surface is a NAMED extension point in the ADR's prose and
takes no table row (its 11 `pending` `emit-contract-pseudocode/*` units
carry no ratified format grammar; deriving rows from them would be the
unverifiable-at-write defect family).

Derivation of the set (§6 R3): plan.md carries chapter sections for
1–9, 11, 12, 13; the §1.3 map marks exactly one of them `planned` with
a format surface — ch13. (ch10 is `planned` with neither a section nor
a format surface.)

Measured, not assumed: `grep -rl "contextBlocks\|promptConcernRefs\|
contextBlockRefs" v3/src` returns **zero files**, and the same grep over
`v3/templates/` returns nothing. The three ch13 format keys are
ratified with zero code — the audit's live "future surface" test.

Elements named-but-unbuilt INSIDE realized chapters (ch11-C41's
per-transition override grammar, ch8-C24's reserved `kind`, ch8-C25's
empty removed-key registry, ch12-C23's Absents) are ALREADY source-1
rows. They add no table row; their unbuilt state is a cell value, not a
separate source.

### 1.4 Inventory totals

125 contract rows (§1.1) · 112 implemented finding-emit sites (§1.2) · 5 issue codes
(4 live, 1 ratified-unbuilt) · 19 of the 125 rows defined with zero code
(§1.3).

## 2. The proposed declaration form

### 2.1 Shape

One **surface** declaration per validated document family. It has two
parts: a SUBSTRATE block (how bytes become a value graph) and a NODE
tree (what the value graph must be). One engine consumes it; the same
declaration runs on the file channel and the direct-construction
channel, with the source-form attributes inert on the latter (§2.5).

### 2.2 The vocabulary (closed list, each entry with its user count)

| # | Construct | Meaning | Users |
|---|---|---|---|
| 1 | `kind:` map.fixed \| map.open \| list \| string \| integer \| enum \| union \| raw | the node's container/scalar class | all |
| 2 | `required` / `optional` | keyset membership obligation | many |
| 3 | `nonempty` | on string, list, map | 6 |
| 4 | `grammar: /re/` | scalar value grammar | 9 |
| 5 | `keyGrammar: /re/` + `keyLaneAt: container\|segment` | open-map key class + the finding's path grain | 5 |
| 6 | `sourceForm: plainDecimalInteger` | the raw-source ladder (alias-free, anchor-free, tag-free, `^[1-9][0-9]*$`) | 3 |
| 7 | `resolvedForm: safeInteger, min:` | the value-side integer belt | 4 |
| 8 | `enum: [...]` (with optional per-member `code:`) | allowlist | 6 |
| 9 | `default:` | materialized ONCE at admission | 6 |
| 10 | `removed: {form → migration message}` | fail-loud removal (§8.2 rule 3) | 3 |
| 11 | `unique: {grain: perOccurrence, at: index\|container}` | duplicate lane + its path grain | 3 |
| 12 | selectors: `keys($.p)`, `values($.p)`, `collect($.a.*.b)`, `union(..)`, and the relations `memberOf` / `keysSubsetOf` / `disjointFrom` / `equals` | intra-document reference rules | 8 |
| 13 | `gating: true` + `dependsOn: [lane]` | suppression beyond the implicit container rule | 5 |
| 14 | `variant: {on: <sibling>, cases: {...}}` | discriminated-union config shape | 3 |
| 15 | `valueClass: <name>` | reusable named value class | 4 |
| 16 | `delegate: registry(<field>)` | hand-off to an injected registration's own declaration | 5 |
| 17 | `code:` | the named-lane issue code (closed namespace) | 5 |
| 18 | `message:` | the lane's message template (the parity carrier) | all |
| 19 | `raw` | uninterpreted pass-through (substrate gates only) | 3 |

Engine-level (not per-node) declarations: the finding form
`{path, message, code?}`, the dotted path grammar with `$` root and
`[i]` list segments, ACCUMULATE-all, the implicit container precondition
(a missing-where-required or wrong-kind container yields its OWN finding
and suppresses its dependents), and the staged short-circuiting pipeline.

### 2.3 The re-expression (the template surface, declared)

Tags in `[brackets]` are cited by the coverage tables in §3.

```
surface template-format

substrate
  [d-read]       read.decode: strict-utf8                       # ch8-C6
  [d-syntax]     parse.syntax: yaml-1.2-core                    # ch8-C1
  [d-docs]       parse.documents: 1                             # ch8-C3
  [d-dupkeys]    parse.duplicateKeys: reject                    # ch8-C4
  [d-warnings]   parse.promoteWarnings: true                    # ch8-C2
  [d-directive]  parse.directive: yaml-1.2-only                 # ch8-C34
  [d-aliases]    resolve.aliases: substrate ; resolve.graph: acyclic   # ch8-C5
  [d-source]     engine.sourceAccess: true    # C5's named exception: the
                 # validate stage may read the source node (C8/C12 need it)
  [d-stages]     stages: read, parse, resolve, validate, store  # ch8-C36
  [d-findings]   finding: {path, message, code?} ; accumulate: all ;
                 containerPrecondition: implicit                # ch8-C20/C21
  [d-paths]      path: dotted, root "$", list segment "[i]"     # ch8-C21 + ch11-C7
  [d-codes]      codes: closed {gate_evaluator_unavailable,
                 runtime_context_required_for_process_gate,
                 invalid_process_gate_config, gate_config_not_supported,
                 unresolved_context_block_ref} ; disjoint from registry names   # ch8-C23

nodes
  [d-root]  $ : map.fixed
      required: ref, start, steps, terminal, roles                # ch8-C7
      optional: runtimeContext, round, activation, contextBlocks  # ch11-C18/C37, ch12-C1, ch13-C1
      reserved: kind                                              # ch8-C24
      removed: {}                                                 # ch8-C25 (empty at v0)

  [d-ref]          $.ref : map.fixed {id!, version!}              # ch8-C8
  [d-ref-id]       $.ref.id : string, grammar ^[a-z0-9][a-z0-9-]*$
  [d-ref-version]  $.ref.version : integer,
                     sourceForm: plainDecimalInteger, resolvedForm: safeInteger min 1

  [d-steps]        $.steps : map.open, nonempty,
                     keyGrammar: id-class, keyLaneAt: container   # ch8-C9/C10
  [d-step]         $.steps.* : map.fixed
                     {role!, instruction!, transitions!, agentConfig?, gates?}
  [d-role-ref]     $.steps.*.role : string, grammar id-class, gating
  [d-instruction]  $.steps.*.instruction : string, nonempty       # ch8-C11
  [d-transitions]  $.steps.*.transitions : map.open (may be empty),
                     keyGrammar: id-class, keyLaneAt: container   # ch8-C12
  [d-target]       $.steps.*.transitions.* : string,
                     memberOf: union(keys($.steps), values($.terminal))   # ch8-C19
  [d-agentconfig]  $.steps.*.agentConfig : valueClass agentConfigValue    # ch8-C14 → ch12-C7

  [d-gates]        $.steps.*.gates : map.open,
                     keysSubsetOf: keys(../transitions), gating,  # ch11-C2
                     keyGrammar: id-class, keyStringness: file    # ch11 walk / GP2
  [d-pipeline]     $.steps.*.gates.* : list, nonempty, of [d-binding]      # ch11-C3
  [d-binding]      map.fixed {uses!, config?, contextBlockRefs?}  # ch11-C4 + ch13-C6
  [d-uses]         string, grammar ^[a-z][a-z0-9_]*(\.[a-z][a-z0-9_]*)+$,  # ch11-C6
                     memberOf: keys(@gateCatalog) code gate_evaluator_unavailable   # ch11-C8 (flagged, §2.4)
  [d-gate-config]  $.steps.*.gates.*[*].config : delegate registry(uses)   # ch11-C5

  [d-terminal]     $.terminal : list, nonempty,                   # ch8-C17
                     member: string grammar id-class,
                     unique {grain: perOccurrence, at: container},
                     disjointFrom: keys($.steps)

  [d-roles]        $.roles : map.open, keyGrammar: id-class,
                     keyLaneAt: container, gating                 # ch8-C15/C10
  [d-roles-entry]  $.roles.* : map.fixed {defaultActor?, defaultAgentConfig?}   # ch12-C6
  [d-defaultactor] string, nonempty
  [d-defaultagent] valueClass agentConfigValue                    # ch12-C7
  [d-roleset]      equals(keys($.roles), collect($.steps.*.role)) # ch8-C16
                     dependsOn: [d-role-ref, d-roles, d-step]

  [d-start]        $.start : string, memberOf: keys($.steps)      # ch8-C18

  [d-round]        $.round : map.fixed {advanceOnArrivalAt!},     # ch11-C37
                     default: {advanceOnArrivalAt: []}            # ch11-C38
  [d-round-list]   $.round.advanceOnArrivalAt : list, nonempty,   # ch11-C40
                     member: string, memberOf: keys($.steps),
                     unique {grain: perOccurrence, at: index}

  [d-rtc]          $.runtimeContext : union [ literal "none" | [d-rtc-spec] ],   # ch12-C2
                     default: "none",                             # ch12-C4
                     removed: {"required": "author the spec map { kind, provider, config? }"}
  [d-rtc-spec]     map.fixed {kind!, provider!, config?}          # ch12-C3
                     kind: string grammar ^[a-z][a-z0-9_]*$
                     provider: string grammar ^[a-z][a-z0-9_]*(\.[a-z][a-z0-9_]*)+$
                     config: raw map

  [d-activation]   $.activation : map.fixed {mode!},              # ch12-C1
                     default: {mode: immediate}
  [d-act-mode]     $.activation.mode : enum {immediate → immediate,
                     deferredKickoff → deferred_kickoff}

  [d-ctxblocks]    $.contextBlocks : map.open, default: {},       # ch13-C1/C17
                     keyGrammar: ^[a-z][a-z0-9-]*$, keyLaneAt: container,   # ch13-C2
                     keysSubsetOf: collect(raw: all block-ref lists)        # ch13-C8(c) — see §4 R2
  [d-ctx-entry]    $.contextBlocks.* : map.fixed {body!}          # ch13-C3
                     body: string, nonempty
  [d-ctx-refs]     valueClass blockIdList, bound at:              # ch13-C4/C6
                     $.roles.*.defaultAgentConfig.promptConcernRefs,
                     $.steps.*.agentConfig.promptConcernRefs,
                     $.steps.*.gates.*[*].contextBlockRefs

valueClasses
  [vc-agentconfig] map.plain + canonicalJsonSafe                  # ch12-C7
  [vc-blockidlist] list, member: string grammar ^[a-z][a-z0-9-]*$,
                     unique {grain: perOccurrence, at: index},    # ch13-C8(e)
                     member memberOf: keys($.contextBlocks)
                       code unresolved_context_block_ref          # ch13-C7 — see §4 R1
  [vc-authored-int] integer, sourceForm: plainDecimalInteger (file),
                     resolvedForm: safeInteger min 1              # ch11-C12

delegated config schemas (the registry hand-off targets)
  [d-gc-threshold] map.fixed {metric!, op!, value!}               # ch11-C10
                     metric: enum [round] ; op: enum [">="] ; value: [vc-authored-int]
  [d-gc-verdict]   map.fixed {required!}, optional container,     # ch11-C11
                     required: enum [true], default: {required: true}
  [d-gc-process]   map.fixed {command!, timeoutMs!, output?,      # ch11-C13
                     onExit?, onRunnerError?, onTimeout?, reason?}
                     command: string nonempty code invalid_process_gate_config
                     timeoutMs: [vc-authored-int] code invalid_process_gate_config
                     output: map.fixed {mode?}, mode: enum [exitCode, gateDecisionJson]
                       default exitCode code invalid_process_gate_config   # ch11-C14
                     variant on output.mode:                      # ch11-C15
                       exitCode:         onExit required, map.fixed {zero!, nonzero!},
                                         each enum [allow, warn, block] code invalid_process_gate_config
                       gateDecisionJson: onExit forbidden (unconsumed config)
                     onRunnerError/onTimeout: enum {blockTransition → ok,   # ch11-C16
                       failInstance → code gate_config_not_supported,
                       * → code invalid_process_gate_config}, default blockTransition
                     reason: map.fixed {zero?, nonzero?},         # ch11-C17
                       token grammar ^[a-z][a-z0-9_]*$,
                       default (exitCode mode) {zero: sys:exit_zero, nonzero: sys:exit_nonzero}
```

### 2.4 Flagged borderline constructs (the single-use smell)

Two constructs above fail or nearly fail the ≥2-user test. They are
named here rather than buried, because the ADR's falsifiability
criterion turns on exactly this kind of item.

| Construct | Users today | Disposition proposed |
|---|---|---|
| `memberOf: keys(@gateCatalog)` — a selector root that is an INJECTED set, not a document node | 1 (ch11-C8's `uses` resolution; ch12-C16 explicitly does NOT resolve providers at admission) | ACCEPT as a generalization of the selector root (a set is a set), or send ch11-C8 to residual R1. Recommend ACCEPT — the alternative keeps a one-line code lane for a pure membership test. |
| per-member `code:` inside `enum` (ch11-C16's `failInstance` gets its own distinct code) | 1 | ACCEPT as the `code` attribute applied at member grain (not a new construct). If rejected, ch11-C16 goes to residual. |

### 2.5 Channel independence

The declaration is channel-independent by construction with ONE
declared exception: attributes that read the SOURCE text
(`sourceForm`, `keyStringness`, and the substrate block) have no
operand on the direct-construction channel. The proposal is that they
are declared once and marked `file` — the engine runs them where a
source exists and skips them where none does. This is the same split
ch11-C40 and ch13-C19 ratified by hand as a "realization split", except
that it becomes an ENGINE property of one declaration instead of two
hand-partitioned code homes (see §5, finding F4).

## 3. The coverage tables

Columns: **Cls** = class (§0). **Declaration** = the §2.3 tag(s), or the
§4 residual id, or the N-reason. **Par** = finding-path/message parity
per §0 (`P` reproducible from declaration + message template; `Δpath`
the measured path grain is not the engine's natural grain and must be
declared explicitly; `Δmsg` the measured message embeds rule-specific
rationale prose, carried only as a literal template; `Δlib` the message
is the YAML library's; `—` no finding). **Ch** = channel (`both`,
`file`, `—`).

### 3.1 ch8 — template-format (38 rows)

| Row | Rule | Cls | Declaration / reason | Par | Ch |
|---|---|---|---|---|---|
| C1 | YAML 1.2 core-schema semantics | S | `[d-syntax]` | Δlib | file |
| C2 | document API; errors+warnings promoted, ordered | S | `[d-warnings]` `[d-findings]` | Δlib | file |
| C3 | one document per file | S | `[d-docs]` | Δlib | file |
| C4 | duplicate map keys reject | S | `[d-dupkeys]` | Δlib | file |
| C5 | aliases resolve; amplification guard; acyclic; source exception | S | `[d-aliases]` `[d-source]` | P | file+both |
| C6 | strict UTF-8 decode | S | `[d-read]` | Δmsg | file |
| C7 | root fixed keyset (5 required) + additive growth | S | `[d-root]` (growth clause → ADR format-growth rule) | Δmsg | both |
| C8 | `ref` map; id grammar; version source ladder | S | `[d-ref]` `[d-ref-id]` `[d-ref-version]` | P | file (source half) |
| C9 | `steps` nonempty map; step keyset | S | `[d-steps]` `[d-step]` | P | both |
| C10 | one id grammar for step/terminal/role/event ids | S | `id-class` on `[d-steps]` `[d-terminal]` `[d-roles]` `[d-transitions]` | Δmsg | both |
| C11 | `instruction` nonempty string, no normalization | S | `[d-instruction]` | P | both |
| C12 | `transitions` map, may be empty | S | `[d-transitions]` | P | both |
| C13 | fixed vs open maps; unknown-key fail-closed | S | `kind:` + `[d-findings]` | Δmsg | both |
| C14 | `agentConfig` raw at validate; domain delegated to ch12-C7 | S | `[d-agentconfig]` `[vc-agentconfig]` | P | both |
| C15 | roles entry keyset; `defaultActor` | S | `[d-roles-entry]` `[d-defaultactor]` | P | both |
| C16 | role set: declared == used, both directions | H | `[d-roleset]` (declarable) + its reliability suppression → `dependsOn` | P | both |
| C17 | `terminal` nonempty, unique, disjoint from steps | S | `[d-terminal]` | Δpath | both |
| C18 | `start` ∈ keys(steps) | S | `[d-start]` | P | both |
| C19 | transition target ∈ steps ∪ terminal | S | `[d-target]` | P | both |
| C20 | positional read/parse/resolve findings + ordering | S | `[d-findings]` `[d-stages]` | Δlib | file |
| C21 | accumulate `{path,message}`; container preconditions | S | `[d-findings]` `[d-paths]` | P | both |
| C22 | template XOR error; nothing partial | S | engine core (`[d-stages]`) | — | both |
| C23 | no registry rejection names on the load side | S | `[d-codes]` (closed, disjoint) | — | both |
| C24 | no version field; `kind` reserved | S | `[d-root]` reserved | Δmsg | both |
| C25 | removed/renamed key registry with migration text | S | `[d-root]` removed (empty at v0) | Δmsg | both |
| C26 | store: byte-exact directory listing match | N | store lookup mechanics, outside the document | — | — |
| C27 | store: declared `ref` vs matched filename | Sem | **R5** (cross-artifact, store stage) | P | — |
| C28 | `load(ref)`: absent → null, invalid → reject | N | port contract | — | — |
| C29 | CLI templates-dir resolution lane | N | CLI config surface | — | — |
| C30 | `start` names a pinned ref | N | CLI verb surface | — | — |
| C31 | dev `validate` verb behaviour | N | CLI surface (consumes the machine shape) | — | — |
| C32 | canonical template file home; builtin retired | N | shipped-artifact duty | — | — |
| C33 | dependency `yaml` major 2 | N | dependency decision (ADR-012) | — | — |
| C34 | `%YAML` non-1.2 directive rejected (two mechanisms) | S | `[d-directive]` | Δmsg | file |
| C35 | merge keys are not a feature | S | falls out of `[d-syntax]` + keyset rules | Δmsg | file |
| C36 | staged pipeline, short-circuiting | S | `[d-stages]` | — | both |
| C37 | dev `replay` stays hermetic | N | CLI surface | — | — |
| C38 | write lane surfaces the typed load error | N | CLI surface | — | — |

ch8 tally: **S 27 · H 1 · Sem 1 · N 9** = 38.

### 3.2 ch11 — gate-format (41 rows)

| Row | Rule | Cls | Declaration / reason | Par | Ch |
|---|---|---|---|---|---|
| C1 | step gains optional `gates`; map event→list | S | `[d-step]` `[d-gates]` | P | both |
| C2 | gates keys ⊆ keys(transitions) (dead config) | S | `[d-gates]` keysSubsetOf + gating | Δmsg | both |
| C3 | nonempty list of gate maps; authored order = pipeline order | S | `[d-pipeline]` (order clause is runtime meaning) | P | both |
| C4 | gate map fixed keyset `uses`+`config?`+`contextBlockRefs?` | S | `[d-binding]` | Δmsg | both |
| C5 | `config` presence is evaluator-specific | S | `[d-gate-config]` → the delegated schema's own `required` | P | both |
| C6 | `uses` dotted grammar | S | `[d-uses]` | P | both |
| C7 | path grammar gains `[i]` list segments | S | `[d-paths]` | P | both |
| C8 | static registry; admission resolves `uses`; coded lane | H | `[d-uses]` memberOf `keys(@gateCatalog)` — **flagged §2.4**; else **R1**. Registry composition half is non-lane | P | both |
| C9 | registry member axes (implementation/execution) | N | registry data | — | — |
| C10 | `declarative.threshold` config keyset + allowlists | S | `[d-gc-threshold]` (block semantics is runtime) | P | both |
| C11 | `previous_reviewer_verdict` config; absent ≡ `{required:true}` | S | `[d-gc-verdict]` | P | both |
| C12 | every authored integer follows the source ladder | S | `[vc-authored-int]` | P | file (source half) |
| C13 | `external.process` config keyset; command semantics | S | `[d-gc-process]` (shell/cwd semantics is runtime) | P | both |
| C14 | `output.mode` enum + `exitCode` default | S | `[d-gc-process]` output | P | both |
| C15 | `onExit` required in exitCode mode; both buckets; unconsumed otherwise | S | `[d-gc-process]` `variant` | P | both |
| C16 | dispositions; `failInstance` distinct code | S | `[d-gc-process]` enum with per-member code — **flagged §2.4** | P | both |
| C17 | `reason` per-bucket keyset, token grammar, defaults | S | `[d-gc-process]` reason | P | both |
| C18 | root `runtimeContext` key (pointer to ch12) | S | `[d-root]` `[d-rtc]` | P | both |
| C19 | process gate + requirement `none` → coded cross-rule | Sem | **R3** (existential over resolved registrations) | P | both |
| C20 | single-authority admission; one channel | S | engine core (`[d-stages]`, one declaration) | — | both |
| C21 | the gate admission lane matrix; container preconditions | S | the union of the rows above + `[d-findings]` | P | both |
| C22 | RETIRED-IN-PLACE | N | no rule to express | — | — |
| C23 | `GateInvocation` stdin wire shape | N | runtime wire (extension-point surface) | — | — |
| C24 | `gate_projection` wire shape | N | runtime wire | — | — |
| C25 | `GateDecision` stdout JSON contract | N | runtime wire — a DIFFERENT validated surface (ADR extension point) | — | — |
| C26 | evidence record on every process-gate run | N | runtime/persistence | — | — |
| C27 | retained decisions on the transcript | N | runtime/read surface | — | — |
| C28 | CLI: no new verbs or flags | N | CLI surface | — | — |
| C29 | module home (ADR-013) | N | module topology | — | — |
| C30 | growth stance | N | governance (→ ADR format-growth rule) | — | — |
| C31 | `gate_blocked` reason-token positional rule | N | runtime rejection surface | — | — |
| C32 | process-returned free text untrusted | N | runtime | — | — |
| C33 | evidence propagation | N | runtime | — | — |
| C34 | `ProcessResult` port shape | N | port shape | — | — |
| C35 | HANDLE registry-availability backstop | N | runtime | — | — |
| C36 | HANDLE workspace-emptiness backstop | N | runtime | — | — |
| C37 | root `round` key; single inner key; step-id members | S | `[d-round]` `[d-round-list]` | P | both |
| C38 | absent `round` ⇒ no advancing transitions (default) | S | `[d-round]` default (deviation clause → governance) | — | both |
| C39 | expand per-transition `advancesRound`; kernel reads flags only | Sem | **R4** (admitted-form derivation) | — | both |
| C40 | the round admission lanes (value + source-form split) | S | `[d-round]` `[d-round-list]`; the SPLIT dissolves (§5 F4) | Δpath | both/file |
| C41 | per-transition override deferred | N | partial-realization disposition | — | — |

ch11 tally: **S 21 · H 1 · Sem 2 · N 17** = 41.

### 3.3 ch12 — runtime-core (27 rows)

| Row | Rule | Cls | Declaration / reason | Par | Ch |
|---|---|---|---|---|---|
| C1 | `activation` map; `mode` required; enum; default | S | `[d-activation]` `[d-act-mode]` | P | both |
| C2 | `runtimeContext` domain: `none` \| spec map; `required` retired | S | `[d-rtc]` union + removed | Δmsg | both |
| C3 | spec map keyset; `kind`/`provider` grammars; raw `config` | S | `[d-rtc-spec]` | P | both |
| C4 | absent ≡ `none`, materialized once | S | `[d-rtc]` default | — | both |
| C5 | process↔workspace admission lane (C19's successor) | Sem | **R3** | P | both |
| C6 | roles entry gains `defaultAgentConfig` | S | `[d-roles-entry]` `[d-defaultagent]` | P | both |
| C7 | agent-config value class: map + canonical-JSON-safe | S | `[vc-agentconfig]` (the `runOverrides` position is a CLI surface) | P | both |
| C8 | the agent-config cascade | N | runtime resolver | — | — |
| C9 | `runOverrides` create surface; inert unknown key | N | instance-input surface (extension point) | — | — |
| C10 | `issued_agent_config` provenance | N | runtime/persistence | — | — |
| C11 | the store schema bump | N | storage | — | — |
| C12 | transcript entry classes | N | storage/read | — | — |
| C13 | ingress source routing | N | runtime | — | — |
| C14 | start-input seam replaced | N | runtime | — | — |
| C15 | provider port contract | N | port | — | — |
| C16 | provider registry composition; START-only resolution | N | runtime registry (explicitly NOT an admission lane) | — | — |
| C17 | packet `runtime_context` field | N | runtime | — | — |
| C18 | START's provider lanes | N | runtime | — | — |
| C19 | CLI lifecycle verbs | N | CLI | — | — |
| C20 | verb schemas + exit lanes | N | CLI input surface (extension point) | — | — |
| C21 | floor read extension | N | read surface | — | — |
| C22 | module home (ADR-014) | N | module topology | — | — |
| C23 | growth stance | N | governance | — | — |
| C24 | named-replacements inventory | N | governance/migration | — | — |
| C25 | admission lane channel + staging | S | engine core: one channel + implicit containers | P | both |
| C26 | cross-contract edit obligations of the act | N | process | — | — |
| C27 | template §4 patch | N | process | — | — |

ch12 tally: **S 7 · H 0 · Sem 1 · N 19** = 27.

### 3.4 ch13 — context-block (19 rows, superseded; zero code)

| Row | Rule | Cls | Declaration / reason | Par | Ch |
|---|---|---|---|---|---|
| C1 | root `contextBlocks` open-key map; container lane; absent legal | S | `[d-ctxblocks]` | P | both |
| C2 | block-id key lane + kebab grammar + walk hand-off | H | `[d-ctxblocks]` keyGrammar/keyLaneAt (declarable) + the non-string-key FILTER into the built catalog → **R4** | Δpath | both/file |
| C3 | entry is `{body}`, body nonempty string | S | `[d-ctx-entry]` | P | both |
| C4 | `promptConcernRefs` in the two agentConfig positions | H | `[d-ctx-refs]` `[vc-blockidlist]` + the template-wide skip of C8(c) → `dependsOn`, see **R2** | P | both |
| C5 | `runOverrides` refs are never a render source | N | runtime read-path | — | — |
| C6 | gate binding gains `contextBlockRefs` | S | `[d-binding]` `[d-ctx-refs]` | P | both |
| C7 | ref resolution: entry-belted, per-site coded finding | Sem | **R1** — and the belt DISSOLVES under one engine (§5 F2) | P | both |
| C8 | the empty/absent/edge matrix: (a)(b)(d)(f)(g) legal; (c) unreferenced; (e) duplicates | H | (a)(b)(d)(f)(g) fall out of `[d-ctxblocks]`; (e) `unique{at:index}` — declarable; (c) → **R2** | Δpath | both |
| C9 | render order, dedup, provenance | N | runtime render | — | — |
| C10 | gate-ref authority predicate | N | runtime render | — | — |
| C11 | packet `contextBlocks` field shape | N | runtime wire | — | — |
| C12 | communication-only boundary | N | invariant/governance | — | — |
| C13 | render determinism | N | runtime | — | — |
| C14 | shipped catalog entry + ripple | N | shipped-artifact duty | — | — |
| C15 | authoring caveat (aim, not enforcement) | N | non-enforced caveat | — | — |
| C16 | the reopen-act carrier | N | process | — | — |
| C17 | admitted-form normalization + sibling normalized fields | Sem | **R4** (derivation, not validation) | — | both |
| C18 | CLI unchanged; `code` travels end-to-end | N | CLI surface (parity duty on `[d-codes]`) | — | — |
| C19 | lane inventory + walk/rung realization split | S | engine core — the SPLIT is dissolved by one engine (§5 F4) | — | both |

ch13 tally: **S 4 · H 3 · Sem 2 · N 10** = 19.

### 3.5 Source 2 — implemented lanes → owning row → declaration

Every implemented check, in code order. A lane with NO owning contract
row is flagged (the invention direction of the threat model).

**`definition/load.ts` (8 emit sites)**

| # | Lane (line) | Row | Declaration |
|---|---|---|---|
| L1 | strict UTF-8 decode (174) | ch8-C6 | `[d-read]` |
| L2 | duplicate-key rejection via `yamlNodeEqual` (193, 123) | ch8-C4 | `[d-dupkeys]` |
| L3 | `%YAML` non-1.2 synthesized finding, heads the list (202) | ch8-C34 | `[d-directive]` |
| L4 | `doc.errors`, offset-sorted (211) | ch8-C2/C20 | `[d-warnings]` |
| L5 | `doc.warnings` promoted after errors (218) | ch8-C2/C20 | `[d-warnings]` |
| L6 | resolve-stage throw mapped (`toJS`, 232) | ch8-C5/C36 | `[d-aliases]` |
| L7 | cross-rung accumulation + XOR result (249–266) | ch8-C22/C36, ch11-C20 | `[d-stages]` |
| L8 | every-stage catch → `internal validator failure` (270) | ch8-C22 (defensive belt; no row states the message) | engine core — **flag I1** |

**`definition/validate.ts` (51 emit sites)**

| # | Lane (line) | Row | Declaration |
|---|---|---|---|
| V1 | non-map root, one finding at `$` (316) | ch8-C7/C21 | `[d-root]` |
| V2 | cycle detection, accumulating (338) | ch8-C5 | `[d-aliases]` |
| V3 | root missing required key ×5 (345) | ch8-C7 | `[d-root]` |
| V4 | root unknown key (351) | ch8-C13/C24 | `[d-root]` |
| V5 | `ref` non-map container (365) | ch8-C8/C21 | `[d-ref]` |
| V6 | `ref` unknown key (368) | ch8-C8 | `[d-ref]` |
| V7 | `ref.id` missing (376) | ch8-C8 | `[d-ref]` |
| V8 | `ref.id` grammar/type (380) | ch8-C8 | `[d-ref-id]` |
| V9 | `ref.version` missing (386) | ch8-C8 | `[d-ref]` |
| V10–V15 | version source ladder: alias-ban, non-scalar, anchor-ban, tag-ban, source regex, safe-int≥1 (219–242) | ch8-C8 | `[d-ref-version]` |
| V16 | `steps` non-map (409) | ch8-C9 | `[d-steps]` |
| V17 | `steps` empty (411) | ch8-C9 | `[d-steps]` |
| V18 | step-id grammar, reported at `steps` (417) | ch8-C10 | `[d-steps]` keyLaneAt |
| V19 | step non-map container (423) | ch8-C9 | `[d-step]` |
| V20 | step unknown key (428) | ch8-C9/C13 | `[d-step]` |
| V21 | step missing role/instruction/transitions (436) | ch8-C9 | `[d-step]` |
| V22 | `role` grammar + reliability gating (447) | ch8-C10/C16 | `[d-role-ref]` |
| V23 | `instruction` nonempty string (461) | ch8-C11 | `[d-instruction]` |
| V24 | `transitions` non-map (468) | ch8-C12 | `[d-transitions]` |
| V25 | event-type grammar, reported at `…transitions` (472) | ch8-C10 | `[d-transitions]` keyLaneAt |
| V26 | gates-subtree key stringness (281, 491) | ch11 walk (GP2); no C-row states it — **flag I2** | `[d-gates]` keyStringness |
| V27 | `threshold.value` source ladder, uses-scoped (524) | ch11-C12 | `[vc-authored-int]` |
| V28 | `process.timeoutMs` source ladder, uses-scoped (525) | ch11-C12 | `[vc-authored-int]` |
| V29 | `terminal` non-list (540) | ch8-C17 | `[d-terminal]` |
| V30 | `terminal` empty (543) | ch8-C17 | `[d-terminal]` |
| V31 | terminal member grammar (549) | ch8-C10 | `[d-terminal]` |
| V32 | duplicate terminal id, at path `terminal` (555) | ch8-C17 | `unique{at: container}` |
| V33 | terminal ∩ steps collision (564) | ch8-C17 | `disjointFrom` |
| V34 | `roles` non-map (585) | ch8-C15 | `[d-roles]` |
| V35 | declared role-name grammar + gating (591) | ch8-C10/C16 | `[d-roles]` |
| V36 | roles entry non-map (600) | ch8-C15 | `[d-roles-entry]` |
| V37 | roles entry unknown key (604) | ch8-C15, ch12-C6 | `[d-roles-entry]` |
| V38 | `defaultActor` nonempty string (618) | ch8-C15 | `[d-defaultactor]` |
| V39 | `start` ∉ keys(steps) / non-string (641) | ch8-C18 | `[d-start]` |
| V40 | transition target ∉ steps ∪ terminal (649) | ch8-C19 | `[d-target]` |
| V41 | role used-but-undeclared (661) | ch8-C16 | `[d-roleset]` |
| V42 | role declared-but-unused (665) | ch8-C16 | `[d-roleset]` |
| V43 | `round` non-map (685) | ch11-C40 | `[d-round]` |
| V44 | `round` unknown key (688) | ch11-C37/C40 | `[d-round]` |
| V45 | `advanceOnArrivalAt` missing (696) | ch11-C40 | `[d-round]` |
| V46 | `advanceOnArrivalAt` non-list (700) | ch11-C40 | `[d-round-list]` |
| V47 | member non-string (704) | ch11-C40 | `[d-round-list]` |
| V48 | rtc spec unknown key (737) | ch12-C3 | `[d-rtc-spec]` |
| V49 | rtc `kind` missing / grammar (745, 749) | ch12-C3 | `[d-rtc-spec]` |
| V50 | rtc `provider` missing / grammar (756, 760); `config` non-map (767) | ch12-C3 | `[d-rtc-spec]` |
| V51 | `activation` non-map / unknown key / missing `mode` / mode enum (804–823) | ch12-C1 | `[d-activation]` `[d-act-mode]` |

(V10–V15 and V48–V51 group sub-lanes that share one declaration; the
mechanical emit-site total for this file is 51 — 50 `findings.push`
plus V1's early return. Receipt R7.)

**`definition/admit.ts` (19 emit sites)**

| # | Lane (line) | Row | Declaration |
|---|---|---|---|
| A1 | `steps.*.agentConfig` plain-map (106) | ch12-C7 | `[vc-agentconfig]` |
| A2 | `steps.*.agentConfig` canonical-JSON-safe (113) | ch12-C7 | `[vc-agentconfig]` |
| A3 | `gates` non-map (177) | ch11-C21 | `[d-gates]` |
| A4 | gates key not a transition — dead config (186) | ch11-C2 | `[d-gates]` keysSubsetOf |
| A5 | pipeline non-list (194) | ch11-C3/C21 | `[d-pipeline]` |
| A6 | pipeline empty (199) | ch11-C3 | `[d-pipeline]` |
| A7 | binding non-map (205) | ch11-C21 | `[d-binding]` |
| A8 | binding unknown key (214) | ch11-C4 | `[d-binding]` |
| A9 | `uses` missing / non-string / empty (223) | ch11-C21 | `[d-uses]` |
| A10 | `uses` grammar (231) | ch11-C6 | `[d-uses]` |
| A11 | catalog resolve → `gate_evaluator_unavailable` (238) | ch11-C8 | `[d-uses]` memberOf |
| A12 | registration config findings propagated with code (272) | ch11-C21 | `[d-gate-config]` |
| A13 | zero-findings failure belt (265) | no row — defensive guard against a forged registration — **flag I3** | delegation-contract belt |
| A14 | `roles.*.defaultAgentConfig` map + canonical (296) | ch12-C6/C7 | `[vc-agentconfig]` |
| A15 | `runtimeContext: "required"` retired, migration text (320) | ch12-C2 | `[d-rtc]` removed |
| A16 | `runtimeContext` illegal value (328) | ch12-C2 | `[d-rtc]` union |
| A17 | process-gate cross-rule, coded, suppressed under A16 (347) | ch11-C19 / ch12-C5 | **R3** |
| A18 | `round.advanceOnArrivalAt` empty (369) | ch11-C40 | `[d-round-list]` |
| A19 | round member ∉ steps (374) and duplicate per occurrence (380) | ch11-C40/C37 | `memberOf` + `unique{at:index}` |

Normalizations performed by the same function and NOT validations:
`advancesRound` expansion (406), effective-config materialization (421),
`activation` default (444), `runtimeContext` normalization (445). All
four are **R4**.

**`gates/threshold.ts` (9 emit sites)** — config required (`raw ===
undefined`); container non-map; unknown key; `metric` missing;
`metric ≠ round`; `op` missing; `op ≠ ">="`; `value` missing;
`value` not-safe-int≥1. All → `[d-gc-threshold]`. Owning rows:
ch11-C5/C10/C12/C21.

**`gates/previousReviewerVerdict.ts` (4 emit sites)** — container
non-map; unknown key; `required` missing; `required ≠ true` (absent
config is the default, not a finding). All → `[d-gc-verdict]`. Owning
rows: ch11-C5/C11/C21.

**`gates/process.ts` (21 emit sites over 17 named lanes)** — lanes a–q
as the file itself names them: config
required (a); container (b); unknown top key (c); `command`
missing/invalid (d, coded); `timeoutMs` missing/invalid (e, coded);
`output` container (f); `output` unknown key (g); `output.mode`
allowlist (h, coded); `onExit` missing in exitCode mode (i, coded);
`onExit` container (j); bucket missing (k, coded); bucket value
allowlist (l, coded); `onExit` surplus key (m); `onExit` unconsumed in
gateDecisionJson mode (n); disposition `failInstance` (o, coded
distinctly); disposition other (p, coded); `reason` container / unknown
key / token grammar (q). All → `[d-gc-process]`. Owning rows:
ch11-C13–C17/C21.

**Flags raised by the reverse direction (implemented lane without a
ratified row).** Three, all recorded, none folded here:

- **I1** — `load.ts:270`'s `internal validator failure: …` message. The
  every-stage catch is ch8-C22's, but no row fixes the message or its
  `$` path. Carried: the ADR's engine-core section owns it.
- **I2** — `validate.ts`'s gates-subtree key-STRINGNESS scan. It is
  packet-born (ch11-P4 F3, probe GP2); no ch11 C-row states it. Under
  the declaration it becomes `keyGrammar` on an open map — which a
  non-string key fails by construction, so the schema direction gives
  this orphan lane a ratified home for the first time.
- **I3** — `admit.ts:265`'s zero-findings failure belt. Guards a forged
  registration, not an authored template; under `delegate:` it is the
  delegation contract's own belt. No row states it.

### 3.6 Classification totals

| Class | ch8 | ch11 | ch12 | ch13 | Total |
|---|---|---|---|---|---|
| S — structural | 27 | 21 | 7 | 4 | **59** |
| H — hybrid | 1 | 1 | 0 | 3 | **5** |
| Sem — semantic | 1 | 2 | 1 | 2 | **6** |
| N — non-lane | 9 | 17 | 19 | 10 | **55** |
| **Rows** | 38 | 41 | 27 | 19 | **125** |

Of the 70 rows that carry a definition-validation obligation (S+H+Sem),
**59 are fully declarable, 5 are mixed, 6 are residual** — and the 5
mixed rows contribute their inexpressible halves to the same six
residual families below. Zero rows are unclassified.

## 4. The residual (named prose/code lanes)

| Id | Residual | Members | Why it cannot be a declaration |
|---|---|---|---|
| **R1** | resolution against a value-shaped or injected target | ch13-C7 (entry belt); ch11-C8 (catalog membership — flagged, may become declarable, §2.4) | C7 requires the target VALUE to satisfy another node's declaration, evaluated at reference time. See F2 — under ONE engine this shrinks to a membership test. |
| **R2** | unreferenced-entry hygiene with a template-wide skip | ch13-C8(c) | The set-difference itself IS declarable (`keysSubsetOf: collect(raw: …)`, the same construct `[d-roleset]` uses). What is not: the RAW-member domain (grammar-failing members still count as references) plus the skip-the-whole-check-if-any-ref-container-failed rule. Both are expressible only as a rule-specific predicate — the single-use smell. |
| **R3** | existential cross-rules over resolved registrations | ch11-C19, ch12-C5 (one lane, one code) | "IF any binding resolves to a registration whose `requiresRuntimeContext` is true THEN `$.runtimeContext` must be a spec map" is a conditional over a DERIVED property of an injected object. A `when:` general enough to express it is an expression language — the thing ch11-C10's own text refuses. |
| **R4** | admitted-form derivation (normalization beyond `default:`) | ch11-C39 (`advancesRound` expansion); the effective-config materialization; ch13-C17 (rebuild + normalized sibling fields); ch13-C2's non-string-key filter | These are TRANSFORMS, not validations. A declaration says what is legal; it does not compute the admitted shape. The ADR should name the normalizer as a second, declared-hook machine — not force it into the schema. |
| **R5** | cross-artifact checks outside the document | ch8-C27 (declared `ref` vs matched filename) | The operand is the filesystem listing, not the document. Stays a store-stage lane. |
| **R6** | substrate-owned behaviour | ch8-C1/C2/C3/C4/C20's message texts (`Δlib`) | Declared as flags; the FINDINGS are the YAML library's. Parity here is library-version parity, not engine parity. |

### 4.1 Verdict on the plan's prediction

Plan §3 (P3) predicted the residual as: *reference resolution,
unreferenced hygiene, event-grain suppression, per-occurrence
duplicates*. The table CHECKED it rather than assuming it:

| Predicted | Verdict | Basis |
|---|---|---|
| reference resolution | **PARTIALLY REFUTED** | Intra-document references are declarable with one selector vocabulary (`[d-start]`, `[d-target]`, `[d-terminal]` disjointness, `[d-gates]` subset, `[d-round-list]` membership, `[d-roleset]` — 6 independent users). Only the value-shaped belt (R1) and the cross-artifact check (R5) remain. |
| unreferenced hygiene | **PARTIALLY REFUTED** | The set operation is the SAME construct as ch8-C16's role-set equality, which has been shipped and green since ch8. What is residual is C8(c)'s raw-member domain and its template-wide skip, not the hygiene idea. |
| event-grain suppression | **REFUTED** | `keysSubsetOf: keys(../transitions)` + `gating` expresses ch11-C2's dead-config lane and its dependent suppression. The construct has 5 users (`[d-gates]`, `[d-role-ref]`, `[d-roles]`, `[d-roleset]`, the process `variant` mode gate), so it passes the admission test. |
| per-occurrence duplicates | **REFUTED** | `unique {grain: perOccurrence, at: index\|container}` covers ch8-C17, ch11-C40 and ch13-C8(e) — 3 independent users. The `at:` attribute exists precisely because the three measured lanes DISAGREE on path grain (§5 F3). |

**Two residual families the prediction did not name** — the honest
counterweight: **R3** (the existential cross-rule) and **R4** (the
admitted-form derivation). R4 is the larger of the two and the more
consequential for the ADR: it is not a leftover lane, it is a second
machine that the ADR must name explicitly, or the direction will be
read as covering ground it does not cover.

## 5. Findings for the ADR

- **F1 — the direction survives the enumeration.** 59 of 70
  obligation-bearing rows are fully declarable; the residual is six
  named families, four of which are one or two rows each. Nothing in
  the 125 required a per-rule special case in the declaration
  vocabulary — the §0 admission test rejected exactly two candidates,
  both recorded in §2.4 rather than smuggled in.
- **F2 — the schema direction dissolves ch13-C7's entry belt (DERIVED).**
  C7's belt exists because the direct-construction channel had no walk:
  a cast-forged catalog entry could not be refused structurally, so
  resolution had to re-check the value's shape. Under ONE engine
  running ONE declaration on BOTH channels, `[d-ctx-entry]` fires on the
  malformed entry directly and C7 reduces to `memberOf:
  keys($.contextBlocks)`. That belt cost two ratified reopens
  (2026-08-01 and the 2026-08-02 pair). **This claim is DERIVED, not
  measured**; its named measurer is the P4 contract-v2 panel's
  channel-symmetry family plus the build's parity gate.
- **F3 — path-grain parity is the real parity risk, not message
  wording.** Three measured lanes report at a coarser path than the
  engine's natural grain: duplicate terminal ids at `terminal` (not
  `terminal[i]`), every key-class lane at its CONTAINING map
  (`steps`, `roles`, `…transitions`, `contextBlocks`), and ch13-C2's
  key lane deliberately so. The `at:`/`keyLaneAt:` attributes exist to
  preserve those grains byte-for-byte. Every `Δpath` cell in §3 is a
  place where an engine written naively would silently move a finding's
  address — the parity gate's highest-yield target.
- **F4 — the walk/rung split is an artifact, not a requirement.**
  ch11-C40 and ch13-C19 each spend ratified prose partitioning lanes
  between the source-form walk and the admission rung, with a
  channel-scope argument attached. Under §2.5 that partition becomes an
  ENGINE property of a single declaration (`file`-scoped attributes are
  inert where no source exists). Contract v2 should not re-ratify a
  realization split; it should declare which attributes are
  source-bearing. ch13-C19 is a named supersession candidate.
- **F5 — `Δmsg` is a decision the ADR must make once, not per row.**
  Nine measured messages embed rule-specific rationale (`ids contain no
  whitespace and no "."`, `V16 reserves "kind"`, the two migration
  texts, the probe references). They stay byte-identical only if the
  declaration carries a literal `message:`. The alternative — engine-
  generated wording plus an approved delta list — is cheaper to
  maintain and is exactly what the ADR's parity gate exists to
  authorize. Recommend: declare `message:` optional, engine default
  otherwise, and take the delta list at the parity gate.
- **F6 — three implemented lanes have no ratified row (I1, I2, I3).**
  The schema direction gives I2 a home for the first time; I1 and I3
  are engine/delegation-contract concerns. None is folded here (outside
  the threat model); all three are carried scope for contract v2.
- **F7 — the surface count is the ADR's scope lever.** The template
  surface is one of at least five validated document surfaces in the
  repo (also: the `GateDecision` stdout contract ch11-C25, the
  `GateInvocation` wire ch11-C23, the CLI `--run-overrides` input
  ch12-C9/C20, the operator-intent wire ch12-C13). The ADR should scope
  the build to the TEMPLATE surface and name the others as extension
  points — the same discipline §1.3's boundary applied to the EC
  surface.

## 6. Receipts (commands executed at write time, 2026-08-05)

| Id | Command (as executed) | Result |
|---|---|---|
| R1 | `for f in ch8-… ch11-… ch12-… ch13-…; do grep -cE '^\| C[0-9]+ \|' "$f"; done` in `v3/implementation/contracts` | 38 / 41 / 27 / 19; concatenated total 125 |
| R2 | `grep -rn 'code: "' v3/src \| grep -v '\.test\.'` and `grep -rn 'CODE_INVALID = \|CODE_NOT_SUPPORTED = ' v3/src` | `admit.ts:244`, `admit.ts:350`, `process.ts:32`, `process.ts:33` — 4 live codes |
| R3 | `grep -n '^## \|^### ' v3/implementation/plan.md` + the §1.3 map's status column | chapter sections for ch1–9, 11, 12, 13; `planned` with a format surface: ch13 only |
| R4 | `grep -rl "contextBlocks\|promptConcernRefs\|contextBlockRefs" v3/src` and the same over `v3/templates/` | zero files both times |
| R5 | `grep -rl "validateAndNormalizeConfig" v3/src` | 13 paths; the three PRODUCING registrations are `gates/{threshold,previousReviewerVerdict,process}.ts` — the rest are the port/domain type homes, `definition/admit.ts` (the caller) and test files |
| R6 | full read of `definition/{load,validate,admit,errors}.ts` and `gates/{threshold,previousReviewerVerdict,process}.ts` | the §3.5 inventory, with line anchors |
| R7 | `grep -c 'findings.push' <file>`, `grep -c 'findings: \[' <file>`, `grep -c 'return fail(' load.ts` | validate 50+1 · admit 19+0 · threshold 7+2 · verdict 3+1 · process 19+2 · load 8 (the `findings: [` counts exclude each file's final `[first, ...rest]` tuple return, which is a re-wrap, not an emit site) |

Every line number in §3.5 is from the file state read at write time.
