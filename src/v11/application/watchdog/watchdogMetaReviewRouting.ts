import type { BubbleStateSnapshot } from "../../../types/bubble.js";
import type { BubbleWatchdogResult } from "./watchdogCommandContract.js";
import type { WatchdogRuntimeContext } from "./watchdogCommandFlow.js";
import { escalateMetaReviewWatchdog } from "./watchdogCommandFlow.js";
import {
  isMetaReviewExecutionContextActiveState,
  validateActiveMetaReviewExecutionContext
} from "../../shared/metaReview/metaReviewExecutionContext.js";
import { SchemaValidationError } from "../../shared/validation/primitives.js";

function assertMetaReviewExecutionContext(state: BubbleStateSnapshot): void {
  const result = validateActiveMetaReviewExecutionContext(state);
  if (result.ok) {
    return;
  }
  throw new SchemaValidationError(
    "Invalid active meta-review execution context",
    result.errors
  );
}

export function maybeRouteMetaReviewBeforeExpiry(
  input: WatchdogRuntimeContext
): BubbleWatchdogResult | null {
  if (!isMetaReviewExecutionContextActiveState(input.state)) {
    return null;
  }
  assertMetaReviewExecutionContext(input.state);
  return {
    bubbleId: input.resolved.bubbleId,
    escalated: false,
    reason: "not_expired",
    state: input.state
  };
}

export async function maybeRouteMetaReviewOnExpiry(
  input: WatchdogRuntimeContext
): Promise<BubbleWatchdogResult | null> {
  if (!isMetaReviewExecutionContextActiveState(input.state)) {
    return null;
  }
  assertMetaReviewExecutionContext(input.state);
  return escalateMetaReviewWatchdog(input);
}
