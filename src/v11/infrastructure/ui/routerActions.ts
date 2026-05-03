import type { IncomingMessage } from "node:http";

import { presentBubbleList } from "./presenters/bubblePresenter.js";
import { loadBubbleDetail } from "./routerBubbleDetail.js";
import { mapActionErrorToApiError } from "./routerActionErrorMapping.js";
import { UiRepoScopeError, resolveScopedRepoPath } from "./repoScope.js";
import { dispatchBubbleAction } from "./routerActionDispatch.js";
import type {
  UiBubbleActionDispatchDependencies,
  UiBubbleDetailDependencies,
  UiBubbleListDependencies,
  UiBubbleTimelineDependencies
} from "../../shared/ports/uiRouter.js";
import type { UiRouterRequestContext } from "./routerContracts.js";
import {
  badRequest,
  notFound,
  readJsonBody,
  throwApiError
} from "./routerHttp.js";

interface RouterActionEnvironment {
  requestContext: UiRouterRequestContext;
  dependencies:
    & UiBubbleActionDispatchDependencies
    & UiBubbleDetailDependencies
    & UiBubbleListDependencies
    & UiBubbleTimelineDependencies;
}

async function resolveRepoFromUrl(
  environment: RouterActionEnvironment,
  url: URL,
  options: { requireExplicitWhenMultiRepo?: boolean | undefined } = {}
): Promise<string> {
  try {
    const repoParam = url.searchParams.get("repo") ?? undefined;
    return await resolveScopedRepoPath({
      scope: environment.requestContext.repoScope,
      repoParam,
      requireExplicitWhenMultiRepo: options.requireExplicitWhenMultiRepo,
      cwd: environment.requestContext.routerCwd
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

function parseRefreshQueryFlag(url: URL): boolean | undefined {
  const value = url.searchParams.get("refresh");
  if (value === null) {
    return undefined;
  }
  if (value === "1" || value === "true") {
    return true;
  }
  if (value === "0" || value === "false") {
    return false;
  }
  return undefined;
}

export async function handleBubbleActionRequest(input: {
  environment: RouterActionEnvironment;
  req: IncomingMessage;
  url: URL;
  bubbleId: string;
}): Promise<{ status: number; result: unknown }> {
  const repoPath = await resolveRepoFromUrl(input.environment, input.url);
  const body = await readJsonBody(input.req);
  const action = input.url.pathname.split("/").filter(Boolean)[3] ?? "";
  try {
    return await dispatchBubbleAction({
      environment: input.environment,
      action,
      bubbleId: input.bubbleId,
      repoPath,
      body
    });
  } catch (error) {
    if (error instanceof Error && error.name === "UiApiHttpError") {
      throw error;
    }
    throwApiError(
      await mapActionErrorToApiError({
        environment: input.environment,
        error,
        repoPath,
        bubbleId: input.bubbleId
      })
    );
  }
}

export async function handleBubbleResourceRequest(input: {
  environment: RouterActionEnvironment;
  url: URL;
  bubbleId: string;
  pathname: string;
}): Promise<{ status: number; body: unknown }> {
  const repoPath = await resolveRepoFromUrl(input.environment, input.url);
  if (input.pathname.endsWith("/timeline")) {
    const timeline = await input.environment.dependencies.readBubbleTimeline({
      bubbleId: input.bubbleId,
      repoPath,
      ...(input.environment.requestContext.cwd !== undefined
        ? { cwd: input.environment.requestContext.cwd }
        : {})
    });
    return {
      status: 200,
      body: {
        bubbleId: input.bubbleId,
        repoPath,
        timeline
      }
    };
  }
  return {
    status: 200,
    body: {
      bubble: await loadBubbleDetail({
        environment: {
          requestContext: {
            cwd: input.environment.requestContext.cwd
          },
          dependencies: input.environment.dependencies
        },
        repoPath,
        bubbleId: input.bubbleId
      })
    }
  };
}

export async function handleBubbleListRequest(input: {
  environment: RouterActionEnvironment;
  url: URL;
}): Promise<{ status: number; body: unknown }> {
  const repoPath = await resolveRepoFromUrl(input.environment, input.url);
  const refresh = parseRefreshQueryFlag(input.url);
  const view = await input.environment.dependencies.listBubbles({
    repoPath,
    ...(refresh !== undefined ? { refresh } : {}),
    ...(input.environment.requestContext.cwd !== undefined
      ? { cwd: input.environment.requestContext.cwd }
      : {})
  });
  const presented = presentBubbleList(view);
  return {
    status: 200,
    body: {
      repo: presented.repo,
      bubbles: presented.bubbles
    }
  };
}
