---
artifact_type: task
artifact_id: task_smoke_runner_contract
task_family_id: smoke-runner-contract
sequence_key: "1"
task_id: 1-smoke-runner-contract
title: "Smoke Runner Contract"
status: approved
phase: phase1
system_context_ref: docs/architecture/almost-e2e-smoke-suite.md
target_files:
  - tests/helpers/almostE2eSmoke/
  - tests/helpers/almostE2eSmoke/runner.ts
  - tests/helpers/almostE2eSmoke/fakeExternalAdapters.ts
  - tests/helpers/almostE2eSmoke/scenario.ts
  - tests/helpers/almostE2eSmoke/fixtureRepo.ts
  - tests/helpers/almostE2eSmoke/index.ts
  - tests/helpers/almostE2eSmoke/runner.test.ts
  - tests/helpers/almostE2eSmoke/fakeExternalAdapters.test.ts
  - tests/helpers/almostE2eSmoke/fixtureRepo.test.ts
prd_ref: null
plan_ref: plans/almost-e2e-smoke-suite-plan-v1.md
doc_bubble_id: 1-smoke-runner-contract-doc
impl_bubble_id: null
supersedes: []
superseded_by: null
archive_group: 2026-05-09-almost-e2e-smoke-suite-plan-v1
owners:
  - "testing/runtime"
---

# Task: Smoke Runner Contract

## L0 - Policy

### Goal

Create the reusable almost-end-to-end smoke harness foundation consumed by the
Phase 1 CLI lifecycle, actor-loop, and UI action API smoke tasks. The harness
must provide typed scenario definitions, fake external side-effect adapters, a
minimal fixture-repo builder, and a runner contract that can advance fake actor
scenarios through the canonical `pairflow agent emit --kind ...` surface.

### Domain / Control Model Summary

1. Business invariant: the Phase 1 smoke suite must catch public-entrypoint
   wiring regressions without requiring real LLMs, real tmux panes, real editor
   launches, or real browser sessions.
2. Control model: Pairflow production command dispatch, route/action dispatch,
   registry/state/transcript/inbox persistence, sequence allocation, and actor
   emit validation remain canonical. The smoke harness may replace only slow
   external side-effect adapters at existing port boundaries.
3. Read-path rule: runner authority for actor emits must be read or validated
   from the public status/read-model surface used by CLI/UI before every
   `advance(...)`.
4. Forbidden fallback: the fake actor must not write transcript, inbox, state,
   registry, or bubble lifecycle files directly. Tests must not bypass the
   public command/action path under test merely to inject dependencies.
5. Allowed resolution path: expose test-only helper modules that build fake
   ports, fixture repositories, scenario steps, and a runner API while
   preserving public entrypoint dispatch for downstream smoke tasks.
6. Missing-data rule: if current handoff/execution authority cannot be proven
   before an actor emit, the runner must fail the step instead of reusing stale
   captured IDs or inferring authority from transcript history.

### In Scope

1. Add a reusable TypeScript smoke helper module under
   `tests/helpers/almostE2eSmoke/`.
2. Define a typed scenario contract for fake actor steps covering at least:
   `pass`, `human_question`, `convergence`, and `meta_review_result`.
3. Provide fake external adapters/recorders for process spawning, editor/terminal
   side effects, tmux launch acknowledgement, and tmux termination.
4. Ensure fake launch acknowledgement captures the first launch authority and
   registers the scenario with the runner instead of merely returning success.
5. Provide a runner API that can `start(...)`, refresh/validate current
   authority, `advance(...)` by invoking the canonical actor emit surface, and
   expose recorded external side effects for assertions.
6. Provide minimal fixture-repo setup helpers suitable for downstream compiled
   CLI and UI action API smoke tasks.
7. Add focused tests for scenario typing/validation, fake adapter recordings,
   authority refresh before every non-initial `advance(...)`, stale-authority
   rejection, and fixture setup.
8. Document in helper names or comments which surfaces are real and which
   adapters are faked.

### Out of Scope

1. Adding the compiled CLI lifecycle smoke scenarios.
2. Adding actor-loop pass/convergence/meta-review happy-path scenarios.
3. Adding UI action API Open/Restart/Delete smoke scenarios.
4. Adding Layer 3 golden full-ish smoke, HTTP transport smoke, Playwright, real
   browser tests, or real tmux/editor execution.
5. Changing production lifecycle semantics, actor emit payload semantics, or
   Pairflow command routing to make the harness easier to implement.
6. Introducing a hidden wall-clock runtime dependency or real LLM process into
   the Phase 1 smoke harness.

## L1 - Change Contract

### Canonical Contract Matrix

