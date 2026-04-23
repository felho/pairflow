---
artifact_type: task
artifact_id: task_runtime_review_policy_auto_rework_threshold_phase2_v1
title: "Runtime Review Policy Auto-Rework Threshold Delivery (Phase 2)"
status: draft
phase: phase2
target_files:
  - src/v11/shared/reviewPolicy/reviewPolicyRuntime.ts
  - src/v11/shared/metaReviewGate/metaReviewGateThresholdAuthority.ts
  - src/v11/shared/metaReviewGate/metaReviewGateTypes.ts
  - src/v11/shared/metaReviewGate/metaReviewGateCommandContract.ts
  - src/v11/shared/metaReviewGate/metaReviewGateCurrentRunFinalization.ts
  - src/v11/shared/metaReviewGate/metaReviewGateStateHelpers.ts
  - src/v11/shared/metaReviewGate/metaReviewGateHumanGatePersistence.ts
  - src/v11/shared/metaReviewGate/metaReviewGateApplyObservation.ts
  - src/v11/shared/metaReviewGate/approvalRequestEnvelope.ts
  - src/v11/application/converged/convergedFinalizationMetadata.ts
  - src/v11/application/converged/convergedFinalizationEvents.ts
  - src/v11/application/metaReview/metaReviewCommandContract.ts
  - src/v11/shared/metaReview/metaReviewCommandSubmitRouting.ts
  - src/v11/application/metaReview/metaReviewSubmitRenderers.ts
  - src/v11/shared/metrics/report/aggregate.ts
  - src/v11/shared/metrics/report/types.ts
  - src/v11/shared/metrics/report/aggregateSupport.ts
  - src/v11/shared/metrics/report/format.ts
  - src/v11/infrastructure/artifact/metrics/report/report.ts
  - tests/core/bubble/metaReviewGate.test.ts
  - tests/core/bubble/approvalRequestEnvelope.test.ts
  - tests/core/agent/converged.test.ts
  - tests/core/human/approval.test.ts
  - tests/contracts/v11/metaReviewGate.contract.runner.ts
  - tests/contracts/v11/metaReviewGate.contract.test.ts
  - tests/contracts/v11/converged.contract.runner.ts
  - tests/contracts/v11/metaReviewSubmitCoverage.test.ts
  - tests/v11/application/metaReview/metaReviewSubmitRenderers.test.ts
  - tests/v11/shared/metaReviewGate/metaReviewGateThresholdAuthority.test.ts
  - tests/v11/shared/metaReviewGate/metaReviewGateHumanGatePersistence.test.ts
  - tests/v11/shared/metrics/report/format.test.ts
  - tests/v11/shared/metrics/report/report.test.ts
prd_ref: null
plan_ref: plans/archive/plans/runtime-review-policy-reset-and-phasing-plan-v1.md
system_context_ref: docs/pairflow-initial-design.md
normative_refs:
  - plans/archive/plans/runtime-review-policy-reset-and-phasing-plan-v1.md
  - plans/archive/tasks/runtime-review-policy-foundation-and-authority-refactor-phase1.md
  - plans/actor-runtime-interface-post-phaseE-successor-plan-v1.md
  - docs/pairflow-initial-design.md
  - docs/architecture/v11-placement-and-extraction-governance.md
owners:
  - "felho"
---

# Task: Runtime Review Policy Auto-Rework Threshold Delivery (Phase 2)

## Current Codebase Check (2026-04-21)

1. A canonical `review_policy` config/runtime surface es a threshold-authority resolver mar merged baseline a current `main`-on:
   - `src/v11/shared/reviewPolicy/reviewPolicyRuntime.ts`
   - `src/v11/shared/metaReviewGate/metaReviewGateThresholdAuthority.ts`
2. A current gate routing meg nem consume-olja ezt az authority boundaryt. `finalizeCurrentRunMetaReviewGate(...)` ma tovabbra is `recommendation === "rework"` + `budgetAvailable === true` eseten auto rework fele megy.
3. A jelenlegi human-gate route vocabulary nem ad igaz outputot a `rework + budget available + threshold not met` vagy a `rework + budget available + threshold authority unresolved` helyzetre.
4. A current approval/human-gate path mar route-persisted envelope-re, converged metadata-ra es metrics route-countokra tamaszkodik, ezert a Phase 2 blast radius bounded, de tobb same-family consumerre at kell vezetni.
5. A Phase 1 foundation mar lezart baseline; ez a task nem nyithat ujra config-schema vagy list/status foundation refactort.

## L0 - Policy

### Goal

Wire-olni a merged Phase 1 review-policy authority surface-et a canonical meta-review gate routingba ugy, hogy:
1. auto rework csak akkor tortenjen, ha a same-run threshold authority bizonyitja, hogy a legmagasabb open severity eleri a configured minimumot,
2. a threshold alatti vagy threshold szempontbol nem bizonyithato esetek truth-preserving human-gate route-ra essenek vissza,
3. a route/result/envelope/metrics surfaces ugyanazt a threshold-dontest tukrozzek,
4. bypass contract, UI/control surface es uj foundation seam ne keruljon vissza scope-ba.

