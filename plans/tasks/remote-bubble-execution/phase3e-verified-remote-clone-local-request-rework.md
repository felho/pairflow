---
artifact_type: task
artifact_id: task_remote_bubble_execution_phase3e_verified_remote_clone_local_request_rework_v1
title: "Remote Bubble Execution Verified Remote Clone Local Request-Rework (Phase 3E)"
status: implementable
phase: phase3e-verified-remote-clone-local-request-rework
target_files:
  - src/cli/commands/bubble/requestRework.ts
  - src/v11/application/approval/approvalCommandApi.ts
  - src/v11/application/approval/approvalCommandContract.ts
  - src/v11/application/approval/approvalCommandDependencyResolution.ts
  - src/v11/application/approval/approvalCommandOrchestration.ts
  - src/v11/application/approval/runApprovalFlow.ts
  - src/v11/application/approval/runApprovalFlowContext.ts
  - src/v11/application/approval/runApprovalFlowHandlers.ts
  - src/v11/infrastructure/executor/workspace/bubbleLookup.ts
  - src/v11/infrastructure/executor/workspace/workspaceResolution.ts
  - tests/cli/bubbleRequestReworkCommand.test.ts
  - tests/v11/application/approval/runApprovalFlow.test.ts
  - tests/core/bubble/workspaceResolution.test.ts
prd_ref: null
plan_ref: plans/archive/plans/remote-bubble-execution-contract-and-phasing-plan-v2.md
system_context_ref: docs/pairflow-initial-design.md
normative_refs:
  - plans/archive/plans/remote-bubble-execution-contract-and-phasing-plan-v2.md
  - plans/archive/tasks/remote-bubble-execution/phase3a-remote-approval-and-rework-routing.md
  - docs/remote-bubble-execution.md
owners:
  - "felho"
---

# Task: Remote Bubble Execution Verified Remote Clone Local Request-Rework (Phase 3E)

## Feynman Summary / One-Screen Model

1. A remote bubble `request-rework` jelenleg ket stabil utat ismer:
   - local bubble -> local mutation,
   - laptop thin-client + started remote pointer -> SSH-routed remote mutation.
2. A hianyzo workflow-gap az, amikor az operator mar egy verified remote bubble clone-ban review-zik
   - peldaul VS Code Remote SSH sessionben,
   - es ugyanebben a sessionben szeretne `pairflow bubble request-rework` parancsot kiadni.
3. A task lenyege:
   - engedni a `request-rework` local CLI vegrehajtasat a remote bubble sajat clone-jaban,
   - de csak akkor, ha a workspace-context eleg eros ahhoz, hogy ez tenyleg a canonical remote runtime authority legyen.
4. Ez nem altalanos remote operator parity task:
   - `approve` nincs scope-ban,
   - `reply` nincs scope-ban,
   - `commit/merge/delete` nincs scope-ban,
   - nincs generic remote-local mutation router.

## Current Codebase Check / Current-Tree Reality Check (2026-04-20)

1. A `pairflow bubble request-rework` CLI a `emitRequestReworkV11()` entrypointon keresztul a shared approval flow-ba megy:
   - [src/cli/commands/bubble/requestRework.ts](/Users/felho/dev/pairflow/src/cli/commands/bubble/requestRework.ts)
   - [src/v11/application/approval/approvalCommandApi.ts](/Users/felho/dev/pairflow/src/v11/application/approval/approvalCommandApi.ts)
2. A jelenlegi shared approval context minden `executor.type="ssh"` bubble-t remote route-kent kezel, es kotelezoen started `remote.json` pointert var:
   - [src/v11/application/approval/runApprovalFlowContext.ts](/Users/felho/dev/pairflow/src/v11/application/approval/runApprovalFlowContext.ts)
3. Emiatt a verified remote clone-ban futtatott local CLI `request-rework` jelenleg fail-closed tud maradni, mert a remote clone-ban nincs retained laptop-side started pointer contract.
4. A local `request-rework` mutation semanticaja mar kesz es helyes:
   - `READY_FOR_HUMAN_APPROVAL` -> immediate rework,
   - `WAITING_HUMAN` -> queued/deferred rework intent.
   Ezt ma a local branch kezeli:
   - [src/v11/application/approval/runApprovalFlowHandlers.ts](/Users/felho/dev/pairflow/src/v11/application/approval/runApprovalFlowHandlers.ts)
