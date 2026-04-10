---
artifact_type: plan
artifact_id: plan_actor_runtime_incomplete_emit_reconcile_and_recover_removal_v1
title: "Actor Runtime Incomplete Emit Reconcile And Recover Removal"
status: draft
prd_ref: null
owners:
  - "felho"
---

# Plan: Actor Runtime Incomplete Emit Reconcile And Recover Removal

## Objective

Az actor-runtime Phase E kovetkezo implementacios programja vezesse ki teljesen a public `pairflow bubble meta-review recover` commandot, es helyette vezessen be egy actor-agnosztikus belso reconcile / finish-incomplete-emit kernelt, amely:
1. mar perzisztalt canonical actor outputbol dolgozik,
2. explicit execution contexthez kotott,
3. nem meta-review-specifikus domain identitaskent el,
4. es a normal happy path, a watchdog/startup jellegu internal flowk, valamint a retained internal recovery/finalization hivasok kozos belso kepessegeve valik.

Siker eseten:
1. nincs public `recover` command,
2. nincs meta-review-specifikus recovery-identitas a canonical belso kernelben,
3. a normal submit/finalize flow nem "recovery" fogalommal van modellezve,
4. es a megmarado szerepspecifikus kulonbsegek mar csak policy/route adapter szinten latszanak.

## Complexity / Split Rationale

1. `risk_score`: `9`
2. Why a plan is needed:
   - uj, actor-agnosztikus belso authority/finalization boundaryt vezet be,
   - ugyanazt a fogalmat egyszerre erinti write seamen, routing/gate logikan, watchdog/reconcile caller surface-en es public CLI operator removalon,
   - es a foundation + delivery + removal ugyanannak a programnak a resze.
3. Split decision:
   - `foundation/refactor`
   - `delivery`
   - `cleanup/removal`
4. Milestone-gated behavior to defer:
   - `N/A`; a user-decision lock szerint a public `recover` retained vegallapot nem elfogadhato.

## Decision Lock

1. Public surface decision:
   - a `pairflow bubble meta-review recover` command teljesen kivezetendo; retained thin-wrapper vegallapot nem elfogadhato.
2. Kernel direction:
   - a reconcile / finish-incomplete-emit belso kepesseg explicitten actor-agnosztikus legyen.
3. Scope discipline:
   - a munka tobb taskra bonthato a review-stabilitas miatt, de a plan vegallapota teljes; nem "most kicsit, kesobb majd valamikor tobbet" jellegu partial target.

## Phase Breakdown

| Phase | Goal | Inputs | Outputs | Exit Criteria |
|---|---|---|---|---|
| Phase 1 | Generic incomplete-emit reconcile kernel foundation | current meta-review submit/recovery flow, Phase B-D actor-runtime refs | actor-agnosztikus belso reconcile contract + engine | a kozos kernel mar nem meta-review-specifikus nevvel vagy fogalmakkal van definialva |
| Phase 2 | Meta-review normal path cutover | Phase 1 foundation | normal `meta_review_result` flow a generic kernelre all at | a happy path mar nem meta-review recovery-fogalommal finalize-ol |
| Phase 3 | Internal caller cutover + public recover removal | Phase 2 cutover | watchdog/converged/startup/internal callers generic kernelre allnak, public recover command eltunik | nincs public `recover`, es nincs olyan canonical internal caller, amely a regi meta-review-specific recover seamre dependal |
| Phase 4 | Actor-agnostic cleanup and residual special-case removal | Phases 1-3 | naming/contract/docs/test cleanup | a reconcile kernelben nem marad meta-review-specifikus identity vagy retained compatibility nev |

## Task List

1. `plans/tasks/actor-runtime-incomplete-emit/foundation-generic-reconcile-kernel-phaseE.md`
2. `plans/tasks/actor-runtime-incomplete-emit/meta-review-submit-cutover-phaseE.md`
3. `plans/tasks/actor-runtime-incomplete-emit/internal-caller-cutover-and-public-recover-removal-phaseE.md`
4. `plans/tasks/actor-runtime-incomplete-emit/actor-agnostic-cleanup-phaseE.md`

## Dependencies

1. [actor-runtime-interface-discovery-and-migration-plan-v1.md](/Users/felho/dev/pairflow/plans/actor-runtime-interface-discovery-and-migration-plan-v1.md)
2. [actor-runtime-interface-migration-spine-phaseD-plan.md](/Users/felho/dev/pairflow/plans/tasks/actor-runtime-interface-migration-spine-phaseD-plan.md)
3. [actor-runtime-interface-capability-contract-phaseB-draft.md](/Users/felho/dev/pairflow/plans/tasks/actor-runtime-interface-capability-contract-phaseB-draft.md)
4. [actor-runtime-interface-scenario-simulation-phaseC-matrix.md](/Users/felho/dev/pairflow/plans/tasks/actor-runtime-interface-scenario-simulation-phaseC-matrix.md)
5. [actor-runtime-interface-meta-review-recovery-reconcile-refactor-draft.md](/Users/felho/dev/pairflow/plans/tasks/actor-runtime-interface-meta-review-recovery-reconcile-refactor-draft.md)
6. [actor-runtime-interface-meta-review-submit-inconclusive-human-gate-phaseE.md](/Users/felho/dev/pairflow/plans/archive/tasks/actor-runtime-interface-meta-review-submit-inconclusive-human-gate-phaseE.md)
7. [actor-runtime-interface-meta-review-approve-advisory-guidance-hardening-phaseE.md](/Users/felho/dev/pairflow/plans/archive/tasks/actor-runtime-interface-meta-review-approve-advisory-guidance-hardening-phaseE.md)

## Risks and Mitigations

1. Risk: a generic kernel valojaban uj authority-forrassa valik -> Mitigation: csak persisted canonical output + explicit execution context lehet input.
2. Risk: a public `recover` removal tul koran tortenik -> Mitigation: elobb internal caller cutover, csak utana public removal.
3. Risk: a meta-review-specifikus policy osszekeveredik a generic engine-nel -> Mitigation: route/policy adapter es generic finalize engine explicit szetvalasztasa.
4. Risk: a happy path es a fallback path tovabbra is ugyanazzal a "recover" fogalommal marad leirva -> Mitigation: kulon task a terminology/naming cleanupra, nem opportunistic comment-fixekre bizzuk.
5. Risk: a teljes scope egy taskba dagadna -> Mitigation: negy taskra bontott, de egy vegallapotot celzo Phase E program.

## Validation Strategy

1. Minden task kotelezoen futtasson relevans core/contract/CLI teszteket a touched surface-ekre.
2. A Phase 2 utan bizonyitani kell, hogy a normal meta-review submit path mar generic finish-incomplete-emit kernelt hasznal.
3. A Phase 3 utan bizonyitani kell, hogy a public `bubble meta-review recover` command megszunt, es nincs hidden alias vagy retained fallback.
4. A Phase 4 utan bizonyitani kell, hogy a kernelnevek, exported contractok es internal caller surface-ek kozott nem maradt meta-review-specifikus reconcile identity.
