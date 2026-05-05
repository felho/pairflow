import {
  emitApproveV11 as emitApprove,
  emitRequestReworkV11 as emitRequestRework
} from "../../application/approval/emitApprovalV11.js";
import { commitBubbleDependencyDefaults } from "../commit/commitCommandDefaults.js";
import { commitBubbleV11 } from "../../application/commit/emitCommitV11.js";
import { deleteBubble } from "../../application/delete/deleteBubble.js";
import { mergeBubbleDependencyDefaults } from "../merge/mergeCommandDefaults.js";
import { mergeBubbleV11 as mergeBubble } from "../../application/merge/emitMergeV11.js";
import { openBubble } from "../../application/open/emitOpenV11.js";
import { restartBubble } from "../../application/restart/restartCommandApi.js";
import { emitHumanReplyV11 as emitHumanReply } from "../../application/reply/emitReplyV11.js";
import { resumeBubbleV11 as resumeBubble } from "../../application/resume/emitResumeV11.js";
import { startBubbleV11 as startBubble } from "../../application/start/emitStartV11.js";
import { getBubbleStatusV11 as getBubbleStatus } from "../../application/status/emitStatusV11.js";
import { stopBubbleV11 as stopBubble } from "../../application/stop/emitStopV11.js";
import { listBubbles } from "../../shared/read-model/list/listReadModelApi.js";
import { updateBubbleReviewPolicyForUi } from "./updateBubbleReviewPolicyForUi.js";
import type {
  UiCommitBubbleResult,
  UiEmitApprovalDecisionResult,
  UiEmitHumanReplyResult,
  UiEmitRequestReworkResult,
  UiRestartBubbleResult,
  UiRouterDependencies
} from "../../shared/ports/uiRouter.js";
import type {
  UiApprovalDecisionDeliverySignal,
  UiApprovalDecisionDeliverySignals
} from "../../shared/ports/uiDelivery.js";
import type {
  ApprovalDecisionDeliverySignal,
  EmitApprovalDecisionResult,
  EmitRequestReworkResult
} from "../../application/approval/approvalCommandContract.js";
import type { CommitBubbleResult } from "../../application/commit/commitCommandContract.js";
import type {
  EmitHumanReplyInput,
  EmitHumanReplyResult
} from "../../application/reply/replyCommandContract.js";
import type { RestartBubbleResult } from "../../application/restart/restartCommandContract.js";
import type { StartBubbleResult } from "../../application/start/startCommandContract.js";
import type { StopBubbleResult } from "../../application/stop/stopCommandContract.js";
import type {
  BubbleReworkIntentRecord,
  BubbleStateSnapshot
} from "../../../types/bubble.js";
import type { ProtocolEnvelope } from "../../../types/protocol.js";
import type {
  UiActionBubbleState,
  UiActionEvent,
  UiActionPendingReworkIntent,
  UiEmitHumanReplyInput,
  UiStartBubbleResult,
  UiStopBubbleResult
} from "../../../contracts/ui/uiActions.js";

type UiInputWithSerializableNow = {
  now?: string | undefined;
};

type CommandInputWithDateNow<T extends UiInputWithSerializableNow> = Omit<
  T,
  "now"
> & {
  now?: Date;
};

function projectUiInputNowToCommandNow<T extends UiInputWithSerializableNow>(
  input: T
): CommandInputWithDateNow<T> {
  const { now, ...rest } = input;
  return {
    ...rest,
    ...(now !== undefined ? { now: new Date(now) } : {})
  } as CommandInputWithDateNow<T>;
}

function projectUiHumanReplyInputToCommandInput(
  input: UiEmitHumanReplyInput
): EmitHumanReplyInput {
  return {
    bubbleId: input.bubbleId,
    message: input.message,
    ...(input.refs !== undefined ? { refs: input.refs } : {}),
    ...(input.repoPath !== undefined ? { repoPath: input.repoPath } : {}),
    ...(input.cwd !== undefined ? { cwd: input.cwd } : {}),
    ...(input.now !== undefined ? { now: new Date(input.now) } : {})
  };
}

export function projectApprovalDecisionDeliverySignalToUiDeliverySignal(
  signal: ApprovalDecisionDeliverySignal
): UiApprovalDecisionDeliverySignal {
  return signal.status === "accepted"
    ? {
        status: "accepted",
        message: signal.message,
        ...(signal.sessionName !== undefined
          ? { sessionName: signal.sessionName }
          : {}),
        ...(signal.targetPaneIndex !== undefined
          ? { targetPaneIndex: signal.targetPaneIndex }
          : {}),
        ...(signal.deliveryTargetReasonCode !== undefined
          ? { deliveryTargetReasonCode: signal.deliveryTargetReasonCode }
          : {})
      }
    : {
        status: "rejected",
        message: signal.message,
        ...(signal.reason !== undefined ? { reason: signal.reason } : {}),
        ...(signal.reason_code !== undefined
          ? { reason_code: signal.reason_code }
          : {}),
        ...(signal.sessionName !== undefined
          ? { sessionName: signal.sessionName }
          : {}),
        ...(signal.targetPaneIndex !== undefined
          ? { targetPaneIndex: signal.targetPaneIndex }
          : {}),
        ...(signal.deliveryTargetReasonCode !== undefined
          ? { deliveryTargetReasonCode: signal.deliveryTargetReasonCode }
          : {})
      };
}

