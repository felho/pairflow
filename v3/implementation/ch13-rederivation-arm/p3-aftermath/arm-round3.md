# QA review charter — round 3: the silent direction only

You are a fresh-context reviewer. You have full repo access. Read the
repo yourself; do not trust any summary in this charter over the bytes.

A declaration gate resolves the names and paths a configuration
declaration writes, and refuses one that does not resolve. A previous
round found eight cases it got wrong. Those eight split by DIRECTION, and
only one direction has been fixed:

- **fixed — the silent direction**: the gate reported a declaration as
  CLOSED while the rule it declared was inert at run time;
- **deliberately not fixed — the loud direction**: the gate refuses a
  declaration the engine would have handled correctly. Those are
  self-announcing at load, are recorded, and are out of scope here.

**This round examines the SILENT direction ONLY: can the gate still
report a declaration as closed while a rule it declares never runs?**

## 0. READ THIS FIRST — the time budget

**You have a HARD 20-minute wall-clock budget, enforced by an external
process kill. A session that hits it produces NO usable output — every
finding you have not yet written out is discarded.** An earlier session in
this repo spent its budget investigating, planned to write up at the end,
and was killed mid-write-up; all of its work was lost.

**Write each finding out IN FULL, in the §4 format, the moment you
confirm it.** Stop investigating around the 12-minute mark. Breadth at
shallow depth; anything costing over two minutes goes down as `unrun`
with one sentence on what would settle it.

## 1. The review object

| File | Lines | sha256 (first 16) |
|---|---|---|
| `v3/src/definition/schema/defineSurface.ts` | 632 | `dcf5d03bf8854ae5` |
| `v3/src/definition/schema/engine.test.ts` | 958 | `168da1a698c21f9c` |
| `v3/src/definition/schema/engine.ts` | 1117 | `b556c50cb729b39a` |
| `v3/src/definition/schema/vocabulary.ts` | 436 | `890f458676afffa7` |
| `v3/src/definition/schema/templateFormat.ts` | 574 | `69719e9fc9196e14` |

The round being answered is
`v3/implementation/ch13-rederivation-arm/p3-aftermath/arm-round2-out.txt`.
The fold is the commit whose subject begins `fix(v3): close the SILENT
four`. Both are worth reading before you start.

## 2. Scope — narrow on purpose

**What this round defends against: ACCIDENT and SLOPPINESS in ONE
direction — a declaration the gate accepts as closed whose rule is
nonetheless skipped at run time. Nothing else.**

Explicitly OUT of scope, recorded as CARRIED-SCOPE with no proposed fix:
- the gate refusing something the engine would have handled (the loud
  direction — three known cases, deliberately open);
- duplicated or imprecise problem MESSAGES, as long as the declaration is
  refused;
- the direction, the vocabulary's design, performance, naming taste;
- the recorded decision that the declaration file carries no ratification
  byte-lock until the next phase.

## 3. The lenses

**Lens A — the four just closed. Did they close?** For each, construct
the declaration under `/tmp`, run the gate, and run the engine on a value
that would exercise the rule:

1. a relation reading a target whose valid values are not all of the
   shape that relation can read (the gate now models RUNTIME SHAPES
   rather than node kinds);
2. a union and its map case, which share one address in the engine's
   walk;
3. a selector naming an engine-internal address (a list member, a key
   class);
4. a selector path through a declared field name that contains a dot.

Report any that the gate still accepts while the rule stays inert.

**Lens B — the same question, everywhere else.** This is the round's
core. Take the engine's evaluation code as the source of truth for when a
rule actually RUNS, and ask where it can decline to run while the gate
called the declaration closed. Places worth reading for this:
- every point where the engine returns early, skips, or treats an operand
  as unreliable or pending;
- the shape model in the gate versus what the engine's selector
  interpreter actually reads at run time — do they agree for every node
  kind, including nested value classes and unions?
- the suppression machinery (`gating`, `dependsOn`, container
  preconditions): can a declaration be closed and yet have a rule
  suppressed permanently rather than conditionally?
- the normalizer: it resolves its own operand paths in its own language —
  can a closed declaration still produce an empty or missing result there?

For each: the declaration, the input, what the engine does, and why the
gate did not object.

**Lens C — the guard fixtures for the four.** Each guard is generated
from one builder taking `ok`, so its broken and corrected forms should
differ in exactly one reference. Check the four new ones: is the
difference really one reference, does the broken form yield exactly one
problem, and does the corrected form yield none?

**Lens D — regression.** Run and report `pnpm v3:typecheck`,
`pnpm v3:lint`, `pnpm v3:test`, `bash v3/adr/check.sh`, and confirm the
live declaration passes the gate.

## 4. Evidence bar and finding format

**Every finding must carry an executed command and its real output**, or
be marked `unrun`. Work under `/tmp`; do not modify the repository.

```
### F<n> — <one-line title>
CLASS: IN-SCOPE | CARRIED-SCOPE | UNRUN
LENS:  A | B | C | D
WHAT:  the defect in one sentence
WHERE: file:line
EVIDENCE:
  <exact command>
  <exact output>
WHY IT MATTERS: what a maintainer concludes wrongly
FIX SKETCH: (IN-SCOPE only) the smallest correction
```

## 5. Rules of engagement

- **Do not modify the repository.** A byte guard runs before and after.
- **Do not propose new machinery.**
- **Proportionality.** A correction larger than the thing it corrects is
  itself a finding.
- **Vocabulary.** This is routine software quality review of an internal
  data-validation module — a conformance check between a configuration
  gate and the interpreter that consumes its output. Ordinary engineering
  terms throughout.
- **A clean result is a real result.** The four were named and fixed with
  a method that already works; finding nothing more is a plausible honest
  outcome. Do not manufacture findings and do not soften a real one.

## 6. Closing message

Only this:

- your tree's HEAD;
- counts: IN-SCOPE / CARRIED-SCOPE / UNRUN;
- which of the four closed and which did not;
- the four commands and their real results;
- one sentence: **can the gate still report a declaration as closed while
  a rule it declares never runs — and if so, in which case?**
