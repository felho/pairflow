---
artifact_type: task
artifact_id: task_remote_bubble_execution_phase1c2_runtime_delivery_and_reviewer_context_alignment_v1
title: "Remote Bubble Execution Runtime Delivery and Reviewer-Context Alignment (Phase 1C2)"
status: implementable
phase: phase1c2-runtime-delivery-and-reviewer-context-alignment
target_files:
  - src/v11/shared/runtimeSessionWorkspaceAuthority.ts
  - src/v11/shared/command/agentCommand.ts
  - src/v11/infrastructure/channel/tmux/tmuxDeliveryRuntime.ts
  - src/v11/infrastructure/channel/tmux/tmuxDelivery.ts
  - src/v11/infrastructure/channel/tmux/tmuxDeliveryMessageBuilder.ts
  - src/v11/infrastructure/channel/tmux/reviewerContext.ts
  - tests/core/runtime/runtimeSessionWorkspaceAuthority.test.ts
  - tests/core/runtime/tmuxDelivery.test.ts
  - tests/core/runtime/reviewerContext.test.ts
  - tests/v11/application/pass/reviewerDelivery.test.ts
prd_ref: null
plan_ref: plans/archive/plans/remote-bubble-execution-contract-and-phasing-plan-v2.md
system_context_ref: docs/pairflow-initial-design.md
owners:
  - "felho"
---

# Task: Remote Bubble Execution Runtime Delivery and Reviewer-Context Alignment (Phase 1C2)

## Current Codebase Check (2026-04-13)

1. A Phase 1C1 lezarta a start/tmux launch executable consume csaladot: a tmux launch, agent pane root es launch prompt family mar canonical `workspacePath` authorityra ul.
2. A runtime delivery reader oldalon viszont a tmux delivery runtime ma meg csak `tmuxSessionName + worktreePath` shape-et olvas a runtime session registrybol:
   - `src/v11/infrastructure/channel/tmux/tmuxDeliveryRuntime.ts` `readDeliverySessionContext(...)`,
   - `src/v11/infrastructure/channel/tmux/tmuxDelivery.ts` ezt a `worktreePath`-ot adja tovabb a delivery message buildernek.
3. A reviewer-context refresh consume ma meg ugyanugy a statikus runtime `record.worktreePath` mezot kezeli executable truthkent:
   - `src/v11/infrastructure/channel/tmux/reviewerContext.ts` a reviewer pane respawn `cwd`-hez es a `buildAgentCommand(...)` inputhoz ezt hasznalja.
4. A delivery-facing prompt/guidance surface ma meg worktree-nyelven beszel:
   - `src/v11/infrastructure/channel/tmux/tmuxDeliveryMessageBuilder.ts` ma `Run pairflow commands from worktree: ...` uzenetet epit, es a Pairflow command guidance is ugyanebbol a pathbol jon.
5. A runtime session record viszont mar hordozhat canonical `workspacePath` / `workspaceKind` authorityt, es van kozos resolver helper a runtime-session authority consume-ra:
   - `src/v11/shared/runtimeSessionWorkspaceAuthority.ts`
6. A plan szerint a Phase 1C2 csak `internal_consume_alignment`:
   - runtime delivery,
   - reviewer refresh/context,
   - runtime readers canonical consume-ja
     allhat at, mikozben a bubble-loop command family (`pass`, `converged`, `ask-human`, `meta_review_result`) tovabbra is kulon successor ownership marad Phase 1D-ben.

## Implementation Target Decision

1. `implementable_now`: `yes`
2. Ez a fazis a Phase 1C1 utan kovetkezik, de meg mindig nem activation task.
3. A feladat a runtime-session authority consume explicit atallitasa:
   - delivery session context olvasas,
   - tmux delivery message workspace-guidance input,
   - reviewer pane refresh `cwd` es agent-root input
     mar canonical runtime workspace authoritybol jojjon.
4. Default consume-decision ebben a fazisban: `no_split`, kiveve ha a delivery guidance tenylegesen igenyel kulon retained traceability pathot. Ha nincs ilyen bizonyitott igeny, a touched runtime surfaces ugyanazt az egy canonical executable workspace rootot vihetik tovabb; ha megis kell retained display path, az csak explicit `display_traceability_split` modban, kulon nevvel maradhat fenn.
5. A task nem nyit clone-success runtimeot, nem mozditja a `resolveEnvelopeTargetPane(...)` bubble-loop routing semantics-et, es nem valtoztat operator-facing status/list/attach read-modelt.

