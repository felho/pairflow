---
artifact_type: plan
artifact_id: plan_runtime_review_policy_reset_and_phasing_v1
title: "Runtime Review Policy Reset and Phasing Plan"
status: draft
prd_ref: null
owners:
  - "felho"
---

# Plan: Runtime Review Policy Reset and Phasing

## Objective

Ujra-szekvencialni a runtime review policy munkat ugy, hogy:
1. a jelenlegi `review-policy-runtime-surface-phase1` bubble tanulsagait megtartsuk,
2. a bubble jelenlegi kodjat ne tekintsuk merge-celpontnak,
3. a kovetkezo implementacios kor clean `main`-rol induljon,
4. a shared runtime review policy foundation, az auto-rework threshold, es a reviewer bypass ne egyetlen szeles blast-radiusu feature-kent mozogjon,
5. a tenyleges bypass-aktivacio tovabbra is kulon milestone-gated rollout maradjon, es ne csusszon vissza foundation- vagy threshold-szeletbe.

## Done Definition

1. A plan explicit current-tree sequencinget ad a runtime review policy lane-nek a post-Phase-E actor-runtime successor baseline mellett.
2. A Phase 1 / Phase 2 / Phase 3 split coverage-szinten teljes, es egyik fazis sem hordoz kevert foundation + delivery + bypass activation scope-ot.
3. A downstream taskokhoz szukseges control model plan-szinten explicit:
   - mi a business invariant,
   - mi a control owner,
   - honnan szabad olvasni,
   - mi tiltott fallback,
   - mi az engedelyezett deterministic resolution path,
   - mi a missing-data behavior.
4. A current next bounded step egyertelmu:
   - egy frissen generalt Phase 1 foundation task,
   - az adjacent `O2-T9` lane-tol kulon ownership mellett.

## Guiding Principles

1. Business invariant:
   - a review-loop runtime donteseknel nem keletkezhet ket vagy tobb versengo authority ugyanarra a threshold/bypass allapotra.
   - a human-facing approval es a gate routing nem mondhat ellent egymasnak kulon source-of-truth miatt.
2. Control model:
   - a canonical runtime review policy workflow/orchestrator-owned.
   - a threshold authority canonical inputjat egyetlen explicit authority boundary oldja fel.
   - actor csak policy-derived inputot vagy constraintet kaphat; nem canonical policy source.
3. Read-path rule:
   - a review-policy runtime view, threshold authority, es a status/detail/list projection egy-egy named canonical helperen vagy boundaryn keresztul olvashato.
   - a human-facing approval/hydration csak ugyanebbol az authority lancbol consume-olhat, ha az adott fazis ezt ownershipolja.
4. Forbidden fallback:
   - reviewer snapshot, summary-level derived adat, UI/store local projection vagy ad hoc route helper nem valhat canonical threshold truth-ta.
   - actor prompt vagy actor output sem valhat canonical review-policy source-sza.
5. Allowed resolution path:
   - deterministic same-authority artifact/parity/report reconciliation megengedett, ha ugyanazon canonical authority lanc resze.
   - report/artifact/parity input merge csak explicit named helper/boundary alatt megengedett.
6. Missing-data rule:
   - ha a canonical threshold source nem oldhato fel, a rendszer fail-closed vagy conservative route-on marad explicit diagnostics mellett.
   - missing/incomplete policy surface nem eredmenyezhet silent bypass- vagy threshold-aktivaciot.
7. Sequencing / boundary note:
   - producer-first rule:
     a canonical `review_policy` foundation es authority resolver elobb zarul, mint a threshold enforce vagy a bypass consume/activation.
   - downstream consume families that remain separate:
     meta-review gate routing, human-gate payload/approval refresh, status/detail/list projection, es opcionális UI/API consume kulon fazisban mozoghatnak.
   - cleanup/recovery timing:
     cleanup/recovery alignment csak ott jon be, ahol a fazis explicitten ownershipolja; adjacent `O2-T9` cleanup nem resze ennek a lane-nek.

## Canonical Contract Anchors

