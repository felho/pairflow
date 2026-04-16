---
artifact_type: task
artifact_id: task_actor_runtime_interface_phaseE2c_persisted_diagnostics_meta_review_read_model_fallout_v1
title: "Actor Runtime Interface Persisted Diagnostics, Meta-Review, and Read-Model Fallout Closure (Phase E2c)"
status: completed
phase: phaseE2c
target_files:
  - src/types/bubble.ts
  - src/v11/shared/state/stateSchemaMetaReviewRuntime.ts
  - src/v11/infrastructure/state/stateSnapshotInspection.ts
  - src/v11/shared/metaReview/metaReviewSnapshot.ts
  - src/v11/shared/metaReviewGate/metaReviewGateTypes.ts
  - src/v11/shared/metaReviewGate/metaReviewGateApply.ts
  - src/v11/shared/metaReviewGate/metaReviewGateApplyPersistence.ts
  - src/v11/shared/metaReviewGate/metaReviewGateStateStaging.ts
  - src/v11/application/metaReviewGate/metaReviewGateNotify.ts
  - src/v11/application/metaReviewGate/metaReviewGatePaneBinding.ts
  - src/v11/shared/status/statusCommandViewProjection.ts
  - src/v11/application/status/statusCliTextRenderer.ts
  - src/v11/application/status/statusCliTableRenderer.ts
  - src/v11/shared/list/listCommandContract.ts
  - src/v11/shared/list/listCommandApi.ts
  - src/v11/shared/ports/uiRouter.ts
  - tests/v11/shared/metaReview/metaReviewSnapshot.test.ts
  - tests/v11/shared/metaReviewGate/metaReviewGateStateStaging.test.ts
  - tests/contracts/v11/metaReviewSubmitCoverage.test.ts
  - tests/core/human/approval.test.ts
  - tests/core/bubble/listBubbles.test.ts
  - tests/core/bubble/statusBubble.test.ts
  - tests/cli/bubbleStatusCommand.test.ts
  - tests/core/ui/bubblePresenter.test.ts
prd_ref: null
plan_ref: plans/actor-runtime-interface-discovery-and-migration-plan-v1.md
system_context_ref: docs/pairflow-initial-design.md
owners:
  - "felho"
---

# Task: Actor Runtime Interface Persisted Diagnostics, Meta-Review, and Read-Model Fallout Closure (Phase E2c)

Target file interpretation:
1. A `target_files` lista a persisted diagnostic contract, a meta-review gate observation/write seam, es a status/list/UI projection ownership surfacet rogziti, nem a teljes helper-halozatot.
2. A reszletes implementation closure es a currently-known consumer inventory authoritative listaja a lenti L1 call-site matrixben marad.
3. Ez a task current-tree successor az `E1`/`E2a`/`E2b` merge utan; nem nyithatja ujra az authority foundationt vagy a generic delivery/launch producer es direct consume closure-t.

## Current Codebase Check (2026-04-15)

1. A current tree-ben az `E1` mar explicit execution-scoped authorityt enforce-ol (`execution_id` a canonical actor emit es persisted `execution_context` resze), es az `E2a`/`E2b` mar lezarta a generic typed delivery/launch ack truthot, illetve annak direct runtime/orchestration consume-family alignmentjet.
2. A persisted/read-model fallout ennek ellenere kulon, tovabb elo contract marad a `meta_review.runtime_delivery` blokkban: a `src/types/bubble.ts`, `src/v11/shared/state/stateSchemaMetaReviewRuntime.ts`, `src/v11/shared/metaReviewGate/metaReviewGateTypes.ts` es `src/v11/infrastructure/state/stateSnapshotInspection.ts` ma is `confirmed|uncertain|failed` observational statuszokra epiti ezt a diagnostic surface-t.
3. A meta-review gate write path ma tobb helyen osztja szet ezt a persisted diagnostic producer-seamet: a `src/v11/application/metaReviewGate/metaReviewGateNotify.ts` es `metaReviewGatePaneBinding.ts` allit elo `MetaReviewRuntimeDeliveryObservation` eredmenyt, amit a `src/v11/shared/metaReviewGate/metaReviewGateApply.ts` es `metaReviewGateApplyPersistence.ts` ir vissza `state.meta_review.runtime_delivery` alakban.
4. A status/list/UI read-model surfaces mar most is explicit same-authority correlationon keresztul olvasnak (`resolveActiveMetaReviewRuntimeDelivery`), de a contract closure nincs egy taskban rogzitve: a `src/v11/shared/status/statusCommandViewProjection.ts`, `src/v11/shared/list/listCommandApi.ts`, `src/v11/shared/list/listCommandContract.ts`, `src/v11/shared/ports/uiRouter.ts`, valamint a status CLI rendererek tovabbra is ezt a persisted diagnostic blokkot projekciozzak.
5. A design doc explicit current policyje szerint a `meta_review.runtime_delivery` nem authority, hanem observability-only diagnostic block, amely csak akkor surfacelheto, ha correlation fields alapjan meg mindig az aktiv execution contexthez tartozik (`docs/pairflow-initial-design.md` meta-review authority szakasz, kulonosen a 9-14. pontok).
6. Emiatt a fennmarado `E2c` scope mar nem generic runtime ack producer munka, hanem a persisted diagnostic producer + meta-review projection + status/list/UI read-model fallout closure ugyanazon same-authority chainen belul.

