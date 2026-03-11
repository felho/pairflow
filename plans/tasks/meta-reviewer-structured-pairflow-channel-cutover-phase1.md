---
artifact_type: task
artifact_id: task_meta_reviewer_structured_pairflow_channel_cutover_phase1_v2
title: "Meta-Reviewer Structured Pairflow Channel Cutover (Phase 1)"
status: implementable
phase: phase1
target_files:
  - src/types/bubble.ts
  - src/core/state/stateSchema.ts
  - src/core/state/transitions.ts
  - src/core/bubble/metaReview.ts
  - src/core/bubble/metaReviewGate.ts
  - src/core/bubble/startBubble.ts
  - src/core/runtime/tmuxDelivery.ts
  - src/cli/commands/bubble/metaReview.ts
  - src/cli/index.ts
  - src/types/protocol.ts
  - tests/core/bubble/metaReview.test.ts
  - tests/core/bubble/metaReviewGate.test.ts
  - tests/cli/bubbleMetaReviewCommand.test.ts
  - tests/core/state/stateSchema.test.ts
prd_ref: null
plan_ref: null
system_context_ref: docs/pairflow-initial-design.md
owners:
  - "felho"
---

# Task: Meta-Reviewer Structured Pairflow Channel Cutover (Phase 1)

## L0 - Policy

### Goal

Replace fragile pane-marker scraping in meta-review with the same structured Pairflow handoff model used by implementer/reviewer: explicit active role ownership, machine-valid payload, and deterministic state/artifact persistence.

### Context

Observed incident pattern:
1. Meta-review run reached `META_REVIEW_FAILED` due to marker timeout.
2. The meta-reviewer session still produced a valid decision payload.
3. This created split truth between pane output and canonical bubble state.
4. This task is the canonical replacement for `meta-reviewer-cli-protocol-alignment-phase1.md`.

Root simplification decision:
1. Meta-review in a round is treated as a single owned turn, like implementer/reviewer.
2. Authority comes from active role + round ownership, not from ad-hoc pane output parsing.

### Ownership Tuple (Normative)

For this task, "active meta-review ownership" means the full tuple below must be valid at submit time:
1. `state.status = META_REVIEW_RUNNING`
2. `state.active_role = meta_reviewer`
3. `state.active_agent` is present and identifies the owner of the current turn
4. submit payload `round` matches the current active round

Any missing or mismatched tuple element is non-authoritative and must not mutate canonical state/artifacts.

### In Scope

1. Promote meta-reviewer to first-class active role ownership during `META_REVIEW_RUNNING`.
2. Accept structured meta-review submission only from the currently active ownership tuple in the current round.
3. Use ownership tuple invariants as the only authoritative ingestion guard.
4. Keep canonical snapshot/artifact persistence (`state.meta_review`, `artifacts/meta-review-last.md/.json`) as single source of truth.
5. Update prompts/delivery guidance to use structured return path only.
6. Add tests for role-gated submission validation, gate routing, timeout fallback, and status consistency.
7. Remove legacy pane-marker-based meta-review ingestion/routing paths in this phase (no hybrid decision path).

### Explicit Non-Goal (Per Decision)

1. Do not implement the short-term stabilization of forcing `agent` runner mode (`codex exec`) as the primary fix.

### Out of Scope

1. Global runner-mode strategy changes unrelated to structured channel cutover.
2. Broad redesign of recommendation semantics (`approve|rework|inconclusive` meanings).
3. Historical migration/backfill of past bubble states.
4. Removal of meta-reviewer pane itself in this phase.

### Safety Defaults

1. If no valid structured submission is received before timeout, fail-safe route to human gate (`META_REVIEW_FAILED`) with explicit reason.
2. Submission is rejected when lifecycle/ownership invariants fail (wrong state, wrong role/agent, stale round).
3. Canonical truth source remains state snapshot plus canonical artifacts (`meta-review-last.md/.json`).
4. Legacy bubbles without active meta-review role metadata remain fail-safe and route to human gate if invariants cannot be established.

### Contract Boundary / Blast Radius

1. `contract_boundary_override`: `yes`
2. Impacted contracts:
   - state role model (`active_role`) for meta-review execution window,
   - protocol/message payload contract for meta-review result handoff,
   - gate ingestion semantics in `META_REVIEW_RUNNING`,
   - CLI command surface for meta-review submission.

## L1 - Change Contract

### 1) Call-site Matrix

