import type { BubbleLifecycleState } from "./bubbleLifecycle.js";

export type UiBubbleRemoteCacheStatus = "present" | "missing" | "invalid";

export type UiBubbleStatusCacheReasonCode =
  | "STATUS_REMOTE_CACHE_WRITE_FAILED"
  | "STATUS_REMOTE_CACHE_FALLBACK_READ_FAILED"
  | "STATUS_REMOTE_CACHE_READ_FAILED";

interface UiBubbleRemoteExecutionBase {
  alias: string;
  host: string;
  pointerKind: "created" | "started";
  cacheStatus: UiBubbleRemoteCacheStatus;
  remoteClonePath?: string;
  lastCacheCheckAt?: string;
}

export interface UiBubbleListRemoteExecution
  extends UiBubbleRemoteExecutionBase {
  viewKind: "list";
  stateSource:
    | "cache"
    | "refresh"
    | "created_not_started"
    | "unavailable_started";
  refreshAttemptedAt?: string;
  runtimeAvailability?: "active" | "inactive" | "missing";
  runtimeReasonCode?: "STATUS_REMOTE_RUNTIME_MISSING";
  reasonCode?: "LIST_REMOTE_REFRESH_UNAVAILABLE" | "LIST_REMOTE_CACHE_WRITE_FAILED";
  lastLiveCheckAt?: string;
  compatLifecyclePlaceholder?: {
    state: BubbleLifecycleState;
    round?: number;
    source: "local_control_plane_compat";
  };
}

export interface UiBubbleStatusRemoteExecution
  extends UiBubbleRemoteExecutionBase {
  viewKind: "status";
  statusSource: "created_not_started" | "live";
  runtimeAvailability: "active" | "inactive" | "missing" | "not_started";
  reasonCode?: "STATUS_REMOTE_RUNTIME_MISSING";
  cacheReasonCode?: UiBubbleStatusCacheReasonCode;
  lastLiveCheckAt?: string;
}

export type UiBubbleRemoteExecution =
  | UiBubbleListRemoteExecution
  | UiBubbleStatusRemoteExecution;
