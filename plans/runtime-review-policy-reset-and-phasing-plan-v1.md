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
   - a Phase 1 merge utani kovetkezo task-spec,
   - a mar lezart `O2-T9` baseline megorzese mellett.

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
     cleanup/recovery alignment csak ott jon be, ahol a fazis explicitten ownershipolja; a lezart `O2-T9` cleanup preserved predecessor baseline, nem resze ennek a lane-nek.

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
   - a downstream taskok koncepcionalisan validak maradhatnak, de successor-scope-juk csak a Phase 1 current-tree re-anchoring utan tekintheto stabilnak

## Current Codebase Check (2026-04-21, post-merge)

1. A canonical `review_policy` config/runtime surface most mar jelen van a current `main`-on:
   - `src/config/bubbleConfig.ts`
   - `src/types/bubble.ts`
   - `src/v11/shared/reviewPolicy/reviewPolicyRuntime.ts`
   - `src/v11/shared/reviewPolicy/updateBubbleReviewPolicy.ts`
2. A list/status consume family mar a kozos runtime-view builderre ul:
   - `src/v11/shared/list/listCommandEntryProjection.ts`
   - `src/v11/shared/status/statusCommandViewBuilder.ts`
   Ez a Phase 1 read-model closuret lezart baseline-ne teszi, nem nyitott plan-gap.
3. A pure threshold-authority boundary is letezik a current tree-ben:
   - `src/v11/shared/metaReviewGate/metaReviewGateThresholdAuthority.ts`
   A kovetkezo tasknak erre a merged authority surface-re kell epulnie, nem uj foundation seamet kell kitalalnia.
4. A korabbi `src/core/**` targetek tovabbra sem relevansak; a lane current baseline-ja teljesen `src/v11/**`, `src/config/**`, `src/types/**`.
5. A plan frontmattere tovabbra is `draft`; ettol a merged Phase 1 baseline valos, de a Phase 2 / Phase 3 artifactok hianya miatt a lane coverage meg nincs teljesen lezarva.
6. A post-Phase-E actor-runtime successor lane current tree-ben mar lezart baseline; a runtime review policy lane-nek tovabbra sem szabad ujranyitnia az archived `O2-T9` meta-review gate runtime-capability cleanupot.
7. A current-tree `detail` consume jelenleg tovabbra sem kulon backend Phase 2 entrypointkent latszik, hanem UI/router-presenter compositionkent:
   - `src/v11/infrastructure/ui/routerActions.ts`
   - `src/v11/infrastructure/ui/presenters/bubblePresenter.ts`
   Ezert a `detail` a kovetkezo taskban sem kezelheto automatikus backend consume familykent explicit current-tree anchor nelkul.

Sikernek az szamit, ha a kovetkezo kor mar nem egyetlen bubble-ben mozgatja egyszerre a policy schema-t, a threshold routingot, a human-gate envelope semantics-et, a runtime projection surface-eket, a recovery pathokat es a web UI/store reteget.

## Current Status

### Completed Work

1. A wide-scope discovery bubble tanulsagai rogzitve lettek ebben a reset planben.
2. A stale Phase 1 draftbol levont tanulsag be lett epitve, es a replacement task current-tree topologyra lett ujrairva.
3. A `runtime-review-policy-foundation-and-authority-refactor-phase1` task meg lett implementalva, merge-elve `main`-re, majd archivalva ide:
   [runtime-review-policy-foundation-and-authority-refactor-phase1.md](/Users/felho/dev/pairflow/plans/archive/tasks/runtime-review-policy-foundation-and-authority-refactor-phase1.md)
4. A current-tree adjacent actor-runtime baseline mar kulon successor lane-ben el:
   [actor-runtime-interface-post-phaseE-successor-plan-v1.md](/Users/felho/dev/pairflow/plans/actor-runtime-interface-post-phaseE-successor-plan-v1.md)

### Open Work

1. A Phase 2 task-spec mar letezik itt:
   [runtime-review-policy-auto-rework-threshold-phase2.md](/Users/felho/dev/pairflow/plans/tasks/runtime-review-policy-auto-rework-threshold-phase2.md)
