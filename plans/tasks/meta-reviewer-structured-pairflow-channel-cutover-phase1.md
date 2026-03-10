---
artifact_type: task
artifact_id: task_meta_reviewer_structured_pairflow_channel_cutover_phase1_v1
title: "Meta-Reviewer Structured Pairflow Channel Cutover (Phase 1)"
status: draft
phase: phase1
target_files:
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
prd_ref: null
plan_ref: null
system_context_ref: docs/pairflow-initial-design.md
owners:
  - "felho"
---

# Task: Meta-Reviewer Structured Pairflow Channel Cutover (Phase 1)

## L0 - Policy

### Goal

Replace fragile pane-marker scraping in meta-review with the same structured Pairflow message channel semantics used by implementer/reviewer handoffs, with machine-validated payloads and deterministic state updates.

### Context

Observed incident pattern:
1. Meta-review run reached `META_REVIEW_FAILED` due to marker timeout.
2. The meta-reviewer session still produced a valid decision payload.
3. This created split truth between pane output and canonical bubble state.

### In Scope

1. Introduce structured meta-review result submission through Pairflow CLI/protocol path (not pane text scraping).
2. Gate ingestion by `run_id` and canonical state/artifact persistence only.
3. Deterministic route handling (`approve`, `rework`, `inconclusive`) from submitted canonical payload.
4. Update meta-reviewer prompt/instructions to emit result through structured channel.
5. Add tests for submission validation, gate routing, timeout fallback, and status consistency.

### Explicit Non-Goal (Per Decision)

1. Do not implement the short-term stabilization of forcing `agent` runner mode (`codex exec`) as the primary fix.

### Out of Scope

1. Global runner-mode strategy changes unrelated to structured channel cutover.
2. Broad redesign of recommendation semantics (`approve|rework|inconclusive` meanings).
3. Historical migration of past bubbles.
4. Removal of meta-reviewer pane itself in this phase.

### Safety Defaults

1. If no valid structured submission is received before timeout, fail-safe route to human gate (`META_REVIEW_FAILED`) with explicit reason.
2. Submission with stale/foreign `run_id` is rejected and non-authoritative.
3. Canonical truth source remains state snapshot plus canonical artifacts (`meta-review-last.md/.json`).

### Contract Boundary / Blast Radius

1. `contract_boundary_override`: `yes`
2. Impacted contracts:
   - protocol/message payload contract for meta-review result handoff,
   - gate ingestion semantics in `META_REVIEW_RUNNING`,
   - CLI command surface for meta-review submission.

## L1 - Change Contract

### 1) Call-site Matrix

| ID | File | Function/Entry | Exact Signature (args -> return) | Insertion Point | Expected Behavior | Priority | Timing | Evidence |
|---|---|---|---|---|---|---|---|---|
| CS1 | `src/cli/commands/bubble/metaReview.ts` | `submit` subcommand implementation | `handleBubbleMetaReviewSubmitCommand(args, io) -> Promise<number>` | `meta-review` command family | Parse/validate structured payload and call core submit service | P1 | required-now | marker timeout split-truth incidents |
| CS2 | `src/cli/index.ts` | command routing | bubble command router | dispatch table | Register and expose `pairflow bubble meta-review submit` | P1 | required-now | CLI entrypoint contract |
| CS3 | `src/core/bubble/metaReview.ts` | canonical submit service (new) | `submitMetaReviewResult(input, deps?) -> Promise<MetaReviewRunResult>` | alongside run/read services | Persist canonical snapshot + canonical artifacts from structured payload | P1 | required-now | state must not depend on pane text |
| CS4 | `src/core/bubble/metaReviewGate.ts` | gate ingestion update | `applyMetaReviewGateOnConvergence(...)` | after `META_REVIEW_RUNNING` transition | Consume canonical submitted result by `run_id`; no primary dependency on marker scraping | P1 | required-now | deterministic routing |
| CS5 | `src/core/bubble/startBubble.ts` | meta-reviewer startup/run instructions | prompt builders | startup/resume prompt construction | Instruct meta-reviewer to return through structured Pairflow channel only | P2 | required-now | operational consistency |
| CS6 | `src/core/runtime/tmuxDelivery.ts` | delivery guidance for meta-reviewer handoff | delivery message builder | action text for meta-reviewer context | Delivery text aligns with structured submit contract | P2 | required-now | reduce protocol drift |
| CS7 | `src/types/protocol.ts` | payload contract typing | protocol types | meta-review payload typing | Add/clarify machine-valid meta-review submission payload shape | P1 | required-now | schema invariants |
| CS8 | `tests/core/bubble/metaReview.test.ts` | core service tests | vitest | metaReview core suite | Validate schema, invariant, run-id checks, persistence | P1 | required-now | regression guard |
| CS9 | `tests/core/bubble/metaReviewGate.test.ts` | gate route tests | vitest | gate integration suite | Validate route correctness from submitted canonical results | P1 | required-now | regression guard |
| CS10 | `tests/cli/bubbleMetaReviewCommand.test.ts` | CLI submit tests | vitest | CLI suite | Validate submit command UX/errors and status consistency | P1 | required-now | user-facing contract |

