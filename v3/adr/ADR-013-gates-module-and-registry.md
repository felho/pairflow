# ADR-013: the gates module — evaluators, static registry, injected composition

Status: accepted
Date: 2026-07-11
Links: supersedes — · amends ADR-001 · depends-on ADR-005 · related ADR-003

Draft-lane ADR (README §4 step 5): rides the `ch11-gate-format`
contract-draft (row C29) — `proposed` with the draft's content
commit; flipped `accepted` by the draft's human ratification act
(2026-07-12, the ratifying commit).

## Context

Plan chapter 11 realizes the L2 gate pipeline and the L2a
process-gate contract. The gate surface needs a home for the builtin
inline evaluators (`declarative.threshold`,
`pairflow.previous_reviewer_verdict`) and the static registry that
resolves `uses` ids — code that is neither kernel (the kernel is
port-parametric: domain + ports only, lint-enforced) nor domain (an
evaluator EXECUTES policy; domain carries shapes), nor definition
(admission resolves against the injected catalog —
ch11 draft C8/C20). The ch-3 placeholder seam in `ports/gate.ts`
(`GateRunner` with pass|fail verdicts, `ProcessRunner` with
`{exitCode, output}`) predates the ledger shapes and must be
reconciled, not paralleled.

## Decision

1. **A new `src/gates/` module** holds the builtin inline evaluators
   and the STATIC registry (Block A composition: exactly the three
   ids of draft C8). Import discipline: `gates/` imports `domain/`
   and `ports/` at most — never kernel, store, ingress, floor, diag,
   testkit; lint-enforced both directions like every ADR-001 module
   boundary (static + dynamic import forms, the ch8-opening sweep's
   rule).
2. **The registry/catalog reaches BOTH the kernel AND the definition
   compiler (admission) as INJECTED dependencies** at the composition
   root — the port-parametric rule holds for both (neither `kernel/`
   nor `definition/` imports `gates/`). ADMISSION resolves every
   `uses` at definition load (the ratified model fix, 453d3be9); the
   HANDLE gate rung keeps resolution as the runtime availability
   BACKSTOP (registry drift across process generations).
3. **`domain/` gains the ledger-named gate values** — the template's
   gate bindings and `GateDecision` (allow | warn | block) — shapes,
   no execution.
4. **`ports/gate.ts` is RECONCILED to the ledger shapes**: the ch-3
   placeholder types and their testkit scripted players are REPLACED
   by `GateRegistration` (the inline-evaluator variant carrying
   `evaluate`), the catalog/registry port, and `ProcessGateRunner`
   (result kinds per draft C26) — a named replacement sweep
   (ch11-P2/P3), never a parallel seam. The testkit re-shapes its
   deterministic players onto the six-outcome drive
   (allow/warn/block/timeout/runner_error/malformed).
5. **Wiring composes at the entrypoints** (CLI/testkit build the
   registry and hand it to `createKernel`), exactly like store,
   definitions, digest, and diag today.

## Alternatives Considered

- **Evaluators inside `kernel/`** — breaks the port-parametric rule
  (the kernel would carry policy implementations); rejected.
- **Evaluators inside `domain/`** — domain stays execution-free
  (shapes and pure predicates); an evaluator that runs a packaged
  policy is behavior; rejected.
- **Keep the ch-3 `ports/gate.ts` shapes and adapt** — pass|fail
  cannot carry warn, `{exitCode, output}` cannot carry
  timeout/runner_error kinds; adapting would build a translation
  layer to preserve a placeholder; rejected (the plan §3.1
  no-mini-domain rule anticipated this replacement).
- **A registry inside `definition/`** — static coupling of the
  compiler to evaluator composition; the injected catalog achieves
  admission-time resolution WITHOUT the import (draft C8/C20);
  rejected.

## IC-N Screen (mandatory)

No — a new leaf module with injected composition touches none of the
banned kernel shapes; the kernel consumes one more injected port and
never imports the module (the ADR-001 allowlist extends to `gates/`,
static + dynamic forms). The divergence stop is not bypassed: every
gate semantic realized here projects from the l2/l2a ledger slices.

## Consequences

- Positive: policy execution gets a single lint-bounded home; the
  kernel stays port-parametric; registry composition is explicit at
  the entrypoints; the placeholder seam retires instead of rotting.
- Negative: one more module + port widens `KernelDeps`; the
  entrypoint wiring grows.
- Neutral: no dependency change (ADR-012 stays the only runtime
  dependency; `gates/` is stdlib + local imports only).

## Verification

ch11-P2/P3: the module boundary lint probes executed (value-red /
type-green / dynamic-red, both directions); the admission drives
`gate_evaluator_unavailable` as an issue and the HANDLE backstop as a
rejection; the replacement sweep
leaves zero references to the ch-3 placeholder shapes
(`git grep` receipts in the packet's build record).

## Related

The `ch11-gate-format` contract-draft (C8, C9, C26, C29); plan §11;
ADR-001 (module map — amended); ADR-005 (testkit boundary, the
re-shaped players); ADR-003 (the `gateDecisions` schema bump rides
its fenced-wipe stance).
