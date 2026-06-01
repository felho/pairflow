const guidancePath = "docs/commit-message-guidance.md";

const conventionalTypes = [
  "feat",
  "fix",
  "perf",
  "refactor",
  "docs",
  "test",
  "build",
  "ci",
  "chore"
] as const;

export type CommitMessagePolicyAcceptedClass =
  | "conventional_content"
  | "breaking_conventional_content"
  | "merge_artifact"
  | "revert_recovery";

export type CommitMessagePolicyRejectedClass =
  | "historical_finalize"
  | "ambiguous_prose"
  | "empty_message"
  | "body_only_conventional_candidate";

export type CommitMessagePolicyClass =
  | CommitMessagePolicyAcceptedClass
  | CommitMessagePolicyRejectedClass;

export type CommitMessagePolicyReasonCode =
  | "accepted_conventional"
  | "accepted_breaking_conventional"
  | "accepted_merge_artifact"
  | "accepted_revert_recovery"
  | "rejected_finalize"
  | "rejected_ambiguous"
  | "rejected_empty"
  | "rejected_body_only_conventional";

export type CommitMessagePolicyAcceptedResult = {
  status: "accepted";
  class: CommitMessagePolicyAcceptedClass;
  reason_code: Extract<
    CommitMessagePolicyReasonCode,
    | "accepted_conventional"
    | "accepted_breaking_conventional"
    | "accepted_merge_artifact"
    | "accepted_revert_recovery"
  >;
  message: string;
};

export type CommitMessagePolicyRejectedResult = {
  status: "rejected";
  class: CommitMessagePolicyRejectedClass;
  reason_code: Extract<
    CommitMessagePolicyReasonCode,
    | "rejected_finalize"
    | "rejected_ambiguous"
    | "rejected_empty"
    | "rejected_body_only_conventional"
  >;
  message: string;
};

export type CommitMessagePolicyResult =
  | CommitMessagePolicyAcceptedResult
  | CommitMessagePolicyRejectedResult;

const typeAlternation = conventionalTypes.join("|");
const conventionalHeaderPattern = new RegExp(
  `^(${typeAlternation})(\\([A-Za-z0-9._/-]+\\))?(!)?: .+`,
  "u"
);
const conventionalRevertPattern = /^revert(\([A-Za-z0-9._/-]+\))?(!)?: .+/u;
const standardRevertPattern = /^Revert ".+"/u;
const mergeArtifactPattern = /^Merge (branch|remote-tracking branch) .+/u;
const historicalFinalizePattern = /^bubble\([^)]+\): finalize\b/u;

function firstLineFrom(message: string): string {
  return message.split(/\r?\n/u, 1)[0]?.trimEnd() ?? "";
}

function hasBodyOnlyConventionalCandidate(message: string): boolean {
  const [, ...bodyLines] = message.split(/\r?\n/u);
  return bodyLines.some((line) => {
    const candidate = line.trim();
    return (
      conventionalHeaderPattern.test(candidate)
      || conventionalRevertPattern.test(candidate)
    );
  });
}

export function classifyCommitMessage(
  message: string
): CommitMessagePolicyResult {
  const firstLine = firstLineFrom(message);
  if (firstLine.trim().length === 0) {
    return {
      status: "rejected",
      class: "empty_message",
      reason_code: "rejected_empty",
      message: `Commit message first line is empty. See ${guidancePath}.`
    };
  }

  if (mergeArtifactPattern.test(firstLine)) {
    return {
      status: "accepted",
      class: "merge_artifact",
      reason_code: "accepted_merge_artifact",
      message: "Accepted merge artifact; it is not release authority."
    };
  }

  if (
    standardRevertPattern.test(firstLine)
    || conventionalRevertPattern.test(firstLine)
  ) {
    return {
      status: "accepted",
      class: "revert_recovery",
      reason_code: "accepted_revert_recovery",
      message: "Accepted revert recovery commit."
    };
  }

  const conventionalMatch = conventionalHeaderPattern.exec(firstLine);
  if (conventionalMatch !== null) {
    const hasBreakingMarker = conventionalMatch[3] === "!";
    return {
      status: "accepted",
      class: hasBreakingMarker
        ? "breaking_conventional_content"
        : "conventional_content",
      reason_code: hasBreakingMarker
        ? "accepted_breaking_conventional"
        : "accepted_conventional",
      message: hasBreakingMarker
        ? "Accepted breaking conventional content commit."
        : "Accepted conventional content commit."
    };
  }

  if (historicalFinalizePattern.test(firstLine)) {
    return {
      status: "rejected",
      class: "historical_finalize",
      reason_code: "rejected_finalize",
      message: `Finalize-style lifecycle messages are rejected for new commits. See ${guidancePath}.`
    };
  }

  if (hasBodyOnlyConventionalCandidate(message)) {
    return {
      status: "rejected",
      class: "body_only_conventional_candidate",
      reason_code: "rejected_body_only_conventional",
      message: `Classification is first-line only; body conventional candidates do not rescue invalid headers. See ${guidancePath}.`
    };
  }

  return {
    status: "rejected",
    class: "ambiguous_prose",
    reason_code: "rejected_ambiguous",
    message: `Commit message first line must use an accepted policy form. See ${guidancePath}.`
  };
}