### 2) Data and Interface Contract

| Contract | Current | Target | Required Fields | Optional Fields | Compatibility | Priority | Timing |
|---|---|---|---|---|---|---|---|
| Meta-review result handoff | pane-delimited JSON marker capture | structured CLI/protocol submission | `bubble_id`, `run_id`, `recommendation`, `summary`, `report_markdown` | `rework_target_message`, `report_json` | additive | P1 | required-now |
| Canonical persistence | tied to runner capture path | shared persistence path for structured submit and read commands | `last_autonomous_*` snapshot fields + canonical artifact refs | warning list | non-breaking | P1 | required-now |
| Gate consumption | implicit sync with pane output availability | explicit lookup by run-id/canonical snapshot | matching `run_id`, valid recommendation/status invariant | warning metadata | non-breaking | P1 | required-now |

### 3) Side Effects Contract

| Area | Allowed | Forbidden | Notes | Priority | Timing |
|---|---|---|---|---|---|
| Bubble state | CAS-based updates of `meta_review` snapshot | blind overwrite without expected fingerprint | preserve existing concurrency semantics | P1 | required-now |
| Artifacts | write canonical `meta-review-last.md` and `meta-review-last.json` | non-canonical report paths | artifacts remain under bubble `artifacts/` | P1 | required-now |
| Runtime transport | keep tmux for delivery/prompting | pane buffer as authoritative result source | tmux becomes transport only | P1 | required-now |

Constraint: `status` and `last-report` remain read-only interfaces.

### 4) Error and Fallback Contract

| Trigger | Dependency (if any) | Behavior (`throw|result|fallback`) | Fallback Value/Action | Reason Code | Log Level | Priority | Timing |
|---|---|---|---|---|---|---|---|
| submit payload schema invalid | parser/validator | throw | reject and return non-zero | META_REVIEW_SCHEMA_INVALID | error | P1 | required-now |
| recommendation/status invariant invalid | core validator | throw | reject with no mutation | META_REVIEW_SCHEMA_INVALID_COMBINATION | error | P1 | required-now |
| `run_id` mismatch vs active meta-review run | runtime binding | throw | reject stale/foreign submit | META_REVIEW_RUN_ID_MISMATCH | warn | P1 | required-now |
| timeout without valid structured submit | gate wait | fallback | route to `META_REVIEW_FAILED` + human approval request | META_REVIEW_GATE_RUN_FAILED | warn | P1 | required-now |
| artifact write warning after snapshot success | filesystem write | result + warning | keep snapshot authoritative | META_REVIEW_ARTIFACT_WRITE_WARNING | warn | P2 | required-now |

### 5) Dependency Constraints

| Type | Items | Priority | Timing |
|---|---|---|---|
| must-use | existing CAS snapshot write pattern (`readStateSnapshot` + `writeStateSnapshot`) | P1 | required-now |
| must-use | canonical artifact refs (`artifacts/meta-review-last.md`, `artifacts/meta-review-last.json`) | P1 | required-now |
| must-use | current lifecycle routing semantics (`approve/rework/inconclusive`) | P1 | required-now |
| must-not-use | pane marker block parsing as primary truth source | P1 | required-now |
| must-not-use | silent acceptance of run-id mismatched submissions | P1 | required-now |

### 6) Test Matrix

