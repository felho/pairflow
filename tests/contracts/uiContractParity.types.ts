/* eslint-disable @typescript-eslint/no-unused-vars */

import type {
  BubbleLifecycleState as CanonicalBubbleLifecycleState
} from "../../src/contracts/ui/bubbleLifecycle.js";
import {
  bubbleLifecycleStates as canonicalBubbleLifecycleStates
} from "../../src/contracts/ui/bubbleLifecycle.js";
import type {
  ContractValidationError as CanonicalContractValidationError,
  StateValidationDiagnostics as CanonicalStateValidationDiagnostics
} from "../../src/contracts/ui/stateValidation.js";
import type {
  UiBubbleListRemoteExecution as CanonicalUiBubbleListRemoteExecution,
  UiBubbleRemoteCacheStatus as CanonicalUiBubbleRemoteCacheStatus,
  UiBubbleRemoteExecution as CanonicalUiBubbleRemoteExecution,
  UiBubbleStatusCacheReasonCode as CanonicalUiBubbleStatusCacheReasonCode,
  UiBubbleStatusRemoteExecution as CanonicalUiBubbleStatusRemoteExecution
} from "../../src/contracts/ui/uiRemoteExecution.js";
import type {
  UiApiErrorBody as CanonicalUiApiErrorBody
} from "../../src/contracts/ui/uiErrors.js";
import type {
  UiEvent as CanonicalUiEvent,
  UiEventsConnectedPayload as CanonicalUiEventsConnectedPayload,
  UiSnapshotEvent as CanonicalUiSnapshotEvent
} from "../../src/contracts/ui/uiEvents.js";
import type {
  MetaReviewQualityPreset as CanonicalMetaReviewQualityPreset,
  UiActionAgentName as CanonicalUiActionAgentName,
  UiActionAgentRole as CanonicalUiActionAgentRole,
  UiActionApprovalDecision as CanonicalUiActionApprovalDecision,
  UiActionBubbleState as CanonicalUiActionBubbleState,
  UiActionEvent as CanonicalUiActionEvent,
  UiActionExecutionContextRef as CanonicalUiActionExecutionContextRef,
  UiActionFindingsClaimSource as CanonicalUiActionFindingsClaimSource,
  UiActionFindingsClaimState as CanonicalUiActionFindingsClaimState,
  UiActionPassIntent as CanonicalUiActionPassIntent,
  UiActionPendingReworkIntent as CanonicalUiActionPendingReworkIntent,
  UiActionProtocolMessageType as CanonicalUiActionProtocolMessageType,
  UiActionProtocolParticipant as CanonicalUiActionProtocolParticipant,
  UiAttachLauncher as CanonicalUiAttachLauncher,
  UiCommitBubbleInput as CanonicalUiCommitBubbleInput,
  UiCommitBubbleResult as CanonicalUiCommitBubbleResult,
  UiAttachBubbleInput as CanonicalUiAttachBubbleInput,
  UiBubbleMutationInput as CanonicalUiBubbleMutationInput,
  UiDeleteBubbleResult as CanonicalUiDeleteBubbleResult,
  UiDeleteBubbleInput as CanonicalUiDeleteBubbleInput,
  UiApprovalDecisionDeliverySignal as CanonicalUiApprovalDecisionDeliverySignal,
  UiApprovalDecisionDeliverySignals as CanonicalUiApprovalDecisionDeliverySignals,
  UiDeliveryAckReasonCode as CanonicalUiDeliveryAckReasonCode,
  UiDeliveryFailureReason as CanonicalUiDeliveryFailureReason,
  UiDeliveryTargetReasonCode as CanonicalUiDeliveryTargetReasonCode,
  UiEmitApprovalDecisionResult as CanonicalUiEmitApprovalDecisionResult,
  UiEmitApproveInput as CanonicalUiEmitApproveInput,
  UiEmitHumanReplyInput as CanonicalUiEmitHumanReplyInput,
  UiEmitHumanReplyResult as CanonicalUiEmitHumanReplyResult,
  UiEmitRequestReworkImmediateResult as CanonicalUiEmitRequestReworkImmediateResult,
  UiEmitRequestReworkInput as CanonicalUiEmitRequestReworkInput,
  UiEmitRequestReworkQueuedResult as CanonicalUiEmitRequestReworkQueuedResult,
  UiEmitRequestReworkResult as CanonicalUiEmitRequestReworkResult,
  UiAttachBubbleResult as CanonicalUiAttachBubbleResult,
  UiMergeBubbleInput as CanonicalUiMergeBubbleInput,
  UiMergeBubbleResult as CanonicalUiMergeBubbleResult,
  UiOpenBubbleResult as CanonicalUiOpenBubbleResult,
  UiPassValidationRecoveryMarkerPersistWarning as CanonicalUiPassValidationRecoveryMarkerPersistWarning,
  UiRestartBubbleResult as CanonicalUiRestartBubbleResult,
  UiStartBubbleResult as CanonicalUiStartBubbleResult,
  UiStopBubbleResult as CanonicalUiStopBubbleResult,
  UiUpdateBubbleReviewPolicyInput as CanonicalUiUpdateBubbleReviewPolicyInput,
  UiUpdateBubbleReviewPolicyResult as CanonicalUiUpdateBubbleReviewPolicyResult
} from "../../src/contracts/ui/uiActions.js";
import type {
  UiBubbleDetail as CanonicalUiBubbleDetail,
  UiBubbleInboxInput as CanonicalUiBubbleInboxInput,
  UiBubbleInboxItem as CanonicalUiBubbleInboxItem,
  UiBubbleInboxView as CanonicalUiBubbleInboxView,
  UiBubbleListEntry as CanonicalUiBubbleListEntry,
  UiBubbleListStateCounts as CanonicalUiBubbleListStateCounts,
  UiBubbleListView as CanonicalUiBubbleListView,
  UiBubbleMetaReviewSummary as CanonicalUiBubbleMetaReviewSummary,
  UiBubbleReviewPolicy as CanonicalUiBubbleReviewPolicy,
  UiBubbleStatusInput as CanonicalUiBubbleStatusInput,
  UiBubbleStatusView as CanonicalUiBubbleStatusView,
  UiBubbleSummary as CanonicalUiBubbleSummary,
  UiBubbleWatchdog as CanonicalUiBubbleWatchdog,
  UiPendingInboxItemSource as CanonicalUiPendingInboxItemSource,
  UiRepoSummary as CanonicalUiRepoSummary,
  UiRuntimeSessionRecord as CanonicalUiRuntimeSessionRecord,
  UiTimelineEntry as CanonicalUiTimelineEntry
} from "../../src/contracts/ui/uiReadModel.js";
import type {
  BubbleLifecycleState as RuntimeBubbleLifecycleState
} from "../../src/types/bubble.js";
import {
  bubbleLifecycleStates as runtimeBubbleLifecycleStates
} from "../../src/types/bubble.js";
import type {
  UiBubbleListRemoteExecution as TransitUiBubbleListRemoteExecution,
  UiBubbleRemoteCacheStatus as TransitUiBubbleRemoteCacheStatus,
  UiBubbleRemoteExecution as TransitUiBubbleRemoteExecution,
  UiBubbleStatusCacheReasonCode as TransitUiBubbleStatusCacheReasonCode,
  UiBubbleStatusRemoteExecution as TransitUiBubbleStatusRemoteExecution
} from "../../src/types/uiRemoteExecution.js";
import type {
  BubbleLifecycleState as BackendBubbleLifecycleState
} from "../../src/shared/contracts/bubbleLifecycle.js";
import type {
  ContractValidationError as BackendContractValidationError,
  StateValidationDiagnostics as BackendStateValidationDiagnostics
} from "../../src/shared/contracts/stateValidation.js";
import type {
  UiBubbleListRemoteExecution as BackendUiBubbleListRemoteExecution,
  UiBubbleRemoteCacheStatus as BackendUiBubbleRemoteCacheStatus,
  UiBubbleRemoteExecution as BackendUiBubbleRemoteExecution,
  UiBubbleStatusCacheReasonCode as BackendUiBubbleStatusCacheReasonCode,
  UiBubbleStatusRemoteExecution as BackendUiBubbleStatusRemoteExecution
} from "../../src/shared/contracts/uiRemoteExecution.js";
import type {
  StateValidationDiagnostics as TransitStateValidationDiagnostics
} from "../../src/v11/shared/ports/stateSnapshots.js";
import type {
  MetaReviewQualityPreset as RouterMetaReviewQualityPreset,
  UiActionAgentName as RouterUiActionAgentName,
  UiActionAgentRole as RouterUiActionAgentRole,
  UiActionApprovalDecision as RouterUiActionApprovalDecision,
  UiActionBubbleState as RouterUiActionBubbleState,
  UiActionEvent as RouterUiActionEvent,
  UiActionExecutionContextRef as RouterUiActionExecutionContextRef,
  UiActionFindingsClaimSource as RouterUiActionFindingsClaimSource,
  UiActionFindingsClaimState as RouterUiActionFindingsClaimState,
  UiActionPassIntent as RouterUiActionPassIntent,
  UiActionPendingReworkIntent as RouterUiActionPendingReworkIntent,
  UiActionProtocolMessageType as RouterUiActionProtocolMessageType,
  UiActionProtocolParticipant as RouterUiActionProtocolParticipant,
  UiAttachLauncher as RouterUiAttachLauncher,
  UiCommitBubbleInput as RouterUiCommitBubbleInput,
  UiCommitBubbleResult as RouterUiCommitBubbleResult,
  UiAttachBubbleInput as RouterUiAttachBubbleInput,
  UiBubbleInboxInput as RouterUiBubbleInboxInput,
  UiBubbleInboxView as RouterUiBubbleInboxView,
  UiBubbleListEntry as RouterUiBubbleListEntry,
  UiBubbleListStateCounts as RouterUiBubbleListStateCounts,
  UiBubbleListView as RouterUiBubbleListView,
  UiBubbleMutationInput as RouterUiBubbleMutationInput,
  UiBubbleStatusInput as RouterUiBubbleStatusInput,
  UiBubbleStatusView as RouterUiBubbleStatusView,
  UiDeleteBubbleResult as RouterUiDeleteBubbleResult,
  UiDeleteBubbleInput as RouterUiDeleteBubbleInput,
  UiApprovalDecisionDeliverySignal as RouterUiApprovalDecisionDeliverySignal,
  UiApprovalDecisionDeliverySignals as RouterUiApprovalDecisionDeliverySignals,
  UiDeliveryAckReasonCode as RouterUiDeliveryAckReasonCode,
  UiDeliveryFailureReason as RouterUiDeliveryFailureReason,
  UiDeliveryTargetReasonCode as RouterUiDeliveryTargetReasonCode,
  UiEmitApprovalDecisionResult as RouterUiEmitApprovalDecisionResult,
  UiEmitApproveInput as RouterUiEmitApproveInput,
  UiEmitHumanReplyInput as RouterUiEmitHumanReplyInput,
  UiEmitHumanReplyResult as RouterUiEmitHumanReplyResult,
  UiEmitRequestReworkImmediateResult as RouterUiEmitRequestReworkImmediateResult,
  UiEmitRequestReworkInput as RouterUiEmitRequestReworkInput,
  UiEmitRequestReworkQueuedResult as RouterUiEmitRequestReworkQueuedResult,
  UiEmitRequestReworkResult as RouterUiEmitRequestReworkResult,
  UiAttachBubbleResult as RouterUiAttachBubbleResult,
  UiMergeBubbleInput as RouterUiMergeBubbleInput,
  UiMergeBubbleResult as RouterUiMergeBubbleResult,
  UiOpenBubbleResult as RouterUiOpenBubbleResult,
  UiPassValidationRecoveryMarkerPersistWarning as RouterUiPassValidationRecoveryMarkerPersistWarning,
  UiRestartBubbleResult as RouterUiRestartBubbleResult,
  UiStartBubbleResult as RouterUiStartBubbleResult,
  UiStopBubbleResult as RouterUiStopBubbleResult,
  UiUpdateBubbleReviewPolicyInput as RouterUiUpdateBubbleReviewPolicyInput,
  UiUpdateBubbleReviewPolicyResult as RouterUiUpdateBubbleReviewPolicyResult,
  UiRouterDependencies
} from "../../src/v11/shared/ports/uiRouter.js";
import type {
  UiApiErrorBody as BackendUiApiErrorBody,
  UiBubbleDetail as BackendUiBubbleDetail,
  UiBubbleInboxInput as BackendUiBubbleInboxInput,
  UiBubbleReviewPolicy as BackendUiBubbleReviewPolicy,
  UiBubbleInboxView as BackendUiBubbleInboxView,
  UiBubbleListEntry as BackendUiBubbleListEntry,
  UiBubbleListStateCounts as BackendUiBubbleListStateCounts,
  UiBubbleListView as BackendUiBubbleListView,
  UiBubbleMetaReviewSummary as BackendUiBubbleMetaReviewSummary,
  UiBubbleStatusInput as BackendUiBubbleStatusInput,
  UiBubbleStatusView as BackendUiBubbleStatusView,
  UiBubbleSummary as BackendUiBubbleSummary,
  UiBubbleWatchdog as BackendUiBubbleWatchdog,
  UiEvent as BackendUiEvent,
  UiEventsConnectedPayload as BackendUiEventsConnectedPayload,
  UiPendingInboxItemSource as BackendUiPendingInboxItemSource,
  UiRepoSummary as BackendUiRepoSummary,
  UiSnapshotEvent as BackendUiSnapshotEvent,
  UiTimelineEntry as BackendUiTimelineEntry
} from "../../src/types/ui.js";
import type {
  RuntimeSessionRecord as RuntimeSessionRecord
} from "../../src/v11/shared/ports/runtimeSessions.js";
import type {
  ActiveMetaReviewRuntimeDeliveryView
} from "../../src/v11/shared/metaReview/metaReviewSnapshot.js";
import type {
  ProtocolEnvelopePayload
} from "../../src/types/protocol.js";
import type {
  BubbleLifecycleState as UiBubbleLifecycleState
} from "../../ui/src/lib/contracts/bubbleLifecycle.js";
import {
  bubbleLifecycleStates as uiBubbleLifecycleStates
} from "../../ui/src/lib/contracts/bubbleLifecycle.js";
import type {
  ContractValidationError as UiContractValidationError,
  StateValidationDiagnostics as UiStateValidationDiagnostics
} from "../../ui/src/lib/contracts/stateValidation.js";
import type {
  UiBubbleListRemoteExecution as UiBubbleListRemoteExecution,
  UiBubbleRemoteCacheStatus as UiBubbleRemoteCacheStatus,
  UiBubbleRemoteExecution as UiBubbleRemoteExecution,
  UiBubbleStatusCacheReasonCode as UiBubbleStatusCacheReasonCode,
  UiBubbleStatusRemoteExecution as UiBubbleStatusRemoteExecution
} from "../../ui/src/lib/contracts/uiRemoteExecution.js";
import type {
  UiApiErrorBody as UiApiErrorBody
} from "../../ui/src/lib/contracts/uiErrors.js";
import type {
  UiEvent as UiEvent,
  UiEventsConnectedPayload as UiEventsConnectedPayload,
  UiSnapshotEvent as UiSnapshotEvent
} from "../../ui/src/lib/contracts/uiEvents.js";
import type {
  MetaReviewQualityPreset as UiMetaReviewQualityPreset,
  UiActionAgentName as UiActionAgentName,
  UiActionAgentRole as UiActionAgentRole,
  UiActionApprovalDecision as UiActionApprovalDecision,
  UiActionBubbleState as UiActionBubbleState,
  UiActionEvent as UiActionEventResult,
  UiActionExecutionContextRef as UiActionExecutionContextRef,
  UiActionFindingsClaimSource as UiActionFindingsClaimSource,
  UiActionFindingsClaimState as UiActionFindingsClaimState,
  UiActionPassIntent as UiActionPassIntent,
  UiActionPendingReworkIntent as UiActionPendingReworkIntent,
  UiActionProtocolMessageType as UiActionProtocolMessageType,
  UiActionProtocolParticipant as UiActionProtocolParticipant,
  UiApprovalDecisionDeliverySignal as UiApprovalDecisionDeliverySignal,
  UiApprovalDecisionDeliverySignals as UiApprovalDecisionDeliverySignals,
  UiAttachLauncher as UiAttachLauncher,
  UiCommitBubbleInput as UiCommitBubbleInput,
  UiCommitBubbleResult as UiCommitBubbleResult,
  UiAttachBubbleInput as UiAttachBubbleInput,
  UiBubbleMutationInput as UiBubbleMutationInput,
  UiDeleteBubbleResult as UiDeleteBubbleResult,
  UiDeleteBubbleInput as UiDeleteBubbleInput,
  UiDeliveryAckReasonCode as UiDeliveryAckReasonCode,
  UiDeliveryFailureReason as UiDeliveryFailureReason,
  UiDeliveryTargetReasonCode as UiDeliveryTargetReasonCode,
  UiEmitApprovalDecisionResult as UiEmitApprovalDecisionResult,
  UiEmitApproveInput as UiEmitApproveInput,
  UiEmitHumanReplyInput as UiEmitHumanReplyInput,
  UiEmitHumanReplyResult as UiEmitHumanReplyResult,
  UiEmitRequestReworkImmediateResult as UiEmitRequestReworkImmediateResult,
  UiEmitRequestReworkInput as UiEmitRequestReworkInput,
  UiEmitRequestReworkQueuedResult as UiEmitRequestReworkQueuedResult,
  UiEmitRequestReworkResult as UiEmitRequestReworkResult,
  UiAttachBubbleResult as UiAttachBubbleResult,
  UiMergeBubbleInput as UiMergeBubbleInput,
  UiMergeBubbleResult as UiMergeBubbleResult,
  UiOpenBubbleResult as UiOpenBubbleResult,
  UiPassValidationRecoveryMarkerPersistWarning as UiPassValidationRecoveryMarkerPersistWarning,
  UiRestartBubbleResult as UiRestartBubbleResult,
  UiStartBubbleResult as UiStartBubbleResult,
  UiStopBubbleResult as UiStopBubbleResult,
  UiUpdateBubbleReviewPolicyInput as UiUpdateBubbleReviewPolicyInput,
  UiUpdateBubbleReviewPolicyResult as UiUpdateBubbleReviewPolicyResult
} from "../../ui/src/lib/contracts/uiActions.js";
import type {
  UiBubbleDetail as UiBubbleDetail,
  UiBubbleInboxInput as UiBubbleInboxInput,
  UiBubbleInboxItem as UiBubbleInboxItem,
  UiBubbleInboxView as UiBubbleInboxView,
  UiBubbleListEntry as UiBubbleListEntry,
  UiBubbleListStateCounts as UiBubbleListStateCounts,
  UiBubbleListView as UiBubbleListView,
  UiBubbleMetaReviewSummary as UiBubbleMetaReviewSummary,
  UiBubbleReviewPolicy as UiBubbleReviewPolicy,
  UiBubbleStatusInput as UiBubbleStatusInput,
  UiBubbleStatusView as UiBubbleStatusView,
  UiBubbleSummary as UiBubbleSummary,
  UiBubbleWatchdog as UiBubbleWatchdog,
  UiPendingInboxItemSource as UiPendingInboxItemSource,
  UiRepoSummary as UiRepoSummary,
  UiRuntimeSessionRecord as UiRuntimeSessionRecord,
  UiTimelineEntry as UiTimelineEntry
} from "../../ui/src/lib/contracts/uiReadModel.js";
import type {
  PairflowApiClient
} from "../../ui/src/lib/api.js";

