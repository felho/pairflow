# Task Packet: ch8-P2 — the MD-1 migration + CLI activation (canonical file as single source · templates-dir lane · dev validate · the first full-lifecycle journey smoke)

Plan step: plan.md §8.9 P2 row (realizes §8.6 — the MD-1 migration —
and the draft rows C29–C32, C37–C38; carries the §8.9 journey-smoke
amendment, user-ratified 2026-07-11). The sibling P1 packet
(`ch8-p1-definition-module.md`) is BUILT and closed — this packet is
the activation half of the chapter's foundation→activation cut.
Autonomy stage: measurement — **flag-free approve → autonomous build**
(the §8.9 P2 mode; the §5.5 fallbacks stand: any flag, STOP, or
first-of-a-kind reclassification at authoring routes to the human).
Classification: **projection** — manifest tally: 20 anchored /
4 derived / 0 new-decision (machine-counted from the `packet_rows`
block). Zero new-decision rows — no Case-B trigger; every canonical
row anchors to a ratified draft row, ratified plan text, or an
entailed derivation from them. Matches the §8.9 pre-registered
prediction (projection).

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
format is memo-born operability"): the migration and activation add
ZERO kernel semantics — the kernel, ingress, store, and floor are
behavior-untouched; the journey smoke EXERCISES existing semantics
through the shipped surface, it realizes no unit. Coverage axes
unchanged — an assertion the close verifies, not an omission.

## Sizing/risk (template §2 step 0 — materialized)

Predicted class (plan §8.9, recorded at the ch8 ratification):
**projection** (source: the ratified draft rows + the P1 packet
contract + the ch4/ch6 template copies). Discovered at authoring:
**projection** (20/4/0) — prediction and discovery MATCH.

Six axes:

- **authority movement:** YES — the canonical source of
  `local-pair-v0` MOVES from two hardcoded code copies (testkit
  `fixtureTemplate()`, CLI `builtinTemplate()`) to the canonical file
  `v3/templates/local-pair-v0@1.yaml` (C32). This is the packet's
  substance, ratified as such at the chapter cut.
- **surface spread:** ONE production module changes — `cli/` (both
  entrypoints + common.ts; `templates.ts` deleted). The kernel and
  domain edits are COMMENT-ONLY (M6; M5's `template.ts` receipt);
  testkit CONTRACT unchanged (`fixtureTemplate()`
  stays byte-identical; the equality pin is a TEST, not a new
  fake/seam/fixture type — tests exercising the change never count);
  `definition/` is consumed via its P1-fixed public surface, not
  changed; store/ingress/floor/ports untouched (domain: the
  comment-only receipt above). Plus the data
  file (`v3/templates/`) and the plan's status flips (docs).
- **identity/join fragility:** shallow — the ref↔filename identity is
  P1's S1/S2 (built and driven); this packet adds ONE mapping on top:
  the `--template '<id>@<version>'` flag form → `TemplateRef` (T2),
  driven by its own grammar ladder. No cross-store join.
- **foundation + activation coupling:** the chapter cut IS the
  foundation→activation split (plan §8.9: P1 foundation, P2
  activation) — the gate's default split shape was applied at
  ratification. Within P2, migration and activation are INSEPARABLE:
  retiring the builtin (C32) and wiring the file store (C29) are the
  same code change.
- **prerequisite coupling:** NONE unfinished — P1 is built, closed,
  and aftermath-settled (534 tests; the module's public surface B4 is
  packet contract).
- **acceptance multiplicity:** THREE success classes proven at once —
  CLI behavior (config/exit matrices), migration equality (the pin +
  retirement sweeps), the e2e journey. Bounded: all three live on one
  proof surface (the v3 vitest suite) and one bounded code change.

**Hard-stop check:** hard stop 1 (authority movement + new runtime
behavior turned on, in one packet) TRIPS NOMINALLY — and this packet
continues past the trip on implementation-closure proof, per the
gate's own continuation rule:

- one build closes it without separate sequencing: the builtin
  retirement, the file-store wiring, and the call-site sweep are one
  bounded change (you cannot retire the builtin without activating
  the file store; activation without migration has no template to
  load);
- the same bounded code change closes the touched buckets (authority
  + runtime activation land in the same `cli/` diff);
- the same consumers own the fallout: the two CLI entrypoints' verbs,
  all driven inside this packet's suites;
- one proof surface validates it: the CLI suites + the equality pin +
  the journey smoke, one vitest run;
- no per-consumer-family review loop, no separate compatibility /
  diagnostics / read-projection / recovery / ordering risk (the diag
  wiring, floor reads, and store semantics are untouched — existing
  suites stay green as the no-regression guard).

The below-hard-stop escalation combo (authority change + a
consumer-relied cross-seam mapping + a CLI/human-payload change) is
present by the same facts and is answered by the same closure proof.
The plan-level remedy (split) was ALREADY applied at the chapter cut;
splitting P2 further would separate migration from activation, which
the ratified row binds together (and the journey smoke was
user-ratified to ride THIS packet). **single-packet allowed: yes.**

**Consume-family scan (authority-heavy — from the tree, measured
2026-07-11):** producer: present — this packet authors the canonical
file. validator/gate: present — the P1 `definition/` module,
unchanged. persistence/replay: present — dev `replay` repointed to the
testkit fixture (M4, a one-line consumer alignment); the run store is
untouched. execution consumer: present — kernel via the
`DefinitionStore` port, code-untouched (the CLI wires it a different
store instance). read/presentation: present — the CLI verbs, THIS
packet's change. recovery/cleanup: absent (no such surface exists for
templates). external/integration: absent (templates never reach the
egress surface). testkit: present; its CONTRACT is unchanged (does
not count toward the family stops). Families materially changed: the
CLI (read/presentation + write lane) and the replay repoint — below
the 3+ family stops.

Conditional annexes:

- **Closure-budget triage** (authority + runtime buckets in scope):
  touched — the template-source authority bucket and the CLI runtime
  bucket, deliberately COLLAPSED into one commit (the retirement makes
  them inseparable — see the closure proof). Read-projection and
  shared-contract buckets NOT touched (floor untouched; the
  `DefinitionStore` port byte-identical). Deferred: nothing.
