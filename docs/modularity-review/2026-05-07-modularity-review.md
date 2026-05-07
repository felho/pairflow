# Modularity Review

**Scope**: Entire Pairflow repository (`src/**`, `ui/**`, `docs/**`, `.claude/skills/**`)  
**Date**: 2026-05-07

## Executive Summary

Pairflow is a local-first CLI and UI orchestrator for isolated agent work units called bubbles: it creates git worktrees, runs real agent CLIs through tmux/process boundaries, persists protocol history, and gates lifecycle transitions through deterministic state and review policies. Overall [modularity](https://coupling.dev/posts/core-concepts/modularity/) is improving: the current architecture fitness run scanned 999 `src/v11/**` files and passed dependency, internal-module, shared-defaults, side-effect, and UI contract checks with no hard-fail violations. The most important remaining risk is not a direct forbidden import; it is that some `shared/**` modules still contain volatile mutation and gate policy rather than only stable [contract coupling](https://coupling.dev/posts/dimensions-of-coupling/integration-strength/) surfaces. This keeps change knowledge spread across `shared`, `domain`, `application`, and `defaults` in the core lifecycle and meta-review areas.

## Coupling Overview

| Integration | [Strength](https://coupling.dev/posts/dimensions-of-coupling/integration-strength/) | [Distance](https://coupling.dev/posts/dimensions-of-coupling/distance/) | [Volatility](https://coupling.dev/posts/dimensions-of-coupling/volatility/) | [Balanced?](https://coupling.dev/posts/core-concepts/balance/) |
| ----------- | ----------------------------------------------------------------------------------- | ----------------------------------------------------------------------- | --------------------------------------------------------------------------- | -------------------------------------------------------------- |
| `application/start`, `application/watchdog`, `application/approval` -> `shared/{state,watchdog,approval}` mutation helpers -> `domain/state` | [Functional](https://coupling.dev/posts/dimensions-of-coupling/integration-strength/) | Medium-high shared layer boundary | High core lifecycle policy | **No** |
| `shared/metaReview/**` + `shared/metaReviewGate/**` -> `domain/metaReviewGate/**` -> `application/metaReviewGate/**` | [Functional](https://coupling.dev/posts/dimensions-of-coupling/integration-strength/) + [model](https://coupling.dev/posts/dimensions-of-coupling/integration-strength/) | Medium-high cross-layer policy boundary | High quality-gate policy | **No** |
| `src/contracts/ui/UiTimelineEntry` -> backend protocol presenter + UI contract parity surface | [Model](https://coupling.dev/posts/dimensions-of-coupling/integration-strength/) | High backend/browser contract boundary | Medium-high meta-review display evolution | **Partially** |
| `application/**` -> `shared/ports/**` -> `infrastructure/**` | [Contract](https://coupling.dev/posts/dimensions-of-coupling/integration-strength/) | High | Mixed | **Yes** |
| `src/contracts/ui/**` -> `ui/src/lib/contracts/**` -> React components using `UiTimelineDisplayItem[]` | [Contract](https://coupling.dev/posts/dimensions-of-coupling/integration-strength/) | High | Medium | **Yes** |
| `tools/fitness/**` -> `src/v11/**` architecture policy | [Contract](https://coupling.dev/posts/dimensions-of-coupling/integration-strength/) policy enforcement | Medium | Medium | **Yes** |

## Issue: Shared mutation helpers own lifecycle policy and persistence ordering

**Integration**: `src/v11/application/start/**`, `src/v11/application/watchdog/**`, `src/v11/application/approval/**` -> `src/v11/shared/state/startStateMutation.ts`, `src/v11/shared/watchdog/watchdogEscalationMutation.ts`, `src/v11/shared/approval/reworkIntent.ts` -> `src/v11/domain/state/machine.ts`  
**Severity**: Significant

### Knowledge Leakage

The `shared` layer contains mutation helpers that import `applyStateTransition` from `domain/state` and also know persistence sequencing details. `startStateMutation.ts` builds `PREPARING_WORKSPACE`, `RUNNING`, resume, and failure snapshots and calls a `writeStateSnapshot` port. `watchdogEscalationMutation.ts` appends a `HUMAN_QUESTION` envelope, then persists `WAITING_HUMAN`. `reworkIntent.ts` queues and applies deferred rework intent while constructing the next execution context.

This is high [integration strength](https://coupling.dev/posts/dimensions-of-coupling/integration-strength/) because the modules share lifecycle [functional coupling](https://coupling.dev/posts/dimensions-of-coupling/integration-strength/): transition rules, execution-context semantics, transcript-first ordering, and recovery behavior. The shared package name suggests neutral reusable meaning, but the implementation contains command lifecycle policy.

### Complexity Impact

Lifecycle orchestration is a [core subdomain](https://coupling.dev/posts/dimensions-of-coupling/volatility/) for Pairflow and has high [volatility](https://coupling.dev/posts/dimensions-of-coupling/volatility/) because state integrity, recovery, remote execution, and human gates are active product concerns. A developer changing a transition or execution-context rule must inspect `domain/state`, command-local `application/**`, `shared/**` mutation modules, and `defaults/**` wiring to understand whether the change is policy, orchestration, or adapter behavior.

That creates [complexity](https://coupling.dev/posts/core-concepts/complexity/) because the module boundary no longer makes the changed part obvious. The current fitness checks pass, but the [balance rule](https://coupling.dev/posts/core-concepts/balance/) still flags the design: strong lifecycle knowledge crosses a non-local shared boundary in a volatile area.

### Cascading Changes

Adding a new lifecycle state, changing `RUNNING` execution authority, or adjusting watchdog escalation can cascade through `shared/state/startStateMutation.ts`, `shared/watchdog/watchdogEscalationMutation.ts`, `application/start/**`, `application/watchdog/**`, `application/approval/**`, state schema validation, transcript append behavior, and tests. The [distance](https://coupling.dev/posts/dimensions-of-coupling/distance/) is higher than a command-local helper because shared modules have multiple consumers and look like reusable contracts.

### Recommended Improvement

Split mutation construction from mutation execution. Put pure transition derivation and invariant checks in `domain/state/**`, with explicit input/output types. Put transcript-first persistence workflows in the owning `application/<command>/**` module, or in a deliberately named application-level mutation boundary if several commands truly share the same use case. Keep `shared/ports/**` for the `writeStateSnapshot` and `appendProtocolEnvelope` [integration contracts](https://coupling.dev/posts/dimensions-of-coupling/integration-strength/), not for the policy workflow itself.

The trade-off is some call-site movement and narrower dependency bundles. The benefit is lower [shared knowledge](https://coupling.dev/posts/dimensions-of-coupling/integration-strength/) at the shared boundary: lifecycle policy changes stay close to their owner, while shared remains a contract surface.

The target responsibility split should be explicit:

- `domain/state/**` should own pure lifecycle derivation: allowed transition inputs, start/resume/failure snapshot derivation, watchdog `WAITING_HUMAN` derivation, deferred rework application, next-round continuation, and execution-context invariants. Meta-review cleanup belongs here only when it is inseparable from a state transition, such as clearing live meta-review state while deriving an applied rework continuation; broader gate policy remains under the meta-review gate ownership described in the next issue.
- `application/start/**`, `application/watchdog/**`, and `application/approval/**` should own command workflows: transcript/state write ordering, optimistic fingerprint/state guards, runtime delivery, remote/local routing, identity mutation, metrics, notification side effects, and command-facing error mapping.
- `shared/ports/**` should remain the stable capability boundary for state snapshot writes, transcript append, inbox mirroring, delivery, notification, and related adapter contracts. It should not own the policy workflow that decides what lifecycle mutation means.

Do not introduce an application-level shared mutation boundary as the first step. The current helpers are not one common use case: start/resume owns workspace bootstrap and runtime launch authority, watchdog escalation owns transcript-first human intervention and recovery semantics, and rework intent owns approval/watchdog handoff and next-round continuation. A boundary such as `application/lifecycleMutation/**` is justified only after two or more command modules contain duplicated persistence choreography with the same transaction semantics. If introduced, it should be named as application orchestration, not `shared`, and expose typed contracts that state whether transcript append, inbox mirroring, state write, delivery, notification, and metrics are part of the operation.

Recommended migration sequence:

1. Add pure `domain/state/**` derivation functions while keeping existing callers intact. Candidate responsibilities include start preparing/running/resume/failed snapshots, watchdog waiting-human state, queued rework intent state, and applied rework continuation state.
2. Move watchdog escalation first because its invariant is clearest: append the `HUMAN_QUESTION` transcript envelope with inbox mirroring first, then persist `WAITING_HUMAN`, and preserve the existing recovery error when state write fails after transcript append.
3. Move start/resume derivation next. Preserve `PREPARING_WORKSPACE -> RUNNING`, ideation `round=0`, fresh round-role history append, resume execution-context restart, and failed cleanup behavior. Keep bootstrap, runtime-session authority, tmux launch, remote start routing, and writes in `application/start/**`.
4. Move deferred rework intent last. Unify duplicated next-round continuation behavior between immediate approval rework and pending rework application, while keeping delivery confirmation, identity mutation, persistence, and lifecycle metrics in the application command modules. Limit meta-review cleanup in this step to preserving the existing live-snapshot cleanup that already happens as part of rework continuation; do not expand the task into meta-review gate policy migration.
5. Remove or shrink the old `shared/{state,watchdog,approval}` mutation exports. Keep only stable, genuinely shared value helpers if their semantics are multi-lane and policy-neutral; otherwise move them to the domain owner.
6. Add a fitness warning after the migration establishes the intended shape. The check should catch command lifecycle policy under `shared/**`, not only helpers that still both import `domain/state/machine` and write snapshots. Useful signals include lifecycle-state transition decisions, execution-context continuation, transcript/state ordering, or state persistence orchestration in non-port shared modules.

Main risks and test impact:

- Preserve transcript-first watchdog recovery, including inbox mirroring and the state-write-failed recovery message after a successful append.
- Preserve best-effort notification semantics: delivery/status and UX notifications after successful watchdog escalation must remain non-blocking side effects and must not block protocol/state progression if notification fails.
- Preserve optimistic concurrency guards on state writes, ideation start semantics, resume execution-context restart behavior, rework continuation round history, and the existing live meta-review cleanup tied to rework continuation.
- Add domain unit tests for pure derivation functions, plus application flow coverage for watchdog escalation, start/resume, approval rework, and pending rework application. Before/after state snapshots and transcript envelopes should match existing fixtures for fresh start, ideation start, resume, failed cleanup, watchdog escalation, queued rework intent, and applied pending rework intent.

Recommended first implementation task: move watchdog escalation lifecycle derivation out of `shared/watchdog/watchdogEscalationMutation.ts` into a pure `domain/state` derivation function, and move transcript-first append/write orchestration into `application/watchdog/**`. The task should preserve the emitted `HUMAN_QUESTION` envelope, inbox mirroring, append-before-write ordering, expected state/fingerprint write guards, state-write-failed recovery error, and non-blocking notification behavior.

Acceptance for that first task should require:

- an explicit typed domain derivation boundary with no I/O ports, transcript paths, lock paths, or snapshot write dependencies;
- an application flow test proving transcript append happens before state write and that a state-write failure after append returns the existing recovery error;
- an application flow or focused unit test proving the appended `HUMAN_QUESTION` still mirrors to the inbox path;
- an application flow or focused unit test proving delivery/status and UX notification failures remain best-effort and do not block protocol/state progression after a successful append/write;
- unchanged state write guards for expected fingerprint and expected `RUNNING` state;
- validation with `pnpm typecheck`, `pnpm lint`, `pnpm fitness:check:ci`, and `pnpm build`, because the implementation task moves Pairflow CLI/runtime source under `src/v11/**`.

## Issue: Meta-review submit validation and gate policy are split across shared and domain

**Integration**: `src/v11/shared/metaReview/metaReviewCommandSubmitValidation.ts` + `src/v11/shared/metaReviewGate/metaReviewGateRouteContract.ts` -> `src/v11/domain/metaReviewGate/**` -> `src/v11/application/metaReviewGate/**`  
**Severity**: Significant

### Knowledge Leakage

The meta-review gate has improved since the previous review: `shared/metaReviewGate/index.ts` now mostly publishes route, result, capability, and command contract types rather than broad internal implementation functions. The remaining leakage is subtler. `shared/metaReview/metaReviewCommandSubmitValidation.ts` imports `MetaReviewGateThresholdAuthorityResolution` and `metaReviewGateThresholdIsMet` from `domain/metaReviewGate`, while `shared/metaReviewGate/metaReviewGateRouteContract.ts` re-exports domain gate route types.

That means `shared/metaReview/**` is not only a published-language package. It also enforces approve-threshold behavior and therefore shares [functional coupling](https://coupling.dev/posts/dimensions-of-coupling/integration-strength/) with the gate domain. At the same time, route DTOs and domain route types are interleaved, creating [model coupling](https://coupling.dev/posts/dimensions-of-coupling/integration-strength/) between shared contracts and domain policy.

### Complexity Impact

Meta-review gating is the quality-control core of Pairflow. It is high [volatility](https://coupling.dev/posts/dimensions-of-coupling/volatility/) by design: clean-run thresholds, advisory findings, premature approval prevention, and auto-rework routing are expected to evolve. With submit validation in `shared/metaReview/**`, threshold policy in `domain/metaReviewGate/**`, and route application in `application/metaReviewGate/**`, a change to approval semantics requires holding too many policy locations in working memory.

This is not a catastrophic boundary failure, but it weakens [modular design](https://coupling.dev/posts/core-concepts/modularity/) because the owner of the rule "open-findings approve requires resolved same-run threshold authority" is not obvious from placement.

### Cascading Changes

Changing threshold comparison, findings split interpretation, or approve-gate reason codes can force edits in `shared/metaReview/metaReviewCommandSubmitValidation.ts`, `domain/metaReviewGate/**`, `application/metaReviewGate/internal/**`, route contract exports, and UI/status projections that display gate routes. Given the current [distance](https://coupling.dev/posts/dimensions-of-coupling/distance/) across shared/domain/application boundaries, those changes are more expensive than they need to be.

### Recommended Improvement

Make `domain/metaReviewGate/**` the explicit owner of gate decision policy, including submit approval threshold validation. Let `shared/metaReview/**` own only command payload normalization and stable DTO contracts that do not decide gate routes. If shared consumers need the route vocabulary, expose a narrow published DTO from `shared/metaReviewGate/**` and keep domain-only helper types out of shared re-export paths.

The cost is a small relocation of validation functions and tests. The payoff is cleaner [contract coupling](https://coupling.dev/posts/dimensions-of-coupling/integration-strength/): shared packages describe what crosses the boundary, while domain packages decide what the gate means.

## Issue: The UI timeline contract still retains protocol-shaped intermediate entries

**Integration**: `src/v11/infrastructure/ui/presenters/timelinePresenter.ts` / `src/contracts/ui/uiReadModel.ts` -> `ui/src/lib/contracts/**` and UI contract parity tests  
**Severity**: Minor

### Knowledge Leakage

The browser path now consumes `UiTimelineDisplayItem[]`, and `BubbleTimeline.tsx` is mostly a renderer. That is a healthy move toward [contract coupling](https://coupling.dev/posts/dimensions-of-coupling/integration-strength/). However, `src/contracts/ui/uiReadModel.ts` still exports `UiTimelineEntry`, `UiTimelineEntryDisplay`, and `UiTimelineEntryPayload`, including `ProtocolMessageType`, pass intent, findings claim fields, and meta-review display metadata. `timelinePresenter.ts` still exposes `presentTimelineEntries(envelopes: ProtocolEnvelope[]): UiTimelineEntry[]` for backend tests and parity surfaces.

This is not raw browser dependence on `ProtocolEnvelopePayload` anymore, but it keeps a protocol-shaped model in the public UI contract. That is [model coupling](https://coupling.dev/posts/dimensions-of-coupling/integration-strength/) across a high backend/browser [distance](https://coupling.dev/posts/dimensions-of-coupling/distance/).

### Complexity Impact

The practical risk is lower than before because React renders display items. Still, meta-review timeline behavior is moderately volatile. Keeping intermediate protocol entries public means future developers may add UI behavior against `UiTimelineEntry` instead of the lower-strength display model, recreating the same semantic coupling the current design mostly removed.

### Cascading Changes

Changes to `ProtocolMessageType`, findings-claim fields, or timeline payload normalization can still require updates in `src/contracts/ui/**`, `ui/src/lib/contracts/**`, contract parity tests, presenter tests, and UI fixtures even when the runtime endpoint only needs display items.

### Recommended Improvement

Treat `UiTimelineDisplayItem` as the public browser contract and move `UiTimelineEntry` to a backend-internal presenter type unless an external consumer still needs it. If it must remain temporarily, mark it as backend-presenter-only and add a fitness or contract-transit assertion that browser components and store state cannot depend on it.

The trade-off is fixture and parity cleanup. The benefit is preserving [loose coupling](https://coupling.dev/posts/core-concepts/balance/) at the UI boundary as meta-review display semantics continue to evolve.

## Notes

`pnpm fitness:check:ci` passed during this review. The report showed no hard-fail violations across dependency, application-defaults, shared-defaults, internal-module, critical-side-effect, UI contract, or UI router checks. The only warning was the existing error-context warning in `src/v11/defaults/planWatch/planWatchLoopDefaults.ts`.

---

_This analysis was performed using the [Balanced Coupling](https://coupling.dev) model by [Vlad Khononov](https://vladikk.com)._