1. Source-of-truth anchors:
   - [metaReviewGateCurrentRunFinalization.ts](/Users/felho/dev/pairflow/src/v11/shared/metaReviewGate/metaReviewGateCurrentRunFinalization.ts)
   - [approvalRequestEnvelope.ts](/Users/felho/dev/pairflow/src/v11/shared/metaReviewGate/approvalRequestEnvelope.ts)
   - [metaReviewGateReviewerSnapshot.ts](/Users/felho/dev/pairflow/src/v11/shared/metaReviewGate/metaReviewGateReviewerSnapshot.ts)
   - [metaReviewGateFindingsValidation.ts](/Users/felho/dev/pairflow/src/v11/shared/metaReviewGate/metaReviewGateFindingsValidation.ts)
   - [actor-runtime-interface-post-phaseE-successor-plan-v1.md](/Users/felho/dev/pairflow/plans/actor-runtime-interface-post-phaseE-successor-plan-v1.md)
2. Closed canonical elements / terms:
   - `MetaReviewRuntimeDeliveryObservation` runtime truth marad
   - same-round findings artifact/parity validation preserved baseline
   - actor-runtime successor preserved baseline, nem reopenolhato implicit cleanup cimszo alatt
3. Explicitly authorized reinterpretation:
   - `N/A`
4. Downstream task impact:
   - a Phase 1 foundation tasknak explicit control-model inheritance kell
   - a Phase 2 threshold task nem promotálhat compat vagy reviewer-snapshot source-ot canonical truth-va
   - a Phase 3A/3B taskok nem kezelhetik pending prerequisite-kent a mar preserved historical cutover baseline-t

## Current Codebase Check (2026-04-21)

1. A checked-out `src`, `tests` es `ui` scope-ban tovabbra sincs `review_policy`, `review_loop_mode` vagy `meta_review_auto_rework_min_severity` runtime surface.
2. A meta-review gate current tree-ben mar erosebb parity/observation baseline-en all:
   - `validateStructuredMetaReviewPositiveClaim(...)`
   - `MetaReviewRuntimeDeliveryObservation`
   - same-round reviewer snapshot consistency consume
   ez azonban nem egyenlo a plan altal igenyelt canonical `review_policy` surface-szel vagy egyetlen threshold-authority boundaryval.
3. A korabbi taskokban szereplo `src/core/**` targetek a vegleges core retirement utan mar nem leteznek.
4. A plan tovabbra is `draft`; egy korabbi Phase 1 foundation task draft szuletett, de current-tree szinten stale target-listas volt, ezert nem retained implementation input.
5. A post-Phase-E actor-runtime successor lane current tree-ben mar kulon ownership alatt fut; a runtime review policy lane-nek nem szabad magaba huznia az adjacent `O2-T9` meta-review gate runtime-capability residual cleanupot.

Sikernek az szamit, ha a kovetkezo kor mar nem egyetlen bubble-ben mozgatja egyszerre a policy schema-t, a threshold routingot, a human-gate envelope semantics-et, a runtime projection surface-eket, a recovery pathokat es a web UI/store reteget.

## Current Status

### Completed Work

1. A wide-scope discovery bubble tanulsagai rogzitve lettek ebben a reset planben.
2. A stale Phase 1 draftbol levont tanulsag:
   a kovetkezo foundation taskot nem erdemes retargetelni in-place; friss taskgenerralas kell a mai topologyra.
3. A current-tree adjacent actor-runtime baseline mar kulon successor lane-ben el:
   [actor-runtime-interface-post-phaseE-successor-plan-v1.md](/Users/felho/dev/pairflow/plans/actor-runtime-interface-post-phaseE-successor-plan-v1.md)

### Open Work

1. Egy uj Phase 1 foundation task generalasa a mai `src/v11/**` topologyra.
2. A planbol hianyzo Phase 2 / Phase 3A / Phase 3B task artifactok letrehozasa.
3. A canonical control-model orokles explicit bevezetese a downstream taskokba.

### Deferred / Future Work

1. Bypass runtime activation kulon taskban, foundation es threshold lane utan.
2. Olyan UI/control surface, amely a bounded backend foundationnel mar nincs egy lane-ben.

## Immediate Next Step

1. A current next bounded step egy frissen generalt Phase 1 foundation task; nem a korabbi stale draft retargetelese.
2. Ha az adjacent `O2-T9` eppen aktiv merge-slice, azt elobb le kell zarni, hogy a meta-review gate workflow contract ne ket lane-ben valtozzon egyszerre.

## Decision Baseline

