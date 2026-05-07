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
