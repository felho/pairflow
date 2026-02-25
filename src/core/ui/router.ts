import type { IncomingMessage, ServerResponse } from "node:http";
import { join, resolve, sep } from "node:path";

import { getBubbleInbox } from "../bubble/inboxBubble.js";
import { listBubbles } from "../bubble/listBubbles.js";
import { getBubbleStatus } from "../bubble/statusBubble.js";
import {
  readRuntimeSessionsRegistry,
  type RuntimeSessionRecord
} from "../runtime/sessionsRegistry.js";
import { startBubble } from "../bubble/startBubble.js";
import { emitApprove, emitRequestRework } from "../human/approval.js";
import { emitHumanReply } from "../human/reply.js";
import { resumeBubble } from "../bubble/resumeBubble.js";
import { commitBubble } from "../bubble/commitBubble.js";
import { mergeBubble } from "../bubble/mergeBubble.js";
import { openBubble } from "../bubble/openBubble.js";
import { attachBubble } from "../bubble/attachBubble.js";
import { stopBubble } from "../bubble/stopBubble.js";
import { deleteBubble } from "../bubble/deleteBubble.js";
import type { BubbleLifecycleState } from "../../types/bubble.js";
import type {
  UiApiErrorBody,
  UiBubbleDetail,
  UiEvent,
  UiEventsConnectedPayload
} from "../../types/ui.js";
import type { UiEventsBroker } from "./events.js";
import {
  presentBubbleDetail,
  presentBubbleList
} from "./presenters/bubblePresenter.js";
import { readBubbleTimeline } from "./presenters/timelinePresenter.js";
import {
  UiRepoScopeError,
  type UiRepoScope,
  resolveScopedRepoPath
} from "./repoScope.js";
import { pathExists } from "../util/pathExists.js";

const jsonContentType = "application/json; charset=utf-8";
const sseContentType = "text/event-stream; charset=utf-8";
const maxJsonBodyBytes = 1_000_000;

interface UiApiError {
  status: number;
  body: UiApiErrorBody;
}

class UiApiHttpError extends Error {
  public readonly apiError: UiApiError;

  public constructor(apiError: UiApiError) {
    super(apiError.body.error.message);
    this.name = "UiApiHttpError";
    this.apiError = apiError;
  }
}

