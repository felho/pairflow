---
artifact_type: task
artifact_id: task_actor_runtime_interface_opportunity2_task11_meta_review_gate_deprecated_runtime_alias_removal_v1
title: "Actor Runtime Interface Opportunity 2 Task 11: Meta-Review Gate Deprecated Runtime Alias Removal"
status: implementable
phase: post-phaseE
target_files:
  - src/v11/shared/metaReviewGate/metaReviewGateTypes.ts
  - src/v11/application/metaReviewGate/emitMetaReviewGateV11.ts
  - src/v11/application/metaReviewGate/metaReviewGatePaneBinding.ts
  - src/v11/defaults/metaReviewGate/metaReviewGateCommandDefaults.ts
  - tests/contracts/v11/metaReviewGate.contract.runner.ts
  - tests/contracts/v11/metaReviewGate.contract.test.ts
  - tests/contracts/v11/corpus/manifest.json
  - tests/contracts/v11/cases/meta-review-gate/meta-review-gate-apply-running-deprecated-runtime-input-parity.case.json
  - tests/contracts/v11/cases/meta-review-gate/meta-review-gate-apply-running-deprecated-runtime-input-failed-delivery-parity.case.json
  - tests/contracts/v11/cases/meta-review-gate/meta-review-gate-apply-running-deprecated-runtime-input-uncertain-delivery-parity.case.json
  - tests/v11/application/metaReview/metaReviewGateEmit.test.ts
  - tests/v11/application/metaReview/metaReviewGateNotify.test.ts
  - tests/v11/application/metaReview/metaReviewGatePaneBinding.test.ts
prd_ref: null
plan_ref: plans/actor-runtime-interface-post-phaseE-successor-plan-v1.md
system_context_ref: docs/pairflow-initial-design.md
owners:
  - "felho"
---

# Task: Actor Runtime Interface Opportunity 2 Task 11: Meta-Review Gate Deprecated Runtime Alias Removal

## Current Codebase Check (2026-04-21)

1. Az `O2-T9` utan a meta-review gate canonical runtime capability current-tree szinten nested `tmux` shape:
   - `tmux.runner`
   - `tmux.maybeAcceptTrustPrompt`
   - `tmux.sendSubmissionRequestMessage`
   - `tmux.submitPaneInput`
   - `tmux.respawnPaneCommand`
2. Ugyanakkor a current tree tovabbra is megtart deprecated top-level alias mezoket es parity coverage-t:
   - `runTmux`
   - `maybeAcceptClaudeTrustPrompt`
   - `sendAndSubmitTmuxPaneMessage`
   - `submitTmuxPaneInput`
   - `respawnTmuxPaneCommand`
   - `deprecated_top_level` contract-runner shape
3. Ez a slice nem generic executor vagy onboarding munka, hanem az `Opportunity 2` gate-local runtime compatibility residualjanak teljes eltuntetese.
4. Sequencing reality a current tree-ben:
   - ez a task az `O2-T10` utan kovetkezo residual cleanup slice;
   - nem elozheti meg az `O2-T10` delivery compatibility surface removal closeoutjat;
   - az `O2` lane full compatibility-surface removal olvasatu closeoutja csak `O2-T10` + `O2-T11` utan mondhato ki.

## Closed-Contract Drift Anchors

1. Canonical source anchors a current tree-ben:
   - `src/v11/shared/metaReviewGate/metaReviewGateTypes.ts`
   - `src/v11/application/metaReviewGate/emitMetaReviewGateV11.ts`
   - `src/v11/application/metaReviewGate/metaReviewGatePaneBinding.ts`
   - `src/v11/defaults/metaReviewGate/metaReviewGateCommandDefaults.ts`
2. Ezekben a fixen megorzendo canonical elemek:
   - `notify.tmux.runner`
   - `notify.tmux.maybeAcceptTrustPrompt`
   - `notify.tmux.sendSubmissionRequestMessage`
   - `notify.tmux.submitPaneInput`
   - `paneBinding.tmux.runner`
   - `paneBinding.tmux.respawnPaneCommand`
   - `MetaReviewRuntimeDeliveryObservation.status = confirmed | uncertain | failed`
3. A deprecated top-level runtime alias surface ebben a taskban nem reinterpretalhato:
   - nem "public callable surface promise",
   - nem "harmless local shorthand",
   - nem "same-authority convenience mirror".
4. A local imported implementation symbolok jelenlete nem keverendo ossze a deprecated top-level runtime input field-ekkel:
   - `runTmux` mint imported runner implementation megmaradhat, ha csak nested `tmux.runner` fieldbe van bekotve.
5. Ha barmely top-level alias field vagy parity shape megmarad, annak bizonyithatoan canonical-only nested consume ownershipot kellene szolgalnia; puszta rematerialization nem elfogadhato.

## L0 - Policy

### Goal

1. Nem atnevezest kerunk.
2. Nem replacementet kerunk.
3. Nem backward compatibilityt kerunk.
4. A meta-review gate deprecated top-level runtime alias surface-t teljesen ki kell torolni.
5. A vegallapotban egyetlen canonical runtime capability forma marad:
   - nested `tmux` capability.

