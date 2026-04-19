---
artifact_type: task
artifact_id: task_remote_bubble_execution_phase1d_bubble_loop_consume_alignment_v1
title: "Remote Bubble Execution Bubble-Loop Consume Alignment (Phase 1D)"
status: implementable
phase: phase1d-bubble-loop-consume-alignment
target_files:
  - src/v11/shared/actorProtocol/actorEmitContext.ts
  - src/v11/application/actorProtocol/actorProtocolEmitters.ts
  - src/v11/application/pass/passWorkspaceContextPreparation.ts
  - src/v11/application/askHuman/askHumanWorkspaceContextPreparation.ts
  - src/v11/application/converged/convergedRoutingPreparation.ts
  - tests/v11/application/actorProtocol/emitActorProtocolV11.test.ts
  - tests/v11/application/pass/passWorkspaceContextPreparation.test.ts
  - tests/v11/application/askHuman/askHumanWorkspaceContextPreparation.test.ts
  - tests/v11/application/converged/convergedRoutingPreparation.test.ts
prd_ref: null
plan_ref: plans/archive/plans/remote-bubble-execution-contract-and-phasing-plan-v2.md
system_context_ref: docs/pairflow-initial-design.md
owners:
  - "felho"
---

# Task: Remote Bubble Execution Bubble-Loop Consume Alignment (Phase 1D)

## Current Codebase Check (2026-04-13)

1. A Phase 1C2 lezarta a tmux runtime delivery es reviewer-context consume csaladot:
   - `src/v11/infrastructure/channel/tmux/tmuxDeliveryRuntime.ts`
   - `src/v11/infrastructure/channel/tmux/tmuxDelivery.ts`
   - `src/v11/infrastructure/channel/tmux/reviewerContext.ts`
   mar a kozos `resolveRuntimeSessionWorkspaceAuthority(...)` helperre ul.
2. A bubble-loop wrapper consume azonban tovabbra is retained worktree nyelven viszi tovabb az authoritative runtime kontextust:
   - `src/v11/shared/actorProtocol/actorEmitContext.ts` ma csak `worktree_path` mezot materializal,
   - `src/v11/application/actorProtocol/actorProtocolEmitters.ts` a `pass`, `human_question`, `convergence`, `meta_review_result` wrapper dispatchnal `cwd: context.worktree_path`-ot ad tovabb,
   - `src/v11/application/pass/passWorkspaceContextPreparation.ts`,
   - `src/v11/application/askHuman/askHumanWorkspaceContextPreparation.ts`,
   - `src/v11/application/converged/convergedRoutingPreparation.ts`
     az authoritative actor contextbol ugyanebbol a retained `worktree_path` mezobol epitik ujra a futasi `cwd` truthot.
3. Ugyanakkor ugyanebben a bubble-loop consume csaladban vannak olyan retained pathok, amelyeket nem szabad workspace rootra "szigorítani":
   - `bubblePaths.worktreePath` tovabbra is a bubble worktree artifact/test/transcript referenciakhoz kotodik,
   - `pass` validacios es reviewer-evidence pathok ma valos worktree-alapu artifact szemantikaval elnek.
4. Emiatt a Phase 1D-ben nem sima `no_split` naming cutover a jo modell, hanem explicit authority split:
   - `workspace_path`: canonical executable workspace root,
   - `worktree_path`: retained bubble worktree / artifact traceability root.
5. A plan szerint ez a fazis csak `workflow_orchestration_closure`:
   - `pass`,
   - `converged`,
   - `ask-human`,
   - `meta_review_result`
     bubble-loop consume-ja all at canonical workspace authorityra,
     mikozben a clone-success activation tovabbra is successor-only `Phase 2A`.
6. A shared-contract blast radius mar emiatt sem kezelheto implicit modon:
   - a concrete `ActorEmitContextSnapshot` materialization es a wrapper/prep runtime consume a task target surface-ben van,
   - de tobb downstream file csak type-importkent hordozza a snapshotot.
   A Phase 1D tasknak explicitten kulon kell valasztania a required-now behavioral consume-okat a compile-follow inventorytol.

## Implementation Target Decision

1. `implementable_now`: `yes`
2. Ez a fazis a Phase 1C2 utan kovetkezik, de tovabbra sem activation task.
3. A feladat a bubble-loop authoritative actor wrapper consume explicit atallitasa:
   - actor emit context snapshot canonical executable workspace authorityt vigyen tovabb,
   - a wrapper dispatch `cwd` mar ezt a canonical workspace rootot hasznalja,
   - a pass / converged / ask-human workspace-prep consume ugyanezt a runtime truthot vegye at authoritative contextrol.
4. Default consume-decision ebben a fazisban: `display_traceability_split`:
   - az executable runtime root kulon `workspace_path` mezoneven el,
   - a retained artifact/worktree reference kulon `worktree_path` mezoneven marad.
