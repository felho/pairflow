---
artifact_type: task
artifact_id: task_meta_review_gate_phase1_persistence_and_command_split_v1
title: "Meta Review Gate - Phase 1 Persistence and Command Split"
status: implementable
phase: phase1
target_files:
  - src/types/bubble.ts
  - src/core/state/initialState.ts
  - src/core/state/stateSchema.ts
  - src/core/bubble/paths.ts
  - src/core/bubble/metaReview.ts
  - src/cli/commands/bubble/metaReview.ts
  - src/cli/index.ts
  - tests/core/bubble/metaReview.test.ts
  - tests/cli/bubbleMetaReviewCommand.test.ts
  - tests/core/state/stateSchema.test.ts
prd_ref: docs/meta-review-gate-prd.md
plan_ref: plans/archive/tasks/meta-review-gate/meta-review-gate-plan-v1.md
system_context_ref: docs/pairflow-initial-design.md
normative_refs:
  - docs/meta-review-gate-prd.md
  - docs/pairflow-initial-design.md
owners:
  - "felho"
---

# Task: Meta Review Gate - Phase 1 Persistence and Command Split

## Revision Log

1. `v2` (2026-03-09 post-implementation alignment): clarified that the delivered runtime now prefers dedicated meta-reviewer pane execution (`pane_agent`) with deterministic fallback, while Phase 1 persistence/read-only contracts remain unchanged.

## L0 - Policy

### Goal

Deliver the first implementation slice of Meta Review Gate by introducing:
1. canonical last-autonomous snapshot persistence,
2. CLI command split (`run`, `status`, `last-report`),
3. cheap retrieval without rerunning review.

Phase 1 intentionally establishes storage + command contracts first, while deferring autonomous loop routing to Phase 2.

### In Scope

1. Extend bubble state contract with `meta_review` snapshot fields.
2. Add canonical artifact paths for rolling last snapshot files.
3. Add `pairflow bubble meta-review` command family with explicit subcommands:
   - `run`
   - `status`
   - `last-report`
4. Ensure `status`/`last-report` are read-only and non-generative.
5. Ensure `run` persists latest autonomous snapshot and rolling artifacts in single-slot overwrite model.
6. Keep legacy bubbles (without `meta_review`) readable through deterministic default normalization.
7. Add unit/integration tests for command parsing, persistence semantics, and read-only retrieval behavior.

### Out of Scope

1. Automatic lifecycle trigger on `READY_FOR_APPROVAL`.
2. Auto-dispatch of `request-rework` and budget increment logic.
3. `META_REVIEW_RUNNING` / `READY_FOR_HUMAN_APPROVAL` lifecycle-state wiring.
4. Sticky human-gate enforcement in state transitions.
5. Meta-reviewer tmux pane orchestration and UI rendering updates.
6. Historical archive retention beyond single-slot overwrite (`meta-review-last.*` only in Phase 1).

### Safety Defaults

1. Fail-safe default: if live review execution fails/unavailable, write snapshot with `last_autonomous_status=error` and `last_autonomous_recommendation=inconclusive`.
2. Read paths (`status`, `last-report`) must never mutate state, artifacts, counters, or lifecycle state.
3. Phase 1 `run` must not mutate bubble lifecycle state; lifecycle routing remains unchanged until Phase 2.

### Contract Boundary / Blast Radius

1. `contract_boundary_override`: `yes`
2. Affected boundaries:
   - CLI command interface contract,
   - bubble state schema contract,
   - artifact persistence contract for autonomous review snapshot.

## L1 - Change Contract

### 1) Call-site Matrix