### Non-Compatibility Policy (Explicit)

1. Nincs consumer-side compatibility budget.
2. Nem elfogadhato:
   - deprecated top-level alias mezok megtartasa,
   - explicit override seam alatt visszamaterializalt aliasok,
   - `deprecated_top_level` parity scenario megtartasa.

### Business Invariant

1. A meta-review gate workflow/runtime capability shape-nek egyetlen canonical formaval kell rendelkeznie.
2. Az observation truth (`confirmed | uncertain | failed`) valtozatlanul megmarad.
3. A task nem nyithat generic executor lane-t, es nem irhatja ujra a nested `tmux` capability semanticsat.

### Allowed Resolution Path

1. A nested `tmux` capability kozvetlen consume-ja.
2. A deprecated alias coverage torlese es canonical coverage-re atirasa.
3. A defaults/runtime wiring tovabbra is ugyanazokra a `tmuxManager` / `tmuxInput` implementationokra mutathat, ha azok csak nested `tmux.*` fielden keresztul latszanak.

### Forbidden Fallback

1. Top-level `runTmux` alias megorzese.
2. `emitMetaReviewGateV11` compatibility materialization helper meghagyasa.
3. `deprecated_top_level` runtime input shape megtartasa.
4. `metaReviewGatePaneBinding.ts` oldali notify-runtime alias visszamaterializalas meghagyasa.

## Scope Reality / Shape Proof

1. Primary bounded-task shape:
   - `consumer_family_alignment`
2. Secondary shape:
   - `fail_closed_hardening`
3. Why this mix is safe:
   - ugyanannak a gate-local runtime capability familynek a shared contract + wrapper/default + contract coverage residual cleanupja tortenik;
   - a fail-closed observation truth preserved baseline marad, csak a deprecated ingress surface tunik el;
   - nincs public/read-model export cleanup es nincs generic executor topology rewrite.
4. Explicitly deferred:
   - delivery compat surface removal (`O2-T10`)
   - `O3` onboarding / extension-surface simplification
5. Sequencing constraint:
   - a task csak az `O2-T10` utani residual closeout szeletkent implementalhato.

## Authority Boundary Map

1. `authority_producer`
   - `N/A`
   - current role: a task nem ownershipolja a tmux primitive implementationt vagy a producer semanticsat
2. `persisted_authority`
   - `MetaReviewRuntimeDeliveryObservation`
   - status in this task: preserved baseline, not redefined
3. `internal_execution_consumers`
   - `src/v11/application/metaReviewGate/emitMetaReviewGateV11.ts`
   - `src/v11/application/metaReviewGate/metaReviewGatePaneBinding.ts`
4. `workflow_orchestration_consumers`
   - `src/v11/shared/metaReviewGate/metaReviewGateTypes.ts`
   - `src/v11/defaults/metaReviewGate/metaReviewGateCommandDefaults.ts`
5. `read_model_consumers`
   - `N/A`
6. `cleanup_recovery_consumers`
   - `N/A`
7. Export surfaces closed in this phase:
   - no repo-root/public export surface is in scope

## Closure-Budget Gate

1. Closure buckets touched:
   - `shared_contract`
   - `internal_execution_consumers`
   - `workflow_orchestration_consumers`
2. Intentionally collapsed closures:
   - `shared_contract` + `internal_execution_consumers` + `workflow_orchestration_consumers`
3. Why this collapse is safe:
   - ugyanannak a meta-review gate runtime capability alias familynek a torlese tortenik;
   - nincs producer rewrite, nincs persisted truth migration, nincs read-model/public fallout;
   - a contract runner es targeted tests ugyanennek a gate-local input surface-nek a parity proofjat ownershipoljak.
4. Explicitly deferred closures:
   - `authority_producer`
   - `read_model_consumers`
   - `cleanup_recovery_consumers`

## Baseline Preservation

1. `must_preserve_behaviors`
   - a meta-review gate runtime delivery observation truth tovabbra is `confirmed | uncertain | failed`
   - a nested `notify.tmux.*` es `paneBinding.tmux.*` capability semantics valtozatlanul megmarad
   - a default runtime wiring tovabbra is ugyanazokra a tmux implementationokra mutat
2. `allowed_resolution_paths`
   - direct nested `runtime.notify.tmux.*` consume
   - direct nested `runtime.paneBinding.tmux.*` consume
   - default runtime wiring imported implementation -> nested `tmux.*` field
3. `forbidden_regression_interpretations`
   - alias removal nem regresszalhat runtime-unavailable rewrite-va, ha a nested capability jelen van
   - a raw imported symbolnev (`runTmux`) nem minositheto deprecated top-level input aliasnak onmagaban
   - a compat parity scenario torlese nem lazithatja az uncertain / failed observation proofot
4. `replacement_proof_required_if_removed`
   - minden torolt top-level alias field helyett explicit nested `tmux.*` pathnak kell maradnia
   - a `deprecated_top_level` contract-runner shape helyett canonical nested contract coverage-nek kell maradnia ugyanarra az observation truthra

