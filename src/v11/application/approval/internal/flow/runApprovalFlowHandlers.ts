import type { EmitRequestReworkResult } from "../../approvalCommandContract.js";
import { buildBubbleStateSnapshotVariant } from "../../../../domain/state/snapshot/buildBubbleStateSnapshot.js";
import { mapImmediateReworkResult } from "../result/approvalResultMapping.js";
import { runLocalQueuedReworkFlow } from "../rework/runApprovalQueuedReworkFlow.js";
import type { RunRequestReworkFlowInput } from "./runApprovalFlowContract.js";
import type { ResolvedApprovalCommandDependencies } from "../command/approvalCommandDependencies.js";
import { canonicalHumanApprovalState, isHumanApprovalState } from "./approvalRoutingEligibility.js";
import type { ApprovalFlowExecutionContext } from "./runApprovalFlowContext.js";
import { runApprovalDecisionFlowWithContext } from "./runApprovalDecisionFlowHandler.js";
export { runApprovalDecisionFlowWithContext } from "./runApprovalDecisionFlowHandler.js";

async function runRemoteRequestReworkFlow(input: {
  flow: RunRequestReworkFlowInput;
  dependencies: ResolvedApprovalCommandDependencies;
  execution: Extract<ApprovalFlowExecutionContext, { route: "remote" }>;
}): Promise<EmitRequestReworkResult> {
  const routed = await input.dependencies.executeRemoteBubbleApprovalCommand({
    action: "request-rework",
    bubbleId: input.execution.resolved.bubbleId,
    message: input.flow.message,
    refs: input.flow.refs,
    remoteClonePath: input.execution.remotePointer.remoteClonePath,
    remoteTarget: input.execution.remoteTarget
  });

  if (routed.kind === "queued_rework") {
    // SSH cross-batch border: remote port still returns persisted shape.
    return {
      mode: "queued",
      bubbleId: routed.bubbleId,
      intentId: routed.intentId,
      state: buildBubbleStateSnapshotVariant(routed.state),
      ...(routed.supersededIntentId !== undefined
        ? { supersededIntentId: routed.supersededIntentId }
        : {})
    };
  }

  if (routed.kind !== "decision") {
    throw input.flow.createError({
      reasonCode: "APPROVAL_REMOTE_RESULT_INVALID",
      message:
        `Remote request-rework for '${input.execution.resolved.bubbleId}' returned an invalid result kind.`,
      context: {
        command_name: "approval",
        bubble_id: input.execution.resolved.bubbleId
      }
    });
  }

  // SSH cross-batch border: project routed.state (persisted) into variant.
  return {
    mode: "immediate",
    bubbleId: routed.bubbleId,
    sequence: routed.sequence,
    envelope: routed.envelope,
    state: buildBubbleStateSnapshotVariant(routed.state)
  };
}

export async function runRequestReworkFlowWithContext(
  input: {
    flow: RunRequestReworkFlowInput;
    dependencies: ResolvedApprovalCommandDependencies;
    execution: ApprovalFlowExecutionContext;
  }
): Promise<EmitRequestReworkResult> {
  if (input.execution.route === "remote") {
    return runRemoteRequestReworkFlow({
      flow: input.flow,
      dependencies: input.dependencies,
      execution: input.execution
    });
  }

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
    if (!("sequence" in immediate)) {
      throw input.flow.createError({
        reasonCode: "APPROVAL_REMOTE_RESULT_INVALID",
        message:
          `Local request-rework for '${input.execution.resolved.bubbleId}' returned a queued rework result.`,
        context: {
          command_name: "approval",
          bubble_id: input.execution.resolved.bubbleId
        }
      });
    }
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

  return runLocalQueuedReworkFlow({
    bubbleId: input.flow.bubbleId,
    message: input.flow.message,
    refs: input.flow.refs,
    now: input.flow.now,
    createError: input.flow.createError,
    dependencies: input.dependencies,
    execution: input.execution
  });
}
