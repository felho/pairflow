# Model-tier experiment 2 — alternating chapters (pre-registration)

**Status:** RATIFIED (owner, 2026-07-22, at the ch12 boundary review).
Write-once from here: only the §8 log and the §7 analysis entries may
be appended; any other edit voids the pre-registration.

**Predecessor:** `model-tier-experiment.md` — closed REVERT at the
ch12 boundary (K2 double-strike on ch12-P3; K1 clean; K3 ruled
guidance-reducible). This successor exists because the economic
pressure is real (Fable-class cannot be the permanent default for all
implementation work) and n=2 was a tripwire, not a measurement.

## 1. Goal

Reach a state where implementation packets run their MAIN thread
(authoring + build orchestration) on Opus-class by default, with a
NAMED list of Fable-mandatory surfaces — supported by paired evidence,
not vibes. The expected outcome is explicitly NOT a binary verdict but
a CLASS-LEVEL pattern: which packet classes tolerate an Opus-class
main thread, and which need Fable-class.

## 2. Design — alternating chapters

- Implementation chapters alternate the main-thread tier: one chapter
  Fable-class, one chapter Opus-class, repeating. Minimum window:
  2 full cycles (4 chapters); target 3 cycles.
- The chapter's arm is fixed AT CHAPTER RATIFICATION and recorded in
  the §8 log — never chosen per-packet, never post-hoc.
- **First assignment:** ch9 (runner MVP) = Fable-class (it is
  first-of-a-kind-dense — a poor Opus candidate and a natural Fable
  chapter); the next implementation chapter = the first Opus-class
  chapter.
