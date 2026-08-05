# Implementation ADRs — Index

Home of the v3 implementation-plane decision records (convention: ADR-000;
activation: playbook §8 addendum + `implementation-contract.md` PI-10).
Model-side decisions do NOT live here — they stay in the corpus +
`v3/design/topics/` memos.

Template: [`_template.md`](_template.md) — the IC-N screen is mandatory.
Lifecycle: `proposed → accepted → deprecated | superseded by ADR-XXX`
(supersede is permanent; the successor lists `Supersedes:`).
Integrity check: [`check.sh`](check.sh) — root bridge `pnpm v3:adr-check`.

## Index

| ID | Title | Status | Date |
|---|---|---|---|
| [ADR-000](ADR-000-record-implementation-decisions-as-adrs.md) | Record implementation decisions as ADRs | accepted | 2026-07-07 |
| [ADR-001](ADR-001-code-home-package-topology-module-boundaries.md) | Code home, package topology, module boundaries | accepted | 2026-07-07 |
| [ADR-002](ADR-002-language-and-tooling.md) | Language and tooling | accepted | 2026-07-07 |
| [ADR-003](ADR-003-storage-substrate-and-migration-stance.md) | Storage substrate and migration stance | accepted | 2026-07-07 |
| [ADR-004](ADR-004-op-id-scheme-per-operation-family.md) | op_id scheme per operation family | accepted | 2026-07-07 |
| [ADR-005](ADR-005-testkit-module.md) | testkit as a test-only support module | accepted | 2026-07-07 |
| [ADR-006](ADR-006-sqlite-driver-node-sqlite.md) | SQLite driver — node:sqlite on Node ≥ 24 | accepted | 2026-07-07 |
| [ADR-007](ADR-007-drift-test-module.md) | drift as a test-only module — the model↔code lock's home | accepted | 2026-07-07 |
| [ADR-008](ADR-008-transcript-digest-form.md) | the transcript digest is type-inclusive — two digest surfaces | accepted | 2026-07-07 |
| [ADR-009](ADR-009-operator-cli-module-and-dev-boundary.md) | the operator CLI module and the dev entrypoint boundary | accepted | 2026-07-08 |
| [ADR-010](ADR-010-diag-store-separate-sqlite-file.md) | the diag store is a separate SQLite file, fail-open | accepted | 2026-07-09 |
| [ADR-011](ADR-011-definition-module.md) | the definition module — authored-definition surface home | accepted | 2026-07-10 |
| [ADR-012](ADR-012-yaml-runtime-dependency.md) | the yaml package — the first v3 runtime dependency | accepted | 2026-07-10 |
| [ADR-013](ADR-013-gates-module-and-registry.md) | the gates module — evaluators, static registry, injected composition | accepted | 2026-07-11 |
| [ADR-014](ADR-014-runtime-core-module-homes-and-provider-seam.md) | runtime-core module homes — lifecycle in the kernel, the provider seam as a port | accepted | 2026-07-18 |
| [ADR-015](ADR-015-v3-plane-consolidation.md) | v3 plane consolidation — `docs/v3/` merges into `v3/` | accepted | 2026-07-21 |
| [ADR-016](ADR-016-delivery-errand-ledger-shape.md) | the delivery-errand ledger — runner-owned, scheduling-only claims, kernel-evidence confirmation | accepted | 2026-07-23 |
| [ADR-017](ADR-017-spawn-confinement-boundary.md) | one spawn discipline — cwd confinement, env allowlist, timeout kill | accepted | 2026-07-23 |
| [ADR-018](ADR-018-sys-reason-token-namespace.md) | the `sys:` reason-token namespace convention | accepted | 2026-07-23 |
| [ADR-019](ADR-019-declared-schema-for-structural-definition-rules.md) | structural definition rules become declared schema — one engine, both channels | accepted | 2026-08-05 |

## Trigger watch (dormant ADRs)

Declared triggers with no ADR yet — dormant by design, not gaps
(plan §1.2 `deferred(trigger)` rows). When a trigger fires, the ADR is born
`proposed` and enters the index above.

| Trigger | Fires when | Source |
|---|---|---|
| `ADR-A2-EXT` | an external system cannot accept an idempotency key | IC-A2 |
| `ADR-B-FENCE` | a future shape adds a lease-holding worker writing out-of-band to a shared external resource | IC-B |