5. A task nem vallalja:
   - a kozvetlen `resolveBubbleFromWorkspaceCwd(...)` clone-success activationjat,
   - operator read-model atallitast,
   - cleanup/merge/delete consume alignmentet.
6. Shared-contract blast-radius decision:
   - required-now csak azokra a consume-okra es fixture-literalokra terjed ki, amelyek ebben a fazisban tenylegesen readelik vagy tovabbforwardoljak az executable root truthot,
   - a pusztan type-importkent elo downstream contractok inventory-only kovetkezmenyek; ezek nem nyitnak uj behavioral scope-ot Phase 1D-ben.

## L0 - Policy

### Goal

Lezarni a bubble-loop consume reteget ugy, hogy az authoritative actor wrapper family ugyanazt a canonical runtime workspace rootot hasznalja, mint a Phase 1C2 delivery/reviewer consume, mikozben a retained bubble worktree path tovabbra is csak artifact- es traceability-szemantikaban marad meg.

### Domain / Control Model Summary

1. Business invariant: egy aktiv bubble-loop emit (`pass`, `converged`, `ask-human`, `meta_review_result`) nem szakadthat ket kulon futasi workspace truthra; authoritative wrapper dispatch es command-elokeszites ugyanazt a canonical runtime workspace rootot hasznalja.
2. Control model: authoritative actor wrapper consume eseten a runtime session authority chain (`workspacePath`, `workspaceKind`, illetve explicit same-authority legacy worktree fallback ugyanazon helperen keresztul) donti el az executable `cwd` truthot.
3. Read-path rule: authoritative actor context es wrapper dispatch csak a runtime session authority chainbol szarmaztatott `workspace_path`-ot hasznalhatja executable rootkent; retained artifact/worktree path tovabbra is a bubble paths vagy a kulon `worktree_path` traceability mezon maradhat.
4. Forbidden fallback:
   - `resolved.bubblePaths.worktreePath` kozvetlen executable truthkent authoritative wrapper consume-ban,
   - `context.worktree_path` executable rootkent,
   - clone-only legacy worktree fallback canonical runtime authority nelkul.
5. Allowed resolution path:
   - explicit runtime session `workspacePath` + `workspaceKind`,
   - worktree/no-split legacy runtime session authority ugyanazon helperen keresztul,
   - retained `worktree_path` csak artifact/traceability célra.
6. Missing-data rule: ha authoritative actor wrapper consume-hoz nincs ervenyes runtime workspace authority, a wrapper path fail-closed marad; nincs silent fallback bubble worktree truthra. A nem-authoritative, kozvetlen worktree-cwd invocation baseline viszont ebben a fazisban retained marad.
7. Phase boundary:
   - contract closure: successor-only, a persisted runtime authority contract mar letezik
   - producer closure: successor-only, Phase 1B2-ben lezart
   - internal execution closure: predecessor-owned a tmux delivery/reviewer consume familyben
   - workflow/orchestration closure: owned here a bubble-loop authoritative wrapper consume csaladban
   - read-model closure: successor-only
   - activation closure: successor-only
   - cleanup/recovery closure: successor-only
8. Blast-radius rule:
   - az explicit `workspace_path` mezot ez a task megkovetelheti a shared actor emit snapshoton,
   - de required-now proof csak a bubble-loop wrapper/prep consume csaladban es az ezeket bizonyito fixture/test literalokban kotelezo,
   - a type-only downstream importerek Phase 1D-ben inventory-only hatassal szerepelnek, nem uj behavioral ownershipkent.

### Authority Boundary Map

1. `authority_producer`
   - Phase 1B2 runtime session authority producer seam
   - Phase 1C1 start/tmux launch authority consume retained baselineje
2. `persisted_authority`
   - runtime session record `workspacePath`, `workspaceKind`, retained `worktreePath`
3. `workflow_orchestration_consumers` in scope
   - `src/v11/shared/actorProtocol/actorEmitContext.ts`
   - `src/v11/application/actorProtocol/actorProtocolEmitters.ts`
   - `src/v11/application/pass/passWorkspaceContextPreparation.ts`
   - `src/v11/application/askHuman/askHumanWorkspaceContextPreparation.ts`
   - `src/v11/application/converged/convergedRoutingPreparation.ts`
4. Explicit out-of-scope consumers
   - tmux delivery/reviewer refresh runtime family (Phase 1C2 mar lezarta)
   - operator read-model (`status`, `list`, `attach`)
   - local clone-topology activation (`Phase 2A`)
   - cleanup/recovery routing
5. Export surfaces closed in this phase:
   - `no`
   - a bubble-loop orchestration consume zarul, de sem activation, sem operator export surface nem.

