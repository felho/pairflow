---
artifact_type: task
artifact_id: task_runtime_review_policy_status_live_only_projection_phase3d_v1
title: "Runtime Review Policy Status Live-Only Projection (Phase 3D)"
status: implementable
phase: phase3d
target_files:
  - src/v11/shared/status/statusCommandViewBuilder.ts
  - tests/core/bubble/statusBubble.test.ts
prd_ref: null
plan_ref: plans/archive/plans/runtime-review-policy-reset-and-phasing-plan-v1.md
system_context_ref: docs/pairflow-initial-design.md
normative_refs:
  - plans/archive/plans/runtime-review-policy-reset-and-phasing-plan-v1.md
  - plans/archive/tasks/runtime-review-policy/runtime-review-policy-reviewer-bypass-contract-phase3a.md
  - plans/archive/tasks/runtime-review-policy/runtime-review-policy-reviewer-bypass-activation-post-cutover-phase3b.md
  - plans/archive/tasks/runtime-review-policy/runtime-review-policy-reviewer-bypass-residual-runtime-alignment-phase3c.md
  - docs/pairflow-initial-design.md
owners:
  - "felho"
---

# Task: Runtime Review Policy Status Live-Only Projection (Phase 3D)

## Current Codebase Check (2026-04-28)

1. A current `status` detail local es started-remote path ugyanabba a projection seambe fut be:
   - `src/v11/shared/status/statusCommandViewBuilder.ts`
   - a local es remote builder egyarant unconditional `reviewPolicy` runtime view-t rak a detail payloadba.
2. A current runtime view `buildRuntimeAlignedReviewPolicyRuntimeView(...)` helperre epul:
   - `src/v11/shared/reviewPolicy/reviewPolicyRuntime.ts`
   - ha a meta-only activation current runtime authorityval nem bizonyithato, a helper fail-closed `effective_loop_mode="full"` + `support_status="guarded"` eredmenyt ad.
3. A meta-review human-gate transition current tree-ben tudatosan eltakaritja az aktiv runtime authorityt:
   - `src/v11/shared/metaReviewGate/metaReviewGateStateHelpers.ts`
   - `READY_FOR_HUMAN_APPROVAL` iranyban `active_agent`, `active_role`, `active_since`, `execution_context` nullazodik.
4. A current state machine mar `WAITING_HUMAN` allapotban is execution-context-clearing familyt hasznal:
   - `src/v11/domain/state/machine.ts`
   - emiatt a "nincs mar canonical execution authority" hatar nem csak `READY_FOR_HUMAN_APPROVAL`-nal jelenik meg.
5. Emiatt a current `status` detail approval-ready vagy no-live-authority allapotban ugyanazt a runtime helper fallbacket mutatja, mint egy tenyleges runtime-unresolved helyzet:
   - operatori szemmel ez osszecsusztatja a "nincs mar live authority" es a "runtime kozben nem bizonyithato az activation" eseteket.
6. A `status` text renderer jelenleg nem rendereli ki a `reviewPolicy` blokkot:
   - `src/v11/application/status/statusCliTextRenderer.ts`
   Emiatt a konkret zavaro surface a detail JSON / UI detail read-model, nem a text renderer.
7. A detail consume oldali nullable contract mar most rendelkezesre all:
   - `BubbleStatusView.reviewPolicy` optional a status builderben
   - `UiBubbleDetail.reviewPolicy` nullable a presenterben (`entry.reviewPolicy ?? null`)
8. A broad list/read-model family szinten szinten ugyanaz a runtime helper fut:
   - `src/v11/shared/list/listCommandEntryProjection.ts`
   de ez kulon summary consume surface. A user-side problema a detail `status` projectionon jelent meg, nem a bubble listan.
9. A started-remote status support current tree-ben nem kulon remote payload contractbol, hanem local detail projection buildbol jon:
   - `src/v11/shared/status/statusCommandApi.ts` a remote snapshotot local oldalon adja at a status view buildernek.
   Ezert a remote support ugyanebben a bounded taskban megoldhato remote schema vagy SSH command contract modositas nelkul.

## L0 - Policy

### Goal

1. A `status` detail `reviewPolicy` blokkja legyen explicitten live-runtime projection, ne pedig kvazi historical vagy config-echo surface.
2. Ha a bubble allapota mar olyan human-gate vagy utana kovetkezo allapotban van, ahol a canonical runtime authority tudatosan le lett zarva, a `status` detail ne probaljon aktualis `effective_loop_mode` truthot mutatni.
3. A rendszer ne irja ki ezeken az allapotokon a felrevezeto `effective_loop_mode="full"` fallbacket pusztan azert, mert mar nincs mit runtime oldalon bizonyitani.
4. A local es started-remote detail status ugyanazt a live-only applicability szabalyat kovesse.
5. Ez a follow-up ne vezessen be historical/materialized route mezot, es ne redefinialja a mar lezarult Phase 3A/3B runtime vocabularyt.

