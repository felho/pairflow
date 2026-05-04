---
artifact_type: task
artifact_id: task_contract_drift_tests_v1
task_family_id: contract-drift-tests
sequence_key: "4"
task_id: 4-contract-drift-tests
title: "Contract Drift Tests"
status: in_progress
phase: phase4
target_files:
  - tools/fitness/checks/ui-contract-boundary.ts
  - tools/fitness/policy.json
  - tests/tools/fitness/uiContractBoundary.test.ts
  - tests/contracts/uiContractTransitSource.test.ts
  - tests/contracts/uiContractEntrypointResolution.test.ts
  - tests/contracts/uiContractParity.types.ts
  - tests/core/ui/router.test.ts
  - tests/core/ui/events.test.ts
prd_ref: null
plan_ref: plans/ui-contract-boundary-hardening-plan-v1.md
system_context_ref: docs/pairflow-initial-design.md
normative_refs:
  - docs/pairflow-initial-design.md
  - docs/architecture/ui-contract-governance.md
  - plans/ui-contract-boundary-hardening-plan-v1.md
  - plans/archive/tasks/2026-05-04-ui-contract-boundary-hardening-plan-v1/1-ui-contract-guard-cleanup.md
  - plans/archive/tasks/2026-05-04-ui-contract-boundary-hardening-plan-v1/2a-contract-entrypoint.md
  - plans/archive/tasks/2026-05-04-ui-contract-boundary-hardening-plan-v1/2b-ui-import-migration.md
  - plans/archive/tasks/2026-05-04-ui-contract-boundary-hardening-plan-v1/3a-action-response-validation.md
  - plans/archive/tasks/2026-05-04-ui-contract-boundary-hardening-plan-v1/3b-read-event-validation.md
owners:
  - "felho"
doc_bubble_id: 4-contract-drift-tests-doc
impl_bubble_id: 4-contract-drift-tests-impl
supersedes: []
superseded_by: null
archive_group: 2026-05-04-ui-contract-boundary-hardening-plan-v1
---

# Task: Contract Drift Tests

## L0 - Policy

### Goal

Harden regression coverage so the completed UI contract boundary cannot drift
back to direct browser imports, stale policy exceptions, protocol-type leaks, or
silent validation bypasses at the representative action/read/event seams.

This task is a specification artifact only until approved and executed. It does
not authorize implementation inside this document creation pass.

### Domain / Control Model Summary

1. Business invariant: browser-visible UI contracts are consumed through one
   intentional UI contract entrypoint and selected wire-shape drift fails loudly.
2. Control model: `src/contracts/ui/**` remains the canonical browser-safe
   contract surface; `@pairflow/ui-contracts` is the UI-facing entrypoint;
   backend router/event validators remain guard code over canonical contracts.
3. Read-path rule: `ui/src/**` imports shared UI contracts through
   `@pairflow/ui-contracts`, not relative `src/contracts/ui/**`, `src/v11/**`,
   or `src/types/**` paths. Existing UI compatibility barrels under
   `ui/src/lib/contracts/**` are legacy transit surfaces to verify, not
   alternative entrypoints for new shared-contract consumption.
4. Forbidden fallback: do not reintroduce allowlist exceptions, UI-local DTO
   mirrors, comment-only "keep in sync" checks, or tests that only assert happy
   paths while malformed required fields still pass.
5. Allowed resolution path: fitness and contract tests may inspect source text,
   TypeScript config, Vite aliases, and representative router/event failure
   behavior. They must validate the established boundary, not redefine DTO
   ownership.
6. Missing-data rule: representative malformed required action/read/event fields
   must remain covered by fail-closed tests with stable reason codes.
7. Documentation-pass boundary: this document refinement is the primary artifact
   for the docs-only bubble. It must make the later code implementation
   mechanically checkable, but it must not substitute a standalone synthesis
   document for this source task file.
8. Phase boundary:
   - import-boundary closure: enforce final UI entrypoint usage and forbidden
     backend imports.
   - protocol-export closure: prove browser-visible `ProtocolMessageType` flows
     through canonical UI contracts.
   - validation-regression closure: preserve representative action, read, and
     event invalid-payload tests.
   - broad schema expansion, browser-side parser validation, and standalone
     package extraction remain out of scope.

### Plan Linkage

1. Parent plan gap closed: boundary regressions are still possible after the
   implementation tasks unless drift tests and fitness rules encode the final
   state.
2. Depends on archived task
   `plans/archive/tasks/2026-05-04-ui-contract-boundary-hardening-plan-v1/3b-read-event-validation.md`.
3. Task-list impact: creates planned task `4-contract-drift-tests`; it does not
   supersede another task.
4. Inherited exit expectation: final proof should cover forbidden direct UI
   imports, protocol export transit, stale exception absence, and representative
   runtime validation failures for action and read/event seams.

### Canonical Contract Anchors

