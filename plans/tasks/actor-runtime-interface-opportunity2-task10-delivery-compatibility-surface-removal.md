---
artifact_type: task
artifact_id: task_actor_runtime_interface_opportunity2_task10_delivery_compatibility_surface_removal_v1
title: "Actor Runtime Interface Opportunity 2 Task 10: Delivery Compatibility Surface Removal"
status: implementable
phase: post-phaseE
target_files:
  - src/v11/shared/delivery/tmuxDeliveryContract.ts
  - src/v11/shared/ports/tmuxDelivery.ts
  - src/v11/shared/delivery/deliveryAckNormalization.ts
  - src/v11/infrastructure/channel/tmux/tmuxDeliveryRuntime.ts
  - src/v11/infrastructure/channel/tmux/tmuxDelivery.ts
  - src/v11/defaults/reviewer/reviewerDeliveryDefaults.ts
  - src/v11/application/pass/reviewerDeliveryDefaults.ts
  - src/v11/application/approval/runApprovalDecisionEffects.ts
  - src/v11/shared/askHuman/askHumanDeliveryPortsContract.ts
  - src/index.ts
  - tests/core/runtime/tmuxDelivery.test.ts
  - tests/core/agent/pass.test.ts
  - tests/v11/shared/delivery/deliveryAckNormalization.test.ts
  - tests/v11/shared/delivery/implementerHandoffDelivery.test.ts
  - tests/tools/fitness/dependency.test.ts
prd_ref: null
plan_ref: plans/actor-runtime-interface-post-phaseE-successor-plan-v1.md
system_context_ref: docs/pairflow-initial-design.md
owners:
  - "felho"
---

# Task: Actor Runtime Interface Opportunity 2 Task 10: Delivery Compatibility Surface Removal

## Current Codebase Check (2026-04-21)

1. Az `O2-T8` utan a delivery workflow/internal truth current-tree szinten mar canonical `DeliveryAck.status = accepted | rejected`.
2. Ettol fuggetlenul a delivery family tovabbra is retained compatibility surface-eket tart fent:
   - `EmitTmuxDeliveryNotification*` input/result/port vocabulary,
   - `TmuxDeliveryAck*` aliasok,
   - legacy compat shape-ek (`DeliveryAckLike`, `DeliveryAckCompatShape`),
   - legacy projector/helper surface,
   - retained repo-root/public export.
3. Ezek a current tree-ben mar nem canonical authorityk, hanem ugyanarra a boundaryra rakodott legacy vocabulary.
4. Ez a slice nem uj actor onboarding-task, hanem az `Opportunity 2` strictebb lezárási feltétele:
   - a delivery boundary retained compatibility surface-einek teljes eltuntetese.
5. A current tree-ben a retained delivery compatibility surface nem csak a primary delivery filecsaladban el:
   - ask-human contract aliasok: `src/v11/shared/askHuman/askHumanDeliveryPortsContract.ts`
   - retained public export surface: `src/index.ts`
   - retained repo-local consumers / fixture strings:
     - `tests/core/agent/pass.test.ts`
     - `tests/v11/shared/delivery/implementerHandoffDelivery.test.ts`
     - `tests/tools/fitness/dependency.test.ts`

## Closed-Contract Drift Anchors

1. Canonical source anchors a current tree-ben:
   - `src/v11/shared/delivery/tmuxDeliveryContract.ts`
   - `src/v11/shared/ports/tmuxDelivery.ts`
2. Ezekben a fixen megorzendo canonical elemek:
   - `EmitDeliveryNotificationInput`
   - `EmitDeliveryNotificationAckPort`
   - `DeliveryAck`
   - `DeliveryAck.status = accepted | rejected`
3. A retained delivery compatibility surface ebben a taskban nem reinterpretalhato:
   - nem "guard shape",
   - nem "harmless convenience alias",
   - nem "public stability shim".
4. A `delivered` mezot nem szabad tovabbi canonical segedjeloleskent ujrakeretezni.
5. Ha barmely retained shape vagy helper megmarad, annak bizonyithatoan canonical-only end-state-et kell ownershipolnia.

