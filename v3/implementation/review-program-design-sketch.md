# The review program — a design sketch for the boundary review

Status: SKETCH, 2026-08-06 — boundary-review input, distilled from a
user/general design conversation held after the P3 close and the
user-elected design round. NOTHING here is enacted: no rule, no file
format, no threshold. The six-dial structure and the learning loop are
the deliverable; the values are deliberately left to the loop itself.

## 0. The betting frame (the organizing idea — read this first)

**Every unit of review spend is a WAGER that prevention costs less
than cure.** The alternative baseline is always available and always
legitimate: build it as it comes, ship it, and carve the system into
shape against production defects. Up-front review is justified only
where that baseline's expected cost is higher — and that is a
per-artifact, per-context bet, not a universal truth.

The frame is not decoration; it names every part of the program:

- **Bet sizing** — how much compute a given artifact's review deserves
  (the stakes dial: blast radius × novelty).
- **What you bet on** — which defect classes you pay to look for (lens
  selection); a SKIPPED lens is a bet AGAINST that class being present.
- **When you stop betting** — the exit policy; chasing a dry lens is
  paying premiums above actuarial value.
- **Which winnings you collect** — materiality triage; a finding fixed
  is a payout claimed, a finding recorded-unfixed is a bet that it will
  not bite before its scheduled revisit.
- **Settlement** — outcomes: a recurrence, a production incident, a
  parity break, an empty closing round. A bet without a stake, a
  reason and a settlement path is not a bet — it is a mood. The
  RECORD discipline below is what turns judgments into settleable bets.
- **Calibration** — the learning loop: settled bets adjust the odds
  (the priors) for the next wager.

Noted for the record: the user observes that agent-orchestration
schemes built explicitly around betting mechanics are appearing in the
wild. No mechanism is adopted from that here — but the convergence is
worth watching, and the vocabulary above keeps the door open.

## 1. The problem, in six agreed foundations (the user's frame)

1. One LLM round is not inherently reliable.
2. A different model finds what the base model does not (the
   cross-model arm is this, institutionalized).
3. Intent transfer is hard: a spec a human feels is complete still
   yields holes to an LLM reader.
4. The implementing agent meets those same holes: it either stops or
   fills them itself — intent drift and implementation drift.
5. Autonomy means the human enters only where needed: some findings
   resolve mechanically, others are genuine judgment.
6. The review loop has a paperclip failure mode: findings that are
   REAL but immaterial in context get fixed, the fix complicates the
   artifact, the complication yields new findings — a runaway
   direction that is not progress.

## 2. The measured evidence (all in this repo, all with receipts)

- **Unbounded loop, fixed criterion** (P1 overbuilt line): 7 rounds,
  11→6→5→2→2→2→3 findings, guard code ×1.85, every finding real and
  most out of purpose — the paperclip mode, measured. Reset by the
  user; postmortem in pairflow-notes.
- **Bounded loop, fixed criterion** (P3 build): 3 rounds, 6·6·0,
  closed by itself — AND structurally blind to a whole class
  ("declared, consumed, but unresolvable"), which shipped green.
- **New criterion, one round** (the user-elected design round): after
  the 0-finding close, 14 findings incl. 4 design errors — the yield
  curve resets on a criterion change, not on more rounds.
- **Adaptive exit, one precedent** (P3 audit arc): stopped at round 2
  of 3 on a composition signal (findings shifted from substance to
  bookkeeping), user-ratified.
- **Independence pays** (ch12 audit, 2026-07-22): arm + mechanical
  cross-check caught more than either alone.

Conclusion the evidence forces: the axis is NOT budget size. Rounds
on one criterion have steeply diminishing returns; orthogonal
criteria reset the curve. Both failure modes (paperclip; blind spot)
are real, measured, and opposite.

## 3. The six dials

1. **Budget cap** — the hard backstop (currently: 3 rounds default).
   Mechanical. Exists.
2. **Lens taxonomy** — the accumulated defect-class catalog (the
   unrun-measured family and its five forms; decoration/unconsumed;
   unresolvable references; restatement/paraphrase; boundary-kept
   rows; non-discriminating fixtures; …). Grows by episode; every
   class found once is a lens candidate, found twice is a
   STRUCTURAL-GUARD candidate (graduating out of review entirely —
   review capacity is for judgment).
