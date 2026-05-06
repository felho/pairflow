# Meta-Review Gate Boundary Inventory

Status: checkpointed ideation inventory  
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
- `metaReviewGateCurrentRunFinalization.ts` now lives under
  `shared/metaReviewGate/internal/**`; `metaReviewGateCurrentRunApi.ts` remains
  the public door.
- findings parity input path/topology resolution now lives under
  `shared/metaReviewGate/internal/**`; the aggregate index still exports the
  public helper.
- threshold authority resolution now lives under
  `shared/metaReviewGate/internal/**`; the aggregate index still exports the
  public threshold helpers and types.
- findings metadata/path resolution now lives under
  `shared/metaReviewGate/internal/**`; the aggregate index still exports the
  public parity metadata helper.
- findings parity artifact validation helpers now live under
  `shared/metaReviewGate/internal/**`; the aggregate index still exports the
  public validation helper.
- findings artifact read/hash/parse parity validation now lives in
  `internal/metaReviewGateFindingsArtifactParity.ts`; the former parity helper
  remains a compatibility re-export surface.
- reviewer snapshot transcript wrapper now lives under
  `shared/metaReviewGate/internal/**`; the aggregate index still exports the
  public read helper and snapshot type.
- approval request route metadata policy now lives in
  `domain/metaReviewGate/approvalRequestRouteMetadata.ts`; the envelope builder
  only applies the resolved metadata.
- auto-rework state construction/restoration now lives in
  `internal/metaReviewGateAutoReworkState.ts`; dispatch orchestration remains in
  `metaReviewGateAutoRework.ts`.
- auto-rework approval-decision envelope append now lives in
  `internal/metaReviewGateAutoReworkEnvelope.ts`.
- auto-rework shared input contracts now live in
  `internal/metaReviewGateAutoReworkContract.ts`, and state write/restore
  persistence now lives in `internal/metaReviewGateAutoReworkPersistence.ts`.
- approve-validation command policy resolution now lives in
  `internal/metaReviewApproveValidationPolicy.ts`; runner orchestration remains
  in `metaReviewApproveValidationGate.ts`.
- clean-rerun dispatch-failure rollback state now lives in
  `internal/metaReviewGateCleanRerunFailureState.ts`; clean-rerun orchestration
  remains in `metaReviewGateCurrentRunCleanRerun.ts`.
- clean-rerun delivery telemetry/runtime-delivery and pane deactivate helpers
  now live in `internal/metaReviewGateCleanRerunDelivery.ts`.
- clean-rerun route/capability types and delivery capability guard now live in
  `internal/metaReviewGateCleanRerunContract.ts`.
- clean-rerun dispatch failure routing, running-state staging, and kickoff
  append now live in `internal/metaReviewGateCleanRerunDispatch.ts`.
- clean-rerun runtime delivery observation persistence and observed-result
  reconciliation now live in `internal/metaReviewGateCleanRerunObservation.ts`.
- clean-rerun pane binding and pane-notification failure fallback now live in
  `internal/metaReviewGateCleanRerunPaneBinding.ts`.
- current-run structured positive-claim parity resolution now lives in
  `internal/metaReviewGateCurrentRunParity.ts`.
- current-run approve-threshold backstop and clean-approval threshold adapters
  now live in `internal/metaReviewGateCurrentRunThresholdPolicies.ts`.
- current-run approve result routing and sticky approve validation now live in
  `internal/metaReviewGateCurrentRunApproveRouting.ts`.
- approve-validation failure reason and runner-stage diagnostics now live in
  `internal/metaReviewApproveValidationDiagnostics.ts`.
- apply-flow dependency capability guards now live in
  `internal/metaReviewGateApplyCapabilities.ts`.
- `domain/metaReviewGate/**` no longer imports back from
  `shared/metaReviewGate/**`; route/error language is owned in domain and
  re-exported by the shared public contract for compatibility.
- human-gate routing policy is owned in `domain/metaReviewGate/humanGateRouting.ts`;
  shared internal persistence imports it directly instead of re-exporting it
  through state helpers.
