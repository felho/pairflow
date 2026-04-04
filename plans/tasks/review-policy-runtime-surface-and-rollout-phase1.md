---
artifact_type: task
artifact_id: task_review_policy_runtime_surface_and_rollout_phase1_v1
title: "Review Policy Runtime Surface and Rollout (Phase 1)"
status: draft
phase: phase1
target_files:
  - src/types/bubble.ts
  - src/config/bubbleConfig.ts
  - src/core/bubble/bubbleLookup.ts
  - src/core/bubble/listBubbles.ts
  - src/core/bubble/metaReview.ts
  - src/core/ui/router.ts
  - src/core/ui/presenters/bubblePresenter.ts
  - src/types/ui.ts
  - src/v11/shared/metaReviewGate/metaReviewGateRecoveryParity.ts
  - src/v11/shared/metaReviewGate/metaReviewGateStateHelpers.ts
  - ui/src/lib/types.ts
  - ui/src/lib/api.ts
  - ui/src/components/actions/ActionBar.tsx
  - ui/src/components/canvas/BubbleExpandedCard.tsx
  - tests/core/bubble/metaReview.test.ts
  - tests/core/ui/router.test.ts
  - tests/core/ui/bubblePresenter.test.ts
  - tests/v11/shared/metaReviewGate/metaReviewGateRecoveryParity.test.ts
  - ui/src/lib/api.test.ts
  - ui/src/components/actions/ActionBar.test.tsx
  - README.md
  - docs/pairflow-initial-design.md
prd_ref: null
plan_ref: plans/actor-runtime-interface-discovery-and-migration-plan-v1.md
system_context_ref: README.md
owners:
  - "felho"
---

# Task: Review Policy Runtime Surface and Rollout (Phase 1)

## L0 - Policy

### Goal

Vezessunk be egy workflow/orchestrator-owned `review_policy` runtime surface-et, amely egy helyen hordozza a review-loop operatori szabalyait, es Phase 1-ben mar tenylegesen kiszolgalja az `auto_rework_min_severity` igenyt.
Ugyanez a surface keszuljon fel a `reviewer bypass` / `meta_only` loop kesobbi aktivaciora is, de annak tenyleges handoff-topologiai bekotese maradjon Phase E utani, actor-runtime-cutover-fuggo follow-up.

### Context

1. A jelenlegi Pairflow egyetlen workflow-t futtat, de a jovobeli irany szerint kesobb workflow-konfiguralhato rendszer fele megyunk.
2. Emiatt a `review policy` ownershipa nem actor-, hanem workflow/orchestrator-szintu kell legyen.
3. Ez nem zarja ki, hogy policy-hatasu informacio bekeruljon actor inputba vagy promptba; a lenyeg az, hogy az actor ne kozvetlenul a workflow policy forrasat olvassa, hanem az orchestrator altal levezetett futasi inputot kapja.
4. A felhasznaloi igeny ket, egymast kiegeszito reszbol all:
   - minimum severity alapjan automatikus rework threshold,
   - reviewer bypass, ahol a loop implementer <-> meta-reviewer iranyba egyszerusitheto.
5. A ket igeny kozul csak az elobbi szallithato most biztonsagosan a jelenlegi handoff-topologia mellett; a bypass mar explicit reviewer/meta-reviewer cutover-fuggo valtozas.
6. A migration spine szerint a cutover sorrend `implementer` -> `reviewer` -> `meta_reviewer`, es a `reviewer` illetve `meta_reviewer` ainda kulon Phase E szeletek.

### In Scope

1. Workflow-owned `review_policy` schema bevezetese a bubble runtime-konfiguracioban.
2. A schema minimuma:
   - `loop_mode = "full" | "meta_only"`
   - `auto_rework_min_severity = "P1" | "P2" | "P3"`
3. Phase 1-ben az `auto_rework_min_severity` tenyleges enforce-olasa a meta-review routing/recommendation boundary menten.
4. Phase 1-ben a `loop_mode` schemajanak, UI/API projectionjenek es rollout guardjainak bevezetese ugy, hogy a `meta_only` aktivacio meg explicitten blokkolt vagy unsupported legyen a cutover prerequisite-ek nelkul.
5. UI/API/state projection, hogy az operator lassa es allithassa a review policy-t.
6. Dokumentacios pontositas a `review policy` ownershiparol es a Phase 1 vs kesobbi bypass rolloutrol.

