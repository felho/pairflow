# Bob master.md — Learnings for pairflow v2 workflow engine

Date: 2026-03-07
Source: /Users/felho/dev/bob/docs-orig/master.md

## What is Bob?

A vision document for a unified SDLC platform ("Bob") that combines session management, workflow orchestration, and multi-channel interaction. It covers the full lifecycle from research through implementation, with a focus on gradual trust (auto-resolve thresholds), headless-first architecture, and pluggable quality gates.

## Directly relevant concepts

### 1. Stage types — richer than our "step" concept

Bob defines 4 stage types:
- `sequential` — simple step sequence
- `loop` — repeating (validate -> fix)
- `parallel-human-queue` — parallel human decisions on multiple items
- `parallel-step-loop` — parallel step execution with dependency graph

The first-idea Step Graph is more linear. Bob reminds us that **loop as a first-class stage type** is needed — the pairflow v1 implement->review loop is exactly this, but hardcoded.

### 2. Gate registry — more mature plugin model

Bob gate types: `hard`, `human`, `llm-judge`, `composite`. This is richer than our "Plugin evaluate -> pass|block" model. The `llm-judge` type is especially interesting: a gate that calls an LLM, gets a confidence score, and auto-resolves above a threshold.

This would solve pairflow v2's reviewer convergence being binary — instead, **gradual trust** where the system learns when a human is needed and when it is not.

### 3. Agent composition — 4-dimensional decorator

In Bob, an agent is not fixed but configurable across 4 axes:
- **Persona** — who the agent is (skeptical architect, etc.)
- **Skills** — domain knowledge
- **Mode** — cognitive function (debugger, builder, critic)
- **Approach** — work style (thorough, rapid, adversarial)

This is much more flexible than our "agent: codex / agent: claude" mapping. In v2, a step would not just name the agent but specify the agent's **decoration**.

Resolution order: step-level config > agent defaults > system defaults. Any unknown key becomes a custom prompt fragment — open-ended extensibility.

### 4. Just-in-time context extraction (CHECK loop)

Large documents should not be made globally consistent — instead, extract per-step context and validate that. Step-level refinement converges (7-8 iterations); global never does.

Applicable to pairflow v2 subflow/help concept: when an agent is stuck, do not reprocess the full context. Generate a **focused context packet** for the specific question.

### 5. Headless-first / adapter pattern = our Channel concept

Bob says exactly what the first-idea Channel abstraction says, but more deeply worked out: Web UI, Slack, GitHub, CLI are all equal adapters consuming a Platform API. This validates the Channel direction.

Key insight: **the API contract defines the system, not any particular UI.**

### 6. Gradual trust model

Auto-resolve threshold that changes over time based on agent reliability. In pairflow v1 this does not exist (always human approval). In v2 it could: if the agent reviewed correctly 10 times, perhaps auto-resolve certain P2/P3 findings.

Measured auto-resolve ratios from Bob's experience:

| Phase | Human decisions needed | LLM can auto-resolve |
|---|---|---|
| Design doc refinement | ~70% | ~30% |
| Step packet CHECK | ~20% | ~80% |
| Step VALIDATE -> FIX | ~5% | ~95% |

### 7. Findings file pattern — universal across workflows

The pattern: validate creates a findings file, fix reads it, validate deletes on pass. Same pattern in PRD review and step implementation. Should be a first-class artifact type.

### 8. Provenance chains for traceability

Every workflow event should carry: `run_id`, `step_id`, `agent_config` snapshot, `model_id`, `timestamp`. This enables regression detection when models update or process changes.

Not needed for v2 MVP, but the state layer and transcript format should be designed so these fields can be added without migration.

## What to adopt in the workflow engine

| Bob concept | Pairflow v2 equivalent | Added value |
|---|---|---|
| Stage types (seq/loop/parallel) | Step type enum in workflow def | Native loop and parallel support |
| Gate registry (hard/human/llm-judge) | Gate plugin with type field | LLM-judge gates -> gradual automation |
| Agent decorator (persona/skills/mode/approach) | Step-level agent config | Flexible agent configuration per step |
| `auto_resolve` threshold | Gate-level config | Gradual automation |
| Provenance chains | Event fields in transcript | Traceability, regression detection |
| Findings file pattern | Standardized artifact type | Universal validate -> fix loop |

## What is NOT needed now (but keep the door open)

- **Session management / data layer** — session backup, FTS indexing, cloud sync. Not core workflow engine, but the state layer should be designed so it can be built on top.
- **Analysis plugins** — antipattern detection, confidence calibration. Intelligence layer, later.
- **Team layer** — multi-user, auth. Not needed for single-user tool.
- **Parallel-step-loop dependency graph** — complex, not v2.0, maybe v2.1.

## Updated entity model (learning from Bob)

Original first-idea entities + additions from Bob:

| Entity | Update |
|---|---|
| **Step** | Gets `type` field: `sequential`, `loop`, `action`, `subflow` |
| **Gate** | Gets `gate_type`: `hard`, `human`, `llm-judge`, `composite` |
| **Plugin** | Stays, but gate type determines plugin behavior |
| **Agent Config** | New: not just agent name but decorator (persona, skills, mode, approach + custom keys) |
| **Findings** | New first-class artifact type: standardized validate -> fix pattern |
| *(new)* **Trust Profile** | Per-gate auto-resolve thresholds, evolving over time |
