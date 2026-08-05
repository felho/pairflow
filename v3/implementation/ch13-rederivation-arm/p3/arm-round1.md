# QA review charter — the schema expressiveness audit (ch13 re-derivation, phase P3)

You are a fresh-context quality reviewer on a single ANALYSIS DOCUMENT.
You have full repo access. Read the repo yourself; do not trust any
summary in this charter over the bytes.

Repo: the working tree you are launched in. HEAD is `2044b3bf`.
Review object: `v3/implementation/schema-expressiveness-audit.md`,
sha256 = `d506722e7aed2485965de315093780ae7c742e5af333e5d9fdd2e372271dcc65`.
Cite that hash in your verdict. Everything below is repo-relative.

## 0. READ THIS FIRST — the time budget, and why it decides your output shape

**You have a HARD 20-minute wall-clock budget for this entire session.
It is enforced by an external process kill. A session that hits it
produces NO usable output — every finding you have not yet written out
is discarded.** An earlier session on a different charter in this repo
spent its whole budget investigating, planned to write up at the end,
and was killed mid-write-up. All of its work was lost.

So the rule is: **write each finding out IN FULL, in the §4 format, the
moment you confirm it.** Do not accumulate findings for the end. Your
closing message should need to contain nothing but the counts, because
everything else is already written.

Budget shape: stop investigating at roughly the 12-minute mark and
spend the rest consolidating. Prefer **breadth at shallow depth**. If a
check looks like it will take more than about two minutes, write it
down as `unrun` with one sentence on what would settle it, and move on.
An honest short verdict that survives beats a thorough one that dies.

## 1. What the document is

The audit asks whether the ratified structural rules of four format
surfaces can be re-expressed as DECLARED SCHEMA instead of hand-written
prose rules plus hand-written validator code. It has three source sets,
all claimed to be closed lists:

1. every rule row of four contract files in
   `v3/implementation/contracts/`: `ch8-template-format-contract.md`,
   `ch11-gate-format-contract.md`, `ch12-runtime-core-contract.md`,
   `ch13-context-block-contract.md` (the last one is `superseded` —
   its rows are frozen but remain the ratified decision record);
2. every check the implemented validator performs —
   `v3/src/definition/{load,validate,admit,errors}.ts` plus the three
   delegated gate-config schemas in
   `v3/src/gates/{threshold,previousReviewerVerdict,process}.ts`;
3. format elements defined but not yet implemented — scoped by an
   explicit decision to the ch13 context surface only.

Its output is a coverage table that classifies EVERY enumerated rule
and maps it either to a proposed schema declaration (§2.3 of the
document, tags in `[brackets]`) or to a named residual family (§4).

No engine exists. Nothing in `v3/src` was changed. The document is
paper, and it is the input to an ADR that has not been written yet.

## 2. Scope declaration — read this before deciding what counts

**The verification threat model, ratified for this round: this
verification defends against OMISSION and INVENTION, and nothing else.**

- **OMISSION** — a rule that exists in one of the three source sets and
  is MISSING from the audit's tables, or is present but its stated
  content misrepresents the source rule.
- **INVENTION** — a table row, count, receipt, or claim in the audit
  that has NO source: a contract row id that does not exist, a code
  line reference that is wrong, a count that does not reproduce, a
  "measured" claim whose command returns something else.

**IN SCOPE.** Anything that makes the coverage claim false or
unreproducible: a missing row, a wrong row id, a miscount, a receipt
whose command does not return what the document says, a classification
that contradicts the row's own text, a declaration tag cited in a table
but not defined in §2.3 (or defined but never cited), a "declarable"
verdict that the row's text plainly defeats.

**OUT OF SCOPE — record it as CARRIED-SCOPE, do not propose a fix.**
Whether the proposed schema vocabulary is the BEST design; whether the
ADR should adopt the direction; engine implementation strategy;
performance; naming taste; anything about how a future engine should be
built. Those are the ADR's business, not this round's. Also
out of scope: proposing new sections, new tables, or new machinery for
the audit to carry.

