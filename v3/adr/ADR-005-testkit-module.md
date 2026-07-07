# ADR-005: testkit as a test-only support module

Status: accepted
Date: 2026-07-07
Links: supersedes — · amends ADR-001 · depends-on — · related ADR-002

## Context

Chapter 3 builds the test kit (PI-1): controlled clock, fake egress
adapter, scripted actor, deterministic gate/process fixtures. ADR-001's
module map does not carry a home for it. Leaving the map silently stale
would defeat the map's purpose; placing the kit outside `src/` would drop
it out of typecheck/lint coverage and out of reach of the ch-4 walking
skeleton's fixture-form template (MD-1), which is deliberately test-kit
shaped.

## Decision

`v3/src/testkit/` is added to the ADR-001 module map as a **test-only
support module**, with a binding import rule in both directions:

- **Production modules never import `testkit/`** — `domain/`, `kernel/`,
  `ports/`, `store/`, `ingress/`, `emit/`, `floor/`, `diag/` must not
  depend on it.
- **`testkit/` imports `ports/`, `domain/`, and `emit/` at most** — never
  `kernel/` or `store/`. The kit is the far side of the port seams (it
  IMPLEMENTS adapters and the clock); tests, not the kit, drive the
  kernel.

Both directions are lint-enforced from chapter 3, in the same
import-boundary check that mechanizes ADR-001's kernel rule.

## Alternatives Considered

- **`v3/test/` outside `src/`** — drops the kit out of the package's
  typecheck/lint surface and separates it from the port types it
  implements; rejected.
- **Fixtures inlined per test file** — no shared clock/egress/actor
  implementations means every contract test re-invents the seams, and
  IC-E's "the suite runs on the kit" loses its single witness; rejected.
- **Leaving ADR-001 untouched** — a stale module map; the amend link
  exists precisely for this.

## IC-N Screen (mandatory)

No — this decision touches none of the banned kernel shapes. It does not
bypass the model↔code divergence stop; it adds test infrastructure only.

## Consequences

- Positive: the kit stays under typecheck/lint; the import rule makes
  "tests drive the kernel through the kit" structural, not conventional.
- Negative: none identified beyond one more module in the map.
- Neutral: ADR-001's map is read WITH this amendment from now on.

## Verification

The ch-3 import-boundary lint (plan §3.3), negative-tested in both
directions: a production module importing `testkit/` fails; `testkit/`
importing `kernel/` or `store/` fails.

## Related

ADR-001 (module map — amended); plan §3.2; PI-1; MD-1 (the ch-4
fixture-form template consumes this kit).
