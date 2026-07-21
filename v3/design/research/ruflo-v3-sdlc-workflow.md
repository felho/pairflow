# Ruflo v3 SDLC Workflow Research

Date: 2026-06-13

## Purpose

This note captures what Pairflow v3 can learn from the Ruflo v3 development workflow, especially around specification, DDD, pseudocode, ADRs, and delayed implementation.

Source repository:

- `/Users/felho/dev/repos-to-learn-from/ruflo/v3`
- `/Users/felho/dev/repos-to-learn-from/ruflo/plugins`

The goal is not to copy Ruflo's process wholesale. The goal is to extract practices that can improve Pairflow v3's core model convergence work, especially while the model is still being clarified before implementation.

Pairflow-native method distilled from this research:

- [`../design-method-playbook.md`](../design-method-playbook.md)

## Executive Summary

Ruflo v3 is not primarily organized around a classic `PRD.md -> code` flow. Its stronger pattern is a SPARC-style SDLC pipeline:

```text
Specification -> Pseudocode -> Architecture -> Refinement/TDD -> Completion
```

In this model, the PRD role is mostly played by the `Specification` phase: requirements, scope, constraints, acceptance criteria, success metrics, and related boundary clarification.

The most relevant idea for Pairflow v3 is the explicit `Pseudocode` phase. For Pairflow, this should not mean algorithm-heavy pseudocode in the usual data-structure sense. It should mean protocol/state-machine pseudocode that clarifies workflow behavior before TypeScript implementation or before the HTML core model becomes too visually polished to challenge.

The strongest immediate Pairflow takeaway:

```text
provisional domain language -> protocol pseudocode -> DDD correction -> revised protocol pseudocode -> architecture decision -> implementation
```

ADRs are useful, but probably later and selectively. For the current Pairflow v3 convergence stage, pseudocode would likely create more value than a broad ADR process because many open questions are behavioral precision questions, not yet final decision-record questions.

The separate `ruflo/plugins` directory appears to contain a newer and more operationalized form of the same ideas. The v3 repository explains the SDLC mental model. The plugin family turns parts of that model into installable surfaces with skills, agents, commands, plugin-level ADRs, smoke contracts, namespace ownership, and phase-to-plugin responsibility boundaries.

## Ruflo SDLC Model

### 1. Specification

Ruflo's `Specification` phase acts as the PRD-like entry gate. It focuses on:

- requirements,
- constraints,
- scope,
- acceptance criteria,
- stakeholder/use-case framing,
- success metrics,
- edge cases and scenarios.

Important source files:

- `/Users/felho/dev/repos-to-learn-from/ruflo/v3/@claude-flow/mcp/.claude/agents/sparc/specification.md`
- `/Users/felho/dev/repos-to-learn-from/ruflo/v3/@claude-flow/cli/.claude/agents/sparc/specification.md`

Pairflow interpretation:

Pairflow probably does not need a heavyweight PRD for every v3 concept. A small "specification gate" per convergence level could be enough:

- What user/workflow problem is this level validating?
- What is in scope?
- What is explicitly out of scope?
- What acceptance evidence proves the level is coherent?
- What later concept must remain possible?

### 2. Pseudocode

Ruflo treats pseudocode as a first-class bridge between specification and implementation. It is used to clarify:

- logic flow,
- algorithms,
- data structures,
- subroutines,
- edge cases,
- complexity,
- implementation roadmap.

Important source files:

- `/Users/felho/dev/repos-to-learn-from/ruflo/v3/@claude-flow/mcp/.claude/agents/sparc/pseudocode.md`
- `/Users/felho/dev/repos-to-learn-from/ruflo/v3/@claude-flow/cli/.claude/agents/sparc/pseudocode.md`

Pairflow interpretation:

For Pairflow, pseudocode should be adapted to protocol design. The useful form is not:

```text
Sort items by priority.
Loop over array.
Return result.
```

The useful form is:

```text
HandleEnvelope(envelope):
  validate envelope shape
  load workflow instance by envelope.instance_id
  reject if expected_version does not match current version
  check idempotency using the defined op_id scope
  resolve transition from current lifecycle/position and event type
  atomically append transcript entry and update state
  return committed, duplicate, stale, or rejected outcome
```

This would help Pairflow clarify L0a questions such as:

