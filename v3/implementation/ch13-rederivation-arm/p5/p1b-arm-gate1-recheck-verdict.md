# ch13-p1b — external arm, gate 1 RE-CHECK (the folded bytes)

The second gate-1 pass, run after the first round's two findings were
folded. Charter: three questions only — are the two findings actually
closed at the new basis, did the fold introduce anything new, and does
anything in three unrelated changes damage the document. The charter
named the shipped body text as the highest-value target, since it is
delivered verbatim to a language model at runtime.

## Invocation record

| | |
|---|---|
| Transport | the `gptsol` agent (the pin lives in the agent definition; the call passed no model parameter) |
| Model / effort | `codex/gpt-5.6-sol` / `high` — matches the current `arm-pin.md` row |
| Basis | `c2f65f62241d2fadff1f2792cba07282c3eef0ad0276abac25a9e525c3ae0fc3` |
| Charter | `/tmp` prompt, reproduced in substance above |
| Verdict | **FAIL** — both prior findings CLOSED, two NEW findings |

### Byte guard — with its limitation stated

HEAD, the target sha256, the porcelain hash and the full tracked-diff
hash are IDENTICAL before and after: the tracked tree and the reviewed
bytes are provably unchanged, which is what the guard exists to
establish.

The untracked-path list is NOT usable as evidence for this run: the
before-capture was written through a truncating pipe and lists one path
where the after-capture lists five. The four extra paths are this
session's own authored artifacts (this file's siblings and the packet
itself, which is untracked because it is new), not arm output — the arm
charter is read-only and its scratch space is `/tmp`. Recorded as an
instrument defect of the guard, not as a finding: the truncation is the
same `head`-in-a-pipe class that already cost one false trip earlier in
this packet's run.

## The two prior findings

**FINDING 1 (BLOCKER — the flag ratified wording while supplying none):
CLOSED.** The flag now carries the exact id and the complete body in
block-scalar form, and states that those bytes are what the approve
ratifies.

**FINDING 2 (MAJOR — the recommended body carried a v1 rule describing
machinery this system does not have): CLOSED.** The v1 rule is out, the
row records the measurement that killed it, and the shipped body
describes v3's actual mechanism.

## The two new findings

**NEW 1 — MAJOR, product. The shipped body asserted a coincidence as if
it were the mechanism.** The body called `availableOps` "the exact set
of operation types you may emit right now". Reproduced independently
here before folding: `dispatchIntent` sets the field to every
transition of the step, while the kernel's HANDLE separately rejects
`not_authorized` when `capability(template, step.role, stepId)`
excludes the type; `capability` returns an AUTHORED profile entry when
the template carries one and falls back to the step's transitions only
when it does not. The two sets therefore coincide exactly while no
template authors a profile — true of every template today, false of the
mechanism. The finding's weight is that the packet's own D5 row and
acceptance family 4 exist to hold precisely that distinction, D5 even
naming the default-derivation blindness as the reason its counterexample
is non-waivable: the shipped body contradicted its own packet's
authority rule.

FOLDED, and re-ratified by the owner because the withdrawn bytes had
already been ratified once. The corrected body describes `availableOps`
as the operation types the step can move on, and states that a
well-formed emit can still be rejected — for non-membership OR for role
authorization — with the rejection saying which. The corrected wording
is true both today and after authored narrowing arrives, which is what a
shipped body must be: it outlives the baseline that made the
coincidence hold.

The question of whether `availableOps` SHOULD be capability-filtered was
NOT opened by this finding and is not new: the model ledger already
carries it as `l1` · capability-filtered-packet-ops → later, with its
sibling `l1` · authored-capability-restrictions-in-the-baseline. It is
routed to the boundary as flag 10, which records only its due-date and
the argument pair.

**NEW 2 — MINOR, test-evidence. The arity inventory's categories did not
reconcile with its own measurement.** One row was counted twice across
two categories and another was omitted entirely, so the prose categories
did not sum to the measured 15. FOLDED in
`p1b-model-code-arity-inventory.md` (the sum is now checked in the file,
with the double-count and the omission named), and flag 8's prose
corrected from "a dozen"/"twelve times" to the measured FIFTEEN.

## What the re-check cleared

The rest of the shipped body against the adapter that implements it: the
per-attempt file channel and its environment variable, the exactly-two-
keys rule, and the silent no-output class every other shape produces.
Also cleared: the three unrelated changes named in the charter (the
ninth flag routed to the boundary, the signature flag's census clause,
and the two commits that landed from another line of work touching two
boundary files, whose measurement was re-run and reproduces unchanged).
