import type {
  EmitApprovalDecisionQueuedReworkResult
} from "../../approvalCommandContract.js";
import type { ResolvedApprovalCommandDependencies } from "../command/approvalCommandDependencies.js";
import { mapQueuedReworkResult } from "../result/approvalResultMapping.js";
import {
  emitDeferredReworkIntentLifecycleEvents,
  persistDeferredReworkIntentState
} from "./runApprovalDeferredRework.js";
import type { ApprovalFlowExecutionContext } from "../flow/runApprovalFlowContext.js";
import { toPersistedSnapshot } from "../../../../domain/state/snapshot/projection.js";

export async function runLocalQueuedReworkFlow(input: {
  bubbleId: string;
  message: string;
  refs: string[];
  now: Date;
  createError: PairflowCreateCommandError;
  dependencies: ResolvedApprovalCommandDependencies;
  execution: Extract<ApprovalFlowExecutionContext, { route: "local" }>;
}): Promise<EmitApprovalDecisionQueuedReworkResult> {
  const state = input.execution.state;
  const bubbleIdentity = await input.dependencies.ensureBubbleInstanceIdForMutation({
    bubbleId: input.execution.resolved.bubbleId,
    repoPath: input.execution.resolved.repoPath,
    bubblePaths: input.execution.resolved.bubblePaths,
    bubbleConfig: input.execution.resolved.bubbleConfig,
    now: input.now
  });
  input.execution.resolved.bubbleConfig = bubbleIdentity.bubbleConfig;

  // queueDeferredReworkIntent still consumes persisted shape (later batch).
  // Project at the boundary; the queued result is re-wrapped before writing.
  const queued = input.dependencies.queueDeferredReworkIntent({
    state: toPersistedSnapshot(state),
    message: input.message,
    refs: input.refs,
    requestedBy: "human:request-rework",
    now: input.now
  });
  // Deferred rework intent mutates intent metadata only; lifecycle state
  // remains WAITING_HUMAN under the existing eligibility guard.

  const written = await persistDeferredReworkIntentState({
    queued,
    loadedFingerprint: input.execution.loadedState.fingerprint,
    statePath: input.execution.resolved.bubblePaths.statePath,
    writeStateSnapshot: input.dependencies.writeStateSnapshot,
    createError: input.createError
  });

  await emitDeferredReworkIntentLifecycleEvents({
    dependencies: input.dependencies,
    repoPath: input.execution.resolved.repoPath,
    bubbleId: input.execution.resolved.bubbleId,
    bubbleInstanceId: bubbleIdentity.bubbleInstanceId,
    round: state.round,
    stateAtRequest: state.state,
    refsCount: input.refs.length,
    message: input.message,
    now: input.now,
    queued
  });

  return mapQueuedReworkResult({
    bubbleId: input.execution.resolved.bubbleId,
    state: written.state,
    intent: queued.intent,
    supersededIntentId: queued.supersededIntentId
  });
}