| ID | File | Function/Entry | Exact Signature (args -> return) | Insertion Point | Expected Behavior | Priority | Timing | Evidence |
|---|---|---|---|---|---|---|---|---|
| CS1 | `src/types/bubble.ts` | role model extension | `AgentRole` / state types | role/type declarations | Include `meta_reviewer` as first-class active role option | P1 | required-now | align meta-review with role-owned loop |
| CS2 | `src/core/state/stateSchema.ts` | state validation updates | `validateBubbleStateSnapshot` | active-role validation branch | Accept/validate `meta_reviewer` active role invariants | P1 | required-now | reject malformed ownership state |
| CS3 | `src/core/state/transitions.ts` | transition policy update | `canTransition` map | lifecycle transition graph | Keep `META_REVIEW_RUNNING` transitions compatible with active meta-review ownership | P1 | required-now | deterministic gate transitions |
| CS4 | `src/core/bubble/metaReviewGate.ts` | gate ownership handoff | `applyMetaReviewGateOnConvergence(...)` | `READY_FOR_APPROVAL -> META_REVIEW_RUNNING` path | Enter `META_REVIEW_RUNNING` with active meta-reviewer owner, enforce single-turn ownership, and route only from canonical submitted snapshot (no marker fallback) | P1 | required-now | same ownership model as implementer/reviewer |
| CS5 | `src/core/bubble/metaReview.ts` | canonical submit ingestion | `submitMetaReviewResult(input, deps?) -> Promise<MetaReviewRunResult>` | submit service path | Validate submit against active role + round ownership; persist canonical snapshot/artifacts; remove marker-based ingest helpers from decision path | P1 | required-now | no pane text authority |
| CS6 | `src/cli/commands/bubble/metaReview.ts` | submit subcommand implementation | `handleBubbleMetaReviewSubmitCommand(args, io) -> Promise<number>` | `meta-review` command family | Parse/validate payload and call core submit service | P1 | required-now | CLI contract |
| CS7 | `src/cli/index.ts` | command routing | bubble command router | dispatch table | Register/route `pairflow bubble meta-review submit` | P1 | required-now | entrypoint contract |
| CS8 | `src/core/bubble/startBubble.ts` | startup/run instructions | prompt builders | startup/resume prompt construction | Instruct meta-reviewer to return through structured Pairflow submit path only | P2 | required-now | operational consistency |
| CS9 | `src/core/runtime/tmuxDelivery.ts` | delivery guidance alignment | delivery message builder | meta-reviewer action text | Delivery text aligns with role-owned structured submit contract | P2 | required-now | reduce protocol drift |
| CS10 | `src/types/protocol.ts` | payload typing | protocol types | meta-review payload typing | Add/clarify machine-valid meta-review submission payload shape (role-owned turn) | P1 | required-now | schema invariants |
| CS11 | `tests/core/bubble/metaReview.test.ts` | core service tests | vitest | metaReview core suite | Validate schema, role/round guard, persistence | P1 | required-now | regression guard |
| CS12 | `tests/core/bubble/metaReviewGate.test.ts` | gate route tests | vitest | gate integration suite | Validate role-owned routing and fallback behavior | P1 | required-now | regression guard |
| CS13 | `tests/cli/bubbleMetaReviewCommand.test.ts` | CLI submit tests | vitest | CLI suite | Validate submit command UX/errors/status consistency | P1 | required-now | user-facing contract |
| CS14 | `tests/core/state/stateSchema.test.ts` | state role coverage | vitest | state schema suite | Validate `meta_reviewer` role acceptance/rejection paths | P1 | required-now | schema lock |

### 2) Data and Interface Contract

| Contract | Current | Target | Required Fields | Optional Fields | Compatibility | Priority | Timing |
|---|---|---|---|---|---|---|---|
| Meta-review ownership | side-channel pane/run binding | first-class active role ownership | `state= META_REVIEW_RUNNING`, `active_role=meta_reviewer`, `active_agent` set, active round identity | diagnostic metadata | behavior change | P1 | required-now |
| Meta-review submit handoff | pane-delimited JSON marker capture | structured CLI/protocol submission | `bubble_id`, `round`, `recommendation`, `summary`, `report_markdown` | `rework_target_message`, `report_json` | behavior change (marker-only producers no longer authoritative); CLI surface additive | P1 | required-now |
| Submitter identity binding | implicit trust in pane/run context | ownership-bound actor validation | authoritative submitter identity from active protocol/session context + ownership tuple match | diagnostic metadata | behavior change | P1 | required-now |
| Canonical persistence | tied to runner capture path | shared persistence path for structured submit/read commands | `last_autonomous_*` snapshot fields + canonical artifact refs | warning list | non-breaking | P1 | required-now |
| Gate consumption | implicit sync with pane output | explicit ownership + round validation | active meta-reviewer ownership + matching round + valid recommendation/status invariant | warning metadata | behavior fix | P1 | required-now |

