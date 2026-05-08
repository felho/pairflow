import type { BubbleLifecycleState } from "../../../contracts/kernel/lifecycle.js";

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