- Is `template_ref` immutable for the lifetime of an instance?
- What exactly is the `op_id` idempotency scope?
- Is transcript append plus state update a single logical commit?
- What happens for duplicate, stale, invalid, or rejected envelopes?
- What is lifecycle state vs execution position?
- Which behavior belongs in L0a, and which belongs in L0b or later?

### 2.1 Pseudocode vs DDD Ordering Tension

Ruflo's written SPARC flow places `Pseudocode` before `Architecture`. At first glance this is odd for domain-heavy systems: pseudocode needs nouns and verbs, and those terms should ideally come from the system's domain model and ubiquitous language.

Ruflo does not fully resolve this as an explicit process rule. Instead, it appears to rely on a softer progression:

1. `Specification` introduces provisional domain terms through definitions, use cases, actors, flows, acceptance criteria, data model sketches, and API shapes.
2. `Pseudocode` uses those provisional terms to make the behavior executable enough to inspect.
3. `Architecture` and DDD agents later formalize, rename, split, or reject those terms.
4. In a real domain-heavy workflow, the pseudocode should then be revised after the DDD correction.

So the practical flow is less linear than the SPARC diagram suggests:

```text
Specification gives provisional nouns/verbs.
Pseudocode stress-tests those nouns/verbs as behavior.
DDD/Architecture formalizes the domain language and boundaries.
Pseudocode is updated to reflect the corrected model.
```

This matters for Pairflow because the core model is protocol/domain-heavy, not a simple CRUD feature. Pairflow should not wait until "Architecture" to introduce domain language, but it also should not pretend that early domain language is final.

For Pairflow, the safer adaptation is:

```text
Specification
-> provisional domain vocabulary
-> protocol pseudocode
-> DDD correction/formalization
-> revised protocol pseudocode
-> selective ADR
-> implementation task
```

For L0a, the provisional vocabulary should be just enough to write precise pseudocode:

- `WorkflowTemplate`
- `WorkflowInstance`
- `LifecycleState`
- `ExecutionPosition`
- `Envelope`
- `Transition`
- `TranscriptEntry`
- `ExpectedVersion`
- `OperationId`
- `KernelCommit`

The DDD pass then checks whether these are the right terms and boundaries. For example, it may reveal that `Envelope` is too broad, `KernelCommit` deserves to be explicit, `OperationId` needs a precise scope, or `WorkflowTemplate` must be represented by an immutable `template_ref`.

The `ruflo/plugins` version clarifies this tension better than the older v3 SPARC materials. In `ruflo-sparc`, the `sparc-implement` skill combines Phase 2 and Phase 3 because they are "tightly coupled": pseudocode informs module boundaries and architecture informs the algorithmic design. This does not fully invert the SPARC order, but it does make the real workflow less waterfall-like.

More importantly, the `ruflo-ddd` plugin's `domain-modeler` starts its workflow by extracting nouns, verbs, and rules from requirements to build a glossary. That is exactly the missing bridge before pseudocode: not a full DDD architecture, but a provisional domain vocabulary.

For Pairflow, this confirms the safer sequence:

```text
requirements/specification
-> provisional nouns, verbs, and rules
-> protocol pseudocode
-> DDD correction/formalization
-> revised protocol pseudocode
```

### 3. Architecture and DDD

Ruflo uses DDD as a design lens, not only as a folder layout. Its DDD materials emphasize:

- bounded contexts,
- aggregates,
- entities,
- value objects,
- domain events,
- ubiquitous language,
- context maps,
- anti-corruption layers,
- event storming outputs.

Important source files:

- `/Users/felho/dev/repos-to-learn-from/ruflo/v3/implementation/adrs/ADR-002-DDD-STRUCTURE.md`
- `/Users/felho/dev/repos-to-learn-from/ruflo/v3/@claude-flow/mcp/.claude/agents/v3/ddd-domain-expert.md`
- `/Users/felho/dev/repos-to-learn-from/ruflo/v3/@claude-flow/cli/.claude/agents/v3/ddd-domain-expert.md`
- `/Users/felho/dev/repos-to-learn-from/ruflo/v3/docs/ddd/coherence-engine/README.md`
- `/Users/felho/dev/repos-to-learn-from/ruflo/v3/docs/ddd/coherence-engine/domain-model.md`
- `/Users/felho/dev/repos-to-learn-from/ruflo/v3/docs/ddd/quality-engineering/README.md`

Pairflow interpretation:

