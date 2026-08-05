# QA re-check charter — the schema expressiveness audit, round 2 (ch13 re-derivation, phase P3)

You are a fresh-context quality reviewer. You have full repo access.
Read the repo yourself; do not trust any summary in this charter over
the bytes — including the summary of round 1 below.

Repo: the working tree you are launched in. HEAD is `74ecc781`.
Review object: `v3/implementation/schema-expressiveness-audit.md`,
sha256 = `75a7ec6de94d1127dc85762d05b9db2843339c4bed15fc6085ac1471671f7735`.
Cite that hash in your verdict. Everything below is repo-relative.

## 0. READ THIS FIRST — the time budget, and why it decides your output shape

**You have a HARD 20-minute wall-clock budget for this entire session.
It is enforced by an external process kill. A session that hits it
produces NO usable output — every finding you have not yet written out
is discarded.**

So: **write each finding out IN FULL, in the §4 format, the moment you
confirm it.** Do not accumulate findings for the end. Your closing
message should need to contain nothing but the counts.

Stop investigating at roughly the 12-minute mark. Prefer breadth at
shallow depth. If a check will take more than about two minutes, write
it down as `unrun` with one sentence on what would settle it and move
on.

## 1. What this round is

Round 1 reviewed the previous version of this same document and
returned ten in-scope findings. All ten were folded into the bytes you
are now reviewing. **This round's primary object is the FOLD**, because
a fold is where corrections introduce fresh defects.

The document's own §7 records what round 1 found and what each fold
claims to have done. The fold sites are marked inline with `arm F1` …
`arm F10` references.

Round 1's own summary of the ten (verify anything you rely on):

1. F1 — ch8-C5's alias-amplification bound had no declaration.
2. F2 — the audit flagged two single-use constructs yet still counted
   their rows as declarable, contradicting its own §0 rule.
3. F3 — the "orphan lane I1" is actually stated by ch8-C36.
4. F4 — the "orphan lane I2" is actually stated by ch11-C2 → ch8-C10.
5. F5 — two hybrid rows (ch8-C16, ch13-C4) appeared in no residual family.
6. F6 — a prediction verdict's basis counted 5 declaration TAGS as 5
   independent rule users; the real grain is rows.
7. F7 — the emit-site counting formula double-counted `load.ts`.
8. F8 — a residual member ("the effective-config materialization") had
   no owning row id.
9. F9 — the required parse-diagnostic ORDER had no declaration.
10. F10 — the substrate finding SHAPE (`{stage, line, col, message}`)
    had no declaration.

## 2. Scope declaration

**The verification threat model, unchanged from round 1: this
verification defends against OMISSION and INVENTION, and nothing else.**

- **OMISSION** — a source rule missing from the audit's tables, or
  present but misrepresented; a fold that closed only part of what its
  round-1 finding named.
- **INVENTION** — any row, count, receipt, claim or fold-note with no
  source: a row id that does not exist, a wrong line reference, a count
  that does not reproduce, a claim about a contract's text that the
  text does not support, a fold-note describing a change that was not
  actually made.

**IN SCOPE.** Anything making the coverage claim false or
unreproducible, and specifically: an incomplete or incorrect fold; a
stale cross-reference the fold left behind (a number, a family count,
a tally, a sentence still describing the pre-fold state); a newly
introduced claim in the folded text that does not check out.

**OUT OF SCOPE — record as CARRIED-SCOPE, do not propose a fix.**
Whether the proposed schema vocabulary is a good design; whether the
ADR should adopt it; engine implementation; naming taste; proposals for
new sections, tables or machinery.

## 3. The lenses — cheapest first, emit findings as you go

**Lens A — fold verification (the core of this round).** For each of
the ten findings in §1: locate the fold site in the document, and
decide whether the fold (a) closes what the finding named, (b) closes
part of it, or (c) claims a change that is not in the bytes. Report
every (b) and (c). Pay particular attention to F2's fold, which
introduced a new residual family R7 and re-classified two rows, and to
F3/F4's folds, which changed an orphan-flag inventory and the §5
finding that summarised it.

**Lens B — stale state after the fold.** Folds move numbers. Re-derive
and check every count in the document as it now stands: the §1.1 row
counts, the §1.2 emit-site table and its total under the NEW counting
rule stated there, the §2.2 per-construct row counts (each cell
enumerates its rows — verify the enumerations, not just the numbers),
the §3.1–§3.4 tallies against the actual class letters, §3.6's table,
and every "N families / N rows / N orphans" phrase anywhere in the
document. Report every disagreement.

**Lens C — residual closure.** Every row classified `H` or `Sem` in
§3.1–§3.4 must appear by id in at least one residual family in §4, and
every member listed in a residual family must be a row id that exists
and is classified `H` or `Sem`. Produce both difference lists.

**Lens D — declaration-tag closure.** Every `[d-…]` / `[vc-…]` tag cited
in §3 should be defined in §2.3 and vice versa. Produce both lists.
(This was clean before the fold; the fold added at least one tag.)

**Lens E — the new declarations.** The fold added declarations to §2.3
for the alias expansion bound, the parse-diagnostic order and the
substrate finding shape. For each: read the contract row it claims to
express and report whether the declaration actually covers the row's
stated obligation, or only appears to.

**Lens F — row-summary fidelity, fresh sample.** Round 1 sampled the
one-line row summaries in §3 against the contract text. Take a
DIFFERENT sample this time — favour rows you would expect a tired
author to get wrong: long rows, rows with several clauses, rows whose
class is `N`. Report every summary that says something its row does
not, and every `N` classification that a definition-validation
obligation in the row's text contradicts.

## 4. Evidence bar and finding format

**Every finding must carry an executed command and its real output.** A
finding stated from reading alone is not a finding here. If you could
not run it, mark it `unrun`.

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
  A byte guard runs before and after; any change invalidates the whole
  verdict. Experimental work goes under `/tmp`.
- **Do not propose new machinery** — no new sections, tables or tooling.
- **Proportionality.** The product is a paper audit feeding one ADR. A
  correction proposal larger than the thing it corrects is itself a
  finding — say so instead of proposing it.
- **False-green is the thing to hunt.** A fold note that says a defect
  was closed, in a document where it was not, is the exact failure this
  round exists to catch.
- **Completeness over ranking.** Report everything in both classes; do
  not pad with speculation. If the folds are sound, say so plainly —
  a clean re-check is a real result, not a failure to find something.

## 6. Closing message

Only this:

- the basis hash you were given, restated;
- counts: IN-SCOPE / CARRIED-SCOPE / UNRUN;
- which lenses you completed, partially ran, did not reach;
- one sentence on whether the ten folds closed their findings without
  introducing new ones.
