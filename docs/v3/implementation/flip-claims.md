# Phase-1 Authority-Flip — Claim Enumeration

Status: **draft — for the two-arm review BEFORE the flip commit lands.**
Date: 2026-07-09.
Revision 1 (2026-07-09): aligned to **Amendment 1** (process-v2-design.md
§7, ratified — manifest + git-native ratification) and the Phase-0.1
lint review series (11 rounds). The FC rows below describe the
post-flip texts on the NEW carrier: `packet_rows` manifest (inline
`[P:*]` marks withdrawn at design time, never live), `contract:` refs,
`{date, arms, commit}` ratification with the `reopened` lifecycle, and
the pinned post-build audit. Where the ratified §7.2 wording is looser
than the Phase-0.1 outcome (id grammar: "integer" vs
no-leading-zeros/exact-string), the FORM authorities (templates) carry
the tightened rule — §7.2 stays as ratified history.
Purpose: the packet-lint retro's lesson applied to text (process-log,
2026-07-09): the flip rewrites the authority surfaces agents EXECUTE, and
prose has the same failure mode a checker has — an under-specified claim
whose weak reading gets executed later. Every claim the flip's new text
will make is enumerated here as a row, swept along the TEMPORAL axis
(what holds across rounds/edits/commits) and the HOSTILE-READER axis
(what a rule-lawyering executor could still do). The arms review THIS
list; the flip is then written to satisfy exactly these rows; after
landing, this file is the flip's audit record (do the landed texts match
the claims?).

