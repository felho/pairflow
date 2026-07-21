# Task Packet: ch11-P4 — the format extension (YAML gate declarations · round + runtimeContext keys · the source-form validator lanes · the CLI validate extension · template-fixture restoration)

Plan step: plan.md §11.4 P4 row — the chapter's format walk (§11.1
item 5): the YAML gate-declaration surface (`gates`, the process-config
keys, `runtimeContext`, the `round` declaration key with C40's
source-form lanes), the validator lanes driven through the file
channel, the CLI validate extension, and the template-fixture updates
(the shipped template and `fixtureTemplate()` gain the round
declaration TOGETHER under the ch8-P2 equality pin; the P2c window
wrappers retire here). Draft anchors (= the manifest's ANCHORED-row
C-ref union; the derived rows additionally cite C2 as a derivation
input): `contract:ch11-gate-format` rows
C1/C4/C6/C12/C18/C20/C21/C28/C37/C38/C39/C40 (their file-channel /
source-form shares — the value-level and admission-semantic shares are
P2a/P2c/P3a-built) plus `contract:ch8-template-format` rows
C7/C8/C31/C38 (the growth clause, the integer source ladder, and the
CLI doc shapes this surface rides). The real spawn, provisioning, and the ref-supplying start
surface are ch9's; deferred execution is a later lifecycle slice.
Plan alignment: none — the plan's P2c/P3b rows name this packet's
reciprocals by name ("until P4", "P2c's window wrappers retire here");
no decision here contradicts ratified plan text.
Autonomy stage: measurement (the plan row predicts flag-free
approve → autonomous build; the §5.5 fallbacks stand — EXERCISED at
this packet: the F1 new-decision flag routes the approve to the
human, STOP `4:flagged-approve`). Not first-of-a-kind: the
format-walk class has precedent (ch8-P1 built the validator lanes),
the migration/activation-through-the-file-channel class has precedent
(ch8-P2 wired the file store + the first journey), and the CLI-doc
class has precedent (ch6-P4, ch8-P2).
Classification: **projection** — manifest tally: 13 anchored /
5 derived / 1 new-decision (machine-counted from the `packet_rows`
block). The one new-decision row (Y6's start-classification pick) is
below the Case-B threshold and touches no
authority/separation/availability-class semantics; it rides as flag
F1 to the approve — the approve is therefore FLAG-BEARING (STOP
`4:flagged-approve`): the human's act, which ratifies it. Every
other decision point was ratified at the gate-format draft
(2026-07-12, incl. the reopen's C37–C41) or derives from built
packet rows with an in-row note.

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

Operability packet (R-EMPTY-SLICE; the ch8-P1 precedent): the format
surface carries zero kernel semantics — all 20 chapter unit ids, all
7 behavioral rejections, all 15 invariant dispositions, and all 3
golden traces are P0–P3b-owned and realized. This packet's claim
surface is its canonical contract matrices. Coverage axes unchanged —
an assertion the close verifies (units 25/159, invariants 23/116,
traces 5/20), not an omission.

## Sizing/risk (template §2 step 0 — materialized)

Predicted class (plan §11.4): **projection** (basis: the ratified
draft). Discovered at authoring: **projection with ONE new-decision
row** — the P3b-deferred S2 CLI classification is a genuine selection
(both end-states conform; Y6's decision note) and rides as flag F1 to
the human approve; every other point projects.

Axes:

- **authority movement: none.** Admission stays THE single semantic
  authority (C20 — the walk feeds it and adds no second validation
  home); the store, kernel, and registry are byte-untouched.
- **surface spread:** one concept (the format extension) across the
  definition module (the walk + three admission lanes — one module
  family), the shipped template + fixture pair (one paired edit under
  the equality pin), and the CLI (one eager pre-check + doc
  lanes). Trips hard stop 2 by letter at three surfaces — closure
  proof below. Testkit: `fixtureTemplate()` changes VALUE only (no
  new fake/seam/fixture type — its type and consumers' shapes are
  unchanged; the wrapped value ≡ the new fixture value), so it does
  NOT count under the surface rule; the pin test is the mechanical
  witness.
- **identity/join fragility: none** — no cross-seam identity; the
  walk's output is the same in-memory value the direct channel
  constructs.
- **foundation + activation coupling:** this IS the chapter's
  declared activation share at the FILE grain — the P2a/P2b/P2c/P3a/
  P3b-built foundation (admission lanes, gate rung, round machinery,
  process contract) becomes reachable from the shipped file channel.
  The packet's own new foundation is the walk extension only, whose
  sole consumer is the same admission call — no separable seam (the
  plan's P4 row pins exactly this bundle).
- **prerequisite coupling: none** — P2a–P3b are built; ch9 depends on
  this chapter, not the reverse.
- **acceptance multiplicity:** validator lanes + the pin/golden
  integrity + the journey — 3 success classes at 3 surfaces; the
  below-hard-stop escalation combination does NOT fire (it needs 4+
  surfaces).

**Hard stop 2 (letter-tripped, closure-proven; single-packet allowed:
yes).** The plan's ratified P4 row IS this bundle (the chapter cut
already quarantined admission semantics to P2a/P2c/P3a and execution
to P2b/P3b; what remains is the one format walk and its shipped
consumers). One bounded code change closes every touched surface: the
walk cannot ship without the keyset growth, the shipped
template/fixture pair must move together or the equality pin breaks
(the pin makes a partial edit MECHANICALLY red), and the CLI lanes are
the walk's own doc surface (C28: no new verbs or flags). ONE proof
surface (`v3:test` + the bridges) validates all of it; the same
consumers own the fallout; no per-consumer-family review loop; no
compatibility/diagnostics/read-projection/recovery/ordering risk is
introduced. Hard stops 1/3–10: no authority moves, no unfinished
prerequisite, no competing authority paths, no fragile-join cutover,
no persisted-schema change, no proof-source move, no
rollback/lock/ordering change. Hard stop 11 (reusing an existing
proof contract): the ch8 validate/load suites EXTEND additively —
every existing lane stays byte-identical except the closed edit
inventory (Y8); explicitly narrowed reuse, stated, not silent.

Consume-family scan (from the tree, 2026-07-17):

| Family | State | Evidence |
|---|---|---|
| producer / validator-gate | present — extended | `v3/src/definition/validate.ts`+`load.ts` (the walk), `admit.ts` (three lanes); `gates/` byte-untouched |
| persistence / replay | absent — unchanged | no store change; `v3/src/store/` byte-untouched |
| execution consumer | present — byte-untouched code, NEWLY REACHABLE | the kernel's gate/round/process paths now receivable from file-loaded templates (the activation; zero kernel edits) |
| read / presentation | present — unchanged | floor/CLI read shapes byte-untouched (`gateDecisions`/`round` ride as built) |
| recovery / cleanup | absent | no such surface on this slice |
| external / integration | present — one eager pre-check + doc lanes | `cli/main.ts` (Y6's eager gate before store/kernel construction); the C31/C38 docs carry the new findings unchanged in kind |
| testkit | present — value-only | `fixtureTemplate()` gains the declaration (no contract change; the pin test is the witness) |

**R-ACTIVATION-JOURNEY disposition (the rule FIRES):** this packet
wires previously-built foundation into the live path reachable from
the shipped entrypoints (a gate-declaring template becomes loadable by
`start`/`submit`). The discharge is Y5's gated journey scenario —
subprocess, production bindings, a test-authored gated template file
as the operator-authored input artifact, full lifecycle from file to
end-state reads. Deterministic by construction (the journey drives
`submit` directly; no actor stubs needed).

Conditional annexes: **closure-budget** — buckets touched: validation
(the walk + lanes) and the shipped-template value; the read-projection
and shared-contract buckets are untouched (no shape changes anywhere
downstream); named deferrals: the ref-supplying start surface + real
spawn + provisioning (ch9), deferred execution (`gate_pending`, a
later slice), the inert-configuration detection (C38's named
non-decision — unchanged here). **Proof-boundary N/A with declared
edits** — no proof contract moves; the closed golden-edit inventory
is Y8's (each a C38-sanctioned restoration or a staging-window
reciprocal, never a proof relocation). **Mutable-flow N/A** — no
side-effecting flow changes; the walk is pure over parsed input.

## Claim + dimensions (enumerated BEFORE deriving test obligations)

The Claim, stated wide; every completeness clause carries its closed
form (R-CLAIM-GRAMMAR):

1. **Authoring reach + channel equivalence (PARAMETERIZED).** Every
   ratified gate-format authoring key (membership owner: the draft's
   keyset rows — C1/C4/C5 gate maps, C10/C11/C13–C17 config keysets,
   C18 `runtimeContext`, C37 `round`) is authorable through the file
   channel: a well-formed gated YAML template loads to an ADMITTED
   template — effective configs materialized, complete
   `advancesRound` maps — DEEP-EQUAL to the admission of the
   equivalent directly-constructed value (the walk adds and subtracts
   NO semantics; admission stays the one authority).
2. **Validator lanes (PARAMETERIZED).** Every member of the declared
   lane inventory (membership owner: C21's lane list + C40's
   source-form share + F6's C12 ladder + F1/F2's keyset-growth
   lanes) is driven through the FILE channel and able to fail on its
   row's meaning. Source-form defects — which the resolved value
   cannot carry — are format-walk findings (F5/F6); everything
   semantic is admission's; all findings ride the ONE validate-stage
   channel, accumulating across independently-traversable lanes with
   LOCAL container suppression (F7).
3. **Shipped-surface restoration (SCOPED).** The shipped
   `local-pair-v0@1.yaml` and `fixtureTemplate()` gain
   `round: { advanceOnArrivalAt: [implement] }` TOGETHER — C38's
   per-template restoration of the model's exhibited start-arrival
   behavior; the ch8-P2 equality pin holds with ZERO edits to the pin
   test itself; the P2c window wrappers retire (the three
   fixture-spread sites collapse to `admit(fixtureTemplate())`);
   every golden trace table stays byte-identical. Named exclusions
   with homes: the l2/l2a traces' own direct-constructed templates
   keep their inline declarations (never wrappers); the
   declaration-absent default stays driven at the kernel/admission
   grain (P2c-built) and at the file grain by F8's default lane.
4. **CLI surface (PARAMETERIZED).** No new verbs and no new flags
   (C28). The new lanes ride the built doc shapes verbatim: dev
   `validate` exits 0 with `{valid: true, ref}` on a valid gated
   file and 1 with the `TemplateInvalid` `{stage, findings}` doc on
   a defective one (coded lanes carrying their `code` — the A9
   carrier); the write verbs surface the same doc (ch8-C38, one verb
   driven); `start` on a `runtimeContext: required` template fails
   EAGERLY at the verb's own pre-loaded template with USAGE exit 2
   (Y6 — zero store/kernel construction; the shipped CLI can supply
   no ref until ch9, stated), the kernel's S2 lane remaining the
   AUTHORITY backstop whose CLI reachability is race-only and
   INTERNAL by construction (the grid's cells).
5. **Non-change (SCOPED).** Outside the declared mutation boundary,
   shipped behavior is unchanged: every pre-P4 ACCEPTED loadable
   file loads byte-identically EXCEPT the shipped template's own
   declaration effect (the journey pass-back round 1→2 — Y8's
   declared golden edit); previously-REJECTED files carrying the new
   keys now take the new lanes' semantics (the P2a A8 staging window
   closes BY DESIGN); the kernel, store, gates module, floor, diag,
   and read shapes are byte-untouched; the full existing suite stays
   green with exactly Y8's closed edit inventory.

Dimensions:

1. **Keyset growth, both directions (F1/F2):** root accepts optional
   `runtimeContext` + `round` and step accepts optional `gates`
   (each driven positive); every OTHER unknown key still rejects —
   incl. the cross-placements (`gates` at root, `round`/
   `runtimeContext` at step grain) and `kind` still reserved.
2. **Round source-form ladder (F5, C40's P4 share):** `round`
   present but not a map — a scalar, a list, AND present-NULL
   (`round:` with nothing after the colon — never C38's absent
   default) → ONE finding at `round`, dependents suppressed;
   unknown key in the round map; `advanceOnArrivalAt` MISSING (the
   empty `round: {}` map); a non-list value (string and map forms);
   a non-string member (the GP6 unquoted-numeric member — a NUMBER
   at the resolved grain); plus the positive: a valid declaration
   admits with the expected maps.
3. **The C12 source ladder per field (F6):** for `config.value` and
   `config.timeoutMs` each: float form (`900.0`), hex (`0x384`),
   exponent (`9e2`), quoted/string form (`"900"`), anchored,
   aliased, tagged — each a validate finding at the field's path;
   the plain-decimal positive admits; zero and negative forms fail
   the `^[1-9][0-9]*$` source rule (the value-level halves are
   P2a/P3a-built upstream of this ladder — proof boundary).
4. **Gates subtree through the file channel (F3 + the C21 lanes):**
   every C21 lane driven with YAML-staged fixtures — container
   preconditions (a scalar `gates`, a scalar event list, a scalar
   binding, scalar `config`/`output`/`onExit`/`reason`), the
   non-transition event key, the empty list, the binding unknown
   key (A1), `uses` missing / grammar-invalid (A2) /
   unknown-but-grammatical (coded), the config keyset + allowlist +
   disposition + reason-grammar lanes, `onExit` unconsumed under
   gateDecisionJson mode, `runtimeContext` illegal value (A3), and
   the C19 cross-rule with its code; plus the key-STRINGNESS lane
   (a numeric map key inside the gates subtree — the GP2 identity
   class — is a finding, never a silent drop). The A-rows'
   BOTH-CHANNELS letter is driven on the DIRECT channel too: each of
   A1/A2/A3 exercised through `admitTemplate` on a cast-forged
   direct value (owner: the A rows), and A3's accumulation clause by
   the A3+C19 both-findings combination (an illegal `runtimeContext`
   value on a process-gated template → both findings in one result).
5. **Accumulation combinations (F7):** every entry of F7's
   disposition list (a/b/b′/c/d/e) driven — the independent pairs report
   BOTH findings in ONE validate-stage result (structure+gate;
   round+gate — the P2c combination at the file grain), the
   suppression entries suppress exactly their stated scope (root;
   steps container; the per-step LOCAL form — one broken step, the
   other step's gate lane still fires); parse-stage short-circuit
   unchanged (a parse error never mixes with validate findings —
   C36 stands).
6. **Channel equivalence (Claim 1):** the maximal gated template —
   all three evaluators, `round`, `runtimeContext: required` —
   loaded from YAML deep-equals the direct-channel admission of the
   equivalent value (effective configs, `advancesRound` maps,
   every field).
7. **Pin/wrapper/golden integrity (Y2/Y3):** the equality pin test
   green and BYTE-UNEDITED; the three wrapper sites collapsed; the
   four round-2 golden tables + the l0a negative variant
   byte-identical; the validate exact-load literal updated (Y4's
   declared edit) and green.
8. **The file-grain default lane (F8):** a declaration-absent YAML
   template still admits with ALL-FALSE maps (C38's default through
   the file channel — driven against a staged declaration-absent
   file, not the shipped one).
9. **Journey lanes (Y5/Y6):** the gated journey (block at round 1 →
   rejected/`gate_blocked(round_below_min)` with a nonzero exit →
   pass-back → round 2 → allow → DONE, retained `gateDecisions` on
   the timeline); the pass-back scenario's restored round 2 (Y8's
   declared golden edit); `start` on a required-context template →
   the EAGER usage exit 2 with the `StartFailed` doc, side-effect-free
   (no store DB created, no kernel constructed), plus the inner-catch
   ALLOWLIST negative (Y6's by-construction race/internal split).
10. **CLI doc lanes (Y7):** dev `validate` exit 0 on the valid gated
    file; exit 1 `TemplateInvalid` with stage `validate` and the
    coded findings visible for a defective one; ONE write verb
    surfacing the same doc for a gate-defective template (C38's
    lane, new finding content).

## Operative material (projection, not invention)

This is an operability packet: the operative floor is the ratified
draft's own rows (reprinted as anchors in the matrices below — the
draft is bytes in this repo, `contracts/ch11-gate-format-contract.md`)
plus the model's exhibited authoring forms, carried as DATA:

The golden-trace Config views' authoring forms (the model's exhibited
YAML, `code/l2-template-config.new.txt` / `code/l2a-template-config.new.txt`
— the grain the file surface realizes; keys per the ratified rename
culture C13/C15/C16/C18/C37):

```yaml
# the l2 view's shape, at this surface's ratified key grain
round:
  advanceOnArrivalAt: [implement]
runtimeContext: required        # l2a view; value domain: the string "required" (C18)
steps:
  review:
    transitions:
      CONVERGED: done
    gates:
      CONVERGED:
        - uses: declarative.threshold
          config: { metric: round, op: ">=", value: 2 }
        - uses: pairflow.previous_reviewer_verdict
  implement:
    transitions:
      PASS: review
    gates:
      PASS:
        - uses: external.process
          config:
            command: "pnpm test"
            timeoutMs: 600000
            onExit: { zero: allow, nonzero: block }
            reason: { nonzero: test_failed }
```

The shipped template's P4 delta (Y1 — the C38 restoration, the model's
own exhibited declaration):

```yaml
round:
  advanceOnArrivalAt:
    - implement
```

The substrate facts this packet's lanes rest on are the draft's
PROBED record (GP1–GP6, `yaml@2.9.0` — nested gates shapes parse
clean; unquoted `0:` keys are node-level NUMBERS; dotted plain
scalars are strings; `900.0`/`0x384`/`9e2` all resolve to integral
900; empty lists/duplicates parse clean; the round forms incl.
present-null and non-string members parse clean) plus the ch8 P11
probe (the range slice, never `.source`, carries the quoted-form
distinction). No new substrate premise is added; no probe re-run is
required (same pinned yaml version — the lockfile is the gate).

## Canonical format-walk matrix (F)

| ID | Rule |
|---|---|
| F1 | Root keyset growth: the ch8 walk's legal top-level keyset grows to the five ch8 keys + the OPTIONAL `runtimeContext` and `round` (C18 + C37 — C37's stated aggregate; ch8-C7's additive-growth clause is the carrier). Both keys map onto the built `WorkflowTemplate`'s existing optional fields. Every other key remains the ch8 unknown-key finding (`kind` still reserved, ch8-C24); `gates` at ROOT is unknown (it is step surface). (anchored: contract:ch11-gate-format#C18, contract:ch11-gate-format#C37, contract:ch8-template-format#C7) |
| F2 | Step keyset growth: the legal step keyset becomes `role`, `instruction`, `transitions`, + optional `agentConfig`, + optional `gates` (C1's stated aggregate). `round`/`runtimeContext` at step grain are unknown keys. An absent `gates` key means an ungated step (C1's absent semantics — the built value simply omits the field). (anchored: contract:ch11-gate-format#C1) |
| F3 | The gates subtree mapping: the walk delivers the resolved `gates` value into the built step's `gates` slot LOSSLESSLY at the VALUE level — string-keyed maps materialize to own-property records (the `defineOwn`/G8 discipline, the agentConfig materialization culture), lists and scalars pass as-is, deep-equal to the resolved source (value fidelity is the obligation; alias-identity preservation across the subtree is NOT — admission rebuilds configs into effective forms anyway, and ch8's one-memo identity rule remains `agentConfig`'s own realized lane, untouched) — and owns exactly ONE rule of its own: every map KEY anywhere in the gates subtree must be a STRING (the GP2 node-level numeric-key identity class; `mapAsMap` preserves it and a non-string-keyed map cannot become a record — a silent Map fallback would blind admission's own-key scans into dropping the pipeline, the silent-typo class). A non-string key is a validate finding at the nearest addressable path. EVERY other gates lane — container kinds, event-key membership, binding keysets, `uses`, configs — is admission's (C21's one channel); the walk performs NO semantic checks. The `agentConfig` contrast stands: it remains raw and uninterpreted (ch8-C14), Map fallback legal there. DERIVATION NOTE: C2 fixes the keys as event types (strings by grammar) and C20 fixes admission as the ONE semantic authority — the walk's residue is exactly the representability rule the typed slot needs; GP2 is the probed hazard. (derived: contract:ch11-gate-format#C2, contract:ch11-gate-format#C20, prose:packet ch11-p2a A1) |
| F4 | `runtimeContext` mapping: the walk passes the resolved value through to the built template's `runtimeContext` slot without checking it — the illegal-value lane is ADMISSION's (A3, C21's letter), so both channels share one authority; the walk neither legalizes nor rejects any value. (anchored: contract:ch11-gate-format#C18, contract:ch11-gate-format#C21) |
| F5 | The round SOURCE-FORM lanes (C40's P4 share — findings in ch8-C21 `{path, message}` form, container suppression per C21): `round` present but NOT a map — a scalar, a list, or NULL (`round:` with an empty value is PRESENT-null and lands HERE, never on C38's absent-key default) → ONE finding at `round`, dependent lanes suppressed; an unknown key in the `round` map → a finding (C37's fixed keyset: `advanceOnArrivalAt` only); `advanceOnArrivalAt` MISSING (an empty `round` map) → a finding at `round`; its value not a LIST (string and map forms parse clean per GP6) → a finding at `round.advanceOnArrivalAt`; a member that is not a STRING (GP6: an unquoted numeric member resolves to a NUMBER) → a finding at `round.advanceOnArrivalAt[<i>]` (C7's list-index grammar). A source-form-clean declaration maps onto the typed `round` field; the VALUE-LEVEL lanes (empty list, membership incl. terminal, duplicates) then run at admission on every channel (P2c-built — proof boundary). (anchored: contract:ch11-gate-format#C40, contract:ch11-gate-format#C37) |
| F6 | The C12 SOURCE-FORM half: the authored integer fields C12 names — `config.value` under a binding whose AUTHORED `uses` is literally `declarative.threshold`, and `config.timeoutMs` under a binding whose authored `uses` is literally `external.process` (C12's fields are evaluator-scoped; the scoping read is SYNTACTIC — the authored string, no catalog resolution, so the walk stays semantics-free; under any OTHER authored `uses` those key names are admission's keyset business and the source check does NOT fire) — carry the realized ch8-C8 source ladder at the format walk: the node must be a PLAIN scalar, ANCHOR-FREE, NON-ALIASED, TAG-FREE, its RAW source text (the range slice or node type — NEVER `.source`, which strips quotes, probe P11) matching `^[1-9][0-9]*$`, and the resolved value a safe integer — float forms, alternative bases, exponent forms, and quoted/string forms are ALL rejected on the source form (GP4 reproduces the trap: `900.0`/`0x384`/`9e2` resolve to integral 900, invisible downstream). At most ONE source finding per field (the ch8 versionFinding idiom). STATED RELATION (never a silent fork): ch8-C5 confines node-level inspection to C8's version rule for the CH8 surface; C12's ratification extends that confinement ADDITIVELY to these two fields on THIS surface — no ch8 row is modified. The VALUE-LEVEL halves (safe integer ≥ 1; admission-bounded) are P2a/P3a-built — proof boundary. (anchored: contract:ch11-gate-format#C12, contract:ch8-template-format#C8) |
| F7 | Cross-rung ACCUMULATION (the P2a A1 inherited pipeline obligation, realized): the file pipeline reports ch8-structure findings AND admission findings in ONE `stage: "validate"` result, under this DISPOSITION LIST (the falsifiable membership — every entry a driven family member, owner: this row): (a) root broken (non-map) → walk finding only, the admission rung suppressed ENTIRELY; (b) the `steps` container MISSING or NOT A MAP → walk findings; the steps-DEPENDENT admission lanes — the gate lanes, the C19 cross-rule, the round MEMBERSHIP/value lanes — suppressed (their operand does not exist), while the steps-INDEPENDENT `runtimeContext` illegal-value lane (A3, a top-level read) still runs and accumulates (suppression stays LOCAL to the broken operand's dependents — the A1 letter); (b′) `steps` EMPTY (a valid map OF ITS KIND — ch8-C21's suppression binds missing/wrong-kind only): the C9 nonemptiness finding accumulates, `keys(steps)` = ∅ EXISTS, so the round MEMBERSHIP lane FIRES normally (every authored member is not-a-step) and the gate/C19 lanes are VACUOUS (no step exists to carry a declaration — vacuously absent, never suppressed), with A3 accumulating as always — the empty-steps + round-declaration corner is a driven member; (c) an INDIVIDUAL step container broken (non-map) → that step's gate lanes suppressed, every OTHER step's gate lanes + the round + runtimeContext admission lanes still run and accumulate; (d) the `round` value source-form broken (F5's lanes) → the round VALUE-LEVEL admission lanes suppressed, the gate and runtimeContext lanes unaffected; (e) EVERY other structural lane — ref, start, terminal, roles, instruction, transitions-grain, id grammar, role-set — is INDEPENDENT and accumulates with every admission lane. The load RESULT stays XOR (an admitted template or a findings error — ch8-C22's letter; nothing partial escapes); the parse/read/resolve stages keep their short-circuit (ch8-C36 byte-untouched). The internal shape by which the walk hands a buildable-with-findings value to the admission rung is BUILD FREEDOM within this disposition list. (anchored: contract:ch11-gate-format#C20, contract:ch11-gate-format#C21, prose:packet ch11-p2a A1) |
| F8 | The file-grain default lane: a declaration-absent YAML template admits with COMPLETE ALL-FALSE `advancesRound` maps (C38's default, P2c-built at admission — this row adds only the FILE-channel drive against a staged declaration-absent file); a source-form-clean authored declaration admits with the membership-expanded maps. (anchored: contract:ch11-gate-format#C38, contract:ch11-gate-format#C39) |

## Canonical admission-extension matrix (A)

| ID | Rule |
|---|---|
| A1 | The gate-binding UNKNOWN-KEY lane (C4's fixed keyset, admission-owned, both channels): a gate map's legal keyset is exactly `uses` + optional `config`; any other own key — `implementation`, `execution`, `id`, anything — is an UNCODED finding at `steps.<sid>.gates.<evt>[<i>].<key>` (the ch8-C13 fail-closed culture at the binding grain). Today's rebuild silently DROPS surplus keys; this lane closes that silent-drop window on both channels. (anchored: contract:ch11-gate-format#C4, contract:ch11-gate-format#C21) |
| A2 | The `uses` GRAMMAR lane (C6, admission-owned, both channels): `uses` must be a nonempty string matching `^[a-z][a-z0-9_]*(\.[a-z][a-z0-9_]*)+$` (two or more dot-separated lowercase segments); a grammar violation is its OWN UNCODED finding at `…[<i>].uses`, DISTINCT from resolution — catalog resolution runs only on grammatical ids, so the coded `gate_evaluator_unavailable` lane means exactly unknown-but-GRAMMATICAL (C21's two-lane letter). Existing admission fixtures whose `uses` values are grammar-invalid re-lane from the coded to the grammar finding — a declared edit class, membership verified at build (Y8). (anchored: contract:ch11-gate-format#C6, contract:ch11-gate-format#C21) |
| A3 | The `runtimeContext` ILLEGAL-VALUE lane (C18's value domain, admission-owned, both channels): a present `runtimeContext` that is not the string `"required"` is an UNCODED finding at `runtimeContext` (type-foreclosed on the well-typed direct channel; the lane guards the file channel and cast-forged direct values). It ACCUMULATES with the C19 cross-rule where both fire (a process-gated template with an illegal value reports both — one channel, C21). (anchored: contract:ch11-gate-format#C18, contract:ch11-gate-format#C21) |

## Canonical shipped-surface matrix (Y)

| ID | Rule |
|---|---|
| Y1 | The shipped `v3/templates/local-pair-v0@1.yaml` gains `round: { advanceOnArrivalAt: [implement] }` — C38's ratified restoration ("the shipped template file gains its round: declaration at P4"; the model's own exhibited declaration). This is an EXPLICIT migration of the in-repo development artifact, and the ONE shipped-channel behavior delta: a pass-back run on the shipped template now advances the round on arrival at `implement` (the journey's final round becomes 2 — Y8's declared golden edit). (anchored: contract:ch11-gate-format#C38, prose:plan §11.4 P4 row) |
| Y2 | `fixtureTemplate()` gains the SAME declaration in the SAME commit — the plan row's TOGETHER clause under the ch8-P2 equality pin: `loadTemplate(canonical file)` ≡ `admit(fixtureTemplate())` holds with the pin test BYTE-UNEDITED (both comparison sides gain the declaration and its `advancesRound` consequence — `review.PASS: true`, all else false — simultaneously; a one-sided edit is mechanically red). (anchored: prose:plan §11.4 P4 row, contract:ch11-gate-format#C38, prose:v3/src/testkit/templateFixture.test.ts) |
| Y3 | The P2c window wrappers RETIRE: the three fixture-spread sites (`l0aTrace.test.ts:45`, `twoWorker.test.ts:72`, `l0bTrace.test.ts:73` — the measured `advanceOnArrivalAt` sweep) collapse to `admit(fixtureTemplate())`; every golden table and the l0a negative variant stay BYTE-IDENTICAL (the wrapper value ≡ the new fixture value). The l2/l2a traces' direct-constructed templates keep their inline declarations (they were never wrappers). The `until P4` pointer comments across the touched files retire in the same commit (the §8.5 pointer-hygiene precedent). DERIVATION NOTE: the P2c T2 row names this packet as the wrappers' retirement home; the collapse is its mechanical execution. (derived: prose:plan §11.4 P4 row, prose:packet ch11-p2c T2) |
| Y4 | The validate-suite exact-load literal (`validate.test.ts` — the loaded-form pin) gains the `round` declaration and the updated `advancesRound` maps (`review.PASS: true`) — a declared test-literal edit in Y8's inventory, keeping the exact-admitted-output pin exact. DERIVATION NOTE: the P2c build-round correction established this literal as the admitted-stage pin; the Y1/Y2 delta flows into it mechanically. (derived: prose:packet ch11-p2c, prose:v3/src/definition/validate.test.ts) |
| Y5 | The journey extension (the R-ACTIVATION-JOURNEY discharge): (a) the existing pass-back scenario's final-round assert flips 1 → 2 with its comment re-grounded (the restoration observable end-to-end — Y8's declared golden edit; the C38 DEFAULT remains driven at the kernel/admission grain and at F8's file grain, so no coverage is lost); (b) a NEW gated scenario through the shipped subprocess channel: a test-AUTHORED gated template file (a staged temp templates dir — the operator-authored input artifact; a `declarative.threshold` `round >= 2` gate on the review step's CONVERGED transition + the round declaration) driven full-lifecycle: CONVERGED at round 1 → the submit exits NONZERO with the rejected outcome (`gate_blocked`, reason `round_below_min` — the ch6 rejection surface); PASS pass-back → round 2; CONVERGED → allow → DONE; the timeline rows carry the retained ordered `gateDecisions` (the C27 read surface, first driven from a FILE-authored gate). DERIVATION NOTE: the rule's trigger (a shipped entrypoint newly reaching built foundation) is measured — P3b W3 named this packet as the journey's deferral home. (derived: prose:template §2 write-time disciplines, prose:packet ch11-p3b W3, contract:ch11-gate-format#C38) |
| Y6 | The required-context START classification (the P3b S2 named deferral, resolved): `start` on a template declaring `runtimeContext: "required"` — now authorable through the file channel — throws S2's required+absent lane in `startInstance` (the shipped CLI passes NO ref; C28 adds no flag — such a template is UNSTARTABLE through this CLI until ch9's provisioning surface, stated honestly). The classification is realized as an EAGER PRE-CHECK, a NON-AUTHORITATIVE CLI classification mirror: the verb checks `template.runtimeContext === "required"` on its OWN PRE-LOADED template — after `definitions.load` (the DefinitionStore exists and the file load has happened), BEFORE `withStoreAndDiag`, the process-runner slot, and kernel construction (the ch8-P2 A2 eager-gate culture) — and throws usage exit 2 with the `StartFailed` doc, ZERO store/diag/kernel side effects. The kernel's S2 lane (P3b-built) stays the start-invariant AUTHORITY and backstop; through the CLI it remains reachable ONLY via the mid-invocation race (the file changing between the verb's pre-load and the kernel's own load) and rides the built INTERNAL path BY CONSTRUCTION: the inner catch around `kernel.startInstance` carries an EXACT classification ALLOWLIST — binding coverage (the built prefix mapping) and NOTHING else; no runtime-context mapping, prefix or typed, may join it. The allowlist is verified by a CLOSE-TIME CODE-LEVEL sweep (the P2c K1 retirement-grep class): its red condition is a classification member beyond the allowlist appearing in the CODE — deliberately static, because behaviorally an added runtime-context mapping would be DEAD CODE exactly where it matters (the eager gate precedes it and the race sits inside the stated proof boundary), so no drivable test could kill it. The race split MIRRORS the built not-found split — missing at the pre-load → `UnknownTemplate`/3, missing at the kernel's load → internal/1; required at the pre-load → eager usage/2, required only at the kernel's load → internal/1 (the grid's cells). S3's surplus-ref lane is UNREACHABLE through the CLI (no flag can supply a ref) — stated, not driven at this grain (its kernel-grain drive is P3b-built). DECISION NOTE (new-decision): both end-states conform — the P3b S2 deferral left the classification open, C28 picks no exit class, and the live `main.ts` today maps ONLY binding coverage to usage (every other start throw rides internal), so internal-1 is an equally anchor-conform alternative and the pick is this packet's own (the genuine-selection class, the P3b S3 precedent). USAGE-2 is selected: the throw is a deterministic start-side input-precondition failure — the class `main.ts`'s own comment names for the usage lane ("ONLY the start-INPUT lane is usage") — and internal-1 would misclassify a deterministic precondition as an integrity/internal failure, blurring the P4a 2-vs-1 split the culture defends; the remedy TIMING differs honestly from binding coverage (fixable via `--override` today vs the context ref only at ch9's surface) and does not decide the class. Flag F1 is this decision's record; the approve ratifies it. |
| Y7 | The CLI validate extension (C28: no new verbs, no new flags; the real catalog is already wired at every composition root): dev `validate <path>` on a VALID gated file exits 0 with `{valid: true, ref}`; on a defective one exits 1 with the `TemplateInvalid` doc — top-level stage `validate`, findings in the C21 form with the A9 `code` carrier visible on coded lanes (`gate_evaluator_unavailable`, `invalid_process_gate_config`, `gate_config_not_supported`, `runtime_context_required_for_process_gate`). The write lane (ch8-C38): ONE write verb driven surfacing the same doc for a gate-defective template — the doc SHAPES are byte-unchanged, only finding content is new. (anchored: contract:ch11-gate-format#C28, contract:ch8-template-format#C31, contract:ch8-template-format#C38) |
| Y8 | The CLOSED declared-edit inventory (Claim 5's machine face — behavior-change honesty; each item a list member, verified member-by-member at build): (1) the journey pass-back final-round assert 1 → 2 + its comment (Y5a); (2) the validate-suite exact-load literal's declaration + maps (Y4); (3) the three wrapper-site collapses (Y3 — zero golden-table bytes change); (4) any admission fixture whose grammar-invalid `uses` re-lanes under A2 (membership measured at build; the known named fixtures are grammatical); (5) the ch11-P4 pointer-comment retirements (comment-only; the membership is the Embedding sweep's POINTER-SITE list — twelve line sites across eight files, the wrapped l2aTrace occurrence, the line-unaddressable admit.ts occurrence, and template.ts's em-dash-form fourth pointer included; the three cross-chapter P4 mentions excluded and untouched); (6) staging-window fixtures asserting the new keys as unknown keys, if any exist (measured at build: the current validate/load suites carry NONE by the sweep); (7) the `admit.ts` `effectiveKey` composite-key literal RE-ESCAPED — the two LITERAL NUL bytes become `\u0000` escapes (behavior-identical: the runtime string is byte-equal; the edit restores the file's TEXT classification, whose loss makes the file line-unaddressable to DEFAULT-mode grep sweeps — binary-skipping greps drop it silently, stock BSD grep reports only a lineless binary match; forced-text `-a` mode still addresses it); (8) the `storeCheckers.test.ts` declaration-ABSENT checker fixture re-bases on a declaration-STRIPPED fixture (`fixtureTemplate()` minus its `round` key) — the lane's MEANING (a declaration-absent history reconstructs 1) is unchanged; only the fixture's construction changes because `fixtureTemplate()` is declaration-PRESENT from Y2 on (found at build: the `advanceOnArrivalAt` sweep matched the file's DECLARED wrapper but a plain `admit(fixtureTemplate())` carries no token — the detector-miss is recorded in the metrics). NOTHING else: every other test, golden table, and finding byte stays identical, proven by the full suite green. DERIVATION NOTE: the inventory's CLOSEDNESS derives from its three sources — the P2c T2 reciprocal (items 2/3), the P2a A8 window's closing (item 6) plus the Y1 restoration's one shipped observable (item 1), and the measured sweeps (items 4/5/6); each membership is re-verified member-by-member at build, so the closure is a measured set, not rhetoric. (derived: prose:packet ch11-p2c T2, prose:packet ch11-p2a A8, prose:v3/src/cli/journey.test.ts) |

## Site × shape × phase grid

The packet adds ZERO awaited sites (the walk and the admission
extensions are synchronous and pure — the P2a A10 record extends
unchanged; the pipeline's `readdir`/`readFile` sites keep their ch8
lanes byte-untouched). The grid exists because Y6's lane sits on a
PHASED seam the start verb already has — TWO template loads (the
verb's pre-load, then the kernel's own load inside `startInstance`) —
and the runtime-context shape now has cells in BOTH phases with
DIFFERENT classes:

| Site | Shape | Phase | Disposition |
|---|---|---|---|
| the verb's pre-load (`definitions.load`, `cli/main.ts`) | `runtimeContext: "required"` declared | pre-store / pre-kernel | EAGER `StartFailed` usage/2 — no store, no diag, no process-runner, no kernel constructed (driven, with the side-effect-free negative) |
| the verb's pre-load | `runtimeContext` ABSENT (context-free) | pre-store / pre-kernel | the gate is SILENT — start proceeds normally (the no-throw success baseline; driven by the built start/journey suites, whose templates are context-free) |
| the verb's pre-load | missing (null) | pre-store | `UnknownTemplate` notFound/3 (ch8-P2 built, unchanged) |
| the verb's pre-load | invalid (typed `TemplateLoadError`) | pre-store | `TemplateInvalid`/1 (built, unchanged) |
| the kernel's own load (`start.ts`) | required — race-only via the CLI (the file changed between the loads) | pre-state, inside the kernel await | the S2 throw → INTERNAL/1 BY CONSTRUCTION (absent from the inner catch's allowlist) — the authority/backstop lane |
| the kernel's own load | missing (race) | pre-state | the bare `start failed:` form → internal/1 (built, unchanged) |
| the kernel's own load | invalid (race) | pre-state | typed `TemplateLoadError` → the outer type-based catch → `TemplateInvalid`/1 (built, unchanged) |
| the kernel's own load | binding coverage | pre-state | `start failed (binding coverage)` → usage/2 (the built ch11-P1 mapping — the inner allowlist's SOLE member, byte-unchanged) |

## Mirrored surface map (one canonical statement per rule)

| Rule | Canonical home | Named mirrors (summarize/defer only) |
|---|---|---|
| admission is the ONE semantic authority; the walk adds no semantics | F3 (the "no semantic checks" clause) | Claim 1/2 · F4 · the sizing authority axis |
| the round source-form/value-level split | F5 (+ P2c A2 as the value-level owner) | Claim 2 · dimension 2 · the header's anchor sentence |
| the C12 source/value split + the ch8-C5 relation | F6 | Claim 2 · dimension 3 |
| cross-rung accumulation + pipeline-grain suppression | F7 | Claim 2 · dimension 5 · the P2a A1 citation |
| the TOGETHER pin (template + fixture, one commit) | Y2 | Claim 3 · dimension 7 · Y1's delta sentence |
| the restoration + its one shipped delta | Y1 | Claim 3/5 · Y5a · Y8 item 1 · the sizing closure proof |
| the wrapper retirement | Y3 | Claim 3 · dimension 7 · Y8 item 3 |
| the closed declared-edit inventory | Y8 | Claim 5 · the acceptance honesty bullet · Y3/Y4/Y5a |
| the eager usage-2 pre-check + the by-construction race/internal split | Y6 | Claim 4 · dimension 9 · the grid's required-shape cells · flag F1 (Y6's decision record) · the eager-gate in-context note |
| the journey discharge | Y5 | the sizing R-ACTIVATION-JOURNEY disposition · dimension 9 |
| no new verbs/flags; doc shapes unchanged in kind | Y7 | Claim 4 · dimension 10 · the consume-family CLI row |
| the staging-window close (previously-rejected inputs) | Claim 5 (the SCOPED exception) | Y8 item 6 · the P2a A8 reciprocal |
| the round-declaration value (`advanceOnArrivalAt: [implement]`) | Y1 (the shipped delta) | the operative material's "shipped template's P4 delta" block · Y2/Y3's readings |

Fold policy: a change to a canonical row updates every named mirror
before handing back; a mirror discovered in review is added here.
Convention (stated once): each acceptance bullet MIRRORS the
dimension(s) it names and defers to them — acceptance bullets are not
listed per map row.

## In-context notes (the scarce budget)

- **Extend, don't fork:** the keysets grow in place (`ROOT_KEYS`, the
  step keyset literal); the gates materialization mirrors the
  agentConfig `materializeResolvedValue` idiom but with F3's
  stringness rule; the round/gates/runtimeContext walk lands in
  `validate.ts`'s existing single pass — no new module, no second
  walk. The `validateTemplate` outcome may need a
  template-with-findings shape for F7 — internal realization freedom,
  and a CONSCIOUS relaxation of the ch8 build-only-after-zero-findings
  internal gate (build-critical containers still gate the build;
  ch8-C22's external XOR is preserved at the load result — nothing
  partial ever escapes the pipeline).
- **Node access for F6:** `doc.getIn([...])` takes numeric list
  indices; target the two field paths by name under each binding —
  presence-conditional (an absent field is admission's
  missing-lane, never a source finding). The versionFinding helper is
  the pattern to generalize, not duplicate.
- **A2 ordering:** run the grammar test BEFORE `catalog.resolve` so
  the coded lane's meaning narrows to unknown-but-grammatical;
  keep the existing nonempty-string message for the missing/non-string
  case (its lane is C21's `uses MISSING`).
- **Y6's gate is EAGER and non-authoritative:** check the pre-loaded
  template's `runtimeContext` right after the verb's own
  `definitions.load`, BEFORE `withStoreAndDiag`/the runner slot/the
  kernel; add NO mapping — prefix or typed — for
  `start failed (runtime context)` to the inner catch (the allowlist:
  binding coverage stays its sole member); the kernel's S2 throw is
  the authority and every other start throw keeps its built
  classification.
- **The journey's staged template is raw authored YAML text** written
  to a temp templates dir (filename `<id>@<version>.yaml` per
  ch8-C26); hostile source-form fixtures in the validator suites are
  raw YAML strings by nature (the channel preserves them exactly —
  R-RAW-FIXTURES satisfied without staging tricks).
- **Do not "fix" the inert-configuration shape** (C38's stated
  consequence): a file declaring a round-reading gate with no `round`
  declaration is LEGAL-and-inert; no cross-rule, no warning — that
  detection stays a named later decision.

## Embedding gates (v1-inherited)

- Target files (verified against the live tree, 2026-07-17):
  EDITED (production) — `v3/src/definition/validate.ts` (F1–F6, the
  walk), `v3/src/definition/load.ts` (F7's pipeline accumulation +
  the staged-comment updates), `v3/src/definition/admit.ts`
  (A1/A2/A3), `v3/src/cli/main.ts` (Y6's mapping),
  `v3/templates/local-pair-v0@1.yaml` (Y1),
  `v3/src/testkit/templateFixture.ts` (Y2),
  `v3/src/domain/template.ts` (pointer-comment retirement only).
  EDITED (tests) — `definition/validate.test.ts` (dimensions 1–3 +
  Y4), `definition/load.test.ts` (dimensions 4–6, 8),
  `definition/admit.test.ts` (A1/A2/A3 lanes + any Y8-4 re-lanes),
  `definition/fileDefinitionStore.test.ts` (a gated load-by-ref
  lane), `cli/cli.test.ts` (Y6 + the write-lane drive),
  `cli/journey.test.ts` (Y5), `cli/dev/dev.test.ts` (Y7's validate
  lanes — its `at P4` match is a ch7-P4 mention, untouched),
  `l0aTrace.test.ts` / `l0bTrace.test.ts` / `twoWorker.test.ts` (Y3
  collapses), `l2Trace.test.ts` / `l2aTrace.test.ts`
  (pointer-comment retirements only — l2aTrace's wrapped "deepest
  shipped seam" clause re-grounds). UNTOUCHED, explicitly:
  `testkit/templateFixture.test.ts` stays OUTSIDE the boundary so
  that ANY edit to the equality pin trips the post-build audit
  mechanically — the pin's protection is its exclusion (both
  comparison sides change together, so the test needs no edit and
  may receive none).
- Entrypoints: `loadTemplate` (the walk), `admitTemplate` (the
  lanes), the CLI mains (`start`'s mapping; `validate`'s lanes ride
  unchanged machinery).
- Sweeps (measured 2026-07-17, untruncated): `grep -rn
  "advanceOnArrivalAt" v3/src --include="*.ts"` → the three wrapper
  sites (`l0aTrace:45`, `twoWorker:72`, `l0bTrace:73`), the two
  inline direct-template declarations (`l2Trace:54`, `l2aTrace:69` —
  STAY), plus domain/checker/kernel/admit occurrences (no wrapper
  forms); `grep -rln "until P4\|P4's\|at P4" v3/src --include="*.ts"`
  → an ENVIRONMENT-DEPENDENT file list (measured both ways:
  9 files under a binary-SKIPPING grep — the ugrep/GNU `-I` class,
  which drops `admit.ts` entirely; 10 under stock BSD grep, which
  lists `admit.ts` only as an UNADDRESSABLE binary match with no
  line numbers — the file is binary-classified either way, see the
  NUL note below). The raw grep output is therefore NOT the
  inventory: the GENUINE ch11-P4 retirement inventory is the
  POINTER-SITE list below (the membership UNIT is the
  pointer-bearing LINE SITE; the count defers to the list — TWELVE
  sites across EIGHT files): the line-addressable sites —
  `l0aTrace.test.ts:44`, `l0bTrace.test.ts:72`, `l2Trace.test.ts:24/53`,
  `twoWorker.test.ts:67`, `definition/load.ts:27`,
  `domain/template.ts:26/69/80/86` (line 86's "…source-form lanes
  — P4." is the em-dash form the narrow pattern cannot match —
  found by a broad `P4` scan; same JSDoc block as line 80, same
  deferral class) — PLUS the TWO sites the
  line-oriented grep cannot see at all (both found by byte-level
  inspection):
  `l2aTrace.test.ts:29-31` ("…until\n * P4…", a JSDoc line break —
  the "deepest shipped seam" clause goes false at P4) and
  `definition/admit.ts:207` ("the source-form lanes … are P4's
  format walk" — line-unaddressable in DEFAULT grep modes because
  the file is binary-classified: two literal NUL bytes sit in the
  `effectiveKey` template literal, the P3a composite-key separator —
  a binary-skipping grep drops the file silently, stock BSD grep
  reports only a lineless binary match; a forced-text `grep -a`
  sweep DOES line-address it; Y8 item 7 re-escapes the NULs,
  retiring the whole hazard class); the
  three remaining matches are CROSS-CHAPTER mentions
  (`kernel/kernel.test.ts:46` ch4-P4, `cli/dev/dev.test.ts:181`
  ch7-P4, `floor/debugBundle.test.ts:495` the ch7-P4 dev-dump note)
  — NOT ch11 pointers, they stay untouched;
  `grep -n "gates\|runtimeContext\|round" v3/src/definition/
  validate.test.ts v3/src/definition/load.test.ts` → zero fixtures
  asserting the new keys as unknown keys (the hits are the
  dimension-12 round-trip prose and comment text — named, not
  fixtures; Y8 item 6's current measurement).
- Mutation boundary: the files below; extend-don't-fork. `admit.ts`'s
  P2a lanes, the kernel, the store, `gates/`, the floor, and the diag
  surfaces are behavior-untouched (Claim 5); `errors.ts` needs no
  change (the finding forms carry everything).

```json
{
  "mutation_boundary": {
    "files": [
      "v3/src/definition/validate.ts",
      "v3/src/definition/validate.test.ts",
      "v3/src/definition/load.ts",
      "v3/src/definition/load.test.ts",
      "v3/src/definition/admit.ts",
      "v3/src/definition/admit.test.ts",
      "v3/src/definition/fileDefinitionStore.test.ts",
      "v3/src/cli/main.ts",
      "v3/src/cli/cli.test.ts",
      "v3/src/cli/journey.test.ts",
      "v3/src/cli/dev/dev.test.ts",
      "v3/src/domain/template.ts",
      "v3/templates/local-pair-v0@1.yaml",
      "v3/src/testkit/templateFixture.ts",
      "v3/src/testkit/storeCheckers.test.ts",
      "v3/src/l0aTrace.test.ts",
      "v3/src/l0bTrace.test.ts",
      "v3/src/l2Trace.test.ts",
      "v3/src/l2aTrace.test.ts",
      "v3/src/twoWorker.test.ts"
    ]
  }
}
```

## Row manifest (the D1 classification's machine face)

```json
{
  "packet_rows": {
    "rows": [
      { "id": "F1", "class": "anchored", "refs": ["contract:ch11-gate-format#C18", "contract:ch11-gate-format#C37", "contract:ch8-template-format#C7"] },
      { "id": "F2", "class": "anchored", "refs": ["contract:ch11-gate-format#C1"] },
      { "id": "F3", "class": "derived", "refs": ["contract:ch11-gate-format#C2", "contract:ch11-gate-format#C20", "prose:packet ch11-p2a A1"] },
      { "id": "F4", "class": "anchored", "refs": ["contract:ch11-gate-format#C18", "contract:ch11-gate-format#C21"] },
      { "id": "F5", "class": "anchored", "refs": ["contract:ch11-gate-format#C40", "contract:ch11-gate-format#C37"] },
      { "id": "F6", "class": "anchored", "refs": ["contract:ch11-gate-format#C12", "contract:ch8-template-format#C8"] },
      { "id": "F7", "class": "anchored", "refs": ["contract:ch11-gate-format#C20", "contract:ch11-gate-format#C21", "prose:packet ch11-p2a A1"] },
      { "id": "F8", "class": "anchored", "refs": ["contract:ch11-gate-format#C38", "contract:ch11-gate-format#C39"] },
      { "id": "A1", "class": "anchored", "refs": ["contract:ch11-gate-format#C4", "contract:ch11-gate-format#C21"] },
      { "id": "A2", "class": "anchored", "refs": ["contract:ch11-gate-format#C6", "contract:ch11-gate-format#C21"] },
      { "id": "A3", "class": "anchored", "refs": ["contract:ch11-gate-format#C18", "contract:ch11-gate-format#C21"] },
      { "id": "Y1", "class": "anchored", "refs": ["contract:ch11-gate-format#C38", "prose:plan §11.4 P4 row"] },
      { "id": "Y2", "class": "anchored", "refs": ["prose:plan §11.4 P4 row", "contract:ch11-gate-format#C38", "prose:v3/src/testkit/templateFixture.test.ts"] },
      { "id": "Y3", "class": "derived", "refs": ["prose:plan §11.4 P4 row", "prose:packet ch11-p2c T2"] },
      { "id": "Y4", "class": "derived", "refs": ["prose:packet ch11-p2c", "prose:v3/src/definition/validate.test.ts"] },
      { "id": "Y5", "class": "derived", "refs": ["prose:template §2 write-time disciplines", "prose:packet ch11-p3b W3", "contract:ch11-gate-format#C38"] },
      { "id": "Y6", "class": "new-decision", "refs": [] },
      { "id": "Y7", "class": "anchored", "refs": ["contract:ch11-gate-format#C28", "contract:ch8-template-format#C31", "contract:ch8-template-format#C38"] },
      { "id": "Y8", "class": "derived", "refs": ["prose:packet ch11-p2c T2", "prose:packet ch11-p2a A8", "prose:v3/src/cli/journey.test.ts"] }
    ]
  }
}
```

## Pre-approval flags

(Flag ids are their own namespace — a flag "F1" is distinct from the
format-walk matrix row F1; the sibling-packet flag convention.)

- **F1 — the required-context START classification: usage exit 2
  (Y6's new-decision).** The P3b S2 deferral handed the CLI
  classification of the `start failed (runtime context)`
  required+absent throw to this packet, and no ratified row decides
  it: both usage-2 and internal-1 keep every anchor conform (`main.ts`
  today maps only binding coverage to usage; C28 picks no exit
  class), so the choice is this packet's own — the genuine-selection
  class, the P3b S3 precedent. USAGE-2 is selected: the deterministic
  required-declaration case is a start-side input-precondition
  failure (exactly the class `main.ts`'s own comment assigns the
  usage lane), and internal-1 would misclassify a deterministic
  precondition as integrity, blurring the P4a 2-vs-1 split. The
  REALIZATION is Y6's eager pre-check on the verb's own pre-loaded
  template (a non-authoritative CLI classification mirror — zero
  store/kernel side effects); the kernel's S2 lane stays the
  authority, and its CLI reachability — the mid-invocation race —
  rides INTERNAL by construction (the inner catch's allowlist keeps
  binding coverage as its sole member; the race split mirrors the
  built not-found 3-vs-1 split), so no other start throw's path is
  touched.
  Y6 carries the full decision note. Tally 13/5/1, below the Case-B
  threshold; no authority/separation/availability-class semantics
  touched. `Route: approve-ratified` — this packet's human approve is
  the ratification act of the classification.

Beyond F1: every other decision point was ratified at the gate-format
draft or its 2026-07-12 reopen (the C38 restoration and its staging,
the C39/C40 realization split, the C37 keyset, C12's ladder, C28's
no-new-verbs stance). No contested substrate premise exists — every
parser-resting lane cites the draft's probed record (GP1–GP6, P11)
at the same pinned yaml version.

## Acceptance

Test obligations are stated as DISCIPLINE + FAMILY INVENTORY (the
spec-vs-build altitude line, README §5.5): the discipline names the
rule, the inventory declares the membership with its owner;
fixture-level enumeration is BUILD work, verified member-by-member by
the build-close arm gate's mandatory sensitivity pass against the
BUILT test bodies (R-LANE-SENSITIVITY binds twice).

- **The file-channel lane sweep:** every member of the declared lane
  inventory (owners: C21's lane list + C40's P4 share in F5 + F6's
  ladder + F1/F2's growth lanes + A1/A2/A3 + F3's subtree
  key-stringness lane) driven through
  `loadTemplate` on YAML-staged fixtures, each able to fail on its
  row's meaning; coded lanes asserted on BOTH path and code.
- **Both-direction iffs:** the keyset growth (dimension 1 — every new
  key legal at its grain AND unknown at every other grain; every
  other unknown key still red); the F5 present-null vs absent-key
  split (present-null a finding; absent the F8 default); A2's
  grammar/resolve two-lane split (grammar-invalid → uncoded;
  unknown-but-grammatical → coded); F6's evaluator scoping (the
  matching-`uses` positive fires the source ladder AND a C12-named
  key under a NON-matching authored `uses` yields NO source finding
  — only admission's keyset lane; both directions driven).
- **Channel equivalence:** dimension 6's maximal gated template —
  file-loaded vs direct-admitted DEEP-EQUAL on the whole admitted
  value (full-document equality, never per-key spot checks).
- **Accumulation combinations:** every F7 disposition-list entry
  (owner: F7 — the a/b/b′/c/d/e membership, incl. the empty-steps +
  round-declaration corner and the per-step LOCAL
  suppression member) plus the parse short-circuit negative (a
  parse-defective gated file reports parse findings ONLY).
- **Admission authority, both channels:** each A-row (owner:
  A1/A2/A3) driven on the DIRECT channel via `admitTemplate` on a
  cast-forged value, plus the A3+C19 both-findings combination
  (dimension 4's member).
- **The source ladders:** dimension 2 (every F5 lane) and dimension 3
  (every F6 form member per field, plus each field's plain-decimal
  positive) — the numeric-ladder discipline at the SOURCE grain
  (value-level ladders are P2a/P3a-built, proof boundary).
- **Pin/wrapper/golden integrity:** the equality pin test green and
  BYTE-UNEDITED (mechanically diffed at close); the three collapsed
  wrapper sites; the four round-2 golden tables + the l0a negative
  variant byte-identical; Y4's literal updated and green.
- **Journey lanes:** dimension 9's three members (the gated
  block→pass-back→allow lifecycle with retained `gateDecisions`; the
  restored pass-back round 2; the eager usage-2 required-context
  start).
- **The start-classification family (owner: Y6 + the grid):** the
  EAGER lane driven WITH its side-effect negative (required template
  → exit 2 `StartFailed` and NO store DB file, no diag, no kernel
  construction observable); the INNER-CATCH ALLOWLIST sweep — a
  CLOSE-TIME CODE INSPECTION (the P2c K1 retirement-grep class): red
  iff the catch's classification set ≠ {binding coverage} IN CODE
  (any runtime-context mapping, prefix or typed, is such a member);
  the sweep is static BY DESIGN — behaviorally an added mapping is
  dead code behind the eager gate, so only a code-level check can
  kill that mutation class; the kernel S2 backstop stands on its
  P3b-built drives (no timing-race test: the two-load window has no
  interposable seam and the culture forbids inventing one — the
  stated proof boundary). The proof triple: the eager side-effect
  negative (behavioral) + the allowlist code sweep (static) + the
  backstop drives (kernel-grain behavioral).
- **CLI doc lanes:** dimension 10's members (validate 0/valid-gated,
  1/defective with stage + coded findings; one write verb's
  TemplateInvalid on a gate-defective template).
- **Behavior-change honesty (SCOPED):** the claimed deltas are
  EXACTLY Y8's closed inventory; everything else proven unchanged by
  the FULL existing suite green with zero further edits (the
  l0a/l0b/l1/l2/l2a trace tables byte-identical; the kernel, store,
  `gates/`, floor, and diag surfaces byte-untouched).
- Coverage validation green at close: units 25/159, invariants
  23/116, traces 5/20 — ALL UNCHANGED (the empty slice verified).
- Drift tests green (standing, unconditional — PI-3): the rejection
  registry untouched (54); `unitMap.json` and `domainRegistry.ts`
  untouched (no flips — no unit or type ownership joins).
- Bridges green at close: `v3:typecheck`, `v3:lint`, `v3:test`,
  `v3:coverage`, `v3:packet-lint` (`--forbid-reopened`: 0 reopened),
  `v3:adr-check` (no new ADR — no module/boundary decision enters;
  ADR-013's import fences stand byte-identical).
- Standing review rules in force: **REV-A1-TXN** (the commit boundary
  untouched); **REV-B-LOCAL-NOT-AUTHORITY** (the fixture and staged
  files are never decision inputs); **REV-C-PROJECTIONS-READONLY**
  (read surfaces untouched); **REV-E-NO-ADAPTER-BRANCH** (no adapter
  branching enters — the walk discriminates on VALUE shapes only);
  **REV-DIAG-FAILOPEN** (diag untouched).

## Build record

Approved 2026-07-17 at STOP `4:flagged-approve`. The hash chronicle:
R1 FULL bound `e6ddaa63…` (one shared bookkeeping defect group + 4
watchpoints) → reconciled `091ec48a…`, close CLEAN →
fresh-implementer lens (third §7 run: divergence-free, zero folds) →
ARM GATE 1 (pin-conform gpt-5.6-sol/high/never, byte guards clean)
REFINE with SEVEN findings — the P1 Y6 derived→new-decision
reclassification (flag F1 minted, the approve demoted to the human
path), the F6/F3 narrowings, F7's materialized disposition list, the
direct-channel A-row family, the receipt corrections, the
pin-test boundary exclusion — all folded → R2 FULL (mandatory
escalation on the manifest-class change) → R3/R4 TARGETED, close
CLEAN @ `a0e269d6…` → four arm re-checks (three single-P3 wording
rounds on the receipt paragraph — the site-list membership unit, the
locale-dependent grep attribution, the `-a` scoping — #4 CLEAN @
`5c09c5fa…`) → the RATIFIER'S arm round: REFINE (the usage-2 policy
endorsed; the prefix mechanism rejected against the two-load race
provenance) → the eager-pre-check fold with the ratifier's four
precisions (non-authoritative mirror · code-level allowlist ·
plan-edit considered_not_finding · the four race/eager grid cells)
@ `19e53477…` → R5 TARGETED (lenses 1/3/4 + scoped 5) + the
sweep-nature/8th-cell/namespace folds → close CLEAN @ `5f4e90a6…` —
the approve basis. The approve ratified F1 (usage-2, eager
realization) and accepted the 56 KB size advisory. 5 counted panel
rounds of the 8-round watchdog; reconciliations, closes, the
comprehension lens, and arm passes uncounted; every internal pass
Opus-class.

Built the same day (delegated build round, the packet as the binding
contract @ `5f4e90a6…`). **917 → 995 tests** (+78). ONE build-round
packet correction (the P2c-precedent doc-refinement class): the
builder STOPPED on a real detector-miss — `storeCheckers.test.ts`'s
declaration-ABSENT checker fixture sat OUTSIDE the boundary (the
`advanceOnArrivalAt` sweep sees only the token; a plain
`admit(fixtureTemplate())` CONSUMER OF THE FIXTURE'S ABSENT STATE
carries none) — resolved by Y8 item 8's declaration-stripped re-base
+ the boundary 19→20. Bridges at close (orchestrator-rerun, not
builder-claimed): `v3:typecheck` clean · `v3:lint` clean · the v3
suite 995/995 · the root suite 3856/3856 · ui 230/230 ·
`v3:coverage` OK (25/159 · 23/116 · 5/20 — unchanged) ·
`v3:packet-lint --forbid-reopened` 0 reopened / 0 errors ·
`v3:adr-check` 14 consistent. Boundary containment
orchestrator-verified: 20 changed code files + the packet file, zero
outside. Builder-run mutation probes (copy-backup reverts, the P3b
incident's lesson): the neutralized eager gate, the removed
uses-grammar check, the broken stringness rule, and the restored F7
short-circuit each turned exactly their lanes red — restored green.
In-packet-freedom choices recorded: the walk returns a BEST-EFFORT
template (undefined only for a non-map root) and `load.ts`
concatenates walk + admission findings (XOR preserved); `round`
attaches iff source-form-clean AND steps-is-a-map (the b vs b′/d
realization); A1's unknown-key finding accumulates; `versionFinding`
generalized into a shared plain-integer-source helper consumed by
F6; the stringness scan uses a visited WeakSet.

Arm gate 2 (the build-close implementation review; pin-conform
gpt-5.6-sol/high/never; one infra-timeout retry per the §6 ladder,
the retry citing the sha): REFINE citing `6365804f` with FOUR
findings — ALL test-evidence class, zero product gaps (the mandatory
sensitivity pass finding green-but-blind classes in the BUILT bodies
under correct packet lane texts — the P2c/P3a/P3b pattern
recurring): the file-channel C21 lane sweep completed (twelve
YAML-staged `loadTemplate` lanes that had ridden only the direct
admission grain); the F6 `timeoutMs` ladder's missing members
(anchored/aliased/tagged/zero/negative) plus the REVERSE non-firing
direction (`value` under `external.process` → keyset lane only); the
F7(b) steps-MISSING + A3 accumulation combination; the stringness
rule's RECURSIVE half (a numeric key deep inside a binding's
`config`), its sensitivity probe-confirmed (neutralizing the
recursion turned exactly the new lane red). All four folded in one
aftermath round: **995 → 1013 tests** (+18; zero production
changes; both touched files already declared). Bridges re-verified
green (orchestrator-rerun): typecheck 0 · lint 0 · the v3 suite
1013/1013 · packet-lint 0/0.

```json
{
  "packet_metrics": {
    "class": "operability",
    "prediction": { "predicted": "projection", "reasoning": "the ratified gate-format draft (2026-07-12, incl. the reopen's C37-C41) decided every format-surface point; the packet projects the file-channel/source-form shares of C1-C21/C28/C37-C40 plus the ratified restoration", "discovered": "projection" },
    "provenance": { "anchored": 13, "derived": 5, "new_decision": 1 },
    "rounds": { "review": 5, "doc_refinement": 1, "implementation": 2 },
    "stops": [
      { "type": "4:flagged-approve", "what": "one new-decision row rode as flag F1 — Y6, the required-context START classification (arm-reclassified from derived: internal-1 proved equally anchor-conform)", "resolution": "the ratifier approved 2026-07-17: usage-2 ratified WITH the eager-pre-check realization their own arm round drove (a non-authoritative CLI mirror before store/kernel construction; the kernel S2 lane the authority; the inner-catch allowlist code-level; the two-load race riding internal by construction), the 56 KB size advisory accepted in the same act" }
    ],
    "detector_misses": [
      {
        "found_at": "arm-approve",
        "what": "Y6 rode as derived through R1 and a clean close; the arm demonstrated internal-1 as an equally anchor-conform alternative, reclassifying it new-decision and demoting the flag-free approve",
        "why_missed": "the internal lenses tested the derivation against the named precedent's parallelism, not against the full space of conforming alternatives"
      },
      {
        "found_at": "arm-approve",
        "what": "the sweep receipts missed the wrapped l2aTrace pointer, the NUL-binary admit.ts pointer, and mis-attributed the grep behavior (later shown locale/tool-dependent: the session grep is a binary-skipping ugrep wrapper, the arm's a stock BSD grep)",
        "why_missed": "the measuring instruments themselves were unprobed — line-oriented patterns are wrap/em-dash-blind and the NUL-classified file silently divides grep implementations"
      },
      {
        "found_at": "approve",
        "what": "at the approve STOP the ratifier's own arm round showed the prefix-mapping mechanism would classify the two-load race's S2 throw as usage, colliding with the second-load-mutation-is-integrity culture (the not-found 3-vs-1 split)",
        "why_missed": "the lenses verified the mapping against the normal path and the named precedent, never against the TOCTOU provenance of the verb's two-load seam"
      },
      {
        "found_at": "implementation",
        "what": "storeCheckers.test.ts's declaration-absent fixture broke when fixtureTemplate() became declaration-present — the file was outside the boundary",
        "why_missed": "the advanceOnArrivalAt sweep sees only the token; a consumer of the fixture's ABSENCE carries no token — consumers-of-absence are token-sweep-invisible"
      }
    ],
    "learned": "a fixture VALUE flip ripples into consumers of its ABSENCE (token sweeps cannot see them), and the packet's own measuring instruments — grep wrappers, NUL-classified files, wrapped and em-dash comment forms — need probing like any substrate: three of the four misses were instrument blindness, not reasoning gaps"
  }
}
```
