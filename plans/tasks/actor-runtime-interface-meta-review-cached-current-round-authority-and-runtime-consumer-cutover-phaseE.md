---
artifact_type: task
artifact_id: task_actor_runtime_interface_meta_review_cached_current_round_authority_and_runtime_consumer_cutover_phaseE_v1
title: "Actor Runtime Interface Meta-Review Cached Current-Round Authority and Runtime Consumer Cutover (Phase E)"
status: implementable
phase: phaseE
target_files:
  - src/types/bubble.ts
  - src/v11/domain/state/initialState.ts
  - src/v11/shared/metaReview/metaReviewSnapshot.ts
  - src/v11/shared/metaReview/metaReviewCommandSubmitPersistence.ts
  - src/v11/shared/metaReviewGate/metaReviewGateShared.ts
  - src/v11/shared/metaReviewGate/metaReviewGateSnapshotHelpers.ts
  - src/v11/shared/metaReviewGate/metaReviewGateRunResultArtifacts.ts
  - src/v11/shared/metaReviewGate/metaReviewGateStateStaging.ts
  - src/v11/shared/metaReviewGate/metaReviewGateStateHelpers.ts
  - src/v11/shared/metaReviewGate/metaReviewGateCurrentRunFinalization.ts
  - src/v11/shared/state/stateSchemaAuthorityChecks.ts
  - src/v11/application/converged/convergedFinalizationMetadata.ts
  - src/v11/application/converged/convergedFinalizationEvents.ts
  - tests/core/state/stateSchema.test.ts
  - tests/core/bubble/metaReview.test.ts
  - tests/core/bubble/metaReviewGate.test.ts
  - tests/contracts/v11/metaReviewSubmitCoverage.test.ts
  - tests/v11/application/converged/convergedFinalization.test.ts
  - tests/v11/shared/metaReviewGate/metaReviewGateStateStaging.test.ts
prd_ref: null
plan_ref: plans/actor-runtime-interface-discovery-and-migration-plan-v1.md
system_context_ref: docs/pairflow-initial-design.md
owners:
  - "felho"
---

# Task: Actor Runtime Interface Meta-Review Cached Current-Round Authority and Runtime Consumer Cutover (Phase E)

## Current Codebase Check (2026-04-11)

1. A canonical submit duplicate guard ma meg a torlendo cached `last_autonomous_report_ref` + `last_autonomous_updated_at` snapshot-ablakra tamaszkodik.
2. A gate/finalization helper-ek egy resze ma meg cached state-hidratalassal allit elo human-gate fallback vagy recovered run-result payloadot.
3. A RUNNING meta-review authority validator ma meg a cached last-run snapshot jelenletevel engedi at a partial recovery/allapot-visszaolvasasi eseteket.
4. A converged finalization telemetry ma meg fallbackkent kozvetlenul `state.meta_review.last_autonomous_*` mezokbol olvas recommendation/status adatot.
5. Emiatt a cached mezok fizikai torlese nem lehet az elso foundation lepes: elobb explicit current-round, live-only authority/runtime contract kell a fenti rejtett consumer seams helyere.

## Executive Summary

1. Ez a Phase E elso foundation taskja.
2. A cel, hogy a runtime belso mukodese mar ne a cached last-run snapshotra tamaszkodjon, hanem egy explicit current-round, live-only authority/runtime szerzodesre.
3. Ennek reszekent a task bevezet egy `submit_receipt` jellegu current-round receipt mezot a `meta_review` live state-be, amely duplicate-submit es recovery/allapot-validacios celra hasznalhato, de nem retained last-run projection.
4. A task emellett atallítja a gate fallback, a run-result synthesis es a converged telemetry rejtett consumerjeit explicit current-run inputokra.
5. A fizikai `last_autonomous_*` mezotores kulon, kesobbi task marad; ez a task annak elofeltetele.

## L0 - Policy

### Goal

Valtsa ki a cached `last_autonomous_*` allapotfuggosegeket egy explicit current-round, live-only meta-review authority/runtime contracttal, amely lehetove teszi a kesobbi fizikai field-removalt.

### In Scope

