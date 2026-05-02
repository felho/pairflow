# Modularity Review

**Scope**: Pairflow repository (`src/**`, `ui/**`, `tools/**`, `docs/**`) — entire codebase
**Date**: 2026-05-02

## Executive Summary

Pairflow is a local-first orchestrator that runs a pair of CLI agents (Claude Code + Codex) inside per-bubble git worktrees, mediates their conversation through a canonical NDJSON transcript, and gates commits behind a human approval step. The codebase has invested heavily in explicit architectural boundaries — a `v11` strangler layout (`application` / `domain` / `shared` / `shared/ports` / `infrastructure`), executable architecture-fitness checks, and a published placement governance — and on the load-bearing path the [balanced coupling](https://coupling.dev/posts/core-concepts/balance/) is in good shape: zero direct `application -> infrastructure` imports across 322 application files, 69 typed [contract](https://coupling.dev/posts/dimensions-of-coupling/integration-strength/)-style port references, and a clean [contract](https://coupling.dev/posts/dimensions-of-coupling/integration-strength/)-coupled tmux/transcript [runtime boundary](https://coupling.dev/posts/dimensions-of-coupling/distance/).

The most important finding is that the **boundary discipline is partially circumvented in three places that the existing fitness gate does not catch**: five `application/**` files spawn `node:child_process` directly (intrusive coupling outside the ports model), thirteen `shared/<command>/` directories are command-local helpers parked in `shared/**` (violating Pairflow's own Shared Promotion Rule), and the 1683-line `src/config/bubbleConfig.ts` has become a [high-volatility](https://coupling.dev/posts/dimensions-of-coupling/volatility/) hotspot that the user reports as actively painful. Together, these three issues create the highest near-term risk of cascading change. The UI ↔ backend contract is the next most important imbalance — manually-mirrored types across a [high-distance](https://coupling.dev/posts/dimensions-of-coupling/distance/) package boundary, with no incident yet but a textbook tight-coupling shape. Everything else (the shared kernel under `src/types/**`, the canonical transcript/state authority, and the fitness toolkit itself) is balanced and should be preserved.

## Coupling Overview

| Integration | [Strength](https://coupling.dev/posts/dimensions-of-coupling/integration-strength/) | [Distance](https://coupling.dev/posts/dimensions-of-coupling/distance/) | [Volatility](https://coupling.dev/posts/dimensions-of-coupling/volatility/) | [Balanced?](https://coupling.dev/posts/core-concepts/balance/) |
| ----------- | -------- | -------- | ---------- | --------- |
| `application/**` -> `node:child_process` (5 files: `start/startCliRunner`, `attach/emitAttachV11`, `open/openBubbleRuntime`, `start/startCommandDefaults`, `defaults/planWatch/agentRunnerBridgeDefaults`) | [Intrusive](https://coupling.dev/posts/dimensions-of-coupling/integration-strength/) | High (cross-process / OS) | Low functional, medium implementation | **No** — gap in the ports gate |
| `shared/<command>/**` (13 dirs) consumed by exactly one `application/<command>/**` | [Functional](https://coupling.dev/posts/dimensions-of-coupling/integration-strength/) | Low (sibling directories) | Medium-high (core review-loop commands) | Locally cohesive but violates the project's own Shared Promotion Rule — hidden ownership |
| `v11/**` -> `src/config/bubbleConfig.ts` (1683 LOC, ~25 importers) | [Model](https://coupling.dev/posts/dimensions-of-coupling/integration-strength/) + [functional](https://coupling.dev/posts/dimensions-of-coupling/integration-strength/) | Low (in-tree shared module) | High (active config evolution) | Cohesive at the layer level, but the file itself exceeds [cognitive capacity](https://coupling.dev/posts/core-concepts/complexity/) |
| UI client (`ui/**`) <-> backend contracts (`bubbleLifecycleStates`, `DeleteBubbleResult`, `MetaReviewGateRoute`) | [Functional](https://coupling.dev/posts/dimensions-of-coupling/integration-strength/) (manual mirrored definitions) + one cross-package relative import | High (separate npm package, separate build, no runtime schema check) | Medium (core lifecycle stable, delete/meta-review schemas evolve) | **No** — classic [tight-coupling](https://coupling.dev/posts/core-concepts/balance/) shape |
| `UiRouterDependencies` port (14-method capability bag exposing `BubbleStateSnapshot`, `ProtocolEnvelope`) | [Model](https://coupling.dev/posts/dimensions-of-coupling/integration-strength/) | Low (single package) | High (bubble state and meta-review fields evolve) | Tolerable today, but the port's own design contradicts Pairflow's `v11-ports-governance.md` |
| `application/**` -> `shared/ports/**` -> `infrastructure/**` (main load-bearing path, 69 port imports, 0 direct app->infra) | [Contract](https://coupling.dev/posts/dimensions-of-coupling/integration-strength/) | High | Mixed (high for state, low for executors) | **Yes** — [loose coupling](https://coupling.dev/posts/core-concepts/balance/) |
| `v11/**` -> `src/types/**` (435 imports) | [Model](https://coupling.dev/posts/dimensions-of-coupling/integration-strength/) (shared kernel) | Low | High | **Yes** — [high cohesion](https://coupling.dev/posts/core-concepts/balance/), intentional shared kernel |
| Canonical actor emit -> `transcript.ndjson` + `state.json` -> tmux / ssh delivery (runtime authority) | [Contract](https://coupling.dev/posts/dimensions-of-coupling/integration-strength/) | High (cross-process, async) | Low at the transport boundary | **Yes** — [loose coupling](https://coupling.dev/posts/core-concepts/balance/) |
| `tools/fitness/**` (architecture-as-code) <-> `src/v11/**` | [Contract](https://coupling.dev/posts/dimensions-of-coupling/integration-strength/) (policy + AST checks) | Medium (separate tool) | Low | **Yes** |
| `application/<command>/**` -> `domain/**` (anemic domain layer, 30 files / 5 areas) | n/a (gap, not an imbalance) | Low | n/a | No active pain — but the policy that should live here is partly inside `shared/**` |

## Issues

## Issue: `application` orchestration spawns OS processes outside the ports model

**Integration**: `src/v11/application/**` -> `node:child_process`
**Severity**: Critical

### Knowledge Leakage

Five files in the `application` and `defaults` layers import `spawn` directly from `node:child_process`:

- `src/v11/application/start/startCliRunner.ts`
- `src/v11/application/attach/emitAttachV11.ts`
- `src/v11/application/open/openBubbleRuntime.ts`
- `src/v11/application/start/startCommandDefaults.ts`
- `src/v11/defaults/planWatch/agentRunnerBridgeDefaults.ts`

These call sites take a use-case-level decision ("launch tmux", "attach a launcher", "open in editor", "fork the agent runner") and bind it directly to the Node.js child-process ABI: argv shape, stdio plumbing, exit-code semantics, signal handling, and process-lifecycle assumptions all leak into orchestration code. This is [intrusive coupling](https://coupling.dev/posts/dimensions-of-coupling/integration-strength/) — the use case shares "all knowledge" about how a subprocess is created and observed, instead of depending on a typed capability contract. The user has confirmed this is a "gap in the gate," not an intentional carve-out.

Pairflow's own [`v11-ports-governance.md`](../../architecture/v11-ports-governance.md) names this exact failure mode: capabilities like "process execution" must sit behind an explicit port (`shared/ports/**`), with implementation in `infrastructure/`. The dependency-fitness check is currently structural (no `application -> infrastructure` import edge), so a direct dependency on a Node built-in passes the gate without registering as an ownership escape.

### Complexity Impact

A developer reading any of these five files cannot answer "what subprocess executor are we using here?" by inspecting the surrounding [contract](https://coupling.dev/posts/dimensions-of-coupling/integration-strength/) — they have to read the `spawn` call and reconstruct the executor model from arguments. That alone exceeds [working-memory budget](https://coupling.dev/posts/core-concepts/complexity/) when combined with the rest of the orchestration logic these files contain (the largest, `agentRunnerBridgeDefaults.ts`, is 498 lines of orchestration mixed with stdio handling). When the same use case has both branches — local spawn and SSH-mediated spawn — the spawning logic gets duplicated across the two implementations, and a change to retry policy, environment-passing, or stdio capture must be replicated by hand in places that look textually unrelated.

### Cascading Changes

Any of the following triggers cascading edits across all five files:

- Switching the local executor (e.g., adding a sandboxed runner, container-backed runner, or a Linux-namespace mode) — every direct `spawn` site needs a parallel branch.
- Hardening signal handling or zombie-reaping for long-running watchers (`agentRunnerBridgeDefaults`).
- Adding telemetry around process creation/exit, which today has to be repeated at every spawn point.
- Unifying with the SSH executor (`infrastructure/executor/ssh/**`), which already sits behind a richer abstraction — every direct local `spawn` needs a parallel SSH path, and a missed site silently degrades the remote-bubble feature.

The cost of each of these is multiplied by five, with the additional risk that the fitness gate cannot warn when a sixth direct-spawn site is added in a future PR.

### Recommended Improvement

Introduce a `ProcessSpawnPort` (or two narrow ports — one for short-lived "fire-and-forget" launchers like `open`/`attach`, one for long-lived agent-runner processes with stdio streaming) under `src/v11/shared/ports/processSpawn.ts`, and move the concrete `spawn` implementations into `src/v11/infrastructure/executor/process/**`. Wire defaults through the existing `*Defaults.ts` pattern. Then extend `tools/fitness/checks/dependency` to flag direct `node:child_process` (and `node:cluster`, `node:worker_threads`) imports inside `src/v11/application/**` and `src/v11/defaults/**` as a strong-infrastructure-signal — exactly the "ownership-type checking" listed as a TODO in `architecture-fitness-checks.md` §"Add Ownership-Type Checking".

Trade-off: introduces five port wirings and an indirection at call sites, costing roughly a day. The benefit is that the two highest-volatility process-launch surfaces (the agent runner bridge and the start/attach/open trio) become contract-coupled, the fitness gate stops being silently bypassable for this class of capability, and any future executor variant (sandbox, container, remote) plugs in at one place instead of five.

## Issue: `shared/<command>/` is a command-local parking lot disguised as shared boundary

**Integration**: `src/v11/application/<command>/**` <-> `src/v11/shared/<command>/**`
**Severity**: Significant

### Knowledge Leakage

Pairflow's [`v11-placement-and-extraction-governance.md`](../../architecture/v11-placement-and-extraction-governance.md) is explicit:

> A module may be placed in `src/v11/shared/**` only if all are true:
> 1. it is already used, or is immediately required, by more than one command or lane,
> 2. its semantics are genuinely shared rather than command-specific, ...

A static cross-reference of the current tree shows that thirteen `shared/<command>/` directories are imported from exactly one `application/<command>/` directory and nowhere else: `askHuman`, `attach`, `commit`, `create`, `inbox`, `kickoff`, `list`, `merge`, `pass`, `reconcile`, `reply`, `start`, `stop`. For example, `src/v11/shared/pass/` (5 files: error normalization, input/payload normalization, error runtime) is referenced only by `src/v11/application/pass/{emitPassV11,emitPassContextBuilder,passCommandOrchestration}.ts`. These are command-local helpers, not multi-lane shared modules. They share the [functional coupling](https://coupling.dev/posts/dimensions-of-coupling/integration-strength/) of the command (its error model, its input shape) — but that's exactly the kind of knowledge governance asks to keep command-local.

The user confirmed this is "unfixed technical debt" — a known consequence of the strangler migration, not an intentional design choice.

### Complexity Impact

The harm is not in cascading changes — strength and distance are already balanced ([high cohesion](https://coupling.dev/posts/core-concepts/balance/), low distance). The harm is structural: the layer's signal becomes noisy. A reader cannot tell, by directory path alone, whether `src/v11/shared/X/` is a multi-lane primitive (like `shared/state/`, `shared/protocol/`, `shared/validation/`, `shared/reviewer/`, all of which have many cross-command consumers) or a one-customer parking lot. That blurs the boundary the [`v11-ports-governance.md`](../../architecture/v11-ports-governance.md) was written to enforce, and weakens the fitness check's ability to challenge "edge disappeared, ownership did not." It also masks where pure-policy logic should be — much of what would naturally live in `domain/` is currently spread across `shared/<command>/` and `shared/state/`, which is why `domain/` looks anemic (30 files, 5 areas).

### Cascading Changes

This integration is **not** a frequent source of cascading runtime breakage. The pain is review-time and refactor-time:

- A future "promote real shared logic out of `shared/<command>/`" sweep needs a triage matrix to separate one-customer parking lots from genuine multi-lane shared modules.
- New contributors and LLM-driven workflows (Pairflow's own bubbles!) get inconsistent signals about what the layer means.
- It becomes hard to extend the fitness "ownership-type checking" rule, because the policy has to allow plenty of `shared/<command>/` modules that look infrastructure-like or command-local.

### Recommended Improvement

Treat this as a one-shot migration, not as a per-PR rule. For each of the thirteen one-customer directories: move the contents into the corresponding `application/<command>/` directory (preserving the `Defaults` indirection and contract files), update imports, and re-run the build. The change is mechanical, parity tests should already cover the moved code, and `git mv` keeps history. After the move, document and enforce a stricter Shared Promotion Rule in `tools/fitness/checks/dependency`: a `shared/<name>/` directory must be referenced from at least two distinct `application/**` lane roots OR from `infrastructure/**`, otherwise emit a `report-only` finding.

Trade-off: a non-trivial PR (touching ~80–100 files, mostly imports), against the long-term cost of a layer whose name no longer matches its meaning. Doing this *before* the next major architectural change (e.g., the planned actor-runtime onboarding extension) avoids carrying the ambiguity into another generation of code.

## Issue: `bubbleConfig.ts` is a 1683-line monolith touching every bubble-aware code path

**Integration**: `v11/**` -> `src/config/bubbleConfig.ts`
**Severity**: Significant

### Knowledge Leakage

`src/config/bubbleConfig.ts` is 1683 lines and bundles, in one module: TOML parsing (with a hand-rolled limited parser), schema validation, defaulting, normalization across many compatibility shims, render-back-to-TOML, error codes, and policy decisions about which fields are migration-only vs runtime-authoritative. Around 25 v11 files import directly from it (across `application/**`, `shared/**`, and `defaults/**`). It is referenced from the start, create, attach, list, kickoff, plan-watch, and review-policy lanes — i.e., basically every command that reads or rewrites bubble configuration.

This is [model coupling](https://coupling.dev/posts/dimensions-of-coupling/integration-strength/) and [functional coupling](https://coupling.dev/posts/dimensions-of-coupling/integration-strength/) collapsed into one file: the *meaning* of the config schema and the *behavior* of normalizing it cannot be separated. The user reported this module as "actively painful" — a strong essential-volatility signal.

### Complexity Impact

The overall layer-level coupling shape is balanced (low distance, single in-tree consumer of a model — that's [high cohesion](https://coupling.dev/posts/core-concepts/balance/)). The complexity comes from inside the file: 1683 lines vastly exceeds [working-memory capacity](https://coupling.dev/posts/core-concepts/complexity/), so any non-trivial change requires reconstructing the meaning of unrelated sections to be sure a normalization tweak does not corrupt a render path or an unrelated default. Add a new field, and you must touch parser tokens, validators, defaults, render output, error codes, and at least one downstream type in `src/types/bubble.ts`. A typo in any of those creates an asymmetric bug that only shows up several lanes downstream.

### Cascading Changes

Concrete change drivers that already happen frequently in this codebase:

- New review-policy field (`review_loop_mode`, `meta_review_consecutive_clean_runs_required`, etc.). Recent commits include several. Each one ripples through ~6 sections of the file plus `types/bubble.ts` plus 3–6 importers.
- New validation command target (any change to `validation_targets[]` shape).
- Local-overlay scope changes (entries, modes).
- Compatibility shim added or removed during migration. Today these live alongside live policy in the same file.

The user's "Igen, fáj" answer indicates this is a recurring cost, not a hypothetical one.

### Recommended Improvement

Split `bubbleConfig.ts` into capability-cohesive modules **without** introducing new ports:

- `src/config/bubbleConfig/parser.ts` — TOML tokenization and the limited-parser surface.
- `src/config/bubbleConfig/schema.ts` — schema typing + invariant validators.
- `src/config/bubbleConfig/normalize.ts` — defaulting and cross-field normalization.
- `src/config/bubbleConfig/render.ts` — the round-trip `renderBubbleConfigToml`.
- `src/config/bubbleConfig/compat.ts` — explicit, removable migration shims.
- `src/config/bubbleConfig/index.ts` — re-exports the existing public API so the 25 importers don't move.

This is structural, not architectural — the layer-level coupling shape stays exactly the same (in-tree shared model with low distance and high cohesion). What changes is that any single change now lives in one file, the unit tests can attack each capability in isolation, and the compat shims become visibly removable when the migration completes. Trade-off: about half a day of mechanical splitting plus regenerating the existing config tests against the new module layout. Pairs naturally with the next config field addition.

## Issue: UI client and backend share contracts by manual mirroring across a high-distance boundary

**Integration**: `ui/**` <-> `src/contracts/**` + `src/types/**` + selected `src/v11/shared/**`
**Severity**: Significant

### Knowledge Leakage

The browser-side UI lives in a separate npm workspace (`ui/`, with its own `package.json`, Vite build, vitest, and pnpm-lock). It depends on the backend's domain types and contracts in three different ways at once:

- **Manual mirrored copies, with a comment to keep aligned.** `src/contracts/deleteBubble.ts` carries the literal warning *"This contract is mirrored in `ui/src/lib/types.ts` to avoid cross-package UI imports. Keep both definitions aligned whenever fields are added, removed, or renamed."* Both files independently declare `DeleteBubbleArtifacts` and `DeleteBubbleResult`. `ui/src/lib/contracts/bubbleLifecycle.ts` re-declares `bubbleLifecycleStates` and `BubbleLifecycleState` independently from `src/types/bubble.ts`.
- **Implicit shape coupling on the HTTP wire.** The router action handlers in `src/v11/infrastructure/ui/routerActionDispatch.ts` return rich objects that include `BubbleStateSnapshot` and `ProtocolEnvelope` — the UI's `PairflowApiClient` parses them as `Record<string, unknown>` (see `ui/src/lib/api.ts`). There is no JSON schema, no runtime validator at the seam.
- **One cross-package relative import** for `MetaReviewGateRoute` from `ui/src/lib/types.ts:9` directly into `../../../src/v11/shared/metaReviewGate/metaReviewGateTypes.js`, mixing the two strategies.

This is [functional coupling](https://coupling.dev/posts/dimensions-of-coupling/integration-strength/) with duplicated business knowledge across a [high-distance](https://coupling.dev/posts/dimensions-of-coupling/distance/) boundary (separate package, separate build pipeline, separate runtime — the browser literally cannot import Node modules). A change in the backend definition does not break the UI build until someone notices the drift; runtime divergence appears as silently-missing fields in the UI. The user could not recall a concrete past incident, which is consistent with the schema having moved slowly so far — but the *shape* of the coupling is the textbook [tight-coupling / distributed monolith](https://coupling.dev/posts/core-concepts/balance/) case in the [balance rule](https://coupling.dev/posts/core-concepts/balance/).

### Complexity Impact

The cognitive load is *latent*: today, a developer adding a delete-bubble field will (1) edit `src/contracts/deleteBubble.ts`, (2) remember the comment and edit `ui/src/lib/types.ts`, (3) hope the browser types match what the router actually returns. The chain has no compile-time enforcement across the boundary. As more fields evolve (the meta-review gate is currently in active development per the docs), the chance of forgetting a step compounds. The cost of an eventual divergence is asymmetric: the failure surface is "UI silently shows wrong/missing data," which is easy to miss in QA and erodes trust in the dashboard.

### Cascading Changes

- Any addition to `BubbleLifecycleState` (e.g., a new explicit "MERGING" state proposed in the v2 architecture plan) must be replicated in `ui/src/lib/contracts/bubbleLifecycle.ts` by hand.
- Any change to the delete-bubble result envelope (artifacts, flags) must be replicated in `ui/src/lib/types.ts`.
- Any backend-side rename of a meta-review-gate field will break the one cross-package relative import without compile-time signaling on the backend's side (the UI build runs separately and may pass against an old `dist/`).

### Recommended Improvement

Introduce one explicit [contract](https://coupling.dev/posts/dimensions-of-coupling/integration-strength/) seam between the two packages. The cheapest viable option, given a single-developer / single-deploy reality, is:

- Promote a small, intentional surface (`bubbleLifecycleStates`, the action result types, `MetaReviewGateRoute`, `DeleteBubbleResult`, etc.) into a single `src/contracts/ui/**` directory in the backend.
- Have the UI build consume those contracts via either (a) a TypeScript path mapping or `tsconfig` reference, or (b) a tiny `pairflow-contracts` workspace package — both keep the *single source of truth* in the backend tree.
- Add a runtime-thin schema check at the router seam (zod or hand-rolled, the codebase already uses hand-rolled validation primitives in `src/v11/shared/validation/**`) so wire-shape divergence fails the request loudly rather than silently.

Trade-off: introduces one boundary the UI must respect; replaces the "keep aligned" comment with a real compile-time contract. The cost is small (a few hundred lines of wiring); the benefit is that the highest-volatility action result schemas (commit, merge, delete, meta-review-gate) become single-source. Skip this only if you're confident the UI surface will stop evolving — given the active meta-review and plan-watch work, that does not seem to be the case.

## Issue: `UiRouterDependencies` is a broad capability-bag port

**Integration**: `src/v11/shared/ports/uiRouter.ts` -> `application/**` (14 different commands)
**Severity**: Minor

### Knowledge Leakage

`src/v11/shared/ports/uiRouter.ts` declares one interface, `UiRouterDependencies`, with **14 methods** spanning unrelated capabilities (`listBubbles`, `getBubbleStatus`, `getBubbleInbox`, `readRuntimeSessionsRegistry`, `readBubbleTimeline`, `startBubble`, `emitApprove`, `emitRequestRework`, `emitHumanReply`, `resumeBubble`, `commitBubble`, `mergeBubble`, `openBubble`, `attachBubble`, `updateBubbleReviewPolicy`, `stopBubble`, `restartBubble`, `deleteBubble`). Method signatures expose internal domain types — `BubbleStateSnapshot`, `ProtocolEnvelope`, `BubbleListEntry`, `BubbleStatusView` — directly into the UI runtime via the port. This is [model coupling](https://coupling.dev/posts/dimensions-of-coupling/integration-strength/) leaking through what should be a [contract](https://coupling.dev/posts/dimensions-of-coupling/integration-strength/) boundary.

Pairflow's own [`v11-ports-governance.md`](../../architecture/v11-ports-governance.md) §"Port Shape" calls this out specifically:

> Avoid:
> - barrel files that only re-export infrastructure functions,
> - ports that expose infrastructure-only data types without an application-facing reason,
> - **broad "capability bags" with unrelated methods.**

### Complexity Impact

Today this does not cause cascading change because the port consumer (`infrastructure/ui/routerDependencies.ts`) and the implementations (`v11/defaults/ui/routerDefaults.ts`) live in the same package — distance is low, so even a noisy interface stays cohesive. The complexity cost is design-noise: a change to *any* of the 14 commands' result shapes invalidates the single port type, and adding a new bubble action enlarges the bag rather than introducing a new narrow capability. It also undermines the credibility of the project's own ports doctrine — a future reviewer cannot point at this port as an example of correct shape.

### Cascading Changes

- Adding a new bubble action (e.g., a future "snapshot" action) would by reflex extend the bag rather than introduce a focused port. Each extension makes the bag harder to refactor later.
- A rename in `BubbleStatusView` propagates through the port to the UI router, even though the port's purpose is to *insulate* the UI runtime from such churn.

### Recommended Improvement

Split `UiRouterDependencies` into capability-shaped ports — at minimum: a query bag (`UiBubbleQueryDependencies` for read-only operations), a mutation bag (`UiBubbleMutationDependencies` for emits), and standalone narrow ports for the more weakly-related capabilities (`AttachBubblePort`, `RuntimeSessionsRegistryPort` already exists). Replace the rich return types (`BubbleStateSnapshot`, `ProtocolEnvelope`) with explicit UI-facing DTOs in `shared/ports/uiRouter.ts` so the port describes what the UI needs, not what the orchestration internally produces.

Trade-off: this is the lowest-priority issue in the review and need not be tackled separately — it is best done *together* with the UI ↔ backend contract issue above, because the same DTOs would serve both seams. Splitting the port without addressing the ui-package coupling is structural movement only.

## Issue (note, not flagged): the `domain/` layer is anemic by current population, but does not yet hurt

**Integration**: `application/<command>/**` <-> `domain/**`
**Severity**: Minor

### Knowledge Leakage

`src/v11/domain/` has 30 files across 5 areas (`convergence`, `ideation`, `pass`, `reply`, `state`). The placement governance reserves `domain/` for *pure policy* and *deterministic derivation*. A non-trivial amount of code that fits this description (state transition validation, role-alternation policy, severity-threshold derivation, reviewer policy resolution) currently lives under `src/v11/shared/state/`, `shared/protocol/`, `shared/reviewer/`, `shared/reviewPolicy/`. None of those is *wrong* — they are genuinely cross-lane shared — but it does mean that "where does the policy live?" is answered by "shared," not "domain," and the latter looks emptier than it should.

### Complexity Impact

There is no observable cascading-change pain today: shared/state has 23 in-package consumers with [contract](https://coupling.dev/posts/dimensions-of-coupling/integration-strength/)-style usage, and shared/reviewer is heavily used (50 consumers) but stable. The [volatility](https://coupling.dev/posts/dimensions-of-coupling/volatility/) of these modules is high, but their distance is low and their strength is contract-shaped, so they are balanced.

### Recommended Improvement

No urgent action. Address opportunistically: when refactoring `shared/state/` next, ask "is this pure deterministic policy with no IO?" — if yes, consider moving to `domain/state/`. The same heuristic for `shared/reviewer/` and `shared/protocol/`. Do not move things into `domain/` just to balance file counts.

---

## Summary of Recommendations, in Priority Order

1. **Critical — close the `child_process` gap.** Introduce a `ProcessSpawnPort`, move the five direct `spawn` sites behind it, and extend `tools/fitness/checks/dependency` with the ownership-signal rule already drafted in `architecture-fitness-checks.md`.
2. **Significant — split `bubbleConfig.ts`.** Internal decomposition of the 1683-line module into parser/schema/normalize/render/compat. No new ports needed.
3. **Significant — promote backend-owned UI contracts.** Single-source the manually-mirrored UI types and add a runtime schema check at the HTTP router seam.
4. **Significant — sweep `shared/<command>/` parking lots into `application/<command>/**`.** Mechanical migration; tighten the Shared Promotion Rule afterwards in fitness.
5. **Minor — reshape `UiRouterDependencies` into narrow ports** when item 3 lands.
6. **Watch, don't act — `domain/` population.** Migrate opportunistically when the relevant `shared/**` modules are touched.

The remaining structures — the load-bearing application/ports/infrastructure path, the canonical transcript/state-as-authority [contract](https://coupling.dev/posts/dimensions-of-coupling/integration-strength/) boundary, the shared kernel under `src/types/**`, and the architecture-fitness toolkit — are balanced and should not be perturbed.

---

_This analysis was performed using the [Balanced Coupling](https://coupling.dev) model by [Vlad Khononov](https://vladikk.com)._
