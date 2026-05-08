# Bubble Type Ownership Progress Note

**Status**: working note  
**Source issue**: [`2026-05-07-modularity-review-followup.md`](../../docs/modularity-review/2026-05-07-modularity-review-followup.md), Issue 2  
**Scope**: `src/types/bubble.ts` type ownership and progressive extraction

This is not a formal Pairflow task document. It is a lightweight progress note for capturing the goal, working assumptions, decisions, and new learnings while addressing the `src/types/bubble.ts` god type module issue.

## Goal

Reduce the central model coupling around `src/types/bubble.ts` by moving bubble-related vocabulary to the subdomain that owns the meaning.

The target outcome is that a developer can answer "where does this type live?" from the business capability it belongs to:

- agent identity and role policy live with agent identity;
- lifecycle and snapshot vocabulary live with state/lifecycle ownership;
- review policy vocabulary lives with review policy;
- meta-review vocabulary lives with meta-review;
- remote executor vocabulary lives with remote/executor ownership;
- config aggregate vocabulary lives with config ownership.

The problem is not the line count by itself. The problem is that multiple Pairflow capabilities currently share one central source of truth even when they do not share the same business meaning.

## Current Understanding

`src/types/bubble.ts` currently combines:

- lifecycle states and `BubbleStateSnapshot`;
- agent names, roles, agent config, and role resolution policy;
- work mode, quality mode, command profile, attach launcher, and config types;
- review policy config and runtime view;
- meta-review run, recommendation, execution context, runtime delivery, and snapshot state;
- remote executor config and remote pointer/cache types;
- gate, ideation, spec lock, rework intent, and round-role history types;
- type guards for many of the above;
- policy functions such as `resolveConfiguredAgentForRole`.

This creates broad model coupling from `src/v11/**` back to a file outside the v11 ownership structure.

As of the initial check, direct `types/bubble` references were approximately:

- `src/v11/**`: 300 files;
- `src/v11/application/**`: 161 files;
- `src/v11/shared/**`: 64 files;
- `src/v11/infrastructure/**`: 30 files;
- `src/v11/domain/**`: 30 files;
- `src/v11/defaults/**`: 6 files.

The exact counts may drift as unrelated work lands. The important signal is the fan-out, not the precise number.

## Decision: Progressive Direct Extraction

We will proceed slice by slice rather than splitting the whole file in one large move.

However, the default should not be "keep a re-export bridge because many files must change." Since the migration is agent-assisted, mechanical import churn is not the main constraint. Git, typecheck, tests, and review give us enough safety to do broad direct updates when the ownership decision is clear.

The default strategy for each slice is:

1. Create the new owner module under the narrowest correct v11/config location.
2. Move the slice's exported values, types, guards, and policy functions there.
3. Rewrite all imports for that slice to the new owner.
4. Remove the moved exports from `src/types/bubble.ts`.
5. Run the narrowest useful verification, then broader checks as needed.

A temporary re-export bridge is allowed only when it has a concrete compatibility or boundary-validation purpose. It should not exist merely to avoid updating many import sites.

## First Candidate Slice

Initial preferred slice: agent identity and role ownership.

Candidate exports:

- `agentNames`
- `AgentName`
- `agentRoles`
- `AgentRole`
- `BubbleAgentsConfig`
- `resolveConfiguredAgentForRole`
- `resolveUniquelyConfiguredRoleForAgent`
- `isAgentName`
- `isAgentRole`

Candidate owner: `src/v11/domain/agentIdentity/`.

Reasoning:

- This slice contains real domain policy, not only data shape.
- Agent role ownership is conceptually independent from lifecycle state, review policy, remote execution, and config aggregation.
- The current comment above `agentRoles` already says role changes are not local enum-only changes, which supports giving this vocabulary an explicit domain home.

Open question before implementation:

- Whether browser-facing UI contract surfaces should import the new domain owner directly, continue using a contract-local mirror, or depend on a separate published contract. This should be checked against `docs/architecture/ui-contract-governance.md` before changing UI contract parity surfaces.

## Non-Goals

- Do not split the whole `src/types/bubble.ts` file in one uncontrolled sweep.
- Do not introduce a generic `shared/bubble` dumping ground as the new central type bucket.
- Do not move lifecycle/snapshot types before the lifecycle/state mutation ownership direction is clear.
- Do not keep compatibility re-exports indefinitely.
- Do not change runtime behavior as part of a pure ownership extraction unless the slice's policy logic must move with the type.

## Verification Expectations

For each implemented slice:

