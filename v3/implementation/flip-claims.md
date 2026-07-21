# Phase-1 Authority-Flip — Claim Enumeration

Status: **AUDIT RECORD — the Phase-1 flip landed 2026-07-09; the
landed texts are the authority** (README = process,
task-packet-template + contract-draft-template = form, the skill
workflows = procedure; this file and the design doc are history,
FC-X2). The post-flip audit (FC-X1: the arms or the user,
landed-texts-vs-claims, BEFORE any packet work) runs against this
record. Review history: 10 fold rounds, closed by the user's watchdog
STOP.
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
  green — the FC-F1 inventory's approve-time column (fold round 8:
  "the pre-build set" had no membership), incl. the zero-reopened
  gate (the `--forbid-reopened` form); the P8 post-build audit is a BUILD-CLOSE
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
  drift → lens 2; claim-negatives/matrix-symmetry + EVERY LANE DRIVEN
  (D4's own parenthetical — fold round 4: the flip edge would drop the
  lane-driven check's home) + WIDE-CLAIM COVERAGE (fold round 6, both
  arms: the THIRD member of that same parenthetical was still
  unclaimed — R-WIDE-CLAIM's "named lens home" in FC-A9 could
  otherwise land away from the negatives-derivation lens whose basis
  it is) + collapsed-lane inventories + the §7.4
  prose-obligation PAIR — the prose-contract scan ("is every normative
  sentence a row?" — the review-side detection half) AND prose
  range/scalar consistency (both withdrawn from tier 0 to review —
  lens material, not machine data) → lens 3; mirror/propagation
  (post-lint semantic remainder) → lens 4; downstream viability
  (sibling-packet impact + PLAN CONSISTENCY — D4's own words; fold
  round 6: "plan rows" was readable as remaining-task viability
  only) → lens 5. *Hostile:* a lens that did not run is `missing` in
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
  a human-ratified standing decision, not a parked item, whose HOME is
  the packet flag WITH the stated reason (fold round 4: the D5 Home
  column's reason clause was the one unclaimed cell — a reasonless
  `declined` would satisfy every row; the flags-section Route line
  carries the reason, FC-B1). The phase-2
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
  as checks (R-WIDE-CLAIM, R-DIMENSIONS, R-MATRIX-LANES,
  R-CLAIM-NEGATIVES, R-NUMERIC-LADDER, R-EXECUTION,
  R-STRUCTURE-SEMANTICS, the "cannot occur" lane rule,
  R-RAW-FIXTURES — fold round 4: the list inside the preservation row
  was itself narrower than the live registry) → named lens homes; the
  Matrix Symmetry Gate WITH its per-member collapsed-lane inventory
  keyset (`source_site`, `phase`, `event_keyset`, `field_provenance`,
  `test_obligation` OR `ruled_out_reason` — a keyset, per
  counts-to-lists) → lens 3; the prose-contract scan (the §7.4 pair's
  review half, FC-A3) → lens 3; the checklist-is-a-FLOOR /
  derive-from-the-packet's-OWN-claims meta-rule (the ch7-P1
  twin-session lesson — the anchor of the engine's challenge posture)
  → a panel-level rule, not any one lens's; the ergonomics half
  (self-containment, mirror discipline, density, embedding
  freshness, and plan consistency — the R-ALIGNED-UP review half:
  the prepared same-commit plan edit EXISTS for any contradiction;
  fold round 6, both arms: the list named four where the live half
  has five members) → lens 4/5, plan consistency to lens 5 BY NAME
  (D4's own words). And the LearnedRules registry is not merely
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
  under-enumeration class it was fixing); a `declined` Route line
  carries its stated reason (the D5 Home column, FC-A4). The case
  verdict (projection/invention) is computed from the manifest tally
  APPLIED THROUGH the D1 case rule — FC-B2's full trigger list: the
  semantic any-row trigger (authority / separation / availability-class)
  reads the rows, never just the counts (fold round 4: "computed from
  the tally" alone would land as a counts-only definition in template
  §1, and a packet with two authority-touching new-decision rows would
  read Case A) — and stated in the packet header with a one-line
  derivation (form home: the template §1 header line, FC-E2). In a
  Case-A verdict the new-decision rows RIDE AS PRE-APPROVAL FLAGS —
  D1's own clause (fold round 6, both arms, the round's strongest:
  no row bridged the manifest class to the flags section, and the
  lint has no manifest-vs-flags cross-check, so a Case-A packet with
  new-decision rows and an empty flags section would read as a
  flag-FREE approve under every row's letter and STOP 4 would never
  fire): the manifest class ENTAILS the flags-section entry — a
  new-decision manifest row with no corresponding flag is a defect —
  and "flag-bearing" in the approve sense is DEFINED as: new-decision
  manifest rows present, OR any D5-routed flags entry whose
  ratification point IS the approve — `declined` always (D5: a
  human-ratified standing decision with NO revisit fallback) and
  parked proposals batch-ratified at approve (D3); watchpoint STATUS
  ALONE does not flag-bear (an unrouted observation riding as a note
  — FC-A2's clean rule untouched), but the ROUTE decides, never the
  finding's original taxonomy class: a watchpoint routed `declined`
  flag-bears like any declined (fold round 9: D4 maps watchpoints to
  D5 routes, so "watchpoints do not flag-bear" unqualified reopened
  the round-8 hole for a zero-new-decision packet carrying a declined
  flag). Fold round 8: the
  manifest-only definition let a zero-new-decision packet carrying a
  `declined` flag read as flag-FREE — in the deferred auto-approve
  era its ONLY ratification act would have delegated, silently
  breaking D5's human-ratified property (later-chapter has the
  boundary fallback; declined has none); the pure-manifest
  alternative (inheriting the risk to the D6 auto-approve decision
  point) was DECLINED because D5's own words make a
  declined-carrying approve substantive, never ceremony (FC-B4). The D1 derived-row DERIVATION
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
  approve — flag-free: human in calibration, delegation deferred per
  the D6 clause FC-F1 inlines; flag-BEARING (per FC-B1's definition —
  fold round 9: "manifest-defined" was stale after round 8 widened
  the definition to approve-ratified D5 routes): STOP 4, human ALWAYS,
  at every trust stage (fold round 4: the compressed "human in
  calibration" licensed reading ALL approves as delegable with trust)
  — and at every STOP. *Temporal:* the 0a next-step derivation + its
  immediate announcement survive, and the derivation GAINS the
  draft-phase branch (fold round 4: "unchanged" contradicted FC-F1's
  draft phase in the build loop): an open chapter ANY of whose
  §N.7-referenced contract-drafts is not yet ratified-or-later
  derives the DraftContract round (for that draft) as the next step,
  not packet authoring (plural per fold round 8) — the FC-B2 late-B
  STOP remains the entry for the unpredicted case; the flag
  write-back loop and fresh-eyes pass survive as the loop's internal
  discipline (now largely mechanized by tier 0, with the semantic
  remainder in lens 4).
- **FC-B5** Preserved from the current text, traceable: delegation
  closure at write time; substrate probes at authoring; prose-contract
  extraction; the Mirrored Surface Map; "flags live IN the packet."
  And the `aligned at <packet-id> pre-approval` marker string survives
  VERBATIM as the plan-alignment act's recorded convention (fold
  round 4, its counts corrected at round 6 against live grep — the
  counts-to-lists rule applied to the audit record's own
  parenthetical, which said "five surfaces + ~8" and was wrong on
  both: FC-A8's state-name sweep meets the convention string on FOUR
  surfaces — AGENTS.md, SKILL.md, AuthorPacket [whose copy spells
  the placeholder `<PACKET_ID>`], LearnedRules R-ALIGNED-UP — plus
  14 committed historical plan markers; a hostile sweeper
  would rename the convention and orphan the history): historical
  markers are immutable, and renaming the convention is
  chapter-boundary work, the FC-H2 class, never part of the flip.
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
  skeleton WITH its six-question set riding into the DraftContract
  text in full — business invariant / control model / read-path /
  forbidden fallback / allowed resolution / missing-data (fold
  round 4, both arms: a bare name would point at the historical
  design doc or the v1 gate file — the FC-X2 class — and round 0
  would be unexecutable from live surfaces). The bar is
  OPERATIONALIZED, not just named: the D2 litmus
  ("if v3/src were deleted and rewritten from the packets, would this
  row still be true and decidable?") and the In/Out boundary lists
  ride into the DraftContract/contract-draft-template texts — the
  template CANONICAL (content-admissibility is form), DraftContract
  deferring (fold round 6: two full homes with no canonical
  designation is the drift class the one-home rule exists for; the
  FC-X3 entry added).
- **FC-C2** The artifact follows contract-draft-template.md exactly
  (docs win); every normative statement is a C-row — prose is
  non-normative by declaration, and an iff-clause found in prose is a
  review finding, never a legal edit path.
- **FC-C3** The draft loop = the packet loop minus `split` (a draft
  split is STOP `2:draft-split`); watchdog 8; tier 0 = draft-lint.
  The lens scope for drafts is stated: the substrate lens FULLY
  applies (probes are tree-independent), embedding-class checks are
  n/a — without this, FC-A2's "all five lenses" is uninstantiable on
  a draft. The report contract (FC-A5) applies to draft rounds
  INSTANTIATED: the basis line hashes the DRAFT file and the verdict
  binds only those bytes (fold round 4, reconciled: engine identity
  entails it — arm 2's read — but the live line is packet-NAMED, so
  the letter states the instantiation — arm 1's gap). And the
  transitional cross-model arms run on DRAFT rounds before
  ratification, as with packets — D2's own sentence — with the
  ratification block's `arms` list naming them (fold round 6,
  reconciled: one arm read FC-F1's convention + engine identity as
  carrying it, the other showed FC-F1's statement is
  packet/phase-2-framed and the mandatory `arms` field would
  otherwise have no live referent on the draft flow — the fold-4
  instantiation lesson again: the letter states it).
- **FC-C4** Ratification and RE-ratification are permanently human,
  EXPLICIT and post-fold, NEVER INFERRED from an intent statement —
  the D6 never-delegates rule includes never-infers, and the
  DraftContract text states it (fold round 4; source: the Amendment's
  own §7.7 round-4 incident — a status flip executed from a misread
  "I'll ratify after the edit" was withdrawn by reset).
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
  ch<N>-<surface>-contract.md MATCHES chapter/surface, in the ONE
  lint-visible home `docs/v3/implementation/contracts/` — fold
  round 4: a draft authored elsewhere is invisible to the lint,
  consumerless and unlinted while looking ratified); C-rows
  (DISCOVERED as table rows whose FIRST cell is C<n>, fenced code
  excluded — the lint's stated claim; unique ids, NO leading zeros —
  ids are exact strings; ratified-or-later requires ≥1 row); ratification blocks (exact
  keyset {date, arms, commit}: YYYY-MM-DD date, nonempty string-list
  arms, 7–40 LOWERCASE-hex commit — shape-checked on EVERY block,
  while the COMMIT-object resolution and the equality check run on
  the LATEST block only, in ratified/realized; an unresolvable
  recorded commit or an out-of-repo draft is a LOUD error, never a
  skip (fold round 10: the D5 loudness clause was the one member the
  FULL-registry row did not carry — under the mirror rule a
  letter-faithful template would have flipped authority against the
  correctly-loud lint); dates non-decreasing;
  latest = last in document order); the two-commit ratification and
  reopen choreography; the state-consistency status rules SPELLED OUT
  (ratification blocks present ⇔ status ∈ {ratified, reopened,
  realized}; status draft ⇒ no blocks — fold round 3: every
  neighbouring item is written letter by letter, compressing these
  two was the row's own weak-reading gap); the
  `realized_map` block — the exact top-level key, named like
  `contract_draft` (fold round 5) — exactly one, keys exactly the
  C-row id set, every landing site a nonempty string, ANY map
  presence ⇔ realized. The cross-cutting machine-block rules ride along:
  duplicate JSON keys are parse errors, and fences follow the
  line-oriented CommonMark scanner (quoted fences are material) —
  their canonical statement lives in task-packet-template §1a
  (FC-E3), the draft template mirrors with a defer (fold round 4:
  two full restatements of shared scanner constants would be the
  drift class the mirror discipline exists for).
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
  old rubric. *Edit mode (fold round 4, both arms — the FC-B7 logic
  applied to the surface FC-E itself rewrites):* the §2 rewrite is
  the design doc's stated ALIGNMENT, never a replacement — the
  projection steps 1–9 (verbatim units + registry field lists, exact
  rejection strings, trace-as-executable, constraint transformation,
  self-containment, density gate, embedding gates, slice declaration)
  survive unchanged except where the named insertions land; step 10
  alone is replaced. "Contains" above means contains AMONG the
  surviving steps — a §2 that IS only the four named elements drops
  the projection discipline from the authoritative checklist.
  *Hostile:* an agent reading ONLY §2 (never the
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
  P8 claim set (pinned sha — hex shape AND resolving to a COMMIT
  object, a tag object is not the build commit: the twin of FC-C4's
  draft-side guard (fold round 8: the same under-enumeration class
  round 4 fixed in this row) —, packet-file-in-changed, boundary read
  from the packet's bytes AT the audited commit, the boundary
  re-validated against the FULL mutation-boundary shape rules on the
  audit path — a subset check over a malformed boundary proves
  nothing — and the vacuous-audit family as its three-member list:
  merge commits rejected, root commits diffed against the EMPTY TREE,
  an empty change list red regardless of cause; fold round 4, both
  arms: the row declared completion "to the P8 claim set" while
  listing a subset — the under-enumeration class inside its own fix)
  — the audit sits outside the FC-D2 mirror, so nothing else forces
  §1a's completeness. *Edit mode (fold round 6 — the FC-B7 formula
  applied to the packet-form authority itself):* the flip EDITS
  template §1/§1a in place — live form text not named by FC-E2/E3/X3
  (the Pairflow-metadata rule, the ledger-slice syntax rules, the
  16-file grandfather set with its never-retroactively clause, the
  machine-block skeletons) survives unchanged unless it contradicts
  the new carrier; the flags Route enum line survives EXCEPT for its
  declined-reason completion (fold round 10, the FC-G1 formula: the
  D5 reason rule lived in README/workflows while the FORM authority's
  Route line — `declined` without a reason slot — was pinned as a
  plain survivor, so a hostile implementer could cite the pin to skip
  the reason; the §1 Route line's declined form becomes
  `declined — <reason>`); the named items
  are insertions and sweeps, not a whitelist — and under FC-E3 a
  silently dropped rule flips authority AGAINST the still-correct
  lint, so the edit-mode clause is what keeps the mirror sound.
- **FC-E3** The packet-side mirror rule, stated symmetrically with
  FC-D1 (fold round 4: no row said who wins on a PACKET-form
  mismatch): task-packet-template §1/§1a is the canonical packet-form
  authority and the lint's packet form checks are its mechanical
  mirror — on a mismatch the TEMPLATE wins and the lint is the bug,
  scoped exactly as FC-D2 scopes the draft side (form checks over
  declared data; the lint's gate/audit checks live per FC-X3). For
  the mirror to be sound, §1a completes to the cross-cutting
  machine-block rules as their CANONICAL statement (duplicate JSON
  keys are parse errors; line-oriented CommonMark fence scanning,
  quoted fences material — the draft template defers, FC-D2) and to
  the v2-marker's no-silent-demotion clause (a packet NAMING
  mutation_boundary in raw text stays v2 even when that fence is
  malformed).
- **FC-E4** The two remaining packet-form mirror surfaces sweep in
  the same commit (fold round 5): `check_coverage.py`'s docstring and
  `packets/README.md` both read as if `ledger_slice` were THE packet
  machine block ("exactly one fenced json block whose top-level key
  is ledger_slice") — post-flip a v2 packet carries THREE
  authoring-time machine blocks (FC-B1), so both texts rewrite to
  "exactly one `ledger_slice` block AMONG the packet's machine
  blocks"; the flip's file list grows by these two (the FC-F1
  lint-docstring class on the coverage side).

## FC-F — README §4–§6 + §5.5

- **FC-F1** README becomes the canonical process authority for: the
  autonomy envelope IN FULL — the D3 principle sentence ("the loop
  stops exactly where a new semantic decision is needed"), the
  AUTONOMOUS-acts list (in-chapter split with visible report +
  coverage-union guard; propagation-class plan edits, visibly
  reported; ADR recording of already-ratified decisions; parking
  proposals onto D5 routes, batch-ratified at approve; probes, panel
  orchestration, tier-0 scripts, prepared edits), the 4-STOP list
  (the STOP-3 member carries its "auto-split-remedy delegable later"
  deferral clause — fold round 8: the same deferred-delegation family
  as the D6 auto-approve deferral, inlined for the same reason: a
  bare pointer would aim at the historical doc), and the
  verdict-action matrix (fold round 4: STOPs+matrix alone
  define the autonomous side by omission — "ADR recording" and
  "parking proposals" would live only in the historical doc, and a
  cautious agent STOPs on ratified-autonomous acts), the
  canonical STOP member-token registry (authority MOVES here from the
  design doc — and the lint's docstring pointer is updated IN THE SAME
  COMMIT: the flip therefore touches `tools/v3-plan/check_packet.py`'s
  header comment, an addition to the §5 item-8 file list discovered by
  this enumeration), the draft phase in the build loop incl. the
  `reopened` lifecycle's gate rule (zero reopened drafts at packet
  approve / chapter close / the flip), the TIER-0 GATE INVENTORY WITH
  A GATE-POINT PER MEMBER (approve-time: packet-lint fold-time + the
  zero-reopened gate form, coverage VALIDATION [parse/ids/enums —
  runnable ONLY once Phase 0.2's gate-point mode exists; the live
  script's validation and unit-map lock are inseparable today, so
  until that mode lands coverage is WHOLLY build-close and
  approve-time slice syntax is the panel's duty (fold round 10: the
  member stood in the column without its executable form — the
  round-8 class one level down; membership and form now bind at the
  point of reading, the zero-reopened member's pattern)],
  drift, adr-check, substrate-probe scripts; build-close: the P8
  audit AND coverage's owned==realized three-way lock, which is
  NECESSARILY red on an approved-but-unbuilt packet's declaration —
  the ch5 boundary precedent, "working-as-designed"; fold round 8: an
  unpointed inventory made a strict reader's approve unreachable and
  let a loose reader pick their own set — D4's list, so FC-A2's
  "every approval-time tier-0 gate green" resolves against the
  approve-time column, membership NAMED, never reader-chosen. Fold
  round 9 — the split needs an EXECUTABLE surface, no such
  approve-time coverage mode exists today: check_coverage.py's
  default run hard-fails on the unit-map lock and `pnpm v3:coverage`
  runs only that default, so the coverage split lands as a small
  PRE-FLIP mechanical-substrate change, "Phase 0.2" — a gate-point
  mode that skips the owned==realized lock (flag name is
  implementation detail; the CLAIM is that the approve-time column's
  coverage entry is runnable), with the README naming which mode runs
  at which point; UNTIL that mode lands, coverage as a whole sits
  build-close and the fold-time slice-declaration validation is the
  panel's duty — the inventory names runnable gates, never
  aspirations), the post-build audit's
  INVOCATION point (after the build commit lands, the loop runs
  `--post-build` with that commit's sha — NO CI surface runs this
  mode today, CI runs the plain lint [fold round 2: "CI cannot" was
  too strong]; without a process home the audit is orphaned) AND its
  CONSEQUENCE: the audit's green is part of the build being DONE — a
  red audit is a defect fixed before any further packet work (fold
  round 4: a tier-0 gate with no stated consequence is executable as
  advisory; entailed by tier-0 status, now stated), the
  transitional cross-model-arms convention (the user's manual arms
  play phase 2 until pairflow doc-bubbles arrive; no formal stop
  criterion, retires as trust builds), the routing
  rule's third row (shape → contract-draft) WITH the three lanes
  THEMSELVES ENUMERATED (fold round 6, both arms: FC-F1/F2/F4 all
  pointed at "the three lanes" and no row stated the members — the
  README is their canonical home per FC-X3, so post-flip the lane
  content would live only in the historical doc, the FC-X2 class on
  the row's own canonical home): draft-ratified content → accepted
  at draft ratification; plan-ratified content whose ADR is authored
  during packet work → acceptance rides with the packet approve; a
  genuinely new ADR-class decision mid-loop → STOP 1, its ADR
  following whichever ratification act resolves it — PLUS the
  outside-the-list case riding along: a chapter-ratification-born
  ADR is accepted by that ratification act itself (fold round 6:
  FC-F4 kills §4 step 5's unconditional acceptance sentence, and
  without this case a ch8 ratification-born ADR has no live
  acceptance path), and the D2
  ADR-relation rules 3–4 riding beside them (shape never goes
  into an ADR — the ADR records decision+rationale and references the
  draft, the draft cites the ADR for decision provenance; after
  chapter close decisions persist in ADRs, shapes in
  packets/code/tests, the draft archives — fold round 4: with rule 3
  unclaimed, a lane-1 ADR minted at draft ratification legally
  carries the contract shape, and rules 3–4 otherwise live only in
  the historical doc), the Amendment-1 §7.4
  process rules WITH the stated threat model (fix-all scope, tier-0
  scoping, effort/truth; one operator + review-gated agents — the
  machine gates defend against drift, never adversarial forgery: a
  rule living only in the historical design doc would be an FC-X2
  defect at flip time), the D6 calibration rule (the human approve is
  the detector's measurement instrument — a human-found new-decision
  miss is a detector bug: fix the rule, do not add process), the
  first-of-a-kind rule PROMOTED to canonical process text (the first
  packet of a new task class is human-approved regardless of trust
  stage — today it lives on THREE surfaces: the skill's Hard
  boundaries, AuthorPacket step 2, and LearnedRules R-FIRST-STOP
  [fold round 4: the fold-1 "only in Hard boundaries" was a wrong
  list membership — an audit-record mismatch and a sweep that
  rewrites one mirror of three]; the registry copy stays per FC-H2;
  source class: preserved live text), the D6 auto-approve deferral clause
  INLINED into the matrix cell (flag-free approve delegation is
  deferred, per-work-type, evidence-based, thresholds only when D7
  data exists — a bare "per D6" would point at a historical document,
  the FC-X2 defect class), and the metrics convention IN FULL (the
  schema pointer at template §1 per FC-X3 — never at the historical
  design doc; the D7 FIELD SEMANTICS riding into the README
  convention [fold round 4, both arms: unclaimed, post-flip nobody
  live says what `rounds.review` counts — the exact unit drift
  `baseline_note` was built against]: `rounds.review` counts phase-1
  panel rounds, `doc_refinement`/`implementation` the pairflow runs'
  rounds — until pairflow carries implementation, `implementation` ≈
  build + post-build fix rounds — and `prediction.reasoning` +
  `detector_misses[].why_missed` are the pattern-mining surfaces;
  late discoveries → process-log line + block increment; the three
  questions the block answers; no aggregation tooling until packet
  count justifies it).
- **FC-F2** §5.5's standing-checkpoint list post-flip: chapter
  ratification, model↔code divergence stop, draft ratification —
  restated IDENTICALLY on AGENTS.md and SKILL.md; the refine/split
  human clause and the unconditional ADR proposed→accepted entry are
  gone, replaced by the matrix reference and the three packet-flow ADR
  lanes (canonical statement in README; others defer). §5.5's
  SURROUNDING ramp text is disposed explicitly (fold round 4,
  reconciled: not old-flow to sweep — arm 1's read — but a second
  trust-rollout statement to unify — arm 2's): the three-stage ramp
  rewrites so the D6 trust-rollout statement (calibration as the
  detector's measurement instrument + the deferred auto-approve
  clause FC-F1 inlines) is the SINGLE canonical statement, chaining
  named as the deferral's eventual form — two independent
  trust-rollout mechanisms in one authority is the mirror-discipline
  defect; the chapter-header autonomy-stage vocabulary itself stays
  live (plan headers carry it).
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
  enumerating surface) — and so does §1's "what lives here" INVENTORY
  at the top of the file (fold round 5: a README-only reader must see
  the `contracts/` home and the new form authority in the first list
  they meet, not first at §8); the SAME §1 edit rewrites the list's
  two provably stale neighbours to the landed state (fold round 10,
  the §6-pointer precedent — the flip edits §1 anyway): the "task
  packets … once Phase 2 starts" line (packets have existed since
  ch4; the `packets/` home is named, present tense) and the adr/
  line's "confirms or moves it" conditional (resolved long ago: the
  home IS `v3/adr` — the lint resolves against it, and
  docs/v3/implementation/adr does not exist). And §6's chapter-DoD enumeration gains the
  three draft-close conditions (fold round 4, both arms: the DoD is
  exactly what a closing agent executes — without these a chapter
  closes green by the DoD's letter with a reopened or unrealized
  draft): ZERO reopened drafts (§7.3's gate point; unconditional —
  naturally vacuous when no draft exists), EVERY chapter-referenced
  contract-draft flipped `realized` — map filled + status flipped in
  ONE act (FC-C5); plural on purpose (fold round 7: the naming scheme
  and the lint admit several `chN-<surface>-contract.md` per chapter,
  and D2's singular "surface" does not forbid a chapter having more
  than one memo-born surface) — and the draft-metrics close
  line (FC-C6), both scoped to the chapter's drafts IF ANY (fold
  round 6: D2's scope is the chapter's MEMO-BORN surface and §5's
  first full draft exercise is ch8 — ch7, the first post-flip close,
  is draftless by design; written unconditioned, the DoD's letter
  cannot pass a draftless chapter or invites a vacuous draft);
  AuthorPacket's 0a step-3 DoD mirror updates with it (FC-B7's
  contradiction clause carries the skill side). The same §6 edit
  corrects the stale process-log pointer ("(§8)" → §7 — mechanical
  staleness inside the swept surface; arm 2 routed it boundary-review,
  folded here instead because the flip edits §6 anyway).
