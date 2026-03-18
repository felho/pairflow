# v1.1 Architecture Decision Log

This log captures architectural decisions made during the v1.1 boundary simplification design phase. Each entry records the decision, the reasoning, alternatives considered, and references to affected documents.

---

## ADR-001: Dual-Gate State Write Model

**Date:** 2026-03-18
**Status:** accepted
**Scope:** Mutation fitness (check #2) and Transition fitness (check #3)
**Context thread:** Codex session `019cebfb-0fd1-7103-b2ff-c4358906d3bc` (2026-03-14, main v1.1 discovery session)

### Context

Two fitness checks were originally defined with single-path rules:
- Mutation fitness: *"state-changing pathok csak kozos mutation pipeline-on (`BubbleMutationRunner`) futhatnak."*
- Transition fitness: *"normal flow-ban kotelezo `applyStateTransition()` hasznalat."*

During design review, we identified that the `TranscriptStateReconciler` (m0-05) bypasses both `BubbleMutationRunner` and `StateTransitionService`. The question was whether this is a fitness violation or an intentional architectural feature.

### Analysis

Investigation of both the v1.1 design documents and the current codebase (15 `writeStateSnapshot` call sites across 9 files) revealed that there are two fundamentally different state write operations:

| Aspect | Forward Mutation | Backward Reconstruction |
|--------|-----------------|------------------------|
| **What** | Apply new domain event | Restore state from existing transcript |
| **Who** | BubbleMutationRunner | TranscriptStateReconciler |
| **Input** | `domain_mutation_plan` + `validated_next_state` (from STS) | Transcript tail + current state drift detection |
| **Transcript** | Writes new envelope, then persists state | Reads existing envelopes, writes audit event |
| **When** | Normal command flow (pass, approval, reply, kickoff, etc.) | Operator recovery flow |
| **Guardrails** | STS validation, transcript-first ordering, fingerprint guard | `reason` + `operation_id` + audit event |

These are not the same operation with different callers — they have different semantics, different inputs, different guardrails, and different invariants.

### Decision

State writes are allowed through exactly **two gates** (dual-gate model):

1. **Forward gate (BubbleMutationRunner)** — For normal command flows. State is computed by `StateTransitionService`, validated, and persisted after transcript append. This is the only path for creating new domain events.

2. **Reconstruction gate (TranscriptStateReconciler)** — For operator recovery flows. State is derived from the canonical transcript (source of truth) and corrected when drift is detected. This path does not create new domain events; it corrects state to match existing ones.

**No third gate may exist.** Any `StateRepository.write` call outside these two components is a fitness violation.

This decision covers both mutation and transition fitness, because the two are structurally linked in the forward gate: the forward path requires STS validation as a precondition for BMR persistence. In other words, on the forward path you cannot have mutation without transition validation — they are a single chain (`STS → BMR`). On the reconstruction path, neither applies — state is derived from transcript, not computed via transition or mutation.

### Fitness Check Implementation

```
CI CHECK (mutation fitness):
  For each StateRepository.write / writeStateSnapshot call site:
    ├── In BubbleMutationRunner? → PASS (forward mutation)
    ├── In TranscriptStateReconciler? → PASS (backward reconstruction)
    └── Elsewhere? → FAIL

CI CHECK (transition fitness):
  For each state-changing command path:
    ├── Forward path? → PASS only if STS.applyStateTransition() called before BMR
    ├── Reconstruction path (reconciler)? → PASS (STS not applicable)
    └── No STS call on forward path? → FAIL
```

Rollout note:
- Ezek target-architektura definiciok.
- Bevezetes: report-only indul, majd checkenkenti hard-fail aktivalas a megfelelo migration milestone utan.

### Alternatives Considered

1. **Single-gate (BMR only):** Force the reconciler to go through BMR. Rejected because reconstruction is not a domain mutation — it does not have a `domain_mutation_plan` or a `validated_next_state` from STS. Forcing it through BMR would either require a fake mutation plan or a bypass flag, both of which would weaken the BMR contract.

2. **Exception-based (BMR + exception list):** Keep the single-gate rule but add reconciler as an exception. Rejected because exceptions invite more exceptions over time and make the fitness check harder to reason about. The dual-gate model is more precise and stable.

3. **Unrestricted operator writes:** Allow any operator command to write state directly. Rejected because this would create an open-ended set of state write paths, defeating the purpose of the fitness check.

### Consequences

- The mutation fitness check definition in section 16.2 is updated to reflect the dual-gate model.
- The transition fitness check definition in section 16.2 is updated to reference the same dual-gate model.
- The forbidden rules in section 4.0 (rule 5) are updated with the dual-gate specification.
- Both gates have explicit, non-overlapping guardrail requirements.
- The `TranscriptStateReconciler` component one-pager (m0-05) is consistent with this decision as-is.

### Open Question (deferred)

The current `metaReviewGate.ts:persistHumanGateRoute` uses state-first ordering (state write before transcript append, with rollback on append failure). This is the reverse of the transcript-first invariant. When this path migrates to BMR in v1.1, the transcript-first ordering will apply automatically. However, the gate has a transactional requirement (state must reflect the gate decision before the approval request is appended) that may need special handling within BMR. This is deferred to the Phase C (meta-review gate decomposition) design work.

### Affected Documents

- `v1.1 architecture context.md` — Section 4.0 (rule 5), section 16.2 (fitness checks 2 and 3)
- `component-one-pagers/m0-01-bubble-mutation-runner.md` — No change needed (BMR spec already excludes reconstruction)
- `component-one-pagers/m0-02-state-transition-service.md` — No change needed (STS spec already scopes to forward transitions only)
- `component-one-pagers/m0-05-transcript-state-reconciler.md` — No change needed (reconciler spec already describes its own write path)

---

## ADR-002: Mandatory Error Context Fields Per Component

**Date:** 2026-03-18
**Status:** accepted
**Scope:** Error fitness (check #4)

### Context

The error fitness check requires: *"message-only wrap tiltott, code + context megtartas kotelezo."*

The `PairflowError` base contract (section 4.0) defines minimum context fields for state/transcript mutation errors (`bubble_id`, `state`, `expected_fingerprint`, `actual_fingerprint`, `operation_id`). The component one-pager template (section 8) instructs authors to specify mandatory context fields.

During design review, we found that only 4 of 10 component one-pagers actually defined their mandatory context fields (BMR, STS, CPE, GatePipelineEngine). The remaining 5 listed error codes but no context specification. This means implementations could produce structurally valid `PairflowError` objects with empty context, making debugging and retry decisions unreliable.

### Decision

Every component one-pager must define mandatory context fields for its error codes. The context fields should be the minimum set required to diagnose the error without access to the full runtime state.

### Changes Applied

| Component | Error Codes | Context Fields Added |
|-----------|-------------|---------------------|
| m0-05 TranscriptStateReconciler | `RECONCILE_INPUT_INVALID`, `RECONCILE_STATE_WRITE_FAILED`, `RECONCILE_REJECTED` | `bubble_id`, `operation_id`, `reason`, `before_state_hash`, `reconciled_state_hash`, `state_diff_summary` (+ optional `*_state_ref`) |
| m0-07 MetricsDispatcher | `METRICS_DISPATCH_FAILED`, `METRICS_EVENT_INVALID` | `bubble_id`, `event_type`, `dispatch_attempt` |
| m0-08 ConfigLoader | `CONFIG_PARSE_FAILED`, `CONFIG_PRECEDENCE_INVALID`, `CONFIG_UNSAFE_MUTATION_REQUIRES_RESTART` | `config_source_path`, `field_name`, `precedence_level` |
| m0-09 AgentAdapter | `AGENT_SESSION_START_FAILED`, `AGENT_DELIVERY_FAILED`, `AGENT_RESTART_FAILED`, `AGENT_HEALTH_CHECK_FAILED` | `bubble_id`, `role`, `agent_name`, `session_id` |
| m0-10 LegacyCompatAdapter | `LEGACY_NORMALIZATION_FAILED`, `LEGACY_INPUT_UNSUPPORTED`, `LEGACY_ACTIVATION_MARKER_INCONSISTENT` | `bubble_id`, `input_format_version`, `normalization_step` |

Already complete (no change needed):

| Component | Context Fields |
|-----------|---------------|
| m0-01 BubbleMutationRunner | `bubble_id`, `operation_id`, `expected_fingerprint`, `actual_fingerprint`, `state` |
| m0-02 StateTransitionService | `bubble_id`, `from_state`, `to_state`, `operation_id` |
| m0-03 ConvergencePolicyEngine | `bubble_id`, `round`, `policy_profile`, `task_activation_state` |
| m0-04 GatePipelineEngine | `bubble_id`, `gate_id`, `round` |
| m0-06 PairflowError | Base contract (category prefixes, not component-specific context) |

### Consequences

- All 10 component one-pagers now define mandatory error context fields.
- The component one-pager template already requires this (section 8) — no template change needed.
- Error fitness check is now GREEN a target architecture design szinten: minden error code-hoz van minimum context contract. Runtime enforcement ettol fuggetlenul fazisosan kapcsolhato hard-fail modba.

### Affected Documents

- `component-one-pagers/m0-05-transcript-state-reconciler.md` — Context fields added
- `component-one-pagers/m0-07-metrics-dispatcher.md` — Context fields added
- `component-one-pagers/m0-08-config-loader-and-toml-normalizer.md` — Context fields added
- `component-one-pagers/m0-09-agent-adapter.md` — Context fields added
- `component-one-pagers/m0-10-legacy-compat-adapter.md` — Context fields added
