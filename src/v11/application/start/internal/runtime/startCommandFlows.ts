import { resolveIdeationMetadata } from "../../../../domain/ideation/ideationMetadata.js";
import {
  launchFreshTmuxSession,
  launchResumeTmuxSession
} from "./startCommandTmuxLaunch.js";
import {
  resolveFreshLaunchWorkspace,
  resolveResumeLaunchWorkspace
} from "./startCommandLaunchWorkspace.js";
import type { BubbleStateSnapshot } from "../../../../domain/state/snapshot/bubbleStateSnapshotTypes.js";
import type { ResolvedStartBubbleDependencies } from "../../startCommandOrchestration.js";
import type { StartExecutionContext } from "./startCommandContext.js";
import { prepareResumeLaunchInput } from "../prompts/startCommandResumeFlowPreparation.js";
import {
  executeStartPreparingMutation,
  executeStartResumeMutation,
  executeStartRunningMutation,
  type StartLoadedStateSnapshot
} from "./startStatePersistence.js";
import type { WorktreeBootstrapResult } from "../../../../ports/worktreeWorkspace.js";
import { createStartBubbleError } from "./startCommandRuntime.js";
import {
  runRemoteCloneInnerStart,
  runRemoteStartExecution
} from "../remote/startCommandRemoteExecution.js";

type StartWrittenState = StartLoadedStateSnapshot;

interface FreshStartResult {
  written: StartWrittenState;
  tmuxSessionName: string;
  executionTarget: "local" | "remote";
  runtimeWorkspacePath: string;
}

interface ResumeStartResult {
  written: StartWrittenState;
  tmuxSessionName: string;
  executionTarget: "local" | "remote";
  runtimeWorkspacePath: string;
}

export interface FreshStartProgress {
  workspaceBootstrapped: boolean;
  preparingState: BubbleStateSnapshot | null;
  preparingFingerprint: string | null;
}

async function persistFreshLaunchWorkspaceAuthority(input: {
  context: StartExecutionContext;
  deps: ResolvedStartBubbleDependencies;
  launchWorkspace: ReturnType<typeof resolveFreshLaunchWorkspace>;
}): Promise<void> {
  input.context.runtimeSessionRecord = await input.deps.upsertSession({
    sessionsPath: input.context.resolved.bubblePaths.sessionsPath,
    bubbleId: input.context.resolved.bubbleId,
    repoPath: input.context.resolved.repoPath,
    worktreePath: input.context.resolved.bubblePaths.worktreePath,
    workspacePath: input.launchWorkspace.workspacePath,
    workspaceKind: input.launchWorkspace.workspaceKind,
    tmuxSessionName:
      input.context.runtimeSessionRecord?.tmuxSessionName
      ?? input.context.expectedTmuxSessionName,
    now: input.context.now
  });
}

function assertBootstrapWorkspaceMatchesRequestedMode(input: {
  bubbleId: string;
  requestedWorkspaceKind: StartExecutionContext["resolved"]["bubbleConfig"]["work_mode"];
  launchWorkspace: ReturnType<typeof resolveFreshLaunchWorkspace>;
}): void {
  if (input.launchWorkspace.workspaceKind !== input.requestedWorkspaceKind) {
    throw createStartBubbleError({
      reasonCode: "START_LAUNCH_WORKSPACE_UNAVAILABLE",
      message:
        `Bubble ${input.bubbleId} bootstrap returned workspace kind ${input.launchWorkspace.workspaceKind}, `
        + `but start requested ${input.requestedWorkspaceKind}.`,
      context: {
        bubble_id: input.bubbleId,
        requested_workspace_kind: input.requestedWorkspaceKind,
        actual_workspace_kind: input.launchWorkspace.workspaceKind,
        authority_source: "bootstrap_result"
      }
    });
  }
}

function assertResumeWorkspaceMatchesRequestedMode(input: {
  bubbleId: string;
  requestedWorkspaceKind: StartExecutionContext["resolved"]["bubbleConfig"]["work_mode"];
  launchWorkspace: ReturnType<typeof resolveResumeLaunchWorkspace>;
}): void {
  if (input.launchWorkspace.workspaceKind === input.requestedWorkspaceKind) {
    return;
  }

  if (input.requestedWorkspaceKind === "clone") {
    throw createStartBubbleError({
      reasonCode: "START_LAUNCH_WORKSPACE_UNAVAILABLE",
      message:
        `Bubble ${input.bubbleId} cannot resume tmux because clone resume requires explicit clone canonical workspace authority in runtime session state.`,
      context: {
        bubble_id: input.bubbleId,
        requested_workspace_kind: input.requestedWorkspaceKind,
        actual_workspace_kind: input.launchWorkspace.workspaceKind,
        authority_source: "runtime_session",
        authority_resolution: "workspace_kind_mismatch"
      }
    });
  }

  throw createStartBubbleError({
    reasonCode: "START_LAUNCH_WORKSPACE_UNAVAILABLE",
    message:
      `Bubble ${input.bubbleId} cannot resume tmux because runtime session workspace kind ${input.launchWorkspace.workspaceKind} `
      + `does not match requested ${input.requestedWorkspaceKind}.`,
    context: {
      bubble_id: input.bubbleId,
      requested_workspace_kind: input.requestedWorkspaceKind,
      actual_workspace_kind: input.launchWorkspace.workspaceKind,
      authority_source: "runtime_session",
      authority_resolution: "workspace_kind_mismatch"
    }
  });
}

