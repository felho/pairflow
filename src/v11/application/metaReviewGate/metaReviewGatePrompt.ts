import {
  buildMetaReviewSubmitApproveParityNote,
  buildMetaReviewSubmitCommandTemplate
} from "../../shared/metaReview/metaReviewSubmitGuidance.js";

export function buildMetaReviewGateRunPrompt(input: {
  bubbleId: string;
  round: number;
  repoPath: string;
  taskArtifactPath: string;
}): string {
  return [
    `# [pairflow] bubble=${input.bubbleId} meta-review request round=${input.round}.`,
    "Perform autonomous meta-review now, then submit through structured Pairflow CLI (no pane markers).",
    `Repository: ${input.repoPath}.`,
    `Task: ${input.taskArtifactPath}.`,
    "Before emit, fetch fresh actor authority with `pairflow bubble status --json` and use the current `executionContext.handoffId` and `executionContext.executionId`.",
    `Required command (include --report-json parity fields): ${buildMetaReviewSubmitCommandTemplate({ bubbleId: input.bubbleId, round: input.round })}.`,
    buildMetaReviewSubmitApproveParityNote(),
    "Do not modify transcript, inbox, or state files manually."
  ].join(" ");
}