### Domain / Control Model Summary

1. Business invariant:
   meta-review `rework` recommendation onmagaban nem eleg auto reworkhoz; a canonical same-run threshold authoritynak is igazolnia kell, hogy a highest open severity eleri a configured minimumot.
2. Control model:
   a routingdontest a normalized `review_policy.meta_review_auto_rework_min_severity` + a `resolveMetaReviewGateThresholdAuthority(...)` altal feloldott same-run authority egyutt hozza meg.
3. Read-path rule:
   thresholdet csak a `reviewPolicyRuntime` normalized outputjabol, a severity authorityt csak a `metaReviewGateThresholdAuthority` boundaryn keresztul szabad olvasni.
4. Forbidden fallback:
   reviewer snapshot, approval envelope metadata, converged metadata, metrics aggregates vagy summary-level derived adat nem valhat canonical threshold truth-ta.
5. Allowed resolution path:
   `runResult.report_json` -> parity metadata -> findings artifact parity -> artifact findings severity -> threshold compare ugyanazon authority lanc reszekent megengedett.
6. Missing-data rule:
   ha a threshold authority `unresolved` vagy `incomplete`, auto rework tilos; a rendszer truth-preserving human gate route-ra all explicit diagnostics-szal.
7. Phase boundary:
   - contract closure: owned here
   - producer closure: predecessor-owned, a Phase 1 authority producer reuse-ja kotelezo
   - internal execution closure: owned here
   - workflow/orchestration closure: owned here
   - read-model closure: owned here, de csak gate-result / submit-result / converged / metrics consume family szinten
   - activation closure: owned here, de csak auto-rework threshold deliveryre
   - cleanup/recovery closure: successor

### Plan Linkage

1. Parent plan gap closed:
   a Phase 1 foundation utan hianyzo threshold-delivery slice, amely a policy authorityt tenyleges gate routing semantics-se alakitja.
2. Depends on:
   [runtime-review-policy-foundation-and-authority-refactor-phase1.md](/Users/felho/dev/pairflow/plans/archive/tasks/runtime-review-policy-foundation-and-authority-refactor-phase1.md)
3. Unlocks / impacts successors:
   a bypass-contract Phase 3A task mar stabil merged threshold baseline-re epulhet, es nem kell sajat threshold semantics-et ujranyitnia.
4. Task-list impact:
   refine-olja a reset plan Phase 2 slotjat; nem replace-el Phase 1 foundationt es nem obsoletel bypass taskot.
5. Inherited validation / exit expectation:
   a plan Phase 2 exitje csak akkor teljes, ha a gate routing, persisted human-gate envelope, converged metadata es metrics route-count egyazon threshold-dontest visznek vegig.

### Canonical Contract Anchors

1. Source-of-truth anchors:
   - [reviewPolicyRuntime.ts](/Users/felho/dev/pairflow/src/v11/shared/reviewPolicy/reviewPolicyRuntime.ts)
   - [metaReviewGateThresholdAuthority.ts](/Users/felho/dev/pairflow/src/v11/shared/metaReviewGate/metaReviewGateThresholdAuthority.ts)
   - [metaReviewGateCurrentRunFinalization.ts](/Users/felho/dev/pairflow/src/v11/shared/metaReviewGate/metaReviewGateCurrentRunFinalization.ts)
   - [metaReviewGateHumanGatePersistence.ts](/Users/felho/dev/pairflow/src/v11/shared/metaReviewGate/metaReviewGateHumanGatePersistence.ts)
   - [approvalRequestEnvelope.ts](/Users/felho/dev/pairflow/src/v11/shared/metaReviewGate/approvalRequestEnvelope.ts)
   - [convergedFinalizationMetadata.ts](/Users/felho/dev/pairflow/src/v11/application/converged/convergedFinalizationMetadata.ts)
   - [metaReviewCommandContract.ts](/Users/felho/dev/pairflow/src/v11/application/metaReview/metaReviewCommandContract.ts)
   - [aggregate.ts](/Users/felho/dev/pairflow/src/v11/shared/metrics/report/aggregate.ts)
2. Canonical elements:
   - `review_policy.meta_review_auto_rework_min_severity`
   - threshold authority statuses: `resolved | unresolved | incomplete`
   - same-run artifact/parity validated `highestOpenSeverity`
3. Guard elements:
   - parity metadata totals es digest guardok
   - same-round run-id correlation
   - reviewer snapshot approval consistency guardok
4. Compat-only elements:
   - approval request summary normalization
   - metrics route-count aggregates
   - converged fallback route-to-recommendation/status mapperek
   - submit/result renderer text output
5. Forbidden reinterpretations:
   - a Phase 1 authority resolver nem cserelheto le approval snapshot vagy summary-derived severity fallbackra
   - a current `human_gate_budget_exhausted`, `human_gate_inconclusive` es `human_gate_dispatch_failed` route-ok nem terhelhetok ra hamis threshold-jelentesekkel

### Scope Reality / Shape Proof

