import { applyStateTransition } from "../../../core/state/machine.js";
import { writeStateSnapshot } from "../../../core/state/stateStore.js";
import { buildAgentCommand } from "../../../core/runtime/agentCommand.js";
import { resolveIdeationMetadata } from "../../../core/bubble/ideation.js";
import { buildResumeTranscriptSummaryFallback } from "../../../core/protocol/resumeSummary.js";
import {
  formatReviewerTestExecutionDirective,
  resolveReviewerTestEvidenceArtifactPath,
  resolveReviewerTestExecutionDirective
} from "../../../core/reviewer/testEvidence.js";
import {
  buildImplementerIdeationKickoffMessage,
  buildImplementerKickoffMessage,
  buildImplementerStartupPrompt,
  buildMetaReviewerStartupPrompt,
  buildReviewerStartupPrompt,
  buildStatusPaneCommand
} from "./startCommandPrompts.js";
import {
  buildResumeImplementerStartupPrompt,
  buildResumeMetaReviewerStartupPrompt,
  buildResumeReviewerStartupPrompt,
  resolveResumeKickoffMessages
} from "./startCommandResumePrompts.js";
import type { BubbleStateSnapshot } from "../../../types/bubble.js";
import type { ResolvedStartBubbleDependencies } from "./startCommandOrchestration.js";
import type { StartExecutionContext } from "./startCommandContext.js";

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

async function launchFreshTmuxSession(input: {
  context: StartExecutionContext;
  deps: ResolvedStartBubbleDependencies;
  ideationPending: boolean;
}): Promise<{ sessionName: string }> {
  return input.deps.launchTmux({
    bubbleId: input.context.resolved.bubbleId,
    worktreePath: input.context.resolved.bubblePaths.worktreePath,
    statusCommand: buildStatusPaneCommand(
      input.context.resolved.bubbleId,
      input.context.resolved.repoPath,
      input.context.resolved.bubblePaths.worktreePath,
      input.context.resolved.bubbleConfig.pairflow_command_profile
    ),
    statusPaneLabel: "[orchestrator/status]",
    implementerPaneLabel: `[${input.context.resolved.bubbleConfig.agents.implementer}/implementer]`,
    reviewerPaneLabel: `[${input.context.resolved.bubbleConfig.agents.reviewer}/reviewer]`,
    metaReviewerPaneLabel: "[codex/meta-reviewer]",
    implementerCommand: buildAgentCommand({
      agentName: input.context.resolved.bubbleConfig.agents.implementer,
      bubbleId: input.context.resolved.bubbleId,
      worktreePath: input.context.resolved.bubblePaths.worktreePath,
      pairflowCommandProfile: input.context.resolved.bubbleConfig.pairflow_command_profile,
      startupPrompt: buildImplementerStartupPrompt({
        bubbleId: input.context.resolved.bubbleId,
        repoPath: input.context.resolved.repoPath,
        worktreePath: input.context.resolved.bubblePaths.worktreePath,
        taskArtifactPath: input.context.resolved.bubblePaths.taskArtifactPath,
        donePackagePath: input.context.donePackagePath,
        reviewArtifactType: input.context.resolved.bubbleConfig.review_artifact_type,
        pairflowCommandProfile: input.context.resolved.bubbleConfig.pairflow_command_profile,
        ideationPending: input.ideationPending
      })
    }),
    reviewerCommand: buildAgentCommand({
      agentName: input.context.resolved.bubbleConfig.agents.reviewer,
      bubbleId: input.context.resolved.bubbleId,
      worktreePath: input.context.resolved.bubblePaths.worktreePath,
      pairflowCommandProfile: input.context.resolved.bubbleConfig.pairflow_command_profile,
      startupPrompt: buildReviewerStartupPrompt({
        bubbleId: input.context.resolved.bubbleId,
        repoPath: input.context.resolved.repoPath,
        worktreePath: input.context.resolved.bubblePaths.worktreePath,
        taskArtifactPath: input.context.resolved.bubblePaths.taskArtifactPath,
        pairflowCommandProfile: input.context.resolved.bubbleConfig.pairflow_command_profile,
        reviewArtifactType: input.context.resolved.bubbleConfig.review_artifact_type,
        ...(input.context.reviewerFocus !== undefined
          ? { reviewerFocus: input.context.reviewerFocus }
          : {}),
        ...(input.context.reviewerBriefText !== undefined
          ? { reviewerBriefText: input.context.reviewerBriefText }
          : {})
      })
    }),
    metaReviewerCommand: buildAgentCommand({
      agentName: "codex",
      bubbleId: input.context.resolved.bubbleId,
      worktreePath: input.context.resolved.bubblePaths.worktreePath,
      pairflowCommandProfile: input.context.resolved.bubbleConfig.pairflow_command_profile,
      startupPrompt: buildMetaReviewerStartupPrompt({
        bubbleId: input.context.resolved.bubbleId,
        repoPath: input.context.resolved.repoPath,
        worktreePath: input.context.resolved.bubblePaths.worktreePath,
        taskArtifactPath: input.context.resolved.bubblePaths.taskArtifactPath,
        pairflowCommandProfile: input.context.resolved.bubbleConfig.pairflow_command_profile
      })
    }),
    implementerKickoffMessage: input.ideationPending
      ? buildImplementerIdeationKickoffMessage({
          bubbleId: input.context.resolved.bubbleId,
          worktreePath: input.context.resolved.bubblePaths.worktreePath,
          taskArtifactPath: input.context.resolved.bubblePaths.taskArtifactPath,
          pairflowCommandProfile: input.context.resolved.bubbleConfig.pairflow_command_profile
        })
      : buildImplementerKickoffMessage({
          bubbleId: input.context.resolved.bubbleId,
          worktreePath: input.context.resolved.bubblePaths.worktreePath,
          taskArtifactPath: input.context.resolved.bubblePaths.taskArtifactPath,
          reviewArtifactType: input.context.resolved.bubbleConfig.review_artifact_type,
          pairflowCommandProfile: input.context.resolved.bubbleConfig.pairflow_command_profile
        })
  });
}