This bounds the *worklist*, not your *reading*. Read what you like;
classify honestly; report both classes.

## 3. The lenses — ordered cheapest-first, so a kill costs you least

Work them in this order and **emit findings as you go**.

**Lens A — the counts (pure command work, do this first).** Every count
in the audit's §1 and §3.6 is claimed to be derived. Re-derive each one
yourself and report every disagreement:
- the per-contract row counts (38 / 41 / 27 / 19, total 125);
- the emit-site counts per file (§1.2's table) and the total 112;
- the class tallies per contract in §3.1–§3.4 versus the §3.6 totals,
  and versus the actual class letters in the tables (count the letters,
  do not trust the tally lines);
- the issue-code list in §1.2 versus what `v3/src` actually contains.

**Lens B — row coverage both directions (the core of this round).**
- OMISSION: extract every `C<n>` row id from each of the four contract
  files and diff against the row ids appearing in §3.1–§3.4. Report any
  id present in a contract and absent from the table, and any id in the
  table that the contract does not have.
- INVENTION: for a sample you choose across all four contracts —
  breadth over depth, and include at least a few from each — read the
  contract row's real text and check that the audit's one-line summary
  is a fair statement of it and that its class letter is defensible on
  that text. Report every summary that says something the row does not.

**Lens C — the implemented-lane table (§3.5).** It cites file and line
numbers. Spot-check as many as your budget allows, spread across
`validate.ts`, `admit.ts`, `load.ts` and the three gate files: does the
cited line actually contain the check described? Report every wrong
anchor. Also check the three "flags" (I1, I2, I3) — the audit claims
these are implemented lanes with no ratified contract row backing them.
Verify each claim by searching the contracts for a row that does back
it; a flag raised against a rule that DOES exist is an invention.

**Lens D — declaration-tag closure.** Every `[d-…]` / `[vc-…]` tag cited
in the §3 tables should be defined in §2.3, and every tag defined in
§2.3 should be cited somewhere. Produce both difference lists.

**Lens E — the prediction verdicts (§4.1) and the residual (§4).** The
audit claims to CHECK an earlier prediction rather than assume it, and
issues four verdicts (two REFUTED, two PARTIALLY REFUTED). For each,
the audit's own basis is a claim about how many independent rules use a
construct. Re-count those users from the tables and report any verdict
whose stated basis does not hold. Separately: the residual families R1–R6
each list members; check that every member id exists and that no row
classified `Sem` or `H` in §3 is missing from every residual family.

**Lens F — receipts (§6).** Run each receipt command as written and
report any whose real output differs from the recorded result.

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
WHERE: file:line (or the audit's section)
EVIDENCE:
  <exact command>
  <exact output>
WHY IT MATTERS: what a reader of this audit concludes wrongly
FIX SKETCH: (IN-SCOPE only) the smallest correction
```

## 5. Rules of engagement

- **Do not modify the repository.** Not one byte, tracked or untracked.
  A byte guard runs before and after this session; any change
  invalidates the entire verdict. Do experimental work under `/tmp`.
- **Do not propose new machinery.** No new tables, no new sections, no
  tooling. If you think something is missing, say so in prose.
- **Proportionality.** The product is a paper audit feeding one ADR. A
  correction proposal larger than the thing it corrects is itself a
  finding — say so instead of proposing it.
- **False-green is the thing to hunt.** The audit's value is entirely
  in whether its lists are complete and its numbers reproduce. A table
  that LOOKS exhaustive while missing rows is the failure mode this
  round exists to catch.
- **Completeness over ranking.** Report everything in both classes. Do
  not silently drop small findings; do not pad with speculation.

## 6. Closing message

Only this, because everything else is already written:

- the basis hash you were given, restated;
- counts: IN-SCOPE / CARRIED-SCOPE / UNRUN;
- which lenses you completed, which you partially ran, which you did
  not reach;
- one sentence on whether the audit's coverage claim — "zero
  unclassified rows, every row traceable to a source" — survives what
  you ran.
