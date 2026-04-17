/* eslint-disable @typescript-eslint/no-unused-vars */

import type {
  BubbleLifecycleState as BackendBubbleLifecycleState
} from "../../src/shared/contracts/bubbleLifecycle.js";
import {
  bubbleLifecycleStates as backendBubbleLifecycleStates
} from "../../src/shared/contracts/bubbleLifecycle.js";
import type {
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
  BubbleLifecycleState as UiBubbleLifecycleState
} from "../../ui/src/lib/contracts/bubbleLifecycle.js";
import {
  bubbleLifecycleStates as uiBubbleLifecycleStates
} from "../../ui/src/lib/contracts/bubbleLifecycle.js";
import type {
  StateValidationDiagnostics as UiStateValidationDiagnostics
} from "../../ui/src/lib/contracts/stateValidation.js";
import type {
  UiBubbleListRemoteExecution as UiBubbleListRemoteExecution,
  UiBubbleRemoteCacheStatus as UiBubbleRemoteCacheStatus,
  UiBubbleRemoteExecution as UiBubbleRemoteExecution,
  UiBubbleStatusCacheReasonCode as UiBubbleStatusCacheReasonCode,
  UiBubbleStatusRemoteExecution as UiBubbleStatusRemoteExecution
} from "../../ui/src/lib/contracts/uiRemoteExecution.js";

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
  Assert<Equal<BackendBubbleLifecycleState, UiBubbleLifecycleState>>;
type _stateValidationParity =
  Assert<Equal<BackendStateValidationDiagnostics, UiStateValidationDiagnostics>>;
type _remoteCacheStatusParity =
  Assert<Equal<BackendUiBubbleRemoteCacheStatus, UiBubbleRemoteCacheStatus>>;
type _statusCacheReasonParity =
  Assert<Equal<BackendUiBubbleStatusCacheReasonCode, UiBubbleStatusCacheReasonCode>>;
type _listRemoteExecutionParity =
  Assert<Equal<BackendUiBubbleListRemoteExecution, UiBubbleListRemoteExecution>>;
type _statusRemoteExecutionParity =
  Assert<Equal<BackendUiBubbleStatusRemoteExecution, UiBubbleStatusRemoteExecution>>;
type _remoteExecutionParity =
  Assert<Equal<BackendUiBubbleRemoteExecution, UiBubbleRemoteExecution>>;

const backendLifecycleSnapshot = [...backendBubbleLifecycleStates] as const;
const uiLifecycleSnapshot = [...uiBubbleLifecycleStates] as const;

type _bubbleLifecycleValueParity =
  Assert<Equal<typeof backendLifecycleSnapshot, typeof uiLifecycleSnapshot>>;

export {};
