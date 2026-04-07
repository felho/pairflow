import type { BubbleConfig } from "../../../types/bubble.js";

export interface EnsureBubbleInstanceIdForMutationResult {
  bubbleInstanceId: string;
  bubbleConfig: BubbleConfig;
  backfilled: boolean;
}
