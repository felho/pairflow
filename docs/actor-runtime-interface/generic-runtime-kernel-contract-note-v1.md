---
artifact_type: note
artifact_id: note_actor_runtime_interface_generic_runtime_kernel_contract_v1
title: "Actor Runtime Interface Generic Runtime Kernel Contract Note"
status: active
updated_at: 2026-04-17
owners:
  - "felho"
---

# Note: Actor Runtime Interface Generic Runtime Kernel Contract

## Purpose

1. Ez a note az `Opportunity 1 / O1-T1` docs-only outputja a generic runtime kernel boundary explicitte tetelehez.
2. Nem replacement artifact az execution authority contract note helyett, hanem arra epulo boundary-szetszalazas:
   - a canonical authority jelentese preserved marad,
   - a jelenlegi route/policy matrix source-anchored inventorizaasa explicitte valik,
   - a workflow adapter vocabulary read-only downstream constraintkent marad.
3. A note addig normativ az `O1-T2` es `O1-T3` elokesziteseben, amig explicit successor artifact maskepp nem rendelkezik.

## Normative References

1. Sequencing owner:
   - `plans/actor-runtime-interface-post-phaseE-successor-plan-v1.md`
2. Preserved authority baseline:
   - `docs/actor-runtime-interface/execution-authority-contract-note-v1.md`
3. Current-tree source anchors:
   - `src/v11/shared/actorProtocol/actorEmitContext.ts`
   - `src/v11/application/actorProtocol/emitActorProtocolV11.ts`
   - `src/v11/application/actorProtocol/actorProtocolEmitters.ts`
   - `src/types/protocol.ts`
   - `src/types/bubble.ts`
   - `src/cli/commands/agent/emit.ts`
   - `src/v11/shared/state/executionContext.ts`
   - `src/v11/shared/metaReview/metaReviewExecutionContext.ts`
   - `src/config/bubbleConfig.ts`
   - `src/v11/domain/pass/handoff.ts`
   - `src/v11/domain/convergence/policyValidation.ts`
   - `src/v11/defaults/start/startStateMutation.ts`

## Current-Tree Coupling Inventory

1. A canonical actor authority current-tree source-of-truth-ja a top-level `execution_context`, explicit `execution_id`-val es fail-closed guard semanticszel.
2. A generic runtime kernel ma implicit a `emitActorProtocolV11.ts` wrapper-dispatcher matrixban el:
   - `expected_role x input.kind` branch-ek,
   - wrapper-local policy guardok,
   - retained reviewer-origin `human_question` fallback,
   - minden mas mismatch fail-closed.
3. A workflow-specific output adapters ma kulon emitterek:
   - `emitPassActorResultV11`
   - `emitHumanQuestionActorResultV11`
   - `emitConvergenceActorResultV11`
   - `emitMetaReviewActorResultV11`
4. A public vocabulary ettol kulon, de read-only downstream surface marad:
   - `ActorOutputKind`
   - `ProtocolParticipant`
   - `DeliveryTargetRole`
   - CLI `pairflow agent emit` option parser surface.
5. A bubble config/state/policy reteg nem lesz a generic kernel resze ebben a slice-ban:
   - `BubbleAgentsConfig`
   - `RoundRoleHistoryEntry`
   - `resolvePassHandoff(...)`
   - `validateConvergencePolicy(...)`
   - `executeStartRunningMutation(...)` / `buildResumedState(...)`

## Closed Baseline Vocabulary Matrix

| Term | Source anchor | Current meaning | Boundary disposition |
|---|---|---|---|
| `AgentName` | `src/types/bubble.ts` | concrete agent identity (`codex`, `claude`) | workflow state/config baseline; nem generic kernel taxonomy |
| `ProtocolParticipant` | `src/types/protocol.ts` | envelope sender/recipient public vocabulary (`codex`, `claude`, `orchestrator`, `human`) | workflow adapter/public protocol surface; read-only downstream constraint |
| `AgentRole` | `src/types/bubble.ts` | active role es authority guard vocabulary (`implementer`, `reviewer`, `meta_reviewer`) | preserved authority/policy baseline; nem future generic role registry |
| `DeliveryTargetRole` | `src/types/protocol.ts` | delivery/transport targeting vocabulary (`implementer`, `reviewer`, `meta_reviewer`, `status`) | retained adapter vocabulary only; nem canonical authority |
| `ActorOutputKind` | `src/types/protocol.ts` | public actor emit kind union (`pass`, `human_question`, `convergence`, `meta_review_result`) | workflow adapter/public CLI surface; read-only downstream constraint |
| `BubbleExecutionContextAwaitedOutputType` | `src/types/bubble.ts` | top-level canonical awaited output vocabulary | preserved state baseline |
| `MetaReviewExecutionContextAwaitedOutputType` | `src/types/bubble.ts` | meta-review mirror/subset awaited output vocabulary | preserved meta-review state baseline |

