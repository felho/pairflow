# P5 review record — the ch13-p1a packet (context-definition)

The committed evidence home for the P5 phase (`ch13-rederivation-plan.md`
§3/P5): the packet's round records, probe receipts and bet ledger live
HERE, beside the panel/arm outputs — the packet stays clean. Everything
below is derived from repo surfaces at write time; nothing is recalled
from conversation.

The DISTILLED PRIORS this phase produced are NOT restated here: they
live in `review-program-design-sketch.md` Appendix B (recorded
2026-08-08, commit `f318e0dc`), which is the boundary review's reading
surface. This record carries the EPISODE — what was bet, what happened,
what it cost.

## 1. The split (autonomous, in-chapter, depth 1)

Plan §13.4's `ch13-p1 v2` row pre-authorizes `ch13-p1a`/`ch13-p1b` by
name. Run on the combined scope the risk gate trips two hard stops
(authority movement together with new runtime behaviour turned on; one
concept across 3+ surfaces) and the implementation-closure proof fails
three of its own tests. Shape: `foundation → activation`. The
assessment is materialized in the packet's `## Sizing/risk`; the plan
edit records the executed split and marks the live Packets-and-flow-mode
table for the mechanical next-packet derivation.

## 2. STOP 1 rulings (user-ratified 2026-08-08, at the round-1 decision point)

Three items, presented one per message, each with its rejected
alternative and a recommendation:

- **(a) The hook realization** — ruled **A**: stay inside ADR-019 D7's
  NODE flavour (declared entries of new hook kinds), refusing the
  one-hook alternative because an attribute at a new grain is the
  D8/D11 amendment pattern and would widen the vocabulary for a single
  user — D9's first tripwire.
- **(b) The C9 stand-down mechanism** — ruled **C**: expose the
  engine's existing failed-tag set on the run result, in the form the
  result already uses for the R3 residual. `engine.ts` joins the
  mutation boundary; the build is arm-obliged as guard machinery.
- **(c) The schema re-lock act** — ruled **A**: name the act in the
  contract-draft form authority (§4's lifecycle, §5's metric
  definition) as a separate `docs(v3)` act before the build, so the
  re-derivation experiment's reopen count stays true rather than
  explained.

**Correction owed and recorded** (surfaced by panel round 2, lens 2):
ruling (c) was presented on an incomplete option set. A live precedent
exists — `contracts/ch9-runner-contract.md` carries TWO ratification
blocks and records *"post-ratification reopenings: 0 (the two
ratification blocks are the initial ratification + the same-day C7/C10
one-value amendment, not reopenings)"* — i.e. the standing practice for
a second, non-reopening block is a recorded parenthetical on the draft's
own metrics line, with no form-authority edit, no prerequisite commit
and no non-green window. The ruling may stand on its merits; it was not
made against the real alternative space, and that is the general's
defect, not the user's.

## 3. The round-2 fold's scope ruling (user-ratified 2026-08-08)

Ruled **C with a gating refinement**: before any set-shaped claim is
converted to a PARAMETERIZED rule, the DELEGATION LITMUS runs on it
first ("what does the implementer do wrong without this sentence?").
A claim that fails is **DELETED, not converted** — truth-maintaining a
deletable claim is double waste. Only survivors get the pair: a
derivation rule with a named owner the build runs, plus today's
measured values as a FLOOR ("a re-run may extend, never drop"). The
prior behind the gate is Appendix B's *necessity precedes truth*.

## 4. Probe log (executed; scripts and outputs beside this file)

| Probe | What it measured |
|---|---|
| PROBE-P5-1 | the D6 schema-lock cycle, both halves: one appended comment line in `templateFormat.ts` produces exactly one lint error naming the recorded and working-tree hashes; a further ratification block carrying the new sha256 returns the lint to 0 errors. Executed by the authoring session, then **independently reproduced twice** — panel round 2 lens 1 in a throwaway clone at HEAD, lens 4 against the live lint. Repo restored byte-identically each time (`shasum` back to `9368e525…`, two-entry porcelain). |

The three measurements the packet asserted WITHOUT a probe are the
subject of §6's diagnosis; they were measured by the panel, not by the
author, which is the finding.

## 5. Experiment §5 running record (P5, per round — derived numbers)

| Event | Yield | Classes | Reopens | Gates | STOPs |
|---|---|---|---|---|---|
| Panel r1 (full, 5 lenses) | ~46 findings | 6 P1-grade in 6 clusters · rest P2/P3 | 0 | 0 | 1 (`1:open-choice`, 3 items) |
| STOP 1 | 3 rulings | — | 0 | 1 (user) | — |
| Panel r2 (full, 5 lenses) | ~61 findings | 10 P1-labelled in 4 clusters · rest P2/P3 | 0 | 0 | 0 |
| Round-4 scope | 1 ruling | — | 0 | 1 (user) | — |

