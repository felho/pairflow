# QA review charter — round 3 (final), the twice-folded substrate

You are a fresh-context quality reviewer on a CODE build. You have full
repo access. Read the repo yourself; do not trust any summary in this
charter over the bytes.

This is the THIRD and FINAL round of a bounded frame. Two rounds have
already run and their corrections are in. Round 3's job is to CLOSE:
confirm the last round's corrections landed, and give one independent
verdict on the build's central claim. It is not a fourth hunt for more of
the same class.

Review object — pinned by hash (the tree's HEAD may be a later docs-only
commit):

| File | Lines | sha256 (first 16) |
|---|---|---|
| `v3/src/definition/schema/vocabulary.ts` | 384 | `b64aa92474047756` |
| `v3/src/definition/schema/engine.ts` | 1183 | `c60b692db5301402` |
| `v3/src/definition/schema/templateFormat.ts` | 545 | `c8815a980075e8da` |
| `v3/src/definition/schema/normalizer.ts` | 140 | `30754f4b7aa93199` |
| `v3/src/definition/schema/templateSurface.ts` | 144 | `10f65890beee8e91` |
| `v3/src/definition/admit.ts` | 68 | `9b9ac9bdd25cd9fb` |
| `v3/src/definition/load.ts` | 268 | `4fae069c9d2a0525` |
| `v3/src/definition/schema/engine.test.ts` | 728 | `d9503cfc1b8ccb78` |

Prior rounds are in this directory: `arm-round1.md` / `-out.txt` and
`arm-round2.md` / `-out.txt`. **Read both verdicts before starting.**

## 0. READ THIS FIRST — the time budget

**You have a HARD 20-minute wall-clock budget, enforced by an external
process kill. A session that hits it produces NO usable output.** Write
each finding out IN FULL, in the §3 format, the moment you confirm it.
Stop investigating at roughly the 12-minute mark. Prefer breadth at
shallow depth; anything costing more than about two minutes goes down as
`unrun` with one sentence on what would settle it.

## 1. Scope, and one criterion refinement that binds this round

**What this round defends against: ACCIDENT and SLOPPINESS — a
correction that did not land, and a defect in the build's central claim.
Nothing else.** Constructs only a deliberate author would produce are out
of scope, as is the direction itself, the vocabulary's design,
performance, naming taste, and every surface the build did not touch.

**THE REFINEMENT, and it binds you.** Round 2 reported declaration
fields whose single literal value no machine compares. Some of those were
real; some were not, and the difference is this: a field typed to ONE
literal value is already enforced — the type system refuses any other
value, so no runtime comparison can ever fail, and demanding one is a
criterion nothing can satisfy.

So: report a declared field as unconsumed ONLY IF **a different legal
value would change nothing observable.** If the field's type admits two
or more values and the engine ignores the difference, that is a finding.
If the type admits exactly one value and the engine's behaviour is that
value's meaning, that is NOT a finding — it is the type doing the work.
State which test you applied when you report one.

## 2. The lenses

**Lens A — did round 2's six corrections land?** Check each in the
current bytes and report only the ones that did not:

1. the parity write-up's post-fold numbers are stamped with the commit
   they were measured at, and reproduce there;
2. the write-up's replay recipe is runnable as written — no placeholder,
   no reference to a tool that does not exist;
3. `MapOpenDecl.nonempty`'s doc no longer contradicts what the `steps`
   declaration does;
4. `deepKeyStringness`'s channel field is compared, not assumed;
5. `sourceForm`'s value and a cross rule's `relation` are compared;
6. the row-citation hygiene test walks the cross rules, the normalizer
   hooks and the value classes, not only the node tree.

**Lens B — the central claim, independently.** The build claims: every
structural rule of the authored-definition surface lives in the
declaration, and one engine applies it to both channels — a file with
its source text, and a directly-constructed value. Test the claim
directly:
- construct a small template value under `/tmp` and admit it through
  `admitTemplate`; construct the equivalent YAML and load it through
  `loadTemplate`; check the admitted results agree and that a defect
  planted in either is reported at the same path with the same message;
- then plant a defect that only a source-form rule can see (an integer
  written as `0x10`, an anchored scalar) and confirm it is reported on
  the file channel and silently legal on the direct one — that asymmetry
  is DECLARED and correct, not a defect.

**Lens C — the residual's two rules.** `schema/templateSurface.ts` keeps
two rules as hand-written code and gives a reason for each. Verify both
still behave: the runtime-context cross-rule and the uses-scoped source
ladder. Are they reachable, do they fire, and does each fire exactly
once?

**Lens D — one sweep for anything the prior rounds missed**, under the
§1 refinement. Breadth-first, no re-reporting.

## 3. Evidence bar and finding format

**Every finding must carry an executed command and its real output.** If
you could not run it, mark it `unrun`.

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

- **Do not modify the repository.** A byte guard runs before and after.
  Work under `/tmp`.
- **Do not propose new machinery.**
- **Proportionality.** A correction proposal larger than the thing it
  corrects is itself a finding.
- **A clean round is the expected outcome of a closing round, and saying
  so is a result.** Do not manufacture findings to fill it. Do not soften
  a real one to be agreeable.

## 5. Closing message

Only this:

- your tree's HEAD;
- counts: IN-SCOPE / CARRIED-SCOPE / UNRUN;
- which of round 2's six corrections landed;
- whether the central claim survives what you ran, in one sentence;
- if you applied the §1 refinement to reject a candidate finding, say how
  many you rejected that way.