## Exact Awaited-Output Type and Role Mapping

1. `BubbleExecutionContextAwaitedOutputType = pass_result | meta_review_result`
2. `MetaReviewExecutionContextAwaitedOutputType = meta_review_result`
3. Role-to-awaited-output baseline:
   - `meta_reviewer -> meta_review_result`
   - otherwise `pass_result`
4. A current-tree source anchor:
   - `resolveAwaitedOutputTypeForRole(...)` a `src/v11/shared/state/executionContext.ts` file-ban
   - `buildMetaReviewExecutionContext(...)` es `validateActiveMetaReviewExecutionContext(...)` a `src/v11/shared/metaReview/metaReviewExecutionContext.ts` file-ban
5. Ez closed baseline mapping, nem optional example es nem deferred terminology.

## Role x Input Route/Policy Matrix

| Expected role | Input kind | Routed adapter path | Extra policy guard | Outcome semantics |
|---|---|---|---|---|
| `implementer` | `pass` | `emitImplementerPilotActorProtocolV11` -> `emitPassActorResultV11` -> `emitPassFromWorkspaceV11` | context integrity + input/context match + `expected_role === implementer` | allowed current-tree wrapper row |
| `implementer` | `human_question` | `emitImplementerPilotActorProtocolV11` -> `emitHumanQuestionActorResultV11` -> `emitAskHumanFromWorkspaceV11` | context integrity + input/context match + `expected_role === implementer` | allowed current-tree wrapper row |
| `reviewer` | `pass` | `emitReviewerActorProtocolV11` -> `emitPassActorResultV11` -> `emitPassFromWorkspaceV11` | `requireReviewerAuthority(...)`; downstream handoff loop/round-role baseline read-only | allowed current-tree wrapper row |
| `reviewer` | `convergence` | `emitReviewerActorProtocolV11` -> `emitConvergenceActorResultV11` -> `emitConvergedFromWorkspaceV11` | `requireReviewerAuthority(...)`; expected reviewer derived from active agent; downstream `validateConvergencePolicy(...)` retained | allowed current-tree wrapper row |
| `reviewer` | `human_question` | `emitActorProtocolViaFallbackRouting` -> `emitHumanQuestionActorResultV11` -> `emitAskHumanFromWorkspaceV11` | explicit retained baseline fallback; not wrapper-generalized route | preserved fallback row |
| `meta_reviewer` | `meta_review_result` | `emitMetaReviewerActorProtocolV11` -> `emitMetaReviewActorResultV11` -> `submitMetaReviewResultV11` | `requireMetaReviewerAuthority(...)`; `active_agent === codex` when present; top-level meta-review execution-context validation retained | allowed current-tree wrapper row |
| any role | every other `input.kind` combination | no route | fail-closed `ActorEmitContextError` | forbidden current-tree mismatch path |

Source anchors:
1. Wrapper + fallback routing:
   - `src/v11/application/actorProtocol/emitActorProtocolV11.ts`
   - concrete retained fallback helper: `emitActorProtocolViaFallbackRouting(...)`
2. Adapter callsites:
   - `src/v11/application/actorProtocol/actorProtocolEmitters.ts`
3. CLI/public emit kind surface:
   - `src/types/protocol.ts`
   - `src/cli/commands/agent/emit.ts`

## Canonical vs Policy vs Workflow-Adapter Boundary Split

