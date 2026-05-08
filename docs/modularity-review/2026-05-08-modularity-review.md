# Modularity Review

**Scope**: Entire Pairflow repository (`src/**`, `ui/**`, `tools/fitness/**`, `docs/architecture/**`)
**Date**: 2026-05-08

This review supersedes [`2026-05-07-modularity-review.md`](./2026-05-07-modularity-review.md) and its [follow-up](./2026-05-07-modularity-review-followup.md). The three issues from the prior review (shared mutation helpers owning lifecycle policy, meta-review submit validation split across shared/domain, UI timeline contract retaining protocol-shaped entries) and the follow-up's god-type module (`src/types/bubble.ts`) have been substantially or fully resolved over ~37 commits in the past 24 hours. The remaining imbalances are smaller in surface area but concentrated in [high-volatility](https://coupling.dev/posts/dimensions-of-coupling/volatility/) command and contract paths, so they continue to dominate change cost on lifecycle and remote-execution feature work.

## Executive Summary

Pairflow's `src/v11/**` layered architecture passes every hard-fail fitness check (`boundary`, `mutation`, `transition`, `error`, `complexity`, `dependency`, `application_defaults_boundary`, `shared_defaults_boundary`, `internal_module_boundary`, `critical_side_effect`, `ui_contract_boundary`, `ui_router_port_boundary`, `contract_timeout_policy`). The recently extracted [domain](https://coupling.dev/posts/related-topics/domain-driven-design/) split — `domain/state/{startState,watchdogEscalation,reworkIntent,roundContinuation}.ts`, `domain/agentIdentity/`, `domain/pass/**` — is the right shape and is genuinely owning what `shared/**` previously owned. Three remaining integrations are still imbalanced: the parallel string-literal contract redeclaration between backend [domain](https://coupling.dev/posts/related-topics/domain-driven-design/) types and `src/contracts/ui/**`, the absence of an explicit `internal/` sub-boundary inside the largest application command directories (`start/` 32, `kickoff/` 46, `pass/` 42, `askHuman/` 30) even though the convention exists and is already used by `application/metaReviewGate/internal`, and the single surviving dynamic-import-with-path-helper at `application/open/openBubbleDefaults.ts` reaching into `infrastructure/`.

## Coupling Overview