- `pnpm typecheck`;
- `pnpm lint`;
- targeted tests for affected ownership and contract parity;
- broader affected test suite when import movement crosses contracts, UI, or runtime serialization boundaries;
- `pnpm fitness:check:ci` if the move changes layer/import topology in a way architecture fitness should care about.

If direct non-docs source edits are made in the current checkout, follow the repository local verification order before declaring the work complete.

## Next Slice Working Rules

Before moving another slice, classify the affected consumers into explicit surfaces:

- internal v11 runtime/domain consumers;
- `src/config/**` configuration consumers;
- `src/types/**` legacy/public type consumers;
- `src/contracts/ui/**` browser-safe contract consumers;
- package root exports in `src/index.ts`.

Apply direct migration by default for internal/runtime/config consumers when the owner is clear. Treat `src/contracts/ui/**` as a separate ownership surface: UI contracts should keep contract-local DTO mirrors unless the UI contract governance explicitly changes. Treat `src/index.ts` as a public package facade decision, not as a compatibility re-export bridge from `src/types/bubble.ts`.

When `src/types/bubble.ts` still needs a moved slice to describe remaining aggregate types, keep that dependency type-only. Do not introduce runtime value imports from `src/types/bubble.ts` back into `src/v11/**`.

Preferred mechanical flow:

1. Build the surface inventory.
2. Create the new owner module.
3. Rewrite imports directly to the owner.
4. Run `pnpm exec eslint . --fix` after the mechanical rewrite to normalize type-only imports.
5. Run the verification sequence.

## Progress Log

### Bubble config aggregate slice

- Created `src/v11/shared/config/bubbleConfigTypes.ts` as the owner for the `BubbleConfig` aggregate.
- Updated config validation/rendering, create/start/pass/converged/ask-human/reply/watchdog contracts, delivery helpers, review/gate helpers, remote workspace lookup, runtime tests, and root package type exports to import `BubbleConfig` from the config owner.
- Removed `BubbleConfig` and its now-moved config submodel imports from `src/types/bubble.ts`; the old file now only retains lifecycle, remote-state cache, and state snapshot ownership.
- Learning: the aggregate move became straightforward only after the embedded config submodels and scalar config vocabulary already had explicit owners. For future aggregate slices, move leaf vocabulary first, then move the aggregate once its remaining dependencies are type-only and conceptually stable.
- Targeted verification completed: `pnpm typecheck`, `pnpm lint`, `pnpm fitness:check:ci`, and focused config/command/review/delivery/runtime Vitest coverage passed.

### Core config vocabulary slice

- Created `src/v11/shared/config/bubbleConfigVocabulary.ts` as the owner for work mode, quality mode, review artifact type, create-time review artifact type, Pairflow command profile, reviewer context mode, and their guards/literal arrays.
- Updated config validation/defaults, create CLI/runtime contracts, command/runtime guidance, reviewer/convergence helpers, runtime-session parsing, UI contract shape validation, tests, and root package exports to import this vocabulary from the new owner.
- Removed the config vocabulary literals and guards from `src/types/bubble.ts`; the remaining `BubbleConfig` aggregate now keeps only type-only dependencies on the moved vocabulary.
- Preserved UI contract governance by replacing browser-facing `WorkMode` and `PairflowCommandProfile` uses with contract-local `UiWorkMode` and `UiPairflowCommandProfile` mirrors in `src/contracts/ui/uiReadModel.ts`.
- Targeted verification completed: `pnpm typecheck` and focused config/create/reviewer/UI-contract Vitest coverage passed.

### Gate state slice

- Created `src/v11/shared/gates/gateStateTypes.ts` as the owner for gate signal levels, gate reason codes, failing gate warnings, spec-lock state, and round-gate state.
- Updated shared gate evaluation/artifact code, status projection, remote status parsing, converged validation/finalization contracts, and root package type exports to import gate state vocabulary from the new owner.
- Removed gate state vocabulary from `src/types/bubble.ts`; unlike many config/state slices, the remaining bubble aggregate no longer needs a type-only dependency on these gate shapes.
- Preserved UI contract governance by replacing the browser-facing `BubbleFailingGate`, `BubbleSpecLockState`, and `BubbleRoundGateState` imports with contract-local `UiBubbleFailingGate`, `UiBubbleSpecLockState`, and `UiBubbleRoundGateState` mirrors in `src/contracts/ui/uiReadModel.ts`.
- Targeted verification completed: `pnpm typecheck` and focused gate/status/remote-status/UI-contract Vitest coverage passed.

### Ideation config slice

