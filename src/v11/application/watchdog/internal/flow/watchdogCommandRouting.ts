import type {
  BubbleWatchdogResult,
  PaneActivitySampleResult
} from "../../watchdogCommandContract.js";
import type { WatchdogRuntimeContext } from "./watchdogCommandFlow.js";
import { WATCHDOG_PANE_QUIET_WINDOW_MS } from "../paneActivity/watchdogPaneActivitySampler.js";
import type { WatchdogPaneActivityRecord } from "../../../../ports/watchdogPaneActivity.js";
import {
  buildNotExpiredResult,
  escalateRunningWatchdog,
  maybeRetryStuckAgentInput
} from "./watchdogCommandFlow.js";
import {
  maybeRouteMetaReviewBeforeExpiry,
  maybeRouteMetaReviewOnExpiry
} from "./watchdogMetaReviewRouting.js";

export async function resolveWatchdogLifecycleRoute(input: {
  context: WatchdogRuntimeContext;
  monitored: boolean;
  expired: boolean;
  paneActivity?: {
    readStatus: "ok" | "missing" | "invalid";
    currentRecord: WatchdogPaneActivityRecord | null;
    sampleResult: PaneActivitySampleResult | null;
  } | null;
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
    const metaReviewNotExpired = maybeRouteMetaReviewBeforeExpiry(context);
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

  const sampleResult = input.paneActivity?.sampleResult;
  if (
    sampleResult?.status === "no_session"
    || sampleResult?.status === "pane_unreadable"
  ) {
    return escalateRunningWatchdog(context);
  }

  const readStatus = input.paneActivity?.readStatus ?? "missing";
  const currentRecord = input.paneActivity?.currentRecord ?? null;
  if (readStatus !== "ok" || currentRecord === null) {
    return buildNotExpiredResult(context);
  }

  if (
    sampleResult === null
    && (
      currentRecord.last_sample_status === "no_session"
      || currentRecord.last_sample_status === "pane_unreadable"
    )
  ) {
    return escalateRunningWatchdog(context);
  }

  const lastChangedAtMs = Date.parse(currentRecord.last_changed_at);
  if (Number.isNaN(lastChangedAtMs)) {
    return buildNotExpiredResult(context);
  }

  const quietWindowElapsedMs = context.now.getTime() - lastChangedAtMs;
  if (quietWindowElapsedMs < WATCHDOG_PANE_QUIET_WINDOW_MS) {
    return buildNotExpiredResult(context);
  }

  if (await maybeRetryStuckAgentInput(context)) {
    return {
      bubbleId: context.resolved.bubbleId,
      escalated: false,
      reason: "not_expired",
      state: context.state,
      stuckRetried: true
    };
  }

  return escalateRunningWatchdog(context);
}
