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
- **FC-A2** Approve requires ALL of: every APPROVAL-TIME tier-0 gate
  green — the pre-build set, incl. the zero-reopened gate (the
  `--forbid-reopened` form); the P8 post-build audit is a BUILD-CLOSE
  tier-0 audit, NOT an approve-readiness gate (fold round 3: a strict
  reader could otherwise block approve forever waiting for it, or
  silently demote it out of tier 0); ONE FULL
  clean panel round — full = all five lenses ran AS FRESH-CONTEXT
  SUB-AGENTS (D4; single model family is fine — the author's context
  NEVER scores its own bytes clean), ON THE FINAL BYTES (packet-basis
  hash cited by each lens report); clean = ZERO fold-now findings AND
  ZERO STOP-class findings — a `plan_contract_challenge` or a
  meaning-changing `packet_plan_drift` is never part of a clean
  round; only non-STOP D5-routed and watchpoint items ride as
  flags/routes without voiding it; coverage matrix
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
  inventories + prose range/scalar consistency (the tier-0 duty §7.2
  withdrew to review — lens material, not machine data) → lens 3; mirror/propagation (post-lint semantic
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
  a human-ratified standing decision, not a parked item. The phase-2
  obligation is preserved: findings/flags/routes stay EXPRESSIBLE in
  the severity ontology's language (timing/layer) for when packets
  flow through doc-bubbles.
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
- **FC-A8** ReviewPacket's pre-v2 dual-mode split (`self_review` /
  `pre_approval`) RETIRES into the single panel procedure — D4
  defines ONE engine with ONE verdict set; the loop invokes that
  panel every round (what `self_review` used to floor), and a
  standalone invocation runs the same engine. The
  "ready for pre-approval" state name disappears with the modes; the
  SKILL.md routing table, the two-modes paragraph, and the Examples
  block are rewritten accordingly (the skill-side edit rides FC-H1).
  Entailed, not new semantics: two modes cannot coexist with one
  engine — disposition open to the arms' challenge.
- **FC-A9** The restructure carries a PRESERVATION CONTRACT (fold
  round 3 — FC-B7's edit-mode logic applied to the file the flip
  actually RESTRUCTURES): every check of the pre-flip ReviewPacket is
  either assigned to a named lens/report element or given an explicit
  retire/absorb disposition — nothing falls out silently. Named at
  minimum: the content half (ledger-consistency checks 1–6, the
  review core of kernel-semantic packets) → named lens homes; the
  Contract Reality Gate's FOUR mandatory inventories (substrate
  probe, delegation closure, code-path inventory incl. the transitive
  call-graph + port-await branch, free-text boundary inventory) →
  lens 1/2 duties BY NAME; the final text sweep (scalar/quantifier +
  conditional-presence clauses) → lens 3; the claim-half R-rules run
  as checks (R-WIDE-CLAIM, R-DIMENSIONS, R-NUMERIC-LADDER,
  R-EXECUTION, R-STRUCTURE-SEMANTICS, the "cannot occur" lane rule,
  R-RAW-FIXTURES) → named lens homes; the ergonomics half
  (self-containment, mirror discipline, density, embedding
  freshness) → lens 4/5. And the LearnedRules registry is not merely
  untouched (FC-H2) but CONSUMED: the new panel text names its
  per-lens consumption points — an untouched-but-unreferenced
  registry is orphaned.

## FC-B — AuthorPacket.md

- **FC-B1** Every canonical row is declared in the `packet_rows`
  manifest — id, class, refs (Amendment 1; the inline-mark convention
  was withdrawn at design time, never live, and the lint rejects a
  reappearance); refs are strict (`contract:chN-<surface>#Cn`,
  `ADR-NNN`) or `prose:`-prefixed. Authoring writes THREE machine
  blocks — `ledger_slice` (the check_coverage contract),
  `mutation_boundary`, `packet_rows` — plus the flags section's
  labeled Route lines (prose fields, not a machine block);
  `packet_metrics` is the CLOSE-time machine block (fold round 2: the
  fold-1 wording both contradicted itself and reproduced the
  under-enumeration class it was fixing). The case verdict
  (projection/invention) is computed from the manifest tally and
  stated in the packet header with a one-line derivation (form home:
  the template §1 header line, FC-E2). The D1 derived-row DERIVATION
  NOTE (one line per derived row) lives in the row's own table text —
  lens-2 material for the entailment attack, NOT manifest data: the
  exact keyset stays {id, class, refs} (fold round 3 — the ratified
  D1 semantics needed a carrier home; extending the manifest schema
  was the declined alternative). Form details (id grammar,
  keysets) defer to task-packet-template.md §1 — the workflow never
  restates them.
