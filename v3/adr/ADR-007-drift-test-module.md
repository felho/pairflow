# ADR-007: drift as a test-only module — the model↔code lock's home

Status: accepted
Date: 2026-07-07
Links: supersedes — · amends ADR-001 · depends-on — · related ADR-005

## Context

Chapter 5 builds the PI-3 drift suite (packet ch5-P1): the three
unconditional tests that keep the model's machine face (ledger §3/§4 +
the `v3/model/units/` tree) and the code from shearing. The suite needs
a home with unusual properties: its tests read model documents at test
time, its manifests must be type-bound to `domain/` exports (a vanished
type = compile error), and one manifest (`unitMap.json`) must be readable
by the stdlib-only Python coverage checker too. ADR-001's module map
carries no such module.

## Decision

`v3/src/drift/` is added to the ADR-001 module map as a **test-only
module** — the model↔code contract surface's code end:

- **Production modules never import `drift/`** — same rule and lint
  entry family as ADR-005's testkit direction.
- **Two-tier `domain/` import rule:**
  - `drift/*.test.ts` MAY value-import domain runtime registry values
    (the rejection drift test compares the runtime `REJECTION_NAMES`
    value against ledger §3 — a type-only rule would make the test
    impossible);
  - non-test drift modules (the manifests / import tables,
    `domainRegistry.ts`) are `import type` ONLY — static bookkeeping;
    a value import there would smuggle runtime coupling into a proof
    that is deliberately compile-time.
- **`drift/` reads `v3/model/` at test time** (the
  ch-4 `rejectionNames.test.ts` precedent, now the module norm).
- **`drift/unitMap.json` is dual-read**: the vitest drift test AND
  `tools/v3-plan/check_coverage.py` (the three-way ledger ↔ manifest ↔
  packet lock) — which is why it is JSON, not TS.

Both lint directions land negative-tested in the same import-boundary
layer that mechanizes ADR-001 and ADR-005.

## Alternatives Considered

- **Folding the drift tests into `testkit/`** — the kit implements port
  seams for tests to DRIVE the kernel; drift is a document↔code lock
  with opposite dependencies (reads v3/model, binds domain types).
  Mixing them muddles both ADR-005 import rules; rejected.
- **A TS `unitMap.ts` manifest** — either the Python checker grows a TS
  parser (fragile, non-stdlib) or the lock loses its script end;
  rejected (pre-approval decision, plan §5.1 aligned).
- **Manifests outside `src/`** — drops them out of typecheck, which IS
  the existence proof for realized rows; rejected.

## IC-N Screen (mandatory)

No — this decision touches none of the banned kernel shapes. It does not
bypass the model↔code divergence stop; it adds the machinery that makes
that stop mechanically visible (drift tests red = the planes sheared).

## Consequences

- Positive: name-space drift (rejections, registry entities, unit ids)
  and ownership/disposition drift fail red in CI; realized-type
  existence rides `v3:typecheck` for free.
- Negative: the manifests are hand-maintained rows (121 + 158) — the
  cost of every future packet is one manifest touch; the lock makes
  forgetting it a hard failure, not a silent gap.
- Neutral: ADR-001's map is read WITH this amendment from now on.

## Verification

Lint: a production module importing `drift/` fails; a non-test drift
module value-importing `domain/` fails — both executed at build
(ch5-P1). Typecheck: a vanished realized type and a vanished rejection
union member both break `v3:typecheck` — executed at build. Script:
`check_coverage.py --selftest` proves every cross-check dimension red
on throwaway fixtures, chained into the `v3:coverage` bridge.