### Assumption Lock

1. Ez a task arra a current-tree baseline-ra epul, hogy az `E1`, `E2a` es `E2b` mar merged predecessor, es ezek authority/producer/direct-consume dontesei nem revisitalhatok itt.
2. A `meta_review.runtime_delivery` surface current-tree retained diagnostic surface; az `E2c` ezt a current-tree baseline-on lockolja es szukiti, es ebben a taskban nem nevezi at uj canonical runtime contractta.
3. Ha implementacio kozben kiderul, hogy a listed target/read-model consumers valamelyike megis generic runtime ack truthra tamaszkodik, az `PHASEE2C_SCOPE_BREACH`-kent kezelendo es visszadelegalando predecessor/successor taskba, nem local reinterpretation.
4. Az `E3`/`E4` successorok ownershipje valtozatlan: pilot activation, broad rollout, retained adapter cleanup es remove-trigger execution nem hozhato elore pusztan azert, mert ugyanazt a diagnostic blokkot olvassak.
5. A task csak a current plan/task traceabilityban nevezett surfacesre tamaszkodhat; ad hoc uj public status/list/UI truth source nem vezetheto be "compatibility" indokkal.

## L0 - Policy

### Goal

1. Zarja le a `meta_review.runtime_delivery` persisted diagnostic contractot a current `E1`/`E2a`/`E2b` baseline felett.
2. Tegye explicitte, hogy ez a blokk tovabbra is non-authority, observability-only projection marad, nem generic typed ack vagy submit authorization truth.
3. Allitsa egybe a meta-review gate observation/write seamt es a status/list/UI read-model consume seameket ugy, hogy stale vagy uncorrelated diagnostics ne szivarogjanak vissza canonical workflow truthkent.

### Domain / Control Model Summary

1. Business invariant: a canonical workflow authority es a submit success-path tovabbra is a top-level `execution_context` + current-round durable handoff/result chainen marad; a `meta_review.runtime_delivery` csak diagnostic projection lehet.
2. Control model:
   - generic delivery/launch truth producer mar predecessorben lezart (`E2a`),
   - a jelen task a meta-review-specific observational projection produceret owns-olja (`MetaReviewRuntimeDeliveryObservation` -> persisted `meta_review.runtime_delivery`),
   - ez a producer nem irhatja felul a canonical runtime/submit authorityt.
3. Read-path rule:
   - status/list/UI/inspection csak `resolveActiveMetaReviewRuntimeDelivery`-vel ekvivalens same-authority correlationon at surfacelheti a persisted diagnostic blokkot,
   - raw persisted `runtime_delivery` correlation nelkul nem olvashato read-model truthkent.
4. Forbidden fallback:
   - pane activity, session liveness vagy raw tmux allapot nem lehet submit/approval authority,
   - stale `runtime_delivery` nem jelenhet meg aktiv diagnostic truthkent,
   - a `confirmed|uncertain|failed` observational statuses nem nevezhetok at canonical `accepted|rejected|running|failed_to_start` runtime truthra explicit contract update nelkul.
5. Allowed resolution path:
   - a meta-review gate observation producer tovabbra is megtarthatja a `confirmed|uncertain|failed` diagnostic vocabularyt, ha explicit ugyanazon authority chainhez van kotve,
   - a persisted diagnostic blokk read-modelben csak aktiv correlation mellett jelenhet meg,
   - correlation hianya eseten a diagnostic blokk `null`-ra zuhanhat anelkul, hogy ez canonical workflow hibat jelentene.
6. Missing-data rule:
   - ha nincs aktiv `meta_review.execution_context`, vagy a persisted diagnostic correlation fieldjei nem egyeznek, akkor a status/list/UI projection `runtimeDelivery=null`,
   - a canonical submit/approval path ettol nem tilthato le automatikusan; a diagnostic hiany csak observability-hiany.
