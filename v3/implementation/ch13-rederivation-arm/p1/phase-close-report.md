# ch13 re-derivation — P1 PHASE-CLOSE REPORT

**Trajectory:** phase day 3 (started 2026-08-03; closed 2026-08-05) ·
arm rounds **1 of 3** · `check_packet.py` **3319** lines, baseline
3220, **delta +99**.

Every number above is derived from a repo surface at write time:
`ls v3/implementation/ch13-rederivation-arm/p1/arm-*-out.txt | wc -l`
and `wc -l tools/v3-plan/check_packet.py`.

Phase: P1 (SUPERSEDE MECHANICS) of
[`../../ch13-rederivation-plan.md`](../../ch13-rederivation-plan.md) §3.
Closed by a fresh session under the four rules the user ratified on
2026-08-04 after the overbuild reset.

---

## 1. The product

The ch13 context-block contract is `superseded`. One commit
(`4aee2dac`) flipped the meta block and appended the record; the 19
C-rows were not touched, so the D5 equality check keeps binding
against the latest ratification's recorded commit — that check IS the
archival lock.

```json
{"superseded": {"date": "2026-08-05", "oracle_branch": "ch13-prose-line", "oracle_tip": "bb313036c7e50ad2625f0669f76a90bf317255e3", "plan": "v3/implementation/ch13-rederivation-plan.md"}}
```

**The date is 2026-08-05, not the 2026-08-04 the kickoff block
assumed.** The session crossed midnight; the act's date was resolved
when the act ran rather than carried from the instruction that
scheduled it. A projected date is precisely the defect this same phase
corrected in the template (finding F2 below), so restating the
scheduled one would have re-minted it in the record itself.

All four pointers verified at the point of writing:

| Claim | Command | Result |
|---|---|---|
| tip is a commit | `git cat-file -t bb313036…` | `commit` |
| branch resolves | `git rev-parse --verify refs/heads/ch13-prose-line` | `bb313036…` |
| tip contained in branch | `git merge-base --is-ancestor bb313036… ch13-prose-line` | exit 0 |
| plan path exists | `test -f v3/implementation/ch13-rederivation-plan.md` | yes |
| C-rows untouched | `git diff -U0 … \| grep -cE '^[+-]\|\s*C[0-9]+'` | **0 changed** |

## 2. The commits (7 since the reset anchor 274df3a6)

| Commit | What |
|---|---|
| `c8636170` | README chapter-close carve-out *(pre-existing on the reset base)* |
| `00d7a2b8` | the overbuild reset record + four corrective rules *(pre-existing)* |
| `a1da13f8` | the ratified threat-model declaration *(pre-existing)* |
| `12c97c53` | the round-1 arm record — one verdict, one preserved infra failure |
| `08c61552` | the round-1 fold — calendar dates, sole-key records, a pinned register |
| `f6166f5c` | the manifest-channel declaration + the carried-scope record |
| `4aee2dac` | **the flip** |

## 3. The arm round (1 of 3)

Charter: threat model quoted verbatim, neutral QA vocabulary
(counterexample search / false-green / sensitivity check), executed
evidence required, gate stated — accident/sloppiness is fold material,
anything else is recorded and never built against.

**Verdict** `arm-round1-out.txt` — pin gpt-5.6-sol/high, 805 s, guards
clean, 9 IN-SCOPE / 1 CARRIED-SCOPE / 0 UNRUN, every finding carrying
an executed command and its real output.

**One infra failure, retried per ReviewPacket §6 item 8.** The first
invocation of the same charter hit the uniform 1200 s cap while
composing its report, having finished the investigation. That is not a
content verdict, so it consumed no round; its transcript is preserved
under `infra/` and was NOT mined for findings — treating a killed
run's unwritten conclusions as verified is the unrun-measured defect
family this phase exists to avoid. The retry's charter fixed the cause
structurally: findings are written out as they are confirmed, never
batched to the end. `infra/` is a directory rather than a naming
convention so the round counter (a non-recursive `arm-*-out.txt` glob)
cannot be inflated by a run that produced no verdict.

### Findings by disposition — 5 folded, 5 carried

**Folded** (each with its own red fixture AND a sensitivity mutant
proving the fixture discriminates):

| # | Defect | Evidence it was real |
|---|---|---|
| F5 | impossible calendar dates passed D3/D8.3 | `2026-13-40`, non-leap `2026-02-29`, `0000-00-00` all green |
| F6 | a sibling top-level key rode along unread beside a `superseded` / `realized_map` block | `{"noise": true, "superseded": {…}}` green |
| F10 | the selftest's red-dim count was printed, not pinned | deleting a `assert_red` call: 131 → 130 and still exit 0 |
| F1 | template listed the equality check as binding "ratified and realized" | contradicted its own §3 two lines later, and the code |
| F2 | template asserted, past tense, a supersede act that had not run | the file was still `ratified` at HEAD |

F5 and F6 were fixed at **class width** — one date helper for every
declared draft date, one rule set that IS the template's own list —
because neither defect was specific to the new status.

**Sensitivity mutants** (each must fail; each did):

