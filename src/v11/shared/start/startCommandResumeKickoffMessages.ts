import type {
  BubbleStateSnapshot,
  PairflowCommandProfile,
  ReviewArtifactType
} from "../../../types/bubble.js";
import {
  buildResumeImplementerKickoffMessage,
  buildResumeMetaReviewerKickoffMessage,
  buildResumeReviewerKickoffMessage,
  formatResumeStateValue,
  inferResumeReviewerProjectionVariant
} from "./startCommandResumeKickoffMessageBuilders.js";

export function resolveResumeKickoffMessages(input: {
  bubbleId: string;
  worktreePath: string;
  taskArtifactPath: string;
  reviewArtifactType: ReviewArtifactType;
  pairflowCommandProfile: PairflowCommandProfile;
  state: BubbleStateSnapshot;
  transcriptSummary: string;
  implementerAgent: string;
  reviewerAgent: string;
  reviewerTestDirectiveLine?: string;
}): {
  implementerKickoffMessage?: string;
  reviewerKickoffMessage?: string;
  metaReviewerKickoffMessage?: string;
  kickoffDiagnostic?: string;
} {
  if (input.state.state === "META_REVIEW_RUNNING") {
    if (
      input.state.active_role === "meta_reviewer" &&
      input.state.active_agent === "codex"
    ) {
      return {
        metaReviewerKickoffMessage: buildResumeMetaReviewerKickoffMessage({
          bubbleId: input.bubbleId,
          worktreePath: input.worktreePath,
          round: input.state.round,
          pairflowCommandProfile: input.pairflowCommandProfile
        })
      };
    }
    return {
      kickoffDiagnostic: [
        "META_REVIEW_RUNNING state active context is inconsistent;",
        `active_role=${formatResumeStateValue(input.state.active_role)},`,
        `active_agent=${formatResumeStateValue(input.state.active_agent)}.`,
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
        worktreePath: input.worktreePath,
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
        worktreePath: input.worktreePath,
        round: input.state.round,
        reviewArtifactType: input.reviewArtifactType,
        pairflowCommandProfile: input.pairflowCommandProfile,
        projectionVariant,
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
