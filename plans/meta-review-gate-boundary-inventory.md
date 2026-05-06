# Meta-Review Gate Boundary Inventory

Status: temporary ideation inventory  
Scope: `src/v11/shared/metaReviewGate/**`  
Bubble: `meta-review-internal-boundary`  
Created: 2026-05-05
Last updated: 2026-05-06

## Current Progress Snapshot

The first boundary pass has established `shared/metaReviewGate/index.ts` as the
public import door for the meta-review submit side wherever it can be done
without creating dependency cycles.

Completed in the bubble:

- domain-owned policy slices extracted under `src/v11/domain/metaReviewGate/**`
  for threshold policy, findings split/parity metadata, approve-claim policy,
  reviewer snapshot policy, human-gate routing, snapshot state, auto-rework
  retry invariants, run-result parity, snapshot counters, findings projection,
  current-run approve validation rework, clean approval, approve-threshold
  backstop, threshold authority resolution language, and gate route/error
  language.
- `shared/metaReviewGate/internal/**` introduced for implementation details.
- `internal_module_boundary` fitness rule added and passing.
- external meta-review submit imports now route through `../metaReviewGate/index.js`
  for threshold authority, runtime parity snapshot/metadata helpers, and
  rework findings parity validation.
- current-run finalization now routes through
  `../metaReviewGate/metaReviewGateCurrentRunApi.js`, a narrow public API file
  that avoids importing the aggregate index.
- `domain/metaReviewGate/**` no longer imports back from
  `shared/metaReviewGate/**`; route/error language is owned in domain and
  re-exported by the shared public contract for compatibility.
- `metaReviewGateTypes.ts` has been narrowed to result/compatibility exports;
  runtime capability contracts now live in
  `metaReviewGateRuntimeCapabilities.ts`, and tmux runner types live in
  `metaReviewGateTmuxCapabilities.ts`.

Known aggregate-index exception:

- `finalizeCurrentRunMetaReviewGate` is intentionally not exported from
  `shared/metaReviewGate/index.ts`. Exporting it through the aggregate index was
  tested and rejected because
  `pnpm fitness:check:ci` detected an import cycle:
  `metaReviewCommandSubmitValidation.ts <-> metaReviewGate/index.ts <->
  metaReviewGateCurrentRunFinalization.ts`.

This leaves the aggregate `index.ts` as the public door for policy/read helpers
and `metaReviewGateCurrentRunApi.ts` as the narrower public door for the
current-run finalization entrypoint.

## Purpose

This inventory supports the first `internal/` module-boundary migration pilot.
It is not a task spec and not a refactor plan. It records the current
`shared/metaReviewGate` file surface, likely ownership, and the safest first
movement for each slice.

Use this with:

- `docs/architecture/v11-internal-module-boundaries.md`
- `docs/architecture/v11-placement-and-extraction-governance.md`

## Classification Key

- `public contract`: stable shared language or entrypoint that external modules
  may import.
- `domain candidate`: pure or mostly pure policy/decision logic; verify
  dependencies before moving.
- `application candidate`: orchestration, routing, state-transition
  coordination, or command flow.
- `infrastructure/port candidate`: technical adapter, artifact/state/tmux/file
  interaction, or capability that should sit behind a port.
- `internal first`: mixed or uncertain implementation detail; hide behind the
  owning module boundary before slicing further.

## Current External Import Surface

These files are imported directly from outside `src/v11/shared/metaReviewGate/**`.
They are the highest-priority surface because they determine what must be kept
public, wrapped by a higher-level API, or migrated with callers.

