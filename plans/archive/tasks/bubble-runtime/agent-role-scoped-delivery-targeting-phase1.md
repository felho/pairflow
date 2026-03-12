---
artifact_type: task
artifact_id: task_agent_role_scoped_delivery_targeting_phase1_v3
title: "Role-Scoped Delivery Targeting for All Agents (Phase 1)"
status: implementable
phase: phase1
target_files:
  - src/core/runtime/tmuxDelivery.ts
  - src/core/bubble/metaReviewGate.ts
  - src/core/agent/converged.ts
  - src/core/agent/pass.ts
  - src/core/human/reply.ts
  - src/core/human/approval.ts
  - src/types/protocol.ts
  - tests/core/runtime/tmuxDelivery.test.ts
  - tests/core/bubble/metaReviewGate.test.ts
  - tests/core/agent/converged.test.ts
  - tests/core/agent/pass.test.ts
  - tests/core/human/reply.test.ts
  - tests/core/human/approval.test.ts
  - docs/pairflow-initial-design.md
prd_ref: null
plan_ref: null
system_context_ref: docs/pairflow-initial-design.md
normative_refs:
  - docs/pairflow-initial-design.md
owners:
  - "felho"
---

# Task: Role-Scoped Delivery Targeting for All Agents (Phase 1)

## L0 - Policy

### Goal

Remove agent-name-only delivery ambiguity in Pairflow runtime routing.

Primary outcomes:
1. Protocol delivery must target the intended **role** (`implementer|reviewer|meta_reviewer`), not infer pane only from recipient agent name (`codex|claude`).
2. The fix must be agent-agnostic: works for any role combination where one executable agent identity is reused across multiple roles.
3. Acceptance and test evidence must be traceable from each contract claim to concrete test IDs.

### Context

Observed failure mode:
1. Meta-review gate emitted a `TASK` with recipient agent `codex`.
2. Runtime delivery resolved pane from recipient agent match order and injected the event into implementer pane.
3. Implementer executed meta-review submit path, creating a premature `APPROVAL_REQUEST`.
4. Dedicated meta-reviewer pane then raced/failed against shifted state and had to recover.

This is not codex-specific; it is a general routing contract issue whenever role identity and agent identity diverge.

### In Scope

1. Introduce deterministic delivery-target role contract for protocol envelopes used in runtime pane injection.
2. Update runtime pane selection logic to prioritize explicit role target over recipient agent name.
3. Ensure meta-review gate handoff always targets `meta_reviewer` role at delivery time.
4. Ensure pass/reply/approval delivery paths can target intended role even if implementer/reviewer/meta-reviewer share the same agent identity.
5. Keep transcript compatibility: existing `sender`/`recipient` semantics remain readable and backward-compatible.
6. Add regression tests for shared-agent-role collision scenarios across flows.

### Out of Scope

1. Redesign of review policy, severity logic, or convergence policy semantics.
2. New lifecycle states.
3. Global migration of historical transcripts.
4. Runtime multi-session orchestration redesign outside pane-target resolution contract.

### Safety Defaults

1. Backward compatibility: if explicit delivery target role is absent, fallback to current recipient-based routing.
2. Invalid delivery target role never crashes protocol progression; fallback route is deterministic and test-covered.
3. Human/orchestrator status-pane delivery semantics remain unchanged.

### Contract Boundary / Blast Radius

1. `contract_boundary_override`: `no`
2. Affected areas:
   - runtime delivery targeting contract
   - envelope metadata conventions for runtime delivery
   - tests and docs for routing behavior

## L1 - Change Contract

### 1) Call-site Matrix