- Created `src/v11/shared/ideation/ideationConfigTypes.ts` as the owner for `BubbleIdeationConfig`.
- Updated root package type exports to import ideation config from the new owner.
- Removed `BubbleIdeationConfig` from `src/types/bubble.ts`; the old file now only imports it as a type-only dependency for the remaining `BubbleConfig` aggregate.

### Validation target config slice

- Created `src/v11/shared/validation/validationTargetConfigTypes.ts` as the owner for `BubbleValidationTargetConfig`.
- Updated root package type exports to import validation target config from the new owner.
- Removed `BubbleValidationTargetConfig` from `src/types/bubble.ts`; the old file now only imports it as a type-only dependency for the remaining `BubbleConfig` aggregate.

### Attach launcher slice

- Created `src/v11/shared/bubbleAttachment/attachLauncherTypes.ts` as the owner for attach launcher literals, the launcher type, and the launcher guard.
- Updated global/bubble config validation, attach runtime/application contracts, shared attach execution resolution, tests, and root package type exports to import attach launcher vocabulary from the new owner.
- Removed attach launcher vocabulary from `src/types/bubble.ts`; the old file now only imports `AttachLauncher` as a type-only dependency for the remaining `BubbleConfig` aggregate.
- Preserved UI contract governance by replacing the browser-facing `AttachLauncher` dependency in `src/contracts/ui/uiActions.ts` with a contract-local `UiRequestedAttachLauncher` mirror.

### Local overlay config slice

- Created `src/v11/shared/workspace/localOverlayTypes.ts` as the owner for local overlay mode literals, the local overlay config shape, and the local overlay mode guard.
- Updated bubble config validation, defaults, worktree workspace port types, and root package type exports to import local overlay vocabulary from the new owner.
- Removed local overlay vocabulary from `src/types/bubble.ts`; the old file now only imports `BubbleLocalOverlayConfig` as a type-only dependency for the remaining `BubbleConfig` aggregate.

### Notifications config slice

- Created `src/v11/shared/notifications/notificationConfigTypes.ts` as the owner for `BubbleNotificationsConfig`.
- Updated root package type exports to import notifications config from the new owner.
- Removed `BubbleNotificationsConfig` from `src/types/bubble.ts`; the old file now only imports it as a type-only dependency for the remaining `BubbleConfig` aggregate.

### Doc contract gate config slice

- Created `src/v11/shared/gates/docContractGateConfigTypes.ts` as the owner for `BubbleDocContractGatesConfig`.
- Updated create command contract/runtime and root package type exports to import doc-contract gate config from the new owner.
- Removed `BubbleDocContractGatesConfig` from `src/types/bubble.ts`; the old file now only imports it as a type-only dependency for the remaining `BubbleConfig` aggregate.

### Command config slice

- Created `src/v11/shared/command/commandConfigTypes.ts` as the owner for `BubbleCommandsConfig`.
- Updated actor prompt concern builders, start prompt builders, and root package type exports to import command config from the new owner.
- Removed `BubbleCommandsConfig` from `src/types/bubble.ts`; the old file now only imports it as a type-only dependency for the remaining `BubbleConfig` aggregate.

### Round role history slice

- Created `src/v11/shared/state/roundRoleHistoryTypes.ts` as the owner for `RoundRoleHistoryEntry`.
- Updated state machine, round continuation, pass handoff, convergence policy, state schema, state inspection, and root package type exports to import round-role history from the new owner.
- Removed `RoundRoleHistoryEntry` from `src/types/bubble.ts`; the old file now only imports it as a type-only dependency for the remaining `BubbleStateSnapshot` aggregate.

### Rework intent slice

- Created `src/v11/shared/state/reworkIntentTypes.ts` as the owner for deferred rework intent status literals, the rework intent record shape, and the rework-intent status guard.
- Updated rework intent domain logic, state schema validation, state inspection, UI router defaults, approval result mapping, and root package type exports to import the rework-intent vocabulary from the new owner.
- Removed rework intent vocabulary and guard exports from `src/types/bubble.ts`; the old file now only imports `BubbleReworkIntentRecord` as a type-only dependency for the remaining `BubbleStateSnapshot` aggregate.

### Meta-review snapshot slice

