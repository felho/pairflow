# QA review charter — round 6: one resolver, one question

You are a fresh-context reviewer. You have full repo access. Read the
repo yourself; do not trust any summary in this charter over the bytes.

A load-time gate checks that a configuration declaration is CLOSED: every
name and path it writes resolves to something the interpreter will
actually visit. Until the commit under review, the gate resolved those
references against its OWN model of the interpreter's addressing. Three
review rounds each found a place where that model and the interpreter had
drifted apart, so the model has been REMOVED: the interpreter now exposes
its descent (`descend`, `resolveSelectorPath`), and both its own runtime
path walk and the gate call it.

**This round asks ONE question: can the gate still report a declaration as
closed while a rule it declares never runs?**

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
| `v3/src/definition/schema/engine.ts` | 1385 | `511f13d5471a615b` |
| `v3/src/definition/schema/defineSurface.ts` | 637 | `a1f7e42f16f30e5e` |
| `v3/src/definition/schema/engine.test.ts` | 1184 | `8794758617d4277e` |
| `v3/src/definition/schema/vocabulary.ts` | 436 | `890f458676afffa7` |
| `v3/src/definition/schema/templateFormat.ts` | 574 | `69719e9fc9196e14` |

The commit is the one whose subject begins `refactor(v3): one resolver`.
The round it answers is `arm-round3-out.txt` in this directory, whose
closing four cases the commit message claims to have closed. Both are
worth reading first.

Both modules are importable, so a declaration can be built, passed to the
gate, and then run through the interpreter in a few lines. Use that.

## 2. Scope — narrow on purpose

**What this round looks for: ACCIDENT and SLOPPINESS in ONE direction — a
declaration the gate accepts as closed whose rule is nonetheless skipped
at run time. Nothing else.**

Explicitly OUT of scope, recorded as CARRIED-SCOPE with no proposed fix:

- the gate refusing something the interpreter would have handled (the
  opposite direction — deliberately open, several known cases recorded);
- duplicated or imprecise problem MESSAGES, as long as the declaration is
  refused;
- the design, the declaration language's shape, performance, naming taste;
- the recorded decision that the declaration file carries no ratification
  byte-lock until the next phase;
- the size of the change (it did not shrink the gate; that is recorded).

## 3. The lenses

**Lens A — is the model really single?** The claim is that ONE function
now decides where a path lands, and that both readers go through it.
Check it against the bytes rather than the message:

- find every place that builds or interprets a declaration ADDRESS
  (a string like `$.steps.*.role`, or a step from one position to
  another). Is there more than one? A second one is the finding this
  round exists for.
- the interpreter's walk records an address for each position it
  evaluates. Does `descend`, asked for that same position, return the
  same node? Construct declarations where they could disagree: a value
  class referenced from two sites, a union whose map case has fields, a
  value class whose body is itself a union, a fixed map nested in an open
  map's entry.
- `deref` follows references and unions with a cycle guard. What happens
  for a value class that names itself, directly or through another?

**Lens B — the same question, everywhere else.** This is the round's
core. Take the interpreter's evaluation code as the source of truth for
when a rule actually RUNS, and ask where it can decline to run while the
gate called the declaration closed. Places worth reading:

- every point where the walk returns early, skips, or treats an operand
  as unreliable or pending — and in particular what happens to a rule
  that is still pending when the deferred queue drains;
- suppression (`gating`, `dependsOn`, container preconditions): can a
  declaration be closed and yet have a rule suppressed permanently
  rather than conditionally?
- the two-channel split: a declaration runs on a file channel and on a
  directly-constructed value. Is there a rule the gate accepts that runs
  on one and silently not the other?
- the normalizer: it resolves its own operand paths. Can a closed
  declaration still produce an empty or missing result there?
- the gate's own new policy checks (a channel-scoped operand, a delegate
  whose named sibling need not hold a string). Are they complete, or is
  there a neighbouring case they miss?

For each: the declaration, the input, what the interpreter does, and why
the gate did not object.

**Lens C — the five new guard fixtures.** Each guard is generated from
one builder taking `ok`, so its broken and corrected forms should differ
in exactly one reference. For the five added by this commit: is the
difference really one reference, does the broken form yield exactly one
problem, and does the corrected form yield none?

**Lens D — regression.** Run and report `pnpm v3:typecheck`,
`pnpm v3:lint`, `pnpm v3:test`, `bash v3/adr/check.sh`, and confirm the
live declaration still passes the gate. Note that one test in the suite
(`runnerJourney` / `J-RESPAWN`) is a known pre-existing intermittent
failure unrelated to this module; if you see it, say so and move on.

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
  data-validation module — a configuration gate and the interpreter that
  consumes its output, checked against each other. Ordinary engineering
  terms throughout.
- **A clean result is a real result.** The change removes a duplicated
  model rather than adding a check, so finding nothing more is a
  plausible honest outcome. Do not manufacture findings and do not soften
  a real one.

## 6. Closing message

Only this:

- your tree's HEAD;
- counts: IN-SCOPE / CARRIED-SCOPE / UNRUN;
- whether you found a second model of the addressing anywhere;
- the four commands and their real results;
- one sentence: **can the gate still report a declaration as closed while
  a rule it declares never runs — and if so, in which case?**