type Assert<T extends true> = T;

type Equal<A, B> =
  (<T>() => T extends A ? 1 : 2) extends
    (<T>() => T extends B ? 1 : 2)
    ? (<T>() => T extends B ? 1 : 2) extends
        (<T>() => T extends A ? 1 : 2)
        ? true
        : false
    : false;

type OptionalKeys<T> = {
  [K in keyof T]-?: Pick<T, K> extends Required<Pick<T, K>> ? never : K;
}[keyof T];

type _bubbleLifecycleStateParity =
  Assert<Equal<CanonicalBubbleLifecycleState, RuntimeBubbleLifecycleState>>;
type _backendBubbleLifecycleStateParity =
  Assert<Equal<CanonicalBubbleLifecycleState, BackendBubbleLifecycleState>>;
type _uiBubbleLifecycleStateParity =
  Assert<Equal<BackendBubbleLifecycleState, UiBubbleLifecycleState>>;
type _stateValidationParity =
  Assert<
    Equal<CanonicalStateValidationDiagnostics, BackendStateValidationDiagnostics>
  >;
type _contractValidationErrorParity =
  Assert<Equal<CanonicalContractValidationError, BackendContractValidationError>>;
type _uiContractValidationErrorParity =
  Assert<Equal<BackendContractValidationError, UiContractValidationError>>;
