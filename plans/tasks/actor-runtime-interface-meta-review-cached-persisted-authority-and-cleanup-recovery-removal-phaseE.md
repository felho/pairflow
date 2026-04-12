---
artifact_type: task
artifact_id: task_actor_runtime_interface_meta_review_cached_persisted_authority_and_cleanup_recovery_removal_phaseE_v1
title: "Actor Runtime Interface Meta-Review Cached Persisted Authority and Cleanup-Recovery Removal (Phase E)"
status: implementable
phase: phaseE
target_files:
  - src/types/bubble.ts
  - src/v11/domain/state/initialState.ts
  - src/v11/infrastructure/state/stateSnapshotInspection.ts
  - src/v11/shared/state/stateSchemaMetaReview.ts
  - src/v11/shared/state/stateSchemaMetaReviewAutonomous.ts
  - src/v11/shared/state/stateSchemaMetaReviewAutonomousSupport.ts
  - src/v11/shared/metaReview/metaReviewSnapshot.ts
  - src/v11/shared/metaReview/metaReviewCommandSubmitPersistence.ts
  - src/v11/shared/metaReview/liveRun/metaReviewLiveRunPersistence.ts
  - src/v11/shared/metaReviewGate/metaReviewGateSnapshotHelpers.ts
  - src/v11/shared/metaReviewGate/metaReviewGateRunResultArtifacts.ts
  - src/v11/shared/metaReviewGate/metaReviewGateStateHelpers.ts
  - src/v11/shared/metaReviewGate/metaReviewGateStateStaging.ts
  - tests/cli/agentEmitCommand.test.ts
  - tests/contracts/v11/approval.contract.runner.ts
  - tests/contracts/v11/askHuman.contract.runner.ts
  - tests/contracts/v11/metaReviewGate.contract.runner.ts
  - tests/contracts/v11/metaReviewSubmitCoverage.test.ts
  - tests/contracts/v11/watchdog.contract.runner.ts
  - tests/core/agent/converged.test.ts
  - tests/core/bubble/inboxBubble.test.ts
  - tests/core/bubble/listBubbles.test.ts
  - tests/core/bubble/metaReview.test.ts
  - tests/core/bubble/metaReviewExecutionContext.test.ts
  - tests/core/bubble/metaReviewGate.test.ts
  - tests/core/bubble/statusBubble.test.ts
  - tests/core/bubble/watchdogBubble.test.ts
  - tests/core/human/approval.test.ts
  - tests/core/human/reworkIntent.test.ts
  - tests/core/runtime/watchdog.test.ts
  - tests/core/state/stateSchema.test.ts
  - tests/core/state/stateStore.test.ts
  - tests/v11/application/actorProtocol/emitActorProtocolV11.test.ts
  - tests/v11/application/approval/approvalResultMapping.test.ts
  - tests/v11/application/approval/approvalRoutingEligibility.test.ts
  - tests/v11/application/approval/runApprovalFlow.test.ts
  - tests/v11/application/converged/convergedFinalization.test.ts
  - tests/v11/infrastructure/state/stateStore.test.ts
  - tests/v11/shared/approval/reworkIntent.test.ts
  - tests/v11/shared/metaReviewGate/metaReviewGateHumanGatePersistence.test.ts
  - tests/v11/shared/metaReviewGate/metaReviewGateStateStaging.test.ts
  - tests/v11/shared/state/stateSchema.test.ts
prd_ref: null
plan_ref: plans/actor-runtime-interface-discovery-and-migration-plan-v1.md
system_context_ref: docs/pairflow-initial-design.md
owners:
  - "felho"
---

# Task: Actor Runtime Interface Meta-Review Cached Persisted Authority and Cleanup-Recovery Removal (Phase E)

## L0 - Policy

### Goal

Szukitse le fizikailag a persisted `state.meta_review` shape-et a megmarado live authority/runtime mezokre, es allitsa at a cleanup/recovery/inspection familyt ugy, hogy removed `last_autonomous_*` mezok ne maradjanak canonical outputban vagy helper inputban.

### Domain / Control Model Summary

