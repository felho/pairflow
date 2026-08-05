# QA review charter — round 2, the FOLDED substrate (ch13 re-derivation, phase P3, arc B)

You are a fresh-context quality reviewer on a CODE build. You have full
repo access. Read the repo yourself; do not trust any summary in this
charter over the bytes.

This is a RE-CHECK on bytes that a previous round already changed. Its
question is not "is this build good" but two narrower ones: **did the
previous round's corrections actually land, and did making them break or
weaken anything?**

Review object — the folded build, pinned by hash (the tree's HEAD may be
a later docs-only commit; the hashes are the pin):

| File | Lines | sha256 (first 16) |
|---|---|---|
| `v3/src/definition/schema/vocabulary.ts` | 379 | `d945209ac71165c3` |
| `v3/src/definition/schema/engine.ts` | 1181 | `bfa4de6ccc30b1dd` |
| `v3/src/definition/schema/templateFormat.ts` | 545 | `c8815a980075e8da` |
| `v3/src/definition/schema/normalizer.ts` | 140 | `30754f4b7aa93199` |
| `v3/src/definition/schema/templateSurface.ts` | 144 | `10f65890beee8e91` |
| `v3/src/definition/admit.ts` | 68 | `9b9ac9bdd25cd9fb` |
| `v3/src/definition/load.ts` | 268 | `4fae069c9d2a0525` |
| `v3/src/definition/schema/engine.test.ts` | 722 | `44ec213378b1963a` |

The previous round's charter and its full verdict are in this directory:
`arm-round1.md` and `arm-round1-out.txt`. **Read the verdict.** The fold
that answered it is the commit whose subject begins `fix(v3): arm round
1's fold`.

## 0. READ THIS FIRST — the time budget, and why it decides your output shape

**You have a HARD 20-minute wall-clock budget for this entire session.
It is enforced by an external process kill. A session that hits it
produces NO usable output — every finding you have not yet written out
is discarded.** An earlier session in this repo spent its whole budget
investigating, planned to write up at the end, and was killed
mid-write-up. All of its work was lost.

So the rule is: **write each finding out IN FULL, in the §3 format, the
moment you confirm it.** Do not accumulate findings for the end.

Budget shape: stop investigating at roughly the 12-minute mark and spend
the rest consolidating. Prefer **breadth at shallow depth**. If a check
looks like it will take more than about two minutes, write it down as
`unrun` with one sentence on what would settle it, and move on.

## 1. Scope declaration

**What this round defends against: ACCIDENT and SLOPPINESS — a
correction that did not land, a correction that landed and broke
something else, and any NEW instance of the defect class the previous
round named. Nothing else.**

Constructs only a deliberate author would produce are out of scope. So
is the direction itself, the vocabulary's design, performance, naming
taste, and every surface this build did not touch (the three gate-config
validators under `v3/src/gates/`, the CLI, the wire contracts).

**Record anything out of scope as CARRIED-SCOPE. Do not propose a fix
for it.**

## 2. The lenses — ordered cheapest-first

**Lens A — did each correction land?** For each of the previous round's
six in-scope findings, check the current bytes:

1. the write-up's numbers now carry the commit they were measured at,
   and the current numbers reproduce
   (`v3/implementation/p3-parity-gate.md` §6);
2. the `reserved` attribute is gone, and the key it named is still
   refused;
3. `valueRaw` appears in the vocabulary's documented placeholder set and
   its documented meaning matches what the engine does;
4. the substrate block now contains only fields that are read or
   asserted, and `load.ts` reads them rather than repeating their
   literals;
5. `presence.required`, `unique.grain`, `resolvedForm.safeInteger` and
   the registry name are read by the engine, not merely present;
6. the write-up carries a way to reproduce the old-vs-new replay.

Report each one that did NOT land, with evidence.

**Lens B — did the fold break behaviour?** The substrate messages moved
from literals in `load.ts` into the declaration and are now
interpolated. Any drift in those strings is a user-visible regression.
Check the decode message, the `%YAML` directive message, the
duplicate-key message and the internal-failure message against the tests
that assert them (`v3/src/definition/load.test.ts`) and against the
pre-build implementation at
`git show 7b6bfbba:v3/src/definition/load.ts`.

**Lens C — the same defect class, elsewhere.** The previous round's
theme was DECLARED-BUT-NOT-CONSUMED. Sweep the whole vocabulary and the
whole declaration once more for any remaining attribute, field or
exported function with no reader — including ones the fold introduced.
`collectCodes`, `collectTags` and `renderMessage` are exports; check
each has a caller.

**Lens D — the tests.** The suite gained a check that every issue code
the declaration assigns is inside a closed list. Verify the check would
actually fail if a code outside the list were assigned (construct the
case under `/tmp`, do not modify the repo). Also re-check the pinned
guard count against the register.

**Lens E — anything the previous round missed.** One pass, breadth-first,
for a mismatch between what a declaration attribute's doc comment says
and what the engine does with it. Report what you find; do not re-report
what round 1 already found.

## 3. Evidence bar and finding format

**Every finding must carry an executed command and its real output.** A
finding stated from reading alone, however confident, is not a finding
here. If you could not run it, mark it `unrun`.

```
### F<n> — <one-line title>
CLASS: IN-SCOPE | CARRIED-SCOPE | UNRUN   (one sentence on why)
WHAT:  the defect in one sentence
WHERE: file:line
EVIDENCE:
  <exact command>
  <exact output>
WHY IT MATTERS: what a reader or maintainer concludes wrongly
FIX SKETCH: (IN-SCOPE only) the smallest correction
```

## 4. Rules of engagement

- **Do not modify the repository.** Not one byte, tracked or untracked.
  A byte guard runs before and after this session. Work under `/tmp`.
- **Do not propose new machinery.** If something is missing, say so in
  prose.
- **Proportionality.** A correction proposal larger than the thing it
  corrects is itself a finding — say so instead of proposing it.
- **A clean re-check is a real result.** If a correction landed, say so
  in one line and move on. Do not manufacture findings to fill the
  round; do not soften one to be agreeable either.

## 5. Closing message

Only this:

- your tree's HEAD;
- counts: IN-SCOPE / CARRIED-SCOPE / UNRUN;
- which of the six corrections landed and which did not;
- which lenses you completed, partially ran, or did not reach;
- one sentence on whether the previous round's defect class — a declared
  attribute nothing reads — still has instances in these bytes.
