import type { BubbleConfig } from "../shared/config/bubbleConfigTypes.js";
import type { BubblePaths } from "../shared/bubble/bubblePaths.js";

export interface ResolvedBubbleById {
  bubbleId: string;
  bubbleToml?: string | undefined;
  bubbleConfig: BubbleConfig;
  bubblePaths: BubblePaths;
  repoPath: string;
}

export interface ResolveBubbleByIdInput {
  bubbleId: string;
  repoPath?: string;
  cwd?: string;
}

export type ResolveBubbleByIdPort = (
  input: ResolveBubbleByIdInput
) => Promise<ResolvedBubbleById>;
