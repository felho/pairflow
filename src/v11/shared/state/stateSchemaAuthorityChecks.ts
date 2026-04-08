import type {
  BubbleExecutionContext,
  BubbleMetaReviewSnapshotState
} from "../../../types/bubble.js";
import {
  executionContextsEqual,
  metaReviewExecutionContextToRunningContext
} from "./executionContext.js";
import type { ValidationError } from "../validation/primitives.js";

export interface BubbleStateAuthorityValidationInput {
  state: unknown;
  validatedRound: number | null;
  activeAgent: unknown;
  activeRole: unknown;
  activeSince: unknown;
  executionContext: BubbleExecutionContext | null;
  metaReview: BubbleMetaReviewSnapshotState | undefined;
  errors: ValidationError[];
}

function hasAnyActiveField(input: BubbleStateAuthorityValidationInput): boolean {
  return (
    input.activeAgent !== null ||
    input.activeRole !== null ||
    input.activeSince !== null
  );
}

function hasAllActiveFields(input: BubbleStateAuthorityValidationInput): boolean {
  return (
    input.activeAgent !== null &&
    input.activeRole !== null &&
    input.activeSince !== null
  );
}

export function isMetaReviewAuthorityActive(
  input: BubbleStateAuthorityValidationInput
): boolean {
  const mirroredMetaReviewExecutionContext =
    metaReviewExecutionContextToRunningContext(
      input.metaReview?.execution_context ?? null
    );

  return (
    input.state === "RUNNING" &&
    (
      input.activeRole === "meta_reviewer" ||
      input.executionContext?.active_role === "meta_reviewer" ||
      mirroredMetaReviewExecutionContext !== null
    )
  );
}

export function validateExecutionContextAuthority(
  input: BubbleStateAuthorityValidationInput,
  metaReviewAuthorityActive: boolean
): void {
  if (
    input.executionContext !== null &&
    input.validatedRound !== null &&
    input.executionContext.round !== input.validatedRound
  ) {
    input.errors.push({
      path: "execution_context.round",
      message: `Must match state.round (${String(input.validatedRound)}) while execution_context is active`
    });
  }

  if (
    input.executionContext !== null &&
    input.activeRole !== null &&
    input.executionContext.active_role !== input.activeRole
  ) {
    input.errors.push({
      path: "active_role",
      message:
        "active_role must match execution_context.active_role when execution_context is present"
    });
  }

  if (hasAnyActiveField(input) && !hasAllActiveFields(input)) {
    input.errors.push({
      path: "active_*",
      message:
        "active_agent, active_role, and active_since must be provided together"
    });
  }

  if (input.state === "RUNNING" && !metaReviewAuthorityActive && !hasAllActiveFields(input)) {
    input.errors.push({
      path: "active_*",
      message:
        "RUNNING state requires active_agent, active_role, and active_since"
    });
  }

  if (input.state !== "RUNNING") {
    if (input.executionContext !== null) {
      input.errors.push({
        path: "execution_context",
        message:
          `execution_context must be null while lifecycle state ${String(input.state)} is inactive`
      });
    }
    return;
  }

  if (metaReviewAuthorityActive) {
    return;
  }

  if (input.validatedRound === 0) {
    if (input.executionContext !== null) {
      input.errors.push({
        path: "execution_context",
        message:
          "RUNNING round=0 ideation state must not persist execution_context authority"
      });
    }
    return;
  }

  if (input.executionContext === null) {
    input.errors.push({
      path: "execution_context",
      message:
        "RUNNING state requires canonical execution_context authority when round >= 1"
    });
  }
}

export function validateMetaReviewAuthority(
  input: BubbleStateAuthorityValidationInput,
  metaReviewAuthorityActive: boolean
): void {
  if (!metaReviewAuthorityActive) {
    if (
      input.metaReview?.execution_context !== undefined &&
      input.metaReview.execution_context !== null
    ) {
      input.errors.push({
        path: "meta_review.execution_context",
        message:
          "meta_review.execution_context must be null while meta-review authority is inactive"
      });
    }
    return;
  }

  validateMetaReviewExecutionMirror(input);
  validateMetaReviewSnapshotAuthority(input);
  validateMetaReviewActiveOwnership(input);
}

function validateMetaReviewExecutionMirror(
  input: BubbleStateAuthorityValidationInput
): void {
  const mirroredMetaReviewExecutionContext =
    metaReviewExecutionContextToRunningContext(
      input.metaReview?.execution_context ?? null
    );

  if (input.executionContext === null) {
    input.errors.push({
      path: "execution_context",
      message:
        "RUNNING meta-review state requires canonical execution_context authority"
    });
    return;
  }

  if (
    mirroredMetaReviewExecutionContext !== null &&
    !executionContextsEqual(input.executionContext, mirroredMetaReviewExecutionContext)
  ) {
    input.errors.push({
      path: "execution_context",
      message:
        "execution_context must match meta_review.execution_context while meta-review authority is active"
    });
  }

  if (input.executionContext.active_role !== "meta_reviewer") {
    input.errors.push({
      path: "execution_context.active_role",
      message: "Must be meta_reviewer while meta-review authority is active"
    });
  } else if (input.executionContext.awaited_output_type !== "meta_review_result") {
    input.errors.push({
      path: "execution_context.awaited_output_type",
      message: "Must be meta_review_result while meta-review authority is active"
    });
  }
}

function validateMetaReviewSnapshotAuthority(
  input: BubbleStateAuthorityValidationInput
): void {
  if (
    input.metaReview === undefined ||
    input.metaReview.execution_context === undefined ||
    input.metaReview.execution_context === null
  ) {
    input.errors.push({
      path: "meta_review.execution_context",
      message:
        "RUNNING meta-review state requires canonical meta_review.execution_context authority"
    });
    return;
  }

  if (
    input.validatedRound !== null &&
    input.metaReview.execution_context.round !== input.validatedRound
  ) {
    input.errors.push({
      path: "meta_review.execution_context.round",
      message: `Must match state.round (${String(input.validatedRound)}) while meta-review authority is active`
    });
  }
}

function validateMetaReviewActiveOwnership(
  input: BubbleStateAuthorityValidationInput
): void {
  const metaReviewHasRunSnapshot =
    input.metaReview !== undefined &&
    input.metaReview.last_autonomous_status !== null &&
    input.metaReview.last_autonomous_recommendation !== null &&
    input.metaReview.last_autonomous_updated_at !== null;

  if (!hasAllActiveFields(input) && !metaReviewHasRunSnapshot) {
    input.errors.push({
      path: "active_*",
      message:
        "RUNNING meta-review state requires active_agent, active_role, and active_since unless recovering from an existing meta-review snapshot"
    });
    return;
  }

  if (!hasAllActiveFields(input)) {
    return;
  }

  if (input.activeRole !== "meta_reviewer") {
    input.errors.push({
      path: "active_role",
      message:
        "RUNNING meta-review state requires active_role=meta_reviewer when active ownership is present"
    });
  }

  if (input.activeRole === "meta_reviewer" && input.activeAgent !== "codex") {
    input.errors.push({
      path: "active_agent",
      message:
        "RUNNING meta-review state requires active_agent=codex when active_role=meta_reviewer"
    });
  }
}
