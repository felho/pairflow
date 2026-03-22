import {
  buildReviewerFindingsPassInstruction,
  buildReviewerRoundCommandGateProjection,
  type ReviewerCommandGateProjectionVariant
} from "../../../core/runtime/reviewerCommandGateGuidance.js";
import { buildPairflowCommandGuidance } from "../../../core/runtime/pairflowCommand.js";
import type {
  PairflowCommandProfile,
  ReviewArtifactType
} from "../../../types/bubble.js";
import { buildImplementerEvidenceHandoffGuidance } from "./startCommandPrompts.js";

export function formatResumeStateValue(value: string | number | null): string {
  return value === null ? "none" : String(value);
}

export function inferResumeReviewerProjectionVariant(input: {
  round: number;
  transcriptSummary: string;
}): ReviewerCommandGateProjectionVariant {
  // Round 0-1 never uses converged routing, so we always keep the clean projection.
  if (input.round <= 1) {
    return "clean";
  }

  // For round >=2 we fail closed to the findings projection unless transcript
  // summary clearly reports zero findings with parseable counts.
  const findingsMatches = input.transcriptSummary.match(/\bfindings=(\d+)\b/gu);
  if (findingsMatches === null) {
    return "findings";
  }
  for (const token of findingsMatches) {
    const [, value = "0"] = token.split("=");
    const parsed = Number.parseInt(value, 10);
    if (parsed > 0) {
      return "findings";
    }
  }
  return "clean";
}

export function buildResumeImplementerKickoffMessage(input: {
  bubbleId: string;
  worktreePath: string;
  taskArtifactPath: string;
  round: number;
  reviewArtifactType: ReviewArtifactType;
  pairflowCommandProfile: PairflowCommandProfile;
}): string {
  if (input.round === 0) {
    return [
      `# [pairflow] bubble=${input.bubbleId} resume kickoff (implementer, ideation pending).`,
      "State is RUNNING at round 0.",
      "No implementer action is required right now.",
      "Stay idle and wait for explicit human instruction.",
      "Do not run `pairflow bubble kickoff` yourself."
    ].join(" ");
  }

  return [
    `# [pairflow] bubble=${input.bubbleId} resume kickoff (implementer).`,
    `State is RUNNING at round ${input.round}.`,
    `Re-open task context: ${input.taskArtifactPath}.`,
    buildPairflowCommandGuidance(
      input.worktreePath,
      input.pairflowCommandProfile
    ),
    buildImplementerEvidenceHandoffGuidance(input.reviewArtifactType),
    "Continue active implementation and hand off with `pairflow pass --summary \"<what changed + validation>\"` plus available evidence `--ref` logs when ready."
  ].join(" ");
}

export function buildResumeReviewerKickoffMessage(input: {
  bubbleId: string;
  worktreePath: string;
  round: number;
  reviewArtifactType: ReviewArtifactType;
  pairflowCommandProfile: PairflowCommandProfile;
  reviewerTestDirectiveLine?: string;
  projectionVariant?: ReviewerCommandGateProjectionVariant;
}): string {
  const roundActionLine = buildReviewerRoundCommandGateProjection({
    round: input.round,
    ...(input.projectionVariant !== undefined
      ? { variant: input.projectionVariant }
      : {})
  });
  const findingsDetailLine =
    input.round <= 1
      ? "In round 1, use `pairflow pass --summary ...` and declare findings explicitly (`--finding` when findings exist, `--no-findings` only when truly clean)."
      : buildReviewerFindingsPassInstruction(input.reviewArtifactType);
  return [
    `# [pairflow] bubble=${input.bubbleId} resume kickoff (reviewer).`,
    `State is RUNNING at round ${input.round}.`,
    buildPairflowCommandGuidance(
      input.worktreePath,
      input.pairflowCommandProfile
    ),
    ...(input.reviewerTestDirectiveLine !== undefined
      ? [`Test directive: ${input.reviewerTestDirectiveLine}`]
      : []),
    roundActionLine,
    findingsDetailLine
  ].join(" ");
}

export function buildResumeMetaReviewerKickoffMessage(input: {
  bubbleId: string;
  worktreePath: string;
  round: number;
  pairflowCommandProfile: PairflowCommandProfile;
}): string {
  return [
    `# [pairflow] bubble=${input.bubbleId} resume kickoff (meta-reviewer).`,
    `State is META_REVIEW_RUNNING at round ${input.round}.`,
    buildPairflowCommandGuidance(
      input.worktreePath,
      input.pairflowCommandProfile
    ),
    "Continue the active gate run and submit via `pairflow bubble meta-review submit ...` (no pane marker output parsing)."
  ].join(" ");
}