1. Inspected entrypoints / call-sites:
   `src/v11/shared/metaReviewGate/metaReviewGateTypes.ts`, `metaReviewGateCommandContract.ts`, `metaReviewGateCurrentRunFinalization.ts`, `metaReviewGateStateHelpers.ts`, `metaReviewGateHumanGatePersistence.ts`, `metaReviewGateApplyObservation.ts`, `approvalRequestEnvelope.ts`, `src/v11/application/converged/{convergedFinalizationMetadata,convergedFinalizationEvents}.ts`, `src/v11/application/metaReview/{metaReviewCommandContract,metaReviewSubmitRenderers}.ts`, `src/v11/shared/metaReview/metaReviewCommandSubmitRouting.ts`, `src/v11/shared/metrics/report/{aggregate,types,aggregateSupport,format}.ts`, `src/v11/infrastructure/artifact/metrics/report/report.ts`, valamint a Phase 1 authority/runtime anchors.
2. Actual touched scope:
   `consumer_family_alignment` primary, `fail_closed_hardening` secondary.
3. Mutation entrypoints in scope:
   a gate finalize path altal appendelt `APPROVAL_DECISION` / `APPROVAL_REQUEST` transcript-envelopes, valamint a human-gate persisted route/result surfaces.
4. Hidden scope ruled out:
   bubble config parse/render, list/status projection, UI presenter/API mutate surface, bypass topology es actor-runtime cutover kulon ellenorizve es scope-on kivul hagyva.
5. Branch inventory note:
   `rework+budget+threshold_met`, `rework+budget+threshold_not_met`, `rework+budget+threshold_unresolved`, `rework+budget+threshold_incomplete`, `rework+no_budget`, `approve`, `inconclusive`, `run_failed`, append-failure/rollback branch mind kotelezoen reprezentalt.
   `human_gate_sticky_bypass` szandekosan nincs ebben az inventoryban, mert a bypass topology ebben a fazisban explicit scope-on kivul marad.
6. Why the declared task shape matches reality:
   a task nem uj authority producet hoz letre, hanem a Phase 1 authority consume familyjat koti ra a gate routingra, es ugyanennek additive result-contract alignmentjat zarja a converged/metrics surfacesen.

### Authority Boundary Map

1. Authority producer:
   a Phase 1-ben bevezetett `reviewPolicyRuntime` normalization es `metaReviewGateThresholdAuthority` resolver egyuttese.
2. Stored authority:
   `bubble.toml` `review_policy` blokk + same-run report/parity/findings artifact inputs.
3. In-scope consumers:
   current-run gate finalization, persisted human-gate route, approval request route metadata, submit-result route exposure, converged event metadata, metrics/report route counts.
4. Explicit out-of-scope consumers:
   list/status/detail UI projection, API mutate surface, reviewer bypass contract, actor prompt topology, cleanup/recovery flows.
5. Export surfaces closed in this phase:
   `yes`; a gate-route truth export surfaces additive modon bezarulnak a v11 gate result, submit-result, converged es metrics familyben.
6. Implementation ownership guard:
   a `src/v11/shared/reviewPolicy/reviewPolicyRuntime.ts` es `src/v11/shared/metaReviewGate/metaReviewGateThresholdAuthority.ts` ebben a fazisban consume-anchor baseline, nem producer-ownership target.
   Ezekhez csak akkor indokolt hozzanyulni, ha tipusbiztonsagi vagy shared-contract kompatibilitasi kenyszer ezt kozvetlenul bizonyitja; uj authority semantics vagy producer-fallback nem viheto vissza rajtuk keresztul.

### Baseline Preservation

1. Must-preserve behaviors:
   - `approve` tovabbra is `human_gate_approve` route-ra megy
   - `rework + no budget` tovabbra is `human_gate_budget_exhausted`
   - `inconclusive` tovabbra is `human_gate_inconclusive`
   - meta-review run failure tovabbra is `human_gate_run_failed`
   - actual append/rollback failure tovabbra is `human_gate_dispatch_failed`
   - approve-route-specific reviewer snapshot/advisory consistency guardok nem lazulhatnak
2. Allowed resolution paths:
   - resolved threshold authority eseten severity compare a normalized minimum ellen
   - unresolved/incomplete authority eseten conservative human-gate fallback explicit reason metadata-val
3. Forbidden regression interpretations:
   - budget exhaustion nem jelenthet threshold-blockot
   - threshold-block nem jelenthet inconclusive recommendationt
   - authority-unresolved eset nem jelenthet successful auto-rework attemptet
4. Replacement proof required if removed:
   ha a new threshold routes helyett mas existing route reuse-ja marad, explicit bizonyitas kell arrol, hogy az nem hazudik a recommendationrol, az okrol vagy a statusrol.

### Success / Completion Proof Boundary

1. Current canonical success proof source:
   a gate-result `route` + persisted transcript envelope + converged metadata fallback mapperek.
2. Target canonical success proof source:
   ugyanez, de mar threshold-aware route vocabularyval es reason metadata-val.
3. Current canonical completion proof source:
   a gate finalize path altal persisted `APPROVAL_DECISION` vagy `APPROVAL_REQUEST` envelope.
4. Target canonical completion proof source:
   valtozatlanul a persisted gate envelope, de a route es threshold rationale mar a Phase 2 truthot tukrozi.
