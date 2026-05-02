---
artifact_type: task
artifact_id: task_bubbleconfig_decompose_v1
task_family_id: bubbleconfig-decompose
sequence_key: "1"
task_id: 1-bubbleconfig-decompose
title: "BubbleConfig Internal Decomposition"
status: completed
phase: phase1
target_files:
  - src/config/bubbleConfig.ts
  - src/config/bubbleConfig/parser.ts
  - src/config/bubbleConfig/render.ts
  - src/config/bubbleConfig/errors.ts
  - tests/config/bubbleConfig.test.ts
prd_ref: null
plan_ref: null
system_context_ref: docs/pairflow-initial-design.md
normative_refs:
  - docs/pairflow-initial-design.md
  - docs/architecture/v11-placement-and-extraction-governance.md
  - docs/modularity-review/2026-05-02-modularity-review.md
owners:
  - "felho"
doc_bubble_id: bconfig-decompose-doc
impl_bubble_id: bconfig-decompose-impl
supersedes: []
superseded_by: null
archive_group: 2026-05-02-bubbleconfig-decompose
---

# Task: BubbleConfig Internal Decomposition

## L0 - Policy

### Goal

Reduce the size and cognitive load of `src/config/bubbleConfig.ts` by splitting parser, render, and error-code concerns into capability-cohesive modules while preserving the existing public API and runtime behavior.

This is a structural refactor only. It must not change accepted `bubble.toml` syntax, generated TOML output, validation/defaulting behavior, compatibility shims, or downstream import contracts.

### Domain / Control Model Summary

1. Business invariant: existing bubble config semantics remain unchanged for all create/start/list/kickoff/review-policy/remote-execution consumers.
2. Control model: `BubbleConfig` meaning remains owned by `src/types/bubble.ts` plus `src/config/bubbleConfig.ts`'s exported parse/validate/render API.
3. Read-path rule: existing consumers continue to import from `src/config/bubbleConfig.js`; new internal modules are implementation detail.
4. Forbidden fallback: do not introduce alternate config readers, TOML libraries, JSON fallbacks, or consumer-local parsing to compensate for the split.
5. Allowed resolution path: deterministic re-export through `src/config/bubbleConfig.ts` is allowed so importers do not move in this task.
6. Missing-data rule: preserve current validation failures, default values, and thrown error messages unless a test proves the message was already incidental.
7. Phase boundary:
   - contract closure: preserve current public API; no new contract.
   - producer closure: N/A.
   - internal execution closure: parser/render/error module extraction only.
   - workflow/orchestration closure: N/A.
   - read-model closure: N/A.
   - activation closure: N/A.
   - cleanup/recovery closure: N/A.

### Plan Linkage

N/A.

### Canonical Contract Anchors

1. Source-of-truth anchors:
   - `src/config/bubbleConfig.ts`
   - `src/types/bubble.ts`
   - `src/config/defaults.ts`
   - `tests/config/bubbleConfig.test.ts`
   - `docs/pairflow-initial-design.md`
2. Canonical elements: exported names and behavior of `parseToml`, `parseBubbleConfigToml`, `validateBubbleConfig`, `assertValidBubbleConfig`, `validateBubbleConfigRemoteReferences`, `assertValidBubbleConfigRemoteReferences`, `parseWatchdogTimeoutMinutes`, `renderBubbleConfigToml`, `assertCreateReviewArtifactType`, `assertPairflowCommandProfile`, `TOML_PARSER_LIMITATIONS`, and exported reason-code constants.
3. Guard elements: parser limitations, validation errors, remote-reference validation, and duplicate/unknown TOML failure behavior.
4. Compat-only elements: existing legacy normalization and parse-warning preservation inside validation must remain semantically unchanged but need not be fully extracted in this first slice.
5. Forbidden reinterpretations: do not broaden TOML support, narrow TOML support, rename fields, move source-of-truth to UI or command-specific code, or replace compatibility defaults.
6. Placement interpretation: `docs/architecture/v11-placement-and-extraction-governance.md` is normative here only for boundary discipline and the "narrowest correct scope" rule. This task does not move code into `src/v11/**`, and must not use the v11 governance reference to justify promoting bubble-config internals into `src/v11/shared/**`.

### Scope Reality / Shape Proof

1. Inspected entrypoints / call-sites:
   - `src/config/bubbleConfig.ts`
   - `src/config/pairflowConfig.ts`
   - `src/config/repoConfig.ts`
   - `tests/config/bubbleConfig.test.ts`
   - representative importers found through `parseBubbleConfigToml` / `renderBubbleConfigToml` references.
