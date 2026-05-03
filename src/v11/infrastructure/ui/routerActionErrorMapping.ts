import type {
  UiBubbleDetail,
  UiBubbleReviewPolicy
} from "../../../contracts/ui/uiReadModel.js";
import type { BubbleReviewPolicyRuntimeView } from "../../../types/bubble.js";
import { REVIEW_POLICY_WRITE_CONFLICT } from "../../shared/reviewPolicy/updateBubbleReviewPolicy.js";
import {
  REVIEW_POLICY_STATE_CONFLICT,
  UiBubbleReviewPolicyConflictError,
  UiBubbleReviewPolicyStateConflictError
} from "../../defaults/ui/updateBubbleReviewPolicyForUi.js";
import { loadBubbleDetail } from "./routerBubbleDetail.js";
import type { UiApiError, UiRouterDependencies } from "./routerContracts.js";
import type { CreateUiRouterInput } from "./routerContracts.js";
import {
  asErrorMessage,
  badRequest,
  conflict,
  internalError,
  isAttachBubbleErrorLike,
  isBubbleCommitErrorLike,
  isBubbleMergeErrorLike,
  isConflictErrorMessage,
  isNotFoundErrorMessage,
  isRemoteBubbleApprovalCommandErrorLike,
  isRemoteBubbleCommitCommandErrorLike,
  isRemoteBubbleStatusErrorLike,
  notFound,
  parseStateFromErrorMessage
} from "./routerHttp.js";

export interface RouterActionMappingEnvironment {
  input: CreateUiRouterInput;
  dependencies: UiRouterDependencies;
}

function toUiBubbleReviewPolicy(
  reviewPolicy: BubbleReviewPolicyRuntimeView
): UiBubbleReviewPolicy {
  return reviewPolicy;
}

function mergeBubbleDetailWithReviewPolicyConflict(
  bubble: UiBubbleDetail | null,
  reviewPolicyConflict:
    | {
        bubbleToml: string;
        reviewPolicy: BubbleReviewPolicyRuntimeView;
      }
    | undefined
): UiBubbleDetail | null {
  if (bubble === null || reviewPolicyConflict === undefined) {
    return bubble;
  }
  return {
    ...bubble,
    bubbleToml: reviewPolicyConflict.bubbleToml,
    reviewPolicy: toUiBubbleReviewPolicy(reviewPolicyConflict.reviewPolicy)
  };
}

async function mapConflictWithCurrentState(input: {
  environment: RouterActionMappingEnvironment;
  message: string;
  repoPath: string;
  bubbleId: string;
  reasonCode?: string;
  reviewPolicyConflict?:
    | {
        bubbleToml: string;
        reviewPolicy: BubbleReviewPolicyRuntimeView;
      }
    | undefined;
}): Promise<UiApiError> {
  let currentBubble: UiBubbleDetail | null = null;
  try {
    currentBubble = await loadBubbleDetail({
      environment: input.environment,
      repoPath: input.repoPath,
      bubbleId: input.bubbleId
    });
  } catch {
    currentBubble = null;
  }

  const bubbleWithConflictContext = mergeBubbleDetailWithReviewPolicyConflict(
    currentBubble,
    input.reviewPolicyConflict
  );
  const currentState =
    bubbleWithConflictContext?.state ?? parseStateFromErrorMessage(input.message) ?? null;

  return conflict(input.message, {
    bubbleId: input.bubbleId,
    repoPath: input.repoPath,
    ...(input.reasonCode !== undefined ? { reasonCode: input.reasonCode } : {}),
    currentState,
    ...(bubbleWithConflictContext !== null ? { bubble: bubbleWithConflictContext } : {}),
    ...(input.reviewPolicyConflict !== undefined
      ? {
          reviewPolicyConflict: {
            bubbleId: input.bubbleId,
            repoPath: input.repoPath,
            currentState,
            bubbleToml: input.reviewPolicyConflict.bubbleToml,
            reviewPolicy: input.reviewPolicyConflict.reviewPolicy
          }
        }
      : {})
  });
}

