---
artifact_type: task
artifact_id: task_meta_review_auto_rework_findings_timeline_v1
title: "Meta-Review Auto-Rework Findings Timeline Severity Visibility"
status: implementable
phase: phase1
target_files:
  - "src/v11/shared/metaReviewGate/metaReviewGateFindingsValidation.ts"
  - "src/v11/shared/metaReviewGate/metaReviewGateFindingsValidationParity.ts"
  - "src/v11/shared/metaReviewGate/metaReviewGateCurrentRunFinalization.ts"
  - "src/v11/shared/metaReviewGate/metaReviewGateAutoRework.ts"
  - "tests/v11/shared/metaReviewGate/metaReviewGateCurrentRunFinalization.test.ts"
  - "ui/src/components/expanded/BubbleTimeline.test.tsx"
prd_ref: docs/meta-review-gate-prd.md
plan_ref: null
system_context_ref: docs/pairflow-initial-design.md
owners:
  - "felho"
---

# Task: Meta-Review Auto-Rework Findings Timeline Severity Visibility

## L0 - Policy

### Goal

Amikor a meta-reviewer autonomous `rework` route-on keresztul `APPROVAL_DECISION` eventet ir ki az implementernek, a bubble timeline ugyanabban a sorban lassa a finding severity tageket is, ne csak a `rework` badge-et.

Celzott eredmeny:
1. a meta-reviewer auto-rework sor `P0/P1/P2/P3` tageket mutat, ha a canonical findings artifact tartalmaz ilyen findingokat,
2. a severity tagek ugyanabból a validalt findings-forrasbol jojjenek, amely a gate parity/threshold donteshez mar amugy is authority,
3. a UI ne talaljon ki severityt summarybol, countokbol vagy recommendationbol.

### Domain / Control Model Summary

1. Business invariant: a meta-reviewer timeline sor finding-visibilityje csak canonical, artifact-backed structured findingsbol johet; recommendation vagy aggregate count nem helyettesitheti a finding listat.
2. Control model: auto-rework eseten a same-run findings artifact a canonical source-of-truth a nyitott findingokrol; az `APPROVAL_DECISION.payload.findings` ennek read-model projectionje.
3. Read-path rule: `meta_review_result.report_json.findings_artifact_ref` -> validalt artifact -> auto-rework transcript envelope `payload.findings` -> UI timeline severity badge render.
4. Forbidden fallback: tilos a `findings_claimed_open_total`, `findings_blocking_open_total`, `findings_advisory_open_total`, `recommendation`, vagy `summary` alapjan synthetic findingot vagy severity taget generalni.
5. Allowed resolution path: a gate parity-validalt artifact payload ugyanabban a current-run finalize lancban atadhato az auto-rework append pontig; ha explicit `severity`-vel renderelheto finding nem nyerheto ki, akkor marad a jelenlegi `rework` decision findings nelkul.
6. Missing-data rule: ha a parity sikeres, de a findings artifactban nincs renderelheto finding (`severity + title`), a route maradhat `auto_rework`, de a rendszer nem talalhat ki UI tageket.
7. Phase boundary:
   - `workflow_orchestration_closure`: meta-review current-run finalize -> auto-rework transcript append
   - `read_model_closure`: UI timeline severity projection ugyanazon canonical findings listabol

### Canonical Contract Anchors

1. Source anchors:
   - `docs/meta-review-gate-prd.md`
   - `src/types/protocol.ts`
   - `src/v11/shared/metaReviewGate/metaReviewGateCurrentRunFinalization.ts`
   - `src/v11/shared/metaReviewGate/metaReviewGateAutoRework.ts`
   - `ui/src/components/expanded/BubbleTimeline.tsx`
2. Closed canonical elements:
   - `ProtocolEnvelopePayload.findings` mar letezo optional mező; uj protocol field nem nyithato.
   - `docs/meta-review-gate-prd.md` UI-level elvarasa: a severity/finding tagek actor-agnostic modon mukodjenek meta-reviewer findingokra is.
   - auto-rework dontes authorityja tovabbra is a meta-review gate canonical finalize pathja; a UI csak projection.
