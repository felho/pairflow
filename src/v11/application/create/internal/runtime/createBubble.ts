import { BubbleCreateError } from "./createCommandRuntime.js";
import { runCreateCommandPipeline } from "./runCreateCommandPipeline.js";
import type {
  BubbleCreateDependencies,
  BubbleCreateInput,
  BubbleCreateResult
} from "./createCommandContract.js";

export { BubbleCreateError };

export async function createBubble(
  input: BubbleCreateInput,
  dependencies: BubbleCreateDependencies = {}
): Promise<BubbleCreateResult> {
  return runCreateCommandPipeline(input, dependencies);
}
