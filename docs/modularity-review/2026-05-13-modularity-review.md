# Modularity Review

**Scope**: Entire Pairflow repository, with emphasis on `src/v11/**`, `src/types/**`, `src/contracts/**`, `src/cli/**`, and architecture docs
**Date**: 2026-05-13

## Executive Summary

Pairflow is a local-first CLI and UI runtime for isolated agent work units called bubbles: it creates workspaces, drives agent CLIs, persists protocol history, and routes lifecycle transitions through review and approval gates. The top-level v11 architecture is materially healthier than the older reviews describe: `pnpm fitness:report` shows all hard-fail architecture checks passing, and the largest application command directories now have internal structure. The remaining modularity risks sit below those hard gates. The most important finding is that the protocol vocabulary and remote/UI execution host boundaries still share volatile lifecycle knowledge across high-distance modules, which makes future protocol, remote execution, and UI action changes more expensive than the layer model suggests.

## Coupling Overview

| Integration | [Strength](https://coupling.dev/posts/dimensions-of-coupling/integration-strength/) | [Distance](https://coupling.dev/posts/dimensions-of-coupling/distance/) | [Volatility](https://coupling.dev/posts/dimensions-of-coupling/volatility/) | [Balanced?](https://coupling.dev/posts/core-concepts/balance/) |
| ----------- | ----------------------------------------------------------------------------------- | ----------------------------------------------------------------------- | --------------------------------------------------------------------------- | -------------------------------------------------------------- |
| `src/v11/**`, `src/cli/**`, tests -> `src/types/protocol.ts` | [Model](https://coupling.dev/posts/dimensions-of-coupling/integration-strength/) plus some [functional](https://coupling.dev/posts/dimensions-of-coupling/integration-strength/) coupling | High: root legacy vocabulary consumed by domain, application, infrastructure, CLI, and tests | High: protocol, actor emit, findings parity, approval, and meta-review routing are core Pairflow workflow concepts | No |
| `application/start/internal/remote` -> local bubble artifact files and remote clone payload layout | [Intrusive](https://coupling.dev/posts/dimensions-of-coupling/integration-strength/) IO detail plus [functional](https://coupling.dev/posts/dimensions-of-coupling/integration-strength/) control-file rules | High: application orchestration reaches filesystem implementation details and remote executor payload shape | High: remote execution is active core runtime work | No |
| `infrastructure/ui/routerDependencies.ts` -> `defaults/ui/routerDefaults.ts` -> many application command APIs | [Functional](https://coupling.dev/posts/dimensions-of-coupling/integration-strength/) composition coupling | High: infrastructure host imports defaults wiring; defaults imports command APIs and translates domain/application models to UI contracts | Medium-high: UI lifecycle actions are expanding with remote execution, approval, delete, review-policy, and attach flows | No |
| `application/metaReviewGate` -> `domain/metaReviewGate` + `shared/metaReviewGate` | [Model](https://coupling.dev/posts/dimensions-of-coupling/integration-strength/) coupling through explicit route/result/contracts | Medium: same bounded workflow split across application/domain/shared | High: meta-review gate policy is core and volatile | Mostly yes: strength is high, but contracts and internal submodules keep the boundary explicit |
| `src/contracts/ui/**` -> browser/UI consumers | [Contract](https://coupling.dev/posts/dimensions-of-coupling/integration-strength/) coupling | High: backend and browser bundles | Medium: UI read/action shapes change, but boundary is explicit and guarded | Yes |

## Issue: Protocol vocabulary still mixes several volatile owners

**Integration**: `src/v11/**`, `src/cli/**`, tests -> `src/types/protocol.ts`
**Severity**: Significant

### Knowledge Leakage

`src/types/protocol.ts` is not just a small protocol DTO. It imports kernel participant/message literals, `MetaReviewRecommendation` from `v11/shared/metaReview`, and findings types, then exports delivery target roles, findings parity metadata, protocol envelopes, meta-review submission payloads, and actor emit input variants. The fan-in is large: an import scan found more than 100 source/test consumers of this file, including `domain/metaReviewGate`, `domain/convergence`, `application/pass`, `application/approval`, `application/metaReviewGate`, `infrastructure/artifact/transcript`, `infrastructure/channel/tmux`, and `src/cli/commands/agent/emit.ts`.

That is high [integration strength](https://coupling.dev/posts/dimensions-of-coupling/integration-strength/) because the file shares a broad [domain model](https://coupling.dev/posts/dimensions-of-coupling/integration-strength/) rather than a narrow published contract. It also creates an ownership inversion: a root `src/types/**` file imports from `src/v11/shared/**`, so older compatibility vocabulary depends on the newer architecture it is supposed to feed.

### Complexity Impact

A developer changing a protocol concern has to know which slice owns the term: kernel protocol, actor emit, findings parity, meta-review submit, delivery targeting, or transcript envelope. These are more than four independent concepts in one working set, so the outcome of a change is harder to predict. For example, adding a new actor output kind or findings parity field can force checks across CLI parsing, domain validation, transcript persistence, tmux delivery targeting, UI projection, and contract tests.

### Cascading Changes

Likely cascade scenarios include adding a protocol message type, changing findings parity metadata, extending approval delivery targeting, or splitting meta-review output. Because `ProtocolEnvelopePayload` contains generic `metadata?: Record<string, unknown> & FindingsParityMetadata`, consumers can silently depend on metadata meaning without a narrower owner. The [distance](https://coupling.dev/posts/dimensions-of-coupling/distance/) is high because the same root file crosses domain, application, infrastructure, CLI, and tests. The [volatility](https://coupling.dev/posts/dimensions-of-coupling/volatility/) is high because protocol and meta-review behavior are core Pairflow workflow capabilities.

### Recommended Improvement

Make `src/types/protocol.ts` an explicit transitional facade with a removal condition, then move each vocabulary slice to one owner:

- Kernel protocol literals and envelope DTOs: `src/contracts/kernel/**` or a dedicated `src/v11/shared/protocol/**` public contract.
- Findings parity metadata: `src/v11/domain/metaReviewGate/**` for policy and `src/v11/shared/metaReviewGate/**` only for exported route/result contracts.
- Actor emit input: `src/v11/application/actorProtocol/**` or a published actor protocol contract.
- Delivery target metadata: `src/v11/shared/delivery/**` or `src/v11/shared/protocol/**`, depending on whether it is transport-neutral or transcript-semantic.

The trade-off is a migration wave touching many imports. The payoff is lower [model coupling](https://coupling.dev/posts/dimensions-of-coupling/integration-strength/) and clearer [modularity](https://coupling.dev/posts/core-concepts/modularity/) for the highest-change workflow vocabulary.

## Issue: Remote start application code owns filesystem and payload layout details

**Integration**: `src/v11/application/start/internal/remote/startCommandRemoteControlFiles.ts` -> local bubble artifact files and remote start control payload
**Severity**: Significant

### Knowledge Leakage

`startCommandRemoteControlFiles.ts` imports `readFile` from `node:fs/promises`, renders `bubble.toml`, and enumerates exact artifact relative paths such as `.pairflow/bubbles/<id>/state.json`, `transcript.ndjson`, `inbox.ndjson`, `artifacts/task.md`, `reviewer-focus.json`, `reviewer-brief.md`, and `doc-contract-gates.json`. This is [intrusive coupling](https://coupling.dev/posts/dimensions-of-coupling/integration-strength/) from application orchestration into filesystem layout and artifact transport details.

The v11 architecture says application code should decide command flow and receive IO through ports. Here, the application layer knows which files are required, which are optional, how to read them, and what remote relative paths the SSH executor should receive.

### Complexity Impact

Remote start is a volatile core runtime path. A developer changing a bubble artifact, reviewer policy snapshot, doc-contract gate artifact, or remote clone layout must reason across start orchestration, artifact persistence, config rendering, SSH upload, and remote inner start semantics. Because the control-file manifest is implicit in application code, changes can appear to be local artifact changes while breaking remote activation.

### Cascading Changes

Adding a new required startup artifact requires changing this application file, tests for remote start, and likely SSH executor behavior. Renaming an artifact path or moving reviewer/doc gate artifacts requires both local artifact producers and remote control-file transfer to change together. A future non-SSH executor would inherit an SSH-shaped control-file contract because `RemoteStartControlFile` is owned by the start command contract rather than a transport-neutral executor payload boundary.

### Recommended Improvement

Introduce a narrow remote activation manifest boundary. Application should request a `RemoteActivationPayload` from a port, or build a pure manifest of artifact roles and let infrastructure resolve/read/upload the files. Keep policy decisions in application: which activation mode is allowed, when to transition state, and how rollback works. Move physical file reads and relative remote payload rendering behind infrastructure or an explicit artifact packaging port.

This reduces [integration strength](https://coupling.dev/posts/dimensions-of-coupling/integration-strength/) without increasing runtime distance. The cost is an extra manifest/port layer, but that is worthwhile because remote execution is a high-[volatility](https://coupling.dev/posts/dimensions-of-coupling/volatility/) core subdomain and likely to gain more executor types.

## Issue: UI router composition is hosted inside infrastructure

**Integration**: `src/v11/infrastructure/ui/routerDependencies.ts` -> `src/v11/defaults/ui/routerDefaults.ts` -> application command APIs
**Severity**: Significant

### Knowledge Leakage

`routerDependencies.ts` dynamically imports `../../defaults/ui/routerDefaults.js` and exposes `defaultUiRouterDependencies`. `routerDefaults.ts` then imports many application APIs (`approval`, `commit`, `delete`, `merge`, `open`, `restart`, `reply`, `resume`, `start`, `status`, `stop`, `inbox`, `list`) and maps application/domain models into UI action contracts. That makes the UI infrastructure package both HTTP/router implementation and composition host.

This is [functional coupling](https://coupling.dev/posts/dimensions-of-coupling/integration-strength/) across a high [distance](https://coupling.dev/posts/dimensions-of-coupling/distance/) boundary: infrastructure is selecting command defaults and carrying UI result projection knowledge. The composition-root doc says future UI hosts may be peer composition roots, but the current file placement names this host as infrastructure, not a peer root.

### Complexity Impact

Adding or changing a UI action requires touching the UI contract, router body parsing/validation, `UiRouterDependencies`, defaults projection, and often application command contracts. Because default dependency resolution is inside infrastructure, it is less obvious whether a UI route change is infrastructure, defaults, application, or composition work. The dynamic import also hides the edge from simple static dependency reasoning.

### Cascading Changes

A new command action expands `UiRouterDependencies`, `routerActionDispatch`, `routerDefaults`, response validation, UI contracts, and frontend API code. A command result shape change can cascade into `routerDefaults.ts` projection helpers such as `projectProtocolEnvelopeToUiActionEvent` and `projectBubbleStateToUiActionState`. Remote execution makes this more volatile because list/status/open/merge/delete/attach actions now carry remote state and continuity details.

### Recommended Improvement

Promote the UI host composition to an explicit peer composition root, for example `src/cli/commands/ui/server.ts` plus a small `src/host/ui/**` or `src/v11/defaults/ui/**` assembly module. Keep `src/v11/infrastructure/ui/**` focused on HTTP routing, request parsing, static assets, event scanning, and presenter adapters. Have the server entrypoint pass a fully assembled `UiRouterDependencies` object into infrastructure.

This does not require decoupling every UI action. The goal is to rebalance by moving composition closer to the authorized composition layer and leaving infrastructure with lower-strength [contract coupling](https://coupling.dev/posts/dimensions-of-coupling/integration-strength/) to `UiRouterDependencies`.

---

_This analysis was performed using the [Balanced Coupling](https://coupling.dev) model by [Vlad Khononov](https://vladikk.com)._
