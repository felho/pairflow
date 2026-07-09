# Process Friction Log

Append-only. One line per observation, written the moment the friction
happens. Reviewed at every chapter boundary (README §7); each line then
becomes a gate, a checkpoint rule, a README edit, or an acknowledged
non-issue. Capture, don't fix.

Format: `- YYYY-MM-DD · <phase/chapter> · <observation>` — mark the
chapter-boundary verdict by appending `→ <outcome>` at review time.

## Log

- 2026-07-07 · ch 2 boundary · review held — no friction entries accumulated
  during chapters 1–2 → no action
- 2026-07-07 · ch 2 aftermath · review caught the ADR integrity check proving
  less than its claim (supersede validated one-way only; index status matched
  on the first word) → check hardened same day (both directions + full status
  string), negative-tested; the §5.5 measurement rule applied to a gate itself
- 2026-07-07 · ch 3 boundary · review held — one observation: eslint flat
  config resolves overlapping file globs by later-entry override, so the
  kernel import boundary had to be ordered LAST to not be weakened by the
  production-wide testkit ban → acknowledged non-issue; the ordering
  constraint is documented in the config header, and every boundary is
  negative-tested, which is the real guard
- 2026-07-07 · ch 3 aftermath · post-commit review caught four gaps: the
  kernel import lint was blocklist-shaped (node:fs passed the "domain +
  ports ONLY" claim), ci-github-local silently lost validate-job parity
  (no v3 steps), emit canonicalization silently dropped undefined /
  non-plain-object shapes, coverage shared_ownership refs were
  shape-checked only → all four fixed same day, each negative-tested; the
  "gate proves less than its claim" class recurred (2nd time: ch 2
  check.sh, now the kernel lint + canonicalization) → rule adopted into
  README §4 step 2: a gate's negative test derives from its DECLARED
  claim, never from its implemented rule list
- 2026-07-07 · ch 3 aftermath 2 · a second review pass caught the same
  class twice more: the canonicalizer's array branch still silently
  dropped (sparse arrays digested; extra own props collided with the
  plain array), and shared_ownership accepted a co_owner that does not
  itself declare the item → both fixed same day, negative-tested; note
  the claim-derived rule was adopted mid-day and these two were authored
  BEFORE it — first post-rule gates are the real test of whether the
  rule sticks
- 2026-07-07 · ch 4 boundary · the first live packet (P1) took two
  ratification finding rounds: the template had no canonical contract
  matrix slot, and the matrix's first cut then dropped a registry FIELD
  (`round`) because it was projected from ledger §4 ENTITY names, not
  the model's field lists → template §2 step 2 extended (contract/type
  rows pull the registry field lists, not just entity names); the
  matrix itself proved out — P2–P4 built against it with zero contract
  drift and no divergence stops
- 2026-07-07 · ch 4 boundary · calibration flow (P1 approved pre-build,
  P2–P4 flowing to commit-boundary review) held; the ch-3 gates ran
  live for the first time and held (kernel import boundary, testkit
  direction, NOCLOCK, no-randomness) → no action
