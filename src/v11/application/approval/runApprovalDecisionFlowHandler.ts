import type { EmitApprovalDecisionResult } from "./approvalCommandContract.js";
import { buildApprovalDecisionEnvelopePayload, emitApprovalDecisionDeliverySignals, emitApprovalDecisionLifecycleEvent } from "./runApprovalDecisionEffects.js";
import { resolveApprovalNextState } from "./approvalResultMapping.js";
import type { RunApprovalDecisionFlowInput } from "./runApprovalFlowContract.js";
import type { ResolvedApprovalCommandDependencies } from "./approvalCommandDependencyResolution.js";
import { appendEnvelopeViaMutationBoundary, persistStateViaMutationBoundary } from "../../shared/mutation/mutationBoundaryIO.js";
import { assertApprovalDecisionEligibility } from "../../shared/approval/approvalRoutingEligibility.js";
import type { ApprovalFlowExecutionContext } from "./runApprovalFlowContext.js";

export async function runApprovalDecisionFlowWithContext(
  input: {
    flow: RunApprovalDecisionFlowInput;
    dependencies: ResolvedApprovalCommandDependencies;
    execution: ApprovalFlowExecutionContext;
  }
): Promise<EmitApprovalDecisionResult> {
  if (input.execution.route === "remote") {
    const routed = await input.dependencies.executeRemoteBubbleApprovalCommand({
      action: "approve",
      bubbleId: input.execution.resolved.bubbleId,
      remoteClonePath: input.execution.remotePointer.remoteClonePath,
      remoteTarget: input.execution.remoteTarget,
      refs: input.flow.refs,
      overrideNonApprove: input.flow.overrideNonApprove ?? false,
      ...(input.flow.overrideReason !== undefined
        ? { overrideReason: input.flow.overrideReason }
        : {})
    });

    if (routed.kind !== "decision") {
      throw input.flow.createError({
        reasonCode: "APPROVAL_REMOTE_RESULT_INVALID",
        message:
          `Remote approval for '${input.execution.resolved.bubbleId}' returned a queued rework result for approve.`,
        context: {
          command_name: "approval",
          bubble_id: input.execution.resolved.bubbleId
        }
      });
    }

    return {
      bubbleId: routed.bubbleId,
      sequence: routed.sequence,
      envelope: routed.envelope,
      state: routed.state
    };
  }

  const bubbleIdentity = await input.dependencies.ensureBubbleInstanceIdForMutation({
    bubbleId: input.execution.resolved.bubbleId,
    repoPath: input.execution.resolved.repoPath,
    bubblePaths: input.execution.resolved.bubblePaths,
    bubbleConfig: input.execution.resolved.bubbleConfig,
    now: input.flow.now
  });
  input.execution.resolved.bubbleConfig = bubbleIdentity.bubbleConfig;

  const state = input.execution.state;
  assertApprovalDecisionEligibility(state, input.flow.createError);

  const envelopePayload = await buildApprovalDecisionEnvelopePayload({
    decision: input.flow.decision,
    message: input.flow.message,
    overrideNonApprove: input.flow.overrideNonApprove,
    overrideReason: input.flow.overrideReason,
    state,
    transcriptPath: input.execution.resolved.bubblePaths.transcriptPath,
    round: state.round,
    readTranscriptEnvelopes: input.dependencies.readTranscriptEnvelopes,
    createError: input.flow.createError
  });

  const appended = await appendEnvelopeViaMutationBoundary({
    append: input.dependencies.appendProtocolEnvelope,
    payload: {
      transcriptPath: input.execution.resolved.bubblePaths.transcriptPath,
      mirrorPaths: [input.execution.resolved.bubblePaths.inboxPath],
      lockPath: input.execution.lockPath,
      now: input.flow.now,
      envelope: {
        bubble_id: input.execution.resolved.bubbleId,
        sender: "human",
        recipient: "orchestrator",
        type: "APPROVAL_DECISION",
        round: state.round,
        payload: envelopePayload,
        refs: input.flow.refs
      }
    }
  });

  const nextState = resolveApprovalNextState({
    state,
    decision: input.flow.decision,
    nowIso: input.execution.nowIso,
    implementer: input.execution.resolved.bubbleConfig.agents.implementer,
    reviewer: input.execution.resolved.bubbleConfig.agents.reviewer,
    watchdogTimeoutMinutes:
      input.execution.resolved.bubbleConfig.watchdog_timeout_minutes,
    applyStateTransition: input.dependencies.applyStateTransition
  });

  let written;
  try {
    written = await persistStateViaMutationBoundary({
      write: input.dependencies.writeStateSnapshot,
      statePath: input.execution.resolved.bubblePaths.statePath,
      state: nextState,
      options: {
        expectedFingerprint: input.execution.loadedState.fingerprint,
        expectedState: state.state
      }
    });
  } catch (error) {
    const reason = error instanceof Error ? error.message : String(error);
    throw input.flow.createError({
      reasonCode: "APPROVAL_DECISION_STATE_PERSIST_FAILED",
      message:
        `APPROVAL_DECISION ${appended.envelope.id} was appended but state update failed. Transcript remains canonical; recover state from transcript tail. Root error: ${reason}`,
      context: {
        command_name: "approval",
        envelope_id: appended.envelope.id
      },
      cause: error
    });
  }

  const decisionMessageRef = input.dependencies.resolveDeliveryMessageRef({
    bubbleId: input.execution.resolved.bubbleId,
    sessionsPath: input.execution.resolved.bubblePaths.sessionsPath,
    envelope: appended.envelope
  });

  const delivery = await emitApprovalDecisionDeliverySignals({
    decision: input.flow.decision,
    resolved: input.execution.resolved,
    appendedEnvelope: appended.envelope,
    messageRef: decisionMessageRef,
    dependencies: input.dependencies
  });

  await emitApprovalDecisionLifecycleEvent({
    decision: input.flow.decision,
    refsCount: input.flow.refs.length,
    message: input.flow.message,
    resolved: input.execution.resolved,
    bubbleInstanceId: bubbleIdentity.bubbleInstanceId,
    round: state.round,
    now: input.flow.now,
    dependencies: input.dependencies
  });

  return {
    bubbleId: input.execution.resolved.bubbleId,
    sequence: appended.sequence,
    envelope: appended.envelope,
    state: written.state,
    delivery
  };
}
