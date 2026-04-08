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
import { attachBubble } from "../executor/command/pairflowCommandAttach.js";
import { stopBubble } from "../../../core/bubble/stopBubble.js";
import { restartBubble } from "../../../core/bubble/restartBubble.js";
import { deleteBubble } from "../../../core/bubble/deleteBubble.js";
import type { UiRouterDependencies } from "../../shared/ports/uiRouter.js";
import type {
  CreateUiRouterInput
} from "./routerContracts.js";

export const defaultUiRouterDependencies = {
  listBubbles,
  getBubbleStatus,
  getBubbleInbox,
  readRuntimeSessionsRegistry,
  readBubbleTimeline,
  startBubble,
  emitApprove,
  emitRequestRework,
  emitHumanReply,
  resumeBubble,
  commitBubble,
  mergeBubble,
  openBubble,
  attachBubble,
  stopBubble,
  restartBubble,
  deleteBubble
};

export function resolveUiRouterDependencies(
  input: CreateUiRouterInput
): UiRouterDependencies {
  return {
    listBubbles: input.dependencies?.listBubbles ?? defaultUiRouterDependencies.listBubbles,
    getBubbleStatus:
      input.dependencies?.getBubbleStatus ?? defaultUiRouterDependencies.getBubbleStatus,
    getBubbleInbox:
      input.dependencies?.getBubbleInbox ?? defaultUiRouterDependencies.getBubbleInbox,
    readRuntimeSessionsRegistry:
      input.dependencies?.readRuntimeSessionsRegistry ??
      defaultUiRouterDependencies.readRuntimeSessionsRegistry,
    readBubbleTimeline:
      input.dependencies?.readBubbleTimeline ?? defaultUiRouterDependencies.readBubbleTimeline,
    startBubble: input.dependencies?.startBubble ?? defaultUiRouterDependencies.startBubble,
    emitApprove: input.dependencies?.emitApprove ?? defaultUiRouterDependencies.emitApprove,
    emitRequestRework:
      input.dependencies?.emitRequestRework
      ?? defaultUiRouterDependencies.emitRequestRework,
    emitHumanReply:
      input.dependencies?.emitHumanReply ?? defaultUiRouterDependencies.emitHumanReply,
    resumeBubble:
      input.dependencies?.resumeBubble ?? defaultUiRouterDependencies.resumeBubble,
    commitBubble:
      input.dependencies?.commitBubble ?? defaultUiRouterDependencies.commitBubble,
    mergeBubble: input.dependencies?.mergeBubble ?? defaultUiRouterDependencies.mergeBubble,
    openBubble: input.dependencies?.openBubble ?? defaultUiRouterDependencies.openBubble,
    attachBubble: input.dependencies?.attachBubble ?? defaultUiRouterDependencies.attachBubble,
    stopBubble: input.dependencies?.stopBubble ?? defaultUiRouterDependencies.stopBubble,
    restartBubble:
      input.dependencies?.restartBubble ?? defaultUiRouterDependencies.restartBubble,
    deleteBubble: input.dependencies?.deleteBubble ?? defaultUiRouterDependencies.deleteBubble
  };
}
