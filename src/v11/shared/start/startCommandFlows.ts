import { applyStateTransition } from "../../../core/state/machine.js";
import { writeStateSnapshot } from "../../../core/state/stateStore.js";
import { resolveIdeationMetadata } from "../../../core/bubble/ideation.js";
import {
  launchFreshTmuxSession,
  launchResumeTmuxSession
} from "./startCommandTmuxLaunch.js";
import type { BubbleStateSnapshot } from "../../../types/bubble.js";
import type { ResolvedStartBubbleDependencies } from "./startCommandOrchestration.js";
import type { StartExecutionContext } from "./startCommandContext.js";
import { prepareResumeLaunchInput } from "./startCommandResumeFlowPreparation.js";

type StartWrittenState = Awaited<ReturnType<typeof writeStateSnapshot>>;

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
}

export async function runFreshStartFlow(input: {
  context: StartExecutionContext;
  deps: ResolvedStartBubbleDependencies;
  progress: FreshStartProgress;
}): Promise<FreshStartResult> {
  const preparing = applyStateTransition(input.context.loadedState.state, {
    to: "PREPARING_WORKSPACE",
    lastCommandAt: input.context.nowIso
  });
  input.progress.preparingState = preparing;
  const preparingWritten = await writeStateSnapshot(
    input.context.resolved.bubblePaths.statePath,
    preparing,
    {
      expectedFingerprint: input.context.loadedState.fingerprint,
      expectedState: "CREATED"
    }
  );

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

  const running = applyStateTransition(preparing, {
    to: "RUNNING",
    round: ideationPending ? 0 : 1,
    activeAgent: input.context.resolved.bubbleConfig.agents.implementer,
    activeRole: "implementer",
    activeSince: input.context.nowIso,
    lastCommandAt: input.context.nowIso,
    ...(ideationPending
      ? {}
      : {
          appendRoundRoleEntry: {
            round: 1,
            implementer: input.context.resolved.bubbleConfig.agents.implementer,
            reviewer: input.context.resolved.bubbleConfig.agents.reviewer,
            switched_at: input.context.nowIso
          }
        })
  });
  const written = await writeStateSnapshot(
    input.context.resolved.bubblePaths.statePath,
    running,
    {
      expectedFingerprint: preparingWritten.fingerprint,
      expectedState: "PREPARING_WORKSPACE"
    }
  );

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

  const resumed = {
    ...input.context.loadedState.state,
    last_command_at: input.context.nowIso
  };
  const written = await writeStateSnapshot(
    input.context.resolved.bubblePaths.statePath,
    resumed,
    {
      expectedFingerprint: input.context.loadedState.fingerprint,
      expectedState: input.context.loadedState.state.state
    }
  );

  return {
    written,
    tmuxSessionName: tmux.sessionName
  };
}

export { cleanupFailedStart } from "./startCommandCleanup.js";
