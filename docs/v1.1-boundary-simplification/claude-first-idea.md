# Pairflow Architecture Analysis — First Ideas

> Generated: 2026-03-14
> Source: deep codebase analysis of 126 non-test TypeScript files in `src/`

---

## Executive Summary

The pairflow codebase is **organized vertically by use-case** (one file per operation), not horizontally by responsibility layer. Every use-case file re-implements the same cross-cutting patterns: state reads/writes, protocol envelope construction, metrics emission, tmux delivery, validation. This makes the code hard to test, hard to change safely, and hard to reason about.

**Three root causes** drive the complexity:

1. **No orchestrator/domain separation** — each use-case file mixes 10+ responsibilities
2. **No infrastructure abstraction** — I/O, metrics, locking are inline in business logic
3. **Policy logic scattered** — convergence rules spread across 5+ files

---

## 1. Monolithic Use-Case Files

The largest files do everything at once — validation, policy evaluation, state transitions, protocol envelope creation, I/O persistence, metrics emission, and delivery notification — all in a single function.

### Severity: CRITICAL

| File | ~Lines | Mixed Responsibilities |
|------|--------|----------------------|
| `core/agent/pass.ts` | 1200+ | input validation, transcript analysis, findings claim resolution, convergence policy, test evidence verification, review verification artifact writing, doc contract gates, summary verifier consistency gate, meta-review gate, protocol envelope creation, state transition, state persistence, metrics emission, tmux delivery, repeat-clean auto-converge |
| `core/bubble/startBubble.ts` | 1100+ | bubble lookup, worktree bootstrap, tmux session launch, session registry management, agent command building, resume summary generation, reviewer guidance formatting, 2-step state transitions, metrics |
| `core/agent/converged.ts` | 700+ | convergence policy validation, state precondition checking, doc contract gate, summary verifier gate, meta-review gate, gate result interpretation, delivery orchestration with retries, 4 different metrics events, protocol envelope creation |
| `core/runtime/tmuxDelivery.ts` | ~600 | envelope metadata parsing, delivery target role resolution, target pane index resolution, session registry lookup, tmux send-keys, reviewer guidance injection, retry with exponential backoff, failure reason aggregation |
| `core/bubble/metaReviewGate.ts` | 500+ | meta-review execution (pane spawning), findings parity validation, state transitions with conflict recovery, protocol envelope creation (approval request + rework), meta-reviewer pane binding, tmux interaction, error rollback |
| `core/bubble/commitBubble.ts` | 400+ | done package artifact management, git staging, staged files path validation, git commit execution, SHA extraction, DONE_PACKAGE envelope, 2-step state transition (APPROVED→COMMITTED→DONE), metrics |
| `core/human/approval.ts` | 300+ | approval decision validation (meta-review override), transcript context extraction, state routing (approve/rework → next state), next round initialization, APPROVAL_DECISION envelope, deferred rework intent queuing, delivery, metrics |

### Example: `pass.ts` — a single `emitPassFromWorkspace()` function

A single `pairflow pass` call traverses ~15 distinct responsibilities in one function:

```
Input validation → Findings format parsing → Transcript analysis →
Finding claim resolution (payload vs parser divergence) →
Convergence policy check → Reviewer context refresh →
Test evidence verification → Review verification artifact write →
Doc contract gates evaluation → Summary verifier consistency gate →
Meta-review gate decision → Protocol envelope creation →
State machine transition → State persistence (with fingerprint conflict detection) →
Metrics emission → Tmux delivery notification →
Repeat-clean auto-converge evaluation
```

Each of these is a distinct concern that should be independently testable.

---

## 2. State Management — Good Foundation, Scattered Usage

### What works well

The **storage layer** is solid:
- `stateStore.ts`: fingerprint-based conflict detection, file-based locking, atomic writes (temp+rename)
- `machine.ts`: immutable state transitions via `applyStateTransition()` — creates new objects, validates allowed transitions
- `transitions.ts`: centralized transition table
- `stateSchema.ts`: schema validation on every write via `assertValidBubbleStateSnapshot()`

### What's problematic

**12+ files directly read and write state**, each constructing the next state object inline:

Files that call `readStateSnapshot` / `writeStateSnapshot`:
- `core/agent/pass.ts` — state mutations for pass handoffs
- `core/agent/converged.ts` — state for convergence validation
- `core/bubble/startBubble.ts` — 2-step state transitions during bootstrap/resume
- `core/bubble/statusBubble.ts` — state reading for status view
- `core/bubble/commitBubble.ts` — state transitions on commit
- `core/bubble/mergeBubble.ts` — state reading during merge
- `core/bubble/stopBubble.ts` — state mutation to FAILED
- `core/bubble/watchdogBubble.ts` — state mutations for watchdog escalation
- `core/bubble/metaReview.ts` — complex state mutations with recovery
- `core/bubble/metaReviewGate.ts` — state mutations for gate routing
- `core/human/approval.ts` — state transitions for approval decisions
- `core/human/reply.ts` — state mutations on human reply
- `core/human/reworkIntent.ts` — state mutations for deferred rework
- `core/runtime/startupReconciler.ts` — state reconciliation during startup