### Context

1. A reviewer-bypass activation tenylegesen materializalodhat implementer `PASS` soran, mikozben egy kesobbi approval-ready status mar nem tudja ezt live authoritybol visszavezetni.
2. Ez nem onmagaban activation bug, hanem status-szemantikai keveredes:
   - a helper fail-closed runtime truthot akar mutatni,
   - a human-gate allapot viszont mar nem runtime routing-kerdes.
3. A tisztabb operatori szemantika ebben a slice-ban:
   - active runtime alatt maradjon a current runtime-aligned review-policy view,
   - human-gate utani no-live-authority status detailben a `reviewPolicy` blokk ne jelenjen meg aktiv truthkent.

### In Scope

1. A detail `status` local projection applicability szabalyanak pontos rogzitse.
2. A detail `status` started-remote projection ugyanilyen applicability igazitasanak rogzitse.
3. A human-gate / post-human-gate state-family explicit felsorolasa erre a taskra.
4. Celzott regresszios tesztek:
   - local approval-ready detail status,
   - started-remote approval-ready detail status,
   - valamint egy active runtime baseline megorzes.

### Out Of Scope

1. Bubble list summary vagy broad read-model family alignment.
   - `src/v11/shared/list/**`
2. Shared `reviewPolicyRuntime` helper semantics ujranyitasa.
3. Historical vagy materialized review-route surfaceles.
4. `bubble.toml` config surface, `review-policy` mutation/readback vagy UI action contract redesign.
5. CLI text renderer tartalmi ujratervezese.
6. Remote executor / SSH status payload contract modositas.

### Safety Defaults

1. Active runtime ownershipu allapotokban a current runtime-aligned `reviewPolicy` viselkedes valtozatlan maradjon.
2. Human-gate / post-human-gate allapotban a rendszer ne essen vissza synthetic `full` truth-ra csak authority-hiany miatt.
3. Ez a task nem olvashat historical truthot transcriptbol, cache-bol vagy approval artifactbol.
4. A policy config tovabbra is kulon surface marad:
   - `bubbleToml`
   - dedikalt review-policy read/update flow
5. A remote support ugyanabban a detail projection layerben zaruljon le; ne nyisson kulon remote status contract follow-upot.

### Contract Boundary / Blast Radius

1. `contract_boundary_override`: `yes`
2. Erintett contractok:
   - detail `status` read-model `reviewPolicy` presence/applicability contract
   - UI detail consume compatibility contract
   - compatibility-preserving shared detail read-contract narrowing
3. `file_disjoint_parallel_bubble_guard`:
   - ebben a taskban nem celpont a `src/v11/shared/list/**` family
   - nem celpont a `src/v11/shared/reviewPolicy/**` shared runtime helper semantics ujranyitasa sem

## L1 - Change Contract

### Target-File Reality Check

1. A current detail local es started-remote status ugyanazon file ket builder agan all ossze:
   - `buildLocalBubbleStatusView(...)`
   - `buildRemoteBubbleStatusView(...)`
2. A remote support scoped szinten itt zarhato le, mert a remote started path mar most is local projection builden megy at; nem kell kulon remote payloadot boviteni.
3. A `BubbleStatusView.reviewPolicy` mar ma is optional, es a UI detail presenter mar most `null`-ra mapeli a hianyzo erteket.
4. Emiatt a bounded delta megoldhato a current type-shape megorzese mellett:
   - nincs szukseg uj enumra,
   - nincs szukseg kulon applicability reason mezore,
   - de a detail read-contract publikus jelenlet-szemantikaja ettol meg tenylegesen szukul.
5. A broad list summary ugyanazt a helper runtime truthot consume-olja, de az mar kulon read-model family; ha a helper kozponti semantics-e valtozna, ez a task azonnal kiszelesedne.
6. A jelen task primary ownershipa emiatt status-detail consumer-family alignment, nem shared runtime helper redesign.

### Control Model

1. `business_invariant`
   - a detail `status` nem allithat aktualis live review-loop truthot olyan allapotban, ahol a canonical runtime authority mar tudatosan le lett zarva.
2. `control_model`
   - a detail `status.reviewPolicy` blokk live-runtime projection.
   - nem historical evidence, nem config echo, es nem approval-gate recap.