5. Reused proof contract:
   transcript append + state transition + observation reconciliation contract reuse.
6. Proof-parity rule:
   `inherit_full_parity`
7. Final truth surfaces affected:
   `MetaReviewGateRoute`, gate result route, approval request metadata, submit result `gate_route`, converged route recommendation/status fallback, metrics route counts.
8. Mixed-truth surfaces allowed:
   explicit compat-only list: converged fallback mapperek, submit/render text output, es metrics aggregates addig, amig ugyanazt a persisted route truthot olvassak.

### Precondition and Side-Effect Boundary

1. Primary bounded task shape:
   `consumer_family_alignment`
2. Secondary shape (if any):
   `fail_closed_hardening`; ez bounded, mert uj coordination primitive vagy config producer nincs.
3. Preconditions that must pass before side effects:
   - normalized review policy sikeres feloldasa
   - positive-claim/parity validation sikeres
   - threshold authority resolution lefut
   - auto rework csak `resolved` + `threshold met` eseten megengedett
4. Side effects forbidden before preconditions pass:
   - implementer fele `APPROVAL_DECISION(rework)` append
   - auto-rework round resume
   - human-gate route hamis megjelolese
5. Invalid/precondition-failure behavior:
   zero auto-rework side effect; truth-preserving human-gate route explicit diagnostics-szal.
6. Coordination primitives in scope:
   `N/A`; a meglevo transcript/state optimistic guards reuse-ja kotelezo.

### In Scope

1. Threshold-aware gate routing a merged Phase 1 authority boundaries consume-olasaval.
2. Uj truthful human-gate route vocabulary azokra az esetekre, amelyeket a jelenlegi route-keszlet nem tud helyesen kifejezni.
3. Approval request route metadata es summary/fallback alignment a threshold-donteshez.
4. Converged route recommendation/status fallback alignment.
5. Metrics route-count inventory es formatter alignment.
6. Contract- es regresszios tesztmatrix bovitese a Phase 2 branch-familiesre.

### Out of Scope

1. Bypass contract vagy `review_loop_mode=meta_only` aktivacio.
2. Bubble config schema vagy Phase 1 authority producer ujranyitasa.
3. List/status/detail UI projection.
4. Uj CLI operator surface a mar letezo route/result exposure-n tul.
5. Cleanup/recovery topology vagy state-machine refactor.

### Safety Defaults

1. `recommendation === "rework"` es `budgetAvailable === true` mellett is default a no-auto-rework, amig a threshold authority nem `resolved` es a severity compare nem `met`.
2. A threshold authority `unresolved` es `incomplete` statusok nem downgrade-olhatok `approve` vagy `inconclusive` route-ra.
3. A human-gate fallback route-nak truth-preservingnek kell maradnia a recommendation, a budget allapot es a threshold rationale szempontjabol is.
4. A metrics es converged surfaces nem talalhatnak ki implicit fallback route-ot, ha a type union bovitese megtortenik.

### Contract Boundary / Blast Radius

1. `contract_boundary_override`: `yes`
2. Impacted contracts:
   - internal gate route contract
   - approval request metadata contract
   - converged metadata fallback contract
   - metrics route-count contract

### Complexity Risk Gate

1. `authority_risk`: `1`
2. `surface_spread`: `1`
3. `identity_join_risk`: `1`
4. `activation_coupling`: `1`
5. `prerequisite_risk`: `0`
6. `acceptance_multiplicity`: `2`
7. `risk_score`: `6`
8. `single-task allowed`: `yes`
9. Identity/join note:
   - canonical identity path: `bubble review_policy` + same-run `meta_review_run_id` + validated findings artifact
   - competing identifiers or fallback identities: reviewer snapshot, approval envelope metadata, summary text
10. Authority/source-of-truth note:
   - canonical source: Phase 1 normalization + threshold authority resolver
   - forbidden secondary sources: snapshot-derived severity, metrics/converged echoes
11. Closure-budget triage:
   - closure buckets touched: `workflow/orchestration`, `internal execution`, `read-model`
   - intentionally collapsed closures: `consumer_family_alignment + fail_closed_hardening`, mert ugyanazon route truth familyt erintik
   - explicitly deferred closures: `producer`, `bypass activation`, `cleanup/recovery`, `UI/control`
12. Bounded-task-shape decision:
   - primary shape: `consumer_family_alignment`
   - secondary shape: `fail_closed_hardening`
   - why this bounded mix is safe: az authority producer mar Phase 1-ben letezik; itt csak a consume gate es a truth-export family zarul.

## L1 - Change Contract

### 0) Domain / Control Contract

