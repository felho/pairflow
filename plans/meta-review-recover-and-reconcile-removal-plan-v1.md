---
artifact_type: plan
artifact_id: plan_meta_review_recover_and_reconcile_removal_v1
title: "Meta-Review Recover And Reconcile Removal"
status: draft
prd_ref: null
owners:
  - "felho"
---

# Plan: Meta-Review Recover And Reconcile Removal

## Objective

Vezesse ki teljesen a meta-review snapshot-driven `recover` / reconcile capabilityt a runtime-bol.

Siker eseten:
1. nincs retained `finishIncompleteActorResult` generic kernel,
2. nincs retained `recoverMetaReviewGateFromSnapshot(...)` runtime dependency a normal submit / watchdog / converged flowkban,
3. nincs public `pairflow bubble meta-review recover` command,
4. a tamogatott remediation explicitten `restart` vagy uj meta-review futtatas.

## Complexity / Split Rationale

1. `risk_score`: `7`
2. Why a plan is needed:
   - public CLI/operator contract valtozik,
   - ugyanaz a fogalom egyszerre erinti a submit routingot, a watchdog/converged dependency surface-t es a docs/operator leirast,
   - a runtime removal es a public cleanup kulon verifikalhato lepes legyen.
3. Split decision:
   - `foundation/refactor`
   - `delivery`
4. Milestone-gated behavior to defer:
   - `N/A`

## Phase Breakdown

| Phase | Goal | Inputs | Outputs | Exit Criteria |
|---|---|---|---|---|
| Phase 1 | Remove internal runtime recover/reconcile capability | current meta-review submit/gate/watchdog/converged runtime wiring | direct finalize / fail-closed runtime, reconcile kernel removed | runtime codeben nincs snapshot-route recovery dependency vagy generic incomplete-emit kernel |
| Phase 2 | Remove public/operator recover surface | Phase 1 runtime baseline | CLI/docs/tests cleanup, restart/new-run guidance | nincs `bubble meta-review recover` public command vagy docs claim |

## Task List

1. `plans/tasks/meta-review-gate/meta-review-recover-runtime-removal-phase1.md`
2. `plans/tasks/meta-review-gate/meta-review-recover-surface-removal-phase2.md`

## Dependencies

1. [docs/pairflow-initial-design.md](/Users/felho/dev/pairflow/docs/pairflow-initial-design.md)
2. [plans/actor-runtime-incomplete-emit-reconcile-and-recover-removal-plan-v1.md](/Users/felho/dev/pairflow/plans/actor-runtime-incomplete-emit-reconcile-and-recover-removal-plan-v1.md)
3. [docs/meta-review-gate-prd.md](/Users/felho/dev/pairflow/docs/meta-review-gate-prd.md)

## Risks and Mitigations

1. Risk: a submit flow jelenleg retained recovery helperen keresztul finalize-ol. Mitigation: eloszor Phase 1-ben direct finalize / fail-closed pathra kell atallni, csak utana szabad a public surface-et kiszedni.
2. Risk: a watchdog/converged meg implicit recovery fallbackot var. Mitigation: explicit dependency-contract cleanup es regresszios coverage kotelezo.
3. Risk: docs/operator surface tovabbra is recoveryt allit tamogatott remediationkent. Mitigation: Phase 2-ben kotelezo docs/help cleanup es restart/new-run guidance.

## Validation Strategy

1. Phase 1 kotelezoen futtassa a meta-review submit/gate/watchdog/converged relevans core es contract tesztjeit.
2. Phase 1 utan bizonyitani kell, hogy a runtime code nem importalja vagy wiringolja a generic reconcile kernelt es a snapshot-driven recover capabilityt.
3. Phase 2 utan bizonyitani kell, hogy a public CLI help/dispatcher/docs nem tartalmaz `bubble meta-review recover` surface-t.
