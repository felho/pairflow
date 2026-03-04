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

### In Scope

1. <item>

### Out of Scope

1. <item>

### Safety Defaults

1. <default-safe behavior>

## L1 - Change Contract

### 1) Call-site Matrix

| ID | File | Function/Entry | Insertion Point | Expected Behavior | Priority | Timing | Evidence |
|---|---|---|---|---|---|---|---|
| CS1 | <path> | <name> | <point> | <behavior> | P1 | required-now | <proof> |

### 2) Data and Interface Contract

| Contract | Current | Target | Compatibility | Priority | Timing |
|---|---|---|---|---|---|
| Input type | <text> | <text> | non-breaking | P1 | required-now |
| Output type | <text> | <text> | non-breaking | P1 | required-now |

### 3) Side Effects Contract

| Area | Allowed | Forbidden | Notes | Priority | Timing |
|---|---|---|---|---|---|
| DB/Event/FS/Network | <text> | <text> | <text> | P1 | required-now |

### 4) Error and Fallback Contract

| Trigger | Behavior (`throw|result|fallback`) | Reason Code | Log Level | Priority | Timing |
|---|---|---|---|---|---|
| <condition> | <behavior> | <code> | <level> | P1 | required-now |

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

## Review Control

1. Every finding must include: `priority`, `timing`, `layer`, `evidence`.
2. Max 2 L1 hardening rounds.
3. After round 2, new `required-now` is allowed only for evidence-backed `P0/P1`.
4. Items outside L1 blocker scope must be tagged `later-hardening`.

## Spec Lock

Mark task as `IMPLEMENTABLE` when all `P0/P1 + required-now` items are closed.