- 2026-07-07 · ch 4 aftermath · post-close review caught the ingress
  admitting non-round-trip-safe payloads (undefined props / functions
  silently drop in the store's JSON round-trip; BigInt throws mid-store)
  and symbol top-level keys slipping past the "strict unknown keys"
  claim → fixed same day: payload admission bound to the emit-lib's
  isCanonicalizable (one audited pinnability definition; ch-5 digest
  compatibility by construction), plain-object + symbol-key guards
  added. NOTE: this was the first POST-claim-derived-rule gate to prove
  less than its claim — its negative tests had been derived from the
  implemented rule list ("unknown string key"), not from the full claim
  ("the kernel receives only envelopes the store can faithfully
  persist"); the rule holds only if the CLAIM is stated wide enough
  before deriving
- 2026-07-07 · ch 4 aftermath 2 · the hardened predicate STILL proved
  less than the claim: Object.entries is blind to non-enumerable own
  props (a hidden data prop vanishes in the round-trip; a hidden toJSON
  rewrites the persisted value behind the digest's back) and the ingress
  unknown-key check (Object.keys) missed non-enumerable string keys →
  descriptor-level checks same day: object own props must be enumerable
  DATA props, array indices data props (non-enumerable indices stay
  legal — array stringify reads by index), ingress switched to
  getOwnPropertyNames; Proxy declared out of scope (undetectable; the
  real trust boundary is ch-9 transport serialization). Same lesson,
  one level deeper: "JSON round-trip" as a claim includes DESCRIPTOR
  semantics, not just value shapes
- 2026-07-07 · ch 4 aftermath 3 · third round on the same gate: the
  array branch left its PROTOTYPE unpinned (Array.isArray is true
  across prototypes — a custom array proto smuggled the same toJSON
  rewrite one lane over) and `i in value` accepted inherited indices →
  proto pinned to Array.prototype (null-proto arrays reject), indices
  must be OWN data props; Proxy + polluted global prototypes declared
  out of scope (compromised runtime; ch-9 transport serialization is
  the real boundary). The claim dimensions found so far on this ONE
  gate: value shapes → descriptors → prototypes. When ch 5 derives
  gate tests, enumerate the claim's DIMENSIONS first — a fix scoped to
  the dimension just caught repeats this loop
- 2026-07-07 · ch 4 aftermath 4 · fourth round, same gate: -0 passed
  the number branch (Number.isFinite true; Number.isInteger(-0) true
  and -0 < 0 false in the ingress) while stringify flattens it to 0 —
  digest AND store would silently collide {x:-0} with {x:0}; review
  caught it BEFORE the dimension-enumeration instruction was executed →
  fixed (Object.is guards in canonicalize + ingress) AND the sweep the
  aftermath-3 line demanded was finally RUN and test-pinned: all other
  finite doubles round-trip exactly, lone surrogates are safe
  (well-formed stringify escapes to ASCII), circular/over-deep payloads
  reject loudly by throw, own __proto__ keys round-trip as data. The
  ladder: values → descriptors → prototypes → numeric identity; the
  gate's claim surface is now enumerated, not just patched. Meta-lesson
  for ch 5: an instruction in the log is not execution — the sweep
  should have run in aftermath 3, not aftermath 4
- 2026-07-07 · ch 5 boundary · the review moved AHEAD of the build:
  every pre-approve packet took 1–2 finding rounds BEFORE build
  (P1: import-rule tiers + parent-plan drift + counts scope; P2:
  terminal-sink split; P3: ReplayResult surface + checker enforcement
  + literal trace table; P4: read surface + null encoding + public
  binding), and the chapter accumulated ZERO post-commit aftermath
  rounds so far — against ch 4's four same-gate rounds. The two
  chapter rules (enumerate claim dimensions first; a logged
  instruction is not execution) plus first-of-a-kind stops absorbed
  the drift where it was cheap → flow mode validated; the landed
  commits' review may still add findings, verdict extends then
- 2026-07-07 · ch 5 boundary · a convention emerged and is adopted
  standing: a packet decision that contradicts ratified plan text
  flows UP into the plan IN THE SAME COMMIT, marked "aligned at PX
  pre-approval" (used twice: P1 pending/unitMap.json; P4
  null-encoding) — never a silent divergence, never a deferred edit
- 2026-07-07 · ch 5 boundary · the three-way lock fired on a DRAFT
  packet by design (P4 declared payload_digest while the manifest was
  pending — coverage red through the whole pre-approval window) → a
  feature, not friction: a packet cannot claim a unit without
  code + manifest landing in the same commit; acknowledged
  working-as-designed
- 2026-07-07 · ch 5 boundary · tooling stumble (P1): reverting an
  executed lint negative on an UNTRACKED file via git checkout fails —
  caught because the protocol reruns the bridges after every revert;
  the bridge rerun IS the guard → acknowledged non-issue
- 2026-07-07 · ch 5 boundary follow-up · the pre-push gate failed on a
  STALE ROOT-SIDE test: the ci-local command-order pin never learned
  ch 3's v3 install step — chapter closes ran only the v3 bridges, so
  a v1-side breakage slept until the next push (root fix: 3835dc49)
  → README §6 edited: the chapter DoD gains "pnpm ci:local green"
  (root suite included), effective from chapter 6
- 2026-07-08 · ch 6 aftermath (P4a) · post-commit review caught the
  exit-class matrix proving less than its claim in code: verbStart
  wrapped EVERY startInstance error as usage (a colliding minted id —
  store integrity — would exit 2, not 1), the numeric-flag parser
  coerced via Number() ("", whitespace, "1e2", "0x10" passed as
  integers), and the tail channel rule (rows stay parseable + ONE
  stderr doc) had no CLI-level test → all three fixed same day,
  negative-tested (202 tests). The recurring class, one plane up: the
  MATRIX was the claim, the code was the rule list — a canonical
  matrix needs its lanes DRIVEN, not just declared (the ch-5
  chapter rules held for gates; this extends the same discipline to
  contract matrices)
- 2026-07-08 · ch 6 (P4b build) · the -0 test lanes initially passed
  VACUOUSLY: the fixture helper wrote files via JSON.stringify, which
  flattens -0 to 0 — the exact numeric-identity class the ch-4 ladder
  closed; the red tests caught the helper, not the CLI → the -0
  fixtures are RAW text now (JSON.parse("-0") restores what stringify
  never emits). Lesson: a negative test's FIXTURE PATH can silently
  erase the very dimension under test — stage hostile values through
  a channel that provably preserves them → boundary verdict:
  acknowledged lesson with WATCH status (one occurrence; becomes a
  rule if a second fixture path erases its dimension)
- 2026-07-08 · ch 6 boundary · review held. Shape of the chapter:
  every packet took 1–2 pre-approval refine rounds (P4 took two AND a
  split), ONE post-commit aftermath round (P4a: exit-class collapse +
  lax lexing + a channel-test gap) against ch 4's four and ch 5's
  zero — the aftermath's class was new (contract MATRIX lanes, not
  gate claims) → the P4a aftermath line's lesson is ADOPTED into
  README §4 step 2: a canonical matrix is a declared claim; every
  declared lane is driven by a test. The dev/prod boundary held
  structurally (executed probes both directions); the
  "aligned at PX pre-approval" convention carried five blocks this
  chapter without a single silent divergence
- 2026-07-08 · ch 6 boundary · the chapter DoD's full-`ci:local` gate
  (adopted at the ch-5 boundary) runs for the FIRST time at this
  close — root suite included; result recorded in the close commit
- 2026-07-08 · ch 6 aftermath 2 (post-close) · review caught two P4b
  lanes the suite had not driven: (1) `expectedVersion: -0` passed the
  inject schema (Number.isSafeInteger(-0) true, -0 < 0 false — the
  ch-4 numeric-identity dimension RECURRING in a brand-new validator;
  the ingress caught it downstream, but the packet claims PRE-submit
  validation) → -0 guard added, raw-text negative pinned; (2) the
  replay boundary validator was shallow — `finalState: {}` slipped
  through and surfaced as a state MISMATCH (exit 1) where the packet
  says malformed = usage 2 → the validator now covers the FULL
  structural shape (kinds, keysets, tuple forms, primitive types);
  the line is structure (= 2) vs semantics (= the harness's mismatch,
  1), drawn in one place. Both fixed same day, 219 tests. Standing
  lesson sharpened: the ch-4 dimension ladder (value → descriptor →
  prototype → numeric identity) applies to EVERY new validator over a
  numeric domain, not just the one gate that learned it
- 2026-07-08 · ch 6→7 boundary · README §8 skill-ification EXECUTED: the
  task-packet flow became the repo-local `CreateTaskPacket` skill
  (AuthorPacket + ReviewPacket workflows + the LearnedRules failure-class
  registry, provenance-linked to this log). The §8 criterion was long
  satisfied — 14 packets across ch 4–6, the template unchanged since the
  ch-4 close. Authority boundary kept: template/checklist/REV registry
  stay canonical in this directory, the skill carries procedure; human
  checkpoints untouched; the registry is amended at chapter boundaries
  only. First live run: the ch-7 packets → validation deferred to the
  ch-7 boundary review
- 2026-07-08 · ch 6→7 boundary (skill-ification review) · three findings,
  fixed same day: plan §1.5 still said "skill-ification deferred" — the
  exact silent-source-drift class the flow bans, in a file the skill
  itself reads as canonical; the packet-id format omitted the ratified
  split suffix (ch6-p4a/b precedent); and the workflows applied
  R-RAW-FIXTURES (WATCH) as a blocking rule — WATCH items are
  watchpoints (flag, not block) until a second occurrence promotes them.
  Lesson: a status flip must sweep EVERY file that states the old
  status, and a registry entry's applied strength must match its
  declared status
- 2026-07-08 · ch 7 (P1 pre-approval window) · the CreateTaskPacket
  skill's FIRST live run produced a controlled twin-review experiment:
  two mirror reviewer sessions (identical history, same model+effort)
  reviewed the same ch7-P1 packet — the one told to EXECUTE the
  ReviewPacket workflow found 2 findings (exactly the rubric's rows),
  the free one found 4 (incl. two real out-of-rubric classes: an
  unprovable "never blocks" contract word plan-consistent with §7.2,
  and a missing startInstance success no-emit lane); the author-side
  self-review had found 0. Gradient: author 0 < rubric-executed 2 <
  free 4 — a checklist executed as the review's DEFINITION anchors it;
  the missing piece was a MODE, not diligence → fixed same day (before
  the P1 fold): ReviewPacket dual-mode (self_review floor /
  pre_approval challenge with Contract Reality Gate + Matrix Symmetry
  Gate + finding taxonomy incl. considered_not_finding), AuthorPacket
  "flags live IN the packet" rule. LearnedRules untouched mid-chapter
  (its own boundary-only rule) — the anchoring lesson is a candidate
  registry entry at the ch-7 boundary review
- 2026-07-08 · ch 7 (P1 refine, crossover round) · the twin-review
  experiment CROSSED OVER on the folded packet (arms swapped: the
  fresh session got the free prompt, the veteran got the workflow —
  now the dual-mode version): the workflow arm caught a
  `plan_contract_challenge` — the exact class the old single-mode
  workflow missed ("raw payload NEVER" vs verbatim `error.message`),
  reported WITH the new taxonomy and a Cleared section, 23 tool calls
  (deepest run yet) → the dual-mode fix validated live, one round
  after adoption. The free arm found a different, also-real gap: the
  collapsed `startInstance → any throw` lane's driven examples came
  from memory and missed `start.ts`'s third throw site → Matrix
  Symmetry Gate extended same day (collapsed lanes enumerate members
  FROM THE CODE). Counts converged 1–1; the finding TYPES stayed
  disjoint across arms → the twin setup keeps paying for itself
  independent of skill quality; keep it
- 2026-07-08 · ch 7 (P1 refine, crossover absorption) · the reviewer's
  meta-analysis sharpened the same lesson into a DISCIPLINE: strong
  words (any/all/never/only) are proven by source-side INVENTORY, not
  plausibility or example lists → Contract Reality Gate gains two
  mandatory inventories (code-path walk for collapsed/strong lanes;
  free-text boundary classification wherever a never/redaction claim
  coexists with message/details/reason-class fields), and BOTH land at
  authoring time too (AuthorPacket step 4) — prevention beats
  detection. Candidate LearnedRules entry at the ch-7 boundary:
  "exhaustiveness discipline — strong-word claims are inventory-proven"
- 2026-07-08 · ch 7 (P1 refine, round 3) · the inventory discipline's
  FIRST application was itself incomplete: the throw inventory was
  FILE-scoped (start.ts / kernel.ts) and missed the shared
  `deriveDispatchIntent` throw site one call deeper — BOTH review arms
  independently caught it this round (convergence, unlike the prior
  disjoint rounds: the defect pool is narrowing to what both lenses
  see). The lane matters doubly: it is POST-commit/POST-create — a
  diag event coexisting with a persisted transition — so it reshaped
  the claim to success-return form (zero emit for committed/Started
  RETURNS; one emit for any non-success including post-commit throws)
  → skill wording sharpened same day: the inventory covers the
  TRANSITIVE call graph, a file-scoped grep is not an inventory. Same
  recurring class, one level deeper: "inventory proves less than its
  scope"
- 2026-07-08 · ch 7 (P1 refine, round 4) · the round-3 fold itself
  skipped the write-back loop's re-run: the newly folded shared
  derive-throw row landed WITHOUT the packet's own dimension-2 keyset
  discipline (per-entrypoint attribution unstated — the lane could
  have been driven while silently losing attribution); the review
  caught it → keysets closed in the row. Execution lesson, not a
  rubric gap: a refine fold IS authoring — the write-back re-run
  applies after EVERY round, and a new matrix row must pass the
  packet's own dimensions before presenting
- 2026-07-08 · ch 7 (P1 refine, round 5) · two lessons: (1) the
  round-3 fix itself minted a fresh overclaim — "ZERO events for a
  committed return" is false under CAS restarts (N cas_restart events,
  committed final) → the ch-4 pattern "a fix scoped to the finding
  just caught repeats the loop" now observed on WORDING, not just
  gates; narrowed to "no outcome-classified event; total zero only
  restart-free", combination lane driven. (2) The throw-inventory
  class deepened a THIRD level: explicit throw sites → transitive call
  graph → awaited PORT boundaries (a rejecting definitions.load has no
  visible throw statement; the rejection lane ≠ the null lane) →
  skill inventory wording extended (port awaits; enumerate as LIST
  never count). The ladder is now: file → call graph → port boundary;
  candidate single LearnedRules entry at the boundary covers all three
- 2026-07-08 · ch 7 (P1 window, process feedback) · epistemic
  correction to this log's own "dual-mode fix validated live" line:
  what validated was the workflow's CONTENT (the reviewer read the
  repo-local file and its behavior changed accordingly); the
  DISCOVERY layer (registry/frontmatter triggers, restart-gated on
  the reviewer's side) remains UNVALIDATED — activation path and text
  freshness are separable, and a manual file read can mask a
  discovery bug. Three refinements adopted into the skill same day:
  the collapsed-lane inventory records five fields per member
  (source_site / phase pre-state|pre-commit|post-commit|post-create /
  event_keyset / test_obligation / ruled_out_reason — lane existence
  is not lane contract); a final scalar/quantifier text sweep after
  any fold (the stale-count class, third occurrence); the review
  report carries a "Skill source" provenance line (registry vs
  repo-local file read @ commit/dirty)
- 2026-07-08 · ch 7 (P1 refine, round 6) · three findings, two
  classes: (1) NEW class — the OBSERVER must not do fallible work:
  the emit path re-calling `digest(envelope)` for attribution would
  fail exactly on the digest-throw lane it observes; resolved as a
  design rule — attribution uses values ALREADY IN HAND, threaded to
  the emit, never recomputed (unknown_instance/pre-digest throws
  therefore lack the fingerprint, driven); (2) the round-5 inventory
  fix had been applied ONLY to the flagged member — "store-port
  rejection" stayed collapsed while the rule demanded per-call
  sublanes (loadInstance/findOp/commitTransition; createInstance) —
  the "fix scoped to the finding just caught" loop, now on inventory
  APPLICATION → AuthorPacket write-back loop extended: a deepened
  inventory rule re-derives the ENTIRE inventory, not the named
  member; (3) the CAS qualifier had not propagated to every canonical
  spot (dimension 1, plan committed row) — the scalar/quantifier
  sweep now exists for exactly this and ran clean after the fold
- 2026-07-08 · ch 7 (P1 refine, round 7) · both arms converged again:
  the round-6 presence-rule change (payload-key → phase-based) left
  TWO keysets stating the OLD "iff the envelope carries a payload"
  condition — false post-digest, since the ch-5 digest is
  type-inclusive with arity encoding (ADR-008: absent payload still
  digests; verified at emit/opId.ts) — and the cas_restart row was
  missing the field entirely (post-digest, value in hand). The class
  is the skill-ification round's status-flip lesson INSIDE one
  artifact: a rule change sweeps every statement of the rule → the
  scalar/quantifier sweep extended to conditional presence clauses
  (iff / only-when). Note: the non-skill arm and the skill arm found
  the same core defect; the skill arm added the cas_restart impact
  and reported with the new provenance line — the A/B continues
- 2026-07-08 · ch 7 (P1 window, round-count retrospective) · asked why
  ONE packet drew 7+ refine rounds: half domain-essential (the packet
  is the first observer-of-everything — its matrix is a census of the
  whole kernel's control flow, it converts the kernel's IMPLICIT
  operation order into public contract, its strong-word density is
  structural, and its consistency surface is ~800 lines of existing
  code), half fold-execution (propagation misses: rounds 4/6b/7). Two
  adoptions close the second half: (1) the v1
  Contract-Dense-Task-Gate's missing inheritance realized — canonical
  row + MIRRORED SURFACE MAP + update-every-named-mirror fold policy
  (README §5.2's ergonomics inheritance, finally executed for this
  gate); (2) a FRESH-EYES propagation check in the write-back loop —
  each fold stated as a one-line delta, a fresh-context sub-agent
  hunts un-propagated consequences before presenting (the author's
  post-fold context carries "already fixed it" bias). Synergy: the
  map shrinks the propagation surface, the fresh pass verifies the
  remainder. Prediction stands: P2–P4 should be materially cheaper;
  the observer-role hardness was P1-specific
- 2026-07-08 · ch 7 (P1 window, inheritance completed) · the user
  caught that the v1 Contract-Dense gate port was HALF an inheritance:
  the gate's DETECTION half — scan prose for contract-bearing
  sentences and force them into canonical rows (v1 Policy #1: no
  "valid/parseable"-class prose where deterministic behavior is
  needed) — had not been ported; only the canonical-matrix convention
  (ch 4) and the mirror checklist (today) had. Adopted both sides now:
  AuthorPacket prose-contract extraction at write time ("would an
  implementer need this sentence to write a test?" → it is contract,
  not prose; the §5.3 in-context budget is the stated exception) +
  ReviewPacket prose-contract scan as a claim-half check. Evidence
  from our own packet: the payloadDigest presence rule part-lived in
  cell prose and a note — that placement is WHY it could drift in
  rounds 6–7. Full v1-gate inheritance now: detect+extract, canonical
  row, mirror map; the v3-native additions on top: five-field lane
  inventory, sweeps, fresh-eyes propagation pass
- 2026-07-08 · ch 7 (P1 refine, round 8) · one Low remnant: the
  count-discipline rule's MIRROR in an in-context note still said
  "final outcome → one classified emit" — the round-7 sweep, executed
  by the AUTHOR, passed over a count statement of the old rule while
  checking iff-clauses: the sweep's first execution itself proved less
  than its claim, which is precisely the author-bias case the
  fresh-eyes propagation pass (adopted after that round) exists for →
  note fixed, marked as a mirror of dimension 6; no new rule — the
  existing pair (mirror map + fresh eyes) covers the class from here
- 2026-07-08 · ch 7 (P1 refine, round 9 + first fresh-eyes run) · the
  reviewers applied the skill's OWN new rules to the packet that
  spawned them (reflexive validation): the Mirrored Surface Map was
  missing (added — plus the flags ledger declared a HISTORICAL
  snapshot set, deliberately outside the live mirrors: history is not
  rewritten on canonical change), and the prose-contract scan caught
  a testable-looking obligation in a note ("per-restart recompute /
  do not cache") → DE-CLAIMED: the digest is deterministic, a cache
  is observationally identical — explicitly not a lane. Then the
  FRESH-EYES propagation pass ran LIVE for the first time on the
  fold and immediately earned its place: it found a PHANTOM mirror
  (the map listed an in-context bare-call note that does not exist)
  and unlisted mirrors (dimension 1 and the acceptance list restate
  count/presence rules) — the map itself is reviewable content, and
  an uncontaminated reader catches what the map's author cannot.
  Process feedback absorbed the same day: `field_provenance` joins
  the lane-inventory schema first-class (presence condition + value
  source + no-new-fallible-work — would have caught the
  digest-recompute class deterministically), the report templates
  gain visible "Mirror/propagation" and "Propagation" lines (proof it
  RAN, the Skill-source pattern), and the schema wording dropped its
  own "five fields" count — the list-never-count rule applied to the
  skill's own text
- 2026-07-08 · ch 7 (P1 refine, round 10) · three mirror-completeness
  findings (handle internal-failure sublanes got exact phase-split
  keysets — generic "attribution" could have let a build drop
  envelope fields the kernel provably has in hand; the map gained its
  two missing rows: IngressDetailToken list, rethrow transparency) —
  and the FIRST round requiring ZERO skill changes: the gates were
  already right, only their application converged. The fresh-eyes
  pass (2nd live run) came back CLEAN on both deltas — one loose
  map-label refreshed, two rethrow mentions confirmed as permitted
  deferrals. Convergence signal: reviewer findings narrowed from
  contract substance (rounds 1–7) to index completeness (9–10), and
  the propagation loop now closes pre-presentation
- 2026-07-08 · ch 7 (P1 refine, round 11) · the field_provenance
  schema landed in the packet as a compact LANE-INVENTORY table — and
  it became the CANONICAL home for per-lane event shapes + per-field
  provenance (condition → value source), demoting the emission-matrix
  inline keysets to named mirrors: one authority for SHAPES, one for
  lane BEHAVIOR — the alternative (keysets canonical in two tables)
  would have rebuilt the drift class the map exists to kill. The
  cas_restart minimal keyset recorded as a DECLARED choice. Fresh-eyes
  3rd run: all four axes PASS (keyset agreement, bijective lane
  coverage, type-matrix conditions, plan consistency) — a canonical
  RELOCATION verified clean pre-presentation, the operation class
  that used to take a round-trip. Again zero skill changes
- 2026-07-08 · ch 7 (P1 refine, round 12) · four findings folded: the
  inventory went PER-MEMBER with a source-site column — duplicate and
  op_id_collision each have TWO code origins (findOp fast-path ·
  commitTransition result), both now driven (a build could have
  silently served one); the stale keyset made explicit (a
  back-reference through a row with an optional field is ambiguous);
  the round-11 cas_restart minimal-keyset choice REVERSED after one
  round — full envelope attribution, because the uniform rule
  ("attribution wherever an envelope exists") beats an aesthetic
  minimalism that would have needed a plan carve-out (lesson: a
  declared choice that forces an exception clause in a WIDER rule is
  usually the wrong choice); the trace-harness doc comment added as a
  comment-only ripple target. Fresh-eyes 4th run: all four deltas
  PASS incl. the reversal's plan consistency. Zero skill changes,
  third round running
- 2026-07-08 · ch 7 (P1 refine, round 13) · three cell-completeness
  findings folded (table-level provenance DEFAULTS — rows carry only
  deviations; keysets declared event-specific with source/kind
  structural per lane; the plan §7.2 event-fields clause added to the
  event-shape mirror row) + one self-caught stale intro ("Per lane
  group" survived the round-12 per-member split — the map's own
  section is not exempt from the rule-change sweep). Fresh-eyes 5th
  run on HAIKU (the mechanical-check tier discussed with the user):
  all four axes PASS at ~40% of the Opus token cost and ~1/4 the
  wall-clock — the model-tiering principle holds for bounded
  mechanical diffs; semantic propagation checks stay on the strong
  tier. Zero skill changes, fourth round running
- 2026-07-08 · ch 7 (P1 refine, round 14) · the inventory's Phase
  column had CONFLATED two axes — STATE phase (never-committed vs
  persisted: P1's core distinction) and DIGEST point (what gates
  payloadDigest) — so the canonical shape table was quietly working
  as a digest-presence axis while the state distinction lived in
  mixed cells → split into two columns, the two mixed rows split into
  four (post-digest port throws ≠ post-commit derive; pre/at-create ≠
  post-create), every live "phase-based" mention renamed
  digest-point-based (rule-change sweep). The haiku-tier fresh-eyes
  (6th run) caught the ONE leftover the author sweep missed ("by
  PHASE" in a matrix cell — an uppercase variant that escaped the
  grep): the cheap tier catches exactly the class it was hired for.
  Fifth consecutive zero-skill-change round; lesson: when a column
  serves two masters, the drift hides in the mixed cells
- 2026-07-08 · ch 7 (P1 refine, round 15) · both arms converged on
  the round-14 rename's CROSS-ARTIFACT leftover: the plan §7.2
  payload-boundary clause (a live mirror per the map) still said
  PHASE-based — because the round-14 sweep AND its fresh-eyes run
  were scoped to the packet FILE, while the rule's mirror list spans
  artifacts. The "proves less than its scope" class, now on the sweep
  itself: a rule-change sweep's scope IS the mirror map's list, never
  a file (the fresh-eyes instruction already says "map + boundary
  files" — execution miss, not rule gap). Plan clause renamed with
  the distinct-from-state-phase note; both artifacts grep-swept clean
  — for a single-token delta the deterministic grep IS the complete
  propagation check. Sixth consecutive zero-skill-change round
- 2026-07-08 · ch 7 (P1 post-build aftermath) · after 15 pre-approval
  rounds and a first-run-green build, the post-build review still
  found a REAL bug the text-plane could not: the digest-threading
  context was CALL-scoped while the digest-point contract is
  ATTEMPT-scoped — after a CAS restart a pre-digest failure inherited
  the prior attempt's payloadDigest. The suite had driven
  restart→commit and first-attempt pre-digest lanes separately, never
  their COMBINATION across the restart boundary → ctx now resets per
  attempt; two regression lanes driven RED-first (observed red, then
  green — 257 tests). Class for the boundary review: a contract whose
  unit is "per attempt" makes every cross-attempt data-threading
  mechanism a COMBINATION surface — the lane inventory enumerates
  factors, but products across a loop boundary need their own row.
  Also honest scope note: this is what the 15 text rounds could NOT
  see — implementation-scoping bugs live below the packet's
  abstraction floor; the review split (text pre-approval + post-build
  code review) is complementary, not redundant
- 2026-07-08 · ch 7 (P2 window, memory-dependency audit) · the user
  called the structural point: the process must converge to agents
  WITHOUT session/file memory (chained executors, non-Claude runners)
  — any operative fact whose only home is the assistant's memory is a
  hidden dependency, the README §5.3 table's worst tier with memory as
  the context. Audit result: the P2 contract handoffs, conventions,
  and commit rules all had repo homes (memory = cache); TWO items were
  memory-only — the never-git-push collaboration rule and the v3
  ROUTING itself (AGENTS.md was pure v1: an agent following it would
  never find the v3 process) → both lifted into AGENTS.md (Safety
  bullet + a "V3 Implementation Plane" section: process authority,
  skill pointer with docs-win rule, human checkpoints, bridges, commit
  shape). Standing convention from here: memory may ACCELERATE, never
  CARRY — an operative fact found memory-only is a defect. The
  fresh-session P2 experiment now genuinely measures skill + repo
- 2026-07-08 · ch 7 (P2 window, next-step tracking) · follow-up user
  probe: is "which packet comes next" TRACKED, or does it need the
  session? Audit: fully DERIVABLE from three repo surfaces (intake-map
  row statuses; the chapter's §N.7 packet table + order line; packet
  files under packets/ — the one-commit rule makes file-in-git =
  built), but the derivation RULE was unwritten judgment → encoded as
  AuthorPacket step 0a (PACKET_ID optional; deterministic derivation
  incl. the close-vs-packet and in-flight-dirty-worktree edges, with
  the derivation stated in the summary) + a next-step discovery
  trigger in the SKILL description. "Jöhet a terv következő lépése" is
  now a sufficient prompt for a memory-less agent
- 2026-07-08 · ch 7 (P2 fresh-session experiment, round 1) · the first
  fresh-session packet run PASSED on all four designed axes: (1)
  discovery — the bare Hungarian prompt fired the Skill tool via USE
  WHEN (the layer the Codex A/B could never test); (2) AGENTS.md
  routed the v3 plane (read early — the same-day lift paid off); (3)
  the 0a derivation ran, was STATED in the summary, and — the round's
  best datapoint — OVERRODE a WRONG prior: the session started
  believing "ch5 closed, next ch6" because the assistant's MEMORY.md
  index hook was written at the ch-5 close and never updated (stale
  memory MISDIRECTS, it does not merely underinform); repo surfaces
  won, exactly per the memory-accelerates-never-carries convention →
  the index rewritten to STATUS-FREE pointer hooks same day; (4) full
  AuthorPacket execution: green-baseline run, write-back loop (4
  self-review findings folded pre-presentation), fresh-eyes CLEAN on
  round 1, provenance line, STOP at the verdict with decision points
  routed to the user. Substantive quality: the Contract Reality Gate
  caught a REAL live-code gap (plan §7.3 claims cursor "-0 rejected"
  inheritance while the live getTimeline validator has no Object.is
  guard) — a plan_contract_challenge from a fresh session with zero
  conversation history. The 0a rule landed hours before this run and
  was the difference between self-correction and a wrong packet
- 2026-07-08 · ch 7 (P2 fresh-session, timing follow-up) · the user
  perceived "finding the packet" as slow — the timeline says the
  OPPOSITE: derivation completed in ~60s (prompt→Skill 17s; the 0a
  chain git-log→packets→map by +51s; reading §7 headers by +60s; the
  stale prior caused ZERO wrong tool calls), but the FIRST visible
  text arrived at +18.5 min — the session worked silently through
  source loading, 2–3-minute reasoning blocks, the packet Write and
  the write-back loop, because 0a step 4 required stating the
  derivation only IN THE SUMMARY. Communication-cadence gap, not
  derivation cost → 0a step 4 now requires announcing the derivation
  IMMEDIATELY as the first status line ("silent derivation is
  indistinguishable from a lost agent")
- 2026-07-08 · ch 7 (P2 pre-approval, rounds 1–8 retro) · the packet
  took EIGHT refine rounds across two parallel review sessions — not
  churn: P2 is simultaneously a SQLite substrate contract, a fail-open
  write / fail-loud read pair, a P1 event-shape persistence boundary,
  and an ADR/registry/plan mirror surface, and most folds MINTED new
  obligations (O8→O9/O10, R2→R3, driven→covered, table set→application
  table set). The two arms ran COMPLEMENTARY lenses (one strong on
  substrate-reality/registry/serialization, the other on
  mirror/propagation/text-sweep) and converged on the SAME final gap —
  evidence the skill's gates are real but not depth-deterministic:
  "the skill ran" does not prove every gate ran at full depth; the
  answer is gate-mechanization plus mandatory visible
  execution-proof outputs, not prompt exhortation
- 2026-07-08 · ch 7 (P2 rounds 2–4, substrate class) · three substrate
  claims fell to LIVE probes after passing plausible review
  (`PRAGMA journal_mode=WAL` is itself a write on non-WAL files; a
  readonly EMPTY db passes the probe and throws on the init `CREATE`;
  AUTOINCREMENT mints `sqlite_sequence`), and one probe PAIR disagreed
  (readonly already-WAL readability — sidecar/close-state sensitive) →
  **Substrate Reality Probe** gate added to ReviewPacket (four
  mandatory inventories now) + AuthorPacket step 6: probe-or-source,
  never plausibility; corollary: a CONTESTED probe premise cannot
  carry a claim — remove the premise (the fold that produced
  fence-first/WAL-last + the NON-WAL fixture family) or drive both
  environments
- 2026-07-08 · ch 7 (P2 round 8, delegation class) · "P1-declared
  projection" is a DELEGATING claim — its definition lives in another
  packet's type matrix — and six rounds validated it at key/type level
  only; the presence iffs and enum domains stayed unexpanded until
  BOTH review arms converged on the leak (`{source:"kernel",
  kind:"duplicate", reason:…}` passes key/type, fails P1) →
  **Projection/Delegation Closure** gate added to ReviewPacket (pull
  the delegated source's FULL rule set — field lists + presence iffs +
  enum domains — and derive invalid-but-conforming counterexamples) +
  AuthorPacket step 4.5 write-time closure with a stated proof
  boundary; rule candidate for the boundary review (R-FIELD-LISTS'
  cross-artifact sibling)
- 2026-07-08 · ch 7 (P2 rounds 3+6, two rule candidates for the
  boundary) · (a) a rule change MINTS lanes, not just moves them —
  after the open-order change the re-derivation had to ask "what fires
  FIRST now" PER FILE STATE, not sweep the old members (O9 was born
  exactly there); (b) an inventory that legitimately carries stated
  residues/non-lanes cannot be summarized "driven per its table" —
  COVERED = driven lanes executed + residues standing as stated
  (R-EXECUTION's precision half)
- 2026-07-08 · ch 7 (P2 retro, verdict validity) · the packet was
  untracked and continuously edited across rounds, so mid-stream
  approvals bound NOTHING identifiable → the ReviewPacket report gains
  a mandatory `Packet basis` line (sha256 + HEAD + dirty state); a
  verdict binds only the hashed bytes, any later edit voids it. Same
  retro: report-format adherence was arm-dependent (the Skill source
  line sometimes commentary-only) → the report's mandatory lines
  (`Skill source`, `Packet basis`, `Mirror/propagation`) are now a
  STOP-shaped validity gate, not style
- 2026-07-08 · ch 7 (P2 retro, skill maintenance) · the four gate
  edits landed in the WORKFLOW files now (procedure is
  mid-stream-editable — the ch7-P1 precedent of per-round skill
  growth); the LearnedRules registry rows wait for the ch-7 boundary
  review per the registry's own "chapter boundaries only / never
  invents a rule the log does not carry" discipline — this log entry
  block is their provenance
- 2026-07-09 · process-v2 Phase 0 (packet-lint review) · the user's
  review caught FOUR false-green gates in the just-shipped lint — the
  "gate proves less than its claim" class, now on the tool built to
  mechanize that very lesson: (1) packet_metrics nested fields
  type-checked only "if dict" (a string prediction passed); (2) lane
  ranges validated ENDPOINTS only (O1–O3 green with O2 undefined);
  (3) provenance marks were counted but no check that canonical rows
  CARRY marks (an unmarked lane row passed — the D1 contract leaked);
  (4) draft status monotonicity was an enum check, not a history check
  (a downgrade was undetectable). All four fixed (deep schema walk;
  full-range member resolution; lane-row mark requirement — the
  mechanically detectable canonical-row set v0; git-HEAD status
  comparison), selftest 15→19 red dims. Lesson line for the boundary:
  the claim-derived negative-test rule applies to the LINT'S OWN claims
  — a checker's selftest must derive from what the checker CLAIMS to
  gate, not from the checks it happens to implement
- 2026-07-09 · process-v2 Phase 0 (lint retro, rule candidate) · five
  review rounds (18 findings) on check_packet.py decomposed cleanly:
  the lint was INVENTION-class work (its contract existed only as
  design-doc bullets — "monotonic status", "DEEP schema" — with the
  row-granular enforcement semantics decided at implementation time,
  systematically in the weak reading), built OUTSIDE the very process
  it enforces (no claim-dimension enumeration, no panel — the
  bootstrap paradox), with a self-referential selftest (the "claim" it
  derived from was the author's own docstring describing the
  implementation). The missing dimensions patterned exactly as the
  ch-4 ladder predicts: TEMPORAL (committed downgrade, multi-step
  history, block rewrite, audit pinning) and ADVERSARIAL (multi-marks,
  payload on new-decision, unquoted fence) axes arrived only via
  fresh-context reviewer probes, post-commit — the ch-4 aftermath
  pattern relocated onto tooling. RULE CANDIDATE for the boundary:
  contract-enforcing tooling is itself contract-dense invention and
  gets packet-grade treatment (claim rows, dimension sweep with the
  temporal+adversarial axes named, panel before build) — "it is a
  script, not a packet" exempts nothing. Applied immediately in the
  weak form: the Phase-1 flip's TEXT claims get enumerated and
  reviewed before the flip lands
- 2026-07-09 · process-v2 Amendment 1 (carrier simplification,
  proposed) · the USER raised the overengineering challenge against
  the ratified Phase-0 mechanics — the first live
  `2:contested-ratified-vs-reality` STOP, exercised on the process
  artifacts themselves. Two independent arm assessments converged on
  the diagnosis (machine data in a fragile prose carrier; version
  control re-implemented inside a version-controlled file) and
  diverged on the remedy (git-native anchoring vs current-state +
  review policy); the amendment (design doc §7) adopts the synthesis:
  recorded-commit anchoring with NO history mining, and a row
  MANIFEST block replacing the inline `[P:*]` marks. D1–D7 semantics
  untouched — the design held; the Phase-0 carrier choice was the
  defect. TWO RULES MINTED: (1) fix-all binds CONTENT findings; for
  tooling findings the threat-model judgment is a mandatory step and
  `declined: out of threat model` is a live route (evidence: 18 lint
  findings, zero declined — the judgment was skipped, not decided);
  (2) tier-0 scoping — tier 0 checks hard deterministic facts over
  DECLARED data and never extracts semantics from prose; prose
  obligations are lens duties. Lesson for the boundary: the
  1330-line/45-dim lint guarded a gate with ZERO traffic — armor
  preceded use because the fix-all reflex ran where a threat-model
  judgment belonged
- 2026-07-09 · process-v2 Amendment 1 (fold rounds 1–2) · both arms
  reviewed the proposed amendment; the round-1 blocker — found by
  BOTH independently — was the reopen red-window: the new carrier
  reproducing its own "unparseable intermediate version" class,
  closed by the `reopened` status (every choreography commit green;
  accepted-transient-red declined: red-as-lifecycle trains the
  operator to ignore red; round 2 added the transience rule — zero
  reopened drafts at approve/chapter-close/flip gates). A THIRD RULE
  joined §7.4, USER-stated: **fix-all routes effort, never truth** —
  per-finding dispositions (folded / narrowed / declined with
  reasons), explicit reconciliation when feedback sources conflict,
  genuinely open choices escalate as STOPs; first exercised in the
  §7.7 record itself (the arms' remedies diverged twice; the chosen
  sides carry their reasons). Round-2 micro-lesson: the §7.2
  canonical EXAMPLE went red under the rule minted two paragraphs
  below it — the rule-change-sweeps-every-statement discipline
  includes examples
- 2026-07-09 · process-v2 Amendment 1 ratified (+ user watchpoint for
  a future boundary) · ratified by the user's explicit post-fold act;
  content commit ae1e362e, the flip commit carries the Carrier-B
  record — the amendment's own ratification is the recorded-commit
  mechanism's first live use. Fold rounds 3–4 en route: the §7.4
  heading went count-free (the doc's counts-to-lists rule applied to
  itself), and the user caught the `draft:` ref-prefix colliding with
  the status enum → renamed `contract:` (the artifact's durable
  identity; a type token must not share a name with a status value).
  A mis-executed flip (inferred from an intent statement) was
  withdrawn by reset pre-push — lesson folded into the §7.7 record:
  ratification never delegates AND never INFERS. USER WATCHPOINT
  logged at ratification: the ledger is built around the KERNEL plane
  — as the system grows, other parts may want corpus residence; the
  D2 routing rule already splits by plane (model-plane content →
  corpus even when memo-born; a draft never becomes permanent
  authority), but whether the ledger's STRUCTURE scales to non-kernel
  surfaces is deliberately deferred to when it first bites — no
  pre-building; the STOP family catches the first live case
  (mid-chapter corpus extension has no workflow yet, by design)
- 2026-07-09 · process-v2 Phase 0.1 (lint rewrite + template swap,
  with a prediction miss recorded) · check_packet.py rewritten to the
  Amendment-1 carrier: the docstring is now the CLAIM REGISTRY (P1–P8
  packets, D1–D7 drafts — the round-6 selftest-derives-from-claims
  rule realized structurally), all prose scanning reduced to the
  first-cell lane-id existence check, all history mining replaced by
  the single recorded-commit equality (git show) + HEAD-only
  state-consistency rules incl. `reopened`; `--forbid-reopened` is
  the zero-reopened gate form. Selftest 58 claim-derived red dims +
  three named greens (reopen choreography per step, re-ratification,
  fenced noise). PREDICTION MISS, logged per the metrics culture: §7.5
  estimated ~700–800 lines; the file is ~1360 — flat, not halved. The
  estimate measured the wrong dimension: what shrank is the FRAGILE
  SURFACE (regex prose parsing, history walking — the two
  hole-generating classes of all 7 review rounds), while the line
  count stayed flat because the ratified claim set is LARGER and more
  precise (reopened state machine, ref strictness, bidirectionality),
  each claim buying one cheap declared-data dim. Lesson: size
  estimates for gate code should predict the fragile-surface delta,
  not the line count
- 2026-07-09 · process-v2 Phase 0.1 (lint review round 1, three
  findings, all IN threat model per the §7.4 mandatory judgment) ·
  (1) the draft selftest fixtures re-used the SHARED fixture's green
  text in FRESH git repos — the recorded sha resolved nowhere, so
  many draft dims went red for the WRONG reason (an unresolvable-
  commit error could mask a dead D3/D7 check: the selftest's
  evidentiary value was the hole, squarely in-model); fixed
  stronger than filed — every dim now asserts ITS OWN error-message
  substring (`assert_red`), and draft mutations apply to the
  fixture's own green text, so exit-code-masking is closed as a
  CLASS; (2)+(3) two crash-not-red holes (stops[].type set-membership
  hashed an unhashable; --post-build called .get on a non-object
  boundary) — malformed machine data must be a red lint error, never
  a Python traceback (the gate contract itself), both fixed + two
  new red dims. Selftest 58→60 dims, all claim-pinned. The round-1
  lesson echoes the claim-derivation rule: a dim that is red for an
  unrelated reason proves nothing — red-for-its-claim is the assertion
- 2026-07-09 · process-v2 Phase 0.1 (lint review round 2, two
  findings, both IN threat model) · (1) the --post-build audit
  enforced only "files is a list" while fold time enforced the full
  P2 shape — a committed boundary with an absolute path and a
  non-string element passed the audit clean (reproduced by the
  reviewer); the audit is the LAST line of defense and reads the
  commit's bytes, so it must carry the same schema — fixed by
  extracting ONE shared check_boundary_files helper (the fix removes
  the duplication that bred the divergence, not just the symptom);
  (2) the retired-mark scan matched only the three known kinds while
  the P6 claim says [P:*] — `[P:typo]` outside a fence stayed green;
  the regex now matches the FAMILY prefix, exactly the claim's
  wording. Selftest 60→62 dims. Both findings are the same class the
  gate culture hunts: the code proving less than its stated claim —
  on the new carrier the claim registry (docstring) made the gap
  DECIDABLE by reading, which is how the reviewer found it
- 2026-07-09 · process-v2 Phase 0.1 (vocabulary correction, USER
  pattern-catch) · the P6 check stays (the user concurred after the
  threat-model case: a lint cannot make a syntax "not exist" — prose
  admits only silently-tolerated or loudly-rejected, and a
  reappearing mark would be a second, dead provenance home a reader
  might trust; the source is generation drift from the repo's
  historical texts, not usage — the convention never went live). But
  the USER caught a recurring LLM framing pattern in my wording:
  narrating a DESIGN-PHASE catch with production-lifecycle vocabulary
  ("retired") as if the construct had been live. Corrected on the
  live surfaces: "withdrawn at design time (Amendment 1, never
  live)" in the lint's P6 claim, messages, dim names, and template
  §1; ratified/frozen texts stay as history. Rule of thumb minted:
  never-live constructs get design-time wording, and a reappearance
  guard names the REAL threat (generation drift), never a fictional
  decommission
- 2026-07-09 · process-v2 Phase 0.1 (lint review round 3, two
  findings, both IN threat model) · (1) a ROOT commit's diff-tree
  change list is empty without --root, so the --post-build audit
  passed vacuously (reproduced by the reviewer: out-of-boundary
  files rode in on a repo's first commit) — the SECOND member of the
  empty-diff-tree false-green family whose first member (merge
  commits) was guarded in the original build; fixed with --root
  (diff against the empty tree) + a red dim, and the P8 claim now
  names the family ("an empty change list in either form is a
  false-green audit"); (2) fence exclusion stripped only backtick
  fences while the P5/P6 claims say "fenced code excluded" — a tilde
  fence hid nothing; the code widened to the claim (both markdown
  fence forms; machine blocks stay ```json by the template's
  declared form) rather than the claim narrowed to the code, + a red
  dim and a both-forms green. Selftest 62→64. Family lesson: when a
  false-green is found in ONE branch of an enumerable family (merge/
  root; backtick/tilde), sweep the family — the sibling hole is the
  cheapest prediction available
- 2026-07-09 · process-v2 Phase 0.1 (lint review round 4, two
  findings, both IN threat model) · (1) the vacuous-audit family's
  THIRD member: an --allow-empty commit's change list is empty and
  the audit passed (reproduced) — the round-3 family-sweep lesson was
  minted and then UNDER-EXECUTED by the author (merge/root
  enumerated, empty-by-flag missed; the reviewer swept it instead);
  fixed at the SINK, the durable form: an empty change list is red
  regardless of cause, because a build commit lands at least the
  packet file itself (one-commit rule) — enumeration of causes ends
  here by construction; (2) json.loads silently keeps the LAST
  duplicate key, so "exact keyset" was not exact — a duplicated
  "files" key rode through while reader and tool could disagree on
  which value holds; fixed with an object_pairs_hook that makes ANY
  duplicated key in a machine block a red parse error. Selftest
  64→66. Sharpened family lesson: a family sweep that ENUMERATES
  members stays open (the next member is a miss); when a SINK
  invariant exists ("changed set is never empty"), close the family
  there
- 2026-07-09 · process-v2 Phase 0.1 (lint review round 5, two
  findings + a docs nit, all folded) · both findings are ONE class:
  the code accepted LOOSER shapes than the claim names, and the gap
  was a silent reinterpretation — (1) int() normalized lane-id
  numerics, so O01 == O1 across manifest and table while P5 claims
  exact identity (reproduced both directions); fixed with exact
  string comparison everywhere + a no-leading-zero grammar (two
  near-identical ids would be a readability hazard with zero value);
  (2) the ratification `commit` field accepted any hex that
  `git show <sha>:<path>` resolves — a TREE sha passed (reproduced)
  though a tree has no date/author/history position, i.e. it is not
  an auditable ratification point; fixed with a `git cat-file -t ==
  commit` guard. Plus the template §1a still said "retired-carrier"
  — the round-4 vocabulary correction had missed one mirror; swept.
  Selftest 66→69. Class lesson named: LOOSE-ACCEPT — validate the
  declared FORM, then verify the resolved OBJECT is the claimed KIND;
  hex-shape or regex-shape alone proves neither
- 2026-07-09 · process-v2 Phase 0.1 (lint review round 6 — one Low,
  otherwise CLEAN) · the round-5 no-leading-zeros rule was minted in
  the lint without sweeping the author-facing template §1 rules block
  (docs-win: the template is the FORM authority, a rule living only
  in the enforcer is contract drift toward authors) — swept. The
  reviewer found NO blocking issues at 753577c6 and confirmed the
  typical hole classes closed (unified boundary schema, full [P:*]
  family, root/empty diff-tree, duplicate JSON keys, exact lane ids,
  commit-object guard) — the first clean-ish round on the new
  carrier, six rounds in
- 2026-07-09 · process-v2 Phase 0.1 (lint review round 7, one Medium
  + a carrier question answered) · the pair-matching fence regexes
  did not understand fence NESTING: a ````markdown outer fence (the
  template's own quoting pattern) leaked its quoted ```text content
  into the prose scans (reproduced: quoted rows/marks false-RED) and
  could read a QUOTED ```json block as a machine-block declaration;
  replaced with a line-oriented scanner honoring the CommonMark
  closing rule (same char, at least opener length) — machine blocks
  parse ONLY from top-level ```json fences; quoted fences are
  material. The user's follow-up question — "move the machine data to
  YAML front matter instead?" — was CONSIDERED AND DECLINED with
  reasons (the effort/truth record): (a) YAML implicit typing is the
  LOOSE-ACCEPT class itself (an unquoted short sha like 123e4567
  parses as a float; no/off parse as booleans) — it would re-import
  silent reinterpretation at the parser layer; (b) front matter is
  position-bound to line 1, and the template's pairflow rule
  anticipates packets EMBEDDED as sections of wrapper task docs,
  where front matter ceases to exist while fenced blocks survive;
  (c) stdlib-only culture (PyYAML dependency); (d) ledger_slice stays
  a fenced block (check_coverage, 16 live packets) — two carriers
  forever. The structured-data goal is already delivered by JSON;
  the defect was the fence SCANNER, not the carrier
- 2026-07-09 · process-v2 Phase 0.1 (lint review round 8: one Medium
  folded, one Low narrowed, one author-run family sweep) · (1) the
  round-7 scanner recognized only column-0 fence openers while
  CommonMark allows 0–3 leading spaces — indented quoted content
  leaked into the prose scans and an indented ```json declaration
  did not parse; fixed on both opener and closer (4+ spaces = an
  indented code block, out of the FENCED-code claim's scope), with
  an indented-noise green and an indented-declaration red dim.
  (2) NARROWED, not folded: §7.2's ratified text says "integer"
  while the tightened no-leading-zeros grammar lives in the lint +
  template — the design doc's §7 body is the Carrier-B-bound payload
  (recorded commit ae1e362e) and is NOT edited without the user's
  re-ratification act; the grammar's canonical home is template §1
  under docs-win (round 6), and the delta rides into the flip-claims
  revision. (3) The round-5 family lesson executed by the AUTHOR
  this time: the lane-id no-leading-zeros rule's sibling surface is
  the draft C-row ids — C01 now red (detection stays broad so a
  demoted C01 row cannot silently escape the equality guard;
  validation is explicit). Selftest 70→72
- 2026-07-09 · process-v2 Phase 0.1 (lint review round 9, three
  findings, all folded) · (1) the audit's own empty-check RATIONALE
  stated "a build commit lands at least the packet file itself" but
  the code only checked emptiness — a code-only or follow-up commit
  green-lit --post-build (reproduced); the invariant is now enforced
  POSITIVELY (the audited commit must change the packet file), a
  stated-rationale-vs-checked-invariant gap: when a comment NAMES an
  invariant, the checker must test it, not just its negation's
  easiest case; (2) doc-side lane ids were collected into a SET, so
  two `| O1 |` table rows collapsed and passed against one manifest
  row — a count-blind data-structure choice; duplicates are now red
  (restores symmetry with the draft C-dup check); (3) D6 says the
  summary LISTS reopened drafts but lint() reduced them to a count —
  names now ride the stats and the summary prints them, with a
  structural selftest assertion. Selftest 72→74
- 2026-07-09 · process-v2 Phase 0.1 (lint review round 10, one
  Medium; reviewer audited the fixed HEAD a0dfabc7) · --post-build
  accepted commit-ISH refs — HEAD, a branch name, an annotated tag
  name, and the tag OBJECT sha all produced a green audit
  (reproduced) — while P8's own words say "audit reruns are pinned":
  a movable ref makes the recorded verdict non-reproducible, and a
  tag object is not the build commit. This is the round-5 draft-side
  commit-kind guard's SIBLING SURFACE on the audit path, again swept
  by the reviewer rather than the author (the second missed
  family-sweep of the series — the pattern to internalize: when a
  guard lands on ONE side of a mirrored pair of surfaces, the other
  side inherits the obligation in the same commit). Fixed by
  mirroring the guard (hex shape + cat-file -t == commit before git
  show); the selftest's own audits now pass rev-parse'd shas, with
  HEAD and tag-object red dims. Selftest 74→76
- 2026-07-09 · process-v2 Phase 0.1 (lint review round 11, two Lows)
  · (1) the P8 audit had RED-ONLY selftest coverage — a false-red
  regression on a VALID build commit would have slipped through; a
  green assertion now audits a correct packet+boundary commit (the
  claim-derivation rule cuts both ways: a gate's selftest proves it
  fires AND that it does not fire on the legal case); (2) template
  §1a described --post-build looser than the code enforces after
  rounds 9–10 (pinned sha, packet-file-in-changed) — the docs-drift
  swept: the next user would have tried HEAD or a follow-up commit
  and hit a red they were not told about. Both Lows are maintenance
  of earlier folds' own consequences — the round's shape suggests
  the finding stream is converging to mirror-upkeep
- 2026-07-09 · flip-claims review CLOSED by watchdog STOP (the
  user's decision after fold round 10) · the claim enumeration ran
  TEN fold rounds — past the packet-loop's own 8-round cap, which
  this meta-artifact's review never formally carried; the file grew
  189 → ~1180 lines THROUGH the review meant to close it, because
  every fold added claim surface and rounds 7–10 found ONLY
  fold-residue (the folds' own text defects). RULE MINTED: a
  meta-artifact's adversarial review gets a WATCHDOG like any loop —
  termination comes from a rule, never from adversarial reviewers
  "running dry" (they do not: generating a plausible finding is
  cheap; the signal is the CLASS composition of the round, not the
  count). Realness grading over the ~90-finding arc (the user's
  question): ~15–20% reproducible would-have-bitten defects carrying
  most of the value (reopen red-window, coverage owned==realized
  lock at approve, selftest fixture invalidity, wrong-commit audit,
  the FC-B2 trigger list), ~30% code-vs-claim gaps at the threat
  model's edge, ~30–40% map-internal fold-residue concentrated late,
  ~10–15% wording. Catch-point economics: the residual real findings
  surface at the same cost on the LANDED texts (post-flip audit,
  FC-X1) — stopping is not a claim that findings are unreal.
  Sequence from here: Phase 0.2 (coverage gate-point mode) → the
  flip commit → the post-flip audit
- 2026-07-09 · process-v2 Phase 0.2 (the coverage gate-point mode) ·
  check_coverage.py gains `--fold-time`, the APPROVE-TIME gate point
  the flip-claims round-9/10 folds contracted: identical validation
  except the unit-map lock's owned-but-pending direction is skipped
  (an approved-but-unbuilt packet's units are necessarily pending —
  the ch5 boundary precedent), while disposition drift on realized
  entries and realized-without-owner still fire; the default run is
  the BUILD-CLOSE gate point. Three selftest proofs: the exact
  fixture that is red in default mode is green in fold-time, and
  both surviving check directions stay red in fold-time. The FC-F1
  approve-time coverage entry is now RUNNABLE — the last
  precondition before the flip commit
- 2026-07-09 · THE PHASE-1 AUTHORITY FLIP (one commit, §5 item 8) ·
  every authority-bearing edit landed together: ReviewPacket
  restructured into the five-lens panel engine (the pre-v2 dual-mode
  split retired; the preservation contract honored — every pre-flip
  check has a named lens home, the LearnedRules registry is consumed
  per lens); AuthorPacket gained the draft-phase branch, the D1
  classification + sizing steps, the packet_rows discipline, and the
  autonomous loop form; NEW DraftContract workflow +
  contract-draft-template.md (the draft form authority); template §2
  rewritten as an ALIGNMENT (new step 0, panel step 10; steps 1–9
  survive) with §1/§1a completed to the lint claim set; README §5.5
  is now the CANONICAL process authority (autonomy envelope, STOP
  member-token registry, verdict-action matrix, flag-bearing
  definition, finding policy + threat model, tier-0 inventory with
  gate points, standing checkpoints, metrics convention) with
  §1/§4/§5.2/§6/§8 swept to the landed state; AGENTS.md + SKILL.md
  aligned with identical restatements; plan §1.3 predicted-class +
  draft-ref conventions and the §7.7 pre-registered P3/P4
  predictions; the lint and coverage docstring pointers flipped;
  flip-claims.md flipped to its audit-record form. Nothing in flight
  at flip time: P2 built, P3 not started. NEXT: the post-flip audit
  (landed-texts-vs-claims, the arms or the user) BEFORE any packet
  work
- 2026-07-09 · post-flip audit round 1 (five findings, all folded
  same-day) · the audit did exactly what the watchdog decision
  predicted — residuals landed on the REAL texts at fold cost: (1)
  the contract-draft template's skeleton was INVALID under its own
  lint rules (a one-document form showed draft status WITH
  ratification + realized_map blocks — the lifecycle acts now APPEND
  them, the skeleton is the legal draft state); (2) ReviewPacket's
  tier-0 step ran the packet approve-time set on DRAFTS too —
  --forbid-reopened would have redded the legitimate transient state
  during a re-ratification review; the gates now split by target
  kind; (3) the SKILL.md intro kept pre-flip "self-reviews" language
  on the surface FC-H1 named; (4) the never-inferred ratification
  safeguard was compressed out of the AGENTS/SKILL identical
  restatements — mirror restored; (5) trailing whitespace. Classes:
  the two P1s are the NEW surfaces' first contact with their own
  rules — the audit-on-landed-texts catch-point works
