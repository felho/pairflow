---
artifact_type: task
artifact_id: task_remote_bubble_execution_phase3g2_remote_merge_operator_contract_alignment_v1
title: "Remote Bubble Execution Remote Merge Operator Contract Alignment (Phase 3G2)"
status: implementable
phase: phase3g2-remote-merge-operator-contract-alignment
target_files:
  - src/cli/commands/bubble/merge.ts
  - src/cli/index.ts
  - tests/cli/bubbleMergeCommand.test.ts
  - tests/cli/index.test.ts
  - README.md
  - docs/remote-bubble-execution.md
  - .claude/skills/UsePairflow/SKILL.md
  - .claude/skills/UsePairflow/Workflows/CloseBubble.md
prd_ref: null
plan_ref: plans/archive/plans/remote-bubble-execution-contract-and-phasing-plan-v2.md
system_context_ref: docs/pairflow-initial-design.md
normative_refs:
  - plans/archive/plans/remote-bubble-execution-contract-and-phasing-plan-v2.md
  - plans/archive/tasks/remote-bubble-execution/phase3g1a-remote-merge-handoff-and-local-success-boundary.md
  - plans/archive/tasks/remote-bubble-execution/phase3g1b-remote-merge-cleanup-proof-and-result-alignment.md
  - docs/remote-bubble-execution.md
  - README.md
owners:
  - "felho"
---

# Task: Remote Bubble Execution Remote Merge Operator Contract Alignment (Phase 3G2)

## Feynman Summary / One-Screen Model

1. A `Phase 3G1A` es `Phase 3G1B` utan a started-remote merge canonical technikai semantikaja mar stabil:
   - remote helper csak handoffot ad,
   - a durable merge truth a laptop lokalis repo-jaban zarul,
   - a cleanup truth explicit post-success remote cleanup phase-bol jon.
2. A hianyzo szelet mar nem merge-core vagy cleanup-core munka, hanem operator-facing contract alignment:
   - CLI merge summary,
   - merge help/usage,
   - README/design-doc wording,
   - Pairflow skill/workflow wording.
3. A task celja:
   - a started-remote merge operator surface ne sugalljon remote merge + remote push-based closeout modellt,
   - hanem a retained local import/local merge + post-success remote cleanup semanticsat.
4. Ez nem uj cleanup-routing task es nem mutation-routing rewrite:
   - nem nyithatja ujra a `Phase 3G1A/3G1B` merge-core donteseket,
   - nem valtathat a started-remote fail-closed `--push` / `--delete-remote` behavioron,
   - nem csinalhat altalanos remote operator parity wave-et mas parancsokra.

## Current Codebase Check / Current-Tree Reality Check (2026-04-21)

1. A merge command retained runtime semanticsa current tree-ben mar explicit started-remote handoff + local durable merge + remote cleanup:
   - [src/v11/application/merge/runMergeFlow.ts](/Users/felho/dev/pairflow/src/v11/application/merge/runMergeFlow.ts)
   - [src/v11/application/merge/mergeCommandContract.ts](/Users/felho/dev/pairflow/src/v11/application/merge/mergeCommandContract.ts)
2. A started-remote merge current tree-ben explicit rejecteli a `--push` / `--delete-remote` flag kombinaciot:
   - [src/v11/application/merge/runMergeFlow.ts](/Users/felho/dev/pairflow/src/v11/application/merge/runMergeFlow.ts:356)
3. A CLI help jelenleg meg mindig generic, route-unaware wordinget ad:
   - `--push`: "Push merged base branch to origin"
   - `--delete-remote`: "Delete remote bubble branch from origin after merge"
   - a note pedig route-neutralnak tunik, mikozben a started-remote path specialis retained semanticsu,
   - [src/cli/commands/bubble/merge.ts](/Users/felho/dev/pairflow/src/cli/commands/bubble/merge.ts:26)
4. A human-readable merge summary ma szinten nem kulonbözteti meg a local es started-remote operator meaninget:
   - [src/cli/index.ts](/Users/felho/dev/pairflow/src/cli/index.ts:738)