7. Phase boundary:
   - contract closure: owned here a persisted diagnostic + read-model contracton
   - producer closure: generic runtime ack truth predecessor (`E2a`), meta-review diagnostic observation producer owned here
   - internal_execution_closure: predecessor (`E2b`) a generic direct consume familyre; owned here csak a meta-review gate write/correlation path
   - workflow_orchestration_closure: owned here csak a meta-review gate diagnostic persistence/projection boundaryn
   - read_model_closure: owned here
   - activation_closure: successor (`E3`)
   - cleanup_recovery_closure: successor (`E4`)

### Authority Boundary Map

1. `authority_producer`
   - top-level `execution_context` es generic typed ack producer: predecessor (`E1`, `E2a`)
   - meta-review diagnostic observation producer: `src/v11/application/metaReviewGate/metaReviewGateNotify.ts`, `src/v11/application/metaReviewGate/metaReviewGatePaneBinding.ts`, `src/v11/shared/metaReviewGate/metaReviewGateApply.ts`
2. `persisted_authority`
   - `state.meta_review.runtime_delivery`
   - `src/v11/shared/state/stateSchemaMetaReviewRuntime.ts`
   - `src/v11/infrastructure/state/stateSnapshotInspection.ts`
3. `internal_execution_consumers`
   - `src/v11/shared/metaReview/metaReviewSnapshot.ts`
   - `src/v11/shared/metaReviewGate/metaReviewGateApplyPersistence.ts`
4. `workflow_orchestration_consumers`
   - meta-review gate apply flow
   - approval/meta-review submit parity surfaces ott, ahol `runtime_delivery` archival-vs-active semantics relevans
5. `read_model_consumers`
   - `src/v11/shared/status/statusCommandViewProjection.ts`
   - `src/v11/application/status/statusCliTextRenderer.ts`
   - `src/v11/application/status/statusCliTableRenderer.ts`
   - `src/v11/shared/list/listCommandApi.ts`
   - `src/v11/shared/list/listCommandContract.ts`
   - `src/v11/shared/ports/uiRouter.ts`
6. `cleanup_recovery_consumers`
   - broader retained adapter es rollout cleanup tovabbra is successor (`E4`)

### Baseline Preservation

1. Must-preserve behaviors:
   - `meta_review.runtime_delivery` tovabbra is non-authority diagnostic block marad,
   - csak aktiv handoff/round correlation mellett surfacelheto,
   - `status`/`list`/UI read-model maradjon narrowed projection, ne mutasson historical cached blockot,
   - canonical `pairflow agent emit --kind meta_review_result` authorization ne fuggjon a pane-binding freshnessetol.
2. Allowed resolution paths:
   - `MetaReviewRuntimeDeliveryObservation` -> persisted `runtime_delivery` -> `resolveActiveMetaReviewRuntimeDelivery` -> read-model projection,
   - stale diagnostic = `null` projection ugyanazon authority chainen.
3. Forbidden regression interpretations:
   - a persisted diagnostic blokk nem valhat generic ack truth projectionneve,
   - a read-model nem surfacelhet raw persisted `runtime_delivery`-t same-authority guard nelkul,
   - a task nem nyithat implementer pilot, reviewer rollout vagy retained adapter cleanup munkat.
4. Replacement proof required if removed:
   - ha a `confirmed|uncertain|failed` diagnostic vocabulary vagy a correlation fields valtoznak, explicit replacement proof kell status/list/UI/test szinten ugyanebben a taskban.

### In Scope

1. A `BubbleMetaReviewRuntimeDeliveryState` / `MetaReviewRuntimeDeliveryObservation` contract explicit current-tree closure-ja.
2. A meta-review gate observation producer es persisted write path alignmentje.
3. A state schema/inspection es `resolveActiveMetaReviewRuntimeDelivery` semantic lockja.
4. A status/list/UI router/CLI read-model consume alignment ugyanennek a diagnostic contractnak a menten.
5. A kapcsolodo contract/core/UI tesztek alignmentje.

### Out of Scope

1. Generic delivery/launch producer contract vagy direct runtime/orchestration consume-family tovabbi atirasa.
2. Implementer pilot activation (`E3`).
3. Reviewer + meta-reviewer broad rollout / retained adapter cleanup (`E4`).
4. Uj top-level authority source vagy role-specific actor API.
5. Altalanos UI redesign a meglovo projection contracton tul.

### Safety Defaults

1. Ha a persisted diagnostic contract es a canonical runtime truth kozott feszules van, a canonical truth marad az authority, a diagnostic projection pedig inkabb `null` vagy explicit observational state legyen.
2. A tasknak preferalnia kell a semantic alignmentet a vocabulary churn helyett; ne vezessen be uj status tokeneket, ha a current design explicitten non-authority diagnostic blockot ir elo.
3. A read-model surfaces ne dobjanak hibara stale diagnostic miatt; stale esetben projection-null a preferalt fail-closed read-model viselkedes.

