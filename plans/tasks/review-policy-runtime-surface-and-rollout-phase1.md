---
artifact_type: task
artifact_id: task_review_policy_runtime_surface_and_rollout_phase1_v1
title: "Review Policy Runtime Surface and Rollout (Phase 1)"
status: implementable
phase: phase1
target_files:
  - src/types/bubble.ts
  - src/config/bubbleConfig.ts
  - src/core/bubble/bubbleLookup.ts
  - src/core/bubble/listBubbles.ts
  - src/core/bubble/statusBubble.ts
  - src/core/bubble/updateBubbleReviewPolicy.ts
  - src/core/bubble/metaReview.ts
  - src/core/ui/router.ts
  - src/core/ui/presenters/bubblePresenter.ts
  - src/types/ui.ts
  - src/v11/shared/metaReviewGate/metaReviewGateFindingsParityInput.ts
  - src/v11/shared/metaReviewGate/metaReviewGateFindingsParityHelpers.ts
  - src/v11/shared/status/statusCommandViewBuilder.ts
  - src/v11/shared/metaReviewGate/metaReviewGateRecoveryParity.ts
  - src/v11/shared/metaReviewGate/metaReviewGateStateHelpers.ts
  - ui/src/lib/types.ts
  - ui/src/lib/api.ts
  - ui/src/components/actions/ActionBar.tsx
  - ui/src/components/canvas/BubbleExpandedCard.tsx
  - tests/core/bubble/metaReview.test.ts
  - tests/core/ui/router.test.ts
  - tests/core/ui/bubblePresenter.test.ts
  - tests/core/bubble/statusBubble.test.ts
  - tests/core/bubble/updateBubbleReviewPolicy.test.ts
  - tests/v11/shared/metaReviewGate/metaReviewGateRecoveryParity.test.ts
  - tests/v11/shared/metaReviewGate/metaReviewGateFindingsParityHelpers.test.ts
  - tests/cli/bubbleStatusCommand.test.ts
  - ui/src/lib/api.test.ts
  - ui/src/components/actions/ActionBar.test.tsx
  - README.md
  - docs/pairflow-initial-design.md
prd_ref: null
plan_ref: plans/actor-runtime-interface-discovery-and-migration-plan-v1.md
system_context_ref: README.md
normative_refs:
  - plans/actor-runtime-interface-discovery-and-migration-plan-v1.md
  - plans/tasks/actor-runtime-interface-migration-spine-phaseD-plan.md
  - plans/archive/tasks/actor-runtime-interface-reviewer-cutover-phaseE.md
  - plans/archive/tasks/actor-runtime-interface-meta-reviewer-cutover-phaseE.md
  - docs/pairflow-initial-design.md
owners:
  - "felho"
---

# Task: Review Policy Runtime Surface and Rollout (Phase 1)

## L0 - Policy

### Goal

Vezessunk be egy workflow/orchestrator-owned `review_policy` runtime surface-et, amely:
1. Phase 1-ben mar tenylegesen kiszolgalja az `auto_rework_min_severity` igenyt a canonical meta-review routing boundaryn,
2. elokesziti a kesobbi `meta_only` / reviewer-bypass irany runtime surface-et,
3. de nem kapcsolja be a reviewer bypass tenyleges handoff-topologiajat addig, amig a reviewer es meta-reviewer cutover prerequisite-ek nincsenek keszen.

Ez a task akkor sikeres, ha:
1. a canonical `review_policy` ownership explicitten workflow/orchestrator oldalon marad,
2. az `auto_rework_min_severity` enforce nem csak prompt-szinten, hanem a routing/recommendation boundaryn is megjelenik,
3. a `meta_only` csak guarded rollout surface-kent jelenik meg,
4. a surfaced operatori allapot egyertelmuen kulonbseget tesz a kert policy es a tenylegesen ervenyes runtime viselkedes kozott,
5. a task nem hozza elore sem a reviewer, sem a meta-reviewer cutoverhez kotott bypass-aktivaciot.

### Context

1. A jelenlegi Pairflow egyetlen workflow-t futtat, de a jovo iranya workflow-konfiguralhato rendszer.
2. Emiatt a `review_policy` ownershipa nem actor-, hanem workflow/orchestrator-szintu kell legyen.
3. Actor kaphat policy-derived inputot vagy constraintet, de nem olvashatja a canonical workflow policyt authority-forraskent.
4. A felhasznaloi igeny ket kulon szelet:
   - minimum severity alapu automatikus rework threshold,
   - reviewer bypass / `meta_only` loop.