5. A repo mar tartalmaz remote clone felismeresi precedenst:
   - a workspace resolution tud ssh executor bubble-t remote-style clone rootbol feloldani,
   - [tests/core/bubble/workspaceResolution.test.ts](/Users/felho/dev/pairflow/tests/core/bubble/workspaceResolution.test.ts)
6. A repo mar tartalmaz bounded remote inner execution precedenst mas commandokhoz:
   - `commit`
   - `merge`
   - `delete`
   Ezek explicit remote inner execution contextet hasznalnak, de ez jelenleg nem all rendelkezesre a user-altal inditott review-session `request-rework` use-case-hez.
7. Fontos bounded-scope kovetkezmeny:
   - ezt a taskot nem szabad ugy megoldani, hogy a shared `approve + request-rework` contextet altalanosan fellazitja,
   - mert az feleslegesen ujranyitna az `approve` route selection boundaryt is.

## Parent Plan Fit / Stable Sequencing

1. Ez uj residual successor slice a remote execution lane-ben a `Phase 3D` closeout utan.
2. A task besorolasa:
   - `mutation_routing`
   - de nem a teljes `Phase 3A` csalad ujranyitasa, hanem egy kesoi, szukitett request-rework-only refinement.
3. Ez a task a kovetkezo lezart baseline-okra epul:
   - `Phase 2D` remote start activation,
   - `Phase 2E` remote status/list read-model,
   - `Phase 2F` remote attach consume,
   - `Phase 3A` remote approval/rework routed mutation baseline,
   - `Phase 3D` remote runtime availability/read-model semantics refinement.
4. Ez a task nem irhatja felul a thin-client modellt:
   - laptop source repo + started pointer tovabbra is routed remote mutation marad,
   - a local remote-clone execution csak egy uj, eros proofon alapulo additional path lehet.
5. Successor-owned scope marad:
   - `approve` verified remote clone local parity,
   - `reply` remote-local parity,
   - generic human mutation relay,
   - barmilyen background sync vagy laptop companion modell.

## Source-Anchor Consistency

1. Canonical source anchors:
   - [plans/archive/plans/remote-bubble-execution-contract-and-phasing-plan-v2.md](/Users/felho/dev/pairflow/plans/archive/plans/remote-bubble-execution-contract-and-phasing-plan-v2.md)
   - [plans/archive/tasks/remote-bubble-execution/phase3a-remote-approval-and-rework-routing.md](/Users/felho/dev/pairflow/plans/archive/tasks/remote-bubble-execution/phase3a-remote-approval-and-rework-routing.md)
   - [docs/remote-bubble-execution.md](/Users/felho/dev/pairflow/docs/remote-bubble-execution.md)
2. Closed canonical elements, amelyeket ez a task nem ertelmezhet ujra:
   - laptop thin-client remote mutation authorityja tovabbra is `remote.json(kind="started")`,
   - local source repo nem valhat remote runtime mutation truth-ta,
   - `state-cache.json` tovabbra is read-model cache, nem mutation authority,
   - a local `request-rework` immediate-vs-queued semanticaja retained baseline.
3. Uj explicit clarification, amelyet ez a task zár le:
   - verified remote clone contextben a canonical remote runtime state helyben is mutalhato `request-rework`-kel,
   - de ez csak context-derived es fail-closed proof mellett engedett.
4. Forbidden reinterpretations:
   - host alias, server nev, vagy explicit flag onmagaban nem authority proof,
   - `--repo` explicit path onmagaban nem eleg verified remote clone bizonyitasra,
   - a task nem allithatja be ugy, hogy minden `ssh` bubble local CLI remote clone-bol automatikusan local mutationta valik,
   - a task nem szelesitheti a supportot csendben `approve`-ra vagy `reply`-ra.
5. `drift_status`: `closed_contract_preserved`

## Implementation Target Decision

1. `implementable_now`: `yes`
2. A bounded task-shape:
   - request-rework-specific `mutation_routing` residual refinement.
3. A preferalt implementation shape:
   - kulon request-rework route preparation vagy equivalent szuk extract,
   - preferalt seam egy nevesitett request-rework-only elokeszito/helper
     - peldaul `prepareRequestReworkExecutionContext()`
     - vagy ezzel ekvivalens, kulon route-selection extract;
   - ne a shared approval context altalanos fellazitasaval oldjuk meg, ha az `approve` route-ot is mozgatna.
