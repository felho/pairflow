# ADR-002: Language and tooling

Status: accepted
Date: 2026-07-07
Links: supersedes — · amends — · depends-on ADR-001 · related —

## Context

The v3 package needs language/runtime/tooling picks (a build-loop step-5 ADR
trigger). The repo's existing culture is TypeScript strict / Node ≥22 / pnpm
/ vitest / eslint, with a check.sh/CI-local evidence culture; the PI-3 drift
tests compare a typed domain layer against the ledger registries.

## Decision

- **TypeScript strict** on **Node ≥22**, `pnpm` as package manager.
- The v3 `tsconfig` mirrors the root's strict flags
  (`noUncheckedIndexedAccess`, `exactOptionalPropertyTypes`, etc.) but is
  isolated — no config inheritance across the package boundary.
- **vitest** for the test kit and contract tests; wiring lands with its
  first consumer (chapter 3). The scaffold ships `typecheck` only.
- **eslint** for the lint-borne checks (`CHK-D-NOCLOCK`, the kernel
  import-boundary rule); wiring lands with chapter 3 (the constraint sink).
- Root bridge scripts: `v3:typecheck`, `v3:adr-check` (extended as v3
  scripts appear).

## Alternatives Considered

- **A different language (Rust/Go)** — rejected for round 1: the domain
  type layer's drift tests, the v1 tooling, the skills, and the LLM
  ergonomics all assume the TS culture; a rewrite adds risk with no Block A
  payoff.
- **Immediate vitest/eslint wiring in ch 2** — rejected: no consumer yet;
  the constraint-sink chapter owns the first real configs.

## IC-N Screen (mandatory)

No — tooling only; no kernel shape touched.

## Consequences

- Positive: zero new culture to learn; the type layer doubles as drift-test
  substrate.
- Negative: TS gives weaker exhaustiveness guarantees than some
  alternatives; compensated by the strict flags + the invariant suite.
- Neutral: tooling versions ride the root's upgrade cadence.

## Verification

`pnpm v3:typecheck` green; from ch 3 the `CHK-D-*` lint checks and the
kit-driven `CT-*` suite run on this stack.

## Related

Plan §2.3 · ADR-001.
