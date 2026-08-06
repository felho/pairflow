# QA review charter — round 2 (the reserve): did the refine land?

You are a fresh-context reviewer. You have full repo access. Read the
repo yourself; do not trust any summary in this charter over the bytes.

This is the RESERVE round of a two-round budget, and its scope is narrow
by design. A previous round checked whether a declaration gate resolved
every name and path a declaration can write, and found eight places it
did not. Those eight have been folded. **This round asks whether they
landed, and whether folding them broke anything.**

## 0. READ THIS FIRST — the time budget

**You have a HARD 20-minute wall-clock budget, enforced by an external
process kill. A session that hits it produces NO usable output — every
finding you have not yet written out is discarded.** An earlier session in
this repo spent its budget investigating, planned to write up at the end,
and was killed mid-write-up; all of its work was lost.

**Write each finding out IN FULL, in the §4 format, the moment you
confirm it.** Stop investigating around the 12-minute mark. Breadth at
shallow depth; anything costing more than two minutes goes down as
`unrun` with one sentence on what would settle it.

## 1. The review object

Pinned by hash. HEAD may be a later docs-only commit.

| File | Lines | sha256 (first 16) |
|---|---|---|
| `v3/src/definition/schema/defineSurface.ts` | 570 | `286ae3374173a595` |
| `v3/src/definition/schema/engine.test.ts` | 915 | `8368b3bea431bbf7` |
| `v3/src/definition/schema/vocabulary.ts` | 436 | `890f458676afffa7` |
| `v3/src/definition/schema/templateFormat.ts` | 574 | `69719e9fc9196e14` |
| `v3/src/definition/schema/engine.ts` | 1117 | `b556c50cb729b39a` |

The round being answered, with its eight findings, is at
`v3/implementation/ch13-rederivation-arm/p3-aftermath/arm-round1-out.txt`;
its charter is beside it. The fold is the commit whose subject begins
`fix(v3): the reserve's refine`.

## 2. Scope

**What this round defends against: ACCIDENT and SLOPPINESS — a
correction that did not land, and a regression caused by the fold.
Nothing else.**

Out of scope, recorded as CARRIED-SCOPE without a proposed fix: the
direction; the vocabulary's design; performance; naming taste; surfaces
untouched by this work; and the recorded, dated decision that the
declaration file carries no ratification byte-lock until the next phase.

## 3. The lenses

**Lens A — did the eight land?** Check each against the current bytes and
report only the ones that did NOT:

1. a selector path is resolved against the declaration tree — a
   well-formed path to a position nothing declares is refused — and the
   target's KIND is checked against the relation reading it;
2. `delegate.by` must name a field the enclosing map declares;
3. `dependsOn` is collected from value-class declarations too;
4. `dependsOn` targets are restricted to tags the engine records a status
   for;
5. the normalizer path rule refuses `*` inside a segment, and `over` /
   `advanceSet` resolve to declared positions;
6. the normalizer's `edges`, `carry` and `into` field names resolve
   against the node the hook lands on;
7. the substrate's messages go through the placeholder check;
8. each guard fixture is generated from ONE builder so its broken and
   corrected forms differ in exactly one reference, and each guard
   asserts EXACTLY ONE problem.

**Lens B — the one-problem property, checked rather than assumed.** The
fold claims one broken reference yields one problem. For every guard in
the register, not a sample: does the broken form produce exactly one, and
the corrected form none? If any guard's corrected form still produces a
problem, the pair is not a clean discrimination and that is a finding.

**Lens C — the new resolution passes.** The gate now resolves in two
passes: positions collected while walking, references resolved after.
- Does the position map cover every node position the engine addresses?
  Compare how the gate builds its paths with how the engine builds its
  own walk addresses.
- The `^` (parent-relative) form resolves against the citing node's
  container. Is the base it computes the same one the engine computes?
- Does anything now get resolved TWICE, or reported under two different
  problem strings?

**Lens D — REGRESSION.** Run and report: `pnpm v3:typecheck`,
`pnpm v3:lint`, `pnpm v3:test`, `bash v3/adr/check.sh`. Then: the live
declaration passes the gate — confirm that, and confirm the gate is
actually invoked on the path production uses (rather than the declaration
merely happening to be well-formed).

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
- **Do not propose new machinery.** If something is missing, say so in
  prose.
- **Proportionality.** A correction larger than the thing it corrects is
  itself a finding.
- **Vocabulary.** This is routine software quality review of an internal
  data-validation module — a gate that checks whether the names in a
  configuration object resolve. Ordinary engineering terms throughout.
- **A clean re-check is a real result.** This is a closing round on a
  narrow delta; finding nothing is a plausible honest outcome. Do not
  manufacture findings and do not soften a real one.

## 6. Closing message

Only this:

- your tree's HEAD;
- counts: IN-SCOPE / CARRIED-SCOPE / UNRUN;
- which of the eight corrections landed and which did not;
- the four commands and their real results;
- one sentence: **is there still a name or path a declaration can write
  that the gate does not resolve?**
