import type { ReviewArtifactType } from "../../types/bubble.js";

export function buildReviewerAgentSelectionGuidance(
  reviewArtifactType: ReviewArtifactType
): string {
  if (reviewArtifactType === "code") {
    return "IMPORTANT: This bubble primarily targets code changes. If a `feature-dev:code-reviewer` agent is available (check with /help or Task tool), use it for review; fall back to manual `/review` only if the agent is unavailable.";
  }

  if (reviewArtifactType === "document") {
    return "IMPORTANT: This bubble primarily targets document/task artifacts. Do not force `feature-dev:code-reviewer` for document-only review. Use document-focused review (scope, consistency, acceptance criteria, risks), and only use code-reviewer if substantial code changes are in scope.";
  }

  return "IMPORTANT: Choose review mode by deliverable type. For code-centric changes, prefer `feature-dev:code-reviewer` (fall back to `/review` if unavailable). For document-centric tasks, use document-focused review and do not force code-reviewer.";
}
