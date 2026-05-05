# Modularity Review

**Scope**: Pairflow repository (`src/**`, `ui/**`, `tools/**`, `docs/**`) — entire codebase, with emphasis on changes since the 2026-05-02 modularity review  
**Date**: 2026-05-05

## Executive Summary

Pairflow is a local-first CLI and UI orchestrator for isolated agent work units called bubbles: it creates git worktrees, runs real agent CLIs through tmux/process boundaries, persists protocol history, and gates lifecycle transitions through deterministic state and review policies. Overall modularity has improved since the 2026-05-02 review: direct `child_process` use is now behind infrastructure/port boundaries, `bubbleConfig.ts` has been split into cohesive parser/render/readers/config modules, command-local `shared/<command>` parking lots have been removed, and UI contracts now have a backend-owned `src/contracts/ui/**` seam. The most important remaining issue is not a missing layer rule, but a composition inversion: high-volatility plan-watch code imports default runtime wiring, while default wiring imports plan-watch application modules, creating a strong application/defaults cycle outside the current dependency fitness scope. The next most important risks are raw protocol payload leakage into the UI timeline and a large `shared/metaReviewGate/**` context that owns policy, routing, command API, and persistence-oriented helpers in one volatile shared package.

## Coupling Overview

| Integration | [Strength](https://coupling.dev/posts/dimensions-of-coupling/integration-strength/) | [Distance](https://coupling.dev/posts/dimensions-of-coupling/distance/) | [Volatility](https://coupling.dev/posts/dimensions-of-coupling/volatility/) | [Balanced?](https://coupling.dev/posts/core-concepts/balance/) |
| ----------- | ----------------------------------------------------------------------------------- | ----------------------------------------------------------------------- | --------------------------------------------------------------------------- | -------------------------------------------------------------- |
| `application/planWatch/**` <-> `defaults/planWatch/**` | [Functional](https://coupling.dev/posts/dimensions-of-coupling/integration-strength/) + composition knowledge | Medium (application/runtime wiring boundary, outside dependency fitness scope) | High (plan automation and agent-runner behavior are evolving) | **No** — strong same-feature knowledge crosses an architectural boundary |
| UI timeline (`ui/src/components/expanded/BubbleTimeline.tsx`) -> raw `ProtocolEnvelopePayload` via `UiTimelineEntry.payload` | [Model](https://coupling.dev/posts/dimensions-of-coupling/integration-strength/) + implicit [functional](https://coupling.dev/posts/dimensions-of-coupling/integration-strength/) coupling | High (browser package / backend protocol boundary) | Medium-high (meta-review and timeline semantics keep changing) | **No** — explicit contract exists, but it exports the internal model |
| `shared/metaReviewGate/**` <-> `shared/metaReview/**`, `application/converged/**`, `application/metaReviewGate/**` | [Functional](https://coupling.dev/posts/dimensions-of-coupling/integration-strength/) and [model](https://coupling.dev/posts/dimensions-of-coupling/integration-strength/) coupling | Medium (shared package used as bounded context across command lanes) | High (core quality gate, current product differentiator) | **No** — volatile policy/routing is too broadly shared |
| `src/config/bubbleConfig.ts` -> `src/config/bubbleConfig/*.ts` | [Contract](https://coupling.dev/posts/dimensions-of-coupling/integration-strength/) facade over cohesive modules | Low | High | **Yes** — file-level complexity reduced while keeping a stable public API |
| `application/**` -> `shared/ports/processSpawn.ts` -> `infrastructure/executor/process/**` | [Contract](https://coupling.dev/posts/dimensions-of-coupling/integration-strength/) | High (OS process/runtime boundary) | Medium implementation volatility, low functional volatility | **Yes** — the previous intrusive process coupling is fixed |
| UI package -> `@pairflow/ui-contracts` alias -> `src/contracts/ui/index.ts` | [Contract](https://coupling.dev/posts/dimensions-of-coupling/integration-strength/) | High | Medium | Mostly balanced — single-source contract ownership is in place |
| `application/**` -> `shared/ports/**` -> `infrastructure/**` | [Contract](https://coupling.dev/posts/dimensions-of-coupling/integration-strength/) | High | Mixed | **Yes** — dependency fitness reports 2902 import edges and no violations |
| `v11/**` -> `src/types/**` shared kernel | [Model](https://coupling.dev/posts/dimensions-of-coupling/integration-strength/) | Low | High | **Yes** — high cohesion inside one deployable unit |

<div class="issue">

## Issue: Plan-watch application code imports runtime defaults while defaults import plan-watch application modules

**Integration**: `src/v11/application/planWatch/**` <-> `src/v11/defaults/planWatch/**`  
**Severity**: Critical

### Knowledge Leakage

`src/v11/application/planWatch/agentRunnerBridge.ts` imports `agentRunnerBridgeDefaults` and uses it as the default dependency object for `runExecutePairflowPlanContinuation`. In the opposite direction, `src/v11/defaults/planWatch/agentRunnerBridgeDefaults.ts` imports `AgentRunnerBridgeDependencies`, `AgentRunnerProcessInvocation`, `AgentRunnerProcessResult`, and `prepareCodexRunnerFiles` from `application/planWatch/**`. `src/v11/defaults/planWatch/planWatchLoopDefaults.ts` also imports concrete application functions such as `runExecutePairflowPlanContinuation`, `linkedBubbleTriggerIndex`, `planWatchLedger`, and `emitStatusV11`.

This is [functional coupling](https://coupling.dev/posts/dimensions-of-coupling/integration-strength/) between the use-case policy and its runtime composition. The application layer knows the default runtime implementation exists, while the defaults layer knows plan-watch internals well enough to compose concrete functions. That knowledge is explicit in imports, but it is still the wrong kind of explicitness: the default dependency graph becomes part of the application behavior rather than a composition concern.

### Complexity Impact

The current dependency fitness check passes because `defaults/**` is not treated as the same architectural boundary as `application/**`, `shared/**`, and `infrastructure/**`. That makes the [distance](https://coupling.dev/posts/dimensions-of-coupling/distance/) higher than it looks from path proximity: the composition boundary is outside the main layer rule, so readers must remember an extra exception to reason about plan-watch. A developer changing the agent-runner bridge has to keep in mind application preconditions, Codex runner file preparation, process spawning, stdout artifact capture, default path checks, and loop wiring. That exceeds normal [complexity](https://coupling.dev/posts/core-concepts/complexity/) budget even though each individual file is under the fitness line limit.

### Cascading Changes

Plan-watch is likely to change whenever Pairflow improves task automation, plan continuation, Codex runner output, or `ExecutePairflowPlan` handoff formats. A change to `AgentRunnerBridgeDependencies` now touches the application contract, default runtime wiring, tests, and sometimes the application implementation because the implementation has a baked-in default. A change to the built-in Codex runner file contract can cascade from `codexAgentRunnerBridge.ts` into `agentRunnerBridgeDefaults.ts`, then into tests for loop defaults and runner execution.

### Recommended Improvement

Rebalance by making plan-watch application code dependency-explicit. Remove default dependency imports from `application/planWatch/**`; require dependencies at the application boundary and have CLI/default entrypoints pass `agentRunnerBridgeDefaults` or `planWatchLoopDefaults`. Move `prepareCodexRunnerFiles` behind the `AgentRunnerBridgeDependencies` contract or into a small `shared/planWatch`/`domain/planWatch` pure helper if it is not runtime wiring. Then extend dependency fitness to include `src/v11/defaults/**` as a composition layer with a rule that `application/**` and plain `shared/**` do not import `defaults/**`.

The trade-off is a few more explicit dependency parameters in tests and command entrypoints. The gain is that the [contract coupling](https://coupling.dev/posts/dimensions-of-coupling/integration-strength/) becomes one-directional: application owns orchestration, defaults owns runtime composition, and fitness can detect future inversions.

</div>

<div class="issue">

## Issue: UI timeline contract still exposes raw protocol payload knowledge

**Integration**: `src/contracts/ui/uiReadModel.ts` / `UiTimelineEntry.payload` -> `ui/src/components/expanded/BubbleTimeline.tsx`  
**Severity**: Significant

### Knowledge Leakage

The UI contract seam now exists and is valuable, but `UiTimelineEntry.payload` is typed as `ProtocolEnvelopePayload` from `src/types/protocol.ts`. The backend presenter normalizes selected fields in `src/v11/infrastructure/ui/presenters/timelinePresenter.ts`, but the browser component still reads protocol-level fields directly: `summary`, `question`, `message`, `decision`, `findings`, `metadata`, meta-review handoff attempts, route markers, and synthetic approval rows. That makes the UI timeline depend on the internal protocol language rather than a UI-specific published timeline language.

This is [model coupling](https://coupling.dev/posts/dimensions-of-coupling/integration-strength/) across a high [distance](https://coupling.dev/posts/dimensions-of-coupling/distance/) boundary. It is no longer manual duplication, so the previous UI contract finding is mostly fixed, but the new single-source contract still exports too much internal model.

### Complexity Impact

The browser code must understand both presentation and protocol semantics. When a timeline row renders strangely, the reader has to inspect `ProtocolEnvelopePayload`, meta-review metadata conventions, the timeline presenter, and the React component. Because the UI receives a broad payload object, the boundary does not state which fields are presentation-authoritative and which are archival pass-through. That weakens [modularity](https://coupling.dev/posts/core-concepts/modularity/): the changed part is not obvious when protocol metadata changes.

### Cascading Changes

Any change to meta-review metadata keys, approval-decision routing markers, findings shape, or protocol payload normalization can require UI changes. The current tests cover important scenarios, but they do so by constructing protocol-shaped payloads in UI tests, which reinforces the shared internal model. As meta-review timeline affordances evolve, this coupling will keep pulling protocol details into the browser.

### Recommended Improvement

Introduce a UI-specific `UiTimelineEntry` payload contract that contains presentation fields, for example `primaryText`, `secondaryText`, `role`, `severityTags`, `decisionTag`, `metaReview`, and `rawRefs`. Keep the raw protocol envelope available only behind an explicit debug/archive field if needed. Make `timelinePresenter.ts` the [facade](https://coupling.dev/posts/dimensions-of-coupling/integration-strength/) that translates `ProtocolEnvelope` into this UI timeline DTO, and make `BubbleTimeline.tsx` render only the DTO.

The cost is one migration through timeline tests and fixtures. The benefit is that future protocol changes cascade only to the presenter, while the browser remains coupled to a stable UI [contract](https://coupling.dev/posts/dimensions-of-coupling/integration-strength/).

</div>

<div class="issue">

## Issue: `shared/metaReviewGate` is acting as a volatile bounded context rather than a shared contract

**Integration**: `src/v11/shared/metaReviewGate/**` -> `shared/metaReview/**`, `application/converged/**`, `application/metaReviewGate/**`, approval/inbox/status consumers  
**Severity**: Significant

### Knowledge Leakage

`src/v11/shared/metaReviewGate/**` is roughly 6.8k lines and contains route types, threshold authority, findings parity, approval summary normalization, reviewer snapshot logic, current-run finalization, auto-rework dispatch, human-gate persistence, command API/runtime re-exports, and tmux capability types. Several files are intentionally near the complexity ceiling, including `metaReviewGateCurrentRunFinalization.ts`, `metaReviewGateCurrentRunCleanRerun.ts`, and `metaReviewApproveValidationGate.ts`.

This package is not merely shared meaning. It owns a large part of the meta-review gate's [functional coupling](https://coupling.dev/posts/dimensions-of-coupling/integration-strength/): lifecycle routing, approval semantics, findings parity, threshold decisions, and persistence-oriented state changes. The coupling is spread across `shared/metaReview/**`, `application/converged/**`, and `application/metaReviewGate/**`, so the real bounded context is harder to see than if it lived under a dedicated application/domain boundary.

### Complexity Impact

Meta-review gating is a core Pairflow differentiator, so its [volatility](https://coupling.dev/posts/dimensions-of-coupling/volatility/) is high by business-domain reasoning, not just by commit frequency. Because the logic is placed in `shared`, unrelated consumers can import deep gate details directly. That increases cognitive load: a developer has to decide whether a module is a stable shared contract, pure policy, command orchestration, or state mutation support by reading implementation files rather than by trusting the path.

### Cascading Changes

Changes to clean-run thresholds, advisory/blocking finding parity, approval summary rules, or auto-rework routing can cascade across meta-review submit handling, convergence finalization, approval transcript context, bubble inbox, metrics reporting, UI read models, and tests. The current shape has many small files, which is good, but file splitting alone does not reduce [integration strength](https://coupling.dev/posts/dimensions-of-coupling/integration-strength/) when all consumers still share the same broad context.

### Recommended Improvement

Promote meta-review gate from plain `shared` to an explicit bounded context. Keep narrow stable route/type definitions in `shared/metaReviewGate` only where multiple consumers need a published language. Move pure threshold/parity/route policy into `domain/metaReviewGate/**`; move command runtime and persistence orchestration into `application/metaReviewGate/**`; keep runtime adapters and artifact/state implementations behind `shared/ports/**` and `infrastructure/**`.

The trade-off is an incremental migration rather than a mechanical move. Do it by sub-slices: threshold authority first, then findings parity, then current-run finalization. Each slice should preserve the existing public command API until callers are moved. The payoff is that high-volatility gate policy becomes [high cohesion](https://coupling.dev/posts/core-concepts/balance/) in a visible owner, while cross-lane consumers depend only on stable [contract coupling](https://coupling.dev/posts/dimensions-of-coupling/integration-strength/).

</div>

## Resolved Since 2026-05-02

The previous review's highest-priority imbalances have materially improved:

- Direct `application/**` process spawning is gone; `node:child_process` imports now appear under `infrastructure/**`, with `shared/ports/processSpawn.ts` as the application-facing [contract](https://coupling.dev/posts/dimensions-of-coupling/integration-strength/).
- `bubbleConfig.ts` is no longer a 1683-line single file. It now exposes a smaller facade and delegates to `src/config/bubbleConfig/{parser,readers,render,reviewPolicy,commands,...}.ts`, which preserves low [distance](https://coupling.dev/posts/dimensions-of-coupling/distance/) while reducing file-level [complexity](https://coupling.dev/posts/core-concepts/complexity/).
- The one-customer `shared/<command>` parking-lot shape is gone from the current `src/v11/shared/**` top-level directory list.
- UI contract ownership has moved to `src/contracts/ui/**`, and `ui/src/lib/contracts/**` re-exports from `@pairflow/ui-contracts`; `pnpm fitness:check:ci` reports the UI contract boundary as passing with zero exceptions.
- The broader v11 fitness posture is strong: the 2026-05-05 run scanned 942 v11 files, found 2902 dependency edges, and reported no hard-fail dependency, mutation, transition, boundary, complexity, side-effect, UI contract, or UI router violations.

## Summary of Recommendations

1. Fix plan-watch composition inversion first: remove `defaults/**` imports from application/shared code and include `defaults/**` in dependency fitness.
2. Convert timeline rendering to a UI-specific DTO so the browser no longer depends on raw `ProtocolEnvelopePayload`.
3. Split `shared/metaReviewGate/**` by ownership: shared published language, domain policy, application orchestration, infrastructure adapters.
4. Keep the recently fixed port, config, and UI-contract boundaries intact; they are now examples of balanced [coupling](https://coupling.dev/posts/core-concepts/coupling/) in this repo.

---

_This analysis was performed using the [Balanced Coupling](https://coupling.dev) model by [Vlad Khononov](https://vladikk.com)._
