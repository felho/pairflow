# QA review charter — B1: runtime robustness of the definition engine

You are a fresh-context reviewer. You have full repo access. Read the
repo yourself; do not trust any summary in this charter over the bytes.

This module validates authored workflow-definition documents against a
declared schema. It is the FOUNDATION every later phase of this project
builds on, which is why its owner has bought extra review rounds for it.
Earlier rounds checked it for accident and sloppiness, for the soundness
of its direction, and for whether its load-time gate resolves every name.
**None of them ran it on unusual inputs.** That is this round's subject.

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

| File | Lines |
|---|---|
| `v3/src/definition/schema/engine.ts` | 1117 |
| `v3/src/definition/schema/normalizer.ts` | 140 |
| `v3/src/definition/schema/templateSurface.ts` | 144 |
| `v3/src/definition/schema/templateFormat.ts` | 574 |
| `v3/src/definition/load.ts` | 268 |
| `v3/src/definition/admit.ts` | 68 |

Two entry points matter, and they take DIFFERENT inputs:
- `loadTemplate(bytes)` — parses YAML, so its values come from the parser
  (`mapAsMap: true`, so maps arrive as JS `Map`s and keys can be
  non-strings);
- `admitTemplate(value)` — takes a value a CALLER constructed in code, so
  its values are ordinary JavaScript objects, arriving as-is.

Both run the same declaration through the same engine, then a NORMALIZER
computes the admitted result.

## 2. Scope and the failure model

**What this round looks for: ACCIDENT and SLOPPINESS. The inputs that
matter here arise from ORDINARY USE — a template someone actually wrote,
a value some other part of the system constructed — not from anyone
trying to cause trouble.** A workflow author who names a step
`constructor`, a key with an accented character, or a deeply nested
agent-config is doing something legitimate.

So the question throughout is: **on an input a real user could produce,
does this code do what its own documentation says?**

Out of scope, recorded as CARRIED-SCOPE with no proposed fix: the
direction; the declaration language's design; performance; naming taste;
the load-time gate's completeness (a separate round covers it, and its
open items are recorded).

## 3. The lenses

**Lens A — object-key discipline.** This codebase has a documented habit
of reading and writing keys as OWN properties, because a step id or an
event type is authored text and may collide with names JavaScript objects
already have. Check that habit holds throughout the new engine and the
normalizer:
- a key named `__proto__`, `constructor`, `prototype`, `toString`,
  `hasOwnProperty` — as a step id, an event type, a role name, a map key
  anywhere the declaration allows an open map;
- values reaching `admitTemplate` on the direct channel, where a caller's
  object may INHERIT properties rather than own them, or may be created
  with `Object.create(null)`;
- keys that are not strings at all — the file channel really can produce
  them, and the declaration has lanes that report on them.
Read and write sites both: reading an inherited key is one defect,
writing a key that lands on a prototype is another.

**Lens B — legal but unusual values.** Inputs a real template can contain:
- empty containers versus absent keys (a distinction this declaration
  treats as meaningful in several places);
- unicode and accented keys, keys with unusual whitespace, very long keys;
- deep nesting, and values that appear at more than one place in the same
  document (the YAML parser can produce shared and repeated structures);
- numbers and booleans where strings are expected, and the reverse.
For each: does the result match the declaration's stated meaning, and is
every finding's path one a reader could use to locate the problem?

**Lens C — the NORMALIZER, which no round has examined closely.** It runs
AFTER validation and computes the admitted value. Read
`normalizer.ts` and ask:
- what does each hook do when its operand is present but shaped
  unusually — an empty map, a value at an unexpected place, a key
  colliding with an object internal?
- is it IDEMPOTENT? Running it twice on its own output should give the
  same answer; if it does not, say where.
- does it MUTATE its input, and does anything else hold a reference to
  what it mutates?
- does normalize-then-read agree with what the declaration says the
  admitted form is?

## 4. Evidence bar and finding format

**Every finding must carry an executed command and its real output**, or
be marked `unrun`. The modules are importable; build cases under `/tmp`
and run them. Do not modify the repository.

```
### F<n> — <one-line title>
CLASS: IN-SCOPE | CARRIED-SCOPE | UNRUN
LENS:  A | B | C
WHAT:  the defect in one sentence
WHERE: file:line
EVIDENCE:
  <exact command>
  <exact output>
WHY IT MATTERS: what breaks, for whom, on what input
FIX SKETCH: (IN-SCOPE only) the smallest correction
```

## 5. Rules of engagement

- **Do not modify the repository.** A byte guard runs before and after.
- **Do not propose new machinery.**
- **Proportionality.** A correction larger than the thing it corrects is
  itself a finding.
- **Vocabulary.** Routine software quality review of an internal
  data-validation module. Ordinary engineering terms throughout.
- **A clean result is a real result.** Do not manufacture findings; do
  not soften a real one.

## 6. Closing message

Only this:

- your tree's HEAD;
- counts: IN-SCOPE / CARRIED-SCOPE / UNRUN;
- which lenses you completed, partially ran, or did not reach;
- one sentence on the module's robustness against ordinary unusual input.
