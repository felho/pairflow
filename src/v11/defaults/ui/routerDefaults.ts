import {
  emitApproveV11 as emitApprove,
  emitRequestReworkV11 as emitRequestRework
} from "../../application/approval/emitApprovalV11.js";
import { commitBubbleDependencyDefaults } from "../../application/commit/commitCommandDefaults.js";
import { commitBubbleV11 } from "../../application/commit/emitCommitV11.js";
import { deleteBubble } from "../../application/delete/deleteBubble.js";
import { mergeBubbleV11 as mergeBubble } from "../../application/merge/emitMergeV11.js";
import { openBubble } from "../../application/open/emitOpenV11.js";
import { restartBubble } from "../../application/restart/restartCommandApi.js";
import { emitHumanReplyV11 as emitHumanReply } from "../../application/reply/emitReplyV11.js";
import { resumeBubbleV11 as resumeBubble } from "../../application/resume/emitResumeV11.js";
import { startBubbleV11 as startBubble } from "../../application/start/emitStartV11.js";
import { getBubbleStatusV11 as getBubbleStatus } from "../../application/status/emitStatusV11.js";
import { stopBubbleV11 as stopBubble } from "../../application/stop/emitStopV11.js";
import { listBubbles } from "../../shared/list/listCommandApi.js";
import { updateBubbleReviewPolicyForUi } from "./updateBubbleReviewPolicyForUi.js";
import type {
  UiEmitApprovalDecisionResult,
  UiEmitRequestReworkResult,
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

function mapUiApprovalDecisionResult(
  result: EmitApprovalDecisionResult
): UiEmitApprovalDecisionResult {
  return {
    bubbleId: result.bubbleId,
    sequence: result.sequence,
    envelope: result.envelope,
    state: result.state,
    ...(result.delivery !== undefined
      ? {
          delivery: projectApprovalDecisionDeliverySignalsToUiDeliverySignals(
            result.delivery
          )
        }
      : {})
  };
}

async function emitApproveForUi(
  input: Parameters<UiRouterDependencies["emitApprove"]>[0]
): Promise<UiEmitApprovalDecisionResult> {
  return mapUiApprovalDecisionResult(await emitApprove(input));
}

async function emitRequestReworkForUi(
  input: Parameters<UiRouterDependencies["emitRequestRework"]>[0]
): Promise<UiEmitRequestReworkResult> {
  const result: EmitRequestReworkResult = await emitRequestRework(input);
  if (result.mode === "queued") {
    return result;
  }
  return {
    ...mapUiApprovalDecisionResult(result),
    mode: "immediate"
  };
}

export const uiRouterDependencyDefaults = {
  async commitBubble(input) {
    return commitBubbleV11(input, commitBubbleDependencyDefaults);
  },
  deleteBubble,
  emitApprove: emitApproveForUi,
  emitHumanReply,
  emitRequestRework: emitRequestReworkForUi,
  getBubbleStatus,
  listBubbles,
  mergeBubble,
  openBubble,
  restartBubble,
  resumeBubble,
  startBubble,
  stopBubble,
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
