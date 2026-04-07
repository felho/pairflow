import { readRuntimeSessionsRegistry } from "../executor/sessionRuntime/runtimeSessionsRegistry.js";
import { runTmux } from "../channel/tmux/tmuxManager.js";
import {
  asBubbleWatchdogErrorV11,
  BubbleWatchdogErrorV11,
  runBubbleWatchdogV11 as runBubbleWatchdogWithDependenciesV11,
  type BubbleWatchdogV11Dependencies,
  type BubbleWatchdogV11Input,
  type BubbleWatchdogV11NoopReason,
  type BubbleWatchdogV11Result
} from "../../application/watchdog/emitWatchdogV11.js";

export {
  asBubbleWatchdogErrorV11,
  BubbleWatchdogErrorV11
};

export async function runBubbleWatchdogV11(
  input: BubbleWatchdogV11Input,
  dependencies: BubbleWatchdogV11Dependencies = {}
): Promise<BubbleWatchdogV11Result> {
  return runBubbleWatchdogWithDependenciesV11(input, {
    ...dependencies,
    readRuntimeSessionsRegistry:
      dependencies.readRuntimeSessionsRegistry ?? readRuntimeSessionsRegistry,
    runTmux: dependencies.runTmux ?? runTmux
  });
}

export type {
  BubbleWatchdogV11Dependencies,
  BubbleWatchdogV11Input,
  BubbleWatchdogV11NoopReason,
  BubbleWatchdogV11Result
};