| ID | Scenario | Given | When | Then | Priority | Timing | Evidence |
|---|---|---|---|---|---|---|---|
| T1 | Submit success `approve` | bubble in `META_REVIEW_RUNNING` with active run-id | submit valid payload | canonical snapshot/artifact updated consistently | P1 | required-now | `tests/core/bubble/metaReview.test.ts` |
| T2 | Submit success `rework` | same as T1 | submit valid rework payload | rework target persisted; gate can route deterministically | P1 | required-now | `tests/core/bubble/metaReview.test.ts` |
| T3 | Reject missing rework target | `recommendation=rework` | submit without `rework_target_message` | submit rejected with invariant error | P1 | required-now | `tests/core/bubble/metaReview.test.ts` |
| T4 | Reject stale run-id | active run-id differs | submit mismatched run-id | reject with `META_REVIEW_RUN_ID_MISMATCH`; no mutation | P1 | required-now | `tests/core/bubble/metaReview.test.ts` |
| T5 | Gate route from submitted `approve` | canonical submitted result exists | convergence gate applies | reaches human approval route with consistent summary metadata | P1 | required-now | `tests/core/bubble/metaReviewGate.test.ts` |
| T6 | Gate route from submitted `inconclusive/error` | canonical submitted/derived error result | gate applies | deterministic `META_REVIEW_FAILED` human-safe route | P1 | required-now | `tests/core/bubble/metaReviewGate.test.ts` |
| T7 | Timeout fallback with no submit | no valid submission before deadline | gate wait expires | fallback reason and route emitted deterministically | P1 | required-now | `tests/core/bubble/metaReviewGate.test.ts` |
| T8 | Read consistency | canonical snapshot/report exists | run `meta-review status` and `last-report` | read-only output consistent with persisted snapshot/artifacts | P1 | required-now | `tests/cli/bubbleMetaReviewCommand.test.ts` |
| T9 | CLI submit contract | valid and invalid CLI invocations | run submit command | structured success + deterministic error surfaces | P1 | required-now | `tests/cli/bubbleMetaReviewCommand.test.ts` |

## Acceptance Criteria

1. AC1: Meta-review handoff uses a structured, machine-valid Pairflow submission contract.
2. AC2: Gate routing in `META_REVIEW_RUNNING` consumes canonical submitted result, not pane text as primary source.
3. AC3: `run_id` mismatch submissions are deterministically rejected without state/artifact mutation.
4. AC4: Canonical snapshot and canonical report artifacts remain coherent for accepted submissions.
5. AC5: Timeout/no-submit path still fails safe to human gate with explicit reason codes.
6. AC6: Short-term runner-mode forcing (`agent` mode switch) is not required to satisfy this phase.

### Acceptance Traceability

| Acceptance Criterion | Call Sites | Tests |
|---|---|---|
| AC1 | CS1, CS2, CS3, CS7 | T1, T2, T9 |
| AC2 | CS3, CS4 | T5, T6, T7 |
| AC3 | CS3, CS7 | T4 |
| AC4 | CS3, CS4 | T1, T2, T8 |
| AC5 | CS4 | T7 |
| AC6 | CS4, CS5 | T5, T6 |

## L2 - Implementation Notes (Optional)

1. [later-hardening] Remove residual marker parsing code paths fully after rollout confidence.
2. [later-hardening] Add submit idempotency semantics for duplicate/retry attempts.
3. [later-hardening] Add per-run latency telemetry for gate consumption.

## Hardening Backlog (Optional)

| ID | Item | Layer | Priority | Timing | Source | Proposed Action |
|---|---|---|---|---|---|---|
| H1 | Full cleanup of legacy pane-marker parsing utilities | L2 | P2 | later-hardening | post-rollout cleanup | separate cleanup task |
| H2 | Idempotent submit retry key | L2 | P3 | later-hardening | robustness follow-up | separate protocol hardening task |

## Review Control

1. P1 regresszió, ha meta-review canonical döntés továbbra is pane marker scrape-re támaszkodik primer forrásként.
2. P1 regresszió, ha run-id mismatch submit állapotot mégis módosít.
3. P1 regresszió, ha timeout fallback elveszíti a deterministic human-safe route-ot.

## Assumptions

1. Meta-reviewer pane képes Pairflow CLI submit parancsot futtatni a bubble kontextusban.
2. Runtime run-id binding (`metaReviewerPane.runId`) elérhető validációhoz.

## Open Questions

1. A submit payload kezeljen-e opcionális `report_json_ref` mezőt ebben a fázisban, vagy maradjon csak `report_json` inline?

## Spec Lock

Mark task as `IMPLEMENTABLE` when AC1-AC6 are satisfied and T1-T9 pass without pane-marker primary truth dependency.