### Baseline Preservation

1. Must-preserve behaviors:
   - a bubble artifact/transcript/state/test-evidence pathok tovabbra is a retained bubble worktree rootot referaljak ott, ahol ez valos artifact szemantika,
   - a kozvetlen worktree-mode manual invocation baseline valtozatlan marad,
   - a meta-review authority role/execution-id gate semantics valtozatlan marad,
   - a converged path tovabbra is ujraolvassa a persisted state-et stale guard elott.
2. Allowed resolution paths:
   - authoritative wrapper dispatch -> runtime session authority helper -> `workspace_path`,
   - retained artifact paths -> `bubblePaths.worktreePath` vagy explicit `worktree_path`,
   - same-authority legacy worktree fallback csak a kozos runtime authority helperen keresztul.
3. Forbidden regression interpretations:
   - a Phase 1D consume cutover nem jelent artifact-path cutovert,
   - a Phase 1D consume cutover nem autorizalja a bubblePaths teljes `workspace_path`-ra nevezeset,
   - a Phase 1D consume cutover nem aktiválja a clone-success direct cwd resolutiont.
4. Replacement proof required if removed:
   - ha barmely retained worktree-path consume elhagyasa felmerul, bizonyitani kell, hogy az erintett artifact/transcript/test-evidence path tovabbra is ugyanarra a bubble worktree rootra mutat es nem valik runtime workspace heurisztikava.

### In Scope

1. Az authoritative actor emit context snapshot runtime-session authority alapu executable workspace consume-ja.
2. A `pass`, `converged`, `ask-human`, `meta_review_result` wrapper dispatch canonical workspace rootra allitasa.
3. A pass / converged / ask-human workspace context preparation consume atallitasa, amikor authoritative actor context all rendelkezesre.
4. Az explicit `workspace_path` vs retained `worktree_path` split dokumentalt es tesztelt bevezetese a bubble-loop consume csaladban.

### Out of Scope

1. Tmux launch / runtime delivery / reviewer refresh consume family
2. Direct non-authoritative clone-workspace authority resolution / activation
3. Operator read-model es attach/status/list consume
4. Commit/merge/delete cleanup consume
5. Meta-review authoritative prep seam bevezetese; ebben a fazisban a `meta_review_result` consume wrapper-only marad

### Safety Defaults

1. Authoritative wrapper consume authority nelkul fail-closed marad.
2. Retained artifact/worktree paths nem valhatnak implicit executable rootta.
3. Ha a runtime authority explicit clone-only legacy fallbackra fut ki canonical workspace nelkul, wrapper dispatch nem indulhat el.

### Contract Boundary / Blast Radius

1. `contract_boundary_override`: `no`
2. Fan-out note:
   - shared actor-context/result shape additiv szukitessel valtozhat,
   - de public/operator contract es activation semantics nem nyilik ujra ebben a fazisban.
3. Direct required-now blast radius:
   - `src/v11/shared/actorProtocol/actorEmitContext.ts`
   - `src/v11/application/actorProtocol/actorProtocolEmitters.ts`
   - `src/v11/application/pass/passWorkspaceContextPreparation.ts`
   - `src/v11/application/askHuman/askHumanWorkspaceContextPreparation.ts`
   - `src/v11/application/converged/convergedRoutingPreparation.ts`
   - az ezeket bizonyito concrete snapshot fixture/test literalok a celzott `tests/v11/application/**` fajlokban
4. Inventory-only compile-follow surfaces:
   - `src/v11/application/actorProtocol/emitActorProtocolV11.ts`
   - `src/v11/application/pass/passCommandContract.ts`
   - `src/v11/application/pass/emitPassContextBuilder.ts`
   - `src/v11/application/converged/runConvergedFlowContract.ts`
   - `src/v11/application/converged/convergedFlowInvocationBuilders.ts`
   - `src/v11/shared/converged/convergedCommandTypes.ts`
   - `src/v11/shared/askHuman/**`
   Ezek type-contract inventorykent szerepelnek; csak akkor válnak edit-targette, ha a concrete Phase 1D proofhoz tenyleges fixture vagy compile-fix kell.

### Complexity Risk Gate

1. `authority_risk`: `1`
2. `surface_spread`: `1`
3. `identity_join_risk`: `2`
4. `activation_coupling`: `0`
5. `prerequisite_risk`: `1`
6. `acceptance_multiplicity`: `1`
7. `risk_score`: `6`
8. `single-task allowed`: `yes`
9. If `no`, required split:
   - `N/A`
   - `N/A`
   - `N/A`
10. Identity/join note:
   - canonical identity path: runtime session authority -> actor emit context -> wrapper dispatch cwd
   - competing identifiers or fallback identities: retained `bubblePaths.worktreePath`, retained `context.worktree_path`, legacy clone-only worktree fallback