## L0 - Policy

### Goal

Lezarni a runtime delivery es reviewer-context consume reteget ugy, hogy:

1. a delivery runtime es a reviewer pane refresh ugyanazt a canonical runtime workspace authorityt olvassa a runtime session recordbol,
2. a touched runtime consumers ne kezeljek tobbet a statikus `record.worktreePath`-ot implicit runtime truthkent,
3. a worktree-mode baseline valtozatlan maradjon ott, ahol a canonical authority es a retained worktree path ma ugyanarra az ertekre mutat,
4. a clone-topology tovabbra is fail-closed maradjon.

### Domain / Control Model Summary

1. Business invariant: egy futasi bubble delivery es reviewer-refresh consume-ja nem szakadthat ket kulon workspace-azonossagra; a pane-targeting utan minden runtime delivery/reviewer consumer ugyanazt a canonical workspace truthot hasznalja.
2. Control model: Phase 1C2-ben a runtime session record canonical workspace authorityja (`workspacePath`, `workspaceKind`, illetve ugyanennek explicit same-authority legacy worktree fallbackja) donti el, milyen workspace root a runtime delivery es a reviewer refresh executable/guidance inputja.
3. Read-path rule: a runtime delivery es reviewer-context consume csak a runtime session authority chainbol vagy annak kozos consume helperen keresztul olvashat workspace authorityt; kozvetlen `record.worktreePath` leaf truth tiltott a cutoveren atesett pontokon.
4. Forbidden fallback:
   - a statikus `record.worktreePath` kozvetlen leaf fallbackkent a touched runtime delivery/reviewer-context executable surfaces-eken,
   - clone-only legacy worktree fallback canonical workspace authority nelkul.
5. Allowed resolution path:
   - explicit `workspacePath` + `workspaceKind` consume a runtime session recordbol,
   - worktree/no-split legacy record consume a kozos runtime-session authority helperen keresztul,
   - ha a delivery messageben retained bubble-root vagy worktree traceability kell, az csak kulon, non-executable display semantics lehet.
6. Missing-data rule: ha a runtime session authority chain nem ad ervenyes canonical workspace authorityt, akkor a delivery/reviewer refresh fail-closed marad; nem kuldhet uzenetet es nem respawnolhat pane-t implicit worktree truthra.
7. Phase boundary:
   - contract closure: successor-only, nem ez a task vezeti be a persisted authority mezoket
   - producer closure: successor-only, a producer mar Phase 1B2-ben lezarult
   - internal execution closure: owned here a delivery runtime es reviewer refresh consume csaladban
   - workflow/orchestration closure: successor-only, Phase 1D bubble-loop consume alignment
   - read-model closure: successor-only
   - activation closure: successor-only
   - cleanup/recovery closure: successor-only

### Retained Guidance Reference Rule

1. Phase 1C2 defaultja `no_split`: ha az implementacio nem tart meg kulon delivery/display traceability pathot, akkor a touched runtime consumers altal tovabbvitt workspace path jelentese canonical executable workspace root.
2. Ez a `no_split` forma csak akkor elfogadhato, ha ugyanaz a canonical authority megy at:
   - `readDeliverySessionContext(...)` consume outputjan,
   - `buildTmuxDeliveryMessage(...)` command-guidance inputjan,
   - reviewer respawn `cwd` inputon,
   - `buildAgentCommand(...)` reviewer refresh workspace inputjan.
3. Ha megis kell retained display traceability, az csak explicit kulon mezoneven maradhat fenn (`displayWorktreePath`, `bubbleRootReferencePath` vagy ennel egyertelmubb nev).
4. Retained display traceability feedelhet:
   - plain-text, non-executable traceability line-okat a delivery messageben.
5. Retained display traceability nem feedelheti:
   - a `Run pairflow commands from ...` jellegu command-guidance rootot,
   - `buildPairflowCommandGuidance(...)` workspace inputjat,
   - reviewer respawn `cwd`-t,
   - `buildAgentCommand(...)` workspace rootjat.
6. A tasknak explicitten bizonyitania kell, melyik mod valosul meg:
   - `no_split`, vagy
   - explicit named `display_traceability_split`.