| Item | Rule | Implementation Consequence | Priority | Timing |
|---|---|---|---|---|
| Business invariant | Auto rework csak verified same-run threshold authority mellett engedheto | `rework` recommendation nem routolhato kozvetlenul auto reworkra | P1 | required-now |
| Control model | Threshold decision = normalized min severity + resolved highest open severity | A route helpernek mindket authority inputot explicit consume-olnia kell | P1 | required-now |
| Read-path rule | Min severity csak `reviewPolicyRuntime`, highest severity csak `metaReviewGateThresholdAuthority` | Inline severity parse vagy route-local fallback tiltott | P1 | required-now |
| Forbidden fallback | Snapshot, approval metadata, converged/metrics echo nem lehet threshold truth | Ezek legfeljebb compat/read-model surfaces maradhatnak | P1 | required-now |
| Allowed resolution path | Report/parity/artifact same-authority reconciliation megengedett | A Phase 1 resolver outputjat kell tovabbvinni, nem uj shortcutot | P1 | required-now |
| Missing-data rule | `unresolved` / `incomplete` => no auto rework, human gate | Truthful fallback route + diagnostics kotelezo | P1 | required-now |
| Phase boundary | Producer closure predecessor-closed; routing/read-model delivery ownership itt | Phase 1 foundation es Phase 3 bypass kulon marad | P2 | required-now |

### 0a) Canonical Contract Preservation

| Element | Source Anchor | Required Interpretation | This Task Action | Priority | Timing |
|---|---|---|---|---|---|
| `meta_review_auto_rework_min_severity` | `src/v11/shared/reviewPolicy/reviewPolicyRuntime.ts` | Canonical configured minimum severity | preserve_consume | P1 | required-now |
| Threshold authority status | `src/v11/shared/metaReviewGate/metaReviewGateThresholdAuthority.ts` | `resolved` / `unresolved` / `incomplete` business meaning fix | preserve_consume | P1 | required-now |
| `human_gate_budget_exhausted` | `src/v11/shared/metaReviewGate/metaReviewGateStateHelpers.ts` | Csak budget hianyt jelenthet | preserve | P1 | required-now |
| `human_gate_dispatch_failed` | `src/v11/shared/metaReviewGate/metaReviewGateHumanGatePersistence.ts` | Csak tenyleges append/rollback failure route maradhat | preserve | P1 | required-now |
| Approve-route snapshot guards | `src/v11/shared/metaReviewGate/approvalRequestEnvelope.ts` | Approve path consistency guard marad | preserve | P1 | required-now |

### 0b) Scope Reality and Shape Proof

| Item | Rule | Implementation / Review Consequence | Priority | Timing |
|---|---|---|---|---|
| Inspected entrypoints / call-sites | A route union, finalize path, persistence, observation reconcile, converged metadata es metrics anchors current-tree evidence | Ezek a kotelezo same-family alignment pontok | P1 | required-now |
| Actual touched scope | Gate-result consumer family alignment, nem config producer refactor | A review policy schemahoz csak consume, nem producer valtozas johet | P1 | required-now |
| Mutation entrypoints in scope | `APPROVAL_DECISION` es `APPROVAL_REQUEST` append a finalize pathban | Threshold dontes csak ezek elott hozhato meg | P1 | required-now |
| Hidden scope ruled out | List/status/UI/bypass explicit kiveve | Review kozben ezeket nem szabad opportunistic cleanup cimszo alatt hozzahuzni | P1 | required-now |
| Branch inventory note | Kilenc route/precondition ag kotelezo | Tesztmatrixban kulon route- es metadata-assert kell | P1 | required-now |
| Shape proof | Phase 1 authority producer mar letezik | Ezert a bounded delivery task egy bubble-ben vallalhato | P1 | required-now |

### 0c) Plan Linkage and Successor Impact

| Item | Rule | Implementation / Review Consequence | Priority | Timing |
|---|---|---|---|---|
| Parent gap closed | Phase 2 threshold delivery | A task nem maradhat docs-only definicio nelkul | P1 | required-now |
| Depends on | Archived Phase 1 merged baseline | A task nem irhat elo uj foundation seamet | P1 | required-now |
| Unlocks / impacts successors | Phase 3A bypass contract | A bypass task threshold semantics-et mar reuse-olja | P1 | required-now |
| Task-list impact | Phase 2 slot konkretizalasa | A reset plan next stepje implementalhato lesz | P1 | required-now |
| Inherited validation / exit expectation | Gate, converged, metrics truth parity | Minden surface-nek ugyanazt a route truthot kell mutatnia | P1 | required-now |

### 0d) Shared Contract Compatibility

| Shared Contract | Current Consumers | Change Type (`additive|breaking|N/A`) | This Task Action | Deferred Alignment |
|---|---|---|---|---|
| `MetaReviewGateRoute` union | gate finalize, converged metadata, metrics, tests | additive | Uj threshold-human-gate route-ok felvetele es consume alignment | UI/detail `N/A` |
| Approval request route metadata | human approval flow, tests | additive | Uj route-okhoz exact threshold metadata key-set es summary fallback rule | future operator polish |
| Submit result route exposure | meta-review submit result, render helpers, tests | additive | `gate_route` union alignment a mar letezo result es renderer surface-en | future operator polish |
| Metrics route counts | metrics aggregate/report types/format/tests | additive | Route inventory bovites a tenyleges aggregator es report entrypointon at | future dashboard/UI |

### 0e) Baseline Preservation

