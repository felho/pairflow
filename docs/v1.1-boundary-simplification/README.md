# v1.1 Boundary Simplification Docs

Status: active index
Owner: architecture/runtime
Scope: navigation and authority map for the v1.1 boundary simplification document set.

## Current Authority

- [v1.1-implementation-roadmap.md](./v1.1-implementation-roadmap.md) - active execution and stabilization roadmap.
- [decision-log.md](./decision-log.md) - formal architecture decision record for this initiative.
- [v1.1 architecture context.md](./v1.1%20architecture%20context.md) - discovery-era architecture context and invariant framing; use the roadmap and `docs/architecture/**` when they provide a newer, narrower rule.
- [component-one-pagers/](./component-one-pagers/) - ratified M0 component baselines and follow-up roadmap.

## Supporting Checklists And Annexes

- [contract-case-good-enough-checklist.md](./contract-case-good-enough-checklist.md) - draft baseline checklist; prefer [../architecture/architecture-fitness-checks.md](../architecture/architecture-fitness-checks.md) for current fitness policy when they overlap.
- [orchestration-matrix-annex.md](./orchestration-matrix-annex.md) - draft command-level annex.

## Task Artifacts

These files are task-spec artifacts retained for traceability. They should not
override newer implementation, architecture, or fitness-policy documents:

- [task-m0-01-bubble-mutation-runner-inventory-and-post-append-helper.md](./task-m0-01-bubble-mutation-runner-inventory-and-post-append-helper.md)
- [task-m5-01-watchdog-timeout-pane-quiet-window.md](./task-m5-01-watchdog-timeout-pane-quiet-window.md)
- [task-m6-01-v11-closure-phase4-infrastructure-inventory-and-topology-lock.md](./task-m6-01-v11-closure-phase4-infrastructure-inventory-and-topology-lock.md)

## Archive

- [archive/](./archive/) contains first ideas and superseded draft task artifacts.

## Maintenance Rule

When a v1.1 document changes a protocol, state-machine, or fitness-gate rule,
also update the narrower active authority document under `docs/architecture/**`
or the relevant implemented task/plan artifact.