type _uiStateValidationParity =
  Assert<Equal<BackendStateValidationDiagnostics, UiStateValidationDiagnostics>>;
type _transitStateValidationParity =
  Assert<
    Equal<CanonicalStateValidationDiagnostics, TransitStateValidationDiagnostics>
  >;
type _remoteCacheStatusParity =
  Assert<Equal<CanonicalUiBubbleRemoteCacheStatus, BackendUiBubbleRemoteCacheStatus>>;
type _uiRemoteCacheStatusParity =
  Assert<Equal<BackendUiBubbleRemoteCacheStatus, UiBubbleRemoteCacheStatus>>;
type _transitRemoteCacheStatusParity =
  Assert<Equal<CanonicalUiBubbleRemoteCacheStatus, TransitUiBubbleRemoteCacheStatus>>;
type _statusCacheReasonParity =
  Assert<
    Equal<
      CanonicalUiBubbleStatusCacheReasonCode,
      BackendUiBubbleStatusCacheReasonCode
    >
  >;
type _uiStatusCacheReasonParity =
  Assert<Equal<BackendUiBubbleStatusCacheReasonCode, UiBubbleStatusCacheReasonCode>>;
type _transitStatusCacheReasonParity =
  Assert<
    Equal<
      CanonicalUiBubbleStatusCacheReasonCode,
      TransitUiBubbleStatusCacheReasonCode
    >
  >;
