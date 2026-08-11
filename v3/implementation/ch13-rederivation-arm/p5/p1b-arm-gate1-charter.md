# External arm — conformance review of an approve-ready specification document

You are an independent reviewer. Work from the repository root
`/Users/felho/dev/pairflow`. Report findings; do not fix anything.

## READ-ONLY — binding

Do not edit, format, install, generate, or commit any repository file.
Tests may write only their normal temporary runtime artifacts. Missing
dependencies are an evidence gap to report, never something to install.
Scratch files go under `/tmp` only.

## Basis

TARGET: `v3/implementation/packets/ch13-p1b-context-dispatch.md`
BASIS HASH: sha256 = `acc9a5603cba4bc59903b00c88ab46e67f8152b435407278d48545850b05bf16`

Verify the hash before reporting. A verdict citing any other bytes is void.
Every finding must cite this hash.

## What the document is

It is an implementation task packet: a specification handed to a build
agent as its sole instruction set. It specifies a pure function
("the render") that assembles a list of static text blocks and attaches
them to a dispatch packet, plus the test obligations, the file boundary
the build may touch, and a set of decisions escalated to a human.

Its authorities, which the packet may cite but never re-word:
- `v3/implementation/contracts/ch13-context-block-v2-contract.md` (ratified C-rows)
- `v3/adr/ADR-019-declared-schema-for-structural-definition-rules.md`
- `v3/implementation/plan.md` §13
- `v3/model/units/l2b-pseudocode/*.txt` (the model pseudocode it realizes)
- the sibling packet `v3/implementation/packets/ch13-p1a-context-definition.md`, already built

## What has already been done — do not re-derive it

Seven internal review rounds ran. Six measurements (M1–M6) recorded in the
packet were each reproduced by independent reviewers. The 25-file boundary
was verified by building the change in a throwaway copy. Machine counts,
contract-anchor fidelity and pointer confinement all pass.

Your value is where an internal panel is structurally weak: an independent
read of whether the specification, taken as the ONLY input a builder has,
actually determines the build it claims to determine.

## Charter — four questions

1. **Sufficiency.** Read the packet as a build agent would, with no other
   context. Is anything it obliges under-determined — a rule whose correct
   implementation a competent reader could not derive, a duty with no stated
   carrier, or an instruction that names a surface that does not exist?

2. **Counterexample search on the declared test obligations.** The packet
   declares thirteen test families as disciplines over parameterized
   memberships. For each, construct the most plausible WRONG implementation
   of the rule it guards, and check whether the family's stated document
   composition would actually distinguish it. A family whose fixture cannot
   separate right from wrong is the failure class this review exists to find.
   Note: fixture-level enumeration is deliberately deferred to build time; do
   not report its absence. Report only a membership rule that cannot
   discriminate.

3. **Conformance against the cited authorities.** Spot-check the packet's
   contract citations against the ratified rows: does each row preserve the
   cited rule's meaning, and does any row quietly widen or narrow it?

4. **Internal consistency.** Any statement that contradicts another statement
   in the same document, any count that disagrees with the list it summarizes,
   any cross-reference that resolves to the wrong target.

## Specific claims worth independent measurement

Each of these is load-bearing and cheap to check against the tree:

- The packet says the render performs three indexed record lookups and guards
  two, exempting a third with a stated reason drawn from a declared
  cross-rule. Check the count and the exemption.
- It says a record key class in `v3/src/definition/schema/templateFormat.ts`
  admits identifiers that collide with names inherited from the base object
  prototype, and that a plain record therefore returns an inherited value for
  such a key. Check both halves.
- It says one recorded measurement (M6) shows exactly one `@ts-expect-error`
  directive in `v3/src` changes character when a required field joins a type.
- It says the render's decided signature omits a parameter the model
  pseudocode spells, on the ground that the pseudocode body never reads it and
  that this mapping is common practice in the tree.
- It records a pre-existing defect in `v3/src/kernel/kernel.ts` that it
  deliberately does not repair, routing it instead. Check that the routing
  decision is right — i.e. that the file is genuinely outside the packet's
  declared boundary.

## Evidence rules

If your environment cannot run something, name the command and the exact
error rather than inferring. Say explicitly which of your conclusions rest on
evidence you did not reproduce yourself.

## Verdict schema — return exactly this

```
BASIS HASH: <the sha256 you verified>
VERDICT: PASS | FAIL
FINDINGS: <numbered; each with severity BLOCKER/MAJOR/MINOR, a one-sentence
statement, the concrete scenario in which the build goes wrong, and the
smallest fix; classify each as product / packet-docs / test-evidence>
EVIDENCE GAPS: <what you could not reproduce, with the command and error>
CONSIDERED AND CLEARED: <one line each>
```
