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

- 2026-07-12 · ch11-P2b authoring + arm gate 1: (1) the P2a lesson
  APPLIED at write time still missed its cross-artifact half — O1
  obliged a REQUIRED gateReason the already-BUILT sibling type
  (GateDecision.reason optional even on block) cannot force; the arm
  caught it as the type-permits-what-the-row-forbids class at the
  PACKET grain; candidate rule: a derived row's obligations are
  checked against the BUILT types it consumes, not only its model
  anchors. (2) The arm's re-check sharpened a one-sided discipline
  lane: the order-interplay lane drove read-after-checks but nothing
  failed an EAGER read — every ordering/discipline claim needs BOTH
  directions driven (the fix-scoped-to-the-finding class at lane
  grain). (3) The packet-lint's reserved-P-family rejection fired on
  a fresh authoring (the projection matrix was first lettered P) —
  the tooling caught it fold-time; no rule needed, the armor worked.

- 2026-07-12 · ch11-P2b arm gate 2 aftermath: three green-but-blind
  lanes in the BUILT tests ([warn,block] order-insensitive; the
  CAS-restart lane counting reads/commits but never proving
  re-evaluation on fresh state; the diag lane asserting a partial
  shape) — the packet's lane TEXTS demanded the right meanings and
  the build realized weaker asserts; candidate rule for the boundary
  review: R-LANE-SENSITIVITY binds twice — once against the packet's
  lane texts at authoring, once against the BUILT test bodies at
  build close (a named orchestrator-side sensitivity pass, or an arm
  prompt clause, before the gate-2 leg). The ingress carried-as-
  may-change correction also had to be PROPAGATED to T2 + the sweep
  label — the fix-scoped-to-the-finding class again, at prose grain.