Source of every row, one of THREE sanctioned sets (fold round 1 — the
narrower claim contradicted the file's own rows): (a) process-v2-design.md
D1–D7 + §5 + §7 (Amendment 1, ratified); (b) the Phase-0.1 lint claim
registry (`check_packet.py`'s docstring — the mechanical outcome the
form authorities already mirror, incl. rules tightened past §7.2's
ratified wording); (c) PRESERVED live text (workflow/skill surfaces the
flip must not drop — e.g. the FC-B5 list, the first-of-a-kind rule).
This file adds NO new semantics — a row that cannot be traced to one
of these is itself a finding.

## FC-A — ReviewPacket.md (the panel engine)

- **FC-A1** The verdict set is exactly `split` / `refine` / `approve`
  plus STOP-reporting; the v1 verdict names disappear from the live
  text (the mapping note stays as history).
- **FC-A2** Approve requires ALL of: every tier-0 gate green — incl.
  the zero-reopened gate (the `--forbid-reopened` form); ONE FULL
  clean panel round — full = all five lenses ran, ON THE FINAL BYTES
  (packet-basis hash cited by each lens report); coverage matrix
  complete with no `missing` AND no unresolved `unknown`, where an
  uninspected `unknown` is NEVER routable — inspection first converts
  it to a known present/absent-with-evidence state, and only THEN may
  it be routed per D5 or split away (routing an unknown launders
  ignorance into a decision).
  *Temporal:* any fold voids all prior clean rounds — a clean round is
  bound to its hash; approve-readiness cannot be assembled from lens
  results of different revisions. *Hostile:* a narrow-delta re-check
  does NOT count as the full round; the LAST round before approve must
  be full-panel on the final bytes.
- **FC-A3** The five lenses carry their owned duties, and the
  ch7-P2-era gates are traceable to named homes (the probe and
  closure duties below; the report-contract pair lives in FC-A5, the
  finding-taxonomy discipline in FC-A4): Substrate Reality
  Probe + contested-probe corollary → lens 1; Projection/Delegation
  Closure + derived-row entailment attack + draft→packet semantic
  drift → lens 2; claim-negatives/matrix-symmetry + collapsed-lane
  inventories → lens 3; mirror/propagation (post-lint semantic
  remainder) → lens 4; downstream viability (sibling packets + plan
  rows) → lens 5. *Hostile:* a lens that did not run is `missing` in
  the matrix (blocks approve) — silence is never coverage.
- **FC-A4** Findings carry the taxonomy (`packet_defect` /
  `packet_plan_drift` / `plan_contract_challenge` / `watchpoint` /
  `considered_not_finding`) and a route; the default is FIX-ALL
  (ambiguity-transfer rationale stated in the text); routes are
  ownership-only; `plan_contract_challenge` → STOP 2;
  `packet_plan_drift` bifurcates (propagation → autonomous plan edit;
  meaning-changing → STOP 2); nothing is dropped silently — every
  considered issue is classified. The Amendment-1 §7.4 rules ride
  along: fix-all binds CONTENT findings and routes EFFORT, never
  truth (per-finding dispositions folded/narrowed/declined with
  reasons; conflicting feedback sources reconciled explicitly;
  genuinely open choices escalate as STOPs); TOOLING findings get a
  mandatory threat-model judgment with `declined: out of threat
  model` as a live route. The D5 route table rides in FULL: the two
  deferral routes carry their guaranteed revisit points
  (boundary-review → process-log line + the chapter DoD's mandatory
  log review; later-chapter → proposed plan-map row, ratified by the
  human at approve/boundary), and `declined` carries none BY DESIGN —
  a human-ratified standing decision, not a parked item.
- **FC-A5** The report contract is a validity gate: `Packet basis`
  (sha256 + HEAD + dirty state), `Skill source`, the Gate Coverage
  Matrix, and the verdict are mandatory lines; a report missing one is
  invalid and may not carry a verdict. A verdict binds ONLY the hashed
  bytes.
- **FC-A6** Watchdog: 8 panel rounds; exhaustion → STOP 3 with a
  diagnosis (churn composition → split vs draft recommendation), never
  silent continuation.
- **FC-A7** The panel never RESOLVES a STOP — it detects, classifies
  (member token from the registry), and reports; resolution is the
  human's.

## FC-B — AuthorPacket.md

- **FC-B1** Every canonical row is declared in the `packet_rows`
  manifest — id, class, refs (Amendment 1; the inline-mark convention
  was withdrawn at design time, never live, and the lint rejects a
  reappearance); refs are strict (`contract:chN-<surface>#Cn`,
  `ADR-NNN`) or `prose:`-prefixed; the machine blocks
  (mutation_boundary, packet_rows, flags routes) are written at
  authoring; the case verdict (projection/invention) is computed from
  the manifest tally and stated in the packet header with a one-line
  derivation. The machine blocks are mutation_boundary and
  packet_rows; the flags section's Route field is a labeled line, not
  a machine block (fold round 1). Form details (id grammar, keysets)
  defer to task-packet-template.md §1 — the workflow never restates
  them.
- **FC-B2** A B-case verdict (new-decision mass over the calibration
  threshold, or ANY new-decision row touching authority / separation /
  availability-class semantics — the D1 list in FULL, fold round 1:
  the shortened "authority-class" reading dropped two of the most
  expensive classes) STOPS authoring
  BEFORE drafting continues and routes to DraftContract; the
  new-decision row set is handed over as the draft's seed content.
- **FC-B3** The sizing heuristics (substrate novelty, claim families,
  matrix families, dimension count, sibling-packet fanout — the §4
  adaptation's axes in full) run BEFORE drafting; their
  outcome feeds the split decision, and an in-chapter split is executed
  autonomously per the verdict-action matrix (inheritance: mode,
  predicted class, watchpoints; fresh watchdog per part; depth 1 —
  deeper → STOP).
- **FC-B4** The loop iterates refine/split autonomously; it stops at
  approve (human in calibration) and at every STOP. *Temporal:* the
  0a next-step derivation + its immediate announcement survive
  unchanged; the flag write-back loop and fresh-eyes pass survive as
  the loop's internal discipline (now largely mechanized by tier 0,
  with the semantic remainder in lens 4).
- **FC-B5** Preserved from the current text, traceable: delegation
  closure at write time; substrate probes at authoring; prose-contract
  extraction; the Mirrored Surface Map; "flags live IN the packet."
- **FC-B6** The entry-mode note (§5 item 3, the D6 trust dial): the
  user chooses per work item — prompt-by-prompt in the loop, or
  delegating a whole packet/chapter — with no formal mechanism; the
  AuthorPacket text states it.

## FC-C — DraftContract.md (new workflow)

- **FC-C1** Scope: one chapter's memo-born surface; content bar =
  tree-independence (decidable without `v3/src`; substrate probes ARE
  draft-time work); the Control-Model checklist is the round-0
  skeleton.
- **FC-C2** The artifact follows contract-draft-template.md exactly
  (docs win); every normative statement is a C-row — prose is
  non-normative by declaration, and an iff-clause found in prose is a
  review finding, never a legal edit path.
- **FC-C3** The draft loop = the packet loop minus `split` (a draft
  split is STOP `2:draft-split`); watchdog 8; tier 0 = draft-lint.
- **FC-C4** Ratification and RE-ratification are permanently human.
  The record is `{date, arms, commit}` — the recorded sha binds
  CONTENT, not the record (the block lands in a follow-up commit); a
  reopen runs the two-commit choreography through the transient
  `reopened` status (equality suspended ONLY there; packet refs into
  a reopened draft go loud-red for the window; ZERO reopened drafts
  at packet approve, chapter close, and the flip — tier-0 reportable,
  `--forbid-reopened`). The machine check is the recorded-commit
  equality (working-tree C-rows == C-rows at the latest block's
  commit; the sha must resolve to a COMMIT object); older blocks are
  human-readable history verified by diff review, not tier 0 — the
  stated threat model. Packets anchor only to ratified-or-later rows
  (reopened does NOT qualify).
- **FC-C5** At chapter close the boundary review fills the realized map
  and flips status in place, in ONE act (ANY map row on a non-realized
  status is red); the file never moves; row IDs never change.

## FC-D — contract-draft-template.md (new, the form authority)

- **FC-D1** The template is the canonical FORM authority; draft-lint's
  constants are its mechanical mirror — on any mismatch the TEMPLATE
  wins and the lint is the bug.
- **FC-D2** The template documents exactly what the lint enforces
  today (the Amendment-1 carrier), the FULL registry (fold round 1 —
  every omission is a weak-reading gap in the form authority):
  exactly ONE contract_draft meta block ({chapter, surface, status}
  exact keyset; status draft|ratified|reopened|realized; filename
  ch<N>-<surface>-contract.md MATCHES chapter/surface); C-rows
  (unique ids, NO leading zeros — ids are exact strings;
  ratified-or-later requires ≥1 row); ratification blocks (exact
  keyset {date, arms, commit}: YYYY-MM-DD date, nonempty string-list
  arms, 7–40 LOWERCASE-hex commit — shape-checked on EVERY block,
  while the COMMIT-object resolution and the equality check run on
  the LATEST block only, in ratified/realized; dates non-decreasing;
  latest = last in document order); the two-commit ratification and
  reopen choreography; the state-consistency status rules; the
  realized map (exactly one block, keys exactly the C-row id set,
  every landing site a nonempty string, ANY map presence ⇔
  realized). The cross-cutting machine-block rules ride along:
  duplicate JSON keys are parse errors, and fences follow the
  line-oriented CommonMark scanner (quoted fences are material).
  *Hostile:* nothing in the template may describe a field the lint
  cannot see, without marking it panel-owned — and the mirror rule
  cuts both ways: a lint check the template does not document makes
  the LINT the bug (FC-D1).

## FC-E — task-packet-template.md §2 rewrite

- **FC-E1** §2 remains THE authoritative checklist; after the flip it
  contains: the D1 classification step (before drafting), the sizing
  step, the draft-routing STOP, and step 10 rewritten to the
  panel/verdict form — so the docs-win rule can never resurrect the
  old rubric. *Hostile:* an agent reading ONLY §2 (never the
  workflows) must reach the same process.

## FC-F — README §4–§6 + §5.5

- **FC-F1** README becomes the canonical process authority for: the
  autonomy envelope (4-STOP list + verdict-action matrix), the
  canonical STOP member-token registry (authority MOVES here from the
  design doc — and the lint's docstring pointer is updated IN THE SAME
  COMMIT: the flip therefore touches `tools/v3-plan/check_packet.py`'s
  header comment, an addition to the §5 item-8 file list discovered by
  this enumeration), the draft phase in the build loop incl. the
  `reopened` lifecycle's gate rule (zero reopened drafts at packet
  approve / chapter close / the flip), the post-build audit's
  INVOCATION point (after the build commit lands, the loop runs
  `--post-build` with that commit's sha — CI cannot run it, it has no
  sha; without a process home the audit is orphaned), the routing
  rule's third row (shape → contract-draft), the Amendment-1 §7.4
  process rules WITH the stated threat model (fix-all scope, tier-0
  scoping, effort/truth; one operator + review-gated agents — the
  machine gates defend against drift, never adversarial forgery: a
  rule living only in the historical design doc would be an FC-X2
  defect at flip time), the D6 calibration rule (the human approve is
  the detector's measurement instrument — a human-found new-decision
  miss is a detector bug: fix the rule, do not add process), the
  first-of-a-kind rule PROMOTED to canonical process text (the first
  packet of a new task class is human-approved regardless of trust
  stage — today it lives only in the skill's Hard boundaries; source
  class: preserved live text), and the metrics convention.