5. A design docban explicit drift latszik:
   - a `bubble merge` remote merge + remote push modellre utal,
   - majd kulon `git pull` tanacsot ad a laptopra,
   - ez mar nem egyezik a current retained contracttal,
   - [docs/remote-bubble-execution.md](/Users/felho/dev/pairflow/docs/remote-bubble-execution.md:507)
6. A README merge peldai szinten altalanos remote update modellt sugallnak:
   - [README.md](/Users/felho/dev/pairflow/README.md:441)
   - [README.md](/Users/felho/dev/pairflow/README.md:554)
   - [README.md](/Users/felho/dev/pairflow/README.md:875)
7. A repo-local Pairflow skill source-of-truth wordingje is reszben legacy olvasatot hordoz:
   - `DONE -> pairflow bubble merge`
   - remote bubble note: "Pairflow merges/pushes on the remote and does not auto-update the local checkout."
   - [ .claude/skills/UsePairflow/SKILL.md ](/Users/felho/dev/pairflow/.claude/skills/UsePairflow/SKILL.md:103)
8. A repo-local `CloseBubble` workflow hasonlo driftet hordoz:
   - remote merge note ma meg azt irja, hogy a routed merge a remote-on merge-elhet/pusholhat,
   - [ .claude/skills/UsePairflow/Workflows/CloseBubble.md ](/Users/felho/dev/pairflow/.claude/skills/UsePairflow/Workflows/CloseBubble.md:103)
9. A target-file reality emiatt:
   - ez elsodlegesen `operator_read_model` / operator-facing contract alignment task,
   - a default implementation path CLI/help/docs/skill alignment,
   - es a merge-core/result-contract family nem alap target scope, csak explicit follow-up trigger lehet, ha a semleges vagy route-aware CLI wording a jelenlegi public surface-eken bizonyithatoan nem zarhato le ezek nelkul.

## Parent Plan Fit / Stable Sequencing

1. Ez a task a `Phase 3G` residual successor utolso materializalt closure-ja.
2. A task besorolasa:
   - `operator_read_model`
   - szuk operator-facing merge-contract clarification es alignment.
3. A task a kovetkezo lezart baseline-okra epul:
   - `Phase 3G1A`: local durable success boundary,
   - `Phase 3G1B`: cleanup proof es final truth alignment.
4. A task nem nyithatja ujra:
   - merge helper payload contractot,
   - cleanup proof parityt,
   - local durable merge source-of-truth dontest,
   - delete-family continuity baseline-t.
5. Ha az implementation soran kiderul, hogy a CLI/operator wording a jelenlegi public surfaces mellett nem zarhato le merge-core/result-contract erintese nelkul, az nem implicit task-bovites:
   - vagy explicit local refinement kell ehhez a taskhoz,
   - vagy kulon successor note,
   - de a default ownership nem mutation-flow redesign es nem cleanup-core ownership.

## Source-Anchor Consistency

1. Canonical source anchors:
   - [plans/archive/plans/remote-bubble-execution-contract-and-phasing-plan-v2.md](/Users/felho/dev/pairflow/plans/archive/plans/remote-bubble-execution-contract-and-phasing-plan-v2.md)
   - [plans/archive/tasks/remote-bubble-execution/phase3g1a-remote-merge-handoff-and-local-success-boundary.md](/Users/felho/dev/pairflow/plans/archive/tasks/remote-bubble-execution/phase3g1a-remote-merge-handoff-and-local-success-boundary.md)
   - [plans/archive/tasks/remote-bubble-execution/phase3g1b-remote-merge-cleanup-proof-and-result-alignment.md](/Users/felho/dev/pairflow/plans/archive/tasks/remote-bubble-execution/phase3g1b-remote-merge-cleanup-proof-and-result-alignment.md)
   - [docs/remote-bubble-execution.md](/Users/felho/dev/pairflow/docs/remote-bubble-execution.md)
   - [README.md](/Users/felho/dev/pairflow/README.md)