| ID | File | Function/Entry | Exact Signature (args -> return) | Insertion Point | Expected Behavior | Priority | Timing | Evidence |
|---|---|---|---|---|---|---|---|---|
| CS1 | `src/types/protocol.ts` | delivery metadata typing | `ProtocolEnvelopePayload.metadata -> Record<string, unknown>` + additive typed helper/alias for delivery target role | protocol payload typing helpers | define canonical role token for delivery targeting (`implementer|reviewer|meta_reviewer|status`) without breaking existing payload shape | P1 | required-now | T1,T2 |
| CS2 | `src/core/runtime/tmuxDelivery.ts` | pane resolver | `resolveTargetPaneIndex(...) -> number | undefined` | before recipient-name fallback | route by explicit delivery target role first; fallback to recipient-name mapping only when target role absent/invalid/unmapped | P1 | required-now | T2,T7,T8,T10,T12,T13,T15 |
| CS3 | `src/core/bubble/metaReviewGate.ts` | gate task envelope creation | `applyMetaReviewGateOnConvergence(...) -> MetaReviewGateResult` | TASK envelope metadata assembly for meta-review kickoff | meta-review kickoff envelope carries explicit delivery target role = `meta_reviewer` | P1 | required-now | T3 |
| CS4 | `src/core/agent/converged.ts` | approval request mirror delivery | `runConvergedCommand(...) -> ConvergedCommandResult` | synthetic implementer/reviewer mirror envelopes for delivery | mirrored approval notifications include explicit delivery target role so shared agent identity cannot cross-route | P1 | required-now | T4 |
| CS5 | `src/core/agent/pass.ts` | role handoff envelope metadata | `runPassCommand(...) -> PassCommandResult` | PASS envelope metadata emission | outbound pass envelopes include explicit target role derived from handoff recipient role | P1 | required-now | T5,T9 |
| CS6 | `src/core/human/reply.ts` | active-role reply envelope metadata | `runBubbleReplyCommand(...) -> BubbleReplyCommandResult` | HUMAN_REPLY envelope metadata emission | human reply to active agent includes explicit delivery target role from state.active_role | P1 | required-now | T6 |
| CS7 | `src/core/human/approval.ts` | approval decision rework handoff metadata | `runBubbleApprovalCommand(...) -> BubbleApprovalCommandResult` | `decision=revise` route to implementer | revised handoff includes explicit target role=`implementer` to avoid recipient-agent ambiguity | P2 | required-now | T11 |
| CS8 | `docs/pairflow-initial-design.md` | protocol/runtime routing docs | `markdown delta` | protocol envelope + runtime routing sections | document that pane delivery is role-scoped with recipient-name fallback for legacy envelopes | P2 | required-now | T14 |

### 2) Data and Interface Contract

| Contract | Current | Target | Required Fields | Optional Fields | Compatibility | Priority | Timing |
|---|---|---|---|---|---|---|---|
| Runtime delivery intent | implicit from `envelope.recipient` agent name | explicit role-scoped target in metadata + legacy fallback | `metadata.delivery_target_role` for role-sensitive sends | none | additive, non-breaking | P1 | required-now |
| Role token domain | N/A | `implementer|reviewer|meta_reviewer|status` | token validation at resolver boundary | unknown tokens fallback | additive | P1 | required-now |
| Transcript semantics | recipient acts as execution target | recipient preserved as protocol participant identity | `sender`, `recipient` unchanged | metadata extensions | non-breaking | P1 | required-now |

Normative rule:
1. Delivery resolver must not assume a one-to-one mapping between agent identity and role.
2. Explicit role target has precedence over recipient-name mapping.
3. Fallback to recipient-name mapping is allowed only when explicit role target is missing/invalid/unmapped.
4. Role-target parsing is strict token matching; no fuzzy or summary-text inference is allowed.
5. Resolver reads role target only from canonical key path: `ProtocolEnvelopePayload.metadata.delivery_target_role`.

Resolver precedence algorithm (normative):
1. Read `delivery_target_role` only from canonical metadata key path.
2. If `metadata.delivery_target_role` is absent: use legacy recipient-name pane resolver (`DELIVERY_TARGET_ROLE_ABSENT`).
3. If present but token is outside allowed role domain: warn and use legacy recipient-name resolver (`DELIVERY_TARGET_ROLE_INVALID`).
4. If token is valid but pane mapping is unavailable in runtime context: warn and use legacy recipient-name resolver (`DELIVERY_TARGET_ROLE_UNMAPPED`).
5. If token is valid and mapped: route to mapped role pane, regardless of recipient agent match ordering.
6. If both explicit-role and legacy-recipient routes are unavailable: preserve existing unsupported-recipient behavior (no new throw contract in this task).

### 3) Side Effects Contract

