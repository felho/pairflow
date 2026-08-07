# QA review charter — round 11: a new construct and its neighbourhood

You are a fresh-context reviewer. You have full repo access. Read the
repo yourself; do not trust any summary in this charter over the bytes.

This module validates authored workflow documents against a DECLARED
schema. Its declaration language has just gained ONE new construct, and
that construct carries a defined behaviour on a broken operand which is
part of the construct rather than an option on it. Runtime semantics is
where surprises live, which is why this round exists.

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
| `v3/src/definition/schema/engine.ts` | 1757 | `b47a358257f4685f` |
| `v3/src/definition/schema/defineSurface.ts` | 744 | `8bccae207e86966d` |
| `v3/src/definition/schema/vocabulary.ts` | 473 | `baf5beb1fb806c49` |
| `v3/src/definition/schema/engine.test.ts` | 1718 | `23986307eeaca978` |
| `v3/src/definition/schema/templateFormat.ts` | 574 | `69719e9fc9196e14` |

The two commits under review are the most recent: one amending
`v3/adr/ADR-019-declared-schema-for-structural-definition-rules.md` with
a section D10, one building it. Read D10 first — it states the intended
semantics, and it is the standard this round measures against.

Both modules are importable, so a declaration can be built, passed to the
load-time gate, and run through the interpreter in a few lines. Use that.

## 2. The construct, in one paragraph

A membership rule can select over `validKeysOf: <path>` instead of
`keysOf: <path>`. Where `keysOf` yields every key of the map at that
path, `validKeysOf` yields only those keys whose VALUE is a valid entry —
"valid" meaning the map's own declared `entry:` node evaluated without
producing a finding. Its stated behaviour on a broken operand: when the
operand is wrong-kind, absent, or otherwise unresolvable, no reference
can resolve against it, so it answers with the EMPTY SET rather than
marking itself unusable — and therefore every referencing site still
receives its own finding, never suppressed by the container's failure.

## 3. The lenses

**Lens A — the construct's neighbourhood, in BOTH directions.** The
failure mode of a belt is being too tight OR too loose, and both matter:

- *catches what it should*: entries that are the wrong kind, missing a
  required key, failing a grammar, empty where nonempty is declared,
  carrying an unknown key, nested deeper than one level;
- *lets through what it should*: a fully valid entry; several valid
  entries beside one broken one; an entry that is valid but whose
  SIBLING key is malformed; an entry validated on the file channel where
  a source-bearing lane also ran;
- *the broken operand*: wrong-kind, absent, present-but-empty, a
  container that is a list, a value that is null;
- *both channels agree* on every case above.

**Lens B — what "produced a finding" does and does not mean.** Validity
is measured by whether the entry's evaluation emitted anything. Probe
that definition: an entry whose own lanes are clean but whose SUBTREE
emitted; an entry that emits and is then re-evaluated; a declaration
where the same map is reachable by two paths; an entry whose finding
comes from a lane that also suppresses others. Does "valid" mean what a
declaration author would take it to mean?

**Lens C — ordering and deferral.** The lane defers while the operand has
not been reached yet, and decides at the drain. Build declarations where
the referencing list is evaluated BEFORE the catalog and after it; where
the catalog is nested inside an open map; where two belts reference each
other's operands. Does the answer depend on declaration order? It must
not.

**Lens D — suppression elsewhere is UNTOUCHED.** The construct changes
how ONE lane treats a broken operand. Check that ordinary `keysOf`,
`valuesOf`, `collect`, `dependsOn`, `gating` and the container
precondition behave exactly as before, and that the live declaration's
behaviour has not moved.

**Lens E — the load-time gate.** The operand path is closure-checked like
any other reference. Check a mistyped path, a belt over a fixed map, a
belt over a list, a belt over a string, a belt inside a value class.

**Lens F — regression.** Run and report `pnpm v3:typecheck`,
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
LENS:  A | B | C | D | E | F
WHAT:  the defect in one sentence
WHERE: file:line
EVIDENCE:
  <exact command>
  <exact output>
WHY IT MATTERS: what a declaration author would get wrong
FIX SKETCH: (IN-SCOPE only) the smallest correction
```

## 5. Rules of engagement

- **Do not modify the repository.** A byte guard runs before and after.
- **Do not propose new machinery.**
- **Proportionality.** A correction larger than the thing it corrects is
  itself a finding.
- **Vocabulary.** Routine software quality review of an internal
  data-validation module and one newly added declaration construct.
  Ordinary engineering terms throughout.
- **A clean result is a real result.** Do not manufacture findings and do
  not soften a real one.

## 6. Closing message

Only this:

- your tree's HEAD;
- counts: IN-SCOPE / CARRIED-SCOPE / UNRUN;
- which lenses you completed, partially ran, or did not reach;
- the four commands and their real results;
- one sentence: **does the construct behave as D10 states, in both
  directions, and did adding it move anything else?**