### Inline state construction pattern

Each consumer builds the next state manually via spread:

```typescript
// pass.ts — inline state construction
let nextState: BubbleStateSnapshot = {
  ...state,
  active_agent: handoff.recipientAgent,
  active_role: handoff.recipientRole,
  active_since: nowIso,
  round: handoff.nextRound,
  round_role_history: [...state.round_role_history, handoff.appendRoundRoleEntry]
};
written = await writeStateSnapshot(statePath, nextState, {
  expectedFingerprint: loadedState.fingerprint,
  expectedState: "RUNNING"
});
```

### Transition validation bypass

`reworkIntent.ts` constructs next state via spread + selective field updates **without calling `applyStateTransition()`**, bypassing the transition validation. Currently safe but doesn't use the state machine pattern.

### Multi-step transaction gap

`startBubble.ts` performs a 2-step state transition without transactional guarantees:

```
Step 1: Write state → PREPARING_WORKSPACE
Step 2: Bootstrap workspace (long-running, can fail)
Step 3: Launch tmux session (can fail)
Step 4: Write state → RUNNING
```

If bootstrap or tmux fails between steps, the bubble is stuck in `PREPARING_WORKSPACE` with a partially initialized workspace. Similar patterns exist in `metaReview.ts` and `commitBubble.ts`.

### Transcript-state ordering risk

`pass.ts` appends protocol envelope to transcript BEFORE writing state. If state write fails after transcript append, recovery must reconcile from transcript tail. This is intentional (transcript is source of truth) but creates recovery complexity.

---

## 3. Cross-Cutting Concerns — Ad-Hoc and Inconsistent

### 3.1 Error Handling — Three Incompatible Patterns

**Pattern A: Re-wrapping with data loss**
```typescript
// statusBubble.ts — loses .errors field from BubbleLookupError
export function asBubbleStatusError(error: unknown): never {
  if (error instanceof BubbleLookupError) {
    throw new BubbleStatusError(error.message); // structured data LOST
  }
}
```
Same pattern in `commitBubble.ts`. When domain errors with structured fields are re-wrapped, only the message string survives.

**Pattern B: Flat error hierarchy**
40+ custom error classes all extend `Error` directly. Some domains (`metrics`, `protocol`) have sub-hierarchies (`MetricsEventLockError`, `MetricsEventValidationError`), but bubble operations are flat despite catching many different error types.

**Pattern C: Mixed return strategies**
- `bubbleConfig.ts` returns `ValidationResult<T>` (error accumulation)
- `stateSchema.ts` throws on first invalid field
- No consistent convention for when to use which

### 3.2 Metrics Emission — Tangled With Business Logic

Every use-case file directly calls `emitBubbleLifecycleEventBestEffort()`:

```typescript
// Scattered across createBubble, startBubble, commitBubble, pass, converged, approval, etc.
await emitBubbleLifecycleEventBestEffort({
  bubbleId, eventType, metadata, reportWarning
});
```

Problems:
- Metrics code sits in the middle of domain logic, making functions harder to test
- Each caller must handle its own warning reporter
- De-duplication uses a module-level static `Set` (untestable, cross-file state)
- No event dispatcher or middleware — no way to swap implementations

### 3.3 File I/O — 80+ Files Use Direct Node.js Calls

No `FileSystem` abstraction exists. `readFile`, `writeFile`, `mkdir`, `appendFile` are called directly in 80+ files.

Consequences:
- Cannot inject test doubles without module mocking
- Atomicity varies: `stateStore` uses temp+rename, `transcriptStore` appends directly
- Error handling for ENOENT/EACCES differs per call site
- Some files catch by error code (`bubbleLookup.ts`), others use `.catch(() => false)`

### 3.4 TOML Parsing — Duplicated

`splitTomlList()` and `stripInlineComment()` are duplicated between:
- `config/bubbleConfig.ts` (lines 178-239)
- `config/pairflowConfig.ts` (lines 22-80)

No shared TOML utilities module.

### 3.5 Config Resolution — Prop-Drilled

Three config types (`BubbleConfig`, `PairflowRepoConfig`, `PairflowGlobalConfig`) are resolved at different points and their fields are extracted and passed individually through function chains:

```typescript
// createBubble.ts — many individual parameters instead of a config object
export async function createBubble(
  reviewArtifactType, testCommand, typecheckCommand, bootstrapCommand, ...
)
```

