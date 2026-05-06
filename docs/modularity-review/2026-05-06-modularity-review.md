# Modularity Review

**Scope**: Entire Pairflow repository (`src/**`, `ui/**`, `docs/**`, `.claude/skills/**`)  
**Date**: 2026-05-06

## Executive Summary

Pairflow is a local-first CLI and UI orchestrator for isolated agent work units called bubbles: it creates git worktrees, runs real agent CLIs through tmux/process boundaries, persists protocol history, and gates lifecycle transitions through deterministic state and review policies. Overall [modularity](https://coupling.dev/posts/core-concepts/modularity/) is better than the previous review: the plan-watch `application -> defaults` inversion is gone, UI timeline payloads are no longer the raw protocol payload, and meta-review gate policy has started moving into `domain/metaReviewGate/**`. The most important remaining issue is that `shared/metaReviewGate/**` still exports implementation-heavy `internal/**` functions through its public index, so a volatile core gate remains too easy to consume as a broad shared API. The next risks are plain `shared/*Defaults.ts` modules that hide runtime wiring behind shared facades, and UI timeline rendering that still reconstructs meta-review protocol behavior in the browser.

## Coupling Overview

| Integration | [Strength](https://coupling.dev/posts/dimensions-of-coupling/integration-strength/) | [Distance](https://coupling.dev/posts/dimensions-of-coupling/distance/) | [Volatility](https://coupling.dev/posts/dimensions-of-coupling/volatility/) | [Balanced?](https://coupling.dev/posts/core-concepts/balance/) |
| ----------- | ----------------------------------------------------------------------------------- | ----------------------------------------------------------------------- | --------------------------------------------------------------------------- | -------------------------------------------------------------- |
| `shared/metaReviewGate/index.ts` -> `shared/metaReviewGate/internal/**` -> domain/application consumers | [Functional](https://coupling.dev/posts/dimensions-of-coupling/integration-strength/) + [model](https://coupling.dev/posts/dimensions-of-coupling/integration-strength/) | Medium-high (public shared package boundary) | High (core quality gate and active product policy) | **No** |
| `application/**` -> `shared/*Defaults.ts` -> `defaults/**` / infrastructure implementations | [Functional](https://coupling.dev/posts/dimensions-of-coupling/integration-strength/) wrapper coupling | Medium (shared contract vs runtime composition boundary) | Medium-high (runtime, state, transcript, status surfaces change with commands) | **No** |
| `ui/src/components/expanded/BubbleTimeline.tsx` -> meta-review/protocol timeline semantics | [Functional](https://coupling.dev/posts/dimensions-of-coupling/integration-strength/) + light [model](https://coupling.dev/posts/dimensions-of-coupling/integration-strength/) | High (browser package vs backend presenter/protocol boundary) | Medium-high (meta-review display behavior is evolving) | **No** |
| `src/contracts/ui/**` -> `ui/src/lib/contracts/**` | [Contract](https://coupling.dev/posts/dimensions-of-coupling/integration-strength/) | High | Medium | **Yes** |
| `application/planWatch/**` -> `defaults/planWatch/**` | [Contract](https://coupling.dev/posts/dimensions-of-coupling/integration-strength/) after dependency injection | Medium | High | **Yes** |
| `application/**` -> `shared/ports/**` -> `infrastructure/**` | [Contract](https://coupling.dev/posts/dimensions-of-coupling/integration-strength/) | High | Mixed | **Yes** |
| `src/v11/domain/metaReviewGate/**` -> pure meta-review gate policies | High [cohesion](https://coupling.dev/posts/core-concepts/balance/) within one domain module | Low | High | **Yes** |
| `pnpm fitness:check:ci` architecture checks -> `src/v11/**` | [Contract](https://coupling.dev/posts/dimensions-of-coupling/integration-strength/) policy enforcement | Medium | Medium | **Yes**, with blind spots noted below |

## Issue: `shared/metaReviewGate` still publishes internal gate implementation details

**Integration**: `src/v11/shared/metaReviewGate/index.ts` -> `src/v11/shared/metaReviewGate/internal/**` -> `src/v11/shared/metaReview/**`, `src/v11/defaults/metaReviewGate/**`, and `src/v11/application/metaReviewGate/**`  
**Severity**: Significant

### Knowledge Leakage

`src/v11/shared/metaReviewGate/index.ts` re-exports functions from `internal/**`, including threshold authority, findings parity input, findings artifact parity, findings metadata, reviewer snapshot lookup, and runtime tmux capability resolution. The `internal/` directory convention protects direct imports, and `pnpm fitness:check:ci` confirms no external `/internal/` import violations, but the public index still turns implementation files into a broad public surface.

That is high [integration strength](https://coupling.dev/posts/dimensions-of-coupling/integration-strength/) across a `shared` boundary. Consumers no longer need to know the file path under `internal`, but they still share knowledge of the gate's current-run threshold rules, artifact parity mechanics, reviewer snapshot selection, and tmux delivery capability shape. The coupling is explicit, yet it is explicit at the wrong abstraction level: public `shared` exports are mixing stable published language with implementation policy and runtime support.

### Complexity Impact

Meta-review gating is a [core subdomain](https://coupling.dev/posts/dimensions-of-coupling/volatility/) for Pairflow because it protects the product's quality-first differentiator. In this area, [volatility](https://coupling.dev/posts/dimensions-of-coupling/volatility/) is expected from business evolution, not only from commit churn. When the public surface contains implementation functions, a developer changing clean-run thresholds, approve-validation routing, or findings parity has to reason about `shared/metaReviewGate/internal/**`, `domain/metaReviewGate/**`, `shared/metaReview/**`, `application/metaReviewGate/**`, and `defaults/metaReviewGate/**` at the same time.

This raises [complexity](https://coupling.dev/posts/core-concepts/complexity/) because the likely change surface is not obvious from the module boundary. The system has an `internal/` privacy marker, but the public barrel partially cancels its cognitive benefit.

### Cascading Changes

A change to threshold authority can cascade through `shared/metaReview/metaReviewCommandSubmitValidation.ts`, `shared/metaReview/metaReviewCommandSubmitRouting.ts`, current-run finalization, defaults wrappers, and UI timeline projections. A change to findings artifact parity can affect meta-review submit validation, convergence gate routing, approval request generation, and tests that exercise reviewer or meta-review evidence.

The [distance](https://coupling.dev/posts/dimensions-of-coupling/distance/) is medium-high at repository scale because callers cross a shared bounded-context boundary. The [balance rule](https://coupling.dev/posts/core-concepts/balance/) flags this as unbalanced: strong shared knowledge plus non-local consumers in a volatile area.

### Recommended Improvement

Keep only stable published language in `shared/metaReviewGate/index.ts`: route/result contracts, narrow capability types, and DTOs whose meaning is intentionally shared. Move pure threshold, parity, approval-summary, and reviewer-snapshot policy to `domain/metaReviewGate/**` and export those from a domain-owned public surface only when cross-domain use is intentional. Move current-run orchestration and runtime delivery composition to `application/metaReviewGate/**` or `defaults/metaReviewGate/**`, with callers depending on explicit [contract coupling](https://coupling.dev/posts/dimensions-of-coupling/integration-strength/) rather than implementation helpers.

The trade-off is some call-site migration and public API cleanup. The benefit is that the `internal/` convention starts carrying real design weight: external consumers cannot accidentally depend on gate implementation details just because the index re-exported them.

## Issue: Plain `shared/*Defaults` modules hide runtime wiring behind shared facades

**Integration**: `src/v11/application/**` -> `src/v11/shared/{state,transcript,process,bubbleLookup,status,...}/*Defaults.ts` -> `src/v11/defaults/**`  
**Severity**: Significant

### Knowledge Leakage

Several plain `shared` modules are named and shaped as defaults adapters: `shared/transcript/transcriptDependencyDefaults.ts`, `shared/state/stateStoreDefaults.ts`, `shared/process/processSpawnDefaults.ts`, `shared/bubbleLookup/bubbleLookupDefaults.ts`, `shared/status/statusCommandDependencyDefaults.ts`, and similar reviewer/repo/metrics helpers. Some are direct re-exports, while others are 1:1 forwarding wrappers from a `shared` name to `defaults/**` implementations.

This leaks runtime composition knowledge into the shared layer. The ports governance document says ports should describe capabilities, while infrastructure/defaults own implementations. These modules instead create [functional coupling](https://coupling.dev/posts/dimensions-of-coupling/integration-strength/) between application use cases and default runtime wiring through a shared facade. The facade reduces import-path violations, but it does not always reduce shared knowledge.

### Complexity Impact

The architecture fitness report is clean, including dependency, application defaults boundary, ports, and UI router checks. That is good evidence that hard-fail guardrails are working. The modularity risk is subtler: when application code imports `shared/state/stateStoreDefaults.ts`, the reader must know whether this is a stable shared contract, a port implementation, a temporary bridge, or a composition shortcut.

This increases [socio-technical distance](https://coupling.dev/posts/dimensions-of-coupling/distance/) between the visible module name and the real owner. For state, transcript, process spawn, status, bubble lookup, and reviewer artifacts, implementation changes are likely to happen as lifecycle commands evolve. Because those command surfaces are volatile, the wrapper pattern can make change outcomes less predictable than the clean fitness result suggests.

### Cascading Changes

Changing a state store option, transcript append result, bubble lookup behavior, or status remote-read behavior can cascade from `defaults/**` into `shared/*Defaults.ts` wrappers and then into application modules that imported the wrapper as if it were shared meaning. The risk is especially visible in command APIs that assemble dependencies from multiple `shared/*Defaults.ts` modules instead of receiving a dependency bundle at the composition boundary.

### Recommended Improvement

Classify each `shared/*Defaults.ts` file into one of three outcomes. If it is a true capability boundary, move the type to `shared/ports/**` and keep the implementation in `defaults/**` or `infrastructure/**`. If it is runtime composition, move the wrapper under `defaults/<capability>/**` and have CLI/default entrypoints pass it into application functions. If it is a temporary migration bridge, label it with the intended owner and removal condition.

This does not mean removing all convenience defaults at once. Start with the highest-fanout primitives: transcript, state, process spawn, and bubble lookup. The trade-off is slightly more explicit wiring in command entrypoints; the payoff is that [contract coupling](https://coupling.dev/posts/dimensions-of-coupling/integration-strength/) becomes visible and defaults stop masquerading as shared domain meaning.

## Issue: UI timeline still reconstructs meta-review protocol behavior in the browser

**Integration**: `src/v11/infrastructure/ui/presenters/timelineDisplayPresenter.ts` / `src/contracts/ui/uiReadModel.ts` -> `ui/src/components/expanded/BubbleTimeline.tsx`  
**Severity**: Significant

### Knowledge Leakage

The previous raw payload leakage has materially improved: `UiTimelineEntryPayload` now contains a UI-specific subset instead of directly exposing `ProtocolEnvelopePayload`. However, the browser timeline still reads `entry.type === "TASK"` and `entry.type === "CONVERGENCE"`, checks `entry.display.rowKind`, tracks meta-review handoff attempts, synthesizes approval rows, and recalculates clean-run progress in `buildTimelineItems`. Meanwhile, `timelineDisplayPresenter.ts` still uses protocol metadata such as `delivery_target_role`, `meta_review_handoff_id`, recommendation fields, and finding claim state to create display fields.

This is [functional coupling](https://coupling.dev/posts/dimensions-of-coupling/integration-strength/) across a high [distance](https://coupling.dev/posts/dimensions-of-coupling/distance/) boundary. The backend presenter and browser component share knowledge of the same meta-review timeline rules. The explicit UI contract helps, but it is not yet a complete published display language.

### Complexity Impact

When meta-review timeline behavior changes, the developer must inspect protocol envelope semantics, backend display presenter logic, UI read-model types, and React timeline sequencing. The browser is not merely rendering rows; it is interpreting lifecycle meaning. This weakens [modularity](https://coupling.dev/posts/core-concepts/modularity/) because the changed part is not obvious: a clean-run display bug might belong in the protocol presenter, the contract, the React component, or tests.

### Cascading Changes

Changes to meta-review clean-run policy, handoff retry display, approve-validation failure display, or convergence row semantics can require edits in both `timelineDisplayPresenter.ts` and `BubbleTimeline.tsx`. UI tests also need to know enough about protocol-shaped event ordering to exercise the display behavior. That is tolerable for low-volatility display polish, but meta-review routing and quality-gate feedback are still evolving.

### Recommended Improvement

Make the backend presenter return a fully rendered timeline display model. Move `buildTimelineItems`, synthetic approval-row creation, clean-run replacement, and protocol-message interpretation out of `BubbleTimeline.tsx` and into the presenter or a shared UI-display DTO builder owned by the backend contract. The browser should render `UiTimelineDisplayItem[]` with fields such as `role`, `senderLabel`, `badges`, `cleanRunTag`, `gateFailed`, `summaryText`, and `timestamp`.

The trade-off is a slightly richer UI DTO and presenter test surface. The benefit is a lower [integration strength](https://coupling.dev/posts/dimensions-of-coupling/integration-strength/) browser boundary: protocol and meta-review semantics change in one backend-owned facade, while React stays coupled to stable display data.

## Resolved Since 2026-05-05

The 2026-05-05 review's highest-priority items have moved forward:

- `application/planWatch/**` no longer imports `defaults/planWatch/**`; `runExecutePairflowPlanContinuation` now requires explicit config and dependencies, and `pnpm fitness:check:ci` reports zero `application_defaults_boundary` violations.
- `UiTimelineEntryPayload` is now UI-specific and sanitizes findings, decisions, pass intent, and summary fields before crossing to the browser. Raw `ProtocolEnvelopePayload` is still used inside backend presenters, but not as the exported UI payload.
- `metaReviewGate` has a real `domain/metaReviewGate/**` policy layer and an `application/metaReviewGate/**` command layer. This is a good direction; the remaining problem is the public `shared/metaReviewGate` API width, not absence of domain extraction.
- The architecture fitness posture is strong: the 2026-05-06 run scanned 997 `src/v11/**` files, found 3078 import edges, and reported no hard-fail dependency, application-defaults, internal-module, side-effect, UI contract, or UI router violations.

## Summary of Recommendations

1. Narrow `shared/metaReviewGate/index.ts` so it publishes stable contracts only; stop re-exporting implementation-heavy `internal/**` functions.
2. Triage `shared/*Defaults.ts` modules into ports, defaults-owned composition, or explicitly temporary bridges.
3. Move meta-review timeline sequencing and synthetic row behavior behind a backend-owned UI display DTO.
4. Keep the current fitness checks, but add report-only radar for `shared` modules that import `defaults/**` or re-export `internal/**`.

---

_This analysis was performed using the [Balanced Coupling](https://coupling.dev) model by [Vlad Khononov](https://vladikk.com)._
