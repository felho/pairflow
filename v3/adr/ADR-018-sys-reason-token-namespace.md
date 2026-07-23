# ADR-018: the `sys:` reason-token namespace convention

Status: accepted
Date: 2026-07-23
Links: supersedes — · amends — · depends-on — · related ADR-016

## Context

Reason-payload domains carry two families of tokens: SYSTEM-minted
(the process-gate runner's fixed outcomes; the provisioning-failure
reasons) and EXTERNALLY-authored (a template author's process-gate
reason, grammar `^[a-z][a-z0-9_]*$`). The ch11-C31 realized row
claimed the families disjoint BY RULE, but the admission validator
enforced only the grammar — an authored process returning
`gate_blocked` (a registry rejection name) was accepted verbatim: a
material under-realization found by the realized-map arm audit
(2026-07-23). A runtime cross-check against every token list would
couple every future domain to a central registry; the owner's decided
direction is structural instead. This is a K1 + K2 lift (README §6):
the convention binds every present AND future reason domain, and its
by-construction rationale is invisible in the code that merely uses
prefixed strings.

## Decision

**Every system-minted token in ANY reason-payload domain carries the
`sys:` prefix; externally-authored tokens can never contain `:`.**

- The authored grammar (`^[a-z][a-z0-9_]*$`, ch11-C17) cannot express
  `:` — disjointness between authored and system tokens holds BY
  CONSTRUCTION in every domain, present and future, with NO runtime
  cross-check and no central token registry. The same construction
  separates system tokens from REGISTRY names (no registry name
  contains `:`).
- **The authored-vs-registry residual — RECOMMENDED resolution:
  positional** (final at the ratification act; electing the
  Alternatives' registry-name check instead refreshes the prepared
  payload and re-checks the bytes before the GO): an authored token may SPELL a
  registry name (colon-free), but a reason token never occupies a
  rejection-name position — payload-only, positionally harmless; the
  ch11-C31 successor text NARROWS its earlier set-disjointness
  promise to this positional rule. (The fail-closed registry-name
  check on authored tokens stays electable at the ratification act —
  see Alternatives.)
- First instantiations: the ch11-C31 successor's seven fixed reason
  tokens (`sys:round_below_min`,
  `sys:no_previous_verdict`, `sys:exit_zero`, `sys:exit_nonzero`,
  `sys:runner_error`, `sys:timeout`,
  `sys:malformed_gate_decision_json`) and the ch9 provisioning-failure
  domain (`sys:provision_rejected`, `sys:provision_failed`).
- Registry rejection names are UNTOUCHED: reason tokens are payload,
  never registry names (the ch11-C31 boundary stands; the 54-name
  registry does not change).

## Alternatives Considered

- **Runtime cross-check of authored tokens against the registry +
  fixed-token lists** — rejected as the GENERAL mechanism (couples
  every future reason domain to a central list, and misses
  tomorrow's domain unless someone remembers to wire it; the
  structural form needs no memory). A NARROW variant — rejecting an
  authored token that equals a registry name at the runner-outcome
  admission point only — remains ELECTABLE at the ch9 ratification
  act as an alternative to the positional-boundary narrowing (the
  draft's C27 records the decision point); it is not the
  recommendation because the positional rule already makes the
  collision harmless and the check re-couples what the namespace
  decoupled.
- **Leave as-is (grammar-only validation)** — rejected: the ratified
  disjointness claim is then unenforced — the exact
  under-realization the arm audit caught.
- **Prefix the AUTHORED tokens instead (e.g. `usr:`)** — rejected:
  breaks every existing authored template token and pushes migration
  cost onto template authors; prefixing the system's own tokens costs
  one contract reopen and a mechanical rename.

## IC-N Screen (mandatory)

No. A naming convention on payload tokens; no kernel shape touched.
This screen does not bypass the model↔code divergence stop — the
ch11-C31 rename itself travels the sanctioned contract-reopen path
(realized-reopen, template §4), carried by the ch9 draft-ratification
act.

## Consequences

- Positive: disjointness is unforgeable in every future reason
  domain; audit reads become trivial (`sys:` = the system speaking);
  no central token registry to maintain.
- Negative: a one-time rename of seven ratified tokens (C31 text, the
  l2a trace, tests, the transcript/audit surface — ch9-P0's scope);
  transcript rows written before the rename carry the old spelling
  (prototype-store stance accepts this; the fenced-wipe path exists).
- Neutral: the prefix is a spelling convention, not a parser
  obligation — consumers still treat tokens as opaque strings.

## Verification

The authored-grammar test proves `:` is inexpressible; the ch9-P0
rename lands with drift lanes green (54 registry names unchanged);
the l2a golden trace re-drives `gate_blocked(reason=sys:runner_error)`;
the ch9 provisioning-failure domain tests validate against the closed
`sys:` enum at the transport gate.

## Related

ch11-gate-format C31 (the reopened row this convention repairs); ch9
contract rows C3, C21, C22; the realized-map arm-audit process-log
entries (2026-07-23).
