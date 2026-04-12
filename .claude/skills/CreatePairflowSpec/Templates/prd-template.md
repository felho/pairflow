---
artifact_type: prd
artifact_id: prd_<feature>_v1
title: "<Feature Name>"
status: draft
owners:
  - "<owner>"
---

# PRD: <Feature Name>

## Context

<Problem context and why this matters now.>

## Goal

<Measurable goal in 1-3 lines.>

## Business Invariants

Include this section only when domain invariants materially constrain the feature. Otherwise omit it instead of filling noisy `N/A` placeholders.

1. <What must remain true from the business/domain perspective.>

## Control Model

Include this section only when the feature depends on multiple truths, authority/read-model decisions, or explicit missing-data behavior. Otherwise omit it instead of filling noisy `N/A` placeholders.

1. State/control owner: <Which source decides whether something should exist, happen, or be shown.>
2. Read-path rule: <Where the system may read the thing from. If N/A, say N/A.>
3. Forbidden fallback: <Which tempting alternative sources must not be used. If N/A, say N/A.>
4. Allowed resolution path: <Which deterministic same-authority resolution/reconciliation paths remain allowed. If N/A, say N/A.>
5. Missing-data rule: <What happens if the thing is expected but missing.>

## Baseline Preservation

Include this section only when the feature intentionally preserves or replaces an existing user-visible/runtime behavior that downstream plan/task artifacts must not misinterpret. Otherwise omit it.

1. Must-preserve current behaviors: <List concrete baseline behaviors.>
2. Explicitly replaced behaviors: <List only if intentional.>
3. Replacement expectation: <What must be proven if a baseline behavior is removed.>

## In Scope

1. <item>
2. <item>

## Out of Scope

1. <item>
2. <item>

## Requirements

| ID | Requirement | Rationale | Priority |
|---|---|---|---|
| R1 | <text> | <text> | must |

## Acceptance Criteria

1. <measurable criterion>
2. <measurable criterion>

## Risks

1. <risk> - <mitigation>

## Rollout

1. <phase/step>
2. <phase/step>
