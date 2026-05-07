import {
  asBubbleStatusError,
  BubbleStatusError,
  getBubbleStatus
} from "./statusCommandApi.js";
import type {
  BubbleStatusInput,
  BubbleStatusDependencies,
  BubbleStatusView
} from "./statusCommandApi.js";
export type {
  BubbleStatusInput as BubbleStatusV11Input,
  BubbleStatusDependencies as BubbleStatusV11Dependencies,
  BubbleStatusView as BubbleStatusV11View
} from "./statusCommandApi.js";

export async function getBubbleStatusV11(
  input: BubbleStatusInput,
  dependencies: BubbleStatusDependencies
): Promise<BubbleStatusView> {
  return getBubbleStatus(input, dependencies);
}

export {
  asBubbleStatusError as asBubbleStatusErrorV11,
  BubbleStatusError as BubbleStatusErrorV11
};