```
F5  calendar validation removed  → exit 1, 2 dims not red for their claim
F6  sole-key check neutered      → exit 1, 2 dims not red for their claim
F10 a D8.7 assert_red deleted    → exit 1, "register count 134 != pinned 135"
```

**Carried** — recorded with owners in
[`carried-scope.md`](carried-scope.md), user-ratified 2026-08-05
(option A): CS-1 closure status resolution, CS-2 the closure scanner's
nested-parenthesis blindness, CS-3 grandfathered pre-v2 packets, CS-4
the header-union mirror, CS-5 the markdown-escape form.

The reframing that made this a scope decision rather than a fold:
**none of those surfaces resolves draft status for ANY status** —
`reopened` included. They were never D8.7's territory, so the
correction was to declare where the lock binds, not to build the lock
three more times inside a phase whose product is a one-line flip.

## 4. Gates and probes — all receipts

```
selftest              135 red dims exercised, 0 failure(s)          exit 0
lint                  26 v2, 16 grandfathered, 5 drafts
                      (0 reopened, 1 superseded: ch13-…-contract.md)
                      0 error(s)                                     exit 0
--forbid-reopened     (superseded must NOT trip a permanent state)   exit 0
check_docs            green (4 gates): adr-check 19 ADRs,
                      realized-map 4 contracts, deferred 0 markers   exit 0
```

### The red-on-break probe (post-flip, against the green tree)

```
git show bb313036:v3/implementation/packets/ch13-p1-context-definition-surface.md \
  > v3/implementation/packets/ch13-p1-context-definition-surface.md
python3 tools/v3-plan/check_packet.py
  → exit 1
  → 14 errors, ALL 14 carrying the dedicated message:
    "…rows['F1'] ref 'contract:ch13-context-block#C1' — draft status is
     'superseded', anchors need ratified-or-later — the draft is superseded
     (terminal): this anchor must move to the successor surface; the draft's
     superseded record names the oracle branch and the plan that authorized
     the supersede"
  → summary: 27 v2 packet(s) …, 14 error(s)

rm v3/implementation/packets/ch13-p1-context-definition-surface.md
python3 tools/v3-plan/check_packet.py
  → exit 0, 26 v2 packet(s) …, 0 error(s)

git status --porcelain=v1  → empty (tree restored)
```

The lock is live: the retired line's own packet cannot re-enter.

## 5. The §5 experiment record for P1

Derived from repo surfaces, not recalled.

| Measure | P1 (this line) | The deleted P1 line | The ch13 prose line |
|---|---|---|---|
| arm rounds | **1** (+1 infra, retried) | 7 (1 infra) | 4+ panel, 3 scoped-arm |
| findings | 10 → 5 folded / 5 carried | 11→6→5→2→2→2→3, all folded | 28 · 6 · 9 · 8 |
| reopens | **0** | 0 | 4 |
| human gates | **1** (the channel-scope class) | many, salami-visible | several |
| STOPs | **1**, resolved by ratification | 0 (the loop could not terminate) | 1 (escalation fired) |
| guard size | 3220 → **3319** (+99) | 2846 → 5230 (+2384) | n/a |
| watchdog | not exhausted (1 of 3) | uncapped | reset once |

**The honest qualifier, stated so the comparison is not read as more
than it is:** this line did not rebuild the machinery. The core build
(`274df3a6`) precedes it and was itself hardened by the deleted line's
early rounds. What these numbers measure is the **cost of CLOSING**
under the four corrective rules — not a from-scratch re-derivation.
The valid claim is narrow and still worth recording: the same class of
verification work that previously ran seven unbounded rounds closed in
one, because the charter declared a threat model and the findings
outside it were routed to a record instead of a build.

**What the rules actually did**, one line each:

- *Threat model first* — turned four real findings from fold material
  into a named carried-scope list with owners. Without it they were
  indistinguishable from the five that were folded.
- *Bounded loop* — never bound; the round budget was not reached.
  Untested this phase.
- *Proportionality tripwire* — never fired (+99 lines, one growth
  event). Untested this phase.
- *Trajectory line* — carried in every gate presentation. Its value
  showed up in an unplanned place: opening each report with a derived
  date is what caught the midnight rollover before it entered the
  supersede record.

## 6. Carried out of P1

- The five carried-scope items with owners (`carried-scope.md`).
  CS-4 is a named **retirement candidate** for the P4/P5 schema-first
  packet form; no live packet was touched.
- **One unreconciled citation:** the decision block of 2026-08-04
  cited 17 live packets carrying a header union. Measured here: 8, 12,
  14 or 21 depending on which written form is counted — none of them
  17. Recorded as unreconciled rather than restated. The operative
  instruction (touch none of them) does not depend on the figure.
- P1 legislates no transition OUT of `superseded`; terminality stays a
  FORM rule, not a lint claim, since no single document's bytes could
  decide it.

## 7. Plan compliance

- One commit per logical change, each with the pre-commit checklist.
- Executed-probe receipts on every measurable claim above.
- No DERIVED claim without a named measurer (the header-union count
  carries its four greps).
- Citations verified at the point of writing — the one that could not
  be reproduced is labelled as such rather than repeated.
- Names, never ordinals, throughout.
- Where the charter was silent (the channel-coverage class), the phase
  STOPped and routed through the user instead of improvising.