3. `read_path_rule`
   - live-authority family -> existing `buildRuntimeAlignedReviewPolicyRuntimeView(...)`
   - no-live-authority family -> `reviewPolicy` ne keruljon be a detail payloadba
4. `forbidden_fallback`
   - no-live-authority familyben tilos `effective_loop_mode="full"` runtime fallbacket mutatni pusztan authority-hiany miatt.
   - tilos transcript- vagy envelope-derived historical route-tal pótolni ezt az infot.
5. `allowed_resolution_path`
   - ha az operator a configured policy-t akarja latni, azt a `bubbleToml` vagy a dedikalt review-policy surface adja.
   - a detail `status` itt csak a live applicabilityrol dont.
6. `missing_data_rule`
   - live-authority family + unresolved/invalid runtime proof -> current guarded/full baseline megmarad
   - no-live-authority family -> `reviewPolicy` null/absent

### Closed-Contract Drift Check

1. `source_anchors`
   - `plans/archive/tasks/runtime-review-policy/runtime-review-policy-reviewer-bypass-contract-phase3a.md`
   - `plans/archive/tasks/runtime-review-policy/runtime-review-policy-reviewer-bypass-activation-post-cutover-phase3b.md`
   - `src/v11/shared/reviewPolicy/reviewPolicyRuntime.ts`
   - `src/v11/shared/metaReviewGate/metaReviewGateStateHelpers.ts`
   - `src/v11/shared/status/statusCommandViewBuilder.ts`
2. `canonical_elements`
   - `requested_loop_mode`
   - `effective_loop_mode`
   - `support_status`
   - meta-only activation proven/unresolved runtime logic a shared helper ownershipaban marad
3. `guard_elements`
   - `REVIEW_POLICY_META_ONLY_ACTIVATION_UNRESOLVED`
   - `blocked_prerequisites`
   - `provenance_note`
   Ezek tovabbra is ervenyes runtime guard adatok, de csak akkor, ha a detail surface tenyleg live runtime projectiont mutat.
4. `compat_elements`
   - `BubbleStatusView.reviewPolicy` optional
   - `UiBubbleDetail.reviewPolicy` nullable
5. `closed_terms`
   - `runtime-aligned`
   - `activation proven`
   - `guarded`
   - `full`
   - `meta_only`
6. `forbidden_reinterpretations`
   - a task nem ertelmezheti ujra az `effective_loop_mode` mezot historical truthkent
   - a task nem tolhatja at a list summary familyre ugyanezt a semantics-dontest implicit modon
7. `drift_status`
   - `no_drift_if_status_detail_only_suppresses_live_projection_when_runtime_authority_is_intentionally_absent`

### Authority Fan-out Scan

1. `authority_producer`
   - out of scope
2. `persisted_authority`
   - existing bubble state + `bubbleToml`
3. `internal_execution_consumers`
   - out of scope
4. `workflow_orchestration_consumers`
   - out of scope
5. `read_model_consumers`
   - `status` detail JSON
   - UI detail presenter consume path
6. `cleanup_recovery_consumers`
   - out of scope
7. `shared_contract note`
   - a current type-shape shared marad, de a detail status read-contract jelenlet-szemantikaja szukul

Task classification:
1. Primary: `activation_or_read_model`
2. Secondary: nincs

### Shared Contract Compatibility Gate

1. Current consumers inventory:
   - `status` detail JSON / command output payload
   - UI detail presenter (`reviewPolicy ?? null`)
   - CLI text renderer jelenleg nem rendereli ezt a blokkot
2. Additive vs breaking:
   - a change nem breaking type-shape valtozas
   - de compatibility-preserving shared detail read-contract narrowing, mert bizonyos state familyben a blokk hianyzik, nem synthetic fallbackkel toltodik ki
3. Alignment scope:
   - ebben a taskban csak detail `status`
   - list/UI summary alignment, ha kesobb kell, kulon successor

### Closure-Budget Gate

1. Touched closure buckets:
   - `shared_contract`
   - `read_model_consumers`
2. Explicitly not touched:
   - `authority_producer`
   - `internal_execution_consumers`
   - `workflow_orchestration_consumers`
   - `persisted_authority_or_schema`
   - `cleanup_recovery_consumers`
3. Split decision:
   - egytaskos closure vedheto
   - a shared contract hatas itt a detail status consume familyre korlatozott, type-shape migrate nelkul
   - a shared helper vagy list family bevonasa mar kulon successor trigger lenne

### Bounded-Task-Shape Gate

1. Primary shape:
   - `activation_or_read_model`