- snapshot-state counters are owned in `domain/metaReviewGate/snapshotState.ts`;
  shared internal apply/auto-rework/clean-rerun code imports them directly.
- human-gate summaries and meta-review snapshot normalization are imported from
  domain owners directly; the former shared snapshot helper was removed after
  its remaining exports became unnecessary.
- human-gate persistence is imported from its implementation module directly
  inside the owning internal boundary; `metaReviewGateShared.ts` no longer
  re-exports it.
- human-gate persistence input contract and route-specific approval-request
  append adapter now live in `internal/metaReviewGateHumanGatePersistenceContract.ts`
  and `internal/metaReviewGateHumanGateRouteAppend.ts`.
- unused staged-ready reason codes and generic transition/conflict exports were
  removed from `metaReviewGateShared.ts`.
- `metaReviewGateTypes.ts` is now a compatibility aggregator only; route/error,
  result, runtime capability, and tmux runner contracts each have narrower
  public contract files.
- `metaReviewGateCurrentRunTypes.ts` owns the public artifact read function type
  directly; it no longer imports that type from an internal metadata helper.

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

This inventory records the checkpoint reached by the first `internal/`
module-boundary migration pilot. It is not a task spec and not a refactor plan.
It records the current `shared/metaReviewGate` file surface, current ownership,
and remaining follow-up decisions.

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
| `index.ts` | 24 | `defaults/metaReviewGate`, `shared/approval`, `shared/bubbleInbox`, `shared/converged`, `shared/metaReview`, `shared/metrics`, `application/converged`, `application/metaReviewGate` | primary public module door; most former deep imports now route here |
| `metaReviewGateCurrentRunApi.ts` | 1 | `shared/metaReview/metaReviewCommandSubmitRouting.ts` | narrow public door for current-run finalization; kept separate from aggregate index to avoid the known cycle |

Source imports no longer reach directly into the former deep policy files
(`metaReviewGateFindingsSplit.ts`, `metaReviewGateFindingsMetadata.ts`,
`metaReviewGateFindingsParityInput.ts`, `metaReviewGateReviewerSnapshot.ts`, or
`metaReviewGateThresholdAuthority.ts`). The remaining root-level public surface
is the aggregate `index.ts`, the narrow current-run API, and stable contract
files.

## Current Public Surface

Current source-facing public surface:

- `index.ts`: module-level entrypoint for the broad meta-review gate public
  contract/API surface.
- `metaReviewGateCommandApi.ts`: command/application-facing entrypoints.
- `metaReviewGateCommandContract.ts`: stable command/result contracts.
- `metaReviewGateCurrentRunApi.ts`: narrow current-run finalization entrypoint
  kept outside the aggregate index to avoid the known cycle.
- `metaReviewGateCurrentRunTypes.ts`: public current-run finalization input and
  artifact-read function contracts.
- `metaReviewGateRouteContract.ts`: route/error/threshold-status language.
- `metaReviewGateResultContract.ts`: gate result DTO.
- `metaReviewGateRuntimeCapabilities.ts`: runtime dependency/capability
  contracts.
- `metaReviewGateTypes.ts`: compatibility aggregator for older imports.

The former root-level policy/wrapper files for threshold authority, findings
metadata/parity, reviewer snapshot, and current-run finalization are now
internal implementation files. External source should use `index.ts` or
`metaReviewGateCurrentRunApi.ts`.

## Slice Inventory

### Public Contract / Shared Language