5. Phase 1-ben csak az elso szelet aktiv implementacios scope. A masodik szelet ebben a fazisban csak surfaced, guarded rollout contract lehet.
6. A migration spine szerint a cutover sorrend `implementer` -> `reviewer` -> `meta_reviewer`.
7. A `reviewer` es `meta_reviewer` tovabbra is Phase E szeletek, ezert Phase 1-ben nincs jogalap a tenyleges bypass topologia bekapcsolasara.

### In Scope

1. Workflow-owned `review_policy` schema bevezetese a bubble runtime-konfiguracioban.
2. A schema minimuma:
   - `loop_mode = "full" | "meta_only"`
   - `auto_rework_min_severity = "P1" | "P2" | "P3"`
   - `P0` nem configurable threshold-ertek Phase 1-ben, mert tovabbra is non-negotiable fail-closed blocking severity, nem operator-tunable review-policy kategoria.
3. Phase 1-ben az `auto_rework_min_severity` tenyleges enforce-olasa a meta-review routing/recommendation boundary menten.
4. A `loop_mode` surfaced rollout contractjanak bevezetese ugy, hogy a `meta_only` kert allapot lehet visible es persisted, de effective runtime modkent tovabbra sem engedelyezett a prerequisite-ek nelkul.
5. UI/API/state projection ugy, hogy az operator lassa:
   - mi a kert policy,
   - mi az effective runtime mod,
   - miert guarded vagy unsupported a `meta_only`.
6. Thin mutation surface a policy modositasara ugy, hogy a `meta_only` Phase 1-ben nem tud csendben aktiv viselkedesse valni.
7. Dokumentacios pontositas a `review_policy` ownershiparol es a Phase 1 vs kesobbi bypass rolloutrol.

### Out of Scope

1. A `meta_only` loop tenyleges implementer <-> meta-reviewer handoff-topologiai implementacioja.
2. Implementer/reviewer/meta-reviewer actor-runtime cutover vegrehajtasa.
3. A reviewer vagy meta-reviewer Phase E taskok scope-janak reszleges elorehozatala.
4. Altalanos workflow engine vagy multi-workflow runtime bevezetese.
5. Uj actor primitive vagy uj output family bevezetese.
6. Olyan UI/UX, amely azt sugallja, hogy a `meta_only` mar effective runtime mod.

### Safety Defaults

1. A `review_policy` canonical source workflow/orchestrator-owned surface; actor nem olvashatja ezt routolasi vagy authority-dontesi canonical forraskent.
2. Actor csak policy-derived inputot, promptot vagy decision constraintet kaphat.
3. Phase 1-ben a `meta_only` kert/persisted ertekkent jelen lehet, de effective runtime viselkedes nem lehet, amig legalabb a reviewer es meta-reviewer cutover prerequisite-ek nincsenek teljesitve.
4. A surfaced state nem lehet ketertelmu:
   - az operatornak latnia kell, ha a kert `meta_only` csak planned/guarded allapot,
   - es azt is, hogy a runtime tovabbra is `full` modban fut.
5. Az `auto_rework_min_severity` enforce nem lazithatja a meglevo fail-closed findings parityt, authority invariantokat vagy conservative fallbackot.
6. A task nem nyithat opportunistic shortcutot a reviewer/meta-reviewer handoff-topologiara.

### Deliverable Shape Lock

1. A kotelezo deliverable egy implementalhato task artifact, nem rollout osszefoglalo es nem uj kulon review dokumentum.
2. A tasknak explicitten el kell kulonitenie:
   - a canonical Phase 1 szallitast (`auto_rework_min_severity` enforce),
   - a surfaced-but-guarded rollout surface-et (`loop_mode=meta_only`),
   - a kesobbi prerequisite-gated aktivaciot.
3. A task nem maradhat olyan homalyos, hogy implementacio kozben implicit dontes kelljen:
   - mi a requested policy surface,
   - mi az effective runtime behavior,
   - mi a blocked/unsupported jelzes minimuma.
4. `README.md` es `docs/pairflow-initial-design.md` csak annyiban kotelezo target, amennyiben user-visible ownership vagy rollout semantics pontosodik.

### Contract Boundary / Blast Radius

1. `contract_boundary_override`: `yes`
2. Erintett contractok:
   - bubble config contract,
   - UI/API config mutation and projection contract,
   - meta-review routing/recommendation threshold semantics,
   - effective-vs-requested loop-mode projection contract,
   - future workflow-owned review-policy surface.

