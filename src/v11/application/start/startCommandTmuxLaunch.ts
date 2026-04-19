import { buildAgentCommand } from "./startCommandPromptRuntime.js";
import { createStartBubbleError } from "./startCommandRuntime.js";
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
  buildResumeReviewerStartupPrompt
} from "./startCommandResumePrompts.js";
import type { resolveResumeKickoffMessages } from "./startCommandResumePrompts.js";
import type { ResolvedStartBubbleDependencies } from "./startCommandOrchestration.js";
import type { StartExecutionContext } from "./startCommandContext.js";

function shouldSubmitStartupPrompt(agentName: "codex" | "claude"): boolean {
  return agentName === "codex";
}

function buildStatusPaneLabel(bubbleId: string): string {
  return `[orchestrator/status]-[${bubbleId}]`;
}

function assertRunningLaunchAck(input: {
  bubbleId: string;
  ack: Awaited<ReturnType<ResolvedStartBubbleDependencies["launchSessionAck"]>>;
}): { sessionName: string } {
  if (input.ack.status === "running") {
    return {
      sessionName: input.ack.sessionName
    };
  }

  throw createStartBubbleError({
    reasonCode: input.ack.reason_code,
    message: input.ack.error_message,
    context: {
      bubble_id: input.bubbleId,
      stage: "launch_tmux",
      failure_kind: input.ack.failure_kind,
      ...(input.ack.sessionName !== undefined
        ? { tmux_session_name: input.ack.sessionName }
        : {})
    }
  });
}