| ID | File | Function/Entry | Exact Signature (args -> return) | Expected Behavior | Priority | Timing | Evidence |
|---|---|---|---|---|---|---|---|
| CS1 | `src/types/bubble.ts` | meta-review snapshot types | `interface BubbleMetaReviewSnapshotState` + `BubbleStateSnapshot.meta_review?: BubbleMetaReviewSnapshotState` | Additive typed state shape for canonical last-autonomous snapshot and counters, with legacy snapshot compatibility (`meta_review` may be absent on old bubbles) | P1 | required-now | T1,T2,T3,T16 |
| CS2 | `src/core/state/initialState.ts` | initial snapshot defaults | `createInitialBubbleState(bubbleId: string) -> BubbleStateSnapshot` | New bubbles initialize deterministic `meta_review` defaults (`auto_rework_limit=5`, counters zeroed, nullable last-run fields) | P1 | required-now | T1,T2 |
| CS3 | `src/core/state/stateSchema.ts` | runtime validation | `validateBubbleStateSnapshot(input: unknown) -> ValidationResult<BubbleStateSnapshot>` | Accept and validate new `meta_review.*` fields; keep absent `meta_review` subtree backward-compatible; reject invalid enum/value/co-occurrence types with field-level errors | P1 | required-now | T2,T3,T19,T20 |
| CS4 | `src/core/bubble/paths.ts` | artifact path resolution | `getBubblePaths(repoPathInput: string, bubbleId: string) -> BubblePaths` | Add resolved paths for `artifacts/meta-review-last.json` and `artifacts/meta-review-last.md` | P1 | required-now | T4 |
| CS5 | `src/core/bubble/metaReview.ts` | core service | `runMetaReview(input: MetaReviewRunInput) -> Promise<MetaReviewRunResult>` | Execute live autonomous review through the runner boundary (current implementation: dedicated pane-agent path preferred, deterministic fallback path retained); on runner failure, normalize to fallback snapshot (`error/inconclusive`); perform read-before-CAS and persist canonical snapshot before any success result; update rolling artifacts (single-slot overwrite) best-effort; return structured run output | P1 | required-now | T5,T6,T7,T8,T20,T21,T22 |
| CS6 | `src/core/bubble/metaReview.ts` | cached reads | `getMetaReviewStatus(input: MetaReviewReadInput) -> Promise<MetaReviewStatusView>` and `getMetaReviewLastReport(input: MetaReviewReadInput) -> Promise<MetaReviewLastReportView>` | Read only canonical latest autonomous snapshot/report reference from state/artifacts; no live execution; apply read-time legacy normalization defaults when `meta_review` subtree is absent | P1 | required-now | T9,T10,T16,T17 |
| CS7 | `src/cli/commands/bubble/metaReview.ts` | CLI command handler | `runBubbleMetaReviewCommand(args: string[] | BubbleMetaReviewCommandOptions, cwd?: string) -> Promise<BubbleMetaReviewCommandResult | null>` | Parse nested subcommands (`run|status|last-report`), dispatch to core service, support compact text + JSON output | P1 | required-now | T11,T12,T13,T14 |
| CS8 | `src/cli/index.ts` | bubble subcommand registry | `bubbleSubcommandHandlers["meta-review"]` | Register `meta-review` under `pairflow bubble` command tree without regression to existing subcommands | P1 | required-now | T11,T15 |

### 2) Data and Interface Contract

| Contract | Current | Target | Required Fields | Optional Fields | Compatibility | Priority | Timing |
|---|---|---|---|---|---|---|---|
| Bubble snapshot state | No canonical meta-review snapshot | Add `meta_review` subtree on bubble state | `last_autonomous_run_id`, `last_autonomous_status`, `last_autonomous_recommendation`, `auto_rework_count`, `auto_rework_limit`, `sticky_human_gate`, `last_autonomous_updated_at` | `last_autonomous_summary`, `last_autonomous_report_ref` | additive, backward-compatible | P1 | required-now |
| Conditional field requirement | `last_autonomous_rework_target_message` not persisted today | Persist as canonical snapshot field with recommendation-coupled requirement | `last_autonomous_rework_target_message` when recommendation is `rework` | advisory text for `approve|inconclusive` | additive | P1 | required-now |
| Legacy snapshot compatibility (read view) | Existing bubbles may have no `meta_review` subtree | Read path must normalize to deterministic empty view | `auto_rework_count=0`, `auto_rework_limit=5`, `sticky_human_gate=false` | `null` for last-autonomous fields; status view emits `has_run=false` | backward-compatible | P1 | required-now |
| Recommendation enum | N/A | `rework | approve | inconclusive` | valid enum value when present | `null` prior to first run | additive | P1 | required-now |
| Run status enum | N/A | `success | error | inconclusive` | valid enum value when present | `null` prior to first run | additive | P1 | required-now |
| Status read view (`MetaReviewStatusView`) | N/A | canonical read response for `meta-review status` | `has_run`, `auto_rework_count`, `auto_rework_limit`, `sticky_human_gate`, `last_autonomous_status`, `last_autonomous_recommendation`, `last_autonomous_updated_at` | `last_autonomous_summary`, `last_autonomous_report_ref`, `last_autonomous_rework_target_message`, `last_autonomous_run_id` | additive | P1 | required-now |
| Last-report read view (`MetaReviewLastReportView`) | N/A | canonical read response for `meta-review last-report` | `has_report` | `report_ref`, `summary`, `updated_at` | additive | P1 | required-now |
| CLI command surface | no meta-review command family | `pairflow bubble meta-review <run|status|last-report> ...` | subcommand token + `--id` | `--repo`, `--json`, `--verbose`, `--depth` (run only) | additive | P1 | required-now |

