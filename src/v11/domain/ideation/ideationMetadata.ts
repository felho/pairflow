import type { BubbleConfig } from "../../../types/bubble.js";

export interface ResolvedIdeationMetadata {
  mode: boolean;
  taskPending: boolean;
  parseWarning?: string;
}

export function resolveIdeationMetadata(
  bubbleConfig: BubbleConfig
): ResolvedIdeationMetadata {
  const ideationConfig = bubbleConfig.ideation;
  if (ideationConfig === undefined) {
    return {
      mode: false,
      taskPending: false
    };
  }

  return {
    mode: ideationConfig.mode === true,
    taskPending: ideationConfig.task_pending === true,
    ...(ideationConfig.parse_warning !== undefined
      ? { parseWarning: ideationConfig.parse_warning }
      : {})
  };
}

export function hasIdeationMetadataParseWarning(
  bubbleConfig: BubbleConfig
): boolean {
  const warning = resolveIdeationMetadata(bubbleConfig).parseWarning;
  return typeof warning === "string" && warning.trim().length > 0;
}