Pairflow should avoid using "DDD" as a decorative label. If the core model says DDD, it should expose concrete DDD outputs:

- ubiquitous language,
- commands,
- events,
- aggregates or consistency boundaries,
- invariants,
- policies,
- read models/projections,
- external systems or later channels.

For L0a, candidate domain concepts include:

- `WorkflowTemplate`,
- `WorkflowInstance`,
- `Step`,
- `LifecycleState`,
- `ExecutionPosition`,
- `Transition`,
- `CommandEnvelope` or `EventEnvelope`,
- `TranscriptEntry`,
- `KernelStore`,
- `ExpectedVersion`,
- `OperationId`.

The key boundary question is whether L0a owns only the kernel skeleton, or whether actor assignment and context-packet guidance have slipped into it. Based on the v3 roadmap, actor assignment and context-packet seed should remain L0b concerns.

### 4. ADRs

Ruflo treats ADRs as first-class records for durable architecture decisions. ADR support appears both in documentation and agent prompts. ADRs capture context, options, decision, consequences, and sometimes implementation/readiness state.

Important source files:

- `/Users/felho/dev/repos-to-learn-from/ruflo/v3/implementation/adrs/README.md`
- `/Users/felho/dev/repos-to-learn-from/ruflo/v3/implementation/adrs/ADR-002-DDD-STRUCTURE.md`
- `/Users/felho/dev/repos-to-learn-from/ruflo/v3/@claude-flow/mcp/.claude/agents/v3/adr-architect.md`
- `/Users/felho/dev/repos-to-learn-from/ruflo/v3/docs/adr/ADR-099-dossier-investigator-recursive-parallel-research.md`

Pairflow interpretation:

ADRs are useful for Pairflow v3, but should be selective. They are best for decisions that create long-lived constraints or affect many future levels.

Candidate future ADRs:

- template immutability and `template_ref` semantics,
- lifecycle state vs execution position separation,
- transcript/state atomic commit semantics,
- idempotency key scope,
- internal lifecycle events as the first narrow channel abstraction,
- parent-child workflow relation and child recovery semantics,
- store ownership: dumb store vs kernel-owned semantics.

At the current stage, ADRs should not replace pseudocode. Many of the open issues still need precise behavior sketches before they become final architecture decisions.

### 5. Refinement/TDD and Completion

Ruflo places implementation after specification, pseudocode, and architecture. The later phases include TDD/refinement, review, documentation, and validation.

Important source files:

- `/Users/felho/dev/repos-to-learn-from/ruflo/v3/@claude-flow/mcp/.claude/agents/sparc/refinement.md`
- `/Users/felho/dev/repos-to-learn-from/ruflo/v3/@claude-flow/cli/.claude/agents/sparc/refinement.md`
- `/Users/felho/dev/repos-to-learn-from/ruflo/v3/@claude-flow/cli/src/commands/workflow.ts`
- `/Users/felho/dev/repos-to-learn-from/ruflo/v3/@claude-flow/cli/src/mcp-tools/guidance-tools.ts`

Pairflow interpretation:

This reinforces Pairflow's current direction: do not rush from concept brain dump to code. The missing middle is not just "architecture". It is a sequence of progressively more executable descriptions:

```text
concept -> requirement -> domain model -> protocol pseudocode -> tests/spec -> code
```

## Tooling Observations

Ruflo has several layers of support for the process:

- SPARC agents and commands under `.claude/agents/sparc` and `.claude/commands/sparc`.
- V3-specific DDD and ADR agents.
- CLI workflow template support for SPARC stages.
- MCP/guidance capability routing for SPARC methodology.
- Codex skill packaging and generators for SPARC artifacts.

Important source files:

- `/Users/felho/dev/repos-to-learn-from/ruflo/v3/@claude-flow/mcp/.claude/agents/v3/sparc-orchestrator.md`
- `/Users/felho/dev/repos-to-learn-from/ruflo/v3/@claude-flow/mcp/.claude/commands/sparc/sparc.md`
- `/Users/felho/dev/repos-to-learn-from/ruflo/v3/@claude-flow/mcp/.claude/commands/sparc/spec-pseudocode.md`
- `/Users/felho/dev/repos-to-learn-from/ruflo/v3/@claude-flow/cli/src/commands/workflow.ts`
- `/Users/felho/dev/repos-to-learn-from/ruflo/v3/@claude-flow/cli/src/mcp-tools/guidance-tools.ts`
- `/Users/felho/dev/repos-to-learn-from/ruflo/v3/@claude-flow/cli/src/mcp-tools/workflow-tools.ts`
- `/Users/felho/dev/repos-to-learn-from/ruflo/v3/@claude-flow/codex/.agents/skills/sparc-methodology/SKILL.md`
- `/Users/felho/dev/repos-to-learn-from/ruflo/v3/@claude-flow/codex/src/generators/skill-md.ts`
- `/Users/felho/dev/repos-to-learn-from/ruflo/v3/@claude-flow/codex/src/templates/index.ts`

