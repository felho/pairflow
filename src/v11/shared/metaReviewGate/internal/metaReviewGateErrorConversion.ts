import { MetaReviewError } from "../../metaReview/metaReviewError.js";
import { MetaReviewGateError } from "../metaReviewGateRouteContract.js";
import { toConflictError } from "./metaReviewGateShared.js";
import { isNamedError } from "../../errors/namedError.js";

export function toMetaReviewGateError(error: unknown): MetaReviewGateError {
  if (error instanceof MetaReviewGateError) {
    return error;
  }
  if (isNamedError(error, "StateStoreConflictError")) {
    return toConflictError(error);
  }
  if (isNamedError(error, "BubbleLookupError")) {
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
