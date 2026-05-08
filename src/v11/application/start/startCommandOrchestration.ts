import { buildResumeTranscriptSummary } from "./internal/prompts/startCommandResumeSummary.js";
import type { BubbleStateSnapshot } from "../../shared/state/bubbleStateSnapshotTypes.js";
import type {
  StartBubbleDependencies,
  StartBubbleResult,
  ExecuteRemoteBubbleStartInput,
  ExecuteRemoteBubbleStartResult
} from "./startCommandContract.js";
import type { PairflowGlobalConfig } from "../../../config/pairflowConfig.js";
import type {
  BubbleRemotePointer
} from "../../shared/remote/remoteExecutionTypes.js";
import type { BubbleRemoteStateCache } from "../../shared/remote/remoteStateCacheTypes.js";
import type { LaunchBubbleSessionAckPort } from "../../ports/tmuxSessions.js";
import {
  buildPreparingWorkspaceStartRejectMessage,
  createStartBubbleError
} from "./internal/runtime/startCommandRuntime.js";
import type {
  ReadReviewerBriefArtifactPort,
  ReadReviewerFocusArtifactPort
} from "../../ports/reviewerArtifacts.js";
import type {
  ResolveDocContractGateArtifactPathPort
} from "../../ports/docContractGateArtifacts.js";
import type {
  ResolveReviewerTestExecutionDirectivePort
} from "../../ports/reviewerTestEvidenceArtifacts.js";
import {
  loadStartBubbleDependencyDefaults,
  type StartBubbleDependencyDefaults
} from "./startBubbleDependencyDefaults.js";

export type StartBubbleMode = "fresh" | "resume";

const resumableRuntimeStates = new Set([
  "RUNNING",
  "WAITING_HUMAN",
  "READY_FOR_HUMAN_APPROVAL",
  "APPROVED_FOR_COMMIT",
  "COMMITTED"
]);

export interface ResolvedStartBubbleDependencies {
  bootstrap: NonNullable<StartBubbleDependencies["bootstrapWorktreeWorkspace"]>;
  cleanup: NonNullable<StartBubbleDependencies["cleanupWorktreeWorkspace"]>;
  runWorktreeBootstrapCommand:
    NonNullable<StartBubbleDependencies["runWorktreeBootstrapCommand"]>;
  launchSessionAck: LaunchBubbleSessionAckPort;
  terminateTmux:
    NonNullable<StartBubbleDependencies["terminateBubbleTmuxSession"]>;
  isTmuxSessionAlive: NonNullable<StartBubbleDependencies["isTmuxSessionAlive"]>;
  readSessions:
    NonNullable<StartBubbleDependencies["readRuntimeSessionsRegistry"]>;
  claimSession: NonNullable<StartBubbleDependencies["claimRuntimeSession"]>;
  upsertSession: NonNullable<StartBubbleDependencies["upsertRuntimeSession"]>;
  removeSession: NonNullable<StartBubbleDependencies["removeRuntimeSession"]>;
  writeState: NonNullable<StartBubbleDependencies["writeStateSnapshot"]>;
  loadPairflowGlobalConfig:
    () => Promise<PairflowGlobalConfig>;
  runGitCommand:
    NonNullable<StartBubbleDependencies["runGitCommand"]>;
  readRemotePointer:
    (path: string) => Promise<BubbleRemotePointer | null>;
  writeRemotePointer:
    (path: string, value: BubbleRemotePointer) => Promise<void>;
  writeRemoteStateCache:
    (path: string, value: BubbleRemoteStateCache) => Promise<void>;
  removeRemoteStateCache:
    (path: string) => Promise<void>;
  executeRemoteBubbleStart:
    (input: ExecuteRemoteBubbleStartInput) => Promise<ExecuteRemoteBubbleStartResult>;
  reportWarning: (message: string) => void;
  buildResumeSummary:
    NonNullable<StartBubbleDependencies["buildResumeTranscriptSummary"]>;
  readReviewerBriefArtifact: ReadReviewerBriefArtifactPort;
  readReviewerFocusArtifact: ReadReviewerFocusArtifactPort;
  resolveDocContractGateArtifactPath: ResolveDocContractGateArtifactPathPort;
  resolveReviewerTestExecutionDirective: ResolveReviewerTestExecutionDirectivePort;
}

export interface ResolveStartBubbleDependenciesInput {
  dependencies: StartBubbleDependencies;
  runWorktreeBootstrapCommandDefault:
    NonNullable<StartBubbleDependencies["runWorktreeBootstrapCommand"]>;
  isTmuxSessionAliveDefault:
    NonNullable<StartBubbleDependencies["isTmuxSessionAlive"]>;
}

function resolveLaunchSessionAckDependency(input: {
  dependencies: StartBubbleDependencies;
  defaults: StartBubbleDependencyDefaults;
}): LaunchBubbleSessionAckPort {
  if (input.dependencies.launchBubbleSessionAck !== undefined) {
    return input.dependencies.launchBubbleSessionAck;
  }
  return input.defaults.launchBubbleSessionAck;
}

function resolveRuntimeSessionDependencies(input: {
  dependencies: StartBubbleDependencies;
  defaults: StartBubbleDependencyDefaults;
}) {
  return {
    readSessions:
      input.dependencies.readRuntimeSessionsRegistry
      ?? input.defaults.readRuntimeSessionsRegistry,
    claimSession:
      input.dependencies.claimRuntimeSession
      ?? input.defaults.claimRuntimeSession,
    upsertSession:
      input.dependencies.upsertRuntimeSession
      ?? input.defaults.upsertRuntimeSession,
    removeSession:
      input.dependencies.removeRuntimeSession
      ?? input.defaults.removeRuntimeSession
  };
}

