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
INDEPENDENT ratified rows use it** — rows, not declaration tags: three
tags serving one C-row are ONE user (arm round 1, F6). A construct
serving exactly one row is code wearing a declaration's costume; its
row is NOT counted as declarable, it goes to residual **R7** pending
the ADR's explicit admission decision, and the construct is recorded as
a flagged borderline (§2.4). Two constructs are in that state today and
their two rows are classified `H` accordingly — the audit does not get
to flag a construct and still bank its coverage (arm round 1, F2).

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
chosen because it is mechanically derivable. The counting rule, stated
exactly (arm round 1, F7 — the earlier wording double-counted
`load.ts`): for the four accumulating files it is `findings.push` plus
each early `return … findings: [...]` site, EXCLUDING each file's final
`[first, ...rest]` re-wrap; for `load.ts`, which returns rather than
accumulates, it is the 8 `return fail(` sites — its single
`findings.push` (line 138) populates one of those returns and is not a
separate emit site. A named lane may own several emit sites (the
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

The **Rows** column counts INDEPENDENT ratified C-rows that use the
construct, per §0's grain (corrected from a tag count at arm round 1,
F6). Each count is the enumeration in the adjacent cell — no count
here is an estimate.

| # | Construct | Meaning | Rows |
|---|---|---|---|
| 1 | `kind:` map.fixed \| map.open \| list \| string \| integer \| enum \| union \| raw | the node's container/scalar class | every shape row |
| 2 | `required` / `optional` | keyset membership obligation | every keyset row |
| 3 | `nonempty` | on string, list, map | 8 — ch8-C9, C11, C15, C17; ch11-C3, C13, C40; ch13-C3 |
| 4 | `grammar: /re/` | scalar value grammar | 6 — ch8-C8, C10; ch11-C6, C17; ch12-C3; ch13-C2 |
| 5 | `keyGrammar: /re/` + `keyLaneAt: container\|segment` | open-map key class + the finding's path grain | 3 — ch8-C10; ch11-C2; ch13-C2 |
| 6 | `sourceForm: plainDecimalInteger` | the raw-source ladder (alias-free, anchor-free, tag-free, `^[1-9][0-9]*$`) | 2 — ch8-C8; ch11-C12 |
| 7 | `resolvedForm: safeInteger, min:` | the value-side integer belt | 4 — ch8-C8; ch11-C10, C12, C13 |
| 8 | `enum: [...]` | allowlist | 6 — ch11-C10, C11, C14, C15, C16; ch12-C1 |
| 9 | `default:` | materialized ONCE at admission | 8 — ch11-C11, C14, C16, C17, C38; ch12-C1, C4; ch13-C17 |
| 10 | `removed: {form → migration message}` | fail-loud removal (§8.2 rule 3) | 3 — ch8-C25; ch12-C2, C7 |
| 11 | `unique: {grain: perOccurrence, at: index\|container}` | duplicate lane + its path grain | 3 — ch8-C17; ch11-C40; ch13-C8(e) |
| 12 | selectors: `keys($.p)`, `values($.p)`, `collect($.a.*.b)`, `union(..)`, and the relations `memberOf` / `keysSubsetOf` / `disjointFrom` / `equals` | intra-document reference rules | 7 — ch8-C16, C17, C18, C19; ch11-C2, C40; ch13-C8(c) |
| 13 | `gating: true` + `dependsOn: [row]` | suppression beyond the implicit container rule | 3 — ch8-C16; ch11-C2, C15 |
| 14 | `variant: {on: <sibling>, cases: {...}}` | discriminated-union config shape | 3 — ch11-C14, C15, C17 |
| 15 | `valueClass: <name>` | reusable named value class | 3 classes over 5 rows — ch8-C14/ch12-C7; ch13-C4/C6; ch11-C12 |
| 16 | `delegate: registry(<field>)` | hand-off to an injected registration's own declaration | 5 — ch11-C5, C8, C10, C11, C13 |
| 17 | `code:` | the named-lane issue code (closed namespace) | 7 rows — ch11-C8, C14, C15, C16, C19, C21; ch12-C5; + ch13-C7 unbuilt (corrected at round 2, F4: the earlier cell counted CODE VALUES, not rows, and omitted the C14/C15/C21 coded lanes) |
| 18 | `message:` | the lane's message template (the parity carrier) | every finding-bearing row |
| 19 | `raw` | uninterpreted pass-through (substrate gates only) | 2 — ch8-C14; ch12-C3 |