| File | Lines | Responsibility | Suggested action |
| --- | ---: | --- | --- |
| `metaReviewGateCommandContract.ts` | 15 | Re-exports command input/result/dependency contract types. | Keep public, but verify it does not re-export internal-only dependency bags. |
| `metaReviewGateCommandApi.ts` | 21 | Public command API re-export surface, including error conversion. | Keep public entrypoint. Consider routing external consumers through `index.ts`. |
| `metaReviewGateCommandRuntime.ts` | 18 | Runtime API exports for apply/error helpers. | Likely public or public-adjacent; verify whether runtime naming leaks implementation. |
| `metaReviewGateRouteContract.ts` | 11 | Route/error/threshold-status public language re-exported from domain. | Public contract; prefer this over `metaReviewGateTypes.ts` for new imports. |
| `metaReviewGateResultContract.ts` | 15 | Gate result DTO. | Public contract; prefer this over `metaReviewGateTypes.ts` for new imports. |
| `metaReviewGateTypes.ts` | 31 | Compatibility aggregator for route/result/runtime public language. | Keep temporarily for external compatibility; no source imports currently depend on it directly. |
| `metaReviewGateRuntimeCapabilities.ts` | 172 | Notify, pane-binding, apply dependency, and runtime capability contracts. | Public contract split from the broad type file; later review whether defaults/application should own more of it. |
| `metaReviewGateTmuxCapabilities.ts` | 15 | Tmux runner result/options function type. | Public type because runtime capability contracts expose the runner shape; internal path now re-exports for compatibility only. |

### Domain Candidates

These are likely to move directly to `src/v11/domain/metaReviewGate/**` if their
dependencies remain pure and they do not perform I/O.

| File | Lines | Responsibility | External import? | Suggested action |
| --- | ---: | --- | --- | --- |
| `internal/metaReviewGateThresholdAuthority.ts` | 131 | Threshold authority resolver wrapper around artifact/parity I/O and domain threshold helpers. | public via aggregate index only | Keep behind shared public API; verified parity-to-authority result construction now lives in domain. |
| `findingsClaimParsing.ts` | 91 | Structured findings claim parsing from report JSON. | imported directly from domain | Done: domain-owned. |
| `findingsParityInput.ts` + `internal/metaReviewGateFindingsParityInput.ts` | 114 + 71 | Domain resolves rework findings parity input candidate; shared internal wrapper adds artifact path resolution. | public via aggregate index only | Done split; keep path/topology resolution behind the shared public API. |
| `findingsSplit.ts` | 162 | Blocking/advisory split derivation from findings/report JSON. | imported directly from domain | Done: domain-owned. |
| `approveClaimSplit.ts` | 79 | Approve split triplet and approve reason codes. | no direct external | Done: domain-owned. |
| `approveClaimMetadata.ts` | 118 | Approve parity metadata and diagnostics. | no direct external | Done: domain-owned. |
| `approveClaimSummaryMismatch.ts` | 44 | Structured approve-summary mismatch detection. | no direct external | Done: domain-owned. |
| `approveClaimValidation.ts` | 84 | Validate structured positive approve claim. | no direct external | Done: domain-owned. |
| `approvalParityState.ts` | 168 | Structured parity metadata snapshot and advisory contract invariant. | no direct external | Done: domain-owned. |
| `approvalParitySnapshot.ts` | 106 | Normalize approval advisory findings and required split metadata. | no direct external | Done: domain-owned. |
| `approvalReviewerConsistency.ts` | 145 | Approval path consistency against reviewer snapshot. | no direct external | Done: domain-owned. Transcript read stays outside. |
| `approvalSummaryNormalization.ts` | 202 | Approval request summary consistency/normalization. | no direct external | Done: domain-owned. |
| `runResultParity.ts` | 38 | Merge run result with parity resolution. | no direct external | Done: domain-owned. |
| `findingsValidationPreflight.ts` | 103 | Preflight structured meta-review claim validation. | no direct external | Done: domain-owned. |
| `findingsValidationParity.ts` + `metaReviewGateFindingsValidationParity.ts` | 53 + 69 | Domain builds verified rework parity success/diagnostics; shared internal wrapper performs parity input, artifact read/hash/parse validation. | no direct external | Done split; keep artifact I/O in shared/internal. |
| `humanGateRouting.ts` | 70 | Resolve human-gate route decisions and default sticky-human-gate behavior. | imported directly from shared/internal persistence | Done: domain-owned; shared no longer re-exports it through state helpers. |
| `gateRoutingTypes.ts` | 84 | Gate route union, threshold status metadata, and gate error language. | via shared re-export | Domain-owned shared language; keep public through `metaReviewGateTypes.ts` compatibility export. |
| `approveValidationRework.ts` | 24 | Classify approve-validation command failures and build auto-rework message. | no | Done: extracted from current-run finalization. |
| `cleanApprovalPolicy.ts` | 92 | Decide clean approval vs threshold-required/fallback route policy. | no | Done: extracted from current-run finalization. |
| `approveThresholdBackstopPolicy.ts` | 100 | Block invalid approve-with-open-findings human-gate routes against configured threshold. | no | Done: extracted from current-run finalization. |
| `snapshotState.ts` | 54 | Normalize meta-review snapshot state and update auto-rework/clean-run counters. | imported directly from shared/internal orchestration | Done: domain-owned; shared no longer re-exports counter helpers through state helpers. |
| `approvalRequestRouteMetadata.ts` | 130 | Resolve approval request gate route metadata and threshold-route diagnostics. | imported by shared/internal envelope builder | Done: domain-owned. |

