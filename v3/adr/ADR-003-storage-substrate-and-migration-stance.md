# ADR-003: Storage substrate and migration stance

Status: accepted
Date: 2026-07-07
Links: supersedes — · amends — · depends-on ADR-001 · related —

## Context

PI-7 requires a storage substrate pick + an explicit migration stance
(storage memo open questions #1 and #8). The candidates for the T1 canonical
run store: SQLite + filesystem, Postgres + filesystem, Postgres + object
store. Block A is a local, single-operator v1; IC-A1 requires the op-record
insert and the instance CAS under ONE transaction with
`UNIQUE(instance_id, op_id)`; the storage memo warns that SQLite is fragile
across mount boundaries.

## Decision

**Substrate.** The T1 canonical run store's first substrate is **SQLite**
(WAL mode); evidence/artifacts live on the filesystem **by reference** (T3);
all access goes through the `StorePort`. IC-A1's transaction shape holds
natively; IC-B needs no `SKIP LOCKED` — claiming is scheduling, never
semantics, and correctness comes from uniqueness + CAS, which SQLite
enforces the same way (`CT-B-TWOWORKER` runs on WAL + immediate
transactions). A Postgres swap is later adapter work behind the port, not a
model decision.

**Authority guardrail (binding).** The SQLite T1 store is **kernel-owned,
host-local authority**:

- actors, runtimes, and worktrees get NO direct database access — state is
  reachable only through the ingress, the floor, and the adapter surfaces;
- the DB file is never an agent-touchable working file, and it never sits
  on a shared/synced mount as a coordination surface (the memo's
  mount-boundary fragility warning).

**Migration stance: wipe-and-recreate — fenced.**

- Applies to **development/prototype stores only**, identified by an
  explicit schema marker (schema version + prototype flag) written at store
  init.
- A store with an unknown, missing, or non-prototype marker → **fail
  closed**: refuse to open, never silently wipe. This ADR is NOT a general
  data-loss license.
- No migration framework until the schema stops moving fast; revisiting
  that is a new ADR.

## Alternatives Considered

- **Postgres + filesystem / Postgres + object store** — rejected for
  round 1: an external service dependency in a local-first tool; nothing in
  Block A needs its concurrency primitives. Revisit trigger: multi-host or
  org-scale topology (the storage memo's instance-homing direction).
- **Unfenced wipe-and-recreate** — rejected: an accepted ADR would read as
  a standing data-loss permission.

## IC-N Screen (mandatory)

No — the store keeps the materialized `WorkflowInstance` + transcript/audit
+ per-instance version/CAS shape; no event-sourcing source of truth, no
reconciler for kernel state.

## Consequences

- Positive: zero-dependency local store; real transactions for IC-A1; the
  port keeps the substrate swappable.
- Negative: single-writer throughput limits (irrelevant at Block A scale);
  Postgres idioms (advisory locks, `SKIP LOCKED`) unavailable — by design
  not needed.
- Neutral: storage memo questions #2–#7 stay open on the model plane; the
  schema itself lands with ch 4 (`CHK-A1-SCHEMA`).

## Verification

`CT-A1-DUP` + `CHK-A1-SCHEMA` (ch 4); `CT-B-TWOWORKER` (ch 5); a store-open
contract test for the fail-closed marker path (ch 4, with the schema); the
authority guardrail is a standing review surface
(`REV-B-LOCAL-NOT-AUTHORITY`).

## Related

Plan §2.4 · storage memo (`v3/design/topics/_open-v3-storage-architecture.md`)
#1/#8 · ADR-001.