interface UiRouterDependencies {
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

function sendJson(
  res: ServerResponse,
  status: number,
  body: unknown,
  extraHeaders: Record<string, string> = {}
): void {
  const payload = `${JSON.stringify(body)}\n`;
  res.writeHead(status, {
    "content-type": jsonContentType,
    "content-length": String(Buffer.byteLength(payload)),
    ...extraHeaders
  });
  res.end(payload);
}

function sendApiError(res: ServerResponse, error: UiApiError): void {
  sendJson(res, error.status, error.body);
}

function badRequest(message: string, details?: Record<string, unknown>): UiApiError {
  return {
    status: 400,
    body: {
      error: {
        code: "bad_request",
        message,
        ...(details !== undefined ? { details } : {})
      }
    }
  };
}

function notFound(message: string, details?: Record<string, unknown>): UiApiError {
  return {
    status: 404,
    body: {
      error: {
        code: "not_found",
        message,
        ...(details !== undefined ? { details } : {})
      }
    }
  };
}

function conflict(message: string, details?: Record<string, unknown>): UiApiError {
  return {
    status: 409,
    body: {
      error: {
        code: "conflict",
        message,
        ...(details !== undefined ? { details } : {})
      }
    }
  };
}

function internalError(message: string): UiApiError {
  return {
    status: 500,
    body: {
      error: {
        code: "internal_error",
        message
      }
    }
  };
}

function throwApiError(error: UiApiError): never {
  throw new UiApiHttpError(error);
}

function asErrorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

function asArrayHeaderValue(value: string | string[] | undefined): string | undefined {
  if (value === undefined) {
    return undefined;
  }
  if (Array.isArray(value)) {
    return value[0];
  }
  return value;
}

function parseStateFromErrorMessage(
  message: string
): BubbleLifecycleState | undefined {
  const match = /current:\s*([A-Z_]+)/u.exec(message);
  const candidate = match?.[1];
  if (candidate === undefined) {
    return undefined;
  }
  const allowed = new Set<string>([
    "CREATED",
    "PREPARING_WORKSPACE",
    "RUNNING",
    "WAITING_HUMAN",
    "READY_FOR_APPROVAL",
    "APPROVED_FOR_COMMIT",
    "COMMITTED",
    "DONE",
    "FAILED",
    "CANCELLED"
  ]);
  return allowed.has(candidate)
    ? (candidate as BubbleLifecycleState)
    : undefined;
}

function isNotFoundErrorMessage(message: string): boolean {
  return (
    message.includes("does not exist in repository") ||
    message.includes("Could not locate bubble") ||
    message.includes("Repository is out of UI scope")
  );
}

function isConflictErrorMessage(message: string): boolean {
  const patterns = [
    "can only be used while",
    "requires state",
    "requires non-final state",
    "State fingerprint mismatch",
    "Expected current state",
    "Bubble worktree does not exist yet",
    "Repository has uncommitted changes",
    "Base branch not found locally",
    "Bubble branch not found locally",
    "cannot be identical",
    "Merge failed for"
  ];
  return patterns.some((pattern) => message.includes(pattern));
}

function ensureStringArray(
  value: unknown,
  fieldName: string
): string[] {
  if (!Array.isArray(value)) {
    throwApiError(
      badRequest(`Field \`${fieldName}\` must be an array of strings.`)
    );
  }
  const result: string[] = [];
  for (const item of value) {
    if (typeof item !== "string") {
      throwApiError(
        badRequest(`Field \`${fieldName}\` must contain only strings.`)
      );
    }
    result.push(item);
  }
  return result;
}

function requireMessage(body: unknown, fieldName: string = "message"): string {
  if (typeof body !== "object" || body === null || Array.isArray(body)) {
    throwApiError(badRequest("Request body must be a JSON object."));
  }
  const typedBody = body as Record<string, unknown>;
  const message = typedBody[fieldName];
  if (typeof message !== "string" || message.trim().length === 0) {
    throwApiError(
      badRequest(`Field \`${fieldName}\` is required and must be non-empty.`)
    );
  }
  return message.trim();
}

function parseOptionalRefs(body: unknown): string[] {
  if (typeof body !== "object" || body === null || Array.isArray(body)) {
    return [];
  }
  const refs = (body as { refs?: unknown }).refs;
  if (refs === undefined) {
    return [];
  }
  return ensureStringArray(refs, "refs");
}

function parseCommitBody(body: unknown): {
  auto: boolean;
  message?: string | undefined;
  refs?: string[] | undefined;
} {
  if (typeof body !== "object" || body === null || Array.isArray(body)) {
    throwApiError(badRequest("Commit request body must be a JSON object."));
  }

  const autoValue = (body as { auto?: unknown }).auto;
  if (typeof autoValue !== "boolean") {
    throwApiError(badRequest("Commit request requires boolean field `auto`."));
  }

  const messageValue = (body as { message?: unknown }).message;
  const refsValue = (body as { refs?: unknown }).refs;

  if (messageValue !== undefined && typeof messageValue !== "string") {
    throwApiError(
      badRequest("Commit field `message` must be a string when provided.")
    );
  }

  const refs =
    refsValue === undefined ? undefined : ensureStringArray(refsValue, "refs");
  return {
    auto: autoValue,
    ...(messageValue !== undefined ? { message: messageValue } : {}),
    ...(refs !== undefined ? { refs } : {})
  };
}

function parseMergeBody(body: unknown): {
  push?: boolean | undefined;
  deleteRemote?: boolean | undefined;
} {
  if (body === undefined) {
    return {};
  }
  if (typeof body !== "object" || body === null || Array.isArray(body)) {
    throwApiError(
      badRequest("Merge request body must be a JSON object when provided.")
    );
  }

  const pushValue = (body as { push?: unknown }).push;
  const deleteRemoteValue = (body as { deleteRemote?: unknown }).deleteRemote;

  if (pushValue !== undefined && typeof pushValue !== "boolean") {
    throwApiError(badRequest("Merge field `push` must be a boolean when provided."));
  }
  if (deleteRemoteValue !== undefined && typeof deleteRemoteValue !== "boolean") {
    throwApiError(
      badRequest("Merge field `deleteRemote` must be a boolean when provided.")
    );
  }

  return {
    ...(pushValue !== undefined ? { push: pushValue } : {}),
    ...(deleteRemoteValue !== undefined
      ? { deleteRemote: deleteRemoteValue }
      : {})
  };
}

function parseDeleteBody(body: unknown): {
  force?: boolean | undefined;
} {
  if (body === undefined) {
    return {};
  }
  if (typeof body !== "object" || body === null || Array.isArray(body)) {
    throwApiError(
      badRequest("Delete request body must be a JSON object when provided.")
    );
  }

  const forceValue = (body as { force?: unknown }).force;
  if (forceValue !== undefined && typeof forceValue !== "boolean") {
    throwApiError(
      badRequest("Delete field `force` must be a boolean when provided.")
    );
  }

  return {
    ...(forceValue !== undefined ? { force: forceValue } : {})
  };
}

async function readJsonBody(req: IncomingMessage): Promise<unknown> {
  const chunks: Buffer[] = [];
  let total = 0;

  for await (const chunk of req) {
    const buffer = Buffer.isBuffer(chunk)
      ? chunk
      : Buffer.from(chunk as string);
    total += buffer.length;
    if (total > maxJsonBodyBytes) {
      throwApiError(badRequest("Request body is too large."));
    }
    chunks.push(buffer);
  }

  if (chunks.length === 0) {
    return undefined;
  }

  const raw = Buffer.concat(chunks).toString("utf8");
  if (raw.trim().length === 0) {
    return undefined;
  }

  try {
    return JSON.parse(raw) as unknown;
  } catch {
    throwApiError(badRequest("Request body must be valid JSON."));
  }
}

export function createUiRouter(input: CreateUiRouterInput): UiRouter {
  const keepAliveIntervalMs = input.keepAliveIntervalMs ?? 15_000;
  const dependencies: UiRouterDependencies = {
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
    deleteBubble: input.dependencies?.deleteBubble ?? deleteBubble
  };

  async function resolveRepoFromUrl(
    url: URL,
    options: { requireExplicitWhenMultiRepo?: boolean | undefined } = {}
  ): Promise<string> {
    try {
      const repoParam = url.searchParams.get("repo") ?? undefined;
      return await resolveScopedRepoPath({
        scope: input.repoScope,
        repoParam,
        requireExplicitWhenMultiRepo: options.requireExplicitWhenMultiRepo
      });
    } catch (error) {
      if (error instanceof UiRepoScopeError) {
        const message = error.message;
        if (message.includes("required when UI scope contains multiple")) {
          throwApiError(badRequest(message));
        }
        if (message.includes("out of UI scope")) {
          throwApiError(notFound(message));
        }
        throwApiError(badRequest(message));
      }
      throw error;
    }
  }

  async function loadRuntimeSession(
    repoPath: string,
    bubbleId: string
  ): Promise<RuntimeSessionRecord | null> {
    const sessionsPath = join(repoPath, ".pairflow", "runtime", "sessions.json");
    const sessions = await dependencies.readRuntimeSessionsRegistry(sessionsPath, {
      allowMissing: true
    });
    return sessions[bubbleId] ?? null;
  }

  async function loadBubbleDetail(
    repoPath: string,
    bubbleId: string
  ): Promise<UiBubbleDetail> {
    const [status, inbox, runtimeSession] = await Promise.all([
      dependencies.getBubbleStatus({
        bubbleId,
        repoPath,
        ...(input.cwd !== undefined ? { cwd: input.cwd } : {})
      }),
      dependencies.getBubbleInbox({
        bubbleId,
        repoPath,
        ...(input.cwd !== undefined ? { cwd: input.cwd } : {})
      }),
      loadRuntimeSession(repoPath, bubbleId)
    ]);

    const detail = presentBubbleDetail({
      status,
      inbox,
      runtimeSession
    });
    return {
      ...detail,
      repoPath
    };
  }

  async function mapActionErrorToApiError(inputValue: {
    error: unknown;
    repoPath: string;
    bubbleId: string;
  }): Promise<UiApiError> {
    const message = asErrorMessage(inputValue.error);

    if (isNotFoundErrorMessage(message)) {
      return notFound(message, {
        bubbleId: inputValue.bubbleId,
        repoPath: inputValue.repoPath
      });
    }

    if (isConflictErrorMessage(message)) {
      let currentBubble: UiBubbleDetail | null = null;
      try {
        currentBubble = await loadBubbleDetail(
          inputValue.repoPath,
          inputValue.bubbleId
        );
      } catch {
        currentBubble = null;
      }

      const parsedState = parseStateFromErrorMessage(message);
      return conflict(message, {
        bubbleId: inputValue.bubbleId,
        repoPath: inputValue.repoPath,
        currentState: currentBubble?.state ?? parsedState ?? null,
        ...(currentBubble !== null ? { bubble: currentBubble } : {})
      });
    }

    return internalError(message);
  }

  async function handleEvents(
    req: IncomingMessage,
    res: ServerResponse,
    url: URL
  ): Promise<void> {
    const repoParams = url.searchParams.getAll("repo");
    const repos: string[] = [];
    if (repoParams.length === 0) {
      repos.push(...input.repoScope.repos);
    } else {
      for (const repoPath of repoParams) {
        try {
          const resolved = await resolveScopedRepoPath({
            scope: input.repoScope,
            repoParam: repoPath,
            requireExplicitWhenMultiRepo: false
          });
          repos.push(resolved);
        } catch (error) {
          if (error instanceof UiRepoScopeError) {
            const message = error.message;
            if (message.includes("out of UI scope")) {
              throwApiError(notFound(message));
            }
            throwApiError(badRequest(message));
          }
          throw error;
        }
      }
    }

    const bubbleIdParam = url.searchParams.get("bubbleId") ?? undefined;
    const lastEventIdHeader = asArrayHeaderValue(req.headers["last-event-id"]);
    const lastEventIdQuery = url.searchParams.get("lastEventId") ?? undefined;
    const lastEventIdRaw = lastEventIdHeader ?? lastEventIdQuery;
    const parsedLastEventId =
      lastEventIdRaw === undefined ? undefined : Number(lastEventIdRaw);
    const lastEventId =
      parsedLastEventId !== undefined && Number.isFinite(parsedLastEventId)
        ? parsedLastEventId
        : undefined;

    res.writeHead(200, {
      "content-type": sseContentType,
      "cache-control": "no-cache, no-transform",
      connection: "keep-alive"
    });
    res.write(": connected\n\n");

    const connectedPayload: UiEventsConnectedPayload = {
      now: new Date().toISOString(),
      repos
    };
    const initialSnapshot = input.events.getSnapshot({
      repos,
      ...(bubbleIdParam !== undefined ? { bubbleId: bubbleIdParam } : {})
    });
    res.write(
      `event: connected\ndata: ${JSON.stringify(connectedPayload)}\n\n`
    );
    res.write(
      `id: ${initialSnapshot.id}\nevent: snapshot\ndata: ${JSON.stringify(initialSnapshot)}\n\n`
    );

    let cleanedUp = false;
    let unsubscribe = (): void => undefined;
    let keepAliveTimer: NodeJS.Timeout | null = null;
    const cleanup = (): void => {
      if (cleanedUp) {
        return;
      }
      cleanedUp = true;
      if (keepAliveTimer !== null) {
        clearInterval(keepAliveTimer);
        keepAliveTimer = null;
      }
      unsubscribe();
      req.off("close", cleanup);
      res.off("close", cleanup);
      res.off("error", cleanup);
      if (!res.writableEnded) {
        res.end();
      }
    };

    unsubscribe = input.events.subscribe(
      {
        repos,
        ...(bubbleIdParam !== undefined ? { bubbleId: bubbleIdParam } : {}),
        ...(lastEventId !== undefined ? { lastEventId } : {})
      },
      (event: UiEvent) => {
        if (cleanedUp || !res.writable || res.writableEnded) {
          cleanup();
          return;
        }
        try {
          res.write(
            `id: ${event.id}\nevent: ${event.type}\ndata: ${JSON.stringify(event)}\n\n`
          );
        } catch {
          cleanup();
        }
      }
    );

    keepAliveTimer = setInterval(() => {
      if (cleanedUp || !res.writable || res.writableEnded) {
        cleanup();
        return;
      }
      try {
        res.write(": keepalive\n\n");
      } catch {
        cleanup();
      }
    }, keepAliveIntervalMs);

    req.on("close", cleanup);
    res.on("close", cleanup);
    res.on("error", cleanup);
  }

  return {
    async handleRequest(req: IncomingMessage, res: ServerResponse): Promise<boolean> {
      const method = req.method ?? "GET";
      const host = req.headers.host ?? "127.0.0.1";
      let url: URL;
      try {
        url = new URL(req.url ?? "/", `http://${host}`);
      } catch {
        sendApiError(res, badRequest("Invalid request URL."));
        return true;
      }

      const pathname = url.pathname;
      if (!pathname.startsWith("/api/")) {
        return false;
      }

      const segments = pathname.split("/").filter((segment) => segment.length > 0);

      try {
        if (method === "GET" && pathname === "/api/repos") {
          sendJson(res, 200, {
            repos: input.repoScope.repos
          });
          return true;
        }

        if (method === "GET" && pathname === "/api/events") {
          await handleEvents(req, res, url);
          return true;
        }

        if (segments.length === 2 && segments[0] === "api" && segments[1] === "bubbles") {
          if (method !== "GET") {
            sendApiError(
              res,
              badRequest(`Unsupported method for ${pathname}: ${method}`)
            );
            return true;
          }
          const repoPath = await resolveRepoFromUrl(url);
          const view = await dependencies.listBubbles({
            repoPath,
            ...(input.cwd !== undefined ? { cwd: input.cwd } : {})
          });
          const presented = presentBubbleList(view);
          sendJson(res, 200, {
            repo: presented.repo,
            bubbles: presented.bubbles
          });
          return true;
        }

        if (segments.length >= 3 && segments[0] === "api" && segments[1] === "bubbles") {
          const bubbleId = decodeURIComponent(segments[2] ?? "");
          if (bubbleId.length === 0) {
            throwApiError(badRequest("Bubble id cannot be empty."));
          }
          const repoPath = await resolveRepoFromUrl(url);

          if (segments.length === 3 && method === "GET") {
            const bubble = await loadBubbleDetail(repoPath, bubbleId);
            sendJson(res, 200, { bubble });
            return true;
          }

          if (segments.length === 4 && method === "GET" && segments[3] === "timeline") {
            const timeline = await dependencies.readBubbleTimeline({
              bubbleId,
              repoPath,
              ...(input.cwd !== undefined ? { cwd: input.cwd } : {})
            });
            sendJson(res, 200, {
              bubbleId,
              repoPath,
              timeline
            });
            return true;
          }

          if (segments.length === 4 && method === "POST") {
            const action = segments[3];
            const body = await readJsonBody(req);

            try {
              switch (action) {
                case "start": {
                  const result = await dependencies.startBubble({
                    bubbleId,
                    repoPath,
                    ...(input.cwd !== undefined ? { cwd: input.cwd } : {})
                  });
                  sendJson(res, 200, { result });
                  return true;
                }
                case "approve": {
                  const refs = parseOptionalRefs(body);
                  const result = await dependencies.emitApprove({
                    bubbleId,
                    ...(refs.length > 0 ? { refs } : {}),
                    repoPath,
                    ...(input.cwd !== undefined ? { cwd: input.cwd } : {})
                  });
                  sendJson(res, 200, { result });
                  return true;
                }
                case "request-rework": {
                  const message = requireMessage(body);
                  const refs = parseOptionalRefs(body);
                  const result = await dependencies.emitRequestRework({
                    bubbleId,
                    message,
                    ...(refs.length > 0 ? { refs } : {}),
                    repoPath,
                    ...(input.cwd !== undefined ? { cwd: input.cwd } : {})
                  });
                  sendJson(res, 200, { result });
                  return true;
                }
                case "reply": {
                  const message = requireMessage(body);
                  const refs = parseOptionalRefs(body);
                  const result = await dependencies.emitHumanReply({
                    bubbleId,
                    message,
                    ...(refs.length > 0 ? { refs } : {}),
                    repoPath,
                    ...(input.cwd !== undefined ? { cwd: input.cwd } : {})
                  });
                  sendJson(res, 200, { result });
                  return true;
                }
                case "resume": {
                  const result = await dependencies.resumeBubble({
                    bubbleId,
                    repoPath,
                    ...(input.cwd !== undefined ? { cwd: input.cwd } : {})
                  });
                  sendJson(res, 200, { result });
                  return true;
                }
                case "commit": {
                  const commitInput = parseCommitBody(body);
                  const result = await dependencies.commitBubble({
                    bubbleId,
                    repoPath,
                    ...(commitInput.message !== undefined
                      ? { message: commitInput.message }
                      : {}),
                    ...(commitInput.refs !== undefined
                      ? { refs: commitInput.refs }
                      : {}),
                    auto: commitInput.auto,
                    ...(input.cwd !== undefined ? { cwd: input.cwd } : {})
                  });
                  sendJson(res, 200, { result });
                  return true;
                }
                case "merge": {
                  const mergeInput = parseMergeBody(body);
                  const result = await dependencies.mergeBubble({
                    bubbleId,
                    repoPath,
                    ...(mergeInput.push !== undefined
                      ? { push: mergeInput.push }
                      : {}),
                    ...(mergeInput.deleteRemote !== undefined
                      ? { deleteRemote: mergeInput.deleteRemote }
                      : {}),
                    ...(input.cwd !== undefined ? { cwd: input.cwd } : {})
                  });
                  sendJson(res, 200, { result });
                  return true;
                }
                case "open": {
                  const result = await dependencies.openBubble({
                    bubbleId,
                    repoPath,
                    ...(input.cwd !== undefined ? { cwd: input.cwd } : {})
                  });
                  sendJson(res, 200, { result });
                  return true;
                }
                case "attach": {
                  const result = await dependencies.attachBubble({
                    bubbleId,
                    repoPath,
                    ...(input.cwd !== undefined ? { cwd: input.cwd } : {})
                  });
                  sendJson(res, 200, { result });
                  return true;
                }
                case "stop": {
                  const result = await dependencies.stopBubble({
                    bubbleId,
                    repoPath,
                    ...(input.cwd !== undefined ? { cwd: input.cwd } : {})
                  });
                  sendJson(res, 200, { result });
                  return true;
                }
                case "delete": {
                  const deleteInput = parseDeleteBody(body);
                  const result = await dependencies.deleteBubble({
                    bubbleId,
                    repoPath,
                    ...(deleteInput.force !== undefined
                      ? { force: deleteInput.force }
                      : {}),
                    ...(input.cwd !== undefined ? { cwd: input.cwd } : {})
                  });
                  // 202 signals a valid "confirmation required" outcome.
                  const status =
                    result.requiresConfirmation && !result.deleted ? 202 : 200;
                  sendJson(res, status, { result });
                  if (result.deleted) {
                    void input.events.refreshNow().catch((error: unknown) => {
                      console.error(
                        "Failed to refresh UI events after bubble delete",
                        error
                      );
                    });
                  }
                  return true;
                }
                default:
                  throwApiError(badRequest(`Unsupported bubble action: ${action}`));
              }
            } catch (error) {
              if (error instanceof UiApiHttpError) {
                throw error;
              }
              throwApiError(
                await mapActionErrorToApiError({
                  error,
                  repoPath,
                  bubbleId
                })
              );
            }
          }
        }

        sendApiError(res, notFound(`Unknown API route: ${method} ${pathname}`));
        return true;
      } catch (error) {
        if (error instanceof UiApiHttpError) {
          sendApiError(res, error.apiError);
          return true;
        }

        const message = asErrorMessage(error);
        if (isNotFoundErrorMessage(message)) {
          sendApiError(res, notFound(message));
          return true;
        }
        if (error instanceof UiRepoScopeError) {
          sendApiError(res, badRequest(message));
          return true;
        }
        sendApiError(res, internalError(message));
        return true;
      }
    }
  };
}

export interface StaticAssetResolution {
  type: "file" | "fallback";
  path: string;
}

export async function resolveStaticAssetPath(input: {
  assetsDir: string;
  requestPath: string;
}): Promise<StaticAssetResolution> {
  const assetsDir = resolve(input.assetsDir);
  const rawRequestPath = input.requestPath.startsWith("/")
    ? input.requestPath
    : `/${input.requestPath}`;
  const decodedRequestPath = (() => {
    try {
      return decodeURIComponent(rawRequestPath);
    } catch {
      return rawRequestPath;
    }
  })();
  const normalizedRequestPath =
    decodedRequestPath === "/" ? "/index.html" : decodedRequestPath;
  const candidatePath = resolve(assetsDir, `.${normalizedRequestPath}`);
  const isInsideAssetsDir =
    candidatePath === assetsDir || candidatePath.startsWith(`${assetsDir}${sep}`);
  if (!isInsideAssetsDir) {
    return {
      type: "fallback",
      path: join(assetsDir, "index.html")
    };
  }

  if (await pathExists(candidatePath)) {
    return {
      type: "file",
      path: candidatePath
    };
  }

  return {
    type: "fallback",
    path: join(assetsDir, "index.html")
  };
}
