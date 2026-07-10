# ADR-011: the definition module — authored-definition surface home

Status: accepted
Date: 2026-07-10
Links: supersedes — · amends ADR-001 · depends-on ADR-000 · related ADR-002, ADR-005, ADR-009

Born at the chapter-8 ratification (plan §8.7) and accepted by that
ratification act (the chapter-ratification-born ADR lane, README §4
step 5).

## Context

PI-5's template file-format spec (plan chapter 8) creates three new
code artifacts: the format knowledge (parse), the fail-at-create
validator, and a file-backed `DefinitionStore`. None fits an existing
ADR-001 module cleanly: `domain/` is the pure ledger mirror (the file
format is memo-born and has no model units — parking a parser there
would blur the drift-mapping discipline that maps model units to
code); `store/` means "the run-state SQLite substrate" (a filesystem
definition reader is a different substrate for a different aggregate);
the kernel is port-parametric and must stay ignorant of where
definitions come from.

## Decision

**`src/definition/` is a new top-level v3 module** (amends ADR-001's
module map): the authored-definition surface — format parse, the
validator, and the file-backed `DefinitionStore` — in one home.

- **Cohesion:** future format growth (the gate-declaration surface
  arriving with the L2 gate-core chapter, plan §8.1) touches one
  module.
- **Mirrors the model:** the definition aggregate is a SEPARATE store
  from the run store ("separate store; pinned immutable version") —
  the code map shows the same cut the model states.
- **Import stance:** `definition/` may import `domain/` (types),
  `ports/`, node builtins, and the chapter's YAML dependency. No
  production module imports `definition/` — composition roots (the
  CLI runtime) wire it into the kernel through the existing
  `DefinitionStore` port. The production testkit/drift lint bans
  (static AND dynamic forms) extend to `src/definition/**`.
- The lint extension and its executed probes land with packet ch8-P1
  (the lint config change is code, not ratification material).

## Alternatives Considered

- **Parser/validator in `domain/`, file store in `store/`** — no new
  module, but memo-born code enters the ledger-mirror module (muddies
  the unit→code drift mapping) and `store/` starts meaning two
  substrates for two aggregates. Rejected at the ch-8 ratification.
- **Everything in `cli/`** — the CLI is a thin client (ADR-009,
  "ZERO semantics"); a validator is semantics. Rejected.
- **A separate package** — the ADR-001 standalone-package topology
  exists precisely so module boundaries stay lint-enforced inside ONE
  package; a second package would fragment the drift/coverage tooling
  for no isolation gain. Rejected.

## IC-N Screen (mandatory)

No — a module boundary and a load-path surface touch none of the
banned kernel shapes; the kernel keeps consuming the unchanged
`DefinitionStore` port, and template well-formedness failures stay
LOAD-side (no envelope path, no new rejection names; plan §8.4).

## Consequences

- Positive: the definition surface has one owner module; the gate
  surface's later landing is a local change; `domain/` and `store/`
  keep their single meanings.
- Negative: one more module row in every production-wide lint entry
  (files lists grow by `src/definition/**`).
- Neutral: the module ships with the v3 package's FIRST runtime
  dependency (the YAML 1.2 parser) — that decision is the draft-lane
  dependency ADR amending ADR-002, not this one.

## Verification

The ch8-P1 packet: lint-boundary probes EXECUTED for
`src/definition/**` (testkit/drift static + dynamic red, composition
wiring green); the validator's canonical contract matrix fully driven;
`v3/adr/check.sh` green with this file present.

## Related

Plan §8.1, §8.5, §8.7 (this chapter); ADR-001 (module map — amended);
ADR-002 (stdlib stance — amended by the draft-lane dependency ADR);
ADR-005 (testkit ban extended to the new module); ADR-009 (the CLI
stays the composition root that wires the store).