1. A `review-policy-runtime-surface-phase1` bubble tanulasi artifact. Nem delivery baseline, nem incremental merge-jelolt.
2. A kovetkezo implementacios kor clean `main`-rol induljon, uj bubble(k)ben.
3. A ket funkcio kozos ernyoje tovabbra is a shared `runtime review policy` surface:
   - `review_loop_mode = full | meta_only`
   - `meta_review_auto_rework_min_severity = P1 | P2 | P3`
4. A ket funkcio nem egyforma erettsegu:
   - az auto-rework threshold kozelebb van a mostani stackhez,
   - a reviewer bypass behavior topologiai elofeltetelekhez kotott.
5. Az auto-rework threshold sem szabad, hogy prompt-, snapshot- vagy runtime-surface-centrikus patchworkkent keszuljon el; elotte vagy vele egy idoben explicit authority simplification kell.
6. A reviewer bypassbol most a policy/config/UI/state contract es provenance-elv specifikalhato, de a tenyleges runtime behavior aktivacio tovabbra sem csuszhat vissza foundation/threshold delivery melle opportunistic same-slice rolloutkent.
7. A shared runtime review policy surface workflow/orchestrator-owned marad; actor csak policy-derived inputot kaphat.
8. A post-Phase-E actor-runtime successor lane preserved baseline marad; a runtime review policy munka erre tamaszkodhat, de nem replacementje az ott meg nyitott residual cleanupnak.

## Why Reset

A bubble diffje alapjan a munka egyszerre erintette az alabbi retegeket:
1. canonical types/config schema,
2. status/list/detail read projection,
3. mutation/write seam,
4. meta-review gate routing es parity authority,
5. human-gate envelope persistence,
6. recovery/read-after-write pathok,
7. CLI/operator status renderer,
8. web UI API/store/component surface,
9. docs es rollout semantics,
10. szeles regresszios tesztmatrix.

Ez onmagaban nem bizonyit architekturális hibat, de eros jelzes arra, hogy a jelenlegi task egyszerre probalt:
1. uj policy surface-et bevezetni,
2. uj routing semantics-et szallitani,
3. uj operatori/runtime projectiont kialakitani,
4. es egy jovobeli bypass rollout contractjat is elokesziteni.

Ez a kombinacio tul sok helyen nyitott ownership-kerdest egyszerre.

## Architectural Diagnosis

### Problem 1: Authority nincs egyetlen boundaryre bezarva

1. A threshold source-of-truth, a parity metadata, a findings artifact, a reviewer snapshot es a human-facing approval envelope tobb helyen, reszben kulon olvassa ugyanazt a fogalmi allapotot.
2. Emiatt ugyanaz a review-policy dontes mas shape-ben jelenik meg:
   - route helperben,
   - refresh pathban,
   - status/detail/list projectionben,
   - human gate payloadban.
3. Ez review-loopos rendszerben kulonosen veszelyes, mert mindig marad egy meg nem hardenelt olvasasi/agregacios ut.

### Problem 2: A runtime surface es a gate behavior egy taskban mozdult

1. A user-visible projection (`requested/effective/support`) jo kulon fogalom.
2. De amikor ugyanabban a szeletben valtozik:
   - a policy object,
   - a mutation API,
   - a gate routing,
   - a recovery/read surface,
   - a UI/store,
   akkor a regressziok mar nem lokalisak.

### Problem 3: A bypass elokeszitese osszecsuszott a threshold deliveryvel

1. A shared umbrella helyes otlet.
2. De a bypass config/UI/provenance surface mar onmagaban is uj projection- es mutation-scope-ot nyit.
3. Ha ezt ugyanabban a bubble-ben mozgatjuk, mint a threshold authority/routing semantics-et, akkor a threshold sem marad bounded.

## Phase Breakdown

| Phase | Goal | Inputs | Outputs | Exit Criteria |
|---|---|---|---|---|
| Phase 1 | Shared runtime review policy foundation + authority simplification | jelenlegi bubble tanulsagai, `plans/tasks/review-policy-runtime-surface-and-rollout-phase1.md`, actor-runtime migration plan, es ez a reset plan | canonical policy type/schema, single projection builder, single mutation seam, threshold authority resolver boundary | a policy/read/write/authority felelossegek explicitten szet vannak valasztva; nincs meg bypass behavior |
| Phase 2 | Auto-rework severity threshold delivery a canonical gate boundaryn | Phase 1 foundation | threshold-aware routing a meta-review gate boundaryn, bounded read-surface exposure, regressziozaras | a threshold feature reszertelmet ad clean mainrol, UI/store blast radius nelkul vagy minimalis operatori exposure-rel |
| Phase 3 | Reviewer bypass contract now, activation later | Phase 1 foundation + historical reviewer/meta-reviewer cutover baseline + current-tree actor-runtime successor baseline | bypass policy/config/UI/state contract spec, majd kulon activation task | a bypass behavior nem csuszik vissza foundation/threshold slice-ba; az aktivacio kulon taskban tortenik |