async function launchResumeTmuxSession(input: {
  context: StartExecutionContext;
  deps: ResolvedStartBubbleDependencies;
  transcriptSummary: string;
  reviewerTestDirectiveLine?: string;
  kickoffDiagnostic?: string;
  resumeKickoffMessages: Omit<
    ReturnType<typeof resolveResumeKickoffMessages>,
    "kickoffDiagnostic"
  >;
}): Promise<{ sessionName: string }> {
  return input.deps.launchTmux({
    bubbleId: input.context.resolved.bubbleId,
    worktreePath: input.context.resolved.bubblePaths.worktreePath,
    statusCommand: buildStatusPaneCommand(
      input.context.resolved.bubbleId,
      input.context.resolved.repoPath,
      input.context.resolved.bubblePaths.worktreePath,
      input.context.resolved.bubbleConfig.pairflow_command_profile
    ),
    statusPaneLabel: "[orchestrator/status]",
    implementerPaneLabel: `[${input.context.resolved.bubbleConfig.agents.implementer}/implementer]`,
    reviewerPaneLabel: `[${input.context.resolved.bubbleConfig.agents.reviewer}/reviewer]`,
    metaReviewerPaneLabel: "[codex/meta-reviewer]",
    implementerCommand: buildAgentCommand({
      agentName: input.context.resolved.bubbleConfig.agents.implementer,
      bubbleId: input.context.resolved.bubbleId,
      worktreePath: input.context.resolved.bubblePaths.worktreePath,
      pairflowCommandProfile: input.context.resolved.bubbleConfig.pairflow_command_profile,
      startupPrompt: buildResumeImplementerStartupPrompt({
        bubbleId: input.context.resolved.bubbleId,
        repoPath: input.context.resolved.repoPath,
        worktreePath: input.context.resolved.bubblePaths.worktreePath,
        taskArtifactPath: input.context.resolved.bubblePaths.taskArtifactPath,
        donePackagePath: input.context.donePackagePath,
        reviewArtifactType: input.context.resolved.bubbleConfig.review_artifact_type,
        pairflowCommandProfile: input.context.resolved.bubbleConfig.pairflow_command_profile,
        state: input.context.loadedState.state,
        transcriptSummary: input.transcriptSummary,
        ...(input.kickoffDiagnostic !== undefined ? { kickoffDiagnostic: input.kickoffDiagnostic } : {})
      })
    }),
    reviewerCommand: buildAgentCommand({
      agentName: input.context.resolved.bubbleConfig.agents.reviewer,
      bubbleId: input.context.resolved.bubbleId,
      worktreePath: input.context.resolved.bubblePaths.worktreePath,
      pairflowCommandProfile: input.context.resolved.bubbleConfig.pairflow_command_profile,
      startupPrompt: buildResumeReviewerStartupPrompt({
        bubbleId: input.context.resolved.bubbleId,
        repoPath: input.context.resolved.repoPath,
        worktreePath: input.context.resolved.bubblePaths.worktreePath,
        taskArtifactPath: input.context.resolved.bubblePaths.taskArtifactPath,
        pairflowCommandProfile: input.context.resolved.bubbleConfig.pairflow_command_profile,
        state: input.context.loadedState.state,
        transcriptSummary: input.transcriptSummary,
        reviewArtifactType: input.context.resolved.bubbleConfig.review_artifact_type,
        ...(input.reviewerTestDirectiveLine !== undefined
          ? { reviewerTestDirectiveLine: input.reviewerTestDirectiveLine }
          : {}),
        ...(input.context.reviewerFocus !== undefined
          ? { reviewerFocus: input.context.reviewerFocus }
          : {}),
        ...(input.context.reviewerBriefText !== undefined
          ? { reviewerBriefText: input.context.reviewerBriefText }
          : {}),
        ...(input.kickoffDiagnostic !== undefined ? { kickoffDiagnostic: input.kickoffDiagnostic } : {})
      })
    }),
    metaReviewerCommand: buildAgentCommand({
      agentName: "codex",
      bubbleId: input.context.resolved.bubbleId,
      worktreePath: input.context.resolved.bubblePaths.worktreePath,
      pairflowCommandProfile: input.context.resolved.bubbleConfig.pairflow_command_profile,
      startupPrompt: buildResumeMetaReviewerStartupPrompt({
        bubbleId: input.context.resolved.bubbleId,
        repoPath: input.context.resolved.repoPath,
        worktreePath: input.context.resolved.bubblePaths.worktreePath,
        taskArtifactPath: input.context.resolved.bubblePaths.taskArtifactPath,
        pairflowCommandProfile: input.context.resolved.bubbleConfig.pairflow_command_profile,
        state: input.context.loadedState.state,
        transcriptSummary: input.transcriptSummary,
        ...(input.kickoffDiagnostic !== undefined ? { kickoffDiagnostic: input.kickoffDiagnostic } : {})
      })
    }),
    ...input.resumeKickoffMessages
  });
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
  let transcriptSummary: string;
  try {
    transcriptSummary = await input.deps.buildResumeSummary({
      transcriptPath: input.context.resolved.bubblePaths.transcriptPath
    });
  } catch (error) {
    transcriptSummary = buildResumeTranscriptSummaryFallback(error);
  }

  const shouldInjectReviewerDirective =
    input.context.loadedState.state.state === "RUNNING" &&
    input.context.loadedState.state.active_role === "reviewer" &&
    input.context.loadedState.state.active_agent ===
      input.context.resolved.bubbleConfig.agents.reviewer;

  const reviewerTestDirectiveLine = shouldInjectReviewerDirective
    ? await resolveReviewerTestExecutionDirective({
        artifactPath: resolveReviewerTestEvidenceArtifactPath(
          input.context.resolved.bubblePaths.artifactsDir
        ),
        worktreePath: input.context.resolved.bubblePaths.worktreePath,
        reviewArtifactType: input.context.resolved.bubbleConfig.review_artifact_type
      })
        .then((directive) => formatReviewerTestExecutionDirective(directive))
        .catch(() => undefined)
    : undefined;

  const resumeKickoffResolution = resolveResumeKickoffMessages({
    bubbleId: input.context.resolved.bubbleId,
    worktreePath: input.context.resolved.bubblePaths.worktreePath,
    taskArtifactPath: input.context.resolved.bubblePaths.taskArtifactPath,
    reviewArtifactType: input.context.resolved.bubbleConfig.review_artifact_type,
    pairflowCommandProfile: input.context.resolved.bubbleConfig.pairflow_command_profile,
    state: input.context.loadedState.state,
    transcriptSummary,
    implementerAgent: input.context.resolved.bubbleConfig.agents.implementer,
    reviewerAgent: input.context.resolved.bubbleConfig.agents.reviewer,
    ...(reviewerTestDirectiveLine !== undefined
      ? { reviewerTestDirectiveLine }
      : {})
  });
  const { kickoffDiagnostic, ...resumeKickoffMessages } = resumeKickoffResolution;

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

export async function cleanupFailedStart(input: {
  context: StartExecutionContext;
  deps: ResolvedStartBubbleDependencies;
  ownershipClaimed: boolean;
  workspaceBootstrapped: boolean;
  tmuxSessionName: string | null;
  preparingState: BubbleStateSnapshot | null;
}): Promise<void> {
  if (input.tmuxSessionName !== null) {
    await input.deps.terminateTmux({
      sessionName: input.tmuxSessionName
    }).catch(() => undefined);
  }
  if (input.ownershipClaimed) {
    await input.deps.removeSession({
      sessionsPath: input.context.resolved.bubblePaths.sessionsPath,
      bubbleId: input.context.resolved.bubbleId
    }).catch(() => undefined);
  }

  if (input.context.startMode === "fresh" && input.workspaceBootstrapped) {
    await input.deps.cleanup({
      repoPath: input.context.resolved.repoPath,
      bubbleBranch: input.context.resolved.bubbleConfig.bubble_branch,
      worktreePath: input.context.resolved.bubblePaths.worktreePath
    }).catch(() => undefined);
  }

  if (input.context.startMode === "fresh" && input.preparingState !== null) {
    const failed = applyStateTransition(input.preparingState, {
      to: "FAILED",
      activeAgent: null,
      activeRole: null,
      activeSince: null,
      lastCommandAt: input.context.nowIso
    });
    await writeStateSnapshot(input.context.resolved.bubblePaths.statePath, failed, {
      expectedState: "PREPARING_WORKSPACE"
    }).catch(() => undefined);
  }
}