Two further constructs are used by exactly ONE row each and are
therefore NOT in this table: they are the §2.4 borderlines, and their
rows sit in residual R7 until the ADR rules on them.

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
  [d-aliases]    resolve.aliases: substrate ;                   # ch8-C5
                 resolve.expansionBound: substrate (throws at the resolve
                   stage, mapped to a resolve finding — the guard is the
                   library's, the DECLARATION is that a bound exists and
                   where it surfaces) ;
                 resolve.graph: acyclic (a validate-stage finding)
  [d-source]     engine.sourceAccess: true    # C5's named exception: the
                 # validate stage may read the source node (C8/C12 need it)
  [d-stages]     stages: read, parse, resolve, validate, store  # ch8-C36
  [d-order]      parse.findingOrder: [directive, errors, warnings],   # ch8-C2/C20
                 within each class: the parser's array order
  [d-findings]   finding, TWO variants:                         # ch8-C20/C21
                 substrate  {stage, line?, col?, path?, code?, message}
                   — read/parse/resolve; exempt from path accumulation
                 structural {path, message, code?}
                   — validate/store; accumulate: all ;
                     containerPrecondition: implicit
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

Two constructs failed the ≥2-row test as separate constructs. They are
named here rather than buried, because the ADR's falsifiability
criterion turns on exactly this kind of item. From the arm round-1 fold
until the ADR-019 ratification their two rows were held in residual
**R7** instead of being counted as declarable; **both were ADMITTED at
that act (D8, 2026-08-05)** — not as new constructs, but as widenings
of the selector root and of the `code` attribute, each of which already
carried 7 rows. Their rows are now `S`, and R7 is resolved empty.

