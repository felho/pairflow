import type { NormalizedMergeBubbleInput } from "../../shared/merge/mergeCommandInputNormalization.js";

export interface RunMergeFlowInput extends NormalizedMergeBubbleInput {
  createError: PairflowCreateCommandError;
}
