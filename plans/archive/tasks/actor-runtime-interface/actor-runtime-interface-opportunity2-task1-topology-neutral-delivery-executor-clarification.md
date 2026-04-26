---
artifact_type: task
artifact_id: task_actor_runtime_interface_opportunity2_task1_topology_neutral_delivery_executor_boundary_v1
title: "Actor Runtime Interface Opportunity 2 Task 1: Topology-Neutral Delivery and Executor Boundary Clarification"
status: completed
phase: post-phaseE
target_files:
  - plans/archive/tasks/actor-runtime-interface-opportunity2-task1-topology-neutral-delivery-executor-clarification.md
  - docs/actor-runtime-interface/topology-neutral-delivery-executor-contract-note-v1.md
  - plans/actor-runtime-interface-post-phaseE-successor-plan-v1.md
prd_ref: null
plan_ref: plans/actor-runtime-interface-post-phaseE-successor-plan-v1.md
system_context_ref: README.md
owners:
  - "felho"
---

# Task: Actor Runtime Interface Opportunity 2 Task 1: Topology-Neutral Delivery and Executor Boundary Clarification

## Current Codebase Check (2026-04-18)

1. A typed delivery es launch ack baseline current-tree szinten mar lezart:
   - `src/v11/shared/delivery/tmuxDeliveryContract.ts`
   - `src/v11/infrastructure/channel/tmux/tmuxDeliveryRuntime.ts`
   - `src/v11/application/start/startCommandTmuxLaunch.ts`
   - historical closure anchor: `plans/archive/tasks/actor-runtime-interface/actor-runtime-interface-delivery-ack-producer-contract-phaseE2a.md`
2. A topology-kotodes ugyanakkor tovabbra is retained `tmux` shape-ben latszik a runtime/orchestration seam-ekben:
   - `src/v11/infrastructure/channel/tmux/tmuxDelivery.ts`
   - `src/v11/defaults/metaReviewGate/metaReviewGateCommandDefaults.ts`
   - `src/v11/application/start/startCommandTmuxLaunch.ts`
3. A runtime session workspace authority mar explicit, read-only source anchor:
   - `src/v11/shared/runtimeSessionWorkspaceAuthority.ts`
4. Emiatt az `O2-T1` current-tree kovetkezo bounded szelete nem az `accepted | rejected | running | failed_to_start` semantics ujranyitasa, hanem annak docs-only tisztazasa, hogy:
   - mi a topology-semleges delivery/executor contract,
   - mi marad retained `tmux` operatori/observability adapter,
   - es mely current consumers maradnak ideiglenesen a retained `tmux` vocabularyhoz kotve.

## L0 - Policy

### Goal

Docs-only, implementalhato `O2-T1` successor task keszitese az `Opportunity 2` ala ugy, hogy:
1. explicit legyen a topology-semleges delivery/executor boundary a mar lezart ack baseline ujranyitasa nelkul,
2. kulon legyen nevezve a canonical topology-neutral contract, a retained `tmux` adapter, es a current-tree consumer coupling,
3. a kesobbi implementation mar tiszta boundaryval induljon, ne keverje ossze a typed ack truthot a `tmux` pane/operator surface-szel.

### Domain / Control Model Summary

1. Business invariant: a canonical actor input/output contract es a mar lezart delivery/launch ack truth topologytol fuggetlenul ugyanaz marad.
2. Control model: az orchestrator/domain tovabbra is az actor authority owner; a delivery/executor boundary legfeljebb handoff trigger, topology-specific vegrehajtas es mar lezart typed ack consume ownershipot kaphat.
3. Read-path rule: az `O2-T1` csak a current-tree closed source anchorokbol olvashatja ki a jelentest:
   - `plans/archive/tasks/actor-runtime-interface/actor-runtime-interface-delivery-ack-producer-contract-phaseE2a.md`
   - `src/v11/shared/delivery/tmuxDeliveryContract.ts`
   - `src/v11/infrastructure/channel/tmux/tmuxDeliveryRuntime.ts`
   - `src/v11/infrastructure/channel/tmux/tmuxDelivery.ts`
   - `src/v11/application/start/startCommandTmuxLaunch.ts`
   - `src/v11/defaults/metaReviewGate/metaReviewGateCommandDefaults.ts`
   - `src/v11/shared/runtimeSessionWorkspaceAuthority.ts`
