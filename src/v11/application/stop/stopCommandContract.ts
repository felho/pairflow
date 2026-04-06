import type {
  removeRuntimeSession
} from "../../infrastructure/executor/sessionRuntime/runtimeSessionsRegistry.js";
import type {
  terminateBubbleTmuxSession
} from "../../infrastructure/channel/tmux/tmuxManager.js";
import type { BubbleStateSnapshot } from "../../../types/bubble.js";

export interface StopBubbleInput {
  bubbleId: string;
  repoPath?: string | undefined;
  cwd?: string | undefined;
  now?: Date | undefined;
}

export interface StopBubbleResult {
  bubbleId: string;
  state: BubbleStateSnapshot;
  tmuxSessionName: string;
  tmuxSessionExisted: boolean;
  runtimeSessionRemoved: boolean;
}

export interface StopBubbleDependencies {
  terminateBubbleTmuxSession?: typeof terminateBubbleTmuxSession;
  removeRuntimeSession?: typeof removeRuntimeSession;
}