## Recommended Task Split

1. `plans/tasks/runtime-review-policy-foundation-and-authority-refactor-phase1.md`
   - cel: canonical ownership bezarasa egy helyre
   - scope:
     - `review_policy` schema/typing
     - single read projection builder status/list/detail surface-ekhez
     - single mutation seam
     - single threshold-authority resolver API a findings artifact/parity input feloldasara
   - non-goal:
     - teljes web UI rollout
     - bypass behavior
     - vegso threshold UX polish
   - authoring note:
     ezt a taskot ujra kell generalni a current-tree topologyra; a korabbi draft nem retained input.

2. `plans/tasks/runtime-review-policy-auto-rework-threshold-phase2.md`
   - cel: a threshold enforce tenyleges szallitasa a canonical gate boundaryn
   - scope:
     - gate routing helper a Phase 1 authority API-ra epulve
     - conservative fallback + diagnostics
     - approval refresh/human gate payload ugyanarra az authority layerre kotve
   - non-goal:
     - bypass contract
     - nagy UI/control surface

3. `plans/tasks/runtime-review-policy-reviewer-bypass-contract-phase3a.md`
   - cel: bypass policy/config/UI/provenance contract specifikalasa behavior nelkul
   - scope:
     - requested/effective/support semantics
     - config/API/UI shape
     - blocked/guarded copy
     - provenance es cutover prerequisite-ek
   - non-goal:
     - tenyleges scheduler/router topology valtas

4. `plans/tasks/runtime-review-policy-reviewer-bypass-activation-post-cutover-phase3b.md`
   - cel: bypass runtime behavior aktivacio a reviewer + meta-reviewer cutover utan
   - explicit dependency:
     - historical reviewer cutover baseline preserved
     - historical meta-reviewer cutover baseline preserved
     - current-tree actor-runtime successor baseline nem regresszalodik

## Phase 1 Refactor Boundary

Phase 1-ben a refaktor kotelezo eredmenye egyetlen canonical boundary legyen legalabb ezekre:
1. `review_policy` normalized config read,
2. `review_policy` runtime view (`requested`, `effective`, `support_status`, `blocked_reason_code`),
3. threshold authority input feloldasa:
   - `report_json`
   - findings artifact coordinates
   - parity metadata
   - same-round freshness/authority rules
4. approval refresh es human-gate finding hydration ugyanabból az authority source-bol,
5. status/detail/list surface ugyanabbol a projection builderbol.

Ha ezek kozul barmelyik tovabbra is kulon helper-halmazokban el, akkor a kovetkezo threshold task ujra ugyanebbe a review-loop mintaba fog visszacsuszni.

## Delivery Policy by Phase

### Phase 1

1. Elso cel nem feature rollout, hanem bounded architecture cleanup.
2. Megengedett surface:
   - types/config
   - canonical read/write seams
   - internal authority resolver
   - szukseges backend projection
3. Kerulendo:
   - web UI/store nagy blast radius
   - actor prompt/guidance plusz semantics
   - recovery/persistence opportunistic tovabbfejlesztes a foundationon tuli mertekben
   - adjacent `O2-T9` workflow runtime-capability residual cleanup bevonasa ebbe a lane-be

### Phase 2

1. A threshold mar implementalhato a jelenlegi stacken, ha a gate/policy retegen marad.
2. A Phase 2 task acceptance kriteriuma legyen szuk:
   - route decision ugyanazt az authority resolvert hasznalja,
   - nincs reviewer snapshot fallback authoritykent,
   - a runtime surface nem gyart sajat threshold-igazsagot,
   - es a gate-local runtime-capability contract cleanup nem keveredik bele ugyanebbe a szeletbe.

### Phase 3