| File | External importer count | Current external importers | Initial read |
| --- | ---: | --- | --- |
| `metaReviewGateCommandContract.ts` | 11 | `defaults/metaReviewGate`, `shared/converged`, `shared/metrics`, `application/metaReviewGate`, `application/converged` | legitimate public contract candidate |
| `metaReviewGateTypes.ts` | 8 | `shared/approval`, `shared/bubbleInbox`, `defaults/metaReviewGate`, `shared/metaReview`, `application/metaReviewGate` | mixed: public route/result language plus runtime capability types |
| `metaReviewGateCommandApi.ts` | 6 | `shared/metaReview`, `application/converged`, `application/metaReviewGate`, `shared/converged` | public entrypoint candidate, but may be too broad |
| `metaReviewGateFindingsSplit.ts` | 3 | `shared/metaReview` submit/parity/runtime/canonicalization paths | likely domain/shared model helper; caller intent must be reviewed |
| `metaReviewGateThresholdAuthority.ts` | 2 | `shared/metaReview` submit preparation/validation | likely direct domain move if dependencies stay pure |
| `metaReviewGateApplyContext.ts` | 1 | `application/metaReviewGate/metaReviewGateApplyContext.ts` | compatibility/wiring seam; likely application/internal cleanup |
| `metaReviewGateCurrentRunFinalization.ts` | 1 | `shared/metaReview/metaReviewCommandSubmitRouting.ts` | orchestration; should not remain directly public long-term |
| `metaReviewGateCurrentRunTypes.ts` | 1 | `shared/metaReview/metaReviewCommandContract.ts` | mixed contract/dependency bag; split likely needed |
| `metaReviewGateFindingsClaimParsing.ts` | 1 | `shared/metaReview/metaReviewCommandSubmitParity.ts` | pure parsing/policy helper; domain candidate |
| `metaReviewGateFindingsMetadata.ts` | 1 | `shared/metaReview/metaReviewRuntimeParity.ts` | mixed artifact metadata/path handling; split likely needed |
| `metaReviewGateFindingsParityHelpers.ts` | 1 | `shared/metaReview/metaReviewCommandSubmitPersistence.ts` | mixed parity policy plus artifact read/hash behavior |
| `metaReviewGateFindingsParityInput.ts` | 1 | `shared/metaReview/metaReviewCommandSubmitPersistence.ts` | likely domain policy input builder |
| `metaReviewGateReviewerSnapshot.ts` | 1 | `shared/metaReview/metaReviewRuntimeParity.ts` | transcript read + snapshot derivation; split or internal first |

## Proposed Public Surface

First public surface, before deeper moves:

- `index.ts` (new): module-level entrypoint once the boundary pilot starts.
- `metaReviewGateCommandApi.ts`: command/application-facing entrypoints.
- `metaReviewGateCommandContract.ts`: stable command/result contracts.
- `metaReviewGateTypes.ts`: only if trimmed to stable shared language.

Potential split from `metaReviewGateTypes.ts`:

- Keep route/result/error DTOs public.
- Move runtime dependency/capability types closer to application/defaults or
  command-specific contracts if they are not shared language.

Avoid making these directly public unless transitional:

- `metaReviewGateThresholdAuthority.ts`
- `metaReviewGateCurrentRunFinalization.ts`
- `metaReviewGateFindingsMetadata.ts`
- `metaReviewGateReviewerSnapshot.ts`

## Slice Inventory

### Public Contract / Shared Language

| File | Lines | Responsibility | Suggested action |
| --- | ---: | --- | --- |
| `metaReviewGateCommandContract.ts` | 15 | Re-exports command input/result/dependency contract types. | Keep public, but verify it does not re-export internal-only dependency bags. |
| `metaReviewGateCommandApi.ts` | 21 | Public command API re-export surface, including error conversion. | Keep public entrypoint. Consider routing external consumers through `index.ts`. |
| `metaReviewGateCommandRuntime.ts` | 18 | Runtime API exports for apply/error helpers. | Likely public or public-adjacent; verify whether runtime naming leaks implementation. |
| `metaReviewGateTypes.ts` | 47 | Result type plus compatibility re-exports for route/error/runtime contract language. | Keep public while consumers migrate to narrower contract files. |
| `metaReviewGateRuntimeCapabilities.ts` | 172 | Notify, pane-binding, apply dependency, and runtime capability contracts. | Public contract split from the broad type file; later review whether defaults/application should own more of it. |
| `metaReviewGateTmuxCapabilities.ts` | 15 | Tmux runner result/options function type. | Public type because runtime capability contracts expose the runner shape; internal path now re-exports for compatibility only. |

### Domain Candidates

These are likely to move directly to `src/v11/domain/metaReviewGate/**` if their
dependencies remain pure and they do not perform I/O.