## L0 - Policy

### Goal

1. Nem atnevezest kerunk.
2. Nem replacementet kerunk.
3. Nem backward compatibilityt kerunk.
4. A delivery family retained compatibility surface-eit teljesen ki kell torolni a source-bol, exportokbol es tesztekbol.
5. A vegallapotban a canonical delivery boundary kizárólag:
   - `EmitDeliveryNotificationInput`
   - `EmitDeliveryNotificationAckPort`
   - `DeliveryAck`
   - `accepted | rejected`

### Non-Compatibility Policy (Explicit)

1. Nincs backward compatibility budget.
2. Nem elfogadhato:
   - alias export meghagyasa,
   - legacy type alias megtartasa,
   - projector/normalizer retained helper path,
   - legacy functionnev wrapper meghagyasa,
   - repo-root compat export meghagyasa csak azert, hogy kulso import ne torjon.
3. Ha egy teszt vagy helper csak retained delivery vocabulary miatt letezik, torolni kell vagy canonicalra kell atirni.

### Business Invariant

1. A delivery boundaryhoz egyetlen canonical vocabulary tartozhat.
2. A boolean `delivered` es a `tmux`-nevu delivery aliasok nem maradhatnak boundary-level truth vagy public contract surface.
3. A runtime retained `tmux` adapter implementacio letezhet, de a boundary-vocabulary nem maradhat ketnyelvu.
4. A `delivered` mezot explicit el kell tavolitani a canonical delivery boundaryrol is:
   - nem maradhat sem `AcceptedDeliveryAck` / `RejectedDeliveryAck` mezokent,
   - sem same-boundary compat shape-kent.

### Allowed Resolution Path

1. Canonical delivery ack consume es export.
2. A retained tests canonical contract coverage-re atirasa.
3. Repo-root export shrinkeles.

### Forbidden Fallback

1. `EmitTmuxDeliveryNotification*` retained alias surface.
2. `DeliveryAckLike`-tipusu same-boundary dual shape.
3. `project*LegacyResult` retained helpers.
4. Olyan “compat only” wrapper, amely mar nem ownershipol semmilyen kulon canonical behavior-t.
5. `delivered` mező retained jelenlete a delivery boundary canonical tipusain.

### Shared/Public Contract Decision

1. A repo-root delivery compat export surface intentional breaking removal scope.
2. Current consumer inventory:
   - retained repo-root/public exports: `src/index.ts`
   - repo-local test/import consumers: `tests/core/agent/pass.test.ts`, `tests/v11/shared/delivery/implementerHandoffDelivery.test.ts`
   - repo-local fixture-string consumers: `tests/tools/fitness/dependency.test.ts`
3. Additive-vs-breaking decision:
   - `breaking-now`
4. Why breaking-now is allowed:
   - a lane explicit policyja szerint nincs backward compatibility budget;
   - a current inventory repo-local and auditable;
   - a successor plan ezt mar reopened residual cleanupkent ownershipolja, nem preserved public parity slice-kent.

## Scope Reality / Shape Proof

1. Primary bounded-task shape:
   - `consumer_family_alignment`
2. Secondary shape:
   - `activation_or_read_model`
3. Why this mix is safe:
   - ugyanannak a delivery compatibility vocabularynak a source/export/test felszamolasa tortenik;
   - nincs uj producer semantics;
   - nincs uj runtime topology vagy executor contract.
4. Explicitly deferred:
   - meta-review gate deprecated runtime alias removal
   - generic actor onboarding / extension-surface work (`O3`)
   - unrelated `delivered` mezok mas boundarykon kivul

## Authority Boundary Map

1. `authority_producer`
   - `emitDeliveryNotificationAck(...)`
   - current role: preserved canonical producer
   - status in this task: not rewritten
2. `persisted_authority`
   - `N/A`
3. `internal_execution_consumers`
   - `src/v11/application/approval/runApprovalDecisionEffects.ts`
   - `src/v11/shared/askHuman/askHumanDeliveryPortsContract.ts`
4. `workflow_orchestration_consumers`
   - none beyond the narrow retained alias fallout already listed above