| Current Behavior | Preserve/Replace/Forbid | Required Proof | Priority | Timing |
|---|---|---|---|---|
| `rework + no budget -> human_gate_budget_exhausted` | preserve | Regression test route parity | P1 | required-now |
| `approve -> human_gate_approve` | preserve | Regression test + approval envelope parity | P1 | required-now |
| `inconclusive -> human_gate_inconclusive` | preserve | Regression test | P1 | required-now |
| `run failed -> human_gate_run_failed` | preserve | Regression test + route metadata | P1 | required-now |
| `rework + budget + threshold authority unresolved/incomplete or threshold compare not met -> auto_rework` | forbid | New fail-closed tests | P1 | required-now |

### 0f) Success / Completion Proof Boundary

| Surface | Current Proof Source | Target Proof Source | Canonical / Compat / Guard | Mixed-Truth Allowed? | Priority | Timing |
|---|---|---|---|---|---|---|
| Gate route result | `MetaReviewGateResult.route` | same, threshold-aware | canonical | no | P1 | required-now |
| Approval request metadata | persisted envelope metadata | same, threshold-aware route+rationale | canonical | no | P1 | required-now |
| Converged metadata fallback | route-to-recommendation/status switch | same, route union expanded | compat | yes, route-sourced only | P1 | required-now |
| Metrics route counts | route key inventory | same, route key inventory expanded | compat | yes, route-sourced only | P1 | required-now |

### 0g) Precondition and Side-Effect Boundary

| Case | Must Be Validated Before | Forbidden Early Side Effects | Required Failure Behavior | Priority | Timing |
|---|---|---|---|---|---|
| threshold met auto rework | normalized policy + parity + resolved threshold authority + compare | implementer append or round resume before compare | proceed auto rework only after compare success | P1 | required-now |
| threshold not met | same as above, but compare false | auto rework dispatch | persisted human gate route with rework-preserving semantics | P1 | required-now |
| threshold unresolved/incomplete | authority status known | auto rework dispatch | persisted human gate route with fail-closed diagnostics | P1 | required-now |

### 1) Call-site Matrix

| ID | File | Function/Entry | Exact Signature (args -> return) | Insertion Point | Expected Behavior | Priority | Timing | Evidence |
|---|---|---|---|---|---|---|---|---|
| CS1 | `src/v11/shared/metaReviewGate/metaReviewGateCurrentRunFinalization.ts` | `finalizeCurrentRunMetaReviewGate(...)` | finalize input -> `Promise<MetaReviewGateResult>` | `rework` routing branch before `dispatchAutoRework(...)` | Resolve normalized threshold + authority, then choose `auto_rework` vs threshold-human-gate route | P1 | required-now | T1, T2, T3, T3b |
| CS2 | `src/v11/shared/metaReviewGate/metaReviewGateStateHelpers.ts` | `resolveHumanGateRoute(...)` or successor helper | recommendation/budget/(threshold outcome) -> route | human-gate route resolver | Existing route resolver bovitese vagy dedicated threshold-aware resolver | P1 | required-now | T2, T4 |
| CS3 | `src/v11/shared/metaReviewGate/metaReviewGateTypes.ts`, `metaReviewGateCommandContract.ts` | route/result types | type exports | route union | Additiv route vocabulary: `human_gate_threshold_not_met`, `human_gate_threshold_unresolved` | P1 | required-now | T4, T9 |
| CS4 | `src/v11/shared/metaReviewGate/metaReviewGateHumanGatePersistence.ts` | `persistHumanGateRoute(...)` | persist input -> `Promise<MetaReviewGateResult>` | persisted human gate route path | New threshold routes accepted, sticky/default semantics explicit | P1 | required-now | T5 |
| CS5 | `src/v11/shared/metaReviewGate/approvalRequestEnvelope.ts` | `appendHumanApprovalRequestEnvelope(...)` | input -> appended envelope | route metadata shaping | Threshold routes truthfully serialized; if rationale metadata added, it must be additive | P1 | required-now | T5, T6 |
| CS6 | `src/v11/shared/metaReviewGate/metaReviewGateApplyObservation.ts` | `reconcileObservedGateResult(...)` | observed transcript/state -> `Promise<MetaReviewGateResult>` | persisted human gate route parse | New threshold routes must reconcile from transcript without false transition errors | P1 | required-now | T7 |
| CS7 | `src/v11/application/converged/convergedFinalizationMetadata.ts` | `resolveMetaReviewRouteRecommendation`, `resolveMetaReviewRouteStatus` | route -> string | fallback route mapping | Threshold routes map to truthful recommendation/status | P1 | required-now | T8 |
| CS8 | `src/v11/application/converged/convergedFinalizationEvents.ts` | `emitConvergedFinalizationEvents(...)` | finalization input -> `Promise<void>` | lifecycle event metadata emission | New routes must flow unchanged into routed/human-gate lifecycle events | P1 | required-now | T8, T10 |
| CS9 | `src/v11/application/metaReview/metaReviewCommandContract.ts`, `src/v11/shared/metaReview/metaReviewCommandSubmitRouting.ts`, `src/v11/application/metaReview/metaReviewSubmitRenderers.ts` | submit result typing, finalization, and rendering | routed result -> `MetaReviewSubmitResult` -> rendered text | submit result route exposure | Existing `gate_route` surface must accept the new union without hidden fallback in result or rendered output | P1 | required-now | T9, T11 |
| CS10 | `src/v11/shared/metrics/report/{aggregate,types,aggregateSupport,format}.ts`, `src/v11/infrastructure/artifact/metrics/report/report.ts` | route aggregation and report assembly | metrics events -> report output | route key inventory | New threshold routes counted and rendered through the real aggregator/report entrypoint | P1 | required-now | T10 |