### Normative Reference Policy

1. `plan_ref`: `plans/actor-runtime-interface-discovery-and-migration-plan-v1.md`
   - Ez a canonical umbrella a reviewer/meta-reviewer cutover sequencinghez.
2. Binding rollout input:
   - `plans/tasks/actor-runtime-interface-migration-spine-phaseD-plan.md`
   - Ez rogziti, hogy a bypass tenyleges aktivalasa csak a Phase E sorrend utan vedheto.
3. Binding reviewer prerequisite:
   - `plans/archive/tasks/actor-runtime-interface-reviewer-cutover-phaseE.md`
4. Binding meta-reviewer prerequisite:
   - `plans/archive/tasks/actor-runtime-interface-meta-reviewer-cutover-phaseE.md`
5. Informational grounding:
   - `docs/pairflow-initial-design.md`
6. Precedence rule:
   - rollout sorrendhez es prerequisite-ekhez a Phase D es Phase E artifactok authoritative-ek,
   - Phase 1 surface shape-hez ez a task authoritative,
   - current code csak grounding evidence.

### Terminology Lock

1. `review_policy` = workflow/orchestrator-owned runtime policy object, nem actor-owned config.
2. `requested_loop_mode` = a bubble configban vagy UI/API mutationon keresztul kert topology-mod.
3. `effective_loop_mode` = az a runtime mod, amelyet a scheduler/router tenylegesen ervenyesit.
4. `support_status` = operator-visible allapot arrol, hogy a kert mod `enabled`, `guarded`, vagy `unsupported` a jelenlegi prerequisite-ek mellett.
5. `auto_rework_min_severity` = az a minimum severity, amelytol a meta-review recommendation/routing Phase 1-ben automatikusan `rework` fele erosodik.
6. `policy-derived actor input` = orchestrator altal eloallitott futasi input vagy constraint, amely policybol kovetkezik, de nem canonical policy source.
7. `Phase 1 rollout guard` = explicit runtime tiltasa annak, hogy a `meta_only` effective runtime modda valjon a prerequisite-ek elott.

## L1 - Change Contract

### 1) Call-site Matrix

| ID | File | Function/Entry | Contract delta | Priority | Timing | Evidence |
|---|---|---|---|---|---|---|
| CS1 | `src/types/bubble.ts` | bubble config and runtime types | Canonical `review_policy` shape jelenjen meg workflow-owned configkent, es kulon typelt requested/effective/support projectiont tegyen lehetove | P1 | required-now | T1, T3 |
| CS2 | `src/config/bubbleConfig.ts` | parse/render validation | A config parser/renderer tamogassa a `review_policy` blokkot explicit defaults-szal es fail-closed validacioval | P1 | required-now | T1, T2 |
| CS3 | `src/core/bubble/bubbleLookup.ts`, `src/core/bubble/listBubbles.ts`, `src/core/bubble/statusBubble.ts`, `src/v11/shared/status/statusCommandViewBuilder.ts` | config load / projection | A bubble detail, list es status backend projection forrasai ugyanazt a canonical review-policy requested/effective/support surface-et projekciozzak; a `BubbleStatusView` / status builder path explicit implementation target | P1 | required-now | T3, T10, T13 |
| CS4 | `src/core/bubble/updateBubbleReviewPolicy.ts`, `src/core/ui/router.ts` | canonical mutation write path | A review-policy mutation canonical read-modify-write + lock/freshness/conflict seam-je explicit legyen; a router csak ezt az egy shared-core persistence seamet hivja, nem sajat inline TOML/state write logikat | P1 | required-now | T4, T9, T15 |
| CS5 | `src/core/bubble/metaReview.ts` | meta-review prompt/input shaping | A meta-reviewer policy-derived inputot kaphat a thresholdrol, de a canonical ownership nem csuszhat at az actorhoz | P1 | required-now | T5 |
| CS6 | `src/v11/shared/metaReviewGate/metaReviewGateFindingsParityInput.ts`, `src/v11/shared/metaReviewGate/metaReviewGateFindingsParityHelpers.ts`, `src/v11/shared/metaReviewGate/metaReviewGateStateHelpers.ts`, `src/v11/shared/metaReviewGate/metaReviewGateRecoveryParity.ts` | route decision helpers | Phase 1-ben a threshold enforce a canonical routing boundaryn is jelenjen meg, es a severity threshold canonical inputja explicitten a same-round meta-review findings artifact/parity input + parity-helper validation surface legyen, nem ad hoc reviewer snapshot vagy masodlagos derived metadata | P1 | required-now | T6, T7, T8 |
| CS7 | `src/core/ui/router.ts`, `src/core/ui/presenters/bubblePresenter.ts`, `src/types/ui.ts` | UI/API contract | A UI/API payload kulon mutassa a requested policyt, az effective loop modot es a support/blocked allapotot, es ez a detail/status backend projectionnel ugyanarra a canonical view-build surface-re tamaszkodjon | P1 | required-now | T3, T9, T10, T11, T12, T13 |
| CS8 | `ui/src/lib/types.ts`, `ui/src/lib/api.ts`, `ui/src/components/actions/ActionBar.tsx`, `ui/src/components/canvas/BubbleExpandedCard.tsx` | web UI review-policy controls | Az operator allithassa a supported policy mezoket, de a `meta_only` Phase 1-ben csak explicit guarded/unsupported copyval szerepelhet | P1 | required-now | T8, T9 |
| CS9 | `README.md`, `docs/pairflow-initial-design.md` | operator-facing semantics | A docs mondja ki, hogy a review policy workflow-owned, es hogy a `meta_only` surfaced Phase 1-ben, de effective aktivalasa kesobbi prerequisite-ekhez kotott | P2 | required-now | T14 |

