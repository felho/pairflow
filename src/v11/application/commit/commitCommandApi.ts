import type {
  CommitBubbleInput,
  CommitBubbleResult
} from "./commitCommandContract.js";
import { throwAsBubbleCommitError } from "./commitCommandRuntime.js";
import type {
  CommitBubbleDependencies
} from "./commitCommandApiContract.js";
import { runCommitCommandPipeline } from "./internal/pipeline/commitCommandPipeline.js";

export { BubbleCommitError } from "./commitCommandRuntime.js";
export type {
  CommitBubbleInput,
  CommitBubbleResult
} from "./commitCommandContract.js";

export async function commitBubble(
  input: CommitBubbleInput,
  dependencies: CommitBubbleDependencies
): Promise<CommitBubbleResult> {
  try {
    return await runCommitCommandPipeline(input, dependencies);
  } catch (error) {
    return throwAsBubbleCommitError(error);
  }
}

export function asBubbleCommitError(error: unknown): never {
  return throwAsBubbleCommitError(error);
}
