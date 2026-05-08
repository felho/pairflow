import type { BubbleConfig } from "../shared/config/bubbleConfigTypes.js";
import type { BubblePaths } from "../shared/bubble/bubblePaths.js";

export interface ResolvedBubbleWorkspace {
  bubbleId: string;
  bubbleConfig: BubbleConfig;
  bubblePaths: BubblePaths;
  repoPath: string;
  worktreePath: string;
  cwd: string;
}

export type ResolveBubbleFromWorkspaceCwdPort = (
  cwdInput?: string
) => Promise<ResolvedBubbleWorkspace>;
