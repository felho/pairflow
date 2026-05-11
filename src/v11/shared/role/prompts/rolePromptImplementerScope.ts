import type { PersistedBubbleStateSnapshot } from "../../../domain/state/snapshot/persistedBubbleStateSnapshot.js";
import type {
  ReviewArtifactType
} from "../../config/bubbleConfigVocabulary.js";
import { buildDocumentBubbleSourceEditGuard } from "../../document/documentBubbleSourceEditGuard.js";

export function buildImplementerStartActionLine(
  reviewArtifactType: ReviewArtifactType | undefined
): string {
  if (reviewArtifactType === "document") {
    return [
      "Refine document/task/spec artifacts in this launch workspace.",
      buildDocumentBubbleSourceEditGuard(),
      "Do not implement product/runtime/source-code changes for document-scope bubbles; route back or ask for clarification if code edits are required."
    ].join(" ");
  }

  return "Implement in this launch workspace and run relevant validation before handoff.";
}

export function resolveImplementerRoleInstruction(input: {
  reviewArtifactType: ReviewArtifactType | undefined;
  state: PersistedBubbleStateSnapshot;
}): string {
  if (input.reviewArtifactType === "document") {
    if (input.state.state === "RUNNING" && input.state.active_role === "implementer") {
      return [
        "You are currently active. Continue document/task/spec refinement now.",
        buildDocumentBubbleSourceEditGuard(),
        "Do not edit product/runtime source code in document scope."
      ].join(" ");
    }
    return [
      "Continue document/task/spec refinement when you become active; otherwise stand by.",
      buildDocumentBubbleSourceEditGuard()
    ].join(" ");
  }

  if (input.state.state === "RUNNING" && input.state.active_role === "implementer") {
    return "You are currently active. Continue implementation now.";
  }
  return "Continue implementation when you become active; otherwise stand by.";
}