2. Closed canonical elements, amelyeket ez a task nem ertelmezhet ujra:
   - started-remote merge durable truthja a laptop local repo-jaban zarul,
   - a remote helper nem publication truth forras,
   - a post-success remote cleanup nem publication gate,
   - a started-remote `--push` / `--delete-remote` retained fail-closed unsupported path.
3. Uj explicit clarification, amelyet ez a task zar le:
   - hogyan beszelunk helyesen a started-remote merge-rol operator-facing surface-eken,
   - milyen wording marad generic/local,
   - es hol kell route-aware explanation.
4. Forbidden reinterpretations:
   - nem szabad a started-remote pathra remote merge + push-based publication modellt sugallni,
   - nem szabad a local route retained `--push` / `--delete-remote` kepesseget globalisan eltavolitani,
   - nem szabad a current cleanup truthot publication truthkent ujranevezni,
   - nem szabad a skill/doc driftet azzal elkenni, hogy "implementation detail" marad.
5. `drift_status`: `closed_contract_preserved_but_operator_wording_open`

## Implementation Target Decision

1. `implementable_now`: `yes`
2. A bounded task-shape:
   - operator-facing merge contract alignment.
3. Preferalt implementation shape:
   - a default path:
     - CLI merge help wording alignment,
     - CLI human-readable summary alignment a jelenlegi public result shape-en belul,
     - README / design-doc / repo-local skill wording alignment.
4. Felteteles, nem default allowance:
   - ha a CLI human-readable summary a jelenlegi public result shape-en belul bizonyithatoan nem teheto helyesse,
   - akkor kulon local refinementben megengedett a legszukebb additive operator/read-model bridge vizsgalata.
   - Ez a bridge legfeljebb:
     - merge-result route marker,
     - vagy ezzel ekvivalens explicit operator-read-model seam lehet.
5. Nem preferalt megoldas:
   - `Phase 3G1A/3G1B` runtime contract ujranyitasa pusztan wording miatt,
   - cleanup booleansbol vagy pushed/deleted flag kombinaciobol implicit route-talalgatas,
   - skill/doc surface-ek egy reszenek frissitese a tobbiek nelkul.
6. Repo-local skill policy:
   - a repo-local `.claude/skills/UsePairflow/**` a source of truth,
   - global `~/.claude/skills` / `~/.codex/skills` sync csak a repo-local valtozas utan justified es kulon follow-up workflow szerint tortenhet.

## Authority Boundary Map

1. `authority_producer`
   - nincs uj authority producer.
2. `persisted_authority`
   - retained baseline:
   - merge route canonical truth tovabbra is bubble config / execution context / merge orchestration familyben marad,
   - nincs uj persisted state authority.
3. `internal_execution_consumers`
   - default pathon explicit out of scope:
   - merge-core/result-contract consume nem ownershipolt.
   - conditioned allowance:
   - csak akkor valik szuk in-scope bucketta, ha kulon local refinement explicit kimondja, hogy operator wording a jelenlegi public result shape-en belul nem zarhato le.
4. `workflow_orchestration_consumers`
   - explicit out of scope:
   - approval/commit/merge/delete lifecycle allapotgep,
   - cleanup dispatch sequencing.
5. `read_model_consumers`
   - primary in scope:
   - CLI merge help es human-readable summary,
   - README / design-doc / skill workflow wording,
   - UI merge-contract wording jelen taskban nincs default targetben, mert a current repo-local anchor itt csak generic action-felsorolas.
6. `cleanup_recovery_consumers`
   - explicit out of scope:
   - remote cleanup executor,
   - delete-family proof parity,
   - recovery/reconcile/delete closeout.

## Closure Budget / Task-Shape Triage

1. `closure_buckets_touched`
   - `read_model_consumers`
2. `closure_buckets_conditionally_touched`
   - `shared_contract`
   - `internal_execution_consumers`
