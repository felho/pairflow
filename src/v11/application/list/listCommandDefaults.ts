import { inspectStateSnapshot } from "../../infrastructure/state/stateStore.js";
import {
  normalizeRepoPath,
  RepoResolutionError,
  resolveRepoPath
} from "../../infrastructure/executor/workspace/repoResolution.js";
import { readRuntimeSessionsRegistry } from "../../infrastructure/executor/sessionRuntime/runtimeSessionsRegistry.js";
import { readWatchdogPaneActivity } from "../../infrastructure/artifact/watchdog/watchdogPaneActivityStore.js";

export const listCommandDefaults = {
  RepoResolutionError,
  inspectStateSnapshot,
  normalizeRepoPath,
  readRuntimeSessionsRegistry,
  readWatchdogPaneActivity,
  resolveRepoPath
} as const;