| Area | Allowed | Forbidden | Notes | Priority | Timing |
|---|---|---|---|---|---|
| tmux pane routing | choose pane by explicit role target | routing by agent-name-only when explicit role target is present | prevents cross-role injection | P1 | required-now |
| transcript/inbox envelope shape | additive metadata fields | breaking schema change for existing fields | preserve protocol compatibility | P1 | required-now |
| workflow behavior | deterministic same-role delivery across shared-agent setups | implicit dependence on pane index ordering for correctness | ordering may remain but not correctness-critical | P1 | required-now |

Constraint: no new external dependency; pure in-process routing + metadata shaping.

### 4) Error and Fallback Contract

| Trigger | Dependency (if any) | Behavior (`throw|result|fallback`) | Fallback Value/Action | Reason Code | Log Level | Priority | Timing |
|---|---|---|---|---|---|---|---|
| missing `delivery_target_role` | envelope metadata | fallback | route by existing recipient-name mapping | DELIVERY_TARGET_ROLE_ABSENT | info | P1 | required-now |
| invalid `delivery_target_role` token | envelope metadata | fallback | route by existing recipient-name mapping | DELIVERY_TARGET_ROLE_INVALID | warn | P1 | required-now |
| explicit role cannot be mapped to pane | runtime pane map | fallback | route by recipient-name mapping; if also unavailable -> existing unsupported recipient path | DELIVERY_TARGET_ROLE_UNMAPPED | warn | P1 | required-now |
| registry/session read failure | runtime sessions registry | result (existing) | keep existing `registry_read_failed` behavior | DELIVERY_TARGET_REGISTRY_READ_FAILED | warn | P1 | required-now |

Reason-code policy:
1. New role-target resolver reason codes must be machine-stable constants (no free-form variants).
2. Fallback reason codes must be emitted at the resolver decision point (not only at envelope creation call sites).
3. Existing reason-code behavior outside role-target routing remains unchanged.

### 5) Dependency Constraints

| Type | Items | Priority | Timing |
|---|---|---|---|
| must-use | existing runtime pane constants (`runtimePaneIndices`) | P1 | required-now |
| must-use | existing protocol envelope append/store path (additive metadata only) | P1 | required-now |
| must-not-use | role inference from free-form summary text | P1 | required-now |
| must-not-use | agent-name match order as primary authority when explicit role target exists | P1 | required-now |

### 6) Test Matrix

| ID | Scenario | Given | When | Then | Priority | Timing | Evidence |
|---|---|---|---|---|---|---|---|
| T1 | Protocol typing compatibility | envelope metadata includes `delivery_target_role` | typecheck/test | compile-time/runtime acceptance without breaking legacy envelopes | P1 | required-now | automated test |
| T2 | Resolver precedence | envelope recipient=`codex`, metadata target role=`meta_reviewer` | tmux delivery resolve | meta-reviewer pane index selected, not implementer pane | P1 | required-now | automated test |
| T3 | Meta-review kickoff safety | implementer and meta-reviewer both map to same agent identity | meta-review gate opens | TASK is injected into meta-reviewer pane only | P1 | required-now | automated test |
| T4 | Converged approval mirror safety | shared agent identity across roles | converged emits APPROVAL_REQUEST mirror notifications | implementer and reviewer panes each receive correct role-targeted message | P1 | required-now | automated test |
| T5 | Pass handoff role targeting | implementer->reviewer pass with same agent identity | pass command emits delivery | reviewer pane receives handoff, implementer pane does not | P1 | required-now | automated test |
| T6 | Human reply role targeting | active agent identity reused across roles | `bubble reply` command | message goes to currently active role pane deterministically | P1 | required-now | automated test |
| T7 | Legacy fallback | no delivery target role metadata | delivery resolve | current recipient-name mapping still works | P1 | required-now | automated test |
| T8 | Invalid role token fallback | metadata target role invalid | delivery resolve | warning path + legacy fallback mapping | P1 | required-now | automated test |
| T9 | Non-codex parity | agent identity=`claude` reused across multiple roles | delivery flow runs | same deterministic role-target behavior as with codex | P1 | required-now | automated test |
| T10 | No regression for human/status | recipient=`human` or `orchestrator` | delivery resolve | status pane routing unchanged | P2 | required-now | automated test |
| T11 | Approval revise route | `bubble request-rework` from approval gate | approval handoff | implementer role-target metadata present and respected | P2 | required-now | automated test |
| T12 | Unmapped role fallback | metadata target role valid but pane missing in runtime map | delivery resolve | warn reason `DELIVERY_TARGET_ROLE_UNMAPPED` + legacy recipient fallback path | P1 | required-now | automated test |
| T13 | Registry read failure parity | runtime session registry read fails | delivery resolve | existing `registry_read_failed` result contract is preserved; reason code path is `DELIVERY_TARGET_REGISTRY_READ_FAILED` | P1 | required-now | automated test |
| T14 | Docs alignment | design doc update | doc review | role-scoped delivery rule and fallback behavior are documented | P3 | required-now | doc diff |
| T15 | Dual-failure unsupported recipient parity | explicit role target route unavailable and legacy recipient route also unavailable | delivery resolve | existing unsupported-recipient behavior is preserved (no new throw contract) | P1 | required-now | automated test |

