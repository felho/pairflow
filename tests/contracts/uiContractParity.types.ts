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

const canonicalLifecycleSnapshot = [...canonicalBubbleLifecycleStates] as const;
const runtimeLifecycleSnapshot = [...runtimeBubbleLifecycleStates] as const;
const uiLifecycleSnapshot = [...uiBubbleLifecycleStates] as const;

type _bubbleLifecycleValueParity =
  Assert<Equal<typeof canonicalLifecycleSnapshot, typeof runtimeLifecycleSnapshot>>;
type _uiBubbleLifecycleValueParity =
  Assert<Equal<typeof canonicalLifecycleSnapshot, typeof uiLifecycleSnapshot>>;

export {};
