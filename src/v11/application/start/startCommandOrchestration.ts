import { buildResumeTranscriptSummary } from "./startCommandResumeSummary.js";
import type { BubbleStateSnapshot } from "../../../types/bubble.js";
import type {
  StartBubbleDependencies,
  StartBubbleResult,
  ExecuteRemoteBubbleStartInput,
  ExecuteRemoteBubbleStartResult
} from "./startCommandContract.js";
import type { PairflowGlobalConfig } from "../../../config/pairflowConfig.js";
import type {
  BubbleRemotePointer,
  BubbleRemoteStateCache
} from "../../../types/bubble.js";
import type { LaunchBubbleTmuxSessionAckPort } from "../../shared/ports/tmuxSessions.js";
import {
  buildPreparingWorkspaceStartRejectMessage,
  createStartBubbleError
} from "./startCommandRuntime.js";
import {
  readReviewerBriefArtifact as defaultReadReviewerBriefArtifact,
  readReviewerFocusArtifact as defaultReadReviewerFocusArtifact
} from "../reviewer/reviewerArtifactDefaults.js";
import {
  resolveReviewerTestExecutionDirective as defaultResolveReviewerTestExecutionDirective
} from "../reviewer/reviewerTestEvidenceDefaults.js";
import type {
  ReadReviewerBriefArtifactPort,
  ReadReviewerFocusArtifactPort
} from "../../shared/ports/reviewerArtifacts.js";
import type {
  ResolveReviewerTestExecutionDirectivePort
} from "../../shared/ports/reviewerTestEvidenceArtifacts.js";
interface StartBubbleDependencyDefaults {
  bootstrapWorktreeWorkspace:
    NonNullable<StartBubbleDependencies["bootstrapWorktreeWorkspace"]>;
  cleanupWorktreeWorkspace:
    NonNullable<StartBubbleDependencies["cleanupWorktreeWorkspace"]>;
  launchBubbleTmuxSessionAck:
    NonNullable<StartBubbleDependencies["launchBubbleTmuxSessionAck"]>;
  launchBubbleTmuxSession:
    NonNullable<StartBubbleDependencies["launchBubbleTmuxSession"]>;
  terminateBubbleTmuxSession:
    NonNullable<StartBubbleDependencies["terminateBubbleTmuxSession"]>;
  readRuntimeSessionsRegistry:
    NonNullable<StartBubbleDependencies["readRuntimeSessionsRegistry"]>;
  claimRuntimeSession:
    NonNullable<StartBubbleDependencies["claimRuntimeSession"]>;
  upsertRuntimeSession:
    NonNullable<StartBubbleDependencies["upsertRuntimeSession"]>;
  removeRuntimeSession:
    NonNullable<StartBubbleDependencies["removeRuntimeSession"]>;
  writeStateSnapshot:
    NonNullable<StartBubbleDependencies["writeStateSnapshot"]>;
  loadPairflowGlobalConfig:
    NonNullable<StartBubbleDependencies["loadPairflowGlobalConfig"]>;
  runGitCommand:
    NonNullable<StartBubbleDependencies["runGitCommand"]>;
  readRemotePointer:
    NonNullable<StartBubbleDependencies["readRemotePointer"]>;
  writeRemotePointer:
    NonNullable<StartBubbleDependencies["writeRemotePointer"]>;
  writeRemoteStateCache:
    NonNullable<StartBubbleDependencies["writeRemoteStateCache"]>;
  removeRemoteStateCache:
    NonNullable<StartBubbleDependencies["removeRemoteStateCache"]>;
  executeRemoteBubbleStart:
    NonNullable<StartBubbleDependencies["executeRemoteBubbleStart"]>;
}

let startBubbleDependencyDefaultsPromise:
  | Promise<StartBubbleDependencyDefaults>
  | undefined;

async function loadStartBubbleDependencyDefaults(): Promise<StartBubbleDependencyDefaults> {
  startBubbleDependencyDefaultsPromise ??= import(
    "../../defaults/start/startBubbleDefaults.js"
  ).then(({ startBubbleDependencyDefaults }) => ({
    bootstrapWorktreeWorkspace:
      startBubbleDependencyDefaults.bootstrapWorktreeWorkspace,
    cleanupWorktreeWorkspace:
      startBubbleDependencyDefaults.cleanupWorktreeWorkspace,
    launchBubbleTmuxSessionAck:
      startBubbleDependencyDefaults.launchBubbleTmuxSessionAck,
    launchBubbleTmuxSession:
      startBubbleDependencyDefaults.launchBubbleTmuxSession,
    terminateBubbleTmuxSession:
      startBubbleDependencyDefaults.terminateBubbleTmuxSession,
    readRuntimeSessionsRegistry:
      startBubbleDependencyDefaults.readRuntimeSessionsRegistry,
    claimRuntimeSession:
      startBubbleDependencyDefaults.claimRuntimeSession,
    upsertRuntimeSession:
      startBubbleDependencyDefaults.upsertRuntimeSession,
    removeRuntimeSession:
      startBubbleDependencyDefaults.removeRuntimeSession,
    writeStateSnapshot:
      startBubbleDependencyDefaults.writeStateSnapshot,
    loadPairflowGlobalConfig:
      startBubbleDependencyDefaults.loadPairflowGlobalConfig,
    runGitCommand:
      startBubbleDependencyDefaults.runGitCommand,
    readRemotePointer:
      startBubbleDependencyDefaults.readRemotePointer,
    writeRemotePointer:
      startBubbleDependencyDefaults.writeRemotePointer,
    writeRemoteStateCache:
      startBubbleDependencyDefaults.writeRemoteStateCache,
    removeRemoteStateCache:
      startBubbleDependencyDefaults.removeRemoteStateCache,
    executeRemoteBubbleStart:
      startBubbleDependencyDefaults.executeRemoteBubbleStart
  }));
  return startBubbleDependencyDefaultsPromise;
}

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
  launchTmuxAck: LaunchBubbleTmuxSessionAckPort;
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
  resolveReviewerTestExecutionDirective: ResolveReviewerTestExecutionDirectivePort;
}