## Complexity Risk Gate

1. `authority_risk`: `1`
2. `surface_spread`: `1`
3. `identity_join_risk`: `0`
4. `activation_coupling`: `1`
5. `prerequisite_risk`: `1`
6. `acceptance_multiplicity`: `2`
7. `risk_score`: `6`
8. `split_decision`: `already split`
9. Why no further split:
   - a current slice mar explicit residual cleanup lane az `O2-T9` canonical closure utan;
   - a bent marado scope egyetlen gate-local deprecated runtime alias family teljes eltuntetese.

## Kill List

Az alabbi neveknek el kell tunniuk a meta-review gate familybol es a hozzajuk tartozo contract coverage-bol:

1. `maybeAcceptClaudeTrustPrompt`
2. `sendAndSubmitTmuxPaneMessage`
3. `submitTmuxPaneInput`
4. `respawnTmuxPaneCommand`
5. top-level `runTmux`
6. `deprecated_top_level`
7. az aliasokat visszamaterializalo compatibility helper/mapping az `emitMetaReviewGateV11` korul
8. az aliasokat visszamaterializalo notify-runtime fallback mapping a `metaReviewGatePaneBinding.ts` korul

## Required Edits

1. A shared meta-review gate tipusokbol torolni kell a deprecated top-level runtime mezoket.
2. A capability resolverek nem olvashatnak top-level fallback aliasokat.
3. Az `emitMetaReviewGateV11` nem materializalhat deprecated aliasokat sem default, sem explicit override pathon.
4. A `metaReviewGatePaneBinding.ts` nem materializalhat notify-side top-level aliasokat fallback runtime shape-kent.
5. A contract runnerbol torolni kell a `deprecated_top_level` shape-et.
6. A `tests/contracts/v11/corpus/manifest.json`-bol is torolni kell a deprecated parity case referenciait.
7. A kapcsolodo parity case JSON-ok torlendok.
8. A teszteket canonical nested `tmux` runtime shape-re kell atirni.
9. A compatibility-orientalt testassertionok nem kerhetik tobbe a top-level alias fieldek jelenletet sem builtin wrapper, sem explicit override runtime alatt.

## Precondition and Side-Effect Boundary

1. Validations that must pass before side effects:
   - a nested `tmux` runtime capability jelenlete tovabbra is eleg a notify/pane-binding flowhoz
   - a contract runner es targeted tests bizonyitjak, hogy a canonical nested shape ugyanazt az observation truthot ownershipolja
2. Side effects forbidden before validations pass:
   - nem kerulhet vissza top-level alias mezomaterializalas "compatibility only" cimszo alatt
   - nem lazulhat a runtime capability resolution top-level fallback olvasassa
3. Invalid/precondition-failure behavior:
   - ha nested capability hianyzik, a mai fail-closed / runtime-unavailable observation marad
   - ez a task nem vezethet be uj fallback alias read pathot
4. Coordination primitives in scope:
   - none
5. Fail-closed rule:
   - mixed nested+deprecated top-level vegallapot nem elfogadhato
   - a `deprecated_top_level` contract input shape nem maradhat runner- vagy parity-cimke alatt sem

## Acceptance Criteria

### Functional

1. A meta-review gate kizárólag canonical nested runtime capability shape-pel mukodik.
2. Nincs deprecated top-level alias ingress vagy parity coverage.

### Zero-Hit Audit

```bash
rg -n "maybeAcceptClaudeTrustPrompt|sendAndSubmitTmuxPaneMessage|submitTmuxPaneInput|respawnTmuxPaneCommand|deprecated_top_level" src/v11/shared/metaReviewGate src/v11/application/metaReviewGate src/v11/defaults/metaReviewGate tests/contracts/v11 tests/v11/application/metaReview
```

```bash
rg -n "runTmux\\s*:|maybeAcceptClaudeTrustPrompt\\s*:|sendAndSubmitTmuxPaneMessage\\s*:|submitTmuxPaneInput\\s*:|respawnTmuxPaneCommand\\s*:" src/v11/shared/metaReviewGate src/v11/application/metaReviewGate tests/contracts/v11/metaReviewGate.contract.runner.ts tests/v11/application/metaReview
```

### Validation

1. `pnpm typecheck`
2. `pnpm build`
3. targetelt vitest korok legalabb:
   - `tests/contracts/v11/metaReviewGate.contract.test.ts`
   - `tests/v11/application/metaReview/metaReviewGateEmit.test.ts`
   - `tests/v11/application/metaReview/metaReviewGateNotify.test.ts`
   - `tests/v11/application/metaReview/metaReviewGatePaneBinding.test.ts`

## Hardening Backlog

1. `later-hardening`
   - Ha a meta-review gate runtime capability family a jovoben tovabbi topology-neutral executor abstractiont kap, az mar nem ebben a taskban, hanem `O3` / kulon executor lane alatt ownershipolando.
