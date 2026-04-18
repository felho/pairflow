import {
  buildReviewerFindingsPassInstruction,
  buildReviewerRoundCommandGateProjection,
  type ReviewerCommandGateProjectionVariant
} from "../../shared/reviewer/reviewerCommandGateGuidance.js";
import { buildPairflowCommandGuidance } from "./startCommandPromptRuntime.js";
import type {
  PairflowCommandProfile,
  ReviewArtifactType
} from "../../../types/bubble.js";
import { buildImplementerEvidenceHandoffGuidance } from "./startCommandPrompts.js";

export function formatResumeStateValue(value: string | number | null): string {
  return value === null ? "none" : String(value);
}

function buildResumeCanonicalActorEmitLookupGuidance(bubbleId: string): string {
  return `Before direct canonical emit, refresh actor authority from this launch workspace with \`pairflow bubble status --id ${bubbleId} --json\` and copy the current \`executionContext.handoffId\` and \`executionContext.executionId\`. Repeat this before each emit because authority can change after every successful handoff, convergence, meta-review transition, or human reply.`;
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
  workspacePath: string;
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
      input.workspacePath,
      input.pairflowCommandProfile
    ),
    buildResumeCanonicalActorEmitLookupGuidance(input.bubbleId),
    buildImplementerEvidenceHandoffGuidance(input.reviewArtifactType),
    "Continue active implementation and hand off with `pairflow agent emit --kind pass --repo <repo> --bubble-id <id> --handoff-id <handoff-id> --execution-id <execution-id> --summary \"<what changed + validation>\"` plus available evidence `--ref` logs when ready."
  ].join(" ");
}

export function buildResumeReviewerKickoffMessage(input: {
  bubbleId: string;
  workspacePath: string;
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
      ? "In round 1, use `pairflow agent emit --kind pass ...` and declare findings explicitly (`--finding` when findings exist, `--no-findings` only when truly clean)."
      : buildReviewerFindingsPassInstruction(input.reviewArtifactType);
  return [
    `# [pairflow] bubble=${input.bubbleId} resume kickoff (reviewer).`,
    `State is RUNNING at round ${input.round}.`,
    buildPairflowCommandGuidance(
      input.workspacePath,
      input.pairflowCommandProfile
    ),
    buildResumeCanonicalActorEmitLookupGuidance(input.bubbleId),
    ...(input.reviewerTestDirectiveLine !== undefined
      ? [`Test directive: ${input.reviewerTestDirectiveLine}`]
      : []),
    roundActionLine,
    findingsDetailLine
  ].join(" ");
}

export function buildResumeMetaReviewerKickoffMessage(input: {
  bubbleId: string;
  workspacePath: string;
  round: number;
  pairflowCommandProfile: PairflowCommandProfile;
}): string {
  return [
    `# [pairflow] bubble=${input.bubbleId} resume kickoff (meta-reviewer).`,
    `State is RUNNING with active meta-review authority at round ${input.round}.`,
    buildPairflowCommandGuidance(
      input.workspacePath,
      input.pairflowCommandProfile
    ),
    buildResumeCanonicalActorEmitLookupGuidance(input.bubbleId),
    "Continue the active gate run and submit via `pairflow agent emit --kind meta_review_result ...` (no pane marker output parsing)."
  ].join(" ");
}