1. Business invariant: a canonical meta-review allapotot csak a megmarado live authority/runtime/gate mezok tarthatjak fenn; a historical cached last-run blokk nem maradhat canonical state.
2. Control model: a current meta-review allapotot a live execution/runtime contract es az explicit current-run inputok dontik el, nem a persisted `last_autonomous_*` snapshot.
3. Read-path rule: runtime, cleanup/recovery es inspect/load csak a megmarado live mezokre vagy explicit current-run artifactokra tamaszkodhat; historical input legfeljebb tolerant legacy input lehet.
4. Forbidden fallback: nincs state rehydration a removed `last_autonomous_*` mezokrol, nincs cleanup/recovery synthesis ezekbol a persisted scalarokbol.
5. Missing-data rule: ha a live authority/input nem all rendelkezesre, a path fail-closed vagy explicit neutral outputtal viselkedik; nem epul ujra cached last-run allapot.
6. Phase boundary:
   - contract closure: owned here
   - producer closure: archived prereq
   - internal execution closure: owned here
   - workflow/orchestration closure: archived prereq
   - read_model_closure: predecessor task
   - activation closure: N/A
   - cleanup/recovery closure: owned here

### Authority Boundary Map

1. Authority producer: a reviewer-parity live authority producer cutover archived prereqben le van zarva.
2. Stored authority: `BubbleMetaReviewSnapshotState` es annak writer/validator/inspection helperjei.
3. In-scope consumers: persisted authority type/schema/writer seams, cleanup/recovery helpers, inspectable normalization, a shared shape-re epulo in-repo consumers es fixturek.
4. Explicit out-of-scope consumers: public read-model surface, repo-local workflow/docs/UI copied prompt cleanup.
5. Export surfaces closed in this phase: yes; a persisted cached `last_autonomous_*` fields canonical export shape-kent bezarandoak.

### In Scope

1. A `BubbleMetaReviewSnapshotState` shape fizikai szukitese.
2. Az initial state, validatorok, writer seams es shared snapshot helper-ek igazitasai az uj shape-hez.
3. Cleanup/recovery/inspection helper-ek atallitasa explicit current-run vagy live-field inputokra.
4. Historical persisted input tolerancia megtartasa ugy, hogy a reduced canonical output ne hydrate-olja vissza a removed mezoket.
5. A shared shape-re epulo in-repo consumers es fixturek alignmentje ugyanebben a taskban.

### Out of Scope

1. Public CLI/read-model removal.
2. Repo-local workflow/README/plan/UI copied prompt wording cleanup.
3. Approval/status/list/UI source-of-truth cutover, amely mar archived prereqben zarult.
4. Barmilyen uj live meta-review state mezo bevezetese.

### Safety Defaults

1. A task nem vezethet be compatibility bridge-et vagy dual-write-ot a removed mezokre.
2. Historical state input toleralasa megengedett, de a canonical output reduced shape marad.
3. Cleanup/recovery helper inkabb explicit neutral outputot adjon, mintsem removed scalarokat hasznaljon fallback truthkent.

### Contract Boundary / Blast Radius

1. `contract_boundary_override`: `yes`
2. Erintett contractok:
   - persisted state schema contract
   - internal write contract
   - cleanup/recovery helper contract

### Complexity Risk Gate

1. `authority_risk`: `2`
2. `surface_spread`: `2`
3. `identity_join_risk`: `1`
4. `activation_coupling`: `0`
5. `prerequisite_risk`: `1`
6. `acceptance_multiplicity`: `1`
7. `risk_score`: `7`
8. `single-task allowed`: `yes`
9. If `no`, required split:
   - N/A
10. Identity/join note:
   - canonical identity path: live execution/runtime fields + explicit current-run artifact input
   - competing identifiers or fallback identities: persisted `last_autonomous_*` scalar snapshot
11. Authority/source-of-truth note:
   - canonical source: reduced live `meta_review` shape + explicit current-run helper input
   - forbidden secondary sources: removed cached scalar blokk mint canonical state vagy helper truth

## L1 - Change Contract

### 0) Domain / Control Contract

| Item | Rule | Implementation Consequence | Priority | Timing |
|---|---|---|---|---|
| Business invariant | A canonical persisted state nem tarthat removed cached last-run blokkot. | `last_autonomous_*` fields kikerulnek a canonical shape-bol. | P1 | required-now |
| Control model | Current meta-review allapotot a live authority/runtime es explicit current-run inputok dontik el. | Writer/helper/load path nem hasznalhat cached scalar fallbackot. | P1 | required-now |
| Read-path rule | Runtime es cleanup/recovery csak reduced shape-et vagy explicit artifact inputot olvashat. | No helper-level rehydration from removed fields. | P1 | required-now |
| Forbidden fallback | Removed scalarok nem maradhatnak canonical state, recovery input vagy inspectable output. | Historical input tolerance csak input-oldali lehet. | P1 | required-now |
| Missing-data rule | Live input hianya eseten fail-closed vagy explicit neutral output marad. | No synthetic reconstruction from removed fields. | P1 | required-now |
| Phase boundary | Ez a task a persisted authority + cleanup/recovery closure task. | Public read-model es repo-surface cleanup kulon marad. | P1 | required-now |