function resolveRemoteExecutionDependencies(input: {
  dependencies: StartBubbleDependencies;
  defaults: StartBubbleDependencyDefaults;
}) {
  return {
    loadPairflowGlobalConfig:
      input.dependencies.loadPairflowGlobalConfig
      ?? input.defaults.loadPairflowGlobalConfig,
    runGitCommand:
      input.dependencies.runGitCommand ?? input.defaults.runGitCommand,
    readRemotePointer:
      input.dependencies.readRemotePointer ?? input.defaults.readRemotePointer,
    writeRemotePointer:
      input.dependencies.writeRemotePointer ?? input.defaults.writeRemotePointer,
    writeRemoteStateCache:
      input.dependencies.writeRemoteStateCache
      ?? input.defaults.writeRemoteStateCache,
    removeRemoteStateCache:
      input.dependencies.removeRemoteStateCache
      ?? input.defaults.removeRemoteStateCache,
    executeRemoteBubbleStart:
      input.dependencies.executeRemoteBubbleStart
      ?? input.defaults.executeRemoteBubbleStart
  };
}

function resolveReviewerDependencies(input: {
  dependencies: StartBubbleDependencies;
  defaults: StartBubbleDependencyDefaults;
}) {
  return {
    buildResumeSummary:
      input.dependencies.buildResumeTranscriptSummary ?? buildResumeTranscriptSummary,
    readReviewerBriefArtifact:
      input.dependencies.readReviewerBriefArtifact
      ?? input.defaults.readReviewerBriefArtifact,
    readReviewerFocusArtifact:
      input.dependencies.readReviewerFocusArtifact
      ?? input.defaults.readReviewerFocusArtifact,
    resolveDocContractGateArtifactPath:
      input.dependencies.resolveDocContractGateArtifactPath
      ?? input.defaults.resolveDocContractGateArtifactPath,
    resolveReviewerTestExecutionDirective:
      input.dependencies.resolveReviewerTestExecutionDirective
      ?? input.defaults.resolveReviewerTestExecutionDirective
  };
}

export function resolveStartBubbleDependencies(
  input: ResolveStartBubbleDependenciesInput
): ResolvedStartBubbleDependencies {
  const { dependencies } = input;
  const startBubbleDependencyDefaults = loadStartBubbleDependencyDefaults();
  const runtimeSessions = resolveRuntimeSessionDependencies({
    dependencies,
    defaults: startBubbleDependencyDefaults
  });
  const remoteExecution = resolveRemoteExecutionDependencies({
    dependencies,
    defaults: startBubbleDependencyDefaults
  });
  const reviewerDependencies = resolveReviewerDependencies({
    dependencies,
    defaults: startBubbleDependencyDefaults
  });

  return {
    bootstrap:
      dependencies.bootstrapWorktreeWorkspace
      ?? startBubbleDependencyDefaults.bootstrapWorktreeWorkspace,
    cleanup:
      dependencies.cleanupWorktreeWorkspace
      ?? startBubbleDependencyDefaults.cleanupWorktreeWorkspace,
    runWorktreeBootstrapCommand:
      dependencies.runWorktreeBootstrapCommand
      ?? input.runWorktreeBootstrapCommandDefault,
    launchSessionAck: resolveLaunchSessionAckDependency({
      dependencies,
      defaults: startBubbleDependencyDefaults
    }),
    terminateTmux:
      dependencies.terminateBubbleTmuxSession
      ?? startBubbleDependencyDefaults.terminateBubbleTmuxSession,
    isTmuxSessionAlive:
      dependencies.isTmuxSessionAlive ?? input.isTmuxSessionAliveDefault,
    ...runtimeSessions,
    writeState:
      dependencies.writeStateSnapshot ?? startBubbleDependencyDefaults.writeStateSnapshot,
    ...remoteExecution,
    reportWarning:
      dependencies.reportWarning
      ?? ((message: string) => {
        process.stderr.write(`${message}\n`);
      }),
    ...reviewerDependencies
  };
}

export function resolveStartBubbleMode(currentState: string): StartBubbleMode {
  if (currentState === "CREATED") {
    return "fresh";
  }
  if (currentState === "PREPARING_WORKSPACE") {
    throw createStartBubbleError({
      reasonCode: "START_STATE_NOT_STARTABLE",
      message: buildPreparingWorkspaceStartRejectMessage(),
      context: {
        command_name: "start",
        current_state: currentState
      }
    });
  }
  if (resumableRuntimeStates.has(currentState)) {
    return "resume";
  }
  throw createStartBubbleError({
    reasonCode: "START_STATE_NOT_STARTABLE",
    message:
      `bubble start requires state CREATED or resumable runtime state (current: ${currentState}).`,
    context: {
      command_name: "start",
      current_state: currentState
    }
  });
}

export function mapStartBubbleResult(input: {
  bubbleId: string;
  state: BubbleStateSnapshot;
  tmuxSessionName: string;
  worktreePath: string;
  executionTarget: "local" | "remote";
  runtimeWorkspacePath: string;
}): StartBubbleResult {
  return {
    bubbleId: input.bubbleId,
    state: input.state,
    tmuxSessionName: input.tmuxSessionName,
    worktreePath: input.worktreePath,
    executionTarget: input.executionTarget,
    runtimeWorkspacePath: input.runtimeWorkspacePath
  };
}
