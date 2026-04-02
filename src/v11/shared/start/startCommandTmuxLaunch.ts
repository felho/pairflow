import { buildAgentCommand } from "../../../core/runtime/agentCommand.js";
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

export async function launchFreshTmuxSession(input: {
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

export async function launchResumeTmuxSession(input: {
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