function projectLegacyLaunchPortToAckPort(
  launchBubbleTmuxSession: NonNullable<StartBubbleDependencies["launchBubbleTmuxSession"]>
): LaunchBubbleTmuxSessionAckPort {
  return async (input) => {
    const result = await launchBubbleTmuxSession(input);
    return {
      status: "running",
      sessionName: result.sessionName
    };
  };
}

export interface ResolveStartBubbleDependenciesInput {
  dependencies: StartBubbleDependencies;
  runWorktreeBootstrapCommandDefault:
    NonNullable<StartBubbleDependencies["runWorktreeBootstrapCommand"]>;
  isTmuxSessionAliveDefault:
    NonNullable<StartBubbleDependencies["isTmuxSessionAlive"]>;
}

export async function resolveStartBubbleDependencies(
  input: ResolveStartBubbleDependenciesInput
): Promise<ResolvedStartBubbleDependencies> {
  const { dependencies } = input;
  const startBubbleDependencyDefaults = await loadStartBubbleDependencyDefaults();

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
    launchTmuxAck:
      dependencies.launchBubbleTmuxSessionAck
      ?? (
        dependencies.launchBubbleTmuxSession !== undefined
          ? projectLegacyLaunchPortToAckPort(
              dependencies.launchBubbleTmuxSession
            )
          : startBubbleDependencyDefaults.launchBubbleTmuxSessionAck
      ),
    terminateTmux:
      dependencies.terminateBubbleTmuxSession
      ?? startBubbleDependencyDefaults.terminateBubbleTmuxSession,
    isTmuxSessionAlive:
      dependencies.isTmuxSessionAlive ?? input.isTmuxSessionAliveDefault,
    readSessions:
      dependencies.readRuntimeSessionsRegistry
      ?? startBubbleDependencyDefaults.readRuntimeSessionsRegistry,
    claimSession:
      dependencies.claimRuntimeSession
      ?? startBubbleDependencyDefaults.claimRuntimeSession,
    upsertSession:
      dependencies.upsertRuntimeSession
      ?? startBubbleDependencyDefaults.upsertRuntimeSession,
    removeSession:
      dependencies.removeRuntimeSession
      ?? startBubbleDependencyDefaults.removeRuntimeSession,
    writeState:
      dependencies.writeStateSnapshot ?? startBubbleDependencyDefaults.writeStateSnapshot,
    loadPairflowGlobalConfig:
      dependencies.loadPairflowGlobalConfig
      ?? startBubbleDependencyDefaults.loadPairflowGlobalConfig,
    runGitCommand:
      dependencies.runGitCommand
      ?? startBubbleDependencyDefaults.runGitCommand,
    readRemotePointer:
      dependencies.readRemotePointer
      ?? startBubbleDependencyDefaults.readRemotePointer,
    writeRemotePointer:
      dependencies.writeRemotePointer
      ?? startBubbleDependencyDefaults.writeRemotePointer,
    writeRemoteStateCache:
      dependencies.writeRemoteStateCache
      ?? startBubbleDependencyDefaults.writeRemoteStateCache,
    removeRemoteStateCache:
      dependencies.removeRemoteStateCache
      ?? startBubbleDependencyDefaults.removeRemoteStateCache,
    executeRemoteBubbleStart:
      dependencies.executeRemoteBubbleStart
      ?? startBubbleDependencyDefaults.executeRemoteBubbleStart,
    reportWarning:
      dependencies.reportWarning
      ?? ((message: string) => {
        process.stderr.write(`${message}\n`);
      }),
    buildResumeSummary:
      dependencies.buildResumeTranscriptSummary ?? buildResumeTranscriptSummary,
    readReviewerBriefArtifact:
      dependencies.readReviewerBriefArtifact
      ?? defaultReadReviewerBriefArtifact,
    readReviewerFocusArtifact:
      dependencies.readReviewerFocusArtifact
      ?? defaultReadReviewerFocusArtifact,
    resolveReviewerTestExecutionDirective:
      dependencies.resolveReviewerTestExecutionDirective
      ?? defaultResolveReviewerTestExecutionDirective
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