1. Current-round `submit_receipt` live field bevezetese a `meta_review` state-be.
2. A canonical submit duplicate guard atallítasa a current authority + receipt szerzodesre.
3. A gate/finalization/recovered run-result synthesis cached snapshot-fuggosegenek megszuntetese.
4. A RUNNING meta-review authority validator atallítasa a current-round live contractra.
5. A converged finalization telemetry fallback atallítasa explicit current-run inputokra vagy route-semantikara.
6. A fenti valtozasok regresszios tesztjei.

### Out of Scope

1. A cached `last_autonomous_*` mezok fizikai torlese a type/schema/write shape-bol.
2. Approval source-of-truth transcriptre allitasa.
3. Status/list projection cleanupja.
4. Public CLI/read-stack removal.
5. Workflow, UI vagy docs cleanup.

### Safety Defaults

1. A `submit_receipt` live-only current-round marker; nem retained last-run snapshot.
2. A `submit_receipt` kizárólag duplicate-submit, recovery/allapot-validacios es current-round routing-parity celra hasznalhato.
3. A task nem vezethet be uj retained recommendation/status/summary/report snapshot mezoket.
4. A gate vagy telemetry fallback inkabb legyen explicit `inconclusive` vagy route-derived, mint cached state-olvasas.
5. A public read-model vagy operator projection ebben a taskban nem nohet.

### Contract Boundary / Blast Radius

1. `contract_boundary_override`: `yes`
2. Erintett contractok:
   - bubble state live authority/runtime contract,
   - meta-review submit duplicate guard contract,
   - meta-review gate/current-run synthesis contract,
   - converged lifecycle event metadata contract.

### Complexity Risk Gate

1. `authority_risk`: `2`
2. `surface_spread`: `1`
3. `identity_join_risk`: `1`
4. `activation_coupling`: `0`
5. `prerequisite_risk`: `1`
6. `acceptance_multiplicity`: `1`
7. `risk_score`: `6`
8. `single-task allowed`: `yes`
9. Identity/join note:
   - canonical identity path: active `meta_review.execution_context` -> matching `submit_receipt`
   - competing identifiers or fallback identities: cached `last_autonomous_*` snapshot window
10. Authority/source-of-truth note:
   - canonical source: current-round execution context + live submit receipt + explicit `MetaReviewResult`
   - forbidden secondary sources: persisted cached recommendation/status/report snapshot

## L1 - Change Contract

### 1) Call-site Matrix

| ID | File | Function/Entry | Exact Signature (args -> return) | Insertion Point | Expected Behavior | Priority | Timing | Evidence |
|---|---|---|---|---|---|---|---|---|
| CS1 | `src/types/bubble.ts`, `src/v11/domain/state/initialState.ts` | `BubbleMetaReviewSubmitReceiptState`, `BubbleMetaReviewSnapshotState`, `createInitialBubbleState` | type/state shape -> type/state shape | live meta-review state definition | A `meta_review` state kapjon explicit live-only `submit_receipt` mezot. A receipt minimum current-round identityt hordozzon: `handoff_id`, `round`, `attempt`, `run_id`, `submitted_at`. | P1 | required-now | type + compile |
| CS2 | `src/v11/shared/metaReview/metaReviewSnapshot.ts`, `src/v11/shared/metaReview/metaReviewCommandSubmitPersistence.ts` | `normalizeMetaReviewSnapshot(...)`, `clearLiveMetaReviewSnapshot(...)`, `hasCanonicalSubmitForActiveMetaReviewRound(...)`, `writeCanonicalSubmitState(...)` | existing helpers -> updated helpers | canonical submit seam | A duplicate-submit guard a cached snapshot helyett az aktiv `execution_context` + matching `submit_receipt` alapjan mukodjon. A canonical submit state write ezt a receiptet irja, es a same-round retry fail-closed maradjon. | P1 | required-now | core tests |
| CS3 | `src/v11/shared/metaReviewGate/metaReviewGateShared.ts`, `src/v11/shared/metaReviewGate/metaReviewGateSnapshotHelpers.ts`, `src/v11/shared/metaReviewGate/metaReviewGateRunResultArtifacts.ts`, `src/v11/shared/metaReviewGate/metaReviewGateStateStaging.ts`, `src/v11/shared/metaReviewGate/metaReviewGateStateHelpers.ts`, `src/v11/shared/metaReviewGate/metaReviewGateCurrentRunFinalization.ts` | gate/finalization helpers | existing helpers -> updated helpers | current-run gate seam | Human-gate fallback, recovered run-result synthesis es current-run finalization explicit `MetaReviewResult` vagy explicit fallback input alapjan dolgozzon; ne olvassa vissza a cached last-run snapshotot a state-bol. Az uj round stage resetelje a current-round receiptet. | P1 | required-now | core tests |
| CS4 | `src/v11/shared/state/stateSchemaAuthorityChecks.ts` | meta-review RUNNING authority validation helpers | existing helpers -> updated helpers | state authority validation | A RUNNING meta-review authority validator ne a cached run snapshotra tamaszkodjon. Ha partial recovery/allapot-visszaolvasasi eset engedelyezett marad, azt csak active `execution_context` + matching current-round `submit_receipt` vagy azzal ekvivalens explicit live contract alapjan fogadhatja el. | P1 | required-now | schema tests |
| CS5 | `src/v11/application/converged/convergedFinalizationMetadata.ts`, `src/v11/application/converged/convergedFinalizationEvents.ts` | `buildMetaReviewRoutedMetadata(...)`, human-gate lifecycle event metadata builders | existing builders -> updated builders | converged telemetry seam | Recommendation/status fallback ne olvasson `state.meta_review.last_autonomous_*` mezokbol. Forras csak explicit `metaReviewRun`, gate route semantics, vagy fail-closed/default `inconclusive` lehet. | P1 | required-now | converged tests |
| CS6 | `tests/core/state/stateSchema.test.ts`, `tests/core/bubble/metaReview.test.ts`, `tests/core/bubble/metaReviewGate.test.ts`, `tests/contracts/v11/metaReviewSubmitCoverage.test.ts`, `tests/v11/application/converged/convergedFinalization.test.ts`, `tests/v11/shared/metaReviewGate/metaReviewGateStateStaging.test.ts` | regression coverage | tests -> tests | authority/runtime regression matrix | A coverage explicitten fogja a current-round receipt contractot, a duplicate-submit parityt, a gate fallback snapshotmentes mukodeset, a RUNNING validator uj guardjat es a converged telemetry cached-state mentes fallbackjat. | P1 | required-now | automated tests |

