import type { NormalizedMergeBubbleInput } from "./mergeCommandInputNormalization.js";

export interface RunMergeFlowInput extends NormalizedMergeBubbleInput {
  createError: PairflowCreateCommandError;
}
