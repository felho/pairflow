import {
  BubbleCreateError,
  createBubble as createBubbleApplication
} from "../../application/create/createBubble.js";
import type {
  BubbleCreateDependencies,
  BubbleCreateInput,
  BubbleCreateResult
} from "../../application/create/createBubble.js";
import { createBubbleDependencyDefaults } from "./createBubbleDefaults.js";

export { BubbleCreateError };

export async function createBubble(
  input: BubbleCreateInput,
  dependencies: BubbleCreateDependencies = {}
): Promise<BubbleCreateResult> {
  return createBubbleApplication(input, {
    ...createBubbleDependencyDefaults,
    ...dependencies
  });
}