11. Authority/source-of-truth note:
   - canonical source: runtime session `workspacePath` / `workspaceKind` ugyanazon helperen keresztul
   - forbidden secondary sources: `bubblePaths.worktreePath` es `context.worktree_path` executable truthkent

## L1 - Change Contract

### 0) Domain / Control Contract

| Item | Rule | Implementation Consequence | Priority | Timing |
| --- | --- | --- | --- | --- |
| Business invariant | A bubble-loop authoritative wrapper consume ugyanazt a runtime workspace truthot hasznalja, mint a Phase 1C2 delivery family. | A wrapper `cwd` es az authoritative workspace prep nem terhet vissza statikus worktree truthra. | P1 | required-now |
| Control model | Authoritative actor wrapper consume eseten a runtime session authority chain donti el az executable workspace rootot. | `workspace_path` explicit consume kotelezo, retained `worktree_path` csak traceabilityre maradhat. | P1 | required-now |
| Read-path rule | Wrapper dispatch es authoritative prep csak a runtime authoritybol szarmaztatott executable workspace rootot olvashatja. | `actorEmitContext` vagy egy vele ekvivalens helper materializalja a canonical `workspace_path`-ot. | P1 | required-now |
| Forbidden fallback | `context.worktree_path` es `bubblePaths.worktreePath` nem lehet authoritative wrapper `cwd`. | A Phase 1D consume family fail-closed marad authority hianyaban. | P1 | required-now |
| Allowed resolution path | Explicit runtime `workspacePath` + `workspaceKind`, vagy same-authority legacy worktree fallback a kozos helperen keresztul. | Nem minden worktree-path tilos; csak az executable truth. Artifact-path retain tovabbra is ervenyes. | P1 | required-now |
| Missing-data rule | Authority hianyaban az authoritative wrapper path megall. | Nincs wrapper-dispatch, nincs silent fallback, nincs implicit clone/worktree truth. | P1 | required-now |
| Phase boundary | Ez a task bubble-loop workflow/orchestration consume alignment. | Activation, read-model es cleanup successor ownership marad. | P2 | required-now |

### 0a) Shared Contract Compatibility (if applicable)

| Shared Contract | Current Consumers | Change Type (`additive|breaking|N/A`) | This Task Action | Deferred Alignment |
| --- | --- | --- | --- | --- |
| `src/v11/shared/actorProtocol/actorEmitContext.ts` `ActorEmitContextSnapshot` | actor protocol wrappers (`pass`, `human_question`, `convergence`, `meta_review_result`), wrapper/prep tests, direct wrapper entry contract, pass/converged/ask-human shared command contracts type-import szinten | additive | explicit `workspace_path` executable-root field bevezetese; required-now edit ownership csak a direct Phase 1D consume-okon es concrete snapshot fixture-literalokon, nem az osszes type-importalo downstream fileon | direct non-authoritative cwd activation Phase 2A |
| authoritative workspace prep consume (`pass` / `converged` / `ask-human`) | bubble-loop command orchestration family | additive | authoritative context eseten `cwd` a `workspace_path`-ra all at, mikozben artifact pathok retained worktree pathon maradnak | operator read-model successor-only |
| downstream type-only imports of `ActorEmitContextSnapshot` a bubble-loop command familyben | `src/v11/application/actorProtocol/emitActorProtocolV11.ts`, `src/v11/application/pass/passCommandContract.ts`, `src/v11/application/pass/emitPassContextBuilder.ts`, `src/v11/application/converged/runConvergedFlowContract.ts`, `src/v11/application/converged/convergedFlowInvocationBuilders.ts`, `src/v11/shared/converged/convergedCommandTypes.ts`, `src/v11/shared/askHuman/**` | N/A | inventory-only blast-radius disclosure; standalone semantic rewrite nem required-now, csak compile-follow repair ha a concrete snapshot shape miatt tenylegesen szukseges | operator/read-model/activation surfaces tovabbra is successor-only |

### 0b) Baseline Preservation (if applicable)

| Current Behavior | Preserve/Replace/Forbid | Required Proof | Priority | Timing |
| --- | --- | --- | --- | --- |
| actor wrapper dispatch `cwd: context.worktree_path` | replace | split-path wrapper fixture bizonyitja, hogy a tovabbforwardolt `cwd` explicit `workspace_path`, es explicit nem a retained `worktree_path` | P1 | required-now |
| bubble artifact/transcript/test-evidence path bubble worktree rooton marad | preserve | pass/ask-human/converged prep tesztek igazoljak, hogy a retained artifact pathok nem valnak workspace cwd-va | P1 | required-now |
| direct worktree-mode manual invocation retained | preserve | nincs regresszio a nem-authoritative cwd resolution baseline-ben | P1 | required-now |
| clone-only legacy fallback canonical workspace authority nelkul | forbid | actor context / wrapper path fail-closed teszt | P1 | required-now |

