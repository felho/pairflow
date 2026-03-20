import type { BubbleWatchdogResult } from "../../application/watchdog/watchdogCommandContract.js";
import type { WatchdogRuntimeContext } from "./watchdogCommandFlow.js";
import {
  buildNotExpiredResult,
  escalateRunningWatchdog
} from "./watchdogCommandFlow.js";
import {
  maybeRouteMetaReviewBeforeExpiry,
  maybeRouteMetaReviewOnExpiry
} from "./watchdogMetaReviewRouting.js";

export async function resolveWatchdogLifecycleRoute(input: {
  context: WatchdogRuntimeContext;
  monitored: boolean;
  expired: boolean;
}): Promise<BubbleWatchdogResult> {
  const { context } = input;

  if (!input.monitored) {
    return {
      bubbleId: context.resolved.bubbleId,
      escalated: false,
      reason: "not_monitored",
      state: context.state
    };
  }

  if (!input.expired) {
    const metaReviewNotExpired = await maybeRouteMetaReviewBeforeExpiry(context);
    if (metaReviewNotExpired !== null) {
      return metaReviewNotExpired;
    }
    return buildNotExpiredResult(context);
  }

  const metaReviewExpired = await maybeRouteMetaReviewOnExpiry(context);
  if (metaReviewExpired !== null) {
    return metaReviewExpired;
  }

  if (context.state.state !== "RUNNING") {
    return {
      bubbleId: context.resolved.bubbleId,
      escalated: false,
      reason: "state_not_running",
      state: context.state
    };
  }

  if (context.state.active_agent === null) {
    return {
      bubbleId: context.resolved.bubbleId,
      escalated: false,
      reason: "not_monitored",
      state: context.state
    };
  }

  return escalateRunningWatchdog(context);
}