### 2) Data and Interface Contract

| Contract | Current | Target | Required Fields | Optional Fields | Compatibility | Priority | Timing |
|---|---|---|---|---|---|---|---|
| Gate route union | Existing 7-route union | Additive 9-route union | `human_gate_threshold_not_met`, `human_gate_threshold_unresolved` | none | additive | P1 | required-now |
| Threshold decision input | recommendation + budget only | recommendation + budget + normalized minimum + threshold authority outcome | `recommendation`, `budgetAvailable`, `minSeverity`, `authority.status` | `highestOpenSeverity`, diagnostics | internal additive | P1 | required-now |
| Human gate persisted rationale | route only, plus existing run_failed metadata | Route + explicit threshold rationale metadata with summary as human-readable fallback | kozos minimum: `meta_review_gate_route`, `latest_recommendation`, `meta_review_gate_threshold_status`, `meta_review_gate_reason_code`; tovabbi kotelezo compare mezok a `human_gate_threshold_not_met` route mellett: `meta_review_gate_threshold_min_severity`, `meta_review_gate_threshold_highest_open_severity` | summary fallback only | additive | P1 | required-now |
| Submit result route exposure | existing `gate_route` union follows current route set | additive 9-route union | `gate_route` | none | additive | P1 | required-now |
| Converged route fallback | existing route switch | expanded route switch | truthful recommendation/status per new route | none | additive | P1 | required-now |
| Metrics route counts | 7 counted human/auto routes | 9 counted human/auto routes | both new threshold routes | none | additive | P1 | required-now |

Normative rules:

1. `human_gate_threshold_not_met` jelentese fix:
   a meta-review recommendation `rework`, budget van, a threshold authority `resolved`, de a `highestOpenSeverity` nem eri el a configured minimumot.
2. `human_gate_threshold_unresolved` jelentese fix:
   a meta-review recommendation `rework`, budget van, de a threshold authority `unresolved` vagy `incomplete`, ezert auto rework fail-closed tiltott.
3. Mindket uj threshold-human-gate route recommendationje `rework`.
4. Mindket uj threshold-human-gate route statusa `success`, mert a gate routing truthfully es szandekosan emberi kezbe adja at a dontest; ez nem runtime crash vagy append hiba.
5. A threshold-human-gate `APPROVAL_REQUEST` metadata kozos minimum key-setje:
   - `meta_review_gate_route`
   - `latest_recommendation`
   - `meta_review_gate_threshold_status`
   - `meta_review_gate_reason_code`
   Summary text maradhat human-readable fallback, de nem lehet az egyetlen canonical threshold rationale.
6. A `human_gate_threshold_unresolved` route mellett explicit reason/status ertekpar kotelezo a kozos key-seten belul:
   - `meta_review_gate_reason_code = REVIEW_POLICY_THRESHOLD_SOURCE_UNRESOLVED | REVIEW_POLICY_THRESHOLD_CONTEXT_INCOMPLETE`
   - `meta_review_gate_threshold_status = unresolved | incomplete`
7. A `human_gate_threshold_not_met` route mellett a kozos key-set mellett explicit compare metadata kotelezo:
   - `meta_review_gate_reason_code = REVIEW_POLICY_AUTO_REWORK_THRESHOLD_NOT_MET`
   - `meta_review_gate_threshold_status = not_met`
   - `meta_review_gate_threshold_min_severity`
   - `meta_review_gate_threshold_highest_open_severity`
8. A `auto_rework` route comparison successe nem igenyel uj human-gate metadata key-setet.
9. `auto_rework` csak akkor maradhat route, ha:
   - recommendation `rework`,
   - budget available,
   - authority `resolved`,
   - `highestOpenSeverity` >= configured minimum.
10. A `human_gate_budget_exhausted` route tovabbra sem hasznalhato threshold alatti esetre.
11. A `human_gate_inconclusive` route tovabbra sem hasznalhato `rework` recommendation mellett.
12. A `human_gate_dispatch_failed` route tovabbra is tenyleges append/rollback hiba reservelt route.

### 3) Side Effects Contract

| Area | Allowed | Forbidden | Notes | Priority | Timing |
|---|---|---|---|---|---|
| Gate routing | Threshold-aware route valasztas a finalize pathban | Recommendation-only auto rework | Phase 2 core delivery | P1 | required-now |
| Transcript append | Truthful `APPROVAL_REQUEST` threshold-human-gate route-tal | Fals route metadata vagy auto-rework append unresolved authority mellett | Persisted envelope a canonical proof | P1 | required-now |
| State transition | Human gate vagy auto rework state transition a route szerint | RUNNING resume threshold gate elott | Current optimistic guards maradnak | P1 | required-now |
| Metrics | Route-count inventory bovites | New route elhallgatasa vagy unknown-kent elejtese | Additive consumer alignment | P1 | required-now |