5. `read_model_consumers`
   - `src/index.ts`
   - repo-local test/import surfaces listed in current consumer inventory
6. `cleanup_recovery_consumers`
   - deferred
7. Export surfaces closed in this phase:
   - yes, retained delivery repo-root/public export surface

## Closure-Budget Gate

1. Closure buckets touched:
   - `shared_contract`
   - `internal_execution_consumers`
   - `read_model_consumers`
2. Intentionally collapsed closures:
   - `shared_contract` + `internal_execution_consumers` + `read_model_consumers`
3. Why this collapse is safe:
   - ugyanannak a retained compatibility vocabularynak a torlese tortenik;
   - a producer semantics explicit preserved baseline;
   - nincs kulon diagnostics/read-model truth modell, csak export es import fallout;
   - a full removal acceptance `rg`-zero alapon egyben bizonyithato.
4. Explicitly deferred closures:
   - `authority_producer`
   - `cleanup_recovery_consumers`
   - meta-review gate alias cleanup (`O2-T11`)

## Baseline Preservation

1. `must_preserve_behaviors`
   - canonical delivery ack semantics: `accepted | rejected`
   - current delivery producer behavior and tmux adapter runtime behavior
2. `allowed_resolution_paths`
   - direct canonical `EmitDeliveryNotificationInput` -> `EmitDeliveryNotificationAckPort` -> `DeliveryAck`
3. `forbidden_regression_interpretations`
   - alias removal nem regresszalhat producer rewrite-va;
   - export shrinkeles nem hozhat vissza uj neutral-sounding third vocabularyt;
   - ask-human retained aliasok nem maradhatnak “harmless local shorthand” cimszo alatt.
4. `replacement_proof_required_if_removed`
   - minden torolt retained delivery alias helyett explicit canonical import/use pathnak kell maradnia.
   - a `delivered` mező helyett nincs replacement field; a canonical truth kizárólag `status`.

## Complexity Risk Gate

1. `authority_risk`: `1`
2. `surface_spread`: `2`
3. `identity_join_risk`: `0`
4. `activation_coupling`: `1`
5. `prerequisite_risk`: `1`
6. `acceptance_multiplicity`: `2`
7. `risk_score`: `7`
8. `split_decision`: `already split`
9. Why no further split:
   - a delivery compatibility surface removal mar kulon van valasztva a meta-review gate alias cleanup-tol;
   - a bent marado scope egyetlen boundary vocabulary teljes torlese.

## Kill List

Az alabbi neveknek el kell tunniuk `src/**` es `tests/**` alol:

1. `EmitTmuxDeliveryNotificationInput`
2. `EmitTmuxDeliveryNotificationResult`
3. `EmitTmuxDeliveryNotificationPort`
4. `EmitTmuxDeliveryNotificationAckPort`
5. `AcceptedTmuxDeliveryAck`
6. `RejectedTmuxDeliveryAck`
7. `TmuxDeliveryAck`
8. `TmuxDeliveryAckStatus`
9. `TmuxDeliveryAckReasonCode`
10. `TmuxDeliveryFailureReason`
11. `AcceptedDeliveryAckCompatShape`
12. `RejectedDeliveryAckCompatShape`
13. `LegacyDeliveryAckCompatShape`
14. `DeliveryAckCompatShape`
15. `DeliveryAckLike`
16. `EmitDeliveryAckLikePort`
17. `projectDeliveryAckToLegacyResult`
18. `projectTmuxDeliveryAckToLegacyResult`
19. `createAcceptedTmuxDeliveryAck`
20. `createRejectedTmuxDeliveryAck`
21. `emitTmuxDeliveryNotification`
22. `AskHumanEmitTmuxDeliveryNotificationInput`
23. `AskHumanEmitTmuxDeliveryNotificationResult`
24. `EmitAskHumanTmuxDeliveryNotificationPort`
25. a `delivered` mező a `DeliveryAck` canonical boundary tipusain

## Required Edits