- **FC-F2** §5.5's standing-checkpoint list post-flip: chapter
  ratification, model↔code divergence stop, draft ratification —
  restated IDENTICALLY on AGENTS.md and SKILL.md; the refine/split
  human clause and the unconditional ADR proposed→accepted entry are
  gone, replaced by the matrix reference and the three packet-flow ADR
  lanes (canonical statement in README; others defer).
- **FC-F3** *Hostile:* an agent reading ONLY ONE of the three authority
  surfaces must reach the same rules — no surface carries a rule the
  others contradict or omit in a direction-changing way.

## FC-G — AGENTS.md v3 section

- **FC-G1** The verdict sentence is replaced by the matrix summary
  (STOPs + flag-bearing approves are the user's; refine + in-chapter
  split are the loop's); "never build before approve" and "chapters
  start on the user's go" SURVIVE unchanged; never-git-push survives
  (Safety section untouched).

## FC-H — CreateTaskPacket/SKILL.md Hard boundaries

- **FC-H1** Same rewrite as FC-G1 at the skill entry point; the
  "AuthorPacket ENDS at ready-for-pre-approval" sentence updates to
  the loop form (iterates refine/split; stops at approve/STOPs);
  first-of-a-kind stop survives as a calibration-stage rule (its
  canonical statement moves to README per FC-F1; the skill mirrors).

## FC-I — plan.md

- **FC-I1** §1.3 gains the predicted-class column convention (applies
  from ch8 ratifications); §7.7's P3/P4 rows gain pre-registered
  predictions: P3 `projection` (sources: P1/P2 packet contracts + plan
  §7.4), P4 `projection` (the six-precedent CLI class + §7.5) — BEFORE
  P3 authoring starts.

## FC-X — cross-cutting

- **FC-X1** ONE commit carries all of the above (plus this file's
  status flip to its audit-record form); no packet work starts before
  it lands; nothing is in flight at flip time (P2 built; P3 not
  started) — stated in the commit message.
- **FC-X2** Post-flip authority chain, stated once: README = process
  authority; templates = form authority; workflows = procedure; design
  doc + this file = history. A rule found ONLY in the design doc after
  the flip is a defect (the D2 no-third-authority rule applied to the
  flip itself).
- **FC-X3** Canonical-statement homes post-flip (one home, others
  defer): STOP list + matrix + token registry → README; ADR lanes →
  README; draft artifact form → contract-draft-template; packet form
  (incl. the manifest rules and id grammar) → task-packet-template;
  fix-all + §7.4 scope/effort-truth rules + routes → README canonical
  with ReviewPacket as the procedure mirror; packet_metrics → schema
  FORM in task-packet-template §1, process convention in README; the
  post-build audit → contract in task-packet-template §1a with the
  lint docstring as the mechanical mirror, invocation in README's
  build loop (FC-F1).

## Review record

**Fold round 1 (2026-07-09): two arms, both refine; 14 consolidated
findings (3 + 11, overlapping), all folded — per-finding dispositions
per the §7.4 effort/truth rule:**

- FC-B2 restored to D1's FULL Case-B trigger list (the shortened
  "authority-class" reading dropped separation and availability-class
  — two of the most expensive classes).
