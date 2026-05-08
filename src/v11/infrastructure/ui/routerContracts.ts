import type { IncomingMessage, ServerResponse } from "node:http";

import type { UiApiErrorBody } from "../../../contracts/ui/uiErrors.js";
import type { UiBubbleDetail } from "../../../contracts/ui/uiReadModel.js";
import type { UiEventsBroker } from "./events.js";
import type { UiRepoScope } from "./repoScope.js";
import type {
  UiAttachBubbleResult,
  UiRouterDependencies
} from "../../ports/uiRouter.js";
import type { UiRuntimeSessionRecord } from "../../../contracts/ui/uiReadModel.js";

export interface UiApiError {
  status: number;
  body: UiApiErrorBody;
}

export interface CreateUiRouterInput {
  repoScope: UiRepoScope;
  events: UiEventsBroker;
  cwd?: string | undefined;
  keepAliveIntervalMs?: number | undefined;
  dependencies?: Partial<UiRouterDependencies> | undefined;
}

export interface UiRouter {
  handleRequest(req: IncomingMessage, res: ServerResponse): Promise<boolean>;
}

export interface UiRouterEnvironment {
  input: CreateUiRouterInput;
  dependencies: UiRouterDependencies;
  routerCwd: string;
}

export interface UiRouterRequestContext {
  repoScope: UiRepoScope;
  cwd?: string | undefined;
  routerCwd: string;
}

export interface BubbleActionContext {
  bubbleId: string;
  repoPath: string;
  body: unknown;
}

export interface UiBubbleDetailContext {
  bubble: UiBubbleDetail;
  runtimeSession: UiRuntimeSessionRecord | null;
}

export type {
  UiAttachBubbleResult,
  UiRouterDependencies
};
