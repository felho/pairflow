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
  **CORRECTION, recorded 2026-08-09 (surfaced by panel rounds 5–6).**
  The option was presented with the FLAVOUR LABEL already inside its
  framing ("stay inside ADR-019 D7's NODE flavour"), so the ruling
  settled the SHAPE and did not independently establish the flavour —
  the same defect class as ruling (c)'s incomplete option set, and the
  general's again. Argued afterwards on the discriminating test (new
  USE of the vocabulary versus new MEMBER of it), the realization is
  D7's CONSTRUCT half, admitted on the two-position reading D10
  ratified and D11 applied to this exact pair of parents. The user
  ruled the reversal 2026-08-09. Its cost is a SECOND Fable-mandatory
  prerequisite `docs(v3)` act — an ADR-019 amendment editing the three
  surfaces D10's and D11's own commits each edited.
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
| M1 | the C9 trigger-tag floor (D7) — one malformation per position through an instrumented engine; UNION of eleven markable tags, both zero-marking routes shown. Script + output committed beside this file. |
| M3 | the admitted-VALUE re-pin floor (D14) — the growth applied in a throwaway copy against a pristine baseline of the same copy; growth-only failures = the floor, eight in four files, all four grains instantiated, zero baseline-only. Script + output committed beside this file. |
| PROBE-P5-1 | the D6 schema-lock cycle, both halves: one appended comment line in `templateFormat.ts` produces exactly one lint error naming the recorded and working-tree hashes; a further ratification block carrying the new sha256 returns the lint to 0 errors. Executed by the authoring session, then **independently reproduced twice** — panel round 2 lens 1 in a throwaway clone at HEAD, lens 4 against the live lint. Repo restored byte-identically each time (`shasum` back to `9368e525…`, two-entry porcelain). |

§6's diagnosis records that three measurements were first asserted
WITHOUT a probe and were measured by the panel rather than by the
author. M1 and M3 are the orchestrator's re-runs closing that gap for
the two floors the packet still cites; the third — D4's order
equivalence — was DELETED rather than measured, under §3's gate.

## 5. Experiment §5 running record (P5, per round — derived numbers)

| Event | Yield | Classes | Reopens | Gates | STOPs |
|---|---|---|---|---|---|
| Panel r1 (full, 5 lenses) | ~46 findings | 6 P1-grade in 6 clusters · rest P2/P3 | 0 | 0 | 1 (`1:open-choice`, 3 items) |
| STOP 1 | 3 rulings | — | 0 | 1 (user) | — |
| Panel r2 (full, 5 lenses) | ~61 findings | 10 P1-labelled in 4 clusters · rest P2/P3 | 0 | 0 | 0 |
| Fold-scope ruling | 1 ruling | the deletion gate | 0 | 1 (user) | — |
| Panel r3 (full, 5 lenses) | 38 findings | 3 P1 on ONE root (a residual clause of the superseded design) | 0 | 0 | 0 |
| Exit ruling | 1 ruling | targeted, executing lens | 0 | 1 (user) | — |
| Panel r4 (targeted, 3 lenses) | 20 findings | 1 P1 (a manifest row with no flag) | 0 | 0 | 0 |
| Exit ruling | 1 ruling | targeted, lenses 2+4 | 0 | 1 (user) | — |
| Panel r5 (targeted, 2 lenses) | 16 findings | 1 P1 (an ADR-flavour argument built on act-form) | 0 | 0 | 1 (`1:open-choice`) |
| STOP 2 | 1 ruling | the CONSTRUCT reversal | 0 | 1 (user) | — |
| Panel r6 (full, 5 lenses) | 45 findings | 3 P1 issues — the reversal's non-propagation, a ratified-plan premise, an amendment-sequencing gap; one further P1 candidate REFUTED by execution | 0 | 0 | 1 (`2:contested-ratified-vs-reality`, plan §13's premise) |
| STOP 3 | 1 ruling | the plan-premise alignment | 0 | 1 (user) | — |

Standing totals at this point: panel rounds **6** (4 full, 2 targeted;
23 lens runs) · findings dispositioned **~226** · **reopens 0** ·
human gates **6** · STOPs **3 resolved** + 3 designed ahead in the
build (two Fable-mandatory prerequisite acts and the re-ratification) ·
watchdog **6/8** · plateau **0/2**.

THE YIELD CURVE, which is the phase's most useful datum: ~46 → ~61 →
38 → 20 → 16 → 45. The rise at round 6 is not a regression of the same
kind — it follows a user-ruled REVERSAL of a ratified argument, and its
P1s are that reversal's own propagation debt plus two consequences the
reversal created. The three middle rounds are the convergence the
deletion gate bought.

Packet size: 42,966 (r1) → 53,174 (r2) → 49,997 (r3 fold) → 55,475
(r4) → 59,257 (r5) → 61,563 B (r6 basis). §3's ruling predicted the
deletion pass would reverse the growth; it did so once, by 6%, and the
curve then resumed. SCORED: the deletion gate is a real instrument —
it removed eleven claims no lens later missed — but it does not by
itself bound a packet whose decisions keep deepening. Recorded as an
outcome, not as a failure of the gate.

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

## 6a. Executed-measurement log (panel rounds 3–4)

