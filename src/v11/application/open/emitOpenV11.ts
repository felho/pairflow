import type {
  OpenBubbleDependencies,
  OpenBubbleInput,
  OpenBubbleResult
} from "../../../core/bubble/openBubble.js";

export {
  asOpenBubbleError,
  asOpenBubbleError as asOpenBubbleErrorV11,
  executeOpenCommand,
  OpenBubbleError,
  OpenBubbleError as OpenBubbleErrorV11,
  openBubble,
  openBubble as openBubbleV11
} from "../../../core/bubble/openBubble.js";
export type {
  OpenBubbleDependencies,
  OpenBubbleInput,
  OpenBubbleResult,
  OpenCommandExecutionInput,
  OpenCommandExecutionResult,
  OpenCommandExecutor
} from "../../../core/bubble/openBubble.js";
export type OpenBubbleV11Input = OpenBubbleInput;
export type OpenBubbleV11Result = OpenBubbleResult;
export type OpenBubbleV11Dependencies = OpenBubbleDependencies;
