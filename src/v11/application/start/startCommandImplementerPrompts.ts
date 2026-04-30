import {
  buildCanonicalActorEmitLookupGuidance,
  buildImplementerEvidenceHandoffGuidance as buildImplementerEvidenceHandoffGuidanceFromRegistry,
  buildRolePromptConcernLines
} from "../actorProtocol/roleDescriptorRegistry.js";
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
    "Start implementation immediately in this launch workspace (Phase 1C1 no-split worktree root).",
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
