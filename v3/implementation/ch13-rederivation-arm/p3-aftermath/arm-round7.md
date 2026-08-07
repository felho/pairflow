# QA review charter — round 7: the closing question

You are a fresh-context reviewer. You have full repo access. Read the
repo yourself; do not trust any summary in this charter over the bytes.

This module validates authored workflow documents against a DECLARED
schema. A load-time gate checks that the declaration is closed; an
interpreter applies it; a separately-named normalizer derives the
admitted form from it.

Six review rounds have chased ONE failure mode through this substrate: a
declared rule that does not run, and leaves no trace anywhere that it did
not. Each round found another road to it and each was closed. The owner's
standing claim after the three changes under review is:

> **No known way remains for a declared rule to fail to run silently.**

**Your job is to falsify that claim.** Not to confirm it, and not to
review the changes for their own sake.

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
| `v3/src/definition/schema/engine.ts` | 1556 | `0eea46898fdb87ca` |
| `v3/src/definition/schema/defineSurface.ts` | 716 | `bc53d21af59e9561` |
| `v3/src/definition/schema/normalizer.ts` | 122 | `ff232bf87f0b97bf` |
| `v3/src/definition/schema/vocabulary.ts` | 454 | `760feff342744abe` |
| `v3/src/definition/schema/templateFormat.ts` | 574 | `69719e9fc9196e14` |
| `v3/src/definition/schema/engine.test.ts` | 1398 | `f526f2259ccbf13b` |

The three commits under review are the most recent whose subjects begin
`fix(v3): the third reader`, `feat(v3): an undecided rule`, and
`feat(v3): no value reaches`. The round they answer is
`arm-round6-out.txt` in this directory. Both are worth reading first.

Both modules are importable, so a declaration can be built, passed to the
gate, and run through the interpreter in a few lines. Use that.

## 2. What "silently" means here, exactly

A declared rule may legitimately not run. What it may NOT do is leave no
trace. Three dispositions are ACCEPTABLE and are not findings:

- the rule ran and produced a finding, or ran and passed;
- the rule was SUPPRESSED by an operand that itself failed — there is a
  sibling finding naming that failure, and that is the trace;
- the rule was refused at LOAD, so the declaration never became a surface.

One disposition is the defect: the rule did not run, produced nothing,
and nothing else in the output or at load records the fact.

Out of scope, recorded as CARRIED-SCOPE with no proposed fix: the gate
refusing something the interpreter would have handled (the loud
direction, several known cases deliberately open); message wording;
performance; naming taste; the recorded decision that the declaration
file carries no ratification byte-lock until the next phase.

## 3. The lenses

**Lens A — the three changes, checked rather than believed.**

1. The normalizer's operand paths now resolve through the interpreter's
   own descent rather than a reader of its own. Is there any declared
   path shape the gate accepts for which a hook still writes nothing?
   Wildcards in either hook, at any position; a path landing on
   something that is not the shape the hook expects; a hook whose target
   field collides with an object internal.
2. A rule still undecided at end of walk is reported, unless the
   declaration carries `whenOperandAbsent: "skip"`. Find a way for a
   rule to end the walk neither decided, nor suppressed with a trace,
   nor reported. Consider especially: rules reached through value
   classes, rules inside list members, the deferred queue's own
   re-entry, and whether the marker can be set where it should not be.
3. A declared `default:` is now evaluated through its own field. Does
   every path that materializes one go through that evaluation? What
   about a default on a node inside an open-map entry, a list member, a
   union case, a value class?

**Lens B — the roads no round has walked.** This is where a falsifier
should spend most of its budget. Take the interpreter's evaluation code
as the source of truth for when a rule RUNS, and enumerate every point
where it can return early, skip, continue, or decline. For each, ask: if
a declared rule sits below this point, what records that it did not run?
Places worth reading: container preconditions; `gating` and `dependsOn`
suppression; the open-map key-subset CONTINUE; a list member that
produced a finding; channel-scoped fields on each of the two channels; a
delegate whose registry is absent or whose registration declines; the
root container lane.

**Lens C — the load gate's own coverage.** The gate refuses what it can
prove wrong at load. Is there a declaration it accepts whose rules cannot
all run for some legal document — where the gate had enough information
to know? And the converse trace: does anything the gate refuses get
refused TWICE, or with a message naming the wrong thing?

**Lens D — regression.** Run and report `pnpm v3:typecheck`,
`pnpm v3:lint`, `pnpm v3:test`, `bash v3/adr/check.sh`, and confirm the
live declaration passes the gate. **Run the suite ALONE — no concurrent
test runs — and expect it to take about half a minute.** One test,
`runnerJourney` / `J-RESPAWN`, is a known pre-existing intermittent
failure unrelated to this module and confirmed on earlier commits; if you
see it, say so and move on.

## 4. Evidence bar and finding format

**Every finding must carry an executed command and its real output**, or
be marked `unrun`. Work under `/tmp`; do not modify the repository.

```
### F<n> — <one-line title>
CLASS: IN-SCOPE | CARRIED-SCOPE | UNRUN
LENS:  A1 | A2 | A3 | B | C | D
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
  consumes its output, and a derivation step. Ordinary engineering terms
  throughout.
- **A clean result is a real result.** Six rounds have narrowed this;
  finding nothing is a plausible honest outcome, and saying so is worth
  as much as a finding. Do not manufacture one, and do not soften a real
  one.

## 6. Closing message

Only this:

- your tree's HEAD;
- counts: IN-SCOPE / CARRIED-SCOPE / UNRUN;
- which lenses you completed, partially ran, or did not reach;
- the four commands and their real results;
- and then the closing question, answered directly:

  > **Can a declared rule still fail to run and leave no trace — and if
  > so, by which road?**
