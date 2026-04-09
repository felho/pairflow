import {
  emitApprove,
  emitRequestRework
} from "../../application/approval/approvalCommandApi.js";
import { commitBubble } from "../../application/commit/commitCommandApi.js";
import { deleteBubble } from "../../application/delete/deleteBubble.js";
import { listBubbles } from "../../application/list/listCommandApi.js";
import { mergeBubbleCommandOrchestration as mergeBubble } from "../../application/merge/mergeCommandOrchestration.js";
import { openBubbleRuntime } from "../../application/open/openBubbleRuntime.js";
import { emitHumanReply } from "../../application/reply/replyCommandApi.js";
import { restartBubbleCommandOrchestration as restartBubble } from "../../application/restart/restartCommandOrchestration.js";
import { resumeBubbleCommandOrchestration as resumeBubble } from "../../application/resume/resumeCommandOrchestration.js";
import { startBubble } from "../../application/start/startCommandApi.js";
import { getBubbleStatusV11 as getBubbleStatus } from "../../application/status/emitStatusV11.js";
import { stopBubbleCommandOrchestration as stopBubble } from "../../application/stop/stopCommandOrchestration.js";
import { getBubbleInbox } from "../../shared/inbox/inboxCommandApi.js";
import { readRuntimeSessionsRegistry } from "../executor/sessionRuntime/runtimeSessionsRegistry.js";
import {
  appendProtocolEnvelope,
  readTranscriptEnvelopes
} from "../artifact/transcript/transcriptStore.js";
import { ensureBubbleInstanceIdForMutation } from "../artifact/bubble/bubbleInstanceId.js";
import { resolveBubbleById } from "../executor/workspace/bubbleLookup.js";
import { readStateSnapshot, writeStateSnapshot } from "../state/stateStore.js";
import { runGit } from "../workspace/git.js";
import { readBubbleTimeline } from "./presenters/timelinePresenter.js";
import { attachBubble } from "../executor/command/pairflowCommandAttach.js";
import type { UiRouterDependencies } from "../../shared/ports/uiRouter.js";
import type {
  CreateUiRouterInput
} from "./routerContracts.js";

async function commitBubbleForUi(
  input: Parameters<UiRouterDependencies["commitBubble"]>[0]
) {
  return commitBubble(input, {
    appendProtocolEnvelope,
    ensureBubbleInstanceIdForMutation,
    readStateSnapshot,
    readTranscriptEnvelopes,
    resolveBubbleById,
    runGit,
    writeStateSnapshot
  });
}

async function openBubble(input: Parameters<UiRouterDependencies["openBubble"]>[0]) {
  return openBubbleRuntime(input, {
    resolveBubbleById
  });
}

export const defaultUiRouterDependencies = {
  commitBubble: commitBubbleForUi,
  deleteBubble,
  emitApprove,
  emitHumanReply,
  emitRequestRework,
  getBubbleStatus,
  listBubbles,
  mergeBubble,
  openBubble,
  restartBubble,
  resumeBubble,
  startBubble,
  stopBubble,
  getBubbleInbox,
  readRuntimeSessionsRegistry,
  readBubbleTimeline,
  attachBubble,
} satisfies UiRouterDependencies;

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