- **Proof-boundary triage** (a proof contract moves): the MD-1
  drift-pin's canonical proof MOVES — current: `templates.test.ts`
  deep-equals `builtinTemplate()` ↔ `fixtureTemplate()` (guards
  copy-drift between two code constants); target:
  `templateFixture.test.ts` deep-equals `fixtureTemplate()` ↔ the
  parsed canonical file (guards the ONLY duplication that remains
  after retirement). The old pin dies WITH the copy it guards, in the
  same commit — no mixed-truth phase exists. Proof parity: the new
  pin is strictly stronger for the surviving duplication (it proves
  the file parses through the real pipeline AND matches the fixture);
  the old pin's subject ceases to exist. Recorded as M7.
  A second reuse is NARROWED explicitly: the ch6-P4a config-matrix
  pattern is reused for the templates-dir lane (C29's own citation),
  but the lane gets its OWN driven tests (A1–A4) — no inherited
  greenness.
- **Mutable-flow record:** N/A — no hard-stop-9 material: the
  template surface is read-only; no rollback/retry/lock/idempotency
  semantics exist or change; the config gate's precondition ordering
  (usage-2 before any kernel handle) is A2's own driven contract and
  produces zero side effects on failure (no store row, no diag row —
  the existing C3 no-diag-file lanes stay green).

## Draft-row disposition (scope statement — prose by design)

Realized here: C29 (the templates-dir config lane), C30 (the pinned
`start` ref flag), C31 (dev `validate`), C32 (the canonical file +
builtin retirement + the equality pin), C37 (dev `replay` repoint),
C38 (the write-lane surfacing) — the full remainder. P1 realized
C1–C28 + C33–C36 and pre-defined C31's `{stage, findings}` details
shape (its E5). After this packet NO draft row is undisposed
chapter-wide (C1–C38 all realized) — the draft's `realized` flip with
its `realized_map` is CHAPTER-CLOSE work, not this packet's edit.
Also realized here: plan §8.6 (the MD-1 retirement sweep) and the
§8.9 journey-smoke amendment; C16's named comment retirement (M6).

## Claim + dimensions (enumerated BEFORE deriving test rows)

**Claim (wide):**

1. **Single source:** after this packet the canonical file is the
   ONLY source of the `local-pair-v0` template — no production code
   copy exists anywhere; the testkit fixture is equality-pinned to
   the canonical file's parsed form, from tests.
2. **Activated fail-closed loading:** the operator surfaces load
   templates ONLY through the P1 pipeline and file store; every load
   failure surfaces per the ratified disposition set — 0 valid /
   3 absent-at-start / 1 invalid (`TemplateInvalid`) / 2 config —
   with invalid ≠ absent VISIBLE at the CLI, and NO zero-config
   fallback template existing anywhere (breaking for zero-config
   invocations, by ratified design — every existing call site swept).
3. **Config honesty:** the templates directory resolves
   `--templates-dir` > `PAIRFLOW_V3_TEMPLATES` > missing = usage
   (exit 2); a configured directory that cannot be listed is ALSO
   usage — checked EAGERLY, so a bad dir exits 2 BEFORE any kernel
   handle and can never reach the exit-1 catch.
4. **Validate honesty:** dev `validate <path>` runs exactly one file
   through the full P1 pipeline and answers exactly one of: exit 0
   with `{valid: true, ref}`; exit 2 for the pre-pipeline input gate;
   exit 1 with the ONE `TemplateInvalid` error doc carrying the
   verbatim `{stage, findings}` machine shape.
5. **Journey truth:** the full operator lifecycle — an
   operator-authored template file → `start` → submitted events →
   terminal → floor reads — holds end-to-end through the SHIPPED CLI
   processes, with zero test-side seams inside the lane.
6. **Debt retired:** MD-1 is retired in this commit — every surface
   STATING the debt flips (measured sweep), the ch6-P4a drift-pin is
   retargeted, and the `start.ts` reachability pointer named by C16
   retires. Historical narrative stays untouched.

Dimensions:

1. **Config-lane matrix** (A1–A4): flag beats env; env-only works;
   both missing → usage 2; the three unlistable forms (absent path /
   a FILE at the dir path / an unreadable dir) each usage 2, eagerly
   (no kernel handle constructed); verb binding both ways — the flag
   accepted on `start`/`submit`/dev `inject`, REJECTED by strict
   parse on a read verb, on hermetic `replay`, and on `validate`.
2. **The `--template` grammar ladder** (T1–T2): the default ref; an
   explicit good ref; version-half source-form negatives (`0`, `-1`,
   `+1`, `01`, `1.0`, `0x10`, `1e2`, quoted/whitespace forms, empty)
   → usage 2; positives `1`, `10`, and the safe boundary
   `9007199254740991`; PLUS the safe-integer BELT negative
   `9007199254740993` — it PASSES the lexical regex and fails
   `Number.isSafeInteger` (P1's V3 resolved-value belt mirrored onto
   the flag: a regex-only implementation passes every other listed
   lane — this is the one lane that forces T2's safe-int clause to
   exist) → usage 2; empty id / missing `@` → usage 2. The id half
   is NOT prevalidated beyond
   nonempty — an off-grammar id (`../evil`, uppercase) flows to the
   store and misses per P1's S1 (→ disposition 3), the
   no-prevalidation rule preserved.
3. **Write-lane dispositions** (W1–W4): per verb — valid → 0
   (`start`, `submit`, `inject`); absent at start → `UnknownTemplate`
   3; present-but-invalid → `TemplateInvalid` 1 with the exact
   `{stage, findings}` details, driven at ALL THREE verbs (start's
   pre-load; submit's and inject's in-handle load surfacing at the
   `ingress.submit` await); absent at HANDLE (file deleted between
   start and submit) → the kernel's own integrity error, internal 1,
   NOT `TemplateInvalid` — the two phases' absent-dispositions differ
   and both are driven.
4. **Dev validate** (D1–D5): any flag → strict-parse usage 2; missing
   positional / OS-unreadable path → usage 2; one driven surfacing
   per stage class — read(decode), parse, resolve, validate — each
   exit 1 with `details.stage` naming the stage (narrowed reuse: the
   intra-stage lane INVENTORY is P1's driven surface and is not
   re-driven here); the valid file → exit 0, stdout exactly
   `{valid: true, ref}`; channel rule (data on stdout, the ONE doc on
   stderr).
5. **Migration equality** (M1–M3, M7): the canonical file loads
   through the real pipeline and deep-equals `fixtureTemplate()`
   (the pin); the builtin retirement leaves zero references (close
   grep); the pin retarget's proof parity per the annex.
6. **Replay repoint** (M4): the existing replay suite green on the
   fixture source; `replay` stays hermetic and outside the
   templates-dir lane.
7. **The status sweep** (M5–M6): the measured MD-1 status surfaces
   flip in this commit; the C16 pointer comment retires; a close-time
   grep proves no debt-stating survivor.
8. **The journey** (J1–J2): the staged lifecycle through the shipped
   entrypoints, the REPO's canonical file as the operator-authored
   input, every stage exit 0, floor reads consistent.

## Operative material — the canonical file (verbatim; C32's home)

`v3/templates/local-pair-v0@1.yaml` — byte content (the ratified
draft's canonical example; parses to the exact `fixtureTemplate()`
value — the pin's subject):

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

The P1 module's public surface consumed here (packet contract, P1 B4
— cited, not restated): `loadTemplate(bytes, opts?: {path?})` →
`TemplateLoadResult`; `createFileDefinitionStore(templatesDir)` →
`DefinitionStore` (rejects with `TemplateLoadError`);
`TemplateLoadError` carries `{stage, findings}` and `toJSON()` emits
exactly that shape.

## Canonical activation/config matrix (A)

| Id | Rule |
|---|---|
| A1 | The templates directory resolves `--templates-dir` > `PAIRFLOW_V3_TEMPLATES` (via `deps.env`) > missing/empty = usage (exit 2), doc name `MissingTemplatesDir` — the ch6 config-matrix RESOLUTION pattern, mirroring `MissingDbPath`'s shape (anchored: contract:ch8-template-format#C29) |
| A2 | A CONFIGURED directory that cannot be listed (absent, not a directory, unreadable) is ALSO usage-class (exit 2, doc name `InvalidTemplatesDir`, message naming the path and cause) — the ratified conscious deviation from ch6's resource-open half (the templates dir is a read-only LOOKUP location, not the fail-closed write substrate). Resolution AND listability are checked EAGERLY at CLI wiring (the `resolveDbPath`/`openStoreOrInternal` timing), so a bad dir exits 2 BEFORE any kernel handle is constructed — it can never reach the W-lane exit-1 catch (anchored: contract:ch8-template-format#C29) |
| A3 | The lane binds EXACTLY the verbs that construct the kernel over a live store: `start`, `submit`, dev `inject`. Read-only floor verbs (`list`/`detail`/`timeline`/`tail`/`bundle`, dev `diag`) take no template config; hermetic dev `replay` stays outside the lane (C37); dev `validate` takes only its positional (C31). On every unbound verb `--templates-dir` is rejected by strict parse (usage 2) (anchored: contract:ch8-template-format#C29, contract:ch8-template-format#C37, contract:ch8-template-format#C31) |
| A4 | The lane is NEW and BREAKING for today's zero-config invocations (the builtin store retires with C32): EVERY existing `start`/`submit`/`inject` call site is swept — tests, smoke flows, bridge docs (measured at authoring, frame stated: 13 single-call `run(["start"…]/["submit"…])` sites + the `startOne` helper — 18 call sites; one of the 13 is its own body — + 1 subprocess smoke in `cli.test.ts`, and EVERY `start`/`submit` invocation is affected regardless of frame, since the builtin store is constructed INSIDE the verbs; the succeeding `inject` sites in `dev/dev.test.ts`; NO runnable CLI invocation example exists in any doc — the non-`package.json` `v3:cli` hits (plan.md, packet docs) are bridge-IDENTITY references, measured 2026-07-11). The sweep's completion criterion is grep + the full suite green at build, never the authoring-time count (anchored: contract:ch8-template-format#C29) |

## Canonical start-ref matrix (T)

| Id | Rule |
|---|---|
| T1 | `start` names its template as a pinned `<id>@<version>` ref — no latest form exists (plan §8.5 / D1); pinned-ref-only is the contract (anchored: contract:ch8-template-format#C30) |
| T2 | The flag shape (packet work per C30, decided by derivation): `--template '<id>@<version>'` with default `local-pair-v0@1` — the existing ch6-P4a shape preserved unchanged (activation changes the template's SOURCE, not the verb's input contract; the default is itself a pinned ref). Grammar: split at the LAST `@`; the id half nonempty (NOT otherwise prevalidated — the store judges it per P1's S1 no-prevalidation rule); the version half must lexically match `^[1-9][0-9]*$` AND be a safe integer — the C8 source grammar mirrored onto the flag, replacing the current `Number()` coercion (which silently canonicalizes `0x10`/`1e2`/`01` onto other filenames); violations → usage 2 `InvalidTemplateRef`. DERIVATION: C8 is the ref grammar authority and the P4a parse-contract precedent fixes numeric flags as lexical decimals; a coercing parse would admit source forms the canonical grammar rejects (derived: contract:ch8-template-format#C30, contract:ch8-template-format#C8, prose:packet ch6-P4a parse-contract matrix) |

## Canonical write-lane matrix (W)

| Id | Rule |
|---|---|
| W1 | The full disposition set at the write verbs: 0 = valid load, the verb proceeds (the unchanged baseline); 3 = ABSENT at start (`load` → null → `UnknownTemplate`, the ch6 not-found class); 1 = the template exists and is bad (`TemplateInvalid`, W2) — the invalid≠absent distinction VISIBLE at the CLI; 2 = the config lane itself (A1/A2) (anchored: contract:ch8-template-format#C38) |
| W2 | The `TemplateInvalid` error doc: name `TemplateInvalid` (PascalCase, the ch6 `CliErrorDoc` culture), class internal (exit 1), `details` = the VERBATIM `{stage, findings}` machine shape from the typed `TemplateLoadError` (P1's E5 — the shape was defined there so this packet surfaces it verbatim; never a raw internal wrap, never a re-serialization that changes the keysets) (anchored: contract:ch8-template-format#C38, contract:ch8-template-format#C31) |
| W3 | ABSENT at HANDLE (a template deleted between start and submit/inject) is OUTSIDE the `TemplateInvalid` row by design: the kernel's pinned-ref integrity throw stands (the ch4 port contract — an integrity failure, exit 1 internal via the catch-all), never a template-content outcome. Doc-shape precision (measured): the throw is a plain `Error`, so the doc's `name` field is literally `Error` (the catch-all maps `error.name`); the integrity text — `kernel integrity: pinned template … not found` — lives in the MESSAGE, which is the assert target (anchored: contract:ch8-template-format#C38) |
| W4 | Catch sites are PER-VERB and TYPE-based, not one shared wrapper: `start` PRE-loads before constructing the kernel (the override parse consumes the loaded template; the SAME store instance then feeds the kernel), so its `TemplateLoadError` surfaces at the pre-load — while `submit` and `inject` first touch the template INSIDE `kernel.handle`, so their typed error surfaces at the `ingress.submit` await (ingress has no catch — measured; a mechanical copy of the start-shape catch would miss it). Each verb maps the typed error to W2's doc at EVERY site it can surface in that verb's body (start: pre-load + the kernel's own load — the type-based catch covers both) (derived: contract:ch8-template-format#C38, prose:ch8 draft packet-time watchpoint 4) |

## Canonical dev-validate matrix (D)

| Id | Rule |
|---|---|
| D1 | dev `validate <path>`: exactly one file through the P1 pipeline; it takes ONLY the `<path>` positional — no `--db`, no `--templates-dir`; any flag is rejected by strict parse (usage 2), and an EXTRA positional is rejected too (usage 2 — "exactly one" enforced both ways; the arm-gate-2 aftermath fix) (anchored: contract:ch8-template-format#C31) |
| D2 | OBTAINING the bytes (the OS read) is a PRE-PIPELINE input gate: a missing positional or an OS-unreadable file → usage (exit 2, the dev CLI's input-error CLASS — cited for the class ONLY, never its decode idiom: validate reads raw BYTES and strict-decodes through the pipeline's read stage per C6, or the decode lane could never fire; the exit-2 gate deliberately diverges from the store's typed-error character — a path is operator input, a ref is a pinned commitment) (anchored: contract:ch8-template-format#C31) |
| D3 | Valid → exit 0 with JSON `{valid: true, ref}` on stdout — exactly that keyset; `ref` is the loaded template's `{id, version}` (anchored: contract:ch8-template-format#C31) |
| D4 | Content-invalid at ANY pipeline stage (read/parse/resolve/validate) → exit 1 with the standard error doc, name `TemplateInvalid`, details = `{stage, findings}` — the top-level `stage` names the failing stage (the routing field; for a positional-finding list it EQUALS the entries' own marker — deliberate duplication), `findings` entries are P1's E1 form or E2 form, never a mixed list (the pipeline's short-circuit guarantees one stage per result). The exit-1 class is the ratified checker-verb semantic verdict (the P4b `TraceMismatchError` precedent), consciously overriding the dev file-helpers' structural→usage-2 line (anchored: contract:ch8-template-format#C31) |
| D5 | Channel rule: stdout carries data, stderr the ONE error doc (the ch6-P4a channel rule, inherited via the shared dispatch shell) (anchored: contract:ch8-template-format#C31) |

## Canonical migration matrix (M)

| Id | Rule |
|---|---|
| M1 | The canonical `local-pair-v0` authoring file lives at `v3/templates/local-pair-v0@1.yaml` (byte content: the operative material above) and is the SINGLE source of that template; it loads through the real pipeline to the exact `fixtureTemplate()` value (anchored: contract:ch8-template-format#C32) |
| M2 | The CLI builtin is RETIRED: `cli/templates.ts` (`builtinTemplate` + `builtinDefinitionStore`) and its `templates.test.ts` are DELETED; `start`/`submit`/`inject` consume the file store (A-lane); zero references to either symbol remain at close (grep-measured) (anchored: contract:ch8-template-format#C32) |
| M3 | The testkit `fixtureTemplate()` STAYS (the kit's own consumers keep it) and is equality-pinned to the canonical file's parsed form FROM TESTS: a new `testkit/templateFixture.test.ts` reads the canonical bytes, runs `loadTemplate`, and deep-equals the result against `fixtureTemplate()`. The kit itself never imports `definition/` — tests may import anything; the ADR-005 stance is untouched (anchored: contract:ch8-template-format#C32) |
| M4 | dev `replay` keeps its hermetic contract after the builtin retires: it repoints to the testkit `fixtureTemplate()` / `fixtureDefinitionStore()` (the dev entrypoint may import the testkit — ADR-009) and does NOT join the templates-dir lane (anchored: contract:ch8-template-format#C37) |
| M5 | MD-1 is retired in THIS commit with the old-status sweep — every surface STATING the debt flips to a dated receipt ("retired at ch8-P2"): the plan §1.3 MD-1 block; the §4.9 DoD line "MD-1 stays open by design (ch-8 debt)" (the §8.6-named "§4.8" status text sits in §4.9's DoD — measured location); the §6.1 "(MD-1 stands)" parenthetical; the §6.5 "ch 8 retires both" pointer; the `templateFixture.ts` MD-1 comment (reworded to the canonical-file receipt); the `domain/template.ts` aggregate comment "Well-formedness VALIDATION is deferred: … the format validator is chapter-8 work" (a LIVE debt-status source comment — reworded to the realized receipt: validation lives in `src/definition/` since ch8-P1, the canonical file since ch8-P2; comment-only edit; the arm-gate-1 catch — the authoring sweep's grep was `head`-truncated and this hit fell off, re-measured untruncated); `templates.ts`'s comment dies with its file. Historical narrative (the ch4 sections describing what the skeleton built) stays untouched — flips are status receipts, never history rewrites. A close-time grep proves no debt-STATING survivor — the grep's discriminator, stated: debt-STATING = status text asserting MD-1 is open/standing or the validator future (the seven sweep targets above — six flips + one comment dying with its deleted file — are its full re-measured set); every OTHER `MD-1` mention is history or spec and STAYS, each dispositioned in the build-record sweep transcript: in the plan — the §1.3 chapter-map cell ("migrates MD-1"), the ch4 narrative (§4.1, the definition block, the §4.8 packet row, §4.9's deliverables list), §8's own spec text; beyond the plan — the ADR dated decision records (ADR-005's MD-1 context, ADR-009's production-copy consequence), the test-comment precedent labels (`kernel.test.ts:17`, `floor.test.ts:27`), the prior packets (ch4-P3/P4, ch6-P4a), and the process docs (task-packet-template §2, autonomy-realignment) (anchored: prose:plan §8.6, contract:ch8-template-format#C32) |
| M6 | The C16-named pointer retirement: the `kernel/start.ts` comment "reachability-aware refinement is ch-8 territory" retires (reworded: the format layer fixes declared==used strictly per C16; reachability-aware relaxation stays deferred-additive) — a COMMENT-ONLY edit, the §8.5 pointer-hygiene precedent (anchored: contract:ch8-template-format#C16) |
| M7 | The drift-pin retarget record: the old pin (`builtinTemplate()` ↔ `fixtureTemplate()`, `templates.test.ts`) retires WITH the copy it guards; the new pin (M3) is the only duplication guard that remains. DERIVATION: C32 retires the builtin and keeps the fixture pinned to the canonical file — after retirement exactly ONE duplication exists (fixture ↔ file), and M3's test is its guard; keeping the old pin would pin a deleted symbol. Proof parity per the Sizing/risk annex (derived: contract:ch8-template-format#C32) |

## Canonical journey matrix (J)

| Id | Rule |
|---|---|
| J1 | The repo's first FULL-LIFECYCLE JOURNEY SMOKE runs through the SHIPPED CLI processes (the root tsx bridge, subprocess — the last-mile-smoke culture): the REPO's canonical file (`v3/templates/local-pair-v0@1.yaml`) as the operator-authored input → `start --templates-dir <repo templates dir> --task <text>` (the pinned default ref) → operator `submit` events driving implement →(PASS)→ review →(CONVERGED)→ done → terminal VERIFIED via `detail` (status `DONE`, `currentStep` terminal — `detail` is a shipped ch6 floor verb carrying the terminal assert; the ratified row's NAMED floor reads, `tail`/`timeline`, are both driven below) → floor reads: `timeline` returns the full committed row sequence AND `tail --from 0` streams the same rows as NDJSON and completes on terminal — every stage exit 0, every document parsed as JSON, the timeline and tail row sets consistent with each other (user-ratified 2026-07-11: the activation packet carries the e2e journey — before P2 the "end" of end-to-end, an operator-authored input artifact, does not exist) (anchored: prose:plan §8.9 P2 row) |
| J2 | The journey consumes the SHIPPED configuration surface ONLY: real entrypoint processes (`cli/main.ts` via the tsx bridge), a real store file in a temp dir, the repo templates directory via the shipped flag — zero test-side seams (no injected deps, no scripted clocks/sinks) anywhere inside the lane. DERIVATION: the ratified row's words "through the shipped CLI process" — an in-process `runCli` harness would test the dispatch shell, not the shipped process (derived: prose:plan §8.9 P2 row) |

## Site × shape × phase grid (template §2 write-time discipline)

Trigger: the activation seam is PHASED — config gate → start-side
pre-load → in-handle load (submit/inject) — and the same typed failure
surfaces differently per phase (W-lane). The grid covers THIS packet's
own awaited/failure sites; the P1 pipeline's internal grid stands in
P1 and is not restated.

| Site | Phase | Failure shape | Surfacing + field provenance | Driven by / ruled out |
|---|---|---|---|---|
| templates-dir resolution (flag/env) | config | missing/empty value | usage 2 `MissingTemplatesDir` — message fixed, no dynamic fields | DRIVEN: A1 lanes |
| eager listability probe on the configured dir | config | OS errno (ENOENT / ENOTDIR / EACCES) | usage 2 `InvalidTemplatesDir` — path + cause from the caught errno (already in hand; no new fallible work) | DRIVEN: A2 lanes (three forms) |
| `store.load(ref)` at start PRE-load | pre-load | resolves `null` (no byte-exact listing match) | notFound 3 `UnknownTemplate` (message carries the requested ref — operator input) | DRIVEN: W1 absent-at-start lane |
| `store.load(ref)` at start PRE-load | pre-load | rejects `TemplateLoadError` | internal 1 `TemplateInvalid`, details = the error's own `{stage, findings}` (verbatim, W2) | DRIVEN: W-lane at `start` |
| the kernel's OWN load inside `startInstance` (same invocation, second load) | in-kernel | null / rejection (a mid-invocation file mutation) | the SAME type-based catch maps `TemplateLoadError` → `TemplateInvalid`; a null yields start's own not-found `Error` → catch-all internal 1 | RULED OUT as a separately drivable lane: the real file store cannot be deterministically interleaved mid-invocation from the test seam; coverage is STRUCTURAL — the type-based catch is site-shared with the driven pre-load lane (the ch7-P4 M5 build-guard argument), stated in W4 |
| `definitions.load` inside `kernel.handle` (via the `ingress.submit` await) | in-handle | rejects `TemplateLoadError` | per-verb catch at the await → internal 1 `TemplateInvalid` (W2's details) | DRIVEN: W-lane at `submit` AND at dev `inject` (two verbs, two lanes) |
| `definitions.load` inside `kernel.handle` | in-handle | resolves `null` (file deleted post-start) | the kernel integrity `Error` ("kernel integrity: pinned template … not found" — measured message) → catch-all internal 1 with the error's own name, NOT `TemplateInvalid` | DRIVEN: W3 lane at `submit` (inject shares the same site and catch — the shared-dispatch argument; one driven lane) |
| `validate`: OS read of the positional | input gate (pre-pipeline) | missing positional / OS-unreadable path | usage 2 (D2's class; path in the message — operator input) | DRIVEN: D2 lanes |
| `validate`: the P1 pipeline over the bytes | pipeline | any stage failure | exit 1 `TemplateInvalid`, details `{stage, findings}` | DRIVEN: D4 — one representative per stage class (read-decode / parse / resolve / validate); the intra-stage inventory is P1's driven surface (narrowed reuse, stated in D4) |

## Mirrored surface map (one canonical statement per rule)

The draft's C-rows are cross-artifact canonical ancestors — each
packet row names its C-row in its anchor. The map tracks the
PACKET-internal mirrors.

| Rule | Canonical | Mirrors |
|---|---|---|
| the four-exit disposition set (0/3/1/2; invalid≠absent visible) | W1 | Claim 2 · dimension 3 · the grid's start/handle DISPOSITION rows (the in-handle null row is W3's) · J1's exit-0 legs · draft C38 (cross-artifact) |
| templates-dir resolution + eager listability | A1/A2 | Claim 3 · dimension 1 · the grid's config rows · draft C29 (cross-artifact) |
| verb binding (bound: start/submit/inject; unbound: the rest) | A3 | dimension 1's rejection legs · M4's outside-the-lane clause · D1's no-flags clause · draft C29/C37/C31 (cross-artifact) |
| the breaking sweep (zero-config dies; every call site) | A4 | Claim 2's no-fallback clause · the embedding-gates sweep list · draft C29 (cross-artifact) |
| the `{stage, findings}` doc surfacing (name `TemplateInvalid`) | W2 | Claim 4's exit-1 clause · D4 (the validate face defers to the same shape) · the grid's finding-form cells · P1 E5 + draft C31/C38 (cross-artifact) |
| per-verb catch sites (pre-load vs the `ingress.submit` await) | W4 | dimension 3's per-verb clause · the grid's in-handle rows · draft watchpoint 4 (cross-artifact, non-normative) |
| the pinned-ref flag (grammar + default) | T1/T2 | dimension 2 · in-context note 5 · draft C30 + C8 (cross-artifact) |
| single source + the equality pin | M1/M3 | Claim 1 · dimension 5 · the operative material's pin sentence · draft C32 (cross-artifact) |
| the MD-1 status sweep (receipts, never rewrites) | M5 | Claim 6 · dimension 7 · in-context note 6 · plan §8.6 (cross-artifact) |
| the journey's shipped-surface character | J2 | Claim 5's no-seams clause · in-context note 4 · plan §8.9 P2 row (cross-artifact) |
| the journey lifecycle stage sequence (file → start → events → terminal → floor reads) | J1 | Claim 5 · dimension 8 · the acceptance `journey.test.ts` bullet · plan §8.9 P2 row (cross-artifact) |
| absent-at-handle → kernel integrity, NOT `TemplateInvalid` | W3 | dimension 3's handle clause · the grid's in-handle null row · the acceptance W3 bullet · draft C38's final clause (cross-artifact) |

## In-context notes (the scarce budget)

1. **One resolution, one store instance:** `start` resolves the
   templates dir once, constructs ONE `createFileDefinitionStore`,
   pre-loads for the override parse, and passes the SAME instance
   into the kernel — a second construction could drift the two loads'
   dispositions apart.
2. **The catch is type-based, not site-based:** map
   `error instanceof TemplateLoadError` → the W2 doc wherever it can
   surface in the verb body (start: pre-load AND the kernel call;
   submit/inject: the `ingress.submit` await). Do NOT narrow the
   catch to the pre-load site — the grid's ruled-out race lane rests
   on the type-based coverage.
3. **`validate` reads raw bytes:** `fs.readFile` with NO encoding —
   `readJsonFile`'s utf8+JSON idiom is the exit-2 CLASS precedent
   only, never the implementation (a lossy utf8 decode would make the
   pipeline's strict-decode lane unreachable).
4. **The journey drives the REPO's file:** point `--templates-dir` at
   `v3/templates` itself — do not copy the canonical file into a temp
   dir (the operator-authored artifact IS the repo file; a copy step
   would smuggle a staging channel into its provenance). Only the DB
   lives in a temp dir.
5. **Version-half grammar BEFORE `Number()`:** test
   `^[1-9][0-9]*$` on the raw string first (the P4a lexical-first
   precedent) — `Number()` alone coerces `0x10`/`1e2`/`01` and would
   silently canonicalize distinct source forms onto one filename.
6. **Sweep discipline:** the MD-1 flips are dated STATUS receipts
   ("retired at ch8-P2, 2026-07-11"), never history rewrites — the
   ch4 narrative text describing the fixture-form skeleton stays
   byte-identical.
7. **EACCES staging guard:** the unreadable-dir (A2) and
   unreadable-file (D2) forms stage via `chmod 0o000` and are SKIPPED
   when the process bypasses permission checks (uid 0 — root CI);
   the ENOENT/ENOTDIR forms carry the eager-exit-2 property portably
   and always run. The lane stays declared; the guard handles the one
   environment where it is unstageable.

## Embedding gates (v1-inherited)

- **New:** `v3/templates/local-pair-v0@1.yaml` (M1 — the directory is
  new too); `v3/src/cli/journey.test.ts` (J1/J2);
  `v3/src/testkit/templateFixture.test.ts` (M3 — the pin).
- **Edited:** `v3/src/cli/main.ts` (start/submit wiring onto the file
  store, T2's parse, W-lane catches, `templates-dir` in
  `VERB_OPTIONS` for start/submit); `v3/src/cli/common.ts` (A1/A2 —
  the resolution + eager-listability helper beside `resolveDbPath`);
  `v3/src/cli/dev/main.ts` (the `validate` verb, inject's wiring +
  catch, replay's repoint to the testkit fixture, `templates-dir` in
  inject's options); `v3/src/cli/cli.test.ts` +
  `v3/src/cli/dev/dev.test.ts` (the A4 sweep + the new lanes);
  `v3/src/testkit/templateFixture.ts` (comment flip only — M5);
  `v3/src/domain/template.ts` (comment flip only — M5's
  validator-deferred receipt, the arm-gate-1 catch);
  `v3/src/kernel/start.ts` (comment-only — M6);
  `docs/v3/implementation/plan.md` (M5's status receipts).
- **Deleted:** `v3/src/cli/templates.ts`,
  `v3/src/cli/templates.test.ts` (M2).
- **Untouched, explicitly:** `v3/src/definition/**` (consumed via its
  P1 public surface — zero changes); kernel BEHAVIOR (start.ts is
  comment-only; kernel.ts untouched); domain BEHAVIOR (`template.ts`
  is a comment-only M5 receipt; every type byte-identical); `store/`,
  `ingress/`, `floor/`,
  `diag/`, `emit/`, `ports/`, the eslint config (no new
  boundary — `cli/` already carries its stance; dev may import
  testkit per ADR-009), BOTH `package.json`s + the lockfile (no new
  bridge, no new dependency), the contract-draft file (its `realized`
  flip is chapter-close work).
- **Sweeps (measured 2026-07-11, current tree):**
  `grep -rn "builtinTemplate\|builtinDefinitionStore" v3/src` →
  `cli/templates.ts`, `cli/templates.test.ts`, `cli/main.ts`,
  `cli/dev/main.ts` ONLY (the retirement's full blast radius);
  `ls v3/templates` → does not exist (created here);
  `grep -rn "v3:cli"` across the repo → the two root `package.json`
  script lines are the only RUNNABLE surface; every other hit
  (plan.md, packet docs) is a bridge-identity reference, not an
  invocation example — nothing to sweep;
  ingress.ts carries NO catch (W4's await-surfacing claim);
  the kernel's absent messages: start-side `start failed: template
  '<id>@<version>' not found`, handle-side `kernel integrity: pinned
  template '<id>@<version>' not found` (W3's assert target);
  `LifecycleStatus` terminal literal `DONE` (J1's assert target);
  `testkit/index.ts` exports `fixtureTemplate` +
  `fixtureDefinitionStore` (M4's import surface).
- **Type-ripple targets:** `templates.test.ts` dies with its module
  (its imports go with it); no other file imports
  `cli/templates.js` (measured above); no exported type changes
  anywhere — zero ripple outside the deleted pair.

```json
{
  "mutation_boundary": {
    "files": [
      "v3/templates/local-pair-v0@1.yaml",
      "v3/src/cli/main.ts",
      "v3/src/cli/common.ts",
      "v3/src/cli/templates.ts",
      "v3/src/cli/templates.test.ts",
      "v3/src/cli/cli.test.ts",
      "v3/src/cli/journey.test.ts",
      "v3/src/cli/dev/main.ts",
      "v3/src/cli/dev/dev.test.ts",
      "v3/src/testkit/templateFixture.ts",
      "v3/src/testkit/templateFixture.test.ts",
      "v3/src/domain/template.ts",
      "v3/src/kernel/start.ts",
      "docs/v3/implementation/plan.md"
    ]
  }
}
```

## Row manifest (the D1 classification's machine face)

```json
{
  "packet_rows": {
    "rows": [
      { "id": "A1", "class": "anchored", "refs": ["contract:ch8-template-format#C29"] },
      { "id": "A2", "class": "anchored", "refs": ["contract:ch8-template-format#C29"] },
      { "id": "A3", "class": "anchored", "refs": ["contract:ch8-template-format#C29", "contract:ch8-template-format#C37", "contract:ch8-template-format#C31"] },
      { "id": "A4", "class": "anchored", "refs": ["contract:ch8-template-format#C29"] },
      { "id": "T1", "class": "anchored", "refs": ["contract:ch8-template-format#C30"] },
      { "id": "T2", "class": "derived", "refs": ["contract:ch8-template-format#C30", "contract:ch8-template-format#C8", "prose:packet ch6-P4a parse-contract matrix"] },
      { "id": "W1", "class": "anchored", "refs": ["contract:ch8-template-format#C38"] },
      { "id": "W2", "class": "anchored", "refs": ["contract:ch8-template-format#C38", "contract:ch8-template-format#C31"] },
      { "id": "W3", "class": "anchored", "refs": ["contract:ch8-template-format#C38"] },
      { "id": "W4", "class": "derived", "refs": ["contract:ch8-template-format#C38", "prose:ch8 draft packet-time watchpoint 4"] },
      { "id": "D1", "class": "anchored", "refs": ["contract:ch8-template-format#C31"] },
      { "id": "D2", "class": "anchored", "refs": ["contract:ch8-template-format#C31"] },
      { "id": "D3", "class": "anchored", "refs": ["contract:ch8-template-format#C31"] },
      { "id": "D4", "class": "anchored", "refs": ["contract:ch8-template-format#C31"] },
      { "id": "D5", "class": "anchored", "refs": ["contract:ch8-template-format#C31"] },
      { "id": "M1", "class": "anchored", "refs": ["contract:ch8-template-format#C32"] },
      { "id": "M2", "class": "anchored", "refs": ["contract:ch8-template-format#C32"] },
      { "id": "M3", "class": "anchored", "refs": ["contract:ch8-template-format#C32"] },
      { "id": "M4", "class": "anchored", "refs": ["contract:ch8-template-format#C37"] },
      { "id": "M5", "class": "anchored", "refs": ["prose:plan §8.6", "contract:ch8-template-format#C32"] },
      { "id": "M6", "class": "anchored", "refs": ["contract:ch8-template-format#C16"] },
      { "id": "M7", "class": "derived", "refs": ["contract:ch8-template-format#C32"] },
      { "id": "J1", "class": "anchored", "refs": ["prose:plan §8.9 P2 row (ratified 2026-07-11)"] },
      { "id": "J2", "class": "derived", "refs": ["prose:plan §8.9 P2 row (ratified 2026-07-11)"] }
    ]
  }
}
```

## Pre-approval flags

None — flag-free by measurement: zero new-decision manifest rows,
zero `declined` or `approve-ratified` routes, no contract-reality
issue open. The journey lane's two standing-rule candidates (the
activation-journey rule; the dogfooding checkpoint) were logged as
boundary-review candidates in the process log at ratification
(2026-07-11) — they are the CHAPTER's material, not this packet's
flags. R-RAW-FIXTURES is satisfied by construction: every hostile
template is staged as raw YAML text (temp-dir files) and the
canonical file is raw bytes in-repo — no serializer-built fixture is
planned.

## Acceptance

- Dimensions 1–8 test-driven; every declared lane driven by name:
  - **`cli.test.ts` (+ the A4 sweep):** A1 precedence/env/missing
    lanes; A2's three unlistable forms (eager — asserted BEFORE any
    kernel effect: no store write, no diag file; the EACCES form
    root-guarded per note 7); A3's rejection legs
    (representative unbound verbs); T2's grammar ladder (positives
    incl. the `9007199254740991` boundary + the source-form negatives
    + the `9007199254740993` safe-integer belt negative, hostile refs
    as raw flag strings); W1's four dispositions at `start`; the
    W-lane `TemplateInvalid` at `start` and `submit` (staged invalid
    file in a temp templates dir — raw YAML text, R-RAW-FIXTURES);
    W2's details keyset (`{stage, findings}` exact); W3's
    absent-at-handle lane (start, delete the file, submit →
    internal 1, asserted on the integrity MESSAGE — `kernel
    integrity: pinned template … not found`; the doc `name` is
    literally `Error`, the catch-all maps `error.name`); the
    in-handle W-lanes ride through `kernel.handle`'s existing
    `internal_failure` diag emission — no no-diag assert belongs on
    them (the no-diag assert is A2's, pre-kernel); every swept
    existing lane stays green.
  - **`dev/dev.test.ts`:** the `inject` W-lane (`TemplateInvalid` at
    the in-handle load) + inject's A-lane binding; D1's flag
    rejections; D2's input-gate lanes; D3's exact success keyset;
    D4's four stage-class surfacings (`details.stage` = read / parse
    / resolve / validate — one raw-text fixture per class); D5 via
    the shared error-contract asserts; M4's replay lanes green on the
    fixture source + replay's strict rejection of `--templates-dir`.
  - **`testkit/templateFixture.test.ts`:** M3's pin — canonical bytes
    → `loadTemplate` → deep-equal `fixtureTemplate()`.
  - **`journey.test.ts`:** J1/J2 — the full lifecycle through the
    shipped processes (subprocess, the root tsx bridge), every stage
    exit 0, terminal `DONE`, timeline/tail row-set consistency; the
    subprocess legs under the last-mile 30s timeout precedent.
  - Estimated ~30 new tests at `it` granularity plus the swept
    existing suites (the estimate is not a commitment — the P1/P4
    lesson: parametrized ladders expand).
- **Close sweeps (grep, transcripts in the build record):** zero
  `builtinTemplate`/`builtinDefinitionStore` references; zero
  debt-STATING MD-1 surfaces outside historical narrative (M5's
  measured list flipped); zero `cli/templates` importers; the C16
  pointer comment gone from `kernel/start.ts`.
- **Bridges green at close:** `v3:typecheck`, `v3:lint`, `v3:test`
  (534 baseline + the new lanes), `v3:coverage` validation (ownership
  axes unchanged — the empty slice), `v3:packet-lint`
  (`--forbid-reopened`), `v3:adr-check` (no new trigger: no new
  dependency, no module-map change — ADR-011/ADR-012 already
  accepted).
- Drift tests green (standing, unconditional — PI-3; no new units,
  the mapping table untouched).
- Post-build: `check_packet.py --post-build <sha> --packet <path>`
  and `check_coverage.py` default mode (README §4 step 8).
- Standing review rules in force: **REV-E-NO-ADAPTER-BRANCH** (the
  file store arrives through the `DefinitionStore` port; no adapter
  branching anywhere); **REV-B-LOCAL-NOT-AUTHORITY** (the store lists
  fresh per load — P1's S1; the CLI constructs it per invocation, no
  cache is authority); **REV-C-PROJECTIONS-READONLY** (the journey's
  floor reads are read-only projections); **REV-A1-TXN** — n/a (no
  kernel/store write-path change); **REV-DIAG-FAILOPEN** — in force
  unchanged (the diag wiring is untouched; the existing M11
  byte-identical-under-corrupt-diag lanes stay green through the
  sweep).

## Build record

**Approved 2026-07-11 — the FIRST autonomous flag-free approve** (the
README §5.5 matrix's ch8 row, first live use): zero new-decision rows,
zero routed flags, every approve-time tier-0 gate green, clean close.
The hash chronicle: R1 FULL (five Opus lenses) bound `bd857937…` —
verdict refine (ONE content finding: the T2 safe-integer belt negative
was stated but undriven — lens 3; plus measurement/wording/mirror
bookkeeping from lenses 1/4/5); the fold produced `3cd1a502…`; R2
TARGETED (lenses 3+4, lenses 1/2/5 proven-unaffected) ran clean; a
three-item bookkeeping fold produced `8d9e16e8…` and the first CLOSE
ran CLEAN on it. **Arm gate 1** (agent-invoked `codex exec`; the first
invocation was killed mid-run and retried to completion): verdict
`refine` citing `8d9e16e8…` — ONE fold-now catch, the
`domain/template.ts` LIVE debt-status comment the M5 sweep had missed
(the detector-miss entry below). The content fold + a lens-4
reconciliation (one propagation hit, fixed) produced the final
`2b4f63f5…`; the second CLOSE ran CLEAN and the arm's re-check
returned **approve citing `2b4f63f5…`** (original finding resolved,
zero new findings — the leg ended under the diminishing-returns
cutoff). All internal passes Opus-class, fresh-context.

Built the same day. **534 → 547 tests (+15 new − 2 retired with
`templates.test.ts`):** the A/T/W lanes + the arm-fold's seventh sweep
target in `cli.test.ts` (+7), the D lanes + the inject W-lane + the
replay flag-rejection in `dev/dev.test.ts` (+6), the equality pin
(+1), the journey smoke (+1). ONE build round. Every MIGRATED lane and
every new product lane ran green on first execution — the P1 module's
contract transferred to the CLI without a single reclassification;
the builtin retirement broke exactly the measured blast radius. The
only red during the build was TEST-side: the journey's timeline
expectation assumed ≥3 rows — the model truth is 2 (START commits the
instance, NOT a transcript row; the transcript is the submitted-event
log) — fixed in-session pre-commit, zero product-code impact.
Mechanical residue: one missing `readFileSync` import in
`dev.test.ts`; one staging cleanup in the A2 lane.

Close sweeps (run 2026-07-11, transcripts in-session): zero
`builtinTemplate`/`builtinDefinitionStore` references; zero
`cli/templates` importers; the C16 pointer gone from
`kernel/start.ts`; the repo-wide `MD-1` grep (UNTRUNCATED — the
detector-miss lesson) returns only the retirement receipts
(`templateFixture.ts`, `domain/template.ts`, the pin test) and the
dispositioned history class (the `kernel.test.ts:17` /
`floor.test.ts:27` precedent labels; ADR-005/ADR-009 dated records;
prior packets; process docs). Bridges green at close: `v3:typecheck`,
`v3:lint`, `v3:test` (547), `v3:coverage` validation (ownership axes
unchanged — the empty slice held: units 5/158, invariants 8/116,
traces 2/20), `v3:packet-lint --forbid-reopened`, `v3:adr-check`
(13 ADRs; no new trigger). Drift suite green (9/9).

**Aftermath (2026-07-11, arm gate 2 — the build-close implementation
review; verdict `refine` on the build sha `c9c2f011`, three substance
groups; folded same day in ONE `fix(v3)` round, every file inside the
declared boundary):**
(1) **The D1 defect (the product catch):** `validate` silently
accepted extra positionals — `validate <path> extra` exited 0 against
D1's "exactly one file". Fix: `positionals.length > 1` → usage 2
(`InvalidArguments`); driven by the new extra-positional negative.
(2) **The M5 receipts were ANNOTATIONS, not flips:** the plan edits
had kept the open-status verbs and appended the receipt ("MD-1 stays
open … — retired", "MD-1 stands — retired") — self-contradictory
prose a cold reader trips on. Re-worded to true past-tense receipts
("stayed open by design (ch-8 debt; retired at ch8-P2)", "stood until
ch8-P2 — retired", "ch 8 retired both"). The flip's meaning sharpened
for the convention: a status flip changes the STATEMENT's tense, it
never leaves the open-status assertion standing beside its own
receipt.
(3) **Four lanes were mutation-insensitive** (present but unable to
fail on a violation): W2/D4's `{stage, findings}` asserts checked the
keyset, not the CONTENT — now deep-equal the pipeline's OWN result on
the same bytes (the verbatim proof, at start, submit, and all four
validate stage lanes); T2's last-`@` split had no id-containing-`@`
positive (an `indexOf` regression would have passed) — `a@b@1` added;
A1's "missing/empty" had only the missing half driven — the empty
flag and empty env forms added; J1's floor-read agreement compared
projected fields (`seq`/`opId`) — now full-row deep equality.
Bridges re-verified green at the aftermath close: 547 tests (the
strengthening lands inside existing `it` bodies), typecheck, lint,
coverage validation, packet-lint, adr-check; the delta-scoped
reconciliation pass ran before the aftermath commit (the ch7-P4
round-1 skip lesson).

```json
{
  "packet_metrics": {
    "class": "operability",
    "prediction": {
      "predicted": "projection",
      "reasoning": "recorded at the ch8 ratification: the ratified draft rows + the P1 packet contract + the ch4/ch6 template copies pre-decide the surface",
      "discovered": "projection"
    },
    "provenance": { "anchored": 20, "derived": 4, "new_decision": 0 },
    "rounds": { "review": 2, "doc_refinement": 0, "implementation": 2 },
    "stops": [],
    "detector_misses": [
      {
        "found_at": "code-review",
        "what": "the arm's build-close review caught: validate accepting extra positionals against D1's 'exactly one'; the M5 plan receipts ANNOTATING the open-status text instead of flipping its tense; and four driven lanes unable to FAIL on a violation (keyset-only {stage,findings} asserts, no last-@ positive, no empty-config forms, projected-field journey equality)",
        "why_missed": "the panel and the closes verified lane PRESENCE, not lane SENSITIVITY — a test that exercises a row without being able to fail on its violation satisfies every 'driven' check; and the receipt edits were judged by their INTENT in the diff, not by reading the resulting sentence cold ('MD-1 stands — retired' contradicts itself only to a cold reader). The arm read the built artifacts cold"
      },
      {
        "found_at": "approve",
        "what": "the M5 sweep's 'every surface stating the debt' list omitted the LIVE domain/template.ts debt-status comment ('the format validator is chapter-8 work'), while the mutation boundary excluded the file — the build would have left a stale debt surface or escaped the boundary",
        "why_missed": "the authoring-time MD-1 sweep piped its grep through 'head -20' and the template.ts hit was the line that fell off — a completeness claim rode on a TRUNCATED measurement; five Opus lenses and one close accepted the measured list without re-running the measurement. The finding policy's rule ('enumeration from memory is not a measurement') has a sibling this miss names: a truncated measurement is not a measurement. Caught by arm gate 1 PRE-build — zero code impact"
      }
    ],
    "learned": "the first autonomous flag-free packet: arm gate 1 caught a truncated-measurement detector miss the whole internal panel accepted; the build ran first-execution green on every PRESENT lane — and arm gate 2 then showed presence is not SENSITIVITY (a lane that cannot fail on its row's violation satisfies every 'driven' check); a built foundation's contract (P1 B4/E5) transfers to its activation without reclassification",
    "baseline_note": "rounds.review = 2 counted panel rounds (R1 full, R2 targeted); the closes, the lens-4 reconciliation passes, and the arm's find + hash-citing re-check legs are chronicled above and do not count. implementation = 2: the build round (test-side journey-expectation fix + two mechanical imports; zero product-code reds) + the arm-gate-2 aftermath round (the D1 extra-positional fix + the receipt tense flips + the four lane strengthenings — test count unchanged at 547, the strengthening lands inside existing it bodies). 534 -> 547 at the build commit: +15 new tests, -2 retired with the deleted templates.test.ts. The arm's FIRST gate-1 invocation was killed mid-run (no verdict); the retry completed — recorded for the transitional-arm reliability picture. detector_misses.found_at values per the ch8-P1 precedent: 'approve' = the pre-build arm gate 1; 'code-review' = the build-close arm gate 2 (the arm IS that lane post-build)"
  }
}
```