- Created `src/v11/shared/metaReview/metaReviewSnapshotTypes.ts` as the owner for meta-review snapshot state, runtime-delivery state/status, the auto-rework default limit, and the runtime-delivery guard.
- Updated meta-review gate, state schema, state inspection, SSH status parsing, UI validation, and meta-review snapshot tests to import those types/constants/guards from the new owner.
- Removed meta-review snapshot/runtime-delivery exports from `src/types/bubble.ts`; the old file now only imports `BubbleMetaReviewSnapshotState` as a type-only dependency for the remaining `BubbleStateSnapshot` aggregate.
- Preserved UI contract governance by replacing `MetaReviewRuntimeDeliveryStatus` in `src/contracts/ui/uiReadModel.ts` with a contract-local `UiMetaReviewRuntimeDeliveryStatus` mirror.
- Targeted verification completed: `pnpm typecheck`, `pnpm lint`, and focused meta-review snapshot/state/status/UI-contract Vitest coverage passed.

### Execution context slice

- Created `src/v11/shared/state/executionContextTypes.ts` as the owner for running execution-context shapes, meta-review execution-context shape, awaited-output literals, and related guards.
- Updated state schema, state inspection, actor protocol, meta-review, review-policy, status, SSH status parsing, and round-continuation consumers to import execution-context vocabulary from the new owner.
- Removed execution-context vocabulary from `src/types/bubble.ts`; the old file now only imports the context types as type-only dependencies for the remaining `BubbleStateSnapshot` aggregate.
- Preserved UI contract governance by replacing `BubbleExecutionContext[...]` references in `src/contracts/ui/uiReadModel.ts` with contract-local active-role and awaited-output literal mirrors.
- Targeted verification completed: `pnpm typecheck`, `pnpm lint`, and focused state/execution-context/meta-review/status/UI-contract Vitest coverage passed.

### Meta-review run vocabulary slice

- Moved meta-review run status, recommendation literals, related types, and guards from `src/types/bubble.ts` to the existing `src/v11/shared/metaReview/metaReviewTypes.ts` owner.
- Updated meta-review gate, approval, inbox, protocol, persistence, and UI validation consumers to import the vocabulary from the meta-review owner.
- Preserved UI contract governance by replacing the browser-facing `MetaReviewRecommendation` import with a contract-local `UiMetaReviewRecommendation` mirror in `src/contracts/ui/uiReadModel.ts`.
- Kept meta-review execution context, runtime delivery, and snapshot state in `src/types/bubble.ts` for a later state/snapshot slice; this slice only moved run/result vocabulary.
- Targeted verification completed: `pnpm typecheck` and focused meta-review/UI-contract Vitest coverage passed.

### Remote executor and pointer slice

- Created `src/v11/shared/remote/remoteExecutionTypes.ts` as the owner for remote executor kind/config, remote host config, remote pointer kinds, remote pointer shapes, and related guards.
- Moved runtime, config, infrastructure, application, shared, root-export, and test consumers of those remote executor/pointer types to import from the new owner.
- Removed those exports from `src/types/bubble.ts`; the old file now only imports `BubbleExecutorConfig` as a type-only dependency for the remaining `BubbleConfig` aggregate.
- Deferred `BubbleRemoteStateCache` intentionally because it currently depends on `BubbleLifecycleState`; moving it before the lifecycle/snapshot owner is chosen would create a type-ownership cycle or force a premature lifecycle decision.
- Targeted verification completed: `pnpm typecheck`, `pnpm lint`, `pnpm fitness:check:ci`, and focused remote/config/start/status/open/commit Vitest coverage passed.

### Review policy slice

- Created `src/v11/shared/reviewPolicy/reviewPolicyTypes.ts` as the owner for review loop modes, auto-rework severities, support statuses, review policy config/runtime view shapes, and review-policy guards.
- Moved runtime, config, domain, infrastructure, and test consumers of the review policy vocabulary to import from the new owner.
- Removed those exports from `src/types/bubble.ts`; the old file now only imports `BubbleReviewPolicyConfig` as a type-only dependency for the remaining `BubbleConfig` aggregate.
- Preserved UI contract governance by adding contract-local `UiBubbleReviewLoopMode`, `UiBubbleReviewAutoReworkSeverity`, and `UiBubbleReviewSupportStatus` mirrors under `src/contracts/ui/uiReadModel.ts` instead of importing the internal v11 owner.
- Targeted verification completed: `pnpm typecheck`, `pnpm lint`, `pnpm fitness:check:ci`, and focused review policy/config/UI contract Vitest coverage passed.

### Agent identity slice

