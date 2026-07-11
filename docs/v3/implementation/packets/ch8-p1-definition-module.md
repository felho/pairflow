# Task Packet: ch8-P1 — the definition module (YAML 1.2 load pipeline · fail-at-create validator · file-backed pinned DefinitionStore · lint boundary · the yaml dependency)

Plan step: plan.md §8.9 P1 row (realizes §8.3 format, §8.4 validator,
§8.5 store, §8.7 module home; the draft phase §8.8 is CLOSED — the
`ch8-template-format` contract-draft is ratified 2026-07-10).
Autonomy stage: measurement — **pre-approve** (first-of-a-kind per
§8.9: file-format parser/validator class; first draft-anchored packet;
the v3 package's first runtime dependency — human-approved per
README §5.5 regardless of stage).
Classification: **projection with ONE new-decision row** — manifest
tally: 36 anchored / 3 derived / 1 new-decision (machine-counted from
the `packet_rows` block). The new-decision row: E6 — the parse/resolve
message-echo adoption (the draft's deliberate non-row, packet-time
watchpoint 1, made a conscious contract here). Below the Case-B
triggers (one row; no authority / separation / availability-class
semantics — an error-message content choice on a local surface); it
rides as flag 1 to this first-of-a-kind human approve. The §8.9
pre-registered prediction (invention: memo-born) meets a projection
discovery — the draft phase absorbed the memo-born decisions between
prediction and authoring; flag 2 records the mismatch for the
boundary review.

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

