# Claude vs Codex — v2 Architecture Comparison

Date: 2026-03-07
Scope: comparing docs/v2/claude/ and docs/v2/codex/ across all three documents

## Overall framing

Both arrive at essentially the same core metaphor but name it differently:

| | Claude | Codex |
|---|---|---|
| Core metaphor | "Workflow as a Graph" | "Workflow Kernel + Channel Adapters" |
| Bubble = | Flow Instance | WorkflowInstance |
| Config = | Workflow Definition (YAML) | WorkflowTemplate |
| Permissions = | Role Scope (per step allowlist) | CapabilityProfile (Role x State matrix) |
| Policy = | Plugin (composable gate plugins) | PolicyModule (standalone rule modules) |
| Communication = | Channel | Channel Adapter (same concept) |
| Sandbox = | Executor | RuntimeTarget |
| Help = | Subflow | HelpRequest subworkflow |

The vocabulary differs but the architecture is converging on the same shape.

## Where we agree

### 1. Declarative workflow definitions
Both say the v1 hardcoded pipeline must become a configurable, declarative workflow template. v1 behavior = default preset.

### 2. Channel abstraction
Both independently arrive at: CLI, Slack, GitHub, etc. are equal adapters. The kernel/engine is channel-agnostic. Codex explicitly calls the input normalization step "EventEnvelope" which is a useful addition.

### 3. Composable policy/gate modules
Both reject the monolithic convergence policy. Both propose standalone, pluggable modules that can be combined. Same direction, different granularity (see disagreements below).

### 4. Help subworkflow
Both model the "agent needs help" case as a first-class subworkflow, not an ad-hoc WAITING_HUMAN state. Both agree it should be channel-agnostic.

### 5. Remote sandbox as abstraction
Both agree sandbox execution should be behind an adapter (Executor / RuntimeTarget). Both mention reconnect handling.

### 6. v1 compatibility
Both agree v2 should not break v1 — the current behavior should be expressible as a workflow preset.

### 7. Hook-based enforcement (from hivemind)
Both identify hooks as a stronger enforcement mechanism than CLI-only validation. The agent cannot bypass what the system injects.

### 8. Session-independent agent identity (from hivemind)
Both flag TTY-based identity as an important pattern for agent recovery across session resets.

### 9. State layer abstraction (from hivemind)
Both say the scattered v1 state files (state.json, transcript.ndjson, bubble.toml) should be behind a unified state API.

### 10. Stage types from Bob
Both adopt Bob's stage type taxonomy (sequential, loop, parallel-human-queue, parallel-step-loop) as first-class primitives.

### 11. Provenance fields
Both agree: event schema should carry provenance (run_id, step_id, agent_config, model_id) from day one, even if analysis comes later.

## Where we differ

### 1. Permission model granularity

**Claude:** Per-step `allowed_commands` / `denied_commands` allowlist. Simple, step-level. Example: `implement` step allows `[pass, ask-human]`, denies `[bubble-delete, converged]`.

**Codex:** `CapabilityProfile` as a Role x State matrix. More formal — a full matrix where permissions depend on both the current role AND the current state. Also proposes it as a named entity.

**Assessment:** Codex's approach is more rigorous. A step-level allowlist might not capture cases where the same role has different permissions depending on which state the flow is in (e.g., implementer in RUNNING vs implementer in WAITING_HUMAN). The matrix model handles this. **Adopt Codex's CapabilityProfile as the model, but keep per-step config as a convenient shorthand that compiles down to it.**

### 2. Event normalization

**Claude:** No explicit event normalization layer. Channel sends messages, kernel processes them.

**Codex:** Explicit `EventEnvelope` as a normalization step between channel input and kernel. All inputs become channel-agnostic events before the kernel sees them.

**Assessment:** Codex is right — an explicit normalization layer prevents the kernel from knowing about channel specifics. This is a cleaner separation. **Adopt EventEnvelope.**

### 3. Gate taxonomy

**Claude (first-idea):** Gates are composed of Plugins. Plugin interface: `evaluate() -> pass | block`. Gate passes when all plugins pass. No gate types.

**Claude (bob-learnings):** Updated to include gate types: `hard`, `human`, `llm-judge`, `composite`.

**Codex:** `PolicyModule` as standalone rule modules. `GateDecision` as the output with `allow | block | defer` (three outcomes, not two).

