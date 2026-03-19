import type { KickoffBubbleResultShape } from "./kickoffResultBuilders.js";

export interface RunKickoffFlowInput {
  bubbleId: string;
  repoPath?: string;
  task?: string;
  taskFile?: string;
  cwd?: string;
  now: Date;
  nowIso: string;
}

export type RunKickoffFlowResult = KickoffBubbleResultShape;