2. Why this shape fits:
   - a task nem activation truthot termel, hanem annak operatori/detail applicability surfacet szukiti arra az esetre, amikor mar nincs live runtime authority

### Complexity Risk Gate

1. `authority_risk`: 1
2. `surface_spread`: 1
3. `identity_join_risk`: 0
4. `activation_coupling`: 1
5. `prerequisite_risk`: 0
6. `acceptance_multiplicity`: 1
7. `risk_score`: 4/18
8. `split_decision`: keep single bounded task
9. `why_not_split_more`:
   - local es remote detail ugyanazon builder familyben zarul
   - list/helper/history surface bevonasa nelkul a blast radius alacsony marad

### No-Live-Authority Applicability Contract

1. A jelen taskban a `reviewPolicy` detail blokkot el kell rejteni a kovetkezo state familyben:
   - `WAITING_HUMAN`
   - `READY_FOR_HUMAN_APPROVAL`
   - `APPROVED_FOR_COMMIT`
   - `COMMITTED`
   - `DONE`
2. A szabaly alapja nem pusztan a state-nev, hanem az authority shape:
   - ha a detail status mar nem tud canonical live runtime review-policy authorityt projekciokent mutatni, a blokk absent/null
3. A fenti state family ebben a current tree slice-ban a no-live-authority family explicit felsorolasa.
4. Ezeket a state-eket ebben a slice-ban egyutt kell kezelni, mert:
   - a live runtime authority kerdes ekkor mar lezart vagy nem relevans operatori runtime routing truthkent
   - az operator mar nem kovetkezo runtime route-rol, hanem emberi/commit progressionrol nez statuszt
   - `WAITING_HUMAN` ebben a taskban nem marad compat-kivetel
5. A kovetkezo state familyben a current runtime-aligned reviewPolicy projection marad:
   - `CREATED`
   - `PREPARING_WORKSPACE`
   - `RUNNING`
6. `FAILED` es `CANCELLED` ebben a taskban valtozatlanul marad:
   - ezeknel kulon diagnosztikai decision kellene, amely ezt a bounded taskot kiszelesitene
7. A local es started-remote detail ugyanazt a state-family applicability szabalyat kovesse.

### Call-Site Matrix

| ID | File | Function/Entry | Contract delta | Priority | Timing | Evidence |
|---|---|---|---|---|---|---|
| CS1 | `src/v11/shared/status/statusCommandViewBuilder.ts` | `buildLocalBubbleStatusView(...)` | a local detail payload csak live-authority state-familyben adjon `reviewPolicy` blokkot; a taskban definialt no-live-authority familyben hagyja el azt | P1 | required-now | T1, T2, T3 |
| CS2 | `src/v11/shared/status/statusCommandViewBuilder.ts` | `buildRemoteBubbleStatusView(...)` | a started-remote detail payload ugyanazt az applicability szabalyat kovesse a remote snapshot state alapjan, remote schema modositas nelkul | P1 | required-now | T4, T5 |
| CS3 | `tests/core/bubble/statusBubble.test.ts` | regression coverage | explicit proof kell local `WAITING_HUMAN`, local approval-ready, started-remote no-live-authority es active-runtime baseline esetre | P1 | required-now | T1-T5 |

### Data / Interface Contract

| Contract | Current | Target | Required Fields | Optional Fields | Compatibility | Priority | Timing |
|---|---|---|---|---|---|---|---|
| Detail `status.reviewPolicy` presence | current gyakorlatban always present | authority-family dependent | live-authority familyben existing runtime view | no-live-authority familyben absent/null | compatibility-preserving within existing optional/nullable consume path | P1 | required-now |
| No-live-authority status semantics | guarded/full fallback jelenik meg authority-hiany miatt | nincs live `reviewPolicy` blokk | authority-family classification, state-family mapping | none | compatibility-preserving shared detail read-contract narrowing | P1 | required-now |
| Live-authority unresolved semantics | guarded/full fail-closed | valtozatlan | existing runtime helper fields | diagnostics | preserve | P1 | required-now |
| Started-remote detail support | same helper fallback jelenik meg | ugyanaz az omission rule, local builderben | remote snapshot `state` | existing remoteExecution fields | preserve remote payload contract | P1 | required-now |

#### Normative rules

1. A detail `status.reviewPolicy` blokk jelentese ebben a follow-upban:
   - live runtime review-policy projection
   - nem historical route evidence
   - nem config echo
