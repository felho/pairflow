# QA review charter — round 9: three sites, checked

You are a fresh-context reviewer. You have full repo access. Read the
repo yourself; do not trust any summary in this charter over the bytes.

This module validates authored workflow documents against a DECLARED
schema. The interpreter keeps per-run state while it walks. A settled
principle has been applied across it: **state is keyed by the thing it
describes** — the instance, not the declaration, and not a rendered
string that two distinct instances can share.

An earlier round enumerated that state and found three places still keyed
too coarsely. The commit under review applies the principle to those
three, and to nothing else.

**This round is SCOPED. It checks those three corrections and the
regression around them. It is deliberately NOT a fresh hunt for new
problems elsewhere** — that decision belongs to the project's owner and
has not been taken. If you happen to notice something outside the three,
record it as CARRIED-SCOPE in one line and move on; do not spend budget
on it.

## 0. READ THIS FIRST — the time budget

**You have a HARD 20-minute wall-clock budget, enforced by an external
process kill. A session that hits it produces NO usable output — every
finding you have not yet written out is discarded.** An earlier session in
this repo spent its budget investigating, planned to write up at the end,
and was killed mid-write-up; all of its work was lost.

**Write each finding out IN FULL, in the §4 format, the moment you
confirm it.** Stop investigating around the 12-minute mark. Anything
costing over two minutes goes down as `unrun` with one sentence on what
would settle it.

## 1. The review object

| File | Lines | sha256 (first 16) |
|---|---|---|
| `v3/src/definition/schema/engine.ts` | 1702 | `52c39998cd832eb0` |
| `v3/src/definition/schema/normalizer.ts` | 132 | `5f7742ef77706a10` |
| `v3/src/definition/schema/engine.test.ts` | 1626 | `756fbca4139ec5fe` |
| `v3/src/definition/schema/defineSurface.ts` | 727 | `5b33eb6481da48a9` |

The commit under review is the most recent, whose subject begins
`fix(v3): the closing sweep`. The round it answers is
`v3/implementation/ch13-rederivation-arm/p3-aftermath/arm-round8-out.txt`
— its F2, F3 and F4. Both are worth reading first.

Both modules are importable, so a declaration can be built, passed to the
gate, and run through the interpreter in a few lines. Use that.

## 2. The three corrections

**Site 1 — list members.** The pass that evaluates a list's
`disjointFrom` rebuilt each member's frame with the LIST's address, so
all members shared one tag status and one broken member suppressed every
sibling's rule. Note that it suppressed in BOTH orders, which is why an
order-swap alone did not reveal it.

**Site 2 — effective configs.** Per-binding state was keyed by a RENDERED
path, so the structural addresses `["a.b"]` and `["a","b"]` produced the
same key and one overwrote the other. It is keyed by structural segments
now, on both the writing and the reading side.

**Site 3 — the deep key-stringness scan.** Its seen-set was keyed by
OBJECT IDENTITY, so one YAML-anchored map appearing at two document
addresses was reported at the first and passed over at the rest. It is
now a path-scoped ancestor set.

## 3. The lenses

**Lens A — did each of the three land?** For each site, construct the
case under `/tmp`, run it, and report whether the correction holds. Then
try the neighbourhood of each:

1. list members — other member-scoped rules (`memberOf`, `unique`), a
   list whose members are maps rather than strings, a list nested inside
   an open-map entry, a member rule with `dependsOn` naming a tag
   declared at several depths;
2. effective configs — a binding address containing the characters the
   encoding uses, a numeric-looking key beside a numeric index, two
   pipelines whose addresses differ only in where a dot falls;
3. the key scan — an alias appearing three times, an alias INSIDE a
   cycle, an alias whose two addresses are at different depths, an array
   holding the same map twice.

**Lens B — did the corrections cost anything?** Each changes a key or a
traversal. Ask what ELSE read that key or relied on that traversal
stopping early. In particular: does the key scan still terminate on every
cyclic input, and can it now report the same key more times than a reader
would expect? Does the structural effective-config key still match what
the walk writes for every binding shape?

**Lens C — the guards.** Three fixtures were added with sensitivity
proofs. Check that each broken form really fails without its fix and that
each discriminating negative is not vacuous.

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
  data-validation module. Ordinary engineering terms throughout.
- **A clean result is a real result.** This is a narrow check on three
  named corrections; finding nothing is the expected honest outcome and
  is worth reporting as such. Do not manufacture findings and do not
  soften a real one.

## 6. Closing message

Only this:

- your tree's HEAD;
- counts: IN-SCOPE / CARRIED-SCOPE / UNRUN;
- for each of the three sites: landed, or not, and why;
- the four commands and their real results;
- one sentence: **do the three corrections hold, and did any of them cost
  something elsewhere?**