- 2026-07-12 · ch11 gate-format reopen (the P2c round surface): the
  plan-pre-declared draft-routing STOP resolved by the user to
  reopen/extend — the first LIVE reopen of a ratified draft (the
  choreography executed to the template's letter; the loud-red
  anchor window behaved as designed: 60 expected P2a/P2b anchor
  errors, zero draft-form errors). The arm's substantive catch: C41
  first framed the model's per-transition override as an "explicit
  non-surface" (the C30 context_block_refs pattern) — but that
  pattern fits ANOTHER chapter's semantics, while the override is
  ratified model capability on THIS surface; the honest form is a
  PARTIAL-REALIZATION disposition carried by name to the plan.
  Candidate class for the boundary review: a DECIDED-HERE deferral
  is classified against WHOSE capability it defers — another
  surface's (non-surface pattern) vs the ratified model's own
  (partial-realization disposition, plan-visible) — a draft-side
  sibling of the built-types lesson (the row was checked against
  the model's EXHIBITED grammar, not its STATED capability set).

- 2026-07-12 · ch11 gate-format reopen, the ratifier read (NO-GO on
  the first close): two detector-miss classes for the boundary
  review. (1) The C38 default's "behavior-preserving" rationale was
  CIRCULAR — it treated the ch-4 provisional heuristic's realized
  behavior as a preservation target, though nothing ratified it and
  no installed template base exists; three internal lenses and the
  agent arm accepted it. Candidate rule: a "behavior-preserving"
  justification names WHAT ratified surface pins the behavior — a
  provisional realization is never a preservation target in the
  design phase (the never-live-is-not-retired vocabulary, default
  grain). The ratifier re-decided: declared-only advancement
  (absent ⇒ none), legal-but-inert misconfiguration accepted,
  detection deferred as a named later decision. (2) The ratifier's
  MANUAL arm caught a staging contradiction the panel + agent arm
  passed: C39 opened direct authoring at P2c while C40 landed ALL
  its lanes at P4 — semantically invalid direct declarations would
  have passed admission for a whole packet window. Candidate class:
  when a draft STAGES realization across packets, every
  channel-open×lane-landing pair is checked as a matrix (who can
  author on which channel in which window, and which lanes guard it
  there) — resolved as C40's value-level/source-form realization
  split.

- 2026-07-12 · ch11 gate-format reopen, the ratifier's third arm
  round (STOP `2:meaning-changing-alignment`): the declared-only
  C38 default conflicted with the RATIFIED evolution rules (plan
  §8.2 rule 2 + realized ch8-C7's unqualified behavior-preserving
  default) — three internal layers (R3 full panel, lens-4 recons,
  the agent arm) accepted it implicitly under the "no released
  baseline" rationale, checking the default against the MODEL and
  the owning chapter but never against the format's own ratified
  EVOLUTION rules. Candidate rule: a new format-surface decision is
  checked against the base format's ratified evolution/forward
  rows (§8.2 + the ch8-C7 class), not only the model and plan §11.
  Resolution (the user's, generalized on their own proposal):
  §8.2 rule 2 gains a standing DEVIATION CLAUSE — a
  non-behavior-preserving default only as the ratifier's explicit
  per-key act, recorded in the realizing contract row — so future
  deviations need no per-key rule edits; the round key is the first
  exercise (C38). The STOP-2 detector worked exactly as designed:
  the human overrode their own ratified rule by an explicit,
  recorded act.

- 2026-07-12 · ch11-P2c authoring + build: three detector-miss
  classes for the boundary review. (1) A confinement claim over a
  COMPARISON test was verified against the compared SOURCE files,
  not the comparison's STAGE — loadTemplate returns the ADMITTED
  value since P2a, so admission's new all-false maps broke two
  raw-vs-loaded round-trip pins the packet had declared untouched;
  the builder's STOP-on-conflict caught it (candidate rule: a
  pin/round-trip confinement claim names WHAT VALUE flows through
  the comparison, per stage). (2) A shared input/output type's
  PERMISSIVENESS (a pre-populatable field on the raw form once
  admission became the sole legal producer) needed its own hostile
  lane — the arm's producer-monopoly catch; the same arm round
  demanded the C20-letter type-level narrowing over per-call-site
  discipline. (3) Arm gate 2 re-found the P2b class — three
  green-but-blind BUILT lanes (invalid-path purity undriven; the
  gated rebuild branch unhostiled; one of two non-resolving replay
  branches undriven): R-LANE-SENSITIVITY's per-branch/per-half
  member enumeration still is not surviving the packet→build hop;
  second occurrence, promotion candidate at the boundary.

- 2026-07-16 · ch11-P3 findings round (the human's, on the panel's
  flag-bearing approve-ready bytes @ 7dddfd1b): FOUR findings. (1)
  The F2 flag tried to ratify a NARROWING of ratified contract row
  C26 (the production runner slot's process-memory evidence
  substrate) through a packet approve — rejected on principle: a
  packet approve never silently rewrites a ratified contract row's
  meaning; the legal routes are actual compliance or an explicit
  reopen + re-ratification. Candidate rule: an approve-ratified
  flag may record a DECISION the draft left open, never a deviation
  from a ratified row's letter — deviation detection belongs to the
  lens-2 draft→packet drift duty. (2) A canonical row (V1) carried
  a self-contradiction between its presence clause and its own
  derivation note — four internal panel passes and a close missed
  an intra-row contradiction the human caught on read. (3) The
  hard-stop-2 closure proof ("the ratified plan row IS this
  bundle") was rejected as insufficient against a visible
  foundation→activation cut — the plan-row-as-closure-proof pattern
  (accepted at P2c) does NOT generalize: seven surfaces with a
  natural interior seam need the split, and the sizing gate's
  "split is not advisory" line was under-weighted by the authoring
  loop; in-chapter split P3a/P3b executed at the findings fold. (4)
  A header phrase ("the three L2a rejections", inherited from the
  plan row's own loose wording) conflated registry rejection names
  with definition-issue codes.

- 2026-07-16 · ch11-P3a findings round (second — the human's, on the
  close-clean bytes @ 18985d6d): TWO findings the nine internal
  passes missed. (1) KERNEL-inert is not SYSTEM-inert: the packet
  called the JSON-mode authored `reason` "inert (nothing reads it)"
  after verifying only the KERNEL's reads — ratified C23 ships the
  WHOLE effective config on the process stdin, so the value is
  wire-visible and the external process can condition on it.
  Candidate rule: an "unused/inert/dead" claim over a value closes
  only with a FULL value-flow walk — every downstream carrier the
  ratified rows name (wire rows included), not just in-repo reads;
  the lens-2 delegation-closure duty should treat "X is unread" as
  a delegating claim over every surface X reaches. (2) An exact-set
  composition claim survived with a non-exhaustive negative-id
  idiom re-labeled "precise" instead of being made mechanically
  falsifiable — the fold's honesty (stating non-exhaustiveness) was
  accepted as closure when the finding demanded a falsifiable
  inventory (an exported canonical composition record any fourth
  member fails). Candidate rule: for exact-set/only-these claims,
  precision-about-weakness is not a substitute for a mechanized
  inventory when one is cheaply constructible.

- 2026-07-16 · ch11-P3a findings round (third — the human's, on the
  second close-clean bytes @ 61479c5d): the G1 fold that mechanized
  the composition inventory OPENED a new seam — the exported
  evidence record was declared "never a mutation surface" while
  nothing enforced it: a TS-only `as const` is readonly at compile
  time and writable JavaScript at runtime, so the evidence export
  itself would have become the P2a-banned registration/mutation
  API. Also caught: the acceptance's blanket "every lane
  test-driven" contradicted G1's own honest review-owned residual.
  Candidate rules: (1) a fold that EXPORTS an artifact for evidence
  carries that artifact's immutability discipline in the SAME fold
  — runtime freeze + add/delete/replace mutation-negative lanes
  (throw AND post-state asserted), never a type-level readonly
  alone; (2) when a claim's guard set mixes test-driven and
  review-owned members, the acceptance names the carve-out
  explicitly — a blanket "all lanes driven" over a mixed set is the
  same overclaim class the second round caught.

- 2026-07-16 · ch11-P3a findings round (fourth — the human's, on the
  third close-clean bytes @ 266ee1d2): the dual-layer immutability
  claim's COMPILE-TIME half had no sensitive drive — the acceptance
  drove the four runtime mutation lanes, but a builder shipping
  the freeze while dropping/widening the readonly type would stay
  green (typecheck alone cannot miss what no probe exercises).
  Folded per the ratifier's own prescription: two isolated
  `@ts-expect-error` compile-negative probes (record-member
  reassignment; nested requiresRuntimeContext overwrite) on the P2a
  `__probe` precedent — TS2578 fails typecheck on accidental
  widening. Candidate rule: a BOTH-LAYERS claim (type + runtime)
  needs BOTH layers driven independently — a runtime lane never
  witnesses a type guarantee, and vice versa; when a claim
  enumerates its guard layers, the acceptance enumerates one drive
  per layer.

- 2026-07-17 · ch11-P3a findings round (fifth — the human's
  adversarial adjudication over the prior findings set): two
  substantive groups the six prior passes missed. (1) A generic
  container rule (V4's non-map discipline) was stated but its
  MEMBER lanes were not driven by name (config non-map; onExit
  non-map; and the PRECEDENCE of the unconsumed-key lane over the
  container lane in the mode where the key is illegal) — a
  validator could mishandle all three with every named test green.
  Candidate rule: a container/kind discipline enumerates its lanes
  PER CONFIG GRAIN and pins every precedence where two lanes can
  fire on one input. (2) The runner/evidence contract was not
  internally closed: the kit's script input overlapped the
  runner-minted fields (a ProcessResult-shaped script vs a minted
  logRef), field ownership (durationMs, the log source for non-ok
  kinds) was undecided, and R3 conflated the record's ADDRESS
  (logRef, per C26's letter) with its PAYLOAD. Candidate rule: a
  port/kit contract closes only when every field has exactly one
  OWNER and every input shape is DISJOINT from the minted fields —
  two non-equivalent implementations passing the text means the
  packet decided nothing. Bookkeeping batch alongside: literal
  sweep flags (--exclude as a flag, not prose), a missing C23 ref,
  a mirror-map immutability row, the full CREATE_INSTANCE reprint,
  and the process-log-in-its-own-commit choreography made explicit.

- 2026-07-17 · ch11-P3a findings round (sixth — the human's external
  arm, on the fifth close-clean bytes @ 0ca4a920): three content
  findings + one bookkeeping + one red approve-time gate. (1) The
  fifth-round log-ownership fold OVERWROTE ratified C26's letter —
  "captured output text" became "runner diagnostic for non-ok
  kinds", dropping a real runner's partial pre-timeout output; the
  same deviation class the FIRST round rejected (a packet fold
  silently rewriting a ratified row's meaning), now introduced BY a
  fold rather than a flag. Candidate rule: every fold that touches
  a row anchored to a ratified C-row re-diffs the folded text
  against the C-row's exact words before handing back — fold-time,
  not review-time. (2) Stated scalar/payload guarantees (nonempty
  logRef, non-negative integer durationMs, integer exitCode,
  result↔record correspondence) had no per-guarantee lanes — the
  positive fixture set was green while logRef:"" or exitCode:1.5
  pass-through would survive. (3) The V7 accumulation claim named
  three sources but drove one combination — first-error-only
  validators and cross-rule-after-valid-config orderings passed.
  (4) grep BINARY-SKIP: definition/admit.ts carries two literal NUL
  bytes (the effectiveKey separator), so text-default greps
  silently drop it from -l sweeps and implementations diverge —
  receipts now carry `-a`; candidate rule: repo sweeps are
  binary-safe by default (the invisible-byte class also fooled the
  in-session Read rendering). (5) The machine-migration worktree
  restored the deleted superseded P3 packet file → coverage
  fold-time RED at the arm; re-removed (copy preserved). Candidate
  rule: approve-time gates re-run on the CURRENT worktree at every
  verdict presentation, not carried from the close.

- 2026-07-17 · ch11-P3a findings round (seventh — the human's
  external arm): the sixth-round fold's NEW validator (the kit's
  script-entry exitCode precondition) shipped with a single
  negative probe (1.5) instead of the mandatory full ladder —
  R-NUMERIC-LADDER's own letter ("EVERY new validator over a
  numeric domain") applied to a validator BORN IN A FOLD. A
  narrower predicate (isSafeInteger, >= 0) would have passed every
  named lane while wrongly rejecting C34-legal integers. Folded:
  the predicate pinned to exactly Number.isInteger (C34's domain;
  any narrowing is a draft-level decision), the ladder driven in
  BOTH directions — six named rejects AND five named legal-accepts
  (-1, -0, 2**53 among them) that kill the narrower predicates.
  Candidate rule: fold-born validators inherit every write-time
  discipline the original authoring pass carries — the fold path
  needs the same checklist as the authoring path (this is the
  second fold-introduced defect class after the round-3 mutable
  export; folds are authoring).

- 2026-07-17 · ch11-P3a ARM GATE 1 (pin-conform gpt-5.6-sol/high/
  never, byte guard clean before+after, verdict refine citing
  5d10da3f): TWELVE findings after seven human rounds — the arm's
  distinct yield classes: (1) PRODUCT: the definition-site freeze
  gap (a registry-init freeze leaves a pre-freeze import-order
  mutation window — the fix moves Object.freeze to where the values
  are born; the third consecutive round hardening the SAME exported
  record: evidence artifacts attract defect classes in layers). (2)
  The V1 reason-retention semantics reclassified derived →
  NEW-DECISION (the C-rows constrain but do not select; the F1 flag
  was already the decision record — the manifest class now matches
  the flag's own logic; tally 8/7/1). (3) A deferral list mis-filed
  a RATIFIED semantic (C13's sh -c) as open runner freedom —
  candidate rule: a deferred-mechanics list is checked item-by-item
  against the C-rows for already-ratified members. (4) A universal
  quantifier ("one record per invocation") contradicted the
  packet's own throw lanes — quantifiers are re-swept after every
  fold that adds a failure path. (5) Structural-typing honesty: a
  "can never carry" claim over a TS object type is false without an
  exactness mechanism — excess-property freedom is part of the
  value-flow walk. (6) The G1 anchored row was carrying a
  packet-added mechanism the anchors do not select — split into
  G1 (anchored composition) + G2 (derived mechanism), with the
  sizing's authority axis and acceptance-multiplicity claims
  re-stated honestly.

- 2026-07-17 · ch11-P3a arm gate 1 re-check chronicle (four rounds
  to clean): the re-checks kept finding SYMMETRY gaps in the folds
  themselves — a process-member-only mutation drive (the two inline
  members' freezes unfalsifiable), a timeout-arm-only compile probe
  (runner_error free to widen), a single-arm smuggle lane, and a
  Sizing summary line contradicting its own corrected scan. Same
  shape each time: a fold driven at ONE member of a family where
  the rule binds EVERY member. Candidate rule (joins the
  folds-are-authoring rule): a fold that adds a lane over a
  FAMILY (union arms, registry members, config grains) enumerates
  the family and drives every member — the finding's named instance
  is never the lane's extent. Also: the corrected consume-family
  accounting (a consumer reached through an unchanged port is still
  a consumer) flipped the packet's hard-stop-6 status to
  letter-tripped-with-closure-proof — the honest form the P2c
  precedent set.

- 2026-07-17 · ch11-P3a findings round (eighth — the human's arm on
  the arm-gate-1-clean bytes @ 4f346d10): THREE findings, all the
  family-symmetry class AGAIN, one round after the candidate rule
  named it: (1) the smuggle drive covered two of three kinds and
  three of six runner-owned fields against a "wholesale" claim —
  and the field-for-field correspondence omitted durationMs
  equality; (2) the union-iff probes drove only the ABSENCE
  direction (non-ok arms lose fields) and not the PRESENCE
  direction (ok arm keeps them required); (3) a type-level
  foreclosure claim (D1's singleton literal) carried no
  compile-negative probe — the same gap the exitCode ladder and
  the record-readonly rounds already taught, at a third site.
  Sharpened candidate rule for the boundary: when a rule binds a
  FAMILY or an IFF, the drive enumerates BOTH the family's members
  AND the iff's two directions — and every type-level "forecloses"
  claim carries its own probe; a grep for
  "forecloses|by type|type-level" over a packet is a cheap
  reviewer sweep for undriven compile-half claims.

- 2026-07-17 · ch11-P3a retrospective observations (raised in the
  session's own process-assessment exchange with the ratifier;
  captured for the boundary review — two proposals the round
  captures above do NOT yet carry): (1) PROPORTIONALITY GATE for
  evidence machinery — the P3a churn's largest single source was
  the evidence apparatus generating its own attack surface (an
  exact-set finding → an exported record → its mutability → its
  freeze → the freeze's compile half → per-member symmetry: a
  three-member static Map ended up carrying a record export,
  dual-layer/dual-depth freezing, a mutation-lane family, eight
  compile probes, a sweep, and a review-owned obligation). The
  fix-all default has no cost brake, and the existing
  `declined: out of threat model` route was never invoked by
  either side. Candidate rule: a fold that ADDS a mechanism
  (an export, a freeze, a probe family, a sweep) states a
  one-line proportionality record — the defect class guarded, its
  plausibility, and the guard's spec-weight cost — and the
  panel/ratifier legitimately answers `declined: out of threat
  model`; mechanism restraint is the lever, because every added
  mechanism multiplies against EVERY write-time discipline
  (lanes = mechanisms × disciplines). (2) SPEC-TIME vs BUILD-TIME
  middle path for test evidence — P3a enumerated fixture-grade
  lane detail in prose for green-field code, making every
  ambiguity a findings round; the opposite extreme (bare
  discipline pointers) is the known packet→build loss class
  (P2b/P2c). Candidate middle form: the packet states the
  DISCIPLINE plus the family INVENTORY (which members, which iff
  directions, which layers), and leaves fixture-level enumeration
  to the build under arm-gate-2's built-body re-check — to be
  weighed at the boundary against the P2b/P2c hop-loss evidence.

- 2026-07-17 · PROCESS REVISION RATIFIED (mid-chapter, the user's
  explicit act — the §7 "unless the issue blocks" clause: ch11-P3a
  was dropped for recreation, so the revision precedes the packet
  rather than waiting for the boundary). Basis: the P3a
  retrospective above + a comparative study of the siphra-arch
  PROCESS2 regime (the cycle-2 process that inherited this repo's
  arm mechanics and evolved the review economics around them; its
  L0 five-round arm phase supplied live evidence — yield curve
  5→3→3→3→2, first-occurrence counting, prediction-test close).
  Root-cause diagnosis accepted by the user: fix-all default +
  exhaustivity claim grammar + no spec-vs-build altitude line + no
  yield-based closure jointly produce a monotonically growing
  attack surface and a mechanically non-convergent loop. SEVEN
  items ratified one by one: (1) the spec-vs-build ALTITUDE LINE —
  discipline + family inventory at spec time, fixture enumeration
  at build, `deferred-to-build` by rule; bound condition:
  R-LANE-SENSITIVITY promoted to BIND TWICE (the P2b/P2c second
  occurrence), the arm gate-2 sensitivity pass now mandatory;
  (2) the DISPOSITION REGIME — recorded per-finding disposition +
  severity (the P0–P3 ontology), tally per round, ~100% fold rate
  = triage-inspection signal; the proportionality gate adopted as
  proposed above; (3) the PLATEAU stopping rule — `3:plateau`
  STOP: two consecutive rounds ≤2 accepted CONTENT findings
  (first-occurrence) AND zero P0/P1 AND no escalation trigger;
  human closes on judgment; quality axis added on the user's
  round (quantity alone insufficient — a blocker resets the
  counter even at count 1); (4) CLAIM GRAMMAR — three closed forms
  (measured / parameterized / scoped), bare wholesale rhetoric is
  a finding; (5) SIZE TRIGGERS, advisory — 48 KB + 50%-growth v0
  thresholds per round report (measured drift: ch4–ch6 packets
  4–15 KB, ch8/ch11 53–84 KB); (6) the PRESENT-TENSE rule — edit
  scars out of the operative path; (7) the FRESH-IMPLEMENTER LENS
  as an explicit EXPERIMENT (once per packet, blind restatement,
  evaluate-then-scale-or-retire at the boundary). Carriers:
  README §5.5 (canonical), task-packet-template §1/§2, ReviewPacket
  (mirror + new §7), LearnedRules (R-ALTITUDE-LINE,
  R-CLAIM-GRAMMAR, R-PRESENT-TENSE, R-LANE-SENSITIVITY update).
  Metrics-schema promotion deliberately deferred
  (invariants-vs-tooling): the new telemetry lives in round
  reports + Build-record prose until a boundary review moves the
  lint. P3a itself: dropped for recreation under the revised
  process; the pre-reset bytes are preserved at commit ca4ea924
  (sha256 e15a6fd9…) — ACTION ITEM: after the recreated packet
  closes, diff it against the record as a process-effectiveness
  check. All v0 thresholds recalibrate after the first 2–3
  packets under this regime.

- 2026-07-17 · ch11-P3a recreation bootstrap note (repo-binding the
  one session-borne instruction the starter-prompt audit surfaced —
  everything else proved recoverable from committed surfaces): the
  ca4ea924 record packet is a QUARRY, never an authoring base. The
  recreation projects from the ratified sources — the ledger, the
  ch11-gate-format contract rows, the plan — per projection-not-
  invention; the record is consulted ONLY for the accepted
  round-borne decisions (the F1 wire-visibility reading, the V1
  new-decision reclassification — carried in its flags section and
  row manifest) so they are not re-litigated. Never import its
  enumerations, matrices, or prose: re-anchoring on the pre-reset
  form is precisely the failure the reset exists to escape. With
  this line the fresh session's bootstrap is fully repo-bound — the
  starter prompt needs only the packet id and a pointer to this
  log's revision entry.

- 2026-07-17 · ch11-P3a recreation, fresh-implementer lens run 1 (the
  process-revision experiment, ReviewPacket §7; pin: agent-invoked
  internal Opus-class): ZERO comprehension divergences — the blind
  restatement (packet bytes only) reproduced the lane inventory with
  its code assignments, the effective-config presence rules, the
  port/evidence guarantees, and the thirteen test families
  faithfully; its ten open items were all by-design repo-bridge
  references (the embedding-gates-named files, the contract's raw
  C-rows), declared packet freedom (the kit's deterministic fake
  values), or the human-gated F1/F2 — none an operative-content gap.
  First data point for the boundary's evaluate-then-scale-or-retire
  verdict on this lens.

- 2026-07-17 · ch11-P3a recreation — panel chronicle + CLOSE RECORD
  (the ratifier's procedural finding folded: the clean close is
  repo-bound from this packet on, not session-only). R1 FULL bound
  eebd6a1f… → folds (V5 minted new-decision → flag F2; the
  operative authority note; lane-q container symmetry; the G8
  own-property member; mirror/bookkeeping) → R2 FULL (mandatory
  escalation, manifest-class change) bound 0d6ccca3… → one content
  fold (the plan Mode-cell clarification) + bookkeeping, reconciled
  f3bf0d35…, close clean → the RATIFIER's findings round (F1
  foreclosure precision — the admission-time drop CONFORMS, carry
  is a genuine selection; F2 re-decided TEMPLATE-GRAIN: exactly one
  finding at the top-level runtimeContext path) → R3 FULL
  (STOP-resolution escalation) bound 8fb543d1… → the lens-3 P1
  (the ratified count claim had NO falsifiable drive member — a
  per-gate build would have passed every declared obligation) + P2
  (V4 addressing over-reach) folded: the dimension-7 N≥2 count
  member, the count-claims acceptance bullet (C19 collapse +
  failInstance no-double), the V4 addressing exception, the A7
  detect-in-loop/emit-once grain note → R3b targeted lens-3 recheck
  PASS (all closed, none new) + lens-4 reconciliation CLEAN;
  fresh-implementer lens re-run (post-semantics-change, per §7):
  zero comprehension divergences on the three ratified areas.
  FINAL CLOSE CLEAN @ sha256
  6cd27852c865f0274821164aaf2e1420149f8d7caa10d8ed67c22552fdb3a1e5,
  HEAD 27b22260 — tier-0 all green (packet-lint 0/0 reopened,
  fold-time coverage, adr-check, drift 9/9). SIZE TRIGGER: 49,069 B
  — the 48 KB v0 advisory TRIPPED (growth = drive-coverage armor:
  count members, addressing carve-out); accept-with-note /
  demote / split is on the approve agenda per the size rule. The
  packet stands at STOP 4:flagged-approve (F1 + F2,
  approve-ratified routes).

- 2026-07-17 · ch11-P3a recreation — the APPROVE act + the flagged-path
  arm round. The ratifier APPROVED at STOP 4:flagged-approve on basis
  6cd27852… (ratifying F1 verbatim-carry, F2 template-grain, and the
  size accept-with-note). Per the ch7-boundary flagged-path rule the
  agent-invoked external arm ran on the approved bytes BEFORE build
  (pin-conform gpt-5.6-sol/high/never; byte guard clean before+after):
  verdict REFINE with FIVE findings, all folded — (1) hard stop 2
  letter-trips beside 6 (one shared closure proof) + the
  closure-budget SHARED-CONTRACT bucket record (R1–R3 as new shared
  contracts, P3b/ch9 deferrals pinned by C34/C26); (2) V4's lane-s
  clause remade an explicit MIRROR of canonical V5; (3) T1's
  six-outcome membership materialized as a parameterized mapping +
  FAITHFUL QUEUED PLAYBACK discipline; (4) the R2/R3 "Port value
  contracts" acceptance family (scalar refinements + value
  preservation); (5) V5's findings-round provenance moved to F2
  (present-tense). Arm RE-CHECK: CLEAN citing the folded basis
  f0d9cae0fe01a9ac4ab1f0583dd95111089357dea3108dcc5bf6f3e4d86a0e9d
  (50,923 B; the size advisory remains accept-with-note per the
  approve); lens-4 reconciliation CLEAN; tier-0 green throughout.
  BUILD PRECONDITION MET — the build proceeds on this basis.

- 2026-07-17 · ch11-P3a recreation vs the pre-reset record — the
  process-effectiveness comparison (the revision entry's ACTION ITEM,
  executed EARLY at the user's call: packet-bytes + loop telemetry
  only; the build-close half — does arm gate 2's sensitivity pass
  stay clean on the leaner spec? — is still owed, and the boundary
  review should re-run this comparison with the build data in).
  PRODUCT: 77,364 B / 871 lines (record @ ca4ea924) → 50,923 B /
  678 lines (approved basis f0d9cae0…), −34% with the operative core
  intact AND content ADDED meanwhile (the ratifier's F2 form, the
  arm's value-contract families). Section shifts localize the loss
  exactly where the revision predicted: Acceptance 149 → 81 lines
  (the altitude line: discipline + inventory instead of fixture
  enumeration), Embedding gates 116 → 46 (accumulated review armor
  gone); Pre-approval flags 34 → 69 (decision records moved to their
  proper home). The record's evidence-machinery cascade (export →
  freeze → dual-layer → eight compile probes → sweep) never formed:
  the compile-probe discipline is stated ONCE (dimension 13, three
  members). PROCESS: pre-reset — 8+ findings rounds across days,
  round 8 still yielding three content findings of the SAME
  family-symmetry class one round after the candidate rule named it
  (the non-convergence diagnosis); recreation — one session, yield
  curve 9 → 1 → 2 → 0 across R1/R2/R3/R3b, termination at designed
  decision points, no watchdog. The pre-reset recurring class was
  ENCODED as write-time discipline, and its one live recurrence (the
  lens-3 P1: the ratifier-selected template-grain form lacked an N≥2
  falsifier) was caught in one round and closed in one fold. The
  quarry rule held: F1/V1 carried without re-litigation, and fresh
  projection IMPROVED the record's own reasoning (the ratifier's F1
  precision: the admission-time drop also conforms — the record had
  argued the letter forced carry). HONEST COUNTERPOINTS: (1) the
  external arm still found FIVE real findings on close-clean bytes —
  the internal panel is not self-sufficient and the layered defense
  earns its keep; three of the five were altitude-CALIBRATION items
  (membership rule vs fixture detail), the v0 line still settling as
  the revision predicted; (2) the 48 KB size advisory tripped even
  so (50.9 KB — drive-coverage armor, accept-with-note ratified);
  (3) the decisive evidence is deferred: per the P2b/P2c lesson the
  guarantee is only purchasable at the BUILT test bodies. Early
  verdict: both revision theses (fix-all default + exhaustivity
  grammar generating their own attack surface; fixture enumeration
  mis-altitudinal at spec time) are SUPPORTED on this first sample.

- 2026-07-17 · ch11-P3a post-build audit, first contact: RED — the
  packet's mutation boundary omitted docs/v3/implementation/plan.md,
  the R-ALIGNED-UP alignment carrier riding the same commit (the
  P1/ch8-P2 packets list it; the recreation missed it). THREE full
  panel rounds and the pre-build arm cleared the boundary "complete
  and minimal"; the deterministic audit caught it in seconds — the
  tier-0-scoping principle exactly as designed (machines own hard
  deterministic facts; lenses own prose). Candidate lens-5 duty
  sharpening for the boundary review: a packet whose header declares
  a prepared plan alignment MUST list plan.md in its boundary — a
  mechanical iff a lens can check by cross-reading two sections (or
  the packet lint could own it outright: header-alignment-declared ⇒
  plan.md ∈ boundary). Resolution: boundary extended, build commit
  amended, audit green at the amended sha.

- 2026-07-17 · ch11-P3a arm gate 2 (build-close, pin-conform
  gpt-5.6-sol/high/never, byte guards clean): REFINE citing 3dd3343b
  — SEVEN P2 findings, ALL the green-but-blind class at the BUILT
  bodies under correct packet lane texts (the P2b/P2c second
  occurrence's prediction confirmed on the first revised-process
  packet; the mandatory sensitivity pass earned its 2026-07-17
  promotion): two product gaps (unresolvable logRef; documentary
  R2 scalar refinements) + five test-evidence gaps (JSON full-row
  equality; grouped-lane missing halves/warn/local-suppression/
  __proto__/accessor rung; union compile probes + exact records;
  T1 JSON warn/block members; enumeration-insensitive exact-set).
  One aftermath round folded all seven (fix commit bd1a95c9,
  796 → 831 tests, boundary unchanged, audit green at its own sha);
  arm RE-CHECK CLEAN citing bd1a95c9 — the packet is DONE. This
  COMPLETES the effectiveness comparison's owed build-close half:
  the altitude line's spec-time lean form held (zero claim
  weakenings needed — every fix strengthened tests/product INTO the
  unchanged claims), and the build-close sensitivity pass carried
  exactly the load the spec-time economy shifted onto it — the
  two-sided evidence the boundary review should weigh: cheaper
  spec + a materially loaded gate-2 (7 folds) vs the pre-reset's
  spec-time enumeration churn (8+ rounds pre-build). Arm-yield
  ledger for the boundary: gate 1 five findings (three
  altitude-calibration), gate 2 seven (all built-body).

- 2026-07-17 · ch11-P3b authoring + gate 1 (the second packet under
  the 2026-07-17 revision): R1 FULL yielded ZERO content findings
  (10 P3 bookkeeping watchpoints batch-folded — mirror-map rows,
  wording precision, one reprint whitespace byte) — the first
  zero-content first round of the study; the fresh-implementer lens
  (§7 experiment, second run) returned a divergence-free restatement
  with an ambiguity list fully triaged to blindness-rule artifacts
  and declared build freedom (yield: 0 folds — two runs, zero
  catches; boundary-review input for the scale/retire decision).
  The human's flag round ratified F1 (the surplus-ref start-lane
  THROW) with independent reasoning matching the packet's. Arm
  gate 1 (pin-conform, byte guards clean): REFINE with FIVE folds
  on close-clean bytes — two REAL catches the internal panel missed
  (the S5 zero-side-effect bound over-wide for mixed pipelines —
  an inline-first pipeline reads the shared snapshot before the
  process arm; the W2 never-a-throw vs C26-durability conflict →
  the persistence-failure THROW lane minted), one boundary ripple
  (the two WorkflowInstance-literal fixture files — the REQUIRED
  instance field's type ripple beyond the createKernel sweep: a
  candidate lens-5 sharpening, "a REQUIRED field on a domain
  aggregate sweeps LITERAL CONSTRUCTORS, not just dep-injection
  sites"), one provenance narrowing (W2's placement demoted to
  realization guidance), one live-tree transcription fix (the
  read-surface trio). Arm re-check needed TWO passes (two residual
  mirror items after the first fold — the fold-completeness class
  at mirror grain). Build basis 4821271d; build commit f5f7cee1
  (831 → 907, one declared golden flip, boundary containment
  machine-clean, audit green FIRST run — the P3a plan.md lesson
  held).

- 2026-07-17 · ch11-P3b arm gate 2 (build-close, pin-conform,
  byte guards clean): REFINE citing f5f7cee1 — EIGHT findings, ALL
  test-evidence class, ZERO product gaps (vs P3a's two): the
  green-but-blind classes again (full-document wire equality over
  ordered history; the compile-negative family's missing members;
  S4/W2 whole-value equality incl. the re-open read; the M1
  bucket × verdict grid's three missing members; a JSON-key
  `__proto__` fixture that was own-key-blind — the real
  prototype-pollution form required; checker violation content +
  every-ref universality; hostile confinement fixtures). One
  aftermath round folded all eight (commit 1aa933b3, 907 → 917,
  two export-only production touches, boundary unchanged, audit
  green at its own sha); arm RE-CHECK CLEAN citing 1aa933b3 — the
  packet is DONE. Build-round friction line: an early
  sensitivity-probe revert via `git checkout` wiped uncommitted
  kernel edits (recovered; copy-backup reverts thereafter) —
  candidate build-loop rule: probe reverts on an UNCOMMITTED tree
  never use git-checkout, always copy-backup. Arm-yield ledger for
  the boundary: gate 1 five (two real content catches), gate 2
  eight (all built-body test-evidence — the sensitivity pass's
  load again, with the product-gap count falling 2 → 0).

- 2026-07-17 · ch11-P3b post-close analysis (the user's request — the
  interpretive layer OVER the two record entries above, captured as
  boundary-review input; the records carry the facts, this carries
  what they mean). (1) The internal zero-yield is AMBIGUOUS by
  construction: it cannot distinguish "the prior catch-classes
  migrated into authoring-time rules" (true — the P3a-born rules
  visibly shaped the P3b text) from "the internal panel shares the
  author's blind spots" (also true — same model family, duty lists
  grown from the same learning history); the ARM is the
  disambiguator, and its two content catches on close-clean bytes
  prove the correlated-reviewer ceiling is real. The internal
  zero therefore RAISES the transitional arms' value rather than
  arguing retirement: the residual risk now lives entirely in the
  band only a decorrelated reader reaches. (2) Catch-class
  taxonomy (what the arm asks that the panel does not): (a)
  OPERATIONAL SIMULATION — an ordering/side-effect claim verified
  by walking the live loop's execution, not by text-vs-text
  consistency (the S5 mixed-pipeline catch); (b) CONJUNCTION
  SATISFIABILITY — strong claims audited in PAIRS per failure
  mode, where two individually-clean sentences collide in a
  failure neither names (the W2 never-throw × C26-durability
  catch); (c) TYPE-CONSEQUENCE SWEEP over precedent-anchored
  search — a REQUIRED field on a domain aggregate sweeps literal
  constructors, not the prior packet's injection-site pattern
  (the boundary-ripple catch). Candidate lens duties for the
  boundary verdict: (a)→lens 3/5, (b)→lens 1, (c)→lens 5
  embedding duty. (3) Gate 2's role is MORPHING, not maturing
  away: its product-gap needle fell 2→0 (the spec→build bridge
  tightening) while the green-but-blind needle held 7→8 — that
  class is execution-undetectable in principle (green tests emit
  no signal; only adversarial assert-body-vs-row-meaning reading
  finds it) and scales with the test count, so gate 2 is becoming
  a specialized sensitivity auditor rather than a general
  reviewer. (4) The MEASURABLE prediction the boundary review
  should pre-register: if the (a)/(b)/(c) duties are adopted,
  gate 1's yield at P4 should FALL — a falling yield validates
  the catch→rule→internal-detector loop and licenses gradually
  narrowing the arm; a flat yield is evidence the
  different-question-generator property is not reducible to
  listed duties and the arm is load-bearing indefinitely. (5)
  Build-side candidate: derive the builder's red-on-break
  mutation-probe list SYSTEMATICALLY from the packet's family
  inventories (≥1 probe per declared family) instead of ad hoc —
  P3b's builder ran 3 ad hoc probes, gate 2 still found 8; a
  derived list would shift part of gate 2's recurring load to
  build time and make its residual yield the clean measure of
  the adversarial-reading premium.

- 2026-07-18 · ch11-P4 build-close records · the flagged-approve path ran
  its full arc: arm gate 1 RECLASSIFIED the Y6 CLI-classification row
  derived→new-decision (internal-1 proved equally anchor-conform — the
  entailment-vs-alternative-space lesson), demoting the predicted
  flag-free approve to the human path; the ratifier's own arm round then
  rejected the prefix-mapping MECHANISM against the two-load race
  provenance (the not-found 3-vs-1 split's culture) and drove the
  eager-pre-check realization (non-authoritative CLI mirror, kernel-S2
  authority, code-level inner-catch allowlist); arm gate 2 yielded 4
  test-evidence findings / 0 product (the green-but-blind class holding
  across packets); the builder STOPPed on a real boundary gap (the
  absence-consumer fixture) — resolved as a build-round packet
  correction. Gate-1 yield at P4: 7 findings — the P3b pre-registered
  falling-yield prediction is NOT yet testable (the candidate (a)/(b)/(c)
  lens duties were not adopted before P4); the prediction stays
  registered for the next chapter.
- 2026-07-18 · ch11 dogfooding checkpoint · RUN, not waived: a
  hand-authored gated template (threshold round>=2 on review/CONVERGED +
  the round declaration) driven through the shipped CLI end-to-end —
  validate ok; the gate BLOCKED at round 1 (rejected/gate_blocked/
  round_below_min, exit 3, round not burned); pass-back advanced the
  round; CONVERGED allowed at round 2 → DONE; detail/timeline carry
  round 2 + the retained allow decision; the required-runtimeContext
  start fails eagerly usage/2 with a clear message (the F1 decision
  live); a float-form threshold in a file yields a precise source-form
  finding. ONE observation → routed later-chapter (a ch9 map-row
  watchpoint): the gate-block Rejected surface names only the REASON,
  not the blocking gate's `uses` — a multi-gate operator cannot tell
  which gate blocked.
- 2026-07-18 · ch11 boundary review held · four verdicts: (1) the NUL-byte
  incident → GATE — `v3/src/drift/sourceHygiene.test.ts` (no raw control
  bytes in source files), which on its FIRST run caught a SECOND live
  instance (`storeCheckers.ts`'s idempotency composite key, re-escaped
  the same day) — the gate class validated instantly; (2) the
  instrument-divergence lesson → RULE R-INSTRUMENT-PROBE (instrument-
  robust sweep receipts; site lists over counts; divergent environments
  re-measure); (3) the absence-consumer blind spot → RULE
  R-ABSENCE-CONSUMERS (state-flipping fixtures sweep their CONSUMERS by
  name); (4) the map-extension mechanism (first exercise, §11.5's
  mandated verdict) → VALIDATED, with one minted duty (the extension act
  updates the "Chapters present" header — found stale at this close).
  The stale-header fix, the ch9 observability watchpoint, and the P3b
  interpretive-layer candidates (arm catch-class lens duties; the
  derived mutation-probe list) recorded; the latter two candidates go to
  the user's process-revision decision.

- 2026-07-18 · ch11 boundary — process-revision decision · the user ADOPTED
  both P3b interpretive-layer candidates: (1) the three arm catch-classes
  entered the internal panel's duty lists (conjunction satisfiability ->
  lens 1; operational simulation -> lens 3; type-consequence sweep ->
  lens 5); (2) R-DERIVED-PROBES minted — the builder's mutation-probe
  list derives from the packet's family inventories (>=1 probe per
  family, a build-report table; an unrunnable or green probe is a
  build-time finding), replacing ad hoc picks; arm gate 2's prompt
  audits the table henceforth. The P3b pre-registered prediction is now
  ARMED for the next chapter: if the duties + derived probes work,
  gate-1 and gate-2 yields should FALL; a flat yield is evidence the
  decorrelated external reader is load-bearing indefinitely — either
  outcome is a measurement, not a failure.

- 2026-07-18 · ch11 close — human-gate presentation discipline adopted · the
  user's direct experience verdict: the FIRST close presentation (one dense
  block, bundled decisions, codenames without meanings, implicit approval
  semantics) made participation nearly impossible; the stepwise re-run (one
  decision per message, self-contained stories, explicit role/risk
  statements, recommendations attached, closed vocabulary, roadmap first,
  one-word answers sufficient) was named a "super great experience" and
  ratified as the standing discipline for EVERY human decision point →
  canonical in README §6; AuthorPacket's presentation step points at it.

**2026-07-19 — the ch12 draft round + ratification act.** (1) The
loop's yield curve: 5 full panel rounds + 2 closes + the codex arm (2
full + 6 re-checks) + the ratifier's 6-step refine order; the arm's
distinct catches (canonical-JSON-safe value domains incl. the
`.nan`/`.inf` provenance crash; the early-READY loss → the
ordered-after-commit seam; the ADR-014 byte gap) were classes the
panel had not surfaced — arm-yield stays real at draft grain. (2) The
READY terminal-sink model gap (a post-CANCEL late READY would have
resurrected a cancelled run) was panel-found, user-ordered fix-first
(`76e34413`) — and its ripple sweep MISSED the §13 recap-row mirror
(caught by the ratifier; fixed `594c9c1e`): the R-ABSENCE-CONSUMERS
class repeated on the MODEL plane — section-prose guard recaps are
consumers too. (3) The first realized-chapter reopens ran (ch11
C18/C19/C21/C30, ch8 C14): the template §4 escape-hatch patch ratified
with the act; execution lesson — the choreography's "every commit
lint-green" over-claimed against the template's own loud-red
anchor-window rule, and one red intermediate state LANDED because the
lint ran behind a pipe that swallowed its exit code (fixup 7468b8fa):
a green-gate is EXECUTION (exit-code-gated), never narration —
R-EXECUTION's commit-gate face. (4) The template-only activation
stance survived 5 panel rounds + the arm and fell to the ratifier's
v1-capability test (the ideation dual-run) — the lenses check model
fidelity and internal consistency, but no lens owns "does this
foreclose a known PRODUCT capability?"; boundary-review candidate: a
v1-capability probe in lens 5's duty list. (5) The stepwise
presentation carried its second live run (README §6): the ratifier
split the bundled reopen into two semantic acts + a separate process
act — the act-atomicity-matches-meaning refinement is now precedent.

