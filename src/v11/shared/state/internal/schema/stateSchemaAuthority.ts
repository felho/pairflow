import type { BubbleExecutionContext } from "../execution/executionContextTypes.js";
import type { BubbleMetaReviewSnapshotState } from "../../../metaReview/metaReviewSnapshotTypes.js";
import {
  toMetaReviewExecutionContext
} from "../../executionContext.js";
import {
  isMetaReviewAuthorityActive,
  validateExecutionContextAuthority,
  validateMetaReviewAuthority,
  type BubbleStateAuthorityValidationInput
} from "./stateSchemaAuthorityChecks.js";

export function validateBubbleStateAuthority(
  input: BubbleStateAuthorityValidationInput
): boolean {
  const metaReviewAuthorityActive = isMetaReviewAuthorityActive(input);
  validateExecutionContextAuthority(input, metaReviewAuthorityActive);
  validateMetaReviewAuthority(input, metaReviewAuthorityActive);
  return metaReviewAuthorityActive;
}

export function normalizeMetaReviewState(input: {
  metaReview: BubbleMetaReviewSnapshotState | undefined;
  metaReviewAuthorityActive: boolean;
  executionContext: BubbleExecutionContext | null;
}): BubbleMetaReviewSnapshotState | undefined {
  if (input.metaReview === undefined) {
    return undefined;
  }

  return {
    ...input.metaReview,
    execution_context:
      input.metaReviewAuthorityActive
        ? (() => {
            const normalizedExecutionContext =
              input.executionContext === null
                ? null
                : toMetaReviewExecutionContext(input.executionContext);
            if (normalizedExecutionContext === null) {
              throw new Error(
                "STATE_SCHEMA_META_REVIEW_EXECUTION_CONTEXT_REQUIRED: context state=RUNNING meta_review_authority=active normalization_step=execution_context; validated meta-review state lost execution_context during normalization."
              );
            }
            return normalizedExecutionContext;
          })()
        : (input.metaReview.execution_context ?? null)
  };
}