### Success Criteria

1. Az implementalo a dokumentumbol egyertelmuen le tudja vezetni, hogy melyik seam producer/persistence/read-model ownership es melyik mar predecessor vagy meg successor scope.
2. A task explicitten tiltja, hogy a `confirmed|uncertain|failed` diagnostic statusokbol canonical submit/approval/runtime truth legyen consumer-inventory szintu replacement proof nelkul.
3. A dependency edges dokumentumszinten eleg szorosak ahhoz, hogy az `E2c` implementacio ne claimelhessen `E2a` producer redesign, `E2b` direct consume reopen, `E3` activation vagy `E4` cleanup closure-t.
4. A task-level implementability lock explicitten megtartja a `T1`-`T6` implementation proof inventoryt, mikozben a docs-only handoff szabaly kulon csak a jelen pass skip-claim summaryjat korlatozza.
5. A status/list/UI es inspection seams ugyanarra a same-authority stale-null szabalyra vannak kotve, nem renderer- vagy adapter-local fallbackre.

### Contract Boundary / Blast Radius

1. `contract_boundary_override`: `yes`
2. Erintett contractok:
   - `BubbleMetaReviewRuntimeDeliveryState`
   - `MetaReviewRuntimeDeliveryObservation`
   - status/list/UI meta-review runtime-delivery projection contract

### Complexity Risk Gate

1. `authority_risk`: `1`
2. `surface_spread`: `2`
3. `identity_join_risk`: `1`
4. `activation_coupling`: `0`
5. `prerequisite_risk`: `1`
6. `acceptance_multiplicity`: `2`
7. `risk_score`: `7`
8. `single-task allowed`: `yes`
9. Split note:
   - a generic runtime producer es direct consume closure mar predecessorben le van zarva,
   - ez a task csak a meta-review-specific persisted diagnostic producer + read-model fallout closure-t owns-olja,
   - pilot activation es broad cleanup tovabbra is successor.
10. Identity/join note:
   - canonical identity path: active `meta_review.execution_context` + `observed_for_handoff_id` + `observed_for_round`
   - competing identifiers or fallback identities: pane visibility, session liveness, raw persisted `runtime_delivery`, operatori megfigyeles
11. Authority/source-of-truth note:
   - canonical source: top-level `execution_context` + same-authority correlated persisted diagnostic projection
   - forbidden secondary sources: uncorrelated runtime delivery snapshot vagy pane-derived submit truth

## L1 - Change Contract

### 0) Domain / Control Contract

| Item | Rule | Implementation Consequence | Priority | Timing |
|---|---|---|---|---|
| Business invariant | `meta_review.runtime_delivery` diagnostic only, nem authority. | Submit/approval/status nem kezelheti canonical control source-kent. | P1 | required-now |
| Control model | A persisted diagnostic producer a meta-review gate observation chain. | `Notify`/`PaneBinding`/`Apply` ugyanarra a semantic contractra alljon. | P1 | required-now |
| Read-path rule | Read-model projection csak active correlation mellett mutathat `runtime_delivery`-t. | Status/list/UI surfaces `null`-ra ejtik a stale diagnostikot. | P1 | required-now |
| Forbidden fallback | Nincs raw persisted snapshot, pane activity vagy session liveness mint submit truth. | Projection helpersben explicit same-authority guard kotelezo. | P1 | required-now |
| Allowed resolution path | `confirmed|uncertain|failed` maradhat observational vocabulary. | A task semantic lockot ad, nem kenyszerit vocabulary churnt. | P1 | required-now |
| Missing-data rule | Hianyzo vagy mismatched correlation -> `runtimeDelivery=null`. | Read-model fail-closed, workflow authority untouched. | P1 | required-now |
| Phase boundary | Ez a task persisted diagnostic + read-model fallout closure. | Generic runtime consume, activation es cleanup successor/predecessor scope marad. | P1 | required-now |

### 0a) Shared Contract Compatibility

| Shared Contract | Current Consumers | Change Type (`additive|breaking|N/A`) | This Task Action | Deferred Alignment |
|---|---|---|---|---|
| `BubbleMetaReviewRuntimeDeliveryState` | schema, inspection, snapshot helper, status/list/UI contracts | `N/A` semantic lock preferred | preserve outer shape, explicit same-authority semantics es stale-null rule | `E4` only if later cleanup removes the surface |
| `MetaReviewRuntimeDeliveryObservation` | meta-review gate notify/pane binding/apply | `N/A` semantic lock preferred | explicit mapping + reason-code discipline same taskban | none |
| status/list/UI runtimeDelivery projection | status/list/uiRouter contracts, CLI renderers, presenters | `N/A` public shape preserved preferred | keep narrowed view, no raw persisted leak | later UI redesign only |

