# Implementation ADRs — Index

Home of the v3 implementation-plane decision records (convention: ADR-000;
activation: playbook §8 addendum + `implementation-contract.md` PI-10).
Model-side decisions do NOT live here — they stay in the corpus +
`docs/v3/topics/` memos.

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

## Trigger watch (dormant ADRs)

Declared triggers with no ADR yet — dormant by design, not gaps
(plan §1.2 `deferred(trigger)` rows). When a trigger fires, the ADR is born
`proposed` and enters the index above.

| Trigger | Fires when | Source |
|---|---|---|
| `ADR-A2-EXT` | an external system cannot accept an idempotency key | IC-A2 |
| `ADR-B-FENCE` | a future shape adds a lease-holding worker writing out-of-band to a shared external resource | IC-B |
