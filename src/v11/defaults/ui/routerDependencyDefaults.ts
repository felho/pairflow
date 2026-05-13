import { attachBubble } from "../../infrastructure/executor/command/pairflowCommandAttach.js";
import {
  readRuntimeSessionsRegistry
} from "../../infrastructure/executor/sessionRuntime/runtimeSessionsRegistry.js";
import { resolveBubbleById } from "../../infrastructure/executor/workspace/bubbleLookup.js";
import { readBubbleTimeline } from "../../infrastructure/ui/presenters/timelinePresenter.js";
import type { UiRouterDependencies } from "../../ports/uiRouter.js";
import { uiRouterDependencyDefaults } from "./routerDefaults.js";

export const defaultUiRouterDependencies: UiRouterDependencies = {
  ...uiRouterDependencyDefaults,
  readRuntimeSessionsRegistry,
  readBubbleTimeline,
  attachBubble: (input) =>
    attachBubble(input, {
      resolveBubbleById
    })
};
