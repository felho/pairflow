---
artifact_type: task
artifact_id: task_<feature>_<phase>_<slug>_v1
title: "<Task Title>"
status: draft
phase: phase1
target_files:
  - "src/..."
prd_ref: docs/prd/<feature>-prd.md
plan_ref: plans/<feature>-plan.md
system_context_ref: docs/pairflow-initial-design.md
owners:
  - "<owner>"
---

# Task: <Task Title>

## L0 - Policy

### Goal

<1-3 lines>

### Domain / Control Model Summary

1. Business invariant: <What must remain true from the business/domain perspective. If N/A, say N/A.>
2. Control model: <Which source decides whether something should exist, happen, or be shown. If N/A, say N/A.>
3. Read-path rule: <Where the implementation may read the thing from. If N/A, say N/A.>
4. Forbidden fallback: <Which sources must not be used as fallback truth. If N/A, say N/A.>
5. Missing-data rule: <What happens if the thing is expected but missing. If N/A, say N/A.>
6. Phase boundary: <What this task owns vs what successor tasks own. If N/A, say N/A.>

### In Scope

1. <item>

### Out of Scope

1. <item>

### Safety Defaults

1. <default-safe behavior>

### Contract Boundary / Blast Radius

1. `contract_boundary_override`: `yes|no`
2. If `yes`, list impacted contracts (DB/API/event/auth/config) and keep `plan_ref` non-null.

### Complexity Risk Gate

1. `authority_risk`: `0|1|2`
2. `surface_spread`: `0|1|2`
3. `identity_join_risk`: `0|1|2`
4. `activation_coupling`: `0|1|2`
5. `prerequisite_risk`: `0|1|2`
6. `acceptance_multiplicity`: `0|1|2`
7. `risk_score`: `<0-12>`
8. `single-task allowed`: `yes|no`
9. If `no`, required split:
   - `foundation/refactor`
   - `delivery`
   - `activation/rollout` (optional)
10. Identity/join note:
   - canonical identity path: `<text>`
   - competing identifiers or fallback identities: `<text>`
11. Authority/source-of-truth note:
   - canonical source: `<text>`
   - forbidden secondary sources: `<text>`

## L1 - Change Contract

### 0) Domain / Control Contract

| Item | Rule | Implementation Consequence | Priority | Timing |
|---|---|---|---|---|
| Business invariant | <explicit rule or `N/A`> | <what implementation must preserve> | P1 | required-now |
| Control model | <explicit rule or `N/A`> | <what is allowed to decide existence/state/visibility> | P1 | required-now |
| Read-path rule | <explicit rule or `N/A`> | <where implementation may read from> | P1 | required-now |
| Forbidden fallback | <explicit rule or `N/A`> | <what must not be used as fallback truth> | P1 | required-now |
| Missing-data rule | <explicit rule or `N/A`> | <fail-closed/unavailable/error behavior> | P1 | required-now |
| Phase boundary | <explicit rule or `N/A`> | <what this task owns vs successor tasks> | P2 | required-now |

### 1) Call-site Matrix

| ID | File | Function/Entry | Exact Signature (args -> return) | Insertion Point | Expected Behavior | Priority | Timing | Evidence |
|---|---|---|---|---|---|---|---|---|
| CS1 | <path> | <name> | <sig> | <point> | <behavior> | P1 | required-now | <proof> |

### 2) Data and Interface Contract

| Contract | Current | Target | Required Fields | Optional Fields | Compatibility | Priority | Timing |
|---|---|---|---|---|---|---|---|
| Input type/schema | <text> | <text> | <fields> | <fields> | non-breaking | P1 | required-now |
| Output type/schema | <text> | <text> | <fields> | <fields> | non-breaking | P1 | required-now |

### 3) Side Effects Contract

| Area | Allowed | Forbidden | Notes | Priority | Timing |
|---|---|---|---|---|---|
| DB/Event/FS/Network | <text> | <text> | <text> | P1 | required-now |

Constraint: if no allowed side effects are listed above, implementation must be pure.

### 4) Error and Fallback Contract

| Trigger | Dependency (if any) | Behavior (`throw|result|fallback`) | Fallback Value/Action | Reason Code | Log Level | Priority | Timing |
|---|---|---|---|---|---|---|---|
| <condition> | <dep-or-N/A> | <behavior> | <fallback> | <code> | <level> | P1 | required-now |
| dependency failure | <service/db/api> | fallback | <safe default> | DEPENDENCY_FAIL | warn | P1 | required-now |

### 5) Dependency Constraints

| Type | Items | Priority | Timing |
|---|---|---|---|
| must-use | <list> | P2 | required-now |
| must-not-use | <list> | P2 | required-now |

### 6) Test Matrix

| ID | Scenario | Given | When | Then | Priority | Timing | Evidence |
|---|---|---|---|---|---|---|---|
| T1 | golden path | <state> | <action> | <expected> | P1 | required-now | <proof> |
| T2 | invalid input | <state> | <action> | <expected> | P1 | required-now | <proof> |

## L2 - Implementation Notes (Optional)

1. [later-hardening] <non-blocking detail>
2. [later-hardening] <non-blocking detail>

## Hardening Backlog (Optional)

Use this section to track non-blocking review items (`later-hardening`) that should not prevent implementation.

| ID | Item | Layer | Priority | Timing | Source | Proposed Action |
|---|---|---|---|---|---|---|
| H1 | <item> | L2 | P2 | later-hardening | <review round/ref> | <drop or open follow-up task> |

## Review Control

1. Every finding must include: `priority`, `timing`, `layer`, `evidence`.
2. Max 2 L1 hardening rounds.
3. After round 2, new `required-now` is allowed only for evidence-backed `P0/P1`.
4. Items outside L1 blocker scope must be tagged `later-hardening`.
5. If `contract_boundary_override=yes`, `plan_ref` is mandatory and must align with L1 contract rows.

## Spec Lock

Mark task as `IMPLEMENTABLE` when all `P0/P1 + required-now` items are closed.