One important caveat: some Ruflo workflow support appears stronger in prompts/docs than in runtime implementation. For example, SPARC is clearly documented in agents, commands, and skills, while some lower-level workflow tool support appears more generic or incomplete. Pairflow should treat Ruflo as a source of process patterns, not as proof that every pattern is fully operationalized in code.

## Plugin Family Observations

The `ruflo/plugins` directory contains a separate plugin family around the v3 system. These plugins are relevant because they are Ruflo-branded and appear to represent a newer operational layer over the v3 ideas.

Most relevant plugins for Pairflow v3:

- `ruflo-sparc` — SPARC lifecycle, phase gates, phase-to-plugin ownership.
- `ruflo-ddd` — domain vocabulary, bounded contexts, aggregates, domain events.
- `ruflo-adr` — ADR lifecycle, ADR graph, compliance/drift review.
- `ruflo-workflows` — persisted workflow state machine vs native fan-out workflow.
- `ruflo-goals` — deep research, dossier investigation, GOAP planning, horizon tracking.
- `ruflo-agentdb` — namespace/store semantics and memory-routing gotchas.
- `ruflo-core` — plugin-family contracts and witness/fix-regression tracking.
- `ruflo-agent` — nested subagents for context management.
- `ruflo-rvf` — session persistence and portable memory.
- `ruflo-testgen` and `ruflo-jujutsu` — refinement gate, coverage/risk/ADR compliance.

### Phase-to-Plugin Ownership

The plugin version makes SPARC more concrete by assigning canonical owners to phases:

| SPARC Phase | Plugin Owner | Role |
|---|---|---|
| Specification | `ruflo-goals` | Deep research and requirement discovery |
| Pseudocode | `ruflo-sparc` | Pseudocode generation and complexity annotation |
| Architecture | `ruflo-adr` + `ruflo-ddd` | ADRs and bounded-context modeling |
| Refinement | `ruflo-jujutsu` + `ruflo-testgen` | Diff risk, refactor review, test gap analysis |
| Completion | `ruflo-docs` | Documentation generation |

This is a useful design pattern for Pairflow v3: one orchestrating process can own the lifecycle, while sibling components own the deeper semantics of each phase.

Pairflow translation:

- the v3 roadmap can define levels,
- each level can name a capability owner,
- each owner should expose its state, events, invariants, and verification contract,
- later implementation can avoid a single over-broad "workflow engine" owning everything.

### Two Workflow Surfaces

The `ruflo-workflows` plugin makes a strong distinction between two workflow surfaces:

1. **Persisted MCP workflow definitions** — declarative, stateful, resumable, pausable, human-gated workflows.
2. **Native workflow scripts** — deterministic agent fan-out/pipeline orchestration for audit, review, migration, or research.

Neither surface subsumes the other. This is a highly relevant distinction for Pairflow v3.

Pairflow translation:

- A long-lived workflow instance with human gates, lifecycle states, transcript, wait conditions, and resume semantics is one concept.
- A short-lived fan-out orchestration that asks N agents to inspect N dimensions and aggregates their results is another concept.
- Recursive research/dossier expansion is a third concept.
- Long-horizon goal tracking is a fourth concept.

Pairflow should avoid collapsing all of these under one overloaded "workflow" abstraction too early.

### Goals, Research, Dossier, and Horizon Tracking

`ruflo-goals` distinguishes four work shapes:

| Work Shape | Ruflo Surface | Pairflow Relevance |
|---|---|---|
| A question | `deep-research` | Linear evidence-graded research |
| A seed entity | `dossier-collect` | Graph expansion with provenance per claim |
| A multi-step objective | `goal-plan` | GOAP-style planning with preconditions/effects |
| A long-running objective | `horizon-track` | Cross-session milestone tracking and drift detection |

