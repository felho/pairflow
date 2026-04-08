import { buildResumeTranscriptSummaryFallback } from "./startCommandResumeSummary.js";
import {
  formatReviewerTestExecutionDirective,
  resolveReviewerTestEvidenceArtifactPath,
} from "../../shared/reviewer/testEvidence.js";
import { resolveResumeKickoffMessages } from "./startCommandResumePrompts.js";
import type { ResolvedStartBubbleDependencies } from "./startCommandOrchestration.js";
import type { StartExecutionContext } from "./startCommandContext.js";

export interface PreparedResumeLaunchInput {
  transcriptSummary: string;
  reviewerTestDirectiveLine: string | undefined;
  kickoffDiagnostic: string | undefined;
  resumeKickoffMessages: Omit<
    ReturnType<typeof resolveResumeKickoffMessages>,
    "kickoffDiagnostic"
  >;
}

export async function prepareResumeLaunchInput(input: {
  context: StartExecutionContext;
  deps: ResolvedStartBubbleDependencies;
}): Promise<PreparedResumeLaunchInput> {
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
    ? await input.deps.resolveReviewerTestExecutionDirective({
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
  return {
    transcriptSummary,
    reviewerTestDirectiveLine,
    kickoffDiagnostic,
    resumeKickoffMessages
  };
}