### 2) Data and Interface Contract

| Contract | Current | Target | Required Fields | Optional Fields | Compatibility | Priority | Timing |
|---|---|---|---|---|---|---|---|
| `state.meta_review.submit_receipt` | nincs explicit current-round receipt | live-only current-round receipt | `handoff_id`, `round`, `attempt`, `run_id`, `submitted_at` | none | additive internal contract | P1 | required-now |
| Same-round canonical submit dedupe | cached `report_ref` + `updated_at` active-window inference | active execution-context + matching current-round receipt | active `execution_context` identity + matching `submit_receipt` | runtime diagnostics | breaking internal source-of-truth correction | P1 | required-now |
| Gate/recovery run-result synthesis | cached snapshot state-hydration | explicit `MetaReviewResult` / fallback-input synthesis | `metaReviewRun` or `fallbackRecommendation`; `fallbackSummary`; `nowIso` | artifact warnings | breaking internal helper contract | P1 | required-now |
| Converged routed metadata | `metaReviewRun` or cached state fallback | `metaReviewRun` or route/default fallback | route; explicit `metaReviewRun` if present | warning reason codes | breaking internal telemetry contract | P1 | required-now |

### 3) Side Effects Contract

| Area | Allowed | Forbidden | Notes | Priority | Timing |
|---|---|---|---|---|---|
| Live meta-review state | `submit_receipt` bevezetese es resetelese | uj retained recommendation/status/report snapshot mezok | receipt nem public read-model | P1 | required-now |
| Duplicate-submit guard | current-round receipt-alapu fail-closed guard | cached snapshot-ablak tovabbelesztese uj nev alatt | explicit live identity kell | P1 | required-now |
| Gate/runtime synthesis | explicit input contract | cached state-hydration recommendation/status/summary/report miatt | ez a kesobbi field-removal elofeltetele | P1 | required-now |
| Converged telemetry | route- vagy runResult-alapu fallback | state `last_autonomous_*` fallback | nincs silent state leak | P1 | required-now |

### 4) Error and Fallback Contract

