# QA review charter — the ch13 contract-v2 draft, on the approve-ready bytes

You are a fresh-context reviewer with full repo access at the repo
root. Read everything yourself; do not trust any summary over the
bytes. This is the external gate before a human ratification act: your
job is FALSIFICATION — find what the three panel rounds and the clean
close missed.

## 0. READ THIS FIRST — the time budget

**A HARD 20-minute wall-clock budget, enforced by an external process
kill; unwritten findings are lost.** Write each finding IN FULL the
moment you confirm it; stop investigating at ~12 minutes;
over-2-minute questions go down as `unrun` with one sentence.

## 1. The review object (verify the hashes FIRST; a mismatch voids your verdict)

| File | sha256 (first 16) |
|---|---|
| `v3/implementation/contracts/ch13-context-block-v2-contract.md` | `81f1daa9ac04a393` |
| `v3/src/definition/schema/templateFormat.ts` | `9368e5253d1163fa` |

HEAD `dc821f5b`. The contract is a DRAFT awaiting human ratification;
the ratifying act will byte-bind BOTH files (the contract-draft
template's schema lock). Decision sources you may consult: the
SUPERSEDED `ch13-context-block-contract.md` (frozen decisions; its
wording is dead), `v3/adr/ADR-019-*.md` (D4/D10/D11),
`v3/implementation/ch13-rederivation-arm/p4/` (probe receipts,
review record), `v3/implementation/plan.md` §13,
`v3/model/` (the model plane).

## 2. The claims this line makes (your falsification targets)

1. **Zero unmeasured claims:** every measurable statement in the rows
   carries an executed receipt (the PROBE-P4-* files) or a DERIVED
   marker with a named measurer. Hunt for a measured-shaped claim with
   neither.
2. **Zero structural restatement:** structural rules live ONLY in the
   declaration; rows cite tags and state decisions. Hunt for a row
   normatively carrying an attribute (grammar, keyset, default,
   message, grain) the declaration owns.
3. **Inheritance without loss:** the superseded contract's 19 rows +
   4 reopen decisions all live on (carried / schema-covered /
   deliberately dropped with reason) per the review record's §9 table.
   Spot-check 5 old rows of your choosing INDEPENDENTLY against the
   table's verdicts.
4. **The declaration is sound:** the ch13v2-rowed nodes compose with
   the engine (probe via `pnpm exec tsx` from /tmp against
   `v3/src/definition/schema/`), and the four DECIDED-HERE markers'
   receipts reproduce.
5. **Channel behaviour:** the stated symmetry scope (authored
   positions identical; `capabilityProfile` and the P5-declared
   produced positions as the named asymmetries).

## 3. Rules

Threat model: OMISSION and INVENTION against the decision sources,
plus any defect in the draft or declaration bytes. Findings outside:
CARRIED-SCOPE, one line. Do not propose fixes. Do NOT modify the
repository — not one byte; scratch under /tmp; a guard runs before and
after. Vocabulary: routine software engineering (conformance,
counterexample, sensitivity check). Run any suite ALONE, never
concurrently.

## 4. Finding format

```
### <CLASS> <n> — <one-line title>
CLASS: IN-SCOPE | CARRIED-SCOPE | UNRUN
WHAT / WHERE / EVIDENCE (exact command + output) / EXPECTED
```

## 5. Closing message

Only: HEAD + both hashes as YOU measured them; counts IN-SCOPE /
CARRIED-SCOPE / UNRUN; which of the five claim targets you exercised
fully/partially; the gates you ran (`pnpm v3:packet-lint`,
`pnpm v3:typecheck`, `pnpm v3:test` — alone); and ONE sentence: is
this draft ready for a human ratification act?
