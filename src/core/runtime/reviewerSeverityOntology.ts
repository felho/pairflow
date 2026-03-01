import {
  reviewerSeverityOntologyFullPromptText,
  reviewerSeverityOntologyRuntimeReminderText,
  reviewerSeverityOntologySourceDoc
} from "./reviewerSeverityOntology.generated.js";

export interface ReviewerSeverityOntologyReminderOptions {
  includeFullOntology?: boolean;
}

export function buildReviewerSeverityOntologyReminder(
  options: ReviewerSeverityOntologyReminderOptions = {}
): string {
  const includeFullOntology = options.includeFullOntology ?? false;
  const parts = [
    `Severity Ontology v1 reminder (embedded from canonical docs at build-time: \`${reviewerSeverityOntologySourceDoc}#runtime-reminder\`): ${reviewerSeverityOntologyRuntimeReminderText}`
  ];

  if (includeFullOntology) {
    parts.push(
      `Full canonical ontology (embedded from \`${reviewerSeverityOntologySourceDoc}\`): ${reviewerSeverityOntologyFullPromptText}`
    );
  }

  return parts.join(" ");
}