3. Forbidden reinterpretations:
   - a `rework` badge nem jelent implicit `P1` vagy mas severityt,
   - a parity metadata aggregate mezoi nem tekinthetok finding-listanak,
   - a UI nem vezetheti le a severityt a recommendation stringbol.
4. Guard elements:
   - `findings_claimed_open_total`,
   - `findings_blocking_open_total`,
   - `findings_advisory_open_total`,
   - `findings_parity_status`,
   - `recommendation`.
5. Compat elements:
   - nincs uj compat input; a task a meglevo `payload.findings` carrier mezot hasznalja tovabb.
6. Closed terms:
   - `findings artifact`,
   - `payload.findings`,
   - `auto-rework`,
   - `rework recommendation`.
7. Drift status: `clarified_without_semantic_change`.

### Scope Reality / Shape Proof

1. Inspected target-file reality:
   - `metaReviewGateAutoRework.ts` jelenleg `APPROVAL_DECISION` envelope-et ir `decision + message + metadata` payload-dal, `findings` nelkul.
   - `BubbleTimeline.tsx` mar tud severity tageket kirajzolni `entry.payload.findings` alapjan, de a jelenlegi anchor csak explicit `finding.severity` mezot fogyaszt; ez compatibility anchor, nem elsodleges mutation target.
   - `metaReviewGateFindingsValidationParity.ts` a rework artifact parityt mar validalja, de a sikeres return shape jelenleg csak metadata/diagnostics adatot visz tovabb.
   - `metaReviewGateCurrentRunFinalization.test.ts` mar rendelkezik artifact-backed auto-rework fixture-ekkel, ez a legkozelebbi bizonyitasi felulet.
2. Actual bounded scope:
   - validated findings artifact projection atvitele az auto-rework transcript eventbe,
   - bubble timeline read-model kompatibilitasanak bizonyitasa ugyanennek az existing payload mezonek a hasznalataval.
3. Hidden scope ruled out:
   - human-gate `APPROVAL_REQUEST` advisory finding contract ujranyitasa,
   - review severity ontology vagy threshold policy modositas,
   - meta-review recommendation logic valtoztatasa,
   - altalanos protocol schema bovites.
4. Bounded-task shape: primary `consumer_family_alignment` a meta-review finalize -> transcript -> timeline consume lancban. Producer vagy schema-foundation munka nincs, mert az optional `payload.findings` contract mar letezik.

### Complexity / Split Triage

1. `risk_score: 3`
2. Axis breakdown:
   - `authority_risk: 1` mert a canonical authority nem valtozik, csak a mar letezo artifact-backed authority projectionje lesz tovabbvive.
   - `surface_spread: 1` mert ugyanaz a fogalom harom feluleten megy at: gate routing/finalize, envelope payload populate, UI read-model visibility.
   - `identity_join_risk: 0` mert nincs uj cross-seam identity; ugyanaz a same-run artifact ref/digest authority lanc mar letezik.
   - `activation_coupling: 0` mert nincs uj runtime feature-flag vagy milestone cutover.
   - `prerequisite_risk: 0` mert a task meglevo released contractra epul.
   - `acceptance_multiplicity: 1` mert backend projection correctness, transcript payload presence es UI visibility regresszio egyszerre bizonyitando.
3. `single-task allowed: yes`
4. Split indoklas:
   - nincs uj producer boundary,
   - nincs cleanup/coordination closure bevonasa,
   - a read-model hatas a mar letezo `payload.findings` mezon keresztul zarhato.

### Authority Fan-out Snapshot

1. `authority_producer`: a meta-review findings artifact eloallitasa out of scope; retained baseline.
2. `persisted_authority`: a persisted artifact es parity metadata baseline retained; uj persisted field nincs.
3. `workflow_orchestration_consumers`: `finalizeCurrentRunMetaReviewGate` es `dispatchAutoRework` in scope.
4. `read_model_consumers`: `BubbleTimeline` in scope.
5. `cleanup_recovery_consumers`: out of scope.