2. A Phase 3A / Phase 3B task artifactok letrehozasa tovabbra is hianyzik coverage-szinten.
3. A canonical control-model orokles explicit bevezetese a downstream taskokba.
4. A downstream taskok dependency wordingje nem allithat `approved` parent-plan baseline-t, amig ennek a plannek a frontmatter statusza `draft`.
5. A downstream Phase 2 / Phase 3 taskok koncepcionalisan maradhatnak, de most mar a merged Phase 1 baseline-re kell hivatkozniuk, nem a reset-elotti gapre.

### Deferred / Future Work

1. Bypass runtime activation kulon taskban, foundation es threshold lane utan.
2. Olyan UI/control surface, amely a bounded backend foundationnel mar nincs egy lane-ben.

## Immediate Next Step

1. A current next bounded step a Phase 2 task-spec review-ja es bubble-inditasra kesz implementacios baseline-je:
   [runtime-review-policy-auto-rework-threshold-phase2.md](/Users/felho/dev/pairflow/plans/tasks/runtime-review-policy-auto-rework-threshold-phase2.md)
   - authoring rule:
     a task a merged Phase 1 authority/projection baseline-re epuljon, kulonosen:
     `src/v11/shared/metaReviewGate/metaReviewGateThresholdAuthority.ts`,
     `src/v11/shared/reviewPolicy/reviewPolicyRuntime.ts`,
     `src/v11/shared/metaReviewGate/metaReviewGateCurrentRunFinalization.ts`,
     `src/v11/shared/metaReviewGate/metaReviewGateHumanGatePersistence.ts`,
     `src/v11/shared/metaReviewGate/approvalRequestEnvelope.ts`
   - scope rule:
     ez threshold delivery task legyen, ne uj foundation refactor.
     A routing/human-gate payload alignment ownershipolhato, de bypass contract vagy szeles UI/control surface meg nem.
   - current-tree read-model note:
     a kotelezo consume family itt mar nem `list/status`, mert azt a Phase 1 lezarta.
     A bounded Phase 2 read-model closure a gate-route truth export familyre korlatozodik:
     persisted human-gate envelope metadata, converged route metadata, metrics/report aggregation, valamint a mar letezo submit/result route exposure.
     `detail` tovabbra is csak explicit entrypointtal ownershipolhato.
2. Az archived `O2-T9` current-tree preserved baseline marad; a Phase 2 tasknak erre es a merged Phase 1 baseline-re kell epulnie, es nem szabad runtime-capability cleanupot vagy bypass-aktivaciot opportunistikusan visszahoznia.

## Decision Baseline

1. A resetet kivalto `review-policy-runtime-surface-phase1` bubble tovabbra is tanulasi artifact; a delivery baseline most mar a merge-elt es archivalt Phase 1 task.
2. A kovetkezo implementacios kor clean `main`-rol induljon, uj bubble-ben.
3. A ket funkcio kozos ernyoje tovabbra is a shared `runtime review policy` surface:
   - `review_loop_mode = full | meta_only`
   - `meta_review_auto_rework_min_severity = P1 | P2 | P3`
4. A ket funkcio nem egyforma erettsegu:
   - az auto-rework threshold kozelebb van a mostani stackhez,
   - a reviewer bypass behavior topologiai elofeltetelekhez kotott.