### 0a) Shared Contract Compatibility (if applicable)

| Shared Contract | Current Consumers | Change Type (`additive|breaking|N/A`) | This Task Action | Deferred Alignment |
|---|---|---|---|---|
| `BubbleMetaReviewSnapshotState` | type/schema/writer seams, cleanup/recovery helpers, in-repo fixture/test consumers | breaking | align all currently-known in-repo consumers in this task | N/A |
| Inspectable state normalization | state store inspection es diagnostics tests | breaking | keep legacy input tolerance, remove reduced-output rehydration | N/A |

### 1) Call-site Matrix

| ID | File | Function/Entry | Exact Signature (args -> return) | Insertion Point | Expected Behavior | Priority | Timing | Evidence |
|---|---|---|---|---|---|---|---|---|
| CS1 | `src/types/bubble.ts`, `src/v11/domain/state/initialState.ts`, `src/v11/shared/state/stateSchemaMetaReview*.ts` | `BubbleMetaReviewSnapshotState`, `createInitialBubbleState`, validator helpers | type/schema/defaults -> reduced shape | persisted authority contract | A canonical `meta_review` shape csak a megmarado live fields-et tartalmazza. | P1 | required-now | type + schema tests |
| CS2 | `src/v11/shared/metaReview/metaReviewSnapshot.ts`, `src/v11/shared/metaReview/metaReviewCommandSubmitPersistence.ts`, `src/v11/shared/metaReview/liveRun/metaReviewLiveRunPersistence.ts` | snapshot + writer helpers | existing writers/helpers -> reduced-shape writers/helpers | internal execution seam | A writer seams ne irjanak removed scalarokat es ne varjanak ilyen shape-et. | P1 | required-now | core tests |
| CS3 | `src/v11/shared/metaReviewGate/metaReviewGateSnapshotHelpers.ts`, `metaReviewGateRunResultArtifacts.ts`, `metaReviewGateStateHelpers.ts`, `metaReviewGateStateStaging.ts`, `src/v11/infrastructure/state/stateSnapshotInspection.ts` | cleanup/recovery/inspection helpers | helper inputs/outputs -> reduced shape or explicit current-run input | cleanup/recovery seam | A helper family ne hydrate-oljon vagy ne olvasson vissza removed scalarokat canonical outputhoz. | P1 | required-now | helper + state-store tests |
| CS4 | current in-repo shape consumers in `tests/**` listed above | fixture and contract alignment | tests -> tests | shared contract consumer seam | Az ismert in-repo consumers ne seedeljenek vagy ne varjanak canonical reduced outputban removed fields-et. | P1 | required-now | automated tests |

### 2) Data and Interface Contract

| Contract | Current | Target | Required Fields | Optional Fields | Compatibility | Priority | Timing |
|---|---|---|---|---|---|---|---|
| `state.meta_review` canonical shape | live fields + cached `last_autonomous_*` scalars | live authority/runtime/gate fields only | `execution_context`, `runtime_delivery`, `auto_rework_count`, `auto_rework_limit`, `sticky_human_gate` | none | breaking internal shape reduction | P1 | required-now |
| Submit/live-run persistence | writers emit cached last-run scalars | writers emit reduced shape only | fields above | none | breaking internal write contract | P1 | required-now |
| Cleanup/recovery helper inputs | helpers may depend on persisted cached scalar snapshot | helpers use reduced shape or explicit current-run artifact input | reduced shape fields; explicit current-run input where needed | artifact warnings | breaking helper contract | P1 | required-now |
| Inspect/load normalization | old inputs may be normalized back into cached scalar output | legacy input tolerated, reduced canonical output only | reduced shape fields | none | breaking diagnostics normalization | P1 | required-now |

### 3) Side Effects Contract

| Area | Allowed | Forbidden | Notes | Priority | Timing |
|---|---|---|---|---|---|
| Persisted state | reduced canonical writes | dual-write, fallback-write vagy retained compatibility shape | no migration bridge | P1 | required-now |
| Cleanup/recovery helpers | explicit current-run input usage, reduced output | persisted cached scalar hydrate/read fallback | helper family closure part of this task | P1 | required-now |
| Inspect/load | legacy input tolerate + reduced output normalize | removed fields visszahydratasa inspectable outputban | tolerance input-oldali marad | P1 | required-now |