- **FC-F5** Edit mode, stated (fold round 4 — FC-B7's logic applied
  to the process authority itself): the flip EDITS README in place —
  live §1–§8 text not named by FC-F1/F2/F4 (§5.1–§5.4's autonomy
  principle / packet two-layer / constraint budget / coverage
  accounting, §6's divergence protocol and full-`ci:local` DoD core,
  §7's reflection loop) survives UNCHANGED unless it contradicts the
  verdict-action matrix or the new carrier; the §4 build-loop steps
  survive EXCEPT for the FC-F1/F4 named additions and sweeps (fold
  round 8: the round-7 FC-G1 weak-survivor class, one row over);
  FC-F1/F2/F4 name additions and sweeps, not an exhaustive whitelist.

## FC-G — AGENTS.md v3 section

- **FC-G1** The verdict sentence is replaced by the matrix summary
  (STOPs + flag-bearing approves are the user's; flag-free approves
  are the user's in calibration with delegation deferred per D6 —
  fold round 6: the two-sided compression left flag-free approve on
  NEITHER side, and combined with the surviving "never build before
  an explicit approve" an AGENTS.md-only reader would read the
  panel's flag-free approve as that explicit approve, licensing an
  autonomous build in calibration — the round-4 FC-B4 class in
  mirror image; refine + in-chapter
  split are the loop's); AGENTS.md's "authoring STOPS at 'ready for
  pre-approval'" clause rewrites to the loop form IN THE SAME WORDS
  as FC-H1's skill-side sentence (FC-F3's identical-restatement test
  binds the pair — fold round 2: the asymmetry was the exact gap that
  test exists for); "never build before approve" and "chapters
  start on the user's go" SURVIVE unchanged; never-git-push survives
  (Safety section untouched). The v3 section gains a DRAFT-PHASE
  sentence (contract-drafts exist; the human ratifies them) — a
  single-surface reader must learn drafts exist (FC-F3's own test) —
  and the canonical-sources bullet (the template/checklist/registry
  docs-win enumeration) gains contract-draft-template.md (fold
  round 4, both arms: the single-surface reader must also learn WHERE
  the draft's form authority lives, or a draft-form dispute resolves
  against nothing on that surface). The verification-bridges
  enumeration gains `v3:packet-lint` (fold round 6: FC-F1 names it a
  tier-0 gate and ci-local's v3 lane runs it, but the AGENTS.md-only
  reader's bridge list stops at `v3:adr-check` — a new gate must
  appear on every enumerating surface, the round-3/5 rule). Edit
  mode, stated (fold round 6, both arms — with FC-E2's clause the
  last rewritten surface without one): the flip EDITS the v3 section
  in place — bullets not named by FC-G1/FC-F2 (the no-session-memory
  intro, the process-authority pointer, the one-packet-one-commit
  shape) survive unchanged unless they contradict the matrix or the
  new carrier; the docs-win packet-authoring bullet and the
  verification-bridges bullet survive EXCEPT for their FC-G1 named
  additions above (fold round 7: listing them as plain survivors
  contradicted this row's own "gains" clauses — a hostile implementer
  could skip exactly the round-6 additions while citing the edit-mode
  sentence).

## FC-H — CreateTaskPacket/SKILL.md Hard boundaries

- **FC-H1** Same rewrite as FC-G1 at the skill entry point; the
  "AuthorPacket ENDS at ready-for-pre-approval" sentence updates to
  the loop form (iterates refine/split; stops at approve/STOPs);
  first-of-a-kind stop survives as a TRUST rule applying regardless
  of ramp stage (fold round 4: "calibration-stage rule" invited
  scoping the stop to calibration-stage chapters — the rule's own
  text says "regardless"; its canonical statement moves to README per
  FC-F1; the skill mirrors). The SKILL.md sweep is WHOLE-SURFACE
  (fold round 4, both arms — FC-F4's rule applied to the skill entry
  point): beyond FC-A8's named three, the frontmatter DESCRIPTION
  (its mode vocabulary — "self-review, and pre-approval-review",
  "preparing a packet for pre-approval OR self-reviewing a packet
  draft" — rewrites to the loop form; FC-H3's draft triggers land in
  the same description edit) and the INTRO paragraph ("then
  self-reviews the draft … before the human pre-approval round") are
  named sweep targets. Edit mode declared: Hard-boundaries text not
  named by FC-H1/FC-F2 (the plan-alignment bullet, the file-language
  bullet) survives unchanged.
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
  packet-tables reference EVERY chapter draft with the
  "draft: …, ratified <date>" convention (the D2 Home bullet; the ref
  is REPEATABLE — fold round 8: the chapter's draft SET is defined as
  the §N.7-referenced drafts, with the `contracts/chN-*-contract.md`
  glob as the mechanical mirror of completeness), alive
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
  the flip. And the act has a RECORD (fold round 4: an audit whose
  result lives only in chat leaves this file claiming an audit-record
  role it cannot prove — audited-clean and never-audited would read
  identically): the outcome lands as the final Review-record entry of
  this file (date, landed-texts-vs-claims verdict, mismatches listed
  or none) before packet work starts.
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
  FORM in task-packet-template §1, process convention AND field
  semantics in README (fold round 4); the
  post-build audit → contract in task-packet-template §1a with the
  lint docstring as the mechanical mirror, invocation in README's
  build loop (FC-F1); the zero-reopened gate → process rule in README
  (the three gate points, FC-F1) with template §1a's
  `--forbid-reopened` description + the lint docstring as the
  mechanical mirrors (fold round 4: FC-D2 directed the gate's home
  question HERE and no entry existed — the broken cross-row pointer
  now resolves); the tree-independence bar (litmus + In/Out lists) →
  contract-draft-template, with DraftContract deferring (fold
  round 6, FC-C1).

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

**Fold round 4 (2026-07-09): two arms — 19 + 16 findings, heavily
overlapping; all folded (three reconciliations and one route override
stated). The dominant class: the round-3 edit-mode/preservation
principle applied to the REMAINING rewritten surfaces, and lists
narrower than their live registries inside rows whose job was
preservation:**

- FC-E1 gained the edit-mode clause (BOTH arms, the round's
  strongest): the §2 rewrite is the design doc's ALIGNMENT — steps
  1–9 survive, step 10 alone is replaced; "contains" means among the
  surviving steps, or the projection discipline falls out of the
  authoritative checklist.
- FC-F5 (new): the README edit-mode declaration (arm 2 — §5.3/§5.4/§6
  live rules were droppable while satisfying every FC-F row); FC-H1
  gained the SKILL.md whole-surface sweep (both arms: frontmatter
  description + intro carry old-mode vocabulary) and the
  Hard-boundaries edit-mode sentence.
- FC-A9's claim-half list completed to the live registry
  (R-MATRIX-LANES, R-CLAIM-NEGATIVES, the Matrix Symmetry Gate with
  its per-member inventory keyset, the checklist-is-a-floor
  meta-rule); FC-A3's lens-3 duties restored "every lane driven"
  (D4's own parenthetical) and homed the §7.4 prose-obligation PAIR
  (the prose-contract scan joined range/scalar — both arms).
- README §6's chapter DoD gains the three draft-close conditions
  (both arms; FC-F4), with AuthorPacket's 0a DoD mirror riding
  FC-B7; the stale "(§8)" process-log pointer folded as a rider
  (route override: arm 2 said boundary-review; the flip edits §6
  anyway).
- FC-F1: the autonomy envelope enumerated in FULL (arm 2 — the
  autonomous-acts list would otherwise live only in the historical
  doc); the D2 ADR rules 3–4 ride with the three-lanes statement
  (arm 1 — a lane-1 ADR could legally carry shape); the post-build
  audit gained its CONSEQUENCE clause (arm 1 — a gate with no stated
  consequence executes as advisory); the first-of-a-kind
  parenthetical corrected to the three live homes (arm 1 — "only in
  Hard boundaries" was false); the metrics convention gained the D7
  field semantics + the schema pointer re-aimed at template §1
  (both arms).
- FC-F2: §5.5's ramp text disposed (reconciled: arm 1 considered it
  covered, arm 2 showed two trust-rollout statements would coexist —
  folded as unify-to-one-canonical, stages vocabulary stays).
- FC-B1: the case verdict computed from the tally THROUGH the D1
  case rule (arm 1 — counts alone cannot see the authority-touching
  trigger); the declined Route line carries its reason (arm 1;
  FC-A4 gained declined's Home cell).
- FC-B4: the approve parenthetical split (arm 2 — flag-bearing
  approve is human ALWAYS, not calibration-bound); 0a gains the
  draft-phase branch (arm 1 — "unchanged" contradicted FC-F1's
  draft phase).
- FC-B5: the `aligned at <packet-id> pre-approval` marker survives
  VERBATIM (arm 2 — the state-name sweep would rename a recorded
  convention and orphan committed history; renaming is the FC-H2
  class).
- FC-C1: the Control-Model six-question set rides in full (both
  arms); FC-C4: ratification is explicit and post-fold, NEVER
  inferred (arm 1 — the Amendment's own round-4 incident); FC-C3:
  the report contract instantiated for drafts (reconciled: arm 2's
  entailment argument + arm 1's packet-named-letter gap — one
  clause states it).
- FC-E2: the §1a audit contract completed to the FULL P8 set (both
  arms — the completion row itself listed a subset); FC-E3 (new):
  the packet-side form-mirror rule (arm 1 — no row said who wins on
  a packet-form mismatch), with §1a as the canonical home of the
  cross-cutting machine-block rules (FC-D2 now defers) and the
  no-silent-demotion clause.
- FC-D2: the contracts/ home directory named (arm 1 — a draft
  authored elsewhere is invisible to the lint); FC-X3: the
  zero-reopened gate's home entry added (arm 2 — FC-D2's pointer
  resolved to nothing) + packet_metrics semantics → README.
- FC-G1: the AGENTS.md canonical-sources bullet gains the draft form
  authority (both arms); FC-H1: "calibration-stage rule" corrected
  to a trust rule regardless of stage (arm 1).
- FC-X1: the post-flip audit act gained its RECORD home (arm 2 —
  audited-clean and never-audited would read identically).

State: awaiting the arms' round-5 run on these bytes.

**Fold round 5 (2026-07-09): one arm, three findings; all folded:**

- FC-E4 (new): the two remaining packet-form mirror surfaces claimed
  — `check_coverage.py`'s docstring and `packets/README.md` still
  read as if `ledger_slice` were THE packet machine block; both
  rewrite to "among the packet's machine blocks", and the flip's file
  list grows by the two (the FC-F1 lint-docstring class on the
  coverage side).
- FC-F4: README §1's "what lives here" inventory joins the
  whole-surface sweep — a README-only reader meets the `contracts/`
  home and the new form authority in the FIRST list, not first at §8.
- FC-D2: the realized map named by its exact top-level key
  (`realized_map`), like `contract_draft` — the form authority names
  keys, not prose paraphrases.

State: awaiting the arms' round-6 run on these bytes.

**Fold round 6 (2026-07-09): two arms — 8 + 9 findings, four
convergent; all folded (one cross-arm conflict reconciled, one
count corrected against live grep):**

- The round's strongest (both arms, #1 on each list): the Case-A
  BRIDGE — D1's "the rows ride as pre-approval flags" was unclaimed,
  so a Case-A packet with new-decision manifest rows and an empty
  flags section read flag-FREE and STOP 4 never fired (the lint has
  no manifest-vs-flags cross-check); FC-B1 now states the manifest
  class ENTAILS the flags-section entry and DEFINES flag-bearing
  from the manifest (FC-B4 cross-refs).
- The three ADR lanes ENUMERATED in FC-F1 (both arms: three rows
  pointed at "the three lanes", none stated the members — README is
  their canonical home, so post-flip the lane content lived only in
  the historical doc), plus the outside-the-list
  chapter-ratification-born acceptance case (arm 2: FC-F4 kills §4
  step 5's unconditional sentence — without the fourth case a ch8
  ratification-born ADR had no live acceptance path).
- The edit-mode principle completed to the LAST two rewritten
  surfaces without a declaration: template §1/§1a (FC-E2, arm 1 —
  under FC-E3 a silently dropped form rule flips authority AGAINST
  the still-correct lint) and the AGENTS.md v3 section (FC-G1, both
  arms — the one-packet-one-commit shape and the docs-win bullet
  were droppable a contrario).
- FC-G1 grew two more ways: the matrix summary's third disposition
  (arm 1 — flag-free approve sat on NEITHER side of the compression;
  combined with "never build before an explicit approve" the panel's
  flag-free approve read as that approve, licensing an autonomous
  build in calibration — the round-4 FC-B4 class in mirror image)
  and the verification-bridges enumeration + `v3:packet-lint`
  (arm 2 — the enumerating-surface rule applied to the bridge list).
- Preservation-row lists completed to their live registries (the
  round-4 class, two more instances): FC-A9's ergonomics half gained
  PLAN CONSISTENCY (the fifth live member — the R-ALIGNED-UP review
  half) with FC-A3's lens-5 wording tightened to D4's own words;
  FC-A3's lens 3 gained WIDE-CLAIM COVERAGE (the third member of the
  same D4 parenthetical round 4 restored "every lane driven" from).
- FC-C3: the transitional cross-model arms run on DRAFT rounds
  before ratification (reconciled — arm 1 held it entailed and filed
  it considered-not; arm 2 showed FC-F1's convention is
  packet/phase-2-framed and the ratification block's mandatory
  `arms` field had no live referent on the draft flow; the fold-4
  instantiation lesson decided: the letter states it).
- FC-B5's parenthetical corrected against live grep (arm 2 — the
  counts-to-lists rule applied to the audit record's own text): FOUR
  surfaces named [the AuthorPacket copy spells `<PACKET_ID>` — the
  exact case-sensitivity a literal sweeper would miss], 14 committed
  plan markers, not "five + ~8".
- FC-F4's draft-close DoD conditions scoped to "the chapter's draft,
  IF ANY" (arm 2 — D2's scope is the chapter's memo-born surface and
  §5's first draft exercise is ch8, so ch7, the first post-flip
  close, is draftless by design; unconditioned, the DoD's letter
  cannot pass it or invites a vacuous draft).
- FC-C1's tree-independence bar got its canonical home (arm 1, low
  weight — two full homes with no designation is the drift class the
  one-home rule exists for): contract-draft-template canonical,
  DraftContract defers; the FC-X3 entry added.

State: awaiting the arms' round-7 run on these bytes.

**Fold round 7 (2026-07-09): one arm — one P1 + one open question;
both folded:**

- FC-G1's edit-mode list contradicted its own "gains" clauses (P1):
  the docs-win and verification-bridges bullets were listed as plain
  survivors while FC-G1 names additions to both — a hostile
  implementer could skip exactly the round-6 additions citing the
  edit-mode sentence; the two bullets now survive EXCEPT for their
  named additions.
- The open question resolved as PLURAL: the DoD's draft-close
  condition binds EVERY chapter-referenced contract-draft — the
  naming scheme and the lint admit several per chapter, and D2's
  singular "surface" does not forbid a chapter having more than one
  memo-born surface.

State: awaiting the arms' round-8 run on these bytes.

**Fold round 8 (2026-07-09): two arms — 4 + 2 findings; all folded
(one with a stated disposition):**

- FC-F1's tier-0 inventory gained a GATE-POINT per member and FC-A2's
  "pre-build set" now resolves against the approve-time column (arm
  A's strongest: coverage's owned==realized lock is necessarily red
  on an approved-but-unbuilt packet — a strict reader's approve was
  unreachable, a loose reader picked their own set).
- FC-B1's flag-bearing definition extended: new-decision rows OR any
  D5-routed flags entry whose ratification point IS the approve
  (declined always; parked proposals) — DISPOSITION: the
  pure-manifest alternative was declined because D5's own words make
  a declined-carrying approve substantive; in the deferred
  auto-approve era the declined's only ratification act would have
  silently delegated.
- FC-E2's "pinned sha" completed with the COMMIT-object half (FC-C4's
  twin — the same under-enumeration class round 4 fixed in this row).
- FC-F1's 4-STOP list carries STOP-3's auto-split-remedy deferral
  clause (the D6-deferral family; a bare pointer would aim at the
  historical doc).
- The round-7 plural decision propagated to the remaining singular
  surfaces (arm B): FC-B4's 0a derivation branch (ANY §N.7-referenced
  draft not ratified-or-later), FC-I1's §N.7 convention (repeatable
  refs; the chapter draft SET = §N.7-referenced drafts with the
  `contracts/chN-*-contract.md` glob as the completeness mirror).
