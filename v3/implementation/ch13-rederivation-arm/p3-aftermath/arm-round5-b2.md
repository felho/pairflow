# QA review charter — B2: does the engine mean what the vocabulary says?

You are a fresh-context reviewer. You have full repo access. Read the
repo yourself; do not trust any summary in this charter over the bytes.

This module validates authored workflow documents against a DECLARED
schema. The declaration language is specified in one file — each
construct with a doc comment stating what it means — and a separate
engine interprets declarations written in it. **This round checks the two
against each other.**

It is the foundation every later phase builds on, which is why its owner
has bought extra rounds for it. Earlier rounds covered accident and
sloppiness in the build, the soundness of the direction, whether the
load-time gate resolves every name, and runtime robustness on unusual
input. **Conformance between the specification and the interpreter has
never been checked.**

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
| `v3/src/definition/schema/vocabulary.ts` | 436 | `890f458676afffa7` | the SPECIFICATION |
| `v3/src/definition/schema/engine.ts` | 1123 | `b753f4fc58ce9f81` | the INTERPRETER |
| `v3/src/definition/schema/normalizer.ts` | 140 | `30754f4b7aa93199` |
| `v3/src/definition/schema/templateFormat.ts` | 574 | `69719e9fc9196e14` | one declaration written in it |

`vocabulary.ts` is the language specification: every construct carries a
doc comment stating its meaning, and several state a rule explicitly (a
grain, an ordering, a scope, a default). `engine.ts` interprets it.
`defineSurface.ts` gates a declaration at load — treat it as a given
here; its own completeness is a separate round's subject.

Both modules are importable, so a declaration and a value can be built
and run in a few lines. Use that.

## 2. Scope and the failure model

**What this round looks for: ACCIDENT and SLOPPINESS — a construct whose
documented meaning and implemented behaviour differ.** The declaration
shipped today exercises only some of what the language can express, so
the interesting cases are legal declarations NOBODY HAS WRITTEN YET: the
next chapter will write them, and a construct that means something other
than its documentation says will mislead its author.

Out of scope, recorded as CARRIED-SCOPE with no proposed fix: the
direction; whether the language is well designed; performance; naming
taste; the load-gate's completeness; anything about the deleted
predecessor implementation.

## 3. The lenses

**Lens A — construct by construct.** Work through `vocabulary.ts` and for
each construct ask: what does the doc comment claim, and does the engine
do that? Write a small legal declaration using it and run a value
through. The constructs, so none is skipped for lack of a list: the node
kinds (fixed and open maps, plain map, list, string, integer, enum,
union, raw, value-class reference, delegate); `presence` with its
`at`/`code`/folded-into-type-lane variants; `nonempty` and its `gating`
flag; `grammar`; `keyClass` with `keyLaneAt`; `deepKeyStringness`;
`keysSubsetOf`; `unique` with its `at` grain; `memberOf` and
`disjointFrom` with their `at` grain and `dependsOn`; `default`;
`removedKeys` and `removedValues`; `sourceForm` and `resolvedForm`;
`channel` at node and enum-member grain; `laneOrder`'s three values; the
equals cross rule's two directions and grains; the normalizer's two
hooks.

Report every disagreement between comment and behaviour, in either
direction — the comment may also be describing something the engine no
longer does.

**Lens B — boundary values.** For the constructs above, the values at the
edges: empty containers versus absent keys; a single-member union; an
enum with one member; a list of one; a grammar matching the empty string;
a `default` that is itself an empty container; a required field whose
value is legitimately `undefined`-looking. Does each behave as documented?

**Lens C — grain addressing on declarations nobody has written.** The
language lets a finding be addressed at a container or at a segment or an
index (`at`, `keyLaneAt`, `memberLaneAt`). Today's declaration uses some
combinations; the language permits more. Build the unused combinations
and check the finding's path is what the documentation says it is — a
path that is wrong is worse than a missing check, because a reader
follows it to the wrong place.

**Property-style probing is encouraged**: generate legal declarations and
values, assert what the specification says should happen, and report
disagreements. Say how you generated them so the result is reproducible.

## 4. Evidence bar and finding format

**Every finding must carry an executed command and its real output**, or
be marked `unrun`. Work under `/tmp`; do not modify the repository.

```
### F<n> — <one-line title>
CLASS: IN-SCOPE | CARRIED-SCOPE | UNRUN
LENS:  A | B | C
WHAT:  the disagreement in one sentence — what the doc says, what the engine does
WHERE: vocabulary.ts:<line> versus engine.ts:<line>
EVIDENCE:
  <exact command>
  <exact output>
WHY IT MATTERS: what the next declaration author would get wrong
FIX SKETCH: (IN-SCOPE only) the smallest correction, and say which side
            you would change — the comment or the code
```

That last point matters: when a comment and code disagree, either could
be the mistaken one. Say which you think it is and why.

## 5. Rules of engagement

- **Do not modify the repository.** A byte guard runs before and after.
- **Do not propose new machinery.**
- **Proportionality.** A correction larger than the thing it corrects is
  itself a finding.
- **Vocabulary.** Routine software quality review: a specification and
  its interpreter, checked against each other. Ordinary engineering terms
  throughout.
- **A clean result is a real result.** Do not manufacture findings; do
  not soften a real one.

## 6. Closing message

Only this:

- your tree's HEAD;
- counts: IN-SCOPE / CARRIED-SCOPE / UNRUN;
- roughly how many of the constructs in Lens A's list you actually
  exercised, and which you did not reach;
- one sentence: **can a declaration author trust the vocabulary's doc
  comments as a specification of what the engine will do?**
