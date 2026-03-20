import {
  buildReviewerFindingsPassInstruction,
  buildReviewerRoundCommandGateProjection,
  type ReviewerCommandGateProjectionVariant
} from "../../../core/runtime/reviewerCommandGateGuidance.js";
import { buildPairflowCommandGuidance } from "../../../core/runtime/pairflowCommand.js";
import type {
  BubbleStateSnapshot,
  PairflowCommandProfile,
  ReviewArtifactType
} from "../../../types/bubble.js";
import { buildImplementerEvidenceHandoffGuidance } from "./startCommandPrompts.js";

function formatResumeStateValue(value: string | number | null): string {
  return value === null ? "none" : String(value);
}

function inferResumeReviewerProjectionVariant(input: {
  round: number;
  transcriptSummary: string;
}): ReviewerCommandGateProjectionVariant {
  if (input.round <= 1) {
    return "clean";
  }

  const findingsMatches = input.transcriptSummary.match(/\bfindings=(\d+)\b/gu);
  if (findingsMatches === null) {
    return "findings";
  }
  for (const token of findingsMatches) {
    const [, value = "0"] = token.split("=");
    const parsed = Number.parseInt(value, 10);
    if (!Number.isFinite(parsed)) {
      return "findings";
    }
    if (parsed > 0) {
      return "findings";
    }
  }
  return "clean";
}

function buildResumeImplementerKickoffMessage(input: {
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

function buildResumeReviewerKickoffMessage(input: {
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
      ? "In round 1, declare findings explicitly with `--finding` or `--no-findings` when using `pairflow pass`."
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

function buildResumeMetaReviewerKickoffMessage(input: {
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