### 0c) Authority Consumption Decision Table

| Path Class | Source Of Truth | Allowed Executable Root | Retained Traceability Root | Forbidden Shortcut | Evidence |
| --- | --- | --- | --- | --- | --- |
| authoritative actor wrapper dispatch | `ActorEmitContextSnapshot.workspace_path` runtime-session authority helperen keresztul | `context.workspace_path` | `context.worktree_path` | `context.worktree_path` kozvetlen `cwd`-kent | T3, T5, T6, T7, T8, T15 |
| authoritative prep reuse branch | authoritative actor context + retained `bubblePaths` | authoritative `workspace_path` | `resolved.bubblePaths.worktreePath` | retained artifact path visszaemelese executable rootta | T9, T10, T11 |
| direct non-authoritative invocation | meglevo direct workspace-resolution baseline | jelenlegi direct resolution eredmenye | `resolved.bubblePaths.worktreePath` | Phase 1D-ben uj clone activation vagy implicit `workspace_path` kovetkeztetes | T12, T13, T14 |
| artifact / transcript / evidence references | retained bubble paths | `N/A` | `bubblePaths.worktreePath` | teljes retained-path rename `workspace_path`-ra | T9, T10, T11 |

### 1) Call-site Matrix

| ID | File | Function/Entry | Exact Signature (args -> return) | Insertion Point | Expected Behavior | Priority | Timing | Evidence |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| CS1 | `src/v11/shared/actorProtocol/actorEmitContext.ts` | `resolveActorEmitContextByBubbleId(...)`, `resolveCompatActorEmitContextFromWorkspace(...)` | `(input|cwd) -> Promise<ActorEmitContextSnapshot>` | actor authority snapshot materialization | a snapshot explicit executable `workspace_path`-ot ad a runtime session authority helperrol; retained `worktree_path` kulon megmarad | P1 | required-now | T1-T4 |
| CS2 | `src/v11/application/actorProtocol/actorProtocolEmitters.ts` | `emitPassActorResultV11(...)` | `(input) -> Promise<ActorEmitResultV11 pass>` | wrapper dispatch `cwd` | split-path fixture alatt a downstream emit pontosan `cwd === context.workspace_path` erteket kap, es explicit nem `context.worktree_path`-ot | P1 | required-now | T5, T15 |
| CS3 | `src/v11/application/actorProtocol/actorProtocolEmitters.ts` | `emitHumanQuestionActorResultV11(...)` | `(input) -> Promise<ActorEmitResultV11 human_question>` | wrapper dispatch `cwd` | split-path fixture alatt a human-question wrapper a canonical workspace rootot forwardolja, nem a retained `worktree_path`-ot | P1 | required-now | T6, T15 |
| CS4 | `src/v11/application/actorProtocol/actorProtocolEmitters.ts` | `emitConvergenceActorResultV11(...)` | `(input) -> Promise<ActorEmitResultV11 convergence>` | wrapper dispatch `cwd` | split-path fixture alatt a converged wrapper a canonical workspace rootot forwardolja, stale/state guard retained mellett | P1 | required-now | T7, T15 |
| CS5 | `src/v11/application/actorProtocol/actorProtocolEmitters.ts` | `emitMetaReviewActorResultV11(...)` | `(input) -> Promise<ActorEmitResultV11 meta_review_result>` | wrapper dispatch `cwd` | split-path fixture alatt a meta-review submit wrapper `workspace_path`-ot forwardol executable rootkent, mig a retained worktree traceability nem valik `cwd`-va | P1 | required-now | T8, T15 |
| CS6 | `src/v11/application/pass/passWorkspaceContextPreparation.ts` | `preparePassWorkspaceContext(...)` | `(input, dependencies?) -> Promise<PreparedPassWorkspaceContext>` | authoritative context reuse branch | authoritative context eseten `resolved.cwd` a `workspace_path`, mikozben `resolved.bubblePaths.worktreePath` retained marad artifact-semantikara | P1 | required-now | T5, T9 |
| CS7 | `src/v11/application/askHuman/askHumanWorkspaceContextPreparation.ts` | `prepareAskHumanWorkspaceContext(...)` | `(input) -> Promise<PreparedAskHumanWorkspaceContext>` | authoritative context reuse branch | ask-human authoritative reuse canonical workspace rootot visz tovabb, retained worktree traceability mellett | P1 | required-now | T6, T10 |
| CS8 | `src/v11/application/converged/convergedRoutingPreparation.ts` | `prepareConvergedRouting(...)` | `(input, dependencies?) -> Promise<PrepareConvergedRoutingResult>` | authoritative context reuse branch | converged authoritative reuse canonical workspace rootot visz tovabb, mikozben persisted state reread retained marad | P1 | required-now | T7, T11 |
| CS9 | `N/A` | meta-review authoritative prep | `N/A` | no insertion point in current Phase 1D surface | a `meta_review_result` consume ebben a fazisban wrapper-only seam; nincs paros authoritative prep call-site, retained artifact-path semantics pedig valtozatlanul out-of-scope marad | P2 | required-now | T8 |