- **FC-B2** A B-case verdict (new-decision mass over the calibration
  threshold, or ANY new-decision row touching authority / separation /
  availability-class semantics — the D1 list in FULL, fold round 1:
  the shortened "authority-class" reading dropped two of the most
  expensive classes) STOPS authoring
  BEFORE drafting continues and routes to DraftContract; the
  new-decision row set is handed over as the draft's seed content.
  The threshold is CALIBRATION-PERMISSIVE, and tightening it is a
  config change, not a redesign (D1).
- **FC-B3** The sizing heuristics (substrate novelty, claim families,
  matrix families, dimension count, sibling-packet fanout — the §4
  adaptation's axes in full; the adopted Closure-Budget
  bucket-coincidence split trigger is SUBSUMED by these axes, stated
  so the rule reads as carried, not lost) run BEFORE drafting; their
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
- **FC-B7** Edit mode, stated (fold round 2): the flip EDITS
  AuthorPacket in place — live text not named by FC-B1–B6 (the step-0
  ratified-chapter gate, the operability/empty-slice classification,
  the write-time inventory disciplines, the embedding gates +
  type-ripple + probe rules) survives UNCHANGED unless it contradicts
  the verdict-action matrix or the new carrier; FC-B4/B5 name the
  surfaces the restructure is most likely to disturb, not an
  exhaustive whitelist.

## FC-C — DraftContract.md (new workflow)