type _listRemoteExecutionParity =
  Assert<
    Equal<
      CanonicalUiBubbleListRemoteExecution,
      BackendUiBubbleListRemoteExecution
    >
  >;
type _uiListRemoteExecutionParity =
  Assert<Equal<BackendUiBubbleListRemoteExecution, UiBubbleListRemoteExecution>>;
type _transitListRemoteExecutionParity =
  Assert<
    Equal<
      CanonicalUiBubbleListRemoteExecution,
      TransitUiBubbleListRemoteExecution
    >
  >;
type _statusRemoteExecutionParity =
  Assert<
    Equal<
      CanonicalUiBubbleStatusRemoteExecution,
      BackendUiBubbleStatusRemoteExecution
    >
  >;
type _uiStatusRemoteExecutionParity =
  Assert<Equal<BackendUiBubbleStatusRemoteExecution, UiBubbleStatusRemoteExecution>>;
type _transitStatusRemoteExecutionParity =
  Assert<
    Equal<
      CanonicalUiBubbleStatusRemoteExecution,
      TransitUiBubbleStatusRemoteExecution
    >
  >;
type _remoteExecutionParity =
  Assert<Equal<CanonicalUiBubbleRemoteExecution, BackendUiBubbleRemoteExecution>>;
type _uiRemoteExecutionParity =
  Assert<Equal<BackendUiBubbleRemoteExecution, UiBubbleRemoteExecution>>;
type _transitRemoteExecutionParity =
  Assert<Equal<CanonicalUiBubbleRemoteExecution, TransitUiBubbleRemoteExecution>>;

type _runtimeSessionRecordParity =
  Assert<Equal<CanonicalUiRuntimeSessionRecord, RuntimeSessionRecord>>;
type _uiRuntimeSessionRecordParity =
  Assert<Equal<CanonicalUiRuntimeSessionRecord, UiRuntimeSessionRecord>>;
type _metaReviewRuntimeDeliveryParity =
  Assert<
    Equal<
      NonNullable<CanonicalUiBubbleMetaReviewSummary["runtimeDelivery"]>,
      ActiveMetaReviewRuntimeDeliveryView
    >
  >;
type _backendMetaReviewSummaryParity =
  Assert<Equal<CanonicalUiBubbleMetaReviewSummary, BackendUiBubbleMetaReviewSummary>>;
type _uiMetaReviewSummaryParity =
  Assert<Equal<CanonicalUiBubbleMetaReviewSummary, UiBubbleMetaReviewSummary>>;