**Assessment:** The three-outcome model (allow/block/**defer**) from Codex is better than binary pass/block. "Defer" means "I cannot decide, escalate to human" — this is different from "block" (definitely no) and captures the real-world case where a policy is uncertain. Combined with Bob's gate types, the model becomes: gate type determines HOW the decision is made, PolicyModule determines WHAT is checked, GateDecision has three outcomes. **Adopt the three-outcome GateDecision from Codex.**

### 4. Agent composition depth

**Claude (bob-learnings):** Extensively covers 4-dimensional agent decorator (persona, skills, mode, approach) from Bob. Proposes step-level agent config with full decoration.

**Codex:** Simpler model — `Role` (implementer/reviewer/operator/human) + `Actor` (Codex, Claude, user, automation bot). No decorator dimensions.

**Assessment:** Claude's direction from Bob is richer and more forward-looking, but for v2 MVP the Codex Role + Actor separation is pragmatically sufficient. **Keep Codex's Role/Actor split as the base, but design it so Bob's decorator dimensions can be layered on later as Agent Config.**

### 5. Policy drift warning

**Claude:** Does not explicitly flag the risk of policy logic being scattered.

**Codex (hivemind-learnings, Avoid section):** Explicitly warns against "policy logic scattered across multiple hooks/scripts/tools (drift risk)". Recommends centralizing policy in the kernel, not in hooks.

**Assessment:** This is an important tension. Claude recommends hook-based enforcement (from hivemind), Codex warns that too much logic in hooks leads to drift. Both are right — **hooks should ENFORCE policy decisions, but the policy logic itself should live in the kernel's PolicyModules.** Hooks are the enforcement point, not the decision point.

### 6. Implicit vs explicit state

**Claude (hivemind-learnings):** Recommends advisory + hard lock levels. More flexible.

**Codex (hivemind-learnings):** Explicitly warns against implicit permissions. Demands explicit CapabilityProfile.

**Assessment:** Not contradictory — advisory locks are about file conflicts, explicit capabilities are about command permissions. Both can coexist. Advisory file locking + explicit command capabilities.

### 7. Minimal next steps

**Claude:** No concrete next steps proposed — stays at entity model level.

**Codex:** Proposes concrete artifacts in all three docs:
1. `workflow-template-v0` structure with stage types
2. `capability-matrix-v0` (Role x State x Action)
3. `gate-registry-v0` interface
4. `event-schema-v0` with provenance fields

**Assessment:** Codex is more actionable. **Adopt Codex's next steps as the v2 work plan.**

## What to adopt from Codex into Claude's model

| Codex concept | Why adopt | How it changes Claude's model |
|---|---|---|
| **EventEnvelope** | Clean channel/kernel separation | Add explicit normalization layer between Channel and kernel |
| **CapabilityProfile** (Role x State matrix) | Richer than per-step allowlist | Replace Role Scope with CapabilityProfile; per-step config compiles to matrix |
| **GateDecision: allow/block/defer** | Three outcomes > two | Update Plugin interface to return `pass | block | defer` |
| **Role + Actor split** | Cleaner than conflating role with agent | Role = what position (implementer, reviewer); Actor = who fills it (Claude, Codex) |
| **Policy in kernel, enforcement in hooks** | Prevents policy drift | Hooks call kernel for decisions, kernel holds PolicyModules |
| **Concrete next steps** | Actionable | Adopt the four v0 artifacts as immediate deliverables |

## What to keep from Claude that Codex misses

| Claude concept | Why keep | What Codex lacks |
|---|---|---|
| **Agent decorator model** (from Bob) | Future flexibility for agent composition | Codex has flat Role+Actor, no decoration dimensions |
| **Trust Profile** (from Bob) | Gradual automation is a key v2 differentiator | Codex mentions trust briefly but does not model it |
| **Executor interface** (provision/exec/sync/health) | More concrete sandbox API than "RuntimeTarget" | Codex names the concept but does not spec the interface |
| **Advisory + hard levels** for file scope | Pragmatic flexibility | Codex only mentions explicit capabilities, not graduated levels |
| **Findings as first-class artifact** (from Bob) | Universal validate -> fix loop | Codex does not surface this pattern |

## Merged entity model

Combining the best of both:

| Entity | Source | Description |
|---|---|---|
| **WorkflowTemplate** | Codex naming | Declarative step graph with stage types (seq/loop/parallel) |
| **WorkflowInstance** (bubble) | Both | Running state, artifacts, transcript |
| **Step** | Both | Unit of work with `type` field (sequential, loop, action, subflow) |
| **Role** | Codex | Position in workflow (implementer, reviewer, operator, human) |
| **Actor** | Codex | Concrete executor (Claude, Codex, user, bot) |
| **AgentConfig** | Claude/Bob | Decorator: persona, skills, mode, approach + custom keys (layered on Actor) |
| **CapabilityProfile** | Codex | Role x State permission matrix |
| **EventEnvelope** | Codex | Normalized, channel-agnostic event |
| **Channel** | Both | Communication adapter (CLI, Slack, GitHub, tmux) |
| **Gate** | Both | Blocking condition at step boundary |
| **PolicyModule** | Codex naming | Standalone rule module (convergence, docs, approval, security) |
| **GateDecision** | Codex | Three outcomes: allow / block / defer |
| **Subflow** | Both | Embedded mini-workflow (help, escalation) |
| **Executor** | Claude | Sandbox abstraction (local, SSH, container, cloud) |
| **Findings** | Claude/Bob | First-class artifact type for validate -> fix loops |
| **Trust Profile** | Claude/Bob | Per-gate auto-resolve thresholds |
| **Transcript** | v1 carry-over | Append-only NDJSON event log with provenance fields |
