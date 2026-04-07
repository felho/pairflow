import { readRuntimeSessionsRegistry } from "../../infrastructure/executor/sessionRuntime/runtimeSessionsRegistry.js";
import { runTmux } from "../../infrastructure/channel/tmux/tmuxManager.js";
import { runBubbleWatchdog } from "../../shared/watchdog/watchdogCommandApi.js";
import type {
  BubbleWatchdogDependencies,
  BubbleWatchdogInput,
  BubbleWatchdogResult
} from "./watchdogCommandContract.js";

export {
  asBubbleWatchdogError as asBubbleWatchdogErrorV11,
  BubbleWatchdogError as BubbleWatchdogErrorV11
} from "../../shared/watchdog/watchdogCommandApi.js";

export async function runBubbleWatchdogV11(
  input: BubbleWatchdogInput,
  dependencies: BubbleWatchdogDependencies = {}
): Promise<BubbleWatchdogResult> {
  return runBubbleWatchdog(input, {
    ...dependencies,
    readRuntimeSessionsRegistry:
      dependencies.readRuntimeSessionsRegistry ?? readRuntimeSessionsRegistry,
    runTmux: dependencies.runTmux ?? runTmux
  });
}

export type {
  BubbleWatchdogDependencies as BubbleWatchdogV11Dependencies,
  BubbleWatchdogInput as BubbleWatchdogV11Input,
  BubbleWatchdogNoopReason as BubbleWatchdogV11NoopReason,
  BubbleWatchdogResult as BubbleWatchdogV11Result
} from "./watchdogCommandContract.js";
