# Authoring exercise — write a new surface declaration against this substrate

You are a fresh-context engineer, and this task is CONSTRUCTIVE. Every
previous review of this module examined it. **Nobody has yet USED it.**
You are its first outside author, and what you struggle with is the
result.

## 0. READ THIS FIRST — the time budget

**You have a HARD 20-minute wall-clock budget, enforced by an external
process kill. A session that hits it produces NO usable output — every
note you have not yet written out is discarded.** An earlier session in
this repo spent its budget working, planned to write up at the end, and
was killed mid-write-up; all of its work was lost.

**Write each observation out IN FULL, in the §5 format, the moment you
form it** — including the ones that go well. Stop building at roughly the
13-minute mark and spend the rest writing.

Budget shape: get a MINIMAL declaration loading and running early, then
add. A partial declaration that ran, with honest notes, is worth far more
than a complete one you never executed.

## 1. What this module is

`v3/src/definition/schema/` validates authored workflow-definition
documents against a DECLARED schema:

- `vocabulary.ts` — the declaration language, as types, each construct
  carrying a doc comment stating its meaning;
- `templateFormat.ts` — the one declaration written in it today, i.e. the
  worked example;
- `defineSurface.ts` — the load-time gate: a declaration that does not
  resolve never becomes a surface;
- `engine.ts` — the interpreter, `runSurface(surface, value, { channel })`;
- `normalizer.ts` — derivation after validation.

`v3/adr/ADR-019-declared-schema-for-structural-definition-rules.md` states
the design. **Those files plus the ADR are your documentation.** If you
find yourself needing something they do not tell you, that is a result —
record it.

## 2. What to build

A ratified prose contract already specifies a surface that has NOT yet
been declared:
`v3/implementation/contracts/ch13-context-block-contract.md`. Read its
rows C1, C2, C3, C4, C6, C7 and C8 — that is the semantics you are
realizing. In outline:

- an OPTIONAL top-level `contextBlocks` key whose value is an OPEN-KEY map
  — the keys are authored block ids, carrying their own grammar;
- each catalog ENTRY is a fixed-keyset map `{ body }`, where `body` is
  REQUIRED and a nonempty string;
- one or more REF-LIST positions elsewhere in the document whose members
  are block ids and must RESOLVE into that catalog.

**Scope it to fit the budget.** The catalog, its key grammar, its entry
shape, and ONE ref-list position that resolves into it is a complete
exercise. A second ref position is a stretch goal, not a requirement.

You do not need to reproduce the contract exactly, and you are not being
graded on fidelity to it. You are being asked to express it in this
language and report how that went.

## 3. How to work

Everything under `/tmp`. **Do not modify the repository — not one byte.**
A guard runs before and after. Your declaration and fixtures are
disposable scratch and must NOT be added to the repo; the transcript
preserves them.

The modules are importable directly from the repo, so a script under
`/tmp` can build a declaration, pass it to the gate, and run values
through the interpreter. You may lift whatever scaffolding you need from
the worked example — that is what a real author would do — but **record
what you had to lift and why**, because scaffolding a first author cannot
derive from the documentation is itself a finding.

Then exercise it:

- **legal values** — a catalog with entries and refs that resolve; the
  absent-catalog-with-no-refs case; an empty catalog;
- **illegal values** — a ref that resolves to nothing; a malformed block
  id; an entry missing `body`; an entry whose `body` is empty or not a
  string; a catalog that is present but not a map;
- **both channels** — the interpreter takes either a parsed YAML document
  or a value constructed directly in code. Run both, and say whether they
  agreed.

For each: what finding did you expect from what you declared, and what
did you get — the path, the message, and the count.

## 4. What to report, in four classes

- **DEFECT** — behavior that contradicts the documentation or your
  declaration. Executed evidence required.
- **SEMANTIC SURPRISE** — a declaration that loads cleanly and then means
  something other than a reasonable author would expect. The gate passed;
  the meaning drifted. These are the most valuable thing you can find.
- **USABILITY** — where the documentation left you guessing. Say what you
  tried FIRST, what happened, and what error text failed to tell you.
  A rejection whose message did not lead you to the fix belongs here.
- **CONFIRMED** — what worked exactly as documented, first time. **Report
  these.** A round that lists only problems does not tell the reader which
  parts of this language can be relied on.

## 5. Finding format

```
### <CLASS> <n> — <one-line title>
CLASS: DEFECT | SEMANTIC SURPRISE | USABILITY | CONFIRMED
WHAT:  one sentence
WHERE: the construct or file, and the doc line you were following
EVIDENCE:
  <exact command>
  <exact output>
EXPECTED: what you thought would happen, and why you thought it
```

Do not propose fixes. Findings here are input to a decision that has not
been taken.

## 6. Rules of engagement

- **Do not modify the repository.** Work under `/tmp`.
- **Vocabulary.** Routine software engineering: authoring a schema
  declaration against an internal validation library and reporting the
  experience. Ordinary engineering terms throughout.
- **Do not soften.** If the language fought you, say so plainly. If it
  did not, say that plainly too — an easy exercise honestly reported is a
  real result.

## 7. Closing message

Only this:

- your tree's HEAD;
- counts by class: DEFECT / SEMANTIC SURPRISE / USABILITY / CONFIRMED;
- how far you got (catalog only, catalog + one ref position, more);
- and one paragraph answering directly:

  > **Could a competent engineer author a new surface against this
  > substrate from its documentation alone — and what would slow them
  > down most?**