1. Source-of-truth anchors:
   - `docs/architecture/ui-contract-governance.md`
   - `plans/ui-contract-boundary-hardening-plan-v1.md`
   - `src/contracts/ui/**`
   - `ui/src/lib/contracts/**`
   - `ui/src/lib/types.ts`
   - `tools/fitness/checks/ui-contract-boundary.ts`
   - `tools/fitness/policy.json`
   - `tests/tools/fitness/uiContractBoundary.test.ts`
   - `tests/contracts/uiContractTransitSource.test.ts`
   - `tests/contracts/uiContractEntrypointResolution.test.ts`
   - `tests/core/ui/router.test.ts`
   - `tests/core/ui/events.test.ts`
2. Canonical elements:
   - `@pairflow/ui-contracts` is the UI contract entrypoint.
   - `ProtocolMessageType` is browser-visible only through
     `src/contracts/ui/**` and UI convenience barrels that re-export canonical
     contracts.
   - `UI_ACTION_RESPONSE_INVALID`, `UI_READ_RESPONSE_INVALID`, and
     `UI_EVENT_PAYLOAD_INVALID` are representative fail-closed reason codes.
3. Guard elements:
   - fitness policy exceptions and import scanners enforce boundaries but do
     not own contract shape.
   - runtime validators prove selected payload conformance but do not become a
     second DTO hierarchy.
4. Compat-only elements:
   - UI local contract barrels under `ui/src/lib/contracts/**` are compatibility
     transit surfaces only: they may re-export from `@pairflow/ui-contracts`,
     but they must not redeclare DTOs and this task must not encourage other UI
     source to treat them as the shared-contract entrypoint.
   - Type-level parity tests may compare canonical and runtime types but must
     not make runtime internals browser import targets.
5. Forbidden reinterpretations:
   - do not reopen standalone package extraction in this task.
   - do not change canonical DTO fields to make tests easier.
   - do not treat tests under `tests/**` as browser source for the UI import
     restriction unless the existing fitness scope intentionally includes them.

### Scope Reality / Shape Proof

1. Inspected surfaces:
   - `tools/fitness/checks/ui-contract-boundary.ts`
   - `tests/tools/fitness/uiContractBoundary.test.ts`
   - `tests/contracts/uiContractTransitSource.test.ts`
   - `tests/contracts/uiContractEntrypointResolution.test.ts`
   - `src/contracts/ui/index.ts`
   - `src/contracts/ui/uiReadModel.ts`
   - `ui/src/lib/contracts/**`
   - `ui/src/lib/types.ts`
   - `tsconfig.json`
   - `vitest.config.ts`
   - `tests/core/ui/router.test.ts`
   - `tests/core/ui/events.test.ts`
2. Actual touched scope: tests and fitness guardrails only, plus policy updates
   if needed to remove or prevent stale exception state.
3. Hidden scope ruled out: DTO field redesign, router validation rewrites,
   browser API parser validation, package extraction, and broad all-DTO schema
   coverage.
4. Branch inventory note: direct UI relative contract import, direct UI backend
   internal import, protocol type leak, stale exception reintroduction,
   malformed selected action response, malformed selected read response, and
   malformed selected event payload must be represented.

### Baseline Preservation

1. Must preserve:
   - existing passing `ui_contract_boundary` and `ui_router_port_boundary`
     fitness checks;
   - current `@pairflow/ui-contracts` root and UI resolver proof;
   - current valid action/read/event success-response behavior;
   - existing representative invalid-payload reason codes and response family
     details.
2. Allowed resolution paths:
   - expand source-scanning tests or fixture cases for the existing fitness
     checker;
   - add contract-transit assertions that forbid direct browser imports from
     `src/types/protocol.js`;
   - assert the live `tools/fitness/policy.json` check has an empty
     `ui_contract_boundary` exception list and that the report details include
     `exceptions_configured=0` and `exceptions_applied=0`;
   - add or tighten representative failure-path tests only where current
     runtime validators already own the boundary.
3. Forbidden regression interpretations:
   - do not loosen import scanner scope to make existing code pass;
   - do not add a policy exception for current intended imports;
   - do not replace runtime validation tests with type-only assertions.

## L1 - Change Contract

### Canonical Contract Matrix

| Contract Surface | Required Rule | Drift Signal | Required Proof |
|---|---|---|---|
| UI contract entrypoint | `ui/src/**` shared contract imports use `@pairflow/ui-contracts`. | Relative import to `src/contracts/ui/**` or direct `src/v11/**`/`src/types/**`. | Fitness fixture/test fails on forbidden import and passes on entrypoint import. |
| Protocol export | Browser-visible `ProtocolMessageType` comes through canonical UI contracts. | UI source imports `src/types/protocol.js` or declares local protocol literals. | Contract transit/source test asserts canonical export and no UI-local declaration/import leak. |
| Policy exceptions | No stale `ui_contract_boundary` exception is needed for the final graph. | Reintroduced stale exception id `ui-contract-boundary-known-meta-review-drift-001`, non-empty live exception list, or configured exception not applied. | Fitness/policy test asserts the stale exception id is absent, live policy exceptions are empty, and the live report records zero configured/applied exceptions. |
| Action validation | Representative malformed delete/commit/merge response fails closed. | Malformed selected action result returns 2xx. | Router tests keep `UI_ACTION_RESPONSE_INVALID` coverage. |
| Read validation | Representative malformed list/detail/timeline response fails closed. | Malformed selected read response returns 2xx. | Router tests keep `UI_READ_RESPONSE_INVALID` and `responseFamily` coverage. |
| Event validation | Representative malformed connected/snapshot/replayable event payload fails closed or is dropped before trusted emission/storage. | Malformed selected event reaches trusted SSE/history path. | Router/events tests keep `UI_EVENT_PAYLOAD_INVALID` coverage. |

