import type {
  BubbleLifecycleState
} from "../../domain/state/lifecycleTypes.js";

export interface BubbleRemoteStateCache {
  lastCheckedAt: string;
  state: BubbleLifecycleState;
  round: number;
  maxRounds: number;
  metaReview?: {
    consecutiveCleanRuns: number;
  };
  implementerStatus?: string;
  reviewerStatus?: string;
}