### 0b) Sequencing / Closure Order

| Step | Why this order is mandatory | Owned here | Must stay deferred |
|---|---|---|---|
| 1. Persisted diagnostic contract lock | Eloszor azt kell rogziteni, mit jelent a `runtime_delivery` blokk a current tree-ben. | `src/types/bubble.ts`, `src/v11/shared/state/stateSchemaMetaReviewRuntime.ts`, `src/v11/shared/metaReviewGate/metaReviewGateTypes.ts` | generic producer/consume closure ujranyitasa |
| 2. Meta-review gate producer/write alignment | A persisted diagnostic blokkot egyetlen same-authority chainnek kell eloallitani. | `metaReviewGateNotify.ts`, `metaReviewGatePaneBinding.ts`, `metaReviewGateApply.ts`, `metaReviewGateApplyPersistence.ts` | pilot activation |
| 3. Read-model projection alignment | A narrowed status/list/UI projections csak a lezart diagnostic contract utan vedhetok. | `metaReviewSnapshot.ts`, `stateSnapshotInspection.ts`, `statusCommandViewProjection.ts`, `listCommandApi.ts`, `uiRouter.ts`, CLI rendererek | retained adapter cleanup |
| 4. Regression lock | A task nem claimelhet tobbet annal, mint amit a persisted diagnostic + read-model seams bizonyitanak. | listed tests | `E3`, `E4` closure claim |

Normative sequencing rules:

1. A meta-review gate observation producernek explicitten ugyanabba a persisted diagnostic contractba kell irnia, amelyet a read-model consume-oldal olvas.
2. A status/list/UI projection csak `resolveActiveMetaReviewRuntimeDelivery`-vel ekvivalens same-authority guardon keresztul olvashat.
3. Ha a producer oldalon `runtime_delivery` nem korrelalhato az aktiv execution contexthez, a read-model nem surfacelheti "best effort" modon.
4. A task nem nevezheti at a diagnostic statuses-t canonical runtime ack statusokra a teljes consumer inventory explicit alignmentje nelkul.

### 0c) Traceability Lock

| Source | Binding requirement for this task | Why it matters |
|---|---|---|
| `plans/actor-runtime-interface-discovery-and-migration-plan-v1.md` | Az `E2c` a persisted diagnostics / meta-review / read-model fallout closure. | Megakadalyozza, hogy a task generic runtime consume vagy pilot activation workbe csusszon. |
| `plans/tasks/actor-runtime-interface-pilot-cutover-phaseE.md` | `E2c` csak `E2b` merge utan nyithato. | A task nem allithat producer truthot vagy direct consume closure-t sajat predecessorkent. |
| `plans/tasks/actor-runtime-interface-direct-runtime-orchestration-consumer-alignment-phaseE2b.md` | Generic direct consume closure mar lezart predecessor. | Az `E2c` nem nyithatja ujra kickoff/pass/converged/start/restart canonical truthjat. |
| `docs/pairflow-initial-design.md` meta-review authority szakasz | `runtime_delivery` observability-only block, active correlation gate-tel. | Ez a control-model baseline. |
| current code helper: `src/v11/shared/metaReview/metaReviewSnapshot.ts` | Same-authority correlation helper preserved baseline. | Ez a read-path lock, nem ad hoc renderer-local fallback. |

### 0d) Dependency Edge Matrix

| Edge | Direction | Contract owned by this task? | Required handling |
|---|---|---|---|
| `E1 -> E2c` | predecessor | no | Az `execution_context` authority truth adopted baseline; nem override-olhato local diagnostic convenience miatt. |
| `E2a -> E2c` | predecessor | no | Typed delivery/launch producer truth sealed baseline; `runtime_delivery` csak meta-review-specific observational projection lehet. |
| `E2b -> E2c` | predecessor | no | A direct runtime/orchestration consume closure lezart predecessor baseline; itt csak a persisted diagnostic/read-model fallout harmonizalhato, nem a direct consume semantics ownershipje. |
| `E2c -> E3` | successor | no | Az implementer pilot activation successor-owned marad; az `E2c` legfeljebb predecessor contextet adhat a stale-null/read-model fallout closure-val. |
| `E2c -> E4` | successor | no | Broad rollout, retained adapter cleanup es eventual surface removal trigger csak explicit successor ownershipkent emlitheto. |

### 1) Call-site Matrix