### Application / Orchestration Candidates

These coordinate command flow, state transitions, transcript append, routing, or
runtime delivery. They should not be moved wholesale to `domain`.

| File | Lines | Responsibility | External import? | Suggested action |
| --- | ---: | --- | --- | --- |
| `metaReviewGateApply.ts` | 119 | Apply meta-review gate on convergence. | via command API | Public API backed by application implementation; likely application owner. |
| `metaReviewGateApplyContext.ts` | 115 | Build apply-flow execution context after resolving capabilities, bubble paths, lock path, pane deactivation, and running state. | yes, 1 | Application/defaults boundary candidate; likely not shared public. |
| `internal/metaReviewGateApplyCapabilities.ts` | 131 | Require apply-flow dependency capabilities and raise missing-capability gate errors. | no direct external | Application/internal capability guard helper; keep private to apply-flow context construction. |
| `metaReviewGateApplyRunRouting.ts` | 65 | Route kickoff/run-failed result during apply flow. | no direct external | Application internal. |
| `metaReviewGateApplyObservation.ts` | 130 | Reconcile observed gate result with persisted state. | no direct external | Application internal with state semantics. |
| `metaReviewGateApplyPersistence.ts` | 96 | Persist runtime delivery observation. | no direct external | Application/infrastructure boundary candidate. |
| `metaReviewGateApplyHelpers.ts` | 107 | Append kickoff envelope and persist run-failed route. | no direct external | Application internal; uses transcript/state helpers. |
| `metaReviewGateFindingsValidation.ts` | 95 | Top-level positive-claim validation orchestration over preflight, approve policy, and rework artifact validation adapter. | no direct external | Application/internal wrapper; do not move wholesale to domain. |
| `internal/metaReviewGateFindingsArtifactParity.ts` | 149 | Validate findings artifact parity by reading with retry, parsing JSON, deriving split, checking open total, and verifying digest. | no direct external | Application/internal artifact adapter; exported through parity helper compatibility surface. |
| `internal/metaReviewGateFindingsParityHelpers.ts` | 30 | Compatibility re-export surface for findings parity helpers and domain projection/split wrappers. | public via aggregate index only | Keep as narrow compatibility surface while callers still import the public aggregate helper. |
| `internal/metaReviewGateCurrentRunFinalization.ts` | 139 | Current-run top-level route resolution skeleton, parity failure handling, threshold backstop route guard, sticky-human-gate branch, rework dispatch handoff, and final human-route fallback. | no direct external; public door is `metaReviewGateCurrentRunApi.ts` | Application candidate; approve routing, parity resolution, threshold policy adapters, pure approve-validation, clean-approval, and approve-threshold backstop policies have been split out. |
| `internal/metaReviewGateCurrentRunApproveRouting.ts` | 144 | Route approve current-run results through clean-run streak requirements, approve validation, validation-triggered auto-rework, and sticky approve validation. | no direct external | Application/internal approve-routing helper. |
| `internal/metaReviewGateCurrentRunParity.ts` | 72 | Resolve current-run structured positive-claim parity and merge parity diagnostics into the run result used for routing. | no direct external | Application/internal adapter over findings validation and artifact read capability. |
| `internal/metaReviewGateCurrentRunThresholdPolicies.ts` | 148 | Apply current-run approve threshold backstop and clean-approval threshold policies, including lazy threshold-authority reads. | no direct external | Application/internal adapter over domain threshold policies and artifact authority reads. |
| `metaReviewGateCurrentRunCleanRerun.ts` | 123 | Clean rerun top-level orchestration skeleton. | no direct external | Application/internal first; pane binding, dispatch/kickoff, observation/reconcile, rollback state, delivery/pane helpers, and internal route/capability contract have been split out. |
| `internal/metaReviewGateCleanRerunContract.ts` | 47 | Clean-rerun internal route input, pane warning result, delivery-capable input, and capability guard. | no direct external | Shared/internal contract; keep private unless another internal clean-rerun slice needs the same capability language. |
| `internal/metaReviewGateCleanRerunDelivery.ts` | 76 | Clean-rerun deactivate telemetry, pane delivery annotation, runtime-delivery state projection, and pane deactivate handling. | no direct external | Shared/internal helper; later placement depends on final runtime-delivery/pane lifecycle ownership. |
| `internal/metaReviewGateCleanRerunDispatch.ts` | 112 | Clean-rerun dispatch failure routing, running-state staging, kickoff envelope append, and kickoff append failure fallback. | no direct external | Application/internal dispatch helper; placement likely follows current-run orchestration owner. |
| `internal/metaReviewGateCleanRerunObservation.ts` | 97 | Clean-rerun runtime delivery observation persistence and observed result reconciliation with failure fallback. | no direct external | Application/internal observation helper; later placement likely follows runtime delivery persistence/reconciliation ownership. |
| `internal/metaReviewGateCleanRerunPaneBinding.ts` | 96 | Clean-rerun pane warning binding and pane-notification failure fallback. | no direct external | Application/internal pane-binding helper; keep private to clean-rerun orchestration. |
| `internal/metaReviewGateCleanRerunFailureState.ts` | 16 | Build clean-rerun dispatch-failure rollback state by resetting clean-run streak and runtime delivery. | no direct external | Shared/internal helper; keep behind clean-rerun orchestration unless reused by adjacent route persistence. |
| `metaReviewGateCurrentRunRoutePersistence.ts` | 173 | Persist run-failed/dispatch/resolved human routes. | no direct external | Application/infrastructure boundary candidate; common current-run human-gate persistence base input is now normalized locally. |
| `metaReviewGateAutoRework.ts` | 68 | Auto-rework dispatch orchestration and failure routing. | no direct external | Application candidate with ports; state, envelope, persistence, and contract details have been split out. |
| `internal/metaReviewGateAutoReworkContract.ts` | 58 | Auto-rework finalize input, dispatch input, and dispatch-failure persistence callback contracts. | no direct external | Shared/internal contract for auto-rework slices; keep private. |
| `metaReviewGateAutoReworkEnvelope.ts` | 78 | Append auto-rework approval-decision envelope and metadata. | no direct external | Application/internal envelope builder; keep near auto-rework orchestration. |
| `internal/metaReviewGateAutoReworkPersistence.ts` | 77 | Write resumed auto-rework state, restore ready state after append failure, and map state-store errors to gate errors. | no direct external | Application/internal persistence helper; keep near auto-rework orchestration. |
| `metaReviewGateAutoReworkState.ts` | 101 | Build resumed auto-rework state and restore READY state after append failure. | no direct external | Application/internal state builder; keep near auto-rework orchestration. |
| `metaReviewGateHumanGatePersistence.ts` | 138 | Persist human gate state, append route request through route adapter, and roll back state after append failure. | no direct external | Application/infrastructure boundary candidate; input contract and route append adapter have been split out. |
| `internal/metaReviewGateHumanGatePersistenceContract.ts` | 45 | Human-gate persistence input contract. | no direct external | Shared/internal contract for human-gate persistence slices; keep private. |
| `internal/metaReviewGateHumanGateRouteAppend.ts` | 68 | Build and append route-specific human-gate approval request envelopes, including threshold-route validation. | no direct external | Application/internal route append adapter; keep behind human-gate persistence. |
| `metaReviewGateHumanGatePersistenceHelpers.ts` | 180 | Human gate recommendation, request append, rollback handling. | no direct external | Application internal; split pure recommendation from append/rollback later. |
| `approvalRequestEnvelope.ts` | 149 | Build/append human approval request envelope with domain-resolved route metadata. | no direct external | Application/internal first; possible presenter/DTO extraction later. |
| `metaReviewApproveValidationGate.ts` | 135 | Run sticky approve validation commands. | no direct external | Application candidate; validation runtime orchestration; policy resolution and diagnostics have been split out. |
| `internal/metaReviewApproveValidationDiagnostics.ts` | 91 | Build approve-validation failure reasons and map runner error stages into gate diagnostics. | no direct external | Shared/internal diagnostics helper; keep private behind approve-validation gate. |
| `metaReviewApproveValidationPolicy.ts` | 130 | Resolve configured meta-review approve validation command policy. | no direct external | Application/internal policy resolver; depends on shared validation command IDs. |
| `metaReviewGateStateHelpers.ts` | 47 | State transition coordination for human-gate state persistence. | no direct external | Application/internal helper; route defaults, summaries, and snapshot state are now domain-owned. |
| `metaReviewGateStateStaging.ts` | 78 | Stage meta-review running state with execution context. | no direct external | Application internal. |
| `metaReviewGateShared.ts` | 20 | Gate lock path and running-state assertion shared by apply/current-run routing. | no direct external | Small application/internal utility; consider splitting lock path if path construction gets another owner. |
| `metaReviewGateErrorConversion.ts` | 36 | Convert meta-review errors to gate errors. | via command API | Public-adjacent error boundary; keep behind public API. |