2. Actual touched scope: internal refactor / contract-preserving decomposition.
3. Mutation entrypoints in scope: N/A; this task must not change runtime write ordering or mutation behavior.
4. Hidden scope ruled out: UI contract drift, TOML library migration, config schema redesign, and `pairflowConfig.ts` parser deduplication are explicitly out of scope.
5. Branch inventory note: preserve parse success/failure, validation success/failure, render round-trip, remote reference success/failure, and legacy compatibility branches.
6. Why the declared task shape matches reality: the first slice moves cohesive functions without changing exported entrypoints or data contracts.

### Authority Boundary Map

1. Authority producer: existing `parseBubbleConfigToml` / `validateBubbleConfig` / `renderBubbleConfigToml` API.
2. Stored authority: `bubble.toml` files under `.pairflow/bubbles/<id>/bubble.toml`.
3. In-scope consumers: only the module internals and existing tests that assert parse/render behavior.
4. Explicit out-of-scope consumers: CLI/application/import call-sites, UI contracts, remote executor semantics, repo/global config parser behavior.
5. Export surfaces closed in this phase: yes, current `src/config/bubbleConfig.ts` exports must remain compatible.

### Baseline Preservation

1. Must-preserve behaviors:
   - TOML parser limitations and parser error cases.
   - parse-to-validate-to-remote-reference flow in `parseBubbleConfigToml`.
   - deterministic `renderBubbleConfigToml` output for existing fields.
   - defaulting and compatibility behavior inside `validateBubbleConfig`.
   - all currently exported reason-code constants.
2. Allowed resolution paths: `bubbleConfig.ts` may become a facade that imports and re-exports extracted internals.
3. Forbidden regression interpretations: reviewers must not treat this task as authorization to change config shape or introduce a TOML dependency.
4. Replacement proof required if removed: any moved function must have equivalent test coverage through the existing public import path.

### Success / Completion Proof Boundary

N/A.

### Precondition and Side-Effect Boundary

N/A.

### In Scope

1. Create `src/config/bubbleConfig/parser.ts` and move TOML parser functions plus `TOML_PARSER_LIMITATIONS`.
2. Create `src/config/bubbleConfig/render.ts` and move TOML rendering helpers plus `renderBubbleConfigToml`.
3. Create `src/config/bubbleConfig/errors.ts` if it reduces coupling for exported reason-code constants.
4. Keep `src/config/bubbleConfig.ts` as the public facade and validation owner for this slice.
5. Update only imports needed by the extraction.
6. Add or adjust narrow tests only if extraction exposes an untested public behavior.

### Out of Scope

1. Replacing the hand-rolled TOML parser with a dependency.
2. Deduplicating parser logic with `src/config/pairflowConfig.ts`.
3. Splitting the full `validateBubbleConfig()` body into per-section validators.
4. Changing `BubbleConfig` type definitions or defaults.
5. Moving downstream importers away from `src/config/bubbleConfig.js`.
6. Changing generated `bubble.toml` formatting.

### Safety Defaults

1. Prefer facade re-exports over import churn at consumer call-sites.
2. Preserve exact public export names.
3. Preserve existing test fixtures and expected output unless a difference is proven to be dead formatting outside the contract.
4. If extraction reveals a behavior ambiguity, stop and document it instead of normalizing behavior inside this task.

### Contract Boundary / Blast Radius

1. `contract_boundary_override`: `no`
2. No runtime config/env contract change is allowed. This task only changes module layout behind the existing contract.

### Complexity Risk Gate

1. `authority_risk`: `1`
2. `surface_spread`: `1`
3. `identity_join_risk`: `0`
4. `activation_coupling`: `0`
5. `prerequisite_risk`: `0`
6. `acceptance_multiplicity`: `1`
7. `risk_score`: `3`
8. `single-task allowed`: `yes`
9. If `no`, required split: N/A.
10. Identity/join note:
    - canonical identity path: N/A.
    - competing identifiers or fallback identities: N/A.
11. Authority/source-of-truth note:
    - canonical source: existing `bubbleConfig.ts` public API and `BubbleConfig` type.
    - forbidden secondary sources: consumer-local parsing/rendering.
12. Closure-budget triage:
    - closure buckets touched: internal module decomposition, public export preservation.
    - intentionally collapsed closures: parser/render/error extraction may be done together because each is API-preserving and independently testable through the same facade.
    - explicitly deferred closures: validation submodule split, TOML dependency migration, parser deduplication with global/repo config.
13. Bounded-task-shape decision:
    - primary shape: `contract_or_persisted_authority_foundation`.
    - secondary shape: N/A.
    - why this bounded mix is safe: no accepted inputs, outputs, defaults, or exported entrypoint names change.
