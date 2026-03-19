import type { BubbleConfig } from "../../../types/bubble.js";

export interface BuildKickoffIdeationConfigInput {
  bubbleConfig: BubbleConfig;
  nowIso: string;
}

export function buildKickoffIdeationConfig(
  input: BuildKickoffIdeationConfigInput
): BubbleConfig {
  return {
    ...input.bubbleConfig,
    ideation: {
      mode: true,
      task_pending: false,
      ...(input.bubbleConfig.ideation?.started_at !== undefined
        ? { started_at: input.bubbleConfig.ideation.started_at }
        : {}),
      kicked_off_at: input.nowIso
    }
  };
}
