import { buildAgentCommand } from "../../startCommandPromptRuntime.js";
import { createStartBubbleError } from "./startCommandRuntime.js";
import {
  buildImplementerIdeationKickoffMessage,
  buildImplementerKickoffMessage,
  buildImplementerStartupPrompt,
  buildStatusPaneCommand
} from "../prompts/startCommandPrompts.js";
import {
  buildResumeImplementerStartupPrompt,
  buildResumeMetaReviewerStartupPrompt,
  buildResumeReviewerStartupPrompt
} from "../prompts/startCommandResumePrompts.js";
import type { resolveResumeKickoffMessages } from "../prompts/startCommandResumePrompts.js";
import type { ResolvedStartBubbleDependencies } from "../../startCommandOrchestration.js";
import type { StartExecutionContext } from "./startCommandContext.js";
import type { AgentName } from "../../../../../contracts/kernel/agentIdentity.js";
import { DEFAULT_REVIEW_POLICY_REVIEWER_BLOCKING_MIN_SEVERITY } from "../../../../../config/defaults.js";
import type { PairflowRemoteWorkspaceAuthority } from "../../../../shared/command/pairflowCommandBootstrap.js";

function shouldSubmitStartupPrompt(
  agentName: AgentName,
  startupPrompt: string | undefined
): boolean {
  return agentName === "codex" && (startupPrompt?.trim().length ?? 0) > 0;
}

function buildStatusPaneLabel(bubbleId: string): string {
  return `[orchestrator/status]-[${bubbleId}]`;
}

function resolveRemoteWorkspaceAuthority(
  context: StartExecutionContext
): PairflowRemoteWorkspaceAuthority | undefined {
  const externalPairflowCommand = context.remoteStartContext?.externalPairflowCommand;
  if (context.remoteStartContext === undefined) {
    return undefined;
  }

  return {
    workspaceRoot: context.remoteStartContext.workspaceRoot,
    ...(externalPairflowCommand !== undefined
      ? { externalPairflowCommand }
      : {})
  };
}