| ID | File | Function/Entry | Exact Signature (args -> return) | Insertion Point | Expected Behavior | Priority | Timing | Evidence |
|---|---|---|---|---|---|---|---|---|
| CS1 | `src/types/bubble.ts`, `src/v11/shared/state/stateSchemaMetaReviewRuntime.ts` | `BubbleMetaReviewRuntimeDeliveryState`, `validateMetaReviewRuntimeDelivery` | type/schema -> type/schema | persisted diagnostic contract | A `runtime_delivery` blokk semantic contractja explicit, schema-valid es same-authority projectionra alkalmas legyen. | P1 | required-now | type/schema diff + tests |
| CS2 | `src/v11/shared/metaReviewGate/metaReviewGateTypes.ts`, `src/v11/application/metaReviewGate/metaReviewGateNotify.ts`, `src/v11/application/metaReviewGate/metaReviewGatePaneBinding.ts` | observation producer | notify/pane binding -> `MetaReviewRuntimeDeliveryObservation` | meta-review gate producer seam | A `confirmed|uncertain|failed` output es a reason-code discipline explicit current-tree contract legyen. | P1 | required-now | targeted tests |
| CS3 | `src/v11/shared/metaReviewGate/metaReviewGateApply.ts`, `src/v11/shared/metaReviewGate/metaReviewGateApplyPersistence.ts`, `src/v11/shared/metaReviewGate/metaReviewGateStateStaging.ts`, `src/v11/shared/metaReview/metaReviewSnapshot.ts` | write + correlation path | apply/persist/resolve helper -> persisted diagnostic / filtered projection | same-authority bridge | Persisted `runtime_delivery` csak aktiv correlationnal valjon olvashato projectionneve, es uj meta-review running authority stagingnel stale diagnostic ne maradjon aktiv. | P1 | required-now | targeted tests |
| CS4 | `src/v11/infrastructure/state/stateSnapshotInspection.ts` | inspectable normalization | state json -> inspectable snapshot | inspection seam | Inspection ne hidratjon vissza stale/raw diagnostic truthot aktiv read-modelle. | P1 | required-now | inspection tests |
| CS5 | `src/v11/shared/status/statusCommandViewProjection.ts`, `src/v11/application/status/statusCliTextRenderer.ts`, `src/v11/application/status/statusCliTableRenderer.ts` | status projection/render | status state -> status view/text/table | status read-model seam | Status surfaces csak aktiv, correlated runtime-delivery diagnostikot mutassanak. | P1 | required-now | status tests |
| CS6 | `src/v11/shared/list/listCommandContract.ts`, `src/v11/shared/list/listCommandApi.ts`, `src/v11/shared/ports/uiRouter.ts` | list/UI projection | state -> list/ui contracts | list/read-model seam | List/UI contracts ugyanazt a narrowed runtime-delivery viewt hordozzak, mint status. | P1 | required-now | list/UI tests |
| CS7 | listed `tests/**` | regression lock | tests -> tests | proof surfaces | A task ne claimeljen `E3`/`E4` closure-t; csak persisted diagnostic + read-model proofot. | P1 | required-now | automated tests + review evidence |

### 2) Data and Interface Contract

| Contract | Current | Target | Required Fields | Optional Fields | Compatibility | Priority | Timing |
|---|---|---|---|---|---|---|---|
| `BubbleMetaReviewRuntimeDeliveryState` | non-authority diagnostic block, de explicit task-level lock nelkul | explicit observability-only, same-authority-correlated diagnostic block | `status`, `message`, `observed_at` | `reason_code`, `observed_for_handoff_id`, `observed_for_round` | preserve outer shape if possible; backward-compatible reads toleralhatjak a hianyzo correlation field-eket, de uj producer write active-correlation claim mellett koteles mindkettot kitolteni | P1 | required-now |
| `MetaReviewRuntimeDeliveryObservation` | notify/pane binding observation result | explicit producer contract ugyanarra a persisted diagnostic blockra | `status`, `message` | `reasonCode` | preserve outer shape if possible | P1 | required-now |
| status/list/UI runtimeDelivery projection | narrowed projection helperrel, de task-level closure nelkul | explicit stale-null read-model rule | `status`, `message`, `observedAt` | `reasonCode`, `observedForHandoffId`, `observedForRound` | preserve outer shape if possible | P1 | required-now |
| inspection projection | inspectable state loads raw persisted block | inspection respects same-authority/stale semantics | canonical normalized fields | none | internal semantic tightening | P1 | required-now |

Normative correlation-field note:

1. A `observed_for_handoff_id` es `observed_for_round` mezok backward-compatible persisted readekben meg hianyozhatnak, de ez csak legacy tolerancia.
2. Ha uj meta-review diagnostic producer vagy persistence path aktiv same-authority projectiont claimel, akkor mindket correlation mezot kotelezoen ki kell toltenie.
3. Hianyzo correlation mezok ilyen uj write mellett contract-breachnek szamitanak, es a read-modelnek tovabbra is stale/null fail-closed viselkedest kell kovetnie.