- **FC-C1** Scope: one chapter's memo-born surface; content bar =
  tree-independence (decidable without `v3/src`; substrate probes ARE
  draft-time work); the Control-Model checklist is the round-0
  skeleton. The bar is OPERATIONALIZED, not just named: the D2 litmus
  ("if v3/src were deleted and rewritten from the packets, would this
  row still be true and decidable?") and the In/Out boundary lists
  ride into the DraftContract/contract-draft-template texts.
- **FC-C2** The artifact follows contract-draft-template.md exactly
  (docs win); every normative statement is a C-row — prose is
  non-normative by declaration, and an iff-clause found in prose is a
  review finding, never a legal edit path.
- **FC-C3** The draft loop = the packet loop minus `split` (a draft
  split is STOP `2:draft-split`); watchdog 8; tier 0 = draft-lint.
  The lens scope for drafts is stated: the substrate lens FULLY
  applies (probes are tree-independent), embedding-class checks are
  n/a — without this, FC-A2's "all five lenses" is uninstantiable on
  a draft.
- **FC-C4** Ratification and RE-ratification are permanently human.
  The record is `{date, arms, commit}` — the recorded sha binds
  CONTENT, not the record (the block lands in a follow-up commit); a
  reopen departs from `ratified` ONLY (a `realized` draft is
  chapter-closed — a post-close change is a STOP, not a lifecycle,
  §7.3) and runs the two-commit choreography through the transient
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
- **FC-C6** The draft metrics one-liners (rounds to ratify;
  new-decision row count; post-ratification reopenings = ratification
  blocks beyond the first) are recorded at ratification and at close
  — form home: contract-draft-template; procedure: DraftContract (D2:
  the "expected 2–3 rounds" prediction is testable only if measured).

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
  (DISCOVERED as table rows whose FIRST cell is C<n>, fenced code
  excluded — the lint's stated claim; unique ids, NO leading zeros —
  ids are exact strings; ratified-or-later requires ≥1 row); ratification blocks (exact
  keyset {date, arms, commit}: YYYY-MM-DD date, nonempty string-list
  arms, 7–40 LOWERCASE-hex commit — shape-checked on EVERY block,
  while the COMMIT-object resolution and the equality check run on
  the LATEST block only, in ratified/realized; dates non-decreasing;
  latest = last in document order); the two-commit ratification and
  reopen choreography; the state-consistency status rules SPELLED OUT
  (ratification blocks present ⇔ status ∈ {ratified, reopened,
  realized}; status draft ⇒ no blocks — fold round 3: every
  neighbouring item is written letter by letter, compressing these
  two was the row's own weak-reading gap); the
  realized map (exactly one block, keys exactly the C-row id set,
  every landing site a nonempty string, ANY map presence ⇔
  realized). The cross-cutting machine-block rules ride along:
  duplicate JSON keys are parse errors, and fences follow the
  line-oriented CommonMark scanner (quoted fences are material).
  *Hostile:* nothing in the template may describe a field the lint
  cannot see, without marking it panel-owned — and the mirror rule
  cuts both ways FOR THE DRAFT-ARTIFACT FORM CHECKS: a form check the
  template does not document makes the LINT the bug (FC-D1). The
  lint's non-form checks (the reopened gate form, the post-build
  audit) sit OUTSIDE this mirror — their homes are named in FC-X3
  (fold round 2: the unscoped clause would have made them "the lint
  is the bug" by definition).

## FC-E — task-packet-template.md §2 rewrite

- **FC-E1** §2 remains THE authoritative checklist; after the flip it
  contains: the D1 classification step (before drafting), the sizing
  step, the draft-routing STOP, and step 10 rewritten to the
  panel/verdict form — so the docs-win rule can never resurrect the
  old rubric. *Hostile:* an agent reading ONLY §2 (never the
  workflows) must reach the same process.
- **FC-E2** Template §1/§1a's self-obsoleting sentences flip IN THE
  SAME COMMIT (the adopted status-flip sweep rule: every file stating
  the old status): the `stops[].type` registry pointer turns to
  README; the two "lands with the Phase-1 flip" sentences rewrite to
  the landed state; and §1 gains the packet-header classification
  line's form definition (case verdict + one-line derivation —
  FC-B1's form home). Three completions ride the same sweep (fold
  round 3): §1's ref rule states the `prose:` NONEMPTY-remainder
  requirement (the lint's claim, one word today missing); §1
  documents the derived-row derivation-note carrier (in-row text, not
  manifest data — FC-B1); and §1a's audit contract completes to the
  P8 claim set (pinned sha, packet-file-in-changed, merge rejection,
  empty-change-list red, boundary read from the packet's bytes AT the
  audited commit) — the audit sits outside the FC-D2 mirror, so
  nothing else forces §1a's completeness.

## FC-F — README §4–§6 + §5.5

- **FC-F1** README becomes the canonical process authority for: the
  autonomy envelope (4-STOP list + verdict-action matrix), the
  canonical STOP member-token registry (authority MOVES here from the
  design doc — and the lint's docstring pointer is updated IN THE SAME
  COMMIT: the flip therefore touches `tools/v3-plan/check_packet.py`'s
  header comment, an addition to the §5 item-8 file list discovered by
  this enumeration), the draft phase in the build loop incl. the
  `reopened` lifecycle's gate rule (zero reopened drafts at packet
  approve / chapter close / the flip), the TIER-0 GATE INVENTORY
  (packet-lint fold-time + the zero-reopened gate form, coverage,
  drift, adr-check, substrate-probe scripts — D4's list, so FC-A2's
  "every tier-0 gate green" is enumerable), the post-build audit's
  INVOCATION point (after the build commit lands, the loop runs
  `--post-build` with that commit's sha — NO CI surface runs this
  mode today, CI runs the plain lint [fold round 2: "CI cannot" was
  too strong]; without a process home the audit is orphaned), the
  transitional cross-model-arms convention (the user's manual arms
  play phase 2 until pairflow doc-bubbles arrive; no formal stop
  criterion, retires as trust builds), the routing
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
  class: preserved live text), the D6 auto-approve deferral clause
  INLINED into the matrix cell (flag-free approve delegation is
  deferred, per-work-type, evidence-based, thresholds only when D7
  data exists — a bare "per D6" would point at a historical document,
  the FC-X2 defect class), and the metrics convention IN FULL (the
  D7 schema pointer; late discoveries → process-log line + block
  increment; the three questions the block answers; no aggregation
  tooling until packet count justifies it).
- **FC-F2** §5.5's standing-checkpoint list post-flip: chapter
  ratification, model↔code divergence stop, draft ratification —
  restated IDENTICALLY on AGENTS.md and SKILL.md; the refine/split
  human clause and the unconditional ADR proposed→accepted entry are
  gone, replaced by the matrix reference and the three packet-flow ADR
  lanes (canonical statement in README; others defer).
