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