function buildAgentLaunchCommand(input: {
  agentName: AgentName;
  bubbleId: string;
  workspacePath: string;
  pairflowCommandProfile: StartExecutionContext["resolved"]["bubbleConfig"]["pairflow_command_profile"];
  startupPrompt?: string | undefined;
  externalPairflowCommand?: string;
  remoteWorkspaceAuthority?: PairflowRemoteWorkspaceAuthority;
}): string {
  return buildAgentCommand({
    agentName: input.agentName,
    bubbleId: input.bubbleId,
    workspacePath: input.workspacePath,
    pairflowCommandProfile: input.pairflowCommandProfile,
    ...(input.externalPairflowCommand !== undefined
      ? { externalPairflowCommand: input.externalPairflowCommand }
      : {}),
    ...(input.remoteWorkspaceAuthority !== undefined
      ? { remoteWorkspaceAuthority: input.remoteWorkspaceAuthority }
      : {}),
    startupPrompt: input.startupPrompt
  });
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

interface ActiveResumeStartupPrompts {
  implementerStartupPrompt?: string | undefined;
  reviewerStartupPrompt?: string | undefined;
  metaReviewerStartupPrompt?: string | undefined;
}

function buildActiveResumeStartupPrompts(input: {
  context: StartExecutionContext;
  launchWorkspacePath: string;
  transcriptSummary: string;
  reviewerTestDirectiveLine?: string;
  kickoffDiagnostic?: string;
}): ActiveResumeStartupPrompts {
  const loadedState = input.context.loadedState.state;
  if (loadedState.state !== "RUNNING") {
    return {};
  }

  const activeRole = loadedState.active_role;
  const activeAgent = loadedState.active_agent;
  const bubbleConfig = input.context.resolved.bubbleConfig;
  const common = {
    bubbleId: input.context.resolved.bubbleId,
    repoPath: input.context.resolved.repoPath,
    workspacePath: input.launchWorkspacePath,
    taskArtifactPath: input.context.resolved.bubblePaths.taskArtifactPath,
    pairflowCommandProfile: bubbleConfig.pairflow_command_profile,
    state: loadedState,
    transcriptSummary: input.transcriptSummary,
    ...(input.kickoffDiagnostic !== undefined
      ? { kickoffDiagnostic: input.kickoffDiagnostic }
      : {})
  };

  if (activeRole === "implementer" && activeAgent === bubbleConfig.agents.implementer) {
    return {
      implementerStartupPrompt: buildResumeImplementerStartupPrompt({
        ...common,
        reviewArtifactType: bubbleConfig.review_artifact_type,
        validationCommands: bubbleConfig.commands
      })
    };
  }

  if (activeRole === "reviewer" && activeAgent === bubbleConfig.agents.reviewer) {
    return {
      reviewerStartupPrompt: buildResumeReviewerStartupPrompt({
        ...common,
        policySnapshotPathAbs: input.context.policySnapshotPathAbs,
        reviewArtifactType: bubbleConfig.review_artifact_type,
        reviewerBlockingMinSeverity:
          bubbleConfig.review_policy?.reviewer_blocking_min_severity
          ?? DEFAULT_REVIEW_POLICY_REVIEWER_BLOCKING_MIN_SEVERITY,
        ...(input.reviewerTestDirectiveLine !== undefined
          ? { reviewerTestDirectiveLine: input.reviewerTestDirectiveLine }
          : {}),
        ...(input.context.reviewerFocus !== undefined
          ? { reviewerFocus: input.context.reviewerFocus }
          : {}),
        ...(input.context.reviewerBriefText !== undefined
          ? { reviewerBriefText: input.context.reviewerBriefText }
          : {})
      })
    };
  }

  if (activeRole === "meta_reviewer" && activeAgent === bubbleConfig.agents.meta_reviewer) {
    return {
      metaReviewerStartupPrompt: buildResumeMetaReviewerStartupPrompt(common)
    };
  }

  return {};
}

export async function launchFreshTmuxSession(input: {
  context: StartExecutionContext;
  deps: ResolvedStartBubbleDependencies;
  ideationPending: boolean;
  launchWorkspacePath: string;
}): Promise<{ sessionName: string }> {
  const externalPairflowCommand =
    input.context.remoteStartContext?.externalPairflowCommand;
  const remoteWorkspaceAuthority = resolveRemoteWorkspaceAuthority(input.context);
  const metaReviewerAgent = input.context.resolved.bubbleConfig.agents.meta_reviewer;
  const implementerStartupPrompt = buildImplementerStartupPrompt({
    bubbleId: input.context.resolved.bubbleId,
    repoPath: input.context.resolved.repoPath,
    workspacePath: input.launchWorkspacePath,
    taskArtifactPath: input.context.resolved.bubblePaths.taskArtifactPath,
    reviewArtifactType: input.context.resolved.bubbleConfig.review_artifact_type,
    pairflowCommandProfile: input.context.resolved.bubbleConfig.pairflow_command_profile,
    ideationPending: input.ideationPending,
    validationCommands: input.context.resolved.bubbleConfig.commands
  });
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
    metaReviewerPaneLabel: `[${metaReviewerAgent}/meta-reviewer]`,
    implementerSubmitStartupPrompt: shouldSubmitStartupPrompt(
      input.context.resolved.bubbleConfig.agents.implementer,
      implementerStartupPrompt
    ),
    reviewerSubmitStartupPrompt: false,
    metaReviewerSubmitStartupPrompt: false,
    implementerCommand: buildAgentLaunchCommand({
      agentName: input.context.resolved.bubbleConfig.agents.implementer,
      bubbleId: input.context.resolved.bubbleId,
      workspacePath: input.launchWorkspacePath,
      pairflowCommandProfile: input.context.resolved.bubbleConfig.pairflow_command_profile,
      ...(externalPairflowCommand !== undefined ? { externalPairflowCommand } : {}),
      ...(remoteWorkspaceAuthority !== undefined ? { remoteWorkspaceAuthority } : {}),
      startupPrompt: implementerStartupPrompt
    }),
    reviewerCommand: buildAgentLaunchCommand({
      agentName: input.context.resolved.bubbleConfig.agents.reviewer,
      bubbleId: input.context.resolved.bubbleId,
      workspacePath: input.launchWorkspacePath,
      pairflowCommandProfile: input.context.resolved.bubbleConfig.pairflow_command_profile,
      ...(externalPairflowCommand !== undefined ? { externalPairflowCommand } : {}),
      ...(remoteWorkspaceAuthority !== undefined ? { remoteWorkspaceAuthority } : {}),
      startupPrompt: undefined
    }),
    metaReviewerCommand: buildAgentLaunchCommand({
      agentName: metaReviewerAgent,
      bubbleId: input.context.resolved.bubbleId,
      workspacePath: input.launchWorkspacePath,
      pairflowCommandProfile: input.context.resolved.bubbleConfig.pairflow_command_profile,
      ...(externalPairflowCommand !== undefined ? { externalPairflowCommand } : {}),
      ...(remoteWorkspaceAuthority !== undefined ? { remoteWorkspaceAuthority } : {}),
      startupPrompt: undefined
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
          pairflowCommandProfile: input.context.resolved.bubbleConfig.pairflow_command_profile,
          validationCommands: input.context.resolved.bubbleConfig.commands
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
  const remoteWorkspaceAuthority = resolveRemoteWorkspaceAuthority(input.context);
  const metaReviewerAgent = input.context.resolved.bubbleConfig.agents.meta_reviewer;
  const {
    implementerStartupPrompt,
    reviewerStartupPrompt,
    metaReviewerStartupPrompt
  } = buildActiveResumeStartupPrompts(input);
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
    metaReviewerPaneLabel: `[${metaReviewerAgent}/meta-reviewer]`,
    implementerSubmitStartupPrompt: shouldSubmitStartupPrompt(
      input.context.resolved.bubbleConfig.agents.implementer,
      implementerStartupPrompt
    ),
    reviewerSubmitStartupPrompt: shouldSubmitStartupPrompt(
      input.context.resolved.bubbleConfig.agents.reviewer,
      reviewerStartupPrompt
    ),
    metaReviewerSubmitStartupPrompt: shouldSubmitStartupPrompt(
      metaReviewerAgent,
      metaReviewerStartupPrompt
    ),
    implementerCommand: buildAgentLaunchCommand({
      agentName: input.context.resolved.bubbleConfig.agents.implementer,
      bubbleId: input.context.resolved.bubbleId,
      workspacePath: input.launchWorkspacePath,
      pairflowCommandProfile: input.context.resolved.bubbleConfig.pairflow_command_profile,
      ...(externalPairflowCommand !== undefined ? { externalPairflowCommand } : {}),
      ...(remoteWorkspaceAuthority !== undefined ? { remoteWorkspaceAuthority } : {}),
      startupPrompt: implementerStartupPrompt
    }),
    reviewerCommand: buildAgentLaunchCommand({
      agentName: input.context.resolved.bubbleConfig.agents.reviewer,
      bubbleId: input.context.resolved.bubbleId,
      workspacePath: input.launchWorkspacePath,
      pairflowCommandProfile: input.context.resolved.bubbleConfig.pairflow_command_profile,
      ...(externalPairflowCommand !== undefined ? { externalPairflowCommand } : {}),
      ...(remoteWorkspaceAuthority !== undefined ? { remoteWorkspaceAuthority } : {}),
      startupPrompt: reviewerStartupPrompt
    }),
    metaReviewerCommand: buildAgentLaunchCommand({
      agentName: metaReviewerAgent,
      bubbleId: input.context.resolved.bubbleId,
      workspacePath: input.launchWorkspacePath,
      pairflowCommandProfile: input.context.resolved.bubbleConfig.pairflow_command_profile,
      ...(externalPairflowCommand !== undefined ? { externalPairflowCommand } : {}),
      ...(remoteWorkspaceAuthority !== undefined ? { remoteWorkspaceAuthority } : {}),
      startupPrompt: metaReviewerStartupPrompt
    }),
    ...input.resumeKickoffMessages
  });

  return assertRunningLaunchAck({
    bubbleId: input.context.resolved.bubbleId,
    ack
  });
}
