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

### Forbidden Fallback

1. Top-level `runTmux` alias megorzese.
2. `emitMetaReviewGateV11` compatibility materialization helper meghagyasa.
3. `deprecated_top_level` runtime input shape megtartasa.

## Scope Reality / Shape Proof

1. Primary bounded-task shape:
   - `consumer_family_alignment`
2. Secondary shape:
   - `N/A`
3. Why bounded:
   - egyetlen filecsalad es egyetlen runtime capability shape tisztitasa;
   - nincs public export cleanup;
   - nincs delivery producer semantics.
4. Explicitly deferred:
   - delivery compat surface removal (`O2-T10`)
   - `O3` onboarding / extension-surface simplification

## Kill List

Az alabbi neveknek el kell tunniuk a meta-review gate familybol es a hozzajuk tartozo contract coverage-bol:

1. `maybeAcceptClaudeTrustPrompt`
2. `sendAndSubmitTmuxPaneMessage`
3. `submitTmuxPaneInput`
4. `respawnTmuxPaneCommand`
5. top-level `runTmux`
6. `deprecated_top_level`
7. az aliasokat visszamaterializalo compatibility helper/mapping az `emitMetaReviewGateV11` korul

## Required Edits

1. A shared meta-review gate tipusokbol torolni kell a deprecated top-level runtime mezoket.
2. A capability resolverek nem olvashatnak top-level fallback aliasokat.
3. Az `emitMetaReviewGateV11` nem materializalhat deprecated aliasokat sem default, sem explicit override pathon.
4. A contract runnerbol torolni kell a `deprecated_top_level` shape-et.
5. A kapcsolodo parity case JSON-ok torlendok.
6. A teszteket canonical nested `tmux` runtime shape-re kell atirni.

## Acceptance Criteria

### Functional

1. A meta-review gate kizárólag canonical nested runtime capability shape-pel mukodik.
2. Nincs deprecated top-level alias ingress vagy parity coverage.

### Zero-Hit Audit

```bash
rg -n "maybeAcceptClaudeTrustPrompt|sendAndSubmitTmuxPaneMessage|submitTmuxPaneInput|respawnTmuxPaneCommand|deprecated_top_level" src/v11/shared/metaReviewGate src/v11/application/metaReviewGate src/v11/defaults/metaReviewGate tests/contracts/v11 tests/v11/application/metaReview
```

```bash
rg -n "runTmux" src/v11/shared/metaReviewGate src/v11/application/metaReviewGate src/v11/defaults/metaReviewGate tests/contracts/v11/metaReviewGate.contract.runner.ts tests/v11/application/metaReview
```

### Validation

1. `pnpm typecheck`
2. `pnpm build`
3. targetelt vitest korok legalabb:
   - `tests/contracts/v11/metaReviewGate.contract.test.ts`
   - `tests/v11/application/metaReview/metaReviewGateEmit.test.ts`
   - `tests/v11/application/metaReview/metaReviewGateNotify.test.ts`
   - `tests/v11/application/metaReview/metaReviewGatePaneBinding.test.ts`