4. Forbidden fallback:
   - pane-visible activity, prompt/trust-prompt vagy status pane nem nevezheto at canonical delivery/launch truth-va,
   - a retained `tmux` pane/session vocabulary nem nevezheto at topology-neutral contractta source-anchored mapping nelkul,
   - a bubble state/policy/lifecycle ownership nem csuszhat at az executor boundary ala.
5. Allowed resolution path:
   - a topology-neutral contract kesobb retained `tmux` adapteren keresztul is megvalosulhat,
   - a current `tmux` delivery/launch producer truth preserved baseline-kent rahidalhato a jovobeli generic boundaryra,
   - a runtime session workspace authority explicit input maradhat a topology-specific adapterek read-only authorityja.
6. Missing-data rule:
   - ha a current-tree source anchorok nem tamasztanak ala topology-semleges szerzodesi elemet, azt az `O2-T1` note nem allithatja canonicalnak,
   - ha a future contract valamely pontja current-tree evidence nelkul maradna, azt `successor-owned` vagy `deferred` statuszban kell hagyni, nem szabadszavasan kitolteni,
   - a lezart typed ack vocabulary hianyaban nincs uj status-token vagy synthetic success terminology.
7. Phase boundary:
   - contract closure: owned here, docs-only formaban
   - producer closure: successor
   - internal execution closure: successor
   - workflow/orchestration closure: successor
   - read-model closure: successor
   - activation closure: successor
   - cleanup/recovery closure: successor

### Plan Linkage

1. Parent plan gap closed: az `Opportunity 1` lezarta utan a kovetkezo sequencing gap az, hogy az `Opportunity 2` pontosan mit jelent anelkul, hogy a Phase `E2a` typed ack closure ujranyilna.
2. Depends on:
   - `plans/actor-runtime-interface-post-phaseE-successor-plan-v1.md`
   - `plans/actor-runtime-interface-generic-runtime-kernel-contract-note-v1.md`
   - `plans/archive/tasks/actor-runtime-interface/actor-runtime-interface-delivery-ack-producer-contract-phaseE2a.md`
3. Unlocks / impacts successors:
   - barmely jovobeli topology-neutral delivery/executor implementation slice,
   - `Opportunity 3 / O3-T1` onboarding simplification lane, amennyiben uj actor/topology extension surface is kell.
4. Task-list impact:
   - megnyitja az `Opportunity 2` elso bounded successor taskjat,
   - nem cserel le mar letező open taskot.
5. Inherited validation / exit expectation:
   - a docs-only outputnak explicitten bizonyitania kell, hogy a lezart typed ack/runtime-success semantics preserved marad,
   - es kulon kell neveznie a retained `tmux` adapter ownershipot a jovobeli topology-neutral contracttol.

### Canonical Contract Anchors

1. Source-of-truth anchors:
   - `plans/actor-runtime-interface-post-phaseE-successor-plan-v1.md`
   - `plans/actor-runtime-interface-generic-runtime-kernel-contract-note-v1.md`
   - `plans/archive/tasks/actor-runtime-interface/actor-runtime-interface-delivery-ack-producer-contract-phaseE2a.md`
   - `src/v11/shared/delivery/tmuxDeliveryContract.ts`
   - `src/v11/shared/ports/tmuxDelivery.ts`
   - `src/v11/shared/ports/tmuxSessions.ts`
   - `src/v11/infrastructure/channel/tmux/tmuxDeliveryRuntime.ts`
   - `src/v11/infrastructure/channel/tmux/tmuxDelivery.ts`
   - `src/v11/infrastructure/channel/tmux/tmuxManager.ts`
   - `src/v11/application/start/startCommandTmuxLaunch.ts`
   - `src/v11/defaults/metaReviewGate/metaReviewGateCommandDefaults.ts`
   - `src/v11/shared/runtimeSessionWorkspaceAuthority.ts`
   - `src/v11/shared/ports/uiRouter.ts`