### Authority Boundary Map

1. `authority_producer`
   - Phase 1B2 producer chain
   - Phase 1C1 start/runtime session authority write
2. `persisted_authority`
   - runtime session record `workspacePath`, `workspaceKind`, retained `worktreePath`
3. `internal_execution_consumers` in scope
   - `src/v11/infrastructure/channel/tmux/tmuxDeliveryRuntime.ts`
   - `src/v11/infrastructure/channel/tmux/tmuxDelivery.ts`
   - `src/v11/infrastructure/channel/tmux/tmuxDeliveryMessageBuilder.ts`
   - `src/v11/infrastructure/channel/tmux/reviewerContext.ts`
4. `workflow_orchestration_consumers` explicit out of scope
   - `pass`, `converged`, `ask-human`, `approval`, `reply`, `watchdog` command semantics
   - envelope target-role policy
5. `read_model_consumers` explicit out of scope
   - status/list/attach projection
   - lifecycle/operator wording
6. `cleanup_recovery_consumers` explicit out of scope
   - commit/merge/delete cleanup consume
   - recovery/read-model reconciliation
7. Export surfaces closed in this phase:
   - `no`
   - csak az internal runtime delivery/reviewer-context consume zarul; operator export surface nem.

### Baseline Preservation

1. Must-preserve behaviors:
   - a delivery target pane feloldasa es target-role semantics valtozatlan maradjon
   - `reviewer_context_mode=fresh|persistent` viselkedes retained maradjon
   - worktree-mode legacy runtime sessionek tovabbra is mukodjenek ugyanott, ahol a canonical authority es a retained worktree path megegyezik
   - clone authority tovabbra is ne valjon silent success runtime workspace truth-va
2. Allowed resolution paths:
   - runtime session explicit canonical authority -> delivery/reviewer consume
   - runtime session legacy worktree/no-split authority -> kozos helper -> delivery/reviewer consume
   - retained display/worktree traceability csak non-executable message surface-en, ha tenylegesen szukseges
3. Forbidden regression interpretations:
   - a Phase 1C2 consume cutover nem jelent bubble-loop routing atallast
   - a Phase 1C2 consume cutover nem jelent operator read-model cutovert
   - a Phase 1C2 consume cutover nem jelent uj reason-token vagy UX-flow kotelezettseget, ha ugyanaz a fail-closed viselkedes megtarthato a jelenlegi contracton belul
4. Replacement proof required if removed:
   - ha barmely touched runtime surface elhagyja a legacy worktree compatibilityt, bizonyitani kell, hogy a megmarado canonical runtime authority ugyanazokat a jelenlegi worktree-mode sessioneket tovabbra is kiszolgalja

### In Scope

1. A runtime session workspace authority kozos consume-ja a delivery runtime es reviewer-context refresh familyben.
2. A delivery session context es a reviewer refresh executable `cwd`/agent-root inputjanak canonical workspace authorityra allitasa.
3. A tmux delivery message workspace-guidance wordingjanak canonical launch/runtime workspace helper-nyelvre allitasa.
4. A clone-only legacy worktree fallback explicit tiltasa a touched runtime consumersben.
5. A touched runtime consumers tesztjei explicit canonical, legacy worktree, missing authority es clone-fallback forbidden helyzetekre.

### Out of Scope

1. `pass`, `converged`, `ask-human`, `meta_review_result` bubble-loop command consume ownership
2. `resolveEnvelopeTargetPane(...)` target-role policy vagy envelope routing semantics
3. operator read-model (`status`, `list`, `attach`)
4. clone-success activation
5. remote start/write/read surfaces
6. cleanup/recovery routing

### Safety Defaults

1. Ha a runtime session authority nem oldhato fel ugyanazon authority chainen belul, nincs delivery es nincs reviewer pane refresh.
2. A touched runtime surfaces only-internal consume cutover; nincs uj operator success semantics.
3. A retained worktree traceability csak display-celu lehet; nem lehet implicit executable root.

### Contract Boundary / Blast Radius