2. Ha a detail status a task altal definialt no-live-authority familybe esik, a `reviewPolicy` blokk ne szerepeljen a detail payloadban.
3. A rendszer ezekben az allapotokban ne emiteljen synthetic `effective_loop_mode="full"` fallbacket csak azert, mert az activation mar nem bizonyithato live authorityval.
4. Live-authority state-familyben az existing runtime helper semantics marad:
   - meta-only activation proven -> `meta_only`
   - unresolved/invalid/unavailable -> guarded/full
5. A task nem vezetheti be azt a szabalyat, hogy historical transcript vagy approval artifact alapjan vissza kell tolteni a detail `reviewPolicy` blokkot.
6. A task nem modosithatja a bubble list summary semantics-et.
7. A task nem nyithat uj `not_applicable` enumot vagy kulon applicability reason mezot.
8. A configured review policy tovabbra is elerheto mas source-bol:
   - `bubbleToml`
   - dedikalt review-policy surfaces

### Error and Fallback Contract

| Trigger | Dependency | Behavior | Fallback / Action | Reason Code | Log Level | Priority | Timing |
|---|---|---|---|---|---|---|---|
| detail status state no-live-authority family | state snapshot | omit `reviewPolicy` from detail payload | operator a configot `bubbleToml`-bol vagy review-policy surface-bol nezheti | none | info | P1 | required-now |
| live-authority state + unresolved activation | existing runtime helper | guarded/full view marad | current fail-closed baseline | existing helper reason codes | info | P1 | required-now |
| live-authority state + invalid runtime state snapshot | existing runtime helper | guarded/full view marad | current fail-closed baseline | existing helper reason codes | warn | P1 | required-now |
| started-remote detail + no-live-authority state | remote snapshot state | omit `reviewPolicy` without touching remote payload schema | local projector handles applicability | none | info | P1 | required-now |

## L2 - Delivery

### Implementation Sketch

1. Vezess be status-detail szintu applicability dontest a status view builderben, ne a shared runtime helperben.
2. A dontes authority-first predicate-re epuljon, amelybol a current-tree state family explicitten levezetett.
3. A local es remote detail builder ag ugyanazt a predicate-et vagy azzal ekvivalens helyi logikat hasznalja.
4. Ne bovitsd a remote snapshot contractot es ne modositsd a list projectiont.

### Test Matrix

| ID | Scenario | Setup | Expectation |
|---|---|---|---|
| T1 | local `WAITING_HUMAN` + meta-only config | local state snapshot no-live-authority familyben, cleared `execution_context`-tal | `status.reviewPolicy` absent/null |
| T2 | local `READY_FOR_HUMAN_APPROVAL` + meta-only config | local state snapshot no-live-authority familyben, cleared runtime authorityval | `status.reviewPolicy` absent/null |
| T3 | local live-authority runtime + unresolved meta-only activation | running state invalid/unresolved authorityval | current guarded/full `reviewPolicy` marad |
| T4 | started-remote no-live-authority snapshot | remote status snapshot `WAITING_HUMAN` vagy `READY_FOR_HUMAN_APPROVAL` stateben | `status.reviewPolicy` absent/null, remoteExecution megmarad |
| T5 | started-remote live-authority unresolved baseline | remote `RUNNING` snapshot runtime missing vagy unresolved activationnal | current guarded/full `reviewPolicy` marad |

### Acceptance Criteria

1. A detail `status` a taskban definialt no-live-authority familyben nem ad `reviewPolicy` blokkot.
2. A local es started-remote detail ugyanazt a visibility szabalyat koveti.
3. `WAITING_HUMAN` ebben a taskban nem marad kivetel; a no-live-authority family resze.
4. Live-authority state familyben a jelenlegi runtime-aligned review-policy semantics valtozatlan marad.
5. A task nem erinti a list summary familyt.
6. A task nem vezet be historical/materialized route surfacet.
7. A regresszios tesztek explicitten bizonyitjak az authority-first/state-family splitet.

### Verification

1. Futtasd:
   - `pnpm test -- tests/core/bubble/statusBubble.test.ts`
2. Ha a status-detail projectionhez kotodo typecheck/lint oldalon regresszio latszik, futtasd a relevans:
   - `pnpm lint`
   - `pnpm typecheck`

### Notes for Successor Tasks

1. Ha kesobb operatori igeny lesz arra, hogy a no-live-authority state familyben is latszodjon valamilyen review-policy summary, azt kulon follow-upnak kell kezelni:
   - vagy config-echo surface-kent,
   - vagy historical/materialized route surface-kent,
   de nem ennek a live-only tasknak a csendes kiterjesztesekent.
2. Ha a bubble list summaryre is ugyanez a semantics kell, az kulon read-model successor, mert jelen task tudatosan nem nyitja ujra a list familyt.