- **FC-F3** *Hostile:* an agent reading ONLY ONE of the three authority
  surfaces must reach the same rules — no surface carries a rule the
  others contradict or omit in a direction-changing way.
- **FC-F4** The README sweeps WHOLE-SURFACE in the same commit — the
  status-flip rule binds every section stating the old flow, and fold
  round 3 found two more INSIDE FC-F's declared §4–§6 scope: §4 step
  5's unconditional "ADR born proposed, accepted at a human
  checkpoint" (replaced by the three ADR lanes — left alive, the
  README contradicts itself one section above §5.5); §5.2's
  content-half/ergonomic-half rubric sentence (the twin of the §2
  step-10 rubric FC-E1 kills — left alive it resurrects the old
  rubric under docs-win); §8's "the skill stops at 'ready for
  pre-approval'" sentence (→ the loop form); and §8's workflow
  enumeration gains DraftContract + the contract-draft-template (a
  new workflow and a new form authority must appear on EVERY
  enumerating surface).

## FC-G — AGENTS.md v3 section

- **FC-G1** The verdict sentence is replaced by the matrix summary
  (STOPs + flag-bearing approves are the user's; refine + in-chapter
  split are the loop's); AGENTS.md's "authoring STOPS at 'ready for
  pre-approval'" clause rewrites to the loop form IN THE SAME WORDS
  as FC-H1's skill-side sentence (FC-F3's identical-restatement test
  binds the pair — fold round 2: the asymmetry was the exact gap that
  test exists for); "never build before approve" and "chapters
  start on the user's go" SURVIVE unchanged; never-git-push survives
  (Safety section untouched). The v3 section gains a DRAFT-PHASE
  sentence (contract-drafts exist; the human ratifies them) — a
  single-surface reader must learn drafts exist (FC-F3's own test).

## FC-H — CreateTaskPacket/SKILL.md Hard boundaries

- **FC-H1** Same rewrite as FC-G1 at the skill entry point; the
  "AuthorPacket ENDS at ready-for-pre-approval" sentence updates to
  the loop form (iterates refine/split; stops at approve/STOPs);
  first-of-a-kind stop survives as a calibration-stage rule (its
  canonical statement moves to README per FC-F1; the skill mirrors).
- **FC-H2** The skill's LearnedRules registry is deliberately NOT
  touched by the flip — the registry changes at chapter boundaries
  only (its own discipline); its v1-vocabulary rows (e.g.
  R-FIRST-STOP's "pre-approve" / "flow mode") are boundary work,
  stated here so a single-surface hostile read does not trip on them.
- **FC-H3** SKILL.md's enumerating surfaces gain the draft flow: the
  Workflow Routing table a DraftContract row WITH triggers (the draft
  flow must be reachable through skill discovery); the Canonical
  sources table a contract-draft-template.md row (the skill's own
  docs-win rule demands it); the skill description / USE WHEN the
  draft triggers.

## FC-I — plan.md

- **FC-I1** §1.3 gains the predicted-class column convention (applies
  from ch8 ratifications); §7.7's P3/P4 rows gain pre-registered
  predictions: P3 `projection` (sources: P1/P2 packet contracts + plan
  §7.4), P4 `projection` (the six-precedent CLI class + §7.5) — BEFORE
  P3 authoring starts. A prediction/discovery mismatch is itself a
  signal and routes to a friction-log line (D1); the authoring-time
  discovery is always the authority. And the §N.7 chapter
  packet-tables reference their chapter's draft with the
  "draft: …, ratified <date>" convention (the D2 Home bullet), alive
  from ch8 ratifications exactly like the §1.3 column.

## FC-X — cross-cutting

- **FC-X1** ONE commit carries all of the above (plus this file's
  status flip to its audit-record form); no packet work starts before
  it lands; nothing is in flight at flip time (P2 built; P3 not
  started) — stated in the commit message. The audit act has an OWNER
  and a TRIGGER (fold round 3): after the flip lands, the arms (or
  the user directly) run the landed-texts-vs-claims diff review
  against this file BEFORE any packet work starts — the sequencing
  sentence lives here because the design doc's §7.6 sequence ends at
  the flip.
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

**Fold round 2 (2026-07-09): two arms — 3 + 14 findings, overlapping;
all folded (two narrowed with reasons):**

- FC-B1 rewritten coherently (arm 1 High + arm 2 #7 — the fold-1 fix
  both contradicted itself and reproduced the under-enumeration
  class): THREE authoring-time machine blocks incl. `ledger_slice`;
  Route lines are prose; `packet_metrics` is close-time; the header
  classification line got its form home (FC-E2).
- The status-flip sweep completed (arm 2 #1–2): FC-E2 (template
  §1/§1a self-obsoleting sentences + registry pointer), FC-F4
  (README §8's old-flow sentence — the round-2 README-vs-itself
  class one section past FC-F's scope), FC-G1 (the AGENTS.md
  authoring-stops clause, bound to FC-H1's wording by FC-F3's test).
- FC-A2: fresh-context sub-agents joined the "full" definition (the
  panel's anti-self-review mechanism — the author's context never
  scores its own bytes clean) and "clean" is defined (zero fold-now;
  routed/watchpoint findings ride without voiding).
- FC-A8 (new): the ReviewPacket dual-mode split RETIRES into the
  single panel engine — entailed by D4's one-engine/one-verdict-set,
  disposition open to challenge.
- FC-B7 (new): the AuthorPacket edit-mode declaration (unlisted live
  text survives unless it contradicts the matrix or the carrier).
- Unclaimed ratified rules homed: reopen-from-ratified-only (FC-C4),
  the tree-independence litmus + In/Out lists (FC-C1), draft metrics
  (new FC-C6), draft lens scope (FC-C3), phase-2 expressibility
  (FC-A4), transitional arms + tier-0 gate inventory + CI-wording
  correction ("no CI surface runs this mode today" — arm 1's
  precision) (FC-F1), calibration-permissive threshold (FC-B2),
  prediction-mismatch routing (FC-I1), bucket-coincidence subsumption
  stated (FC-B3).
- FC-D2: the C-row DISCOVERY rule added (first-cell, fences
  excluded); the "mirror cuts both ways" clause SCOPED to the
  draft-artifact form checks (unscoped, the lint's gate/audit checks
  would be "the lint is the bug" by definition — arm 2 #11).
- FC-H2 (new): the LearnedRules registry's deliberate non-touch
  stated (v1-vocabulary rows are boundary work).
- NARROWED: plan §7.7's "pre-approve" column and FC-A5's absorbed
  mirror-duty stay as-is (both arms' considered-not-finding lists
  concur).

State: awaiting the arms' round-3 run on these bytes.

**Fold round 3 (2026-07-09): two arms — 2 + 10 findings; all folded
(the dominant class: the enumeration principle not yet applied to its
own boundaries):**

- FC-A2: tier-0 split into APPROVAL-TIME gates vs the BUILD-CLOSE P8
  audit (arm 1 — a strict reader could block approve forever or
  silently demote the audit); "clean" excludes STOP-class findings
  (arm 1 — a STOP is never clean just because it is not fold-now).
- FC-A9 (new, the round's strongest): the ReviewPacket restructure's
  PRESERVATION CONTRACT — every pre-flip check assigned to a named
  lens/report element or explicitly retired/absorbed (content half,
  Contract Reality Gate's four inventories, final text sweep,
  claim-half R-rules, ergonomics half), and the LearnedRules registry
  CONSUMED per lens, not merely untouched.
- FC-B1 + FC-E2: the D1 derivation note got its carrier home (in-row
  text — lens-2 material; extending the manifest schema was the
  declined alternative, stated).
- FC-F4 widened to the whole README surface: §4 step 5's
  unconditional ADR-acceptance sentence and §5.2's rubric twin were
  inside FC-F's own declared scope; §8's workflow enumeration gains
  the draft flow.
- FC-F1: the D6 auto-approve deferral clause inlined (a bare
  "per D6" would point at a historical doc); the metrics convention
  spelled out.
- FC-A3: the §7.2-withdrawn prose range/scalar duty homed at lens 3.
- FC-G1 + FC-H3 (new): the draft flow appears on EVERY enumerating
  surface (AGENTS.md draft-phase sentence; SKILL.md routing/sources/
  description rows).
- FC-D2: the state-consistency biconditionals spelled out; FC-E2:
  the §1a audit contract completes to the P8 claim set + the prose:
  nonempty-remainder word; FC-I1: the §N.7 draft-reference
  convention; FC-X1: the post-flip audit act got an owner and a
  trigger (arms/user diff review before any packet work).

State: awaiting the arms' round-4 run on these bytes.