14. Contract-dense decision:
    - gate triggered: no.
    - trigger reasons: N/A.
    - canonical matrix source: N/A.
    - mirrored surfaces: N/A.
15. Document-bubble status note:
    - current doc bubble: `bconfig-decompose-doc`.
    - lifecycle boundary: this document-refinement pass must not set `status=implementable`; that status is owned by the document-bubble close path.

## L1 - Change Contract

### 0) Domain / Control Contract

| Item | Rule | Implementation Consequence | Priority | Timing |
|---|---|---|---|---|
| Business invariant | Bubble config behavior remains unchanged. | Treat all changes as moves unless explicitly required for build correctness. | P1 | required-now |
| Control model | `src/config/bubbleConfig.ts` remains the public owner. | Keep facade exports stable; do not redirect consumers to internal files. | P1 | required-now |
| Read-path rule | Consumers keep importing from `src/config/bubbleConfig.js`. | Avoid broad import churn. | P1 | required-now |
| Forbidden fallback | No new parser dependency or alternate config parse path. | Defer TOML library migration to a separate task. | P1 | required-now |
| Allowed resolution path | Facade can import from `./bubbleConfig/parser.js`, `render.js`, and `errors.js`. | Internal files may be used only by the facade unless tests need focused imports. | P2 | required-now |
| Missing-data rule | Preserve existing error/default behavior. | Existing tests should pass without expectation rewrites. | P1 | required-now |
| Phase boundary | This task owns parser/render/error extraction only. | Do not split validation subdomains in this slice. | P1 | required-now |

### 0a) Canonical Contract Preservation

| Element | Source Anchor | Required Interpretation | This Task Action | Priority | Timing |
|---|---|---|---|---|---|
| Public config API | `src/config/bubbleConfig.ts` exports | Exported names and runtime behavior stay stable, including `assertCreateReviewArtifactType` and `assertPairflowCommandProfile`. | preserve | P1 | required-now |
| TOML parser limitations | `TOML_PARSER_LIMITATIONS`, parser tests | Existing limited TOML support is the contract for this slice. | preserve | P1 | required-now |
| Rendered TOML shape | `renderBubbleConfigToml`, round-trip tests | Deterministic output remains equivalent. | preserve | P1 | required-now |
| Validation/defaulting | `validateBubbleConfig`, defaults tests | Validation stays in facade/source file for now. | preserve | P1 | required-now |
| Compat shims | legacy agents/meta-review/parse-warning tests | Compatibility behavior is retained, not redesigned. | preserve | P1 | required-now |
| Placement governance | `docs/architecture/v11-placement-and-extraction-governance.md` | Apply narrow-scope/shared-promotion discipline only; this is not a v11 migration and must not justify moving bubble-config internals into `src/v11/shared/**`. | preserve | P1 | required-now |

### 0b) Scope Reality and Shape Proof

| Item | Rule | Implementation / Review Consequence | Priority | Timing |
|---|---|---|---|---|
| Inspected entrypoints / call-sites | Existing public import path is widely used. | Keep import path stable. | P1 | required-now |
| Actual touched scope | Internal decomposition only. | Review diffs for behavior changes, not feature completeness. | P1 | required-now |
| Mutation entrypoints in scope | N/A. | No side-effect ordering changes allowed. | P1 | required-now |
| Hidden scope ruled out | TOML library migration and validation split are deferred. | Reject changes that combine these with the extraction. | P1 | required-now |
| Branch inventory note | Existing parse/render/validate branches must keep coverage. | Run `tests/config/bubbleConfig.test.ts` at minimum. | P1 | required-now |
| Shape proof | Facade exports remain stable and tests exercise public behavior. | Build/test evidence proves equivalence. | P1 | required-now |

### 0d) Shared Contract Compatibility

| Shared Contract | Current Consumers | Change Type (`additive|breaking|N/A`) | This Task Action | Deferred Alignment |
|---|---|---|---|---|
| `src/config/bubbleConfig.ts` public exports | CLI, v11 application/shared/infrastructure, tests, package `src/index.ts` | N/A | preserve export surface | validation split and parser replacement deferred |
| `bubble.toml` parse/render behavior | create/start/list/status/delete/kickoff/review-policy/remote execution | N/A | preserve behavior | TOML dependency migration deferred |

### 0e) Baseline Preservation

| Current Behavior | Preserve/Replace/Forbid | Required Proof | Priority | Timing |
|---|---|---|---|---|
| `parseToml` limited TOML support | preserve | parser tests pass | P1 | required-now |
| `parseBubbleConfigToml` validation flow | preserve | config tests pass | P1 | required-now |
| `renderBubbleConfigToml` deterministic output | preserve | round-trip/render tests pass | P1 | required-now |
| exported reason-code constants | preserve | typecheck/build pass through existing imports | P1 | required-now |