### Out of Scope

1. A `meta_only` loop tenyleges handoff-topologiai implementacioja.
2. Implementer/reviewer/meta-reviewer actor-runtime cutover vegrehajtasa.
3. Altalanos workflow engine vagy multi-workflow runtime bevezetese.
4. Uj actor primitive vagy uj output family bevezetese.
5. A reviewer vagy meta-reviewer prompt/guidance teljes redesignja a Phase 1 threshold-on tul.

### Safety Defaults

1. A `review_policy` workflow/orchestrator-owned surface; actor nem olvashatja kozvetlen canonical forraskent a bubble policy configot routolas vagy authority-dontes celjabol.
2. Actorok kaphatnak policy-derived futasi inputot, promptot vagy decision constraintet, de a policy ertelmezese az orchestratorban marad.
3. Phase 1-ben a `loop_mode=meta_only` persisted/visible lehet, de aktiv runtime behavior csak explicit gate mellett, cutover prerequisite-ek utan engedheto; addig fail-closed vagy explicit unsupported outcome kell.
4. A `auto_rework_min_severity` enforce nem lazithatja a jelenlegi fail-closed findings parity es explicit authority invariantokat.
5. A task nem nyithatja ujra a reviewer/meta-reviewer handoff-topologiat opportunistikus shortcutokkal.

### Contract Boundary / Blast Radius

1. `contract_boundary_override`: `yes`
2. Erintett contractok:
   - bubble config contract,
   - UI/API config mutation and projection contract,
   - meta-review routing/recommendation threshold semantics,
   - future workflow-owned review-policy surface.

### Normative Reference Policy

1. `plan_ref`: `plans/actor-runtime-interface-discovery-and-migration-plan-v1.md`
   - Ez a canonical umbrella a reviewer/meta-reviewer cutover sequencinghez.
2. Binding rollout input:
   - `plans/tasks/actor-runtime-interface-migration-spine-phaseD-plan.md`
   - Ez rogzitette, hogy a reviewer es meta-reviewer cutover kesobbi szelet, nem Phase 1 shortcut.
3. Binding reviewer cutover input:
   - `plans/archive/tasks/actor-runtime-interface-reviewer-cutover-phaseE.md`
4. Binding meta-reviewer cutover input:
   - `plans/tasks/actor-runtime-interface-meta-reviewer-cutover-phaseE.md`
5. Informational grounding:
   - `docs/pairflow-initial-design.md`
   - `docs/pairflow-ui-prd.md`
   - `docs/review-loop-optimization.md`

### Terminology Lock

1. `review_policy` = workflow/orchestrator-owned runtime policy object, nem actor-owned config.
2. `loop_mode` = a review-loop topology magas szintu modja (`full` vagy `meta_only`).
3. `auto_rework_min_severity` = az a minimum severity, amelytol a meta-review recommendation/routing Phase 1-ben automatikusan `rework` fele erosodik.
4. `policy-derived actor input` = orchestrator altal eloallitott futasi input, prompt vagy decision constraint, amely policybol kovetkezik, de nem policy-forraskent kerul az actorhoz.
5. `Phase 1 rollout guard` = explicit runtime tiltasa annak, hogy a `meta_only` loop a cutover prerequisite-ek nelkul bekapcsolhato legyen.

## L1 - Change Contract

### 1) Call-site Matrix

