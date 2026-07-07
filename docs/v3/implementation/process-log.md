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
