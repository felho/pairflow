# ADR-001: Code home, package topology, module boundaries

Status: accepted
Date: 2026-07-07
Links: supersedes — · amends — · depends-on ADR-000 · related ADR-002

## Context

The v3 kernel needs a code home. The model↔code contract surface
(`v3/model/ledger.md`) is drift-tested against the code
(PI-3), and the build loop executes through the v1 machinery — both live in
this repo. The v1 CLI package (`src/` → dist → npm publish) has its own
release lifecycle the v3 work must not entangle.

## Decision

**Code home:** a top-level `v3/` directory in this repo, as a **standalone
package** — own `package.json`, own lockfile, own `tsconfig`, reached from
the root via `pnpm --dir v3 ...` bridge scripts (the existing `ui/`
pattern). The repo does NOT become a pnpm workspace; a workspace conversion
would be a separate tooling ADR, never a silent drift.

**Module boundaries** under `v3/src/` (the dependency direction is the
rule):

- `domain/` — the ledger §4 type layer + the 85-name rejection type;
- `kernel/` — the **port-parametric kernel**: apply/commit logic and
  invariants, parameterized over the `ports/` interfaces; imports `domain/`
  and `ports/` ONLY — never `store/`, an adapter, or the clock;
- `ports/` — injected interfaces (`StorePort`, `ActorAdapter`,
  `EgressAdapter`, `GateRunner`, `TimeSource`) — IC-D / IC-E as types;
- `store/` — the SQLite `StorePort` implementation + schema (ADR-003);
- `ingress/` — op-envelope validation → kernel, adapter-independent (IC-E);
- `emit/` — the emit-lib (IC-A3; content ch 3);
- `floor/` — the read-only visibility floor (PI-2; content ch 6);
- `diag/` — the non-authoritative diagnostic channel (PI-4; content ch 7).

The kernel import boundary is lint-enforced from chapter 3 (beside
`CHK-D-NOCLOCK`); until then it is a review surface
(`REV-E-NO-ADAPTER-BRANCH`, `REV-B-LOCAL-NOT-AUTHORITY`).

## Alternatives Considered

- **Separate repo** — rejected: the drift tests need the ledger and the
  code in one repo, or the divergence stop degrades into cross-repo sync.
- **Inside the v1 `src/`** — rejected: every v3 commit would touch the
  published CLI package's build/test/release pipeline.
- **pnpm workspace conversion** — deferred: a separate tooling decision;
  the standalone `--dir` pattern matches how `ui/` already isolates.

## IC-N Screen (mandatory)

No — repo topology and module layout; no kernel shape touched. The layout
in fact *encodes* two IC guardrails as structure (IC-D, IC-E via `ports/`).

## Consequences

- Positive: v1 and v3 lifecycles stay independent; the kernel boundary is a
  directory boundary, cheap to lint later.
- Negative: two lockfiles to maintain; root scripts must bridge explicitly.
- Neutral: the scaffold ships empty modules; content arrives per the plan's
  chapter map.

## Verification

`pnpm v3:typecheck` green; the ch-3 import-boundary lint once it lands; the
standing `REV-*` rules until then.

## Related

Plan §2.1–2.2 · ADR-002 (tooling) · ADR-003 (storage).
