# Autonomy Realignment — anchor for the alignment commit

Status: the USER's course correction (2026-07-10), captured BEFORE the
alignment commit so its review has an anchor. The alignment commit is
written to satisfy exactly the AL rows below; reviewers diff the
landed texts against this file. Ratification: the user's explicit
approval of the landed alignment (their arms may review first).

## The intent being restored

v1's `ExecutePairflowPlan` delivered a WHOLE plan autonomously; its
one gap was the missing contract layer (no ledger → intent drift
inside task delivery). v3 exists to ADD that layer, not to add human
ceremony: chapter = plan, packet = task. **The human's seat is where
decisions are born** — chapter ratification, contract-draft
ratification (the memo-born middle layer), and genuine new decisions
(STOPs). Once the sources are ratified, a packet is PROJECTION —
machine-checkable — and flows without per-packet approval. The v1
gates' hard-won core is mostly NOT content validation: it is
CONVERGENCE protection (self-containment, sizing, "not too
ambitious") and applies to every packet regardless of autonomy.

## The three drift points being corrected

1. "Calibration" became an open-ended human-approves-everything stage
   with GROWING preconditions on delegation (metrics thresholds, then
   a risk-assessment adaptation) — the autonomy trajectory inverted.
2. The v1 Complexity-Risk gate's risk axes were framed as
   autonomy-gating and deferred; they are actually SIZING/convergence
   guards needed at write time, for every packet.
3. Process built on process, unused — the correction closes with a
   STOP on process work; the next act is the P3 pilot.

## The AL rows (the alignment commit satisfies exactly these)

- **AL-1 — The human's seat (README §5.5 matrix + §5.5 checkpoints).**
  The "approve, flag-free" row changes to: **AUTONOMOUS from ch8 on**
  — a flag-free approve (zero new-decision manifest rows, zero
  approve-ratified routes, every approve-time tier-0 gate green, one
  full clean panel round) does not wait for the user; the loop
  proceeds. The ch7 pilot packets (P3/P4) stay human-approved
  (first-of-a-kind per the plan) — the LAST per-packet manual rounds.
  Unchanged human decision points: chapter ratification;
  contract-draft ratification/re-ratification; every STOP (1–4 —
  flag-bearing approve is STOP `4:flagged-approve`, the user's at
  every stage); the divergence stop; first-of-a-kind packets; a new
  chapter starts only on the user's explicit go.
- **AL-2 — On an autonomous approve the flow PROCEEDS TO BUILD**
  (AuthorPacket step 9 + README §4): the v1 model restored — approve
  → build → one-packet-one-commit → post-build audit; any STOP or
  flag halts for the user. AuthorPacket's "never proceeds to build"
  boundary is scoped to human-gated cases (ch7 pilot, first-of-a-kind,
  flag-bearing, STOPs).
- **AL-3 — The v1 risk axes return as WRITE-TIME sizing/split
  triggers** (template §2 step 0 canonical; AuthorPacket step 2.4
  mirrors; README §5.5 names them): authority movement
  (introduces/moves a canonical source of truth), surface spread (how
  many distinct surfaces must change for one concept), foundation +
  activation coupling (build-the-base and turn-it-on in one packet —
  the ch8/MD-1 shape), prerequisite coupling (depends on unfinished
  sibling work), acceptance multiplicity (distinct success classes at
  once). NOT a numeric scoring apparatus: axes + the v1 hard-stop
  SHAPE as split triggers (an in-chapter split is autonomous anyway;
  a scope-changing one is STOP 2). Source:
  `.claude/skills/CreatePairflowSpec/references/Complexity-Risk-Gate.md`.
- **AL-4 — The chaining-precondition sentence is REPLACED** (README
  §5.5 rollout paragraph): the "risk assessment is a precondition of
  auto-approve/chaining" clause (added 2026-07-10) is superseded —
  AL-3 adopts the axes NOW, AL-1 opens packet-level autonomy at ch8.
  What remains Phase-2: chapter-level chaining through
  `ExecutePairflowPlan` (pairflow doc-bubbles carry refinement +
  implementation).
- **AL-5 — Measurement moves post-hoc** (README §5.5 D6 clause): the
  calibration measurement ("did the human find new-decision content
  the detector missed?") relocates to the chapter boundary — the
  boundary review AUDITS the autonomously-approved packets (manifest,
  flags, detector_misses) — plus the build/aftermath discovery stream;
  hand-catches still become gates, post-hoc instead of pre-approval.
- **AL-6 — Mirrors** (AGENTS.md + SKILL.md identical restatements +
  AuthorPacket report tail): updated to the AL-1/AL-2 matrix summary.

## What does NOT change

The STOP registry and tokens; the panel engine and its lenses; the
manifest/lint/draft machinery (it is exactly what makes AL-1 safe);
draft ratification permanently human, never inferred; one packet =
one commit; the post-build audit; the DoD; the threat model; the
watchdog; fix-all and the routes.

## Addendum — round 2 (2026-07-10, the user's instruction + two arm reviews)

The user's rule for this round: the v3 texts must be SELF-CONTAINED
(no "check the referenced v1 gate" reliance), and NOTHING from the v1
risk gate may be dropped without a stated reason.

- **AL-7 — the COMPLETE risk gate lands in template §2 step 0:** all
  SIX v1 axes (identity/join fragility RESTORED — v3 has cross-seam
  joins: diag rows correlated to instances/timeline across two
  stores), all ELEVEN hard-stop combinations translated to v3
  surfaces, the below-hard-stop escalation combos, the discovery-first
  consume-family scan (present/absent/unknown), the
  implementation-closure proof requirement ("shared invariant
  coherence is NOT sufficient"), the split-shape vocabulary, and the
  RECORD requirement (the packet materializes the assessment).
  **The ONLY v1 element not carried, with the reason:** the 0|1|2
  numeric scoring and its 0–4/5–7/8–12 thresholds — the qualitative
  axes + the hard-stop/escalation COMBINATIONS carry the same
  decisions without presuming v1's score calibration; if a packet
  class later needs finer discrimination, scoring returns via the
  boundary review.
- **AL-8 — the review-side Mandatory Output Audit + the split-bias
  rule land in ReviewPacket** (the v1 ReviewSpec §2a rhythm the user
  remembers): before any approve, audit that every triggered
  mandatory output is MATERIALIZED in the packet (detail budget:
  N/A-with-evidence / compact / full); a missing output is a refine
  finding that ADDS it — round 1 materializes, the next round
  assesses. And: **split is NOT advisory** — a hard-stop combination
  defaults the verdict to `split`; a single packet continues only
  with implementation-closure proof ("somewhat ambitious but fine" is
  not a legal assessment — the v1 bias this rule exists for).
- **AL-9 — consequence fixes from the round-1 reviews:** the
  ReviewPacket approve-owner sentence and template §2 step 10 align
  to the matrix (both P1s); README §8's tail gets the same short
  restatement; the ramp stages get their post-realignment definitions
  in §5.5 (calibration = through the ch7 pilot, closed; measurement =
  ch8+ autonomy with the post-hoc boundary audit; chaining = the
  Phase-2 pairflow delivery — so plan §1.3's convention and the
  template header enum stay meaningful); the rollout "Phase 2" is
  renamed "the chaining stage" (three meanings collided); the
  "calibration-permissive" threshold name drops its stage prefix; the
  matrix wording aligns literally to AL-1 ("new-decision MANIFEST
  rows", "approve-time TIER-0 gate").
