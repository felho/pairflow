import type { AgentName } from "../../../../../contracts/kernel/agentIdentity.js";
import type {
  BubbleReviewAutoReworkSeverity
} from "../../../../shared/reviewPolicy/reviewPolicyTypes.js";
import type { BubbleStateSnapshot } from "../../../../domain/state/bubbleStateSnapshotTypes.js";
import type {
  PairflowCommandProfile,
  ReviewArtifactType
} from "../../../../shared/config/bubbleConfigVocabulary.js";
import {
  buildResumeImplementerKickoffMessage,
  buildResumeMetaReviewerKickoffMessage,
  buildResumeReviewerKickoffMessage,
  formatResumeStateValue,
  inferResumeReviewerProjectionVariant
} from "./startCommandResumeKickoffMessageBuilders.js";

export function resolveResumeKickoffMessages(input: {
  bubbleId: string;
  repoPath: string;
  workspacePath: string;
  taskArtifactPath: string;
  reviewArtifactType: ReviewArtifactType;
  pairflowCommandProfile: PairflowCommandProfile;
  state: BubbleStateSnapshot;
  transcriptSummary: string;
  implementerAgent: AgentName;
  reviewerAgent: AgentName;
  metaReviewerAgent: AgentName;
  reviewerTestDirectiveLine?: string;
  reviewerBlockingMinSeverity?: BubbleReviewAutoReworkSeverity;
}): {
  implementerKickoffMessage?: string;
  reviewerKickoffMessage?: string;
  metaReviewerKickoffMessage?: string;
  kickoffDiagnostic?: string;
} {
  if (
    input.state.state === "RUNNING" &&
    input.state.active_role === "meta_reviewer"
  ) {
    if (input.state.active_agent === input.metaReviewerAgent) {
      return {
        metaReviewerKickoffMessage: buildResumeMetaReviewerKickoffMessage({
          bubbleId: input.bubbleId,
          repoPath: input.repoPath,
          workspacePath: input.workspacePath,
          round: input.state.round,
          pairflowCommandProfile: input.pairflowCommandProfile
        })
      };
    }
    return {
      kickoffDiagnostic: [
        "RUNNING meta-review state active context is inconsistent;",
        `active_role=${formatResumeStateValue(input.state.active_role)},`,
        `active_agent=${formatResumeStateValue(input.state.active_agent)}.`,
        `configured_meta_reviewer=${input.metaReviewerAgent}.`,
        "No meta-review kickoff was sent; continue from transcript/state and reconcile lifecycle ownership before acting."
      ].join(" ")
    };
  }

  if (input.state.state !== "RUNNING") {
    return {};
  }

  if (
    input.state.active_role === "implementer" &&
    input.state.active_agent === input.implementerAgent
  ) {
    return {
      implementerKickoffMessage: buildResumeImplementerKickoffMessage({
        bubbleId: input.bubbleId,
        repoPath: input.repoPath,
        workspacePath: input.workspacePath,
        taskArtifactPath: input.taskArtifactPath,
        round: input.state.round,
        reviewArtifactType: input.reviewArtifactType,
        pairflowCommandProfile: input.pairflowCommandProfile
      })
    };
  }

  if (
    input.state.active_role === "reviewer" &&
    input.state.active_agent === input.reviewerAgent
  ) {
    const projectionVariant = inferResumeReviewerProjectionVariant({
      round: input.state.round,
      transcriptSummary: input.transcriptSummary
    });
    return {
      reviewerKickoffMessage: buildResumeReviewerKickoffMessage({
        bubbleId: input.bubbleId,
        repoPath: input.repoPath,
        workspacePath: input.workspacePath,
        round: input.state.round,
        reviewArtifactType: input.reviewArtifactType,
        pairflowCommandProfile: input.pairflowCommandProfile,
        projectionVariant,
        ...(input.reviewerBlockingMinSeverity !== undefined
          ? {
              reviewerBlockingMinSeverity:
                input.reviewerBlockingMinSeverity
            }
          : {}),
        ...(input.reviewerTestDirectiveLine !== undefined
          ? { reviewerTestDirectiveLine: input.reviewerTestDirectiveLine }
          : {})
      })
    };
  }

  return {
    kickoffDiagnostic: [
      "RUNNING state active context is inconsistent;",
      `active_role=${formatResumeStateValue(input.state.active_role)},`,
      `active_agent=${formatResumeStateValue(input.state.active_agent)}.`,
      "No kickoff was sent; continue using status pane + transcript/state context."
    ].join(" ")
  };
}