4. A task akkor jo, ha:
   - a `request-rework` route selection context-derived lesz,
   - a verified remote clone path explicit es szuk,
   - a laptop thin-client path retained marad,
   - a created/missing/ambiguous esetek fail-closed maradnak,
   - es a bounded seam bizonyitja, hogy az `approve` route selection boundary nem mozdul el.

## Authority Boundary Map

1. `authority_producer`
   - nincs uj authority producer ebben a taskban;
   - a canonical remote bubble state/trancript authority retained baseline marad.
2. `persisted_authority`
   - retained baseline:
   - remote bubble runtime state a canonical remote workspace-ben el;
   - laptop oldalon a thin-client remote pointer/cache model retained marad.
3. `internal_execution_consumers`
   - in scope:
   - `request-rework` local-vs-remote execution context preparation,
   - verified remote clone proof consume,
   - local immediate/queued rework semantic branch re-use.
4. `workflow_orchestration_consumers`
   - in scope:
   - approval/request-rework route selection,
   - fail-closed branching `created` / missing / ambiguous / invalid-context esetekre.
5. `read_model_consumers`
   - explicit out of scope:
   - `status`, `list`, attach, cache semantics, UI projection.
6. `cleanup_recovery_consumers`
   - explicit out of scope:
   - commit/merge/delete cleanup family,
   - restart/recovery rollout,
   - archive continuity.
7. `export_surfaces_closed_in_this_phase`
   - igen:
   - nincs uj generic remote-local operator API,
   - nincs uj public CLI flag vagy host/server-azonosito contract,
   - nincs `approve`-ra kiterjesztett shared route contract.

## Closure Budget / Task-Shape Triage

1. `closure_buckets_touched`
   - `internal_execution_consumers`
   - `workflow_orchestration_consumers`
2. `closure_buckets_not_touched`
   - `authority_producer`
   - `persisted_authority_or_schema`
   - `read_model_consumers`
   - `cleanup_recovery_consumers`
   - `coordination_concurrency_hardening`
3. `collapsed_closures`
   - `internal_execution_consumers` + `workflow_orchestration_consumers`
4. `why_collapse_is_safe`
   - ugyanazt a correctness boundaryt zárják:
   - a `request-rework` route selection csak azt dönti el, hogy a retained semanticat melyik mar letezo authority workspace-en futtatjuk;
   - nem vezet be uj persisted authorityt, nem mozgat read-modelt, es nem nyit cleanup/recovery feluletet.
5. `explicitly_deferred_closures`
   - `approve` parity,
   - `reply` parity,
   - generic human mutation relay,
   - read-model/status/list/attach semantics,
   - cleanup/recovery family.
6. `primary_task_shape`
   - `consumer_family_alignment`
7. `secondary_task_shape`
   - `N/A`
8. `why_no_secondary_shape`
   - a task nem termel uj authorityt, nem valtoztat persisted contractot, es nem read-model activation slice;
   - a scope a retained authority egyetlen consumer familyjanak alignmentja.

## Complexity-Risk Triage

1. `risk_score`
   - `4`
2. `split_decision`
   - `single_task_acceptable`
3. `authority_risk`
   - `1`
   - ugyanazon canonical remote runtime authorityhoz ad uj consume utat, de nem vezet be uj authorityt.
4. `surface_spread`
   - `1`
   - CLI -> approval routing -> workspace proof -> tests.
5. `identity_join_risk`
   - `1`
   - bubble ID / workspace / repo authority egyeztetes correctness-critical.
6. `activation_coupling`
   - `0`
   - nincs uj runtime activation.
7. `prerequisite_risk`
   - `1`
   - retained thin-client pointer model es existing workspace resolution correctness feltetel.
8. `acceptance_multiplicity`
   - `0`
   - egy szuk operator gap closure a cel, nem tobb user-visible family.
9. `authority_source_of_truth_note`
   - a canonical source-of-truth retained:
   - verified remote clone local execution nem uj truth, csak ugyanannak a remote runtime authoritynak uj consume-pathja.