type _backendBubbleSummaryParity =
  Assert<Equal<CanonicalUiBubbleSummary, BackendUiBubbleSummary>>;
type _uiBubbleSummaryParity =
  Assert<Equal<CanonicalUiBubbleSummary, UiBubbleSummary>>;
type _backendBubbleDetailParity =
  Assert<Equal<CanonicalUiBubbleDetail, BackendUiBubbleDetail>>;
type _uiBubbleDetailParity =
  Assert<Equal<CanonicalUiBubbleDetail, UiBubbleDetail>>;
type _routerBubbleListEntryParity =
  Assert<Equal<CanonicalUiBubbleListEntry, RouterUiBubbleListEntry>>;
type _backendBubbleListEntryParity =
  Assert<Equal<CanonicalUiBubbleListEntry, BackendUiBubbleListEntry>>;
type _uiBubbleListEntryParity =
  Assert<Equal<CanonicalUiBubbleListEntry, UiBubbleListEntry>>;
type _summaryReviewPolicyIsRequiredNullable =
  Assert<
    Equal<
      CanonicalUiBubbleSummary["reviewPolicy"],
      CanonicalUiBubbleReviewPolicy | null
    >
  >;
type _listEntryReviewPolicyIsOptional =
  Assert<
    Equal<
      Pick<CanonicalUiBubbleListEntry, "reviewPolicy">,
      { reviewPolicy?: CanonicalUiBubbleReviewPolicy }
    >
  >;
type _listEntryReviewPolicyAllowsOmission =
  Assert<
    Equal<OptionalKeys<Pick<CanonicalUiBubbleListEntry, "reviewPolicy">>, "reviewPolicy">
  >;
type _routerBubbleListStateCountsParity =
  Assert<Equal<CanonicalUiBubbleListStateCounts, RouterUiBubbleListStateCounts>>;
type _backendBubbleListStateCountsParity =
  Assert<Equal<CanonicalUiBubbleListStateCounts, BackendUiBubbleListStateCounts>>;
type _uiBubbleListStateCountsParity =
  Assert<Equal<CanonicalUiBubbleListStateCounts, UiBubbleListStateCounts>>;
type _routerBubbleListViewParity =
  Assert<Equal<CanonicalUiBubbleListView, RouterUiBubbleListView>>;
type _backendBubbleListViewParity =
  Assert<Equal<CanonicalUiBubbleListView, BackendUiBubbleListView>>;
type _uiBubbleListViewParity =
  Assert<Equal<CanonicalUiBubbleListView, UiBubbleListView>>;
type _routerBubbleStatusInputParity =
  Assert<Equal<CanonicalUiBubbleStatusInput, RouterUiBubbleStatusInput>>;
type _backendBubbleStatusInputParity =
  Assert<Equal<CanonicalUiBubbleStatusInput, BackendUiBubbleStatusInput>>;
type _uiBubbleStatusInputParity =
  Assert<Equal<CanonicalUiBubbleStatusInput, UiBubbleStatusInput>>;
type _routerBubbleStatusViewParity =
  Assert<Equal<CanonicalUiBubbleStatusView, RouterUiBubbleStatusView>>;
type _backendBubbleStatusViewParity =
  Assert<Equal<CanonicalUiBubbleStatusView, BackendUiBubbleStatusView>>;
type _uiBubbleStatusViewParity =
  Assert<Equal<CanonicalUiBubbleStatusView, UiBubbleStatusView>>;
type _routerBubbleInboxInputParity =
  Assert<Equal<CanonicalUiBubbleInboxInput, RouterUiBubbleInboxInput>>;
type _backendBubbleInboxInputParity =
  Assert<Equal<CanonicalUiBubbleInboxInput, BackendUiBubbleInboxInput>>;
type _uiBubbleInboxInputParity =
  Assert<Equal<CanonicalUiBubbleInboxInput, UiBubbleInboxInput>>;
type _routerBubbleInboxViewParity =
  Assert<Equal<CanonicalUiBubbleInboxView, RouterUiBubbleInboxView>>;
type _backendBubbleInboxViewParity =
  Assert<Equal<CanonicalUiBubbleInboxView, BackendUiBubbleInboxView>>;
type _uiBubbleInboxViewParity =
  Assert<Equal<CanonicalUiBubbleInboxView, UiBubbleInboxView>>;
type _routerStatusDependencyInputParity =
  Assert<
    Equal<
      Parameters<UiRouterDependencies["getBubbleStatus"]>[0],
      CanonicalUiBubbleStatusInput
    >
  >;
type _routerStatusDependencyResultParity =
  Assert<
    Equal<
      Awaited<ReturnType<UiRouterDependencies["getBubbleStatus"]>>,
      CanonicalUiBubbleStatusView
    >
  >;
type _routerInboxDependencyInputParity =
  Assert<
    Equal<
      Parameters<UiRouterDependencies["getBubbleInbox"]>[0],
      CanonicalUiBubbleInboxInput
    >
  >;
type _routerInboxDependencyResultParity =
  Assert<
    Equal<
      Awaited<ReturnType<UiRouterDependencies["getBubbleInbox"]>>,
      CanonicalUiBubbleInboxView
    >
  >;
type _backendRepoSummaryParity =
  Assert<Equal<CanonicalUiRepoSummary, BackendUiRepoSummary>>;
type _uiRepoSummaryParity =
  Assert<Equal<CanonicalUiRepoSummary, UiRepoSummary>>;
type _backendTimelineParity =
  Assert<Equal<CanonicalUiTimelineEntry, BackendUiTimelineEntry>>;
type _uiTimelineParity =
  Assert<Equal<CanonicalUiTimelineEntry, UiTimelineEntry>>;
type _timelinePayloadProtocolTransit =
  Assert<Equal<CanonicalUiTimelineEntry["payload"], ProtocolEnvelopePayload>>;
type _backendWatchdogParity =
  Assert<Equal<CanonicalUiBubbleWatchdog, BackendUiBubbleWatchdog>>;
type _uiWatchdogParity =
  Assert<Equal<CanonicalUiBubbleWatchdog, UiBubbleWatchdog>>;
type _backendReviewPolicyParity =
  Assert<Equal<CanonicalUiBubbleReviewPolicy, BackendUiBubbleReviewPolicy>>;
type _uiReviewPolicyParity =
  Assert<Equal<CanonicalUiBubbleReviewPolicy, UiBubbleReviewPolicy>>;