### 2) Data and Interface Contract

| Contract | Current | Target | Required Fields | Optional Fields | Compatibility | Priority | Timing |
| --- | --- | --- | --- | --- | --- | --- | --- |
| `ActorEmitContextSnapshot` | `worktree_path` az egyetlen tovabbvitt path truth | explicit `workspace_path` executable root + retained `worktree_path` traceability root | `repo`, `bubble_id`, `handoff_id`, `execution_id`, `expected_role`, `expected_round`, `expected_state_fingerprint`, `workspace_path`, `worktree_path`, `resolved`, `loaded_state`, `execution_context` | `N/A` | additive | P1 | required-now |
| authoritative wrapper cwd consume | wrapper-ek `cwd: context.worktree_path` | wrapper-ek `cwd: context.workspace_path` | `workspace_path` | `worktree_path` retained | additive | P1 | required-now |
| authoritative prep consume | authoritative reuse branch `cwd/worktreePath` worktree-path-rol epul | authoritative reuse branch `cwd` `workspace_path`-rol epul, retained bubblePaths valtozatlan | `workspace_path` authoritative contextban | `worktree_path` retained | additive | P1 | required-now |
| non-authoritative prep fallback | cwd-only invocation retained worktree baseline-t hasznal | unchanged | meglevo `cwd`-alapu resolve eredmeny | `N/A` | N/A | P1 | required-now |

### 3) Side Effects Contract

| Area | Allowed | Forbidden | Notes | Priority | Timing |
| --- | --- | --- | --- | --- | --- |
| Runtime session read + in-memory context shaping | runtime session registry olvasas a shared helperen keresztul, authoritative actor snapshot shaping | uj state write, uj runtime session mutation, activation side-effect | ez a task consume alignment, nem producer vagy activation | P1 | required-now |
| Wrapper dispatch | canonical `cwd` tovabbadas a meglevo command orchestrationhoz | bubble artifact pathok atnevezese executable rootkent | wrapper only forwardol, nem nyit uj routing semantics-et | P1 | required-now |

### 4) Error and Fallback Contract

| Trigger | Dependency (if any) | Behavior (`throw|result|fallback`) | Fallback Value/Action | Reason Code | Log Level | Priority | Timing |
| --- | --- | --- | --- | --- | --- | --- | --- |
| runtime session missing actor context materializationkor | runtime session registry | throw | nincs actor emit context | `ACTOR_EMIT_CONTEXT_INVALID` vagy mar meglevo actor-context hiba-csalad contexttel | error | P1 | required-now |
| workspace authority missing actor context materializationkor | runtime authority helper | throw | nincs wrapper dispatch | `ACTOR_EMIT_CONTEXT_INVALID` vagy mar meglevo actor-context hiba-csalad contexttel | error | P1 | required-now |
| clone-only legacy fallback authoritative wrapper pathon | runtime authority helper | throw | nincs wrapper dispatch | `ACTOR_EMIT_CONTEXT_INVALID` vagy mar meglevo actor-context hiba-csalad contexttel | error | P1 | required-now |
| direct non-authoritative cwd invocation | meglevo direct workspace-resolution helper(ek) | fallback | retained current worktree baseline | retained existing command behavior | info | P1 | required-now |

### 5) Dependency Constraints

| Type | Items | Priority | Timing |
| --- | --- | --- | --- |
| must-use | `src/v11/shared/runtimeSessionWorkspaceAuthority.ts` ugyanazon helper-nyelven, mint a Phase 1C2 runtime consume family | P1 | required-now |
| must-use | retained `bubblePaths.worktreePath` ott, ahol a consume artifact/transcript/test-evidence szemantika | P1 | required-now |
| must-not-use | `context.worktree_path` vagy `bubblePaths.worktreePath` authoritative wrapper `cwd`-kent | P1 | required-now |
| must-not-use | clone-only legacy worktree fallback canonical runtime authority nelkul authoritative wrapper consume-ban | P1 | required-now |
| must-not-use | olyan "szigoritás", ami artifact pathot is canonical workspace rootra cserel | P1 | required-now |

### 5a) Wrapper Proof Rule

1. `T5-T8` kotelezoen split-path fixture-re epulnek:
   - `authoritativeContext.workspace_path` es `authoritativeContext.worktree_path` kulonbozo ertek,
   - retained artifact/worktree path tovabbra is kulon ellenorizheto marad.
