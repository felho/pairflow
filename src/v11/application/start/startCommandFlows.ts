import { resolveIdeationMetadata } from "../../domain/ideation/ideationMetadata.js";
import {
  launchFreshTmuxSession,
  launchResumeTmuxSession
} from "./startCommandTmuxLaunch.js";
import type { BubbleStateSnapshot } from "../../../types/bubble.js";
import type { ResolvedStartBubbleDependencies } from "./startCommandOrchestration.js";
import type { StartExecutionContext } from "./startCommandContext.js";
import { prepareResumeLaunchInput } from "./startCommandResumeFlowPreparation.js";
import {
  executeStartPreparingMutation,
  executeStartResumeMutation,
  executeStartRunningMutation,
  type StartLoadedStateSnapshot
} from "../../shared/start/startStateMutation.js";

type StartWrittenState = StartLoadedStateSnapshot;

interface FreshStartResult {
  written: StartWrittenState;
  tmuxSessionName: string;
}

interface ResumeStartResult {
  written: StartWrittenState;
  tmuxSessionName: string;
}

export interface FreshStartProgress {
  workspaceBootstrapped: boolean;
  preparingState: BubbleStateSnapshot | null;
  preparingFingerprint: string | null;
}

export async function runFreshStartFlow(input: {
  context: StartExecutionContext;
  deps: ResolvedStartBubbleDependencies;
  progress: FreshStartProgress;
}): Promise<FreshStartResult> {
  const preparingWritten = await executeStartPreparingMutation({
    statePath: input.context.resolved.bubblePaths.statePath,
    loadedState: input.context.loadedState,
    nowIso: input.context.nowIso,
    writeStateSnapshot: input.deps.writeState
  });
  input.progress.preparingState = preparingWritten.state;
  input.progress.preparingFingerprint = preparingWritten.fingerprint;

  await input.deps.bootstrap({
    repoPath: input.context.resolved.repoPath,
    baseBranch: input.context.resolved.bubbleConfig.base_branch,
    bubbleBranch: input.context.resolved.bubbleConfig.bubble_branch,
    worktreePath: input.context.resolved.bubblePaths.worktreePath,
    localOverlay: input.context.resolved.bubbleConfig.local_overlay
  });
  input.progress.workspaceBootstrapped = true;

  if (
    input.context.resolved.bubbleConfig.commands.bootstrap !== undefined
    && input.context.resolved.bubbleConfig.commands.bootstrap.trim().length > 0
  ) {
    await input.deps.runWorktreeBootstrapCommand({
      bubbleId: input.context.resolved.bubbleId,
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
    ideationPending
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
    tmuxSessionName: tmux.sessionName
  };
}

export async function runResumeStartFlow(input: {
  context: StartExecutionContext;
  deps: ResolvedStartBubbleDependencies;
}): Promise<ResumeStartResult> {
  const {
    transcriptSummary,
    reviewerTestDirectiveLine,
    kickoffDiagnostic,
    resumeKickoffMessages
  } = await prepareResumeLaunchInput(input);

  const tmux = await launchResumeTmuxSession({
    context: input.context,
    deps: input.deps,
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
    tmuxSessionName: tmux.sessionName
  };
}

export { cleanupFailedStart } from "./startCommandCleanup.js";
export { buildResumedState } from "../../shared/start/startStateMutation.js";