export function projectApprovalDecisionDeliverySignalsToUiDeliverySignals(
  result: NonNullable<EmitApprovalDecisionResult["delivery"]>
): UiApprovalDecisionDeliverySignals {
  return {
    statusDelivery: projectApprovalDecisionDeliverySignalToUiDeliverySignal(
      result.statusDelivery
    ),
    ...(result.implementerDelivery !== undefined
      ? {
          implementerDelivery:
            projectApprovalDecisionDeliverySignalToUiDeliverySignal(
              result.implementerDelivery
            )
        }
      : {})
  };
}

export function projectBubbleStateToUiActionState(
  state: BubbleStateSnapshot
): UiActionBubbleState {
  const executionContext = state.execution_context ?? null;
  return {
    bubbleId: state.bubble_id,
    lifecycleState: state.state,
    round: state.round,
    activeAgent: state.active_agent,
    activeRole: state.active_role,
    activeSince: state.active_since,
    lastCommandAt: state.last_command_at,
    executionContext:
      executionContext === null
        ? null
        : {
            handoffId: executionContext.handoff_id,
            executionId: executionContext.execution_id
          }
  };
}

export function projectProtocolEnvelopeToUiActionEvent(
  envelope: ProtocolEnvelope
): UiActionEvent {
  const { payload } = envelope;
  return {
    id: envelope.id,
    timestamp: envelope.ts,
    bubbleId: envelope.bubble_id,
    sender: envelope.sender,
    recipient: envelope.recipient,
    type: envelope.type,
    round: envelope.round,
    refs: [...envelope.refs],
    ...(payload.summary !== undefined ? { summary: payload.summary } : {}),
    ...(payload.question !== undefined ? { question: payload.question } : {}),
    ...(payload.message !== undefined ? { message: payload.message } : {}),
    ...(payload.decision !== undefined ? { decision: payload.decision } : {}),
    ...(payload.pass_intent !== undefined
      ? { passIntent: payload.pass_intent }
      : {}),
    ...(payload.findings_claim_state !== undefined
      ? { findingsClaimState: payload.findings_claim_state }
      : {}),
    ...(payload.findings_claim_source !== undefined
      ? { findingsClaimSource: payload.findings_claim_source }
      : {})
  };
}

export function projectPendingReworkIntentToUiActionPendingIntent(
  intent: BubbleReworkIntentRecord
): UiActionPendingReworkIntent {
  return {
    intentId: intent.intent_id,
    message: intent.message,
    refs: [...(intent.refs ?? [])],
    requestedBy: intent.requested_by,
    requestedAt: intent.requested_at,
    status: intent.status,
    ...(intent.superseded_by_intent_id !== undefined
      ? { supersededByIntentId: intent.superseded_by_intent_id }
      : {})
  };
}

function mapUiApprovalDecisionResult(
  result: EmitApprovalDecisionResult
): UiEmitApprovalDecisionResult {
  return {
    bubbleId: result.bubbleId,
    sequence: result.sequence,
    event: projectProtocolEnvelopeToUiActionEvent(result.envelope),
    actionState: projectBubbleStateToUiActionState(result.state),
    ...(result.delivery !== undefined
      ? {
          delivery: projectApprovalDecisionDeliverySignalsToUiDeliverySignals(
            result.delivery
          )
        }
      : {})
  };
}

function assertUnhandledRequestReworkResult(value: never): never {
  throw new Error(
    `UI_REQUEST_REWORK_RESULT_UNHANDLED: context route=emit_request_rework_for_ui result=${JSON.stringify(value)}`
  );
}

async function emitApproveForUi(
  input: Parameters<UiRouterDependencies["emitApprove"]>[0]
): Promise<UiEmitApprovalDecisionResult> {
  return mapUiApprovalDecisionResult(
    await emitApprove(projectUiInputNowToCommandNow(input))
  );
}

