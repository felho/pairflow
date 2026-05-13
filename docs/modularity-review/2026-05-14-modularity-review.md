# Modularity Review

**Scope**: Entire Pairflow repository, with emphasis on `src/v11/**`, `src/contracts/**`, `src/types/**`, `src/cli/**`, `ui/src/**`, and architecture/fitness documentation  
**Date**: 2026-05-14

## Executive Summary

Pairflow is a local-first orchestration runtime for isolated agent work units called bubbles: it creates workspaces, drives agent CLIs, persists protocol history, and routes lifecycle transitions through review, meta-review, approval, commit, and merge gates. The current v11 layer model is materially healthier than earlier snapshots: `pnpm fitness:report` passes all hard-fail architecture checks, `src/types/protocol.ts` has been removed, and UI router defaults are now passed into infrastructure instead of dynamically imported there. The remaining modularity risk is below the hard gates: several volatile workflow concepts still share broad models or duplicated functional rules across high-distance modules. The most important finding is that protocol envelope/finding vocabulary still acts as a wide shared language across domain, application, infrastructure, CLI, tests, and UI projection.

## Coupling Overview

| Integration | [Strength](https://coupling.dev/posts/dimensions-of-coupling/integration-strength/) | [Distance](https://coupling.dev/posts/dimensions-of-coupling/distance/) | [Volatility](https://coupling.dev/posts/dimensions-of-coupling/volatility/) | [Balanced?](https://coupling.dev/posts/core-concepts/balance/) |
| ----------- | ----------------------------------------------------------------------------------- | ----------------------------------------------------------------------- | --------------------------------------------------------------------------- | -------------------------------------------------------------- |
| `contracts/kernel/protocol` + `shared/protocol/protocolEnvelopeContract` + `types/findings` -> domain/application/infrastructure/CLI/tests/UI projection | [Model](https://coupling.dev/posts/dimensions-of-coupling/integration-strength/) plus some [functional](https://coupling.dev/posts/dimensions-of-coupling/integration-strength/) coupling | High: one protocol/finding language crosses most v11 layers and test surfaces | High: actor protocol, findings parity, reviewer policy, and meta-review routing are core Pairflow workflow concepts | No |
| `application/planWatch/runner/**` -> Codex process contract + runner artifact filesystem layout | [Intrusive](https://coupling.dev/posts/dimensions-of-coupling/integration-strength/) and [functional](https://coupling.dev/posts/dimensions-of-coupling/integration-strength/) coupling | High: application orchestration contains concrete FS/process/provider adapter details | Medium-high: plan-watch automation is pilot/core workflow infrastructure and likely to evolve | No |
| `shared/role/prompts/rolePromptConcerns.ts` -> `infrastructure/channel/tmux/tmuxDeliveryMessageBuilder.ts` | [Functional](https://coupling.dev/posts/dimensions-of-coupling/integration-strength/) coupling through duplicated prompt and handoff policy | High: startup/resume prompt assembly and runtime pane delivery are separate runtime paths | High: docs-only scope, PASS evidence, canonical emit, and reviewer/meta-review guidance change often | No |
| `defaults/ui/routerDefaults.ts` -> application command APIs -> `contracts/ui/**` | [Contract](https://coupling.dev/posts/dimensions-of-coupling/integration-strength/) with localized projection helpers | Medium-high: UI host/defaults/application/browser boundary | Medium-high: UI action surface changes with lifecycle/remote flows | Mostly yes: composition still broad, but the router now receives defaults explicitly |
| `application/metaReviewGate` -> `domain/metaReviewGate` + `shared/metaReviewGate` | [Model](https://coupling.dev/posts/dimensions-of-coupling/integration-strength/) through explicit route/result/parity contracts | Medium: one bounded workflow split across application/domain/shared | High: meta-review gate policy is core and volatile | Mostly yes: high shared knowledge is close enough and guarded by public/internal module boundaries |

## Issue: Protocol and findings vocabulary is still too broad

**Integration**: `src/contracts/kernel/protocol.ts`, `src/v11/shared/protocol/protocolEnvelopeContract.ts`, `src/types/findings.ts` -> domain/application/infrastructure/CLI/tests/UI projection  
**Severity**: Significant

### Knowledge Leakage

The legacy `src/types/protocol.ts` facade is gone, which is a clear improvement. The remaining protocol language is still broad: `protocolEnvelopeContract.ts` imports kernel participant/message/pass/approval literals, findings parity metadata from `shared/metaReviewGate`, and `Finding` from `src/types/findings.ts`. Import scans found 84 source/test files importing `shared/protocol/protocolEnvelopeContract` and 66 importing `types/findings`.

That is high [integration strength](https://coupling.dev/posts/dimensions-of-coupling/integration-strength/) because the envelope shares a broad [domain model](https://coupling.dev/posts/dimensions-of-coupling/integration-strength/) instead of a narrow published event contract. The `payload.metadata?: Record<string, unknown> & FindingsParityMetadata` shape also leaves some shared knowledge implicit: consumers can attach or inspect typed parity fields while the envelope still advertises an open metadata bag.

### Complexity Impact

Protocol changes require a developer to reason about more than one bounded concern at once: actor participants, message types, PASS intent, reviewer findings, meta-review findings parity, transcript persistence, tmux delivery, approval UI projection, and tests. This exceeds the small working set that supports predictable change. In [complexity](https://coupling.dev/posts/core-concepts/complexity/) terms, adding a new protocol or findings parity field can look local but cascade into CLI parsing, domain validation, transcript storage, delivery text, UI action events, and contract tests.

### Cascading Changes

Likely cascades include adding a new actor output kind, changing findings severity/priority semantics, adding a meta-review parity field, or splitting approval request metadata. The [distance](https://coupling.dev/posts/dimensions-of-coupling/distance/) is high because the same vocabulary crosses domain, application, infrastructure, CLI, UI projection, and tests. The [volatility](https://coupling.dev/posts/dimensions-of-coupling/volatility/) is high because Pairflow's core subdomain is the workflow protocol itself: review, convergence, meta-review, and approval semantics are still actively changing.

### Recommended Improvement

Keep the current split from `src/types/protocol.ts`, but continue shrinking the shared model into narrower [integration contracts](https://coupling.dev/posts/dimensions-of-coupling/integration-strength/):

- Make `ProtocolEnvelopePayload` a discriminated union by message type, so `PASS`, `APPROVAL_REQUEST`, `APPROVAL_DECISION`, and `CONVERGENCE` expose only their own payload fields.
- Move findings parity metadata out of the generic envelope metadata bag into a dedicated meta-review gate event payload or explicit `ProtocolEnvelopeMetadata` contract.
- Give `src/types/findings.ts` an ownership decision similar to protocol: either a deliberate public kernel/shared contract, or a shrinking transitional type facade.
- Update the fitness rule that still references deleted `src/types/protocol.ts` so the new wide protocol/finding surfaces remain visible.

The trade-off is a migration across many call sites. The payoff is lower [model coupling](https://coupling.dev/posts/dimensions-of-coupling/integration-strength/) while preserving one canonical protocol language where it is actually needed.

## Issue: Plan-watch runner adapter logic lives in application

**Integration**: `src/v11/application/planWatch/runner/**` -> Codex CLI invocation, structured output schema, JSONL stream parsing, and `.pairflow/runtime/plan-watch/agent-runner/**` artifacts  
**Severity**: Significant

### Knowledge Leakage

`application/planWatch/runner/codexAgentRunnerBridge.ts` builds Codex-specific argv including `--dangerously-bypass-approvals-and-sandbox`, `exec`, `--json`, `--cd`, and `--output-schema`. `codexAgentRunnerArtifacts.ts` directly imports `node:fs/promises`, creates `.pairflow/runtime/plan-watch/agent-runner/...`, writes `structured-output.schema.json`, `metadata.json`, `events.ndjson`, and `timeline.ndjson`, and handles artifact directory cleanup. `codexAgentRunnerBridgeResult.ts` reads and writes event/timeline files and classifies Codex JSONL output.

This is [intrusive coupling](https://coupling.dev/posts/dimensions-of-coupling/integration-strength/) from an application command module into provider-specific process and filesystem implementation details. It also creates [functional coupling](https://coupling.dev/posts/dimensions-of-coupling/integration-strength/) between plan-watch orchestration and the exact Codex runner protocol.

### Complexity Impact

The v11 architecture says `application/**` should own command orchestration and receive I/O through ports. Here, the application lane owns route detection, dedupe/ledger coordination, runner provider selection, provider-specific command shape, artifact storage layout, and JSONL normalization. A change to Codex output, artifact retention, timeout behavior, or future runner provider now requires understanding both plan-watch domain behavior and concrete process/file adapter mechanics.

### Cascading Changes

Adding a second runner backend, changing the structured output schema, moving runner artifacts, or replacing Codex JSONL parsing would touch application runner files, loop execution, ledger records, tests, and potentially docs. The [distance](https://coupling.dev/posts/dimensions-of-coupling/distance/) is high at the v11 layer level because concrete executor/storage concerns are embedded inside a command lane rather than behind `ports/**` and `infrastructure/**`. The [volatility](https://coupling.dev/posts/dimensions-of-coupling/volatility/) is medium-high: plan-watch is documented as a pilot automation path, so provider and evidence behavior are likely to change.

### Recommended Improvement

Split plan-watch into a small application orchestration boundary plus infrastructure adapters:

- Keep trigger selection, dedupe policy, ledger state transitions, and result classification in `application/planWatch`.
- Move Codex argv construction, artifact directory creation, JSONL stream file handling, and process-output normalization behind a `PlanWatchRunnerPort`.
- Put concrete Codex runner implementation under `infrastructure/executor/planWatch/codex/**` or a similarly narrow capability path.
- Keep the runner's structured output schema as a contract owned by the port or a dedicated `shared/planWatchRunner/**` contract, not as hidden provider implementation inside application.

This lowers [integration strength](https://coupling.dev/posts/dimensions-of-coupling/integration-strength/) across the application/infrastructure [distance](https://coupling.dev/posts/dimensions-of-coupling/distance/) without decomposing the plan-watch command itself.

## Issue: Runtime delivery text duplicates startup prompt policy

**Integration**: `src/v11/shared/role/prompts/rolePromptConcerns.ts` -> `src/v11/infrastructure/channel/tmux/tmuxDeliveryMessageBuilder.ts`  
**Severity**: Significant

### Knowledge Leakage

Startup/resume prompt policy and runtime pane-delivery policy both encode the same workflow rules: canonical actor emit, PASS evidence refs, docs-only skip-claim behavior, primary artifact refinement, reviewer severity reminders, reviewer policy snapshots, and meta-review submit templates. The shared prompt catalog exposes reusable builders, but `tmuxDeliveryMessageBuilder.ts` still has local copies of the implementer validation guidance and long docs-only action text. A text search shows the same concepts, including "Docs-only scope", "Primary artifact rule", and PASS validation guidance, in both files.

This is [functional coupling](https://coupling.dev/posts/dimensions-of-coupling/integration-strength/): two distant modules must change together when the operational workflow changes, even when there is no explicit shared contract saying which guidance variants are authoritative.

### Complexity Impact

Prompt and delivery text are not cosmetic in Pairflow; they are part of the runtime control surface for human/agent behavior. If docs-only scope rules, evidence packaging, reviewer command gates, or canonical emit instructions change in one path but not the other, the same bubble can start with one policy and later receive pane delivery with another. That creates unpredictable outcomes and weakens [modularity](https://coupling.dev/posts/core-concepts/modularity/) because developers must remember both startup/resume and runtime delivery text paths.

### Cascading Changes

Changes likely to cascade include altering docs-only guardrails, PASS evidence requirements, reviewer routing thresholds, meta-review submit syntax, or command profile guidance. The [distance](https://coupling.dev/posts/dimensions-of-coupling/distance/) is high because one owner is shared prompt policy while the other is tmux infrastructure delivery. The [volatility](https://coupling.dev/posts/dimensions-of-coupling/volatility/) is high because these rules track active Pairflow workflow semantics and review governance.

### Recommended Improvement

Extract a transport-neutral `RoleActionGuidance` or `WorkflowInstructionPolicy` module that returns structured guidance parts for `(role, phase/event, reviewArtifactType, validation policy, reviewer policy)`.

`rolePromptConcerns.ts` should use it for startup/resume prompts, and `tmuxDeliveryMessageBuilder.ts` should use the same contract for runtime delivery action text. Tmux-specific code should keep only transport formatting: message header, pane reference, workspace hint, and delivery recipient. The trade-off is introducing a small policy module, but it removes duplicated [functional coupling](https://coupling.dev/posts/dimensions-of-coupling/integration-strength/) in a volatile control surface.

---

_This analysis was performed using the [Balanced Coupling](https://coupling.dev) model by [Vlad Khononov](https://vladikk.com)._