2. Canonical elements:
   - delivery ack status baseline: `accepted | rejected`
   - launch ack status baseline: `running | failed_to_start`, explicit shared `tmuxSessions` launch-port contractkent
   - actor authority current-tree baseline tovabbra is kulon marad az `Opportunity 1` note szerint
3. Guard elements:
   - marker confirmation
   - `tmux` send / pane targeting / pane index resolution
   - trust-prompt acceptance
   - start-command local `assertRunningLaunchAck(...)` fail-closed guard
4. Compat-only elements:
   - legacy `delivered: boolean` projection
   - runtime-session-derived workspace authority resolution retained adapter inputkent
   - retained UI/router consume surfaces, amelyek meg `EmitTmuxDeliveryNotificationResult` shape-re ulnek
   - current `tmux` pane labels / status pane labels / direct command-building surface
5. Forbidden reinterpretations:
   - az `accepted | rejected | running | failed_to_start` statuszok nem nevezhetok at `tmux` implementation-detail statuszokka,
   - a guard elemek nem promotalhatok canonical truth-va,
   - a runtime session workspace authority resolution nem allithato be a jovobeli topology-neutral contract kotelezo canonical elemekent current-tree launch/delivery closure proof nelkul,
   - a retained `tmux` consumer coupling nem allithato be topology-neutral closure-kent csak azert, mert ma mukodik.

### Scope Reality / Shape Proof

1. Inspected entrypoints / call-sites:
   - `src/v11/shared/delivery/tmuxDeliveryContract.ts`
   - `src/v11/shared/ports/tmuxDelivery.ts`
   - `src/v11/shared/ports/tmuxSessions.ts`
   - `src/v11/infrastructure/channel/tmux/tmuxDeliveryRuntime.ts`
   - `src/v11/infrastructure/channel/tmux/tmuxDelivery.ts`
   - `src/v11/infrastructure/channel/tmux/tmuxManager.ts`
   - `src/v11/application/start/startCommandTmuxLaunch.ts`
   - `src/v11/defaults/metaReviewGate/metaReviewGateCommandDefaults.ts`
   - `src/v11/shared/runtimeSessionWorkspaceAuthority.ts`
   - `src/v11/shared/ports/uiRouter.ts`
2. Actual touched scope: `contract_or_persisted_authority_foundation`
3. Mutation entrypoints in scope: `N/A`
4. Hidden scope ruled out:
   - a typed ack producer mar letezik current-tree kodban,
   - a consumer coupling ma retained `tmux` adapter ownershipkent latszik, de nem igenyel meg implementacios atallast a sequencinghez,
   - nincs uj lifecycle/state mutation boundary a taskban.
5. Branch inventory note:
   - delivery `accepted` vs `rejected`
   - launch `running` vs `failed_to_start`
   - runtime-session workspace authority `resolved` vs `unresolved`
   - retained `tmux` adapter vs jovobeli topology-neutral contract
6. Why the declared task shape matches reality:
   - a target scope csak task artifact + note + successor plan,
   - a current kod mar eleg source anchor ahhoz, hogy a boundary tisztazasa implementacio nelkul is bounded task legyen.

### Authority Boundary Map

1. Authority producer:
   - actor authority current-tree baseline: `execution_context` family az `Opportunity 1` contract note szerint
   - delivery/launch producer baseline: current `tmux` producer files
2. Stored authority:
   - runtime session registry es a belole feloldott workspace authority
   - bubble state/execution context retained, read-only upstream baseline-kent
3. In-scope consumers:
   - docs-only contract note
   - successor plan sequencing
4. Explicit out-of-scope consumers:
   - `tmuxDelivery.ts` implementation rewrite
   - `tmuxDeliveryRuntime.ts` producer rewrite
   - `startCommandTmuxLaunch.ts` consume rewrite
   - `metaReviewGateCommandDefaults.ts` dependency graph rewrite
   - UI/router or CLI surface change
5. Export surfaces closed in this phase:
   - `no`
   - csak a docs-only boundary ownership zarul; source export vagy runtime code closure nem.