Field rules (required-now):
1. `last_autonomous_rework_target_message` is required (non-empty) when `last_autonomous_recommendation=rework`.
2. For `approve|inconclusive`, `last_autonomous_rework_target_message` is optional advisory text.
3. `auto_rework_limit` defaults to `5` and must be `>=1`.
4. `auto_rework_count` must be integer `>=0`.
5. `status` and `last-report` must return stable output even when no run has been executed yet.
6. `status` canonical source is state snapshot data; it must not depend on markdown/json artifact availability.
7. `last-report` may read artifact content, but missing artifact must return a successful no-report response (`has_report=false`) instead of triggering rerun.
8. Enum co-occurrence: `last_autonomous_recommendation=rework|approve` requires `last_autonomous_status=success`.
9. Enum co-occurrence: `last_autonomous_status=error|inconclusive` requires `last_autonomous_recommendation=inconclusive`.
10. Before first run, `last_autonomous_status` and `last_autonomous_recommendation` are both `null` and status view must emit `has_run=false`.
11. Required fields in the table are required as key presence in canonical snapshot; `last_autonomous_run_id`, `last_autonomous_status`, `last_autonomous_recommendation`, and `last_autonomous_updated_at` may be `null` before first successful/failed run.

Normalization authority (required-now):
1. Legacy default normalization is owned by read-service layer in `src/core/bubble/metaReview.ts` (`getMetaReviewStatus` / `getMetaReviewLastReport`).
2. Normalization must not mutate persisted snapshot implicitly; it is response shaping only.

### 3) Side Effects Contract

| Area | Allowed | Forbidden | Notes | Priority | Timing |
|---|---|---|---|---|---|
| Snapshot persistence (`run`) | Overwrite canonical latest state fields and rolling artifacts | Append unbounded history artifacts in Phase 1 | single-slot overwrite is mandatory | P1 | required-now |
| Cached reads (`status`/`last-report`) | Read state/artifact content | Triggering live review execution | non-generative retrieval contract | P1 | required-now |
| Lifecycle/state machine | No lifecycle transition in Phase 1 run path | `request-rework` dispatch or state transition mutation | routing belongs to Phase 2 | P1 | required-now |

Constraint: review computation adapter should be pure-by-default from Pairflow core perspective; only persistence writes are allowed side effects in Phase 1.

### 4) Error and Fallback Contract

| Trigger | Dependency (if any) | Behavior (`throw|result|fallback`) | Fallback Value/Action | Reason Code | Log Level | Priority | Timing |
|---|---|---|---|---|---|---|---|
| Live review adapter unavailable/fails | meta-review runner adapter | fallback | persist snapshot as `status=error`, `recommendation=inconclusive`, include failure summary | META_REVIEW_RUNNER_ERROR | warn | P1 | required-now |
| Snapshot write conflict | state store lock/CAS | throw | return command error; keep previous canonical snapshot untouched | META_REVIEW_SNAPSHOT_WRITE_CONFLICT | warn | P1 | required-now |
| Rolling artifact write failure | filesystem | result + warn | state snapshot remains canonical source, return warning metadata | META_REVIEW_ARTIFACT_WRITE_WARNING | warn | P2 | required-now |
| `status` before first run | N/A | result | return explicit empty snapshot view (`has_run=false`) | META_REVIEW_NO_SNAPSHOT | info | P1 | required-now |
| `last-report` without stored report | N/A | result | return no-report response with clear message, exit success | META_REVIEW_REPORT_MISSING | info | P1 | required-now |
| Invalid persisted enum/value | state schema validation | throw | reject invalid state with field-level validation error | META_REVIEW_SCHEMA_INVALID | warn | P1 | required-now |
| Invalid status/recommendation co-occurrence | state schema validation | throw | reject invalid pairings (for example `status=error` with `recommendation=rework`) with field-level validation error | META_REVIEW_SCHEMA_INVALID_COMBINATION | warn | P1 | required-now |
| Missing/invalid rework target message on `rework` recommendation | run payload invariants | throw | return validation error before canonical snapshot write; keep previous snapshot/artifacts untouched | META_REVIEW_REWORK_MESSAGE_INVALID | warn | P1 | required-now |

### 5) Dependency Constraints

| Type | Items | Priority | Timing |
|---|---|---|---|
| must-use | Existing `readStateSnapshot` / `writeStateSnapshot` lock+CAS path | P1 | required-now |
| must-use | Existing bubble resolution (`resolveBubbleById`) and path model (`getBubblePaths`) | P1 | required-now |
| must-use | PRD recommendation/status enums exactly as defined | P1 | required-now |
| must-not-use | Independent skill-local durable cache for "last run" | P1 | required-now |
| must-not-use | Hidden lifecycle mutation in `status`/`last-report` paths | P1 | required-now |
| must-not-use | Unbounded historical artifact accumulation in Phase 1 | P2 | required-now |