### Closure Budget Triage

1. Touched closure buckets:
   - `shared_contract` a meglevo `payload.findings` carrier mezoreuse explicititasahoz,
   - `workflow_orchestration_consumers`,
   - `read_model_consumers`.
2. Intentionally collapsed closures:
   - `workflow_orchestration_consumers` + `read_model_consumers`.
3. Collapse safety proof:
   - ugyanaz a bounded finalize -> append path tolti fel a mar letezo payload mezot,
   - nincs uj protocol field vagy parallel truth surface,
   - a UI mar most ezt az existing payload mezot fogyasztja.
4. Explicitly deferred closures:
   - `authority_producer`,
   - `persisted_authority_or_schema`,
   - `cleanup_recovery_consumers`,
   - `coordination_concurrency_hardening`.

### In Scope

1. A rework-path validalt findings artifactbol kinyerheto displayable finding lista atvitele a current-run finalize lancban.
2. Az auto-rework `APPROVAL_DECISION.payload.findings` feltoltese canonical, artifact-backed findingokkal.
3. UI regresszios coverage arra, hogy a meta-reviewer `rework` sor severity tageket mutat, mikozben a `rework` badge deduplikacio megmarad.
4. Backend regresszios coverage arra, hogy az auto-rework gate envelope findingokat hordoz.

### Out of Scope

1. Uj protocol payload mezo vagy transcript schema valtoztatas.
2. Human approval request path advisory finding contract modositas.
3. Findings severity reclassification, ontology vagy threshold policy modositas.
4. Generic timeline redesign vagy mas bubble szereplok finding renderelesenek atdolgozasa.
5. Summary/parity metadata text bovites a UI-ban.
6. Elsoleges UI komponens-atdolgozas; `BubbleTimeline.tsx` csak compatibility anchor, kiveve ha a backend projection valos consume-gapet bizonyit.

### Safety Defaults

1. Ha nincs valid displayable finding, a route maradjon mukodokepes `rework` decision findings nelkul; nincs synthetic fallback.
2. A projection csak a validalt artifact-chainhez kotheto; ne keruljon be olyan path, amely kulon, unverifed artifact-ref heuristicabol olvas.
3. Az auto-rework envelope tovabbra is ugyanazt a `decision`, `message`, `metadata`, `refs` contractot tartsa meg; a `findings` additive projection ugyanebbe a payloadba kerul.
4. A UI jelenlegi `rework` badge lathatosaga maradjon valtozatlan; a finding tagek nem okozhatnak tobbszoros `rework` badge megjelenest, fuggetlenul attol, hogy a badge a recommendation-pathrol vagy egy legacy decision-tag pathrol jon.

### Contract Boundary / Blast Radius

1. `contract_boundary_override`: `no`
2. Indoklas: nincs uj public field vagy schema; a task egy mar letezo optional `payload.findings` mezot kezd kitolteni egy eddig hianyzo meta-review auto-rework read-model pathon.

### Baseline Preservation

1. `must_preserve_behaviors`:
   - az auto-rework routing authority tovabbra is a canonical current-run finalize path marad,
   - a parity metadata aggregate mezoi tovabbra is guard/diagnostic szerepu mezok maradnak, nem finding projectionok,
   - finding nelkuli valid auto-rework sor tovabbra is megengedett,
   - a timeline `rework` badge lathatosaga es non-duplication viselkedese valtozatlan marad.
2. `allowed_resolution_paths`:
   - `report_json.findings_artifact_ref` -> parity-validalt artifact -> existing `payload.findings` projection,
   - parity-ok + nondisplayable artifact -> nincs `payload.findings`, de a `rework` route ervenyes marad.
3. `forbidden_regression_interpretations`:
   - recommendation/count/summary aggregate mezok finding listakent kezelese,
   - minden `rework` recommendation implicit blocker severitynek tekintese,
   - a UI oldali severity inference barmilyen synthetic fallbackkal.
