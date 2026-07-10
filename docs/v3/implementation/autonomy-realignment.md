# Autonomy Realignment — anchor for the alignment commit

Status: the USER's course correction (2026-07-10), captured BEFORE the
alignment commit so its review has an anchor. The alignment commit is
written to satisfy exactly the AL rows below; reviewers diff the
landed texts against this file. Ratification: the user's explicit
approval of the landed alignment (their arms may review first).

**RATIFIED 2026-07-10** — the user's explicit act ("approve") on the
landed state at commit `a2673f6d` (rounds 1–6, AL-1..AL-20; the
flagged decisions AL-11 and AL-19 stand approved). Process work STOPS
here per drift point 3; the next act is the ch7-P3 pilot.

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

## Addendum — round 3 (2026-07-10, two arm reviews on round 2)

- **AL-10 — the "only element not carried" claim is corrected by
  CARRYING the rest:** round 2 overstated — the v1 gate's tail was
  not fully carried. Now it is: the milestone-gated rule lands as a
  normative step-0 bullet (future milestone-gated behavior → document
  the contract now, keep activation in a later packet, keep current
  runtime behavior fail-closed); the RECORD gains the v1 conditional
  annexes, each triggered by its own material — closure-budget
  triage (buckets touched; adjacent closures intentionally collapsed
  and why that collapse is safe; closures explicitly deferred),
  proof-boundary triage (current and target canonical proof source;
  final status/event surfaces affected; mixed-truth check;
  proof-parity required HERE vs explicitly deferred), and the
  mutable-flow record (zero side effects on precondition failure;
  rollback/retry/preservation in the same slice; coordination
  primitives introduced or explicitly split out). After AL-10 the
  round-2 sentence is TRUE: the numeric scoring wrapper is the only
  v1 element not carried.
- **AL-11 — the testkit surface rule is NARROWED (a v3 adaptation
  decision, stated for the user's veto):** testkit counts as a
  surface — and toward the hard-stop family counts — ONLY when the
  testkit CONTRACT changes (a new fake/seam, a fixture type, a
  recording-sink shape); tests merely exercising the change never
  count. Reason: v1 counted production surfaces only; counting the
  drive trips hard stop 2 on routine kernel packets — the ch7-P1
  retro-check: a ratified-good single packet would have been
  split-REQUIRED. The rejected alternative (intentional tightening:
  every routine packet continues only with closure proof) contradicts
  the restored intent — that is ceremony, not convergence protection.
- **AL-12 — consequence fixes from the round-2 reviews:** the
  escalation combos restated in COUNTS (the dropped 0|1|2 scale is
  not the referent; the two combos overlapping hard stop 2 carried
  for self-containment and marked as such; the third named as the
  one firing below it); the Mandatory Output Audit split per TARGET
  KIND (packet outputs are not demanded of drafts — the draft list
  audits the semantic remainder above the tier-0 form lint:
  Control-Model answers, probe-or-source on substrate-resting rows,
  seed-row disposition); the Gate Coverage Matrix renumbered §2a so
  2a/2b pair; the CANONICAL template's threshold name aligned to the
  AL-9 rename ("permissive" — the mirror had outrun the canon); the
  "(the Phase-2 pairflow integration)" parenthetical DELETED (it was
  a bridge to the retired name, reintroducing the collision AL-9
  removed).

## Addendum — round 4 (2026-07-10, one arm review on round 3)

- **AL-13 — AL-11's retro-example was wrong under its OWN rule, and
  the template line said the opposite of the rule's letter:** ch7-P1
  itself INTRODUCED the recording sink
  (`v3/src/testkit/diagnostics.ts`, a new file — a testkit-contract
  change), so under the narrowed rule P1's testkit involvement
  COUNTS: three surfaces, hard stop 2 trips. P1 is not the case the
  narrowing saves; it is the TRIPS-WITH-CLOSURE-PROOF case — the
  gate working as intended (natural closure, ratified good as one
  packet). The narrowing stands on the general argument ALONE: every
  packet has tests, so counting the mere drive makes three surfaces
  trivial. The template line is reframed to say exactly this, with
  P1 as the example of the OTHER branch.
- **AL-14 — the completeness claim, falsified a second time, changes
  FORM: a universal negative becomes a CLOSED exclusion list with
  reasons.** The two elements round 3 still missed: (a) the v1
  scan's external/integration role — NOT empty in v3 (the kernel's
  dispatch/egress surface: `deriveDispatchIntent`,
  `ports/egress.ts`, the fake egress adapter) — is CARRIED into the
  scan role list; the v1 workflow/orchestration role stays out WITH
  its reason: the v3 kernel IS the orchestrator — that consumption
  is already the execution-consumer role; a separate role would
  double-count it. (b) The v1 "For Plans" tail is carried as one
  sentence: the same gate informs the CHAPTER's packet cut at
  ratification (the plan §N.7 table), and no numeric score is
  persisted anywhere — the record is always the resulting
  split/dependency shape. The exclusion list, CLOSED: the numeric
  scoring wrapper (reason in AL-7) and the workflow/orchestration
  scan role (reason above). A future gap falsifies THIS LIST, not a
  prose adverb.