### Baseline Preservation

1. Must-preserve behaviors:
   - a `Phase E2a`-ban lezart typed delivery ack truth preserved marad,
   - a shared `tmuxSessions` porton lezart `running | failed_to_start` launch ack baseline preserved marad,
   - a start flow launch ack consume baseline preserved marad mint retained downstream consumer,
   - a retained `tmux` operatori/observability adapter nem tunik el hallgatozolag,
   - a runtime session workspace authority explicit read-only retained adapter input marad.
2. Allowed resolution paths:
   - a jovobeli topology-neutral contract retained `tmux` adapteren keresztul implementalhato,
   - a current `tmux` consumer coupling explicit temporary retained adapter-statuszt kaphat,
   - a same-authority mapping a typed ack baseline-t valtozatlanul megtarthatja mas topology mellett is.
3. Forbidden regression interpretations:
   - tilos az `O2-T1`-et ack-status rewrite-kent implementalni,
   - tilos a `tmux` pane/session naminget magat a future generic contractnak nevezni,
   - tilos a meta-review gate `tmux` primitivejeit canonical executor API-kent beallitani current-tree proof nelkul.
4. Replacement proof required if removed:
   - barmely jovobeli task, amely a retained `delivered` projectiont, a start launch consume pathot vagy a `tmux` adapter retained statuszat megvaltoztatja, explicit successor proofot es code-level parity evidence-t kell adjon.

### In Scope

1. Az `Opportunity 2 / O2-T1` docs-only task artifact megirasa vagy refinementje itt:
   - `plans/archive/tasks/actor-runtime-interface-opportunity2-task1-topology-neutral-delivery-executor-clarification.md`
2. Egy uj source-anchored note ownershipja itt:
   - `docs/actor-runtime-interface/topology-neutral-delivery-executor-contract-note-v1.md`
3. Az explicit boundary-szetszalazas legalabb erre a harom retegre:
   - topology-neutral delivery/executor contract
   - retained `tmux` operatori/observability adapter
   - current retained consumer coupling
4. Egy current-tree inventory rogzítese legalabb ezekhez a source anchorokhoz:
   - shared delivery contract
   - delivery runtime producer
   - delivery adapter projection
   - start launch ack consumer
   - meta-review gate retained `tmux` dependencies
   - UI/router retained delivery result consume surface
5. A successor plan frissitese az `O2-T1` task pathjaval es azzal, hogy ez lett a current next bounded successor slice az `Opportunity 1` closure utan.

### Out of Scope

1. Barmilyen source-code modositas `src/**` alatt.
2. Az `accepted | rejected | running | failed_to_start` typed ack semantics modosítása vagy ujranyitasa.
3. `tmux` launch/delivery producer rewrite vagy topology-csere.
4. `metaReviewGateCommandDefaults.ts` vagy `startCommandTmuxLaunch.ts` implementacios atalakítása.
5. UI/router, CLI, state snapshot vagy lifecycle/state machine valtoztatas.
6. Uj actor onboarding vagy `Opportunity 3 / O3-T1` scope.

### Safety Defaults

1. Ez docs-only task; product/runtime kod nem modosithato.
2. A current `tmux` coupling lehet retained, de nem lehet hallgatozolag canonical topology-neutral contractkent leirni.
3. A lezart ack truth preserved baseline; az `O2-T1` csak boundary-nevesitest es ownership-szetvalasztast vegezhet.
4. Ha egy contractelemrol nem bizonyithato a current-tree source anchor, azt a note-nak explicit `deferred` vagy `successor-owned` statuszban kell hagynia.

### Contract Boundary / Blast Radius

1. `contract_boundary_override`: `yes`
2. Erintett contract:
   - belso delivery/executor topology boundary dokumentalt szerzodese
   - retained `tmux` adapter ownership explicit leirasa
   - current retained consumer coupling explicit bounded statusza

### Complexity Risk Gate

