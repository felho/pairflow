import {
  normalizeStringList,
  requireNonEmptyString
} from "../../../core/util/normalize.js";

export interface NormalizeApprovalDecisionInputInput {
  bubbleId: string;
  decision: string;
  overrideReason?: string | undefined;
  message?: string | undefined;
  refs?: string[] | undefined;
  repoPath?: string | undefined;
  cwd?: string | undefined;
  now?: Date | undefined;
  createApprovalCommandError: (message: string) => Error;
}

export interface NormalizedApprovalDecisionInput {
  bubbleId: string;
  decision: string;
  overrideReason?: string | undefined;
  message?: string | undefined;
  refs: string[];
  repoPath?: string | undefined;
  cwd?: string | undefined;
  now: Date;
}

export interface NormalizeRequestReworkInputInput {
  bubbleId: string;
  message: string;
  refs?: string[] | undefined;
  repoPath?: string | undefined;
  cwd?: string | undefined;
  now?: Date | undefined;
  createApprovalCommandError: (message: string) => Error;
}

export interface NormalizedRequestReworkInput {
  bubbleId: string;
  message: string;
  refs: string[];
  repoPath?: string | undefined;
  cwd?: string | undefined;
  now: Date;
}

const approvalOverrideReasonRequiredReasonCode =
  "APPROVAL_OVERRIDE_REASON_REQUIRED";

function validateAndNormalizeOverrideReason(
  reason: string | undefined,
  createError: (message: string) => Error
): string | undefined {
  if (reason === undefined) {
    return undefined;
  }
  const trimmed = reason.trim();
  if (trimmed.length === 0) {
    throw createError(
      `${approvalOverrideReasonRequiredReasonCode}: --override-reason must be non-empty after trimming whitespace.`
    );
  }
  return trimmed;
}

export function normalizeApprovalDecisionInput(
  input: NormalizeApprovalDecisionInputInput
): NormalizedApprovalDecisionInput {
  return {
    bubbleId: requireNonEmptyString(
      input.bubbleId,
      "Bubble id",
      input.createApprovalCommandError
    ),
    decision: input.decision,
    ...(input.overrideReason !== undefined
      ? {
          overrideReason: validateAndNormalizeOverrideReason(
            input.overrideReason,
            input.createApprovalCommandError
          )
        }
      : {}),
    ...(input.message !== undefined
      ? {
          message: requireNonEmptyString(
            input.message,
            "Decision message",
            input.createApprovalCommandError
          )
        }
      : {}),
    refs: normalizeStringList(input.refs ?? []),
    ...(input.repoPath !== undefined
      ? { repoPath: input.repoPath }
      : {}),
    ...(input.cwd !== undefined
      ? { cwd: input.cwd }
      : {}),
    now: input.now ?? new Date()
  };
}

export function normalizeRequestReworkInput(
  input: NormalizeRequestReworkInputInput
): NormalizedRequestReworkInput {
  return {
    bubbleId: requireNonEmptyString(
      input.bubbleId,
      "Bubble id",
      input.createApprovalCommandError
    ),
    message: requireNonEmptyString(
      input.message,
      "Rework request message",
      input.createApprovalCommandError
    ),
    refs: normalizeStringList(input.refs ?? []),
    ...(input.repoPath !== undefined
      ? { repoPath: input.repoPath }
      : {}),
    ...(input.cwd !== undefined
      ? { cwd: input.cwd }
      : {}),
    now: input.now ?? new Date()
  };
}
