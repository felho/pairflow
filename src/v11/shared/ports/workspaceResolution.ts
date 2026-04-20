import type { BubbleConfig } from "../../../types/bubble.js";
import type { BubblePaths } from "../bubble/bubblePaths.js";

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