1. `authority_risk`: `1`
2. `surface_spread`: `1`
3. `identity_join_risk`: `1`
4. `activation_coupling`: `0`
5. `prerequisite_risk`: `1`
6. `acceptance_multiplicity`: `1`
7. `risk_score`: `5`
8. `single-task allowed`: `yes`
9. Identity/join note:
   - canonical identity path: actor authority + delivery/launch typed ack shared source anchorokkal; runtime session workspace authority retained adapter inputkent
   - competing identifiers or fallback identities: pane labels, pane indexes, trust-prompt state, status-pane commands, operatori `tmux` observability
10. Authority/source-of-truth note:
   - canonical source: current-tree closed docs + typed ack source anchors
   - forbidden secondary sources: pane activity, status pane, watchdog-style heuristics, naming-only reinterpretation
11. Closure-budget triage:
   - closure buckets touched: `shared_contract`, `internal_execution_consumers`
   - intentionally collapsed closures: `N/A`; ez docs-only boundary clarification
   - explicitly deferred closures: `authority_producer`, `workflow_orchestration_consumers`, `read_model_consumers`, `persisted_authority_or_schema`, `cleanup_recovery_consumers`
12. Bounded-task-shape decision:
   - primary shape: `contract_or_persisted_authority_foundation`
   - secondary shape: `N/A`
   - why this bounded mix is safe: nincs code mutation, es a current-tree source anchorok elegendok a closure-nevesiteshez.

## L1 - Change Contract

### 0) Domain / Control Contract

| Item | Rule | Implementation Consequence | Priority | Timing |
|---|---|---|---|---|
| Business invariant | A canonical actor contract es a lezart typed ack truth topologytol fuggetlenul valtozatlan marad. | Az `O2-T1` output nem irhat uj ack-vocabularyt vagy topology-fuggo canonical truthot. | P1 | required-now |
| Control model | A delivery/executor boundary csak handoff + adapter + typed ack consume ownershipot kaphat. | A task note kulon valassza le a retained `tmux` adaptert az orchestrator/domain ownershiprol. | P1 | required-now |
| Read-path rule | Csak a closed source anchorokbol szabad contractjelentest levezetni. | A note minden uj terminologyjat source refhez kell kotni. | P1 | required-now |
| Forbidden fallback | Pane/status/prompt nem lehet canonical truth. | A note nem nevezheti at az observability jeleket topology-neutral contractta. | P1 | required-now |
| Allowed resolution path | Retained `tmux` adapter rahidalhat a jovobeli generic contractra. | A note engedelyezheti a future adapterized topologyt ugyanazon typed ack baseline mellett. | P1 | required-now |
| Missing-data rule | Evidence hianyaban a contractelem deferred marad. | A task nem tolthet ki bizonyitatlan generic executor semanticsat. | P1 | required-now |
| Phase boundary | Ez docs-only contract clarification, nem implementation. | Barmely producer/consumer rewrite successor scope marad. | P1 | required-now |

### 0a) Canonical Contract Preservation

| Element | Source Anchor | Required Interpretation | This Task Action | Priority | Timing |
|---|---|---|---|---|---|
| delivery ack statuses | `src/v11/shared/delivery/tmuxDeliveryContract.ts` | `accepted | rejected` closed baseline | preserve | P1 | required-now |
| launch ack statuses | `src/v11/shared/ports/tmuxSessions.ts`, `src/v11/infrastructure/channel/tmux/tmuxManager.ts`, historical `E2a` task | `running | failed_to_start` closed baseline explicit shared launch-port contracttal | preserve | P1 | required-now |
| start launch ack consume | `src/v11/application/start/startCommandTmuxLaunch.ts` | retained downstream consumer a mar lezart shared launch ackra | preserve-as-consumer | P1 | required-now |
| runtime session workspace authority | `src/v11/shared/runtimeSessionWorkspaceAuthority.ts` | explicit session-record-derived retained adapter input, nem standalone canonical topology-neutral contractelem | preserve-as-adapter-input | P1 | required-now |
| marker confirmation / pane targeting | `src/v11/infrastructure/channel/tmux/tmuxDeliveryRuntime.ts`, `src/v11/infrastructure/channel/tmux/tmuxDelivery.ts` | guard / retained adapter detail, nem canonical truth | preserve-as-guard | P1 | required-now |
| legacy `delivered` projection | `src/v11/infrastructure/channel/tmux/tmuxDeliveryRuntime.ts`, `src/v11/shared/ports/uiRouter.ts` | compat-only surface | preserve-as-compat | P1 | required-now |