Standing totals at this point: panel rounds **2** · findings
dispositioned **~107** · **reopens 0** · human gates **2** · STOPs
**1 resolved** (3 items) + 2 designed ahead in the build (the
form-authority act, the re-ratification) · watchdog **2/8** · plateau
**0/2**.

Packet size: 42,966 B at the round-1 basis → 53,174 B at the round-2
basis (+23.7%), crossing the 48 KB v0 advisory threshold. The round-4
deletion pass is expected to reverse it; whether it does is a scoreable
outcome of §3's ruling.

## 6. Bet ledger — scored

**Bet: the panel — "2 full rounds, the 3rd through the user."**
Sizing reason as stated at the opening: the pointer-only form
structurally suppresses the paraphrase class, and Appendix A's
closed-list test PASSES for the lane inventory (the declaration
enumerates it — a complete enumeration under a settled principle), so
the expected yield was inheritance/omission and bookkeeping; the
reserve was priced on Appendix A's bet-1 lesson that a first-of-form
authoring pass buys a loss-hunting round.

**Outcome: LOST.** Round 2 did not converge — ~46 → ~61 findings, 6 →
10 P1-labelled. The fold closed round 1's clusters and opened new ones
of the same severity class.

**The diagnosis, and why it is not "the reviewers got better".** Three
of round 2's four P1 clusters share one root: a SET or an EQUIVALENCE
assembled by hand, stamped with the claim grammar's MEASURED closure,
and never executed.

| Claim | Asserted | Measured by the panel |
|---|---|---|
| D7's stand-down trigger tags | five tags, read off the contract | `markTag` is reached only from `evaluateNode`; `evalValueClassRef` dispatches directly, so the two value-class tags among the five can never enter the set — measured through `admitTemplate` on an instrumented copy |
| D14's re-pin membership | "MEASURED … untruncated", five fixtures | the full growth simulated and the suites run: **8 red** — the set was 5 of 8 |
| D4's order equivalence | both normalizer orders admit byte-identically | a live counterexample: carry growth without the fill reds `engine.test.ts:1276`; and the claim contradicts ratified C13's normative order |

The executed-probe rule was applied to the TOOLING substrate
(PROBE-P5-1, reproduced twice) and not to the packet's own claim sets —
the easy probe ran, the three that mattered did not. The remedy the
user ruled is not "measure harder": it is the claim grammar's other
pair (a derivation rule with a named owner plus a measured floor),
gated by the deletion test, because the durable defect is choosing
MEASURED for a set the tree regenerates for free.

**Bet: the D6 lock cycle — "1 probe + 1 ruling."** **EXACT.** The
probe measured both halves in one run and was independently reproduced
twice; one ruling settled the act. The surprise home named in advance
(tooling/lint semantics, Appendix A's byte-lock-guard lesson) was the
right home.

**Bet: the split — "0 reserve rounds."** **WON so far.** Neither panel
round reopened the cut; both rounds' lens-5 passes affirmed it on
evidence and one explicitly re-ran the six axes against the narrowed
scope. Settles finally at the arm.

**Bet: the arm — "1 pointed round + 1 re-check."** OPEN; not yet
entered.

## 7. Panel round records

**Round 1** (basis `da19e4b68c9dec40` @ `82a42c03`) — five fresh-context
Opus lenses, full. Six P1-grade clusters: the admitted-value ripple
unnamed with an affected file outside the boundary; the hook arity not
expressible as written; `domain/index.ts` missing with the type-minting
duty undeclared; the C9 stand-down mechanism undecided; the aligned plan
edit breaking the mechanical next-packet derivation; the second
ratification block corrupting the draft's metrics line. Two lenses
contradicted each other on one fixture claim; the orchestrator measured
it directly and both were partly wrong — the ripple is larger than
either stated. Fold: one batch, three rulings incorporated, two rows
minted (lane independence; the admitted-value re-pin), manifest classes
changed — which forced round 2 to FULL by the mandatory escalation rule.

**Round 2** (basis `1ee3c6124f7d82af` @ `82a42c03`) — five fresh-context
Opus lenses, full. Four P1 clusters, each with multi-lens convergence:
D7's trigger set (four findings, three lenses, one executed
measurement); D14's membership (five findings, four lenses, one
executed simulation); D4's order claim (three lenses, one executed
counterexample); D2 dropping C19's semantic-lane half, leaving the
packet's own titular hygiene lane driven by no family. One lens
additionally showed a hook kind is avoidable entirely — the schema's
own `default:` materialization covers the gate position, which is where
`normalizer.ts`'s header draws the schema/derivation line. Two
process-side catches: the prerequisite form-authority act falls inside
a standing Fable-mandatory category the packet did not name, and the
ch9 precedent recorded in §2.

Panel/arm totals at this point: 2 full rounds, 10 lens runs, ~107
findings found and dispositioned, ZERO contract reopens, ZERO
STOP-class findings raised by the lenses themselves (the one STOP was
raised by the orchestrator at the round-1 decision point).