10. `seam_risk_note`
    - a legnagyobb bounded-slice kockazat a shared approval context veletlen ujranyitasa;
    - ezert a task csak akkor maradhat egyetlen bounded slice, ha a request-rework-only seam explicit.

## Baseline Preservation

1. `must_preserve_behaviors`
   - laptop thin-client remote bubble `request-rework` tovabbra is started-pointer-based SSH-routed mutation,
   - local bubble `request-rework` retained local immediate/queued semantics,
   - `created` / missing pointer tovabbra is explicit fail-closed,
   - `approve` retained behavior valtozatlan.
2. `allowed_resolution_paths`
   - local bubble -> retained local mutation path,
   - remote bubble + verified remote clone proof -> uj local remote-clone mutation path,
   - remote bubble + thin-client started pointer -> retained remote-routed path.
3. `forbidden_regression_interpretations`
   - laptop source repo remote bubble eseten local mutation fallback,
   - `resolveBubbleById` vagy `--repo` onmagaban mint authority proof,
   - existing inner-execution env-var contract csendes kiterjesztese user-driven review session route-kivalasztasra,
   - `approve` parity hallgatolagos beemelese ugyanabba a taskba,
   - shared approval execution context request-rework-only proof nelkuli fellazitasa.
4. `replacement_proof_required_if_removed`
   - ha a retained thin-client routed path vagy a current shared approval context barmely resze elmozdulna, explicit proof kell arrol, hogy:
   - az `approve` behavior nem regresszal,
   - a laptop source repo tovabbra sem valhat local mutation truth-ta,
   - es a remote clone path ugyanarra a canonical state-re mutat.

## Precondition and Side-Effect Boundary

1. `validations_that_must_pass_before_route_selection_finalization`
   - a bubble ID sikeresen feloldhato,
   - a workspace-context bubble-workspacekent feloldhato vagy explicit thin-client repo-kent ertelmezheto,
   - remote bubble eseten a verified remote clone proof vagy a retained thin-client started-pointer authority egyertelmuen bizonyithato.
2. `validations_that_must_pass_before_local_remote_clone_mutation`
   - a feloldott bubble ID egyezik a command bubble ID-javal,
   - a bubble `executor.type="ssh"`,
   - a current workspace remote-style clone authoritynak felel meg,
   - a context nem source-repo retained remote artifact boundary,
   - nincs `created`, missing, vagy ambiguous proof-allapot.
3. `side_effects_forbidden_before_these_validations_pass`
   - local state snapshot read mint mutation input,
   - transcript append,
   - deferred rework intent write,
   - barmilyen local mutation branch kivalasztasa.
4. `invalid_precondition_failure_behavior`
   - `zero_side_effect`
   - explicit fail-closed hiba, nincs fallback local mutation.
5. `proof_ordering_requirement`
   - eloszor a context-derived route proofot kell lezarni,
   - csak ezutan szabad local-vs-remote execution branchre lepni,
   - es local remote-clone route csak akkor valaszthato, ha a thin-client fallback kizart, nem csak azert, mert a bubble ssh executoros.
6. `coordination_primitives_in_scope`
   - `N/A`
   - a task nem vezet be uj lock/mutex/idempotency/serialization primitivet.
7. `shared_context_modification_rule`
   - ha az implementacio kulon request-rework seam nelkul megis a shared `initializeApprovalFlowExecutionContext()` vagy ekvivalens kozos route-elokeszito felszint modositja,
   - akkor explicit proof kell arrol, hogy az `approve` route selection,
   - az `approve` thin-client started-pointer kovetelmenye,
   - es az `approve` remote/local branch viselkedese valtozatlan marad.

## L0 - Policy

### Goal

Lezarni a verified remote clone-bol futtatott local `request-rework` execution supportot ugy, hogy:
1. a contextual review session ugyanabban a remote clone-ban ki tudja adni a canonical `request-rework` mutationt,
2. a laptop thin-client routed remote mutation baseline valtozatlanul megmaradjon,
3. a local source repo soha ne essen vissza remote bubble local mutation truthra,
4. a support csak a `request-rework` parancsra nyiljon meg.

### Domain / Control Model Summary

1. Business invariant:
   - remote bubble eseten a `request-rework` mutation authorityja mindig a bubble canonical runtime workspace-e;
   - ez lehet
     - a laptoprol routed remote mutation,
     - vagy verified remote clone local execution,
     - de ugyanarra a canonical bubble state-re kell mutatnia.
