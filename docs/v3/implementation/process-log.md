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
