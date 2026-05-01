# CreatePairflowSpec

A skill for creating and refining Pairflow PRD/Plan/Task artifacts with a contract-first workflow.

## Why this skill exists

Teams often have enough context already, but lose time in long interviews or endless review loops. This skill uses a context-first and gap-only approach:

1. load known information,
2. draft immediately,
3. ask only blocker questions,
4. produce implementable docs with explicit boundaries.

## What it creates

1. PRD documents (`CreatePRD`)
2. Plan documents (`CreatePlan`)
3. Task documents with `L0/L1/L2` (`CreateTask`)
4. Planning/spec review outputs (`ReviewSpec`)

## Design choices

1. L1 contract is mandatory for implementation.
2. L2 notes are optional and non-blocking.
3. `P0/P1` requires evidence; otherwise downgrade.
4. `target_files` is required for code-generation context loading.
5. Work type determines minimum artifact chain (`task-only` vs `PRD -> Plan -> Task`).
6. `later-hardening` items are emitted in a standard Hardening Backlog block.
7. Contract-boundary override forces at least `Plan -> Task` even for small features.
8. Plans are coverage/dependency artifacts, not duplicate task-spec repositories.
9. Complexity-risk triage primarily drives task sizing and split decisions; plans should not persist stale per-task numeric risk by default.
10. High boundary-risk scopes should split before implementation; for authority fan-out this often means producer-first sequencing rather than a flat `foundation -> delivery -> activation`.
11. Shared contract changes require explicit current-consumer inventory and additive-vs-breaking classification.
12. The authority fan-out vocabulary is an analysis aid, not an automatic 6-phase template; the skill should prefer the smallest safe split.
13. Tasks must prove their real scope from `target_files` and touched entrypoints, not just from their label.
14. Tasks that refine existing runtime/canonicalization paths should record baseline-preservation rules so review tightening cannot silently remove required behavior.
15. If a spec forbids fallback heuristics, it should also say which deterministic same-authority resolution paths remain allowed.
16. Mutable-flow tasks should make the precondition-before-side-effect boundary explicit, including invalid-input side-effect expectations.
17. `ReviewSpec` is two-mode: `plan-mode` validates coverage/dependency/viability, while `task-mode` validates the task artifact plus target-file scope reality.
18. Contract-dense tasks should use one canonical contract matrix, explicit ownership/deferred semantics, structured contract rules, and a mirrored-surface checklist instead of scattering equivalent truth across prose sections.

## Directory layout

```
CreatePairflowSpec/
├── SKILL.md
├── README.md
├── Workflows/
│   ├── CreatePRD.md
│   ├── CreatePlan.md
│   ├── CreateTask.md
│   └── ReviewSpec.md
├── Templates/
│   ├── prd-template.md
│   ├── plan-template.md
│   └── task-template.md
├── references/
│   ├── Bounded-Task-Shape-Gate.md
│   ├── Contract-Dense-Task-Gate.md
│   ├── Remaining-Task-Viability-Check.md
│   ├── L1-Contract-Boundaries.md
│   └── Reviewer-Guidelines.md
└── Tools/
    └── .gitkeep
```
