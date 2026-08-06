# QA review charter — the aftermath fold: closure completeness

You are a fresh-context reviewer. You have full repo access. Read the
repo yourself; do not trust any summary in this charter over the bytes.

A design review on 2026-08-06 found that a declaration language had its
SHAPES checked by the type system while its NAMES AND PATHS were resolved
at run time with nothing checking them — so a mistyped reference switched
a rule off silently. A fold has since added a gate that resolves every
reference at load and refuses a declaration that is not closed.

**This round asks one primary question: does the gate check every name and
path a declaration can write?** Plus: did the fold break anything.

## 0. READ THIS FIRST — the time budget

**You have a HARD 20-minute wall-clock budget, enforced by an external
process kill. A session that hits it produces NO usable output — every
finding you have not yet written out is discarded.** An earlier session in
this repo spent its whole budget investigating, planned to write up at the
end, and was killed mid-write-up. All of its work was lost.

**Write each finding out IN FULL, in the §4 format, the moment you confirm
it.** Stop investigating around the 12-minute mark and consolidate.
Breadth at shallow depth; anything costing more than about two minutes
goes down as `unrun` with one sentence on what would settle it.

## 1. The review object

Pinned by hash. HEAD may be a later docs-only commit.

| File | Lines | sha256 (first 16) |
|---|---|---|
| `v3/src/definition/schema/defineSurface.ts` | 398 | `24768221992cbb02` |
| `v3/src/definition/schema/vocabulary.ts` | 436 | `890f458676afffa7` |
| `v3/src/definition/schema/engine.ts` | 1117 | `b556c50cb729b39a` |
| `v3/src/definition/schema/templateFormat.ts` | 574 | `69719e9fc9196e14` |
| `v3/src/definition/schema/engine.test.ts` | 872 | `3bb06222e7ac0311` |
| `v3/src/definition/load.ts` | 268 | `6fd6921e76cde94a` |

The design review that motivated the fold, with the findings it is
answering, is at
`v3/implementation/ch13-rederivation-arm/p3-design/design-review-out.txt`
(findings F2, F6, F7, F10, F11, F13). The fold is the commit whose
subject begins `fix(v3): close the declaration at load`.

## 2. Scope

**What this round defends against: ACCIDENT and SLOPPINESS — a reference
the gate still lets dangle, a gate rule that does not do what it says, and
regression caused by the fold. Nothing else.**

Out of scope, recorded as CARRIED-SCOPE without a proposed fix: whether
the direction is right (a separate round settled that); the vocabulary's
design; performance; naming taste; surfaces the build did not touch. Also
out of scope: the accepted gap that the declaration file carries no
ratification byte-lock — that is a recorded, dated decision, not an
oversight.

## 3. The lenses

**Lens A — CLOSURE COMPLETENESS (the primary lens; spend most of the
budget here).** The gate states that a declaration carrying an
unresolved reference cannot become a surface. Check that statement
exhaustively, by enumeration rather than by sampling.

Enumerate, from `vocabulary.ts`, EVERY place a declaration can name
something that must resolve — a value-class name, any of the three path
languages, a placeholder slot, an issue code, a `dependsOn` tag, a
registry name, a normalizer hook's operand, a node's `tag`, a regular
expression, an enum member's channel, anything else you find. Then, for
each, check whether `defineSurface` actually resolves it.

**Report every name or path a declaration can write that the gate does
NOT check.** For each, say concretely what a declaration author would
write by ordinary mistake, and what the engine would then do with it.
Build the case under `/tmp` and run it — the engine and the gate are both
importable.

Two specific things to settle:
- the gate walks a declaration; does its walk reach EVERY node position
  the engine evaluates? A position the walk does not visit leaves the
  references inside it unchecked.
- which code paths construct a surface value, and does each one pass
  through the gate before the engine sees it? List the call sites.

**Lens B — DO THE GATE'S RULES SAY WHAT THEY DO?** For a sample of the
thirteen guards, check the rule against its message and its
documentation. A guard that refuses something legal, or whose message
names a different problem than the one it caught, is a finding. In
particular: `channel` is now documented as honoured on a field of a
`map.fixed` and refused elsewhere — verify both halves against the
engine's actual reads.

**Lens C — REGRESSION.** Run and report:
`pnpm v3:typecheck`, `pnpm v3:lint`, `pnpm v3:test`, `bash v3/adr/check.sh`.
Then the behavioural half: the fold changed how a channel-scoped field is
treated (it used to gate only key legality; it now scopes the field
whole). Convince yourself no finding path, message or verdict moved for
any input that does not use a channel-scoped field, and say how you
convinced yourself. The prior parity record is
`v3/implementation/p3-parity-gate.md`.

**Lens D — the tests' own honesty.** The gate's thirteen guard fixtures
are each described as "the same closed surface with exactly ONE reference
broken", with a sibling case asserting the unbroken surface passes. Check
a sample: is each fixture really one break, and would each guard's
absence really let its fixture through?

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
  data-validation module: a gate that checks whether the names in a
  configuration object resolve. Describe what you find in ordinary
  engineering terms — an unchecked reference, a position the walk misses,
  a message that names the wrong problem.
- **A clean result is a real result.** The gate is narrow and the base is
  three-rounds verified; finding nothing new is a plausible honest
  outcome. Do not manufacture findings, and do not soften a real one.

## 6. Closing message

Only this:

- your tree's HEAD;
- counts: IN-SCOPE / CARRIED-SCOPE / UNRUN;
- the four regression commands and their real results;
- and the primary question, answered in one sentence: **does the gate
  check every name and path a declaration can write — and if not, which
  one does it miss?**
