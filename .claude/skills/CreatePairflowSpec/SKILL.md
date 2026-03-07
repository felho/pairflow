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

## Mandatory Work-Type Triage

Before choosing the workflow output shape, classify the request:

| Work Type | Minimum Artifacts | Policy |
|-----------|-------------------|--------|
| bugfix | Task only allowed | `prd_ref: null`, `plan_ref: null` is acceptable. |
| docs-only | Task only allowed | `prd_ref: null`, `plan_ref: null` is acceptable. |
| small feature | Task only by default | Plan is required if contract-boundary override is triggered. |
| large feature | PRD -> Plan -> Task | Task should reference both PRD and Plan. |
| new app / greenfield | PRD -> Plan -> Task(s) | Start from PRD, then Plan, then Task split. |

## Contract-Boundary Override (Mandatory)

If any of the following is true, apply contract-boundary override:
1. DB schema contract changes (new table/column/index/constraint, migration).
2. Public API/interface contract changes (request/response, status semantics).
3. Event/message payload contract changes.
4. Auth/permission model changes.
5. Config/env contract changes required for runtime behavior.

Override policy:
1. Minimum artifact chain becomes `Plan -> Task` (task-only is not allowed).
2. `plan_ref` must not be `null`.
3. L1 must explicitly capture the changed interface contract and test coverage.

## Core Principles

1. Context-first: load known context before asking questions.
2. Gap-only interview: ask only for blocker missing fields.
3. L0 -> L1 -> L2 strict order.
4. L1 is the implementation contract; L2 is optional hardening.
5. Blocker severity is evidence-based (`P0/P1` only with concrete proof).
6. Avoid review-loop inflation: prioritize `required-now` vs `later-hardening` tagging.
7. Identifier discipline first: cross-reference IDs must be canonical, exact-match, and auditable.

## Minimum Contract Rules

1. Every Task output must include frontmatter with `artifact_type`, `artifact_id`, `status`, `phase`, `target_files`, `prd_ref`, `plan_ref`, `system_context_ref`.
2. `target_files` must not contradict L1 call-site matrix.
3. Every L1 section must be either filled or explicitly marked `N/A`.
4. Do not force all L1 items to `P1`; assign severity based on evidence.
5. Every refined Task output must include a standard `Hardening Backlog` section for non-blocking (`later-hardening`) items.
6. If contract-boundary override is triggered, `plan_ref` is mandatory and L1 contract rows for impacted boundaries are mandatory.
7. L1 must explicitly include: required vs optional fields, exact entry signatures, pure-by-default side-effect rule, and dependency-failure fallback where applicable.
8. Cross-reference integrity is mandatory:
   - every referenced ID (`AC*`, `T*`, `CS*`, `SL*`, `RC*`, token IDs like `REQ_*`/`FORBID_*`) must exist exactly once in the same document scope,
   - no shorthand aliases are allowed in lock/mapping rows when canonical token IDs exist.
9. Test matrix rows must be self-contained for required-now assertions:
   - no hidden dependency on another test row unless explicitly declared as a normative dependency note.
10. If one row depends on another row for shared invariants, the dependency must be explicit and machine-auditable (for example: `depends_on: T2d for REQ_C/REQ_D`).

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