type _pendingInboxSourceBackendParity =
  Assert<
    Equal<CanonicalUiPendingInboxItemSource, BackendUiPendingInboxItemSource>
  >;
type _uiPendingInboxSourceParity =
  Assert<Equal<CanonicalUiPendingInboxItemSource, UiPendingInboxItemSource>>;
type _pendingInboxItemSourceParity =
  Assert<Equal<CanonicalUiBubbleInboxItem, CanonicalUiPendingInboxItemSource>>;
type _uiPendingInboxItemParity =
  Assert<Equal<CanonicalUiBubbleInboxItem, UiBubbleInboxItem>>;

type _routerActionAgentNameParity =
  Assert<Equal<CanonicalUiActionAgentName, RouterUiActionAgentName>>;
type _uiActionAgentNameParity =
  Assert<Equal<CanonicalUiActionAgentName, UiActionAgentName>>;
type _routerActionAgentRoleParity =
  Assert<Equal<CanonicalUiActionAgentRole, RouterUiActionAgentRole>>;
type _uiActionAgentRoleParity =
  Assert<Equal<CanonicalUiActionAgentRole, UiActionAgentRole>>;
type _routerActionApprovalDecisionParity =
  Assert<Equal<CanonicalUiActionApprovalDecision, RouterUiActionApprovalDecision>>;
type _uiActionApprovalDecisionParity =
  Assert<Equal<CanonicalUiActionApprovalDecision, UiActionApprovalDecision>>;
type _routerActionBubbleStateParity =
  Assert<Equal<CanonicalUiActionBubbleState, RouterUiActionBubbleState>>;
type _uiActionBubbleStateParity =
  Assert<Equal<CanonicalUiActionBubbleState, UiActionBubbleState>>;
type _routerActionEventParity =
  Assert<Equal<CanonicalUiActionEvent, RouterUiActionEvent>>;
type _uiActionEventParity =
  Assert<Equal<CanonicalUiActionEvent, UiActionEventResult>>;
type _routerActionExecutionContextRefParity =
  Assert<
    Equal<
      CanonicalUiActionExecutionContextRef,
      RouterUiActionExecutionContextRef
    >
  >;
type _uiActionExecutionContextRefParity =
  Assert<Equal<CanonicalUiActionExecutionContextRef, UiActionExecutionContextRef>>;
type _routerActionFindingsClaimSourceParity =
  Assert<
    Equal<CanonicalUiActionFindingsClaimSource, RouterUiActionFindingsClaimSource>
  >;
type _uiActionFindingsClaimSourceParity =
  Assert<Equal<CanonicalUiActionFindingsClaimSource, UiActionFindingsClaimSource>>;
type _routerActionFindingsClaimStateParity =
  Assert<
    Equal<CanonicalUiActionFindingsClaimState, RouterUiActionFindingsClaimState>
  >;
type _uiActionFindingsClaimStateParity =
  Assert<Equal<CanonicalUiActionFindingsClaimState, UiActionFindingsClaimState>>;
type _routerActionPassIntentParity =
  Assert<Equal<CanonicalUiActionPassIntent, RouterUiActionPassIntent>>;
type _uiActionPassIntentParity =
  Assert<Equal<CanonicalUiActionPassIntent, UiActionPassIntent>>;
type _routerActionPendingReworkIntentParity =
  Assert<Equal<CanonicalUiActionPendingReworkIntent, RouterUiActionPendingReworkIntent>>;
type _uiActionPendingReworkIntentParity =
  Assert<Equal<CanonicalUiActionPendingReworkIntent, UiActionPendingReworkIntent>>;
type _routerActionProtocolMessageTypeParity =
  Assert<Equal<CanonicalUiActionProtocolMessageType, RouterUiActionProtocolMessageType>>;
type _uiActionProtocolMessageTypeParity =
  Assert<Equal<CanonicalUiActionProtocolMessageType, UiActionProtocolMessageType>>;
type _routerActionProtocolParticipantParity =
  Assert<Equal<CanonicalUiActionProtocolParticipant, RouterUiActionProtocolParticipant>>;
type _uiActionProtocolParticipantParity =
  Assert<Equal<CanonicalUiActionProtocolParticipant, UiActionProtocolParticipant>>;
type _routerBubbleMutationInputParity =
  Assert<Equal<CanonicalUiBubbleMutationInput, RouterUiBubbleMutationInput>>;
type _uiBubbleMutationInputParity =
  Assert<Equal<CanonicalUiBubbleMutationInput, UiBubbleMutationInput>>;
type _routerAttachLauncherParity =
  Assert<Equal<CanonicalUiAttachLauncher, RouterUiAttachLauncher>>;
type _uiAttachLauncherParity =
  Assert<Equal<CanonicalUiAttachLauncher, UiAttachLauncher>>;
type _routerMetaReviewQualityPresetParity =
  Assert<Equal<CanonicalMetaReviewQualityPreset, RouterMetaReviewQualityPreset>>;
type _uiMetaReviewQualityPresetParity =
  Assert<Equal<CanonicalMetaReviewQualityPreset, UiMetaReviewQualityPreset>>;

type _routerApproveInputParity =
  Assert<Equal<CanonicalUiEmitApproveInput, RouterUiEmitApproveInput>>;
type _uiApproveInputParity =
  Assert<Equal<CanonicalUiEmitApproveInput, UiEmitApproveInput>>;
type _routerReworkInputParity =
  Assert<Equal<CanonicalUiEmitRequestReworkInput, RouterUiEmitRequestReworkInput>>;
type _uiReworkInputParity =
  Assert<Equal<CanonicalUiEmitRequestReworkInput, UiEmitRequestReworkInput>>;
type _routerHumanReplyInputParity =
  Assert<Equal<CanonicalUiEmitHumanReplyInput, RouterUiEmitHumanReplyInput>>;
type _uiHumanReplyInputParity =
  Assert<Equal<CanonicalUiEmitHumanReplyInput, UiEmitHumanReplyInput>>;
type _routerCommitInputParity =
  Assert<Equal<CanonicalUiCommitBubbleInput, RouterUiCommitBubbleInput>>;
type _uiCommitInputParity =
  Assert<Equal<CanonicalUiCommitBubbleInput, UiCommitBubbleInput>>;
