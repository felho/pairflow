# QA review charter — D11 round 2: re-check on the folded bytes

You are a fresh-context reviewer. You have full repo access. Read the
repo yourself; do not trust any summary in this charter over the bytes.

This is the SECOND round of a bounded three-round frame on one
widening: the `fields` attribute at `map.plain` grain (ADR-019 D11 —
read that section first; it is the standard). Round 1 found two
in-scope defects; both were folded at commit `14f3ab12`. This round
verifies the folds and their neighbourhoods and confirms nothing else
moved. It is NOT a fresh falsification hunt — anything noticed outside
the scope below goes down as CARRIED-SCOPE in one line.

## 0. READ THIS FIRST — the time budget

**You have a HARD 20-minute wall-clock budget, enforced by an external
process kill. A session that hits it produces NO usable output.** Write
each finding out IN FULL, in the §4 format, the moment you confirm it.
Stop investigating around the 12-minute mark; anything costing over two
minutes goes down as `unrun` with one sentence on what would settle it.

## 1. The review object

Commit `14f3ab12` on top of `65b1a9e2` / `08f99ab9`.

| File | Lines | sha256 (first 16) |
|---|---|---|
| `v3/src/definition/schema/vocabulary.ts` | 489 | `3ca33fcc686aeb83` |
| `v3/src/definition/schema/engine.ts` | 1781 | `d8036e3b32b16939` |
| `v3/src/definition/schema/defineSurface.ts` | 852 | `b13b9d20a06c28ea` |
| `v3/src/definition/schema/engine.test.ts` | 1971 | `5183d4e853b6e7bc` |

Both modules are importable from scripts under `/tmp`.

## 2. The two folds under verification

**Fold 1 (round-1 F1).** `collectDependsOn` now descends `map.plain`
fields, so a `dependsOn` naming an undeclared tag inside a typed plain
field refuses the load. Exercise the neighbourhood, not only the
reported case: a VALID dependsOn inside a plain field (loads and
suppresses at run time when the named tag's lane failed); nesting — a
plain field whose type is a LIST whose member carries the rule; a plain
field reached through a VALUE CLASS reference; and the corrected twin
of the reported case.

**Fold 2 (round-1 F2).** `evalMapPlain` now judges the RAW value on the
direct channel: a string-keyed JS Map refuses with the container
finding and the subset stays suppressed, while the FILE channel's
resolved maps (YAML `mapAsMap`) keep realizing and running the subset.
Exercise the neighbourhood: a non-string-keyed Map on the direct
channel; a Map nested INSIDE a legal plain map's open data; a Map at a
typed field's own value; channel agreement for the same logical
document; and the file channel's aliased/anchored plain maps.

## 3. Scope fence

In scope: the two folds above, their stated neighbourhoods, and any
REGRESSION the fold could have caused elsewhere in the D11 surface
(the typed-subset lanes, the load gate's plain-field descent, the
suppression behaviour). Out of scope (CARRIED-SCOPE, one line): the
wider engine, the live declaration, anything predating D11.

Also verify the arithmetic: the fold claims 2059 → 2063 with exactly
four added tests (`git show --stat 14f3ab12`, the suite).

## 4. Finding format

Threat model: ACCIDENT and SLOPPINESS in the fold — behaviour that
contradicts ADR-019 D11, the fold's own commit message, or the
vocabulary's doc comments.

```
### <CLASS> <n> — <one-line title>
CLASS: IN-SCOPE | CARRIED-SCOPE | UNRUN
WHAT:  one sentence
WHERE: file:line or construct
EVIDENCE:
  <exact command>
  <exact output>
EXPECTED: what the ADR/doc/commit says should happen
```

Do not propose fixes. Do not modify the repository — not one byte; work
under `/tmp`. A guard runs before and after. Vocabulary: routine
software engineering (schema validation, conformance, counterexamples,
sensitivity checks).

## 5. Closing message

Only this: your tree's HEAD; counts IN-SCOPE / CARRIED-SCOPE / UNRUN;
which neighbourhoods ran fully / partially; the four commands' results
(`pnpm v3:typecheck`, `pnpm v3:lint`, `pnpm v3:test` — run ALONE, never
concurrently — and `bash v3/adr/check.sh`); and one sentence: do the
two folds hold?
