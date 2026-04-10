import {
  normalizeRepoPath,
  RepoResolutionError,
  resolveRepoPath
} from "../../v11/infrastructure/executor/workspace/repoResolution.js";
import { readRuntimeSessionsRegistry } from "../../v11/infrastructure/executor/sessionRuntime/runtimeSessionsRegistry.js";
import { readWatchdogPaneActivity } from "../../v11/defaults/watchdog/watchdogPaneActivityDefaults.js";
import { inspectStateSnapshot } from "../state/stateStore.js";

export const listCommandDefaults = {
  RepoResolutionError,
  inspectStateSnapshot,
  normalizeRepoPath,
  readRuntimeSessionsRegistry,
  readWatchdogPaneActivity,
  resolveRepoPath
} as const;