- Created `src/v11/domain/agentIdentity/agentIdentity.ts` as the owner for agent names, agent roles, agent config, role resolution policy, and related guards.
- Moved direct consumers of `AgentName`, `AgentRole`, `BubbleAgentsConfig`, `agentNames`, `agentRoles`, `isAgentName`, `isAgentRole`, `resolveConfiguredAgentForRole`, and `resolveUniquelyConfiguredRoleForAgent` to import from the new owner.
- Removed those exports from `src/types/bubble.ts`; the old file now only imports the agent identity types it needs to describe remaining aggregate types.
- Preserved UI contract governance: browser-facing UI action DTOs continue to own their contract-local `UiActionAgentName` and `UiActionAgentRole` mirrors instead of importing internal `src/v11/**` runtime paths.
- Verification completed: `pnpm typecheck`, `pnpm lint`, `pnpm fitness:check:ci`, targeted Vitest slice, `pnpm test`, and `pnpm build` all passed.

### Initial note

- Captured the working decision: progressive extraction, but direct import migration by default.
- Rejected "300 files is too much" as a standalone reason for a re-export bridge.
- Kept temporary re-export bridges available only for concrete compatibility or boundary-validation needs.
- Identified agent identity / role ownership as the likely first slice.

## Learnings

- The first slice did not need a compatibility re-export bridge. The mixed imports could be split mechanically, and typecheck/lint caught the only split-quality issues.
- The UI contract question mattered in practice: UI contract files should keep browser-safe contract-local mirrors rather than importing the new v11 domain owner.
- The review policy slice confirmed the same UI rule for non-agent vocabularies: browser contracts should own their payload literals even when the backend runtime vocabulary has a clearer v11 owner.
- The meta-review run vocabulary slice kept execution context/snapshot types out of the move; run result vocabulary and state ownership are adjacent but not the same ownership decision.
- After execution context moved out, meta-review snapshot/runtime delivery could move independently; the full `BubbleStateSnapshot` aggregate still waits for a lifecycle/snapshot ownership slice.
- Rework intent is small enough to move independently of the full snapshot aggregate: it is an embedded state submodel with its own literals and guard, while `BubbleStateSnapshot` can keep only a type-only dependency until the lifecycle/snapshot slice lands.
- Round role history follows the same pattern: it is an audit/history submodel shared by state transition, pass handoff, and convergence policy, while the full lifecycle/snapshot aggregate can remain deferred.
- `BubbleCommandsConfig` can move independently from the full `BubbleConfig` aggregate because its active meaning is command/validation-command guidance; the aggregate can keep a type-only dependency while config ownership is split progressively.
- Doc-contract gate config can move before the full config aggregate because its semantics already belong to the gates subdomain; create-time partial input can depend on that owner directly.
- Notifications config can move as a very small config submodel because runtime notification behavior consumes it through `BubbleConfig`, while the shape itself belongs to notification ownership.
- Local overlay config belongs with workspace ownership rather than the central bubble aggregate: both config validation and worktree ports consume the same mode vocabulary, while `BubbleConfig` can keep only a type-only dependency.
- Attach launcher vocabulary belongs with bubble attachment ownership, and UI action payloads should mirror the requested/used launcher literals contract-locally rather than importing the internal owner.
- Validation target config can move independently from `BubbleConfig` because validation target id/path behavior already lives under shared validation ownership; the aggregate only embeds the selected target shape.
- Ideation config can move independently because ideation metadata and reason-code behavior already has ideation ownership; `BubbleConfig` only embeds the persisted config shape.
- Remote state cache should wait for lifecycle/snapshot extraction because it embeds `BubbleLifecycleState`; not every apparent slice should move all adjacent names at once.
- Root package exports are a distinct public facade question; preserving them does not mean keeping `src/types/bubble.ts` as a bridge.
- `src/types/bubble.ts` can safely depend on a moved owner only as a type-only aggregate dependency. A runtime value import there would be a new architecture smell.
- Execution-context types need a separate type owner rather than living in `executionContext.ts`, because runtime builders depend on actor protocol projection while actor protocol projection also needs the awaited-output vocabulary.
- Gate status/warning vocabulary belongs with shared gates, not the central bubble model. Status and converged flows can depend on that owner directly, while UI read models should keep browser-facing gate mirrors as DTO contract shapes.
- Core config vocabulary is distinct from the full `BubbleConfig` aggregate: defaults, validation, create-time input, reviewer/convergence behavior, and command/runtime guidance all need the same scalar literals without owning the aggregate config file.
- Import count is a risk signal, not a sufficient argument for a bridge. The real risk is whether the target owner is semantically correct and whether mixed imports can be split without creating worse architecture edges.
- Agent-assisted migration changes the cost model: mechanical churn is cheap, but ownership mistakes and review noise remain expensive.
