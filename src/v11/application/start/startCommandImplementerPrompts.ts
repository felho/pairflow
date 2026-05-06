import {
  buildCanonicalActorEmitLookupGuidance,
  buildImplementerEvidenceHandoffGuidance as buildImplementerEvidenceHandoffGuidanceFromRegistry,
  buildRolePromptConcernLines
} from "../actorProtocol/roleDescriptorRegistry.js";
import { buildDocumentBubbleSourceEditGuard } from "../../shared/document/documentBubbleSourceEditGuard.js";
import { buildPairflowCommandGuidance } from "./startCommandPromptRuntime.js";
import type {
  BubbleCommandsConfig,
  PairflowCommandProfile,
  ReviewArtifactType
} from "../../../types/bubble.js";

export function buildImplementerStartupPrompt(input: {
  bubbleId: string;
  repoPath: string;
  workspacePath: string;
  taskArtifactPath: string;
  reviewArtifactType: ReviewArtifactType;
  pairflowCommandProfile: PairflowCommandProfile;
  ideationPending: boolean;
  validationCommands?: BubbleCommandsConfig;
}): string {
  return buildRolePromptConcernLines({
    role: "implementer",
    phase: "startup",
    context: input
  }).join(" ");
}

export function buildImplementerKickoffMessage(input: {
  bubbleId: string;
  workspacePath: string;
  taskArtifactPath: string;
  reviewArtifactType: ReviewArtifactType;
  pairflowCommandProfile: PairflowCommandProfile;
  validationCommands?: BubbleCommandsConfig;
}): string {
  return [
    `# [pairflow] bubble=${input.bubbleId} kickoff.`,
    `Read task file now: ${input.taskArtifactPath}.`,
    buildImplementerKickoffScopeInstruction(input.reviewArtifactType),
    buildPairflowCommandGuidance(
      input.workspacePath,
      input.pairflowCommandProfile
    ),
    buildImplementerEvidenceHandoffGuidance(
      input.reviewArtifactType,
      input.validationCommands
    ),
    buildCanonicalActorEmitLookupGuidance({
      bubbleId: input.bubbleId,
      repoPath: "<repo>"
    }),
    "When done with validation, hand off with `pairflow agent emit --kind pass --repo <repo> --bubble-id <id> --handoff-id <handoff-id> --execution-id <execution-id> --summary \"<what changed + validation>\"` and include available evidence `--ref` log paths."
  ].join(" ");
}

export function buildImplementerKickoffScopeInstruction(
  reviewArtifactType: ReviewArtifactType
): string {
  if (reviewArtifactType === "document") {
    return [
      "Document refinement mode (`review_artifact_type=document`): refine only the task/spec/progress/docs artifacts required by the task.",
      buildDocumentBubbleSourceEditGuard(),
      "Do not implement product/runtime/source-code changes in this bubble, even if the task describes an eventual implementation.",
      "If the requested outcome cannot be completed without product/source edits, stop and emit a blocker or route-back/replan request instead of making those code changes."
    ].join(" ");
  }

  return "Start implementation immediately in this launch workspace (Phase 1C1 no-split worktree root).";
}

export function buildImplementerIdeationKickoffMessage(input: {
  bubbleId: string;
  workspacePath: string;
  taskArtifactPath: string;
  pairflowCommandProfile: PairflowCommandProfile;
}): string {
  return [
    `# [pairflow] bubble=${input.bubbleId} kickoff (ideation pending).`,
    "This bubble is in ideation mode; no implementer action is required.",
    "Stay idle and wait for explicit human instruction.",
    "Do not run `pairflow bubble kickoff` yourself and do not emit implementer/reviewer handoff yet."
  ].join(" ");
}

export function buildImplementerEvidenceHandoffGuidance(
  reviewArtifactType: ReviewArtifactType,
  validationCommands?: BubbleCommandsConfig
): string {
  return buildImplementerEvidenceHandoffGuidanceFromRegistry(
    reviewArtifactType,
    validationCommands
  );
}
