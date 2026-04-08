import type { IncomingMessage, ServerResponse } from "node:http";

import type { UiApiErrorBody, UiBubbleDetail } from "../../../types/ui.js";
import type { UiEventsBroker } from "./events.js";
import type { UiRepoScope } from "./repoScope.js";
import type { AttachBubbleResult, UiRouterDependencies } from "../../shared/ports/uiRouter.js";
import type { RuntimeSessionRecord } from "../../shared/ports/runtimeSessions.js";

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

export interface BubbleActionContext {
  bubbleId: string;
  repoPath: string;
  body: unknown;
}

export interface UiBubbleDetailContext {
  bubble: UiBubbleDetail;
  runtimeSession: RuntimeSessionRecord | null;
}

export type { AttachBubbleResult, UiRouterDependencies };