Constraint:
ha nincs resolved threshold authority, az implementation nem kuldhet `APPROVAL_DECISION` rework envelope-ot az implementernek.

### 4) Error and Fallback Contract

| Trigger | Dependency (if any) | Behavior (`throw|result|fallback`) | Fallback Value/Action | Reason Code | Log Level | Priority | Timing |
|---|---|---|---|---|---|---|---|
| Threshold authority `unresolved` | findings artifact / parity chain | fallback | `human_gate_threshold_unresolved` + exact threshold metadata keys | `REVIEW_POLICY_THRESHOLD_SOURCE_UNRESOLVED` | warn | P1 | required-now |
| Threshold authority `incomplete` | artifact severity parse | fallback | `human_gate_threshold_unresolved` + exact threshold metadata keys | `REVIEW_POLICY_THRESHOLD_CONTEXT_INCOMPLETE` | warn | P1 | required-now |
| Threshold resolved but below minimum | policy compare | result | `human_gate_threshold_not_met` + exact compare metadata keys | `REVIEW_POLICY_AUTO_REWORK_THRESHOLD_NOT_MET` | info | P1 | required-now |
| Threshold resolved and met | policy compare | result | `auto_rework` | none | info | P1 | required-now |
| Transcript append failure | append port | throw | existing rollback flow | existing dispatch/rollback reason code | error | P1 | required-now |

### 5) Dependency Constraints

| Type | Items | Priority | Timing |
|---|---|---|---|
| must-use | `normalizeBubbleReviewPolicy`, `resolveMetaReviewGateThresholdAuthority`, existing parity validation flow, existing `persistHumanGateRoute` / `dispatchAutoRework` seams | P2 | required-now |
| must-not-use | reviewer snapshot severity fallback, approval envelope metadata severity fallback, metrics/converged derived severity fallback, new config producer seam | P2 | required-now |

### 6) Test Matrix

| ID | Scenario | Assertions | Priority |
|---|---|---|---|
| T1 | `rework + budget + threshold met` | route `auto_rework`, implementer decision appended, state resumed, auto_rework_count incremented | P1 |
| T2 | `rework + budget + threshold not met` | route `human_gate_threshold_not_met`, no implementer decision append, human approval request appended | P1 |
| T3 | `rework + budget + authority unresolved` | route `human_gate_threshold_unresolved`, no auto rework, shared threshold metadata key-set present with `REVIEW_POLICY_THRESHOLD_SOURCE_UNRESOLVED` / `unresolved` values | P1 |
| T3b | `rework + budget + authority incomplete` | route `human_gate_threshold_unresolved`, no auto rework, shared threshold metadata key-set present with `REVIEW_POLICY_THRESHOLD_CONTEXT_INCOMPLETE` / `incomplete` values | P1 |
| T4 | Route union / resolver tests | New routes compile and resolver mapping does not corrupt existing branches | P1 |
| T5 | Human gate persistence | New routes accepted, sticky/default semantics explicit, approval request persisted | P1 |
| T6 | Approval envelope metadata | Threshold routes carry truthful route metadata, preserve `latest_recommendation=rework`, and emit the exact threshold key-set | P1 |
| T7 | Observation reconcile | Transcript replay rehydrates both new threshold routes from `READY_FOR_HUMAN_APPROVAL` | P1 |
| T8 | Converged fallback metadata | New routes map to `recommendation=rework`, `status=success` | P1 |
| T9 | Contract runner | Meta-review gate contract snapshots accept new route vocabulary | P1 |
| T10 | Metrics report | New routes appear in counts and table formatting output through the real aggregator/report entrypoint | P1 |
| T11 | Meta-review submit result | Existing `gate_route` result surface accepts the new route union without renderer fallback changes | P1 |

## Acceptance Evidence

1. Gate finalize tests bizonyitjak, hogy recommendation-only auto rework megszunt.
2. Persisted approval request envelope-bol visszaolvashato a truthful threshold-human-gate route, beleertve az `unresolved` es `incomplete` fail-closed indokok kulon bizonyitasat.
3. Converged metadata es metrics report ugyanazt az additive route truthot mutatja.
4. A Phase 1 authority resolverhez nem kerul uj fallback source.

## Hardening Backlog

1. `later-hardening`: ha a threshold rationale metadata key-set stabilizalodik a gyakorlatban, erdemes kulon shared helperbe emelni, hogy az approval envelope es a kapcsolodo tesztek ne inline metadata-shape-re epuljenek.
2. `later-hardening`: ha a submit/render route exposure operatori jelentosege no, a text-renderer copy explicit threshold-route wordinget is kaphat a jelenlegi raw route-string megjelenites helyett.
3. `later-hardening`: ha a metrics route family tovabb bovul, erdemes kulon route-inventory contract tesztet tartani az aggregator/report formatter par felett, hogy az uj route-ok ne csak fixture-report szinten legyenek vedve.