async function bootstrapFreshWorkspace(input: {
  context: StartExecutionContext;
  deps: ResolvedStartBubbleDependencies;
}): Promise<WorktreeBootstrapResult> {
  const bootstrapInput = {
    repoPath: input.context.resolved.repoPath,
    baseBranch: input.context.resolved.bubbleConfig.base_branch,
    bubbleBranch: input.context.resolved.bubbleConfig.bubble_branch,
    worktreePath: input.context.resolved.bubblePaths.worktreePath,
    localOverlay: input.context.resolved.bubbleConfig.local_overlay,
    workspaceKind: input.context.resolved.bubbleConfig.work_mode
  };

  return input.deps.bootstrap(bootstrapInput);
}

export async function runFreshStartFlow(input: {
  context: StartExecutionContext;
  deps: ResolvedStartBubbleDependencies;
  progress: FreshStartProgress;
}): Promise<FreshStartResult> {
  if (input.context.remoteStartContext !== undefined) {
    return runRemoteCloneInnerStart(input);
  }
  if (input.context.resolved.bubbleConfig.executor?.type === "ssh") {
    return runRemoteStartExecution(input);
  }

  const preparingWritten = await executeStartPreparingMutation({
    statePath: input.context.resolved.bubblePaths.statePath,
    loadedState: input.context.loadedState,
    nowIso: input.context.nowIso,
    writeStateSnapshot: input.deps.writeState
  });
  input.progress.preparingState = preparingWritten.state;
  input.progress.preparingFingerprint = preparingWritten.fingerprint;

  const bootstrapResult = await bootstrapFreshWorkspace(input);
  input.progress.workspaceBootstrapped = true;
  const launchWorkspace = resolveFreshLaunchWorkspace({
    bubbleId: input.context.resolved.bubbleId,
    bootstrapResult
  });
  assertBootstrapWorkspaceMatchesRequestedMode({
    bubbleId: input.context.resolved.bubbleId,
    requestedWorkspaceKind: input.context.resolved.bubbleConfig.work_mode,
    launchWorkspace
  });
  await persistFreshLaunchWorkspaceAuthority({
    context: input.context,
    deps: input.deps,
    launchWorkspace
  });

  if (
    input.context.resolved.bubbleConfig.commands.bootstrap !== undefined
    && input.context.resolved.bubbleConfig.commands.bootstrap.trim().length > 0
  ) {
    await input.deps.runWorktreeBootstrapCommand({
      bubbleId: input.context.resolved.bubbleId,
      workspacePath: launchWorkspace.workspacePath,
      worktreePath: input.context.resolved.bubblePaths.worktreePath,
      command: input.context.resolved.bubbleConfig.commands.bootstrap
    });
  }

  const ideationMetadata = resolveIdeationMetadata(input.context.resolved.bubbleConfig);
  const ideationPending =
    ideationMetadata.mode &&
    ideationMetadata.taskPending &&
    ideationMetadata.parseWarning === undefined;

  const tmux = await launchFreshTmuxSession({
    context: input.context,
    deps: input.deps,
    ideationPending,
    launchWorkspacePath: launchWorkspace.workspacePath
  });

  const written = await executeStartRunningMutation({
    statePath: input.context.resolved.bubblePaths.statePath,
    preparingState: preparingWritten.state,
    preparingFingerprint: preparingWritten.fingerprint,
    nowIso: input.context.nowIso,
    bubbleId: input.context.resolved.bubbleId,
    implementer: input.context.resolved.bubbleConfig.agents.implementer,
    reviewer: input.context.resolved.bubbleConfig.agents.reviewer,
    watchdogTimeoutMinutes:
      input.context.resolved.bubbleConfig.watchdog_timeout_minutes,
    ideationPending,
    writeStateSnapshot: input.deps.writeState
  });

  return {
    written,
    tmuxSessionName: tmux.sessionName,
    executionTarget: "local",
    runtimeWorkspacePath: launchWorkspace.workspacePath
  };
}

export async function runResumeStartFlow(input: {
  context: StartExecutionContext;
  deps: ResolvedStartBubbleDependencies;
}): Promise<ResumeStartResult> {
  const launchWorkspace = resolveResumeLaunchWorkspace({
    bubbleId: input.context.resolved.bubbleId,
    runtimeSessionRecord: input.context.runtimeSessionRecord
  });
  assertResumeWorkspaceMatchesRequestedMode({
    bubbleId: input.context.resolved.bubbleId,
    requestedWorkspaceKind: input.context.resolved.bubbleConfig.work_mode,
    launchWorkspace
  });
  const {
    transcriptSummary,
    reviewerTestDirectiveLine,
    kickoffDiagnostic,
    resumeKickoffMessages
  } = await prepareResumeLaunchInput({
    ...input,
    launchWorkspacePath: launchWorkspace.workspacePath
  });

  const tmux = await launchResumeTmuxSession({
    context: input.context,
    deps: input.deps,
    launchWorkspacePath: launchWorkspace.workspacePath,
    transcriptSummary,
    ...(reviewerTestDirectiveLine !== undefined
      ? { reviewerTestDirectiveLine }
      : {}),
    ...(kickoffDiagnostic !== undefined ? { kickoffDiagnostic } : {}),
    resumeKickoffMessages
  });

  const written = await executeStartResumeMutation({
    statePath: input.context.resolved.bubblePaths.statePath,
    loadedState: input.context.loadedState,
    nowIso: input.context.nowIso,
    watchdogTimeoutMinutes:
      input.context.resolved.bubbleConfig.watchdog_timeout_minutes,
    writeStateSnapshot: input.deps.writeState
  });

  return {
    written,
    tmuxSessionName: tmux.sessionName,
    executionTarget: "local",
    runtimeWorkspacePath: launchWorkspace.workspacePath
  };
}

export { cleanupFailedStart } from "./startCommandCleanup.js";
export { buildResumedState } from "./startStatePersistence.js";