### 0b) Scope Reality and Shape Proof

| Item | Rule | Implementation / Review Consequence | Priority | Timing |
|---|---|---|---|---|
| Inspected entrypoints / call-sites | Delivery contract, shared launch port, runtime producer, adapter projection, start launch consume, meta-review gate defaults, UI/router surface be lett olvasva. | A task nem alapulhat csak a plan szovegen. | P1 | required-now |
| Actual touched scope | Docs-only contract foundation. | Nem engedelyezett code-level topology rewrite ebben a szeletben. | P1 | required-now |
| Mutation entrypoints in scope | `N/A` | Nincs write-path implementation ownership. | P1 | required-now |
| Hidden scope ruled out | A typed ack producer es retained consumer coupling current-tree evidence-szel igazolva van. | Nem kell producer vagy consumer migrationt belerakni a sequencing taskba. | P1 | required-now |
| Branch inventory note | Delivery, launch, workspace authority es retained adapter branches explicit matrixot kernek. | A note-ban mindegyiknek kulon sor kell. | P1 | required-now |
| Shape proof | A target files csak docs artifactok. | A task implementalhato docs-only foundationkent. | P1 | required-now |

### 0c) Plan Linkage and Successor Impact

| Item | Rule | Implementation / Review Consequence | Priority | Timing |
|---|---|---|---|---|
| Parent gap closed | Az `Opportunity 2` kovetkezo bounded szelete explicit `O2-T1` taskkent mar meg van nevezve. | A successor plan historical `O1` narrativaja nem moshatja ossze a current `O2` sequencinget. | P1 | required-now |
| Depends on | `O1-T1`, `O1-T2`, `O1-T3`, historical `E2a` baseline | A task nem irhatja felul ezek closed meaningjet. | P1 | required-now |
| Unlocks / impacts successors | Jovobeli delivery/executor implementation es esetleg `O3-T1` | A note-nak vilagosan kell elvalasztania mi marad implementation successor. | P1 | required-now |
| Task-list impact | Az `O2-T1` mint current next slice megerositett es pontositott sequencinget kap. | A planban a task path es a historical-vs-current olvasat egyertelmu maradjon. | P1 | required-now |
| Inherited validation / exit expectation | Preserved-baseline clarification lane marad | Reviewkor blocker, ha a task ack semantics rewritekent van megfogalmazva. | P1 | required-now |

### 1) Call-site Matrix