1. `contract_boundary_override`: `no`
2. Fan-out note:
   - shared authority consumer alignment tortenik, de public/operator contract nincs ujranyitva
   - ha egy internal helper/result shape additiv bovitese kell, az csak ezen consume family bounded change-jehez igazodhat

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
10. Identity/join note: canonical identity path a runtime session authority -> delivery/reviewer runtime consume; competing identifiers vagy fallback identityk a static `record.worktreePath` es a clone-only legacy worktree fallback.
11. Authority/source-of-truth note: canonical source a runtime session `workspacePath` / `workspaceKind` ugyanazon authority chainen beluli helperrel; forbidden secondary source a kozvetlen leaf `record.worktreePath` executable truthkent.

## L1 - Change Contract

### 0) Domain / Control Contract

| Item                    | Rule                                                                                                                            | Implementation Consequence                                                                                                          | Priority | Timing       |
| ----------------------- | ------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------- | -------- | ------------ |
| Business invariant      | A delivery es reviewer-refresh consume nem szakad ket workspace truthra.                                                        | Ugyanazt a canonical runtime workspace authorityt kell hasznalni a message guidancehoz, a pane `cwd`-hez es az agent-root inputhoz. | P1       | required-now |
| Control model           | A runtime session authority chain donti el a consume workspace rootot.                                                          | Nincs kozvetlen leaf `record.worktreePath` truth a touched runtime consumersben.                                                    | P1       | required-now |
| Read-path rule          | A touched runtime consumers a kozos runtime-session authority resolveren vagy explicit authority mezokon keresztul olvashatnak. | A consume helyeket helperre vagy explicit authority consume-ra kell atkotni.                                                        | P1       | required-now |
| Forbidden fallback      | Clone-only legacy worktree fallback es kozvetlen leaf `record.worktreePath` executable truth tiltott.                           | Fail-closed marad a delivery/reviewer refresh, nincs silent worktree truth.                                                         | P1       | required-now |
| Allowed resolution path | Explicit runtime `workspacePath` + `workspaceKind`, vagy worktree/no-split legacy same-authority fallback.                      | Legacy worktree-mode compatibility retained lehet, de csak ugyanazon authority chainen belul.                                       | P1       | required-now |
| Missing-data rule       | Hianyzo vagy tiltott authority eseten nincs delivery es nincs respawn.                                                          | A touched runtime surfaces a jelenlegi failure/unavailable csaladban maradnak, de nem kuldenek pane-inputot authority nelkul.       | P1       | required-now |
| Phase boundary          | Ez csak runtime delivery + reviewer-context consume alignment.                                                                  | Bubble-loop command routing es operator surfaces Phase 1D/2E/2F successor ownership maradnak.                                       | P1       | required-now |

### 0a) Shared Contract Compatibility (if applicable)

| Shared Contract                                                                      | Current Consumers                                       | Change Type (additive / breaking / N/A) | This Task Action                                                                                                                                                                                                                                           | Deferred Alignment                                            |
| ------------------------------------------------------------------------------------ | ------------------------------------------------------- | --------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------- |
| `src/v11/shared/runtimeSessionWorkspaceAuthority.ts` helper consume                  | start launch path, meta-review pane binding             | additive                                | a delivery/reviewer runtime consumers ugyanarra a helperre vagy vele ekvivalens same-authority consume-ra allnak at                                                                                                                                        | bubble-loop consume family Phase 1D                           |
| `DeliverySessionContext` internal runtime shape                                      | `tmuxDelivery.ts`                                       | additive or naming-clarifying           | preferalt irany a `no_split` szemantikai lezarasa: ha a retained `worktreePath` megmarad, a touched runtime surfacesen canonical executable workspace rootot jelent; ha kulon traceability path kell, az csak explicit display-only mezoneven adhato hozza | `N/A`                                                         |
| `buildAgentCommand(...)` workspace-root consume                                      | reviewer refresh respawn path                           | additive                                | a reviewer refresh ownership explicitten kiterjed a canonical workspace rootot kapo shared agent-command builderre is                                                                                                                                      | start/tmux launch consume family already aligned in Phase 1C1 |
| `RefreshReviewerContextResult` es `EmitTmuxDeliveryNotificationResult` reason family | pass delivery, approval/reply/askHuman/watchdog callers | `N/A` by default                        | a preferalt megoldas a fail-closed consume megtartasa a jelenlegi result familyn belul; uj public reason token csak akkor engedelyezett, ha nelkule a clone-forbidden / missing-authority viselkedes nem bizonyithato                                      | read-model / diagnostics later hardening                      |

