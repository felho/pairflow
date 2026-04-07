import type { EmitRequestReworkResult } from "./approvalCommandContract.js";
import { mapImmediateReworkResult, mapQueuedReworkResult } from "./approvalResultMapping.js";
import { emitDeferredReworkIntentLifecycleEvents, persistDeferredReworkIntentState } from "./runApprovalDeferredRework.js";
import type { RunRequestReworkFlowInput } from "./runApprovalFlowContract.js";
import type { ResolvedApprovalCommandDependencies } from "./approvalCommandDependencyResolution.js";
import { canonicalHumanApprovalState, isHumanApprovalState } from "../../shared/approval/approvalRoutingEligibility.js";
import type { ApprovalFlowExecutionContext } from "./runApprovalFlowContext.js";
import { runApprovalDecisionFlowWithContext } from "./runApprovalDecisionFlowHandler.js";
export { runApprovalDecisionFlowWithContext } from "./runApprovalDecisionFlowHandler.js";

export async function runRequestReworkFlowWithContext(
  input: {
    flow: RunRequestReworkFlowInput;
    dependencies: ResolvedApprovalCommandDependencies;
    execution: ApprovalFlowExecutionContext;
  }
): Promise<EmitRequestReworkResult> {
  const state = input.execution.state;

  if (isHumanApprovalState(state.state)) {
    const immediate = await runApprovalDecisionFlowWithContext({
      flow: {
        bubbleId: input.flow.bubbleId,
        decision: "rework",
        message: input.flow.message,
        refs: input.flow.refs,
        repoPath: input.flow.repoPath,
        cwd: input.flow.cwd,
        now: input.flow.now,
        createError: input.flow.createError
      },
      dependencies: input.dependencies,
      execution: input.execution
    });
    return mapImmediateReworkResult(immediate);
  }

  if (state.state !== "WAITING_HUMAN") {
    throw input.flow.createError({
      reasonCode: "APPROVAL_REQUEST_REWORK_STATE_INELIGIBLE",
      message:
        `bubble request-rework can only be used while bubble is ${canonicalHumanApprovalState} or WAITING_HUMAN (current: ${state.state}).`,
      context: {
        command_name: "approval",
        current_state: state.state
      }
    });
  }

  const bubbleIdentity = await input.dependencies.ensureBubbleInstanceIdForMutation({
    bubbleId: input.execution.resolved.bubbleId,
    repoPath: input.execution.resolved.repoPath,
    bubblePaths: input.execution.resolved.bubblePaths,
    bubbleConfig: input.execution.resolved.bubbleConfig,
    now: input.flow.now
  });
  input.execution.resolved.bubbleConfig = bubbleIdentity.bubbleConfig;

  const queued = input.dependencies.queueDeferredReworkIntent({
    state,
    message: input.flow.message,
    refs: input.flow.refs,
    requestedBy: "human:request-rework",
    now: input.flow.now
  });
  // Deferred rework intent mutates intent metadata only; lifecycle state
  // remains WAITING_HUMAN under the existing eligibility guard.

  const written = await persistDeferredReworkIntentState({
    queued,
    loadedFingerprint: input.execution.loadedState.fingerprint,
    statePath: input.execution.resolved.bubblePaths.statePath,
    writeStateSnapshot: input.dependencies.writeStateSnapshot,
    createError: input.flow.createError
  });

  await emitDeferredReworkIntentLifecycleEvents({
    dependencies: input.dependencies,
    repoPath: input.execution.resolved.repoPath,
    bubbleId: input.execution.resolved.bubbleId,
    bubbleInstanceId: bubbleIdentity.bubbleInstanceId,
    round: state.round,
    stateAtRequest: state.state,
    refsCount: input.flow.refs.length,
    message: input.flow.message,
    now: input.flow.now,
    queued
  });

  return mapQueuedReworkResult({
    bubbleId: input.execution.resolved.bubbleId,
    state: written.state,
    intent: queued.intent,
    supersededIntentId: queued.supersededIntentId
  });
}
