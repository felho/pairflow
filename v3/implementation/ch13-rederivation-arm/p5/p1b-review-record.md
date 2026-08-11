# P5 review record — the ch13-p1b packet (context-dispatch)

The committed evidence home for the P5 phase's dispatch half, beside
`review-record.md` (the definition half's). Same genre, same binding.

**GENRE, binding on every later reader and reviewer: this file is a LOG —
a dated history of what was decided, measured and paid. Work flows
exclusively from the packet; NO act may be executed from this file, and
its live consistency with the packet is deliberately NOT a review
subject. An entry describes the moment it was written.**

## 1. Authoring basis

Content enumerated ONCE, at `packets/ch13-p1a-context-definition.md`'s
out-of-scope row, and deliberately not repeated in plan §13.4's own
ch13-p1b row — the two cannot drift because only one of them says what
the packet contains. Authorities: the ch13v2 contract (double-locked,
schema fingerprint in its latest ratification block), ADR-019 including
D12, and the form/packet authorities.

D12's forward-scope expectation ("no second schema re-lock") was an
AUTHORING obligation this packet had to discharge rather than inherit.
D2 discharges it: CONFIRMED, and mechanically refutable — the
declaration file is absent from the file boundary, so a build that
re-locked would be outside its own boundary.

## 2. Shape

16 D-rows (11 anchored / 4 derived / 1 new-decision), 13 acceptance
families, 12 dimensions, 25 boundary files, 16 mirror rules.
Difficulty A1·B1·C1·D0·E1 = Σ4, Medium. Classification `projection`,
agreeing with plan §13.4's prediction.

## 3. Rounds

Seven internal panel rounds. The product-level catches that survived to
the packet: the run-scope blindness at C5, the gates-record prototype
hazard, C14's byte scope resolved to COLUMN grain, the de-discriminated
compile-negative, role symmetry in the shipped catalog, and a live
defect in `v3/src/kernel/kernel.ts` that is routed rather than repaired
(the file is genuinely outside the declared boundary — the arm checked
the routing decision independently and confirmed it).

**Instrument defect, round-level.** The measurement instrument was
Vitest-only for several rounds and is blind to compile errors; it
missed four construction sites. Repaired by adding M4, a `tsc --noEmit`
sweep, and by making D6's floor two-instrument. The lesson is the
instrument's, not the round's: a green suite is not a green tree.

**Process finding, carried to the boundary.** The dominant authoring
defect in this packet was NOT wrong rules — it was correct rules whose
enumerations and lane lists were not propagated when the rule widened.
It occurred SEVEN times (D3's examples, D4's record list three times,
families 2/4/5, dimension 6), each caught by a later round rather than
by the act that widened. This is a folding-discipline defect with no
instrument behind it: nothing mechanical relates a rule's statement to
the enumerations that serve it. Recorded here as the episode's cost;
whether it earns machinery is the boundary's call, not this packet's.

## 4. The arm rounds — order inverted on the owner's call

The owner called the external arm on the approve-ready bytes BEFORE
ratification, with no eighth internal round. Both gate-1 passes are
recorded beside this file (`p1b-arm-gate1-verdict.md`,
`p1b-arm-gate1-recheck-verdict.md`). Gate 1 returned FAIL with two
findings, both on the shipped-catalog flag; the re-check closed both and
returned two new ones, one MAJOR on the shipped body text and one MINOR
on the arity inventory's internal arithmetic.

The MAJOR is the episode's most instructive entry, because the failure
was not ignorance. The shipped body asserted that `availableOps` is the
set an actor may emit right now; the packet's own D5 row states, in the
same document, that authority narrowing is independent of transition
membership and that default derivation makes the narrowing invisible to
a lane set. The knowledge was present and did not reach the prose. It
was caught only by an instrument outside the authoring context.

## 5. Ratification acts (owner, 2026-08-11)

Five `approve-ratified` flags, taken one per message in EZX form,
flag 1 first as the only outward-facing decision: the shipped body's
exact bytes; the mode consequence and its aligned plan edit; the
build-choice names pinned verbatim; the de-discriminated compile-
negative; and the render's signature deviation.

Flag 1 was ratified TWICE. The first act ratified bytes the arm's
re-check then showed to be false about the mechanism; the corrected two
sentences were brought back as a re-ratification rather than folded
silently, because ratified bytes are not the authoring loop's to change.

Four flags route to the boundary: the contract-side C10 phrasing
asymmetry, the whole-packet blindness class, the mutation-pilot dual-run
data point, and the genre sentence for the model plane. A fifth was
added at the close — flag 10, below.

## 6. The two closing recordings the owner ordered

**(a) The arity census and its triage** —
`p1b-model-code-arity-inventory.md`, with the untruncated receipt
beside it. 15 arity divergences among 25 comparable realized rows.
Triage under the taxonomy the owner set: ONE information delta
(`payload_digest`, a branch-scoped deferral carrying a regrowth
obligation for the chapter that builds the schema-bearing branch) and
fourteen representational mappings in four categories. The render
decision is representational under that taxonomy — no information flows
through the dropped parameter in the model either.

**(b) The genre sentence for the model plane** — flag 9, routed to the
boundary, deliberately not minted here: *the pseudocode binds the
information flow and the semantics; the representation is free;
changing the information set is a packet decision.* No machinery is
proposed with it.

**Flag 10, added at the close on the owner's refinement.** Whether
`availableOps` should be capability-filtered is NOT a new item: the
model ledger already carries it (`l1` · capability-filtered-packet-ops
→ later, with `l1` · authored-capability-restrictions-in-the-baseline).
The boundary item records only WHEN it comes due — at v1-workflow
template authoring, where the model's own L1 example lives and where
this tree's unknown-key rejection of a `capabilityProfile` in a template
FILE stops giving way — plus the argument pair it will weigh: one
authority home (HANDLE) against the UX trap of showing an actor a type
it will be rejected for. No mechanism, no ledger edit.