### 2) Data and Interface Contract

| Contract | Current | Target | Required Fields | Optional Fields | Compatibility | Priority | Timing |
|---|---|---|---|---|---|---|---|
| Bubble config review policy | nincs canonical review policy object | workflow-owned `review_policy` object a bubble configban | `loop_mode`, `auto_rework_min_severity` | future extension note | additive config surface explicit defaults-szal | P1 | required-now |
| Review policy ownership | review-loop szabalyok szetszorva, implicit ownershiptal | canonical ownership az orchestrator/workflow oldalon | workflow-owned canonical source, runtime projection, fail-closed validation | policy-derived prompt/input metadata | ownership hardening | P1 | required-now |
| Requested vs effective loop mode | nincs explicit separation | requested/effective projection explicit elvalasztasa | `requested_loop_mode`, `effective_loop_mode`, `support_status` | `blocked_reason_code`, `blocked_prerequisites` | new projection, de fail-closed | P1 | required-now |
| Review policy mutation surface | mutation semantics implicit | thin, bounded mutation contract a requested policy mezokre, explicit canonical persistence seam-mel | `loop_mode`, `auto_rework_min_severity`, state/version guard vagy equivalent freshness guard | mutation provenance/diagnostic metadata | explicit write boundary hardening | P1 | required-now |
| Detail/status backend projection | UI-facing review policy projection forrasa implicit | explicit canonical backend projection forras a detail es status surface-hez | `requested_loop_mode`, `effective_loop_mode`, `support_status` | `blocked_reason_code`, `blocked_prerequisites` | projection hardening hidden-discovery nelkul | P1 | required-now |
| Meta-review Phase 1 threshold semantics | auto rework jelenleg severity-unaware budget route | threshold-aware route shaping a canonical meta-review boundaryn explicit source-of-truth inputtal | `auto_rework_min_severity`, same-round findings artifact/parity input, parity-helper validated findings severity aggregate | advisory diagnostics | compatibility-tightening | P1 | required-now |
| Actor input relationship to policy | policy-hatasu adatok ad hoc modon mehetnek actorhoz | orchestrator-derived actor input explicit ownership rule-lel | derived instruction/constraint only | actor-facing explanatory text | ownership clarification | P1 | required-now |

Normative rules:

1. A canonical `review_policy` workflow/orchestrator-owned; actorok nem olvashatjak a bubble config review policy blockjat routolasi authorityval vagy workflow-dontessel.
2. Actorhoz policy-derived input mehet:
   - prompt,
   - run input,
   - decision constraint,
   - explanatory metadata.
3. A policy-derived actor input nem valhat canonical policy source-sza; mismatch eseten az orchestrator dontes az authoritative.
4. Phase 1-ben a `requested_loop_mode=meta_only` nem eredmenyezhet `effective_loop_mode=meta_only` runtime viselkedest.
5. Ha az operator `meta_only` modot ker, a projection minimuma:
   - a kert mod latsszon,
   - az effective mod tovabbra is `full` legyen,
   - a support allapot es a blocked ok explicit legyen.