- FC-F5's "§4 build-loop steps" weak-survivor reading fixed the
  FC-G1 way (survive EXCEPT for the named additions/sweeps).

State: awaiting the arms' round-9 run on these bytes.

**Fold round 9 (2026-07-09): one arm, two findings; both folded:**

- The round-8 coverage gate-point split claimed an approve-time
  coverage mode that DOES NOT EXIST as an executable surface (the
  default run hard-fails on the unit-map lock; the bridge runs only
  the default). Folded as: the split lands as a small pre-flip
  mechanical-substrate change ("Phase 0.2" — a gate-point mode
  skipping the owned==realized lock), the README names which mode
  runs where, and UNTIL it lands coverage as a whole sits build-close
  — the inventory names runnable gates, never aspirations. The
  drop-the-claim alternative was declined: it would remove the
  slice-declaration's fold-time validation from the approve gate
  permanently instead of temporarily.
- The flag-bearing wording ambiguity closed: watchpoint STATUS ALONE
  does not flag-bear, but the ROUTE decides — a watchpoint routed
  `declined` flag-bears like any declined (D4 maps watchpoints to D5
  routes; unqualified, the sentence reopened the round-8 hole); and
  FC-B4's stale "manifest-defined" now defers to FC-B1's widened
  definition.

State: awaiting the arms' round-10 run on these bytes.