| Integration | [Strength](https://coupling.dev/posts/dimensions-of-coupling/integration-strength/) | [Distance](https://coupling.dev/posts/dimensions-of-coupling/distance/) | [Volatility](https://coupling.dev/posts/dimensions-of-coupling/volatility/) | [Balanced?](https://coupling.dev/posts/core-concepts/balance/) |
| ----------- | ----------------------------------------------------------------------------------- | ----------------------------------------------------------------------- | --------------------------------------------------------------------------- | -------------------------------------------------------------- |
| `domain/agentIdentity/**` + `src/types/protocol.ts` + `src/v11/shared/state/**` -> `src/contracts/ui/{uiActions,uiReadModel,bubbleLifecycle}.ts` redeclared string-literal unions -> `ui/src/lib/contracts/**` -> React components | [Model](https://coupling.dev/posts/dimensions-of-coupling/integration-strength/) (parallel string-literal unions enforced by parity test) | High backend/browser process boundary | High — meta-review states, executor types, protocol message types still evolving | **No** |
| Sibling files inside `application/<command>/**` (`kickoff/` 46, `pass/` 42, `start/` 32, `askHuman/` 30, `planWatch/` 21, `converged/` 21, `approval/` 20) without declared `internal/` sub-boundary | [Functional](https://coupling.dev/posts/dimensions-of-coupling/integration-strength/) (one command's flow split across many files) | Same directory, very low distance | High (commands evolve continuously) | **Partially** — formula-balanced, but [low cohesion](https://coupling.dev/posts/core-concepts/balance/) at directory level |
| `src/v11/application/open/openBubbleDefaults.ts` -> `infrastructure/artifact/bubble/remoteExecutionArtifacts.js` via path-helper dynamic import | [Functional](https://coupling.dev/posts/dimensions-of-coupling/integration-strength/) (real call hidden behind path-helper) | Static distance is artificial: AST scanner cannot follow `import(getModulePath())`; runtime distance is zero | Medium — remote pointer reads will keep evolving | **No** |
| `src/v11/shared/state/**` -> `src/v11/domain/state/**` | [Contract](https://coupling.dev/posts/dimensions-of-coupling/integration-strength/) | Medium-high cross-layer | High lifecycle policy | **Yes** — shared/state is now schema/types only; mutation lives in domain/state |
| `src/v11/application/**` -> `src/v11/ports/**` -> `src/v11/infrastructure/**` (29 ports, top consumer counts: stateSnapshots 64, transcript 42, bubbleLookup 34, tmuxDelivery 31, runtimeSessions 29) | [Contract](https://coupling.dev/posts/dimensions-of-coupling/integration-strength/) | High (intentional) | Mixed | **Yes** |
| `tools/fitness/**` -> `src/v11/**` policy enforcement | [Contract](https://coupling.dev/posts/dimensions-of-coupling/integration-strength/) policy enforcement | Medium | Medium | **Yes** |

## Issue: UI contract parallel string-literal unions still mirror domain types across the process boundary

**Integration**: `src/v11/domain/agentIdentity/agentIdentity.ts` (`AgentName`, `AgentRole`) + `src/types/protocol.ts` (`ProtocolMessageType`) + `src/v11/shared/state/**` (`BubbleLifecycleState`, execution-context fields) -> `src/contracts/ui/uiActions.ts` (`UiActionAgentName`, `UiActionAgentRole`, `UiActionProtocolMessageType`, `UiActionApprovalDecision`, `UiActionPassIntent`, `UiActionBubbleState`) + `src/contracts/ui/bubbleLifecycle.ts` (`BubbleLifecycleState`) + `src/contracts/ui/uiReadModel.ts` (470 LOC of read-model DTOs) -> `ui/src/lib/contracts/**` -> React components and Zustand store
**Severity**: Significant
**Status update 2026-05-08**: Resolved in the current checkout by introducing `src/contracts/kernel/**` as the browser-safe source of truth for agent identity, lifecycle, and protocol vocabulary. The migration intentionally avoided compatibility re-export bridges: call sites that consume vocabulary now import the kernel directly, while domain modules retain only domain behavior.

### Knowledge Leakage

`src/contracts/ui/uiActions.ts` (340 LOC) declares five parallel string-literal unions whose members must stay aligned with the canonical domain vocabulary:

```ts
export type UiActionAgentName = "codex" | "claude";
export type UiActionAgentRole = "implementer" | "reviewer" | "meta_reviewer";
export type UiActionProtocolMessageType =
  | "TASK" | "PASS" | "HUMAN_QUESTION" | "HUMAN_REPLY"
  | "CONVERGENCE" | "APPROVAL_REQUEST" | "APPROVAL_DECISION"
  | "COMMIT_RESULT";
export type UiActionApprovalDecision = "approve" | "rework";
export type UiActionPassIntent = "task" | "review" | "fix_request";
```

`src/contracts/ui/bubbleLifecycle.ts` redeclares the lifecycle state union; `src/contracts/ui/uiReadModel.ts` redeclares meta-review run statuses, attention codes, validation failure shapes, and many bubble summary fields as parallel browser-safe DTOs. The canonical owners are `src/v11/domain/agentIdentity/agentIdentity.ts` for agent vocabulary, `src/types/protocol.ts` for protocol message types, the `domain/state/lifecycleTypes.ts` + `shared/state/**` cluster for lifecycle, and `domain/pass/**` + `shared/metaReview/**` for review-side fields.

The redeclaration is intentional for backend/browser bundle isolation, and `tests/contracts/uiContractTransitSource.test.ts` enforces text-level parity. Even so, this is [model coupling](https://coupling.dev/posts/dimensions-of-coupling/integration-strength/) across the highest-distance boundary in the system: a separate process, a separate language toolchain (Vite + React), and a separate build artifact. The parity test confirms the model is shared rather than only its public DTO shape.

With the `src/types/bubble.ts` god module gone, the previous follow-up review's two-sided coupling (domain types + UI contract redeclaration) becomes one-sided: the canonical owners are now scattered across `domain/`, `shared/`, and `src/types/protocol.ts`, but the UI contract still maintains a single redeclaration cluster pointing at all of them.

### Complexity Impact

The areas this redeclaration covers — meta-review states, executor types, lifecycle states, protocol message types, approval decisions — are exactly the [core subdomain](https://coupling.dev/posts/dimensions-of-coupling/volatility/) where Pairflow's competitive product changes happen. Sampling recent feature plans (`plans/archive/`):

- adding a meta-review state field requires synchronized edits in `shared/state/stateSchemaMetaReview*.ts`, `shared/metaReview/metaReviewSnapshot.ts`, `src/contracts/ui/uiReadModel.ts`, the parity test, the read-model projection, the SSH status payload, and the UI presenter chain
- changing `UiActionApprovalDecision` semantics or adding a third value forces lockstep edits in `domain/state/**`, `application/approval/**`, `src/contracts/ui/uiActions.ts`, the React store, and the parity test
- introducing a new protocol message type requires `src/types/protocol.ts`, `src/contracts/ui/uiActions.ts`, parity test, presenter, and renderer changes

The [balance rule](https://coupling.dev/posts/core-concepts/balance/) — `STRENGTH XOR DISTANCE OR NOT VOLATILITY` — is satisfied only when volatility is low. It is not. Every backend rename or extension of these unions ripples through the contract surface, and the parity test catches drift but does not reduce coupling — it only converts a runtime mismatch into a static one.

### Cascading Changes

`src/contracts/ui/uiActions.ts` is 340 LOC, `uiReadModel.ts` is 470 LOC, and the contracts/ui/ index re-exports 175 named DTOs. `tests/contracts/uiContractTransitSource.test.ts` reads the source files and enforces structural parity at the AST level. A change to a single literal in `domain/agentIdentity/agentIdentity.ts` therefore cascades to: the corresponding line in `uiActions.ts`, the parity test fixture, the React component or store consumer, and any downstream presenter that switches on the value.

### Recommended Improvement

The current shape is the conservative fix to the prior god-module problem; pushing further requires making the parallel redeclaration unnecessary rather than only correct. Two complementary moves:

1. **Promote the canonical literal unions into a shared kernel that both backend and browser can import without pulling runtime IO.** The pieces already exist: `domain/agentIdentity/agentIdentity.ts` is browser-safe (no IO), `src/types/protocol.ts` is browser-safe, `shared/state/lifecycleTypes.ts` is browser-safe. Expose a narrow `src/contracts/kernel/**` (or reuse `src/v11/domain/**` via a tsconfig path that the UI bundle is allowed to import for types-only) that owns the literal vocabulary. `src/contracts/ui/**` then imports the canonical types instead of redeclaring them, keeping only DTO shapes and request/response interfaces specific to the HTTP surface. The parity test becomes redundant for redeclared unions and can shrink to checking that contract files do not import runtime-IO modules.

2. **Apply the [Temporary Adapter Rule](../architecture/v11-placement-and-extraction-governance.md) to the existing `Ui*` redeclarations**: mark each one as a temporary bridge with a removal condition (canonical type adopted in `src/contracts/kernel/**`), so the eventual deletion is mechanical and the parity test does not entrench a permanent duplicate vocabulary.

The trade-off is one tsconfig path edit plus a contract migration cycle. The benefit is that future state, role, executor, and protocol additions become single-site changes rather than coordinated edits across five files. This also removes the implicit governance gap noted in the previous follow-up: the canonical owners now live in `v11/**` under explicit governance, so promoting them to the contract surface keeps the [source-of-truth rule](../architecture/v11-placement-and-extraction-governance.md) applying to types as well as logic.

If a full kernel split is too large for one cycle, the smaller intermediate step is to gate the redeclaration: enforce via fitness check that any `Ui*` literal union in `src/contracts/ui/**` whose member set matches a canonical domain type must include a `// canonical: src/v11/domain/...` comment, and have the parity test fail when the comment's target is missing or stale. That keeps the cost of drift visible without requiring the full refactor first.

## Issue: Largest application command directories still lack an explicit `internal/` sub-boundary even though the convention is already in use

**Integration**: Sibling files inside one command directory — `application/kickoff/` 46 files, `application/pass/` 42 files, `application/start/` 32 files, `application/askHuman/` 30 files, `application/planWatch/` 21 files, `application/converged/` 21 files, `application/approval/` 20 files — none of which declare an `internal/` sub-boundary, while `application/metaReviewGate/internal/` already exists and demonstrates the pattern
**Severity**: Significant

### Knowledge Leakage

The prior follow-up review identified that the `complexity` fitness check's per-file budget pressures application commands into many small siblings rather than fewer cohesive sub-boundaries. The intervening 24 hours produced real progress (`kickoff` 62 -> 46, `pass` 48 -> 42, `start` 34 -> 32, `converged` 23 -> 21, several "Inline ..." commits) but the directory-level shape is the same: each command holds its full workflow as a flat sibling list, and only `application/metaReviewGate/` has adopted the [v11-internal-module-boundaries](../architecture/v11-internal-module-boundaries.md) convention.

`application/start/**` is the clearest current example. Its 32 files mix four genuinely different sub-concerns:

- prompt construction (`startCommandImplementerPrompts.ts`, `startCommandPrompts.ts`, `startCommandPromptRuntime.ts`, `startCommandResumeImplementerPrompt.ts`, `startCommandResumeKickoffMessageBuilders.ts`, `startCommandResumeKickoffMessages.ts`, `startCommandResumePromptShared.ts`, `startCommandResumePrompts.ts`, `startCommandResumeSummary.ts`, `startCommandWorkspacePromptLines.ts`)
- runtime/session/tmux launch (`startCommandRuntime.ts`, `startCommandSession.ts`, `startCommandTmuxLaunch.ts`, `startCommandLaunchWorkspace.ts`)
- remote execution (`startCommandRemoteControlFiles.ts`, `startCommandRemoteExecution.ts`, `startCommandRemoteExecutionContext.ts`, `startCommandRemoteExecutionFlow.ts`, `startCommandRemoteExecutionSupport.ts`)
- command orchestration shell (`startCommandApi.ts`, `startCommandContext.ts`, `startCommandContract.ts`, `startCommandFlows.ts`, `startCommandOrchestration.ts`, `startCommandErrorNormalization.ts`, `startCommandCleanup.ts`, `startCommandResumeFlowPreparation.ts`, `startStatePersistence.ts`, `startBubbleDependencyDefaults.ts`, `startCommandDefaults.ts`, `startCommandDependencyDefaults.ts`, `emitStartV11.ts`)

The strength among files inside each cluster is [functional coupling](https://coupling.dev/posts/dimensions-of-coupling/integration-strength/) — they share command-local types, error codes, and a single workflow. The strength across clusters is much lower: prompt files do not need to know about tmux launch internals, and remote execution flow files do not need to know about prompt assembly. Without an `internal/` boundary, both kinds of dependencies are equally easy to write, and helpers from one concern leak into another over time.

### Complexity Impact

By the [balance rule](https://coupling.dev/posts/core-concepts/balance/), `STRENGTH XOR DISTANCE OR NOT VOLATILITY` is satisfied because everything is in the same directory and distance is minimal. But the rule's [low strength + low distance](https://coupling.dev/posts/core-concepts/balance/) failure mode applies in reverse: high strength + low distance + many siblings + high volatility is the directory-level shape that produces a [big ball of mud](https://coupling.dev/posts/core-concepts/balance/) at change time. A developer adding a new resume prompt has to scan all 32 files to know whether the prompt belongs in `Resume*Prompts.ts`, `Resume*ImplementerPrompt.ts`, or `Resume*KickoffMessages.ts`, and which existing helper to extend.

The prior follow-up review's volatility evidence still applies. Recent feature plans repeatedly target 13 - 21 sibling files per phase in `application/<command>/**` and `shared/<command>/**`. The 24-hour progress is encouraging but mostly mechanical (inline a single-use helper, remove a re-export bridge); it does not change the shape of the directory.

### Cascading Changes

`application/metaReviewGate/internal/` is the existing proof point. It moved from a flat sibling list into an explicit `internal/` sub-boundary; the prior reviews' Issue #2 (gate policy split across shared/domain/application) was resolvable in part because the `internal/` convention provided a place for moved-in pieces to land. The same applies to `start/` (prompt vs runtime vs remote execution vs orchestration), `kickoff/` (mutation pipeline vs validation vs rollback vs eligibility), and `pass/` (auto-converge vs normal pass vs reviewer delivery vs verification).

A change to a remote execution flow today touches `startCommandRemoteExecution.ts`, `startCommandRemoteExecutionContext.ts`, `startCommandRemoteExecutionFlow.ts`, and `startCommandRemoteExecutionSupport.ts` simultaneously, plus its `application/start/` siblings that hold workflow constants and prompt strings the remote flow re-reads. With an `internal/remote/` sub-boundary, the same change scopes to the named directory and the public surface (`startCommandApi.ts` or `emitStartV11.ts`) rather than to the entire 32-file directory.

### Recommended Improvement

Apply the existing [v11-internal-module-boundaries](../architecture/v11-internal-module-boundaries.md) convention to the four largest application command directories, in volatility order:

1. **`application/start/**` -> introduce `internal/{prompts, runtime, remote}/`** with `startCommandApi.ts` + `emitStartV11.ts` + `startCommandOrchestration.ts` as the public surface. The three sub-boundaries already exist as naming clusters; the move is mostly mechanical.
2. **`application/kickoff/**` -> introduce `internal/{mutation, validation, rollback, eligibility}/`** with `runKickoffFlow.ts` + `emitKickoffV11.ts` + `kickoffCliCommand.ts` as the public surface. The naming clusters (`kickoffMutation*`, `kickoffValidat*`, `kickoffMutationRollback*`, `kickoffEligibility*`) already encode the boundary.
3. **`application/pass/**` -> introduce `internal/{autoConverge, normalPass, reviewerDelivery, verification}/`** with `passCommandOrchestration.ts` + `passCommandContract.ts` as the public surface.
4. **`application/askHuman/**` -> introduce `internal/{notification, delivery, mutation}/`** with `askHumanCommandApi.ts` as the public surface.

Pair the migration with a directory-cohesion extension to `tools/fitness/checks/complexity.ts`: when an `application/<command>/**` directory exceeds N flat siblings (initial proposal 20), require the directory to either declare a public surface plus `internal/` sub-boundary or split into named subdirectories. The existing `internal_module_boundary` check already enforces the boundary semantics; the new metric only forces opt-in once size crosses the threshold.

The trade-off is one mechanical move-and-rename per command, with the public surface explicitly named. The benefit is that the prior reviews' lifecycle and meta-review consolidation work has a place to land — moving derivation pieces from `shared/state/**` into `application/<command>/internal/mutation/` becomes a localized refactor rather than another large flat-sibling addition. It also unblocks the long-standing tension between the 500-line file budget and command cohesion: with an explicit boundary, raising the per-file budget for `application/**/*` files to 800 - 1000 lines is safe because the directory size constraint takes over.

This issue is the directory-level analog of what the prior follow-up review described, narrowed to specific commands and to the boundary convention that already exists in the codebase. It is the single strategic action that would compound: every future command grows under a known boundary, and every prior review's recommendation lands more cheaply.

## Issue: `application/open/openBubbleDefaults.ts` is the last surviving dynamic-import path-helper bypass

**Integration**: `src/v11/application/open/openBubbleDefaults.ts` -> `src/v11/infrastructure/artifact/bubble/remoteExecutionArtifacts.js` via `function getRemoteExecutionArtifactsModulePath(): string { return [...].join("/") }` followed by `await import(getRemoteExecutionArtifactsModulePath())`
**Severity**: Minor

### Knowledge Leakage

The prior follow-up review documented 42 sites using the dynamic-import-with-path-helper shape to bypass `application_defaults_boundary` and `shared_defaults_boundary` fitness checks. As of 2026-05-08, that count is down to **3 sites**, of which:

- `src/v11/defaults/commit/commitCommandDefaults.ts` (3 helpers) and `src/v11/defaults/status/statusCommandDependencyDefaults.ts` (6 helpers) live inside `defaults/**`, where cross-defaults wiring is allowed; these are not architectural violations.
- `src/v11/application/open/openBubbleDefaults.ts` (1 helper) remains in `application/**` and dynamically loads `infrastructure/artifact/bubble/remoteExecutionArtifacts.js`. This is the last surviving instance of the pattern that the architecture model forbids: `application/ ✗→ infrastructure/`.

The runtime call graph contains exactly the edge the policy was designed to prevent; the static graph passes because the path string is hidden behind a function and the AST scanner only follows literal-string `import(...)` arguments. The migration documented in the prior follow-up is essentially complete; this one file did not get the same treatment.

### Complexity Impact

The cost is small in absolute terms — one file, one helper — but it is the last instance of a pattern the architecture explicitly rejects. Leaving it permits the pattern to seed again: a future remote-execution feature can copy this file as a template, and the count grows back. The fitness checker still does not flag the shape, so the regression would not be visible.

### Cascading Changes

`readRemotePointer` from `infrastructure/artifact/bubble/remoteExecutionArtifacts.ts` is also consumed by other application commands (`list`, `status`, `commit`); they take it as a port-typed dependency through the existing `BubbleRemotePointer` contract surface in `shared/remote/**`. The `open` command alone reaches infrastructure dynamically. Removing the helper means either threading the port through `openBubble`'s dependency object the way the other commands do, or moving the wiring into `defaults/open/` if `open` does not yet have a defaults bundle.

### Recommended Improvement

Two-step fix:

1. **Migrate the consumer**: declare `readRemotePointer` as a port-typed field on `OpenBubbleDependencies` (or its existing equivalent), and pass it through from `src/cli/commands/bubble/open.ts` (composition root) using `defaults/open/...Defaults.ts`. This mirrors the pattern that `application/list/listReadModelApi.ts`, `application/status/**`, and `application/commit/**` already use through `shared/ports/stateSnapshots.ts` and related ports.
2. **Harden the fitness checker**: extend `tools/fitness/checks/shared-defaults-boundary.ts` and `tools/fitness/checks/application-defaults-boundary.ts` so that an `import(call())` whose argument is a function call returning a string-literal-typed value is reported as `import-target-unresolved`. A targeted regression test should fail today on `openBubbleDefaults.ts` and pass once the migration in step 1 lands. The two `defaults/**`-internal helpers are inside the layer that owns composition, so the check can scope itself to imports whose call-site is in `application/**` or `shared/**`.

The trade-off is roughly half a day of consumer-side wiring plus a ~30-line check extension. The benefit is that the prior follow-up's recommendation reaches completion: the architecture model regains predictive power, and the workaround pattern cannot reappear without an explicit, reviewable exception.

## Notes

- `pnpm fitness:check:ci` was run during this review; all 13 hard-fail checks passed (`boundary`, `mutation`, `transition`, `error`, `complexity`, `contract_timeout_policy`, `dependency`, `application_defaults_boundary`, `internal_module_boundary`, `shared_defaults_boundary`, `critical_side_effect`, `ui_contract_boundary`, `ui_router_port_boundary`).
- The 2026-05-07 review's three issues plus the follow-up's first two issues account for most of the recent commit log. The remaining work is concentrated on directory-level cohesion (Issue 2) and on closing the last static-graph bypass (Issue 3); Issue 1 is the longest-leverage future-facing item because it touches every cross-process feature change.
- `shared/reviewer/**` (16 files), `shared/metaReview/**` (16 files), `shared/state/**` (15 files), and `shared/gates/**` (12 files) are the next-largest shared clusters. None of them currently fail the [balance rule](https://coupling.dev/posts/core-concepts/balance/) — they own genuinely shared vocabulary and have removed their previous policy-ownership leakage — but their size makes them candidates for the same `internal/` sub-boundary treatment recommended for the application commands once Issue 2 is in flight.
- `src/index.ts` is 912 LOC with 176 named exports re-exported from `cli/`, `application/`, `defaults/`, `infrastructure/`, `shared/`, `domain/`, `config/`, and `types/`. There are no external consumers (only four in-repo test files import it), so the [model coupling](https://coupling.dev/posts/dimensions-of-coupling/integration-strength/) it expresses is currently theoretical. If Pairflow ever ships as an installable package, this file should be split along the v11 layer boundaries (one entry per public capability) rather than as a single barrel; it is not actionable today but worth tracking.

---

_This analysis was performed using the [Balanced Coupling](https://coupling.dev) model by [Vlad Khononov](https://vladikk.com)._