export async function launchFreshTmuxSession(input: {
  context: StartExecutionContext;
  deps: ResolvedStartBubbleDependencies;
  ideationPending: boolean;
  launchWorkspacePath: string;
}): Promise<{ sessionName: string }> {
  const externalPairflowCommand =
    input.context.remoteStartContext?.externalPairflowCommand;
  const remoteWorkspaceAuthority =
    input.context.remoteStartContext !== undefined
      ? {
          workspaceRoot: input.context.remoteStartContext.workspaceRoot,
          ...(externalPairflowCommand !== undefined
            ? { externalPairflowCommand }
            : {})
        }
      : undefined;
  const ack = await input.deps.launchSessionAck({
    bubbleId: input.context.resolved.bubbleId,
    workspacePath: input.launchWorkspacePath,
    statusCommand: buildStatusPaneCommand(
      input.context.resolved.bubbleId,
      input.context.resolved.repoPath,
      input.launchWorkspacePath,
      input.context.resolved.bubbleConfig.pairflow_command_profile,
      externalPairflowCommand
    ),
    statusPaneLabel: buildStatusPaneLabel(input.context.resolved.bubbleId),
    implementerPaneLabel: `[${input.context.resolved.bubbleConfig.agents.implementer}/implementer]`,
    reviewerPaneLabel: `[${input.context.resolved.bubbleConfig.agents.reviewer}/reviewer]`,
    metaReviewerPaneLabel: "[codex/meta-reviewer]",
    implementerSubmitStartupPrompt: shouldSubmitStartupPrompt(
      input.context.resolved.bubbleConfig.agents.implementer
    ),
    reviewerSubmitStartupPrompt: shouldSubmitStartupPrompt(
      input.context.resolved.bubbleConfig.agents.reviewer
    ),
    metaReviewerSubmitStartupPrompt: true,
    implementerCommand: buildAgentCommand({
      agentName: input.context.resolved.bubbleConfig.agents.implementer,
      bubbleId: input.context.resolved.bubbleId,
      workspacePath: input.launchWorkspacePath,
      pairflowCommandProfile: input.context.resolved.bubbleConfig.pairflow_command_profile,
      ...(externalPairflowCommand !== undefined
        ? { externalPairflowCommand }
        : {}),
      ...(remoteWorkspaceAuthority !== undefined
        ? { remoteWorkspaceAuthority }
        : {}),
      startupPrompt: buildImplementerStartupPrompt({
        bubbleId: input.context.resolved.bubbleId,
        repoPath: input.context.resolved.repoPath,
        workspacePath: input.launchWorkspacePath,
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
      workspacePath: input.launchWorkspacePath,
      pairflowCommandProfile: input.context.resolved.bubbleConfig.pairflow_command_profile,
      ...(externalPairflowCommand !== undefined
        ? { externalPairflowCommand }
        : {}),
      ...(remoteWorkspaceAuthority !== undefined
        ? { remoteWorkspaceAuthority }
        : {}),
      startupPrompt: buildReviewerStartupPrompt({
        bubbleId: input.context.resolved.bubbleId,
        repoPath: input.context.resolved.repoPath,
        workspacePath: input.launchWorkspacePath,
        taskArtifactPath: input.context.resolved.bubblePaths.taskArtifactPath,
        policySnapshotPathAbs: input.context.policySnapshotPathAbs,
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
      workspacePath: input.launchWorkspacePath,
      pairflowCommandProfile: input.context.resolved.bubbleConfig.pairflow_command_profile,
      ...(externalPairflowCommand !== undefined
        ? { externalPairflowCommand }
        : {}),
      ...(remoteWorkspaceAuthority !== undefined
        ? { remoteWorkspaceAuthority }
        : {}),
      startupPrompt: buildMetaReviewerStartupPrompt({
        bubbleId: input.context.resolved.bubbleId,
        repoPath: input.context.resolved.repoPath,
        workspacePath: input.launchWorkspacePath,
        taskArtifactPath: input.context.resolved.bubblePaths.taskArtifactPath,
        pairflowCommandProfile: input.context.resolved.bubbleConfig.pairflow_command_profile
      })
    }),
    implementerKickoffMessage: input.ideationPending
      ? buildImplementerIdeationKickoffMessage({
          bubbleId: input.context.resolved.bubbleId,
          workspacePath: input.launchWorkspacePath,
          taskArtifactPath: input.context.resolved.bubblePaths.taskArtifactPath,
          pairflowCommandProfile: input.context.resolved.bubbleConfig.pairflow_command_profile
        })
      : buildImplementerKickoffMessage({
          bubbleId: input.context.resolved.bubbleId,
          workspacePath: input.launchWorkspacePath,
          taskArtifactPath: input.context.resolved.bubblePaths.taskArtifactPath,
          reviewArtifactType: input.context.resolved.bubbleConfig.review_artifact_type,
          pairflowCommandProfile: input.context.resolved.bubbleConfig.pairflow_command_profile
        })
  });

  return assertRunningLaunchAck({
    bubbleId: input.context.resolved.bubbleId,
    ack
  });
}

export async function launchResumeTmuxSession(input: {
  context: StartExecutionContext;
  deps: ResolvedStartBubbleDependencies;
  launchWorkspacePath: string;
  transcriptSummary: string;
  reviewerTestDirectiveLine?: string;
  kickoffDiagnostic?: string;
  resumeKickoffMessages: Omit<
    ReturnType<typeof resolveResumeKickoffMessages>,
    "kickoffDiagnostic"
  >;
}): Promise<{ sessionName: string }> {
  const externalPairflowCommand =
    input.context.remoteStartContext?.externalPairflowCommand;
  const remoteWorkspaceAuthority =
    input.context.remoteStartContext !== undefined
      ? {
          workspaceRoot: input.context.remoteStartContext.workspaceRoot,
          ...(externalPairflowCommand !== undefined
            ? { externalPairflowCommand }
            : {})
        }
      : undefined;
  const ack = await input.deps.launchSessionAck({
    bubbleId: input.context.resolved.bubbleId,
    workspacePath: input.launchWorkspacePath,
    statusCommand: buildStatusPaneCommand(
      input.context.resolved.bubbleId,
      input.context.resolved.repoPath,
      input.launchWorkspacePath,
      input.context.resolved.bubbleConfig.pairflow_command_profile,
      externalPairflowCommand
    ),
    statusPaneLabel: buildStatusPaneLabel(input.context.resolved.bubbleId),
    implementerPaneLabel: `[${input.context.resolved.bubbleConfig.agents.implementer}/implementer]`,
    reviewerPaneLabel: `[${input.context.resolved.bubbleConfig.agents.reviewer}/reviewer]`,
    metaReviewerPaneLabel: "[codex/meta-reviewer]",
    implementerSubmitStartupPrompt: shouldSubmitStartupPrompt(
      input.context.resolved.bubbleConfig.agents.implementer
    ),
    reviewerSubmitStartupPrompt: shouldSubmitStartupPrompt(
      input.context.resolved.bubbleConfig.agents.reviewer
    ),
    metaReviewerSubmitStartupPrompt: true,
    implementerCommand: buildAgentCommand({
      agentName: input.context.resolved.bubbleConfig.agents.implementer,
      bubbleId: input.context.resolved.bubbleId,
      workspacePath: input.launchWorkspacePath,
      pairflowCommandProfile: input.context.resolved.bubbleConfig.pairflow_command_profile,
      ...(externalPairflowCommand !== undefined
        ? { externalPairflowCommand }
        : {}),
      ...(remoteWorkspaceAuthority !== undefined
        ? { remoteWorkspaceAuthority }
        : {}),
      startupPrompt: buildResumeImplementerStartupPrompt({
        bubbleId: input.context.resolved.bubbleId,
        repoPath: input.context.resolved.repoPath,
        workspacePath: input.launchWorkspacePath,
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
      workspacePath: input.launchWorkspacePath,
      pairflowCommandProfile: input.context.resolved.bubbleConfig.pairflow_command_profile,
      ...(externalPairflowCommand !== undefined
        ? { externalPairflowCommand }
        : {}),
      ...(remoteWorkspaceAuthority !== undefined
        ? { remoteWorkspaceAuthority }
        : {}),
      startupPrompt: buildResumeReviewerStartupPrompt({
        bubbleId: input.context.resolved.bubbleId,
        repoPath: input.context.resolved.repoPath,
        workspacePath: input.launchWorkspacePath,
        taskArtifactPath: input.context.resolved.bubblePaths.taskArtifactPath,
        policySnapshotPathAbs: input.context.policySnapshotPathAbs,
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
      workspacePath: input.launchWorkspacePath,
      pairflowCommandProfile: input.context.resolved.bubbleConfig.pairflow_command_profile,
      ...(externalPairflowCommand !== undefined
        ? { externalPairflowCommand }
        : {}),
      ...(remoteWorkspaceAuthority !== undefined
        ? { remoteWorkspaceAuthority }
        : {}),
      startupPrompt: buildResumeMetaReviewerStartupPrompt({
        bubbleId: input.context.resolved.bubbleId,
        repoPath: input.context.resolved.repoPath,
        workspacePath: input.launchWorkspacePath,
        taskArtifactPath: input.context.resolved.bubblePaths.taskArtifactPath,
        pairflowCommandProfile: input.context.resolved.bubbleConfig.pairflow_command_profile,
        state: input.context.loadedState.state,
        transcriptSummary: input.transcriptSummary,
        ...(input.kickoffDiagnostic !== undefined ? { kickoffDiagnostic: input.kickoffDiagnostic } : {})
      })
    }),
    ...input.resumeKickoffMessages
  });

  return assertRunningLaunchAck({
    bubbleId: input.context.resolved.bubbleId,
    ack
  });
}