async function emitRequestReworkForUi(
  input: Parameters<UiRouterDependencies["emitRequestRework"]>[0]
): Promise<UiEmitRequestReworkResult> {
  const result: EmitRequestReworkResult = await emitRequestRework(
    projectUiInputNowToCommandNow(input)
  );
  switch (result.mode) {
    case "queued": {
      const pendingIntent = result.state.pending_rework_intent;
      return {
        mode: "queued",
        bubbleId: result.bubbleId,
        intentId: result.intentId,
        actionState: projectBubbleStateToUiActionState(result.state),
        queuedIntent:
          pendingIntent?.intent_id === result.intentId
            ? projectPendingReworkIntentToUiActionPendingIntent(pendingIntent)
            : null,
        ...(result.supersededIntentId !== undefined
          ? { supersededIntentId: result.supersededIntentId }
          : {})
      };
    }
    case "immediate":
      return {
        ...mapUiApprovalDecisionResult(result),
        mode: "immediate"
      };
    default:
      return assertUnhandledRequestReworkResult(result);
  }
}

function mapUiHumanReplyResult(
  result: EmitHumanReplyResult
): UiEmitHumanReplyResult {
  return {
    bubbleId: result.bubbleId,
    sequence: result.sequence,
    event: projectProtocolEnvelopeToUiActionEvent(result.envelope),
    actionState: projectBubbleStateToUiActionState(result.state)
  };
}

function mapUiCommitResult(result: CommitBubbleResult): UiCommitBubbleResult {
  return {
    bubbleId: result.bubbleId,
    sequence: result.sequence,
    event: projectProtocolEnvelopeToUiActionEvent(result.envelope),
    actionState: projectBubbleStateToUiActionState(result.state),
    commitSha: result.commitSha,
    commitMessage: result.commitMessage,
    stagedFiles: [...result.stagedFiles]
  };
}

function mapUiStartResult(result: StartBubbleResult): UiStartBubbleResult {
  return {
    bubbleId: result.bubbleId,
    actionState: projectBubbleStateToUiActionState(result.state),
    tmuxSessionName: result.tmuxSessionName,
    worktreePath: result.worktreePath
  };
}

function mapUiStopResult(result: StopBubbleResult): UiStopBubbleResult {
  return {
    bubbleId: result.bubbleId,
    actionState: projectBubbleStateToUiActionState(result.state),
    tmuxSessionName: result.tmuxSessionName,
    tmuxSessionExisted: result.tmuxSessionExisted,
    runtimeSessionRemoved: result.runtimeSessionRemoved
  };
}

function mapUiRestartResult(result: RestartBubbleResult): UiRestartBubbleResult {
  return {
    bubbleId: result.bubbleId,
    actionState: projectBubbleStateToUiActionState(result.state),
    tmuxSessionName: result.tmuxSessionName,
    worktreePath: result.worktreePath,
    previousTmuxSessionExisted: result.previousTmuxSessionExisted,
    previousRuntimeSessionRemoved: result.previousRuntimeSessionRemoved,
    ...(result.warnings !== undefined ? { warnings: result.warnings } : {})
  };
}

export const uiRouterDependencyDefaults = {
  async commitBubble(input) {
    return mapUiCommitResult(
      await commitBubbleV11(
        projectUiInputNowToCommandNow(input),
        commitBubbleDependencyDefaults
      )
    );
  },
  async deleteBubble(input) {
    return deleteBubble(projectUiInputNowToCommandNow(input));
  },
  emitApprove: emitApproveForUi,
  async emitHumanReply(input) {
    return mapUiHumanReplyResult(
      await emitHumanReply(projectUiHumanReplyInputToCommandInput(input))
    );
  },
  emitRequestRework: emitRequestReworkForUi,
  getBubbleStatus,
  listBubbles,
  async mergeBubble(input) {
    return mergeBubble(projectUiInputNowToCommandNow(input), mergeBubbleDependencyDefaults);
  },
  openBubble,
  async restartBubble(input) {
    return mapUiRestartResult(
      await restartBubble(projectUiInputNowToCommandNow(input))
    );
  },
  async resumeBubble(input) {
    return mapUiHumanReplyResult(
      await resumeBubble(projectUiInputNowToCommandNow(input))
    );
  },
  async startBubble(input) {
    return mapUiStartResult(
      await startBubble(projectUiInputNowToCommandNow(input))
    );
  },
  async stopBubble(input) {
    return mapUiStopResult(
      await stopBubble(projectUiInputNowToCommandNow(input))
    );
  },
  updateBubbleReviewPolicy: updateBubbleReviewPolicyForUi
} satisfies Pick<
  UiRouterDependencies,
  | "commitBubble"
  | "deleteBubble"
  | "emitApprove"
  | "emitHumanReply"
  | "emitRequestRework"
  | "getBubbleStatus"
  | "listBubbles"
  | "mergeBubble"
  | "openBubble"
  | "restartBubble"
  | "resumeBubble"
  | "startBubble"
  | "stopBubble"
  | "updateBubbleReviewPolicy"
>;
