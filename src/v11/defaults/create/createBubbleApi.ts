import {
  createBubble as createBubbleApplication,
  extractReviewerFocus
} from "../../application/create/createBubble.js";
import { BubbleCreateError } from "../../application/create/createCommandRuntime.js";
import type {
  BubbleCreateDependencies,
  BubbleCreateInput,
  BubbleCreateResult
} from "../../application/create/createCommandContract.js";
import { createBubbleDependencyDefaults } from "./createBubbleDefaults.js";

export { BubbleCreateError, extractReviewerFocus };

export async function createBubble(
  input: BubbleCreateInput,
  dependencies: BubbleCreateDependencies = {}
): Promise<BubbleCreateResult> {
  return createBubbleApplication(input, {
    ...createBubbleDependencyDefaults,
    ...dependencies
  });
}

