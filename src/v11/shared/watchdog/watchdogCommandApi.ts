import { computeWatchdogStatus } from "../../../core/runtime/watchdog.js";
import { resolveBubbleById } from "../../../core/bubble/bubbleLookup.js";
import { emitBubbleNotification } from "../../../core/runtime/notifications.js";
import { emitTmuxDeliveryNotification } from "../../../core/runtime/tmuxDelivery.js";
import { readStateSnapshot } from "../../../core/state/stateStore.js";
import {
  recoverMetaReviewGateFromSnapshot
} from "../metaReviewGate/metaReviewGateCommandApi.js";
import { maybeApplyPendingReworkIntent } from "./watchdogPendingReworkIntent.js";
import type {
  BubbleWatchdogDependencies,
  BubbleWatchdogInput,
  BubbleWatchdogResult
} from "../../application/watchdog/watchdogCommandContract.js";
import { throwAsBubbleWatchdogError } from "./watchdogCommandRuntime.js";
import { type WatchdogRuntimeContext } from "./watchdogCommandFlow.js";
import { resolveWatchdogLifecycleRoute } from "./watchdogCommandRouting.js";
export { BubbleWatchdogError } from "./watchdogCommandRuntime.js";

export async function runBubbleWatchdog(
  input: BubbleWatchdogInput,
  dependencies: BubbleWatchdogDependencies = {}
): Promise<BubbleWatchdogResult> {
  const now = input.now ?? new Date();
  const nowIso = now.toISOString();
  const resolved = await resolveBubbleById(
    {
      bubbleId: input.bubbleId,
      ...(input.repoPath !== undefined ? { repoPath: input.repoPath } : {}),
      ...(input.cwd !== undefined ? { cwd: input.cwd } : {})
    }
  );
  const readState = dependencies.readStateSnapshot ?? readStateSnapshot;
  const recoverMetaReviewRoute =
    dependencies.recoverMetaReviewGateFromSnapshot ?? recoverMetaReviewGateFromSnapshot;
  const loadedState = await readState(resolved.bubblePaths.statePath);
  const state = loadedState.state;
  const emitDelivery =
    dependencies.emitTmuxDeliveryNotification ?? emitTmuxDeliveryNotification;
  const emitNotification =
    dependencies.emitBubbleNotification ?? emitBubbleNotification;
  const context: WatchdogRuntimeContext = {
    now,
    nowIso,
    resolved,
    readState,
    recoverMetaReviewRoute,
    loadedState,
    state,
    emitDelivery,
    emitNotification
  };

  const pendingRework = await maybeApplyPendingReworkIntent({
    now: context.now,
    nowIso: context.nowIso,
    resolved: context.resolved,
    loadedState: context.loadedState,
    state: context.state,
    emitDelivery: context.emitDelivery
  });
  if (pendingRework !== null) {
    return pendingRework;
  }

  const watchdog = computeWatchdogStatus(
    state,
    resolved.bubbleConfig.watchdog_timeout_minutes,
    now
  );
  return resolveWatchdogLifecycleRoute({
    context,
    monitored: watchdog.monitored,
    expired: watchdog.expired
  });
}

export function asBubbleWatchdogError(error: unknown): never {
  return throwAsBubbleWatchdogError(error);
}