4. `replacement_proof_required_if_removed`:
   - ha a parity-success -> `payload.findings` projection kikerulne, csak olyan replacement path engedelyezett, amely ugyanebbol a canonical artifact authoritybol, ugyanazon envelope contracton belul, equivalent UI truth-surface-szel dolgozik.

## L1 - Change Contract

### 0) Domain / Control Contract

| Item | Rule | Implementation Consequence | Priority | Timing |
|---|---|---|---|---|
| Canonical finding source | Auto-rework finding visibility csak a validalt findings artifactbol johet. | A finalize parity pathnak at kell vinnie a displayable finding listat az auto-rework appendig. | P1 | required-now |
| No synthetic severity | Counts/recommendation/summary nem helyettesitheti a finding listat. | Nincs UI-only severity inference vagy backend synthetic finding generation. | P1 | required-now |
| Existing payload reuse | Uj field nyitasa tilos; a meglovo `payload.findings` mezot kell hasznalni. | Protocol surface additive marad ugyanazon payloadon belul. | P1 | required-now |
| Dedupe preservation | `rework` badge deduplikacio maradjon. | Finding tagek ne okozzanak duplikalt recommendation/decision badge regressziot. | P1 | required-now |

### 1) Call-Site Matrix

| ID | File | Function / Entry | Expected Behavior | Priority | Timing | Evidence |
|---|---|---|---|---|---|---|
| CS1 | `src/v11/shared/metaReviewGate/metaReviewGateFindingsValidationParity.ts` | `validateStructuredMetaReviewPositiveClaimReworkPath(...)` | A parity-sikeres rework path ne csak metadata-t, hanem a validalt artifactbol szarmazo displayable findingokat is vissza tudja adni a current-run finalize retegnek. | P1 | required-now | no second heuristic read downstream |
| CS2 | `src/v11/shared/metaReviewGate/metaReviewGateFindingsValidation.ts` | `validateStructuredMetaReviewPositiveClaim(...)` | A rework success-path shape vigye tovabb a finding projectiont anelkul, hogy approve/inconclusive path contract driftet okozna. | P1 | required-now | typed finalize input stays explicit |
| CS3 | `src/v11/shared/metaReviewGate/metaReviewGateCurrentRunFinalization.ts` | `resolveCurrentRunParity(...)`, `finalizeCurrentRunMetaReviewGate(...)` | A parity resolution eredmeny tartalmazza a displayable finding listat, es ezt kizarolag az auto-rework route kapja meg. | P1 | required-now | canonical current-run routing owns projection handoff |
| CS4 | `src/v11/shared/metaReviewGate/metaReviewGateAutoRework.ts` | `appendAutoReworkDecision(...)` | Az `APPROVAL_DECISION.payload` a jelenlegi `decision/message/metadata` mellett `findings` mezot is ir, ha a finalize path displayable findingokat adott. | P1 | required-now | transcript event now carries severity list |
| CS5 | `ui/src/components/expanded/BubbleTimeline.tsx` | `extractFindingTags(...)`, meta-reviewer decision row render | Compatibility anchor: a meta-reviewer `APPROVAL_DECISION` sor a backend altal feltoltott payload findingokbol ugyanugy severity tageket rajzoljon, ha az emitted findingok explicit `severity` mezot hordoznak. A meglovo `rework` badge visibility/non-duplication maradjon meg. Kulon UI kodvaltozas csak consume-gap eseten engedelyezett. | P1 | required-now | current renderer consumes explicit `finding.severity`; no extra synthetic path |
| CS6 | `tests/v11/shared/metaReviewGate/metaReviewGateCurrentRunFinalization.test.ts` | auto-rework finalize fixtures | Bizonyitsa, hogy threshold-met auto-rework eseten a gate envelope `payload.findings` tartalmazza a validalt artifact findingjait. | P1 | required-now | backend regression coverage |
| CS7 | `ui/src/components/expanded/BubbleTimeline.test.tsx` | expanded timeline render tests | Bizonyitsa, hogy meta-reviewer `APPROVAL_DECISION` findingokkal `P1/P2/P3` tageket mutat, es a `rework` badge nem duplazodik. | P1 | required-now | UI regression coverage |