No dependency injection or config container — each function takes the specific pieces it needs, creating wide parameter lists.

---

## 4. Convergence Policy — The Core Business Rule, Scattered

Convergence is arguably the most critical business rule in pairflow (when is a bubble's work "done"?), yet the logic lives in **5 files**:

| File | What it does |
|------|-------------|
| `convergence/policy.ts` | Core policy validation, regex-based summary parsing, finding aggregate evaluation |
| `convergence/repeatCleanAutoconverge.ts` | Repeat-clean auto-converge policy |
| `core/agent/pass.ts` | Calls policy, BUT mixes with findings validation, state transitions, gates |
| `core/agent/converged.ts` | Calls policy, BUT mixes with gate logic, delivery orchestration |
| `core/human/approval.ts` | Approval routing logic (approve/rework decision → next state) |

Understanding "when does a bubble converge?" requires reading all five files and mentally tracing the control flow between them.

Additionally, `convergence/policy.ts` encodes business rules as regex patterns:
```typescript
const summaryClauseSplitPattern = /.../ ;
const summaryFindingsWordPattern = /.../ ;
const summaryNoFindingsPattern = /.../ ;
```
These are hard to test individually and hard to extend.

---

## 5. Proposed Target Architecture — Four Clean Layers

```
┌─────────────────────────────────────────────────────┐
│  CLI Layer                                          │
│  cli/commands/**                                    │
│                                                     │
│  Responsibility: argument parsing + invoke          │
│  Forbidden: business logic, state access, I/O       │
└──────────────────────┬──────────────────────────────┘
                       │ calls
┌──────────────────────▼──────────────────────────────┐
│  Orchestrator Layer                                 │
│  orchestrators/{pass, converge, start, commit, ...} │
│                                                     │
│  Responsibility: coordinate domain + I/O            │
│  Pattern: read state → call domain → write state    │
│           → emit metrics → deliver notification     │
│  Forbidden: own logic (delegates everything)        │
│  This is the "thin glue" layer                      │
└──────────┬────────────────────────┬─────────────────┘
           │ pure calls             │ I/O calls
┌──────────▼───────────────┐  ┌────▼──────────────────┐
│  Domain Core (pure)      │  │  Infrastructure /     │
│                          │  │  I/O Adapters         │
│  ├─ State Machine        │  │                       │
│  │  transitions, schema  │  │  ├─ StateStore        │
│  │  (already good)       │  │  │  (already good)    │
│  │                       │  │  │                    │
│  ├─ Convergence Policy   │  │  ├─ TranscriptStore   │
│  │  Engine               │  │  │  (append-only log) │
│  │  ALL policy rules     │  │  │                    │
│  │  in one place         │  │  ├─ FileSystem        │
│  │                       │  │  │  abstraction (NEW) │
│  ├─ Gate Evaluators      │  │  │                    │
│  │  meta-review, doc,    │  │  ├─ TmuxAdapter       │
│  │  summary verifier     │  │  │  session, pane,    │
│  │  Input → Decision     │  │  │  delivery          │
│  │  (no I/O)             │  │  │                    │
│  ├─ Findings Resolver    │  │  ├─ GitAdapter        │
│  │  claim resolution     │  │  │  stage, commit,    │
│  │                       │  │  │  worktree          │
│  ├─ Envelope Builder     │  │  │                    │
│  │  protocol envelope    │  │  ├─ MetricsDispatcher │
│  │  construction         │  │  │  event emission    │
│  │                       │  │  │  middleware (NEW)  │
│  └─ Handoff Router       │  │  │                    │
│     normal_pass vs       │  │  └─ ConfigLoader      │
│     auto_converge vs     │  │     unified TOML      │
│     repeat_clean         │  │     parsing + merge   │
└──────────────────────────┘  └───────────────────────┘
```

### Layer rules

| Layer | Can depend on | Cannot depend on | I/O allowed |
|-------|--------------|-----------------|-------------|
| CLI | Orchestrator | Domain, Infrastructure | No |
| Orchestrator | Domain, Infrastructure | CLI | Only via adapters |
| Domain Core | Nothing (pure) | Orchestrator, Infrastructure, CLI | No |
| Infrastructure | Node.js, external tools | Domain, Orchestrator, CLI | Yes |

### Key principle

The **Domain Core** layer consists of **pure functions** (input → output, no file I/O, no state writes, no side effects). The Orchestrator layer connects domain decisions to I/O adapters. This means domain logic is **unit-testable without mocks**.

---

## 6. Migration Strategy — Incremental, Not Big-Bang

### Milestone 1: Extract Convergence Policy Engine

**Why first:** it's the core business rule, currently scattered across 5 files, and it's conceptually pure (input state + findings → decision).

**What:**
- Create `domain/convergence/` with a single `ConvergencePolicyEngine`
- Move all policy rules, regex patterns, finding aggregation, repeat-clean logic here
- `pass.ts` and `converged.ts` call the engine instead of implementing policy inline
- Approval routing logic moves here too

**Validation:** all existing convergence tests pass, no new behavior.

### Milestone 2: Extract Gate Evaluators as Pure Functions

**Why:** gates (meta-review, doc contract, summary verifier) are decision logic that currently mixes I/O reads with evaluation.

**What:**
- Create `domain/gates/` with pure evaluator functions: `(gateInput) → GateDecision`
- I/O (reading gate artifacts) stays in the orchestrator or infrastructure layer
- Gate evaluators become trivially unit-testable

**Validation:** gate behavior unchanged, new unit tests for evaluators.

### Milestone 3: Create Orchestrator Layer for pass/converge

**Why:** these are the two most complex operations.

**What:**
- Create `orchestrators/pass.ts` that coordinates: read state → validate input → call domain policy → build envelope → write state → emit metrics → deliver
- Each step is a call to domain or infrastructure, not inline logic
- `core/agent/pass.ts` becomes a thin wrapper or is replaced

**Validation:** integration tests pass, pass behavior unchanged.

### Milestone 4: Infrastructure Abstractions

**Why:** enables testing and consistent patterns.

**What:**
- `FileSystem` interface (injectable, mockable)
- `MetricsDispatcher` (event middleware, removes metrics from domain logic)
- Unified TOML parsing utilities
- Consistent error hierarchy with base classes

**Validation:** existing behavior unchanged, test infrastructure improved.

### Milestone 5: Remaining Orchestrators

**What:**
- Apply the orchestrator pattern to remaining use-cases: `startBubble`, `commitBubble`, `approval`, `metaReviewGate`, etc.
- Each becomes a thin coordinator calling domain + infrastructure

**Validation:** full integration test suite passes.

---

## 7. Risks and Constraints

| Risk | Mitigation |
|------|-----------|
| Big-bang rewrite breaks everything | Incremental milestones, each leaves system working |
| Introducing abstraction overhead without benefit | Each layer must have clear "forbidden" rules, not just "allowed" |
| State transition bypass in new code | Lint rule or test: all state writes must go through `applyStateTransition()` |
| Transcript-state ordering change | Keep current transcript-first ordering; document it as architectural decision |
| Legacy compat during migration | Old function signatures can delegate to new orchestrators; remove old code only after all callers migrate |

---

## 8. Operator Flexibility Gap — Observed Pain Points

Beyond the code-level architecture issues, real-world usage has revealed that the system is **too rigid for operator intervention**. The strict state machine and tightly coupled agent lifecycle make it hard to recover from common stuck situations.

### Pain Point 1: Cannot easily override bubble state

**Problem:** When a bubble gets stuck in a state (e.g., `META_REVIEW_RUNNING` but the meta-reviewer crashed, or `WAITING_HUMAN` but the question is no longer relevant), the operator cannot simply move it to a different state. The current system enforces the transition table strictly — you can only reach certain states from certain other states, and there's no escape hatch.

**What's needed:** A `pairflow bubble set-state --id <id> --state <target> --force` command that:
- Bypasses the transition table validation
- Logs the override in the transcript (audit trail)
- Optionally snapshots the previous state for recovery
- Is clearly marked as an operator override (not normal flow)

**Why the current architecture makes this hard:** State transitions are validated inside `applyStateTransition()` which throws on invalid transitions. Every use-case file calls this inline. There's no "operator override" path — you'd have to add `--force` logic to every command individually, or write directly to `state.json` (fragile, no audit trail).

**How the proposed architecture helps:** With a clean Orchestrator layer and a `StateStore` adapter, an operator override command would be a thin orchestrator that:
1. Reads current state
2. Skips domain validation (it's an explicit override)
3. Writes new state via `StateStore` with an `OPERATOR_OVERRIDE` audit envelope in the transcript
4. Emits a metrics event

This is ~20 lines of orchestrator code, not a change to the domain core.

### Pain Point 2: Cannot restart a stuck agent without stopping the bubble

**Problem:** Sometimes an individual agent (e.g., the Claude reviewer) gets stuck — frozen, unresponsive, or in a bad loop. Currently, the only recovery is `pairflow bubble stop` (kills everything) and then resume, or manual tmux intervention. There's no way to say "just restart the reviewer pane, keep everything else running."

**What's needed:** A `pairflow bubble restart-agent --id <id> --agent <claude|codex|meta-reviewer>` command that:
- Kills and respawns only the target tmux pane
- Re-injects the agent briefing and current context
- Optionally re-sends the last pending message to the restarted agent
- Keeps the bubble state, transcript, and other panes untouched

**Why the current architecture makes this hard:** Agent lifecycle is tangled with bubble lifecycle in `startBubble.ts`. The tmux pane setup, agent command building, reviewer guidance formatting, and context injection are all part of the monolithic start flow. There's no isolated "restart one pane" capability — the code that sets up a pane is embedded in the 1100-line start function.

**How the proposed architecture helps:** With a `TmuxAdapter` and a separate `AgentPaneInitializer`:
1. `TmuxAdapter.respawnPane(sessionName, paneIndex)` — kills and recreates the pane
2. `AgentPaneInitializer.initialize(paneIndex, role, currentContext)` — builds command, injects briefing
3. Optionally `DeliveryAdapter.redeliverLastMessage(bubbleId, targetRole)` — re-sends pending work

Each piece exists independently, so "restart one agent" is a composition of existing capabilities.

### Pain Point 3: Cannot skip or bypass a gate mid-flow

**Problem:** The meta-review gate (or other gates like doc contract, summary verifier) sometimes gets stuck — the meta-reviewer crashes, loops, or the gate is simply unnecessary for a given situation. The operator cannot say "skip this gate, go straight to human approval." The gate logic is hardwired into the `pass.ts` and `converged.ts` flow — there's no gate bypass capability.

**What's needed:** A `pairflow bubble skip-gate --id <id> --gate meta-review` command that:
- Skips the specified gate for the current convergence attempt
- Routes the bubble directly to the next logical state (e.g., `READY_FOR_HUMAN_APPROVAL`)
- Logs the skip in the transcript with an `OPERATOR_GATE_SKIP` envelope (audit trail)
- Does not permanently disable the gate — it applies only to the current pending evaluation

**Why the current architecture makes this hard:** Gates are not a composable pipeline — they're inline function calls embedded in the `pass.ts` and `converged.ts` orchestration logic. There's no gate registry, no way to query "which gates are pending," and no way to mark one as skipped. The gate evaluation and the state transition that follows are tightly coupled in the same code path.

For example, in `converged.ts` the meta-review gate application (`applyMetaReviewGateOnConvergence`) is called inline, and its result directly determines the next state transition. There's no indirection point where an operator could say "pretend this gate passed."

**How the proposed architecture helps:** With gates extracted as a composable pipeline in the domain layer:
1. Each gate is a `GateEvaluator` with a standard interface: `(input) → GateDecision`
2. The orchestrator runs gates in sequence from a `GatePipeline`
3. The pipeline supports a `skipList` — gates the operator has marked to bypass
4. `skip-gate` command simply adds the gate to the bubble's skip list and, if the bubble is currently blocked on that gate, triggers re-evaluation of the pipeline
5. The skip is recorded in the transcript, making it auditable

This turns gates from hardwired inline calls into a configurable, operator-controllable pipeline.

### Pain Point 4: Cannot inject a message to an agent without formal protocol

**Problem:** The operator sometimes wants to give direct guidance to an agent — "ignore that file," "try a different approach," "focus on tests first." Currently, the only way to communicate with agents is through the formal `ask-human` → `reply` cycle, which **the agent initiates**, not the operator. There's no operator-initiated, low-ceremony way to nudge an agent.

**What's needed:** A `pairflow bubble inject --id <id> --target reviewer --message "..."` command that:
- Sends the message directly to the target agent's tmux pane
- Does NOT change bubble state (no state transition)
- Logs an `OPERATOR_INJECT` envelope in the transcript (audit trail)
- Fire-and-forget from the operator's perspective — no reply expected
- Works regardless of current bubble state (RUNNING, WAITING_HUMAN, etc.)

**Why this is useful:** Many real situations where the operator has context the agent lacks:
- "The test failure on line 42 is a known flake, ignore it"
- "Use the pattern from `src/core/util/` not a new abstraction"
- "The reviewer already flagged this in round 2, skip it"
- "Time-box this to 5 minutes then pass"

**How the proposed architecture helps:** With a `TmuxAdapter` and `TranscriptStore` as independent adapters, this is a trivial orchestrator:
1. `TranscriptStore.append(OPERATOR_INJECT envelope)` — audit trail
2. `TmuxAdapter.sendMessage(sessionName, targetPaneIndex, message)` — delivery

No domain logic, no state change, no gates. ~15 lines of orchestrator code.

### Pain Point 5: Cannot change bubble config without restart

**Problem:** `bubble.toml` is read once at bubble start and cached. If `max_rounds` is too low, or `watchdog_timeout_minutes` is too aggressive, the operator must stop the bubble, edit the TOML, and restart — losing agent context in the process.

**What's needed:** A `pairflow bubble config --id <id> --set max_rounds=12` command.

**Simplest viable implementation:** No hot-reload infrastructure needed. Just:
1. The command edits `bubble.toml` directly (write the new value)
2. Runtime code reads `bubble.toml` at each decision point where the value matters (e.g., read `max_rounds` when checking round limit, read `watchdog_timeout_minutes` when watchdog runs) instead of using a cached snapshot
3. Transcript gets an `OPERATOR_CONFIG_CHANGE` envelope for audit

This is a "re-read the file" approach, not a pub/sub or config-watcher pattern. The cost is one extra file read per decision point — negligible for a TOML file.

**What changes architecturally:** Config access shifts from "read once, pass everywhere" to "read at decision point." With a `ConfigLoader` adapter, this is a single function: `loadBubbleConfig(bubbleDir)` — called wherever a config value is needed. The current prop-drilling of individual config fields through function parameters actually becomes simpler: instead of threading `maxRounds` through 5 function signatures, the orchestrator reads it when it needs it.

**Scope limit:** Only "safe" config values should be hot-changeable (e.g., `max_rounds`, `watchdog_timeout_minutes`, `quality_mode`). Structural config like `work_mode`, `agents.implementer`, or `base_branch` should require a restart — changing these mid-flight has complex side effects.

### Architectural Implication

All five pain points share a common theme: **the system couples "normal flow" too tightly with "all possible flows."** The state machine and agent lifecycle were designed for the happy path (and its error branches), but not for operator intervention as a first-class concern.

The proposed layered architecture naturally addresses this because:
- **Operator commands** are just additional orchestrators that use the same domain + infrastructure building blocks in different combinations
- **The domain core doesn't need to change** — operator overrides bypass domain validation by design
- **Infrastructure adapters** (StateStore, TmuxAdapter) are reusable across normal flow and operator intervention

The key insight, expressed as a design rule:

```
CLI command (normal flow)          → orchestrator → domain + adapters
CLI command (operator intervention) → orchestrator → SAME adapters, different composition
```

Operator intervention commands **do not require new infrastructure** — they use the same adapters (StateStore, TmuxAdapter, TranscriptStore, ConfigLoader), just in a different order, with less validation, and with an explicit audit trail. The refactor's value is not just code cleanliness — it's about **making the system operationally flexible** without ad-hoc hacks.

### Summary of Operator Intervention Commands (enabled by refactor)

| Command | What it does | Requires from architecture |
|---------|-------------|---------------------------|
| `bubble set-state --force` | Override bubble state | StateStore as independent adapter |
| `bubble restart-agent` | Respawn single agent pane | TmuxAdapter + AgentPaneInitializer separated from startBubble |
| `bubble skip-gate` | Bypass a stuck/unnecessary gate | Gates as composable pipeline, not inline calls |
| `bubble inject` | Send message directly to agent pane | TmuxAdapter + TranscriptStore as independent adapters |
| `bubble config --set` | Change config value mid-flight | ConfigLoader reads at decision point, not cached snapshot |

---

## 9. Design Gaps — What the Proposed Architecture Should Accommodate

After reviewing additional pain points documented in `codex-first-idea.md`, several future capabilities are not yet naturally supported by the proposed four-layer architecture. This section identifies the **minimum design modifications** needed to keep the architecture open to these capabilities — without implementing them now.

### Gap 1: No unified mutation pipeline (BubbleMutationRunner)

**The problem my design misses:** The Orchestrator layer pattern ("read state → call domain → write state → emit metrics → deliver") is the right flow, but every orchestrator would re-implement the transcript+state mutation step with its own conflict handling, recovery narrative, and retry logic — exactly the duplication we're trying to eliminate.

**What to add:** A `BubbleMutationRunner` in the infrastructure layer — a reusable pipeline that every orchestrator calls:

```
1. Read state snapshot (with fingerprint)
2. Receive domain decision (next state + envelopes to append)
3. Append envelopes to transcript (transcript-first ordering preserved)
4. Persist next state with expected fingerprint/state guards
5. Return standardized MutationOutcome (success | conflict | recovery_needed)
```

**Design modification:** Add `BubbleMutationRunner` to the Infrastructure layer, between StateStore and TranscriptStore. Orchestrators never call StateStore and TranscriptStore directly for mutations — they go through the runner. This eliminates the duplicated conflict/recovery patterns currently in 6+ files.

```
Orchestrator → BubbleMutationRunner → StateStore + TranscriptStore
                                    → returns MutationOutcome
```

**Impact on current design:** The Orchestrator layer becomes even thinner — it doesn't handle mutation mechanics at all. Operator intervention commands also use the runner (with simpler domain decisions).

### Gap 2: TmuxAdapter is too low-level — need AgentAdapter

**The problem my design misses:** My design has `TmuxAdapter` for session/pane operations, but tmux is an implementation detail. The real abstraction is "agent session" — start, send instruction, check health, restart. Currently `codex` and `claude` are hardcoded in several places. Future needs include: swapping agents per role, different session lifecycle policies (persistent vs per-round), and agent health monitoring beyond simple timeouts.

**What to add:** Replace `TmuxAdapter` with `AgentAdapter` as the primary interface:

```typescript
interface AgentAdapter {
  startSession(role: AgentRole, config: SessionConfig): Promise<SessionHandle>
  sendInstruction(session: SessionHandle, message: string): Promise<void>
  healthCheck(session: SessionHandle): Promise<HealthStatus>
  restartSession(session: SessionHandle): Promise<SessionHandle>
}
```

`TmuxAgentAdapter` becomes one implementation. The adapter encapsulates agent-specific differences (Claude needs trust prompt acceptance, Codex has different env setup, etc.).

**Design modification:** In the architecture diagram, `TmuxAdapter` becomes `AgentAdapter` (with `TmuxAgentAdapter` as the implementation). This also makes `bubble restart-agent` trivial — it's just `agentAdapter.restartSession(handle)`.

### Gap 3: Gate evaluators need a pipeline contract, not just pure functions

**The problem my design misses:** My design extracts gates as pure functions `(input) → GateDecision`, which is correct for testability. But it doesn't formalize them as a **composable pipeline** with:
- Standard outcome contract: `pass | warn | block` + `reason_code`
- Ordered execution with short-circuit on `block`
- Skip-list support (for operator `skip-gate` command)
- Configuration at repo and bubble level

**What to add:** A `GatePipeline` concept in the domain layer:

```typescript
interface GateEvaluator {
  id: string  // e.g., "meta-review", "doc-contract", "summary-verifier"
  evaluate(context: GateContext): GateOutcome  // pass | warn | block
}

interface GatePipeline {
  run(gates: GateEvaluator[], context: GateContext, skipList: string[]): PipelineResult
}
```

**Design modification:** The domain layer gets a `GatePipeline` runner alongside individual `GateEvaluator` implementations. The pipeline itself is pure (no I/O). The orchestrator loads gate config, builds the skip-list, prepares the `GateContext` (including history if needed), and calls the pipeline.

### Gap 4: No place for evidence as a first-class concept

**The problem my design misses:** Currently, evidence (test results, review findings, meta-review reports) is treated as "data that arrives" — there's no schema, no validation boundary, and gates consume raw/parsed summary text. The future direction is structured evidence with runtime-recorded data (exit codes, log hashes, worktree fingerprints) replacing agent-claimed text.

**What to add:** An `Evidence` concept in the domain layer:

```typescript
interface StructuredEvidence {
  run_id: string
  evidence_type: "test_run" | "review_findings" | "meta_review_report"
  structured_data: Record<string, unknown>  // schema-validated per type
  // ... exit_code, log_ref, log_hash, worktree_fingerprint etc.
}
```

**Design modification:** Gate evaluators accept `StructuredEvidence` instead of raw parsed data. An `EvidenceAdapter` in the infrastructure layer handles recording and retrieval. This doesn't need to be built now, but the gate interface should accept evidence objects rather than raw strings — so when structured evidence arrives later, gates don't need to change.

### Gap 5: Prompts are scattered — no registry concept

**The problem my design misses:** Reviewer guidance, implementer kickoff prompts, meta-reviewer instructions, and model-specific overrides are currently built inline in `runtime/*.ts` files (reviewerGuidance.ts, reviewerCommandGateGuidance.ts, reviewerScoutExpansionGuidance.ts, etc.). My architecture has no place for prompt management.

**What to add:** A `PromptRegistry` in the infrastructure layer that loads prompts from a structured source (YAML files or similar). The orchestrator asks the registry for a prompt by scenario+role, and the registry handles fragment composition and model-specific overrides.

**Design modification:** Add `PromptRegistry` to infrastructure. The current `reviewer*Guidance.ts` files become prompt definitions (data) rather than code. The orchestrator calls `promptRegistry.render("reviewer_handoff", context)` instead of building strings inline.

**Scope limit:** This is a future capability. For now, the modification is just: don't build prompt strings inside orchestrators. Delegate to a `buildPrompt(scenario, context)` function that can later be backed by a registry.

### Gap 6: Legacy compatibility needs an explicit boundary

**The problem my design misses:** My design doesn't explicitly isolate legacy concerns. The current codebase has legacy summary parsers, old state format handling, and backward-compatible envelope routing scattered across the domain logic. Without an explicit boundary, these will leak into the new domain core.

**What to add:** A `LegacyAdapter` layer between infrastructure and domain:

```
External input → LegacyAdapter (normalize to canonical format) → Domain Core
```

**Design modification:** Legacy summary parsing, old findings format handling, and backward-compatible routing live exclusively in `LegacyAdapter`. The domain core only works with canonical, structured types. When legacy support is no longer needed, the adapter is removed — no domain changes required.

### Updated Architecture Diagram

```
┌─────────────────────────────────────────────────────┐
│  CLI Layer                                          │
│  Responsibility: argument parsing + invoke          │
└──────────────────────┬──────────────────────────────┘
                       │
┌──────────────────────▼──────────────────────────────┐
│  Orchestrator Layer                                 │
│  Responsibility: coordinate domain + infrastructure │
│  Pattern: load config → read state → call domain    │
│           → mutate via runner → deliver → emit      │
│  Uses BubbleMutationRunner for all state changes    │
└──────────┬────────────────────────┬─────────────────┘
           │                        │
┌──────────▼───────────────┐  ┌────▼──────────────────────┐
│  Domain Core (pure)      │  │  Infrastructure /          │
│                          │  │  I/O Adapters              │
│  ├─ State Machine        │  │                            │
│  │                       │  │  ├─ BubbleMutationRunner   │
│  ├─ Convergence Policy   │  │  │  (transcript+state      │
│  │  Engine               │  │  │   atomic mutation) [NEW] │
│  │                       │  │  │                          │
│  ├─ Gate Pipeline        │  │  ├─ StateStore              │
│  │  composable, with     │  │  │                          │
│  │  skip-list [UPGRADED] │  │  ├─ TranscriptStore         │
│  │                       │  │  │                          │
│  ├─ Evidence types       │  │  ├─ AgentAdapter            │
│  │  (schema, not raw     │  │  │  (replaces TmuxAdapter)  │
│  │   strings) [NEW]      │  │  │  [UPGRADED]              │
│  │                       │  │  │                          │
│  ├─ Findings Resolver    │  │  ├─ PromptRegistry          │
│  │                       │  │  │  (future: YAML-backed)   │
│  ├─ Envelope Builder     │  │  │  [NEW]                   │
│  │                       │  │  │                          │
│  └─ Handoff Router       │  │  ├─ EvidenceAdapter         │
│                          │  │  │  (future: structured     │
│                          │  │  │   evidence) [NEW]        │
│                          │  │  │                          │
│                          │  │  ├─ LegacyAdapter           │
│                          │  │  │  (normalize old formats)  │
│                          │  │  │  [NEW]                   │
│                          │  │  │                          │
│                          │  │  ├─ MetricsDispatcher       │
│                          │  │  │                          │
│                          │  │  ├─ GitAdapter              │
│                          │  │  │                          │
│                          │  │  └─ ConfigLoader            │
└──────────────────────────┘  └────────────────────────────┘
```

### Summary of Changes vs Original Design

| Component | Original Design | Modified Design | Why |
|-----------|----------------|----------------|-----|
| Mutation handling | Each orchestrator calls StateStore + TranscriptStore | `BubbleMutationRunner` encapsulates the atomic mutation pattern | Eliminates duplicated conflict/recovery in 6+ files |
| Agent I/O | `TmuxAdapter` (too specific) | `AgentAdapter` interface with `TmuxAgentAdapter` impl | Enables agent swap, per-role lifecycle, health monitoring |
| Gate evaluation | Pure functions `(input) → decision` | `GatePipeline` with `pass\|warn\|block` contract + skip-list | Enables operator skip-gate, repo/bubble-level config |
| Evidence | Raw parsed data passed to gates | `StructuredEvidence` types in domain, `EvidenceAdapter` in infra | Future: runtime-recorded evidence replaces agent-claimed text |
| Prompts | Not addressed | `PromptRegistry` in infrastructure | Prompts currently scattered in 5+ runtime files |
| Legacy | Not explicitly isolated | `LegacyAdapter` normalizes old formats before domain | Keeps domain core clean, legacy removable without domain changes |

**Design principle:** None of these additions need to be fully implemented in the first refactor. The key is that the **interfaces exist** — even as thin pass-through wrappers initially — so that future capabilities slot in without restructuring.

---

## 10. Open Questions

1. **Orchestrator granularity:** one orchestrator per CLI command, or coarser grouping (e.g., `agentCommandOrchestrator` for pass+converge+askHuman)?
2. **Dependency injection style:** constructor injection on class-based orchestrators, or function parameter injection (current pattern)?
3. **First pilot:** start with Milestone 1 (convergence policy extraction) or Milestone 4 (infrastructure abstractions)?
4. **Error hierarchy:** introduce a `PairflowError` base class with `code` + `context` fields, or keep flat with better re-wrapping?
5. **Testing strategy shift:** once domain core is pure, switch to property-based testing for policy logic?
