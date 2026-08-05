# QA review charter — the declared-schema substrate (ch13 re-derivation, phase P3, arc B)

You are a fresh-context quality reviewer on a CODE build. You have full
repo access. Read the repo yourself; do not trust any summary in this
charter over the bytes.

Repo: the working tree you are launched in. The BUILD's code tip is
`89e33abb`; this charter was committed after it, so the HEAD you see is
that commit or a later docs-only one. The bytes under review are pinned
by the hashes below, not by HEAD. Everything is repo-relative.

Review object — the build, at these bytes:

| File | Lines | sha256 (first 16) |
|---|---|---|
| `v3/src/definition/schema/vocabulary.ts` | 385 | `a370c52e3528c5fe` |
| `v3/src/definition/schema/engine.ts` | 1131 | `628fd58755d4c34d` |
| `v3/src/definition/schema/templateFormat.ts` | 558 | `14ead799a7b38782` |
| `v3/src/definition/schema/normalizer.ts` | 140 | `30754f4b7aa93199` |
| `v3/src/definition/schema/templateSurface.ts` | 144 | `10f65890beee8e91` |
| `v3/src/definition/admit.ts` | 68 | `9b9ac9bdd25cd9fb` |
| `v3/src/definition/load.ts` | 255 | `8cba05034b431930` |
| `v3/src/definition/schema/engine.test.ts` | 716 | `b224076bf2c15ea5` |

Cite your tree's HEAD in your verdict.

## 0. READ THIS FIRST — the time budget, and why it decides your output shape

**You have a HARD 20-minute wall-clock budget for this entire session.
It is enforced by an external process kill. A session that hits it
produces NO usable output — every finding you have not yet written out
is discarded.** An earlier session in this repo spent its whole budget
investigating, planned to write up at the end, and was killed mid-write-up.
All of its work was lost.

So the rule is: **write each finding out IN FULL, in the §4 format, the
moment you confirm it.** Do not accumulate findings for the end. Your
closing message should need to contain nothing but the counts, because
everything else is already written.

Budget shape: stop investigating at roughly the 12-minute mark and spend
the rest consolidating. Prefer **breadth at shallow depth**. If a check
looks like it will take more than about two minutes, write it down as
`unrun` with one sentence on what would settle it, and move on.

## 1. What the build is

The repo previously validated authored workflow-definition files with
two hand-written rule sets: a source-form walk over the YAML document
(`definition/validate.ts`, now deleted) and an admission rung over the
resulting value (`definition/admit.ts`). The two disagreed about which
rules ran on which channel, and the rules themselves lived as code.

This build replaces both with:

1. a VOCABULARY of declaration attributes, as types
   (`schema/vocabulary.ts`) — no logic;
2. a DECLARATION of the template format, as frozen data
   (`schema/templateFormat.ts`) — no logic, every node carrying a `tag`
   and the ratified contract rows it realizes in `rows`;
3. an ENGINE that consumes the declaration and emits findings
   (`schema/engine.ts`), run on either channel — a file (with its YAML
   document and source text) or a directly-constructed value;
4. a NORMALIZER (`schema/normalizer.ts`) that computes the admitted
   FORM — deliberately a separate machine, because a declaration says
   what is legal and does not compute a value;
5. a composition (`schema/templateSurface.ts`) that adds the two rules
   the build decided are NOT expressible as declaration, and wires them
   into the same finding stream.

`definition/admit.ts` is now two entry points over the engine, one per
channel. `definition/load.ts` calls it once.

The acceptance instrument was a comparison harness, since removed, whose
result is written up in `v3/implementation/p3-parity-gate.md`. The
governing decision record is `v3/adr/ADR-019-declared-schema-for-structural-definition-rules.md`;
its basis document is `v3/implementation/schema-expressiveness-audit.md`.

## 2. Scope declaration — read this before deciding what counts

**What this round defends against, ratified for this round: ACCIDENT and
SLOPPINESS — a mismatch between what the declaration says and what the
engine does, a silent behaviour drift introduced by the replacement, a
regression, a guard that does not guard. Nothing else.**

A commit-holder who deliberately writes a misleading declaration owns
the diff review and this reviewer too; constructs that only a deliberate
author would produce are OUT of scope here.

**IN SCOPE.** Anything that makes the build's claims false or
unreproducible: a declared attribute the engine ignores; an engine
behaviour no declaration asks for; a rule that silently changed meaning
in the replacement; a count or claim in `p3-parity-gate.md` that does
not reproduce; a test whose fixture does not discriminate; a declared
node whose `rows` cite a contract row that does not exist or does not
say that.

