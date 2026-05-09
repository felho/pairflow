import type {
  MergeBubbleDependencies,
  MergeBubbleInput,
  MergeBubbleResult
} from "./mergeCommandContract.js";
import {
  BubbleMergeError,
  createBubbleMergeError
} from "./mergeCommandErrorRuntime.js";
import { throwAsBubbleMergeError } from "./mergeCommandErrorClassification.js";
import { normalizeMergeBubbleInput } from "./mergeCommandInputNormalization.js";
import { resolveMergeCommandDependencies } from "./mergeCommandDependencyResolution.js";
import {
  runMergeCommandPipeline
} from "./internal/pipeline/mergeCommandPipeline.js";

export async function mergeBubbleCommandOrchestration(
  input: MergeBubbleInput,
  dependencies: MergeBubbleDependencies = {}
): Promise<MergeBubbleResult> {
  try {
    const normalized = normalizeMergeBubbleInput(input, createBubbleMergeError);
    const resolvedDependencies = resolveMergeCommandDependencies(
      dependencies,
      dependencies as Required<MergeBubbleDependencies>
    );
    return await runMergeCommandPipeline(
      {
        ...normalized,
        createError: createBubbleMergeError
      },
      resolvedDependencies
    );
  } catch (error) {
    return throwAsBubbleMergeError(error);
  }
}

export {
  BubbleMergeError,
  throwAsBubbleMergeError
};

export type {
  MergeBubbleDependencies,
  MergeBubbleInput,
  MergeBubbleResult
} from "./mergeCommandContract.js";
