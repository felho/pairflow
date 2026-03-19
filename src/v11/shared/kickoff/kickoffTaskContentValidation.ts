const IDEATION_PLACEHOLDER_CONTENT_MARKER = /metadata_source:\s*ideation_placeholder/iu;

function isIdeationPlaceholderTaskContent(content: string): boolean {
  return IDEATION_PLACEHOLDER_CONTENT_MARKER.test(content);
}

type KickoffTaskContentValidationIssue = "empty" | "placeholder";

function resolveKickoffTaskContentValidationIssue(
  content: string
): KickoffTaskContentValidationIssue | null {
  if (content.trim().length === 0) {
    return "empty";
  }
  if (isIdeationPlaceholderTaskContent(content)) {
    return "placeholder";
  }
  return null;
}

export function assertKickoffTaskContentIsValid(input: {
  content: string;
  errors: {
    empty: () => Error;
    placeholder: () => Error;
  };
}): void {
  const issue = resolveKickoffTaskContentValidationIssue(input.content);
  if (issue === "empty") {
    // reason_code=KICKOFF_TASK_CONTENT_EMPTY context=kickoff_task_input_validation
    throw input.errors.empty();
  }
  if (issue === "placeholder") {
    // reason_code=KICKOFF_TASK_CONTENT_PLACEHOLDER_MARKER context=kickoff_task_input_validation
    throw input.errors.placeholder();
  }
}
