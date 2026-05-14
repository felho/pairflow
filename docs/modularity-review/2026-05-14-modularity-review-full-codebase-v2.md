# Modularity Review

**Scope**: Full Pairflow repository: `src/**`, `ui/src/**`, `tools/**`, `tests/**`, `scripts/**`, and active architecture documentation  
**Date**: 2026-05-14

## Executive Summary

Pairflow is a local-first orchestration runtime for isolated agent work units called bubbles: it creates workspaces, starts agent sessions, persists protocol history, routes review and meta-review, and exposes runtime state through CLI and UI surfaces. The current codebase is not in a critical modularity state: `pnpm fitness:report` passed every hard-fail architecture check across 890 scoped v11 files and 3480 import edges. The main risk is still in volatile workflow language that is intentionally shared across many layers, plus a few places where command orchestration knows adapter-shaped runtime details. The strongest finding is the protocol/finding vocabulary fan-out: it is now visible through report-only fitness checks, but the underlying [model coupling](https://coupling.dev/posts/dimensions-of-coupling/integration-strength/) remains broad for a core, high-[volatility](https://coupling.dev/posts/dimensions-of-coupling/volatility/) Pairflow subdomain.

## Coupling Overview

| Integration | [Strength](https://coupling.dev/posts/dimensions-of-coupling/integration-strength/) | [Distance](https://coupling.dev/posts/dimensions-of-coupling/distance/) | [Volatility](https://coupling.dev/posts/dimensions-of-coupling/volatility/) | [Balanced?](https://coupling.dev/posts/core-concepts/balance/) |
| ----------- | ----------------------------------------------------------------------------------- | ----------------------------------------------------------------------- | --------------------------------------------------------------------------- | -------------------------------------------------------------- |
| `src/contracts/kernel/{protocol,findings}.ts` + `src/v11/shared/protocol/protocolEnvelopeContract.ts` + `src/v11/shared/metaReviewGate/findingsParityMetadataContract.ts` -> CLI, domain, application, infrastructure, UI contracts, tests | [Model](https://coupling.dev/posts/dimensions-of-coupling/integration-strength/) with localized [functional](https://coupling.dev/posts/dimensions-of-coupling/integration-strength/) coupling | High: one vocabulary crosses most runtime layers and many test surfaces | High: actor protocol, findings, reviewer policy, and meta-review routing are core workflow concepts | No |
| `src/v11/application/start/internal/**` + command-specific remote contexts -> remote execution adapters and env/workspace authority | [Functional](https://coupling.dev/posts/dimensions-of-coupling/integration-strength/) plus residual [intrusive](https://coupling.dev/posts/dimensions-of-coupling/integration-strength/) coupling to env and control-plane details | High: lifecycle orchestration, remote config, SSH activation, git preflight, runtime session state, and state mutation are separate concerns | High: start/remote execution is core runtime behavior | No |
| `src/v11/defaults/planWatch/planWatchLoopDefaults.ts` -> plan-watch application ledger, linked trigger index, status command API, file locking, and agent runner defaults | Mixed [functional](https://coupling.dev/posts/dimensions-of-coupling/integration-strength/) and implementation coupling | Medium-high: defaults composition spans application read models, local filesystem, status orchestration, and runner infrastructure | Medium-high: plan-watch automation is active and likely to evolve | Partly |
| `src/v11/infrastructure/ui/presenters/timelineDisplayPresenter.ts` -> `src/contracts/ui/uiReadModel.ts` -> `ui/src/components/expanded/BubbleTimeline.tsx` | Mostly [contract](https://coupling.dev/posts/dimensions-of-coupling/integration-strength/) coupling, with residual [functional](https://coupling.dev/posts/dimensions-of-coupling/integration-strength/) inference in the presenter | High: backend presenter and browser bundle are separate surfaces | Medium: operator display changes with workflow semantics, but it is not the protocol authority | Mostly, with hardening |
| `src/v11/application/planWatch/runner/**` -> `src/v11/shared/planWatchRunner/**` -> `src/v11/infrastructure/executor/planWatch/codex/**` | [Contract](https://coupling.dev/posts/dimensions-of-coupling/integration-strength/) coupling with backend-specific result vocabulary | Medium-high: application policy, shared runner DTOs, and provider adapter are separated | Medium-high: runner backend and output schema can evolve | Mostly |
| `src/contracts/ui/**` -> `ui/src/lib/contracts/**` / `@pairflow/ui-contracts` -> React components | [Contract](https://coupling.dev/posts/dimensions-of-coupling/integration-strength/) coupling | High: backend package boundary to browser UI | Medium-high: UI action/read-model surface tracks lifecycle features | Yes |

## Issue: Protocol and findings vocabulary is still the widest volatile model

**Integration**: `src/contracts/kernel/protocol.ts`, `src/contracts/kernel/findings.ts`, `src/v11/shared/protocol/protocolEnvelopeContract.ts`, `src/v11/shared/metaReviewGate/findingsParityMetadataContract.ts` -> CLI/domain/application/infrastructure/UI/tests  
**Severity**: Significant

### Knowledge Leakage

The protocol vocabulary is cleaner than in earlier architecture states: message types and finding literals now have explicit kernel owners, `ProtocolEnvelopePayloadByType` is split by message kind, and `tools/fitness/checks/protocol-vocabulary-drift.ts` blocks some known drift patterns. The remaining issue is fan-out. `pnpm fitness:report` reported `src/v11/shared/protocol/protocolEnvelopeContract.ts` with 104 importers, `src/contracts/kernel/findings.ts` with 66 importers, `src/contracts/kernel/protocol.ts` with 58 importers, and `findingsParityMetadataContract.ts` with 37 importers.

That is broad [shared knowledge](https://coupling.dev/posts/dimensions-of-coupling/integration-strength/) across high-[distance](https://coupling.dev/posts/dimensions-of-coupling/distance/) repository surfaces. The `ProtocolEnvelopeMetadata` type is still an open metadata bag, and meta-review findings parity appears both as explicit payload fields for approval messages and as a shared concept consumed across gate, submit, UI projection, and tests. This is not accidental chaos; it is a real language for the core workflow. The imbalance comes from the amount of model knowledge every consumer can see.

### Complexity Impact

A change to protocol meaning can look local but requires a developer to reason about actor emit parsing, transcript persistence, reviewer findings, meta-review parity, approval routing, UI read-model projection, CLI output, and fixtures. That increases [complexity](https://coupling.dev/posts/core-concepts/complexity/) because the outcome of a field or vocabulary change may not be predictable from the owning file alone.

The current report-only checks help by making the fan-out visible, but visibility is not the same as lower [integration strength](https://coupling.dev/posts/dimensions-of-coupling/integration-strength/). The model remains wide enough that future workflow changes can still cascade across many components.

### Cascading Changes

Likely cascades include adding a new actor output type, changing finding severity/timing/layer semantics, splitting reviewer findings from meta-review findings, changing `findings_claim_source`, or making approval parity stricter. Each one can affect `src/cli/commands/agent/**`, `src/v11/application/{pass,converged,approval,metaReview,metaReviewGate}/**`, transcript infrastructure, UI contracts, and tests.

### Recommended Improvement

Continue the narrowing already started by the protocol fitness checks:

- Keep `ProtocolEnvelopePayloadByType`, but make message-specific payload contracts the only place for structured facts; reserve `ProtocolEnvelopeMetadata` for non-authoritative diagnostics.
- Split finding contracts into a small kernel value object and workflow-specific projections for reviewer pass, convergence, meta-review result, and approval decision.
- Add report-only import fan-out thresholds by workflow slice, not only by source file, so a future change can show whether the protocol surface is becoming smaller or merely moving.
- Promote typed event contracts for meta-review parity and approval gate facts instead of allowing consumers to infer them from generic envelope metadata.

The trade-off is a staged migration across many tests and consumers. The payoff is lower [model coupling](https://coupling.dev/posts/dimensions-of-coupling/integration-strength/) without losing the canonical workflow language that Pairflow needs.

## Issue: Remote lifecycle orchestration still knows adapter-shaped authority details

**Integration**: `src/v11/application/start/internal/**`, `src/v11/application/remote/remoteExecutionContextEnv.ts`, and command-specific remote execution contexts -> remote adapters, env vars, workspace authority, git preflight, state/session persistence  
**Severity**: Significant

### Knowledge Leakage

The start path is much better modularized than a flat command would be, but application-level code still knows low-level remote runtime facts. `startCommandContext.ts` resolves remote clone start context from env and verifies remote pointer authority. `startCommandFlows.ts` branches on `bubbleConfig.executor?.type === "ssh"` and chooses between local fresh start, remote outer start, and remote inner start. `startCommandRemoteExecutionSupport.ts` knows SSH executor shape, global remote config fields, remote pointer states, remote clone path construction, and local git preflight. `remoteExecutionContextEnv.ts` reads `process.env` and canonicalizes workspace roots, while approval/commit/merge/delete each define command-specific remote mode env vars.

This is partly [functional coupling](https://coupling.dev/posts/dimensions-of-coupling/integration-strength/) because lifecycle policy and remote execution requirements must evolve together. It also has residual [intrusive coupling](https://coupling.dev/posts/dimensions-of-coupling/integration-strength/) because application code directly names environment variables, workspace roots, pointer artifacts, and SSH-only execution facts.

### Complexity Impact

Remote start sits on a high-[distance](https://coupling.dev/posts/dimensions-of-coupling/distance/) boundary: command orchestration, git, filesystem artifacts, runtime sessions, tmux launch, SSH activation, state transitions, and remote cache reconciliation all participate. When the application layer owns both lifecycle order and adapter authority details, a change to remote execution can have non-obvious consequences for local start, remote inner start, resume, status, cleanup, and UI remote state.

Because start/remote execution is a core Pairflow workflow, the [volatility](https://coupling.dev/posts/dimensions-of-coupling/volatility/) is high. The current design is therefore unbalanced under the [balance rule](https://coupling.dev/posts/core-concepts/balance/): high strength, high distance, high volatility.

### Cascading Changes

Adding a non-SSH remote executor, changing remote clone control files, changing command-specific remote env vars, changing workspace authority validation, or making remote start resumable beyond `CREATED` can cascade across start orchestration, remote support helpers, command-specific remote contexts, remote pointer artifacts, status projections, and tests.

### Recommended Improvement

Keep lifecycle ordering in application, but reduce the adapter knowledge it must hold:

- Introduce a transport-neutral `RemoteExecutionAuthorityPort` that returns typed authority results for start/approval/commit/merge/delete instead of each command reading mode/workspace env details.
- Move SSH-specific target resolution, clone path construction, git preflight, and pointer-host validation behind a remote activation preparation port.
- Treat command-specific env var names as infrastructure/defaults configuration, not application policy.
- Keep `startCommandFlows.ts` focused on lifecycle sequencing: transition to preparing, bootstrap/activate workspace, launch session, transition to running, rollback on failure.

The cost is more explicit remote contracts. That cost is appropriate because remote execution is a volatile core subdomain, and explicit [contract coupling](https://coupling.dev/posts/dimensions-of-coupling/integration-strength/) is the right counterweight to high distance.

## Issue: Plan-watch defaults mix composition, local persistence, status projection, and runner wiring

**Integration**: `src/v11/defaults/planWatch/planWatchLoopDefaults.ts` -> plan-watch application APIs, status command API, file ledger, file locks, and runner defaults  
**Severity**: Significant

### Knowledge Leakage

`planWatchLoopDefaults.ts` is a defaults/composition file, but it also owns file-backed ledger persistence, lock timing, JSON read/write/rename behavior, local status projection through `getBubbleStatus`, status dependency defaults, linked trigger index defaults, and agent runner defaults. It imports application modules (`linkedBubbleTriggerIndex`, `ledger`, `statusCommandApi`), infrastructure (`fileLock`), defaults (`statusCommandDependencyDefaults`, `agentRunnerBridgeDefaults`), and Node filesystem APIs in one file.

The coupling is not a forbidden import violation; the fitness suite allows defaults to compose application contracts and concrete adapters. The problem is [low cohesion](https://coupling.dev/posts/core-concepts/balance/) inside one defaults module. Ledger persistence, bubble status projection, and runner selection are different reasons to change.

### Complexity Impact

Plan-watch is an automation lane that reacts to plan/task metadata and routes continuation work. When defaults composition also owns local persistence behavior and status read-model translation, changing one part requires understanding several unrelated responsibilities at once. That can make outcomes less predictable even though the import direction is legal.

The [distance](https://coupling.dev/posts/dimensions-of-coupling/distance/) is medium-high because the file connects application orchestration, status orchestration, infrastructure locking, filesystem persistence, and runner invocation. The [integration strength](https://coupling.dev/posts/dimensions-of-coupling/integration-strength/) is mixed: some dependencies are explicit contracts, but the concrete file-ledger and status projection knowledge is implementation-specific.

### Cascading Changes

Changes to ledger schema, contention semantics, status metadata, remote execution summary projection, or runner backend selection can all land in the same defaults file. That can cascade into plan-watch loop behavior, linked trigger indexing, status command dependencies, and runner execution tests.

### Recommended Improvement

Split the defaults module by capability while preserving the existing public factory:

- Move file ledger persistence into a narrow infrastructure adapter such as `infrastructure/artifact/planWatchLedger/**` or `infrastructure/executor/planWatch/ledger/**`.
- Move `localBubbleStatusPort` into a small defaults/status bridge module with an explicit `LinkedBubbleStatusPort` boundary.
- Keep `createDefaultPlanWatchLoopDependencies(repoPath)` as a thin composition function that imports those adapters.
- Keep the shared runner DTOs in `src/v11/shared/planWatchRunner/**`; they are currently a reasonable [contract coupling](https://coupling.dev/posts/dimensions-of-coupling/integration-strength/) boundary.

The trade-off is more files. The benefit is clearer ownership: each future change has a narrower place to land, and defaults stays a catalog rather than a mixed implementation module.

## Issue: Timeline display still infers workflow meaning from generic metadata

**Integration**: `src/v11/infrastructure/ui/presenters/timelineDisplayPresenter.ts` -> `src/contracts/ui/uiReadModel.ts` -> `ui/src/components/expanded/BubbleTimeline.tsx`  
**Severity**: Minor

### Knowledge Leakage

The browser side is in good shape compared with raw transcript rendering: `BubbleTimeline.tsx` consumes stable UI DTO fields like `UiTimelineDisplayItem`, badges, tones, roles, progress, and tags. The remaining leakage is concentrated in the backend presenter. `timelineDisplayPresenter.ts` still interprets generic metadata keys such as `actor`, `actor_agent`, `meta_review_handoff_id`, `delivery_target_role`, `latest_recommendation`, `recommendation`, `clean_run_source_id`, `progress_source_id`, `approval_gate_failure`, and `consecutive_clean_runs`.

That is residual [functional coupling](https://coupling.dev/posts/dimensions-of-coupling/integration-strength/): workflow semantics and display semantics are connected through metadata conventions. The coupling is lower than if React parsed raw protocol payloads, but it is still implicit.

### Complexity Impact

Timeline rows are operator feedback for lifecycle authority and review confidence. If meta-review routing or approval validation changes, the developer must check the domain policy, transcript payloads, presenter inference, UI contract, and UI tests. The [distance](https://coupling.dev/posts/dimensions-of-coupling/distance/) remains high because backend projection and browser rendering are separate surfaces, but the [integration strength](https://coupling.dev/posts/dimensions-of-coupling/integration-strength/) is now partly controlled by the UI read model.

### Cascading Changes

Changes to meta-review handoff ID format, clean-run source IDs, recommendation vocabulary, approval gate failure metadata, or delivery target roles can cascade into the presenter, UI contracts, fixtures, and timeline tests. The volatility is medium because this is product-facing workflow feedback, not the authoritative protocol state machine itself.

### Recommended Improvement

Keep the inference out of React, but make the presenter inputs more explicit when these concepts next change:

- Replace generic metadata checks with typed timeline marker fields for meta-review handoff, clean-run progress, approval gate failure, and synthetic meta-review approval rows.
- Preserve the current `UiTimelineDisplayItem` contract as the browser boundary; enrich the backend input contract rather than moving logic into `BubbleTimeline.tsx`.
- Add a report-only fitness check for timeline presenter reads of protocol metadata keys if the metadata convention grows further.

This lowers [functional coupling](https://coupling.dev/posts/dimensions-of-coupling/integration-strength/) incrementally without turning a minor display issue into a broad UI refactor.

## Issue: Protocol fitness now observes fan-out, but cast sites remain a known migration queue

**Integration**: `tools/fitness/checks/protocol-vocabulary-drift.ts` -> protocol envelope contracts and test/application cast sites  
**Severity**: Minor

### Knowledge Leakage

The fitness suite now includes `protocol_vocabulary_drift`, `protocol_envelope_cast_inventory`, and `protocol_surface_fanout_inventory`. That is a meaningful improvement over a purely manual architecture review: broad protocol surfaces and `ProtocolEnvelope<T>` casts are visible in the report. The remaining report-only inventory found 9 cast sites, including one application site in `src/v11/application/converged/internal/gate/convergedGateDelivery.ts` and several test helpers.

These casts are a form of local [model coupling](https://coupling.dev/posts/dimensions-of-coupling/integration-strength/) to the protocol envelope shape. Most are test-side and tolerable, but the application cast is worth keeping visible until the envelope construction path proves type-safe without assertion.

### Complexity Impact

Cast sites weaken the guarantee that message-kind-specific payload contracts are doing all the work. If a future protocol payload changes, TypeScript may not force every cast site to update. The [complexity](https://coupling.dev/posts/core-concepts/complexity/) impact is currently contained because the check is explicit and report-only, but it is still a migration queue.

### Cascading Changes

Changes to `ProtocolEnvelopePayloadByType`, convergence delivery, or meta-review gate test fixtures can require updates to the cast inventory. The [volatility](https://coupling.dev/posts/dimensions-of-coupling/volatility/) is tied to protocol evolution, so this should stay visible while the protocol contracts are still being narrowed.

### Recommended Improvement

Keep the cast inventory report-only for now, but burn it down opportunistically:

- Replace the application cast with a typed envelope builder that accepts `ProtocolMessageType` and returns the matching `ProtocolEnvelope<TType>`.
- Move repeated test casts into a single test helper so test fixtures do not normalize unsafe construction patterns.
- Once production casts reach zero, consider hard-failing new production `ProtocolEnvelope<T>` casts while leaving tests report-only.

This is not urgent enough to block feature work, but it supports the larger protocol narrowing effort.

---

_This analysis was performed using the [Balanced Coupling](https://coupling.dev) model by [Vlad Khononov](https://vladikk.com)._