- FC-A2 gained the round-3-fold unknown-inspection rule (an
  uninspected unknown is never routable) and the zero-reopened tier-0
  gate.
- The §7.4 threat-model STATEMENT got its FC home (FC-F1) — without
  it, FC-X2's own rule would make it a defect at flip time.
- The post-build audit's INVOCATION point got its process home
  (FC-F1; homes split in FC-X3) — CI cannot run it, so an unhomed
  audit is orphaned.
- FC-D2 now lists the lint's FULL live draft registry (filename↔meta,
  exactly-one meta, ≥1 row at ratified-or-later, lowercase hex,
  every-block shape vs latest-block resolution/equality, exact
  realized-map contract, cross-cutting duplicate-key + fence rules) —
  both arms converged on this row (arm 1's commit/realized_map
  subset ⊂ arm 2's list).
- FC-B3 restored substrate novelty to the sizing axes.
- The source statement widened to the three sanctioned sets (design
  doc / lint claim registry / preserved live text) — the narrow claim
  contradicted the file's own rows.
- Three unclaimed ratified rules got rows: the D5 route table in full
  (FC-A4), the entry-mode note (new FC-B6), the D6 calibration rule
  (FC-F1).
- FC-B1's "flags routes" corrected: a labeled field, not a machine
  block.
- FC-A3's "four" scalar dropped per counts-to-lists; homes pointed.
- FC-H1's first-of-a-kind rule: arm 1 offered promote-or-drop —
  PROMOTED (a D6-class trust rule; canonical home README per FC-F1;
  source class: preserved live text).

State: awaiting the arms' re-run on these bytes.
