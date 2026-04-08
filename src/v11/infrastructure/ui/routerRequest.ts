import type { IncomingMessage, ServerResponse } from "node:http";

import type {
  CreateUiRouterInput,
  UiRouterEnvironment
} from "./routerContracts.js";
import { UiApiHttpError, badRequest, notFound, sendJson } from "./routerHttp.js";
import { handleUiEvents } from "./routerEvents.js";
import {
  handleBubbleActionRequest,
  handleBubbleListRequest,
  handleBubbleResourceRequest
} from "./routerActions.js";

interface HandleApiRequestInput {
  environment: UiRouterEnvironment;
  req: IncomingMessage;
  res: ServerResponse;
  url: URL;
  keepAliveIntervalMs: number;
}

function parseBubbleRoute(pathname: string): {
  bubbleId: string;
  isTimeline: boolean;
  isAction: boolean;
} | null {
  const segments = pathname.split("/").filter((segment) => segment.length > 0);
  if (segments[0] !== "api" || segments[1] !== "bubbles") {
    return null;
  }
  const bubbleId = decodeURIComponent(segments[2] ?? "");
  if (bubbleId.length === 0) {
    throw new UiApiHttpError(badRequest("Bubble id cannot be empty."));
  }
  return {
    bubbleId,
    isTimeline: segments.length === 4 && segments[3] === "timeline",
    isAction: segments.length === 4
  };
}

function refreshEventsAfterDelete(
  input: CreateUiRouterInput,
  pathname: string,
  result: unknown
): void {
  if (!pathname.endsWith("/delete")) {
    return;
  }
  if (
    typeof result !== "object" ||
    result === null ||
    !("deleted" in result) ||
    !(result as { deleted: boolean }).deleted
  ) {
    return;
  }
  void input.events.refreshNow().catch((error: unknown) => {
    console.error("Failed to refresh UI events after bubble delete", error);
  });
}

export async function handleApiRequest(
  input: HandleApiRequestInput
): Promise<boolean> {
  const method = input.req.method ?? "GET";
  const pathname = input.url.pathname;
  if (!pathname.startsWith("/api/")) {
    return false;
  }

  if (method === "GET" && pathname === "/api/repos") {
    sendJson(input.res, 200, {
      repos: input.environment.input.repoScope.repos
    });
    return true;
  }

  if (method === "GET" && pathname === "/api/events") {
    await handleUiEvents({
      req: input.req,
      res: input.res,
      url: input.url,
      repoScope: input.environment.input.repoScope,
      routerCwd: input.environment.routerCwd,
      keepAliveIntervalMs: input.keepAliveIntervalMs,
      events: input.environment.input.events
    });
    return true;
  }

  if (pathname === "/api/bubbles") {
    if (method !== "GET") {
      throw new UiApiHttpError(
        badRequest(`Unsupported method for ${pathname}: ${method}`)
      );
    }
    const response = await handleBubbleListRequest({
      environment: input.environment,
      url: input.url
    });
    sendJson(input.res, response.status, response.body);
    return true;
  }

  const bubbleRoute = parseBubbleRoute(pathname);
  if (bubbleRoute === null) {
    throw new UiApiHttpError(notFound(`Unknown API route: ${method} ${pathname}`));
  }

  if (
    method === "GET" &&
    (!bubbleRoute.isAction || bubbleRoute.isTimeline)
  ) {
    const response = await handleBubbleResourceRequest({
      environment: input.environment,
      url: input.url,
      bubbleId: bubbleRoute.bubbleId,
      pathname
    });
    sendJson(input.res, response.status, response.body);
    return true;
  }

  if (method === "POST" && bubbleRoute.isAction) {
    const response = await handleBubbleActionRequest({
      environment: input.environment,
      req: input.req,
      url: input.url,
      bubbleId: bubbleRoute.bubbleId
    });
    sendJson(input.res, response.status, { result: response.result });
    refreshEventsAfterDelete(
      input.environment.input,
      pathname,
      response.result
    );
    return true;
  }

  throw new UiApiHttpError(
    badRequest(`Unsupported method for ${pathname}: ${method}`)
  );
}
