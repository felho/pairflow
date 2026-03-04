---
name: CreatePairflowSpec
description: Create or refine Pairflow PRD/Plan/Task documents with L0-L1-L2 contracts. USE WHEN create task file OR write task spec OR create plan OR create PRD OR refine spec OR convert notes to implementable task OR fix review loop in docs. Context-first and gap-only interview.
---

# CreatePairflowSpec

Create and refine Pairflow specification artifacts that are implementable by LLMs without infinite review loops.

## Workflow Routing

| Workflow | Trigger | File |
|----------|---------|------|
| **CreatePRD** | "create prd", "new prd", "draft prd", "write product doc" | `Workflows/CreatePRD.md` |
| **CreatePlan** | "create plan", "new implementation plan", "phase plan" | `Workflows/CreatePlan.md` |
| **CreateTask** | "create task", "task file", "task spec", "l0 l1 l2" | `Workflows/CreateTask.md` |

## Core Principles

1. Context-first: load known context before asking questions.
2. Gap-only interview: ask only for blocker missing fields.
3. L0 -> L1 -> L2 strict order.
4. L1 is the implementation contract; L2 is optional hardening.
5. Blocker severity is evidence-based (`P0/P1` only with concrete proof).
6. Avoid review-loop inflation: prioritize `required-now` vs `later-hardening` tagging.

## Minimum Contract Rules

1. Every Task output must include frontmatter with `artifact_type`, `artifact_id`, `status`, `phase`, `target_files`, `prd_ref`, `plan_ref`, `system_context_ref`.
2. `target_files` must not contradict L1 call-site matrix.
3. Every L1 section must be either filled or explicitly marked `N/A`.
4. Do not force all L1 items to `P1`; assign severity based on evidence.

## Templates and References

- Task template: `Templates/task-template.md`
- Plan template: `Templates/plan-template.md`
- PRD template: `Templates/prd-template.md`
- L1 boundaries checklist: `references/L1-Contract-Boundaries.md`
- Reviewer tags snippet: `references/Reviewer-Guidelines.md`

## Examples

**Example 1: Create task from rich context**
```
User: "Create a task for runtime-check bypass phase1, refs are in docs/... and plans/..."
-> Invokes CreateTask
-> Loads provided refs
-> Drafts full task directly
-> Asks only missing blocker question(s) if needed
```

**Example 2: Convert rough notes into plan**
```
User: "Here are notes, make a phase plan"
-> Invokes CreatePlan
-> Builds phase breakdown and task list
-> Asks for missing ownership/dependency only if blocking
```

**Example 3: Tighten an existing task**
```
User: "Refine this task to L0/L1/L2"
-> Invokes CreateTask
-> Reads existing file
-> Preserves intent, upgrades structure, adds missing contracts
-> Marks optional items as later-hardening
```
