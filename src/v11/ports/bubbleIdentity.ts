import type { BubbleConfig } from "../../types/bubble.js";
import type { BubblePaths } from "../shared/bubble/bubblePaths.js";

export interface EnsureBubbleInstanceIdForMutationInput {
  bubbleId: string;
  repoPath: string;
  bubblePaths: BubblePaths;
  bubbleConfig: BubbleConfig;
  now?: Date;
}

export interface EnsureBubbleInstanceIdForMutationResult {
  bubbleInstanceId: string;
  bubbleConfig: BubbleConfig;
  backfilled: boolean;
}

export type EnsureBubbleInstanceIdForMutationPort = (
  input: EnsureBubbleInstanceIdForMutationInput
) => Promise<EnsureBubbleInstanceIdForMutationResult>;