function buildBubbleActionErrorDetails(input: {
  bubbleId: string;
  repoPath: string;
  reasonCode: string;
}): { bubbleId: string; repoPath: string; reasonCode: string } {
  return {
    bubbleId: input.bubbleId,
    repoPath: input.repoPath,
    reasonCode: input.reasonCode
  };
}

async function mapBubbleCommitApiError(input: {
  environment: RouterActionMappingEnvironment;
  message: string;
  repoPath: string;
  bubbleId: string;
  reasonCode: string;
}): Promise<UiApiError> {
  const details = buildBubbleActionErrorDetails(input);
  if (input.reasonCode === "REMOTE_STATUS_CONFIG_INVALID") {
    return badRequest(input.message, details);
  }
  if (
    input.reasonCode === "REMOTE_STATUS_TRANSPORT_FAILED" ||
    input.reasonCode === "COMMIT_REMOTE_START_REQUIRED"
  ) {
    return mapConflictWithCurrentState(input);
  }
  return internalError(input.message, details);
}

async function mapBubbleMergeApiError(input: {
  environment: RouterActionMappingEnvironment;
  message: string;
  repoPath: string;
  bubbleId: string;
  reasonCode: string;
}): Promise<UiApiError> {
  const details = buildBubbleActionErrorDetails(input);
  if (input.reasonCode === "REMOTE_STATUS_CONFIG_INVALID") {
    return badRequest(input.message, details);
  }
  if (
    input.reasonCode === "REMOTE_STATUS_TRANSPORT_FAILED" ||
    input.reasonCode === "MERGE_REMOTE_START_REQUIRED" ||
    input.reasonCode === "MERGE_STATE_DONE_REQUIRED" ||
    input.reasonCode === "MERGE_REPO_DIRTY" ||
    input.reasonCode === "MERGE_BASE_BRANCH_NOT_FOUND" ||
    input.reasonCode === "MERGE_BUBBLE_BRANCH_NOT_FOUND" ||
    input.reasonCode === "MERGE_BRANCHES_IDENTICAL" ||
    input.reasonCode === "MERGE_CONFLICT_REQUIRES_MANUAL_RESOLUTION"
  ) {
    return mapConflictWithCurrentState(input);
  }
  return internalError(input.message, details);
}

function mapRemoteStatusApiError(input: {
  message: string;
  repoPath: string;
  bubbleId: string;
  reasonCode: string;
}): UiApiError {
  const details = buildBubbleActionErrorDetails(input);
  if (input.reasonCode === "REMOTE_STATUS_CONFIG_INVALID") {
    return badRequest(input.message, details);
  }
  if (input.reasonCode === "REMOTE_STATUS_TRANSPORT_FAILED") {
    return conflict(input.message, details);
  }
  return internalError(input.message, details);
}

function mapAttachApiError(input: {
  message: string;
  repoPath: string;
  bubbleId: string;
  error: unknown;
}): UiApiError | undefined {
  if (
    isAttachBubbleErrorLike(input.error) &&
    input.error.launcher !== undefined &&
    input.error.failureClass !== undefined
  ) {
    const details = {
      bubbleId: input.bubbleId,
      repoPath: input.repoPath,
      launcher: input.error.launcher,
      failureClass: input.error.failureClass,
      ...(input.error.stdoutExcerpt !== undefined
        ? { stdoutExcerpt: input.error.stdoutExcerpt }
        : {}),
      ...(input.error.stderrExcerpt !== undefined
        ? { stderrExcerpt: input.error.stderrExcerpt }
        : {})
    };
    return input.error.failureClass === "launcher_unavailable"
      ? badRequest(input.message, details)
      : internalError(input.message, details);
  }

  if (isAttachBubbleErrorLike(input.error) && input.error.reasonCode !== undefined) {
    return badRequest(input.message, {
      bubbleId: input.bubbleId,
      repoPath: input.repoPath,
      reasonCode: input.error.reasonCode,
      ...(input.error.context?.reason !== undefined
        ? { attachContextReason: input.error.context.reason }
        : {})
    });
  }

  return undefined;
}