**Fold round 10 (2026-07-09): one arm, four findings; all folded —
every one a residue of an earlier fold's own text (the composition
that triggered the watchdog assessment):**

- FC-F1's approve-time coverage member now binds membership and
  executable form AT THE POINT OF READING (runnable only once Phase
  0.2's gate-point mode exists; until then coverage is wholly
  build-close and slice syntax is panel duty) — the round-8 fix's
  residue one level down: the live script's validation and lock are
  inseparable, so the column named a member with no mechanical form.
- FC-E2: the flags Route enum line was PINNED as a plain survivor
  while the D5 declined-reason rule lived only in README/workflows —
  the round-7 FC-G1 formula applied (survives EXCEPT for the
  declined-reason completion; the §1 declined form becomes
  `declined — <reason>`), closing the round-4 reasonless-declined
  hole on the form authority.
- FC-D2: the D5 "LOUD error, never a skip" clause joined the
  ratification item — the one member the FULL-registry row did not
  carry; a letter-faithful template would have flipped authority
  against the correctly-loud lint.
- FC-F4: the §1 inventory's two provably stale neighbours ("once
  Phase 2 starts"; the adr/ "confirms or moves" conditional) rewrite
  to the landed state in the same edit — the §6-pointer precedent.

State: **REVIEW CLOSED — watchdog STOP by the user's decision
(2026-07-09).** The enumeration ran past the packet-loop's own 8-round
cap; rounds 7–10 folded only fold-residue classes; the realness
grading (the user's question, answered in-session) showed the
remaining catch-point economics favour the landed texts. Sequence
from here: Phase 0.2 (the coverage gate-point mode) → the flip commit
written to these rows → the post-flip audit (FC-X1: the arms or the
user, landed-texts-vs-claims, before any packet work).