2. Control model:
   - `local bubble` -> retained local mutation path,
   - `remote bubble + laptop thin client` -> retained started-pointer-based remote-routed path,
   - `remote bubble + verified remote clone` -> uj local remote-clone mutation path,
   - minden mas eset -> fail-closed.
3. Read-path / mutation-path rule:
   - route selection context-derived legyen,
   - user-declared host/server alias vagy explicit opt-in flag ne legyen authority source,
   - a verified remote clone proof a workspace-contextbol jojjon,
   - es a proof request-rework-only seamre zaruljon, ne implicit shared approval wideningre.
4. Allowed resolution path:
   - a command megprobalhatja feloldani, hogy a jelenlegi cwd ugyanannak a bubble-nek verified remote clone workspace-e-e,
   - ha igen, a retained local `request-rework` mutation semanticat hasznalja helyben,
   - ha nem, es thin-client started pointer letezik, marad a routed remote path,
   - ha egyik sem bizonyithato eleg erosnek, fail-closed marad.
5. Forbidden fallback:
   - laptop source repo remote bubble eseten local transcript/state mutation,
   - hostnev/szervernev string egyezese mint authority proof,
   - `approve` parity csendes beemelese,
   - generic multi-command remote-local operator router.
6. Missing-data rule:
   - `created` pointer vagy thin-client missing pointer tovabbra is `start first` / explicit fail-closed,
   - ambiguous workspace vagy bubble mismatch eseten nincs local remote-clone mutation,
   - ha a verified remote clone proof reszleges vagy szennyezett, nincs fallback local mutation.
7. Phase boundary:
   - ez `request-rework` mutation routing refinement,
   - `approve`, `reply`, cleanup, recovery, cache, status/list nem ownership.

### In Scope

1. `request-rework` route selection explicit bovitese verified remote clone contextre.
2. Verified remote clone proof kialakitasa vagy ujrahasznalata request-rework use-case-re.
3. A retained local request-rework semanticak ujrafelhasznalasa verified remote clone pathon:
   - immediate rework,
   - queued/deferred rework.
4. A thin-client routed remote path retained megorzese.
5. A fail-closed guardok explicit tesztelesenek bovitese.
6. A request-rework-only seam explicit ownershipa:
   - kulon helper/extract,
   - vagy ezzel ekvivalens bizonyitas, hogy a shared approval context nem nyitja ujra az `approve` route boundaryt.

### Out of Scope

1. `approve` local remote-clone support.
2. `reply` local remote-clone support.
3. Generic human mutation parity.
4. Background sync, laptop relay, companion process, VS Code extension.
5. `remote.json` remote clone-ba valo syncelese mint workaround.

### Safety Defaults

1. A verified remote clone local execution csak akkor engedett, ha a workspace proof explicit es egyertelmu.
2. A laptop source repo remote bubble eseten tovabbra sem mehet local mutation branchre.
3. A thin-client routed path maradjon az alapertelmezett remote bubble operator path, ha a command nem bizonyitott remote clone-ban fut.
4. A task nem gyarthat uj generic remote-local approval contextet.

## L1 - Change Contract

### Route Selection Contract

1. `local bubble`
   - retained local `request-rework`.
2. `remote bubble`, verified remote clone contexttel
   - local remote-clone `request-rework`,
   - nincs SSH loopback.
3. `remote bubble`, thin-client contexttel
   - retained SSH-routed remote `request-rework`.
4. `remote bubble`, de `created` / missing / ambiguous
   - explicit fail-closed,
   - nincs local fallback.

### Verified Remote Clone Proof Contract

1. A proof minimuma:
   - a jelenlegi workspace bubble-workspacekent feloldhato,
   - a feloldott bubble ID egyezik a command bubble ID-javal,
   - a bubble `executor.type="ssh"`,
   - a workspace remote-style clone authoritynak felel meg,
   - a context nem a source-repo thin-client retained remote artifact boundaryjat tukrozi.
2. A proof forrasai lehetnek:
   - workspace resolution,
   - bubble lookup,
   - canonicalized workspace/repo path egyezes,
   - retained source-repo remote artifact absence/presence.
3. Ami nem eleg onmagaban proofnak:
   - host alias,
   - `--repo`,
   - `process.cwd()` puszta egyezese,
   - az, hogy a bubble ssh executoros.