### 3) Side Effects Contract

| Area | Allowed | Forbidden | Notes | Priority | Timing |
|---|---|---|---|---|---|
| Meta-review gate observation/write | mapping, reason-code normalization, persisted correlation discipline | generic runtime ack producer rewrite | only meta-review diagnostic producer here | P1 | required-now |
| Status/list/UI read-model | projection narrowing, stale-null gating, renderer wording alignment | raw persisted diagnostic read, pilot/rollout behavior | existing view shape preserved when safe | P1 | required-now |
| Schema/inspection | semantic tightening for runtime_delivery block | authority rule changes top-level `execution_context` felett | no new authority source | P1 | required-now |

Constraint:

1. Ez a task nem vezethet be uj top-level authorityt, es nem mozdithatja el a canonical submit/approval control modellt a `execution_context` + durable handoff chainrol.

### 4) Error and Fallback Contract

| Trigger | Dependency (if any) | Behavior (`throw|result|fallback`) | Fallback Value/Action | Reason Code | Log Level | Priority | Timing |
|---|---|---|---|---|---|---|---|
| stale vagy mismatched `runtime_delivery` correlation | active `execution_context` | result | `runtimeDelivery=null` a read-modelben | N/A | info | P1 | required-now |
| meta-review notify/pane binding runtime unavailable | tmux/runtime capabilities | result | persisted diagnostic `failed` status explicit reasonCode-dal, de canonical submit authority unchanged | existing `META_REVIEW_*` reason codes | warn | P1 | required-now |
| malformed persisted `runtime_delivery` block | state load/schema | throw or stateValidation | validation/inspection diagnostics, no synthetic active projection | schema validation errors | warn | P1 | required-now |
| task diff `E3`/`E4` closure-t claimelne | review boundary | throw | scope rollback a persisted diagnostic + read-model seamre | `PHASEE2C_SCOPE_BREACH` | error | P1 | required-now |

### 5) Dependency Constraints

| Type | Items | Priority | Timing |
|---|---|---|---|
| must-use | `plans/actor-runtime-interface-discovery-and-migration-plan-v1.md` | P1 | required-now |
| must-use | `plans/tasks/actor-runtime-interface-pilot-cutover-phaseE.md` | P1 | required-now |
| must-use | `plans/tasks/actor-runtime-interface-direct-runtime-orchestration-consumer-alignment-phaseE2b.md` predecessor context | P1 | required-now |
| must-use | `docs/pairflow-initial-design.md` meta-review authority/runtime_delivery rules | P1 | required-now |
| must-use | `src/v11/shared/metaReview/metaReviewSnapshot.ts` same-authority helper preserved baseline | P1 | required-now |
| must-not-use | raw `state.meta_review.runtime_delivery` read-model projection helper nelkul | P1 | required-now |
| must-not-use | diagnostic status mint canonical submit/approval authority | P1 | required-now |
| must-not-use | pilot activation vagy retained adapter cleanup scope | P1 | required-now |
| must-not-use | renderer-local vagy presenter-local fallback, amely megkeruli a shared same-authority helper baseline-t | P1 | required-now |

### 6) Test Matrix

| ID | Scenario | Given | When | Then | Priority | Timing | Evidence |
|---|---|---|---|---|---|---|---|
| T1 | runtime-delivery diagnostic only when correlation matches | active meta-review execution context + matching/non-matching `runtime_delivery` | `resolveActiveMetaReviewRuntimeDelivery` fut | csak matching handoff/round marad aktiv projection | P1 | required-now | `tests/v11/shared/metaReview/metaReviewSnapshot.test.ts` |
| T2 | schema/inspection preserves observational contract without authority promotion | valid/invalid `runtime_delivery` state snapshot | validation + inspection fut | malformed block validationt kap, stale/raw block nem lesz synthetic active truth, es uj running meta-review staging lenullazza az elozo stale diagnostikot | P1 | required-now | `tests/v11/shared/metaReview/metaReviewSnapshot.test.ts`, `tests/v11/shared/metaReviewGate/metaReviewGateStateStaging.test.ts`, state inspection tests as needed |
| T3 | meta-review gate producer emits explicit observational statuses | pane confirmed / uncertain / failed scenarios | notify + pane binding path fut | producer ugyanarra a `confirmed|uncertain|failed` contractra all, explicit reasonCode discipline-nel | P1 | required-now | targeted meta-review gate tests |
| T4 | status projection surfaces only active correlated runtime delivery | status view matching es stale diagnostic allapotokkal | status command + render fut | stale esetben `runtimeDelivery=null`, aktiv esetben narrowed projection jelenik meg | P1 | required-now | `tests/core/bubble/statusBubble.test.ts`, `tests/cli/bubbleStatusCommand.test.ts` |
| T5 | list/UI projection stays narrowed and correlation-safe | list bubble fixture runtime-deliveryvel es anelkul | list/UI presenter fut | list/UI ugyanazt a narrowed contractot projekciozza, historical diagnostic nem szivarog | P1 | required-now | `tests/core/bubble/listBubbles.test.ts`, `tests/core/ui/bubblePresenter.test.ts` |
| T6 | canonical meta-review submit path nem runtime-delivery-authorized | active execution context + missing/failed runtime_delivery | submit/approval coverage fut | submit authority tovabbra is execution-context driven, nem diagnostic-status driven | P1 | required-now | `tests/contracts/v11/metaReviewSubmitCoverage.test.ts`, `tests/core/human/approval.test.ts` |
| T7 | no `E3` / `E4` closure claim | task diff es handoff summary | review/handoff gate fut | nincs pilot activation vagy rollout/cleanup success claim | P1 | required-now | review evidence |