### 2) Data and Interface Contract

| Contract | Current | Target In This Task | Compatibility | Priority | Timing |
|---|---|---|---|---|---|
| Auto-rework `APPROVAL_DECISION.payload.findings` | altalaban hianyzik | feltoltodik validalt, displayable artifact findingokkal | additive existing field population | P1 | required-now |
| Rework parity success result | metadata + diagnostics | metadata + diagnostics + displayable findings | internal typed contract alignment | P1 | required-now |
| Timeline severity read-model | findingok hianyaban csak `rework` badge latszik | findingok jelenletekor severity tagek is latszanak ugyanabban a sorban | user-visible read-model fix | P1 | required-now |

Constraint:
approve/inconclusive vagy human-gate advisory-only route contract nem nyithato ujra ebben a taskban.

`payload.findings` required-now projection contract:
1. carrier type: a meglevo `ProtocolEnvelopePayload.findings` `Finding[]` contractja marad ervenyben; uj UI-only DTO tilos.
2. required per emitted entry:
   - `title` nem ures string,
   - explicit `severity` `P0|P1|P2|P3` ertekkel.
3. optional pass-through:
   - `priority`, ha a source artifact hordozza,
   - `refs`,
   - mar meglevo `detail`, `code`, `timing`, `layer`, `evidence`, `effective_priority`, ha secondary enrichment nelkul atvihetok.
4. forbidden:
   - priority-only artifact entry emitted findingga alakitasa `severity` nelkul,
   - olyan artifact entry projectionje, amelybol explicit renderelheto `severity` nem all rendelkezesre,
   - title nelkuli synthetic placeholder finding,
   - aggregate metadata finding entryve alakitasa.
5. projection presence rule:
   - a `payload.findings` mezot csak akkor szabad irni, ha legalabb egy valid projected finding marad.

### 3) Side Effects Contract

| Area | Allowed | Forbidden | Notes | Priority | Timing |
|---|---|---|---|---|---|
| Findings source | validalt artifact payload tovabbitasa | summary/count/recommendation alapu finding-szintezis | canonical artifact chain only | P1 | required-now |
| Transcript append | existing auto-rework `APPROVAL_DECISION` payload bovites `findings`-szel | uj envelope type vagy uj metadata-only pseudo contract | existing event family marad | P1 | required-now |
| UI rendering | existing finding-tag renderer reuse | meta-reviewer special-case severity hardcode | actor-agnostic tag rule preserved | P1 | required-now |

### 3a) Precondition and Side-Effect Boundary

1. Validations that must pass before findings-bearing side effect:
   - a rework parity validation sikeres legyen,
   - a findings artifactbol csak olyan findingok maradjanak a projectionben, amelyek megfelelnek a fenti `payload.findings` required-now contractnak,
   - explicit `severity` nelkuli artifact finding nem emittalhato UI-renderelheto findingkent ebben a taskban.
2. Side effects forbidden before those validations pass:
   - findings-bearing `APPROVAL_DECISION` transcript append,
   - barmilyen synthetic severity/finding metadata beirasa a payloadba.
3. Invalid/precondition-failure behavior:
   - parity fail eseten a jelenlegi dispatch-failed human route marad ervenyben; nincs findings-bearing auto-rework append,
   - parity success, de ures/nondisplayable projection eseten bounded side effect megengedett: `auto_rework` append maradhat, de `payload.findings` nelkul.
4. Coordination primitives:
   - uj lock/idempotency/serialization szabaly nincs scope-ban,
   - a meglevo gate append lock retained baseline marad.

### 4) Error and Fallback Contract

| Trigger | Behavior (`throw|result|fallback`) | Fallback Value / Action | Reason Code | Priority | Timing |
|---|---|---|---|---|---|
| Artifact parity fail | existing failure path | nincs auto-rework findings projection; a jelenlegi dispatch-failed human route marad | existing parity failure reason | P1 | required-now |
| Parity ok, de artifact finding nem displayable | fallback | `payload.findings` elhagyhato; `rework` route marad ervenyes | no new reason code | P1 | required-now |
| UI entry findingok nelkul | result | csak a meglovo `rework` badge jelenik meg | existing UI behavior | P1 | required-now |

