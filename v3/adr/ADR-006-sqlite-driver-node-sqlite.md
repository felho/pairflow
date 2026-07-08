# ADR-006: SQLite driver — node:sqlite on Node ≥ 24

Status: accepted
Date: 2026-07-07
Links: supersedes — · amends ADR-002 · amended-by ADR-010 · depends-on ADR-003 · related —

## Context

ADR-003 picked SQLite behind the `StorePort`; chapter 4 builds that store.
Driver candidates: `node:sqlite` (built-in) vs `better-sqlite3` (native
dependency). ADR-002 set the Node floor at ≥ 22; `node:sqlite` runs
unflagged only from Node 23.4 and is mature on the current LTS line
(≥ 24). The repo's validate path pins Node 22 (`release.yml` setup-node,
the `ci-github-local` container image), so the driver pick cannot land as
a `v3/package.json` engines line alone.

## Decision

**`node:sqlite` (`DatabaseSync`).** Zero external dependency (the stdlib
culture), synchronous API that fits the single-writer IMMEDIATE-transaction
shape IC-A1 needs.

**The Node floor moves WITH the driver** (chapter-4 ratification finding):

- `v3/package.json` engines → `>=24`;
- the validate path runs Node 24: `release.yml` setup-node 22 → 24, and
  the `ci-github-local` default image `node:22-bookworm` →
  `node:24-bookworm` (parity);
- root engines stays `>=22` — v1's own floor is untouched (Node 24
  satisfies it; the local suite already runs green on Node 26).

## Alternatives Considered

- **`better-sqlite3`** — battle-tested, same synchronous shape, but a
  native build dependency in a local-first, zero-dependency tool. Stays
  the cheap fallback: a driver swap is adapter work behind the
  `StorePort`, not a model or plan change.
- **Keep Node 22 + `--experimental-sqlite`** — rejected: a flagged
  experimental runtime in the validate path is drift bait, and the flag
  differs across the Node versions in play.

## IC-N Screen (mandatory)

No — a driver choice only; the store shape (materialized instance +
transcript, CAS, no event-sourcing source of truth) is fixed by ADR-003.

## Consequences

- Positive: zero-dependency store; real synchronous transactions for the
  IC-A1 commit shape.
- Negative: Node ≥ 24 required for v3 development and the validate path.
- Neutral: the driver is invisible outside the SQLite-backed substrate
  homes (`store/` + `diag/` — widened by ADR-010, which adds the diag
  store under `diag/`) — swapping it never touches the kernel.

## Verification

The chapter-4 store contract tests (`CT-A1-DUP`, `CHK-A1-SCHEMA`,
`CHK-C-TS-SOURCE`, the store-open fail-closed test) run on `node:sqlite`;
CI's validate job runs them on Node 24.

## Related

Plan §4.4 · ADR-002 · ADR-003.