async function mapKnownActionError(input: {
  environment: RouterActionMappingEnvironment;
  error: unknown;
  message: string;
  repoPath: string;
  bubbleId: string;
}): Promise<UiApiError | null> {
  const bubbleCommitReasonCode =
    isBubbleCommitErrorLike(input.error)
      && typeof input.error.reasonCode === "string"
      ? input.error.reasonCode
      : undefined;
  if (bubbleCommitReasonCode !== undefined) {
    return mapBubbleCommitApiError({
      environment: input.environment,
      message: input.message,
      repoPath: input.repoPath,
      bubbleId: input.bubbleId,
      reasonCode: bubbleCommitReasonCode
    });
  }

  const bubbleMergeReasonCode =
    isBubbleMergeErrorLike(input.error)
      && typeof input.error.reasonCode === "string"
      ? input.error.reasonCode
      : undefined;
  if (bubbleMergeReasonCode !== undefined) {
    return mapBubbleMergeApiError({
      environment: input.environment,
      message: input.message,
      repoPath: input.repoPath,
      bubbleId: input.bubbleId,
      reasonCode: bubbleMergeReasonCode
    });
  }

  const remoteCommitCommandError =
    isRemoteBubbleCommitCommandErrorLike(input.error)
      && typeof input.error.code === "string"
      ? input.error
      : null;
  if (remoteCommitCommandError !== null) {
    return internalError(input.message, {
      bubbleId: input.bubbleId,
      repoPath: input.repoPath,
      reasonCode: remoteCommitCommandError.code
    });
  }

  if (isConflictErrorMessage(input.message)) {
    return mapConflictWithCurrentState({
      environment: input.environment,
      message: input.message,
      repoPath: input.repoPath,
      bubbleId: input.bubbleId,
      ...(bubbleCommitReasonCode !== undefined
        ? { reasonCode: bubbleCommitReasonCode }
        : {})
    });
  }

  if (input.error instanceof UiBubbleReviewPolicyConflictError) {
    return mapConflictWithCurrentState({
      environment: input.environment,
      message: input.message,
      repoPath: input.repoPath,
      bubbleId: input.bubbleId,
      reasonCode: REVIEW_POLICY_WRITE_CONFLICT,
      reviewPolicyConflict: {
        bubbleToml: input.error.currentBubbleToml,
        reviewPolicy: input.error.currentReviewPolicy
      }
    });
  }

  if (input.error instanceof UiBubbleReviewPolicyStateConflictError) {
    return conflict(input.message, {
      bubbleId: input.bubbleId,
      repoPath: input.repoPath,
      currentState: input.error.currentState,
      reasonCode: REVIEW_POLICY_STATE_CONFLICT
    });
  }

  const attachApiError = mapAttachApiError({
    message: input.message,
    repoPath: input.repoPath,
    bubbleId: input.bubbleId,
    error: input.error
  });
  if (attachApiError !== undefined) {
    return attachApiError;
  }

  if (isRemoteBubbleApprovalCommandErrorLike(input.error)) {
    return internalError(input.message, {
      bubbleId: input.bubbleId,
      repoPath: input.repoPath,
      reasonCode: input.error.code
    });
  }

  if (isRemoteBubbleStatusErrorLike(input.error)) {
    const { code } = input.error;
    if (typeof code !== "string") {
      return internalError(input.message, {
        bubbleId: input.bubbleId,
        repoPath: input.repoPath
      });
    }
    return mapRemoteStatusApiError({
      message: input.message,
      repoPath: input.repoPath,
      bubbleId: input.bubbleId,
      reasonCode: code
    });
  }

  if (input.error instanceof Error && input.error.name === "UiApiBadRequest") {
    return badRequest(input.message);
  }

  return null;
}

export async function mapActionErrorToApiError(input: {
  environment: RouterActionMappingEnvironment;
  error: unknown;
  repoPath: string;
  bubbleId: string;
}): Promise<UiApiError> {
  const message = asErrorMessage(input.error);

  if (isNotFoundErrorMessage(message)) {
    return notFound(message, {
      bubbleId: input.bubbleId,
      repoPath: input.repoPath
    });
  }

  return (
    await mapKnownActionError({
      environment: input.environment,
      error: input.error,
      message,
      repoPath: input.repoPath,
      bubbleId: input.bubbleId
    })
  ) ?? internalError(message);
}
