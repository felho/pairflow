import type { IncomingMessage, ServerResponse } from "node:http";

import type { UiEvent, UiEventsConnectedPayload } from "../../../types/ui.js";
import type { UiEventsBroker } from "./events.js";
import type { UiRepoScope } from "./repoScope.js";
import { UiRepoScopeError, resolveScopedRepoPath } from "./repoScope.js";
import {
  asArrayHeaderValue,
  badRequest,
  notFound,
  sseContentType,
  throwApiError
} from "./routerHttp.js";

interface HandleUiEventsInput {
  req: IncomingMessage;
  res: ServerResponse;
  url: URL;
  repoScope: UiRepoScope;
  routerCwd: string;
  keepAliveIntervalMs: number;
  events: UiEventsBroker;
}

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

  input.res.writeHead(200, {
    "content-type": sseContentType,
    "cache-control": "no-cache, no-transform",
    connection: "keep-alive"
  });
  input.res.write(": connected\n\n");

  const connectedPayload: UiEventsConnectedPayload = {
    now: new Date().toISOString(),
    repos
  };
  const initialSnapshot = input.events.getSnapshot({
    repos,
    ...(bubbleIdParam !== undefined ? { bubbleId: bubbleIdParam } : {})
  });
  input.res.write(
    `event: connected\ndata: ${JSON.stringify(connectedPayload)}\n\n`
  );
  input.res.write(
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
    (event: UiEvent) => {
      if (cleanedUp || !input.res.writable || input.res.writableEnded) {
        cleanup();
        return;
      }
      try {
        input.res.write(
          `id: ${event.id}\nevent: ${event.type}\ndata: ${JSON.stringify(event)}\n\n`
        );
      } catch {
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
