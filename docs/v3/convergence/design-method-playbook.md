# V3 Design Method Playbook

Status: draft
Date: 2026-06-13
Purpose: Define how to use DDD, protocol pseudocode, ADRs, and evidence gates while designing Pairflow v3.

This document is about **how we design v3**, not about what v3 should contain.

Ruflo was used as a methodology reference, especially its SPARC, DDD, ADR, and plugin-contract patterns. We are not importing Ruflo's product model, tool ecosystem, AgentDB assumptions, RVF concepts, plugin architecture, or workflow capabilities as Pairflow requirements.

Source background:

- [`../research/ruflo-v3-sdlc-workflow.md`](../research/ruflo-v3-sdlc-workflow.md)
- `/Users/felho/dev/repos-to-learn-from/ruflo/v3`
- `/Users/felho/dev/repos-to-learn-from/ruflo/plugins`

## 1. Scope

Use this playbook when working on:

- `core-model.html`,
- v3 convergence levels,
- v3 architecture notes,
- implementation plans derived from v3 convergence,
- any design task where domain concepts, workflow behavior, or long-lived decisions need clarification before code.

Do not use this playbook to import Ruflo features into Pairflow. Its job is to improve design quality during Pairflow v3 creation.

## 2. Working Sequence

The default design sequence for a v3 level or core-model slice is:

```text
small specification
-> provisional domain vocabulary
-> protocol pseudocode
-> DDD correction
-> revised protocol pseudocode
-> level contract
-> selective ADR only if needed
-> implementation task/plan
```

This is intentionally not a heavy enterprise SDLC. Each step should be small enough to fit the current convergence level.

## 2.1 Lightweight Default

The full sequence is a menu, not mandatory ceremony for every small step.

For every non-trivial level or core-model change, the required core is:

1. **Protocol pseudocode** — the general rule behind the runtime trace.
2. **Invariants** — what must stay true across the transition.
3. **Vocabulary / DDD correction** — enough domain-language checking to keep terms, boundaries, and rules coherent.

These three are the understanding tools. They should be lightweight but present.

Use the heavier documentation tools only when the level is stabilizing, a handoff is needed, or implementation is getting close:

- small specification,
- full level contract,
- full evidence gate,
- ADR.

There is one exception: every accepted level should have at least **light evidence**. This can be one short note or checklist explaining why we accept the level for now. A full evidence gate is needed only when the level becomes a stable reference or implementation input.

Default rule:

```text
Explore with pseudocode + invariants + DDD correction.
Stabilize with level contract + evidence.
Record with ADR only when a durable decision exists.
```

## 3. Small Specification

The small specification answers what this slice is trying to clarify.

Minimum fields:

```markdown
## Small Specification

### Capability
What capability is introduced or clarified?

### User/Workflow Value
Which concrete workflow or design problem does this unlock?

### In Scope
What behavior is included now?

### Out of Scope
What nearby behavior is deliberately deferred?

### Acceptance Evidence
What would convince us this level/slice is coherent?
```

Use this instead of a heavyweight PRD. A v3 convergence level does not need a full product spec unless implementation is imminent.

## 4. Provisional Domain Vocabulary

Before writing pseudocode, extract a provisional vocabulary from the specification and scenarios.

The goal is not final DDD architecture. The goal is to give pseudocode stable nouns, verbs, and rules so it does not invent accidental technical language.

Minimum fields:

```markdown
## Provisional Domain Vocabulary

### Nouns
- `WorkflowInstance` — ...
- `TranscriptEntry` — ...

### Verbs
- `Start` — ...
- `CommitTransition` — ...
- `RejectEnvelope` — ...

### Rules
- Every transition requires `expected_version`.
- A repeated `(instance_id, op_id)` is a no-op.

### Ambiguous Terms
- `Envelope` — may split into command/event later.
- `KernelCommit` — may need explicit representation.
```

Rules:

- Prefer domain words over implementation words.
- Mark uncertain names as provisional.
- Do not force bounded contexts too early.
- Do not put actor assignment, guidance, channel behavior, or later capabilities into an earlier level's vocabulary unless that level explicitly introduces them.