| File | Lines | Responsibility | External import? | Suggested action |
| --- | ---: | --- | --- | --- |
| `metaReviewGateThresholdAuthority.ts` | 159 | Threshold authority resolver wrapper around artifact/parity I/O and domain threshold helpers. | yes, 2 | Keep as transitional shared API; next split should move verified parity-to-authority result construction into domain, leaving I/O orchestration here. |
| `metaReviewGateFindingsClaimParsing.ts` | 91 | Structured findings claim parsing from report JSON. | yes, 1 | Domain candidate. |
| `metaReviewGateFindingsParityInput.ts` | 157 | Build/resolve rework findings parity input and reason codes. | yes, 1 | Domain candidate, likely after claim parsing. |
| `metaReviewGateFindingsSplit.ts` | 162 | Blocking/advisory split derivation from findings/report JSON. | yes, 3 | Domain candidate or shared model helper; resolve whether it is gate-specific. |
| `metaReviewGateApproveClaimSplit.ts` | 79 | Approve split triplet and approve reason codes. | no direct external | Domain candidate. |
| `metaReviewGateApproveClaimMetadata.ts` | 118 | Approve parity metadata and diagnostics. | no direct external | Domain candidate after split helpers. |
| `metaReviewGateApproveClaimSummaryMismatch.ts` | 44 | Structured approve-summary mismatch detection. | no direct external | Domain candidate. |
| `metaReviewGateApproveClaimValidation.ts` | 85 | Validate structured positive approve claim. | no direct external | Domain candidate, possibly grouped with approve claim policy. |
| `metaReviewGateApprovalParityState.ts` | 168 | Structured parity metadata snapshot and advisory contract invariant. | no direct external | Domain candidate. |
| `metaReviewGateApprovalParitySnapshot.ts` | 106 | Normalize approval advisory findings and required split metadata. | no direct external | Domain candidate. |
| `metaReviewGateApprovalReviewerConsistency.ts` | 137 | Approval path consistency against reviewer snapshot. | no direct external | Domain candidate if transcript read stays outside. |
| `metaReviewGateApprovalSummaryNormalization.ts` | 202 | Approval request summary consistency/normalization. | no direct external | Domain candidate with possible application naming. |
| `metaReviewGateRunResultParity.ts` | 35 | Merge run result with parity resolution. | no direct external | Domain candidate. |
| `metaReviewGateFindingsValidationPreflight.ts` | 103 | Preflight structured meta-review claim validation. | no direct external | Domain candidate. |
| `metaReviewGateFindingsValidationParity.ts` | 92 | Rework path positive-claim validation with parity. | no direct external | Domain candidate, verify convergence policy dependency. |
| `metaReviewGateFindingsValidation.ts` | 95 | Top-level positive-claim validation orchestration over policy helpers. | no direct external | Domain/application boundary candidate; inspect I/O through artifact read callback. |
| `gateRoutingTypes.ts` | 84 | Gate route union, threshold status metadata, and gate error language. | via shared re-export | Domain-owned shared language; keep public through `metaReviewGateTypes.ts` compatibility export. |
| `approveValidationRework.ts` | 24 | Classify approve-validation command failures and build auto-rework message. | no | Done: extracted from current-run finalization. |
| `cleanApprovalPolicy.ts` | 92 | Decide clean approval vs threshold-required/fallback route policy. | no | Done: extracted from current-run finalization. |
| `approveThresholdBackstopPolicy.ts` | 100 | Block invalid approve-with-open-findings human-gate routes against configured threshold. | no | Done: extracted from current-run finalization. |

### Application / Orchestration Candidates

These coordinate command flow, state transitions, transcript append, routing, or
runtime delivery. They should not be moved wholesale to `domain`.

| File | Lines | Responsibility | External import? | Suggested action |
| --- | ---: | --- | --- | --- |
| `metaReviewGateApply.ts` | 119 | Apply meta-review gate on convergence. | via command API | Public API backed by application implementation; likely application owner. |
| `metaReviewGateApplyContext.ts` | 224 | Resolve required execution capabilities for apply flow. | yes, 1 | Application/defaults boundary candidate; likely not shared public. |
| `metaReviewGateApplyRunRouting.ts` | 65 | Route kickoff/run-failed result during apply flow. | no direct external | Application internal. |
| `metaReviewGateApplyObservation.ts` | 130 | Reconcile observed gate result with persisted state. | no direct external | Application internal with state semantics. |
| `metaReviewGateApplyPersistence.ts` | 96 | Persist runtime delivery observation. | no direct external | Application/infrastructure boundary candidate. |
| `metaReviewGateApplyHelpers.ts` | 107 | Append kickoff envelope and persist run-failed route. | no direct external | Application internal; uses transcript/state helpers. |
| `metaReviewGateCurrentRunFinalization.ts` | 480 | Current-run route resolution, parity I/O, threshold authority reads, approve/rework/human routing. | yes, 1 | Application candidate; pure approve-validation, clean-approval, and approve-threshold backstop policies have been split out. |
| `metaReviewGateCurrentRunCleanRerun.ts` | 496 | Clean rerun routing, delivery, pane binding, observation persistence. | no direct external | Application/internal first; likely later split runtime delivery pieces. |
| `metaReviewGateCurrentRunRoutePersistence.ts` | 175 | Persist run-failed/dispatch/resolved human routes. | no direct external | Application/infrastructure boundary candidate. |
| `metaReviewGateAutoRework.ts` | 327 | Auto-rework state transition, transcript append, rollback handling. | no direct external | Application candidate with ports; do not domain-move wholesale. |
| `metaReviewGateHumanGatePersistence.ts` | 237 | Persist human gate route and append approval request. | no direct external | Application/infrastructure boundary candidate. |
| `metaReviewGateHumanGatePersistenceHelpers.ts` | 180 | Human gate recommendation, request append, rollback handling. | no direct external | Application internal; split pure recommendation from append/rollback later. |
| `approvalRequestEnvelope.ts` | 273 | Build/append human approval request envelope with route metadata. | no direct external | Application/internal first; possible presenter/DTO extraction later. |
| `metaReviewApproveValidationGate.ts` | 347 | Run sticky approve validation commands and map failures. | no direct external | Application candidate; validation runtime orchestration. |
| `metaReviewGateStateHelpers.ts` | 191 | State transitions, auto-rework count, clean-run count, route defaults. | no direct external | Mixed: pure route defaults may be domain; state mutation helpers application/internal. |
| `metaReviewGateStateStaging.ts` | 78 | Stage meta-review running state with execution context. | no direct external | Application internal. |
| `metaReviewGateSnapshotHelpers.ts` | 71 | Normalize meta-review snapshot and derive envelope metadata. | no direct external | Mixed; likely application/domain helper split. |
| `metaReviewGateShared.ts` | 67 | Shared reason codes, conflict/transition mapping, gate lock path. | no direct external | Mixed utility; keep internal first and split path/error pieces later. |
| `metaReviewGateErrorConversion.ts` | 36 | Convert meta-review errors to gate errors. | via command API | Public-adjacent error boundary; keep behind public API. |