### 1) File Movement Contract

| ID | File | Required Change | Forbidden Change | Evidence |
|---|---|---|---|---|
| FM1 | `src/config/bubbleConfig/parser.ts` | Own TOML parser helpers and `parseToml`. | Changing accepted syntax or error semantics. | T1, T2, T3 |
| FM2 | `src/config/bubbleConfig/render.ts` | Own render helpers and `renderBubbleConfigToml`. | Changing generated TOML formatting intentionally. | T4, T5 |
| FM3 | `src/config/bubbleConfig/errors.ts` | Optionally own exported constants and simple assertion helpers if helpful. | Moving validation/defaulting policy into an unclear mixed module. | T6 |
| FM4 | `src/config/bubbleConfig.ts` | Remain public facade plus validation/defaulting owner. | Becoming a barrel that hides changed behavior or moving consumers to internals. | T6, T7 |

### 2) Dependency Constraints

| Type | Items | Priority | Timing |
|---|---|---|---|
| must-use | existing TypeScript module style and `.js` import specifiers | P1 | required-now |
| must-use | existing `tests/config/bubbleConfig.test.ts` coverage | P1 | required-now |
| must-preserve | public export path `src/config/bubbleConfig.js` | P1 | required-now |
| must-not-use | new TOML parsing dependency | P1 | required-now |
| must-not-use | consumer-local parsing/rendering fallbacks | P1 | required-now |
| must-not-change | `BubbleConfig` type contract | P1 | required-now |

### 3) Test Matrix

| ID | Scenario | Given | When | Then | Priority | Timing |
|---|---|---|---|---|---|---|
| T1 | TOML parser supported values | existing parser fixtures | `parseToml` runs through facade import | output matches previous behavior | P1 | required-now |
| T2 | TOML parser rejected values | unsupported multiline/dotted/duplicate cases | `parseToml` runs | same failure class/message pattern remains | P1 | required-now |
| T3 | Bubble config parse/default | representative `bubble.toml` fixtures | `parseBubbleConfigToml` runs | defaults and normalized fields match existing expectations | P1 | required-now |
| T4 | Render round-trip | valid `BubbleConfig` objects | `renderBubbleConfigToml` then parse | reparsed config matches existing tests | P1 | required-now |
| T5 | Optional sections | review policy, executor, validation target, ideation, local overlay | render and parse | optional sections remain stable | P1 | required-now |
| T6 | Export compatibility | existing imports from `src/config/bubbleConfig.js` | typecheck/build | no import path changes required | P1 | required-now |
| T7 | Broader affected consumers | config-dependent runtime tests | targeted affected tests run | no behavior regression | P2 | required-now |

## L2 - Implementation Notes

### Recommended Order

1. Extract parser constants/helpers into `src/config/bubbleConfig/parser.ts`.
2. Re-export `TOML_PARSER_LIMITATIONS` and `parseToml` from `src/config/bubbleConfig.ts`.
3. Run `pnpm exec vitest run tests/config/bubbleConfig.test.ts`.
4. Extract render helpers into `src/config/bubbleConfig/render.ts`.
5. Re-export `renderBubbleConfigToml` from `src/config/bubbleConfig.ts`.
6. Run `pnpm exec vitest run tests/config/bubbleConfig.test.ts`.
7. Optionally extract reason-code constants/assertion helpers into `errors.ts` only if the resulting dependency direction stays simple.
8. Run final verification.

### Verification

Minimum verification for this task:

1. `pnpm exec vitest run tests/config/bubbleConfig.test.ts`
2. `pnpm typecheck`
3. `pnpm lint`
4. `pnpm fitness:check:ci`
5. `pnpm test`
6. `pnpm build`

If only the task document is changed, no code verification is required beyond checking the file content. If implementation source changes are made later, use the verification list above.

### Document-Bubble Lock

1. `doc_bubble_id` is linked to `bconfig-decompose-doc` for this document-refinement pass.
2. The refined task has no required-now blocker or split trigger identified by this document-bubble pass; reviewer approval remains the doc-bubble decision.
3. The durable task metadata transition to `status=implementable` is intentionally left to the document-bubble close workflow after approval/merge.
4. No product/runtime/source implementation is authorized in this document bubble.

### Review Checklist

1. `src/config/bubbleConfig.ts` still exposes the same public names.
2. No downstream importer was moved to internal parser/render files.
3. No TOML dependency was added.
4. `validateBubbleConfig()` behavior was not redesigned.
5. Existing parser/render tests pass without broad expectation rewrites.
6. Any skipped verification is explicitly justified in the close summary.
7. Reviewer confirms whether this task document is ready for document-bubble approval.
