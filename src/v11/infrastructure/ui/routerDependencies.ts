import { getBubbleInbox } from "../../shared/inbox/inboxCommandApi.js";
import { readRuntimeSessionsRegistry } from "../executor/sessionRuntime/runtimeSessionsRegistry.js";
import { readBubbleTimeline } from "./presenters/timelinePresenter.js";
import { attachBubble } from "../executor/command/pairflowCommandAttach.js";
import { resolveBubbleById } from "../executor/workspace/bubbleLookup.js";
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
    "../../defaults/ui/routerDefaults.js"
  ).then(({ uiRouterDependencyDefaults }) => ({
    commitBubble: (...args) => uiRouterDependencyDefaults.commitBubble(...args),
    deleteBubble: (...args) => uiRouterDependencyDefaults.deleteBubble(...args),
    emitApprove: (...args) => uiRouterDependencyDefaults.emitApprove(...args),
    emitHumanReply: (...args) => uiRouterDependencyDefaults.emitHumanReply(...args),
    emitRequestRework: (...args) => uiRouterDependencyDefaults.emitRequestRework(...args),
    getBubbleStatus: (...args) => uiRouterDependencyDefaults.getBubbleStatus(...args),
    listBubbles: (...args) => uiRouterDependencyDefaults.listBubbles(...args),
    mergeBubble: (...args) => uiRouterDependencyDefaults.mergeBubble(...args),
    openBubble: (...args) => uiRouterDependencyDefaults.openBubble(...args),
    restartBubble: (...args) => uiRouterDependencyDefaults.restartBubble(...args),
    resumeBubble: (...args) => uiRouterDependencyDefaults.resumeBubble(...args),
    startBubble: (...args) => uiRouterDependencyDefaults.startBubble(...args),
    stopBubble: (...args) => uiRouterDependencyDefaults.stopBubble(...args)
  }));
  return uiRouterDependencyDefaultsPromise;
}

export const defaultUiRouterDependencies: UiRouterDependencies = {
  ...await loadUiRouterDependencyDefaults(),
  getBubbleInbox,
  readRuntimeSessionsRegistry,
  readBubbleTimeline,
  attachBubble: (input) =>
    attachBubble(input, {
      resolveBubbleById
    }),
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