### Infrastructure / Port Candidates

These are technical I/O or runtime seams. They may stay internal temporarily, but
the final owner should not be domain policy.

| File | Lines | Responsibility | External import? | Suggested action |
| --- | ---: | --- | --- | --- |
| `metaReviewGateFindingsMetadata.ts` | 184 | Artifact path/status/digest/open-total/parity metadata from report JSON. | yes, 1 | Split path/artifact concerns from pure metadata derivation. |
| `metaReviewGateFindingsArtifactReadRetry.ts` | 90 | Retry policy around findings artifact read. | no direct external | Infrastructure/port-adjacent or application internal. |
| `metaReviewGateReviewerSnapshot.ts` | 117 | Read/derive latest same-round reviewer snapshot from transcript. | yes, 1 | Split pure snapshot derivation from transcript read default. |
| `metaReviewGateTranscriptDefaults.ts` | 11 | Re-export transcript read default. | no direct external | Likely remove or move to defaults/application wiring; avoid shared camouflage. |

## Suggested First Pass

1. Add `src/v11/shared/metaReviewGate/index.ts` as the public module door.
2. Route obvious public imports through `index.ts` or stable contract files:
   `metaReviewGateCommandApi.ts`, `metaReviewGateCommandContract.ts`, trimmed
   `metaReviewGateTypes.ts`.
3. Move files with no external imports and unclear final placement under
   `shared/metaReviewGate/internal/**`.
4. For obvious policy files, consider direct move instead of an `internal/`
   detour:
   - `metaReviewGateThresholdAuthority.ts`
   - `metaReviewGateFindingsClaimParsing.ts`
   - `metaReviewGateFindingsParityInput.ts`
   - `metaReviewGateFindingsSplit.ts` if gate-specific ownership is confirmed
5. Do not move these wholesale to domain:
   - `metaReviewGateCurrentRunFinalization.ts`
   - `metaReviewGateCurrentRunCleanRerun.ts`
   - `metaReviewGateAutoRework.ts`
   - `approvalRequestEnvelope.ts`
   - `metaReviewApproveValidationGate.ts`
6. Treat `metaReviewGateTypes.ts` as an early split candidate. Its public route
   language is valid shared contract, but runtime capability/dependency types
   may belong closer to application/defaults.

## Open Questions

1. Should `shared/metaReview/**` be treated as inside the same broader
   meta-review bounded context, or as an external consumer for the `internal/`
   rule pilot?
2. Should `metaReviewGateFindingsSplit.ts` be gate-specific domain policy or a
   broader review/findings shared model helper?
3. Is `finalizeCurrentRunMetaReviewGate` a public API during migration, or
   should callers be moved immediately to a higher-level command API?
4. Should `metaReviewGateTypes.ts` be split before or after the first
   `internal/` move?
5. Should the first fitness rule hard-fail only `/internal/` import violations,
   while a separate report-only radar finds large unprotected module candidates?