| Contract Row | Canonical Rule | Producer / Storage | Runtime Behavior | Failure / Reason Code | Required Proof |
|---|---|---|---|---|---|
| Fake external adapters | Test helpers replace only process/editor/terminal/tmux side-effect ports that already exist in production wiring. | `tests/helpers/almostE2eSmoke/fakeExternalAdapters.ts` | Downstream smoke tests can assert attempted external commands without launching real external programs. | Adapter helper throws when a required fake is not installed or an unexpected side effect is requested. | Unit tests prove each fake records calls and does not spawn real processes. |
| Scenario registration | Fake tmux launch acknowledgement registers launch metadata and scenario state with the runner. | `tests/helpers/almostE2eSmoke/runner.ts` | `bubble start` can produce a controllable fake actor scenario rather than a stalled bubble. | Runner start fails if launch metadata is missing or incomplete. | Test proves start captures first authority and associates it with a scenario id/bubble id. |
| Actor emit surface | Fake actor feedback is emitted only through canonical `pairflow agent emit --kind ...` handling. | Runner `advance(...)` implementation. | State/transcript/inbox mutations remain production-owned. | `SMOKE_AUTHORITY_MISSING` or equivalent helper error when emit authority cannot be proven. | Tests spy on the invoked command/handler and assert no direct state/transcript writes occur. |
| Authority freshness | Before each `advance(...)`, the runner refreshes or validates current handoff/execution authority from public status/read-model data. | Runner authority resolver. | Each fake actor step targets the current active role/round rather than stale launch metadata. | `SMOKE_STALE_AUTHORITY` or equivalent helper error on mismatch. | Test mutates/rotates authority between advances and proves the runner uses the refreshed value. |
| Fixture repo | Fixture helper creates a minimal git repo with Pairflow-compatible config and isolated temp paths. | `tests/helpers/almostE2eSmoke/fixtureRepo.ts` | Downstream smoke tests can create/start/delete bubbles without touching the developer checkout. | Fixture setup throws with a diagnostic path when git/config/bootstrap fails. | Fixture tests prove repo init, commit baseline, cleanup, and config shape. |
| Public-entrypoint preservation | Helpers may be consumed by compiled CLI and UI route/action smoke tasks without forcing private application API shortcuts. | Helper README/comments and exported API shape. | Successor tasks inherit the fake/real boundary from this task. | Review/test failure if helper API requires direct state-file mutation for normal actor progression. | Tests and API shape show scenario advancement flows through actor emit and public status/read-model authority. |

### Ownership and Deferred Semantics

1. This task owns helper infrastructure and its contract tests only. It does not
   own the downstream smoke scenarios that consume the helpers.
2. The runner may provide an adapter for invoking the actor emit command or the
   same handler used by the public CLI, but the invoked surface must preserve
   public command validation and state/transcript ownership.
3. The fake adapters own side-effect recording only. They must not become a
   second lifecycle state machine.
4. Any fixture-local configuration added here must be test harness wiring only;
   production defaults remain owned by existing `src/v11/defaults/**` modules.
5. Successor tasks may extend the helper API only if they preserve the same
   canonical actor emit and authority-refresh rules.

### Structured Contract Rules

Scenario step parsing must be closed and schema-driven. Implementers must define
the scenario step contract as discriminated TypeScript types, not as ad hoc
objects passed through to command construction.

Common step rules:

1. Every step must have exactly one `kind` from:
   - `pass`
   - `human_question`
   - `convergence`
   - `meta_review_result`
2. Every step may include a stable optional `label` for assertion messages.
3. Unknown `kind` values, unknown top-level fields, duplicate logical fields
   after normalization, and malformed payload values must be rejected before any
   actor emit command is invoked.
4. Empty strings are invalid for required text fields after trimming.
5. `refs` must be an array of non-empty artifact/path refs when present. The
   runner passes refs through to the actor emit surface and does not interpret
   them as routing truth.
6. `expectedRole`, `expectedStateFingerprint`, or equivalent authority guards
   may be supplied only as validation inputs. They must never replace refreshed
   public status/read-model authority.
7. The runner must retain step input, resolved authority, invoked emit command
   or handler call, exit/result, and recorded side effects for assertion
   inspection. It must not retain or synthesize transcript/state mutations.

Per-kind payload rules:

| Step Kind | Required Fields | Optional Fields | Emit Mapping | Rejection Rules |
|---|---|---|---|---|
| `pass` | `summary` | `intent`, `findings`, `refs`, `noFindings` | `pairflow agent emit --kind pass` with current `handoff-id` and `execution-id` | Reject when both `findings` and `noFindings=true` are supplied; reject findings without severity/title; reject unsupported intent values. |
| `human_question` | `question` | `refs` | `pairflow agent emit --kind human_question` | Reject empty question text or finding-like fields. |
| `convergence` | `summary` | `findings`, `refs` | `pairflow agent emit --kind convergence` | Reject unsupported finding severities for convergence and reject `noFindings` because absence of findings is the clean signal. |
| `meta_review_result` | `round`, `recommendation`, `summary`, `reportJson` | `reworkTargetMessage`, `refs` | `pairflow agent emit --kind meta_review_result --round <n> --recommendation <approve\|rework\|inconclusive> --summary <text> --report-json <json>` plus optional `--rework-target-message` | Reject recommendations outside the production-supported set; reject non-positive or non-integer rounds; reject missing or non-object report JSON; reject `findings` because the production `MetaReviewResultActorEmitInput` carries parity/count data in `report_json`, not a findings array. |

Finding rules:

