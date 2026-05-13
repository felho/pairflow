import type { UiRouterDependencies } from "../../ports/uiRouter.js";
import type {
  CreateUiRouterInput
} from "./routerContracts.js";

const uiRouterDependencyKeys = [
  "listBubbles",
  "getBubbleStatus",
  "getBubbleInbox",
  "readRuntimeSessionsRegistry",
  "readBubbleTimeline",
  "startBubble",
  "emitApprove",
  "emitRequestRework",
  "emitHumanReply",
  "resumeBubble",
  "commitBubble",
  "mergeBubble",
  "openBubble",
  "attachBubble",
  "updateBubbleReviewPolicy",
  "stopBubble",
  "restartBubble",
  "deleteBubble"
] as const satisfies readonly (keyof UiRouterDependencies)[];

function resolveUiRouterDependency<K extends keyof UiRouterDependencies>(
  input: CreateUiRouterInput,
  key: K
): UiRouterDependencies[K] {
  const dependency = input.dependencies?.[key] ?? input.dependencyDefaults?.[key];
  if (dependency === undefined) {
    throw new Error(
      `UI_ROUTER_DEPENDENCY_MISSING: missing UI router dependency '${String(key)}'. `
      + "Pass dependencyDefaults from the UI host composition root or provide an explicit dependency."
      + ` context=${JSON.stringify({
        route: "ui_router_dependencies",
        dependency: String(key)
      })}`
    );
  }
  return dependency;
}

export function resolveUiRouterDependencies(
  input: CreateUiRouterInput
): UiRouterDependencies {
  return Object.fromEntries(
    uiRouterDependencyKeys.map((key) => [
      key,
      resolveUiRouterDependency(input, key)
    ])
  ) as unknown as UiRouterDependencies;
}