5. Az auto-rework threshold sem szabad, hogy prompt-, snapshot- vagy runtime-surface-centrikus patchworkkent keszuljon el; elotte vagy vele egy idoben explicit authority simplification kell.
6. A reviewer bypassbol most a policy/config/UI/state contract es provenance-elv specifikalhato, de a tenyleges runtime behavior aktivacio tovabbra sem csuszhat vissza foundation/threshold delivery melle opportunistic same-slice rolloutkent.
7. A shared runtime review policy surface workflow/orchestrator-owned marad; actor csak policy-derived inputot kaphat.
8. A post-Phase-E actor-runtime successor lane preserved baseline marad; a runtime review policy munka erre tamaszkodhat, de nem replacementje a mar lezart `O2-T9` cleanupnak.

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
| Phase 1 | Shared runtime review policy foundation + authority simplification | jelenlegi bubble tanulsagai, `plans/tasks/review-policy-runtime-surface-and-rollout-phase1.md`, actor-runtime migration plan, es ez a reset plan | canonical policy type/schema, single projection builder a jelenlegi `list/status` consume familyhez, single mutation seam, threshold authority resolver boundary | a policy/read/write/authority felelossegek explicitten szet vannak valasztva; nincs meg bypass behavior; `detail` nincs implicitten Phase 1-be huzva |
| Phase 2 | Auto-rework severity threshold delivery a canonical gate boundaryn | Phase 1 foundation | threshold-aware routing a meta-review gate boundaryn, bounded read-surface exposure, regressziozaras | a threshold feature reszertelmet ad clean mainrol, UI/store blast radius nelkul vagy minimalis operatori exposure-rel |
| Phase 3 | Reviewer bypass contract now, activation later | Phase 1 foundation + historical reviewer/meta-reviewer cutover baseline + current-tree actor-runtime successor baseline | bypass policy/config/UI/state contract spec, majd kulon activation task | a bypass behavior nem csuszik vissza foundation/threshold slice-ba; az aktivacio kulon taskban tortenik |

## Recommended Task Split

1. `plans/tasks/runtime-review-policy-foundation-and-authority-refactor-phase1.md`
   - cel: canonical ownership bezarasa egy helyre
   - scope:
     - `review_policy` schema/typing
     - single read projection builder a meglevo status/list consume familyhez
     - single mutation seam
     - single threshold-authority resolver API a findings artifact/parity input feloldasara
   - non-goal:
     - teljes web UI rollout
     - bypass behavior
     - vegso threshold UX polish
   - authoring note:
     ezt a taskot ujra kell generalni a current-tree topologyra; a korabbi draft nem retained input.
     a task scope-proofja a meglevo current-tree file-okra kell epuljon, kulonosen:
     `src/types/bubble.ts`,
     `src/config/bubbleConfig.ts`,
     `src/v11/shared/list/listCommandEntryBuilder.ts`,
     `src/v11/shared/list/listCommandApi.ts`,
     `src/v11/shared/status/statusCommandViewBuilder.ts`,
     `src/v11/shared/status/statusCommandApi.ts`,
     valamint a meglevo `src/v11/shared/metaReviewGate/**` parity/report helper entrypointokra.
     Uj `shared/reviewPolicy/**` vagy kulon threshold-authority helper fajl csak output lehet; nem szabad oket ugy targetelni, mintha mar letezo implementation anchorok lennenek.
     A task nem allithat `approved` parent-plan dependencyt, amig ez a plan `draft`.
     A `detail` csak kulon explicit UI/detail entrypointtal ownershipolhato; a jelenlegi tree-ben ez nem backend anchor.

2. `plans/tasks/runtime-review-policy-auto-rework-threshold-phase2.md`
   - cel: a threshold enforce tenyleges szallitasa a canonical gate boundaryn
   - scope:
     - gate routing helper a Phase 1 authority API-ra epulve
     - conservative fallback + diagnostics
     - approval refresh/human gate payload ugyanarra az authority layerre kotve
   - non-goal:
     - bypass contract
     - nagy UI/control surface
   - current status:
     a spec-file mar letezik; a kovetkezo lepes a bubble-scoped implementacio.

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
5. a meglevo status/list backend surface ugyanabbol a projection builderbol.

Current-tree note:
1. `detail` consume nem tekintheto automatikusan Phase 1 current-tree anchornek.
2. Ha a task `detail` surface-et ownershipolni akar, explicitten meg kell neveznie a mai v11 entrypointot, amely ezt a consume familyt kepviseli.
3. A jelenlegi current-tree evidence szerint ez UI/router-presenter compose boundary lenne, nem backend list/status projection boundary.

