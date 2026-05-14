import {
  buildReviewerBlockingThresholdAuthorityLine,
  buildReviewerBlockingThresholdLabel,
  buildReviewerDocumentScopeThresholdRoutingNote
} from "./reviewerCommandGateGuidance.js";
import {
  reviewerSeverityOntologyFullMarkdown,
  reviewerSeverityOntologySourceDoc
} from "./reviewerSeverityOntology.generated.js";
import type {
  BubbleReviewAutoReworkSeverity
} from "../reviewPolicy/reviewPolicyTypes.js";

export const reviewerPolicySnapshotFileName = "reviewer-policy-snapshot.md";

export function buildReviewerPolicySnapshotContent(input: {
  reviewerBlockingMinSeverity: BubbleReviewAutoReworkSeverity;
}): string {
  const thresholdLabel = buildReviewerBlockingThresholdLabel({
    reviewerBlockingMinSeverity: input.reviewerBlockingMinSeverity
  });
  return [
    "# Reviewer Policy Snapshot",
    "",
    "## Runtime Review Threshold",
    `- Current post-gate routing threshold: \`${thresholdLabel}\`.`,
    `- ${buildReviewerBlockingThresholdAuthorityLine({
      reviewerBlockingMinSeverity: input.reviewerBlockingMinSeverity
    })}`,
    "- This threshold controls reviewer PASS vs convergence after `severity_gate_round`; it does not redefine the canonical `P0/P1/P2/P3` severity meanings.",
    `- ${buildReviewerDocumentScopeThresholdRoutingNote()}`,
    `- Canonical ontology source: \`${reviewerSeverityOntologySourceDoc}\`.`,
    "",
    "## Canonical Severity Ontology",
    "",
    reviewerSeverityOntologyFullMarkdown,
    ""
  ].join("\n");
}
