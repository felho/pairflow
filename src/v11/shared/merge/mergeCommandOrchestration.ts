import type {
  MergeBubbleDependencies,
  MergeBubbleInput,
  MergeBubbleResult
} from "../../application/merge/mergeCommandContract.js";
import {
  BubbleMergeError,
  createBubbleMergeError,
  throwAsBubbleMergeError
} from "./mergeCommandErrorRuntime.js";
import { normalizeMergeBubbleInput } from "./mergeCommandInputNormalization.js";
import { resolveMergeCommandDependencies } from "./mergeCommandDependencyResolution.js";
import { runMergeFlow } from "../../application/merge/runMergeFlow.js";

export async function mergeBubbleCommandOrchestration(
  input: MergeBubbleInput,
  dependencies: MergeBubbleDependencies = {}
): Promise<MergeBubbleResult> {
  const normalized = normalizeMergeBubbleInput(input, createBubbleMergeError);
  const resolvedDependencies = resolveMergeCommandDependencies(dependencies);
  return runMergeFlow(
    {
      ...normalized,
      createError: createBubbleMergeError
    },
    resolvedDependencies
  );
}

export {
  BubbleMergeError,
  throwAsBubbleMergeError
};