2. A wrapper proof nem elegedhet meg a vegallapot vagy envelope assertalasaval.
3. Kotelezo direkt assertion:
   - a downstream emit/submit dependency a forwardolt `cwd`-t pontosan `workspace_path`-kent kapja,
   - es ugyanebben a fixture-ben `cwd !== worktree_path`.
4. Kotelezo retained-path assertion:
   - a retained artifact/worktree referenciak nem executable rootkent, hanem traceability/artifact szerepben maradnak meg.
5. Olyan implementacio, amely tovabbra is `context.worktree_path`-ot forwardol `cwd`-kent, a task szerint nem fogadhato el Phase 1D kesz allapotnak.

### 6) Test Matrix

| ID | Scenario | Given | When | Then | Priority | Timing | Evidence |
| --- | --- | --- | --- | --- | --- | --- | --- |
| T1 | actor context explicit canonical workspace authority | runtime session explicit `workspacePath` + `workspaceKind` | `resolveActorEmitContextByBubbleId(...)` fut | a snapshot explicit `workspace_path`-ot ad, retained `worktree_path` mellett | P1 | required-now | `tests/v11/application/actorProtocol/emitActorProtocolV11.test.ts` |
| T2 | actor context legacy same-authority worktree fallback | runtime session explicit `workspacePath` nelkul, no-split worktree baseline | actor context materializalodik | a snapshot `workspace_path`-ja a megengedett same-authority fallbackot hordozza, es ezt ugyanaz a `resolveRuntimeSessionWorkspaceAuthority(...)` helper bizonyitja, amelyet a task must-use-kent rogzit | P1 | required-now | `tests/v11/application/actorProtocol/emitActorProtocolV11.test.ts` |
| T3 | actor context missing authority fail-closed | runtime session hianyzik vagy authority hianyzik | actor context materializalodna | nincs wrapper dispatch, explicit actor-context hiba jon vissza | P1 | required-now | `tests/v11/application/actorProtocol/emitActorProtocolV11.test.ts` |
| T4 | actor context clone fallback forbidden | runtime session csak clone-only legacy worktree fallbackot adna | actor context materializalodna | nincs silent worktree truth, actor-context materialization fail-closed marad, es wrapper dispatchig sem jut el a flow | P1 | required-now | `tests/v11/application/actorProtocol/emitActorProtocolV11.test.ts` |
| T5 | pass authoritative workspace consume | split-path fixture: authoritative `workspace_path` es retained `worktree_path` kulonbozik implementer vagy reviewer wrapper authority alatt | `emitPass...` / `preparePassWorkspaceContext(...)` fut | a wrapper test direkt assertalja, hogy a downstream pass emit `cwd === workspace_path` es `cwd !== worktree_path`; a prep pedig kulon bizonyitja, hogy a retained artifact path bubble worktree marad | P1 | required-now | `tests/v11/application/actorProtocol/emitActorProtocolV11.test.ts`, `tests/v11/application/pass/passWorkspaceContextPreparation.test.ts` |
| T6 | ask-human authoritative workspace consume | split-path fixture: authoritative human-question wrapper inputnal `workspace_path !== worktree_path` | `emitHumanQuestionActorResultV11(...)` / `prepareAskHumanWorkspaceContext(...)` fut | a wrapper test direkt assertalja a forwardolt `cwd === workspace_path` es `cwd !== worktree_path` parit; a retained worktree traceability kulon megmarad | P1 | required-now | `tests/v11/application/actorProtocol/emitActorProtocolV11.test.ts`, `tests/v11/application/askHuman/askHumanWorkspaceContextPreparation.test.ts` |
| T7 | converged authoritative workspace consume | split-path fixture: reviewer authoritative context es persisted running state mellett `workspace_path !== worktree_path` | `emitConvergenceActorResultV11(...)` / `prepareConvergedRouting(...)` fut | a wrapper test direkt assertalja a canonical workspace `cwd` forwardolast es a retained worktree negativjat; a stale/state reread baseline retained marad | P1 | required-now | `tests/v11/application/actorProtocol/emitActorProtocolV11.test.ts`, `tests/v11/application/converged/convergedRoutingPreparation.test.ts` |
| T8 | meta-review wrapper canonical workspace consume | split-path fixture: canonical meta-reviewer authority aktiv, `workspace_path !== worktree_path` | `meta_review_result` wrapper fut | `submitMetaReviewResult(...)` direkt `workspace_path` `cwd`-t kap es explicit nem a retained `worktree_path`-ot; retained artifact/worktree referenciak nem valnak executable rootta, es nincs kulon authoritative prep seam ebben a fazisban | P1 | required-now | `tests/v11/application/actorProtocol/emitActorProtocolV11.test.ts` |
| T9 | pass prep retained artifact semantics | authoritative context workspace rootja kulonbozik a retained worktree path-tol | `preparePassWorkspaceContext(...)` fut | `resolved.cwd` canonical workspace root, de `resolved.bubblePaths.worktreePath` retained marad artifact pathnak | P1 | required-now | `tests/v11/application/pass/passWorkspaceContextPreparation.test.ts` |
| T10 | ask-human prep retained artifact semantics | authoritative context workspace rootja kulonbozik a retained worktree path-tol | `prepareAskHumanWorkspaceContext(...)` fut | a prep nem keveri ossze az executable rootot az artifact worktree root-tal | P1 | required-now | `tests/v11/application/askHuman/askHumanWorkspaceContextPreparation.test.ts` |
| T11 | converged prep retained reread behavior | authoritative context adott, de a state ujraolvasas kotelezo | `prepareConvergedRouting(...)` fut | canonical workspace consume mellett a persisted state reread tovabbra is megtortenik | P1 | required-now | `tests/v11/application/converged/convergedRoutingPreparation.test.ts` |
| T12 | pass direct non-authoritative baseline retained | `authoritativeContext` nincs, a `cwd` bubble worktree-re mutat | `preparePassWorkspaceContext(...)` fut | a direct resolution branch retained marad; nincs implicit `workspace_path` kovetkeztetes, nincs retained artifact path executable rootta emelve, es nincs clone activation | P1 | required-now | `tests/v11/application/pass/passWorkspaceContextPreparation.test.ts` |
| T13 | ask-human direct non-authoritative baseline retained | `authoritativeContext` nincs, a `cwd` bubble worktree-re mutat | `prepareAskHumanWorkspaceContext(...)` fut | a helper a meglevo direct resolve baseline-t hasznalja; nincs implicit `workspace_path` kovetkeztetes, nincs retained artifact path executable rootta emelve, es nincs clone activation | P1 | required-now | `tests/v11/application/askHuman/askHumanWorkspaceContextPreparation.test.ts` |
| T14 | converged direct non-authoritative baseline retained | `authoritativeContext` nincs, a `cwd` bubble worktree-re mutat | `prepareConvergedRouting(...)` fut | a direct workspace resolution es a persisted-state reread baseline egyszerre retained marad; nincs implicit `workspace_path` kovetkeztetes, nincs retained artifact path executable rootta emelve, es nincs clone activation | P1 | required-now | `tests/v11/application/converged/convergedRoutingPreparation.test.ts` |
| T15 | wrapper dispatch clone-only fallback forbidden | authoritative wrapper dispatchhoz csak clone-only legacy fallback volna elerheto | wrapper emit futna | nincs command dispatch retained worktree truthra; a wrapper-layer fail-closed a Safety Default 3 szerint megmarad | P1 | required-now | `tests/v11/application/actorProtocol/emitActorProtocolV11.test.ts` |