Constraint: if no allowed side effects are listed above, implementation must be pure.

### 4) Error and Fallback Contract

| Trigger | Dependency (if any) | Behavior (`throw|result|fallback`) | Fallback Value/Action | Reason Code | Log Level | Priority | Timing |
|---|---|---|---|---|---|---|---|
| Historical state file removed keys-t tartalmaz | state load | result | legacy input tolerated, output reduced shape | N/A | info | P1 | required-now |
| Live input hianyzik cleanup/recovery helperben | helper input | fallback | explicit neutral output, no scalar reconstruction | N/A | info | P1 | required-now |
| In-repo shared consumer meg canonical outputban removed fields-et var | build/test | throw | consumer alignment required same taskban | N/A | error | P1 | required-now |
| Dependency failure | build/test tooling | fallback | task nem zarhato le successful evidence nelkul | DEPENDENCY_FAIL | warn | P1 | required-now |

### 5) Dependency Constraints

| Type | Items | Priority | Timing |
|---|---|---|---|
| must-use | archived reviewer-parity authority/runtime producer cutover as authority prereq | P1 | required-now |
| must-use | public read-model removal predecessor task for removed export surfaces | P1 | required-now |
| must-use | legacy-input tolerance only az explicit inspection/load seams-ben | P1 | required-now |
| must-not-use | removed `last_autonomous_*` canonical output fieldkent | P1 | required-now |
| must-not-use | helper-level reconstruction a removed scalarokbol | P1 | required-now |
| must-not-use | dual-write vagy compatibility bridge a removed mezokre | P1 | required-now |

### 6) Test Matrix

| ID | Scenario | Given | When | Then | Priority | Timing | Evidence |
|---|---|---|---|---|---|---|---|
| T1 | Initial state es validator reduced shape-et hasznal | fresh bubble state | create + validate fut | canonical `meta_review` shape nem tartalmaz removed scalarokat | P1 | required-now | automated test |
| T2 | Writer seams reduced shape-et perzisztalnak | active submit/live-run fixture | state write tortenik | persisted shape omitted removed scalarokkal ir | P1 | required-now | automated test |
| T3 | Cleanup/recovery helper nem hydrate-ol removed scalarokrol | helper explicit current-run inputtal vagy reduced shape-pel fut | gate/recovery synthesis lefut | nincs canonical output removed scalarokkal | P1 | required-now | automated test |
| T4 | Historical input toleralt, de reduced output marad | persisted fixture deprecated keys-t tartalmaz | inspect/load + rewrite fut | input toleralt, de output reduced shape | P1 | required-now | automated test |
| T5 | Shared in-repo consumers aligned with reduced shape | currently-known fixture/test consumers compile against old shape | full test matrix fut | no in-repo canonical consumer requires removed fields | P1 | required-now | automated test |
| T6 | Recovery-oriented CLI actor emit fixture reduced shape-pel is mukodik | recovery-like meta-review submit fixture | `tests/cli/agentEmitCommand.test.ts` fut | canonical recovery submit retained without cached scalar dependency | P1 | required-now | automated test |

## L2 - Implementation Notes (Optional)

1. [later-hardening] Ha a reduced shape utan a `metaReviewSnapshot` naming zavaro marad, kulon rename hygiene follow-up nyithato.

## Hardening Backlog (Optional)

| ID | Item | Layer | Priority | Timing | Source | Proposed Action |
|---|---|---|---|---|---|---|
| H1 | naming cleanup a reduced snapshot owner korul | L2 | P2 | later-hardening | task authoring | kulon rename hygiene, csak a closure utan |

## Review Control

1. Every finding must include: `priority`, `timing`, `layer`, `evidence`.
2. Max 2 L1 hardening rounds.
3. After round 2, new `required-now` is allowed only for evidence-backed `P0/P1`.
4. Items outside L1 blocker scope must be tagged `later-hardening`.
5. If `contract_boundary_override=yes`, `plan_ref` is mandatory and must align with L1 contract rows.
6. If a shared contract changes, current-consumer inventory and additive-vs-breaking classification are mandatory.
7. If an authority fan-out exists, the authority boundary map must stay consistent with the bounded task scope.

## Spec Lock

Mark task as `IMPLEMENTABLE` when all `P0/P1 + required-now` items are closed, a canonical reduced `meta_review` shape irhato/olvashato, es only the explicit legacy-input tolerance seams may still mention removed `last_autonomous_*` keys.