The packet's two FLOORS cite this section rather than carrying their own
receipts, on the PROBE-P5-1 pattern: the packet states the rule, the
record holds the run. Both were executed by fresh-context panel lenses
in throwaway copies of `v3/`, with the repository verified
byte-identical afterwards (two-entry porcelain, unchanged HEAD,
`templateFormat.ts` still at `9368e525…`).

**M1 — the C9 trigger-tag floor (D7). ARTIFACT COMMITTED:**
`m1-trigger-tag-probe.ts.txt` + `m1-trigger-tag-probe-out.txt` beside
this file. Method: an rsync copy of `v3/src` into /tmp with `engine.ts`
patched to expose `Run.tagFailedAnywhere` on the run result, then one
malformation per position driven through `runSurface` on the direct
channel; throwaway deleted, repository untouched. Re-run by the
orchestrator 2026-08-09 after two independent panel reproductions in
rounds 3 and 4, because a floor the packet cites is not allowed to rest
on narrated measurement. The committed output carries the per-position
table and the UNION line. Result: a broken ref list
records its REFERENCING FIELD node's tag and never the value class's,
because the value-class dispatch bypasses the marking call — so
`d-ctx-gate-refs` / `d-prompt-refs` are recorded where a naive reading
expects `vc-blockidlist` / `vc-agentconfig`. Eleven distinct markable
tags on the containment paths: the two ref-position field nodes
(`d-prompt-refs` shared by both config positions), the two agent-config
field nodes, `d-binding` / `d-pipeline` / `d-gates`, and
`d-steps` / `d-step` / `d-roles` / `d-roles-entry`. The root node is the
twelfth and is UNMARKABLE — the fixed-map container evaluation returns
success for every container, so it cannot be marked false on any route.
TWO ROUTES to `d-gates` behave differently and the distinction is the
floor's one trap: the container-kind route marks the tag; the
dead-config `keysSubsetOf` route does NOT mark it, produces its own
finding, and is covered by D7's part-(c) raw read rather than by the
stand-down. The committed run shows both zero-marking routes explicitly
(`gates dead-config key -> []`, `root not a map -> []`) beside the
eleven that mark, so the floor and its two exclusions are readable off
one output.

**M2 — D7's part (c), the raw-read requirement.** A document whose
gates key is not one of its step's transitions, carrying a ref whose
catalog entry is mentioned nowhere else: the dead-config finding fires,
the failed-tag set comes back EMPTY, a raw-authored read still sees the
mention, and a normalized read does not. The raw read is therefore
load-bearing, not a stylistic preference.

**M3 — the admitted-value re-pin floor (D14). ARTIFACT COMMITTED:**
`m3-value-repin-floor.sh.txt` + `m3-value-repin-floor-out.txt` beside
this file. Method: two rsync copies of `v3/` under /tmp — one pristine
baseline, one carrying the declaration growth and the fill — the same
suites run against both, and the growth-ONLY failure set taken as the
floor. Re-run by the orchestrator 2026-08-09 after two panel
reproductions, on the same ground M1 was: a floor the packet cites is
not allowed to rest on narrated measurement, and the asymmetry between
the two floors was itself a review finding. What the probe measures is
the ADMITTED-VALUE delta; the mechanism of the fill is deliberately not
its subject, because the red set is a function of the value, not of how
it was produced. Result, and it reproduces the panel's numbers exactly:
exactly EIGHT assertions red beyond the baseline, in four files, and all
four of the floor's named grains are instantiated — whole-admitted
template, whole roles entry, whole admitted binding including the
list-wrapped form, and normalizer output. BASELINE-ONLY failures: ZERO,
so the growth neither fixes nor hides an existing assertion; the four
failures common to both runs are the drift suites resolving repo-root
paths a /tmp copy does not have, excluded by the diff rather than by
judgement. No kernel, store, gates, drift
or CLI assertion moved beyond the environmental baseline, and
cross-channel comparisons stayed green, as the row predicts.

**M4 — D11's non-movement.** The same run measured ZERO verdict, path
or message deltas from the declared default; every delta was
value-level, i.e. D14's territory. The two rows are jointly satisfiable
under measurement.

**M5 — the draft-metrics sweep behind D6.** Ratification blocks against
the recorded post-ratification-reopening count, per contract:
ch8 2/1 vs 1 · ch9 2/1 vs **0** · ch11 5/4 vs 4 · ch12 1/0 vs 0 ·
ch13-v1 5/4 vs 4 · ch13-v2 1/0 vs 0. The form authority defines the
metric mechanically as blocks beyond the first, so ch9's recorded 0
contradicts that definition today and survives on a parenthetical; no
tool computes the number anywhere in the tree. Under D6's constraint —
excluding non-reopening amendments and schema re-locks — every recorded
count stays where it stands, which is what makes the constraint
sufficient rather than merely motivated.

DATED-INCREMENT FORM, measured 2026-08-09 because D6 cites this entry
for it: counting metrics lines carrying the reopening figure per
contract gives ch8 2 · ch11 3 · ch13-v1 3 · ch9 1 · ch12 1 · ch13-v2 1
— so **THREE** drafts record the figure as a dated snapshot with later
increments beside it, the form ch9-C27 codifies, and the prerequisite
act's new §5 wording must leave it legal.

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