**OUT OF SCOPE — record it as CARRIED-SCOPE, do not propose a fix.**
Whether the direction is a good idea; whether the vocabulary is the best
possible design; performance; naming taste; anything about surfaces this
build deliberately did not touch (the three gate-config validators under
`v3/src/gates/`, the CLI, the stdin/stdout wire contracts). Also out of
scope: proposing new machinery, new tables, or new tooling.

This bounds the *worklist*, not your *reading*.

## 3. The lenses — ordered cheapest-first, so a kill costs you least

Work them in this order and **emit findings as you go**.

**Lens A — the write-up's numbers (pure command work, do this first).**
`v3/implementation/p3-parity-gate.md` states several derived numbers.
Re-derive each and report every disagreement:
- the seven-file case count (362) and its per-file split;
- the executed-case counts it reports;
- the line-count comparison in its §5 (substrate vs. what it replaced —
  the replaced files are at `git show HEAD~3:...`);
- the claim that `pnpm v3:typecheck`, `v3:lint` and `v3:test` are green.

**Lens B — declaration vs. engine, both directions (the core of this
round).**
- Pick a spread of declared attributes across `templateFormat.ts` —
  container kinds, `presence`, `unknownMessage`, `nonempty`, `grammar`,
  `keyClass` + `keyLaneAt`, `unique` + its `at`, `memberOf` /
  `keysSubsetOf` / `disjointFrom`, `default`, `removedKeys` /
  `removedValues`, `sourceForm`, `resolvedForm`, `gating`, `channel`,
  `laneOrder`, `delegate`. For each, find where `engine.ts` consumes it
  and check the consumption matches the attribute's documented meaning.
  Report every attribute that is declared but never read, and every
  attribute read in a way its own doc comment contradicts.
- The reverse: read `engine.ts` for behaviour that NO declaration asks
  for — a hard-coded rule, a special case, a literal comparison against
  a specific key or value. The build claims it has no per-rule branch;
  a literal `if (rule === X)`-shaped construct is exactly the thing to
  hunt.

**Lens C — did the replacement change meaning?** The deleted
implementation is at `git show 9790b800:v3/src/definition/validate.ts`
and `git show 9790b800:v3/src/definition/admit.ts` (the last commit that
carries them). Pick several rules and
compare old vs. new: same condition, same path, same message text, same
issue code. The write-up claims ZERO message and ZERO path changes; each
message you find that differs is a finding. It also names the changes it
DID accept — structural rules now running on the directly-constructed
channel, and finding ORDER — so those two are not findings; anything
else is.

**Lens D — do the new tests discriminate?**
`schema/engine.test.ts` carries 31 guards, each with a MUTANT
declaration that is supposed to be the same declaration with that one
guard removed. For a sample: is the mutant really the guard removed, and
nothing else? A mutant that changes something unrelated, or that removes
a guard the fixture never exercised, makes the discrimination claim
hollow. Also check the pinned count matches the register.

**Lens E — the residual's honesty.** `schema/templateSurface.ts` names
two rules it keeps as hand-written code and gives a reason for each.
Check both reasons against the repo: is the first genuinely
inexpressible in the vocabulary, and is the second's blocker (a module
import restriction plus a port shape) real? Then look for the reverse —
a rule that IS hand-written somewhere in the changed files without being
declared or named as residual.

**Lens F — dead weight.** Any vocabulary attribute, engine branch, or
exported function with no user at all. The build removed two constructs
for this reason; report any it missed.

## 4. Evidence bar and finding format

**Every finding must carry an executed command and its real output.** A
finding stated from reading alone, however confident, is not a finding
here — this project has a recorded history of plausible review claims
that were false when run. If you could not run it, mark it `unrun`.

Emit each finding, when you confirm it, as:

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

## 5. Rules of engagement

- **Do not modify the repository.** Not one byte, tracked or untracked.
  A byte guard runs before and after this session; any change
  invalidates the entire verdict. Do experimental work under `/tmp`
  (copying files there to run against is fine).
- **Do not propose new machinery.** No new modules, no new attributes,
  no tooling. If you think something is missing, say so in prose.
- **Proportionality.** A correction proposal larger than the thing it
  corrects is itself a finding — say so instead of proposing it.
- **False-green is the thing to hunt.** The build's value rests on the
  declaration being the single place a structural rule lives. A rule
  that quietly lives in the engine instead, or an attribute the engine
  ignores, is the failure mode this round exists to catch.
- **Completeness over ranking.** Report everything in both classes. Do
  not silently drop small findings; do not pad with speculation.

## 6. Closing message

Only this, because everything else is already written:

- your tree's HEAD;
- counts: IN-SCOPE / CARRIED-SCOPE / UNRUN;
- which lenses you completed, which you partially ran, which you did not
  reach;
- one sentence on whether the build's central claim — every structural
  rule of this surface lives in the declaration, and the replacement
  changed no path and no message — survives what you ran.