### Ownership and Deferred Semantics

1. This task owns regression tests and fitness guardrails for the final boundary.
2. This task may emit stronger test fixtures and policy assertions, but it does
   not reinterpret UI DTO fields or runtime lifecycle semantics.
3. Successor work, if any, owns standalone package extraction and broader
   browser-side parsing.
4. Tests must not infer that type parity with runtime internals makes those
   internals browser-safe import targets.

### Structured Contract Rules

1. Unknown or malformed required selected payload fields must keep failing with
   the existing stable reason code for that family.
2. Optional/null fields remain accepted only where already accepted by the
   canonical contracts and validators.
3. Live `ui_contract_boundary` policy exceptions are not allowed for the final
   graph in this task. The known stale exception must remain absent from live
   policy and from test fixtures that represent the final graph; the live check
   must report `exceptions_configured=0` and `exceptions_applied=0`. Unit
   fixtures may still verify generic exception mechanics with neutral ids such
   as `fixture-allow-import-neutral`, but those fixtures must not reuse the
   stale exception id and must not be cited as final-boundary acceptance proof.
4. Fitness fixtures must cover both violation and allowed-entrypoint cases.
5. Source scans for UI protocol leaks must inspect TypeScript AST declarations
   under `ui/src/**`, not only hand-picked compatibility files. The scan must
   cover import declarations, export declarations, local type/interface/enum
   declarations named `ProtocolMessageType`, and local protocol literal arrays
   or const objects that recreate protocol message names. Test files may remain
   outside this browser-source restriction unless the configured fitness scope
   intentionally includes them.
6. Compatibility-barrel proof means `ui/src/lib/contracts/**` remains a
   re-export-only transit layer over `@pairflow/ui-contracts`; it does not
   permit other UI source to bypass the `@pairflow/ui-contracts` entrypoint for
   shared contracts.

### Acceptance Criteria

1. `ui_contract_boundary` fitness fails for direct UI imports from
   `src/contracts/ui/**`, `src/v11/**`, or `src/types/**` and passes for
   `@pairflow/ui-contracts`.
2. Tests prove the stale `ui-contract-boundary-known-meta-review-drift-001`
   exception is absent and the live `ui_contract_boundary` policy has no
   configured exceptions. The live fitness report proof must include
   `exceptions_configured=0` and `exceptions_applied=0`.
3. Contract transit tests prove `ProtocolMessageType` is exported through
   canonical UI contracts and not declared or imported directly in UI source.
   The proof must include `src/contracts/ui/uiReadModel.ts`,
   `src/contracts/ui/index.ts`, `ui/src/lib/types.ts`, and UI compatibility
   barrels that re-export from `@pairflow/ui-contracts`; it must also fail on a
   local `ProtocolMessageType` declaration or local protocol literal mirror in
   non-test UI source.
4. Representative invalid action/read/event validation failure tests remain
   present and assert stable reason codes.
5. No DTO shape, router behavior, or UI component behavior changes are made
   except as required to keep existing guardrails compiling.
6. Existing fixture tests for generic exception application remain allowed only
   as mechanics coverage; the acceptance proof for the final graph must come
   from the live policy check with no configured exceptions.

## L2 - Implementation Notes

1. Start with the existing fitness checker and tests; prefer adding fixtures to
   broadening production scanner logic.
2. Search for the final forbidden import classes before editing. Cover both
   relative and bare specifier forms for the full banned surface:
   - `src/contracts/ui`
   - `src/types`
   - `src/v11`
   - representative relative UI forms such as `../../../src/contracts/ui`,
     `../../../src/types`, and `../../../src/v11`
3. When tightening protocol leak coverage, prefer the TypeScript parser or the
   existing source-reading helpers over broad substring checks that can be
   fooled by comments or unrelated prose.
4. Keep validation coverage representative; do not add broad schema tests for
   every DTO in this slice.
5. Suggested narrow checks:
   - `pnpm exec vitest run tests/tools/fitness/uiContractBoundary.test.ts`
   - `pnpm exec vitest run tests/contracts/uiContractTransitSource.test.ts tests/contracts/uiContractEntrypointResolution.test.ts`
   - `pnpm exec vitest run tests/core/ui/router.test.ts tests/core/ui/events.test.ts`
   - `pnpm fitness:check:ci`
   - `pnpm typecheck`
   - `pnpm lint`
