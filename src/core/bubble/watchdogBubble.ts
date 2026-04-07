import { runTmux } from "../../v11/infrastructure/channel/tmux/tmuxManager.js";
import { readRuntimeSessionsRegistry } from "../../v11/infrastructure/executor/sessionRuntime/runtimeSessionsRegistry.js";
import {
  asBubbleWatchdogErrorV11,
  BubbleWatchdogErrorV11,
  runBubbleWatchdogV11 as runBubbleWatchdogWithDependencies
} from "../../v11/application/watchdog/emitWatchdogV11.js";
import type {
  BubbleWatchdogV11Dependencies as BubbleWatchdogDependencies,
  BubbleWatchdogV11Input as BubbleWatchdogInput,
  BubbleWatchdogV11NoopReason as BubbleWatchdogNoopReason,
  BubbleWatchdogV11Result as BubbleWatchdogResult
} from "../../v11/application/watchdog/emitWatchdogV11.js";

export {
  asBubbleWatchdogErrorV11 as asBubbleWatchdogError,
  BubbleWatchdogErrorV11 as BubbleWatchdogError
};

export async function runBubbleWatchdog(
  input: BubbleWatchdogInput,
  dependencies: BubbleWatchdogDependencies = {}
): Promise<BubbleWatchdogResult> {
  return runBubbleWatchdogWithDependencies(input, {
    ...dependencies,
    readRuntimeSessionsRegistry:
      dependencies.readRuntimeSessionsRegistry ?? readRuntimeSessionsRegistry,
    runTmux: dependencies.runTmux ?? runTmux
  });
}

export type {
  BubbleWatchdogDependencies,
  BubbleWatchdogInput,
  BubbleWatchdogNoopReason,
  BubbleWatchdogResult
};
