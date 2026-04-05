---
artifact_type: task
artifact_id: task_actor_runtime_interface_meta_review_run_removal_phaseE_v1
title: "Actor Runtime Interface Meta-Review Run Removal (Phase E)"
status: draft
phase: phaseE
target_files:
  - src/v11/application/metaReview/metaReviewCliDispatcher.ts
  - src/v11/application/metaReview/metaReviewCliOptions.ts
  - src/v11/application/metaReview/metaReviewCliOptionTypes.ts
  - src/v11/application/metaReview/metaReviewCliOptionParser.ts
  - src/v11/application/metaReview/metaReviewCliTypes.ts
  - src/core/bubble/metaReview.ts
  - tests/cli/bubbleMetaReviewCommand.test.ts
  - tests/core/bubble/metaReview.test.ts
  - tests/v11/application/metaReview/metaReviewFacadeParity.test.ts
prd_ref: null
plan_ref: plans/actor-runtime-interface-discovery-and-migration-plan-v1.md
system_context_ref: README.md
owners:
  - "felho"
---

# Task: Actor Runtime Interface Meta-Review Run Removal (Phase E)

## Goal

Kulon, bounded taskban kivezetni a public `pairflow bubble meta-review run` operator commandot, mert a jelenlegi canonical meta-review actor-flow mar nem erre epit.

Ez a task akkor sikeres, ha:
1. a public `meta-review run` spelling kikerul a canonical operator surface-bol,
2. a `status` / `last-report` / `recover` retained operator surface egyelore valtozatlan marad,
3. a canonical meta-review actor path tovabbra is a `pairflow agent emit --kind meta_review_result`,
4. a removal utan kisebb lesz a retained meta-review operator subtree blast radiusa.

## Current understanding

1. A mai autonomous meta-review flow convergence kickoff + active execution context + canonical `meta_review_result` emit modon mukodik.
2. A public `run` command jelenleg nem latszik a primary production actor path reszenek.
3. A `src/` alatti kozvetlen kodhasznalat alapjan a `runMetaReview(...)` service foleg a meta-review CLI dispatcher retained branch-ebol el.
4. Emiatt a `run` retained command nagy esellyel alacsony erteku, de fenntartasi es review-blast-radius koltsege van.

## In Scope

1. A public `pairflow bubble meta-review run` command kivezetese a CLI-bol.
2. A parser/help/dispatcher/types/test surface update-je ennek megfeleloen.
3. Annak explicit regresszio-orzese, hogy a canonical actor emit path nem serul.
4. Annak explicit dokumentalasa a completion summaryban, hogy a `status` / `last-report` / `recover` retained marad.

## Out of Scope

1. `status` vagy `last-report` redesign vagy removal.
2. `recover` refaktor vagy removal.
3. A canonical `pairflow agent emit --kind meta_review_result` redesign.
4. Teljes unified actor emit pipeline implementacio.

## Proposed implementation shape

1. Elso lepesben a public CLI spellinget kell kivenni:
   - help text,
   - option parser/types,
   - dispatcher run branch,
   - CLI command tests.
2. Masodik lepesben felul kell vizsgalni, hogy a `runMetaReview(...)` service-nek marad-e barmilyen indokolt internal consumerje.
3. Ha nincs indokolt internal consumer, a service es kapcsolodo dead code / dead tests is torolheto ugyanebben a taskban.
4. Ha marad internal use-case, azt explicitten named internal seamkent kell hagyni, nem retained public operator commandkent.

## Open design question

1. A `runMetaReview(...)` service dead code legyen-e removal utan, vagy retained internal helper maradjon atmenetileg?

Jelenlegi munkahipotézis:
1. a public command removal first-priority,
2. a service full removal csak akkor jo, ha nincs valos internal caller.

## Non-goals

1. Ez a task nem allitja, hogy a teljes meta-review operator namespace felesleges.
2. Ez a task nem oldja meg a recovery/reconcile kerdeset.
3. Ez a task nem zarja le az actor-runtime-interface initiative-ot.

## Why this split is useful

1. A `run` removal valoszinuleg gyorsan csokkenti a retained surface-et.
2. Ezutan a `recover` kerdes tisztabban lathato lesz, mert nem lesz egy plusz retained live-run special case ugyanabban a namespace-ben.
3. A fennmarado `status` / `last-report` / `recover` taskok kisebb blast radiusu cleanupkent vagy refactorkent kezelhetok.
