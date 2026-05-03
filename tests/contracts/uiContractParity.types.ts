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
  UiCommitBubbleInput as CanonicalUiCommitBubbleInput,
  UiCommitBubbleResult as CanonicalUiCommitBubbleResult,
  UiDeleteBubbleResult as CanonicalUiDeleteBubbleResult,
  UiApprovalDecisionDeliverySignal as CanonicalUiApprovalDecisionDeliverySignal,
  UiApprovalDecisionDeliverySignals as CanonicalUiApprovalDecisionDeliverySignals,
  UiDeliveryAckReasonCode as CanonicalUiDeliveryAckReasonCode,
  UiDeliveryFailureReason as CanonicalUiDeliveryFailureReason,
  UiDeliveryTargetReasonCode as CanonicalUiDeliveryTargetReasonCode,
  UiEmitApprovalDecisionResult as CanonicalUiEmitApprovalDecisionResult,
  UiEmitApproveInput as CanonicalUiEmitApproveInput,
  UiEmitHumanReplyResult as CanonicalUiEmitHumanReplyResult,
  UiEmitRequestReworkInput as CanonicalUiEmitRequestReworkInput,
  UiEmitRequestReworkResult as CanonicalUiEmitRequestReworkResult,
  UiAttachBubbleResult as CanonicalUiAttachBubbleResult,
  UiMergeBubbleInput as CanonicalUiMergeBubbleInput,
  UiMergeBubbleResult as CanonicalUiMergeBubbleResult,
  UiOpenBubbleResult as CanonicalUiOpenBubbleResult,
  UiRestartBubbleResult as CanonicalUiRestartBubbleResult,
  UiStartBubbleResult as CanonicalUiStartBubbleResult,
  UiStopBubbleResult as CanonicalUiStopBubbleResult,
  UiUpdateBubbleReviewPolicyInput as CanonicalUiUpdateBubbleReviewPolicyInput,
  UiUpdateBubbleReviewPolicyResult as CanonicalUiUpdateBubbleReviewPolicyResult
} from "../../src/contracts/ui/uiActions.js";
import type {
  UiBubbleDetail as CanonicalUiBubbleDetail,
  UiBubbleInboxItem as CanonicalUiBubbleInboxItem,
  UiBubbleMetaReviewSummary as CanonicalUiBubbleMetaReviewSummary,
  UiBubbleReviewPolicy as CanonicalUiBubbleReviewPolicy,
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
  UiCommitBubbleInput as RouterUiCommitBubbleInput,
  UiCommitBubbleResult as RouterUiCommitBubbleResult,
  UiDeleteBubbleResult as RouterUiDeleteBubbleResult,
  UiEmitApprovalDecisionResult as RouterUiEmitApprovalDecisionResult,
  UiEmitApproveInput as RouterUiEmitApproveInput,
  UiEmitHumanReplyResult as RouterUiEmitHumanReplyResult,
  UiEmitRequestReworkInput as RouterUiEmitRequestReworkInput,
  UiEmitRequestReworkResult as RouterUiEmitRequestReworkResult,
  UiAttachBubbleResult as RouterUiAttachBubbleResult,
  UiMergeBubbleInput as RouterUiMergeBubbleInput,
  UiMergeBubbleResult as RouterUiMergeBubbleResult,
  UiOpenBubbleResult as RouterUiOpenBubbleResult,
  UiRestartBubbleResult as RouterUiRestartBubbleResult,
  UiStartBubbleResult as RouterUiStartBubbleResult,
  UiStopBubbleResult as RouterUiStopBubbleResult,
  UiUpdateBubbleReviewPolicyInput as RouterUiUpdateBubbleReviewPolicyInput,
  UiUpdateBubbleReviewPolicyResult as RouterUiUpdateBubbleReviewPolicyResult
} from "../../src/v11/shared/ports/uiRouter.js";
import type {
  UiApiErrorBody as BackendUiApiErrorBody,
  UiBubbleDetail as BackendUiBubbleDetail,
  UiBubbleReviewPolicy as BackendUiBubbleReviewPolicy,
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
  UiCommitBubbleInput as UiCommitBubbleInput,
  UiCommitBubbleResult as UiCommitBubbleResult,
  UiDeleteBubbleResult as UiDeleteBubbleResult,
  UiApprovalDecisionDeliverySignal as UiApprovalDecisionDeliverySignal,
  UiApprovalDecisionDeliverySignals as UiApprovalDecisionDeliverySignals,
  UiDeliveryAckReasonCode as UiDeliveryAckReasonCode,
  UiDeliveryFailureReason as UiDeliveryFailureReason,
  UiDeliveryTargetReasonCode as UiDeliveryTargetReasonCode,
  UiEmitApprovalDecisionResult as UiEmitApprovalDecisionResult,
  UiEmitApproveInput as UiEmitApproveInput,
  UiEmitHumanReplyResult as UiEmitHumanReplyResult,
  UiEmitRequestReworkInput as UiEmitRequestReworkInput,
  UiEmitRequestReworkResult as UiEmitRequestReworkResult,
  UiAttachBubbleResult as UiAttachBubbleResult,
  UiMergeBubbleInput as UiMergeBubbleInput,
  UiMergeBubbleResult as UiMergeBubbleResult,
  UiOpenBubbleResult as UiOpenBubbleResult,
  UiRestartBubbleResult as UiRestartBubbleResult,
  UiStartBubbleResult as UiStartBubbleResult,
  UiStopBubbleResult as UiStopBubbleResult,
  UiUpdateBubbleReviewPolicyInput as UiUpdateBubbleReviewPolicyInput,
  UiUpdateBubbleReviewPolicyResult as UiUpdateBubbleReviewPolicyResult
} from "../../ui/src/lib/contracts/uiActions.js";
import type {
  UiBubbleDetail as UiBubbleDetail,
  UiBubbleInboxItem as UiBubbleInboxItem,
  UiBubbleReviewPolicy as UiBubbleReviewPolicy,
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
type _backendBubbleSummaryParity =
  Assert<Equal<CanonicalUiBubbleSummary, BackendUiBubbleSummary>>;
type _uiBubbleSummaryParity =
  Assert<Equal<CanonicalUiBubbleSummary, UiBubbleSummary>>;
type _backendBubbleDetailParity =
  Assert<Equal<CanonicalUiBubbleDetail, BackendUiBubbleDetail>>;
type _uiBubbleDetailParity =
  Assert<Equal<CanonicalUiBubbleDetail, UiBubbleDetail>>;
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

type _routerApproveInputParity =
  Assert<Equal<CanonicalUiEmitApproveInput, RouterUiEmitApproveInput>>;
type _uiApproveInputParity =
  Assert<Equal<CanonicalUiEmitApproveInput, UiEmitApproveInput>>;
type _routerReworkInputParity =
  Assert<Equal<CanonicalUiEmitRequestReworkInput, RouterUiEmitRequestReworkInput>>;
type _uiReworkInputParity =
  Assert<Equal<CanonicalUiEmitRequestReworkInput, UiEmitRequestReworkInput>>;
type _routerCommitInputParity =
  Assert<Equal<CanonicalUiCommitBubbleInput, RouterUiCommitBubbleInput>>;
type _uiCommitInputParity =
  Assert<Equal<CanonicalUiCommitBubbleInput, UiCommitBubbleInput>>;
type _routerMergeInputParity =
  Assert<Equal<CanonicalUiMergeBubbleInput, RouterUiMergeBubbleInput>>;
type _uiMergeInputParity =
  Assert<Equal<CanonicalUiMergeBubbleInput, UiMergeBubbleInput>>;
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
type _routerApprovalResultParity =
  Assert<
    Equal<
      CanonicalUiEmitApprovalDecisionResult,
      RouterUiEmitApprovalDecisionResult
    >
  >;
type _uiApprovalResultParity =
  Assert<Equal<CanonicalUiEmitApprovalDecisionResult, UiEmitApprovalDecisionResult>>;
type _uiApprovalDeliverySignalsParity =
  Assert<
    Equal<
      CanonicalUiApprovalDecisionDeliverySignals,
      UiApprovalDecisionDeliverySignals
    >
  >;
type _uiApprovalDeliverySignalParity =
  Assert<
    Equal<
      CanonicalUiApprovalDecisionDeliverySignal,
      UiApprovalDecisionDeliverySignal
    >
  >;
type _uiDeliveryFailureReasonParity =
  Assert<Equal<CanonicalUiDeliveryFailureReason, UiDeliveryFailureReason>>;
type _uiDeliveryTargetReasonCodeParity =
  Assert<Equal<CanonicalUiDeliveryTargetReasonCode, UiDeliveryTargetReasonCode>>;
type _uiDeliveryAckReasonCodeParity =
  Assert<Equal<CanonicalUiDeliveryAckReasonCode, UiDeliveryAckReasonCode>>;
type _routerReworkResultParity =
  Assert<Equal<CanonicalUiEmitRequestReworkResult, RouterUiEmitRequestReworkResult>>;
type _uiReworkResultParity =
  Assert<Equal<CanonicalUiEmitRequestReworkResult, UiEmitRequestReworkResult>>;
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
