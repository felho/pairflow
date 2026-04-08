import { listBubbles } from "../../../core/bubble/listBubbles.js";
import { getBubbleStatus } from "../../../core/bubble/statusBubble.js";
import { getBubbleInbox } from "../../shared/inbox/inboxCommandApi.js";
import { readRuntimeSessionsRegistry } from "../executor/sessionRuntime/runtimeSessionsRegistry.js";
import { readBubbleTimeline } from "./presenters/timelinePresenter.js";
import { startBubble } from "../../../core/bubble/startBubble.js";
import { emitApprove, emitRequestRework } from "../../../core/human/approval.js";
import { emitHumanReply } from "../../../core/human/reply.js";
import { resumeBubble } from "../../../core/bubble/resumeBubble.js";
import { commitBubble } from "../../../core/bubble/commitBubble.js";
import { mergeBubble } from "../../../core/bubble/mergeBubble.js";
import { openBubble } from "../../../core/bubble/openBubble.js";
import { attachBubble } from "../../../core/bubble/attachBubble.js";
import { stopBubble } from "../../../core/bubble/stopBubble.js";
import { restartBubble } from "../../../core/bubble/restartBubble.js";
import { deleteBubble } from "../../../core/bubble/deleteBubble.js";
import type {
  CreateUiRouterInput,
  UiRouterDependencies
} from "./routerContracts.js";

export function resolveUiRouterDependencies(
  input: CreateUiRouterInput
): UiRouterDependencies {
  return {
    listBubbles: input.dependencies?.listBubbles ?? listBubbles,
    getBubbleStatus: input.dependencies?.getBubbleStatus ?? getBubbleStatus,
    getBubbleInbox: input.dependencies?.getBubbleInbox ?? getBubbleInbox,
    readRuntimeSessionsRegistry:
      input.dependencies?.readRuntimeSessionsRegistry ??
      readRuntimeSessionsRegistry,
    readBubbleTimeline: input.dependencies?.readBubbleTimeline ?? readBubbleTimeline,
    startBubble: input.dependencies?.startBubble ?? startBubble,
    emitApprove: input.dependencies?.emitApprove ?? emitApprove,
    emitRequestRework:
      input.dependencies?.emitRequestRework ?? emitRequestRework,
    emitHumanReply: input.dependencies?.emitHumanReply ?? emitHumanReply,
    resumeBubble: input.dependencies?.resumeBubble ?? resumeBubble,
    commitBubble: input.dependencies?.commitBubble ?? commitBubble,
    mergeBubble: input.dependencies?.mergeBubble ?? mergeBubble,
    openBubble: input.dependencies?.openBubble ?? openBubble,
    attachBubble: input.dependencies?.attachBubble ?? attachBubble,
    stopBubble: input.dependencies?.stopBubble ?? stopBubble,
    restartBubble: input.dependencies?.restartBubble ?? restartBubble,
    deleteBubble: input.dependencies?.deleteBubble ?? deleteBubble
  };
}
