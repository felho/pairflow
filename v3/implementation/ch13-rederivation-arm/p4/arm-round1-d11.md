# QA review charter — D11 round 1: the typed subset on a plain map

You are a fresh-context reviewer. You have full repo access. Read the
repo yourself; do not trust any summary in this charter over the bytes.

This module validates authored workflow documents against a DECLARED
schema. Its declaration language has just gained ONE widening: the
`fields` attribute, until now the fixed map's, is legal on `map.plain`
with open-keyset semantics. Evaluation-core descent changed, which is
where surprises live — that is why this round exists.

## 0. READ THIS FIRST — the time budget

**You have a HARD 20-minute wall-clock budget, enforced by an external
process kill. A session that hits it produces NO usable output — every
finding you have not yet written out is discarded.** An earlier session
in this repo spent its budget investigating, planned to write up at the
end, and was killed mid-write-up; all of its work was lost.

**Write each finding out IN FULL, in the §4 format, the moment you
confirm it.** Stop investigating around the 12-minute mark. Breadth at
shallow depth; anything costing over two minutes goes down as `unrun`
with one sentence on what would settle it.

## 1. The review object

The two most recent commits: `08f99ab9` (the ADR-019 D11 amendment —
read its D11 section FIRST; it states the intended semantics and is the
standard this round measures against) and `65b1a9e2` (the build).

| File | Lines | sha256 (first 16) |
|---|---|---|
| `v3/src/definition/schema/vocabulary.ts` | 489 | `3ca33fcc686aeb83` |
| `v3/src/definition/schema/engine.ts` | 1772 | `e22152fd4a7c8671` |
| `v3/src/definition/schema/defineSurface.ts` | 844 | `3e59aa0521855c2b` |
| `v3/src/definition/schema/engine.test.ts` | 1943 | `5cdf0a23d5a53530` |

Both modules are importable, so a declaration can be built, passed to
the load-time gate (`defineSurface`), and run through the interpreter
(`runSurface`) in a few lines from a script under `/tmp`. Use that.

## 2. The widening, in one paragraph

A `map.plain` node may declare `fields`: the listed fields are typed and
validated WHEN PRESENT; every other key stays legal, uninterpreted open
data; NO unknown-key lane exists. Validation transforms nothing — the
plain map's value is authored data and passes through unchanged. The
container and canonical lanes still gate the subset under the implicit
container rule. Attribute applicability is LOUD at the new grain:
`presence`, `default` and `channel` on a plain-map field refuse the
load. One descent serves the new positions (`childDecl`), so selector
references into them resolve at the gate and membership rules inside
them — including `validKeysOf` — run at evaluation.

## 3. The lenses

**Lens A — both directions of the subset.** Catches what it should: a
typed field's type, grammar, list-member and membership lanes fire when
the key is present, on BOTH channels (direct value and parsed YAML),
including a `validKeysOf` membership reaching a catalog elsewhere in
the document from inside the plain map. Permits what it must: undeclared
sibling keys yield nothing; an absent typed field yields nothing; the
returned normalized value is the authored map, unchanged.

**Lens B — the suppression neighbourhood.** A non-plain or
non-canonical map must gate the subset with its own finding as the
trace. A broken typed field must NOT decide anything outside itself: not
a sibling key, not the map's own lanes, and — the per-instance question —
not the SAME declared field in a DIFFERENT plain-map instance elsewhere
in the document (two entries of an open map each carrying the same
declared subset: one broken, one valid — the valid one must stay clean,
in both document orders).

**Lens C — the load gate's closure over the new positions.** The three
refused attributes refuse with one problem each and their corrected
twins load. A selector operand INSIDE a typed field that addresses a
mistyped path refuses the load. A membership rule inside a typed field
participates in belt-dependency bookkeeping: if a catalog's entry
subtree reaches a `validKeysOf` through a plain-map field, a ring
formed that way must still be refused at load, in both declaration
orders.

**Lens D — channel behaviour at the edges.** The file channel realizes
maps from parsed YAML; a plain map carrying a non-string key nearby, an
aliased subtree, or integer-like quoted keys must not make the subset
behave differently across channels for the same logical value.

**Lens E — nothing else moved.** The commit claims the suite went 2044
to 2059 with exactly the fifteen added tests. Check the claim's
arithmetic against `git show --stat` and the suite, and check the LIVE
declaration (`templateFormat.ts`) is byte-untouched by the build commit.

## 4. Finding format and counts

Threat model: this round defends against ACCIDENT and SLOPPINESS in the
build — behaviour that contradicts the ADR's D11 section, the D10
belt's stated semantics, or the build's own claims. Anything outside
that sentence is CARRIED-SCOPE, recorded in one line, never folded here.

```
### <CLASS> <n> — <one-line title>
CLASS: IN-SCOPE | CARRIED-SCOPE | UNRUN
WHAT:  one sentence
WHERE: file:line or construct
EVIDENCE:
  <exact command>
  <exact output>
EXPECTED: what the ADR/doc says should happen
```

Do not propose fixes. Do not modify the repository — not one byte; work
under `/tmp`. A guard runs before and after.

Vocabulary note: routine software engineering throughout — schema
validation, conformance checks, counterexamples, sensitivity checks.

## 5. Closing message

Only this: your tree's HEAD; counts IN-SCOPE / CARRIED-SCOPE / UNRUN;
which lenses ran fully / partially / not at all; the four commands'
results (`pnpm v3:typecheck`, `pnpm v3:lint`, `pnpm v3:test`,
`bash v3/adr/check.sh`) — run the suite ALONE, never concurrently; and
one sentence answering: does the built behaviour match the ADR's D11
section?