Operability packet (plan §8.10: "empty ledger slices BY DESIGN — the
format is memo-born operability"): the file format has no model units;
the module realizes the ratified contract-draft, not ledger material.
Coverage axes unchanged — an assertion the close verifies, not an
omission.

## Sizing/risk (template §2 step 0 — materialized)

Predicted class (plan §8.9, recorded at the ch8 ratification):
**invention** (memo-born; draft: `contracts/ch8-template-format-contract.md`,
ratified 2026-07-10). Discovered at authoring: **projection with ONE
new-decision row** — the draft phase ratified the memo-born surface
BEFORE packet authoring, so every canonical row anchors to a ratified
C-row, an accepted ADR, or ratified plan text; the discovery is the
header's classification. The prediction/discovery gap is flag 2
(boundary-review material: what granularity does the prediction
convention bind — the surface's genesis or the packet-time manifest?).

Six axes:

- **authority movement:** NO — the module lands UNCONSUMED
  (foundation): no production call site wires `definition/` in this
  packet; the CLI keeps `builtinDefinitionStore()` and the testkit
  keeps `fixtureTemplate()` untouched until P2 (the migration packet).
  No source of truth moves; the canonical `local-pair-v0` file (C32)
  is deliberately NOT created here.
- **surface spread:** ONE concept (the authored-definition load
  surface) in ONE new production module (`src/definition/`), plus its
  two config carriers — the dependency landing (`v3/package.json` +
  `v3/pnpm-lock.yaml`) and the lint-boundary extension
  (`v3/eslint.config.mjs`). Zero kernel / store / ingress / floor /
  diag / CLI / testkit production changes (one comment-only edit on
  `ports/definition.ts`, S3 — no signature change). Testkit CONTRACT
  unchanged: tests stage real files in temp directories and consume
  the module's own API — no new fake, fixture type, or seam.
- **identity/join fragility:** shallow — the ref↔filename identity
  (S1/S2) is single-module and driven by dedicated lanes (byte-exact
  listing match, case-variant negative, declared-ref mismatch,
  traversal-shaped ref, the no-prevalidation twin). No cross-store
  join.
- **foundation + activation coupling:** NO — split by design at the
  chapter cut (plan §8.9: P1 foundation, P2 activation); the
  hard-stop-1 shape (both in one packet) cannot arise.
- **prerequisite coupling:** NO — the draft is ratified; ADR-011 and
  ADR-012 are `accepted` (verified in the live tree); no unfinished
  sibling work.
- **acceptance multiplicity:** ONE success-class family — the load
  pipeline's contract suite (the validator lane matrix + store
  dispositions + module-boundary probes), one proof surface (the
  module's own tests + executed lint probes).

Hard stops: none trip. Escalation combos below hard-stop: none (no
authority change; one surface family; one success class).
Consume-family scan: N/A — no authority movement (measured: the
current `DefinitionStore` consumers are kernel via the port, the CLI
builtin store, and the testkit fixture — all untouched; nothing
imports `src/definition/` at this packet's close).

Conditional annexes: **closure-budget triage** N/A — no
runtime-semantics / read-projection / shared-contract bucket is
touched (the shared `WorkflowTemplate` type is consumed read-only,
not changed; the port interface is byte-identical apart from a
comment). **Proof-boundary triage** N/A — no existing proof moves;
this packet only adds new proof surface. **Mutable-flow record** N/A —
no hard-stop-9 material: the store is read-only over the filesystem,
no rollback/retry/lock/ordering semantics exist or change.

**single-packet allowed: yes** — closure proof: one bounded build
(one new module + one dependency + one lint entry) closed by one
proof surface (the module suite + the lint probes); no consumer
fallout is possible (zero importers, measured); no separate
sequencing, no per-consumer-family review loop.

## Draft-row disposition (scope statement — prose by design)

Realized here: draft rows C1–C28 and C33–C36 (the format gates, the
error model, the validate lane inventory, the store, the dependency,
the directive/merge-key/pipeline rows). Pre-realized SHAPE only: the
`{stage, findings}` machine shape C31 declares for the CLI error doc
is defined by this packet's typed error (E5) so P2 can surface it
verbatim; C31's CLI behavior itself (verb, exit codes, doc name
`TemplateInvalid`) stays P2's. Deferred to P2 in full (plan §8.9):
C29–C30 (CLI config lane + `start` ref flag), C31/C38 (CLI surfacing),
C32 (the canonical `local-pair-v0` file + builtin retirement), C37
(dev `replay` repoint). No draft row is undisposed.

## Claim + dimensions (enumerated BEFORE deriving test rows)

**Claim (wide):**

1. **Fail-closed loading:** ANY input byte sequence yields either a
   COMPLETE, valid `WorkflowTemplate` or a typed, staged error result
   — never both, never a partial template, never a silent repair or
   drop. Invalid bytes, foreign `%YAML` directives, duplicate keys,
   multi-document streams, custom tags, unknown keys on fixed-keyset
   maps, and cyclic value graphs ALL reject. No load input produces
   an uncaught throw out of the pipeline or the store.
2. **YAML 1.2 semantics, guaranteed and closed:** only `true`/`false`
   are booleans; the guarantee is closed against every discovered
   override channel — the in-document `%YAML` directive (G7), merge
   keys (G9), and the warnings channel (G4) — per the ratified
   draft's probe record.
3. **Staged error model:** findings are typed, machine-shaped, and
   stage-labeled; the pipeline short-circuits so one result carries
   exactly one stage's findings; validate findings accumulate
   path-addressed in ONE result with dependent-lane suppression
   (one defect → one finding set, never a cascade).
4. **Shape fidelity:** every template that emerges satisfies the
   realized domain shape 1:1 (the `WorkflowTemplate` field lists
   below) — the validate lane inventory IS rows V1–V17, and every
   lane is driven by an executed negative derived from these claims,
   never from the implemented rule list.
5. **Store honesty:** pinned `{id, version}` load only; identity is
   byte-exact against the directory LISTING (never OS path
   resolution); the declared `ref` block is the authority; invalid or
   unreadable is NEVER conflated with absent; the `DefinitionStore`
   port signature is untouched.
6. **Confinement:** no 85-registry rejection name (nor a near-match)
   exists on the load side; `definition/` imports only `domain/`
   (types), `ports/`, node builtins, and `yaml`; no production module
   imports `definition/` at this packet's close; the dependency is
   confined to the module.

Dimensions:

1. **Parse-gate lanes** (G2–G9): each gate driven with a hostile
   fixture staged as RAW YAML text (R-RAW-FIXTURES satisfied by
   construction — no stringify staging): 1.1-coercion forms, invalid
   UTF-8 bytes, custom tag, `BAD_DIRECTIVE`, multi-document, duplicate
   keys, `%YAML 1.1` (silent) and `%YAML 1.3` (warning), alias bomb,
   merge key in both map kinds; plus the clean-baseline positive
   (zero errors, zero warnings on the canonical example).
2. **The version source-form ladder** (V3): positives `1`, `10`,
   `9007199254740991`; source-form negatives `0`, `-0`, `-1`, `+1`,
   `1.0`, `1.10`, `01`, `0x10`, `1e2`, `"1"`, `'1'`, anchored `&v 1`,
   alias `*v`, tagged `!!str 1`; the resolved-value belt
   `9007199254740993` (source regex passes, safe-int fails). The
   `-0`/`Object.is` rung is closed at the SOURCE rung (stated in V3)
   AND driven by execution: `version: -0` staged as RAW text — the
   R-RAW-FIXTURES birth-hazard form, never serializer-built.
3. **Id/name grammar lanes** (V2, V5): id regex negatives (uppercase,
   leading `-`, empty, non-string resolved values); the shared
   namespace grammar negatives per id class (step id, terminal id,
   role name, event type) × (whitespace incl. a `\s`-matched unicode
   space, dot, empty).
4. **Structural shape lanes** (V1, V4, V6–V15): per container —
   missing key, unknown key, wrong-kind value; `kind:` today rejects
   as unknown (V16); empty `transitions` is LEGAL (V7 positive); and
   the cross-node REFERENCE-INTEGRITY negatives, each direction
   named: an undeclared-but-used role AND a declared-but-unused role
   (V11); a duplicate terminal id AND a terminal id colliding with a
   step id (V12); `start` naming a missing step (V13); a transition
   target naming neither a step nor a terminal (V14).
5. **Suppression combinations** (E2): non-map root (list, scalar,
   empty-doc null) → ONE finding at `$`; `ref: 1` → ONE finding, no
   id/version cascade; a wrong-kind `steps` WITH `start` present →
   only the `steps` finding (C16/C18/C19 suppressed); a wrong-kind
   step value → one finding, no role/instruction cascade.
6. **Accumulation** (E2): one multi-defect file (bad `start` +
   unknown transition target + unused declared role) → ALL findings
   in ONE result (membership asserted, not order — C21 contracts
   accumulation, not ordering).
7. **Short-circuit combinations** (G1/E5): duplicate key AND missing
   `start` in one file → parse findings ONLY; alias bomb AND shape
   defects → the resolve finding ONLY; one stage per result asserted
   on every error lane (E5's top-level `stage` = the entries' marker).
8. **Parse-stage ordering** (E1/G7): two custom tags → two findings
   in source order; `%YAML 1.3` + custom tag → both warnings, source
   order; a warning positioned BEFORE an error in source still lists
   AFTER it (class-major order); the COMBINATION lane for the
   heads-the-list claim: `%YAML 1.1` (silent adoption) + a duplicate
   key in one document → the synthesized directive finding FIRST,
   then the error.
9. **Store dispositions** (S1–S4): hit (canonical example loads);
   miss → `null`; case-variant filename on the case-insensitive
   default macOS FS → `null` (byte-exact listing, never
   `statSync`-resolution); declared-ref mismatch → `store`-stage
   error at path `ref`; present-but-invalid → typed rejection (never
   `null`); present-but-OS-unreadable (a DIRECTORY named
   `x@1.yaml` → EISDIR) → read-stage typed rejection with the OS
   code; unlistable templates dir → read-stage typed rejection over
   the dir path (S4); traversal-shaped ref (`{id: "../evil"}`) →
   `null` — the ref never contributes a path segment to an open; the
   no-prevalidation twin: requested `{id: "x", version: 1.5}` WITH a
   real `x@1.5.yaml` staged → typed rejection (the file's own V3
   lane, invalid ≠ absent), and WITHOUT it → `null`; the
   VALIDATE→STORE ordering COMBINATION lane: one file carrying BOTH
   a validate defect AND a declared-ref/filename mismatch → ONLY the
   validate findings surface (top-level `stage: "validate"`, no
   `store` entry) — S2's after-validate ordering falsifiable, not
   merely stated.
10. **agentConfig pass-through** (V9): an arbitrary nested map rides
    raw and deep-equal into `Step.agentConfig`; unknown keys INSIDE
    it are legal; a duplicate key inside it still rejects the
    document (G6); a custom tag inside it still rejects (G4); a
    cycle THROUGH it is V15's validate finding.
11. **Cycle safety** (V15): a cyclic alias graph (`a: &a {self: *a}`)
    → a validate finding; the validator neither hangs, throws, nor
    lets a circular value ride into a template.
12. **Round-trip fidelity** (Claim 4): the canonical example (the
    operative material below) loads to the EXACT expected
    `WorkflowTemplate` value — deep-equal, field-for-field against
    the domain field lists.
13. **Module boundary + dependency** (B1–B4): executed lint probes
    (static AND dynamic testkit/drift import in `src/definition/` →
    red; a legal `domain`/`yaml` import → green; probes reverted);
    `pnpm ls yaml` → one package, zero transitive dependencies;
    zero production importers of `definition/` (grep at close);
    plus E4's 85-registry name-string sweep over `src/definition/**`
    (zero hits at close).

## Realized domain shape (field lists — R-FIELD-LISTS)

The validate target, verbatim from `v3/src/domain/template.ts` (the
ch-4 realized aggregate; the format maps onto it 1:1 and does NOT
extend it — plan §8.1):

```ts
export interface TemplateRef {
  readonly id: string;
  readonly version: number;
}

export interface Step {
  readonly role: RoleName;
  readonly instruction: string;
  /** event_type → target step; every target ∈ steps ∪ terminal. */
  readonly transitions: Readonly<Record<EventType, StepId>>;
  /** Raw optional pass-through until L0c (dispatch_intent unit comment). */
  readonly agentConfig?: unknown;
}

export interface WorkflowTemplate {
  readonly ref: TemplateRef;
  readonly start: StepId;
  readonly steps: Readonly<Record<StepId, Step>>;
  /** "target is terminal" ⇔ listed here. */
  readonly terminal: readonly StepId[];
  /** Actor defaults (l0b): resolve_binding = default_actor + start overrides. */
  readonly roles: Readonly<Record<RoleName, { readonly defaultActor?: ActorId }>>;
}
```

(`StepId`, `RoleName`, `EventType`, `ActorId` are plain string aliases
— `domain/ids.ts`.)

**Canonical example (the draft's Context example — the round-trip
positive's fixture; illustrative of the format, the rows are the
contract):**

```yaml
ref:
  id: local-pair-v0
  version: 1
start: implement
steps:
  implement:
    role: implementer
    instruction: |-
      build it
    transitions:
      PASS: review
  review:
    role: reviewer
    instruction: |-
      review it
    transitions:
      PASS: implement
      CONVERGED: done
terminal:
  - done
roles:
  implementer:
    defaultActor: codex
  reviewer:
    defaultActor: claude
```

## Canonical load-pipeline gate matrix (G)

| Id | Rule |
|---|---|
| G1 | The load pipeline is staged IN ORDER: **read** (bytes → string, strict UTF-8 per G3) → **parse** (the G4 document step AND the G7 directive check) → **resolve** (`toJS()` — where the alias-amplification guard fires) → **validate** (E2, incl. V15's acyclicity); on a load-by-ref the store's post-validate ref-check (S2) is the final stage. Each stage SHORT-CIRCUITS: the first failing stage's finding(s) are the ENTIRE result — findings of two stages never mix. EVERY stage's unexpected throw is CAUGHT and mapped to that stage's finding form (the C36 resolve clause, generalized by C22's every-stage bind): no load input may produce an uncaught throw (anchored: contract:ch8-template-format#C36) |
| G2 | YAML, parsed with YAML 1.2 core-schema semantics: only `true`/`false` are booleans; `on`/`yes`/`no`/`off` parse as STRINGS (probe P1) (anchored: contract:ch8-template-format#C1) |
| G3 | Template sources are UTF-8, decoded STRICTLY (`TextDecoder("utf-8", {fatal: true})`): invalid byte sequences are a read-stage load error — never the platform's silent U+FFFD substitution, which would repair a malformed file into a different one (probe P19b) (anchored: contract:ch8-template-format#C6) |
| G4 | The loader uses the yaml DOCUMENT API and promotes BOTH `doc.errors` AND `doc.warnings` to load errors (fail-closed): an unresolved custom tag — a parser WARNING, not an error (probes P6/P6b) — is thereby rejected, as is a `BAD_DIRECTIVE` warning (probe P18); the clean-document baseline is zero errors and zero warnings (probes P6c/P15). This inspection covers the DOCUMENT step only — the resolution step has its own guard mapping (G8); the promoted set forms the parse stage's ORDERED finding list (E1) (anchored: contract:ch8-template-format#C2) |
| G5 | One YAML document per file; a multi-document stream is a load error (probes P5/P6e) (anchored: contract:ch8-template-format#C3) |
| G6 | Duplicate map keys are a load error (probes P2/P6d) — document-wide, `agentConfig` interior included (V9's exemption is from the SHAPE rows only) (anchored: contract:ch8-template-format#C4) |
| G7 | A document whose explicit `%YAML` directive declares a version OTHER than 1.2 is a load error (parse stage). The cover is a UNION of two mechanisms, honestly split: the directive-object check (`doc.directives.yaml.explicit && version !== "1.2"`) catches ONLY the silently-ADOPTED case — `%YAML 1.1`, zero errors zero warnings, restoring the full 1.1 trap (`on` → boolean, `<<` merges), invisible to G4's inspection; every OTHER non-1.2 version (`1.0`, `1.3`, `2.0`, …) is NOT adopted — the formula does NOT fire — and raises a `BAD_DIRECTIVE` warning that G4's promotion rejects (probes P17/P18). The option pin `version: "1.2"` does NOT override an in-document directive; an explicit `%YAML 1.2` stays legal (probes P18b/P15). The silent case's finding is SYNTHESIZED (the parser emitted nothing) and HEADS the parse-stage finding list (E1); position fields are absent on it (the parser provides none — E1's "where the parser provides it") (anchored: contract:ch8-template-format#C34) |
| G8 | Anchors and aliases are legal and resolve to plain data — the validator sees only resolved values (probe P7a). The parser's alias-amplification guard is the resource bound and it fires at the RESOLUTION step (`toJS()`), NOT visible in `doc.errors`/`doc.warnings` (probes P8/P14/P16): the resolve-stage catch maps it to a single E1-form finding (`stage: "resolve"`). Acyclicity is V15's validate-stage row; the version rule's node-level inspection exception is V3's (anchored: contract:ch8-template-format#C5, contract:ch8-template-format#C36) |
| G9 | Merge keys are NOT a format feature: under the enforced 1.2 semantics `<<` never merges (probe P7b; the 1.1 mode where it would is blocked by G7). In a FIXED-KEYSET map `<<` is rejected as an unknown key (V8); in an OPEN-KEY map it is a legal-but-meaningless token per V5's grammar — the format assigns it NO semantics anywhere (anchored: contract:ch8-template-format#C35) |

## Canonical error-model matrix (E)

| Id | Rule |
|---|---|
| E1 | Read/parse/resolve stages emit POSITIONAL findings — `{stage, line?, col?, message}` (line/col 1-based, present where the parser provides them, probes P9/P13) — exempt from E2's path accumulation, short-circuiting per G1. READ and RESOLVE failures are each a SINGLE finding (one decode/OS throw, one guard throw). The PARSE stage's result is the FULL promoted diagnostic set (G4: `doc.errors` ∪ `doc.warnings` — several per document possible, probe P23) as ONE ORDERED list: errors first, then warnings, each class in the parser's array order (= source-position order within the class, probes P23d/P23e); the class-major order is DECLARED, not positional — a warning may precede an error by source position and still list after it (probe P23c). When G7's silent-directive check fires — with zero promoted diagnostics or alongside them — its SYNTHESIZED finding HEADS the list: directive finding, then errors, then warnings. READ-stage findings carry the requested `path` (presence scoping: E5's rule — canonical there) and NEVER file content; the OS-read half additionally carries the OS error `code`, while the strict-decode half (G3) has no OS errno — it carries a content-free decode message (probe P19b). No snake_case error NAME exists on the load side — `stage` + `message` carry it (E4 owns the boundary rule this clause faces) (anchored: contract:ch8-template-format#C20) |
| E2 | Validate stage: ALL structural findings are ACCUMULATED as `{path, message}` entries with dotted paths (e.g. `steps.review.transitions.PASS`; the root is the token `$`) and returned in ONE result — never first-error-only. Finding ORDER within the result is NOT contracted (C21 fixes accumulation; tests assert membership). Dependent-lane SUPPRESSION binds EVERY container precondition — a container MISSING or not its required kind yields ITS OWN finding (absence = the owning keyset row's missing-key finding) and suppresses the dependent lanes that presuppose it. The container set, in full, each in BOTH missing and wrong-kind form: the root (V1), `ref` (V2 — `ref: 1` or absent `ref` is ONE finding, never id/version lanes over undefined), `steps` and EACH step value (V4), `roles` and EACH roles entry (V10), `terminal` (V12), each `transitions` map (V7); suppressed dependents e.g. V11/V13/V14 over `keys(steps)`, V2/V3's field lanes under a malformed `ref` — one defect, one finding set, never a cascade (anchored: contract:ch8-template-format#C21) |
| E3 | The validator returns a template XOR an error result; nothing partial ever escapes — no partially-populated `WorkflowTemplate` exists on any error path (anchored: contract:ch8-template-format#C22) |
| E4 | Channel boundary: load findings are LOAD-side typed errors — never envelope rejections and never 85-registry names, near-matches included (`missing_role`, `missing_version`, `unknown_target`, `missing_required_field`, `invalid_shape`, the `invalid_*` family): those names belong to ENVELOPE/model surfaces, and template validation precedes any envelope — there is no instance and nothing to reject INTO (the `start.ts` precedent). The `DefinitionStore` port's null-at-start / throw-at-handle contract is unchanged. Driven disposition of the near-match clause: foreclosed BY CONSTRUCTION — E5's exact keysets carry NO name field anywhere on the load side (asserted on every error lane) — and swept at close: a grep over `src/definition/**` for the 85-registry name strings returns zero (the acceptance dimension-13 sweep) (anchored: contract:ch8-template-format#C23) |
| E5 | The typed error's MACHINE SHAPE is `{stage, findings}` — the shape C31 declares for the P2 CLI error doc's `details`, defined HERE so P2 surfaces it verbatim: the top-level `stage` names the failing stage (`read` \| `parse` \| `resolve` \| `validate` \| `store`; for an E1-form list it EQUALS the entries' own stage marker — the duplication is deliberate, the top-level key is the routing field); `findings` entries are the E1 form (`{stage, path?, code?, line?, col?, message}` — `path` REQUIRED on read-stage entries, `code` = the OS error code on their OS half, both absent on parse/resolve entries) or the E2 form (`{path, message}`) — never a mixed list (G1's short-circuit guarantees one stage per result). Read-stage `path` PRESENCE SCOPING (canonical here; E1, B4, and the grid defer): REQUIRED on every entry surfaced by a FILE-READING caller — the store (the matched path, or the directory on S4's lane) and P2's dev `validate` (its positional), which is the surface C31's REQUIRED binds — while the bare bytes-level entry (B4) stamps it iff `opts.path` was supplied; both in-repo callers always supply one. The store REJECTS with a typed `TemplateLoadError` (a code identifier, not a doc name — the CLI doc name `TemplateInvalid` is C31's, P2) carrying this shape; the bytes-level pipeline entry RETURNS it as a result value (E3's XOR — B4's surface) (anchored: contract:ch8-template-format#C31, contract:ch8-template-format#C20, contract:ch8-template-format#C21) |
| E6 | Message-content classification (every free-text-capable field, stated in its own row): READ-stage messages are content-free by contract (E1 — sanitized-by-contract; the OS half carries the errno token, the decode half a fixed decode message). PARSE/RESOLVE-stage `message` fields ride the yaml library's own text AS-IS — source echo included (the library's pretty-printer quotes offending lines): UNTRUSTED-CONFINED free text, adopted CONSCIOUSLY (the draft's packet-time watchpoint 1 — point-at-the-error UX for a local operator tool; no sanitization layer is built). VALIDATE-stage messages are our own constructed text and MAY carry offending key/id tokens from the file (V8 REQUIRES naming the offending key): untrusted-confined likewise. The `path`/`code` fields complete the per-field inventory: E2 dotted paths carry author-controlled id tokens (bounded by V5's grammar), read-stage `path` values are caller/operator-supplied local paths, `code` is an OS errno token — the same untrusted-confined class, never file content. Confinement boundary: the typed error object; this packet wires NO output surface — the downstream surfaces (C31/C38 stderr docs) are LOCAL per the draft, and the export boundary (the bundle) never receives load errors. NEW-DECISION (flag 1): the echo adoption is the draft's deliberately-unratified choice, decided here, below Case-B |

## Canonical validate lane matrix (V)

The draft's lane note binds: these rows (with the G gates) ARE the
validator's lane inventory — each row is a lane whose violation is a
driven negative; no separate exhaustive matrix restates them.

| Id | Rule |
|---|---|
| V1 | Top-level shape: a map with EXACTLY the keys `ref`, `start`, `steps`, `terminal`, `roles` — all five required. A NON-MAP root (the empty document's `null`, a list, a scalar — probe P10) is ONE validate finding at `$` (E2), never five missing-key findings. Forward rule (the V17 mirror, plan §8.2 rule 2): fixed keysets grow ONLY by ADDITIVE OPTIONAL keys ratified in the realizing chapter, each with a behavior-preserving default — never by silent extension (anchored: contract:ch8-template-format#C7) |
| V2 | `ref` is a map with exactly `id` and `version`; `id` is a STRING (a non-string resolved value is rejected) matching `^[a-z0-9][a-z0-9-]*$` (filename-safe) (anchored: contract:ch8-template-format#C8) |
| V3 | `version` is an integer ≥ 1 written as a PLAIN scalar in decimal form — the scalar's SOURCE TEXT must match `^[1-9][0-9]*$`, where "source text" means the RAW representation including quote/style characters (the node's range slice or `type`, never the quote-stripping `.source` — probe P11), because the resolved value cannot carry the distinction: `1.0` resolves to integral 1 and `0x10` to 16 (probes P3/P19a) — float forms, quoted/string forms, and alternative bases are ALL rejected on the source form. `version` must additionally be ANCHOR-FREE, NON-ALIASED, and TAG-FREE — the anchor and tag tokens sit OUTSIDE the range slice: `version: &v 1` slices to `1` with `node.anchor === "v"`; `version: !!str 1` slices to `1`, types PLAIN, raises no warning, yet resolves to the STRING `"1"` (probes P21/P22) — and its RESOLVED value must be a SAFE integer (`Number.isSafeInteger` — past 2^53−1 distinct source strings collapse to one float, defeating identity): the resolved-type check is the symmetric belt the `id` clause carries. Ladder statement (R-NUMERIC-LADDER): value → source-form descriptor → node type/anchor/tag → numeric identity (the `Object.is` rung); the `-0` rung is CLOSED AT THE SOURCE RUNG — the source regex admits only `[1-9]`-led strings, so no zero form (including `-0`, whose `Number.isSafeInteger` is true and whose `< 0` is false) can reach the resolved-value check (anchored: contract:ch8-template-format#C8) |
| V4 | `steps` is a NONEMPTY map of step-id → step; a step is a map with exactly `role`, `instruction`, `transitions`, plus the optional `agentConfig` (anchored: contract:ch8-template-format#C9) |
| V5 | Step ids, TERMINAL ids, role names, and event types are nonempty strings containing no whitespace character (`/\s/u`) and NO `.` — the dot is E2's path-segment separator, and banning it in every id class keeps each error path's segment boundaries reconstructable on the machine-read error surface (strict start; a relaxation would first need a path-escaping grammar). Terminal ids share the transition-target namespace with step ids (V14), so the whole namespace carries ONE grammar (anchored: contract:ch8-template-format#C10) |
| V6 | `instruction` is a nonempty string; multiline prose is first-class via block scalars and the format performs NO whitespace normalization — trailing-newline behavior is the author's, via the chomping indicator (probe P4) (anchored: contract:ch8-template-format#C11) |
| V7 | `transitions` is a map of event-type → target id and MAY be empty: a step with no transitions is semantically defined (at runtime every event yields the model's `no_transition` rejection) — the format does not forbid the shape (anchored: contract:ch8-template-format#C12) |
| V8 | Two kinds of map: FIXED-KEYSET (the top level, `ref`, each step, each roles entry — legal keysets per V1/V2/V4/V10) and OPEN-KEY (`steps`, `transitions`, `roles` — their KEYS are data governed by V5; their VALUES by their own rows). The unknown-key rule binds FIXED-KEYSET maps only: an unknown key there is a validation error naming the exact path and the offending key (plan §8.2 rule 4, fail-closed); an open-key map has no "unknown" key by construction. `agentConfig` is exempt entirely (V9) (anchored: contract:ch8-template-format#C13) |
| V9 | `agentConfig` accepts any resolved value that SURVIVES the document-wide G-gates AND V15's acyclicity (a custom tag or duplicate key inside it still rejects the document; a cycle inside it is V15's validate error) and passes through raw and uninterpreted into `Step.agentConfig` (the L0c pass-through); the exemption is from V8's unknown-key rule and the shape rows ONLY (anchored: contract:ch8-template-format#C14) |
| V10 | `roles` is a map of role-name → a map whose only legal key is the OPTIONAL `defaultActor`; when present, `defaultActor` is a nonempty string (anchored: contract:ch8-template-format#C15) |
| V11 | Role-set discipline: `keys(roles)` equals EXACTLY the set of roles referenced by steps — an undeclared-but-used role AND a declared-but-unused role are both validation errors (strict start; any relaxation is additive later). Resolves the `start.ts` forward pointer; the comment retirement itself is P2's sweep (anchored: contract:ch8-template-format#C16) |
| V12 | `terminal` is a nonempty list of unique ids, disjoint from `keys(steps)` (anchored: contract:ch8-template-format#C17) |
| V13 | `start` ∈ `keys(steps)` (anchored: contract:ch8-template-format#C18) |
| V14 | Every transition target ∈ `keys(steps)` ∪ `terminal` (anchored: contract:ch8-template-format#C19) |
| V15 | The resolved value graph must be ACYCLIC: a cyclic alias structure passes the parser AND the count-only amplification guard (probe P20 — `toJS()` returns a CIRCULAR object, no throw) and is a VALIDATE-stage error; the validator is cycle-safe by contract — it may not loop, throw uncaught, or let a circular value ride into the template, `agentConfig` included. V3's version-identity check is the NAMED EXCEPTION to values-only validation: the validate stage receives BOTH the resolved value graph AND the source document — node-level inspection is confined to V3's rule (anchored: contract:ch8-template-format#C5) |
| V16 | No format-version field exists; evolution is additive-only per plan §8.2; `kind` is RESERVED as the future format-family discriminator — its appearance today is an unknown key under V8 (driven) (anchored: contract:ch8-template-format#C24) |
| V17 | The removed/renamed-key registry is the draft's appendix table — EMPTY at v0; a listed key is rejected with its recorded migration text; every future removal/rename appends a row in its removing chapter, never a silent ignore. At v0 this packet ships NO registry mechanism: with zero rows the rule is vacuously realized — every unknown key takes the V8 lane — and an empty-table lookup would be dead code no test can drive (R-EXECUTION: an obligation counts when it RUNS). The mechanism lands additively with the FIRST registry row, in its removing chapter. DERIVATION: C25's normative force at v0 is exhausted by the empty appendix + V8's fail-closed lane; the alternative (shipping an empty lookup now) adds undrivable dead code and no contract force — strictly weaker, not equally consistent (derived: contract:ch8-template-format#C25) |

## Canonical store matrix (S)

| Id | Rule |
|---|---|
| S1 | The file-backed `DefinitionStore` is DIRECTORY-backed: for ref `{id, version}` the target filename is exactly `<id>@<version>.yaml` (the requested version rendered in decimal via `String(version)`) under the configured templates directory, and the match is BYTE-EXACT ON THE DIRECTORY LISTING (`readdir` + string equality) — never OS path resolution, which is case-insensitive on the default macOS filesystem and would resolve case-variant names (probe P12); presence/absence is thereby platform-independent. Consequences, stated: the only path ever OPENED is the directory joined with a MATCHED LISTING ENTRY — no caller-controlled path segment reaches an open call, so a traversal-shaped ref (`{id: "../evil"}`) can only miss (readdir entries contain no separators): the REF can never direct an open outside the directory. The directory's own CONTENT is a different axis and is operator-trusted (the README §5.5 threat model): a listing entry that is a SYMLINK is opened through the OS's follow semantics — NO no-follow claim is made (external-arm probe, 2026-07-10: readdir lists the symlink's own name, `readFile` follows its target; an lstat-reject rule would be an unanchored new decision and is deliberately not minted). The requested ref is NOT prevalidated: no byte-exact listing entry → `null`; when a matching entry DOES exist for an off-grammar request (e.g. `version: 1.5` rendering `x@1.5.yaml` against a real file of that name), the file loads and is judged by its OWN content — its version source form fails V3 — a typed rejection per S3's invalid≠absent rule, never a `null` special case. The listing is FRESH per `load` call — no process-local cache is authority (REV-B). The store does NOT validate the directory at construction — failures surface per-load (S4; the eager CLI-wiring gate is C29's, P2) (anchored: contract:ch8-template-format#C26) |
| S2 | The declared `ref` block is the AUTHORITY over identity; the store compares it against the ON-DISK filename it matched (S1's listing entry) and a mismatch is a load error — the store layer's OWN stage, running AFTER validate (it needs the well-formed `ref`) and short-circuiting like every G1 stage; its finding is an E2-form entry at path `ref`, and its stage label is `store` (completing the stage vocabulary: `read`/`parse`/`resolve` from E1, `validate` from E2, `store` from this row). The check belongs to load-by-ref only. Neither side is silently trusted (anchored: contract:ch8-template-format#C27) |
| S3 | `load(ref)` disposition: a MISSING file (no byte-exact listing match) resolves `null` — the port's start-side not-found contract; a PRESENT file failing ANY load stage (read/parse/resolve/validate, or S2's post-validate ref-check — including an OS read failure on a present file) REJECTS with the typed `TemplateLoadError` carrying that stage's finding(s) per E5 — invalid or unreadable is NEVER conflated with absent. The port SIGNATURE is untouched (a Promise may reject by type — E4); this packet documents the may-reject character on the port's comment (`ports/definition.ts` — comment-only edit) so the kernel's propagate-through behavior rests on stated contract, not incident (anchored: contract:ch8-template-format#C28) |
| S4 | An UNLISTABLE templates directory (absent, not a directory, unreadable) at `load(ref)` is a TYPED rejection — the read stage's OS half over the DIRECTORY path (`{stage: "read", path: <dir>, code: <errno>, message}`) — never `null`. DERIVATION: `null` is C28's no-byte-exact-listing-match state, and an unlistable directory yields NO listing to match against; C28's character ("invalid or unreadable is NEVER conflated with absent") binds the conflation; the stage label cannot be `store` — C27 fixes that stage as "running AFTER validate" while this failure precedes read — so C20's OS-read half (requested path + OS error code, no content) is the only label consistent with both rows. C29's eager CLI gate (P2) keeps the operator path from ever reaching this lane; it exists for the API surface itself (derived: contract:ch8-template-format#C20, contract:ch8-template-format#C28) |

## Canonical module-boundary and dependency matrix (B)

| Id | Rule |
|---|---|
| B1 | Module home: `src/definition/` — a NEW top-level v3 module (ADR-011, accepted at the ch8 ratification). Import stance: `definition/` imports `domain/` (types), `ports/`, node builtins, and `yaml` ONLY; no production module imports `definition/` at this packet's close — nothing consumes it until P2 wires the composition roots (the kernel's ALLOWLIST lint already bans it for kernel files mechanically; broader mechanical enforcement is NOT added here — plan §8.7 scopes P1's lint work to the testkit/drift extension, and the stance is ADR-011's, checked at the ADR compliance review + measured at close: zero importers) (anchored: ADR-011, prose:plan §8.7) |
| B2 | The lint-boundary extension: the production testkit/drift import bans extend to `src/definition/**` — the STATIC entry (`src/definition/**` joins the ban files list) AND the DYNAMIC form (a merged `no-restricted-syntax` entry carrying `dynamicTestkitDriftSelectors`, per the config's flat-config MERGE RULE — definition/ claims no other syntax selectors, so it joins the plain group). Executed probes for BOTH forms (R-CLAIM-FORM-PROBES: probe the claim's form dimensions, not the rule's shape): a static testkit import in `src/definition/` → red; a dynamic `import("../testkit/…")` → red; the legal imports (a `domain/` type import, the `yaml` package) → green; probes executed and REVERTED, transcripts in the build record (anchored: prose:plan §8.7, ADR-011) |
| B3 | The dependency landing: `yaml` (eemeli/yaml) major 2 — probed at 2.9.0 — as the v3 package's FIRST and only runtime dependency (`v3/package.json` + `v3/pnpm-lock.yaml`; ADR-012, accepted with the draft ratification). Zero transitive dependencies verified at install (`pnpm ls yaml` → one package, measured at build); imported ONLY by `src/definition/**` (B2's boundary + the module's own import stance). The substrate probe record binds 2.9.0; the lockfile pins the exact version; the minor-upgrade probe gate is closed as ENVIRONMENT — see in-context note 5 (anchored: contract:ch8-template-format#C33, ADR-012) |
| B4 | The module's public surface (`definition/index.ts`), fixed so P2 anchors to packet contract, not to reading the code: (1) `loadTemplate(bytes: Uint8Array, opts?: { path?: string }): TemplateLoadResult` — the G1 pipeline over raw bytes (read stage = the strict decode; the OS half belongs to the CALLER that reads files), returning `{ok: true, template}` XOR `{ok: false, error}` (E3/E5 — a result value, no throw on content failures); `opts.path` stamps read-stage findings (E5's path-required rule — the store always passes the matched path; P2's dev `validate` passes its positional). (2) `createFileDefinitionStore(templatesDir: string): DefinitionStore` — S1–S4 over the port, REJECTING with `TemplateLoadError` per S3. (3) The types: `TemplateLoadResult`, `TemplateLoadError` (an `Error` subclass carrying `{stage, findings}`), and the finding forms (E1/E2). DERIVATION: the three elements are exactly what P2's ratified consumers need — C31's one-file pipeline (bytes fed past its pre-pipeline OS gate), C29/C38's store wiring, C31/C38's `{stage, findings}` details — and E3's XOR fixes the result-value shape; naming is packet work by the draft's own convention ("the exact flag shape is packet work") (derived: contract:ch8-template-format#C31, contract:ch8-template-format#C29, contract:ch8-template-format#C38) |

## Site × shape × stage grid (template §2 write-time discipline)

Trigger: the load seam's phases ARE its pipeline stages (read → parse
→ resolve → validate → store); there is no second phase axis (no
stop/drain path, no pre/post-commit — the store is read-only and the
module has no runtime lifecycle). The collapsed-lane inventory below
enumerates every throw/failure site of the module's own call graph —
the module awaits NO injected port (its dependencies are `node:fs` and
`yaml` only), so the port-rejection family has no members here.

| Site | Stage | Failure shape | Finding form + field provenance | Driven by / ruled out |
|---|---|---|---|---|
| `fs.readdir(templatesDir)` (store) | read (OS half, the directory) | OS errno: ENOENT / ENOTDIR / EACCES | `{stage:"read", path:<dir>, code:<errno>, message}` — path = the configured dir (in hand), code = the caught errno (no new fallible work) | DRIVEN: S4 lane (absent dir → typed rejection, not null) |
| `fs.readFile(dir + matched entry)` (store) | read (OS half, the file) | OS errno on a PRESENT listing entry (e.g. EISDIR) | `{stage:"read", path:<file>, code:<errno>, message}` | DRIVEN: S3 lane (a DIRECTORY named `x@1.yaml`) |
| `TextDecoder(…, {fatal:true}).decode` | read (decode half) | TypeError on invalid bytes (probe P19b) | `{stage:"read", path?, message}` — no OS code; content-free fixed message; path per E5's presence scoping (both in-repo callers supply one; the bare bytes entry stamps iff `opts.path`) | DRIVEN: G3 lane (raw invalid-byte file) |
| `parseDocument(text)` | parse | content diagnostics collect in `doc.errors`/`doc.warnings` — no throw observed on any probed content (probes P9/P13/P23) | the promoted ordered list (E1) | DRIVEN: G4/G5/G6/G7 lanes; the defensive stage catch (G1) stays — ruled out as a drivable lane (no known throwing input under the document API) |
| `doc.directives` inspection | parse | pure property read — no throw | the synthesized directive finding (G7), position-free | DRIVEN: G7 lanes incl. the heads-the-list combination (dimension 8) |
| `doc.toJS()` | resolve | the alias-amplification guard THROWS (`Excessive alias count`, probes P8/P14/P16) | caught → `{stage:"resolve", message}` — a SINGLE finding (E1) | DRIVEN: G8 lane (alias-bomb fixture) |
| the validator walk | validate | none by contract — pure, cycle-safe (V15); an unexpected throw is caught by G1's every-stage bind | E2-form accumulated findings; a caught unexpected throw maps to that stage per G1 | DRIVEN: V15 cycle lane (finding, not hang/throw); the unexpected-throw branch ruled out as a drivable lane (no known input; C22 belt stated in G1) |
| version node inspection (V3) | validate (the named exception) | pure range-slice/type/anchor/tag reads — no throw (probes P11/P21/P22) | V3's E2-form finding at `ref.version` | DRIVEN: the dimension-2 ladder lanes |
| `String(version)` + string equality (S1) | store (match; pre-read) | pure — no throw | n/a (a non-match is the `null` disposition, not a finding) | DRIVEN: S1 miss/case-variant/traversal lanes + the no-prevalidation twin's match half (which proceeds to validate — the V3 lane judges it) |
| ref-vs-filename compare (S2) | store (post-validate) | mismatch — not a throw site | E2-form finding at `ref`, stage `store` | DRIVEN: S2 lane |

## Mirrored surface map (one canonical statement per rule)

Convention (P3/P4-inherited): acceptance-list and embedding-gates
entries restating a rule count as mirrors and are listed. The draft's
C-rows are CROSS-ARTIFACT canonical ancestors — each packet row names
its C-row in its anchor; the map below tracks the PACKET-internal
mirrors.

| Rule | Canonical | Mirrors |
|---|---|---|
| staged pipeline + short-circuit + every-stage-caught | G1 | Claim 1/3 · dimension 7 · E5's one-stage clause · the grid's stage column · draft C36 (cross-artifact) |
| YAML 1.2 booleans base rule | G2 | Claim 2's base clause · dimension 1 · draft C1 (cross-artifact) |
| warnings-promotion (fail-closed document step) | G4 | Claim 2 · dimension 1 · E1's promoted-set clause · draft C2 (cross-artifact) |
| directive closure (the two-mechanism union; heads-the-list) | G7 | Claim 2 · dimension 8 · E1's synthesized-finding clause · in-context note 3 · draft C34 (cross-artifact) |
| validate accumulation + dependent-lane suppression | E2 | Claim 3 · dimensions 5–6 · V1's one-finding clause · draft C21 (cross-artifact) |
| template XOR error (nothing partial) | E3 | Claim 1 · B4's result-value clause · draft C22 (cross-artifact) |
| no 85-registry names on the load side | E4 | Claim 6 · E5's TemplateLoadError-naming clause · E1's snake_case clause · the dimension-13 close sweep · draft C23 + C20 (cross-artifact) |
| the `{stage, findings}` machine shape (+ read-stage path presence scoping) | E5 | B4's type clause · E1's presence-scoping deferral · the grid's finding-form column and decode-half cell · draft C31 details (cross-artifact) |
| version source-form rule (the ladder) | V3 | dimension 2 · in-context note 1 · draft C8 (cross-artifact) |
| byte-exact listing identity (+ ref-traversal closure, symlink non-claim, no-prevalidation, fresh listing) | S1 | Claim 5 · dimension 9 (traversal + no-prevalidation-twin lanes) · the acceptance substrate bullet's symlink facts · draft C26 (cross-artifact) |
| declared-ref authority + the store stage (after validate) | S2 | Claim 5's authority clause · dimension 9 (mismatch + ordering-combination lanes) · the grid's ref-vs-filename row · the acceptance store lane · draft C27 (cross-artifact) |
| invalid ≠ absent | S3 | Claim 5 · dimension 9 · S4's derivation ground · the port-comment edit (code-side) · draft C28 (cross-artifact) |
| module import stance + zero importers at close | B1 | Claim 6 · the Sizing/risk authority axis · the embedding-gates untouched list · ADR-011 (cross-artifact) |
| dependency confinement + probe currency | B3 | Claim 6 · dimension 13 · in-context note 5 · ADR-012 (cross-artifact) |

The Pre-approval flags ledger is deliberately NOT in the live mirror
set (the P1–P4 precedent): entries are dated decision snapshots;
history is never rewritten when a canonical row changes.

## In-context notes (the scarce budget)

1. **Never `.source`:** V3's implementer uses the node's `range`
   slice / `type` / `tag` / `anchor` properties — `node.source`
   STRIPS quotes (`'1'` → `"1"`, probe P11) and would silently pass
   quoted version forms. The version check inspects the SOURCE
   DOCUMENT — the V15-named exception to values-only validation.
2. **The guard is invisible to `doc.errors`:** the alias-amplification
   guard fires at `toJS()` (probes P14/P16) — the document step
   reports 0/0 on a bomb. The resolve-stage catch is where it lands;
   do not "check doc.errors harder".
3. **Do not option-pin the version:** `version: "1.2"` in parser
   options does NOT override an in-document `%YAML` directive (probe
   P17) — G7's two-mechanism union is the cover; an option pin is not
   a substitute for either half.
4. **No message-rewriting layer:** parse/resolve messages ride the
   library's text as-is (E6's decision). Do not build sanitization
   that E6 does not claim; the read stage's content ban is the ONLY
   content rule on the load side.
5. **The minor-upgrade probe gate, closed as environment:** the lane
   tests exercise every load-bearing probed behavior THROUGH the
   pipeline (G2–G9 fixtures, the V3 ladder, V15's cycle, the P23
   ordering lanes) on every test run — a `yaml` upgrade that changes
   a probed classification turns a named lane red. That IS the
   draft-watchpoint-2 re-run gate; no separate probe-suite artifact
   is maintained.
6. **Fixture discipline:** hostile YAML is staged as RAW text
   (template literals / byte arrays / temp-dir files) — never built
   via a serializer (R-RAW-FIXTURES); invalid-UTF-8 fixtures are byte
   arrays, not strings. File layout inside the module is build
   freedom WITHIN the declared mutation boundary.

## Embedding gates (v1-inherited)

- **New:** `v3/src/definition/errors.ts` (the typed error + finding
  forms — E5), `v3/src/definition/load.ts` (the G1 pipeline:
  decode → parse → resolve; stage catches), `v3/src/definition/validate.ts`
  (the E2/V-lane validator incl. V3's node inspection and V15's cycle
  safety), `v3/src/definition/fileDefinitionStore.ts` (S1–S4),
  `v3/src/definition/index.ts` (B4's surface), plus their test files
  (`load.test.ts`, `validate.test.ts`, `fileDefinitionStore.test.ts`).
- **Edited:** `v3/src/ports/definition.ts` (COMMENT ONLY — S3's
  may-reject sentence; the interface is byte-identical),
  `v3/eslint.config.mjs` (B2's static files-list entry + the merged
  dynamic-selector entry), `v3/package.json` + `v3/pnpm-lock.yaml`
  (B3 — `pnpm --dir v3 add yaml`).
- **Untouched, explicitly:** `kernel/`, `store/`, `ingress/`,
  `floor/`, `diag/`, `emit/`, `domain/`, `testkit/`, `cli/` (the
  builtin store and both entrypoints stay until P2), `drift/` (empty
  slice — no new units), the root `package.json` (no new bridge —
  `v3:test` discovers the new suite via vitest; `tsconfig.json`
  includes `src` already), `v3/templates/` (does not exist and is NOT
  created — the canonical file is P2's, C32).
- **Sweeps (measured 2026-07-10, current tree):**
  `ls v3/src` → no `definition/` (green field);
  `grep -rn "DefinitionStore" v3/src --include="*.ts"` (non-test) →
  kernel (`start.ts`, `kernel.ts` — port type consumers), ports
  (definition + index), CLI (`templates.ts`, `main.ts`,
  `dev/main.ts` — the builtin store), testkit (`templateFixture.ts`,
  `index.ts`) — ALL untouched by this packet;
  `v3/package.json` → zero `dependencies` (the landing is real);
  the eslint production ban files-list → nine scopes, `definition/**`
  absent (the extension is real).
- **Type-ripple targets:** NONE — no existing type changes (the port
  interface untouched; domain types consumed read-only; no test file
  outside the module references the new types).

```json
{
  "mutation_boundary": {
    "files": [
      "v3/src/definition/errors.ts",
      "v3/src/definition/load.ts",
      "v3/src/definition/validate.ts",
      "v3/src/definition/fileDefinitionStore.ts",
      "v3/src/definition/index.ts",
      "v3/src/definition/load.test.ts",
      "v3/src/definition/validate.test.ts",
      "v3/src/definition/fileDefinitionStore.test.ts",
      "v3/src/ports/definition.ts",
      "v3/eslint.config.mjs",
      "v3/package.json",
      "v3/pnpm-lock.yaml"
    ]
  }
}
```

## Row manifest (the D1 classification's machine face)

```json
{
  "packet_rows": {
    "rows": [
      { "id": "G1", "class": "anchored", "refs": ["contract:ch8-template-format#C36"] },
      { "id": "G2", "class": "anchored", "refs": ["contract:ch8-template-format#C1"] },
      { "id": "G3", "class": "anchored", "refs": ["contract:ch8-template-format#C6"] },
      { "id": "G4", "class": "anchored", "refs": ["contract:ch8-template-format#C2"] },
      { "id": "G5", "class": "anchored", "refs": ["contract:ch8-template-format#C3"] },
      { "id": "G6", "class": "anchored", "refs": ["contract:ch8-template-format#C4"] },
      { "id": "G7", "class": "anchored", "refs": ["contract:ch8-template-format#C34"] },
      { "id": "G8", "class": "anchored", "refs": ["contract:ch8-template-format#C5", "contract:ch8-template-format#C36"] },
      { "id": "G9", "class": "anchored", "refs": ["contract:ch8-template-format#C35"] },
      { "id": "E1", "class": "anchored", "refs": ["contract:ch8-template-format#C20"] },
      { "id": "E2", "class": "anchored", "refs": ["contract:ch8-template-format#C21"] },
      { "id": "E3", "class": "anchored", "refs": ["contract:ch8-template-format#C22"] },
      { "id": "E4", "class": "anchored", "refs": ["contract:ch8-template-format#C23"] },
      { "id": "E5", "class": "anchored", "refs": ["contract:ch8-template-format#C31", "contract:ch8-template-format#C20", "contract:ch8-template-format#C21"] },
      { "id": "E6", "class": "new-decision", "refs": [] },
      { "id": "V1", "class": "anchored", "refs": ["contract:ch8-template-format#C7"] },
      { "id": "V2", "class": "anchored", "refs": ["contract:ch8-template-format#C8"] },
      { "id": "V3", "class": "anchored", "refs": ["contract:ch8-template-format#C8"] },
      { "id": "V4", "class": "anchored", "refs": ["contract:ch8-template-format#C9"] },
      { "id": "V5", "class": "anchored", "refs": ["contract:ch8-template-format#C10"] },
      { "id": "V6", "class": "anchored", "refs": ["contract:ch8-template-format#C11"] },
      { "id": "V7", "class": "anchored", "refs": ["contract:ch8-template-format#C12"] },
      { "id": "V8", "class": "anchored", "refs": ["contract:ch8-template-format#C13"] },
      { "id": "V9", "class": "anchored", "refs": ["contract:ch8-template-format#C14"] },
      { "id": "V10", "class": "anchored", "refs": ["contract:ch8-template-format#C15"] },
      { "id": "V11", "class": "anchored", "refs": ["contract:ch8-template-format#C16"] },
      { "id": "V12", "class": "anchored", "refs": ["contract:ch8-template-format#C17"] },
      { "id": "V13", "class": "anchored", "refs": ["contract:ch8-template-format#C18"] },
      { "id": "V14", "class": "anchored", "refs": ["contract:ch8-template-format#C19"] },
      { "id": "V15", "class": "anchored", "refs": ["contract:ch8-template-format#C5"] },
      { "id": "V16", "class": "anchored", "refs": ["contract:ch8-template-format#C24"] },
      { "id": "V17", "class": "derived", "refs": ["contract:ch8-template-format#C25"] },
      { "id": "S1", "class": "anchored", "refs": ["contract:ch8-template-format#C26"] },
      { "id": "S2", "class": "anchored", "refs": ["contract:ch8-template-format#C27"] },
      { "id": "S3", "class": "anchored", "refs": ["contract:ch8-template-format#C28"] },
      { "id": "S4", "class": "derived", "refs": ["contract:ch8-template-format#C20", "contract:ch8-template-format#C28"] },
      { "id": "B1", "class": "anchored", "refs": ["ADR-011", "prose:plan §8.7"] },
      { "id": "B2", "class": "anchored", "refs": ["prose:plan §8.7", "ADR-011"] },
      { "id": "B3", "class": "anchored", "refs": ["contract:ch8-template-format#C33", "ADR-012"] },
      { "id": "B4", "class": "derived", "refs": ["contract:ch8-template-format#C31", "contract:ch8-template-format#C29", "contract:ch8-template-format#C38"] }
    ]
  }
}
```

## Pre-approval flags

1. **E6 is a NEW-DECISION row — the parse/resolve message-echo
   adoption.** The draft deliberately left it a non-row (packet-time
   watchpoint 1: the yaml library's messages quote offending source
   lines; only the READ stage carries a content ban). The pick:
   ADOPT the library messages as-is on the parse/resolve stages — no
   sanitization layer. Grounds: a local operator tool wants
   point-at-the-error UX (the draft's own framing); every downstream
   surface for these messages is local per the ratified rows (C31/C38
   stderr; the export boundary never receives load errors); a
   rewriting layer would be maintained forever against a moving
   upstream. The alternative (strip/normalize messages) buys nothing
   the confinement boundary does not already give and costs a
   permanent shim. Below the Case-B triggers (one row; no
   authority / separation / availability-class semantics). Route:
   approve-ratified — this first-of-a-kind human approve act ratifies
   the pick (the ch7-P4 F2 precedent for a below-Case-B new-decision
   riding to a human approve).
2. **Prediction/discovery mismatch: predicted `invention`, discovered
   `projection` (with one new-decision row).** The §8.9 prediction was
   recorded at the ch8 ratification, BEFORE the draft phase ran; the
   ratified draft then absorbed the memo-born surface, so packet
   authoring found ratified anchors for every row but E6. The open
   convention question for the boundary review: does the predicted
   class bind the SURFACE's genesis (then "invention" was right and
   the draft is where it landed) or the packet-time manifest (then
   ch8-era predictions should account for the draft phase)? Route:
   boundary-review — process-log line at build, per the plan §1.3
   convention ("a prediction/discovery mismatch routes to a
   friction-log line").
3. **The draft's watchpoint 2 (probe-record currency) is discharged
   as environment.** The substrate probe record binds `yaml@2.9.0`;
   this packet closes the minor-upgrade re-run gate by driving every
   load-bearing probed behavior through named lane tests (in-context
   note 5) — a classification change under an upgrade turns a lane
   red on the next test run. No standing probe-suite artifact is
   created. Route: fold-now — stated in note 5 and the acceptance's
   substrate line.

## Acceptance

- Dimensions 1–13 test-driven; every declared lane driven by name:
  - **`load.test.ts` (the pipeline over bytes):** G2 (the
    `on`/`yes`/`no`/`off` → string positive), G3 (invalid-byte
    fixture → read-stage decode finding, no U+FFFD repair), G4
    (custom tag → rejected; clean baseline 0/0 on the canonical
    example), G5 (multi-document), G6 (duplicate keys — top-level and
    inside `agentConfig`), G7 (`%YAML 1.1` silent case → synthesized
    finding; `%YAML 1.3` → promoted `BAD_DIRECTIVE`; explicit
    `%YAML 1.2` legal), G8 (alias bomb → single resolve finding;
    legal anchor reuse resolves), G9 (`<<` in a fixed-keyset map →
    unknown key; `<<` as an open-key token legal per V5's grammar),
    dimension-7 short-circuit combinations, dimension-8 ordering
    lanes (two custom tags; warning-before-error source positions;
    the directive-heads combination), E5 shape assertions on every
    error lane (top-level `stage` = entries' marker; keysets exact).
  - **`validate.test.ts` (the lane inventory):** V1–V16 positives and
    claim-derived negatives per dimensions 3–5 and 10–12 — the V3
    source-form ladder in full (dimension 2), the E2 suppression
    combinations (dimension 5), the multi-defect accumulation lane
    (dimension 6), V15's cycle lane (finding; no hang, no throw, no
    circular ride-through incl. via `agentConfig`), V16's `kind`
    negative, the canonical-example round-trip deep-equal
    (dimension 12). V17 declares NO drivable lane (empty registry —
    the row's own statement); the V8 unknown-key lanes stand in.
  - **`fileDefinitionStore.test.ts` (the store):** S1 hit / miss /
    case-variant / traversal / `.yml`-named near-miss lanes PLUS the
    no-prevalidation twin (a staged `x@1.5.yaml` with requested
    version 1.5 → typed rejection; unstaged → `null` — dimension 9);
    S2
    declared-ref mismatch (stage `store`, path `ref`) PLUS the
    validate→store ordering combination (a validate-defective file
    whose ref ALSO mismatches its filename → only validate findings —
    dimension 9); S3
    present-but-invalid → typed rejection (asserted `instanceof
    TemplateLoadError`, shape per E5) vs absent → `null`; the EISDIR
    present-but-unreadable lane; S4 unlistable-dir lane
    (`{stage:"read", path:<dir>, code}`); the fresh-listing behavior
    (a file added after a miss is found on the next call — no cache).
  - **E6's halves, dispositioned:** the read content-ban half and
    the validate offending-key half are DRIVEN via the G3 and V8
    lanes; the echo-adoption half is POLICY (flag 1) — non-drivable
    as a hard assertion (no test can prove "the library's text rides
    as-is" against a moving upstream), its confinement resting on the
    mutation boundary + the zero-importers sweep.
  - Estimated ~55 new tests at `it` granularity (lanes may share
    bodies; the estimate is not a commitment — the P4 lesson).
- **Module boundary + dependency (dimension 13):** B2's four executed
  lint probes (static red, dynamic red, legal-import green ×2 —
  reverted; transcripts in the build record); `pnpm ls yaml` → one
  package, zero transitive; grep at close: zero `definition/`
  importers outside the module AND zero 85-registry name strings in
  `src/definition/**` (E4's close sweep); the FULL existing suite
  green (401 baseline at the ch7 close — re-verified in-session at
  build).
- **Bridges green at close:** `v3:typecheck`, `v3:lint`, `v3:test`,
  `v3:coverage` validation (ownership axes unchanged — the empty
  slice), `v3:packet-lint` (this packet), `v3:adr-check` (13 ADRs;
  no new trigger — ADR-011 and ADR-012 are pre-accepted by their
  ratification acts; no other IC-A2/A3/B/N trigger fires).
- Drift tests green (standing, unconditional — PI-3; no new units,
  the mapping table untouched).
- **Substrate probes:** the ratified draft's probe record (P1–P23,
  run 2026-07-10 against `yaml@2.9.0`, Node 24/26) is the cited
  source for every YAML-substrate lane; the lane tests re-drive the
  load-bearing facts through the pipeline on every run (flag 3). ONE
  premise sits beyond that record — filesystem errno behavior for the
  store lanes — and was probed in-session at authoring (2026-07-10,
  panel round 1, live on the target platform): `readFile` on a
  directory → EISDIR; `readdir` on an absent path → ENOENT; `readdir`
  on a file → ENOTDIR; `readdir` listings byte-exact while
  `fs.access` resolves case-variants (P12 re-confirmed); strict
  `TextDecoder` throws TypeError on invalid bytes (P19b
  re-confirmed). The external arm's probe (2026-07-10) added the
  SYMLINK facts S1's non-claim rests on: `readdir` lists a symlink's
  own name and `readFile` follows its target. All confirmed; the
  S3/S4/G3 lane tests re-drive the errno facts on every run.
- Standing review rules in force: **REV-E-NO-ADAPTER-BRANCH** (the
  store arrives as a port implementation; no kernel change, no
  adapter branching anywhere); **REV-B-LOCAL-NOT-AUTHORITY** (S1's
  fresh-listing rule — no cache is authority); **REV-A1-TXN** — n/a
  (no kernel/store write path); **REV-C-PROJECTIONS-READONLY** — n/a
  (no projection surface); **REV-DIAG-FAILOPEN** — n/a (no diag
  surface; the load pipeline is fail-LOUD by contract, which is its
  own character, not the diag channel's).

## Build record

Approved 2026-07-11 — the user's explicit approve ("ha jól értem,
akkor voltak finding roundok, szóval mehet az approve") on the
reconciled basis sha256
`00ba6643b56578e6ad4081c457c3841efd2e4c9a5921cae6de2910942a95660e`.
The hash chronicle (the two-hash model, twice over): the R1 FULL round
bound `7d133f31…`; the clean R2 targeted round bound the content hash
`a321dfd8…`; the first clean close bound `33bd6992…`; the EXTERNAL ARM
(agent-invoked `codex exec`, the user's default config — run
PRE-approve at the user's ask, the first pre-approve arm window) found
two S1 substrate overclaims on those bytes, verdict `refine`; the arm
fold produced `6e996a37…`; the arm's hash-citing re-check CLEARED both
findings and the second close ran clean on the final `00ba6643…`. The
STOP-4 flagged-approve act ratified flag 1 (the E6 echo adoption);
flags 2–3 rode as recorded. All twelve internal panel passes
transcript-verified `claude-opus-4-8`.

Built the same day. **401 → 515 tests (+114**; the "~55 at `it`
granularity" estimate under-counted the parametrized ladder loops —
the V3 source-form ladder, the V1 missing-key family, and the store
disposition set each expand to per-form `it` bodies**)**. ONE build
round, ZERO behavioral surprises: every yaml-substrate lane (the G
gates, the parse-ordering lanes incl. class-major and
directive-heads, the toJS guard, the cycle non-throw, the version
node-inspection ladder) ran GREEN on the first vitest execution — the
ratified draft's probe record transferred to code without a single
reclassification. The mechanical residue: typecheck round 1 caught
four test-side readonly-array casts and one `directives`
possibly-undefined access; lint round 1 caught two auto-fixable
unnecessary assertions and the NBSP fixture literal (rewritten to its
` ` escape form — the staged YAML still carries the real NBSP
byte; `no-irregular-whitespace` bans the raw char in source).

B2's four probes EXECUTED post-extension (transcript in the build
session): static testkit import in `src/definition/` → red
(`no-restricted-imports`, ADR-005); dynamic `import("../testkit/…")`
→ red (`no-restricted-syntax`, the dynamic form); the real module
(domain-type + yaml imports) → green ×2; the probe file deleted.
Close sweeps: zero `definition/` module importers (the single grep
hit is kernel/diagEmission.test.ts importing the PORT
`ports/definition.js`); zero 85-registry name strings in
`src/definition/**` (one COMMENT token — `no_transition` quoted from
the V7 row's model reference — reworded to keep the sweep byte-honest;
production code never carried any); `yaml@2.9.0` with `dependencies:
NONE, peerDependencies: NONE` in its own manifest (the `pnpm ls`
peer chains under vite/vitest are dev-side, outside the runtime
claim). Bridges green at close: `v3:typecheck`, `v3:lint`, `v3:test`
(515), `v3:coverage` validation (ownership axes unchanged — the empty
slice held: units 5/158, invariants 8/116, traces 2/20),
`v3:packet-lint`, `v3:adr-check` (13 ADRs; no new trigger — ADR-011
and ADR-012 pre-accepted by their ratification acts).

**Aftermath (2026-07-11, the external arm's POST-BUILD implementation
review — user-requested; verdict `refine` on the build sha `50f6d7af`,
HEAD-cited; fixed same day, 530 tests):** one fold-now defect + three
watchpoints, all folded in ONE `fix(v3)` round, every file in the
declared boundary (no aftermath extension needed):
(1) **The V15 short-circuit defect (the substance catch):** the build
implemented the cycle finding as a whole-stage short-circuit — against
E2/C21's accumulation rule, whose suppression is CONTAINER-precondition
only (the arm's probe: a cyclic `agentConfig` + a missing `start` + an
unknown key returned ONLY the cycle finding). The fix: the cycle
finding ACCUMULATES — the structural walk is constant-depth (it never
traverses the value graph; `agentConfig` rides untraversed), so it is
hang-safe on a cyclic graph, and a cycle still guarantees a nonempty
finding set (E3 holds). Driven by the new combination lane (cycle +
V13 defect + unknown key → all three findings).
(2) `TemplateLoadError.toJSON()` added: the naive `JSON.stringify`
path now emits EXACTLY the E5 `{stage, findings}` shape (the
enumerable `name` own-property had leaked); driven at the store suite.
(3) The V5 id-class × form grid completed TABLE-DRIVEN (4 classes ×
whitespace/dot/empty + the NBSP representative), replacing the partial
per-class sampling the arm flagged.
(4) The V11 reliability rule extended: a grammar-invalid role token on
EITHER surface (a step's `role` field or a declared `roles` key)
suppresses V11 — the same one-defect-one-finding-set spirit as E2's
container rule, stated here as an implementation-level refinement
(canonical rows untouched: E2's ratified suppression set is
container-precondition; this extension is narrower than a row change
and is recorded for the boundary review). Driven by the exact-path
suppression lane.
Bridges re-verified green at the aftermath close: 530 tests,
typecheck, lint, coverage validation, packet-lint, adr-check; the
delta-scoped reconciliation pass ran before the aftermath commit (the
ch7-P4 round-1 skip lesson).

**Aftermath round 2 (2026-07-11, the arm's re-check on the round-1
fold — the finder-lane rerun caught a regression the fold itself
introduced):** with V15 accumulating, the structural walk RUNS on
cyclic graphs — and the finding-message sites still used
`JSON.stringify` on arbitrary values: a cyclic map planted in a
scalar slot (`role: *a`) threw "Converting circular structure to
JSON", the G1 belt caught it, and the intended V15 finding was LOST
to an internal-failure result. The "fix scoped to the finding just
caught" class made real: the accumulation fix re-derived the walk's
HANG-safety but not the message sites' SERIALIZATION safety under
the new invariant. Fix: a cycle-safe `describeValue` renderer at
every arbitrary-value message site (objects are described, never
serialized — the V2 id, V13 start, V14 target, and grammar got-value
sites); driven by a table-driven lane set planting a cyclic map in
each of the four slots (cycle finding survives, no internal-failure,
no throw). 530 → 534 tests; bridges re-verified green.

**Aftermath round 3 (2026-07-11, blind cross-model replay of the
committed implementation — two new fold-now defects):** the replay
probed V5's key surface as YAML source values and the returned domain
records as JavaScript property carriers, exposing two dimensions the
original panel and both implementation-arm rounds missed. First,
default `toJS()` materialized YAML maps as objects BEFORE validation:
a numeric open-map key therefore arrived as a string, and
typed-distinct keys (`1` and `"1"`) collapsed to one property with
silent data loss. This violated V5's string-key rule and E3's
no-partial/no-repair outcome. Fix: the resolve stage now requests the
library's `mapAsMap` projection; validation runs over the resolved
Maps, so key type and identity survive through every open-key lane.
Successful raw V9 values materialize losslessly: string-key maps stay
own-property-safe records, while a map carrying ANY non-string key
stays a Map (so `1` and `"1"` remain distinct). Second, the
legal id `__proto__` passed V5 but assignment into plain `{}` records
invoked the legacy prototype setter: accepted steps, roles, and
transitions disappeared as own properties. Fix: every domain
dictionary is materialized with own-property-safe writes. The lens-4
delta reconciliation then exposed the G6×V9 mirror: the YAML
library's default uniqueness test is scalar-only, so two structurally
identical collection-valued keys produced no parse diagnostic. The
document API's supported `uniqueKeys` comparator now performs
structural node equality, including anchored-node↔alias identity,
keeping duplicate rejection document-wide as G6 claims. Nine new
lanes drive numeric step/role/event keys, the
`1`/`"1"` collision, raw `agentConfig` compatibility and collision
preservation, collection-key duplicate rejection, and successful
`__proto__` round-trip at all three domain-map sites. The full v3
suite moved 547 → 556 (P2's 13 tests landed
between P1 round 2 and this fold); `v3:typecheck`, `v3:lint`,
`v3:test`, `v3:coverage`, `v3:packet-lint`, and `v3:adr-check` are
green. No mutation-boundary extension, ADR, or fitness-rule change:
the fix stays inside the existing definition loader/validator/test
surface and changes no lifecycle, persistence ordering, execution
context, or command orchestration.

**Aftermath round 4 (2026-07-11, mandatory build-close external arm
on round 3 — finder result folded before verdict):** the arm propagated
G6 through the full document anchor graph. The round-3 compose-time
comparator caught literal structural duplicates and an alias whose
anchor was attached to the other KEY, but could not resolve an alias
to an anchor declared elsewhere (for example in another map VALUE).
A literal collection key and an alias to an externally anchored,
structurally identical collection therefore still reached `toJS()`;
resolution collapsed them to one Map entry. Fix: after the document
is composed, a second structured duplicate pass resolves aliases with
the complete Document anchor graph and synthesizes only the duplicate
findings the compose-time comparator could not see; parser diagnostics
and supplemental findings are merged in source order before warnings,
preserving E1. The new lane anchors `[a,b]` in a sibling value, then
uses the same literal collection and its alias as two keys; it now
rejects at parse. 556 → 557 tests; the finder run was intentionally
stopped after the fold made its in-progress worktree view non-admissible
for a final verdict. Per the diminishing-returns rule, one clean,
SHA-citing re-check runs on the fixed commit.

**Aftermath round 5 (2026-07-11, the clean external-arm re-check on
round 4, sha `43705cef`; verdict `refine`):** the full-document scan
suppressed supplemental findings per PAIR, rather than per later key.
If a later key matched one earlier key at compose time and a different
earlier key only after document-wide alias resolution, the parser
reported the compose-time duplicate and the supplemental scan reported
the same later key again. Fix: each later key first checks ALL earlier
keys for any compose-time match; only when none exists does it check
for a resolved match and synthesize one finding. The new lane combines
an externally anchored alias key, a literal collection key, and a
locally anchored equivalent key; the two later duplicate keys now
produce exactly two findings at distinct positions, rather than three
with the last position repeated. 557 → 558 tests. No mutation-boundary,
ADR, or fitness-rule change: this is diagnostic multiplicity inside the
existing definition parse stage.

**Integration note (2026-07-11):** rounds 3–5 were built on the
user's ad-hoc experiment branch (`codex/ch8-p1-key-hardening` — a
model-comparison replay that turned into real catches) and RE-LANDED
onto main as ONE aftermath commit per the README §4 choreography; the
sha citations above (`43705cef`, and `b07c88a3` in the log) refer to
the PRE-integration branch commits the arm's verdicts actually bound
— kept as the honest record. The branch's per-round post-build audits
ran 0-error; the integrated commit carries its own audit at its own
sha, and a fresh arm re-check on the integrated sha runs under the
ch8-boundary §6 mechanics (its first live use).

**Aftermath round 6 (2026-07-11, the integrated-sha arm re-check —
the FIRST run under the ch8-boundary §6 mechanics: foreground,
byte-guarded, pinned gpt-5.6-sol/high, approval never,
danger-full-access):** the run hit the 10-minute ceiling while
composing its verdict — an infra failure per §6 — but its finder
output carried TWO catches, both reproduced by in-session probes and
folded as ordinary findings (the stopped-finder precedent): (1) the
round-3 comparator judged `0`/`-0` DISTINCT (`Object.is`) while the
downstream Map's key identity is SameValueZero — the pair passed the
duplicate gate and silently collapsed, first value lost (E3/G6). Fix:
scalar equality is SameValueZero — the comparator is now EXACTLY as
coarse as Map key identity, so no distinct-judged pair can collapse
downstream; `0`/`-0` rejects loudly at parse. (2) The materialization
memo was PER-STEP: a cross-step aliased `agentConfig` graph lost
referential identity in the returned domain (the lossless/raw V9
claim). Fix: ONE memo per template build; the cross-step alias keeps
`===` identity. Both driven by name (the `0`/`-0` duplicate lane; the
cross-step identity lane). 558 → 560 tests; typecheck/lint green.
First-use mechanics measurements: `danger-full-access` DID clear the
tsx-IPC limit — the subprocess suites EXECUTED in the arm's sandbox;
and the 10-minute ceiling is TIGHT when the arm runs full suites (the
boundary note is logged). The lesson (the R-DIMENSIONS ladder's `-0`
rung, re-minted on the KEY axis): when two layers each look locally
correct, ask whether their EQUALITY RELATIONS compose — a gate finer
than its container is a silent-loss channel. Residue: the identity
lane's strict-index access (two TS2532) was caught by the ci:local
quality gate at the chapter close and fixed in a follow-up commit —
the round's own typecheck claim was mis-measured from a wrong cwd
(the tsc never ran; the measurement lesson's wrong-cwd form).

```json
{
  "packet_metrics": {
    "class": "operability",
    "prediction": {
      "predicted": "invention",
      "reasoning": "recorded at the ch8 ratification: the packet's surface is memo-born with no ledger anchor; the draft phase was expected to carry the decisions",
      "discovered": "projection"
    },
    "provenance": { "anchored": 36, "derived": 3, "new_decision": 1 },
    "rounds": { "review": 2, "doc_refinement": 0, "implementation": 7 },
    "stops": [
      {
        "type": "4:flagged-approve",
        "what": "E6 (the parse/resolve message-echo adoption, the draft's watchpoint-1 deliberate non-row) rode as flag 1 to the first-of-a-kind pre-approve, with flag 2 (prediction/discovery mismatch, boundary-review) and flag 3 (probe-currency discharge)",
        "resolution": "the user's explicit approve (2026-07-11) on the reconciled basis 00ba6643 ratified flag 1; the external arm ran PRE-approve at the user's ask (agent-invoked codex, find + hash-citing re-check) before the approve act"
      }
    ],
    "detector_misses": [
      {
        "found_at": "approve",
        "what": "S1's 'no out-of-directory access exists by construction' overclaimed — a symlink listing entry is a byte-exact match and readFile follows it outside the dir; and the 'non-integer version resolves null' example was false when a matching file exists (typed rejection per invalid-is-not-absent)",
        "why_missed": "twelve Opus lens passes accepted the by-construction REF-traversal argument as covering the whole out-of-directory claim — the directory-CONTENT axis (a planted symlink) sat outside every lens's frame; the arm probed the substrate instead of judging the argument. Folded PRE-approve: the packet was corrected before any code existed — zero code impact"
      },
      {
        "found_at": "code-review",
        "what": "the V15 cycle finding SHORT-CIRCUITED the whole validate stage — against E2/C21's accumulation rule (suppression is container-precondition only): a cyclic agentConfig hid every other structural finding",
        "why_missed": "the build generalized the container-suppression pattern to the cycle precondition ('the walk presupposes an acyclic graph') — but the structural walk is constant-depth and never traverses the value graph, so the presupposition was false; no in-session check re-derived it, and the arm's post-build probe staged the cycle+defects COMBINATION the suite lacked"
      },
      {
        "found_at": "code-review",
        "what": "the round-1 aftermath fix itself regressed: with V15 accumulating, the walk runs on cyclic graphs — and JSON.stringify in finding messages threw on a cyclic value in a scalar slot (role: *a), losing the cycle finding to the G1 internal-failure belt",
        "why_missed": "the accumulation fix was scoped to the finding just caught: the walk's HANG-safety was re-derived under the new invariant but the message sites' SERIALIZATION safety was not; the arm's re-check probed a cyclic value in a scalar slot — a combination the round-1 lanes lacked"
      },
      {
        "found_at": "code-review",
        "what": "default toJS object materialization erased YAML open-map key type before V5 (typed-distinct keys could collapse silently), plain-record assignment made the legal __proto__ id disappear into the object prototype rather than an own domain property, and the library's scalar-only default uniqueness check missed duplicate collection-valued keys under G6",
        "why_missed": "the V5 grid covered token values but not YAML SOURCE KEY TYPE, the round-trip covered ordinary identifiers but not JavaScript property-creation semantics, and G6's fixtures covered scalar duplicates only; the blind cross-model replay found the first two dimensions and the mandatory lens-4 reconciliation propagated the key-shape axis into G6×V9, including anchored collection↔alias identity on re-check"
      },
      {
        "found_at": "code-review",
        "what": "the round-3 G6 comparator could relate an alias only to an anchor attached directly to the compared key; an alias resolving through an anchor declared elsewhere in the document still duplicated a structurally identical collection key and collapsed at resolution",
        "why_missed": "the lens-4 lanes covered literal collection duplicates and key-local anchor↔alias identity, but not the full document anchor graph; the mandatory build-close arm moved the anchor to a sibling value and reproduced the remaining collapse"
      },
      {
        "found_at": "code-review",
        "what": "the round-4 document-aware duplicate scan suppressed findings per compared pair, so one later key matching different earlier keys through compose-time and resolved equality received the parser finding plus a redundant supplemental finding at the same position",
        "why_missed": "the round-4 lane had one earlier semantic match only; the clean arm re-check added a third equivalent key and exposed that suppression must be decided per later key across all earlier keys"
      },
      {
        "found_at": "arm-build-close",
        "what": "the integrated-sha re-check refuted the round-3 hardening twice: the Object.is scalar comparator was FINER than the downstream Map's SameValueZero key identity (0 and -0 passed the duplicate gate, then collapsed silently with the first value lost), and the per-step materialization memo broke cross-step aliased-graph referential identity (the lossless/raw V9 claim)",
        "why_missed": "the round-3 fold verified acceptance and rejection lanes but never asked whether the two layers' EQUALITY RELATIONS compose — a gate finer than its container is a silent-loss channel; and the memo's scope was chosen at the call site with no cross-step identity lane. The R-DIMENSIONS ladder's -0 rung existed for VALUES; the key axis re-minted it"
      }
    ],
    "learned": "the first measurement-stage packet: an agent-invoked external arm run PRE-approve caught two substrate overclaims twelve internal Opus passes missed; the build ran first-execution green on every yaml lane — a ratified draft's probe record transfers to code with zero behavioral surprises",
    "baseline_note": "rounds.review = 2 counted panel rounds (R1 full; R2 targeted clean after the content fold); the two closes, the lens-4 reconciliations, and the arm's find + re-check are chronicled above and do not count (reconciliations never count; the arm is the phase-2 adversarial leg). prediction: the invention->projection gap is flag 2's boundary-review question — the draft phase absorbed the memo-born decisions between the ratification-time prediction and authoring. detector_misses.found_at = 'approve' (the closed enum's nearest member): the finder was the EXTERNAL ARM run pre-approve at the user's ask — a NEW lane the enum predates (the ch7-P4 misses arrived post-build via code-review); whether the enum gains an external-arm member is boundary-review material. The miss fed the S1 fold before approve and before build. implementation = 7: the build round (mechanical type/lint residue only — four readonly casts, one optional chain, two auto-fixed assertions, one NBSP escape; zero behavioral test failures) + the external-arm aftermath round (the V15 accumulation fix + toJSON + the V5 grid + the V11 reliability extension — 515 -> 530) + the arm re-check's regression round (the cycle-safe describeValue renderer — 530 -> 534; the third detector_misses entry) + the blind replay aftermath round (resolved map-key identity + own-property-safe domain records + lens-4's structural-duplicate and key-local alias propagation; the fourth detector_misses entry; 547 -> 556 after P2 landed 13 intervening tests) + the mandatory build-close arm fold (full-document alias resolution for G6; the fifth detector_misses entry; 556 -> 557) + its clean re-check fold (per-later-key supplemental diagnostic suppression; the sixth detector_misses entry; 557 -> 558) + the integrated-sha re-check round (the SameValueZero comparator + the one-memo-per-build identity fix; the seventh detector_misses entry — the FIRST use of the ch8-boundary arm-build-close enum member; 558 -> 560). 401 -> 515 at the build commit (+114 vs the ~55 estimate: parametrized lanes expand to per-form it bodies — the inverse of ch7-P4's over-count, recorded for the estimating convention). The second detector_misses entry is the post-build arm's substance catch (found_at code-review — the arm IS that lane post-build; its pre-approve run is the first entry's 'approve' lane)."
  }
}
```
