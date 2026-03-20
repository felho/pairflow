import { BubbleLookupError } from "../../../core/bubble/bubbleLookup.js";
import { MetaReviewError } from "../../../core/bubble/metaReview.js";
import { StateStoreConflictError } from "../../../core/state/stateStore.js";
import { MetaReviewGateError } from "./metaReviewGateTypes.js";
import { toConflictError } from "./metaReviewGateShared.js";

export function toMetaReviewGateError(error: unknown): MetaReviewGateError {
  if (error instanceof MetaReviewGateError) {
    return error;
  }
  if (error instanceof StateStoreConflictError) {
    return toConflictError(error);
  }
  if (error instanceof BubbleLookupError) {
    return new MetaReviewGateError(
      "META_REVIEW_GATE_TRANSITION_INVALID",
      error.message
    );
  }
  if (error instanceof MetaReviewError) {
    return new MetaReviewGateError(
      "META_REVIEW_GATE_RUN_FAILED",
      `${error.reasonCode}: ${error.message}`
    );
  }
  if (error instanceof Error) {
    return new MetaReviewGateError("META_REVIEW_GATE_TRANSITION_INVALID", error.message);
  }
  return new MetaReviewGateError(
    "META_REVIEW_GATE_TRANSITION_INVALID",
    `Unknown meta-review gate error: ${String(error)}`
  );
}

export function asMetaReviewGateError(error: unknown): never {
  throw toMetaReviewGateError(error);
}
