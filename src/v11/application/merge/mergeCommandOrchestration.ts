import type {
  MergeBubbleDependencies,
  MergeBubbleInput,
  MergeBubbleResult
} from "./mergeCommandContract.js";
import {
  BubbleMergeError,
  createBubbleMergeError,
  throwAsBubbleMergeError
} from "../../shared/merge/mergeCommandErrorRuntime.js";
import { normalizeMergeBubbleInput } from "../../shared/merge/mergeCommandInputNormalization.js";
import { resolveMergeCommandDependencies } from "../../shared/merge/mergeCommandDependencyResolution.js";
import { runMergeFlow } from "./runMergeFlow.js";

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
