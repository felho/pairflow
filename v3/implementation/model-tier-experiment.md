# Model-tier experiment — pre-registration

**Status:** RATIFIED (owner, 2026-07-19). Write-once from here: only
the §7 verdict block and the §8 log may be appended; any other edit
voids the pre-registration.

**Registered:** 2026-07-19, at the ch12-P0 close. This is the explicit
model-effectiveness act that README §5.5 defers ("model-effectiveness
experiments are a later, explicit act") — user-initiated, not
loop-initiated.

## 1. Background and the derivation being tested

The founding derivation (the v3-scoping session, pre-chapter-1): model
dependence is maximal where contracts are CREATED and falls as
constraint mass moves into environment (types / lint / gates / tests)
and data (ledger / template / golden traces) — hence the rule of
thumb "plan chapters and template design → Fable-class;
contract-consuming, machine-gated work → Opus-class", and the
corollary that EARLY implementation rounds also warrant Fable-class,
because early code mints the idioms every later packet
pattern-matches (the `__probe` idiom, the testkit shapes, the kernel
structure — all now-standing precedents).

That investment is now largely banked: 1016 tests, drift suite,
packet-lint, post-build audit, the five-lens Opus panel, the external
arm's two mandatory gates, projection-based authoring on a stable
template, 20+ live packets. The experiment tests whether the
contract-consuming tier can now run on Opus-class under the CURRENT
net.

## 2. Hypothesis (falsifiable)

> **H:** For contract-consuming packets (projection-classified
> alignment/realization work), switching the MAIN THREAD
> (authoring + build orchestration) from Fable-class to Opus-class
> does not produce escaped defects, does not push the caught-defect
> volume above the Fable baseline band, and does not degrade process
> integrity or the owner's decision-point load.

**Single variable:** only the main-thread model changes. The panel
lenses stay Opus-class (README §5.5, unchanged), the external arm
stays pinned `gpt-5.6-sol` (arm-pin.md, unchanged — the grader is a
different vendor and is never the graded), every gate and checkpoint
stays as ratified.

## 3. Scope (pre-named, no cherry-picking)

- **In:** **ch12-P2** (L0c run profile) and **ch12-P3** (L0e provider
  contract) — both plan §12.4 rows are flag-free-approve /
  predicted-projection / contract-consuming.
- **Out:** **ch12-P1** — the declared sizing-split candidate and the
  lifecycle-spine idiom-minting slice; it runs on Fable-class per the
  tiering rule, BEFORE the experiment window opens.
- **EXTEND slot (usable exactly once):** **ch12-P4**, only via an
  explicit EXTEND verdict at the §7 point.
- If a scoped packet stops qualifying, the disqualifier must be a
  PRE-EXISTING recorded class fact (a plan-row mode change, a Case-B
  detector hit, a first-of-a-kind ruling under R-FIRST-STOP) — never
  a post-hoc judgment about its difficulty.

## 4. Metrics and baseline (frozen at registration)

All numbers are produced by the EXISTING machinery (`packet_metrics`,
the arm reports' finding lists) — no new self-reported measures. The
Fable baseline is the three most recent same-tier packets, main
thread `claude-fable-5`:

| Metric | ch11-P2a | ch11-P3b | ch12-P0 | Baseline band | Strike threshold |
|---|---|---|---|---|---|
| internal review rounds to close | 4 | 1 | 4 | 1–4 | > 6 |
| arm gate-1 content findings | 10 | 5 | 8 | 5–10 | > 15 |
| arm gate-2 content findings | 4 (incl. 1 product-class) | 8 (all test-evidence) | 2 (bookkeeping) | 2–8 | > 12 |

(Thresholds = baseline max + 50%, rounded. Sources: the packets'
`packet_metrics` blocks and Build-record arm entries at HEAD
`5f96d830`; ch11-P2a gate-2 = the 2026-07-12 aftermath four-fold;
ch11-P3b gate-2 = the eight test-evidence findings citing `f5f7cee1`;
ch12-P0 gate-1 = 8 findings across 5 pinned runs.)

## 5. Failure criteria (pre-committed)

- **K1 — escaped defect (hard, immediate FAIL):** any P0/P1 defect
  discovered AFTER a scoped packet's DONE verdict (aftermath, a later
  packet, the boundary review, an owner catch) attributable to
  authoring/build quality. One instance ends the experiment as
  FAILED. (Gate-caught findings — however many — are the net working,
  not escapes; only post-DONE discovery counts here.)
- **K2 — caught-defect volume (band, strikes):** a scoped packet
  exceeding ANY strike threshold in §4 = one strike. **Two strikes
  within the window = FAIL.**
- **K3 — process integrity (hard, immediate FAIL):** a missed STOP, a
  hard-stop evasion, a mutation-boundary violation, or any process
  break caught by lint/audit/owner that indicates the model cannot
  hold the process. The owner additionally holds an explicit veto: a
  rescue intervention or a growth in owner decision points per packet
  is recordable as FAIL-evidence at the owner's sole judgment.

**Adjudication default (anti-rationalization):** where it is disputable
whether a defect is authoring-quality or a process gap, it counts
AGAINST the experiment unless the owner explicitly rules otherwise.

## 6. Honesty clauses

- n = 2 is a **tripwire design**, not statistics: it can exclude gross
  regression; it cannot prove equivalence.
- The process-learning confound (rules accumulate between packets)
  biases toward passing. Accepted openly: the decision-relevant
  question is "is Opus-class good enough under the CURRENT net", and
  the net is part of the system under test.
- Baseline packets differ in difficulty; the band spans that spread
  rather than pretending controlled comparison.

## 7. Verdict (to be appended at the close of ch12-P3 — mandatory)

One of, with one-paragraph reasoning against §5:

- **ADOPT** — Opus-class becomes the DEFAULT main thread for
  contract-consuming packets. Fable-class remains for the
  contract-creating tier: plan chapters, contract drafts, process
  revisions, boundary reviews, first-of-a-kind packets, declared
  idiom-minting slices.
- **REVERT** — main thread returns to Fable-class; the failing
  criterion and its evidence recorded here.
- **EXTEND** — exactly once, onto ch12-P4, only if the K1–K3 record is
  clean but the owner wants one more data point.

**ADOPT is not a one-way door:** the same metrics keep being recorded
on every packet forever; a later packet tripping K1 or K3, or two
consecutive packets tripping K2 thresholds, reopens this decision as
a boundary-review item.

<!-- verdict entries append below this line -->

### Verdict — REVERT (2026-07-22, recorded at the ch12 boundary review; owner-ratified)

Recorded LATE — the mandatory point was the ch12-P3 close; the slip is
logged in §8. Against §5: **K1 clean** — no post-DONE P0/P1 on either
scoped packet (the P3 product bug was gate-2-caught before DONE: the
net working, not an escape; the chapter dogfooding ran clean).
**K2 FAILED** — ch12-P3 exceeded TWO frozen thresholds: internal
review rounds 12 (band 1–4, strike > 6) and gate-2 content findings
~18 across seven arm rounds (band 2–8, strike > 12); under the §5
adjudication default (disputable counting resolves AGAINST the
experiment) the double exceedance stands as two strikes. **K3** — no
missed STOP, no hard-stop evasion, no mutation-boundary violation; the
two inverse-direction incidents in the window (the P2 arm-invocation
ask-the-human, the P3 discretionary pre-approval stop — both GREW
owner decision points) are noted under the owner-veto clause but NOT
ruled FAIL-evidence: the owner's reading is that the entire process
prompt set was authored under Fable-class main threads and was never
tuned for Opus-class, so the K3-adjacent behavior is judged
guidance-reducible (prompt hardening), not model-disqualifying.

Owner framing recorded with the verdict: the experiment FAILED by its
own pre-committed letter and the framework stands un-second-guessed —
but the economic pressure is real (Fable-class cannot be the permanent
default for all implementation), the current chapters are unusually
interdependence-dense (external validity to simpler future feature
work is limited), and n=2 was a tripwire, not a measurement.
Consequences bound at the same boundary: (1) `main_thread_model`
becomes a packet_metrics field (template + packet-lint; required from
ch13 — this verdict's key fact lived only in the owner's memory);
(2) the K3-class prompt hardenings land via the boundary's
entry-mode / arm-invocation verdicts; (3) a successor experiment
(alternating-chapter design, an explicit Fable-mandatory surface
list, a longer window) is pre-registered as
`model-tier-experiment-2.md` — until it opens, the main thread
returns to Fable-class per this REVERT.

## 8. Log

- 2026-07-19 — pre-registered (this file); ratified by the owner the
  same day, in-session. The window opens at ch12-P2 authoring start,
  after ch12-P1 completes on Fable-class.
- 2026-07-22 — owner confirms (from memory — the capture gap this
  file's verdict now closes) that ch12-P2, ch12-P3 AND ch12-P4 main
  threads all ran Opus-class.
- 2026-07-22 — two protocol slips recorded at the ch12 boundary:
  (1) the §7 verdict, mandatory at the ch12-P3 close, was delivered
  only at the boundary review; (2) ch12-P4 ran an Opus-class main
  thread WITHOUT the explicit EXTEND verdict §3 requires — an
  unratified EXTEND. Mitigating record: P4's metrics landed within
  every band (2 review rounds; gate-1 5 content findings; gate-2
  4 test-evidence / 0 product) — a clean informal third data point,
  inadmissible under this pre-registration, usable as design input
  for the successor.
- 2026-07-22 — verdict REVERT appended (§7); successor design
  handed to `model-tier-experiment-2.md`.