type _routerMergeInputParity =
  Assert<Equal<CanonicalUiMergeBubbleInput, RouterUiMergeBubbleInput>>;
type _uiMergeInputParity =
  Assert<Equal<CanonicalUiMergeBubbleInput, UiMergeBubbleInput>>;
type _routerAttachInputParity =
  Assert<Equal<CanonicalUiAttachBubbleInput, RouterUiAttachBubbleInput>>;
type _uiAttachInputParity =
  Assert<Equal<CanonicalUiAttachBubbleInput, UiAttachBubbleInput>>;
type _routerReviewPolicyInputParity =
  Assert<
    Equal<
      CanonicalUiUpdateBubbleReviewPolicyInput,
      RouterUiUpdateBubbleReviewPolicyInput
    >
  >;
type _uiReviewPolicyInputParity =
  Assert<
    Equal<
      CanonicalUiUpdateBubbleReviewPolicyInput,
      UiUpdateBubbleReviewPolicyInput
    >
  >;
type _routerDeleteInputParity =
  Assert<Equal<CanonicalUiDeleteBubbleInput, RouterUiDeleteBubbleInput>>;
type _uiDeleteInputParity =
  Assert<Equal<CanonicalUiDeleteBubbleInput, UiDeleteBubbleInput>>;
type _routerApprovalResultParity =
  Assert<
    Equal<
      CanonicalUiEmitApprovalDecisionResult,
      RouterUiEmitApprovalDecisionResult
    >
  >;
type _uiApprovalResultParity =
  Assert<Equal<CanonicalUiEmitApprovalDecisionResult, UiEmitApprovalDecisionResult>>;
type _routerApprovalDeliverySignalsParity =
  Assert<
    Equal<
      CanonicalUiApprovalDecisionDeliverySignals,
      RouterUiApprovalDecisionDeliverySignals
    >
  >;
type _uiApprovalDeliverySignalsParity =
  Assert<
    Equal<
      CanonicalUiApprovalDecisionDeliverySignals,
      UiApprovalDecisionDeliverySignals
    >
  >;
type _routerApprovalDeliverySignalParity =
  Assert<
    Equal<
      CanonicalUiApprovalDecisionDeliverySignal,
      RouterUiApprovalDecisionDeliverySignal
    >
  >;
type _uiApprovalDeliverySignalParity =
  Assert<
    Equal<
      CanonicalUiApprovalDecisionDeliverySignal,
      UiApprovalDecisionDeliverySignal
    >
  >;
type _routerDeliveryFailureReasonParity =
  Assert<Equal<CanonicalUiDeliveryFailureReason, RouterUiDeliveryFailureReason>>;
type _uiDeliveryFailureReasonParity =
  Assert<Equal<CanonicalUiDeliveryFailureReason, UiDeliveryFailureReason>>;
type _routerDeliveryTargetReasonCodeParity =
  Assert<Equal<CanonicalUiDeliveryTargetReasonCode, RouterUiDeliveryTargetReasonCode>>;
type _uiDeliveryTargetReasonCodeParity =
  Assert<Equal<CanonicalUiDeliveryTargetReasonCode, UiDeliveryTargetReasonCode>>;
type _routerDeliveryAckReasonCodeParity =
  Assert<Equal<CanonicalUiDeliveryAckReasonCode, RouterUiDeliveryAckReasonCode>>;
type _uiDeliveryAckReasonCodeParity =
  Assert<Equal<CanonicalUiDeliveryAckReasonCode, UiDeliveryAckReasonCode>>;
type _routerReworkResultParity =
  Assert<Equal<CanonicalUiEmitRequestReworkResult, RouterUiEmitRequestReworkResult>>;
type _uiReworkResultParity =
  Assert<Equal<CanonicalUiEmitRequestReworkResult, UiEmitRequestReworkResult>>;
type _routerReworkImmediateResultParity =
  Assert<
    Equal<
      CanonicalUiEmitRequestReworkImmediateResult,
      RouterUiEmitRequestReworkImmediateResult
    >
  >;
type _uiReworkImmediateResultParity =
  Assert<
    Equal<
      CanonicalUiEmitRequestReworkImmediateResult,
      UiEmitRequestReworkImmediateResult
    >
  >;
type _routerReworkQueuedResultParity =
  Assert<
    Equal<
      CanonicalUiEmitRequestReworkQueuedResult,
      RouterUiEmitRequestReworkQueuedResult
    >
  >;
type _uiReworkQueuedResultParity =
  Assert<
    Equal<
      CanonicalUiEmitRequestReworkQueuedResult,
      UiEmitRequestReworkQueuedResult
    >
  >;
type _routerReplyResultParity =
  Assert<Equal<CanonicalUiEmitHumanReplyResult, RouterUiEmitHumanReplyResult>>;
type _uiReplyResultParity =
  Assert<Equal<CanonicalUiEmitHumanReplyResult, UiEmitHumanReplyResult>>;
type _routerCommitResultParity =
  Assert<Equal<CanonicalUiCommitBubbleResult, RouterUiCommitBubbleResult>>;
type _uiCommitResultParity =
  Assert<Equal<CanonicalUiCommitBubbleResult, UiCommitBubbleResult>>;
type _routerMergeResultParity =
  Assert<Equal<CanonicalUiMergeBubbleResult, RouterUiMergeBubbleResult>>;
type _uiMergeResultParity =
  Assert<Equal<CanonicalUiMergeBubbleResult, UiMergeBubbleResult>>;
type _routerOpenResultParity =
  Assert<Equal<CanonicalUiOpenBubbleResult, RouterUiOpenBubbleResult>>;
type _uiOpenResultParity =
  Assert<Equal<CanonicalUiOpenBubbleResult, UiOpenBubbleResult>>;
type _routerStartResultParity =
  Assert<Equal<CanonicalUiStartBubbleResult, RouterUiStartBubbleResult>>;
type _uiStartResultParity =
  Assert<Equal<CanonicalUiStartBubbleResult, UiStartBubbleResult>>;
type _routerStopResultParity =
  Assert<Equal<CanonicalUiStopBubbleResult, RouterUiStopBubbleResult>>;
type _uiStopResultParity =
  Assert<Equal<CanonicalUiStopBubbleResult, UiStopBubbleResult>>;
