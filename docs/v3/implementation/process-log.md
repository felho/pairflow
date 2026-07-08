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