The dossier model is especially relevant to Pairflow v3 research. It is seed-driven rather than question-driven, produces graph output rather than only a linear report, and requires provenance per claim.

Pairflow translation:

- Use linear research for questions like "what does Ruflo's SPARC workflow do?"
- Use dossier-style graph research for concepts like `WorkflowInstance`, `TranscriptEntry`, `ChildWorkflow`, or `InternalLifecycleEvent`, where relationships matter as much as prose.
- Use horizon tracking for multi-session convergence work, where decisions and open questions drift over time.

### Plugin Contract Pattern

The plugin family standardizes a lightweight but powerful contract pattern:

```text
plugin/
  README.md
  agents/
  skills/
  commands/
  docs/adrs/0001-<plugin>-contract.md
  scripts/smoke.sh
```

Each plugin-level ADR records the plugin's contract, compatibility, namespace ownership, verification surface, and related sibling contracts. The smoke script makes the contract executable enough to catch drift.

Pairflow translation:

Each v3 convergence level could have a contract block with:

- capability introduced,
- owner/boundary,
- domain terms,
- commands/events,
- invariants,
- state/store ownership,
- out-of-scope future features,
- verification evidence.

This does not need to become a plugin system. The useful part is "documentation as an executable-ish contract".

### Store and Namespace Semantics

The `ruflo-agentdb` plugin documents a subtle but important store lesson: "namespace" is not universal. Some tools route by namespace, some by tier, some by controller, and some ignore namespace-like arguments entirely.

Pairflow translation:

The v3 central store cannot be specified only as "central store". It needs explicit store semantics:

- What is the routing key?
- What owns lifecycle/GC?
- Which writes are idempotent?
- Which writes are version-checked?
- Which projections/search indexes are authoritative vs derived?
- Which namespaces or partitions are reserved?

This reinforces the earlier L0a feedback: CAS, `op_id`, idempotency scope, and store semantic ownership are kernel invariants, not later convenience features.

### ADR as Graph and Compliance, Not Only Records

The `ruflo-adr` plugin treats ADRs as:

- markdown decision records,
- lifecycle state machine (`proposed`, `accepted`, `deprecated`, `superseded`),
- causal graph (`depends-on`, `amends`, `supersedes`),
- compliance input for diff review.

Pairflow translation:

ADRs can wait until decisions are durable, but when Pairflow does adopt them, the useful target is not "write a prose ADR". The useful target is an ADR graph that can answer:

- Which decision constrains this file/module/capability?
- Has a decision been superseded?
- Does a change violate an accepted decision?
- Which decisions depend on this one?

This is probably too heavy for the current core-model drafting step, but valuable once implementation begins.

### Nested Subagents as Context Boundaries

The `ruflo-agent` plugin's nested-subagents skill says the motivation for nesting is context management, not parallelism. Each level gets a fresh context window, returns a compact summary, and carries parent/depth lineage.

Pairflow translation:

This maps cleanly to child-workflow thinking:

- A child workflow is not merely a parallel task.
- It can be a context boundary.
- It should have a summary/return contract.
- It should carry parent lineage.
- It needs depth/delegation limits or equivalent guardrails.

This strengthens the case for treating child workflow instances and internal lifecycle events as an early capability, not a late distributed-system feature.

### Session and Memory Portability

`ruflo-rvf` separates portable memory/session persistence from browser-session RVF containers and lower-level vector tooling. It also documents encryption-at-rest behavior separately from exported transfer artifacts.

Pairflow translation:

If Pairflow v3 later stores workflow definitions, transcripts, context packets, and agent handoffs centrally, it should distinguish:

- local persistence,
- cross-session resume,
- cross-machine transfer,
- exported artifacts,
- encryption-at-rest vs transport security.

This is not needed for L0a, but it is a future-facing architectural constraint worth keeping compatible with.

### Witness and Smoke-as-Contract

`ruflo-core` includes a witness toolkit: signed manifests of documented fixes with marker substrings and temporal history. More generally, every plugin's `scripts/smoke.sh` is treated as its structural contract.

Pairflow translation:

For v3 docs and models, Pairflow does not need cryptographic witness tracking yet. But the principle is useful:

- claims in architecture docs should have verification evidence,
- important fixes/decisions should have markers or tests,
- structural contracts should be checkable,
- regression of a documented invariant should be detectable.

This could later become fitness checks for v3 kernel invariants.

