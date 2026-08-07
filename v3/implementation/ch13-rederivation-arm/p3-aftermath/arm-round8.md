# QA review charter — round 8: one question about grain

You are a fresh-context reviewer. You have full repo access. Read the
repo yourself; do not trust any summary in this charter over the bytes.

This module validates authored workflow documents against a DECLARED
schema. A load-time gate checks the declaration is closed; an interpreter
applies it to a document; a normalizer derives the admitted form.

The interpreter keeps PER-RUN STATE while it walks: which positions have
been evaluated, which produced a usable value, which named obligations
are still outstanding, what each derivation step needs. Until the change
under review, some of that state was keyed by the DECLARATION — a key
every instance of that declaration shares — so one instance's outcome
silently decided another's. It has been re-keyed to the INSTANCE address.

**This round asks ONE question, and nothing else:**

> **Does any per-run state still live at a COARSER GRAIN than the thing
> it describes?**

Reliability, completion, outstanding obligations, effective configs, hook
bookkeeping, memoisation, tag status — any of it. A key that is shared by
two things that are not the same thing is the defect.

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
| `v3/src/definition/schema/engine.ts` | 1676 | `ed338f5147a09001` |
| `v3/src/definition/schema/defineSurface.ts` | 727 | `5b33eb6481da48a9` |
| `v3/src/definition/schema/normalizer.ts` | 130 | `a9a7a8a67d7d8f62` |
| `v3/src/definition/schema/vocabulary.ts` | 454 | `760feff342744abe` |
| `v3/src/definition/schema/templateFormat.ts` | 574 | `69719e9fc9196e14` |
| `v3/src/definition/schema/engine.test.ts` | 1495 | `579c67ef15d57fec` |

The commit under review is the most recent, whose subject begins
`fix(v3): per-instance bookkeeping`. The round it answers is
`v3/implementation/ch13-rederivation-arm/p3-aftermath/arm-round7-out.txt`.
Both are worth reading first.

Both modules are importable, so a declaration can be built, passed to the
gate, and run through the interpreter in a few lines. Use that.

## 2. What counts, and what does not

**A finding is: two distinct things sharing one key in per-run state, with
an input where that sharing changes the answer.** The input matters — a
shared key nothing can distinguish is a tidiness observation, not a
defect, and should be marked as such.

Worth attention because they are where sharing hides: several instances
of one declaration (open-map entries, list members, repeated bindings);
one instance reached by two routes (a value class referenced from two
sites, a union and its map case, aliased YAML nodes that are the same
object in two places); positions whose reporting path is deliberately
COARSER than their address (`memberLaneAt: "container"`,
`keyLaneAt: "container"`, a membership rule declaring `at: "container"`);
the two channels; and anything keyed by a rendered string rather than a
structural address.

Out of scope, recorded as CARRIED-SCOPE with no proposed fix: the gate
refusing something the interpreter would have handled; message wording;
performance; naming taste; the declaration file's lack of a ratification
byte-lock until the next phase.

## 3. The lenses

**Lens A — enumerate the state.** Read the interpreter's run state and
list EVERY map, set and array it keeps during a walk. For each: what is
the key, what is the thing it describes, and are those the same
granularity? Say so for each one, including the ones that are fine — a
list that reports only problems does not tell the reader what was
checked.

**Lens B — try to make two things collide.** For each state item, build a
declaration and a document where two distinct positions would produce the
same key, and check whether one's outcome changes the other's. The
instance address is a list of segments; ask what it does NOT distinguish.
Consider a key that is a number and one that is the string of that
number; keys containing the separator the encoding uses; a document where
the same object appears at two addresses.

**Lens C — the three claims of the commit.** Check rather than believe:
one open-map entry can no longer decide another's rule; a refused
delegation reports and is silent only when a sibling lane failed; a
`default:` outside a fixed map's field is refused at load.

**Lens D — regression.** Run and report `pnpm v3:typecheck`,
`pnpm v3:lint`, `pnpm v3:test`, `bash v3/adr/check.sh`, and confirm the
live declaration passes the gate. **Run the suite ALONE — no concurrent
test runs.** One test, `runnerJourney` / `J-RESPAWN`, is a known
pre-existing intermittent failure unrelated to this module, reproduced on
earlier commits; if you see it, say so and move on.

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
- **Vocabulary.** Routine software quality review of an internal
  data-validation module — a configuration gate, the interpreter that
  consumes it, and a derivation step. Ordinary engineering terms
  throughout.
- **A clean result is a real result.** Do not manufacture findings and do
  not soften a real one.

## 6. Closing message

Only this:

- your tree's HEAD;
- counts: IN-SCOPE / CARRIED-SCOPE / UNRUN;
- the state items you enumerated, each marked matched-grain or coarser;
- the four commands and their real results;
- and the question, answered directly:

  > **Does any per-run state still live at a coarser grain than the thing
  > it describes — and if so, which, and what input shows it?**
