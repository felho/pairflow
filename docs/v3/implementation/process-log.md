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
- 2026-07-09 · post-flip audit round 2 (FC-X1, landed-texts-vs-claims:
  9 mismatches — 8 folded, 1 already folded in round 1) · the audit's
  verdict: the machinery landed on the rows, the mismatches sat in two
  clusters. Cluster 1, the FC-X2 class (ratified rule content alive
  only in the historical doc): the transitional cross-model-arms
  convention was ENTIRELY absent from every landed surface (the arms
  field had no live referent — now in README §5.5 + DraftContract +
  the draft template's arms line); the tier-0 scoping principle, the
  D7 field semantics' second half (doc_refinement/implementation
  units; the pattern-mining surfaces), and the phase-2 expressibility
  obligation joined README §5.5 (the last mirrored in ReviewPacket).
  Cluster 2, preservation/sweep gaps: the checklist-is-a-FLOOR
  meta-rule is now stated at PANEL level (each lens derives checks
  from the target's own claims beyond its duties — without it the
  twin-session class reproduces at panel level); the Case-A
  entailment clause (a new-decision row with no corresponding flag is
  a defect) joined the README flag-bearing paragraph; the packet-side
  mirror direction is stated in template §1a (who wins on a
  PACKET-form mismatch); the SKILL first-of-a-kind label's
  self-contradictory "calibration-stage rule" parenthetical dropped
  (the rule's own text says "regardless"). The SKILL intro (M8) was
  already folded in audit round 1 — the auditor ran against the flip
  commit's bytes
- 2026-07-10 · post-flip audit round 3 (USER, two findings) · (1) the
  SKILL.md Examples ran 1, 2, 4, 3 — the flip's insertion landed
  before the surviving Example 3; reordered. (2) THE SUBSTANTIVE
  CATCH: the v1 Complexity-Risk gate's RISK half (the six scored
  axes — authority / surface spread / identity fragility /
  activation coupling / prerequisite / acceptance multiplicity — the
  numeric thresholds, and the 11-item hard-stop registry) was never
  adopted: the design doc §4 compressed the whole gate into "sizing
  heuristics" with NO recorded disposition for the risk half — a
  silent narrowing of exactly the class this process hunts, found by
  the user reading the v1 sources against the landed texts.
  DISPOSITION (deferred WITH a live revisit anchor, per the process's
  own deferral rule): during calibration every approve is human, so
  the risk half gates AUTONOMY, not correctness (partial live cover:
  the D1 authority/separation/availability trigger + the
  first-of-a-kind rule); pre-building the scoring apparatus now would
  repeat the armor-before-traffic lesson. The anchor: README §5.5 now
  makes a v3-adapted risk assessment a PRECONDITION of
  auto-approve/chaining — the boundary review owns the adaptation,
  and delegation cannot open without it (the v1 later-hardening
  lesson: a deferral without a guaranteed revisit point is a drop)
- 2026-07-10 · AUTONOMY REALIGNMENT (the user's course correction;
  anchor: autonomy-realignment.md, landed against its AL rows) · the
  built system had inverted the original trajectory: v1 delivered
  whole plans autonomously and v3's mission was the missing CONTRACT
  layer, yet "calibration" had become an open-ended
  human-approves-everything stage with GROWING delegation
  preconditions, and the v1 risk axes were misframed as autonomy
  gates when they are write-time SIZING guards. Realigned: flag-free
  approves (zero new-decision rows, zero approve-ratified routes,
  gates green, clean full round) are AUTONOMOUS from ch8 and proceed
  to build — the human sits at chapter ratification, draft
  ratification, STOPs, flag-bearing approves, first-of-a-kind, and
  the ch7 pilot (the last per-packet manual rounds); the v1 risk
  axes + hard-stop combinations are adopted NOW as split triggers
  (template §2 step 0 canonical); measurement moves post-hoc to the
  chapter boundary; chapter-level chaining stays Phase 2. Meta-lesson
  logged with the user's own words: the process-on-process fix-all
  dynamic re-inverted the goal one clause at a time — each
  precondition locally justified, cumulatively moving autonomy from
  DEFAULT to distant privilege. Process work STOPS here; the next
  act is the P3 pilot