| Construct | Rows using it as a distinct construct | Disposition — RULED 2026-08-05 |
|---|---|---|
| `memberOf: keys(@gateCatalog)` — a selector root that is an INJECTED set, not a document node | 1 (ch11-C8's `uses` resolution; ch12-C16 explicitly does NOT resolve providers at admission) | **ACCEPTED** — a generalization of the selector root, which already carries 7 rows. The rejected alternative would have kept a one-line code lane for a pure membership test. |
| per-member `code:` inside `enum` (ch11-C16's `failInstance` gets its own distinct code) | 1 | **ACCEPTED** — the `code` attribute (7 rows) applied at member grain, not a new attribute. The rejected alternative would have sent ch11-C16's disposition lane to prose. |

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
| C2 | document API; errors+warnings promoted, ordered | S | `[d-warnings]` `[d-order]` `[d-findings]` | Δlib | file |
| C3 | one document per file | S | `[d-docs]` | Δlib | file |
| C4 | duplicate map keys reject | S | `[d-dupkeys]` | Δlib | file |
| C5 | aliases resolve; amplification bound; acyclic; source exception | S | `[d-aliases]` (expansionBound added at arm F1) `[d-source]` | P/Δlib | file+both |
| C6 | strict UTF-8 decode | S | `[d-read]` | Δmsg | file |
| C7 | root fixed keyset (5 required) + additive growth | S | `[d-root]` (growth clause → ADR format-growth rule) | Δmsg | both |
| C8 | `ref` map; id grammar; version source ladder | S | `[d-ref]` `[d-ref-id]` `[d-ref-version]` | P | file (source half) |
| C9 | `steps` nonempty map; step keyset | S | `[d-steps]` `[d-step]` | P | both |
| C10 | one id grammar for step/terminal/role/event ids | S | `id-class` on `[d-steps]` `[d-terminal]` `[d-roles]` `[d-transitions]` `[d-role-ref]` | Δmsg | both |
| C11 | `instruction` nonempty string, no normalization | S | `[d-instruction]` | P | both |
| C12 | `transitions` map, may be empty | S | `[d-transitions]` | P | both |
| C13 | fixed vs open maps; unknown-key fail-closed | S | `kind:` + `[d-findings]` | Δmsg | both |
| C14 | `agentConfig` raw at validate; domain delegated to ch12-C7 | S | `[d-agentconfig]` `[vc-agentconfig]` | P | both |
| C15 | roles entry keyset; `defaultActor` | S | `[d-roles-entry]` `[d-defaultactor]` | P | both |
| C16 | role set: declared == used, both directions | S | `[d-roleset]` + `dependsOn` for the reliability suppression (reclassified from H at arm F5: `dependsOn` covers the whole obligation) | P | both |
| C17 | `terminal` nonempty, unique, disjoint from steps | S | `[d-terminal]` | Δpath | both |
| C18 | `start` ∈ keys(steps) | S | `[d-start]` | P | both |
| C19 | transition target ∈ steps ∪ terminal | S | `[d-target]` | P | both |
| C20 | positional read/parse/resolve findings + ordering | S | `[d-findings]` substrate variant + `[d-order]` `[d-stages]` (both added at arm F9/F10) | Δlib | file |
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

ch8 tally: **S 28 · H 0 · Sem 1 · N 9** = 38.

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
| C8 | static registry; admission resolves `uses`; coded lane | S | `[d-uses]` `memberOf: keys(@gateCatalog)` — the injected-set selector root ADMITTED by ADR-019 D8 (2026-08-05); registry composition half is non-lane | P | both |
| C9 | registry member axes (implementation/execution) | N | registry data | — | — |
| C10 | `declarative.threshold` config keyset + allowlists | S | `[d-gc-threshold]` (block semantics is runtime) | P | both |
| C11 | `previous_reviewer_verdict` config; absent ≡ `{required:true}` | S | `[d-gc-verdict]` | P | both |
| C12 | every authored integer follows the source ladder | S | `[vc-authored-int]` | P | file (source half) |
| C13 | `external.process` config keyset; command semantics | S | `[d-gc-process]` (shell/cwd semantics is runtime) | P | both |
| C14 | `output.mode` enum + `exitCode` default | S | `[d-gc-process]` output | P | both |
| C15 | `onExit` required in exitCode mode; both buckets; unconsumed otherwise | S | `[d-gc-process]` `variant` | P | both |
| C16 | dispositions; `failInstance` distinct code | S | `[d-gc-process]` enum with per-member `code:` — ADMITTED by ADR-019 D8 (2026-08-05) as the `code` attribute at member grain | P | both |
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

ch11 tally: **S 22 · H 0 · Sem 2 · N 17** = 41 (C8 and C16 moved H → S
at the ADR-019 ratification, 2026-08-05 — D8 admitted both constructs).

### 3.3 ch12 — runtime-core (27 rows)

| Row | Rule | Cls | Declaration / reason | Par | Ch |
|---|---|---|---|---|---|
| C1 | `activation` map; `mode` required; enum; default | S | `[d-activation]` `[d-act-mode]` | P | both |
| C2 | `runtimeContext` domain: the string `none` or a spec map; `required` retired | S | `[d-rtc]` union + removed | Δmsg | both |
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
| C4 | `promptConcernRefs` in the two agentConfig positions | H | `[d-ctx-refs]` `[vc-blockidlist]`; its template-wide skip of C8(c) is a member of **R2** (listed there since arm F5) | P | both |
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
| L8 | every-stage catch → `internal validator failure` (270) | ch8-C36 ("no load input may produce an uncaught throw (C22 binds every stage)") + ch8-C22 | `[d-stages]` — the lane IS ratified; only its literal message and `$` path are implementation-selected (corrected at arm F3) |

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
| V26 | gates-subtree key stringness (281, 491) | ch11-C2 → ch8-C10 (gates keys ARE event types, and event types are nonempty strings — corrected at arm F4) | `[d-gates]` keyGrammar |
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
ratified row).** ONE survives arm round 1; the other two were the
audit's own inventions and are struck:

- **I3** — `admit.ts:265`'s zero-findings failure belt. It guards a
  forged registration, not an authored template; no C-row states it.
  Under `delegate:` it belongs to the delegation contract, not to the
  template's declaration. Carried scope for contract v2.
- ~~I1~~ — STRUCK (arm F3). ch8-C36 states it verbatim: "no load input
  may produce an uncaught throw (C22 binds every stage)". Only the
  message text and `$` path are implementation-selected, which is a
  parity item, not an orphan.
- ~~I2~~ — STRUCK (arm F4). ch11-C2 makes every `gates` key an event
  type under ch8-C10's grammar, and ch8-C10 requires event types to be
  nonempty STRINGS. The scan is ratified twice over; the audit's
  earlier claim that the schema direction gave it "a ratified home for
  the first time" was false.

### 3.6 Classification totals

| Class | ch8 | ch11 | ch12 | ch13 | Total |
|---|---|---|---|---|---|
| S — structural | 28 | 22 | 7 | 4 | **61** |
| H — hybrid | 0 | 0 | 0 | 3 | **3** |
| Sem — semantic | 1 | 2 | 1 | 2 | **6** |
| N — non-lane | 9 | 17 | 19 | 10 | **55** |
| **Rows** | 38 | 41 | 27 | 19 | **125** |

Of the 70 rows that carry a definition-validation obligation (S+H+Sem),
**61 are fully declarable, 3 are mixed, 6 are residual** — the state
AFTER the ADR-019 ratification (2026-08-05). Before that act it read
59/5/6: ch11-C8 and ch11-C16 were held in R7 precisely so this number
could not borrow against an undecided construct, and D8's ruling
released them. Every one of
the 9 mixed-or-residual rows appears by id as a MEMBER of a residual
family in §4, and no `S` row appears as a member (both directions
checked at rounds 1 and 2 — F5 found two rows missing from every
family, F2 found nine `S` rows sitting in member lists, which is why §4
now separates members from affected rows). Zero rows are unclassified.

The membership changed at the fold even though the totals did not:
ch8-C16 moved H → S (`dependsOn` covers its suppression), and ch11-C16
moved S → H (its per-member `code:` is single-use, so §0's own rule
forbids banking it). Recording the swap because a stable total across a
fold is exactly where an unchecked reader assumes nothing happened.

## 4. The residual (named prose/code lanes)

**Two column meanings, kept apart since round 2 (F2).** A **member** is
a row whose OWN obligation is residual — every member is classified `H`
or `Sem` in §3, and every `H`/`Sem` row is a member of at least one
family. An **affected row** is a row whose obligation IS declarable but
whose text authorizes, or whose findings are shaped by, the residual;
affected rows stay `S`. Mixing the two was making nine `S` rows read as
inexpressible.

| Id | Residual | Members (`H`/`Sem`) · affected rows (`S`) | Why it cannot be a declaration |
|---|---|---|---|
| **R1** | resolution against a value-shaped target | ch13-C7 (entry belt) | C7 requires the target VALUE to satisfy another node's declaration, evaluated at reference time. See §5 F2 — under ONE engine this shrinks to a membership test. |
| **R2** | unreferenced-entry hygiene with a template-wide skip | ch13-C8(c); ch13-C4's skip clause (the ref-container failure that disables the check template-wide) | The set-difference itself IS declarable (`keysSubsetOf: collect(raw: …)`, the same construct `[d-roleset]` uses). What is not: the RAW-member domain (grammar-failing members still count as references) plus the skip-the-whole-check-if-any-ref-container-failed rule. Both are expressible only as a rule-specific predicate — the single-use smell. |
| **R3** | existential cross-rules over resolved registrations | ch11-C19, ch12-C5 (one lane, one code) | "IF any binding resolves to a registration whose `requiresRuntimeContext` is true THEN `$.runtimeContext` must be a spec map" is a conditional over a DERIVED property of an injected object. A `when:` general enough to express it is an expression language — the thing ch11-C10's own text refuses. |
| **R4** | admitted-form derivation (a produced VALUE, not a verdict) | **Members:** ch11-C39 (`advancesRound` expanded per transition); ch13-C17 (rebuild, normalize-or-`{}` predicate, normalized sibling fields); ch13-C2 (the non-string-key filter into the built catalog). **Affected:** ch11-C20 (the "materialized ONCE at admission" home) and the per-registration defaults ch11-C11/C14/C16/C17 — these are plain `default:` declarations, so they are NOT members (round 2 corrected both directions here: F8's fold had named the effective config a member with no row id, F5 then showed C11 missing from that list, and the right answer was that the whole default set is declarable and only the DERIVATION is residual) | These are TRANSFORMS, not validations. A declaration says what is legal; it does not compute the admitted shape. The engine therefore owes a second capability — emit a normalized value — and the ADR must name it explicitly rather than let "schema" be read as covering it. |
| **R5** | cross-artifact checks outside the document | ch8-C27 (declared `ref` vs matched filename) | The operand is the filesystem listing, not the document. Stays a store-stage lane. |
| **R6** | substrate-owned behaviour — a PARITY residual, carrying no obligation residual | **Members:** none. **Affected:** ch8-C1/C2/C3/C4/C20 (message TEXTS) and ch8-C5 (the expansion bound) — all `Δlib` | Each obligation IS declared, as a flag with its surfacing stage; what the engine cannot own is the WORDING, which the YAML library emits. Parity here is library-version parity, not engine parity. The ORDER of those findings is NOT in this family — it became `[d-order]` at the round-1 fold (F9). |
| **R8** | **boundary-kept: a rule the vocabulary CAN express, kept in code by an architectural boundary** (added 2026-08-06 — see the amendment note below) | **Boundary-kept rows:** ch11-C12's SOURCE half (the uses-scoped plain-decimal ladder on `declarative.threshold`'s `value` and `external.process`'s `timeoutMs`). Its members stay `S`, which is what distinguishes this family from R1–R6 | NOT an expressiveness failure. `sourceForm: plainDecimalInteger` is an ADMITTED construct with two independent rows (§2.2 #6), and the declaration for these two fields exists on paper as `[vc-authored-int]`. What blocks it is COMPOSITION: the `delegate: registry(uses)` hand-off cannot carry the CHANNEL into a registration, because `GateRegistration.validateAndNormalizeConfig(raw)` takes only the value, and `gates/**` may not value-import the definition engine (ch11-P2a G1, lint-enforced). Removing the block is a port-shape act, not a vocabulary act. |
| **R7** | rows whose only declaration uses a single-use construct | **RESOLVED EMPTY, 2026-08-05.** Former members: ch11-C8, ch11-C16 — both moved to `S` when ADR-019's D8 admitted their constructs as widenings of the selector root and of the `code` attribute, neither being a new construct. The family id is KEPT so a future single-use candidate has a home and this ruling stays legible | The family's purpose was to stop the coverage number borrowing against an undecided construct. It did its job for exactly one ratification cycle, which is what it was for. |

**AMENDMENT, user-ratified 2026-08-06 — the residual is EIGHT families.**
The P3 build filed ch11-C12's source half under **R7**, and the
2026-08-06 design review (`ch13-rederivation-arm/p3-design/`, finding F3)
showed that was a category error: R7 is "rows whose only declaration uses
a construct the ADR has NOT admitted", and this construct IS admitted.
The obstacle is a composition boundary, so the row needs a family that
says so. **R7 returns to RESOLVED EMPTY** (its purpose — stopping the
coverage number borrowing against an undecided construct — is intact and
unused), and **R8 is born** to hold rules that are declarable, declared on
paper, and kept in code by an architectural limit.

Why this matters more than a relabelling: ADR-019's D9.3 tripwire fires
when the residual grows past the AUDITED family ids. Filing a new KIND of
remainder under an old id left that tripwire reading green while the thing
it watches for had happened. The count is now eight, and a future
boundary-kept rule has a visible home instead of a borrowed one.

**No classification number moves.** R8's members stay `S` — their
obligation is expressible — so the 61 · 3 · 6 tally in §3.6 is unchanged
by this amendment. A reader hunting for a moved number should stop here.

### 4.1 Verdict on the plan's prediction

Plan §3 (P3) predicted the residual as: *reference resolution,
unreferenced hygiene, event-grain suppression, per-occurrence
duplicates*. The table CHECKED it rather than assuming it:

| Predicted | Verdict | Basis |
|---|---|---|
| reference resolution | **PARTIALLY REFUTED** | Intra-document references are declarable with one selector vocabulary (`[d-start]`, `[d-target]`, `[d-terminal]` disjointness, `[d-gates]` subset, `[d-round-list]` membership, `[d-roleset]` — 6 independent users). Only the value-shaped belt (R1) and the cross-artifact check (R5) remain. |
| unreferenced hygiene | **PARTIALLY REFUTED** | The set operation is the SAME construct as ch8-C16's role-set equality, which has been shipped and green since ch8. What is residual is C8(c)'s raw-member domain and its template-wide skip, not the hygiene idea. |
| event-grain suppression | **REFUTED** | `keysSubsetOf: keys(../transitions)` + `gating` expresses ch11-C2's dead-config lane and its dependent suppression. Independent ROWS using the construct: 3 — ch8-C16 (whose three tags are one row, corrected at arm F6), ch11-C2, ch11-C15. Three ≥ two, so the verdict stands on the corrected count. |
| per-occurrence duplicates | **REFUTED** | `unique {grain: perOccurrence, at: index\|container}` covers ch8-C17, ch11-C40 and ch13-C8(e) — 3 independent rows. The `at:` attribute exists precisely because the three measured lanes DISAGREE on path grain (§5 F3). |

**SIX residual families the prediction did not name** (five at the audit,
plus R8 at the 2026-08-06 amendment) — the honest
counterweight, corrected at round 2 (F3: the sentence still said "two"
after R7 was born):

| Family | Why the prediction missed it |
|---|---|
| **R3** existential cross-rule | The predicted list was drawn from the ch13 surface; this one lives on the ch11/ch12 gate↔workspace seam. |
| **R4** admitted-form derivation | The largest and the most consequential: not a leftover lane but a SECOND CAPABILITY. If the ADR does not name it, "schema" will be read as covering ground it does not cover. |
| **R5** cross-artifact check | A boundary class — the operand is the filesystem, so arguably outside any format schema's remit. Named anyway. |
| **R6** substrate-owned wording | A parity class, not an obligation class (see the table). |
| **R7** undecided constructs | Did not exist before this audit: it is the by-product of applying §0's own admission test honestly. |
| **R8** boundary-kept (added 2026-08-06) | Could not have been predicted from any surface's rules: it is not a property of the FORMAT at all, but of the module and port boundaries the engine has to live inside. It became visible only when a build tried to place a declarable rule and could not reach it. |

R5 and R6 are boundary/parity classes and could fairly be called out of
the prediction's scope; R3, R4 and R7 could not. The prediction was
made about a surface (ch13) and is being checked against four — that
asymmetry is stated here so the verdicts above are not read as a
scorecard against the plan.

## 5. Findings for the ADR

- **F1 — the direction survives the enumeration.** 61 of 70
  obligation-bearing rows are fully declarable; the residual is six
  families carrying members (plus R7, resolved empty; plus R8, added
  2026-08-06 and holding one boundary-kept row), four of them one
  or two rows each. Nothing in the 125 required a per-rule special case
  in the vocabulary — the §0 admission test caught exactly two
  single-use candidates and held their rows OUT of the coverage number
  until ADR-019's D8 ruled on them (both admitted, 2026-08-05, as
  widenings of constructs that already passed the test rather than as
  new constructs). The number the ADR was authored against was 59; the
  standing number after the ruling is 61. Both are recorded, because
  the interesting fact is that the audit could not have moved itself.
- **F2 — the schema direction dissolves ch13-C7's entry belt (DERIVED).**
  C7's belt exists because the direct-construction channel had no walk:
  a cast-forged catalog entry could not be refused structurally, so
  resolution had to re-check the value's shape. Under ONE engine
  running ONE declaration on BOTH channels, `[d-ctx-entry]` fires on the
  malformed entry directly and C7 reduces to `memberOf:
  keys($.contextBlocks)`. The belt and its normalization class account
  for THREE of the ch13 draft's four ratified reopens — the 2026-08-01
  direct-channel act (which reopened C7 itself) and the 2026-08-02 pair
  on C17/C8(c); C7's own text was reopened once (verified against the
  four reopen records in the superseded contract, 2026-08-05). **The
  dissolution claim is DERIVED, not measured**; its named measurer is
  the P4 contract-v2 panel's channel-symmetry family plus the build's
  parity gate.
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
- **F6 — ONE implemented lane has no ratified row, not three.** The
  first draft of this audit flagged three orphans; the arm round showed
  two of them (I1, I2) are ratified verbatim by ch8-C36 and by
  ch11-C2 → ch8-C10. Only I3 — the delegation belt against a forged
  registration — survives, and it belongs to the delegation contract
  rather than to the template surface. Carried scope for contract v2.
  Recorded as a lesson in its own right: the reverse-direction sweep
  produced two INVENTIONS at a 2-in-3 rate, in a document whose forward
  sweep was clean. Reverse claims ("nothing states this") are negative
  existentials and need a grep each, exactly like a citation.
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