3. **Ex-ante selection** (judgment): WHICH lenses for THIS artifact —
   load-bearing surfaces, what changed, what has never been looked
   at, stakes, lens cost. Includes the null case: some artifacts
   warrant zero external rounds.
4. **Ex-post materiality** (judgment): WHICH findings to fix. Real +
   in-scope ≠ worth fixing; a fix that opens more surface than it
   closes is the paperclip's first step. Dispositions: fix-now /
   record-as-debt / structure-candidate / reject-with-reason — never
   silent.
5. **Stakes-scaled resourcing**: the budget is a parameter set by the
   bet-sizing judgment, not a constant.
6. **Signal-based exit under the cap**: continue / stop / SWITCH
   LENS decided from per-round yield composition (the ratified
   per-round classification line is the data source). The
   continuation signal is NEVER raw finding count (that reopens the
   paperclip); it is class composition and materiality. The cap
   remains as the backstop for wrong exit rules.

Existing rules re-read in this frame: the threat model is a frozen
ex-ante exclusion; carried-scope a frozen ex-post bucket; the
proportionality tripwire a materiality alarm; the ≥2-row admission
test and WATCH-first are frozen materiality thresholds. The dials
name the layer those rules were always samples of.

## 4. The learning loop (dials 3–6 all ride the same one)

- **RECORD**: every judgment is explicit, reasoned, and written —
  the lens plan ("these lenses because…; NOT these because…"), the
  budget with its sizing reason, the exit with its signal, every
  unfixed finding with its reason. Hand-assembled, trajectory-line
  style; ten-second ceiling; never tooled.
- **SCORE** (mostly mechanical): at checkpoints (phase close,
  boundary) reconcile — which past judgments received outcome data?
  A skipped lens's class surfaced later → miss. A recorded-unfixed
  finding recurred/bit → miss. Final rounds ran empty → overspend.
  A fix's byproducts exceeded the defect → paperclip datum.
- **UPDATE**: threshold-based defaults move (two strikes promote; k
  dry uses bench a lens); all automatic updates are CANDIDATE-grade.
- **Two weight tiers, plus one**: automatic updates are candidates;
  USER rulings are ratified-grade and override; PRODUCTION evidence
  (the outer loop, §6) is the strongest descriptive weight of all.
- **Anti-Goodhart**: scoring uses outcome-side signals only
  (recurrence, incidents, parity breaks, byproduct rates, empty
  rounds) — never activity proxies (finding counts, fix counts).
- **The decay path** — the part this process has never had: weights
  must be able to WEAKEN. Lenses with k dry uses get benched
  (recorded, revivable); rules that never fire become retirement
  candidates. Wisdom is PRUNED case law; an append-only rulebook is
  the register tower's second coming.

## 5. The single-home question (deliberately undecided)

The taxonomy + priors need ONE home at the point of consumption —
the charter-authoring surface (a charter form-authority template, as
task-packet-template.md is for packets), since ex-ante selection
happens exactly there and outcome updates flow back there. The
process-log stays the EPISODE record; the home holds CURRENT state —
never reconstruct state from history. Anti-mirror constraint binds:
one home, pointers elsewhere; if this turns into a second decision-
ledger, it has failed. Exact form: a boundary-review decision.

## 6. The outer loop (the outermost judge; nothing built now)

Production reality settles the biggest bets: whether up-front review
was worth it at all, per artifact class. When a live defect surfaces,
one question set runs, each branch teaching a different dial: which
lens would have seen this? — existed-but-skipped (ex-ante prior),
benched (decay decision scored), found-but-triaged-unfixed
(materiality threshold), genuinely novel (taxonomy grows). Incident-
triggered, same reconciliation ritual, highest evidence weight. The
signal is slow and confounded, and v3 is not yet live — the ratified
dogfooding checkpoint is the current proxy. Provenance is already
sufficient AS A BYPRODUCT (charters carry lens lists, verdicts carry
classified findings, carried-scope carries reasons, everything
hashed): tracing "was this class ever considered?" is a grep, not
archaeology. Nothing further is built for this now.

## 7. What this sketch deliberately does NOT do

No thresholds, no file formats, no new rules, no template edits. The
next act is a boundary-review discussion that either enacts a minimal
form of the record-and-reconcile ritual or consciously defers it.
The irony guard binds: any enactment that grows faster than the
judgment quality it buys is itself a paperclip.