1. A shared delivery contractbol torolni kell a retained `tmux` alias type-okat.
2. A shared ports retegben csak a canonical delivery ack surface maradhat.
3. A legacy union-normalization helper torlendo.
4. A tmux delivery runtime retained legacy projector/helper surface torlendo.
5. A `reviewerDeliveryDefaults` retained legacy function wrappere torlendo.
6. Az approval es ask-human retained type alias usage-at canonical delivery input/ack vocabularyra kell atvezetni.
7. A repo-root exportbol ki kell venni a retained delivery compat type/function surface-et.
8. A kapcsolodo teszteket es fitness fixture stringeket canonical shape-re kell atirni.
9. A `delivered` mezot el kell tavolitani a canonical delivery boundary tipusokbol:
   - `src/v11/shared/delivery/tmuxDeliveryContract.ts`
   - `src/v11/shared/ports/tmuxDelivery.ts`
10. A `normalizeDeliveryAck` helper es a kapcsolodo dedikalt teszt scope-ban van; elfogadhato vegallapot csak ez lehet:
   - a helper torolve van, es a dedikalt teszt is torolve vagy replacement coverage-re atvezetve;
   - vagy a helper megmarad, de inputja mar kizarolag canonical `DeliveryAck`, es a dedikalt tesztbol minden compat/`delivered` assertion eltunik.

## Precondition and Side-Effect Boundary

1. Validations that must pass before side effects:
   - type/export cleanup compile-time consistency
   - repo-local import consumer atvezetes canonical surface-re
2. Side effects forbidden before validations pass:
   - partial alias removal, ahol retained import/export surface marad
3. Invalid/precondition-failure behavior:
   - a task nem zarhato le, ha barmely kill-list token repo-local source vagy test surface-en bent marad
4. Coordination primitives in scope:
   - none
5. Fail-closed rule:
   - mixed canonical+retained delivery vocabulary vegallapot nem elfogadhato
   - `status` + retained `delivered` dual canonical contract vegallapot nem elfogadhato

## Acceptance Criteria

### Functional

1. A delivery family kizárólag canonical delivery ack shape-pel mukodik.
2. Nincs retained public/exported delivery compat surface.

### Zero-Hit Audit

```bash
rg -n "EmitTmuxDeliveryNotificationInput|EmitTmuxDeliveryNotificationResult|EmitTmuxDeliveryNotificationPort|EmitTmuxDeliveryNotificationAckPort|AcceptedTmuxDeliveryAck|RejectedTmuxDeliveryAck|TmuxDeliveryAck|TmuxDeliveryAckStatus|TmuxDeliveryAckReasonCode|TmuxDeliveryFailureReason|AcceptedDeliveryAckCompatShape|RejectedDeliveryAckCompatShape|LegacyDeliveryAckCompatShape|DeliveryAckCompatShape|DeliveryAckLike|EmitDeliveryAckLikePort|projectDeliveryAckToLegacyResult|projectTmuxDeliveryAckToLegacyResult|createAcceptedTmuxDeliveryAck|createRejectedTmuxDeliveryAck|emitTmuxDeliveryNotification|AskHumanEmitTmuxDeliveryNotificationInput|AskHumanEmitTmuxDeliveryNotificationResult|EmitAskHumanTmuxDeliveryNotificationPort" src tests
```

```bash
rg -n "delivered\\?:" src/v11/shared/delivery/tmuxDeliveryContract.ts src/v11/shared/ports/tmuxDelivery.ts
```

```bash
rg -n "\\bdelivered\\b" src/v11/shared/delivery/deliveryAckNormalization.ts src/v11/infrastructure/channel/tmux/tmuxDeliveryRuntime.ts tests/v11/shared/delivery/deliveryAckNormalization.test.ts
```

### Validation

1. `pnpm typecheck`
2. `pnpm build`
3. targetelt vitest korok legalabb:
   - `tests/core/runtime/tmuxDelivery.test.ts`
   - `tests/core/agent/pass.test.ts`
   - `tests/v11/shared/delivery/deliveryAckNormalization.test.ts`
   - `tests/v11/shared/delivery/implementerHandoffDelivery.test.ts`
   - `tests/tools/fitness/dependency.test.ts`
