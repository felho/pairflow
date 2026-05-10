import {
  createBubble as createBubbleImplementation
} from "./internal/runtime/createBubble.js";
import { BubbleCreateError } from "./internal/runtime/createCommandRuntime.js";
import type {
  BubbleCreateDependencies,
  BubbleCreateInput,
  BubbleCreateResult,
  CreateBubbleImplementation,
  ResolvedTaskInput
} from "./internal/runtime/createCommandContract.js";

export { BubbleCreateError };
export type {
  BubbleCreateDependencies,
  BubbleCreateInput,
  BubbleCreateResult,
  CreateBubbleImplementation,
  ResolvedTaskInput
};

export async function createBubble(
  input: BubbleCreateInput,
  dependencies: BubbleCreateDependencies = {}
): Promise<BubbleCreateResult> {
  return createBubbleImplementation(input, dependencies);
}