### 6) Test Matrix

| ID | Scenario | Given | When | Then | Priority | Timing | Evidence |
|---|---|---|---|---|---|---|---|
| T1 | Initial state default contract | new bubble state init | create initial state | `meta_review` defaults exist; `auto_rework_limit=5`, count=0, sticky=false | P1 | required-now | automated test |
| T2 | State schema accepts valid meta-review snapshot | snapshot with valid enums/fields | schema validate | validation success | P1 | required-now | automated test |
| T3 | State schema rejects invalid values | invalid recommendation/status/counter types | schema validate | validation fails with targeted field paths | P1 | required-now | automated test |
| T4 | Artifact path wiring | bubble paths resolved | call `getBubblePaths` | `meta-review-last.json` and `.md` paths resolve under artifacts dir | P1 | required-now | automated test |
| T5 | Run persistence happy path | adapter returns `rework` + report + summary + message | `meta-review run` | latest state snapshot overwritten and rolling artifacts overwritten | P1 | required-now | automated test |
| T6 | Run fallback on adapter failure | adapter throws | `meta-review run` | snapshot persisted with `error/inconclusive` and warning reason | P1 | required-now | automated test |
| T7 | Rework message requirement | recommendation=`rework` with missing/empty `rework_target_message` | run persistence validation | command fails with `META_REVIEW_REWORK_MESSAGE_INVALID` and does not write new canonical snapshot | P1 | required-now | automated test |
| T8 | Single-slot overwrite semantics | two consecutive successful runs | read state/artifacts | only latest run values visible via state and last artifacts | P1 | required-now | automated test |
| T9 | Status is read-only | existing snapshot | call `meta-review status` | output reflects snapshot; state fingerprint unchanged | P1 | required-now | automated test |
| T10 | Last-report is read-only | existing snapshot/report artifact | call `meta-review last-report` | returns cached reference/summary; no live run executed | P1 | required-now | automated test |
| T11 | CLI nested command routing | CLI args `bubble meta-review ...` | run through CLI index | command dispatches to meta-review handler | P1 | required-now | automated test |
| T12 | Status command output modes | valid snapshot | `status` text + `--json` | compact text default and stable JSON shape with same semantic fields | P2 | required-now | automated test |
| T13 | Last-report empty snapshot path | no prior run | `last-report` | returns empty/no-report response with zero mutation | P1 | required-now | automated test |
| T14 | Run depth option parse | `--depth standard|deep` | parse run options | accepted values only; invalid depth rejected | P2 | required-now | automated test |
| T15 | Existing bubble commands unaffected | baseline bubble command set | execute existing help/parse paths | no regression in current command handlers | P1 | required-now | automated test |
| T16 | Legacy bubble read compatibility | persisted state without `meta_review` subtree | call `status` and `last-report` | deterministic empty response shape with no mutation/crash | P1 | required-now | automated test |
| T17 | Missing report artifact with snapshot present | snapshot has `last_autonomous_report_ref` but artifact absent | call `last-report` | success result with `has_report=false` (or equivalent empty contract), no rerun | P1 | required-now | automated test |
| T18 | Run path lifecycle immutability | bubble in any non-terminal lifecycle state | call `meta-review run` | lifecycle state remains unchanged; only `meta_review` snapshot/artifacts mutate | P1 | required-now | automated test |
| T19 | Schema compatibility for absent subtree | persisted snapshot without `meta_review` object | schema validate | validation success (backward compatibility preserved) | P1 | required-now | automated test |
| T20 | Schema rejects invalid enum co-occurrence | snapshot has invalid status/recommendation pair | schema validate | validation fails with targeted field paths | P1 | required-now | automated test |
| T21 | CAS conflict on run persistence | competing write causes CAS mismatch | `meta-review run` | command returns conflict error, previous canonical snapshot unchanged, no artifact overwrite on failed write | P2 | required-now | automated test |
| T22 | Rolling artifact write warning path | state write succeeds but writing `meta-review-last.json`/`.md` fails | `meta-review run` | command returns success with warning metadata/reason `META_REVIEW_ARTIFACT_WRITE_WARNING`; canonical state snapshot remains updated | P2 | required-now | automated test |

### 7) Execution Order Contract (Run Path)