### 0b) Baseline Preservation (if applicable)

| Current Behavior                                                     | Preserve/Replace/Forbid | Required Proof                                                                                              | Priority | Timing       |
| -------------------------------------------------------------------- | ----------------------- | ----------------------------------------------------------------------------------------------------------- | -------- | ------------ |
| explicit runtime `workspacePath` consume a runtime session recordbol | preserve and extend     | delivery/reviewer tests bizonyitjak, hogy ugyanaz az authority megy a touched runtime surfacesre            | P1       | required-now |
| legacy worktree-mode session authority `workspacePath` nelkul        | preserve                | runtime delivery es reviewer-context tests igazoljak, hogy worktree-mode legacy session tovabbra is mukodik | P1       | required-now |
| clone-only legacy worktree fallback canonical authority nelkul       | forbid                  | explicit fail-closed test delivery es reviewer-context surface-re                                           | P1       | required-now |
| delivery target pane metadata/fallback semantics                     | preserve                | existing target-role tests valtozatlanul zoldben maradnak                                                   | P1       | required-now |

### 1) Call-site Matrix

| ID   | File                                                                | Function/Entry                           | Exact Signature (args -> return)                                                                                        | Insertion Point                       | Expected Behavior                                                                                                                                                                                                                                              | Priority | Timing       | Evidence        |
| ---- | ------------------------------------------------------------------- | ---------------------------------------- | ----------------------------------------------------------------------------------------------------------------------- | ------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------- | ------------ | --------------- |
| CS1  | `src/v11/shared/runtimeSessionWorkspaceAuthority.ts`                | runtime authority resolver               | `resolveRuntimeSessionWorkspaceAuthority({ runtimeSessionRecord }) -> RuntimeSessionWorkspaceAuthorityResolution`       | shared authority helper               | a delivery/reviewer runtime consume ugyanazt a same-authority feloldast hasznalja, mint a start/meta-review path; unresolved reason mapping itt marad canonical                                                                                                | P1       | required-now | T1-T8, T11      |
| CS2  | `src/v11/infrastructure/channel/tmux/tmuxDeliveryRuntime.ts`        | delivery session context read            | `readDeliverySessionContext({ bubbleId, sessionsPath, readSessions }) -> Promise<DeliverySessionContext or undefined>`  | runtime session read seam             | a delivery runtime canonical workspace authorityt olvas; clone-only legacy fallback tiltott; ha retained `worktreePath` marad, annak jelentese explicit canonical executable root                                                                              | P1       | required-now | T1-T4           |
| CS3  | `src/v11/infrastructure/channel/tmux/tmuxDelivery.ts`               | tmux delivery runtime consume            | `emitTmuxDeliveryNotification(input: EmitTmuxDeliveryNotificationInput) -> Promise<EmitTmuxDeliveryNotificationResult>` | message build + attempt delivery seam | a pane-targeting utan a delivery message a canonical workspace authoritybol epul; unresolved authority fail-closed marad a jelenlegi unavailable result familyben; target-role/pane routing semantics valtozatlan                                              | P1       | required-now | T1-T4, T9, T10  |
| CS4  | `src/v11/infrastructure/channel/tmux/tmuxDeliveryMessageBuilder.ts` | delivery message guidance                | `buildTmuxDeliveryMessage(...) -> string`                                                                               | worktree hint / action text seam      | a command-guidance mar launch/runtime workspace nyelvet hasznal; retained worktree traceability csak kulon display-only semantics lehet, nem ugyanazon command-root sor; ha `display_traceability_split` valosul meg, azt kulon assertionnek kell bizonyitania | P1       | required-now | T1-T4, T10, T12 |
| CS5  | `src/v11/infrastructure/channel/tmux/reviewerContext.ts`            | reviewer pane refresh                    | `refreshReviewerContext(input: RefreshReviewerContextInput) -> Promise<RefreshReviewerContextResult>`                   | runtime session read + respawn seam   | a reviewer respawn `cwd` es `buildAgentCommand` input canonical workspace authorityra ul; clone-only fallback tiltott; unresolved authority public kimeneten a jelenlegi unavailable familyben marad                                                           | P1       | required-now | T5-T8           |
| CS6a | `src/v11/shared/command/agentCommand.ts`                            | reviewer agent command root              | `buildAgentCommand(input: BuildAgentCommandInput) -> string`                                                            | reviewer refresh executable-root seam | a reviewer refresh altal hasznalt shared agent command builder canonical workspace rootot kap; ez az ownership Phase 1C2-ben explicit in-scope, nem csak kozvetett reviewer-context mellekhatas                                                                | P1       | required-now | T5-T8           |
| CS7  | `tests/core/runtime/tmuxDelivery.test.ts`                           | runtime delivery regresszio tesztek      | vitest                                                                                                                  | delivery runtime surface              | explicit canonical, legacy worktree, missing authority es clone-forbidden delivery helyzetek kulon lefedese                                                                                                                                                    | P1       | required-now | T1-T4, T10, T12 |
| CS8  | `tests/core/runtime/reviewerContext.test.ts`                        | reviewer refresh regresszio tesztek      | vitest                                                                                                                  | reviewer runtime surface              | explicit canonical, legacy worktree, missing authority es clone-forbidden reviewer refresh helyzetek kulon lefedese                                                                                                                                            | P1       | required-now | T5-T8           |
| CS9  | `tests/core/runtime/runtimeSessionWorkspaceAuthority.test.ts`       | helper taxonomy regresszio tesztek       | vitest                                                                                                                  | shared helper surface                 | a helper unresolved reason taxonomyjat kulon, direkt tesztek bizonyitjak a delivery/reviewer consume-on tul is                                                                                                                                                 | P1       | required-now | T11             |
| CS10 | `tests/v11/application/pass/reviewerDelivery.test.ts`               | pass reviewer delivery integration guard | vitest                                                                                                                  | app-level runtime delivery seam       | a fresh/persistent reviewer delivery orchestration tovabbra is ugyanazzal a warm-up/retry policyval mukodik a canonical workspace consume alatt is                                                                                                             | P1       | required-now | T9              |

