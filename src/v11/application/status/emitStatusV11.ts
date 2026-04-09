import {
  asBubbleStatusError,
  BubbleStatusError,
  getBubbleStatus
} from "../../shared/status/statusCommandApi.js";
import type {
  BubbleStatusInput,
  BubbleStatusView
} from "../../shared/status/statusCommandApi.js";
import { readWatchdogPaneActivity } from "./statusCommandDefaults.js";
export type {
  BubbleStatusInput as BubbleStatusV11Input,
  BubbleStatusView as BubbleStatusV11View
} from "./statusCommandContract.js";

export async function getBubbleStatusV11(
  input: BubbleStatusInput
): Promise<BubbleStatusView> {
  return getBubbleStatus(input, {
    readWatchdogPaneActivity
  });
}

export {
  asBubbleStatusError as asBubbleStatusErrorV11,
  BubbleStatusError as BubbleStatusErrorV11
};