type _routerRestartResultParity =
  Assert<Equal<CanonicalUiRestartBubbleResult, RouterUiRestartBubbleResult>>;
type _uiRestartResultParity =
  Assert<Equal<CanonicalUiRestartBubbleResult, UiRestartBubbleResult>>;
type _routerPassValidationRecoveryMarkerPersistWarningParity =
  Assert<
    Equal<
      CanonicalUiPassValidationRecoveryMarkerPersistWarning,
      RouterUiPassValidationRecoveryMarkerPersistWarning
    >
  >;
type _uiPassValidationRecoveryMarkerPersistWarningParity =
  Assert<
    Equal<
      CanonicalUiPassValidationRecoveryMarkerPersistWarning,
      UiPassValidationRecoveryMarkerPersistWarning
    >
  >;
type _routerAttachResultParity =
  Assert<Equal<CanonicalUiAttachBubbleResult, RouterUiAttachBubbleResult>>;
type _uiAttachResultParity =
  Assert<Equal<CanonicalUiAttachBubbleResult, UiAttachBubbleResult>>;
type _routerReviewPolicyResultParity =
  Assert<
    Equal<
      CanonicalUiUpdateBubbleReviewPolicyResult,
      RouterUiUpdateBubbleReviewPolicyResult
    >
  >;
type _uiReviewPolicyResultParity =
  Assert<
    Equal<
      CanonicalUiUpdateBubbleReviewPolicyResult,
      UiUpdateBubbleReviewPolicyResult
    >
  >;
type _routerDeleteResultParity =
  Assert<Equal<CanonicalUiDeleteBubbleResult, RouterUiDeleteBubbleResult>>;
type _uiDeleteResultParity =
  Assert<Equal<CanonicalUiDeleteBubbleResult, UiDeleteBubbleResult>>;
type _apiApproveResultParity =
  Assert<
    Equal<
      Awaited<ReturnType<PairflowApiClient["approveBubble"]>>,
      CanonicalUiEmitApprovalDecisionResult
    >
  >;
type _apiRequestReworkResultParity =
  Assert<
    Equal<
      Awaited<ReturnType<PairflowApiClient["requestRework"]>>,
      CanonicalUiEmitRequestReworkResult
    >
  >;
type _apiReplyResultParity =
  Assert<
    Equal<
      Awaited<ReturnType<PairflowApiClient["replyBubble"]>>,
      CanonicalUiEmitHumanReplyResult
    >
  >;
type _apiResumeResultParity =
  Assert<
    Equal<
      Awaited<ReturnType<PairflowApiClient["resumeBubble"]>>,
      CanonicalUiEmitHumanReplyResult
    >
  >;
type _apiCommitResultParity =
  Assert<
    Equal<
      Awaited<ReturnType<PairflowApiClient["commitBubble"]>>,
      CanonicalUiCommitBubbleResult
    >
  >;
type _apiMergeResultParity =
  Assert<
    Equal<
      Awaited<ReturnType<PairflowApiClient["mergeBubble"]>>,
      CanonicalUiMergeBubbleResult
    >
  >;
type _apiOpenResultParity =
  Assert<
    Equal<
      Awaited<ReturnType<PairflowApiClient["openBubble"]>>,
      CanonicalUiOpenBubbleResult
    >
  >;
type _apiStartResultParity =
  Assert<
    Equal<
      Awaited<ReturnType<PairflowApiClient["startBubble"]>>,
      CanonicalUiStartBubbleResult
    >
  >;
type _apiStopResultParity =
  Assert<
    Equal<
      Awaited<ReturnType<PairflowApiClient["stopBubble"]>>,
      CanonicalUiStopBubbleResult
    >
  >;
type _apiRestartResultParity =
  Assert<
    Equal<
      Awaited<ReturnType<PairflowApiClient["restartBubble"]>>,
      CanonicalUiRestartBubbleResult
    >
  >;
type _apiAttachResultParity =
  Assert<
    Equal<
      Awaited<ReturnType<PairflowApiClient["attachBubble"]>>,
      CanonicalUiAttachBubbleResult
    >
  >;
type _apiUpdateReviewPolicyResultParity =
  Assert<
    Equal<
      Awaited<ReturnType<PairflowApiClient["updateReviewPolicy"]>>,
      CanonicalUiUpdateBubbleReviewPolicyResult
    >
  >;
type _apiDeleteResultParity =
  Assert<
    Equal<
      Awaited<ReturnType<PairflowApiClient["deleteBubble"]>>,
      CanonicalUiDeleteBubbleResult
    >
  >;

type _backendUiEventParity =
  Assert<Equal<CanonicalUiEvent, BackendUiEvent>>;
type _uiEventParity =
  Assert<Equal<CanonicalUiEvent, UiEvent>>;
type _backendConnectedPayloadParity =
  Assert<Equal<CanonicalUiEventsConnectedPayload, BackendUiEventsConnectedPayload>>;
type _uiConnectedPayloadParity =
  Assert<Equal<CanonicalUiEventsConnectedPayload, UiEventsConnectedPayload>>;
type _backendSnapshotParity =
  Assert<Equal<CanonicalUiSnapshotEvent, BackendUiSnapshotEvent>>;
type _uiSnapshotParity =
  Assert<Equal<CanonicalUiSnapshotEvent, UiSnapshotEvent>>;

type _backendErrorBodyParity =
  Assert<Equal<CanonicalUiApiErrorBody, BackendUiApiErrorBody>>;
type _uiErrorBodyParity =
  Assert<Equal<CanonicalUiApiErrorBody, UiApiErrorBody>>;
type _apiErrorCodeParity =
  Assert<
    Equal<
      CanonicalUiApiErrorBody["error"]["code"],
      UiApiErrorBody["error"]["code"]
    >
  >;

const canonicalLifecycleSnapshot = [...canonicalBubbleLifecycleStates] as const;
const runtimeLifecycleSnapshot = [...runtimeBubbleLifecycleStates] as const;
const uiLifecycleSnapshot = [...uiBubbleLifecycleStates] as const;

type _bubbleLifecycleValueParity =
  Assert<Equal<typeof canonicalLifecycleSnapshot, typeof runtimeLifecycleSnapshot>>;
type _uiBubbleLifecycleValueParity =
  Assert<Equal<typeof canonicalLifecycleSnapshot, typeof uiLifecycleSnapshot>>;

export {};
