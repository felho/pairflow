import { getBubbleInbox } from "../../shared/inbox/inboxCommandApi.js";
import { readRuntimeSessionsRegistry } from "../executor/sessionRuntime/runtimeSessionsRegistry.js";
import { readBubbleTimeline } from "./presenters/timelinePresenter.js";
import { attachBubble } from "../executor/command/pairflowCommandAttach.js";
import type { UiRouterDependencies } from "../../shared/ports/uiRouter.js";
import type {
  CreateUiRouterInput
} from "./routerContracts.js";

type CoreUiRouterDependencyDefaults = Pick<
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
>;

let uiRouterDependencyDefaultsPromise:
  | Promise<CoreUiRouterDependencyDefaults>
  | undefined;

async function loadUiRouterDependencyDefaults(): Promise<CoreUiRouterDependencyDefaults> {
  uiRouterDependencyDefaultsPromise ??= import(
    "../../../core/ui/routerDefaults.js"
  ).then(({ uiRouterDependencyDefaults }) => ({
    commitBubble: uiRouterDependencyDefaults.commitBubble,
    deleteBubble: uiRouterDependencyDefaults.deleteBubble,
    emitApprove: uiRouterDependencyDefaults.emitApprove,
    emitHumanReply: uiRouterDependencyDefaults.emitHumanReply,
    emitRequestRework: uiRouterDependencyDefaults.emitRequestRework,
    getBubbleStatus: uiRouterDependencyDefaults.getBubbleStatus,
    listBubbles: uiRouterDependencyDefaults.listBubbles,
    mergeBubble: uiRouterDependencyDefaults.mergeBubble,
    openBubble: uiRouterDependencyDefaults.openBubble,
    restartBubble: uiRouterDependencyDefaults.restartBubble,
    resumeBubble: uiRouterDependencyDefaults.resumeBubble,
    startBubble: uiRouterDependencyDefaults.startBubble,
    stopBubble: uiRouterDependencyDefaults.stopBubble
  }));
  return uiRouterDependencyDefaultsPromise;
}

export const defaultUiRouterDependencies: UiRouterDependencies = {
  ...await loadUiRouterDependencyDefaults(),
  getBubbleInbox,
  readRuntimeSessionsRegistry,
  readBubbleTimeline,
  attachBubble,
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
