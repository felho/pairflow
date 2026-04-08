import {
  asStartBubbleError,
  StartBubbleError,
  startBubble
} from "./startCommandApi.js";
import type {
  StartBubbleDependencies,
  StartBubbleInput,
  StartBubbleResult
} from "./startCommandContract.js";

export {
  asStartBubbleError as asStartBubbleErrorV11,
  StartBubbleError as StartBubbleErrorV11
};

export async function startBubbleV11(
  input: StartBubbleInput,
  dependencies: StartBubbleDependencies = {}
): Promise<StartBubbleResult> {
  return startBubble(input, dependencies);
}

export type {
  StartBubbleDependencies as StartBubbleV11Dependencies,
  StartBubbleInput as StartBubbleV11Input,
  StartBubbleResult as StartBubbleV11Result
} from "./startCommandContract.js";