## Recommended Pairflow Adaptation

### Add a Protocol Pseudocode Layer to Core Model Work

For each core-model level, especially L0a-L4, add a small pseudocode section that answers:

- What command/event enters the kernel?
- What state is loaded?
- What invariants are checked?
- What transition is resolved?
- What is committed atomically?
- What transcript entry is produced?
- What errors/noops are possible?
- What remains explicitly out of scope?

This would turn visual/domain concepts into executable thinking without committing to implementation code too early.

### Use DDD as a Checklist, Not a Label

Each level should identify:

- ubiquitous language terms,
- commands,
- events,
- aggregate or consistency boundary,
- invariants,
- policies,
- read models/projections,
- external dependencies or channels.

For L0a, this likely means the core aggregate is `WorkflowInstance`, with `WorkflowTemplate` referenced immutably and `TranscriptEntry` capturing the audit stream. Actor assignment and context packet construction should remain outside L0a unless the roadmap changes.

### Keep ADRs Selective

Create ADRs only when a decision is durable, cross-cutting, or likely to constrain future levels. Avoid ADRs for every small modeling adjustment.

Good ADR candidates:

- state/transcript atomicity,
- idempotency scope,
- template versioning,
- internal lifecycle event semantics,
- parent-child workflow semantics,
- store semantic ownership.

### Avoid Copying Ruflo's Full Process

Ruflo's process is powerful but heavy. Pairflow is currently in a convergence phase, not a full enterprise SDLC rollout. The useful subset is:

```text
small specification -> provisional domain vocabulary -> protocol pseudocode -> DDD correction -> revised protocol pseudocode -> selective ADR -> implementation task
```

This keeps the benefits of the Ruflo model while avoiding process overhead.

### Distinguish Workflow Shapes Early

Based on the `ruflo-workflows` and `ruflo-goals` plugins, Pairflow v3 should explicitly distinguish at least four workflow-like shapes:

1. **Persisted workflow instance** — resumable, human-gated, transcript-backed, lifecycle-managed.
2. **Agent fan-out orchestration** — short-lived, deterministic subagent fan-out with structured aggregation.
3. **Recursive research/dossier expansion** — seed-driven graph exploration with provenance and budget caps.
4. **Long-horizon objective tracking** — cross-session milestone and drift management.

The L0a-L4 kernel work should optimize for the first shape, but should not accidentally preclude the other three.

### Treat Levels as Contracts

The plugin family suggests a useful pattern for Pairflow convergence levels:

```text
Level contract:
  capability introduced
  owner/boundary
  domain vocabulary
  command/event surface
  invariants
  store semantics
  verification evidence
  deferred concepts
```

This could make the core-model levels more implementable without turning them into code too early.

## Open Questions for Pairflow

- Should `core-model.html` include pseudocode directly, or should pseudocode live in adjacent markdown and be rendered/summarized in the HTML?
- Should L0a get a dedicated "protocol trace" section separate from the visual diagram?
- Should DDD outputs be standardized per level with a small recurring template?
- Should the v3 convergence process require a provisional domain vocabulary before pseudocode?
- Should accepted pseudocode require a second pass after DDD correction?
- Should each v3 convergence level have a small "level contract" block?
- Which workflow-like shapes should Pairflow name early so "workflow" does not become overloaded?
- Should child workflows be treated as context boundaries with lineage and summary contracts?
- Which central-store semantics must be visible in L0a rather than deferred to infrastructure?
- Which decisions are important enough to become ADRs before implementation starts?
- Should the v3 convergence process require pseudocode before a level is accepted as stable?

## Bottom Line

The most valuable Ruflo idea for Pairflow v3 is not ADR-first development. It is pseudocode-before-code, backed by explicit domain language.

For the current Pairflow core model work, the next useful step is likely:

```text
L0a provisional domain terms + invariants -> L0a protocol pseudocode -> L0a DDD correction -> revised L0a protocol pseudocode -> revised core-model L0a
```

That would directly address the current ambiguity around immutable templates, idempotency, transcript/state atomicity, lifecycle position, and L0a/L0b scope.

The plugin-family pass adds one more recommendation: once an L-level stabilizes, document it as a small contract, not only as a diagram. The contract should state ownership, events, invariants, store semantics, and verification evidence. This is the Pairflow-sized adaptation of Ruflo's plugin ADR + smoke-as-contract pattern.
