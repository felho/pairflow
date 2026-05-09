import type { BubbleListEntry } from "../../../../shared/read-model/list/listReadModelContract.js";

export interface BubbleBuildResult {
  entry: BubbleListEntry;
  hasRuntimeSession: boolean;
  invalidState: boolean;
  nonRuntimeState: boolean;
  createdNotStarted: number;
  unavailableStarted: number;
}

export interface RemoteRefreshFailureMetadata {
  reasonCode: "LIST_REMOTE_REFRESH_UNAVAILABLE" | "LIST_REMOTE_CACHE_WRITE_FAILED";
  refreshAttemptedAt: string;
}