### 2) Data and Interface Contract

| Contract                                   | Current                                                                    | Target                                                                                                                                                                    | Required Fields                                    | Optional Fields                                                                | Compatibility                                           | Priority | Timing       |
| ------------------------------------------ | -------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------- | ------------------------------------------------------------------------------ | ------------------------------------------------------- | -------- | ------------ |
| Delivery runtime session consume           | `sessionName` + optional `worktreePath` ambiguous runtime meaninggel       | `sessionName` + canonical workspace authority ugyanazon helper chainen belul; preferaltan explicit `no_split` semantics vagy kulon named display-path                     | `sessionName`, canonical executable workspace root | explicit `displayWorktreePath`-jellegu traceability path, ha tenyleg szukseges | additive or naming-clarifying internal consume contract | P1       | required-now |
| Delivery message workspace guidance        | optional `worktreePath` display/guidance input                             | canonical workspace authorityval epulo command-guidance input                                                                                                             | canonical command-execution workspace path         | kulon named display traceability path                                          | additive wording/consume closure                        | P1       | required-now |
| Reviewer refresh runtime consume           | direct `record.worktreePath` -> `buildAgentCommand` / `cwd`                | resolved canonical workspace authority -> `buildAgentCommand.workspacePath` / `cwd`                                                                                       | canonical reviewer refresh workspace root          | retained display traceability `N/A` by default                                 | additive internal consume closure                       | P1       | required-now |
| Unresolved authority public result mapping | implicit `no_runtime_session`-kozeli fail-closed, de specben nem eleg eles | missing authority es clone-forbidden authority public kimeneten is a jelenlegi unavailable familyben maradjon, mikozben a helper-level unresolved taxonomy kulon megmarad | same public unavailable result family              | internal debug/source distinction lehet helper-szinten                         | naming-clarifying, public-contract-preserving           | P1       | required-now |

### 3) Side Effects Contract

| Area                                        | Allowed                                                                | Forbidden                                                                                                | Notes                                    | Priority | Timing       |
| ------------------------------------------- | ---------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------- | ---------------------------------------- | -------- | ------------ |
| Runtime session read + tmux runtime consume | runtime session registry read, tmux pane respawn, tmux delivery submit | transcript/state manual mutation, bubble-loop routing semantics valtoztatasa, operator read-model update | ez a task csak runtime consume alignment | P1       | required-now |

### 4) Error and Fallback Contract

