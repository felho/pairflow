import {
  normalizeRepoPath,
  RepoResolutionError,
  resolveRepoPath
} from "../../infrastructure/executor/workspace/repoResolution.js";
import {
  listBubbleIds,
  readBubbleTomlArtifact
} from "../../infrastructure/executor/workspace/listBubbleWorkspace.js";
import { readRuntimeSessionsRegistry } from "../runtimeSessions/runtimeSessionsDefaults.js";
import { readWatchdogPaneActivity } from "../watchdog/watchdogPaneActivityDefaults.js";
import { inspectStateSnapshot } from "../state/stateStoreDefaults.js";

export const listCommandDefaults = {
  RepoResolutionError,
  inspectStateSnapshot,
  listBubbleIds,
  normalizeRepoPath,
  readBubbleTomlArtifact,
  readRuntimeSessionsRegistry,
  readWatchdogPaneActivity,
  resolveRepoPath
} as const;