1. Findings must be structured objects with explicit severity and title.
2. Severity values must match the production actor emit surface for the target
   kind.
3. Finding refs, when present, must be preserved in emit invocation order.
4. The helper may expose builders for common clean/pass/finding cases, but the
   builders must produce the same closed step schema used by the raw parser.
5. Meta-review result steps must not reuse the `findings` schema. They must use
   `reportJson` as the helper-facing field and map it to production
   `report_json` / CLI `--report-json` exactly.

Authority error rules:

1. Missing public status/read-model authority before an emit must fail with a
   deterministic helper error such as `SMOKE_AUTHORITY_MISSING`.
2. A refreshed authority mismatch with the expected active role, handoff id,
   execution id, or state fingerprint must fail with a deterministic helper
   error such as `SMOKE_STALE_AUTHORITY`.
3. Unsupported or malformed scenario step payloads must fail before authority
   refresh side effects and before actor emit invocation.
4. The helper must expose enough error detail for tests to assert the failing
   step label/kind and missing or mismatched authority field without reading
   private Pairflow state files.

### Mirrored Surface Checklist

Keep these sections aligned when the runner contract changes:

1. L0 Domain / Control Model Summary.
2. L1 Canonical Contract Matrix.
3. L1 Ownership and Deferred Semantics.
4. L1 Structured Contract Rules.
5. L2 Branch Inventory.
6. Validation Strategy.

## L2 - Branch Inventory

### Branch A - Helper Module Shape

Add a small public test-helper surface under `tests/helpers/almostE2eSmoke/`
with an `index.ts` export. Keep the API narrow enough for successor tasks:

1. fixture repo creation/cleanup
2. fake external adapter creation and call inspection
3. scenario definition helpers
4. runner creation and `advance(...)`
5. status/authority resolver injection for tests

### Branch B - Fake External Adapter Recorders

Implement deterministic fake ports for external side effects:

1. process spawn recording for editor/terminal commands
2. tmux launch acknowledgement that captures launch metadata
3. tmux termination recording
4. optional assertions for unexpected command names or arguments

The fakes should return production-shaped values so downstream tests exercise
the same command orchestration paths.

### Branch C - Scenario And Authority Contract

Define scenario step types and a runner authority model that supports the
Phase 1 actor feedback kinds. The runner must fail closed when:

1. no active authority exists
2. the public status/read-model cannot prove the expected active role
3. the status authority mismatches the captured or expected authority
4. the scenario asks for an unsupported emit kind or payload shape

This branch must implement the `Structured Contract Rules` as a single source
of truth for validation and command construction. Do not duplicate slightly
different per-kind schemas across runner code and tests.

### Branch D - Fixture Repo Builder

Create a fixture builder that initializes a temporary git repo, writes minimal
Pairflow configuration required by smoke tests, commits a baseline, and returns
stable paths plus cleanup. Keep this helper independent from the developer
checkout except when a downstream compiled CLI smoke explicitly points at the
built Pairflow entrypoint.

### Branch E - Contract Tests

Add tests covering the helper contract, not downstream smoke behavior:

1. fake adapters record side effects without launching real programs
2. fake tmux launch registers a scenario with launch authority
3. runner refreshes authority before each `advance(...)`
4. stale/missing authority rejects the step
5. fixture repo setup creates an isolated git baseline

## Target Files

Primary files:

1. `tests/helpers/almostE2eSmoke/runner.ts`
2. `tests/helpers/almostE2eSmoke/fakeExternalAdapters.ts`
3. `tests/helpers/almostE2eSmoke/scenario.ts`
4. `tests/helpers/almostE2eSmoke/fixtureRepo.ts`
5. `tests/helpers/almostE2eSmoke/index.ts`

Expected tests:

1. `tests/helpers/almostE2eSmoke/runner.test.ts`
2. `tests/helpers/almostE2eSmoke/fakeExternalAdapters.test.ts`
3. `tests/helpers/almostE2eSmoke/fixtureRepo.test.ts`

Target files may be split differently if the implementation keeps the same
helper boundary and tests.

## Validation Strategy

1. Run focused helper tests for `tests/helpers/almostE2eSmoke/**`.
2. Run `pnpm typecheck`.
3. Run `pnpm lint`.
4. Run `pnpm fitness:check:ci`.
5. Run the relevant root Vitest suite for changed helper tests.
6. Run `pnpm test`.
7. Run `pnpm build` because the helper supports later compiled CLI smoke work
   and this task may affect test/runtime helper imports.

## Done Definition

1. `tests/helpers/almostE2eSmoke/` exports a typed runner/fake-adapter/fixture
   helper surface.
2. The runner can register fake launch metadata and advance a scenario through
   canonical actor emit invocation without direct state/transcript mutation.
3. Authority refresh or validation runs before every actor `advance(...)`.
4. Missing or stale authority fails with a deterministic helper error.
5. Focused tests cover the helper contract and fixture setup.
6. No downstream task is required to use private state-file writes or internal
   lifecycle shortcuts to consume the helper.
7. Validation evidence is recorded in the implementation bubble before close.