### Infrastructure / Port Candidates

These are technical I/O or runtime seams. They may stay internal temporarily, but
the final owner should not be domain policy.

| File | Lines | Responsibility | External import? | Suggested action |
| --- | ---: | --- | --- | --- |
| `internal/metaReviewGateFindingsMetadata.ts` | 47 | Artifact path resolution plus compatibility re-exports for domain parity metadata helpers. | public via aggregate index only | Done split; keep path resolution behind shared public API while pure metadata stays domain-owned. |
| `metaReviewGateFindingsArtifactReadRetry.ts` | 90 | Retry policy around findings artifact read. | no direct external | Infrastructure/port-adjacent or application internal. |
| `internal/metaReviewGateReviewerSnapshot.ts` | 29 | Transcript read wrapper plus compatibility re-exports for domain reviewer snapshot policy. | public via aggregate index only | Done split; pure snapshot derivation is domain-owned. |

## Checkpoint Summary

The first pass is complete for the original meta-review gate boundary problem:

1. `src/v11/shared/metaReviewGate/index.ts` is the broad public module door.
2. `metaReviewGateCurrentRunApi.ts` is the narrow current-run public door kept
   separate from the aggregate index because of the known cycle.
3. Implementation details now live under
   `src/v11/shared/metaReviewGate/internal/**`.
4. Obvious pure policy and language moved to `src/v11/domain/metaReviewGate/**`.
5. Large orchestration files were reduced to named internal slices rather than
   moved wholesale to domain.
6. `metaReviewGateTypes.ts` remains a compatibility aggregator; new source
   imports should prefer narrower route/result/runtime/current-run contract
   files.

## Open Questions

1. Should `shared/metaReview/**` be treated as inside the same broader
   meta-review bounded context, or as an external consumer for the `internal/`
   rule pilot?
2. Should `finalizeCurrentRunMetaReviewGate` remain public on the narrow
   `metaReviewGateCurrentRunApi.ts` door long-term, or should callers eventually
   move to a higher-level command API?
3. Should `metaReviewGateTypes.ts` remain indefinitely as compatibility public
   surface, or should a later major cleanup remove it once external callers have
   migrated to narrower contract files?
4. Should artifact read/hash/parse helpers later move behind a narrower
   infrastructure port, or is the current shared/internal adapter sufficient?