| Layer | Source anchors | What it owns now | What it does not own |
|---|---|---|---|
| Canonical actor authority context | `docs/actor-runtime-interface/execution-authority-contract-note-v1.md`, `src/v11/shared/actorProtocol/actorEmitContext.ts`, `src/v11/shared/state/executionContext.ts` | explicit `execution_context`, `handoff_id`, `execution_id`, `expected_role`, `expected_round`, `expected_state_fingerprint` jelentese | workflow topology, bubble handoff loop ownership, public output taxonomy redesign |
| Generic runtime route/policy matrix | `src/v11/application/actorProtocol/emitActorProtocolV11.ts` | `expected_role x input.kind` dispatch, wrapper-local policy guards, retained reviewer fallback, fail-closed mismatch rule | canonical authority redefinition, delivery topology ownership, public CLI grammar rewrite |
| Workflow-specific output adapters | `src/v11/application/actorProtocol/actorProtocolEmitters.ts`, `src/types/protocol.ts`, `src/cli/commands/agent/emit.ts` | pass / ask-human / converged / meta-review submit workflow outputs es a hozza tartozo public kinds | generic internal kernel taxonomy, authority producer semantics |

## Proposed Typed Internal Boundary Vocabulary

1. `ActorRuntimeRoute`
   - a resolved belso dispatch sor, amely legalabb ezt nevezi meg:
     - authority role,
     - accepted input kind,
     - routed workflow adapter,
     - preserved baseline vagy fail-closed statusz.
2. `ActorRuntimePolicyCheck`
   - egy explicit guard-bejegyzes, amelyhez tartozik:
     - guard owner,
     - source anchor,
     - required condition,
     - fail behavior.
3. `ActorRuntimeDispatchPlan`
   - a canonical authority contextbol + route-bol + policy check-ekbol osszeallitott belso terv,
   - amely meg mindig workflow adapterre mutat,
   - de nem azonos a public `ActorEmitInput` vagy `ActorOutputKind` unionokkal.
4. Ezek a fogalmak ebben a note-ban csak belso boundary vocabularyk:
   - nem jelentenek uj public CLI surface-et,
   - nem jelentik a zart state/config/policy baseline altalanositasat.

## Preserved Baselines

1. A canonical execution authority jelentese a kulon authority note szerint preserved marad.
2. A reviewer-origin `human_question` retained fallback explicit preserved-baseline sor.
3. A meta-reviewer `active_agent === codex` when present guard explicit preserved-baseline guard.
4. A fail-closed mismatch semantics preserved baseline:
   - meta-reviewer authority csak `meta_review_result` emitre ervenyes,
   - minden egyeb unsupported role x input combination explicit hibara fut.
5. A bubble config/state/policy baseline explicit zart marad:
   - `BubbleAgentsConfig`
   - `RoundRoleHistoryEntry`
   - implementer/reviewer pass handoff loop
   - convergence policy
   - start/resume topology slots

## Explicit Downstream Constraints

1. Read-only downstream public surfaces:
   - `src/types/protocol.ts`
   - `src/cli/commands/agent/emit.ts`
2. Read-only downstream state surfaces:
   - `src/v11/shared/state/executionContext.ts`
   - `src/v11/shared/metaReview/metaReviewExecutionContext.ts`
3. Read-only downstream workflow baseline:
   - `src/config/bubbleConfig.ts`
   - `src/v11/domain/pass/handoff.ts`
   - `src/v11/domain/convergence/policyValidation.ts`
   - `src/v11/defaults/start/startStateMutation.ts`
4. Ez a note nem ownershipolja:
   - public protocol rewrite,
   - delivery/executor topology change,
   - onboarding simplification implementation,
   - bubble state/policy generalization.

## Sequencing Consequences

1. `O1-T2` csak ezen note exact route/policy matrixat formalizalhatja typed belso boundaryva.
2. `O1-T3` csak ezen note preserved baseline-jait tartva ulhet ra a jelenlegi wrapper-sprawlra.
3. `O2-T1` csak downstream topology/delivery clarification lehet:
   - nem nyithatja ujra a canonical authority closed jelenteset,
   - nem veheti at a generic runtime kernel ownershipja ala a bubble state/policy baseline-t.
4. `O3-T1` csak az itt rogzitett closed baseline vocabulary matrix utan nyithato:
   - onboarding simplification csak explicit source-anchor mappingra epulhet,
   - nem cserelheti le hallgatolag a `AgentRole` / `ActorOutputKind` / awaited-output baseline vocabularyt.