1. A bypass specifikacio most is elokeszitheto.
2. A historical reviewer es meta-reviewer cutover mar preserved baseline, nem pending implementacios blocker.
3. Ettol fuggetlenul a bypass behavior aktivacioja tovabbra is kulon milestone-gated rollout marad:
   - foundation utan,
   - threshold lane utan,
   - explicit activation taskban.
4. Nem kell a teljes program vegeig varni, de ezt a feature-t nem tesszuk be foundation- vagy threshold-szeletbe.

## Dependencies

1. Current-tree adjacent dependency:
   [plans/actor-runtime-interface-post-phaseE-successor-plan-v1.md](/Users/felho/dev/pairflow/plans/actor-runtime-interface-post-phaseE-successor-plan-v1.md)
2. Current-tree adjacent residual task:
   [plans/tasks/actor-runtime-interface-opportunity2-task9-meta-review-gate-workflow-runtime-capability-residual-closeout.md](/Users/felho/dev/pairflow/plans/tasks/actor-runtime-interface-opportunity2-task9-meta-review-gate-workflow-runtime-capability-residual-closeout.md)
3. Historical actor-runtime sequencing baseline:
   [plans/actor-runtime-interface-discovery-and-migration-plan-v1.md](/Users/felho/dev/pairflow/plans/actor-runtime-interface-discovery-and-migration-plan-v1.md)
4. Historical migration spine baseline:
   [plans/archive/tasks/actor-runtime-interface/actor-runtime-interface-migration-spine-phaseD-plan.md](/Users/felho/dev/pairflow/plans/archive/tasks/actor-runtime-interface/actor-runtime-interface-migration-spine-phaseD-plan.md)
5. Discovery input / superseded wide-scope task:
   [plans/tasks/review-policy-runtime-surface-and-rollout-phase1.md](/Users/felho/dev/pairflow/plans/tasks/review-policy-runtime-surface-and-rollout-phase1.md)
6. Historical reviewer es meta-reviewer Phase E cutover artifactok preserved baseline-kent a bypass activation sequencinghez

## Risks and Mitigations

1. Risk: a reset utan is tul nagy marad a Phase 1 task.
   Mitigation: a web UI/store es a bypass contract ne keruljon a foundation taskba, csak ha explicitten nincs mas blast radius.

2. Risk: a threshold task ujra elkezdi masolni az authority logikat read surface-ekbe.
   Mitigation: Phase 1 explicit deliverable legyen a single authority resolver + single projection builder.

3. Risk: a bypass specifikacio ujra belerangatja a runtime behavior kerdeseit.
   Mitigation: Phase 3A es 3B kulon task, kulon acceptance criteria-val.

4. Risk: az adjacent actor-runtime successor residual cleanup es a review-policy lane osszecsuszik.
   Mitigation: az `O2-T9` current-tree adjacent dependency maradjon kulon ownership; a review-policy Phase 1 ne vallaljon runtime-capability contract cleanupot.

5. Risk: elveszik a bubble-ben megszerzett konkret tudás.
   Mitigation: ezt a plant a bubble diffkategoriak es review findingok alapjan rogzitjuk; a bubble nem merge-olodik, de discovery inputkent megmarad.

## Validation Strategy

1. Phase 1 validacioja ne teljes end-to-end rollout legyen, hanem seam-level regresszio:
   - config parse/render,
   - projection builder,
   - mutation seam,
   - threshold authority resolver.
2. Phase 2 validacio:
   - route enforce,
   - approval refresh parity,
   - fallback diagnostics,
   - ugyanazon authority source hasznalata human-facing payloadban.
3. Phase 3A validacio:
   - spec/task-level contract review, nem behavior rollout.
4. A bubble-bol hozott szeles UI/store tesztmatrix ne legyen Phase 1 kotelezo resze, csak ha a task tenylegesen azt a reteget is erinti.

## Recommendation

1. A mostani bubble kodjat erdemes eldobni mint delivery-jarmuvet.
2. A bubble-t erdemes megtartani tanulasi referenciakent:
   - mely retegek mozdultak egyszerre,
   - hol csuszott szet az authority,
   - mely tesztek jeleztek driftet.
3. A kovetkezo kor clean `main`-rol induljon e terv alapjan frissen generalt Phase 1 taskkal.
4. Ha az adjacent `O2-T9` eppen aktiv merge-slice, a Phase 1 indulasa elott erdemes annak closurejat megvarni, hogy a meta-review gate workflow contract ne ket lane-ben valtozzon egyszerre.