**2026-07-19 — ch12-P0 authoring, panel round 1 (boundary-review
route).** The ch11-gate-format C33 row's illustration quote
(`Rejected(gate_blocked(reason), evidence_refs)`, "model-verbatim
(the l2a HANDLE)") predates the `6dd8bd15` model fix and no longer
reproduces the unit it cites (the emission line gained
`gate: gate.uses`); C33's normative content (evidence propagation)
is untouched and the 2026-07-19 re-ratification carried the citation
forward unchanged (reopen scoped to C18/C19/C21/C30). Routed
boundary-review: a future ch11-gate-format touch refreshes the
C33/K4-class illustration quotes to the post-fix form (or marks them
"illustrative, defers to unit"); no reopen, no packet impact — all
five ch12-P0 lenses confirmed the additive field conflicts with no
ratified row's meaning.

**2026-07-19 — ch12-P0 build close (arm-yield data + a lens-duty
candidate).** (1) The ARMED falling-yield measurement's first ch12
data point: a CLEAN first-full-round five-lens panel was NOT
arm-parity — the pinned arm (gpt-5.6-sol/high; 1 full + 4 delta
re-checks) yielded 8 accepted content findings the panel and two
targeted re-runs had not surfaced (the G8 type-probe directions:
requiredness / value-type / immutability; the hard-stop-2 sizing
letter-trip; the shared-contract triage bucket; the renderer
inventory: the verbInject mislabel + verbReplay's EMBEDDED
outcomes), before returning CLEAN on the approve hash. Gate-2 yield
recorded at its own run. (2) Lens-duty candidate for the boundary
review: lens-5's renderer sweep classified `JSON.stringify(result)`
by its TOP-LEVEL argument type and missed the ReplayResult.outcomes
EMBEDDING (arm-caught) — "a document EMBEDDING the value counts as
a renderer" belongs in the type-consequence/sweep duty text. (3) The
in-session probe-restore was content-based (perl in-place + verify),
per the ch11-P0 lesson — zero uncommitted-work loss; one non-event:
a drifted shell CWD silently no-op'd the first probe batch (caught
by the 0-error tell — a probe that cannot have run is not a green).

**2026-07-19 — MODEL-TIER EXPERIMENT PRE-REGISTERED AND RATIFIED
(owner, in-session; the README §5.5 "later, explicit act" executed).**
Origin recovered from the v3-scoping transcript: the founding
derivation ("contracts are CREATED at plan/template work — errors
compound there → Fable-class; contract-consuming, machine-gated work
→ Opus-class", plus the corollary that EARLY implementation rounds
also warrant Fable-class because early code mints the idioms later
packets pattern-match) had never been repo-bound — only the
cost-framed reservation ("Fable-class reserved for exceptional
one-off planning") was. Both halves are now carried by
`model-tier-experiment.md`: a falsifiable, write-once protocol —
scope pre-named (IN: ch12-P2/P3; OUT: ch12-P1, the idiom-minting
split candidate, which stays Fable-class; EXTEND once: ch12-P4),
single variable (main thread only; Opus lenses + pinned arm
unchanged), baseline band frozen from ch11-P2a / ch11-P3b / ch12-P0
metrics, K1 escaped-defect / K2 two-strikes / K3 process-integrity
failure criteria with the adjudication default AGAINST the
experiment, verdict ADOPT/REVERT/EXTEND mandatory at ch12-P3 close,
ADOPT explicitly revocable. Capture-don't-fix note: this is an
ADDITIVE, owner-initiated protocol, not a mid-chapter process edit —
no ratified surface changed.

**2026-07-21 — ADR-015 EXECUTED: v3 plane consolidation
(`docs/v3/` → `v3/`).** The named one-time mid-chapter exception the
ratifying act sanctions (quiet window: ch12-P0 closed, ch12-P1
unauthored, no bubbles in flight). `docs/v3/` ceased to exist; the
tree is re-cut by role: the model corpus (formerly
`docs/v3/convergence/model-src/` + the core-model files) →
`v3/model/`; the ratified essays, research studies and topic memos →
`v3/design/`; the factory → `v3/implementation/` (internal structure
byte-stable; the whole tree moved as a unit). Re-homed authorities:
process README, plan, packets/, contracts/, arm-pin.md — all under
`v3/implementation/`; the ledger at `v3/model/ledger.md`. History
audits (D5/P8) stay green through the checker's ancestry-bounded
legacy-path alias (ADR-015 commit 2; `MIGRATION_PARENT` pinned in
the migration commit). The full reference census — every rewritten,
kept, and introduced occurrence with its disposition — is frozen in
`v3/implementation/adr-015-migration-report.md`; the two-run sweep
is `tools/v3-plan/adr015_sweep.py`. Capture, don't fix (routed to
the ch12 boundary): the implementation README §2 quotes stale
ledger inventory numbers (158 units / 85 rejections / 121 entities
— the ledger and the coverage checker's plan-§1.4 guard agree on
159 / 54 / 122); the defect predates ADR-015 and stays untouched by
this mechanical migration.

**2026-07-21 — ADR-015 arm series: fresh verification tooling needs
adversarial negative tests (boundary candidate for ch12).** A
user-directed three-round xhigh external-arm review of the ADR-015
migration implementation (bases d9845d4f → 7e39d4a1 → 9a949450;
APPROVE on round 3) found ZERO defects in the migration itself and
TWO false-green classes in the freshly written reconciliation tooling
(`adr015_sweep.py --post`): (1) count-closure circularity — expected
occurrence counts were computed FROM THE POST TREE (`lines.count`),
so deleting one of two identical kept lines passed with 0 errors;
(2) order blindness — content+count closure blessed a SWAP of two
different kept-historical lines. Both folded same-day (multiplicity
from the frozen table; subsequence-based order closure), each proven
by a scratch-commit negative test that now trips red. The pattern:
the tooling was proven green on the good tree but was never driven
to FAIL before commit — the checker-selftest discipline ("each claim
proves itself red on a fixture before it may gate") and the test
plane's R-LANE-SENSITIVITY ("declared disciplines DRIVEN and ABLE TO
FAIL") already carry this rule, and the same need surfaced
independently on the testing side as MUTATION TESTING: verification
code earns trust only by killing mutants. Boundary candidate: new
checker/reconciliation tooling ships WITH adversarial negative
fixtures (delete / duplicate / swap / typo mutations) in the same
commit, on the checker-selftest precedent.

**2026-07-21 — ch12-P1a: the first live 3:plateau, the arm's
record-precision catch class, and gate-2's blind-lane harvest.**
The ch12-P1 declared sizing split executed at ch12-p1a authoring
(P1a/P1b on the plan's expected seam; hard stops 1/2/8 on the
bundled row). Authoring ran 7 panel rounds + 4 reconciliations + 2
closes; the loop's process observations, each a candidate for the
ch12 boundary review:
(1) **The first live `3:plateau` STOP fired** (rounds 2+3 each ≤2
content, zero blockers) and was resolved "continue" by the user —
correctly: the pending residual was a REAL out-of-boundary
compile-break (the T3 TS-nullability ripple into three kernel
readers), so a plateau residual can carry a genuine defect; the
"close on judgment with dispositions" branch would have shipped it.
(2) **Gate-1 arm yield after a clean internal close: 6 findings + 3
record-precision re-check iterations** (a missing slice invariant,
the T4 type-shape pins, the plan-row understatement, family owners,
the header union — then sizing letter-trips 6/7/8 and
closure-proof universals). The internal panel had run 7 rounds
clean; the arm's catches were RECORD-level (sizing/claim-form
precision) — record-precision is an arm-shaped catch class, and an
internal reconciliation judging a universal "adequately scoped" is
weaker evidence than an arm reading it cold.
(3) **Gate-2 sensitivity harvest: 6 green-but-blind lanes + 1
product gap + 1 re-check catch** (the dev replay validator accepted
any token; split-transaction, per-column/per-conjunct, per-field
readonly, and drift content-lock mutations all stayed green under
the build's own 11-probe table). R-DERIVED-PROBES' ad-hoc-pick
warning confirmed at full strength: a probe TABLE derived from the
families still missed 8 blind mutations the arm's independent
derivation found — probe DIVERSITY (a second derivation pass) is a
boundary candidate.
(4) **Build-agent restore incident (recovered):** a probe restore
used `git checkout`, reverting a built file to its pre-packet
state; caught and re-built in-session, and a later orchestrator
spot-probe mis-pathed its backup and briefly left a mutation live
(caught by the paired verify step). The scratchpad-copy
restore-and-`cmp` discipline should be stated as a RULE for every
probe runner, agent and orchestrator alike.
(5) **The coverage both-ends rule surfaced:** `check_owners`
requires RECIPROCAL shared_ownership declarations while a co_owner
must be an existing packet — so a share with a future sibling is
declared by the SIBLING's commit on BOTH slices (the P1b/P2 plan
rows now carry the obligation; co_owner values are packet
FILENAMES). Also probe-proven: `--fold-time` defers the
owned==realized unit-map lock to default mode by design.
Metrics: 21 anchored / 9 derived / 0 new-decision; 1016 → 1041
tests; build commit `abaef93c`, aftermath `7294ae6b` + `1b0602a6`;
gate-2 final CLEAN.

## 2026-07-21 — ch12-P1b (activation machinery): the delegation-altitude gap, the ref-sync lint candidate, and the rule-accretion governance question