Ha ezek kozul barmelyik tovabbra is kulon helper-halmazokban el, akkor a kovetkezo threshold task ujra ugyanebbe a review-loop mintaba fog visszacsuszni.

Phase 1 authoring guard:
1. A task target-file listaja nem epulhet tobbsegeben meg nem letezo helper fajlokra.
2. A current-tree reality proofnak mindig meg kell neveznie, mely meglevo config/list/status/meta-review entrypointokbol lesz az extract vagy a refactor.
   A `list/status` consume family reality proofja builder + API entrypoint szintet is nevezzen meg, ha azok mar kulon consume boundaryt alkotnak a current tree-ben.
3. Ha uj helper fajl jon letre, azt implementation outputkent kell kezelni, nem bemeneti scope-bizonyitekkent.

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
   - archived `O2-T9` workflow runtime-capability cleanup ujranyitasa ebbe a lane-be

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
   [plans/archive/tasks/actor-runtime-interface-opportunity2-task9-meta-review-gate-workflow-runtime-capability-residual-closeout.md](/Users/felho/dev/pairflow/plans/archive/tasks/actor-runtime-interface-opportunity2-task9-meta-review-gate-workflow-runtime-capability-residual-closeout.md)
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
   Mitigation: az archived `O2-T9` preserved baseline maradjon kulon boundary; a review-policy Phase 1 ne vallaljon runtime-capability contract cleanupot.

5. Risk: elveszik a bubble-ben megszerzett konkret tudás.
   Mitigation: ezt a plant a bubble diffkategoriak es review findingok alapjan rogzitjuk; a bubble nem merge-olodik, de discovery inputkent megmarad.

6. Risk: a kovetkezo Phase 1 task ujra spekulativ helper-fajlokra epul, es elszakad a current-tree entrypointoktol.
   Mitigation: a tasknak explicit target-file reality proofot kell adnia a meglevo config/list/status/meta-review anchorokrol; uj helper fajl csak output lehet.

7. Risk: a downstream task dependency wording erosebb allapotot allit a parent planrol, mint ami a frontmatterben tenylegesen van.
   Mitigation: amig a plan `draft`, egy downstream task sem nevezheti ezt `approved` baseline-nak; legfeljebb current parent plan refkent hivatkozhat ra.

8. Risk: a downstream taskok tul koran kapnak stabil successor-scope kezelest, mikozben a Phase 1 meg nincs current-tree entrypointokra visszahorgonyozva.
   Mitigation: a downstream taskok maradhatnak valtozatlan splitben, de implementalhato successor baseline-nak csak a Phase 1 re-anchoring utan tekinthetok.

9. Risk: a `detail` consume backend projectionkent kerul Phase 1-be, mikozben a current tree-ben valojaban UI/router-presenter compose family.
   Mitigation: a Phase 1 backend minimum `list/status`; `detail` csak kulon explicit entrypointtal vagy kulon kesobbi lane-ben ownershipolhato.

## Validation Strategy

1. Phase 1 validacioja ne teljes end-to-end rollout legyen, hanem seam-level regresszio:
   - config parse/render,
   - projection builder,
   - mutation seam,
   - threshold authority resolver.
   Es mar a task review szintjen kotelezo legyen a target-file reality check:
   - a bounded slice bizonyitasa meglevo current-tree entrypointokkal,
   - nem phantom helper-targetekkel.
   A consume-family reality proofnak nem eleg helper/builder szinten megallnia; ahol a current tree API entrypointot is kulon tart fenn, azt is nev szerint meg kell nevezni.
   A read-model consume family validacio Phase 1-ben minimum `list/status` legyen; `detail` csak explicit current-tree anchor eseten kotelezo.
   Ha a `detail` consume felmerul, a validacionak kulon bizonyitania kell, hogy backend vagy UI/router-presenter familyrol beszelunk.
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
4. Az archived `O2-T9` closureja current-tree baseline; a Phase 1 indulasa erre epuljon, es ne mozgassa ujra ugyanazt a meta-review gate workflow contract cleanupot.