### 5) Test Matrix

| ID | Scenario | Given | When | Then | Priority | Timing |
|---|---|---|---|---|---|---|
| T1 | blocking auto-rework findings are surfaced | validated findings artifact `[{ severity: \"P1\", title: ... }]` | `finalizeCurrentRunMetaReviewGate(...)` auto-rework route-ra fut | a gate envelope `APPROVAL_DECISION.payload.findings` tartalmazza a `P1` findingot a `rework` message mellett | P1 | required-now |
| T2 | mixed displayable findings stay ordered and additive | validated findings artifact legalabb ket displayable findinggal (`P1` + `P2` vagy `P3`) | auto-rework append megtortenik | a payload finding lista nem redukalodik aggregate countokra; a title/ref adatok megmaradnak | P1 | required-now |
| T3 | non-displayable artifact entries do not create fake badges | parity ok, de a findings artifactban nincs renderelheto `severity + title` kombinacio | auto-rework append megtortenik | a route marad `auto_rework`, de nincs synthetic `payload.findings` | P2 | required-now |
| T4 | UI renders severity tags on meta-reviewer rework row | `APPROVAL_DECISION` entry meta-reviewer metadata-val es `payload.findings`-szel | `BubbleTimeline` render | a `P1/P2/P3` tagek latszanak ugyanabban a sorban | P1 | required-now |
| T5 | rework badge visibility stays non-duplicated beside findings | `APPROVAL_DECISION` entry meta-reviewer recommendation-path badge-del es findingokkal | `BubbleTimeline` render | pontosan egy lathato `rework` badge marad, mellette a severity tagek | P1 | required-now |

## L2 - Implementation Notes (Optional)

1. A task preferalt megoldasa az, hogy a rework parity validation success-pathja adja vissza a mar validalt artifact finding listat, ne egy kesobbi kulon read tortenjen az auto-rework append ponton.
2. Ha kulon normalizalo helper kell a displayable findingok szuresere, az ownership maradjon `src/v11/shared/metaReviewGate/**` alatt; ne nyiss uj altalanos UI/backend shared contract csomagot.
3. A finding projection minimuma a canonical `Finding[]` contracttal kompatibilis `title + explicit severity`, opcionális `priority`/`refs` pass-through-val; ne nyisson felesleges artifact-shadow payloadot vagy UI-only narrowed shape-et.

## Hardening Backlog

1. `later-hardening`: a `BubbleTimeline` decision-tag pathot erdemes kulon UI cleanup taskban a canonical `decision=rework` literalhoz is igazitani, hogy a legacy `revise` anchor megszunhessen.

## Review Control

1. A task akkor marad scope-on belul, ha nem nyit uj protocol mezot es nem nyul a human-gate advisory-only pathhoz.
2. Barmilyen javaslat, amely aggregate countbol, recommendationbol vagy summarybol talalna ki finding tageket, scopeon kivuli es tilos.
3. Ha implementacio kozben kiderul, hogy a parity success contract szeles consumer-feluleten hasznalt es a typed shape valtoztatasa tovabbi consume-family alignmentet igenyel, route-back szukseges kulon plan/task bontasra.

## Spec Lock

Mark the task as `IMPLEMENTABLE`, mert:
1. a user-visible hiany pontosan lokalizalhato a meta-review auto-rework transcript projectionben,
2. a canonical source-of-truth es a forbidden fallback szabaly explicit,
3. a target-file reality egyetlen bounded workflow-orchestration + read-model closure-t mutat, es a `BubbleTimeline.tsx` consume oldala kompatibilis anchor marad, ha az emitted findingok explicit `severity` mezot hordoznak,
4. nincs szukseg uj planra vagy schema override-ra, amennyiben a meglovo `payload.findings` mezot hasznaljuk.