(1) **The delegation-altitude gap — the aftermath's dominant cost.**
The packet declared FULL-equality disciplines (per-op complete
instance literals, full journey legs); the test re-base was delegated
to build agents under a "do NOT weaken any assertion" rule — and the
agents faithfully PRESERVED the old suite's assert strength instead
of RAISING it to the declared level, while the Build record claimed
the declared level. Gate-2 caught the spec-vs-built gap as 8
test-evidence findings (the largest aftermath batch). Boundary
candidate (a PROMPT rule, zero new mechanism): when a packet declares
a discipline STRONGER than the existing suite embodies, the
delegation prompt QUOTES the discipline lines verbatim and states
"raise to the declared level" — preserve-don't-weaken is
insufficient exactly when the packet's whole point is stronger
proof.
(2) **Prose↔manifest ref drift — a mechanizable class.** Twice in
one loop a contract ref named in a row's prose closure was missing
from the machine face (the C9 anchor from G1/G2's manifest refs +
the header union; then C10 from the header union) — each cost a
fold+re-run. The class is exactly the packet-lint's existing
cross-lock pattern one step wider: verify every `contract:...#Cn`
cited in a row's anchored/derived closure appears in that row's
manifest refs and in the header union. Boundary candidate: LINT
extension (constraint → environment), retiring the finding class
from human review.
(3) **Enumeration completeness worked as designed — no rule.** The
T3 leaving-WAITING set missed FAIL; lens-3's text sweep caught it in
round one. Existing machinery sufficient; candidate declined at
capture time to avoid duplicating a lens duty.
(4) **WATCH: full-object-equality tests as hidden consumers.** The
G3 admission materialization structurally broke
`definition/validate.test.ts` (a canonical-example round-trip
asserting the ADMITTED value) OUTSIDE the declared boundary — caught
cheaply by the suite, boundary amended in-build. One occurrence,
tiny cost: WATCH only — a repeat promotes "equality-asserting tests
over changed functions' outputs join the type-ripple sweep" at a
boundary.
(5) **Arm timeout config note.** Both gate-2-class codex runs
exceeded the 10-minute foreground window (test-running sensitivity
passes are slower than doc reviews) and were backgrounded by the
harness — no loss, wall-clock only. Candidate: 20-minute timeout for
build-close arm runs in ReviewPacket §6's invocation note.
(6) **The rule-accretion governance question (user, 2026-07-21).**
Raised at the P1b close: evidence-gated addition still accretes —
every rule is individually justified by a real event, yet the
aggregate can drift toward scar tissue, and "stronger vs
Frankenstein" is hard to SEE statically. Captured as a boundary
agenda item with the session's candidate instruments: (a) RETIREMENT
as a first-class boundary verdict with the same standing as addition
(each boundary asks which rules fired zero times, got mechanized, or
duplicate a lens duty); (b) per-rule YIELD accounting reusing the
packet_metrics/detector-miss data the process already collects (the
arm gates' falling-yield experiment applied to the rule registry
itself); (c) admission bias: WATCH-first as the DEFAULT for
single-occurrence candidates (severity-weighted exceptions only),
and mechanize-or-decline preferred over new prose (prose rules carry
per-read attention cost; lint rules do not — the cap that matters is
the PROSE registry's size, not the rule count).
Metrics: 23 anchored / 18 derived / 0 new-decision; 1041 → 1121
tests; panel 3 rounds + clean close; gate-1 8 findings (2 re-checks
to CLEAN), gate-2 11 findings (2 product) + 1 re-check residual;
build commit `6aec56d4`, aftermath `fb1adcfa` + `db452cda`; gate-2
final CLEAN.

- 2026-07-22 · ch12-P2 build (L0c run profile) · build-session capture.
  (1) **Detector-miss — T4 consumer sweep under-enumerated a typed
  CONSTRUCTOR site.** The `Step.agentConfig` type flip (`unknown` →
  `AgentConfig`) compile-forced an `as AgentConfig` cast in
  `definition/validate.ts`'s V9 materialization, but the packet's T4
  unknown-slot sweep enumerated only READERS of the renamed fields, not
  a typed Step-object CONSTRUCTOR site — so `validate.ts` was absent from
  the mutation_boundary and the boundary was extended at build. Boundary
  candidate (a spec rule, no new mechanism): the T4 "unknown-slot
  consumer sweep" must explicitly include CONSTRUCTORS of the flipped
  type (sites that BUILD a `Step`/`ContextPacket`/entry), not only field
  readers — a compiler-forced site the value-ripple search misses because
  it is not a field access. Recorded as `detector_misses` on the packet.
  (2) **The C7 narrowing re-based ch8-C14 V9 fixtures to rejection — as
  designed, but worth a WATCH.** Three ratified V9/V15 validate tests
  flipped: two "lossless numeric/typed-distinct/`__proto__` agentConfig"
  cases now REJECT at admission (a non-string-keyed agentConfig
  materializes as a JS Map = not a plain map), and the cyclic-agentConfig
  accumulation test grew 3→4 findings (the admit canonical lane also
  fires). The F7 cross-rung accumulation (validate walk + admit findings
  merge under stage "validate") is what surfaced the admit findings in
  `expectValidateErr`; a re-basing author must know the admit rung's
  findings ride the "validate" stage. No rule — the narrowing is
  ratified (A3) and the re-bases are faithful; captured so the ch12
  boundary review sees that a value-domain narrowing lands its
  behavior-change in the OTHER stage's test suite.
  (3) **The value-ripple is invisible to typecheck.** The `packet: {…}`
  `toEqual` literals (cli/journey/kernel) failed only at the suite run,
  never at typecheck — the T4 "value-ripple the compiler does not catch"
  note held exactly. The shared `startOne` helper concentrated 24 of the
  27 cli re-bases into ONE literal edit (the ergonomic payoff of a shared
  expected-doc helper).
  Metrics: 17 anchored / 4 derived / 0 new-decision; 1136 → 1151 tests;
  flag-bearing approve (FLAG-1, human-ratified 2026-07-22:
  approve-ratified + FH-1 deferred); build commit `0e094ccb`; post-build
  boundary audit CLEAN; build-close external arm gate PENDING.

- 2026-07-22 · ch12-P2 build-close · **process-instruction candidate: the
  agent framed an agent-invokable, checkable gate as a USER decision.**
  At the build-close external-arm step the agent STOPped and asked the
  user "you run it / I try / waive" WITHOUT first checking whether the
  `codex` CLI was available — even though (a) the AGENTS.md text it had
  just quoted says the arm is "agent-invoked", (b) arm-pin.md + ReviewPacket
  §6 give the exact `codex` invocation, and (c) `which codex` is a <10s
  check (the tool WAS present, 0.145.0). Root cause: the arm is described
  BOTH as "agent-invoked / mandatory" AND as "the USER's manual arm / an
  OPTION" — coordinate options with no DEFAULT and no decision procedure —
  and "unavailable arm = STOP" has no antecedent "first VERIFY
  unavailability". Plus a conceptual conflation: "I am not the cross-model
  arm" (true) slid into "so I cannot INVOKE it" (false — invoking codex ≠
  being the model). Four candidate edits for the boundary review (NOT
  applied — captured here per capture-don't-fix):
  (1) **README §5.5 — reverse the emphasis:** agent-invocation is the
  DEFAULT on the measurement/autonomous path (mechanics: §6); the
  user-manual arm is the FALLBACK when the availability check fails;
  which form runs is decided by the §6 check, not offered as a user
  choice. Retires the "an OPTION, not a mandate" framing that licenses
  the ask-the-human default.
  (2) **README §5.5 + AGENTS.md — "unavailable" is a CHECK result, not an
  assumption:** an arm is unavailable ONLY after the §6 preflight FAILS;
  the agent MUST run the availability check (`which codex` + arm-pin
  match) and attempt the invocation first; a STOP must CITE the failed
  check. Closes assume-then-STOP.
  (3) **ReviewPacket §6 — disambiguate at the source (one line):** the
  external arm is a DIFFERENT model reached THROUGH the `codex` CLI; the
  authoring agent does not BECOME it but DOES invoke it — being a
  different model is the POINT of the gate, not a reason to hand off.
  (4) **Meta-rule (candidate for the global NEVER-ASSUME table):** name
  the assume-then-ASK sibling of assume-then-ACT — "asking the user is
  itself an action that can rest on an unchecked assumption; before
  presenting a step as a user decision, verify it isn't something you can
  execute or check yourself (`which <tool>` / read the mechanics doc). A
  checkable capability is not a question." Highest-leverage pair: (2) closes
  this gate locally, (4) generalizes past the arm to every "this needs the
  user" moment. Provenance: the user pressed on WHY the question was asked
  rather than accepting the correction — the reflection is the artifact.

- 2026-07-22 · ch12-P2 gate-2 (build-close arm) yield · agent-invoked
  codex (gpt-5.6-sol/high, approval=never; byte-guard clean both sides;
  all commands green incl. v3:test 1155, ledger byte-identical) returned
  8 × P2 on the build bytes: 1 product (the resolver leaked
  `runOverrides[stepId]` for an unreachable non-step id — a non-uniform
  R4) + 6 test-evidence (all the SAME green-but-blind class the P1b gate-2
  caught: a single-key byte fixture, a `{}`-only read-surface, a
  source-layer-only purity check, a missing per-conjunct / fact-side
  class-iff, a missing fact compile probe) + 1 packet-docs (the
  R-DERIVED-PROBES table unmaterialized). ALL folded; the re-check on the
  folded bytes (hash `2da29272…`) was CLEAN. **The P1b lesson repeated
  EXACTLY** — the internal Opus panel approved a suite whose lane TEXTS
  were correct but whose built BODIES could not fail; the cross-model
  build-close arm is the only gate that caught it, for the second chapter
  running. Two boundary-review data points now: (a) the arm-yield is
  concentrated in test-sensitivity, not product correctness (1/8 product,
  and that one unreachable) — the internal panel's spec-vs-build altitude
  line (findings demanding fixture-level enumeration are deferred-to-build
  BY RULE) is systematically PUSHING this work to the build-close arm, as
  designed, but the arm is a slow/expensive cross-model run; (b) candidate
  worth weighing at the boundary: a CHEAP internal "mutation smoke" — a
  scripted `git`-stash-free perl-mutate → run-targeted-test → assert-red →
  revert harness over each acceptance family's ONE canonical lane, run by
  the author BEFORE the arm, would catch the single-key/`{}`-only/
  source-layer-only class internally and leave the arm to find the subtler
  ones — turning the R-DERIVED-PROBES table from a build-close deliverable
  into an author-time gate (constraint → environment). The 20-minute
  arm-timeout candidate (P1b log item 5) did NOT bite here: both runs
  (gate-2 ~250k tokens, re-check ~99k) finished inside the 10-min
  foreground window.

- 2026-07-22 · ch12-P3 pre-approval · the ENTRY-MODE / authorization
  ambiguity (sibling of the same-day arm-invocation ask-the-human entry
  above — same family: "when does the loop stop for the human vs proceed
  autonomously"). At ch12-P3 the agent classified the packet FLAG-FREE
  (0 new-decision, flags None, tier-0 green, clean close, not
  first-of-a-kind, measurement stage) — which README §5.5 makes an
  AUTONOMOUS approve from ch8 on: proceed to build THROUGH the two arm
  gates, the loop stopping only at STOP / flag-bearing approve /
  first-of-a-kind. The agent nonetheless STOPPED and asked the user to
  approve the build. The stated reasons: (a) the "entry mode is the trust
  dial" clause (README §5.5 / AGENTS.md — the user chooses per work item,
  prompt-by-prompt vs delegating a whole packet/chapter), read off the
  opening "jöhet a ch12-P3" as prompt-by-prompt; (b) the global
  never-assume rule (build is the consequence-terful step → a commit); (c)
  the human-gate-presentation memory. **The incoherence the user flagged:**
  once flag-free is established, the process DEFAULT is autonomous build,
  NOT a stop — so the pre-approval-then-STOP was a DISCRETIONARY human gate
  the process does not require here, added SILENTLY (defaulted, not asked)
  rather than either (i) proceeding autonomously per the letter or (ii)
  asking the ONE entry-mode question explicitly. The root cause: the
  trust-dial has NO explicit encoding — "jöhet a chN-pM" is genuinely
  ambiguous between "author+review, stop at the approve" and "delegate the
  whole packet through build," and the agent resolved the ambiguity by a
  silent conservative default. Candidate edits for the boundary review
  (NOT applied — capture-don't-fix):
  (1) **Define an explicit ENTRY-MODE convention (AGENTS.md V3 section +
  the CreateTaskPacket/ExecutePairflowPlan skills).** The user's OPENING
  PROMPT encodes the trust dial with a small closed vocabulary, e.g.:
  present-and-stop-at-approve (prompt-by-prompt: "review/jöhet a chN-pM")
  vs autonomous-through-build ("menj/delegáld a chN-pM", or a standing
  "autonóm módban a fejezet végéig"). A per-item token overrides a standing
  mode. This is the user's own offered fix ("egy jobb indító prompt a
  részemről") — the convention makes it cheap and unambiguous.
  (2) **Name the DEFAULT explicitly when the entry mode is undetermined
  for a flag-free approve** — so the agent never silently defaults. Two
  legal resolutions, one must be chosen at the boundary: EITHER the
  process letter (undetermined ⇒ proceed autonomously, the §5.5 default)
  OR a single explicit entry-mode question ("prompt-by-prompt vagy
  delegálod a buildet?") — but NOT a silent full-gate-then-stop that reads
  as if the process required it. The agent DID make its reasoning visible
  in-chat, which is the mitigating half; the defect is the classification
  (flag-free ⇒ autonomous) and the behavior (stop) diverging without the
  divergence being named as a CHOICE.
  (3) **Tie to the same-day meta-rule (arm-invocation entry item 4):**
  "asking the user is itself an action that can rest on an unchecked
  assumption." The entry-mode stop is exactly that class — a silent
  assumption that prompt-by-prompt ⇒ stop-at-approve. Highest-leverage
  pairing: (1) gives the user a cheap way to SET the dial; (2)+item-4
  stop the agent from GUESSING it. Provenance: the user asked why the
  agent requested permission the process does not require, then asked to
  capture the clarification as a boundary-review retro — the reflection
  and the proposed opening-prompt convention are the artifact.

- 2026-07-22 · ch12-P3 gate-1 arm · a DETECTOR MISS (the internal panel
  cleared a P0 contract-faithfulness gap) + a human-surfaced canonical-row
  fold, both retro-worthy. Context: the user's "build ch12-P3" resumed the
  packet from its (flag-free, internally-clean) pre-approval point and ran
  the mandatory autonomous-path APPROVE-gate external arm (README §5.5;
  first agent-invoked gate-1 on this packet). Arm mechanics: the pinned
  reviewer (gpt-5.6-sol / high, arm-pin ch8 row) timed out on the first
  10-min foreground run (~8385 lines of exploration, no verdict — an infra
  failure, §6 item 8), the byte guard stayed intact (READ-ONLY honored),
  and the ONE retry with a tightened verdict-first prompt returned a
  hash-citing verdict in ~85k tokens: **FINDINGS**, 4 items.
  **The catch that matters (finding ①, P0):** the packet's requirement
  value-domain (T1/R1) materializes the `RuntimeContextRequirement` at the
  KERNEL READ (a raw-vs-view belt), but ratified C4 says "MATERIALIZED once
  at admission (the admitted template carries `none` or the normalized spec
  — no absent state downstream)" and plan §12.1 says the requirement is
  "ON the template"; the packet leaves `undefined` on the admitted template
  and derives `none` at each read. The packet's T1 DERIVATION NOTE defended
  read-belt (claiming admission-materialization would force `admitTemplate`
  from "normalize value, keep shape" into "transform shape") — and that
  defense is UNFOUNDED: the `activation` precedent (`admit.ts:409`,
  `activation: template.activation ?? { mode: "immediate" }`) already
  normalizes a value at admission WITHOUT a shape transform; the identical
  move (`absent → none`) conforms to C4 and dissolves the note's concern.
  The internal Opus panel had cleared the packet; the arm caught the gap.
  This is exactly the gates' ground (README §5.5: "the ch8-P1 measurement
  — real catches the internal panel missed") and feeds `detector_misses`.
  **The miss's lens home:** lens-2's derived-row entailment attack +
  draft→packet semantic-drift duty — a `derived` row whose in-row note
  DEFENDS a realization AGAINST a ratified row's plain-language default is
  the soft spot; the panel accepted the derivation prose without testing
  it against C4's literal text AND the nearest realized precedent.
  BOUNDARY-REVIEW CANDIDATE: make lens-2 MANDATE, for any `derived` row
  citing a contract anchor whose note argues away from that anchor's
  literal default, an explicit "does the anchor's plain text + the nearest
  realized precedent contradict this derivation?" check — the finding-①
  class. The other three: ② (P1, genuine) the SM completion-release test
  inventory omits the S4 port-breach conclusion path C15 requires (a
  driven-but-incomplete family — fold); ③ (arm-graded P0, agent-regraded
  P3) SM3's "explicit per-request_id buffer, no microtask" over-mandates a
  data structure where C15's five observable rules only entail
  conclusion-signalled delivery (the arm's latch alternative is an INSTANCE
  of the entailed property, not a competing decision — narrow, not a
  new-decision STOP); ④ (P2) `RuntimeContextProjection = Record<string,
  unknown>` narrows C15's "canonical-JSON-safe value" to object-only
  (minor value-domain — broaden or annotate). Agent adjudication: all four
  are ordinary external-arm folds (every fix DETERMINED by ratified
  C4/C15, none a genuinely-open-choice STOP), so §5.5's letter is
  fold-autonomously → re-review → re-run gate-1 → build on clean.
  **Why the human was nonetheless asked (the user affirmed it "tök oké"):**
  finding ① reworks a CANONICAL row (T1/R1) AGAINST the author's documented
  rationale and is a ratified-contract-faithfulness call — surfaced as an
  EXPLICIT recommendation-first choice (fold all four / pause on ① / fold
  ①②-only), never a silent rework and never a silent stop, applying the
  same-day entry-mode meta-rule (the entry above, candidate 2: name the
  choice, don't silently default). The DISTINCTION from that pre-approval
  incident is load-bearing and worth pinning: there the gate was CLEAN
  (flag-free ⇒ autonomous, so the stop was unwarranted); HERE the gate
  returned P0 FINDINGS (the autonomous path's clean-arm precondition
  unmet), so pausing to let the human weigh a canonical-row rework against
  a ratified contract is warranted, not the prior anti-pattern. The rule
  the pairing suggests: an arm-gate FINDINGS verdict whose fold rewrites a
  canonical row on a ratified-faithfulness question is a legitimate
  recommendation-first human touchpoint even when the fix is
  process-"ordinary" — the surfacing is about the AUTHOR-vs-ARM contract
  dispute, not about re-deciding autonomy. Provenance: the user asked for
  this retro before authorizing the autonomous fold (option 1); the
  detector-miss + the boundary-review candidate are the durable artifacts,
  and the gate-1 findings' folds land in the packet's own Build-record
  aftermath.

- 2026-07-22 · ch12-P3 gate-1 arm · CONVERGENCE CHRONICLE + a SECOND
  detector-miss class (a ratified `type/schema` disposition that no
  structural type actually delivers). The autonomous-path APPROVE-gate arm
  (gpt-5.6-sol/high) took SIX verdict rounds to converge to CLEAN (one
  10-min timeout first, an infra retry; then FINDINGS×5 → CLEAN), the yield
  monotately decreasing: 4 (2 P0) → 2 (P1) → 2 (P1) → 1 (P1) → 1 (P2
  bookkeeping) → 0. Each round: fold → fresh-context lens-4 reconciliation
  (all CLEAN but one bookkeeping ref-sync) → hash-citing re-check. Total
  ~6 arm runs (~90–110k tokens each) + 4 reconciliation sub-agents. The
  folds, in order: ① requirement materialized AT ADMISSION not at read
  (P0, the C4-faithfulness miss captured in the entry above); ② the SM
  completion-release inventory gained the FAILED/non-commit lane (C15's
  "released when the attempt failed" — the success-only inventory could
  pass an impl that drops a held completion on the S4 port-breach path);
  the SM3 "explicit buffer" MANDATE narrowed to the entailed PROPERTY
  (conclusion-signalled delivery — a latch is an admissible equivalent,
  only the microtask-FIFO is foreclosed); the SM3 release TRIGGER made
  PER-ATTEMPT (a CAS-superseded id releases at ITS attempt's conclusion,
  the call-end `try/finally` a backstop) + a throwing `commitLifecycle`
  added to the exit inventory; and the T2 SAGA (below). **The second
  detector-miss class (boundary-review candidate):** the internal panel
  cleared T2 typing `RuntimeContextProjection = Readonly<Record<string,
  unknown>>` and D3 claiming that RENDERS `projection-never-the-ref` at the
  type (`type/schema`, per the RATIFIED invariant-disposition-map.md:66).
  But a `{kind, locator}` `RuntimeContextRef` is STRUCTURALLY assignable to
  `Record<string, unknown>` — so the object type NEVER type-excluded a raw
  ref; the ratified `type/schema` disposition was UNREALIZED by the
  packet's type, undetected by the panel. The arm's iterative pushback
  (Record narrows C15's "value" → `unknown` (non-narrowing, but now NOTHING
  is type-enforced, the collapse making D3/Acceptance §T's compile-error
  claim FALSE) → the reconciling answer: a declared-unique-symbol BRAND (the
  codebase `AdmittedTemplate` idiom) — nominally DISTINCT from
  `RuntimeContextRef` so a raw ref is a genuine TS2322 compile error
  (realizing the ratified `type/schema`), yet compile-time-only so the value
  domain stays unconstrained (non-narrowing)). NEITHER the packet author NOR
  the internal panel found the type/schema-vs-structural-type gap; the
  cross-model arm did, over three T2 rounds. LESSON for the boundary review:
  a disposition-map `type/schema` claim is a CHECKABLE obligation — does the
  named type NOMINALLY exclude the forbidden value (a brand), or only
  structurally coincide (a `Record`/`unknown` that a sibling shape satisfies)?
  Candidate: lens-2/lens-3 gains a "type/schema disposition realizability"
  check — for every invariant the packet declares `type/schema`, name the
  type and confirm it genuinely excludes the invariant's negative, not merely
  documents intent (the Record-accepts-a-ref class). Both ch12-P3 gate-1
  detector-misses (the C4 materialization point, the projection brand)
  are TYPE-LEVEL faithfulness gaps the Opus panel's projection lens read
  past — the measurement-stage evidence that the cross-model arm's decorrelation
  earns its cost. The arm's own verdict prose turned Hungarian at the CLEAN
  round ("A packet approve-ready") — a model-language drift, cosmetic, noted.
  Provenance: the six-round gate-1 leg under the user's option-1 authorization;
  full round transcripts in the session scratchpad, folds in the packet bytes
  (basis hash 58a0cca8), metrics to land in the Build record at close.

- 2026-07-22 · ch12-P3 build-execution-context · a BOUNDARY-REVIEW
  question the user raised explicitly (settle it, don't leave it to
  per-run discretion): WHERE does the BUILD run — the main agent context,
  or a fresh-context sub-agent? The process is SILENT. README §4's build
  loop (read spec → TDD → implement → drift → review → commit →
  post-build audit) and §5.5's arm gates specify the STEPS and the
  human/autonomy envelope, but NOTHING names the build's execution
  CONTEXT. Practice so far has been INCONSISTENT/unrecorded — the user
  believes some prior packets were built IN the main context; this is not
  captured anywhere, so the boundary review should first ESTABLISH the
  actual history (grep the packet Build records / session notes) before
  deciding. THE TRIGGER: at ch12-P3, after the six-round gate-1 leg
  (~600k+ tokens of arm rounds + reconciliation sub-agents) heavily
  consumed the main context, the agent proposed DELEGATING the build to a
  fresh-context sub-agent fed the self-contained packet, reserving the
  main context for orchestration + verification + gate 2; the user
  accepted for THIS run but flagged that the general practice is
  unsettled and "could be a general best practice" worth ratifying.
  THE CASE FOR fresh-context-delegated build as the STANDING practice:
  (1) the packet is SELF-CONTAINED BY DESIGN (§5.3 — "self-contained for
  its operative set"), so a fresh context fed only the packet is EXACTLY
  the artifact's intended consumer, and a clean build is itself a live
  test of the §5.3 self-containment claim (the fresh-implementer lens §7
  tests comprehension; a fresh-context BUILD tests executability);
  (2) DECORRELATION — the author/gate context should not build its own
  bytes, mirroring the fresh-context PANEL principle (the author's
  context never scores its own bytes clean; the same logic says it
  should not implement them either, carrying invisible assumptions);
  (3) a heavy gate leg DEGRADES the main context (context rot) right when
  the build — the most code-dense step — begins, exactly backwards;
  (4) it is a natural STEP TOWARD the ratified CHAINING stage (§5.5 —
  "chapter-level delivery through ExecutePairflowPlan, pairflow
  doc-bubbles carrying refinement and implementation"): a doc-bubble IS a
  fresh execution context, so delegating the build now rehearses the
  target architecture. THE CASE AGAINST / open questions for the review:
  (a) FIDELITY — does a fresh agent lose the fold-context nuance (e.g. the
  ch12-P3 branded-projection / admission-materialization / per-attempt
  subtleties)? Mitigation: the packet bytes now ENCODE those decisions
  (that is what the folds did), and the orchestrator can hand explicit
  build-guidance notes; but the review should decide whether such notes
  are standardized; (b) ATOMICITY/SCALE — one sub-agent for a ~45-file
  TDD build (one commit) is a large unit of work with its own context
  limits; does it need staging (types→ports→kernel→…), and if staged,
  who guards the one-packet-one-commit boundary and coherence?
  (c) VERIFICATION BURDEN + AUTHORITY — the orchestrator must rigorously
  verify the delegated output (typecheck/lint/tests/drift/post-build
  audit) and run gate 2; is the build-close arm gate SUFFICIENT to catch
  a fidelity slip, or does delegation need an extra check? (d) COST — a
  fresh full-budget build agent plus verification vs an in-context build.
  PROPOSED RESOLUTION SHAPE (for the review to accept/amend/reject): make
  build-execution-context an EXPLICIT, RECORDED field of the build loop —
  DEFAULT to fresh-context-delegated build (the four reasons above), with
  the packet Build record noting the execution context used and any
  build-guidance notes handed over, so the choice is never silent; the
  main context retains orchestration, verification, and both arm gates.
  This is the same meta-shape as the same-day entry-mode retro (name the
  default, don't silently default). Provenance: the user paused the
  ch12-P3 build specifically to lodge this as a boundary-review item,
  agreeing to run THIS build fresh-context while the general practice is
  ratified at the ch12 close.

- 2026-07-22 · ch12-P3 gate-2 (build-close) · the arm caught a REAL PRODUCT
  BUG the internal panel, gate-1, AND the initial fresh-context build all
  missed — the strongest measurement-stage datum yet for the build-close
  arm gate. The bug: the ordered-after-commit completion seam (SM) held +
  flushed a provider READY that arrived BEFORE the START attempt concluded,
  but a READY arriving AFTER conclusion (the NORMAL async path — a real
  provider provisions and fires READY long after START returns) was buffered
  and NEVER re-flushed → the completion was lost forever, the run stuck
  `requested`. The packet's SM1–SM3 only described the pre-conclusion HOLD;
  the post-conclusion direct-delivery path was absent from the contract, so
  the build faithfully realized an INCOMPLETE contract. Fix: a `concluded`
  set routes post-conclusion completions to a DIRECT delivery + a
  `settle`-drain; the SM contract now states TWO temporal paths. TWO
  boundary-review candidates from the gate-2 leg (both feed
  `detector_misses`, both a class the panel's lenses structurally miss):
  (1) **operational-simulation of ASYNC seams** — the panel's SM review
  reasoned text-vs-text about the hold, never WALKED the post-conclusion
  delivery timeline (the operational-simulation lens, ch11-arm catch-class
  (a), applied to a delivery seam would have caught it); the model prose's
  "async → later fires" is exactly the post-conclusion path the packet
  under-specified. (2) **the abort-on-throw-drop class** — BOTH sequential-
  await-in-a-loop buffer consumers (`settle` and `concludeAttempt`) dropped
  later held completions when an earlier `readyOp` threw at the transport
  gate (SM2 unconditional never-dropped violated); the arm found BOTH twins
  across re-checks. Candidate: a lens/arm probe for "a loop of awaited
  fallible deliveries that aborts on the first throw" against any
  never-dropped/all-delivered contract. **Gate-2 convergence cost + the
  fresh-build-fidelity datum:** the build-close leg took 7 arm rounds
  (yield 6→6→2→1→1→2→P3, closed on the diminishing-returns cutoff at a
  bookkeeping-only round). The fresh-context-delegated build (the b8ceeb69
  boundary item) was substantively correct BUT: it shipped the async-post-
  conclusion bug (an incomplete-contract realization, not the agent's
  fault — the packet lacked the path), and its aftermath folds needed
  ORCHESTRATOR correction on subtle async correctness (the `void
  delivery.finally` unhandled-rejection + drain race; the drain error-path
  concurrent-arrival; both never-dropped twins) — the orchestrator wrote
  those production fixes, the agent wrote the tests. So the fresh build
  splits cleanly: the AGENT owns the bulk mechanical realization + the
  test bodies (with fail-first receipts), the ORCHESTRATOR owns the subtle
  async/robustness product fixes + the packet-contract reconciliations +
  the mirror propagation (the finding-6 shipped-CLI ripple, the SM two-path
  contract). This is a concrete answer to the b8ceeb69 "who owns the fixes"
  open question: the build-execution-context convention should NAME this
  split (agent = realization + tests; orchestrator = subtle-correctness
  fixes + contract reconciliation), not leave it per-run. Provenance: the
  gate-2 build-close leg under the user's option-1 (finding-6) and
  fresh-build authorizations; the detector-misses + learned live in the
  packet's `packet_metrics`, the build-record aftermath carries the folds,
  and this line carries the boundary-review candidates.

- 2026-07-22 · ch12-P4 arm gate-1 · BOUNDARY-REVIEW ITEM (user-raised, the
  process-reliability question) — the external arm keeps catching REAL
  errors in our own artifacts (this gate: the CLI exit-matrix based on the
  wrong outcome union; earlier: the ch12-P3 gate-2 product bug, the ch11-P2
  green-but-blind test bodies). That the arm catches them is the arm working
  as designed. But the user's deeper worry: if we can author WRONG artifacts
  — especially WRONG TESTS (the safety net itself) — and the arm is not
  guaranteed complete, how much can the process be trusted? Frame the
  improvement space on the user's two axes: (A) GUIDANCE (the inputs —
  context/prompts/skills/model choice) reduces the error RATE at source;
  (B) FEEDBACK LOOPS (panel, arm, sensitivity pass, drift/coverage/typecheck)
  bound the DAMAGE after an error is made but do not lower the rate. The
  question the boundary must answer per recurring class: is it GUIDANCE-
  REDUCIBLE (a nameable rule front-loads the catch) or IRREDUCIBLE (a diffuse
  slip — accept it, rely on defense-in-depth + measure yield)?
  CLASSIFY THIS SESSION'S ARM CATCHES as the working data:
  (1) the exit-matrix miss = a SUBSTRATE-ASSUMPTION class — reasoned from a
  plausible SIBLING (the actor `Outcome` union) instead of READING the actual
  lifecycle outcome unions (`domain/outcome.ts`). The Substrate Reality Probe
  / R-DERIVED-PROBES discipline exists for parser/OS substrate but was NOT
  applied to a CODE-substrate (a type/enum union a claim rests on). GUIDANCE-
  REDUCIBLE candidate: extend the substrate-probe rule EXPLICITLY to type
  unions / enum domains / outcome vocabularies — "a claim resting on a union's
  membership READS the union, never assumes it mirrors a sibling." This is a
  test-relevant class: a test authored off the wrong union asserts the wrong
  exit code and can pass a wrong build.
  (2) the R1 derived→new-decision miss = an ENTAILMENT-ATTACK-DEPTH class —
  the internal lens-2 tested R1 against its cited anchors but not against the
  full space of conforming alternatives; a W1 watchpoint was carried but not
  ESCALATED. GUIDANCE-REDUCIBLE candidate: when a derived row is ALSO carried
  as an openness watchpoint, that pairing is itself the escalation trigger
  (a watchpointed-derived row is a latent new-decision — run the entailment
  attack to exhaustion at authoring, or pre-classify new-decision).
  THE INDEPENDENCE PRINCIPLE (the reliability answer, for the boundary to
  ratify or refine): no single fallible loop is trusted to be complete; the
  reliability comes from loops whose errors DO NOT CORRELATE — the arm is a
  DIFFERENT model (decorrelation), the sensitivity pass asks a DIFFERENT
  question ("can this test FAIL?" not "is this test present?"), the drift/
  coverage/typecheck gates are MECHANICAL (no LLM). Defense-in-depth over
  DIVERSE loops is what makes the union reliable even when each part errs;
  the guidance investment should target the classes that are reducible, and
  the measurement (arm YIELD by class over chapters — the ARMED falling-yield
  prediction this chapter already tracks) is the evidence of whether guidance
  is working vs whether a class is irreducible. SPECIFIC ASK FOR THE
  BOUNDARY: (a) adopt or reject the two guidance candidates above (the
  code-substrate probe extension; the watchpointed-derived escalation
  trigger); (b) decide whether TEST-CLASS arm catches deserve their OWN yield
  bucket (separate from product / packet-docs / test-evidence) so the
  test-safety-net-reliability signal is measurable directly; (c) record the
  independence principle as the standing answer to "can we trust the process"
  — the honest position is bounded-trust-via-diverse-redundancy, not
  any-single-loop-completeness. Provenance: the user raised this mid-ch12-P4
  approve while reading the arm-gate-1 fold summary; capture-don't-fix — the
  verdict is the ch12 boundary review's.

- 2026-07-22 · ch12-P4 build · BOUNDARY-REVIEW ITEM (user-raised, "just an
  interesting point") — the artifact-linkage cost/benefit question: the code
  and docs carry MANY cross-references (in comments and prose), and it is not
  obvious which we actually BUILD ON (functionally rely on) vs which are
  decorative, nor how to weigh the upkeep cost of maintaining all these tiny
  links against their benefit. Frame for the boundary: the references are NOT
  one thing — they split into THREE classes with very different economics.
  (1) MACHINE-CHECKED load-bearing refs — the packet manifest's
  `contract:chN-<surface>#Cn` anchors, the `mutation_boundary`, the coverage
  `ledger_slice`, the `ADR-NNN` refs. Tooling VERIFIES them (packet-lint,
  check_coverage, adr-check); a stale one goes LOUD-RED. We build on them; the
  upkeep cost is bounded BY the check (rot cannot hide). High benefit
  (provenance + drift detection), low residual cost. (2) HUMAN-CHECKED
  load-bearing prose anchors — "P3-built", "aligned at ch12-p4 pre-approval",
  "the ch11-C6 grammar reuse". These carry MEANING a reader/implementer needs
  (where a rule lives, why a value is what it is) but are NOT machine-verified;
  they can go stale SILENTLY (comment rot). This is the user's worry class.
  (3) POINTER/scaffolding comments — "until P4", "deferred to P4 (C25)",
  "P4's format walk". TEMPORARY to-do markers that RETIRE when the future
  arrives (this very packet retired a batch: admit.ts 291/325/335/442,
  template.ts 84/140/172/181/183, main.ts 308). Cost: the retirement SWEEP can
  MISS them (the ch11-P4 instrument-blindness lesson — wrapped/em-dash/
  NUL-classified comments; R-INSTRUMENT-PROBE was born there). THE PRINCIPLE
  for the boundary to ratify: a reference is worth its upkeep IFF
  benefit(link) > rot-risk × miss-cost; MACHINE-CHECKING flips a ref from
  "silent rot" to "loud red" (what makes class 1 cheap), so the lever is —
  convert high-value HUMAN-checked refs (class 2/3) to machine-checked (class
  1) where the value justifies the tooling, and where it does NOT, prefer to
  DROP the ref (R-PRESENT-TENSE: the operative path speaks present, provenance
  lives in machine blocks + git) rather than maintain a rotting pointer. The
  Mirrored Surface Map already applies this to intra-packet mirrors
  (state-once, mirror-defers, one canonical home updated on change). SPECIFIC
  ASK: (a) should class-3 pointer comments become MACHINE-TRACKED (a "retire
  at chN" marker a lint enforces + counts) instead of free-text greps — the
  R-INSTRUMENT-PROBE fragility says the grep approach is the weak link;
  (b) should a small set of class-2 anchors ("built-at chN-pM") gain a
  machine-checkable form (a registry the drift suite validates) so
  where-a-rule-lives stops being silent-rot prose; (c) the standing default
  when in doubt — DROP (present-tense) over MAINTAIN, keeping only the
  machine-checked and the genuinely load-bearing. Provenance: the user raised
  it mid-ch12-P4 build as a low-urgency curiosity; capture-don't-fix.

- 2026-07-22 · ch12-P4 gate-2 · BOUNDARY-REVIEW ITEM (user-raised) — the
  MUTATION-TESTING MECHANICS deserve an explicit retro walkthrough; the
  gate-2 harvest (4 green-but-blind lanes, zero product gaps) is the live
  case. TWO user questions, ANSWERED from this session's evidence (the
  arm-gate2-out.txt transcript + the byte guard):
  Q1 — when the arm reports a blind test, did it actually MUTATE the code or
  "run it in its head"? ANSWER: in gate-2 the arm did NOT mutate — it ran the
  full `pnpm v3:test` suite ONCE (the green baseline + the regression-honesty
  check) and REASONED about sensitivity by READING each test body against its
  rule ("plausibly red" is the reasoning verb; the byte guard confirms a clean
  tree, no un-restored edit). The BUILDER, by contrast, EXECUTES real mutation
  probes (R-DERIVED-PROBES: neutralize the rule → run the suite → observe the
  specific lane go red → restore byte-clean) — the Build-record probe table is
  executed data. So our "mutation testing" is SPLIT by actor: builder EXECUTES,
  arm REASONS.
  Q2 — what were the "test candidates, pick 2-3 and check" in the arm prompt?
  ANSWER: gate-2 prompt point 3 asked the arm to SPOT-CHECK 2-3 entries of the
  BUILDER's mutation-probe table (one entry per test family) by reading the
  named test + rule — a SAMPLING AUDIT of the builder's self-reported probes
  (catch a dishonest/wrong "N-red" claim), NOT the arm's own coverage pass.
  THE METHODOLOGICAL FINDING (the retro's spine): there are THREE distinct
  sensitivity mechanisms with different strength/coverage:
  (1) builder mutation probes — EXECUTED, strong per-probe, but ≥1-PER-FAMILY,
      so weak COVERAGE (proves a family not-ENTIRELY-dead, not every LANE
      sensitive); (2) the arm's spot-check of those probes — REASONED sample,
      audits builder HONESTY not coverage; (3) the arm's INDEPENDENT sensitivity
      pass over every matrix row — REASONED, and THIS is what caught the 4
      multi-lane blind spots the single-per-family probes structurally miss
      (e.g. R1's one probe "return full instance" proved SOME compaction but
      not the `requested.request_id`-leak lane). THE RELIABILITY NUANCE the
      user is circling: mechanism 3 is REASONING, not execution — a wrong
      "plausibly red" judgment could pass a blind test; the strongest form is
      EXECUTED per-lane mutation (kill every declared lane's mutant), which is
      what a real mutation-testing framework (Stryker-class) automates.
      SPECIFIC ASKS for the boundary: (a) should R-DERIVED-PROBES move from
      ≥1-per-FAMILY to ≥1-per-LANE (stronger coverage, higher build cost);
      (b) should the arm's sensitivity pass EXECUTE mutate-run-restore for the
      lanes it flags (turn "plausibly red" into "observed red") rather than
      reason; (c) is a real mutation-testing tool worth wiring into the v3
      bridges (automated mutant-kill score) so the manual probe+reason approach
      becomes a machine-checked gate — the strongest defense-in-depth answer to
      "can we trust the tests". Provenance: the user raised it while reading the
      gate-2 verdict; capture-don't-fix.

- 2026-07-22 · ch12-P4 · DOGFOODING CHECKPOINT RECORD (§12.5 DoD, run-and-
  recorded — the chapter-close session may cite this instead of re-running;
  idempotent against a fresh temp DB either way). Hand-driven the full
  lifecycle through the SHIPPED CLI (`../node_modules/.bin/tsx src/cli/main.ts`
  from `v3/`, an isolated temp sqlite DB, the repo's canonical
  `local-pair-v0@1` template). RESULT: CLEAN — no blocking bug; the chapter
  is closeable on the dogfooding axis. Observed:
  - `create --mode deferredKickoff` → `{kind:created, instanceId, version:1}`
    exit 0; `start <id>` → `{kind:accepted}` exit 0, held; `kickoff <id>
    --task …` → `{kind:activated, …, intent:{actor:codex, packet:{…,
    runtimeContext:"none"}}}` exit 0, ACTIVE (currentStep=implement, round=1,
    task supplied); `cancel <id>` → `{kind:terminated, disposition:cancelled}`
    exit 0, TERMINAL. The four verbs drive the CREATED→WAITING→ACTIVE→TERMINAL
    lifecycle end-to-end.
  - The R1/R2 compact/full split confirmed LIVE: `list` row carries
    `wait:{kind:"kickoff_pending"}` (kind only) + `runtimeContext:{state:"ready"}`
    (NO locator, NO version); `detail` carries the full `wait{kind,requestedBy,
    resumeEvents}` + `runtimeContext:{state:"ready",ref:null}`. Emitted keys
    camelCase (the F4.1 read-doc grain). The `wait` clears to null on leaving
    WAITING (the C11 non-stale invariant). The `STARTED` lifecycle fact lands
    on the timeline (C12).
  - The arm-gate-1 exit-mapping CORRECTIONS verified LIVE (the strongest datum
    that the fold was real, not cosmetic): `cancel` on a TERMINAL run →
    `{error:{class:internal,…terminal is a sink}}` exit 1 (the state_violation
    THROW, NOT an exit-3 rejection); `create` immediate without `--task` →
    `{kind:rejected, reason:task_required}` exit 3 (kernel-negative data doc);
    `create --mode bogus` → `{error:{class:usage, name:InvalidMode,…}}` exit 2
    (CLI-side before the kernel). The shipped code matches the corrected
    lifecycle exit contract exactly.
  - The CLI does NOT synchronously spawn a real actor — `kickoff` emits the
    dispatch intent and returns (the real spawn is ch9's runner); so the
    lifecycle verbs are safely hand-drivable pre-ch9. Provenance: the user
    asked to run the dogfooding BEFORE the chapter close (a bug would block
    it); run clean this session, recorded here for the close.

- 2026-07-22 · ch12 boundary review · VERDICT — rule-accretion governance
  (the P1b item-6 question) ADOPTED in all three parts, user-ratified:
  (a) RETIREMENT = a first-class boundary verdict with the same standing
  as addition — each boundary sweeps the registries (LearnedRules `R-*`,
  template §3 `REV-*`, README §4) for zero-catch / mechanized / lens-duty-
  duplicate rules; a retired row is deleted, provenance stays here + git.
  (b) Per-rule catch TALLY in the boundary entry (hand-tallied from packet
  metrics + detector-miss records; structure-light first, mechanize only if
  it earns it) — with the user's refinement: a catch matching several rules
  credits EACH of them, and a persistent multi-rule overlap is itself a
  boundary topic (duplication candidate), same standing as a zero-catch
  rule. (c) Admission bias: single-occurrence candidates default to WATCH
  (severity-weighted exceptions); mechanize-or-extend-a-lens-duty preferred
  over new prose — the guarded budget is the PROSE registry's size. Carried
  by README §7 (verdict menu + the retirement bullet) and LearnedRules.md
  ("How a rule gets here" step 2 + the new "How a rule leaves" section).
  The (c) bias governs the REST of this boundary review's verdicts; the
  first retirement sweep + ch12 tally run at this review's close.

- 2026-07-22 · ch12 boundary review · VERDICT — model-tier experiment
  closed as REVERT (owner-ratified; the full reasoning lives in
  model-tier-experiment.md §7, appended per its write-once rule). Facts
  bound: all three ch12-P2/P3/P4 main threads ran Opus-class (owner
  memory — the capture gap); K1 clean, K2 double-strike on P3 (rounds 12
  vs band 1–4; gate-2 ~18 findings vs band 2–8), K3 not ruled
  FAIL-evidence (owner reading: the process prompt set was authored
  entirely under Fable — never tuned for Opus; guidance-reducible).
  Protocol slips logged in §8: the verdict was due at P3 close; P4 ran
  Opus as an UNRATIFIED EXTEND (in-band metrics, informal data point).
  Consequences executed at this boundary: (1) `main_thread_model` added
  to packet_metrics (template + check_packet.py optional key + string
  type check + red/green selftest cases; REQUIRED by template rule from
  ch13, lint-optional for grandfathering); (2) the K3-class prompt
  hardening is delegated to this boundary's entry-mode / arm-invocation
  verdicts; (3) successor experiment to be pre-registered as
  model-tier-experiment-2.md — alternating-chapter design, explicit
  Fable-mandatory surface list (contract drafts, plan chapters, kernel
  new-capability / idiom-minting, process revisions, boundary reviews),
  economics-driven goal: implementation packets runnable on Opus-class.
  FOLLOW-UP same day: model-tier-experiment-2.md PRE-REGISTERED and
  owner-ratified — alternating-chapter design (ch9 = Fable first;
  Opus arm gated on the K3 hardenings), Fable-mandatory surface list,
  and the mechanical 5-axis DIFFICULTY INDEX (mass / inference load /
  ripple / seam class / novelty, thresholds frozen from a 14-packet
  ch11–ch12 back-scoring: 5 Light / 4 Medium / 5 Heavy, the five
  Heavies = the five highest observed loads; the owner-estimate
  difficulty note was REJECTED by the owner as unanchored — the index
  is computed from declared machine blocks at approve time instead).

- 2026-07-22 · ch12 boundary review · VERDICT — the ch11-P3b ARMED
  falling-yield prediction MEASURED on ch12's arm gates: gate-1 content
  yields P0:8 / P1a:6 / P1b:8 / P2:flag / P3:10 / P4:5 against the ch11
  band of 5–10 — the yield is FLAT, not falling, and the arm kept
  minting NEW catch-classes all chapter (record-precision,
  entailment-depth, type/schema realizability, async-timeline,
  code-substrate assumption) even though the ch11-adopted duties were
  in force. Per the prediction's own pre-registered branches: the
  different-question-generator property is NOT reducible to listed
  duties — the ARM IS LOAD-BEARING indefinitely at current maturity;
  the two mandatory gates stay, narrowing is off the table until the
  model-tier-experiment-2 paired data offers a cleaner read. Named
  confound: ch12-P2/P3/P4 main threads ran Opus-class (the REVERTed
  experiment), which may have raised the error supply — but the two
  clean Fable points (P1a:6, P1b:8) sit in the old band, so FLAT stands
  either way. Secondary observation recorded as INPUT TO the boundary's
  mutation-testing item: gate-2's product needle fell to 0 by P4 while
  the green-but-blind needle held at 4–8 per packet — gate-2 is
  morphing into a specialized test-sensitivity auditor, so any
  mechanization of sensitivity checking directly absorbs gate-2's
  current niche and must be weighed against it (incl. the owner's
  standing question: run the deterministic system and the external arm
  IN PARALLEL for a period before any substitution). OWNER CAVEAT
  recorded with the verdict: the experiment count is very low — these
  assessments may not generalize; treat them as current-best working
  conclusions, re-read as data accumulates, not as settled truths.

- 2026-07-22 · ch12 boundary review · VERDICT — the test-reliability /
  mutation-testing cluster, decided sub-item by sub-item with the owner
  (two owner contributions reshaped the package pre-verdict: the
  CODE-MUTATION vs INPUT-DOMAIN blindness distinction — a mutation tool
  is structurally silent when neither code nor test has the branch —
  and the SELF-REPORT gap: the builder's probe table was LLM prose and
  the arm's spot-check read prose, violating our own verify-gate
  principle). Verdicts:
  (4A) builder probes STAY >=1-per-family — per-lane coverage is the
  tool's job, not more manual work (owner note: may retire entirely
  long-term). (4B) author-time "mutation smoke" harness DECLINED —
  interim scaffolding the pilot would obsolete. (4C) ADOPTED:
  arm-flagged "plausibly blind" lanes get an EXECUTED
  mutate-run-restore verification before the fold is recorded
  (prompt-driven, owner-confirmed understanding; receipt-covered via
  4E, tool-absorbable later). (4D) ADOPTED as PILOT: StrykerJS+vitest
  scoped to the packet mutation_boundary (`pnpm v3:mutation`), no
  hand-picked mutants — file-scoped breadth IS the point, config
  arm-checkable, report = machine evidence; DUAL-RUN beside arm gate-2
  for two chapters (the owner's parallel-run design), catches labeled
  code-mutation vs input-domain so the un-mechanizable share of the
  arm's value becomes measurable; realization = named ch9 work item
  (plan ch9 row updated; feasibility proof first). WATCH:
  property-based/fuzz testing as the input-domain class's mechanized
  endgame — revisit at the pilot read. (4E) ADOPTED: probe-execution
  protocol into R-DERIVED-PROBES — probes run EXCLUSIVELY through a
  probe runner (scratchpad-copy backup, restore FROM the copy,
  git-restore forbidden for mutation rollback [3 incidents], cmp
  byte-verify, RECEIPT file per probe cited by the table); the arm's
  spot-check audits receipts vs table, never prose (ReviewPacket §6
  amended); the runner tool itself is built at this review's close
  WITH adversarial negative fixtures. (4F) second probe-derivation
  pass DECLINED/WATCH — superseded by the pilot. (G) ADOPTED: the
  boundary tally counts TEST-CLASS arm catches in their own bucket —
  the safety-net-reliability signal measured directly. (H) RECORDED
  (log-level, no rule): the INDEPENDENCE PRINCIPLE as the standing
  answer to "can we trust the process" — reliability is the union of
  DIVERSE loops whose errors do not correlate (different model /
  different question / mechanical gates), so improvement invests in
  diversity, and removing a layer must answer "which failure classes
  did ONLY this layer catch" (the pilot's dual-run answers exactly
  this for gate-2); bounded trust, owner's low-n caveat applies.
  (I) ADOPTED as scope extension of R-CLAIM-FORM-PROBES: one-off
  verification/reconciliation scripts ship WITH adversarial negative
  fixtures in the same commit (the ADR-015 false-green classes).

- 2026-07-22 · ch12 boundary review · VERDICT — the autonomy /
  entry-mode cluster (the P2 arm-invocation ask-the-human + the P3
  discretionary pre-approval stop), all four sub-items owner-ratified.
  These are the K3-class prompt hardenings model-tier-experiment-2's
  Opus arm is gated on. (5A) ENTRY-MODE convention ADOPTED — closed
  opening-prompt vocabulary: bare "jöhet a chN-pM" = per-packet
  (flag-free ⇒ autonomous through build, mode announced in one line,
  stop after the packet); "review chN-pM" = stop at approve;
  "delegáld a chN fejezetet" = standing chapter mode, the loop
  self-advancing between packets — VALID ONLY with the conductor
  architecture (heavy steps in fresh-context subagents, summaries in
  the main context; the owner's context-purity condition — ratified
  jointly with the build-execution-context item); per-item token
  overrides; undetermined ⇒ the letter WITH the announcement, never a
  silent stop. Landed: AGENTS.md V3 + CreateTaskPacket SKILL.md
  (ExecutePairflowPlan intentionally NOT touched — v1-world skill,
  unused in v3; the chaining-era boundary owns that if it comes).
  (5B) ADOPTED — README §5.5 emphasis reversed (agent-invocation =
  the autonomous-path DEFAULT, user-manual arm = fallback on a FAILED
  preflight; the stale "standing loop leg queued" line resolved);
  "unavailable" = a CHECK RESULT (`which codex` + arm-pin match +
  attempted invocation; the STOP cites the failed check); ReviewPacket
  §6 disambiguation (a different model reached THROUGH the CLI —
  invoking ≠ being). (5C) ADOPTED — the assume-then-ASK sibling row
  added to the global ~/.claude/CLAUDE.md NEVER-ASSUME table
  (cross-repo, committed separately there). (5D) ADOPTED — §5.5
  human-touchpoint distinction: clean gate ⇒ proceed (discretionary
  stop = anti-pattern); arm-FINDINGS fold rewriting a canonical row
  against the author's documented rationale on ratified-faithfulness
  ⇒ recommendation-first human touchpoint is legitimate. OWNER DATUM
  recorded: ExecutePairflowPlan ran v1 on Opus-class holding process
  fine — evidence that adherence gaps are prompt-hardening issues,
  not model capability (and a pointer to the prompt DENSITY that
  achieves it: EPP's stepwise prescribed workflow is the calibration
  target for v3 process prose).

- 2026-07-22 · ch12 boundary review · VERDICT — build execution context
  (the b8ceeb69 P3 boundary item), owner-ratified in three parts after
  an owner CHALLENGE reshaped the middle one. History first
  established: fresh-context-delegated builds ran twice (ch12-P3/P4,
  both recorded); every earlier packet built in the main context,
  unrecorded. (6a) ADOPTED — the DEFAULT is the fresh-context-delegated
  build (four grounds: §5.3 self-containment live-tested; author/gate
  decorrelation; context rot peaks exactly before the most code-dense
  step; chaining-architecture rehearsal); the Build record names the
  execution context + guidance notes, prose-only (no lint field —
  admission bias). (6b) ADOPTED AS REWRITTEN: the original proposal
  enshrined the P3 session's "orchestrator writes subtle fixes, agent
  writes tests" split as a rule — the owner challenged it as
  OVER-INDEXED (n=1, not recorded as intentional, no demonstrated
  structural advantage: the process state the orchestrator holds lives
  on ARTIFACTS by design, so a packaged finding-context delegates
  fine), and the challenge also exposed an internal contradiction (6a
  argues the rotted main context must not build; the proposal put the
  SUBTLEST code exactly there). The adopted form: the split is
  ACCOUNTABILITY-only (orchestrator = verification + both gates +
  reconciliation decisions + the commit boundary; builder =
  realization + tests); fix AUTHORSHIP is deliberately unruled — the
  Build-record Aftermath records who authored each fix, and a later
  boundary reads the data before deciding whether a rule is warranted.
  The P3 observation is thereby demoted to a data point. (6c) ADOPTED
  (jointly ratified with the 5A entry-mode verdict): under the
  standing chapter mode the pattern generalizes to the CONDUCTOR
  architecture — all heavy steps in fresh-context subagents, the main
  context holding process state + just-enough summaries (the owner's
  context-purity condition). Landed: README §4 execution-context
  paragraph + template Build-record note.

- 2026-07-22 · ch12 boundary review · VERDICT — the lens-duty batch
  (eight detector-miss-born candidates, each at the preferred
  extend-a-lens-duty tier), owner-decided per item. ADOPTED (7 of 8):
  code-substrate probe extension → lens-1 duty 4 (unions/enums READ at
  source, never mirrored from a sibling — the P4 exit-matrix miss);
  anchor-literal-default check + watchpointed-derived escalation →
  lens-2 duty 3 sub-checks (the P3 C4-materialization miss; the P4
  R1/W1 reclassification); type/schema disposition realizability →
  lens-2 duty 5 (a structural Record never excluded the ref — brand or
  it is not realized; the P3 branded-projection miss); async-seam
  temporal-path walk + abort-on-throw-loop probe → lens-3 duty 8
  sharpening (the P3 gate-2 product bug + twins); constructor sites on
  a type flip + embedding-documents-are-renderers → lens-5 duty 3
  extensions (the P2 validate.ts miss; the P0 ReplayResult.outcomes
  miss). WATCH (1 of 8): the v1-capability probe (does a stance
  foreclose a known product capability — the ch12-draft ratifier
  catch) — the owner applied the boundary's own admission bias against
  the proposer's severity argument: single occurrence ⇒ WATCH, a
  second occurrence promotes it into lens 5. ALSO ADOPTED (the owner's
  saturation question turned mechanism): LENS-PROMPT STRUCTURE — the
  orchestrator's lens-subagent prompt enumerates duties as a NUMBERED
  checklist and the lens's own output answers each duty BY NUMBER;
  missing per-duty answer = incomplete run; Gate Coverage Matrix cells
  fill FROM per-duty answers, never from essay interpretation. The
  two-interpretation answer recorded: duty-list growth saturates
  DIFFUSE attention but converts safely into a harness-verifiable
  sequential task walk when structured; the residual limit is DEPTH —
  an over-long duty list is a LENS-SPLIT signal (packet
  size-threshold logic applied to lenses); per-duty answers feed
  duty-level yield accounting, extending §7 retirement to lens duties.

- 2026-07-22 · ch12 boundary review · VERDICT — the delegation-prompt
  rule (the P1b delegation-altitude gap) ADOPTED into the README §4
  execution-context paragraph: a packet declaring a discipline
  STRONGER than the existing suite embodies gets its discipline lines
  QUOTED VERBATIM in the delegation prompt with an explicit "raise to
  the declared level" instruction — preserve-don't-weaken is
  insufficient exactly when the packet's point is stronger proof.
  Single occurrence, adopted as a SEVERITY EXCEPTION to the boundary's
  own WATCH-first bias, with the two grounds recorded: (1) verdict 6
  made the delegated build the DEFAULT path, so the class's trigger
  surface is now standing, and discipline-raising is what discipline
  packets are FOR; (2) the failure is self-report-invisible (the Build
  record claimed the declared level while the tests held the old one —
  only gate-2 caught it, as the chapter's largest aftermath batch).

- 2026-07-22 · ch12 boundary review · VERDICT — the mechanization pair.
  (9a) ADOPTED: the prose↔manifest ref-drift LINT extension — every
  `contract:...#Cn` cited in a row's anchored/derived closure must
  appear in that row's manifest refs AND the header union, or the
  packet-lint goes red (the existing cross-lock pattern one step
  wider). Attribution corrected at the owner's catch: the two P1b
  occurrences were caught by the GATE-1 ARM's rounds (not the owner as
  first drafted) — which strengthens the case: ~100k-token
  probabilistic review rounds were spent on a class a free
  deterministic lint line retires. Implementation lands in the
  boundary-close tooling batch (check_packet.py + negative fixtures
  per the R-CLAIM-FORM-PROBES extension). (9b) the reference-economy
  triple, owner-decided: (c) ADOPTED — drop-over-maintain as the
  standing default, folded into R-PRESENT-TENSE (a reference earns its
  upkeep iff benefit > rot-risk × miss-cost; promote to
  machine-checked where justified, DROP otherwise); (a) ADOPTED — the
  canonical `DEFERRED(chN[-pM]): <note>` pointer-comment marker with a
  boundary-tooling count that goes red at the addressed chapter's
  close (README §4; retires the free-text-grep fragility); (b) WATCH —
  a machine-checkable registry for class-2 prose anchors ("built-at
  chN-pM") is declined for now: new surface, new upkeep, and the (c)
  default shrinks the class instead; revisit if class-2 rot bites.

- 2026-07-22 · ch12 boundary review · VERDICT — the admin batch, five
  items owner-ratified in one act. (10a) README §2 inventory numbers
  FIXED 158/85/121 → 159/54/122 (verified against ledger §4 + the
  coverage checker's plan-§1.4 guard before editing; the ADR-015
  routing resolved) + a pointer that plan §1.4 + the checker guard are
  the drift-checked authority. (10b) the C33/K4-class illustration-
  quote refresh ROUTING CONFIRMED as recorded at ch12-P0: a future
  ch11-gate-format touch refreshes the quotes (or marks them
  "illustrative, defers to unit"); no reopen, no packet impact, no
  action now. (10c) the coverage BOTH-ENDS shared_ownership rule
  RATIFIED as the standing lifecycle (reciprocal declaration on both
  slices; a share with a future sibling lands at the SIBLING's commit
  amending both files; co_owner = packet filename; plan rows carry the
  obligation) — played out correctly twice (P1b, P2), no new
  mechanism. (10d) arm timeout ADOPTED: build-close (test-running)
  arm runs get a 20-minute foreground timeout, approve-gate/doc runs
  stay at 10 (ReviewPacket §6; the two P1b overruns + the P3 gate-1
  first-run timeout are the evidence). (10e) WATCH acknowledgments:
  value-domain narrowing lands its behavior change in the OTHER
  stage's suite (P2 — aware, no rule); full-object-equality tests as
  hidden consumers (P1b — WATCH stands, recurrence promotes);
  the first live 3:plateau STOP data point (the rule worked — the
  plateau residual carried a real defect, "continue" was correct);
  the arm's record-precision catch class (a data category for the
  yield tally, no mechanism).

- 2026-07-22 · ch12 BOUNDARY REVIEW CLOSED · ten verdicts (the ten
  entries above), one-at-a-time with the owner per the README §6
  presentation discipline; the (c) admission bias adopted in verdict 1
  governed the rest of the review live (7a and 9b-b landed WATCH under
  it, 8 and the delegation rule took recorded severity exceptions).
  THE FIRST RETIREMENT SWEEP + CH12 CATCH TALLY (verdict 1's
  mechanism, owner-ratified): high-yield — R-LANE-SENSITIVITY ~24
  (every gate-2 leg's spine), R-CLAIM-GRAMMAR 2–3, R-ALIGNED-UP 2,
  R-CLAIM-FORM-PROBES 2 (the ADR-015 false-greens), R-EXECUTION 1
  (the pipe-eaten exit code), R-INSTRUMENT-PROBE 1 (the P0 CWD
  no-op), R-ABSENCE-CONSUMERS 1 (the §13 recap mirror). Zero-fire
  with SCOPE explanations (no numeric work, no first-of-a-kind, WATCH
  dormant): R-NUMERIC-LADDER, R-RAW-FIXTURES, R-FIRST-STOP,
  R-UNTRUNCATED-SWEEP, R-DIMENSIONS, the six REV-* rules. Silently
  load-bearing (applied, catch-free — not dead): R-ALTITUDE-LINE,
  R-EMPTY-SLICE, R-FLAGS-IN-PACKET, R-DERIVED-PROBES,
  R-ACTIVATION-JOURNEY, R-PRESENT-TENSE. VERDICT: ZERO retirements
  this round (one chapter of tally = the same over-indexing the
  boundary spent the day refusing); TWO ch13 pre-registrations with
  check tasks: (1) R-WIDE-CLAIM ⊂ R-CLAIM-GRAMMAR merge candidate
  (retire-by-merge if it catches nothing the grammar would not);
  (2) R-EMPTY-SLICE mechanization check (suspicion: the lint already
  enforces the explicit empty declaration — verify, then drop the
  prose row). Overlap note (the credit-each rule's first product):
  test-evidence catches co-credit R-LANE-SENSITIVITY /
  R-DERIVED-PROBES / R-MATRIX-LANES — LAYERED (lane text / executed
  probe / matrix row), not duplicative; verdict 4 restructured
  exactly those layers. The G bucket's first read — gate-2
  test-evidence per packet: P1a 6 / P1b 8 / P2 6 / P4 4 (+ P3's
  inside its 7-round leg). TOOLING BUILT (3 commits, each with
  adversarial selftests per the extended R-CLAIM-FORM-PROBES):
  check_packet P10 ref-closure lint (87 red dims; its own FIRST LIVE
  RUN tripped on ch11-p2a's line-wrapped header union — the
  R-INSTRUMENT-PROBE class caught in a freshly written instrument
  AGAIN, fixed wrap-aware + wrapped-form green case),
  check_deferred + v3:deferred bridge (8 cases; live tree: 0
  markers), probe_runner (12 cases incl. the driven restore-failure
  loud path). All bridges green at close: packet-lint 18/0, coverage
  OK, adr-check 16 OK. Chapter-close acts remain OUTSIDE this review
  (realized_map, plan map-row flip, full ci:local, close record);
  ch9 opens on the owner's explicit go as the model-tier-2 FABLE arm.

- 2026-07-23 · ch12 CHAPTER CLOSED (owner-approved after the boundary;
  the template §4 one-act close). realized_map FILLED — 27 rows, C1–C25
  code-realized across P1a/P1b/P2/P3/P4 (P0 exempt: model-fix packet,
  zero draft-row refs), C26/C27 act-realized (the ratification's own
  reopen set + the template §4 patch); the map was BUILT BY a
  fresh-context subagent from the packet manifests + lane tables (the
  conductor architecture's first post-ratification use on a close
  artifact) and orchestrator-verified by spot-probes (cited files
  exist incl. the deleted kernel/start.ts, the C21↔P4-R1 anchor, the
  pre-commit provider-unavailable rejection). Contract status
  ratified → realized in the same act; plan §1.3 map row 12 →
  realized. DoD evidence: dogfooding checkpoint cited (run clean
  2026-07-22, recorded — not waived, not re-run per its own
  idempotence note); FULL ci:local PASSED at tip; packet-lint 18/0
  with the realized form linted; v3:deferred --closed ch12 = 0
  markers (the new close gate's FIRST live use); coverage OK.
  CH12 COMPLETE: the runtime core (L0c cascade + L0d lifecycle/
  activation + L0e provider contract + format/operator surface) is
  realized kernel surface. NEXT: ch9 (Runner MVP) on the owner's
  explicit go, in a NEW session — the model-tier-2 FABLE arm; its
  ratification disposes the mutation-pilot feasibility work item
  (plan ch9 row), the production-provider gate (C15's D5 condition),
  and the ch9 map-extension question.

- 2026-07-23 · ch12 realized_map ARM AUDIT (user-initiated curiosity
  that proved itself) — the owner asked whether an external arm run
  over the freshly generated close artifact would find anything. It
  did: 7 findings on basis 97026266 (all the OMISSION/MIS-ATTRIBUTION
  class — co-realizing lanes missing from C2/C7/C10/C12/C25, the
  S1–S12 over-claim on C11 [S11 is C10/C12's], the C14 guard-retirement
  claim belonging to the omitted P3 W3), every one CONFIRMED by a
  mechanical manifest cross-check before folding, PLUS an eighth the
  arm missed and the orchestrator's cross-check caught (C11 cited
  E3/E4 where the manifest says E1/E3 — E4 carries no C11 ref). All
  eight folded; packet-lint green; the arm's hash-citing re-check on
  the folded bytes (971d05e7) returned CLEAN. Byte guard intact both
  runs; pin-conform gpt-5.6-sol/high, agent-invoked per the boundary's
  own §5.5 default. THREE process readings: (1) the subagent-built
  close artifact had exactly the record-precision defect class the arm
  is best at — the conductor architecture's outputs NEED the same
  verification layers as builds (spot-probes proved insufficient:
  mine passed while 8 defects stood); (2) the mechanical
  per-C-row manifest cross-check that adjudicated the findings took
  ~20 lines of python — a `realized_map` LINT (map lanes ⊆ manifest
  citations per row, no cited-lane omissions above a threshold) is a
  mechanization candidate for the ch13 boundary, the P10 pattern one
  step further; (3) the arm+cross-check pairing caught MORE than
  either alone (7 arm + 1 cross-check) — the independence principle's
  cleanest small-scale demonstration yet. Boundary candidate queued
  (WATCH-first respected: single occurrence of the artifact class):
  close artifacts built by delegation get an arm pass by default.

- 2026-07-23 · ch8 realized_map ARM-AUDIT SWEEP (the goal-driven
  overnight sweep, map 1 of 3) — the owner's follow-through on the
  ch12 audit's lesson: if a fresh map carried 8 defects, the OLDER
  maps built by the same close process likely do too. They did.
  Arm run on basis df4cdaf0 (pin-conform gpt-5.6-sol/high, byte
  guard intact): FINDINGS (11) — ten the manifest cross-check
  CONFIRMED (the same omission/mis-attribution class as ch12: E5
  missing from C20/C21/C31, S4 from C28, B4 from C29/C31/C38, M5
  from C32, G8 from C36, A3 from C31/C37, W2 from C31; plus the C22
  G1 citation formally anchored at C36 — reattributed to context),
  and one OUTSIDE the manifest's reach: C16 cites start.ts, deleted
  later by ch12-P1b (6aec56d4) — a TEMPORAL-DRIFT class, not a
  close-time defect; folded as an annotation, not a rewrite. The
  cross-check again out-caught the arm: TWO machine-only finds (C8
  missing the P2 T2 co-lane; C25's "the V8 lane stands in" reading
  as a V8 attribution — reworded to C13-anchored context). 13 rows
  folded total; packet-lint green; hash-citing re-check on 5640c002
  CLEAN; a FRESH INDEPENDENT full-scope run on the folded bytes also
  CLEAN — the convergence rule (fresh-run-clean, not
  changed-rows-clean) satisfied in one fold round. Two notes for the
  ch13 tally: (a) the arm's first verdict cited a 63-of-64-hex BASIS
  (a transcription slip; the machine cross-check adjudicated all
  folds, and the re-check + fresh run cited the full hash) — the
  citation-exactness demand moved into the prompt template; (b) the
  independence split so far across two maps: arm-only 1 (the
  temporal-drift C16 — file reality is invisible to the manifest
  scan), cross-check-only 3, both 17.

- 2026-07-23 · ch11 realized_map ARM-AUDIT SWEEP (map 2 of 3) — the
  richest map (41 rows, 8 packets) yielded the richest haul: arm
  FINDINGS (21) on basis 1b6d5473 (byte guard intact, pin-conform
  gpt-5.6-sol/high) — omissions (D1 from C2, X1 from C9, R1 from
  C13, F4+S2/W3 from C18, A2/D6/T1/V6/F3 from C20, G3/G5/G8 from
  C21, D5 from C24, O3/E1 from C27, both T1s from C29, T1 from C34,
  D1/Y5 from C38, T1/F8 from C39), packet-mixups (C23's P3a-T1 for
  P3b-T1), context-reattributions (C5's verdict-optional to G5,
  C12's G3 to C10), a disposition-wording defect (C30 stance read as
  code-realization), and FOUR code-file mis-attributions the
  manifest scan CANNOT see (C1/C37 domain fields live in
  template.ts not gate.ts; C31/C36 the gate_blocked rejection and
  the ready(∅) backstop live in kernel.ts not processGate.ts —
  each grep-verified before folding, incl. against the ch11-close
  snapshot: NOT temporal drift, close-time defects). The machine
  cross-check confirmed every manifest-checkable arm claim and again
  OUT-CAUGHT the arm on its home turf: five machine-only omissions
  (C20's D6/F3, C27's O4, C32's O5, C39's D3, C8's K2/T1, C18's
  S2/W3, C19's A7, C1's W3). CONVERGENCE took the full three fold
  rounds: round-2 re-check FINDINGS (8) — six of them precision
  defects in MY OWN round-1 fold texts (the G5 anchored-vs-derived
  class, C34's snake_case-vs-TS spelling, the E2/S5 test-file cites)
  and one REVERSAL: round 1 dropped V5 from C19 because the manifest
  scan showed no ref — but V5 is a NEW-DECISION row with an EMPTY
  refs list whose lane TEXT carries the C19 anchor; the arm caught
  the scanner's blind spot and V5 was restored. LESSON for the
  realized_map-lint candidate: manifest refs alone are not the full
  anchor surface — new-decision rows anchor through lane text, so a
  refs-only lint needs a new-decision exemption or a lane-text
  secondary scan. Round-3: the ready(∅) spelling + this entry's
  OPEN item. Re-checks CLEAN-converging (21 → 8 → 2 → folds);
  lint green throughout.
  OPEN ITEM (user decision, arm-raised, code-level — NOT folded):
  C31's disjointness holds only for the seven FIXED reason tokens;
  an AUTHORED process-gate reason is validated by the grammar
  `^[a-z][a-z0-9_]*$` only, so a process could return reason
  `gate_blocked` or another registry/rejection name and it would be
  accepted verbatim. Whether authored reasons should be checked
  against the registry/rejection namespaces (fail-closed vs the
  C32 verbatim-retention culture) is a contract-level question for
  the owner — parked, map wording scoped to the fixed tokens.
  CONVERGENCE RESIDUE (the stop rule honored over the itch to fix):
  the fresh independent full-scope run on 88e8a588 returned
  FINDINGS (1) — a finding BOTH earlier full-scope passes missed:
  C14 cites "process.test.ts M1 grid" but the M1 kind×mode grid
  lives in kernel/processGate.test.ts (grep-confirmed: zero M1
  hits in gates/process.test.ts). The three-fold-round budget was
  spent, so per the sweep's pre-committed rule this is logged as
  OPEN residue instead of folded — a one-line file-cite fix ready
  on the owner's go. Note for the tally: a THIRD independent pass
  over unchanged rows still surfaced a new defect — single-pass
  arm coverage is not exhaustive; passes are samples, not sweeps.

- 2026-07-23 · REALIZED_MAP ARM-AUDIT SWEEP CLOSED (all three maps) —
  the overnight goal ran to completion without a user touchpoint.
  TOTALS: ch8 13 row-fixes (arm 11 / machine-only 2, one fold
  round, fresh run CLEAN); ch11 32 row-fixes across three fold
  rounds (arm 21 + re-check 8 + 2, machine-only omissions on top,
  fresh run FINDINGS(1) → OPEN residue per the round budget); ch12
  fresh saturation run CLEAN on 971d05e7 — last night's fold set
  was complete. FINDING-CLASS PROFILE across 45+ folds: omitted
  co-realizing lanes dominate (~70%), then context-reattributions,
  code-file mis-attributions (6, all grep-verified close-time
  defects), disposition wording (C30), one temporal-drift
  annotation (ch8 C16). INDEPENDENCE TALLY (the sweep's core
  yield): arm-only catches 12 (file-reality + disposition classes —
  invisible to the manifest scan, incl. the V5 blind-spot reversal
  and the third-pass C14 catch), machine-only catches 7 (omissions
  the arm's row-reading missed), both ~27. NEITHER LOOP SUBSUMES
  THE OTHER — the ch13 realized_map-lint candidate covers only the
  machine half (with the new-decision exemption now specified);
  the arm half has no mechanization path. Sampling lesson: three
  independent full-scope arm passes over ch11 each surfaced
  finds the others missed — arm passes are SAMPLES; convergence
  needs the fresh-run-clean rule, not pass counting. OPEN ITEMS
  for the owner: (1) ch11 C14 test-file cite (one-line fold, budget-
  stopped); (2) the C31 authored-process-reason namespace question
  (contract-level); (3) the ch12 dogfooding-vs-sweep interplay: none
  — closed clean. Sweep commits: 2f2d5aa7 (ch8), 226393cd (ch11),
  this entry (close).

- 2026-07-23 · ch11 sweep EXTENSION (owner-authorized extra rounds) —
  the owner ruled on the residue: (1) C14 was never a decision, only
  the round budget — "document reality" — folded
  (processGate.test.ts M1 kind×mode grid). Two further independent
  full-scope passes (rounds 4-5, basis 991578ad → 2040f76f): round 4
  caught C26's both-halves over-attribution (storeCheckers.ts covers
  the STORE-VISIBLE half only; the run-level persist-before-return
  half is proven in scriptedProcessGateRunner.test.ts — split
  folded) and ESCALATED C31: the ratified row text binds the
  disjointness rule to authored tokens TOO ("authored (C17) and
  fixed ... DISJOINT by rule"), the admission validator applies the
  grammar regex only, and the arm's live probe got reason
  "gate_blocked" accepted ok:true — a MATERIAL UNDER-REALIZATION,
  not a wording nit. The map now names it plainly (REALIZATION GAP,
  owner ruling pending). Round 5 returned exactly ONE finding: that
  self-declared gap — the map has no remaining faithfulness defect;
  the letter-CLEAN verdict is unreachable until the code gap closes.
  OWNER DIRECTION (decided this morning, implementation pending):
  namespace the system's fixed reason tokens (e.g. sys:runner_error)
  — the authored grammar cannot express ":", so disjointness holds
  BY CONSTRUCTION, no runtime check needed. Cost: renames the
  ratified fixed-token list (C31 text, M4, the l2a trace, tests,
  transcript surface) — a contract reopen + successor-row change,
  queued as a ch9+ work item, not an overnight edit. The C31 open
  item converts from QUESTION to DECIDED-DIRECTION.

- 2026-07-23 · REALIZED_MAP AUDIT CODIFIED (owner-ratified, the
  WATCH candidate graduates at n=3) — the two-layer rule lands:
  (1) MACHINE layer `v3:realized-map` (check_realized_map.py
  promoted from the sweep's scratchpad script: missing = hard-fail,
  extras report-only, new-decision exemption, en-dash ranges)
  BLOCKING inside the chapter-close act, listed in the README
  tier-0 inventory's new Chapter-close family beside v3:deferred;
  (2) ARM layer DETACHED from the close — non-blocking, explicitly
  allowed parallel to the next chapter's build (the owner's
  attention-bottleneck ruling: the map is a record, fold policy
  guarantees no surface the next chapter reads changes; substantive
  finds route as work items — the C31 precedent), deadline = the
  next chapter's close; the map-audit prompt variant is ReviewPacket
  §6 item 11. THE TOOL'S FIRST LIVE RUN immediately proved the layer
  split: on the ch12 map — which TWO independent arm passes had
  called CLEAN — it found 29 real uncited co-lanes (C11 L1, C15
  T4/D2, C17 D2, C18 X1, C22 I1, C24 E2/E5/X3, C25's sixteen) plus
  two notation classes it now enforces: en-dash ranges (S1–S10
  parsed as no range by an ASCII-hyphen tokenizer) and BARE packet
  tags (ch12-C25 cited "P2 A1/A2" — invisible without the canonical
  chN-PM form; the map entries normalized). All 29 folded
  manifest-confirmed; v3:realized-map green over all three maps;
  packet-lint green. The independence tally extends again:
  machine-only now includes a 29-catch batch the arm sampled past
  twice — the blocking-machine + sampling-arm split is the right
  order.

- 2026-07-23 · CH9 OPENING — the four parked items disposed stepwise
  (the human-gate presentation discipline; the owner asked for EZX
  re-explanations twice — self-containment held): (1) mutation-pilot
  feasibility PROVEN + wired AT the opening (commit c95e9889:
  Stryker 9.6.1 / vitest-runner on vitest 4.1.10, 171 mutants on
  emit/opId.ts in ~11s, score 81.29% with real survivors; pnpm
  gotchas: explicit plugins list needed under isolated node_modules,
  subprocess-spawning CLI smoke tests excluded via a dedicated
  vitest profile); (2) the ch12-C15 D5 production-provider gate
  discharges IN-chapter (FAIL-channel rows in the ch9 draft +
  P1-before-P2 packet ordering); (3) NO further map extension
  (teardown / provider-health / cloud stay mention-level Absents;
  the §1.3 candidate list unchanged); (4) the ch11-C31 sys: reopen
  rides the ch9 draft-ratification act, code realization = ch9-P0.
  Chapter 9 section authored + ratified same day (Fable arm recorded
  per model-tier-experiment-2 §5; three of five packets are
  first-of-a-kind → human-approved — the first chapter since the
  autonomy flip where the human-approve share DOMINATES by design).

- 2026-07-23 · DECISION-HOME TRIAGE ADOPTED (README §6 — the
  four-home rule), born from two converging observations at the ch9
  opening: (a) the ch11-C31 audit case proved realized rows still
  BIND (the audit held ratified text against code and the CODE was
  wrong) — yet off-model code's durable grounding after the
  realized-freeze was rule-less: the CLI listing surface and the
  worktree provider clearly deserve DIFFERENT durability, and
  nothing said so; (b) the owner's reframing: the model was being
  read implicitly as kernel-only — it is actually a SEMANTICS plane
  with standing non-kernel precedents (storage-scope, the config
  cascade, the L0e provider seam), so the triage's model bucket must
  admit by CONTENT NATURE (K0), never by subsystem — otherwise the
  triage itself would mis-route decisions whose logical home is the
  model. Landed: the README §6 bullet (K0 admission + the fix-FIRST
  user-gated model-wave path + the K1–K4 ADR lift test + the
  per-model-touch K0 reflection line with boundary disposal), the
  contract-draft-template §1 row-authoring question, the plan §9.3
  expected ch9 outcomes. The reflection loop is the owner's own
  addition: the gate must LEARN from each model touch, but rule
  edits happen only at boundaries.

- 2026-07-23 · WATCH (boundary-review item, owner-raised at the ch9
  opening): should the PLAN-ASSEMBLY layer (chapter-section
  ratification + process-rule text) get a standing external-arm
  round? The owner caught the C22 ADR-lift gap "partly by accident"
  during the ch9 chapter/draft discussion — the layer now mints
  cross-chapter shapes (the decision-home triage was born here) with
  no adversarial pass of its own. First data point: the ch9 draft
  arm run's scope EXTENDED to the ratified chapter section + the
  README §6 triage text (zero extra cost, same run). The boundary
  review disposes: standing gate / scope-extension convention /
  non-issue.

- 2026-07-23 · CH9 DRAFT RATIFIED — the full act executed (user GO
  after a three-decision stepwise digest; ratifying commit on content
  5c68f206): (1) the authored-vs-registry residual resolved OPTION A
  (positional narrowing — the prepared payload final as written; the
  fail-closed registry-name check declined, recorded electable-never-
  elected in ADR-018); (2) the K0-NO ratified for the delivery-errand
  semantics — K0-GATE REFLECTION (the README §6 rule's first live
  line): the gate routed correctly — the kernel halves were already
  model-side, the runner-plane shape stayed contract-grain, and the
  open L8 question is PARKED as a named model-wave input rather than
  lost; no rule adjustment proposed; (3) the ch11 reopen executed
  (commits 45fcac96 + 99c80ca0: six row sites + successor C31 + map
  restored-as-updated + dated metrics 2→3 — the loud anchor window
  opened and closed inside the act; a missing-fence lint red was
  caught PRE-commit by exit-code-gated execution, the ch8-fixup
  lesson holding); ADR-016/017/018 accepted. Loop stats for the
  boundary: 5 panel rounds + 2 closes + re-bind + recon; arm 1 full +
  4 re-checks (yield 13→4→3→1→0; ARM-08 refuted with a grep receipt);
  draft 27 rows / 38.5 KB (+53%, advisory breached — C14/C27 split
  candidates recorded). The PLAN-ASSEMBLY-ARM WATCH item's first data
  point: the arm's four plan/process-layer catches (ARM-09..12 — the
  K0 mandate, the dual-home authority rule, the stale §1.3 Absents,
  the unprepared-alternative framing) all bit on the layer the owner
  flagged — evidence FOR some standing form; boundary review decides.
  NEXT: ch9-P0 (the sys: rename realization) on the user's go.
- 2026-07-23 · CH9-P0 BUILT (flag-free autonomous end-to-end — the
  chapter's first packet, the Fable-arm's first live packet). Loop
  stats: 1 full five-lens panel (0 P0–P2, 9 P3 precision folds) + 2
  top-level closes + 5 reconciliation passes; arm gate-1: 1 full + 2
  re-checks (yield 4→1→0, final CLEAN @ d4b238e8); gate-2 CLEAN @
  2ca2f8f8 (receipts audited, 0 findings, no plausibly-blind lane);
  build 1 round, 1262→1265, 6/6 probes red via probe_runner with
  byte-verified restores; post-build boundary audit 0 errors.
  FRICTION (method-level, the packet's learned line): the residual
  family's per-occurrence COUNT-SUBTRACTION (bare grep -o minus
  sys:-prefixed count) silently no-ops for a QUOTED sweep pattern —
  `"sys:timeout"` does not contain `"timeout"` as a substring, so
  the subtraction under-reports (7 computed vs 12 actual). The
  builder substituted a lookbehind occurrence LISTING
  (`grep -rnoP '(?<!sys:)…'`) and classified per occurrence; zero
  bare reason-position hits either way. Candidate rule (boundary
  review; single occurrence → WATCH bias): residual/completeness
  checks classify by occurrence LISTING, never count arithmetic —
  R-INSTRUMENT-PROBE's arithmetic-side sibling. Mutation-pilot
  dual-run (chapter flow note, first data point): 91.48% score on
  the four production files (655 killed / 54 survived / 7 no-cov /
  0 errors, 15 s); survivors are equality-invisible spread/optional
  mutants (input-domain class, e.g. `x !== undefined ? {x} : {}` →
  `true` — toEqual cannot see the difference) — labeled, recorded,
  no fix owed at the pilot stage.

- 2026-07-23 · SPEED-UP TOOL BATCH LANDED (owner decision: at the
  first settled point — ch9-P0 committed — NOT the boundary review;
  rationale recorded: significant win / small risk / early quirks
  surface sooner). Born from session-log mining of three transcripts
  (ch12-P4, close-sweep, ch9-opening): per-edit round-trips were the
  largest avoidable latency class (82/135/57 single-edit turns),
  then per-gate round-trips (28 bridge runs), commit boilerplate
  (11–23 × checklist prose), the hand-scripted reopen choreography
  (3 executions, 2 live bug classes), and arm-guard boilerplate.
  Landed: tools/v3-plan/{check_docs,commit_helper,reopen_runner}.py
  + arm_run.sh, bridges v3:check-docs / v3:commit, the ReviewPacket
  §5 fold-execution discipline + §6 mechanization note + AuthorPacket
  mirror + README §5.5 composite-runner lines. The batch's OWN
  ad-hoc external-arm review ran PRE-landing on the drafts (owner-
  requested): 11 findings, all three P1 classes were wrapper-not-
  replacement boundary breaches (gate-substitution risk, skip-flag,
  staged-vs-worktree bytes) — all folded before landing; the landing
  commit itself was v3:commit's first live run (its nothing-staged
  gate fired correctly first). KNOWN GAP, consciously recorded: the
  global pre-commit reminder hook pattern-matches `git commit` and
  does not fire on v3:commit — the discipline is preserved by the
  tool printing the mechanical checklist and demanding the judgment
  lines in the calling reply; extending the hook is a ~/.claude
  (cross-repo) follow-up. Experiment-2 §8 carries the dated
  condition note (tooling change mid-ch9). NEXT measurement: the
  ch9-P1 session's edit-turn and commit-turn counts vs the mined
  baseline.

- 2026-07-23 · SPEEDUP BATCH — the arm RE-CHECK round (the "all
  folded" line above was the DRAFT round's truth; the landed-bytes
  re-check found 5 resolved / 6 partial / 7 NEW — the fold round
  here): chapter-close mode gained `--forbid-reopened` (a
  false-green lane died), the purity gate now catches
  staged-delete + untracked-reappearance, the arm runner's timeout
  lane runs the POST-guard before classifying (a timed-out
  reviewer's tree writes surface as a guard trip) with a real
  process-group kill, commit1 validates the candidate BEFORE
  writing the sidecar, selftests exercise REAL refusal/timeout
  fixtures (4/7/5 cases), arg validation + the split AuthorPacket
  sentence fixed. Consciously ACCEPTED partials (proportionality,
  recorded not hidden): reopen_runner stays a regex scanner with
  newline-bounded scopes (not the canonical CommonMark parser) and
  `--no-git-check` exists for fixtures; the sha→content-commit
  MATCHING stays the ratifying digest's duty; arm_run has no
  descendant-tree proof beyond the group kill. The tool-yield
  lesson: the wrapper-boundary (gate-substitution) was ALL THREE
  draft P1 classes AND the re-check's sharpest new find
  (false-green chapter-close) — arm review on tooling earns its
  cost exactly at that boundary.

- 2026-07-23 · VERIFICATION-SURFACE TOOLING REVIEW adopted (README
  §5.5, beside the tier-0 scoping principle) — the owner's capture
  after the speedup batch: the existing tooling floors (claim-derived
  negatives §4/2, selftest armor, the review taxonomy's TOOLING
  threat-model judgment) never REQUIRED an external arm on internal
  tools; the batch's ad-hoc arm (owner-requested) proved the gap —
  three rounds, every P1 a wrapper-boundary breach, the class the
  tool author is structurally blind to. New rule: verification-
  participating tools (gates, gate wrappers, choreography executors,
  arm infrastructure) get an arm review before first load-bearing
  use; convenience scripts stay at the selftest floor; disputed
  classification defaults to the arm. Retroactive note: the
  realized-map lint (98db5bbb) landed WITHOUT an arm round under the
  old floors — no defect known, but it is the rule's named
  back-audit candidate at the next boundary.

- 2026-07-23 · ch9-P1 gate-1 ARM-LEG TIMEOUT (infra, retried clean) —
  the first arm gate-1 leg (a five-attack-surface prompt) hit the
  600s doc-review timeout; the §6 item-8 retry converged at 440s
  with a full verdict. Boundary candidate: approve-gate prompt SIZE
  guidance (attack surfaces per leg) vs a mode-timeout bump — one
  data point, WATCH by the admission bias.

- 2026-07-23 · ch9-P1 DETECTOR-MISS READ (both gates) — gate 1: the
  arm again out-caught the internal panel on record-precision
  classes (surface counting vs the ch12-P3 precedent, cross-row
  representation-foreclosure CONJUNCTION the per-row entailment
  attack missed, delivered-total vs gate-throw walk, quote-fidelity
  labeling) — the ch12-P0 churn class, now with a conjunction-attack
  candidate for lens 2 (audit derived-row openness against EVERY
  row that consumes the open choice, not the row in isolation).
  Gate 2: 9/9 test-evidence, 0 product — six green-but-blind lanes
  closed by the mandatory sensitivity pass + executed probes; the
  altitude split (spec defers member sensitivity to build close)
  worked as designed. Two refutations (W3 representation class per
  the ch12-P3 SM3 precedent; K2 testkit-grain) were
  REFUTATION-ACCEPTED by the arm — the refute-with-evidence lane is
  live and does not flag-bear.

- 2026-07-23 · ch9-P2 PRIOR-ART GAP AT THE DRAFT ROUND (the C7
  dir-default reopen) — the ch9 draft's C7 pinned the worktree-parent
  default INSIDE the repo working tree (`<repo>/.pairflow-worktrees`)
  with a DECIDED-HERE, and neither the draft panel nor the arm ran a
  v1 prior-art comparison; the USER's reality-check prompt surfaced
  that v1 (`bubblePaths.ts`) and omnigent (`host/git_worktree.py`)
  both independently place worktrees BESIDE the repo — in-repo
  placement exposes live worktrees to host `git clean`, status
  pollution (probe P4d), tree-wide sweep poisoning, and
  linked-worktree nesting. Resolved by a ratified→reopened→ratified
  amendment (commits 09825f78 + 4db149b1, user-elected option A).
  Boundary candidate: a PRIOR-ART CHECK duty for draft rounds on
  surfaces v1/studied systems already implement (lens 5 or a
  DraftContract §-step) — v1 iterated on these mechanics for months;
  diverging must be conscious, never accidental. Second observation:
  the deliberate v1 divergences found in the same check (loud
  collision vs omnigent's suffix-retry; enc vs branch-name
  validation) were all CONSCIOUS and documented — the gap class is
  the un-run comparison, not the divergence itself.

- 2026-07-24 · ch9-P2 MUTATION-PILOT OBSERVATIONS (input for the
  boundary's pilot-disposal read — the §9.4 flow note's "two
  chapters of paired data" evaluation; capture, don't decide):
  (1) YIELD vs THE PROBE RUNNER — the pilot's broad Stryker sweep
  and the R-DERIVED-PROBES targeted probes OVERLAP in purpose but
  not in evidence grade: the 19 receipt-backed probes each pin a
  NAMED lane red; the sweep's 55 P2 survivors are unattributed (the
  scoped files carry prior chapters' code too, so the survivor set
  is not per-delta — the P1 caveat repeated). Boundary question:
  does the sweep CATCH anything the derived probes + arm
  sensitivity pass miss, or is it redundant assurance at ~1 min/run?
  (2) THE SUBPROCESS BLIND SPOT — `cli/main.ts` scored 0% (475
  no-coverage): Stryker's in-process vitest runner cannot see
  child-process coverage, so every journey-driven surface is
  invisible to it — exactly the surfaces the activation-journey
  rule cares about. A pilot verdict must weigh that its blind spot
  sits on the highest-risk class. (3) SCORES AS DATA — P1 82.03%
  (six files, 19 s); P2 providers 77.47 / kernel 88.72 / diag 75.57
  / ports 100 / cli 0 (65 s). Cheap enough to keep; the question is
  what DECISION a score change would ever drive (no fix is owed at
  pilot grade — a number nobody acts on is telemetry, not a gate).
  (4) ONE REAL ASSIST — the gate-2 aftermath's kill-coverage note
  (the failure-grid classification living at TWO sites, no
  single-point mutation reds the whole grid) came from PROBE work,
  not the sweep — but the sweep's per-file survivor counts are what
  made the two-site structure visible to inspect. (5) TOOLING
  FRICTION — regex-unsafe vitest `-t` filters produced one false
  green during probe work (zero tests run); the probe protocol
  gained a ≥1-test-ran receipt check in-session. Boundary options
  to weigh: keep-as-is (dual-run telemetry) / narrow to
  new-module-only sweeps / retire the sweep and keep only the
  receipt-backed probe lane / promote survivors into a triaged
  boundary checklist.

- 2026-07-24 · ch9-P3a PACKET FORM vs HUMAN REVIEWABILITY (user-raised
  at the P3a pre-approval; boundary-review topic — capture, don't
  solve): the packet file is DELIBERATELY optimized as the builder's
  one-root context (full projection, verbatim quotes, exhaustive
  matrices/inventories — ~74 KB at P3a), and exactly that optimization
  makes the HUMAN approve hard: the flags and genuine decision points
  drown in mechanically-projected material the human cannot usefully
  review (that layer rides on model capability + the panel/arm
  machinery, not on human reading). Boundary question: a structure
  with a CLEAR SEPARATION between the human-facing decision surface
  (claim, flags, new-decisions, narrowings, risk records — the
  approve's actual object) and the builder-facing projection body
  (operative material, matrices, grids, inventories) — same file with
  a layered layout, or a split artifact — WITHOUT breaking
  self-containment (§5.3) or the machine blocks' single-home rules.
  No change owed before the boundary; the P3a/P3b packets stay on the
  current template.

- 2026-07-24 · ch9-P3a ARM GATE-1 TIMEOUT (operational, user-caught
  live): the first gate-1 leg ran with the ReviewPacket §6 letter's
  doc-review timeout (600 s) and died on the runner's own kill at
  600 s (exit 5, guards clean, work lost) — the THIRD 600s-leg death
  (ch9-P2 logged two before the 1200 s mode converged). The §6
  letter still says 10 min for approve-gate/doc-review runs; the
  retry ran at 1200 s. Boundary question: extend the 1200 s default
  from build-close to ALL arm legs (the 600 s tier has now killed
  three legs and saved nothing).

- 2026-07-24 · ch9-P3a BOUNDARY NOTES (user-raised during the approve
  rounds; capture, don't fix): (1) MULTI-SITE RUNNER PLANES — the
  errand ledger is one-file-per-runner-plane (today: one host, one
  plane); a cloud/headless runner site cannot share a host-local
  SQLite file, so the multi-site future needs a run-ownership
  partition rule (the run's runtime-context provider and its delivery
  site travel together — the omnigent model) with the C13 totality
  invariant scoped per owned-run set; correctness is already
  topology-independent (claims scheduling-only, kernel op_id dedup).
  The cloud-provider Absent's companion question. (2) PERSISTENT
  ACTOR SESSIONS (omnigent parity) — C23's sessions are
  per-activation/ephemeral; a warm multi-dispatch conversation
  session (codex app-server / SDK-stdio class adapters) would need
  contract successors (session lifecycle, liveness, possibly
  ActorSessionRef) behind the SAME AttemptExecutor seam; the K1
  union and the ledger's opaque session_name column do not block it.

- 2026-07-24 · ch9-P3b BOUNDARY NOTE (user-raised at the pre-approval
  STOP; capture, don't fix): ACTOR-RESPONSE PROVENANCE — a future
  full-provenance capability wants, per actor response, the
  underlying agent-session id (codex/claude), the model id, token
  counts and kin. Design check run at the STOP: nothing in ch9-P3b
  forecloses it — the natural capture point is the ADAPTER (the
  agent CLI's own stream/output carries these; v1's plan-watch
  already records `codexSessionId` as precedent), and the landing
  zones in order of reach are (1) runner-store attempt-record
  columns (runner-plane evolution, C12/ADR-016-legal, kernel
  untouched), (2) an OPTIONAL provenance field on the
  AttemptExecutor result (the F2-anticipated union-growth path,
  own review), (3) kernel-side envelope provenance if it must
  become committed truth (model-plane/contract-successor work).
  The closed emit.json/result.json keysets are contract-versioned,
  successor-extendable — closure is current discipline, not a
  permanent bar. Boundary question: when provenance comes due,
  which zone opens first, and does the diag channel's best-effort
  character disqualify it as a provenance carrier (C26's honest
  split says yes — provenance wants the ledger, not the stream).

- 2026-07-24 · ch9-P3b BOUNDARY NOTE (user-raised at the pre-approval
  STOP, from the v1 reality check; capture, don't fix): TWO
  delivery-robustness items. (1) SILENT-SUCCESS AUTO-RESPAWN — the
  ratified C15 freezes an exit-0-no-emit conclusion at `unconfirmed`
  (operator re-spawn the only exit; side-effect ambiguity is the
  rationale), while crash/nonzero paths auto-retry under budget; the
  user flags a possible future softening (e.g. ONE automatic
  re-spawn before freezing) — a C15-successor candidate, contract
  work. (2) STUCK-ACTOR DETECTION — the daily-frequency failure
  class (API error / credits exhausted / "overloaded, try later" —
  the agent CLI sits forever): the blunt delivery timeout has NO
  good natural value for LLM runs (legit runs outlast any safe
  bound). The v1 pane-hash watchdog is the ancestor; the v3 home is
  a RUNNER-PLANE health/watchdog component (the named
  provider-health/watchdog Absent's chapter) fed by: (a) the spawn
  seam's ALREADY-CAPTURED stdout/stderr activity (an output-silence
  window — tmux-free, available at the direct-spawn substrate), (b)
  P4's tmux pane capture (TUI grain), (c) the L9 model
  reconsiderations (workload-declared silence budget; stuck is an
  intelligence problem, not a timer — gastown/nanoclaw). Killing a
  stuck attempt lands in the EXISTING K1 classes (attempt consumed,
  budget-bounded retry) — the watcher is pure runner-plane addition,
  zero kernel change. Boundary question: does the watchdog Absent's
  chapter come due right after ch9 (the user runs into this class
  near-daily), and does the silence-budget knob belong to the
  template (per-step declared) or the composition.

- 2026-07-24 · ch9-P3b BOUNDARY NOTE (user-raised at the pre-approval
  STOP; capture, don't fix): LEASE AS A PLATFORM-INTERNAL DERIVED
  VALUE + TEMPLATE-DECLARED PER-ACTOR TIMEOUTS — two entangled
  design directions parked together. (1) The lease is a PLATFORM
  term: the pairflow user (template author) must never need to know
  it; the platform should DERIVE it (lease = the effective delivery
  timeout + a managed margin of a few minutes), never expose it as
  a user-facing knob. (2) The template author is the one who knows
  a meaningful timeout PER ACTOR — the natural carrier is the
  already-flowing opaque effectiveAgentConfig (the C18 mapper's
  output could gain an optional per-spawn timeoutMs). (3) The open
  scoping question that binds the two: today's lease is a LOOP-level
  knob (one window per composition); per-actor timeouts force the
  lease to per-errand/per-attempt grain (each claim's staleness
  window derived from ITS attempt's effective timeout + margin) —
  otherwise a single global lease cannot stay "always a few minutes
  above the timeout". The ch9-P3b state (composition-level timeout
  30 min default paired with a 45 min loop lease, both
  composition-API knobs, F8) is the coarse-grain interim; the
  fine-grain design (derived per-attempt lease, template-declared
  timeout, zero user-visible lease) is a later chapter's discussion
  — natural companions: the watchdog/silence-budget item and the
  P4 C25 operator-surface question.

- 2026-07-25 · ch9-P4a AUTHORING — the kernel process-gate cwd read
  is a LIVE cross-packet seam defect (agent-caught at projection):
  the ch12-P1a X2 arm reads `ref.locator` as a STRING (the
  testkit-provider era's shape), while the ch9-P2 worktree ref's
  locator is an OBJECT — every worktree-run process gate today lands
  on the kernel-integrity throw instead of C21's "cwd = the run's
  worktree". Neither P2 nor P3a/P3b tripped it (no packet composed a
  process gate with a worktree context). Fix owned by ch9-P4a (GR6:
  the L0e LocalExecutionCapability resolution — the H1 mechanism at
  the gate arm; flag F5), the P3b-F10 "harden the seam you realize
  against" precedent. Class: cross-packet integration blind spot —
  two packets each green in isolation, the composed pair unproven;
  candidate boundary question: should a packet's consume-family scan
  REQUIRE a composed-pair probe when two chapters' surfaces first
  meet?
- 2026-07-25 · ch9-P4a AUTHORING — tmux `-e` env injection is
  ADDITIVE only (the pane inherits the FULL server env, 64 host keys
  leaked in the probe): C19's full-replacement discipline under tmux
  is only achievable by `env -i` embedding in the session command
  (P7a/P7b). Recorded because the draft's tmux probes (P2a–P2e)
  covered create/liveness/attach but NOT env propagation — the
  probe-before-claim rule caught it at authoring, zero cost;
  provider-shaped probe lists for a NEW substrate dimension (env,
  cwd, signals) are worth a standing checklist line at the boundary.

- 2026-07-25 · ch9-P4a BOUNDARY NOTE (user-raised at the pre-approval,
  point-3 discussion): the tmux lane's absent `spawnDetail` tail
  (F6(b) — no seam pipe under the pane pty) COULD be mitigated later
  by a periodic `capture-pane` poll copying the pane's last N lines
  into the diagnostic tail — a best-effort, diagnostic-only
  enhancement consistent with C23's pane-vs-pipe stance. Explicitly
  DEFERRED by the user at P4a ("oké, hogy ebbe most nem megyünk
  bele"); candidate home: a later runner-observability slice or the
  teardown/health chapter. Route: boundary-review.

- 2026-07-25 · ch9-P4a BUILD-CLOSE — gate-2 arm yield: 2 product P1s
  the FOUR internal layers (panel ×5 rounds, fresh-implementer,
  close ×2, gate-1 arm + re-check) all missed — (a) the seam's
  per-chunk UTF-8 decode corrupting chunk-split multibyte output
  (GR4 hashed a re-encoding, not raw bytes); (b) the tmux channel's
  poll-count time accounting stretching the C19 windows (client-call
  time uncounted). Both are BUILT-BODY defects invisible at spec
  grain — the gate-2 sensitivity pass is earning its keep (arm-yield
  data for the boundary's transitional-arm evaluation). Aftermath
  folded same-day (b03ad399), re-check CLEAN.
- 2026-07-25 · ch9-P4a BUILD-CLOSE — arm infra: gate-2's first run
  timed out at 600s mid-run (the doc-review budget is tight for a
  build-close leg — the 1200s mode was used on the retry paths);
  then a genuine codex-backend outage (HTTP 503, status-page
  confirmed) blocked the gate ~40 min — surfaced as a STOP
  (wait/waive, the user elected wait), resolved by status-page-gated
  re-probes. The unavailable-arm STOP discipline held: no silent
  skip, probes ≠ the formal retry.
- 2026-07-25 · ch9-P4b APPROVE — arm gate-1 infra, THIRD recurrence of
  the timeout class: the 600 s approve-gate cap KILLED an
  actively-working review (live transcript progress, not a hang) —
  rc=5, one §6-item-8 retry burned; the retry ran clean on the 1200 s
  mode (1000 s actual). USER-NAMED boundary item (frustration
  explicitly voiced): RAISE the approve-gate arm timeout to 20
  minutes (align with build-close) in ReviewPacket §6 +
  arm-pin/arm_run defaults at the ch9 boundary. Meta lesson, also
  user-named: this limit's insufficiency was re-derived per incident
  (ch12-P1b, ch9-P4a gate-2, now P4b gate-1) instead of being
  captured authoritatively at first recurrence — the §7
  capture-don't-fix rule applies to PROCESS knobs too.
- 2026-07-25 · ch9-P4b APPROVE — boundary candidate (user-elected at
  the re-approve dialogue): a `--strict` opt-in flag for
  `runner respawn` (nonzero exit iff the post-call state is not
  `confirmed`) — the ratified base semantics stay
  invocation-classified (exit = did the edge run; state = data); the
  opt-in mapping is for bare-exit-code scripting without a JSON
  parser. Route: boundary-review; the ch9 dogfooding checkpoint
  prices whether the need is real.
- 2026-07-25 · ch9-P4b BUILD-CLOSE — suite-load flake, SECOND occurrence
  of the real-tmux pacing class (the P4a build note already flagged
  pacing as a gate-2 look item): the p4b suite's +2 subprocess-heavy
  files grew parallel load, and TWO DIFFERENT tmuxChannel.test.ts
  real-tmux lanes flaked on different full runs (TX5 TERM-ignoring:
  the outer backstop killed a CPU-starved wrapper inside its 2 000 ms
  margin before the result write; then TX6 dead-benign) while every
  isolated run stayed green. Stabilized by the ORCHESTRATOR (outside
  the p4b boundary, separate commit): the TX5 lane's backstop margin
  widened to 8 000 ms + scoped `{ retry: 2 }` on the four real-tmux
  describes (vitest reports retries as flaky — visible; a semantic
  break still fails 3×, sensitivity kept). Boundary candidate: load
  robustness of real-substrate tests is a SUITE-level property —
  price it at the packet that grows the load.
- 2026-07-25 · ch9 CLOSE — DOGFOODING CHECKPOINT EXECUTED (hand-driven,
  user + orchestrator paired): the full DoD sequence live — create →
  start → worktree provisioned → runner run (tmux delivery, errand
  confirmed) → attach OBSERVED on a live actor → gate leg (real
  `external.process` spawn in the worktree, `verdict: allow,
  reason: sys:exit_zero`, evidence ref recorded, TERMINAL/done) →
  the tier-2 REAL-LLM leg (codex gpt-5.6-sol as the actor via the
  shipped `--actor-cmd` + `--env-allow HOME`, watched LIVE through
  read-only attach writing DOGFOOD.md in the worktree, errand
  confirmed). W1 PRICED: the actor lane's `--env-allow` sufficed for
  a real LLM CLI (PATH + HOME + PAIRFLOW_*); the gate lane needed no
  widening for the exercised command. Findings: (a) the runbook's
  `pnpm v3:cli -- <verb>` form breaks on current pnpm (the `--` is
  forwarded as the verb) — runbook fixed to the bare form + a
  `--silent`-for-piping note; (b) EPIPE on a closed pipe (`| jq`
  parse-fail, `| head`) CRASHES the CLI with a raw stack — a product
  robustness item, boundary-routed (capture-don't-fix at close);
  (c) the runbook's uncomment-the-gates instruction invites an
  indentation slip (live repro: 5-space `gates:`) — runbook now
  carries the ready-made uncommented block; the fail-at-create
  validator's stage/line/col finding was precise and helpful;
  (d) a `--once` tick polled BEFORE the target's create/start sees
  nothing — expected durable-convergence behavior, runbook now notes
  the ordering; (e) tmux status-bar truncates the long session name
  (cosmetic, non-issue); (f) the post-aftermath `NoErrand`
  distinct-name lane observed live on a real operator mistake — the
  fold earning its keep same-day.
- 2026-07-25 · ch9 BOUNDARY REVIEW HELD (verdicts, user-adjudicated
  one-by-one): (1) arm-timeout → RULE ADOPTED: uniform 20-min cap on
  EVERY arm run (ReviewPacket §6 edited, arm_run.sh default 1200 s —
  the 10-min tier retired after its third kill of a working review).
  (2) the `--strict` respawn-flag candidate → NON-ISSUE, candidate
  RETIRED (the invocation-classified exit + state-as-data is the
  ratified design; no scripting need surfaced; the scripting rule is
  now explicit in the runbook). (3) gate-lane env-allowlist (W1) →
  WATCH (dogfooding priced the actor lane sufficient — `--env-allow
  HOME` carried a real LLM; a future gate-side need fails loud and
  designs the widening then). (4) real-substrate suite-load
  sensitivity (2nd occurrence) → WATCH with a MECHANIZATION
  promotion: on recurrence the real-substrate test files move to a
  serial vitest lane (structural cure), not a procedural
  3×-runs rule; the stabilization (widened TX5 margin + visible
  retries) already landed. (5) EPIPE crash on a closed pipe →
  ADOPTED as a named later-chapter product item (the stdout sink
  handles EPIPE quietly; repro: `pnpm v3:cli detail … | head -1`).
  (6) mutation pilot → CONTINUE per plan (2nd data chapter next);
  ch9 read: the pilot's value here was the receipt-backed probe
  discipline, the runner plane being subprocess-blind to Stryker by
  the declared mechanism. (7) model-tier records: 5 late-captured
  difficulty entries + the §7 boundary entry appended (capture gap
  itself logged). (8) RULE RETIRED: R-RAW-FIXTURES — basis
  ABSORPTION, not bare zero-catch (exposure EXISTED: numeric-ladder
  tests kept being written; the discipline lives in the template §1
  fixture-watchpoint paragraph + the gate-2 sensitivity pass); the
  sweep itself gains the refinement that zero-catch is only evidence
  WITH an exposure check (the owner's question — adopted into the
  boundary procedure's practice). K0-gate reflection disposed: the
  ch9 draft's K0-NO ruling (errand ledger = runner-plane bookkeeping)
  held through realization — the admission rule routed correctly.
  Catch tally highlights: R-LANE-SENSITIVITY (3 product catches via
  gate-2 across P4a/P4b), R-DERIVED-PROBES (24 receipts),
  R-DELEGATION-CLOSURE, R-UNTRUNCATED-SWEEP, R-ALIGNED-UP (2
  repartitions), R-FIRST-STOP (5 firings) all earning keep.
- 2026-07-25 · POST-ch9-CLOSE hardening (user-ratified after the
  owner's reflection question — why did the reference-economy rule
  not fire on the EPIPE/map-audit carried items?): root cause is a
  BINDING-POINT gap (the rule is wired into packet authoring/review;
  the boundary phase has no reviewer over the orchestrator's own
  capture output) plus a vocabulary gap (the rule spoke of
  cross-references, not forward obligations) plus a route-action
  slip (the `later-chapter` route's OWN definition prescribes a
  plan-map row; the boundary-review route's log-line action was
  executed instead). ADOPTED A+B: (A) README §7's reflection-point
  bullet now binds the later-chapter route's plan-map-row action
  INTO the boundary act itself; (B) the R-PRESENT-TENSE
  reference-economy clause's scope extended to forward
  obligations/carried items with the conscious-carrier requirement.
  The §1.3 carried-items block (402248a3) is the retroactive
  execution of the route's defined action.