6. A `support_status` Phase 1 domainje explicit: `enabled | guarded | unsupported`.
7. `enabled` csak akkor megengedett, ha a kert policy effective runtime viselkedesse is valhat az aktualis prerequisite-ek mellett.
8. `guarded` azt jelenti, hogy a kert policy persisted/visible lehet, de az effective runtime viselkedes fail-closed modon konzervativ marad.
9. `unsupported` azt jelenti, hogy a kert policy surface jelenleg nem ervenyesitheto ebben a runtime vagy mutation kontextusban, es a kerest explicit outcome-kent kell visszaadni.
10. A mutation surface csak a requested policy mezoit irhatja; `effective_loop_mode`, `support_status`, `blocked_reason_code` es `blocked_prerequisites` runtime-derived/read-only projection marad.
11. A canonical review-policy persistence seam explicit shared-core backend path: `src/core/bubble/updateBubbleReviewPolicy.ts` vagy equivalent egyhelyes helper, amely a bubble TOML read-modify-write, lock/freshness guard es conflict outcome ownershipat viszi.
12. `src/core/ui/router.ts` vagy barmely API entry csak ezt a canonical update seamet hivhatja; sajat inline TOML parse/render/write vagy partial persistence shortcut nem elfogadhato.
13. A mutation response mindig friss canonical bubble payloadot vagy equivalent refreshed projectiont ad vissza; partial optimistic local-state siker nem eleg.
14. A detail es status backend projection explicit canonical forrasa ugyanazt a review-policy view-build shape-et hasznalja; ez nem maradhat rejtett implementacios discovery.
15. A `BubbleStatusView` vagy equivalent status builder path targetnek explicitten szerepelnie kell a taskban, ha a UI/API/status contract review-policy projectiont igenyel.
16. A severity threshold canonical source-of-truthja Phase 1-ben a same-round meta-review findings artifact/parity input, amelyet a meta-review gate explicit input + parity-helper surface old fel `report_json.findings_artifact_ref` + parity metadata alapon; ez nem lehet ad hoc reviewer snapshot vagy csak summary-szintu derived adat.
17. A routing helper threshold-dontese a resolved same-round findings severity aggregate-bol szamol; parity metadata onmagaban csak guard/correlation, nem kozvetlen severity source.
18. Phase 1-ben az `auto_rework_min_severity` legalabb `P1|P2|P3` domainen valid; invalid ertek parse-time reject.
19. A `review_policy` shape legyen workflow-owned es jovobiztos, de ne modellezzen altalanos workflow-engine absztrakciot.

### 2.5) Traceability Lock

| Source | This task must realize | Why this is binding here | Evidence |
|---|---|---|---|
| Phase D migration spine | bypass-aktivacio csak reviewer + meta-reviewer prerequisite utan vedheto | megakadalyozza a Phase 1 shortcutot | T10, T14 |
| Reviewer Phase E task | reviewer cutover nincs keszen, tehat bypass nem teheto effective-fel | reviewer loop ownership meg transitional | T10 |
| Meta-reviewer Phase E task | meta-reviewer cutover nincs keszen, tehat `meta_only` nem lehet valos runtime topology | actor-runtime prerequisite explicit | T10 |
| Pairflow initial design | orchestrator owns routing/state/authority | ownership boundary nem nyithato ujra | T5, T12 |

Normative rules:

1. Ha tobb implementacios ut vedheto, azt kell valasztani, amelyik a requested/effective separationt explicitte teszi uj bypass-topologia bevezetese nelkul.
2. Phase 1-ben nem eleg a disabled UI gomb onmagaban; a runtime/API projectionnak is fail-closed modon ki kell mondania, hogy a `meta_only` nem effective.
3. A threshold support nem maradhat prompt-only best effort implementacio; canonical helper/routing boundary evidence kotelezo.

### 3) Side Effects Contract

| Area | Allowed | Forbidden | Notes | Priority | Timing |
|---|---|---|---|---|---|
| Bubble config | uj canonical `review_policy` config schema parse/render | ad hoc top-level flag-ek szetszorasa ugyanerre a policyre | egy canonical policy surface kell | P1 | required-now |
| Meta-review routing | threshold-aware route/recommendation shaping | prompt-only enforce route-boundary without helper parity | helper szintu enforce kotelezo | P1 | required-now |
| UI/API | requested/effective/support projection es thin mutation surface | UI-only local state hack runtime projection nelkul | a runtime truth maradjon canonical | P1 | required-now |
| Reviewer bypass surface | surfaced config + guarded state | tenyleges handoff-topologiai bypass vagy hallgatag aktivacio Phase 1-ben | fail-closed rollout guard | P1 | required-now |
| Actor guidance | policy-derived input explicit shaping | actor-owned direct config read | ownership separation kotelezo | P1 | required-now |

