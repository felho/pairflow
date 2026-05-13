# Modularity Review

**Scope**: Full Pairflow repository: `src/v11/**`, `src/cli/**`, `src/contracts/**`, `src/types/**`, `ui/src/**`, `tools/**`, `tests/**`, and architecture documentation  
**Date**: 2026-05-14

## Executive Summary

Pairflow is a local-first orchestration runtime for isolated agent work units called bubbles: it creates workspaces, drives agent CLIs, persists protocol history, and routes lifecycle transitions through review, meta-review, approval, commit, merge, remote execution, and UI gates. The repository is not in a critical modularity state: `pnpm fitness:report` passes every hard-fail architecture check across 884 scoped v11 files and 3455 import edges. The main risks are below the current fitness gates, where volatile workflow meaning is still shared through broad contracts or recomputed in high-distance presenters. The most important finding is that protocol/finding/timeline vocabulary remains the central wide language across domain, application, infrastructure, CLI, tests, and UI projection.

## Coupling Overview

| Integration | [Strength](https://coupling.dev/posts/dimensions-of-coupling/integration-strength/) | [Distance](https://coupling.dev/posts/dimensions-of-coupling/distance/) | [Volatility](https://coupling.dev/posts/dimensions-of-coupling/volatility/) | [Balanced?](https://coupling.dev/posts/core-concepts/balance/) |
| ----------- | ----------------------------------------------------------------------------------- | ----------------------------------------------------------------------- | --------------------------------------------------------------------------- | -------------------------------------------------------------- |
| `contracts/kernel/{protocol,findings}` + `shared/protocol/protocolEnvelopeContract` + `shared/metaReviewGate` -> domain/application/infrastructure/CLI/tests/UI projection | [Model](https://coupling.dev/posts/dimensions-of-coupling/integration-strength/) plus localized [functional](https://coupling.dev/posts/dimensions-of-coupling/integration-strength/) coupling | High: one vocabulary crosses most runtime layers and test surfaces | High: actor protocol, findings parity, reviewer policy, and meta-review routing are core Pairflow workflow concepts | No |
| `infrastructure/ui/presenters/timelineDisplayPresenter` -> `ui/src/components/expanded/BubbleTimeline` via `contracts/ui/uiReadModel` | [Functional](https://coupling.dev/posts/dimensions-of-coupling/integration-strength/) coupling around display policy and workflow semantics | High: backend presenter, browser renderer, UI contracts, and tests | Medium-high: meta-review progress, approval gates, and timeline evidence are active workflow UX surfaces | No |
| `application/start/**` and remote command paths -> filesystem/env/runtime-session/tmux/remote payload details | [Intrusive](https://coupling.dev/posts/dimensions-of-coupling/integration-strength/) plus [functional](https://coupling.dev/posts/dimensions-of-coupling/integration-strength/) coupling | High: command orchestration owns adapter-shaped runtime details | High: start/resume/remote execution are core lifecycle paths | No |
| `application/planWatch/**` -> `shared/planWatchRunner/**` -> `infrastructure/executor/planWatch/codex/**` | [Contract](https://coupling.dev/posts/dimensions-of-coupling/integration-strength/) with some [model](https://coupling.dev/posts/dimensions-of-coupling/integration-strength/) coupling through runner result codes | Medium-high: application orchestration, shared contract, defaults wiring, provider adapter | Medium-high: plan-watch automation is active and likely to evolve | Mostly yes: provider-specific argv/artifacts now live in infrastructure |
| `defaults/ui/routerDefaults` -> application command APIs -> `contracts/ui/**` -> browser app | [Contract](https://coupling.dev/posts/dimensions-of-coupling/integration-strength/) and composition [functional](https://coupling.dev/posts/dimensions-of-coupling/integration-strength/) coupling | High: CLI/UI host, backend command APIs, HTTP router, browser bundle | Medium-high: UI action surface changes with lifecycle and remote flows | Mostly yes: explicit UI contracts and fitness gates contain the distance |
| `domain/metaReviewGate` -> `application/metaReviewGate` + `shared/metaReviewGate` | [Model](https://coupling.dev/posts/dimensions-of-coupling/integration-strength/) coupling through explicit route/result/parity contracts | Medium: one bounded workflow split across pure policy, application, and shared public contracts | High: meta-review gate policy is core and volatile | Mostly yes: high shared knowledge is close enough and has public/internal boundaries |

## Issue: Protocol and findings vocabulary is still the widest volatile model

**Integration**: `src/contracts/kernel/protocol.ts`, `src/contracts/kernel/findings.ts`, `src/v11/shared/protocol/protocolEnvelopeContract.ts`, `src/v11/shared/metaReviewGate/**` -> domain/application/infrastructure/CLI/tests/UI projection  
**Severity**: Significant

### Knowledge Leakage

The repository has improved since older reports: the legacy `src/types/protocol.ts` source file is gone, and `src/contracts/kernel/**` now owns the public protocol/finding literals. The remaining boundary is still broad. `protocolEnvelopeContract.ts` imports protocol participant/message/pass/approval vocabulary, `Finding`, and `FindingsParityMetadata`, then exposes a payload base with summary/question/message/decision/pass intent/findings claim state/findings/metadata for almost every envelope type. A scan for `shared/protocol/protocolEnvelopeContract`, `contracts/kernel/findings`, `contracts/kernel/protocol`, and `FindingsParityMetadata` found 187 source/test files touching this language.

That is high [integration strength](https://coupling.dev/posts/dimensions-of-coupling/integration-strength/) because many modules share one [domain model](https://coupling.dev/posts/dimensions-of-coupling/integration-strength/) instead of smaller published event contracts. It is partly implicit: `ProtocolEnvelopeMetadata extends FindingsParityMetadata` and also allows arbitrary keys, so consumers can depend on metadata meaning that is not visible in the envelope type by message kind.

### Complexity Impact

Changing protocol meaning forces a developer to hold actor emit kinds, transcript envelopes, pass/convergence payloads, findings priority aliases, meta-review parity metadata, approval routing, UI action events, and contract tests in one working set. That pushes the system toward [complexity](https://coupling.dev/posts/core-concepts/complexity/): a change can look like a local field addition but later affect validation, persistence, delivery text, UI timeline projection, and tests.

### Cascading Changes

Likely cascades include adding a new actor output kind, splitting advisory vs blocking findings, changing `findings_claim_source`, changing meta-review parity metadata, or adding a new approval route. The [distance](https://coupling.dev/posts/dimensions-of-coupling/distance/) is high at repository scale because the same vocabulary crosses kernel contracts, v11 domain policy, application command flows, infrastructure transcript/UI presenters, CLI commands, frontend contracts, and tests. The [volatility](https://coupling.dev/posts/dimensions-of-coupling/volatility/) is high because protocol and review semantics are Pairflow's core subdomain.

### Recommended Improvement

Shrink the shared model into narrower [contract coupling](https://coupling.dev/posts/dimensions-of-coupling/integration-strength/) slices:

- Make `ProtocolEnvelopePayloadByType` stricter by removing shared base fields that are invalid for a message kind.
- Move meta-review parity metadata out of generic envelope metadata and into explicit meta-review gate payload/event contracts.
- Separate finding vocabulary into a small kernel value contract plus workflow-specific finding projections for reviewer pass, convergence, and meta-review artifacts.
- Update the dependency fitness exception that still names deleted `src/types/protocol.ts`, so future wide protocol surfaces are reported against their current owners.

The trade-off is a migration across many consumers. The payoff is lower [model coupling](https://coupling.dev/posts/dimensions-of-coupling/integration-strength/) while preserving a single canonical language where the domain genuinely needs one.

## Issue: Timeline display recomputes workflow policy across backend and browser boundaries

**Integration**: `src/v11/infrastructure/ui/presenters/timelineDisplayPresenter.ts` -> `src/contracts/ui/uiReadModel.ts` -> `ui/src/components/expanded/BubbleTimeline.tsx`  
**Severity**: Significant

### Knowledge Leakage

The UI timeline is no longer directly rendering raw transcript payloads, which is good. However, the backend presenter still reads protocol-level metadata keys such as `meta_review_handoff_id`, `delivery_target_role`, `latest_recommendation`, `recommendation`, `consecutive_clean_runs`, and approve-gate failure text. It derives sender roles, badges, meta-review handoff attempts, clean-run progress, gate-failure rows, synthetic approval rows, and tone values. The browser component then applies additional role/icon/tone/blocked rendering decisions from the UI read model.

This is [functional coupling](https://coupling.dev/posts/dimensions-of-coupling/integration-strength/): the display is not just formatting data, it encodes workflow interpretations. The [shared knowledge](https://coupling.dev/posts/dimensions-of-coupling/integration-strength/) is partly hidden in metadata key names and text matching, especially the `"approve-gate validation failed"` classifier.

### Complexity Impact

Timeline rows are operator feedback for lifecycle authority, review evidence, and meta-review confidence. If the backend presenter and browser component disagree about role, tone, progress, or synthetic approval state, the UI can show a plausible but incorrect workflow story. A developer changing meta-review clean-run policy or approval validation must reason about domain state, transcript metadata, backend presentation, UI contracts, React rendering, and tests together.

### Cascading Changes

Changes to meta-review handoff IDs, clean-run source IDs, recommendation wording, gate failure metadata, or approval route naming can cascade from domain/application event producers into `timelineDisplayPresenter.ts`, `uiReadModel.ts`, UI fixtures, `BubbleTimeline`, and UI tests. The [distance](https://coupling.dev/posts/dimensions-of-coupling/distance/) is high because the meaning crosses backend runtime and browser bundle boundaries. The [volatility](https://coupling.dev/posts/dimensions-of-coupling/volatility/) is medium-high because meta-review progress and approval feedback are still active product surfaces.

### Recommended Improvement

Promote timeline semantics into a dedicated published read-model contract:

- Have backend application/infrastructure emit typed timeline semantic events such as `meta_review_clean_run_progress`, `meta_review_handoff_attempt`, `approval_gate_failure`, and `synthetic_meta_review_approval`.
- Keep `timelineDisplayPresenter.ts` as a projection from canonical events to UI DTOs, but remove string matching and metadata-key inference from display classification.
- Keep `BubbleTimeline.tsx` responsible for rendering stable DTO fields only: role, tone, badges, progress, validation failure, and summary text.

This reduces [functional coupling](https://coupling.dev/posts/dimensions-of-coupling/integration-strength/) across the backend/browser [distance](https://coupling.dev/posts/dimensions-of-coupling/distance/). The cost is a slightly richer UI read model, but it makes operator-facing workflow meaning explicit and testable.

## Issue: Start and remote lifecycle orchestration owns adapter-shaped runtime details

**Integration**: `src/v11/application/start/**`, `application/{approval,commit,merge,delete}/internal/remote/**` -> filesystem, environment variables, tmux/session details, and remote control payloads  
**Severity**: Significant

### Knowledge Leakage

The start path receives many ports, but several application files still own low-level runtime facts. `startCommandContext.ts` imports `node:fs/promises`, writes and reads back reviewer policy snapshot files, reads `process.env`, verifies `PAIRFLOW_WORKTREE_ROOT`, and reads remote pointer artifacts. `startCommandFlows.ts` branches directly on `executor.type === "ssh"`, coordinates workspace bootstrap, runtime-session authority, optional bootstrap commands, remote clone inner-start, remote start, tmux launch, and state mutation order. Remote approval/commit/merge/delete paths similarly inspect env-mode context or filesystem authority inside application internals.

This is [intrusive coupling](https://coupling.dev/posts/dimensions-of-coupling/integration-strength/) where application orchestration knows implementation details of filesystem artifact layout, env bootstrap, tmux/runtime sessions, and SSH clone control. It is also [functional coupling](https://coupling.dev/posts/dimensions-of-coupling/integration-strength/) because lifecycle policy and adapter mechanics must evolve together.

### Complexity Impact

Start/resume is a dense lifecycle boundary: it changes state, claims workspace authority, prepares prompts, writes artifacts, launches sessions, and may delegate to remote execution. When the same module owns policy decisions and runtime adapter facts, the outcome of a change is harder to predict. For example, changing reviewer policy snapshot ownership, clone workspace authority, or a remote executor precondition can affect local start, remote inner-start, resume, cleanup, UI status, and tests.

### Cascading Changes

Likely cascades include adding a non-SSH remote executor, changing remote clone control files, moving reviewer policy snapshots, changing runtime session authority, or altering bootstrap command behavior. The [distance](https://coupling.dev/posts/dimensions-of-coupling/distance/) is high because orchestration, artifact IO, environment authority, tmux session launch, remote execution, and state mutation are separate architectural concerns. The [volatility](https://coupling.dev/posts/dimensions-of-coupling/volatility/) is high because lifecycle and remote execution are core runtime capabilities.

### Recommended Improvement

Introduce narrower lifecycle adapter contracts without moving lifecycle policy out of application:

- Extract reviewer policy snapshot persistence behind a reviewer artifact port, leaving application to decide when the snapshot is required.
- Move remote environment/context validation into a `RemoteExecutionContextPort` or infrastructure-owned parser that returns a typed authority result.
- Move remote activation/control-file packaging behind a transport-neutral `RemoteActivationManifestPort`.
- Keep `startCommandFlows.ts` responsible for lifecycle order only: state transition, workspace authority decision, launch request, rollback/cleanup, and result mapping.

This lowers [integration strength](https://coupling.dev/posts/dimensions-of-coupling/integration-strength/) while preserving the low-distance cohesion of the lifecycle use case. The trade-off is more explicit adapter contracts, which is appropriate for a high-[volatility](https://coupling.dev/posts/dimensions-of-coupling/volatility/) core subdomain.

## Issue: Architecture fitness still has stale and under-observing coupling signals

**Integration**: `tools/fitness/**` -> current v11 architecture boundaries and deleted/transitional protocol owners  
**Severity**: Minor

### Knowledge Leakage

The fitness suite is valuable and currently green, but its dependency check still has an exception branch for `src/types/protocol.ts`, a file that no longer exists. That stale rule does not break the build, but it shows that the automated architecture map is not fully synchronized with the current protocol ownership. The same suite catches forbidden import direction, direct mutation ordering, UI contract boundary problems, and complexity budgets; it does not yet report the wide fan-out of current protocol/finding/timeline contracts as a modularity risk.

This is low-severity [model coupling](https://coupling.dev/posts/dimensions-of-coupling/integration-strength/) between architecture policy and historical module names. The code health risk is not the stale string itself; it is that future developers may see all hard gates green and miss the high-distance shared vocabulary described above.

### Complexity Impact

Fitness checks shape behavior. If they encode old owners, they can create accidental blind spots: a migration can remove a legacy file while the report no longer points at the new high-fanout owner. That weakens [modularity](https://coupling.dev/posts/core-concepts/modularity/) governance because the automated feedback no longer fully matches the architecture documents.

### Cascading Changes

Future protocol migrations could move broad vocabulary again without a report-only warning. The [distance](https://coupling.dev/posts/dimensions-of-coupling/distance/) is medium: tools are separate from product runtime, but they govern all v11 changes. The [volatility](https://coupling.dev/posts/dimensions-of-coupling/volatility/) is low-to-medium: fitness policy changes less often than runtime code, but it should track architecture migrations promptly.

### Recommended Improvement

Update the stale `src/types/protocol.ts` exception and add report-only checks for broad shared vocabulary:

- protocol/finding fan-out above a threshold,
- `ProtocolEnvelopeMetadata` fields with open `Record<string, unknown>` semantics,
- timeline presenter dependence on protocol metadata keys or text classifiers.

Keep these as report-only until the team agrees on target boundaries. This uses fitness checks as early warning rather than hard-fail enforcement, which is the right trade-off for a currently green architecture.

---

_This analysis was performed using the [Balanced Coupling](https://coupling.dev) model by [Vlad Khononov](https://vladikk.com)._