| ID | File | Function/Entry | Exact Signature (args -> return) | Insertion Point | Expected Behavior | Priority | Timing | Evidence |
|---|---|---|---|---|---|---|---|---|
| CS1 | `src/types/bubble.ts` | bubble config types | config/state/ui-facing TS types -> typed review policy support | `BubbleConfig` kozeleben | Uj workflow-owned `review_policy` shape jelenik meg canonical bubble configkent, benne `loop_mode` es `auto_rework_min_severity` | P1 | required-now | T1 |
| CS2 | `src/config/bubbleConfig.ts` | parse/render validation | bubble TOML parse/render -> validated config | bubble config schema/renderer | A config parser/renderer tamogatja a `review_policy` blokkot, fail-closed validacioval es defaults-szal | P1 | required-now | T1, T2 |
| CS3 | `src/core/bubble/bubbleLookup.ts`, `src/core/bubble/listBubbles.ts` | config load / projection | config lookup/list -> hydrated runtime views | bubble load and list entry build | A review policy runtime-szinten olvashato es status/list projectionbe bekerul | P1 | required-now | T3 |
| CS4 | `src/core/bubble/metaReview.ts` | meta-review prompt/input shaping | meta-review run prep -> policy-derived runner input/prompt | meta-review run prompt build and run preparation | A meta-reviewer policy-derived inputot kap az `auto_rework_min_severity` szemantikajarol, de a policy forras ownershipa nem csuszik at az actorhoz | P1 | required-now | T4, T5 |
| CS5 | `src/v11/shared/metaReviewGate/metaReviewGateStateHelpers.ts`, `src/v11/shared/metaReviewGate/metaReviewGateRecoveryParity.ts` | route decision helpers | meta-review parity/routing helper -> bounded route decision | recommendation/budget resolution kornyeken | Phase 1-ben a threshold enforce a canonical routing boundaryn is jelen van, nem csak prompt-szinten | P1 | required-now | T5, T6 |
| CS6 | `src/core/ui/router.ts`, `src/core/ui/presenters/bubblePresenter.ts`, `src/types/ui.ts` | UI/API contract | UI read/write endpoints -> projected bubble review policy | bubble detail/list API es presenter | A UI latja a review policy allapotat, es van thin API surface a modositasara | P1 | required-now | T3, T7 |
| CS7 | `ui/src/lib/types.ts`, `ui/src/lib/api.ts`, `ui/src/components/actions/ActionBar.tsx`, `ui/src/components/canvas/BubbleExpandedCard.tsx` | web UI review-policy controls | client types/api/components -> operator controls | expanded bubble action/config area | A UI megjeleniti es allitja a policyt; `meta_only` Phase 1-ben explicit guarddal vagy disabled allapotban szerepel | P1 | required-now | T7, T8 |
| CS8 | `README.md`, `docs/pairflow-initial-design.md` | operator-facing semantics | docs text -> updated policy ownership and rollout note | relevant config/runtime sections | A docs explicitten kimondja, hogy a review policy workflow-owned, es a `meta_only` activation Phase 1-ben meg nincs bekotve | P2 | required-now | T9 |

### 2) Data and Interface Contract

| Contract | Current | Target | Required Fields | Optional Fields | Compatibility | Priority | Timing |
|---|---|---|---|---|---|---|---|
| Bubble config review policy | nincs canonical review policy object | workflow-owned `review_policy` object a bubble configban | `loop_mode`, `auto_rework_min_severity` | parse warning / future extension note | breaking config-surface addition with explicit validation | P1 | required-now |
| Review policy ownership | review-loop szabalyok jelenleg szetszorva, implicitten tobbreteguek | canonical ownership az orchestrator/workflow oldalon | workflow-owned canonical source, runtime projection, fail-closed validation | policy-derived prompt/input metadata | internal ownership hardening | P1 | required-now |
| Meta-review Phase 1 threshold semantics | auto rework jelenleg severity-unaware budget route | threshold-aware route shaping a canonical meta-review boundaryn | `auto_rework_min_severity`, findings severity aggregate, existing parity metadata | advisory diagnostics | compatibility-tightening | P1 | required-now |
| `loop_mode` rollout semantics | nincs loop topology config surface | persisted + UI-visible config, de `meta_only` Phase 1-ben gated | persisted value, explicit support status, unsupported/fail-closed handling | future rollout metadata | staged compatibility surface | P1 | required-now |
| Actor input relationship to policy | prompt/input policy-hatasu adatok ad hoc jelleggel mehetnek actorhoz | orchestrator-derived actor input explicit ownership rule-lel | derived instruction/constraint only | actor-facing explanatory text | ownership clarification, not actor-owned config | P1 | required-now |

Normative rules:

1. A canonical `review_policy` workflow/orchestrator-owned; actorok nem olvashatjak a bubble config review policy blockjat routolasi authorityval vagy workflow-dontessel.
2. Actorhoz policy-derived input mehet:
   - prompt,
   - run input,
   - decision constraint,
   - explanatory metadata.