## 5. DDD Use

Use DDD as a clarity tool, not as ceremony.

For each level, identify only the DDD elements that help clarify behavior:

- ubiquitous language terms,
- commands,
- events,
- aggregate or consistency boundary,
- invariants,
- policies,
- read models/projections,
- external systems or later channels.

### When DDD Is Useful

Use DDD when:

- naming is unstable,
- lifecycle and execution position are being confused,
- a mutation boundary is unclear,
- multiple concepts are being collapsed into one,
- future capabilities depend on today's invariant,
- the same word is used differently in runtime/domain/config views.

### When DDD Is Too Much

Do not use DDD to:

- produce a directory structure before behavior is clear,
- add bounded contexts where a single aggregate boundary is enough,
- create entities for every noun,
- force repository/service patterns into a design-only document,
- make a small L-level look more mature than it is.

### DDD Correction Pass

After the first pseudocode pass, run a correction pass:

```markdown
## DDD Correction

### Term Changes
- Rename `Envelope` to `EventEnvelope` because ...

### Boundary Changes
- Keep actor binding outside L0a because ...

### Invariant Changes
- Make transcript append + state update one atomic logical commit because ...

### Deferred Concepts
- Context packet assembly remains L0b because ...
```

The output of DDD correction must feed a revised pseudocode pass.

## 6. Protocol Pseudocode

Pairflow v3 needs **protocol/state-machine pseudocode**, not generic algorithm pseudocode.

Protocol pseudocode is a **core-model view**, not just a temporary design note.

In `core-model.html`, the runtime trace shows one concrete execution. Protocol pseudocode shows the general rule behind that trace, including branches the trace does not exercise: duplicate input, stale version, invalid envelope, rejected transition, no-op, and absent behavior.

For each level, pseudocode should evolve alongside the runtime/domain/config views. This gives a second coherence test:

- If a new capability can be added as a small line, branch, or guard in the existing pseudocode, the previous abstraction probably holds.
- If the new capability forces the pseudocode to be torn apart, the earlier model likely chose the wrong boundary or hid a necessary concept.

This is the algorithm-level form of the convergence ramp's coherence test.

Good protocol pseudocode shows:

- input envelope/command/event,
- loaded state,
- version/idempotency checks,
- transition resolution,
- invariant enforcement,
- atomic commit,
- transcript/event output,
- no-op/reject/stale cases.

Template:

```text
HandleEnvelope(envelope):
  validate envelope shape
  load workflow instance by envelope.instance_id
  reject if expected_version does not match current version
  check idempotency using (instance_id, op_id)
  resolve transition from current lifecycle/position and event type
  verify invariants for the transition
  atomically append transcript entry and update instance state
  return committed, duplicate, stale, or rejected outcome
```

### Pseudocode Rules

- Use only vocabulary defined in the provisional vocabulary or corrected DDD section.
- Include error/no-op cases, not only happy paths.
- Show atomicity explicitly.
- Show idempotency scope explicitly.
- Show version/CAS behavior explicitly.
- Avoid TypeScript syntax unless an interface shape is truly needed.
- Avoid implementation infrastructure unless store semantics are the thing being designed.

### Pseudocode Quality Gate

Pseudocode is not good enough until it answers:

- What is the input?
- What state is read?
- What must be true before mutation?
- What changes atomically?
- What transcript/event is emitted?
- What happens on duplicate input?
- What happens on stale input?
- What behavior is deliberately absent?

## 7. Level Contract

Once a level feels coherent, capture it as a small contract.

For exploratory work, a full level contract is optional. For a level that becomes a stable reference in `core-model.html` or is about to feed implementation, it should be written or embedded.

Template:

```markdown
# Lx Contract

## Capability

## User/Workflow Value

## In Scope

## Out of Scope

## Domain Vocabulary

## Commands

## Events

## Aggregates / Consistency Boundaries

## Invariants

## Store Semantics

## Protocol Pseudocode

## Failure / No-op Cases

## Verification Evidence

## Future Compatibility

## ADR Candidates
```