| ID | File | Function/Entry | Exact Signature (args -> return) | Insertion Point | Expected Behavior | Priority | Timing | Evidence |
|---|---|---|---|---|---|---|---|---|
| CS1 | `plans/archive/tasks/actor-runtime-interface-opportunity2-task1-topology-neutral-delivery-executor-clarification.md` | task artifact | markdown task -> implementable spec | full artifact | Az `O2-T1` explicit preserved-baseline clarification lane-kent legyen specifikalva. | P1 | required-now | docs diff |
| CS2 | `docs/actor-runtime-interface/topology-neutral-delivery-executor-contract-note-v1.md` | contract note | markdown note -> source-anchored boundary note | uj note | Kulon nevezze meg a topology-neutral contractot, a retained `tmux` adaptert es a retained current consumers-t. | P1 | required-now | docs diff |
| CS3 | `plans/actor-runtime-interface-post-phaseE-successor-plan-v1.md` | Opportunity 2 sequencing | markdown plan update | sequencing / disposition szekciok | Az `Opportunity 2` current next successor slice-a legyen explicit task path-val. | P1 | required-now | docs diff |
| CS4 | `src/v11/shared/delivery/tmuxDeliveryContract.ts` | delivery contract exports | type exports -> typed ack vocabulary | source anchor inventory | A note preserved baseline-kent rogzitse a delivery ack statuszokat es a compat projection szerepet. | P1 | required-now | source anchor |
| CS5 | `src/v11/infrastructure/channel/tmux/tmuxDeliveryRuntime.ts` | `attemptTmuxDelivery`, `projectTmuxDeliveryAckToLegacyResult` | producer helpers -> typed ack / legacy projection | source anchor inventory | A note kulon valassza el a canonical ackot a compat `delivered` projectiontol. | P1 | required-now | source anchor |
| CS6 | `src/v11/infrastructure/channel/tmux/tmuxDelivery.ts` | `emitTmuxDeliveryNotification` | `(input) -> Promise<EmitTmuxDeliveryNotificationResult>` | source anchor inventory | A note nevezze meg retained `tmux` adapter boundarykent, ne canonical generic contractkent. | P1 | required-now | source anchor |
| CS7 | `src/v11/shared/ports/tmuxSessions.ts` | launch ack port exports | type/interface exports -> shared launch port | source anchor inventory | A note explicit source-of-truth anchor-kent rogzitse a canonical typed launch ack shape-et a shared porton. | P1 | required-now | source anchor |
| CS8 | `src/v11/infrastructure/channel/tmux/tmuxManager.ts` | `launchBubbleTmuxSessionAck`, `launchBubbleTmuxSession` | producer + legacy wrapper -> shared launch ack / legacy result | source anchor inventory | A note kulon valassza el a canonical shared launch ackot a legacy wrapper surface-tol. | P1 | required-now | source anchor |
| CS9 | `src/v11/application/start/startCommandTmuxLaunch.ts` | `assertRunningLaunchAck`, `launchFreshTmuxSession`, `launchResumeTmuxSession` | start launch consume -> fail-closed running ack consume | source anchor inventory | A note rogzitse, hogy ez retained downstream consume surface a mar lezart shared launch ackra. | P1 | required-now | source anchor |
| CS10 | `src/v11/defaults/metaReviewGate/metaReviewGateCommandDefaults.ts` | dependency defaults | default dependency graph -> retained `tmux` primitivek | source anchor inventory | A note mutassa meg, hogy a meta-review gate ma retained `tmux` topologyra ul, de ez nem a canonical delivery/executor contract. | P1 | required-now | source anchor |
| CS11 | `src/v11/shared/runtimeSessionWorkspaceAuthority.ts` | `resolveRuntimeSessionWorkspaceAuthority` | `(runtimeSessionRecord) -> resolution` | source anchor inventory | A note retained adapter inputkent kezelje, ne standalone canonical topology-neutral contractelemkent. | P1 | required-now | source anchor |
| CS12 | `src/v11/shared/ports/uiRouter.ts` | `UiEmitApprovalDecisionResult.delivery` es rokon consume surface-ek | typed result consume -> UI contract | source anchor inventory | A note explicit retained consumer familykent inventoryzza a UI/router couplingot. | P1 | required-now | source anchor |

### 2) Data and Interface Contract

| Contract | Current | Target | Required Fields | Optional Fields | Compatibility | Priority | Timing |
|---|---|---|---|---|---|---|---|
| `O2-T1` task artifact | letezo docs-only task artifact, amelynek a current sequencing nyelvet kell pontositania | implementable docs-only task explicit current-tree sequencinggel | explicit scope, preserved baseline, source anchors, successor impact | later-hardening notes | additive | P1 | required-now |
| topology-neutral contract note | jelenleg nem letezik | source-anchored note | canonical vs guard vs compat matrix; retained adapter inventory; deferred implementation boundary | optional open questions, if any | additive | P1 | required-now |
| successor plan `Opportunity 2` disposition | explicit current next bounded slice task path-val, historical `O1` contexttal egy file-ban | egyertelmu current-vs-historical sequencing olvasat | task path, preserved-baseline note, sequencing clarification | optional rationale text | additive | P1 | required-now |

### 3) Side Effects Contract

| Area | Allowed | Forbidden | Notes | Priority | Timing |
|---|---|---|---|---|---|
| docs artifacts | task file, note, successor plan frissitese | runtime/app/source code modositasa | tisztan docs-only slice | P1 | required-now |