Constraint:

1. A `meta_only` Phase 1 supportja nem lehet "soft enabled but maybe works"; explicit guarded/unsupported semantics kell.

### 4) Error and Fallback Contract

| Trigger | Dependency | Behavior | Fallback | Reason Code | Log Level | Priority | Timing |
|---|---|---|---|---|---|---|---|
| invalid `review_policy.loop_mode` | bubble config parse | throw | config reject | `REVIEW_POLICY_LOOP_MODE_INVALID` | error | P1 | required-now |
| invalid `review_policy.auto_rework_min_severity` | bubble config parse | throw | config reject | `REVIEW_POLICY_SEVERITY_INVALID` | error | P1 | required-now |
| `meta_only` requested prerequisite nelkul | runtime policy mutation or load | result | `effective_loop_mode=full`, explicit support state + blocked reason | `REVIEW_POLICY_LOOP_MODE_GUARDED` | warn | P1 | required-now |
| `meta_only` requested olyan mutation vagy load kontextusban, ahol a surfaced requested policy sem tarthato fenn canonical modon | runtime policy mutation or load | result | explicit unsupported outcome; a request nem valik persisted requested policyve, es a runtime tovabbra is `full` marad | `REVIEW_POLICY_LOOP_MODE_UNSUPPORTED` | warn | P1 | required-now |
| review-policy write current bubble TOML vagy freshness guard nelkul indulna | canonical mutation write path | result | explicit conflict/retryable reject; nincs silent last-write-wins | `REVIEW_POLICY_WRITE_CONFLICT` | warn | P1 | required-now |
| UI/API mutation derived runtime mezot probal irni | UI/API action | result | explicit reject vagy a derived mezok eldobasa, majd friss canonical payload | `REVIEW_POLICY_DERIVED_FIELD_WRITE_FORBIDDEN` | warn | P1 | required-now |
| threshold enforcehez same-round findings artifact/parity input nem oldhato fel | route decision helper | fallback | conservative route marad + explicit diagnostic; nem reviewer summary vagy masodlagos source lesz a severity truth | `REVIEW_POLICY_THRESHOLD_SOURCE_UNRESOLVED` | warn | P1 | required-now |
| meta-review thresholdhez nem eleg severity info | parity/routing helper | fallback | meglovo conservative route marad + diagnostic | `REVIEW_POLICY_THRESHOLD_CONTEXT_INCOMPLETE` | warn | P1 | required-now |
| actor input shapingnel policy-derived metadata hianyzik | orchestrator/meta-review prep | fallback | safe default to current conservative behavior | `REVIEW_POLICY_DERIVED_INPUT_MISSING` | warn | P2 | required-now |
| UI mutation stale bubble state-re fut | UI/API action | result | 409 + fresh bubble payload | `REVIEW_POLICY_STATE_CONFLICT` | warn | P2 | required-now |

Normative rules:

1. A `meta_only` guarded fallback nem lehet silent no-op olyan modon, hogy az operator azt higgye, a bypass aktiv.
2. Ha a threshold enforce-hoz a severity/parity input hianyzik, a rendszer a jelenlegi konzervativabb route-ot valassza, ne agresszivebb auto-reworkot.

### 5) Dependency Constraints

| Type | Items | Priority | Timing |
|---|---|---|---|
| must-use | `plans/actor-runtime-interface-discovery-and-migration-plan-v1.md` | P1 | required-now |
| must-use | `plans/tasks/actor-runtime-interface-migration-spine-phaseD-plan.md` | P1 | required-now |
| must-use | `plans/archive/tasks/actor-runtime-interface-reviewer-cutover-phaseE.md` | P1 | required-now |
| must-use | `plans/archive/tasks/actor-runtime-interface-meta-reviewer-cutover-phaseE.md` | P1 | required-now |
| must-use | shared core modules for UI/API behavior | P1 | required-now |
| must-not-use | actor-owned direct read of canonical workflow review policy | P1 | required-now |
| must-not-use | Phase 1 reviewer/meta-reviewer bypass handoff implementation | P1 | required-now |
| must-not-use | prompt-only threshold support routing enforce nelkul | P1 | required-now |
| must-not-use | altalanos workflow-engine abstraction | P2 | required-now |

### 6) Test Matrix

