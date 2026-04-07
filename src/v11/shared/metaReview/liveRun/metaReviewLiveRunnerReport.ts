import type { MetaReviewLiveRunnerInput } from "./metaReviewLiveRunContract.js";

function buildMetaReviewRunnerReportBase(input: MetaReviewLiveRunnerInput): Record<
  string,
  unknown
> {
  return {
    mode: "agent",
    depth: input.depth,
    bubble_id: input.bubbleId,
    run_id: input.runId
  };
}

export function buildCodexExecRunnerReport(
  input: MetaReviewLiveRunnerInput
): Record<string, unknown> {
  return {
    source: "codex-exec",
    ...buildMetaReviewRunnerReportBase(input)
  };
}

export function buildCodexPaneRunnerReport(
  input: MetaReviewLiveRunnerInput
): Record<string, unknown> {
  return {
    source: "codex-pane",
    ...buildMetaReviewRunnerReportBase(input)
  };
}

