import {
  normalizeRepoPath,
  RepoResolutionError,
  resolveRepoPath
} from "../../v11/infrastructure/executor/workspace/repoResolution.js";
import { inspectStateSnapshot } from "../state/stateStore.js";
import { readRuntimeSessionsRegistry } from "../runtime/sessionsRegistry.js";
import { readWatchdogPaneActivity } from "../watchdog/watchdogPaneActivityStore.js";

export const listCommandDefaults = {
  RepoResolutionError,
  inspectStateSnapshot,
  normalizeRepoPath,
  readRuntimeSessionsRegistry,
  readWatchdogPaneActivity,
  resolveRepoPath
} as const;
