import { loadPairflowGlobalConfig } from "../../../config/pairflowConfig.js";
import {
  readRemotePointer,
  readRemoteStateCache,
  writeRemoteStateCache
} from "../../infrastructure/artifact/bubble/remoteExecutionArtifacts.js";
import {
  executeRemoteBubbleStatus,
  resolveRemoteBubbleStatusTarget
} from "../../infrastructure/executor/ssh/sshBubbleStatus.js";
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
import { readTranscriptEnvelopes } from "../transcript/transcriptDependencyDefaults.js";

export const listCommandDefaults = {
  executeRemoteBubbleStatus,
  RepoResolutionError,
  inspectStateSnapshot,
  listBubbleIds,
  loadPairflowGlobalConfig,
  normalizeRepoPath,
  readBubbleTomlArtifact,
  readRemotePointer,
  readRemoteStateCache,
  readRuntimeSessionsRegistry,
  readTranscriptEnvelopes,
  readWatchdogPaneActivity,
  resolveRemoteBubbleStatusTarget,
  resolveRepoPath,
  writeRemoteStateCache
} as const;