## 7. Verification record (the bounded loop, plan §6: 3 rounds max)

**Round 1 — 2026-08-05, basis `d506722e…` at HEAD `2044b3bf`.** Charter
`ch13-rederivation-arm/p3/arm-round1.md`, pin gpt-5.6-sol/high, 450s,
guards clean. Verdict: **10 IN-SCOPE · 0 CARRIED-SCOPE · 0 UNRUN**, all
six lenses completed. The two lenses that carry the coverage claim came
back CLEAN and are the round's most load-bearing result:

- row coverage both directions — every `C<n>` id in the four contracts
  appears in §3.1–§3.4 and vice versa, 125/125, no orphans either way;
- declaration-tag closure — 50 tags defined in §2.3, 50 cited in §3,
  difference lists empty in both directions. (Those two numbers are the
  round-1 BASIS measurement, not the current state: the fold added
  `[d-order]`. Re-derived after the round-2 fold, the closure is 51/51
  with both difference lists empty, and it holds whether the citation
  scan covers §3.1–§3.4 or all of §3 — the scan-range dependence round
  2's F1 found is closed by citing `[d-role-ref]` on ch8-C10's row.)

All ten findings were folded into this document (F1–F10 cited inline at
the fold sites). By class: **4 INVENTIONS** — two false orphan flags
(I1, I2), one unanchored residual member (R4's effective config), one
counting-grain error inflating a prediction verdict's basis (5 tags
reported as 5 rules); **4 OMISSIONS** — the alias expansion bound, the
parse-diagnostic ORDER, the substrate finding SHAPE, and two hybrid
rows missing from every residual family; **1 INTERNAL CONTRADICTION** —
§0's own single-use rule not applied to the two constructs §2.4 flags,
which is what created residual R7; **1 FORMULA DEFECT** — the emit-site
counting rule double-counted `load.ts` (the total is unchanged at 112;
the rule now states the exclusion).

