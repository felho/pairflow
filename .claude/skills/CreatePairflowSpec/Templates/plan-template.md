---
artifact_type: plan
artifact_id: plan_<feature>_v1
title: "<Feature Plan>"
status: draft
prd_ref: docs/prd/<feature>-prd.md
owners:
  - "<owner>"
---

# Plan: <Feature Name>

## Objective

<What this plan delivers and what success means.>

## Guiding Principles

1. Business invariant: <What must remain true from the business/domain perspective.>
2. Control model: <Which source decides whether something should exist, happen, or be shown.>
3. Read-path rule: <Where the system may read the thing from. If N/A, say N/A.>
4. Forbidden fallback: <Which tempting alternative sources must not be used. If N/A, say N/A.>
5. Missing-data rule: <What happens if the thing is expected but missing.>
6. Phase boundary note: <Which phase owns contract closure vs surfacing vs consume vs activation.>

## Complexity / Split Rationale

1. `risk_score`: `<0-12>`
2. Why a plan is needed:
   - `<boundary risk / contract override / prerequisite / phase split>`
3. Split decision:
   - `foundation/refactor`
   - `delivery`
   - `activation/rollout` (optional)
4. Milestone-gated behavior to defer:
   - `<text or N/A>`

## Phase Breakdown

| Phase | Goal | Inputs | Outputs | Exit Criteria |
|---|---|---|---|---|
| Phase 1 | <text> | <text> | <text> | <text> |

## Task List

1. `plans/tasks/<feature>/phase1-<slug>.md`
2. `plans/tasks/<feature>/phase2-<slug>.md`

## Dependencies

1. <dependency>

## Risks and Mitigations

1. <risk> - <mitigation>

## Validation Strategy

1. <tests/checks/evidence strategy>