- 2026-07-10 · realignment round 2 (the user's instruction + two arm
  reviews; anchor addendum AL-7..AL-9) · the v1 risk gate now lands
  SELF-CONTAINED in template §2 step 0 — all SIX axes (identity/join
  fragility restored: v3 has cross-store joins), all ELEVEN hard
  stops translated, the escalation combos, the consume-family scan,
  the implementation-closure proof ("shared invariant coherence is
  NOT sufficient"), the split shapes, and the MATERIALIZED
  `## Sizing/risk` record; the only v1 element not carried is the
  numeric scoring wrapper (reason recorded in the anchor). The v1
  ReviewSpec §2a rhythm returns in ReviewPacket: the Mandatory Output
  Audit (missing output → refine ADDS it; round 1 materializes, the
  next round assesses; detail budget N/A/compact/full) and the
  split-is-NOT-advisory rule (a hard-stop combination defaults the
  verdict to split — "somewhat ambitious but fine" is not a legal
  assessment, the v1 LLM-bias this rule existed for). Round-1 arm
  consequences swept: the two P1 approve-owner surfaces (ReviewPacket
  verdict text, template step 10), README §8's tail, the ramp-stage
  definitions restored to §5.5 (calibration closed with ch7;
  measurement = ch8+ autonomy with post-hoc audit; chaining = the
  pairflow stage — plan §1.3 and the template header enum stay
  meaningful), the rollout "Phase 2" renamed the chaining stage, the
  threshold name de-staged, the matrix wording aligned literally
- 2026-07-10 · realignment round 3 (two arm reviews on round 2;
  anchor addendum AL-10..AL-12) · the round-2 "only element not
  carried" claim was an overstatement — the v1 gate's TAIL had
  silently stayed behind; corrected by carrying it: the
  milestone-gated rule (document now / activate later / fail-closed
  meanwhile) and the three conditional RECORD annexes
  (closure-budget triage, proof-boundary triage, mutable-flow
  record) land in template §2 step 0, making the round-2 sentence
  true. One v3 adaptation DECISION recorded for veto: testkit counts
  as a surface (and toward family-count stops 6/7) only when its
  CONTRACT changes — tests exercising a change never count, or hard
  stop 2 trips on every routine kernel packet (the ch7-P1
  retro-check falsified the unqualified rule against a ratified-good
  packet). The escalation combos restated in COUNTS (the uncarried
  0|1|2 scale is never the referent; the two hard-stop-2 overlaps
  marked as carried-for-self-containment). The Mandatory Output
  Audit split per target kind — packet outputs were a false
  refine-blocker on draft reviews; drafts audit their own semantic
  remainder (Control-Model answers, probe-or-source rows, seed-row
  disposition). Small sweeps: Gate Coverage Matrix renumbered §2a;
  the canon's threshold name caught up with its mirror
  ("permissive"); the "(the Phase-2 pairflow integration)" bridge
  parenthetical deleted. Lesson: a completeness CLAIM ("only X not
  carried") is itself an auditable output — round 2 shipped it
  unaudited; the arms' tail-diff is the check that should precede
  the claim, not follow it.
- 2026-07-10 · realignment round 4 (one arm review on round 3;
  anchor addendum AL-13..AL-15) · the completeness lesson RECURSED:
  round 3's own "only element" claim missed two v1 elements — the
  external/integration scan role (not empty in v3: the kernel's
  dispatch/egress surface — deriveDispatchIntent, ports/egress, the
  fake egress adapter) is now carried; the workflow/orchestration
  role stays out WITH its reason (the v3 kernel IS the orchestrator;
  a separate role would double-count the execution-consumer role);
  the v1 "For Plans" tail carried as the chapter-cut sentence (the
  gate informs the plan §N.7 packet cut; no numeric score persisted
  — only the split/dependency shape). Structural fix: the
  completeness claim changes FORM — a universal negative becomes a
  CLOSED exclusion list with reasons; a future gap falsifies the
  list, not an adverb. AL-11's retro-example corrected on
  verification: ch7-P1 itself INTRODUCED the recording sink, so
  under the narrowed rule it TRIPS hard stop 2 and continues with
  closure proof — the template line now shows P1 on that branch
  (the gate's intended shape) instead of implying an exemption the
  rule's letter contradicts. The "substrate-resting row" coinage got
  its definition pointer (DraftContract §1.2).
- 2026-07-10 · realignment round 5 (two arm reviews on round 4;
  anchor addendum AL-16..AL-17) · the completeness claim's THIRD
  falsification was positional, not substantive: AL-14's closed
  exclusion list existed in the anchor while the CANON still said
  "carried in full; the one element" — the drift the form-change was
  built to catch had not reached the authority surface. Template §2
  step 0's intro now carries the closed two-element list with both
  reasons inline (numeric scoring wrapper; workflow/orchestration
  scan role — the kernel IS the orchestrator, a separate role would
  double-count execution-consumer). And a reference-class retirement
  beyond the flagged instance (family-sweep-at-the-sink): "§N.7" is
  not a convention — the packets table's number wanders by chapter
  (4.8/5.8/6.7/7.7), so a literal resolution breaks exactly where
  autonomy opens (ch8+, no human resolving the reference); all eight
  live occurrences across six surfaces switched to the genre name
  "the chapter's Packets-and-flow-mode table", with one
  resolve-by-heading note at the operational resolver (AuthorPacket
  step 2). Lesson: an anchor row is not DONE until the canon says it
  — the anchor captures intent, the authority surface carries it.
- 2026-07-10 · realignment round 6 (two arm reviews on round 5;
  anchor addendum AL-18..AL-20) · the FOURTH completeness
  falsification was a SCOPE error: the round-5 sweep grepped the
  edited-file list, not the defined live set — plan.md's
  predicted-class convention paragraph (the highest-authority
  surface, exactly the ch8+ zone) carried three more §N.7 mentions.
  Folded: the plan paragraph switches to the genre name
  (propagation-class — AL-17's naming decision applied, visible
  in-paragraph marker), and states the forward heading convention
  (ch8+ section heading exactly `Packets and flow mode`; resolvers
  match the heading, never the number — AL-19, flagged for veto);
  the AuthorPacket resolver hardens to "heading STARTS WITH
  `Packets`" against the legacy variants. RULE MINTED (AL-20, the
  meta-remark's fourth recurrence): a completeness/sweep claim is
  admissible only WITH its measurement — defined scope + the command
  output; enumeration from memory is not a measurement (README §5.5
  finding-policy). Arm-2's two flip-claims findings: substance
  already carried by the live authority (README §4 step 8
  build-close tier-0; the matrix's approve-time wording;
  ReviewPacket's clean = zero fold-now AND zero STOP-class) —
  disposition resolved-in-live-authority; the flagged files are
  FC-X2 history and stay unedited (the two arms' apparent conflict
  reconciled: the history rule wins the edit question).
- 2026-07-10 · REALIGNMENT RATIFIED · the user's explicit "approve"
  on the landed state at a2673f6d closes the autonomy-realignment
  thread (anchor: autonomy-realignment.md, AL-1..AL-20 across six
  review rounds; the two flagged adaptation decisions — AL-11
  testkit-contract narrowing, AL-19 ch8+ heading convention — stand
  approved). Series shape for the record: each round = anchor
  addendum commit (capture intent first) + fold commit (satisfy
  exactly those rows), the user's arms diffing the fold against the
  addendum; finding classes converged content → fold-residue →
  propagation/hygiene, the loop-until-dry signal. Durable mints
  beyond the gate itself: the measurement rule (completeness claims
  carry their scope + command output), closed exclusion lists over
  "only X" claims, "an anchor row is not DONE until the canon says
  it". PROCESS WORK STOPS HERE (drift point 3) — the next act is the
  ch7-P3 pilot: the first packet through the v2 system,
  human-approved (first-of-a-kind), plan §7.7 predictions
  pre-registered. Parallel open thread: the ch7-P2 aftermath (user
  code findings + the retroactive partial-baseline packet_metrics).
- 2026-07-10 · ch 7 (P2 retroactive partial-baseline metrics) · the
  transition convention executed: the P2 packet gains its
  packet_metrics block retroactively, template §1 FORM on a
  pre-v2/grandfathered packet (the v2 marker machine block stays
  intentionally absent — the block does NOT promote the packet).
  Partial-baseline semantics: absent-with-reason over false-precision
  — prediction ABSENT (pre-registration postdates ch7; never
  retro-filled), provenance ABSENT (no manifest pre-v2), stops empty
  (the registry postdates the flow); every absence's reason lives in
  baseline_note, the only legal home. rounds.review = 14 per the
  build record — the mid-flight "8" (the rounds-1–8 retro, quoted by
  two later plans) was a snapshot, not the total: the packet's own
  build-close record is the authoritative count. detector_misses
  seeds with the one recorded escape (the emit-gate aftermath,
  found_at code-review, why_missed: only the throwing type-lie was
  driven; no lens demanded emit/read gate symmetry); the USER's
  post-build code-review findings — announced 2026-07-09, never yet
  delivered into a session — increment the block on arrival per the
  README late-discovery rule (process-log line + increment). The
  aftermath thread's remaining open half is exactly that delivery.
- 2026-07-10 · ch 7 (P2 aftermath thread CLOSED) · the findings half
  closes as SET-ASIDE by the user's call: the post-build code-review
  findings announced 2026-07-09 came from several different sessions
  and are not retroactively reconstructible — no pending fold; the
  P2 baseline_note updated to say so (no dangling "expected source").
  ROUTED boundary-review (revisit: the ch7 chapter-close log review):
  the user's raised question — should cross-session review findings
  get a durable storage/delivery convention so they cannot be lost
  between sessions? Context for the revisit: the v2 regime already
  closes the in-session loss channel (panel findings fold
  immediately, routes are recorded in the packet), so the residual
  gap is exactly USER-side findings born OUTSIDE the packet session
  — today's loss is the concrete evidence the decision can weigh.
- 2026-07-10 · ch7-P3 authoring (the pilot's first v2 packet): the
  header manifest tally was written from MEMORY and was wrong
  (claimed 27/13/0 = 40 rows; machine count 26/15/0 = 41) — all five
  round-1 lenses caught it independently. The AL-20 measurement rule
  applies to a packet's OWN tallies (compute from the block, never
  recall); the lint's tally cross-lock binds only at close
  (packet_metrics), so a fold-time prose-tally check is a candidate
  lint extension for the boundary review.
- 2026-07-10 · ch7-P3 round 1: the D1 detector chain WORKED at its
  first live trial — the lens-2 entailment attack reclassified X1
  (the interim CLI reader token) derived→new-decision, tripping the
  Case-B semantic trigger → STOP 1:late-b-signal raised instead of a
  laundered decision; a second STOP 2:contested-ratified-vs-reality
  surfaced on plan §7.4's errorName-vs-wide-free-text-claim tension
  (both sentences ratified; reality contradicts their conjunction).
  Both STOPs presented at the pilot's human decision point.
- 2026-07-10 · ch7-P3 STOP verdicts (the user's, one session): STOP 1
  → (a) the open_failed interim mapping stands, approve-ratified;
  STOP 2 → the user's OWN hybrid — stated exception PLUS a
  64-character prefix cap on the projected errorName (J10, the
  packet's second new-decision row, minted honestly rather than
  absorbed). Note for the pilot record: the human decision point
  produced a design improvement neither panel option carried — the
  cap idea came from the user, which is exactly the intent-injection
  value the STOP class exists to preserve.
- 2026-07-10 · ch7-P3 rounds 2-3: a route-class gap surfaced — the
  STOP-verdict decision flags carry "Route: approve-ratified", a
  token outside the template §1 route enum (fold-now /
  boundary-review / later-chapter / declined). The class is real
  (a decision the pilot's approve act ratifies); the enum should
  gain it at the boundary review (capture, don't fix — no
  mid-chapter template edit).
- 2026-07-10 · ch7-P3 pilot COST PROFILE (captured at the user's
  sustainability stop): the packet reached its clean round in FIVE
  full 5-lens panel rounds + one fresh-eyes propagation pass (26
  fresh-context subagents, ~3.4M subagent tokens, ~1h wall-clock)
  for ONE packet's authoring review. Value curve: round 1 caught the
  2 STOPs + structural contract gaps (high); round 2 real but
  smaller contract holes (medium); rounds 3-4 symmetry/mirror
  residues incl. the author's own fold propagation miss (low);
  round 5 pure confirmation, zero findings (~600K tokens). The cost
  driver is the "any fold voids all prior rounds → full 5-lens
  re-run" rule interacting with fix-all: one-clause mirror-sync
  folds repeatedly forced full re-panels. The user declared the
  mode unsustainable; evaluation held IN-SESSION before the pilot
  approve — candidate remedies routed to the boundary review
  (two-tier fold rule: mirror-only folds re-verified by ONE
  propagation pass, canonical folds still void; a write-time
  site×shape coverage-grid template section to front-load symmetry
  findings; a "clean = zero CONTENT findings" definition with
  bookkeeping batched; cheaper/narrower confirmation rounds).
- 2026-07-10 · SUSTAINABILITY PACKAGE RATIFIED (the user's explicit
  agreement, in-session — a blocking in-chapter process fix per
  README §7's exception): (1) panel re-run scoping — the v1
  targeted_lane_review discipline ported from ExecutePairflowPlan
  Delegation-Gates ReviewSpec Hard Stop 8-11 (first pass full;
  content folds → targeted re-run with mandatory full-escalation
  triggers; bookkeeping folds → one reconciliation pass, no round
  void; clean = zero CONTENT findings); (2) write-time
  site×shape×phase coverage grid + combination-lane heuristic
  (template §2); (3) model tiering — full/first-pass panels on
  OPUS-class (the user: Fable-class is unaffordable for
  business-as-usual via API, reserved for exceptional one-off
  planning), targeted/reconciliation/confirm on SONNET-class;
  (4) the approve-ratified route class joins the template §1 enum +
  the README route table. Landed on: README §5.5, template §1+§2,
  ReviewPacket.md §5 + report block, AuthorPacket.md step 9. The
  "no lighter mode" sentence re-scoped (one review DEFINITION;
  scoped re-runs are not a lighter mode) — the D4 decision
  clarified, not reversed. First live subject: ch7-P4.
- 2026-07-10 · the sustainability package took a cross-model arms
  findings round PRE-COMMIT (the user's two arms, 8 consolidated
  findings, all folded): the approve-ratified route re-seated as a
  decision-record MARKER (the "ONLY for ownership misfit" intro was
  falsified by its own table; ReviewPacket §3 mirror gained the
  class); the two-hash model minted (full-round CONTENT hash +
  Reconciled basis hash — "any later edit voids" scoped to content);
  the coverage-matrix schema gained the skipped(proven-unaffected)
  state (targeted rounds only, never satisfies the approve gate);
  FULL ⇒ Opus pinned (the undefined "confirm pass" class removed —
  the closing confirmatory full round is Opus-class); the grid got
  its review-side anchor (Mandatory Output Audit packet list);
  AuthorPacket 9.3(c) gained the content-hit EXIT; reconciliation
  churn capped (3 non-clean passes → targeted round); the §5 heading
  un-wrapped; the Re-run mode line joined the report validity gate
  with ACTUAL model ids recorded. SKILL.md's stale void-example
  fixed (CONTENT fold qualifier).
- 2026-07-10 · ch7-P3 APPROVED — the user's explicit "approve" on
  sha256 fd6fee2af8e3546620ef34193539cb2544381ff503d4e6db9012061cb60a2d80
  (the round-5 clean bytes: all five lenses CLEAN, every approve-time
  tier-0 gate green). The STOP-4 flagged-approve act RATIFIES the
  packet's approve-ratified routes: flag 1 (X1 new-decision — the
  interim open_failed mapping; the STOP-1 verdict formalized), flag 4
  (J10 new-decision — the errorName stated exception + 64-code-unit
  prefix cap; the STOP-2 verdict formalized), flag 2 (the bundle's
  succeed-anyway direction), flag 3 (the ch6-P3 schema-row
  supersession), flag 5 (the two P4 forward obligations). Pilot
  bookkeeping: 5 full panel rounds + 1 propagation pass to the clean
  round; 2 STOPs raised and human-resolved; 2 new-decision rows
  carried honestly. The BUILD proceeds in a FRESH session (the
  packet's self-containment is the pilot's own test — no session
  memory assumed): README §4 steps 1-8, one commit (packet + code +
  tests + the flag-4 aligned plan edit + the packet-work log lines),
  then the post-build audit; the approve note and packet_metrics
  land in the Build record at close.
- 2026-07-10 · ch7-P3 build choreography friction (caught at commit
  planning, BEFORE the build commit): the approve record above
  prescribes "one commit (… + the packet-work log lines)", but the
  post-build audit binds the build commit's changed files to the
  declared mutation_boundary ∪ packet — process-log.md is not in the
  boundary, so log lines riding the build commit would have turned
  the audit red. Resolved: the log lines land in their own docs(v3)
  commits around the build (the approve-session lines before it, this
  session's lines after). Boundary-review candidate: either the audit
  gains a standard allowance for the process log, or the build
  choreography prose names the separate-commit shape (capture, don't
  fix — no mid-chapter tool/template edit).
- 2026-07-10 · ch7-P3 BUILT (2e26921d — the pilot's fresh-session
  build): README §4 ran clean end-to-end — 323→380 tests, all v3
  bridges + the post-build boundary audit green, self-containment
  held (repo surfaces sufficed). Two mechanical in-build rounds only
  (a test-fixture staging-schedule bug caught by its own red; a
  no-useless-assignment dead cursor advance on the stop path), ZERO
  behavioral surprises — the review-ahead-of-build economics
  observed at ch7-P1 repeats at the first v2-form packet.
- 2026-07-10 · ch7-P3 aftermath (the user's post-build review, fixed
  same day): the floor→diag lint ban proved LESS than its claim — the
  import rules check import DECLARATIONS only, so a dynamic
  `await import("../diag/…")` value import in a floor file stayed
  lint-green (reproduced in-repo before fixing; no production
  violation existed — the hole was the guardrail's, not the
  boundary's). Fix: a no-restricted-syntax ImportExpression ban in
  the same floor block; probe set EXECUTED: dynamic red / static
  re-probed red / type-position fires neither boundary rule /
  ports/diagnostics.js over-match probed green (the /diag/ path
  SEGMENT is the regex). LESSON — the claim-negatives class recurring
  at the LINT layer: the probes were derived from the implemented
  rule FORM (a static import declaration), not from the claim's
  dimensions (import FORMS: static / dynamic / re-export); when
  mechanizing a prose rule, enumerate the forms FIRST, then derive
  one probe per form. Boundary-review candidate: the config's OTHER
  import bans (the production testkit/drift ban, the kernel
  allowlist) share the static-only limitation — a config-wide
  dynamic-form sweep is ONE reviewed decision, not per-packet
  patches.
- 2026-07-10 · ch7-P4 round-1 model-tier visibility friction (the
  user's live catch, verified before logging): the operator flagged
  the five FULL-round panel lenses as apparently running on a
  Fable-class model. Transcript verification (the per-agent JSONL's
  `model` field) showed all five ON `claude-opus-4-8` — the
  Agent-launch override took effect; what the surface showed was the
  SESSION model (the orchestrating loop runs on Fable — authoring and
  aggregation, not a lens pass), which the tiering rule does not
  govern. The friction is real regardless of the false alarm: the
  per-lens model tier is INVISIBLE at launch surfaces — only the
  transcript carries it — so the ReviewPacket report's "ACTUAL model
  id per pass" line is the ONLY conformance record, and this round
  adds the mid-run form of the check (grep the agent transcript's
  first `model` field) rather than trusting the launch parameter. The
  rule restated for the record: every FULL round's lenses run
  Opus-class; Fable-class is never business-as-usual packet review
  (README §5.5). Boundary-review candidate: whether the panel report
  should ALWAYS carry the transcript-verified model id (measured, not
  echoed from the launch call) — this round already records it that
  way.
- 2026-07-10 · ch7-P4 round-1 route-token generalization (lens-2
  watchpoint, routed boundary-review): the template defines
  `approve-ratified` as marking a STOP-VERDICT decision whose
  ratification point is the approve act; ch7-P4's F2 (the tail
  cursor-surface pick) is the first below-Case-B new-decision row —
  no STOP fires, yet the row rides as a flag to the human approve
  whose act ratifies it, which is exactly the token's semantics minus
  the STOP provenance. The packet applies the token WITH a stated
  generalization note (flag 1). Boundary-review question: broaden the
  template's token definition to "a decision whose ratification point
  IS the approve act (STOP-verdict or below-Case-B new-decision)", or
  mint a sibling token. Capture, don't fix — no mid-chapter template
  edit.
- 2026-07-10 · ch7-P4 round-2 forward note (lens-5 watchpoint, routed
  boundary-review): the derived diag-path rule (`<db>.diag.sqlite`)
  and the diag-handle helper land in `cli/common.ts`; ch9's
  runner/adapter emission points (§7.1 named-deferred) live in a
  NON-CLI composition root that cannot import `cli/` — ch9 will
  re-derive the one-string append or the helper moves to a shared
  home then. Not a P4 defect (ch9 is out of scope); recorded so the
  chapter boundary sees the reuse seam before ch9 ratification.
- 2026-07-10 · ch7-P4 APPROVED — the user's explicit approve
  ("egyet értek az expose-zal, mehet") on the reconciled basis sha256
  b18f4c4ee470f35daa027af812b5b8de17ee862502c7556f7b257d6f7b3185b5
  (two-hash model: the clean R2 FULL round bound content hash
  02ddc1988ca002da0357c1e5ebe07bcc565bc358a4b06d73b8b26d96e59c7549;
  one bookkeeping fold + clean Sonnet reconciliation produced the
  reconciled basis). The STOP-4 flagged-approve act RATIFIES: flag 1
  (F2 — the exposed `--from-ordinal` cursor, default 0,
  `--diag`-coupled; AND the approve-ratified route-token
  generalization to a below-Case-B new-decision, its first
  application), flags 2–4 (read-verb file creation per O1; the X1
  interim replacement; the P3 flag-5 discharge record). Panel
  bookkeeping: 2 FULL rounds (R1 refine — 1 content + bookkeeping
  batch; R2 clean) + 1 clean reconciliation pass; all ten FULL-round
  lenses transcript-verified claude-opus-4-8, the reconciliation
  claude-sonnet-5. The build proceeds in THIS session per README §4
  steps 1–8: one commit (packet + code + tests), post-build audit;
  the log lines land in their own docs commits around the build (the
  P3 choreography).
- 2026-07-10 · ch7-P4 BUILT (3cec0969 — same-session build after the
  flagged approve): README §4 ran clean end-to-end — 380→398 tests
  (+18 net; 20 new `it` bodies, the two X1 interim lanes replaced),
  all v3 bridges + the post-build boundary audit green (changed files
  exactly the 7-file mutation_boundary + the packet). ONE mechanical
  in-build round (a dead `withStore` import in dev/main.ts caught by
  v3:lint — the same dead-import class the packet's diag/index.ts
  note predicted; both predicted dead imports there were real), ZERO
  behavioral surprises: typecheck and every CLI test green on the
  first run — review-ahead-of-build holds at the second v2 packet
  with the scoped panel (2 FULL rounds + 1 reconciliation vs the
  pilot's 5). ch7 is now packet-complete: the chapter CLOSE (README
  §6 DoD — full ci:local, map-row + PI-4 flip, boundary review incl.
  the CreateTaskPacket first-run verdict and this chapter's routed
  boundary-review items) is the next step, on the user's go.
- 2026-07-10 · ch7-P4 process miss (the user's catch, post-build): the
  pilot's flagged approve and the build ran BACK-TO-BACK in one turn —
  the transitional cross-model arm (README §5.5: the USER's manual
  external review plays phase 2 until doc-bubbles arrive) never got
  its window; at P3 the approve verdict and the build sat in separate
  turns/sessions, which is what left the arm room. The external
  review ran POST-build and returned four findings — (1) the diag
  handle close() contract gap (the healthy branch's close is
  unguarded while the born-unavailable release already swallows: a
  close-throw in a verb's finally could flip a successful outcome,
  against REV-DIAG-FAILOPEN's character), (2) the F2 "--from stays
  valid with --diag / both cursors" claim carries no driven resume
  COMBINATION lane, (3) the F1 "--diag rejected on every other verb"
  claim leans on the generic --nope regression, no representative
  negative, (4) the acceptance REV-C line says "read-only" while
  flag 2 declares the O1 file-creation side effect — wording. All
  four folded as ch7-P4 aftermath (packet claim surface first, the
  fix round follows). Boundary-review candidate: an explicit
  "external arm ran / explicitly waived" checkpoint between a
  flagged approve and build start.
- 2026-07-10 · ch7-P4 aftermath round 2 (the external arm's second
  pass): three packet-coherence findings on the round-1 aftermath
  fold itself — the store-suite acceptance lane referenced files
  missing from the Edited list / mutation_boundary; the Sizing/risk
  closure-budget "N/A" went stale against the aftermath-born
  shared-contract close extension; packet_metrics.discovered lacked
  the P3-precedent baseline_note nuance. All three folded. LESSON:
  the round-1 aftermath fold ran WITHOUT a reconciliation pass — the
  panel discipline (every fold gets its lens-4 delta reconciliation)
  applies to AFTERMATH folds too, and skipping it reproduced exactly
  the propagation class the panel's reconciliation exists to catch.
  This round closes with a reconciliation pass over both aftermath
  deltas. Boundary-review candidate: state the aftermath-fold
  reconciliation obligation explicitly in README §4 step 8 or the
  skill's aftermath handling.
- 2026-07-10 · ch 7 boundary · review HELD, the package RATIFIED by
  the user ("mehet a zárás"). Verdicts: (1) CreateTaskPacket
  first-run VALIDATED — four packets through the skill, round count
  P3 pilot 5 → P4 2 + reconciliation, two builds with zero
  behavioral surprises, the next-step derivation and the D1 detector
  worked live; the skill is the standing authoring path. (2) README
  §4 gains the aftermath rules (an aftermath fold IS a fold — the
  reconciliation pass is mandatory; the log-lines/fix(v3) commit
  choreography; aftermath-scoped boundary extension audited at its
  own sha) and §5.5 the EXTERNAL-ARM CHECKPOINT (flagged approve →
  build only after the arm ran or an explicit waive). (3) Template §1
  + README §5.5 + ReviewPacket: `approve-ratified` GENERALIZED (a
  resolved STOP verdict OR a below-Case-B new-decision riding to a
  human approve — the ch7-P4 F2 precedent). (4) ReviewPacket: the
  models line is TRANSCRIPT-VERIFIED; lens-1 gains the
  own-contract-character frame rule (the P4 close-miss lesson). (5)
  LearnedRules += R-DELEGATION-CLOSURE, R-FLAGS-IN-PACKET,
  R-CLAIM-FORM-PROBES; R-RAW-FIXTURES stays WATCH (no second
  occurrence). (6) Deferred to the ch8 opening as fix commits: the
  config-wide dynamic-form sweep of the remaining import bans; the
  fold-time prose-tally lint check. (7) Cross-session findings
  convention ADOPTED (README §7): capture-time dated log entries,
  the packet Aftermath as the durable home on immediate folds — the
  P2 set-aside loss is the counter-evidence. (8) The ch9 derivation
  seam rides to the ch9 ratification agenda. Conscious NON-ISSUES:
  the P1 round count and the P3 cost profile (remedied mid-chapter
  by the ratified sustainability package — P4's 2 rounds are the
  evidence it holds); the P2 contested readonly-WAL probe (the
  contested-probe corollary covered it); the "rule change mints
  lanes" and cross-attempt combination classes (subsumed by the
  adopted grid + combination-lane disciplines); the ch6→7
  skill-ification findings (fixed same day, class covered); the
  process-v2/realignment threads (closed by their own
  ratifications). Chapter totals: 217 → 401 v3 tests, 10 → 11 ADRs
  (ADR-010 accepted), units 5/158 / invariants 8/116 / traces 2/20
  unchanged (empty slices by design — the channel is memo-born
  operability); the full ci:local gate GREEN at the close; the
  calibration stage CLOSES with this boundary — ch8 opens at
  measurement (autonomous flag-free approves with the post-hoc
  boundary audit), and ch8 ratification is the next act, on the
  user's explicit go.
- 2026-07-10 · ch8 opening · both boundary-deferred fixes LANDED as
  their own fix commits before the ratification proposal: c95ebd8a
  (config-wide dynamic-form import-ban sweep — every remaining static
  ban gained its ImportExpression twin; 20/20 executed probes incl.
  preserved-selector re-reds and the dev-CLI exemption green) and
  ea6cbde2 (fold-time prose-tally cross-lock P9 in check_packet.py +
  the template §1 twin rule line; 78 selftest dims, live packets
  green). The deferral trail from the ch7 boundary review item (6) is
  closed; the ch8 ratification proposal is the next act.
- 2026-07-10 · ch8 draft phase · REVIEW-ECONOMICS COURSE DIRECTION
  (the user's, stated at the draft STOP; capture-don't-fix — the
  text amendment's landing point is a pending decision): the D4
  "approve requires one FULL clean panel round" floor is a
  v2-ORIGINAL strengthening, NOT part of the ported v1 discipline —
  Delegation-Gates 8-11 verified: v1 = full FIRST pass, targeted
  refinement reruns, close = ONE top-level reconciliation decision
  (no closing full fan-out). The v1 shape sufficed because the
  creation phase sat in a LAYERED defense (doc-refinement bubble
  after task create); v2's creation phase has the same layering (doc
  refinement later + the user's manual adversarial model checks —
  which just live-caught a panel misclassification the closing full
  rounds did not). Direction stated: the CREATION phase reverts to
  the v1 shape — first round always FULL on an Opus-class model
  (the original tiering constraint was "not Fable", not
  "Opus everywhere"), targeted reruns after folds, close = top-level
  reconciliation over the final hash, full fan-out only on the
  escalation triggers; model-effectiveness experiments later. Run
  data supporting it: 8/8 FULL Opus rounds (the collapse choice),
  the two closing confirmatory rounds found ZERO, and every
  round-4-6 find came from lenses the targeted set would have
  included; ~40 Opus lens runs ≈ 4.3M subagent tokens for one draft.
- 2026-07-10 · ch8 draft phase · REVIEW-ECONOMICS AMENDMENT LANDED
  (user-ratified, "mehet" on the discussed shape): README §5.5 (the
  canonical home) + ReviewPacket §1/§2a/§4/§5 + AuthorPacket §9 +
  template §2 review-tie edited in ONE act. Content: (1) the CLOSE
  reverts to the v1 shape — first round FULL, targeted re-runs after
  content folds, approve = a clean top-level reconciliation decision
  over the FINAL content hash (fresh-context, fed the delta history
  + recorded lens outputs); a closing full fan-out only when an
  escalation trigger fired on the last fold — the D4 strengthening
  is RETIRED (rationale: layered defense — doc refinement + the
  user's external arms sit behind the creation phase; the retiring
  run measured two zero-yield closing full rounds). (2) EXTERNAL-ARM
  folds = ordinary folds: finder-lane rerun = the arm's own re-check
  CITING THE NEW HASH, plus the mandatory delta-scoped
  reconciliation; escalation triggers unchanged. (3) MODEL POLICY:
  every panel pass Opus-class; the full⇒Opus/targeted⇒Sonnet tiering
  retired (model-effectiveness experiments = a later explicit act);
  the Fable ban stands. process-v2-design.md D4 stays untouched as
  the historical record — README §5.5 carries the amendment.

- 2026-07-11 · ch8-P1 authoring + approve · the FIRST measurement-stage
  packet ran the full creation loop: R1 full panel (6 fold-now: the
  fs-errno substrate record, the validate→store combination lane, the
  dim-4 reference-integrity enumeration, the -0 raw lane, the S2
  mirror-map row, the path-presence scoping three lenses converged
  on) → content fold → R2 targeted CLEAN → close₁. Then the
  user-requested EXTERNAL ARM ran PRE-approve (agent-invoked `codex
  exec`, find + hash-citing re-check — the first pre-approve arm
  window; ch7-P4's arm only got post-build): verdict `refine` with
  TWO substance catches twelve Opus lens passes had cleared — S1's
  "no out-of-directory access by construction" overclaim (a planted
  SYMLINK is a byte-exact listing match and readFile follows it out;
  the arm PROBED instead of judging the ref-axis argument) and the
  "non-integer version resolves null" example (a matching x@1.5.yaml
  file loads and takes a TYPED rejection). Folded as a claim
  NARROWING + symlink non-claim (operator-trusted content, the §5.5
  threat model — no lstat rule minted) + the no-prevalidation twin
  lane; arm re-check cleared, close₂ clean on 00ba6643. The STOP-4
  flagged approve (2026-07-11) ratified flag 1 (E6 echo adoption).
  Diminishing-returns cutoff honored: 2 arm rounds, stop.
- 2026-07-11 · ch8-P1 friction (flag 2) · PREDICTION/DISCOVERY
  MISMATCH: plan §8.9 predicted `invention` (memo-born, recorded at
  ratification BEFORE the draft phase ran); authoring discovered
  `projection` (36/3/1 — the ratified draft absorbed the memo-born
  decisions). Boundary-review question: does the predicted class bind
  the SURFACE's genesis or the packet-time manifest? Draft-phased
  chapters make the two systematically diverge.
  → ADOPTED at the ch8 boundary (user, 2026-07-11): the packet-time
  manifest — refined through the user's two-invention-type analysis
  (structural invention absorbed by a declared prerequisite artifact
  is the DRAFT's; the prediction forecasts the packet's RESIDUAL
  ad-hoc decision content, i.e. the approve path). Codified in plan
  §1.3 as three elements: residual-content binding; mandatory basis
  note (a pending-draft basis = visibly conditional prediction; enum
  stays two-valued — no tooling change); prediction/flow-mode
  consistency. The P1 packet file stays untouched (dated record —
  the mismatch is history).
- 2026-07-11 · ch8-P1 friction (metrics enum) · the
  `detector_misses[].found_at` closed enum (approve /
  architecture-review / code-review / implementation / refinement)
  PREDATES the pre-approve external-arm lane — `approve` used as the
  nearest member, the arm named in the entry text. Boundary-review
  candidate: an `external-arm` enum member.
  → ADOPTED at the ch8 boundary (user, 2026-07-11), gate-resolved:
  TWO members — `arm-approve` (gate 1, the approve-bytes review) and
  `arm-build-close` (gate 2, the implementation review) — join
  FOUND_AT_VALUES in check_packet.py (the §5.5 arm-yield evaluation
  is per gate class; a single `external-arm` member would push the
  gate split back into text parsing). Existing entries stay as dated
  nearest-member records — no re-labeling; the members bind from the
  next packet on.
- 2026-07-11 · ch8-P1 build · FIRST-EXECUTION GREEN on every
  yaml-substrate lane (the G gates, class-major + directive-heads
  ordering, the toJS guard, the cycle non-throw, the version
  node-inspection ladder): a ratified draft's probe record TRANSFERS
  to code with zero behavioral surprises — the strongest evidence yet
  for the draft-phase→packet pipeline. Mechanical residue only (4
  readonly casts, 1 optional chain, 2 auto-fixed assertions, 1 NBSP
  escape). Test-estimate counting: 401 → 515 (+114 vs "~55") — the
  INVERSE of ch7-P4's over-count: parametrized lanes expand to
  per-form `it` bodies; the estimating convention still has no stable
  unit.

- 2026-07-11 · ch8-P1 implementation arm (post-build, user-requested)
  · THREE rounds, each earning its keep before the diminishing-returns
  stop: R1 (verdict refine on 50f6d7af) caught the V15 CYCLE
  SHORT-CIRCUIT — the build had generalized container-suppression to
  the cycle precondition, hiding every co-present structural finding
  (E2/C21 violation; the arm PROBED a cycle+defects combination the
  suite lacked) — plus three watchpoints (toJSON shape leak, the
  partial V5 grid, the V11 role-grammar cascade). R2 (the finder-lane
  re-check on the fold, 53fb8913) caught the fold's OWN regression:
  with accumulation the walk runs on cyclic graphs, and
  JSON.stringify at arbitrary-value message sites threw on a cyclic
  scalar-slot value — the "fix scoped to the finding just caught"
  class, live twice in one packet. R3 (scoped, 077f9ee9): zero
  findings, its own cyclic map+list probes green in all four slots.
  Aftermath commits 53fb8913 + 077f9ee9, audits green at their own
  shas, reconciliation passes ran pre-commit both rounds (the ch7-P4
  skip lesson held). 515 → 534 tests. Boundary-review material: the
  arm caught TWO real defects post-build that the in-session build
  loop missed — the post-build arm leg is earning standing-leg
  status; and the walk-invariant lesson (a suppression removal
  changes what inputs downstream code sees — re-derive EVERY site's
  safety under the new invariant, not just the named one).

- 2026-07-11 · integration/e2e process thread (user-raised, ratified
  "ok, mehet") · MEASURED baseline first: cross-module integration
  ALREADY runs (the 4 root trace/worker tests; the CLI suites on real
  wiring + real SQLite; 3 shipped-entrypoint subprocess smokes), but
  NO full operator JOURNEY exists — the "end" of end-to-end (an
  operator-authored input artifact) is born at ch8-P2. Decisions:
  (1) RATIFIED, landed in the plan §8.9 P2 row: P2 carries the
  repo's first full-lifecycle journey smoke (file → start → events →
  terminal → floor reads, through the shipped CLI process).
  (2) BOUNDARY-REVIEW candidate: a standing rule — every ACTIVATION
  packet (one that wires previously-built foundation into a live
  path) ships at least one journey smoke through the real entrypoint;
  the test-side twin of the foundation→activation split.
  → ADOPTED at the ch8 boundary (user, 2026-07-11) WITH the
  determinism clause (user-raised): journeys run with DETERMINISTIC
  actors — a stub bound through the SHIPPED actor-config surface is
  legal (the production actor IS a spawned command; the stub is
  configuration, not test machinery), an injected seam is not;
  real-LLM runs are a SEPARATE non-CI tier. Home: template §2
  write-time disciplines + R-ACTIVATION-JOURNEY. CH9-PLANNING NOTE
  (the user's general e2e intent, next instalment): the two-tier
  taxonomy — tier 1 journey smoke (stub actors, every build, CI) =
  "OUR parts work together"; tier 2 real-LLM basic workflow
  (chapter-close / dogfooding cadence) = "the system meets the
  world" (adapter/provider reality); the middle form (a real LLM
  instructed to answer immediately) was considered and rejected for
  CI — it keeps network/cost/nondeterminism while the intelligence
  is stubbed anyway; what it uniquely tests (provider adapter) is
  tier-2 material. The scriptable command-actor mechanics are ch9
  design work.
  (3) BOUNDARY-REVIEW candidate: a DOGFOODING checkpoint at chapter
  closes from P2 on — the operator CLI driven by hand/script once per
  close; the "reality isn't what we assumed" class that test lanes
  structurally miss.
  → ADOPTED at the ch8 boundary (user, 2026-07-11) into the README §6
  chapter DoD, effective from the ch8 close, WITH the user's waive
  clause: waivable per close by the USER's explicit act, recorded
  with the close — never silently skipped. From ch9 on the checkpoint
  carries the tier-2 real-LLM basic-workflow run. Context markers: ch9 (runner MVP, real actors)
  is the strong-sense e2e frontier the plan already stages; the user
  intends to bring the integration/e2e concept in GENERALLY — the
  boundary review should treat (2)-(3) as the first instalment, not
  the whole answer.

- 2026-07-11 · autonomous-path arm gates RATIFIED (user: "mehet", on
  the gap the user spotted: the flag-free autonomous path had NO
  mandatory external check anywhere — the ch7-boundary checkpoint
  binds FLAGGED approves only, and the close-amendment's layered
  defense ("doc refinement follows; the arms follow") is EMPTY on
  that path until doc-bubbles arrive). The transitional rule, README
  §5.5 canonical: on the autonomous flag-free path the agent-invoked
  arm is MANDATORY at (1) the APPROVE gate (clean, final-hash-citing
  verdict = build precondition; an arm-minted flag DEMOTES to the
  human path) and (2) the BUILD-CLOSE gate (implementation review;
  clean sha-citing verdict = packet DONE). Diminishing-returns cutoff
  binds per gate; unavailable arm = BLOCKER → STOP; waive = the
  human's explicit act. SUNSET: dissolves when doc-refinement carries
  phase 2, or earlier by boundary-review decision — the review
  measures yield from detector_misses. Ground: ch8-P1's four real
  catches (two per gate class) past the internal Opus panel. Mirrors
  synced: AGENTS.md V3 bullet, CreateTaskPacket SKILL.md + AuthorPacket
  step 9.5 + report line + ReviewPacket §4/§6, template §2 step 10.

- 2026-07-11 · ch8-P2 authoring — the truncated-measurement detector
  miss (arm gate 1's first live catch): the packet's M5 sweep claimed
  "every surface stating the debt" from a grep piped through
  `head -20` — the `domain/template.ts` hit was the line that fell
  off, so the sweep list omitted a LIVE debt-status source comment
  while the mutation boundary excluded the file. Five Opus lenses,
  two closes, and one reconciliation accepted the measured list
  without re-running the measurement; the MANDATORY pre-build arm
  (gate 1, agent-invoked codex) caught it on the approve-ready bytes
  — zero code impact. The lesson, stated as the finding-policy
  sibling: "enumeration from memory is not a measurement" has a twin
  — a TRUNCATED measurement is not a measurement; a completeness
  claim is admissible only with its UNTRUNCATED output (or an
  explicit count of what the truncation hides). Boundary-review
  candidate: should the panel's lens duties require re-RUNNING (not
  re-reading) any measurement a completeness claim rides on?
  → ADOPTED at the ch8 boundary (user, 2026-07-11): README §5.5
  truncated-measurement clause WITH the user's sharpening (a
  truncation-SATURATED output — hits == the cut limit — is itself
  the overflow signal); R-UNTRUNCATED-SWEEP in LearnedRules; the
  lens-1 measurement-re-run duty (ReviewPacket §1 duty 5), scoped to
  canonical-row completeness claims.

- 2026-07-11 · ch8-P2 — the FIRST autonomous flag-free packet closed
  end-to-end (the §5.5 ch8 row live): panel R1 full → 1 content +
  bookkeeping folds → R2 targeted clean → close; arm gate 1 refine
  (the catch above) → fold → reconciliation → second close clean →
  arm re-check approve, hash-citing; build first-execution green on
  every product lane (534 → 547; the only red was a test-side journey
  expectation — START commits the instance, not a transcript row);
  post-build audit 0 errors. Reliability note for the transitional
  arm: the FIRST gate-1 codex invocation was killed mid-run (no
  verdict, ~200k of session transcript); the retry completed — the
  gate choreography (find → fold → one hash-citing re-check →
  diminishing-returns cutoff) held as designed. The journey smoke ran
  through the shipped processes as ratified — the activation packet
  carried the repo's first full-lifecycle e2e.

- 2026-07-11 · ch8-P2 arm gate 2 (build-close) — verdict `refine` on
  the build sha, three substance groups, all folded same day
  (aftermath commit 295ee8e9; the arm's re-check: approve, zero new):
  a REAL product catch (dev `validate` silently accepted extra
  positionals against D1's "exactly one"); the M5 receipts had
  ANNOTATED the open-status text instead of flipping its tense
  ("MD-1 stands — retired" reads as a contradiction to a cold
  reader); and FOUR lanes were present but mutation-INSENSITIVE
  (keyset-only {stage,findings} asserts, no last-@ positive, empty
  config forms undriven, projected-field journey equality).
  BOUNDARY-REVIEW candidate (the presence-vs-sensitivity lesson):
  "every lane driven" is satisfiable by a test that cannot FAIL on
  its row's violation — should lens 3's duty add a sensitivity probe
  (per driven lane: name the violation the test would catch)?
  → ADOPTED at the ch8 boundary (user, 2026-07-11): option A — the
  lens-3 sensitivity probe folded into ReviewPacket §1 duty 2 +
  R-LANE-SENSITIVITY in LearnedRules; the write-time half (per-lane
  mutation spec in the packet) deliberately NOT adopted — revisit on
  recurrence.
  Transitional-arm reliability notes: two MORE codex invocations were
  killed mid-run this packet (gate-2's first re-check among them;
  each retry completed) — 3 kills / 6 runs total; and the codex
  → CORRECTION (measured 2026-07-11 at the boundary review — the
  counts above were written FROM MEMORY, the R-UNTRUNCATED-SWEEP
  lesson's own sibling; the measured record): SIX runs, TWO kills.
  g1-find 10:19:23 KILLED@49s (019f5042-84bc); g1-find-retry
  10:21:07–10:26:15 refine (019f5044-1afe); g1-recheck
  10:34:14–10:36:44 approve (019f5050-1f0f); g2-find 10:56:52–
  11:00:30 refine (019f5064-d499); g2-recheck 11:15:44 KILLED@57s
  (019f5076-1a36); g2-recheck-retry 11:17:43–11:20:50 approve
  (019f5077-e91b). Pattern: both kills at ~50–60s while completed
  runs took 2.5–5 min — an EARLY external stop, not a mid-work crash;
  cause undetermined from this session (operator-side stop vs harness
  behavior). Full codex session ids retained for `codex resume` /
  ~/.codex/sessions cross-checking.
  sandbox cannot execute the subprocess-based suites (tsx IPC EPERM
  in $TMPDIR) — the arm verified those lanes from source while the
  in-session 547/547 run carried the execution evidence. Both notes
  feed the boundary review's arm-yield evaluation.
  → ADOPTED at the ch8 boundary (user, 2026-07-11, after two
  external-feedback rounds — one run in the user's own Codex
  session): the gates STAY (yield, correctly framed: both completed
  P2 finders returned substance — 1 product + 1 packet-docs + 4
  test-evidence items in 3 groups — and both re-checks closed clean;
  the 2 kills were the CLAUDE-side background-task manager's, both
  at ~50–60s, not arm failures). ReviewPacket §6 mechanics rewritten:
  foreground launch with an explicit 10-min timeout (never
  run_in_background — removes the kill class at its source); BYTE
  guard before/after (HEAD + target sha256 + dirty-path set +
  tracked-diff hash; status-only guarding is blind to an untracked
  target's content — the feedback's catch), any divergence = invalid
  verdict + STOP, first guard trip = the worktree-isolation hardening
  trigger (isolation itself DEFERRED — the user's call:
  rule-following models, git safety net, harden later);
  `--sandbox danger-full-access` as a CONSCIOUS trust decision with
  the mandatory READ-ONLY prompt block, its tsx-IPC effect MEASURED
  at first use, never assumed; EXPLICIT model+effort pinning per
  invocation (the user's addition — never the machine's
  config-in-flux; chapter-pinned, current pin gpt-5.6-sol/high;
  yield comparable only within a pin); one new-session infra retry
  then STOP; evidence gaps declared in the verdict, never pre-blessed
  in the prompt; yield counted by finding GROUP with
  product/packet-docs/test-evidence classes. Deferred alongside
  isolation: gate-2 subagent probes (same-model delegation adds no
  cross-model independence — logged as a later option).
  → SECOND feedback round folded (user's Codex session, 2026-07-11):
  the byte guard COMPLETED — `git diff --binary HEAD` (staged
  included) + porcelain hash + per-untracked-file CONTENT hashes; the
  first form (`git diff | shasum` + path lists) was blind to staged
  edits and to non-target untracked content, and the clean-tree check
  gained the index-aware `git diff HEAD --exit-code` + empty
  porcelain. Evidence-gap receipt minimum defined (exact hash,
  command, exit code, counts, timestamp, runner provenance; a
  receipt-less gap on a critical acceptance lane blocks a clean
  approve). Pin-mismatch rule minted (observed header != pin →
  invalid verdict, infra-retry ladder) and the pin's source of truth
  moved OUT of the skill into docs/v3/implementation/arm-pin.md
  (boundary-revised table; first row gpt-5.6-sol/high). The guard's
  NON-containment stated (repo integrity only — outside-repo access
  is the residual trust exposure). Retry preconditioned on verified
  termination of the prior process. The foreground tool config made
  concrete (Bash timeout 600000, no background).
  → THIRD feedback round folded (same channel, 2026-07-11): prompt
  and output files pinned OUTSIDE the repo (an in-repo outfile would
  let the arm's own transcript trip the byte guard — a successful
  review self-STOPping); the untracked enumeration made canonical
  (`git ls-files --others --exclude-standard -z`, per-entry content
  hashes, stable null-delimited order — porcelain collapses
  untracked dirs); the receipt-less evidence-gap route made precise
  (an evidence gap is NOT a content finding — nothing folds: the
  gate stays OPEN until an adequate same-basis receipt exists,
  unobtainable evidence = UNAVAILABLE VERIFICATION → STOP);
  arm-pin.md registered in the README §1 "what lives here" list.
  → FOURTH feedback round folded (same channel, 2026-07-11): the
  approval policy pinned EXPLICITLY in the invocation
  (`-c approval_policy=never` — never the user config's), recorded
  from the output header, and a non-`never` header joins the
  pin-mismatch → invalid-verdict/infra-retry rule; CRITICAL
  acceptance lane BOUND (never reviewer interpretation): a test the
  packet's acceptance/matrix prescribes by name, or a mandatory
  README chapter/packet DoD check — exploratory/adversarial probes
  are not critical unless they reproduce a finding.

- 2026-07-11 · ch8 boundary — the draft-legibility question (queued
  from the ch8 draft's metrics honest-record: ratification happened
  on review-evidence trust, a skim) RESOLVED with the user's own
  epistemic articulation: two decision types exist — full-parse-
  decidable vs BUILD-EQUIVALENT verification. A dense draft's deep
  coherence is not human-certifiable by reading; the ratification
  act's honest content there is a contradiction-hunting read +
  evidence-chain acceptance + GO, the residual coherence risk
  consciously carried to the build (divergence stop + aftermath own
  it — and ch8-P1's first-execution-green build was exactly that
  residual coming back clean). ADOPTED: the depth-is-the-human's-
  risk-call clause in README §5.5 + the RATIFIER'S DIGEST in
  DraftContract §4 (the pre-ratification summary surfaces the
  DECIDED-HERE rows, precedent deviations, deliberate non-rows, and
  most-contested panel topics — aiming the human read where judgment
  leverages, not at coherence-checking, where it cannot).

- 2026-07-11 · ch8 boundary — the MEASUREMENT-RULE AUDIT (README
  §5.5: "did a human catch new-decision content the detector did not
  flag?", post-hoc on the autonomously-approved packets): the user
  audited ch8-P2's full decision surface via a digest — the four
  derived rows (T2 flag grammar incl. the default's preservation and
  the coercion-tightening's behavior change; W4 per-verb catch sites;
  M7 pin retarget; J2 zero-seams journey character) and the two
  note-level choices (the EACCES root-guard skip, the 30s subprocess
  timeout) — and CONCURRED with all six: zero human-caught
  new-decision content. The detector's zero-new-decision verdict on
  P2 stands audited; the first autonomous flag-free packet closes
  AUDITED-CLEAN. This completes the ch8 boundary review: nine items,
  nine verdicts (all logged inline above with → annotations).

- 2026-07-11 · ch8-P1 post-close model-replay review (the user's own
  experiment: gpt-5.6/high re-running the earlier review to compare
  against gpt-5.5/xhigh) — two REAL definition defects survived all
  prior panel and external-arm rounds. First, default `toJS()` object
  materialization erased YAML map-key TYPE before V5: numeric open-map
  keys were accepted as strings, and typed-distinct keys (`1` and
  `"1"`) collapsed with silent data loss. Second, the legal
  `__proto__` id passed V5 but assignment into plain `{}` records
  invoked the legacy prototype setter, so accepted steps, roles, or
  transitions disappeared from their returned dictionaries. The
  missing dimension was not another token form: it was SOURCE KEY
  TYPE × JS PROPERTY-CREATION semantics. Fold direction: preserve
  resolved key identity through validation (`mapAsMap`) and
  materialize domain dictionaries with own-property-safe writes. The
  cross-model arm keeps producing COMPLEMENTARY catches, not repeats
  of the in-session panel.

- 2026-07-11 · ch8-P1 map-key aftermath closed — the blind replay's
  two defects propagated through G6 as intended by lens 4: preserving
  key identity exposed that `yaml`'s default uniqueness check is
  scalar-only; a structural comparator closed literal collection keys
  and key-local aliases, the build-close arm caught the remaining
  document-graph gap (an alias to an anchor declared OUTSIDE the
  key), and its re-check caught one diagnostic-multiplicity defect
  (pair-local suppression double-reporting a later key). Final rule:
  finding ownership once per later key. The in-branch arm approve
  cited pre-integration sha b07c88a3. Process lesson: when a detector
  catch broadens a semantic EQUIVALENCE relation, propagate BOTH the
  acceptance axis AND the diagnostic-ownership axis. INTEGRATION
  (2026-07-11): the experiment branch (codex/ch8-p1-key-hardening,
  rounds 3–5, per-round audits 0-error) re-landed onto main as ONE
  §4-choreography aftermath commit, a925d668 — audit 0 errors,
  547 → 558 tests, all bridges green; the branch commit-message claim
  of "two pre-existing root-suite concurrency failures" did NOT
  reproduce on main (full ci:local green pre- and post-integration —
  recorded as a worktree-environment artifact); a fresh arm re-check
  on the integrated sha runs under the new §6 mechanics (first live
  use, incl. the danger-full-access tsx-IPC measurement).

- 2026-07-11 · ch8-P1 round 6 + the §6 mechanics' FIRST LIVE USE. The
  integrated-sha re-check (foreground, byte-guarded, pinned
  gpt-5.6-sol/high, approval never, danger-full-access) TIMED OUT at
  the 10-minute ceiling while composing its verdict — but its finder
  output carried two catches, both reproduced by in-session probes
  and folded as round 6 (commit be5108c9): the Object.is scalar
  comparator was FINER than the Map's SameValueZero key identity
  (0/-0 passed the gate, collapsed silently, first value lost), and
  the per-step materialization memo broke cross-step aliased-graph
  identity. Lesson minted in the packet: when two layers each look
  locally correct, ask whether their EQUALITY RELATIONS compose — a
  gate finer than its container is a silent-loss channel (the
  R-DIMENSIONS -0 rung, re-minted on the KEY axis). The §6-retry
  (scoped prompt with an explicit time budget) returned CLEAN —
  APPROVE citing be5108c9, header pin verified, byte guard unchanged
  before/after. First-use mechanics measurements: (1)
  danger-full-access DID clear the tsx-IPC limit — the subprocess
  suites executed inside the arm's sandbox (the §6 item-3 open
  question, now measured); (2) the 10-minute ceiling is TIGHT when
  the arm runs full suites — the retry's mitigations (an explicit
  time budget + in-session receipts + scoped suites) worked and are
  the recommended finder-prompt shape; (3) the foreground launch
  eliminated the background-kill class (0 kills / 2 foreground runs
  vs 2 kills / 6 background runs). The ch8-p1-key-hardening
  experiment worktree/branch can be pruned at the user's leisure —
  everything of value is re-landed (a925d668, be5108c9).

- 2026-07-11 · ch8 CHAPTER CLOSE. DoD evidence: contract tests + the
  full v3 suite green (560; the round-6 residue fix changed assertion
  shape only, no test-count change); drift 9/9; the ch8-template-format draft
  flipped `realized` with its 38-row realized_map in ONE act (this
  commit); the §1.3 ch8 map row + PI-5 → `realized`; MD-1 retired
  (P2's seven-target sweep); ADR-011/ADR-012 `accepted` (their
  ratification acts); FULL `pnpm ci:local` PASSED at the close (the
  quality gate caught one strict-index residue first — fixed at
  16777710); zero reopened drafts; the process-log boundary review
  HELD (nine verdicts, all → annotations above). DOGFOODING
  checkpoint: WAIVED by the user's explicit act for this close (the
  waive clause's first live use — recorded, never silent; the
  checkpoint stands for the next close). The chapter closed with 20
  packets total, ch8 contributing P1 (7 implementation rounds, 7
  detector misses — 4 arm-class) and P2 (the first audited-clean
  autonomous flag-free packet).

- 2026-07-11 · ch11 RATIFICATION ARM ROUND (user-requested — the
  first external-arm pass on ratified CHAPTER text, not a packet).
  Round 1 on 313bf5de: 6 findings (4 P1 + 2 P2), all source-verified,
  folded at 2cf6fb18; re-check found one residual (the §1.3
  `draft: …` table-form reference), folded at ffb42804; re-check 2
  CLEAN citing the final basis. LESSON (the round's P1-1): a
  MEMORY-CARRIED claim survived into ratified text — "C10 names this
  chapter the owner of the dotted-id reconciliation" lived in the
  session-memory summary of the ch8 draft, not in C10's bytes (C10
  bans dots and names no owner; C7 is the row that anticipates the
  gate-core key). The standing rule "memory may accelerate, never
  carry" already covers it; the OPERATIVE form for chapter authoring:
  a ratification proposal's load-bearing source citations are
  verified AT THE CITED ROW, never from the session summary of that
  row. Same class as ch4's claim-negatives, at the provenance layer.
  Secondary yields: the "round is born here" claim contradicted
  instance.ts's own forward pointer (code-reality check beats
  model-reading at chapter boundaries too), and the ch-3 fixture
  claim inherited plan-§1.3-row wording over shipped-code reality.

- 2026-07-11 · ch11 DRAFT — C1 PLACEMENT-DIVERGENCE LESSON (user-raised at the
  ratification STOP, accepted with a guard request). The draft's C1 moves gate
  bindings to a step-level `gates` key because ch8's ratified scalar transition
  targets cannot additively become the model Config view's nested
  `{target, gates}` form. The user's read: the process let a transitional
  subset (ch8) foreclose the model-sketched end shape — watch that we do not
  foot-gun ourselves mid-path again. HONEST FRAME: the model Config views are
  illustrative model-plane sketches, not ratified format; ch8's minimal choice
  was CORRECT under no-speculative-keys, and the divergence class is the
  STRUCTURAL consequence of (no-speculative-keys + additive-only evolution)
  operating together — placement divergence is inevitable in this regime and
  is legal WHEN the semantic grain is preserved (here: the (step, event_type)
  binding grain, C2). THE GAP: no named FORWARD-SWEEP step exists at
  format-chapter draft/ratification time. Proposed rule for the boundary
  review: when a format chapter fixes or grows a keyset, the draft phase
  sweeps the model Config views for FUTURE surfaces touching those keysets,
  and every foreseeable placement divergence is PREDICTED and RECORDED in the
  ratifying text (a conscious decision at subset time, never a later
  discovery). Route: ch11 boundary review — candidate DraftContract §1 /
  chapter-ratification checklist item.

- 2026-07-11 · ch11 DRAFT RATIFICATION READ — MODEL GAP FOUND (the read's 3rd
  and largest catch): the user's C20/C21 questioning surfaced that the draft
  CANONIZED an accidental model asymmetry as an architectural rule. The 08-l2
  section declares gate `config` "load-bearing for every gate kind" yet
  carries ZERO config-validation; l2a's `validate_gate_config` skips
  non-process gates ("IF uses ≠ external.process THEN CONTINUE") — the model
  provides insufficient evidence that this skip constitutes a deliberate,
  durable "kernel never validates non-process config" rule (the precise
  epistemic form; "writing-context artifact" is the likely but unproven
  reading). The GateEvaluator interface signals an EXTENSIBLE gate system —
  evaluator/registration-owned config validation is the extension-compatible
  design the model lacks. ROUTE: mandatory model-plane fix BEFORE the draft
  can close (README divergence-stop class); the draft's C8/C20/C21/C22 (+ the
  C10/C11 kernel columns) are frozen until the ratified model regenerates the
  ledger. An external review round on the first fix proposal reshaped it
  (registration-descriptor over evaluator-interface; shared validator behind
  both seams over file=form/kernel=semantics; admission-level
  runtime-context rule; normalize-not-just-validate; phase separation).
  Ratification-read yield so far: C26 partial-invariant, C17 flat-token (via
  worked example), this model gap — the read is functioning as a REVIEW TIER,
  boundary-review material.

- 2026-07-12 · ch11-P0 — LANE-4 DISCOVERY (the bridge's scope closed by
  RUNNING the gate): authoring tier-0 surfaced a FOURTH red approve-time
  surface (check_coverage --fold-time) the ratified exception and FIVE
  review rounds all missed — 7 items were Lane 2 through a second checker,
  2 came from the script's OWN hardcoded count dict (the same mirror class
  as the test-side pins; a full approve-gate-script sweep closed the
  class: no other executable hardcoded inventory count exists). LESSON:
  executing an approve-time gate at authoring is a CHEAP completeness
  probe no amount of reading substitutes — candidate AuthorPacket step
  (boundary review). The under-scope was repaired as a ratified Lane-4
  addendum + a five-site authority alignment (README §5.5 / plan P0 row /
  packet Flag 1 + S6 + Sizing); the dual act (addendum ratification + P0
  approve) landed on the fresh receipt set at 30fe3479.

- 2026-07-12 · ch11-P1 (build + gates): (1) the discovered
  classification drifted in TWO steps — the internal panel's round-1
  fresh finder caught the missed WRITE SURFACE (the operator `submit`
  envelope builder), then arm gate 1 caught the missed DECISION on it
  (the O1 required-at-parse form: derived → new-decision, demoting
  the flag-free autonomous approve to STOP 4). A finder attacks the
  inventory, an adversarial arm attacks the entailments — the
  prediction convention should expect classification drift from both
  directions. (2) The "fix scoped to the finding just caught" class
  recurred TWICE inside one packet: the R4 equality fold was applied
  to the named lanes only (arm gate 2's re-check found the flipped
  DONE lane still outcome-only), and the ch8-P1 own-property lesson
  never crossed from the definition layer to the kernel-side record
  lookups (`capability()` — arm gate 2's `__proto__` probe).
  Candidate boundary-review question: should a deepened-rule fold
  REQUIRE a named re-derivation sweep over the rule's full member
  list as a checklist step, not an intention? (3) The consume-family
  scan misread a HAND-PROJECTION (the debug bundle's envelope meta)
  as pass-through — a scan row naming a projection surface should
  cite the projection's field list, not its module family.

- 2026-07-12 · ch11-P2a (authoring + gates): (1) the "fix scoped to the
  finding just caught" class recurred on an INVENTORY RULE — round 1
  widened the inline-DefinitionStore sweep to the two files the finding
  named, round 2 found the sweep pattern itself still channel-blind
  (annotated-only; the un-annotated `definitions: { load: … }` literals
  hid four more sites). The durable fix was re-deriving the rule
  (receiving-type, not annotation) — a deepened inventory rule needs its
  DEFINITION re-derived, not its member list patched. (2) The
  narrowing-not-reclassification route worked as the P1 lesson
  predicted: all four arm entailment attacks resolved by shrinking the
  row to anchor-entailed semantics + declared build freedom, keeping the
  flag-free path — but the arm's re-check then caught a narrowing
  MINTING an inconsistency (the A5 freedom vs D6's already-pinned type):
  a granted freedom needs a consistency check against sibling rows that
  already pin the shape. (3) The arm attacked OUTWARD entailment (rows
  obliging MORE than anchors force) — a direction the internal lens-2
  attack never ran; candidate lens-2 duty amendment at the boundary
  review. (4) The in-chapter split executed autonomously first time
  (P2 → P2a/P2b/P2c, hard stops 1+2); the round-format draft gap
  quarantined cleanly in P2c.

- 2026-07-12 · ch11-P2a arm gate 2 aftermath: (1) a prose-asserted
  "nonempty" the TYPE permitted to be empty (the GateConfigResult
  failure arm) survived four panel rounds, two arm passes, and the
  build — the arm's gate-2 code read caught it; candidate rule: a
  canonical row asserting a cardinality ("nonempty", "exactly one")
  over a TYPED surface must state whether the type CARRIES it, and a
  type that permits what the row forbids is a finding at WRITE time.
  (2) The "fix scoped to the finding" class recurred CROSS-VALIDATOR:
  the own-__proto__ hostile lane was added to the threshold validator
  (whose finding named it) but not its previous_reviewer_verdict twin
  — a deepened lane inventory binds per RULE, not per the file the
  finding named. (3) The approve-basis hash (the packet bytes arm gate
  1 and the close certified) is not reproducible from the build commit:
  the Build record lands between approve and commit BY DESIGN (template
  §1), so the committed packet hashes differently — boundary-review
  question: preserve the approve-ready bytes as a git object (e.g. a
  refs/notes entry or a recorded pre-record hash file), or ratify the
  current reconstruction-note convention.
