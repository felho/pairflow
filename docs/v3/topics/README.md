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
| [`_open-emit-contract.md`](_open-emit-contract.md) | **Paper test PASS; review round 1 folded (2026-07-07)** — Q1–Q4 decided (rejection split, currency required day-one, digest in the rung re-print, the offer↔gate seam closed in same-function form), the behavior-delta ratify list opened (digest + offer deltas), F-EC-1 logged (todo F4 mixes evidence currency with committed-policy-input freshness). The last Block A model backlog as one slice: todo Parts E + F + the A1 digest — 11 declarations, zero new machinery; E6 and E1's extended fields deliberately out. Next: the build small-spec. | The emit-contract section build (`core-model.html`, section 20, block baseline `l5-pseudocode`); `core-model-todo.md` Parts E/F closure; v1 parity. |
| [`_open-private-data-boundary-vs-federation.md`](_open-private-data-boundary-vs-federation.md) | **Settled direction** — the MVP needs a controlled private-data contribution boundary, not kernel federation; stay federation-ready. | `approach.md` L10 scope note; `core-model-future-topic.md` L10. |
| [`_open-v3-storage-architecture.md`](_open-v3-storage-architecture.md) | **Settled direction** — storage as explicit authority planes; canonical truth = instance + transcript + idempotency ledger under CAS. Plus instance homing: authority is per-instance (one home store each); cross-kernel = events + durable refs only, never multi-master. | Core-model storage shape; `core-model-todo.md` Part A / shared kernel-shape guardrails. |
| [`_open-v3-core-api-surface.md`](_open-v3-core-api-surface.md) | **Settled direction** — the core API is a typed command/query/observe kernel API; the CLI is one thin client. | Cross-level; the core-model `RECEIVE` ingress shape. |
| [`_open-v3-workflow-inspector-ui.md`](_open-v3-workflow-inspector-ui.md) | **Settled direction** — the UI is a kernel read-model UI over typed projections; operator actions re-enter through normal ingress. | Cross-level; pairs with the core-API memo. |
| [`v3-gate-policy-config-design-synthesis.md`](v3-gate-policy-config-design-synthesis.md) | **Captured synthesis** — two-surface gate config: authoring profile compiled to a normalized, typed `GatePipeline`. | `core-model-future-topic.md` L2/L2a (authoring profiles, packaged policy). |
| [`_open-agent-runtime-and-pane-layout.md`](_open-agent-runtime-and-pane-layout.md) | **Partially open** — runtime direction (Q1) and config location (Q3) settled; open: pane-binding dimension (Q2) + one MVP-scope sub-decision. | L0e runtime-context, L0c ActorAdapter, observe-seam; `core-model-future-topic.md` L0e. |
| [`_open-creation-identity.md`](_open-creation-identity.md) | **Open design decision** — exactly-once instance minting from external trigger identity (GAP-1 of the BitSafe workflow simulation; two documented incidents as dual failure faces). Fork: kernel-edge mint-or-return-existing oracle vs L6/L8 split + harness-owned bare path. | `CREATE_INSTANCE` ingress; `core-model-future-topic.md` L6/L8; the F-W1-2 touch precedent. |
| [`_open-kernel-floor.md`](_open-kernel-floor.md) | **Open design decision (mostly ratify-a-boundary)** — the kernel's floor and edges: the instance-weight floor (GAP-2), cross-instance exclusion/lease (GAP-11), the off-host supervision boundary, and the not-a-workload canon incl. the "wait must survive the performer" P5-entry rule. | `core-model-future-topic.md` L9 #7 (R8); template-design guidance. |
| [`_open-runtime-capability-surface.md`](_open-runtime-capability-surface.md) | **Open** — the Omnigent `sys_*` lesson: selected runtime control-plane operations as explicit, typed, LLM-callable tools. | `core-model-future-topic.md` L0b (structured emit affordances family). |
| [`_dynamic-orchestrator-workflow.md`](_dynamic-orchestrator-workflow.md) | **Open** — does v3 need a first-class dynamic orchestrator workflow shape (plan / delegate / wait / re-delegate at runtime)? Omnigent "child session" ≠ L4 `child_workflow`. Evidence update 2026-07-06: the BitSafe simulation grounded the static half (future-topic L4 #11 detached spawn, #12 data-driven fan-out; L5 #9 agent-addressed help) — Q2 to be re-read against those. Owns the `ActorSessionRef` Q1. | `core-model-future-topic.md` L4; L4 fan-out design. |
| [`_open-kernel-primitives.md`](_open-kernel-primitives.md) | **COMPLETE — the rebaseline executed as waves 1–5, all ratified (2026-07-06)** — the five kernel primitives (Errand · ChoicePoint · Admission · Warrant · Directive) are named contracts in the corpus at their earned birth points (Admission@L0d · Warrant@L1 · Errand@LC2 · ChoicePoint+Directive@L3) with instance/phase labels corpus-wide; behavior-neutrality machine-checked per wave (registries + per-block rejection multisets; one deliberate ratified delta, F-W4-2). §9 is the per-wave findings log. The named debt (the dedicated F-W1-2 ingress/idempotency hardening touch) was discharged and ratified 2026-07-06 — the strand is fully closed. | Realized in `core-model.html` (model-src units); `core-model-todo.md` Parts A/B/D/E cross-refs. |