| Trigger                                          | Dependency (if any)                | Behavior (throw / result / fallback) | Fallback Value/Action                       | Reason Code                                                                                                 | Log Level | Priority | Timing       |
| ------------------------------------------------ | ---------------------------------- | ------------------------------------ | ------------------------------------------- | ----------------------------------------------------------------------------------------------------------- | --------- | -------- | ------------ |
| runtime session hianyzik                         | runtime session registry           | result                               | delivery/reviewer refresh unavailable marad | existing unavailable family                                                                                 | warn      | P1       | required-now |
| runtime session authority hianyzik               | runtime session authority resolver | result                               | nincs send/respawn, fail-closed             | existing unavailable family on current public ports; helper-level unresolved reason taxonomy retained kulon | warn      | P1       | required-now |
| runtime session clone-only legacy fallbackra fut | runtime session authority resolver | result                               | nincs send/respawn, fail-closed             | existing unavailable family on current public ports; helper-level unresolved reason taxonomy retained kulon | warn      | P1       | required-now |
| registry read failure                            | runtime session registry           | result                               | nincs send/respawn                          | existing registry-read-failed family                                                                        | warn      | P1       | required-now |
| tmux send/respawn failure                        | tmux runtime                       | result                               | jelenlegi retry/failure policy retained     | existing tmux failure family                                                                                | warn      | P1       | required-now |

### 5) Dependency Constraints

| Type         | Items                                                                                                                                        | Priority | Timing       |
| ------------ | -------------------------------------------------------------------------------------------------------------------------------------------- | -------- | ------------ |
| must-use     | `src/v11/shared/runtimeSessionWorkspaceAuthority.ts` vagy vele ekvivalens same-authority helper; meglvo target-pane resolution flow retained | P1       | required-now |
| must-not-use | kozvetlen `record.worktreePath` executable truthkent a touched runtime consumersben; clone activation; operator read-model side effects      | P1       | required-now |

### 6) Test Matrix

| ID  | Scenario                                               | Given                                                                                                     | When                                               | Then                                                                                                                                                | Priority | Timing          | Evidence                                                      |
| --- | ------------------------------------------------------ | --------------------------------------------------------------------------------------------------------- | -------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------- | -------- | --------------- | ------------------------------------------------------------- |
| T1  | delivery canonical workspace authority                 | runtime session explicit `workspacePath` + `workspaceKind=worktree`                                       | delivery message epul es kuldes tortenik           | a command-guidance canonical workspace pathot hasznal, nem statikus worktree leaf fallbackot                                                        | P1       | required-now    | `tests/core/runtime/tmuxDelivery.test.ts`                     |
| T2  | delivery legacy worktree compatibility                 | legacy runtime session `workspacePath` nelkul, worktree-mode no-split baseline                            | delivery message epul                              | a touched runtime path tovabbra is mukodik ugyanarra a worktree rootra, canonical same-authority consume-nak tekintve                               | P1       | required-now    | `tests/core/runtime/tmuxDelivery.test.ts`                     |
| T3  | delivery missing authority fail-closed                 | runtime sessionben nincs ervenyes canonical authority es nincs megengedett same-authority legacy fallback | delivery emit indulna                              | nincs tmux send; a public result a jelenlegi unavailable familyben marad                                                                            | P1       | required-now    | `tests/core/runtime/tmuxDelivery.test.ts`                     |
| T4  | delivery clone fallback forbidden                      | runtime session csak clone-only legacy worktree fallbackot adna                                           | delivery emit indulna                              | nincs tmux send; a delivery fail-closed marad, nem nyit implicit clone/worktree truthot, es a public result a jelenlegi unavailable familyben marad | P1       | required-now    | `tests/core/runtime/tmuxDelivery.test.ts`                     |
| T5  | reviewer refresh canonical workspace authority         | explicit canonical runtime authority                                                                      | reviewer context refresh fut                       | a respawn `cwd` es agent root canonical workspace authorityra ul                                                                                    | P1       | required-now    | `tests/core/runtime/reviewerContext.test.ts`                  |
| T6  | reviewer refresh legacy worktree compatibility         | legacy worktree-mode runtime session                                                                      | reviewer refresh fut                               | a reviewer pane refresh tovabbra is sikeres ugyanott, ahol a no-split authority megegyezik a retained worktree path-tal                             | P1       | required-now    | `tests/core/runtime/reviewerContext.test.ts`                  |
| T7  | reviewer refresh missing authority fail-closed         | runtime sessionben nincs ervenyes canonical authority es nincs same-authority legacy fallback             | reviewer context refresh futna                     | nincs respawn; a public result a jelenlegi unavailable familyben marad                                                                              | P1       | required-now    | `tests/core/runtime/reviewerContext.test.ts`                  |
| T8  | reviewer refresh clone fallback forbidden              | runtime session csak clone-only legacy worktree fallbackot adna                                           | reviewer context refresh futna                     | nincs respawn, nincs implicit worktree truth, es a public result a jelenlegi unavailable familyben marad                                            | P1       | required-now    | `tests/core/runtime/reviewerContext.test.ts`                  |
| T9  | pass reviewer delivery orchestration baseline retained | fresh/persistent reviewer delivery orchestration                                                          | implementer -> reviewer handoff fut                | warm-up delay, retry policy, brief/focus forwarditas retained marad canonical workspace consume mellett is                                          | P1       | required-now    | `tests/v11/application/pass/reviewerDelivery.test.ts`         |
| T10 | target-role routing baseline retained                  | explicit/invalid/absent delivery target role metadata                                                     | delivery emit fut                                  | target pane feloldas semantics nem regresszal a workspace consume cutover miatt                                                                     | P1       | required-now    | `tests/core/runtime/tmuxDelivery.test.ts`                     |
| T11 | helper unresolved-reason taxonomy direct proof         | explicit runtime authority, missing authority, es clone-only legacy fallback helper inputok               | `resolveRuntimeSessionWorkspaceAuthority(...)` fut | a helper kulon bizonyitja a `resolved`, `workspace_authority_missing`, `legacy_clone_fallback_forbidden` es egyeb unresolved kimenetek taxonomiajat | P1       | required-now    | `tests/core/runtime/runtimeSessionWorkspaceAuthority.test.ts` |
| T12 | display traceability split wording guard               | implementacio explicit `display_traceability_split` modot valaszt a delivery guidanceben                  | delivery message epul                              | a command-guidance canonical workspace rootot hasznal, mikozben az optional display traceability kulon, non-executable sorban marad                 | P2       | later-hardening | `tests/core/runtime/tmuxDelivery.test.ts`                     |

