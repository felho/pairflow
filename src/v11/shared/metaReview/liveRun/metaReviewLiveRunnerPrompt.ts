import type { MetaReviewLiveRunnerInput } from "./metaReviewLiveRunContract.js";

export function buildCodexMetaReviewSchema(): string {
  const schema = {
    type: "object",
    properties: {
      recommendation: {
        type: "string",
        enum: ["approve", "rework", "inconclusive"]
      },
      summary: {
        type: "string"
      },
      rework_target_message: {
        type: ["string", "null"]
      }
    },
    required: [
      "recommendation",
      "summary",
      "rework_target_message"
    ],
    additionalProperties: false
  } as const;
  return `${JSON.stringify(schema, null, 2)}\n`;
}

export function buildMetaReviewPrompt(input: MetaReviewLiveRunnerInput): string {
  const depthDirective =
    input.depth === "deep"
      ? "Use deep mode: exhaustive verification with explicit evidence."
      : "Use standard mode: focused but complete verification.";
  return [
    "You are the Pairflow autonomous meta-reviewer.",
    "",
    `Bubble ID: ${input.bubbleId}`,
    `Run ID: ${input.runId}`,
    `Repository root: ${input.repoPath}`,
    `Bubble worktree: ${input.worktreePath}`,
    `Transcript path: ${input.transcriptPath}`,
    `Current lifecycle state: ${input.state.state}`,
    `Current round: ${input.state.round}`,
    `Reviewer agent: ${input.reviewerAgent}`,
    "",
    depthDirective,
    "",
    "Task:",
    "1. Inspect the bubble worktree and transcript/evidence context.",
    "2. Decide recommendation: rework | approve | inconclusive.",
    "3. Return JSON only, matching the required schema.",
    "",
    "Rules:",
    '- "summary" must be concise and specific.',
    '- if recommendation is "rework", "rework_target_message" must be non-empty and actionable.',
    '- if recommendation is not "rework", "rework_target_message" must be null.',
    "- Do not modify repository files; read-only review only."
  ].join("\n");
}

export function buildPaneMetaReviewPrompt(
  input: MetaReviewLiveRunnerInput
): string {
  const beginPrefix = "PAIRFLOW_META_REVIEW_JSON_BEGIN";
  const endPrefix = "PAIRFLOW_META_REVIEW_JSON_END";
  return [
    buildMetaReviewPrompt(input),
    "",
    "Output contract:",
    "- Return your final answer as a single JSON object.",
    "- Emit no prose outside the marker block below.",
    `- Begin marker prefix: ${beginPrefix}`,
    `- End marker prefix: ${endPrefix}`,
    `- Marker run id: ${input.runId}`,
    "- Compose markers exactly as <prefix>:<run-id> (no extra spaces).",
    "- Print the begin marker on its own line, then the JSON object.",
    "- Print the JSON object in between markers.",
    "- Print the end marker on its own line after the JSON object.",
    "- Do not wrap the JSON in markdown fences."
  ].join("\n");
}

