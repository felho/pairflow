import {
  asStartBubbleErrorV11,
  StartBubbleErrorV11,
  startBubbleV11
} from "../../v11/application/start/emitStartV11.js";

export const asStartBubbleError = asStartBubbleErrorV11;
export const StartBubbleError = StartBubbleErrorV11;
export type {
  StartBubbleV11Dependencies as StartBubbleDependencies,
  StartBubbleV11Input as StartBubbleInput,
  StartBubbleV11Result as StartBubbleResult
} from "../../v11/application/start/emitStartV11.js";

export { startBubbleV11 as startBubble };
export { startBubbleV11 };