## L2 - Implementation Notes (Optional)

1. [later-hardening] Ha a delivery/reviewer consume familyben retained worktree traceability tenyleg kell, erdemes explicit `displayWorktreePath` vagy hasonlo nevet bevezetni a guidance builder seamen, hogy a canonical workspace authority es a display reference soha ne ugyanazon optional field alatt keveredjen.
2. [later-hardening] A bubble-loop command family (Phase 1D) ugyanazt a runtime-session authority helper nyelvet vigye tovabb, hogy a delivery es bubble-loop consume ne nyisson uj alias-kort.

## Hardening Backlog (Optional)

| ID  | Item                                                                                     | Layer | Priority | Timing          | Source                       | Proposed Action          |
| --- | ---------------------------------------------------------------------------------------- | ----- | -------- | --------------- | ---------------------------- | ------------------------ |
| H1  | Bubble-loop consume family ugyanazt a runtime-session authority helper nyelvet hasznalja | L2    | P2       | later-hardening | Phase 1C2 successor boundary | lezarni Phase 1D taskban |

## Review Control

1. Every finding must include: `priority`, `timing`, `layer`, `evidence`.
2. Max 2 L1 hardening rounds.
3. After round 2, new `required-now` is allowed only for evidence-backed `P0/P1`.
4. Items outside L1 blocker scope must be tagged `later-hardening`.
5. If a shared helper/result shape valtozik, current-consumer inventory es additive-vs-breaking besorolas kotelezo.
6. Ha a runtime-session authority consume helper helyettesit vagy szukit legacy utat, a tasknak explicit bizonyitania kell a worktree-mode baseline megorzeset es a clone-only fallback tiltast.
7. Ha a task `no_split` vagy explicit `display_traceability_split` modban zar, pusztan naming-preferencia miatt nem nyithato uj `required-now`; ehhez konkret semantic ambiguity vagy bizonyithato regresszios kockazat kell.

## Spec Lock

Mark task as `IMPLEMENTABLE` when all `P0/P1 + required-now` items are closed.