3. A policy-derived actor input nem valhat canonical policy source-sza; mismatch eseten az orchestrator/kernel dontes az authoritative.
4. Phase 1-ben a `loop_mode=meta_only` nem hozhat letre tenyleges implementer <-> meta-reviewer handoff topologiat; explicit reject, disabled UI vagy equivalent fail-closed viselkedes kotelezo.
5. Phase 1-ben az `auto_rework_min_severity` legalabb `P1|P2|P3` domainen valid; invalid ertek parse-time reject.
6. A `review_policy` shape legyen Pairflow-current-workflow specifikus, de ne zárja el a kesobbi workflow-specific defaults vagy higher-level workflow policy iranyat.

### 3) Side Effects Contract

| Area | Allowed | Forbidden | Notes | Priority | Timing |
|---|---|---|---|---|---|
| Bubble config | uj `review_policy` config schema parse/render | ad hoc top-level flag-ek szetszorasa ugyanennek a policynek | egy canonical policy surface kell | P1 | required-now |
| Meta-review routing | threshold-aware route/recommendation shaping | prompt-only “best effort” implementacio enforce nelkul | a route boundary ismerje a thresholdot | P1 | required-now |
| UI/API | policy projection es mutation surface | UI-only local state hack runtime persistence nelkul | thin shared-core delegated behavior kell | P1 | required-now |
| Reviewer bypass | schema/persistence/visibility/guard | tenyleges handoff-topologiai bypass Phase 1-ben | rollout-sequenced future slice | P1 | required-now |
| Actor guidance | policy-derived input explicit shaping | actor-owned direct config read | ownership-separation kotelezo | P1 | required-now |

Constraint:

1. A `meta_only` Phase 1 supportja nem lehet “soft enabled but maybe works”; explicit disabled/unsupported semantics kell.

### 4) Error and Fallback Contract

| Trigger | Dependency (if any) | Behavior (`throw|result|fallback`) | Fallback Value/Action | Reason Code | Log Level | Priority | Timing |
|---|---|---|---|---|---|---|---|
| invalid `review_policy.loop_mode` | bubble config parse | throw | config reject | `REVIEW_POLICY_LOOP_MODE_INVALID` | error | P1 | required-now |
| invalid `review_policy.auto_rework_min_severity` | bubble config parse | throw | config reject | `REVIEW_POLICY_SEVERITY_INVALID` | error | P1 | required-now |
| `meta_only` mode aktivacio Phase 1 prerequisite nelkul | runtime policy mutation or load | result | explicit unsupported/disabled state; no topology change | `REVIEW_POLICY_LOOP_MODE_UNSUPPORTED` | warn | P1 | required-now |
| meta-review thresholdhez nem elegendo finding severity info | parity/routing helper | fallback | meglovo conservative route marad + diagnostic | `REVIEW_POLICY_THRESHOLD_CONTEXT_INCOMPLETE` | warn | P1 | required-now |
| actor input shapingnel policy-derived metadata hianyzik | orchestrator/meta-review prep | fallback | safe default to current conservative behavior | `REVIEW_POLICY_DERIVED_INPUT_MISSING` | warn | P2 | required-now |
| UI mutation stale bubble state-re fut | UI/API action | result | 409 + fresh bubble payload | `REVIEW_POLICY_STATE_CONFLICT` | warn | P2 | required-now |

Normative rules:

1. A `meta_only` unsupported fallback nem lehet silent no-op olyan modon, hogy az operator azt higgye, a bypass aktiv.
2. Ha a threshold enforce-hoz a meta-review parity input hianyzik, a rendszer a jelenlegi konzervativabb route-ot valassza, ne agresszivebb auto-reworkot.

### 5) Dependency Constraints

| Type | Items | Priority | Timing |
|---|---|---|---|
| must-use | `plans/actor-runtime-interface-discovery-and-migration-plan-v1.md` | P1 | required-now |
| must-use | `plans/tasks/actor-runtime-interface-migration-spine-phaseD-plan.md` | P1 | required-now |
| must-use | `plans/archive/tasks/actor-runtime-interface-reviewer-cutover-phaseE.md` | P1 | required-now |
| must-use | `plans/tasks/actor-runtime-interface-meta-reviewer-cutover-phaseE.md` | P1 | required-now |
| must-use | shared core modules for UI/API behavior | P1 | required-now |
| must-not-use | actor-owned direct read of canonical workflow review policy | P1 | required-now |
| must-not-use | Phase 1 reviewer/meta-reviewer bypass handoff implementation | P1 | required-now |
| must-not-use | prompt-only threshold support routing enforce nelkul | P1 | required-now |
| must-not-use | altalanos workflow-engine abstraction | P2 | required-now |