The level contract is not necessarily a separate file for every level. It can be embedded in `core-model.html` or represented in adjacent markdown. The important point is that a level is not "done" just because the diagram looks plausible.

## 8. ADR Use

Use ADRs selectively.

An ADR is appropriate when a decision is:

- durable,
- cross-cutting,
- likely to constrain later levels,
- likely to be revisited or disputed,
- important for implementation fitness checks,
- a tradeoff between real alternatives.

An ADR is premature when:

- the vocabulary is still unstable,
- pseudocode has not exposed the behavior,
- the decision is local to one diagram,
- the choice is obvious and reversible,
- the main question is still "what happens?" rather than "which option do we choose?"

### Minimum ADR Template

```markdown
# ADR-NNN: Title

Status: proposed | accepted | superseded
Date: YYYY-MM-DD

## Context
What problem or tension forced the decision?

## Decision
What did we decide?

## Alternatives Considered
What real options were rejected?

## Consequences
Positive, negative, and neutral consequences.

## Verification
What test, fitness check, scenario, or contract proves this remains true?

## Related
Related levels, docs, code, or prior ADRs.
```

### Likely Pairflow v3 ADR Candidates

Good candidates once the model stabilizes:

- template immutability and `template_ref` semantics,
- lifecycle state vs execution position,
- transcript/state atomic commit semantics,
- idempotency key scope,
- store semantic ownership,
- internal lifecycle events as the first channel-like abstraction,
- parent-child workflow semantics.

## 9. Evidence Gate

Every accepted level or major design slice should carry evidence.

Evidence can be:

- protocol pseudocode,
- scenario trace,
- invariant checklist,
- DDD correction notes,
- comparison against test workflows,
- implementation spike result,
- future compatibility note,
- later, an automated test or fitness check.

Minimum evidence block:

```markdown
## Evidence Gate

### Scenario Coverage
- WF-7: ...
- WF-1 later compatibility: ...

### Invariant Coverage
- idempotency: ...
- atomic commit: ...
- store semantics: ...

### Known Gaps
- ...

### Decision
Accepted for now / needs rework / blocked.
```

## 10. What Not To Extract From Ruflo Now

Do not extract these as Pairflow v3 requirements from the current Ruflo research:

- AgentDB architecture,
- RVF/session portability,
- plugin architecture,
- neural/learning/autopilot behavior,
- nested subagents as a product feature,
- Ruflo's workflow capabilities,
- Ruflo's namespace scheme,
- Ruflo's exact skill prompts.

These may be interesting later, but the current use is methodological:

```text
DDD for language and invariants.
Pseudocode for protocol behavior.
ADR for durable decisions.
Evidence gates for convergence quality.
```

## 11. Recommended Use In Future Sessions

When starting a future v3 design session, use this instruction:

```text
Use docs/v3/convergence/design-method-playbook.md.
Do not import Ruflo features. Use the playbook only to structure Pairflow v3 design work:
small specification, provisional vocabulary, protocol pseudocode, DDD correction,
level contract, selective ADR, and evidence gate.
```

When reviewing a model level, use this checklist:

```text
1. Is the capability scope clear?
2. Are nouns, verbs, and rules explicit?
3. Does pseudocode use those terms consistently?
4. Did a DDD correction pass run after pseudocode?
5. Are invariants explicit?
6. Are store semantics explicit if state changes?
7. Are no-op/reject/stale cases covered?
8. Is an ADR needed, or would it be premature?
9. Is there enough evidence to accept the level for now?
```

## 12. Immediate Application To L0a

For L0a, the method should produce:

- provisional vocabulary for template, instance, lifecycle, position, envelope, transcript, version, operation id, transition, commit;
- protocol pseudocode for handling an envelope;
- DDD correction around `template_ref`, `WorkflowInstance` boundary, transcript/state atomicity, and L0a/L0b separation;
- a level contract stating L0a invariants;
- ADR candidates only after the behavior is stable.

The expected sequence:

```text
L0a small specification
-> L0a provisional vocabulary
-> L0a envelope-handling pseudocode
-> L0a DDD correction
-> revised L0a pseudocode
-> L0a contract
-> update core-model.html
```
