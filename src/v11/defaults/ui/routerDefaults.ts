import {
  emitApprove,
  emitRequestRework
} from "../../application/approval/approvalCommandApi.js";
import { commitBubbleDependencyDefaults } from "../commit/commitCommandDefaults.js";
import { commitBubble } from "../../application/commit/commitCommandApi.js";
import { deleteBubble } from "../../application/delete/deleteBubble.js";
import { deleteBubbleDependencyDefaults } from "../delete/deleteBubbleDefaults.js";
import { mergeBubbleDependencyDefaults } from "../merge/mergeCommandDefaults.js";
import { mergeBubbleCommandOrchestration as mergeBubble } from "../../application/merge/mergeCommandOrchestration.js";
import { openBubble } from "../../application/open/openBubble.js";
import { openBubbleDefaults } from "../open/openBubbleDefaults.js";
import { processSpawnDefault } from "../process/processSpawnDefaults.js";
import { restartBubbleDependencyDefaults } from "../restart/restartCommandDefaults.js";
import { restartBubble } from "../../application/restart/restartCommandApi.js";
import { emitHumanReply } from "../../application/reply/replyCommandApi.js";
import { resumeBubbleCommandOrchestration as resumeBubble } from "../../application/resume/resumeCommandOrchestration.js";
import { startBubbleV11 as startBubble } from "../../application/start/emitStartV11.js";
import { getBubbleStatusV11 as getBubbleStatus } from "../../application/status/emitStatusV11.js";
import { statusCommandDependencyDefaults } from "../status/statusCommandDependencyDefaults.js";
import { stopBubbleDependencyDefaults } from "../stop/stopCommandDefaults.js";
import { stopBubbleCommandOrchestration as stopBubble } from "../../application/stop/stopCommandOrchestration.js";
import { getBubbleInbox } from "../../application/inbox/bubbleInboxReadModel.js";
import { listBubbles } from "../../application/list/listReadModelApi.js";
import { listCommandDefaults } from "../list/listCommandDefaults.js";
import { updateBubbleReviewPolicyForUi } from "./updateBubbleReviewPolicyForUi.js";
import type {
  UiCommitBubbleResult,
  UiEmitApprovalDecisionResult,
  UiEmitHumanReplyResult,
  UiEmitRequestReworkResult,
  UiRestartBubbleResult,
  UiRouterDependencies
} from "../../ports/uiRouter.js";
import type {
  UiApprovalDecisionDeliverySignal,
  UiApprovalDecisionDeliverySignals
} from "../../ports/uiDelivery.js";
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
import type { BubbleStateSnapshot } from "../../shared/state/bubbleStateSnapshotTypes.js";
import type {
  BubbleReworkIntentRecord
} from "../../shared/state/reworkIntentTypes.js";
import type { ProtocolEnvelope } from "../../../types/protocol.js";
import type {
  UiActionBubbleState,
  UiActionEvent,
  UiActionPendingReworkIntent,
  UiEmitHumanReplyInput,
  UiStartBubbleResult,
  UiStopBubbleResult
} from "../../../contracts/ui/uiActions.js";
import type {
  UiBubbleInboxInput,
  UiBubbleInboxView
} from "../../../contracts/ui/uiReadModel.js";

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

async function getBubbleInboxForUi(
  input: UiBubbleInboxInput
): Promise<UiBubbleInboxView> {
  const view = await getBubbleInbox({
    bubbleId: input.bubbleId,
    ...(input.repoPath !== undefined ? { repoPath: input.repoPath } : {}),
    ...(input.cwd !== undefined ? { cwd: input.cwd } : {})
  });
  return {
    bubbleId: view.bubbleId,
    repoPath: view.repoPath,
    state: view.state,
    pending: view.pending,
    items: view.items
  };
}

export const uiRouterDependencyDefaults = {
  async commitBubble(input) {
    return mapUiCommitResult(
      await commitBubble(
        projectUiInputNowToCommandNow(input),
        commitBubbleDependencyDefaults
      )
    );
  },
  async deleteBubble(input) {
    return deleteBubble(
      projectUiInputNowToCommandNow(input),
      deleteBubbleDependencyDefaults
    );
  },
  emitApprove: emitApproveForUi,
  async emitHumanReply(input) {
    return mapUiHumanReplyResult(
      await emitHumanReply(projectUiHumanReplyInputToCommandInput(input))
    );
  },
  emitRequestRework: emitRequestReworkForUi,
  getBubbleInbox: getBubbleInboxForUi,
  getBubbleStatus: (input) =>
    getBubbleStatus(input, statusCommandDependencyDefaults),
  async listBubbles(input) {
    return listBubbles(input, listCommandDefaults);
  },
  async mergeBubble(input) {
    return mergeBubble(projectUiInputNowToCommandNow(input), mergeBubbleDependencyDefaults);
  },
  async openBubble(input) {
    return openBubble(input, {
      ...openBubbleDefaults,
      processSpawn: processSpawnDefault
    });
  },
  async restartBubble(input) {
    return mapUiRestartResult(
      await restartBubble(
        projectUiInputNowToCommandNow(input),
        restartBubbleDependencyDefaults
      )
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
      await stopBubble(
        projectUiInputNowToCommandNow(input),
        stopBubbleDependencyDefaults
      )
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
  | "getBubbleInbox"
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
