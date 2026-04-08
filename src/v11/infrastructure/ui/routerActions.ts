import { join } from "node:path";

import { AttachBubbleError } from "../../../core/bubble/attachBubble.js";
import type { UiBubbleDetail } from "../../../types/ui.js";
import type { RuntimeSessionRecord } from "../executor/sessionRuntime/runtimeSessionsRegistry.js";
import { presentBubbleDetail, presentBubbleList } from "./presenters/bubblePresenter.js";
import { UiRepoScopeError, resolveScopedRepoPath } from "./repoScope.js";
import { dispatchBubbleAction } from "./routerActionDispatch.js";
import type { CreateUiRouterInput, UiApiError, UiRouterDependencies } from "./routerContracts.js";
import {
  asErrorMessage,
  badRequest,
  conflict,
  internalError,
  isConflictErrorMessage,
  isNotFoundErrorMessage,
  notFound,
  parseStateFromErrorMessage,
  readJsonBody,
  throwApiError
} from "./routerHttp.js";

interface RouterActionEnvironment {
  input: CreateUiRouterInput;
  dependencies: UiRouterDependencies;
  routerCwd: string;
}

async function resolveRepoFromUrl(
  environment: RouterActionEnvironment,
  url: URL,
  options: { requireExplicitWhenMultiRepo?: boolean | undefined } = {}
): Promise<string> {
  try {
    const repoParam = url.searchParams.get("repo") ?? undefined;
    return await resolveScopedRepoPath({
      scope: environment.input.repoScope,
      repoParam,
      requireExplicitWhenMultiRepo: options.requireExplicitWhenMultiRepo,
      cwd: environment.routerCwd
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
  dependencies: UiRouterDependencies,
  repoPath: string,
  bubbleId: string
): Promise<RuntimeSessionRecord | null> {
  const sessionsPath = join(repoPath, ".pairflow", "runtime", "sessions.json");
  const sessions = await dependencies.readRuntimeSessionsRegistry(sessionsPath, {
    allowMissing: true
  });
  return sessions[bubbleId] ?? null;
}

async function loadBubbleDetail(input: {
  environment: RouterActionEnvironment;
  repoPath: string;
  bubbleId: string;
}): Promise<UiBubbleDetail> {
  const { environment, repoPath, bubbleId } = input;
  const [status, inbox, runtimeSession] = await Promise.all([
    environment.dependencies.getBubbleStatus({
      bubbleId,
      repoPath,
      ...(environment.input.cwd !== undefined ? { cwd: environment.input.cwd } : {})
    }),
    environment.dependencies.getBubbleInbox({
      bubbleId,
      repoPath,
      ...(environment.input.cwd !== undefined ? { cwd: environment.input.cwd } : {})
    }),
    loadRuntimeSession(environment.dependencies, repoPath, bubbleId)
  ]);
  return {
    ...presentBubbleDetail({
      status,
      inbox,
      runtimeSession
    }),
    repoPath
  };
}

async function mapActionErrorToApiError(input: {
  environment: RouterActionEnvironment;
  error: unknown;
  repoPath: string;
  bubbleId: string;
}): Promise<UiApiError> {
  const message = asErrorMessage(input.error);

  if (isNotFoundErrorMessage(message)) {
    return notFound(message, {
      bubbleId: input.bubbleId,
      repoPath: input.repoPath
    });
  }

  if (isConflictErrorMessage(message)) {
    let currentBubble: UiBubbleDetail | null = null;
    try {
      currentBubble = await loadBubbleDetail({
        environment: input.environment,
        repoPath: input.repoPath,
        bubbleId: input.bubbleId
      });
    } catch {
      currentBubble = null;
    }

    return conflict(message, {
      bubbleId: input.bubbleId,
      repoPath: input.repoPath,
      currentState:
        currentBubble?.state ?? parseStateFromErrorMessage(message) ?? null,
      ...(currentBubble !== null ? { bubble: currentBubble } : {})
    });
  }

  if (
    input.error instanceof AttachBubbleError &&
    input.error.launcher !== undefined &&
    input.error.failureClass !== undefined
  ) {
    const details = {
      bubbleId: input.bubbleId,
      repoPath: input.repoPath,
      launcher: input.error.launcher,
      failureClass: input.error.failureClass,
      ...(input.error.stdoutExcerpt !== undefined
        ? { stdoutExcerpt: input.error.stdoutExcerpt }
        : {}),
      ...(input.error.stderrExcerpt !== undefined
        ? { stderrExcerpt: input.error.stderrExcerpt }
        : {})
    };
    return input.error.failureClass === "launcher_unavailable"
      ? badRequest(message, details)
      : internalError(message, details);
  }

  if (input.error instanceof Error && input.error.name === "UiApiBadRequest") {
    return badRequest(message);
  }

  return internalError(message);
}

export async function handleBubbleActionRequest(input: {
  environment: RouterActionEnvironment;
  req: import("node:http").IncomingMessage;
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
      ...(input.environment.input.cwd !== undefined
        ? { cwd: input.environment.input.cwd }
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
        environment: input.environment,
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
  const view = await input.environment.dependencies.listBubbles({
    repoPath,
    ...(input.environment.input.cwd !== undefined
      ? { cwd: input.environment.input.cwd }
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