| Trigger | Dependency (if any) | Behavior (`throw|result|fallback`) | Fallback Value/Action | Reason Code | Log Level | Priority | Timing |
|---|---|---|---|---|---|---|---|
| Same-round submit retry with matching current-round receipt | active execution context + latest state reread | throw | fail closed | `META_REVIEW_STATE_INVALID` | warn | P1 | required-now |
| State conflict utan a latest state mar nem hordoz ervenyes active meta-review authorityt | state reread | throw | no retry-as-success inference | `META_REVIEW_STATE_INVALID` or existing round/state mismatch | warn | P1 | required-now |
| Gate fallbacknak nincs explicit runResultje | current-run gate helper input | fallback | route/default `inconclusive` + explicit fallback summary; nincs cached state read | N/A | info | P1 | required-now |
| Converged metadata buildernek nincs explicit runResultje | gate route only | fallback | route-derived or default `inconclusive`; nincs cached state read | N/A | info | P1 | required-now |

### 5) Dependency Constraints

| Type | Items | Priority | Timing |
|---|---|---|---|
| must-use | active `meta_review.execution_context` mint canonical current-round identity | P1 | required-now |
| must-use | explicit live `submit_receipt` mint duplicate-submit es recovery parity marker | P1 | required-now |
| must-use | explicit `MetaReviewResult` / fallback helper input a gate synthesishez | P1 | required-now |
| must-not-use | cached `last_autonomous_report_ref` + `last_autonomous_updated_at` submit guard | P1 | required-now |
| must-not-use | `state.meta_review.last_autonomous_*` telemetry fallback | P1 | required-now |
| must-not-use | uj retained last-run snapshot bag a receipt helyett | P1 | required-now |

### 6) Test Matrix

| ID | Scenario | Given | When | Then | Priority | Timing | Evidence |
|---|---|---|---|---|---|---|---|
| T1 | Same-round duplicate submit stays fail-closed on current-round receipt | active meta-review execution context es mar rairt matching `submit_receipt` | masodik canonical submit ugyanarra a roundra erkezik | `META_REVIEW_STATE_INVALID` hiba jon, cached snapshot-inference nelkul | P1 | required-now | automated test |
| T2 | New round staging clears prior current-round receipt | elozo round submit_receipt mar jelen van | uj meta-review RUNNING authority stage-elodik | az uj RUNNING state receiptje `null`, es nincs stale duplicate block | P1 | required-now | automated test |
| T3 | Gate fallback no longer hydrates from cached snapshot | helper explicit fallback inputtal fut, cached fields lehetnek barmik vagy hianyozhatnak | human-gate vagy recovered result synthesis fut | a payload explicit inputbol epul, nem state snapshotbol | P1 | required-now | automated test |
| T4 | RUNNING validator no longer needs cached last-run snapshot | RUNNING meta-review recovery/allapot-visszaolvasasi fixture | state validation fut | csak az explicit current-round live contract szerint megy at vagy bukik meg | P1 | required-now | automated test |
| T5 | Converged telemetry no longer reads cached state fallback | gate resultben nincs cached state recommendation/status | finalization event metadata epul | recommendation/status explicit runResultbol vagy route/default fallbackbol jon | P1 | required-now | automated test |

## L2 - Implementation Notes (Optional)

1. [later-hardening] A `submit_receipt` elnevezes kesobb ujragondolhato, ha a Phase E removal utan pontosabb current-run nomenklatura alakul ki.

## Assumptions

1. A duplicate-submit es recovery parity current-round live receipt contracttal lezárható uj public read-model nelkul.

## Open Questions

1. Nincs blocker open question.

## Hardening Backlog (Optional)

| ID | Item | Layer | Priority | Timing | Source | Proposed Action |
|---|---|---|---|---|---|---|
| H1 | esetleges terminology cleanup a current-round receipt nev korul | L2 | P2 | later-hardening | task authoring | csak a teljes cached removal utan erdemes nyitni |

## Review Control

1. Every finding must include: `priority`, `timing`, `layer`, `evidence`.
2. Max 2 L1 hardening rounds.
3. After round 2, new `required-now` is allowed only for evidence-backed `P0/P1`.
4. Items outside L1 blocker scope must be tagged `later-hardening`.
5. If `contract_boundary_override=yes`, `plan_ref` is mandatory and must align with L1 contract rows.

## Spec Lock

Mark task as `IMPLEMENTABLE` when all `P0/P1 + required-now` items are closed, es a runtime mar nem hasznalja a cached `last_autonomous_*` snapshotot duplicate-submit, gate fallback, state validation vagy converged telemetry source-kent.
