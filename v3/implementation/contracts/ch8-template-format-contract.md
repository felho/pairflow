# ch8 — template-format contract

```json
{"contract_draft": {"chapter": "ch8", "surface": "template-format", "status": "realized"}}
```

## Context (non-normative by declaration)

**Control-Model answers (round-0 skeleton):**

- *Business invariant:* a run is pinned to an immutable definition
  snapshot; the authoring file is that definition's source. Nothing a
  file says can change a running instance — identity is
  `{id, version}` and versions are immutable once referenced.
- *Control model:* file bytes → read (strict decode) → parse
  (YAML 1.2 document API) → resolve → validate (structural rules,
  accumulated findings) → a typed `WorkflowTemplate` — or a typed
  error result (the staged pipeline is C36's row). The
  directory-backed store resolves pinned refs; the kernel consumes
  the unchanged `DefinitionStore` port.
- *Read-path:* `DefinitionStore.load(ref)` → template | null;
  kernel start and handle are the only consumers (via the port);
  the CLI wires the store in its composition root.
- *Forbidden fallback:* no partial template ever escapes a failed
  load; no unknown key is silently dropped; no load failure invents a
  rejection name; a file that exists but is invalid is never treated
  as "not found".
- *Allowed resolution:* exact-match file in the configured templates
  directory; the declared ref is the authority, the filename is a
  checked convention.
- *Missing data:* absent file → `null` at start (start-side failure,
  the port's existing contract); at handle the kernel throws
  (integrity — the ref was pinned at create). Both pre-date this
  draft; the draft adds only the invalid-vs-absent distinction (C28).

**Substrate probe record (DraftContract §1.2 — probes run 2026-07-10,
scripts `scratchpad/yaml-probe/probe*.mjs` + `probe-fs.mjs`, candidate
`yaml@2.9.0`, Node 24/26 — results Node-version-robust, re-verified by
the round-1 panel):**

| Probe | Result |
|---|---|
| P1 scalar coercion | `on`/`yes`/`no`/`off` → strings; only `true`/`false` → booleans (1.2 core) |
| P2 / P6d duplicate keys | parse error (`DUPLICATE_KEY`; throw under `parse()`, `doc.errors` under document API) |
| P3 / P19a number forms | `1.10` → float 1.1 (`Number.isInteger` false); **`1.0` → 1 (`Number.isInteger` TRUE — the resolved value cannot carry the form)**; `01` → 1; `0x10` → 16; `"1"` → string |
| P4 chomping | `\|` keeps one trailing newline, `\|-` strips — author-controlled |
| P5 / P6e multi-document | error (`MULTIPLE_DOCS`) |
| P6 / P6b / P6c custom tag + clean baseline | a custom tag is NOT an error by default — a `TAG_RESOLVE_FAILED` **warning** (`doc.warnings`), value silently resolves (P6/P6b); clean-document baseline = 0 errors / 0 warnings (P6c) |
| P7a anchors/aliases | resolve to plain data at parse time |
| P7b merge key `<<` | NOT merged under 1.2 defaults — arrives as a literal `<<` key |
| P8 / P14 / P16 alias amplification | the built-in guard throws (`Excessive alias count`) — at the RESOLUTION step (`toJS()`), NOT visible in `doc.errors`/`doc.warnings` (P14/P16: document API reports 0/0 on the bomb, `toJS()` throws; P8's throw came from `parse()` = parseDocument + toJS) |
| P9 / P13 syntax error | `YAMLParseError` carries `pos` + `linePos` on BOTH the throw path and the `doc.errors` entries (line/col available) |
| P10 empty/null | empty doc → `null`; `~` and `null` → JS `null` |
| P11 scalar source access | per-scalar SOURCE recoverable: `node.range` slice preserves the raw form incl. quotes (`'1'` → `"'1'"`), `node.type` distinguishes `PLAIN`/`QUOTE_SINGLE`/`QUOTE_DOUBLE`; NOTE `node.source` STRIPS quotes (`'1'` → `"1"`) — the range slice or type, never `.source`, carries the quoted-form distinction |
| P12 filesystem | `@` in filenames safe (created + listed); the default macOS FS is CASE-INSENSITIVE — `statSync("ABC@1.yaml")` resolves a file written as `abc@1.yaml`; `readdir` returns byte-exact names |
| P15 false-positive suite | merge-key-free legal constructs (the canonical example, anchor reuse, explicit `!!str`, empty doc, `...` end marker, `%YAML 1.2` directive) all parse 0 errors / 0 warnings — the warning promotion has no false positive among common constructs |
| P17 / P18 / P18b `%YAML` directive | **`%YAML 1.1` is adopted SILENTLY** (0 errors, 0 warnings; `doc.directives.yaml = {explicit: true, version: "1.1"}`): `on` → `true` and `<<` ACTUALLY MERGES — the full 1.1 trap returns; `%YAML 1.3` (and every other non-adopted version) → `BAD_DIRECTIVE` warning while `directives.yaml.version` stays `"1.2"` — the directive-object formula does NOT fire for those; explicit `%YAML 1.2` → clean (P18b); pinning the option `version: "1.2"` does NOT override an in-document directive |
| P19b strict decode | `TextDecoder("utf-8", {fatal: true})` THROWS on invalid bytes; Node's default lossy decode silently substitutes U+FFFD |
| P20 cyclic alias | `a: &a {self: *a}` → 0 errors, 0 warnings, `toJS()` does NOT throw — it returns a CIRCULAR object (the amplification guard is count-only, not a cycle guard) |
| P21 anchor/alias on a scalar | `version: &v 1` → a PLAIN Scalar whose `range` slice is just `1` (the anchor token is OUTSIDE the range — a regex on the slice passes silently) with `node.anchor === "v"`; `version: *v` → an `Alias` node (no scalar type) |
| P22 explicit standard tag on a scalar | `version: !!str 1` → 0 errors, 0 warnings (a standard resolvable tag raises no `TAG_RESOLVE_FAILED`), `type: PLAIN`, range slice `1`, `node.tag = "tag:yaml.org,2002:str"` — yet resolves to the STRING `"1"`; the tag token, like the anchor, sits outside the range slice |
| P23 multiple parse diagnostics | one document CAN carry several: two custom tags → TWO `TAG_RESOLVE_FAILED` warnings (P23a); `%YAML 1.3` + a custom tag → `BAD_DIRECTIVE` + `TAG_RESOLVE_FAILED` (P23b); two duplicate keys → TWO `DUPLICATE_KEY` errors (P23e); within each array the order IS source-position order (P23d) — but errors and warnings are SEPARATE arrays, so a warning may precede an error by source position (P23c: tag warning at pos 3, dup-key error at pos 15) |

Load-bearing results: P6 (custom-tag rejection is NOT free — C2's
warnings-promotion exists for it); P17 (the 1.2-semantics guarantee is
directive-overridable — C34 exists for it); P14/P16 (the alias guard
fires at a stage `doc.errors` inspection does not reach — C36's
resolution-stage mapping exists for it); P12 (byte-exact filename
matching needs `readdir`, not OS path resolution — C26's enumeration
rule exists for it).

**Canonical example (illustrative only — the rows are the contract):**

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

**Validator lane note:** the shape rows C7–C19 (with the parse-gate
rows C1–C6 and C34–C35) ARE the validator's lane inventory — each row
is a lane (its violation is a driven negative at packet time);
C20–C23 and C36 fix the error model and stage pipeline those lanes
report through. A separate exhaustive lane matrix would restate the
rows; the packet derives its test matrix from the rows directly.

**Omnigent survey provenance (plan §8.8; survey 2026-07-10 on
omnigent @ 713573cc, fresh clone):** LEARN adopted here — additive
optional keys with behavior-preserving defaults as the ONLY evolution
mechanism (plan §8.2); removed-key failures carry migration text
(C25); path-addressed accumulated errors (`{path, message}`, C21);
flat regex-constrained ids (C8); raw pass-through block for
uninterpreted config (C14, their `params:`). AVOID folded — their
silent top-level unknown-key drop (typos vanish) → C13 fail-closed;
their mandatory-constant `spec_version` (dead weight, never advanced
past 1) → C24 no version field, `kind` reserved instead of a
discriminator-by-presence; their split parse-raises/validator-
accumulates inconsistency → C20/C21 draw the stage line explicitly.

**Seed-row disposition (plan §8.8 indicative set → rows):** field
grammar + canonical example → C7–C19 (+ the Context example);
id/name rules → C8, C10; discovery/file-naming → C26–C27;
unknown-key + removed-key error contracts → C13, C24–C25; validator
lane matrix + channel mapping → C20–C23, C34–C36 (+ the lane note
above); CLI verbs → C29–C31, C37–C38; dependency pick + ADR → C33
(ADR-012 rides this draft); canonical `local-pair-v0` home → C32. No
seed item is undisposed.

**Packet-time watchpoints (non-normative — flagged by the panel,
deliberately NOT contract rows):**

- Parse/resolve-stage finding MESSAGES inherit the yaml library's
  source-echoing pretty-printer (the offending lines appear in the
  message). No row forbids it — for a local operator tool the echo is
  point-at-the-error UX — but the packet should make it a conscious
  choice, not an accidental inheritance (only the READ stage carries
  a content ban, C20).
- The substrate probe record binds `yaml@2.9.0`; C33 pins major 2.
  The lockfile pins the exact version in practice — the packet should
  treat a minor upgrade as a probe-suite re-run gate (the
  warning-vs-error classifications and the guard's stage are the
  probed facts).
- C8's implementer uses the node's range slice / `type` / `tag` /
  `anchor` properties — never `.source` (quote-stripping, P11).
- C38's catch sites are per-verb, not one shared wrapper: `start`
  PRE-loads before constructing the kernel, while `submit`/`inject`
  first touch the template INSIDE `kernel.handle` — their typed error
  surfaces at the `ingress.submit` await (a mechanical copy of the
  start-shape catch would miss it).

**Draft metrics (template §5, recorded at ratification 2026-07-10):**
rounds to ratify: 8 full five-lens panel rounds + 5 external-arm
rounds (3 user-run, 2 agent-invoked `codex exec`) + 4 close passes
under the amended regime; new-decision rows: the whole surface is
memo-born (38 rows; 2 carry an explicit in-row DECIDED-HERE marker —
C29, C31; the per-row provenance manifest is a packet-side mechanism);
post-ratification reopenings: 0. Ratification-act character (honest
record): the human ratified on REVIEW-EVIDENCE TRUST — a skim, not a
full parse ("elég sok szem látta"); the draft's legibility for a
human ratifier is boundary-review material.

**Close metrics (recorded at the ch8 close, 2026-07-11):**
post-ratification reopenings: 2 (the 2026-08-15 ch14-ratification reopen — C9 scoped to the agent class + C10's integer-key ban, one cycle; and the 2026-07-19 ch12-ratification pointer reopen — C14's value domain delegated to the ch12 successor, closed by re-ratification within the same act); every row realized across ch8-P1
(C1–C28, C33–C36) and ch8-P2 (C29–C32, C37–C38) — the realized flip +
map in ONE act (this commit). The boundary review resolved the queued
legibility question: the depth-is-the-human's-risk-call clause
(README §5.5) + the ratifier's digest (DraftContract §4).

**Reopen record (2026-07-19, the ch12 ratification — act B of its
decision set).** Reopened from `realized` (the post-close escape
hatch, the ratifier's resolved STOP): C14 converted to its POINTER
form — the `agentConfig` value domain (map-only + canonical-JSON-safe)
delegated to `contract:ch12-runtime-core#C7`; the ch8 draft's FIRST
reopen. Reopen-delta new-decision rows: 0 (a pointer conversion; the
narrowing decision lives in the ch12 draft). The pointer row realizes
VACUOUSLY — the successor semantics realize at ch12's own close.

**Reopen record (2026-08-15, the ch14 draft ratification — the reopen
set its C26 carries).** Reopened from `realized` (the post-close
escape hatch, the ratifier's resolved STOP): C9 scoped to the AGENT
class with the per-type keysets delegated to the ch14 contract (the
step-class partition falsified the universal keyset), and C10's id
grammar gains the integer-key ban (ch13 boundary verdict (f); the
code half lands at ch14-P1). Reopen-delta new-decision rows: 0 (both
decisions live in the ch14 draft; these edits scope and point). C9's
delegated keysets and C10's ban clause realize VACUOUSLY here — the
successor semantics realize at ch14's own close.

## Contract rows (every normative statement is a C-row)

| ID | Rule |
|---|---|
| C1 | Syntax: YAML, parsed with YAML 1.2 core-schema semantics — only `true`/`false` are booleans; `on`/`yes`/`no`/`off` parse as strings (probe P1). |
| C2 | The loader uses the yaml DOCUMENT API and promotes BOTH `doc.errors` AND `doc.warnings` to load errors (fail-closed): an unresolved custom tag — a warning, not an error, at the parser (probes P6/P6b) — is thereby rejected, as is a `BAD_DIRECTIVE` warning (probe P18); the clean-document baseline is zero errors and zero warnings (probe P6c). This inspection covers the DOCUMENT step only — the resolution step has its own guard mapping (C36); the promoted set forms the parse stage's ORDERED finding list (C20). |
| C3 | One YAML document per file; a multi-document stream is a load error (probes P5/P6e). |
| C4 | Duplicate map keys are a load error (probes P2/P6d). |
| C5 | Anchors and aliases are legal and resolve to plain data — the validator sees only resolved values (probe P7a); the parser's alias-amplification guard is the resource bound, and it fires at the RESOLUTION step, mapped per C36 (probes P8/P14/P16). The resolved value graph must be ACYCLIC: a cyclic alias structure passes the parser AND the count-only guard (probe P20 — `toJS()` returns a circular object) and is a VALIDATE-stage error; the validator is cycle-safe by contract (it may not loop, throw uncaught, or let a circular value ride into the template — `agentConfig` included). C8's version-identity check is the NAMED EXCEPTION to values-only: the validate stage receives BOTH the resolved value graph AND the source document — node-level inspection is confined to C8's version rule. Merge keys are C35's row. |
| C6 | Template files are UTF-8 and are decoded STRICTLY (`TextDecoder` fatal mode): invalid byte sequences are a read-stage load error — never the platform's silent U+FFFD substitution, which would repair a malformed file into a different one (probe P19b). |
| C7 | Top-level shape: a map with EXACTLY the keys `ref`, `start`, `steps`, `terminal`, `roles` — all five required. A NON-MAP root (the empty document's `null`, a list, a scalar — probe P10) is ONE validate finding at the root path (C21), never five missing-key findings. Forward declaration (the C25 mirror, plan §8.2 rule 2): the fixed keysets grow ONLY by ADDITIVE OPTIONAL keys ratified in the realizing chapter (first expected: the L2 gate core's key), each with a behavior-preserving default — never by silent extension. (The post-`realized` carrier mechanics — a new ratification act on this draft vs a successor surface — are the process layer's call at that chapter, not this row's; this row fixes only that the growth is additive.) |
| C8 | `ref` is a map with exactly `id` and `version`; `id` is a STRING (a non-string resolved value is rejected) matching `^[a-z0-9][a-z0-9-]*$` (filename-safe); `version` is an integer ≥ 1 written as a PLAIN scalar in decimal form — the scalar's SOURCE TEXT must match `^[1-9][0-9]*$`, where "source text" means the RAW representation including quote/style characters (the range slice or node type, never the quote-stripping `.source` — probe P11), because the resolved value cannot carry the distinction: `1.0` resolves to integral 1 and `0x10` to 16 (probes P3/P19a) — float forms, quoted/string forms, and alternative bases are ALL rejected on the source form. `version` must additionally be ANCHOR-FREE, NON-ALIASED, and TAG-FREE, and its RESOLVED value must be a SAFE integer (`Number.isSafeInteger` — past 2^53−1 distinct source strings collapse to one float, defeating identity) — the tag token, like the anchor token, sits OUTSIDE the range slice: `version: !!str 1` slices to `1`, types PLAIN, raises no warning (a standard resolvable tag), yet resolves to the STRING `"1"` (probes P21/P22); the resolved-type check is the symmetric belt the `id` clause already carries. |
| C9 | `steps` is a NONEMPTY map of step-id → step. A step of the AGENT class — selected by the ABSENCE of the `type` discriminator, and the only class this surface defines — is a map with exactly `role`, `instruction`, `transitions`, plus the optional `agentConfig`; the step-class discriminator and the other classes' keysets are delegated to `contract:ch14-human-decision#C1` / `contract:ch14-human-decision#C2` / `contract:ch14-human-decision#C3` (the 2026-08-15 reopen's scoping). |
| C10 | Step ids, TERMINAL ids, role names, and event types are nonempty strings containing no whitespace character (`/\s/u`) and NO `.` — the dot is C21's path-segment separator, and banning it in every id class keeps each error path's segment boundaries reconstructable on the machine-read error-doc surface (strict start; a relaxation would first need a C21 path-escaping grammar). Terminal ids share the transition-target namespace with step ids (C19), so the whole namespace carries ONE grammar — which additionally refuses the canonical decimal integer spellings of 0…2³²−2, the measured JS record enumeration re-order class (`"01"`, `"-1"`, `"4294967295"` stay legal); migration authority, receipts, and the code carrier (the ch14-P1 `vc-id-class` tightening): `contract:ch14-human-decision#C10`. |
| C11 | `instruction` is a nonempty string; multiline prose is first-class via block scalars and the format performs NO whitespace normalization — trailing-newline behavior is the author's, via the chomping indicator (probe P4). |
| C12 | `transitions` is a map of event-type → target id and MAY be empty: a step with no transitions is semantically defined (at runtime every event yields the model's `no_transition` rejection) — the format does not forbid the shape. |
| C13 | The shape has two kinds of map: FIXED-KEYSET maps (the top level, `ref`, each step, each roles entry — their legal keysets are C7/C8/C9/C15) and OPEN-KEY maps (`steps`, `transitions`, `roles` — their KEYS are data: step ids, event types, role names, governed by C10 and C16; their VALUES are governed by their own rows, e.g. C19 for transition targets). The unknown-key rule binds the FIXED-KEYSET maps only: an unknown key there is a validation error naming the exact path and the offending key (plan §8.2 rule 4, fail-closed); an open-key map has no "unknown" key by construction. `agentConfig` is exempt entirely (C14). |
| C14 | `agentConfig` is exempt from C13's unknown-key rule and the shape rows; at the VALIDATE stage the value passes through raw, subject to the document-wide C1–C6 gates and C5's acyclicity (a custom tag or duplicate key inside it still rejects the document; a cyclic value inside it is C5's validate-stage error). Its VALUE DOMAIN is OWNED by `contract:ch12-runtime-core#C7` (map-only + canonical-JSON-safe — moved by the ch12 ratification act — human-approved 2026-07-18, ratified 2026-07-19; this row's original any-value pass-through named itself "the L0c pass-through", and L0c's realizing chapter now owns the domain). |
| C15 | `roles` is a map of role-name → a map whose only legal key is the OPTIONAL `defaultActor`; when present, `defaultActor` is a nonempty string. |
| C16 | Role-set discipline: `keys(roles)` equals EXACTLY the set of roles referenced by steps — an undeclared-but-used role AND a declared-but-unused role are both validation errors (strict start; any relaxation is additive later). This RESOLVES the `start.ts` forward pointer ("reachability-aware refinement is ch-8 territory"): the format layer fixes declared==used strictly; reachability-aware relaxation stays deferred-additive — the ch8-P2 sweep retires that comment (the §8.5 pointer-hygiene precedent). |
| C17 | `terminal` is a nonempty list of unique ids, disjoint from `keys(steps)`. |
| C18 | `start` ∈ `keys(steps)`. |
| C19 | Every transition target ∈ `keys(steps)` ∪ `terminal`. |
| C20 | Error model, read/parse/resolve stages — POSITIONAL findings (`{stage, line/col where the parser provides it, message}`, probes P9/P13), exempt from C21's path accumulation, short-circuiting per C36. READ and RESOLVE failures are each a SINGLE finding (one decode throw, one guard throw). The PARSE stage's result is the FULL promoted diagnostic set (C2: `doc.errors` ∪ `doc.warnings` — the parser can emit SEVERAL per document, probe P23) as ONE ORDERED list: errors first, then warnings, each class in the parser's array order (= source-position order within the class, probes P23d/P23e); the class-major order is DECLARED, not positional — a warning may precede an error by source position (probe P23c) and still lists after it. When C34's silent-directive check fires — with ZERO promoted diagnostics (probe P17) or alongside them — its SYNTHESIZED finding HEADS the list: the full parse order is directive finding, then errors, then warnings. READ-stage findings carry the requested path and NEVER file content; the OS-read half additionally carries the OS error code, while the strict-decode half (C6) has no OS errno — it carries a content-free decode message (probe P19b). No snake_case error NAME exists on the load side — `stage` + `message` carry it, and the CLI doc name is C31's (the 85-registry's snake_case style is never mimicked). |
| C21 | Error model, validate stage: ALL structural findings are ACCUMULATED as `{path, message}` entries with dotted paths (e.g. `steps.review.transitions.PASS`; the root itself is the token `$`) and returned in ONE result — never first-error-only. Dependent-lane SUPPRESSION (the C7 root rule generalized): the rule binds EVERY container precondition — a container that is MISSING or not its required kind yields ITS OWN finding (absence = the owning keyset row's missing-key finding, C7/C8/C9/C15) and suppresses the dependent lanes that presuppose it. The container set, in full, each in BOTH its missing and wrong-kind form: the root (C7), `ref` (C8 — `ref: 1` or an absent `ref` is ONE finding, never id/version lanes over undefined), `steps` and EACH step value (C9), `roles` and EACH roles entry (C15), `terminal` (C17), each `transitions` map (C12); suppressed dependents e.g. C16/C18/C19 over `keys(steps)`, C8's field lanes under a malformed or missing `ref`: one defect, one finding set, never a cascade. |
| C22 | The validator returns a template XOR an error result; nothing partial ever escapes — no partially-populated `WorkflowTemplate` exists on any error path. |
| C23 | Channel boundary: load findings are LOAD-side typed errors — never envelope rejections and never 85-registry names. This covers the NEAR-MATCHES too (`missing_role`, `missing_version`, `unknown_target`, `missing_required_field`, `invalid_shape`, the `invalid_*` family): those names belong to ENVELOPE/model surfaces, and template validation precedes any envelope — there is no instance and nothing to reject INTO, so reaching for a registry name here would invent a rejection with no transcript home (the `start.ts` precedent). The `DefinitionStore` port's null-at-start / throw-at-handle contract is unchanged. |
| C24 | No format-version field exists; evolution is additive-only per plan §8.2; `kind` is RESERVED as the future format-family discriminator — its appearance today is an unknown key under C13. |
| C25 | The removed/renamed-key registry is the appendix table below (EMPTY at v0); a key listed there is rejected with its recorded migration text; every future removal or rename appends a row in its removing chapter — never a silent ignore. |
| C26 | The file-backed `DefinitionStore` is DIRECTORY-backed: for ref `{id, version}` the target filename is exactly `<id>@<version>.yaml` under the configured templates directory, and the match is BYTE-EXACT ON THE DIRECTORY LISTING (`readdir` + string equality) — never OS path resolution, which is case-insensitive on the default macOS filesystem and would resolve case-variant names (probe P12); presence/absence is thereby platform-independent. |
| C27 | The declared `ref` block is the AUTHORITY over identity; the store compares it against the ON-DISK filename it matched (C26's listing entry) and a mismatch is a load error — the store layer's OWN stage, running AFTER validate (it needs the well-formed `ref`) and short-circuiting like every C36 stage, its finding a C21-form entry at path `ref`, and its error-doc stage label is `store` (completing the stage vocabulary: read/parse/resolve from C20, `validate` from C21/C36, `store` from this row). The check belongs to load-by-ref only (`validate <path>` has no ref and does not perform it). Neither side is silently trusted. |
| C28 | `load(ref)`: a MISSING file (no byte-exact listing match) resolves `null` — the port's start-side not-found contract; a PRESENT file failing ANY load stage (read/parse/resolve/validate, or the store's post-validate ref-check C27 — including an OS read failure on a present file) REJECTS with the typed error carrying that stage's finding(s) per C20/C21 — invalid or unreadable is NEVER conflated with absent. The port SIGNATURE is untouched (a Promise may reject by type — C23); ch8-P1 documents the may-reject character on the port's comment so the kernel's propagate-through behavior rests on stated contract, not incident. |
| C29 | CLI config lane: the templates directory resolves `--templates-dir` > `PAIRFLOW_V3_TEMPLATES` > missing = usage (exit 2) — the ch6 config-matrix pattern for RESOLUTION. A CONFIGURED directory that cannot be listed (absent, not a directory, unreadable) is ALSO usage-class (exit 2) — DECIDED HERE as a conscious deviation from ch6's resource-open half (store-open failures map to internal/exit 1 to keep the ADR-003 fail-closed character loud): the templates dir is a read-only LOOKUP location, not the fail-closed write substrate — a bad dir is operator misconfiguration, not integrity. Resolution AND listability are checked EAGERLY at CLI wiring (the ch6 `resolveDbPath`/`openStoreOrInternal` timing), so a bad dir exits 2 BEFORE any kernel handle — it can never reach the C38 exit-1 catch. The lane binds exactly the verbs that construct the kernel over a live store (`start`, `submit`; dev `inject`) — read-only floor verbs take no template config, and hermetic dev `replay` stays outside the lane (C37). This lane is NEW and BREAKING for today's zero-config invocations (the builtin store retires, C32): the ch8-P2 migration sweeps EVERY existing call site — tests, smoke flows, bridge docs. |
| C30 | `start` names its template as a pinned `<id>@<version>` ref — no latest form exists (plan §8.5 / D1); the exact flag shape is packet work, pinned-ref-only is the contract. |
| C31 | dev `validate <path>`: exactly one file through the C36 pipeline; it takes ONLY the `<path>` positional — no `--db`, no `--templates-dir`. OBTAINING the bytes (the OS read) is a PRE-PIPELINE input gate: a missing or OS-unreadable file → usage (exit 2, the dev CLI's `readJsonFile` input-error CLASS — cited for the class ONLY, never its decode idiom: validate reads raw BYTES and strict-decodes per C6 as the pipeline's read stage, or the C6 lane could never fire; the exit-2 gate deliberately diverges from the store's typed-error character, because a path is operator input while a ref is a pinned commitment). Valid → exit 0 with JSON `{valid: true, ref}` on stdout. Content-invalid at ANY pipeline stage (read/parse/resolve/validate — "read" is the C20 stage-marker vocabulary; the decode is that stage's content half) → exit 1 with the standard error doc, name `TemplateInvalid` (PascalCase — the ch6 `CliErrorDoc` culture), details = the MACHINE SHAPE `{stage, findings: [...]}` — the top-level `stage` names the failing stage (for a C20-form list it EQUALS the entries' own stage marker; the duplication is deliberate, the top-level key is the routing field); `findings` entries are the C20 form (`{stage, path?, code?, line?, col?, message}` — `line`/`col` 1-based, present where the parser provides positions; `path` REQUIRED on read-stage entries and `code` = the OS error code on their OS-read half, both ABSENT on parse/resolve entries — the C20 read-stage payload is STRUCTURAL, never message-embedded) or the C21 form (`{path, message}`) — never a mixed list (C36's short-circuit guarantees one stage per result). The exit-1 class is DECIDED HERE as the checker verb's semantic verdict (the P4b `TraceMismatchError` precedent) — consciously overriding the dev file-helpers' structural→usage-2 line, which a reader could equally entail from the same sources. stdout carries data, stderr the ONE error doc (the ch6-P4a channel rule). |
| C32 | The canonical local-pair-v0 authoring file lives at `v3/templates/local-pair-v0@1.yaml` and is the SINGLE source of that template. The CLI builtin (`builtinTemplate` / `builtinDefinitionStore`) is RETIRED — `start`/`submit`/`inject` consume the file store (C29). The testkit `fixtureTemplate()` STAYS (the kit's own consumers keep it) and is equality-pinned to the canonical file's parsed form FROM TESTS (tests may import anything; the kit itself never imports `definition/` — the ADR-005 stance is untouched). The pin's exact test shape is packet work. |
| C33 | The dependency is `yaml` (eemeli/yaml) major 2 — probed at 2.9.0, zero transitive dependencies — the v3 package's FIRST and only runtime dependency; recorded as ADR-012 (amends ADR-002), riding this draft: `proposed` with the content commit, `accepted` by the ratification act. |
| C34 | A document whose explicit `%YAML` directive declares a version OTHER than 1.2 is a load error (parse stage). The cover is a UNION of two mechanisms, honestly split: the directive-object check `doc.directives.yaml.explicit && version !== "1.2"` catches ONLY the silently-ADOPTED case — `%YAML 1.1`, zero errors zero warnings, restoring the FULL 1.1 trap (`on` → boolean, `<<` actually merges), which C2's inspection cannot see; every OTHER non-1.2 version (`1.0`, `1.3`, `2.0`, …) is NOT adopted — `directives.yaml.version` stays `"1.2"`, the formula does NOT fire — and raises a `BAD_DIRECTIVE` warning that C2's promotion rejects (probes P17/P18). The option pin `version: "1.2"` does NOT override an in-document directive; an explicit `%YAML 1.2` stays legal (probes P18b/P15). The silent case's finding is SYNTHESIZED (the parser emitted nothing) and heads the parse-stage finding list (C20). |
| C35 | Merge keys are NOT a format feature: under the enforced 1.2 semantics `<<` never merges (probe P7b; the 1.1 mode where it would is blocked by C34). In a FIXED-KEYSET map `<<` is rejected as an unknown key (C13); in an OPEN-KEY map it is merely a legal-but-meaningless token per C10 — the format assigns it NO semantics anywhere. |
| C36 | The load pipeline is staged IN ORDER: read (bytes → string, strict UTF-8 per C6) → parse (the C2 document step AND the C34 directive check — C34's silent case is invisible to C2's inspection) → resolve (`toJS` — where the alias-amplification guard fires, probes P14/P16) → validate (C21, incl. C5's acyclicity rule); on a load-by-ref the store's post-validate ref-check (C27) is the final stage. Each stage SHORT-CIRCUITS: the first failing stage's finding(s) are the ENTIRE result — parse and validate findings never mix. Resolution-stage throws are CAUGHT and mapped to the C20 finding form (`stage: "resolve"`) — no load input may produce an uncaught throw (C22 binds every stage). |
| C37 | dev `replay` keeps its hermetic contract after the builtin retires: it repoints to the testkit `fixtureTemplate()` / `fixtureDefinitionStore()` (themselves pinned to the canonical file per C32) and does NOT join the templates-dir lane (C29) — the dev entrypoint may import the testkit (ADR-009). |
| C38 | The WRITE lane surfaces the store's C28 rejection: `start`, `submit`, and dev `inject` catch the TYPED load error and emit the SAME `TemplateInvalid` error doc as C31 (exit 1; details = C31's `{stage, findings}` machine shape) — the typed error is never surfaced as a raw internal wrap. The full disposition set: 0 = valid load, the verb proceeds (the unchanged baseline); 3 = ABSENT at start (`load` → null, the ch6 `UnknownTemplate` not-found class); 1 = the template exists and is bad (this row) — the C28 invalid≠absent distinction VISIBLE at the CLI; 2 = the config lane itself (C29). ABSENT at HANDLE (a template deleted between start and submit/inject) is OUTSIDE this row by design: the kernel's pinned-ref integrity throw stands (the ch4 port contract — that IS an integrity failure, exit 1, not a template-content outcome). |

## Appendix — removed/renamed-key registry (C25; empty at v0)

| Key (path) | Removed/renamed in | Migration text |
|---|---|---|

## Ratification history (empty at `draft` — blocks are appended by the lifecycle acts)

```json
{"ratification": {"date": "2026-07-10", "arms": ["claude-opus-4-8 five-lens panel (8 full rounds) + close passes", "external codex arm, user's default config (5 rounds: 3 user-run, 2 agent-invoked)"], "commit": "9ea630a03936d45309e53a33771a705b99e744cd"}}
```

```json
{"ratification": {"date": "2026-07-19", "arms": ["the ch12 draft loop's agent-invoked codex arm (gpt-5.6-sol/high) — the prepared pointer text reviewed within the ch12 rounds (two full rounds + six re-checks, final clean)"], "commit": "1600f2f23a85938374846bdd4238736eac21e49a"}}
```


```json
{"ratification": {"date": "2026-08-15", "arms": ["the ch14 draft ratification's reopen rider (ch14-C26): the edits' grounds and prepared shape reviewed by the ch14 draft's two full Opus panel rounds + targeted reconciliation + the agent-invoked gptsol arm (pin gpt-5.6-sol/high, re-check CLEAN); the reopen resolved as the ratifying user's explicit STOP decision at the ch14 GO, diff-reviewed"], "commit": "92ec7ac9e82dcf0810655281d58f1b62652bb269"}}
```

## Realized map (empty until chapter close)

```json
{"realized_map": {
  "C1": "ch8-P1 G2 \u2014 v3/src/definition/load.ts; load.test.ts G2 lane",
  "C2": "ch8-P1 G4 \u2014 load.ts warnings promotion; load.test.ts G4 lanes",
  "C3": "ch8-P1 G5 \u2014 load.ts; load.test.ts multi-document lane",
  "C4": "ch8-P1 G6 (+ rounds 3-6: document-wide structural uniqueKeys, SameValueZero) \u2014 load.ts; load.test.ts G6 lanes",
  "C5": "ch8-P1 G8 + V15 \u2014 load.ts resolve guard; validate.ts acyclicity; both suites' lanes",
  "C6": "ch8-P1 G3 \u2014 load.ts strict TextDecoder; load.test.ts invalid-byte lane",
  "C7": "ch8-P1 V1 \u2014 validate.ts root keyset; validate.test.ts V1 lanes",
  "C8": "ch8-P1 V2 + V3 (+ ch8-P2 T2: the C8-mirrored CLI ref grammar) \u2014 validate.ts id regex + version source ladder; cli/main.ts parseTemplateRef; validate.test.ts dimension-2 ladder + cli.test.ts T2 ladder",
  "C9": "ch8-P1 V4 \u2014 validate.ts; validate.test.ts (agent-class scope since the 2026-08-15 reopen; the per-type keysets realize VACUOUSLY here \u2014 delegation, the successor realizes at ch14's close)",
  "C10": "ch8-P1 V5 \u2014 validate.ts shared id grammar; validate.test.ts id-class \u00d7 form grid (the integer-ban clause realizes VACUOUSLY here \u2014 delegation, the code half lands at ch14-P1)",
  "C11": "ch8-P1 V6 \u2014 validate.ts; validate.test.ts",
  "C12": "ch8-P1 V7 \u2014 validate.ts; validate.test.ts empty-transitions positive",
  "C13": "ch8-P1 V8 \u2014 validate.ts fixed-vs-open keysets; validate.test.ts unknown-key lanes",
  "C14": "ch8-P1 V9 (+ rounds 3/6: own-property-safe records, lossless Map fallback, one-memo identity) \u2014 validate.ts; validate.test.ts V9 lanes ; reopened at the ch12 ratification (human-approved 2026-07-18, ratified 2026-07-19) \u2014 successor contract:ch12-runtime-core#C7; realized vacuously (delegation \u2014 the successor realizes at ch12's close)",
  "C15": "ch8-P1 V10 \u2014 validate.ts; validate.test.ts",
  "C16": "ch8-P1 V11 (+ ch8-P2 M6: the start.ts pointer retirement; start.ts itself was later retired at ch12-P1b, commit 6aec56d4) \u2014 validate.ts; validate.test.ts role-set lanes",
  "C17": "ch8-P1 V12 \u2014 validate.ts; validate.test.ts",
  "C18": "ch8-P1 V13 \u2014 validate.ts; validate.test.ts",
  "C19": "ch8-P1 V14 \u2014 validate.ts; validate.test.ts",
  "C20": "ch8-P1 E1 + E5 + S4 \u2014 errors.ts finding forms; load.ts; E5's exact read-path finding shapes; both suites' ordering/read lanes",
  "C21": "ch8-P1 E2 + E5 \u2014 validate.ts accumulation + dependent-lane suppression; E5's exact {path, message} keyset; validate.test.ts dimensions 5-6 + the keyset lane",
  "C22": "ch8-P1 E3 \u2014 load.ts/validate.ts; both suites (the every-stage catch is G1's, anchored at C36)",
  "C23": "ch8-P1 E4 \u2014 errors.ts nameless load side; the close registry-name sweep",
  "C24": "ch8-P1 V16 \u2014 validate.ts; validate.test.ts kind-reserved negative",
  "C25": "ch8-P1 V17 \u2014 vacuously realized at v0 (empty appendix; unknown keys fall to C13's V8 lane)",
  "C26": "ch8-P1 S1 \u2014 fileDefinitionStore.ts byte-exact listing; fileDefinitionStore.test.ts dimension-9 lanes",
  "C27": "ch8-P1 S2 \u2014 fileDefinitionStore.ts post-validate ref check; store suite",
  "C28": "ch8-P1 S3 + S4 \u2014 fileDefinitionStore.ts + ports/definition.ts comment; S4's unlistable-directory-is-not-absent branch; store suite invalid-vs-absent lanes",
  "C29": "ch8-P2 A1-A4 + ch8-P1 B4 \u2014 cli/common.ts resolveTemplatesDir (eager gate); B4's public file-store surface (definition/index.ts); cli.test.ts A lanes + the breaking-sweep",
  "C30": "ch8-P2 T1-T2 \u2014 cli/main.ts parseTemplateRef (C8-mirrored grammar); cli.test.ts T2 ladder",
  "C31": "ch8-P2 D1-D5 (+ ch8-P2 A3/W2, ch8-P1 E5/B4: the loadTemplate path + typed-error surface the verb consumes) \u2014 cli/dev/main.ts verbValidate; dev.test.ts D lanes",
  "C32": "ch8-P2 M1-M3 + M5 + M7 \u2014 v3/templates/local-pair-v0@1.yaml; the builtin deleted; M5's MD-1 debt-closure sweep; testkit/templateFixture.test.ts equality pin",
  "C33": "ch8-P1 B3 \u2014 v3/package.json yaml@2 dependency; ADR-012",
  "C34": "ch8-P1 G7 \u2014 load.ts two-mechanism directive union; load.test.ts G7 lanes",
  "C35": "ch8-P1 G9 \u2014 merge-key non-feature; load.test.ts G9 lanes",
  "C36": "ch8-P1 G1 + G8 \u2014 load.ts staged short-circuiting pipeline; G8's resolve-stage toJS/alias guard; both suites' combination lanes",
  "C37": "ch8-P2 M4 + A3 \u2014 cli/dev/main.ts replay repoint to the testkit fixture, kept outside --templates-dir; dev.test.ts A3/M4 replay lanes",
  "C38": "ch8-P2 W1-W4 + ch8-P1 B4 \u2014 cli/main.ts + cli/dev/main.ts type-based per-verb catches over B4's typed store/error surface; cli.test.ts/dev.test.ts W lanes + journey.test.ts"
}}
```