| ID | Scenario | Given | When | Then | Priority | Timing | Evidence |
|---|---|---|---|---|---|---|---|
| T1 | config parse/render supports review policy | valid bubble TOML `review_policy` blockkal | parse + render lefut | a policy canonical formaban round-tripol defaults mellett is | P1 | required-now | automated test |
| T2 | invalid policy values fail-closed | invalid `loop_mode` vagy severity szerepel | config load megtortenik | explicit validation error jon | P1 | required-now | automated test |
| T3 | review policy projected in bubble views | bubble config review policyval letezik | list/detail/status payload keszul | a requested/effective/support projection olvashato es ugyanarra a canonical backend projection forrasra epul | P1 | required-now | automated test |
| T4 | canonical mutation write path explicit es bounded | operator review policyt modosit | shared-core update seam lefut | a bubble TOML read-modify-write + lock/freshness/conflict viselkedest a kijelolt canonical seam owns-olja | P1 | required-now | automated test |
| T5 | actor input can receive policy-derived constraints | threshold be van allitva | meta-review prep lefut | a meta-review runner input/prompt tartalmazhat policy-derived instructiont ownership-serules nelkul | P1 | required-now | automated test |
| T6 | threshold enforce route boundaryn is jelen van | `auto_rework_min_severity=P2`, meta-review same-round findings artifact P2 findinget tartalmaz | route decision megtortenik | a canonical helper a resolved same-round findings severity aggregate-et figyelembe veszi | P1 | required-now | automated test |
| T7 | threshold source-of-truth explicit es stabil | threshold be van allitva, es report_json/parity input rendelkezesre all | route decision helper lefut | a severity truth a named findings artifact/parity input surface-bol jon, nem reviewer summarybol vagy mas secondary source-bol | P1 | required-now | automated test |
| T8 | incomplete severity context conservative marad | threshold be van allitva, de parity/severity context hianyos | route decision megtortenik | explicit diagnostic mellett conservative fallback marad | P1 | required-now | automated test |
| T9 | UI/API can mutate review policy | operator policyt allit a bubble-n | API mutation lefut | persisted review policy frissul es friss bubble payload jon vissza a canonical update seam utan | P1 | required-now | automated test |
| T10 | `meta_only` requested, de Phase 1-ben guarded marad | operator `meta_only` modot ker | UI/API action vagy config load megtortenik | a requested mod latszik, az effective mod `full`, es explicit support/blocked allapot jelenik meg | P1 | required-now | automated test |
| T11 | mutation surface cannot write derived runtime fields | operator vagy client derived mezoket probal kuldeni | UI/API mutation lefut | csak a requested policy valtozhat; az effective/support/blocked projection runtime-derived marad vagy explicit reject jon | P1 | required-now | automated test |
| T12 | actor input ownership separation explicit marad | review policy be van allitva es actor input keszul | orchestrator actor inputot allit elo | az actor csak derived constraintet kap; canonical policy source tovabbra is orchestrator-owned | P1 | required-now | automated test |
| T13 | detail/status backend projection source explicit | bubble detail/status contract review policy projectiont igenyel | implementacio a status builder pathot is erinti | a task altal megnevezett `BubbleStatusView` / status builder path explicit target, nem marad implicit discovery | P1 | required-now | automated test |
| T14 | docs clarify ownership es rollout sorrend | task szerinti docs diff szukseges | docs review megtortenik | a docs kimondja a workflow-owned ownershipot es hogy a `meta_only` aktivacio a reviewer/meta-reviewer prerequisite-ek utan johet | P2 | required-now | doc diff |
| T15 | write-conflict path explicit rejectet ad | stale version guard vagy konkurens bubble TOML write tortenik | API mutation lefut | explicit conflict/retryable reject jon, es nincs silent last-write-wins persistence | P1 | required-now | automated test |
| T16 | `unsupported` outcome explicit es non-persisting | operator `meta_only` modot ker olyan mutation vagy load kontextusban, ahol a requested policy sem tarthato fenn canonical modon | UI/API mutation vagy config load megtortenik | explicit `unsupported` outcome jon, a request nem persistalodik requested policykent, es az effective runtime mod `full` marad | P1 | required-now | automated test |

## Acceptance Criteria (Binary)

