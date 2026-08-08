# ch13 — context-block-v2 contract

```json
{"contract_draft": {"chapter": "ch13", "surface": "context-block-v2", "status": "draft"}}
```

## Context (non-normative by declaration)

Successor of `ch13-context-block`, superseded 2026-08-05; inheritance
verified by the P4 completeness pass (review record:
`v3/implementation/ch13-rederivation-arm/p4/`).

**The declaration authority.** This is the first contract authored ON
the ADR-019 schema substrate: every structural rule of this surface
lives as DATA in `v3/src/definition/schema/templateFormat.ts`, and this
contract cites those declarations by TAG, restating no attribute
(ADR-019 D4 — one authority, pointers everywhere else). The ratifying
act binds that file's bytes beside this file's C-rows (the
contract-draft template's schema lock). A structural rule visible in
both places is a defect; the tag-closure check is its tripwire.

**Business invariant.** Context blocks are actor-facing communication:
deterministic prose delivered with the dispatched packet so an actor
hears an operating rule before acting. They influence no verdict and no
kernel decision — enforcement lives elsewhere; this surface only speaks.

**Control model.** One template-level catalog holds every body. Three
ref positions point into it by id: role-level and step-level
`promptConcernRefs` inside the agent-config maps, and `contextBlockRefs`
on a gate binding. The declared schema validates catalog and refs at
admission on both channels; rendering happens at dispatch as a deterministic computation over admitted inputs.

**Forbidden fallback.** No render-time dropping of a ref and no
render-time tolerance of a malformed catalog — neither state survives
admission. No new rejection or issue name: the one issue code is the
ratified `unresolved_context_block_ref`.

**Allowed resolution / missing data.** A template that issues no refs
and declares no catalog is fully legal (every pre-ch13 file). A
template whose refs find no valid entry fails admission with per-site
findings.

**Model-table note (carried fact, no divergence stop owed).** The model
document's context-block table still shows creation-time rejection on
its ref rows, while its invariant record, pseudocode reprint and
evidence block all place ref validation at ADMISSION. Admission
governs, as the ch11 sync established.

**Substrate probes (executed 2026-08-08, this authoring; scripts and
outputs preserved in the review record):**
- **PROBE-P4-1** (belt composition): the D10 `validKeysOf` belt at a
  fixed-keyset position reproduces the ratified resolution semantics on
  both channels — a ref to a structurally invalid entry draws the
  entry's own finding AND the per-site coded finding; a wrong-kind,
  absent or empty catalog answers with the empty set, so per-site
  findings fire beside (never suppressed by) the container's own
  finding; channels agree byte-for-byte.
- **PROBE-P4-2** (the plain-map gap → ADR-019 D11): before D11, a ref
  list inside the format-open agent config was unreachable by any lane
  (ghost, numeric and grammar-violating members all passed silently);
  with D11's typed subset the same fixtures produce the declared
  findings, and undeclared sibling keys stay legal open data.
- **PROBE-P4-3** (list-lane interplay + key identity): the engine
  measures every shape-passing occurrence with the membership lane
  (duplicates included), keeps a shape-failing member invisible to
  every list-level lane, and — on the file channel with map-typed keys
  preserved — treats a boolean-keyed entry as unaddressable by the
  string ref of the same spelling (one key-identity class, two true
  findings for one authoring defect).

**Decision-home triage (template §1, K0→K4) — v2's new DECIDED-HERE
markers: C1 fail-closed catalog admission, C7 per-occurrence
resolution, C8 shape-failure invisibility.** All three triage ROW-HOME:
none is model-shaped (the model pins the validation MOMENT — admission
— and is silent on finding grains and admission-shape policy), and none carries
beyond-chapter architecture (they are this surface's own lane
semantics, expressed by the one engine's standing behaviour). Every
other row carries decisions already ratified for this surface; their
authority is the superseded contract's frozen record, mapped old→new in
the completeness pass.

**Realization split note.** None exists. Channel scope is an engine
property of the one declaration (source-bearing attributes run where a
source exists); this contract re-ratifies no walk/rung partition.

**Draft metrics (template §5):** rounds to ratify: — · new-decision
rows: 3 DECIDED-HERE markers across 3 rows · post-ratification
reopenings: —

## Contract rows (every normative statement is a C-row)

| ID | Rule |
|---|---|
| C1 | A template's root MAY carry the catalog under the key `contextBlocks` — structural authority `[d-ctxblocks]` (container, key lane, entries) and `[d-root]` (the root keyset's growth by this optional key), with the declared default: an absent catalog admits and the admitted form carries an empty catalog record. DECIDED HERE (v2): admission of the catalog shape is FAIL-CLOSED — a present value the declaration refuses (any non-map form) is a container finding and the template does not admit; this supersedes the superseded line's normalize-any-non-record-to-empty rule, whose defect class (a forged catalog carried onto the admitted value) cannot arise under an engine that validates the direct-construction channel (probe: PROBE-P4-1; the superseded rule's receipts live in the oracle's reopen records). Refs beside a refused or absent catalog still draw their per-site C7 findings — the belt's broken-operand nature (ADR-019 D10), a construct property no row needs to restate. |
| C2 | Block ids are ONE namespace with ONE grammar governing both the catalog keys and every ref-list member — structural authority `[vc-block-id]` (cited by `[d-block-key]` and `[d-block-ref]`). The namespace is NEW and deliberately distinct from the gate-token and provider-token namespaces; the model's exhibited ids are members, including the digit-bearing form (the lane's named success member, build-driven). A key the grammar refuses draws the key lane's finding at the declared grain; key-identity on the file channel follows the engine's preserved key types (PROBE-P4-3's boolean-key case: the key lane reports it, and no string ref can address it). |
| C3 | A catalog entry is the body carrier — structural authority `[d-ctx-entry]` / `[d-ctx-body]` (fixed keyset, required nonempty body, fail-closed unknown keys). The body is authored static prose rendered VERBATIM into the packet; it is template-authored definition data by construction (no runtime or run-supplied channel reaches the position — C5 closes the only nearby run-scoped channel), and its outbound exposure class is the shipped instruction field's. SEMANTIC (no declaration expresses an absence of syntax): no interpolation syntax exists and NONE IS RESERVED — brace-styled literal text is legal prose; any future computed-body syntax and its migration belong to the chapter that takes the computed-bodies Absent. |
| C4 | `promptConcernRefs` is the ONE typed field of the otherwise format-open agent-config value class, at both of the template's config positions — the role-level default and the step-level map — structural authority `[d-prompt-refs]` on `[vc-agentconfig]`, value class `[vc-blockidlist]`; the typing basis is ADR-019 D11 (typed subset: every other agent-config key stays legal open data). This realizes the ch12-C7 delegation clause (the refs' value class arriving with its consuming chapter) — an aggregate-noted arrival, no ch12 row moves. Absent map, absent key: legal, zero refs (the admitted-form surface is C13's). |
| C5 | Run scope: a runOverrides entry MAY carry `promptConcernRefs`, but no run-supplied value is checked against the catalog, and rendering never consults it: block emission draws exclusively on the admission-produced surfaces (C13). The packet's block list is therefore the communicated truth, while the merged effective config stays what it always was — recorded run intent in the ch12 cascade. An entry whose only naming mentions arrive at run scope therefore fails C9's audit: dead by design, the two rows compose. |
| C6 | The gate-binding ref position: `contextBlockRefs`, legal on ANY binding regardless of evaluator class (carried decision — communication is evaluator-independent) — structural authority `[d-ctx-gate-refs]` on the binding's declaration, value class `[vc-blockidlist]` (identical semantics to C4's position). The binding keyset itself is ch11-C4's realized text (grown by the executed 2026-07-26 reopen act — history, not a duty of this draft). |
| C7 | Resolution is ENTRY-BELTED (ADR-019 D10, the construct this surface carried into the vocabulary): every ref member that passed its own shape lane must resolve against the keys of the catalog WHOSE VALUE IS A VALID ENTRY — validity measured by the catalog's own declared entry node, one definition governing both channels; key existence alone is not resolution. Structural authority: `[vc-blockidlist]`'s membership rule, carrying the ratified code `unresolved_context_block_ref` on exactly this lane, one finding per unresolved site, all sites accumulated. When a ref names an entry the declaration refuses, both facts report — the entry's finding and the coded finding at the ref site — each fixable on its own (PROBE-P4-1). DECIDED HERE (v2): the resolution lane measures EVERY shape-passing occurrence — a duplicated unresolved ref reports per occurrence beside C8's duplicate finding (probe: PROBE-P4-3 DUP_GHOST). This supersedes the superseded line's first-occurrence-carries-resolution rule: that rule was a cross-lane coupling (the duplicate lane deciding the resolution lane's domain), the exact dependency class whose deletion the 2026-08-01 reopen already ratified for the key-exclusion case, and per-lane independence is the engine's standing shape. |
| C8 | Duplicates: a repeated id within one ref list draws the per-occurrence duplicate finding at the repeat's own index — structural authority `[vc-blockidlist]`'s duplicate rule. DECIDED HERE (v2): a member that failed its OWN shape lane is invisible to every list-level lane — no duplicate finding, no membership finding; its own finding is the trace (probe: PROBE-P4-3 DUP_BAD_SHAPE). This supersedes the superseded line's unconditional raw-feed co-fire rule, on the same per-lane-independence ground as C7's marker: a lane whose domain depends on another lane's outcome is the coupling class this line exists to end, and the defect is never hidden — the member's own finding stands. |
| C9 | Unreferenced-entry hygiene — SEMANTIC (residual R2), realized at P5 as a named code lane: a catalog entry no ref names is a validation finding at the entry's path, strict-start (relaxable additively, never tightenable without a breaking change). Carried decisions, all three, restated fresh: WHAT COUNTS AS REFERENCED — every raw member string authored in any ref list whose container held, including members failing the grammar or repeating (a defective mention still names its target; the member's own lanes report the defect). WHAT GETS AUDITED — each key the catalog itself enumerates, unconditionally; no key earns an exemption from the shape of its value. WHEN THE CHECK STANDS DOWN — template-wide, whenever any ref position's container lane fired or the catalog's did: the audited set is assembled as one union over every list, and auditing a partial union would accuse entries whose only mentions sit inside the broken position. |
| C10 | Render order and provenance — SEMANTIC, runtime (realized at the render build): blocks emit by source — the role position first, the step position second, the gate position last — and inside one source the authored list sequence holds. The gate leg walks the admitted gates record in that record's own enumeration, each event's pipeline in its authored sequence, each binding's list likewise, with C11 deciding what may emit. That record enumerates as authored except where the substrate hoists integer-like quoted keys — DERIVED from the oracle line's key-order measurement (PROBE-CB3, recorded in the superseded contract's frozen Context), named measurer: the P5 render build re-executes the probe before pinning order fixtures. An id met a second time emits nothing new — its first position stands — while the provenance list records every emitter as encountered. The admitted-form construction order is thereby a contract-visible property, not a free refactor. Body text comes solely from the admitted catalog; after admission no lookup can fail, so a dispatch-time miss signals kernel-integrity drift and must abort loudly rather than degrade. |
| C11 | The gate-ref predicate — SEMANTIC, runtime: a gate binding may emit its blocks exactly when its transition belongs to both sets: the step's available operations AND the L1 capability narrowing (existing authority logic, nothing minted). The membership half is guaranteed once admission passed — every gates key is one of its step's transitions — so what tests it is the iteration-domain negative: no block may originate outside the dispatched step's own gates. The narrowing half owes its NON-WAIVABLE counterexample: a directly-constructed capability profile that narrows the dispatched role below its transitions must silence that gate's blocks although the event remains available. With default capability derivation the narrowing never bites, which is exactly why this counterexample may not be skipped (the green-but-blind class). The profile's type-level channel is declared at `[d-capability-profile]` (legal only on the direct-construction channel; authored restrictions stay a deferred Absent). |
| C12 | The packet field — SEMANTIC, wire: `ContextPacket.contextBlocks` is ALWAYS present (possibly empty), an ordered list of id + body + provenance, list order being C10's render order, travelling verbatim through the canonical packet channel (object keys canonicalize, array order is semantic). A provenance source member is the model unit's tagged form; the gate member's location pair is flattened to sibling step/event fields (carried decision). When two bindings of one step and event name the same id, two identical source members appear — provenance is never collapsed. Because the field is unconditional, every full-packet equality fixture in the tree re-pins: one named family, membership enumerated by the owning packet. |
| C13 | The admitted-form surfaces — DERIVED, named measurer: the P5 build's acceptance family plus the parity gate. On admission success the admitted template carries: the catalog record (always present — the declared default covers absence; a present catalog arrives validated, C1 having refused every non-map form); and normalized ref-list fields FOR EVERY ref position (empty list where nothing was authored), produced by the normalizer (ADR-019 D3 — derivation is never validation), which requires a NEW normalizer hook: that hook is D7 format growth landing at P5's own act, never silently. REALIZATION DUTY, stated so P5 cannot forget it: the effective-config hook's carry list must grow `contextBlockRefs`, or the admitted binding drops the authored refs at the rebuild — the declared carry list is the admitted binding's whole keyset. Rendering consumes these admitted surfaces and nothing rawer — no re-validation at dispatch. The raw config maps retain the authored key untouched for the ch12 cascade to read (C5). No authored keyset widens: admission output owns the normalized positions exclusively, and an author writing one meets the standing unknown-key refusal. |
| C14 | Communication-only, byte-scope precise — SEMANTIC (disposition review): neither the packet field nor the catalog behind it may influence gate evaluation, transition verdicts, round arithmetic or any other kernel decision; the one stated exception is the definition-static family itself, where catalog content decides admission findings and nothing further. The canonical experiment: delete an entry together with its refs in a single edit — every verdict and transition must come out the same, and the differing bytes must be confined to the packet artifact plus, exactly where refs rode the config positions, the committed provenance rows (a ref was always config data there); deleting a gate-sourced ref must leave committed rows byte-identical. Spawn-side, both carriers are closed: the packet carries refs as data, and the argv-interpretation path is closed by the adapter's refs-uninterpreted rule (ch9). |
| C15 | Determinism — SEMANTIC (disposition test): rendering depends on nothing but its three inputs — instance, admitted template, step; no wall clock, no entropy, no store access outside them — so identical committed state under an identical admitted template must reproduce the block list byte for byte. Carrier: the P5-line golden trace plus a same-inputs double-render equality lane. |
| C16 | The shipped catalog — SEMANTIC, shipped-artifact duty: the canonical template file gains a catalog carrying the emit-envelope entry and BOTH roles gain a default-config ref to it (carried decision: every actor emits, the block is role-symmetric; this is the first agent-config-family authoring in a shipped template file). The entry's text gets written when the owning packet lands, sourced from the parity audit's interim knowledge carrier; retiring that carrier is bound to the EC chapter's definition of done. Ripple: the named fixture families (canonical-file equality pin moving with the file; effective-config and full-packet equality re-pins; committed-provenance re-pins; the golden-trace fixture disposition — both of its snake-spelled sites migrate onto the typed key together with a resolving catalog entry, which realizes the L0c slot; absence-consumers swept by key AND value), member enumeration the owning packet's. |
| C17 | Catalog-authoring caveat — aim, not enforcement: prose describing a gate's configured value carries no freshness guarantee — the config can move under it and nothing notices, because resolution checking establishes only that an id finds an entry, never that the entry's text still tells the truth. Closing the gap needs the two Absents this surface names and does not build (computed bodies, semantic parity); a later chapter owns both. A comment ships beside the catalog in the canonical file saying exactly this, sited where the author of the next entry will meet it. Nothing this chapter ships describes gate configuration, so nothing can go stale yet. |
| C18 | The CLI surface — SEMANTIC, machine-shape duty: no new verbs, no new flags; the chapter's lanes ride the existing validate/store/create channels unchanged, and C7's code travels end-to-end into the CLI document — build-driven by a lane asserting the code FIELD'S VALUE in the CLI JSON on a ch13-only fixture, and by its negative twin — no other lane of this chapter may carry any code, while the gate schemas' named lanes keep the codes they always had. |
| C19 | The lane inventory: this surface's definition-static lanes are exactly the DECLARED lanes behind the tags C1–C8 cite plus C9's one semantic lane — enumerated authoritatively by the declaration itself (the tag set is the inventory; a hand-kept lane list would be a second authority). Channel scope is an ENGINE property of the one declaration: no walk/rung realization split exists or is re-ratified, and the admit/refuse outcome is channel-symmetric by construction, finding sets differing only by source-bearing attributes. Named P5 build surfaces: the C9 lane, the C13 normalizer hook and carry-list growth, and the C16/C18 fixture duties. |

## Ratification history (empty at `draft` — blocks are appended by the lifecycle acts)

## Realized map (empty until chapter close)
