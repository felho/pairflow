---
artifact_type: plan
artifact_id: plan_meta_review_gate_v1
title: "Meta Review Gate Implementation Plan"
status: draft
prd_ref: docs/meta-review-gate-prd.md
owners:
  - "Pairflow Core"
---

# Plan: Meta Review Gate

## Objective

Deliver the PRD-defined meta-review gate as a production Pairflow capability that:
1. Runs autonomous review at `READY_FOR_APPROVAL`.
2. Auto-dispatches deterministic `rework` decisions under a strict budget.
3. Preserves human-only final approval.
4. Exposes cheap cached retrieval (`status`, `last-report`) without rerun.
5. Surfaces meta-review lifecycle and actor state in UI.

## Phase Breakdown

| Phase | Goal | Inputs | Outputs | Exit Criteria |
|---|---|---|---|---|
| Phase 1: Persistence + Command Split | Introduce canonical last-autonomous snapshot and read-only retrieval surface. | PRD command contract (`run`, `status`, `last-report`), current bubble state model, current review integration path. | Snapshot state fields, optional rolling artifacts (`meta-review-last.json` / `meta-review-last.md`), CLI commands `meta-review status` and `meta-review last-report`, `meta-review run` persistence-before-routing rule. | Latest autonomous outcome is queryable without rerun; retrieval commands are non-generative/read-only; command behavior matches PRD contract. |
| Phase 2: Autonomous Rework Loop | Wire lifecycle trigger and auto-rework routing with budget semantics. | Phase 1 snapshot + commands, lifecycle state machine, existing `request-rework --message` path. | `READY_FOR_APPROVAL -> META_REVIEW_RUNNING` trigger path, budget counters (`auto_rework_count/limit`), automatic `request-rework` dispatch when recommendation is `rework` and budget allows. | Every eligible `READY_FOR_APPROVAL` transition triggers autonomous review; budget increments only on successful auto-dispatch; exhausted budget routes to human gate. |
| Phase 3: Human Gate + Meta-Reviewer + UI | Finish sticky human gate behavior, operator override policy, and UI visibility. | Phase 2 lifecycle routing, worker-pane orchestration model, UI state rendering pipeline. | `READY_FOR_HUMAN_APPROVAL` + sticky-gate wiring, non-approve override requirement (`flag + reason`), dedicated `meta-reviewer` pane behavior, UI support for states/actor/latest recommendation. | Sticky human gate prevents further autonomous loops in same bubble; operator can read recommendation/report cheaply; UI renders new states and meta-reviewer actor without fallback gaps. |

## Task List

1. `plans/tasks/meta-review-gate/meta-review-gate-phase1-persistence-and-command-split.md`
2. `plans/tasks/meta-review-gate/meta-review-gate-phase2-autonomous-rework-loop.md`
3. `plans/tasks/meta-review-gate/meta-review-gate-phase3-human-gate-pane-and-ui.md`
4. `plans/tasks/meta-review-gate/meta-review-gate-phase3e-e2e-and-rollout-validation.md`

## Dependencies

1. `UsePairflow/ReviewBubble` workflow remains the shared review computation engine.
2. Pairflow state store supports adding new `meta_review.*` fields safely.
3. Lifecycle transition layer can add `META_REVIEW_RUNNING` and `READY_FOR_HUMAN_APPROVAL` without breaking existing bubble flows.
4. CLI can enforce explicit override semantics for non-approve recommendation approvals.
5. UI timeline/state surfaces can consume and render new role/state/recommendation fields.

## Risks and Mitigations

1. Risk: Autonomous loop churn due to repeated rework outcomes.
   - Mitigation: strict default budget (`auto_rework_limit=5`) and sticky human gate fallback.
2. Risk: Drift between autonomous and manual review behavior.
   - Mitigation: one review engine (`UsePairflow/ReviewBubble`) and explicit contract that retrieval commands are snapshot-only.
3. Risk: Operator confusion about approval when recommendation is not `approve`.
   - Mitigation: explicit CLI override flag + mandatory reason, plus clear `status` output.
4. Risk: UI regression from new states/actor.
   - Mitigation: Phase 3 includes explicit UI compatibility acceptance checks for states + actor + recommendation render.

## Validation Strategy

1. Command contract tests:
   - `meta-review run` persists snapshot before lifecycle mutation.
   - `meta-review status` and `meta-review last-report` do not trigger model execution.
2. Lifecycle integration tests:
   - `READY_FOR_APPROVAL` trigger behavior under budget and exhausted-budget branches.
   - sticky human gate routing after first `READY_FOR_HUMAN_APPROVAL` entry.
3. Policy tests:
   - non-approve approval attempt requires override flag + non-empty reason.
4. UI verification:
   - `META_REVIEW_RUNNING` and `READY_FOR_HUMAN_APPROVAL` render correctly.
   - `meta-reviewer` actor and latest autonomous recommendation are visible in bubble detail/timeline surfaces.
5. End-to-end bubble scenario:
   - repeated autonomous `rework` cycles until gate, then human decision (`approve` or manual rework) works with expected state transitions.

## Assumptions

1. MVP persists only the latest autonomous snapshot (single-slot overwrite), no historical audit trail requirement.
2. Manual live deep-review remains external to Pairflow CLI and is not part of this command surface.
3. Default rollout starts with one depth profile per environment; depth tuning can be added later if needed.
