import { clearLiveMetaReviewSnapshot } from "../../../core/bubble/metaReview.js";
import { buildMetaReviewExecutionContext } from "../../../core/bubble/metaReviewExecutionContext.js";
import { metaReviewExecutionContextToRunningContext } from "../../shared/state/executionContext.js";
import {
  type LoadedStateSnapshot,
  type writeStateSnapshot
} from "../../infrastructure/state/stateStore.js";
import type { BubbleStateSnapshot } from "../../../types/bubble.js";
import { toMetaReviewGateError } from "./metaReviewGateErrorConversion.js";
import {
  metaReviewerAgent
} from "./metaReviewGateShared.js";
import { MetaReviewGateError } from "./metaReviewGateTypes.js";

export function throwMetaReviewRunningStageFailure(input: {
  rootError: unknown;
  stageReasonCode: string;
}): never {
  const rootGateError = toMetaReviewGateError(input.rootError);
  throw new MetaReviewGateError(
    rootGateError.reasonCode,
    `${rootGateError.reasonCode}: ${input.stageReasonCode}: failed before persisting RUNNING meta-review authority state. Root error: ${rootGateError.message}`,
    {
      ...rootGateError.diagnostics,
      stageReasonCode: input.stageReasonCode
    }
  );
}

export async function stageMetaReviewRunningState(input: {
  bubbleId: string;
  loadedRunning: LoadedStateSnapshot;
  nowIso: string;
  watchdogTimeoutMinutes: number;
  statePath: string;
  writeState: typeof writeStateSnapshot;
}): Promise<LoadedStateSnapshot> {
  const previousMetaReview = clearLiveMetaReviewSnapshot(
    input.loadedRunning.state.meta_review
  );
  const attempt = previousMetaReview.auto_rework_count + 1;
  const metaReviewExecutionContext = buildMetaReviewExecutionContext({
    bubbleId: input.bubbleId,
    round: input.loadedRunning.state.round,
    startedAt: input.nowIso,
    watchdogTimeoutMinutes: input.watchdogTimeoutMinutes,
    attempt
  });
  const nextState: BubbleStateSnapshot = {
    ...input.loadedRunning.state,
    state: "RUNNING" as const,
    active_agent: metaReviewerAgent,
    active_role: "meta_reviewer" as const,
    active_since: input.nowIso,
    last_command_at: input.nowIso,
    meta_review: {
      ...previousMetaReview,
      execution_context: metaReviewExecutionContext
    }
  };
  nextState.execution_context =
    metaReviewExecutionContextToRunningContext(metaReviewExecutionContext);
  return input.writeState(
    input.statePath,
    nextState,
    {
      expectedFingerprint: input.loadedRunning.fingerprint,
      expectedState: "RUNNING"
    }
  );
}