### 6a) Verification Notes

1. A task docs-only refinement handoffja hasznalhat `skip-claim` summaryt: ez azt jelenti, hogy a handoff nem allitja, hogy runtime checks lefutottak, es nem hivatkozik `.pairflow/evidence/*.log` fajlokra.
2. A task implementability proofja ettol fuggetlenul a `T1`-`T7` matrixban rogzitett required-now evidence inventoryra epul; ebbol a `T1`-`T6` sorok implementation proof surfaces, a `T7` pedig review/handoff boundary guard.
3. Ha kesobbi implementacio kozben a proof surface barmely pontja extra testet vagy state-inspection coverage-et igenyel, azt elsodlegesen a `T1`-`T6` implementation proof sorokhoz kell visszakotni; a `T7` tovabbra is summary/boundary ellenorzes marad, nem runtime validation helyettesitoje.
4. A done-package/PASS summary minimuma docs-only refinement esetben: mit szigoritott a task, mely dependency edge-eket lockolta expliciten, es hogy runtime validationt nem claimel.

## L2 - Implementation Notes (Optional)

1. [later-hardening] Ha a `runtime_delivery` reason-code taxonomy szetszort marad a meta-review gate producer oldalon, kulon cleanup task nyithato a vocabulary konszolidaciora, de csak ha a read-model outer shape ettol nem torik.
2. [later-hardening] Ha az `E4` retained cleanup kesobb megszunteti a surface-et, a jelen task szolgaltasson explicit remove-trigger listat a preserved-vs-removable projection elemekrol.

## Hardening Backlog (Optional)

| ID | Item | Layer | Priority | Timing | Source | Proposed Action |
|---|---|---|---|---|---|---|
| H1 | meta-review runtime-delivery reason-code taxonomy konszolidacio | L2 | P2 | later-hardening | E2c drafting | csak akkor vond ossze, ha a read-model outer shape valtozatlan marad |
| H2 | retained runtime-delivery surface remove trigger rogzitese az `E4`-hez | L1 | P2 | later-hardening | E2c drafting | kulon cleanup appendix, ha a rollout utan a surface torolheto |

## Review Control

1. Every finding must include: `priority`, `timing`, `layer`, `evidence`.
2. Ne fogadjunk el olyan `E2c` implementaciot, amely a `runtime_delivery` diagnostic blokkot canonical submit vagy approval authorityva emeli.
3. Ne fogadjunk el olyan follow-upot, amely a status/list/UI projectionban raw persisted `runtime_delivery` olvasast hagy same-authority guard nelkul.
4. Ne fogadjunk el olyan wordinget vagy summaryt, amely a `confirmed|uncertain|failed` observational statuses-t generic runtime ack success/failure contractkent allitja be explicit consumer inventory update nelkul.
5. PASS/done-package summary nem claimelhet `E3` pilot activation vagy `E4` retained cleanup closure-t.

## Spec Lock

Mark task as `IMPLEMENTABLE` when:

1. a `CS1`-`CS6` seamek explicitten ugyanarra a persisted diagnostic contractra allnak, es a task a `T1`-`T6` proof sorokat required-now implementation evidence inventorykent rogzit;
2. a task kimondja, hogy a `meta_review.runtime_delivery` observability-only, non-authority block marad;
3. a status/list/UI read-path explicit stale-null same-authority rule-t kovet;
4. a task nem huzza vissza a generic runtime producer/direct consume closure-t, es nem leap-frogol `E3`/`E4` rollout munkaba;
5. a required-now proof halmaz kulon bizonyitja a producer observation semantics-et, a persisted write/correlation lockot, a read-model narrowinget es a canonical submit authority baseline megmaradasat.