### 3) Side Effects Contract

| Area | Allowed | Forbidden | Notes | Priority | Timing |
|---|---|---|---|---|---|
| Bubble state | CAS-based updates of active role + `meta_review` snapshot | blind overwrite without expected fingerprint/state | preserve concurrency semantics | P1 | required-now |
| Artifacts | write canonical `meta-review-last.md` and `meta-review-last.json` | non-canonical report paths | artifacts remain under bubble `artifacts/` | P1 | required-now |
| Runtime transport | keep tmux for delivery/prompting | pane buffer as authoritative result source | tmux is transport, not truth source | P1 | required-now |

Constraint: `status` and `last-report` remain read-only interfaces.

### 4) Error and Fallback Contract

| Trigger | Dependency (if any) | Behavior (`throw|result|fallback`) | Fallback Value/Action | Reason Code | Log Level | Priority | Timing |
|---|---|---|---|---|---|---|---|
| submit payload schema invalid | parser/validator | throw | reject and return non-zero | META_REVIEW_SCHEMA_INVALID | error | P1 | required-now |
| recommendation/status invariant invalid | core validator | throw | reject with no mutation | META_REVIEW_SCHEMA_INVALID_COMBINATION | error | P1 | required-now |
| submit while state is not `META_REVIEW_RUNNING` | lifecycle gate | throw | reject as non-authoritative | META_REVIEW_STATE_INVALID | warn | P1 | required-now |
| submit sender/role does not match active meta-reviewer ownership | authoritative actor identity from active protocol/session context | throw | reject as non-authoritative | META_REVIEW_SENDER_MISMATCH | warn | P1 | required-now |
| submit round does not match active round | round binding | throw | reject stale/foreign submit | META_REVIEW_ROUND_MISMATCH | warn | P1 | required-now |
| timeout without valid structured submit | gate wait | fallback | route to `META_REVIEW_FAILED` + human approval request | META_REVIEW_GATE_RUN_FAILED | warn | P1 | required-now |
| artifact write warning after snapshot success | filesystem write | result + warning | keep snapshot authoritative | META_REVIEW_ARTIFACT_WRITE_WARNING | warn | P2 | required-now |

### 5) Dependency Constraints

| Type | Items | Priority | Timing |
|---|---|---|---|
| must-use | existing CAS snapshot write pattern (`readStateSnapshot` + `writeStateSnapshot`) | P1 | required-now |
| must-use | canonical artifact refs (`artifacts/meta-review-last.md`, `artifacts/meta-review-last.json`) | P1 | required-now |
| must-use | current lifecycle routing semantics (`approve/rework/inconclusive`) | P1 | required-now |
| must-not-use | pane marker block parsing on any authoritative meta-review ingest/routing path | P1 | required-now |
| must-not-use | submission acceptance based only on pane session/run metadata without state ownership validation | P1 | required-now |
| must-not-use | any execution-metadata-based acceptance gate that bypasses ownership + round + state validation | P1 | required-now |
| must-not-use | hybrid ingestion logic where structured submit and marker parsing can both mutate/route canonical meta-review decision | P1 | required-now |

### 6) Test Matrix

