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