Net effect on the audit's headline: the class TOTALS did not move
(59/5/6/55) but two rows swapped classes, the orphan count fell 3 → 1,
and a seventh residual family was born. Nothing in the fold touched the
enumeration itself.

**Round 2 — 2026-08-05, basis `75a7ec6d…` at HEAD `74ecc781`.** A
re-check charter on the FOLDED bytes (`p3/arm-round2.md`), same pin,
440s, guards clean, same threat model. Verdict: **5 IN-SCOPE · 0
CARRIED-SCOPE · 0 UNRUN**, six lenses completed.

The round's shape is the point: **10 → 5, and the class of defect
changed**. Round 1 found four inventions and four missing obligations —
defects in the audit's substance. Round 2 found none of either. All
five are bookkeeping consequences OF the fold: one declaration tag left
uncited in the coverage tables (it was cited in §3.5, so the closure
check's answer depended on its scan range); nine `S` rows sitting in
residual MEMBER lists, which the members/affected split now separates;
a stale "two unpredicted families" sentence after R7 was born; the
`code:` vocabulary cell counting code VALUES where the column promises
rows; and R4's ownership list still incomplete after round 1's F8 — the
right correction being to remove the whole default set from the members
(plain defaults are declarable) rather than to extend it, which also
answers round 1's F8 more accurately than round 1's own fold did.

Row-id coverage (125/125) and the class tallies were re-verified
independently before the round and held. Two rounds of the three-round
budget are spent; the third is unspent and is the user's call at the
arc stop.
