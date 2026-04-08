import type { IncomingMessage, ServerResponse } from "node:http";

import type { getBubbleInbox } from "../../shared/inbox/inboxCommandApi.js";
import type { listBubbles } from "../../../core/bubble/listBubbles.js";
import type { getBubbleStatus } from "../../../core/bubble/statusBubble.js";
import type {
  readRuntimeSessionsRegistry,
  RuntimeSessionRecord
} from "../executor/sessionRuntime/runtimeSessionsRegistry.js";
import type { startBubble } from "../../../core/bubble/startBubble.js";
import type {
  emitApprove,
  emitRequestRework
} from "../../../core/human/approval.js";
import type { emitHumanReply } from "../../../core/human/reply.js";
import type { resumeBubble } from "../../../core/bubble/resumeBubble.js";
import type { commitBubble } from "../../../core/bubble/commitBubble.js";
import type { mergeBubble } from "../../../core/bubble/mergeBubble.js";
import type { openBubble } from "../../../core/bubble/openBubble.js";
import type {
  attachBubble,
  AttachBubbleResult
} from "../../../core/bubble/attachBubble.js";
import type { restartBubble } from "../../../core/bubble/restartBubble.js";
import type { deleteBubble } from "../../../core/bubble/deleteBubble.js";
import type { stopBubble } from "../../../core/bubble/stopBubble.js";
import type { UiApiErrorBody, UiBubbleDetail } from "../../../types/ui.js";
import type { UiEventsBroker } from "./events.js";
import type { UiRepoScope } from "./repoScope.js";
import type { readBubbleTimeline } from "./presenters/timelinePresenter.js";

export interface UiApiError {
  status: number;
  body: UiApiErrorBody;
}

export interface UiRouterDependencies {
  listBubbles: typeof listBubbles;
  getBubbleStatus: typeof getBubbleStatus;
  getBubbleInbox: typeof getBubbleInbox;
  readRuntimeSessionsRegistry: typeof readRuntimeSessionsRegistry;
  readBubbleTimeline: typeof readBubbleTimeline;
  startBubble: typeof startBubble;
  emitApprove: typeof emitApprove;
  emitRequestRework: typeof emitRequestRework;
  emitHumanReply: typeof emitHumanReply;
  resumeBubble: typeof resumeBubble;
  commitBubble: typeof commitBubble;
  mergeBubble: typeof mergeBubble;
  openBubble: typeof openBubble;
  attachBubble: typeof attachBubble;
  stopBubble: typeof stopBubble;
  restartBubble: typeof restartBubble;
  deleteBubble: typeof deleteBubble;
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

export type { AttachBubbleResult };