1. AC1: Canonical workflow-owned `review_policy` shape letezik explicit validationnel es defaults-szal.
2. AC2: `auto_rework_min_severity` a canonical meta-review routing boundaryn enforce-olodik, nem csak prompt-szinten.
3. AC3: A runtime/UI/API payload explicit requested/effective/support separationt ad a loop mode-hoz.
4. AC4: `meta_only` Phase 1-ben nem valhat effective runtime modda, es ez operator-visible modon egyertelmu.
5. AC5: A task explicitten reviewer + meta-reviewer prerequisite-hez koti a bypass kesobbi aktivaciojat.
6. AC6: A dokumentacio kimondja a workflow-owned ownershipot es a staged rollout semanticsot.
7. AC7: Az actor-input ownership separation explicit marad: actor csak policy-derived constraintet/inputot kaphat, a canonical review policy source tovabbra is orchestrator-owned.
8. AC8: A bubble detail/status backend projection forrasa explicit task-target, beleertve legalabb a `BubbleStatusView` vagy equivalent status builder pathot.
9. AC9: A review-policy mutation canonical write path explicit task-target, amely a bubble TOML persistence read-modify-write + freshness/conflict ownershipat egyhelyesen viszi.
10. AC10: Az `auto_rework_min_severity` threshold source-of-truthja explicit: a route decision a same-round named findings artifact/parity inputbol szamolt severity aggregate-re epul.
11. AC11: A `guarded` es `unsupported` Phase 1 outcome kulon explicit contracttal es tesztelheto scenarioval rendelkezik; az `unsupported` kimenet nem persistalhatja csendben a kert policyt.

## L2 - Implementation Notes (Optional)

1. [later-hardening] Kulon follow-up taskban lehet a `meta_only` effective aktivalasat a reviewer + meta-reviewer cutover completionhez kotve bekotni.
2. [later-hardening] Ha kesobb tobb workflow jelenik meg, a `review_policy` fole kerulhet workflow-level default/override reteg, de ezt a Phase 1 nem modellezi.
3. [later-hardening] Ha a UI copyban a guarded `meta_only` allapot nem eleg egyertelmu, kulon operator-copy task nyithato.
4. [later-hardening] Ha a Phase 1 threshold utan az actor prompt/guidance tovabbi strukturalt severity-policy inputot igenyel, ezt kulon actor-guidance follow-up taskban erdemes megnyitni.

## Hardening Backlog (Optional)

| ID | Item | Layer | Priority | Timing | Source | Proposed Action |
|---|---|---|---|---|---|---|
| H1 | `meta_only` activation follow-up | L2 | P2 | later-hardening | rollout sequencing | Kulon implementation task reviewer + meta-reviewer cutover utan |
| H2 | multi-workflow policy layering | L2 | P3 | later-hardening | future architecture direction | Kulon plan/task, ha a workflow engine irany konkretizalodik |
| H3 | richer policy-derived actor input contract | L2 | P3 | later-hardening | prompt/guidance hardening | Kulon actor-guidance task, ha a Phase 1 threshold nem eleg |

## Review Control

1. Every finding must include: `priority`, `timing`, `layer`, `evidence`.
2. Ne fogadjunk el olyan implementaciot, amely a `review_policy` canonical ownershipat az actorokba tolja.
3. Ne fogadjunk el olyan Phase 1 megoldast, amely a `meta_only` loopot csendben vagy reszlegesen bekapcsolja explicit rollout guard nelkul.
4. A prompt/guidance-only threshold support nem eleg; route-boundary enforcement kotelezo.
5. A requested/effective loop mode separation review-blocker: ha ez hianyzik, a surface operatori szempontbol felrevezeto.
6. A detail/status backend projection source review-blocker: ha a status builder path nincs explicit targetkent megnevezve, a UI/API contract rejtett implementacios discoveryt hagy maga utan.
7. A canonical mutation write path review-blocker: ha a read-modify-write persistence seam nincs explicit targetkent es contractkent megnevezve, a task tul sok backend discoveryt hagy.
8. A threshold source-of-truth review-blocker: ha a severity aggregate canonical inputja nincs explicit named helper/artifact surface-re kotve, a task ket eltero, megis vedheto implementaciot hagy.
9. A kesobbi workflow-configurability jovoideju irany lehet shaping input, de nem indok altalanos workflow engine bevezetesere ebben a taskban.

## Spec Lock

Task allapot `IMPLEMENTABLE`, ha a `review_policy` canonical schemaja, a Phase 1 threshold enforce, a requested/effective/support separation, a `meta_only` rollout guard es a prerequisite-kotott bypass-sequencing mind explicit es tesztelheto, mikozben nem serul a workflow-owned ownership szabaly.