3. `closure_buckets_not_touched`
   - `authority_producer`
   - `workflow_orchestration_consumers`
   - `cleanup_recovery_consumers`
   - `persisted_authority_or_schema`
4. `collapsed_closures`
   - merge help/summarization alignment
   - docs/skill wording alignment
5. `why_collapse_is_safe`
   - ugyanazt az operator-facing correctness boundaryt zarjak:
   - a started-remote merge retained semanticajanak helyes emberi olvasatat.
6. `explicitly_deferred_closures`
   - szuk route-aware operator signal, ha a default path bizonyithatoan nem eleg
   - merge-core runtime redesign,
   - cleanup semantics tovabbi hardeningje,
   - altalanos remote mutation-surface wording wave mas commandokra.
7. `primary_task_shape`
   - `operator_read_model`
8. `secondary_task_shape`
   - `N/A` a default pathon
9. `why_no_secondary_shape_default`
   - a task default ownershipa nem termel uj shared contractot es nem mozgat merge-core consume familyt;
   - a conditional bridge kulon explicit refinement triggerhez kotott.

## Complexity-Risk Triage

1. `risk_score`
   - `2`
2. `split_decision`
   - `single_task_acceptable`
3. `authority_risk`
   - `1`
   - mert a task az operator-facing wordinget a retained merge-route truthra koti.
4. `surface_spread`
   - `1`
   - CLI + docs + skill + tests.
5. `identity_join_risk`
   - `0`
   - a default path nem ownershipolja a route marker bevezeteset; explicit route-proof csak conditional refinement eseten lesz in-scope.
6. `activation_coupling`
   - `0`
7. `prerequisite_risk`
   - `0`
8. `acceptance_multiplicity`
   - `1`

## Baseline Preservation

1. `must_preserve_behaviors`
   - local merge retained `--push` / `--delete-remote` baseline megmarad,
   - started-remote merge retained fail-closed flag reject megmarad,
   - local durable success boundary es cleanup-proof alignment megmarad.
2. `allowed_resolution_path`
   - a default pathon a wording lehet explicit generic vagy retained-behavior-aware,
   - es csak akkor epulhet proven merge route-bol, ha ez a route proof explicit, szuk local refinementben bekerul.
3. `forbidden_fallback`
   - remote route operator wordinget tilos legacy docbol vagy generic helpbol "orokolni" explicit route-check nelkul,
   - tilos a `pushedBaseBranch=false` / `deletedRemoteBranch=false` kombinaciobol onmagaban remote semanticsat visszafejteni.
4. `missing_data_rule`
   - ha egy surface-en a merge route nem bizonyithato explicitten, a wording maradjon semleges vagy mondja ki a generic baseline-t;
   - nem szabad remote push/publication modellt kitalalni hianyzo route-adat helyett.

## L0 - Policy

### Goal

1. A started-remote merge operator-facing contractja egyezzen a current retained runtime truth-tal.
2. A merge help/summarization/docs/skill surfaces ne sugalljanak remote merge + remote push closure-t ott, ahol a current implementation mar local durable merge + remote cleanup semanticsat kovet.
3. A local merge retained operator baseline ne regresszalodjon.

### Non-Goals

1. Nincs uj merge routing vagy cleanup routing munka ebben a taskban.
2. Nincs uj remote publication policy.
3. Nincs altalanos docs refresh mas remote commandokra.

### Business / Control Model

1. Business invariant:
   - az operatornak ugyanazt a modellt kell latnia, ami alapjan a parancs tenylegesen viselkedik.
2. Control model:
   - started-remote merge eseten a durable merge target a laptop local repo, nem a remote origin push.
3. Read-path rule:
   - a human-readable merge contractnak a retained merge route-bol kell jonnie, vagy explicit genericnek kell maradnia.
4. Forbidden fallback:
   - legacy remote push-based doc/help nyelv nem maradhat retained default started-remote esetre.
5. Missing-data rule:
   - route proof hianyaban csak semleges wording engedett, hamis remote explanation nem.

## L1 - Command Contract and Sequencing

