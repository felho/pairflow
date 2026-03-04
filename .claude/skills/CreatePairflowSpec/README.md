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

## Design choices

1. L1 contract is mandatory for implementation.
2. L2 notes are optional and non-blocking.
3. `P0/P1` requires evidence; otherwise downgrade.
4. `target_files` is required for code-generation context loading.

## Directory layout

```
CreatePairflowSpec/
├── SKILL.md
├── README.md
├── Workflows/
│   ├── CreatePRD.md
│   ├── CreatePlan.md
│   └── CreateTask.md
├── Templates/
│   ├── prd-template.md
│   ├── plan-template.md
│   └── task-template.md
├── references/
│   ├── L1-Contract-Boundaries.md
│   └── Reviewer-Guidelines.md
└── Tools/
    └── .gitkeep
```
