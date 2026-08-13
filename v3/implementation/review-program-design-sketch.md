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

## Appendix A — the P3 calibration harvest (recorded 2026-08-07)

The betting frame's first full campaign, recorded HERE because the
distilled priors otherwise live only in session context and report
prose — and this file is what the boundary review reads. Receipts:
the closing reports and charters under
`ch13-rederivation-arm/p3-aftermath/` and the process-log entries.

### The bet ledger (six stated-scoreable bets, in order)

1. **The silent-four fold** — "1+1; four NAMED cases, proven
   guard-generation method." LOST: verification found four MORE of
   the same class. Lesson: the names were samples of an OPEN class —
   "does every name resolve" was a wide question in narrow clothes.
2. **The stakes-elevated hunt** (user-elected) — "2; criticality
   re-rating of the foundation layer." WON: 11 in-scope defects
   (a crash, two silent validation holes) in code past four prior
   reviews. Lesson: foundation stakes × un-run lenses buy real
   findings.
3. **The resolver unification** — "refactor+1+1; known shape (the P1
   precedent), touches the engine core." HALF: the refactor exact
   (zero behavioral delta), the verification found a REMAINING second
   model (the normalizer). Lesson: derive scope from the PRINCIPLE
   ("no second model"), never from the named component ("the gate").
4. **The finishing act** — "fold+1+1; three named changes; item 2
   changes runtime semantics, which is where surprises live." Items
   landed; the closing CLAIM (no silent class remains) was falsified
   four ways in one pointed round. Lesson: size for the claim being
   established, not for the item list — and the semantics hedge was
   correct.
5. **The per-instance act** — "fold+1+1; known family member, keying
   tool in hand; re-keying core run state is where surprises live."
   NEAR-EXACT: the predicted surprise arrived (the act's own key-lane
   regression) and the frame absorbed it.
6. **The closing sweep** — "fold+1(scoped)+1; three named sites of a
   SETTLED class from a COMPLETE enumeration." EXACT: 0/0/0, reserve
   unspent — the sequence's first precisely sized bet.

### The distilled priors (the layer that must not evaporate)

- **The closed-list test:** a bet on named items is narrow ONLY if
  the names come from a complete enumeration under a settled
  principle; otherwise the list is a costume on an open class. (Bets
  1 and 6 carry near-identical wording and opposite outcomes — this
  is the discriminator between them.)
- **Surprise homes:** runtime-semantics changes and core-state
  re-keying warrant a budget hedge (the hedge was written and correct
  twice: bets 4 and 5).
- **Claim-establishing acts** are sized for the claim, and their
  verification round is pointed AT the claim as a falsification —
  one pass suffices when pointed (bet 4's round).
- **Complete enumeration converts an open class into a closed list**
  (round 8's matched/coarser inventory of ALL walk state, the fine
  items included) — it is the bridge from bet-1-shaped losses to
  bet-6-shaped wins.
- **The unification family, three members:** one view of the
  document (P1) → one resolver for addresses → per-instance state.
  Each ended a class by DELETING a model, never by adding a guard;
  each successor was found by one standing question, now a lens:
  "does a SECOND MODEL of X still exist anywhere?"
- **Both-orders crosstalk:** suppression symmetric in order is
  invisible to order-swap tests; the guard shape is the sharpened
  both-orders fixture PLUS the suppression negative (so "no
  crosstalk" cannot be bought by never suppressing).
- **Instrument hygiene:** the measurement is part of the bet —
  concurrent suite runs poisoned a reviewer's regression lens once,
  and the arm runner's byte guard tripped on its own output file for
  a full frame. The meter must also be metered.

### The lens cupboard for THIS substrate, at P3 close

Run, with yield: accident/sloppiness ×3 frames · design/direction ×1
(14 findings) · closure/dangling ×2 · historical runtime families ×1
(4, incl. the `constructor` crash) · spec-vs-interpreter ×1 (7) ·
state-grain full enumeration ×1 (4) · scoped-site verifications
(final: 0/0/0). Judged EMPTY at close: no un-run lens with a
plausible prior remained — the next lens is P4's real consumption
(the outer loop). New lens candidates minted for the taxonomy:
unresolved reference / closure completeness; state grain
(coarser-than-described); both-orders crosstalk; the second-model
existence question.

### Operational note — the provider content filter

Three charter kills across the campaign, all on security-flavored
wording; neutral QA vocabulary (conformance, counterexample,
sensitivity check) has since run clean repeatedly. The vocabulary
note travels in every charter until a charter-template home exists.

## Appendix B — the ch13-p1a mid-packet harvest (recorded 2026-08-08)

Recorded mid-packet because both priors change how the SAME packet's
next round runs; the packet's full bet ledger follows at the
boundary, scored against outcomes, per the learning loop.

### The distilled priors

- **Necessity precedes truth.** Every claim in a spec is a
  truth-maintenance liability someone must verify; the deletion test
  (the delegation litmus: "what does the implementer do wrong
  without this sentence?") runs BEFORE any measurement duty.
  Correcting a claim that should have been deleted is double waste —
  and rounds spent maintaining deletable claims are a spec-authoring
  cost, not a review yield. Born 2026-08-08: the packet's round-2
  non-convergence (~46 → ~61 findings) was first accounted as
  "falsehood removal, therefore not over-detailing"; the user caught
  the non-sequitur — that defense holds only for claims that pass
  the necessity test first.
- **Hand-assembled MEASURED sets are a defect class.** A set or
  equivalence assembled by hand and stamped MEASURED ages the moment
  the tree moves, and erred three times in one round (a trigger-tag
  set missing an entire bypass path, a fixture list 37% short
  against a run of the simulated growth, an order-equivalence claim
  with a live counterexample). The durable form is the claim
  grammar's other pair: a PARAMETERIZED derivation rule with a named
  owner the build runs, plus today's measured values kept as a floor
  ("a re-run may extend, never drop"). Ex-ante lens candidate for
  every future packet's set-shaped claims.
- **Practice-born gates are process debt (recorded 2026-08-13, the
  user's ruling at the ch13-p1b build launch).** A standing human
  checkpoint that no ratified mode machinery produced — the
  "stage-plan approval" the general's kickoffs carried at both ch13
  builds — works against the autonomy ramp twice over: it bypasses
  the signal-born gate design (flags/STOPs decide the mode, §5.5),
  and it HIDES systemic defects — a misreading hand-fixed at an
  informal gate never becomes a recorded finding, so the packet or
  process gap it signals is never repaired. The measured case: the
  p1b session raised its two real questions from its OWN stop
  discipline; the mandated gate added nothing. Disposition: retired,
  not codified. Kickoffs are mission + pointer; gates come only from
  the ratified machinery, and a cold builder's misreading is
  process-fix DATA, not something to intercept.