`runMetaReview` must execute the following sequence in order:
1. Resolve bubble and paths (`resolveBubbleById`, `getBubblePaths`).
2. Read current state snapshot as CAS base and for no-mutation guard checks.
3. Execute live review adapter.
4. If Step 3 fails, normalize fallback output to `status=error`, `recommendation=inconclusive`, and include failure summary/diagnostics.
5. Validate snapshot payload invariants and enum co-occurrence rules (including `rework_target_message` requirement).
6. Persist canonical `meta_review` snapshot through lock+CAS state write.
7. Best-effort overwrite rolling artifacts (`meta-review-last.json`, `meta-review-last.md`).
8. Return structured command result (including warnings if artifact write failed).

Ordering constraint:
1. Step 6 must complete before any observable success result is returned.
2. Step 7 failure must not roll back Step 6; canonical source remains state snapshot.
3. If Step 6 fails with CAS conflict, Step 7 must be skipped.
4. Adapter-failure fallback branch must still follow Steps 5-8.
5. Phase 1 includes no lifecycle mutation step after persistence.

## Acceptance Criteria (Binary)

1. AC1: Bubble state model includes canonical `meta_review` last-autonomous snapshot fields and validates them strictly.
2. AC2: `pairflow bubble meta-review run --id <id>` exists and persists latest autonomous snapshot in single-slot overwrite mode.
3. AC3: `pairflow bubble meta-review status --id <id>` returns cached snapshot without live review execution.
4. AC4: `pairflow bubble meta-review last-report --id <id>` returns cached report reference/summary without live review execution.
5. AC5: `status` and `last-report` are read-only by contract (no lifecycle/state mutation).
6. AC6: Phase 1 run path does not auto-dispatch rework and does not mutate bubble lifecycle state.
7. AC7: `auto_rework_limit` default is 5 in initial state contract.
8. AC8: Two consecutive runs expose only the latest snapshot/report as canonical output.
9. AC9: Legacy bubbles without `meta_review` remain readable through normalized empty snapshot behavior.
10. AC10: State schema enforces valid status/recommendation co-occurrence rules.
11. AC11: CLI command tree includes `pairflow bubble meta-review <run|status|last-report>` routing without regression to existing bubble commands.

## AC-Test Traceability

| AC | Covered by Tests |
|---|---|
| AC1 | T1,T2,T3,T19,T20 |
| AC2 | T4,T5,T7,T8,T21,T22 |
| AC3 | T9,T12,T16 |
| AC4 | T10,T13,T16,T17 |
| AC5 | T9,T10,T13,T16,T17 |
| AC6 | T5,T6,T18 |
| AC7 | T1 |
| AC8 | T8 |
| AC9 | T16,T19 |
| AC10 | T20 |
| AC11 | T11,T14,T15 |

## L2 - Implementation Notes (Optional)

1. [later-hardening] Extract a dedicated `src/core/meta-review/` module tree if Phase 2/3 expands logic beyond manageable size.
2. [later-hardening] Add explicit command-level telemetry (`meta_review_runs_total`, latency histogram) once metrics contract is finalized.
3. [later-hardening] Add snapshot provenance field linking runner adapter identity/version.

## Hardening Backlog

| ID | Item | Layer | Priority | Timing | Source | Proposed Action |
|---|---|---|---|---|---|---|
| H1 | Add historical archive mode (optional retention) behind feature flag | L2 | P3 | later-hardening | Phase 1 design tradeoff | Evaluate only if audit need emerges post-MVP |
| H2 | Add rich human-readable diff between previous and latest autonomous snapshot | L2 | P3 | later-hardening | Operator UX refinement | Consider in Phase 3 UI/pane polish |

## Review Control

1. Every finding must include: `priority`, `timing`, `layer`, `evidence`.
2. Max 2 L1 hardening rounds before implementation handoff.
3. New `required-now` after round 2 is allowed only with evidence-backed `P0/P1`.
4. Items outside Phase 1 contract are tagged `later-hardening` or deferred to Phase 2/3 task files.
5. Because `contract_boundary_override=yes`, `plan_ref` is mandatory and must remain non-null.

## Spec Lock

Mark this task `IMPLEMENTABLE` when all are true:
1. AC1-AC11 are satisfied with automated evidence.
2. `run|status|last-report` command contracts are stable and documented in CLI help output.
3. Read-only retrieval path is demonstrably non-generative and non-mutating.

## Resolution Record

1. Post-merge implementation keeps Phase 1 core contract intact: canonical snapshot persistence + read-only retrieval stayed stable.
2. Live-run execution path was later hardened to prefer dedicated pane-agent execution, but this does not change Phase 1 persistence/read-only boundary guarantees.
