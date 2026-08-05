# P3 build — phase-close report

The second arc of phase P3 (the ch13 re-derivation plan §3): the
declared-schema substrate authorized by ADR-019, built, parity-gated,
switched, tested and arm-verified. This report is the STOP 2 artifact.

## Trajectory (every number derived at write time)

- **Build day 2** — the arc's first commit is `3466d241`, 2026-08-05;
  this report is written 2026-08-06.
- **Arm rounds 3** — `ls ch13-rederivation-arm/p3-build/arm-*-out.txt`
  returns 3. Findings by round: **6 · 6 · 0**, all in scope, all folded,
  zero carried.
- **Size**, at `HEAD`: substrate 2396 raw / 1743 code-only
  (vocabulary 384 · engine 1183 · declaration 545 · normalizer 140 ·
  surface 144), plus `admit.ts` 68 and `load.ts` 268. The hand-written
  code it replaced was 1366 raw / 965 code-only at `7b6bfbba`, the commit
  before the build. **Ratio 1.75× raw, 1.81× code-only.**
- **Suite 1919 / 1919**, 72 files; `v3:typecheck` and `v3:lint` clean.

## What was built

`v3/src/definition/schema/` — five modules with one job each:

| Module | What it is |
|---|---|
| `vocabulary.ts` | ADR-019 §2.2's admitted constructs, as TYPES. No logic. |
| `templateFormat.ts` | D4's canonical home: the template surface's declaration, frozen DATA, every node carrying its `tag` and the ratified rows it realizes. |
| `engine.ts` | The validator over declaration data — one computation for both channels. |
| `normalizer.ts` | D3's second, separately-named capability: derivation. |
| `templateSurface.ts` | The composition, plus the audited residual, wired into one finding stream. |

`definition/validate.ts` (898 lines) is deleted. `definition/admit.ts`
went from 468 lines of rules to 68 lines of two entry points and the A6
brand mint. `definition/load.ts` calls the surface once.

## The parity gate (ADR-019 D5) — the load-bearing result

Full record: `v3/implementation/p3-parity-gate.md`.

**Both PRE-NAMED delta classes came back EMPTY.** Across 105 divergence
records over 1830 executed cases: for every finding path both
implementations emit, `{path, message, code}` is identical. Zero path
deltas. Zero message deltas. The audit's §5 F3 called path grain "the
parity gate's highest-yield target"; the `at:` / `keyLaneAt:` /
`laneOrder:` attributes it recommended are why it yielded nothing.

The deltas that did exist were ratified before the switch:

- **Class A, channel symmetry** — structural rules now run on the
  direct-construction channel too. This is D1's own text realized, and
  the mechanism the audit's F2 predicted would dissolve ch13-C7's entry
  belt. It cost four repaired fixtures, three of which wanted an
  admitted-but-inconsistent template and now drift one deliberately
  instead of relying on admission's blindness.
- **Class B, lane order** — same finding set, walk and admission
  interleaved. No case affected.
- **Class C, the `(b′)` collision — WITHDRAWN.** I reported that an
  empty `steps` map could not both fire the round-membership lane and
  suppress the `start` lane once the split dissolved, and the ruling
  authorized amending the disposition. Re-reading ch11-P4's F7 showed the
  premise was mine, not the direction's: ch8-C21's suppression binds
  MISSING or WRONG-KIND containers only, and an empty map is a valid map
  of its kind. Removing one wrongly-declared `gating` attribute restored
  `(b′)` exactly. No amendment was made.

**One measurement refinement, recorded because it changes what a future
gate should replay:** D5's 362-case corpus reproduces exactly, but it
UNDER-MEASURES this surface — `admitTemplate` is the direct channel's
entry and is called from the testkit, kernel, lifecycle and trace suites,
not only the seven named files. Two thirds of the affected cases live
outside the corpus.

## The arm frame

Its own three-round frame; the audit arc's rounds did not carry over.

**Round 1 — 6 in-scope, 0 carried, 1 unrun.** Verdict: the central claim
does NOT survive. It was right. The declaration carried a whole SUBSTRATE
block — strict UTF-8, the YAML version, duplicate keys, warning
promotion, alias resolution, the stage list, the path grammar — and the
runtime read exactly one field of it. Everything else was decoration
wearing an authority's costume: the precise false-green this direction
exists to end, committed by the build that ends it. Folded by making the
substrate carry only what is CONSUMED (`load.ts` now reads the decode
wording, the directive version and message, the duplicate-key wording and
the internal-failure belt) or ASSERTED (`codes`, now checked against
every issue code the declaration assigns). Four further attributes with
no reader were deleted; `valueRaw` was implemented, used five times, and
missing from the vocabulary's own "closed placeholder set".