### Operator Merge Contract

1. A merge CLI/help/docs kulonitse el:
   - local merge retained optional push/delete-remote baseline,
   - started-remote merge retained unsupported-flag es local durable merge semantics.
2. A default task closure nem kovetel uj merge-result route marker-t:
   - eloszor a jelenlegi public surface-ekkel kompatibilis, nem-felrevezeto wordinget kell megprobalni.
3. Ha a current CLI human-readable summary explicit route-aware olvasatot csak uj public result shape-pel tudna adni, az kulon explicit refinement trigger.

### Skills / Workflow Contract

1. A repo-local `UsePairflow` skill es `CloseBubble` workflow started-remote merge wordingje ne allitsa, hogy Pairflow remote-on merge-el es push-ol retained baseline-kent.
2. A workflow tovabbra is mondja ki:
   - a laptop/local repo a routed operator control plane,
   - a lifecycle parancsokat onnan kell futtatni.
3. A skill wording nem irhatja felul a current merge-core retained semantikat.

### Narrow Additive Contract Allowance

1. Ha a CLI/operator wording helyes megjelenitese a default target scope-ban nem zarhato le, szuk additive result metadata csak explicit local refinement utan megengedett.
2. Ez az additive bridge nem valtoztathatja meg:
   - merge mutation semantics,
   - cleanup dispatch ordering,
   - success/completion proof source-of-truthot.

## L2 - Implementation Notes

1. Preferalt a legszukebb route-aware operator seam:
   - CLI summary/helper wording alignment a jelenlegi public result shape-en belul.
2. A help textben explicitte kell tenni, hogy a `--push` / `--delete-remote` flag retained generic/local capability, started-remote route-on nem hasznalhato.
3. A README/design doc peldak ne tanacsoljanak implicit `git pull`-t mint started-remote merge utani kotelezo baseline-t, ha a current canonical behavior mar a local repo merge-je.
4. A repo-local skill file-ok modositasa eseten az implementation closeoutnak kovetnie kell a skill sync policy-t, de a task source-of-truth targetje a repo-local `.claude/skills/**`.
5. Ha a CLI summary a jelenlegi public result shape-en belul nem teheto nem-felrevezetove, azt implementation kozben explicit scope-escalation note-kent kell jelezni, nem csendes target-bovitessel.

## Acceptance Criteria

1. A started-remote merge operator-facing surfaces nem sugallnak remote merge + remote push publication modellt.
2. A merge CLI help explicitte kezeli a retained local vs started-remote operatori kulonbseget, vagy bizonyithatoan semleges marad.
3. A human-readable CLI merge summary nem vezeti felre az operatort a started-remote path valodi durable merge targetjerol.
4. A README, design doc, es repo-local skill/workflow wording ugyanarra a canonical retained semanticsra all.
5. A local merge retained `--push` / `--delete-remote` baseline nem regresszalodik.
6. A default task closure merge-core/result-contract target-file modositasa nelkul is implementalhato.

## Validation / Evidence

1. CLI/unit:
   - merge help text route-aware wording vagy explicit generic guard
   - CLI summary wording local vs started-remote esetben
2. Core/unit csak explicit local refinement utan, ha szuk additive route marker kerul bevezetesre:
   - merge result contract shaping
   - local vs started-remote route marker assertions
3. Docs/spec review:
   - README
   - `docs/remote-bubble-execution.md`
   - repo-local `.claude/skills/UsePairflow/**`
4. Regression:
   - local merge retained flag behavior unchanged
   - started-remote `--push` / `--delete-remote` unsupported path unchanged

## Done Definition

1. A current remote merge operator contract drift megszunik a CLI/help/docs/skill feluleteken.
2. A started-remote merge retained semantikaja emberi olvasatban is explicit es konzisztens.
3. A `Phase 3G` residual successor lane-ben a jelenleg ismert utolso operator-alignment gap szuk, bounded taskkent ownershipolt es implementalhato merge-core scope-drift nelkul.
