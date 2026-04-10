import {
  normalizeRepoPath,
  RepoResolutionError,
  resolveRepoPath
} from "../../infrastructure/executor/workspace/repoResolution.js";
import { readRuntimeSessionsRegistry } from "../runtimeSessions/runtimeSessionsDefaults.js";
import { readWatchdogPaneActivity } from "../watchdog/watchdogPaneActivityDefaults.js";
import { inspectStateSnapshot } from "../state/stateStoreDefaults.js";

export const listCommandDefaults = {
  RepoResolutionError,
  inspectStateSnapshot,
  normalizeRepoPath,
  readRuntimeSessionsRegistry,
  readWatchdogPaneActivity,
  resolveRepoPath
} as const;