- **Fable-mandatory surfaces (regardless of the chapter's arm):**
  contract drafts + ratification support; plan-chapter authoring;
  process revisions + boundary reviews; kernel new-capability /
  idiom-minting slices (named at chapter ratification, the ch12-P1
  precedent); first-of-a-kind packets (the R-FIRST-STOP class).
  A Fable-mandatory packet inside an Opus chapter is recorded as such
  (its data joins the Fable pool, flagged non-random).
- **Prerequisite:** the K3-class prompt hardenings (the ch12 boundary's
  entry-mode and arm-invocation verdicts) land BEFORE the first
  Opus-class chapter opens — removing the predecessor's "process
  prompts were authored under Fable and never tuned for Opus"
  confound.
- Single variable within a chapter: only the main-thread model. Panel
  lenses stay Opus-class, the external arm stays pinned per
  `arm-pin.md`, every gate and checkpoint stays as ratified.

## 3. Difficulty index (the comparability instrument)

The predecessor's frozen baseline band could not control for packet
difficulty. This experiment scores every packet with a MECHANICAL
5-axis rubric — computed, not estimated; the owner is explicitly not
asked to guess difficulty. Each axis scores 0/1/2; the sum (0–10)
bands: **Light 0–3 / Medium 4–6 / Heavy 7–10**.

| Axis | Measures | Source (existing machine data) | 0 / 1 / 2 |
|---|---|---|---|
| A. Mass | manifest size | `packet_rows` total (= metrics provenance total) | ≤15 / 16–30 / >30 |
| B. Inference load | non-projected share | `derived` + `new_decision` rows | ≤4 / 5–10 / >10 |
| C. Ripple surface | files touched | `mutation_boundary` file count | ≤15 / 16–45 / >45 |
| D. Seam class | nature of the work | checklist | 0: pure sync data/render/format; 1: stateful-persistent (store, schema, state machine); 2: async/temporal/concurrency seams OR external substrate (subprocess, worktree, provider, FS beyond the store) |
| E. Novelty | precedent | checklist | 0: extends an existing module's patterns; 1: new module built from existing idioms; 2: first-of-a-kind class / declared idiom-minting |

Rules: the score is computed and FROZEN at the packet's approve point
(pre-build — outcomes must not leak back into it); axes A–C are pure
arithmetic over declared machine blocks; D/E are checklist calls the
panel/arm can audit from the packet text (a disputed D/E call is
resolved at the approve and recorded). Thresholds above are FROZEN
from the §4 calibration; recalibration is a boundary-review act that
must not retro-score already-scored packets.

## 4. Calibration (back-scored 2026-07-22, all ch11–ch12 v2 packets)

| Packet | A | B | C | D | E | Σ | Band | Observed load (for the correlation read) |
|---|---|---|---|---|---|---|---|---|
| ch11-P0 registry-sync | 0 | 0 | 0 | 0 | 1 | 1 | Light | tiny (1 review round) |
| ch11-P1 L1 authority | 2 | 2 | 1 | 1 | 1 | 7 | Heavy | 5 rounds; heavy gate-1 |
| ch11-P2a gate admission | 2 | 2 | 2 | 1 | 2 | 9 | Heavy | 4 rounds; gate-1 = 10 (band top) |
| ch11-P2b gate rung | 1 | 2 | 1 | 1 | 1 | 6 | Medium | 2 rounds; gate-2 = 3 |
| ch11-P2c round alignment | 0 | 1 | 1 | 1 | 0 | 3 | Light | 2 rounds; small |
| ch11-P3a process admission | 0 | 1 | 1 | 1 | 1 | 4 | Medium | post-reset: 4 clean rounds |
| ch11-P3b process execution | 1 | 1 | 2 | 2 | 1 | 7 | Heavy | 1 round but gate-2 = 8 |
| ch11-P4 format extension | 1 | 1 | 1 | 0 | 0 | 3 | Light | 5 rounds (review-economics churn) |
| ch12-P0 gate field | 0 | 0 | 0 | 0 | 0 | 0 | Light | arm 8 findings (record-precision churn) |
| ch12-P1a lifecycle axis | 1 | 1 | 1 | 1 | 2 | 6 | Medium | 7 rounds; gate-2 = 8 |
| ch12-P1b activation machinery | 2 | 2 | 2 | 1 | 1 | 8 | Heavy | gate-1 = 8, gate-2 = 11 (2 product) |
| ch12-P2 run profile | 1 | 0 | 2 | 1 | 1 | 5 | Medium | gate-2 = 8; FLAG-1 |
| ch12-P3 provider contract | 2 | 1 | 2 | 2 | 2 | 9 | Heavy | the chapter's heaviest: 12 rounds, ~28 findings |
| ch12-P4 format + operator | 1 | 0 | 0 | 0 | 0 | 1 | Light | 2 rounds; gate-1 = 5, gate-2 = 4/0 product |

Correlation read: the five Heavies are exactly the five highest
observed loads; the Lights match the small runs. TWO honest residuals:
ch11-P4 and ch12-P0 scored Light yet churned — in both cases the churn
was record-precision / review-economics noise on format/registry
packets, not input difficulty; the rubric measures INPUT difficulty by
design and this divergence is informative, not a defect. Spread:
5 Light / 4 Medium / 5 Heavy — the scale separates.

## 5. Capture

- `main_thread_model` in `packet_metrics` — required on every packet
  from ch13 (template rule; landed at the ch12 boundary). Tier
  decisions are never again adjudicated from owner memory.
- The chapter's arm: recorded in §8 at chapter ratification.
- The per-packet difficulty score (axis vector + band): recorded in §8
  at the packet's approve. Housed HERE (not a new lint field) per the
  ch12 boundary's admission bias — promoted to a packet_metrics field
  only if two chapters prove it earns the tooling.

## 6. Stop rules

- **S1 (hard):** an escaped P0/P1 defect (post-DONE discovery)
  attributable to authoring/build quality on an Opus-arm packet → the
  Opus arm HALTS immediately (remaining chapters revert to
  Fable-class); the next boundary review decides restart or abandon.
- **S2 (owner veto):** a process-integrity break on an Opus-arm packet
  AFTER the K3 hardenings have landed (missed STOP, hard-stop evasion,
  boundary violation, or owner-judged growth in decision-point load)
  is recordable as FAIL-evidence at the owner's sole judgment.
- **S3 (flag, not fail):** an Opus chapter whose per-class gate yields
  exceed ~2× its paired Fable chapter's on same-band packets → a
  boundary-review flag with an explicit keep/stop decision.
- Adjudication default: disputable attribution counts AGAINST the Opus
  arm (the predecessor's anti-rationalization clause, carried).

## 7. Analysis

- Each chapter boundary appends a one-paragraph arm-comparison entry
  here (same-band packet pairs across arms; gate-1/gate-2 yields by
  class; escaped defects; owner decision-point load).
- Full read after 2 complete cycles: the deliverable is a per-class
  tiering proposal (which packet classes run Opus-class by default,
  which stay Fable-mandatory), presented as a boundary-review decision.
- External validity note (owner, at registration): the current
  chapters are unusually interdependence-dense kernel work; simpler
  future feature work likely tolerates Opus-class more, so the pattern
  read should treat these results as a LOWER bound on Opus viability.

<!-- analysis entries append below this line -->

- 2026-08-13 — **ch13 boundary: the FIRST Opus-arm chapter, read
  against ch9's Fable arm.** Same-band pairs exist in the MEDIUM band
  only — ch9-P1 (Σ5) against ch13-P0 (Σ4) / ch13-p1a (Σ5) / ch13-p1b
  (Σ4), i.e. n = 1 Fable vs 3 Opus; the Light band has no Opus member,
  and the HEAVY band has ZERO Opus data points — ch13 ran all-Medium
  while ch9's five Heavies are exactly where its product-grade gate-2
  findings concentrated, so this chapter says NOTHING about the Opus
  arm on the hard class. Yields on the live pair: gate-2 findings 9
  (Fable P1) vs 5 / 5+2 / 3 (Opus); product-code findings at gate 2:
  0 vs 0 across the band; detector_misses 5 vs 0 / 0 / 0; review
  rounds 8 vs 7 / 7 / 7 (p1b's seven internal rounds per its review
  record). NO S1 fired (zero escaped P0/P1 on any Opus packet); NO S3
  (the Opus yields sit BELOW the Fable comparator, nowhere near the 2×
  flag). Owner decision-point LOAD (§7's fourth measure): stop counts
  ran 2 / 6 / 1 on the Opus packets vs 0 on ch9-P1 — recorded, but
  stop count is not load and no comparable unit exists yet; noted,
  unmeasured. CONFOUNDS this window ADDS to §8's list: (i) the arm
  TRANSPORT changed mid-chapter (arm_run.sh → the gptsol agent, user
  ruling 2026-08-10) — the gate-2 yields above are measured on two
  different instruments; (ii) ch13-p1b's build ran MAIN-CONTEXT in a
  standalone fresh session with the §4 delegated default declined (a
  recorded, reasoned choice — but a different build shape than ch9's
  delegated builds); (iii) the mid-ch9 tooling batch predates the
  Fable comparator packet, so it does not bite the Medium pair.
  VERDICT: the experiment CONTINUES per §2 — this closes chapter 2 of
  the 4-chapter minimum window; the NEXT implementation chapter opens
  the FABLE arm per the alternation. No tiering conclusion is drawn
  from an n = 1-vs-3, one-band, two-instrument read.

## 8. Log

- 2026-07-22 — pre-registered and owner-ratified at the ch12 boundary
  review (design + rubric + calibration accepted in-session; the
  difficulty rubric replaced the rejected "owner difficulty note" —
  the owner is not positioned to estimate packet difficulty, so the
  index is computed from declared machine data instead). First
  assignment: ch9 = Fable-class; the following implementation chapter
  opens the Opus arm, gated on the K3 hardenings having landed.
- 2026-07-23 — ch9 (runner MVP) RATIFIED with main-thread arm =
  **Fable-class** (the pre-registered first assignment, recorded at
  chapter ratification per §5). Panel lenses and the external arm
  unchanged (arm-pin.md). The chapter's per-packet difficulty scores
  append here at each approve.
- 2026-07-23 — ch9-P0 sys-rename APPROVED (flag-free autonomous;
  arm gate-1 CLEAN @ d4b238e8): difficulty A0 (9 rows) B0 (2
  derived + 0 new-decision) C1 (16 boundary files) D0 (pure sync
  respelling — no stateful/async seam) E0 (kernel-alignment class,
  ch12-P0 precedent) — **Σ 1, Light**.
- 2026-07-23 — CONDITION NOTE (tooling change mid-ch9, the owner's
  explicit early-landing decision at the ch9 speedup batch): the
  speed-up tool batch (v3:check-docs, v3:commit, reopen_runner,
  arm_run.sh) + the fold-execution edit-batching discipline landed
  AFTER ch9-P0 and before ch9-P1 — the ch9 Fable chapter runs partly
  pre-batch, the next (Opus) chapter fully post-batch. Yield
  comparisons at the boundary should weigh this; quality gates
  themselves are unchanged (wrapper-not-replacement).
- 2026-07-23 — ch9-P1 fail-channel APPROVED + BUILT (flag-free
  autonomous; arm gate-1 CLEAN @ packet-basis 30ceb0eb, yield
  8→3→2→1→0 with two refutations accepted; build 14be9b3f; gate-2
  leg CLOSED on a bookkeeping-only re-check @ aftermath aeae92d4,
  yield 9 test-evidence / 0 product): difficulty A1 (19 rows) B1
  (6 derived + 0 new-decision) C1 (16 boundary files) D2
  (async/temporal completion seam — hold/release, CAS restarts) E0
  (extends the ch12-P3 completion-machinery class) — **Σ 5,
  Medium**. Mutation dual-run 82.03% (six semantic production
  files; whole-file scope caveat recorded in the packet).
- 2026-07-25 — LATE CAPTURE at the ch9 boundary (a §5 process miss,
  logged): the P2–P4a approve-time difficulty entries were never
  appended at their approves; scored NOW from the approve-time
  machine blocks (A–C exact arithmetic over the committed
  `packet_rows`/provenance/`mutation_boundary`; D/E checklist from
  the packet texts). The P4b entry is same-day.
- ch9-P2 worktree-provider: A2 (32 rows) B2 (18 non-projected) C1
  (16 files) D2 (external substrate — git worktree FS) E2
  (first-of-a-kind: the first real provider) — **Σ 9, Heavy**.
- ch9-P3a delivery-core: A2 (40 rows) B2 (22) C1 (17) D2
  (durable-concurrency seams — claims, crash windows, CAS) E2
  (first runner-plane durable coordination) — **Σ 9, Heavy**.
- ch9-P3b actor-adapter: A1 (26 rows) B2 (20) C1 (28) D2
  (subprocess/spawn substrate) E2 (first real adapter) —
  **Σ 8, Heavy**.
- ch9-P4a spawn-machinery: A1 (19 rows) B2 (16) C1 (22) D2
  (subprocess + tmux substrate) E2 (first real gate spawn + first
  tmux machinery) — **Σ 8, Heavy**.
- ch9-P4b operator-surface: A1 (16 rows) B2 (13) C0 (14 files) D2
  (subprocess + tmux + journeys) E2 (first operator surface +
  attach) — **Σ 7, Heavy**.
- 2026-07-25 — ch9 BOUNDARY §7 entry (the Fable-arm chapter closed;
  the comparison completes when the next Opus-arm chapter closes):
  7 packets — difficulty profile 1 Light / 1 Medium / 5 Heavy (a
  heavy chapter: five first-of-a-kind classes). Main thread
  Fable-class throughout (`main_thread_model` recorded per packet).
  Arm yields (gate-1 → gate-2, where the fold ladders ran): P4b
  7→1→0 CLEAN then 10→1→0 CLEAN — gate-2 again out-caught the
  internal layers (1 product P2: the attach probe-anomaly conflation;
  6 test-evidence strengthenings, receipt-verified). Detector-miss
  records this chapter: 2 arm-reclassifications of authored
  provenance (P4a GR8; P4b RS1 + the DT1 selection rule) — the
  entailment-attack class remains the arm's edge over the panel.
  Mutation dual-run: scores where the profile covers (P1 82.03%,
  P4a 83.04% covered-mutant); the runner-plane packets are
  subprocess-blind by the declared mechanism — the pilot's ch9 value
  was the receipt-backed probe discipline it forced (18 probes at
  P4b alone). CONDITION carried: the mid-chapter tooling batch (the
  ch9-P0→P1 speedup landing) makes intra-ch9 pacing comparisons
  noisy; the boundary weighs yields, not wall-clock.
- 2026-07-25 — ch13 (context blocks) RATIFIED with main-thread arm =
  **Opus-class** — the FIRST Opus chapter, per the §2 pre-registration
  ("the next implementation chapter opens the Opus arm"), recorded at
  chapter ratification per §5. The §2 K3 prerequisite is DISCHARGED:
  the ch12 boundary's entry-mode rule and the arm-invocation
  verified-preflight rule both landed (AGENTS.md V3 section), removing
  the predecessor's "prompts authored under Fable, never tuned for
  Opus" confound. **No chapter-named Fable-mandatory slice** (owner
  decision at the scoping round): no ch13 packet is first-of-a-kind or
  idiom-minting — the render extends the existing dispatch assembly
  and reuses ch11's authority logic, the definition side extends the
  ch8/ch11 format and admission machinery. The standing
  Fable-mandatory categories are unchanged (the plan chapter itself,
  the contract-draft + ratification support, process revisions, the
  boundary review) — so this chapter's draft round runs Fable while
  its packets run Opus, as designed. Chapter shape for the paired
  read: 3 packets (P0 hygiene/EPIPE, human-approved as an
  invention-predicted row; P1 definition side; P2 dispatch side),
  expected to band Light/Medium — the ch9 Fable pool's Light and
  Medium entries are the natural comparison partners. Per-packet
  difficulty scores append here at each approve. Mutation pilot: this
  is its SECOND and final data chapter; the two-chapter window closes
  at the ch13 boundary with a keep/stop verdict.
- 2026-07-26 — PROTOCOL DEVIATION recorded (self-reported at the ch13
  draft-round opening): the ch13 PLAN-CHAPTER section (a §2
  Fable-mandatory surface) was authored on the session's Opus-class
  main thread on 2026-07-25, before the mismatch was noticed. Owner
  disposition: NOT rewritten — the section went through seven
  stepwise owner-review rounds (four scoping decisions, two carrier
  acts) and a deliberate ratification, so a rewrite would carry less
  information than the deviation record. Remedy going forward: the
  session switched to Fable-class BEFORE any draft work; the ch13
  contract-draft and ratification support run Fable per the standing
  category rule. Data handling: the ch13 plan-section authoring joins
  the Fable-mandatory-surface pool FLAGGED as an Opus-authored
  exception (non-random, owner-reviewed); packet-level Opus data is
  unaffected (no packet work had started).

- 2026-07-31 — ch13-P0 difficulty index, computed and FROZEN at the
  packet's approve point (§3's rule: pre-build, so outcomes cannot
  leak back into it). Vector from the packet's own machine blocks:
  **A 0** (`packet_rows` = 12 ≤ 15) · **B 2** (derived 3 +
  new_decision 9 = 12 > 10) · **C 0** (`mutation_boundary` = 8 files
  ≤ 15) · **D 2** (async `error`-event seam AND external substrate —
  the subprocess journey lanes; either alone scores 2) · **E 0**
  (extends an existing module's patterns; the header records
  "not first-of-a-kind" with named precedents). **Σ = 4 → MEDIUM.**
  The D/E checklist calls were resolved at the approve per §3 and
  owner-ratified there (2026-07-31); robustness note recorded at the
  same act: E = 1 would give Σ 5, still Medium, so the band does not
  turn on that call. The chapter ratification's prose predicted "a
  Light-band opener" (plan §13 opening disposition 2) — that was a
  ratification-time PREDICTION and stays at its dated wording; §13.5
  DoD item (a)'s same-band pairing consumes this measured Medium.
  Main-thread model for the packet: Opus-class (the chapter arm).

- 2026-08-13 — ch13-p1a difficulty index, LATE-CAPTURED at the
  boundary (the ch9-boundary capture miss RECURRING, n=2: the vector
  was measured and FROZEN at the packet's approve and recorded IN the
  packet; only the §5-required append here was missed): **A 0** (14
  rows) · **B 1** (derived 3 + new-decision 4 = 7) · **C 1** (boundary
  21 files) · **D 1** (stateful-persistent: the definition schema and
  its admission state machine) · **E 2** (declared idiom-minting,
  flag 8) — **Σ 5, MEDIUM**. Main-thread model: `claude-opus-5[1m]`
  (the packet's metrics block).
- 2026-08-13 — ch13-p1b difficulty index, LATE-CAPTURED at the
  boundary (same miss, same sweep): **A 1** (16 rows) · **B 1**
  (derived 4 + new-decision 1 = 5) · **C 1** (boundary 25 files) ·
  **D 0** (pure sync render/format — the competing D 2 reading is
  band-invariant, resolved on the ch12-P4 reading at the approve) ·
  **E 1** (new module from existing idioms) — **Σ 4, MEDIUM**.
  Main-thread model: `claude-opus-5[1m]` — the packet's OWN metrics
  block was missing at build close and was late-written at this
  boundary from repo-carried records (process-log 2026-08-13 names
  the breach; the block's `baseline_note` names its sources).
- 2026-08-14 — ch14 (human decision core) RATIFIED with main-thread
  arm = **Fable-class** (the §2 alternating assignment following
  ch13, the experiment's first Opus chapter; recorded at chapter
  ratification per §5). Panel lenses and the external arm unchanged
  (arm-pin.md); the mutation pilot is STOPPED (ch13 boundary verdict
  (b)) — no dual-run. The chapter's per-packet difficulty scores
  append here at each approve, main-thread model machine-confirmed
  per the TIER-RECORD rule.

- 2026-08-15 — ch14 assignment REVISED (the user's cost ruling): the
  Fable-class main-thread arm covered the chapter ratification AND
  the full draft round (scoping, the 26-row contract, the reopen
  calls, the expressibility rulings — the high-judgment phase); from
  ch14-P1 on the main thread runs OPUS-class (a new session, model
  set BEFORE entry — the ch13 lesson). The ch14 data point is
  therefore SPLIT: the draft phase counts as the Fable measurement,
  the packet builds as Opus; whether the §2 alternation continues at
  all is the ch14 boundary's question. Review layers unchanged
  (panel Opus, arm gptsol per pin).
- 2026-09-02 — ch14-P1 difficulty index, LATE-CAPTURED at the boundary
  (the ch9/ch13 capture miss RECURRING, n=3: the vector was measured
  and FROZEN at the packet's approve and recorded IN the packet — only
  the §5-required append here was missed): **A 1** (17 rows) · **B 1**
  (derived 3 + new-decision 2 = 5) · **C 1** (boundary 22 files) ·
  **D 1** (stateful-persistent: the definition schema and its
  admission staging) · **E 2** (the re-lock's COEXISTENCE half and
  D17's widening with its class-closing guard — declared idiom-minting
  under ADR-019's regime, resolved at the approve) — **Σ 6, MEDIUM**.
  Main-thread model: `claude-opus-5[1m]` (the packet's metrics block).
- 2026-09-02 — ch14-p2a difficulty index, LATE-CAPTURED at the boundary
  (same miss, same sweep): **A 1** (20 rows) · **B 2** (derived 7 +
  new-decision 6 = 13) · **C 2** (boundary 61 files at the frozen
  approve-time score; the block later read 63 without re-scoring, as
  the index directs) · **D 1** (RULED at the approve: K17's
  subprocess-and-filesystem seam is build-time tooling, not the
  shipped kernel's runtime substrate; the other reading gives Σ 8,
  band-invariant) · **E 1** (precedented in kind) — **Σ 7, HEAVY**.
  Main-thread model: `claude-opus-5[1m]` (the packet's metrics block).
- 2026-09-02 — ch14-p2b difficulty index, LATE-CAPTURED at the boundary
  (same miss, same sweep): **A 1** (19 rows) · **B 2** (derived 6 +
  new-decision 7 = 13, the p2a mix inverted) · **C 2** (boundary 48
  files, above the 45 edge) · **D 1** (one awaited store read in the
  post-admission guard phase; the ladder stays synchronous per Q3) ·
  **E 1** (precedented in kind: ch12-p1b's entry-handler shape) —
  **Σ 7, HEAVY**. Main-thread model: `claude-opus-5[1m]` (the
  packet's metrics block).
- 2026-09-02 — ch14-p3a and ch14-p3b difficulty indices: a DEEPER miss
  than the append class, first occurrence — the index was NEVER
  COMPUTED at either approve (no difficulty paragraph exists in either
  packet), so §3's freeze-at-approve rule was breached outright rather
  than half-executed. The A–C axes are recovered NOW by exact
  arithmetic over the approve-time committed blobs — the packet file
  lands with its build commit, so those bytes are the frozen basis and
  no build outcome can leak in: **ch14-p3a @ 4632ee1d — A 1** (18
  rows) · **B 2** (derived 11 + new-decision 2 = 13) · **C 1**
  (boundary 29 files); **ch14-p3b @ 6b85904e — A 1** (16 rows) ·
  **B 2** (derived 7 + new-decision 5 = 12) · **C 1** (boundary 36
  files). The D and E checklist calls were never resolved and are NOT
  scored here: both go to the owner at the ch14 boundary review, and
  the band TURNS on them (A+B+C = 4 for both packets: Medium at
  D+E ≤ 2, Heavy at D+E ≥ 3), so no band-invariance shortcut exists.
  Σ for both packets lands with that ratification, in a follow-up
  entry. Main-thread model, both: `claude-opus-5[1m]` (the packets'
  metrics blocks). One adjacent measurement rides here because this
  sweep took it: ch14-p3a's mutation boundary grew 29 → 131 files
  post-approve (the trace-narrow hardening aftermath — the routed
  instrument-ownership signal, quantified), recorded without
  re-scoring per the index's own rule.
- 2026-09-02 — ch14-p3a and ch14-p3b D/E calls RESOLVED at the ch14
  boundary review (owner-ratified stepwise, one packet per decision;
  the A–C halves and the never-computed-at-approve breach are the
  2026-09-02 entry above). **ch14-p3a: D 1** (the verbs' runtime is
  synchronous store reads plus one transactional commit; the
  pending-Ask read is stateful-persistent; the subprocess journey is
  test-side harness, not the packet's runtime substrate — the p2a
  build-time-tooling line and ch13-p1b's D 0 CLI precedent, not
  ch13-P0's runner reading, where the subprocess WAS the product
  runtime) · **E 1** (new module from existing idioms; nothing
  declared idiom-minting under ADR-019's regime) — **Σ 6, MEDIUM**.
  **ch14-p3b: D 0** (the production delta is declaration-side — a
  template the EXISTING admission loads, plus tests; the park/decide/
  resume machinery was already built upstream) · **E 1** (precedented
  in kind: the ch13 activation-floor template wiring and p2a's
  checker-with-adversarial-negatives class) — **Σ 5, MEDIUM**. The
  disputable E 2 reading of p3b's single-use declared edit class was
  weighed at the ratification and recorded: at D 0 it is
  band-invariant (Σ 6, still Medium); the band flips only on D 1 AND
  E 2 together, both against the ratified calls independently.