**Round 2 — 6 in-scope, 0 carried, 0 unrun.** Corrections 2–5 landed;
1 and 6 did not. One real contradiction (`nonempty.gating`'s doc stated
the opposite of what the `steps` declaration does after the `(b′)`
correction), three more declared-but-unread fields, and two defects of my
own in prose: numbers stamped "at HEAD" and a replay recipe ending in a
placeholder pointing at a tool that was never shipped.

**Round 3 — 0 / 0 / 0.** All six landed. The claim was tested rather than
re-read: a template value and its YAML equivalent, admitted and loaded,
producing the same admitted result and the same path and message for a
planted defect; the declared source-form asymmetry behaving as declared;
both residual rules firing exactly once.

**The round shape, stated plainly: 6 · 6 · 0.** It did not fall
monotonically. Round 2 matching round 1 is the honest number, and the
class shifted — round 1 found one whole decorative block, round 2 found
three prose defects and three single-valued fields.

## What stayed prose or code, and why

- **R3** the existential cross-rule over resolved registrations
  (ch11-C19 → ch12-C5): a conditional over a DERIVED property of an
  injected object; a `when:` general enough to express it is an
  expression language.
- **R7** the uses-scoped source ladder on two gate-config integers
  (ch11-C12's source half) — **R7's first live member**. Its declaration
  exists (`[vc-authored-int]`), but realizing it in the engine needs the
  `delegate` hand-off to carry the CHANNEL into the registration, which
  changes the ratified `GateRegistration` port shape. Refusing a
  construct that would serve one row is D7's test applied honestly, and
  R7 was kept open at the ratification for exactly this.
- **The three delegated gate-config schemas** stay as built. Not a
  judgement call: ch11-P2a G1 is lint-enforced and permits `gates/` to
  value-import `domain/` and `ports/` only. Under D2 and D6 that is a
  separate per-surface act. This is a reduction against the kickoff's
  letter and was ruled on at STOP 1.

## The ADR's own tripwires, checked

- **D9.1** (a single-use construct admitted to make one row fit) — did
  not fire. The one candidate (a source lane scoped by a sibling's value)
  was REFUSED, and its row went to R7.
- **D9.2** (the engine acquires a per-rule branch) — did not fire. Where
  measured lanes disagreed on a grain, the disagreement was DECLARED
  (`at:`, `laneOrder:`, `gating:`, `channel:`) rather than branched.
  Round 1's Lens B hunted this specifically and found none.
- **D9.3** (the residual grows past the seven audited families) — did not
  fire. R7 gained its first member; no family was created.
- **Plan §6 proportionality** — **FIRED**, at 1.85× when first measured.
  Now 1.75× / 1.81× after two folds deleted data that was doing nothing.
  Ruled at STOP 1: re-measure at the P4/P5 boundary, where the engine's
  fixed cost either amortizes over a second surface or does not.

## Open, carried forward

1. **The proportionality re-measurement at the P4/P5 boundary** (the
   standing ruling).
2. **The declaration-as-data-through-the-port boundary candidate**
   (`9790b800`) — the route by which the gate-config schemas could join.
3. **A criterion question for the next guard-machinery loop.** Round 2
   reported fields whose single literal value no machine compares. Round
   3 was given a refinement — report such a field only if a DIFFERENT
   legal value would change nothing observable — and rejected zero
   candidates by it, because it found none. The refinement is therefore
   untested and is offered as a candidate rule, not a ratified one.

---

## DRAFT — the P3 process-log entry (for ratification, not yet appended)

```
- 2026-08-06 (ch13 re-derivation, P3 CLOSES — the schema substrate is
  live on the template surface) — THE PARITY GATE'S TWO PRE-NAMED DELTA
  CLASSES CAME BACK EMPTY, AND THE ARM'S FIRST ROUND CAUGHT THE BUILD
  COMMITTING THE EXACT DEFECT THE DIRECTION EXISTS TO END. THE PRODUCT:
  structural definition rules on the authored-template surface are DATA
  (`v3/src/definition/schema/templateFormat.ts`, ADR-019 D4's canonical
  home) consumed by ONE engine on BOTH channels; `definition/validate.ts`
  (898 lines) is deleted and `definition/admit.ts` fell from 468 lines of
  rules to 68 lines of two entry points and the A6 brand mint. THE
  MEASURED RESULT (D5, full record in `v3/implementation/p3-parity-gate.md`):
  105 divergence records over 1830 executed cases, and for EVERY finding
  path both implementations emit, `{path, message, code}` is identical —
  zero path deltas, zero message deltas. The audit's F3 had named path
  grain "the parity gate's highest-yield target"; the `at:`/`keyLaneAt:`/
  `laneOrder:` attributes it recommended are why it yielded nothing. The
  deltas that DID exist were ratified before the switch: channel symmetry
  (structural rules now run on the direct-construction channel — D1's own
  text, and the mechanism the audit's F2 predicted would dissolve
  ch13-C7's belt) and lane order. A third class I reported was WITHDRAWN
  at the switch: I claimed the `(b′)` disposition could not survive the
  split's dissolution and the ruling authorized amending it; re-reading
  ch11-P4's F7 showed the premise was mine — ch8-C21 suppresses on
  MISSING or WRONG-KIND containers only, and an empty map is a valid map
  of its kind — so deleting one wrongly-declared `gating` attribute
  restored it exactly and no amendment was made. THE ARM (its own
  three-round frame; the audit arc's rounds did not carry): 6 · 6 · 0,
  all in scope, all folded, zero carried. Round 1's verdict was that the
  central claim does NOT survive, and it was right: the declaration
  carried a whole SUBSTRATE block — strict UTF-8, the YAML version,
  duplicate keys, warning promotion, the stage list, the path grammar —
  of which the runtime read exactly ONE field. Decoration wearing an
  authority's costume, which is the false-green this whole line exists to
  end, committed by the build that ends it. The fold left only what is
  CONSUMED or ASSERTED and deleted four further attributes with no
  reader. Round 2 (6, of which two were my own defects in prose: numbers
  stamped "at HEAD", and a replay recipe ending in a placeholder pointing
  at a tool that was never shipped) did NOT shrink the count, which is
  recorded rather than smoothed; round 3 closed 0/0/0 having tested the
  claim rather than re-read it. THE EXPERIMENT LINE (§5), BOTH ARCS: 5
  arm rounds total (audit 2, build 3), 27 findings (10 · 5 · 6 · 6 · 0),
  ALL folded, ZERO carried, ZERO contract reopens, ZERO semantic
  paraphrases — the prose line's comparison numbers were 4 reopens,
  4+ panel rounds plus a watchdog reset, and 28·6·9·8. The honest
  qualifier: this arc produced CODE and a declaration, not ratified
  prose, so the paraphrase count is zero by FORM rather than by
  discipline — which is precisely the claim the direction makes, and it
  is the P4 contract that will test it on prose. WHAT THE STANDING RULES
  DID: the THREAT MODEL held the arm to accident and sloppiness and
  produced zero carried-scope in three rounds; the BOUNDED LOOP bound for
  the first time — the frame closed at its third round rather than
  running on; the PROPORTIONALITY TRIPWIRE FIRED, at 1.85x when first
  measured and 1.75x/1.81x after two folds deleted data that was doing
  nothing, and the user's ruling stands that it is re-measured at the
  P4/P5 boundary; the TRAJECTORY LINE caught a stale size number twice,
  once by me and once by the arm. SCOPE REDUCED AGAINST THE KICKOFF, and
  ruled: the three delegated gate-config schemas stay as built, because
  ch11-P2a G1 is lint-enforced and permits `gates/` to value-import
  `domain/` and `ports/` only — a repo guard decided it, not taste. R7
  gained its FIRST LIVE MEMBER (ch11-C12's uses-scoped source half), a
  construct serving one row REFUSED under D7 rather than admitted; D9's
  three tripwires all stayed unfired. CARRIED FORWARD: the
  proportionality re-measurement at P4/P5; the declaration-as-data-
  through-the-port boundary candidate (`9790b800`); and one UNTESTED
  candidate rule — that a declared field is only "unconsumed" if a
  DIFFERENT legal value would change nothing observable, offered because
  round 2 spent findings on single-valued fields the type system already
  enforces, and round 3 found none to apply it to.
```