## Acceptance Criteria (Binary)

1. AC1: Canonical delivery-target metadata contract is explicit (`metadata.delivery_target_role`) and role domain is fixed.
2. AC2: Resolver precedence is deterministic: explicit role target wins over recipient-agent mapping when valid and mapped.
3. AC3: Missing/invalid/unmapped explicit role paths fall back deterministically to legacy recipient mapping with explicit reason codes.
4. AC4: Meta-review gate kickoff envelopes explicitly target `meta_reviewer`.
5. AC5: Converged/pass/human-reply/approval-revise role-sensitive envelopes include explicit target role metadata.
6. AC6: Legacy envelopes without `delivery_target_role` remain compatible and route as before.
7. AC7: Human/orchestrator status-pane routing semantics remain unchanged.
8. AC8: At least one shared-agent non-codex scenario is test-covered and behaves identically to codex shared-agent scenario.
9. AC9: Design documentation captures role-scoped routing plus fallback semantics.
10. AC10: Registry/session read failure behavior remains parity-safe for existing contract (`registry_read_failed` path preserved).
11. AC11: Dual-failure route (explicit + legacy both unavailable) preserves existing unsupported-recipient behavior.

## AC-Test Traceability

| AC | Covered by Tests |
|---|---|
| AC1 | T1,T2 |
| AC2 | T2,T3,T4,T5,T6 |
| AC3 | T7,T8,T12 |
| AC4 | T3 |
| AC5 | T4,T5,T6,T11 |
| AC6 | T1,T7 |
| AC7 | T10 |
| AC8 | T9 |
| AC9 | T14 |
| AC10 | T13 |
| AC11 | T15 |

Coverage note:
1. `T12`, `T13`, and `T15` are required-now parity guards for resolver fallback and existing failure-path stability.
2. No AC remains without at least one mapped test ID.

## L2 - Implementation Notes (Optional)

1. [later-hardening] Consider promoting `delivery_target_role` from metadata convention to first-class envelope field in a separate compatibility-gated phase.
2. [later-hardening] Add runtime metrics counter for fallback usage (`missing|invalid|unmapped`) to track rollout safety.
3. [later-hardening] Add transcript debug hint for routed pane role in delivery-only mirror notifications.

## Hardening Backlog (Optional)

| ID | Item | Layer | Priority | Timing | Source | Proposed Action |
|---|---|---|---|---|---|---|
| H1 | First-class protocol field migration (`delivery_target_role`) | L2 | P2 | later-hardening | this task | introduce explicit envelope field + migration guard in a separate phase |

## Review Control

1. Any claim of fix must include at least one test where multiple roles share the same agent identity.
2. Fix is not acceptable if it only handles meta-review/codex path.
3. Legacy compatibility (no metadata) must remain green.
4. Delivery behavior for human/orchestrator/status pane must stay unchanged.
5. Resolver fallback path must include explicit `missing|invalid|unmapped` reason-code coverage.

## Spec Lock

Mark task as `IMPLEMENTABLE` when:
1. AC1-AC11 are all satisfied with no unresolved ambiguity.
2. T1-T13 and T15 are green with at least one non-codex shared-agent scenario.
3. T14 doc-diff evidence confirms design-doc alignment for role-first routing and fallback contract.
4. Spec-lock conditions are conjunctive and order-independent; no implicit sequencing dependency is allowed between clauses 1-3.
