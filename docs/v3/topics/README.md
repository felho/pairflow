# V3 Topics — Design Memos and Open Questions

This directory holds **v3 design memos**: open questions, model-gap notes, and
design syntheses. Unlike [`../research/`](../research/README.md) (which reads
*other* systems), these documents work on v3's own design — but they are not
yet part of the converged model contract in
[`../convergence/`](../convergence/approach.md).

## Where a topic belongs

- Touches an **already-designed part** of the core model → fold it into
  [`../convergence/core-model-todo.md`](../convergence/core-model-todo.md).
- Belongs to a **not-yet-designed level** → fold it into
  [`../convergence/core-model-future-topic.md`](../convergence/core-model-future-topic.md)
  under its owning level.
- Needs its own working document (too big, still moving, or cross-cutting) →
  it lives here as a memo, and the convergence docs link to it.

A memo with a settled direction stays here as the record of *why*; the
decision itself must land in the convergence docs to be binding.

## Memo index

| Memo | Status | Feeds into |
|---|---|---|
| [`_open-private-data-boundary-vs-federation.md`](_open-private-data-boundary-vs-federation.md) | **Settled direction** — the MVP needs a controlled private-data contribution boundary, not kernel federation; stay federation-ready. | `approach.md` L10 scope note; `core-model-future-topic.md` L10. |
| [`_open-v3-storage-architecture.md`](_open-v3-storage-architecture.md) | **Settled direction** — storage as explicit authority planes; canonical truth = instance + transcript + idempotency ledger under CAS. Plus instance homing: authority is per-instance (one home store each); cross-kernel = events + durable refs only, never multi-master. | Core-model storage shape; `core-model-todo.md` Part A / shared kernel-shape guardrails. |
| [`_open-v3-core-api-surface.md`](_open-v3-core-api-surface.md) | **Settled direction** — the core API is a typed command/query/observe kernel API; the CLI is one thin client. | Cross-level; the core-model `RECEIVE` ingress shape. |
| [`_open-v3-workflow-inspector-ui.md`](_open-v3-workflow-inspector-ui.md) | **Settled direction** — the UI is a kernel read-model UI over typed projections; operator actions re-enter through normal ingress. | Cross-level; pairs with the core-API memo. |
| [`v3-gate-policy-config-design-synthesis.md`](v3-gate-policy-config-design-synthesis.md) | **Captured synthesis** — two-surface gate config: authoring profile compiled to a normalized, typed `GatePipeline`. | `core-model-future-topic.md` L2/L2a (authoring profiles, packaged policy). |
| [`_open-agent-runtime-and-pane-layout.md`](_open-agent-runtime-and-pane-layout.md) | **Partially open** — runtime direction (Q1) and config location (Q3) settled; open: pane-binding dimension (Q2) + one MVP-scope sub-decision. | L0e runtime-context, L0c ActorAdapter, observe-seam; `core-model-future-topic.md` L0e. |
| [`_open-runtime-capability-surface.md`](_open-runtime-capability-surface.md) | **Open** — the Omnigent `sys_*` lesson: selected runtime control-plane operations as explicit, typed, LLM-callable tools. | `core-model-future-topic.md` L0b (structured emit affordances family). |
| [`_dynamic-orchestrator-workflow.md`](_dynamic-orchestrator-workflow.md) | **Open** — does v3 need a first-class dynamic orchestrator workflow shape (plan / delegate / wait / re-delegate at runtime)? Omnigent "child session" ≠ L4 `child_workflow`. | `core-model-future-topic.md` L4; L4 fan-out design. |
| [`_open-kernel-primitives.md`](_open-kernel-primitives.md) | **Decided — rebaseline blocked on the L5 paper test** — the five kernel primitives (Errand · ChoicePoint · Admission · Warrant · Directive) with instance maps; all four review decisions recorded (contracts-in-code; in-place rebaseline at the earned points + ①②③④→LC1–LC4 lifecycle-close rename-pass; transports unified at the primitive level; naming via a six-lens anti-anchored brainstorm); review round 2 folded in (③a = two chained errands, errand-composition rule, selector-authority values, alias table). Next: rename-pass, then the rebaseline gated by the L5 paper test. | The Phase 3 content refactor of `core-model.html`; `core-model-todo.md` Parts A/B/D/E cross-refs. |