### 4) Error and Fallback Contract

| Trigger | Dependency (if any) | Behavior (`throw|result|fallback`) | Fallback Value/Action | Reason Code | Log Level | Priority | Timing |
|---|---|---|---|---|---|---|---|
| source-anchor drift vagy ellentmondas az ack baseline korul | closed docs + current code | throw | task refinement vagy plan clarification, nem invented wording | `SPEC_DRIFT_BLOCKER` | error | P1 | required-now |
| topology-neutral terminology current-tree evidence nelkul | source anchors | fallback | explicit `deferred` / `successor-owned` megjeloles | `UNPROVEN_BOUNDARY_CLAIM` | warn | P1 | required-now |
| retained `tmux` detail canonicalnak lenne leirva | source anchors | fallback | guard/adapter/compat kategoriaba visszasorolas | `ADAPTER_CANONICALIZATION_FORBIDDEN` | warn | P1 | required-now |

### 5) Dependency Constraints

| Type | Items | Priority | Timing |
|---|---|---|---|
| must-use | `plans/actor-runtime-interface-post-phaseE-successor-plan-v1.md` | P1 | required-now |
| must-use | `plans/actor-runtime-interface-generic-runtime-kernel-contract-note-v1.md` | P1 | required-now |
| must-use | `plans/archive/tasks/actor-runtime-interface/actor-runtime-interface-delivery-ack-producer-contract-phaseE2a.md` | P1 | required-now |
| must-use | current-tree code anchors: `src/v11/shared/delivery/tmuxDeliveryContract.ts`, `src/v11/shared/ports/tmuxDelivery.ts`, `src/v11/infrastructure/channel/tmux/tmuxDeliveryRuntime.ts`, `src/v11/infrastructure/channel/tmux/tmuxDelivery.ts`, `src/v11/application/start/startCommandTmuxLaunch.ts`, `src/v11/defaults/metaReviewGate/metaReviewGateCommandDefaults.ts`, `src/v11/shared/runtimeSessionWorkspaceAuthority.ts`, `src/v11/shared/ports/uiRouter.ts` | P1 | required-now |
| must-not-use | `src/**` implementation edit | P1 | required-now |
| must-not-use | typed ack vocabulary rewrite vagy reopen | P1 | required-now |
| must-not-use | lifecycle/state/policy ownership atcsusztatasa az executor boundary ala | P1 | required-now |

### 6) Test Matrix

| ID | Scenario | Given | When | Then | Priority | Timing | Evidence |
|---|---|---|---|---|---|---|---|
| T1 | delivery ack baseline preserved | current-tree source anchors elerhetok | a note elkeszul | explicit rogzitve van, hogy `accepted | rejected` closed baseline | P1 | required-now | doc review |
| T2 | launch ack baseline preserved | historical `E2a` task + start launch consume source anchor elerheto | a note elkeszul | explicit rogzitve van, hogy `running | failed_to_start` closed baseline | P1 | required-now | doc review |
| T3 | retained adapter separation | `tmuxDelivery.ts`, `metaReviewGateCommandDefaults.ts` source anchor inventory megvan | a note elkeszul | a retained `tmux` adapter kulon kategoriat kap, nem canonical contractkent szerepel | P1 | required-now | doc review |
| T4 | compat consumer inventory | `uiRouter.ts` es legacy `delivered` projection olvasva van | a note elkeszul | a compat/current consumer coupling explicit inventoryban szerepel | P1 | required-now | doc review |
| T5 | successor sequencing explicit | successor plan frissul | az `Opportunity 2` dispositiont olvassuk | az `O2-T1` current next bounded slice explicit task path-val latszik | P1 | required-now | doc review |

## L2 - Implementation Notes (Optional)

1. [later-hardening] Ha az `O2-T1` note utan is tul szeles marad a delivery/executor boundary, kulon implementation planban erdemes lehet szetvalasztani a launch es message-delivery adapter lane-t.
2. [later-hardening] Az `O3-T1` csak akkor induljon el, ha az `O2-T1` note tenyleg levagja a topology vs onboarding vocabulary osszefolyast.