- **AL-15 — the "substrate-resting row" coinage gets its definition
  pointer** (DraftContract §1.2 — a row resting on
  driver/OS/filesystem behavior carries an in-session probe result
  or a concrete cited source).

## Addendum — round 5 (2026-07-10, two arm reviews on round 4)

- **AL-16 — the closed exclusion list lands IN THE CANON:** template
  §2 step 0's intro still said "carried in full; the one element not
  carried is the numeric scoring wrapper" — falsified by AL-14's own
  second exclusion. The intro now carries the CLOSED two-element
  list with both reasons inline (numeric 0|1|2 wrapper — the axes
  and combinations carry the same decisions; workflow/orchestration
  scan role — the v3 kernel IS the orchestrator, that consumption is
  the execution-consumer role, a separate role would double-count
  it). The round-2 self-containment rule is what this satisfies: the
  reader learns the deliberate omission and its reason FROM the
  authority text, not from the anchor.
- **AL-17 — the "§N.7" reference class is RETIRED on live surfaces
  (the family swept at the sink, beyond the one flagged instance):**
  the packets table's section number WANDERS by chapter (4.8 / 5.8 /
  6.7 / 7.7 — it depends on how many sections the chapter has), so a
  literal `§N.7` resolution breaks exactly where it matters most:
  ch8+, where autonomy opens and the loop resolves the reference
  without a human. All eight live occurrences (template,
  contract-draft-template, README, ReviewPacket, DraftContract,
  AuthorPacket ×3) switch to the GENRE name — "the chapter's
  Packets-and-flow-mode table" — with one resolve-by-heading note at
  the operational resolver (AuthorPacket step 2).

## Addendum — round 6 (2026-07-10, two arm reviews on round 5)

- **AL-18 — the plan's convention paragraph joins the genre-name
  class; the round-5 sweep claim was ENUMERATION, falsified by
  measurement:** "all eight live occurrences across six surfaces"
  was counted from the edited-file list, not measured over the
  defined live set — a full-scope grep found THREE more in
  plan.md:107-116 (the predicted-class convention paragraph — the
  highest-authority surface, and exactly the ch8+ zone where the
  reference must resolve without a human). The paragraph's three
  `§N.7` mentions switch to the genre name (propagation-class plan
  edit: AL-17's naming decision applied — naming, not semantics —
  with a visible in-paragraph alignment marker). Post-fold residue,
  MEASURED (grep over docs/v3 + skills + AGENTS.md): zero on live
  surfaces — the remaining hits are this anchor's own captured rows
  (AL-14's round-4 text stays as history-of-intent; AL-17's
  meta-mentions NAME the retired class), dated process-log entries,
  and the FC-X2 history files (flip-claims, process-v2-design).
- **AL-19 — the resolver hardens against heading variants (a
  convention ADDITION, flagged for the user's veto like AL-11):**
  legacy headings vary (ch4 "Packets — the convention's first live
  use", ch5 "Packets and the flow mode", ch6/7 "Packets and flow
  mode"), so the match rule becomes "the chapter section whose
  heading STARTS WITH `Packets`" (AuthorPacket step 2), and the
  plan's convention paragraph states the forward rule: from ch8
  ratifications the section heading is exactly `Packets and flow
  mode` — resolvers match the heading, never the number.
- **AL-20 — the measurement rule is MINTED (the meta-remark's fourth
  recurrence):** a completeness or sweep claim ("all N occurrences",
  "the only element not carried") is admissible only WITH its
  measurement — the defined scope and the command output that proves
  it; enumeration from memory is not a measurement. Lands in README
  §5.5's finding-policy block; binds panel reports and fold reports
  alike.
- **Arm-2's two flip-claims findings — no AL row, disposition only:**
  their SUBSTANCE (P8 post-build is build-close, not approve-time;
  clean excludes STOP-class findings) is already carried by the live
  authority (README §4 step 8 "build-close tier-0", the §5.5 matrix's
  "approve-time tier-0 gate green", ReviewPacket's "clean = ZERO
  fold-now findings AND ZERO STOP-class findings"); the flagged files
  are declared history (FC-X2 — flip-claims' own status banner says
  "the landed texts are the authority"). The two arms' apparent
  conflict reconciles as: arm-1's history rule wins the edit
  question; arm-2's substance verified as already-landed.