| ID | Scenario | Given | When | Then | Priority | Timing | Evidence |
|---|---|---|---|---|---|---|---|
| T1 | Submit success `approve` | bubble in `META_REVIEW_RUNNING` with valid ownership tuple | submit valid payload | canonical snapshot/artifact updated consistently | P1 | required-now | `tests/core/bubble/metaReview.test.ts` |
| T2 | Submit success `rework` | same as T1 | submit valid rework payload | rework target persisted; gate can route deterministically | P1 | required-now | `tests/core/bubble/metaReview.test.ts` |
| T3 | Reject missing rework target | `recommendation=rework` | submit without `rework_target_message` | submit rejected with invariant error | P1 | required-now | `tests/core/bubble/metaReview.test.ts` |
| T4 | Reject sender/role mismatch | state owned by a different active role/agent than submitter context | submit payload | reject with `META_REVIEW_SENDER_MISMATCH`; no mutation | P1 | required-now | `tests/core/bubble/metaReview.test.ts` |
| T5 | Reject stale round submit | active round differs | submit mismatched round | reject with `META_REVIEW_ROUND_MISMATCH`; no mutation | P1 | required-now | `tests/core/bubble/metaReview.test.ts` |
| T6 | Gate route from submitted `approve` | canonical submitted result exists | convergence gate applies | reaches human approval route with consistent summary metadata | P1 | required-now | `tests/core/bubble/metaReviewGate.test.ts` |
| T7 | Gate route from submitted `inconclusive` or derived error status | canonical submitted/derived non-approve result exists | gate applies | deterministic `META_REVIEW_FAILED` human-safe route | P1 | required-now | `tests/core/bubble/metaReviewGate.test.ts` |
| T8 | Timeout fallback with no submit | no valid submission before deadline | gate wait expires | fallback reason code and route emitted deterministically | P1 | required-now | `tests/core/bubble/metaReviewGate.test.ts` |
| T9 | Read consistency | canonical snapshot/report exists | run `meta-review status` and `last-report` | read-only output consistent with persisted snapshot/artifacts | P1 | required-now | `tests/cli/bubbleMetaReviewCommand.test.ts` |
| T10 | CLI submit contract | valid and invalid CLI invocations | run submit command | structured success + deterministic error surfaces | P1 | required-now | `tests/cli/bubbleMetaReviewCommand.test.ts` |
| T11 | State schema role compatibility | `active_role=meta_reviewer` states | validate state snapshot | accepted when complete, rejected when partial/inconsistent | P1 | required-now | `tests/core/state/stateSchema.test.ts` |
| T12 | No-hybrid enforcement | code/config wired for structured submit path | convergence + routing executed | marker-based ingest code cannot decide route or mutate canonical meta-review snapshot | P1 | required-now | `tests/core/bubble/metaReviewGate.test.ts` |

## Acceptance Criteria (Binary)

1. AC1: Meta-review handoff uses structured, machine-valid Pairflow submission.
2. AC2: `META_REVIEW_RUNNING` has explicit active meta-reviewer ownership and submit acceptance depends on that ownership.
3. AC3: Stale/wrong sender or wrong-round submissions are deterministically rejected without state/artifact mutation.
4. AC4: Canonical snapshot and canonical report artifacts remain coherent for accepted submissions.
5. AC5: Timeout/no-submit path still fails safe to human gate with explicit reason codes.
6. AC6: Existing gate-routing semantics remain deterministic for submitted `approve` vs `inconclusive`/derived-error outcomes, while runner mode stays policy-neutral (no mandatory `agent` mode forcing in this phase).
7. AC7: Legacy pane-marker ingestion/routing path is removed from authoritative decision flow (no hybrid behavior).

### Acceptance Traceability

| Acceptance Criterion | Call Sites | Tests / Verification |
|---|---|---|
| AC1 | CS5, CS6, CS7, CS10 | T1, T2, T10 |
| AC2 | CS1, CS2, CS3, CS4, CS5 | T1, T4, T11 |
| AC3 | CS5, CS10 | T4, T5 |
| AC4 | CS5, CS4 | T1, T2, T9 |
| AC5 | CS4 | T8 |
| AC6 | CS4, CS8, CS9 | T6, T7 + L0 Explicit Non-Goal lock |
| AC7 | CS4, CS5 | T12 |

## L2 - Implementation Notes (Optional)

1. [later-hardening] Add idempotent duplicate-submit handling for repeated command retries.
2. [later-hardening] Add per-run latency telemetry for gate consumption.

## Hardening Backlog (Optional)

| ID | Item | Layer | Priority | Timing | Source | Proposed Action |
|---|---|---|---|---|---|---|
| H1 | Idempotent submit retry key | L2 | P3 | later-hardening | robustness follow-up | separate protocol hardening task |

## Review Control

1. P1 regression if canonical meta-review decision on any authoritative path depends on pane-marker scraping.
2. P1 regression if a submit outside the active ownership tuple can still mutate state/artifacts.
3. P1 regression if stale-round submit remains acceptable.
4. P1 regression if timeout fallback loses deterministic human-safe routing.
5. P1 regression if marker parsing can re-enter authoritative ingest/routing (hybrid behavior).

## Assumptions

1. Meta-reviewer pane can execute Pairflow CLI submit command in bubble context.
2. State role extension (`meta_reviewer`) is acceptable within Phase 1 scope.

## Open Questions (Non-Blocking)

1. None.

## Spec Lock

Task is `IMPLEMENTABLE` when AC1-AC7 are satisfied, T1-T12 pass, and meta-review ingest is guarded only by ownership+round+state invariants without marker-based hybrid authority.
