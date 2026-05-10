import {
  normalizeStringList,
  requireNonEmptyString
} from "../../../../shared/normalization/stringNormalization.js";
import type { ApprovalDecision } from "../../../../../contracts/kernel/protocol.js";

export interface NormalizeApprovalDecisionInputInput {
  bubbleId: string;
  decision: ApprovalDecision;
  overrideNonApprove?: boolean | undefined;
  overrideReason?: string | undefined;
  message?: string | undefined;
  refs?: string[] | undefined;
  repoPath?: string | undefined;
  cwd?: string | undefined;
  now?: Date | undefined;
  createApprovalCommandError: PairflowCreateCommandError;
}

export interface NormalizedApprovalDecisionInput {
  bubbleId: string;
  decision: ApprovalDecision;
  overrideNonApprove?: boolean | undefined;
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
  createApprovalCommandError: PairflowCreateCommandError;
}

export interface NormalizedRequestReworkInput {
  bubbleId: string;
  message: string;
  refs: string[];
  repoPath?: string | undefined;
  cwd?: string | undefined;
  now: Date;
}

const APPROVAL_OVERRIDE_REASON_REQUIRED =
  "APPROVAL_OVERRIDE_REASON_REQUIRED";
const APPROVAL_REWORK_MESSAGE_REQUIRED =
  "APPROVAL_REWORK_MESSAGE_REQUIRED";

function validateAndNormalizeOverrideReason(
  reason: string | undefined,
  createError: PairflowCreateCommandError
): string | undefined {
  if (reason === undefined) {
    return undefined;
  }
  const trimmed = reason.trim();
  if (trimmed.length === 0) {
    throw createError({
      reasonCode: APPROVAL_OVERRIDE_REASON_REQUIRED,
      message: "--override-reason must be non-empty after trimming whitespace.",
      context: {
        command_name: "approval"
      }
    });
  }
  return trimmed;
}

function validateAndNormalizeDecisionMessage(
  input: {
    decision: ApprovalDecision;
    message: string | undefined;
    createError: PairflowCreateCommandError;
  }
): string | undefined {
  if (input.message === undefined) {
    if (input.decision === "rework") {
      throw input.createError({
        reasonCode: APPROVAL_REWORK_MESSAGE_REQUIRED,
        message: "Rework approval decisions require a non-empty message.",
        context: {
          command_name: "approval"
        }
      });
    }
    return undefined;
  }
  return requireNonEmptyString(
    input.message,
    "Decision message",
    input.createError
  );
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
    ...(input.overrideNonApprove !== undefined
      ? { overrideNonApprove: input.overrideNonApprove }
      : {}),
    ...(input.overrideReason !== undefined
      ? {
          overrideReason: validateAndNormalizeOverrideReason(
            input.overrideReason,
            input.createApprovalCommandError
          )
        }
      : {}),
    ...(input.decision === "rework" || input.message !== undefined
      ? {
          message: validateAndNormalizeDecisionMessage({
            decision: input.decision,
            message: input.message,
            createError: input.createApprovalCommandError
          })
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