### 6) Test Matrix

| ID | Scenario | Given | When | Then | Priority | Timing | Evidence |
|---|---|---|---|---|---|---|---|
| T1 | config parse/render supports review policy | valid bubble TOML `review_policy` blockkal | parse + render lefut | a policy canonical formaban round-tripol | P1 | required-now | automated test |
| T2 | invalid policy values fail-closed | invalid `loop_mode` vagy severity szerepel | config load megtortenik | explicit validation error jon | P1 | required-now | automated test |
| T3 | review policy projected in bubble views | bubble config review policyval letezik | list/detail UI payload keszul | a policy projected es olvashato | P1 | required-now | automated test |
| T4 | actor input can receive policy-derived constraints | threshold be van allitva | meta-review prep lefut | a meta-review runner input/prompt tartalmazhat policy-derived instructiont ownership-serules nelkul | P1 | required-now | automated test |
| T5 | threshold enforce route boundaryn is jelen van | `auto_rework_min_severity=P2`, meta-review open P2 findinget lat | route decision megtortenik | a route nem csak prompt-szintu, hanem canonical helper-szintu thresholdot is figyelembe veszi | P1 | required-now | automated test |
| T6 | incomplete severity context conservative marad | threshold be van allitva, de parity/severity context hianyos | route decision megtortenik | explicit diagnostic mellett conservative fallback marad | P1 | required-now | automated test |
| T7 | UI/API can mutate review policy | operator policyt allit a bubble-n | API mutation lefut | persisted review policy frissul es uj bubble payload visszajon | P1 | required-now | automated test |
| T8 | `meta_only` Phase 1-ben guarded | operator `meta_only` modot akar bekapcsolni | UI/API action megtortenik | explicit disabled/unsupported semantics latszik; nincs topology valtozas | P1 | required-now | automated test |
| T9 | docs clarify ownership and rollout | task szerint docs diff szukseges | docs review megtortenik | a docs kimondja a workflow-owned policy ownershipot es a Phase 1 vs later bypass sequencinget | P2 | required-now | doc diff |

## L2 - Implementation Notes (Optional)

1. [later-hardening] Később külön follow-up taskban lehet a `meta_only` loop activationt a reviewer + meta-reviewer cutover completionhöz kötve ténylegesen bekötni.
2. [later-hardening] Ha később több workflow jelenik meg, a `review_policy` fölé kerülhet workflow-level default/override réteg, de ezt a Phase 1 nem modellezi.
3. [later-hardening] Ha a UI-ban a `meta_only` disabled állapot túl homályos, külön operator-copy/task nyitható a rollout messagingre.

## Hardening Backlog (Optional)

| ID | Item | Layer | Priority | Timing | Source | Proposed Action |
|---|---|---|---|---|---|---|
| H1 | `meta_only` activation follow-up | L2 | P2 | later-hardening | rollout sequencing | Kulon implementation task reviewer/meta-reviewer cutover utan |
| H2 | multi-workflow policy layering | L2 | P3 | later-hardening | future architecture direction | Kulon plan/task, ha a workflow engine irany konkretizalodik |
| H3 | richer policy-derived actor input contract | L2 | P3 | later-hardening | prompt/guidance hardening | Kulon actor-guidance task, ha a Phase 1 threshold elegtelennek bizonyul |

## Review Control

1. Every finding must include: `priority`, `timing`, `layer`, `evidence`.
2. Ne fogadjunk el olyan implementaciot, amely a `review_policy` canonical ownershipat az actorokba tolja.
3. Ne fogadjunk el olyan Phase 1 megoldast, amely a `meta_only` loopot csendben vagy reszlegesen bekapcsolja explicit rollout guard nelkul.
4. A prompt/guidance-only threshold support nem eleg; route-boundary enforcement kotelezo.
5. A kesobbi workflow-configurability jovoideju irany lehet shaping input, de nem indok altalanos workflow engine bevezetesere ebben a taskban.

## Spec Lock

Task allapot `IMPLEMENTABLE`, ha a `review_policy` canonical schemaja, a Phase 1 threshold enforce, a UI/API projection/mutation es a `meta_only` rollout guard mind explicit, tesztelt, es nem serul a workflow-owned ownership szabaly.