## L2 - Implementation Notes (Optional)

1. [later-hardening] Ha a bubble-loop actor context es a direct workspace resolution kesobb kozeledik egymashoz, erdemes kulon helperben centralizalni az `authoritativeContext -> executable workspace root + retained worktree path` shapinget.
2. [later-hardening] A Phase 2A activation taskban erdemes kulon bizonyitani, hogy a direct non-authoritative clone-workspace authority resolution / activation helyesen talalja meg a bubble authorityt.

## Hardening Backlog (Optional)

| ID | Item | Layer | Priority | Timing | Source | Proposed Action |
| --- | --- | --- | --- | --- | --- | --- |
| H1 | direct non-authoritative clone-workspace authority resolution / activation meg nincs lezarva | L2 | P2 | later-hardening | Phase 1D successor boundary | lezarni Phase 2A activation taskban |

## Review Control

1. Every finding must include: `priority`, `timing`, `layer`, `evidence`.
2. Max 2 L1 hardening rounds.
3. After round 2, new `required-now` is allowed only for evidence-backed `P0/P1`.
4. Items outside L1 blocker scope must be tagged `later-hardening`.
5. Ha az `ActorEmitContextSnapshot` shared contract valtozik, current-consumer inventory es additive-vs-breaking besorolas kotelezo.
6. Ha authoritative wrapper consume retained `worktree_path`-ot hagy meg, az csak artifact/traceability szerepkorben maradhat.
7. Ha a task valahol retained `worktree_path`-ot eltuntet, explicit replacement proof kotelezo az erintett artifact-szemantikara.
8. Uj `required-now` finding csak konkret executable-root consume pontra vagy retained-path removal replacement proof hianyara hivatkozva emelheto be; retained artifact-path elofordulas onmagaban nem blocker.

## Spec Lock

Mark task as `IMPLEMENTABLE` when all `P0/P1 + required-now` items are closed.