### Touch Envelope / Bounded Placement

1. A task csak a `request-rework` family route preparationt nyithatja meg.
2. Ha uj helper szuletik, az maradjon az approval/request-rework familyben.
3. A shared `initializeApprovalFlowExecutionContext()` altalanos fellazitasa csak akkor megengedett, ha az `approve` route explicit retained proofja ugyanabban a taskban bizonyithato; egyebkent kulon request-rework-specific routing extract kell.
4. A workspace resolution surfaces csak proof-ownership miatt touched, nem generic runtime-local feature miatt.
5. Preferalt touched seam:
   - `request-rework`-only route-preparation helper vagy equivalent orchestration extract.
6. Nem preferalt, de csak explicit retained-proof mellett elfogadhato seam:
   - shared approval execution context vagy shared route selector modositasa.

### Error / Fail-Closed Contract

1. Verified remote clone proof sikertelen:
   - nincs local mutation,
   - route selection visszaeshet retained thin-client remote pathra csak akkor, ha a thin-client started pointer authority tenyleg jelen van.
2. Thin-client remote pointer `created` vagy missing:
   - retained explicit fail-closed.
3. Workspace bubble mismatch:
   - explicit invalid-context hiba.
4. Source-repo remote artifact boundary jelen van ott, ahol local remote-clone mutationet akarunk:
   - explicit invalid remote execution context hiba.

### Test Matrix

1. T1
   - local bubble retained behavior valtozatlan.
2. T2
   - laptop thin-client remote bubble retained SSH-routed behavior valtozatlan.
3. T3
   - verified remote clone + `READY_FOR_HUMAN_APPROVAL` -> local immediate rework.
4. T4
   - verified remote clone + `WAITING_HUMAN` -> local queued rework intent.
5. T5
   - verified remote clone, de bubble ID mismatch -> fail-closed.
6. T6
   - remote bubble thin-client source repo + missing/created pointer -> retained fail-closed, nincs local fallback.
7. T7
   - remote bubble context ambiguous -> fail-closed.
8. T8
   - `approve` retained behavior explicit regresszioellenorzes: nem nyilik meg local remote-clone parity csendben.
9. T9
   - ha shared approval context touched, kulon teszt bizonyitja, hogy az `approve` route tovabbra is started-pointer-based thin-client remote route marad.

### Must-Use / Must-Not-Use

1. Must use:
   - existing local `request-rework` semantic branch ownership,
   - existing workspace resolution / bubble lookup reality,
   - existing thin-client remote routing baseline.
2. Must not use:
   - server-name parameter mint authority proof,
   - `remote.json` remote clone-ba valo sync workaround,
   - generic operator command bus,
   - shared `approve + request-rework + reply` parity taskba valo osszemosas,
   - request-rework-only seam explicit megnevezese vagy retained-proof nelkuli shared approval widening.

## L2 - Implementation Notes (Optional)

1. Ha a request-rework route preparation kulon helperre valik, azt ugy erdemes elnevezni, hogy kesobb `approve` parity task mellett is bounded maradjon.
2. Ha a workspace proofhoz kulon diagnostics kellenek, azok fail-closed operator hibat adjanak, ne csendes branch selectiont.
3. Ha a reviewer nem tudja egy mondatban megmondani, hogy a `request-rework` seam pontosan hol valik le a shared approval contextrol, a task meg mindig tul implicit.

## Review Control

1. Reviewer fo kerdese:
   - a task valoban csak a contextual `request-rework` gapet zarta le?
2. Required-now blockernek szamit:
   - laptop source repo local fallback regresszio,
   - `approve` scope csendes beemelese,
   - workspace proof gyenge heurisztikara redukalasa,
   - request-rework-only seam nevesitett vagy explicit retained-proof nelkuli hianya.
3. Later-hardening tema:
   - `approve` parity,
   - `reply` parity,
   - generic local action relay model.

## Spec Lock

Mark task as `IMPLEMENTABLE` when:
1. a route selection explicit es context-derived,
2. a verified remote clone proof explicit es fail-closed,
3. a thin-client routed remote path retained,
4. a support csak `request-rework`-re nyilik meg,
5. az immediate/queued semanticak valtozatlanul megmaradnak.
