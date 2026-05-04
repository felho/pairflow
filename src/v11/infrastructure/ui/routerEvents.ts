import type { IncomingMessage, ServerResponse } from "node:http";

import type {
  UiEvent,
  UiEventsConnectedPayload
} from "../../../contracts/ui/uiEvents.js";
import type { UiEventsBroker } from "./events.js";
import type { UiRepoScope } from "./repoScope.js";
import { UiRepoScopeError, resolveScopedRepoPath } from "./repoScope.js";
import {
  asArrayHeaderValue,
  badRequest,
  internalError,
  notFound,
  sseContentType,
  throwApiError
} from "./routerHttp.js";
import {
  UiEventPayloadValidationError,
  logInvalidUiEventPayload,
  logUiEventPayloadDropLimitReached,
  validateUiEventsConnectedPayload,
  validateReplayableUiEvent,
  validateUiSnapshotEvent
} from "./routerEventPayloadValidation.js";

interface HandleUiEventsInput {
  req: IncomingMessage;
  res: ServerResponse;
  url: URL;
  repoScope: UiRepoScope;
  routerCwd: string;
  keepAliveIntervalMs: number;
  events: UiEventsBroker;
}

const invalidSubscriberEventDropLimit = 10;

async function resolveRequestedRepos(input: {
  repoScope: UiRepoScope;
  url: URL;
  routerCwd: string;
}): Promise<string[]> {
  const repoParams = input.url.searchParams.getAll("repo");
  if (repoParams.length === 0) {
    return [...input.repoScope.repos];
  }
  const repos: string[] = [];
  for (const repoPath of repoParams) {
    try {
      repos.push(
        await resolveScopedRepoPath({
          scope: input.repoScope,
          repoParam: repoPath,
          requireExplicitWhenMultiRepo: false,
          cwd: input.routerCwd
        })
      );
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
  return repos;
}

function resolveLastEventId(req: IncomingMessage, url: URL): number | undefined {
  const lastEventIdHeader = asArrayHeaderValue(req.headers["last-event-id"]);
  const lastEventIdQuery = url.searchParams.get("lastEventId") ?? undefined;
  const lastEventIdRaw = lastEventIdHeader ?? lastEventIdQuery;
  const parsedLastEventId =
    lastEventIdRaw === undefined ? undefined : Number(lastEventIdRaw);
  return parsedLastEventId !== undefined && Number.isFinite(parsedLastEventId)
    ? parsedLastEventId
    : undefined;
}

function throwInvalidUiEventPayload(error: UiEventPayloadValidationError): never {
  throwApiError(
    internalError("UI event payload failed contract validation.", {
      reasonCode: error.reasonCode,
      eventFamily: error.eventFamily
    })
  );
}

function logUiEventSubscriberCallbackFailure(error: unknown): void {
  console.warn("UI_EVENT_SUBSCRIBER_CALLBACK_FAILED", {
    reasonCode: "UI_EVENT_SUBSCRIBER_CALLBACK_FAILED",
    error: error instanceof Error ? error.message : String(error)
  });
}

export async function handleUiEvents(
  input: HandleUiEventsInput
): Promise<void> {
  const repos = await resolveRequestedRepos({
    repoScope: input.repoScope,
    url: input.url,
    routerCwd: input.routerCwd
  });
  const bubbleIdParam = input.url.searchParams.get("bubbleId") ?? undefined;
  const lastEventId = resolveLastEventId(input.req, input.url);

  let connectedPayload: UiEventsConnectedPayload;
  let initialSnapshot: UiEvent;
  try {
    const rawConnectedPayload: unknown = {
      now: new Date().toISOString(),
      repos
    };
    connectedPayload = validateUiEventsConnectedPayload(rawConnectedPayload);
    initialSnapshot = validateUiSnapshotEvent(
      input.events.getSnapshot({
        repos,
        ...(bubbleIdParam !== undefined ? { bubbleId: bubbleIdParam } : {})
      })
    );
  } catch (error) {
    if (error instanceof UiEventPayloadValidationError) {
      throwInvalidUiEventPayload(error);
    }
    throw error;
  }

  input.res.writeHead(200, {
    "content-type": sseContentType,
    "cache-control": "no-cache, no-transform",
    connection: "keep-alive"
  });
  input.res.write(": connected\n\n");
  input.res.write(
    `event: connected\ndata: ${JSON.stringify(connectedPayload)}\n\n`
  );
  input.res.write(
    `id: ${initialSnapshot.id}\nevent: snapshot\ndata: ${JSON.stringify(initialSnapshot)}\n\n`
  );

  let cleanedUp = false;
  let invalidSubscriberEventDropCount = 0;
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
    input.req.off("close", cleanup);
    input.res.off("close", cleanup);
    input.res.off("error", cleanup);
    if (!input.res.writableEnded) {
      input.res.end();
    }
  };

  unsubscribe = input.events.subscribe(
    {
      repos,
      ...(bubbleIdParam !== undefined ? { bubbleId: bubbleIdParam } : {}),
      ...(lastEventId !== undefined ? { lastEventId } : {})
    },
    (rawEvent: UiEvent) => {
      if (cleanedUp || !input.res.writable || input.res.writableEnded) {
        cleanup();
        return;
      }
      try {
        const event = validateReplayableUiEvent(rawEvent);
        input.res.write(
          `id: ${event.id}\nevent: ${event.type}\ndata: ${JSON.stringify(event)}\n\n`
        );
      } catch (error) {
        if (error instanceof UiEventPayloadValidationError) {
          invalidSubscriberEventDropCount += 1;
          logInvalidUiEventPayload(error);
          if (invalidSubscriberEventDropCount >= invalidSubscriberEventDropLimit) {
            logUiEventPayloadDropLimitReached({
              source: "sse_subscriber",
              invalidDropCount: invalidSubscriberEventDropCount
            });
            cleanup();
          }
          return;
        }
        logUiEventSubscriberCallbackFailure(error);
        cleanup();
      }
    }
  );

  keepAliveTimer = setInterval(() => {
    if (cleanedUp || !input.res.writable || input.res.writableEnded) {
      cleanup();
      return;
    }
    try {
      input.res.write("event: heartbeat\ndata: \n\n");
    } catch {
      cleanup();
    }
  }, input.keepAliveIntervalMs);

  input.req.on("close", cleanup);
  input.res.on("close", cleanup);
  input.res.on("error", cleanup);
}
